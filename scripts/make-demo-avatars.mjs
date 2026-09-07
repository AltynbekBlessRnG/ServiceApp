#!/usr/bin/env node
// Рисует монограммы для демонстрационных профилей каталога.
//
// Зачем: пока у профиля нет avatar_url, UserAvatar показывает серый кружок с
// иконкой человека. На витрине из 184 карточек это выглядит как пустая база.
// Настоящих фотографий у демонстрационных профилей быть не может — они никого
// не изображают, — поэтому рисуем монограмму: инициалы на тёмном фоне.
//
// Файл называется по md5 инициалов, а не по id профиля: одни и те же инициалы
// делят одну картинку, так что файлов 73, а не 184. Тот же md5 умеет считать
// Postgres, поэтому avatar_url собирается прямо в SQL, без выгрузки имён.
//
// Использование: node scripts/make-demo-avatars.mjs <каталог>

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const INITIALS = `TД АА АЖ АИ АК АО АС АУ АШ БА БЖ БК БО БС БШ ГА ГЖ ГО ГС ДА ДЖ ДО ДС
ЕА ЕЖ ЕО ЕС ЖА ЖЖ ЖК ЖО ЖС ЖШ КА КЖ КК КО КС КШ ҚА ҚК МА МЖ МК МО МС МШ НА НЖ
НК НО НС НШ РА РО РС СА СЖ СИ СК СО СС СШ ТА ТЖ ТК ТО ТС ТУ ТШ ША ШК ШШ`.split(/\s+/);

// Тёмные подложки под золотой знак: контраст не ниже 5:1 на каждой.
const GROUNDS = [
  ['#1E2329', '#2B3139'],
  ['#1E4D4A', '#17403D'],
  ['#33404A', '#26313A'],
  ['#3D3450', '#2E2740'],
  ['#264032', '#1C3126'],
  ['#4A3340', '#392734'],
];
const INK = '#F0B90B';
const SIZE = 256;

const outDir = process.argv[2];
if (!outDir) {
  console.error('Укажите каталог: node scripts/make-demo-avatars.mjs public/demo/avatars');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const tmp = join(outDir, '.tmp.svg');
for (const initials of INITIALS) {
  const md5 = createHash('md5').update(initials, 'utf8').digest('hex');
  // Цвет берём из тех же байт, что и имя файла: одинаковые инициалы —
  // одинаковая карточка при любом пересоздании.
  const [from, to] = GROUNDS[parseInt(md5.slice(0, 2), 16) % GROUNDS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
  </linearGradient></defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
  <text x="${SIZE / 2}" y="${SIZE / 2}" dy=".34em" text-anchor="middle"
        font-family="DejaVu Sans" font-size="98" font-weight="bold"
        letter-spacing="2" fill="${INK}">${initials}</text>
</svg>`;
  writeFileSync(tmp, svg);
  execFileSync('rsvg-convert', ['-w', String(SIZE), '-h', String(SIZE), '-o', join(outDir, `${md5}.png`), tmp]);
}
rmSync(tmp);
console.log(`Готово: ${INITIALS.length} монограмм в ${outDir}`);
