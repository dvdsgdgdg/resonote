import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UploadFileState, LogEntry, GenerationState } from '../types';
import { AVAILABLE_MODELS } from '../constants/models';
import { AILogger } from './AILogger';

interface InputPanelProps {
  files: UploadFileState[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onReorderFiles: (files: UploadFileState[]) => void;
  onReset: () => void;
  promptText: string;
  onPromptChange: (text: string) => void;
  logs: LogEntry[];
  selectedModel: string;
  onModelSelect: (model: string) => void;
  onGenerate: () => void;
  generation: GenerationState;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  files,
  onFilesSelected,
  onRemoveFile,
  onReorderFiles,
  onReset,
  promptText,
  onPromptChange,
  logs,
  selectedModel,
  onModelSelect,
  onGenerate,
  generation
}) => {
  // State for container drop zone (new files)
  const [isDraggingContainer, setIsDraggingContainer] = useState(false);
  // State for reordering internal items
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  // State for file preview
  const [previewFile, setPreviewFile] = useState<UploadFileState | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close preview on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setPreviewFile(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // --- Container Drop Zone Handlers (New Files) ---

  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingContainer(true);
  }, []);

  const handleContainerDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingContainer(false);
  }, []);

  const handleContainerDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingContainer(false);
    
    // Only accept if we are NOT reordering items internally
    if (draggedItemIndex === null && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
       const imageFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
       if (imageFiles.length > 0) {
         onFilesSelected(imageFiles);
       }
    }
  }, [onFilesSelected, draggedItemIndex]);

  // --- Item Reordering Handlers ---

  const handleItemDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation(); // Prevent container from thinking we are dragging a file IN
    setDraggedItemIndex(index);
    // Visual drag effect
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.dropEffect = "move";
  };

  const handleItemDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    // We can add specific visual cues here if needed
  };

  const handleItemDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation(); // Stop container drop
    
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;

    const newFiles = [...files];
    const draggedItem = newFiles[draggedItemIndex];
    
    // Remove from old position
    newFiles.splice(draggedItemIndex, 1);
    // Insert at new position
    newFiles.splice(targetIndex, 0, draggedItem);
    
    onReorderFiles(newFiles);
    setDraggedItemIndex(null);
  };

  const handleItemDragEnd = () => {
    setDraggedItemIndex(null);
  };

  // --- Other Handlers ---

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const imageFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      onFilesSelected(imageFiles);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if ((files.length > 0 || promptText.trim()) && !generation.isLoading) {
            onGenerate();
        }
    }
  };

  const currentModelName = AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || selectedModel;

  return (
    <div className="flex flex-col gap-4">
        {/* Composer Container */}
        <div 
          className={`
            relative flex flex-col w-full bg-[#181818] rounded-xl border transition-all duration-200 shadow-2xl overflow-hidden group
            ${isDraggingContainer ? 'border-md-sys-primary ring-1 ring-md-sys-primary' : 'border-[#333] hover:border-[#444]'}
          `}
          onDragOver={handleContainerDragOver}
          onDragLeave={handleContainerDragLeave}
          onDrop={handleContainerDrop}
        >
            {/* Overlay for Drag State (New Files) */}
            {isDraggingContainer && (
                <div className="absolute inset-0 bg-md-sys-primary/10 z-50 flex items-center justify-center backdrop-blur-sm pointer-events-none">
                    <div className="bg-[#1E1E1E] px-4 py-2 rounded-lg border border-md-sys-primary/30 text-md-sys-primary font-medium flex items-center gap-2 shadow-xl">
                        <span className="material-symbols-rounded">cloud_upload</span>
                        Drop images to attach
                    </div>
                </div>
            )}

            {/* File Previews Area (Reorderable) */}
            {files.length > 0 && (
                <div className="flex flex-wrap gap-3 p-4 pb-0 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    {files.map((file, index) => (
                        <div 
                            key={file.id} 
                            draggable
                            onDragStart={(e) => handleItemDragStart(e, index)}
                            onDragOver={(e) => handleItemDragOver(e, index)}
                            onDrop={(e) => handleItemDrop(e, index)}
                            onDragEnd={handleItemDragEnd}
                            onClick={() => setPreviewFile(file)}
                            className={`
                                relative group/file w-16 h-16 rounded-lg overflow-hidden border bg-black/20 shadow-sm cursor-grab active:cursor-grabbing transition-all duration-200
                                ${draggedItemIndex === index 
                                    ? 'opacity-40 scale-90 border-md-sys-primary border-dashed' 
                                    : 'border-white/10 hover:border-white/30 hover:scale-105'
                                }
                            `}
                        >
                            <img src={file.preview} alt="attachment" className="w-full h-full object-cover opacity-80 group-hover/file:opacity-100 transition-opacity pointer-events-none select-none" />
                            
                            {/* Drag Handle Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover/file:bg-black/10 transition-colors pointer-events-none" />
                            
                            {/* Remove Button */}
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent drag start and preview when clicking remove
                                    onRemoveFile(file.id);
                                }}
                                className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 text-white/70 hover:text-white hover:bg-red-500 rounded-full opacity-0 group-hover/file:opacity-100 transition-all transform scale-90 group-hover/file:scale-100 z-10"
                                title="Remove file"
                            >
                                <span className="material-symbols-rounded text-[12px] block">close</span>
                            </button>

                            {/* Order Indicator */}
                            <div className="absolute bottom-0 right-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-1 pointer-events-none opacity-0 group-hover/file:opacity-100 transition-opacity">
                                <div className="flex justify-center">
                                    <span className="material-symbols-rounded text-[10px] text-white/70">drag_indicator</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Main Text Input */}
            <textarea
                ref={textareaRef}
                value={promptText}
                onChange={(e) => onPromptChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your music or drag & drop sheet music..."
                className="w-full bg-transparent text-[13px] text-gray-200 placeholder:text-gray-500 p-4 min-h-[100px] max-h-[400px] resize-none focus:outline-none leading-relaxed font-sans"
            />

            {/* Composer Toolbar */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-[#1E1E1E] border-t border-[#2A2A2A]">
                
                {/* Left: Model & Attach */}
                <div className="flex items-center gap-2">
                    {/* Model Selector Badge */}
                    <div className="relative group/model">
                        <select
                            value={selectedModel}
                            onChange={(e) => onModelSelect(e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        >
                            {AVAILABLE_MODELS.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        <div className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full bg-[#2A2A2A] hover:bg-[#333] border border-white/5 transition-colors cursor-pointer group-hover/model:border-white/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"></span>
                            <span className="text-[11px] font-semibold text-gray-300 truncate max-w-[120px] tracking-tight">{currentModelName}</span>
                            <span className="material-symbols-rounded text-[14px] text-gray-500 group-hover/model:text-gray-400 transition-colors">expand_more</span>
                        </div>
                    </div>

                    <div className="h-4 w-px bg-[#333] mx-1"></div>

                    {/* Attach Button */}
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-[#2A2A2A] rounded-md transition-all tooltip-trigger relative group/btn"
                        title="Attach image"
                    >
                         <span className="material-symbols-rounded text-[20px]">add_photo_alternate</span>
                         <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleFileInputChange} />
                    </button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    {/* Reset (Only visible if content exists) */}
                    {(files.length > 0 || promptText) && (
                        <button 
                            onClick={onReset}
                            className="text-[10px] font-medium text-gray-500 hover:text-red-400 uppercase tracking-wider transition-colors"
                        >
                            Clear
                        </button>
                    )}

                    {/* Generate Button */}
                    <button 
                        onClick={onGenerate}
                        disabled={files.length === 0 && !promptText.trim() || generation.isLoading}
                        className={`
                            h-8 w-8 flex items-center justify-center rounded-lg transition-all duration-200
                            ${(files.length > 0 || promptText.trim()) && !generation.isLoading
                                ? 'bg-white text-black hover:scale-105 shadow-[0_0_10px_rgba(255,255,255,0.1)]' 
                                : 'bg-[#2A2A2A] text-gray-600 cursor-not-allowed'
                            }
                        `}
                    >
                        {generation.isLoading ? (
                            <span className="material-symbols-rounded text-[18px] animate-spin">progress_activity</span>
                        ) : (
                            <span className="material-symbols-rounded text-[20px]">arrow_upward</span>
                        )}
                    </button>
                </div>
            </div>
        </div>

        {/* Error Display */}
        {generation.error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                 <span className="material-symbols-rounded text-red-400 mt-0.5">error</span>
                 <div>
                     <p className="text-xs font-bold text-red-400">Generation Failed</p>
                     <p className="text-xs text-red-300/80 mt-1">{generation.error}</p>
                 </div>
            </div>
        )}

        {/* Logs */}
        <AILogger logs={logs} visible={logs.length > 0} />

        {/* Image Preview Modal */}
        {previewFile && (
            <div 
                className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-200"
                onClick={() => setPreviewFile(null)}
            >
                {/* Close Button */}
                <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50">
                    <span className="material-symbols-rounded">close</span>
                </button>

                <div 
                    className="max-w-full max-h-full flex flex-col items-center gap-4 relative animate-in zoom-in-95 duration-200" 
                    onClick={e => e.stopPropagation()}
                >
                    <img 
                        src={previewFile.preview} 
                        alt="Full size preview" 
                        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10" 
                    />
                    <div className="text-center px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full border border-white/5">
                        <p className="text-white font-medium text-sm">{previewFile.file.name}</p>
                        <p className="text-gray-400 text-xs mt-0.5">
                            {(previewFile.file.size / 1024).toFixed(1)} KB
                        </p>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};