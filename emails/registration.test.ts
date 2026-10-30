import Mustache from 'mustache';
import { describe, expect, it } from 'vitest';
import { registrationDraft } from './registration.ts';
import { renderSample, sampleView } from './sample.ts';

const parts = Object.entries(registrationDraft);
const MEMBER = ['name', 'email', 'participantCode', 'isLeader'];

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

  it('has no images, web fonts or hidden text (spam filters count them)', () => {
    const { html } = registrationDraft;
    expect(html).not.toMatch(/<img|background-image|url\(/i);
    expect(html).not.toMatch(/<link|@import|fonts\.googleapis/i);
    expect(html).not.toMatch(/display:\s*none/i);
  });

  it('stays small enough that Gmail does not clip it', () => {
    expect(new TextEncoder().encode(renderSample(registrationDraft).html).length).toBeLessThan(
      100_000,
    );
  });

  it('greets the recipient with their own ID and dashboard button, and escapes names', () => {
    const view = {
      ...sampleView,
      team: { name: 'Byte <Club>' },
      member: { ...sampleView.member, name: '<b>Ravi</b>' },
      members: sampleView.members.map((m, i) => (i === 1 ? { ...m, name: '<b>Ravi</b>' } : m)),
    };
    const mail = renderSample(registrationDraft, view);
    expect(mail.subject).toBe('MachZero (PESOS X Silicon)');
    expect(mail.html).toContain('Byte &lt;Club&gt; is in');
    expect(mail.html).toContain('Hi &lt;b&gt;Ravi&lt;/b&gt;');
    expect(mail.html).not.toContain('<b>Ravi</b>');
    expect(mail.html).toContain(view.member.participantCode);
    expect(mail.html).toContain(`href="${view.member.linkUrl}"`);
    expect(mail.text).toContain(`Your pass: ${view.member.linkUrl}`);
    expect(mail.text).toContain('Your participant ID: MZ-0002');
  });

  it("lists the team's member names without anyone else's link", () => {
    const mail = renderSample(registrationDraft);
    for (const m of sampleView.members) {
      expect(mail.html).toContain(m.name);
      expect(mail.text).toContain(`- ${m.name}`);
    }
    expect(mail.html.match(/>Leader</g)).toHaveLength(1);
    expect(mail.text).toContain('- Asha Rao (leader)');
    expect(mail.html).not.toContain('ek_asha');
    expect(mail.text).not.toContain('ek_meera');
  });

  it('says a link was replaced only when it was', () => {
    const plain = renderSample(registrationDraft);
    expect(plain.html).not.toContain('old one has stopped working');
    expect(plain.text).not.toContain('old one has stopped working');
    const again = renderSample(registrationDraft, { ...sampleView, linkReplaced: true });
    expect(again.html).toContain('old one has stopped working');
    expect(again.text).toContain('old one has stopped working');
  });

  it('says to ask the organisers when there is no dashboard link', () => {
    const view = {
      ...sampleView,
      event: { ...sampleView.event, portalUrl: '' },
      member: { ...sampleView.member, linkUrl: '' },
    };
    const mail = renderSample(registrationDraft, view);
    expect(mail.html).not.toContain('Open my pass');
    expect(mail.html).not.toContain('Visit the MachZero site');
    expect(mail.html).toContain('Ask the organisers');
    expect(mail.text).toContain('ask the organisers');
  });
});
