-- Crear perfil si no existe (usuarios que se registraron antes del trigger)
CREATE OR REPLACE FUNCTION ensure_my_profile()
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_profile profiles%ROWTYPE;
    v_email TEXT;
    v_name TEXT;
    v_avatar TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado';
    END IF;

    SELECT * INTO v_profile FROM profiles WHERE id = v_user_id;
    IF FOUND THEN
        RETURN v_profile;
    END IF;

    SELECT
        email,
        COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
        raw_user_meta_data->>'avatar_url'
    INTO v_email, v_name, v_avatar
    FROM auth.users WHERE id = v_user_id;

    INSERT INTO profiles (id, email, display_name, avatar_url)
    VALUES (v_user_id, v_email, v_name, v_avatar)
    RETURNING * INTO v_profile;

    RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_my_profile() TO authenticated;

-- Backfill: crear perfiles para usuarios ya registrados
INSERT INTO public.profiles (id, email, display_name, avatar_url)
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
    raw_user_meta_data->>'avatar_url'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
