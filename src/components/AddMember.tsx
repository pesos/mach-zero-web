import { type Draft, formatMoney, memberFields, missingRequired, toAnswers } from '@eventkit/sdk';
import { useMe, useMyTeam, usePortalInfo, usePortalMutation } from '@eventkit/sdk/react';
import { ArrowLeftIcon, InfoIcon, UserPlusIcon } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { ErrorText } from '@/components/ErrorText';
import { FieldInputs } from '@/components/FieldInputs';
import { CardSkeleton } from '@/components/Skeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { basePath } from '@/lib/paths';
import { useWho } from '@/lib/staff';

/** Where the leader adds a forgotten teammate. */
export const ADD_MEMBER_PATH = '/team/add';

/** Whether the leader can add someone now: registration open, team live and not full. */
function useCanAdd() {
  const { event, registrationOpen } = usePortalInfo().data!;
  const team = useMyTeam();
  const t = team.data;
  const active = t?.members.filter((m) => m.status !== 'cancelled').length ?? 0;
  return {
    team,
    canAdd: !!t && registrationOpen && t.status !== 'cancelled' && active < event.maxTeamSize,
  };
}

/** On My registration: a short prompt that opens the add-a-member page. */
export function AddMemberPrompt() {
  const { canAdd } = useCanAdd();
  if (!canAdd) return null;
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">Forgot to add a team member?</span>
        <Button asChild variant="outline" size="sm">
          <Link to={ADD_MEMBER_PATH}>
            <UserPlusIcon /> Add team member
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/** The add-a-member page: for the team leader, while registration is open. */
export function AddMemberPage() {
  const who = useWho();
  const me = useMe();
  if (who.kind !== 'participant') {
    return <Notice>Open your personal link to add a member to your team.</Notice>;
  }
  if (me.isPending) return <CardSkeleton label="Loading your team" />;
  if (me.isError) return <ErrorText error={me.error} />;
  if (!me.data.isLeader) return <Notice>Only your team leader can add a member.</Notice>;
  return <AddMemberForm />;
}

function Notice({ children }: { children: string }) {
  return (
    <Alert>
      <InfoIcon />
      <AlertDescription className="block text-foreground">{children}</AlertDescription>
    </Alert>
  );
}

function AddMemberForm() {
  const { event, fields, paths } = usePortalInfo().data!;
  const { team, canAdd } = useCanAdd();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState<Draft>({});
  const questions = memberFields(fields);
  const add = usePortalMutation(
    (portal, v: { name: string; email: string; answers: ReturnType<typeof toAnswers> }) =>
      portal.me.team.addMember(v),
  );
  const back = (
    <Button asChild variant="ghost" size="sm" className="w-fit">
      <Link to={basePath(paths.me)}>
        <ArrowLeftIcon /> My registration
      </Link>
    </Button>
  );
  if (team.isPending) return <CardSkeleton label="Loading your team" />;
  if (team.isError) return <ErrorText error={team.error} />;
  const paid = team.data.payment.proofs.some((p) => p.status === 'approved');
  const extra =
    paid && event.paymentMode !== 'none' && event.feeBasis === 'per_person' && event.registrationFee
      ? formatMoney(event.registrationFee, event.currency)
      : null;

  if (add.data) {
    return (
      <div className="grid gap-4">
        {back}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{add.data.name} joined your team</CardTitle>
            <CardDescription>
              {add.data.emailedTo
                ? `Their link was emailed to you (${add.data.emailedTo}): send it to them.`
                : 'Ask the organisers for their link.'}
              {extra && ` Then upload a receipt for ${extra} on My registration.`}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  if (!canAdd) {
    return (
      <div className="grid gap-4">
        {back}
        <Notice>
          {`You can't add anyone now: registration has closed, or your team is full (${event.maxTeamSize} people).`}
        </Notice>
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    add.mutate({ name: name.trim(), email: email.trim(), answers: toAnswers(questions, answers) });
  };

  return (
    <div className="grid gap-4">
      {back}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlusIcon className="size-4 text-primary" />
            Add a team member
          </CardTitle>
          <CardDescription>
            Their personal link is emailed to you to pass on. Teams have up to {event.maxTeamSize}{' '}
            people.
            {extra &&
              ` Your team has paid, so ${extra} more is due for them: upload another receipt after adding.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="add-name">Name</Label>
              <Input id="add-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <FieldInputs fields={questions} value={answers} onChange={setAnswers} prefix="add" />
            <ErrorText error={add.error} />
            <Button
              type="submit"
              className="w-fit"
              disabled={
                !name.trim() ||
                !email.trim() ||
                missingRequired(questions, answers).length > 0 ||
                add.isPending
              }
            >
              Add member
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
