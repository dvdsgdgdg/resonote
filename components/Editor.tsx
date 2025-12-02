import React, { useEffect, useState, useRef } from 'react';
import { transposeABC } from '../utils/abcTransposer';
import { getCaretCoordinates } from '../utils/caretCoordinates';
import { AutocompleteMenu, SuggestionOption } from './AutocompleteMenu';

interface EditorProps {
  value: string;
  onChange: (val: string) => void;
  warningId?: string;
  textareaId?: string;
  onImport: () => void;
  onExport: () => void;
  onTranspose: (semitones: number) => void;
  onCommitHistory?: () => void;
}

// --- Suggestion Data ---
const KEY_OPTIONS: SuggestionOption[] = [
  { label: 'C Major', value: 'C', info: 'Natural', icon: 'music_note' },
  { label: 'G Major', value: 'G', info: '1 Sharp (#)', icon: 'music_note' },
  { label: 'D Major', value: 'D', info: '2 Sharps (##)', icon: 'music_note' },
  { label: 'A Major', value: 'A', info: '3 Sharps (###)', icon: 'music_note' },
  { label: 'E Major', value: 'E', info: '4 Sharps', icon: 'music_note' },
  { label: 'F Major', value: 'F', info: '1 Flat (b)', icon: 'music_note' },
  { label: 'Bb Major', value: 'Bb', info: '2 Flats (bb)', icon: 'music_note' },
  { label: 'Eb Major', value: 'Eb', info: '3 Flats (bbb)', icon: 'music_note' },
  { label: 'A Minor', value: 'Am', info: 'Natural', icon: 'queue_music' },
  { label: 'E Minor', value: 'Em', info: '1 Sharp', icon: 'queue_music' },
  { label: 'D Minor', value: 'Dm', info: '1 Flat', icon: 'queue_music' },
  { label: 'G Minor', value: 'Gm', info: '2 Flats', icon: 'queue_music' },
];

const METER_OPTIONS: SuggestionOption[] = [
  { label: 'Common Time (4/4)', value: '4/4', icon: 'timelapse' },
  { label: 'Cut Time (2/2)', value: 'C|', icon: 'timelapse' },
  { label: 'Waltz (3/4)', value: '3/4', icon: 'timelapse' },
  { label: 'March (2/4)', value: '2/4', icon: 'timelapse' },
  { label: 'Jig (6/8)', value: '6/8', icon: 'timelapse' },
  { label: 'Slip Jig (9/8)', value: '9/8', icon: 'timelapse' },
  { label: 'Compound (12/8)', value: '12/8', icon: 'timelapse' },
];

const LENGTH_OPTIONS: SuggestionOption[] = [
  { label: 'Eighth (1/8)', value: '1/8', icon: 'horizontal_rule' },
  { label: 'Quarter (1/4)', value: '1/4', icon: 'horizontal_rule' },
  { label: 'Sixteenth (1/16)', value: '1/16', icon: 'horizontal_rule' },
];

interface EditorError {
  line: number;
  col?: number;
}

// --- Syntax Highlighting Logic ---

type TokenType = 'header-key' | 'header-val' | 'lyric-tag' | 'lyric-text' | 'comment' | 'chord' | 'inline-field' | 'decoration' | 'bar' | 'note' | 'rest' | 'tuplet' | 'slur' | 'text';

interface Token {
  type: TokenType;
  content: string;
}

