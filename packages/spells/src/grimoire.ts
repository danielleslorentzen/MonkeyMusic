import type { Spell, Tune } from '@lyd/schema';

/**
 * The bundled starter grimoire (TDD §9 — "~15-spell starter grimoire").
 * Each spell teaches: the reveal card names the theory AFTER you hear it.
 * A few start sealed and unseal when their concept is met in the Phrasebook
 * or in the wild (concepts_seen).
 */
export const BUNDLED_SPELLS: Spell[] = [
  {
    id: 'spell.spookify.v1', schema_version: 1,
    name: 'Spookify', emoji: '🕸️',
    flavor: 'Drapes your tune in cobwebs.',
    input: ['progression', 'melody'],
    ops: [
      { op: 'mode_swap', to: 'parallel_minor' },
      { op: 'chord_color', add: 'b9', where: 'dominant', chance: 1 },
      { op: 'tempo_scale', factor: 0.9 },
    ],
    reveal: {
      concepts: ['parallel-minor', 'flat-nine'],
      one_liner: "Same home note, but the house moved to the shadowy street — that's the parallel minor.",
    },
    origin: 'bundled', safety: 'pure',
  },
  {
    id: 'spell.sunshine.v1', schema_version: 1,
    name: 'Sunshine', emoji: '☀️',
    flavor: 'Opens all the curtains at once.',
    input: ['progression', 'melody'],
    ops: [
      { op: 'mode_swap', to: 'parallel_major' },
      { op: 'tempo_scale', factor: 1.05 },
    ],
    reveal: {
      concepts: ['major-minor'],
      one_liner: 'Raising the third of the scale turns clouds into sun — welcome to major.',
    },
    origin: 'bundled', safety: 'pure',
  },
  {
    id: 'spell.hat.v1', schema_version: 1,
    name: 'Put a Hat on It', emoji: '🎩',
    flavor: 'The whole song stands on tiptoes.',
    input: ['progression', 'melody'],
    ops: [{ op: 'transpose', semitones: 2 }],
    reveal: {
      concepts: ['modulation'],
      one_liner: 'Sliding everything up is a modulation — the trick every final chorus pulls.',
    },
    origin: 'bundled', safety: 'pure',
    sealed_until_concept: 'modulation',
  },
  {
    id: 'spell.float.v1', schema_version: 1,
    name: 'Float Away', emoji: '🎈',
    flavor: 'Unties the anchors from your chords.',
    input: ['progression'],
    ops: [
      { op: 'quality_paint', to: 'sus4', where: 'dominant' },
      { op: 'chord_color', add: 'add9', where: 'tonic', chance: 1 },
      { op: 'tempo_scale', factor: 0.95 },
    ],
    reveal: {
      concepts: ['suspended-chord', 'add9'],
      one_liner: 'Take out the third and a chord hovers, undecided — that hover is called a suspension.',
    },
    origin: 'bundled', safety: 'pure',
  },
  {
    id: 'spell.mirror.v1', schema_version: 1,
    name: 'Mirror Pond', emoji: '🪞',
    flavor: 'Your melody looks at its reflection.',
    input: ['melody'],
    ops: [{ op: 'melody_invert' }],
    reveal: {
      concepts: ['inversion'],
      one_liner: 'Every step up became a step down — a melodic inversion, the mirror trick.',
    },
    origin: 'bundled', safety: 'pure',
  },
  {
    id: 'spell.rewind.v1', schema_version: 1,
    name: 'Rewind', emoji: '⏪',
    flavor: 'Plays your idea from the far end.',
    input: ['melody', 'progression'],
    ops: [{ op: 'melody_retrograde' }, { op: 'reverse_progression' }],
    reveal: {
      concepts: ['retrograde'],
      one_liner: 'Music played back-to-front is a retrograde — composers have hidden these for centuries.',
    },
    origin: 'bundled', safety: 'pure',
  },
  {
    id: 'spell.echo.v1', schema_version: 1,
    name: 'The Echo', emoji: '🗣️',
    flavor: 'Says it. Says it. Says it.',
    input: ['melody'],
    ops: [{ op: 'stutter', times: 2 }],
    reveal: {
      concepts: ['motif'],
      one_liner: 'Repeating a small idea makes it stick — that sticky idea is a motif.',
    },
    origin: 'bundled', safety: 'pure',
  },
  {
    id: 'spell.molasses.v1', schema_version: 1,
    name: 'Molasses', emoji: '🐌',
    flavor: 'Everything moves like Sunday morning.',
    input: ['melody', 'progression'],
    ops: [
      { op: 'rhythm_scale', factor: 2 },
      { op: 'tempo_scale', factor: 0.8 },
    ],
    reveal: {
      concepts: ['augmentation'],
      one_liner: 'Stretching every note to double length is augmentation — same tune, twice the gravity.',
    },
    origin: 'bundled', safety: 'pure',
  },
  {
    id: 'spell.sugar.v1', schema_version: 1,
    name: 'Sugar Rush', emoji: '🐿️',
    flavor: 'Who put espresso in the melody?',
    input: ['melody', 'progression'],
    ops: [
      { op: 'rhythm_scale', factor: 0.5 },
      { op: 'tempo_scale', factor: 1.25 },
    ],
    reveal: {
      concepts: ['diminution'],
      one_liner: 'Halving every note is diminution — the same idea sprinting.',
    },
    origin: 'bundled', safety: 'pure',
  },
  {
    id: 'spell.campfire.v1', schema_version: 1,
    name: 'Campfire', emoji: '🏕️',
    flavor: 'Sands off every splinter.',
    input: ['melody'],
    ops: [{ op: 'pentatonify' }],
    reveal: {
      concepts: ['pentatonic'],
      one_liner: 'Five friendly notes that never clash — the pentatonic scale, the campfire dialect.',
    },
    origin: 'bundled', safety: 'pure',
  },
  {
    id: 'spell.alleycat.v1', schema_version: 1,
    name: 'Alley Cat', emoji: '🐈',
    flavor: 'Teaches your tune to slink.',
    input: ['melody'],
    ops: [
      { op: 'blue_notes', chance: 0.7 },
      { op: 'swing', amount: 0.6 },
    ],
    reveal: {
      concepts: ['blue-note', 'swing'],
      one_liner: 'Bending the third downward and leaning on the off-beat — blue notes and swing, the blues in two moves.',
    },
    origin: 'bundled', safety: 'pure',
    sealed_until_concept: 'blue-note',
  },
  {
    id: 'spell.jazzhands.v1', schema_version: 1,
    name: 'Jazz Hands', emoji: '🎷',
    flavor: 'Every chord gets a fancy scarf.',
    input: ['progression'],
    ops: [
      { op: 'chord_color', add: '7', where: 'all', chance: 1 },
      { op: 'swing', amount: 0.4 },
    ],
    reveal: {
      concepts: ['seventh-chord'],
      one_liner: 'Stacking one more third on a chord makes a seventh chord — instant sophistication.',
    },
    origin: 'bundled', safety: 'pure',
  },
  {
    id: 'spell.giant.v1', schema_version: 1,
    name: "Giant's Footsteps", emoji: '🦣',
    flavor: 'The ground hums along.',
    input: ['melody', 'progression'],
    ops: [
      { op: 'drone', degree: 1 },
      { op: 'octave_shift', octaves: -1 },
      { op: 'tempo_scale', factor: 0.85 },
    ],
    reveal: {
      concepts: ['drone'],
      one_liner: 'One low note held under everything is a drone — bagpipes and epic movie scores agree.',
    },
    origin: 'bundled', safety: 'pure',
  },
  {
    id: 'spell.helium.v1', schema_version: 1,
    name: 'Helium', emoji: '🎈',
    flavor: 'Squeaky and delighted about it.',
    input: ['melody'],
    ops: [
      { op: 'octave_shift', octaves: 1 },
      { op: 'tempo_scale', factor: 1.1 },
    ],
    reveal: {
      concepts: ['octave'],
      one_liner: 'Same note, higher shelf — an octave up. It rhymes with itself.',
    },
    origin: 'bundled', safety: 'pure',
  },
  {
    id: 'spell.cozy.v1', schema_version: 1,
    name: 'Cozy Sweater', emoji: '🧶',
    flavor: 'Knits sevenths into everything soft.',
    input: ['progression'],
    ops: [
      { op: 'chord_color', add: 'maj7', where: 'tonic', chance: 1 },
      { op: 'chord_color', add: '7', where: 'dominant', chance: 1 },
      { op: 'tempo_scale', factor: 0.92 },
    ],
    reveal: {
      concepts: ['seventh-chord', 'cadence'],
      one_liner: 'A major seventh on the home chord is the sound of a blanket — tension nearby, comfort at home.',
    },
    origin: 'bundled', safety: 'pure',
  },
];

