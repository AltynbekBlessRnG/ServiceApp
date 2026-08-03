-- Hosted projects grant EXECUTE on newly created functions directly to API
-- roles. Revoke those defaults, then expose only the RPC surface used by the
-- mobile application and service-role Edge Functions.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_appointment(UUID, BIGINT, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_stay_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_booking(UUID, public.booking_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_unavailable_intervals(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_banned(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_initial_role(public.account_role, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_chats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_providers(public.provider_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_report(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_device_token(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unregister_device_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_private_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_private_profile(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_venue_location(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_venue_location(DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_push_tokens(UUID) TO service_role;
