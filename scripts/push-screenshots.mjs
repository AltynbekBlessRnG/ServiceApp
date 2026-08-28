// Загружает снимки экрана в App Store Connect.
//
// Apple принимает картинки в три приёма: сначала бронируем место и получаем
// список операций загрузки, потом льём байты по выданным адресам, потом
// подтверждаем контрольной суммой. Без последнего шага снимок остаётся
// невидимым черновиком.
//
//   node scripts/push-screenshots.mjs <каталог> [--locale en-US] [--type APP_IPHONE_67] [--dry-run]
//
// Файлы берутся по алфавиту — нумеруйте их так, как хотите видеть в карточке.

import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { asc } from './asc.mjs';

const APP_ID = '6791085209';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const dryRun = args.includes('--dry-run');
const locale = flag('locale', 'en-US');
const displayType = flag('type', 'APP_IPHONE_67');

if (!dir) {
  console.error('Укажите каталог со снимками: node scripts/push-screenshots.mjs shots/');
  process.exit(1);
}

function fail(step, result) {
  const detail = result.body?.errors?.map((e) => `${e.title}: ${e.detail}`).join('\n  ') ?? result.raw;
  console.error(`✗ ${step} — HTTP ${result.status}\n  ${detail}`);
  process.exit(1);
}

async function get(pathname) {
  const result = await asc('GET', pathname);
  if (!result.ok) fail(`GET ${pathname}`, result);
  return result.body;
}

const versions = await get(`/v1/apps/${APP_ID}/appStoreVersions?limit=1&filter[appStoreState]=PREPARE_FOR_SUBMISSION`);
const version = versions.data[0];
if (!version) {
  console.error('✗ Нет версии в состоянии PREPARE_FOR_SUBMISSION — загружать снимки некуда.');
  process.exit(1);
}
console.log(`Версия ${version.attributes.versionString} (${version.id})`);

const localizations = await get(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`);
const localization = localizations.data.find((l) => l.attributes.locale === locale);
if (!localization) {
  console.error(`✗ У версии нет локали ${locale}. Есть: ${localizations.data.map((l) => l.attributes.locale).join(', ')}`);
  process.exit(1);
}

const existingSets = await get(`/v1/appStoreVersionLocalizations/${localization.id}/appScreenshotSets`);
let set = existingSets.data.find((s) => s.attributes.screenshotDisplayType === displayType);

const files = (await readdir(dir))
  .filter((name) => name.toLowerCase().endsWith('.png'))
  .sort();
if (files.length === 0) {
  console.error(`✗ В ${dir} нет PNG.`);
  process.exit(1);
}
console.log(`Локаль ${locale}, тип ${displayType}, файлов: ${files.length}`);
files.forEach((name) => console.log(`  ${name}`));

if (dryRun) {
  console.log('\n--dry-run: ничего не отправлено.');
  process.exit(0);
}

if (!set) {
  const created = await asc('POST', '/v1/appScreenshotSets', {
    data: {
      type: 'appScreenshotSets',
      attributes: { screenshotDisplayType: displayType },
      relationships: {
        appStoreVersionLocalization: {
          data: { type: 'appStoreVersionLocalizations', id: localization.id },
        },
      },
    },
  });
  if (!created.ok) fail('создание набора снимков', created);
  set = created.body.data;
  console.log(`Создан набор ${set.id}`);
} else {
  console.log(`Набор уже есть: ${set.id}`);
  const current = await get(`/v1/appScreenshotSets/${set.id}/appScreenshots`);
  for (const shot of current.data) {
    const removed = await asc('DELETE', `/v1/appScreenshots/${shot.id}`);
    if (!removed.ok) fail(`удаление старого снимка ${shot.id}`, removed);
  }
  if (current.data.length) console.log(`Удалено старых снимков: ${current.data.length}`);
}

for (const name of files) {
  const bytes = await readFile(path.join(dir, name));

  const reserved = await asc('POST', '/v1/appScreenshots', {
    data: {
      type: 'appScreenshots',
      attributes: { fileSize: bytes.length, fileName: name },
      relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: set.id } } },
    },
  });
  if (!reserved.ok) fail(`бронирование ${name}`, reserved);

  const shot = reserved.body.data;
  for (const operation of shot.attributes.uploadOperations) {
    const chunk = bytes.subarray(operation.offset, operation.offset + operation.length);
    const headers = Object.fromEntries(operation.requestHeaders.map((h) => [h.name, h.value]));
    const response = await fetch(operation.url, { method: operation.method, headers, body: chunk });
    if (!response.ok) {
      console.error(`✗ Загрузка ${name} — HTTP ${response.status}`);
      process.exit(1);
    }
  }

  const committed = await asc('PATCH', `/v1/appScreenshots/${shot.id}`, {
    data: {
      type: 'appScreenshots',
      id: shot.id,
      attributes: { uploaded: true, sourceFileChecksum: createHash('md5').update(bytes).digest('hex') },
    },
  });
  if (!committed.ok) fail(`подтверждение ${name}`, committed);

  console.log(`✓ ${name}`);
}

console.log('\nГотово. Проверьте состояние снимков в App Store Connect — Apple обрабатывает их несколько минут.');
