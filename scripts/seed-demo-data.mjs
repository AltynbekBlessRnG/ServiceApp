import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

function readEnv() {
  const env = { ...process.env };
  if (fs.existsSync('.env')) {
    for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !env[match[1]]) env[match[1]] = match[2].trim();
    }
  }
  return env;
}

const env = readEnv();
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/g, '');
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const password = 'DemoPassword123!';
const avatar = (seed) => `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(seed)}&backgroundColor=8A2BE2,00D2D3,2ED573,FF6B81`;
const image = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;

async function getOrCreateUser(email, fullName, role, city, extraMeta = {}) {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;

  let user = listed.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role, city, ...extraMeta },
    });
    if (error) throw error;
    user = data.user;
  }

  return user.id;
}

async function categoryId(type, name) {
  const { data, error } = await supabase.from('categories').select('id').eq('type', type).eq('name', name).single();
  if (error) throw new Error(`Category not found: ${type}/${name}: ${error.message}`);
  return data.id;
}

async function seedProfile(userId, profile) {
  const { error } = await supabase.from('profiles').upsert({ id: userId, ...profile }, { onConflict: 'id' });
  if (error) throw error;
}

async function seedPortfolio(ownerId, urls) {
  await supabase.from('portfolio').delete().eq('specialist_id', ownerId);
  const rows = urls.map((url, index) => ({
    specialist_id: ownerId,
    file_url: url,
    thumbnail_url: null,
    file_type: 'image',
    in_feed: index === 0,
    is_pinned: index === 0,
    is_hero: index === 0,
  }));
  const { error } = await supabase.from('portfolio').insert(rows);
  if (error) throw error;
}

async function seedSubcategoryLinks(ownerId, catId, limit = 2) {
  const { data, error } = await supabase.from('subcategories').select('id').eq('category_id', catId).limit(limit);
  if (error) throw error;
  await supabase.from('specialist_subcategories').delete().eq('specialist_id', ownerId);
  if (!data?.length) return;
  const { error: insertError } = await supabase
    .from('specialist_subcategories')
    .insert(data.map((item) => ({ specialist_id: ownerId, subcategory_id: item.id })));
  if (insertError) throw insertError;
}

const specialists = [
  ['Барберы', 'Данияр Fade Studio', 'Мужские стрижки, fade и оформление бороды. Работаю быстро и чисто.', 5, 3500, 'Алматы'],
  ['Маникюр', 'Айгерим Nails', 'Маникюр, педикюр, гель-лак и аккуратный дизайн под любой образ.', 4, 5000, 'Алматы'],
  ['Макияж', 'Мадина Make Up', 'Дневной, вечерний и свадебный макияж с выездом.', 6, 12000, 'Астана'],
  ['Массаж', 'Руслан Massage Pro', 'Классический, спортивный и расслабляющий массаж.', 7, 9000, 'Алматы'],
  ['Репетиторы', 'Алия English Tutor', 'Английский, подготовка к экзаменам и разговорная практика.', 8, 7000, 'Кызылорда'],
  ['Фотографы', 'Ермек Photo', 'Портреты, семейные съемки и репортажи.', 6, 25000, 'Алматы'],
  ['IT и диджитал', 'Арман Dev', 'Сайты, мобильные приложения и автоматизация бизнеса.', 9, 50000, 'Астана'],
  ['Автоуслуги', 'Сергей Auto', 'Диагностика, автоэлектрика и выездной ремонт.', 10, 8000, 'Алматы'],
  ['Дизайн и реклама', 'Жанна Design', 'Логотипы, баннеры, SMM и упаковка бренда.', 5, 20000, 'Алматы'],
  ['Ивенты и праздники', 'Тимур Event', 'Ведущий, сценарии, декор и координация праздников.', 7, 60000, 'Астана'],
  ['Клининг и дом', 'Clean Team KZ', 'Генеральная уборка, окна, мебель и поддерживающий клининг.', 4, 15000, 'Алматы'],
  ['Медицина', 'Нурай Med', 'Медсестра на дом, капельницы и уход после процедур.', 6, 10000, 'Кызылорда'],
  ['Ремонт и стройка', 'Бекзат Master', 'Сантехника, электрика, сборка мебели и мелкий ремонт.', 12, 12000, 'Алматы'],
  ['Салоны красоты', 'Beauty Room', 'Брови, ресницы, уходы и комплексные beauty-услуги.', 5, 7000, 'Алматы'],
  ['Фото и видео', 'Dias Video', 'Reels, монтаж, видеосъемка мероприятий и бизнеса.', 6, 30000, 'Астана'],
  ['Юридические услуги', 'Айбек Legal', 'Консультации, договоры, документы и регистрация бизнеса.', 9, 15000, 'Алматы'],
  ['Трансфер', 'Alakol Transfer', 'Трансфер Ушарал - Алаколь, минивэны и встреча с вокзала.', 5, 20000, 'Ушарал', true, 'akshi'],
  ['Детские услуги', 'Kids Time Alakol', 'Няни, аниматоры и сопровождение детей на отдыхе.', 4, 12000, 'Акши', true, 'akshi'],
  ['Развлечения и аренда', 'Aqua Fun Alakol', 'SUP, катамараны, экскурсии, велосипеды и туры.', 5, 8000, 'Коктума', true, 'koktuma'],
  ['Фото и видео', 'Usharal Content Tour', 'Фото, видео и reels для отдыхающих и зон отдыха Алаколя.', 4, 18000, 'Ушарал', true, 'usharal'],
];

