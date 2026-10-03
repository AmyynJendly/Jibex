# Parity audit: Android driver app vs our iOS app

Read-only audit. No app code was changed.

- **Android** = the Kotlin source in `SynapseDriverApp/` (commit `e45d50a`), plus the screenshots of the real app (dark blue).
- **iOS** = our Expo app at commit `6a8831f`, plus the screenshots from the iPhone (dark brown).
- The folders `android-screens/` and `ios-screens/` do not exist in the repo. I used the screenshots pasted in the chat.
- Android paths below are short. They all start with `SynapseDriverApp/` and end in `…/com/synapse/driver/…`.

## The short version

1. Both apps call the **same server endpoints** for runs, parcels, pickups, transfers, returns and notifications. I found no endpoint Android uses for daily work that we lack.
2. **Our writes are still switched off** (`EXPO_PUBLIC_API_WRITES=off`). Until they are on, no driver action reaches the server. This is on purpose, not a bug.
3. One rule is **stricter on iOS and blocks the driver**: a changed run locks every parcel. Android locks only the new parcel. This answers the question left open in FIXES.md.
4. Android has **no history, no search, no parcel screen, no auto-refresh and no offline data**. We have all five.
5. Android has three things we lack: a **transfer detail screen**, **change password**, and **two-step pickups** (start, then finish).
6. Arabic: **neither app** has a working Arabic or right-to-left mode.

---

## 1. Comparison table

### Screens

| Feature | Android | iOS | Same? | Gap / risk |
|---|---|---|---|---|
| Login | Username, password, show/hide, "Se connecter", biometric button, gear to server config | Username, password, login | Mostly | Android blocks a password under 4 characters before sending. We send it and show the server's answer. |
| Server config | Screen to type the server address (developer tool) | None. Address is fixed in `.env.local` | No | Not needed for drivers. No gap. |
| Home | Greeting, name, bell, profile icon. "Taux de livraison" bar. Four numbers: Livrés, En attente, Échoués, Pickups. Quick actions with badges. Current run with its parcels. "À confirmer" cards. | Wallet (cash), search, scan. Greeting, location. Gauge "Colis à livrer". Four numbers: Livrés, En file, Échecs, Ramassages. Next stop. Four tiles without badges. | No | See gaps 5, 6, 7, 8, 12. |
| Runsheet list | Tabs **En cours / Confirmés / Attente**, one card per run (code, agency, counts, progress) | No list of runs. One flat list of parcels, with a run card on top. Tabs **En cours / Historique** | No | Different by design (ours was approved earlier). Not a gap. |
| Runsheet detail | Header: code, agency, status badge, Livrés / Échoués / Restants, progress bar. Buttons. Then **all** parcels, done ones included | Run card: "Tournée du jour", code, date, N colis, status in words. Parcels still to do below | Mostly | Our run card has no Livrés / Échoués / Restants numbers. See gap 16. |
| Parcel card | Tracking, name, **city**, "COD 10.00 TND", "Raison : …", call button, "Maj" or "Modifier", "Nouveau" | Tracking, name, **full address**, "10.000 TND", attempt, ÉCHANGE, distance, call button with count, "Maj" | Mostly | We show more. Money format differs: Android 2 decimals, ours 3 (asked for in the live tests). |
| Parcel screen | **None.** Everything happens in a bottom sheet | Full screen: map, call, navigate, deliver, can't deliver, cash step | No | iOS extra. Improvement. |
| History | **None.** "Historique" on the dashboard opens the active runs | Delivered and failed parcels, open and closed runs, filters | No | iOS extra. But see gap 2. |
| Pickups | "Mes Pickups", grouped by sender. Card: **request number**, status badge, address, **date**, N colis. Opened: status, contact, "Naviguer", parcels with COD | "Ramassages". Tabs Programmés / Collectés. Card: sender name, address, **time only**, N colis, cash total. Opened: parcels with ticks | No | See gaps 4, 9, 10, 11. |
| Transfers list | Tabs **En cours / Terminés / Tous**. Card: number, N colis, status, from → to, anomalies | Tabs **En cours / Historique**. Card: number, status, from → to, N colis, place, time | Mostly | We hide cancelled transfers. Android shows them under "Tous". We don't show anomalies. |
| Transfer detail | Header, itinerary, driver + vehicle + phone, timeline with dates, anomalies, parcel list with status and COD, notes | **None** | No | See gap 3. |
| Returns | Two sections: "À charger (N)" and "À remettre à l'expéditeur (N)" | Tabs En cours / Historique. Each return says its stage | Yes | Same data, same calls. We add a history tab and a scanner. |
| Notifications | List, "Tout lire". Tap marks as read | Tab "Alertes" with unread badge. Tap opens the parcel or list it is about. Delete and "unread" kept on the phone | Mostly | iOS extra. Improvement. |
| Scanner | Camera or typed number. Asks the **server** for the parcel and shows a full sheet (sender, route, last scan, pieces, weight, fragile) | Camera or typed number. Looks **only in the driver's own lists** | No | On purpose: the backend asked us not to call the tracking endpoint. See gap 17. |
| Search | **None** | Search by tracking number or name, recent searches | No | iOS extra. Improvement. |
| Profile | Name, @username. Dark mode, biometric, **change password**, server config, version, logout | Name, three numbers (deliveries, rate, weekly cash). Language, biometric lock, vibrations, next-stop bar, help center, logout | No | See gaps 13, 18. |
| Bottom bar | Runsheets, Pickups, Profil | Accueil, Tournées, Alertes, Profil | No | Design choice. No gap. |

