export type Scene = 'base' | 'outpost' | 'plan';

/**
 * The night moon-base scenes behind the portal (public/backgrounds). Portrait
 * phones get a tall outpost.
 */
const scenes: Record<Scene, { src: string; focus: string; tall?: string }> = {
  // Astronaut on the crater, centre right.
  base: { src: '/backgrounds/night-base.webp', focus: '62%' },
  // Astronaut at the outpost, left.
  outpost: {
    src: '/backgrounds/night-outpost.webp',
    focus: '26%',
    tall: '/backgrounds/night-outpost-tall.webp',
  },
  // Astronaut reading the plan, far left.
  plan: { src: '/backgrounds/night-plan.webp', focus: '18%' },
};

/**
 * Pinned to the bottom of the screen. Wide screens show the full width; on
 * phones the picture keeps a usable height and crops to the astronaut, and the
 * sky colour fills the space above.
 */
export function Backdrop({ scene }: { scene: Scene }) {
  const { src, focus, tall } = scenes[scene];
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
