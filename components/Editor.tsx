import React from 'react';

interface EditorProps {
  value: string;
  onChange: (val: string) => void;
  warningId?: string;
}

export const Editor: React.FC<EditorProps> = ({ value, onChange, warningId }) => {
  return (
    <div className="w-full h-full flex flex-col bg-md-sys-surface rounded-3xl border border-md-sys-outline overflow-hidden">
      <div className="flex items-center px-6 py-4 border-b border-md-sys-outline bg-md-sys-surfaceVariant/50">
        <span className="material-symbols-rounded text-md-sys-primary mr-3">code</span>
        <h3 className="text-md font-medium text-white tracking-wide">ABC Notation Source</h3>
      </div>
      <div className="flex-1 relative min-h-0">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
          className="empty:hidden border-t border-md-sys-outline/30 bg-[#2a1515] text-red-300 text-xs font-mono p-4 max-h-[150px] overflow-auto whitespace-pre-wrap shadow-inner"
        >
        </div>
      )}
    </div>
  );
};