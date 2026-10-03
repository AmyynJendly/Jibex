# Jibex driver app (iOS)

The iOS driver app for Jibex, a Tunisian delivery company. It ports the Android driver app.
Expo SDK 57, TypeScript, Expo Router. It runs in **Expo Go** on an iPhone; there is no native build.

## Run it

```
npm install
npx expo start --clear
```

Scan the QR code with Expo Go.

| Command | What it does |
|---|---|
| `npx expo start --clear` | Runs the app |
| `npm test` | Jest tests |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |

## The three switches

They live in `.env.local` (not in git). After changing one, restart with `npx expo start --clear`.

| Switch | Values | Default | What it does |
|---|---|---|---|
| `EXPO_PUBLIC_API_MODE` | `mock`, `real` | `mock` | `mock` uses built-in fake data. `real` reads https://jibex.cloud. |
| `EXPO_PUBLIC_API_WRITES` | `off`, `on` | `off` | When `off`, nothing is sent that would change the server. Every action answers "not connected yet". |
| `EXPO_PUBLIC_OTP` | `off`, `mock`, `real` | `mock` on mock data, `off` on the real server | The delivery code (OTP). See below. |

### `EXPO_PUBLIC_OTP`

Some parcels have nothing of value to collect (price − delivery fee = 0). For those, the app can ask for a
code the customer received before the parcel is marked delivered.

| Value | Behaviour |
|---|---|
| `off` | The rule is disabled. These parcels are delivered like any other. The call-before-delivery rule still applies. |
| `mock` | The code is made up on the phone and shown in a "MODE TEST" banner, so the flow can be tried with no SMS. Works on mock data only. |
| `real` | The real OTP API. Use it once the API exists (see `OTP.md`). Until then no code can be sent, and these parcels cannot be delivered. |

- With nothing set, the real server uses `off`. **A real delivery is never blocked because the OTP API is missing.**
- `mock` on the real server is read as `off`: a code invented by the phone proves nothing about a real parcel.

## Where things are

| Folder | What |
|---|---|
| `app/` | Screens (Expo Router) |
| `components/` | Shared UI |
| `lib/` | Logic and hooks. `lib/i18n/` holds the French and English texts |
| `services/` | `api.ts` picks the mock or the real server; `otp.ts` is the OTP service |
| `constants/` | The switches, colours, spacing |
| `__tests__/` | Jest tests |

## More

- `CLAUDE.md` — how the project works, and its rules.
- `FIXES.md` — what was fixed after the live tests.
- `PARITY.md` — comparison with the Android app.
- `OPTIMIZATION.md` — the optimization pass.
- `OTP.md` — the delivery code, and the API the app expects.
