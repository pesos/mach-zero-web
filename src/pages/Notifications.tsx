import { formatIST, type Schemas } from '@eventkit/sdk';
import {
  useEventKit,
  useEventMutation,
  useEventQuery,
  useMyNotifications,
  useNotifications,
  usePortalMutation,
} from '@eventkit/sdk/react';
import { BellOffIcon, BellRingIcon, ClockIcon, HashIcon, InfoIcon, SendIcon } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { ErrorText } from '@/components/ErrorText';
import { CardsSkeleton } from '@/components/Skeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { useWho } from '@/lib/staff';
import { cn } from '@/lib/utils';

/** The notification feed: a participant's (through their link) or staff's, who can also send. */
export function Notifications() {
  const who = useWho();
  if (who.kind === 'participant') return <ParticipantFeed />;
  if (who.kind) return <StaffFeed />;
  return (
    <Alert>
      <InfoIcon />
      <AlertDescription className="block text-foreground">
        Open your personal link to see notifications.
      </AlertDescription>
    </Alert>
  );
}

function PushButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <Button variant="outline" className="w-fit bg-card/80" onClick={onClick}>
      <BellRingIcon />
      {on ? 'Urgent alerts on' : 'Get urgent alerts on this device'}
    </Button>
  );
}

function ParticipantFeed() {
  const feed = useMyNotifications();
  const push = usePortalMutation((portal) => portal.me.push.enable());
  const ek = useEventKit();
  return (
    <>
      {ek.portal.me.push.isSupported() && (
        <div className="grid gap-2">
          <PushButton on={push.isSuccess} onClick={() => push.mutate(undefined)} />
          <ErrorText error={push.error} />
        </div>
      )}
      <Feed items={feed.data} error={feed.error} />
    </>
  );
}

function StaffFeed() {
  const ek = useEventKit();
  const feed = useNotifications();
  const channels = useEventQuery('channels', (e) => e.channels.list());
  const push = useEventMutation(() => ek.push.enable());
  const sendable = (channels.data ?? []).filter((c) => c.canSend);
  return (
    <>
      {ek.push.isSupported() && (
        <div className="grid gap-2">
          <PushButton on={push.isSuccess} onClick={() => push.mutate(undefined)} />
          <ErrorText error={push.error} />
        </div>
      )}
      {sendable.length > 0 && <SendForm channels={sendable} />}
      <Feed items={feed.data} error={feed.error ?? channels.error} />
    </>
  );
}

function SendForm({ channels }: { channels: Schemas['Channel'][] }) {
  const [channelId, setChannelId] = useState(channels[0]!.id);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [urgent, setUrgent] = useState(false);
  const send = useEventMutation((e) =>
    e.channels.send(channelId, { title, body, priority: urgent ? 'urgent' : 'normal' }),
  );
  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    send.mutate(undefined, {
      onSuccess: () => {
        setTitle('');
        setBody('');
        setUrgent(false);
      },
    });
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Send a notification</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="channel">Channel</Label>
              <NativeSelect
                id="channel"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
              >
                {channels.map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} required />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="urgent" checked={urgent} onCheckedChange={(v) => setUrgent(v === true)} />
            <Label htmlFor="urgent" className="font-normal">
              Urgent (push to phones)
            </Label>
          </div>
          <ErrorText error={send.error} />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={send.isPending}>
              <SendIcon />
              Send
            </Button>
            {send.isSuccess && (
              <p role="status" className="text-sm text-success">
                Sent.
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Feed({ items, error }: { items: Schemas['Notification'][] | undefined; error: unknown }) {
  if (!items && !error) return <CardsSkeleton label="Loading notifications" />;
  return (
    <section aria-label="Notifications" className="grid gap-3">
      <ErrorText error={error} />
      {items?.length === 0 && (
        <div className="grid justify-items-center gap-2 rounded-xl border border-dashed bg-card/70 p-8 text-center">
          <BellOffIcon className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      )}
      {items?.map((n) => (
        <NotificationCard key={n.id} n={n} />
      ))}
    </section>
  );
}

/** Channel and sender as pills, when it was sent, then the message, with an accent bar on the left. */
function NotificationCard({ n }: { n: Schemas['Notification'] }) {
  const urgent = n.priority === 'urgent';
  return (
    <Card className="relative gap-3 overflow-hidden py-5 pl-1">
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          urgent ? 'bg-destructive' : 'bg-gradient-to-b from-primary to-lavender/40',
        )}
      />
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-full border-primary/50 bg-primary/15 px-3 py-1 text-sm text-primary"
          >
            <HashIcon aria-hidden />
            {n.channel.name}
          </Badge>
          <span aria-hidden className="size-1.5 rounded-full bg-muted-foreground/50" />
          <Badge variant="secondary" className="gap-2 rounded-full py-1 pr-3 pl-1 text-sm">
            <Avatar className="size-6">
              <AvatarFallback className="bg-lavender text-xs font-semibold text-primary-foreground">
                {n.sender.name.trim().charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {n.sender.name}
          </Badge>
          {urgent && <Badge variant="destructive">Urgent</Badge>}
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ClockIcon className="size-4" aria-hidden />
          <time dateTime={n.sentAt}>{formatIST(n.sentAt)}</time>
          <span className="text-muted-foreground/60">({timeAgo(n.sentAt)})</span>
        </p>
        <CardTitle className="text-lg leading-snug">{n.title}</CardTitle>
      </CardHeader>
      <CardContent className="leading-relaxed whitespace-pre-line text-foreground/75">
        {n.body}
      </CardContent>
    </Card>
  );
}

/** How long ago, e.g. "just now", "2m ago", "3h ago", "5d ago". */
function timeAgo(at: string, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - Date.parse(at)) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86_400)}d ago`;
}
