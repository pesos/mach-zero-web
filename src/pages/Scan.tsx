import { describeScan, type ScanResult, type Schemas } from '@eventkit/sdk';
import { useEventQuery, useScanner } from '@eventkit/sdk/react';
import { Scanner as Camera } from '@yudiel/react-qr-scanner';
import {
  CameraOffIcon,
  CircleCheckIcon,
  CircleXIcon,
  CloudUploadIcon,
  UtensilsIcon,
  WifiOffIcon,
} from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { ErrorText } from '@/components/ErrorText';
import { ExitReasonDialog } from '@/components/ExitReasonDialog';
import { ScanLog } from '@/components/ScanLog';
import { StaffOnly } from '@/components/StaffOnly';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type Checkpoint = Schemas['Checkpoint'];

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

/**
 * Check-in: camera, or a typed QR token / participant ID. Keeps going offline
 * from the checkpoint's cached list; exit checkpoints ask why someone is leaving.
 */
function ScanPage() {
  const checkpoints = useEventQuery('checkpoints', (e) => e.checkpoints.list());
  const [checkpointId, setCheckpointId] = useState(remembered);
  const checkpoint = checkpoints.data?.find((c) => c.id === checkpointId);
  const valid = checkpoint ? checkpointId : '';
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
      {checkpoint ? (
        <Scanning key={checkpoint.id} checkpoint={checkpoint} />
      ) : (
        <p className="text-sm text-muted-foreground">Choose where you are scanning.</p>
      )}
    </div>
  );
}

/** Shows the pause between scans running out, so volunteers know when to scan the next. */
function PauseBar({ until }: { until: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [until]);
  const left = Math.max(0, until - now);
  if (left === 0) return null;
  return <Progress aria-label="Ready for the next scan" value={100 - (left / 1200) * 100} />;
}

function Scanning({ checkpoint }: { checkpoint: Checkpoint }) {
  const state = useScanner({ checkpointId: checkpoint.id });
  const { scanner, online, offlineReady, pendingCount } = state;
  const event = useEventQuery('event', (e) => e.get());
  const [result, setResult] = useState<ScanResult | null>(null);
  const [lastCode, setLastCode] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [typed, setTyped] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** An exit scan waiting for its reason. */
  const [leaving, setLeaving] = useState<string | null>(null);
  const [pausedUntil, setPausedUntil] = useState(0);
  const canScan = (online || offlineReady) && !busy && !leaving;

  const run = async (fn: () => Promise<ScanResult | null>, code: string) => {
    setBusy(true);
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
    } finally {
      setBusy(false);
      if (scanner) setPausedUntil(scanner.pausedUntil);
    }
  };
  const submit = (code: string, force = false, exitReason?: string) => {
    if (!scanner) return;
    if (checkpoint.type === 'exit' && !exitReason) {
      setLeaving(code);
      return;
    }
    void run(() => scanner.scan(code, { force, ...(exitReason ? { exitReason } : {}) }), code);
  };
  const onTyped = (e: FormEvent) => {
    e.preventDefault();
    const code = typed.trim();
    if (code) submit(code, true);
    setTyped('');
  };
  const notRsvpd = result?.reason === 'not_attending';
  const accepted = result?.result === 'accepted' || notRsvpd;

  return (
    <div className="grid gap-4">
      {!online && (
        <Alert
          variant={offlineReady ? 'default' : 'destructive'}
          className={offlineReady ? 'border-amber-500/50' : 'border-destructive/40'}
        >
          <WifiOffIcon />
          <AlertTitle>You&apos;re offline</AlertTitle>
          <AlertDescription>
            {offlineReady
              ? 'Offline scan mode is on: scans are checked on this phone and sent when the connection is back.'
              : 'Scanning is paused: this checkpoint has no offline list yet. Open it once while online.'}
          </AlertDescription>
        </Alert>
      )}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
          <span className="flex items-center gap-2">
            <CloudUploadIcon className="size-4" aria-hidden /> Waiting to sync
          </span>
          <Badge variant="secondary" aria-label={`${pendingCount} scans waiting to sync`}>
            {pendingCount}
          </Badge>
        </div>
      )}
      {cameraError ? (
        <Alert>
          <CameraOffIcon />
          <AlertDescription className="text-foreground">
            {`Camera unavailable (${cameraError}). Type codes below.`}
          </AlertDescription>
        </Alert>
      ) : (
        <div
          className={cn(
            'mx-auto w-full max-w-md overflow-hidden rounded-xl border bg-black shadow-lg',
            !canScan && 'opacity-60',
          )}
        >
          <Camera
            onScan={(codes) => {
              const code = codes[0]?.rawValue;
              if (code && canScan) submit(code);
            }}
            paused={!canScan}
            formats={['qr_code']}
            components={{ finder: true, torch: true }}
            allowMultiple
            scanDelay={500}
            onError={(e) => setCameraError(cameraMessage(e))}
          />
        </div>
      )}
      <PauseBar until={pausedUntil} />
      <form className="flex gap-2" onSubmit={onTyped}>
        <Input
          aria-label="QR code or participant ID"
          placeholder="Participant ID (e.g. MZ-0042) or QR code"
          className="bg-card"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <Button type="submit" disabled={!canScan}>
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
          {result.offline && (
            <div className="text-xs text-white/90">Checked offline · sent when back online</div>
          )}
          {notRsvpd && scanner && online && (
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
      <ScanLog state={state} checkpointId={checkpoint.id} />
      <ExitReasonDialog
        code={leaving}
        reasons={event.data?.event.exitReasons ?? []}
        onCancel={() => setLeaving(null)}
        onConfirm={(reason) => {
          const code = leaving!;
          setLeaving(null);
          submit(code, true, reason);
        }}
      />
    </div>
  );
}
