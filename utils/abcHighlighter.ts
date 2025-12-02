
export type TokenType = 'header-key' | 'header-val' | 'lyric-tag' | 'lyric-text' | 'comment' | 'chord' | 'inline-field' | 'decoration' | 'bar' | 'note' | 'rest' | 'tuplet' | 'slur' | 'text';

export interface Token {
  type: TokenType;
  content: string;
}

export interface EditorError {
  line: number;
  col?: number;
}

export const tokenizeLine = (line: string): Token[] => {
    // 1. Whole line checks
    if (line.trim().startsWith('%')) return [{ type: 'comment', content: line }];
    
    // Header Line: X:1, T:Title
    if (line.match(/^[A-Z]:/)) {
        const match = line.match(/^([A-Z]:)(.*)/);
        if (match) return [{ type: 'header-key', content: match[1] }, { type: 'header-val', content: match[2] }];
    }
    
    // Lyric Line: w: lyrics
    if (line.startsWith('w:')) {
        return [{ type: 'lyric-tag', content: 'w:' }, { type: 'lyric-text', content: line.substring(2) }];
    }

    const tokens: Token[] = [];
    
    // Regex for parsing music body
    // Groups:
    // 1. Chord: "..."
    // 2. Inline Field: [K:...] [V:...]
    // 3. Decoration: !...! or +...+
    // 4. Bar: | :| |: [| |] ||
    // 5. Note: Accidentals? + Base + Octave? + Length?
    // 6. Rest: z x Z + Length?
    // 7. Tuplet: (digit
    // 8. Slur/Tie: ( ) -
    // 9. Catch-all: anything else
    
    const regex = /("[^"]*")|(\[[A-Z]:[^\]]*\])|(![^!]*!|\+[^+\n]*\+)|(\|:?|:?\||\[\||\|\]|\|\|)|([\^=_]*[A-Ga-g][,']*[\d\/]*)|([zxZ][\d\/]*)|(\(\d+)|([()\-]+)|(.)/g;
    
    let match;
    while ((match = regex.exec(line)) !== null) {
        if (match[1]) tokens.push({ type: 'chord', content: match[1] });
        else if (match[2]) tokens.push({ type: 'inline-field', content: match[2] });
        else if (match[3]) tokens.push({ type: 'decoration', content: match[3] });
        else if (match[4]) tokens.push({ type: 'bar', content: match[4] });
        else if (match[5]) tokens.push({ type: 'note', content: match[5] });
        else if (match[6]) tokens.push({ type: 'rest', content: match[6] });
        else if (match[7]) tokens.push({ type: 'tuplet', content: match[7] });
        else if (match[8]) tokens.push({ type: 'slur', content: match[8] });
        else if (match[9]) tokens.push({ type: 'text', content: match[9] });
    }
    return tokens;
};

export const getTokenColor = (token: Token): string => {
    switch (token.type) {
        case 'header-key': {
            const key = token.content.charAt(0).toUpperCase();
            switch (key) {
                case 'T': return 'text-amber-700 dark:text-amber-400 font-bold'; // Title
                case 'K': return 'text-rose-700 dark:text-rose-400 font-bold';  // Key
                case 'M': return 'text-sky-700 dark:text-sky-400 font-bold';   // Meter
                case 'L': return 'text-sky-700 dark:text-sky-400 font-bold';   // Length
                case 'Q': return 'text-sky-700 dark:text-sky-400 font-bold';   // Tempo
                case 'V': return 'text-violet-700 dark:text-violet-400 font-bold'; // Voice
                case 'X': return 'text-stone-600 dark:text-stone-500 font-bold'; // Index
                case 'R': return 'text-emerald-700 dark:text-emerald-400 font-bold'; // Rhythm
                default: return 'text-emerald-700 dark:text-emerald-400 font-bold'; 
            }
        }
        case 'header-val': return 'text-md-sys-onSurface font-medium';
        case 'lyric-tag': return 'text-orange-600 dark:text-orange-400 font-bold';
        case 'lyric-text': return 'text-orange-800 dark:text-orange-200/90 italic';
        case 'comment': return 'text-stone-500 italic';
        case 'chord': return 'text-emerald-700 dark:text-emerald-400 font-bold';
        case 'inline-field': return 'text-violet-700 dark:text-violet-400';
        case 'decoration': return 'text-pink-600 dark:text-pink-400';
        case 'bar': return 'text-amber-700 dark:text-amber-600 font-bold';
        case 'note': return 'text-blue-700 dark:text-blue-100';
        case 'rest': return 'text-slate-600 dark:text-slate-500';
        case 'tuplet': return 'text-yellow-700 dark:text-yellow-200 font-bold';
        case 'slur': return 'text-md-sys-onSurface/60';
        default: return 'text-md-sys-secondary';
    }
};
