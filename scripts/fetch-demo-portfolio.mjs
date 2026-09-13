#!/usr/bin/env node
// Скачивает временные снимки для портфолио демонстрационных профилей.
//
// Зачем временные: у выдуманного мастера не может быть своих работ, а вкладка
// «Портфолио» без единого снимка выглядит сломанной. До того как владелец
// пришлёт собственные фотографии, показываем стоковые.
//
// Источник — Pexels. Бесплатные каталоги без ключа (Openverse, Викисклад) не
// подошли: первый режет анонимные запросы на середине списка услуг, второй
// отдаёт архив, где «barbershop» — это мужской хор, а «manicure» — набор
// щипчиков 1940-х годов.
//
// Правила Pexels требуют указывать и фотографа, и сам сервис рядом со снимком.
// Подпись впечатана в изображение, а не выводится приложением: так она
// работает в уже собранном билде, без выпуска новой версии, и заодно честно
// помечает снимок как витринный.
//
// Ключ читается из PEXELS_API_KEY и в сборку приложения не попадает.
// Использование: node scripts/fetch-demo-portfolio.mjs demo/portfolio

import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const QUERIES = {
  diagnostics: 'car diagnostic scanner mechanic', mechanics: 'car mechanic engine repair',
  'auto-electricians': 'car battery jumper cables', 'tire-specialists': 'changing car tire',
  'interior-cleaning': 'car interior vacuum cleaning', 'car-selection': 'car dealership showroom',
  'mobile-repair': 'roadside car repair', 'service-stations': 'auto repair garage lift',
  detailing: 'car polishing detailing', 'car-wash': 'car wash foam', 'tire-service': 'tire shop wheels',
  'car-rental': 'rental car keys',
  'nail-artists': 'manicure nails salon', 'makeup-artists': 'makeup artist applying makeup',
  massage: 'massage therapy spa', cosmetology: 'facial treatment cosmetology',
  stylists: 'hair styling salon', nurses: 'nurse medical care',
  rehabilitation: 'physical rehabilitation therapy', 'physical-therapy': 'physiotherapy exercise',
  caregivers: 'elderly care helping', 'beauty-salons': 'beauty salon interior',
  barbershops: 'barbershop haircut', spa: 'spa treatment room', dentistry: 'dentist dental clinic',
  smm: 'social media content creator', marketing: 'marketing team meeting',
  design: 'graphic designer workspace', accounting: 'accountant calculator documents',
  consulting: 'business consultant meeting',
  tutors: 'tutor teaching student', trainers: 'personal fitness trainer gym',
  driving: 'driving instructor car', 'driving-schools': 'student driver steering wheel',
  'language-schools': 'language class students', 'education-centers': 'students studying together desk',
  hosts: 'event host microphone stage', photographers: 'photographer with camera',
  videographers: 'videographer filming camera', musicians: 'live band performing',
  decorators: 'event decoration balloons', banquet: 'banquet hall wedding table',
  catering: 'catering buffet food', 'photo-studios': 'photo studio lighting',
  plumbing: 'plumber fixing pipes', electrical: 'electrician wiring',
  repair: 'home renovation work', handyman: 'man drilling wall home',
  cleaners: 'house cleaning service', 'furniture-assembly': 'assembling furniture',
  finishing: 'painting wall renovation', 'appliance-repair': 'repairing washing machine',
  installers: 'worker mounting tv on wall', 'upholstery-cleaning': 'cleaning sofa upholstery',
  cleaning: 'cleaning office desk spray', 'dry-cleaning': 'ironing clothes hangers shop',
  frontend: 'web developer code screen', backend: 'programmer server code',
  devops: 'data center server room', mobile: 'mobile app developer phone',
  'ui-ux': 'ux designer wireframe', analytics: 'business charts report analysis',
  lawyers: 'lawyer office desk', advocates: 'court law justice',
  notaries: 'signing documents notary', 'law-firms': 'law firm office',
  'business-registration': 'business documents signing',
  guides: 'tour guide group', 'tour-organizers': 'travel group mountains',
  transfers: 'minivan transfer travel', 'outdoor-instructors': 'hiking guide mountains',
  'travel-agents': 'travel agency planning', recreation: 'lakeside wooden cabins',
  glamping: 'glamping tent nature', hotels: 'hotel room bed', sanatoriums: 'wellness resort',
  camps: 'summer camp children outdoor', 'equipment-rental': 'camping gear tents',
  restaurants: 'restaurant interior table', pubs: 'pub beer bar', 'coffee-shops': 'coffee shop barista',
  pizzerias: 'pizza restaurant', 'hookah-lounges': 'hookah lounge interior',
  bars: 'cocktail bar drinks', 'computer-clubs': 'gaming computers esports',
  karaoke: 'karaoke microphone party', nightclubs: 'nightclub dancing lights',
};

// Сколько снимков держать на услугу. Профилей одной услуги в каталоге шесть,
// и каждый получает свою тройку из этого пула со сдвигом, поэтому пул больше
// тройки: иначе у всех мастеров маникюра было бы одно и то же портфолио.
// Шести хватает, чтобы у каждого профиля была своя обложка.
// Первые результаты поиска почти всегда по теме, а к двадцатому Pexels уже
// отдаёт бухгалтеру небоскрёбы, а банкетному залу — бильярдные шары. Поэтому
// снимок берём, только если в его описании (alt) есть слово по теме услуги.
// По умолчанию слова берутся из самого запроса; там, где запрос состоит из
// общих слов, список задан вручную.
const STOPWORDS = new Set(['service', 'room', 'work', 'working', 'home', 'office', 'interior',
  'table', 'shop', 'center', 'together', 'desk', 'with', 'team', 'group', 'meeting', 'people',
  'business', 'students', 'student', 'studying', 'on', 'the', 'and', 'man', 'woman', 'worker']);

