import { RideStatus } from "../types";

/**
 * The ride lifecycle, exactly as decided in system design:
 *
 *   requested → accepted → driver_arriving → in_progress → completed → paid
 *   requested → cancelled                 (rider cancels before match)
 *   accepted  → cancelled                 (either party cancels before pickup)
 *
 * This map is the single source of truth for "what transition is legal."
 * Every status change in the app — REST route or WebSocket event — must
 * go through `canTransition` / `assertTransition` below. No code should
 * ever write a new status directly without checking this first.
 */
const ALLOWED_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  requested: ["accepted", "cancelled"],
  accepted: ["driver_arriving", "cancelled"],
  driver_arriving: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: ["paid"],
  paid: [], // terminal
  cancelled: [], // terminal
};

export function canTransition(from: RideStatus, to: RideStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export class InvalidRideTransitionError extends Error {
  constructor(from: RideStatus, to: RideStatus) {
    super(`Invalid ride transition: ${from} → ${to}`);
    this.name = "InvalidRideTransitionError";
  }
}

/**
 * Throws if the transition isn't legal. Callers (route handlers, socket
 * handlers) call this before writing to the database, so an illegal
 * transition never reaches persistence.
 */
export function assertTransition(from: RideStatus, to: RideStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidRideTransitionError(from, to);
  }
}

export function isTerminal(status: RideStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}
