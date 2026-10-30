import type { RoundOption } from '@/lib/rounds';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';

/** A dropdown of rounds; renders nothing when there is nothing to choose. */
export function RoundPicker({
  rounds,
  value,
  onChange,
}: {
  rounds: RoundOption[];
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  if (rounds.length < 2) return null;
  return (
    <div className="grid max-w-xs gap-2">
      <Label htmlFor="round">Round</Label>
      <NativeSelect id="round" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {rounds.map((r) => (
          <NativeSelectOption key={r.id} value={r.id}>
            {r.name}
            {r.phase === 'draft' ? ' (draft)' : ''}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
