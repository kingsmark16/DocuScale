import { apiClient } from "./api-client";

export type DocumentRecord = {
  id: string;
  title: string;
  content: string;
  isPublished: boolean;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentListItem = Omit<DocumentRecord, "content">;

export type DocumentListResponse = {
  data: DocumentListItem[];
  pageInfo: {
    hasNextPage: boolean;
    nextCursor: string | null;
  };
};

export type CreateDocumentInput = {
  title: string;
  content: string;
  isPublished?: boolean;
};

export type UpdateDocumentInput = Partial<CreateDocumentInput>;

export type ListDocumentsOptions = {
  search?: string;
  cursor?: string;
  limit?: number;
};

export async function listDocuments(
  workspaceId: string,
  options: ListDocumentsOptions = {},
): Promise<DocumentListResponse> {
  const response = await apiClient.get<DocumentListResponse>(
    `/api/w/${encodeURIComponent(workspaceId)}/docs`,
    {
      params: {
        search: options.search,
        cursor: options.cursor,
        limit: options.limit ?? 20,
      },
    },
  );

  return response.data;
}

export async function createDocument(
  workspaceId: string,
  input: CreateDocumentInput,
): Promise<DocumentRecord> {
  const response = await apiClient.post<DocumentRecord>(
    `/api/w/${encodeURIComponent(workspaceId)}/docs`,
    input,
  );

  return response.data;
}

export async function getDocument(
  workspaceId: string,
  documentId: string,
): Promise<DocumentRecord> {
  const response = await apiClient.get<DocumentRecord>(
    `/api/w/${encodeURIComponent(workspaceId)}/docs/${encodeURIComponent(documentId)}`,
  );

  return response.data;
}

export async function updateDocument(
  workspaceId: string,
  documentId: string,
  input: UpdateDocumentInput,
): Promise<DocumentRecord> {
  const response = await apiClient.patch<DocumentRecord>(
    `/api/w/${encodeURIComponent(workspaceId)}/docs/${encodeURIComponent(documentId)}`,
    input,
  );

  return response.data;
}

export async function deleteDocument(
  workspaceId: string,
  documentId: string,
): Promise<{ deleted: boolean; id: string }> {
  const response = await apiClient.delete<{ deleted: boolean; id: string }>(
    `/api/w/${encodeURIComponent(workspaceId)}/docs/${encodeURIComponent(documentId)}`,
  );

  return response.data;
}