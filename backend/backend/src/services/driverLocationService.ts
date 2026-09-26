import { redis, RedisKeys } from "../config/redis";
import { Coordinates } from "../types";
import { AvailableDriver } from "./matchingEngine";

/**
 * Called on every driver:location_update WebSocket event (see sockets/).
 * GEOADD upserts the driver's position in the shared geo index.
 */
export async function updateDriverLocation(
  driverId: string,
  location: Coordinates
): Promise<void> {
  await redis.geoadd(RedisKeys.driverGeoIndex, {
    member: driverId,
    longitude: location.lng,
    latitude: location.lat,
  });
}

export async function setDriverAvailable(driverId: string): Promise<void> {
  await redis.set(RedisKeys.driverAvailable(driverId), "1");
}

export async function setDriverUnavailable(driverId: string): Promise<void> {
  await redis.del(RedisKeys.driverAvailable(driverId));
}

export async function isDriverAvailable(driverId: string): Promise<boolean> {
  const value = await redis.get(RedisKeys.driverAvailable(driverId));
  return value === "1";
}

/**
 * Removes a driver from the geo index entirely — called when a driver
 * goes offline, not just when they become unavailable mid-ride. Offline
 * drivers shouldn't appear in search radius queries at all.
 */
export async function removeDriverFromIndex(driverId: string): Promise<void> {
  await redis.zrem(RedisKeys.driverGeoIndex, driverId);
}

/**
 * The Redis half of matching: GEOSEARCH for candidates within a radius,
 * filtered to only those currently marked available. Ranking/ordering
 * of the results is handled separately by rankDriversByDistance() in
 * matchingEngine.ts — this function's only job is fetching candidates.
 */
export async function findNearbyAvailableDrivers(
  pickup: Coordinates,
  radiusKm: number
): Promise<AvailableDriver[]> {
  const results = await redis.geosearch(RedisKeys.driverGeoIndex, {
    type: "fromlonlat",
    coordinate: { lon: pickup.lng, lat: pickup.lat },
  }, {
    type: "byradius",
    radius: radiusKm,
    radiusType: "KM",
  }, "ASC", { withCoord: true });

  const candidates: AvailableDriver[] = [];

  for (const result of results as any[]) {
    const driverId = typeof result === "string" ? result : result.member;
    const available = await isDriverAvailable(driverId);
    if (!available) continue;

    const coord = typeof result === "object" ? result.coord : null;
    if (!coord) continue;

    candidates.push({
      driverId,
      location: { lat: coord.latitude, lng: coord.longitude },
    });
  }

  return candidates;
}
