import { useCallback, useRef, useState, useEffect } from 'react';

interface UrlState {
  library: string;
  score: string | null;
  page: number | undefined;
}

function parseUrl(): UrlState {
  const segments = window.location.pathname
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);

  const rawPage = segments[2] ? parseInt(segments[2], 10) : undefined;

  return {
    library: segments[0] ?? '',
    score: segments[1] ?? null,
    page: rawPage && Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : undefined,
  };
}

function buildPath(library: string, score: string | null, page: number | undefined): string {
  if (!library) return '/';
  let path = `/${encodeURIComponent(library)}`;
  if (score) {
    path += `/${encodeURIComponent(score)}`;
    if (page !== undefined && page > 1) {
      path += `/${page}`;
    }
  }
  return path;
}

/** URL format: `/<library>/<score>/<page>` — page 1 is omitted for cleanliness. */
export function useUrlState() {
  const [state, setState] = useState<UrlState>(parseUrl);

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const handler = () => {
      const parsed = parseUrl();
      setState(parsed);
      stateRef.current = parsed;
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const setLibrary = useCallback((library: string) => {
    const next: UrlState = { library, score: null, page: undefined };
    setState(next);
    stateRef.current = next;
    window.history.pushState(null, '', buildPath(library, null, undefined));
  }, []);

  const setScore = useCallback((score: string | null) => {
    const library = stateRef.current.library;
    const next: UrlState = { library, score, page: undefined };
    setState(next);
    stateRef.current = next;
    window.history.pushState(null, '', buildPath(library, score, undefined));
  }, []);

  const setPage = useCallback((page: number | undefined) => {
    const { library, score } = stateRef.current;
    const next: UrlState = { library, score, page };
    setState(next);
    stateRef.current = next;
    window.history.replaceState(null, '', buildPath(library, score, page));
  }, []);

  const replaceLibrary = useCallback((library: string) => {
    const next: UrlState = { library, score: null, page: undefined };
    setState(next);
    stateRef.current = next;
    window.history.replaceState(null, '', buildPath(library, null, undefined));
  }, []);

  return {
    library: state.library,
    score: state.score,
    page: state.page,
    setLibrary,
    setScore,
    setPage,
    replaceLibrary,
  } as const;
}
