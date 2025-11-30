
import React, { useState } from 'react';
import { AudioMixer } from './AudioMixer';

interface MusicToolbarProps {
    audioId: string;
    voices: { id: number; name: string }[];
    muted: Set<number>;
    solos: Set<number>;
    onToggleMute: (id: number) => void;
    onToggleSolo: (id: number) => void;
    onExport: (type: 'png' | 'jpg' | 'webp' | 'svg' | 'pdf' | 'doc' | 'midi' | 'wav' | 'mp3') => void;
    exportingState: string | null;
}

export const MusicToolbar: React.FC<MusicToolbarProps> = ({
    audioId,
    voices,
    muted,
    solos,
    onToggleMute,
    onToggleSolo,
    onExport,
    exportingState
}) => {
    const [showMixer, setShowMixer] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const toggleExportMenu = () => {
        setShowExportMenu(!showExportMenu);
        setShowMixer(false);
    };

    const toggleMixer = () => {
        setShowMixer(!showMixer);
        setShowExportMenu(false);
    };

    return (
        <div className="flex flex-col border-b border-md-sys-outline/10 bg-md-sys-surfaceVariant/5 z-10" onClick={(e) => e.stopPropagation()}>
            
            {/* Row 1: Audio Player (Full Width) */}
            <div className="w-full px-4 py-2 border-b border-black/5">
                 <div id={audioId} className="w-full min-h-[40px] flex items-center justify-center">
                     {/* Audio controls render here automatically by abcjs */}
                 </div>
            </div>
            
            {/* Row 2: Menu Controls (Right Aligned) */}
            <div className="flex items-center justify-end px-4 py-2 gap-1 overflow-visible relative">
                
                {/* Mixer Button */}
                {voices.length > 0 && (
                    <div className="relative">
                        <button 
                            onClick={toggleMixer}
                            className={`p-2 rounded transition-colors flex items-center gap-2 ${showMixer ? 'bg-md-sys-primary text-white' : 'hover:bg-black/5 text-md-sys-secondary hover:text-black'}`}
                            title="Audio Mixer"
                        >
                            <span className="material-symbols-rounded text-lg">tune</span>
                        </button>

                        {/* Mixer Popover */}
                        {showMixer && (
                            <AudioMixer 
                                voices={voices}
                                muted={muted}
                                solos={solos}
                                onToggleMute={onToggleMute}
                                onToggleSolo={onToggleSolo}
                            />
                        )}
                    </div>
                )}

                <div className="w-px h-6 bg-black/10 mx-1"></div>

                {/* Grouped Export Button */}
                <div className="relative">
                    <button
                        onClick={toggleExportMenu}
                        className={`px-3 py-1.5 rounded transition-colors flex items-center gap-2 ${showExportMenu ? 'bg-black/10 text-white' : 'hover:bg-black/5 text-md-sys-secondary hover:text-black'}`}
                        disabled={!!exportingState}
                    >
                        {exportingState ? (
                            <span className="material-symbols-rounded text-lg animate-spin">progress_activity</span>
                        ) : (
                            <span className="material-symbols-rounded text-lg">ios_share</span>
                        )}
                        <span className="text-sm font-medium">Export</span>
                        <span className="material-symbols-rounded text-sm">expand_more</span>
                    </button>

                    {/* Nested Export Menu */}
                    {showExportMenu && (
                        <>
                             <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)}></div>
                             <div className="absolute top-full right-0 mt-2 w-56 bg-[#1E1E1E] rounded-xl shadow-2xl border border-white/10 z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-white/5">
                                 
                                 {/* Documents Group */}
                                 <div className="px-3 py-1.5 border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                     Documents
                                 </div>
                                 <button onClick={() => onExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3">
                                     <span className="material-symbols-rounded text-lg text-red-400">picture_as_pdf</span> PDF Document
                                 </button>
                                 <button onClick={() => onExport('doc')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3">
                                     <span className="material-symbols-rounded text-lg text-blue-400">description</span> Word (.doc)
                                 </button>

                                 {/* Images Group */}
                                 <div className="px-3 py-1.5 mt-1 border-y border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-black/20">
                                     Images
                                 </div>
                                 <button onClick={() => onExport('png')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3">
                                     <span className="material-symbols-rounded text-lg text-emerald-400">image</span> PNG
                                 </button>
                                 <button onClick={() => onExport('jpg')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3">
                                     <span className="material-symbols-rounded text-lg text-emerald-400">image</span> JPG
                                 </button>
                                 <button onClick={() => onExport('webp')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3">
                                     <span className="material-symbols-rounded text-lg text-emerald-400">image</span> WebP
                                 </button>
                                 <button onClick={() => onExport('svg')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3">
                                     <span className="material-symbols-rounded text-lg text-orange-400">draw</span> SVG
                                 </button>

                                 {/* Audio Group */}
                                 <div className="px-3 py-1.5 mt-1 border-y border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-black/20">
                                     Audio
                                 </div>
                                 <button onClick={() => onExport('midi')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3">
                                     <span className="material-symbols-rounded text-lg text-amber-400">piano</span> MIDI
                                 </button>
                                 <button onClick={() => onExport('wav')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3">
                                     <span className="material-symbols-rounded text-lg text-blue-400">headphones</span> WAV
                                 </button>
                                 <button onClick={() => onExport('mp3')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3">
                                     <span className="material-symbols-rounded text-lg text-purple-400">music_note</span> MP3
                                 </button>
                             </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
