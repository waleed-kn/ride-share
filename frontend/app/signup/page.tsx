"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth, ApiError } from "@/lib/auth";
import { UserRole } from "@/lib/types";
import { Field } from "@/components/Field";
import { RoleToggle } from "@/components/RoleToggle";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { signup } = useAuth();

  const initialRole = params.get("role") === "driver" ? "driver" : "rider";
  const [role, setRole] = useState<UserRole>(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup(email, password, name, role);
      router.push(role === "driver" ? "/driver" : "/rider");
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
          Create your account
        </h1>
        <p className="mt-1.5 text-[14px] text-fog-dim">
          Takes less than a minute.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <RoleToggle value={role} onChange={setRole} />

          <Field
            id="name"
            label="Full name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
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
            minLength={8}
            autoComplete="new-password"
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
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-[14px] text-fog-dim">
          Already have an account?{" "}
          <Link href="/login" className="text-fog underline underline-offset-2">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
