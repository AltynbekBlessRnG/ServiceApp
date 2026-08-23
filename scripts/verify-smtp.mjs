#!/usr/bin/env node
// Проверяет SMTP-доступ, который Supabase Auth использует для писем подтверждения.
// Пароль читается из переменной окружения и никуда, кроме самого SMTP-сервера,
// не отправляется.
//
//   SMTP_PASS='пароль-приложения' node scripts/verify-smtp.mjs
//   SMTP_PASS='...' node scripts/verify-smtp.mjs получатель@example.com

import { Buffer } from 'node:buffer';
import tls from 'node:tls';

const host = process.env.SMTP_HOST ?? 'smtp.mail.ru';
const port = Number(process.env.SMTP_PORT ?? 465);
const user = process.env.SMTP_USER ?? 'taptym@internet.ru';
const pass = process.env.SMTP_PASS;
const recipient = process.argv[2];

if (!pass) {
  console.error('\n✗ Не задан SMTP_PASS (пароль приложения Mail.ru).\n');
  process.exit(1);
}

const socket = tls.connect({ host, port, servername: host });
socket.setEncoding('utf8');
socket.setTimeout(20000);

let buffer = '';
const waiters = [];

socket.on('data', (chunk) => {
  buffer += chunk;
  // Ответ SMTP закончен, когда у последней строки после кода стоит пробел.
  const lines = buffer.split('\r\n').filter(Boolean);
  const last = lines[lines.length - 1];
  if (!last || !/^\d{3} /.test(last)) return;
  const response = buffer;
  buffer = '';
  waiters.shift()?.(response);
});

socket.on('timeout', () => {
  console.error(`\n✗ ${host}:${port} не ответил за 20 секунд. Порт закрыт или блокируется провайдером.\n`);
  process.exit(1);
});
socket.on('error', (error) => {
  console.error(`\n✗ Не удалось подключиться к ${host}:${port} — ${error.message}\n`);
  process.exit(1);
});

const read = () => new Promise((resolve) => waiters.push(resolve));
const send = (line) => {
  socket.write(`${line}\r\n`);
  return read();
};

function expect(response, code, context) {
  if (response.startsWith(String(code))) return;
  console.error(`\n✗ ${context}\n  Ответ сервера: ${response.trim()}\n`);
  if (/535|authentication|auth/i.test(response)) {
    console.error('  Это отказ авторизации. Скорее всего пароль приложения отозван или введён неверно.');
    console.error('  Создайте новый: Mail.ru → Настройки → Безопасность → Пароли для внешних приложений,');
    console.error('  затем сохраните его в Supabase → Project Settings → Authentication → SMTP Settings.\n');
  }
  process.exit(1);
}

const greeting = await read();
expect(greeting, 220, `${host} не поприветствовал соединение.`);
console.log(`✓ Соединение с ${host}:${port} установлено.`);

expect(await send('EHLO taptym.local'), 250, 'Сервер отклонил EHLO.');

expect(await send('AUTH LOGIN'), 334, 'Сервер не принял команду AUTH LOGIN.');
expect(await send(Buffer.from(user).toString('base64')), 334, 'Сервер отклонил имя пользователя.');
expect(await send(Buffer.from(pass).toString('base64')), 235, `Авторизация для ${user} не прошла.`);
console.log(`✓ Авторизация ${user} прошла успешно — пароль приложения действителен.`);

if (recipient) {
  expect(await send(`MAIL FROM:<${user}>`), 250, 'Сервер отклонил отправителя.');
  expect(await send(`RCPT TO:<${recipient}>`), 250, `Сервер отклонил получателя ${recipient}.`);
  expect(await send('DATA'), 354, 'Сервер не принял команду DATA.');
  const message = [
    `From: Taptym <${user}>`,
    `To: <${recipient}>`,
    'Subject: Taptym SMTP check',
    'Content-Type: text/plain; charset=utf-8',
    '',
    'Если вы видите это письмо, SMTP для Supabase Auth работает.',
    '.',
  ].join('\r\n');
  expect(await send(message), 250, 'Сервер не принял письмо.');
  console.log(`✓ Тестовое письмо отправлено на ${recipient}. Проверьте входящие и «Спам».`);
}

await send('QUIT');
socket.end();
console.log('\nSMTP в порядке. Если Supabase всё равно пишет «Error sending confirmation email»,');
console.log('значит в Supabase сохранён другой (старый) пароль — пересохраните этот же.\n');
