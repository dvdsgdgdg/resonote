import React, { useState, useEffect, useCallback } from 'react';
import abcjs from 'abcjs';
import { UploadZone } from './components/UploadZone';
import { MusicDisplay } from './components/MusicDisplay';
import { Editor } from './components/Editor';
import { Button } from './components/Button';
import { AILogger } from './components/AILogger';
import { Header } from './components/Header';
import { AboutModal } from './components/modals/AboutModal';
import { FeedbackModal } from './components/modals/FeedbackModal';
import { TermsModal } from './components/modals/TermsModal';
import { convertImageToABC } from './services/geminiService';
import { UploadFileState, GenerationState, LogEntry, ValidationResult } from './types';

// Default ABC example with chords for synth and visual test
const DEFAULT_ABC = `X: 1
T: Cooley's
M: 4/4
L: 1/8
R: reel
K: Emin
|:D2|"Em"EB{c}BA B2 EB|~B2 AB dBAG|"D"FDAD BDAD|FDAD dAFD|
"Em"EBBA B2 EB|B2 AB defg|"D"afe^c dBAF|"Em"DEFD E2:|
|:gf|"Em"eB B2 efge|eB B2 gedB|"D"A2 FA DAFA|A2 FA defg|
"Em"eB B2 eBgB|eB B2 defg|"D"afe^c dBAF|"Em"DEFD E2:|`;

const AVAILABLE_MODELS = [
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Agent)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
];

