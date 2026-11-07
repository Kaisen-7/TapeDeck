// Mixtape Data Schema, URL Encoder/Decoder, and Default Mixtapes

export const DEFAULT_MIXTAPE = {
  t: "Midnight Lofi Beats",
  f: "Untuk Kamu yang Begadang",
  c: "retro-orange",
  a: [
    "jfKfPfyJRdk", // lofi hip hop radio - beats to relax/study to
    "5qap5aO4i9A", // Lofi hip hop radio - beats to sleep/chill to
    "DWcJFNfaw9c"  // In Love With A Ghost - Flowers
  ],
  b: [
    "rUxyKA_-grg", // Synthwave Radio - chill synth / retro beats
    "4xDzrJKXOOY"  // Synthwave radio - beats to chill/game to
  ]
};

export const RETRO_STICKERS = [
  { id: 'none', label: 'Tanpa Stiker', text: '' },
  { id: 'vol1', label: '⭐ Mix Vol. 1', text: '⭐ MIX VOL. 1' },
  { id: 'foryou', label: '❤️ For You', text: '❤️ FOR YOU' },
  { id: 'donoterase', label: '🚫 Do Not Erase', text: '🚫 DO NOT ERASE' },
  { id: 'latenight', label: '🌙 Late Night', text: '🌙 LATE NIGHT' },
  { id: 'besthits', label: '🔥 Best Hits', text: '🔥 BEST HITS' },
  { id: 'nostalgia', label: '📼 90s Memories', text: '📼 90s MEMORIES' }
];

export const COLOR_THEMES = [
  { id: 'retro-orange', name: 'Retro Orange', bg: '#f97316', label: '#ffedd5', bodyClass: 'theme-retro-orange' },
  { id: 'clear-black', name: 'Smoked Clear', bg: '#18181b', label: '#e4e4e7', bodyClass: 'theme-clear-black' },
  { id: 'pastel-blue', name: 'Pastel Sky', bg: '#38bdf8', label: '#f0f9ff', bodyClass: 'theme-pastel-blue' },
  { id: 'cyber-neon', name: 'Cyber Neon', bg: '#a855f7', label: '#fae8ff', bodyClass: 'theme-cyber-neon' },
  { id: 'vintage-ivory', name: 'Vintage Ivory', bg: '#d6d3d1', label: '#fef08a', bodyClass: 'theme-vintage-ivory' },
  { id: 'blood-red', name: 'Crimson Rock', bg: '#dc2626', label: '#fee2e2', bodyClass: 'theme-blood-red' }
];

/**
 * Extracts standard 11-character YouTube Video ID from any URL or string
 */
export function extractYouTubeId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();

  // If already 11 alphanumeric/dash/underscore chars
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex for YouTube URLs (watch?v=, youtu.be/, embed/, shorts/)
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regex);
  return match ? match[1] : null;
}

/**
 * Universal track input parser: supports YouTube and direct audio files (.mp3, .wav, .ogg, etc.)
 */
export function parseTrackInput(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();

  // 1. Check if it's YouTube
  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    return ytId; // Store compact 11-char ID for YouTube
  }

  // 2. Check if it's a direct URL to an audio file or stream (http/https)
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed; // Store the full audio link
  }

  return null;
}

/**
 * Resolves stored track identifier to player instructions: { type: 'youtube' | 'audio', src: string, label: string }
 */
export function resolveTrackSource(trackString) {
  if (!trackString || typeof trackString !== 'string') return null;
  const trimmed = trackString.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    // Direct audio URL
    let label = 'Direct Audio';
    try {
      const pathname = new URL(trimmed).pathname;
      const file = pathname.split('/').pop();
      if (file) {
        label = decodeURIComponent(file).replace(/\.[^/.]+$/, "");
      }
    } catch {}
    return {
      type: 'audio',
      src: trimmed,
      label: label.substring(0, 30)
    };
  }

  // YouTube 11-character ID
  return {
    type: 'youtube',
    src: trimmed,
    label: `YouTube [${trimmed}]`
  };
}

/**
 * Encodes a mixtape object to a URL-safe Base64 string
 */
export function encodeMixtape(data) {
  try {
    const compactData = {
      t: (data.t || 'Mixtape Kaset').substring(0, 32),
      f: (data.f || '').substring(0, 40),
      c: data.c || 'retro-orange',
      s: data.s || 'none', // sticker id
      v: data.v ? String(data.v) : undefined, // optional voice intro
      a: (data.a || []).filter(Boolean).slice(0, 3),
      b: (data.b || []).filter(Boolean).slice(0, 3)
    };
    const jsonString = JSON.stringify(compactData);
    // Use encodeURIComponent to handle non-ASCII / Unicode safely
    const utf8SafeBase64 = btoa(encodeURIComponent(jsonString));
    return utf8SafeBase64;
  } catch (err) {
    console.error('Error encoding mixtape:', err);
    return null;
  }
}

/**
 * Decodes a URL-safe Base64 string back into a mixtape object
 */
export function decodeMixtape(encodedString) {
  if (!encodedString) return null;
  try {
    const jsonString = decodeURIComponent(atob(encodedString));
    const data = JSON.parse(jsonString);

    // Validate fields
    if (!data || typeof data !== 'object') return null;
    return {
      t: data.t || 'Mixtape Kaset',
      f: data.f || '',
      c: data.c || 'retro-orange',
      s: data.s || 'none',
      v: data.v || '',
      a: Array.isArray(data.a) ? data.a.filter(Boolean) : [],
      b: Array.isArray(data.b) ? data.b.filter(Boolean) : []
    };
  } catch (err) {
    console.error('Kaset rusak atau URL tidak valid!', err);
    return null;
  }
}

const TAPE_RACK_STORAGE_KEY = 'dek_kaset_collection_v1';

/**
 * Get all tapes saved in user's virtual tape rack (localStorage)
 */
export function getTapeRack() {
  try {
    const raw = localStorage.getItem(TAPE_RACK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save a mixtape to user's virtual rack
 */
export function saveToTapeRack(mixtape) {
  try {
    const rack = getTapeRack();
    // Check if duplicate title exists
    const existingIdx = rack.findIndex(t => t.t === mixtape.t && t.f === mixtape.f);
    const item = {
      ...mixtape,
      savedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    };
    if (existingIdx >= 0) {
      rack[existingIdx] = item;
    } else {
      rack.unshift(item);
    }
    // Limit to 20 tapes
    const trimmed = rack.slice(0, 20);
    localStorage.setItem(TAPE_RACK_STORAGE_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch (e) {
    console.warn('Failed to save to tape rack:', e);
    return [];
  }
}

/**
 * Remove a mixtape from virtual rack
 */
export function removeFromTapeRack(index) {
  try {
    const rack = getTapeRack();
    rack.splice(index, 1);
    localStorage.setItem(TAPE_RACK_STORAGE_KEY, JSON.stringify(rack));
    return rack;
  } catch {
    return [];
  }
}

/**
 * Reads the ?tape= parameter from the current URL
 */
export function getMixtapeFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const tapeParam = urlParams.get('tape');
  if (tapeParam) {
    const decoded = decodeMixtape(tapeParam);
    if (decoded && (decoded.a.length > 0 || decoded.b.length > 0)) {
      return decoded;
    }
  }
  return null;
}

/**
 * Generates the full shareable URL for a given mixtape
 */
export function getShareUrl(mixtape) {
  const base64 = encodeMixtape(mixtape);
  if (!base64) return window.location.href;
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?tape=${base64}`;
}
