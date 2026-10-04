# Live test, round 3 — report

Date: 2026-10-02, 20:36–20:58 (Tunis time). Server: https://jibex.cloud.
Web side: Playwright driving a visible Microsoft Edge window, sender and
agency accounts. Driver side: our iOS app (Expo Go) as mourad (driver 3),
done by hand by the user.

Only this report is in git. Screenshots (`shots/`), `test-log.md`,
`writes.json`, `blocked.json` and `approvals.json` stay with the developer, outside the repository (folder `test-run-3/`). The shared
parcel list is `test-run/test-parcels.json`.

**Result:** Part D (pickup) and Part E (repeated failures) done. Part C
stopped at C2 (rule 5), as predicted before it started: there is no way to
get a transfer of our own from this agency.

Note: the web app was updated between rounds 2 and 3 (`main.9e82a1a6.js`).
The new code only adds sender API-credential and e-commerce store features.
Everything we use is unchanged.

## Test data created this round

| | Tracking | Id | Step | Final status |
|---|---|---|---|---|
| P7 | TUN-100-561D8F37 | 133 | C1 | AU_DEPOT, inside transfer TRF-FA75ED72 (not ours) |
| P8 | TUN-100-99BF3AE7 | 132 | D1 | AU_DEPOT (picked up, then stock entry) |
| P2 | TUN-100-78CF079C | 127 | (round 1) | **A_VERIFIER** after 4 failed attempts |

- **Runsheets:** RS-20261002-0001 (id 72) and RS-20261002-0002 (id 73), both
  COMPLETED ("Validée"), each with P2 only.
- **Pickup:** PU-3-20261002-0001 (id 41), COMPLETED, P8 only.
- **Transfer:** none of ours. P7 joined **TRF-FA75ED72** (id 3), like P6.

## Steps

### Part C — transfer to hub tata (stopped)

**Before C1 (read-only).** `GET /api/transfers/routing/next-step` says a
Tataouine parcel leaves Tun-100 by **Tun-100 → sous-003 → 111 (tata)**. No
direct route. So it shares its first hop with Sousse parcels. The user chose
to run C anyway to confirm.

**C1 — Sender creates P7** (Tataouine / Tataouine Nord). `PENDING`,
destination **tata (111)**, marked "⇄ Inter-agences". Shots `15`–`17`.

