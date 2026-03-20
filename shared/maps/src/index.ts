export interface Coordinates {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const aa =
    sinDLat * sinDLat +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * sinDLng * sinDLng;

  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return EARTH_RADIUS_KM * c;
}

export function totalPolylineDistanceKm(points: Coordinates[]): number {
  if (points.length < 2) {
    return 0;
  }

  return points.slice(1).reduce((acc, point, index) => {
    return acc + haversineDistanceKm(points[index], point);
  }, 0);
}

export function toGoogleLatLngLiteral(point: Coordinates): { lat: number; lng: number } {
  return { lat: point.lat, lng: point.lng };
}
