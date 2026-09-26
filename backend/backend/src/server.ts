import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { testDbConnection } from "./config/db";
import { testRedisConnection } from "./config/redis";
import { initSocketServer } from "./sockets";

async function main() {
  // Fail fast on boot if either data store is unreachable — better to
  // crash immediately with a clear error than to serve traffic that will
  // fail on every request that touches the DB or Redis.
  await testDbConnection();
  await testRedisConnection();

  const app = createApp();
  const httpServer = createServer(app);
  initSocketServer(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`🚀 Server running on http://localhost:${env.port}`);
    console.log(`   Environment: ${env.nodeEnv}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
