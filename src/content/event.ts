// What the portal says about MachZero beyond the event's own fields (name,
// dates, venue, team size and registration window come from the API).

export const tagline = 'A hackathon where the output ships upstream.';

export const about = [
  'MachZero is a two-day open-source contribution spree where multidisciplinary student teams work on live, community-maintained hardware and software repositories under the guidance of industry mentors.',
  'Instead of throwaway prototypes, teams fix issues, add features and improve real projects. Standout work is carried forward as pull requests after the event, giving participants a pathway into long-term open-source involvement.',
];

/** Both days run these hours. */
export const dailyHours = '8:00 AM – 7:00 PM, both days';

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
  {
    title: 'Class attendance',
    body: 'Attendance compensation is confirmed for everyone who attends the event.',
  },
];

export type Slot = { time: string; title: string; kind?: 'round' | 'talk' | 'break' };

export const schedule: Slot[][] = [
  [
    { time: '8:00 – 9:00', title: 'Registration and breakfast', kind: 'break' },
    { time: '9:00 – 11:00', title: 'Introduction and inauguration' },
    { time: '11:00 – 1:30', title: 'Round 1', kind: 'round' },
    { time: '1:30 – 2:30', title: 'Lunch', kind: 'break' },
    { time: '2:30 – 3:00', title: 'Lightning talk 1', kind: 'talk' },
    { time: '3:00 – 5:30', title: 'Round 2', kind: 'round' },
    { time: '5:30 – 6:30', title: 'Snacks and break', kind: 'break' },
    { time: '6:30 – 7:00', title: 'Lightning talk 2', kind: 'talk' },
  ],
  [
    { time: '7:00 – 8:30', title: 'Breakfast and registration', kind: 'break' },
    { time: '8:30 – 12:30', title: 'Round 3: working time', kind: 'round' },
    { time: '12:30 – 1:30', title: 'Lunch', kind: 'break' },
    { time: '1:30 – 2:00', title: 'Lightning talk 3', kind: 'talk' },
    { time: '2:00 – 3:45', title: 'Round 3 judging, games and results', kind: 'round' },
    { time: '3:45 – 4:45', title: 'Round 4: presentation prep', kind: 'round' },
    { time: '4:45 – 6:30', title: 'Round 4: judging', kind: 'round' },
    { time: '6:30 – 7:00', title: 'Winners announced, event close' },
  ],
];
