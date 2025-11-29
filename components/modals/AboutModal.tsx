import React from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#2B2B2B] rounded-[28px] p-8 shadow-2xl max-w-md w-full flex flex-col items-center animate-in zoom-in-95 duration-200 ring-1 ring-white/5">
        
        <div className="w-16 h-16 bg-md-sys-primary/10 rounded-2xl flex items-center justify-center mb-6 text-md-sys-primary shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-10 h-10 fill-current">
            <rect width="32" height="32" rx="10" className="opacity-0"/> 
            <path d="M20 10V6h-7v12.5c0 1.93-1.57 3.5-3.5 3.5S6 20.43 6 18.5 7.57 15 9.5 15c.47 0 .91.1 1.32.26V10h9z" transform="translate(2, 2)"/>
            <path d="M26 4l-1.5 3L21.5 8.5 24.5 10 26 13l1.5-3 3-1.5-3-1.5z"/>
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">Resonote</h2>
        <p className="text-xs font-mono text-md-sys-primary mb-6 bg-md-sys-primary/10 px-2 py-1 rounded">v1.0.0 Public Preview</p>
        
        <p className="text-sm text-gray-300 text-center leading-relaxed mb-8 px-2">
            Resonote is an advanced AI-powered sheet music digitizer. 
            Leveraging the multimodal capabilities of <strong className="text-white">Gemini 3 Pro</strong>, 
            it transforms static sheet music images into editable, playable ABC notation with high fidelity—preserving rhythm, pitch, and lyrics.
        </p>

        <div className="w-full bg-[#1E1E1E] rounded-xl p-4 mb-8 flex items-center gap-4 border border-white/5">
            <div className="w-10 h-10 rounded-full bg-md-sys-surfaceVariant flex items-center justify-center text-md-sys-secondary">
                <span className="material-symbols-rounded text-xl">person</span>
            </div>
            <div className="flex-1">
                <p className="text-xs text-md-sys-secondary uppercase tracking-wider font-bold mb-0.5">Created by</p>
                <p className="text-sm text-white font-medium">IRedDragonICY</p>
                <p className="text-[10px] text-gray-400">Mohammad Farid Hendianto</p>
            </div>
        </div>

        <button 
            onClick={onClose}
            className="w-full py-3 bg-md-sys-primary text-md-sys-onPrimary rounded-full font-semibold hover:bg-[#8AB4F8] transition-colors"
        >
            Close
        </button>
      </div>
    </div>
  );
};