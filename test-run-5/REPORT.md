# Live test, round 5 — the parity-pass fixes on the real server

Date: 2026-10-03, 16:55–17:25 (Tunis time). Server: https://jibex.cloud.
Web side: Playwright driving a visible Microsoft Edge window, sender account (moncef) and agency account
(agency head of Tun-100). Driver side: our iOS app (Expo Go) as mourad (driver 3), done by hand by the user.

Only this report is in git. Screenshots (`shots/`), `test-log.md`, `writes.json`, `blocked.json` and
`approvals.json` stay local. No app code was changed.

Same safety rules as round 3: a write allow-list in the browser, an approval gate (not needed this round),
test data only, nothing deleted. **No write was blocked. No transfer was touched.**

**Result:** the four fixes that needed the real server all work.

| Fix to check | Verdict |
|---|---|
| Gap 1 — a changed run locks only the new parcel | **Works.** The server accepted a delivery on an old parcel while the new one was still waiting. |
| "Remettre en attente" (correction) | **Works.** The server accepts `PENDING`. It leaves a stale failure reason behind (problem 2). |
| Call rule and "Client injoignable — continuer" | **Works.** The note reached the agency. |
| One-tap confirm (confirm + start) | **Works.** The run was IN_PROGRESS after one tap. |
| History: run code, date, attempt | **Mostly confirmed.** Three of four lines match. One card and one number need a second look (problem 3). |
| Transfer detail screen | **Works.** Dates and parcel statuses match the web exactly. |

One new app problem came out of the round: **Home drops to zero once the agency closes the run** (problem 1).

## The test data

Three new parcels, all Tunis / El Menzah, recipient "TEST AMYYN", address "TEST - NE PAS LIVRER", price 10.

| Label | Tracking | Id | Final status |
|---|---|---|---|
| P9 | TUN-100-5DAE8D09 | 134 | DELIVERED |
| P10 | TUN-100-6D42D0BF | 135 | DELIVERED |
| P11 | TUN-100-75CE5BE0 | 136 | RTN_DEPOT (attempt 1/3) |

Runsheet: **RS-20261003-0001 (id 74)**, mourad, TUN-261. Final status COMPLETED.

## Steps

### Part 1 — setup

**Step 1 — Sender creates P9, P10, P11.**
Expected: three parcels, status PENDING. Actual: as expected, HTTP 200 each, destination agency Tun-100.

**Step 2 — Entrée Stock: P9, P10, P11.**
Expected: "Au dépôt". Actual: all three `AU_DEPOT`, "Colis réceptionné au dépôt — 1ère entrée", attempts 0.

**Step 3 — Runsheet for mourad, P9 and P10 only.**
Expected: a new run with two parcels. Actual: `create-and-scan` with P9 created RS-20261003-0001; the scan of
P10 was added. Web row: "En attente chauffeur", 2 parcels. Run status `PENDING`, both items `PENDING`,
both parcels `EN_COURS`.

### Part 2 — one-tap confirm and the changed run

**Step 4 — the driver taps "Confirmer la tournée" once.**
Driver: confirmed; then saw the two parcels and could update them.
Expected: run `IN_PROGRESS`. Actual: **`IN_PROGRESS`**, startedAt 17:01:21. Web row: "En tournée".
The row's icon changed from "Scanner" to "Ajouter un colis", as in round 1.

**Step 5 — the agency adds P11 with "Ajouter un colis".**
Expected: P11 on the run, waiting for the driver. Actual: `POST /api/runsheets/74/scan` → "ADDED".
P11's item: **`PENDING_DRIVER_CONFIRMATION`**, parcel still `AU_DEPOT`. P9 and P10 unchanged.

**Step 6 — the driver delivers P9 while P11 is not confirmed.** *(This decides gap 1.)*
Driver: after a refresh the new parcel appeared, locked. Pressed Call on P9, then "Client injoignable —
continuer", then delivered P9. P11 stayed locked. Nothing was refused.
Expected: the server accepts the update on P9. Actual:

| Item | Status |
|---|---|
| P9 | **DELIVERED** at 17:04:53. History: "Livré par le chauffeur · Chauffeur : mourad". |
| P10 | PENDING |
| P11 | **PENDING_DRIVER_CONFIRMATION** |

The server took the update on an old parcel while a new one was waiting. No error.
P9's item has no notes: a delivery sends none, so "Client injoignable" is not recorded for a delivered parcel.

**Step 7 — the driver confirms the modified run.**
Driver: did not read the dialog; P11 was then unlocked and usable.
Actual: P11's item went to `PENDING`, its parcel to `EN_COURS`. History: "Colis confirmé par le chauffeur dans
tournée RS-20261003-0001".

### Part 3 — the correction

**Step 8a — the driver fails P10 with "Destinataire absent".**
Driver: worked fine.
Actual: item `FAILED`, reason `ABSENT`, notes **"Client non appelé. Position : 35.81436, 10.64047."**
Parcel still `EN_COURS`. History: "Tentative de livraison échouée — ABSENT. Colis toujours EN_COURS. Retour
au dépôt requis pour changer le statut." The run's failed count went to 1.

