import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface AILoggerProps {
  logs: LogEntry[];
  visible: boolean;
}

// Robust Markdown Formatter
const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <>
      {lines.map((line, i) => (
        <div key={i} className={`min-h-[1.2em] ${line.trim() === '' ? 'h-2' : ''} whitespace-pre-wrap`}>
          {/* 
            Regex to capture:
            1. **Bold**
            2. *Italic*
            3. `Code`
            4. "Quotes"
          */}
          {line.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|".*?")/g).map((part, j) => {
            // Bold
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={j} className="text-white font-bold">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            // Italic
            if (part.startsWith('*') && part.endsWith('*')) {
              return (
                <em key={j} className="text-md-sys-tertiary italic">
                  {part.slice(1, -1)}
                </em>
              );
            }
            // Inline Code
            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <code key={j} className="bg-white/10 px-1.5 py-0.5 rounded text-amber-300 font-mono text-[11px] font-bold mx-0.5 border border-white/5">
                  {part.slice(1, -1)}
                </code>
              );
            }
            // Quotes (Double or Single)
            if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
              return (
                <span key={j} className="text-emerald-300">
                  {part}
                </span>
              );
            }
            // Regular Text
            return <span key={j}>{part}</span>;
          })}
        </div>
      ))}
    </>
  );
};

export const AILogger: React.FC<AILoggerProps> = ({ logs, visible }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, visible]);

  if (!visible && logs.length === 0) return null;

  return (
    <div className={`mt-4 w-full rounded-xl overflow-hidden bg-[#0a0a0a] border border-md-sys-outline/30 backdrop-blur-md transition-all duration-500 ease-in-out shadow-inner ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] font-mono font-bold text-md-sys-secondary uppercase tracking-widest">System Status</span>
        </div>
        <span className="text-[10px] font-mono text-md-sys-outline">RESONOTE-AI</span>
      </div>
      
      <div 
        ref={scrollRef}
        className="p-4 max-h-[300px] overflow-y-auto font-mono text-xs space-y-3 scroll-smooth"
      >
        {logs.map((log, idx) => (
          <div key={idx} className="flex gap-3 group">
            <span className="text-md-sys-outline shrink-0 opacity-40 select-none pt-0.5 text-[10px] w-[50px]">{log.timestamp}</span>
            <div className={`flex-1 break-words leading-relaxed ${
              log.type === 'warning' ? 'text-red-400' :
              log.type === 'success' ? 'text-emerald-400' :
              log.type === 'thinking' ? 'text-md-sys-primary' :
              'text-md-sys-secondary'
            }`}>
              <div className="flex gap-2">
                <span className={`opacity-50 mt-[1px] ${log.type === 'thinking' ? 'animate-pulse text-md-sys-primary' : 'text-md-sys-outline'}`}>{'>'}</span>
                <div className={log.type === 'thinking' ? 'animate-pulse' : ''}>
                    <MarkdownText text={log.message} />
                </div>
              </div>
            </div>
          </div>
        ))}
        {visible && logs.length > 0 && logs[logs.length-1].type !== 'success' && logs[logs.length-1].type !== 'warning' && (
           <div className="flex gap-3 animate-pulse opacity-50 pl-[74px]">
             <span className="text-md-sys-primary">_</span>
           </div>
        )}
      </div>
    </div>
  );
};