/** Starter material to cast on when the user hasn't picked a doodle/recording. */
export const DEMO_TUNES: { id: string; name: string; emoji: string; tune: Tune }[] = [
  {
    id: 'demo.porch', name: 'Porch Loop', emoji: '🪑',
    tune: {
      key: { tonic: 'C', mode: 'major' },
      bpm: 100,
      chords: [
        { root: 0, quality: 'maj', beats: 4 },
        { root: 7, quality: 'maj', beats: 4 },
        { root: 9, quality: 'min', beats: 4 },
        { root: 5, quality: 'maj', beats: 4 },
      ],
      melody: [
        { midi: 72, startBeat: 0, beats: 1 }, { midi: 74, startBeat: 1, beats: 1 },
        { midi: 76, startBeat: 2, beats: 2 }, { midi: 74, startBeat: 4, beats: 1 },
        { midi: 71, startBeat: 5, beats: 1 }, { midi: 72, startBeat: 6, beats: 2 },
        { midi: 69, startBeat: 8, beats: 1.5 }, { midi: 72, startBeat: 9.5, beats: 0.5 },
        { midi: 76, startBeat: 10, beats: 2 }, { midi: 77, startBeat: 12, beats: 1 },
        { midi: 76, startBeat: 13, beats: 1 }, { midi: 72, startBeat: 14, beats: 2 },
      ],
      drone: null, swing: 0,
    },
  },
  {
    id: 'demo.lantern', name: 'Lantern Waltz', emoji: '🏮',
    tune: {
      key: { tonic: 'A', mode: 'minor' },
      bpm: 90,
      chords: [
        { root: 9, quality: 'min', beats: 3 },
        { root: 5, quality: 'maj', beats: 3 },
        { root: 7, quality: 'maj', beats: 3 },
        { root: 9, quality: 'min', beats: 3 },
      ],
      melody: [
        { midi: 69, startBeat: 0, beats: 1 }, { midi: 72, startBeat: 1, beats: 1 },
        { midi: 76, startBeat: 2, beats: 1 }, { midi: 77, startBeat: 3, beats: 2 },
        { midi: 76, startBeat: 5, beats: 1 }, { midi: 74, startBeat: 6, beats: 2 },
        { midi: 71, startBeat: 8, beats: 1 }, { midi: 69, startBeat: 9, beats: 3 },
      ],
      drone: null, swing: 0,
    },
  },
];
