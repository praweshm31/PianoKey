import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, Play, Square, Upload, Sparkles, Download, 
  Volume2, Check, Copy, Trash2, Disc, RefreshCw, AlertCircle, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// WAV helper functions
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0;
  let inputIndex = 0;
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // raw PCM
  const bitDepth = 16;
  
  let result;
  if (numOfChan === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }
  
  const bufferLength = result.length * 2;
  const arrayBuffer = new ArrayBuffer(44 + bufferLength);
  const view = new DataView(arrayBuffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + bufferLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, bufferLength, true);
  
  floatTo16BitPCM(view, 44, result);
  
  return new Blob([view], { type: 'audio/wav' });
}

export default function SongCreator() {
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  // Tracks State
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [instrumentalBuffer, setInstrumentalBuffer] = useState<AudioBuffer | null>(null);
  
  // Vocals State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [vocalBlob, setVocalBlob] = useState<Blob | null>(null);
  const [vocalBuffer, setVocalBuffer] = useState<AudioBuffer | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Synchronized playback setting
  const [playWhileRecording, setPlayWhileRecording] = useState(true);
  const [isPlayingInstrumental, setIsPlayingInstrumental] = useState(false);

  // Volume Control state
  const [instrumentalVolume, setInstrumentalVolume] = useState(0.8);
  const [vocalVolume, setVocalVolume] = useState(0.9);

  // Playback/Previewing
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [mixingProgress, setMixingProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mixedBlob, setMixedBlob] = useState<Blob | null>(null);
  const [mixedUrl, setMixedUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const activeGainNodesRef = useRef<GainNode[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // Simultaneous playback & recording refs
  const recordingInstrumentalSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const instrumentalPlayerSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Create AudioContext on-demand securely
  const getAudioContext = () => {
    if (audioCtx) return audioCtx;
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    setAudioCtx(context);
    return context;
  };

  // Handle uploading of files
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const ctx = getAudioContext();
    stopInstrumentalOnly();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
      setInstrumentalBuffer(decodedBuffer);
    } catch (err) {
      console.error('Error decoding audio file:', err);
      alert('Could not parse audio file. Please upload a standard MP3, WAV, or AAC file.');
    }
  };

  // Play/Stop Instrumental individually
  const playInstrumentalOnly = () => {
    if (isPlayingInstrumental) {
      stopInstrumentalOnly();
      return;
    }

    if (!instrumentalBuffer) {
      alert('Please upload an instrumental file first.');
      return;
    }

    const ctx = getAudioContext();
    stopPreview(); // stop global previews
    stopInstrumentalOnly(); // clear any previous individual plays

    const source = ctx.createBufferSource();
    source.buffer = instrumentalBuffer;
    source.loop = false; // Disables looping backing instrument entirely as requested

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(instrumentalVolume, ctx.currentTime);

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(ctx.currentTime + 0.05);
    instrumentalPlayerSourceRef.current = source;
    setIsPlayingInstrumental(true);

    source.onended = () => {
      setIsPlayingInstrumental(false);
    };
  };

  const stopInstrumentalOnly = () => {
    if (instrumentalPlayerSourceRef.current) {
      try {
        instrumentalPlayerSourceRef.current.stop();
      } catch (e) {}
      instrumentalPlayerSourceRef.current = null;
    }
    setIsPlayingInstrumental(false);
  };

  // Recording Voice (Simultaneously playing instrumental for alignment)
  const startRecording = async () => {
    const ctx = getAudioContext();
    
    // Safety check: stop other playbacks
    stopPreview();
    stopInstrumentalOnly();

    setVocalBlob(null);
    setVocalBuffer(null);
    setMixedBlob(null);
    if (mixedUrl) URL.revokeObjectURL(mixedUrl);
    setMixedUrl('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);

      // Create microlevel visualiser
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setAudioLevel(avg / 128); // normalize roughly
        rafRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      const options = { mimeType: 'audio/webm;codecs=opus' };
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback for browsers with limited mimeType support (e.g. Safari)
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const voiceBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        setVocalBlob(voiceBlob);

        try {
          const arrayBuf = await voiceBlob.arrayBuffer();
          // Decodes the recorded vocal to an AudioBuffer for mixing
          const decodedVocal = await ctx.decodeAudioData(arrayBuf);
          setVocalBuffer(decodedVocal);
        } catch (e) {
          console.error('Error decoding recorded voice:', e);
        }
      };

      // Simultaneously play instrumental loop/file if enabled and available
      if (playWhileRecording && instrumentalBuffer) {
        const playbackSource = ctx.createBufferSource();
        playbackSource.buffer = instrumentalBuffer;
        playbackSource.loop = false; // Disables looping backing instrument entirely as requested

        const playbackGain = ctx.createGain();
        playbackGain.gain.setValueAtTime(instrumentalVolume, ctx.currentTime);

        playbackSource.connect(playbackGain);
        playbackGain.connect(ctx.destination);

        // Synchronize startup instantly
        playbackSource.start(ctx.currentTime + 0.05);
        recordingInstrumentalSourceRef.current = playbackSource;
      }

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access is required to record vocals. Please grant permissions.');
    }
  };

  const stopRecording = () => {
    // Stop recording
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      setMicStream(null);
    }
    
    // Stop instrumental playing simultaneously
    if (recordingInstrumentalSourceRef.current) {
      try {
        recordingInstrumentalSourceRef.current.stop();
      } catch (e) {}
      recordingInstrumentalSourceRef.current = null;
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsRecording(false);
    setAudioLevel(0);
  };

  // Preview Synchronized Tracks
  const playPreview = () => {
    if (isPlayingPreview) {
      stopPreview();
      return;
    }

    const ctx = getAudioContext();
    stopPreview(); // clear existing
    stopInstrumentalOnly(); // safety close other audio players

    const sources: AudioBufferSourceNode[] = [];
    const gains: GainNode[] = [];

    // Setup instrumental source if exists
    if (instrumentalBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = instrumentalBuffer;
      source.loop = false; // Disables looping backing instrument entirely as requested

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(instrumentalVolume, ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);

      sources.push(source);
      gains.push(gain);
    }

    // Setup vocal source if exists
    if (vocalBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = vocalBuffer;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vocalVolume, ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);

      sources.push(source);
      gains.push(gain);
    }

    if (sources.length === 0) return;

    // Play all sources in absolute sync at the same timestamp
    const startTime = ctx.currentTime + 0.1;
    sources.forEach((source) => source.start(startTime));

    activeSourcesRef.current = sources;
    activeGainNodesRef.current = gains;
    setIsPlayingPreview(true);

    // If both tracks finish (or longest one does)
    const maxDuration = Math.max(
      instrumentalBuffer ? instrumentalBuffer.duration : 0,
      vocalBuffer ? vocalBuffer.duration : 0
    );

    setTimeout(() => {
      setIsPlayingPreview((playing) => {
        if (playing) {
          stopPreview();
        }
        return false;
      });
    }, maxDuration * 1000 + 200);
  };

  const stopPreview = () => {
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch (e) {}
    });
    activeSourcesRef.current = [];
    activeGainNodesRef.current = [];
    setIsPlayingPreview(false);
  };

  // Mix and Generate Mixed Song
  const generateSong = async () => {
    if (!instrumentalBuffer && !vocalBuffer) return;

    setIsGenerating(true);
    setMixingProgress(10);

    const ctx = getAudioContext();
    const sampleRate = ctx.sampleRate;
    
    // Find absolute longest duration
    const duration = Math.max(
      instrumentalBuffer ? instrumentalBuffer.duration : 0,
      vocalBuffer ? vocalBuffer.duration : 0
    );

    setMixingProgress(30);

    // Create offline context for rendering
    const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

    // 1. Add instrumental to mix
    if (instrumentalBuffer) {
      const sourceNode = offlineCtx.createBufferSource();
      sourceNode.buffer = instrumentalBuffer;
      
      const gainNode = offlineCtx.createGain();
      gainNode.gain.setValueAtTime(instrumentalVolume, 0);

      sourceNode.connect(gainNode);
      gainNode.connect(offlineCtx.destination);
      sourceNode.start(0);
    }

    setMixingProgress(50);

    // 2. Add vocal to mix
    if (vocalBuffer) {
      const sourceNode = offlineCtx.createBufferSource();
      sourceNode.buffer = vocalBuffer;

      const gainNode = offlineCtx.createGain();
      gainNode.gain.setValueAtTime(vocalVolume, 0);

      sourceNode.connect(gainNode);
      gainNode.connect(offlineCtx.destination);
      sourceNode.start(0);
    }

    setMixingProgress(70);

    try {
      const renderedBuffer = await offlineCtx.startRendering();
      setMixingProgress(90);

      // Convert buffer to standard WAV file
      const wavBlob = bufferToWav(renderedBuffer);
      setMixedBlob(wavBlob);
      
      const url = URL.createObjectURL(wavBlob);
      setMixedUrl(url);
      setMixingProgress(100);
    } catch (e) {
      console.error('Error rendering mixed audio offline:', e);
      alert('Song compilation failed. Please try again.');
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
      }, 500);
    }
  };

  // Helper formatting duration
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Copy shareable link
  const copyShareLink = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Dynamic visual sound bars for recording
  const renderSoundWave = () => {
    if (!isRecording) return null;
    return (
      <div className="flex gap-1 items-end h-10 w-full justify-center px-4">
        {[...Array(12)].map((_, idx) => {
          // generate random waves scaled by active audio level
          const multiplier = Math.max(0.1, audioLevel * (0.4 + Math.sin(idx * 0.5) * 0.6));
          const height = Math.min(40, multiplier * 40);
          return (
            <div 
              key={idx} 
              style={{ height: `${height}px` }} 
              className="w-1 rounded-full bg-red-500 transition-all duration-75"
            />
          );
        })}
      </div>
    );
  };

  return (
    <div id="studio-song-creator" className="bg-slate-900/50 border border-slate-800 backdrop-blur-md p-6 rounded-2xl shadow-xl mt-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <Mic className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
              Studio Vocal Recorder & Song Mixer
              <span className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[9px] uppercase px-2 py-0.5 rounded-full font-mono tracking-wider font-bold">
                PRO FEATURES
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Record vocals over high-fidelity piano or bansuri flute instrumental styles, mix track volumes, and export finished songs.
            </p>
            <div className="mt-2.5 space-y-2 max-w-xl">
              <p className="text-[11px] text-slate-500 bg-slate-950/20 border border-slate-800/40 rounded-lg p-2.5 leading-relaxed">
                <span className="font-semibold text-slate-400 block mb-1">Recommended Piano Style Prompt:</span>
                A single, isolated studio recording of an acoustic grand piano playing one clear note: [Insert Note here, e.g., Middle C / C4]. Clean sample, high fidelity, 440Hz tuning. Natural, warm tone with a soft attack, a rich sustain, and a smooth, realistic decay. Zero background noise, zero echo, no melody, no chords, no underlying beat. Just one pure, single piano key strike
              </p>
              <p className="text-[11px] text-slate-500 bg-slate-950/20 border border-slate-800/40 rounded-lg p-2.5 leading-relaxed">
                <span className="font-semibold text-slate-400 block mb-1">Recommended Bansuri Flute Style Prompt:</span>
                A raw studio audio sample pack of a premium Hindustani classical Bansuri flute. The instrument plays a sequence of single, separated notes in a scale [e.g., C4, D4, E4, F4]. Each note must be held steadily for 3 seconds, followed by 2 seconds of absolute silence before the next note begins. Crisp audio, dry acoustic sound with no echo, no delay, and no background instruments. Clean stem file for sampling.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* LEFT COLUMN: THE INPUT TRACKS (INSTRUMENTAL & VOCAL) */}
        <div className="space-y-6">
          
          {/* TRACK 1: INSTRUMENTAL BACKDROP */}
          <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> TRACK 1: INSTRUMENTAL
              </span>
            </div>

            <div className="space-y-3">
              <div className="border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/40 p-4 rounded-lg text-center relative cursor-pointer group transition-colors">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-5 h-5 text-slate-500 mx-auto mb-2 group-hover:text-indigo-400 transition-colors" />
                <span className="text-xs font-semibold text-slate-300 block">
                  {uploadedFileName ? 'Change Audio File' : 'Drag & Drop or Click to Upload'}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">MP3, WAV, M4A or OGG</span>
              </div>

              {uploadedFileName && (
                <div className="flex items-center justify-between bg-indigo-950/20 border border-indigo-900/30 rounded-lg p-2.5 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Disc className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-slate-300 font-medium truncate">{uploadedFileName}</span>
                  </div>
                  <button
                    onClick={() => {
                      setUploadedFileName('');
                      setInstrumentalBuffer(null);
                    }}
                    className="text-slate-500 hover:text-red-400 cursor-pointer"
                    title="Clear File"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {instrumentalBuffer && (
              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Disc className={`w-3.5 h-3.5 text-indigo-400 ${isPlayingInstrumental ? 'animate-spin' : ''}`} />
                  Uploaded track ready
                </span>
                <button
                  onClick={playInstrumentalOnly}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isPlayingInstrumental
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                      : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 shadow-md'
                  }`}
                >
                  {isPlayingInstrumental ? (
                    <>
                      <Square className="w-3 h-3 fill-current" /> Stop Track
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" /> Play Track
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* TRACK 2: MICROPHONE VOCAL RECORDING */}
          <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" /> TRACK 2: VOCALS
              </span>
              {vocalBlob && (
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                  Recorded
                </span>
              )}
            </div>

            {/* Sync Playback setting */}
            <div className="bg-slate-900/30 border border-slate-800/60 p-3 rounded-lg space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={playWhileRecording}
                  onChange={(e) => setPlayWhileRecording(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-800 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-slate-100 transition-colors block">
                    Play instrumental while recording
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Plays back the uploaded backing track in sync with your live voice.
                  </span>
                </div>
              </label>

              {playWhileRecording && (
                <div className="flex items-start gap-1.5 text-[10px] bg-indigo-500/5 text-indigo-300 border border-indigo-500/10 p-2.5 rounded-lg leading-relaxed">
                  <Info className="w-3.5 h-3.5 shrink-0 text-indigo-400 mt-0.5" />
                  <span>
                    <strong>Pro-Tip:</strong> Use headphones so your mic captures <em>only</em> your voice and avoids sound bleed.
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center justify-center border border-slate-800/80 bg-slate-900/40 py-5 px-4 rounded-lg space-y-4 relative overflow-hidden">
              
              {/* Mic Wave Animation or Static Info */}
              <div className="h-10 flex items-center justify-center w-full">
                {isRecording ? (
                  renderSoundWave()
                ) : vocalBlob ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium bg-emerald-500/5 px-3 py-1.5 rounded-full border border-emerald-500/15">
                    <Check className="w-4 h-4" /> Vocal recording ready for mixing
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">No vocal track recorded yet.</span>
                )}
              </div>

              {/* Action Recording Button */}
              <div className="flex items-center gap-3 relative z-10">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-red-900/30 cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5"
                  >
                    <Mic className="w-4 h-4 animate-pulse" /> Start Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs rounded-xl shadow-lg cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5"
                  >
                    <Square className="w-4 h-4 text-red-600 fill-red-600 animate-pulse" /> Stop ({formatTime(recordingDuration)})
                  </button>
                )}

                {vocalBlob && !isRecording && (
                  <button
                    onClick={() => {
                      setVocalBlob(null);
                      setVocalBuffer(null);
                      setMixedBlob(null);
                      if (mixedUrl) URL.revokeObjectURL(mixedUrl);
                      setMixedUrl('');
                    }}
                    className="p-2.5 bg-slate-800 border border-slate-700 hover:bg-red-950 hover:border-red-900/50 text-slate-400 hover:text-red-400 rounded-xl cursor-pointer transition-colors"
                    title="Delete Recording"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW MIXER & SONG EXPORT */}
        <div className="space-y-6">
          
          {/* THE MIXER & BUILD PANEL */}
          <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-xl space-y-5">
            <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" /> SONG MIXER & PREVIEW
            </span>

            {/* Mixer Volume Controls */}
            <div className="space-y-4 border-b border-slate-800/50 pb-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Instrumental Vol</span>
                  <span className="text-slate-200 font-mono font-bold">{Math.round(instrumentalVolume * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="range"
                    min="0"
                    max="1.2"
                    step="0.05"
                    value={instrumentalVolume}
                    onChange={(e) => {
                      setInstrumentalVolume(parseFloat(e.target.value));
                      if (activeGainNodesRef.current[0]) {
                        activeGainNodesRef.current[0].gain.setValueAtTime(parseFloat(e.target.value), audioCtx?.currentTime || 0);
                      }
                    }}
                    className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Vocal Volume</span>
                  <span className="text-slate-200 font-mono font-bold">{Math.round(vocalVolume * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={vocalVolume}
                    onChange={(e) => {
                      setVocalVolume(parseFloat(e.target.value));
                      if (activeGainNodesRef.current[1]) {
                        activeGainNodesRef.current[1].gain.setValueAtTime(parseFloat(e.target.value), audioCtx?.currentTime || 0);
                      }
                    }}
                    className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    disabled={!vocalBuffer}
                  />
                </div>
              </div>
            </div>

            {/* Action buttons: Play/Stop Preview & Generate Song */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={playPreview}
                  disabled={!instrumentalBuffer && !vocalBuffer}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    isPlayingPreview
                      ? 'bg-slate-100 hover:bg-white text-slate-950'
                      : 'bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  {isPlayingPreview ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" /> Stop Preview
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" /> Sync Preview
                    </>
                  )}
                </button>

                <button
                  onClick={generateSong}
                  disabled={isGenerating || (!vocalBuffer && !instrumentalBuffer)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-900/20 disabled:shadow-none cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 disabled:transform-none"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Mixing ({mixingProgress}%)
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" /> Mix & Create Song
                    </>
                  )}
                </button>
              </div>

              {!vocalBuffer && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-900/40 p-2 rounded-lg">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>Tip: Record vocals above on Track 2 to make a complete vocals + beat mix!</span>
                </div>
              )}
            </div>
          </div>

          {/* THE GENERATED EXPORT SECTION (DOWNLOAD & SHARE) */}
          <AnimatePresence mode="wait">
            {mixedBlob && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-gradient-to-br from-indigo-950/20 to-slate-900 border border-indigo-500/25 p-5 rounded-xl space-y-4"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100 font-display">Song Compiled Successfully!</h3>
                    <p className="text-[10px] text-slate-400">Your high-fidelity master track is ready for download and sharing.</p>
                  </div>
                </div>

                {/* Built-in Player for Mixed Song */}
                {mixedUrl && (
                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <audio src={mixedUrl} controls className="w-full h-8 opacity-80" />
                  </div>
                )}

                {/* Download and Share Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <a
                    href={mixedUrl}
                    download={`synth_studio_song_${Date.now().toString().slice(-4)}.wav`}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-emerald-950/30 transition-all duration-150 transform hover:-translate-y-0.5 text-center"
                  >
                    <Download className="w-4 h-4" /> Download WAV File
                  </a>

                  <button
                    onClick={copyShareLink}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" /> Link Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy Share Link
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

    </div>
  );
}
