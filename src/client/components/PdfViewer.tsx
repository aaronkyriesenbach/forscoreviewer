import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, Pencil, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/client/components/ui/button';
import { Toggle } from '@/client/components/ui/toggle';
import { Skeleton } from '@/client/components/ui/skeleton';
import { Separator } from '@/client/components/ui/separator';
import { SidebarTrigger } from '@/client/components/ui/sidebar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/client/components/ui/select';
import { getAnnotationUrl } from '@/client/lib/api';
import { ThemeToggle } from '@/client/components/ThemeToggle';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];
const PAGE_GAP = 16; // matches Tailwind gap-4

interface PageDimensions {
  width: number;
  height: number;
}

interface PdfViewerProps {
  pdfUrl: string;
  onPageChange?: (page: number) => void;
  libraryName?: string;
  pdfFilename?: string;
  annotationPages?: Set<number>;
  jumpToPage?: number;
  pageRange?: { start: number; end: number };
  setlistPageOffset?: number;
  setlistTotalPages?: number;
  onPrevBoundary?: () => void;
  onNextBoundary?: () => void;
  itemLabel?: string;
  onDocumentPageCount?: (filename: string, numPages: number) => void;
}

export function PdfViewer({
  pdfUrl,
  onPageChange,
  libraryName,
  pdfFilename,
  annotationPages,
  jumpToPage,
  pageRange,
  setlistPageOffset = 0,
  setlistTotalPages = 0,
  onPrevBoundary,
  onNextBoundary,
  itemLabel,
  onDocumentPageCount,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [zoom, setZoom] = useState(1.0);
  const [pageDimensions, setPageDimensions] = useState<PageDimensions | null>(null);
  const [userPagesPerView, setUserPagesPerView] = useState<number | null>(null);

  const rangeStart = pageRange?.start ?? 1;
  const rangeEnd = pageRange ? Math.min(pageRange.end, numPages || pageRange.end) : numPages;
  const rangeTotal = rangeEnd - rangeStart + 1;

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setCurrentPage(pageRange?.start ?? 1);
    setPageDimensions(null);
    setZoom(1.0);
    setUserPagesPerView(null);
  }, [pdfUrl]);

  useEffect(() => {
    if (pageRange) {
      setCurrentPage(pageRange.start);
    }
  }, [pageRange?.start, pageRange?.end]);

  useEffect(() => {
    if (jumpToPage && jumpToPage >= 1 && jumpToPage <= numPages) {
      setCurrentPage(jumpToPage);
    }
  }, [jumpToPage, numPages]);

  const pageHeight = containerHeight > 0 ? Math.floor(containerHeight * zoom) : 0;

  const pageWidth = useMemo(() => {
    if (!pageDimensions || pageHeight <= 0) return 0;
    return Math.floor(pageHeight * (pageDimensions.width / pageDimensions.height));
  }, [pageDimensions, pageHeight]);

  const maxPages = useMemo(() => {
    if (pageWidth <= 0 || containerWidth <= 0) return 1;
    const layoutWidth = zoom > 1 ? Math.floor(pageWidth / zoom) : pageWidth;
    return Math.max(1, Math.floor((containerWidth + PAGE_GAP) / (layoutWidth + PAGE_GAP)));
  }, [pageWidth, containerWidth, zoom]);

  const pagesPerView = useMemo(() => {
    const desired = userPagesPerView ?? maxPages;
    return Math.max(1, Math.min(desired, maxPages, rangeTotal || 1));
  }, [userPagesPerView, maxPages, rangeTotal]);

  const pagesToRender = Math.min(pagesPerView, rangeEnd - currentPage + 1);
  const lastVisiblePage = currentPage + pagesToRender - 1;

  const atRangeStart = currentPage <= rangeStart;
  const atRangeEnd = lastVisiblePage >= rangeEnd;

  const goToPrev = useCallback(() => {
    if (!atRangeStart) {
      const newPage = Math.max(rangeStart, currentPage - pagesPerView);
      setCurrentPage(newPage);
      onPageChange?.(newPage);
    } else if (onPrevBoundary) {
      onPrevBoundary();
    }
  }, [atRangeStart, rangeStart, pagesPerView, currentPage, onPageChange, onPrevBoundary]);

  const goToNext = useCallback(() => {
    if (!atRangeEnd) {
      const newPage = Math.min(rangeEnd, currentPage + pagesPerView);
      setCurrentPage(newPage);
      onPageChange?.(newPage);
    } else if (onNextBoundary) {
      onNextBoundary();
    }
  }, [atRangeEnd, rangeEnd, pagesPerView, currentPage, onPageChange, onNextBoundary]);

  const prevDisabled = atRangeStart && !onPrevBoundary;
  const nextDisabled = atRangeEnd && !onNextBoundary;

  const canZoomIn = zoom < ZOOM_STEPS[ZOOM_STEPS.length - 1];
  const canZoomOut = zoom > ZOOM_STEPS[0];

  const zoomIn = useCallback(() => {
    setZoom((prev) => {
      const nextIdx = ZOOM_STEPS.findIndex((s) => s > prev);
      return nextIdx >= 0 ? ZOOM_STEPS[nextIdx] : prev;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => {
      const prevSteps = ZOOM_STEPS.filter((s) => s < prev);
      return prevSteps.length > 0 ? prevSteps[prevSteps.length - 1] : prev;
    });
  }, []);

  const handlePageLoadSuccess = useCallback(
    (page: { getViewport: (params: { scale: number }) => PageDimensions }) => {
      const viewport = page.getViewport({ scale: 1 });
      setPageDimensions((prev) => prev ?? { width: viewport.width, height: viewport.height });
    },
    [],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goToNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goToPrev();
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        zoomOut();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goToNext, goToPrev, zoomIn, zoomOut]);

  const handlePagesPerViewChange = useCallback((value: string) => {
    setUserPagesPerView(value === 'auto' ? null : Number(value));
  }, []);

  const pagesSelectValue = userPagesPerView === null ? 'auto' : String(pagesPerView);

  const inSetlistMode = setlistTotalPages > 0;
  const displayCurrentPage = inSetlistMode
    ? setlistPageOffset + currentPage - rangeStart + 1
    : currentPage;
  const displayLastPage = inSetlistMode
    ? setlistPageOffset + lastVisiblePage - rangeStart + 1
    : lastVisiblePage;
  const displayTotalPages = inSetlistMode ? setlistTotalPages : numPages;

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex items-center justify-between p-2 border-b gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-semibold whitespace-nowrap truncate">
            {itemLabel ?? 'forScore Viewer'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {libraryName && (
            <>
              <Toggle
                pressed={showAnnotations}
                onPressedChange={setShowAnnotations}
                size="sm"
                aria-label="Toggle annotations"
              >
                <Pencil className="h-4 w-4 mr-1" /> Annotations
              </Toggle>
              <Separator orientation="vertical" className="h-6" />
            </>
          )}

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={zoomOut}
              disabled={!canZoomOut}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground w-12 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={zoomIn}
              disabled={!canZoomIn}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <Select value={pagesSelectValue} onValueChange={handlePagesPerViewChange}>
            <SelectTrigger className="w-[8rem] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto ({maxPages})</SelectItem>
              {Array.from({ length: maxPages }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {i + 1} {i === 0 ? 'page' : 'pages'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="outline" size="icon" onClick={goToPrev} disabled={prevDisabled}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {pagesToRender > 1
              ? `Pages ${displayCurrentPage}\u2013${displayLastPage} of ${displayTotalPages}`
              : `Page ${displayCurrentPage} of ${displayTotalPages}`}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNext}
            disabled={nextDisabled}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />
          <ThemeToggle />
        </div>
      </div>

      <div className="relative flex-1 min-w-0">
      <div ref={containerRef} className="absolute inset-0 overflow-auto bg-muted/20 p-4">
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages: n }) => {
            setNumPages(n);
            if (pdfFilename) {
              onDocumentPageCount?.(pdfFilename, n);
            }
          }}
          onLoadError={(err) => {
            console.error('[PDF]', err?.message ?? String(err));
          }}
          loading={
            <div className="p-8 m-auto">
              <Skeleton className="h-[600px] w-[400px]" />
            </div>
          }
          error={<p className="text-destructive p-4 m-auto">Failed to load PDF: {pdfUrl}</p>}
          className="flex min-h-full min-w-full w-max"
        >
          {containerWidth > 0 && containerHeight > 0 && numPages > 0 && (
            <div className="flex gap-4 m-auto">
              {Array.from({ length: pagesToRender }, (_, i) => {
                const pageNum = currentPage + i;
                return (
                  <div key={pageNum} className="border border-border" style={{ position: 'relative' }}>
                    <Page
                      pageNumber={pageNum}
                      height={pageHeight > 0 ? pageHeight : undefined}
                      width={pageHeight > 0 ? undefined : containerWidth}
                      onLoadSuccess={handlePageLoadSuccess}
                      loading={
                        <Skeleton
                          style={{
                            width: pageWidth > 0 ? pageWidth : 300,
                            height: pageHeight > 0 ? pageHeight : 600,
                          }}
                        />
                      }
                    />
                    {showAnnotations &&
                      libraryName &&
                      pdfFilename &&
                      annotationPages?.has(pageNum) && (
                        <img
                          src={getAnnotationUrl(libraryName, pdfFilename, pageNum)}
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
                );
              })}
            </div>
          )}
        </Document>
      </div>
      </div>
    </div>
  );
}
