// Score metadata (one per PDF file in library)
export interface ScoreMetadata {
  title: string;
  composer?: string;
  genre?: string;
  keywords?: string;       // instrument (e.g., "piano", "violin")
  labels?: string;         // comma-separated labels (e.g., "solo, solo_with_accompaniment")
  added?: string;          // ISO 8601 date string
  bookmarks?: Bookmark[];
  signature?: string;      // time signature (e.g., "1/1")
  bpm?: number;
  pitch?: number;
  [key: string]: unknown;  // remaining plist fields (use unknown, NOT any)
}

// Bookmark within a score
export interface Bookmark {
  title: string;
  firstPage: number;
  lastPage?: number;       // omitted for single-page bookmarks (plist value 0 → omit)
}

// Setlist entry
export interface SetlistEntry {
  title: string;
  file: string;            // PDF filename (e.g., "Jerry Songbook.pdf")
  firstPage?: number;
  lastPage?: number;
  [key: string]: unknown;  // remaining plist fields (Bookmark, Identifier, etc.)
}

// Complete library metadata (written as metadata.json)
export interface LibraryMetadata {
  scores: Record<string, ScoreMetadata>;    // keyed by PDF filename
  setlists: Record<string, SetlistEntry[]>; // keyed by setlist name
}

// Library info (returned by GET /api/libraries)
export interface LibraryInfo {
  name: string;
  scoreCount: number;
  setlistCount: number;
}

// Upload response (returned by POST /api/libraries/:name/upload)
export interface UploadResponse {
  success: boolean;
  library: string;
  scoreCount: number;
  setlistCount: number;
}
