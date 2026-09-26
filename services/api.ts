/**
 * What the screens import. It answers from the real server or the mock,
 * according to the single switch in `constants/backend.ts`.
 *
 * The backend is being connected one piece at a time. Each function listed
 * below the re-export has a real version and follows the switch; everything
 * else is re-exported from the mock unchanged until its real version exists.
 * Both sides keep the same names and result shapes, so moving a function
 * over never touches a screen.
 */
import { API_MODE } from '../constants/backend';
import * as mock from './mock-api';
import * as real from './real-api';

export * from './mock-api';

const useReal = API_MODE === 'real';

// ── Connected to the real server ──────────────────────────────────────────
export const login = useReal ? real.login : mock.login;
export const getUser = useReal ? real.getUser : mock.getUser;
export const logout = useReal ? real.logout : mock.logout;

// Runsheets and parcels (read-only).
export const getRunsheets = useReal ? real.getRunsheets : mock.getRunsheets;
export const getRunsheet = useReal ? real.getRunsheet : mock.getRunsheet;
export const getRunsheetJobs = useReal ? real.getRunsheetJobs : mock.getRunsheetJobs;
export const getActiveParcels = useReal ? real.getActiveParcels : mock.getActiveParcels;
export const getHistoryParcels = useReal ? real.getHistoryParcels : mock.getHistoryParcels;
export const getJobsByIds = useReal ? real.getJobsByIds : mock.getJobsByIds;
export const getJobDetail = useReal ? real.getJobDetail : mock.getJobDetail;
export const optimizeRouteOrder = useReal ? real.optimizeRouteOrder : mock.optimizeRouteOrder;
export const getNextStopId = useReal ? real.getNextStopId : mock.getNextStopId;

// Phone-only state over real parcels (the call log and the driver's order
// live on the phone; the mock versions only know mock parcels).
export const logCallAttempt = useReal ? real.logCallAttempt : mock.logCallAttempt;
export const setStopOrder = useReal ? real.setStopOrder : mock.setStopOrder;
