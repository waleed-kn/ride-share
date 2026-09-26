"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function RedirectPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    router.replace(user.role === "driver" ? "/driver" : "/rider");
  }, [user, loading, router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-[14px] text-fog-dim">Taking you in…</p>
    </div>
  );
}
