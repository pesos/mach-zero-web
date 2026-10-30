// Runs before `npm run build`: saves the registration email to eventKit when the
// owner's credentials are all set, and otherwise skips without failing the build.
import { spawnSync } from 'node:child_process';

const NEEDED = [
  'EVENTKIT_API_URL',
  'EVENTKIT_EVENT_ID',
  'EVENTKIT_API_KEY',
  'EVENTKIT_OWNER_EMAIL',
  'EVENTKIT_OWNER_PASSWORD',
];
const missing = NEEDED.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.log(`Skipping email template save: ${missing.join(', ')} not set.`);
} else {
  const run = spawnSync('npx', ['tsx', 'scripts/email.ts', 'save'], { stdio: 'inherit' });
  process.exit(run.status ?? 1);
}
