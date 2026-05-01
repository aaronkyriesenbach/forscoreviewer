import { Bookmark as BookmarkIcon } from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/client/components/ui/sidebar';
import type { Bookmark } from '@/shared/types';

interface BookmarkListProps {
  bookmarks: Bookmark[];
  onBookmarkClick: (page: number) => void;
}

function pageLabel(bm: Bookmark): string {
  return bm.lastPage
    ? `pp. ${bm.firstPage}–${bm.lastPage}`
    : `p. ${bm.firstPage}`;
}

export function BookmarkList({ bookmarks, onBookmarkClick }: BookmarkListProps) {
  if (!bookmarks || bookmarks.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Bookmarks ({bookmarks.length})</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {bookmarks.map((bm, idx) => (
            <SidebarMenuItem key={`${bm.title}-${idx}`}>
              <SidebarMenuButton
                onClick={() => onBookmarkClick(bm.firstPage)}
                className="cursor-pointer"
              >
                <BookmarkIcon className="mr-2 h-4 w-4 shrink-0" />
                <div className="flex flex-1 justify-between gap-2 overflow-hidden items-center">
                  <span className="truncate">{bm.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {pageLabel(bm)}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
