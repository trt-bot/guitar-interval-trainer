/* Guitar-centric Music Theory Helper Utilities */

// 12 chromatic notes
export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Tuning definitions (using MIDI note numbers for open strings)
// Standard string indices: 0 = High E, 1 = B, 2 = G, 3 = D, 4 = A, 5 = Low E (6-string guitar convention)
export const TUNINGS = {
  standard: {
    name: 'Standard (E A D G B E)',
    notes: [64, 59, 55, 50, 45, 40] // E4, B3, G3, D3, A2, E2
  },
  dropD: {
    name: 'Drop D (D A D G B E)',
    notes: [64, 59, 55, 50, 45, 38] // E4, B3, G3, D3, A2, D2
  },
  halfStepDown: {
    name: 'Half-Step Down (Eb Ab Db Gb Bb Eb)',
    notes: [63, 58, 54, 49, 44, 39] // Eb4, Bb3, Gb3, Db3, Ab2, Eb2
  },
  dadgad: {
    name: 'DADGAD',
    notes: [62, 57, 55, 50, 45, 38] // D4, A3, G3, D3, A2, D2
  }
};

// Standard string labels
export const STRING_NAMES = ['1st (e)', '2nd (B)', '3rd (G)', '4th (D)', '5th (A)', '6th (E)'];

// Interval definitions
export const INTERVALS = [
  { semitones: 0,  short: 'r',   name: 'Root / Unison' },
  { semitones: 1,  short: 'm2',  name: 'Minor 2nd' },
  { semitones: 2,  short: 'M2',  name: 'Major 2nd' },
  { semitones: 3,  short: 'm3',  name: 'Minor 3rd' },
  { semitones: 4,  short: 'M3',  name: 'Major 3rd' },
  { semitones: 5,  short: 'P4',  name: 'Perfect 4th' },
  { semitones: 6,  short: 'd5',  name: 'Tritone / b5' },
  { semitones: 7,  short: 'P5',  name: 'Perfect 5th' },
  { semitones: 8,  short: 'm6',  name: 'Minor 6th' },
  { semitones: 9,  short: 'M6',  name: 'Major 6th' },
  { semitones: 10, short: 'm7',  name: 'Minor 7th' },
  { semitones: 11, short: 'M7',  name: 'Major 7th' },
  { semitones: 12, short: 'oct', name: 'Octave' }
];

/**
 * Gets the note name (e.g. C, C#) without octave from a MIDI note number.
 */
export function getNoteName(midiNote) {
  return NOTES[midiNote % 12];
}

/**
 * Gets the note name with its octave number (e.g., E2, A4) from a MIDI note number.
 */
export function getNoteNameWithOctave(midiNote) {
  const noteName = NOTES[midiNote % 12];
  const octave = Math.floor(midiNote / 12) - 1;
  return `${noteName}${octave}`;
}

/**
 * Converts a MIDI note number to its frequency in Hertz.
 */
