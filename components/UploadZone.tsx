import React, { useCallback, useState } from 'react';
import { UploadFileState } from '../types';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  onFileRemove: (id: string) => void;
  onFilesReordered: (files: UploadFileState[]) => void;
  currentFiles: UploadFileState[];
}

export const UploadZone: React.FC<UploadZoneProps> = ({ 
  onFilesSelected, 
  onFileRemove, 
  onFilesReordered,
  currentFiles 
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/'));
      onFilesSelected(filesArray);
    }
  }, [onFilesSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).filter((f: File) => f.type.startsWith('image/'));
      onFilesSelected(filesArray);
    }
  };

  // Reordering Logic
  const handleItemDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Set a transparent image or the element itself as the drag image
    // Optional: e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
  };

  const handleItemDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); // Necessary to allow dropping
    if (draggedIndex === null || draggedIndex === index) return;
  };

  const handleItemDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newFiles = [...currentFiles];
    const draggedItem = newFiles[draggedIndex];
    
    // Remove from old position
    newFiles.splice(draggedIndex, 1);
    // Insert at new position
    newFiles.splice(targetIndex, 0, draggedItem);
    
    onFilesReordered(newFiles);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="w-full">
      {currentFiles.length === 0 ? (
        <label 
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-md-sys-outline rounded-3xl cursor-pointer bg-md-sys-surface hover:bg-md-sys-surfaceVariant/50 transition-colors duration-300 group"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <div className="p-4 rounded-full bg-md-sys-surfaceVariant mb-4 group-hover:scale-110 transition-transform duration-200">
                <span className="material-symbols-rounded text-4xl text-md-sys-primary">add_a_photo</span>
            </div>
            <p className="mb-2 text-sm text-md-sys-secondary">
              <span className="font-semibold text-md-sys-primary">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-md-sys-outline">SVG, PNG, JPG or GIF</p>
          </div>
          <input type="file" className="hidden" multiple accept="image/*" onChange={handleChange} />
        </label>
      ) : (
        <div 
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          onDragOver={handleDragOver} // Allow dropping new files on the grid area
          onDrop={handleDrop}
        >
          {currentFiles.map((fileState, index) => (
            <div 
              key={fileState.id} 
              draggable
              onDragStart={(e) => handleItemDragStart(e, index)}
              onDragOver={(e) => handleItemDragOver(e, index)}
              onDrop={(e) => handleItemDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`relative group aspect-square rounded-2xl overflow-hidden border border-md-sys-outline bg-md-sys-surface cursor-grab active:cursor-grabbing transition-all duration-200 ${
                draggedIndex === index ? 'opacity-40 scale-95 border-md-sys-primary border-dashed' : 'hover:border-md-sys-primary/50'
              }`}
            >
              <img src={fileState.preview} alt="preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity select-none pointer-events-none" />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3 pointer-events-none">
                <p className="text-xs text-white truncate w-full">{index + 1}. {fileState.file.name}</p>
              </div>

              {/* Drag Handle Indicator (Optional visual cue) */}
              <div className="absolute top-2 left-2 p-1 bg-black/40 rounded-lg text-white/50 group-hover:text-white transition-colors pointer-events-none">
                 <span className="material-symbols-rounded text-[14px]">drag_indicator</span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFileRemove(fileState.id);
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-md-sys-error text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 cursor-pointer z-10 hover:scale-105 active:scale-95"
                title="Remove file"
              >
                <span className="material-symbols-rounded text-[16px] block">close</span>
              </button>
            </div>
          ))}
          <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-md-sys-outline rounded-2xl cursor-pointer hover:bg-md-sys-surfaceVariant/50 transition-colors">
             <span className="material-symbols-rounded text-2xl text-md-sys-secondary">add</span>
             <input type="file" className="hidden" multiple accept="image/*" onChange={handleChange} />
          </label>
        </div>
      )}
    </div>
  );
};