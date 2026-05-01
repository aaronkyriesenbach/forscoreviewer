import { useCallback, useEffect, useState } from 'react';
import type { LibraryInfo } from '@/shared/types';
import { fetchLibraries } from '@/client/lib/api';

export function useLibraries() {
  const [libraries, setLibraries] = useState<LibraryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchLibraries();
      setLibraries(data);
    } catch (value: unknown) {
      setError(value instanceof Error ? value.message : 'Failed to load libraries');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { libraries, isLoading, error, refresh: load };
}
