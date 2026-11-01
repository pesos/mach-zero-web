import { MessageCircleIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { updatesGroupUrl } from '@/content/event';

/** The event's WhatsApp updates group, for teams that have registered. */
export function UpdatesGroup() {
  return (
    <Alert role="note" className="border-primary/40 [&>svg]:size-5">
      <MessageCircleIcon className="text-primary" />
      <AlertTitle className="text-base">Join the updates group</AlertTitle>
      <AlertDescription className="grid gap-3">
        <p>Event announcements go out on WhatsApp. Every team member should join.</p>
        <Button asChild className="justify-self-start">
          <a href={updatesGroupUrl} target="_blank" rel="noreferrer">
            Join on WhatsApp
          </a>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
