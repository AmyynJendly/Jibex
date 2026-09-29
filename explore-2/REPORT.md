# Web app exploration, round 2 — report

Read-only look at https://jibex.cloud on 2026-09-29, with the sender and
agency-head accounts. Robot browser: Playwright driving Microsoft Edge.

**Nothing on the server changed.** Every request that wasn't a read was
aborted, except the login. No write was even attempted (see part 5).

Files (all in `explore-2/`, private data kept local, only this report is in git):

- `sender/*.png`, `agency/*.png` — screenshots, numbered.
- `api-calls.json` — every GET call per screen: URL, status, sample
  (names, phones, addresses masked).
- `blocked.json` — every stopped write (empty).
- `notes-*.json` — dropdown options and screen texts, recorded as text.
- `delegations.json` — the full governorate → delegation table.
- `_scripts/` — the scripts, to re-run this.

---

## 1. Each item

### S1 — "Nouveau Colis" form (sender)
File: `sender/01-S1-new-parcel-form-empty.png`

A pop-up with two blocks. `*` = required by the form.

- **Destinataire** (recipient): Tél *, Tél 2, Nom *, Adresse *, Gouvernorat *,
  Délégation * (locked until a governorate is picked), Commentaire.
- **Informations du Colis**: Prix (TND) *, NB Pièces (default 1),
  Désignation *, Poids (Kg) * (default 1), Échange * (Oui/Non, default Non),
  Type * (default FIX), Fragile (Oui/Non), Ouverture (Oui/Non).
- Buttons: Annuler, Créer (not clicked).

The sender's own name, phone and address are not on the form. They are
added from the account.

### S2 — The form's dropdowns (sender)
Files: `sender/02-S2-governorate-list.png`, `03-S2-delegation-list-Tunis.png`,
`04-S2-delegation-list-Sousse.png`, `05-S2-type-list.png`

The form has only 3 dropdowns. Échange, Fragile and Ouverture are Oui/Non buttons.

- **Gouvernorat**: 24 governorates, A to Z.
- **Délégation**: depends on the governorate. 256 in total.
  - Tunis (15): Tunis Médina, Bab Bhar, Bab Souika, Omrane, Omrane Supérieur,
    El Tahrir, El Menzah, Cité El Khadra, Bardo, Le Kram, La Goulette,
    Carthage, Sidi Bou Said, La Marsa, Sidi Hassine.
  - Sousse (16): Sousse Médina, Sousse Riadh, Sousse Jawhara, Sousse Sidi
    Abdelhamid, Hammam Sousse, Akouda, Kalâa Kebira, Sidi Bou Ali, Hergla,
    Enfidha, Bouficha, Kondar, Sidi El Hani, M'saken, Kalâa Seghira, Messaadine.
- **Type**: FIX - Fixe, ONP - On Pickup, BLK - Bulk, SMD - Same Day.

**API: none.** Both lists are a fixed table inside the web app's code, not a
server call. The saved city is the two joined: `"Governorate, Delegation"`.
Two spellings differ from our iOS app: the web uses **"Kef"** (we use
"Le Kef") and **"Kebili"** (we use "Kébili"). Our matcher already handles both.

Note: a browser's native dropdown can't be screenshotted while open. So each
one was shown as an expanded list, on my screen only, and its options were
also saved as text.

### S3 — Pickup manifest PU-3-20260929-0003 (sender)
File: `sender/06-S3-manifest-PU-3-20260929-0003.png`

Status "Validé", agency, requested date 29/09/2026, driver "Non assigné",
1 parcel, 1.0 kg, 15.000 DT. Parcel table: tracking, recipient, city, weight,
amount, status ("Au dépôt"), print ticket.
API: `GET /api/sender-portal/pickup-manifests/40` (server status `COMPLETED`).

### S4 — Mon Profil, full page (sender)
File: `sender/07-S4-profile-full.png`

Identity (email, phone, address, contact person, status, creation date),
price list (FIX 10/5, ONP 12/6, BLK 8/2.5, SMD 15/10 TND delivery/return,
exchange fee 4.980), **Fréquence de Paiement: Hebdomadaire, billed every
Friday**, and Sécurité (change password). Personal details can only be
changed by the administrator.
API: `GET /api/sender-portal/profile`.

### A1 — Runsheet → Ajouter (agency)
Files: `agency/01-A1-step1-choose-driver.png`, `02-A1-step2-after-driver.png`,
`15-A1b-step3-scan-screen.png`

1. **Sélectionner le chauffeur**: one card per driver (name, phone). Picking
   one shows its vehicle plate, which can be edited ("Matricule du véhicule").
