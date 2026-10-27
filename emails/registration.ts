// The email eventKit sends the team leader once a team registers, in the
// portal's night theme. eventKit fills the {{…}} variables and escapes them;
// save it with `npm run email -- save` (see README). Mail apps run no scripts,
// so every button is a link.
import { registrationEmail as t } from '@eventkit/sdk';

/** Where the email's images live (public/email on the deployed portal). */
export const SITE = 'https://machzero.vercel.app';

// The portal's dark tokens (src/index.css).
const c = {
  sky: '#1a1b2f',
  card: '#23243c',
  muted: '#2a2a43',
  border: '#36354f',
  text: '#ebe5f6',
  soft: '#a69dc2',
  lavender: '#a996e6',
  ink: '#1a1b2f',
  haze: '#4a3f72',
};
const font = "'Space Grotesk',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const display =
  "Audiowide,'Space Grotesk',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** A rounded panel like the portal's cards. */
const card = (body: string, extra = '') =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.card}" style="background:${c.card};border:1px solid ${c.border};border-radius:14px;${extra}"><tr><td style="padding:22px 24px">${body}</td></tr></table>`;

const gap = (px: number) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:${px}px;line-height:${px}px;font-size:0">&nbsp;</td></tr></table>`;

const label = (text: string) =>
  `<div style="font-size:12px;color:${c.soft};margin:0 0 2px">${text}</div>`;

const fact = (name: string, value: string, side: 'left' | 'right') =>
  `<td class="fact" width="50%" valign="top" style="padding:${side === 'left' ? '0 6px 0 0' : '0 0 0 6px'}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.card}" style="background:${c.card};border:1px solid ${c.border};border-radius:12px"><tr><td style="padding:14px 16px">${label(name)}<div style="font-size:14px;font-weight:600;color:${c.text};line-height:1.4">${value}</div></td></tr></table></td>`;

const leaderBadge = `<span style="display:inline-block;margin-left:6px;padding:2px 9px;border-radius:999px;background:${c.lavender};color:${c.ink};font-size:11px;font-weight:600;vertical-align:2px">Leader</span>`;

const member = t.eachMember(
  (m) =>
    gap(10) +
    card(
      `<div style="font-size:17px;font-weight:600;color:${c.text}">${m.name}${t.when(m.isLeader, leaderBadge)}</div>
<div style="margin-top:6px;font-size:13px;color:${c.soft}">Participant ID <span style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:14px;font-weight:700;color:${c.text};letter-spacing:0.5px">${m.participantCode}</span></div>
${t.when(
  m.dashboardUrl,
  `<div style="margin-top:14px">${t.button({ href: m.dashboardUrl, label: 'Open dashboard', background: c.lavender, color: c.ink, radius: '10px' })}</div>`,
)}${t.unless(
        m.dashboardUrl,
        `<div style="margin-top:10px;font-size:13px;color:${c.soft}">Ask the organisers for this member's dashboard link.</div>`,
      )}`,
    ),
);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${t.team.name} is registered for ${t.event.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Audiowide&amp;family=Space+Grotesk:wght@400;600&amp;display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: 0; }
  a { color: ${c.lavender}; }
  @media (max-width: 480px) {
    .px { padding-left: 14px !important; padding-right: 14px !important; }
    .fact { display: block !important; width: 100% !important; padding: 0 0 10px !important; }
  }
</style>
</head>
<body bgcolor="${c.sky}" style="margin:0;padding:0;background:${c.sky};color:${c.text};font-family:${font}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Everyone's participant ID and dashboard link for ${t.event.name}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.sky}" style="background:${c.sky}">
<tr><td align="center" class="px" style="padding:32px 20px 40px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">

<tr><td align="center" style="padding-bottom:18px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td><img src="${SITE}/email/pesos.png" width="44" height="44" alt="PESOS" style="display:block;border:0"></td>
    <td style="padding:0 10px;color:${c.soft};font-size:13px">×</td>
    <td><img src="${SITE}/email/silicon.png" width="44" height="44" alt="Silicon" style="display:block;border:0"></td>
  </tr></table>
</td></tr>

<tr><td align="center">
  <span style="display:inline-block;padding:5px 14px;border:1px solid ${c.border};border-radius:999px;background:${c.card};font-family:${display};font-size:11px;letter-spacing:3px;color:${c.text}">PESOS x SILICON PRESENTS</span>
</td></tr>

<tr><td align="center" style="padding:20px 0 8px">
  <img src="${SITE}/email/wordmark.png" width="440" alt="MachZero" style="display:block;width:100%;max-width:440px;height:auto;border:0">
</td></tr>
<tr><td align="center" style="padding-bottom:24px;font-size:16px;color:${c.soft}">A 2 day contribution spree.</td></tr>

<tr><td>
${card(
  `<div style="display:inline-block;padding:4px 12px;border-radius:999px;background:${c.lavender};color:${c.ink};font-size:13px;font-weight:600">&#10003; Registered</div>
<h1 style="margin:14px 0 6px;font-family:${display};font-size:24px;font-weight:400;line-height:1.25;color:${c.text}">${t.team.name} is in</h1>
<p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:${c.text}">Hi ${t.leader.name}, your team is registered for ${t.event.name}.</p>
<p style="margin:0;font-size:14px;line-height:1.6;color:${c.soft}">Below is everyone's participant ID and personal dashboard link. Send each member <strong style="color:${c.text}">only their own</strong> link: anyone who has it can open that member's page.</p>`,
  `border-color:${c.haze}`,
)}
</td></tr>

<tr><td style="padding-top:12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    ${fact('When', t.event.when, 'left')}
    ${fact('Where', t.event.venue, 'right')}
  </tr></table>
</td></tr>

<tr><td style="padding-top:22px">
  <div style="font-family:${display};font-size:18px;color:${c.text}">Your team</div>
  ${member}
</td></tr>

<tr><td style="padding-top:22px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.muted}" style="background:${c.muted};border-radius:12px"><tr><td style="padding:16px 18px;font-size:14px;line-height:1.6;color:${c.text}">
    <strong>Check-in QR codes</strong><br>
    <span style="color:${c.soft}">Each member's QR code appears on their dashboard once your team is confirmed. Show it at the entry and checkpoints, or say your participant ID.</span>
  </td></tr></table>
</td></tr>

${t.when(
  t.links.portal,
  `<tr><td align="center" style="padding-top:26px">${t.button({ href: t.links.portal, label: 'Visit the MachZero site', background: c.card, color: c.text, radius: '10px' })}</td></tr>`,
)}

<tr><td align="center" style="padding-top:28px;font-size:12px;line-height:1.6;color:${c.soft}">
  ${t.event.name} · ${t.event.venue}<br>
  You're getting this because you registered a team for ${t.event.name}.
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
`;

const text = `Hi ${t.leader.name},

${t.team.name} is registered for ${t.event.name}: ${t.event.when}, ${t.event.venue}.

Below is everyone's participant ID and personal dashboard link. Send each member only their own link: anyone who has it can open that member's page.

${t.eachMember(
  (m) => `${m.name}${t.when(m.isLeader, ' (leader)')} · ${m.participantCode}
  ${t.when(m.dashboardUrl, m.dashboardUrl)}${t.unless(m.dashboardUrl, 'Dashboard link: ask the organisers')}

`,
)}Each member's check-in QR code appears on their dashboard once your team is confirmed.
${t.when(t.links.portal, `\n${t.links.portal}\n`)}
PESOS x SILICON presents ${t.event.name}.
`;

export const registrationDraft = {
  subject: `${t.event.name}: ${t.team.name} is registered`,
  html,
  text,
};
