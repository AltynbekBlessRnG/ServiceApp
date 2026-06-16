type EnvSource = Record<string, string | undefined>;

function normalizeSupabaseUrl(value: string): string {
  return value.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/g, '');
}

export function getRequiredEnv(name: string, source: EnvSource = process.env): string {
  const fallbacks: Record<string, string> = {
    EXPO_PUBLIC_SUPABASE_URL: 'https://vliyawimvyeggrfypzgm.supabase.co',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsaXlhd2ltdnllZ2dyZnlwemdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzM2OTEsImV4cCI6MjA5NzAwOTY5MX0.b77JyZR7cx-idjrtzT-zf3a63MvsxKwfuH33yM_V9Rs',
  };
  const value = source[name]?.trim() || fallbacks[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return name === 'EXPO_PUBLIC_SUPABASE_URL' ? normalizeSupabaseUrl(value) : value;
}

export function getOptionalEnv(name: string, source: EnvSource = process.env): string | null {
  return source[name]?.trim() || null;
}

export function getPublicAppConfig(source: EnvSource = process.env) {
  return {
    supabaseUrl: getRequiredEnv('EXPO_PUBLIC_SUPABASE_URL', source),
    supabaseAnonKey: getRequiredEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', source),
    geminiApiKey: getOptionalEnv('EXPO_PUBLIC_API_KEY', source),
  };
}
