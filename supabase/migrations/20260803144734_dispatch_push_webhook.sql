CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION private.dispatch_notification_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  webhook_url TEXT;
  webhook_secret TEXT;
BEGIN
  SELECT decrypted_secret
  INTO webhook_url
  FROM vault.decrypted_secrets
  WHERE name = 'push_webhook_url';

  SELECT decrypted_secret
  INTO webhook_secret
  FROM vault.decrypted_secrets
  WHERE name = 'push_webhook_secret';

  IF webhook_url IS NULL OR webhook_secret IS NULL THEN
    RAISE WARNING 'Push webhook is not configured in Vault';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(NEW),
      'old_record', NULL
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.dispatch_notification_push() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notifications_dispatch_push ON public.notifications;
CREATE TRIGGER notifications_dispatch_push
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION private.dispatch_notification_push();
