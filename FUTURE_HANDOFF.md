# Taptym — полная передача проекта перед переустановкой Linux

> Дата фиксации состояния: **21 августа 2026**, часовой пояс Asia/Almaty.
> Этот файл написан для владельца проекта и следующего сеанса Codex. Ссылки на облачные сборки и состояние сервисов со временем могут измениться.

## Обновление на 24 августа 2026 — передача Claude Code

Последнее исправление hCaptcha находится в `main` в коммите:

```text
e140bc9 fix: tolerate hCaptcha loading timeout (#11)
```

Последняя собранная preview APK:

```text
Build ID: eb43979e-45ab-4789-b070-8dfb9cfd8de5
Status: FINISHED
Commit used for build: f065659 (то же дерево файлов, что e140bc9)
APK: https://expo.dev/artifacts/eas/ddq1wPQhMQJZAPZ3dvD7Rhbusd32tD-acVr1KlMZ9vA.apk
Build page: https://expo.dev/accounts/xenodochial/projects/service-app/builds/eb43979e-45ab-4789-b070-8dfb9cfd8de5
Expiration date: 6 сентября 2026
```

### Точная нерешённая причина hCaptcha

Ошибка была воспроизведена на физическом Mi 9T Pro, подключённом через ADB. Runtime log:

```text
Supabase sign-up failed
code: captcha_failed
message: captcha protection: request disallowed (invalid-input-response)
status: 400
```

Это доказывает следующее:

- React Native hCaptcha выдаёт клиенту токен;
- приложение отправляет токен в `supabase.auth.signUp`;
- Supabase получает запрос, но hCaptcha siteverify отклоняет response token;
- наиболее вероятна неправильная пара публичного Site Key и серверного Secret Key либо неверно сохранённый Secret Key в Supabase Dashboard.

Встроенный в приложение публичный Site Key:

```text
ec744f86-bef8-4238-8e9e-cc6a39a280d0
```

Следующему разработчику нельзя снова угадывать причину по UI. Нужно:

1. В hCaptcha Dashboard открыть сайт Taptym и сверить его Site Key со значением выше.
2. В hCaptcha Settings получить актуальный Secret Key (не Site Key).
3. В Supabase Dashboard открыть Authentication → Bot and Abuse Protection.
4. Выбрать hCaptcha и сохранить актуальный Secret Key.
5. Secret Key не добавлять в Git, Expo env или мобильное приложение.
6. Повторить регистрацию под ADB/logcat.
7. Если Site Key отличается, обновить `EXPO_PUBLIC_HCAPTCHA_SITE_KEY` во всех EAS environments и только тогда собрать новую APK.

Исправление `loading timeout` из коммита `e140bc9` корректно и должно остаться: SDK продолжает загрузку после этого служебного события. Однако оно не устраняет серверный `invalid-input-response`.

### Нерешённые UX-дефекты регистрации

- После нажатия «Зарегистрироваться» экран затемняется на несколько секунд без текста. Нужен явный progress state: сначала «Проверяем защиту…», затем «Создаём аккаунт…», а при долгой проверке — возможность отменить/повторить.
- Внизу экрана регистрации на Android видна слишком большая белая системная полоса. Проверить настройку `expo-navigation-bar`, цвет navigation bar, edge-to-edge и safe-area padding на физическом устройстве.
- Модальное окно выбора города появляется слишком резко и имеет микролаг. Вероятные причины: стандартный transparent `Modal` с `animationType="slide"`, одновременный mount большого списка и отсутствие предварительного рендера. Нужна плавная анимация backdrop/sheet и заранее подготовленный список; проверить на физическом устройстве.
- Onboarding из трёх страниц сейчас показывается при каждом запуске без активной сессии. Нужно хранить локальный флаг прохождения и показывать onboarding только при первом запуске.
- Роль уже хранится в Supabase profile и повторно спрашиваться после успешного выбора не должна.

### Предпочтение владельца по Git

Владелец попросил больше не создавать Pull Request для текущих исправлений: после проверок отправлять изменения напрямую в `main`. Перед push обязательно выполнять `npm run check` и не использовать force push.

## 0. Самое важное перед переустановкой

На момент создания этого файла в репозитории имеются **незакоммиченные рабочие изменения**. Среди них — исправления регистрации, шестизначного email-кода, переменных окружения Android-сборки и SMTP. Они существуют только на текущем диске и пропадут при форматировании.

