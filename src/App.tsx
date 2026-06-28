import React, { useState, useEffect, useRef } from 'react';
import { PianoStyle, PIANO_NOTES, SONGS_LIBRARY, Song, Recording, RecordedNote, STYLE_CONFIGS } from './types';
import audioEngine from './utils/audio';
import Visualizer from './components/Visualizer';
import PianoKey from './components/PianoKey';
import Controls from './components/Controls';
import SongLibrary from './components/SongLibrary';
import SongCreator from './components/SongCreator';
import { Music, AlertCircle, Info, Sparkles, Piano } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // 1. Piano state
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [currentStyle, setCurrentStyle] = useState<PianoStyle>('grand');
  const [sustainOn, setSustainOn] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [octaveOffset, setOctaveOffset] = useState<number>(0);
  const [showLabels, setShowLabels] = useState(true);

  // 2. Songs / Autoplay / Guide State
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isPlayingSong, setIsPlayingSong] = useState(false);
  const [currentSongNoteIndex, setCurrentSongNoteIndex] = useState(0);
  const [guideModeActive, setGuideModeActive] = useState(true);
  const [songCompleted, setSongCompleted] = useState(false);

  // 3. Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordedNotes, setRecordedNotes] = useState<RecordedNote[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);

  // Timeout/Interval refs to clean up scheduled playbacks
  const playbackTimeoutsRef = useRef<number[]>([]);
  const activeTouchNotesRef = useRef<Set<string>>(new Set());

  // Load recordings on startup
  useEffect(() => {
    const saved = localStorage.getItem('piano_recordings');
    if (saved) {
      try {
        setRecordings(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading recordings:', e);
      }
    }
  }, []);

  // Update volume in engine
  useEffect(() => {
    audioEngine.setVolume(volume);
  }, [volume]);

  // Clean up all playbacks on unmount
  useEffect(() => {
    return () => {
      clearScheduledPlaybacks();
      audioEngine.stopAllNotes();
    };
  }, []);

  const clearScheduledPlaybacks = () => {
    playbackTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    playbackTimeoutsRef.current = [];
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard inputs, buttons, range sliders, etc.
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.repeat) return;

      // Spacebar toggles sustain pedal
      if (e.code === 'Space') {
        e.preventDefault();
        setSustainOn(true);
        audioEngine.toggleSustain(true);
        return;
      }

      // Match computer keyboard input to piano note
      const matchedNote = PIANO_NOTES.find(
        (n) => n.keyCode.toLowerCase() === e.code.toLowerCase() || n.keyboardKey.toLowerCase() === e.key.toLowerCase()
      );

      if (matchedNote) {
        e.preventDefault();
        handleNotePress(matchedNote.note);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setSustainOn(false);
        audioEngine.toggleSustain(false);
        return;
      }

      const matchedNote = PIANO_NOTES.find(
        (n) => n.keyCode.toLowerCase() === e.code.toLowerCase() || n.keyboardKey.toLowerCase() === e.key.toLowerCase()
      );

      if (matchedNote) {
        e.preventDefault();
        handleNoteRelease(matchedNote.note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentStyle, octaveOffset, selectedSong, guideModeActive, isPlayingSong, currentSongNoteIndex, isRecording, recordingStartTime]);

  // Handle Note play (Mouse/Touch or Keyboard)
  const handleNotePress = (note: string) => {
    const noteConfig = PIANO_NOTES.find((n) => n.note === note);
    if (!noteConfig) return;

    // Trigger lazy init of web audio
    audioEngine.init();

    // Frequency shift based on octave
    const freq = noteConfig.frequency * Math.pow(2, octaveOffset);
    audioEngine.playNote(note, freq, currentStyle);

    // Add note to active notes list
    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.add(note);
      return next;
    });

    // Check Song Guide Mode progression
    if (selectedSong && guideModeActive && !isPlayingSong) {
      const expectedNote = selectedSong.notes[currentSongNoteIndex]?.note;
      if (note === expectedNote) {
        const nextIndex = currentSongNoteIndex + 1;
        if (nextIndex >= selectedSong.notes.length) {
          setSongCompleted(true);
          setCurrentSongNoteIndex(0);
          setTimeout(() => {
            setSongCompleted(false);
          }, 4500);
        } else {
          setCurrentSongNoteIndex(nextIndex);
        }
      }
    }

    // Record note press if recording
    if (isRecording && recordingStartTime) {
      const offset = Date.now() - recordingStartTime;
      setRecordedNotes((prev) => [...prev, { note, startTime: offset }]);
    }
  };

  // Handle Note Release (Mouse/Touch or Keyboard)
  const handleNoteRelease = (note: string) => {
    audioEngine.stopNote(note);

    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.delete(note);
      return next;
    });

    // Record note release if recording
    if (isRecording && recordingStartTime) {
      const offset = Date.now() - recordingStartTime;
      setRecordedNotes((prev) => {
        const list = [...prev];
        const lastOpenNoteIdx = list.findIndex(
          (n) => n.note === note && n.endTime === undefined
        );
        if (lastOpenNoteIdx !== -1) {
          list[lastOpenNoteIdx] = { ...list[lastOpenNoteIdx], endTime: offset };
        }
        return list;
      });
    }
  };

  // Handle continuous touch moves / glissando across keys (especially for iPad & mobile)
  const handleKeyboardTouch = (e: React.TouchEvent) => {
    // Prevent default scrolling/zooming gestures while playing piano
    e.preventDefault();

    const currentTouchNotes = new Set<string>();

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const keyElement = element?.closest('[data-note]');
      if (keyElement) {
        const note = keyElement.getAttribute('data-note');
        if (note) {
          currentTouchNotes.add(note);
        }
      }
    }

    // Play notes that are newly touched
    for (const note of currentTouchNotes) {
      if (!activeTouchNotesRef.current.has(note)) {
        handleNotePress(note);
      }
    }

    // Release notes that are no longer touched
    for (const note of activeTouchNotesRef.current) {
      if (!currentTouchNotes.has(note)) {
        handleNoteRelease(note);
      }
    }

    activeTouchNotesRef.current = currentTouchNotes;
  };

  const handleKeyboardTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    const currentTouchNotes = new Set<string>();

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const keyElement = element?.closest('[data-note]');
      if (keyElement) {
        const note = keyElement.getAttribute('data-note');
        if (note) {
          currentTouchNotes.add(note);
        }
      }
    }

    // Release any notes that are no longer touched
    for (const note of activeTouchNotesRef.current) {
      if (!currentTouchNotes.has(note)) {
        handleNoteRelease(note);
      }
    }

    activeTouchNotesRef.current = currentTouchNotes;
  };

  // Select a Song
  const handleSelectSong = (song: Song | null) => {
    // Stop any ongoing playbacks
    stopAutoplayAndPlayback();
    setSelectedSong(song);
    setCurrentSongNoteIndex(0);
    setSongCompleted(false);
    if (song) {
      setGuideModeActive(true);
    }
  };

  const stopAutoplayAndPlayback = () => {
    clearScheduledPlaybacks();
    setIsPlayingSong(false);
    setPlayingRecordingId(null);
    audioEngine.stopAllNotes();
    setActiveNotes(new Set());
  };

  // Song Autoplay mode
  const handleStartSongAutoplay = () => {
    if (!selectedSong) return;
    stopAutoplayAndPlayback();
    setIsPlayingSong(true);
    setCurrentSongNoteIndex(0);

    const timeouts: number[] = [];

    selectedSong.notes.forEach((songNote) => {
      // 1. Schedule note press
      const pressTimeout = window.setTimeout(() => {
        const config = PIANO_NOTES.find((n) => n.note === songNote.note);
        if (config) {
          const freq = config.frequency * Math.pow(2, octaveOffset);
          audioEngine.playNote(songNote.note, freq, currentStyle);

          setActiveNotes((prev) => {
            const next = new Set(prev);
            next.add(songNote.note);
            return next;
          });
        }
        setCurrentSongNoteIndex((prev) => prev + 1);
      }, songNote.time);

      // 2. Schedule note release
      const releaseTimeout = window.setTimeout(() => {
        audioEngine.stopNote(songNote.note, true); // force release
        setActiveNotes((prev) => {
          const next = new Set(prev);
          next.delete(songNote.note);
          return next;
        });
      }, songNote.time + songNote.duration);

      timeouts.push(pressTimeout, releaseTimeout);
    });

    // Final ending cleanup
    const finalNote = selectedSong.notes[selectedSong.notes.length - 1];
    const endTimeout = window.setTimeout(() => {
      setIsPlayingSong(false);
      setCurrentSongNoteIndex(0);
      setSongCompleted(true);
      setTimeout(() => setSongCompleted(false), 4500);
    }, finalNote.time + finalNote.duration + 500);

    timeouts.push(endTimeout);
    playbackTimeoutsRef.current = timeouts;
  };

  // Start Live Recording
  const handleStartRecording = () => {
    stopAutoplayAndPlayback();
    setIsRecording(true);
    setRecordingStartTime(Date.now());
    setRecordedNotes([]);
  };

  // Stop Live Recording
  const handleStopRecording = (title: string) => {
    setIsRecording(false);
    if (!recordingStartTime) return;

    const duration = Date.now() - recordingStartTime;
    // Clean up any notes that were left unreleased
    const cleanNotes = recordedNotes.map((note) => {
      if (note.endTime === undefined) {
        return { ...note, endTime: duration };
      }
      return note;
    });

    const newRecording: Recording = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      timestamp: Date.now(),
      style: currentStyle,
      notes: cleanNotes,
      duration
    };

    const updated = [newRecording, ...recordings];
    setRecordings(updated);
    localStorage.setItem('piano_recordings', JSON.stringify(updated));

    setRecordingStartTime(null);
    setRecordedNotes([]);
  };

  // Delete Recording
  const handleDeleteRecording = (id: string) => {
    const updated = recordings.filter((r) => r.id !== id);
    setRecordings(updated);
    localStorage.setItem('piano_recordings', JSON.stringify(updated));
    if (playingRecordingId === id) {
      stopAutoplayAndPlayback();
    }
  };

  // Play Recording
  const handlePlayRecording = (recording: Recording) => {
    stopAutoplayAndPlayback();
    setPlayingRecordingId(recording.id);

    const timeouts: number[] = [];

    recording.notes.forEach((recNote) => {
      // Note Press
      const pressTimeout = window.setTimeout(() => {
        const config = PIANO_NOTES.find((n) => n.note === recNote.note);
        if (config) {
          const freq = config.frequency * Math.pow(2, octaveOffset);
          // Play with recording's native style or current style
          audioEngine.playNote(recNote.note, freq, recording.style || currentStyle);

          setActiveNotes((prev) => {
            const next = new Set(prev);
            next.add(recNote.note);
            return next;
          });
        }
      }, recNote.startTime);

      // Note Release
      if (recNote.endTime) {
        const releaseTimeout = window.setTimeout(() => {
          audioEngine.stopNote(recNote.note, true);
          setActiveNotes((prev) => {
            const next = new Set(prev);
            next.delete(recNote.note);
            return next;
          });
        }, recNote.endTime);
        timeouts.push(releaseTimeout);
      }

      timeouts.push(pressTimeout);
    });

    // Playback finished timeout
    const finishTimeout = window.setTimeout(() => {
      setPlayingRecordingId(null);
      setActiveNotes(new Set());
    }, recording.duration + 200);

    timeouts.push(finishTimeout);
    playbackTimeoutsRef.current = timeouts;
  };

  const handleReset = () => {
    stopAutoplayAndPlayback();
    setCurrentStyle('grand');
    setSustainOn(false);
    setVolume(0.7);
    setOctaveOffset(0);
    setShowLabels(true);
    setSelectedSong(null);
    setIsRecording(false);
  };

  const styleConfig = STYLE_CONFIGS[currentStyle];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col justify-between font-sans antialiased pb-8 selection:bg-indigo-600 selection:text-white bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
      
      {/* 1. Elegant Header */}
      <header className="w-full h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 md:px-8 flex items-center justify-between mb-6">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              <Piano className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-100 flex items-center">
              PianoKey <span className="text-slate-500 font-normal ml-1">Studio</span>
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-400 font-semibold font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Low Latency Live
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Workstation Area */}
      <main className="w-full max-w-7xl mx-auto px-4 md:px-6 flex-1 flex flex-col gap-6">
        
        {/* Playback Completion Popup */}
        <AnimatePresence>
          {songCompleted && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-xl max-w-md mx-auto w-full text-center flex flex-col gap-2 items-center"
            >
              <div className="bg-amber-500/10 text-amber-500 p-2 rounded-full animate-bounce">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold font-display">Performance Finished!</h3>
              <p className="text-xs text-stone-400">
                You've successfully played {selectedSong?.title || 'the recording'}! Keep practicing to master your skills.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Central visualizer + Piano segment */}
        <div className="w-full bg-slate-900/40 border border-slate-800/80 rounded-3xl shadow-2xl p-4 md:p-6 flex flex-col gap-4 backdrop-blur-sm">
          
          {/* Audio Visualizer */}
          <Visualizer activeNotes={activeNotes} style={currentStyle} />

          {/* Virtual Piano Keyboard Wrapper */}
          <div className="relative">
            {/* Piano chassis borders */}
            <div className={`p-3 md:p-4 rounded-2xl shadow-xl border-t-8 border-x-4 border-b-8 transition-colors duration-150 relative ${styleConfig.keyboardBg}`}>
              
              {/* Keyboard rail brand plate */}
              <div className="absolute top-1 inset-x-0 flex justify-center pointer-events-none opacity-40">
                <div className="font-mono text-[9px] font-bold text-stone-500 tracking-widest uppercase bg-black/30 px-3 py-0.5 rounded-md">
                  {styleConfig.name.toUpperCase()} SYNTHENGINE
                </div>
              </div>

              {/* The piano keys container with continuous touch slide tracking */}
              <div 
                className="relative w-full flex bg-stone-350 select-none pt-4 rounded-b overflow-visible touch-none"
                onTouchStart={handleKeyboardTouch}
                onTouchMove={handleKeyboardTouch}
                onTouchEnd={handleKeyboardTouchEnd}
                onTouchCancel={handleKeyboardTouchEnd}
              >
                {/* 1. White keys */}
                {PIANO_NOTES.filter((n) => n.type === 'white').map((noteConfig) => {
                  const isNoteActive = activeNotes.has(noteConfig.note);
                  const isGuided =
                    selectedSong &&
                    guideModeActive &&
                    !isPlayingSong &&
                    selectedSong.notes[currentSongNoteIndex]?.note === noteConfig.note;

                  return (
                    <PianoKey
                      key={noteConfig.note}
                      noteConfig={noteConfig}
                      isActive={isNoteActive}
                      isGuided={!!isGuided}
                      showKeyLabels={showLabels}
                      style={currentStyle}
                      onPress={handleNotePress}
                      onRelease={handleNoteRelease}
                    />
                  );
                })}

                {/* 2. Black keys absolute overlay */}
                {PIANO_NOTES.filter((n) => n.type === 'black').map((noteConfig) => {
                  const isNoteActive = activeNotes.has(noteConfig.note);
                  const isGuided =
                    selectedSong &&
                    guideModeActive &&
                    !isPlayingSong &&
                    selectedSong.notes[currentSongNoteIndex]?.note === noteConfig.note;

                  return (
                    <PianoKey
                      key={noteConfig.note}
                      noteConfig={noteConfig}
                      isActive={isNoteActive}
                      isGuided={!!isGuided}
                      showKeyLabels={showLabels}
                      style={currentStyle}
                      onPress={handleNotePress}
                      onRelease={handleNoteRelease}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick interactive note banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-slate-950/50 border border-slate-800/80 rounded-xl text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span>
                Tip: Play with your laptop keys <strong className="text-indigo-400 font-mono">[A] through [']</strong>. Hold <strong className="text-indigo-400 font-mono">[SPACEBAR]</strong> for the sustain pedal!
              </span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500">ACTIVE NOTES:</span>
              <div className="flex gap-1">
                {activeNotes.size > 0 ? (
                  Array.from(activeNotes).map((note) => (
                    <span
                      key={note}
                      className="bg-indigo-950/40 border border-indigo-900/30 text-indigo-300 font-mono text-[10px] px-2 py-0.5 rounded font-bold"
                    >
                      {note}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 italic text-[10px]">None</span>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* 3. Controls and Song Library side-by-side dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Panel */}
          <div className="lg:col-span-7">
            <Controls
              currentStyle={currentStyle}
              onStyleChange={setCurrentStyle}
              sustainOn={sustainOn}
              onSustainToggle={(on) => {
                setSustainOn(on);
                audioEngine.toggleSustain(on);
              }}
              volume={volume}
              onVolumeChange={setVolume}
              octaveOffset={octaveOffset}
              onOctaveOffsetChange={setOctaveOffset}
              showLabels={showLabels}
              onToggleLabels={setShowLabels}
              onReset={handleReset}
            />
          </div>

          {/* Songs/Recordings Library */}
          <div className="lg:col-span-5 h-full">
            <SongLibrary
              selectedSong={selectedSong}
              onSelectSong={handleSelectSong}
              isPlayingSong={isPlayingSong}
              onStartSongAutoplay={handleStartSongAutoplay}
              onStopSongAutoplay={stopAutoplayAndPlayback}
              currentSongNoteIndex={currentSongNoteIndex}
              guideModeActive={guideModeActive}
              onToggleGuideMode={setGuideModeActive}
              isRecording={isRecording}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              recordings={recordings}
              onDeleteRecording={handleDeleteRecording}
              onPlayRecording={handlePlayRecording}
              playingRecordingId={playingRecordingId}
              onStopRecordingPlayback={stopAutoplayAndPlayback}
            />
          </div>
        </div>

        {/* 3.5 Studio Vocal Recorder & Song Mixer */}
        <SongCreator />

      </main>

      {/* 4. Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 mt-8 py-4 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] uppercase tracking-widest text-slate-500 font-semibold font-mono">
        <div className="flex gap-6">
          <span>Octave: <span className="text-indigo-400">{octaveOffset === 0 ? 'C4 - C5' : octaveOffset > 0 ? 'C5 - C6' : 'C3 - C4'}</span></span>
          <span>Velocity: <span className="text-indigo-400">127</span></span>
          <span>Scale: <span className="text-indigo-400">C Major</span></span>
        </div>
        <div className="flex items-center gap-4">
          <span>Created by <span className="text-indigo-400 font-bold">Prawesh Meshram</span></span>
          <span>&bull;</span>
          <span>Connected Devices: (0)</span>
        </div>
      </footer>

    </div>
  );
}
