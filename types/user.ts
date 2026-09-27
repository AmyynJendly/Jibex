export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarInitials: string;
  /** Short internal driver code shown on the profile card and in Settings, e.g. "DRV-2841". */
  driverCode: string;
}

/**
 * Who a driver calls or writes to at their agency. Taken from the agency
 * the server sends with their runsheets (or transfers); either part may be
 * missing, and the app falls back to the placeholders in constants/contact.
 */
export interface DispatchContact {
  phone?: string;
  email?: string;
  agencyName?: string;
}
