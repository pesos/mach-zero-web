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
  confirmed: 'bg-emerald-100 text-emerald-900',
  attending: 'bg-emerald-100 text-emerald-900',
  checked_in: 'bg-success text-white',
  cancelled: 'bg-red-100 text-red-900',
  shortlisted: 'bg-sky-100 text-sky-900',
  confirmation_pending: 'bg-amber-100 text-amber-900',
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <Badge variant="secondary" className={cn('font-sans', TONE[status])}>
      {LABEL[status]}
    </Badge>
  );
}
