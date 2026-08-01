# Taptym

Expo/React Native marketplace for clients, specialists, and venues. Administrative access is a server-issued capability, not a selectable user role.

## Requirements

- Node.js 20.19.4+
- npm 10+
- Docker Desktop for the local Supabase stack
- Supabase CLI (installed as a dev dependency)

## Local setup

```bash
npm ci
copy .env.example .env
npx supabase start
npx supabase db reset
npm run dev
```

The database source of truth is the squashed migration in `supabase/migrations`; deterministic catalog data lives in `supabase/seed.sql`. Do not maintain a separate `schema.sql`.

Public mobile configuration:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_SENTRY_DSN=
```

`GEMINI_API_KEY`, `GEMINI_MODEL`, Supabase service-role keys, webhook secrets, SMTP credentials, and Sentry upload credentials are server/build secrets and must never use the `EXPO_PUBLIC_` prefix.

## Quality gates

```bash
npm run typecheck
npm run lint
npm test
npx supabase db reset
npm run test:db
npm run export
```

Generate the TypeScript database contract after resetting the local database:

```bash
npm run types:generate
```

## Environments

- EAS `development` → development Supabase
- EAS `preview` → staging Supabase
- EAS `production` → production Supabase

Each environment must use separate credentials. Edge Functions are in `supabase/functions`; their secrets are configured per Supabase project.

Build commands use `npx eas`, so EAS CLI is not pinned inside the application dependency tree.
