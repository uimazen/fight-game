/**
 * Procedural Web Audio Synthesizer & Dynamic Interactive Fight Music Engine
 * Zero external asset dependencies, ultra-low latency.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isLowHealthActive: boolean = false;
  private heartbeatInterval: number | null = null;

  // Volume Levels (0 to 1)
  private masterVolume: number = 0.8;
  private musicVolume: number = 0.7;
  private sfxVolume: number = 0.85;

  // Dynamic Music Engine
  private isMusicRunning: boolean = false;
  private musicInterval: number | null = null;
  private currentStep: number = 0;
  private currentCombo: number = 0;
  private currentRank: string = 'D';

  // Sub-layer gains for dynamic mixing
  private bassGain: GainNode | null = null;
  private drumGain: GainNode | null = null;
  private arpGain: GainNode | null = null;
  private leadGain: GainNode | null = null;

  constructor() {}

  public initCtx() {
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume * 0.75, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX sub-bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music sub-bus
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume * 0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      // Create stem gains for dynamic combo intensity
      this.bassGain = this.ctx.createGain();
      this.bassGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.bassGain.connect(this.musicGain);

      this.drumGain = this.ctx.createGain();
      this.drumGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.drumGain.connect(this.musicGain);

      this.arpGain = this.ctx.createGain();
      this.arpGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.arpGain.connect(this.musicGain);

      this.leadGain = this.ctx.createGain();
      this.leadGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.leadGain.connect(this.musicGain);

      this.startMusicLoop();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getSfxBus(): AudioNode {
    this.initCtx();
    return this.sfxGain || this.masterGain || this.ctx!.destination;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.masterVolume * 0.75, this.ctx.currentTime);
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume * 0.75, this.ctx.currentTime);
    }
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume * 0.35, this.ctx.currentTime);
    }
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  // ==========================================
  // DYNAMIC COMBO MUSIC SEQUENCER (135 BPM)
  // ==========================================
  public updateMusicCombo(combo: number, styleRank: string) {
    this.currentCombo = combo;
    this.currentRank = styleRank;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Drums ramp up when combo >= 3
    const drumVol = combo >= 3 ? 0.65 : 0.0;
    // Arpeggiator ramps up when combo >= 7 (Rank B+)
    const arpVol = combo >= 7 ? 0.55 : 0.0;
    // Overdrive lead ramps up when combo >= 14 (Rank A+) and max at SSS
    const leadVol = combo >= 20 ? 0.8 : combo >= 14 ? 0.45 : 0.0;

    if (this.drumGain) this.drumGain.gain.setTargetAtTime(drumVol, t, 0.2);
    if (this.arpGain) this.arpGain.gain.setTargetAtTime(arpVol, t, 0.2);
    if (this.leadGain) this.leadGain.gain.setTargetAtTime(leadVol, t, 0.2);
  }

  private startMusicLoop() {
    if (this.isMusicRunning) return;
    this.isMusicRunning = true;

    // 135 BPM = 16th note every ~111ms
    const stepDuration = (60 / 135) / 4;

    this.musicInterval = window.setInterval(() => {
      if (!this.ctx || this.isMuted || this.ctx.state !== 'running') return;
      this.playSequencerStep(this.currentStep);
      this.currentStep = (this.currentStep + 1) % 16;
    }, stepDuration * 1000);
  }

  private playSequencerStep(step: number) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime + 0.02;

    // 1. ROLLING SYNTH BASS (Plays on every 16th note with groovy accents)
    // Scale: D minor (D2: 73.4Hz, F2: 87.3Hz, G2: 98.0Hz, A2: 110.0Hz, C3: 130.8Hz)
    const bassNotes = [73.4, 73.4, 73.4, 87.3, 73.4, 73.4, 98.0, 73.4, 73.4, 73.4, 110.0, 98.0, 73.4, 87.3, 98.0, 65.4];
    const bassFreq = bassNotes[step];

    if (this.bassGain) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(bassFreq, t);

      filter.type = 'lowpass';
      // Low filter when idle, opens up with higher combo
      const cutoff = 300 + Math.min(1800, this.currentCombo * 80);
      filter.frequency.setValueAtTime(cutoff, t);
      filter.frequency.exponentialRampToValueAtTime(160, t + 0.1);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bassGain);

      osc.start(t);
      osc.stop(t + 0.1);
    }

    // 2. DRUMS (Kick on 0, 4, 8, 12; Snare on 4, 12; Hi-hat on every odd step)
    if (this.drumGain && this.currentCombo >= 3) {
      // Electronic Kick
      if (step === 0 || step === 4 || step === 8 || step === 12) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(140, t);
        kickOsc.frequency.exponentialRampToValueAtTime(38, t + 0.08);

        kickGain.gain.setValueAtTime(0.8, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        kickOsc.connect(kickGain);
        kickGain.connect(this.drumGain);
        kickOsc.start(t);
        kickOsc.stop(t + 0.12);
      }

      // Crisp Snare / Clap
      if (step === 4 || step === 12) {
        const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.08), this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.6;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buf;
        const flt = this.ctx.createBiquadFilter();
        flt.type = 'highpass';
        flt.frequency.setValueAtTime(1200, t);

        const snGain = this.ctx.createGain();
        snGain.gain.setValueAtTime(0.5, t);
        snGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        noise.connect(flt);
        flt.connect(snGain);
        snGain.connect(this.drumGain);
        noise.start(t);
        noise.stop(t + 0.08);
      }

      // Fast Hi-Hat
      if (step % 2 === 1 || this.currentCombo >= 15) {
        const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.04), this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.3;

        const hat = this.ctx.createBufferSource();
        hat.buffer = buf;
        const flt = this.ctx.createBiquadFilter();
        flt.type = 'highpass';
        flt.frequency.setValueAtTime(7000, t);

        const hGain = this.ctx.createGain();
        hGain.gain.setValueAtTime(0.25, t);
        hGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

        hat.connect(flt);
        flt.connect(hGain);
        hGain.connect(this.drumGain);
        hat.start(t);
        hat.stop(t + 0.04);
      }
    }

    // 3. SYNTH ARPEGGIO (Combo >= 7)
    if (this.arpGain && this.currentCombo >= 7) {
      const arpNotes = [293.66, 349.23, 440.0, 523.25, 587.33, 523.25, 440.0, 349.23];
      const arpFreq = arpNotes[step % 8];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(arpFreq, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.arpGain);
      osc.start(t);
      osc.stop(t + 0.08);
    }

    // 4. OVERDRIVE LEAD CYBER HOOK (Combo >= 14)
    if (this.leadGain && this.currentCombo >= 14) {
      // Driving pentatonic riffs on specific beats
      const leadNotes: { [key: number]: number } = {
        0: 587.33, // D5
        2: 698.46, // F5
        4: 880.0,  // A5
        6: 783.99, // G5
        8: 880.0,  // A5
        10: 1046.5, // C6
        12: 1174.66, // D6
        14: 880.0,
      };

      if (leadNotes[step] !== undefined) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(leadNotes[step], t);
        osc.frequency.exponentialRampToValueAtTime(leadNotes[step] * 1.01, t + 0.14);

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.leadGain);
        osc.start(t);
        osc.stop(t + 0.15);
      }
    }
  }

  // ==========================================
  // COMBAT SFX (Whooshes, Hits, Parries, etc.)
  // ==========================================

  public playWhoosh(pitchMultiplier = 1.0, isDodge = false) {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const duration = isDodge ? 0.28 : 0.2;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(2.5, t);
    const startFreq = isDodge ? 400 * pitchMultiplier : 350 * pitchMultiplier;
    const peakFreq = isDodge ? 1800 * pitchMultiplier : 2200 * pitchMultiplier;
    const endFreq = 250 * pitchMultiplier;

    filter.frequency.setValueAtTime(startFreq, t);
    filter.frequency.exponentialRampToValueAtTime(peakFreq, t + duration * 0.4);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, endFreq), t + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(isDodge ? 0.45 : 0.35, t + duration * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + duration);
  }

  public playHit(intensity: 'light' | 'medium' | 'heavy' = 'light') {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const isHeavy = intensity === 'heavy';
    const isMedium = intensity === 'medium';
    const duration = isHeavy ? 0.35 : isMedium ? 0.25 : 0.18;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = isHeavy ? 'triangle' : 'sine';
    const startFreq = isHeavy ? 260 : isMedium ? 200 : 160;
    const endFreq = isHeavy ? 35 : 45;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);

    oscGain.gain.setValueAtTime(isHeavy ? 0.9 : 0.6, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + duration);

    const snap = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snap.type = 'sawtooth';
    snap.frequency.setValueAtTime(800, t);
    snap.frequency.exponentialRampToValueAtTime(100, t + 0.05);

    snapGain.gain.setValueAtTime(isHeavy ? 0.6 : 0.35, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    snap.connect(snapGain);
    snapGain.connect(this.masterGain);
    snap.start(t);
    snap.stop(t + 0.06);
  }

  public playParry() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const duration = 0.6;

    const carrier = this.ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(1100, t);
    carrier.frequency.exponentialRampToValueAtTime(950, t + duration);

    const modulator = this.ctx.createOscillator();
    modulator.type = 'sawtooth';
    modulator.frequency.setValueAtTime(1620, t);

    const modGain = this.ctx.createGain();
    modGain.gain.setValueAtTime(1200, t);
    modGain.gain.exponentialRampToValueAtTime(40, t + duration);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    const shimmer = this.ctx.createOscillator();
    const shimmerGain = this.ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(3200, t);
    shimmer.frequency.exponentialRampToValueAtTime(2600, t + duration * 0.8);

    shimmerGain.gain.setValueAtTime(0.4, t);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.8);

    carrier.connect(gain);
    gain.connect(this.masterGain);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(this.masterGain);

    carrier.start(t);
    modulator.start(t);
    shimmer.start(t);

    carrier.stop(t + duration);
    modulator.stop(t + duration);
    shimmer.stop(t + duration);
  }

  public playGuardBreak() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const duration = 0.55;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + duration);

    oscGain.gain.setValueAtTime(0.7, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    const crack = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crack.type = 'sine';
    crack.frequency.setValueAtTime(2400, t);
    crack.frequency.exponentialRampToValueAtTime(800, t + 0.35);

    crackGain.gain.setValueAtTime(0.6, t);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    crack.connect(crackGain);
    crackGain.connect(this.masterGain);

    osc.start(t);
    crack.start(t);
    osc.stop(t + duration);
    crack.stop(t + 0.35);
  }

  public playExecution() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const duration = 1.1;

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(220, t);
    sub.frequency.exponentialRampToValueAtTime(28, t + duration);

    subGain.gain.setValueAtTime(1.0, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    const saw = this.ctx.createOscillator();
    const sawGain = this.ctx.createGain();
    saw.type = 'sawtooth';
    saw.frequency.setValueAtTime(140, t);
    saw.frequency.exponentialRampToValueAtTime(50, t + 0.5);

    sawGain.gain.setValueAtTime(0.5, t);
    sawGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    saw.connect(sawGain);
    sawGain.connect(this.masterGain);

    sub.start(t);
    saw.start(t);
    sub.stop(t + duration);
    saw.stop(t + duration);
  }

  public playDangerTelegraph() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(740, t);
    osc.frequency.setValueAtTime(880, t + 0.08);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  public playWaveCleared() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const t = this.ctx!.currentTime + idx * 0.1;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.8);
    });
  }

  public setLowHealth(active: boolean) {
    if (active === this.isLowHealthActive) return;
    this.isLowHealthActive = active;

    if (!active) {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      return;
    }

    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const triggerHeartbeat = () => {
      if (!this.ctx || this.isMuted || !this.isLowHealthActive) return;
      const t = this.ctx.currentTime;

      const p1 = this.ctx.createOscillator();
      const g1 = this.ctx.createGain();
      p1.type = 'sine';
      p1.frequency.setValueAtTime(85, t);
      p1.frequency.exponentialRampToValueAtTime(45, t + 0.15);
      g1.gain.setValueAtTime(0.5, t);
      g1.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      p1.connect(g1);
      g1.connect(this.masterGain!);
      p1.start(t);
      p1.stop(t + 0.15);

      const p2 = this.ctx.createOscillator();
      const g2 = this.ctx.createGain();
      p2.type = 'sine';
      p2.frequency.setValueAtTime(70, t + 0.18);
      p2.frequency.exponentialRampToValueAtTime(40, t + 0.35);
      g2.gain.setValueAtTime(0.35, t + 0.18);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      p2.connect(g2);
      g2.connect(this.masterGain!);
      p2.start(t + 0.18);
      p2.stop(t + 0.35);
    };

    triggerHeartbeat();
    this.heartbeatInterval = window.setInterval(triggerHeartbeat, 900);
  }

  public playPurchase() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // High tech coin chime
    const o1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(880, t);
    o1.frequency.setValueAtTime(1320, t + 0.08);
    o1.frequency.setValueAtTime(1760, t + 0.16);

    g1.gain.setValueAtTime(0.35, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    o1.connect(g1);
    g1.connect(this.masterGain);
    o1.start(t);
    o1.stop(t + 0.4);
  }

  public playWeaponEquip() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Metal draw & high plasma hum
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(980, t + 0.22);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  public playSheathClick() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Metallic katana tsuba click
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.04);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  public playFinisherSlash(tier: 'light' | 'heavy' | 'lethal' = 'light') {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    
    if (tier === 'lethal') {
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.45);
      gain.gain.setValueAtTime(0.95, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    } else if (tier === 'heavy') {
      osc.frequency.setValueAtTime(850, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.25);
      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    } else {
      osc.frequency.setValueAtTime(1100, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.14);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    }

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + (tier === 'lethal' ? 0.5 : 0.28));
  }

  // ==========================================
  // NEW VISCERAL COMBAT & BOSS / LASER SFX
  // ==========================================

  public playLaserCharge() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const duration = 0.8;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + duration);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.4, t + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.getSfxBus());
    osc.start(t);
    osc.stop(t + duration);
  }

  public playLaserBeam() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const duration = 0.5;

    // Sizzling plasma noise + high-intensity sawtooth
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750, t);
    osc.frequency.linearRampToValueAtTime(320, t + duration);

    oscGain.gain.setValueAtTime(0.65, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    // Plasma sizzle noise
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * duration), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.7;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3500, t);
    filter.Q.setValueAtTime(3.0, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(oscGain);
    oscGain.connect(this.getSfxBus());
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.getSfxBus());

    osc.start(t);
    osc.stop(t + duration);
    noise.start(t);
    noise.stop(t + duration);
  }

  public playBossRoar() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const duration = 1.2;

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(90, t);
    sub.frequency.linearRampToValueAtTime(45, t + duration);

    subGain.gain.setValueAtTime(0.85, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    const roar = this.ctx.createOscillator();
    const roarGain = this.ctx.createGain();
    roar.type = 'triangle';
    roar.frequency.setValueAtTime(160, t);
    roar.frequency.exponentialRampToValueAtTime(55, t + duration);

    roarGain.gain.setValueAtTime(0.7, t);
    roarGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    sub.connect(subGain);
    subGain.connect(this.getSfxBus());
    roar.connect(roarGain);
    roarGain.connect(this.getSfxBus());

    sub.start(t);
    sub.stop(t + duration);
    roar.start(t);
    roar.stop(t + duration);
  }

  public playBossSlam() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const duration = 0.7;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + duration);

    oscGain.gain.setValueAtTime(1.0, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(oscGain);
    oscGain.connect(this.getSfxBus());
    osc.start(t);
    osc.stop(t + duration);
  }

  public playBloodSplatter() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const duration = 0.22;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + duration);

    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.getSfxBus());
    osc.start(t);
    osc.stop(t + duration);
  }

  public playPerfectDodge() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const duration = 0.45;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(1320, t + duration);

    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.getSfxBus());
    osc.start(t);
    osc.stop(t + duration);
  }

  public playLaserFire(isBoss = false) {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const duration = isBoss ? 0.7 : 0.25;

    // High energy plasma discharge
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(isBoss ? 980 : 1800, t);
    osc.frequency.exponentialRampToValueAtTime(isBoss ? 160 : 340, t + duration);

    gain.gain.setValueAtTime(isBoss ? 0.7 : 0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    // Filter for laser sizzle
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isBoss ? 1200 : 2400, t);
    filter.Q.setValueAtTime(3.5, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSfxBus());
    osc.start(t);
    osc.stop(t + duration);
  }

  public playBossSpawn() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Menacing sub-bass horn
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, t);
    osc.frequency.linearRampToValueAtTime(82, t + 0.6);
    osc.frequency.linearRampToValueAtTime(55, t + 1.8);

    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSfxBus());
    osc.start(t);
    osc.stop(t + 2.0);
  }

  public playBossSmash() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const duration = 0.8;

    // Heavy crater slam
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + duration);

    gain.gain.setValueAtTime(0.95, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.getSfxBus());
    osc.start(t);
    osc.stop(t + duration);
  }
}

export const soundEngine = new SoundEngine();
