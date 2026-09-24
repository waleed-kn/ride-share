import express from "express";
import cors from "cors";
import { env } from "./config/env";
import authRoutes from "./routes/auth";
import driverRoutes from "./routes/driver";
import rideRoutes from "./routes/rides";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ data: { status: "ok", env: env.nodeEnv } });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/driver", driverRoutes);
  app.use("/api/rides", rideRoutes);

  // 404 handler — anything not matched above
  app.use((_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });

  return app;
}
