import { formatIST, type Schemas } from '@eventkit/sdk';
import {
  useEventKit,
  useEventMutation,
  useEventQuery,
  useMyNotifications,
  useNotifications,
  usePortalMutation,
} from '@eventkit/sdk/react';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { ErrorText } from '@/components/ErrorText';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useWho } from '@/lib/staff';

/** The notification feed: a participant's (through their link) or staff's, who can also send. */
export function Notifications() {
  const who = useWho();
  if (who.kind === 'participant') return <ParticipantFeed />;
  if (who.kind) return <StaffFeed />;
  return (
    <Alert>
      Open your personal link to see notifications, or{' '}
      <Link className="underline" to="/login">
        sign in
      </Link>{' '}
      if you are staff.
    </Alert>
  );
}

function ParticipantFeed() {
  const feed = useMyNotifications();
  const push = usePortalMutation((portal) => portal.me.push.enable());
  const ek = useEventKit();
  return (
    <>
      {ek.portal.me.push.isSupported() && (
        <div>
          <Button variant="outline" onClick={() => push.mutate(undefined)}>
            {push.isSuccess ? 'Urgent alerts on' : 'Get urgent alerts on this device'}
          </Button>
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
        <div>
          <Button variant="outline" onClick={() => push.mutate(undefined)}>
            {push.isSuccess ? 'Urgent alerts on' : 'Get urgent alerts on this device'}
          </Button>
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
        <form className="grid gap-2" onSubmit={submit}>
          <Label htmlFor="channel">Channel</Label>
          <Select id="channel" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Label htmlFor="body">Message</Label>
          <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} required />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
            Urgent (push to phones)
          </label>
          <ErrorText error={send.error} />
          {send.isSuccess && <p role="status">Sent.</p>}
          <div>
            <Button type="submit" disabled={send.isPending}>
              Send
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Feed({ items, error }: { items: Schemas['Notification'][] | undefined; error: unknown }) {
  return (
    <section aria-label="Notifications" className="grid gap-2">
      <ErrorText error={error} />
      {items?.length === 0 && <p className="text-muted-foreground">No notifications yet.</p>}
      {items?.map((n) => (
        <Card key={n.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {n.title} {n.priority === 'urgent' && <Badge>Urgent</Badge>}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {n.channel.name} · {n.sender.name} · {formatIST(n.sentAt)}
            </p>
          </CardHeader>
          <CardContent className="whitespace-pre-line text-sm">{n.body}</CardContent>
        </Card>
      ))}
    </section>
  );
}
