export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarInitials: string;
  /** Short internal driver code shown on the profile card and in Settings, e.g. "DRV-2841". */
  driverCode: string;
}