**C2 — Entrée Stock P7.** `AU_DEPOT`, "1ère entrée". Destination tata.
- **No new transfer.** The server added P7 to the existing draft
  **TRF-FA75ED72** (HUB_RELAY, Tun-100 → sous-003, "Créé automatiquement —
  routage à l'entrée stock").
- Full parcel list (5): TUN-100-51B62DC7, TUN-100-699F0F1D, TUN-100-C9166BCA
  (**not ours**), TUN-100-6107B96B (P6, ours), TUN-100-561D8F37 (P7, ours).
- **Rule 5 → Part C stopped.** C3–C5 not done; no approval asked. Shots `18`, `19`.

### Part D — pickup

**D1 — Sender creates P8** (Tunis / Bardo), `PENDING` ("En attente").
- How a sender asks for a pickup: in **Mes Colis**, tick the parcel's
  checkbox. A green **"Pickup (N)"** button appears at the top.
  (The list is no longer newest-first; the "En attente" filter finds it.)
- Approval gate → approved → "Pickup (1)" →
  `POST /api/pickups/request {"senderId":2,"parcelIds":[132]}`.
- Message "Demande de pickup envoyée avec succès". Pickup
  **PU-3-20261002-0001** (id 41), `PENDING`. P8 → **`A_ENLEVER`** ("À enlever").
  The sender's Manifestes Pickup shows it "En Attente". Shots `01`–`03`, `06`, `07`.

**D2 — Agency assigns a driver.**
- Pickups page: our row says "Non assigné · En attente" with a **"Planifier"**
  button. It opens "Planifier le Pickup": Chauffeur * and Date et heure *.
- Approval gate → approved → mourad, 02/10 21:30 →
  `PUT /api/pickup-requests/41/schedule?driverId=3&scheduledAt=2026-10-02T21:30`.
- "Pickup planifié avec succès". Pickup **`SCHEDULED`** ("Planifié"), driver 3.
  The button becomes "Re-planifier". P8 stays `A_ENLEVER`. Shots `08`, `22`, `23`.

**D3 — Driver (app).** Opened Pickups, selected the pickup, pressed Done.
"It worked fine." No scan, no other screen. (Code: the app sends
`PUT /api/pickup-requests/41/start`, then `/complete`.)

**D4 — After the driver step.**
- Pickup: **`COMPLETED`** ("Terminé" for the agency), completedAt 20:56:53.
- The sender's manifest list shows the same pickup as **"En Cours"**.
- **P8 is unchanged: still `A_ENLEVER`, no driver, no pickedUpAt.**
- Entrée Stock P8: "✅ Colis réceptionné au dépôt — 1ère entrée",
  `A_ENLEVER` → **`AU_DEPOT`**. Shots `26`–`29`.

### Part E — repeated failures of P2

P2 started this round at `RTN_DEPOT`, attempt 2/3.

**E1 — Run 3 for P2.** Runsheet → Ajouter → mourad (TUN-261) → scan P2:
accepted, "Tournée RS-20261002-0001 créée — colis ajouté avec succès".
Driver: confirmed, failed P2 with "Client absent". Nothing unusual, **no
attempt number shown** in the app. Shots `04`, `05`.

**E2 — Entrée Stock P2.** Expected 3/3. **Actual: as expected.** `RTN_DEPOT`,
attempts 3: "↩ Retour dépôt — tentative n°3/3. **Dernière tentative
autorisée — prochain retour sera définitif.**" Shot `09`.

**E3 — Validate run 72** (`/complete`, pre-approved). Footer before:
"Tournée validable — 1 anomalie(s) restent à confirmer, traitables après
validation." → `COMPLETED` ("Validée"). Shots `10`, `11`.

**E4 — Once more.**
- New runsheet with P2: **accepted** (a 4th run), RS-20261002-0002, same
  message, no warning. Shots `12`, `13`.
- Driver: confirmed, failed P2 with "Client absent". No attempt number.
  **The new runsheet did not appear when the app was opened; the user had to
  go to the Home tab and refresh.**
- Entrée Stock P2. Expected "Retour définitif". **Actual: different.**
  "🔎 **4 tentatives épuisées — colis transmis au SAV pour vérification, en
  attente de décision.**" Status **`A_VERIFIER`**, attempts 4. History line:
  "Retour n°4 au dépôt". Shot `20`.
- Validate run 73 (`/complete`, pre-approved) → `COMPLETED`. Shots `24`, `25`.
- P2 final status: **`A_VERIFIER`** ("À vérifier").

## Approval gates

| # | Asked | Answer | Sent |
|---|---|---|---|
| 1 | "Pickup (1)" → `POST /api/pickups/request` `{"senderId":2,"parcelIds":[132]}` (P8 only) | approved | once, 20:46:32 → 200, PU-3-20261002-0001 |
| 2 | "Planifier" → `PUT /api/pickup-requests/41/schedule?driverId=3&scheduledAt=2026-10-02T21:30`, body `{}` | approved | once, 20:54:29 → 200, SCHEDULED |
| – | Part C decision (skip / do anyway / manual transfer) | "do C" | C1, C2 run; stopped by rule 5 |

The guard only allowed approval 1 with exactly `parcelIds:[132]` and
`senderId:2`, and approval 2 only on pickup 41 with driver 3.
`PUT /api/runsheets/{id}/complete` was pre-approved for runs created this
round only (72, 73). No transfer write was requested or sent.

## Answers

**How does a transfer work for the driver?** Still not tested live. From
this agency, every inter-agency parcel is put at Entrée Stock into **one
shared draft transfer per next hop** (here Tun-100 → sous-003), whatever its
final hub. That draft already holds other people's parcels, so we could not
own one. From the web code, the rest is: "Assigner chauffeur"
(`PUT /api/transfers/{id}/assign-driver`) → "Valider"
(`POST /api/transfers/{id}/validate`) → `READY_FOR_PICKUP` → the driver
confirms pickup in the app (`POST /api/transfers/{id}/confirm-pickup?driverId=`)
→ the next hub receives by scanning at Arrivages. The driver account
currently sees one old transfer (TRF-7093829A, COMPLETED).

**How does a pickup work for the driver?**
1. Sender ticks parcels in Mes Colis → "Pickup (N)". Parcels become "À enlever".
2. Agency → Pickups → "Planifier": driver + date/time. Pickup becomes "Planifié".
3. Driver: the pickup appears in the app's Pickups. One tap on **Done**
   starts and completes it. No parcel scan, no count check.
4. The pickup is "Terminé". **The parcels don't change**: they stay
   "À enlever" with no driver until the agency scans them at Entrée Stock
   ("1ère entrée" → "Au dépôt").

**What happens after 3 failures?**
- Each failure + Entrée Stock scan counts one attempt: 1/3, 2/3, 3/3. At 3/3
  the message warns "Dernière tentative autorisée — prochain retour sera définitif."
- The server still accepts the parcel on a **4th runsheet**, with no warning.
- After the 4th failure, Entrée Stock does **not** make it "Retour
  définitif". It becomes **`A_VERIFIER`** and goes to SAV (after-sales):
  "4 tentatives épuisées — colis transmis au SAV pour vérification, en
  attente de décision." A person then decides.
- The driver sees none of this: the app shows no attempt number.

## Problems found

Web / server:
1. **No isolated transfers:** one shared draft per next hop. P7 (bound for
   tata) and P6 (bound for Sousse) both joined other people's TRF-FA75ED72.
2. **Message vs behaviour:** at 3/3 the server says the next return "sera
   définitif", but the 4th return gives `A_VERIFIER` (SAV), not
   `RETOUR_DEFINITIF`. The Entrée Stock page rules say the same wrong thing
   ("Au-delà de 3 → Retour définitif").
3. **A 4th delivery attempt is allowed** after "dernière tentative autorisée".
4. **Completing a pickup doesn't touch its parcels:** P8 stayed `A_ENLEVER`,
   no driver, no pickedUpAt. Nothing records that the driver holds it.
5. **Pickup status differs by role:** agency "Terminé", sender "En Cours"
   for the same pickup (also seen in the first tour).
6. **Our failures opened SAV cases silently:** case 26 (P2, opened at its 1st
   failure on 30/09, origin "Anomalie runsheet") and case 27 (P4, opened when
   failed with "Client absent" on 30/09). Case 27 is **still OPEN although
   P4 was delivered** on its 2nd attempt. The web's own reason list does not
   mark ABSENT or NOT_AVAILABLE_RESCHEDULED as anomaly reasons.
7. **Sender's Mes Colis isn't sorted newest-first** any more; a new parcel
   is hard to find without a filter.
8. Still true from round 2: `validatedAt`/`validatedBy` never set; a failed
   parcel shows "En cours" until scanned back.

App:

9. **New runsheet not shown on opening the app.** The user had to go to Home
   and refresh. No push or automatic refresh.
10. **No attempt number** on a parcel (3rd and 4th attempts looked like a
    first attempt).
11. **Pickup "Done" has no check:** no scan and no parcel count; one tap
    completes it.
12. **`A_VERIFIER` on a runsheet parcel:** worth checking how the app shows
    it in History (it maps this code to "pending" for searched parcels).
13. Round 2's app problems are still open (History duplicate keys — P2 is
    now on 4 runs; "10,000 TND"; no exchange support).

