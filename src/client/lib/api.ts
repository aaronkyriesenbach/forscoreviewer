import type { LibraryInfo, LibraryMetadata, UploadResponse } from '@/shared/types';

const API_BASE = '/api';

export async function fetchLibraries(): Promise<LibraryInfo[]> {
  const response = await fetch(`${API_BASE}/libraries`);

  if (!response.ok) {
    throw new Error(`Failed to fetch libraries: ${response.status}`);
  }

  return response.json() as Promise<LibraryInfo[]>;
}

export async function fetchMetadata(name: string): Promise<LibraryMetadata> {
  const response = await fetch(`${API_BASE}/libraries/${encodeURIComponent(name)}/metadata`);

  if (!response.ok) {
    throw new Error(`Failed to fetch metadata: ${response.status}`);
  }

  return response.json() as Promise<LibraryMetadata>;
}

export async function fetchAnnotations(name: string): Promise<string[]> {
  const response = await fetch(`${API_BASE}/libraries/${encodeURIComponent(name)}/annotations`);

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { annotations: string[] };
  return data.annotations;
}

export async function uploadArchive(name: string, file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/libraries/${encodeURIComponent(name)}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Upload failed: ${response.status}`);
  }

  return response.json() as Promise<UploadResponse>;
}

export async function deleteLibrary(name: string): Promise<void> {
  const response = await fetch(`${API_BASE}/libraries/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete library: ${response.status}`);
  }
}

export function getDocumentUrl(library: string, filename: string): string {
  return `/data/${encodeURIComponent(library)}/documents/${encodeURIComponent(filename)}`;
}

export function getAnnotationUrl(library: string, pdfFilename: string, pageNumber: number): string {
  return `/data/${encodeURIComponent(library)}/aux/${encodeURIComponent(`${pdfFilename}_${pageNumber}.png`)}`;
}
