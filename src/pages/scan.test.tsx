import type { Schemas } from '@eventkit/sdk';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { asStaff } from '@/test/fixtures';
import { renderPortal } from '@/test/render';
import { apiError, E, server } from '@/test/server';

// The camera, as buttons: "scan" a code or fail like a browser without camera access.
vi.mock('@yudiel/react-qr-scanner', () => ({
  Scanner: (props: {
    onScan: (codes: { rawValue: string }[]) => void;
    onError: (e: unknown) => void;
  }) => (
    <div>
      <button type="button" onClick={() => props.onScan([{ rawValue: 'qr-camera' }])}>
        Camera sees a code
      </button>
      <button type="button" onClick={() => props.onError({ name: 'NotAllowedError' })}>
        Camera refused
      </button>
      <button type="button" onClick={() => props.onError(new Error('No camera found'))}>
        No camera
      </button>
      <button type="button" onClick={() => props.onError(null)}>
        Camera broke
      </button>
    </div>
  ),
}));

const gate: Schemas['Checkpoint'] = {
  id: 'cp-gate',
  name: 'Gate',
  type: 'entry',
  opensAt: null,
  closesAt: null,
  allowRepeat: false,
  poll: null,
  createdAt: '2026-10-20T10:00:00.000Z',
};
const lunch: Schemas['Checkpoint'] = { ...gate, id: 'cp-lunch', name: 'Lunch', type: 'meal' };

function scanResult(overrides: Partial<Schemas['ScanResult']> = {}): Schemas['ScanResult'] {
  return {
    id: 's1',
    result: 'accepted',
    reason: null,
    scannedAt: '2026-10-31T04:00:00.000Z',
    replayed: false,
    previousScanAt: null,
    checkpoint: { id: gate.id, name: gate.name, type: gate.type },
    meal: null,
    participant: {
      name: 'Ravi',
      participantCode: 'PX-0002',
      teamName: 'Byte Club',
      status: 'checked_in',
    },
    ...overrides,
  };
}

function scanning(
  onScan: (body: {
    qrToken: string;
    checkpointId: string;
    allowWithoutRsvp?: boolean;
  }) => Schemas['ScanResult'] | Response,
) {
  server.use(
    http.get(`${E}/checkpoints`, () => HttpResponse.json([gate, lunch])),
    http.post(`${E}/scans`, async ({ request }) => {
      const r = onScan(
        (await request.json()) as {
          qrToken: string;
          checkpointId: string;
          allowWithoutRsvp?: boolean;
        },
      );
      return r instanceof Response ? r : HttpResponse.json(r, { status: 201 });
    }),
  );
}

