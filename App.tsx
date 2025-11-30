import React, { useState } from 'react';
import { MusicDisplay } from './components/MusicDisplay';
import { Editor } from './components/Editor';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { AboutModal } from './components/modals/AboutModal';
import { FeedbackModal } from './components/modals/FeedbackModal';
import { TermsModal } from './components/modals/TermsModal';
import { ChangelogModal } from './components/modals/ChangelogModal';
import { convertImageToABC } from './services/geminiService';
import { GenerationState } from './types';
import { DEFAULT_ABC } from './constants/defaults';
import { DEFAULT_MODEL_ID } from './constants/models';
import { validateABC } from './utils/abcValidator';
import { useFileHandler } from './hooks/useFileHandler';

export default function App() {
  // Custom Hook for File Management
  const { 
    files, 
    handleFilesSelected, 
    handleRemoveFile, 
    handleReorderFiles, 
    resetFiles 
  } = useFileHandler();

  // App State
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL_ID);
  const [promptText, setPromptText] = useState<string>("");
  const [generation, setGeneration] = useState<GenerationState>({
    isLoading: false,
    error: null,
    result: null,
    logs: []
  });
  
  // Initialize with DEFAULT_ABC directly
  const [manualAbc, setManualAbc] = useState<string>(DEFAULT_ABC);

  // UI State for Menus & Modals
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

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

  const handleGenerate = async () => {
    if (files.length === 0 && !promptText.trim()) return;

    setGeneration({ isLoading: true, error: null, result: null, logs: [] });
    setManualAbc(''); // Clear previous result
    
    try {
      const rawFiles = files.map(f => f.file);
      
      const result = await convertImageToABC(
        rawFiles, 
        promptText,
        selectedModel,
        (msg, type) => {
          addLog(msg, type);
        },
        (streamedText) => {
          setManualAbc(streamedText);
        },
        validateABC // Use the imported validator
      );

      setGeneration(prev => ({ 
        ...prev, 
        isLoading: false, 
        result 
      }));
      setManualAbc(result.abc); // Ensure final result is set
      addLog("Generation Complete.", 'success');

    } catch (err: any) {
      setGeneration(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || "Something went wrong"
      }));
    }
  };

  const handleReset = () => {
    resetFiles();
    setPromptText("");
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
        onOpenChangelog={() => setShowChangelog(true)}
      />

      <main className="flex-1 pt-14 pb-6 px-4 lg:px-6 max-w-[1920px] mx-auto w-full">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-100px)]">
          
          {/* Left Column: Input & Editor */}
          <div className="lg:col-span-5 flex flex-col gap-4 h-full overflow-y-auto pr-1">
            
            {/* Input Panel Component */}
            <InputPanel 
              files={files}
              onFilesSelected={handleFilesSelected}
              onRemoveFile={handleRemoveFile}
              onReorderFiles={handleReorderFiles}
              onReset={handleReset}
              promptText={promptText}
              onPromptChange={setPromptText}
              logs={generation.logs}
              selectedModel={selectedModel}
              onModelSelect={setSelectedModel}
              onGenerate={handleGenerate}
              generation={generation}
            />

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
      <ChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} />

    </div>
  );
}