import Link from "next/link";
import { RouteHero } from "@/components/RouteHero";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="text-[15px] font-semibold tracking-tight">RideShare</span>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-fog-dim transition-colors hover:text-fog"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-fog px-4 py-2 text-sm font-medium text-night transition-opacity hover:opacity-90"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6">
        <RouteHero />

        <div className="relative z-10 flex max-w-sm flex-col items-center gap-6 text-center">
          <h1 className="text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-fog sm:text-5xl">
            Your ride,
            <br />
            a few taps away
          </h1>
          <p className="max-w-[26ch] text-[15px] leading-relaxed text-fog-dim">
            Request a ride and watch your driver arrive in real time — no
            waiting on a street corner guessing.
          </p>

          <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/signup?role=rider"
              className="rounded-full bg-indigo px-6 py-3 text-center text-[15px] font-medium text-fog transition-colors hover:bg-indigo-dim"
            >
              Request a ride
            </Link>
            <Link
              href="/signup?role=driver"
              className="rounded-full border border-line px-6 py-3 text-center text-[15px] font-medium text-fog transition-colors hover:border-fog-dim"
            >
              Drive and earn
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
