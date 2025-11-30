
import abcjs from 'abcjs';
import { jsPDF } from 'jspdf';

interface ExportOptions {
  abcNotation: string;
  paperId: string;
  editorInstance: any;
}

export const exportMusic = async (
  type: 'png' | 'jpg' | 'webp' | 'svg' | 'pdf' | 'doc' | 'midi' | 'wav' | 'mp3',
  options: ExportOptions
): Promise<void> => {
  const { abcNotation, paperId, editorInstance } = options;

  const svg = document.querySelector(`#${paperId} svg`);
  
  // Only require SVG for visual export. Audio/MIDI uses the data directly.
  if (!svg && type !== 'midi' && type !== 'wav' && type !== 'mp3') {
      throw new Error("Visualization not found. Please wait for the music to render.");
  }

  // Helper to get Canvas from SVG
  const getCanvasFromSvg = (svgEl: SVGElement, scaleFactor: number = 2): Promise<HTMLCanvasElement> => {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const canvas = document.createElement('canvas');
      const img = new Image();
      
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

      return new Promise((resolve, reject) => {
          img.onload = () => {
              try {
                  canvas.width = width * scaleFactor;
                  canvas.height = height * scaleFactor;
                  const ctx = canvas.getContext('2d');
                  if(ctx) {
                      ctx.fillStyle = "#FFFFFF";
                      ctx.fillRect(0,0, canvas.width, canvas.height);
                      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                      resolve(canvas);
                  } else {
                      reject(new Error("Failed to get canvas context"));
                  }
              } catch (e) {
                  reject(e);
              }
          };
          img.onerror = (e) => reject(new Error("Failed to load SVG image"));
          img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      });
  };

  if (type === 'svg') {
      const svgData = new XMLSerializer().serializeToString(svg!);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sheet_music.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return Promise.resolve();
  }
  else if (type === 'png' || type === 'jpg' || type === 'webp') {
    const canvas = await getCanvasFromSvg(svg as SVGElement);
    const a = document.createElement('a');
    
    let mime = 'image/png';
    let ext = 'png';
    
    if (type === 'jpg') { mime = 'image/jpeg'; ext = 'jpg'; }
    if (type === 'webp') { mime = 'image/webp'; ext = 'webp'; }
    
    a.href = canvas.toDataURL(mime, 0.9);
    a.download = `sheet_music.${ext}`;
    a.click();
  } 
  else if (type === 'pdf') {
    const canvas = await getCanvasFromSvg(svg as SVGElement, 2);
    const width = canvas.width / 2;
    const height = canvas.height / 2;

    const doc = new jsPDF({
        orientation: width > height ? 'l' : 'p',
        unit: 'px',
        format: [width + 40, height + 40]
    });
    
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    doc.addImage(imgData, 'JPEG', 20, 20, width, height);
    doc.save('sheet_music.pdf');
  }
  else if (type === 'doc') {
    // Dynamically import docx library to keep initial bundle size small
    // 'docx' must be defined in the import map in index.html
    const { Document, Packer, Paragraph, ImageRun, HeadingLevel, AlignmentType } = await import('docx');

    const canvas = await getCanvasFromSvg(svg as SVGElement, 2); // Higher scale for better print quality in Word
    const imgDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    // Convert base64 to Uint8Array for docx
    const base64Data = imgDataUrl.split(',')[1];
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // Calculate dimensions to fit in standard A4 Word page (approx 595pt width - margins)
    const MAX_WIDTH_PT = 500; 
    const aspectRatio = canvas.height / canvas.width;
    const finalWidth = Math.min(canvas.width, MAX_WIDTH_PT);
    const finalHeight = finalWidth * aspectRatio;

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: "Resonote Export",
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                }),
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: bytes,
                            transformation: {
                                width: finalWidth,
                                height: finalHeight,
                            },
                            type: "jpg"
                        }),
                    ],
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    text: "Generated with Resonote AI",
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200 },
                    style: "Subtitle"
                })
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sheet_music.docx'; // Use .docx extension
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  else if (type === 'midi') {
    const midi = abcjs.synth.getMidiFile(abcNotation, { midiOutputType: 'link' });
    if(midi && midi.length > 0) {
        const a = document.createElement('a');
        a.href = midi[0].href;
        a.download = 'music.midi';
        a.click();
    }
    return Promise.resolve();
  }
  else if (type === 'wav' || type === 'mp3') {
    try {
        // 1. Try to use the live editor visual object first
        let visualObj = editorInstance?.tunes?.[0];

        // 2. Fallback: Render headless if necessary
        if (!visualObj) {
            const div = document.createElement("div");
            div.style.width = "1024px"; 
            div.style.height = "1024px";
            div.style.visibility = "hidden";
            div.style.position = "absolute";
            document.body.appendChild(div);
            const visualObjs = abcjs.renderAbc(div, abcNotation, {
                responsive: 'resize',
                add_classes: true,
                visualTranspose: 0 
            });
            visualObj = visualObjs[0];
            // Cleanup
            document.body.removeChild(div);
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
        return Promise.resolve();
    } catch (err: any) {
        console.error("Audio Export Failed:", err);
        throw new Error("Could not generate audio file. " + (err.message || "Unknown error"));
    }
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
