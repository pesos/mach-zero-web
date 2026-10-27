import { describeFee, formatIST } from '@eventkit/sdk';
import { usePortalInfo } from '@eventkit/sdk/react';
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  type LucideIcon,
  MapPinIcon,
  UsersIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  about,
  dailyHours,
  goodToKnow,
  highlights,
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
          by {event.hostedBy}
        </Badge>
        <h2 className="chrome-text text-5xl leading-[1.05] break-words sm:text-7xl">
          {event.name}
        </h2>
        <p className="max-w-md text-lg text-balance text-foreground/80">{tagline}</p>
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
            <Badge
              variant={registrationOpen ? 'default' : 'secondary'}
              className="gap-1.5 font-sans"
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  registrationOpen ? 'animate-pulse bg-primary-foreground' : 'bg-muted-foreground',
                )}
              />
              {registrationOpen ? 'Registration open' : 'Registration closed'}
            </Badge>
            <p className="text-sm leading-relaxed">
              {registrationOpen
                ? `Registration is open until ${formatIST(event.registrationDeadline)}. Your team leader registers everyone through the registration link from the organisers.`
                : `Registration is not open. It runs ${formatIST(event.registrationStart)} – ${formatIST(event.registrationDeadline)}.`}
            </p>
            {!who.kind && (
              <p className="text-sm text-muted-foreground">
                Registered already? Open the personal link you were given.
              </p>
            )}
          </div>
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
          <li key={h.label} className="rounded-xl border bg-card/85 p-4 shadow-sm backdrop-blur-md">
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
          <CardTitle className={sectionTitle}>Good to know</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
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
    <li className="flex items-center gap-3 rounded-xl border bg-card/85 p-3 shadow-sm backdrop-blur-md">
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
