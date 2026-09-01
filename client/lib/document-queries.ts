"use client";

import { useQuery } from "@tanstack/react-query";
import {
  listDocuments,
  type DocumentListResponse,
} from "@/lib/document-api";

export const documentQueryKeys = {
  all: ["documents"] as const,

  lists: (workspaceId: string) =>
    ["documents", "list", workspaceId] as const,
};

export function useDocuments(
  workspaceId: string | null,
  enabled = true,
) {
  return useQuery<DocumentListResponse, Error>({
    queryKey: workspaceId
      ? documentQueryKeys.lists(workspaceId)
      : [...documentQueryKeys.all, "list", "disabled"],

    queryFn: () => {
      if (!workspaceId) {
        throw new Error("Workspace ID is required");
      }

      return listDocuments(workspaceId);
    },

    enabled: Boolean(workspaceId) && enabled,
  });
}