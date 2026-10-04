# Live test, round 4 — the transfer flow

Date: 2026-10-02, 21:11–21:22 (Tunis time). Server: https://jibex.cloud.
Web side: Playwright driving a visible Microsoft Edge window, agency account
(agency head of Tun-100). Driver side: our iOS app (Expo Go) as mourad
(driver 3), done by hand by the user.

Only this report is in git. Screenshots (`shots/`), `test-log.md`,
`writes.json`, `blocked.json` and `approvals.json` stay local, in the gitignored `test-run-4/` folder.

Jihed allowed us to use transfer **TRF-FA75ED72 (id 3)** with the 3 parcels
of his that are in it.

**Result:** assignment, validation and the driver's pickup all work
(T0–T5 done). Reception (T6) was approved, but I stopped it after one
parcel: from this account the scan is **not** a reception at the
destination. 4 of the 5 parcels are still in transit, and the transfer is
still open.

## The transfer and its parcels

TRF-FA75ED72 (id 3), HUB_RELAY, Tun-100 → sous-003 (jihedb, Sousse).

| Parcel | Tracking | Final hub | Before | After pickup | Now |
|---|---|---|---|---|---|
| Jihed's | TUN-100-51B62DC7 | tata | AU_DEPOT | EN_TRANSIT_AGENCE | EN_TRANSIT_AGENCE |
| Jihed's | TUN-100-699F0F1D | jihedb | AU_DEPOT | EN_TRANSIT_AGENCE | EN_TRANSIT_AGENCE |
| Jihed's | TUN-100-C9166BCA | tata | AU_DEPOT | EN_TRANSIT_AGENCE | EN_TRANSIT_AGENCE |
| P6 (ours, id 131) | TUN-100-6107B96B | jihedb | AU_DEPOT | EN_TRANSIT_AGENCE | **AU_DEPOT_RELAIS**, also in new TRF-BDA62120 |
| P7 (ours, id 133) | TUN-100-561D8F37 | tata | AU_DEPOT | EN_TRANSIT_AGENCE | EN_TRANSIT_AGENCE |

## Steps

**T0 — State before (read-only).**
- TRF-FA75ED72: `DRAFT`, no driver, 5 parcels, all `AU_DEPOT`, note "Créé
  automatiquement — routage à l'entrée stock".
- TRF-7423B7F0 (id 32, never touched): `READY_FOR_PICKUP`, driver name
  "jihed" but no driver id, 1 parcel: TUN-100-C9166BCA (also in transfer 3).
- Page buttons: "Nouveau Transfert", "Assigner chauffeur", "Annuler",
  "Consulter les N colis". Shot `01`.

**T1 — "Assigner chauffeur".** Dialog "Assigner un chauffeur TRF-FA75ED72".
Choosing mourad fills in plate TUN-261 and his phone automatically.
`PUT /api/transfers/3/assign-driver {driverId:3, driverName:"mourad",
vehicleRegistration:"TUN-261", driverPhone}` → 200.
- Status stays **`DRAFT`** ("Brouillon"). The button becomes "Valider".
- Parcels unchanged. Shots `02`, `03`.

**T2 — "Valider".** `POST /api/transfers/3/validate` → 200. Expected
READY_FOR_PICKUP. **Actual: as expected**, "En attente du chauffeur — En
attente de confirmation du chauffeur", validatedAt 21:12:05. The parcel that
sits in two transfers did not block it. Parcels still `AU_DEPOT`.
The driver account now sees the transfer (5 parcels). Shots `04`, `05`.

**T3 — Driver (app).**
- Saw the transfer, pressed **Confirm**. It was then labelled "awaiting handover".
- Then scanned: the phone vibrates and shows "1 package scanned", about a
  second later vibrates again and shows 2, and so on **endlessly**.
- Nothing else happens. The transfer is still in the list.

**T4 — After the driver step.** Expected: in transit. **Actual: as expected.**
- Transfer **`IN_TRANSIT`** ("En transit vers jihedb"), confirmedAt and
  shippedAt 21:13:43.
