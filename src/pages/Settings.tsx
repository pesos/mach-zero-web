import { formatIST, type Schemas } from '@eventkit/sdk';
import { useEventKit, useMe, useMyTeam, usePortalMutation } from '@eventkit/sdk/react';
import { BellRingIcon, InfoIcon, KeyRoundIcon, UsersRoundIcon } from 'lucide-react';
import { useState } from 'react';
import { ConfirmButton } from '@/components/ConfirmButton';
import { ErrorText } from '@/components/ErrorText';
import { NewLink } from '@/components/NewLink';
import { CardSkeleton } from '@/components/Skeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { useWho } from '@/lib/staff';

/** A participant's settings: handing over the team, and their personal link. */
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
