import { AuthPanel } from "./auth-panel";
import { DocumentsList } from "./document-list";
import { WorkspaceCreateForm } from "./workspace-create-form";
import { WorkspaceSelector } from "./workspace-selector";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-semibold">DocuScale</h1>
      <p className="text-zinc-600">Document collaboration, built for teams.</p>

      <AuthPanel />
      <WorkspaceCreateForm/>
      <WorkspaceSelector/>
      <DocumentsList/>
    </main>
  );
}
