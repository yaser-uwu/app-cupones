-- Perfiles vinculados a auth.users de Supabase
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Parejas: relación entre dos usuarios
CREATE TABLE couples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT couples_different_users CHECK (user1_id <> user2_id),
    CONSTRAINT couples_unique_pair UNIQUE (user1_id, user2_id)
);

-- Cupones
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'REDEEMED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    redeemed_at TIMESTAMPTZ,
    redeemed_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_coupons_couple ON coupons(couple_id);
CREATE INDEX idx_coupons_creator ON coupons(creator_id);
CREATE INDEX idx_coupons_status ON coupons(status);

-- Trigger: crear perfil al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Profiles: leer propio perfil y el de la pareja
CREATE POLICY profiles_select_own ON profiles
    FOR SELECT USING (
        id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM couples c
            WHERE (c.user1_id = auth.uid() AND c.user2_id = profiles.id)
               OR (c.user2_id = auth.uid() AND c.user1_id = profiles.id)
        )
    );

-- Couples: leer solo la propia pareja
CREATE POLICY couples_select_own ON couples
    FOR SELECT USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- Coupons: leer cupones de la pareja
CREATE POLICY coupons_select_own ON coupons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM couples c
            WHERE c.id = coupons.couple_id
              AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

-- Coupons: crear borradores
CREATE POLICY coupons_insert_own ON coupons
    FOR INSERT WITH CHECK (
        creator_id = auth.uid()
        AND status = 'DRAFT'
        AND EXISTS (
            SELECT 1 FROM couples c
            WHERE c.id = couple_id
              AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

-- Coupons: editar solo borradores propios
CREATE POLICY coupons_update_draft ON coupons
    FOR UPDATE USING (
        creator_id = auth.uid()
        AND status = 'DRAFT'
    ) WITH CHECK (
        creator_id = auth.uid()
        AND status = 'DRAFT'
    );

-- Vincular pareja
CREATE OR REPLACE FUNCTION join_couple(p_invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_partner_id UUID;
    v_couple_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado';
    END IF;

    IF EXISTS (SELECT 1 FROM couples WHERE user1_id = v_user_id OR user2_id = v_user_id) THEN
        RAISE EXCEPTION 'Ya tienes una pareja vinculada';
    END IF;

    SELECT id INTO v_partner_id FROM profiles WHERE invite_code = trim(p_invite_code);
    IF v_partner_id IS NULL THEN
        RAISE EXCEPTION 'Código de invitación inválido';
    END IF;

    IF v_partner_id = v_user_id THEN
        RAISE EXCEPTION 'No puedes vincular tu propio código';
    END IF;

    IF EXISTS (SELECT 1 FROM couples WHERE user1_id = v_partner_id OR user2_id = v_partner_id) THEN
        RAISE EXCEPTION 'Esta persona ya tiene pareja vinculada';
    END IF;

    INSERT INTO couples (user1_id, user2_id, created_at)
    VALUES (
        LEAST(v_user_id, v_partner_id),
        GREATEST(v_user_id, v_partner_id),
        NOW()
    )
    RETURNING id INTO v_couple_id;

    RETURN v_couple_id;
END;
$$;

-- Publicar cupón
CREATE OR REPLACE FUNCTION publish_coupon(p_coupon_id UUID)
RETURNS coupons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_coupon coupons%ROWTYPE;
BEGIN
    SELECT * INTO v_coupon FROM coupons WHERE id = p_coupon_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cupón no encontrado';
    END IF;

    IF v_coupon.creator_id != auth.uid() THEN
        RAISE EXCEPTION 'Solo el creador puede publicar este cupón';
    END IF;

    IF v_coupon.status != 'DRAFT' THEN
        RAISE EXCEPTION 'Solo puedes publicar cupones en borrador';
    END IF;

    UPDATE coupons
    SET status = 'PUBLISHED', published_at = NOW()
    WHERE id = p_coupon_id
    RETURNING * INTO v_coupon;

    RETURN v_coupon;
END;
$$;

-- Canjear cupón
CREATE OR REPLACE FUNCTION redeem_coupon(p_coupon_id UUID)
RETURNS coupons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_coupon coupons%ROWTYPE;
BEGIN
    SELECT * INTO v_coupon FROM coupons WHERE id = p_coupon_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cupón no encontrado';
    END IF;

    IF v_coupon.creator_id = auth.uid() THEN
        RAISE EXCEPTION 'No puedes canjear tu propio cupón';
    END IF;

    IF v_coupon.status != 'PUBLISHED' THEN
        RAISE EXCEPTION 'Este cupón no está disponible para canjear';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM couples c
        WHERE c.id = v_coupon.couple_id
          AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    ) THEN
        RAISE EXCEPTION 'No tienes acceso a este cupón';
    END IF;

    UPDATE coupons
    SET status = 'REDEEMED', redeemed_at = NOW(), redeemed_by = auth.uid()
    WHERE id = p_coupon_id
    RETURNING * INTO v_coupon;

    RETURN v_coupon;
END;
$$;

-- Permisos para usuarios autenticados
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON couples TO authenticated;
GRANT SELECT, INSERT, UPDATE ON coupons TO authenticated;
GRANT EXECUTE ON FUNCTION join_couple(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION publish_coupon(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_coupon(UUID) TO authenticated;

-- Tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE coupons;

-- Abandonar vínculo con la pareja
CREATE OR REPLACE FUNCTION leave_couple()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado';
    END IF;

    DELETE FROM couples
    WHERE user1_id = v_user_id OR user2_id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No tienes pareja vinculada';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION leave_couple() TO authenticated;
