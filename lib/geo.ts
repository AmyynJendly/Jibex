export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Sousse/Sahloul depot — the fallback origin for distance/ETA calculations when live GPS isn't available (permission denied, or unsupported on this platform, e.g. Expo web). Mirrors mock-api's DEPOT. */
export const FALLBACK_ORIGIN: GeoPoint = { lat: 35.848, lng: 10.5975 };

/** Great-circle distance between two coordinates, in kilometers. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
