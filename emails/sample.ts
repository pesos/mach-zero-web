// Fills the template offline with a made-up team, the way eventKit does when it
// sends (Mustache, values HTML-escaped, a one-line subject). For previews and
// tests: no sign-in needed.
import Mustache from 'mustache';

const escapeHtml = (s: string) =>
  String(s).replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!,
  );

const link = (token: string) => `https://machzero.vercel.app/me/${token}`;
const people = [
  {
    name: 'Asha Rao',
    email: 'asha@example.com',
    participantCode: 'MZ-0001',
    isLeader: true,
    linkUrl: link('ek_asha'),
  },
  {
    name: 'Ravi Kumar',
    email: 'ravi@example.com',
    participantCode: 'MZ-0002',
    isLeader: false,
    linkUrl: link('ek_ravi'),
  },
  {
    name: 'Meera Iyer',
    email: 'meera@example.com',
    participantCode: 'MZ-0003',
    isLeader: false,
    linkUrl: link('ek_meera'),
  },
];

export const sampleView = {
  event: {
    name: 'MachZero',
    hostedBy: 'PESOS X Silicon',
    venue: 'MRD Auditorium',
    when: '7 Nov 2026, 8:00 am IST – 8 Nov 2026, 7:00 pm IST',
    startAt: '7 Nov 2026, 8:00 am IST',
    endAt: '8 Nov 2026, 7:00 pm IST',
    portalUrl: 'https://machzero.vercel.app',
  },
  team: { name: 'Byte Club' },
  memberCount: people.length,
  leader: people[0]!,
  members: people,
};

export function renderSample(
  draft: { subject: string; html: string; text: string },
  view: object = sampleView,
) {
  // Mustache hands a custom escape numbers as they are ({{memberCount}}).
  const plain = { escape: String };
  return {
    subject: Mustache.render(draft.subject, view, {}, plain).replace(/\s*[\r\n]+\s*/g, ' '),
    html: Mustache.render(draft.html, view, {}, { escape: escapeHtml }),
    text: Mustache.render(draft.text, view, {}, plain),
  };
}
