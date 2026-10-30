import { describeScan, type ScanResult } from '@eventkit/sdk';
import { useEventQuery, useScanner } from '@eventkit/sdk/react';
import { Scanner as Camera } from '@yudiel/react-qr-scanner';
import {
  CameraOffIcon,
  CircleCheckIcon,
  CircleXIcon,
  UtensilsIcon,
  WifiOffIcon,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { ErrorText } from '@/components/ErrorText';
import { StaffOnly } from '@/components/StaffOnly';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { cn } from '@/lib/utils';

const CHECKPOINT_KEY = 'portal.checkpoint';
const remembered = () => {
  try {
    return localStorage.getItem(CHECKPOINT_KEY) ?? '';
  } catch {
    return '';
  }
};

/** Camera libraries throw Errors, DOMExceptions or plain objects. */
function cameraMessage(e: unknown): string {
  if (e && typeof e === 'object') {
    const { message, name } = e as { message?: unknown; name?: unknown };
    if (typeof message === 'string' && message) return message;
    if (typeof name === 'string' && name) return name;
  }
  return 'no camera';
}

export function Scan() {
  return (
    <StaffOnly allowed="scan">
      <ScanPage />
    </StaffOnly>
  );
}

/** Online-only check-in: camera, or a typed QR token / participant ID. */
function ScanPage() {
  const checkpoints = useEventQuery('checkpoints', (e) => e.checkpoints.list());
  const [checkpointId, setCheckpointId] = useState(remembered);
  const valid = checkpoints.data?.some((c) => c.id === checkpointId) ? checkpointId : '';
  return (
    <div className="grid gap-4">
      <Card className="py-4">
        <CardContent className="grid gap-2 px-4">
          <Label htmlFor="checkpoint">Checkpoint</Label>
          <NativeSelect
            id="checkpoint"
            value={valid}
            onChange={(e) => {
              setCheckpointId(e.target.value);
              try {
                localStorage.setItem(CHECKPOINT_KEY, e.target.value);
              } catch {
                // Storage off: choose again next time.
              }
            }}
          >
            <NativeSelectOption value="">Choose a checkpoint…</NativeSelectOption>
            {checkpoints.data?.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <ErrorText error={checkpoints.error} />
        </CardContent>
      </Card>
      {valid ? (
        <Scanning checkpointId={valid} />
      ) : (
        <p className="text-sm text-muted-foreground">Choose where you are scanning.</p>
      )}
    </div>
  );
}

function Scanning({ checkpointId }: { checkpointId: string }) {
  const { scanner, online } = useScanner({ checkpointId });
  const [result, setResult] = useState<ScanResult | null>(null);
  const [lastCode, setLastCode] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [typed, setTyped] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const run = async (fn: () => Promise<ScanResult | null>, code: string) => {
    try {
      const r = await fn();
      if (r) {
        setResult(r);
        setLastCode(code);
        setError(null);
      }
    } catch (e) {
      setError(e);
      setResult(null);
    }
  };
  const submit = (code: string) => scanner && run(() => scanner.scan(code), code);
  const onTyped = (e: FormEvent) => {
    e.preventDefault();
    const code = typed.trim();
    if (code) void submit(code);
    setTyped('');
  };
  const notRsvpd = result?.reason === 'not_attending';
  const accepted = result?.result === 'accepted' || notRsvpd;

  return (
    <div className="grid gap-4">
      {!online && (
        <Alert variant="destructive" className="border-destructive/40">
          <WifiOffIcon />
          <AlertDescription>No connection. Scanning is paused until it is back.</AlertDescription>
        </Alert>
      )}
      {cameraError ? (
        <Alert>
          <CameraOffIcon />
          <AlertDescription className="text-foreground">
            {`Camera unavailable (${cameraError}). Type codes below.`}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl border bg-black shadow-lg">
          <Camera
            onScan={(codes) => {
              const code = codes[0]?.rawValue;
              if (code && online) void submit(code);
            }}
            paused={!online}
            formats={['qr_code']}
            components={{ finder: true, torch: true }}
            allowMultiple
            scanDelay={500}
            onError={(e) => setCameraError(cameraMessage(e))}
          />
        </div>
      )}
      <form className="flex gap-2" onSubmit={onTyped}>
        <Input
          aria-label="QR code or participant ID"
          placeholder="Participant ID (e.g. MZ-0042) or QR code"
          className="bg-card"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <Button type="submit" disabled={!online}>
          Check
        </Button>
      </form>
      {result && (
        <div
          role="status"
          className={cn(
            'grid justify-items-center gap-1 rounded-xl p-6 text-center text-white shadow-lg',
            accepted ? 'bg-success' : 'bg-red-600',
          )}
        >
          {accepted ? (
            <CircleCheckIcon className="size-10" aria-hidden />
          ) : (
            <CircleXIcon className="size-10" aria-hidden />
          )}
          {notRsvpd ? (
            <div className="rounded-md bg-amber-300 px-3 py-1 text-xl font-bold text-amber-950">
              Not RSVP'd
            </div>
          ) : (
            <div className="text-2xl font-bold">{describeScan(result)}</div>
          )}
          {result.participant && (
            <div className="text-white/90">
              {result.participant.name} · {result.participant.participantCode} ·{' '}
              {result.participant.teamName}
            </div>
          )}
          {result.meal && (
            <div className="mt-2 flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-lg font-medium">
              <UtensilsIcon className="size-5" aria-hidden />
              <span>Hand over: {result.meal.label}</span>
            </div>
          )}
          {notRsvpd && scanner && (
            <div className="mt-3 flex gap-2">
              <Button
                className="bg-white text-green-800 hover:bg-white/90"
                onClick={() => void run(() => scanner.markAttendingAndScan(lastCode), lastCode)}
              >
                RSVP
              </Button>
              <Button
                variant="outline"
                className="border-white bg-transparent text-white hover:bg-white/15 hover:text-white"
                onClick={() => void run(() => scanner.allowWithoutRsvp(lastCode), lastCode)}
              >
                Allow
              </Button>
            </div>
          )}
        </div>
      )}
      <ErrorText error={error} />
    </div>
  );
}
