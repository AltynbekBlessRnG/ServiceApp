import { createClient } from 'npm:@supabase/supabase-js@2.95.3';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

type NotificationRecord = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const expectedSecret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  if (!expectedSecret || request.headers.get('x-webhook-secret') !== expectedSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: 'Server is not configured' }, 503);

  let record: NotificationRecord | undefined;
  try {
    const payload = await request.json();
    record = payload.record as NotificationRecord;
  } catch {
    return jsonResponse({ error: 'Invalid webhook body' }, 400);
  }
  if (!record?.id || !record.user_id) return jsonResponse({ error: 'Invalid notification' }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: tokens, error } = await admin.rpc('get_push_tokens', { p_user_id: record.user_id });
  if (error) return jsonResponse({ error: 'Token lookup failed' }, 500);
  if (!tokens?.length) return jsonResponse({ delivered: 0 });

  const messages = tokens.map(({ token }: { token: string }) => ({
    to: token,
    sound: 'default',
    title: record!.title,
    body: record!.body,
    data: record!.data || {},
  }));
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!response.ok) return jsonResponse({ error: 'Expo push failed' }, 502);
  return jsonResponse({ delivered: messages.length }, 202);
});
