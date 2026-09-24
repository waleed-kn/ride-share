import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import { verifyToken } from "../utils/jwt";
import { JwtPayload } from "../types";

// Extend Socket.IO's socket data so req.data.user is typed everywhere.
declare module "socket.io" {
  interface Socket {
    user?: JwtPayload;
  }
}

/**
 * Runs once per socket connection, before any event handlers fire.
 * The client sends its JWT the same way it would for a REST call — via
 * `auth: { token }` in the client-side io() config — so login/signup
 * stays a single source of truth for identity.
 */
export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: ExtendedError) => void
) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("UNAUTHORIZED: missing token"));
  }

  try {
    socket.user = verifyToken(token);
    next();
  } catch {
    next(new Error("UNAUTHORIZED: invalid or expired token"));
  }
}
