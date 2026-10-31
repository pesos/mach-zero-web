// What the portal says about MachZero beyond the event's own fields (name,
// dates, venue, team size and registration window come from the API).

export const tagline = 'A 2 day contribution spree.';

/**
 * Where teams register: the event's registration link (console → Links), from
 * VITE_REGISTER_URL. Unset: the Register buttons are hidden.
 */
export const registerUrl = (): string | null => import.meta.env.VITE_REGISTER_URL || null;

export const about = [
  'MachZero is a two-day open-source contribution spree where multidisciplinary student teams work on live, community-maintained hardware and software repositories under the guidance of industry mentors.',
  'Instead of throwaway prototypes, teams fix issues, add features and improve real projects. Standout work is carried forward as pull requests after the event, giving participants a pathway into long-term open-source involvement.',
];

/** Each day's hours, in day order. */
export const dailyHours = ['Day 1: 8:00 AM – 7:00 PM', 'Day 2: 7:00 AM – 7:00 PM'];

export const highlights: { value: string; label: string }[] = [
  { value: '~50', label: 'teams' },
  { value: '3 + 1', label: 'rounds: three contribution rounds plus a final presentation' },
  { value: '3', label: '30-minute expert lightning talks between rounds' },
  { value: 'Silicon × PESOS', label: 'event collaboration' },
];

export const goodToKnow: { title: string; body: string }[] = [
  {
    title: 'Team composition',
    body: 'At least two CSE students per team. Students from ECE and other branches are encouraged to join.',
  },
];

/** Logos sit on a tile of their own background (#f7f7f7), since the portal is dark. */
export type Sponsor = { name: string; logo: string };

export const sponsors: { title: string; items: Sponsor[] }[] = [
  { title: 'Sponsors', items: [{ name: 'CraftifAI', logo: '/sponsors/craftifai.webp' }] },
  {
    title: 'Partners',
    items: [
      { name: 'Absurd Industries', logo: '/sponsors/absurd-industries.webp' },
      { name: 'FOSS United', logo: '/sponsors/foss-united.webp' },
    ],
  },
];

export type Slot = { time: string; title: string; kind?: 'round' | 'talk' | 'break' };

export const schedule: Slot[][] = [
  [
    { time: '8:00 – 9:00', title: 'Registration and breakfast', kind: 'break' },
    { time: '9:00 – 10:30', title: 'Inauguration and orientation' },
    { time: '10:30 – 1:00', title: 'Round 1', kind: 'round' },
    { time: '1:00 – 2:00', title: 'Lunch', kind: 'break' },
    { time: '2:00 – 2:30', title: 'Lightning talk 1', kind: 'talk' },
    { time: '2:30 – 5:30', title: 'Round 2', kind: 'round' },
    { time: '5:30 – 6:30', title: 'Snacks and break', kind: 'break' },
    { time: '6:30 – 7:00', title: 'Lightning talk 2', kind: 'talk' },
  ],
  [
    { time: '7:00 – 8:30', title: 'Breakfast and registration', kind: 'break' },
    { time: '8:30 – 12:30', title: 'Round 3', kind: 'round' },
    { time: '12:30 – 1:30', title: 'Lunch', kind: 'break' },
    { time: '1:30 – 2:00', title: 'Lightning talk 3', kind: 'talk' },
    { time: '2:00 – 3:45', title: 'Judging' },
    { time: '3:45 – 4:45', title: 'Round 4: presentation prep', kind: 'round' },
    { time: '4:45 – 6:30', title: 'Final presentations', kind: 'round' },
    { time: '6:30 – 7:00', title: 'Event wrap-up and winners' },
  ],
];
