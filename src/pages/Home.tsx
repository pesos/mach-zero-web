import { formatIST, formatMoney } from '@eventkit/sdk';
import { usePortalInfo } from '@eventkit/sdk/react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
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
import { cn } from '@/lib/utils';
import { basePath } from '@/lib/paths';
import { useWho } from '@/lib/staff';

export function Home() {
  const { event, registrationOpen, paths } = usePortalInfo().data!;
  const who = useWho();
  const days = istDays(event.startAt, event.endAt);
  return (
    <>
      <section className="grid justify-items-center gap-6 bg-[radial-gradient(ellipse_closest-side,var(--background)_55%,transparent)] py-6 text-center sm:py-10">
        <h2 className="chrome-text text-5xl leading-[1.05] break-words sm:text-7xl">
          {event.name}
        </h2>
        <p className="max-w-md text-lg text-foreground/80">{tagline}</p>
        <p className="font-display text-xs tracking-[0.25em] text-muted-foreground uppercase">
          by {event.hostedBy}
        </p>
        <ul className="grid gap-3 font-display text-lavender sm:text-lg">
          <PosterRow icon={<CalendarIcon />}>{days.join(' & ')}</PosterRow>
          <PosterRow icon={<ClockIcon />}>{dailyHours}</PosterRow>
          <PosterRow icon={<PinIcon />}>{event.venue}</PosterRow>
          <PosterRow icon={<PeopleIcon />}>
            Teams of {event.minTeamSize}–{event.maxTeamSize}
            {event.registrationFee !== null &&
              ` · ${formatMoney(event.registrationFee, event.currency)} per person`}
            {' · '}
            {event.placesLeft} places left
          </PosterRow>
        </ul>
      </section>
      <Card>
        <CardContent className="grid gap-3 pt-6 text-sm">
          <p className="flex items-start gap-3">
            <span
              className={`mt-1.5 size-2.5 shrink-0 rounded-full ${registrationOpen ? 'bg-primary shadow-[0_0_0_4px_var(--secondary)]' : 'bg-muted-foreground/50'}`}
            />
            <span>
              {registrationOpen
                ? `Registration is open until ${formatIST(event.registrationDeadline)}. Your team leader registers everyone through the registration link from the organisers.`
                : `Registration is not open. It runs ${formatIST(event.registrationStart)} – ${formatIST(event.registrationDeadline)}.`}
            </span>
          </p>
          {who.kind === 'participant' && (
            <p>
              <Link
                className="inline-flex h-10 items-center rounded-full bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/90"
                to={basePath(paths.me)}
              >
                Open your registration
              </Link>
            </p>
          )}
          {!who.kind && (
            <p className="text-muted-foreground">
              Registered already? Open the personal link you were given.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm leading-relaxed">
          {about.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </CardContent>
      </Card>

      <ul aria-label="At a glance" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {highlights.map((h) => (
          <li key={h.label} className="glass rounded-lg border p-4">
            <p className="font-display text-xl text-primary">{h.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{h.label}</p>
          </li>
        ))}
      </ul>

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          {schedule.map((slots, i) => (
            <section key={i} aria-label={`Day ${i + 1}`}>
              <h3 className="mb-3 text-sm text-lavender">
                Day {i + 1}
                {days[i] && (
                  <>
                    {' · '}
                    <span className="text-muted-foreground">{days[i]}</span>
                  </>
                )}
              </h3>
              <ol className="grid gap-2 border-l-2 border-haze pl-4">
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
          <CardTitle>Good to know</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          {goodToKnow.map((g) => (
            <div key={g.title}>
              <p className="font-medium">{g.title}</p>
              <p className="mt-1 text-muted-foreground">{g.body}</p>
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
          'absolute top-1.5 -left-[1.3rem] size-2.5 rounded-full border-2 border-background',
          slot.kind === 'round' ? 'bg-primary' : slot.kind === 'talk' ? 'bg-lavender' : 'bg-haze',
        )}
      />
      <p className="font-display text-xs text-muted-foreground">{slot.time}</p>
      <p className={cn('text-sm', slot.kind === 'round' && 'font-medium')}>{slot.title}</p>
    </li>
  );
}

function PosterRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center justify-center gap-3">
      <span className="text-ink">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

const iconProps = {
  viewBox: '0 0 24 24',
  className: 'size-6 shrink-0',
  'aria-hidden': true,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const CalendarIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2" />
  </svg>
);

const ClockIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const PinIcon = () => (
  <svg {...iconProps}>
    <path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

const PeopleIcon = () => (
  <svg {...iconProps}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.5 3.6 5.2" />
  </svg>
);
