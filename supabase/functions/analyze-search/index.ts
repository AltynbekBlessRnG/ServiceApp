import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

type SearchIntent = {
  intent: 'search_specialist' | 'search_venue' | 'general_question';
  providerType?: 'specialist' | 'venue';
  categorySlug?: string;
  serviceSlugs: string[];
  city?: string;
  maxPrice?: number;
};

const allowedIntents = new Set(['search_specialist', 'search_venue', 'general_question']);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return jsonResponse({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.6-flash';
  if (!supabaseUrl || !anonKey || !geminiKey) {
    return jsonResponse({ error: 'Server is not configured' }, 503);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: 'Unauthorized' }, 401);

  const { data: quotaAllowed, error: quotaError } = await supabase.rpc('consume_ai_quota');
  if (quotaError) return jsonResponse({ error: 'Quota check failed' }, 503);
  if (!quotaAllowed) return jsonResponse({ error: 'Rate limit exceeded' }, 429);

  let body: { query?: unknown; city?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const city = typeof body.city === 'string' ? body.city.trim() : undefined;
  if (query.length < 2 || query.length > 500) {
    return jsonResponse({ error: 'Query must contain 2-500 characters' }, 400);
  }

  const prompt = [
    'Classify a Taptym service marketplace search query.',
    'Return Russian tags and only JSON matching the schema.',
    'providerType is specialist for a person and venue for a business/location.',
    `Query: ${JSON.stringify(query)}`,
    city ? `Known city: ${JSON.stringify(city)}` : '',
  ].filter(Boolean).join('\n');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object',
            properties: {
              intent: { type: 'string', enum: ['search_specialist', 'search_venue', 'general_question'] },
              providerType: { type: 'string', enum: ['specialist', 'venue'] },
              categorySlug: { type: 'string' },
              serviceSlugs: { type: 'array', items: { type: 'string' } },
              city: { type: 'string' },
              maxPrice: { type: 'number' },
            },
            required: ['intent', 'serviceSlugs'],
          },
        },
      }),
    },
  );

  if (!response.ok) return jsonResponse({ error: 'AI provider unavailable' }, 502);
  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') return jsonResponse({ error: 'Invalid AI response' }, 502);

  try {
    const parsed = JSON.parse(text) as SearchIntent;
    if (!allowedIntents.has(parsed.intent) || !Array.isArray(parsed.serviceSlugs)) {
      throw new Error('Invalid response shape');
    }
    return jsonResponse(parsed);
  } catch {
    return jsonResponse({ error: 'Invalid AI response' }, 502);
  }
});
