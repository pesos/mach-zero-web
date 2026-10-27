import { describeFee, formatIST } from '@eventkit/sdk';
import { usePortalInfo } from '@eventkit/sdk/react';
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExternalLinkIcon,
  type LucideIcon,
  MapPinIcon,
  UsersIcon,
} from 'lucide-react';
import { Fragment, type ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  about,
  dailyHours,
  goodToKnow,
  highlights,
  registerUrl,
  schedule,
  type Slot,
  tagline,
} from '@/content/event';
import { basePath } from '@/lib/paths';
import { useWho } from '@/lib/staff';
import { cn } from '@/lib/utils';

const sectionTitle = 'font-display text-xl font-normal tracking-wide';

export function Home() {
  const { event, registrationOpen, paths } = usePortalInfo().data!;
  const who = useWho();
  const days = istDays(event.startAt, event.endAt);
  const fee = describeFee(event);
  return (
    <>
      <section className="grid justify-items-center gap-5 py-4 text-center sm:py-8">
        <Badge variant="outline" className="bg-card/70 font-display tracking-[0.2em] uppercase">
          {/* "PESOS X Silicon" reads as PESOS x SILICON PRESENTS: capitals, a small x between. */}
          <span>
            {event.hostedBy.split(/\s+x\s+/i).map((host, i) => (
              <Fragment key={host}>
                {i > 0 && <span className="normal-case"> x </span>}
                {host}
              </Fragment>
            ))}{' '}
            presents
          </span>
        </Badge>
        <h2>
          <img
            src="/wordmark.webp"
            alt={event.name}
            width={2000}
            height={499}
            className="h-auto w-full max-w-xl drop-shadow-lg"
          />
        </h2>
        <p className="max-w-md text-lg text-balance text-foreground/80">{tagline}</p>
        <RegistrationBadge open={registrationOpen} deadline={event.registrationDeadline} />
        {registrationOpen && <RegisterButton />}
      </section>

      <ul className="grid gap-3 sm:grid-cols-2">
        <Fact icon={CalendarDaysIcon} label="When">
          {days.join(' & ')}
        </Fact>
        <Fact icon={ClockIcon} label="Hours">
          {dailyHours}
        </Fact>
        <Fact icon={MapPinIcon} label="Where">
          {event.venue}
        </Fact>
        <Fact icon={UsersIcon} label="Teams">
          Teams of {event.minTeamSize}–{event.maxTeamSize}
          {fee && ` · ${fee}`}
          {' · '}
          {event.placesLeft} places left
        </Fact>
      </ul>

      <Card className={cn(registrationOpen && 'border-primary/30')}>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-2">
            <p className="text-sm leading-relaxed">
              {registrationOpen
                ? `Registration is open until ${formatIST(event.registrationDeadline)}. Your team leader registers everyone at once.`
                : `Registration is not open. It runs ${formatIST(event.registrationStart)} – ${formatIST(event.registrationDeadline)}.`}
            </p>
          </div>
          {registrationOpen && !who.kind && <RegisterButton />}
          {who.kind === 'participant' && (
            <Button asChild size="lg" className="shrink-0">
              <Link to={basePath(paths.me)}>
                Open your registration
                <ArrowRightIcon />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className={sectionTitle}>About</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm leading-relaxed text-foreground/85">
          {about.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </CardContent>
      </Card>

      <ul aria-label="At a glance" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {highlights.map((h) => (
          <li key={h.label} className="rounded-xl border bg-card/85 p-4 backdrop-blur-md">
            <p className="font-display text-xl text-primary">{h.value}</p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">{h.label}</p>
          </li>
        ))}
      </ul>

      <Card>
        <CardHeader>
          <CardTitle className={sectionTitle}>Schedule</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-8 sm:grid-cols-2">
          {schedule.map((slots, i) => (
            <section key={i} aria-label={`Day ${i + 1}`}>
              <h3 className="mb-4 font-display text-sm tracking-wide text-lavender">
                Day {i + 1}
                {days[i] && (
                  <>
                    {' · '}
                    <span className="text-muted-foreground">{days[i]}</span>
                  </>
                )}
              </h3>
              <ol className="grid gap-3 border-l-2 border-haze pl-5">
                {slots.map((s) => (
                  <ScheduleItem key={s.time} slot={s} />
                ))}
              </ol>
            </section>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className={sectionTitle}>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {goodToKnow.map((g) => (
            <div key={g.title} className="rounded-lg bg-muted/60 p-4">
              <p className="font-medium">{g.title}</p>
              <p className="mt-1 leading-relaxed text-muted-foreground">{g.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function RegistrationBadge({ open, deadline }: { open: boolean; deadline: string }) {
  return (
    <Badge
      variant={open ? 'default' : 'secondary'}
      className="flex-wrap gap-x-2 gap-y-0.5 rounded-2xl px-3 py-1 font-sans text-sm whitespace-normal sm:rounded-full"
    >
      <span
        className={cn(
          'size-2 rounded-full',
          open ? 'animate-pulse bg-primary-foreground' : 'bg-muted-foreground',
        )}
      />
      {open ? 'Registrations open' : 'Registrations closed'}
      {open && <DeadlineCountdown deadline={deadline} />}
    </Badge>
  );
}

function RegisterButton() {
  return (
    <Button asChild size="lg" className="shrink-0">
      <a href={registerUrl} target="_blank" rel="noreferrer">
        Register your team
        <ExternalLinkIcon />
      </a>
    </Button>
  );
}

/** Each unit's length and the next unit up's length it wraps within. */
const UNITS = [
  ['d', 86_400_000, Infinity],
  ['h', 3_600_000, 86_400_000],
  ['m', 60_000, 3_600_000],
  ['s', 1_000, 60_000],
] as const;

/** Time left until registration closes, ticking every second; gone once it passes. */
function DeadlineCountdown({ deadline }: { deadline: string }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Date.parse(deadline) - now;
  if (left <= 0) return null;
  return (
    <span
      className="flex items-center gap-1.5 border-primary-foreground/30 font-normal sm:border-l sm:pl-2"
      title={`Registration closes ${formatIST(deadline)}`}
    >
      closes in
      <span role="list" aria-label="Time left to register" className="flex gap-1 tabular-nums">
        {UNITS.map(([unit, ms, wrap]) => (
          <span role="listitem" key={unit} className="font-semibold">
            {String(Math.floor((left % wrap) / ms)).padStart(2, '0')}
            {unit}{' '}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Each calendar day the event runs, in IST, e.g. ['Sat, 7 Nov', 'Sun, 8 Nov']. */
function istDays(startAt: string, endAt: string): string[] {
  const fmt = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const days: string[] = [];
  for (let t = Date.parse(startAt); t <= Date.parse(endAt); t += 86_400_000) {
    const d = fmt.format(t);
    if (days.at(-1) !== d) days.push(d);
  }
  const last = fmt.format(Date.parse(endAt));
  if (days.at(-1) !== last) days.push(last);
  return days;
}

function ScheduleItem({ slot }: { slot: Slot }) {
  return (
    <li className="relative">
      <span
        className={cn(
          'absolute top-1 -left-[1.6rem] size-3 rounded-full border-2 border-card',
          slot.kind === 'round' ? 'bg-primary' : slot.kind === 'talk' ? 'bg-lavender' : 'bg-haze',
        )}
      />
      <p className="text-xs text-muted-foreground tabular-nums">{slot.time}</p>
      <p className={cn('text-sm', slot.kind === 'round' && 'font-semibold text-primary')}>
        {slot.title}
      </p>
    </li>
  );
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border bg-card/85 p-3 backdrop-blur-md">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
        <Icon className="size-5" />
      </span>
      <span className="grid min-w-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">{children}</span>
      </span>
    </li>
  );
}
