# ServiceApp

Cross-platform Expo app for a service marketplace with three roles: client, specialist, and venue.  
The current MVP target is the `client + specialist` flow on top of Supabase.

## What Works In This Repo

- Expo Router based mobile app structure
- Supabase auth and profile routing
- Specialist profile editing, schedule, portfolio, bookings, and chats
- Client category browsing, AI-assisted search with fallback, specialist details, bookings, favorites, and chats
- New Supabase schema contract in [`schema.sql`](./schema.sql)

## Environment

Copy [`.env.example`](./.env.example) to `.env` and fill in:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_API_KEY=your_gemini_api_key
```

`EXPO_PUBLIC_API_KEY` is optional for the app to boot. If it is missing, AI search falls back to normal text search.

## Recommended Toolchain

- Node.js `20.19.4+` recommended by the current React Native / Metro stack
- npm `10+`

The app can install on slightly older Node 20 builds, but you may see engine warnings.

## Setup

```bash
npm install
```

Apply the database schema to a fresh Supabase project:

```sql
-- run the contents of schema.sql in the Supabase SQL editor
```

Then start the app:

```bash
npm run start
```

## Daily Development

For normal development with hot reload, use:

```bash
npm run dev
```

Useful variants:

```bash
npm run dev:lan
npm run dev:android
npm run dev:ios
npm run dev:web
```

This keeps the regular Expo development flow, but you no longer need to type `npx expo start` manually.

## Development Build

This project is now configured for a real Expo development client with `expo-dev-client`.

Build a development client for Android:

```bash
npm run devbuild:android
```

Other options:

```bash
npm run devbuild:ios
npm run devbuild:all
```

After the development build is installed on your phone or emulator:

```bash
npm run dev
```

Then open the installed development build app instead of Expo Go.

## Preview Build Without Metro

If you want an installable app build that opens without a running Expo dev server, use the preview profile:

```bash
npm run preview:android
npm run preview:ios
```

What this gives you:

- `preview:android` builds an internal Android APK through EAS
- `preview:ios` builds an internal iOS preview build through EAS
- preview builds do not depend on `expo start` or Metro

You can also build both platforms in one go:

```bash
npm run preview:all
```

If EAS asks for authentication on this machine, log in once:

```bash
npx eas login
```

## Verification

```bash
npm test
npm run lint
node .\node_modules\typescript\bin\tsc --noEmit
```

## Notes

- The MVP schema assumes a fresh Supabase project.
- `venue` and `admin` remain in the codebase, but the most stable path is currently `client + specialist`.
- Push notifications are optional for MVP. In-app notifications are the required baseline.
