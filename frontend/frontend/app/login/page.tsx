"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, ApiError } from "@/lib/auth";
import { Field } from "@/components/Field";

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      // useAuth's user state won't be updated synchronously here, so
      // route based on what we know once the request resolves — the
      // login() call above already set it via context.
      router.push("/redirect");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-[15px] font-semibold tracking-tight text-fog">
          RideShare
        </Link>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-fog">
          Welcome back
        </h1>
        <p className="mt-1.5 text-[14px] text-fog-dim">Log in to continue.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <Field
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Field
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && (
            <p role="alert" className="text-[13px] text-warn">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full bg-indigo py-3 text-[15px] font-medium text-fog transition-colors hover:bg-indigo-dim disabled:opacity-50"
          >
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-[14px] text-fog-dim">
          New here?{" "}
          <Link href="/signup" className="text-fog underline underline-offset-2">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
