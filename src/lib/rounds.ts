import { useState } from 'react';

export type RoundOption = { id: string; name: string; phase?: string };

/** The latest released round, or the first when none is released. */
export function defaultRound(rounds: RoundOption[]): string | undefined {
  return ([...rounds].reverse().find((r) => r.phase === 'released') ?? rounds[0])?.id;
}

/** The chosen round: what the person picked if it is still there, else the default. */
export function useRoundChoice(rounds: RoundOption[]) {
  const [picked, setPicked] = useState('');
  const roundId = rounds.some((r) => r.id === picked) ? picked : defaultRound(rounds);
  return [roundId, setPicked] as const;
}
