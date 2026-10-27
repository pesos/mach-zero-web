/** The moon-base scenes behind the portal (public/backgrounds). */
const scenes = {
  // Astronaut on the crater, centre right.
  base: { src: '/backgrounds/base.webp', focus: '62%' },
  // Astronaut at the outpost, left.
  outpost: { src: '/backgrounds/outpost.webp', focus: '26%' },
  // Astronaut reading the plan, far left.
  plan: { src: '/backgrounds/plan.webp', focus: '18%' },
} as const;

export type Scene = keyof typeof scenes;

/**
 * Pinned to the bottom of the screen. Wide screens show the full width; on
 * phones the picture keeps a usable height and crops to the astronaut, and the
 * sky colour fills the space above.
 */
export function Backdrop({ scene }: { scene: Scene }) {
  const { src, focus } = scenes[scene];
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-x-0 bottom-0 h-[min(56.25vw,70svh)] min-h-[46svh] bg-cover bg-bottom bg-no-repeat"
        style={{ backgroundImage: `url(${src})`, backgroundPositionX: focus }}
      >
        {/* Blend the picture's top edge into the page. */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent" />
      </div>
    </div>
  );
}