describe('the scanner', () => {
  it('remembers the checkpoint and checks someone in by participant ID', async () => {
    const seen: string[] = [];
    scanning((b) => {
      seen.push(`${b.checkpointId}:${b.qrToken}`);
      return scanResult();
    });
    renderPortal('/scan', { session: asStaff('volunteer') });
    expect(await screen.findByText('Choose where you are scanning.')).toBeInTheDocument();
    // The checkpoints load after the page: wait for the option before choosing it.
    await screen.findByRole('option', { name: /Gate/ });
    await userEvent.selectOptions(screen.getByLabelText('Checkpoint'), 'cp-gate');
    expect(window.localStorage.getItem('portal.checkpoint')).toBe('cp-gate');
    await userEvent.type(screen.getByLabelText('QR code or participant ID'), ' PX-0002 ');
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Checked in');
    expect(status).toHaveTextContent('Ravi · PX-0002 · Byte Club');
    expect(seen).toEqual(['cp-gate:PX-0002']);
    expect(screen.getByLabelText('QR code or participant ID')).toHaveValue('');
  });

  it('marks someone attending at the gate when they did not RSVP', async () => {
    let attending = false;
    scanning(() =>
      attending ? scanResult() : scanResult({ result: 'rejected', reason: 'not_attending' }),
    );
    server.use(
      http.post(`${E}/attendance`, () => {
        attending = true;
        return HttpResponse.json({ ok: true });
      }),
    );
    window.localStorage.setItem('portal.checkpoint', 'cp-gate');
    renderPortal('/scan', { session: asStaff('admin') });
    await userEvent.click(await screen.findByRole('button', { name: 'Camera sees a code' }));
    const card = await screen.findByRole('status');
    expect(card).toHaveTextContent("Not RSVP'd");
    expect(card).toHaveTextContent('Ravi · PX-0002 · Byte Club');
    expect(card).toHaveClass('bg-success');
    await userEvent.click(screen.getByRole('button', { name: 'RSVP' }));
    expect(await screen.findByText('Checked in')).toBeInTheDocument();
  });

  it('lets someone in without an RSVP', async () => {
    const sent: (boolean | undefined)[] = [];
    scanning((b) => {
      sent.push(b.allowWithoutRsvp);
      return b.allowWithoutRsvp
        ? scanResult()
        : scanResult({ result: 'rejected', reason: 'not_attending' });
    });
    window.localStorage.setItem('portal.checkpoint', 'cp-gate');
    renderPortal('/scan', { session: asStaff('volunteer') });
    await userEvent.click(await screen.findByRole('button', { name: 'Camera sees a code' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Allow' }));
    expect(await screen.findByText('Checked in')).toBeInTheDocument();
    expect(sent).toEqual([undefined, true]);
    expect(screen.queryByRole('button', { name: 'Allow' })).not.toBeInTheDocument();
  });

  it('says what to hand over at a meal checkpoint', async () => {
    scanning(() =>
      scanResult({
        checkpoint: { id: lunch.id, name: lunch.name, type: 'meal' },
        meal: { label: 'Veg', chosen: true },
      }),
    );
    window.localStorage.setItem('portal.checkpoint', 'cp-lunch');
    renderPortal('/scan', { session: asStaff('volunteer') });
    await userEvent.click(await screen.findByRole('button', { name: 'Camera sees a code' }));
    expect(await screen.findByRole('status')).toHaveTextContent('OK — hand it over');
    expect(screen.getByText('Hand over: Veg')).toBeInTheDocument();
  });

  it('shows a refused scan', async () => {
    scanning(() => apiError(404, 'PARTICIPANT_NOT_FOUND', 'No participant has this code.'));
    window.localStorage.setItem('portal.checkpoint', 'cp-gate');
    renderPortal('/scan', { session: asStaff('volunteer') });
    await userEvent.type(await screen.findByLabelText('QR code or participant ID'), 'PX-9999');
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No participant has this code.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('ignores an empty typed code and forgets a checkpoint that no longer exists', async () => {
    const seen: string[] = [];
    scanning((b) => {
      seen.push(b.qrToken);
      return scanResult();
    });
    window.localStorage.setItem('portal.checkpoint', 'cp-deleted');
    renderPortal('/scan', { session: asStaff('volunteer') });
    expect(await screen.findByRole('option', { name: 'Gate' })).toBeInTheDocument();
    expect(screen.getByText('Choose where you are scanning.')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Checkpoint'), 'cp-gate');
    await userEvent.type(screen.getByLabelText('QR code or participant ID'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(seen).toEqual([]);
  });

  it.each([
    ['Camera refused', 'NotAllowedError'],
    ['No camera', 'No camera found'],
    ['Camera broke', 'no camera'],
  ])('falls back to typing when the camera fails (%s)', async (button, reason) => {
    scanning(() => scanResult());
    window.localStorage.setItem('portal.checkpoint', 'cp-gate');
    renderPortal('/scan', { session: asStaff('volunteer') });
    await userEvent.click(await screen.findByRole('button', { name: button }));
    expect(
      screen.getByText(`Camera unavailable (${reason}). Type codes below.`),
    ).toBeInTheDocument();
  });

  it('pauses while offline', async () => {
    scanning(() => scanResult());
    window.localStorage.setItem('portal.checkpoint', 'cp-gate');
    renderPortal('/scan', { session: asStaff('volunteer') });
    const check = await screen.findByRole('button', { name: 'Check' });
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('No connection.');
    expect(check).toBeDisabled();
    // Back online (TanStack Query's online state is global: later tests need it).
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
  });

  it('shows an error loading the checkpoints', async () => {
    server.use(
      http.get(`${E}/checkpoints`, () => apiError(500, 'INTERNAL', 'Checkpoint trouble.')),
    );
    renderPortal('/scan', { session: asStaff('volunteer') });
    expect(await screen.findByRole('alert')).toHaveTextContent('Checkpoint trouble.');
  });
});
