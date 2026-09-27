"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Ride } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
    requested: "Requested",
    accepted: "Accepted",
    driver_arriving: "Driver arriving",
    in_progress: "In progress",
    completed: "Completed",
    paid: "Paid",
    cancelled: "Cancelled",
};

export default function HistoryPage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    const [rides, setRides] = useState<Ride[]>([]);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && !user) router.replace("/login");
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) return;
        api
            .get<{ rides: Ride[] }>("/api/rides/history")
            .then(({ rides }) => setRides(rides))
            .catch((err) => {
                setError(err instanceof ApiError ? err.message : "Couldn't load history.");
            })
            .finally(() => setFetching(false));
    }, [user]);

    if (loading || !user) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <p className="text-[14px] text-fog-dim">Loading…</p>
            </div>
        );
    }

    const backHref = user.role === "driver" ? "/driver" : "/rider";

    return (
        <div className="flex flex-1 flex-col">
            <header className="flex items-center justify-between border-b border-line px-6 py-5">
                <Link href={backHref} className="text-[15px] font-semibold tracking-tight text-fog">
                    RideShare
                </Link>
                <Link href={backHref} className="text-[13px] text-fog-dim hover:text-fog">
                    Back
                </Link>
            </header>

            <main className="flex-1 px-5 py-6">
                <h1 className="text-xl font-semibold tracking-tight text-fog">Ride history</h1>

                {fetching && (
                    <p className="mt-6 text-[14px] text-fog-dim">Loading rides…</p>
                )}

                {error && (
                    <p className="mt-6 text-[13px] text-warn">{error}</p>
                )}

                {!fetching && !error && rides.length === 0 && (
                    <p className="mt-6 text-[14px] text-fog-dim">No rides yet.</p>
                )}

                <div className="mt-6 flex flex-col gap-3">
                    {rides.map((ride) => (
                        <div
                            key={ride.id}
                            className="flex flex-col gap-2 rounded-2xl border border-line bg-night-raised px-4 py-4"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[13px] font-medium text-fog">
                                    {STATUS_LABELS[ride.status] ?? ride.status}
                                </span>
                                <span className="text-[13px] text-fog-dim">
                                    {new Date(ride.requested_at).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                    })}
                                </span>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 shrink-0 rounded-full bg-indigo" />
                                    <span className="text-[12px] text-fog-dim">
                                        {ride.pickup_lat.toFixed(4)}, {ride.pickup_lng.toFixed(4)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 shrink-0 rounded-full bg-confirm" />
                                    <span className="text-[12px] text-fog-dim">
                                        {ride.dropoff_lat.toFixed(4)}, {ride.dropoff_lng.toFixed(4)}
                                    </span>
                                </div>
                            </div>

                            {ride.fare != null && (
                                <div className="mt-1 text-right text-[14px] font-medium text-fog">
                                    ${Number(ride.fare).toFixed(2)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}