### Status colours and words

| Feature | Android | iOS | Same? | Gap / risk |
|---|---|---|---|---|
| Parcel on a run | Green "Livré", red "Échoué", amber "En attente", amber "Nouveau" | Green, red, amber, plus blue "En transit". "NOUVEAU" chip | Yes | — |
| Run status | Brouillon, Validé, En attente, Confirmé, En cours, Terminé, Annulé | En attente de votre confirmation, Confirmée — à démarrer, En cours, Terminée, Clôturée par l'agence | No | Ours are full sentences, as asked. Note: Android's "Terminé" = closed by the agency. Our "Terminée" = all parcels done but not closed yet. |
| Parcel lifecycle status | 18 codes with short labels and 5 colours (`CommonComponents.kt`) | 28 codes with labels, no colour per code | Mostly | We cover more codes. Wording differs a little ("Dépôt relais" vs "Au dépôt relais"). |
| Pickup status | En attente, Planifié, En cours, Terminé, Annulé | Programmé, Collecté | No | We merge three states into "Programmé". See gap 4. |
| Transfer status | En attente de chargement, En transit, Terminé, Annulé, plus 7 old ones | Prêt à charger, En transit, Terminé | Mostly | Old (legacy) statuses fall into our History as read-only. |

### Driver actions and API calls

The server address and the calls are the same in both apps unless said.

