// YouTube IFrame Player API Manager for Tactile Web Cassette

class YouTubeManager {
  constructor() {
    this.player = null;
    this.isReady = false;
    this.currentVideoId = null;
    this.callbacks = {
      onReady: () => {},
      onPlay: () => {},
      onPause: () => {},
      onEnded: () => {},
      onError: (err) => {},
      onTrackTitle: (title) => {}
    };
    this.initPromise = null;
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  init(containerId = 'yt-player-container') {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      // If YT API already loaded
      if (window.YT && window.YT.Player) {
        this.createPlayer(containerId, resolve);
        return;
      }

      // Load YouTube Iframe API script
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      const prevOnReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevOnReady === 'function') prevOnReady();
        this.createPlayer(containerId, resolve);
      };

      // Timeout safety check
      setTimeout(() => {
        if (!this.isReady && !this.player) {
          console.warn('[YouTubeManager] YouTube API loading timeout, proceeding in mock/fallback mode');
          resolve(false);
        }
      }, 7000);
    });

    return this.initPromise;
  }

  createPlayer(containerId, resolve) {
    try {
      this.player = new window.YT.Player(containerId, {
        height: '1',
        width: '1',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event) => {
            this.isReady = true;
            console.log('[YouTubeManager] Player Ready');
            this.callbacks.onReady();
            resolve(true);
          },
          onStateChange: (event) => {
            this.handleStateChange(event.data);
          },
          onError: (event) => {
            console.warn('[YouTubeManager] Player Error code:', event.data);
            this.callbacks.onError(event.data);
          }
        }
      });
    } catch (e) {
      console.error('[YouTubeManager] Failed to create YT.Player', e);
      resolve(false);
    }
  }

  handleStateChange(state) {
    if (!window.YT) return;
    switch (state) {
      case window.YT.PlayerState.PLAYING:
        this.callbacks.onPlay();
        this.fetchTitle();
        break;
      case window.YT.PlayerState.PAUSED:
        this.callbacks.onPause();
        break;
      case window.YT.PlayerState.ENDED:
        this.callbacks.onEnded();
        break;
    }
  }

  fetchTitle() {
    if (this.player && typeof this.player.getVideoData === 'function') {
      try {
        const data = this.player.getVideoData();
        if (data && data.title) {
          this.callbacks.onTrackTitle(data.title);
        }
      } catch {}
    }
  }

  loadVideo(videoId, startSeconds = 0, autoplay = true) {
    if (!videoId) return;
    this.currentVideoId = videoId;
    if (!this.isReady || !this.player) {
      console.warn('[YouTubeManager] Player not ready yet, video queued:', videoId);
      return;
    }

    try {
      if (autoplay) {
        this.player.loadVideoById({
          videoId: videoId,
          startSeconds: startSeconds
        });
      } else {
        this.player.cueVideoById({
          videoId: videoId,
          startSeconds: startSeconds
        });
      }
    } catch (err) {
      console.error('[YouTubeManager] loadVideo error:', err);
    }
  }

  play() {
    if (this.isReady && this.player && typeof this.player.playVideo === 'function') {
      try {
        this.player.playVideo();
      } catch (e) {
        console.warn('[YouTubeManager] playVideo failed', e);
      }
    }
  }

  pause() {
    if (this.isReady && this.player && typeof this.player.pauseVideo === 'function') {
      try {
        this.player.pauseVideo();
      } catch (e) {
        console.warn('[YouTubeManager] pauseVideo failed', e);
      }
    }
  }

  stop() {
    if (this.isReady && this.player && typeof this.player.stopVideo === 'function') {
      try {
        this.player.stopVideo();
      } catch (e) {
        console.warn('[YouTubeManager] stopVideo failed', e);
      }
    }
  }

  seekBy(deltaSeconds) {
    if (this.isReady && this.player && typeof this.player.getCurrentTime === 'function') {
      try {
        const current = this.player.getCurrentTime() || 0;
        const duration = this.player.getDuration() || 0;
        const target = Math.max(0, Math.min(duration, current + deltaSeconds));
        this.player.seekTo(target, true);
        return target;
      } catch (e) {
        console.warn('[YouTubeManager] seekBy failed', e);
      }
    }
    return 0;
  }

  seekTo(seconds) {
    if (this.isReady && this.player && typeof this.player.seekTo === 'function') {
      try {
        this.player.seekTo(Math.max(0, seconds), true);
      } catch (e) {}
    }
  }

  mute() {
    if (this.isReady && this.player && typeof this.player.mute === 'function') {
      try {
        this.player.mute();
      } catch (e) {}
    }
  }

  unMute() {
    if (this.isReady && this.player && typeof this.player.unMute === 'function') {
      try {
        this.player.unMute();
      } catch (e) {}
    }
  }

  setVolume(volume) {
    if (this.isReady && this.player && typeof this.player.setVolume === 'function') {
      try {
        this.player.setVolume(Math.max(0, Math.min(100, volume)));
      } catch (e) {}
    }
  }

  setPlaybackRate(rate) {
    if (this.isReady && this.player && typeof this.player.setPlaybackRate === 'function') {
      try {
        this.player.setPlaybackRate(rate);
      } catch (e) {}
    }
  }

  getCurrentTime() {
    if (this.isReady && this.player && typeof this.player.getCurrentTime === 'function') {
      try {
        return this.player.getCurrentTime() || 0;
      } catch (e) {}
    }
    return 0;
  }

  getDuration() {
    if (this.isReady && this.player && typeof this.player.getDuration === 'function') {
      try {
        return this.player.getDuration() || 0;
      } catch (e) {}
    }
    return 0;
  }
}

export const youtubeManager = new YouTubeManager();
