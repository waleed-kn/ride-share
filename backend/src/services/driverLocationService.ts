import { redis, RedisKeys } from "../config/redis";
import { Coordinates } from "../types";
import { AvailableDriver } from "./matchingEngine";

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
  const key = RedisKeys.driverAvailable(driverId);
  const result = await redis.set(key, "1");
  console.log(`setDriverAvailable: key=${key} result=${result}`);
}

export async function setDriverUnavailable(driverId: string): Promise<void> {
  await redis.del(RedisKeys.driverAvailable(driverId));
}
export async function isDriverAvailable(driverId: string): Promise<boolean> {
  const value = await redis.get(RedisKeys.driverAvailable(driverId));
  console.log(`isDriverAvailable check: driverId=${driverId} rawValue=${JSON.stringify(value)} type=${typeof value}`);
  return value === "1" || value === 1;
}

export async function removeDriverFromIndex(driverId: string): Promise<void> {
  await redis.zrem(RedisKeys.driverGeoIndex, driverId);
}

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

  // Temporary debug logging — remove once matching is confirmed working.
  console.log("GEOSEARCH raw results:", JSON.stringify(results, null, 2));

  for (const result of results as any[]) {
    const driverId = typeof result === "string" ? result : result.member;
    const available = await isDriverAvailable(driverId);
    console.log(`Checked driver ${driverId}: available=${available}`);
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