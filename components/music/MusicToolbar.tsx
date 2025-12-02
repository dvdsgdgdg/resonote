
import React, { useState, useMemo } from 'react';
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
    instrument: number;
    onInstrumentChange: (program: number) => void;
}

// Curated General MIDI Instruments grouped by Category with Icons
const INSTRUMENT_GROUPS = [
    {
        category: "Keyboards",
        items: [
            { name: 'Acoustic Grand Piano', program: 0, icon: 'piano' },
            { name: 'Bright Acoustic Piano', program: 1, icon: 'piano' },
            { name: 'Electric Grand Piano', program: 2, icon: 'piano' },
            { name: 'Honky-tonk Piano', program: 3, icon: 'piano' },
            { name: 'Electric Piano 1 (Rhodes)', program: 4, icon: 'keyboard' },
            { name: 'Electric Piano 2 (DX7)', program: 5, icon: 'keyboard' },
            { name: 'Harpsichord', program: 6, icon: 'piano' },
            { name: 'Clavinet', program: 7, icon: 'piano' },
            { name: 'Celesta', program: 8, icon: 'notifications' },
            { name: 'Glockenspiel', program: 9, icon: 'notifications_active' },
            { name: 'Music Box', program: 10, icon: 'toys' },
            { name: 'Vibraphone', program: 11, icon: 'grid_view' },
            { name: 'Marimba', program: 12, icon: 'grid_view' },
            { name: 'Xylophone', program: 13, icon: 'grid_view' },
        ]
    },
    {
        category: "Organs",
        items: [
            { name: 'Drawbar Organ', program: 16, icon: 'tune' },
            { name: 'Percussive Organ', program: 17, icon: 'tune' },
            { name: 'Rock Organ', program: 18, icon: 'speaker' },
            { name: 'Church Organ', program: 19, icon: 'church' },
            { name: 'Reed Organ', program: 20, icon: 'air' },
            { name: 'Accordion', program: 21, icon: 'unfold_more' },
            { name: 'Harmonica', program: 22, icon: 'air' },
        ]
    },
    {
        category: "Guitars & Bass",
        items: [
            { name: 'Acoustic Guitar (Nylon)', program: 24, icon: 'music_note' },
            { name: 'Acoustic Guitar (Steel)', program: 25, icon: 'music_note' },
            { name: 'Electric Guitar (Jazz)', program: 26, icon: 'graphic_eq' },
            { name: 'Electric Guitar (Clean)', program: 27, icon: 'graphic_eq' },
            { name: 'Overdriven Guitar', program: 29, icon: 'bolt' },
            { name: 'Distortion Guitar', program: 30, icon: 'flash_on' },
            { name: 'Acoustic Bass', program: 32, icon: 'music_note' },
            { name: 'Electric Bass (Finger)', program: 33, icon: 'graphic_eq' },
            { name: 'Electric Bass (Pick)', program: 34, icon: 'graphic_eq' },
            { name: 'Fretless Bass', program: 35, icon: 'graphic_eq' },
            { name: 'Slap Bass 1', program: 36, icon: 'graphic_eq' },
            { name: 'Synth Bass 1', program: 38, icon: 'memory' },
        ]
    },
    {
        category: "Strings & Orchestral",
        items: [
            { name: 'Violin', program: 40, icon: 'music_note' },
            { name: 'Viola', program: 41, icon: 'music_note' },
            { name: 'Cello', program: 42, icon: 'music_note' },
            { name: 'Contrabass', program: 43, icon: 'music_note' },
            { name: 'Tremolo Strings', program: 44, icon: 'waves' },
            { name: 'Pizzicato Strings', program: 45, icon: 'more_horiz' },
            { name: 'Orchestral Harp', program: 46, icon: 'linear_scale' },
            { name: 'Timpani', program: 47, icon: 'circle' },
            { name: 'String Ensemble 1', program: 48, icon: 'groups' },
            { name: 'String Ensemble 2', program: 49, icon: 'groups' },
            { name: 'Synth Strings 1', program: 50, icon: 'memory' },
            { name: 'Choir Aahs', program: 52, icon: 'record_voice_over' },
            { name: 'Voice Oohs', program: 53, icon: 'record_voice_over' },
        ]
    },
    {
        category: "Brass & Winds",
        items: [
            { name: 'Trumpet', program: 56, icon: 'campaign' },
            { name: 'Trombone', program: 57, icon: 'campaign' },
            { name: 'Tuba', program: 58, icon: 'campaign' },
            { name: 'Muted Trumpet', program: 59, icon: 'volume_mute' },
            { name: 'French Horn', program: 60, icon: 'campaign' },
            { name: 'Brass Section', program: 61, icon: 'groups' },
            { name: 'Soprano Sax', program: 64, icon: 'air' },
            { name: 'Alto Sax', program: 65, icon: 'air' },
            { name: 'Tenor Sax', program: 66, icon: 'air' },
            { name: 'Baritone Sax', program: 67, icon: 'air' },
            { name: 'Oboe', program: 68, icon: 'air' },
            { name: 'Bassoon', program: 70, icon: 'air' },
            { name: 'Clarinet', program: 71, icon: 'air' },
            { name: 'Piccolo', program: 72, icon: 'air' },
            { name: 'Flute', program: 73, icon: 'air' },
            { name: 'Pan Flute', program: 75, icon: 'air' },
        ]
    },
    {
        category: "Synths & Pads",
        items: [
            { name: 'Lead 1 (Square)', program: 80, icon: 'crop_square' },
            { name: 'Lead 2 (Sawtooth)', program: 81, icon: 'change_history' },
            { name: 'Lead 3 (Calliope)', program: 82, icon: 'toys' },
            { name: 'Pad 1 (New age)', program: 88, icon: 'blur_on' },
            { name: 'Pad 2 (Warm)', program: 89, icon: 'wb_sunny' },
            { name: 'Pad 3 (Polysynth)', program: 90, icon: 'grid_on' },
            { name: 'FX 1 (Rain)', program: 96, icon: 'water_drop' },
            { name: 'FX 4 (Atmosphere)', program: 99, icon: 'cloud' },
            { name: 'FX 5 (Brightness)', program: 100, icon: 'light_mode' },
        ]
    }
];