- All 5 parcels **`EN_TRANSIT_AGENCE`**. Parcel history: "Prise en charge
  transfert TRF-FA75ED72 par le chauffeur".
- TRF-7423B7F0 is still `READY_FOR_PICKUP`, although its only parcel is now
  in transit on the other transfer. Shots `06`, `07`.

**T5 — Destination side (read-only).**
- Transferts → Arrivages: "0 agence(s) source(s) · Aucun transfert entrant
  en attente". Our transfer is **not visible**. The page only lists
  transfers going *to* the account's own agency (Tun-100); ours goes to sous-003.
- **No agency switch** anywhere (no dropdown, no menu entry).
- But the reception page opens by direct address, `/transfers/3/scan`:
  "TRANSFERT EN COURS — jihed agence → jihedb — 0 / 5", with a scan box.
  Shots `08`–`10`.

**T6 — Reception (approved, stopped after 1 parcel).**
- Approval gate → "yes", on the condition I proposed: P6 first, the other 4
  only if P6 is received cleanly.
- Scanned P6 on `/transfers/3/scan`: `POST /api/stock-entry/scan
  {"trackingNumber":"TUN-100-6107B96B"}` → 200, `success: true`,
  `transferNumber: TRF-FA75ED72`. Screen: "✓ Colis ajouté", counters 1 / 5.
- **But it was not a reception at Sousse:**
  - New status **`AU_DEPOT_RELAIS`**, message "↪ Colis arrivé au dépôt
    relais — transfert TRF-FA75ED72. **Un nouveau transfert sera nécessaire
    vers la destination finale.**" Yet sous-003 *is* P6's final destination.
  - The server created a **new draft transfer TRF-BDA62120 (id 33)**,
    INTER_AGENCY, **Tun-100 → sous-003**, holding P6.
  - So the server treated the scan as an arrival at the scanning account's
    own agency (Tun-100, the sender), and queued P6 to be sent to Sousse again.
- **I stopped.** The other 4 parcels were not scanned. TRF-BDA62120 was not
  touched. Shot `11`.

**T7 — Driver after reception.** Not done as planned, because there was no
real reception. The user's T3 note covers the current view: the transfer is
still listed, "awaiting handover".

**T8 — Final states.** Transfer 3 `IN_TRANSIT`, scannedCount 1, receivedAt
empty. See the table above. Shot `12`.

## Approvals

| # | Asked | Answer | Sent |
|---|---|---|---|
| – | `PUT /api/transfers/3/assign-driver` (pre-approved, transfer 3 only) | – | once, 21:11:35 → 200 |
| – | `POST /api/transfers/3/validate` (pre-approved, transfer 3 only) | – | once, 21:12:06 → 200 |
| 1 | Reception scan on `/transfers/3/scan` → `POST /api/stock-entry/scan {"trackingNumber": …}`, one per parcel, for the 5 parcels of transfer 3. I said the outcome was unknown and proposed P6 first. | yes | once, 21:21:14, P6 only → 200. The other 4 were not sent. |

The guard allowed assign-driver only with driver 3 and plate TUN-261, and
only on transfer 3. No request to any other transfer was made.

## How a transfer works for the driver, from assignment to reception

1. **Creation.** When the agency scans an inter-agency parcel at Entrée
   Stock, the server puts it in a draft transfer to the next hop (one shared
   draft per hop).
2. **Assignment (agency).** "Assigner chauffeur": driver, plate, phone. The
   transfer stays a draft.
