import { isEventKitError } from '@eventkit/sdk';
import { CircleAlertIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { errorText } from '@/lib/eventkit';

/** An API error as people read it, with the field problems the API listed. */
export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const details =
    isEventKitError(error) && Array.isArray(error.details)
      ? (error.details as { message?: string }[]).map((d) => d.message).filter(Boolean)
      : [];
  return (
    <Alert variant="destructive" className="border-destructive/40">
      <CircleAlertIcon />
      <AlertDescription>
        <p>{errorText(error)}</p>
        {details.length > 0 && (
          <ul className="list-disc pl-5">
            {details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}