export const MusicToolbar: React.FC<MusicToolbarProps> = ({
    audioId,
    voices,
    muted,
    solos,
    onToggleMute,
    onToggleSolo,
    onExport,
    exportingState,
    instrument,
    onInstrumentChange
}) => {
    const [showMixer, setShowMixer] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showInstrumentMenu, setShowInstrumentMenu] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const toggleExportMenu = () => {
        setShowExportMenu(!showExportMenu);
        setShowMixer(false);
        setShowInstrumentMenu(false);
    };

    const toggleMixer = () => {
        setShowMixer(!showMixer);
        setShowExportMenu(false);
        setShowInstrumentMenu(false);
    };

    const toggleInstrumentMenu = () => {
        setShowInstrumentMenu(!showInstrumentMenu);
        setShowMixer(false);
        setShowExportMenu(false);
        if (!showInstrumentMenu) {
            setSearchTerm(""); // Reset search when opening
        }
    };

    const handleInstrumentSelect = (prog: number) => {
        onInstrumentChange(prog);
        setShowInstrumentMenu(false);
        setSearchTerm("");
    };

    const currentInstrument = useMemo(() => {
        for (const group of INSTRUMENT_GROUPS) {
            const found = group.items.find(i => i.program === instrument);
            if (found) return found;
        }
        return { name: 'Grand Piano', icon: 'piano' };
    }, [instrument]);

    const filteredGroups = useMemo(() => {
        if (!searchTerm.trim()) return INSTRUMENT_GROUPS;
        const lowerTerm = searchTerm.toLowerCase();
        
        return INSTRUMENT_GROUPS.map(group => ({
            ...group,
            items: group.items.filter(item => 
                item.name.toLowerCase().includes(lowerTerm)
            )
        })).filter(group => group.items.length > 0);
    }, [searchTerm]);

    return (
        <div className="flex flex-col border-b border-md-sys-outline/10 bg-md-sys-surface z-10 shadow-sm" onClick={(e) => e.stopPropagation()}>
            
            {/* Row 1: Audio Player (Full Width) */}
            <div className="w-full px-4 py-3 border-b border-md-sys-outline/10 bg-md-sys-surface">
                 <div id={audioId} className="w-full min-h-[40px] flex items-center justify-center">
                     {/* Audio controls render here automatically by abcjs */}
                 </div>
            </div>
            
            {/* Row 2: Menu Controls (Right Aligned) */}
            <div className="flex items-center justify-end px-4 py-2 gap-2 overflow-visible relative bg-md-sys-surface">
                
                {/* Instrument Selector */}
                <div className="relative">
                     <button
                        onClick={toggleInstrumentMenu}
                        className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 border ${showInstrumentMenu ? 'bg-md-sys-surfaceVariant border-md-sys-outline/20 text-md-sys-onSurface shadow-inner' : 'border-transparent hover:bg-md-sys-surfaceVariant text-md-sys-onSurface'}`}
                        title="Change Instrument"
                     >
                        <span className="material-symbols-rounded text-lg text-md-sys-primary">{currentInstrument.icon}</span>
                        <span className="text-sm font-medium hidden sm:block max-w-[150px] truncate">
                            {currentInstrument.name}
                        </span>
                        <span className="material-symbols-rounded text-sm opacity-60">expand_more</span>
                     </button>

                     {showInstrumentMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowInstrumentMenu(false)}></div>
                            <div className="absolute top-full right-0 mt-2 w-72 bg-md-sys-surface rounded-xl shadow-2xl border border-md-sys-outline/10 z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 ring-1 ring-md-sys-outline/5">
                                
                                {/* Search Header */}
                                <div className="p-2 border-b border-md-sys-outline/10 bg-md-sys-surface">
                                    <div className="relative">
                                        <span className="material-symbols-rounded absolute left-2.5 top-1/2 -translate-y-1/2 text-md-sys-secondary text-[16px]">search</span>
                                        <input 
                                            type="text" 
                                            placeholder="Find instrument..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-md-sys-surfaceVariant/50 text-md-sys-onSurface text-[13px] rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-md-sys-primary border border-transparent placeholder:text-md-sys-outline"
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>

                                {/* Scrollable List */}
                                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                    {filteredGroups.length === 0 ? (
                                        <div className="p-8 text-center text-md-sys-secondary flex flex-col items-center gap-2 opacity-60">
                                            <span className="material-symbols-rounded text-2xl">music_off</span>
                                            <span className="text-xs">No sounds found</span>
                                        </div>
                                    ) : (
                                        filteredGroups.map((group, groupIdx) => (
                                            <div key={groupIdx} className="border-b border-md-sys-outline/10 last:border-b-0">
                                                <div className="px-4 py-1.5 bg-md-sys-surfaceVariant/20 sticky top-0 backdrop-blur-sm z-10 border-b border-md-sys-outline/5">
                                                    <span className="text-[10px] font-bold text-md-sys-primary uppercase tracking-widest">
                                                        {group.category}
                                                    </span>
                                                </div>
                                                <div>
                                                    {group.items.map((inst) => (
                                                        <button
                                                            key={inst.program}
                                                            onClick={() => handleInstrumentSelect(inst.program)}
                                                            className={`w-full text-left px-4 py-2 text-[13px] transition-colors flex items-center gap-3 group ${instrument === inst.program ? 'bg-md-sys-primary/10 text-md-sys-primary' : 'text-md-sys-onSurface hover:bg-md-sys-surfaceVariant/50'}`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${instrument === inst.program ? 'bg-md-sys-primary text-md-sys-onPrimary' : 'bg-md-sys-surfaceVariant/50 text-md-sys-secondary group-hover:bg-md-sys-surfaceVariant group-hover:text-md-sys-onSurface'}`}>
                                                                <span className="material-symbols-rounded text-[18px]">{inst.icon}</span>
                                                            </div>
                                                            <span className="font-medium">{inst.name}</span>
                                                            {instrument === inst.program && (
                                                                <span className="material-symbols-rounded text-[16px] ml-auto">check</span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                     )}
                </div>

                <div className="w-px h-6 bg-md-sys-outline/20 mx-1"></div>

                {/* Mixer Button */}
                {voices.length > 0 && (
                    <div className="relative">
                        <button 
                            onClick={toggleMixer}
                            className={`p-2 rounded-lg transition-colors flex items-center gap-2 border ${showMixer ? 'bg-md-sys-primary border-md-sys-primary text-md-sys-onPrimary shadow-md' : 'border-transparent hover:bg-md-sys-surfaceVariant text-md-sys-onSurface'}`}
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

                <div className="w-px h-6 bg-md-sys-outline/20 mx-1"></div>

                {/* Grouped Export Button */}
                <div className="relative">
                    <button
                        onClick={toggleExportMenu}
                        className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 border ${showExportMenu ? 'bg-md-sys-surfaceVariant border-md-sys-outline/20 text-md-sys-onSurface' : 'border-transparent hover:bg-md-sys-surfaceVariant text-md-sys-onSurface'}`}
                        disabled={!!exportingState}
                    >
                        {exportingState ? (
                            <span className="material-symbols-rounded text-lg animate-spin">progress_activity</span>
                        ) : (
                            <span className="material-symbols-rounded text-lg text-md-sys-secondary">ios_share</span>
                        )}
                        <span className="text-sm font-medium">Export</span>
                        <span className="material-symbols-rounded text-sm opacity-60">expand_more</span>
                    </button>

                    {/* Nested Export Menu */}
                    {showExportMenu && (
                        <>
                             <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)}></div>
                             <div className="absolute top-full right-0 mt-2 w-56 bg-md-sys-surface rounded-xl shadow-2xl border border-md-sys-outline/10 z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-md-sys-outline/5">
                                 
                                 {/* Documents Group */}
                                 <div className="px-3 py-1.5 border-b border-md-sys-outline/10 text-[10px] font-bold text-md-sys-secondary uppercase tracking-wider">
                                     Documents
                                 </div>
                                 <button onClick={() => onExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-md-sys-onSurface hover:bg-md-sys-surfaceVariant/50 transition-colors flex items-center gap-3">
                                     <span className="material-symbols-rounded text-lg text-red-400">picture_as_pdf</span> PDF Document
                                 </button>
                                 <button onClick={() => onExport('doc')} className="w-full text-left px-4 py-2 text-sm text-md-sys-onSurface hover:bg-md-sys-surfaceVariant/50 transition-colors flex items-center gap-3">
                                     <span className="material-symbols-rounded text-lg text-blue-400">description</span> Word (.doc)
                                 </button>

                                 {/* Images Group */}
                                 <div className="px-3 py-1.5 mt-1 border-y border-md-sys-outline/10 text-[10px] font-bold text-md-sys-secondary uppercase tracking-wider bg-md-sys-surfaceVariant/20">
                                     Images
                                 </div>
                                 <button onClick={() => onExport('png')} className="w-full text-left px-4 py-2 text-sm text-md-sys-onSurface hover:bg-md-sys-surfaceVariant/50 transition-colors flex items-center gap-3">
                                     <span className="material-symbols-rounded text-lg text-emerald-400">image</span> PNG
                                 </button>
                                 <button onClick={() => onExport('jpg')} className="w-full text-left px-4 py-2 text-sm text-md-sys-onSurface hover:bg-md-sys-surfaceVariant/50 transition-colors flex items-center gap-3">
                                     <span className="material-symbols-rounded text-lg text-emerald-400">image</span> JPG
                                 </button>
                                 <button onClick={() => onExport('webp')} className="w-full text-left px-4 py-2 text-sm text-md-sys-onSurface hover:bg-md-sys-surfaceVariant/50 transition-colors flex items-center gap-3">
                                     <span className="material-symbols-rounded text-lg text-emerald-400">image</span> WebP
                                 </button>
                                 <button onClick={() => onExport('svg')} className="w-full text-left px-4 py-2 text-sm text-md-sys-onSurface hover:bg-md-sys-surfaceVariant/50 transition-colors flex items-center gap-3">
                                     <span className="material-symbols-rounded text-lg text-orange-400">draw</span> SVG
                                 </button>

                                 {/* Audio Group */}
                                 <div className="px-3 py-1.5 mt-1 border-y border-md-sys-outline/10 text-[10px] font-bold text-md-sys-secondary uppercase tracking-wider bg-md-sys-surfaceVariant/20">
                                     Audio
                                 </div>
                                 <button onClick={() => onExport('midi')} className="w-full text-left px-4 py-2 text-sm text-md-sys-onSurface hover:bg-md-sys-surfaceVariant/50 transition-colors flex items-center gap-3">
                                     <span className="material-symbols-rounded text-lg text-amber-400">piano</span> MIDI
                                 </button>
                                 <button onClick={() => onExport('wav')} className="w-full text-left px-4 py-2 text-sm text-md-sys-onSurface hover:bg-md-sys-surfaceVariant/50 transition-colors flex items-center gap-3">
                                     <span className="material-symbols-rounded text-lg text-blue-400">headphones</span> WAV
                                 </button>
                                 <button onClick={() => onExport('mp3')} className="w-full text-left px-4 py-2 text-sm text-md-sys-onSurface hover:bg-md-sys-surfaceVariant/50 transition-colors flex items-center gap-3">
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
