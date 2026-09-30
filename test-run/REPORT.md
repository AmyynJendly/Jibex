# Live end-to-end test — report

Date: 2026-09-30, 15:35–15:49 (Tunis time). Server: https://jibex.cloud.
Web side: Playwright driving a visible Microsoft Edge window, agency and
sender accounts. Driver side: our iOS app (Expo Go), logged in as mourad
(driver 3), done by hand.

Only this report is in git. Screenshots (`shots/`), `test-log.md`,
`test-parcels.json`, `blocked.json`, `writes.json` and `failure-reasons.md`
stay local: they hold private data.

## Test parcels and runsheet

All 4 parcels: recipient "TEST AMYYN", the test phone, address
"TEST - NE PAS LIVRER", Tunis / El Menzah, price 10, designation "TEST",
other fields at their defaults.

| | Tracking | Parcel id | Final status |
|---|---|---|---|
| P1 | TUN-100-DEC8AC59 | 126 | DELIVERED (Livré) |
| P2 | TUN-100-78CF079C | 127 | RTN_DEPOT (Retour dépôt), attempt 1/3 |
| P3 | TUN-100-7FAD7390 | 128 | EN_COURS, item PENDING |
| P4 | TUN-100-71DEEE7A | 129 | EN_COURS, item PENDING |

**Runsheet: RS-20260930-0001 (id 70)**, driver mourad, plate TUN-261.
Left **IN_PROGRESS** ("En tournée"), not closed or validated.
These are what needs cleaning up later with Jihed.

## Steps

### Step 0 — Failure reasons (read-only)
See the comparison at the end. Short version: same 21 codes on both sides.

### Step 1 — Sender creates P1–P4
- Done: 4 × "Nouveau Colis" → Créer. Each answer said `PENDING`.
- Expected: 4 new parcels. **Actual: as expected.** Web shows "En attente".
- Screenshots: `04-step1-sender-list`, `05-step1-parcels-list`.

### Step 2 — Entrée Stock: P1
- Done: scanned P1 only.
- **Accepted.** Message: "✅ Colis réceptionné au dépôt — 1ère entrée".
  `PENDING` → **`AU_DEPOT`**, `pickedUpAt` set. No pickup step was needed.
- Screenshot: `06-step2-stock-entry-P1`.

### Step 3 — Entrée Stock: P2, P3, P4
- Expected: Au dépôt. **Actual: all three `AU_DEPOT`**, same message.
- Screenshots: `07`–`09`, `10-step3-parcels-list`.

### Step 4 — Runsheet for mourad with P1, P2, P3
- Done: Ajouter → mourad (plate TUN-261 kept) → Commencer le scan → P1, P2, P3
  → Terminer le scan.
- P1's scan created the run: "Tournée RS-20260930-0001 créée — colis ajouté
  avec succès". P2 and P3: "scanné et ajouté avec succès".
- Expected: "En attente chauffeur", parcels En cours. **Actual: as expected.**
  Runsheet `PENDING`; P1–P3 `EN_COURS` with driver 3; each item `PENDING`
  with a `scannedAt`. P4 stayed `AU_DEPOT`.
- "Terminer le scan" only closes the window; it sends nothing.
- Screenshots: `11`–`15`.

### Step 5 — Driver confirms and starts (in our app)
- Done by hand: one "Confirm receipt" tap in our app.
- **Actual:** runsheet **`IN_PROGRESS`**, `startedAt` 15:40:17. Parcels
  unchanged (`EN_COURS`), items `PENDING`.

### Step 6 — Scan icon on the started runsheet
- Action icons on the row after the start: "Imprimer" and a **purple QR icon
  titled "Ajouter un colis"**. The reset and delete icons were gone.
- Note: my script first looked for the title "Scanner" (the title before the
  start) and wrongly logged "no icon". The web code shows both titles are the
  same icon, opening the same scan window. I corrected it and went on.
- Done: opened it, scanned **P4 only**.
- **Actual: accepted.** "Colis TUN-100-71DEEE7A scanné et ajouté avec succès".
  P4's item: status **`PENDING_DRIVER_CONFIRMATION`**, `scannedAt` 15:43:16.
  Parcel stayed `AU_DEPOT` but got driver 3. Runsheet total 3 → 4.
- Screenshots: `16-step6-row-actions`, `17`–`19`.

### Step 7 — Driver: refresh, deliver P1, fail P2 (in our app)
- What you saw: the app **locked all 4 parcels** and asked to confirm a
  changed count. After confirming, all 4 were open. P1 delivered, P2 failed
  with "Customer unavailable", P3 and P4 left.
- After confirming: P4's item → `PENDING`, parcel → `EN_COURS`.
- P1: item `DELIVERED`, parcel **`DELIVERED`** ("Livré"), `deliveredAt` 15:45:40.
- P2: item `FAILED`, reason **`NOT_AVAILABLE_RESCHEDULED`**. The web shows
  "Échoué — Client non disponible (reporté)" in the runsheet detail.
  But the **parcel stays `EN_COURS`** ("En cours" in Tous les Colis) until
  Entrée Stock.
