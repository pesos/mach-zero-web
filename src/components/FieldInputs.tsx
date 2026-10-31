import { type Draft, type Field, toggleOption } from '@eventkit/sdk';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * Multiple choice with up to this many options shows radio buttons; longer
 * lists, and every dropdown question, show a dropdown.
 */
const MAX_RADIOS = 8;

/**
 * Inputs for an organiser's questions (registration or submission). The
 * description sits under the question. `prefix` keeps ids unique per member.
 */
export function FieldInputs(props: {
  fields: Field[];
  value: Draft;
  onChange: (draft: Draft) => void;
  prefix: string;
}) {
  return props.fields.map((f) => {
    const id = `${props.prefix}-${f.id}`;
    const raw = props.value[f.id];
    const value = typeof raw === 'string' ? raw : '';
    const set = (v: string | string[]) => props.onChange({ ...props.value, [f.id]: v });
    const label = `${f.label}${f.required ? '' : ' (optional)'}`;
    const helpId = f.help ? `${id}-help` : undefined;
    const help = f.help && (
      <p id={helpId} className="text-xs whitespace-pre-line text-muted-foreground">
        {f.help}
      </p>
    );
    const wide =
      f.type === 'long_text' ||
      f.type === 'multi_choice' ||
      (f.type === 'choice' && f.options.length <= MAX_RADIOS);

    // Options: a group labelled by the question.
    if (f.type === 'multi_choice' || (f.type === 'choice' && f.options.length <= MAX_RADIOS)) {
      return (
        <fieldset
          key={f.id}
          aria-describedby={helpId}
          className={cn('grid content-start gap-2', wide && 'sm:col-span-2')}
        >
          <legend className="mb-2 text-sm leading-none font-medium">{label}</legend>
          {help}
          {f.type === 'multi_choice' ? (
            <div className="grid gap-2.5">
              {f.options.map((o, i) => (
                <div key={o} className="flex items-center gap-2">
                  <Checkbox
                    id={`${id}-${i}`}
                    checked={Array.isArray(raw) && raw.includes(o)}
                    onCheckedChange={() => set(toggleOption(raw, o))}
                  />
                  <Label htmlFor={`${id}-${i}`} className="font-normal">
                    {o}
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <RadioGroup value={value} onValueChange={set} className="gap-2.5">
              {f.options.map((o, i) => (
                <div key={o} className="flex items-center gap-2">
                  <RadioGroupItem id={`${id}-${i}`} value={o} />
                  <Label htmlFor={`${id}-${i}`} className="font-normal">
                    {o}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </fieldset>
      );
    }

    return (
      <div key={f.id} className={cn('grid content-start gap-2', wide && 'sm:col-span-2')}>
        <Label htmlFor={id}>{label}</Label>
        {help}
        {f.type === 'choice' || f.type === 'dropdown' ? (
          <NativeSelect
            id={id}
            aria-describedby={helpId}
            value={value}
            onChange={(e) => set(e.target.value)}
          >
            <NativeSelectOption value="">Choose…</NativeSelectOption>
            {f.options.map((o) => (
              <NativeSelectOption key={o}>{o}</NativeSelectOption>
            ))}
          </NativeSelect>
        ) : f.type === 'long_text' ? (
          <Textarea
            id={id}
            aria-describedby={helpId}
            value={value}
            onChange={(e) => set(e.target.value)}
          />
        ) : (
          <Input
            id={id}
            aria-describedby={helpId}
            type={f.type === 'phone' ? 'tel' : f.type === 'datetime' ? 'datetime-local' : 'text'}
            inputMode={f.type === 'number' ? 'decimal' : f.type === 'phone' ? 'tel' : undefined}
            autoComplete={f.type === 'phone' ? 'tel' : undefined}
            value={value}
            onChange={(e) => set(e.target.value)}
          />
        )}
      </div>
    );
  });
}
