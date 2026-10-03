# Fixes after the live tests

These fixes come from the four live test reports (`test-run/` to `test-run-4/`).

- Writes stayed **off** (`EXPO_PUBLIC_API_WRITES=off`) the whole time.
- No write was sent to the live server. Everything was tested with mock data and Jest.
- One commit per fix.
- A follow-up round changed fixes 4 and 10. See "Follow-up" below.
- A parity pass against the Android app came next. See "Parity pass" below and `PARITY.md`.
- Final check: `npx tsc --noEmit` clean, `npx expo lint` clean, `npx jest` → **36 suites, 449 tests, all pass** (after the optimization pass and the OTP work; see `OPTIMIZATION.md` and "OTP delivery confirmation" below).
- Not tested on a phone yet. See "What to check on the phone" at the end.

---

## Step 0 — What the Android app does

Read-only check in `SynapseDriverApp/`. Nothing was changed there.

**(a) Pickup.** Android only calls **start** and **complete**.
Its API has four calls: list the pickups, list a pickup's parcels, `PUT …/start`, `PUT …/complete`.
The screen has two buttons: "Confirmer Pickup" (start) and "Terminer Pickup" (complete).
Parcels are listed read-only. No scan. No call per parcel.

**(b) Failure reasons.** Android **hides both** `REFUSED` and `NOT_INTERESTED_2ND_ATTEMPT`.
In `Runsheet.kt` both are marked `selectable = false`.
The comment says the business merged them with `CANCELLED_BY_CLIENT` on 13/08/2026. They are kept only for old records.

**(c) Transfers.** Android does **not** scan before confirm-pickup.
The screen lists the parcels read-only. One button, "Confirmer le chargement", opens a dialog, then sends
`POST api/transfers/{id}/confirm-pickup`. No scan and no QR code.

**Result:** Android does nothing more than our app. So there was no reason to stop before fixes 4 and 14.
(b) contradicted fix 10 as first built. The follow-up put the app back in line with Android.

---

## The fixes

| # | Fix | Commit |
|---|-----|--------|
| 1 | Auto-refresh | `f37968b` |
| 2 | Attempt number | `4520bce` |
| 3 | Exchange | `19889cd` |
| 4 | Pickup check | `0a9f079`, then `541e3a3` |
| 5 | History keys | `b0be9af` |
| 6 | Prices | `57bdff7`, `97ccbb9` |
| 7 | Failure proof note in French | `9a9a9fb` |
| 8 | Status mapping | `772cd44` |
| 9 | Run closed by the agency | `bb9035f` |
| 10 | Failure reasons | `9a2b351`, then `845edec`, `2b1ba80` |
| 11 | Network errors | `17b0747` |
| 12 | Runsheet confirmation | `1f78c2b` |
| 13 | Scanner counts once | `9b09ada` |
| 14 | Transfer pickup check | `5997315` |
| 15 | Transfer end state, QR removed | `6833643` |

### 1. Auto-refresh

The lists reload when the app opens, when it comes back to the foreground, when the Current tab gets focus,
and every 60 s while the Current tab is visible. Pull-to-refresh is kept, on Current and on History.
Pickups and Transfers reload the same way. A reload never happens in the middle of a drag.

- Files: `lib/autoRefresh.ts`, `lib/useAutoRefresh.ts`, `lib/usePullToRefresh.ts`, `app/(tabs)/runsheets/index.tsx`, `app/pickups.tsx`, `app/transfers.tsx`
- Test: `__tests__/auto-refresh.test.ts` (timer, pause in background, stop on blur)

### 2. Attempt number

"Tentative N/3", from `deliveryAttempts` (N = failed attempts + 1).
On the delivery screen it always shows. From N = 3, a warning "Dernière tentative".

- Files: `lib/attempts.ts`, `types/job.ts`, `services/real-api.ts`, `services/mock-api.ts`, `app/(tabs)/runsheets/index.tsx`, `app/job/[id]/index.tsx`, i18n
- Test: `__tests__/attempts.test.ts`

### 3. Exchange

When `exchange == true`: an "ÉCHANGE" badge on the card.
On the delivery screen: "Récupérer l'article à retourner à l'expéditeur" and a checkbox "J'ai récupéré l'article".
"Livré" is blocked until the box is ticked. Local only, nothing is sent.

