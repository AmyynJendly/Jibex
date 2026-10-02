/**
 * What still stands between a parcel and "Livré", checked on the phone
 * before anything is sent. Returns the i18n key of the reason, or null when
 * the delivery can go ahead.
 *
 *  - The customer must have been called at least once (the client's rule).
 *  - An exchange parcel: the driver hands over the new article and takes the
 *    old one back for the sender. The server only carries the `exchange`
 *    flag — it has no step for the driver — so the app asks the driver to
 *    confirm they have the article before the delivery can be recorded.
 *    Nothing about that tick is sent; the agency confirms the exchange itself
 *    when the article comes back (its "Échanges" scan).
 */
export type DeliveryBlocker = 'statusUpdate.callRequired' | 'exchange.required';

export function deliveryBlocker(parcel: {
  callAttempts: number;
  exchange?: boolean;
  /** The driver ticked "J'ai récupéré l'article". */
  exchangeCollected: boolean;
}): DeliveryBlocker | null {
  if (parcel.callAttempts <= 0) return 'statusUpdate.callRequired';
  if (parcel.exchange && !parcel.exchangeCollected) return 'exchange.required';
  return null;
}
