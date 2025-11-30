
import React, { useEffect, useRef, useImperativeHandle, useCallback, useState } from 'react';
import abcjs from 'abcjs';
import { MusicToolbar } from './music/MusicToolbar';
import { exportMusic } from '../utils/exportHandler';

interface MusicDisplayProps {
  abcNotation: string;
  warningId?: string;
  textareaId: string;
  onThumbnailGenerated?: (base64: string) => void;
  zoomLevel?: number;
}

export interface MusicDisplayHandle {
  exportFile: (type: 'png' | 'jpg' | 'webp' | 'svg' | 'pdf' | 'doc' | 'midi' | 'wav' | 'mp3') => void;
}

interface VoiceInfo {
  id: number;
  name: string;
}

export const MusicDisplay = React.forwardRef<MusicDisplayHandle, MusicDisplayProps>(({ 
  abcNotation, 
  warningId, 
  textareaId,
  onThumbnailGenerated,
  zoomLevel = 1.0
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


  const handleExport = async (type: 'png' | 'jpg' | 'webp' | 'svg' | 'pdf' | 'doc' | 'midi' | 'wav' | 'mp3') => {
      if (exportingState) return;
      setExportingState(type);

      try {
        await exportMusic(type, {
            abcNotation,
            paperId,
            editorInstance: editorRef.current
        });
      } catch (e: any) {
        console.error("Export error", e);
        alert("Export failed: " + e.message);
      } finally {
        setExportingState(null);
      }
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
        <MusicToolbar 
            audioId={audioId}
            voices={voices}
            muted={muted}
            solos={solos}
            onToggleMute={toggleMute}
            onToggleSolo={toggleSolo}
            onExport={handleExport}
            exportingState={exportingState}
        />

        <div className="flex-1 overflow-auto p-4 custom-scrollbar relative bg-white">
             {/* Music Paper with scaling support */}
             <div 
                id={paperId} 
                className="w-full min-h-full transition-transform duration-200 ease-out origin-top-left" 
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
             />
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
