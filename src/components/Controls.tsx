import { PianoStyle, STYLE_CONFIGS } from '../types';
import { Volume2, Keyboard, RotateCcw, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

interface ControlsProps {
  currentStyle: PianoStyle;
  onStyleChange: (style: PianoStyle) => void;
  sustainOn: boolean;
  onSustainToggle: (on: boolean) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  octaveOffset: number; // -1, 0, 1
  onOctaveOffsetChange: (offset: number) => void;
  showLabels: boolean;
  onToggleLabels: (show: boolean) => void;
  onReset: () => void;
}

export default function Controls({
  currentStyle,
  onStyleChange,
  sustainOn,
  onSustainToggle,
  volume,
  onVolumeChange,
  octaveOffset,
  onOctaveOffsetChange,
  showLabels,
  onToggleLabels,
  onReset
}: ControlsProps) {
  const activeStyleConfig = STYLE_CONFIGS[currentStyle];

  const getActiveStyleClasses = (styleId: PianoStyle) => {
    switch (styleId) {
      case 'grand': return 'border-indigo-500/50 ring-1 ring-indigo-500/20 text-indigo-400 bg-indigo-950/30';
      case 'electric': return 'border-cyan-500/50 ring-1 ring-cyan-500/20 text-cyan-400 bg-cyan-950/30';
      case 'synthwave': return 'border-pink-500/50 ring-1 ring-pink-500/20 text-pink-400 bg-pink-950/30';
      case 'chiptune': return 'border-emerald-500/50 ring-1 ring-emerald-500/20 text-emerald-400 bg-emerald-950/30';
      case 'organ': return 'border-purple-500/50 ring-1 ring-purple-500/20 text-purple-400 bg-purple-950/30';
      case 'flute': return 'border-teal-500/50 ring-1 ring-teal-500/20 text-teal-400 bg-teal-950/30';
      case 'tabla': return 'border-amber-500/50 ring-1 ring-amber-500/20 text-amber-400 bg-amber-950/30';
      case 'guitar': return 'border-orange-500/50 ring-1 ring-orange-500/20 text-orange-400 bg-orange-950/30';
      case 'sitar': return 'border-rose-500/50 ring-1 ring-rose-500/20 text-rose-400 bg-rose-950/30';
      case 'mandolin': return 'border-yellow-500/50 ring-1 ring-yellow-500/20 text-yellow-400 bg-yellow-950/30';
      case 'violin': return 'border-red-500/50 ring-1 ring-red-500/20 text-red-400 bg-red-950/30';
    }
  };

  const getStyleIndicatorColor = () => {
    switch (currentStyle) {
      case 'grand': return 'text-indigo-400';
      case 'electric': return 'text-cyan-400';
      case 'synthwave': return 'text-pink-400';
      case 'chiptune': return 'text-emerald-400';
      case 'organ': return 'text-purple-400';
      case 'flute': return 'text-teal-400';
      case 'tabla': return 'text-amber-400';
      case 'guitar': return 'text-orange-400';
      case 'sitar': return 'text-rose-400';
      case 'mandolin': return 'text-yellow-400';
      case 'violin': return 'text-red-400';
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 bg-slate-900/50 border border-slate-800 backdrop-blur-md p-5 rounded-2xl shadow-xl">
      {/* 1. Style Selection (5 columns) */}
      <div className="xl:col-span-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 animate-pulse ${getStyleIndicatorColor()}`} />
          <h2 className="text-sm font-bold tracking-tight text-slate-200 uppercase font-display">
            Instrument Style
          </h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md">
          Each instrument style activates high-fidelity multi-oscillator synthesizers.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-3 gap-2 mt-1">
          {(Object.keys(STYLE_CONFIGS) as PianoStyle[]).map((styleId) => {
            const config = STYLE_CONFIGS[styleId];
            const isSelected = currentStyle === styleId;
            return (
              <button
                key={styleId}
                id={`btn-style-${styleId}`}
                onClick={() => onStyleChange(styleId)}
                className={`flex items-center gap-2.5 px-3 py-2 h-14 rounded-xl text-left border transition-all duration-150 group cursor-pointer ${
                  isSelected
                    ? `${getActiveStyleClasses(styleId)} font-semibold`
                    : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800 text-slate-400'
                }`}
              >
                <span className="text-lg group-hover:scale-110 transition-transform shrink-0">
                  {config.emoji}
                </span>
                <span className="text-xs font-semibold leading-snug line-clamp-2">{config.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="hidden xl:block xl:col-span-1 border-r border-slate-800/60 my-1 justify-self-center" />

      {/* 2. Audio Settings & Keyboard Controls (6 columns) */}
      <div className="xl:col-span-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-6">
        
        {/* Left Column: Volume and Sustain */}
        <div className="flex flex-col gap-4">
          {/* Master Volume */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-tight text-slate-300 uppercase font-display flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-slate-400" /> Master Volume
              </span>
              <span className="text-xs font-mono font-semibold text-slate-300 bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input
              id="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Sustain Pedal Toggle */}
          <div className="flex flex-col gap-2 mt-1">
            <span className="text-xs font-bold tracking-tight text-slate-300 uppercase font-display">
              Sustain Pedal
            </span>
            <button
              id="btn-sustain-toggle"
              onClick={() => onSustainToggle(!sustainOn)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border font-mono text-xs transition-all duration-150 cursor-pointer ${
                sustainOn
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-700 shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-950/40 hover:bg-slate-800 text-slate-300 border-slate-800/80'
              }`}
            >
              <span className="font-sans font-bold text-xs uppercase">
                {sustainOn ? 'Sustain Active' : 'Sustain Off'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                sustainOn ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                SPACEBAR
              </span>
            </button>
          </div>
        </div>

        {/* Right Column: Octave Adjust & Key Hints */}
        <div className="flex flex-col gap-4">
          {/* Octave Adjust */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold tracking-tight text-slate-300 uppercase font-display">
              Octave Shift
            </span>
            <div className="flex items-center gap-1.5 bg-slate-950/40 p-1 rounded-xl border border-slate-800/80">
              <button
                id="btn-octave-down"
                onClick={() => onOctaveOffsetChange(Math.max(-1, octaveOffset - 1))}
                disabled={octaveOffset === -1}
                className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-slate-900 border border-slate-800/80 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:text-white cursor-pointer transition-colors flex items-center justify-center gap-1"
                title="Shift Octave Down"
              >
                <ChevronLeft className="w-3.5 h-3.5 shrink-0" /> Down
              </button>
              <div className="px-2 text-[11px] font-mono font-bold text-slate-200 min-w-[45px] text-center shrink-0">
                {octaveOffset === 0 ? 'Normal' : octaveOffset > 0 ? '+1 Oct' : '-1 Oct'}
              </div>
              <button
                id="btn-octave-up"
                onClick={() => onOctaveOffsetChange(Math.min(1, octaveOffset + 1))}
                disabled={octaveOffset === 1}
                className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-slate-900 border border-slate-800/80 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:text-white cursor-pointer transition-colors flex items-center justify-center gap-1"
                title="Shift Octave Up"
              >
                Up <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          </div>

          {/* Controls Utility (Toggle labels / Reset) */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              id="btn-toggle-labels"
              onClick={() => onToggleLabels(!showLabels)}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                showLabels
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-950/40 hover:bg-slate-800 text-slate-300 border-slate-800/80'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>{showLabels ? 'Hide Keys' : 'Show Keys'}</span>
            </button>

            <button
              id="btn-reset-synth"
              onClick={onReset}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-800/80 bg-slate-950/40 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
