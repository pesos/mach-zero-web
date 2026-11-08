import type { Schemas } from '@eventkit/sdk';
import type { ReactNode } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { roundsUpTo } from '@/lib/rounds';

type Round = Schemas['Round'];

/**
 * One section per round, from the chosen round back to the first, all open:
 * on Round 3, Round 2 and Round 1 show below it. With a single round it shows
 * that round's content alone.
 */
export function RoundSections({
  rounds,
  roundId,
  children,
}: {
  rounds: Round[];
  roundId: string;
  children: (round: Round) => ReactNode;
}) {
  const shown = roundsUpTo(rounds, roundId);
  if (shown.length <= 1) {
    const round = shown[0] ?? rounds.find((r) => r.id === roundId);
    return round ? children(round) : null;
  }
  return (
    <Accordion
      type="multiple"
      defaultValue={shown.map((r) => r.id)}
      className="rounded-xl border bg-card"
    >
      {shown.map((r) => (
        <AccordionItem key={r.id} value={r.id} className="px-3 sm:px-4">
          <AccordionTrigger className="items-center gap-3 py-3 hover:no-underline">
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span className="font-medium wrap-anywhere">{r.name}</span>
              {r.id === roundId ? (
                <Badge variant="secondary">This round</Badge>
              ) : (
                r.phase === 'closed' && <Badge variant="outline">Closed</Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>{children(r)}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
