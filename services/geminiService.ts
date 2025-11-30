import { GoogleGenAI, Tool, Type, Part } from "@google/genai";
import { ABCResult, ValidationResult } from "../types";
import { SYSTEM_INSTRUCTION } from "./prompts";

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
  prompt: string,
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
        try {
            const base64Data = await fileToGenerativePart(file);
            return {
            inlineData: {
                data: base64Data,
                mimeType: file.type
            }
            };
        } catch (e: any) {
            throw new Error(`Failed to process image ${file.name}: ${e.message}`);
        }
      })
    );

    // Configure Thinking based on Model Family
    let thinkingConfig = undefined;
    
    if (model.includes('2.5')) {
        // Gemini 2.5 requires explicit thinking budget
        thinkingConfig = {
            includeThoughts: true,
            thinkingBudget: model.includes('flash') ? 24576 : 32768
        };
    } else if (model.includes('gemini-3')) {
        // Gemini 3 uses dynamic thinking (default High). 
        // We must set includeThoughts to true to receive the thought trace.
        // We do NOT set thinkingBudget here to allow the model to manage its own reasoning depth (Dynamic).
        thinkingConfig = {
            includeThoughts: true
        };
    }

    // Initialize Chat
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [validateABCTool],
        thinkingConfig: thinkingConfig
      },
    });

    onLog(`Analyzing input...`, 'thinking');

    // Construct the initial message
    let instructionText = "Transcribe this sheet music to ABC notation (Standard 2.1). Be extremely precise with pitch, rhythm, and lyric alignment. Ensure strict syntax compliance.";

    if (files.length === 0) {
        // If no images, use the prompt as the main instruction
        instructionText = prompt || instructionText;
    } else if (prompt && prompt.trim() !== "") {
        // If images exist, append user instructions
        instructionText = `${instructionText}\n\nUser Instructions: ${prompt}`;
    }

    // Initial Message parts
    let currentMessageParts: Part[] = [
        ...parts,
        { text: instructionText }
    ];

    let fullText = "";
    let finalAbc = "";
    let turnCount = 0;
    const MAX_TURNS = 8; // Increased max turns to allow for corrections

    while (turnCount < MAX_TURNS) {
        onLog(`Turn ${turnCount + 1}: Generating...`, 'info');
        
        const result = await chat.sendMessageStream({ message: currentMessageParts });
        
        let toolCall: any = null;
        let thoughtAccumulator = "";

        for await (const chunk of result) {
            const candidates = chunk.candidates;
            // Robust check to prevent "parts is not iterable"
            if (candidates && candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
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
                            // If it's a chat response or partial ABC, still stream it to editor/log
                            // If user is just chatting, show the text.
                            if (fullText.includes("X:") || fullText.length > 5) {
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
                // If the output doesn't look like ABC (maybe just chat), we can stop unless we want to force ABC
                if (files.length === 0 && !fullText.includes("X:")) {
                    // Chat mode, just finish
                    finalAbc = fullText;
                    onLog("Response received.", 'success');
                    break;
                }
                currentMessageParts = [{ text: "Please generate the final ABC notation code block now. Start with X:1" }];
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
      if (reader.error) {
        reject(reader.error);
        return;
      }
      
      const res = reader.result as string;
      if (!res) {
        reject(new Error("Failed to read file: result is empty"));
        return;
      }

      try {
        const parts = res.split(',');
        if (parts.length < 2) {
             reject(new Error("Invalid Data URL format"));
             return;
        }
        const base64String = parts[1];
        resolve(base64String);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => {
        reject(reader.error || new Error("Unknown FileReader error"));
    };
    reader.readAsDataURL(file);
  });
}