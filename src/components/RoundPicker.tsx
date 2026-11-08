import type { RoundOption } from '@/lib/rounds';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** A dropdown of rounds, shown even with one so people see which round they are on. */
export function RoundPicker({
  rounds,
  value,
  onChange,
}: {
  rounds: RoundOption[];
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  if (rounds.length === 0) return null;
  return (
    <div className="grid w-full gap-2 sm:max-w-xs">
      <Label htmlFor="round">Round</Label>
      <Select value={value ?? ''} onValueChange={onChange}>
        <SelectTrigger id="round" className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {rounds.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
              {r.phase === 'draft' ? ' (draft)' : r.phase === 'closed' ? ' (closed)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
