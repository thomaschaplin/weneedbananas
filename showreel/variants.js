// Edits of the reel, shared by reel.html (visuals) and synth.mjs (music). All times are in beats at 128 BPM.
// segs: [newStart, source, length]. A numeric source plays the master timeline from that beat; a string plays a
// standalone scene ('chat', 'type'). groove: [start, end] of the drum loop. cards: the three stat slams near the end.
globalThis.VARIANTS = {
  main: { segs: [[0, 0, 32]], groove: [4, 28] },
  chat: {
    segs: [
      [0, 'chat', 4],
      [4, 4, 28],
    ],
    groove: [4, 28],
    cards: ['1 list.', '3 words.', '0 extra bananas.'],
  },
  midnight: { segs: [[0, 0, 32]], groove: [4, 28], theme: 'midnight', minor: true },
  privacy: {
    segs: [
      [0, 0, 4],
      [4, 20.5, 4],
      [8, 4, 6],
      [14, 10, 10],
      [24, 25, 3],
      [27, 28, 5],
    ],
    groove: [4, 27],
    cards: ['No account.', 'No server.', 'No signup.'],
    sub: 'private by design',
  },
  type: {
    segs: [
      [0, 'type', 26],
      [26, 29.5, 6],
    ],
    groove: [0, 26],
  },
  teaser: {
    segs: [
      [0, 2, 2],
      [2, 4.7, 4.5],
      [6.5, 11.9, 3.5],
      [10, 17.5, 2],
      [12, 29.5, 4],
    ],
    groove: [2, 12],
    beats: 16,
  },
}

// The 'type' scene: full-screen cards cut on the beat. Items: t text (HTML), at beat (default: card start),
// dy line offset, f size factor, c colour, e emoji pop, hl highlight, strike beat, pill, bob.
{
  const INK = '#1f1a0e',
    CREAM = '#f6efd9',
    BAN = '#ffd23f',
    LEAF = '#2f8f46',
    RED = '#e5484d',
    PAPER = '#fffbea'
  globalThis.TYPE_CARDS = [
    { b: 0, e: 0.5, bg: INK, fg: CREAM, items: [{ t: 'Your' }] },
    { b: 0.5, e: 1, bg: BAN, fg: INK, items: [{ t: 'shopping' }] },
    { b: 1, e: 1.5, bg: INK, fg: CREAM, items: [{ t: 'list' }] },
    { b: 1.5, e: 2, bg: BAN, fg: INK, items: [{ t: 'is a' }] },
    { b: 2, e: 4, bg: RED, fg: '#fff', mess: true, items: [{ t: 'mess.' }] },
    { b: 4, e: 6, bg: BAN, fg: INK, logo: true, items: [{ t: 'We Need Bananas', dy: 1.25, f: 0.42, at: 4.25 }] },
    { b: 6, e: 7, bg: INK, fg: CREAM, items: [{ t: 'Three words.' }] },
    {
      b: 7,
      e: 10,
      bg: BAN,
      fg: INK,
      items: [
        { t: 'lemon.', dy: -1.15 },
        { t: 'fork.', dy: 0, at: 7.5 },
        { t: 'bulb.', dy: 1.15, at: 8 },
        { t: 'is the whole login.', dy: 2.2, f: 0.3, at: 9 },
      ],
    },
    {
      b: 10,
      e: 12,
      bg: PAPER,
      fg: INK,
      items: [
        { t: 'Sorts itself', dy: -0.6, f: 0.6 },
        { t: '<span class="hl">by aisle.</span>', dy: 0.5, f: 0.6, at: 10.5, hl: true },
        { t: '🥦 🥖 🧀 🧊', dy: 1.7, f: 0.42, at: 11, e: true },
      ],
    },
    {
      b: 12,
      e: 14,
      bg: INK,
      fg: CREAM,
      items: [
        { t: '6 eggs', dy: -1.15 },
        { t: '+ 6 eggs', dy: 0, at: 12.5 },
        { t: '= 12 eggs.', dy: 1.15, at: 13, c: BAN },
      ],
    },
    {
      b: 14,
      e: 16,
      bg: '#fff4c7',
      fg: INK,
      items: [
        { t: 'Phone', dy: -1.15 },
        { t: 'to phone.', dy: 0, at: 14.5 },
        { t: 'No server.', dy: 1.15, at: 15, c: RED, strike: 15.5 },
      ],
    },
    {
      b: 16,
      e: 18,
      bg: LEAF,
      fg: '#fff',
      items: [
        { t: 'Shop mode.', dy: -0.3 },
        { t: '🛒 Sam is at the shop', dy: 0.95, f: 0.28, at: 17, pill: true },
      ],
    },
    {
      b: 18,
      e: 20,
      bg: INK,
      fg: BAN,
      items: [
        { t: 'Works', dy: -0.58 },
        { t: 'offline.', dy: 0.58, at: 18.5 },
      ],
    },
    { b: 20, e: 21, bg: BAN, fg: INK, items: [{ t: '0 accounts.' }] },
    { b: 21, e: 22, bg: INK, fg: BAN, items: [{ t: '0 ads.' }] },
    { b: 22, e: 23, bg: LEAF, fg: '#fff', items: [{ t: '0 passwords.' }] },
    { b: 23, e: 24, bg: PAPER, fg: INK, items: [{ t: 'Free.' }] },
    {
      b: 24,
      e: 26,
      bg: INK,
      fg: CREAM,
      items: [
        { t: 'Try it.', dy: -0.35 },
        { t: '👇', dy: 0.85, f: 0.5, at: 25, e: true, bob: true },
      ],
    },
  ]
}
