-- Abandonar vínculo con la pareja (elimina la pareja y sus cupones en cascada)
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
