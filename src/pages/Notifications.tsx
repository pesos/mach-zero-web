import { formatIST, type Schemas } from '@eventkit/sdk';
import {
  useEventMutation,
  useEventQuery,
  useMyNotifications,
  useNotifications,
  useSession,
} from '@eventkit/sdk/react';
import { BellOffIcon, ClockIcon, HashIcon, InfoIcon, SendIcon, Trash2Icon } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { ConfirmButton } from '@/components/ConfirmButton';
import { ErrorText } from '@/components/ErrorText';
import { FeedTabs, groupCounts } from '@/components/FeedTabs';
import { Markdown } from '@/components/Markdown';
import { MarkdownTextarea } from '@/components/MarkdownTextarea';
import { SearchInput } from '@/components/SearchInput';
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
import { useListFilter } from '@/hooks/useListFilter';
import { useWho } from '@/lib/staff';
import { cn } from '@/lib/utils';
import { ConfirmedOnly } from '@/components/ConfirmedOnly';

/** The notification feed: a participant's (through their link) or staff's, who can also send. */
export function Notifications() {
  const who = useWho();
  if (who.kind === 'participant')
    return (
      <ConfirmedOnly what="Notifications">
        <ParticipantFeed />
      </ConfirmedOnly>
    );
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

function ParticipantFeed() {
  const feed = useMyNotifications();
  return <Feed items={feed.data} error={feed.error} />;
}

function StaffFeed() {
  const feed = useNotifications();
  const channels = useEventQuery('channels', (e) => e.channels.list());
  const sendable = (channels.data ?? []).filter((c) => c.canSend);
  return (
    <>
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
              <Input
                id="title"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="body">Message</Label>
            <MarkdownTextarea
              id="body"
              maxLength={2000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
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
  const all = items ?? [];
  return (
    <section aria-label="Notifications" className="grid gap-3">
      <ErrorText error={error} />
      <FeedTabs
        total={all.length}
        filter="Urgent"
        groups={{
          label: 'Channels',
          menuLabel: 'Show a channel',
          icon: HashIcon,
          items: groupCounts(all, (n) => n.channel),
        }}
      >
        {(view) =>
          view.kind === 'all' ? (
            <CardList items={items} empty="No notifications yet." />
          ) : view.kind === 'filter' ? (
            <CardList
              items={items && all.filter((n) => n.priority === 'urgent')}
              empty="No urgent notifications."
            />
          ) : (
            <CardList
              items={all.filter((n) => n.channel.id === view.id)}
              empty="Nothing in this channel yet."
            />
          )
        }
      </FeedTabs>
    </section>
  );
}

const noteText = (n: Schemas['Notification']) => [n.title, n.body, n.sender.name, n.channel.name];

function CardList({
  items,
  empty,
}: {
  items: Schemas['Notification'][] | undefined;
  empty: string;
}) {
  const search = useListFilter(items ?? [], noteText);
  if (items?.length === 0)
    return (
      <div className="grid justify-items-center gap-2 rounded-xl border border-dashed bg-card/70 p-8 text-center">
        <BellOffIcon className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">{empty}</p>
      </div>
    );
  return (
    <>
      {items && items.length > 1 && (
        <SearchInput label="Search notifications" value={search.query} onChange={search.setQuery} />
      )}
      {search.active && search.filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">No notification matches.</p>
      )}
      {search.filtered.map((n) => (
        <NotificationCard key={n.id} n={n} />
      ))}
    </>
  );
}

/** Admins delete any notification; a volunteer only one they sent. For everyone. */
function DeleteNotification({ n }: { n: Schemas['Notification'] }) {
  const who = useWho();
  const { who: session } = useSession();
  const remove = useEventMutation((e) => e.channels.removeNotification(n.channel.id, n.id));
  const allowed = who.role === 'admin' || (who.role === 'volunteer' && session?.id === n.sender.id);
  if (!allowed) return null;
  return (
    <>
      <ConfirmButton
        size="icon-sm"
        variant="ghost"
        aria-label={`Delete "${n.title}"`}
        title="Delete this notification?"
        description={
          n.priority === 'urgent'
            ? 'It disappears from everyone’s feed. The push already sent to phones can’t be taken back.'
            : 'It disappears from everyone’s feed.'
        }
        confirm="Delete"
        disabled={remove.isPending}
        onConfirm={() => remove.mutate()}
      >
        <Trash2Icon aria-hidden />
      </ConfirmButton>
      <ErrorText error={remove.error} />
    </>
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
          <span className="ml-auto">
            <DeleteNotification n={n} />
          </span>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ClockIcon className="size-4" aria-hidden />
          <time dateTime={n.sentAt}>{formatIST(n.sentAt)}</time>
          <span className="text-muted-foreground/60">({timeAgo(n.sentAt)})</span>
        </p>
        <CardTitle className="text-lg leading-snug wrap-anywhere">{n.title}</CardTitle>
      </CardHeader>
      <CardContent className="leading-relaxed wrap-anywhere text-foreground/75">
        <Markdown>{n.body}</Markdown>
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