| Feature | Android | iOS | Same? | Gap / risk |
|---|---|---|---|---|
| Login | `POST api/auth/login` `{username, password}`. Checks: not empty, password ≥ 4. Role must be DRIVER. 401 → "Identifiants incorrects", 403 → "Accès refusé" | Same call. Role must be DRIVER, account must be active. 401/400 → wrong credentials, no network → network message | Yes | — |
| Confirm a run | `PUT api/runsheets/{id}/driver-confirm`. Dialog: "Je confirme avoir reçu physiquement tous les colis de cette tournée (N colis)." Run becomes "Confirmé". **Nothing else.** | Same call, **then `PUT …/start` right away**, in one tap. Dialog: "En confirmant, vous acceptez cette tournée et vous en devenez responsable." | No | See gap 14. |
| Start a run | Separate button "Démarrer la tournée", only when confirmed **and** no new parcel is waiting. `PUT api/runsheets/{id}/start` | Only shown if the automatic start failed | No | See gap 14. |
| Refuse a run | `PUT api/runsheets/{id}/driver-reject` `{reason}`. Reason required. Dialog says the run is cancelled and parcels go back to the depot | Same call, same body, reason required | Yes | Android uses it, so the endpoint is part of the contract. This settles doubt 4 in FIXES.md. |
| New parcels on a started run | `PUT …/confirm-new-parcels` or `PUT …/reject-new-parcels` `{reason}`. Dialog: "N nouveau(x) colis ont été ajoutés… Confirmez-vous les avoir reçus physiquement ?" | Same two calls. Banner: "La tournée a été modifiée : 1 colis ajouté (12 → 13)" | Yes | Same calls. The **lock** differs. See gap 1. |
| Deliver | Sheet → "Colis livré". One tap, no confirmation. `PUT api/runsheets/items/{itemId}/status` `{status: "DELIVERED"}` | Same call and body. Before sending: the customer must have been called once, the exchange box must be ticked, the run must be IN_PROGRESS. Then the cash step | Mostly | Same call. Our two checks are extras asked by the client. See gap 15. |
| Fail | Pick one of 19 reasons. "Autre" needs a note. Same call, `{status: "FAILED", failureReason, notes}`. `notes` is the driver's note only | Same 19 reasons, same rule for "Autre". Same call. `notes` = driver's note **plus** "Client appelé… Position : …" | Mostly | Reason list now matches Android exactly. Our note carries proof. Improvement. |
| Call the customer | Opens the dialer. Not recorded | Opens the dialer and records the call on the phone | No | iOS extra, needed for the call-before-delivery rule. |
| Correct a mistake | "Modifier" opens the same sheet. Sends the new status (DELIVERED or FAILED) directly. Only while the run is IN_PROGRESS | Same, **plus** "remettre en attente", which sends `{status: "PENDING"}` | Mostly | Android never sends PENDING. See gap 19. |
| Pickup | Two buttons: "Confirmer Pickup" (`PUT …/start`), later "Terminer Pickup" (`PUT …/complete`). No check, no dialog | One button "Terminer le pickup" after ticking or scanning each parcel. Sends start then complete together. Plus "Terminer tous les pickups" | No | Same calls. See gap 4. |
| Transfer | "Confirmer le chargement" → dialog → `POST api/transfers/{id}/confirm-pickup?driverId=`. No scan | Scan every parcel (or "Confirmer sans scan") → same dialog → same call | Mostly | Same call. Our scan is an extra safety step. |
| Returns | "Confirmer le chargement (N)" → `POST api/return-management/driver/{id}/confirm-loaded`. Then per parcel "Confirmer la remise à l'expéditeur" → `POST api/return-management/{parcelId}/confirm-delivered?driverId=` | Same two calls | Yes | — |
| Notifications | `GET api/notifications/user/{userId}`, `PUT …/{id}/read`, `PUT …/user/{userId}/read-all` | Same three calls | Yes | — |
| Scanner lookup | `GET api/parcels/tracking/{n}` | No server call | No | On purpose. See gap 17. |
| Change password | `PUT api/driver-auth/change-password` `{driverId, oldPassword, newPassword}`. Checks: both new passwords match, ≥ 4 characters | **None** | No | See gap 13. |
| Logout | Clears the session, back to login | Clears the session and the cached data, back to login | Yes | — |
| After success | Snackbar ("Colis livré avec succès ✅", "Tentative enregistrée ⚠️"…), then reloads the run | Toast, then reloads every list that holds the data | Yes | — |
| After an error | Snackbar with a short text and the HTTP code, e.g. "Impossible de mettre à jour le statut (400)" | Toast with a translated text. No network → "Connexion impossible — réessayez." | Mostly | Ours never shows a raw code. |

### Rules

| Feature | Android | iOS | Same? | Gap / risk |
|---|---|---|---|---|
| When a parcel can be updated | Only when the run is IN_PROGRESS (`canUpdate`) | Same check, done before sending | Yes | — |
| Run not confirmed yet | No "Maj" button on any parcel | All parcels shown as a greyed preview, no action | Yes | — |
| **Run changed after start** | **Only the new parcel has no button.** The other parcels stay workable | **Every parcel of the run is locked** until the driver confirms | **No** | **See gap 1.** |
| Run finished (all done) | Nothing special. Parcels show "Modifier" | Status "Terminée", note that the agency will close it. Parcels correctable in History | Mostly | iOS clearer. |
| Run closed by the agency | The run disappears (the active list no longer returns it). No trace | Card "Tournée clôturée par l'agence". Parcels in History with a lock | No | iOS extra. Improvement. |
| Call before delivery | No rule | "Livré" blocked until Call was pressed once | No | Client request. See gap 15. |
| Exchange parcel | Nothing shown | Badge, instruction, required tick | No | iOS extra, asked after the live tests. |
| Attempt number | Nothing shown | "Tentative N/3", "Dernière tentative" | No | iOS extra, asked after the live tests. |

