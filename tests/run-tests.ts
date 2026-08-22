import assert from 'node:assert/strict';

import { resolveHomeRoute } from '../lib/auth-routing';
import { getPublicAppConfig, getRequiredEnv } from '../lib/env';
import { canTransitionBooking, deduplicateProviders, formatPrice } from '../lib/domain';
import { getFallbackSearchIntent } from '../lib/search-intent';
import { EMAIL_OTP_LENGTH, getAuthErrorMessage, getRegistrationValidationError, normalizeEmail, validateRegistrationPassword } from '../lib/auth-validation';
import { readAuthCallbackTokens } from '../lib/auth-callback';
import { getPublicStoragePath } from '../lib/storage-path';

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

run('throws when a required environment variable is missing', () => {
  assert.throws(
    () => getRequiredEnv('EXPO_PUBLIC_SUPABASE_URL', {}),
    /Missing required environment variable: EXPO_PUBLIC_SUPABASE_URL/
  );
});

run('collects the public runtime config shape', () => {
  const config = getPublicAppConfig({
    EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  });

  assert.deepEqual(config, {
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon-key',
  });
});

run('allows only client cancellation from active booking states', () => {
  const future = new Date(Date.now() + 60_000);
  assert.equal(canTransitionBooking('client', 'pending', 'cancelled', future), true);
  assert.equal(canTransitionBooking('client', 'completed', 'cancelled', future), false);
});

run('allows provider completion only after an appointment starts', () => {
  const now = new Date('2026-07-30T12:00:00Z');
  assert.equal(canTransitionBooking('provider', 'confirmed', 'completed', new Date('2026-07-30T11:00:00Z'), now), true);
  assert.equal(canTransitionBooking('provider', 'confirmed', 'completed', new Date('2026-07-30T13:00:00Z'), now), false);
});

run('allows an audited admin override without no-op transitions', () => {
  const future = new Date(Date.now() + 60_000);
  assert.equal(canTransitionBooking('admin', 'pending', 'completed', future), true);
  assert.equal(canTransitionBooking('admin', 'pending', 'pending', future), false);
});

run('deduplicates provider cards produced by multiple services', () => {
  assert.deepEqual(deduplicateProviders([{ id: 'a', service: 'one' }, { id: 'a', service: 'two' }, { id: 'b', service: 'three' }]), [
    { id: 'a', service: 'two' },
    { id: 'b', service: 'three' },
  ]);
});

run('formats Kazakhstan tenge prices', () => {
  assert.match(formatPrice(12500), /12[^\d]?500 ₸/);
});

run('uses local search intent when AI is unavailable', () => {
  assert.deepEqual(getFallbackSearchIntent('маникюр'), {
    intent: 'general_question',
    serviceSlugs: [],
  });
});

run('normalizes email addresses before authentication', () => {
  assert.equal(normalizeEmail('  User@Example.COM '), 'user@example.com');
});

run('keeps the email confirmation code aligned with Supabase config', () => {
  assert.equal(EMAIL_OTP_LENGTH, 6);
});

run('requires a strong registration password', () => {
  assert.equal(validateRegistrationPassword('weakpass'), 'Добавьте заглавную латинскую букву');
  assert.equal(validateRegistrationPassword('StrongPass1'), null);

  assert.deepEqual(getRegistrationValidationError({
    fullName: 'Алтынбек Темирхан', city: 'Алматы', email: 'test@example.com',
    password: 'StrongPass1', passwordConfirmation: 'DifferentPass1', acceptedLegal: true,
  }), { title: 'Пароли не совпадают', message: 'Повторно введите одинаковый пароль.' });

  assert.equal(getRegistrationValidationError({
    fullName: 'Алтынбек Темирхан', city: 'Алматы', email: 'test@example.com',
    password: 'StrongPass1', passwordConfirmation: 'StrongPass1', acceptedLegal: true,
  }), null);
});

run('translates common authentication errors', () => {
  assert.equal(getAuthErrorMessage('Email not confirmed'), 'Сначала подтвердите email по ссылке из письма');
});

run('keeps recovery type when tokens arrive in different URL sections', () => {
  assert.deepEqual(
    readAuthCallbackTokens('taptym://auth/callback?type=recovery#access_token=a&refresh_token=b'),
    { code: null, accessToken: 'a', refreshToken: 'b', tokenHash: null, type: 'recovery' },
  );
});

run('reads token-hash recovery callbacks', () => {
  assert.deepEqual(
    readAuthCallbackTokens('taptym://auth/callback?token_hash=hash&type=recovery'),
    { code: null, accessToken: null, refreshToken: null, tokenHash: 'hash', type: 'recovery' },
  );
});

run('extracts an owned Storage path from a public URL', () => {
  assert.equal(
    getPublicStoragePath(
      'https://example.supabase.co/storage/v1/object/public/portfolio/user%2Fphoto.jpg?download=1',
      'portfolio',
    ),
    'user/photo.jpg',
  );
});
