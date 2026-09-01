"use client";

import { authClient } from "@/lib/auth-client";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { useState } from "react";
import type { SubmitEvent } from "react";

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return fallback;
}

export function WorkspaceCreateForm() {
  const setWorkspaceId = useWorkspaceStore(
    (state) => state.setWorkspaceId,
  );

  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(
    event: SubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedName = name.trim();
    const normalizedSlug = slug.trim().toLowerCase();

    if (!normalizedName || !normalizedSlug) {
      setMessage("Workspace name and slug are required.");
      return;
    }

    setMessage(null);
    setIsSubmitting(true);

    try {
      const { data: organization, error } =
        await authClient.organization.create({
          name: normalizedName,
          slug: normalizedSlug,
        });

      if (error) {
        setMessage(
          getErrorMessage(error, "Could not create the workspace."),
        );
        return;
      }

      if (!organization) {
        setMessage("The workspace was not returned by the server.");
        return;
      }

      const { error: activeOrganizationError } =
        await authClient.organization.setActive({
          organizationId: organization.id,
        });

      if (activeOrganizationError) {
        setMessage(
          getErrorMessage(
            activeOrganizationError,
            "Workspace created, but it could not be activated.",
          ),
        );
        return;
      }

      setWorkspaceId(organization.id);
      setName("");
      setSlug("");
      setMessage(`Workspace "${organization.name}" created.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSessionPending || !session) {
    return null;
  }

  return (
    <section className="w-full max-w-md rounded-lg border p-4">
      <h2 className="text-lg font-medium">Create workspace</h2>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <label className="block text-sm">
          Workspace name

          <input
            className="mt-1 w-full rounded border px-3 py-2"
            onChange={(event) => setName(event.target.value)}
            placeholder="DocuScale Team"
            required
            type="text"
            value={name}
          />
        </label>

        <label className="block text-sm">
          Workspace slug

          <input
            className="mt-1 w-full rounded border px-3 py-2"
            onChange={(event) => {
              const nextSlug = event.target.value
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, "-");

              setSlug(nextSlug);
            }}
            pattern="[a-z0-9-]+"
            placeholder="docuscale-team"
            required
            type="text"
            value={slug}
          />
        </label>

        <button
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Creating..." : "Create workspace"}
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