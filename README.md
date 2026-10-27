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

Delete the old tarball if the version changed. Once the SDK is published,
replace this with a normal `"@eventkit/sdk": "^x.y.z"` dependency.

## Theme

- Colours and fonts: `src/index.css` (tokens on `:root`, plus `.chrome-text`
  and `.glass`). Fonts load from Google Fonts in `index.html`: Bagel Fat One
  (chrome title), Audiowide (headings), Space Grotesk (body).
- The scene behind every page: `src/components/Backdrop.tsx`, using the
  pictures in `public/backgrounds/` (home: `base`, signed-in pages: `outpost`,
  everything else: `plan`). Each has a focus point so phones crop to the
  astronaut.
- Home page: `src/pages/Home.tsx`. The description, highlights, schedule and
  "good to know" notes are in `src/content/event.ts`; everything else (name,
  dates, venue, team size, registration window) comes from the event in the
  console.
- Icons: `public/favicon.svg`; the PNGs are rendered from it
  (`rsvg-convert -w 512 -h 512 public/favicon.svg -o public/pwa-512.png`).

## Deploy

A Vercel project with this folder as its root. Set `VITE_EVENTKIT_API_URL`,
`VITE_EVENTKIT_EVENT_ID` and `VITE_EVENTKIT_API_KEY` for the Mach Zero event,
then put the deployment's URL in the console (event → Portal & settings).

Scripts are the same as the template portal: `npm test`, `npm run lint`,
`npm run typecheck`, `npm run build`.