- Files: `lib/deliveryGate.ts`, `components/ExchangeCheck.tsx`, `components/StatusUpdateSheet.tsx`, `app/job/[id]/index.tsx`, `types/job.ts`, both APIs, i18n
- Test: `__tests__/exchange.test.ts`

### 4. Pickup check

Each pickup lists its parcels. The driver scans or ticks each one. The card shows "N/M colis".
"Terminer le pickup" is enabled only at M/M. Same API calls as before (start, complete).
"Tout cocher" ticks a whole pickup.

Follow-up: a **"Terminer tous les pickups"** button is back at the bottom of the scheduled list,
as the client notes asked. It always asks first: "Terminer N pickups (M colis) ?" with Confirmer / Annuler.

- Files: `lib/checklist.ts`, `lib/useChecklist.ts`, `lib/pickupBatch.ts`, `app/pickups.tsx`, `app/scanner.tsx`, i18n
- Test: `__tests__/checklist.test.ts`, `__tests__/pickup-batch.test.ts`

### 5. History keys

Rows are keyed `${runsheetId}-${parcelId}`. A parcel on several runs (one per failed attempt) no longer breaks the list.
No row is dropped: a true repeat gets `#2`.

- Files: `lib/rowKey.ts`, `app/(tabs)/runsheets/index.tsx`
- Test: `__tests__/history-keys.test.ts`

### 6. Prices

"10.000 TND": three decimals, a dot. One shared formatter.
Percentages have two decimals ("65.38%"). See "Number format" at the end of the parity pass.

- Files: `lib/currency.ts`
- Test: `__tests__/currency.test.ts`, `__tests__/recent-searches.test.ts`

### 7. Failure proof note in French

The note the agency reads is always French, whatever the app language:
"Client appelé une fois (14:32). Position : …" or "Client non appelé. …".

- Files: `lib/failureProof.ts`, `services/real-api.ts`, i18n
- Test: `__tests__/data-we-have.test.ts`, `__tests__/real-api-writes.test.ts`

### 8. Status mapping

All 28 parcel statuses are mapped. `A_VERIFIER` → "À vérifier (SAV)", `AU_DEPOT_RELAIS` → "Au dépôt relais",
`EN_TRANSIT_AGENCE` → "En transit (transfert)". `DELAYED` and `IN_WAREHOUSE` count as in transit.

- Files: `lib/parcelStatus.ts`, `services/real-api.ts`, `app/(tabs)/runsheets/index.tsx`, i18n
- Test: `__tests__/parcel-status.test.ts` (the full list)

### 9. Run closed by the agency

When the agency closes a run, the server stops listing it as active. The app only said "nothing left to deliver".
Now the Current tab shows the run with "Clôturée par l'agence" and the line "Tournée clôturée par l'agence".
The closed run is read from the same GET that History already uses. No new request.
With no run at all, the tab says "Aucune tournée pour le moment".

- Files: `lib/runsheetDay.ts`, `components/RunsheetDayCard.tsx`, `services/real-api.ts` (`getClosedRunsheetsToday`), `services/mock-api.ts`, `services/api.ts`, `lib/query.tsx`, `types/runsheet.ts`, `app/(tabs)/runsheets/index.tsx`, i18n
- Test: `__tests__/runsheet-day.test.ts` (closed today is found, an older one is not, only GETs are sent, a server failure gives nothing instead of an error)

### 10. Failure reasons

The labels are the web's exact French ones (`test-run/failure-reasons.md`).

Follow-up, now like Android:

- "Colis refusé" and "Client non intéressé" are **hidden** from the list. The business merged them into
  "Annulé par client" on 13/08/2026. They keep their labels for parcels already recorded with them.
- "Annulé par client" is offered, in the full list and in the quick one. The driver picks from 19 reasons.
- The hint "Ce motif ouvre un dossier SAV" is **removed completely** (text, flag and code).

- Files: `lib/failureReasons.ts`, `app/job/[id]/cant-deliver.tsx`, `components/StatusUpdateSheet.tsx`, i18n
- Test: `__tests__/failure-reasons.test.ts`

### 11. Network errors

A lost connection no longer crashes. The screen shows "Connexion impossible" with a retry button.
Actions show "Connexion impossible — réessayez." Calling a customer still works offline.

