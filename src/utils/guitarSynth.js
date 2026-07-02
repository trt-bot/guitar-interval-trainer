/* Web Audio API - Premium Guitar Synthesizer and Sampler */

class GuitarSynth {
  constructor() {
    this.audioCtx = null;
    this.globalGain = null;
    this.isMuted = false;
    this.volume = 0.5; // Default volume (0.0 to 1.0)
    this.strumDelay = 0.08; // Default arpeggiation delay (80ms)
    
    // Sampler state
    this.soundfont = null;
    this.sampleCache = {}; // Cache for decoded AudioBuffers: midiNote -> AudioBuffer
    this.loadingStatus = 'uninitialized'; // 'uninitialized', 'loading', 'loaded', 'failed'
    this.onStatusChange = null;
  }

  /**
   * Initializes the AudioContext. Must be triggered by a user gesture.
   */
  init() {
    if (this.audioCtx) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass();

    this.globalGain = this.audioCtx.createGain();
    this.globalGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    this.globalGain.connect(this.audioCtx.destination);

    // Bypasses the iOS physical silent switch by playing a silent media loop
    this.enableIOSMuteBypass();

    console.log('Audio engine started.');
    
    // Start loading high-quality samples in the background
    this.loadSamples();
  }

  /**
   * Plays a 0.1-second silent WAV loop in an HTML5 audio element.
   * This forces iOS to upgrade the browser audio session from "Ambient" (respects silent switch)
   * to "Playback" (ignores silent switch), letting the Web Audio API play through the built-in speaker.
   */
  enableIOSMuteBypass() {
    try {
      const silentAudio = document.createElement('audio');
      silentAudio.setAttribute('loop', 'true');
      silentAudio.setAttribute('playsinline', 'true');
      // 1-second silent WAV base64
      silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      
      silentAudio.play().then(() => {
        console.log('iOS physical mute switch bypass successfully activated.');
      }).catch(err => {
        console.log('iOS silent switch bypass deferred or unneeded:', err.message);
      });
    } catch (e) {
      console.warn('Silent switch bypass initialization failed:', e);
    }
  }

  /**
   * Attempt to load the premium FluidR3 steel guitar soundfont
   */
  async loadSamples() {
    if (this.loadingStatus !== 'uninitialized') return;
    
    this.loadingStatus = 'loading';
    this.triggerStatusChange();

    try {
      // Initialize namespace to prevent script errors
      window.MIDI = window.MIDI || {};
      window.MIDI.Soundfont = window.MIDI.Soundfont || {};

      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_steel-mp3.js';
        script.onload = () => {
          if (window.MIDI && window.MIDI.Soundfont && window.MIDI.Soundfont.acoustic_guitar_steel) {
            resolve();
          } else {
            reject(new Error('Soundfont object not found after script load.'));
          }
        };
        script.onerror = (e) => reject(new Error('Failed to load script.'));
        document.head.appendChild(script);
      });