### Data handling

| Feature | Android | iOS | Same? | Gap / risk |
|---|---|---|---|---|
| Refresh | When a screen opens. Pull-to-refresh on dashboard, runs, pickups, transfers, returns. Refresh icon on detail screens. **Nothing automatic** | On open, on return to foreground, when a list gets focus, **every 60 s** on Current / Pickups / Transfers, and pull-to-refresh | No | iOS better. |
| Background sync | A job every 15 min loads the runs… and **throws the result away** (`SyncWorker.kt`) | None | Yes in effect | Android's sync does nothing useful. |
| Caching | None. Every screen reloads from the server | Last good data kept in memory (30 s fresh), shown while reloading | No | iOS better. |
| Offline | Error text or empty screen. Nothing saved on the phone | Last data stays visible. "Connexion impossible" with a retry. Actions are stopped before sending | No | iOS better. Neither app queues actions for later. |
| Retries | Reconnects on a dropped connection. Timeout 30 s | Reads retried twice with a growing delay. Writes never retried. Timeout 20 s | Mostly | Not retrying writes is the safe choice. |
| Token expiry | A 401 on any call except login → session cleared → login screen | Same | Yes | — |
| Re-login | Biometric button **logs in again** with the saved password | Biometric only **unlocks the app**. After expiry the driver types the password | No | See gap 18. Android stores the password as plain Base64. That is weak, do not copy it. |
| Token storage | DataStore (plain preferences) | Secure storage (Keychain) | No | iOS safer. |
| GPS | A tracking service exists but is **never started** and sends nothing | GPS used in the foreground for "nearest first", the Home label and the failure proof | No | Neither app sends positions to the server. |
| Push | Shows a notification when one arrives. The device token is only logged, **never sent to the server** | Token never sent to the server either | Yes in effect | Push cannot work on either app today. Backend work needed. |

### Languages

| Feature | Android | iOS | Same? | Gap / risk |
|---|---|---|---|---|
| French | Yes. All screen texts are written in French **inside the code** | Yes, through i18n | Yes | — |
| English | No | Yes, switch in Profile | No | iOS extra. |
| Arabic / RTL | A small `values-ar/strings.xml` (39 lines) and `supportsRtl="true"` exist, but the screens don't use them. No way to pick a language. **Not working** | No Arabic, no RTL | Yes in effect | Not a parity gap. It would be new work on both. |
| First launch | Always French | Phone language if French or English, **else English** | No | See gap 20. |

---

## 2. Gaps, by importance

### MUST — the driver is blocked, or data reads as wrong

**1. A changed run locks every parcel. Android locks only the new one.**
On Android, when the agency adds a parcel to a started run, the driver keeps delivering the others. Only the new parcel has no "Maj" button until it is confirmed. On iOS the whole run is locked until the driver confirms. A driver in the middle of a round is stopped.
This is the comparison FIXES.md said would come later. Android's answer: **lock only the new parcel.**
One thing to verify first: that the server accepts a status update on an old parcel while a new one is waiting. Android assumes yes.
- Android: `feature/runsheets/…/RunsheetDetailScreen.kt` (`canUpdate = runsheet.status == IN_PROGRESS`, and `if (!isPendingConfirmation && canUpdate)` in `ParcelItemCard`), `domain/…/model/Runsheet.kt` (`needsConfirmation` is only PENDING / VALIDATED).
- iOS: `services/real-api.ts` (`toRunsheet` → `needsConfirmation`, `getActiveParcels`), `services/mock-api.ts` (`isJobBlockedByUnconfirmedRunsheet`), `app/(tabs)/runsheets/index.tsx`, `app/(tabs)/home/index.tsx`, `lib/useNextStop.ts`, `lib/runsheetDay.ts`, `__tests__/runsheet-day.test.ts`, `__tests__/delivery-rules.test.ts`.

