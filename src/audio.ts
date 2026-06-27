/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class RetroAudio {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private musicEnabled: boolean = false;
  private musicInterval: any = null;
  private currentSeqStep: number = 0;
  private masterVolume: GainNode | null = null;

  // Retro Mario-like theme sequence: pairs of [frequency, duration in beats]
  // Tempo: 120 BPM, 1 beat = 0.5 seconds, 1 step (16th note) = 0.125 seconds
  private melody = [
    659.25, 659.25, 0, 659.25, 0, 523.25, 659.25, 0,
    783.99, 0, 0, 0, 392.00, 0, 0, 0,
    
    523.25, 0, 0, 392.00, 0, 0, 329.63, 0,
    0, 440.00, 0, 493.88, 0, 466.16, 440.00, 0,
    
    392.00, 659.25, 783.99, 880.00, 0, 698.46, 783.99, 0,
    659.25, 0, 523.25, 587.33, 493.88, 0, 0, 0
  ];

  constructor() {
    // Initial state is sound enabled, music disabled by default to avoid startling the user
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      // Setup master volume
      this.masterVolume = this.ctx.createGain();
      this.masterVolume.gain.setValueAtTime(0.2, this.ctx.currentTime); // keep it comfortable
      this.masterVolume.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (enabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  private resumeCtx() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- Retro Sound Effects ---

  playJump() {
    this.resumeCtx();
    if (!this.soundEnabled || !this.ctx || !this.masterVolume) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle'; // Mario uses triangle or square waves for jump
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    // Quick sweep up from 150Hz to 650Hz
    osc.frequency.exponentialRampToValueAtTime(650, this.ctx.currentTime + 0.16);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(this.masterVolume);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }

  playDoubleJump() {
    this.resumeCtx();
    if (!this.soundEnabled || !this.ctx || !this.masterVolume) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(350, this.ctx.currentTime);
    // Even higher pitch chirp
    osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.masterVolume);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playRunTick() {
    this.resumeCtx();
    if (!this.soundEnabled || !this.ctx || !this.masterVolume) return;

    // A very subtle, low 8-bit click for running feet
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.setValueAtTime(40, this.ctx.currentTime + 0.02);

    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.setValueAtTime(0, this.ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(this.masterVolume);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  playCoin() {
    this.resumeCtx();
    if (!this.soundEnabled || !this.ctx || !this.masterVolume) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Two high notes: first lower, second higher, classic chime
    osc.frequency.setValueAtTime(987.77, t); // B5
    osc.frequency.setValueAtTime(1318.51, t + 0.08); // E6

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.setValueAtTime(0.15, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterVolume);

    osc.start();
    osc.stop(t + 0.35);
  }

  playPowerup() {
    this.resumeCtx();
    if (!this.soundEnabled || !this.ctx || !this.masterVolume) return;

    const t = this.ctx.currentTime;
    const notes = [330, 392, 659, 523, 587, 784]; // Arpeggio C-E-G-c-e-g
    const step = 0.07;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * step);

      gain.gain.setValueAtTime(0.15, t + idx * step);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * step + 0.12);

      osc.connect(gain);
      gain.connect(this.masterVolume!);

      osc.start(t + idx * step);
      osc.stop(t + idx * step + 0.13);
    });
  }

  playPowerdown() {
    this.resumeCtx();
    if (!this.soundEnabled || !this.ctx || !this.masterVolume) return;

    const t = this.ctx.currentTime;
    const notes = [784, 587, 523, 392, 330, 220]; // Descending arpeggio
    const step = 0.07;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * step);

      gain.gain.setValueAtTime(0.15, t + idx * step);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * step + 0.12);

      osc.connect(gain);
      gain.connect(this.masterVolume!);

      osc.start(t + idx * step);
      osc.stop(t + idx * step + 0.13);
    });
  }

  playStomp() {
    this.resumeCtx();
    if (!this.soundEnabled || !this.ctx || !this.masterVolume) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    // Simple low pass filter to make it sound "stompier"
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.13);
  }

  playHurt() {
    this.resumeCtx();
    if (!this.soundEnabled || !this.ctx || !this.masterVolume) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(100, t + 0.3);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    osc.connect(gain);
    gain.connect(this.masterVolume);

    osc.start();
    osc.stop(t + 0.35);
  }

  playGameOver() {
    this.resumeCtx();
    if (!this.soundEnabled || !this.ctx || !this.masterVolume) return;

    const t = this.ctx.currentTime;
    // Sad 4-note descending progression: C5 -> G4 -> E4 -> C4
    const notes = [523.25, 392.00, 329.63, 261.63];
    const duration = 0.22;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t + idx * duration);

      gain.gain.setValueAtTime(0.2, t + idx * duration);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * duration + duration - 0.02);

      osc.connect(gain);
      gain.connect(this.masterVolume!);

      osc.start(t + idx * duration);
      osc.stop(t + idx * duration + duration);
    });
  }

  // --- Background Melody Sequencer ---

  private startMusic() {
    this.resumeCtx();
    if (this.musicInterval) return;
    if (!this.ctx || !this.masterVolume) return;

    const stepDuration = 0.135; // 135ms per eighth/sixteenth note (approx 110 BPM)
    this.currentSeqStep = 0;

    const playNote = () => {
      if (!this.musicEnabled || !this.ctx || !this.masterVolume) return;
      
      const freq = this.melody[this.currentSeqStep % this.melody.length];
      if (freq > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Authentic retro 8-bit pulse wave sound (approximation)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime); // quiet bg music
        gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + stepDuration - 0.02);

        osc.connect(gain);
        gain.connect(this.masterVolume);

        osc.start();
        osc.stop(this.ctx.currentTime + stepDuration);
      }

      this.currentSeqStep++;
    };

    // Schedule loop using setInterval (or Web Audio scheduler for absolute precision, but setInterval is simple and reliable for this)
    this.musicInterval = setInterval(playNote, stepDuration * 1000);
  }

  private stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const retroAudio = new RetroAudio();