**Step 8b — the driver uses the correction and picks "Remettre en attente".**
Driver: done; the parcel came back to the Current tab.
Expected: the server accepts `{status: "PENDING"}` (the Android app never sends it). Actual: **accepted.**

| P10 item | After the failure | After "Remettre en attente" |
|---|---|---|
| status | FAILED | **PENDING** |
| notes | "Client non appelé. Position : …" | cleared |
| failureReason | ABSENT | **ABSENT (still there)** |
| run's failed count | 1 | 0 |

The parcel's history got no new line for the correction. See problem 2.

**Step 9 — the driver delivers P10 and fails P11.**
Driver: done. Remark: with all parcels done, the Current tab still shows the "Tournée du jour" card, labelled
"Terminée". (That is the intended state: finished for the driver, not yet closed by the agency.)
Actual: P10 `DELIVERED` at 17:11:23. P11 `FAILED`, notes
**"Client appelé une fois (17:11). Client injoignable. Position : 35.81434, 10.64048."**
P11's reason on the server is `NOT_AVAILABLE_RESCHEDULED`, not `ABSENT`. P10 was sent as `ABSENT` in step 8a,
so the mapping is right; the driver most likely picked "Client non disponible (reporté)". To confirm with him.

**Step 10 — Entrée Stock: P11.**
Expected: RTN dépôt, attempt 1/3. Actual: **`RTN_DEPOT`**, "Retour dépôt — tentative n°1/3. Recréer dans une
runsheet pour une nouvelle tentative.", attempts 1.

**Step 11 — process and validate the run.**
"Valider la tournée" → `PUT /api/runsheets/74/complete` (pre-approved) → HTTP 200, **`COMPLETED`** at 17:14:02.
Final: total 3, delivered 2, failed 1. Web: P9 "Livré", P10 "Livré", P11 "RTN dépôt".

### Part 4 — read-only comparisons

**Step 12 — History cards against the agency's data.**

