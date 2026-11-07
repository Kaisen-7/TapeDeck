import { soundEngine } from './soundEngine.js';
import { audioPlayerManager } from './audioPlayerManager.js';
import { DeckStateMachine, STATES } from './stateMachine.js';
import {
  DEFAULT_MIXTAPE,
  COLOR_THEMES,
  RETRO_STICKERS,
  parseTrackInput,
  resolveTrackSource,
  encodeMixtape,
  decodeMixtape,
  getMixtapeFromUrl,
  getShareUrl,
  getTapeRack,
  saveToTapeRack,
  removeFromTapeRack
} from './mixtapeData.js';
import QRCode from 'qrcode';

// ============================================================================
// APPLICATION STATE
// ============================================================================

let currentMixtape = getMixtapeFromUrl() || DEFAULT_MIXTAPE;
let currentSide = 'A'; // 'A' or 'B'
let currentTrackIndex = 0;
let counterValue = 0;
let counterInterval = null;
let vuAnimationId = null;
let tapeMonitorInterval = null;
let isHissMuted = false;
let selectedColorTheme = currentMixtape.c || 'retro-orange';
let selectedSticker = currentMixtape.s || 'none';

// Hardware Features State
let isPencilMode = false;
let isDolbyActive = false;
let isAutoReverse = false;
let currentPlaybackRate = 1.0;
let recordedVoiceBlob = null;
let recordedVoiceDataUri = null;
let mediaRecorder = null;
let audioChunks = [];
let voiceTimerInterval = null;
let isPlayingVoiceIntro = false;

// DOM Elements Cache
const elements = {
  body: document.body,
  // Header Buttons
  btnToggleAtmosphere: document.getElementById('btn-toggle-atmosphere'),
  atmosphereText: document.getElementById('atmosphere-text'),
  btnOpenRack: document.getElementById('btn-open-rack'),
  btnOpenCreator: document.getElementById('btn-open-creator'),
  // Deck Controls
  btnPlay: document.getElementById('btn-play'),
  btnStop: document.getElementById('btn-stop'),
  btnFf: document.getElementById('btn-ff'),
  btnRw: document.getElementById('btn-rw'),
  btnFlip: document.getElementById('btn-flip'),
  btnToggleHiss: document.getElementById('btn-toggle-hiss'),
  btnToggleDolby: document.getElementById('btn-toggle-dolby'),
  dolbyLed: document.getElementById('dolby-led'),
  btnToggleAutoreverse: document.getElementById('btn-toggle-autoreverse'),
  autoreverseLed: document.getElementById('autoreverse-led'),
  btnShareCurrent: document.getElementById('btn-share-current'),
  btnResetCounter: document.getElementById('btn-reset-counter'),
  sliderVolume: document.getElementById('slider-volume'),
  sliderPitch: document.getElementById('slider-pitch'),
  pitchValDisplay: document.getElementById('pitch-val-display'),
  // Bay & Manual Spool Tool
  cassetteBaySection: document.getElementById('cassette-bay-section'),
  btnTogglePencil: document.getElementById('btn-toggle-pencil'),
  pencilToolText: document.getElementById('pencil-tool-text'),
  pencilCrankActor: document.getElementById('pencil-crank-actor'),
  // Display & Indicators
  vfdTrackSub: document.getElementById('vfd-track-sub'),
  vfdTrackTitle: document.getElementById('vfd-track-title'),
  ledPlay: document.getElementById('led-play'),
  ledDolby: document.getElementById('led-dolby'),
  ledEnd: document.getElementById('led-end'),
  counterDigits: [
    document.getElementById('counter-1'),
    document.getElementById('counter-2'),
    document.getElementById('counter-3')
  ],
  // VU Needles
  vuNeedleLeft: document.getElementById('vu-needle-left'),
  vuNeedleRight: document.getElementById('vu-needle-right'),
  // Cassette Housing & 3D Flipper
  cassetteFlipper: document.getElementById('cassette-flipper'),
  labelTitleA: document.getElementById('label-title-a'),
  labelFromA: document.getElementById('label-from-a'),
  labelTitleB: document.getElementById('label-title-b'),
  labelFromB: document.getElementById('label-from-b'),
  tapeStickerA: document.getElementById('tape-sticker-a'),
  tapeStickerB: document.getElementById('tape-sticker-b'),
  trackTagsA: document.getElementById('track-tags-a'),
  trackTagsB: document.getElementById('track-tags-b'),
  // Reels & Tape Packs
  spoolGearLeftA: document.getElementById('spool-gear-left-a'),
  spoolGearRightA: document.getElementById('spool-gear-right-a'),
  spoolGearLeftB: document.getElementById('spool-gear-left-b'),
  spoolGearRightB: document.getElementById('spool-gear-right-b'),
  tapePackLeftA: document.getElementById('tape-pack-left-a'),
  tapePackRightA: document.getElementById('tape-pack-right-a'),
  tapePackLeftB: document.getElementById('tape-pack-left-b'),
  tapePackRightB: document.getElementById('tape-pack-right-b'),
  // J-Card Insert
  jcardAccordion: document.getElementById('jcard-accordion'),
  jcardHeader: document.getElementById('jcard-header'),
  jcardListA: document.getElementById('jcard-list-a'),
  jcardListB: document.getElementById('jcard-list-b'),
  // Modals
  modalCreator: document.getElementById('modal-creator'),
  btnCloseCreator: document.getElementById('btn-close-creator'),
  formCreateTape: document.getElementById('form-create-tape'),
  colorPickerGrid: document.getElementById('color-picker-grid'),
  stickerPickerGrid: document.getElementById('sticker-picker-grid'),
  // Voice Memo Elements
  btnRecVoice: document.getElementById('btn-rec-voice'),
  recVoiceText: document.getElementById('rec-voice-text'),
  btnPreviewVoice: document.getElementById('btn-preview-voice'),
  btnClearVoice: document.getElementById('btn-clear-voice'),
  voiceTimer: document.getElementById('voice-timer'),
  // Share Modal
  modalShare: document.getElementById('modal-share'),
  btnCloseShare: document.getElementById('btn-close-share'),
  inputShareUrl: document.getElementById('input-share-url'),
  shareQrCanvas: document.getElementById('share-qr-canvas'),
  btnCopyUrl: document.getElementById('btn-copy-url'),
  btnShareWa: document.getElementById('btn-share-wa'),
  btnPlayNow: document.getElementById('btn-play-now'),
  // Tape Rack Archive Modal
  modalRack: document.getElementById('modal-rack'),
  btnCloseRack: document.getElementById('btn-close-rack'),
  rackShelfGrid: document.getElementById('rack-shelf-grid'),
  // Toast
  toastNotice: document.getElementById('toast-notice'),
  toastMsg: document.getElementById('toast-msg')
};

