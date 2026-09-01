"use client";

import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import type { SubmitEvent } from "react";

type AuthMode = "sign-in" | "sign-up";

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error != null && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return fallback;
}

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === "sign-up") {
        const { error } = await authClient.signUp.email({
          name,
          email,
          password,
          callbackURL: window.location.origin,
        });

        if (error) {
          setMessage(getErrorMessage(error, "Could not create your account."));

          return;
        }

        setPassword("");
        setMessage("Account created and signed in.");
        return;
      }

      const { error } = await authClient.signIn.email({
        email,
        password,
        callbackURL: window.location.origin,
      });

      if (error) {
        setMessage(getErrorMessage(error, "Could not sign in."));
        return;
      }

      setPassword("");
      setMessage("Signed in successfully.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    setMessage(null);

    const { error } = await authClient.signOut();

    if (error) {
      setMessage(getErrorMessage(error, "Could not sign out."));
      return;
    }

    setMessage("Signed out.");
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage(null);
  }

  if (isSessionPending) {
    return <p>Checking authentication.</p>;
  }

  if (session) {
    return (
      <section className="w-full max-w-md rounded-lg border p-4">
        <h2 className="text-lg font-medium">Account</h2>

        <p className="mt-2 text-sm text-zinc-600">
          Signed in as {session.user.email}
        </p>

        <button
          className="mt-4 rounded bg-black px-4 py-2 text-white"
          onClick={handleSignOut}
          type="button"
        >
          Sign out
        </button>

        {message && (
          <p aria-live="polite" className="mt-3 text-sm">
            {message}
          </p>
        )}
      </section>
    );
  }

  const isSignUp = mode === "sign-up";

  return (
    <section className="w-full max-w-md rounded-lg border p-4">
      <div className="mb-4 flex gap-2">
        <button
          className={`rounded px-3 py-2 text-sm ${
            !isSignUp ? "bg-black text-white" : "border"
          }`}
          onClick={() => changeMode("sign-in")}
          type="button"
        >
          Sign in
        </button>

        <button
          className={`rounded px-3 py-2 text-sm ${
            isSignUp ? "bg-black text-white" : "border"
          }`}
          onClick={() => changeMode("sign-up")}
          type="button"
        >
          Create account
        </button>
      </div>

      <h2 className="text-lg font-medium">
        {isSignUp ? "Create your account" : "Sign in"}
      </h2>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        {isSignUp && (
          <label className="block text-sm">
            Name
            <input
              autoComplete="name"
              className="mt-1 w-full rounded border px-3 py-2"
              onChange={(event) => setName(event.target.value)}
              required
              type="text"
              value={name}
            />
          </label>
        )}

        <label className="block text-sm">
          Email
          <input
            autoComplete="email"
            className="mt-1 w-full rounded border px-3 py-2"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <label className="block text-sm">
          Password
          <input
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className="mt-1 w-full rounded border px-3 py-2"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        <button
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? "Please wait..."
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      {message && (
        <p aria-live="polite" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
