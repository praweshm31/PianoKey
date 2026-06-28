import React from 'react';
import { motion } from 'motion/react';
import { PianoNote, PianoStyle, STYLE_CONFIGS } from '../types';

interface PianoKeyProps {
  key?: string | number;
  noteConfig: PianoNote;
  isActive: boolean;
  isGuided: boolean; // Highlights if this is the next note in guide mode
  showKeyLabels: boolean;
  style: PianoStyle;
  onPress: (note: string) => void;
  onRelease: (note: string) => void;
}

export default function PianoKey({
  noteConfig,
  isActive,
  isGuided,
  showKeyLabels,
  style,
  onPress,
  onRelease
}: PianoKeyProps) {
  const isBlack = noteConfig.type === 'black';

  // Get style-specific active colors
  const getActiveStyles = () => {
    switch (style) {
      case 'grand':
        return isBlack
          ? 'bg-amber-500 shadow-[0_0_15px_#f59e0b] border-amber-400'
          : 'bg-amber-100 border-amber-300 shadow-[inset_0_-8px_0_#f59e0b]';
      case 'electric':
        return isBlack
          ? 'bg-cyan-500 shadow-[0_0_15px_#06b6d4] border-cyan-400'
          : 'bg-cyan-50 border-cyan-300 shadow-[inset_0_-8px_0_#06b6d4]';
      case 'synthwave':
        return isBlack
          ? 'bg-pink-500 shadow-[0_0_20px_#ec4899] border-pink-400'
          : 'bg-pink-100 border-pink-300 shadow-[inset_0_-10px_0_#ec4899]';
      case 'chiptune':
        return isBlack
          ? 'bg-emerald-400 shadow-[0_0_12px_#10b981] border-emerald-300'
          : 'bg-emerald-100 border-emerald-300 shadow-[inset_0_-8px_0_#10b981]';
      case 'organ':
        return isBlack
          ? 'bg-purple-500 shadow-[0_0_15px_#a855f7] border-purple-400'
          : 'bg-purple-100 border-purple-300 shadow-[inset_0_-8px_0_#a855f7]';
      case 'flute':
        return isBlack
          ? 'bg-teal-500 shadow-[0_0_15px_#14b8a6] border-teal-400'
          : 'bg-teal-100 border-teal-300 shadow-[inset_0_-8px_0_#14b8a6]';
      case 'tabla':
        return isBlack
          ? 'bg-amber-500 shadow-[0_0_15px_#f59e0b] border-amber-400'
          : 'bg-amber-100 border-amber-300 shadow-[inset_0_-8px_0_#f59e0b]';
      case 'guitar':
        return isBlack
          ? 'bg-orange-500 shadow-[0_0_15px_#f97316] border-orange-400'
          : 'bg-orange-100 border-orange-300 shadow-[inset_0_-8px_0_#f97316]';
      case 'sitar':
        return isBlack
          ? 'bg-rose-500 shadow-[0_0_15px_#f43f5e] border-rose-400'
          : 'bg-rose-100 border-rose-300 shadow-[inset_0_-8px_0_#f43f5e]';
      case 'mandolin':
        return isBlack
          ? 'bg-yellow-500 shadow-[0_0_15px_#eab308] border-yellow-400'
          : 'bg-yellow-100 border-yellow-300 shadow-[inset_0_-8px_0_#eab308]';
    }
  };

  // Base key styles
  const baseStyle = isBlack
    ? `absolute h-24 md:h-32 w-[6.5%] z-10 rounded-b transition-all duration-75 select-none cursor-pointer
       ${isActive ? getActiveStyles() : 'bg-stone-800 hover:bg-stone-700 border-stone-900 shadow-md'} 
       border-b-[4px] border-x`
    : `h-36 md:h-48 w-full rounded-b-md transition-all duration-75 select-none cursor-pointer
       ${isActive ? getActiveStyles() : 'bg-white hover:bg-stone-50 border-stone-200 shadow-sm'} 
       border-b-[6px] border-stone-300 border-x flex flex-col justify-end pb-3 items-center relative`;

  // Calculate left percentage position for black keys
  const getBlackKeyLeft = (note: string) => {
    // 11 White keys: C4, D4, E4, F4, G4, A4, B4, C5, D5, E5, F5
    const widthOfOneWhiteKey = 100 / 11;
    let multiplier = 0;

    switch (note) {
      case 'C#4': multiplier = 1; break; // After C4 (1st white key)
      case 'D#4': multiplier = 2; break; // After D4 (2nd white key)
      case 'F#4': multiplier = 4; break; // After F4 (4th white key)
      case 'G#4': multiplier = 5; break; // After G4 (5th white key)
      case 'A#4': multiplier = 6; break; // After A4 (6th white key)
      case 'C#5': multiplier = 8; break; // After C5 (8th white key)
      case 'D#5': multiplier = 9; break; // After D5 (9th white key)
      default: return '0%';
    }

    // Centered exactly on the seam between white keys
    const offset = multiplier * widthOfOneWhiteKey - (6.5 / 2);
    return `${offset}%`;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    onPress(noteConfig.note);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    onPress(noteConfig.note);
  };

  const currentTheme = STYLE_CONFIGS[style];

  // Render Black Key
  if (isBlack) {
    return (
      <div
        id={`key-${noteConfig.note}`}
        className={baseStyle}
        style={{ left: getBlackKeyLeft(noteConfig.note) }}
        onMouseDown={handleMouseDown}
        onMouseUp={() => onRelease(noteConfig.note)}
        onMouseLeave={() => onRelease(noteConfig.note)}
        onTouchStart={handleTouchStart}
        onTouchEnd={() => onRelease(noteConfig.note)}
      >
        {/* Highlight ring for Guide mode */}
        {isGuided && (
          <div className="absolute inset-x-1 top-1 h-2 rounded bg-yellow-400 animate-pulse border border-yellow-300" />
        )}

        {/* Labels */}
        {showKeyLabels && (
          <div className="absolute bottom-2 inset-x-0 flex flex-col items-center gap-0.5 text-center pointer-events-none">
            <span className="text-[9px] md:text-[10px] font-mono font-bold text-stone-300">
              {noteConfig.keyboardKey}
            </span>
            <span className="text-[8px] font-mono font-bold text-stone-500">
              {noteConfig.label}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Render White Key
  return (
    <div
      id={`key-${noteConfig.note}`}
      className={baseStyle}
      onMouseDown={handleMouseDown}
      onMouseUp={() => onRelease(noteConfig.note)}
      onMouseLeave={() => onRelease(noteConfig.note)}
      onTouchStart={handleTouchStart}
      onTouchEnd={() => onRelease(noteConfig.note)}
    >
      {/* Highlight glow for Guide mode */}
      {isGuided && (
        <div className="absolute inset-x-1 bottom-1 h-3 rounded-b-md bg-yellow-400/80 animate-pulse border border-yellow-300" />
      )}

      {/* Floating active dot */}
      {isActive && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0.8 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className={`absolute bottom-12 w-6 h-6 rounded-full opacity-60 filter blur-sm pointer-events-none ${
            style === 'grand' ? 'bg-amber-400' :
            style === 'electric' ? 'bg-cyan-400' :
            style === 'synthwave' ? 'bg-pink-500' :
            style === 'chiptune' ? 'bg-emerald-400' : 'bg-purple-400'
          }`}
        />
      )}

      {/* Labels */}
      {showKeyLabels && (
        <div className="flex flex-col items-center gap-0.5 select-none pointer-events-none">
          {/* Laptop keyboard shortcut character */}
          <span className="text-xs md:text-sm font-mono font-extrabold text-stone-800 bg-stone-100 border border-stone-200/60 px-1.5 py-0.5 rounded shadow-sm">
            {noteConfig.keyboardKey}
          </span>
          {/* Musical Note Label */}
          <span className="text-[10px] font-mono font-bold text-stone-400 mt-1">
            {noteConfig.note}
          </span>
        </div>
      )}
    </div>
  );
}