3. **Validation (agency).** "Valider" → `READY_FOR_PICKUP` ("En attente du
   chauffeur"). Only now does the driver's app list it.
4. **Pickup (driver).** In the app: Transfers → **Confirm**. One tap, no
   scan, no count. Server: transfer `IN_TRANSIT`, every parcel
   `EN_TRANSIT_AGENCE`.
5. **On the road.** The app shows the transfer as "awaiting handover", with
   "Show QR" and "Scan to confirm". Neither changes anything on the server.
6. **Reception (destination agency).** The destination hub scans each parcel
   on its Arrivages page. That is what ends the transfer. **The driver has
   no action for it**, and the app has no "delivered to hub" step.
7. A parcel whose final hub is further away (P7 → tata) would then need a
   new transfer from that hub. Not observed, because reception could not be
   done properly from this account.

## Problems found

Web / server:
1. **Wrong-agency reception is accepted and mis-routes the parcel.** The
   sending agency's account can open `/transfers/3/scan` and scan. The server
   answers success, counts the parcel on the transfer (1/5), marks it "at
   relay depot" and creates a new draft back to the same destination. There
   is no check that the scanner belongs to the destination agency.
2. **P6 is now in two transfers** (TRF-FA75ED72, in transit, and the new
   draft TRF-BDA62120), like TUN-100-C9166BCA before it.
3. **TRF-7423B7F0 is stale:** still "waiting for driver" while its only
   parcel is in transit on another transfer. It has a driver name but no driver id.
4. **Arrivages hides the page but not the action:** the reception page isn't
   in the menu for this account, yet it works by address.
5. **Assigning a driver doesn't notify or show anything to the driver**
   until the transfer is validated (two separate steps for the agency).
6. **Pickup needs no proof:** one tap moves 5 parcels to "in transit", with
   no scan and no count check.

App:

7. **The scanner counts the same code endlessly.** After a successful scan it
   unlocks after 0.9 s and reads the same code again: "1 package scanned",
   2, 3… It never remembers what was already scanned.
8. **"Scan to confirm" does nothing real.** In real mode the scanner only
   looks the code up on the phone. It can't complete a transfer, but the
   button's name suggests it does.
9. **No end state for the driver:** the transfer stays "awaiting handover"
   until the destination agency receives it. The app doesn't say that.
10. Earlier app problems still stand (no refresh on open, no attempt number,
    History duplicate keys, "10,000 TND", no exchange support).

Mine:

11. My automatic "clean reception" test (success + right transfer number)
    passed for P6. I stopped by reading the answer myself: the status and the
    new transfer showed it was not a real reception. The check was too weak.

## blocked.json

**Empty (`[]`).** No write was aborted this round.

## writes.json — every write the browser sent (Tunis time)

| Time | Step | Request |
|---|---|---|
| 21:11:35 | T1 | `PUT /api/transfers/3/assign-driver` `{driverId:3, driverName:"mourad", vehicleRegistration:"TUN-261", driverPhone}` (pre-approved) |
| 21:12:06 | T2 | `POST /api/transfers/3/validate` (pre-approved) |
| 21:21:14 | T6 | `POST /api/stock-entry/scan` `{trackingNumber: P6}` (approved) |

Write done by the user in the app: confirm pickup of transfer 3
(`POST /api/transfers/3/confirm-pickup?driverId=3`), at 21:13:43. The app's
scans sent nothing.

## Cleanup list for Jihed — rounds 1 to 4

**Needs action soon (round 4):**
- **TRF-FA75ED72 (id 3)** is `IN_TRANSIT` with mourad, 1/5 scanned. Its 4
  remaining parcels (TUN-100-51B62DC7, TUN-100-699F0F1D, TUN-100-C9166BCA and
  our TUN-100-561D8F37) are `EN_TRANSIT_AGENCE`. They need to be received
  **from the sous-003 account**, or reset.
- **TRF-BDA62120 (id 33)**: new draft created by the server, Tun-100 →
  sous-003, holding only our parcel 131. To delete.
- **Parcel 131 (TUN-100-6107B96B)**: `AU_DEPOT_RELAIS`, in both transfers above.
- **TRF-7423B7F0 (id 32)**: not touched by us, but its parcel
  TUN-100-C9166BCA is now in transit on transfer 3.

**Runsheets** (all COMPLETED, mourad): RS-20260930-0001 (70),
RS-20260930-0002 (71), RS-20261002-0001 (72), RS-20261002-0002 (73).

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

**Pickup:** PU-3-20261002-0001 (id 41), COMPLETED.
**SAV cases:** 26 (parcel 127) and 27 (parcel 129), both OPEN when last checked (round 3).
**Exchange label:** ECH-96667B69 (id 1), run 71, item 141.
