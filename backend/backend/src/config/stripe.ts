import Stripe from "stripe";
import { env } from "./env";

// Test-mode key only, per project scope — this app never touches real
// payment processing, only Stripe's test environment with fake cards.
export const stripe = new Stripe(env.stripeSecretKey, {
  apiVersion: "2024-06-20",
});
