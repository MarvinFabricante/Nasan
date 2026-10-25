import {
  Coordinate,
  MonitorThreshold,
  NearestStopResult,
  ProximityCheckResult,
  RouteStop,
} from '@/types';

const EARTH_RADIUS_KM = 6371;

/**
 * Calculates the great-circle distance between two coordinates in kilometers.
 */
export function calculateDistanceKm(
  coord1?: Coordinate | null,
  coord2?: Coordinate | null,
): number {
  if (
    !coord1 ||
    !coord2 ||
    typeof coord1.latitude !== 'number' ||
    typeof coord1.longitude !== 'number' ||
    typeof coord2.latitude !== 'number' ||
    typeof coord2.longitude !== 'number'
  ) {
    return 0;
  }

  const toRad = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Formats a distance in kilometers to a clean, user-friendly string.
 */
export function formatDistance(km?: number | null): string {
  if (typeof km !== 'number' || Number.isNaN(km) || km < 0) {
    return '--';
  }

  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m`;
  }

  return `${km.toFixed(1)} km`;
}

/**
 * Parses numeric minutes from an ETA string like "5 min" or "10 mins".
 */
export function parseEtaMinutes(eta?: string | number | null): number | null {
  if (typeof eta === 'number') return eta;
  if (!eta || typeof eta !== 'string') return null;

  const match = eta.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Estimates arrival time from distance assuming average urban bus speed (25 km/h).
 */
export function estimateEtaFromDistance(distanceKm?: number | null): string {
  if (typeof distanceKm !== 'number' || distanceKm <= 0) return 'Arrived';
  const averageSpeedKmH = 25;
  const hours = distanceKm / averageSpeedKmH;
  const minutes = Math.max(1, Math.round(hours * 60));
  return `${minutes} min`;
}

/**
 * Finds the nearest stop from a bus's route stops relative to a coordinate.
 */
export function findNearestStop(
  routeStops?: RouteStop[] | null,
  targetCoordinate?: Coordinate | null,
): NearestStopResult | null {
  if (!Array.isArray(routeStops) || !routeStops.length || !targetCoordinate) {
    return null;
  }

  let nearest: RouteStop | null = null;
  let minDistance = Infinity;

  for (const stop of routeStops) {
    if (typeof stop.latitude === 'number' && typeof stop.longitude === 'number') {
      const distance = calculateDistanceKm(stop, targetCoordinate);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = stop;
      }
    }
  }

  return nearest ? { stop: nearest, distanceKm: minDistance } : null;
}

/**
 * Evaluates whether a bus meets the proximity criteria for notifications.
 */
export function checkProximity(
  bus?: { coordinates?: Coordinate; location?: Coordinate; eta?: string | number } | null,
  stopCoordinate?: Coordinate | null,
  threshold: MonitorThreshold = '1km',
): ProximityCheckResult {
  const busCoordinate = bus?.coordinates || bus?.location;
  if (!busCoordinate || !stopCoordinate) {
    return { isNear: false, distanceKm: Infinity, etaMinutes: null };
  }

  const distanceKm = calculateDistanceKm(busCoordinate, stopCoordinate);
  const etaMinutes = parseEtaMinutes(bus?.eta);

  let isNear = false;

  switch (threshold) {
    case '500m':
      isNear = distanceKm <= 0.5;
      break;
    case '5min':
      if (etaMinutes !== null) {
        isNear = etaMinutes <= 5;
      } else {
        isNear = (distanceKm / 25) * 60 <= 5;
      }
      break;
    case '1km':
    default:
      isNear = distanceKm <= 1.0;
      break;
  }

  return { isNear, distanceKm, etaMinutes };
}