| Parcel | Run (agency) | Item on the run (agency) | Card in the app (driver's notes) | Same? |
|---|---|---|---|---|
| P2 | RS-20261002-0002 (02/10) | FAILED / ABSENT | "RS-20261002-0002 · 02/10 · Tentative 4" | Yes |
| P2 | RS-20261002-0001 (02/10) | FAILED / ABSENT | "RS-20261002-0001 · 02/10 · Tentative 4" (an earlier, interrupted message said 3) | **Unclear** |
| P2 | RS-20260930-0002 (30/09) | FAILED / ABSENT | "RS-20260930-0002 · 30/09 · Tentative 2" | Yes |
| P2 | RS-20260930-0001 (30/09) | FAILED / NOT_AVAILABLE_RESCHEDULED | (no card reported) | **Not confirmed** |
| P11 | RS-20261003-0001 (03/10) | FAILED / NOT_AVAILABLE_RESCHEDULED | "RS-20261003-0001 · 03/10 · Tentative 1" | Yes |

The run codes and dates are right on every card reported. P2 really is on four of mourad's runs, so the app
should show four cards numbered 4, 3, 2, 1. Two points are open: see problem 3.
P11's "Tentative 1" matches the stock entry's "tentative n°1/3".

**Step 13 — transfer TRF-FA75ED72, still `IN_TRANSIT`.**

| | Web (agency API) | App detail screen (driver's notes) | Same? |
|---|---|---|---|
| Créé | 2026-08-29 15:17:20 | 29/08/2026 15:17 | Yes |
| Prêt pour chargement | 2026-10-02 21:12:05 | 02/10/2026 21:12 | Yes |
| Pris en charge par le chauffeur | 2026-10-02 21:13:43 | 02/10/2026 21:13 | Yes |
| Terminé | (none) | no date | Yes |
| TUN-100-51B62DC7 | EN_TRANSIT_AGENCE | en transit | Yes |
| TUN-100-699F0F1D | EN_TRANSIT_AGENCE | en transit | Yes |
| TUN-100-C9166BCA | EN_TRANSIT_AGENCE | en transit | Yes |
| TUN-100-6107B96B | AU_DEPOT_RELAIS | au dépôt relais | Yes |
| TUN-100-561D8F37 | EN_TRANSIT_AGENCE | en transit | Yes |

Read-only: no transfer call was sent.

## Problems

### In the app

1. **Home goes to zero once the run is closed** (driver's remark). When the agency closes the run, "Colis à
   livrer" shows 0% and Livrés / En file / Échecs all show 0. The driver did deliver two parcels today.
   Cause: Home only counts the runs still open, and the server stops listing a run as active once it is
   closed. The same happens after a transfer or a pickup is finished. Home should count today's work,
   closed runs included (the app already reads today's closed run for the "Tournée clôturée" card).
2. **(Server side, seen through the app.)** See problem 4.
3. **History, two points to re-check on the phone.**
   - The card for RS-20261002-0001 was reported as "Tentative 4" in the final message and "Tentative 3" in an
     earlier one. Expected: 3. Two cards with the same number would be a bug in the numbering.
   - No card was reported for RS-20260930-0001 (expected "· 30/09 · Tentative 1"). It may simply be further
     down the list.
   Neither could be settled from the notes. A screenshot of the four cards would settle both.

### On the server

4. **"Remettre en attente" leaves the old failure reason.** After the correction the item is `PENDING` but
   still carries `failureReason: ABSENT`. The notes are cleared, the reason is not. A pending item with a
   failure reason can mislead a report. Also, the parcel's history gets no line for the correction: the last
   line still reads "Tentative de livraison échouée".
5. **A delivery records no note.** The call log and "Client injoignable" only reach the agency with a failure.
   For a delivered parcel nothing says the customer was called. Not a bug; a limit to know about.
6. **`deliveryAttempts` is missing from the company parcel list** (`GET /api/parcels/company/{id}`): the field
   is not sent there. It is present on runsheet items. Only matters for anyone reading that list.

## All writes sent by the browser

Times are UTC (Tunis is one hour ahead).

| Time | Step | Call | Note |
|---|---|---|---|
| 15:55:15 | 1 | `POST /api/sender-portal/parcels` | P9 |
| 15:56:11 | 1 | `POST /api/sender-portal/parcels` | P10 |
| 15:57:00 | 1 | `POST /api/sender-portal/parcels` | P11 |
| 15:57:53 | 2 | `POST /api/stock-entry/scan` | P9 |
| 15:57:59 | 2 | `POST /api/stock-entry/scan` | P10 |
| 15:58:04 | 2 | `POST /api/stock-entry/scan` | P11 |
| 15:58:28 | 3 | `POST /api/runsheets/create-and-scan` | P9, creates run 74 |
| 15:58:30 | 3 | `POST /api/runsheets/74/scan` | P10 |
| 16:03:28 | 5 | `POST /api/runsheets/74/scan` | P11, added after the start |
| 16:13:37 | 10 | `POST /api/stock-entry/scan` | P11 |
| 16:14:02 | 11 | `PUT /api/runsheets/74/complete` | pre-approved |

All eleven were on the pre-approved list. No approval was asked this round.

**Writes sent by the driver app** (by hand, on run 74 only): confirm and start the run; deliver P9; confirm the
new parcel; fail P10; put P10 back to pending; deliver P10; fail P11.

**blocked.json: empty.** Nothing was blocked.

One "STOPPED" line is in the local log at step 6. It was my own optional look at the agency's processing
window, which has no button while a run still has parcels to do. No request was sent.

## The app's write switch

For this round the user set `EXPO_PUBLIC_API_WRITES=on` in `.env.local` himself. **It is still on.**
The project rule is that it stays off: switch it back to `off` and restart with `npx expo start --clear`.

## Cleanup list for Jihed — rounds 1 to 5

**New this round:**
- **Runsheet RS-20261003-0001 (id 74)**, COMPLETED, mourad.
- **Parcels 134, 135, 136** (see the table below).

**Still open from round 4** (not touched this round):
- **TRF-FA75ED72 (id 3)** is `IN_TRANSIT` with mourad. Its parcels TUN-100-51B62DC7, TUN-100-699F0F1D,
  TUN-100-C9166BCA and our TUN-100-561D8F37 are `EN_TRANSIT_AGENCE`. They need to be received from the
  sous-003 account, or reset.
- **TRF-BDA62120 (id 33)**: draft created by the server, holding only our parcel 131. To delete.
- **TRF-7423B7F0 (id 32)**: never touched by us; its parcel TUN-100-C9166BCA is in transit on transfer 3.

**Runsheets** (all COMPLETED, mourad): RS-20260930-0001 (70), RS-20260930-0002 (71), RS-20261002-0001 (72),
RS-20261002-0002 (73), RS-20261003-0001 (74).

**Parcels** (recipient "TEST AMYYN", address "TEST - NE PAS LIVRER", sender moncef):

| Id | Tracking | Status |
|---|---|---|
| 126 | TUN-100-DEC8AC59 | DELIVERED |
| 127 | TUN-100-78CF079C | A_VERIFIER (4 attempts, in SAV) |
| 128 | TUN-100-7FAD7390 | DELIVERED |
| 129 | TUN-100-71DEEE7A | DELIVERED |
| 130 | TUN-100-01B70C0B | DELIVERED, exchange confirmed |
| 131 | TUN-100-6107B96B | AU_DEPOT_RELAIS, in TRF-FA75ED72 and TRF-BDA62120 |
| 132 | TUN-100-99BF3AE7 | AU_DEPOT |
| 133 | TUN-100-561D8F37 | EN_TRANSIT_AGENCE, in TRF-FA75ED72 |
| 134 | TUN-100-5DAE8D09 | DELIVERED |
| 135 | TUN-100-6D42D0BF | DELIVERED |
| 136 | TUN-100-75CE5BE0 | RTN_DEPOT, attempt 1/3 |

**Pickup:** PU-3-20261002-0001 (id 41), COMPLETED.
**SAV cases:** 26 (parcel 127) and 27 (parcel 129), both OPEN when last checked (round 3).
**Exchange label:** ECH-96667B69 (id 1), run 71, item 141.
