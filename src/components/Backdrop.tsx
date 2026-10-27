import { useTheme } from '@/lib/theme';

export type Scene = 'base' | 'outpost' | 'plan';
type Picture = { src: string; focus: string };

const nightCrater: Picture = { src: '/backgrounds/night-base.webp', focus: '62%' };

/**
 * The moon-base scenes behind the portal (public/backgrounds). At night there is
 * only the crater scene, plus a tall outpost scene that phones get.
 */
const scenes: Record<Scene, { light: Picture; dark: Picture; darkTall?: string }> = {
  // Astronaut on the crater, centre right.
  base: { light: { src: '/backgrounds/base.webp', focus: '62%' }, dark: nightCrater },
  // Astronaut at the outpost, left.
  outpost: {
    light: { src: '/backgrounds/outpost.webp', focus: '26%' },
    dark: nightCrater,
    darkTall: '/backgrounds/night-outpost-tall.webp',
  },
  // Astronaut reading the plan, far left.
  plan: { light: { src: '/backgrounds/plan.webp', focus: '18%' }, dark: nightCrater },
};

/**
 * Pinned to the bottom of the screen. Wide screens show the full width; on
 * phones the picture keeps a usable height and crops to the astronaut, and the
 * sky colour fills the space above.
 */
export function Backdrop({ scene }: { scene: Scene }) {
  const theme = useTheme();
  const { src, focus } = scenes[scene][theme];
  const tall = theme === 'dark' ? scenes[scene].darkTall : undefined;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-[min(56.25vw,70svh)] min-h-[46svh]">
        <picture>
          {/* Portrait screens: the tall picture fits the width, so nothing is cropped sideways. */}
          {tall && <source media="(max-aspect-ratio: 4/5)" srcSet={tall} />}
          <img
            src={src}
            alt=""
            className="size-full object-cover"
            style={{ objectPosition: `${focus} bottom` }}
          />
        </picture>
        {/* Blend the picture's top edge into the page. */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent" />
      </div>
    </div>
  );
}
