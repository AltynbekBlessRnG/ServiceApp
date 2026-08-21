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
  // Expo replaces EXPO_PUBLIC_* variables in production bundles only when they
  // are accessed statically. Dynamic access such as process.env[name] remains
  // undefined in a standalone APK.
  const resolvedSource = source === process.env
    ? {
        EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      }
    : source;

  return {
    supabaseUrl: getRequiredEnv('EXPO_PUBLIC_SUPABASE_URL', resolvedSource),
    supabaseAnonKey: getRequiredEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', resolvedSource),
  };
}
