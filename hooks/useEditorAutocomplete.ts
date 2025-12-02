
import { useState, useCallback } from 'react';
import { SuggestionOption } from '../components/AutocompleteMenu';
import { getCaretCoordinates } from '../utils/caretCoordinates';

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

export const useEditorAutocomplete = (
  textareaRef: React.RefObject<HTMLTextAreaElement>, 
  onChange: (val: string) => void
) => {
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

  const closeSuggestions = useCallback(() => {
    setSuggestionState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const applySuggestion = useCallback((option: SuggestionOption) => {
      const el = textareaRef.current;
      if (!el) return;

      const cursor = el.selectionEnd;
      const text = el.value;
      // We assume trigger was defined, simply insert value
      const newValue = text.substring(0, cursor) + option.value + text.substring(cursor);
      
      onChange(newValue);
      closeSuggestions();
      
      requestAnimationFrame(() => {
          if (el) {
              el.focus();
              const newCursorPos = cursor + option.value.length;
              el.setSelectionRange(newCursorPos, newCursorPos);
          }
      });
  }, [onChange, closeSuggestions, textareaRef]);

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
     if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter') return;

     const el = textareaRef.current;
     if (!el) return;

     const cursor = el.selectionEnd;
     const textBeforeCursor = el.value.substring(0, cursor);
     
     // Detect Header Triggers (K:, M:, L:) at start of line
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
             closeSuggestions();
         }
     }
  }, [suggestionState.isOpen, closeSuggestions, textareaRef]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
            closeSuggestions();
            return;
        }
    }
  }, [suggestionState, applySuggestion, closeSuggestions]);

  return {
    suggestionState,
    handleKeyUp,
    handleKeyDown,
    applySuggestion,
    closeSuggestions
  };
};
