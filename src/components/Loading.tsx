import { Loader2Icon } from 'lucide-react';
import type { ReactNode } from 'react';

export function Loading({ children = 'Loading…' }: { children?: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2Icon className="size-4 animate-spin" />
      {children}
    </p>
  );
}
