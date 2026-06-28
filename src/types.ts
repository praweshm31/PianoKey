export type PianoStyle = 'grand' | 'electric' | 'synthwave' | 'chiptune' | 'organ' | 'flute' | 'tabla' | 'guitar' | 'sitar' | 'mandolin';

export interface PianoStyleConfig {
  id: PianoStyle;
  name: string;
  description: string;
  bgClass: string;
  accentClass: string;
  textClass: string;
  keyboardBg: string;
  emoji: string;
}

export interface PianoNote {
  note: string; // e.g. "C4", "C#4"
  frequency: number;
  type: 'white' | 'black';
  keyboardKey: string; // e.g. "A", "W"
  keyCode: string; // KeyboardEvent.code e.g. "KeyA"
  label: string; // Musical note symbol e.g. "C", "C#"
}

export interface SongNote {
  note: string;
  duration: number; // in milliseconds
  time: number; // offset from start in milliseconds
}

export interface Song {
  id: string;
  title: string;
  emoji: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  composer?: string;
  notes: SongNote[];
  description: string;
}

export interface RecordedNote {
  note: string;
  startTime: number;
  endTime?: number;
}

export interface Recording {
  id: string;
  title: string;
  timestamp: number;
  style: PianoStyle;
  notes: RecordedNote[];
  duration: number;
}

// 17 piano keys (almost 1.5 octaves, standard and playable on laptop keyboards)
export const PIANO_NOTES: PianoNote[] = [
  { note: 'C4', frequency: 261.63, type: 'white', keyboardKey: 'A', keyCode: 'KeyA', label: 'C' },
  { note: 'C#4', frequency: 277.18, type: 'black', keyboardKey: 'W', keyCode: 'KeyW', label: 'C#' },
  { note: 'D4', frequency: 293.66, type: 'white', keyboardKey: 'S', keyCode: 'KeyS', label: 'D' },
  { note: 'D#4', frequency: 311.13, type: 'black', keyboardKey: 'E', keyCode: 'KeyE', label: 'D#' },
  { note: 'E4', frequency: 329.63, type: 'white', keyboardKey: 'D', keyCode: 'KeyD', label: 'E' },
  { note: 'F4', frequency: 349.23, type: 'white', keyboardKey: 'F', keyCode: 'KeyF', label: 'F' },
  { note: 'F#4', frequency: 369.99, type: 'black', keyboardKey: 'T', keyCode: 'KeyT', label: 'F#' },
  { note: 'G4', frequency: 392.00, type: 'white', keyboardKey: 'G', keyCode: 'KeyG', label: 'G' },
  { note: 'G#4', frequency: 415.30, type: 'black', keyboardKey: 'Y', keyCode: 'KeyY', label: 'G#' },
  { note: 'A4', frequency: 440.00, type: 'white', keyboardKey: 'H', keyCode: 'KeyH', label: 'A' },
  { note: 'A#4', frequency: 466.16, type: 'black', keyboardKey: 'U', keyCode: 'KeyU', label: 'A#' },
  { note: 'B4', frequency: 493.88, type: 'white', keyboardKey: 'J', keyCode: 'KeyJ', label: 'B' },
  { note: 'C5', frequency: 523.25, type: 'white', keyboardKey: 'K', keyCode: 'KeyK', label: 'C' },
  { note: 'C#5', frequency: 554.37, type: 'black', keyboardKey: 'O', keyCode: 'KeyO', label: 'C#' },
  { note: 'D5', frequency: 587.33, type: 'white', keyboardKey: 'L', keyCode: 'KeyL', label: 'D' },
  { note: 'D#5', frequency: 622.25, type: 'black', keyboardKey: 'P', keyCode: 'KeyP', label: 'D#' },
  { note: 'E5', frequency: 659.25, type: 'white', keyboardKey: ';', keyCode: 'Semicolon', label: 'E' },
  { note: 'F5', frequency: 698.46, type: 'white', keyboardKey: '\'', keyCode: 'Quote', label: 'F' }
];

