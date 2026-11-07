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

const doorCp: Schemas['Checkpoint'] = {
  id: 'cp-door',
  name: 'Venue door',
  type: 'gate',
  opensAt: null,
  closesAt: null,
  allowRepeat: false,
  poll: null,
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

describe('entry & exit checkpoints', () => {
  it('after scanning someone inside, shows who it is and a reason to pick, then sends it', async () => {
    const bodies: { exitReason?: string }[] = [];
    server.use(
      http.get(`${E}/checkpoints`, () => HttpResponse.json([doorCp])),
      http.get(`${E}/scans`, () => HttpResponse.json([])),
      http.post(`${E}/scans`, async ({ request }) => {
        const body = (await request.json()) as { exitReason?: string };
        bodies.push(body);
        if (!body.exitReason) {
          return HttpResponse.json(
            {
              error: {
                code: 'EXIT_REASON_REQUIRED',
                message: 'Choose why they are leaving.',
                details: {
                  participant: { name: 'Ravi', participantCode: 'PX-0002', teamName: 'Byte Club' },
                },
              },
            },
            { status: 400 },
          );
        }
        return HttpResponse.json({
          id: 's1',
          result: 'accepted',
          reason: null,
          scannedAt: '2026-10-31T04:00:00.000Z',
          replayed: false,
          previousScanAt: null,
          checkpoint: { id: 'cp-door', name: 'Venue door', type: 'gate' },
          meal: null,
          participant: {
            name: 'Ravi',
            participantCode: 'PX-0002',
            teamName: 'Byte Club',
            status: 'checked_in',
          },
          reentry: false,
          exitReason: body.exitReason,
          offline: false,
        });
      }),
    );
    window.localStorage.setItem('portal.checkpoint', 'cp-door');
    renderPortal('/scan', { session: asStaff('volunteer') });
    await userEvent.click(await screen.findByRole('button', { name: 'Camera sees a code' }));
    const panel = await screen.findByRole('region', { name: 'Going out' });
    expect(panel).toHaveTextContent('Ravi is going out');
    expect(within(panel).getByRole('button', { name: 'Mark as left' })).toBeDisabled();
    await userEvent.click(within(panel).getByRole('combobox', { name: 'Reason' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Emergency' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mark as left' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Out: Emergency');
    expect(bodies.map((b) => b.exitReason)).toEqual([undefined, 'Emergency']);
    expect(screen.queryByRole('region', { name: 'Going out' })).toBeNull();
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
    // Small screens fold the ID, team and reason under the name; wide ones have columns.
    for (const text of ['PX-0002', 'Ravi', 'Byte Club', '—', 'Bathroom', 'via Gate out']) {
      expect(row).toHaveTextContent(text);
    }
    expect(row).toHaveTextContent(/7 min ago$/);
    expect(screen.getByText('1 outside')).toBeInTheDocument();
  });

  it('is for staff only', async () => {
    renderPortal('/outside', { session: asParticipant() });
    await waitFor(() => expect(screen.queryByRole('table')).toBeNull());
  });
});
