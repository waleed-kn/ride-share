"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function DriverPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[14px] text-fog-dim">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-line px-6 py-5">
        <span className="text-[15px] font-semibold tracking-tight">RideShare</span>
        <button
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="text-[13px] text-fog-dim hover:text-fog"
        >
          Log out
        </button>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Hey {user.name.split(" ")[0]}
        </h1>
        <p className="mt-2 max-w-xs text-[14px] text-fog-dim">
          The online toggle and incoming ride offers are coming in the
          next phase — this confirms your account, auth, and routing all
          work end to end.
        </p>
      </main>
    </div>
  );
}