Test tooling (mine):

14. My guard blocked the first P7 creation by mistake (it matched round 2's
    P6, also made in a step called "C1"). Nothing was sent; fixed and retried.
15. My "is this our pickup?" check misread the Planifier dialog once and
    stopped before sending anything; fixed and retried.

## blocked.json

One entry, a false alarm from my own guard:

| Time | Step | Request | Reason |
|---|---|---|---|
| 20:48:33 | C1 | `POST /api/sender-portal/parcels` (our own P7 form) | "this step already created its parcel" (guard bug, see 14) |

No write to anyone else's data was attempted.

## writes.json — every write the browser sent (Tunis time)

| Time | Step | Request |
|---|---|---|
| 20:36:12 | D1 | `POST /api/sender-portal/parcels` (P8, test body checked) |
| 20:40:27 | E1 | `POST /api/runsheets/create-and-scan` P2, driver 3, TUN-261 → run 72 |
| 20:46:32 | D1 | `POST /api/pickups/request` `{senderId:2, parcelIds:[132]}` (approved) |
| 20:47:13 | E2 | `POST /api/stock-entry/scan` P2 |
| 20:47:31 | E3 | `PUT /api/runsheets/72/complete` (pre-approved) |
| 20:47:54 | E4 | `POST /api/runsheets/create-and-scan` P2, driver 3, TUN-261 → run 73 |
| 20:49:49 | C1 | `POST /api/sender-portal/parcels` (P7, test body checked) |
| 20:50:47 | C2 | `POST /api/stock-entry/scan` P7 |
| 20:53:51 | E4 | `POST /api/stock-entry/scan` P2 |
| 20:54:29 | D2 | `PUT /api/pickup-requests/41/schedule?driverId=3&scheduledAt=2026-10-02T21:30` (approved) |
| 20:55:07 | E4 | `PUT /api/runsheets/73/complete` (pre-approved) |
| 20:58:06 | D4 | `POST /api/stock-entry/scan` P8 |

