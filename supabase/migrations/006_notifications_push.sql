-- Notificaciones persistentes (in-app + disparador push)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('coupon_published', 'coupon_redeemed')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC)
    WHERE read_at IS NULL;
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Suscripciones Web Push
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notifications_update_own ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY push_subscriptions_all_own ON push_subscriptions
    FOR ALL USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

GRANT SELECT, UPDATE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO authenticated;

-- Realtime para notificaciones in-app
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Crear notificación al publicar o canjear cupón
CREATE OR REPLACE FUNCTION create_coupon_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_recipient_id UUID;
    v_actor_name TEXT;
BEGIN
    -- Cupón publicado → notificar a la pareja (no al creador)
    IF TG_OP = 'UPDATE'
       AND NEW.status = 'PUBLISHED'
       AND OLD.status = 'DRAFT' THEN
        SELECT CASE
            WHEN c.user1_id = NEW.creator_id THEN c.user2_id
            ELSE c.user1_id
        END INTO v_recipient_id
        FROM couples c WHERE c.id = NEW.couple_id;

        IF v_recipient_id IS NOT NULL THEN
            SELECT COALESCE(display_name, split_part(email, '@', 1))
            INTO v_actor_name FROM profiles WHERE id = NEW.creator_id;

            INSERT INTO notifications (user_id, type, title, body, coupon_id)
            VALUES (
                v_recipient_id,
                'coupon_published',
                'Nuevo cupón disponible',
                v_actor_name || ' publicó: "' || LEFT(NEW.title, 80) || '"',
                NEW.id
            );
        END IF;
    END IF;

    -- Cupón canjeado → notificar al creador
    IF TG_OP = 'UPDATE'
       AND NEW.status = 'REDEEMED'
       AND OLD.status = 'PUBLISHED' THEN
        SELECT COALESCE(display_name, split_part(email, '@', 1))
        INTO v_actor_name FROM profiles WHERE id = NEW.redeemed_by;

        INSERT INTO notifications (user_id, type, title, body, coupon_id)
        VALUES (
            NEW.creator_id,
            'coupon_redeemed',
            '¡Cupón canjeado!',
            COALESCE(v_actor_name, 'Tu pareja') || ' canjeó: "' || LEFT(NEW.title, 80) || '"',
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_coupon_notify
    AFTER UPDATE ON coupons
    FOR EACH ROW EXECUTE FUNCTION create_coupon_notification();

-- Web Push: configura un Database Webhook en Supabase Dashboard:
-- Tabla: notifications | Evento: INSERT | URL: https://TU_PROYECTO.supabase.co/functions/v1/send-push
-- Header Authorization: Bearer TU_SERVICE_ROLE_KEY
-- Body: { "notification_id": "{{ record.id }}", "user_id": "{{ record.user_id }}", "title": "{{ record.title }}", "body": "{{ record.body }}", "type": "{{ record.type }}" }
