import { formatIST, type Schemas } from '@eventkit/sdk';
import { useMe, useMyTeam, usePortalMutation } from '@eventkit/sdk/react';
import { InfoIcon, KeyRoundIcon, UserRoundXIcon, UsersRoundIcon } from 'lucide-react';
import { useState } from 'react';
import { ErrorText } from '@/components/ErrorText';
import { CardSkeleton } from '@/components/Skeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { useWho } from '@/lib/staff';

/** A participant's settings: handing over the team, their personal link, and cancelling. */
export function Settings() {
  const who = useWho();
  if (who.kind === 'participant') return <ParticipantSettings />;
  return (
    <Alert>
      <InfoIcon />
      <AlertDescription className="block text-foreground">
        Open your personal link to see your settings.
      </AlertDescription>
    </Alert>
  );
}

function ParticipantSettings() {
  const me = useMe();
  if (me.isPending) return <CardSkeleton label="Loading your settings" />;
  if (me.isError) return <ErrorText error={me.error} />;
  return (
    <>
      {me.data.isLeader && <HandOver />}
      <LinkSafety me={me.data} />
      {me.data.status !== 'cancelled' && me.data.status !== 'checked_in' && (
        <CancelCard me={me.data} />
      )}
    </>
  );
}

function HandOver() {
  const team = useMyTeam();
  const [to, setTo] = useState('');
  const [confirm, setConfirm] = useState('');
  const handOver = usePortalMutation((portal, v: { to: string; confirm: string }) =>
    portal.me.team.handOver(v.to, v.confirm),
  );
  if (team.isPending) return <CardSkeleton label="Loading your team" />;
  if (team.isError) return <ErrorText error={team.error} />;
  const others = team.data.members.filter((m) => !m.isLeader && m.status !== 'cancelled');
  if (others.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UsersRoundIcon className="size-4 text-primary" />
          Hand over team
        </CardTitle>
        <CardDescription>
          Hand the team to someone else. The new leader manages the team from their own link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            handOver.mutate({ to, confirm });
          }}
        >
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
              aria-label="Your email, to confirm"
              placeholder="Your email"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <ErrorText error={handOver.error} />
          <Button type="submit" variant="outline" className="w-fit" disabled={!to || !confirm}>
            Hand over
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** When the link was last used, how long it lasts, and replacing it if it leaked. */
function LinkSafety({ me }: { me: Schemas['Me'] }) {
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
      <CardContent className="text-sm text-muted-foreground">
        Lost it, or think someone else has it? Ask the organisers for a new one: the old link then
        stops working.
      </CardContent>
    </Card>
  );
}

/** Cancelling: the leader's cancels the whole team, a member's only their own. */
function CancelCard({ me }: { me: Schemas['Me'] }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const cancel = usePortalMutation((portal, c: string) => portal.me.cancel(c));
  const label = me.isLeader ? 'Cancel the team’s registration' : 'Cancel my registration';
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <UserRoundXIcon className="size-4" />
          Cancel registration
        </CardTitle>
        <CardDescription>
          {me.isLeader
            ? 'You lead the team: this cancels everyone who has not checked in.'
            : 'This cancels only your registration.'}
          {open && ' Type the email you registered with to confirm.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {open ? (
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
        ) : (
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setOpen(true)}
          >
            {label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
