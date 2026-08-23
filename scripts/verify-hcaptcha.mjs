#!/usr/bin/env node
// Проверяет, что публичный Site Key приложения и секретный Secret Key,
// сохранённый в Supabase Auth, принадлежат ОДНОМУ сайту hCaptcha.
//
// Использование (секрет не сохраняется и никуда не отправляется, кроме hCaptcha):
//   HCAPTCHA_SECRET=0x... node scripts/verify-hcaptcha.mjs
//   HCAPTCHA_SECRET=0x... node scripts/verify-hcaptcha.mjs <site-key>

const SITEVERIFY = 'https://api.hcaptcha.com/siteverify';
const CHECK_CONFIG = 'https://api.hcaptcha.com/checksiteconfig';

const secret = process.env.HCAPTCHA_SECRET?.trim();
const siteKey = (process.argv[2] ?? process.env.EXPO_PUBLIC_HCAPTCHA_SITE_KEY ?? '').trim();

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

if (!secret) fail('Не задан HCAPTCHA_SECRET. Возьмите Secret Key в hCaptcha Dashboard → Settings.');
if (!siteKey) fail('Не задан site key. Передайте аргументом или через EXPO_PUBLIC_HCAPTCHA_SITE_KEY.');

const siteConfig = await fetch(
  `${CHECK_CONFIG}?host=hcaptcha.com&sitekey=${encodeURIComponent(siteKey)}&sc=1&swa=1`,
).then((response) => response.json());

if (!siteConfig.pass) {
  fail(`Site Key ${siteKey} не распознан hCaptcha. Проверьте значение в hCaptcha Dashboard.`);
}
console.log(`✓ Site Key ${siteKey} существует и активен.`);

// Токен заведомо недействителен: нас интересует не он, а то, какую именно
// ошибку вернёт hCaptcha. `sitekey-secret-mismatch` означает, что Site Key и
// Secret Key взяты из разных сайтов — ровно та причина, по которой Supabase
// отвечает `captcha protection: request disallowed`.
const body = new URLSearchParams({ secret, response: '10000000-aaaa-bbbb-cccc-000000000001', sitekey: siteKey });
const verify = await fetch(SITEVERIFY, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body,
}).then((response) => response.json());

const codes = verify['error-codes'] ?? [];

if (codes.includes('invalid-input-secret') || codes.includes('missing-input-secret')) {
  fail('Secret Key недействителен. Скопируйте его заново из hCaptcha Dashboard → Settings.');
}

if (codes.includes('sitekey-secret-mismatch')) {
  fail(
    'Site Key и Secret Key принадлежат РАЗНЫМ сайтам hCaptcha.\n' +
      '  Это и есть причина ошибки Supabase `invalid-input-response`.\n' +
      '  Возьмите Secret Key того же аккаунта, где заведён этот Site Key,\n' +
      '  и сохраните его в Supabase → Authentication → Attack Protection.',
  );
}

console.log('✓ Site Key и Secret Key принадлежат одному сайту hCaptcha.');
console.log(`  Диагностика siteverify: ${codes.length ? codes.join(', ') : 'нет ошибок'}`);
console.log('  (`invalid-input-response` здесь ожидаем — токен намеренно поддельный.)\n');
console.log('Дальше: сохраните этот Secret Key в Supabase Authentication → Attack Protection');
console.log('и задайте тот же Site Key в EAS: npx eas-cli env:create --environment preview \\');
console.log(`  --name EXPO_PUBLIC_HCAPTCHA_SITE_KEY --value ${siteKey} --visibility plaintext`);
