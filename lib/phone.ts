/** Strips display formatting (spaces, dashes, parens) down to a dialable `tel:` URL. */
export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, '')}`;
}
