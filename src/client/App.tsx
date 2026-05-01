import { useCallback, useEffect } from 'react';
import { Layout } from '@/client/components/Layout';
import { AppSidebar } from '@/client/components/AppSidebar';
import { PdfViewer } from '@/client/components/PdfViewer';
import { SidebarTrigger } from '@/client/components/ui/sidebar';
import { Separator } from '@/client/components/ui/separator';
import { ThemeToggle } from '@/client/components/ThemeToggle';
import { useLibraries } from '@/client/hooks/useLibraries';
import { useAnnotations } from '@/client/hooks/useAnnotations';
import { useUrlState } from '@/client/hooks/useUrlState';
import { getDocumentUrl } from '@/client/lib/api';
import '@/client/globals.css';

function App() {
  const { libraries, isLoading: isLoadingLibraries, refresh: refreshLibraries } = useLibraries();
  const {
    library: selectedLibrary,
    score: selectedScore,
    page,
    setLibrary,
    setScore,
    setPage,
    replaceLibrary,
  } = useUrlState();

  const annotationMap = useAnnotations(selectedLibrary || null);

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

  const handlePageChange = useCallback((pageNum: number) => {
    setPage(pageNum);
  }, [setPage]);

  const handleBookmarkClick = useCallback((pageNum: number) => {
    setPage(pageNum);
  }, [setPage]);

  const pdfUrl = selectedScore && selectedLibrary
    ? getDocumentUrl(selectedLibrary, selectedScore)
    : null;

  const annotationPages = selectedScore
    ? annotationMap.get(selectedScore)
    : undefined;

  return (
    <Layout
      sidebar={
        <AppSidebar
          libraries={libraries}
          isLoadingLibraries={isLoadingLibraries}
          selectedScore={selectedScore}
          onScoreSelect={setScore}
          onBookmarkClick={handleBookmarkClick}
          selectedLibrary={selectedLibrary}
          onLibraryChange={setLibrary}
          onRefreshLibraries={refreshLibraries}
        />
      }
    >
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {!pdfUrl ? (
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
            pdfUrl={pdfUrl}
            libraryName={selectedLibrary}
            pdfFilename={selectedScore ?? undefined}
            annotationPages={annotationPages}
            jumpToPage={page}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </Layout>
  );
}

export default App;
