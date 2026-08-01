type EnvSource = Record<string, string | undefined>;

function normalizeSupabaseUrl(value: string): string {
  return value.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/g, '');
}

export function getRequiredEnv(name: string, source: EnvSource = process.env): string {
  const value = source[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return name === 'EXPO_PUBLIC_SUPABASE_URL' ? normalizeSupabaseUrl(value) : value;
}

export function getPublicAppConfig(source: EnvSource = process.env) {
  return {
    supabaseUrl: getRequiredEnv('EXPO_PUBLIC_SUPABASE_URL', source),
    supabaseAnonKey: getRequiredEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', source),
  };
}