export default function App() {
  const [files, setFiles] = useState<UploadFileState[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-pro-preview');
  const [generation, setGeneration] = useState<GenerationState>({
    isLoading: false,
    error: null,
    result: null,
    logs: []
  });
  // Initialize with DEFAULT_ABC directly, so we don't rely on fallbacks during render
  const [manualAbc, setManualAbc] = useState<string>(DEFAULT_ABC);

  // UI State for Menus & Modals
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Optimized file handlers with useCallback
  const handleFilesSelected = useCallback((newFiles: File[]) => {
    const fileStates: UploadFileState[] = newFiles.map(f => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      preview: URL.createObjectURL(f),
      status: 'idle'
    }));
    setFiles(prev => [...prev, ...fileStates]);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleReorderFiles = useCallback((newOrder: UploadFileState[]) => {
    setFiles(newOrder);
  }, []);

  // Global Paste Listener (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Check if clipboard has items
      if (!e.clipboardData || !e.clipboardData.items) return;

      const items = Array.from(e.clipboardData.items);
      const imageFiles: File[] = [];

      for (const item of items) {
        // Only accept images
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      // If we found images, add them and prevent default paste (which might paste text if mixed)
      if (imageFiles.length > 0) {
        e.preventDefault();
        handleFilesSelected(imageFiles);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handleFilesSelected]);

  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'thinking' = 'info') => {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    setGeneration(prev => {
      const logs = [...prev.logs];
      const lastLog = logs[logs.length - 1];

      // STREAMING LOGIC:
      if (type === 'thinking' && lastLog?.type === 'thinking') {
          if (lastLog.message === message) return prev;

          logs[logs.length - 1] = {
              ...lastLog,
              message: message 
          };
          return { ...prev, logs };
      }

      return {
        ...prev,
        logs: [...logs, { timestamp, message, type }]
      };
    });
  };

  // The Validator Function: This runs on the client but is called by the AI Agent
  const validateABC = (abcCode: string): ValidationResult => {
    try {
        if (!abcjs || typeof abcjs.parseOnly !== 'function') {
             // Fallback if abcjs isn't fully ready
             return { isValid: false, errors: ["System error: abcjs parser not initialized."] };
        }

        const tune = abcjs.parseOnly(abcCode);
        
        // Casting tune to any[] to avoid TypeScript error
        if (!tune || (tune as any[]).length === 0) {
            return { isValid: false, errors: ["No valid ABC music data found."] };
        }

        const warnings = tune[0].warnings || [];
        
        const criticalErrors = warnings.map((w: any) => {
            // Convert warning object to string if necessary
            let msg = "";
            if (typeof w === 'string') {
              msg = w;
            } else if (w && typeof w.message === 'string') {
              msg = w.message;
            } else {
              msg = "Unknown syntax warning";
            }
            
            // Format better for the AI
            if (w.line) msg = `Line ${w.line}: ${msg}`;
            return msg;
        });

        // Filter to ensure we catch the 'Unknown directive' specifically as an error
        if (criticalErrors.length > 0) {
            return { isValid: false, errors: criticalErrors };
        }

        return { isValid: true, errors: [] };
    } catch (e: any) {
        return { isValid: false, errors: [e.message || "Unknown parsing error"] };
    }
  };

  const handleGenerate = async () => {
    if (files.length === 0) return;

    setGeneration({ isLoading: true, error: null, result: null, logs: [] });
    setManualAbc(''); // Clear previous result
    
    try {
      const rawFiles = files.map(f => f.file);
      
      const result = await convertImageToABC(
        rawFiles, 
        selectedModel,
        (msg, type) => {
          addLog(msg, type);
        },
        (streamedText) => {
          setManualAbc(streamedText);
        },
        validateABC // Pass the validator function to the service
      );

      setGeneration(prev => ({ 
        ...prev, 
        isLoading: false, 
        result 
      }));
      setManualAbc(result.abc); // Ensure final result is set
      addLog("Conversion and Verification Complete.", 'success');

    } catch (err: any) {
      setGeneration(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || "Something went wrong"
      }));
    }
  };

  const handleReset = () => {
    setFiles([]);
    setGeneration({ isLoading: false, error: null, result: null, logs: [] });
    // Restore default ABC on explicit reset
    setManualAbc(DEFAULT_ABC);
  };

  // Shared ID for the editor textarea so MusicDisplay can bind to it
  const EDITOR_TEXTAREA_ID = "abc-source-textarea";

  return (
    <div className="min-h-screen bg-md-sys-background text-md-sys-secondary selection:bg-md-sys-primary selection:text-md-sys-onPrimary font-sans flex flex-col">
      
      <Header 
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        onOpenAbout={() => setShowAbout(true)}
        onOpenFeedback={() => setShowFeedback(true)}
        onOpenTerms={() => setShowTerms(true)}
      />

      <main className="flex-1 pt-14 pb-6 px-4 lg:px-6 max-w-[1920px] mx-auto w-full">
        
        {/* Main Grid - Header removed, height adjusted to fill space */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-100px)]">
          
          {/* Left Column: Input & Editor */}
          <div className="lg:col-span-5 flex flex-col gap-4 h-full overflow-y-auto pr-1">
            
            {/* Upload Section */}
            <div className="p-4 rounded-xl bg-md-sys-surface border border-md-sys-outline/40 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between mb-3">
                 <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-rounded text-sm">input</span>
                    Input Source
                 </h3>
                 {files.length > 0 && (
                   <button onClick={handleReset} className="text-[10px] text-md-sys-error hover:text-white transition-colors uppercase font-bold tracking-wide">Clear all</button>
                 )}
              </div>
              
              <UploadZone 
                onFilesSelected={handleFilesSelected} 
                onFileRemove={handleRemoveFile}
                onFilesReordered={handleReorderFiles}
                currentFiles={files} 
              />

              {/* Status Logger */}
              <AILogger logs={generation.logs} visible={generation.logs.length > 0} />

              <div className="mt-4">
                {/* Model Selector */}
                <div className="flex items-center justify-between mb-3 bg-md-sys-surfaceVariant/30 p-2 rounded-lg border border-md-sys-outline/10">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-md-sys-primary text-[18px]">smart_toy</span>
                        <span className="text-xs font-medium text-md-sys-secondary">Model</span>
                    </div>
                    <div className="relative">
                        <select 
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="appearance-none bg-transparent text-xs font-bold text-white/90 pl-2 pr-6 py-1 outline-none cursor-pointer text-right w-[140px]"
                        >
                            {AVAILABLE_MODELS.map(model => (
                            <option key={model.id} value={model.id} className="bg-[#2d2d2d] text-white">
                                {model.name}
                            </option>
                            ))}
                        </select>
                        <span className="material-symbols-rounded absolute right-0 top-1/2 -translate-y-1/2 text-[16px] text-md-sys-secondary pointer-events-none">expand_more</span>
                    </div>
                </div>

                <Button 
                  onClick={handleGenerate} 
                  disabled={files.length === 0} 
                  isLoading={generation.isLoading}
                  className="w-full !h-10 !text-xs uppercase tracking-widest font-bold"
                  icon="piano"
                >
                  {generation.isLoading ? 'Convert & Verify' : 'Convert to Music'}
                </Button>
                {generation.error && (
                  <p className="mt-3 text-xs text-md-sys-error bg-md-sys-error/10 p-2 rounded border border-md-sys-error/20 flex items-center gap-2">
                    <span className="material-symbols-rounded text-sm">error</span>
                    {generation.error}
                  </p>
                )}
              </div>
            </div>

            {/* Code Editor */}
            <div className="flex-1 min-h-[300px] flex flex-col">
              <Editor 
                value={manualAbc} 
                onChange={setManualAbc} 
                warningId="abc-parse-warnings"
                textareaId={EDITOR_TEXTAREA_ID}
              />
            </div>
          </div>

          {/* Right Column: Visualization */}
          <div className="lg:col-span-7 h-full flex flex-col">
             <div className="flex-1 bg-md-sys-surface rounded-2xl border border-md-sys-outline/20 overflow-hidden relative shadow-2xl">
                 <MusicDisplay 
                   abcNotation={manualAbc} 
                   warningId="abc-parse-warnings" 
                   textareaId={EDITOR_TEXTAREA_ID}
                 />
             </div>
          </div>

        </div>
      </main>

      {/* Modals */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />

    </div>
  );
}