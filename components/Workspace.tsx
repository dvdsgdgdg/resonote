
import React from 'react';
import { MusicDisplay, MusicDisplayHandle } from './MusicDisplay';
import { Editor } from './Editor';
import { InputPanel } from './InputPanel';
import { Session, UploadFileState, UserSettings } from '../types';
import { ViewSettings } from '../App';

interface WorkspaceProps {
  session: Session;
  onUpdateSession: (id: string, updates: Partial<Session['data']>) => void;
  onGenerate: (sessionId: string) => void;
  musicDisplayRef: React.Ref<MusicDisplayHandle>;
  onImport: () => void;
  onExport: () => void;
  onTranspose: (semitones: number) => void;
  onCommitHistory?: () => void;
  viewSettings: ViewSettings;
  userSettings?: UserSettings;
}

export const Workspace: React.FC<WorkspaceProps> = ({ 
  session, 
  onUpdateSession, 
  onGenerate,
  musicDisplayRef,
  onImport,
  onExport,
  onTranspose,
  onCommitHistory,
  viewSettings,
  userSettings
}) => {
  const { data } = session;
  const EDITOR_TEXTAREA_ID = `abc-source-textarea-${session.id}`;
  const WARNING_ID = `abc-parse-warnings-${session.id}`;

  const handleFilesSelected = (newFiles: File[]) => {
      const fileStates: UploadFileState[] = newFiles.map(f => ({
        id: Math.random().toString(36).substring(7),
        file: f,
        preview: URL.createObjectURL(f),
        status: 'idle'
      }));
      onUpdateSession(session.id, { files: [...data.files, ...fileStates] });
  };

  const handleRemoveFile = (fileId: string) => {
      onUpdateSession(session.id, { files: data.files.filter(f => f.id !== fileId) });
  };

  const handleReorderFiles = (newOrder: UploadFileState[]) => {
      onUpdateSession(session.id, { files: newOrder });
  };

  const handleReset = () => {
      onUpdateSession(session.id, { 
          files: [], 
          prompt: "", 
          abc: "", 
          generation: { isLoading: false, error: null, result: null, logs: [] } 
      });
      // We don't commit history here immediately, let user do next action
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full transition-all duration-300 ease-in-out">
      
      {/* Left Column: Input & Editor */}
      <div className={`
          flex flex-col gap-4 h-full overflow-y-auto pr-1 transition-all duration-300 ease-in-out
          ${viewSettings.showSidebar ? 'lg:col-span-5 opacity-100 translate-x-0' : 'hidden opacity-0 -translate-x-full w-0'}
      `}>
        
        {/* Input Panel */}
        <InputPanel 
          files={data.files}
          onFilesSelected={handleFilesSelected}
          onRemoveFile={handleRemoveFile}
          onReorderFiles={handleReorderFiles}
          onReset={handleReset}
          promptText={data.prompt}
          onPromptChange={(text) => onUpdateSession(session.id, { prompt: text })}
          logs={data.generation.logs}
          selectedModel={data.model}
          onModelSelect={(model) => onUpdateSession(session.id, { model })}
          onGenerate={() => onGenerate(session.id)}
          generation={data.generation}
          userSettings={userSettings}
        />

        {/* Code Editor */}
        <div className="flex-1 min-h-[300px] flex flex-col pb-4">
          <Editor 
            value={data.abc} 
            onChange={(val) => onUpdateSession(session.id, { abc: val })} 
            warningId={WARNING_ID}
            textareaId={EDITOR_TEXTAREA_ID}
            onImport={onImport}
            onExport={onExport}
            onTranspose={onTranspose}
            onCommitHistory={onCommitHistory}
          />
        </div>
      </div>

      {/* Right Column: Visualization */}
      <div className={`
          h-full flex flex-col pb-4 transition-all duration-300 ease-in-out
          ${viewSettings.showSidebar ? 'lg:col-span-7' : 'lg:col-span-12'}
      `}>
         <div className="flex-1 bg-md-sys-surface rounded-2xl border border-md-sys-outline/20 overflow-hidden relative shadow-2xl">
             <MusicDisplay 
               ref={musicDisplayRef}
               abcNotation={data.abc} 
               warningId={WARNING_ID} 
               textareaId={EDITOR_TEXTAREA_ID}
               onThumbnailGenerated={(base64) => onUpdateSession(session.id, { thumbnail: base64 })}
               zoomLevel={viewSettings.zoomLevel}
             />
         </div>
      </div>

    </div>
  );
};
