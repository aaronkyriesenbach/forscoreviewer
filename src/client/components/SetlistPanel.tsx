import { useState } from 'react';
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
  onScoreSelect: (filename: string) => void;
}

export function SetlistPanel({ setlists, onScoreSelect }: SetlistPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

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
                          onClick={() => onScoreSelect(item.file)}
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
