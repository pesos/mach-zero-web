import { formatIST, type Schemas } from '@eventkit/sdk';
import {
  useEventKit,
  useEventMutation,
  useEventQuery,
  useMyNotifications,
  useNotifications,
  usePortalMutation,
} from '@eventkit/sdk/react';
import {
  BellOffIcon,
  BellPlusIcon,
  BellRingIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  HashIcon,
  InfoIcon,
  SendIcon,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { ErrorText } from '@/components/ErrorText';
import { CardsSkeleton } from '@/components/Skeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const DISMISSED = 'notifications.pushBanner.dismissed';

/** Offers push alerts for urgent notifications until enabled or dismissed (remembered on this device). */
function PushBanner({
  on,
  pending,
  error,
  onEnable,
}: {
  on: boolean;
  pending: boolean;
  error: unknown;
  onEnable: () => void;
}) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED) === '1';
    } catch {
      return false;
    }
  });
  if (dismissed) return null;
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED, '1');
    } catch {
      // Private mode: it comes back next visit.
    }
  };
  return (
    <Card className="py-4" aria-label="Urgent alerts" role="region">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-primary/30 bg-secondary text-primary">
          <BellPlusIcon className="size-6" aria-hidden />
        </span>
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold">Get urgent alerts on this device</p>
            <Badge
              variant="outline"
              className="rounded-md border-primary/40 bg-primary/10 font-mono tracking-wider text-primary uppercase"
            >
              Recommended
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            A push alert as soon as the organisers send something urgent, even with the portal
            closed.
          </p>
          <ErrorText error={error} />
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          <Button variant="ghost" onClick={dismiss}>
            {on ? 'Close' : 'Dismiss'}
          </Button>
          <Button onClick={onEnable} disabled={on || pending}>
            {on ? <CheckIcon /> : <BellRingIcon />}
            {on ? 'Alerts on' : 'Enable alerts'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ParticipantFeed() {
  const feed = useMyNotifications();
  const push = usePortalMutation((portal) => portal.me.push.enable());
  const ek = useEventKit();
  return (
    <>
      {ek.portal.me.push.isSupported() && (
        <PushBanner
          on={push.isSuccess}
          pending={push.isPending}
          error={push.error}
          onEnable={() => push.mutate(undefined)}
        />
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
        <PushBanner
          on={push.isSuccess}
          pending={push.isPending}
          error={push.error}
          onEnable={() => push.mutate(undefined)}
        />
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
  const [view, setView] = useState<'all' | 'urgent' | 'channel'>('all');
  const [channelId, setChannelId] = useState<string>();
  if (!items && !error) return <CardsSkeleton label="Loading notifications" />;
  const urgent = items?.filter((n) => n.priority === 'urgent') ?? [];
  const channels = new Map<string, { name: string; count: number }>();
  for (const n of items ?? []) {
    const c = channels.get(n.channel.id);
    channels.set(n.channel.id, { name: n.channel.name, count: (c?.count ?? 0) + 1 });
  }
  const picked = view === 'channel' && channelId ? channels.get(channelId) : undefined;
  return (
    <section aria-label="Notifications" className="grid gap-3">
      <ErrorText error={error} />
      <Tabs value={view} onValueChange={(v) => setView(v as 'all' | 'urgent')} className="gap-4">
        <div className="flex flex-wrap items-center gap-1 border-b pb-3">
          <TabsList className="h-auto gap-1 bg-transparent p-0">
            <TabsTrigger value="all" className={tabClass}>
              All
              <Badge variant="secondary" className="rounded-md px-1.5 tabular-nums">
                {items?.length ?? 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="urgent" className={tabClass}>
              Urgent
            </TabsTrigger>
          </TabsList>
          {/* Not a tab: it asks which channel first, then shows that channel. */}
          {/* Not modal: a modal menu locks scrolling, hiding the scrollbar and shifting the page. */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                data-state={view === 'channel' ? 'active' : 'inactive'}
                className={cn(
                  'h-auto rounded-lg border border-transparent px-4 py-2 font-medium text-muted-foreground',
                  'data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-primary',
                )}
              >
                {picked ? (
                  <>
                    <HashIcon />
                    {picked.name}
                  </>
                ) : (
                  'Channels'
                )}
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-48">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Show a channel
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {channels.size === 0 ? (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">No channels yet.</p>
              ) : (
                <DropdownMenuRadioGroup
                  value={view === 'channel' ? channelId : undefined}
                  onValueChange={(id) => {
                    setChannelId(id);
                    setView('channel');
                  }}
                >
                  {[...channels].map(([id, c]) => (
                    <DropdownMenuRadioItem key={id} value={id}>
                      <HashIcon className="text-muted-foreground" />
                      {c.name}
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        {c.count}
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <TabsContent value="all" className="grid gap-3">
          <CardList items={items} empty="No notifications yet." />
        </TabsContent>
        <TabsContent value="urgent" className="grid gap-3">
          <CardList items={items && urgent} empty="No urgent notifications." />
        </TabsContent>
        <TabsContent value="channel" className="grid gap-3">
          <CardList
            items={items?.filter((n) => n.channel.id === channelId)}
            empty="Nothing in this channel yet."
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

const tabClass =
  'flex-none rounded-lg px-4 py-2 data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-primary';

function CardList({
  items,
  empty,
}: {
  items: Schemas['Notification'][] | undefined;
  empty: string;
}) {
  if (items?.length === 0)
    return (
      <div className="grid justify-items-center gap-2 rounded-xl border border-dashed bg-card/70 p-8 text-center">
        <BellOffIcon className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">{empty}</p>
      </div>
    );
  return items?.map((n) => <NotificationCard key={n.id} n={n} />);
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
