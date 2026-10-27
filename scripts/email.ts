// Manage MachZero's registration email on eventKit: npm run email -- <command>
//
//   sample   fill the template offline with a made-up team (no sign-in)
//   preview  ask eventKit to fill it, as it will be sent
//   test     send that to the event owner's inbox
//   save     make it the email teams get
//   reset    go back to eventKit's default
//   show     print what eventKit has now
//
// Every command but `sample` signs in as the event owner, from
// EVENTKIT_API_URL, EVENTKIT_EVENT_ID, EVENTKIT_API_KEY, EVENTKIT_OWNER_EMAIL
// and EVENTKIT_OWNER_PASSWORD. Nothing is written to disk but email-preview.html.
import { writeFileSync } from 'node:fs';
import { createEventKit, isEventKitError } from '@eventkit/sdk';
import { registrationDraft } from '../emails/registration.ts';
import { renderSample } from '../emails/sample.ts';

const OUT = 'email-preview.html';
const command = process.argv[2];
const commands = ['sample', 'preview', 'test', 'save', 'reset', 'show'];

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Set ${name} first.`);
    process.exit(1);
  }
  return value;
}

async function signedIn() {
  const ek = createEventKit({
    apiUrl: env('EVENTKIT_API_URL'),
    apiKey: env('EVENTKIT_API_KEY'),
    eventId: env('EVENTKIT_EVENT_ID'),
  });
  await ek.portal.login(env('EVENTKIT_OWNER_EMAIL'), env('EVENTKIT_OWNER_PASSWORD'));
  return ek.event().emails;
}

function writePreview(mail: { subject: string; html: string }) {
  writeFileSync(OUT, mail.html);
  console.log(`Subject: ${mail.subject}`);
  console.log(`Open ${OUT} in a browser.`);
}

async function main() {
  if (!commands.includes(command ?? '')) {
    console.error(`Usage: npm run email -- <${commands.join('|')}>`);
    process.exit(1);
  }
  if (command === 'sample') return writePreview(renderSample(registrationDraft));

  const emails = await signedIn();
  switch (command) {
    case 'preview':
      return writePreview(await emails.preview('registration', registrationDraft));
    case 'test': {
      const sent = await emails.sendTest('registration', registrationDraft);
      return console.log(`Sent to ${sent.to}. Check the spam folder too.`);
    }
    case 'save':
      await emails.save('registration', registrationDraft);
      return console.log('Saved: teams now get this email.');
    case 'reset':
      await emails.reset('registration');
      return console.log("Reset: teams get eventKit's default email.");
    case 'show': {
      const t = await emails.get('registration');
      console.log(t.custom ? `Custom, saved ${t.updatedAt}` : "eventKit's default");
      console.log(`Subject: ${t.subject}`);
      return console.log(`Variables: ${t.variables.map((v) => v.name).join(', ')}`);
    }
  }
}

main().catch((err: unknown) => {
  if (isEventKitError(err)) {
    console.error(`${err.code}: ${err.message}`);
    if (err.code === 'INVALID_TEMPLATE' && Array.isArray(err.details)) {
      for (const d of err.details as { message: string }[]) console.error(`  - ${d.message}`);
    }
  } else {
    console.error(err instanceof Error ? err.message : err);
  }
  process.exit(1);
});
