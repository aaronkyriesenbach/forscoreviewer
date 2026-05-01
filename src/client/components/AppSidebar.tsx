import { useEffect, useMemo, useState } from 'react';
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/client/components/ui/sidebar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/client/components/ui/select';
import { Input } from '@/client/components/ui/input';
import { Separator } from '@/client/components/ui/separator';
import { Button } from '@/client/components/ui/button';
import { UploadDialog } from '@/client/components/UploadDialog';
import { SetlistPanel } from '@/client/components/SetlistPanel';
import { BookmarkList } from '@/client/components/BookmarkList';
import { createSearchIndex, searchScores } from '@/client/lib/search';
import { deleteLibrary } from '@/client/lib/api';
import type { LibraryInfo, LibraryMetadata } from '@/shared/types';
import { Trash2 } from 'lucide-react';
import { cn } from '@/client/lib/utils';

type SidebarTab = 'scores' | 'setlists';

interface AppSidebarProps {
  libraries: LibraryInfo[];
  isLoadingLibraries: boolean;
  metadata: LibraryMetadata | null;
  isLoadingMetadata: boolean;
  selectedScore: string | null;
  onScoreSelect: (filename: string, page?: number) => void;
  onBookmarkClick: (page: number) => void;
  onSetlistItemSelect: (setlistName: string, index: number) => void;
  activeSetlist: string | null;
  activeSetlistIndex: number | undefined;
  selectedLibrary: string;
  onLibraryChange: (library: string) => void;
  onRefreshLibraries: () => void;
}

export function AppSidebar({
  libraries,
  isLoadingLibraries,
  metadata,
  isLoadingMetadata,
  selectedScore,
  onScoreSelect,
  onBookmarkClick,
  onSetlistItemSelect,
  activeSetlist,
  activeSetlistIndex,
  selectedLibrary,
  onLibraryChange,
  onRefreshLibraries,
}: AppSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SidebarTab>('scores');

  useEffect(() => {
    if (activeSetlist) {
      setActiveTab('setlists');
    } else if (selectedScore) {
      setActiveTab('scores');
    }
  }, [activeSetlist, selectedScore]);

  const handleDeleteLibrary = async () => {
    if (!selectedLibrary) {
      return;
    }

    if (!window.confirm(`Delete library "${selectedLibrary}"?`)) {
      return;
    }

    try {
      await deleteLibrary(selectedLibrary);
      onRefreshLibraries();
    } catch {
      // Ignore delete failures for now.
    }
  };

  const searchItems = useMemo(() => {
    if (!metadata?.scores) return null;
    return createSearchIndex(metadata.scores);
  }, [metadata]);

  const filteredScores = useMemo(() => {
    if (!searchItems) return [];
    const results = searchScores(searchItems, searchQuery);
    return results.sort((a, b) => a.metadata.title.localeCompare(b.metadata.title));
  }, [searchItems, searchQuery]);

  const setlistCount = metadata?.setlists ? Object.keys(metadata.setlists).length : 0;

  return (
    <>
      <div className="p-4 border-b flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Select 
            value={selectedLibrary} 
            onValueChange={onLibraryChange}
            disabled={isLoadingLibraries || libraries.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoadingLibraries ? "Loading..." : "Select Library"} />
            </SelectTrigger>
            <SelectContent>
              {libraries.length === 0 && !isLoadingLibraries ? (
                <SelectItem value="none" disabled>No libraries</SelectItem>
              ) : (
                libraries.map(lib => (
                  <SelectItem key={lib.name} value={lib.name}>
                    {lib.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedLibrary && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDeleteLibrary}
              className="shrink-0"
              aria-label="Delete library"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <UploadDialog libraries={libraries} onSuccess={onRefreshLibraries} />
        </div>

        <div className="flex rounded-md border" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'scores'}
            className={cn(
              'flex-1 px-3 py-1.5 text-sm font-medium transition-colors rounded-l-md',
              activeTab === 'scores'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
            onClick={() => setActiveTab('scores')}
          >
            Scores
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'setlists'}
            className={cn(
              'flex-1 px-3 py-1.5 text-sm font-medium transition-colors rounded-r-md border-l',
              activeTab === 'setlists'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
            onClick={() => setActiveTab('setlists')}
          >
            Setlists{setlistCount > 0 && ` (${setlistCount})`}
          </button>
        </div>

        {activeTab === 'scores' && (
          <Input 
            placeholder="Search scores..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        )}
      </div>

      <SidebarContent className="p-2">
        {activeTab === 'scores' && (
          <>
            {isLoadingMetadata ? (
              <p className="text-sm text-muted-foreground p-2">Loading scores...</p>
            ) : filteredScores.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">
                {metadata ? 'No scores found.' : 'Select a library to view scores.'}
              </p>
            ) : (
              <SidebarMenu>
                {filteredScores.map(({ filename, metadata: m }) => (
                  <SidebarMenuItem key={filename}>
                    <SidebarMenuButton 
                      isActive={selectedScore === filename}
                      onClick={() => onScoreSelect(filename)}
                      className="h-auto py-2"
                    >
                      <div className="flex flex-col gap-1 w-full text-left">
                        <span className="font-semibold text-sm leading-tight truncate">
                          {m.title || filename}
                        </span>
                        {m.composer && (
                          <span className="text-xs text-muted-foreground truncate">
                            {m.composer}
                          </span>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}

            {selectedScore && metadata?.scores[selectedScore]?.bookmarks && (
              <>
                <Separator className="my-2" />
                <BookmarkList
                  bookmarks={metadata.scores[selectedScore].bookmarks || []}
                  onBookmarkClick={onBookmarkClick}
                />
              </>
            )}
          </>
        )}

        {activeTab === 'setlists' && (
          <>
            {isLoadingMetadata ? (
              <p className="text-sm text-muted-foreground p-2">Loading setlists...</p>
            ) : setlistCount === 0 ? (
              <p className="text-sm text-muted-foreground p-2">
                {metadata ? 'No setlists in this library.' : 'Select a library to view setlists.'}
              </p>
            ) : (
              <SetlistPanel
                setlists={metadata!.setlists}
                onItemSelect={onSetlistItemSelect}
                activeSetlist={activeSetlist}
                activeItemIndex={activeSetlistIndex}
              />
            )}
          </>
        )}
      </SidebarContent>
    </>
  );
}
