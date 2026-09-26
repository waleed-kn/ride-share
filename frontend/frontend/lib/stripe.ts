import { loadStripe, Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Publishable key only — starts with pk_test_, safe to expose in the
 * browser. This is different from STRIPE_SECRET_KEY (sk_test_...) which
 * lives only in the backend's .env and never reaches the client.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}
