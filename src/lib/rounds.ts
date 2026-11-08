import { useState } from 'react';

export type RoundOption = { id: string; name: string; phase?: string };

/** The latest released round, or the first when none is released. */
export function defaultRound(rounds: RoundOption[]): string | undefined {
  return ([...rounds].reverse().find((r) => r.phase === 'released') ?? rounds[0])?.id;
}

/** The first open (released) round, for judging; else as {@link defaultRound}. */
export function firstOpenRound(rounds: RoundOption[]): string | undefined {
  return rounds.find((r) => r.phase === 'released')?.id ?? defaultRound(rounds);
}

/** The chosen round: what the person picked if it is still there, else the default. */
export function useRoundChoice(rounds: RoundOption[], fallback = defaultRound) {
  const [picked, setPicked] = useState('');
  const roundId = rounds.some((r) => r.id === picked) ? picked : fallback(rounds);
  return [roundId, setPicked] as const;
}
