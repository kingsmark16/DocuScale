"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function WorkspaceSelector() {
  const workspaceId = useWorkspaceStore((state) => state.workspaceId);
  const setWorkspaceId = useWorkspaceStore(
    (state) => state.setWorkspaceId,
  );
  const clearWorkspace = useWorkspaceStore(
    (state) => state.clearWorkspace,
  );

  const [draftWorkspaceId, setDraftWorkspaceId] = useState(
    workspaceId ?? "",
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedWorkspaceId = draftWorkspaceId.trim();

    if (!normalizedWorkspaceId) {
      return;
    }

    setWorkspaceId(normalizedWorkspaceId);
  }

  function handleClear() {
    setDraftWorkspaceId("");
    clearWorkspace();
  }

  return (
    <section className="w-full max-w-md rounded-lg border p-4">
      <h2 className="mb-3 text-lg font-medium">Workspace</h2>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            htmlFor="workspace-id"
          >
            Workspace ID
          </label>

          <input
            className="w-full rounded border px-3 py-2"
            id="workspace-id"
            onChange={(event) => {
              setDraftWorkspaceId(event.target.value);
            }}
            placeholder="Paste a workspace ID"
            value={draftWorkspaceId}
          />
        </div>

        <button
          className="rounded bg-black px-4 py-2 text-sm text-white"
          type="submit"
        >
          Use workspace
        </button>
      </form>

      {workspaceId ? (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <p>
            Selected: <code>{workspaceId}</code>
          </p>

          <button
            className="rounded border px-3 py-1"
            onClick={handleClear}
            type="button"
          >
            Clear
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-600">
          No workspace selected.
        </p>
      )}
    </section>
  );
}