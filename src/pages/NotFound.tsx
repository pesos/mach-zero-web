import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function NotFound() {
  return (
    <Card className="mx-auto w-full max-w-md text-center">
      <CardContent className="grid justify-items-center gap-4">
        <p className="chrome-text text-6xl">404</p>
        <p>This page does not exist.</p>
        <Button asChild variant="outline">
          <Link to="/">Back to the event</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