- P2's notes on the server: "Not called. Location: …" (our app's proof line,
  in the app's language, with the phone's position). The web's runsheet
  detail doesn't show these notes.
- Runsheet: `IN_PROGRESS`, total 4, delivered 1, failed 1. Web label "En tournée".
- Screenshots: `20-step7-parcels-list`, `21-step7-runsheet-detail`.

### Step 8 — Entrée Stock: P2
- Expected: RTN dépôt. **Actual: `RTN_DEPOT`.** Message: "↩ Retour dépôt —
  tentative n°1/3. Recréer dans une runsheet pour une nouvelle tentative."
- The page states its rules: 1st scan → Au dépôt; after a runsheet (tries
  1–3) → RTN Dépôt; beyond 3 → Retour définitif; a parcel can't be rescanned
  until it's put on a new runsheet.
- Screenshots: `22-step8-stock-entry-P2`, `23-step8-parcels-list`.

### Step 9 — Stopped
Runsheet left open. Nothing deleted or cleaned up.

## Can a started runsheet receive an extra parcel from the web?

**Yes.** On an `IN_PROGRESS` (or `DRIVER_CONFIRMED`) runsheet, the row's
purple QR icon ("Ajouter un colis") opens the scan window, and
`POST /api/runsheets/{id}/scan` adds the parcel. The new item waits as
`PENDING_DRIVER_CONFIRMATION`. Our app then locks the run and asks the driver
to confirm the new count. After that the parcel is `EN_COURS` like the others.

## Failure reasons (step 0)

- **Codes: identical**, 21 on each side. Everything our app sends is valid.
- Our app hides 2: `REFUSED` and `NOT_INTERESTED_2ND_ATTEMPT`. Both open an
  after-sales (SAV) case on the web.
- 9 reasons open a SAV case on the web: REFUSED, CANCELLED_BY_CLIENT,
  NOT_INTERESTED_2ND_ATTEMPT, DUPLICATE_ORDER, RETURN_CONFIRMED_BY_SENDER,
  NON_COMPLIANT_ORDER, UNRELIABLE_CLIENT, WRONG_PAYMENT_MODE, FORCE_MAJEURE.
  Our app doesn't tell the driver which ones.
- 5 French labels are worded differently (same meaning): PHONE_OFF
  ("Téléphone éteint" vs our "Téléphone injoignable"), ABSENT ("Destinataire
  absent" / "Client absent"), CANCELLED_BY_CLIENT ("Annulé par client" /
  "Annulé par le client"), REFUSED ("Refusé par le destinataire" / "Colis
  refusé"), OTHER ("Autre raison" / "Autre").
- Checked live: P2's `NOT_AVAILABLE_RESCHEDULED` shows on the web as
  "Client non disponible (reporté)" — same as our label.

## blocked.json

**Empty (`[]`).** No write was aborted. The web side sent exactly 13 writes,
all on the allow-list and all on our test parcels and runsheet:

| Time | Step | Request |
|---|---|---|
| 15:35:13–15:35:37 | 1 | 4 × `POST /api/sender-portal/parcels` (test body checked) |
| 15:35:55 | 2 | `POST /api/stock-entry/scan` P1 |
| 15:36:01–15:36:11 | 3 | 3 × `POST /api/stock-entry/scan` P2, P3, P4 |
| 15:36:23 | 4 | `POST /api/runsheets/create-and-scan` P1, driver 3, plate TUN-261 |
| 15:36:25–15:36:26 | 4 | 2 × `POST /api/runsheets/70/scan` P2, P3 |
| 15:43:16 | 6 | `POST /api/runsheets/70/scan` P4 |
| 15:49:06 | 8 | `POST /api/stock-entry/scan` P2 |

The driver's writes came from our app, not the browser: confirm + start,
confirm new parcels, P1 delivered, P2 failed.

## What went wrong / worth knowing

1. **My step-6 mistake**: the icon changes its title after the start
   ("Scanner" → "Ajouter un colis"). I first logged "no icon", then checked
   the code, corrected the log and scanned P4. No other way was tried.
2. **Web counters disagree**: after P1 was delivered, the runsheet page's
   top card said "Colis livrés 0 sur 4 · 0,000 DT", while the row said
   1 delivered. (Maybe it only counts paid parcels; not checked.)
3. **A failed parcel stays "En cours"** on the web until it is scanned back
   into stock. Only the runsheet detail shows "Échoué".
4. **Our failure proof isn't visible to the agency**: the "called / location"
   note is saved on the server but not shown in the runsheet detail.
5. Nothing unexpected otherwise: no errors, no pop-ups, no foreign parcel in
   any scan result.
