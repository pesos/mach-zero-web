import type { Schemas } from '@eventkit/sdk';
import { useMyNotifications, useNotifications, usePortalInfo } from '@eventkit/sdk/react';
import { BellIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUnread } from '@/lib/notifications';
import { useWho } from '@/lib/staff';

/** The bell in the header: the unread count, and a toast for what arrives while you are here. */
export function NotificationBell() {
  const who = useWho();
  if (who.kind === 'participant') return <ParticipantBell />;
  if (who.kind) return <StaffBell />;
  return null;
}

function ParticipantBell() {
  const feed = useMyNotifications();
  return <Bell items={feed.data} />;
}

function StaffBell() {
  const feed = useNotifications();
  return <Bell items={feed.data} />;
}

function Bell({ items }: { items: Schemas['Notification'][] | undefined }) {
  const { paths } = usePortalInfo().data!;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const open = () => void navigate(paths.notifications);
  const unread = useUnread(items, pathname === paths.notifications, (fresh) => {
    for (const n of fresh) {
      const show = n.priority === 'urgent' ? toast.error : toast;
      show(n.title, {
        description: n.body,
        action: { label: 'View', onClick: open },
      });
    }
  });
  return (
    <Button
      variant="outline"
      size="icon"
      className="relative bg-card/80"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      onClick={open}
    >
      <BellIcon />
      {unread > 0 && (
        <span
          data-testid="unread-count"
          className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[0.65rem] leading-5 font-semibold text-white"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Button>
  );
}