export function getFrequency(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Calculates the interval (in semitones) between two notes.
 * Returns the positive semitone value modulo 12.
 */
export function getIntervalSemitones(rootMidi, targetMidi) {
  let diff = (targetMidi - rootMidi) % 12;
  if (diff < 0) diff += 12;
  return diff;
}

/**
 * Gets the interval object from semitone count.
 */
export function getIntervalBySemitones(semitones) {
  const norm = semitones % 12;
  // Handle octave case (12 semitones) explicitly if desired
  if (semitones === 12) return INTERVALS.find(i => i.semitones === 12);
  return INTERVALS.find(i => i.semitones === norm) || INTERVALS[0];
}

/**
 * Resolves the note name and details on a specific string and fret.
 * @param {number} stringIndex - Index of the string (0 to 5)
 * @param {number} fretIndex - Index of the fret (0 to 15)
 * @param {string} tuningName - Name of the tuning ('standard', 'dropD', etc.)
 */
export function getFretDetails(stringIndex, fretIndex, tuningName = 'standard') {
  const openStringMidi = TUNINGS[tuningName].notes[stringIndex];
  const midiNote = openStringMidi + fretIndex;
  
  return {
    midiNote,
    noteName: getNoteName(midiNote),
    label: getNoteNameWithOctave(midiNote),
    frequency: getFrequency(midiNote),
    string: stringIndex,
    fret: fretIndex
  };
}

/**
 * Generates all notes on a standard fretboard (15 frets, 6 strings)
 */
export function getFretboardMatrix(tuningName = 'standard', totalFrets = 16) {
  const matrix = [];
  for (let s = 0; s < 6; s++) {
    const stringNotes = [];
    for (let f = 0; f < totalFrets; f++) {
      stringNotes.push(getFretDetails(s, f, tuningName));
    }
    matrix.push(stringNotes);
  }
  return matrix;
}

// Standard Chord definitions for ear training
export const STANDARD_CHORDS = [
  { name: 'Major Triad', short: 'Maj', intervals: [0, 4, 7], description: 'Root, Major 3rd, Perfect 5th. Bright, happy, and harmonically stable.' },
  { name: 'Minor Triad', short: 'Min', intervals: [0, 3, 7], description: 'Root, Minor 3rd, Perfect 5th. Melancholic, sad, and reflective.' },
  { name: 'Diminished Triad', short: 'Dim', intervals: [0, 3, 6], description: 'Root, Minor 3rd, Diminished 5th (Tritone). Tense, unstable, and spooky.' },
  { name: 'Augmented Triad', short: 'Aug', intervals: [0, 4, 8], description: 'Root, Major 3rd, Augmented 5th. Suspended, ethereal, and dreamy.' },
  { name: 'Major 7th', short: 'Maj7', intervals: [0, 4, 7, 11], description: 'Root, Major 3rd, Perfect 5th, Major 7th. Rich, dreamy, and nostalgic (classic jazz/lounge).' },
  { name: 'Minor 7th', short: 'Min7', intervals: [0, 3, 7, 10], description: 'Root, Minor 3rd, Perfect 5th, Minor 7th. Mellow, atmospheric, and smooth.' },
  { name: 'Dominant 7th', short: '7', intervals: [0, 4, 7, 10], description: 'Root, Major 3rd, Perfect 5th, Minor 7th. Unresolved, bluesy, and full of forward drive.' },
  { name: 'Half-Diminished 7th', short: 'm7b5', intervals: [0, 3, 6, 10], description: 'Root, Minor 3rd, Diminished 5th, Minor 7th. Foundational chord for minor key turnarounds.' }
];

// Gypsy Jazz (Jazz Manouche) Chord definitions for specialized training
export const GYPSY_JAZZ_CHORDS = [
  { name: 'Major 6th', short: '6', intervals: [0, 4, 7, 9], description: 'Root, Major 3rd, Perfect 5th, Major 6th. The traditional resolution chord for Django-style swing.' },
  { name: 'Major 6/9', short: '6/9', intervals: [0, 4, 9, 14], description: 'Root, Major 3rd, Major 6th, Major 9th. Dreamy, lush, and extremely popular for endings and rhythms.' },
  { name: 'Minor 6th', short: 'm6', intervals: [0, 3, 7, 9], description: 'Root, Minor 3rd, Perfect 5th, Major 6th. Dark, mysterious, and the signature tonic chord of Gypsy Jazz.' },
  { name: 'Minor 6/9', short: 'm6/9', intervals: [0, 3, 9, 14], description: 'Root, Minor 3rd, Major 6th, Major 9th. A dense, atmospheric, and highly coloristic minor voicing.' },
  { name: 'Dominant 9th', short: '9', intervals: [0, 4, 10, 14], description: 'Root, Major 3rd, Minor 7th, Major 9th. Smooth, bluesy dominant voicing frequently used in gypsy swing rhythm.' },
  { name: 'Dominant 7b9', short: '7b9', intervals: [0, 4, 10, 13], description: 'Root, Major 3rd, Minor 7th, Minor 9th. Highly tense altered dominant that resolves strongly to minor tonics.' },
  { name: 'Diminished 7th', short: 'dim7', intervals: [0, 3, 6, 9], description: 'Root, Minor 3rd, Diminished 5th, Diminished 7th. Symmetrical chord used for passing motion and substitution.' },
  { name: 'Half-Diminished 7th', short: 'm7b5', intervals: [0, 3, 6, 10], description: 'Root, Minor 3rd, Diminished 5th, Minor 7th. Frequently used as the ii chord in minor jazz turnarounds.' }
];