const KEYWORDS = {
  accounting: /account|tax|financ|invoice|calculat|bookkeep|budget|receipt|spreadsheet/,
  analytics: /chart|graph|data|analy|statistic|report|dashboard|spreadsheet/,
  'appliance-repair': /repair|washing machine|appliance|fridge|refrigerator|technician|fix/,
  'auto-electricians': /car|engine|battery|vehicle|mechanic|hood|jumper/,
  backend: /code|coding|program|developer|server|laptop|computer|software/,
  frontend: /code|coding|program|developer|web|laptop|computer|screen/,
  banquet: /banquet|wedding|table setting|dinner|reception|hall|dining|celebrat/,
  'business-registration': /document|contract|sign|paperwork|form|agreement|stamp|notary/,
  notaries: /document|contract|sign|paperwork|agreement|stamp|notary|pen/,
  'law-firms': /law|lawyer|legal|justice|court|attorney|contract|document|gavel/,
  lawyers: /law|lawyer|legal|justice|court|attorney|contract|document|gavel/,
  advocates: /law|lawyer|legal|justice|court|attorney|gavel|judge/,
  installers: /install|mount|drill|tv|air condition|window|tool|worker|technician/,
  massage: /massage|spa|therap|back|relax/,
  marketing: /marketing|strategy|brainstorm|presentation|chart|laptop|planning|office/,
  'language-schools': /class|teach|lesson|learn|student|school|book|english|language/,
  mechanics: /car|engine|mechanic|garage|repair|vehicle|wrench|auto/,
  consulting: /meeting|consult|discuss|business|laptop|office|presentation|handshake/,
  smm: /social media|phone|smartphone|content|camera|influencer|laptop|instagram/,
  design: /design|sketch|drawing|laptop|creative|tablet|color|graphic/,
  karaoke: /karaoke|microphone|sing|party|music/,
  nightclubs: /club|dance|dancing|party|dj|night|light/,
  'computer-clubs': /gam|computer|esport|pc|keyboard|monitor|controller/,
};

function relevance(slug, query) {
  if (KEYWORDS[slug]) return KEYWORDS[slug];
  const stems = query.toLowerCase().split(/\s+/)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word))
    .map((word) => word.length > 5 ? word.slice(0, word.length - 2) : word);
  return new RegExp(stems.join('|'));
}

const PER_SERVICE = Number(process.env.PORTFOLIO_PER_SERVICE ?? 6);
const EDGE = 640;
const KEY = process.env.PEXELS_API_KEY;
if (!KEY) {
  console.error('Нет PEXELS_API_KEY. Задайте его в .env и запустите снова.');
  process.exit(1);
}

const outDir = process.argv[2] || 'demo/portfolio';
mkdirSync(outDir, { recursive: true });

const FONT = execFileSync('fc-match', ['-f', '%{file}', 'DejaVu Sans']).toString().trim();
const tmp = join(outDir, '.tmp.bin');

// Запросы у смежных услуг похожи, и Pexels отдаёт им один и тот же топ.
// Держим список уже занятых снимков, чтобы не ставить одну фотографию
// электрику и автоэлектрику одновременно.
const manifestPath = join(outDir, 'sources.json');
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : [];
const used = new Set(manifest.map((entry) => entry.source));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(query) {
  const url = 'https://api.pexels.com/v1/search'
    + `?query=${encodeURIComponent(query)}&per_page=80&orientation=square`;
  const response = await fetch(url, { headers: { Authorization: KEY } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()).photos ?? [];
}

for (const [slug, query] of Object.entries(QUERIES)) {
  let photos = [];
  try {
    photos = await search(query);
  } catch (error) {
    console.log(`  ! ${slug}: поиск не удался (${error.message})`);
    continue;
  }

  let saved = 0;
  for (const photo of photos) {
    if (saved >= PER_SERVICE) break;
    const name = `${slug}-${saved + 1}.jpg`;
    const file = join(outDir, name);
    if (existsSync(file)) { saved += 1; continue; }
    if (used.has(photo.url)) continue;
    if (!relevance(slug, query).test((photo.alt ?? '').toLowerCase())) continue;
    try {
      const image = await fetch(photo.src.large ?? photo.src.original);
      if (!image.ok) continue;
      writeFileSync(tmp, Buffer.from(await image.arrayBuffer()));
      const credit = `Фото: ${photo.photographer} / Pexels`;
      execFileSync('magick', [tmp, '-auto-orient',
        '-resize', `${EDGE}x${EDGE}^`, '-gravity', 'center', '-extent', `${EDGE}x${EDGE}`,
        '(', '-size', `${EDGE}x30`, 'xc:rgba(0,0,0,0.5)', ')', '-gravity', 'south', '-composite',
        '-font', FONT, '-pointsize', '15', '-fill', '#EDEDED',
        '-gravity', 'south', '-annotate', '+0+8', credit,
        '-quality', '78', '-strip', `jpg:${file}`]);
      manifest.push({ file: name, query, alt: photo.alt ?? null, photographer: photo.photographer,
                      photographer_url: photo.photographer_url, source: photo.url });
      used.add(photo.url);
      saved += 1;
    } catch {
      // Битый файл или формат, который magick не взял — берём следующий.
    }
  }
  console.log(`${slug}: ${saved}/${PER_SERVICE}`);
  await sleep(150);
}

if (existsSync(tmp)) rmSync(tmp);
manifest.sort((a, b) => a.file.localeCompare(b.file));
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\nСохранено файлов: ${manifest.length}`);
