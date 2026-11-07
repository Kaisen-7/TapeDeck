// Cassette Deck State Machine

export const STATES = {
  IDLE: 'IDLE',
  PLAYING: 'PLAYING',
  FAST_FORWARD: 'FAST_FORWARD',
  REWIND: 'REWIND',
  FLIPPING: 'FLIPPING'
};

export class DeckStateMachine {
  constructor(callbacks = {}) {
    this.currentState = STATES.IDLE;
    this.activeSide = 'A'; // 'A' or 'B'
    this.callbacks = callbacks;
    // callbacks: onStateChange(newState, prevState), onSideChange(newSide)
  }

  getState() {
    return this.currentState;
  }

  getActiveSide() {
    return this.activeSide;
  }

  transitionTo(newState, meta = {}) {
    const prev = this.currentState;
    if (prev === newState) return false;

    console.log(`[Deck State Machine] ${prev} -> ${newState}`, meta);
    this.currentState = newState;

    if (typeof this.callbacks.onStateChange === 'function') {
      this.callbacks.onStateChange(newState, prev, meta);
    }
    return true;
  }

  setSide(side) {
    if (side !== 'A' && side !== 'B') return;
    this.activeSide = side;
    if (typeof this.callbacks.onSideChange === 'function') {
      this.callbacks.onSideChange(side);
    }
  }

  toggleSide() {
    const newSide = this.activeSide === 'A' ? 'B' : 'A';
    this.setSide(newSide);
    return newSide;
  }

  isIdle() {
    return this.currentState === STATES.IDLE;
  }

  isPlaying() {
    return this.currentState === STATES.PLAYING;
  }

  isFastForward() {
    return this.currentState === STATES.FAST_FORWARD;
  }

  isRewind() {
    return this.currentState === STATES.REWIND;
  }

  isFlipping() {
    return this.currentState === STATES.FLIPPING;
  }
}