      this.soundfont = window.MIDI.Soundfont.acoustic_guitar_steel;
      this.loadingStatus = 'loaded';
      console.log('Premium Acoustic Guitar samples loaded successfully!');
      this.triggerStatusChange();
    } catch (err) {
      this.loadingStatus = 'failed';
      console.warn('Failed to load premium samples, falling back to real-time synthesis.', err);
      this.triggerStatusChange();
    }
  }

  triggerStatusChange() {
    if (this.onStatusChange) {
      this.onStatusChange(this.loadingStatus);
    }
  }

  /**
   * Helper to decode a base64 MP3 soundfont sample into an AudioBuffer
   */
  async getDecodedBuffer(midiNote) {
    if (this.sampleCache[midiNote]) {
      return this.sampleCache[midiNote];
    }

    const noteName = this.midiToNoteName(midiNote);
    if (!this.soundfont || !this.soundfont[noteName]) {
      throw new Error(`Sample not found for note: ${noteName}`);
    }

    const base64Data = this.soundfont[noteName];
    const base64String = base64Data.split(',')[1] || base64Data;
    const binaryString = window.atob(base64String);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const buffer = await new Promise((resolve, reject) => {
      this.audioCtx.decodeAudioData(
        bytes.buffer,
        (decoded) => resolve(decoded),
        (err) => reject(err)
      );
    });

    this.sampleCache[midiNote] = buffer;
    return buffer;
  }

  /**
   * Maps a MIDI note to the flat note naming convention used in the soundfont
   */
  midiToNoteName(midiNote) {
    const NOTES_MAP = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    const noteName = NOTES_MAP[midiNote % 12];
    const octave = Math.floor(midiNote / 12) - 1;
    return `${noteName}${octave}`;
  }

  /**
   * Set the synth volume.
   */
  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.globalGain && this.audioCtx) {
      this.globalGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.volume,
        this.audioCtx.currentTime
      );
    }
  }

  /**
   * Toggle mute state.
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.globalGain && this.audioCtx) {
      this.globalGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.volume,
        this.audioCtx.currentTime
      );
    }
    return this.isMuted;
  }

  /**
   * Play a note. Attempts to use premium sampled acoustic guitar.
   * If samples are not loaded yet or failed, falls back to real-time pluck synthesis.
   */
  async playMidiNote(midiNote, duration = 1.6, timeOffset = 0) {
    this.init();

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    if (this.isMuted) return null;

    const startTime = this.audioCtx.currentTime + timeOffset;

    // 1. Try to play sampled note
    if (this.loadingStatus === 'loaded') {
      try {
        const buffer = await this.getDecodedBuffer(midiNote);
        
        const bufferSource = this.audioCtx.createBufferSource();
        bufferSource.buffer = buffer;

        // Warm up the metallic sample tone by filtering out high harpsichord-like frequencies
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, startTime); // roll off high metallic clink further

        // Boost the lower mid-range body resonance of the acoustic guitar
        const bodyBoost = this.audioCtx.createBiquadFilter();
        bodyBoost.type = 'lowshelf';
        bodyBoost.frequency.setValueAtTime(130, startTime);
        bodyBoost.gain.setValueAtTime(8.0, startTime); // +8dB boost for woody depth

        const noteGain = this.audioCtx.createGain();
        noteGain.gain.setValueAtTime(0.001, startTime);
        noteGain.gain.linearRampToValueAtTime(1.0, startTime + 0.018); // 18ms fade-in to smooth the harsh initial pick scrape
        noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        // Chain: Source -> Lowpass -> Lowshelf -> Gain -> Output
        bufferSource.connect(filter);
        filter.connect(bodyBoost);
        bodyBoost.connect(noteGain);
        noteGain.connect(this.globalGain);

        bufferSource.start(startTime);
        bufferSource.stop(startTime + duration);
        return bufferSource;
      } catch (err) {
        console.warn(`Failed to play sample for note ${midiNote}, falling back to synthesis:`, err);
      }
    }

    // 2. Offline Synthesis Fallback
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    return this.playFrequency(freq, duration, timeOffset);
  }

  /**
   * Offline Pluck Synthesis (Triangle base + low-pass sweep + pluck noise scrape)
   */
  playFrequency(frequency, duration = 1.6, timeOffset = 0) {
    const startTime = this.audioCtx.currentTime + timeOffset;

    const noteGain = this.audioCtx.createGain();
    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(0.4, startTime + 0.005);
    noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    const lowPassFilter = this.audioCtx.createBiquadFilter();
    lowPassFilter.type = 'lowpass';
    lowPassFilter.frequency.setValueAtTime(frequency * 3.5, startTime);
    lowPassFilter.frequency.exponentialRampToValueAtTime(frequency * 1.1, startTime + 0.25);
    lowPassFilter.Q.setValueAtTime(1.5, startTime);

    lowPassFilter.connect(noteGain);
    noteGain.connect(this.globalGain);

    const osc1 = this.audioCtx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(frequency, startTime);
    osc1.connect(lowPassFilter);

    const osc2 = this.audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(frequency * 2, startTime);
    const osc2Gain = this.audioCtx.createGain();
    osc2Gain.gain.setValueAtTime(0.06, startTime);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
    osc2.connect(osc2Gain);
    osc2Gain.connect(lowPassFilter);

    const osc3 = this.audioCtx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(frequency * 3, startTime);
    const osc3Gain = this.audioCtx.createGain();
    osc3Gain.gain.setValueAtTime(0.02, startTime);
    osc3Gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
    osc3.connect(osc3Gain);
    osc3Gain.connect(lowPassFilter);

    const bufferSize = this.audioCtx.sampleRate * 0.015;
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noiseNode = this.audioCtx.createBufferSource();
    noiseNode.buffer = noiseBuffer;

    const noiseFilter = this.audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1200, startTime);
    noiseFilter.Q.setValueAtTime(3.0, startTime);

    const noiseGain = this.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.03, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.015);

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(noteGain);

    osc1.start(startTime);
    osc1.stop(startTime + duration);
    osc2.start(startTime);
    osc2.stop(startTime + duration);
    osc3.start(startTime);
    osc3.stop(startTime + duration);
    noiseNode.start(startTime);
    noiseNode.stop(startTime + 0.02);

    return osc1;
  }

  /**
   * Plays an interval (two notes).
   */
  playInterval(rootMidi, targetMidi, mode = 'ascending', noteDuration = 1.0) {
    if (mode === 'ascending') {
      this.playMidiNote(rootMidi, noteDuration, 0);
      this.playMidiNote(targetMidi, noteDuration, noteDuration * 0.6);
    } else if (mode === 'descending') {
      this.playMidiNote(targetMidi, noteDuration, 0);
      this.playMidiNote(rootMidi, noteDuration, noteDuration * 0.6);
    } else {
      // Harmonic
      this.playMidiNote(rootMidi, noteDuration * 1.5, 0);
      this.playMidiNote(targetMidi, noteDuration * 1.5, 0);
    }
  }

  /**
   * Plays a chord (multiple notes).
   * @param {Array<number>} midiNotes - List of MIDI note numbers
   * @param {boolean} arpeggiated - Whether to strum the chord (staggered plucks)
   * @param {number} noteDuration - Duration of each note in seconds
   */
  playMidiChord(midiNotes, arpeggiated = true, noteDuration = 2.0) {
    midiNotes.forEach((midi, idx) => {
      const delay = arpeggiated ? idx * this.strumDelay : 0; // use configured strum delay
      this.playMidiNote(midi, noteDuration - delay, delay);
    });
  }
}

export const synth = new GuitarSynth();
