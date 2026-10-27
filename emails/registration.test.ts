import Mustache from 'mustache';
import { describe, expect, it } from 'vitest';
import { registrationDraft, SITE } from './registration.ts';
import { renderSample, sampleView } from './sample.ts';

const parts = Object.entries(registrationDraft);
const MEMBER = ['name', 'email', 'participantCode', 'isLeader', 'linkUrl'];

/** Every variable used outside {{#members}}…{{/members}}. */
function outsideMembers(template: string): string[] {
  const found: string[] = [];
  const walk = (tokens: unknown[][], inMembers: boolean) => {
    for (const [type, name, , , children] of tokens as [
      string,
      string,
      number,
      number,
      unknown[][],
    ][]) {
      if (type === 'text' || type === '!') continue;
      if (!inMembers) found.push(name);
      if (children) walk(children, inMembers || name === 'members');
    }
  };
  walk(Mustache.parse(template) as unknown[][], false);
  return found;
}

describe('the registration email', () => {
  it.each(parts)('%s uses only escaped variables, in the right place', (_, template) => {
    expect(template).not.toContain('{{{');
    expect(template).not.toContain('{{&');
    expect(template).not.toMatch(/\{\{[>=]/);
    for (const name of outsideMembers(template)) expect(MEMBER).not.toContain(name);
  });

  it('uses no number variables (eventKit before 0.7.1 failed on them and sent its default)', () => {
    for (const [, template] of parts) expect(template).not.toContain('memberCount');
  });

  it('carries no QR codes', () => {
    for (const [, template] of parts) {
      expect(template).not.toMatch(/qrToken|cid:/);
      expect(template).not.toMatch(/<img[^>]*qr/i);
    }
  });

  it('loads its images from the live site, as PNG', () => {
    const images = [...registrationDraft.html.matchAll(/<img[^>]*src="([^"]+)"/g)].map(
      (m) => m[1]!,
    );
    expect(images.length).toBeGreaterThan(0);
    for (const src of images) expect(src).toMatch(new RegExp(`^${SITE}/email/.+\\.png$`));
  });

  it('stays small enough that Gmail does not clip it', () => {
    expect(new TextEncoder().encode(renderSample(registrationDraft).html).length).toBeLessThan(
      100_000,
    );
  });

  it("fills in every member's ID and dashboard button, and escapes names", () => {
    const view = {
      ...sampleView,
      team: { name: 'Byte <Club>' },
      members: sampleView.members.map((m, i) => (i === 1 ? { ...m, name: '<b>Ravi</b>' } : m)),
    };
    const mail = renderSample(registrationDraft, view);
    expect(mail.subject).toBe('MachZero: Byte <Club> is registered');
    expect(mail.html).toContain('Byte &lt;Club&gt; is in');
    expect(mail.html).toContain('&lt;b&gt;Ravi&lt;/b&gt;');
    expect(mail.html).not.toContain('<b>Ravi</b>');
    expect(mail.html).toContain('Hi Asha Rao, your team is registered for MachZero.');
    for (const m of view.members) {
      expect(mail.html).toContain(m.participantCode);
      expect(mail.html).toContain(`href="${m.linkUrl}"`);
      expect(mail.text).toContain(m.linkUrl);
    }
    expect(mail.html.match(/>Leader</g)).toHaveLength(1);
    expect(mail.text).toContain('Asha Rao (leader) · MZ-0001');
  });

  it('says to ask the organisers when there are no dashboard links', () => {
    const view = {
      ...sampleView,
      event: { ...sampleView.event, portalUrl: '' },
      members: sampleView.members.map((m) => ({ ...m, linkUrl: '' })),
    };
    const mail = renderSample(registrationDraft, view);
    expect(mail.html).not.toContain('Open dashboard');
    expect(mail.html).not.toContain('Visit the MachZero site');
    expect(mail.html).toContain('Ask the organisers');
    expect(mail.text).toContain('Dashboard link: ask the organisers');
  });
});
