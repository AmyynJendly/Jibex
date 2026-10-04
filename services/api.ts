/**
 * What the screens import. It answers from the real server or the mock,
 * according to the switch in `constants/backend.ts`.
 *
 * Each function listed below the re-export has a real version and follows
 * the switch; everything else is re-exported from the mock unchanged. Both
 * sides keep the same names and result shapes, so moving a function over
 * never touches a screen.
 *
 * Writes: in real mode every action that would change server data goes to
 * `real-api`, which refuses it on the phone ("Not connected to the server
 * yet") unless `EXPO_PUBLIC_API_WRITES` is on. None of them can fall through
 * to the mock in real mode — a fake success on real data is exactly what
 * this layer exists to prevent.
 */
import { API_MODE } from '../constants/backend';
import * as mock from './mock-api';
import * as real from './real-api';

// Nothing is passed through from the mock wholesale: every function a
// screen can call is named below, so a new mock write can't slip into real
// mode unnoticed.
export type { ScanResult } from './mock-api';

// Phone-only settings. The mock versions already keep these in
// lib/deviceStore, which is the same store in both modes.
export const getNearestFirst = mock.getNearestFirst;
export const setNearestFirst = mock.setNearestFirst;
export const setPickupOrder = mock.setPickupOrder;
export const setTransferOrder = mock.setTransferOrder;
export const setReturnOrder = mock.setReturnOrder;


const useReal = API_MODE === 'real';

// ── Connected to the real server ──────────────────────────────────────────
export const login = useReal ? real.login : mock.login;
export const getUser = useReal ? real.getUser : mock.getUser;
export const logout = useReal ? real.logout : mock.logout;

// Runsheets and parcels. History includes runsheets the agency has closed.
export const getRunsheets = useReal ? real.getRunsheets : mock.getRunsheets;
export const getClosedRunsheetsToday = useReal ? real.getClosedRunsheetsToday : mock.getClosedRunsheetsToday;
export const getActiveParcels = useReal ? real.getActiveParcels : mock.getActiveParcels;
export const getHistoryParcels = useReal ? real.getHistoryParcels : mock.getHistoryParcels;
export const getJobsByIds = useReal ? real.getJobsByIds : mock.getJobsByIds;
export const getJobDetail = useReal ? real.getJobDetail : mock.getJobDetail;
export const optimizeRouteOrder = useReal ? real.optimizeRouteOrder : mock.optimizeRouteOrder;
export const getNextStopId = useReal ? real.getNextStopId : mock.getNextStopId;

// The driver's numbers and vehicle, worked out from real runsheets.
export const getDriverStats = useReal ? real.getDriverStats : mock.getDriverStats;
export const getVehicle = useReal ? real.getVehicle : mock.getVehicle;
export const getDispatchContact = useReal ? real.getDispatchContact : mock.getDispatchContact;

// Pickups, transfers, returns and notifications. Notifications are fetched
// by the user account id; everything else by the driver id.
export const getPickups = useReal ? real.getPickups : mock.getPickups;
export const getTransfers = useReal ? real.getTransfers : mock.getTransfers;
export const getReturns = useReal ? real.getReturns : mock.getReturns;
export const getNotifications = useReal ? real.getNotifications : mock.getNotifications;

// Phone-only state over real parcels (the call log and the driver's order
// live on the phone; the mock versions only know mock parcels).
export const logCallAttempt = useReal ? real.logCallAttempt : mock.logCallAttempt;
export const setStopOrder = useReal ? real.setStopOrder : mock.setStopOrder;
export const confirmScan = useReal ? real.confirmScan : mock.confirmScan;

// ── Writes ────────────────────────────────────────────────────────────────
export const confirmRunsheetReceipt = useReal ? real.confirmRunsheetReceipt : mock.confirmRunsheetReceipt;
export const rejectRunsheet = useReal ? real.rejectRunsheet : mock.rejectRunsheet;
export const rejectNewParcels = useReal ? real.rejectNewParcels : mock.rejectNewParcels;
export const confirmDelivery = useReal ? real.confirmDelivery : mock.confirmDelivery;
export const markDeliveryFailed = useReal ? real.markDeliveryFailed : mock.markDeliveryFailed;
export const reopenParcel = useReal ? real.reopenParcel : mock.reopenParcel;
export const completePickups = useReal ? real.completePickups : mock.completePickups;
export const confirmReturns = useReal ? real.confirmReturns : mock.confirmReturns;
export const confirmTransferPickup = useReal ? real.confirmTransferPickup : mock.confirmTransferPickup;
export const markNotificationRead = useReal ? real.markNotificationRead : mock.markNotificationRead;
export const markAllNotificationsRead = useReal ? real.markAllNotificationsRead : mock.markAllNotificationsRead;

// Alerts: no server endpoint for these — on real data they stay on the phone.
export const markNotificationUnread = useReal ? real.markNotificationUnread : mock.markNotificationUnread;
export const deleteNotification = useReal ? real.deleteNotification : mock.deleteNotification;
export const deleteAllNotifications = useReal ? real.deleteAllNotifications : mock.deleteAllNotifications;
