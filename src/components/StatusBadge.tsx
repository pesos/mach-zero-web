import type { DisplayStatus } from '@eventkit/sdk';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const LABEL: Record<DisplayStatus, string> = {
  registered: 'Registered',
  shortlisted: 'Shortlisted',
  confirmed: 'Confirmed',
  attending: 'Attending',
  checked_in: 'Checked in',
  cancelled: 'Cancelled',
  confirmation_pending: 'Confirmation pending',
};
const TONE: Partial<Record<DisplayStatus, string>> = {
  registered: 'bg-violet-100 text-violet-900 dark:bg-violet-900/60 dark:text-violet-100',
  confirmed: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100',
  attending: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100',
  checked_in: 'bg-success text-white',
  cancelled: 'bg-red-100 text-red-900 dark:bg-red-900/60 dark:text-red-100',
  shortlisted: 'bg-sky-100 text-sky-900 dark:bg-sky-900/60 dark:text-sky-100',
  confirmation_pending: 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100',
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <Badge variant="secondary" className={cn('font-sans', TONE[status])}>
      {LABEL[status]}
    </Badge>
  );
}
