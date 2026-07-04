import { create } from 'zustand';
import type { ProfileRow } from '@lyd/schema';

export type Screen =
  | 'home' | 'record' | 'tuner' | 'metronome' | 'doodler' | 'library'
  | 'phrasebook' | 'palette' | 'grimoire' | 'goals' | 'garden' | 'profiles';

interface AppState {
  screen: Screen;
  /** Recording id to open in the library detail view. */
  openRecordingId: string | null;
  /** Concept to open in the phrasebook. */
  openConceptId: string | null;
  storage: 'opfs' | 'memory' | 'unknown';
  profiles: ProfileRow[];
  currentProfileId: string | null;
  navigate: (screen: Screen, openRecordingId?: string | null) => void;
  openConcept: (id: string) => void;
  setStorage: (s: 'opfs' | 'memory') => void;
  setProfiles: (profiles: ProfileRow[], currentId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  screen: 'home',
  openRecordingId: null,
  openConceptId: null,
  storage: 'unknown',
  profiles: [],
  currentProfileId: null,
  navigate: (screen, openRecordingId = null) =>
    set({ screen, openRecordingId, openConceptId: null }),
  openConcept: (id) => set({ screen: 'phrasebook', openConceptId: id }),
  setStorage: (storage) => set({ storage }),
  setProfiles: (profiles, currentProfileId) => set({ profiles, currentProfileId }),
}));

export function useCurrentProfile(): ProfileRow | null {
  const profiles = useAppStore((s) => s.profiles);
  const id = useAppStore((s) => s.currentProfileId);
  return profiles.find((p) => p.id === id) ?? null;
}

export function useIsKid(): boolean {
  return useCurrentProfile()?.kind === 'kid';
}
