import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** Wraps a skeleton so screen readers hear one "loading" instead of nothing. */
function Busy({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="grid gap-6">
      {children}
    </div>
  );
}

function Rows({ count }: { count: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/** A generic card: the Suspense fallback and the default for small pages. */
export function CardSkeleton({ label = 'Loading' }: { label?: string }) {
  return (
    <Busy label={label}>
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent className="grid gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-9 w-32" />
        </CardContent>
      </Card>
    </Busy>
  );
}

/** A card with a list of rows (leaderboard, team). */
export function ListSkeleton({ label = 'Loading', rows = 4 }: { label?: string; rows?: number }) {
  return (
    <Busy label={label}>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Rows count={rows} />
        </CardContent>
      </Card>
    </Busy>
  );
}

/** A stack of cards (polls, notifications, judging). */
export function CardsSkeleton({
  label = 'Loading',
  count = 3,
}: {
  label?: string;
  count?: number;
}) {
  return (
    <Busy label={label}>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="gap-3">
          <CardHeader className="gap-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </CardHeader>
          <CardContent className="grid gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
        </Card>
      ))}
    </Busy>
  );
}

/** The member's page: team card, QR card. */
export function MeSkeleton() {
  return (
    <Busy label="Opening your registration">
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Rows count={3} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-52 w-full rounded-xl" />
        </CardContent>
      </Card>
    </Busy>
  );
}

/** A form page (register, sign up). */
export function FormSkeleton({ label = 'Loading' }: { label?: string }) {
  return (
    <Busy label={label}>
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent className="grid gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="grid gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
          <Skeleton className="h-9 w-28" />
        </CardContent>
      </Card>
    </Busy>
  );
}