export const STYLE_CONFIGS: Record<PianoStyle, PianoStyleConfig> = {
  grand: {
    id: 'grand',
    name: 'Acoustic Grand',
    description: 'A rich, resonant, classical grand piano sound with deep acoustic sustain.',
    bgClass: 'bg-slate-900/60 text-slate-200 border-slate-800',
    accentClass: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20',
    textClass: 'text-indigo-400',
    keyboardBg: 'bg-slate-900 border-slate-800 shadow-2xl shadow-slate-950/50',
    emoji: '🎹'
  },
  electric: {
    id: 'electric',
    name: 'Electric Dream',
    description: 'A vintage warm Rhodes electric piano with auto-tremolo and sweet chorus.',
    bgClass: 'bg-slate-900/60 text-slate-200 border-slate-800',
    accentClass: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20',
    textClass: 'text-cyan-400',
    keyboardBg: 'bg-slate-900 border-slate-800 shadow-2xl shadow-slate-950/50',
    emoji: '🌌'
  },
  synthwave: {
    id: 'synthwave',
    name: 'Synthwave 1984',
    description: 'A retro dual-saw waves synthesizer with filter sweeping and stereo delay.',
    bgClass: 'bg-slate-900/60 text-slate-200 border-slate-800',
    accentClass: 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-600/20',
    textClass: 'text-pink-400',
    keyboardBg: 'bg-slate-900 border-slate-800 shadow-2xl shadow-slate-950/50',
    emoji: '🌅'
  },
  chiptune: {
    id: 'chiptune',
    name: '8-Bit Retro',
    description: 'Classic chiptune console square-wave synthesizer with subtle sweep vibrato.',
    bgClass: 'bg-slate-900/60 text-slate-200 border-slate-800',
    accentClass: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20',
    textClass: 'text-emerald-400',
    keyboardBg: 'bg-slate-900 border-slate-800 shadow-2xl shadow-slate-950/50',
    emoji: '👾'
  },
  organ: {
    id: 'organ',
    name: 'Majestic Organ',
    description: 'A powerful cathedral pipe organ combining multiple pipe octaves and harmonic drawbars.',
    bgClass: 'bg-slate-900/60 text-slate-200 border-slate-800',
    accentClass: 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20',
    textClass: 'text-purple-400',
    keyboardBg: 'bg-slate-900 border-slate-800 shadow-2xl shadow-slate-950/50',
    emoji: '⛪'
  },
  flute: {
    id: 'flute',
    name: 'Bansuri Flute',
    description: 'An organic wooden flute sound with rich air breath attack and natural vibrato.',
    bgClass: 'bg-slate-900/60 text-slate-200 border-slate-800',
    accentClass: 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/20',
    textClass: 'text-teal-400',
    keyboardBg: 'bg-slate-900 border-slate-800 shadow-2xl shadow-slate-950/50',
    emoji: '🪈'
  },
  tabla: {
    id: 'tabla',
    name: 'Indian Tabla',
    description: 'Tuned hand drums with a bass Bayan slide and resonant metallic Dayan rim strikes.',
    bgClass: 'bg-slate-900/60 text-slate-200 border-slate-800',
    accentClass: 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20',
    textClass: 'text-amber-400',
    keyboardBg: 'bg-slate-900 border-slate-800 shadow-2xl shadow-slate-950/50',
    emoji: '🥁'
  },
  guitar: {
    id: 'guitar',
    name: 'Acoustic Guitar',
    description: 'A warm folk acoustic steel-string guitar sound with plucked attack and fast damping.',
    bgClass: 'bg-slate-900/60 text-slate-200 border-slate-800',
    accentClass: 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20',
    textClass: 'text-orange-400',
    keyboardBg: 'bg-slate-900 border-slate-800 shadow-2xl shadow-slate-950/50',
    emoji: '🎸'
  },
  sitar: {
    id: 'sitar',
    name: 'Mystic Sitar',
    description: 'Traditional Indian lute with a buzzing Jawari bridge resonance and rich sympathetic drone strings.',
    bgClass: 'bg-slate-900/60 text-slate-200 border-slate-800',
    accentClass: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20',
    textClass: 'text-rose-400',
    keyboardBg: 'bg-slate-900 border-slate-800 shadow-2xl shadow-slate-950/50',
    emoji: '🪕'
  },
  mandolin: {
    id: 'mandolin',
    name: 'Classic Mandolin',
    description: 'A double-plucked tremolo Italian mandolin with bright high-frequency ringing resonance.',
    bgClass: 'bg-slate-900/60 text-slate-200 border-slate-800',
    accentClass: 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg shadow-yellow-600/20',
    textClass: 'text-yellow-400',
    keyboardBg: 'bg-slate-900 border-slate-800 shadow-2xl shadow-slate-950/50',
    emoji: '🎻'
  }
};

