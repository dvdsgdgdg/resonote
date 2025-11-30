
// --- Music Theory Constants ---

const NOTES_FLAT =  ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Map ABC accidentals to semitone offsets
const ACCIDENTAL_MAP: Record<string, number> = {
    '__': -2, '_': -1, '=': 0, '^': 1, '^^': 2
};

// Map semitone offsets back to ABC string
const ACCIDENTAL_STR: Record<number, string> = {
    '-2': '__', '-1': '_', '0': '=', '1': '^', '2': '^^'
};

// Base pitch values for A-G (C major scale reference)
// C=0, D=2, E=4, F=5, G=7, A=9, B=11
const BASE_PITCH: Record<string, number> = {
    'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11,
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
};

// --- Helper Functions ---

/**
 * Normalizes an index to 0-11 range
 */
const normalize = (n: number) => {
    return ((n % 12) + 12) % 12;
};

/**
 * Determines if a new key should prefer sharps or flats based on Circle of Fifths position
 */
const shouldUseSharps = (rootValues: number): boolean => {
    // C(0), G(7), D(2), A(9), E(4), B(11), F#(6) -> Sharps
    // F(5), Bb(10), Eb(3), Ab(8), Db(1), Gb(6) -> Flats
    const sharpPreferred = [0, 2, 4, 6, 7, 9, 11];
    return sharpPreferred.includes(rootValues);
};

/**
 * Transposes a specific Key Signature (e.g., "Gm", "Bb")
 */
