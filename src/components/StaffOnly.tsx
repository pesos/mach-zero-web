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
  allowed: 'scan' | 'judge';
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
  if (allowed === 'scan' ? !who.canScan : !who.canJudge) {
    return (
      <Alert>
        <LockIcon />
        <AlertDescription className="text-foreground">
          Your role can't use this page.
        </AlertDescription>
      </Alert>
    );
  }
  return children;
}
