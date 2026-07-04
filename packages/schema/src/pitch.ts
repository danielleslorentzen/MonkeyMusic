/** Pitch classes, sharps-canonical. */
export const PITCH_CLASSES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const;
export type PitchClass = (typeof PITCH_CLASSES)[number];
