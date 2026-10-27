import { formatIST, type Schemas } from '@eventkit/sdk';
import {
  useEventKit,
  useEventMutation,
  useEventQuery,
  useMyNotifications,
  useNotifications,
  usePortalMutation,
} from '@eventkit/sdk/react';
import { BellOffIcon, BellRingIcon, InfoIcon, SendIcon } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { ErrorText } from '@/components/ErrorText';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
        <Card
          key={n.id}
          className={cn('gap-3', n.priority === 'urgent' && 'border-l-4 border-l-destructive')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {n.title} {n.priority === 'urgent' && <Badge variant="destructive">Urgent</Badge>}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {n.channel.name} · {n.sender.name} · {formatIST(n.sentAt)}
            </p>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed whitespace-pre-line">
            {n.body}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
