import { CircleAlertIcon, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/** A full-page, centred message for when a page cannot be shown. */
export function ErrorPage({
  icon: Icon = CircleAlertIcon,
  title,
  children,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  children?: ReactNode;
  /** A button: "Go home" (a link) or "Try again" (a handler). */
  action?: { label: string; onClick?: () => void; to?: string };
}) {
  return (
    <div
      role="alert"
      className="mx-auto grid min-h-[60svh] w-full max-w-md content-center justify-items-center gap-4 px-4 text-center"
    >
      <span className="grid size-14 place-items-center rounded-full bg-destructive/15 text-destructive">
        <Icon className="size-7" aria-hidden />
      </span>
      <h1 className="font-display text-2xl tracking-wide text-ink">{title}</h1>
      {children && <p className="text-sm text-muted-foreground">{children}</p>}
      {action &&
        (action.to ? (
          <Button asChild variant="outline" className="bg-card/80">
            <a href={action.to}>{action.label}</a>
          </Button>
        ) : (
          <Button variant="outline" className="bg-card/80" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}
