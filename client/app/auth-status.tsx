"use client";

import { authClient } from "@/lib/auth-client";

export function AuthStatus() {
  const { data: session, error, isPending } = authClient.useSession();

  if (isPending) {
    return <p>Checking authentication</p>;
  }

  if (error) {
    return <p>Authentication status unavailable</p>;
  }

  if (!session) {
    return <p>Signed out</p>;
  }

  return <p>Signed in as {session.user.email}</p>;
}
