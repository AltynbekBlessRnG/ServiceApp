BEGIN;
SELECT plan(16);

SELECT has_table('public', 'bookings', 'canonical bookings table exists');
SELECT has_table('private', 'device_tokens', 'device tokens are private');
SELECT has_table('public', 'provider_verifications', 'provider verification queue exists');
SELECT has_table('public', 'portfolio_likes', 'persistent portfolio likes table exists');
SELECT has_function('public', 'create_appointment', ARRAY['uuid', 'bigint', 'timestamp with time zone', 'text'], 'appointment RPC exists');
SELECT has_function('public', 'transition_booking', ARRAY['uuid', 'booking_status'], 'booking transition RPC exists');
SELECT has_function('public', 'admin_review_provider', ARRAY['uuid', 'provider_verification_status', 'text'], 'provider review RPC exists');
SELECT has_function('public', 'set_my_portfolio_hero', ARRAY['uuid'], 'atomic portfolio hero RPC exists');
SELECT policies_are('public', 'bookings', ARRAY['bookings_read'], 'bookings expose only the expected read policy');
SELECT policies_are('public', 'provider_verifications', ARRAY['provider_verifications_read'], 'verification rows expose only the expected policy');
SELECT policies_are(
  'public',
  'portfolio_likes',
  ARRAY['portfolio_likes_delete_own', 'portfolio_likes_insert_own', 'portfolio_likes_read'],
  'portfolio likes expose the expected policies'
);

SELECT has_index('public', 'provider_verifications', 'provider_verifications_pending_idx', 'pending verification queue is indexed');
SELECT has_index('public', 'portfolio_likes', 'portfolio_likes_user_id_idx', 'portfolio likes are indexed by user');

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
