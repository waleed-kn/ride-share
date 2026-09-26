import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",

  databaseUrl: required("DATABASE_URL"),

  upstashUrl: required("UPSTASH_REDIS_REST_URL"),
  upstashToken: required("UPSTASH_REDIS_REST_TOKEN"),

  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN || "",

  matching: {
    radiusKm: parseFloat(process.env.MATCH_RADIUS_KM || "5"),
    radiusKmExpanded: parseFloat(process.env.MATCH_RADIUS_KM_EXPANDED || "10"),
    offerTimeoutSeconds: parseInt(process.env.DRIVER_OFFER_TIMEOUT_SECONDS || "15", 10),
  },

  fare: {
    base: parseFloat(process.env.FARE_BASE || "2.00"),
    perKm: parseFloat(process.env.FARE_PER_KM || "0.80"),
  },
};