const venues = [
  ['Салоны красоты', 'Aurora Beauty Hall', 'Салон красоты с мастерами по волосам, бровям и уходам.', 'Алматы', 'ул. Абая 10', 16, 0, null, 0],
  ['Барбершопы', 'Nomad Barber Place', 'Барбершоп с мужскими стрижками, бородой и детской зоной.', 'Алматы', 'пр. Достык 88', 8, 0, null, 0],
  ['Кофейни', 'Morning Cup', 'Кофейня с завтраками, десертами и кофе с собой.', 'Астана', 'ул. Кабанбай батыра 5', 40, 0, null, 0],
  ['Фотостудии', 'Lightbox Studio', 'Фотостудия с циклорамой, гримеркой и предметной зоной.', 'Алматы', 'ул. Толе би 44', 20, 0, null, 0],
  ['Зоны отдыха', 'Акши Resort Demo', 'Семейная зона отдыха у берега с питанием, парковкой и Wi-Fi.', 'Акши', 'Побережье Акши, линия 1', 80, 35000, 'akshi', 180],
  ['Пансионаты', 'Коктума Family Demo', 'Пансионат для семейного отдыха: номера, питание и тихий двор.', 'Коктума', 'Коктума, центральная улица', 120, 28000, 'koktuma', 350],
  ['Гостевые дома', 'Usharal Guest House Demo', 'Гостевой дом для короткой остановки и трансфера к озеру.', 'Ушарал', 'Ушарал, район вокзала', 24, 15000, 'usharal', 45000],
  ['Коттеджи', 'Akshi Cottage Demo', 'Отдельные коттеджи для компаний с мангалом и двором.', 'Акши', 'Акши, коттеджный сектор', 36, 60000, 'akshi', 500],
];

const clients = [
  ['demo.client.one@serviceapp.test', 'Аружан Тест', 'Алматы'],
  ['demo.client.two@serviceapp.test', 'Никита Тест', 'Астана'],
  ['demo.client.three@serviceapp.test', 'Салтанат Тест', 'Кызылорда'],
];

