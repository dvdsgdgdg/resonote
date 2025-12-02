
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
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  useEffect(() => {
    if (!warningId) return;

    const el = document.getElementById(warningId);
    if (!el) return;

    const checkStatus = () => {
      const text = el.innerText || "";
      const hasNoErrorsMessage = text.toLowerCase().includes("no error");
      setIsSuccess(hasNoErrorsMessage);
    };

    checkStatus();
    const observer = new MutationObserver(checkStatus);
    observer.observe(el, { childList: true, characterData: true, subtree: true });

    return () => observer.disconnect();
  }, [warningId]);

  const handleChange = (newValue: string) => {
    // 1. Update state immediately
    onChange(newValue);

    // 2. Debounce history commit
    if (onCommitHistory) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            onCommitHistory();
        }, 1000);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
     // Trigger detection logic
     if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter') return;

     const el = textareaRef.current;
     if (!el) return;

     const cursor = el.selectionEnd;
     const textBeforeCursor = el.value.substring(0, cursor);
     
     // Detect Header Triggers: Start of line or file, followed by Header Letter and Colon
     // Regex: (^|\n)([KML]):\s*$
     const match = textBeforeCursor.match(/(^|\n)([KML]):\s*$/);
     
     if (match) {
         const triggerChar = match[2]; // K, M, or L
         const fullTrigger = `${triggerChar}:`;
         
         let options: SuggestionOption[] = [];
         if (triggerChar === 'K') options = KEY_OPTIONS;
         if (triggerChar === 'M') options = METER_OPTIONS;
         if (triggerChar === 'L') options = LENGTH_OPTIONS;

         if (options.length > 0) {
             const coords = getCaretCoordinates(el, cursor);
             // Adjust coordinates relative to container (if container has padding/relative pos)
             // The getCaretCoordinates usually gives offsets relative to the element's offsetParent
             // We just need to ensure the container is relative.
             
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
      
      // We assume the cursor is right after "K: " or "K:"
      // We insert the value and a space if needed
      const newValue = text.substring(0, cursor) + option.value + text.substring(cursor);
      
      onChange(newValue);
      setSuggestionState(prev => ({ ...prev, isOpen: false }));
      
      // Restore focus and move cursor
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

        // If there is a text selection, transpose only that part
        if (start !== end) {
            const selection = value.substring(start, end);
            const transposedSelection = transposeABC(selection, semitones);
            const newValue = value.substring(0, start) + transposedSelection + value.substring(end);
            
            onChange(newValue);

            // Restore selection to the new transposed text
            requestAnimationFrame(() => {
                if (textareaRef.current) {
                    textareaRef.current.setSelectionRange(start, start + transposedSelection.length);
                    textareaRef.current.focus();
                }
            });

            // Commit to history immediately (treat as a manual edit action)
            if (onCommitHistory) onCommitHistory();
            return;
        }
    }

    // Otherwise, transpose the entire song via parent handler
    onTranspose(semitones);
  };

  return (
    <div className="w-full h-full flex flex-col bg-md-sys-surface rounded-3xl border border-md-sys-outline/20 overflow-hidden shadow-sm transition-shadow hover:shadow-md relative">
      
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-md-sys-outline/20 bg-md-sys-surfaceVariant/50 backdrop-blur-sm">
        <div className="flex items-center">
          <span className="material-symbols-rounded text-md-sys-primary mr-3 text-[22px]">code</span>
          <h3 className="text-sm font-bold text-md-sys-onSurface tracking-wider uppercase opacity-90">ABC Editor</h3>
        </div>
        <div className="flex items-center gap-1">
             {/* Transpose Controls */}
             <div className="flex items-center mr-2 bg-md-sys-surface/80 rounded-lg p-0.5 border border-md-sys-outline/10 shadow-sm">
                <button 
                  onClick={() => handleTransposeClick(-1)}
                  className="p-1.5 hover:bg-md-sys-surfaceVariant rounded-md text-md-sys-onSurface hover:text-md-sys-primary transition-colors"
                  title="Transpose Down (-1 Semitone)"
                >
                   <span className="material-symbols-rounded text-[18px]">remove</span>
                </button>
                <span className="text-[10px] font-bold text-md-sys-secondary px-2 uppercase tracking-wider select-none">Transpose</span>
                <button 
                  onClick={() => handleTransposeClick(1)}
                  className="p-1.5 hover:bg-md-sys-surfaceVariant rounded-md text-md-sys-onSurface hover:text-md-sys-primary transition-colors"
                  title="Transpose Up (+1 Semitone)"
                >
                   <span className="material-symbols-rounded text-[18px]">add</span>
                </button>
             </div>

             <div className="w-px h-6 bg-md-sys-outline/20 mx-2"></div>

             <button 
                onClick={onImport} 
                className="p-2 hover:bg-md-sys-surfaceVariant rounded-lg text-md-sys-secondary hover:text-md-sys-onSurface transition-colors" 
                title="Import Source (.abc, .txt)"
             >
                <span className="material-symbols-rounded text-[20px]">upload_file</span>
             </button>
             <button 
                onClick={onExport} 
                className="p-2 hover:bg-md-sys-surfaceVariant rounded-lg text-md-sys-secondary hover:text-md-sys-onSurface transition-colors" 
                title="Export Source (.abc)"
             >
                <span className="material-symbols-rounded text-[20px]">download</span>
             </button>
        </div>
      </div>

      {/* Text Area Container */}
      <div className="flex-1 relative min-h-0" ref={containerRef}>
        <textarea
          ref={textareaRef}
          id={textareaId}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyUp={handleKeyUp}
          onKeyDown={handleKeyDown}
          className="w-full h-full bg-transparent p-6 text-[13px] font-mono text-md-sys-secondary resize-none focus:outline-none leading-relaxed selection:bg-md-sys-primary/20 selection:text-md-sys-primary"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
        />

        {/* Floating Autocomplete Menu */}
        {suggestionState.isOpen && (
            <AutocompleteMenu 
                options={suggestionState.options}
                selectedIndex={suggestionState.selectedIndex}
                position={suggestionState.position}
                onSelect={applySuggestion}
                trigger={suggestionState.trigger}
            />
        )}

        {/* Footer Info */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 pointer-events-none opacity-50">
             <span className="text-[10px] font-mono text-md-sys-outline">ABC Standard 2.1</span>
             <span className="material-symbols-rounded text-[14px] text-md-sys-outline">verified</span>
        </div>
      </div>

      {/* Validation Status Bar */}
      {warningId && (
        <div 
          id={warningId}
          className={`empty:hidden border-t border-md-sys-outline/10 text-xs font-mono p-3 max-h-[120px] overflow-auto whitespace-pre-wrap shadow-[inset_0_4px_12px_rgba(0,0,0,0.05)] transition-colors duration-300 ${
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
