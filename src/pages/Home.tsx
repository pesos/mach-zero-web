import { formatIST, formatMoney } from '@eventkit/sdk';
import { usePortalInfo } from '@eventkit/sdk/react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { basePath } from '@/lib/paths';
import { useWho } from '@/lib/staff';

export function Home() {
  const { event, registrationOpen, paths } = usePortalInfo().data!;
  const who = useWho();
  return (
    <>
      <section className="grid justify-items-center gap-6 py-6 text-center sm:py-10">
        <h2 className="chrome-text text-5xl leading-[1.05] break-words sm:text-7xl">
          {event.name}
        </h2>
        <p className="font-display text-xs tracking-[0.25em] text-muted-foreground uppercase">
          by {event.hostedBy} · {event.venue}
        </p>
        <ul className="grid gap-3 font-display text-lavender sm:text-lg">
          <PosterRow icon={<CalendarIcon />}>
            {formatIST(event.startAt)} – {formatIST(event.endAt)}
          </PosterRow>
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
    </>
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

const PeopleIcon = () => (
  <svg {...iconProps}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.5 3.6 5.2" />
  </svg>
);
