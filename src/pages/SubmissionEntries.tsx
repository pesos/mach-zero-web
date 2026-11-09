import { answerText, formatIST, type Schemas } from '@eventkit/sdk';
import { useEventQuery, useSubmissionEntries } from '@eventkit/sdk/react';
import { ChevronsDownUpIcon, ChevronsUpDownIcon, ExternalLinkIcon, GavelIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { ErrorText } from '@/components/ErrorText';
import { Markdown } from '@/components/Markdown';
import { SearchInput } from '@/components/SearchInput';
import { ListSkeleton } from '@/components/Skeletons';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useListFilter } from '@/hooks/useListFilter';
import { useWho } from '@/lib/staff';

type Submission = Schemas['Submission'];
type Field = Submission['fields'][number];
type Entry = Schemas['SubmissionEntry'];
type Value = Entry['answers'][string];

const URL_ONLY = /^https?:\/\/\S+$/i;

/** A link as people read it: host and path, without the scheme or a trailing slash. */
const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

/** The links an entry's answers hold, for the collapsed row. */
function linksIn(entry: Entry, fields: Field[]): string[] {
  return fields
    .map((f) => entry.answers[f.id])
    .filter((v): v is string => typeof v === 'string' && URL_ONLY.test(v.trim()))
    .map((v) => v.trim());
}

const entryText = (e: Entry) => [
  e.team.name,
  e.submittedBy?.name,
  ...Object.values(e.answers).map((v) => answerText(v)),
];

/**
 * One form's entries for judges and admins: a row per team that opens to its
 * answers. Links are clickable, long answers keep their paragraphs and lists.
 */
export function SubmissionEntries({ submission: s }: { submission: Submission }) {
  const entries = useSubmissionEntries(s.id);
  const [sort, setSort] = useState<'latest' | 'team'>('latest');
  const [open, setOpen] = useState<string[]>([]);
  const search = useListFilter(entries.data ?? [], entryText);
  const fields = [...s.fields].sort((a, b) => a.position - b.position);
  const shown = [...search.filtered].sort((a, b) =>
    sort === 'team'
      ? a.team.name.localeCompare(b.team.name)
      : b.createdAt.localeCompare(a.createdAt),
  );
  const allOpen = shown.length > 0 && shown.every((e) => open.includes(e.id));

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-base wrap-anywhere">{s.title}</CardTitle>
        <CardDescription>
          {s.round.name} · {s.entryCount} {s.entryCount === 1 ? 'response' : 'responses'}
          {s.deadline && ` · due ${formatIST(s.deadline)}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <WhoSubmitted submissionId={s.id} />
        {entries.isPending && <ListSkeleton label="Loading entries" rows={3} />}
        <ErrorText error={entries.error} />
        {entries.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">No team has submitted yet.</p>
        )}
        {entries.data && entries.data.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                label={`Search ${s.title}`}
                placeholder="Team, member or answer"
                value={search.query}
                onChange={search.setQuery}
                className="sm:max-w-sm sm:flex-1"
              />
              <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                <SelectTrigger aria-label="Sort entries" className="w-auto min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest first</SelectItem>
                  <SelectItem value="team">Team A–Z</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setOpen(allOpen ? [] : shown.map((e) => e.id))}
              >
                {allOpen ? <ChevronsDownUpIcon aria-hidden /> : <ChevronsUpDownIcon aria-hidden />}
                {allOpen ? 'Collapse all' : 'Expand all'}
              </Button>
            </div>
            {search.active && shown.length === 0 && (
              <p className="text-sm text-muted-foreground">No entry matches.</p>
            )}
            <Accordion
              type="multiple"
              value={open}
              onValueChange={setOpen}
              className="rounded-lg border bg-background/40"
            >
              {shown.map((e) => (
                <EntryRow key={e.id} entry={e} fields={fields} />
              ))}
            </Accordion>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** How many teams have submitted, and which expected ones haven't yet. */
function WhoSubmitted({ submissionId }: { submissionId: string }) {
  const status = useEventQuery('submission-status', (e) => e.submissions.status(submissionId), {}, [
    submissionId,
  ]);
  if (!status.data) return <ErrorText error={status.error} />;
  const { submitted, pending } = status.data;
  return (
    <Accordion type="single" collapsible className="rounded-lg border px-3 sm:px-4">
      <AccordionItem value="pending" className="border-b-0">
        <AccordionTrigger className="gap-3 py-3 hover:no-underline">
          <span className="flex flex-wrap items-center gap-2 text-sm font-normal">
            <Badge variant="secondary">{submitted.length} submitted</Badge>
            <Badge variant={pending.length ? 'destructive' : 'secondary'}>
              {pending.length} yet to submit
            </Badge>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every team has submitted.</p>
          ) : (
            <ul className="grid gap-1 text-sm sm:grid-cols-2" aria-label="Yet to submit">
              {pending.map((t) => (
                <li key={t.id} className="wrap-anywhere">
                  {t.name}
                </li>
              ))}
            </ul>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function EntryRow({ entry: e, fields }: { entry: Entry; fields: Field[] }) {
  const who = useWho();
  const links = linksIn(e, fields);
  return (
    <AccordionItem value={e.id} className="px-3 last:border-b-0 sm:px-4">
      <AccordionTrigger className="gap-3 py-3 hover:no-underline">
        <span className="grid min-w-0 flex-1 gap-1 text-left">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium wrap-anywhere">{e.team.name}</span>
            {e.late && <Badge variant="destructive">Late</Badge>}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {formatIST(e.createdAt)}
            {links.length > 0 && ` · ${links.map(shortUrl).join(' · ')}`}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="grid gap-4 pb-4">
        <dl className="grid gap-4">
          {fields.map((f) => (
            <div key={f.id} className="grid gap-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {f.label}
              </dt>
              <dd className="min-w-0 text-sm">
                <AnswerValue field={f} value={e.answers[f.id]} />
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            {e.submittedBy ? `Sent by ${e.submittedBy.name}` : 'Sent'} · {formatIST(e.createdAt)}
          </p>
          {who.canJudge && (
            <Button size="sm" variant="outline" asChild>
              <Link to={`/judge?team=${e.team.id}`}>
                <GavelIcon aria-hidden /> Judge this team
              </Link>
            </Button>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

/** One answer, shown by its kind: links open, choices as tags, long text as paragraphs. */
export function AnswerValue({ field, value }: { field: Field; value: Value | undefined }) {
  if (value === undefined || value === '') {
    return <span className="text-muted-foreground">Not answered</span>;
  }
  if (Array.isArray(value)) {
    return (
      <span className="flex flex-wrap gap-1.5">
        {value.map((v) => (
          <Badge key={v} variant="secondary">
            {v}
          </Badge>
        ))}
      </span>
    );
  }
  if (field.type === 'datetime') return <span>{formatIST(String(value))}</span>;
  const text = String(value).trim();
  if (URL_ONLY.test(text)) {
    return (
      <a
        href={text}
        target="_blank"
        rel="noreferrer"
        className="inline-flex max-w-full items-start gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
      >
        <span className="wrap-anywhere">{shortUrl(text)}</span>
        <ExternalLinkIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      </a>
    );
  }
  if (field.type === 'long_text') {
    return (
      <div className="grid gap-2 rounded-md bg-muted/40 p-3 leading-relaxed wrap-anywhere">
        <Markdown>{text}</Markdown>
      </div>
    );
  }
  return <span className="wrap-anywhere">{text}</span>;
}
