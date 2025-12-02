import React, { useEffect, useRef } from 'react';

export interface SuggestionOption {
  label: string;
  value: string;
  info?: string;
  icon?: string;
}

interface AutocompleteMenuProps {
  options: SuggestionOption[];
  selectedIndex: number;
  onSelect: (option: SuggestionOption) => void;
  position: { top: number; left: number };
  trigger: string;
}

export const AutocompleteMenu: React.FC<AutocompleteMenuProps> = ({
  options,
  selectedIndex,
  onSelect,
  position,
  trigger
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selectedRef.current) {
        selectedRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <div 
        ref={menuRef}
        className="absolute z-50 flex flex-col w-64 bg-md-sys-surface/90 backdrop-blur-md rounded-xl shadow-2xl border border-md-sys-outline/20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5"
        style={{ 
            top: position.top + 24, // Offset slightly below cursor
            left: position.left 
        }}
    >
        <div className="px-3 py-1.5 bg-md-sys-surfaceVariant/50 border-b border-md-sys-outline/10 flex items-center justify-between">
            <span className="text-[10px] font-bold text-md-sys-secondary uppercase tracking-wider">
                {trigger === 'K:' ? 'Key Signature' : trigger === 'M:' ? 'Meter' : trigger === 'L:' ? 'Unit Length' : 'Suggestion'}
            </span>
            <span className="text-[10px] text-md-sys-outline">
                ↵ to select
            </span>
        </div>
        
        <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
            {options.map((option, index) => (
                <button
                    key={index}
                    ref={index === selectedIndex ? selectedRef : null}
                    onClick={() => onSelect(option)}
                    className={`
                        w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between group transition-all duration-75
                        ${index === selectedIndex 
                            ? 'bg-md-sys-primary text-md-sys-onPrimary shadow-md transform scale-[1.02]' 
                            : 'text-md-sys-onSurface hover:bg-md-sys-surfaceVariant/50'
                        }
                    `}
                >
                    <div className="flex items-center gap-2">
                        {option.icon && (
                            <span className={`material-symbols-rounded text-[16px] ${index === selectedIndex ? 'text-white' : 'text-md-sys-primary'}`}>
                                {option.icon}
                            </span>
                        )}
                        <span className="font-medium truncate">{option.label}</span>
                    </div>
                    {option.info && (
                        <span className={`text-[10px] font-mono opacity-80 ${index === selectedIndex ? 'text-white' : 'text-md-sys-secondary'}`}>
                            {option.info}
                        </span>
                    )}
                </button>
            ))}
        </div>
    </div>
  );
};