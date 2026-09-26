import { Coordinates } from "../types";

export interface AvailableDriver {
  driverId: string;
  location: Coordinates;
}

export interface RankedDriver extends AvailableDriver {
  distanceKm: number;
}

/**
 * Haversine formula — great-circle distance between two lat/lng points
 * in kilometers. Pulled out as a standalone pure function specifically
 * so it can be unit tested without touching Redis or the database.
 */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Ranks available drivers by distance from the pickup point, nearest
 * first. This is the pure "given a list of candidates, pick the order
 * to offer them in" logic — the Redis GEOSEARCH query that *produces*
 * the candidate list lives in driverLocationService.ts, kept separate
 * so this ranking/ordering logic is trivially unit-testable.
 */
export function rankDriversByDistance(
  pickup: Coordinates,
  candidates: AvailableDriver[]
): RankedDriver[] {
  return candidates
    .map((driver) => ({
      ...driver,
      distanceKm: distanceKm(pickup, driver.location),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Simple fare calculation per the system design defaults:
 * base fare + (distance in km × rate per km). No time component in v1.
 */
export function calculateFare(
  pickup: Coordinates,
  dropoff: Coordinates,
  baseFare: number,
  perKmRate: number
): number {
  const distance = distanceKm(pickup, dropoff);
  const fare = baseFare + distance * perKmRate;
  return Math.round(fare * 100) / 100; // round to cents
}
