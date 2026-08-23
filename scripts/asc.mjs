#!/usr/bin/env node
// Клиент App Store Connect API.
//
// Ключ .p8 читается с диска и никогда не печатается. Держите его вне
// репозитория — например в ~/.appstoreconnect/private_keys/.
//
// Переменные окружения:
//   ASC_KEY_ID     — Key ID (10 символов)
//   ASC_ISSUER_ID  — Issuer ID (UUID, показан над списком ключей)
//   ASC_KEY_PATH   — путь к файлу AuthKey_<KEY_ID>.p8
//   ASC_KEY_KIND   — team (по умолчанию) или individual
//
// Использование:
//   node scripts/asc.mjs GET /v1/apps
//   node scripts/asc.mjs GET '/v1/apps/6791085209/appStoreVersions?limit=5'
//   node scripts/asc.mjs PATCH /v1/appStoreVersions/<id> '{"data":{...}}'

import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { Buffer } from 'node:buffer';

const API = 'https://api.appstoreconnect.apple.com';

const keyId = process.env.ASC_KEY_ID?.trim();
const issuerId = process.env.ASC_ISSUER_ID?.trim();
const keyPath = process.env.ASC_KEY_PATH?.trim();
const keyKind = (process.env.ASC_KEY_KIND ?? 'team').trim();

function die(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

if (!keyId) die('Не задан ASC_KEY_ID.');
if (!issuerId) die('Не задан ASC_ISSUER_ID.');
if (!keyPath) die('Не задан ASC_KEY_PATH (путь к файлу .p8).');

let privateKey;
try {
  privateKey = readFileSync(keyPath, 'utf8');
} catch (error) {
  die(`Не удалось прочитать ключ по пути ${keyPath} — ${error.message}`);
}
if (!privateKey.includes('BEGIN PRIVATE KEY')) {
  die(`Файл ${keyPath} не похож на ключ .p8 от App Store Connect.`);
}

const base64url = (input) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function createToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  // Apple отклоняет токены со сроком жизни больше 20 минут.
  const payload = { iss: issuerId, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' };
  if (keyKind === 'individual') payload.sub = 'user';

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signer = createSign('SHA256');
  signer.update(signingInput);
  signer.end();
  // JWT ES256 требует «сырую» подпись R||S, а не DER, который Node отдаёт по умолчанию.
  const signature = signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${base64url(signature)}`;
}

export async function asc(method, path, body) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${createToken()}`,
      'Content-Type': 'application/json',
    },
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  return { status: response.status, ok: response.ok, body: parsed, raw: text };
}

// Запуск как CLI, а не импорт из другого скрипта.
if (import.meta.url === `file://${process.argv[1]}`) {
  const [method = 'GET', path, payload] = process.argv.slice(2);
  if (!path) die('Укажите путь, например: node scripts/asc.mjs GET /v1/apps');

  const result = await asc(method.toUpperCase(), path, payload);

  if (result.status === 401) {
    die(
      'Apple отклонила токен (401).\n' +
        '  Проверьте ASC_KEY_ID, ASC_ISSUER_ID и что ключ не отозван.\n' +
        '  Если ключ создан как Individual Key, добавьте ASC_KEY_KIND=individual.',
    );
  }

  console.log(`HTTP ${result.status}`);
  console.log(result.body ? JSON.stringify(result.body, null, 2) : result.raw);
  if (!result.ok) process.exit(1);
}
