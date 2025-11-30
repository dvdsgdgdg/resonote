import React, { useEffect, useRef, useImperativeHandle, useCallback, useState } from 'react';
import abcjs from 'abcjs';
import { jsPDF } from 'jspdf';

interface MusicDisplayProps {
  abcNotation: string;
  warningId?: string;
  textareaId: string;
  onThumbnailGenerated?: (base64: string) => void;
}

export interface MusicDisplayHandle {
  exportFile: (type: 'png' | 'pdf' | 'midi' | 'wav' | 'mp3') => void;
}

interface VoiceInfo {
  id: number;
  name: string;
}

export const MusicDisplay = React.forwardRef<MusicDisplayHandle, MusicDisplayProps>(({ 
  abcNotation, 
  warningId, 
  textareaId,
  onThumbnailGenerated
}, ref) => {
  // Use stable IDs for the DOM elements
  const uniqueId = useRef(Math.random().toString(36).substr(2, 9)).current;
  const paperId = `abc-paper-${uniqueId}`;
  const audioId = `abc-audio-${uniqueId}`;
  
  const editorRef = useRef<any>(null);
  const thumbnailTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [exportingState, setExportingState] = useState<string | null>(null);

  // Mixer State
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [muted, setMuted] = useState<Set<number>>(new Set());
  const [solos, setSolos] = useState<Set<number>>(new Set());
  const [showMixer, setShowMixer] = useState(false);
  
  // Stable ref for the callback to prevent re-triggering effects on prop changes
  const onThumbnailGeneratedRef = useRef(onThumbnailGenerated);
  useEffect(() => {
    onThumbnailGeneratedRef.current = onThumbnailGenerated;
  }, [onThumbnailGenerated]);

  // --- 1. Voice Detection Logic (Decoupled from Editor) ---
  // This ensures immediate updates on Paste (Ctrl+V) or Delete All (Ctrl+A -> Del)
  // We parse the ABC string directly without waiting for the visual editor to render.
  useEffect(() => {
    // Handle Empty State immediately
    if (!abcNotation || abcNotation.trim() === "") {
        setVoices([]);
        setMuted(new Set());
        setSolos(new Set());
        return;
    }

    // Parse ABC synchronously to get voice metadata
    // This is lightweight compared to rendering
    const tunes = abcjs.parseOnly(abcNotation);
    const tune = tunes[0];

    if (tune && tune.lines) {
        const detectedVoices: VoiceInfo[] = [];
        let vCount = 0;
        
        // Scan the music lines to determine voice structure
        // We look for the first line that contains staff info
        const firstMusicLine = tune.lines.find((l: any) => l.staff);
        
        if (firstMusicLine && firstMusicLine.staff) {
            firstMusicLine.staff.forEach((st: any) => {
                    if (st.voices) {
                        st.voices.forEach((v: any, idx: number) => {
                            let name = `Track ${vCount + 1}`;
                            // Attempt to find voice name in title info
                            if (st.title && st.title[idx]) {
                                if (st.title[idx].name) name = st.title[idx].name;
                                else if (st.title[idx].subname) name = st.title[idx].subname;
                            }
                            detectedVoices.push({ id: vCount, name });
                            vCount++;
                        });
                    }
            });
        }
        
        // Update state if changed
        setVoices(prev => {
            if (JSON.stringify(detectedVoices) !== JSON.stringify(prev)) {
                // If the number of voices changed, reset mixer state to prevent index errors
                if (detectedVoices.length !== prev.length) {
                    setMuted(new Set());
                    setSolos(new Set());
                }
                return detectedVoices;
            }
            return prev;
        });
    } else {
        // Fallback if parse fails or no music lines found
        setVoices([]);
    }
  }, [abcNotation]);

  // --- 2. Editor Initialization ---
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 20; // Try for up to 2 seconds

    const initEditor = () => {
      const paper = document.getElementById(paperId);
      const audio = document.getElementById(audioId);
      const textarea = document.getElementById(textareaId);

      // Only initialize if all required elements are present in the DOM
      if (paper && audio && textarea) {
        
        // Define Custom Cursor Control to restore the visual progress line
        const cursorControl = {
          onStart: () => {
            const svg = paper.querySelector("svg");
            if (svg) {
                // Remove any existing cursor to prevent duplicates
                const existing = svg.querySelector(".abcjs-cursor");
                if(existing) existing.remove();

                const cursor = document.createElementNS("http://www.w3.org/2000/svg", "line");
                cursor.setAttribute("class", "abcjs-cursor");
                cursor.setAttributeNS(null, 'x1', '0');
                cursor.setAttributeNS(null, 'y1', '0');
                cursor.setAttributeNS(null, 'x2', '0');
                cursor.setAttributeNS(null, 'y2', '0');
                // Ensure visibility is handled by CSS, but set pointer events
                cursor.style.pointerEvents = "none";
                svg.appendChild(cursor);
            }
          },
          onEvent: (ev: any) => {
             // Handle case where event might be null or finished
             if (!ev) return;

             // Handle measure lines or events without coordinates
             if (ev.measureStart && ev.left === null) return;

             // 1. Move the Cursor Line
             const cursor = paper.querySelector(".abcjs-cursor");
             if (cursor) {
               // Safety check for properties
               const left = ev.left !== undefined ? ev.left : 0;
               const top = ev.top !== undefined ? ev.top : 0;
               const height = ev.height !== undefined ? ev.height : 0;

               // Adjust position slightly to center on note
               cursor.setAttribute("x1", (left - 2).toString());
               cursor.setAttribute("x2", (left - 2).toString());
               cursor.setAttribute("y1", top.toString());
               cursor.setAttribute("y2", (top + height).toString());
             }
             
             // 2. Highlight Notes (Remove old, Add new)
             const lastSelection = paper.querySelectorAll(".abcjs-highlight");
             for (let k = 0; k < lastSelection.length; k++)
                 lastSelection[k].classList.remove("abcjs-highlight");
 
             if (ev.elements) {
                 for (let i = 0; i < ev.elements.length; i++ ) {
                     const note = ev.elements[i];
                     if (note) {
                        for (let j = 0; j < note.length; j++) {
                            note[j].classList.add("abcjs-highlight");
                        }
                     }
                 }
             }
          },
          onFinished: () => {
            // Reset cursor and highlights
            const cursor = paper.querySelector(".abcjs-cursor");
            if (cursor) {
               cursor.setAttribute("x1", "0");
               cursor.setAttribute("x2", "0");
               cursor.setAttribute("y1", "0");
               cursor.setAttribute("y2", "0");
            }
            const lastSelection = paper.querySelectorAll(".abcjs-highlight");
             for (let k = 0; k < lastSelection.length; k++)
                 lastSelection[k].classList.remove("abcjs-highlight");
          }
        };

        if (editorRef.current) {
            return;
        }

        // Initialize the Editor with the synth and cursor control
        editorRef.current = new abcjs.Editor(textareaId, {
            paper_id: paperId,
            warnings_id: warningId,
            synth: {
                el: `#${audioId}`,
                cursorControl: cursorControl,
                options: { 
                    displayLoop: true, 
                    displayRestart: true, 
                    displayPlay: true, 
                    displayProgress: true, 
                    displayWarp: true 
                }
            },
            abcjsParams: {
                add_classes: true,
                responsive: 'resize',
                jazzchords: true,
                format: {
                    gchordfont: "Inter 12",
                    textfont: "Inter 12",
                    annotationfont: "Inter 10 italic",
                    vocalfont: "Inter 12",
                    partsfont: "Inter 12 box",
                    wordsfont: "Inter 12",
                    titlefont: "Inter 20 bold",
                    subtitlefont: "Inter 14",
                    composerfont: "Inter 12 italic",
                    footerfont: "Inter 10"
                }
            },
            onchange: () => {
                // Note: Voice detection logic moved to dedicated useEffect for reliability
            }
        });
      } else {
        // Retry if elements aren't ready yet (common in React due to mount timing)
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(initEditor, 100);
        }
      }
    };

    initEditor();

  }, [textareaId, paperId, audioId, warningId]);

  // --- 3. Sync React State with abcjs Editor ---
  useEffect(() => {
     // This is crucial for the Visual Editor to update when the prop changes
     // programmatically (e.g. Paste, Import, AI Generation)
     const ta = document.getElementById(textareaId);
     if(ta) {
        // We must trigger events so abcjs.Editor detects the value change
        ta.dispatchEvent(new Event('change')); 
        ta.dispatchEvent(new Event('input')); 
     }
  }, [abcNotation, textareaId]);

  // --- 4. Update Synth when Mixer state changes ---
  useEffect(() => {
      if (!editorRef.current) return;

      const voicesOff: number[] = [];
      if (solos.size > 0) {
          // If any solo is active, mute everything else
          voices.forEach(v => {
              if (!solos.has(v.id)) voicesOff.push(v.id);
          });
      } else {
          // Otherwise obey explicit mutes
          muted.forEach(id => voicesOff.push(id));
      }

      // Apply changes to synth
      if (editorRef.current.synthParamChanged) {
           editorRef.current.synthParamChanged({ voicesOff });
      }
  }, [muted, solos, voices]);

  // --- Auto Thumbnail Generation ---
  const generateThumbnail = useCallback(() => {
    const callback = onThumbnailGeneratedRef.current;
    if (!callback) return;

    const paper = document.getElementById(paperId);
    if (!paper) return;

    const svg = paper.querySelector("svg");
    if (!svg) return;

    // Clone to avoid modifying the visible SVG
    const svgClone = svg.cloneNode(true) as SVGElement;
    
    // Inject Styles to ensure black-on-white rendering
    const style = document.createElement("style");
    style.textContent = `
      text, tspan, path { fill: #000000 !important; }
      path[stroke] { stroke: #000000 !important; fill: none !important; }
      .abcjs-cursor, .abcjs-highlight { opacity: 0 !important; } 
    `;
    svgClone.prepend(style);

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const canvas = document.createElement('canvas');
    const img = new Image();
    
    // Determine Dimensions
    const rect = svg.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height;

    // Fallback: Try to get dimensions from viewBox
    if (width === 0 || height === 0) {
        const viewBox = svg.getAttribute('viewBox');
        if (viewBox) {
            const parts = viewBox.split(' ').map(parseFloat);
            if (parts.length === 4) {
                width = parts[2];
                height = parts[3];
            }
        }
    }

    // Fallback: If still 0 (e.g. empty SVG), default to A4 ratio
    if (!width || width === 0) width = 595;
    if (!height || height === 0) height = 842;

    // Target thumbnail width (fixed width, responsive height)
    const targetWidth = 400;
    const scale = targetWidth / width;
    const targetHeight = height * scale;

    img.onload = () => {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // White background
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Export as low-quality JPEG for small size
            const base64 = canvas.toDataURL('image/jpeg', 0.6);
            callback(base64);
        }
    };
    
    // Encode SVG data safely
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

  }, [paperId]);

  // Observer to detect when ABCJS finishes rendering the SVG
  useEffect(() => {
    const paper = document.getElementById(paperId);
    if (!paper) return;

    const observer = new MutationObserver((mutations) => {
        // Debounce thumbnail generation
        if (thumbnailTimeoutRef.current) {
            clearTimeout(thumbnailTimeoutRef.current);
        }
        
        thumbnailTimeoutRef.current = setTimeout(() => {
            generateThumbnail();
        }, 1500); // 1.5s delay to let rendering settle and avoid rapid updates
    });
    
    observer.observe(paper, { childList: true, subtree: true, attributes: true });

    return () => {
        observer.disconnect();
        if (thumbnailTimeoutRef.current) clearTimeout(thumbnailTimeoutRef.current);
    };
  }, [paperId, generateThumbnail]);


  const handleExport = async (type: 'png' | 'pdf' | 'midi' | 'wav' | 'mp3') => {
      const svg = document.querySelector(`#${paperId} svg`);
      // Only require SVG for visual export. Audio/MIDI uses the data directly.
      if (!svg && type !== 'midi' && type !== 'wav' && type !== 'mp3') return;

      if (exportingState) return;
      setExportingState(type);

      try {
        if (type === 'png') {
            const svgData = new XMLSerializer().serializeToString(svg!);
            const canvas = document.createElement('canvas');
            const img = new Image();
            const svgEl = svg as SVGElement;
            
            // Get dimensions, using fallback for hidden tabs
            let rect = svgEl.getBoundingClientRect();
            let width = rect.width;
            let height = rect.height;
            
            if (width === 0) {
                const viewBox = svgEl.getAttribute('viewBox');
                if (viewBox) {
                    const parts = viewBox.split(' ').map(parseFloat);
                    if (parts.length === 4) {
                        width = parts[2];
                        height = parts[3];
                    }
                }
            }
            if (width === 0) { width = 595; height = 842; }

            img.onload = () => {
                // High resolution export
                canvas.width = width * 2;
                canvas.height = height * 2;
                const ctx = canvas.getContext('2d');
                if(ctx) {
                    ctx.fillStyle = "#FFFFFF";
                    ctx.fillRect(0,0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const a = document.createElement('a');
                    a.href = canvas.toDataURL('image/png');
                    a.download = 'sheet_music.png';
                    a.click();
                }
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        } 
        else if (type === 'pdf') {
            const svgData = new XMLSerializer().serializeToString(svg!);
            const img = new Image();
            const svgEl = svg as SVGElement;
            
            let rect = svgEl.getBoundingClientRect();
            let width = rect.width;
            let height = rect.height;

            if (width === 0) {
                const viewBox = svgEl.getAttribute('viewBox');
                if (viewBox) {
                    const parts = viewBox.split(' ').map(parseFloat);
                    if (parts.length === 4) {
                        width = parts[2];
                        height = parts[3];
                    }
                }
            }
            if (width === 0) { width = 595; height = 842; }

            img.onload = () => {
                // Create PDF matching the aspect ratio
                const doc = new jsPDF({
                    orientation: width > height ? 'l' : 'p',
                    unit: 'px',
                    format: [width + 40, height + 40]
                });
                
                const canvas = document.createElement('canvas');
                canvas.width = width * 2;
                canvas.height = height * 2;
                const ctx = canvas.getContext('2d');
                if(ctx) {
                    ctx.fillStyle = "#FFFFFF";
                    ctx.fillRect(0,0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    doc.addImage(imgData, 'JPEG', 20, 20, width, height);
                    doc.save('sheet_music.pdf');
                }
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        }
        else if (type === 'midi') {
            const midi = abcjs.synth.getMidiFile(abcNotation, { midiOutputType: 'link' });
            if(midi && midi.length > 0) {
                const a = document.createElement('a');
                a.href = midi[0].href;
                a.download = 'music.midi';
                a.click();
            }
        }
        else if (type === 'wav' || type === 'mp3') {
            try {
                // 1. Try to use the live editor visual object first
                let visualObj = editorRef.current?.tunes?.[0];

                // 2. Fallback: Render headless if necessary
                if (!visualObj) {
                    const div = document.createElement("div");
                    div.style.width = "1024px"; 
                    div.style.height = "1024px";
                    const visualObjs = abcjs.renderAbc(div, abcNotation, {
                        responsive: 'resize',
                        add_classes: true,
                        visualTranspose: 0 
                    });
                    visualObj = visualObjs[0];
                }

                if (!visualObj) {
                    throw new Error("Could not parse music data.");
                }

                // 3. Initialize Synth
                const synth = new abcjs.synth.CreateSynth();
                await synth.init({ 
                    visualObj: visualObj,
                    options: {
                        soundFontUrl: "https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM/"
                    }
                });
                
                await synth.prime();

                // 4. Handle Export
                if (type === 'wav') {
                     const audioUrl = (synth as any).download();
                     if (audioUrl && typeof audioUrl === 'string') {
                         const a = document.createElement('a');
                         a.href = audioUrl;
                         a.download = 'composition.wav';
                         document.body.appendChild(a);
                         a.click();
                         document.body.removeChild(a);
                         setTimeout(() => window.URL.revokeObjectURL(audioUrl), 5000);
                     }
                } else if (type === 'mp3') {
                    // 5. Handle MP3 Conversion
                    if (!(window as any).lamejs) {
                         throw new Error("MP3 Encoder library not loaded.");
                    }

                    const buffer = (synth as any).getAudioBuffer();
                    if (!buffer) throw new Error("No audio buffer generated.");

                    const mp3Data = convertBufferToMp3(buffer);
                    const blob = new Blob(mp3Data, { type: 'audio/mp3' });
                    const url = window.URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'composition.mp3';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => window.URL.revokeObjectURL(url), 5000);
                }

            } catch (err: any) {
                console.error("Audio Export Failed:", err);
                alert("Could not generate audio file. " + (err.message || "Unknown error"));
            }
        }
      } catch (e: any) {
        console.error("Export error", e);
        alert("Export failed: " + e.message);
      } finally {
        setExportingState(null);
      }
  };

  const convertBufferToMp3 = (buffer: AudioBuffer) => {
    const lamejs = (window as any).lamejs;
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const kbps = 128;
    const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
    const mp3Data = [];

    // Helper: Float32 to Int16
    const convert = (input: Float32Array) => {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
             const s = Math.max(-1, Math.min(1, input[i]));
             output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output;
    };

    const left = convert(buffer.getChannelData(0));
    const right = channels > 1 ? convert(buffer.getChannelData(1)) : undefined;
    
    // Encode in chunks
    const sampleBlockSize = 1152;
    for (let i = 0; i < left.length; i += sampleBlockSize) {
        const leftChunk = left.subarray(i, i + sampleBlockSize);
        const rightChunk = right ? right.subarray(i, i + sampleBlockSize) : undefined;
        
        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk || leftChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }
    
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
    }
    return mp3Data;
  };

  useImperativeHandle(ref, () => ({
    exportFile: handleExport
  }));

  const toggleMute = (voiceId: number) => {
      setMuted(prev => {
          const next = new Set(prev);
          if (next.has(voiceId)) next.delete(voiceId);
          else next.add(voiceId);
          return next;
      });
  };

  const toggleSolo = (voiceId: number) => {
      setSolos(prev => {
          const next = new Set(prev);
          if (next.has(voiceId)) next.delete(voiceId);
          else next.add(voiceId);
          return next;
      });
  };

  return (
    <div className="w-full h-full flex flex-col bg-white text-black relative">
        {/* Toolbar Container - Column Layout for better spacing */}
        <div className="flex flex-col border-b border-md-sys-outline/10 bg-md-sys-surfaceVariant/5 z-10">
            
            {/* Row 1: Audio Player (Full Width) */}
            <div className="w-full px-4 py-2 border-b border-black/5">
                 <div id={audioId} className="w-full min-h-[40px] flex items-center justify-center">
                     {/* Audio controls render here automatically by abcjs */}
                 </div>
            </div>
            
            {/* Row 2: Menu Controls (Right Aligned) */}
            <div className="flex items-center justify-end px-4 py-2 gap-1">
                {voices.length > 0 && (
                    <div className="relative">
                        <button 
                            onClick={() => setShowMixer(!showMixer)}
                            className={`p-2 rounded transition-colors flex items-center gap-2 ${showMixer ? 'bg-md-sys-primary text-white' : 'hover:bg-black/5 text-md-sys-secondary hover:text-black'}`}
                            title="Audio Mixer"
                        >
                            <span className="material-symbols-rounded text-lg">tune</span>
                        </button>

                        {/* Mixer Popover */}
                        {showMixer && (
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
                                                        onClick={() => toggleMute(v.id)}
                                                        className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-colors ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'}`}
                                                        title="Mute"
                                                    >
                                                        M
                                                    </button>
                                                    <button 
                                                        onClick={() => toggleSolo(v.id)}
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
                        )}
                    </div>
                )}

                <div className="w-px h-6 bg-black/10 mx-1"></div>

                <button 
                    onClick={() => handleExport('png')} 
                    disabled={!!exportingState}
                    className="p-2 hover:bg-black/5 rounded text-md-sys-secondary hover:text-black transition-colors disabled:opacity-50" 
                    title="Export PNG"
                >
                    {exportingState === 'png' ? <span className="material-symbols-rounded text-lg animate-spin">progress_activity</span> : <span className="material-symbols-rounded text-lg">image</span>}
                </button>
                <button 
                    onClick={() => handleExport('pdf')} 
                    disabled={!!exportingState}
                    className="p-2 hover:bg-black/5 rounded text-md-sys-secondary hover:text-black transition-colors disabled:opacity-50" 
                    title="Export PDF"
                >
                    {exportingState === 'pdf' ? <span className="material-symbols-rounded text-lg animate-spin">progress_activity</span> : <span className="material-symbols-rounded text-lg">picture_as_pdf</span>}
                </button>
                 <button 
                    onClick={() => handleExport('midi')} 
                    disabled={!!exportingState}
                    className="p-2 hover:bg-black/5 rounded text-md-sys-secondary hover:text-black transition-colors disabled:opacity-50" 
                    title="Download MIDI"
                >
                    {exportingState === 'midi' ? <span className="material-symbols-rounded text-lg animate-spin">progress_activity</span> : <span className="material-symbols-rounded text-lg">piano</span>}
                </button>
                <button 
                    onClick={() => handleExport('wav')} 
                    disabled={!!exportingState}
                    className="p-2 hover:bg-black/5 rounded text-md-sys-secondary hover:text-black transition-colors disabled:opacity-50" 
                    title="Download Audio (.wav)"
                >
                    {exportingState === 'wav' ? <span className="material-symbols-rounded text-lg animate-spin">progress_activity</span> : <span className="material-symbols-rounded text-lg">headphones</span>}
                </button>
                <button 
                    onClick={() => handleExport('mp3')} 
                    disabled={!!exportingState}
                    className="p-2 hover:bg-black/5 rounded text-md-sys-secondary hover:text-black transition-colors disabled:opacity-50" 
                    title="Download Audio (.mp3)"
                >
                    {exportingState === 'mp3' ? <span className="material-symbols-rounded text-lg animate-spin">progress_activity</span> : <span className="material-symbols-rounded text-lg">music_note</span>}
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-auto p-4 custom-scrollbar relative bg-white" onClick={() => setShowMixer(false)}>
             <div id={paperId} className="w-full min-h-full" />
             {(!abcNotation) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                     <div className="text-center text-md-sys-secondary">
                        <span className="material-symbols-rounded text-6xl">music_note</span>
                        <p className="mt-2 text-sm">Visualization area</p>
                     </div>
                </div>
             )}
        </div>
    </div>
  );
});

MusicDisplay.displayName = 'MusicDisplay';