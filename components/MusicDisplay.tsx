import React, { useEffect, useRef, useState } from 'react';
import abcjs from 'abcjs';
import { jsPDF } from 'jspdf';

interface MusicDisplayProps {
  abcNotation: string;
  warningId?: string;
  textareaId: string;
}

export const MusicDisplay: React.FC<MusicDisplayProps> = ({ abcNotation, warningId, textareaId }) => {
  // Use stable IDs for the DOM elements
  const uniqueId = useRef(Math.random().toString(36).substr(2, 9)).current;
  const paperId = `abc-paper-${uniqueId}`;
  const audioId = `abc-audio-${uniqueId}`;
  
  const editorRef = useRef<any>(null);

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

  // Sync logic: Force abcjs to re-process if the prop changes
  useEffect(() => {
     const ta = document.getElementById(textareaId);
     if(ta) {
        ta.dispatchEvent(new Event('change')); 
        ta.dispatchEvent(new Event('input')); 
     }
  }, [abcNotation, textareaId]);

  const handleExport = (type: 'png' | 'pdf' | 'midi') => {
      const svg = document.querySelector(`#${paperId} svg`);
      if (!svg && type !== 'midi') return;

      if (type === 'png') {
          const svgData = new XMLSerializer().serializeToString(svg!);
          const canvas = document.createElement('canvas');
          const img = new Image();
          const svgEl = svg as SVGElement;
          const rect = svgEl.getBoundingClientRect();
          
          img.onload = () => {
              // High resolution export
              canvas.width = rect.width * 2;
              canvas.height = rect.height * 2;
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
          const rect = svgEl.getBoundingClientRect();

          img.onload = () => {
              // Create PDF matching the aspect ratio
              const doc = new jsPDF({
                  orientation: rect.width > rect.height ? 'l' : 'p',
                  unit: 'px',
                  format: [rect.width + 40, rect.height + 40]
              });
              
              const canvas = document.createElement('canvas');
              canvas.width = rect.width * 2;
              canvas.height = rect.height * 2;
              const ctx = canvas.getContext('2d');
              if(ctx) {
                  ctx.fillStyle = "#FFFFFF";
                  ctx.fillRect(0,0, canvas.width, canvas.height);
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  const imgData = canvas.toDataURL('image/jpeg', 0.95);
                  doc.addImage(imgData, 'JPEG', 20, 20, rect.width, rect.height);
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
  };

  return (
    <div className="w-full h-full flex flex-col bg-white text-black">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-md-sys-outline/10 bg-md-sys-surfaceVariant/5">
            <div id={audioId} className="flex-1 mr-4 min-h-[40px] flex items-center">
                {/* Audio controls render here automatically by abcjs */}
            </div>
            
            <div className="flex items-center gap-1">
                <button onClick={() => handleExport('png')} className="p-2 hover:bg-black/5 rounded text-md-sys-secondary hover:text-black transition-colors" title="Export PNG">
                    <span className="material-symbols-rounded text-lg">image</span>
                </button>
                <button onClick={() => handleExport('pdf')} className="p-2 hover:bg-black/5 rounded text-md-sys-secondary hover:text-black transition-colors" title="Export PDF">
                    <span className="material-symbols-rounded text-lg">picture_as_pdf</span>
                </button>
                 <button onClick={() => handleExport('midi')} className="p-2 hover:bg-black/5 rounded text-md-sys-secondary hover:text-black transition-colors" title="Download MIDI">
                    <span className="material-symbols-rounded text-lg">piano</span>
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-auto p-4 custom-scrollbar relative bg-white">
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
};