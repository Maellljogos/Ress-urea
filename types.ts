
export interface Frequency {
  id: string;
  hz: number;
  name: string;
  description: string;
  category: FrequencyCategory;
}

export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
  items: string[]; // Array of frequency IDs
}

export enum FrequencyCategory {
  SCALAR = 'Ondas Escalares (Zero Point)',
  HYPER_MATRIX = 'Hyper-Matrix (Downloads)',
  SOLFEGGIO = 'Solfeggio (Cura)',
  ABUNDANCE = 'Abundância & Sucesso',
  PERFORMANCE = 'Alta Performance (Arquétipos)',
  BODY = 'Cura Física & DNA',
  MIND = 'Mental & Foco',
  ARCHETYPE = 'Arquétipos Místicos',
  CUSTOM = 'Canalizado por IA',
  PERSONAL = 'Sintonia Pessoal',
  SLEEP = 'Sono Profundo & Sonhos',
}

export interface ActiveOscillator {
  id: string;
  oscillator: OscillatorNode;
  gain: GainNode;
  scalarGain?: GainNode; // Used for phase inversion in scalar mode
  panner?: StereoPannerNode; // Used for channel separation
}
