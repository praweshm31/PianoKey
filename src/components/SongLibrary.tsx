import React, { useState, useEffect } from 'react';
import { Song, Recording, SONGS_LIBRARY } from '../types';
import { Play, Square, Circle, Trash2, Music, Award, Disc, Compass, Sparkles } from 'lucide-react';

interface SongLibraryProps {
  // Guide / Song Playback
  selectedSong: Song | null;
  onSelectSong: (song: Song | null) => void;
  isPlayingSong: boolean;
  onStartSongAutoplay: () => void;
  onStopSongAutoplay: () => void;
  currentSongNoteIndex: number;
  guideModeActive: boolean;
  onToggleGuideMode: (active: boolean) => void;

  // Recording
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: (title: string) => void;
  recordings: Recording[];
  onDeleteRecording: (id: string) => void;
  onPlayRecording: (rec: Recording) => void;
  playingRecordingId: string | null;
  onStopRecordingPlayback: () => void;
}

export default function SongLibrary({
  selectedSong,
  onSelectSong,
  isPlayingSong,
  onStartSongAutoplay,
  onStopSongAutoplay,
  currentSongNoteIndex,
  guideModeActive,
  onToggleGuideMode,
  isRecording,
  onStartRecording,
  onStopRecording,
  recordings,
  onDeleteRecording,
  onPlayRecording,
  playingRecordingId,
  onStopRecordingPlayback
}: SongLibraryProps) {
  const [activeTab, setActiveTab] = useState<'songs' | 'recordings'>('songs');
  const [newRecordingTitle, setNewRecordingTitle] = useState('');
  const [isNamingRecording, setIsNamingRecording] = useState(false);

  // Auto-fill a name like "My Masterpiece #1"
  const startStopRecordingFlow = () => {
    if (isRecording) {
      setIsNamingRecording(true);
    } else {
      onStartRecording();
    }
  };

  const handleSaveRecording = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newRecordingTitle.trim() || `My Recording #${recordings.length + 1}`;
    onStopRecording(title);
    setNewRecordingTitle('');
    setIsNamingRecording(false);
    setActiveTab('recordings');
  };

  const handleCancelNaming = () => {
    onStopRecording(`My Recording #${recordings.length + 1}`);
    setNewRecordingTitle('');
    setIsNamingRecording(false);
    setActiveTab('recordings');
  };

  // Next note details in Guide Mode
  const nextGuideNote = selectedSong && currentSongNoteIndex < selectedSong.notes.length
    ? selectedSong.notes[currentSongNoteIndex]
    : null;

  return (
    <div className="bg-slate-900/50 border border-slate-800 backdrop-blur-md rounded-2xl overflow-hidden flex flex-col h-full min-h-[420px] shadow-xl">
      {/* Header Tabs */}
      <div className="flex bg-slate-950/60 border-b border-slate-800/80 p-2 gap-1">
        <button
          id="tab-songs"
          onClick={() => {
            setActiveTab('songs');
            onStopRecordingPlayback();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
            activeTab === 'songs'
              ? 'bg-slate-900 text-slate-100 border border-slate-800 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Music className="w-4 h-4" />
          <span>Interactive Songs</span>
        </button>
        <button
          id="tab-recordings"
          onClick={() => {
            setActiveTab('recordings');
            if (isPlayingSong) onStopSongAutoplay();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
            activeTab === 'recordings'
              ? 'bg-slate-900 text-slate-100 border border-slate-800 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Disc className="w-4 h-4" />
          <span>My Recordings ({recordings.length})</span>
        </button>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        {activeTab === 'songs' ? (
          /* ================= INTERACTIVE SONGS TAB ================= */
          <div className="flex-1 flex flex-col gap-4">
            
            {/* Guide Mode State Panel */}
            {selectedSong ? (
              <div className="bg-slate-950/40 rounded-xl border border-slate-800/80 p-3.5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedSong.emoji}</span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-200 leading-tight">
                        {selectedSong.title}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {selectedSong.composer || 'Traditional'} &bull; {selectedSong.difficulty}
                      </p>
                    </div>
                  </div>
                  <button
                    id="btn-close-song"
                    onClick={() => onSelectSong(null)}
                    className="text-[10px] font-bold text-slate-300 hover:text-white border border-slate-800 hover:bg-slate-800 bg-slate-900 px-2 py-1 rounded-lg cursor-pointer transition-colors"
                  >
                    Exit Song
                  </button>
                </div>

                {/* Progress bar */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 font-bold">
                    <span>PROGRESS</span>
                    <span>
                      {currentSongNoteIndex} / {selectedSong.notes.length} NOTES
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800/40">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-150 shadow-md shadow-indigo-500/20"
                      style={{
                        width: `${(currentSongNoteIndex / selectedSong.notes.length) * 100}%`
                      }}
                    />
                  </div>
                </div>

                {/* Guide mode interactive prompts */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                  <button
                    id="btn-toggle-guide"
                    onClick={() => onToggleGuideMode(!guideModeActive)}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition-all duration-150 cursor-pointer ${
                      guideModeActive
                        ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-600/20'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    💡 {guideModeActive ? 'Guide Mode Active' : 'Enable Guide Mode'}
                  </button>

                  <button
                    id="btn-autoplay"
                    onClick={isPlayingSong ? onStopSongAutoplay : onStartSongAutoplay}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer ${
                      isPlayingSong
                        ? 'bg-rose-600 border-rose-700 text-white shadow-lg shadow-rose-600/20'
                        : 'bg-slate-950 border-slate-800 hover:bg-slate-900 text-white'
                    }`}
                  >
                    {isPlayingSong ? (
                      <>
                        <Square className="w-3 h-3 fill-current" />
                        <span>Stop Autoplay</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>Autoplay Demo</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Next Note Prompts (Guide Mode Active) */}
                {guideModeActive && nextGuideNote && (
                  <div className="bg-indigo-950/30 border border-indigo-900/30 rounded-xl p-2.5 flex items-center justify-between text-indigo-300">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-indigo-400" />
                      Play next: <span className="font-mono font-bold bg-indigo-900/40 px-1.5 py-0.5 rounded text-indigo-200 text-xs border border-indigo-800">{nextGuideNote.note}</span>
                    </span>
                    <span className="text-xs font-extrabold font-mono bg-indigo-600 text-white rounded px-2 py-0.5 flex items-center gap-1">
                      KEY: {nextGuideNote.note ? (
                        // Map the note back to keyboard key character
                        SONGS_LIBRARY.find(() => true)?.notes ? (
                          // Helper
                          nextGuideNote.note === 'C4' ? 'A' :
                          nextGuideNote.note === 'C#4' ? 'W' :
                          nextGuideNote.note === 'D4' ? 'S' :
                          nextGuideNote.note === 'D#4' ? 'E' :
                          nextGuideNote.note === 'E4' ? 'D' :
                          nextGuideNote.note === 'F4' ? 'F' :
                          nextGuideNote.note === 'F#4' ? 'T' :
                          nextGuideNote.note === 'G4' ? 'G' :
                          nextGuideNote.note === 'G#4' ? 'Y' :
                          nextGuideNote.note === 'A4' ? 'H' :
                          nextGuideNote.note === 'A#4' ? 'U' :
                          nextGuideNote.note === 'B4' ? 'J' :
                          nextGuideNote.note === 'C5' ? 'K' :
                          nextGuideNote.note === 'C#5' ? 'O' :
                          nextGuideNote.note === 'D5' ? 'L' :
                          nextGuideNote.note === 'D#5' ? 'P' :
                          nextGuideNote.note === 'E5' ? ';' : '\''
                        ) : ''
                      ) : ''}
                    </span>
                  </div>
                )}
                {guideModeActive && !nextGuideNote && (
                  <div className="bg-emerald-950/30 border border-emerald-900/30 rounded-xl p-2.5 text-center text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400 animate-bounce" />
                    Congratulations! Song completed perfectly!
                  </div>
                )}
              </div>
            ) : (
              /* No song selected overview */
              <div className="bg-slate-950/30 border border-dashed border-slate-800 rounded-xl p-4 text-center">
                <Compass className="w-7 h-7 mx-auto text-slate-500 mb-1.5" />
                <h3 className="text-xs font-bold text-slate-300">Choose a song below</h3>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto mt-0.5 leading-relaxed">
                  Interactive sheets allow you to practice, learn key positions, or listen to autoplay demonstrations!
                </p>
              </div>
            )}

            {/* Song Selection List */}
            <div className="flex-1 overflow-y-auto max-h-[190px] pr-1 flex flex-col gap-2">
              {SONGS_LIBRARY.map((song) => {
                const isSelected = selectedSong?.id === song.id;
                return (
                  <div
                    key={song.id}
                    id={`song-card-${song.id}`}
                    onClick={() => {
                      onSelectSong(song);
                      onStopRecordingPlayback();
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-slate-950 text-slate-100 border-indigo-500/50 ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-500/5'
                        : 'bg-slate-950/40 hover:bg-slate-900 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{song.emoji}</span>
                        <div>
                          <h4 className="text-xs font-bold leading-tight">{song.title}</h4>
                          <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.25 rounded mt-0.5 inline-block ${
                            song.difficulty === 'Easy'
                              ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30'
                              : 'bg-amber-950/50 text-amber-400 border border-amber-900/30'
                          }`}>
                            {song.difficulty}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {song.notes.length} notes
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Record Trigger Strip */}
            <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider">
                  {isRecording ? 'Recording Live...' : 'Ready to Record'}
                </span>
              </div>
              
              {isNamingRecording ? (
                <form onSubmit={handleSaveRecording} className="flex gap-1.5 items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  <input
                    type="text"
                    required
                    placeholder="Enter track name..."
                    value={newRecordingTitle}
                    onChange={(e) => setNewRecordingTitle(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs font-bold text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-32"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelNaming}
                    className="text-slate-400 hover:text-white text-[11px] font-bold px-1 py-1 cursor-pointer transition-colors"
                  >
                    Skip
                  </button>
                </form>
              ) : (
                <button
                  id="btn-record-action"
                  onClick={startStopRecordingFlow}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-150 cursor-pointer ${
                    isRecording
                      ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-700 shadow-lg shadow-rose-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-700 shadow-lg shadow-indigo-600/20'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="w-3 h-3 fill-current" />
                      <span>Stop Rec</span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-3 h-3 fill-rose-500 text-rose-500 animate-pulse" />
                      <span>Record Song</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        ) : (
          /* ================= MY RECORDINGS TAB ================= */
          <div className="flex-1 flex flex-col gap-3">
            <p className="text-xs text-slate-400 leading-normal max-w-sm">
              Your custom recordings are stored securely in your browser's local cache. Try making some!
            </p>

            {recordings.length === 0 ? (
              <div className="flex-1 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center p-8 text-center bg-slate-950/30">
                <Disc className="w-8 h-8 text-slate-600 mb-2" />
                <h4 className="text-xs font-bold text-slate-400">No recordings found</h4>
                <p className="text-[10px] text-slate-500 max-w-xs mt-0.5">
                  Play the piano and click the 'Record' button at the bottom of the songs tab to save your own music!
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[290px] pr-1 flex flex-col gap-2">
                {recordings.map((recording) => {
                  const isPlayingThis = playingRecordingId === recording.id;
                  const dateString = new Date(recording.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={recording.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                        isPlayingThis
                          ? 'bg-slate-950 border-indigo-500/50 text-white'
                          : 'bg-slate-950/40 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Disc className={`w-4 h-4 ${isPlayingThis ? 'animate-spin text-indigo-400' : 'text-slate-500'}`} />
                        <div>
                          <h4 className="text-xs font-bold leading-tight">{recording.title}</h4>
                          <p className="text-[9px] font-medium text-slate-400 mt-0.5">
                            {dateString} &bull; {recording.notes.length} Notes played
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          id={`btn-play-rec-${recording.id}`}
                          onClick={() => isPlayingThis ? onStopRecordingPlayback() : onPlayRecording(recording)}
                          className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                            isPlayingThis
                              ? 'bg-rose-600 border-rose-700 text-white hover:bg-rose-500'
                              : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          {isPlayingThis ? (
                            <Square className="w-3.5 h-3.5 fill-current text-white" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                        </button>
                        <button
                          id={`btn-delete-rec-${recording.id}`}
                          onClick={() => onDeleteRecording(recording.id)}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
