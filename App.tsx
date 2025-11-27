import React, { useState } from 'react';
import { UploadZone } from './components/UploadZone';
import { MusicDisplay } from './components/MusicDisplay';
import { Editor } from './components/Editor';
import { Button } from './components/Button';
import { AILogger } from './components/AILogger';
import { convertImageToABC } from './services/geminiService';
import { UploadFileState, GenerationState, LogEntry } from './types';

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
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro' },
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

  const handleFilesSelected = (newFiles: File[]) => {
    const fileStates: UploadFileState[] = newFiles.map(f => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      preview: URL.createObjectURL(f),
      status: 'idle'
    }));
    setFiles(prev => [...prev, ...fileStates]);
  };

  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'thinking' = 'info') => {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    setGeneration(prev => {
      const logs = [...prev.logs];
      const lastLog = logs[logs.length - 1];

      // Smart Coalescing: If we are streaming 'thinking' text, append to the last log entry
      if (type === 'thinking' && lastLog && lastLog.type === 'thinking') {
         logs[logs.length - 1] = {
           ...lastLog,
           message: lastLog.message + message
         };
         return { ...prev, logs };
      }

      return {
        ...prev,
        logs: [...prev.logs, { timestamp, message, type }]
      };
    });
  };

  const handleGenerate = async () => {
    if (files.length === 0) return;

    setGeneration({ isLoading: true, error: null, result: null, logs: [] });
    setManualAbc(''); // Clear previous result
    
    // Initial Log
    addLog("Session started.", 'info');

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
        }
      );

      setGeneration(prev => ({ 
        ...prev, 
        isLoading: false, 
        result 
      }));
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

  return (
    <div className="min-h-screen bg-md-sys-background text-md-sys-secondary selection:bg-md-sys-primary selection:text-md-sys-onPrimary font-sans flex flex-col">
      
      {/* Desktop Menu Bar */}
      <div className="fixed top-0 left-0 right-0 h-10 bg-[#1e1e1e] border-b border-black z-50 flex items-center justify-between px-4 select-none shadow-md">
        <div className="flex items-center gap-4">
            {/* Icon & Title */}
            <div className="flex items-center gap-3 mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-6 h-6">
                  <rect width="32" height="32" rx="10" fill="#A8C7FA"/>
                  <path d="M20 10V6h-7v12.5c0 1.93-1.57 3.5-3.5 3.5S6 20.43 6 18.5 7.57 15 9.5 15c.47 0 .91.1 1.32.26V10h9z" fill="#062E6F" transform="translate(2, 2)"/>
                  <path d="M26 4l-1.5 3L21.5 8.5 24.5 10 26 13l1.5-3 3-1.5-3-1.5z" fill="#062E6F"/>
                </svg>
                <span className="text-sm font-bold tracking-tight text-white/90">Resonote</span>
            </div>
            
            {/* Desktop Menu Items */}
            <div className="hidden md:flex items-center gap-1">
                 {['File', 'Edit', 'Selection', 'View', 'Go', 'Run', 'Terminal', 'Help'].map(item => (
                     <button key={item} className="px-3 py-1 rounded hover:bg-white/10 text-[12px] text-md-sys-secondary hover:text-white transition-colors cursor-default">
                        {item}
                     </button>
                 ))}
            </div>
        </div>

        {/* Right Side Status & Traffic Lights */}
        <div className="flex items-center gap-4">
             {/* Traffic Lights */}
             <div className="flex gap-2 pl-2">
                 <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-black/20 shadow-sm hover:brightness-110 cursor-pointer"></div>
                 <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-black/20 shadow-sm hover:brightness-110 cursor-pointer"></div>
                 <div className="w-3 h-3 rounded-full bg-[#28c840] border border-black/20 shadow-sm hover:brightness-110 cursor-pointer"></div>
             </div>
        </div>
      </div>

      <main className="flex-1 pt-14 pb-6 px-4 lg:px-6 max-w-[1920px] mx-auto w-full">
        
        {/* Header Content */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">
              Sheet music to <span className="text-transparent bg-clip-text bg-gradient-to-r from-md-sys-primary to-indigo-400">digital audio</span>
            </h1>
            <p className="text-xs text-md-sys-secondary max-w-2xl leading-relaxed">
               Resonote uses advanced reasoning to create accurate, playable ABC notation from images.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-160px)]">
          
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
                  {generation.isLoading ? 'Processing...' : 'Convert to Music'}
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
              />
            </div>
          </div>

          {/* Right Column: Visualization */}
          <div className="lg:col-span-7 h-full flex flex-col">
             <div className="flex-1 bg-md-sys-surface rounded-2xl border border-md-sys-outline/20 overflow-hidden relative shadow-2xl">
                 <MusicDisplay abcNotation={manualAbc} warningId="abc-parse-warnings" />
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}