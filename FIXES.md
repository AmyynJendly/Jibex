# Fixes after the live tests

These fixes come from the four live test reports (`test-run/` to `test-run-4/`).

- Writes stayed **off** (`EXPO_PUBLIC_API_WRITES=off`) the whole time.
- No write was sent to the live server. Everything was tested with mock data and Jest.
- One commit per fix.
- Final check: `npx tsc --noEmit` clean, `npx expo lint` clean, `npx jest` → **21 suites, 257 tests, all pass**.
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
But (b) contradicts fix 10. See the first open doubt.

---

## The fixes

| # | Fix | Commit |
|---|-----|--------|
| 1 | Auto-refresh | `f37968b` |
| 2 | Attempt number | `4520bce` |
| 3 | Exchange | `19889cd` |
| 4 | Pickup check | `0a9f079` |
| 5 | History keys | `b0be9af` |
| 6 | Prices | `57bdff7`, `97ccbb9` |
| 7 | Failure proof note in French | `9a9a9fb` |
| 8 | Status mapping | `772cd44` |
| 9 | Run closed by the agency | `bb9035f` |
| 10 | Failure reasons | `9a2b351` |
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

- Files: `lib/checklist.ts`, `lib/useChecklist.ts`, `app/pickups.tsx`, `app/scanner.tsx`, i18n
- Test: `__tests__/checklist.test.ts`

### 5. History keys

Rows are keyed `${runsheetId}-${parcelId}`. A parcel on several runs (one per failed attempt) no longer breaks the list.
No row is dropped: a true repeat gets `#2`.

- Files: `lib/rowKey.ts`, `app/(tabs)/runsheets/index.tsx`
- Test: `__tests__/history-keys.test.ts`

### 6. Prices

"10.000 TND": three decimals, a dot. One shared formatter.

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
"Colis refusé" always shows. "Client non intéressé" shows only when `deliveryAttempts >= 1`.
Under the 9 SAV reasons: "Ce motif ouvre un dossier SAV".

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

1. **Fix 10 goes against Android.** Android hides "Colis refusé" and "Client non intéressé" on purpose
   (business decision of 13/08/2026). I showed them because the task asked for it and the web shows them.
   Please confirm with Jihed. To hide them again: set `selectable: false` on those two lines in `lib/failureReasons.ts`.
2. **Which reasons open a SAV case.** The hint is on the 9 reasons from the web's list.
   But in the live test, "Destinataire absent" and "Non disponible / reporté" also opened SAV cases
   (after the 3rd attempt). The hint may be incomplete.
3. **A modified run locks all its parcels**, not only the new one, until the driver confirms. This was already
   the behaviour. I don't know if the server would accept updates on the old parcels meanwhile, so I kept it safe.
4. **"Refuser cette tournée" and "Refuser les nouveaux colis" are still there.** The task did not mention them.
   They may not exist on the live server (a 404 shows "not available yet").
5. **A fifth status: "Confirmée — à démarrer".** It is for a run that was confirmed but did not start
   (the retry case). It is not in the four statuses you listed.
6. **"Terminée" is decided on the phone**: the run is open and no parcel is left to deliver.
   The server has no such status.
7. **A run planned yesterday but closed today** shows as closed today, titled with its own date.
8. **Attempt badge on the cards starts at attempt 2.** A first attempt shows nothing on the card.
   The delivery screen always shows it.
9. **The pickup "Done all" footer is gone.** It is replaced by "Tout cocher" on each pickup.
   The client notes had asked for a done-all button.
10. **Ticks and scans live in memory only.** If the app is killed mid-check, the driver starts the check again.
11. **All decimals use a dot now**, not only prices (percentages too).
12. **Left-over texts.** The old `pickups.doneAll…` keys are unused but still in the i18n files. Harmless.
13. **Mock data has three open runs today**, so mock mode shows the rare "several runs" case, not the usual one.

## What to check on the phone

Nothing here was run on a device. With `npx expo start --clear`:

- Current tab: the run card, in mock mode (three runs) and in real mode (your real run).
- A modified run: the banner, the "NOUVEAU" parcel first.
- Transfers: scan flow, "Confirmer sans scan", then the "En route vers …" card.
- Pickups: tick, scan, "Terminer le pickup".
- Scanner: hold one label in front of the camera. It must count once.
- Turn on airplane mode: "Connexion impossible" with a retry.
