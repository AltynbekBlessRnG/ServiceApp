import assert from 'node:assert/strict';

import { resolveHomeRoute } from '../lib/auth-routing';
import { getPublicAppConfig, getRequiredEnv } from '../lib/env';

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run('routes client users to the client home screen', () => {
  assert.equal(resolveHomeRoute('client'), '/(client)/home');
});

run('routes specialist users to the specialist home screen', () => {
  assert.equal(resolveHomeRoute('specialist'), '/(specialist)/home');
});

run('routes venue users to the venue home screen', () => {
  assert.equal(resolveHomeRoute('venue'), '/(venue)/home');
});

run('falls back to role selection for unsupported roles', () => {
  assert.equal(resolveHomeRoute('admin'), '/(auth)/role-select');
  assert.equal(resolveHomeRoute(null), '/(auth)/role-select');
});

run('returns required environment values when they exist', () => {
  const env = { EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' };
  assert.equal(getRequiredEnv('EXPO_PUBLIC_SUPABASE_URL', env), 'https://example.supabase.co');
});

run('normalizes a rest endpoint into the project URL', () => {
  const env = { EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co/rest/v1/' };
  assert.equal(getRequiredEnv('EXPO_PUBLIC_SUPABASE_URL', env), 'https://example.supabase.co');
});

run('returns fallback when env is missing for known variables', () => {
  const result = getRequiredEnv('EXPO_PUBLIC_SUPABASE_URL', {});
  assert.ok(result.includes('supabase.co'), 'Should return fallback Supabase URL');
});

run('throws for unknown env variables with no fallback', () => {
  assert.throws(
    () => getRequiredEnv('UNKNOWN_VARIABLE', {}),
    /Missing required environment variable: UNKNOWN_VARIABLE/
  );
});

run('collects the public runtime config shape', () => {
  const config = getPublicAppConfig({
    EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    EXPO_PUBLIC_API_KEY: 'gemini-key',
  });

  assert.deepEqual(config, {
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon-key',
    geminiApiKey: 'gemini-key',
  });
});
