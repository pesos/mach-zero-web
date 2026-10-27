import {
  amountDue,
  checkRegistration,
  type Draft,
  formatIST,
  formatMoney,
  memberFields,
  teamFields,
  toAnswers,
} from '@eventkit/sdk';
import { useEventKit, usePortalInfo, usePortalMutation } from '@eventkit/sdk/react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { type FormEvent, useState } from 'react';
import { useParams } from 'react-router';
import { CopyButton } from '@/components/CopyButton';
import { ErrorText } from '@/components/ErrorText';
import { FieldInputs } from '@/components/FieldInputs';
import { Alert } from '@/components/ui/alert';
import { PaymentInstructions } from '@/components/PaymentInstructions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Member = { name: string; email: string; phone: string; answers: Draft };
const blank = (): Member => ({ name: '', email: '', phone: '', answers: {} });
const CONTACT = [
  ['name', 'Name', 'text', 'name'],
  ['email', 'Email', 'email', 'email'],
  ['phone', 'Phone', 'tel', 'tel'],
] as const;

/** The team leader registers the whole team at once through the registration link. */
export function Register() {
  const { token = '' } = useParams();
  const ek = useEventKit();
  const link = useQuery({
    queryKey: ['eventkit', 'portal', 'link', token],
    queryFn: () => ek.portal.previewLink(token),
  });
  const info = usePortalInfo().data!;
  const register = usePortalMutation((portal, input: Parameters<typeof portal.register>[0]) =>
    portal.register(input),
  );

  if (register.data) return <Registered result={register.data} />;
  if (link.isPending) return <p className="text-muted-foreground">Checking the link…</p>;
  if (link.isError) return <ErrorText error={link.error} />;
  if (link.data.kind !== 'registration') {
    return <ErrorText error={new Error('This is not a registration link.')} />;
  }
  if (!info.registrationOpen) {
    return (
      <Alert>
        Registration is not open. It runs {formatIST(info.event.registrationStart)} –{' '}
        {formatIST(info.event.registrationDeadline)}.
      </Alert>
    );
  }
  return (
    <TeamForm
      submitting={register.isPending}
      error={register.error}
      onSubmit={(input) => register.mutate({ linkToken: token, ...input })}
    />
  );
}

function TeamForm(props: {
  submitting: boolean;
  error: unknown;
  onSubmit: (
    input: Omit<Parameters<ReturnType<typeof useEventKit>['portal']['register']>[0], 'linkToken'>,
  ) => void;
}) {
  const { event, fields, teamRules } = usePortalInfo().data!;
  const [name, setName] = useState('');
  const [teamAnswers, setTeamAnswers] = useState<Draft>({});
  const [members, setMembers] = useState<Member[]>(() =>
    Array.from({ length: Math.max(1, event.minTeamSize) }, blank),
  );
  const [receipt, setReceipt] = useState<File | null>(null);
  const check = checkRegistration(
    { team: { name, answers: teamAnswers }, members },
    event,
    fields,
    teamRules,
  );
  const paysNow = event.paymentMode === 'at_registration' && event.registrationFee !== null;
  const set = (i: number, patch: Partial<Member>) =>
    setMembers(members.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    props.onSubmit({
      team: { name: name.trim(), answers: toAnswers(teamFields(fields), teamAnswers) },
      members: members.map((m) => ({
        name: m.name.trim(),
        email: m.email.trim(),
        phone: m.phone.trim(),
        answers: toAnswers(memberFields(fields), m.answers),
      })),
      ...(receipt ? { receipt } : {}),
    });
  };

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>Register your team</CardTitle>
          <CardDescription>
            The team leader fills this in for everyone ({event.minTeamSize}–{event.maxTeamSize}{' '}
            members). Each member then gets a participant ID, a QR code and a personal link.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="team-name">Team name</Label>
            <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <FieldInputs
            prefix="team"
            fields={teamFields(fields)}
            value={teamAnswers}
            onChange={setTeamAnswers}
          />
          {teamRules.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {teamRules.map((r) => (
                <li key={r.id}>{r.description}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {members.map((m, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {i === 0 ? 'You (team leader)' : `Member ${i + 1}`}
            </CardTitle>
            {i > 0 && members.length > event.minTeamSize && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setMembers(members.filter((_, j) => j !== i))}
              >
                Remove
              </Button>
            )}
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {CONTACT.map(([key, label, type, autoComplete]) => (
              <div key={key} className="grid gap-1">
                <Label htmlFor={`m${i}-${key}`}>{label}</Label>
                <Input
                  id={`m${i}-${key}`}
                  type={type}
                  autoComplete={i === 0 ? autoComplete : 'off'}
                  value={m[key]}
                  onChange={(e) => set(i, { [key]: e.target.value })}
                />
              </div>
            ))}
            <FieldInputs
              prefix={`m${i}`}
              fields={memberFields(fields)}
              value={m.answers}
              onChange={(answers) => set(i, { answers })}
            />
          </CardContent>
        </Card>
      ))}
      {members.length < event.maxTeamSize && (
        <div>
          <Button type="button" variant="outline" onClick={() => setMembers([...members, blank()])}>
            Add a member
          </Button>
        </div>
      )}

      {paysNow && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Pay {formatMoney(amountDue(event, members.length), event.currency)}
              {event.feeBasis === 'per_team' ? ' for the team' : ''}
            </CardTitle>
            <CardDescription>
              Pay as shown below, then upload the receipt (a screenshot or PDF).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <PaymentInstructions />
            <Label htmlFor="receipt">Payment receipt</Label>
            <input
              id="receipt"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
            />
          </CardContent>
        </Card>
      )}

      {check.reasons.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-muted-foreground" aria-label="Still needed">
          {check.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
          {paysNow && !receipt && <li>Upload the payment receipt.</li>}
        </ul>
      )}
      <ErrorText error={props.error} />
      <div>
        <Button type="submit" disabled={!check.ok || (paysNow && !receipt) || props.submitting}>
          {props.submitting ? 'Registering…' : 'Register team'}
        </Button>
      </div>
    </form>
  );
}

type Result = Awaited<ReturnType<ReturnType<typeof useEventKit>['portal']['register']>>;

/** Shown once: every member's ID, QR code and personal link. */
function Registered({ result }: { result: Result }) {
  return (
    <div className="grid gap-4">
      <Alert>
        <strong>{result.team.name} is registered.</strong> Save this page now (screenshot or copy
        the links): the personal links are shown only once. Send each member their own link; it lets
        them check their status, RSVP and vote.
      </Alert>
      {result.members.map((m) => (
        <Card key={m.registrationId}>
          <CardHeader>
            <CardTitle className="text-base">
              {m.name} {m.isLeader && <span className="text-sm font-normal">(leader)</span>}
            </CardTitle>
            <CardDescription>
              Participant ID <span className="font-mono font-semibold">{m.participantCode}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-start gap-4">
            <QRCodeSVG value={m.qrToken} size={128} title={`${m.name}'s check-in QR code`} />
            <div className="grid min-w-0 flex-1 gap-2 text-sm">
              <div>Personal link:</div>
              <div className="break-all font-mono text-xs">{m.link.url ?? m.link.token}</div>
              <div>
                <CopyButton text={m.link.url ?? m.link.token} label="Copy link" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
