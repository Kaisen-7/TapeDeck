import {
  extractYouTubeId,
  parseTrackInput,
  resolveTrackSource,
  encodeMixtape,
  decodeMixtape,
  DEFAULT_MIXTAPE
} from '../mixtapeData.js';

console.log('Running Mixtape Logic Verifications...');

// 1. YouTube ID Extractor Tests
const testCases = [
  { input: 'jfKfPfyJRdk', expected: 'jfKfPfyJRdk' },
  { input: 'https://www.youtube.com/watch?v=5qap5aO4i9A', expected: '5qap5aO4i9A' },
  { input: 'https://youtu.be/DWcJFNfaw9c', expected: 'DWcJFNfaw9c' },
  { input: 'https://www.youtube.com/embed/rUxyKA_-grg', expected: 'rUxyKA_-grg' },
  { input: 'https://youtube.com/shorts/4xDzrJKXOOY?feature=share', expected: '4xDzrJKXOOY' },
  { input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s', expected: 'dQw4w9WgXcQ' },
  { input: '   jfKfPfyJRdk   ', expected: 'jfKfPfyJRdk' }
];

let failed = 0;
for (const tc of testCases) {
  const result = extractYouTubeId(tc.input);
  if (result === tc.expected) {
    console.log(`  ✓ extractYouTubeId('${tc.input}') => '${result}'`);
  } else {
    console.error(`  ✗ extractYouTubeId('${tc.input}') => '${result}', expected '${tc.expected}'`);
    failed++;
  }
}

// 2. Direct Audio & Universal Parser Tests
const directAudioUrl = 'https://archive.org/download/lofi-chill/track01.mp3';
const parsedDirect = parseTrackInput(directAudioUrl);
const resolvedDirect = resolveTrackSource(parsedDirect);
if (resolvedDirect.type === 'audio' && resolvedDirect.src === directAudioUrl && resolvedDirect.label === 'track01') {
  console.log(`  ✓ Direct Audio parsing & resolution PASSED! Label: ${resolvedDirect.label}`);
} else {
  console.error(`  ✗ Direct Audio failed:`, resolvedDirect);
  failed++;
}

// 3. Encode & Decode Test with Mixed Sources (YouTube + Direct Audio)
const testMixtape = {
  t: 'Lagu Pengantar Tidur & Kenangan',
  f: 'Dari: Raka untuk Sahabat',
  c: 'retro-orange',
  a: ['jfKfPfyJRdk', directAudioUrl, 'DWcJFNfaw9c'],
  b: ['rUxyKA_-grg', 'https://example.com/acoustic-guitar.wav']
};

const encoded = encodeMixtape(testMixtape);
console.log(`\nEncoded String length: ${encoded.length}`);

const decoded = decodeMixtape(encoded);
console.log('Decoded tracks Side A:', decoded.a);
console.log('Decoded tracks Side B:', decoded.b);

if (decoded.t === testMixtape.t &&
    decoded.a[1] === directAudioUrl &&
    decoded.b[1] === 'https://example.com/acoustic-guitar.wav') {
  console.log('  ✓ Mixed Sources (YouTube + Direct Audio MP3) Encode & Decode PASSED!');
} else {
  console.error('  ✗ Encode & Decode FAILED!');
  failed++;
}

// 4. Test Invalid Base64 decoding
const invalidDecoded = decodeMixtape('NOT_VALID_BASE64_%%%');
if (invalidDecoded === null) {
  console.log('  ✓ Invalid Base64 graceful handling PASSED!');
} else {
  console.error('  ✗ Invalid Base64 did not return null');
  failed++;
}

if (failed === 0) {
  console.log('\nALL TESTS PASSED WITH 0 ERRORS! 🎉');
} else {
  process.exit(1);
}
