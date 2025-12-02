
import React, { memo } from 'react';
import { EditorError, tokenizeLine, getTokenColor } from '../../utils/abcHighlighter';

interface SyntaxOverlayProps {
  lines: string[];
  errors: EditorError[];
  overlayRef: React.RefObject<HTMLDivElement>;
}

export const SyntaxOverlay = memo(({ lines, errors, overlayRef }: SyntaxOverlayProps) => {
  return (
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
                             
                             if (errIdxInToken > lastTokenIdx) {
                                 nodes.push(token.content.substring(lastTokenIdx, errIdxInToken));
                             }
                             
                             // Error Char
                             nodes.push(
                                 <span key={`err-${tIdx}-${errSeq}`} className="bg-red-500/50 border-b-2 border-red-500 text-white rounded-sm">
                                     {token.content.charAt(errIdxInToken)}
                                 </span>
                             );
                             
                             lastTokenIdx = errIdxInToken + 1;
                         });
                         
                         if (lastTokenIdx < token.content.length) {
                             nodes.push(token.content.substring(lastTokenIdx));
                         }
                         
                         return <span key={tIdx} className={colorClass}>{nodes}</span>;
                     })}
                     
                     {/* EOL Error */}
                     {lineErrors.some(e => (e.col! - 1) >= lineContent.length) && (
                        <span className="bg-red-500/50 border-b-2 border-red-500 inline-block w-[1ch]">&nbsp;</span>
                     )}
                </div>
            );
        })}
    </div>
  );
});

SyntaxOverlay.displayName = 'SyntaxOverlay';
