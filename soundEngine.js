// Sound Engine for Tactile Web Cassette
// Supports both HTML5 Audio files and instant Web Audio API procedural synthesis

class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.hissAudio = null;
    this.hissGainNode = null;
    this.hissSourceNode = null;
    this.isHissPlaying = false;
    this.isMuted = false;
    this.isDolbyOn = false;

    // Preload audio elements using import.meta.url for universal base path support
    const getAssetUrl = (file) => new URL(`./assets/sfx/${file}`, import.meta.url).href;

    this.audioFiles = {
      btnDown: new Audio(getAssetUrl('btn-down.wav')),
      btnUp: new Audio(getAssetUrl('btn-up.wav')),
      tapeFf: new Audio(getAssetUrl('tape-ff.wav')),
      tapeFlip: new Audio(getAssetUrl('tape-flip.wav')),
      tapeHiss: new Audio(getAssetUrl('tape-hiss.wav')),
    };

    // Configure hiss audio loop
    this.audioFiles.tapeHiss.loop = true;
    this.audioFiles.tapeHiss.volume = 0.05;

    // Set volumes
    this.audioFiles.btnDown.volume = 0.7;
    this.audioFiles.btnUp.volume = 0.6;
    this.audioFiles.tapeFf.volume = 0.5;
    this.audioFiles.tapeFlip.volume = 0.7;
  }

  initAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playBtnDown() {
    if (this.isMuted) return;
    this.initAudioContext();
    try {
      this.audioFiles.btnDown.currentTime = 0;
      this.audioFiles.btnDown.play().catch(() => this.synthBtnDown());
    } catch {
      this.synthBtnDown();
    }
  }

  playBtnUp() {
    if (this.isMuted) return;
    this.initAudioContext();
    try {
      this.audioFiles.btnUp.currentTime = 0;
      this.audioFiles.btnUp.play().catch(() => this.synthBtnUp());
    } catch {
      this.synthBtnUp();
    }
  }

  playTapeFf() {
    if (this.isMuted) return;
    this.initAudioContext();
    try {
      this.audioFiles.tapeFf.currentTime = 0;
      this.audioFiles.tapeFf.play().catch(() => this.synthTapeFf());
    } catch {
      this.synthTapeFf();
    }
  }

  stopTapeFf() {
    try {
      this.audioFiles.tapeFf.pause();
      this.audioFiles.tapeFf.currentTime = 0;
    } catch {}
  }

  playTapeFlip() {
    if (this.isMuted) return;
    this.initAudioContext();
    try {
      this.audioFiles.tapeFlip.currentTime = 0;
      this.audioFiles.tapeFlip.play().catch(() => this.synthTapeFlip());
    } catch {
      this.synthTapeFlip();
    }
  }

  startTapeHiss() {
    if (this.isMuted || this.isHissPlaying) return;
    this.isHissPlaying = true;
    this.initAudioContext();
    const hissVol = this.isDolbyOn ? 0.012 : 0.04;
    try {
      this.audioFiles.tapeHiss.volume = hissVol;
      this.audioFiles.tapeHiss.play().catch(() => this.synthStartTapeHiss());
    } catch {
      this.synthStartTapeHiss();
    }
  }

  setDolby(enabled) {
    this.isDolbyOn = !!enabled;
    const hissVol = this.isDolbyOn ? 0.012 : 0.04;
    this.audioFiles.tapeHiss.volume = hissVol;
    if (this.hissGainNode && this.audioCtx) {
      this.hissGainNode.gain.setValueAtTime(hissVol, this.audioCtx.currentTime);
    }
    return this.isDolbyOn;
  }

  playPencilRatchet() {
    if (this.isMuted) return;
    this.initAudioContext();
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    // Plastic tooth click
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2800, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.025);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.03);

    // Spool hub knock
    const oscKnock = this.audioCtx.createOscillator();
    const gainKnock = this.audioCtx.createGain();
    oscKnock.type = 'sine';
    oscKnock.frequency.setValueAtTime(220, now);
    oscKnock.frequency.exponentialRampToValueAtTime(90, now + 0.03);
    gainKnock.gain.setValueAtTime(0.3, now);
    gainKnock.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    oscKnock.connect(gainKnock);
    gainKnock.connect(this.audioCtx.destination);
    oscKnock.start(now);
    oscKnock.stop(now + 0.035);
  }

  stopTapeHiss() {
    this.isHissPlaying = false;
    try {
      this.audioFiles.tapeHiss.pause();
      this.audioFiles.tapeHiss.currentTime = 0;
    } catch {}
    this.synthStopTapeHiss();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopTapeHiss();
      this.stopTapeFf();
    }
    return this.isMuted;
  }

  // --- Procedural Fallback Web Audio API Synthesizers ---

  synthBtnDown() {
    if (!this.audioCtx || this.isMuted) return;
    const now = this.audioCtx.currentTime;

    // Click transient
    const oscClick = this.audioCtx.createOscillator();
    const gainClick = this.audioCtx.createGain();
    oscClick.type = 'triangle';
    oscClick.frequency.setValueAtTime(2200, now);
    oscClick.frequency.exponentialRampToValueAtTime(300, now + 0.04);
    gainClick.gain.setValueAtTime(0.5, now);
    gainClick.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    oscClick.connect(gainClick);
    gainClick.connect(this.audioCtx.destination);
    oscClick.start(now);
    oscClick.stop(now + 0.05);

    // Deep mechanical thump
    const oscThump = this.audioCtx.createOscillator();
    const gainThump = this.audioCtx.createGain();
    oscThump.type = 'sine';
    oscThump.frequency.setValueAtTime(160, now);
    oscThump.frequency.exponentialRampToValueAtTime(50, now + 0.12);
    gainThump.gain.setValueAtTime(0.6, now);
    gainThump.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    oscThump.connect(gainThump);
    gainThump.connect(this.audioCtx.destination);
    oscThump.start(now);
    oscThump.stop(now + 0.13);
  }

  synthBtnUp() {
    if (!this.audioCtx || this.isMuted) return;
    const now = this.audioCtx.currentTime;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.07);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  synthTapeFf() {
    if (!this.audioCtx || this.isMuted) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(620, now + 0.3);
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gain.gain.setValueAtTime(0.2, now + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 1.5);
  }

  synthTapeFlip() {
    if (!this.audioCtx || this.isMuted) return;
    const now = this.audioCtx.currentTime;

    // Eject click
    const osc1 = this.audioCtx.createOscillator();
    const g1 = this.audioCtx.createGain();
    osc1.frequency.setValueAtTime(1800, now);
    g1.gain.setValueAtTime(0.3, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc1.connect(g1);
    g1.connect(this.audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.06);

    // Dock latch thump at +0.7s
    const osc2 = this.audioCtx.createOscillator();
    const g2 = this.audioCtx.createGain();
    osc2.frequency.setValueAtTime(180, now + 0.7);
    osc2.frequency.exponentialRampToValueAtTime(60, now + 0.85);
    g2.gain.setValueAtTime(0.001, now);
    g2.gain.setValueAtTime(0.5, now + 0.7);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc2.connect(g2);
    g2.connect(this.audioCtx.destination);
    osc2.start(now + 0.7);
    osc2.stop(now + 0.95);
  }

  synthStartTapeHiss() {
    if (!this.audioCtx || this.hissSourceNode || this.isMuted) return;
    try {
      const bufferSize = this.audioCtx.sampleRate * 2;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2 + white * 0.3) * 0.02;
      }
      this.hissSourceNode = this.audioCtx.createBufferSource();
      this.hissSourceNode.buffer = noiseBuffer;
      this.hissSourceNode.loop = true;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2400;
      filter.Q.value = 0.6;

      this.hissGainNode = this.audioCtx.createGain();
      this.hissGainNode.gain.setValueAtTime(0.04, this.audioCtx.currentTime);

      this.hissSourceNode.connect(filter);
      filter.connect(this.hissGainNode);
      this.hissGainNode.connect(this.audioCtx.destination);

      this.hissSourceNode.start();
    } catch {}
  }

  synthStopTapeHiss() {
    if (this.hissSourceNode) {
      try {
        this.hissSourceNode.stop();
        this.hissSourceNode.disconnect();
      } catch {}
      this.hissSourceNode = null;
    }
  }
}

export const soundEngine = new SoundEngine();
