import { Redis } from "@upstash/redis";
import { env } from "./env";

// Upstash's REST-based client — works over HTTPS, no persistent socket needed.
// This matters for free-tier serverless-style hosting (Render/Railway free
// dynos can be less forgiving of long-lived raw TCP connections).
export const redis = new Redis({
  url: env.upstashUrl,
  token: env.upstashToken,
});

export async function testRedisConnection(): Promise<void> {
  await redis.set("healthcheck", "ok");
  const value = await redis.get("healthcheck");
  if (value !== "ok") {
    throw new Error("Redis healthcheck failed");
  }
  console.log("✅ Redis connected");
}

// Redis key conventions used across the app — centralized here so nothing
// drifts as the matching/location code grows.
export const RedisKeys = {
  driverGeoIndex: "drivers:geo", // GEO set of all online driver locations
  driverAvailable: (driverId: string) => `driver:${driverId}:available`,
  rideOfferLock: (rideId: string) => `ride:${rideId}:offer_lock`,
};
