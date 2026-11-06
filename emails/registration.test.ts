import Mustache from 'mustache';
import { describe, expect, it } from 'vitest';
import { registrationDraft } from './registration.ts';
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

  it('greets the leader with their own ID and pass button, and escapes names', () => {
    const view = {
      ...sampleView,
      team: { name: 'Byte <Club>' },
      member: { ...sampleView.member, name: '<b>Asha</b>' },
      members: sampleView.members.map((m, i) => (i === 0 ? { ...m, name: '<b>Asha</b>' } : m)),
    };
    const mail = renderSample(registrationDraft, view);
    expect(mail.subject).toBe('MachZero (PESOS X Silicon)');
    expect(mail.html).toContain('Byte &lt;Club&gt; is in');
    expect(mail.html).toContain('Hi &lt;b&gt;Asha&lt;/b&gt;');
    expect(mail.html).not.toContain('<b>Asha</b>');
    expect(mail.html).toContain(view.member.participantCode);
    expect(mail.html).toContain(`href="${view.member.linkUrl}"`);
    expect(mail.text).toContain(`Your pass: ${view.member.linkUrl}`);
    expect(mail.text).toContain('Your participant ID: MZ-0001');
    expect(mail.html).toContain('you lead a team');
  });

  it('lists every teammate with their own link, for the leader to send on', () => {
    const mail = renderSample(registrationDraft);
    for (const m of sampleView.members) {
      expect(mail.html).toContain(m.name);
      expect(mail.html).toContain(`href="${m.linkUrl}"`);
      expect(mail.text).toContain(`- ${m.name}`);
      expect(mail.text).toContain(m.linkUrl);
    }
    expect(mail.html.match(/>Leader</g)).toHaveLength(1);
    expect(mail.text).toContain('- Asha Rao (leader)');
    expect(mail.text).toContain('Send each teammate their own link');
    expect(mail.html).not.toContain('old one has stopped working');
  });

  it('gives the leader a replaced teammate link to send on', () => {
    const url = 'https://machzero.vercel.app/me/ek_ravi_new';
    const view = {
      ...sampleView,
      member: { ...sampleView.member, linkUrl: '' },
      members: sampleView.members.map((m, i) => ({ ...m, linkUrl: i === 1 ? url : '' })),
      linkReplaced: true,
      replaced: { name: 'Ravi Kumar', linkUrl: url },
    };
    const mail = renderSample(registrationDraft, view);
    expect(mail.html).toContain('New link for Ravi Kumar.');
    expect(mail.html).toContain(`href="${url}"`);
    expect(mail.text).toContain(
      `New link for Ravi Kumar: their old one has stopped working. Send them this one:\n${url}`,
    );
    // Only that one link, and no "ask the organisers" or "send each teammate" lines.
    expect(mail.html).not.toContain('ek_meera');
    expect(mail.html).not.toContain('Ask the organisers');
    expect(mail.html).not.toContain('Send each teammate');
    expect(mail.html).not.toContain('Open my pass');
  });

  it('gives the leader the link of a member who joined later', () => {
    const url = 'https://machzero.vercel.app/me/ek_dev';
    const view = {
      ...sampleView,
      member: { ...sampleView.member, linkUrl: '' },
      members: [
        ...sampleView.members.map((m) => ({ ...m, linkUrl: '' })),
        {
          name: 'Dev Shah',
          email: 'dev@example.com',
          participantCode: 'MZ-0004',
          isLeader: false,
          linkUrl: url,
        },
      ],
      memberAdded: true,
      added: { name: 'Dev Shah', linkUrl: url },
    };
    const mail = renderSample(registrationDraft, view);
    expect(mail.html).toContain('Dev Shah joined Byte Club.');
    expect(mail.text).toContain(`Dev Shah joined Byte Club. Send them their pass link:\n${url}`);
    expect(mail.html).not.toContain('Ask the organisers');
  });

  it('says to ask the organisers when there is no dashboard link', () => {
    const view = {
      ...sampleView,
      event: { ...sampleView.event, portalUrl: '' },
      member: { ...sampleView.member, linkUrl: '' },
      members: sampleView.members.map((m) => ({ ...m, linkUrl: '' })),
    };
    const mail = renderSample(registrationDraft, view);
    expect(mail.html).not.toContain('Open my pass');
    expect(mail.html).not.toContain('Visit the MachZero site');
    expect(mail.html).toContain('Ask the organisers');
    expect(mail.text).toContain('ask the organisers');
  });
});
