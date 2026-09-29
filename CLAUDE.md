@AGENTS.md

# Jibex driver app

An iOS driver app for a Tunisian delivery company, built for an internship.
It ports their Android driver app. Expo SDK 57 + TypeScript + Expo Router,
React Compiler on. All screens are done, in English and French.

The developer works on **Windows with no Mac** and tests on an iPhone through
**Expo Go**. So: no native builds, no `/ios` folder, nothing that needs Xcode.

## How to talk to the user

Explain things simply, in short sentences.

## Rules

- **Never write to the live server without the user's explicit go-ahead.**
  `EXPO_PUBLIC_API_WRITES` stays off. Probes and explorations are read-only.
- **Never put credentials in code, commits, or output.** They live only in
  `.env.local` (gitignored). Don't print its values.
- **All user-facing text goes through i18n** (`lib/i18n/en.ts` and `fr.ts`).
  Add every new key to both files.
- **After each task: commit, push `main`, then update the `backup` branch**
  to match and push it too:
  `git push origin main && git branch -f backup main && git push origin backup`
- Before writing Expo code, check the SDK 57 docs (see AGENTS.md).

## The two switches (`.env.local`)

- `EXPO_PUBLIC_API_MODE` = `mock` (fake data, default) or `real` (https://jibex.cloud).
- `EXPO_PUBLIC_API_WRITES` = `off` (default, also when missing) or `on`.
  When off, every real write answers "Not connected to the server yet"
  and sends nothing.
- After changing either one, restart with `npx expo start --clear`.
- Other keys (never `EXPO_PUBLIC_`, so they stay out of the app):
  `JIBEX_TEST_*` (driver, used by the probes), `JIBEX_AGENCY_*`, `JIBEX_SENDER_*`.

## How the data layer works

- Screens import only from `services/api.ts`. It picks mock or real per function.
- `services/mock-api.ts` and `services/real-api.ts` share function names and
  result shapes. Phone-only settings and the push token always come from the mock side.
- Real mode reads: login, runsheets (active + history), pickups, transfers,
  returns, notifications.
- Real writes are built in `real-api.ts`, each guarded by `API_WRITES`.
  Photo and OTP delivery are always refused (the server has no field for them).
- Phone-only state (`lib/deviceStore.ts`, AsyncStorage): call log, drag order,
  nearest-first toggle, hidden / unread alerts, failure GPS, recent searches.
- Call-before-delivery: a parcel can be marked delivered only after the
  driver pressed Call at least once (`hasCalled`).
- Search is local only (`lib/parcelSearch.ts`). The backend asked us never
  to call the tracking endpoint from the app.
- Cash = the parcel's `price` (backend confirmed). Falls back to `amountToCollect`.
- "Nearest first" = phone GPS + the 24 governorates table (`lib/governorates.ts`, `lib/route.ts`).

## Known server problems

- Sends drivers private data they shouldn't get.
- No parcel coordinates → we place parcels by governorate.
- `pickupCity` is always empty → we find the city in the address text.
- `weight` is always 1 → we hide it when it's 1 or missing.

## Folders

- `app/` — screens (Expo Router). `(auth)/login`, `(tabs)/` home, runsheets,
  alerts, profile; `job/[id]/` stop screen and delivery flows; pickups,
  transfers, returns, search, scanner, help-center.
- `components/` — shared UI. `*.ios.tsx` files are the native iOS versions.
- `lib/` — logic and hooks. `lib/i18n/` holds the EN/FR text.
- `services/` — `api.ts` (the switch), `mock-api.ts`, `real-api.ts`.
- `constants/` — `backend.ts` (the switches), colours, spacing, type, motion.
- `types/` — shared types. `__tests__/` — Jest tests.
- `scripts/` — read-only probes of the live server.
- `docs/client-notes.txt` — the client's feature requests.
- `SynapseDriverApp/` — gitignored reference clone of the backend and Android app. Read only.

## Commands

- `npx expo start --clear` — run the app (scan the QR code with Expo Go).
- `npm test` — Jest tests (`__tests__/*.test.ts`).
- `npm run lint` — ESLint (only covers `app/` and `components/`).
- `npx tsc --noEmit` — type check.
- `npm run probe:login | probe:runsheets | probe:driver-data | probe:history`
  — read-only checks against the live server with the `JIBEX_TEST_*` account.
  They mask personal data and never print the token.