Текущая ветка:

```text
agent/fix-android-bottom-bar
```

Текущий базовый коммит:

```text
970f486 fix Android registration flow (#8)
```

Изменены следующие файлы:

```text
app/(auth)/register.tsx
app/(auth)/verify-email.tsx
eas.json
eslint.config.js
lib/auth-validation.ts
lib/env.ts
supabase/config.toml
supabase/templates/confirmation.html
tests/run-tests.ts
```

Перед переустановкой обязательно:

1. Закоммитить эти изменения.
2. Отправить ветку на GitHub (`git push`).
3. Убедиться на github.com, что новый коммит действительно появился.
4. Отдельно сохранить секреты из раздела «Секреты и доступы» в менеджере паролей. Их нельзя добавлять в Git.

Репозиторий:

```text
https://github.com/AltynbekBlessRnG/ServiceApp.git
```

## 1. Что такое Taptym

Taptym — мобильный маркетплейс услуг на Expo/React Native. В нём клиенты находят исполнителей и заведения, просматривают портфолио, создают бронирования, общаются и оставляют отзывы.

Пользовательские роли:

- `client` — клиент;
- `specialist` — самостоятельный специалист;
- `venue` — салон/заведение;
- администратор не выбирает роль в приложении: доступ назначается сервером через отдельную приватную таблицу.

Основные возможности, уже представленные в коде:

- регистрация, вход, подтверждение email, восстановление пароля;
- выбор роли и заполнение профиля;
- каталог категорий и услуг;
- поиск, в том числе AI-поиск;
- профили специалистов и заведений;
- портфолио, реакции и избранное;
- бронирования и управление статусами;
- сообщения и диалоги;
- отзывы, уведомления, жалобы и блокировки;
- модерация исполнителей и административный интерфейс;
- загрузка аватаров и материалов портфолио;
- удаление аккаунта и юридические страницы.

Проекты `ruflo` и `public-apis/public-apis` обсуждались, но **не интегрировались** в Taptym. Восстанавливать для них ничего не нужно.

## 2. Технологии и архитектура

Клиент:

- Expo SDK 54;
- React Native 0.81.5;
- React 19.1;
- TypeScript;
- Expo Router;
- TanStack Query;
- React Native Elements и собственные компоненты;
- Expo Notifications;
- hCaptcha;
- Sentry SDK (полная облачная настройка пока не завершена).

Backend:

- Supabase Auth;
- PostgreSQL;
- Row Level Security (RLS);
- Supabase Storage;
- Supabase Edge Functions;
- push-уведомления через Expo и серверный webhook.

Edge Functions:

- `analyze-search` — AI-анализ поиска через Gemini;
- `delete-account` — безопасное удаление аккаунта;
- `dispatch-push` — отправка push-уведомлений.

Минимальные версии среды:

```text
Node.js >= 20.19.4
npm >= 10
```

Версия Node также закреплена в `.nvmrc`.

## 3. Облачные проекты и идентификаторы

### GitHub

```text
Аккаунт: AltynbekBlessRnG
Репозиторий: AltynbekBlessRnG/ServiceApp
Remote: https://github.com/AltynbekBlessRnG/ServiceApp.git
```

Последние объединённые изменения включают:

- PR #9 — оптимистичная загрузка медиа;
- PR #8 — исправления Android-регистрации;
- PR #7 — обратная связь при загрузке медиа;
- PR #6 — надёжность бронирований, портфолио и восстановления;
- PR #5 — корректная навигация назад внутри роли;
- PR #4 — ключ hCaptcha;
- PR #3 — защищённая регистрация и модерация исполнителей;
- PR #2 — каталог услуг;
- PR #1 — юридические страницы.

### Expo / EAS

```text
Expo account/owner: xenodochial
Email аккаунта: temirhan_a@bk.ru
Название приложения: Taptym
Slug: service-app
EAS project ID: a236030d-2aad-439a-8fc9-e8124961bc27
Android package: com.adiya.serviceapp
iOS bundle ID: com.adiya.serviceapp
Версия приложения: 1.0.0
```

Профили EAS:

- `development` — APK с dev client, требует Metro;
- `preview` — самостоятельный внутренний APK, Metro не нужен;
- `production` — Android App Bundle (`.aab`) для магазина.

