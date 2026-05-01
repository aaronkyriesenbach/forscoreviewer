import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/client/components/ui/sidebar';
import { Separator } from '@/client/components/ui/separator';

interface LayoutProps {
  sidebar?: React.ReactNode;
  children?: React.ReactNode;
}

export function Layout({ sidebar, children }: LayoutProps) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1">
            <span className="font-semibold text-sm">forScore Viewer</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {sidebar}
        </SidebarContent>
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
