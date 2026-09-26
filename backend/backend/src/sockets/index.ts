import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { env } from "../config/env";
import { socketAuthMiddleware } from "./socketAuth";
import { SocketEvents } from "./events";
import {
  updateDriverLocation,
  setDriverAvailable,
  setDriverUnavailable,
  removeDriverFromIndex,
} from "../services/driverLocationService";
import { z } from "zod";

const locationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

let io: Server;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket: Socket) => {
    const user = socket.user!;
    console.log(`Socket connected: ${user.userId} (${user.role})`);

    // Every user gets their own personal room, keyed by userId. This is
    // how we target "send this event to this one specific user" without
    // tracking socket IDs anywhere else — join once at connection time,
    // emit to `io.to(userId)` from anywhere in the app.
    socket.join(user.userId);

    if (user.role === "driver") {
      registerDriverHandlers(socket, user.userId);
    }

    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${user.userId}`);
      if (user.role === "driver") {
        // Going offline on disconnect prevents a dropped connection from
        // leaving a "ghost" driver marked available in the geo index
        // forever — riders would get matched to someone who can't respond.
        await removeDriverFromIndex(user.userId);
        await setDriverUnavailable(user.userId);
      }
    });
  });

  return io;
}

function registerDriverHandlers(socket: Socket, driverId: string) {
  socket.on(SocketEvents.DRIVER_LOCATION_UPDATE, async (payload: unknown) => {
    const parsed = locationUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("error", { message: "Invalid location payload" });
      return;
    }

    await updateDriverLocation(driverId, parsed.data);

    // If this driver is currently on an active ride, broadcast their
    // position to the rider. (Ride-room targeting is wired in Phase 3
    // once ride requests exist — this hook is left ready for that.)
  });
}

/**
 * Called from route handlers (e.g. POST /driver/online) rather than a
 * socket event, since "going online" is as much a state change as a
 * real-time signal — REST fits it better, Redis availability flag is
 * the actual source of truth either way.
 */
export async function markDriverOnline(driverId: string, lat: number, lng: number) {
  await updateDriverLocation(driverId, { lat, lng });
  await setDriverAvailable(driverId);
}

export async function markDriverOffline(driverId: string) {
  await removeDriverFromIndex(driverId);
  await setDriverUnavailable(driverId);
}

export function getIo(): Server {
  if (!io) {
    throw new Error("Socket.IO server not initialized yet");
  }
  return io;
}
