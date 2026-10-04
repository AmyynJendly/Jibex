# Jibex Driver (iOS)

The iOS app for Jibex delivery drivers. It is a port of the Android driver app.

A driver uses it to accept the day's run, deliver parcels and record failed deliveries, collect cash,
do pickups, transfers and returns, scan parcels, and read alerts from the agency.
The app is in French and English.

## Stack

- Expo SDK 57, React Native 0.86, React 19 (React Compiler on)
- TypeScript
- Expo Router (file-based navigation)
- TanStack Query (data loading and caching)
- i18next (French and English)
- Jest (tests), ESLint and Prettier

The app runs in **Expo Go** on an iPhone. There is no native build and no `ios/` folder.

## Install and run

You need Node.js 20.19 or newer, and the Expo Go app on an iPhone.

```
npm install
cp .env.example .env.local
npx expo start
```

Then scan the QR code with the iPhone camera. On Windows, copy the file with `copy .env.example .env.local`.

With the default `.env.local`, the app runs on built-in sample data and needs no server.
In that mode, sign in with `amine.jendli` / `password123`.

| Command | What it does |
|---|---|
| `npx expo start` | Runs the app. Add `--clear` after changing `.env.local`. |
| `npm test` | Runs the tests |
| `npm run lint` | Runs ESLint on the whole project |
| `npm run typecheck` | Runs the TypeScript check |
| `npm run format` | Formats the code with Prettier |

## The three switches

They are set in `.env.local`, which is not in git. `.env.example` lists every variable.
After changing one, restart with `npx expo start --clear`.

| Variable | Values | Default | What it does |
|---|---|---|---|
| `EXPO_PUBLIC_API_MODE` | `mock`, `real` | `mock` | `mock` uses built-in sample data. `real` uses the live server (https://jibex.cloud). |
| `EXPO_PUBLIC_API_WRITES` | `off`, `on` | `off` | In real mode, whether the app may change data on the server. |
| `EXPO_PUBLIC_OTP` | `off`, `mock`, `real` | `mock` on mock data, `off` on the real server | The delivery code (OTP). |

### Mock or real data

In `real` mode the app signs in to the live server and reads the driver's own data.
A session from one mode does not open the other: switching signs the driver out.

### API writes

With writes `off`, real mode is read-only. Every action that would change server data
(confirm a run, delivered, failed, pickups, transfers, returns) sends nothing and says
"not connected to the server yet". Set it to `on` only when the app may really change data.

### OTP (delivery code)

Some parcels have nothing of value to collect: price − delivery fee = 0.
For those, the app can ask for a code the customer received, before the parcel is marked delivered.

| Value | Behaviour |
|---|---|
| `off` | The rule is disabled. These parcels are delivered like any other. |
| `mock` | The code is made up on the phone and shown in a "MODE TEST" banner. Mock data only. |
| `real` | Uses the real OTP API. That API does not exist yet: see [docs/OTP.md](docs/OTP.md). |

The server has no OTP API yet, so on the real server the default is `off`: no real delivery is blocked.
Do not set `real` before the API exists, or these parcels cannot be delivered.
On the real server, `mock` is read as `off`.

## Folder structure

| Folder | What it holds |
|---|---|
| `app/` | The screens (Expo Router): login, the four tabs, the parcel screens, pickups, transfers, returns, search, scanner |
| `components/` | Shared UI. `*.ios.tsx` files are the native iOS versions. |
| `lib/` | Logic and hooks. `lib/i18n/` holds the French and English texts. |
| `services/` | The data layer. `api.ts` picks `mock-api.ts` or `real-api.ts`. `otp.ts` is the OTP service. |
| `constants/` | The switches (`backend.ts`), colours, spacing, typography, motion |
| `types/` | Shared TypeScript types |
| `__tests__/` | Jest tests |
| `scripts/` | Read-only checks of the live server (`npm run probe:*`) |
| `docs/` | The project documents |
| `assets/` | The app icon and splash image |

Screens import only from `services/api.ts`. The mock and the real API share the same function names and
result shapes, so a screen never knows which one answers.

## Documents

All in [docs/](docs/):

| Document | What it is |
|---|---|
| [FIXES.md](docs/FIXES.md) | What was fixed after the live tests |
| [PARITY.md](docs/PARITY.md) | Comparison with the Android app |
| [OPTIMIZATION.md](docs/OPTIMIZATION.md) | The optimization pass: network, battery, crash safety |
| [OTP.md](docs/OTP.md) | The delivery code, and the API the app expects from the server |
| [test-runs/](docs/test-runs/) | Reports of the five live test rounds |
| [web-app-findings.md](docs/web-app-findings.md), [web-app-tour.md](docs/web-app-tour.md), [web-app-exploration.md](docs/web-app-exploration.md) | What the agency and sender web app showed |
| [client-notes.txt](docs/client-notes.txt) | The client's feature requests |
