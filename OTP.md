# Delivery code (OTP) — what the app needs from the server

For Jihed. The driver app now asks for the customer's code before some deliveries.
There is no server API for it yet, so the app uses a **mock** that makes the code up on the phone.
This file says what the real API should look like so the mock can be replaced.

## When a code is required

```
itemValue = price − deliveryFee        (a missing deliveryFee counts as 0)
OTP required when itemValue == 0
```

| price | deliveryFee | itemValue | OTP? | The driver collects |
|---|---|---|---|---|
| 0 | 0 | 0 | Yes | Nothing ("Rien à encaisser") |
| 10 | 10 | 0 | Yes | 10.000 TND, the delivery fee |
| 950 | 10 | 940 | No | 950.000 TND, as before |
| 10 | null | 10 | No | 10.000 TND, as before |

The rule is in one function: `otpRequired()` in `lib/otpRule.ts`.

**Please confirm this rule is also checked on the server.** Today the app checks it on the phone only.
The server should refuse `PUT /api/runsheets/items/{itemId}/status` with `DELIVERED` for such a parcel
unless its code was verified.

## What the app does today

1. The driver taps "Livré" on such a parcel. The app opens the code screen and calls `sendOtp`.
2. The screen says "Code envoyé au client". The driver types the 6 digits.
3. "Livré" becomes available only after `verifyOtp` says the code is right.
4. "Renvoyer le code" is available 60 s after the last code, at most 3 times.
5. After 5 wrong codes the code is blocked. Only a new code unblocks.
6. With the 3 resends used and no success, the screen says "Impossible de valider — marquez un échec"
   and offers the failure screen. There is no way to deliver without a correct code.
7. The call-before-delivery rule still applies.

## TODO — the API contract the app expects

Everything is keyed by the **runsheet item id** (`itemId`), the same id the status update uses.
All calls carry the driver's bearer token.

### 1. Send the code

```
POST /api/runsheets/items/{itemId}/otp/send
(no body)
```

Sends a 6-digit code to the recipient's phone by SMS. Valid 10 minutes.
If a valid code already exists for this item, answer with it and do **not** send another one
(the driver may close and reopen the screen).

Answer `200`:

```json
{
  "sentAt": "2026-10-03T17:04:00",
  "expiresAt": "2026-10-03T17:14:00",
  "resendAvailableAt": "2026-10-03T17:05:00",
  "resendsLeft": 3,
  "attemptsLeft": 5,
  "verified": false
}
```

The answer must **never** contain the code.

### 2. Verify the code

```
POST /api/runsheets/items/{itemId}/otp/verify
{ "code": "482913" }
```

Answer `200` when the code is right: the same object as above, with `"verified": true`.

Answer `400` when it is not, with the same object plus an error code:

```json
{ "error": "OTP_INCORRECT", "attemptsLeft": 3, "resendsLeft": 2, "verified": false, "...": "..." }
```

### 3. Resend the code

```
POST /api/runsheets/items/{itemId}/otp/resend
(no body)
```

Sends a **new** code. The old one stops working. The wrong-code count goes back to 5.
Answer `200`: the same object, with `resendsLeft` one lower.

### Error codes

| Code | HTTP | Meaning | What the app shows |
|---|---|---|---|
| `OTP_INCORRECT` | 400 | Wrong code, tries left | "Code incorrect. Demandez au client de le confirmer et réessayez." |
| `OTP_BLOCKED` | 400 | 5 wrong codes | "Code bloqué — renvoyez un nouveau code" |
| `OTP_EXPIRED` | 400 | More than 10 minutes old | "Code expiré — renvoyez un nouveau code" |
| `OTP_RESEND_TOO_SOON` | 429 | Less than 60 s since the last code | "Attendez avant de renvoyer un code." |
| `OTP_NO_RESENDS_LEFT` | 400 | The 3 resends are used | "Plus de renvoi possible." |
| `OTP_NOT_SENT` | 404 | No code was sent for this item | "Aucun code n'a été envoyé pour ce colis." |
| (none) | 403 | The item is not this driver's | generic error |

### The limits (same as the mock)

| Rule | Value | In the app |
|---|---|---|
| Code length | 6 digits | `OTP_LENGTH` |
| Valid for | 10 minutes | `OTP_TTL_MS` |
| Wait before a resend | 60 s | `OTP_RESEND_WAIT_MS` |
| Resends | 3 | `OTP_MAX_RESENDS` |
| Wrong codes before blocking | 5 | `OTP_MAX_WRONG` |

All five are in `lib/otpSession.ts`. If the server uses other values, tell us: the app shows what the
server answers (`resendsLeft`, `attemptsLeft`, the two times), so only the texts may need a change.

## How to connect it

**One file: `services/otp.ts`.** It has `mockOtpService` (used in mock mode) and `realOtpService`
(used in real mode). Today `realOtpService` answers "not connected" to everything.
Replace its three functions with the three calls above. The screen, the rules and their tests do not change.

## Two things to know before turning writes on

1. **In real mode, a parcel that needs a code cannot be delivered today.** The real service cannot send a code,
   so nothing can be verified, and the app refuses the delivery ("Le code ne peut pas encore être envoyé…").
   The driver can only record a failure. This is on purpose (no delivery without a correct code), but it means
   the OTP API must exist before writes are switched on for real drivers, or the rule must be switched off.
2. **The "MODE TEST" banner** shows the code on the screen. It exists only in mock mode, so the flow can be
   tested with no SMS. In real mode it cannot appear: the real service never returns a code, and the screen
   also checks the mode.
