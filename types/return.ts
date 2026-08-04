export type ReturnStatus = 'pending-pickup' | 'processed';
export type ReturnReason = 'refused' | 'address-issue' | 'damaged';

export interface Return {
  id: string;
  status: ReturnStatus;
  reason: ReturnReason;
  /** The original delivery this return is tied to, e.g. "JBX-47810". */
  relatedJobId: string;
  customerName: string;
  address: string;
}
