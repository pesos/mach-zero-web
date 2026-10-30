import { LinkIcon } from 'lucide-react';
import { CopyButton } from '@/components/CopyButton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export type IssuedLink = { token: string; url: string | null };

export function NewLink({ title, link }: { title: string; link: IssuedLink }) {
  const text = link.url ?? link.token;
  return (
    <Alert className="border-primary/30 bg-secondary/60">
      <LinkIcon />
      <AlertDescription className="text-foreground">
        <p className="font-medium">{title}</p>
        <p className="w-full rounded-md bg-card px-3 py-2 font-mono text-xs break-all">{text}</p>
        <CopyButton text={text} label="Copy link" />
      </AlertDescription>
    </Alert>
  );
}
