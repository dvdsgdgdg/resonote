import React, { useEffect, useRef, useState } from 'react';
import abcjs from 'abcjs';
import { Button } from './Button';

interface MusicDisplayProps {
  abcNotation: string;
}

export const MusicDisplay: React.FC<MusicDisplayProps> = ({ abcNotation }) => {
  const paperRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  // Use a ref to track playing state inside closures (like clickListener)
  const isPlayingRef = useRef(false);
  
  const synthControlRef = useRef<any>(null);
  const visualObjRef = useRef<any>(null);

  useEffect(() => {
    if (paperRef.current && abcNotation) {
      
      // Render the sheet music with click listener for seeking
      const visualObj = abcjs.renderAbc(paperRef.current, abcNotation, {
        responsive: 'resize',
        add_classes: true,
        paddingtop: 0,
        paddingbottom: 0,
        paddingleft: 0,
        paddingright: 0,
        staffwidth: 800,
        // Reduced arguments to match potential interface mismatch and avoid arity errors
        clickListener: (abcElem: any, tuneNumber: number, classes: string, analysis: any, drag: any) => {
            // Seek logic on click
            if (synthControlRef.current && visualObjRef.current && visualObjRef.current[0]) {
                try {
                  const totalTime = visualObjRef.current[0].getTotalTime();
                  // currentTrackMillisecond can be undefined on some elements
                  const timestamp = typeof abcElem.currentTrackMillisecond === 'number' 
                    ? abcElem.currentTrackMillisecond / 1000 
                    : 0;
                  
                  // Validate numbers to prevent "non-finite" errors
                  if (Number.isFinite(totalTime) && totalTime > 0 && Number.isFinite(timestamp)) {
                       // In ABCJS 6.x, seek usually takes a percentage (0-1)
                       const percent = Math.min(Math.max(timestamp / totalTime, 0), 1);
                       
                       if (Number.isFinite(percent)) {
                         synthControlRef.current.seek(percent);
                         
                         // Always play if clicked, updating state
                         synthControlRef.current.play();
                         setIsPlaying(true);
                         isPlayingRef.current = true;
                       }
                  }
                } catch (err) {
                  console.warn("Seek error:", err);
                }
            }
        }
      });

      visualObjRef.current = visualObj;

      // Initialize Audio Synthesis
      if (abcjs.synth.supportsAudio()) {
        const synthControl = new abcjs.synth.SynthController();
        synthControlRef.current = synthControl;
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Define Cursor Control using the event logic from documentation
        const cursorControl = {
            onStart: () => {
                const cursors = paperRef.current?.querySelectorAll(".abcjs-cursor");
                cursors?.forEach(el => el.classList.remove("abcjs-cursor"));
            },
            onEvent: (ev: any) => {
                // Robustly remove all previous cursors to prevent artifacts
                const cursors = paperRef.current?.querySelectorAll(".abcjs-cursor");
                cursors?.forEach(el => el.classList.remove("abcjs-cursor"));

                // If ev is null, it signifies the end of the tune
                if (!ev) return;

                // Select the notes currently being played
                if (ev.elements) {
                    ev.elements.forEach((el: Element) => {
                        el.classList.add("abcjs-cursor");
                    });
                }
            },
            onFinished: () => {
                setIsPlaying(false);
                isPlayingRef.current = false;
                
                const cursors = paperRef.current?.querySelectorAll(".abcjs-cursor");
                cursors?.forEach(el => el.classList.remove("abcjs-cursor"));
            }
        };

        // Create the midi buffer
        const midiBuffer = new abcjs.synth.CreateSynth();
        
        midiBuffer.init({ 
            visualObj: visualObj[0],
            options: {
                pan: [-0.1, 0.1], 
            } 
        }).then(() => {
          // Set tune and attach the new cursor control logic
          return synthControl.setTune(visualObj[0], false, { 
              audioContext: audioContext,
              cursorControl: cursorControl 
          } as any);
        }).then(() => {
           // Ready
        }).catch((error: any) => {
          console.warn("Audio initialization problem:", error);
        });
      }
    }
    
    // Cleanup function
    return () => {
        if (synthControlRef.current) {
            try {
                synthControlRef.current.pause();
            } catch (e) {
                // ignore
            }
        }
        setIsPlaying(false);
        isPlayingRef.current = false;
    };
  }, [abcNotation]);

  const togglePlay = () => {
    if (synthControlRef.current) {
      try {
        if (isPlayingRef.current) {
          synthControlRef.current.pause();
          setIsPlaying(false);
          isPlayingRef.current = false;
        } else {
          synthControlRef.current.play();
          setIsPlaying(true);
          isPlayingRef.current = true;
        }
      } catch (err) {
        console.error("Playback toggle error:", err);
        // Force state reset if audio context is messed up
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    }
  };

  const handleStop = () => {
     if (synthControlRef.current) {
        try {
            // "stop()" in abcjs can throw if not started, so we use pause + seek(0)
            synthControlRef.current.pause(); 
            synthControlRef.current.seek(0); 
            setIsPlaying(false);
            isPlayingRef.current = false;
            
            // Manual cursor cleanup on stop
            const notes = paperRef.current?.querySelectorAll(".abcjs-cursor");
            notes?.forEach(n => n.classList.remove("abcjs-cursor"));
        } catch (err) {
            console.warn("Stop error:", err);
            setIsPlaying(false);
            isPlayingRef.current = false;
        }
     }
  }

  return (
    <div className="flex flex-col h-full bg-white text-black rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-md-sys-outline/20">
      {/* Header / Controls */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
         <div className="flex items-center gap-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Preview</h3>
         </div>
         <div className="flex items-center gap-2">
            <Button 
                onClick={togglePlay} 
                variant="primary" 
                icon={isPlaying ? "pause" : "play_arrow"}
                className="!h-9 !px-5"
            >
                {isPlaying ? "Pause" : "Play"}
            </Button>
            <Button 
                onClick={handleStop} 
                variant="secondary" 
                icon={isPlaying ? "stop" : "stop"} 
                className="!h-9 !w-9 !px-0"
            />
         </div>
      </div>
      
      {/* Sheet Music Area */}
      <div className="flex-1 overflow-auto bg-white p-8 flex justify-center min-h-0 relative">
          <div id="paper" ref={paperRef} className="w-full max-w-4xl"></div>
          {/* Audio container (hidden but necessary for some abcjs internals) */}
          <div ref={audioRef} className="hidden"></div>
      </div>
    </div>
  );
};
