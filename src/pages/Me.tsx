import {
  formatIST,
  formatMoney,
  isEventKitError,
  type Schemas,
  teamDisplayStatus,
} from '@eventkit/sdk';
import {
  useEventKit,
  useMe,
  useMyPolls,
  useMyTeam,
  usePortalInfo,
  usePortalMutation,
  useSecretLink,
} from '@eventkit/sdk/react';
import { useQuery } from '@tanstack/react-query';
import { BellRingIcon, CircleAlertIcon, KeyRoundIcon, LinkIcon, TrophyIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { ConfirmButton } from '@/components/ConfirmButton';
import { CopyButton } from '@/components/CopyButton';
import { ErrorText } from '@/components/ErrorText';
import { Loading } from '@/components/Loading';
import { PaymentInstructions } from '@/components/PaymentInstructions';
import { StatusBadge } from '@/components/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type Me = Schemas['Me'];
type Link = { token: string; url: string | null };

/** A participant's page, opened through their personal link. */
export function Me() {
  const { paths } = usePortalInfo().data!;
  const link = useSecretLink(paths);
  const me = useMe();
  if (link.status === 'error') {
    const err = link.error;
    return (
      <Alert variant="destructive" className="border-destructive/40">
        <CircleAlertIcon />
        <AlertDescription>
          {isEventKitError(err, 'LINK_NOT_FOUND')
            ? 'This link does not work any more: it was replaced with a new one. Use your newest link, or ask your team leader or the organisers for one.'
            : isEventKitError(err, 'ACCESS_EXPIRED')
              ? 'Access for this event has ended.'
              : 'Could not open your link. Check your connection and try again.'}
        </AlertDescription>
      </Alert>
    );
  }
  if (link.status === 'opening' || me.isPending) {
    return <Loading>Opening your registration…</Loading>;
  }
  if (me.isError) return <ErrorText error={me.error} />;
  const data = me.data;
  return (
    <>
      <Registration me={data} />
      {data.isLeader && <LeaderTeam />}
      {!data.isLeader && <TeamSummary />}
      <Polls />
      <Leaderboard />
      <LinkSafety me={data} />
      {data.status !== 'cancelled' && data.status !== 'checked_in' && <CancelCard me={data} />}
    </>
  );
}

function Registration({ me }: { me: Me }) {
  const rsvp = usePortalMutation((portal) => portal.me.rsvp());
  const unrsvp = usePortalMutation((portal) => portal.me.unrsvp());
  const showQr =
    me.status === 'confirmed' || me.status === 'attending' || me.status === 'checked_in';
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-2xl">
          {me.name} <StatusBadge status={me.status} />
        </CardTitle>
        <CardDescription>
          Team {me.team.name} · Participant ID{' '}
          <span className="font-mono font-semibold text-foreground">{me.participantCode}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {showQr ? (
          <div className="grid justify-items-center gap-3 rounded-xl bg-muted/60 p-5 text-center sm:grid-cols-[auto_1fr] sm:justify-items-start sm:text-left">
            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <QRCodeSVG value={me.qrToken} size={200} title="Your check-in QR code" />
            </div>
            <p className="max-w-xs self-center text-sm text-muted-foreground">
              Show this at the entry and at checkpoints. If the camera can't read it, give your
              participant ID.
            </p>
          </div>
        ) : (
          <p className="rounded-xl bg-muted/60 p-5 text-sm text-muted-foreground">
            {me.status === 'cancelled'
              ? 'This registration is cancelled.'
              : 'Your QR code appears here once your team is confirmed.'}
          </p>
        )}
        {me.status === 'confirmed' && (
          <Button
            size="lg"
            className="w-full sm:w-fit"
            onClick={() => rsvp.mutate(undefined)}
            disabled={rsvp.isPending}
          >
            I will attend
          </Button>
        )}
        {me.status === 'attending' && (
          <Button
            variant="outline"
            className="w-full sm:w-fit"
            onClick={() => unrsvp.mutate(undefined)}
            disabled={unrsvp.isPending}
          >
            I can't attend after all
          </Button>
        )}
        <ErrorText error={rsvp.error ?? unrsvp.error} />
      </CardContent>
    </Card>
  );
}

