"use client";

import { authClient } from "@/lib/auth-client";
import { useDocuments } from "@/lib/document-queries";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function DocumentsList() {
  const workspaceId = useWorkspaceStore((state) => state.workspaceId);

  const {
    data: session,
    error: authError,
    isPending: isAuthPending,
  } = authClient.useSession();

  const documentsQuery = useDocuments(workspaceId, Boolean(session));

  if (isAuthPending) {
    return <p>Checking authentication before loading documents.</p>;
  }

  if (authError) {
    return <p>Authentication status unavailable.</p>;
  }

  if (!session) {
    return <p>Sign in to view documents.</p>;
  }

  if (!workspaceId) {
    return <p>Select a workspace to view documents.</p>;
  }

  if (documentsQuery.isPending) {
    return <p>Loading documents.</p>;
  }

  if (documentsQuery.isError) {
    return <p>Could not load documents: {documentsQuery.error.message}</p>;
  }

  if (documentsQuery.data.data.length === 0) {
    return (
      <section className="w-full max-w-md rounded-lg border p-4">
        <h2 className="text-lg font-medium">Documents</h2>

        <p className="mt-2 text-sm text-zinc-600">
          This workspace has no documents yet.
        </p>
      </section>
    );
  }

  return (
    <section className="w-full max-w-md rounded-lg border p-4">
      <h2 className="mb-3 text-lg font-medium">Documents</h2>

      <ul className="space-y-3">
        {documentsQuery.data.data.map((document) => (
          <li className="rounded border p-3" key={document.id}>
            <p className="font-medium">{document.title}</p>

            <p className="text-sm text-zinc-600">
              {document.isPublished ? "Published" : "Draft"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
