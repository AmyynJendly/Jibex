# Live test, round 2 — report

Date: 2026-09-30, 21:31–22:10 (Tunis time). Server: https://jibex.cloud.
Web side: Playwright driving a visible Microsoft Edge window, sender and
agency accounts. Driver side: our iOS app (Expo Go) as mourad (driver 3),
done by hand by the user.

Only this report is in git. Screenshots (`shots/`, `app-shots/`),
`test-log.md`, `writes.json`, `blocked.json` and `approvals.json` stay local, in the gitignored `test-run-2/` folder.
The shared parcel list is `test-run/test-parcels.json`.

**Result:** Parts A and B done. Part C stopped at C2 (rule 5): the server put
our Sousse parcel into a transfer that also holds 3 parcels that aren't ours.

## Test data

| | Tracking | Id | Made in | Final status |
|---|---|---|---|---|
| P1 | TUN-100-DEC8AC59 | 126 | round 1 | DELIVERED (run 70) |
| P2 | TUN-100-78CF079C | 127 | round 1 | RTN_DEPOT, attempt 2/3 (failed on runs 70 and 71) |
| P3 | TUN-100-7FAD7390 | 128 | round 1 | DELIVERED (run 70) |
| P4 | TUN-100-71DEEE7A | 129 | round 1 | DELIVERED on its 2nd try (failed on run 70, delivered on 71) |
| P5 | TUN-100-01B70C0B | 130 | B1 | DELIVERED, exchange confirmed (run 71) |
| P6 | TUN-100-6107B96B | 131 | C1 | AU_DEPOT, inside transfer TRF-FA75ED72 (not ours) |

- **Runsheets:** RS-20260930-0001 (id 70) and RS-20260930-0002 (id 71), both
  COMPLETED ("Validée").
- **Exchange label:** ECH-96667B69 (label id 1), for P5's item 141.
- **Transfer:** none created by us. P6 was added by the server to
  **TRF-FA75ED72** (id 3, DRAFT, Tun-100 → sous-003), which is not ours.
- No parcel was created by the server from ours (checked after the exchange).

## Steps

### Part A — finish run 70

**A1 — Driver (app):** delivered P3, failed P4 with "Client absent".
- Server: P3 DELIVERED; P4 item FAILED `ABSENT`, parcel still `EN_COURS`.
- App at the end of the run: Current tab says **"All packages done - nothing
  left to deliver"**. No end-of-run screen or button.
- The app logged a React error on the History list (duplicate key, see
  problem 10) and an uncaught `ApiError: network`.

**A2 — Entrée Stock P4.** Expected RTN dépôt 1/3. **Actual: as expected.**
`EN_COURS` → `RTN_DEPOT`, attempts 1, "↩ Retour dépôt — tentative n°1/3.
Recréer dans une runsheet pour une nouvelle tentative." Shot `01`.

**A3 — Validate run 70.**
- Before: `IN_PROGRESS` ("En tournée"). Row buttons: Imprimer, "Ajouter un
  colis", **"Traiter la tournée"**.
- "Traiter la tournée" opens the processing window (read-only). It said "Tous
  les colis sont traités — la tournée peut être validée." Shots `03`, `04`.
- Approval gate → yes → "Valider la tournée" → `PUT /api/runsheets/70/complete`.
  Pop-up "Tournée complétée".
- After: **`COMPLETED`** ("Validée"), completedAt 21:36:02.
  **validatedAt and validatedBy stay empty** (see problem 3).
  Top cards: "Colis livrés 2 sur 4", "Montant total livré 0,000 DT". Shots `05`, `06`.

**A4 — Driver (app) after validation:**
- Current: still "All packages done - nothing left to deliver" (same as before).
- History: banner "These runs are closed by the agency, so these parcels can't
  be changed"; P1–P3 cards show a **"Run closed"** lock; P2 shows "Customer
  unavailable (rescheduled)". Phone shots in `app-shots/`.

### Part B — second attempt + exchange

