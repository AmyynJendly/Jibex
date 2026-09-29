# Web app findings (agency + sender accounts)

Read-only look at https://jibex.cloud on 2026-09-29. Only GET requests, plus
the two logins. Nothing was changed on the server.

## How it was done

- The web app is one React bundle (`/static/js/main.*.js`). Its pages and
  server calls were read from that file: ~50 pages, ~150 GET addresses.
- Both accounts log in with `POST /api/auth/login`, same as the driver app.
  - `/login` → agency head, role `CHEF_AGENCE` (31 permissions).
  - `/sender-login` → role `SENDER`. The sender pages read `/api/sender-portal/...`.

## Who is who

- All three test accounts are in the **same company (id 3)** and the same
  agency (id 2, code `Tun-100`, Tunis).
- Our test driver is **driver id 3**. The agency has 2 drivers: 3 and 20.
- The agency made 18 runsheets: 15 for driver 3 (all closed), 3 for driver 20.
- So, once writes are allowed, this agency account can build runsheets for
  our test driver. That would let us test the app end to end.

## What explains our "server problems"

- **Weight is always 1**: the sender's "new parcel" form puts 1 in the weight
  box by default, and senders don't change it. Not a server bug.
- **No coordinates**: parcels do have `recipientLat` / `recipientLng`, but the
  form never asks for them, so they are always empty. The web app's own map
  does what our app does: coordinates if present, else a city table.
- **City**: `recipientCity` is always "Governorate, Delegation"
  (e.g. "Médenine, Ajim"), picked from a list. So the first part is always a
  clean governorate name. Good for "Nearest first".
- **Cash**: `amountToCollect` = `price` − `deliveryFee`. The driver collects
  `price`; the sender gets `amountToCollect`. Matches what the app does.

## Things our app could use later

- The parcel record has `deliveryPhotoUrl`, `deliverySignatureUrl`,
  `deliveryLat`, `deliveryLng`. But nothing fills them: not the web app, not
  the Android app. The item status update only takes
  `{status, failureReason, notes}`. Ask the backend team to accept photo and
  GPS there.
- Parcels have `exchange` (bring an item back) and `openingAllowed` (customer
  may open before paying). Neither our app nor the Android app shows them.
- A sender can ask to **change a parcel's price** (price-change requests).
  The agency approves it. So a price can change during a run.
- The agency sets a **payment method** per runsheet item after the run
  (`CASH`, `CHEQUE`, `BANK_TRANSFER`...). The driver doesn't.

## Runsheet life, agency side

Agency creates it and scans parcels in → `validate` → driver confirms and
starts (our app) → driver sets each parcel delivered / failed (our app) →
agency `complete`s it. The agency can also `cancel`, `reset`, and revert an
item to pending.

## Already fine in our app

- All 25 parcel statuses the web app uses are mapped in `real-api.ts`.
- Transfer states `DRAFT` / `READY_FOR_PICKUP` and type `HUB_RELAY` are handled.
- Failure reasons seen (`ABSENT`, `NON_COMPLIANT_ORDER`) are in our list.
