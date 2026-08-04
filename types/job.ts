export type JobStatus = 'pending' | 'in-transit' | 'delivered' | 'failed';

export interface PackageInfo {
  count: number;
  weightLbs: number;
  fragile: boolean;
  note?: string;
}

export interface Job {
  id: string;
  customerName: string;
  address: string;
  packageInfo: PackageInfo;
  status: JobStatus;
  /** Amount owed by the customer on delivery (COD is ~99% of orders). */
  cashToCollect: number;
  /** Set once the driver confirms delivery; may differ from cashToCollect. */
  cashCollected?: number;
}