`appVersionSource` установлен в `remote`, production использует `autoIncrement`.

### Supabase

```text
Project name: Taptym
Project ref: lcxgymivzfbwftfnavao
Project URL: https://lcxgymivzfbwftfnavao.supabase.co
Organization ID/slug: ijjxewgryuyyxpqvsndq
```

Это текущий рабочий проект. Старый адрес с ref `gwgliwyulajjcmngojql` больше использовать нельзя: именно он вызывал `Network request failed` в одной из APK.

## 4. Текущее подтверждённое состояние

Последний результат ручной проверки: пользователь смог зарегистрироваться в Android-приложении и написал **«Получилось, наконец то»**. Значит, связка APK → текущий Supabase → Auth → email OTP работала end-to-end.

Перед этим все тестовые пользователи однажды были удалены по прямой просьбе владельца; тогда было проверено, что `auth.users` и связанные профили пусты. После успешной регистрации пользователь снова появился, поэтому актуальное количество пользователей нужно смотреть в Supabase Dashboard, а не считать нулём.

Последние локальные проверки после исправлений:

```text
npm run typecheck  — успешно
npm run lint       — успешно
npm test           — успешно, 21 тест
npm run export     — ранее успешно для Android/iOS/Web
```

## 5. Что было исправлено в регистрации

### Шестизначный код

Изначально код подтверждения был восьмизначным и неудобным. Теперь ожидается **6 цифр**:

- `lib/auth-validation.ts` содержит `EMAIL_OTP_LENGTH = 6`;
- экран `verify-email.tsx` принимает числовой шестизначный OTP;
- подтверждение выполняется через `supabase.auth.verifyOtp({ email, token, type: 'signup' })`;
- реализована повторная отправка с hCaptcha и таймером;
- email-шаблон выводит `{{ .Token }}`, а не только ссылку-кнопку;
- конфигурация Supabase задаёт длину OTP `6`;
- добавлен регрессионный тест.

### Android и переменные окружения

Standalone APK сначала падала, потому что `lib/env.ts` обращался к переменным динамически:

```ts
process.env[name]
```

Expo встраивает `EXPO_PUBLIC_*` только при статическом обращении. Код исправлен на прямые обращения вида:

```ts
process.env.EXPO_PUBLIC_SUPABASE_URL
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
```

Вторая причина `Network request failed`: EAS `preview` содержал URL удалённого/старого Supabase-проекта. EAS environment был обновлён на текущий проект `lcxgymivzfbwftfnavao`, после чего создана рабочая APK.

### UX регистрации

Также в незакоммиченных изменениях:

- отключены автокоррекция и автокапитализация пароля;
- ошибка Supabase signup выводится в диагностический лог;
- улучшены уведомления и состояния повторной отправки кода.

## 6. Email, SMTP, hCaptcha и Brevo

### Текущая рабочая схема SMTP

Supabase Auth настроен на Mail.ru SMTP:

```text
Host: smtp.mail.ru
Port: 465
User/sender: taptym@internet.ru
Sender name: Taptym
```

Пароль — отдельный пароль приложения Mail.ru. Он **не должен** находиться в репозитории. В конфигурации он передаётся через:

```text
SUPABASE_AUTH_EMAIL_SMTP_PASS
```

Пользователь создавал этот пароль и копировал его. Перед переустановкой нужно сохранить его в менеджер паролей либо после переустановки создать новый.

Настройки Auth, которые применялись:

- длина email OTP: 6 цифр;
- лимит отправки email: 30 в час на уровне проекта;
- шаблон подтверждения содержит сам OTP;
- hCaptcha включена для Auth.

Приложение использует публичный site key hCaptcha. В `lib/captcha.ts` имеется fallback site key. Secret key hCaptcha должен оставаться только на серверной стороне/Supabase.

### Почему не используется Brevo

Brevo был подключён и SMTP-тест отправлялся, но сервер получателя вернул soft bounce:

```text
550 5.7.1 ... not accepted due to domain (internet.ru) owner DMARC policy
```

Отправитель Brevo был подтверждён, однако домен `internet.ru` не позволял корректно отправлять через чужую инфраструктуру из-за DMARC. Поэтому Supabase Auth перевели на родной SMTP Mail.ru. Возвращаться к Brevo без собственного домена и правильно настроенных SPF/DKIM/DMARC не следует.

## 7. Android-сборки и известные результаты

