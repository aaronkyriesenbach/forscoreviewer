import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Music } from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/client/components/ui/sidebar';
import type { SetlistEntry } from '@/shared/types';

interface SetlistPanelProps {
  setlists: Record<string, SetlistEntry[]>;
  onItemSelect: (setlistName: string, index: number) => void;
  activeSetlist: string | null;
  activeItemIndex: number | undefined;
}

export function SetlistPanel({
  setlists,
  onItemSelect,
  activeSetlist,
  activeItemIndex,
}: SetlistPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (activeSetlist) {
      setExpanded(activeSetlist);
    }
  }, [activeSetlist]);

  const setlistEntries = Object.entries(setlists);
  if (setlistEntries.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Setlists ({setlistEntries.length})</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {setlistEntries.map(([name, items]) => {
            const isExpanded = expanded === name;
            return (
              <SidebarMenuItem key={name}>
                <SidebarMenuButton
                  onClick={() => setExpanded(isExpanded ? null : name)}
                  className="justify-between"
                >
                  <span className="truncate">{name}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                </SidebarMenuButton>
                {isExpanded && items.length > 0 && (
                  <SidebarMenuSub>
                    {items.map((item, idx) => (
                      <SidebarMenuSubItem key={`${item.file}-${idx}`}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={activeSetlist === name && activeItemIndex === idx}
                          onClick={() => onItemSelect(name, idx)}
                          className="cursor-pointer"
                        >
                          <div>
                            <Music className="mr-2 h-4 w-4 shrink-0" />
                            <span className="truncate">{item.title}</span>
                          </div>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