function TeamSummary() {
  const team = useMyTeam();
  if (!team.data) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your team</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid divide-y">
          {team.data.members.map((m) => (
            <li key={m.registrationId} className="flex items-center gap-3 py-2 text-sm">
              <Initial name={m.name} />
              <span className="font-medium">{m.name}</span>
              {m.isLeader && <Badge variant="secondary">Leader</Badge>}
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {m.participantCode}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Initial({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/** The leader's view: contacts, link activity, payment, new links, hand over. */
function LeaderTeam() {
  const team = useMyTeam();
  const [issued, setIssued] = useState<(Link & { name: string }) | null>(null);
  const reissue = usePortalMutation((portal, id: string) => portal.me.team.reissueMemberLink(id));
  const pay = usePortalMutation((portal, file: File) => portal.me.team.payReceipt(file));
  const [to, setTo] = useState('');
  const [confirm, setConfirm] = useState('');
  const handOver = usePortalMutation((portal, v: { to: string; confirm: string }) =>
    portal.me.team.handOver(v.to, v.confirm),
  );
  if (team.isPending) return null;
  if (team.isError) return <ErrorText error={team.error} />;
  const t = team.data;
  const status = teamDisplayStatus(t);
  const latest = t.payment.proofs[0]?.status;
  const canPay =
    t.payment.mode !== 'none' &&
    (t.status === 'registered' || t.status === 'shortlisted') &&
    latest !== 'pending' &&
    latest !== 'approved' &&
    (t.payment.mode === 'at_registration' || t.status === 'shortlisted');
  const others = t.members.filter((m) => !m.isLeader && m.status !== 'cancelled');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          Team {t.name} <StatusBadge status={status} />
        </CardTitle>
        <CardDescription>You lead this team.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <ul className="grid divide-y">
          {t.members.map((m) => (
            <li key={m.registrationId} className="flex items-center gap-3 py-3 first:pt-0">
              <Initial name={m.name} />
              <div className="grid min-w-0 flex-1 gap-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{m.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {m.participantCode}
                  </span>
                  <StatusBadge status={m.status} />
                </div>
                <p className="text-xs break-words text-muted-foreground">
                  {`${m.email} · ${m.phone} · ${
                    m.linkLastUsedAt
                      ? `link last opened ${formatIST(m.linkLastUsedAt)}`
                      : 'link never opened'
                  }`}
                </p>
              </div>
              {!m.isLeader && (
                <ConfirmButton
                  size="sm"
                  variant="outline"
                  title={`Give ${m.name} a new link?`}
                  description="Their current personal link stops working straight away."
                  confirm="Give new link"
                  onConfirm={() =>
                    reissue.mutate(m.registrationId, {
                      onSuccess: (link) => setIssued({ name: m.name, ...link }),
                    })
                  }
                >
                  New link
                </ConfirmButton>
              )}
            </li>
          ))}
        </ul>
        {issued && (
          <NewLink title={`New link for ${issued.name}: send it to them.`} link={issued} />
        )}
        <ErrorText error={reissue.error} />

        {t.payment.mode !== 'none' && (
          <>
            <Separator />
            <div className="grid gap-3 text-sm">
              <h3 className="font-semibold">Payment</h3>
              {t.payment.amountDue !== null && (
                <p>
                  {formatMoney(t.payment.amountDue, t.payment.currency)} for the team
                  {t.payment.deadline && `, by ${formatIST(t.payment.deadline)}`}.
                </p>
              )}
              {t.payment.proofs.length > 0 && (
                <ul className="grid gap-1 text-muted-foreground">
                  {t.payment.proofs.map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      <span
                        className={cn(
                          'size-2 shrink-0 rounded-full',
                          p.status === 'approved'
                            ? 'bg-success'
                            : p.status === 'rejected'
                              ? 'bg-destructive'
                              : 'bg-amber-500',
                        )}
                      />
                      <span>
                        Receipt {formatIST(p.uploadedAt)}: {p.status}
                        {p.rejectionNote && ` (${p.rejectionNote})`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {canPay && (
                <>
                  <PaymentInstructions />
                  <div className="grid gap-2">
                    <Label htmlFor="pay-receipt">
                      {latest === 'rejected'
                        ? 'Upload a new receipt'
                        : 'Upload the payment receipt'}
                    </Label>
                    <Input
                      id="pay-receipt"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) pay.mutate(file);
                        e.target.value = '';
                      }}
                    />
                  </div>
                  {pay.isSuccess && (
                    <p role="status" className="text-success">
                      Receipt sent for review.
                    </p>
                  )}
                </>
              )}
              <ErrorText error={pay.error} />
            </div>
          </>
        )}

        {others.length > 0 && (
          <>
            <Separator />
            <form
              className="grid gap-3 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                handOver.mutate({ to, confirm });
              }}
            >
              <div className="grid gap-1">
                <h3 className="font-semibold">Hand the team to someone else</h3>
                <p className="text-muted-foreground">
                  The new leader manages the team from their own link.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <NativeSelect
                  aria-label="New leader"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                >
                  <NativeSelectOption value="">Choose a member…</NativeSelectOption>
                  {others.map((m) => (
                    <NativeSelectOption key={m.registrationId} value={m.registrationId}>
                      {m.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Input
                  aria-label="Your email or phone, to confirm"
                  placeholder="Your email or phone"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <ErrorText error={handOver.error} />
              <Button type="submit" variant="outline" className="w-fit" disabled={!to || !confirm}>
                Hand over
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NewLink({ title, link }: { title: string; link: Link }) {
  const text = link.url ?? link.token;
  return (
    <Alert className="border-primary/30 bg-secondary/60">
      <LinkIcon />
      <AlertDescription className="text-foreground">
        <p className="font-medium">{title}</p>
        <p className="w-full rounded-md bg-card px-3 py-2 font-mono text-xs break-all">{text}</p>
        <CopyButton text={text} label="Copy link" />
      </AlertDescription>
    </Alert>
  );
}

function Polls() {
  const polls = useMyPolls();
  const vote = usePortalMutation((portal, v: { poll: string; option: string }) =>
    portal.me.polls.vote(v.poll, v.option),
  );
  if (!polls.data || polls.data.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Polls</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        {polls.data.map((p) => (
          <div key={p.id} className="grid gap-3 text-sm">
            <p id={`${p.id}-question`} className="font-medium">
              {p.question}
              {p.closed ? ' (closed)' : p.closesAt ? ` · closes ${formatIST(p.closesAt)}` : ''}
            </p>
            <RadioGroup
              aria-labelledby={`${p.id}-question`}
              value={p.myVote ?? ''}
              disabled={!p.canVote || vote.isPending}
              onValueChange={(option) => vote.mutate({ poll: p.id, option })}
              className="gap-2"
            >
              {p.options.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-3 rounded-lg border bg-background/60 px-3 py-2.5 has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-secondary/60"
                >
                  <RadioGroupItem id={`${p.id}-${o.id}`} value={o.id} />
                  <Label htmlFor={`${p.id}-${o.id}`} className="flex-1 font-normal">
                    {o.label}
                  </Label>
                  {p.totalVotes !== null && (
                    <span className="text-muted-foreground tabular-nums">· {o.votes}</span>
                  )}
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
        <ErrorText error={vote.error} />
      </CardContent>
    </Card>
  );
}

function Leaderboard() {
  const ek = useEventKit();
  const { event } = usePortalInfo().data!;
  const board = useQuery({
    queryKey: ['eventkit', 'portal', 'leaderboard'],
    queryFn: () => ek.portal.me.leaderboard(),
    enabled: event.leaderboardVisible,
  });
  if (!board.data || board.data.entries.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrophyIcon className="size-4 text-primary" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol aria-label="Leaderboard" className="grid divide-y">
          {board.data.entries.map((e) => (
            <li key={e.team.id} className="flex items-center gap-3 py-2 text-sm">
              <span
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold',
                  e.rank === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                {e.rank}
              </span>
              <span className="font-medium">{e.team.name}</span>
              <span className="ml-auto text-muted-foreground tabular-nums">
                {e.total} / {e.maxTotal}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

/** When the link was last used, how long it lasts, and replacing it if it leaked. */
function LinkSafety({ me }: { me: Me }) {
  const ek = useEventKit();
  const reset = usePortalMutation((portal) => portal.me.resetLink());
  const push = usePortalMutation(() => ek.portal.me.push.enable());
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRoundIcon className="size-4 text-primary" />
          Your personal link
        </CardTitle>
        <CardDescription>
          Anyone with your link can see this page. It works until {formatIST(me.accessEndsAt)}.
          {me.linkLastUsedAt && ` Last opened ${formatIST(me.linkLastUsedAt)}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <ConfirmButton
            variant="outline"
            title="Replace your link?"
            description="The old link stops working on every device. Your new one appears here."
            confirm="Replace link"
            cancel="Keep my link"
            onConfirm={() => reset.mutate(undefined)}
          >
            My link leaked: give me a new one
          </ConfirmButton>
          {ek.portal.me.push.isSupported() && (
            <Button variant="outline" onClick={() => push.mutate(undefined)}>
              <BellRingIcon />
              {push.isSuccess ? 'Urgent alerts on' : 'Get urgent alerts on this device'}
            </Button>
          )}
        </div>
        {reset.data && (
          <NewLink title="Your new link. Save it: the old one no longer works." link={reset.data} />
        )}
        <ErrorText error={reset.error ?? push.error} />
      </CardContent>
    </Card>
  );
}

function CancelCard({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const cancel = usePortalMutation((portal, c: string) => portal.me.cancel(c));
  if (!open) {
    return (
      <div className="flex justify-center">
        <Button
          variant="ghost"
          className="bg-card/80 text-muted-foreground backdrop-blur-md hover:text-destructive"
          onClick={() => setOpen(true)}
        >
          {me.isLeader ? 'Cancel the team’s registration' : 'Cancel my registration'}
        </Button>
      </div>
    );
  }
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base text-destructive">Cancel registration</CardTitle>
        <CardDescription>
          {me.isLeader
            ? 'You lead the team: this cancels everyone who has not checked in.'
            : 'This cancels only your registration.'}{' '}
          Type the email or phone number you registered with to confirm.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            cancel.mutate(confirm);
          }}
        >
          <Input
            aria-label="Email or phone to confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <ErrorText error={cancel.error} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="destructive" disabled={!confirm || cancel.isPending}>
              Cancel registration
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Keep it
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
