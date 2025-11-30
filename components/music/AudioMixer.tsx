
import React from 'react';

interface AudioMixerProps {
    voices: { id: number; name: string }[];
    muted: Set<number>;
    solos: Set<number>;
    onToggleMute: (id: number) => void;
    onToggleSolo: (id: number) => void;
}

export const AudioMixer: React.FC<AudioMixerProps> = ({ voices, muted, solos, onToggleMute, onToggleSolo }) => {
    return (
        <div className="absolute top-full right-0 mt-2 w-64 bg-[#1E1E1E] rounded-xl shadow-2xl border border-white/10 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-100 text-white">
            <div className="px-4 py-3 border-b border-white/10 bg-[#252525] flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Mixer</h4>
                <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-full text-gray-500">{voices.length} Tracks</span>
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
                {voices.map(v => {
                    const isMuted = muted.has(v.id);
                    const isSolo = solos.has(v.id);
                    const isImplicitlyMuted = solos.size > 0 && !isSolo;

                    return (
                        <div key={v.id} className={`flex items-center justify-between p-2 rounded-lg mb-1 ${isImplicitlyMuted ? 'opacity-50' : ''} hover:bg-white/5 transition-all`}>
                            <span className="text-xs font-medium truncate flex-1 mr-2 text-gray-300" title={v.name}>{v.name}</span>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => onToggleMute(v.id)}
                                    className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-colors ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'}`}
                                    title="Mute"
                                >
                                    M
                                </button>
                                <button 
                                    onClick={() => onToggleSolo(v.id)}
                                    className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-colors ${isSolo ? 'bg-yellow-500 text-black' : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'}`}
                                    title="Solo"
                                >
                                    S
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
