import { testRedisConnection } from "../config/redis";

testRedisConnection()
  .then(() => {
    console.log("Redis connection check passed.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Redis connection failed:");
    console.error(err.message);
    process.exit(1);
  });