**B1 — Sender creates P5** (Tunis / La Marsa, Échange = Oui).
- Created `PENDING`, `exchange: true`, destination Tun-100 ("Même agence").
- **Nothing on screen says it's an exchange**, in the sender's or the agency's
  list. The only extra choice in the form is the Oui/Non button. Shots `07`–`09`.

**B2 — Entrée Stock P5.** Expected Au dépôt. **Actual: `AU_DEPOT`**, 1st entry. Shot `10`.

**B3 — New run for mourad (TUN-261): P2, P4, P5.**
- P2 (was `RTN_DEPOT`, 1/3): **accepted**, "Tournée RS-20260930-0002 créée —
  colis ajouté avec succès".
- P4 (was `RTN_DEPOT`, 1/3): **accepted**, "scanné et ajouté avec succès".
- P5: accepted.
- No warning about a 2nd attempt. Run `PENDING` ("En attente chauffeur"),
  P2/P4/P5 `EN_COURS`. Shots `11`–`15`.

**B4 — Driver (app):** confirmed the run, failed P2 ("Client absent"),
delivered P4 and P5.
- **Attempt number:** the app showed none. (Code check: the app reads
  `deliveryAttempts` but never displays it; it only shows the call count.)
- **Exchange:** P5 looked like any other parcel. No exchange screen, label or
  question. Only the address (La Marsa) differed.
- Server: P2 FAILED `ABSENT`; P4 DELIVERED 21:45:12; P5 DELIVERED 21:48:06,
  item `exchangeConfirmed: false`.

**B5 — Entrée Stock P2.** Expected RTN dépôt 2/3. **Actual: as expected.**
"↩ Retour dépôt — tentative n°2/3. Recréer dans une runsheet pour une nouvelle
tentative." Shot `16`.

**B6 — P5's exchange on the web (read-only).**
- Item: `exchangeConfirmed: false`, `exchangeConfirmedAt: null`.
- Parcel: `exchange: true`, `exchangeParcel: null`, `amountToCollect: 0`
  (price 10 − fee 10).
- No new return/exchange parcel.
- Processing window: "Échanges 0 / 1"; P5 under "À scanner — Échange" and
  under "Colis échange livrés — à imprimer" with an "Imprimer" button.
  Footer: "1 colis restant(s) à traiter avant de pouvoir valider." Shot `17`.

**B7 — Exchange confirm + validate run 71.**
- Approval gate (2 writes) → yes.
- "Imprimer" → `POST /api/runsheets/71/items/141/exchange-label` → HTTP 201,
  **code ECH-96667B69** (label id 1, created by the agency user). It opened a
  print window, which froze the web page until it was closed (not printed).
- Scan ECH-96667B69 in "Échanges" → `PUT .../confirm-exchange-scan` → item
  **`exchangeConfirmed: true`** at 22:04:43. Footer: "la tournée peut être
  validée". Shots `18`, `19`.
- "Valider la tournée" (A3 approval reused) → `PUT /api/runsheets/71/complete`
  → **`COMPLETED`**, completedAt 22:06:10; validatedAt/By empty. Top cards:
  "Colis livrés 4 sur 7", "0,000 DT". Shots `20`, `21`.

### Part C — transfer to Sousse (stopped)

**C1 — Sender creates P6** (Sousse / Sousse Médina). Created `PENDING`,
destination **sous-003 (jihedb)**. The agency list marks it "⇄ Inter-agences".
Shots `22`–`24`.

