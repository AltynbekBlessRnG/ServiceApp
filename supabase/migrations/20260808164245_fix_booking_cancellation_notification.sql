CREATE OR REPLACE FUNCTION public.notify_booking_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user UUID;
  v_title TEXT;
  v_body TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_user := NEW.provider_id;
    v_title := 'Новая заявка';
    v_body := 'У вас новая заявка на бронирование.';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'cancelled' AND auth.uid() = NEW.client_id THEN
      v_user := NEW.provider_id;
      v_title := 'Бронирование отменено';
      v_body := 'Клиент отменил бронирование.';
    ELSE
      v_user := NEW.client_id;
      v_title := 'Статус бронирования изменён';
      v_body := 'Новый статус: ' || NEW.status::TEXT;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications(user_id, title, body, data)
  VALUES (
    v_user,
    v_title,
    v_body,
    jsonb_build_object('bookingId', NEW.id, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$;
