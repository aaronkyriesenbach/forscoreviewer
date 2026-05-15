import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'favorites';

function loadFavorites(library: string): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const record = parsed as Record<string, unknown>;
        const arr = record[library];
        if (Array.isArray(arr)) {
          return new Set(arr.filter((v): v is string => typeof v === 'string'));
        }
      }
    }
  } catch {
    // localStorage unavailable or corrupt
  }
  return new Set();
}

function saveFavorites(library: string, favorites: Set<string>): void {
  try {
    let all: Record<string, unknown> = {};
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        all = { ...(parsed as Record<string, unknown>) };
      }
    }
    all[library] = [...favorites];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable
  }
}

export function useFavorites(library: string) {
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites(library));

  useEffect(() => {
    setFavorites(loadFavorites(library));
  }, [library]);

  const toggleFavorite = useCallback(
    (filename: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(filename)) {
          next.delete(filename);
        } else {
          next.add(filename);
        }
        saveFavorites(library, next);
        return next;
      });
    },
    [library],
  );

  return { favorites, toggleFavorite };
}
