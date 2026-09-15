import { createClient } from 'npm:@supabase/supabase-js@2.95.3';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

// Бакеты, куда пользователь сам загружает файлы. Приложение кладёт их в папку
// с id пользователя, и политики хранилища разрешают писать только туда.
const USER_MEDIA_BUCKETS = ['avatars', 'portfolio'];
const PAGE = 1000;

// Строки в базе при удалении пользователя уходят каскадом, а файлы в хранилище
// — нет: без этого шага аватар и снимки портфолио оставались бы доступны по
// публичным ссылкам уже после того, как человек удалил аккаунт.
async function removeUserMedia(admin: ReturnType<typeof createClient>, userId: string) {
  for (const bucket of USER_MEDIA_BUCKETS) {
    for (;;) {
      const { data, error } = await admin.storage.from(bucket).list(userId, { limit: PAGE });
      if (error) throw new Error(`${bucket}: ${error.message}`);
      if (!data?.length) break;
      const paths = data.map((file) => `${userId}/${file.name}`);
      const { error: removeError } = await admin.storage.from(bucket).remove(paths);
      if (removeError) throw new Error(`${bucket}: ${removeError.message}`);
      if (data.length < PAGE) break;
    }
  }
}

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

  // Файлы стираем до аккаунта: если хранилище откажет, аккаунт останется и
  // повторная попытка доделает работу. В обратном порядке файлы осиротели бы
  // навсегда — удалить их от имени уже несуществующего пользователя некому.
  try {
    await removeUserMedia(admin, data.user.id);
  } catch (mediaError) {
    console.error('media removal failed', mediaError);
    return jsonResponse({ error: 'Не удалось удалить файлы аккаунта. Попробуйте ещё раз.' }, 500);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) return jsonResponse({ error: 'Account deletion failed' }, 500);
  return new Response(null, { status: 204, headers: corsHeaders });
});
