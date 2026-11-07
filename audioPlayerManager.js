// Unified Multi-Source Audio Player Manager
// Supports YouTube IFrame API and HTML5 Direct Audio Streams (MP3, WAV, OGG, M4A)

import { youtubeManager } from './youtubeManager.js';
import { soundEngine } from './soundEngine.js';

class AudioPlayerManager {
  constructor() {
    this.currentSource = null; // { type: 'youtube' | 'audio', src: string }
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';

    // Web Audio API Analyser for direct audio
    this.audioCtx = null;
    this.analyser = null;
    this.audioSourceNode = null;
    this.dataArray = null;

    this.callbacks = {
      onPlay: () => {},
      onPause: () => {},
      onEnded: () => {},
      onError: (err) => {},
      onTrackTitle: (title) => {}
    };

    this.setupAudioElementListeners();
  }

  setCallbacks(cbs) {
    this.callbacks = { ...this.callbacks, ...cbs };
    youtubeManager.setCallbacks(cbs);
  }

  init(containerId) {
    return youtubeManager.init(containerId);
  }

  setupAudioElementListeners() {
    this.audioElement.addEventListener('playing', () => {
      this.callbacks.onPlay();
    });

    this.audioElement.addEventListener('pause', () => {
      this.callbacks.onPause();
    });

    this.audioElement.addEventListener('ended', () => {
      this.callbacks.onEnded();
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn('[AudioPlayerManager] Direct audio error:', e);
      this.callbacks.onError('Audio playback error');
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      const filename = this.extractFileName(this.audioElement.src);
      this.callbacks.onTrackTitle(filename);
    });
  }

  extractFileName(url) {
    try {
      const pathname = new URL(url).pathname;
      const file = pathname.split('/').pop() || 'Direct Audio Stream';
      return decodeURIComponent(file).replace(/\.[^/.]+$/, "");
    } catch {
      return 'Direct Audio Stream';
    }
  }

  setupWebAudioAnalyser() {
    if (this.analyser) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (!this.audioSourceNode) {
        this.audioSourceNode = this.audioCtx.createMediaElementSource(this.audioElement);
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.8;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        this.audioSourceNode.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
      }
    } catch (e) {
      console.warn('[AudioPlayerManager] Web Audio Analyser setup fallback:', e);
    }
  }

  loadTrack(trackInfo, autoplay = true) {
    // trackInfo: { type: 'youtube' | 'audio', src: string }
    this.currentSource = trackInfo;

    if (trackInfo.type === 'youtube') {
      // Stop direct audio if playing
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      youtubeManager.loadVideo(trackInfo.src, 0, autoplay);
    } else {
      // Direct Audio link
      youtubeManager.stop();
      this.setupWebAudioAnalyser();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.audioElement.src = trackInfo.src;
      this.audioElement.load();
      if (autoplay) {
        this.audioElement.play().catch(e => {
          console.warn('[AudioPlayerManager] Direct audio autoplay blocked, waiting for click:', e);
        });
      }
    }
  }

  play() {
    if (!this.currentSource) return;
    if (this.currentSource.type === 'youtube') {
      youtubeManager.play();
    } else {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.audioElement.play().catch(() => {});
    }
  }

  pause() {
    if (!this.currentSource) return;
    if (this.currentSource.type === 'youtube') {
      youtubeManager.pause();
    } else {
      this.audioElement.pause();
    }
  }

  stop() {
    if (!this.currentSource) return;
    if (this.currentSource.type === 'youtube') {
      youtubeManager.stop();
    } else {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
  }

  seekBy(deltaSeconds) {
    if (!this.currentSource) return;
    if (this.currentSource.type === 'youtube') {
      return youtubeManager.seekBy(deltaSeconds);
    } else {
      const target = Math.max(0, Math.min(this.getDuration(), this.getCurrentTime() + deltaSeconds));
      this.audioElement.currentTime = target;
      return target;
    }
  }

  seekTo(seconds) {
    if (!this.currentSource) return;
    if (this.currentSource.type === 'youtube') {
      youtubeManager.seekTo(seconds);
    } else {
      this.audioElement.currentTime = Math.max(0, seconds);
    }
  }

  mute() {
    if (!this.currentSource) return;
    if (this.currentSource.type === 'youtube') {
      youtubeManager.mute();
    } else {
      this.audioElement.muted = true;
    }
  }

  unMute() {
    if (!this.currentSource) return;
    if (this.currentSource.type === 'youtube') {
      youtubeManager.unMute();
    } else {
      this.audioElement.muted = false;
    }
  }

  setVolume(volume0to100) {
    const val = Math.max(0, Math.min(100, volume0to100));
    youtubeManager.setVolume(val);
    this.audioElement.volume = val / 100;
  }

  setPlaybackRate(rate) {
    const safeRate = Math.max(0.75, Math.min(1.3, rate));
    youtubeManager.setPlaybackRate(safeRate);
    this.audioElement.playbackRate = safeRate;
    return safeRate;
  }

  getCurrentTime() {
    if (!this.currentSource) return 0;
    if (this.currentSource.type === 'youtube') {
      return youtubeManager.getCurrentTime();
    } else {
      return this.audioElement.currentTime || 0;
    }
  }

  getDuration() {
    if (!this.currentSource) return 0;
    if (this.currentSource.type === 'youtube') {
      return youtubeManager.getDuration();
    } else {
      return this.audioElement.duration || 0;
    }
  }

  getRealAudioLevels() {
    if (this.analyser && this.dataArray && this.currentSource?.type === 'audio' && !this.audioElement.paused) {
      this.analyser.getByteFrequencyData(this.dataArray);
      let sumL = 0;
      let sumR = 0;
      const half = Math.floor(this.dataArray.length / 2);
      for (let i = 0; i < half; i++) sumL += this.dataArray[i];
      for (let i = half; i < this.dataArray.length; i++) sumR += this.dataArray[i];
      return {
        left: sumL / (half * 255),
        right: sumR / (half * 255)
      };
    }
    return null;
  }
}

export const audioPlayerManager = new AudioPlayerManager();
