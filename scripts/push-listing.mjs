#!/usr/bin/env node
// Заливает store/listing.json в App Store Connect: подзаголовок и ссылку на
// политику приватности — в appInfoLocalizations, описание, ключевые слова и
// ссылку на поддержку — в appStoreVersionLocalizations нужной версии.
//
// Недостающие локали создаются, существующие обновляются.
//
//   set -a; . ./.asc-env; set +a; node scripts/push-listing.mjs
//   ... node scripts/push-listing.mjs --dry-run

import { readFileSync } from 'node:fs';
import { asc } from './asc.mjs';

const APP_ID = '6791085209';
const dryRun = process.argv.includes('--dry-run');
const listing = JSON.parse(readFileSync(new URL('../store/listing.json', import.meta.url), 'utf8'));

function die(message, detail) {
  console.error(`\n✗ ${message}`);
  if (detail) console.error(JSON.stringify(detail, null, 2).slice(0, 1200));
  process.exit(1);
}

async function get(path) {
  const r = await asc('GET', path);
  if (!r.ok) die(`GET ${path} → ${r.status}`, r.body);
  return r.body;
}

async function write(method, path, body, label, { optional = false } = {}) {
  if (dryRun) {
    console.log(`  [dry-run] ${method} ${path}`);
    return true;
  }
  const r = await asc(method, path, body);
  if (!r.ok) {
    if (!optional) die(`${method} ${path} → ${r.status} (${label})`, r.body);
    const detail = r.body?.errors?.[0]?.detail ?? `HTTP ${r.status}`;
    console.log(`  ⚠ ${label} пропущено: ${detail}`);
    return false;
  }
  console.log(`  ✓ ${label}`);
  return true;
}

// Версия, которую ещё можно править.
const versions = await get(`/v1/apps/${APP_ID}/appStoreVersions?limit=10`);
const editable = versions.data.find((v) =>
  ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED'].includes(
    v.attributes.appStoreState,
  ),
);
if (!editable) die('Нет версии в редактируемом состоянии — метаданные править нельзя.');
console.log(`Версия ${editable.attributes.versionString} (${editable.attributes.appStoreState})`);

const appInfos = await get(`/v1/apps/${APP_ID}/appInfos`);
const appInfo = appInfos.data.find((i) =>
  ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED'].includes(
    i.attributes.state,
  ),
);
if (!appInfo) die('Нет редактируемого appInfo.');

const versionLocales = await get(`/v1/appStoreVersions/${editable.id}/appStoreVersionLocalizations`);
const infoLocales = await get(`/v1/appInfos/${appInfo.id}/appInfoLocalizations`);

for (const [locale, copy] of Object.entries(listing.locales)) {
  console.log(`\n${locale}`);

  const info = infoLocales.data.find((l) => l.attributes.locale === locale);
  const infoAttrs = { subtitle: copy.subtitle, privacyPolicyUrl: listing.privacyPolicyUrl };
  if (info) {
    await write('PATCH', `/v1/appInfoLocalizations/${info.id}`,
      { data: { type: 'appInfoLocalizations', id: info.id, attributes: infoAttrs } },
      'подзаголовок и политика приватности');
  } else {
    // Имя приложения уникально в пределах локали по всему App Store, и в
    // некоторых локалях оно может быть занято другим аккаунтом. Локаль
    // названия необязательна: без неё Apple показывает имя основной локали.
    await write('POST', '/v1/appInfoLocalizations', {
      data: {
        type: 'appInfoLocalizations',
        attributes: { locale, ...infoAttrs },
        relationships: { appInfo: { data: { type: 'appInfos', id: appInfo.id } } },
      },
    }, 'создана локаль названия', { optional: true });
  }

  const version = versionLocales.data.find((l) => l.attributes.locale === locale);
  const versionAttrs = {
    description: copy.description,
    keywords: copy.keywords,
    supportUrl: listing.supportUrl,
  };
  if (version) {
    await write('PATCH', `/v1/appStoreVersionLocalizations/${version.id}`,
      { data: { type: 'appStoreVersionLocalizations', id: version.id, attributes: versionAttrs } },
      'описание, ключевые слова, поддержка');
  } else {
    // Apple отказывает в добавлении локали, если имя приложения занято в ней
    // другим аккаунтом. Это не повод валить весь прогон: остальные локали
    // должны примениться.
    await write('POST', '/v1/appStoreVersionLocalizations', {
      data: {
        type: 'appStoreVersionLocalizations',
        attributes: { locale, ...versionAttrs },
        relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: editable.id } } },
      },
    }, 'создана локаль описания', { optional: true });
  }
}

console.log(dryRun ? '\nПроверка завершена, ничего не изменено.\n' : '\nЛистинг обновлён.\n');
