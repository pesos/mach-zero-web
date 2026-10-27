import type { Draft, Field } from '@eventkit/sdk';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/** Inputs for the event's registration questions. `prefix` keeps ids unique per member. */
export function FieldInputs(props: {
  fields: Field[];
  value: Draft;
  onChange: (draft: Draft) => void;
  prefix: string;
}) {
  return props.fields.map((f) => {
    const id = `${props.prefix}-${f.id}`;
    const value = props.value[f.id] ?? '';
    const set = (v: string) => props.onChange({ ...props.value, [f.id]: v });
    const label = `${f.label}${f.required ? '' : ' (optional)'}`;
    return (
      <div key={f.id} className={cn('grid gap-2', f.type === 'long_text' && 'sm:col-span-2')}>
        <Label htmlFor={id}>{label}</Label>
        {f.type === 'choice' ? (
          <NativeSelect id={id} value={value} onChange={(e) => set(e.target.value)}>
            <NativeSelectOption value="">Choose…</NativeSelectOption>
            {f.options.map((o) => (
              <NativeSelectOption key={o}>{o}</NativeSelectOption>
            ))}
          </NativeSelect>
        ) : f.type === 'long_text' ? (
          <Textarea id={id} value={value} onChange={(e) => set(e.target.value)} />
        ) : (
          <Input
            id={id}
            type={f.type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => set(e.target.value)}
          />
        )}
        {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
      </div>
    );
  });
}
