# Optimization pass

Writes stayed **off** (`EXPO_PUBLIC_API_WRITES=off`). No write was sent to the live server.
Everything was checked with mocks and Jest. Nothing here was run on a phone.

This file has two parts:

1. **The audit**: for each point, what the app did before, the risk, and the fix.
2. **The results**: what was done, the numbers before and after, and what is left.

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

---

## Part 2 — The results

Final check: `npx tsc --noEmit` clean, `npx expo lint` clean, `npx jest` → **33 suites, 389 tests, all pass**.
Writes are off. Nothing was run on a phone.

### What was done

| # | Item | Result | Commit |
|---|---|---|---|
| 1 | Home counts today's work, closed runs included | Done | `fb1ca79` |
| 2 | No failure reason on a parcel that is not failed | Done | `90f751b` |
| 3 | Weak network: "Envoi…", timeout message, retry | Done | `e22fd59` |
| 4 | Double taps | Done (same commit as 3: they share one hook) | `e22fd59` |
| 5 | Session expiry: come back to the same screen | Done | `67eee31` |
| 6 | Speed: one request at a time, long lists | Done | `c41ae53` |
| 7 | Polling stops in the background | Done | `77c8d67` |
| 8 | Error boundary on every screen | Done | `96f322c` |
| 9 | GPS only when needed, camera off when hidden | Done | `fdf2820` |
| 10 | Clean-up | Done | `6c7b5e4` |

### Item by item

**1. Home.** The gauge and the three counters take every parcel of today's runs: the runs still open and the
ones the agency closed today. Rate = delivered ÷ (delivered + failed), two decimals. With nothing attempted it is 0.00%.
Files: `lib/todayWork.ts`, `app/(tabs)/home/index.tsx`. Test: `__tests__/today-work.test.ts` (with a COMPLETED run).

**2. Failure reason.** The reason, its note and the raw unknown reason are read only when the item is FAILED.
The card checks it again. Files: `services/real-api.ts`, `lib/failureReasons.ts`, `app/(tabs)/runsheets/index.tsx`.

**3 and 4. Writes.** One hook, `lib/useWrite.ts`, over a small lock, `lib/writeGuard.ts`.
- The lock is taken before anything is awaited. A second tap gets nothing and sends nothing.
- While it is held the button is blocked and reads "Envoi…".
- A request with no answer after 20 s now reads "Connexion lente — réessayez." It used to read "Connexion impossible".
- A network or timeout failure shows a toast with a "Réessayer" button. After a timeout the screen also reloads,
  because the server may have received the request.
- Every write goes through it: deliver, fail, put back to pending, finish a pickup, finish all pickups, take a
  transfer, confirm returns, confirm / start / refuse a run, "tout lire".
- Three of those had no guard before: confirming or refusing a run, and "tout lire".

Test: `__tests__/write-guard.test.ts`.

**5. Session expiry.** Login opens on top of the screen the driver was on. The same driver signing in again is
brought back to it, with what he had typed still there, and the lists reload. A different driver clears
everything and goes to Home. The driver is asked once, however many requests fail underneath.
Files: `lib/resume.ts`, `lib/session.ts`, `components/SessionExpiryWatcher.tsx`, `app/(auth)/login.tsx`.
Test: `__tests__/session-resume.test.ts`.

**6. Speed.**
- A read asked again while the same read is on its way joins it (`request()` in `services/real-api.ts`).
  A write empties that list, so a read after a write is never an old answer.
- Passive refreshes (timer, focus, pull, return to foreground) join a fetch already running. Refreshes after a
  write still restart it (`lib/query.tsx`).
- Coming back to the foreground reloads only what is on screen.
- A pickup's parcels are drawn 30 at a time, with "Afficher les N autres colis".
- History was already a virtualized list. The Current tab and the scheduled pickups stay non-virtualized on
  purpose: they are one day's work and need drag-to-reorder.
- React Compiler is on in this project, so the derived lists on History are already memoized. No manual change.

**7. Polling.** The 60 s timer is cleared when the app leaves the foreground and restarted on return, only if the
list is still in view. It already stopped when the Current tab was not showing. Test: `__tests__/auto-refresh.test.ts`.

**8. Crash safety.** Every route file exports the same boundary (`components/ScreenErrorBoundary.tsx`): a short
message, "Réessayer", and "Retour à l'accueil". The error is saved by `lib/errorLog.ts` (last 20: when, which
route, name, message, top of the stack). A test fails if a new route forgets the export.
Test: `__tests__/crash-safety.test.ts`.

**9. Battery.**
- GPS: Home and the parcel screen no longer take a reading when they open. They show the last one. The GPS is
  switched on by two things only: sorting nearest-first, and the note on a failed delivery. It was already
  foreground-only, one reading at a time, kept for a minute. There is no background location and no watch.