// Initialize State Machine
const deckMachine = new DeckStateMachine({
  onStateChange: (newState, prevState) => {
    handleDeckStateChange(newState, prevState);
  },
  onSideChange: (newSide) => {
    currentSide = newSide;
  }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
  console.log('[System] Initializing TapeDeck M-88 Precision Audio Controller...');

  // Setup Unified Audio Callbacks
  audioPlayerManager.setCallbacks({
    onPlay: () => {
      deckMachine.transitionTo(STATES.PLAYING);
    },
    onPause: () => {
      if (deckMachine.isPlaying()) {
        // Paused
      }
    },
    onEnded: () => {
      handleTrackEnded();
    },
    onError: (errCode) => {
      showToast('TRACK RESTRICTED: ADVANCING TO NEXT PROGRAM');
      handleTrackEnded();
    },
    onTrackTitle: (title) => {
      if (title && elements.vfdTrackTitle && !isPlayingVoiceIntro) {
        elements.vfdTrackTitle.textContent = title.toUpperCase();
      }
    }
  });

  // Initialize Audio & YouTube Container
  audioPlayerManager.init('yt-player-container');

  // Render initial mixtape UI & archive to rack
  renderColorPicker();
  renderStickerPicker();
  applyMixtapeData(currentMixtape);
  saveToTapeRack(currentMixtape);

  // Setup Event Listeners
  setupHardwareButtonListeners();
  setupMegaFeaturesListeners();
  setupModalListeners();
  setupJCardListeners();
  setupKeyboardShortcuts();
  setupVoiceRecorder();

  // Start continuous VU meter & tape ribbon update loops
  startVUMeterLoop();
  startTapeRibbonMonitor();

  // Restore saved atmosphere
  if (localStorage.getItem('dek_kaset_atmosphere') === 'night') {
    elements.body.classList.add('mode-midnight');
    elements.atmosphereText.textContent = 'LIGHTING: NIGHT';
  } else if (localStorage.getItem('dek_kaset_atmosphere') === 'studio') {
    elements.body.classList.remove('mode-midnight');
    elements.atmosphereText.textContent = 'LIGHTING: STUDIO';
  }

  // If URL had a mixtape parameter
  const urlMixtape = getMixtapeFromUrl();
  if (urlMixtape) {
    showToast(`TAPE LOADED: "${urlMixtape.t.toUpperCase()}"`);
  }
}

// ============================================================================
// MIXTAPE DATA RENDERING & THEMES
// ============================================================================

function applyMixtapeData(mixtape) {
  currentMixtape = mixtape;
  selectedColorTheme = mixtape.c || 'retro-orange';
  selectedSticker = mixtape.s || 'none';

  // Apply Theme CSS class to body
  const themeObj = COLOR_THEMES.find(t => t.id === selectedColorTheme) || COLOR_THEMES[0];
  COLOR_THEMES.forEach(t => elements.body.classList.remove(t.bodyClass));
  elements.body.classList.add(themeObj.bodyClass);

  // Update Cassette Labels on Front (Side A) & Back (Side B)
  elements.labelTitleA.textContent = mixtape.t || 'Mixtape Kaset';
  elements.labelFromA.textContent = mixtape.f ? `From: ${mixtape.f}` : 'TAPEDECK M-88 STEREO';

  elements.labelTitleB.textContent = mixtape.t || 'Mixtape Kaset';
  elements.labelFromB.textContent = mixtape.f ? `From: ${mixtape.f}` : 'TAPEDECK M-88 STEREO';

  // Apply Retro Stickers
  applyStickerBadge(selectedSticker);

  // Render Track tags on Cassette
  renderLabelTrackTags();

  // Render J-Card lists
  renderJCardLists();

  // Reset track index to 0
  currentTrackIndex = 0;
  updateTrackDisplay();
}

function applyStickerBadge(stickerId) {
  const sticker = RETRO_STICKERS.find(s => s.id === stickerId);
  if (sticker && sticker.text) {
    elements.tapeStickerA.textContent = sticker.text;
    elements.tapeStickerA.classList.add('active');
    elements.tapeStickerB.textContent = sticker.text;
    elements.tapeStickerB.classList.add('active');
  } else {
    elements.tapeStickerA.classList.remove('active');
    elements.tapeStickerB.classList.remove('active');
  }
}

function renderLabelTrackTags() {
  const tracksA = currentMixtape.a || [];
  const tracksB = currentMixtape.b || [];

  elements.trackTagsA.innerHTML = tracksA.map((id, idx) => `
    <span class="track-tag ${idx === currentTrackIndex && currentSide === 'A' ? 'current-tag' : ''}">
      ${idx + 1}. TRK ${idx + 1}
    </span>
  `).join('');

  elements.trackTagsB.innerHTML = tracksB.map((id, idx) => `
    <span class="track-tag ${idx === currentTrackIndex && currentSide === 'B' ? 'current-tag' : ''}">
      ${idx + 1}. TRK ${idx + 1}
    </span>
  `).join('');
}

function renderJCardLists() {
  const tracksA = currentMixtape.a || [];
  const tracksB = currentMixtape.b || [];

  elements.jcardListA.innerHTML = tracksA.length > 0 ? tracksA.map((raw, idx) => {
    const info = resolveTrackSource(raw);
    const badge = info.type === 'audio' ? 'MP3' : 'YT';
    return `
      <li class="jcard-track-item ${currentSide === 'A' && idx === currentTrackIndex ? 'active' : ''}" data-side="A" data-index="${idx}">
        <span><strong>A${idx + 1}.</strong> [${badge}] ${info.label.toUpperCase()}</span>
        <span>${currentSide === 'A' && idx === currentTrackIndex ? 'CURRENT' : 'SELECT'}</span>
      </li>
    `;
  }).join('') : '<li style="color:#64748b;font-size:0.75rem;">(NO PROGRAM RECORDED)</li>';

  elements.jcardListB.innerHTML = tracksB.length > 0 ? tracksB.map((raw, idx) => {
    const info = resolveTrackSource(raw);
    const badge = info.type === 'audio' ? 'MP3' : 'YT';
    return `
      <li class="jcard-track-item ${currentSide === 'B' && idx === currentTrackIndex ? 'active' : ''}" data-side="B" data-index="${idx}">
        <span><strong>B${idx + 1}.</strong> [${badge}] ${info.label.toUpperCase()}</span>
        <span>${currentSide === 'B' && idx === currentTrackIndex ? 'CURRENT' : 'SELECT'}</span>
      </li>
    `;
  }).join('') : '<li style="color:#64748b;font-size:0.75rem;">(NO PROGRAM RECORDED)</li>';
}

function getActiveSideTracks() {
  return currentSide === 'A' ? (currentMixtape.a || []) : (currentMixtape.b || []);
}

function updateTrackDisplay() {
  const tracks = getActiveSideTracks();
  const total = tracks.length;
  const rawTrack = tracks[currentTrackIndex];

  if (elements.vfdTrackSub) {
    elements.vfdTrackSub.textContent = `SIDE ${currentSide} • TRACK ${String(currentTrackIndex + 1).padStart(2, '0')}/${String(total).padStart(2, '0')} • AUTO-STOP READY`;
  }

  if (elements.vfdTrackTitle && !isPlayingVoiceIntro) {
    if (total === 0) {
      elements.vfdTrackTitle.textContent = '(PROGRAM EMPTY)';
    } else if (rawTrack) {
      const info = resolveTrackSource(rawTrack);
      elements.vfdTrackTitle.textContent = (info ? info.label : rawTrack).toUpperCase();
    }
  }

  renderLabelTrackTags();
  renderJCardLists();
}

// ============================================================================
// HARDWARE DECK STATE MACHINE CONTROLLER
// ============================================================================

function handleDeckStateChange(newState, prevState) {
  // Clear reel spin classes
  [
    elements.spoolGearLeftA, elements.spoolGearRightA,
    elements.spoolGearLeftB, elements.spoolGearRightB
  ].forEach(reel => {
    if (reel) reel.classList.remove('reel-playing', 'reel-ff', 'reel-rw');
  });

  switch (newState) {
    case STATES.IDLE:
      elements.btnPlay.classList.remove('active');
      elements.btnFf.classList.remove('active');
      elements.btnRw.classList.remove('active');
      elements.ledPlay.classList.remove('active');

      soundEngine.stopTapeHiss();
      soundEngine.stopTapeFf();
      stopCounter();
      break;

    case STATES.PLAYING:
      elements.btnPlay.classList.add('active');
      elements.btnFf.classList.remove('active');
      elements.btnRw.classList.remove('active');
      elements.ledPlay.classList.add('active');
      elements.ledEnd.classList.remove('blinking');

      // Spin spools at calibrated rate
      const spools = getSpoolsForSide(currentSide);
      const spinSpeed = (4.2 / currentPlaybackRate).toFixed(2);
      spools.forEach(reel => {
        if (reel) {
          reel.style.animationDuration = `${spinSpeed}s`;
          reel.classList.add('reel-playing');
        }
      });

      soundEngine.startTapeHiss();
      startCounter(1);
      break;

    case STATES.FAST_FORWARD:
      elements.btnFf.classList.add('active');
      elements.btnRw.classList.remove('active');
      getSpoolsForSide(currentSide).forEach(reel => {
        if (reel) {
          reel.style.animationDuration = '0.65s';
          reel.classList.add('reel-ff');
        }
      });
      soundEngine.playTapeFf();
      startCounter(5);
      break;

    case STATES.REWIND:
      elements.btnRw.classList.add('active');
      elements.btnFf.classList.remove('active');
      getSpoolsForSide(currentSide).forEach(reel => {
        if (reel) {
          reel.style.animationDuration = '0.65s';
          reel.classList.add('reel-rw');
        }
      });
      soundEngine.playTapeFf();
      startCounter(-5);
      break;

    case STATES.FLIPPING:
      elements.btnPlay.classList.remove('active');
      elements.btnFf.classList.remove('active');
      elements.btnRw.classList.remove('active');
      elements.ledPlay.classList.remove('active');
      elements.ledEnd.classList.remove('blinking');
      soundEngine.stopTapeHiss();
      stopCounter();
      break;
  }
}

function getSpoolsForSide(side) {
  return side === 'A'
    ? [elements.spoolGearLeftA, elements.spoolGearRightA]
    : [elements.spoolGearLeftB, elements.spoolGearRightB];
}

// ============================================================================
// HARDWARE BUTTON INTERACTION LOGIC
// ============================================================================

function setupHardwareButtonListeners() {
  // 1. PLAY BUTTON (Latching)
  elements.btnPlay.addEventListener('click', () => {
    soundEngine.playBtnDown();

    if (deckMachine.isPlaying()) {
      return;
    }

    const tracks = getActiveSideTracks();
    if (tracks.length === 0) {
      showToast(`SIDE ${currentSide} PROGRAM EMPTY: REVERSE TAPE`);
      return;
    }

    // Voice memo intro on Side A Track 0
    if (currentSide === 'A' && currentTrackIndex === 0 && currentMixtape.v && !isPlayingVoiceIntro) {
      playVoiceIntroThenMusic();
      return;
    }

    const rawTrack = tracks[currentTrackIndex];
    deckMachine.transitionTo(STATES.PLAYING);
    audioPlayerManager.loadTrack(resolveTrackSource(rawTrack), true);
  });

  // 2. STOP BUTTON (Spring Release Unlatch)
  elements.btnStop.addEventListener('click', () => {
    soundEngine.playBtnUp();
    deckMachine.transitionTo(STATES.IDLE);
    audioPlayerManager.pause();
    if (voiceIntroAudio) {
      voiceIntroAudio.pause();
      isPlayingVoiceIntro = false;
    }
  });

  // 3. FAST FORWARD (FF)
  elements.btnFf.addEventListener('click', () => {
    soundEngine.playBtnDown();
    const tracks = getActiveSideTracks();
    const wasPlaying = deckMachine.isPlaying();

    deckMachine.transitionTo(STATES.FAST_FORWARD);
    audioPlayerManager.mute();

    setTimeout(() => {
      soundEngine.stopTapeFf();
      audioPlayerManager.unMute();

      if (currentTrackIndex < tracks.length - 1) {
        currentTrackIndex++;
        updateTrackDisplay();
        if (wasPlaying) {
          deckMachine.transitionTo(STATES.PLAYING);
          audioPlayerManager.loadTrack(resolveTrackSource(tracks[currentTrackIndex]), true);
        } else {
          deckMachine.transitionTo(STATES.IDLE);
        }
      } else {
        if (wasPlaying) {
          audioPlayerManager.seekBy(30);
          deckMachine.transitionTo(STATES.PLAYING);
        } else {
          deckMachine.transitionTo(STATES.IDLE);
        }
      }
    }, 1400);
  });

  // 4. REWIND (RW)
  elements.btnRw.addEventListener('click', () => {
    soundEngine.playBtnDown();
    const tracks = getActiveSideTracks();
    const wasPlaying = deckMachine.isPlaying();

    deckMachine.transitionTo(STATES.REWIND);
    audioPlayerManager.mute();

    setTimeout(() => {
      soundEngine.stopTapeFf();
      audioPlayerManager.unMute();

      const currentTime = audioPlayerManager.getCurrentTime();
      if (currentTime > 6) {
        audioPlayerManager.seekTo(0);
      } else if (currentTrackIndex > 0) {
        currentTrackIndex--;
        updateTrackDisplay();
        if (wasPlaying) {
          audioPlayerManager.loadTrack(resolveTrackSource(tracks[currentTrackIndex]), true);
        }
      } else {
        audioPlayerManager.seekTo(0);
      }

      if (wasPlaying) {
        deckMachine.transitionTo(STATES.PLAYING);
      } else {
        deckMachine.transitionTo(STATES.IDLE);
      }
    }, 1400);
  });

  // 5. FLIP CASSETTE BUTTON
  elements.btnFlip.addEventListener('click', () => {
    if (deckMachine.isFlipping()) return;

    if (deckMachine.isPlaying()) {
      soundEngine.playBtnUp();
      audioPlayerManager.pause();
    }

    soundEngine.playTapeFlip();
    deckMachine.transitionTo(STATES.FLIPPING);

    const willBeSideB = currentSide === 'A';

    if (willBeSideB) {
      elements.cassetteFlipper.classList.remove('flipping-anim-reverse');
      elements.cassetteFlipper.classList.add('flipping-anim');
      setTimeout(() => {
        elements.cassetteFlipper.classList.add('flipped');
        elements.cassetteFlipper.classList.remove('flipping-anim');
      }, 1200);
    } else {
      elements.cassetteFlipper.classList.remove('flipping-anim');
      elements.cassetteFlipper.classList.add('flipping-anim-reverse');
      setTimeout(() => {
        elements.cassetteFlipper.classList.remove('flipped');
        elements.cassetteFlipper.classList.remove('flipping-anim-reverse');
      }, 1200);
    }

    setTimeout(() => {
      deckMachine.toggleSide();
      currentTrackIndex = 0;
      updateTrackDisplay();
      showToast(`TAPE REVERSED: NOW ON SIDE ${currentSide}`);
    }, 600);

    setTimeout(() => {
      deckMachine.transitionTo(STATES.IDLE);
    }, 1250);
  });

  // Hiss Noise Toggle
  elements.btnToggleHiss.addEventListener('click', () => {
    isHissMuted = soundEngine.toggleMute();
    if (isHissMuted) {
      elements.btnToggleHiss.classList.remove('active');
      showToast('TAPE HISS: DISABLED');
    } else {
      elements.btnToggleHiss.classList.add('active');
      if (deckMachine.isPlaying()) {
        soundEngine.startTapeHiss();
      }
      showToast('TAPE HISS: ACTIVE');
    }
  });

  // Share Current Tape Button in Deck
  elements.btnShareCurrent.addEventListener('click', () => {
    openShareModal(currentMixtape);
  });

  // Counter Reset Button
  elements.btnResetCounter.addEventListener('click', () => {
    soundEngine.playBtnUp();
    counterValue = 0;
    renderCounter();
    showToast('INDEX COUNTER RESET TO 000');
  });

  // Master Volume Slider
  elements.sliderVolume.addEventListener('input', (e) => {
    const vol = parseInt(e.target.value, 10);
    audioPlayerManager.setVolume(vol);
  });
}

// ============================================================================
// HARDWARE SWITCHES: LIGHTING, MANUAL SPOOL, PITCH, DOLBY, AUTO-REVERSE
// ============================================================================

function setupMegaFeaturesListeners() {
  // 1. Atmosphere Lighting Mode
  elements.btnToggleAtmosphere.addEventListener('click', () => {
    soundEngine.playBtnDown();
    const isMidnight = elements.body.classList.toggle('mode-midnight');
    if (isMidnight) {
      elements.atmosphereText.textContent = 'LIGHTING: NIGHT';
      localStorage.setItem('dek_kaset_atmosphere', 'night');
      showToast('WARM DESK ILLUMINATION ENGAGED');
    } else {
      elements.atmosphereText.textContent = 'LIGHTING: STUDIO';
      localStorage.setItem('dek_kaset_atmosphere', 'studio');
      showToast('PRECISION STUDIO LIGHTING ENGAGED');
    }
  });

  // 2. Manual Spooling Tool (Pencil Mode)
  elements.btnTogglePencil.addEventListener('click', () => {
    soundEngine.playBtnDown();
    isPencilMode = !isPencilMode;
    if (isPencilMode) {
      elements.btnTogglePencil.classList.add('active');
      elements.pencilToolText.textContent = 'DISENGAGE';
      elements.cassetteBaySection.classList.add('pencil-mode-active');
      if (elements.pencilCrankActor) {
        elements.pencilCrankActor.style.display = 'block';
        elements.pencilCrankActor.classList.remove('target-right');
      }
      showToast('MANUAL SPOOL ENGAGED // CLICK HUB TO WIND PENCIL');
    } else {
      elements.btnTogglePencil.classList.remove('active');
      elements.pencilToolText.textContent = 'MANUAL SPOOL';
      elements.cassetteBaySection.classList.remove('pencil-mode-active');
      if (elements.pencilCrankActor) {
        elements.pencilCrankActor.style.display = 'none';
        elements.pencilCrankActor.classList.remove('cranking', 'cranking-rev');
      }
      showToast('MANUAL SPOOL DISENGAGED');
    }
  });

  // Gear Click & Hold Manual Spooling with Animated Pencil Crank
  let crankTimer = null;
  let holdTimeout = null;
  let holdInterval = null;

  const triggerPencilCrank = (isRightSpool) => {
    if (!isPencilMode) {
      isPencilMode = true;
      elements.btnTogglePencil.classList.add('active');
      elements.pencilToolText.textContent = 'DISENGAGE';
      elements.cassetteBaySection.classList.add('pencil-mode-active');
      if (elements.pencilCrankActor) {
        elements.pencilCrankActor.style.display = 'block';
      }
    }
    soundEngine.playPencilRatchet();

    if (elements.pencilCrankActor) {
      if (isRightSpool) {
        elements.pencilCrankActor.classList.add('target-right');
        elements.pencilCrankActor.classList.add('cranking');
        elements.pencilCrankActor.classList.remove('cranking-rev');
        counterValue = (counterValue + 2) % 1000;
        renderCounter();
        audioPlayerManager.seekBy(3);
        showToast('MANUAL SPOOL: ADVANCING TAKE-UP HUB');
      } else {
        elements.pencilCrankActor.classList.remove('target-right');
        elements.pencilCrankActor.classList.add('cranking-rev');
        elements.pencilCrankActor.classList.remove('cranking');
        counterValue = Math.max(0, counterValue - 2);
        renderCounter();
        audioPlayerManager.seekBy(-3);
        showToast('MANUAL SPOOL: REWINDING SUPPLY HUB');
      }

      if (crankTimer) clearTimeout(crankTimer);
      crankTimer = setTimeout(() => {
        if (!holdInterval) {
          elements.pencilCrankActor.classList.remove('cranking', 'cranking-rev');
        }
      }, 350);
    }
  };

  const startHoldCrank = (isRightSpool) => {
    triggerPencilCrank(isRightSpool);
    if (holdTimeout) clearTimeout(holdTimeout);
    if (holdInterval) clearInterval(holdInterval);

    holdTimeout = setTimeout(() => {
      holdInterval = setInterval(() => {
        triggerPencilCrank(isRightSpool);
      }, 160);
    }, 250);
  };

  const stopHoldCrank = () => {
    if (holdTimeout) clearTimeout(holdTimeout);
    if (holdInterval) clearInterval(holdInterval);
    holdTimeout = null;
    holdInterval = null;
    if (elements.pencilCrankActor) {
      setTimeout(() => {
        elements.pencilCrankActor.classList.remove('cranking', 'cranking-rev');
      }, 100);
    }
  };

  [elements.spoolGearLeftA, elements.spoolGearLeftB].forEach(gear => {
    if (!gear) return;
    gear.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      startHoldCrank(false);
    });
    gear.addEventListener('pointerup', stopHoldCrank);
    gear.addEventListener('pointerleave', stopHoldCrank);
    gear.addEventListener('pointercancel', stopHoldCrank);
  });

  [elements.spoolGearRightA, elements.spoolGearRightB].forEach(gear => {
    if (!gear) return;
    gear.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      startHoldCrank(true);
    });
    gear.addEventListener('pointerup', stopHoldCrank);
    gear.addEventListener('pointerleave', stopHoldCrank);
    gear.addEventListener('pointercancel', stopHoldCrank);
  });

  // 3. Precision Pitch Dial
  elements.sliderPitch.addEventListener('input', (e) => {
    const rate = parseFloat(e.target.value);
    currentPlaybackRate = rate;
    audioPlayerManager.setPlaybackRate(rate);
    elements.pitchValDisplay.textContent = `${rate.toFixed(2)}x`;

    const spinSpeed = (4.2 / rate).toFixed(2);
    getSpoolsForSide(currentSide).forEach(reel => {
      if (reel) reel.style.animationDuration = `${spinSpeed}s`;
    });
  });

  // 4. Dolby Noise Reduction Switch
  elements.btnToggleDolby.addEventListener('click', () => {
    soundEngine.playBtnDown();
    isDolbyActive = !isDolbyActive;
    soundEngine.setDolby(isDolbyActive);
    if (isDolbyActive) {
      elements.dolbyLed.classList.add('active');
      elements.ledDolby.classList.add('active');
      elements.btnToggleDolby.classList.add('active');
      showToast('DOLBY B-C NR: ACTIVE');
    } else {
      elements.dolbyLed.classList.remove('active');
      elements.ledDolby.classList.remove('active');
      elements.btnToggleDolby.classList.remove('active');
      showToast('DOLBY B-C NR: BYPASS');
    }
  });

  // 5. Auto-Reverse Switch
  elements.btnToggleAutoreverse.addEventListener('click', () => {
    soundEngine.playBtnDown();
    isAutoReverse = !isAutoReverse;
    if (isAutoReverse) {
      elements.autoreverseLed.classList.add('active');
      elements.btnToggleAutoreverse.classList.add('active');
      showToast('AUTO-REVERSE: ENGAGED');
    } else {
      elements.autoreverseLed.classList.remove('active');
      elements.btnToggleAutoreverse.classList.remove('active');
      showToast('AUTO-REVERSE: OFF');
    }
  });

  // 6. Tape Rack Archive
  elements.btnOpenRack.addEventListener('click', () => {
    soundEngine.playBtnDown();
    renderTapeRackModal();
    elements.modalRack.classList.add('active');
  });

  elements.btnCloseRack.addEventListener('click', () => {
    soundEngine.playBtnUp();
    elements.modalRack.classList.remove('active');
  });
}

