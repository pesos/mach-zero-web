import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import type { Schemas } from '@eventkit/sdk';
import { asParticipant, asStaff } from '@/test/fixtures';
import { renderPortal } from '@/test/render';
import { E, server } from '@/test/server';

vi.mock('@yudiel/react-qr-scanner', () => ({
  Scanner: (props: { onScan: (codes: { rawValue: string }[]) => void }) => (
    <button type="button" onClick={() => props.onScan([{ rawValue: 'qr-ravi' }])}>
      Camera sees a code
    </button>
  ),
}));

const exitCp: Schemas['Checkpoint'] = {
  id: 'cp-out',
  name: 'Gate out',
  type: 'exit',
  opensAt: null,
  closesAt: null,
  allowRepeat: false,
  poll: null,
  linkedCheckpointId: 'cp-gate',
  createdAt: '2026-10-20T10:00:00.000Z',
};

describe('stages notice', () => {
  it('tells registered and shortlisted people to keep checking', async () => {
    renderPortal('/me', { session: asParticipant({ status: 'shortlisted' }) });
    expect(
      await screen.findByText(/released in stages — keep checking this portal for updates/),
    ).toBeInTheDocument();
    expect(screen.getByText('Your team is shortlisted.')).toBeInTheDocument();
  });

  it('is gone once confirmed, and the RSVP card comes first', async () => {
    renderPortal('/me', { session: asParticipant({ status: 'confirmed' }) });
    const rsvp = await screen.findByRole('button', { name: 'I will attend' });
    expect(screen.queryByText(/keep checking this portal/)).toBeNull();
    const qr = screen.getByTitle('Your check-in QR code');
    // The RSVP button comes before the QR code in the page.
    expect(rsvp.compareDocumentPosition(qr) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('exit checkpoints', () => {
  it('asks why they are leaving, then sends the scan with the reason', async () => {
    const bodies: { exitReason?: string }[] = [];
    server.use(
      http.get(`${E}/checkpoints`, () => HttpResponse.json([exitCp])),
      http.get(`${E}/scans`, () => HttpResponse.json([])),
      http.post(`${E}/scans`, async ({ request }) => {
        bodies.push((await request.json()) as { exitReason?: string });
        return HttpResponse.json({
          id: 's1',
          result: 'accepted',
          reason: null,
          scannedAt: '2026-10-31T04:00:00.000Z',
          replayed: false,
          previousScanAt: null,
          checkpoint: { id: 'cp-out', name: 'Gate out', type: 'exit' },
          meal: null,
          participant: {
            name: 'Ravi',
            participantCode: 'PX-0002',
            teamName: 'Byte Club',
            status: 'checked_in',
          },
          reentry: false,
          exitReason: 'Emergency',
          offline: false,
        });
      }),
    );
    window.localStorage.setItem('portal.checkpoint', 'cp-out');
    renderPortal('/scan', { session: asStaff('volunteer') });
    await userEvent.click(await screen.findByRole('button', { name: 'Camera sees a code' }));
    const dialog = await screen.findByRole('dialog', { name: 'Why are they leaving?' });
    expect(bodies).toHaveLength(0);
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Reason' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Emergency' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mark as left' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Left: Emergency');
    expect(bodies[0]).toMatchObject({ qrToken: 'qr-ravi', exitReason: 'Emergency' });
  });
});

describe('outside now', () => {
  it('lists people outside with phone or a dash, and how long ago they left', async () => {
    const ago = (min: number) => new Date(Date.now() - min * 60_000 - 5_000).toISOString();
    server.use(
      http.get(`${E}/scans/outside`, () =>
        HttpResponse.json([
          {
            registrationId: 'r2',
            participantCode: 'PX-0002',
            name: 'Ravi',
            teamName: 'Byte Club',
            phone: null,
            outsideSince: ago(7),
            reason: 'Bathroom',
            checkpointName: 'Gate out',
          },
        ]),
      ),
    );
    renderPortal('/outside', { session: asStaff('volunteer') });
    const row = await screen.findByRole('row', { name: /Ravi/ });
    expect(row).toHaveTextContent('PX-0002RaviByte Club—Bathroomvia Gate out7 min ago');
    expect(screen.getByText('1 outside')).toBeInTheDocument();
  });

  it('is for staff only', async () => {
    renderPortal('/outside', { session: asParticipant() });
    await waitFor(() => expect(screen.queryByRole('table')).toBeNull());
  });
});