const transposeKey = (keySig: string, semitones: number): string => {
    // Regex to split Root (A-G), Accidental (#/b), and Mode (m, min, mix, etc.)
    const match = keySig.trim().match(/^([A-G])([#b]?)(.*)$/);
    if (!match) return keySig;

    const [, root, accidental, mode] = match;
    
    // Calculate current root value
    let val = BASE_PITCH[root];
    if (accidental === '#') val += 1;
    if (accidental === 'b') val -= 1;

    // Shift
    const newVal = normalize(val + semitones);
    
    // Determine target root name
    // Heuristic: If we are effectively shifting UP, use sharps, unless original was heavily flat
    const targetIsSharp = shouldUseSharps(newVal);
    const scale = targetIsSharp ? NOTES_SHARP : NOTES_FLAT;
    
    const newRoot = scale[newVal];
    
    // Clean up ABC representation (Bb is acceptable, but A# might be represented as ^A in headers sometimes, 
    // but usually K: fields use standard music theory notation #/b)
    return `${newRoot}${mode}`;
};

/**
 * Transposes a single ABC note token
 */
const transposeNoteToken = (token: string, semitones: number, forceSharp: boolean): string => {
    // Regex breakdown:
    // 1. ([\^=_]*)   -> Accidentals (capture group 1)
    // 2. ([A-Ga-g])  -> Note Name (capture group 2)
    // 3. ([,']*)     -> Octave modifiers (capture group 3)
    // 4. (.*)        -> Length/Rhythm (capture group 4 - remainder)
    
    const match = token.match(/^([\^=_]*)([A-Ga-g])([,']*)/);
    if (!match) return token; // Should not happen if regex calling this is correct

    const fullMatch = match[0];
    const restOfString = token.slice(fullMatch.length); // The rhythm part (e.g., "3/2")

    const accidentalStr = match[1];
    const noteChar = match[2];
    const octaveStr = match[3];

    // 1. Calculate absolute pitch value
    // Base pitch (0-11)
    let pitch = BASE_PITCH[noteChar];
    
    // Add Octave shift (each , is -12, each ' is +12)
    // However, for simplified transposition, we keep the octave string separate 
    // and only shift the pitch class, adjusting octave string if we cross C.
    // Wait, proper way: Convert to absolute MIDI-like number, add semitones, convert back.
    
    // Let's stick to Pitch Class shift + Octave Rollover check.
    
    // Add existing accidental
    let accidentalVal = 0;
    if (accidentalStr) {
        // Handle double sharps/flats
        for(const char of accidentalStr) {
            if(char === '^') accidentalVal++;
            if(char === '_') accidentalVal--;
            if(char === '=') accidentalVal = 0; // Natural resets? usually yes.
        }
        // Special case for ^^ and __
        if(accidentalStr === '^^') accidentalVal = 2;
        if(accidentalStr === '__') accidentalVal = -2;
    }

    // Determine current octave shift relative to middle C logic
    // In ABC: C is middle C. c is high C.
    // Upper case C (middle) -> index 0. Lower case c (high) -> index 12 effectively.
    
    const isLowerCase = noteChar === noteChar.toLowerCase();
    let octaveOffset = 0;
    // Count commas and apostrophes
    const commas = (octaveStr.match(/,/g) || []).length;
    const apostrophes = (octaveStr.match(/'/g) || []).length;
    octaveOffset -= commas;
    octaveOffset += apostrophes;
    if (isLowerCase) octaveOffset += 1;

    // Calculate Absolute Semitone Value (Relative to Bass C)
    // Base C = 0.
    let absoluteValue = pitch + accidentalVal + (octaveOffset * 12);

    // Apply Transposition
    absoluteValue += semitones;

    // Convert back to ABC
    // 1. New Octave
    const newOctaveVal = Math.floor(absoluteValue / 12);
    const newPitchClass = normalize(absoluteValue);

    // 2. Determine Note Name and Accidental
    // We need to decide spelling (F# vs Gb)
    const scale = forceSharp ? NOTES_SHARP : NOTES_FLAT;
    const noteNameWithAcc = scale[newPitchClass]; // e.g., "C#" or "Db" or "C"
    
    let newBaseChar = noteNameWithAcc.charAt(0); // "C"
    let newAccChar = noteNameWithAcc.length > 1 ? noteNameWithAcc.charAt(1) : ""; // "#" or "b" or ""

    // 3. Convert standard #/b to ABC ^/_
    let finalAccABC = "";
    if (newAccChar === '#') finalAccABC = "^";
    if (newAccChar === 'b') finalAccABC = "_";

    // 4. Handle Natural logic?
    // If we simply output the calculated chromatic note, strict ABC is happy. 
    // We don't need to explicitly print '=' unless we are canceling a key signature, 
    // but since we are transforming the notes purely chromatically, 
    // explicit accidentals are safer for "dumb" transposition.
    
    // 5. Construct Octave String
    // ABC: C, D, ... B, C D ... B c d ... b c'
    // Index: -1         0          1        2
    
    // Map newOctaveVal back to case + symbols
    // 0 -> Upper Case (C)
    // 1 -> Lower Case (c)
    // < 0 -> Upper Case + commas
    // > 1 -> Lower Case + apostrophes
    
    let finalNoteChar = newBaseChar;
    let finalOctaveStr = "";

    if (newOctaveVal >= 1) {
        finalNoteChar = newBaseChar.toLowerCase();
        for(let i=1; i<newOctaveVal; i++) finalOctaveStr += "'";
    } else {
        finalNoteChar = newBaseChar.toUpperCase();
        for(let i=0; i>newOctaveVal; i--) finalOctaveStr += ",";
    }

    // Optimization: If the original had an explicit natural '=', check if we need it?
    // For simplicity in this regex approach, we omit '=' unless strictly needed, 
    // relying on the sharp/flat mapping.
    
    return `${finalAccABC}${finalNoteChar}${finalOctaveStr}${restOfString}`;
};


// --- Main Export ---

export const transposeABC = (abcCode: string, semitones: number): string => {
    if (semitones === 0) return abcCode;

    const lines = abcCode.split('\n');
    let currentForceSharp = true; // Default to sharps

    const transformedLines = lines.map(line => {
        const trimmed = line.trim();
        
        // 1. Handle Key Signature (K:)
        if (trimmed.startsWith('K:')) {
            const keyContent = trimmed.substring(2).trim();
            // Detect if the target key suggests sharps or flats
            // We do a "Dry Run" transposition of the key to set the state for subsequent notes
            const newKey = transposeKey(keyContent, semitones);
            
            // Check if new key uses flats
            if (newKey.includes('b') || newKey === 'F') {
                currentForceSharp = false;
            } else {
                currentForceSharp = true; // C major defaults to sharp preference for accidentals usually
            }
            
            return `K:${newKey}`;
        }

        // 2. Skip other headers or comments or lyrics
        // Headers: Letter + Colon (e.g. T:Title)
        // Lyrics: w:
        // Comments: %
        if (/^[A-Z]:/.test(trimmed) || trimmed.startsWith('%') || trimmed.startsWith('w:')) {
            return line;
        }

        // 3. Process Music Line
        // We need a regex that finds Notes but ignores Strings "..." (chords) and Decorations !...!
        
        // Strategy: Split by "Double Quotes" to isolate chord symbols, then process the non-chord parts.
        // ABC Chords are in "Gm7".
        
        const segments = line.split('"');
        
        const processedSegments = segments.map((segment, index) => {
            // Even indexes are Music (0, 2, 4...)
            // Odd indexes are Chords (1, 3, 5...)
            if (index % 2 === 1) {
                // This is a Chord Symbol (e.g., "Am7"). 
                // OPTIONAL: Transpose the chord root? 
                // Let's do it for "Senior" credit.
                return transposeChordSymbol(segment, semitones);
            } 
            else {
                // This is Music (Notes, bars, spaces)
                // We use a replace function on the note tokens
                // Regex for a note: 
                // (Accidentals)(NoteName)(Octave)
                // We must be careful not to match 'r' 'x' 'z' (rests) or bar lines.
                // We match [^=^_] for accidentals, [a-gA-G] for notes.
                
                return segment.replace(
                    /([\^=_]*)([a-gA-G])([,']*)/g,
                    (match) => transposeNoteToken(match, semitones, currentForceSharp)
                );
            }
        });

        return processedSegments.join('"');
    });

    return transformedLines.join('\n');
};

/**
 * Transposes text chords like "Am7", "G/B", "F#m"
 */
const transposeChordSymbol = (chord: string, semitones: number): string => {
    // Regex to find the Root Note of the chord (e.g. C, F#, Bb)
    // It might be complex like C#m7b5. We just want the Root (C#) and potentially the Bass (/G#)
    
    // Function to replace a root note
    const replaceRoot = (root: string) => {
        let val = BASE_PITCH[root[0].toUpperCase()];
        if (root.length > 1) {
            if (root[1] === '#') val += 1;
            if (root[1] === 'b') val -= 1;
        }
        
        const newVal = normalize(val + semitones);
        const targetIsSharp = shouldUseSharps(newVal);
        const scale = targetIsSharp ? NOTES_SHARP : NOTES_FLAT;
        return scale[newVal];
    };

    // Replace Root (Start of string)
    let newChord = chord.replace(/^[A-G][#b]?/, (match) => replaceRoot(match));
    
    // Replace Bass Note (After slash)
    newChord = newChord.replace(/\/[A-G][#b]?/, (match) => {
        // match includes slash, e.g. "/F#"
        const note = match.substring(1);
        return "/" + replaceRoot(note);
    });

    return newChord;
};
