"use client";

import { useState, FormEvent } from "react";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { api, ApiError } from "@/lib/api";
import { Ride } from "@/lib/types";

interface PaymentFormProps {
  ride: Ride;
  onPaid: (ride: Ride) => void;
}

// Styling the raw CardElement to match the app's dark palette — Stripe
// Elements renders inside an iframe, so this can't be done with Tailwind
// classes; it has to be passed as a JS style object per Stripe's API.
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#F7F7F5",
      fontSize: "15px",
      fontFamily: "-apple-system, Segoe UI, Roboto, sans-serif",
      "::placeholder": { color: "rgba(247, 247, 245, 0.4)" },
    },
    invalid: {
      color: "#F5A623",
    },
  },
};

function CheckoutForm({ ride, onPaid }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || !ride.fare) return;

    setSubmitting(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setSubmitting(false);
      return;
    }

    const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
    });

    if (pmError || !paymentMethod) {
      setError(pmError?.message ?? "Couldn't process that card.");
      setSubmitting(false);
      return;
    }

    try {
      const { ride: paidRide } = await api.post<{ ride: Ride }>(`/api/rides/${ride.id}/pay`, {
        paymentMethodId: paymentMethod.id,
      });
      onPaid(paidRide);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[14px] text-fog-dim">Total fare</span>
        <span className="text-[22px] font-semibold text-fog">
          ${ride.fare != null ? Number(ride.fare).toFixed(2) : "—"}
        </span>
      </div>

      <div className="rounded-xl border border-line bg-night-raised px-4 py-3.5">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>

      {error && <p className="text-[13px] text-warn">{error}</p>}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="rounded-full bg-indigo py-3 text-[15px] font-medium text-fog transition-colors hover:bg-indigo-dim disabled:opacity-50"
      >
        {submitting ? "Processing…" : `Pay $${ride.fare != null ? Number(ride.fare).toFixed(2) : ""}`}
      </button>

      <p className="text-center text-[12px] text-fog-dim">
        Test mode — use 4242 4242 4242 4242, any future date, any CVC.
      </p>
    </form>
  );
}

export function PaymentForm(props: PaymentFormProps) {
  return (
    <Elements stripe={getStripe()}>
      <CheckoutForm {...props} />
    </Elements>
  );
}
