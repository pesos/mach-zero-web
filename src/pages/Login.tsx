import { usePortalMutation } from '@eventkit/sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { ErrorText } from '@/components/ErrorText';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgetSession, homeFor } from '@/lib/staff';

/** Volunteers, judges and the event's owner sign in here. */
export function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
      </CardContent>
    </Card>
  );
}
