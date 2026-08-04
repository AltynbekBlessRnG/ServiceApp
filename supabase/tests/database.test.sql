BEGIN;
SELECT plan(12);

SELECT has_table('public', 'bookings', 'canonical bookings table exists');
SELECT has_table('private', 'device_tokens', 'device tokens are private');
SELECT has_table('public', 'provider_verifications', 'provider verification queue exists');
SELECT has_function('public', 'create_appointment', ARRAY['uuid', 'bigint', 'timestamp with time zone', 'text'], 'appointment RPC exists');
SELECT has_function('public', 'transition_booking', ARRAY['uuid', 'booking_status'], 'booking transition RPC exists');
SELECT has_function('public', 'admin_review_provider', ARRAY['uuid', 'provider_verification_status', 'text'], 'provider review RPC exists');
SELECT policies_are('public', 'bookings', ARRAY['bookings_read'], 'bookings expose only the expected read policy');
SELECT policies_are('public', 'provider_verifications', ARRAY['provider_verifications_read'], 'verification rows expose only the expected policy');

SELECT has_index('public', 'provider_verifications', 'provider_verifications_pending_idx', 'pending verification queue is indexed');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

SELECT throws_ok(
  $$ SELECT * FROM private.device_tokens $$,
  '42501',
  NULL,
  'authenticated users cannot read device tokens'
);

SELECT throws_ok(
  $$ INSERT INTO private.admin_users(user_id) VALUES ('10000000-0000-0000-0000-000000000001') $$,
  '42501',
  NULL,
  'users cannot promote themselves to admin'
);

SELECT throws_ok(
  $$ INSERT INTO public.bookings(client_id, provider_id, service_id, kind, starts_at)
     VALUES (
       '10000000-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000002',
       1,
       'appointment',
       NOW() + INTERVAL '1 day'
     ) $$,
  '42501',
  NULL,
  'clients cannot bypass booking RPC with direct inserts'
);

SELECT * FROM finish();
ROLLBACK;