const run = async () => {
  const clientIds = [];
  for (const [email, name, city] of clients) {
    const id = await getOrCreateUser(email, name, 'client', city);
    clientIds.push(id);
    await seedProfile(id, {
      full_name: name,
      avatar_url: avatar(name),
      role: 'client',
      city,
      phone: '+7 700 000 00 00',
    });
  }

  for (const [index, spec] of specialists.entries()) {
    const [category, name, bio, experience, price, city, worksInAlakol = false, alakolZone = null] = spec;
    const email = `demo.specialist.${index + 1}@serviceapp.test`;
    const id = await getOrCreateUser(email, name, 'specialist', city, { works_in_alakol: worksInAlakol, alakol_zone: alakolZone });
    const catId = await categoryId('specialist', category);
    await seedProfile(id, {
      full_name: name,
      avatar_url: avatar(name),
      role: 'specialist',
      city,
      phone: '+7 701 000 00 00',
      works_in_alakol: worksInAlakol,
      alakol_zone: alakolZone,
    });
    const { error } = await supabase.from('specialist_profiles').upsert({
      id,
      bio,
      experience_years: experience,
      price_start: price,
      category_id: catId,
    }, { onConflict: 'id' });
    if (error) throw error;
    await seedSubcategoryLinks(id, catId);
    await seedPortfolio(id, [
      image(['1521590832167-7bcbfaa6381f', '1519741497674-611481863552', '1542038784456-1ea8e935640e'][index % 3]),
      image(['1500530855697-b586d89ba3ee', '1507525428034-b723cf961d3e', '1517248135467-4c7edcad34c4'][index % 3]),
    ]);
    await supabase.from('reviews').delete().eq('target_id', id);
    await supabase.from('reviews').insert(clientIds.slice(0, 2).map((clientId, reviewIndex) => ({
      client_id: clientId,
      target_id: id,
      rating: reviewIndex === 0 ? 5 : 4,
      comment: reviewIndex === 0 ? 'Отличный сервис, все прошло вовремя.' : 'Хороший специалист, можно рекомендовать.',
    })));
  }

  for (const [index, venue] of venues.entries()) {
    const [category, name, description, city, address, capacity, priceFrom, zone, distance] = venue;
    const email = `demo.venue.${index + 1}@serviceapp.test`;
    const id = await getOrCreateUser(email, name, 'venue', city);
    const catId = await categoryId('venue', category);
    await seedProfile(id, {
      full_name: name,
      avatar_url: avatar(name),
      role: 'venue',
      city,
      phone: '+7 702 000 00 00',
    });
    const { error } = await supabase.from('venue_profiles').upsert({
      id,
      description,
      address,
      capacity,
      category_id: catId,
      latitude: 46.12 + index / 100,
      longitude: 81.92 + index / 100,
      location_zone: zone,
      price_from: priceFrom,
      distance_to_beach_m: distance || null,
      has_wifi: true,
      has_parking: true,
      has_meals: index >= 4,
      family_friendly: true,
      pet_friendly: index === 7,
      season_open: zone ? '2026-06-01' : null,
      season_close: zone ? '2026-08-31' : null,
    }, { onConflict: 'id' });
    if (error) throw error;
    await seedPortfolio(id, [
      image(['1507525428034-b723cf961d3e', '1500530855697-b586d89ba3ee', '1499793983690-e29da59ef1c2'][index % 3]),
      image(['1522708323590-d24dbb6b0267', '1512917774080-9991f1c4c750', '1566073771259-6a8506099945'][index % 3]),
    ]);
    await supabase.from('reviews').delete().eq('target_id', id);
    await supabase.from('reviews').insert(clientIds.slice(1, 3).map((clientId, reviewIndex) => ({
      client_id: clientId,
      target_id: id,
      rating: reviewIndex === 0 ? 5 : 4,
      comment: zone ? 'Хороший вариант для отдыха на Алаколе.' : 'Удобное место и приятный сервис.',
    })));
  }

  console.log(`Seeded ${specialists.length} specialists, ${venues.length} venues, ${clients.length} clients.`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
