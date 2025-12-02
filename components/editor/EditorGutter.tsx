
import React, { memo } from 'react';
import { EditorError } from '../../utils/abcHighlighter';

interface EditorGutterProps {
  lineCount: number;
  activeLine: number;
  errors: EditorError[];
  gutterRef: React.RefObject<HTMLDivElement>;
}

export const EditorGutter = memo(({ lineCount, activeLine, errors, gutterRef }: EditorGutterProps) => {
  return (
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
  );
});

EditorGutter.displayName = 'EditorGutter';