2. **Créer la tournée par scan**: a single "Commencer le scan" button. There
   is no "Suivant" (next) button.
3. **Scan Douchette** pop-up: a scan box (focused automatically), a counter
   "0 colis scannés" and a "Terminer le scan" button. The text says: *"Scannez
   le premier colis pour créer la tournée"* and *"Au démarrage · SCANNED → EN
   TRANSIT · L'expéditeur sera notifié"*.

**The runsheet is created at the first scan.** Nothing was typed in the scan
box, so nothing was created. Driver 3 (our test driver) was the one picked.

APIs shown: `GET /api/drivers/company/3`. The scan would call (not called):
`POST /api/runsheets/create-and-scan` `{driverId, trackingNumber,
scheduledDate, notes, vehiclePlate}`, then `POST /api/runsheets/{id}/scan`
`{trackingNumber}`. Undo a scan: `DELETE /api/runsheets/{id}/scan/{tracking}`.

### A2 — Gestion Runsheet, a finished runsheet (agency)
Files: `agency/07-A2-management-all-dates.png`,
`16-A2b-finished-RS-20260827-0002.png`, `17-A2b-finished-RS-20260707-0002.png`

The date filter was widened to 01/07 → 29/09 (a filter, not a scan box).
18 runsheets. Top: total amount delivered (3 118,990 DT), parcels delivered
(13 of 22), driver ranking (empty: needs 20+ parcels). Table: code, driver,
plate, date, status, total, delivered, returned to depot, actions (print; for
unconfirmed runs also QR, reassign, delete).

