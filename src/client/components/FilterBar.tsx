import { Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '@/client/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/client/components/ui/dropdown-menu';
import type { FilterOptions, ActiveFilters } from '@/client/lib/search';

export interface FilterBarProps {
  filterOptions: FilterOptions;
  activeFilters: ActiveFilters;
  onFilterChange: (facet: keyof ActiveFilters, value: string) => void;
  onClearFilters: () => void;
  scoreCounts: Record<string, Record<string, number>>;
}

const FACETS: { key: keyof ActiveFilters; label: string }[] = [
  { key: 'composers', label: 'Composer' },
  { key: 'genres', label: 'Genre' },
  { key: 'instruments', label: 'Instrument' },
  { key: 'labels', label: 'Label' },
];

export function FilterBar({
  filterOptions,
  activeFilters,
  onFilterChange,
  onClearFilters,
  scoreCounts,
}: FilterBarProps) {
  const hasAnyOptions = FACETS.some((f) => filterOptions[f.key]?.length > 0);
  if (!hasAnyOptions) return null;

  const hasActiveFilters = FACETS.some((f) => activeFilters[f.key]?.size > 0);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-1 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </div>
        
        {FACETS.map((facet) => {
          const options = filterOptions[facet.key] || [];
          if (options.length === 0) return null;
          
          const activeCount = activeFilters[facet.key]?.size || 0;

          return (
            <DropdownMenu key={facet.key}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed">
                  {facet.label}
                  {activeCount > 0 && (
                    <span className="ml-1.5 flex h-4 items-center justify-center rounded-sm bg-secondary px-1 font-mono text-[10px]">
                      {activeCount}
                    </span>
                  )}
                  <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px] max-h-60 overflow-y-auto">
                <DropdownMenuLabel>{facet.label}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {options.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option}
                    checked={activeFilters[facet.key]?.has(option)}
                    onCheckedChange={() => onFilterChange(facet.key, option)}
                  >
                    <div className="flex flex-1 items-center justify-between overflow-hidden">
                      <span className="truncate pr-2" title={option}>
                        {option}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {scoreCounts[facet.key]?.[option] || 0}
                      </span>
                    </div>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {FACETS.map((facet) => {
            const activeSet = activeFilters[facet.key];
            if (!activeSet || activeSet.size === 0) return null;

            return Array.from(activeSet).map((value) => (
              <div
                key={`${facet.key}-${value}`}
                className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium transition-colors hover:bg-muted"
              >
                <span className="text-muted-foreground">{facet.label}:</span>
                <span className="max-w-[120px] truncate" title={value}>
                  {value}
                </span>
                <button
                  type="button"
                  onClick={() => onFilterChange(facet.key, value)}
                  className="ml-1 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove filter</span>
                </button>
              </div>
            ));
          })}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-6 px-2 text-xs text-muted-foreground"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
