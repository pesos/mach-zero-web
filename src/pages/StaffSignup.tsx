import { useEventKit, usePortalMutation } from '@eventkit/sdk/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ErrorText } from '@/components/ErrorText';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgetSession, homeFor } from '@/lib/staff';

const FIELDS = [
  ['linkPassword', 'Link password (from the organiser)', 'password', 'off'],
  ['name', 'Your name', 'text', 'name'],
  ['email', 'Email', 'email', 'email'],
  ['password', 'Choose a password (8+ characters)', 'password', 'new-password'],
] as const;
type Values = Record<(typeof FIELDS)[number][0], string>;

/** A volunteer or judge creates their account for this event through a staff link. */
export function StaffSignup() {
  const { token = '' } = useParams();
  const ek = useEventKit();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const link = useQuery({
    queryKey: ['eventkit', 'portal', 'link', token],
    queryFn: () => ek.portal.previewLink(token),
  });
  const [values, setValues] = useState<Values>({
    linkPassword: '',
    name: '',
    email: '',
    password: '',
  });
  const signup = usePortalMutation((portal, v: Values) =>
    portal.staff.signup({ linkToken: token, ...v }),
  );

  if (link.isPending) return <Loading>Checking the link…</Loading>;
  if (link.isError) return <ErrorText error={link.error} />;
  if (link.data.kind !== 'staff') {
    return <ErrorText error={new Error('This is not a staff link.')} />;
  }
  const role = link.data.role === 'judge' ? 'judge' : 'volunteer';
  const submit = (e: FormEvent) => {
    e.preventDefault();
    signup.mutate(values, {
      onSuccess: (res) => {
        forgetSession(queryClient);
        void navigate(homeFor(res.role));
      },
    });
  };
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-display text-xl font-normal tracking-wide">
          Join as a {role}
        </CardTitle>
        <CardDescription>
          Create your account for this event. Later, sign in with it on this site.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={submit}>
          {FIELDS.map(([name, label, type, autoComplete]) => (
            <div key={name} className="grid gap-1">
              <Label htmlFor={name}>{label}</Label>
              <Input
                id={name}
                type={type}
                autoComplete={autoComplete}
                value={values[name]}
                onChange={(e) => setValues({ ...values, [name]: e.target.value })}
                required
              />
            </div>
          ))}
          <ErrorText error={signup.error} />
          <Button type="submit" className="w-full" disabled={signup.isPending}>
            Create account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