- Files: `lib/errors.ts`, `lib/writeResult.ts`, `lib/useLoadedJob.ts`, `lib/stopActions.ts`, job screens, scanner, i18n
- Test: `__tests__/network-errors.test.ts`

### 12. Runsheet confirmation

The driver confirms the **run**, not parcels.

- Header: "Tournée du jour", code, date, "N colis", and the status in plain words:
  En attente de votre confirmation / En cours / Terminée / Clôturée par l'agence.
- New run: "Nouvelle tournée à confirmer", then
  "En confirmant, vous acceptez cette tournée et vous en devenez responsable." Button "Confirmer la tournée".
  The parcels show below, greyed and read-only, with no action.
- Parcel added after the start: "La tournée a été modifiée : 1 colis ajouté (12 → 13)".
  The new parcel is marked "NOUVEAU", is not greyed, and is listed first. Button "Confirmer la tournée modifiée".
- Several open runs: one card each, today's first.
- Home uses the same words.

Same server calls as before.

- Files: `lib/runsheetDay.ts`, `lib/useRunsheetConfirm.ts`, `components/RunsheetDayCard.tsx`, `app/(tabs)/runsheets/index.tsx`, `app/(tabs)/home/index.tsx`, `types/runsheet.ts`, both APIs, i18n
- Test: `__tests__/runsheet-day.test.ts` (the six stages, the "12 → 13" sentence, the new parcel on real and mock data, today's run first)

### 13. Scanner

Each code counts once per session. A repeat shows "Déjà scanné", with no vibration.
The camera is locked until the code leaves the frame or 2 s pass. This applies to every screen that scans.

- Files: `lib/scanSession.ts`, `app/scanner.tsx`, i18n
- Test: `__tests__/scan-session.test.ts`

### 14. Transfer pickup check

"Scan to confirm" is gone. The transfer card lists its parcels and counts the scans ("4/5 colis").
An unknown code shows "Ce colis n'est pas dans ce transfert".
"Confirmer la prise en charge" is enabled only when all are scanned.
A small "Confirmer sans scan" link stays for a damaged label, behind a confirmation.
Same API call as before (confirm-pickup).

- Files: `components/TransferPickupCheck.tsx`, `app/transfers.tsx`, `types/transfer.ts`, both APIs, i18n
- Test: `__tests__/transfer-check.test.ts`

### 15. Transfer end state, and the QR code

After confirmation the card says:
"En route vers <agence> — votre partie est terminée. Le transfert sera clôturé quand l'agence <agence> scannera les colis."
There is no button any more.

**"Show QR" was removed.** I checked the code first. The QR had no real use:

- Only our own scanner could read it (`JIBEX-TRANSFER:` prefix).
- On the real server, scanning it changed nothing. It was only a lookup.
- The web receives a transfer by scanning the parcel labels, not a QR.
- The Android app has no QR.

The library `react-native-qrcode-svg` was removed with it.

- Files: `lib/transferState.ts`, `app/transfers.tsx`, `app/scanner.tsx`, `components/HandoffQrSheet.tsx` (deleted), both APIs, `package.json`, i18n
- Test: `__tests__/transfer-check.test.ts`, `__tests__/real-api-driver-data.test.ts`

---

## Open doubts

1. ~~Fix 10 goes against Android.~~ **Settled in the follow-up:** the two reasons are hidden again.
2. ~~Which reasons open a SAV case.~~ **Settled in the follow-up:** the hint is removed.
3. **A modified run locks all its parcels**, not only the new one, until the driver confirms. This was already
   the behaviour. ~~Decision: keep the full lock for now.~~ **Settled in the parity pass:** Android locks only the
   new parcel, and so do we now. Needs a live check.
4. **"Refuser cette tournée" and "Refuser les nouveaux colis" are still there.** The task did not mention them.
   They may not exist on the live server (a 404 shows "not available yet").
5. **A fifth status: "Confirmée — à démarrer".** It is for a run that was confirmed but did not start
   (the retry case). It is not in the four statuses you listed.
6. **"Terminée" is decided on the phone**: the run is open and no parcel is left to deliver.
   The server has no such status.
7. **A run planned yesterday but closed today** shows as closed today, titled with its own date.
8. **Attempt badge on the cards starts at attempt 2.** A first attempt shows nothing on the card.
   The delivery screen always shows it.
9. ~~The pickup "Done all" footer is gone.~~ **Settled in the follow-up:** "Terminer tous les pickups" is back.
   New doubt: that button finishes every pickup **without** the parcel-by-parcel check. The dialog says so.
10. **Ticks and scans live in memory only.** If the app is killed mid-check, the driver starts the check again.
11. **All decimals use a dot now**, not only prices (percentages too).
12. **Left-over texts.** Some old `pickups.done…` keys are unused but still in the i18n files. Harmless.
13. **Mock data has three open runs today**, so mock mode shows the rare "several runs" case, not the usual one.

## Follow-up

A second, small round after this file was first written. Writes stayed off. One commit per item.

| Item | Change | Commit |
|------|--------|--------|
| 1 | Hide "Colis refusé" and "Client non intéressé" again, like Android. "Annulé par client" is offered. | `845edec` |
| 2 | Remove the "Ce motif ouvre un dossier SAV" hint completely. | `2b1ba80` |
| 3 | Keep the full lock on a changed run. No code change. To compare with Android later. | (this file) |
| 4 | "Terminer tous les pickups" is back, behind "Terminer N pickups (M colis) ?". "Tout cocher" stays. | `541e3a3` |

Tests: `__tests__/failure-reasons.test.ts` updated (19 reasons offered on every attempt, the two hidden ones
still have labels, "Annulé par client" is in both lists, no SAV hint left). New `__tests__/pickup-batch.test.ts`
(the N and M of the dialog, the French sentence, all pickups closed on mock data, nothing sent with writes off).

## Parity pass

A fix pass on the gaps listed in `PARITY.md`. Writes stayed off. No write was sent to the live server.
One commit per gap, each message starting with the gap number.

The client rules from the Moncef / Jihed meeting win over Android parity:
History is read-only with no phone numbers; a finished run shows no parcels; money with three decimals and
percentages with two (changed after the pass, see "Number format" below); "Done All" for pickups; call before "delivered"; the driver can correct a parcel; confirming a run is one tap.

Final check, after the follow-up below: `npx tsc --noEmit` clean, `npx expo lint` clean,
`npx jest` → **27 suites, 311 tests, all pass**. Not run on a phone.

### MUST and SHOULD gaps

| Gap | What | Result | Commit |
|---|---|---|---|
| 1 | Changed run locks every parcel | **Done.** Only the added parcel is locked. The banner stays. Needs a live check. | `efceea6` |
| 2 | Identical History cards | **Done.** Each card shows "RS-20261002-0002 · 02/10 · Tentative 3". Still read-only, no phone. | `b2ee9eb` |
| 3 | No transfer detail screen | **Done.** Opened from an ongoing transfer only. | `08280d3` |
| 4 | Pickups: Android has two steps | **Skipped: client rule.** See below. | — |
| 5 | Pickup counter 6 vs 0 | **Done.** The number is kept and labelled "À ramasser". | `87cf0d6` |
| 6 | No badges on Home buttons | **Done.** Four badges, like Android. | `b378ceb` |
| 7 | Three names for pickups | **Done.** "Ramassage" everywhere. | `f877ec1` |
| 8 | Home gauge has no name | **Done.** "AUJOURD'HUI" under the gauge; Profile says "(total)". Percentages: now 2 decimals, see "Number format". | `036ecbf`, `acfaac8` |
| 9 | Pickup card: no reference, no day | **Done.** Reference under the address, "02/10 · 23:13". | `27e2ea4` |
| 10 | No "Naviguer" / contact on a collected pickup | **Skipped: client rule.** See below. | — |
| 11 | "5 En transit" counts parcels | **Done.** "Colis en transit". | `b592683` |
| 12 | Home shows no current run | **Done.** A row with the run code and "N restants sur M". | `87d77c8` |
| 13 | No change password | **Removed on request.** Built in `e3086da`, taken out in `839e66d`. See below. | — |
| 14 | Confirm also starts the run | **Skipped: client rule.** See below. | — |
| 15 | Call rule has no way out | **Done.** "Client injoignable — continuer". The rule itself is kept. | `014b177` |

### NICE gaps

| Gap | What | Result | Commit |
|---|---|---|---|
| 16 | Run card has no Livrés / Échoués / Restants | **Done.** | `8e39a78` |
| 17 | Scanner only knows the driver's parcels | **Later.** The backend asked us not to call the tracking endpoint. Only if they change their mind. | — |
| 18 | Type the password again after the session expires | **Later.** Needs the password kept in secure storage; more than 30 minutes, and a security choice. | — |
| 19 | "Remettre en attente" | **Kept on purpose** (decision D). It is part of the correction feature. Must be tested live. | — |
| 20 | English on a phone set to Arabic | **Done.** French is the default. | `e819bbd` |
| 21 | Transfer anomalies not shown | **Done** with gap 3: missing / extra / damaged are on the detail screen. | `08280d3` |
| 22 | Cancelled transfers are hidden | **Later.** Showing them means a third list or a "Tous" tab. | — |
| 23 | No dark-mode switch | **Later.** The app follows the phone's setting. | — |

### Decisions A to K

| | Decision | Result |
|---|---|---|
| A | Lock only the new parcel | Done (gap 1). |
| B | History cards: run code, date, attempt | Done (gap 2). |
| C | Confirm and start stay one tap | No change needed. One tap sends confirm, then start. If confirm works and start fails, the card shows "Démarrer la tournée" to retry. Already covered by `__tests__/real-api-writes.test.ts`. |
| D | Keep "Remettre en attente" | Kept. No change. |
| E | "Client injoignable — continuer" | Done (gap 15). |
| F | Transfer detail screen | Done (gap 3). |
| G | "Changer le mot de passe" | Built, then **removed on request**. Personal and vehicle info stay read-only. |
| H | Pickups: no change to the flow | Flow unchanged. Only the words changed (gap 7). |
| I | Arabic | Nothing done. |
| J | Percentages with 3 decimals | **Replaced.** Percentages now have 2 decimals: "0.00%", "65.38%". See "Number format". |
| K | A closed run shows only its card | Checked and tested (`fc99faa`). The mock now follows the same rule. |

### Skipped: client rule

- **Gap 4, pickups in two steps.** Android has "Confirmer Pickup" then "Terminer Pickup". The client asked for
  "Done All": all collected at once, no extra steps. Our flow is unchanged: one action sends start, then complete.
- **Gap 10, "Naviguer" and contact on a collected pickup.** A collected pickup is history. The client rule says
  history has no details and no phone numbers. A scheduled pickup still has "Appeler" and "Naviguer".
- **Gap 14, confirm and start as two steps.** Android keeps them apart. The client rule says confirming a run
  is one tap, confirm and start together.

### What each fix does

**Gap 1 — the lock.** Before: any change to a started run locked all its parcels. Now: a run not accepted, or
accepted but not started, still locks everything; a run changed after the start locks only the parcels the agency
added. The other parcels keep their place in the list, the "next stop" and their buttons. The write itself is also
refused for a parcel waiting for confirmation.
Files: `lib/runsheetDay.ts`, `lib/useNextStop.ts`, `services/real-api.ts`, `services/mock-api.ts`,
`app/(tabs)/runsheets/index.tsx`. Tests: `__tests__/runsheet-day.test.ts`, `__tests__/delivery-rules.test.ts`.

**Gap 2 — History cards.** Each parcel now carries its run's code and day. The attempt number is worked out per
record: the parcel's records are put in time order, the oldest is 1, and the numbering starts higher when the
server counted failures this driver doesn't have (another driver tried too).
Files: `lib/historyRecord.ts`, `types/job.ts`, both APIs, `app/(tabs)/runsheets/index.tsx`.
Test: `__tests__/history-record.test.ts`.

**Gap 3 — transfer detail.** A row "Voir le détail du transfert" on an ongoing transfer's card opens the screen:
header, itinerary, driver and vehicle, dated history, anomalies, parcels with status and cash, notes.
It is read-only. Taking the transfer (scan, then "Confirmer la prise en charge") stays on the list card.
A transfer in History has no such row. No phone number is read from the server into the screen's data.
Files: `app/transfer/[id].tsx`, `app/transfers.tsx`, `app/_layout.tsx`, `lib/transferState.ts`,
`types/transfer.ts`, both APIs. Test: `__tests__/transfer-detail.test.ts`.

**Gap 5, 7, 11 — words.** "À ramasser" for the Home number. "Ramassage" in every French text, including
"Terminer le ramassage", "Terminer tous les ramassages" and "Terminer N ramassages (M colis) ?".
"Colis en transit" on the Transfers header. One "Pickup" is left: the agency's own parcel status label.
Files: `lib/i18n/fr.ts`, `lib/i18n/en.ts`. Tests: `__tests__/pickup-batch.test.ts`, `__tests__/transfer-check.test.ts`.

**Gap 6 — badges.** Open runs, ramassages to do, open transfers, returns still with the driver. Nothing at zero.
Files: `lib/homeBadges.ts`, `app/(tabs)/home/index.tsx`. Test: `__tests__/home-badges.test.ts`.

**Gap 8 and J — percentages.** One shared file, two functions. Two decimals since the follow-up.
Files: `lib/currency.ts`, i18n. Tests: `__tests__/currency.test.ts`, `__tests__/recent-searches.test.ts`.

**Gap 9 — pickup card.** Files: `lib/pickupBatch.ts`, `lib/date.ts`, `app/pickups.tsx`.
Test: `__tests__/pickup-batch.test.ts`.

**Gap 12 and 16 — the run in numbers.** Files: `lib/runsheetDay.ts`, `components/RunsheetDayCard.tsx`,
`app/(tabs)/home/index.tsx`, `types/runsheet.ts`, both APIs. Test: `__tests__/run-counts.test.ts`.

**Gap 13 — change password.** Removed on request. See "Removed on request" below.

**Gap 15 — "Client injoignable — continuer".** Shown on the parcel screen and in the status sheet once Call was
pressed. It notes "client injoignable" on the phone, and the note goes to the agency with a failure:
"Client appelé une fois (14:32). Client injoignable." It is never offered before a call.
Files: `components/UnreachableButton.tsx`, `lib/deliveryGate.ts`, `lib/deviceStore.ts`, `lib/failureProof.ts`,
`components/StatusUpdateSheet.tsx`, `app/job/[id]/index.tsx`. Test: `__tests__/unreachable.test.ts`.

**Gap 20 — default language.** File: `lib/i18n/languages.ts`.

### Things to know

- **About decision E.** Pressing Call already unlocked "Livré" before this pass: the rule only asks that Call was
  pressed once. So the new button does not unlock anything more. It makes the way on visible, and it records
  that the customer could not be reached. If you wanted Call alone to stop unlocking, tell me: that is a
  different rule.
- **The mock's added parcel moved.** The mock's changed run had its "added" parcel already delivered, so the new
  lock showed nothing. The added parcel is now one still to deliver.
- **Older sections of this file** still say "pickup" in the button names and describe the full-run lock.
  They describe the app as it was then. This section is the current state.

### Removed on request

**"Changer le mot de passe" (parity gap 13, decision G).** Drivers do not change their password in the app.
Everything it added is gone (commit `839e66d`, which undoes `e3086da`):

- the row in Profil (both the iPhone list and the fallback list);
- the screen `app/change-password.tsx` and its route;
- the call `PUT api/driver-auth/change-password`, real and mock, and its entry in `services/api.ts`;
- the checks in `lib/password.ts`;
- its French and English texts;
- its tests (`__tests__/change-password.test.ts`).

The Android app still has this feature. It is now a known difference, on purpose.

### Number format

This replaces the old client rule "3 decimals on every decimal number" (commit `acfaac8`).

| What | Decimals | Example | Function |
|---|---|---|---|
| Money | 3 | "10.000 TND" | `formatCurrency` |
| Percentages | 2 | "0.00%", "65.38%", "99.99%" | `formatPercent` |

Both live in `lib/currency.ts`. Percentages are shown in two places: the Home gauge and the Profile rate.
I searched the screens for any other percentage and found none.
Distances and weights keep three decimals: the new rule did not mention them. Say so if they should change.
Tests: `__tests__/currency.test.ts`, `__tests__/recent-searches.test.ts`.

### To check on the live server

1. **Gap 1.** With a parcel added to a started run and not confirmed yet: update one of the old parcels.
   The server must accept it. If it refuses, the lock has to go back to the whole run.
2. **Gap 19.** "Remettre en attente" sends `{status: "PENDING"}`. The Android app never sends that. Test it once.
3. **Gap 2.** Compare the attempt numbers on History cards with the agency's count for the same parcel.
4. **Gap 3.** Open a real ongoing transfer: check the dates, the parcel statuses and the notes against the web app.
5. **Decision C.** Confirm a run with one tap and check it is IN_PROGRESS right after.

## OTP delivery confirmation

Requested by Jihed. Writes stayed off; no write was sent to the live server. One commit per item.
There is no server API for the code yet, so it is built behind a small service with a mock.
The API contract the app expects is in `OTP.md`.

Final check: `npx tsc --noEmit` clean, `npx expo lint` clean, `npx jest` → **35 suites, 434 tests, all pass**.
Not run on a phone.

| Item | What | Commit |
|---|---|---|
| 1 | The OTP screen is restored from git history and adapted. The photo-proof screen is not restored. | `6e6f51c` |
| 2 | The rule: `itemValue = price − deliveryFee` (missing fee → 0); a code is required when it is 0. | `65a37dc` |
| 3 | The cash wording on the delivery screen. | `c725585` |
| 4 | The code flow (send, type, resend, block, failure path, test banner). | `6e6f51c` |
| 5 | The service `sendOtp` / `verifyOtp` / `resendOtp`, with a mock, and `OTP.md`. | `7dd846e` |
| 6 | Tests. | with each item |

Items 1 and 4 are one commit: the old screen could not build on its own any more (its mock function and its
photo link were gone), so restoring it and adapting it had to go together.

### What the driver sees

**When a code is required.** Two cases, both with nothing of value to collect for the sender:

| price | deliveryFee | Code? | Cash line on the delivery screen |
|---|---|---|---|
| 0 | 0 | Yes | "Rien à encaisser" |
| 10 | 10 | Yes | "10.000 TND" with "(frais de livraison)": the driver collects the fee in cash |
| 950 | 10 | No | "950.000 TND", as before |
| 10 | none | No | "10.000 TND", as before |

**The flow.** "Livré" on such a parcel opens the code screen instead of delivering.
- Opening it sends the code: "Code envoyé au client".
- The driver types 6 digits. "Livré" is enabled only after a correct code.
- "Renvoyer le code" is available after 60 s, at most 3 times.
- 5 wrong codes: "Code bloqué — renvoyez un nouveau code".
- After 3 resends with no success: "Impossible de valider — marquez un échec", with a button to the failure screen.
- There is no way to deliver without a correct code. The delivery call itself refuses, on the mock and on the
  real side, even if the screen were bypassed.
- The call-before-delivery rule still applies. It is checked before the code is sent, so no SMS goes out for a
  customer who was never called.
- In mock mode only, a "MODE TEST" banner shows the code so the flow can be tested.

### Files

- Rule and cash: `lib/otpRule.ts`. Parcels now carry `deliveryFee` (`types/job.ts`, `services/real-api.ts`).
- Code rules (6 digits, 10 minutes, 60 s, 3 resends, 5 wrong codes): `lib/otpSession.ts`.
- Service: `services/otp.ts`. **This is the one file to change when the real API exists.**
- Screen: `app/job/[id]/otp.tsx`. Entry points: `app/job/[id]/index.tsx`, `components/StatusUpdateSheet.tsx`.
- Enforcement: `confirmDelivery` in `services/mock-api.ts` and `services/real-api.ts`.
- Mock data: two parcels on a confirmed run, one "fee only" (8 / 8) and one "nothing" (0 / 0).
- Tests: `__tests__/otp-rule.test.ts` (0/0, 10/10, 950/10, fee null, decimals, the cash line) and
  `__tests__/otp-flow.test.ts` (resend timer and limit, wrong-code limit, the failure path, no delivery without
  a code, the call rule first, and real mode never showing the test banner).

### Things to know

1. **In real mode, a parcel that needs a code cannot be delivered today.** The real service has no API to call,
   so it cannot send a code, nothing can be verified, and the delivery is refused. The driver can only record a
   failure. Writes are off, so this blocks nobody now. But **the OTP API must exist before writes are switched
   on for real drivers**, or the rule must be switched off. Please tell Jihed.
2. **The rule is only checked on the phone.** The server will still accept a plain "delivered" for these
   parcels from another client (the Android app, the web). `OTP.md` asks Jihed to check it on the server too.
3. **Price 0 and fee 0 now needs a code.** Before, such a parcel showed "Payé" and was delivered in one tap.
   If prepaid parcels are common, most of them will now ask for a code. That follows the rule as given.
4. **The mock's codes live in memory.** Closing the app forgets the code and its counters, so a restart gives
   three new resends. The real API will keep them on the server.
5. **The old screen had 4 digits and a "take a photo instead" link.** The new one has 6 digits and no photo.
6. **The list card still says "Payé"** for a 0 / 0 parcel. Only the delivery screen was asked to change.

### OTP follow-up: the switch, and the list card

| Item | What | Commit |
|---|---|---|
| 1 | `EXPO_PUBLIC_OTP` = `off`, `mock` or `real` | `c4c6356` |
| 2 | List card: "CODE CLIENT" badge and "Frais de livraison : …" | `b5127bd` |

**1. The switch.**
- `off`: the rule is disabled. Code-required parcels deliver like any other; the call rule still applies.
  No screen, card or delivery call asks for a code.
- `mock`: the mock service and the "MODE TEST" banner, as before.
- `real`: the real service, for when the API exists.
- Defaults: `mock` on mock data, `off` on the real server. **A real delivery is never blocked because the OTP
  API is missing.** This settles point 1 of "Things to know" above.
- One function decides, `otpNeeded()` in `services/otp.ts`. The parcel screen, the status sheet, the list card
  and both delivery calls all ask it, so they cannot disagree.
- Documented in `OTP.md` and in the new `README.md`.

**2. The list card.** For a parcel that needs a code, with the switch not `off`:
- "Payé" is replaced by a small "CODE CLIENT" badge;
- when the delivery fee is above 0, the card also says "Frais de livraison : 10.000 TND".
With the switch `off` the card is exactly as before. This settles point 6 above.

Files: `constants/backend.ts`, `services/otp.ts`, `lib/otpRule.ts` (`cardCash`), `app/(tabs)/runsheets/index.tsx`,
`app/job/[id]/index.tsx`, `app/job/[id]/otp.tsx`, `components/StatusUpdateSheet.tsx`, both APIs, i18n.
Tests: `__tests__/otp-switch.test.ts` (the three modes, the defaults, the real server delivering with no code
by default, the card), `__tests__/otp-flow.test.ts` (updated).

Final check: `npx tsc --noEmit` clean, `npx expo lint` clean, `npx jest` → **36 suites, 449 tests, all pass**.

One choice of mine to know about: **`EXPO_PUBLIC_OTP=mock` on the real server is read as `off`.** A code
made up by the phone, and shown to the driver in the banner, would prove nothing about a real parcel.

### To check on the phone (mock mode)

- Open the mock parcel of Sonia Gharbi (8.000 TND, fee only) and Karim Mejri (nothing to collect).
- Tap "Livré" without calling: "Appelez d'abord le client".
- Call, then "Livré": the code screen opens, with the "MODE TEST" banner and the code.
- Type a wrong code five times: "Code bloqué".
- Wait 60 s, resend, type the new code: "Livré" becomes available.
- Use the three resends: "Impossible de valider — marquez un échec" and its button.
- The list: the two parcels show "CODE CLIENT"; Sonia Gharbi's also shows "Frais de livraison : 8.000 TND".
- Set `EXPO_PUBLIC_OTP=off`: both parcels deliver in one tap after a call, and the cards say "8.000 TND" and "Payé".
- Switch to real mode with nothing set: no code is asked for anything.

## What to check on the phone

Nothing here was run on a device. With `npx expo start --clear`:

- Current tab: the run card, in mock mode (three runs) and in real mode (your real run).
- A modified run: the banner, the "NOUVEAU" parcel first.
- Transfers: scan flow, "Confirmer sans scan", then the "En route vers …" card.
- Ramassages: tick, scan, "Terminer le ramassage". Then "Terminer tous les ramassages" and its dialog. The reference and the day on each card.
- Home: the four badges, "À ramasser", "AUJOURD'HUI" under the gauge, the row for the run in progress.
- History: the line "RS-… · 02/10 · Tentative N" on each card.
- A changed run: only the "NOUVEAU" parcel is locked, the others still work.
- A transfer in progress: "Voir le détail du transfert" and the detail screen. None on a transfer in History.
- Profil: no "Changer le mot de passe" row. Percentages with two decimals on Home and in Profil.
- A parcel: press Call, then "Client injoignable — continuer".
- Can't-deliver screen: "Annulé par client" is there, "Colis refusé" is not, no SAV hint.
- Scanner: hold one label in front of the camera. It must count once.
- Turn on airplane mode: "Connexion impossible" with a retry.
