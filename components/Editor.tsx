
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { transposeABC } from '../utils/abcTransposer';
import { EditorError } from '../utils/abcHighlighter';
import { AutocompleteMenu } from './AutocompleteMenu';
import { useEditorAutocomplete } from '../hooks/useEditorAutocomplete';
import { EditorToolbar } from './editor/EditorToolbar';
import { EditorGutter } from './editor/EditorGutter';
import { SyntaxOverlay } from './editor/SyntaxOverlay';

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

  // Split lines for rendering
  const lines = value.split('\n');
  const lineCount = lines.length;

  // Custom Hook for Autocomplete Logic
  const { 
    suggestionState, 
    handleKeyUp, 
    handleKeyDown, 
    applySuggestion 
  } = useEditorAutocomplete(textareaRef, onChange);

  // --- Logic Handlers ---

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

  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
        gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
    if (overlayRef.current) {
        overlayRef.current.scrollTop = e.currentTarget.scrollTop;
        overlayRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }, []);

  const handleCursorActivity = useCallback(() => {
     if (!textareaRef.current) return;
     const el = textareaRef.current;
     const cursorIndex = el.selectionStart;
     const textUpToCursor = el.value.substring(0, cursorIndex);
     const currentLine = textUpToCursor.split('\n').length;
     setActiveLine(currentLine);
  }, []);

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

  // Combine event handlers for the textarea
  const onTextareaKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      handleCursorActivity();
      handleKeyUp(e);
  };

  return (
    <div className="w-full h-full flex flex-col bg-md-sys-surface rounded-3xl border border-md-sys-outline/20 overflow-hidden shadow-sm transition-shadow hover:shadow-md relative">
      
      <EditorToolbar 
        onImport={onImport}
        onExport={onExport}
        onTransposeClick={handleTransposeClick}
      />

      {/* Editor Body */}
      <div className="flex-1 relative min-h-0 flex" ref={containerRef}>
        
        <EditorGutter 
          lineCount={lineCount}
          activeLine={activeLine}
          errors={errors}
          gutterRef={gutterRef}
        />

        {/* Editor Area with Adaptive Background */}
        <div className="flex-1 relative h-full overflow-hidden bg-white dark:bg-[#1E1E1E]"> 
            
            <SyntaxOverlay 
              lines={lines}
              errors={errors}
              overlayRef={overlayRef}
            />

            {/* Interactive Textarea (Transparent) */}
            <textarea
              ref={textareaRef}
              id={textareaId}
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              onScroll={handleScroll}
              onClick={handleCursorActivity}
              onKeyUp={onTextareaKeyUp}
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
