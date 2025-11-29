import React, { useEffect, useRef, useState } from 'react';
import abcjs from 'abcjs';

interface MusicDisplayProps {
  abcNotation: string;
  warningId?: string;
  textareaId: string;
}

export const MusicDisplay: React.FC<MusicDisplayProps> = ({ abcNotation, warningId, textareaId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<any>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    // Wait for DOM to be ready
    const paperId = containerRef.current?.id || `abc-paper-${Math.random().toString(36).substr(2, 9)}`;
    const audioId = audioContainerRef.current?.id || `abc-audio-${Math.random().toString(36).substr(2, 9)}`;
    
    if (containerRef.current) containerRef.current.id = paperId;
    if (audioContainerRef.current) audioContainerRef.current.id = audioId;

    // Use a timeout to ensure the textarea sibling is mounted and has its ID set in the DOM
    const timer = setTimeout(() => {
        if (!editorInstanceRef.current && document.getElementById(textareaId)) {
            // Initialize ABCJS Editor which handles binding text, visuals, and audio automatically.
            editorInstanceRef.current = new abcjs.Editor(textareaId, {
                paper_id: paperId,
                warnings_id: warningId,
                synth: {
                    el: `#${audioId}`,
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
                    // Engraving improvements for accuracy and readability
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
                    },
                    clickListener: (abcelem: any) => {
                        // Interaction handler
                    }
                },
                selectionChangeCallback: (start: number, end: number) => {
                    // Selection handler
                }
            });
        }
    }, 100);

    return () => {
        clearTimeout(timer);
        editorInstanceRef.current = null;
    };
  }, [textareaId, warningId]); 

  // Sync Effect
  useEffect(() => {
    const textarea = document.getElementById(textareaId);
    if (textarea && editorInstanceRef.current) {
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, [abcNotation, textareaId]);

  const handleExportImage = async () => {
    if (!containerRef.current || isExporting) return;
    
    setIsExporting(true);
    
    try {
        const svgs = containerRef.current.querySelectorAll('svg');
        if (svgs.length === 0) throw new Error("No music found to export");

        // Calculate total dimensions
        let totalHeight = 0;
        let maxWidth = 0;
        const scale = 2.5; // High resolution scale
        const padding = 50;

        const svgDataList: { xml: string, width: number, height: number }[] = [];

        // Serialize all SVGs
        const serializer = new XMLSerializer();
        svgs.forEach(svg => {
            const box = svg.getBoundingClientRect();
            // Use viewbox or client rect
            const w = box.width || parseFloat(svg.getAttribute('width') || '0');
            const h = box.height || parseFloat(svg.getAttribute('height') || '0');
            
            maxWidth = Math.max(maxWidth, w);
            totalHeight += h;

            svgDataList.push({
                xml: serializer.serializeToString(svg),
                width: w,
                height: h
            });
        });

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = (maxWidth + padding * 2) * scale;
        canvas.height = (totalHeight + padding * 2) * scale;
        const ctx = canvas.getContext('2d');

        if (!ctx) throw new Error("Could not create canvas context");

        // Fill background white
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);

        // Draw Images
        let currentY = padding;
        
        const loadImage = (xml: string): Promise<HTMLImageElement> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                const svgBlob = new Blob([xml], {type: 'image/svg+xml;charset=utf-8'});
                const url = URL.createObjectURL(svgBlob);
                img.onload = () => {
                    resolve(img);
                    URL.revokeObjectURL(url);
                };
                img.onerror = reject;
                img.src = url;
            });
        };

        for (const data of svgDataList) {
            const img = await loadImage(data.xml);
            // Center horizontally based on the max width found
            const x = (maxWidth - data.width) / 2 + padding;
            ctx.drawImage(img, x, currentY, data.width, data.height);
            currentY += data.height;
        }

        // Trigger Download
        const link = document.createElement('a');
        link.download = `resonote-score-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (e) {
        console.error("Export failed", e);
        alert("Failed to export image.");
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <div className="w-full h-full relative flex flex-col bg-white overflow-hidden p-4 md:p-8">
      {/* Export Button (Floating Top Right) */}
      <div className="absolute top-4 right-4 z-10 print:hidden">
          <button
            onClick={handleExportImage}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-sm backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
            title="Download as PNG"
          >
            {isExporting ? (
                <span className="material-symbols-rounded animate-spin text-[18px]">progress_activity</span>
            ) : (
                <span className="material-symbols-rounded text-[18px]">image</span>
            )}
            {isExporting ? 'Exporting...' : 'Export Image'}
          </button>
      </div>

      {/* Audio Controls */}
      <div className="w-full flex justify-center mb-6 pt-4">
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