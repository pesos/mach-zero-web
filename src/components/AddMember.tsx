import { type Draft, formatMoney, memberFields, missingRequired, toAnswers } from '@eventkit/sdk';
import { useMyTeam, usePortalInfo, usePortalMutation } from '@eventkit/sdk/react';
import { UserPlusIcon } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { ErrorText } from '@/components/ErrorText';
import { FieldInputs } from '@/components/FieldInputs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * The leader adds a teammate they forgot, while registration is open and the
 * team has room. Their link is emailed to the leader to pass on.
 */
export function AddMember() {
  const { event, fields, registrationOpen } = usePortalInfo().data!;
  const team = useMyTeam();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState<Draft>({});
  const questions = memberFields(fields);
  const add = usePortalMutation(
    (portal, v: { name: string; email: string; answers: ReturnType<typeof toAnswers> }) =>
      portal.me.team.addMember(v),
  );
  const t = team.data;
  if (!t || !registrationOpen || t.status === 'cancelled') return null;
  const active = t.members.filter((m) => m.status !== 'cancelled').length;
  if (active >= event.maxTeamSize && !add.data) return null;
  const paid = t.payment.proofs.some((p) => p.status === 'approved');
  const extra =
    paid && event.paymentMode !== 'none' && event.feeBasis === 'per_person' && event.registrationFee
      ? formatMoney(event.registrationFee, event.currency)
      : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    add.mutate(
      { name: name.trim(), email: email.trim(), answers: toAnswers(questions, answers) },
      {
        onSuccess: () => {
          setName('');
          setEmail('');
          setAnswers({});
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlusIcon className="size-4 text-primary" />
          Add a member
        </CardTitle>
        <CardDescription>
          Forgot someone? Add them until registration closes (up to {event.maxTeamSize} people).
          {extra &&
            ` Your team has paid, so ${extra} more is due for them: upload another receipt after adding.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {add.data && (
          <p role="status" className="mb-4 text-sm text-success">
            {add.data.name} joined your team.{' '}
            {add.data.emailedTo
              ? `Their link was emailed to you (${add.data.emailedTo}): send it to them.`
              : 'Ask the organisers for their link.'}
          </p>
        )}
        {active < event.maxTeamSize && (
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
        )}
      </CardContent>
    </Card>
  );
}