**2. History shows the same parcel several times with identical cards.** *(your point 1 — confirmed)*
The iPhone screenshot shows three cards for TUN-100-78CF079C, all "Échoué / Destinataire absent / 10.000 TND / Tournée clôturée". They are three different attempts on three runs, but nothing tells them apart. It reads like a bug.
Each card must show the **run code**, the **date**, and the **attempt number**.
The data is there: each card already comes from one run (`runsheetId`), and the server sends the run's `code` and `scheduledDate`. We just don't carry them onto the parcel. The attempt number is hidden on History cards on purpose today (`showAttempt = !readOnly …`).
Android has no History at all, so there is nothing to copy.
- Android: none (`RunsheetRepositoryImpl.kt` only loads active runs for the list).
- iOS: `types/job.ts` (`ParcelServerInfo`: add run code and date), `services/real-api.ts` (`runsheetJobs` / `toJob`), `services/mock-api.ts`, `app/(tabs)/runsheets/index.tsx` (`ParcelCard`), `lib/attempts.ts`, `lib/i18n/fr.ts`, `lib/i18n/en.ts`.

### SHOULD — worse than Android

**3. No transfer detail screen.** *(your point 2 — confirmed: we don't have one)*
Android opens a transfer and shows: number, type ("Hub relais"), status, parcel count, itinerary (Départ / Arrivée), driver, vehicle and phone, a dated timeline (Créé → Prêt pour chargement → Pris en charge par le chauffeur → Terminé), anomalies (missing / extra / damaged), every parcel with recipient, city, **status** and COD, and the notes.
We show one card. After the driver confirms, we don't even list the parcels any more. The parcel statuses matter: in the screenshot one parcel is "Dépôt relais" while the others are "En transit".
We already read most of this from the server (`getTransfer` exists and is unused by any screen).
- Android: `feature/transfers/…/TransferDetailScreen.kt`, `TransferViewModel.kt`, `domain/…/model/Transfer.kt`, `core/ui/…/CommonComponents.kt` (`parcelStatusLabel`, `parcelStatusColor`).
- iOS: new screen (for example `app/transfer/[id].tsx`), `app/transfers.tsx` (make the card open it), `types/transfer.ts`, `services/real-api.ts` (`toTransfer`: keep recipient, city, status, price per parcel, dates, driver, vehicle, notes, anomalies), `services/mock-api.ts`, `lib/parcelStatus.ts`, i18n.

**4. Pickups are one step on iOS, two on Android.**
Android: "Confirmer Pickup" marks it started (the agency sees "En cours"), then "Terminer Pickup" finishes it. We send start and complete together at the end, so the agency never sees a pickup in progress. We also show "Programmé" for three different server states.
- Android: `feature/pickups/…/PickupListScreen.kt`, `PickupViewModel.kt`, `domain/…/model/Parcel.kt` (`PickupStatus`).
- iOS: `app/pickups.tsx`, `services/real-api.ts` (`completePickups`, `toPickupStatus`), `services/mock-api.ts`, `types/pickup.ts`, i18n.

**5. The pickup counter does not mean the same thing.** *(your point 5 — confirmed)*
Android's Home tile "Pickups" counts **all** the driver's pickups, finished ones included (6 in the screenshot). Ours counts only the **scheduled** ones (0). Both are right, but the label doesn't say which.
Android itself uses the scheduled count for the badge on its "Pickups" button. So "to do" is the useful number. Keep ours and label it, for example "Ramassages à faire".
- Android: `feature/dashboard/…/DashboardScreen.kt` (line 146: `uiState.pickups.size`; line 185: pending + scheduled for the badge).
- iOS: `app/(tabs)/home/index.tsx` (`pickupsCount`), `lib/i18n/fr.ts`, `lib/i18n/en.ts` (`home.stats.pickups`).

**6. No badge on the Home tiles.** *(your point 8 — confirmed)*
Android shows a red count on Runsheets (active runs), Pickups (to do), Transferts (open) and Retours (assigned). In the screenshot Transferts has "1". Our four tiles have none, so the driver must open each screen to know.
- Android: `feature/dashboard/…/DashboardScreen.kt` (lines 173–204, `QuickActionCard` `badge`), `DashboardViewModel.kt` (`activeTransferCount`, `pendingReturnsCount`).
- iOS: `app/(tabs)/home/index.tsx` (the four tiles; transfers and returns are not loaded on Home today), `lib/query.tsx`.

**7. Three names for pickups.** *(your point 4 — confirmed)*
On iOS in French: the Home tile says "Collectes", the Home number says "Ramassages", the screen title says "Ramassages", its subtitle says "Collectes marchands", and messages say "collecte". Android says "Pickups" everywhere.
Pick one word. Our newer texts already say "pickup" ("Terminer le pickup"), like Android, so that is the simplest choice.
- Android: `PickupListScreen.kt` ("Mes Pickups"), `DashboardScreen.kt`.
- iOS: `lib/i18n/fr.ts` (lines 41, 97, 371–425 and the scanner / search texts), `lib/i18n/en.ts`.

**8. The Home gauge does not say what it measures.** *(your point 6 — confirmed)*
Home: "Colis à livrer", a percentage = delivered ÷ all parcels on the **open runs** (today, in practice). Profile: "Taux de livraison" = delivered ÷ (delivered + failed) over **all time**. Two different numbers, and the Home one has no name. Android names its bar "Taux de livraison" and uses the same open-runs formula as our Home.
Label the Home gauge as today's rate, and the Profile one as all-time.
Small extra: the gauge shows "0.00%". Android shows "0%".
- Android: `DashboardViewModel.kt` (`rate = delivered / allItems.size`), `DashboardScreen.kt` (line 121).
- iOS: `app/(tabs)/home/index.tsx` (`completionPercent`), `app/(tabs)/profile/index.tsx`, `services/real-api.ts` (`getDriverStats`), i18n (`home.deliveriesCardTitle`, `profile.stats.deliveryRate`).

**9. Pickup cards don't show the request number or the date.**
Android: "PU-3-20260712-0001", status, address, **date**. Ours: sender name, address, **time only** ("23:13", with no day, even in the Collectés list). A driver can't match a card with what the agency says on the phone ("le pickup PU-3-…").
- Android: `PickupListScreen.kt` (`PickupCard`).
- iOS: `app/pickups.tsx` (`PickupCard`; `pickup.server.requestNumber` is already there), `services/real-api.ts` (`toPickup`: `timeWindow`).

**10. No "Naviguer" and no contact on a finished pickup.** *(your point 9 — partly)*
On a **scheduled** pickup we do have both: a "Appeler" button and a "Naviguer" button. On a **collected** one (the screenshots) we show only "Collecté" and the parcels. Android shows the contact name, the phone and "Naviguer" in every state. We also never print the contact's name and number as text, only a call button.
- Android: `PickupListScreen.kt` (lines 188–254).
- iOS: `app/pickups.tsx` (the `readOnly` branch of `PickupCard`).

**11. The Transfers header "5 En transit" counts parcels without saying so.** *(your point 7 — confirmed)*
The big "5" is the number of **parcels** on open transfers, next to one transfer card. It reads as "5 transfers". Say "5 colis en transit".
- Android: `TransferListScreen.kt` (shows "N colis" on each card, no total).
- iOS: `app/transfers.tsx` (`parcelsMoving`), `lib/i18n/fr.ts`, `lib/i18n/en.ts` (`transfers.movingLabel`).

**12. Home shows no current run and no parcels.**
Android's dashboard shows "Tournée en cours" with its parcels and progress, and "À confirmer" cards with "Confirmer la réception". Ours shows the gauge, the next stop and the confirm card, but no card for the run being delivered. Minor now that the Current tab opens on the run card.
- Android: `DashboardScreen.kt` (lines 215–330).
- iOS: `app/(tabs)/home/index.tsx`, `components/RunsheetDayCard.tsx`.

**13. No "change password".**
Android: Profile → "Changer le mot de passe" → old, new, confirm → `PUT api/driver-auth/change-password`.
- Android: `feature/profile/…/ProfileScreen.kt`, `ProfileViewModel.kt`, `data/…/api/DriverAuthApi.kt`, `AuthRepositoryImpl.kt`.
- iOS: `app/(tabs)/profile/index.tsx`, `components/ProfileSettingsList*.tsx`, `services/real-api.ts`, `services/mock-api.ts`, `services/api.ts`, i18n. It is a write: guard it with `API_WRITES` like the others.

**14. Confirming a run also starts it, in one tap.**
Android keeps two steps: "Confirmer" (I received the parcels), then "Démarrer la tournée" (I am leaving; "Les colis seront marqués comme en cours de livraison"). A driver may confirm at the depot and start later. On iOS one tap does both, so the customers' parcels go "en cours de livraison" the moment the driver accepts.
This was built on purpose and worked in the live test. It is still a difference the agency should know about.
- Android: `RunsheetDetailScreen.kt` (lines 88–178), `RunsheetViewModel.kt` (`driverConfirm`, `startRunsheet`), `Runsheet.kt` (`canStart`).
- iOS: `services/real-api.ts` (`confirmRunsheetReceipt`), `lib/useRunsheetConfirm.ts`, `components/RunsheetDayCard.tsx`.

**15. Call-before-delivery has no way out.**
Android has no such rule. Ours blocks "Livré" until Call was pressed. It is a client request, so keep it. The risk: a parcel with a wrong or missing phone number, or a customer standing in front of the driver. Check that the driver is never stuck.
- Android: `RunsheetDetailScreen.kt` (`StatusUpdateBottomSheet`: "Colis livré" has no condition).
- iOS: `lib/deliveryGate.ts`, `components/StatusUpdateSheet.tsx`, `app/job/[id]/index.tsx`, `services/real-api.ts` (`confirmDelivery`).

### NICE — small polish

**16. The run card has no Livrés / Échoués / Restants numbers.** Android's run header has the three counts and a progress bar.
- Android: `RunsheetDetailScreen.kt` (`RunsheetHeaderCard`). iOS: `components/RunsheetDayCard.tsx`.

**17. The scanner knows only the driver's own parcels.** Android asks the server and can show any parcel of the company, with sender, route and last scan. Ours says "not recognized" for a parcel that isn't on the driver's lists. This is what the backend asked for. Only change it if they change their mind.
- Android: `feature/scanner/…/ScannerScreen.kt`, `ScannerViewModel.kt`, `ParcelRepositoryImpl.kt`. iOS: `services/real-api.ts` (`confirmScan`), `lib/parcelSearch.ts`.

**18. After the session expires, the driver types the password again.** Android's biometric button logs in again by itself. Ours only unlocks the app. If we add it, keep the password in secure storage, not like Android.
- Android: `feature/auth/…/LoginScreen.kt`, `LoginViewModel.kt` (`biometricLogin`), `SessionManager.kt` (`saveBiometricCredentials`). iOS: `app/(auth)/login.tsx`, `app/index.tsx`, `lib/session.ts`.

**19. "Remettre en attente" sends a status Android never sends.** Android corrects a mistake by sending the right status directly. We also offer to put the parcel back to pending (`{status: "PENDING"}`). I did not find this case in the four live test reports. Test it once on the live server before relying on it, or remove the button.
- Android: `RunsheetDetailScreen.kt` ("Modifier" → same sheet), `UpdateItemStatusUseCase.kt`. iOS: `components/StatusUpdateSheet.tsx`, `services/real-api.ts` (`reopenParcel`).

**20. First launch is in English on a phone set to Arabic.** Android is always French. Our texts are "French first, in the agency's words". Default to French when the phone is neither French nor English.
- Android: `SessionManager.kt` (`language` defaults to "fr"). iOS: `lib/i18n/languages.ts` (`DEFAULT_LANGUAGE`).

**21. Transfer anomalies are not shown.** Android shows "N manquant(s) / supplémentaire(s) / endommagé(s)" on the list and the detail. Do it with gap 3.
- Android: `TransferListScreen.kt` (lines 188–205), `TransferDetailScreen.kt`. iOS: `app/transfers.tsx`, `services/real-api.ts`.

**22. Cancelled transfers are hidden.** Android lists them under "Tous". We drop drafts, cancelled and rejected ones. A driver who was told about a transfer that was then cancelled sees nothing.
- Android: `TransferViewModel.kt` (`allTransfers`). iOS: `services/real-api.ts` (`toTransfer`).

**23. No dark-mode switch.** Android has one in Profile. We follow the phone's setting.
- Android: `ProfileScreen.kt`. iOS: `constants/` (colours), `app/(tabs)/profile/index.tsx`.

---

## 3. Your nine points, answered

| # | Point | Answer |
|---|---|---|
| 1 | History: identical cards for the same parcel | **Confirmed.** Gap 2. Run code, date and attempt are available but not shown. |
| 2 | Transfer detail screen | **We don't have one.** Gap 3. |
| 3 | Home location "Sousse Médina, Sousse" | **It comes from the phone's GPS.** The position is turned into a place name by iOS (district, city). It is not hardcoded, not test data, and not the agency. If GPS is refused or fails, Home shows the run's zone instead (the governorates of its parcels, or the agency name). With no run and no GPS it shows nothing. In your screenshot there is no open run, so it is the GPS. Android shows no location at all. Code: `app/(tabs)/home/index.tsx` (`reverseGeocodeAsync`, `locationLabel`), `lib/useLiveCoords.ts`. |
| 4 | One name for pickups | **Confirmed.** Gap 7. Four wordings on iOS. |
| 5 | Pickup counter 6 vs 0 | **Confirmed.** Gap 5. Android counts all, we count the ones to do. |
| 6 | Home gauge is today's rate | **Confirmed.** Gap 8. Home = open runs, Profile = all time. |
| 7 | "5 En transit" counts parcels | **Confirmed.** Gap 11. |
| 8 | Badge on Transferts | **Confirmed.** Gap 6. Android has badges on all four buttons. |
| 9 | "Naviguer" and contact on an opened pickup | **Partly there.** We have both on a scheduled pickup. Not on a collected one. Gap 10. |

---

## 4. What we do that Android doesn't

| iOS only | Improvement or risk? |
|---|---|
| History of delivered and failed parcels, with closed runs | Improvement. Needs gap 2 fixed to be readable. |
| Search across runs, history, pickups, transfers, returns | Improvement. |
| Parcel screen with map, navigate, cash step | Improvement. |
| Auto-refresh every 60 s, on foreground, on focus | Improvement. A little more traffic on the server. |
| Cached data and "Connexion impossible" with retry | Improvement. |
| "Tournée clôturée par l'agence" | Improvement. |
| Attempt number, "Dernière tentative" | Improvement. |
| Exchange badge and required tick | Improvement. Local only: the server is not told. |
| Call log and call-before-delivery rule | Client request. Risk in gap 15. |
| Failure note with call proof and GPS position | Improvement. Uses the `notes` field for something Android leaves empty. |
| Pickup check (tick or scan each parcel) | Improvement. Slower than Android's two taps. |
| Transfer scan before taking it | Improvement. "Confirmer sans scan" keeps it from blocking. |
| "Terminer tous les pickups" | Client request. Risk: skips the parcel check. The dialog says so. |
| Confirm + start in one tap | Faster. Risk in gap 14. |
| Full-run lock on a changed run | **Risk.** Gap 1. |
| "Remettre en attente" | **Risk.** Gap 19, untested on the live server. |
| Nearest-first order, drag to reorder | Improvement. On the phone only. |
| English | Improvement. |
| Token in secure storage | Improvement. |
| Alerts open the parcel they are about | Improvement. |

## 5. What I could not check

- **Real behaviour of the server** for gaps 1 and 19. This was a read-only audit of source code, with writes off.
- **Android at runtime.** I read the code and your screenshots. I did not run the Android app.
- **The Android "Historique" button** on the dashboard: in the code it opens the active runs list. I did not see it on a device.
