import { env } from "../config/env";
import { findNearbyAvailableDrivers } from "./driverLocationService";
import { rankDriversByDistance } from "./matchingEngine";
import { Coordinates, Ride } from "../types";
import { getIo } from "../sockets";
import { SocketEvents } from "../sockets/events";
import { redis, RedisKeys } from "../config/redis";

/**
 * In-memory map of rideId -> the ordered list of driver IDs still left to
 * offer, plus which one is currently pending. This is process-local state,
 * which is fine for a single-instance deployment (which this project is,
 * on Render/Railway free tier) but would need to move to Redis if this
 * ever ran on multiple server instances — noted here so future-you
 * doesn't forget why it's an in-memory Map instead of a DB table.
 */
interface MatchingState {
  candidateQueue: string[]; // remaining driver IDs, nearest first
  currentOfferDriverId: string | null;
  timeoutHandle: NodeJS.Timeout | null;
}

const activeMatches = new Map<string, MatchingState>();

/**
 * Entry point: called right after a ride is created. Finds nearby
 * drivers, ranks them, and starts offering the ride starting with the
 * nearest. Expands the search radius once if the first search comes up
 * empty, per the system design default (5km -> 10km).
 */
export async function startMatching(ride: Ride): Promise<void> {
  const pickup: Coordinates = { lat: ride.pickup_lat, lng: ride.pickup_lng };

  let candidates = await findNearbyAvailableDrivers(pickup, env.matching.radiusKm);
  if (candidates.length === 0) {
    candidates = await findNearbyAvailableDrivers(pickup, env.matching.radiusKmExpanded);
  }

  if (candidates.length === 0) {
    getIo().to(ride.rider_id).emit(SocketEvents.RIDE_DECLINED, {
      rideId: ride.id,
      reason: "no_drivers_available",
    });
    return;
  }

  const ranked = rankDriversByDistance(pickup, candidates);
  const queue = ranked.map((d) => d.driverId);

  activeMatches.set(ride.id, {
    candidateQueue: queue,
    currentOfferDriverId: null,
    timeoutHandle: null,
  });

  await offerToNextDriver(ride.id);
}

async function offerToNextDriver(rideId: string): Promise<void> {
  const state = activeMatches.get(rideId);
  if (!state) return;

  const nextDriverId = state.candidateQueue.shift();

  if (!nextDriverId) {
    // Ran out of candidates — nobody accepted.
    const ride = await import("./rideService").then((m) => m.getRideById(rideId));
    if (ride) {
      getIo().to(ride.rider_id).emit(SocketEvents.RIDE_DECLINED, {
        rideId,
        reason: "no_drivers_accepted",
      });
    }
    activeMatches.delete(rideId);
    return;
  }

  state.currentOfferDriverId = nextDriverId;

  const ride = await import("./rideService").then((m) => m.getRideById(rideId));
  if (!ride) {
    activeMatches.delete(rideId);
    return;
  }

  getIo().to(nextDriverId).emit(SocketEvents.RIDE_REQUESTED, { ride });

  // Auto-advance to the next driver if this one doesn't respond in time.
  state.timeoutHandle = setTimeout(() => {
    handleDriverTimeout(rideId, nextDriverId);
  }, env.matching.offerTimeoutSeconds * 1000);
}

async function handleDriverTimeout(rideId: string, driverId: string): Promise<void> {
  const state = activeMatches.get(rideId);
  if (!state || state.currentOfferDriverId !== driverId) return; // already resolved

  await offerToNextDriver(rideId);
}

/**
 * Called from the ride accept route. Confirms this driver was actually
 * the one currently offered the ride (guards against a stale/duplicate
 * accept arriving after timeout already moved on) before clearing state.
 */
export function confirmAcceptance(rideId: string, driverId: string): boolean {
  const state = activeMatches.get(rideId);
  if (!state || state.currentOfferDriverId !== driverId) return false;

  if (state.timeoutHandle) clearTimeout(state.timeoutHandle);
  activeMatches.delete(rideId);
  return true;
}

/**
 * Called from the decline route — driver explicitly said no, skip
 * straight to the next candidate instead of waiting out the timeout.
 */
export async function handleDecline(rideId: string, driverId: string): Promise<void> {
  const state = activeMatches.get(rideId);
  if (!state || state.currentOfferDriverId !== driverId) return;

  if (state.timeoutHandle) clearTimeout(state.timeoutHandle);
  await offerToNextDriver(rideId);
}
