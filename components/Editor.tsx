
import React, { useEffect, useState, useRef } from 'react';

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
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

    // 2. Debounce history commit (Wait 1s after last keystroke)
    if (onCommitHistory) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            onCommitHistory();
        }, 1000);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-md-sys-surface rounded-3xl border border-md-sys-outline/20 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-md-sys-outline/20 bg-md-sys-surfaceVariant/50">
        <div className="flex items-center">
          <span className="material-symbols-rounded text-md-sys-primary mr-3">code</span>
          <h3 className="text-md font-medium text-md-sys-onSurface tracking-wide">ABC Notation Source</h3>
        </div>
        <div className="flex items-center gap-1">
             {/* Transpose Controls */}
             <div className="flex items-center mr-2 bg-black/20 rounded-lg p-0.5 border border-white/5">
                <button 
                  onClick={() => onTranspose(-1)}
                  className="p-1.5 hover:bg-white/10 rounded-md text-md-sys-secondary hover:text-white transition-colors"
                  title="Transpose Down (-1 Semitone)"
                >
                   <span className="material-symbols-rounded text-[18px]">remove</span>
                </button>
                <span className="text-[10px] font-bold text-md-sys-secondary px-2 uppercase tracking-wider select-none">Transpose</span>
                <button 
                  onClick={() => onTranspose(1)}
                  className="p-1.5 hover:bg-white/10 rounded-md text-md-sys-secondary hover:text-white transition-colors"
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
      <div className="flex-1 relative min-h-0">
        <textarea
          id={textareaId}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full h-full bg-transparent p-6 text-sm font-mono text-md-sys-secondary resize-none focus:outline-none focus:ring-0 leading-relaxed"
          spellCheck={false}
        />
        <div className="absolute bottom-4 right-4 text-xs text-md-sys-outline pointer-events-none">
          Powered by Google AI
        </div>
      </div>
      {warningId && (
        <div 
          id={warningId}
          className={`empty:hidden border-t border-md-sys-outline/20 text-xs font-mono p-4 max-h-[150px] overflow-auto whitespace-pre-wrap shadow-inner transition-colors duration-300 ${
            isSuccess 
              ? "bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
              : "bg-red-900/10 text-red-600 dark:text-red-300 border-red-500/20"
          }`}
        >
        </div>
      )}
    </div>
  );
};