Writes done by the user in the app: confirm + start runs 72 and 73; fail P2
twice ("Client absent"); start + complete pickup 41.

## Cleanup list for Jihed — rounds 1 to 3

**Runsheets** (all COMPLETED, driver mourad):
- RS-20260930-0001 (id 70), RS-20260930-0002 (id 71)
- RS-20261002-0001 (id 72), RS-20261002-0002 (id 73)

**Parcels** (recipient "TEST AMYYN", address "TEST - NE PAS LIVRER", sender moncef):

| Id | Tracking | Status |
|---|---|---|
| 126 | TUN-100-DEC8AC59 | DELIVERED |
| 127 | TUN-100-78CF079C | A_VERIFIER (4 attempts, in SAV) |
| 128 | TUN-100-7FAD7390 | DELIVERED |
| 129 | TUN-100-71DEEE7A | DELIVERED |
| 130 | TUN-100-01B70C0B | DELIVERED, exchange confirmed |
| 131 | TUN-100-6107B96B | AU_DEPOT, **in TRF-FA75ED72** |
| 132 | TUN-100-99BF3AE7 | AU_DEPOT |
| 133 | TUN-100-561D8F37 | AU_DEPOT, **in TRF-FA75ED72** |

**Transfer:** take parcels 131 and 133 out of **TRF-FA75ED72 (id 3)**. We
never assigned, validated or changed that transfer ourselves.

**Pickup:** PU-3-20261002-0001 (id 41), COMPLETED.

**SAV cases:** 26 (parcel 127, OPEN) and 27 (parcel 129, OPEN).

**Exchange label:** ECH-96667B69 (id 1), run 71, item 141.

Also affected: the sender's totals and invoices (4 delivered test parcels at
10 TND), and mourad's delivery statistics.
