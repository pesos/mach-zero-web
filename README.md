# mach-one-web

The event portal for **MachZero** (Silicon X PESOS, PES University Ring Road Campus, 7–8 Nov 2026). It is
the eventKit template portal (`eventkit-web/portal`) with the Mach Zero poster's
theme: a cream sky, lavender haze, chrome lettering and moon-base illustrations. All
data comes from the event through `@eventkit/sdk`, so the event name, dates,
team sizes and fee are set in the eventKit console, not here.

```bash
cp .env.example .env.local   # the event's id and API key, from the console
npm install
npm run dev                  # http://localhost:5176
```

The SDK comes from `vendor/eventkit-sdk-<version>.tgz`, committed here, because
`@eventkit/sdk` isn't on npm yet and Vercel only clones this repo. To update it
after changing the SDK:

```bash
cd ../eventkit-sdk && npm run build && npm pack --pack-destination ../mach-one-web/vendor
cd ../mach-one-web && npm install ./vendor/eventkit-sdk-<version>.tgz
```

Delete the old tarball if the version changed. If it didn't, rename the new
tarball (e.g. `eventkit-sdk-0.1.0-failover.tgz`) and install that: Vercel's
build cache keeps the old SDK while the file name and version stay the same. Once the SDK is published,
replace this with a normal `"@eventkit/sdk": "^x.y.z"` dependency.

## Theme

- Components are [shadcn/ui](https://ui.shadcn.com) (`src/components/ui`, set
  up in `components.json`); add more with `npx shadcn@latest add <name>`. Two
  local changes: `CardTitle` is an `<h2>`, and cards are frosted so the
  backgrounds show through.
- Colours and fonts: `src/index.css` (shadcn's theme tokens on `:root`, plus
  `.chrome-text`; the night palette is on `.dark`). Dark mode follows the
  phone's colour scheme until someone picks a theme with the header's sun/moon
  button (`src/lib/theme.ts`, saved per device; `index.html` applies it before
  the first paint). Fonts load from Google Fonts in `index.html`: Bagel Fat One
  (chrome title), Audiowide (headings), Space Grotesk (body).
- The scene behind every page: `src/components/Backdrop.tsx`, using the
  pictures in `public/backgrounds/` (home: `base`, signed-in pages: `outpost`,
  everything else: `plan`). Each has a focus point so phones crop to the
  astronaut. At night each scene has a `night-` version; signed-in
  pages on portrait phones get `night-outpost-tall` instead.
- Staff sign in is at `/staff/login` and is not linked from the public pages:
  share that address with volunteers and judges.
- Home page: `src/pages/Home.tsx`. The description, highlights, schedule and
  "good to know" notes are in `src/content/event.ts`; everything else (name,
  dates, venue, team size, registration window) comes from the event in the
  console.
- Icons: the astronaut-helmet logo. `public/logo.png` (header) and
  `favicon.png` are it trimmed on transparent; `apple-touch-icon.png`,
  `pwa-192.png`, `pwa-512.png` and `pwa-maskable-512.png` (extra padding) sit
  on the cream sky. Rendered with ImageMagick, e.g.
  `magick logo.png -trim -resize 448x448 -background '#f7efe4' -gravity center -extent 512x512 public/pwa-512.png`.

## Registration email

When a team registers, eventKit emails each member separately: their own
participant ID, a button to their own dashboard (the pass), the team name and
the member names (never anyone else's link). A replaced link is mailed the same way. MachZero's version, in the portal's night theme, is
`emails/registration.ts`, built with the SDK's `registrationEmail` helpers.
eventKit fills in and escapes the `{{…}}` values when it sends. Buttons are
links (mail apps run no scripts), and the email has no QR codes: those appear on
each dashboard once the team is confirmed. It has no images, web fonts or
hidden text, which spam filters count against a sender.

```bash
npm run email -- sample    # fill it offline with a made-up team → email-preview.html
npm run email -- preview   # eventKit fills it, as it will be sent
npm run email -- test      # send that to the event owner's inbox
npm run email -- save      # teams get this email from now on
npm run email -- reset     # back to eventKit's default
npm run email -- show      # what eventKit has now
```

Everything but `sample` signs in as the event owner, from `EVENTKIT_API_URL`
(the API's full address, not `/api`), `EVENTKIT_EVENT_ID`, `EVENTKIT_API_KEY`,
`EVENTKIT_OWNER_EMAIL` and `EVENTKIT_OWNER_PASSWORD`. The email is only sent when
the event's **mailing** feature is on and the API has SMTP set up.

`npm run build` runs `prebuild` first, which saves the template (`email -- save`)
only when all five variables above are set, and otherwise prints a skip notice.

## Deploy

A Vercel project with this folder as its root. Set `VITE_EVENTKIT_API_URL`
(one address, or several comma-separated with the primary first: the SDK moves
to the next while the primary is down),
`VITE_EVENTKIT_EVENT_ID`, `VITE_EVENTKIT_API_KEY` and `VITE_REGISTER_URL` (the
registration link, for the Register buttons) for the Mach Zero event,
then put the deployment's URL in the console (event → Portal & settings).

Scripts are the same as the template portal: `npm test`, `npm run lint`,
`npm run typecheck`, `npm run build`.
