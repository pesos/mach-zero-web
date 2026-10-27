# mach-one-web

The event portal for **Mach Zero** (PES University, 31 Oct – 1 Nov 2026). It is
the eventKit template portal (`eventkit-web/portal`) with the Mach Zero poster's
theme: a cream sky, lavender haze, chrome lettering and a moon-base scene. All
data comes from the event through `@eventkit/sdk`, so the event name, dates,
team sizes and fee are set in the eventKit console, not here.

```bash
cp .env.example .env.local   # the event's id and API key, from the console
npm install
npm run dev                  # http://localhost:5176
```

The devkit is linked from `../eventkit-sdk` (`file:` dependency); build it there
first (`npm run build`).

## Theme

- Colours and fonts: `src/index.css` (tokens on `:root`, plus `.chrome-text`
  and `.glass`). Fonts load from Google Fonts in `index.html`: Bagel Fat One
  (chrome title), Audiowide (headings), Space Grotesk (body).
- The scene behind every page: `src/components/Backdrop.tsx` (inline SVG).
- Home page hero: `src/pages/Home.tsx`.
- Icons: `public/favicon.svg`; the PNGs are rendered from it
  (`rsvg-convert -w 512 -h 512 public/favicon.svg -o public/pwa-512.png`).

## Deploy

A Vercel project with this folder as its root. Set `VITE_EVENTKIT_API_URL`,
`VITE_EVENTKIT_EVENT_ID` and `VITE_EVENTKIT_API_KEY` for the Mach Zero event,
then put the deployment's URL in the console (event → Portal & settings).

Scripts are the same as the template portal: `npm test`, `npm run lint`,
`npm run typecheck`, `npm run build`.
