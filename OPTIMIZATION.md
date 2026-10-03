# Optimization pass

Writes stayed **off** (`EXPO_PUBLIC_API_WRITES=off`). No write was sent to the live server.
Everything was checked with mocks and Jest. Nothing here was run on a phone.

This file has two parts:

1. **The audit**: for each point, what the app did before, the risk, and the fix.
2. **The results**: what was done, the numbers before and after, and what is left. (Filled in at the end.)

---

## Part 1 — The audit

### 3. Weak network

**Today**
- Every request has a 20 s limit (`API_TIMEOUT_MS` in `constants/backend.ts`, used by `request()` in `services/real-api.ts`).
- A request that times out and a request with no network give the **same** error, "Connexion impossible — réessayez."
- A failed write shows a toast. The driver has to find the button and tap it again. There is no retry button.
- While a write runs, most buttons show a spinner with no words (`components/PrimaryButton.tsx`).
- Nothing is shown as done before the server answers: every screen waits for the result, then reloads. That part is already right.
- Screens with a write: `app/job/[id]/index.tsx`, `app/job/[id]/cant-deliver.tsx`, `components/StatusUpdateSheet.tsx`,
  `app/pickups.tsx`, `app/transfers.tsx`, `app/returns.tsx`, `lib/useRunsheetConfirm.ts`, `app/(tabs)/alerts/index.tsx`.

**Risk**
- On a slow connection the driver sees "no connection" and may think nothing was sent, when the server may have received it.
- A spinner with no words does not say what is happening.

**Fix**
- Tell a timeout apart from "no network": "Connexion lente — réessayez."
- After a timeout, reload the data, so the screen shows what the server really has.
- One shared hook for every write (`lib/useWrite.ts`): the button shows "Envoi…", stays blocked until the server answers,
  and a network or timeout failure shows a toast with a **"Réessayer"** button.

### 4. Double taps

**Today**
- Each screen guards itself with a React state (`submitting`, `finishingId`, `confirmingId`…) checked at the top of the handler.
- `lib/useRunsheetConfirm.ts` (confirm / start / refuse a run) has **no guard at all** after its dialog.
- `app/returns.tsx` disables its button but has no check in the handler.
- `app/(tabs)/alerts/index.tsx` has no guard on "tout lire".

**Risk**
- A React state only changes on the next render. Two taps in the same instant both pass the check and send the write twice.
- The unguarded ones can send twice on any quick double tap.

**Fix**
- The shared hook keeps its lock in a **ref**, set before anything is awaited. A second tap returns at once and sends nothing.
- Every write goes through it.

### 5. Session expiry

**Today**
- A 401 on any signed-in request clears the session (`request()` → `expireSession()` in `lib/session.ts`).
- `components/SessionExpiryWatcher.tsx` then clears the cache and does `router.replace('/(auth)/login')`.
- After login, `app/(auth)/login.tsx` always goes to Home.

**Risk**
- The driver loses the screen he was on and anything he had typed (a failure note, a picked reason, ticked parcels).
- He lands on Home and has to find the parcel again.

**Fix**
- On a 401, open the login screen **on top of** the current screen instead of replacing it. The screen underneath stays mounted with its state.
- After a successful login, close the login screen: the driver is back where he was. The lists reload with the new token.
- If a different driver signs in, the cache is cleared and the app goes to Home (the old screen belongs to someone else).

### 6. Speed

**Today**
- History is already a virtualized list (`FlatList` in `app/(tabs)/runsheets/index.tsx`). So is the "Ramassés" list in `app/pickups.tsx`.
- The Current tab and the scheduled pickups use `DraggableList` inside a `ScrollView` (not virtualized). That is needed for drag-to-reorder, and these lists are one day's work.
- A pickup's parcels are only drawn when the card is opened, but then all at once, with no limit.
- History recomputes its attempt numbers and row keys on every render.
- Refresh: three things can ask for a reload at the same moment — the 60 s timer, the tab getting focus, and pull-to-refresh. Each one calls `invalidateQueries`, and by default React Query **cancels the request already running and starts a new one**.
- The data layer already shares one request per 3 s for runs (`loadDriverData`) and one per 60 s for closed runs (`loadPastRunsheets`). Pickups, transfers, returns and notifications have no such sharing.

**Risk**
- Duplicate requests on a weak network, each one restarting the wait.
- A long History re-doing its sums on every refresh tick.

**Fix**
- One request at a time per resource: a reload that arrives while one is running **joins it** instead of restarting it (`lib/query.tsx`).
- Memoize History's derived lists; cap how many of a pickup's parcels are drawn at once.
- Measure before and after (see Part 2).

### 7. Polling cost

**Today**
- The 60 s timer lives in `lib/autoRefresh.ts` and `lib/useAutoRefresh.ts`.
- It starts when the screen gets focus and stops when it loses it. On the Current tab it only runs while "En cours" is showing.
- In the background the tick is skipped, but the **timer itself keeps firing** every minute.
- Coming back to the foreground reloads **every** query at once (`lib/query.tsx`), including screens that are not open.

**Risk**
- A timer waking the app every minute for nothing.
- A burst of requests on every return to the foreground.

**Fix**
- Stop the timer when the app goes to the background and restart it on return.
- On return to the foreground, reload only what is on screen (active queries); the rest reloads when its screen is opened.

### 8. Crash safety

**Today**
- No route exports an error boundary. Expo Router's default one shows a red developer screen in development; in a release build an error in a screen can leave a blank screen.
- Errors are not kept anywhere.

**Risk**
- One bad value from the server (a missing field) takes the whole screen down, with no way back except closing the app.

**Fix**
- One shared boundary (`components/ScreenErrorBoundary.tsx`), exported by every screen: a short message and a "Réessayer" button.
- The error is saved on the phone (`lib/errorLog.ts`, last 20, no personal data).

### 9. Memory and battery

**Today**
- GPS is foreground-only (`requestForegroundPermissionsAsync` in `lib/useLiveCoords.ts`). There is no background location and no continuous watch: each use is one reading, kept for 60 s.
- But a reading is taken **every time Home or a parcel screen opens** (`useLiveCoords()` in `app/(tabs)/home/index.tsx` and `app/job/[id]/index.tsx`), for the place name and the distance.
- The scanner's camera (`app/scanner.tsx`) is a full-screen modal: it is unmounted when closed. But while the scanner is open and the app goes to the background, or another screen covers it, the camera view stays active.
- `app.json` tells iOS the location is used "to track your route while on shift". The app does not do that.

**Risk**
- GPS readings the driver never asked for, all day.
- A camera left running behind another screen.
- A permission text that promises tracking.

**Fix**
- GPS only for **nearest-first** and the **failure note**. Home and the parcel screen use the last reading if there is one, and never start one.
- The camera is active only while the scanner is the focused screen and the app is in the foreground.
- Correct the permission text.

### 10. Clean-up

**Today — found unused**
- `app/job/[id]/photo-proof.tsx`: no screen links to it, and on the real server it is always refused. With it: `confirmDeliveryWithPhoto` and the package `expo-image-picker`.
- `lib/push.ts` and `registerPushToken`: nothing imports them. With them: the package `expo-notifications`.
- `confirmDeliveryWithOTP`: no screen calls it.
- `getTransfer` (one transfer by id): no screen calls it; the detail screen reads the list.
- French and English texts no screen uses (old pickup "done" texts, old transfer texts, photo and OTP texts).

**Risk**
- Dead code that still has to be read, typed and tested. Two native packages loaded for nothing. Permission prompts for features that do not exist.

**Fix**
- Remove them. The list of what was removed is in Part 2.
