import React, { useEffect, useRef } from 'react';
import abcjs from 'abcjs';

interface MusicDisplayProps {
  abcNotation: string;
  warningId?: string;
}

export const MusicDisplay: React.FC<MusicDisplayProps> = ({ abcNotation, warningId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  // Keep a persistent reference to the controller to manage state across renders
  const synthControlRef = useRef<any>(null);

  // Clean up controller on unmount
  useEffect(() => {
    return () => {
      if (synthControlRef.current) {
        try {
            synthControlRef.current.pause();
            synthControlRef.current.disable(true);
        } catch (e) {
            console.warn("Error cleaning up synth:", e);
        }
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    if (!containerRef.current || !audioContainerRef.current) return;

    // Ensure we have a valid ID for selectors
    if (!containerRef.current.id) {
        containerRef.current.id = `abc-paper-${Math.random().toString(36).substring(2, 9)}`;
    }
    const rootSelector = `#${containerRef.current.id}`;

    // 1. Initialize Visuals
    // Note: 'warn_id' is not a valid option for renderAbc (it's for the Editor class only).
    // We must handle warnings manually from the return object.
    const visualOptions = { 
        add_classes: true,
        responsive: 'resize' as const, 
        jazzchords: true
    };
    
    // Render the ABC notation to SVG
    // This replaces the SVG content, so subsequent selectors will find the new elements.
    const visualObjs = abcjs.renderAbc(containerRef.current, abcNotation, visualOptions);

    // 2. Handle Warnings Manually
    if (warningId) {
        const warningsDiv = document.getElementById(warningId);
        if (warningsDiv) {
            const warnings: string[] = [];
            
            // Collect warnings from all rendered tunes
            visualObjs.forEach((tune: any) => {
                if (tune.warnings) {
                    tune.warnings.forEach((w: any) => {
                        // Check if it's a plain string (common in some abcjs configurations)
                        if (typeof w === 'string') {
                            warnings.push(w);
                        } 
                        // Check if it's an object with details
                        else if (typeof w === 'object' && w !== null) {
                             const message = w.message || 'Unknown error';
                             
                             // Try to extract line and column/char info
                             const line = w.line;
                             const col = w.column ?? w.char; // Support both property names
                             
                             if (line !== undefined) {
                                 let prefix = `Music Line:${line}`;
                                 if (col !== undefined) {
                                     prefix += `:${col}`;
                                 }
                                 warnings.push(`${prefix}: ${message}`);
                             } else {
                                 // No line info, just show the message
                                 warnings.push(message);
                             }
                        }
                    });
                }
            });

            // Update the DOM element
            warningsDiv.innerText = warnings.join('\n');
        }
    }

    // 3. Initialize or Update Audio Controls
    if (abcjs.synth.supportsAudio()) {
        
        // Lazy initialization of the controller (only once)
        if (!synthControlRef.current) {
             synthControlRef.current = new abcjs.synth.SynthController();
             
             const cursorControl = {
                rootSelector,
                beatSubdivisions: 2,
                onReady() {},
                onStart() {
                    const svg = document.querySelector(`${rootSelector} svg`);
                    if (!svg) return;
                    let cursor = svg.querySelector(".abcjs-cursor");
                    if (!cursor) {
                        cursor = document.createElementNS("http://www.w3.org/2000/svg", "line");
                        cursor.setAttribute("class", "abcjs-cursor");
                        cursor.setAttributeNS(null, 'x1', '0');
                        cursor.setAttributeNS(null, 'y1', '0');
                        cursor.setAttributeNS(null, 'x2', '0');
                        cursor.setAttributeNS(null, 'y2', '0');
                        svg.appendChild(cursor);
                    }
                },
                onBeat(beatNumber: number, totalBeats: number, totalTime: number) {},
                onEvent(ev: any) {
                    if (ev.measureStart && ev.left === null) return;
                    
                    const svg = document.querySelector(`${rootSelector} svg`);
                    if (!svg) return;

                    // Remove highlights
                    const lastSelection = svg.querySelectorAll(".highlight");
                    lastSelection.forEach(el => el.classList.remove("highlight"));

                    // Add highlights
                    for (let i = 0; i < ev.elements.length; i++) {
                        const note = ev.elements[i];
                        for (let j = 0; j < note.length; j++) {
                            note[j].classList.add("highlight");
                        }
                    }

                    // Move cursor
                    const cursor = svg.querySelector(".abcjs-cursor");
                    if (cursor) {
                         cursor.setAttribute("x1", String(ev.left - 2));
                         cursor.setAttribute("x2", String(ev.left - 2));
                         cursor.setAttribute("y1", String(ev.top));
                         cursor.setAttribute("y2", String(ev.top + ev.height));
                    }
                },
                onFinished() {
                    const svg = document.querySelector(`${rootSelector} svg`);
                    if (!svg) return;
                    
                    const els = svg.querySelectorAll(".highlight");
                    els.forEach(el => el.classList.remove("highlight"));
                    
                    const cursor = svg.querySelector(".abcjs-cursor");
                    if (cursor) {
                        cursor.setAttribute("x1", "0");
                        cursor.setAttribute("x2", "0");
                        cursor.setAttribute("y1", "0");
                        cursor.setAttribute("y2", "0");
                    }
                }
            };
            
            // Load creates the UI. We only do this once.
            synthControlRef.current.load(audioContainerRef.current, cursorControl, {
                displayLoop: true,
                displayRestart: true,
                displayPlay: true,
                displayProgress: true,
                displayWarp: true
            });
        }

        // 4. CRITICAL: Stop any currently playing audio when notation changes
        if (synthControlRef.current && typeof synthControlRef.current.pause === 'function') {
            try {
                synthControlRef.current.pause();
            } catch (e) {
                console.warn("Failed to pause audio:", e);
            }
        }

        // 5. Set the new tune
        const setTune = async () => {
            // We need a visual object to generate audio
            // Use the first tune that rendered successfully
            const visualObj = visualObjs[0];
            if (!visualObj) return;

            const midiBuffer = new abcjs.synth.CreateSynth();
            
            try {
                await midiBuffer.init({ visualObj: visualObj });
                if (!isMounted) return;

                // setTune replaces the current audio buffer
                await synthControlRef.current.setTune(visualObj, false, { chordsOff: false });
                if (isMounted) console.log("Audio successfully loaded.");
            } catch (error: any) {
                console.warn("Audio problem:", error);
            }
        };

        setTune();
        
    } else {
        if (audioContainerRef.current) {
            audioContainerRef.current.innerHTML = "<div class='text-red-400 p-2'>Audio is not supported in this browser.</div>";
        }
    }

    return () => {
        isMounted = false;
        // We do not disable the controller here to avoid UI flickering/re-creation on every keystroke
        // The explicit pause() call at the start of the next effect run handles stopping the audio.
    };
  }, [abcNotation, warningId]);

  return (
    <div className="w-full h-full relative flex flex-col bg-white overflow-hidden p-4 md:p-8">
      {/* Audio Controls */}
      <div className="w-full flex justify-center mb-6">
         <div id="audio" ref={audioContainerRef} className="w-full max-w-3xl"></div>
      </div>
      
      {/* Visual Sheet Music */}
      <div 
        ref={containerRef} 
        id="paper"
        className="flex-1 w-full overflow-auto"
      ></div>
    </div>
  );
};