function renderTapeRackModal() {
  const rack = getTapeRack();
  if (rack.length === 0) {
    elements.rackShelfGrid.innerHTML = `
      <p style="grid-column: 1 / -1; color: #64748b; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; text-align: center; padding: 24px;">
        NO TAPES FOUND IN LOCAL ARCHIVE.
      </p>
    `;
    return;
  }

  elements.rackShelfGrid.innerHTML = rack.map((tape, idx) => {
    const theme = COLOR_THEMES.find(t => t.id === tape.c) || COLOR_THEMES[0];
    return `
      <div class="rack-tape-card" style="border-left-color: ${theme.bg};">
        <div class="rack-tape-info">
          <div class="rack-tape-title font-marker">${tape.t || 'Mixtape Kaset'}</div>
          <div class="rack-tape-meta">${tape.f ? `From: ${tape.f}` : 'TAPEDECK'} • ${tape.savedAt || ''}</div>
        </div>
        <div class="rack-tape-actions">
          <button class="btn-rack-play" data-idx="${idx}">LOAD</button>
          <button class="btn-rack-delete" data-idx="${idx}" title="Delete">&times;</button>
        </div>
      </div>
    `;
  }).join('');

  elements.rackShelfGrid.querySelectorAll('.btn-rack-play').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      const tape = rack[idx];
      if (tape) {
        soundEngine.playTapeFlip();
        applyMixtapeData(tape);
        elements.modalRack.classList.remove('active');

        const shareUrl = getShareUrl(tape);
        window.history.pushState({}, '', shareUrl);

        showToast(`LOADED TAPE: "${tape.t.toUpperCase()}"`);
        deckMachine.transitionTo(STATES.PLAYING);
        const tracks = getActiveSideTracks();
        if (tracks[0]) {
          audioPlayerManager.loadTrack(resolveTrackSource(tracks[0]), true);
        }
      }
    });
  });

  elements.rackShelfGrid.querySelectorAll('.btn-rack-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      removeFromTapeRack(idx);
      renderTapeRackModal();
      showToast('TAPE PURGED FROM ARCHIVE');
    });
  });
}

