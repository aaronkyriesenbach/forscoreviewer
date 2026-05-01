import { useEffect, useRef, useState } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { Button } from '@/client/components/ui/button';
import { Toggle } from '@/client/components/ui/toggle';
import { Skeleton } from '@/client/components/ui/skeleton';
import { getAnnotationUrl } from '@/client/lib/api';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfViewerProps {
  pdfUrl: string;
  onPageChange?: (page: number) => void;
  libraryName?: string;
  pdfFilename?: string;
  annotationPages?: Set<number>;
  jumpToPage?: number;
}

export function PdfViewer({
  pdfUrl,
  onPageChange,
  libraryName,
  pdfFilename,
  annotationPages,
  jumpToPage,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 768);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [showAnnotations, setShowAnnotations] = useState(true);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    setIsDesktop(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [pdfUrl]);

  useEffect(() => {
    if (jumpToPage && jumpToPage >= 1 && jumpToPage <= numPages) {
      setCurrentPage(jumpToPage);
    }
  }, [jumpToPage, numPages]);

  useEffect(() => {
    onPageChange?.(currentPage);
  }, [currentPage, onPageChange]);

  const goToPrev = () => {
    setCurrentPage((prev) => Math.max(1, prev - (isDesktop ? 2 : 1)));
  };

  const goToNext = () => {
    setCurrentPage((prev) => Math.min(numPages, prev + (isDesktop ? 2 : 1)));
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goToNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goToPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentPage, numPages, isDesktop]);

  const pageWidth = isDesktop ? Math.floor(containerWidth / 2) - 8 : containerWidth;

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          {libraryName && (
            <Toggle
              pressed={showAnnotations}
              onPressedChange={setShowAnnotations}
              size="sm"
              aria-label="Toggle annotations"
            >
              <Pencil className="h-4 w-4 mr-1" /> Annotations
            </Toggle>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={goToPrev} disabled={currentPage <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {isDesktop && currentPage + 1 <= numPages
              ? `Pages ${currentPage}–${Math.min(currentPage + 1, numPages)} of ${numPages}`
              : `Page ${currentPage} of ${numPages}`}
          </span>
          <Button variant="outline" size="icon" onClick={goToNext} disabled={currentPage >= numPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-hidden bg-muted/20 p-4">
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages }) => {
            setNumPages(numPages);
            setCurrentPage(1);
          }}
          onLoadError={(err) => {
            console.error('[PDF]', err?.message ?? String(err));
          }}
          loading={<div className="p-8"><Skeleton className="h-[600px] w-full" /></div>}
          error={<p className="text-destructive p-4">Failed to load PDF: {pdfUrl}</p>}
          className="flex justify-center gap-4"
        >
          {containerWidth > 0 && numPages > 0 && (
            <>
              <div style={{ position: 'relative' }}>
                <Page
                  pageNumber={currentPage}
                  width={pageWidth}
                  loading={<Skeleton className="h-[600px]" style={{ width: pageWidth }} />}
                />
                {showAnnotations && libraryName && pdfFilename && annotationPages?.has(currentPage) && (
                  <img
                    src={getAnnotationUrl(libraryName, pdfFilename, currentPage)}
                    alt=""
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                      zIndex: 4,
                    }}
                  />
                )}
              </div>
              {isDesktop && currentPage + 1 <= numPages && (
                <div style={{ position: 'relative' }}>
                  <Page
                    pageNumber={currentPage + 1}
                    width={pageWidth}
                    loading={<Skeleton className="h-[600px]" style={{ width: pageWidth }} />}
                  />
                  {showAnnotations && libraryName && pdfFilename && annotationPages?.has(currentPage + 1) && (
                    <img
                      src={getAnnotationUrl(libraryName, pdfFilename, currentPage + 1)}
                      alt=""
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 4,
                      }}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </Document>
      </div>
    </div>
  );
}
