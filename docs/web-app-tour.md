# Web app tour (agency + sender), with screenshots

Read-only tour of https://jibex.cloud on 2026-09-29. Driver view skipped.

## How it was done

- A robot browser (Playwright, driving Microsoft Edge) logged in as the
  agency head and as the sender, opened every page, then the main tabs and
  detail views, and took 74 screenshots.
- **Write lock:** the browser aborted every request that wasn't a read,
  except the login. Result: 0 write attempts in the whole tour. Nothing changed.
- Screenshots are **local only**, in `web-tour/` (gitignored), because they
  show real customer names, phones and addresses. The tour scripts are in
  `web-tour/_scripts/`. To re-run: `npm i playwright` there, then
  `node --env-file=../../.env.local tour.mjs agency ..` (or `sender`, or `details.mjs`).

## What each role sees

- **Agency head (`CHEF_AGENCE`)**: dashboard, parcels (list + live), stock
  entry, users, roles, drivers, senders, pickups, runsheets, finance,
  invoices, transfers (current, arrivals, history), returns (same three),
  forced-status history, inventory, SAV, Control Tower, Operations Center.
- **Sender**: dashboard, my parcels (with map, import/export), pickup
  manifests, return manifests, invoices, ads (printed on parcel tickets), profile
  with its price list.

## Bugs found (most serious first)

1. **Reloading the Drivers page logs the agency head out.** The web app
   treats any address starting with `/driver` as the driver portal, and
   `/drivers` matches. Clicking the menu works; a reload or a direct link
   clears the session and lands on the driver login.
2. **Admin page open to the agency head.** `/admin-settings` isn't in the
   menu, but opening it by address works and shows real data (complaints).
   It has agency-hierarchy, price-request, SMS and password-reset tabs.
3. **Finance module shows 0.000 DT instead of an error.** The server refuses
   the data (403), and the page shows zeros as if the numbers were real.
4. **Sender's "Mes Colis" hides delivered-and-paid parcels.** Its counter says
   "Livrés: 0" and its filters cover 20 of 28 parcels. The dashboard says
   8 are "Livrés & Payés".
5. **Invoice detail lists 0 parcels** while billing 5 parcels (50 TND).
6. **Pickup status differs between roles.** The sender sees one pickup
   manifest "En Cours"; the agency sees all 14 pickups "Terminé".
7. **Advanced dashboard** (`/advanced-dashboard`) is a blank page: it crashes.
8. **Enhanced dashboard** calls `/api/dashboard/stats`, which doesn't exist (404).
9. **Slow pages:** returns history and SAV take ~14 s and log
   "Request timeout - Backend non disponible".
10. **Unfinished bits:** the password-reset tab is empty; the SMS tab is a
    placeholder that shows a ticket code (`US-A03`); the Super Admin page
    opens for the agency head but stays empty; the pickup detail shows the
    raw code `AU_DEPOT` instead of "Au dépôt".

Pages reachable by address but refused by the server (403), not in the
agency menu: agencies, agencies manager, companies. Those are fine.

## What matters for our driver app

- **Parcels go "En cours" when put on a runsheet**, before the driver confirms
  it. The agency sees "En attente chauffeur" on the runsheet. So the live
  page shows 0 out for delivery while the dashboard shows 5 "En cours".
- **The driver's failure reason shows up for the agency** in the runsheet
  detail ("Raison" column), and some reasons (e.g. "Commande non conforme")
  open an after-sales (SAV) case.
- **9 of 14 pickups were completed with no driver** assigned (likely dropped
  off at the agency). A driver's pickup list only shows the assigned ones.
- The sender's map places parcels by governorate, like our "Nearest first".
- Everything shows weight "1.0 Kg", as found before (the form's default).

See also [web-app-findings.md](web-app-findings.md) for the data-level findings.
