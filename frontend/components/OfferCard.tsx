"use client";

import { useEffect, useState } from "react";
import { Ride } from "@/lib/types";

interface OfferCardProps {
  ride: Ride;
  timeoutSeconds: number;
  onAccept: () => void;
  onDecline: () => void;
  accepting: boolean;
}

export function OfferCard({ ride, timeoutSeconds, onAccept, onDecline, accepting }: OfferCardProps) {
  const [remaining, setRemaining] = useState(timeoutSeconds);

  useEffect(() => {
    setRemaining(timeoutSeconds);
    const interval = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [ride.id, timeoutSeconds]);

  const progress = (remaining / timeoutSeconds) * 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-fog">New ride request</h2>
        <span className="text-[13px] text-fog-dim">{remaining}s</span>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full bg-indigo transition-[width] duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-indigo" />
          <div className="flex flex-col">
            <span className="text-[13px] text-fog-dim">Pickup</span>
            <span className="text-[13px] text-fog">
              {ride.pickup_lat.toFixed(4)}, {ride.pickup_lng.toFixed(4)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-confirm" />
          <div className="flex flex-col">
            <span className="text-[13px] text-fog-dim">Dropoff</span>
            <span className="text-[13px] text-fog">
              {ride.dropoff_lat.toFixed(4)}, {ride.dropoff_lng.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      {ride.fare && (
        <p className="text-[13px] text-fog-dim">
          Estimated fare: <span className="font-medium text-fog">${ride.fare.toFixed(2)}</span>
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onDecline}
          disabled={accepting}
          className="flex-1 rounded-full border border-line py-3 text-[14px] font-medium text-fog-dim hover:border-fog-dim disabled:opacity-50"
        >
          Decline
        </button>
        <button
          onClick={onAccept}
          disabled={accepting}
          className="flex-1 rounded-full bg-confirm py-3 text-[15px] font-medium text-night transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {accepting ? "Accepting…" : "Accept"}
        </button>
      </div>
    </div>
  );
}