// ============================================================================
// VOICE NOTE MEMO RECORDER
// ============================================================================

let voiceIntroAudio = null;

function setupVoiceRecorder() {
  let isRecording = false;
  let recordSeconds = 0;

  elements.btnRecVoice.addEventListener('click', async () => {
    soundEngine.playBtnDown();
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunks, { type: 'audio/webm' });
          recordedVoiceBlob = blob;

          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            recordedVoiceDataUri = reader.result;
            elements.btnPreviewVoice.style.display = 'inline-flex';
            elements.btnClearVoice.style.display = 'inline-flex';
            showToast('VOICE MEMO RECORDED');
          };
        };

        mediaRecorder.start();
        isRecording = true;
        recordSeconds = 0;
        elements.recVoiceText.textContent = 'STOP REC';

        voiceTimerInterval = setInterval(() => {
          recordSeconds++;
          const mins = String(Math.floor(recordSeconds / 60)).padStart(2, '0');
          const secs = String(recordSeconds % 60).padStart(2, '0');
          elements.voiceTimer.textContent = `${mins}:${secs}`;
          if (recordSeconds >= 15) {
            elements.btnRecVoice.click();
          }
        }, 1000);

      } catch (err) {
        alert('Microphone access denied or unavailable.');
      }
    } else {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      isRecording = false;
      clearInterval(voiceTimerInterval);
      elements.recVoiceText.textContent = 'RE-RECORD';
    }
  });

  elements.btnPreviewVoice.addEventListener('click', () => {
    soundEngine.playBtnDown();
    if (recordedVoiceDataUri) {
      const audio = new Audio(recordedVoiceDataUri);
      audio.play();
    }
  });

  elements.btnClearVoice.addEventListener('click', () => {
    soundEngine.playBtnUp();
    recordedVoiceBlob = null;
    recordedVoiceDataUri = null;
    elements.btnPreviewVoice.style.display = 'none';
    elements.btnClearVoice.style.display = 'none';
    elements.voiceTimer.textContent = '00:00';
    elements.recVoiceText.textContent = 'RECORD MEMO';
    showToast('VOICE MEMO DELETED');
  });
}

