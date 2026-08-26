import { create } from "zustand";

type WorkspaceStore = {
  workspaceId: string | null;
  setWorkspaceId: (workspaceId: string) => void;
  clearWorkspace: () => void;
};

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  workspaceId: null,

  setWorkspaceId: (workspaceId) => {
    set({ workspaceId });
  },

  clearWorkspace() {
    set({ workspaceId: null });
  },
}));
