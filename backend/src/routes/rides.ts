import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  createRide,
  getRideById,
  assignDriver,
  updateRideStatus,
  getRideHistory,
} from "../services/rideService";
import {
  startMatching,
  confirmAcceptance,
  handleDecline,
} from "../services/matchingOrchestrator";
import { InvalidRideTransitionError } from "../services/rideStateMachine";
import { payForRide, PaymentError } from "../services/paymentService";
import { getIo } from "../sockets";
import { SocketEvents } from "../sockets/events";

const router = Router();

const coordsSchema = z.object({ lat: z.number(), lng: z.number() });
const requestRideSchema = z.object({
  pickup: coordsSchema,
  dropoff: coordsSchema,
});
const statusUpdateSchema = z.object({
  status: z.enum(["driver_arriving", "in_progress", "completed"]),
});
const paySchema = z.object({
  paymentMethodId: z.string().min(1),
});

// POST /api/rides — rider requests a ride, kicks off matching
router.post("/", requireAuth, requireRole("rider"), async (req: Request, res: Response) => {
  const parsed = requestRideSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
  }

  const ride = await createRide(req.user!.userId, parsed.data.pickup, parsed.data.dropoff);

  // Matching runs async — the rider gets the ride object immediately with
  // status "requested", then WebSocket events carry the match result.
  startMatching(ride).catch((err) => console.error("Matching error:", err));

  res.status(201).json({ data: { ride } });
});

router.get("/history", requireAuth, async (req: Request, res: Response) => {
  const rides = await getRideHistory(req.user!.userId, req.user!.role);
  res.status(200).json({ data: { rides } });
});

router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const ride = await getRideById(req.params.id);
  if (!ride) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ride not found" } });
  }
  res.status(200).json({ data: { ride } });
});

// POST /api/rides/:id/accept — driver accepts the currently offered ride
router.post("/:id/accept", requireAuth, requireRole("driver"), async (req: Request, res: Response) => {
  const rideId = req.params.id;
  const driverId = req.user!.userId;

  const confirmed = confirmAcceptance(rideId, driverId);
  if (!confirmed) {
    return res.status(409).json({ error: { code: "OFFER_EXPIRED", message: "This ride is no longer being offered to you" } });
  }

  try {
    const ride = await assignDriver(rideId, driverId);
    getIo().to(ride.rider_id).emit(SocketEvents.RIDE_ACCEPTED, { ride, driverId });
    res.status(200).json({ data: { ride } });
  } catch (err) {
    if (err instanceof InvalidRideTransitionError) {
      return res.status(409).json({ error: { code: "INVALID_TRANSITION", message: err.message } });
    }
    console.error("Accept ride error:", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
  }
});

// POST /api/rides/:id/decline — driver explicitly declines
router.post("/:id/decline", requireAuth, requireRole("driver"), async (req: Request, res: Response) => {
  await handleDecline(req.params.id, req.user!.userId);
  res.status(200).json({ data: { ok: true } });
});

// POST /api/rides/:id/status — driver progresses ride through lifecycle
router.post("/:id/status", requireAuth, requireRole("driver"), async (req: Request, res: Response) => {
  const parsed = statusUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
  }

  try {
    const ride = await updateRideStatus(req.params.id, parsed.data.status);

    const recipients = [ride.rider_id, ride.driver_id].filter(Boolean) as string[];
    recipients.forEach((userId) => {
      getIo().to(userId).emit(SocketEvents.RIDE_STATUS_CHANGED, {
        rideId: ride.id,
        status: ride.status,
        timestamp: new Date().toISOString(),
      });
    });

    res.status(200).json({ data: { ride } });
  } catch (err) {
    if (err instanceof InvalidRideTransitionError) {
      return res.status(409).json({ error: { code: "INVALID_TRANSITION", message: err.message } });
    }
    console.error("Status update error:", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
  }
});

// POST /api/rides/:id/pay — rider pays for a completed ride (Stripe test mode)
router.post("/:id/pay", requireAuth, requireRole("rider"), async (req: Request, res: Response) => {
  const parsed = paySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
  }

  try {
    const { ride, payment } = await payForRide(req.params.id, parsed.data.paymentMethodId);

    const recipients = [ride.rider_id, ride.driver_id].filter(Boolean) as string[];
    recipients.forEach((userId) => {
      getIo().to(userId).emit(SocketEvents.RIDE_STATUS_CHANGED, {
        rideId: ride.id,
        status: ride.status,
        timestamp: new Date().toISOString(),
      });
    });

    res.status(200).json({ data: { ride, payment } });
  } catch (err) {
    if (err instanceof PaymentError) {
      return res.status(402).json({ error: { code: "PAYMENT_FAILED", message: err.message } });
    }
    if (err instanceof InvalidRideTransitionError) {
      return res.status(409).json({ error: { code: "INVALID_TRANSITION", message: err.message } });
    }
    console.error("Payment error:", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
  }
});

// POST /api/rides/:id/cancel
router.post("/:id/cancel", requireAuth, async (req: Request, res: Response) => {
  try {
    const ride = await updateRideStatus(req.params.id, "cancelled");

    const recipients = [ride.rider_id, ride.driver_id].filter(Boolean) as string[];
    recipients.forEach((userId) => {
      getIo().to(userId).emit(SocketEvents.RIDE_CANCELLED, {
        rideId: ride.id,
        cancelledBy: req.user!.userId,
      });
    });

    res.status(200).json({ data: { ride } });
  } catch (err) {
    if (err instanceof InvalidRideTransitionError) {
      return res.status(409).json({ error: { code: "INVALID_TRANSITION", message: err.message } });
    }
    console.error("Cancel ride error:", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
  }
});

export default router;