function playVoiceIntroThenMusic() {
  if (!currentMixtape.v) return;
  isPlayingVoiceIntro = true;
  deckMachine.transitionTo(STATES.PLAYING);
  elements.vfdTrackTitle.textContent = `[VOICE MEMO: ${currentMixtape.f ? currentMixtape.f.toUpperCase() : 'SENDER'}]`;

  voiceIntroAudio = new Audio(currentMixtape.v);
  voiceIntroAudio.play();
  showToast('PLAYING VOICE MEMO INTRO');

  voiceIntroAudio.onended = () => {
    isPlayingVoiceIntro = false;
    const tracks = getActiveSideTracks();
    if (tracks[0]) {
      updateTrackDisplay();
      audioPlayerManager.loadTrack(resolveTrackSource(tracks[0]), true);
    }
  };
}

// ============================================================================
// RETRO STICKERS PICKER
// ============================================================================

function renderStickerPicker() {
  elements.stickerPickerGrid.innerHTML = RETRO_STICKERS.map(s => `
    <div class="sticker-option-chip ${s.id === selectedSticker ? 'selected' : ''}" data-sticker="${s.id}">
      ${s.label}
    </div>
  `).join('');

  elements.stickerPickerGrid.querySelectorAll('.sticker-option-chip').forEach(el => {
    el.addEventListener('click', () => {
      soundEngine.playBtnDown();
      selectedSticker = el.getAttribute('data-sticker');
      elements.stickerPickerGrid.querySelectorAll('.sticker-option-chip').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
}

// ============================================================================
// AUTO-STOP & AUTO-REVERSE LOGIC
// ============================================================================

function handleTrackEnded() {
  const tracks = getActiveSideTracks();

  if (currentTrackIndex < tracks.length - 1) {
    currentTrackIndex++;
    updateTrackDisplay();
    showToast(`ADVANCING TO TRACK ${currentTrackIndex + 1}`);
    audioPlayerManager.loadTrack(resolveTrackSource(tracks[currentTrackIndex]), true);
  } else {
    // End of side reached
    console.log('[Deck] Photo-electric auto-stop triggered on side', currentSide);

    if (isAutoReverse && currentSide === 'A') {
      showToast('AUTO-REVERSE ENGAGED: REVERSING TAPE TO SIDE B');
      elements.btnFlip.click();
      setTimeout(() => {
        const sideBTracks = currentMixtape.b || [];
        if (sideBTracks.length > 0) {
          deckMachine.transitionTo(STATES.PLAYING);
          audioPlayerManager.loadTrack(resolveTrackSource(sideBTracks[0]), true);
        }
      }, 1500);
      return;
    }

    // MECHANICAL AUTO-STOP
    soundEngine.playBtnUp();
    deckMachine.transitionTo(STATES.IDLE);
    audioPlayerManager.pause();

    elements.ledEnd.classList.add('blinking');

    if (elements.vfdTrackTitle) {
      elements.vfdTrackTitle.textContent = `TAPE END: REVERSE TO SIDE ${currentSide === 'A' ? 'B' : 'A'}`;
    }

    showToast(`END OF TAPE // ENGAGE FLIP TO SIDE ${currentSide === 'A' ? 'B' : 'A'}`);
  }
}

// ============================================================================
// DYNAMIC TAPE RIBBON THICKNESS MONITOR
// ============================================================================

function startTapeRibbonMonitor() {
  tapeMonitorInterval = setInterval(() => {
    const tracks = getActiveSideTracks();
    const totalTracks = Math.max(1, tracks.length);
    const duration = audioPlayerManager.getDuration() || 180;
    const currentTime = audioPlayerManager.getCurrentTime() || 0;

    const trackProgress = Math.min(1, Math.max(0, currentTime / duration));
    const sideProgress = (currentTrackIndex + trackProgress) / totalTracks;

    const minD = 32;
    const maxD = 68;
    const leftDiameter = Math.round(maxD - sideProgress * (maxD - minD));
    const rightDiameter = Math.round(minD + sideProgress * (maxD - minD));

    if (currentSide === 'A') {
      if (elements.tapePackLeftA) {
        elements.tapePackLeftA.style.width = `${leftDiameter}px`;
        elements.tapePackLeftA.style.height = `${leftDiameter}px`;
      }
      if (elements.tapePackRightA) {
        elements.tapePackRightA.style.width = `${rightDiameter}px`;
        elements.tapePackRightA.style.height = `${rightDiameter}px`;
      }
    } else {
      if (elements.tapePackLeftB) {
        elements.tapePackLeftB.style.width = `${leftDiameter}px`;
        elements.tapePackLeftB.style.height = `${leftDiameter}px`;
      }
      if (elements.tapePackRightB) {
        elements.tapePackRightB.style.width = `${rightDiameter}px`;
        elements.tapePackRightB.style.height = `${rightDiameter}px`;
      }
    }
  }, 350);
}

// ============================================================================
// ANALOG VU METERS BALLISTICS
// ============================================================================

let vuL = -35;
let vuR = -35;
let vuTargetL = -35;
let vuTargetR = -35;

function startVUMeterLoop() {
  function updateVU() {
    if (deckMachine.isPlaying()) {
      const realLevels = audioPlayerManager.getRealAudioLevels();
      if (realLevels && (realLevels.left > 0.01 || realLevels.right > 0.01)) {
        vuTargetL = -35 + Math.min(48, realLevels.left * 58);
        vuTargetR = -35 + Math.min(48, realLevels.right * 58);
      } else {
        const time = Date.now() * 0.005;
        const beat1 = Math.sin(time * 2.2);
        const beat2 = Math.cos(time * 4.7);
        const noise = (Math.random() - 0.5) * 12;

        vuTargetL = -12 + (beat1 * 14) + noise;
        vuTargetR = -12 + (beat2 * 14) + (noise * 0.8);
      }
    } else {
      vuTargetL = -35;
      vuTargetR = -35;
    }

    vuL += (vuTargetL - vuL) * 0.35;
    vuR += (vuTargetR - vuR) * 0.35;

    if (elements.vuNeedleLeft) {
      elements.vuNeedleLeft.style.transform = `rotate(${vuL.toFixed(1)}deg)`;
    }
    if (elements.vuNeedleRight) {
      elements.vuNeedleRight.style.transform = `rotate(${vuR.toFixed(1)}deg)`;
    }

    vuAnimationId = requestAnimationFrame(updateVU);
  }

  vuAnimationId = requestAnimationFrame(updateVU);
}

// ============================================================================
// MECHANICAL COUNTER
// ============================================================================

function startCounter(speed = 1) {
  stopCounter();
  counterInterval = setInterval(() => {
    counterValue = (counterValue + speed + 1000) % 1000;
    renderCounter();
  }, speed > 1 || speed < 0 ? 120 : 1000);
}

function stopCounter() {
  if (counterInterval) {
    clearInterval(counterInterval);
    counterInterval = null;
  }
}

function renderCounter() {
  const str = String(counterValue).padStart(3, '0');
  elements.counterDigits[0].textContent = str[0];
  elements.counterDigits[1].textContent = str[1];
  elements.counterDigits[2].textContent = str[2];
}

// ============================================================================
// J-CARD INTERACTION
// ============================================================================

function setupJCardListeners() {
  elements.jcardHeader.addEventListener('click', () => {
    soundEngine.playBtnDown();
    elements.jcardAccordion.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    const item = e.target.closest('.jcard-track-item');
    if (!item) return;

    const side = item.getAttribute('data-side');
    const index = parseInt(item.getAttribute('data-index'), 10);

    if (side !== currentSide) {
      showToast(`TRACK LOCATED ON SIDE ${side} // REVERSE FIRST`);
      return;
    }

    soundEngine.playBtnDown();
    currentTrackIndex = index;
    updateTrackDisplay();

    const tracks = getActiveSideTracks();
    if (tracks[currentTrackIndex]) {
      deckMachine.transitionTo(STATES.PLAYING);
      audioPlayerManager.loadTrack(resolveTrackSource(tracks[currentTrackIndex]), true);
    }
  });
}

// ============================================================================
// KEYBOARD SHORTCUTS CONTROLLER
// ============================================================================

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

    soundEngine.initAudioContext();

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (deckMachine.isPlaying()) {
          elements.btnStop.click();
        } else {
          elements.btnPlay.click();
        }
        break;
      case 'KeyF':
      case 'ArrowRight':
        e.preventDefault();
        elements.btnFf.click();
        break;
      case 'KeyR':
      case 'ArrowLeft':
        e.preventDefault();
        elements.btnRw.click();
        break;
      case 'KeyS':
        e.preventDefault();
        elements.btnStop.click();
        break;
      case 'KeyX':
      case 'KeyB':
        e.preventDefault();
        elements.btnFlip.click();
        break;
      case 'KeyM':
        e.preventDefault();
        elements.btnToggleHiss.click();
        break;
      case 'KeyN':
        e.preventDefault();
        elements.btnOpenCreator.click();
        break;
      case 'KeyC':
        e.preventDefault();
        elements.btnResetCounter.click();
        break;
      case 'KeyP':
        e.preventDefault();
        elements.btnTogglePencil.click();
        break;
    }
  });
}

