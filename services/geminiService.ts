import { GoogleGenAI, Tool, Type, Part } from "@google/genai";
import { ABCResult, ValidationResult } from "../types";

// Define the tool for the model
const validateABCTool: Tool = {
  functionDeclarations: [
    {
      name: 'validate_abc_notation',
      description: 'Validates the syntax of the generated ABC notation using the abcjs engine. Call this to check for errors before finishing.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          abc_notation: {
            type: Type.STRING,
            description: 'The full ABC notation string to validate.',
          },
        },
        required: ['abc_notation'],
      },
    }
  ],
};

export const convertImageToABC = async (
  files: File[], 
  model: string,
  onLog: (message: string, type?: 'info' | 'success' | 'warning' | 'thinking') => void,
  onStreamUpdate: (text: string) => void,
  validatorFn: (abc: string) => ValidationResult
): Promise<ABCResult> => {

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // 1. Image Processing
    const parts = await Promise.all(
      files.map(async (file, index) => {
        const base64Data = await fileToGenerativePart(file);
        return {
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        };
      })
    );

    // High-Fidelity OMR System Instruction based on ABC Standard 2.1
    const systemInstruction = `
      You are an elite Optical Music Recognition (OMR) Specialist Agent.
      
      YOUR MISSION:
      Create a PIXEL-PERFECT transcription of the provided sheet music image into ABC Notation (Standard 2.1). 
      The output must match the original image exactly in terms of melody, rhythm, harmonies, and lyrics.

      --------------------------------------------------------------------------------
      OFFICIAL ABC NOTATION STANDARD 2.1 KNOWLEDGE BASE (STRICT ADHERENCE REQUIRED)
      --------------------------------------------------------------------------------

      1. FILE STRUCTURE & HEADERS:
         - Every tune MUST start with 'X:1' (Reference Number).
         - Follow immediately with 'T:Title'.
         - Common Headers:
           M:Meter (e.g., M:4/4, M:C, M:6/8).
           L:Unit Note Length (e.g., L:1/8).
           Q:Tempo (e.g., Q:1/4=120).
           K:Key (e.g., K:G, K:Am, K:Bb). The K: field MUST be the LAST field in the header.

      2. PITCH & ACCIDENTALS:
         - Pitch: C, (low) < C < c (middle C) < c' (high).
         - Use commas (,) for lower octaves and apostrophes (') for higher octaves.
         - Accidentals: Place BEFORE the note. 
           ^ (sharp), _ (flat), = (natural), ^^ (double sharp), __ (double flat).
           Example: ^c is C sharp, _B is B flat.

      3. RHYTHM & NOTE LENGTHS:
         - Duration is a multiplier of 'L'.
         - If L:1/8: A is an 8th note, A2 is a quarter, A3 is dotted quarter, A4 is half note.
         - Shorter notes: A/2 (or A/) is a 16th, A/4 (or A//) is a 32nd.
         - Dotted Rhythm:
           > means 'previous dotted, next halved' (dotted 8th + 16th).
           < means 'previous halved, next dotted' (16th + dotted 8th).
         - Beams: Group notes closely (e.g., cded). Use space to break beams (e.g., c2 d2).

      4. CHORDS & UNISONS:
         - Enclose simultaneous notes in square brackets: [CEG].
         - Notes in a chord generally share the same duration.
         - Double-stops or unisons: [DD].

      5. TIES & SLURS:
         - Tie: Uses a hyphen (-) strictly between two notes of the SAME pitch. Example: c2-c.
         - Slur: Uses parentheses ( ). Example: (cde).
         - Distinguish visuals carefully: A curved line connecting different pitches is a SLUR. Same pitches is a TIE.

      6. TUPLETS:
         - Triplet: (3abc (3 notes in time of 2).
         - Duplet: (2ab (2 notes in time of 3).
         - General: (p:q:r means put p notes into time of q for the next r notes.

      7. LYRICS (w: field):
         - Use 'w:' fields immediately following the music line.
         - Separate syllables with spaces.
         - Hyphens (-): Separate syllables within a word (e.g., hal-le-lu-jah).
         - Underscores (_): Extend previous syllable to next note (melisma).
         - Asterisk (*): Skip a note (no lyric).
         - Pipe (|): Advance lyric alignment to the next measure.
         - Tilde (~): Join words under one note (e.g., word~one).
         - Example:
           C D E F |
           w: This is a test

      8. MULTIPLE VOICES (V: field):
         - Use V:1, V:2, etc., to denote different staves or polyphonic voices.
         - Define clef and name in header: V:1 clef=treble name="Soprano"
         - In body, use [V:1] to indicate which voice the following notes belong to.
         - ENSURE MEASURE ALIGNMENT: All voices must have the exact same duration per measure.

      9. RESTS:
         - z: Visible rest.
         - x: Invisible rest (useful for alignment).
         - Z: Multi-measure rest (e.g., Z4).

      10. PROHIBITED / UNSUPPORTED DIRECTIVES (DO NOT USE):
          The following cause errors in the web renderer (abcjs):
          %%measure, %%page, %%staves, %%score, %%abc, %%abc2pscompat, %%bg, %%eps, %%ps.
          Do NOT use %%measure to force measure numbers. Let the renderer calculate them.

      --------------------------------------------------------------------------------
      EXECUTION PROTOCOL:
      --------------------------------------------------------------------------------
      1.  **ANALYZE**: Identify the Clef, Key, Time Signature, and structural layout (systems/measures).
      2.  **DRAFT**: Write the ABC code observing the rules above.
      3.  **VALIDATE**: Use the 'validate_abc_notation' tool.
      4.  **CORRECT**: If errors exist, FIX them based on the standard rules above (e.g., fixing mismatched rhythms in voices).
      5.  **FINALIZE**: Output only valid, error-free ABC notation. Start with X:1.
    `;

    // Configure Thinking based on Model Family
    const isGemini2 = model.includes('2.5');
    const thinkingConfig: any = {
        includeThoughts: true
    };

    if (isGemini2) {
        // Configure specific budgets for 2.5 series
        if (model.includes('flash')) {
            thinkingConfig.thinkingBudget = 24576; // Max for Flash
        } else {
            thinkingConfig.thinkingBudget = 32768; // Max for Pro
        }
    } 
    // For Gemini 3, we rely on the default thinking level (High) by only setting includeThoughts: true.

    // Initialize Chat
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: systemInstruction,
        tools: [validateABCTool],
        thinkingConfig: thinkingConfig
      },
    });

    onLog(`Scanning image for musical structures...`, 'thinking');

    // Initial Message parts
    let currentMessageParts: Part[] = [
        ...parts,
        { text: "Transcribe this sheet music to ABC notation (Standard 2.1). Be extremely precise with pitch, rhythm, and lyric alignment. Ensure strict syntax compliance." }
    ];

    let fullText = "";
    let finalAbc = "";
    let turnCount = 0;
    const MAX_TURNS = 8; // Increased max turns to allow for corrections

    while (turnCount < MAX_TURNS) {
        onLog(`Turn ${turnCount + 1}: Refining transcription...`, 'info');
        
        const result = await chat.sendMessageStream({ message: currentMessageParts });
        
        let toolCall: any = null;
        let thoughtAccumulator = "";

        for await (const chunk of result) {
            const candidates = chunk.candidates;
            if (candidates && candidates.length > 0) {
                const parts = candidates[0].content.parts;
                
                for (const part of parts) {
                    // 1. Handle Native Thoughts
                    if (part.thought) {
                        if (part.text) {
                            thoughtAccumulator += part.text;
                            onLog(thoughtAccumulator, 'thinking');
                        }
                        continue;
                    }

                    // 2. Handle Text Content
                    if (part.text) {
                        fullText += part.text;
                        
                        // Extract and stream only the ABC part
                        const codeMatch = fullText.match(/(X:[\s\S]*)/);
                        if (codeMatch) {
                            onStreamUpdate(cleanAbc(codeMatch[1]));
                        } else {
                            if (fullText.includes("X:") || fullText.length > 50) {
                                onStreamUpdate(cleanAbc(fullText));
                            }
                        }
                    }

                    // 3. Handle Tool Calls
                    if (part.functionCall) {
                        toolCall = part.functionCall;
                    }
                }
            }
        }

        // If the model produced a tool call
        if (toolCall) {
            const functionName = toolCall.name;
            const args = toolCall.args;
            
            onLog(`Verifying syntax...`, 'info');

            if (functionName === 'validate_abc_notation') {
                const abcToValidate = args.abc_notation;
                
                if (abcToValidate) {
                    onStreamUpdate(cleanAbc(abcToValidate));
                }

                const validationResult = validatorFn(abcToValidate);

                let toolResponseContent = {};
                
                if (validationResult.isValid) {
                    onLog("Syntax valid. Performing visual fidelity check...", 'success');
                    toolResponseContent = {
                        result: "Syntax is VALID according to abcjs parser. \n\nFINAL CHECK: \n1. Do the lyrics align perfectly with the notes?\n2. Are multi-measure rests (Z) used correctly?\n3. Are there any prohibited directives like %%measure?\nIf perfect, output the ABC code."
                    };
                } else {
                    onLog(`Found ${validationResult.errors.length} syntax errors. correcting...`, 'warning');
                    toolResponseContent = {
                        result: `CRITICAL SYNTAX ERRORS DETECTED (ABCJS PARSER):\n${validationResult.errors.join('\n')}\n\nREFER TO THE ABC STANDARD 2.1 RULES IN SYSTEM INSTRUCTION. Fix these errors immediately.`
                    };
                }

                currentMessageParts = [
                    {
                        functionResponse: {
                            name: functionName,
                            id: toolCall.id,
                            response: toolResponseContent
                        }
                    }
                ];
            }
        } else {
            const potentialAbc = cleanAbc(fullText);
            if (potentialAbc.includes("X:")) {
                // Final validation before breaking
                const finalValidation = validatorFn(potentialAbc);
                if (!finalValidation.isValid) {
                    onLog(`Final output has errors. Forcing correction...`, 'warning');
                    currentMessageParts = [{ text: `Your final output still has syntax errors: ${finalValidation.errors.join(', ')}. You must fix them to comply with ABC Standard 2.1.` }];
                } else {
                    finalAbc = potentialAbc;
                    onLog("Transcription Finalized.", 'success');
                    break; 
                }
            } else {
                currentMessageParts = [{ text: "Please generate the final ABC notation code block now." }];
            }
        }

        turnCount++;
        fullText = "";
    }

    if (turnCount >= MAX_TURNS) {
        onLog("Optimization complete (Max turns reached).", 'warning');
        finalAbc = cleanAbc(fullText);
    }

    return {
      abc: finalAbc,
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    onLog(`Error: ${error.message || "Unknown error occurred"}`, 'warning');
    throw error;
  }
};

function cleanAbc(text: string): string {
    if (!text) return "";
    const match = text.match(/X:[\s\S]*/);
    if (match) {
        return match[0].replace(/```abc\s*/g, '').replace(/```$/g, '').trim();
    }
    return text.replace(/^```abc\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
}

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