**C2 — Entrée Stock P6.** `AU_DEPOT`, "1ère entrée". Destination jihedb (Sousse).
- **No new transfer.** The server added P6 to the existing **draft
  TRF-FA75ED72** (HUB_RELAY, Tun-100 → sous-003, note "Créé automatiquement —
  routage à l'entrée stock").
- That transfer now holds 4 parcels: TUN-100-51B62DC7, TUN-100-699F0F1D,
  TUN-100-C9166BCA (**not ours**) and P6.
- **Rule 5 → Part C stopped.** C3–C5 not done: no assign, no approval asked,
  Arrivages not checked. Shots `25`–`27`.

## Approval gates

| # | Asked | Answer | Sent |
|---|---|---|---|
| 1 | "Valider la tournée" → `PUT /api/runsheets/70/complete`, no body, run 70 | yes | once, 21:36:02 → 200 COMPLETED |
| 1b | Same action reused for run 71 (allowed by B7) | (pre-allowed) | once, 22:06:09 → 200 COMPLETED |
| 2 | "Imprimer" exchange label → `POST /api/runsheets/71/items/141/exchange-label`, no body | yes | once, 22:02:22 → 201, code ECH-96667B69 |
| 3 | Scan label in "Échanges" → `PUT /api/runsheets/71/items/confirm-exchange-scan` `{"code":"ECH-96667B69"}` | yes | once, 22:04:42 → 200 exchangeConfirmed |

The allow-list only let approved requests through on the approved ids. The
confirm scan was only allowed with the exact code returned by step 2.

## Answers

**How is a runsheet validated?**
1. When no parcel is left pending (delivered + failed = total), the row gets
   a **"Traiter la tournée"** button.
2. It opens the processing window. Validation unlocks when **every failed
   parcel has been scanned back at Entrée Stock** (`RTN_DEPOT`) and **every
   delivered exchange is confirmed**. Choosing Espèces/Chèque for delivered
   parcels is optional.
3. **"Valider la tournée"** sends `PUT /api/runsheets/{id}/complete`. Status
   becomes `COMPLETED` ("Validée") with `completedAt`. `validatedAt` and
   `validatedBy` are not set.

**What does the app show at the end of a run, and after validation?**
- End of run: "All packages done - nothing left to deliver". Nothing else.
- After validation: the same Current screen. In History, a "closed by the
  agency" banner, and each parcel shows "Run closed" instead of "Update".

**How do attempt numbers work?**
- A failed parcel stays `EN_COURS` until the agency scans it at Entrée Stock.
  That scan makes it `RTN_DEPOT` and counts the attempt: 1/3, then 2/3.
- Beyond 3 → "Retour définitif" (page rules).
- A `RTN_DEPOT` parcel can go on a new runsheet with no warning. P4 failed
  once, then was delivered on its 2nd run.
- The number lives in the parcel's `deliveryAttempts`. The web shows it at
  Entrée Stock. **Our app doesn't show it.**

**How does an exchange work end to end?**
1. Sender ticks Échange = Oui. No other data (no item description, no reason).
2. Lists show no exchange marker. The runsheet item carries `exchange: true`.
3. Driver: our app shows nothing special. The driver just delivers it.
4. Agency, processing window: P5 waits under "à imprimer" and "À scanner —
   Échange". The agency prints an exchange return label (code `ECH-…`), then
   scans that code → `exchangeConfirmed: true`.
5. Only then can the run be validated.
6. No return parcel was created at any point up to validation. What the
   driver brings back is tracked only by the ECH label.

**How does a transfer work for the driver?** Not tested (Part C stopped).
From the web code: DRAFT → "Assigner chauffeur" (`PUT
/api/transfers/{id}/assign-driver` `{driverId, driverName,
vehicleRegistration, driverPhone}`) → "Valider" (`POST
/api/transfers/{id}/validate`) → `READY_FOR_PICKUP` ("En attente du
chauffeur") → the driver confirms pickup in the app (`POST
/api/transfers/{id}/confirm-pickup?driverId=`) → the destination hub receives
it by scanning at Arrivages.

## Problems found

Web / server:
1. **Test data mixed into real data:** at Entrée Stock the server added P6 to
   someone else's draft transfer (TRF-FA75ED72) instead of a new one. There's
   no way to keep a test transfer separate.
2. **One parcel in two transfers:** TUN-100-C9166BCA (not ours) is in
   TRF-FA75ED72 (DRAFT) and TRF-7423B7F0 (READY_FOR_PICKUP) at the same time.
   TRF-7423B7F0 is "waiting for driver" but has no driver id.
3. **validatedAt / validatedBy never set:** "Valider la tournée" calls
   `/complete`, not `/validate`.
4. **"Montant total livré" stays 0,000 DT** after 4 deliveries on 2 closed
   runs. Probably it only counts parcels with a payment method chosen.
5. **Exchange parcels aren't marked** in the sender or agency parcel lists.
6. **Exchange label print** opens a print window that blocks the page until
   closed. Normal for a user, but the flow can't continue without printing.
7. **A failed parcel shows "En cours"** in Tous les Colis until it's scanned
   back (seen again for P2 and P4).
8. **Server very slow once** during B7 (pages over 90 s to load; it
   recovered after a few minutes). It happened once before, in exploration round 2.

App:

9. **No exchange support:** P5 looked like a normal parcel. The driver isn't
   told to collect anything.
10. **History crash warning — duplicate keys:** rows are keyed by tracking
    number. A parcel on two runs (mourad has 4 old ones, plus P2 and P4 now)
    triggers "Encountered two children with the same key" (seen on
    TRK-DCECF38B). Rows may be dropped or duplicated.
11. **Uncaught `ApiError: network`** in the app log.
12. **Prices show "10,000 TND"** in the English app, which reads as ten thousand.
13. **No difference between "run finished" and "run closed"** on the Current
    tab; only History shows it.
14. **The delivery attempt number isn't shown** (`deliveryAttempts` is read but unused).

## blocked.json

**Empty (`[]`).** No write was aborted in round 2.

## writes.json — every write the browser sent (Tunis time)

| Time | Step | Request |
|---|---|---|
| 21:31:16 | A2 | `POST /api/stock-entry/scan` P4 |
| 21:36:02 | A3 | `PUT /api/runsheets/70/complete` (approved) |
| 21:42:17 | B1 | `POST /api/sender-portal/parcels` (P5, test body checked) |
| 21:42:57 | B2 | `POST /api/stock-entry/scan` P5 |
| 21:43:15 | B3 | `POST /api/runsheets/create-and-scan` P2, driver 3, TUN-261 → run 71 |
| 21:43:17 | B3 | `POST /api/runsheets/71/scan` P4 |
| 21:43:20 | B3 | `POST /api/runsheets/71/scan` P5 |
| 21:51:14 | B5 | `POST /api/stock-entry/scan` P2 |
| 22:02:22 | B7 | `POST /api/runsheets/71/items/141/exchange-label` (approved) |
| 22:04:42 | B7 | `PUT /api/runsheets/71/items/confirm-exchange-scan` `{code: ECH-96667B69}` (approved) |
| 22:06:09 | B7 | `PUT /api/runsheets/71/complete` (approved, reused) |
| 22:08:32 | C1 | `POST /api/sender-portal/parcels` (P6, test body checked) |
| 22:09:35 | C2 | `POST /api/stock-entry/scan` P6 |

Writes done by the user in the app (not through the browser): deliver P3 and
fail P4 on run 70; confirm + start run 71; fail P2, deliver P4 and P5.

## Cleanup list for Jihed

Rounds 1 and 2 together:

- **Runsheets:** RS-20260930-0001 (id 70), RS-20260930-0002 (id 71). Both COMPLETED.
- **Parcels** (recipient "TEST AMYYN", address "TEST - NE PAS LIVRER"):
  - 126 TUN-100-DEC8AC59 — DELIVERED
  - 127 TUN-100-78CF079C — RTN_DEPOT (attempt 2/3)
  - 128 TUN-100-7FAD7390 — DELIVERED
  - 129 TUN-100-71DEEE7A — DELIVERED
  - 130 TUN-100-01B70C0B — DELIVERED, exchange
  - 131 TUN-100-6107B96B — AU_DEPOT, **inside TRF-FA75ED72**
- **Transfer:** P6 (131) must be taken out of **TRF-FA75ED72 (id 3)**, which
  belongs to other work. We didn't touch that transfer.
- **Exchange label:** ECH-96667B69 (id 1) on run 71, item 141.
- Delivered parcels count in the delivered totals and the sender's figures
  (moncef).
