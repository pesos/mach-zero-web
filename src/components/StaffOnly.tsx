import { LockIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { CardSkeleton } from '@/components/Skeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { STAFF_LOGIN } from '@/lib/paths';
import { useWho } from '@/lib/staff';

/** Shows the page to staff who may use it; others are told where to go. */
export function StaffOnly({
  allowed,
  children,
}: {
  /** judge: scores teams; review: reads submissions (admins and judges). */
  allowed: 'scan' | 'judge' | 'review';
  children: ReactNode;
}) {
  const who = useWho();
  if (who.loading) return <CardSkeleton />;
  if (!who.kind || who.kind === 'participant') {
    return (
      <Alert>
        <LockIcon />
        <AlertDescription className="block text-foreground">
          This page is for the event's staff.{' '}
          <Link className="font-medium text-primary underline underline-offset-4" to={STAFF_LOGIN}>
            Sign in
          </Link>
        </AlertDescription>
      </Alert>
    );
  }
  const can = allowed === 'scan' ? who.canScan : allowed === 'judge' ? who.canJudge : who.canReview;
  if (!can) {
    return (
      <Alert>
        <LockIcon />
        <AlertDescription className="text-foreground">
          {allowed === 'judge' && who.role === 'admin'
            ? 'Admins score teams once judging is turned on for them in the console (People).'
            : "Your role can't use this page."}
        </AlertDescription>
      </Alert>
    );
  }
  return children;
}
