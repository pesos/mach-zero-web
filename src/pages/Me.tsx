import {
  formatIST,
  formatMoney,
  isEventKitError,
  type Schemas,
  teamDisplayStatus,
} from '@eventkit/sdk';
import {
  useMe,
  useMyTeam,
  usePortalInfo,
  usePortalMutation,
  useSecretLink,
} from '@eventkit/sdk/react';
import {
  CalendarCheckIcon,
  CircleCheckIcon,
  ClockIcon,
  HourglassIcon,
  LinkIcon,
  WifiOffIcon,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AddMemberPrompt } from '@/components/AddMember';
import { ConfirmButton } from '@/components/ConfirmButton';
import { ErrorText } from '@/components/ErrorText';
import { ErrorPage } from '@/components/ErrorPage';
import { PaymentInstructions } from '@/components/PaymentInstructions';
import { ListSkeleton, MeSkeleton } from '@/components/Skeletons';
import { StatusBadge } from '@/components/StatusBadge';
import { UpdatesGroup } from '@/components/UpdatesGroup';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { hasCode } from '@/lib/eventkit';
import { cn } from '@/lib/utils';

type Me = Schemas['Me'];

/** A participant's page, opened through their personal link. */
export function Me() {
  const { paths } = usePortalInfo().data!;
  const link = useSecretLink(paths);
  const me = useMe();
  if (link.status === 'error') {
    const err = link.error;
    if (isEventKitError(err, 'LINK_NOT_FOUND')) {
      return (
        <ErrorPage
          icon={LinkIcon}
          title="This link does not work any more"
          action={{ label: 'Go home', to: '/' }}
        >
          It was replaced with a new one. Use your newest link, or ask your team leader or the
          organisers for one.
        </ErrorPage>
      );
    }
    if (isEventKitError(err, 'ACCESS_EXPIRED')) {
      return (
        <ErrorPage icon={ClockIcon} title="Access has ended" action={{ label: 'Go home', to: '/' }}>
          Access for this event has ended.
        </ErrorPage>
      );
    }
    return (
      <ErrorPage
        icon={WifiOffIcon}
        title="Could not open your link"
        action={{ label: 'Try again', onClick: () => window.location.reload() }}
      >
        Check your connection and try again.
      </ErrorPage>
    );
  }
  if (link.status === 'opening' || me.isPending) return <MeSkeleton />;
  if (me.isError) return <ErrorText error={me.error} />;
  const data = me.data;
  return (
    <>
      <StagesNotice me={data} />
      <RsvpCard me={data} />
      {data.status !== 'cancelled' && <UpdatesGroup />}
      {data.isLeader ? <LeaderTeam /> : <TeamSummary />}
      {data.isLeader && <AddMemberPrompt />}
      <Registration me={data} />
      <AssignmentSummary />
    </>
  );
}

/**
 * Before anything is decided: results come out in stages, so participants know
 * to come back rather than wait for a message.
 */
function StagesNotice({ me }: { me: Me }) {
  if (me.status !== 'registered' && me.status !== 'shortlisted') return null;
  return (
    <Alert role="status">
      <HourglassIcon />
      <AlertTitle>
        {me.status === 'shortlisted' ? 'Your team is shortlisted.' : 'Your registration is in.'}
      </AlertTitle>
      <AlertDescription>
        Shortlists and confirmations are released in stages — keep checking this portal for updates.
      </AlertDescription>
    </Alert>
  );
}

/** RSVP, first thing on the page: confirmed people say whether they're coming. */
function RsvpCard({ me }: { me: Me }) {
  const rsvp = usePortalMutation((portal) => portal.me.rsvp());
  const unrsvp = usePortalMutation((portal) => portal.me.unrsvp());
  if (!me.rsvpEnabled || (me.status !== 'confirmed' && me.status !== 'attending')) return null;
  const attending = me.status === 'attending';
  return (
    <Card className={attending ? 'border-success/40' : 'border-primary'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {attending ? (
            <>
              <CircleCheckIcon className="size-5 text-success" aria-hidden /> You&apos;re attending
            </>
          ) : (
            <>
              <CalendarCheckIcon className="size-5" aria-hidden /> Your place is confirmed: will you
              attend?
            </>
          )}
        </CardTitle>
        <CardDescription>
          {attending
            ? 'Thanks for confirming. Show your QR code at the entry.'
            : 'Let the organisers know you are coming. You need to RSVP to get in.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {attending ? (
          <ConfirmButton
            variant="outline"
            className="w-full sm:w-fit"
            title="Withdraw your RSVP?"
            description="The organisers will count you as not coming. You can RSVP again later while your place is confirmed."
            confirm="I can't attend"
            cancel="Keep my RSVP"
            disabled={unrsvp.isPending}
            onConfirm={() => unrsvp.mutate(undefined)}
          >
            I can&apos;t attend after all
          </ConfirmButton>
        ) : (
          <Button
            size="lg"
            className="w-full sm:w-fit"
            onClick={() => rsvp.mutate(undefined)}
            disabled={rsvp.isPending}
          >
            I will attend
          </Button>
        )}
        <ErrorText
          error={rsvp.error ?? unrsvp.error}
          message={
            hasCode(rsvp.error ?? unrsvp.error, 'RSVP_DISABLED')
              ? 'RSVPs are off for this event. You can just turn up.'
              : undefined
          }
        />
      </CardContent>
    </Card>
  );
}

