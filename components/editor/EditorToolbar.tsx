
import React from 'react';

interface EditorToolbarProps {
  onImport: () => void;
  onExport: () => void;
  onTransposeClick: (semitones: number) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ onImport, onExport, onTransposeClick }) => {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-md-sys-outline/20 bg-md-sys-surfaceVariant/50 backdrop-blur-sm z-10">
      <div className="flex items-center">
        <span className="material-symbols-rounded text-md-sys-primary mr-3 text-[22px]">code</span>
        <h3 className="text-sm font-bold text-md-sys-onSurface tracking-wider uppercase opacity-90">ABC Editor</h3>
      </div>
      <div className="flex items-center gap-1">
           <div className="flex items-center mr-2 bg-md-sys-surface/80 rounded-lg p-0.5 border border-md-sys-outline/10 shadow-sm">
              <button 
                onClick={() => onTransposeClick(-1)} 
                className="p-1.5 hover:bg-md-sys-surfaceVariant rounded-md text-md-sys-onSurface hover:text-md-sys-primary transition-colors" 
                title="Transpose Down"
              >
                 <span className="material-symbols-rounded text-[18px]">remove</span>
              </button>
              <span className="text-[10px] font-bold text-md-sys-secondary px-2 uppercase tracking-wider select-none">Transpose</span>
              <button 
                onClick={() => onTransposeClick(1)} 
                className="p-1.5 hover:bg-md-sys-surfaceVariant rounded-md text-md-sys-onSurface hover:text-md-sys-primary transition-colors" 
                title="Transpose Up"
              >
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
  );
};
