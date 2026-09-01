"use client";

import { authClient } from "@/lib/auth-client";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { useEffect, useState } from "react";

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return fallback;
}

export function WorkspaceSelector() {
  const { data: session, isPending } = authClient.useSession();

  const setWorkspaceId = useWorkspaceStore((state) => state.setWorkspaceId);

  const clearWorkspace = useWorkspaceStore((state) => state.clearWorkspace);

  const activeOrganizationId = session?.session.activeOrganizationId ?? null;

  useEffect(() => {
    if (isPending) {
      return;
    }

    if (activeOrganizationId) {
      setWorkspaceId(activeOrganizationId);
      return;
    }

    clearWorkspace();
  }, [activeOrganizationId, clearWorkspace, isPending, setWorkspaceId]);

  if (isPending) {
    return <p>Checking authentication before loading workspaces.</p>;
  }

  if (!session) {
    return null;
  }

  return <AuthenticatedWorkspaceSelector />;
}

function AuthenticatedWorkspaceSelector() {
  const workspaceId = useWorkspaceStore((state) => state.workspaceId);

  const setWorkspaceId = useWorkspaceStore((state) => state.setWorkspaceId);

  const clearWorkspace = useWorkspaceStore((state) => state.clearWorkspace);

  const {
    data: organizations,
    error: organizationsError,
    isPending: areOrganizationsPending,
  } = authClient.useListOrganizations();

  const [selectingWorkspaceId, setSelectingWorkspaceId] = useState<
    string | null
  >(null);

  const [message, setMessage] = useState<string | null>(null);

  async function handleSelect(organizationId: string) {
    setMessage(null);
    setSelectingWorkspaceId(organizationId);

    try {
      const { error } = await authClient.organization.setActive({
        organizationId,
      });

      if (error) {
        setMessage(getErrorMessage(error, "Could not activate the workspace."));
        return;
      }

      setWorkspaceId(organizationId);
      setMessage("Active workspace changed.");
    } finally {
      setSelectingWorkspaceId(null);
    }
  }

  async function handleClear() {
    setMessage(null);
    setSelectingWorkspaceId(workspaceId);

    try {
      const { error } = await authClient.organization.setActive({
        organizationId: null,
      });

      if (error) {
        setMessage(
          getErrorMessage(error, "Could not clear the active workspace."),
        );
        return;
      }

      clearWorkspace();
      setMessage("Workspace selection cleared.");
    } finally {
      setSelectingWorkspaceId(null);
    }
  }

  if (areOrganizationsPending) {
    return <p>Loading workspaces.</p>;
  }

  if (organizationsError) {
    return (
      <p>
        Could not load workspaces:{" "}
        {getErrorMessage(organizationsError, "Unknown workspace error.")}
      </p>
    );
  }

  return (
    <section className="w-full max-w-md rounded-lg border p-4">
      <h2 className="text-lg font-medium">Your workspaces</h2>

      {!organizations || organizations.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">
          No workspaces yet. Create one above.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {organizations.map((organization) => {
            const isSelected = workspaceId === organization.id;
            const isSelecting = selectingWorkspaceId === organization.id;

            return (
              <li key={organization.id}>
                <button
                  aria-pressed={isSelected}
                  className={`w-full rounded border p-3 text-left ${
                    isSelected ? "bg-zinc-800" : ""
                  }`}
                  disabled={selectingWorkspaceId !== null}
                  onClick={() => {
                    void handleSelect(organization.id);
                  }}
                  type="button"
                >
                  <span className="block font-medium">{organization.name}</span>

                  <span className="block text-sm text-zinc-500">
                    {organization.slug}
                  </span>

                  {isSelected && (
                    <span className="mt-1 block text-sm">Active workspace</span>
                  )}

                  {isSelecting && (
                    <span className="mt-1 block text-sm">Activating...</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {workspaceId && (
        <button
          className="mt-3 rounded border px-3 py-2 text-sm"
          disabled={selectingWorkspaceId !== null}
          onClick={() => {
            void handleClear();
          }}
          type="button"
        >
          Clear selection
        </button>
      )}

      {message && (
        <p aria-live="polite" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
