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
import { ClockIcon, LinkIcon, WifiOffIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { ConfirmButton } from '@/components/ConfirmButton';
import { ErrorText } from '@/components/ErrorText';
import { ErrorPage } from '@/components/ErrorPage';
import { PaymentInstructions } from '@/components/PaymentInstructions';
import { ListSkeleton, MeSkeleton } from '@/components/Skeletons';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
      {data.isLeader ? <LeaderTeam /> : <TeamSummary />}
      <Registration me={data} />
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
        {me.rsvpEnabled && me.status === 'confirmed' && (
          <Button
            size="lg"
            className="w-full sm:w-fit"
            onClick={() => rsvp.mutate(undefined)}
            disabled={rsvp.isPending}
          >
            I will attend
          </Button>
        )}
        {me.rsvpEnabled && me.status === 'attending' && (
          <Button
            variant="outline"
            className="w-full sm:w-fit"
            onClick={() => unrsvp.mutate(undefined)}
            disabled={unrsvp.isPending}
          >
            I can't attend after all
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

/** The leader's view: contacts, link activity, payment, new links. */
function LeaderTeam() {
  const team = useMyTeam();
  const [emailed, setEmailed] = useState<string | null>(null);
  const reissue = usePortalMutation((portal, id: string) => portal.me.team.reissueMemberLink(id));
  const pay = usePortalMutation((portal, file: File) => portal.me.team.payReceipt(file));
  if (team.isPending) return <ListSkeleton label="Loading your team" />;
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
              {!m.isLeader && (
                <ConfirmButton
                  size="sm"
                  variant="outline"
                  title={`Make a new link for ${m.name}?`}
                  description="Their old link stops working. The new link is emailed to them; you won't see it."
                  confirm="Make new link"
                  disabled={reissue.isPending}
                  onConfirm={() => {
                    setEmailed(null);
                    reissue.mutate(m.registrationId, {
                      onSuccess: () => setEmailed(m.name),
                    });
                  }}
                >
                  New link
                </ConfirmButton>
              )}
            </li>
          ))}
        </ul>
        {emailed && (
          <p role="status" className="text-sm text-success">
            New link emailed to {emailed}
          </p>
        )}
        <ErrorText
          error={reissue.error}
          message={
            hasCode(reissue.error, 'MAILING_OFF')
              ? 'Email is off for this event; ask an organiser to send a new link'
              : hasCode(reissue.error, 'MAIL_FAILED')
                ? 'The email could not be sent. Try again in a moment, or ask an organiser.'
                : undefined
          }
        />

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
          Type the email you registered with to confirm.
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
            aria-label="Email to confirm"
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
