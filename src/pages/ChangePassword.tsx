import { useEventKit } from '@eventkit/sdk/react';
import { CircleCheckIcon, LockIcon } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { ErrorText } from '@/components/ErrorText';
import { Loading } from '@/components/Loading';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { STAFF_LOGIN } from '@/lib/paths';
import { useWho } from '@/lib/staff';

const FIELDS = [
  ['current', 'Current password', 'current-password'],
  ['next', 'New password', 'new-password'],
  ['confirm', 'Confirm new password', 'new-password'],
] as const;
type Name = (typeof FIELDS)[number][0];

/** Staff, co-admins and the owner change their password; other devices sign out. */
export function ChangePassword() {
  const ek = useEventKit();
  const who = useWho();
  const [values, setValues] = useState<Record<Name, string>>({
    current: '',
    next: '',
    confirm: '',
  });
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<unknown>(null);

  if (who.loading) return <Loading />;
  if (!who.kind || who.kind === 'participant') {
    return (
      <Alert>
        <LockIcon />
        <AlertDescription className="block text-foreground">
          This page is for the event's staff.{' '}
          <Link className="font-medium text-primary underline underline-offset-4" to={STAFF_LOGIN}>
            Sign in
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  const mismatch = values.confirm !== '' && values.next !== values.confirm;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    setPending(true);
    try {
      // The reply's token keeps this device signed in.
      await ek.portal.changePassword(values.current, values.next);
      setValues({ current: '', next: '', confirm: '' });
      setDone(true);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Change password</CardTitle>
        <CardDescription>
          Every other device signed in to your account is signed out.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid max-w-sm gap-4" onSubmit={submit}>
          {done && (
            <Alert>
              <CircleCheckIcon />
              <AlertDescription className="text-foreground">
                Password changed. Other devices are signed out.
              </AlertDescription>
            </Alert>
          )}
          <ErrorText error={error} />
          {FIELDS.map(([name, label, autoComplete]) => (
            <div key={name} className="grid gap-2">
              <Label htmlFor={`pw-${name}`}>{label}</Label>
              <Input
                id={`pw-${name}`}
                type="password"
                autoComplete={autoComplete}
                required
                minLength={name === 'current' ? 1 : 8}
                value={values[name]}
                onChange={(e) => setValues({ ...values, [name]: e.target.value })}
              />
            </div>
          ))}
          {mismatch && <p className="text-sm text-destructive">The passwords don't match.</p>}
          <Button
            type="submit"
            className="w-fit"
            disabled={pending || mismatch || values.next.length < 8 || !values.current}
          >
            {pending ? 'Saving…' : 'Change password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
