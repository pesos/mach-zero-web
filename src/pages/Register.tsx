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
import {
  CalendarClockIcon,
  CircleCheckIcon,
  LoaderCircleIcon,
  MailIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useParams } from 'react-router';
import { CopyButton } from '@/components/CopyButton';
import { ErrorText } from '@/components/ErrorText';
import { FieldInputs } from '@/components/FieldInputs';
import { Loading } from '@/components/Loading';
import { PaymentInstructions } from '@/components/PaymentInstructions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Member = { name: string; email: string; answers: Draft };
const blank = (): Member => ({ name: '', email: '', answers: {} });
const CONTACT = [
  ['name', 'Name', 'text', 'name'],
  ['email', 'Email', 'email', 'email'],
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
  if (link.isPending) return <Loading>Checking the link…</Loading>;
  if (link.isError) return <ErrorText error={link.error} />;
  if (link.data.kind !== 'registration') {
    return <ErrorText error={new Error('This is not a registration link.')} />;
  }
  if (!info.registrationOpen) {
    return (
      <Alert>
        <CalendarClockIcon />
        <AlertDescription className="block text-foreground">
          Registration is not open. It runs {formatIST(info.event.registrationStart)} –{' '}
          {formatIST(info.event.registrationDeadline)}.
        </AlertDescription>
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
        answers: toAnswers(memberFields(fields), m.answers),
      })),
      ...(receipt ? { receipt } : {}),
    });
  };

  return (
    <form className="grid gap-6" onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl font-normal tracking-wide">
            Register your team
          </CardTitle>
          <CardDescription>
            The team leader fills this in for everyone ({event.minTeamSize}–{event.maxTeamSize}{' '}
            members). Each member then gets a participant ID, a QR code and a personal link.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
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
            <ul className="list-disc rounded-lg bg-muted/60 py-3 pr-4 pl-8 text-sm text-muted-foreground sm:col-span-2">
              {teamRules.map((r) => (
                <li key={r.id}>{r.description}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {members.map((m, i) => (
        <Card key={i}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-base">
              <span
                aria-hidden
                className="grid size-7 place-items-center rounded-full bg-secondary text-xs text-secondary-foreground"
              >
                {i + 1}
              </span>
              {i === 0 ? 'You (team leader)' : `Member ${i + 1}`}
            </CardTitle>
            {i > 0 && members.length > event.minTeamSize && (
              <CardAction>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setMembers(members.filter((_, j) => j !== i))}
                >
                  <Trash2Icon />
                  Remove
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {CONTACT.map(([key, label, type, autoComplete]) => (
              <div
                key={key}
                className={
                  key === 'name'
                    ? 'grid content-start gap-2 sm:col-span-2'
                    : 'grid content-start gap-2'
                }
              >
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
        <Button
          type="button"
          variant="outline"
          className="h-12 border-dashed bg-card/60"
          onClick={() => setMembers([...members, blank()])}
        >
          <PlusIcon />
          Add a member
        </Button>
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
          <CardContent className="grid gap-4">
            <PaymentInstructions />
            <div className="grid gap-2">
              <Label htmlFor="receipt">Payment receipt</Label>
              <Input
                id="receipt"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 rounded-xl border bg-card p-6">
        {check.reasons.length > 0 && (
          <div className="grid gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-100">
            <p className="font-semibold">Before you can register</p>
            <ul className="grid list-disc gap-1 pl-5" aria-label="Still needed">
              {check.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
              {paysNow && !receipt && <li>Upload the payment receipt.</li>}
            </ul>
          </div>
        )}
        <ErrorText error={props.error} />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            // While sending, stay at full colour with a spinner and a sweep rather than greying out.
            className={
              props.submitting
                ? 'relative w-full cursor-wait overflow-hidden disabled:opacity-100 sm:w-auto'
                : 'w-full sm:w-auto'
            }
            disabled={!check.ok || (paysNow && !receipt) || props.submitting}
            aria-busy={props.submitting}
          >
            {props.submitting && (
              <span
                aria-hidden
                className="absolute inset-0 animate-shimmer bg-linear-to-r from-transparent via-white/30 to-transparent motion-reduce:hidden"
              />
            )}
            {props.submitting ? (
              <>
                <LoaderCircleIcon className="animate-spin motion-reduce:animate-none" />
                Registering…
              </>
            ) : (
              'Register team'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

type Result = Awaited<ReturnType<ReturnType<typeof useEventKit>['portal']['register']>>;

/**
 * Shown once: every member's ID and personal link. QR codes wait for the team
 * to be confirmed, on each member's own page.
 */
function Registered({ result }: { result: Result }) {
  const leader = result.members.find((m) => m.isLeader);
  return (
    <div className="grid gap-6">
      {leader && (
        <Alert className="border-primary bg-primary/15 [&>svg]:size-5">
          <MailIcon className="text-primary" />
          <AlertTitle className="text-base">Check the team leader's inbox</AlertTitle>
          <AlertDescription className="text-foreground">
            <p>
              We've emailed everyone's participant ID and personal link to{' '}
              <span className="font-semibold break-all">{leader.email}</span>.
            </p>
            <p className="font-medium">
              Not there in a few minutes? Check the spam or promotions folder.
            </p>
          </AlertDescription>
        </Alert>
      )}
      <Alert className="border-success/40">
        <CircleCheckIcon className="text-success" />
        <AlertTitle>{result.team.name} is registered.</AlertTitle>
        <AlertDescription>
          Save this page now (screenshot or copy the links): the personal links are shown only once.
          Send each member their own link; it lets them check their status, RSVP and vote. Their
          check-in QR code appears there once the team is confirmed.
        </AlertDescription>
      </Alert>
      {result.members.map((m) => (
        <Card key={m.registrationId}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {m.name} {m.isLeader && <Badge variant="secondary">Leader</Badge>}
            </CardTitle>
            <CardDescription>
              Participant ID{' '}
              <span className="font-mono font-semibold text-foreground">{m.participantCode}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid min-w-0 gap-2 text-sm">
              <p className="text-muted-foreground">Personal link</p>
              <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs break-all">
                {m.link.url ?? m.link.token}
              </p>
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
