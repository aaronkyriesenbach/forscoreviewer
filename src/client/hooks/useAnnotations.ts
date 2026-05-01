import { useEffect, useState } from 'react';
import { fetchAnnotations } from '@/client/lib/api';

export function useAnnotations(libraryName: string | null) {
  const [annotationMap, setAnnotationMap] = useState<Map<string, Set<number>>>(new Map());

  useEffect(() => {
    if (!libraryName) {
      setAnnotationMap(new Map());
      return;
    }

    fetchAnnotations(libraryName)
      .then((files) => {
        const map = new Map<string, Set<number>>();

        for (const filename of files) {
          const lastUnderscoreIndex = filename.lastIndexOf('_');
          const lastDotIndex = filename.lastIndexOf('.');

          if (lastUnderscoreIndex === -1 || lastDotIndex <= lastUnderscoreIndex) {
            continue;
          }

          const pdfFilename = filename.slice(0, lastUnderscoreIndex);
          const pageString = filename.slice(lastUnderscoreIndex + 1, lastDotIndex);
          const page = Number.parseInt(pageString, 10);

          if (!pdfFilename || Number.isNaN(page)) {
            continue;
          }

          const pages = map.get(pdfFilename) ?? new Set<number>();
          pages.add(page);
          map.set(pdfFilename, pages);
        }

        setAnnotationMap(map);
      })
      .catch(() => {
        setAnnotationMap(new Map());
      });
  }, [libraryName]);

  return annotationMap;
}
