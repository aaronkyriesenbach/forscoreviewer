import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from '@/client/components/Layout';
import { AppSidebar } from '@/client/components/AppSidebar';
import { PdfViewer } from '@/client/components/PdfViewer';
import { SidebarTrigger } from '@/client/components/ui/sidebar';
import { Separator } from '@/client/components/ui/separator';
import { ThemeToggle } from '@/client/components/ThemeToggle';
import { useLibraries } from '@/client/hooks/useLibraries';
import { useMetadata } from '@/client/hooks/useMetadata';
import { useAnnotations } from '@/client/hooks/useAnnotations';
import { useUrlState } from '@/client/hooks/useUrlState';
import { getDocumentUrl } from '@/client/lib/api';
import { pdfjs } from 'react-pdf';
import '@/client/globals.css';

function App() {
  const { libraries, isLoading: isLoadingLibraries, refresh: refreshLibraries } = useLibraries();
  const {
    library: selectedLibrary,
    score: selectedScore,
    page,
    setlist: activeSetlist,
    setlistIndex: activeSetlistIndex,
    setLibrary,
    setScore,
    setPage,
    replaceLibrary,
    setSetlistItem,
    replaceSetlistItem,
  } = useUrlState();

  const { metadata, isLoading: isLoadingMetadata } = useMetadata(selectedLibrary || null);
  const annotationMap = useAnnotations(selectedLibrary || null);
  const [pdfPageCounts, setPdfPageCounts] = useState<Record<string, number>>({});

  const handleDocumentPageCount = useCallback((filename: string, numPages: number) => {
    setPdfPageCounts((prev) => (prev[filename] === numPages ? prev : { ...prev, [filename]: numPages }));
  }, []);

  useEffect(() => {
    if (isLoadingLibraries) return;

    if (!selectedLibrary && libraries.length > 0) {
      replaceLibrary(libraries[0].name);
      return;
    }

    if (selectedLibrary && !libraries.some((lib) => lib.name === selectedLibrary)) {
      replaceLibrary(libraries[0]?.name ?? '');
    }
  }, [libraries, selectedLibrary, replaceLibrary, isLoadingLibraries]);

  const setlistItems = activeSetlist && metadata ? metadata.setlists[activeSetlist] : undefined;
  const activeItem =
    setlistItems && activeSetlistIndex !== undefined
      ? setlistItems[activeSetlistIndex]
      : undefined;

  const prefetchedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!setlistItems || !selectedLibrary) return;

    const filesToFetch = new Set<string>();
    for (const item of setlistItems) {
      if (item.firstPage === undefined && !prefetchedRef.current.has(item.file)) {
        filesToFetch.add(item.file);
      }
    }

    if (filesToFetch.size === 0) return;

    let cancelled = false;
    for (const file of filesToFetch) {
      prefetchedRef.current.add(file);
      const url = getDocumentUrl(selectedLibrary, file);
      const loadingTask = pdfjs.getDocument(url);
      loadingTask.promise
        .then((doc) => {
          if (!cancelled) {
            setPdfPageCounts((prev) =>
              prev[file] === doc.numPages ? prev : { ...prev, [file]: doc.numPages },
            );
          }
          doc.destroy();
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [setlistItems, selectedLibrary]);

  const viewState = useMemo(() => {
    if (activeItem && selectedLibrary) {
      const pageRange =
        activeItem.firstPage !== undefined
          ? {
              start: activeItem.firstPage,
              end: activeItem.lastPage ?? activeItem.firstPage,
            }
          : undefined;

      let setlistPageOffset = 0;
      let setlistTotalPages = 0;
      if (setlistItems) {
        for (let i = 0; i < setlistItems.length; i++) {
          const item = setlistItems[i];
          const count =
            item.firstPage !== undefined
              ? (item.lastPage ?? item.firstPage) - item.firstPage + 1
              : pdfPageCounts[item.file] ?? 1;
          if (i < (activeSetlistIndex ?? 0)) {
            setlistPageOffset += count;
          }
          setlistTotalPages += count;
        }
      }

      return {
        pdfUrl: getDocumentUrl(selectedLibrary, activeItem.file),
        pdfFilename: activeItem.file,
        jumpToPage: pageRange?.start,
        pageRange,
        itemLabel: activeItem.title,
        setlistPageOffset,
        setlistTotalPages,
      };
    }

    if (selectedScore && selectedLibrary) {
      return {
        pdfUrl: getDocumentUrl(selectedLibrary, selectedScore),
        pdfFilename: selectedScore,
        jumpToPage: page,
        pageRange: undefined,
        itemLabel: undefined,
        setlistPageOffset: 0,
        setlistTotalPages: 0,
      };
    }

    return null;
  }, [activeItem, selectedScore, selectedLibrary, page, setlistItems, activeSetlistIndex, pdfPageCounts]);

  const handlePageChange = useCallback(
    (pageNum: number) => {
      if (!activeSetlist) {
        setPage(pageNum);
      }
    },
    [activeSetlist, setPage],
  );

  const handleScoreSelect = useCallback(
    (filename: string, scorePage?: number) => {
      setScore(filename);
      if (scorePage !== undefined) {
        setPage(scorePage);
      }
    },
    [setScore, setPage],
  );

  const handleBookmarkClick = useCallback(
    (pageNum: number) => {
      setPage(pageNum);
    },
    [setPage],
  );

  const handleSetlistItemSelect = useCallback(
    (setlistName: string, index: number) => {
      setSetlistItem(setlistName, index);
    },
    [setSetlistItem],
  );

  const handlePrevItem = useMemo(() => {
    if (!activeSetlist || activeSetlistIndex === undefined || activeSetlistIndex <= 0) {
      return undefined;
    }
    return () => replaceSetlistItem(activeSetlist, activeSetlistIndex - 1);
  }, [activeSetlist, activeSetlistIndex, replaceSetlistItem]);

  const handleNextItem = useMemo(() => {
    if (
      !activeSetlist ||
      activeSetlistIndex === undefined ||
      !setlistItems ||
      activeSetlistIndex >= setlistItems.length - 1
    ) {
      return undefined;
    }
    return () => replaceSetlistItem(activeSetlist, activeSetlistIndex + 1);
  }, [activeSetlist, activeSetlistIndex, setlistItems, replaceSetlistItem]);

  const annotationPages = viewState?.pdfFilename
    ? annotationMap.get(viewState.pdfFilename)
    : undefined;

  return (
    <Layout
      sidebar={
        <AppSidebar
          libraries={libraries}
          isLoadingLibraries={isLoadingLibraries}
          metadata={metadata}
          isLoadingMetadata={isLoadingMetadata}
          selectedScore={selectedScore}
          onScoreSelect={handleScoreSelect}
          onBookmarkClick={handleBookmarkClick}
          onSetlistItemSelect={handleSetlistItemSelect}
          activeSetlist={activeSetlist}
          activeSetlistIndex={activeSetlistIndex}
          selectedLibrary={selectedLibrary}
          onLibraryChange={setLibrary}
          onRefreshLibraries={refreshLibraries}
        />
      }
    >
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {!viewState ? (
          <>
            <div className="flex items-center gap-2 p-2 border-b">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm font-semibold">forScore Viewer</span>
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </div>
            <div className="flex items-center justify-center flex-1">
              <p className="text-muted-foreground">
                {libraries.length === 0
                  ? 'Upload a library using the "+ Add Library" button in the sidebar.'
                  : 'Select a score to view it.'}
              </p>
            </div>
          </>
        ) : (
          <PdfViewer
            pdfUrl={viewState.pdfUrl}
            libraryName={selectedLibrary}
            pdfFilename={viewState.pdfFilename}
            annotationPages={annotationPages}
            jumpToPage={viewState.jumpToPage}
            pageRange={viewState.pageRange}
            setlistPageOffset={viewState.setlistPageOffset}
            setlistTotalPages={viewState.setlistTotalPages}
            onPrevBoundary={handlePrevItem}
            onNextBoundary={handleNextItem}
            itemLabel={viewState.itemLabel}
            onPageChange={handlePageChange}
            onDocumentPageCount={handleDocumentPageCount}
          />
        )}
      </div>
    </Layout>
  );
}

export default App;
