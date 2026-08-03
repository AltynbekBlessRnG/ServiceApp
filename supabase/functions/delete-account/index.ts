import { createClient } from 'npm:@supabase/supabase-js@2.95.3';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'DELETE' && request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authorization || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const token = authorization.replace(/^Bearer\s+/i, '');
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return jsonResponse({ error: 'Unauthorized' }, 401);

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) return jsonResponse({ error: 'Account deletion failed' }, 500);
  return new Response(null, { status: 204, headers: corsHeaders });
});
