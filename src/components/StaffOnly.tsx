import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Alert } from '@/components/ui/alert';
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
  if (who.loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!who.kind || who.kind === 'participant') {
    return (
      <Alert>
        This page is for the event's staff.{' '}
        <Link className="underline" to="/login">
          Sign in
        </Link>
      </Alert>
    );
  }
  if (allowed === 'scan' ? !who.canScan : !who.canJudge) {
    return <Alert>Your role can't use this page.</Alert>;
  }
  return children;
}
