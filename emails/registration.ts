// The email eventKit sends each member (separately) once a team registers, in the
// portal's night theme. eventKit fills the {{…}} variables and escapes them;
// save it with `npm run email -- save` (see README). Mail apps run no scripts,
// so every button is a link. No images, web fonts or hidden text: spam filters
// count them against a sender, and Gmail blocks images in spam anyway.
import { registrationEmail as t } from '@eventkit/sdk';

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

const label = (text: string) =>
  `<div style="font-size:12px;color:${c.soft};margin:0 0 2px">${text}</div>`;

const fact = (name: string, value: string, side: 'left' | 'right') =>
  `<td class="fact" width="50%" valign="top" style="padding:${side === 'left' ? '0 6px 0 0' : '0 0 0 6px'}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.card}" style="background:${c.card};border:1px solid ${c.border};border-radius:12px"><tr><td style="padding:14px 16px">${label(name)}<div style="font-size:14px;font-weight:600;color:${c.text};line-height:1.4">${value}</div></td></tr></table></td>`;

const leaderBadge = `<span style="display:inline-block;margin-left:6px;padding:2px 9px;border-radius:999px;background:${c.lavender};color:${c.ink};font-size:11px;font-weight:600;vertical-align:2px">Leader</span>`;

const memberRow = t.eachMember(
  (m) =>
    `<div style="padding:6px 0;font-size:14px;color:${c.text}">${m.name}${t.when(m.isLeader, leaderBadge)}</div>`,
);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${t.event.name} (${t.event.hostedBy})</title>
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
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.sky}" style="background:${c.sky}">
<tr><td align="center" class="px" style="padding:32px 20px 40px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">

<tr><td align="center">
  <span style="display:inline-block;padding:5px 14px;border:1px solid ${c.border};border-radius:999px;background:${c.card};font-family:${display};font-size:11px;letter-spacing:3px;color:${c.text}">PESOS x SILICON PRESENTS</span>
</td></tr>

<tr><td align="center" style="padding:22px 0 6px;font-family:${display};font-size:44px;line-height:1.1;letter-spacing:2px;color:${c.lavender}">MACH ZERO</td></tr>
<tr><td align="center" style="padding-bottom:24px;font-size:16px;color:${c.soft}">A 2 day contribution spree.</td></tr>

<tr><td>
${card(
  `<div style="display:inline-block;padding:4px 12px;border-radius:999px;background:${c.lavender};color:${c.ink};font-size:13px;font-weight:600">&#10003; Registered</div>
<h1 style="margin:14px 0 6px;font-family:${display};font-size:24px;font-weight:400;line-height:1.25;color:${c.text}">${t.team.name} is in</h1>
<p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:${c.text}">Hi ${t.member.name}, you're registered for ${t.event.name}.</p>
${t.when(t.linkReplaced, `<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:${c.soft}">This is a new link for you: the old one has stopped working.</p>`)}
<div style="margin:14px 0 0;font-size:13px;color:${c.soft}">Your participant ID <span style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:16px;font-weight:700;color:${c.text};letter-spacing:0.5px">${t.member.participantCode}</span></div>
${t.when(
  t.links.dashboard,
  `<div style="margin-top:16px">${t.button({ href: t.links.dashboard, label: 'Open my pass', background: c.lavender, color: c.ink, radius: '10px' })}</div>
<p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:${c.soft}">This link is yours alone: anyone who has it can open your page.</p>`,
)}${t.unless(
    t.links.dashboard,
    `<p style="margin:12px 0 0;font-size:13px;color:${c.soft}">Ask the organisers for your dashboard link.</p>`,
  )}`,
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
  <div style="font-family:${display};font-size:18px;color:${c.text};padding-bottom:6px">Team ${t.team.name}</div>
  ${memberRow}
</td></tr>

<tr><td style="padding-top:22px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.muted}" style="background:${c.muted};border-radius:12px"><tr><td style="padding:16px 18px;font-size:14px;line-height:1.6;color:${c.text}">
    <strong>Check-in QR codes</strong><br>
    <span style="color:${c.soft}">Your QR code appears on your dashboard once your team is confirmed. Show it at the entry and checkpoints, or say your participant ID.</span>
  </td></tr></table>
</td></tr>

${t.when(
  t.links.portal,
  `<tr><td align="center" style="padding-top:26px">${t.button({ href: t.links.portal, label: 'Visit the MachZero site', background: c.card, color: c.text, radius: '10px' })}</td></tr>`,
)}

<tr><td align="center" style="padding-top:28px;font-size:12px;line-height:1.6;color:${c.soft}">
  ${t.event.name} · ${t.event.venue}<br>
  You're getting this because you're on a team registered for ${t.event.name}.
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
`;

const text = `Hi ${t.member.name},

You're registered for ${t.event.name}, hosted by ${t.event.hostedBy}: ${t.event.when}, ${t.event.venue}.
${t.when(t.linkReplaced, '\nThis is a new link for you: the old one has stopped working.\n')}
Your participant ID: ${t.member.participantCode}
${t.when(t.links.dashboard, `Your pass: ${t.links.dashboard}\nThis link is yours alone: anyone who has it can open your page.`)}${t.unless(t.links.dashboard, 'Your dashboard link: ask the organisers')}

Team ${t.team.name}:
${t.eachMember((m) => `- ${m.name}${t.when(m.isLeader, ' (leader)')}\n`)}
Your check-in QR code appears on your dashboard once your team is confirmed.
${t.when(t.links.portal, `\n${t.links.portal}\n`)}
PESOS x SILICON presents ${t.event.name}.
`;

export const registrationDraft = {
  subject: `${t.event.name} (${t.event.hostedBy})`,
  html,
  text,
};
