import { pool } from "../config/db";
import { Ride, RideStatus, Coordinates } from "../types";
import { assertTransition } from "./rideStateMachine";
import { calculateFare } from "./matchingEngine";
import { env } from "../config/env";

export async function createRide(
  riderId: string,
  pickup: Coordinates,
  dropoff: Coordinates
): Promise<Ride> {
  const fare = calculateFare(pickup, dropoff, env.fare.base, env.fare.perKm);

  const result = await pool.query<Ride>(
    `INSERT INTO rides (rider_id, status, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, fare)
     VALUES ($1, 'requested', $2, $3, $4, $5, $6)
     RETURNING *`,
    [riderId, pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, fare]
  );

  return result.rows[0];
}

export async function getRideById(rideId: string): Promise<Ride | null> {
  const result = await pool.query<Ride>("SELECT * FROM rides WHERE id = $1", [rideId]);
  return result.rows[0] ?? null;
}

export async function assignDriver(rideId: string, driverId: string): Promise<Ride> {
  const ride = await getRideById(rideId);
  if (!ride) throw new Error("Ride not found");

  assertTransition(ride.status, "accepted");

  const result = await pool.query<Ride>(
    `UPDATE rides SET driver_id = $1, status = 'accepted' WHERE id = $2 RETURNING *`,
    [driverId, rideId]
  );
  return result.rows[0];
}

/**
 * Validated status transition — the only way ride status should ever be
 * written after creation. Goes through the state machine first, so an
 * illegal transition throws before touching the database.
 */
export async function updateRideStatus(rideId: string, newStatus: RideStatus): Promise<Ride> {
  const ride = await getRideById(rideId);
  if (!ride) throw new Error("Ride not found");

  assertTransition(ride.status, newStatus);

  const completedAtClause = newStatus === "completed" ? ", completed_at = now()" : "";

  const result = await pool.query<Ride>(
    `UPDATE rides SET status = $1 ${completedAtClause} WHERE id = $2 RETURNING *`,
    [newStatus, rideId]
  );
  return result.rows[0];
}

export async function getRideHistory(userId: string, role: "rider" | "driver"): Promise<Ride[]> {
  const column = role === "rider" ? "rider_id" : "driver_id";
  const result = await pool.query<Ride>(
    `SELECT * FROM rides WHERE ${column} = $1 ORDER BY requested_at DESC`,
    [userId]
  );
  return result.rows;
}
