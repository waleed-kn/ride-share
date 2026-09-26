import { pool } from "../config/db";
import { stripe } from "../config/stripe";
import { getRideById, updateRideStatus } from "./rideService";
import { assertTransition } from "./rideStateMachine";

export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentError";
  }
}

/**
 * Charges the rider (test mode) for a completed ride, records the
 * payment, and transitions the ride to "paid". All three steps happen
 * together because a ride shouldn't be left in a half-paid state — if
 * the Stripe call fails, nothing is written to the database.
 */
export async function payForRide(rideId: string, paymentMethodId: string) {
  const ride = await getRideById(rideId);
  if (!ride) throw new PaymentError("Ride not found");
  if (!ride.fare) throw new PaymentError("Ride has no fare set");

  // Fail fast before calling Stripe at all if the ride isn't even in a
  // payable state — no point creating a PaymentIntent for a ride that
  // can't legally move to "paid" anyway.
  assertTransition(ride.status, "paid");

  const amountInCents = Math.round(ride.fare * 100);

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe payment failed";
    throw new PaymentError(message);
  }

  if (paymentIntent.status !== "succeeded") {
    throw new PaymentError(`Payment not completed (status: ${paymentIntent.status})`);
  }

  const paymentResult = await pool.query(
    `INSERT INTO payments (ride_id, stripe_payment_id, amount, status, paid_at)
     VALUES ($1, $2, $3, 'succeeded', now())
     RETURNING *`,
    [rideId, paymentIntent.id, ride.fare]
  );

  const updatedRide = await updateRideStatus(rideId, "paid");

  return { ride: updatedRide, payment: paymentResult.rows[0] };
}