const tokenizeLine = (line: string): Token[] => {
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

const getTokenColor = (token: Token): string => {
    switch (token.type) {
        case 'header-key': {
            // Specific colors for different headers
            const key = token.content.charAt(0).toUpperCase();
            switch (key) {
                case 'T': return 'text-amber-400 font-bold'; // Title (Gold)
                case 'K': return 'text-rose-400 font-bold';  // Key (Pink/Red)
                case 'M': return 'text-sky-400 font-bold';   // Meter (Blue)
                case 'L': return 'text-sky-400 font-bold';   // Length (Blue)
                case 'Q': return 'text-sky-400 font-bold';   // Tempo (Blue)
                case 'V': return 'text-violet-400 font-bold'; // Voice (Purple)
                case 'X': return 'text-stone-500 font-bold'; // Index (Gray)
                case 'R': return 'text-emerald-400 font-bold'; // Rhythm (Green)
                default: return 'text-emerald-400 font-bold'; // Others (Green)
            }
        }
        case 'header-val': return 'text-md-sys-onSurface/90 font-medium'; // Neutral but readable
        case 'lyric-tag': return 'text-orange-400 font-bold';
        case 'lyric-text': return 'text-orange-200/90 italic';
        case 'comment': return 'text-stone-500 italic';
        case 'chord': return 'text-emerald-400 font-bold';
        case 'inline-field': return 'text-violet-400';
        case 'decoration': return 'text-pink-400';
        case 'bar': return 'text-amber-600 font-bold';
        case 'note': return 'text-blue-100';
        case 'rest': return 'text-slate-500';
        case 'tuplet': return 'text-yellow-200 font-bold';
        case 'slur': return 'text-white/60';
        default: return 'text-md-sys-secondary';
    }
};

export const Editor: React.FC<EditorProps> = ({ 
  value, 
  onChange, 
  warningId, 
  textareaId,
  onImport,
  onExport,
  onTranspose,
  onCommitHistory
}) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<EditorError[]>([]);
  const [activeLine, setActiveLine] = useState<number>(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Autocomplete State ---
  const [suggestionState, setSuggestionState] = useState<{
    isOpen: boolean;
    position: { top: number; left: number };
    trigger: string;
    selectedIndex: number;
    options: SuggestionOption[];
  }>({
    isOpen: false,
    position: { top: 0, left: 0 },
    trigger: '',
    selectedIndex: 0,
    options: []
  });

  const lines = value.split('\n');
  const lineCount = lines.length;

  useEffect(() => {
    if (!warningId) return;

    const el = document.getElementById(warningId);
    if (!el) return;

    const checkStatus = () => {
      const text = el.innerText || "";
      const hasNoErrorsMessage = text.toLowerCase().includes("no error") || text.trim() === "";
      setIsSuccess(hasNoErrorsMessage);

      const foundErrors: EditorError[] = [];
      const regex = /(?:Line|line)[:\s]+(\d+)(?::(\d+))?/gi;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const line = parseInt(match[1], 10);
        const col = match[2] ? parseInt(match[2], 10) : undefined;
        foundErrors.push({ line, col });
      }
      setErrors(foundErrors);
    };

    checkStatus();
    const observer = new MutationObserver(checkStatus);
    observer.observe(el, { childList: true, characterData: true, subtree: true });

    return () => observer.disconnect();
  }, [warningId]);

  const handleChange = (newValue: string) => {
    onChange(newValue);
    if (onCommitHistory) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            onCommitHistory();
        }, 1000);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
        gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
    if (overlayRef.current) {
        overlayRef.current.scrollTop = e.currentTarget.scrollTop;
        overlayRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleCursorActivity = () => {
     if (!textareaRef.current) return;
     const el = textareaRef.current;
     const cursorIndex = el.selectionStart;
     const textUpToCursor = el.value.substring(0, cursorIndex);
     const currentLine = textUpToCursor.split('\n').length;
     setActiveLine(currentLine);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
     handleCursorActivity();
     
     if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter') return;

     const el = textareaRef.current;
     if (!el) return;

     const cursor = el.selectionEnd;
     const textBeforeCursor = el.value.substring(0, cursor);
     
     const match = textBeforeCursor.match(/(^|\n)([KML]):\s*$/);
     
     if (match) {
         const triggerChar = match[2];
         const fullTrigger = `${triggerChar}:`;
         
         let options: SuggestionOption[] = [];
         if (triggerChar === 'K') options = KEY_OPTIONS;
         if (triggerChar === 'M') options = METER_OPTIONS;
         if (triggerChar === 'L') options = LENGTH_OPTIONS;

         if (options.length > 0) {
             const coords = getCaretCoordinates(el, cursor);
             setSuggestionState({
                 isOpen: true,
                 position: { top: coords.top, left: coords.left },
                 trigger: fullTrigger,
                 selectedIndex: 0,
                 options
             });
         }
     } else {
         if (suggestionState.isOpen) {
             setSuggestionState(prev => ({ ...prev, isOpen: false }));
         }
     }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestionState.isOpen) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSuggestionState(prev => ({
                ...prev,
                selectedIndex: (prev.selectedIndex + 1) % prev.options.length
            }));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSuggestionState(prev => ({
                ...prev,
                selectedIndex: (prev.selectedIndex - 1 + prev.options.length) % prev.options.length
            }));
            return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            applySuggestion(suggestionState.options[suggestionState.selectedIndex]);
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setSuggestionState(prev => ({ ...prev, isOpen: false }));
            return;
        }
    }
  };

  const applySuggestion = (option: SuggestionOption) => {
      const el = textareaRef.current;
      if (!el) return;

      const cursor = el.selectionEnd;
      const text = el.value;
      const newValue = text.substring(0, cursor) + option.value + text.substring(cursor);
      
      onChange(newValue);
      setSuggestionState(prev => ({ ...prev, isOpen: false }));
      
      requestAnimationFrame(() => {
          if (el) {
              el.focus();
              const newCursorPos = cursor + option.value.length;
              el.setSelectionRange(newCursorPos, newCursorPos);
          }
      });
  };

  const handleTransposeClick = (semitones: number) => {
    if (textareaRef.current) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        if (start !== end) {
            const selection = value.substring(start, end);
            const transposedSelection = transposeABC(selection, semitones);
            const newValue = value.substring(0, start) + transposedSelection + value.substring(end);
            onChange(newValue);
            requestAnimationFrame(() => {
                if (textareaRef.current) {
                    textareaRef.current.setSelectionRange(start, start + transposedSelection.length);
                    textareaRef.current.focus();
                }
            });
            if (onCommitHistory) onCommitHistory();
            return;
        }
    }
    onTranspose(semitones);
  };

  return (
    <div className="w-full h-full flex flex-col bg-md-sys-surface rounded-3xl border border-md-sys-outline/20 overflow-hidden shadow-sm transition-shadow hover:shadow-md relative">
      
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-md-sys-outline/20 bg-md-sys-surfaceVariant/50 backdrop-blur-sm z-10">
        <div className="flex items-center">
          <span className="material-symbols-rounded text-md-sys-primary mr-3 text-[22px]">code</span>
          <h3 className="text-sm font-bold text-md-sys-onSurface tracking-wider uppercase opacity-90">ABC Editor</h3>
        </div>
        <div className="flex items-center gap-1">
             <div className="flex items-center mr-2 bg-md-sys-surface/80 rounded-lg p-0.5 border border-md-sys-outline/10 shadow-sm">
                <button onClick={() => handleTransposeClick(-1)} className="p-1.5 hover:bg-md-sys-surfaceVariant rounded-md text-md-sys-onSurface hover:text-md-sys-primary transition-colors" title="Transpose Down">
                   <span className="material-symbols-rounded text-[18px]">remove</span>
                </button>
                <span className="text-[10px] font-bold text-md-sys-secondary px-2 uppercase tracking-wider select-none">Transpose</span>
                <button onClick={() => handleTransposeClick(1)} className="p-1.5 hover:bg-md-sys-surfaceVariant rounded-md text-md-sys-onSurface hover:text-md-sys-primary transition-colors" title="Transpose Up">
                   <span className="material-symbols-rounded text-[18px]">add</span>
                </button>
             </div>
             <div className="w-px h-6 bg-md-sys-outline/20 mx-2"></div>
             <button onClick={onImport} className="p-2 hover:bg-md-sys-surfaceVariant rounded-lg text-md-sys-secondary hover:text-md-sys-onSurface transition-colors" title="Import">
                <span className="material-symbols-rounded text-[20px]">upload_file</span>
             </button>
             <button onClick={onExport} className="p-2 hover:bg-md-sys-surfaceVariant rounded-lg text-md-sys-secondary hover:text-md-sys-onSurface transition-colors" title="Export">
                <span className="material-symbols-rounded text-[20px]">download</span>
             </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 relative min-h-0 flex" ref={containerRef}>
        
        {/* Gutter */}
        <div 
          ref={gutterRef}
          className="w-12 pt-6 pb-6 bg-md-sys-surfaceVariant/20 border-r border-md-sys-outline/10 text-right select-none overflow-hidden editor-sync-font"
        >
          {Array.from({ length: lineCount }).map((_, i) => {
            const lineNum = i + 1;
            const hasError = errors.some(e => e.line === lineNum);
            const isActive = activeLine === lineNum;
            
            return (
              <div 
                key={i} 
                className={`px-3 relative transition-colors h-[24px] flex items-center justify-end ${
                  isActive ? 'text-md-sys-onSurface font-bold bg-md-sys-primary/5' : 'text-md-sys-outline/60'
                } ${hasError ? 'text-red-500 font-bold bg-red-500/10' : ''}`}
              >
                {lineNum}
                {hasError && (
                   <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
                )}
              </div>
            );
          })}
        </div>

        {/* Editor Area */}
        <div className="flex-1 relative h-full overflow-hidden bg-[#1E1E1E]"> 
            
            {/* Syntax Highlight Overlay */}
            <div 
                ref={overlayRef}
                className="absolute inset-0 p-6 pt-6 editor-sync-font whitespace-pre overflow-hidden pointer-events-none select-none"
                aria-hidden="true"
            >
                {lines.map((lineContent, i) => {
                    const lineNum = i + 1;
                    const lineErrors = errors.filter(e => e.line === lineNum && e.col !== undefined);
                    const tokens = tokenizeLine(lineContent);
                    let charIndex = 0;

                    // If empty line, render a space to maintain height
                    if (lineContent.length === 0) {
                         return <div key={i} className="h-[24px]">&nbsp;</div>;
                    }

                    return (
                        <div key={i} className="h-[24px] relative">
                             {tokens.map((token, tIdx) => {
                                 const tokenStart = charIndex;
                                 const tokenEnd = charIndex + token.content.length;
                                 charIndex = tokenEnd;
                                 
                                 const colorClass = getTokenColor(token);
                                 
                                 // Check for error overlap
                                 const tokenErrors = lineErrors.filter(e => {
                                     const errIdx = e.col! - 1;
                                     return errIdx >= tokenStart && errIdx < tokenEnd;
                                 });
                                 
                                 if (tokenErrors.length === 0) {
                                     return <span key={tIdx} className={colorClass}>{token.content}</span>;
                                 }
                                 
                                 // Handle token split due to error
                                 const nodes: React.ReactNode[] = [];
                                 let lastTokenIdx = 0;
                                 const sortedErrors = tokenErrors.sort((a,b) => a.col! - b.col!);
                                 
                                 sortedErrors.forEach((err, errSeq) => {
                                     const errIdxInToken = (err.col! - 1) - tokenStart;
                                     
                                     // Text before error
                                     if (errIdxInToken > lastTokenIdx) {
                                         nodes.push(token.content.substring(lastTokenIdx, errIdxInToken));
                                     }
                                     
                                     // Error Char (Wrapped with syntax color AND error background)
                                     nodes.push(
                                         <span key={`err-${tIdx}-${errSeq}`} className="bg-red-500/50 border-b-2 border-red-500 text-white rounded-sm">
                                             {token.content.charAt(errIdxInToken)}
                                         </span>
                                     );
                                     
                                     lastTokenIdx = errIdxInToken + 1;
                                 });
                                 
                                 // Remaining text
                                 if (lastTokenIdx < token.content.length) {
                                     nodes.push(token.content.substring(lastTokenIdx));
                                 }
                                 
                                 return <span key={tIdx} className={colorClass}>{nodes}</span>;
                             })}
                             
                             {/* EOL Error (Virtual Space) */}
                             {lineErrors.some(e => (e.col! - 1) >= lineContent.length) && (
                                <span className="bg-red-500/50 border-b-2 border-red-500 inline-block w-[1ch]">&nbsp;</span>
                             )}
                        </div>
                    );
                })}
            </div>

            {/* Interactive Textarea (Transparent) */}
            <textarea
              ref={textareaRef}
              id={textareaId}
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              onScroll={handleScroll}
              onClick={handleCursorActivity}
              onKeyUp={handleKeyUp}
              onKeyDown={handleKeyDown}
              className="absolute inset-0 w-full h-full bg-transparent p-6 pt-6 editor-sync-font text-transparent caret-md-sys-primary resize-none focus:outline-none selection:bg-md-sys-primary/20 whitespace-pre z-10"
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              wrap="off" 
            />

            {suggestionState.isOpen && (
                <AutocompleteMenu 
                    options={suggestionState.options}
                    selectedIndex={suggestionState.selectedIndex}
                    position={suggestionState.position}
                    onSelect={applySuggestion}
                    trigger={suggestionState.trigger}
                />
            )}
        </div>

        {/* Footer Info */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 pointer-events-none opacity-50 z-20">
             <span className="text-[10px] font-mono text-md-sys-outline">ABC Standard 2.1</span>
             <span className="material-symbols-rounded text-[14px] text-md-sys-outline">verified</span>
        </div>
      </div>

      {/* Validation Status Bar */}
      {warningId && (
        <div 
          id={warningId}
          className={`empty:hidden border-t border-md-sys-outline/10 text-xs font-mono p-3 max-h-[120px] overflow-auto whitespace-pre-wrap shadow-[inset_0_4px_12px_rgba(0,0,0,0.05)] transition-colors duration-300 z-10 ${
            isSuccess 
              ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400" 
              : "bg-red-500/5 text-red-600 dark:text-red-400"
          }`}
        >
        </div>
      )}
    </div>
  );
};