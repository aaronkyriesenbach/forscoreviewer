import { useCallback, useRef, useState, useEffect } from 'react';

export interface UrlState {
  library: string;
  score: string | null;
  page: number | undefined;
  setlist: string | null;
  setlistIndex: number | undefined;
}

export function parseUrl(pathname?: string): UrlState {
  const segments = (pathname ?? window.location.pathname)
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);

  const library = segments[0] ?? '';

  if (segments[1] === 'setlist' && segments[2]) {
    const rawIndex = segments[3] ? parseInt(segments[3], 10) : undefined;
    const setlistIndex =
      rawIndex && Number.isFinite(rawIndex) && rawIndex >= 1 ? rawIndex - 1 : 0;

    return { library, score: null, page: undefined, setlist: segments[2], setlistIndex };
  }

  const rawPage = segments[2] ? parseInt(segments[2], 10) : undefined;

  return {
    library,
    score: segments[1] ?? null,
    page: rawPage && Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : undefined,
    setlist: null,
    setlistIndex: undefined,
  };
}

export function buildPath(state: UrlState): string {
  if (!state.library) return '/';
  let path = `/${encodeURIComponent(state.library)}`;

  if (state.setlist) {
    path += `/setlist/${encodeURIComponent(state.setlist)}`;
    if (state.setlistIndex !== undefined && state.setlistIndex > 0) {
      path += `/${state.setlistIndex + 1}`;
    }
    return path;
  }

  if (state.score) {
    path += `/${encodeURIComponent(state.score)}`;
    if (state.page !== undefined && state.page > 1) {
      path += `/${state.page}`;
    }
  }
  return path;
}

/** URL format: `/<library>/<score>/<page>` or `/<library>/setlist/<name>/<1-based-index>` */
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
    const next: UrlState = {
      library,
      score: null,
      page: undefined,
      setlist: null,
      setlistIndex: undefined,
    };
    setState(next);
    stateRef.current = next;
    window.history.pushState(null, '', buildPath(next));
  }, []);

  const setScore = useCallback((score: string | null) => {
    const next: UrlState = {
      library: stateRef.current.library,
      score,
      page: undefined,
      setlist: null,
      setlistIndex: undefined,
    };
    setState(next);
    stateRef.current = next;
    window.history.pushState(null, '', buildPath(next));
  }, []);

  const setPage = useCallback((page: number | undefined) => {
    const prev = stateRef.current;
    const next: UrlState = { ...prev, page };
    setState(next);
    stateRef.current = next;
    window.history.replaceState(null, '', buildPath(next));
  }, []);

  const replaceLibrary = useCallback((library: string) => {
    const next: UrlState = {
      library,
      score: null,
      page: undefined,
      setlist: null,
      setlistIndex: undefined,
    };
    setState(next);
    stateRef.current = next;
    window.history.replaceState(null, '', buildPath(next));
  }, []);

  const setSetlistItem = useCallback((setlist: string, setlistIndex: number) => {
    const next: UrlState = {
      library: stateRef.current.library,
      score: null,
      page: undefined,
      setlist,
      setlistIndex,
    };
    setState(next);
    stateRef.current = next;
    window.history.pushState(null, '', buildPath(next));
  }, []);

  const replaceSetlistItem = useCallback((setlist: string, setlistIndex: number) => {
    const next: UrlState = {
      library: stateRef.current.library,
      score: null,
      page: undefined,
      setlist,
      setlistIndex,
    };
    setState(next);
    stateRef.current = next;
    window.history.replaceState(null, '', buildPath(next));
  }, []);

  return {
    library: state.library,
    score: state.score,
    page: state.page,
    setlist: state.setlist,
    setlistIndex: state.setlistIndex,
    setLibrary,
    setScore,
    setPage,
    replaceLibrary,
    setSetlistItem,
    replaceSetlistItem,
  } as const;
}
