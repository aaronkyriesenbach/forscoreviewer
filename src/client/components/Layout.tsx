import React, { useCallback, useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/client/components/ui/sidebar';
import { Separator } from '@/client/components/ui/separator';
import { SidebarResizeHandle } from '@/client/components/SidebarResizeHandle';
import { cn } from '@/client/lib/utils';

const SIDEBAR_WIDTH_KEY = 'sidebar_width';
const DEFAULT_SIDEBAR_WIDTH = 256; // 16rem

function loadSidebarWidth(): number {
  try {
    const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (Number.isFinite(parsed) && parsed >= 200 && parsed <= 600) {
        return parsed;
      }
    }
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_SIDEBAR_WIDTH;
}

function saveSidebarWidth(width: number): void {
  try {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(Math.round(width)));
  } catch {
    // localStorage unavailable
  }
}

interface LayoutProps {
  sidebar?: React.ReactNode;
  children?: React.ReactNode;
}

export function Layout({ sidebar, children }: LayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(loadSidebarWidth);
  const [isResizing, setIsResizing] = useState(false);

  const handleResize = useCallback((width: number) => {
    setSidebarWidth(width);
  }, []);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setSidebarWidth((w) => {
      saveSidebarWidth(w);
      return w;
    });
  }, []);

  return (
    <SidebarProvider
      className={cn('h-svh', isResizing && 'sidebar-resizing')}
      style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
    >
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1">
            <span className="font-semibold text-sm">forScore Viewer</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {sidebar}
        </SidebarContent>
        <SidebarResizeHandle
          width={sidebarWidth}
          onResize={handleResize}
          onResizeStart={handleResizeStart}
          onResizeEnd={handleResizeEnd}
          defaultWidth={DEFAULT_SIDEBAR_WIDTH}
        />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 px-4 border-b">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm text-muted-foreground">forScore Viewer</span>
        </header>
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
