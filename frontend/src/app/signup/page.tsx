"use client";

import { Button } from "@/components/ui/Button";
import { Lock, Mail, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setIsGoogleLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleCreateAccount = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!emailPattern.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    if (!password.trim()) {
      setError("Password is required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!confirmPassword.trim()) {
      setError("Please confirm your password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSignupLoading(true);

    setTimeout(() => {
      setIsSignupLoading(false);
      setError(
        "Account creation is not available until a real credential backend is connected. Google authentication remains the working sign-in method for this project."
      );
    }, 400);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f8f5f1,_#f5f5f4_40%,_#f1f5f9_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-stone-200 bg-white/90 shadow-[0_24px_60px_rgba(28,25,23,0.08)] backdrop-blur-sm lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden flex-col justify-between border-r border-stone-200 bg-stone-50/80 p-8 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-sm">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-semibold text-stone-900">MailFlow</p>
            </div>
          </div>

          <div className="max-w-md">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Start your workflow
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-stone-900">Create your workspace</h1>
            <p className="mt-4 text-base leading-7 text-stone-600">
              Set up your account and start managing scheduled email campaigns from one place.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-stone-600">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Secure account setup with Google or a future credential backend
          </div>
        </div>

        <div className="flex items-center justify-center p-5 sm:p-8 lg:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">Create account</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">Get started</h2>
              <p className="mt-2 text-sm text-stone-600">Set up your workspace and begin scheduling campaigns with confidence.</p>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-5" noValidate>
              <div>
                <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-stone-700">
                  Full name
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
                    placeholder="Jane Doe"
                    autoComplete="name"
                    aria-label="Full name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-email" className="mb-2 block text-sm font-medium text-stone-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
                    placeholder="you@company.com"
                    autoComplete="email"
                    aria-label="Email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-password" className="mb-2 block text-sm font-medium text-stone-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    aria-label="Password"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-stone-700">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    aria-label="Confirm password"
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full justify-center rounded-xl bg-stone-900 px-4 py-3 text-white hover:bg-stone-800 disabled:bg-stone-400"
                disabled={isSignupLoading || isGoogleLoading}
              >
                {isSignupLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-stone-400">OR</span>
              <div className="h-px flex-1 bg-stone-200" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isSignupLoading}
              className="w-full justify-center rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-800 shadow-sm hover:bg-stone-50"
            >
              {isGoogleLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
                    <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Connecting...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
                    <path d="M21.35 12.23c0-.79-.07-1.55-.22-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.42Z" fill="#4285F4" />
                    <path d="M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.75 9.75 0 0 0 12 21.5Z" fill="#34A853" />
                    <path d="M6.53 13.58a5.86 5.86 0 0 1 0-3.16V7.89H3.28a9.75 9.75 0 0 0 0 8.22l3.25-2.53Z" fill="#FBBC05" />
                    <path d="M12 6.39c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.47 14.63 2.5 12 2.5a9.75 9.75 0 0 0-8.72 5.39l3.25 2.53C7.3 8.11 9.46 6.39 12 6.39Z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <p className="mt-6 text-center text-sm text-stone-600">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-stone-900 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