Последняя рабочая `preview`-сборка:

```text
Build ID: ea7139bd-c315-465f-b851-89aa7632e2b0
Status: FINISHED
Dashboard: https://expo.dev/accounts/xenodochial/projects/service-app/builds/ea7139bd-c315-465f-b851-89aa7632e2b0
APK: https://expo.dev/artifacts/eas/1OWOR7XlTcQ153JNaI8BIHYHEvverWejFCaHZkAXvlM.apk
```

Ссылка на APK временная и была указана как действующая до **30 августа 2026**. После этого нужно создать новую сборку.

Не использовать старые сборки:

- build `24c0...` — содержит старый Supabase URL и даёт `Network request failed`;
- build `7ed70...` — не содержал нужные Expo env и падал при запуске;
- build `20406...` — сборка завершилась ошибкой загрузки sourcemap в Sentry.

В `eas.json` для всех профилей сейчас добавлено:

```text
SENTRY_DISABLE_AUTO_UPLOAD=true
```

Это позволяет собирать приложение без настроенного Sentry upload token. Сам мониторинг Sentry не считается полностью настроенным.

## 8. Почему dev build показывал ошибку загрузки проекта

Экран `Unable to load script` / `There was a problem loading the project` был не крашем production-приложения, а поведением **development build**: ему требуется запущенный Metro bundler.

Для dev build:

```bash
npm run dev:lan
```

Телефон и компьютер должны быть в одной сети. При USB можно использовать ADB reverse:

```bash
adb reverse tcp:8081 tcp:8081
```

Для обычной проверки пользователем лучше устанавливать `preview` APK — она содержит JS bundle и не зависит от Metro.

Во время диагностики использовался переносной ADB в `/tmp/android-tools`. Каталог `/tmp` после перезагрузки/переустановки исчезнет; это нормально, ADB нужно установить заново.

## 9. База данных

Источник истины — миграции в `supabase/migrations`. Отдельный `schema.sql` поддерживать не нужно. Детерминированный каталог услуг находится в `supabase/seed.sql`, тесты БД — в `supabase/tests/database.test.sql`.

Основные public-таблицы:

```text
profiles
service_categories
services
specialist_profiles
venue_profiles
provider_services
portfolio_items
portfolio_likes
bookings
provider_blocks
reviews
favorites
conversations
conversation_members
messages
notifications
blocks
reports
audit_logs
provider_verifications
```

Приватные таблицы:

```text
private.profile_private
private.admin_users
private.device_tokens
private.ai_usage
private.venue_locations
```

Ключевые enum-типы:

```text
account_role: client, specialist, venue
provider_type
booking_kind
booking_status
conversation_kind
report_status
provider_verification_status
```

Миграции доходят как минимум до:

```text
20260808164308_restrict_portfolio_likes_read.sql
```

Важные правила безопасности для будущих изменений:

- никогда не помещать `service_role`/secret key в мобильное приложение;
- на всех таблицах exposed schema должна быть включена RLS;
- `TO authenticated` без проверки владельца строки не является авторизацией;
- UPDATE-политике нужны и `USING`, и `WITH CHECK`;
- не использовать изменяемый пользователем `user_metadata` для прав доступа;
- осторожно относиться к `SECURITY DEFINER`, особенно в `public`;
- Storage upsert требует разрешений INSERT, SELECT и UPDATE;
- после изменений БД запускать SQL-тесты и advisors.

## 10. Переменные окружения и секреты

