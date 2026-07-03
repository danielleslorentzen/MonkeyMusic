import { create } from 'zustand';

export type Screen = 'home' | 'record' | 'tuner' | 'metronome' | 'doodler' | 'library';

interface AppState {
  screen: Screen;
  /** Recording id to open in the library detail view. */
  openRecordingId: string | null;
  storage: 'opfs' | 'memory' | 'unknown';
  navigate: (screen: Screen, openRecordingId?: string | null) => void;
  setStorage: (s: 'opfs' | 'memory') => void;
}

export const useAppStore = create<AppState>((set) => ({
  screen: 'home',
  openRecordingId: null,
  storage: 'unknown',
  navigate: (screen, openRecordingId = null) => set({ screen, openRecordingId }),
  setStorage: (storage) => set({ storage }),
}));