export const SONGS_LIBRARY: Song[] = [
  {
    id: 'twinkle',
    title: 'Twinkle Twinkle Little Star',
    emoji: '⭐',
    difficulty: 'Easy',
    composer: 'Traditional',
    description: 'A classic lullaby, perfect for practicing keyboard spacing and steady rhythm.',
    notes: [
      { note: 'C4', duration: 400, time: 0 },
      { note: 'C4', duration: 400, time: 500 },
      { note: 'G4', duration: 400, time: 1000 },
      { note: 'G4', duration: 400, time: 1500 },
      { note: 'A4', duration: 400, time: 2000 },
      { note: 'A4', duration: 400, time: 2500 },
      { note: 'G4', duration: 800, time: 3000 },

      { note: 'F4', duration: 400, time: 4000 },
      { note: 'F4', duration: 400, time: 4500 },
      { note: 'E4', duration: 400, time: 5000 },
      { note: 'E4', duration: 400, time: 5500 },
      { note: 'D4', duration: 400, time: 6000 },
      { note: 'D4', duration: 400, time: 6500 },
      { note: 'C4', duration: 800, time: 7000 },

      { note: 'G4', duration: 400, time: 8000 },
      { note: 'G4', duration: 400, time: 8500 },
      { note: 'F4', duration: 400, time: 9000 },
      { note: 'F4', duration: 400, time: 9500 },
      { note: 'E4', duration: 400, time: 10000 },
      { note: 'E4', duration: 400, time: 10500 },
      { note: 'D4', duration: 800, time: 11000 },

      { note: 'G4', duration: 400, time: 12000 },
      { note: 'G4', duration: 400, time: 12500 },
      { note: 'F4', duration: 400, time: 13000 },
      { note: 'F4', duration: 400, time: 13500 },
      { note: 'E4', duration: 400, time: 14000 },
      { note: 'E4', duration: 400, time: 14500 },
      { note: 'D4', duration: 800, time: 15000 },

      { note: 'C4', duration: 400, time: 16000 },
      { note: 'C4', duration: 400, time: 16500 },
      { note: 'G4', duration: 400, time: 17000 },
      { note: 'G4', duration: 400, time: 17500 },
      { note: 'A4', duration: 400, time: 18000 },
      { note: 'A4', duration: 400, time: 18500 },
      { note: 'G4', duration: 800, time: 19000 },

      { note: 'F4', duration: 400, time: 20000 },
      { note: 'F4', duration: 400, time: 20500 },
      { note: 'E4', duration: 400, time: 21000 },
      { note: 'E4', duration: 400, time: 21500 },
      { note: 'D4', duration: 400, time: 22000 },
      { note: 'D4', duration: 400, time: 22500 },
      { note: 'C4', duration: 800, time: 23000 }
    ]
  },
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    emoji: '🇪🇺',
    difficulty: 'Easy',
    composer: 'L. van Beethoven',
    description: 'An uplifting and majestic melody featuring note repetitions and sequential patterns.',
    notes: [
      { note: 'E4', duration: 450, time: 0 },
      { note: 'E4', duration: 450, time: 500 },
      { note: 'F4', duration: 450, time: 1000 },
      { note: 'G4', duration: 450, time: 1500 },
      { note: 'G4', duration: 450, time: 2000 },
      { note: 'F4', duration: 450, time: 2500 },
      { note: 'E4', duration: 450, time: 3000 },
      { note: 'D4', duration: 450, time: 3500 },
      { note: 'C4', duration: 450, time: 4000 },
      { note: 'C4', duration: 450, time: 4500 },
      { note: 'D4', duration: 450, time: 5000 },
      { note: 'E4', duration: 450, time: 5500 },
      { note: 'E4', duration: 600, time: 6000 },
      { note: 'D4', duration: 250, time: 6600 },
      { note: 'D4', duration: 800, time: 7000 },

      { note: 'E4', duration: 450, time: 8000 },
      { note: 'E4', duration: 450, time: 8500 },
      { note: 'F4', duration: 450, time: 9000 },
      { note: 'G4', duration: 450, time: 9500 },
      { note: 'G4', duration: 450, time: 10000 },
      { note: 'F4', duration: 450, time: 10500 },
      { note: 'E4', duration: 450, time: 11000 },
      { note: 'D4', duration: 450, time: 11500 },
      { note: 'C4', duration: 450, time: 12000 },
      { note: 'C4', duration: 450, time: 12500 },
      { note: 'D4', duration: 450, time: 13000 },
      { note: 'E4', duration: 450, time: 13500 },
      { note: 'D4', duration: 600, time: 14000 },
      { note: 'C4', duration: 250, time: 14600 },
      { note: 'C4', duration: 800, time: 15000 }
    ]
  },
  {
    id: 'fur-elise',
    title: 'Für Elise',
    emoji: '🎹',
    difficulty: 'Medium',
    composer: 'L. van Beethoven',
    description: 'Beethoven\'s famous masterpiece featuring sharp black keys. Perfect for training fingers with quick movements.',
    notes: [
      { note: 'E5', duration: 300, time: 0 },
      { note: 'D#5', duration: 300, time: 350 },
      { note: 'E5', duration: 300, time: 700 },
      { note: 'D#5', duration: 300, time: 1050 },
      { note: 'E5', duration: 300, time: 1400 },
      { note: 'B4', duration: 300, time: 1750 },
      { note: 'D5', duration: 300, time: 2100 },
      { note: 'C5', duration: 300, time: 2450 },
      { note: 'A4', duration: 800, time: 2800 },

      { note: 'C4', duration: 300, time: 3800 },
      { note: 'E4', duration: 300, time: 4150 },
      { note: 'A4', duration: 300, time: 4500 },
      { note: 'B4', duration: 800, time: 4850 },

      { note: 'E4', duration: 300, time: 5850 },
      { note: 'G#4', duration: 300, time: 6200 },
      { note: 'B4', duration: 300, time: 6550 },
      { note: 'C5', duration: 800, time: 6900 }
    ]
  },
  {
    id: 'happy-birthday',
    title: 'Happy Birthday to You',
    emoji: '🎂',
    difficulty: 'Medium',
    composer: 'Mildred J. & Patty Hill',
    description: 'Celebrate birthdays! This melody requires dynamic leaps across octaves.',
    notes: [
      { note: 'C4', duration: 300, time: 0 },
      { note: 'C4', duration: 150, time: 350 },
      { note: 'D4', duration: 400, time: 500 },
      { note: 'C4', duration: 400, time: 1000 },
      { note: 'F4', duration: 400, time: 1500 },
      { note: 'E4', duration: 800, time: 2000 },

      { note: 'C4', duration: 300, time: 3000 },
      { note: 'C4', duration: 150, time: 3350 },
      { note: 'D4', duration: 400, time: 3500 },
      { note: 'C4', duration: 400, time: 4000 },
      { note: 'G4', duration: 400, time: 4500 },
      { note: 'F4', duration: 800, time: 5000 },

      { note: 'C4', duration: 300, time: 6000 },
      { note: 'C4', duration: 150, time: 6350 },
      { note: 'C5', duration: 400, time: 6500 },
      { note: 'A4', duration: 400, time: 7000 },
      { note: 'F4', duration: 400, time: 7500 },
      { note: 'E4', duration: 400, time: 8000 },
      { note: 'D4', duration: 800, time: 8500 },

      { note: 'A#4', duration: 300, time: 9500 },
      { note: 'A#4', duration: 150, time: 9850 },
      { note: 'A4', duration: 400, time: 10000 },
      { note: 'F4', duration: 400, time: 10500 },
      { note: 'G4', duration: 400, time: 11000 },
      { note: 'F4', duration: 800, time: 11500 }
    ]
  }
];
