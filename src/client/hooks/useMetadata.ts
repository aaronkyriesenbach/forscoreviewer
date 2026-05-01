import { useState, useEffect } from 'react';
import type { LibraryMetadata } from '@/shared/types';
import { fetchMetadata } from '@/client/lib/api';

export function useMetadata(libraryName: string | null) {
  const [metadata, setMetadata] = useState<LibraryMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!libraryName) {
      setMetadata(null);
      return;
    }

    setIsLoading(true);

    fetchMetadata(libraryName)
      .then(setMetadata)
      .catch(() => {
        setMetadata(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [libraryName]);

  return { metadata, isLoading };
}
