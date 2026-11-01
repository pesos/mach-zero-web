import type { ScanResult } from '@eventkit/sdk';
import { type ScanLogRow, type ScannerState, useScanLog } from '@eventkit/sdk/react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const REASON: Record<NonNullable<ScanResult['reason']>, string> = {
  duplicate: 'Duplicate',
  not_open: 'Not open',
  closed: 'Closed',
  not_attending: "Not RSVP'd",
  not_checked_in: 'Not checked in',
  cancelled: 'Cancelled',
};

const time = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
});

/**
 * Recent scans at the checkpoint, below the result banner: everyone's scans
 * from the server (every 5 s while online), with this phone's unsent ones on top.
 */
export function ScanLog({
  state,
  checkpointId,
}: {
  state: Pick<ScannerState, 'online' | 'log'>;
  checkpointId: string;
}) {
  const { rows, isPending } = useScanLog(state, checkpointId);
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-base">Scan log</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="px-4 text-sm text-muted-foreground">
            {isPending ? 'Loading…' : 'No scans here yet.'}
          </p>
        ) : (
          <Table aria-label="Scan log">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Time</TableHead>
                <TableHead>Participant ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="pr-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-4 tabular-nums">
                    {time.format(new Date(r.scannedAt))}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.participantCode}</TableCell>
                  <TableCell className="max-w-32 truncate">{r.name}</TableCell>
                  <TableCell className="pr-4">
                    <Status row={r} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function Status({ row }: { row: ScanLogRow }) {
  const label =
    row.result === 'accepted'
      ? row.exitReason
        ? `Out: ${row.exitReason}`
        : row.reentry
          ? 'Back in'
          : 'Accepted'
      : row.reason
        ? REASON[row.reason]
        : 'Refused';
  return (
    <div className="flex flex-wrap gap-1">
      <Badge
        variant={row.result === 'accepted' ? 'secondary' : 'destructive'}
        className={row.result === 'accepted' ? 'bg-success/15 text-success' : undefined}
      >
        {label}
      </Badge>
      {row.sync === 'pending' && <Badge variant="outline">Offline · not sent</Badge>}
      {row.sync === 'conflict' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" tabIndex={0}>
              Conflict
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Server: {row.serverNote ?? 'decided differently'}</TooltipContent>
        </Tooltip>
      )}
      {row.sync === 'synced' && row.offline && <Badge variant="outline">Offline</Badge>}
    </div>
  );
}
