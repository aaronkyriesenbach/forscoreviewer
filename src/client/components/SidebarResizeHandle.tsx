import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/client/lib/utils';

const MIN_WIDTH = 200;
const MAX_WIDTH = 600;

interface SidebarResizeHandleProps {
  width: number;
  onResize: (width: number) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
  defaultWidth: number;
}

export function SidebarResizeHandle({
  width,
  onResize,
  onResizeStart,
  onResizeEnd,
  defaultWidth,
}: SidebarResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
      onResizeStart();
    },
    [width, onResizeStart],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
      onResize(newWidth);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      onResizeEnd();
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, onResize, onResizeEnd]);

  const handleDoubleClick = useCallback(() => {
    onResize(defaultWidth);
  }, [onResize, defaultWidth]);

  return (
    <div
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      className={cn(
        'absolute inset-y-0 -right-4 z-20 hidden w-4 cursor-col-resize select-none sm:flex',
        'items-center justify-center',
        'after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] after:-translate-x-1/2',
        isDragging ? 'after:bg-primary' : 'hover:after:bg-sidebar-border',
      )}
    />
  );
}
