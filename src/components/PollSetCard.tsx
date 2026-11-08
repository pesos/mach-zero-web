import type { Schemas } from '@eventkit/sdk';
import { CheckIcon, ListChecksIcon } from 'lucide-react';
import { useState } from 'react';
import { ErrorText } from '@/components/ErrorText';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Poll = Schemas['Poll'];
export type SetAnswer = {
  pollId: string;
  optionId?: string;
  optionIds?: string[];
  value?: string | number;
};
type Draft = { optionId?: string; optionIds?: string[]; text?: string };

/** An ISO date-time as a datetime-local value in IST. */
const istInput = (iso: string) =>
  new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(0, 16);

function initialDraft(p: Poll): Draft {
  const a = p.myAnswer;
  if (!a) return {};
  if (a.optionId) return { optionId: a.optionId };
  if (a.optionIds.length) return { optionIds: a.optionIds };
  if (a.value == null) return {};
  return { text: p.type === 'datetime' ? istInput(String(a.value)) : String(a.value) };
}

/** A draft as the API wants it, or null when the question is left blank. */
function toAnswer(p: Poll, d: Draft): SetAnswer | null {
  if (p.type === 'choice' || p.type === 'dropdown') {
    return d.optionId ? { pollId: p.id, optionId: d.optionId } : null;
  }
  if (p.type === 'multi_choice') {
    return d.optionIds?.length ? { pollId: p.id, optionIds: d.optionIds } : null;
  }
  const text = d.text?.trim() ?? '';
  if (!text) return null;
  if (p.type === 'number' || p.type === 'rating') return { pollId: p.id, value: Number(text) };
  if (p.type === 'datetime') return { pollId: p.id, value: `${text}+05:30` };
  return { pollId: p.id, value: text };
}

const optionClass = (on: boolean) =>
  cn(
    'relative isolate flex items-center gap-3 overflow-hidden rounded-lg border bg-background/60 px-3 py-2.5 text-left text-sm transition-colors',
    'enabled:hover:border-primary/40 disabled:cursor-default',
    'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
    on && 'border-primary/60',
  );

/**
 * A set of poll questions on one card, answered with one Submit: every answer
 * given is saved together. Blank questions are skipped.
 */
export function PollSetCard({
  questions,
  pending,
  error,
  saved,
  onSubmit,
}: {
  questions: Poll[];
  pending: boolean;
  error: unknown;
  saved: boolean;
  onSubmit: (answers: SetAnswer[]) => void;
}) {
  const first = questions[0]!;
  const group = first.group!;
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, initialDraft(q)])),
  );
  const set = (id: string, d: Draft) => setDrafts((all) => ({ ...all, [id]: d }));
  const answers = questions.flatMap((q) => {
    const a = toAnswer(q, drafts[q.id] ?? {});
    return a ? [a] : [];
  });
  const locked = !first.canVote || pending;
  const answered = questions.filter((q) => q.myAnswer).length;

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <ListChecksIcon aria-hidden className="size-4 text-primary" />
          <span className="min-w-0 wrap-anywhere">{group.title}</span>
          {first.closed && <Badge variant="secondary">Closed</Badge>}
        </CardTitle>
        <CardDescription className="grid gap-1">
          {group.description && <span className="wrap-anywhere">{group.description}</span>}
          <span>
            {questions.length} questions
            {answered > 0 && ` · you answered ${answered}`}
            {!first.canVote && !first.closed && ' · not for your role'}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(answers);
          }}
        >
          {questions.map((q, i) => {
            const d = drafts[q.id] ?? {};
            const label = `${i + 1}. ${q.question}`;
            const options = [...q.options].sort((a, b) => a.position - b.position);
            return (
              <fieldset key={q.id} className="grid gap-2">
                <legend className="mb-1 text-sm font-medium wrap-anywhere">{label}</legend>
                {q.type === 'choice' || q.type === 'dropdown' ? (
                  <div role="radiogroup" aria-label={q.question} className="grid gap-2">
                    {options.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        role="radio"
                        aria-checked={d.optionId === o.id}
                        disabled={locked}
                        onClick={() => set(q.id, { optionId: o.id })}
                        className={optionClass(d.optionId === o.id)}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'grid size-5 shrink-0 place-items-center rounded-full border',
                            d.optionId === o.id
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-input',
                          )}
                        >
                          {d.optionId === o.id && <CheckIcon className="size-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1 wrap-anywhere">{o.label}</span>
                        {q.totalVotes !== null && (
                          <span className="text-muted-foreground tabular-nums">{o.votes}</span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : q.type === 'multi_choice' ? (
                  <div role="group" aria-label={q.question} className="grid gap-2">
                    {options.map((o) => {
                      const on = d.optionIds?.includes(o.id) ?? false;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          disabled={locked}
                          onClick={() =>
                            set(q.id, {
                              optionIds: on
                                ? (d.optionIds ?? []).filter((x) => x !== o.id)
                                : [...(d.optionIds ?? []), o.id],
                            })
                          }
                          className={optionClass(on)}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'grid size-5 shrink-0 place-items-center rounded-md border',
                              on
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-input',
                            )}
                          >
                            {on && <CheckIcon className="size-3.5" />}
                          </span>
                          <span className="min-w-0 flex-1 wrap-anywhere">{o.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : q.type === 'rating' ? (
                  <div role="radiogroup" aria-label={q.question} className="flex flex-wrap gap-2">
                    {Array.from({ length: q.scaleMax ?? 5 }, (_, n) => String(n + 1)).map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={d.text === n}
                        disabled={locked}
                        onClick={() => set(q.id, { text: n })}
                        className={cn(
                          'grid size-11 place-items-center rounded-lg border text-base tabular-nums transition-colors',
                          'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                          d.text === n
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'bg-background/60 enabled:hover:border-primary/40',
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                ) : q.type === 'long_text' ? (
                  <Textarea
                    aria-label={q.question}
                    rows={3}
                    maxLength={5000}
                    disabled={locked}
                    value={d.text ?? ''}
                    onChange={(e) => set(q.id, { text: e.target.value })}
                  />
                ) : (
                  <Input
                    aria-label={q.question}
                    type={
                      q.type === 'number'
                        ? 'number'
                        : q.type === 'datetime'
                          ? 'datetime-local'
                          : 'text'
                    }
                    inputMode={q.type === 'number' ? 'decimal' : undefined}
                    maxLength={q.type === 'short_text' ? 200 : undefined}
                    disabled={locked}
                    value={d.text ?? ''}
                    onChange={(e) => set(q.id, { text: e.target.value })}
                  />
                )}
              </fieldset>
            );
          })}
          <ErrorText error={error} />
          {first.canVote && (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={locked || answers.length === 0}>
                {answered > 0 ? 'Update answers' : 'Submit answers'}
              </Button>
              {saved && (
                <p role="status" className="flex items-center gap-1 text-sm text-success">
                  <CheckIcon className="size-4" aria-hidden /> Saved.
                </p>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
