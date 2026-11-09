import { useEventKit, usePortalMutation } from '@eventkit/sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ErrorText } from '@/components/ErrorText';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardSkeleton } from '@/components/Skeletons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { forgetSession, homeFor, useWho } from '@/lib/staff';

const ROLE: Record<string, string> = {
  admin: 'an organiser',
  volunteer: 'a volunteer',
  judge: 'a judge',
};

/** Volunteers, judges and the event's owner sign in here. */
export function Login() {
  const ek = useEventKit();
  const who = useWho();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Already signed in as staff: say so here instead of leaving them guessing,
  // and let them carry on or switch accounts.
  const [switching, setSwitching] = useState(false);
  const signedIn = (who.kind === 'staff' || who.kind === 'client') && !switching;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = usePortalMutation((portal, v: { email: string; password: string }) =>
    portal.login(v.email, v.password),
  );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: (res) => {
          forgetSession(queryClient);
          void navigate(homeFor(res.role));
        },
      },
    );
  };
  if (signedIn && who.loading) return <CardSkeleton />;
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-display text-xl font-normal tracking-wide">
          Staff sign in
        </CardTitle>
        <CardDescription>
          Volunteers and judges of this event, and its organiser. Participants don't sign in: use
          your personal link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {signedIn ? (
          <div className="grid gap-4">
            <Alert>
              <AlertTitle>You’re already signed in</AlertTitle>
              <AlertDescription>
                {who.role
                  ? `This device is signed in to this event as ${ROLE[who.role] ?? who.role}.`
                  : 'This device is signed in, but that account no longer has access to this event.'}
              </AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-2">
              {who.role && (
                <Button asChild>
                  <Link to={homeFor(who.role)}>Continue</Link>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  ek.portal.logout();
                  forgetSession(queryClient);
                  setSwitching(true);
                }}
              >
                Sign in as someone else
              </Button>
            </div>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <ErrorText error={login.error} />
            <Button type="submit" className="w-full" disabled={login.isPending}>
              Sign in
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
