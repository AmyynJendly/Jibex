/** Matches the real backend's uppercase enum strings. */
export type ReturnStatus = 'PENDING_PICKUP' | 'PROCESSED';
export type ReturnReason = 'REFUSED' | 'ADDRESS_ISSUE' | 'DAMAGED';

export interface Return {
  id: string;
  status: ReturnStatus;
  reason: ReturnReason;
  /** The original delivery this return is tied to, e.g. "TRK-5DF3697E". */
  relatedJobId: string;
  customerName: string;
  address: string;
}
