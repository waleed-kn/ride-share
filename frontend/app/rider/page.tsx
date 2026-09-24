"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Coordinates, Ride, RideStatus } from "@/lib/types";
import { RideMap } from "@/components/RideMap";
import { BottomSheet } from "@/components/BottomSheet";
import { StatusPill } from "@/components/StatusPill";

const DEFAULT_CENTER: Coordinates = { lat: 34.0151, lng: 71.5249 };

type Stage = "idle" | "picking_pickup" | "picking_dropoff" | "ready" | "active";

export default function RiderPage() {
  const router = useRouter();
  const { user, token, loading, logout } = useAuth();

  const [stage, setStage] = useState<Stage>("idle");
  const [pickup, setPickup] = useState<Coordinates | null>(null);
  const [dropoff, setDropoff] = useState<Coordinates | null>(null);
  const [ride, setRide] = useState<Ride | null>(null);
  const [driverPosition, setDriverPosition] = useState<Coordinates | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    socket.on("ride:accepted", ({ ride: updatedRide }: { ride: Ride }) => {
      setRide(updatedRide);
      setStage("active");
    });

    socket.on("ride:declined", () => {
      setError("No drivers available right now. Try again in a moment.");
      setRide(null);
      setStage("ready");
    });

    socket.on(
      "ride:status_changed",
      ({ rideId, status }: { rideId: string; status: RideStatus }) => {
        setRide((prev) => (prev && prev.id === rideId ? { ...prev, status } : prev));
      }
    );

    socket.on(
      "driver:position",
      ({ rideId, lat, lng }: { rideId: string; lat: number; lng: number }) => {
        setRide((prev) => {
          if (prev && prev.id === rideId) setDriverPosition({ lat, lng });
          return prev;
        });
      }
    );

    socket.on("ride:cancelled", () => {
      setRide(null);
      setStage("idle");
      setPickup(null);
      setDropoff(null);
    });

    return () => {
      socket.off("ride:accepted");
      socket.off("ride:declined");
      socket.off("ride:status_changed");
      socket.off("driver:position");
      socket.off("ride:cancelled");
    };
  }, [token]);

  const handleMapClick = useCallback(
    (coords: Coordinates) => {
      if (stage === "picking_pickup" || stage === "idle") {
        setPickup(coords);
        setStage("picking_dropoff");
      } else if (stage === "picking_dropoff") {
        setDropoff(coords);
        setStage("ready");
      }
    },
    [stage]
  );

  async function requestRide() {
    if (!pickup || !dropoff) return;
    setRequesting(true);
    setError(null);
    try {
      const { ride: newRide } = await api.post<{ ride: Ride }>("/api/rides", { pickup, dropoff });
      setRide(newRide);
      setStage("active");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't request a ride. Try again.");
    } finally {
      setRequesting(false);
    }
  }

  function reset() {
    setRide(null);
    setPickup(null);
    setDropoff(null);
    setDriverPosition(null);
    setStage("idle");
    setError(null);
  }

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[14px] text-fog-dim">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4">
        <span className="rounded-full bg-night-raised/90 px-3 py-1.5 text-[14px] font-semibold tracking-tight backdrop-blur-sm">
          RideShare
        </span>
        <button
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="rounded-full bg-night-raised/90 px-3 py-1.5 text-[13px] text-fog-dim backdrop-blur-sm hover:text-fog"
        >
          Log out
        </button>
      </header>

      <div className="relative flex-1">
        <RideMap
          center={pickup ?? DEFAULT_CENTER}
          pickup={pickup}
          dropoff={dropoff}
          driverPosition={driverPosition}
          onPickupChange={stage === "active" ? undefined : handleMapClick}
        />

        <BottomSheet>
          {stage === "idle" && (
            <div className="flex flex-col gap-1">
              <h2 className="text-[17px] font-semibold text-fog">Where to?</h2>
              <p className="text-[14px] text-fog-dim">Tap the map to set your pickup point.</p>
            </div>
          )}

          {stage === "picking_dropoff" && (
            <div className="flex flex-col gap-1">
              <h2 className="text-[17px] font-semibold text-fog">Pickup set</h2>
              <p className="text-[14px] text-fog-dim">Now tap the map to set your dropoff.</p>
            </div>
          )}

          {stage === "ready" && pickup && dropoff && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <RoutePoint color="bg-indigo" label="Pickup" coords={pickup} />
                <RoutePoint color="bg-confirm" label="Dropoff" coords={dropoff} />
              </div>
              {error && <p className="text-[13px] text-warn">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="rounded-full border border-line px-5 py-3 text-[14px] font-medium text-fog-dim hover:border-fog-dim"
                >
                  Reset
                </button>
                <button
                  onClick={requestRide}
                  disabled={requesting}
                  className="flex-1 rounded-full bg-indigo py-3 text-[15px] font-medium text-fog transition-colors hover:bg-indigo-dim disabled:opacity-50"
                >
                  {requesting ? "Requesting…" : "Request ride"}
                </button>
              </div>
            </div>
          )}

          {stage === "active" && ride && (
            <div className="flex flex-col gap-4">
              <StatusPill status={ride.status} />
              {ride.fare && (
                <p className="text-[13px] text-fog-dim">
                  Estimated fare:{" "}
                  <span className="font-medium text-fog">${ride.fare.toFixed(2)}</span>
                </p>
              )}
              {(ride.status === "completed" || ride.status === "cancelled") && (
                <button
                  onClick={reset}
                  className="rounded-full bg-indigo py-3 text-[15px] font-medium text-fog hover:bg-indigo-dim"
                >
                  {ride.status === "completed" ? "Done" : "Request another ride"}
                </button>
              )}
            </div>
          )}
        </BottomSheet>
      </div>
    </div>
  );
}

function RoutePoint({ color, label, coords }: { color: string; label: string; coords: Coordinates }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
      <div className="flex flex-col">
        <span className="text-[13px] text-fog-dim">{label}</span>
        <span className="text-[13px] text-fog">
          {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </span>
      </div>
    </div>
  );
}
