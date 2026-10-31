import { ChevronDownIcon, type LucideIcon } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

/** What the list shows: everything, the one filter, or one group picked from the menu. */
export type FeedView = { kind: 'all' } | { kind: 'filter' } | { kind: 'group'; id: string };

export type FeedGroup = { id: string; name: string; count: number };

const tabClass =
  'flex-none rounded-lg px-4 py-2 data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-primary';

/**
 * All (with a count), an optional filter tab, and a menu that asks which group
 * (a channel, a round) before showing just that one. `children` renders the list
 * for the current view.
 */
export function FeedTabs({
  total,
  filter,
  groups,
  children,
}: {
  total: number;
  filter?: string;
  groups: { label: string; menuLabel: string; icon?: LucideIcon; items: FeedGroup[] };
  children: (view: FeedView) => ReactNode;
}) {
  const [tab, setTab] = useState<'all' | 'filter' | 'group'>('all');
  const [groupId, setGroupId] = useState<string>();
  const picked = tab === 'group' ? groups.items.find((g) => g.id === groupId) : undefined;
  const view: FeedView = picked
    ? { kind: 'group', id: picked.id }
    : tab === 'filter'
      ? { kind: 'filter' }
      : { kind: 'all' };
  const value = view.kind;
  const Icon = groups.icon;
  return (
    <Tabs value={value} onValueChange={(v) => setTab(v as 'all' | 'filter')} className="gap-4">
      <div className="flex flex-wrap items-center gap-1 border-b pb-3">
        <TabsList className="h-auto gap-1 bg-transparent p-0">
          <TabsTrigger value="all" className={tabClass}>
            All
            <Badge variant="secondary" className="rounded-md px-1.5 tabular-nums">
              {total}
            </Badge>
          </TabsTrigger>
          {filter && (
            <TabsTrigger value="filter" className={tabClass}>
              {filter}
            </TabsTrigger>
          )}
        </TabsList>
        {/* Not a tab: it asks which group first, then shows that group. Not modal: a
            modal menu locks scrolling, hiding the scrollbar and shifting the page. */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              data-state={picked ? 'active' : 'inactive'}
              className={cn(
                'h-auto rounded-lg border border-transparent px-4 py-2 font-medium text-muted-foreground',
                'data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-primary',
              )}
            >
              {picked ? (
                <>
                  {Icon && <Icon />}
                  {picked.name}
                </>
              ) : (
                groups.label
              )}
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {groups.menuLabel}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {groups.items.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">
                No {groups.label.toLowerCase()} yet.
              </p>
            ) : (
              <DropdownMenuRadioGroup
                value={picked?.id}
                onValueChange={(id) => {
                  setGroupId(id);
                  setTab('group');
                }}
              >
                {groups.items.map((g) => (
                  <DropdownMenuRadioItem key={g.id} value={g.id}>
                    {Icon && <Icon className="text-muted-foreground" />}
                    {g.name}
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                      {g.count}
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <TabsContent value={value} className="grid gap-3">
        {children(view)}
      </TabsContent>
    </Tabs>
  );
}

/** Counts items per group, in first-seen order. */
export function groupCounts<T>(items: T[], group: (item: T) => { id: string; name: string }) {
  const counts = new Map<string, FeedGroup>();
  for (const item of items) {
    const { id, name } = group(item);
    const g = counts.get(id) ?? { id, name, count: 0 };
    g.count += 1;
    counts.set(id, g);
  }
  return [...counts.values()];
}
