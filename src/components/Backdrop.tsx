/** The poster's scene: sparkles in a cream sky, a lavender moon, haze and a rocky skyline. */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <Sparkles />
      <svg
        viewBox="0 0 1440 640"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 h-[58svh] w-full"
      >
        {/* Moons */}
        <circle cx="560" cy="330" r="250" fill="var(--haze)" opacity="0.75" />
        <circle cx="470" cy="250" r="34" fill="#b6a6d3" opacity="0.6" />
        <circle cx="650" cy="210" r="22" fill="#b6a6d3" opacity="0.55" />
        <circle cx="610" cy="360" r="48" fill="#b6a6d3" opacity="0.4" />
        <circle cx="400" cy="380" r="18" fill="#b6a6d3" opacity="0.5" />
        <circle cx="980" cy="200" r="18" fill="#b3a3c8" />
        <circle cx="975" cy="195" r="5" fill="#9d8db6" />

        {/* Haze streaks */}
        <g fill="var(--haze)" opacity="0.8">
          <path d="M-20 130c80-30 160-60 260-110 10 30-70 80-150 110-40 14-80 18-110 0z" />
          <path d="M1180 260c90-40 170-70 280-120v60c-90 40-180 80-260 90-20 2-30-14-20-30z" />
          <path d="M1060 330c80-30 150-48 220-60-40 30-110 60-190 76-30 6-50-4-30-16z" />
        </g>

        {/* Shooting star */}
        <path
          d="M800 60L690 128"
          stroke="#a594cf"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.7"
        />
        <Star x={690} y={128} r={9} fill="#a594cf" />

        {/* Skyline of spires, right */}
        <g fill="#b9a8cf" opacity="0.85">
          <path d="M1100 520v-90l8-30 8 30v-40l6-40 6 40v40l8-20 8 20v90z" />
          <path d="M1170 520v-60h12v-50l10-50 10 50v50h12v60z" />
          <path d="M1260 520v-120l10-60 10 60v-30l8-50 8 50v150z" />
          <path d="M1320 520v-70h10v-40l12-56 12 56v40h10v70z" />
          <path d="M1390 520v-110l10-40 10 40v110z" />
          <rect x="1180" y="470" width="150" height="10" />
        </g>

        {/* Radio tower and dish, left */}
        <g stroke="#4b4166" strokeWidth="3" fill="none" opacity="0.85">
          <path d="M120 470L150 300 180 470M130 410h40M138 360h24M150 300v-30" />
          <path d="M136 440l28-30M164 440l-28-30" />
        </g>
        <ellipse
          cx="230"
          cy="420"
          rx="34"
          ry="20"
          fill="#d9cfe4"
          stroke="#4b4166"
          strokeWidth="3"
          transform="rotate(-30 230 420)"
        />
        <path d="M230 420l18-18" stroke="#4b4166" strokeWidth="3" />

        {/* Rocks */}
        <path
          d="M0 470c60-20 120-30 200-20s120 30 200 10 160-40 240-20 140 50 220 40 160-60 260-60 160 40 220 30 80-20 100-24V640H0z"
          fill="var(--rock)"
        />
        <path
          d="M0 540c90-24 170-16 260 6s200 10 300-14 190-10 280 16 220 20 320-6 200-26 280-10v108H0z"
          fill="var(--rock-deep)"
          opacity="0.85"
        />
        <path
          d="M0 600c120-14 260-6 380 4s260 0 400-10 300 6 420 10 180-4 240-8v44H0z"
          fill="#8f80a6"
          opacity="0.7"
        />
        <g fill="#8a7ba3" opacity="0.6">
          <ellipse cx="300" cy="575" rx="40" ry="10" />
          <ellipse cx="860" cy="560" rx="56" ry="12" />
          <ellipse cx="1180" cy="590" rx="34" ry="8" />
        </g>

        <Astronaut />
      </svg>
    </div>
  );
}

function Star({
  x,
  y,
  r,
  fill = 'var(--ink)',
}: {
  x: number;
  y: number;
  r: number;
  fill?: string;
}) {
  const k = r * 0.28;
  return (
    <path
      d={`M${x} ${y - r}L${x + k} ${y - k}L${x + r} ${y}L${x + k} ${y + k}L${x} ${y + r}L${x - k} ${y + k}L${x - r} ${y}L${x - k} ${y - k}Z`}
      fill={fill}
    />
  );
}

/** Four-point sparkles and dots spread over the whole sky. */
function Sparkles() {
  const stars: [number, number, number][] = [
    [8, 18, 14],
    [18, 52, 10],
    [30, 10, 7],
    [72, 14, 9],
    [86, 40, 12],
    [94, 12, 7],
    [62, 34, 6],
    [12, 78, 8],
    [80, 64, 7],
    [46, 6, 5],
  ];
  const dots: [number, number][] = [
    [22, 30],
    [40, 22],
    [55, 48],
    [68, 8],
    [90, 26],
    [6, 42],
    [35, 60],
    [76, 50],
    [50, 72],
    [96, 58],
  ];
  return (
    <svg className="absolute inset-0 size-full" preserveAspectRatio="none">
      {stars.map(([x, y, r], i) => (
        <svg key={i} x={`${x}%`} y={`${y}%`} overflow="visible">
          <Star x={0} y={0} r={r} />
        </svg>
      ))}
      {dots.map(([x, y], i) => (
        <circle key={i} cx={`${x}%`} cy={`${y}%`} r="1.6" fill="var(--ink)" opacity="0.6" />
      ))}
    </svg>
  );
}

/** A small astronaut at a laptop, planting an open-source flag. */
function Astronaut() {
  return (
    <g transform="translate(600 440)">
      {/* flag */}
      <path d="M120 70V-20" stroke="#4b4166" strokeWidth="4" />
      <path d="M122 -20h58l-10 20 10 20h-58z" fill="var(--ink)" />
      <circle cx="148" cy="0" r="8" fill="none" stroke="#f5efe6" strokeWidth="3" />
      {/* body */}
      <rect
        x="8"
        y="40"
        width="64"
        height="48"
        rx="18"
        fill="#f7f4fb"
        stroke="#4b4166"
        strokeWidth="3"
      />
      {/* helmet */}
      <circle cx="40" cy="20" r="34" fill="#f7f4fb" stroke="#4b4166" strokeWidth="3" />
      <ellipse cx="40" cy="24" rx="24" ry="22" fill="#9a9a63" stroke="#4b4166" strokeWidth="3" />
      <circle cx="31" cy="22" r="3" fill="var(--ink)" />
      <circle cx="49" cy="22" r="3" fill="var(--ink)" />
      <path d="M30 -16v-14" stroke="#4b4166" strokeWidth="3" />
      <circle cx="30" cy="-32" r="4" fill="#f7f4fb" stroke="#4b4166" strokeWidth="2" />
      {/* laptop */}
      <path d="M50 70l40-16 6 28-40 10z" fill="var(--ink)" />
      {/* little green friend */}
      <ellipse cx="110" cy="84" rx="22" ry="16" fill="#9a9a63" stroke="#4b4166" strokeWidth="3" />
      <circle cx="103" cy="80" r="2.5" fill="var(--ink)" />
      <circle cx="117" cy="80" r="2.5" fill="var(--ink)" />
      <path d="M102 68l-4-10M118 68l4-10" stroke="#4b4166" strokeWidth="3" />
    </g>
  );
}