Шаблон публичных переменных находится в `.env.example`:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_SENTRY_DSN
EXPO_PUBLIC_APP_ENV
EXPO_PUBLIC_LEGAL_BASE_URL
EXPO_PUBLIC_HCAPTCHA_SITE_KEY
```

Серверные/build secrets:

```text
GEMINI_API_KEY
GEMINI_MODEL
PUSH_WEBHOOK_SECRET
SUPABASE_AUTH_EMAIL_SMTP_PASS
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
```

Нельзя сохранять в Git:

- `.env` с реальными значениями;
- Supabase service-role/secret key;
- SMTP app password;
- Gemini API key;
- webhook secret;
- Sentry auth token;
- GitHub/Expo/Supabase access tokens;
- `google-service-account.json` для Google Play.

Публичный anon/publishable key предназначен для клиента, но его всё равно удобнее восстанавливать из Supabase Dashboard/EAS Environment, а не копировать в этот документ.

Перед форматированием сохранить в менеджер паролей:

1. Доступ к GitHub `AltynbekBlessRnG`.
2. Доступ к Expo `xenodochial`.
3. Доступ к Supabase-организации.
4. Пароль приложения SMTP для `taptym@internet.ru` или возможность создать новый.
5. Реальные значения локального `.env`.
6. Gemini key и push webhook secret, если они уже созданы.
7. Google Play service account JSON, если он уже создавался.

## 11. Восстановление после переустановки Linux

### Шаг 1. Установить базовые инструменты

Нужны Git, curl, Node.js 20.19.4+, npm 10+, Android platform tools и Docker для локального Supabase. Удобнее установить Node через `nvm`, затем выполнить:

```bash
nvm install 20.19.4
nvm use 20.19.4
```

### Шаг 2. Клонировать проект

```bash
git clone https://github.com/AltynbekBlessRnG/ServiceApp.git
cd ServiceApp
npm ci
```

Если текущие изменения были отправлены не в `main`, переключиться на сохранённую ветку:

```bash
git fetch origin
git switch agent/fix-android-bottom-bar
```

### Шаг 3. Войти в сервисы

```bash
gh auth login
npx eas-cli login
npx supabase login
```

Проверки:

```bash
gh auth status
npx eas-cli whoami
npx supabase --version
```

### Шаг 4. Восстановить локальный env

```bash
cp .env.example .env
```

Заполнить `.env` реальными значениями текущего проекта. Минимально для приложения:

```text
EXPO_PUBLIC_SUPABASE_URL=https://lcxgymivzfbwftfnavao.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<взять в Supabase Dashboard>
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_HCAPTCHA_SITE_KEY=<публичный site key>
```

Не коммитить `.env`.

### Шаг 5. Связать Supabase

```bash
npx supabase link --project-ref lcxgymivzfbwftfnavao
```

Для локальной БД запустить Docker, затем:

```bash
npx supabase start
npx supabase db reset
npm run test:db
npm run types:generate
```

При повторном применении SMTP-конфигурации сначала безопасно передать пароль приложения через переменную окружения; не вписывать пароль в `config.toml` и не печатать его в логах.

### Шаг 6. Проверить проект

```bash
npm run check
npm run export
```

Для разработки:

```bash
npm run dev:lan
```

Для самостоятельной тестовой APK:

```bash
npm run preview:android
```

### Шаг 7. Проверить EAS Environment

До новой сборки убедиться, что профиль использует текущий Supabase URL и ключ. `preview` уже исправлялся, но `development` и `production` необходимо отдельно проверить: EAS environments независимы и могут содержать старые или отсутствующие значения.

Никогда не считать локальный `.env` автоматически доступным облачной EAS-сборке.

## 12. Обычные команды

```bash
# Проверка TypeScript, ESLint и unit/regression tests
npm run check

# Отдельные проверки
npm run typecheck
npm run lint
npm test

# Экспорт Android/iOS/Web
npm run export

# Expo через tunnel
npm run dev

# Expo по локальной сети
npm run dev:lan

# Android dev client build
npm run devbuild:android

# Автономная preview APK
npm run preview:android