Finished runsheets show **"Validée"** (server `COMPLETED`). Opening one lists
its parcels: tracking, recipient, phone, city, status, **Raison** (the
driver's failure reason, e.g. "Commande non conforme"), plus counts
(delivered / failed / waiting) and the run's duration in minutes.

APIs: `GET /api/runsheets`, `GET /api/runsheets/{id}/items`,
`GET /api/runsheets/delivered-stats?startDate&endDate`
(`{totalAmount, deliveredCount, takenCount}`),
`GET /api/runsheets/leaderboard?period=custom&startDate&endDate`,
`GET /api/drivers/company/3`.

### A3 — Two parcels: detail and status history (agency)
Files: `agency/03-A3-inter-agency-detail.png`, `04-A3-inter-agency-history.png`,
`05-A3-same-agency-detail.png`, `06-A3-same-agency-history.png`

There is **no parcel detail page**. Clicking a tracking number does nothing.
The "detail" is the table row: tracking, client, city, sender, agency
(with "Inter-agences" or "Même agence"), destination agency, driver, price,
status, dates. The row's "Voir l'historique" button opens the history.

- **TUN-100-C9166BCA** (inter-agency, Médenine, destination hub "tata"):
  1 step — *À enlever → Au dépôt*, 29/09 21:51, by the agency head, "Dépôt -
  Entrée stock", note "1ère réception au dépôt".
- **TUN-100-44FB2F50** (same agency, Tunis): 2 steps — *À enlever → Au dépôt*
  (21:23, "Entrée stock") then *Au dépôt → En cours* (21:25, "Création
  tournée", note "Création et scan dans tournée RS-20260929-0003").

API: `GET /api/parcel-history/parcel/{parcelId}`. Each step comes with the
**whole parcel record**, personal data included.

### A4 — SAV tabs (agency)
Files: `agency/08-A4-Anomalies-runsheet.png`, `09-A4-Historique-Anomalie.png`

- **Anomalies runsheet** (0): parcels scanned as an anomaly while the agency
  processes a finished run. Filters: À traiter, Ouverts, En vérification,
  Clos, Tous. Columns: parcel, recipient, reason, status, age.
- **Historique Anomalie** (empty): cases the user took on. Date range, search.
  Columns: parcel, recipient, reason, type, status, taken on, supervisor.
- The other tab, "Anomalies temporaires" (1), holds failures the driver
  reported during a run.

APIs: `GET /api/sav-cases?originType=…`, `GET /api/sav-cases/stats`,
`GET /api/sav-cases/my-history`.

### A5 — Transfer TRF-7423B7F0 parcels (agency)
File: `agency/10-A5-TRF-7423B7F0-parcels.png`

"Colis du Transfert — 1 colis": TUN-100-C9166BCA, to Médenine, Ben Gardane,
status "Au dépôt", 15.000 TND. Search box, "Fermer" button.
API: `GET /api/transfers/company/3` (the parcels ride inside each transfer).

### A6 — Dépôt → "Changer statut" (agency)
Files: `agency/11-A6-warehouse.png`, `12-A6-changer-statut-options.png`

**Not a dialog.** It is a dropdown in each row, and **choosing an option
changes the parcel at once** (`parcelId, status`). So no option was chosen;
the list was only displayed. Options: **En dépôt** (`IN_WAREHOUSE`),
**En transit** (`IN_TRANSIT`), **Livré** (`DELIVERED`). Each row also has a
"Retour" button (not clicked).

Two oddities: these codes are not the parcel codes used everywhere else
(`AU_DEPOT`, `EN_COURS`…), and the page's "En Dépôt" counter says 0 while
4 parcels are `AU_DEPOT`. Most rows also show raw codes (`A_ENLEVER`,
`LIVRE_PAYE`…) instead of labels.
API: `GET /api/parcels/company/3?…`.

### A7 — "Nouveau Transfert" and "Nouveau Retour" forms (agency)
Files: `agency/13-A7-new-transfer-form.png`, `14-A7-new-return-form.png`,
`18-A7b-new-transfer-driver-list.png`, `19-A7b-new-transfer-manual.png`

- **Créer un Transfert**: destination AUTO (worked out from the parcels) or
  MANUAL (pick a hub: "HUB — tata (111)" or "HUB — jihedb (sous-003)");
  parcels to transfer, added by **scan box** or manual search; driver
  (all fields required): Chauffeur, Matricule véhicule, Téléphone; Notes.
- **Créer un Retour**: destination is always each parcel's sender (handed
  over directly if the sender belongs to this agency, otherwise a transfer to
  its agency is created); parcels by scan box or search; same driver block.

The scan boxes were not touched, and the forms were closed.
APIs: `GET /api/agencies/company/3`, `GET /api/drivers/company/3`,
`GET /api/parcels/company/3`, `GET /api/transfers/company/3`.

### A8 — The "extra parcel" check
See part 4.

---

## 2. Parcel statuses

27 parcel status codes appear in the web app (labels from its screens).
✔ = our iOS app maps it (`toJobStatusFromParcel` in `services/real-api.ts`).

| Code | Web label | iOS maps to |
|---|---|---|
| CREATED | Créé | ✔ PENDING |
| PENDING | En attente | ✔ PENDING |
| A_ENLEVER | À enlever | ✔ PENDING |
| PICKUP | Pickup / Enlevé | ✔ PENDING |
| PICKED_UP | Collecté / Enlevé | ✔ PENDING |
| SCANNED | Scanné | ✔ PENDING |
| A_VERIFIER | À vérifier / Anomalie | ✔ PENDING |
| AU_DEPOT | Au dépôt | ✔ IN_TRANSIT |
| AU_DEPOT_RELAIS | Au dépôt relais | ✔ IN_TRANSIT |
| AU_DEPOT_DESTINATION | Au dépôt destination | ✔ IN_TRANSIT |
| EN_TRANSIT_AGENCE | En transit agence | ✔ IN_TRANSIT |
| IN_TRANSIT | En transit | ✔ IN_TRANSIT |
| EN_COURS | En cours (de livraison) | ✔ IN_TRANSIT |
| OUT_FOR_DELIVERY | En livraison | ✔ IN_TRANSIT |
| DELIVERED | Livré | ✔ DELIVERED |
| LIVRE_PAYE | Livré & Payé | ✔ DELIVERED |
| RTN_DEPOT | Retour dépôt | ✔ FAILED |
| RETOUR_A_CHARGER | Retour à charger | ✔ FAILED |
| EN_TRANSIT_RETOUR | En transit retour | ✔ FAILED |
| RETOUR_CLIENT_AGENCE | Retour (client) agence | ✔ FAILED |
| RETOUR_EXPEDITEUR | Retour expéditeur | ✔ FAILED |
| RETOUR_RECU | Retour reçu | ✔ FAILED |
| RETOUR_DEFINITIF | Retour définitif | ✔ FAILED |
| RETURNED | Retourné | ✔ FAILED |
| CANCELLED | Annulé | ✔ FAILED |
| LOST | Perdu | ✔ FAILED |
| **DELAYED** | Retardé | ✘ not mapped |

Plus **IN_WAREHOUSE** ("En dépôt"), which only the Dépôt page's dropdown
sends — also ✘ not mapped.

So our iOS app covers 25 of 27, and the 2 missing (`DELAYED`,
`IN_WAREHOUSE`) would show no status. Suggested fix, later: `DELAYED` →
IN_TRANSIT, `IN_WAREHOUSE` → IN_TRANSIT.

Seen on real parcels today: LIVRE_PAYE, A_ENLEVER, EN_COURS, AU_DEPOT,
AU_DEPOT_RELAIS, RTN_DEPOT, PENDING.

(Transfer statuses are separate: DRAFT "Brouillon", READY_FOR_PICKUP "En
attente du chauffeur", IN_TRANSIT, COMPLETED "Terminé", plus legacy ones.)

---

## 3. Minimum fields to create a test parcel

From the sender's "Nouveau Colis" form (`POST /api/sender-portal/parcels`).
These are the form's rules; the server's own checks are unknown, because
nothing was sent.

**Fill in:** Tél, Nom, Adresse, Gouvernorat, Délégation, Prix, Désignation.
**Leave as is:** Poids (1), Type (FIX), Échange (Non), NB Pièces (1).
The sender name/phone/address, sender id and agency are added from the account.

The body the form sends:
`{recipientName, recipientPhone, recipientAddress, recipientCity:
"<Governorate>, <Delegation>", description, weight, price, type, exchange,
fragile, openingAllowed, pieces, senderName, senderPhone, senderAddress,
senderId, agencyId, agencyCode}`

**(a) Same-agency parcel.** Gouvernorat **Tunis** + Délégation e.g.
**El Menzah** (or Ariana + Ariana Ville). Our agency (Tun-100) serves
Ariana, Ben Arous, Gafsa, Béja, Bizerte, Gabès and Tunis, so the parcel
stays with it ("Même agence").

**(b) Transfer parcel.** Gouvernorat **Sousse** + Délégation e.g.
**Sousse Médina**. Sousse is served by hub **sous-003** (serves Monastir,
Mahdia, Sousse), and Tun-100's only transfer route goes to it. So the parcel
becomes "Inter-agences" and needs a transfer (Transferts → Nouveau Transfert:
scan the parcel, then driver, plate and phone are all required).

After creation, the histories show this path: *À enlever → Au dépôt*
(agency "Entrée stock" scan) → *En cours* (scanned into a runsheet).

The agency's own "Nouveau Colis" form is looser: only Gouvernorat,
Délégation and Type are required, and the sender block is optional
("dépôt direct").

---

## 4. The "extra parcel" check

**Not found for runsheets.** Nothing in the web app flags a parcel that a
driver has but that is not on their runsheet. None of these words appear in
the code: excédent, supplémentaire, en trop, surplus, non prévu, extra.
("Anomalie" is used a lot, but for delivery failures and SAV cases.)

The closest checks exist elsewhere:

- **Transfer and return arrivals** (Transferts → Arrivages, Retour →
  Arrivages). Each parcel received is scanned with
  `POST /api/stock-entry/scan {trackingNumber}`. If the answer's
  `transferNumber` is not the transfer being received, the screen shows
  **"⚠ Colis inattendu pour ce transfert"** (or "…pour ce retour") and
  counts an anomaly. Transfers also carry server counters `missingParcels`,
  `extraParcels`, `damagedParcels`, `discrepancyNotes`, and
  `GET /api/transfers/{id}/scan-progress`.
- **Inventory** (Inventaire). Each scan is rated OK, Anomalie, Doublon
  (duplicate), Inconnu (unknown) or Non trouvé (missing).
  API: `GET /api/inventory/sessions/{id}/problems`.

Building a runsheet is itself scan-based (`create-and-scan`, then `scan`),
so a runsheet only holds what the agency scanned. A driver-side check would
have to be new work.

---

## 5. blocked.json

**Empty (`[]`).** No write was attempted during the whole run. The blocker
was on for every page (it aborts any POST, PUT, PATCH or DELETE except the
login, and logs it). It never fired, because no save button was clicked and
no screen sent a write just by opening. I did not trigger a write on purpose
to test it: that would risk changing the live server.

---

## 6. What I could not capture, and why

- **Parcel "full detail" (A3):** there is no detail page. The row and the
  history window are all there is. "Forcer le statut" was not opened.
- **A6 dialog:** there is no dialog. The dropdown writes on selection, so it
  was only displayed, never used.
- **Open native dropdowns (S2, A6, A7):** a browser can't screenshot these
  open, so they were shown as expanded lists and saved as text in `notes-*.json`.
- **A1 after step 2:** the next step needs a real scan, which would create
  a runsheet, so I stopped at the empty scan box.
- **A7 destination list screenshot:** `20-A7b-new-transfer-destination-list.png`
  expanded the wrong dropdown (the page's status filter). The destination
  options are in `notes-agency.json` and visible in `19-A7b-new-transfer-manual.png`.
- **Server-side checks for creating a parcel:** unknown, since nothing was sent.
- **One delay:** for about 10 minutes the server sent the web app's code very
  slowly and the browser couldn't open the agency login. It recovered by itself.