// ============================================================================
// MIXTAPE CREATOR STUDIO & COLOR PICKER
// ============================================================================

function renderColorPicker() {
  elements.colorPickerGrid.innerHTML = COLOR_THEMES.map(theme => `
    <div class="color-option ${theme.id === selectedColorTheme ? 'selected' : ''}" data-theme="${theme.id}">
      <div class="color-dot" style="background: ${theme.bg};"></div>
      <span class="color-name">${theme.name.toUpperCase()}</span>
    </div>
  `).join('');

  elements.colorPickerGrid.querySelectorAll('.color-option').forEach(el => {
    el.addEventListener('click', () => {
      soundEngine.playBtnDown();
      selectedColorTheme = el.getAttribute('data-theme');
      elements.colorPickerGrid.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
}

function setupModalListeners() {
  // Open Creator Modal
  elements.btnOpenCreator.addEventListener('click', () => {
    soundEngine.playBtnDown();
    if (deckMachine.isPlaying()) {
      deckMachine.transitionTo(STATES.IDLE);
      audioPlayerManager.pause();
    }
    elements.modalCreator.classList.add('active');
  });

  // Close Creator Modal
  elements.btnCloseCreator.addEventListener('click', () => {
    soundEngine.playBtnUp();
    elements.modalCreator.classList.remove('active');
  });

  // Close Share Modal
  elements.btnCloseShare.addEventListener('click', () => {
    soundEngine.playBtnUp();
    elements.modalShare.classList.remove('active');
  });

  // Form Submit: Record Tape
  elements.formCreateTape.addEventListener('submit', (e) => {
    e.preventDefault();
    soundEngine.playBtnDown();

    const title = document.getElementById('input-tape-title').value.trim() || 'Mixtape Kaset';
    const fromNote = document.getElementById('input-tape-from').value.trim() || '';

    const rawA = [
      document.getElementById('track-a-1').value,
      document.getElementById('track-a-2').value,
      document.getElementById('track-a-3').value
    ];
    const tracksA = rawA.map(parseTrackInput).filter(Boolean);

    const rawB = [
      document.getElementById('track-b-1').value,
      document.getElementById('track-b-2').value,
      document.getElementById('track-b-3').value
    ];
    const tracksB = rawB.map(parseTrackInput).filter(Boolean);

    if (tracksA.length === 0 && tracksB.length === 0) {
      alert('ENTER AT LEAST ONE VALID AUDIO SOURCE (YOUTUBE OR MP3 LINK) ON SIDE A OR SIDE B.');
      return;
    }

    const newMixtape = {
      t: title,
      f: fromNote,
      c: selectedColorTheme,
      s: selectedSticker,
      v: recordedVoiceDataUri || undefined,
      a: tracksA,
      b: tracksB
    };

    saveToTapeRack(newMixtape);
    elements.modalCreator.classList.remove('active');
    openShareModal(newMixtape);
  });

  // Copy Share Link Button
  elements.btnCopyUrl.addEventListener('click', () => {
    soundEngine.playBtnDown();
    const url = elements.inputShareUrl.value;
    navigator.clipboard.writeText(url).then(() => {
      showToast('LINK COPIED TO CLIPBOARD');
    }).catch(() => {
      elements.inputShareUrl.select();
      document.execCommand('copy');
      showToast('LINK COPIED');
    });
  });

  // "Insert & Play in Deck" button
  elements.btnPlayNow.addEventListener('click', () => {
    soundEngine.playBtnDown();
    elements.modalShare.classList.remove('active');

    const shareUrl = elements.inputShareUrl.value;
    window.history.pushState({}, '', shareUrl);

    applyMixtapeData(currentMixtape);
    deckMachine.transitionTo(STATES.PLAYING);
    const tracks = getActiveSideTracks();
    if (tracks[0]) {
      audioPlayerManager.loadTrack(resolveTrackSource(tracks[0]), true);
    }
  });
}

function openShareModal(mixtape) {
  currentMixtape = mixtape;
  const shareUrl = getShareUrl(mixtape);
  elements.inputShareUrl.value = shareUrl;

  const waText = encodeURIComponent(`Listen to this tape mixtape on TapeDeck M-88: "${mixtape.t}"\n${shareUrl}`);
  elements.btnShareWa.href = `https://api.whatsapp.com/send?text=${waText}`;

  QRCode.toCanvas(elements.shareQrCanvas, shareUrl, {
    width: 170,
    margin: 1,
    color: {
      dark: '#1e293b',
      light: '#ffffff'
    }
  }, (error) => {
    if (error) console.error('QR Code error:', error);
  });

  elements.modalShare.classList.add('active');
}

// ============================================================================
// TOAST NOTIFICATION UTILITY (MINIMALIST INDUSTRIAL STATUS)
// ============================================================================

let toastTimeout = null;
function showToast(msg) {
  if (toastTimeout) clearTimeout(toastTimeout);

  elements.toastMsg.textContent = msg;
  elements.toastNotice.classList.add('show');

  toastTimeout = setTimeout(() => {
    elements.toastNotice.classList.remove('show');
  }, 2800);
}

// Start application
window.addEventListener('DOMContentLoaded', init);
