"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Coordinates, Ride, RideStatus } from "@/lib/types";
import { RideMap } from "@/components/RideMap";
import { BottomSheet } from "@/components/BottomSheet";
import { OnlineToggle } from "@/components/OnlineToggle";
import { OfferCard } from "@/components/OfferCard";
import { ActiveRideControls } from "@/components/ActiveRideControls";

const DEFAULT_CENTER: Coordinates = { lat: 34.0151, lng: 71.5249 };
const OFFER_TIMEOUT_SECONDS = 15; // matches backend DRIVER_OFFER_TIMEOUT_SECONDS
const LOCATION_PING_INTERVAL_MS = 5000;

type DriverStage = "offline" | "online_idle" | "offer_received" | "active_ride";

export default function DriverPage() {
  const router = useRouter();
  const { user, token, loading, logout } = useAuth();

  const [stage, setStage] = useState<DriverStage>("offline");
  const [position, setPosition] = useState<Coordinates>(DEFAULT_CENTER);
  const [incomingRide, setIncomingRide] = useState<Ride | null>(null);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  // WebSocket listeners
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    socket.on("ride:requested", ({ ride }: { ride: Ride }) => {
      setIncomingRide(ride);
      setStage("offer_received");
    });

    socket.on(
      "ride:status_changed",
      ({ rideId, status }: { rideId: string; status: RideStatus }) => {
        setActiveRide((prev) => (prev && prev.id === rideId ? { ...prev, status } : prev));
      }
    );

    socket.on("ride:cancelled", () => {
      setActiveRide(null);
      setStage("online_idle");
    });

    return () => {
      socket.off("ride:requested");
      socket.off("ride:status_changed");
      socket.off("ride:cancelled");
    };
  }, [token]);

  // Periodic location broadcast while online
  useEffect(() => {
    if (stage === "offline" || !token) {
      if (pingInterval.current) clearInterval(pingInterval.current);
      return;
    }

    const socket = getSocket(token);
    pingInterval.current = setInterval(() => {
      socket.emit("driver:location_update", position);
    }, LOCATION_PING_INTERVAL_MS);

    return () => {
      if (pingInterval.current) clearInterval(pingInterval.current);
    };
  }, [stage, token, position]);

  const goOnline = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/driver/online", position);
      setStage("online_idle");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't go online. Try again.");
    } finally {
      setBusy(false);
    }
  }, [position]);

  const goOffline = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/driver/offline");
      setStage("offline");
      setIncomingRide(null);
      setActiveRide(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't go offline. Try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  async function acceptRide() {
    if (!incomingRide) return;
    setBusy(true);
    try {
      const { ride } = await api.post<{ ride: Ride }>(`/api/rides/${incomingRide.id}/accept`);
      setActiveRide(ride);
      setIncomingRide(null);
      setStage("active_ride");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That ride is no longer available.");
      setIncomingRide(null);
      setStage("online_idle");
    } finally {
      setBusy(false);
    }
  }

  async function declineRide() {
    if (!incomingRide) return;
    await api.post(`/api/rides/${incomingRide.id}/decline`).catch(() => {});
    setIncomingRide(null);
    setStage("online_idle");
  }

  async function advanceRide(nextStatus: RideStatus) {
    if (!activeRide) return;
    setBusy(true);
    try {
      const { ride } = await api.post<{ ride: Ride }>(`/api/rides/${activeRide.id}/status`, {
        status: nextStatus,
      });
      setActiveRide(ride);
      if (nextStatus === "completed") {
        setTimeout(() => {
          setActiveRide(null);
          setStage("online_idle");
        }, 2500);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update ride status.");
    } finally {
      setBusy(false);
    }
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
          RideShare Driver
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
          center={position}
          pickup={activeRide ? { lat: activeRide.pickup_lat, lng: activeRide.pickup_lng } : null}
          dropoff={activeRide ? { lat: activeRide.dropoff_lat, lng: activeRide.dropoff_lng } : null}
        />

        <BottomSheet>
          {stage === "offline" && (
            <div className="flex flex-col gap-4">
              <OnlineToggle online={false} onChange={goOnline} disabled={busy} />
              {error && <p className="text-[13px] text-warn">{error}</p>}
            </div>
          )}

          {stage === "online_idle" && (
            <div className="flex flex-col gap-4">
              <OnlineToggle online={true} onChange={goOffline} disabled={busy} />
              <p className="text-center text-[13px] text-fog-dim">
                Waiting for ride requests…
              </p>
              {error && <p className="text-[13px] text-warn">{error}</p>}
            </div>
          )}

          {stage === "offer_received" && incomingRide && (
            <OfferCard
              ride={incomingRide}
              timeoutSeconds={OFFER_TIMEOUT_SECONDS}
              onAccept={acceptRide}
              onDecline={declineRide}
              accepting={busy}
            />
          )}

          {stage === "active_ride" && activeRide && (
            <ActiveRideControls
              status={activeRide.status}
              fare={activeRide.fare}
              onAdvance={advanceRide}
              advancing={busy}
            />
          )}
        </BottomSheet>
      </div>
    </div>
  );
}