- Camera: mounted only while the scanner is the focused screen and the app is open.
- The iOS location text no longer says "track your route".

Test: `__tests__/battery.test.ts`.

**10. Clean-up. Removed:**
- `app/job/[id]/photo-proof.tsx` (no screen linked to it) and `confirmDeliveryWithPhoto` (real and mock).
- `lib/push.ts` and `registerPushToken` (never imported).
- `confirmDeliveryWithOTP` (real and mock) and the mock's OTP table.
- `getTransfer` (real and mock): the detail screen reads the list.
- The `proofPhotoUri` field.
- Packages: `expo-image-picker`, `expo-notifications`, and their entries in `app.json`.
- 24 French and 24 English texts: all of `otp.*` and `photoProof.*`, and 14 old pickup texts
  (`selectLabel`, `doneWithCount`, `doneHint`, `doneAll…`, `doneSelectedNote…`, `doneConfirm…`).

The mock's delivery rules are still tested, on the one delivery route that is left (`confirmDelivery`).

**Mock-only paths in real mode.** I checked `services/api.ts`: in real mode no write can reach the mock.
Five phone-only settings still come from the mock file in both modes (`getNearestFirst`, `setNearestFirst`,
`setPickupOrder`, `setTransferOrder`, `setReturnOrder`). They only read and write the phone's own storage,
so I left them.

### The numbers

Measured on this Windows machine, not on a phone. See "What I could not measure".

| What | Before | After |
|---|---|---|
| Requests when the timer, a tab focus and a pull-to-refresh fire together, per list (pickups, transfers, returns, alerts) | 3 | **1** |
| Requests to load the whole Tournées tab (runs, parcels, history, numbers) | 2 | 2 (already shared) |
| Timer wake-ups per hour in the background, per open list | 60 | **0** |
| GPS readings when opening Home or a parcel screen | 1 each time (at most one a minute) | **0** |
| Writes sent by two taps in the same instant | up to 2 | **1** |
| iOS JavaScript bundle (`npx expo export --platform ios`, Hermes bytecode) | 5,499,991 bytes | **5,474,058 bytes** (−25,933) |
| Native packages | 2 unused (`expo-image-picker`, `expo-notifications`) | removed |
| Build History for 2,000 rows from the server's answer (fetch + map) | 72 ms | 58–67 ms over three runs: **no real change** |
| History card lines, attempts and keys for 2,000 rows | 5 ms | 5–9 ms: **no real change** |
| Screen texts | 531 keys | 507 keys |

The first, second and History rows come from `__tests__/performance.test.ts`, run before and after the changes.
The timer, GPS and double-tap rows are counts read from the code and proved by the tests named above.

The bundle is smaller even though this pass added code (the write hook, the error boundary, the session
expiry flow), because of what was removed.

The History figures show there was nothing to win there: 2,000 rows cost well under a tenth of a second to
prepare, and the list was already virtualized. I changed nothing in it.

### What I could not measure

- **App start time on a phone.** The app runs in Expo Go on an iPhone, and I have no device here. Expo Go's own
  start time also hides the app's. The bundle size above is the closest thing I can measure from this machine:
  a smaller bundle is less to load at start. To get a real number: time from tapping the project in Expo Go to
  Home being usable, before and after, on the same phone.
- **History scrolling on a phone** (frames per second). The timings above are the data work only, not drawing.
- **Battery use.** The table gives counts (wake-ups, GPS readings), not milliamp-hours.

### Left for later

- **A real offline queue.** A write with no network still fails with a retry button. It is not kept and sent
  later. That needs a decision on what the agency should see for an action taken offline.
- **The Current tab is not virtualized.** Fine for one day's work. If a run ever holds several hundred parcels,
  it will need a virtualized list that still supports drag-to-reorder.
- **A way to read the error log.** Errors are saved on the phone, but no screen shows them yet. A hidden row in
  Profil, or a "send to support" button, would make them useful.
- **Replaying a write after a session expiry.** A write that fails with a 401 is not sent again after signing
  in. The driver is back on his screen and taps the button again.

### To check on the phone

- Turn the network off, tap an action: "Connexion impossible — réessayez." with "Réessayer".
- On a slow network: the button reads "Envoi…" and cannot be tapped twice.
- Leave the app open past the token's 24 hours (or ask Jihed to revoke the token): the login screen opens over
  the current screen, and signing in brings you back to it.
- Home after the agency closes the run: the counters keep today's numbers.
- The scanner: open another screen over it, or send the app to the background; the camera goes off.
- Home with location refused: the place name falls back to the run's zone, and no permission prompt appears
  just for opening Home.
