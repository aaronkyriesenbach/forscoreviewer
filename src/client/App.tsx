import { useEffect, useState } from 'react';
import { Layout } from '@/client/components/Layout';
import { AppSidebar } from '@/client/components/AppSidebar';
import { PdfViewer } from '@/client/components/PdfViewer';
import { useLibraries } from '@/client/hooks/useLibraries';
import { useAnnotations } from '@/client/hooks/useAnnotations';
import { getDocumentUrl } from '@/client/lib/api';
import '@/client/globals.css';

function App() {
  const { libraries, isLoading: isLoadingLibraries, refresh: refreshLibraries } = useLibraries();
  const [selectedLibrary, setSelectedLibrary] = useState<string>('');
  const [selectedScore, setSelectedScore] = useState<string | null>(null);
  const [jumpToPage, setJumpToPage] = useState<number | undefined>(undefined);

  const annotationMap = useAnnotations(selectedLibrary || null);

  useEffect(() => {
    if (!selectedLibrary && libraries.length > 0) {
      setSelectedLibrary(libraries[0].name);
      setSelectedScore(null);
      setJumpToPage(undefined);
      return;
    }

    if (selectedLibrary && !libraries.some((library) => library.name === selectedLibrary)) {
      setSelectedLibrary(libraries[0]?.name ?? '');
      setSelectedScore(null);
      setJumpToPage(undefined);
    }
  }, [libraries, selectedLibrary]);

  const handleLibraryChange = (library: string) => {
    setSelectedLibrary(library);
    setSelectedScore(null);
    setJumpToPage(undefined);
  };

  const handleScoreSelect = (filename: string) => {
    setSelectedScore(filename);
    setJumpToPage(undefined);
  };

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
          onScoreSelect={handleScoreSelect}
          onBookmarkClick={setJumpToPage}
          selectedLibrary={selectedLibrary}
          onLibraryChange={handleLibraryChange}
          onRefreshLibraries={refreshLibraries}
        />
      }
    >
      <div className="flex-1 h-full overflow-hidden">
        {!pdfUrl ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              {libraries.length === 0
                ? 'Upload a library using the "+ Add Library" button in the sidebar.'
                : 'Select a score to view it.'}
            </p>
          </div>
        ) : (
          <PdfViewer
            pdfUrl={pdfUrl}
            libraryName={selectedLibrary}
            pdfFilename={selectedScore ?? undefined}
            annotationPages={annotationPages}
            jumpToPage={jumpToPage}
          />
        )}
      </div>
    </Layout>
  );
}

export default App;
