/**
 * Event names exactly as defined in the system design doc's WebSocket
 * contract. Centralized here so client and server code never drift on
 * a typo'd event string.
 */
export const SocketEvents = {
  // Client → Server
  DRIVER_LOCATION_UPDATE: "driver:location_update",

  // Server → Client
  RIDE_REQUESTED: "ride:requested",
  RIDE_ACCEPTED: "ride:accepted",
  RIDE_DECLINED: "ride:declined",
  RIDE_STATUS_CHANGED: "ride:status_changed",
  DRIVER_POSITION: "driver:position",
  RIDE_CANCELLED: "ride:cancelled",
} as const;
