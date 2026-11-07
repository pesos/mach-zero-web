import { formatIST, type Schemas } from '@eventkit/sdk';
import { useOutside } from '@eventkit/sdk/react';
import { DoorOpenIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ErrorText } from '@/components/ErrorText';
import { ListSkeleton } from '@/components/Skeletons';
import { StaffOnly } from '@/components/StaffOnly';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { timeAgo } from '@/lib/time';
import { SearchInput } from '@/components/SearchInput';
import { useListFilter } from '@/hooks/useListFilter';

export function Outside() {
  return (
    <StaffOnly allowed="scan">
      <OutsidePage />
    </StaffOnly>
  );
}

/** Everyone out through an entry & exit checkpoint and not back in, longest out first. */
const personText = (p: Schemas['OutsidePerson']) => [
  p.name,
  p.participantCode,
  p.teamName,
  p.phone,
  p.reason,
];

function OutsidePage() {
  const outside = useOutside();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const all = outside.data ?? [];
  const search = useListFilter(all, personText);
  const people = search.filtered;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
          Outside now
          {outside.data && (
            <Badge variant={all.length > 0 ? 'destructive' : 'secondary'}>
              {all.length} outside
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          People who went out through an entry &amp; exit checkpoint and haven&apos;t scanned back
          in. Refreshes every 15 seconds.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <ErrorText error={outside.error} />
        {outside.isPending && <ListSkeleton label="Loading who is outside" />}
        {all.length > 1 && (
          <SearchInput
            label="Search people outside"
            placeholder="Name, team, ID or phone"
            value={search.query}
            onChange={search.setQuery}
          />
        )}
        {search.active && people.length === 0 && (
          <p className="text-sm text-muted-foreground">Nobody outside matches.</p>
        )}
        {outside.data && all.length === 0 && (
          <div className="grid justify-items-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            <DoorOpenIcon className="size-6" aria-hidden />
            Everyone who left has come back.
          </div>
        )}
        {people.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <Table aria-label="People outside">
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden md:table-cell">Participant ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Team</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="hidden lg:table-cell">Reason</TableHead>
                  <TableHead>Left</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.map((p) => (
                  <TableRow key={p.registrationId}>
                    <TableCell className="hidden font-mono text-xs md:table-cell">
                      {p.participantCode}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="font-medium wrap-anywhere">{p.name}</div>
                      {/* What the hidden columns hold, on small screens. */}
                      <div className="text-xs text-muted-foreground wrap-anywhere md:hidden">
                        <span className="font-mono">{p.participantCode}</span> · {p.teamName}
                      </div>
                      {p.phone && (
                        <a
                          className="text-xs hover:underline sm:hidden"
                          href={`tel:${p.phone.replace(/\s/g, '')}`}
                        >
                          {p.phone}
                        </a>
                      )}
                      {p.reason && (
                        <div className="text-xs text-muted-foreground wrap-anywhere lg:hidden">
                          {p.reason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden whitespace-normal wrap-anywhere md:table-cell">
                      {p.teamName}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {p.phone ? (
                        <a className="hover:underline" href={`tel:${p.phone.replace(/\s/g, '')}`}>
                          {p.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden whitespace-normal lg:table-cell">
                      {p.reason ?? <span className="text-muted-foreground">—</span>}
                      {p.checkpointName && (
                        <div className="text-xs text-muted-foreground">via {p.checkpointName}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} className="whitespace-nowrap tabular-nums">
                            {timeAgo(p.outsideSince, now)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{formatIST(p.outsideSince)}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
