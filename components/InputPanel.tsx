
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UploadFileState, LogEntry, GenerationState, UserSettings } from '../types';
import { AVAILABLE_MODELS } from '../constants/models';
import { AILogger } from './AILogger';
import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
const pdfjs = (pdfjsLib as any).default ?? pdfjsLib;

if (pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

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
  userSettings?: UserSettings; // Pass settings to filter models
}

// --- Internal PDF Viewer Component ---
const PdfViewer = ({ url }: { url: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0); // Start at 100%
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load PDF Document
  useEffect(() => {
    let active = true;
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        // Use the resolved pdfjs instance
        const loadingTask = pdfjs.getDocument(url);
        const loadedPdf = await loadingTask.promise;
        if (active) {
          setPdf(loadedPdf);
          setNumPages(loadedPdf.numPages);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Error loading PDF", err);
        if (active) {
          setError(err.message || "Failed to load PDF.");
          setLoading(false);
        }
      }
    };
    loadPdf();
    return () => { active = false; };
  }, [url]);

  // Render Current Page
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    
    let active = true;
    const renderPage = async () => {
      try {
        const page = await pdf.getPage(pageNum);
        if (!active) return;

        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d');
        if (!context) return;

        const viewport = page.getViewport({ scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error("Error rendering page", err);
      }
    };
    
    renderPage();
    return () => { active = false; };
  }, [pdf, pageNum, scale]);

  const changePage = (offset: number) => {
    setPageNum(prev => Math.min(Math.max(1, prev + offset), numPages));
  };

  const handleZoom = (delta: number) => {
      setScale(prev => {
          const newScale = prev + delta;
          return Math.max(0.25, Math.min(newScale, 5.0)); // Range 25% - 500%
      });
  };

  if (loading) {
      return (
          <div className="w-full h-full flex items-center justify-center text-gray-400 gap-2">
              <span className="material-symbols-rounded animate-spin">progress_activity</span>
              Loading PDF...
          </div>
      );
  }

  if (error) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center text-red-400 gap-2">
              <span className="material-symbols-rounded">broken_image</span>
              <p>{error}</p>
          </div>
      );
  }

  return (
      <div className="flex flex-col items-center w-full h-full">
          {/* Scroll Container */}
          <div className="flex-1 w-full overflow-auto bg-md-sys-surfaceVariant/50 rounded-t-lg custom-scrollbar relative">
               <div className="min-h-full min-w-full flex items-center justify-center p-8">
                    <canvas 
                        ref={canvasRef} 
                        className="shadow-2xl transition-all duration-100 ease-out bg-white block" 
                        style={{ maxWidth: 'none', maxHeight: 'none' }}
                    />
               </div>
          </div>
          
          {/* Controls */}
          <div className="w-full bg-md-sys-surface p-3 border-t border-md-sys-outline/10 flex items-center justify-between rounded-b-lg shrink-0 z-10">
              
              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleZoom(-0.25)}
                    className="p-1.5 rounded-full hover:bg-md-sys-surfaceVariant text-md-sys-secondary hover:text-md-sys-onSurface transition-colors"
                    title="Zoom Out"
                  >
                      <span className="material-symbols-rounded text-[20px]">remove</span>
                  </button>
                  <span className="text-xs font-mono text-md-sys-secondary w-12 text-center select-none">
                      {Math.round(scale * 100)}%
                  </span>
                  <button 
                    onClick={() => handleZoom(0.25)}
                    className="p-1.5 rounded-full hover:bg-md-sys-surfaceVariant text-md-sys-secondary hover:text-md-sys-onSurface transition-colors"
                    title="Zoom In"
                  >
                      <span className="material-symbols-rounded text-[20px]">add</span>
                  </button>
                  {/* Fit Width / Reset */}
                  <button 
                    onClick={() => setScale(1.0)}
                    className="p-1.5 rounded-full hover:bg-md-sys-surfaceVariant text-md-sys-secondary hover:text-md-sys-onSurface transition-colors ml-1"
                    title="Reset Zoom (100%)"
                  >
                      <span className="material-symbols-rounded text-[18px]">center_focus_strong</span>
                  </button>
              </div>

              {/* Page Info */}
              <span className="text-sm font-mono text-md-sys-onSurface select-none">
                  Page {pageNum} of {numPages}
              </span>

              {/* Navigation Controls */}
              <div className="flex items-center gap-2">
                <button 
                    onClick={() => changePage(-1)}
                    disabled={pageNum <= 1}
                    className="p-1.5 rounded-full hover:bg-md-sys-surfaceVariant disabled:opacity-30 text-md-sys-onSurface transition-colors"
                >
                    <span className="material-symbols-rounded">chevron_left</span>
                </button>
                <button 
                    onClick={() => changePage(1)}
                    disabled={pageNum >= numPages}
                    className="p-1.5 rounded-full hover:bg-md-sys-surfaceVariant disabled:opacity-30 text-md-sys-onSurface transition-colors"
                >
                    <span className="material-symbols-rounded">chevron_right</span>
                </button>
              </div>
          </div>
      </div>
  );
};

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
  generation,
  userSettings
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
       // Filter for images AND PDFs
       const validFiles = Array.from(e.dataTransfer.files).filter((f: File) => 
          f.type.startsWith('image/') || f.type === 'application/pdf'
       );
       if (validFiles.length > 0) {
         onFilesSelected(validFiles);
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
      // Filter for images AND PDFs
      const validFiles = Array.from(e.target.files).filter((f: File) => 
         f.type.startsWith('image/') || f.type === 'application/pdf'
      );
      onFilesSelected(validFiles);
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

  // Filter visible models based on settings
  const visibleModels = [
    ...AVAILABLE_MODELS,
    ...(userSettings?.customModels || [])
  ].filter(m => 
    userSettings ? userSettings.enabledModels.includes(m.id) : true
  );

  // If currently selected model is hidden, fallback to first available
  useEffect(() => {
    if (visibleModels.length > 0 && !visibleModels.find(m => m.id === selectedModel)) {
        onModelSelect(visibleModels[0].id);
    }
  }, [visibleModels, selectedModel, onModelSelect]);


  const currentModelName = visibleModels.find(m => m.id === selectedModel)?.name || selectedModel;

  const isPdf = (file: File) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  return (
    <div className="flex flex-col gap-4">
        {/* Composer Container */}
        <div 
          className={`
            relative flex flex-col w-full bg-md-sys-surface rounded-xl border transition-all duration-200 shadow-xl overflow-hidden group
            ${isDraggingContainer ? 'border-md-sys-primary ring-1 ring-md-sys-primary' : 'border-md-sys-outline/20 hover:border-md-sys-outline/40'}
          `}
          onDragOver={handleContainerDragOver}
          onDragLeave={handleContainerDragLeave}
          onDrop={handleContainerDrop}
        >
            {/* Overlay for Drag State (New Files) */}
            {isDraggingContainer && (
                <div className="absolute inset-0 bg-md-sys-primary/10 z-50 flex items-center justify-center backdrop-blur-sm pointer-events-none">
                    <div className="bg-md-sys-surface px-4 py-2 rounded-lg border border-md-sys-primary/30 text-md-sys-primary font-medium flex items-center gap-2 shadow-xl">
                        <span className="material-symbols-rounded">cloud_upload</span>
                        Drop images or PDFs
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
                                relative group/file w-16 h-16 rounded-lg overflow-hidden border bg-md-sys-surfaceVariant/50 shadow-sm cursor-grab active:cursor-grabbing transition-all duration-200
                                ${draggedItemIndex === index 
                                    ? 'opacity-40 scale-90 border-md-sys-primary border-dashed' 
                                    : 'border-md-sys-outline/10 hover:border-md-sys-primary/30 hover:scale-105'
                                }
                            `}
                        >
                            {isPdf(file.file) ? (
                                <div className="w-full h-full bg-red-500/10 flex flex-col items-center justify-center p-2 transition-colors group-hover/file:bg-red-500/20">
                                    <span className="material-symbols-rounded text-red-400 text-3xl">picture_as_pdf</span>
                                </div>
                            ) : (
                                <img src={file.preview} alt="attachment" className="w-full h-full object-cover opacity-80 group-hover/file:opacity-100 transition-opacity pointer-events-none select-none" />
                            )}
                            
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
                placeholder="Describe your music or drag & drop sheet music (PDF/Image)..."
                className="w-full bg-transparent text-[13px] text-md-sys-onSurface placeholder:text-md-sys-secondary p-4 min-h-[100px] max-h-[400px] resize-none focus:outline-none leading-relaxed font-sans"
            />

            {/* Composer Toolbar */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-md-sys-surface border-t border-md-sys-outline/10">
                
                {/* Left: Model & Attach */}
                <div className="flex items-center gap-2">
                    {/* Model Selector Badge */}
                    <div className="relative group/model">
                        <select
                            value={selectedModel}
                            onChange={(e) => onModelSelect(e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        >
                            {visibleModels.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        <div className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full bg-md-sys-surfaceVariant hover:bg-md-sys-surfaceVariant/80 border border-md-sys-outline/10 transition-colors cursor-pointer group-hover/model:border-md-sys-outline/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"></span>
                            <span className="text-[11px] font-semibold text-md-sys-onSurface truncate max-w-[120px] tracking-tight">{currentModelName}</span>
                            <span className="material-symbols-rounded text-[14px] text-md-sys-secondary group-hover/model:text-md-sys-onSurface transition-colors">expand_more</span>
                        </div>
                    </div>

                    <div className="h-4 w-px bg-md-sys-outline/20 mx-1"></div>

                    {/* Attach Button */}
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 text-md-sys-secondary hover:text-md-sys-onSurface hover:bg-md-sys-surfaceVariant rounded-md transition-all tooltip-trigger relative group/btn"
                        title="Attach image or PDF"
                    >
                         <span className="material-symbols-rounded text-[20px]">add_photo_alternate</span>
                         {/* Accept Images AND PDF */}
                         <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,application/pdf" onChange={handleFileInputChange} />
                    </button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    {/* Reset (Only visible if content exists) */}
                    {(files.length > 0 || promptText) && (
                        <button 
                            onClick={onReset}
                            className="text-[10px] font-medium text-md-sys-secondary hover:text-md-sys-error uppercase tracking-wider transition-colors"
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
                                ? 'bg-md-sys-onSurface text-md-sys-surface hover:scale-105 shadow-md' 
                                : 'bg-md-sys-surfaceVariant text-md-sys-secondary cursor-not-allowed'
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

        {/* File Preview Modal */}
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
                    className="w-full h-full max-w-6xl max-h-[90vh] flex flex-col items-center gap-4 relative animate-in zoom-in-95 duration-200" 
                    onClick={e => e.stopPropagation()}
                >
                    {isPdf(previewFile.file) ? (
                        <div className="w-full h-full bg-md-sys-surface rounded-lg overflow-hidden border border-white/10 shadow-2xl relative group flex flex-col">
                            {/* Use PDFJS Renderer for consistent inline experience */}
                            <div className="flex-1 min-h-0 bg-md-sys-surfaceVariant">
                                <PdfViewer url={previewFile.preview} />
                            </div>
                        </div>
                    ) : (
                        <img 
                            src={previewFile.preview} 
                            alt="Full size preview" 
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10" 
                        />
                    )}
                    
                    <div className="text-center px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full border border-white/5 absolute bottom-4 pointer-events-none">
                        <p className="text-white font-medium text-sm">{previewFile.file.name}</p>
                        <p className="text-gray-400 text-xs mt-0.5">
                            {(previewFile.file.size / 1024).toFixed(1)} KB • {previewFile.file.type || 'application/pdf'}
                        </p>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};