# Локальная БД
npx supabase start
npx supabase db reset
npm run test:db
npm run types:generate
```

## 13. Юридические страницы

В каталоге `legal/` находятся HTML-шаблоны. Перед публикацией нужно заменить все `{{...}}` на утверждённые юридические данные Казахстана.

Ожидаемые публичные файлы:

```text
privacy.html
terms.html
support.html
```

Их следует разместить в публичном bucket `legal` каждого окружения либо на окончательно выбранном публичном хостинге. Нельзя публиковать незаполненные шаблоны и dev URL в метаданных магазинов.

## 14. Что осталось сделать

### Критично до переустановки

- [ ] Просмотреть текущий diff.
- [ ] Закоммитить девять изменённых файлов вместе с этим handoff.
- [ ] Отправить ветку на GitHub и визуально проверить коммит на сайте.
- [ ] Сохранить все доступы и секреты вне компьютера.

### Критично после восстановления

- [ ] Проверить, что текущий Supabase ref — `lcxgymivzfbwftfnavao`.
- [ ] Восстановить `.env`, не добавляя его в Git.
- [ ] Проверить EAS env для `development`, `preview` и `production` по отдельности.
- [ ] Собрать свежую preview APK, потому что старая ссылка истекает.
- [ ] Повторить полный сценарий: регистрация → письмо → 6-значный код → сессия → выход → вход.
- [ ] Проверить повторную отправку кода и восстановление пароля.
- [ ] Проверить доставку не только на `internet.ru`, но и на Gmail/Mail.ru/другой реальный адрес; посмотреть spam и SMTP logs.

### Перед выпуском

- [ ] Решить вопрос с собственным почтовым доменом и настроить SPF, DKIM, DMARC для стабильной доставляемости.
- [ ] Либо полноценно настроить Sentry (DSN и build secrets), либо осознанно оставить upload отключённым.
- [ ] Проверить push credentials и развернуть/проверить `dispatch-push`.
- [ ] Проверить секреты и работу `analyze-search` и `delete-account`.
- [ ] Запустить database tests и Supabase security/performance advisors.
- [ ] Провести E2E-проверку ролей client/specialist/venue, бронирований, чатов, загрузки медиа и модерации.
- [ ] Заполнить юридические документы реальными реквизитами.
- [ ] Подготовить Google Play listing, privacy/data safety, service account и production `.aab`.
- [ ] Проверить remote version code перед публикацией.
- [ ] Провести аудит iOS-сборки, если планируется App Store.

## 15. Известные ловушки

1. **Незакоммиченные файлы исчезнут при переустановке.** GitHub сейчас содержит базовый коммит, но не все последние исправления.
2. **EAS env и локальный `.env` — разные вещи.** Рабочее локально приложение может сломаться в APK.
3. **Expo требует статические обращения к `process.env.EXPO_PUBLIC_*`.** Не возвращать динамический `process.env[name]`.
4. **Development build требует Metro.** Для обычного телефона использовать preview APK.
5. **Tunnel может быть медленным или нестабильным.** Для USB/одной Wi-Fi сети использовать LAN и при необходимости `adb reverse`.
6. **Старый Supabase ref не работает.** Не использовать `gwgliwyulajjcmngojql`.
7. **Brevo + адрес `@internet.ru` конфликтует с DMARC.** Рабочий путь сейчас — Mail.ru SMTP.
8. **Ссылки EAS на артефакты истекают.** Сборка в аккаунте остаётся видимой, но APK следует пересобрать.
9. **Sentry upload ломал EAS build.** Пока установлен `SENTRY_DISABLE_AUTO_UPLOAD=true`.
10. **Удаление Auth user не мгновенно отзывает уже выданный JWT во всех сценариях.** Для строгой безопасности учитывать активные сессии.

## 16. Инструкция следующему Codex

Начать не с переписывания приложения, а с проверки сохранённого состояния:

```bash
git status --short --branch
git log --oneline --decorate -12
git diff --check
npm ci
npm run check
```

Затем прочитать:

```text
FUTURE_HANDOFF.md
README.md
.env.example
eas.json
supabase/config.toml
supabase/migrations/
```

Правила продолжения:

- не затирать пользовательские/незакоммиченные изменения;
- не выводить секреты в чат и терминальные логи;
- не добавлять service-role key в Expo-приложение;
- перед облачной сборкой проверять EAS env именно выбранного профиля;
- перед изменением Supabase сверять linked project ref;
- все изменения БД оформлять миграциями и проверять RLS;
- после исправления регистрации обязательно тестировать полный путь на физическом Android-устройстве.

Первый рекомендуемый запрос будущему Codex:

> Прочитай `FUTURE_HANDOFF.md`, проверь Git и облачные окружения, ничего не перезаписывай. Сначала подтверди, что последние исправления регистрации сохранены в GitHub, затем восстанови зависимости и выполни `npm run check`.

## 17. Критерий готовности проекта к продолжению

Восстановление можно считать успешным, когда одновременно выполнено следующее:

- репозиторий клонируется с последними исправлениями;
- `npm ci` и `npm run check` проходят;
- локальный `.env` указывает на правильный Supabase;
- EAS `preview` содержит правильные env;
- свежая preview APK устанавливается и не требует Metro;
- регистрация отправляет письмо;
- пользователь вводит шестизначный код и получает сессию;
- вход, выход, повторная отправка кода и восстановление пароля работают;
- секреты находятся в менеджере паролей, а не в Git.
