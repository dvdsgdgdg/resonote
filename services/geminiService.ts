import { GoogleGenAI } from "@google/genai";
import { ABCResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const convertImageToABC = async (
  files: File[], 
  model: string,
  onLog: (message: string, type?: 'info' | 'success' | 'warning' | 'thinking') => void,
  onStreamUpdate?: (text: string) => void
): Promise<ABCResult> => {

  try {
    onLog("Initializing AI runtime environment", 'info');
    
    // 1. Image Processing
    onLog(`Preprocessing ${files.length} input image(s)`, 'info');
    const parts = await Promise.all(
      files.map(async (file, index) => {
        const base64Data = await fileToGenerativePart(file);
        onLog(`Encoded image ${index + 1}/${files.length} [${file.type}]`, 'info');
        return {
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        };
      })
    );

    const prompt = `
      Analyze the provided image(s) of sheet music using your advanced reasoning capabilities. 
      Convert the music notation accurately into ABC notation format.
      
      Requirements:
      1. Return ONLY the ABC notation code.
      2. Ensure headers (X:, T:, M:, L:, K:) are correct.
      3. Capture notes, rhythm, rests, and dynamics as accurately as possible.
      4. If there are multiple staves, handle them correctly with voice (V:) tags.
      5. Do NOT include markdown code blocks like \`\`\`abc ... \`\`\`. Return raw text.
    `;

    // Configure request based on model capabilities
    // Gemini 2.5 and 3 support includeThoughts. 
    // We default to high temperature for reasoning models to allow creative problem solving in the thought process,
    // though the docs recommend 1.0 for Gemini 3.
    const config: any = {
        temperature: 1.0, 
        thinkingConfig: {
            includeThoughts: true 
        }
    };

    onLog(`Active Reasoning Chain initiated using ${model}...`, 'thinking');

    const responseStream = await ai.models.generateContentStream({
      model: model,
      contents: {
        parts: [
          ...parts,
          { text: prompt }
        ]
      },
      config: config
    });

    let fullText = "";
    let thoughtSignature: string | undefined;

    for await (const chunk of responseStream) {
        if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content && chunk.candidates[0].content.parts) {
            for (const part of chunk.candidates[0].content.parts) {
                // Check for thought signature
                if ('thoughtSignature' in part) {
                    thoughtSignature = (part as any).thoughtSignature;
                }

                // Handle Thought Summaries
                if ((part as any).thought) {
                    const thoughtText = part.text || "";
                    if (thoughtText) {
                        onLog(thoughtText, 'thinking');
                    }
                } 
                // Handle Generated Content (Answer)
                else if (part.text) {
                    const chunkText = part.text;
                    fullText += chunkText;
                    
                    // Clean up markdown in real-time
                    const displayStats = fullText.replace(/^```abc\s*/, '').replace(/^```\s*/, '');
                    
                    if (onStreamUpdate) {
                        onStreamUpdate(displayStats);
                    }
                }
            }
        }
    }

    onLog("Stream complete. Finalizing output", 'info');

    // Final cleanup
    fullText = fullText.replace(/^```abc\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
    
    // Explicit update with final clean text
    if (onStreamUpdate) {
        onStreamUpdate(fullText);
    }

    if (thoughtSignature) {
        onLog("Captured thought signature for context retention", 'info');
    }

    onLog("Conversion complete", 'success');

    return {
      abc: fullText,
      thoughtSignature: thoughtSignature
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    onLog(`Error: ${error.message || "Unknown error occurred"}`, 'warning');
    throw error;
  }
};

async function fileToGenerativePart(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}