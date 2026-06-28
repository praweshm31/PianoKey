import { PianoStyle } from '../types';

interface ActiveVoice {
  note: string;
  oscillators: OscillatorNode[];
  gainNode: GainNode;
  filterNode?: BiquadFilterNode;
  lfo?: OscillatorNode;
  scheduledStopTime?: number;
  release: (sustainActive: boolean) => void;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private activeVoices: Map<string, ActiveVoice> = new Map();
  private sustainedNotes: Set<string> = new Set();
  private isSustainOn = false;
  private volumeValue = 0.7; // default volume

  constructor() {
    // Lazy-initialize audio context on user interaction
  }

  public init() {
    if (this.ctx) return;

    // Support standard and older browsers
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volumeValue, this.ctx.currentTime);

      // Create ambient delay node (reverberation/space) for Synthwave & Electric styles
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayFeedback = this.ctx.createGain();

      this.delayNode.delayTime.setValueAtTime(0.35, this.ctx.currentTime); // 350ms delay
      this.delayFeedback.gain.setValueAtTime(0.3, this.ctx.currentTime); // 30% feedback

      // Connect delay loop
      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);

      // Connect everything to destination
      this.masterGain.connect(this.ctx.destination);
      this.delayNode.connect(this.masterGain);
    } catch (e) {
      console.error('Failed to initialize AudioContext:', e);
    }
  }

  public setVolume(volume: number) {
    this.volumeValue = Math.max(0, Math.min(1, volume));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.linearRampToValueAtTime(this.volumeValue, this.ctx.currentTime + 0.05);
    }
  }

  public toggleSustain(isOn: boolean) {
    this.isSustainOn = isOn;
    if (!isOn) {
      // Release all sustained notes that are no longer physically held
      this.sustainedNotes.forEach(note => {
        const voice = this.activeVoices.get(note);
        if (voice) {
          voice.release(false);
          this.activeVoices.delete(note);
        }
      });
      this.sustainedNotes.clear();
    }
  }

  public playNote(note: string, frequency: number, style: PianoStyle) {
    this.init();
    if (!this.ctx || !this.masterGain || this.ctx.state === 'suspended') {
      // Try resuming if suspended (browser security)
      this.ctx?.resume();
    }

    const ctx = this.ctx!;
    const now = ctx.currentTime;

    // If note is already playing, stop it immediately to prevent overlap clicks
    if (this.activeVoices.has(note)) {
      this.stopNote(note, true);
    }

    // Create a local voice gain node
    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(0, now);

    const oscillators: OscillatorNode[] = [];
    let filterNode: BiquadFilterNode | undefined;
    let lfo: OscillatorNode | undefined;

    // Clean reference to actual release function
    let releaseFn: (sustainActive: boolean) => void = () => {};

    if (style === 'grand') {
      // --- ACOUSTIC GRAND ---
      // Re-create the complex acoustic sound using additive synthesis
      // 1. Fundamental frequency
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(frequency, now);

      // 2. First Harmonic (octave up, slightly quieter)
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(frequency * 2, now);
      const harmonicGain1 = ctx.createGain();
      harmonicGain1.gain.setValueAtTime(0.3, now);

      // 3. Second Harmonic (octave + fifth)
      const osc3 = ctx.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(frequency * 3, now);
      const harmonicGain2 = ctx.createGain();
      harmonicGain2.gain.setValueAtTime(0.12, now);

      // 4. Noise click for hammer strike simulator
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      // Connect nodes
      osc1.connect(voiceGain);
      osc2.connect(harmonicGain1).connect(voiceGain);
      osc3.connect(harmonicGain2).connect(voiceGain);
      noiseNode.connect(noiseGain).connect(voiceGain);

      // Routing to master
      voiceGain.connect(this.masterGain);

      // Grand envelope: quick attack, fast decay, medium sustain
      voiceGain.gain.linearRampToValueAtTime(0.85, now + 0.005);
      voiceGain.gain.exponentialRampToValueAtTime(0.4, now + 0.25);
      voiceGain.gain.linearRampToValueAtTime(0.18, now + 2.5); // long slow decay

      // Start oscillators
      osc1.start(now);
      osc2.start(now);
      osc3.start(now);
      noiseNode.start(now);

      oscillators.push(osc1, osc2, osc3);

      releaseFn = (sustainActive: boolean) => {
        const relTime = ctx.currentTime;
        if (sustainActive) return;

        voiceGain.gain.cancelScheduledValues(relTime);
        voiceGain.gain.setValueAtTime(voiceGain.gain.value, relTime);
        // Exponential fade out for grand piano
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, relTime + 1.2);

        setTimeout(() => {
          try {
            osc1.stop();
            osc2.stop();
            osc3.stop();
          } catch (e) {}
        }, 1300);
      };

    } else if (style === 'electric') {
      // --- ELECTRIC DREAM (Rhodes-like) ---
      // Sine wave with rich fundamental, detuned second wave, and tremolo LFO
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(frequency, now);

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(frequency * 0.998, now); // slightly detuned for chorus

      // LFO Tremolo effect at 6.5 Hz
      lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(6.5, now);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.18, now);

      lfo.connect(lfoGain);
      lfoGain.connect(voiceGain.gain); // Modulates volume!

      osc1.connect(voiceGain);
      osc2.connect(voiceGain);

      voiceGain.connect(this.masterGain);
      // Connect slightly to delay for atmosphere
      if (this.delayNode) {
        const sendGain = ctx.createGain();
        sendGain.gain.setValueAtTime(0.2, now);
        voiceGain.connect(sendGain).connect(this.delayNode);
      }

      voiceGain.gain.linearRampToValueAtTime(0.7, now + 0.01);
      voiceGain.gain.exponentialRampToValueAtTime(0.3, now + 0.4);

      osc1.start(now);
      osc2.start(now);
      lfo.start(now);

      oscillators.push(osc1, osc2);

      releaseFn = (sustainActive: boolean) => {
        const relTime = ctx.currentTime;
        if (sustainActive) return;

        voiceGain.gain.cancelScheduledValues(relTime);
        voiceGain.gain.setValueAtTime(voiceGain.gain.value, relTime);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, relTime + 0.9);

        setTimeout(() => {
          try {
            osc1.stop();
            osc2.stop();
            lfo?.stop();
          } catch (e) {}
        }, 1000);
      };

    } else if (style === 'synthwave') {
      // --- SYNTHWAVE 1984 ---
      // Fat supersaw sound with biquad lowpass filter envelope sweep
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(frequency - 2, now); // Detuned down

      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(frequency + 2, now); // Detuned up

      filterNode = ctx.createBiquadFilter();
      filterNode.type = 'lowpass';
      // Lowpass sweeps from 2500Hz down to 400Hz
      filterNode.Q.setValueAtTime(3.5, now);
      filterNode.frequency.setValueAtTime(2500, now);
      filterNode.frequency.exponentialRampToValueAtTime(500, now + 0.45);

      osc1.connect(filterNode);
      osc2.connect(filterNode);
      filterNode.connect(voiceGain);

      voiceGain.connect(this.masterGain);
      // Synthwave uses heavier delay send
      if (this.delayNode) {
        const sendGain = ctx.createGain();
        sendGain.gain.setValueAtTime(0.35, now);
        voiceGain.connect(sendGain).connect(this.delayNode);
      }

      voiceGain.gain.linearRampToValueAtTime(0.45, now + 0.03); // softer attack
      voiceGain.gain.linearRampToValueAtTime(0.35, now + 0.3);

      osc1.start(now);
      osc2.start(now);

      oscillators.push(osc1, osc2);

      releaseFn = (sustainActive: boolean) => {
        const relTime = ctx.currentTime;
        if (sustainActive) return;

        voiceGain.gain.cancelScheduledValues(relTime);
        voiceGain.gain.setValueAtTime(voiceGain.gain.value, relTime);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, relTime + 0.7);

        // Also close filter on release
        filterNode?.frequency.cancelScheduledValues(relTime);
        filterNode?.frequency.exponentialRampToValueAtTime(100, relTime + 0.6);

        setTimeout(() => {
          try {
            osc1.stop();
            osc2.stop();
          } catch (e) {}
        }, 800);
      };

    } else if (style === 'chiptune') {
      // --- 8-BIT RETRO CHIPTUNE ---
      // Nostalgic square wave synth with quick pitch slide
      const osc = ctx.createOscillator();
      osc.type = 'square';
      // Chiptune pitch slide (brief slide-in)
      osc.frequency.setValueAtTime(frequency * 0.95, now);
      osc.frequency.exponentialRampToValueAtTime(frequency, now + 0.04);

      osc.connect(voiceGain);
      voiceGain.connect(this.masterGain);

      // Simple clicky envelope
      voiceGain.gain.linearRampToValueAtTime(0.4, now + 0.002);
      voiceGain.gain.exponentialRampToValueAtTime(0.18, now + 0.15);

      osc.start(now);
      oscillators.push(osc);

      releaseFn = (sustainActive: boolean) => {
        const relTime = ctx.currentTime;
        if (sustainActive) return;

        voiceGain.gain.cancelScheduledValues(relTime);
        voiceGain.gain.setValueAtTime(voiceGain.gain.value, relTime);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, relTime + 0.15);

        setTimeout(() => {
          try {
            osc.stop();
          } catch (e) {}
        }, 200);
      };

    } else if (style === 'organ') {
      // --- MAJESTIC ORGAN ---
      // Combination of sines and triangles at f, 0.5f, 2f, 3f, 4f
      const subOsc = ctx.createOscillator();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(frequency * 0.5, now); // Sub-bass octave

      const mainOsc = ctx.createOscillator();
      mainOsc.type = 'sine';
      mainOsc.frequency.setValueAtTime(frequency, now);

      const highOsc1 = ctx.createOscillator();
      highOsc1.type = 'sine';
      highOsc1.frequency.setValueAtTime(frequency * 2, now); // Octave up

      const highOsc2 = ctx.createOscillator();
      highOsc2.type = 'triangle';
      highOsc2.frequency.setValueAtTime(frequency * 3, now); // Fifth above octave

      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.35, now);

      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(0.5, now);

      const highGain1 = ctx.createGain();
      highGain1.gain.setValueAtTime(0.25, now);

      const highGain2 = ctx.createGain();
      highGain2.gain.setValueAtTime(0.15, now);

      subOsc.connect(subGain).connect(voiceGain);
      mainOsc.connect(mainGain).connect(voiceGain);
      highOsc1.connect(highGain1).connect(voiceGain);
      highOsc2.connect(highGain2).connect(voiceGain);

      voiceGain.connect(this.masterGain);

      // Organ envelope has solid attack and holds full sustain
      voiceGain.gain.linearRampToValueAtTime(0.6, now + 0.04);

      subOsc.start(now);
      mainOsc.start(now);
      highOsc1.start(now);
      highOsc2.start(now);

      oscillators.push(subOsc, mainOsc, highOsc1, highOsc2);

      releaseFn = (sustainActive: boolean) => {
        const relTime = ctx.currentTime;
        if (sustainActive) return;

        voiceGain.gain.cancelScheduledValues(relTime);
        voiceGain.gain.setValueAtTime(voiceGain.gain.value, relTime);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, relTime + 0.22); // classic slow organ pipe depress

        setTimeout(() => {
          try {
            subOsc.stop();
            mainOsc.stop();
            highOsc1.stop();
            highOsc2.stop();
          } catch (e) {}
        }, 300);
      };
    } else if (style === 'flute') {
      // --- BANSURI FLUTE ---
      // Pure blowing wind style with pitch vibrato and realistic air breath-noise attack
      const mainOsc = ctx.createOscillator();
      mainOsc.type = 'sine';
      mainOsc.frequency.setValueAtTime(frequency, now);

      const breathOsc = ctx.createOscillator();
      breathOsc.type = 'triangle';
      breathOsc.frequency.setValueAtTime(frequency * 2, now); // soft octave harmonic

      const mainGainNode = ctx.createGain();
      mainGainNode.gain.setValueAtTime(0.7, now);

      const breathGainNode = ctx.createGain();
      breathGainNode.gain.setValueAtTime(0.18, now);

      // Vibrato (pitch modulation) at 5.5 Hz for rich wind expression
      lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(5.5, now);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(2.2, now); // vibrato depth in Hz

      lfo.connect(lfoGain);
      lfoGain.connect(mainOsc.frequency);
      lfoGain.connect(breathOsc.frequency);

      // Breath noise transient
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;

      // Filter noise to sound like wind blowing
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(frequency * 1.5, now);
      noiseFilter.Q.setValueAtTime(3.0, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      mainOsc.connect(mainGainNode).connect(voiceGain);
      breathOsc.connect(breathGainNode).connect(voiceGain);
      noiseNode.connect(noiseFilter).connect(noiseGain).connect(voiceGain);

      voiceGain.connect(this.masterGain);
      if (this.delayNode) {
        const sendGain = ctx.createGain();
        sendGain.gain.setValueAtTime(0.25, now);
        voiceGain.connect(sendGain).connect(this.delayNode);
      }

      // Human swell attack
      voiceGain.gain.linearRampToValueAtTime(0.65, now + 0.04);

      mainOsc.start(now);
      breathOsc.start(now);
      lfo.start(now);
      noiseNode.start(now);

      oscillators.push(mainOsc, breathOsc);

      releaseFn = (sustainActive: boolean) => {
        const relTime = ctx.currentTime;
        if (sustainActive) return;

        voiceGain.gain.cancelScheduledValues(relTime);
        voiceGain.gain.setValueAtTime(voiceGain.gain.value, relTime);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, relTime + 0.45);

        setTimeout(() => {
          try {
            mainOsc.stop();
            breathOsc.stop();
            lfo?.stop();
          } catch (e) {}
        }, 500);
      };

    } else if (style === 'tabla') {
      // --- INDIAN TABLA ---
      // Bass keys are the sliding "Bayan" drum, higher keys are metallic "Dayan" skin strokes
      const isBayan = frequency < 350;

      if (isBayan) {
        // Bayan: Deep sub-bass with pitch glide upwards (glissando)
        const bassOsc = ctx.createOscillator();
        bassOsc.type = 'sine';
        
        bassOsc.frequency.setValueAtTime(frequency * 0.75, now);
        bassOsc.frequency.exponentialRampToValueAtTime(frequency * 1.15, now + 0.12);
        bassOsc.frequency.exponentialRampToValueAtTime(frequency, now + 0.28);

        const modOsc = ctx.createOscillator();
        modOsc.type = 'triangle';
        modOsc.frequency.setValueAtTime(frequency * 2, now);
        const modGain = ctx.createGain();
        modGain.gain.setValueAtTime(0.12, now);

        bassOsc.connect(voiceGain);
        modOsc.connect(modGain).connect(voiceGain);

        voiceGain.connect(this.masterGain);

        // Punchy skin impact with rapid damping
        voiceGain.gain.linearRampToValueAtTime(0.9, now + 0.005);
        voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        bassOsc.start(now);
        modOsc.start(now);
        oscillators.push(bassOsc, modOsc);

        releaseFn = (sustainActive: boolean) => {
          const relTime = ctx.currentTime;
          if (sustainActive) return;
          voiceGain.gain.cancelScheduledValues(relTime);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, relTime);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, relTime + 0.1);
          setTimeout(() => {
            try {
              bassOsc.stop();
              modOsc.stop();
            } catch (e) {}
          }, 150);
        };
      } else {
        // Dayan: Tune skin ring stroke with high metallic ring overtones
        const mainOsc = ctx.createOscillator();
        mainOsc.type = 'sine';
        mainOsc.frequency.setValueAtTime(frequency, now);

        const overtone1 = ctx.createOscillator();
        overtone1.type = 'sine';
        overtone1.frequency.setValueAtTime(frequency * 2.27, now); // tuned Dayan overtone
        const overtoneGain1 = ctx.createGain();
        overtoneGain1.gain.setValueAtTime(0.35, now);

        const overtone2 = ctx.createOscillator();
        overtone2.type = 'sine';
        overtone2.frequency.setValueAtTime(frequency * 3.44, now);
        const overtoneGain2 = ctx.createGain();
        overtoneGain2.gain.setValueAtTime(0.15, now);

        // Dayan hammer/finger-strike transient
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.015, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
          noiseData[i] = Math.random() * 2 - 1;
        }
        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

        mainOsc.connect(voiceGain);
        overtone1.connect(overtoneGain1).connect(voiceGain);
        overtone2.connect(overtoneGain2).connect(voiceGain);
        noiseNode.connect(noiseGain).connect(voiceGain);

        voiceGain.connect(this.masterGain);

        voiceGain.gain.linearRampToValueAtTime(0.85, now + 0.004);
        voiceGain.gain.exponentialRampToValueAtTime(0.15, now + 0.15);
        voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        mainOsc.start(now);
        overtone1.start(now);
        overtone2.start(now);
        noiseNode.start(now);
        oscillators.push(mainOsc, overtone1, overtone2);

        releaseFn = (sustainActive: boolean) => {
          const relTime = ctx.currentTime;
          if (sustainActive) return;
          voiceGain.gain.cancelScheduledValues(relTime);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, relTime);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, relTime + 0.18);
          setTimeout(() => {
            try {
              mainOsc.stop();
              overtone1.stop();
              overtone2.stop();
            } catch (e) {}
          }, 200);
        };
      }

    } else if (style === 'guitar') {
      // --- ACOUSTIC STEEL-STRING GUITAR ---
      // Sharp pluck transient and exponential decay with damping filter sweep
      const stringOsc = ctx.createOscillator();
      stringOsc.type = 'triangle';
      stringOsc.frequency.setValueAtTime(frequency, now);

      const overtoneOsc = ctx.createOscillator();
      overtoneOsc.type = 'sine';
      overtoneOsc.frequency.setValueAtTime(frequency * 2.01, now); // second harmonic, slightly sharp

      const stringGainNode = ctx.createGain();
      stringGainNode.gain.setValueAtTime(0.65, now);

      const overtoneGainNode = ctx.createGain();
      overtoneGainNode.gain.setValueAtTime(0.18, now);

      // Filter sweep to dampen highs quickly
      filterNode = ctx.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.Q.setValueAtTime(1.5, now);
      filterNode.frequency.setValueAtTime(2200, now);
      filterNode.frequency.exponentialRampToValueAtTime(320, now + 0.35);

      stringOsc.connect(filterNode);
      overtoneOsc.connect(overtoneGainNode).connect(filterNode);
      filterNode.connect(voiceGain);

      voiceGain.connect(this.masterGain);

      voiceGain.gain.linearRampToValueAtTime(0.9, now + 0.003);
      voiceGain.gain.exponentialRampToValueAtTime(0.3, now + 0.25);
      voiceGain.gain.exponentialRampToValueAtTime(0.01, now + 1.8);

      stringOsc.start(now);
      overtoneOsc.start(now);
      oscillators.push(stringOsc, overtoneOsc);

      releaseFn = (sustainActive: boolean) => {
        const relTime = ctx.currentTime;
        if (sustainActive) return;

        voiceGain.gain.cancelScheduledValues(relTime);
        voiceGain.gain.setValueAtTime(voiceGain.gain.value, relTime);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, relTime + 0.15);

        setTimeout(() => {
          try {
            stringOsc.stop();
            overtoneOsc.stop();
          } catch (e) {}
        }, 200);
      };

    } else if (style === 'sitar') {
      // --- MYSTIC SITAR ---
      // Buzzing bridge resonance (sawtooth peaking) with a sympathetic drone string
      const primaryOsc = ctx.createOscillator();
      primaryOsc.type = 'sawtooth';
      primaryOsc.frequency.setValueAtTime(frequency, now);

      // Create Jawari bridge buzzing with peaking filter
      const buzzFilter = ctx.createBiquadFilter();
      buzzFilter.type = 'peaking';
      buzzFilter.Q.setValueAtTime(6.0, now);
      buzzFilter.frequency.setValueAtTime(frequency * 3.5, now);
      buzzFilter.gain.setValueAtTime(12, now);

      // Sympathetic drone string tuned to a perfect fifth
      const droneOsc = ctx.createOscillator();
      droneOsc.type = 'sine';
      droneOsc.frequency.setValueAtTime(frequency * 1.5, now);
      const droneGainNode = ctx.createGain();
      droneGainNode.gain.setValueAtTime(0.12, now);

      // Sitar pitch slide bend (Meend)
      primaryOsc.frequency.setValueAtTime(frequency * 0.94, now);
      primaryOsc.frequency.exponentialRampToValueAtTime(frequency, now + 0.09);

      primaryOsc.connect(buzzFilter).connect(voiceGain);
      droneOsc.connect(droneGainNode).connect(voiceGain);

      voiceGain.connect(this.masterGain);
      if (this.delayNode) {
        const sendGain = ctx.createGain();
        sendGain.gain.setValueAtTime(0.28, now);
        voiceGain.connect(sendGain).connect(this.delayNode);
      }

      voiceGain.gain.linearRampToValueAtTime(0.7, now + 0.005);
      voiceGain.gain.exponentialRampToValueAtTime(0.25, now + 0.18);
      voiceGain.gain.linearRampToValueAtTime(0.05, now + 1.8);

      primaryOsc.start(now);
      droneOsc.start(now);
      oscillators.push(primaryOsc, droneOsc);

      releaseFn = (sustainActive: boolean) => {
        const relTime = ctx.currentTime;
        if (sustainActive) return;

        voiceGain.gain.cancelScheduledValues(relTime);
        voiceGain.gain.setValueAtTime(voiceGain.gain.value, relTime);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, relTime + 0.5);

        setTimeout(() => {
          try {
            primaryOsc.stop();
            droneOsc.stop();
          } catch (e) {}
        }, 550);
      };

    } else if (style === 'mandolin') {
      // --- CLASSIC MANDOLIN ---
      // Bright double pluck (tremolo effect) with a rapid 70ms offset
      const stringOsc = ctx.createOscillator();
      stringOsc.type = 'triangle';
      stringOsc.frequency.setValueAtTime(frequency, now);

      const ringOsc = ctx.createOscillator();
      ringOsc.type = 'sine';
      ringOsc.frequency.setValueAtTime(frequency * 4.0, now); // high-frequency bright chime

      const stringGainNode = ctx.createGain();
      stringGainNode.gain.setValueAtTime(0.6, now);

      const ringGainNode = ctx.createGain();
      ringGainNode.gain.setValueAtTime(0.15, now);

      stringOsc.connect(stringGainNode).connect(voiceGain);
      ringOsc.connect(ringGainNode).connect(voiceGain);

      voiceGain.connect(this.masterGain);

      // Double-pluck envelope
      voiceGain.gain.linearRampToValueAtTime(0.85, now + 0.002);
      voiceGain.gain.exponentialRampToValueAtTime(0.15, now + 0.06);
      
      voiceGain.gain.setValueAtTime(0.15, now + 0.068);
      voiceGain.gain.linearRampToValueAtTime(0.75, now + 0.072);
      voiceGain.gain.exponentialRampToValueAtTime(0.2, now + 0.22);
      voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      stringOsc.start(now);
      ringOsc.start(now);
      oscillators.push(stringOsc, ringOsc);

      releaseFn = (sustainActive: boolean) => {
        const relTime = ctx.currentTime;
        if (sustainActive) return;

        voiceGain.gain.cancelScheduledValues(relTime);
        voiceGain.gain.setValueAtTime(voiceGain.gain.value, relTime);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, relTime + 0.15);

        setTimeout(() => {
          try {
            stringOsc.stop();
            ringOsc.stop();
          } catch (e) {}
        }, 200);
      };
    }

    const voice: ActiveVoice = {
      note,
      oscillators,
      gainNode: voiceGain,
      filterNode,
      lfo,
      release: releaseFn
    };

    this.activeVoices.set(note, voice);
  }

  public stopNote(note: string, force = false) {
    const voice = this.activeVoices.get(note);
    if (!voice) return;

    if (this.isSustainOn && !force) {
      // If sustain is on, keep tracking this note but don't release its sound yet.
      this.sustainedNotes.add(note);
    } else {
      voice.release(false);
      this.activeVoices.delete(note);
      this.sustainedNotes.delete(note);
    }
  }

  public stopAllNotes() {
    this.activeVoices.forEach((voice, note) => {
      voice.release(false);
    });
    this.activeVoices.clear();
    this.sustainedNotes.clear();
  }
}

export const audioEngine = new AudioEngine();
export default audioEngine;
