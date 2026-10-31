import { usePortalInfo } from '@eventkit/sdk/react';
import { ShieldCheckIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { CardsSkeleton } from '@/components/Skeletons';
import { Button } from '@/components/ui/button';
import { useTeamConfirmed } from '@/lib/confirmed';
import { basePath } from '@/lib/paths';

/** Shows `children` once the participant's team is confirmed, and says why not before. */
export function ConfirmedOnly({ what, children }: { what: string; children: ReactNode }) {
  const { confirmed, loading } = useTeamConfirmed();
  const { paths } = usePortalInfo().data!;
  if (loading) return <CardsSkeleton />;
  if (confirmed) return children;
  return (
    <div className="grid justify-items-center gap-2 rounded-xl border border-dashed bg-card/70 p-8 text-center">
      <ShieldCheckIcon className="size-6 text-muted-foreground" aria-hidden />
      <h2 className="font-semibold">{what} open once your team is confirmed</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        The organisers confirm your place after reviewing your registration, and your payment if
        there is a fee.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link to={basePath(paths.me)}>See where your registration stands</Link>
      </Button>
    </div>
  );
}
