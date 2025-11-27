import React, { useState } from 'react';
import { UploadZone } from './components/UploadZone';
import { MusicDisplay } from './components/MusicDisplay';
import { Editor } from './components/Editor';
import { Button } from './components/Button';
import { AILogger } from './components/AILogger';
import { convertImageToABC } from './services/geminiService';
import { UploadFileState, GenerationState, LogEntry } from './types';

// Default ABC example for empty state
const DEFAULT_ABC = `X: 1
T: Cooley's
M: 4/4
L: 1/8
K: Emin
|:D2|EB{c}BA B2 EB|~B2 AB dBAG|FDAD BDAD|FDAD dAFD|
EBBA B2 EB|B2 AB defg|afe^c dBAF|DEFD E2:|
|:gf|eB B2 efge|eB B2 gedB|A2 FA DAFA|A2 FA defg|
eB B2 eBgB|eB B2 defg|afe^c dBAF|DEFD E2:|`;

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
  const [manualAbc, setManualAbc] = useState<string>('');

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
    setManualAbc('');
  };

  return (
    <div className="min-h-screen bg-md-sys-background text-md-sys-secondary selection:bg-md-sys-primary selection:text-md-sys-onPrimary font-sans flex flex-col">
      
      {/* Desktop Menu Bar */}
      <div className="fixed top-0 left-0 right-0 h-10 bg-[#1e1e1e] border-b border-black z-50 flex items-center justify-between px-4 select-none shadow-md">
        <div className="flex items-center gap-4">
            {/* Icon & Title */}
            <div className="flex items-center gap-2 mr-2">
                <span className="material-symbols-rounded text-md-sys-primary text-[18px]">auto_awesome</span>
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

        {/* Right Side Status & Model Selector */}
        <div className="flex items-center gap-4">
             {/* Model Selector Dropdown */}
             <div className="relative flex items-center bg-[#2d2d2d] rounded border border-[#444] hover:border-[#666] transition-colors">
               <span className="material-symbols-rounded absolute left-2 text-[16px] text-md-sys-primary pointer-events-none">smart_toy</span>
               <select 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="appearance-none bg-transparent text-[11px] font-medium text-white/90 pl-8 pr-8 py-1 outline-none cursor-pointer w-[160px]"
               >
                 {AVAILABLE_MODELS.map(model => (
                   <option key={model.id} value={model.id} className="bg-[#2d2d2d] text-white">
                     {model.name}
                   </option>
                 ))}
               </select>
               <span className="material-symbols-rounded absolute right-2 text-[16px] text-md-sys-secondary pointer-events-none">expand_more</span>
             </div>

             <div className="flex gap-2 pl-2 border-l border-white/10">
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
                value={manualAbc || DEFAULT_ABC} 
                onChange={setManualAbc} 
              />
            </div>
          </div>

          {/* Right Column: Visualization */}
          <div className="lg:col-span-7 h-full flex flex-col">
             <div className="flex-1 bg-md-sys-surface rounded-2xl border border-md-sys-outline/20 overflow-hidden relative shadow-2xl">
                 <MusicDisplay abcNotation={manualAbc || DEFAULT_ABC} />
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}