function Registration({ me }: { me: Me }) {
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
      </CardContent>
    </Card>
  );
}

/** One line per released assignment (table, mentor, problem statement…); details are on their own tab. */
function AssignmentSummary() {
  const team = useMyTeam();
  const list = team.data?.assignments ?? [];
  if (list.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your team&apos;s assignments</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <dl className="grid gap-1.5 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
          {list.map((a) => (
            <div key={a.listId} className="contents">
              <dt className="text-muted-foreground">{a.listName}</dt>
              <dd className="font-medium">{a.option?.title ?? a.text}</dd>
            </div>
          ))}
        </dl>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link to="/assignments">See details</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function TeamSummary() {
  const team = useMyTeam();
  if (team.isPending) return <ListSkeleton label="Loading your team" />;
  if (!team.data) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          Team {team.data.name} <StatusBadge status={teamDisplayStatus(team.data)} />
        </CardTitle>
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

/** The leader's view: contacts, link activity and payment. Organisers make new links. */
function LeaderTeam() {
  const team = useMyTeam();
  const { event, registrationOpen } = usePortalInfo().data!;
  const pay = usePortalMutation((portal, file: File) => portal.me.team.payReceipt(file));
  const remove = usePortalMutation((portal, id: string) => portal.me.team.removeMember(id));
  if (team.isPending) return <ListSkeleton label="Loading your team" />;
  if (team.isError) return <ErrorText error={team.error} />;
  const t = team.data;
  const status = teamDisplayStatus(t);
  const latest = t.payment.proofs[0]?.status;
  // Until registration closes, the leader can remove a teammate, never below the minimum.
  const active = t.members.filter((m) => m.status !== 'cancelled').length;
  const canRemove = registrationOpen && t.status !== 'cancelled' && active > event.minTeamSize;
  const paid = t.payment.proofs.some((p) => p.status === 'approved');
  // After paying: another receipt for members added since (per-person fee).
  const topUp = paid && t.payment.unpaid.length > 0 && t.status !== 'cancelled';
  const canPay =
    (topUp && latest !== 'pending') ||
    (t.payment.mode !== 'none' &&
      (t.status === 'registered' || t.status === 'shortlisted') &&
      latest !== 'pending' &&
      latest !== 'approved' &&
      (t.payment.mode === 'at_registration' || t.status === 'shortlisted'));

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
                <p className="text-xs wrap-anywhere text-muted-foreground">
                  {[
                    m.email,
                    m.phone,
                    m.linkLastUsedAt
                      ? `link last opened ${formatIST(m.linkLastUsedAt)}`
                      : 'link never opened',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              {canRemove &&
                !m.isLeader &&
                m.status !== 'cancelled' &&
                m.status !== 'checked_in' && (
                  <ConfirmButton
                    size="sm"
                    variant="outline"
                    title={`Remove ${m.name} from the team?`}
                    description="Their registration is cancelled and their link stops working. Payments aren't refunded automatically; an organiser can bring them back."
                    confirm="Remove"
                    disabled={remove.isPending}
                    onConfirm={() => remove.mutate(m.registrationId)}
                  >
                    Remove
                  </ConfirmButton>
                )}
            </li>
          ))}
        </ul>
        <ErrorText error={remove.error} />
        <p className="text-xs text-muted-foreground">
          A teammate lost their link, or it leaked? Ask the organisers: they send you a new one to
          pass on.
        </p>

        {t.payment.mode !== 'none' && (
          <>
            <Separator />
            <div className="grid gap-3 text-sm">
              <h3 className="font-semibold">Payment</h3>
              {topUp ? (
                <p>
                  {formatMoney(t.payment.amountDue ?? 0, t.payment.currency)} more for{' '}
                  {t.payment.unpaid.map((u) => u.name).join(', ')}, who joined after you paid.
                </p>
              ) : (
                t.payment.amountDue !== null && (
                  <p>
                    {formatMoney(t.payment.amountDue, t.payment.currency)} for the team
                    {t.payment.deadline && `, by ${formatIST(t.payment.deadline)}`}.
                  </p>
                )
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
                        : topUp
                          ? 'Upload the receipt for the new members'
                          : 'Upload the payment receipt'}
                    </Label>
                    <Input
                      id="pay-receipt"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
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
      </CardContent>
    </Card>
  );
}
