import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
} from '@/client/components/ui/sidebar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/client/components/ui/select';
import { Input } from '@/client/components/ui/input';
import { Button } from '@/client/components/ui/button';
import { UploadDialog } from '@/client/components/UploadDialog';
import { SetlistPanel } from '@/client/components/SetlistPanel';
import { BookmarkList } from '@/client/components/BookmarkList';
import { FilterBar } from '@/client/components/FilterBar';
import {
  createSearchIndex,
  searchScores,
  filterScores,
  extractFilterOptions,
  createEmptyFilters,
  hasActiveFilters,
} from '@/client/lib/search';
import type { ActiveFilters } from '@/client/lib/search';
import { deleteLibrary } from '@/client/lib/api';
import type { LibraryInfo, LibraryMetadata } from '@/shared/types';
import type { SidebarTab } from '@/client/hooks/useUrlState';
import { Trash2, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { cn } from '@/client/lib/utils';

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
  favorites: Set<string>;
  onToggleFavorite: (filename: string) => void;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
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
  favorites,
  onToggleFavorite,
  activeTab,
  onTabChange,
}: AppSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(createEmptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [scoresPanelOpen, setScoresPanelOpen] = useState(true);
  const [bookmarkPanelOpen, setBookmarkPanelOpen] = useState(true);

  useEffect(() => {
    setActiveFilters(createEmptyFilters());
    setSearchQuery('');
  }, [selectedLibrary]);

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

  const filterOptions = useMemo(() => {
    if (!metadata?.scores) return { composers: [], genres: [], instruments: [], labels: [] };
    return extractFilterOptions(metadata.scores);
  }, [metadata]);

  const scoreCounts = useMemo(() => {
    if (!metadata?.scores) return {};
    const counts: Record<string, Record<string, number>> = {
      composers: {},
      genres: {},
      instruments: {},
      labels: {},
    };
    for (const score of Object.values(metadata.scores)) {
      if (score.composer) {
        counts.composers[score.composer] = (counts.composers[score.composer] ?? 0) + 1;
      }
      if (score.genre) {
        counts.genres[score.genre] = (counts.genres[score.genre] ?? 0) + 1;
      }
      if (score.keywords) {
        counts.instruments[score.keywords] = (counts.instruments[score.keywords] ?? 0) + 1;
      }
      if (score.labels) {
        for (const raw of score.labels.split(',')) {
          const trimmed = raw.trim();
          if (trimmed) {
            counts.labels[trimmed] = (counts.labels[trimmed] ?? 0) + 1;
          }
        }
      }
    }
    return counts;
  }, [metadata]);

  const filteredScores = useMemo(() => {
    if (!searchItems) return [];
    const afterFilters = filterScores(searchItems, activeFilters);
    const afterSearch = searchScores(afterFilters, searchQuery);
    return afterSearch.sort((a, b) => a.metadata.title.localeCompare(b.metadata.title));
  }, [searchItems, searchQuery, activeFilters]);

  const favoriteScores = useMemo(() => {
    if (!metadata?.scores || favorites.size === 0) return [];
    return Object.entries(metadata.scores)
      .filter(([filename]) => favorites.has(filename))
      .map(([filename, m]) => ({ filename, metadata: m }))
      .sort((a, b) => a.metadata.title.localeCompare(b.metadata.title));
  }, [metadata, favorites]);

  const renderScoreList = (scores: typeof filteredScores) => (
    <SidebarMenu>
      {scores.map(({ filename, metadata: m }) => (
        <SidebarMenuItem key={filename}>
          <SidebarMenuButton
            isActive={selectedScore === filename}
            onClick={() => onScoreSelect(filename)}
            className="h-auto py-2"
          >
            <div className="flex flex-col gap-1 w-full text-left pr-5">
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
          <SidebarMenuAction
            onClick={() => onToggleFavorite(filename)}
            aria-label={favorites.has(filename) ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star
              className={cn(
                'h-3.5 w-3.5',
                favorites.has(filename)
                  ? 'text-yellow-500 fill-yellow-500'
                  : 'text-muted-foreground',
              )}
            />
          </SidebarMenuAction>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  const handleFilterChange = useCallback((facet: keyof ActiveFilters, value: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev, [facet]: new Set(prev[facet]) };
      if (next[facet].has(value)) {
        next[facet].delete(value);
      } else {
        next[facet].add(value);
      }
      return next;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setActiveFilters(createEmptyFilters());
  }, []);

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
            onClick={() => onTabChange('scores')}
          >
            Scores
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'favorites'}
            className={cn(
              'flex-1 px-3 py-1.5 text-sm font-medium transition-colors border-l',
              activeTab === 'favorites'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
            onClick={() => onTabChange('favorites')}
          >
            Favorites{favorites.size > 0 && ` (${favorites.size})`}
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
            onClick={() => onTabChange('setlists')}
          >
            Setlists{setlistCount > 0 && ` (${setlistCount})`}
          </button>
        </div>

        {activeTab === 'scores' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search scores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button
                variant={showFilters || hasActiveFilters(activeFilters) ? 'secondary' : 'outline'}
                size="icon"
                className="shrink-0 h-9 w-9"
                onClick={() => setShowFilters((v) => !v)}
                aria-label="Toggle filters"
                aria-expanded={showFilters}
              >
                <ChevronDown className={cn('h-4 w-4 transition-transform', showFilters && 'rotate-180')} />
              </Button>
            </div>
            {showFilters && (
              <FilterBar
                filterOptions={filterOptions}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                scoreCounts={scoreCounts}
              />
            )}
            {(searchQuery || hasActiveFilters(activeFilters)) && (
              <p className="text-xs text-muted-foreground">
                {filteredScores.length} of {searchItems?.length ?? 0} scores
              </p>
            )}
          </div>
        )}
      </div>

      {activeTab === 'scores' ? (
        <div className={cn('flex flex-col', scoresPanelOpen && 'flex-1 min-h-0')}>
          <button
            type="button"
            onClick={() => setScoresPanelOpen((v) => !v)}
            className="flex items-center justify-between px-4 py-2 text-sm font-medium hover:bg-muted transition-colors shrink-0"
          >
            <span>Scores{filteredScores.length > 0 ? ` (${filteredScores.length})` : ''}</span>
            {scoresPanelOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {scoresPanelOpen && (
            <div className="flex-1 overflow-y-auto p-2">
              {isLoadingMetadata ? (
                <p className="text-sm text-muted-foreground p-2">Loading scores...</p>
              ) : filteredScores.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">
                  {metadata ? 'No scores found.' : 'Select a library to view scores.'}
                </p>
              ) : (
                renderScoreList(filteredScores)
              )}
            </div>
          )}
        </div>
      ) : activeTab === 'favorites' ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-2">
          {isLoadingMetadata ? (
            <p className="text-sm text-muted-foreground p-2">Loading scores...</p>
          ) : favoriteScores.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">
              No favorites yet. Star a score to add it here.
            </p>
          ) : (
            renderScoreList(favoriteScores)
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto p-2">
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
        </div>
      )}

      {selectedScore && metadata?.scores[selectedScore]?.bookmarks &&
        metadata.scores[selectedScore].bookmarks.length > 0 && (
        <div className={cn('border-t flex flex-col', bookmarkPanelOpen && 'flex-1 min-h-0')}>
          <button
            type="button"
            onClick={() => setBookmarkPanelOpen((v) => !v)}
            className="flex items-center justify-between px-4 py-2 text-sm font-medium hover:bg-muted transition-colors shrink-0"
          >
            <span>Bookmarks ({metadata.scores[selectedScore].bookmarks.length})</span>
            {bookmarkPanelOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {bookmarkPanelOpen && (
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <BookmarkList
                bookmarks={metadata.scores[selectedScore].bookmarks}
                onBookmarkClick={onBookmarkClick}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
