import { describeScan, type ScanResult } from '@eventkit/sdk';
import { useEventQuery, useScanner } from '@eventkit/sdk/react';
import { Scanner as Camera } from '@yudiel/react-qr-scanner';
import { type FormEvent, useState } from 'react';
import { ErrorText } from '@/components/ErrorText';
import { StaffOnly } from '@/components/StaffOnly';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
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
      <div className="grid gap-1">
        <Label htmlFor="checkpoint">Checkpoint</Label>
        <Select
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
          <option value="">Choose a checkpoint…</option>
          {checkpoints.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <ErrorText error={checkpoints.error} />
      </div>
      {valid ? (
        <Scanning checkpointId={valid} />
      ) : (
        <p className="text-muted-foreground">Choose where you are scanning.</p>
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

  return (
    <div className="grid gap-4">
      {!online && (
        <Alert variant="destructive" role="alert">
          No connection. Scanning is paused until it is back.
        </Alert>
      )}
      {cameraError ? (
        <Alert>Camera unavailable ({cameraError}). Type codes below.</Alert>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-black">
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
            'rounded-lg p-4 text-center',
            result.result === 'accepted' ? 'bg-green-600 text-white' : 'bg-red-600 text-white',
          )}
        >
          <div className="text-2xl font-bold">{describeScan(result)}</div>
          {result.participant && (
            <div>
              {result.participant.name} · {result.participant.participantCode} ·{' '}
              {result.participant.teamName}
            </div>
          )}
          {result.meal && <div className="mt-1 text-lg">Hand over: {result.meal.label}</div>}
          {result.reason === 'not_attending' && scanner && (
            <Button
              className="mt-2 bg-white text-red-700 hover:bg-white/90"
              variant="outline"
              onClick={() => void run(() => scanner.markAttendingAndScan(lastCode), lastCode)}
            >
              Mark attending and check in
            </Button>
          )}
        </div>
      )}
      <ErrorText error={error} />
    </div>
  );
}
