import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

let socket: Socket | null = null;

/**
 * Lazily creates a single shared socket connection, authenticated with
 * the same JWT used for REST calls. Call this once a token exists (i.e.
 * after login) — calling it before that would connect with no auth and
 * get rejected by socketAuthMiddleware on the backend.
 */
export function getSocket(token: string): Socket {
  if (socket && socket.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: true,
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
