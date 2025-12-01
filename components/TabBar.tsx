
import React, { useState, useRef, useEffect } from 'react';

interface TabBarProps {
  tabs: { id: string; title: string }[];
  activeTabId: string | 'home' | 'settings';
  onTabClick: (id: string | 'home') => void;
  onTabClose: (id: string, e: React.MouseEvent) => void;
  onNewTab: () => void;
  onTabsReorder: (newOrder: string[]) => void;
  onTabRename: (id: string, newTitle: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ 
  tabs, 
  activeTabId, 
  onTabClick, 
  onTabClose,
  onNewTab,
  onTabsReorder,
  onTabRename
}) => {
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (editingTabId || id === 'settings') return; // Prevent dragging settings or while editing
    setDraggedTabId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === targetId || targetId === 'settings') return;

    const currentOrder = tabs.filter(t => t.id !== 'settings').map(t => t.id);
    const oldIndex = currentOrder.indexOf(draggedTabId);
    const newIndex = currentOrder.indexOf(targetId);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = [...currentOrder];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, draggedTabId);

    onTabsReorder(newOrder);
    setDraggedTabId(null);
  };

  const handleDragEnd = () => {
    setDraggedTabId(null);
  };

  const startEditing = (id: string, currentTitle: string) => {
    if (id === 'settings') return; // Cannot rename settings
    setEditingTabId(id);
    setEditValue(currentTitle);
  };

  const saveEdit = () => {
    if (editingTabId && editValue.trim()) {
      onTabRename(editingTabId, editValue.trim());
    }
    setEditingTabId(null);
  };

  const cancelEdit = () => {
    setEditingTabId(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  return (
    <div className="fixed top-10 left-0 right-0 z-40 flex items-end w-full h-10 bg-[#1e1e1e] border-b border-black select-none pt-1 shadow-sm transition-all">
      {/* Home Button (Not draggable) */}
      <button
        onClick={() => onTabClick('home')}
        className={`
          relative flex items-center justify-center w-12 h-full rounded-t-md mx-1 transition-all duration-200
          ${activeTabId === 'home' 
            ? 'bg-[#0F0F0F] text-md-sys-primary shadow-sm' 
            : 'bg-transparent text-gray-500 hover:bg-[#2a2a2a] hover:text-gray-300'
          }
        `}
        title="Home / Recent"
      >
        {activeTabId === 'home' && (
             <div className="absolute top-0 left-0 right-0 h-[2px] bg-md-sys-primary rounded-t-full shadow-[0_0_8px_rgba(168,199,250,0.5)]" />
        )}
        <span className={`material-symbols-rounded text-[20px] ${activeTabId === 'home' ? 'font-variation-filled' : ''}`}>
          home
        </span>
        {activeTabId === 'home' && (
             <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#0F0F0F] z-10" />
        )}
      </button>

      {/* Separator */}
      <div className="w-px h-4 bg-white/10 mx-1 mb-2.5"></div>

      {/* Scrollable Tab Area */}
      <div className="flex-1 flex overflow-x-auto custom-scrollbar-hide h-full items-end pr-2">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          return (
            <div
              key={tab.id}
              draggable={!editingTabId && tab.id !== 'settings'}
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, tab.id)}
              onDragEnd={handleDragEnd}
              onClick={() => !editingTabId && onTabClick(tab.id)}
              onDoubleClick={() => startEditing(tab.id, tab.title)}
              className={`
                group relative flex items-center min-w-[120px] max-w-[200px] h-[34px] px-3 mr-1 rounded-t-md cursor-pointer border-x transition-all duration-150 ease-out
                ${isActive 
                  ? 'bg-[#0F0F0F] text-white border-black/30 z-10' 
                  : 'bg-[#252525] text-gray-500 hover:bg-[#2d2d2d] hover:text-gray-300 border-transparent hover:border-black/10'
                }
                ${draggedTabId === tab.id ? 'opacity-50' : 'opacity-100'}
              `}
            >
              {/* Top Active Indicator */}
              {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-md-sys-primary rounded-t-full shadow-[0_0_6px_rgba(168,199,250,0.4)]" />
              )}

              {editingTabId === tab.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={handleKeyDown}
                  className="flex-1 min-w-0 bg-transparent border-none outline-none text-[12px] font-medium text-white p-0 m-0 placeholder:text-gray-600"
                />
              ) : (
                <>
                  {tab.id === 'settings' ? (
                     <span className={`material-symbols-rounded text-[16px] mr-2 transition-colors ${isActive ? 'text-md-sys-primary' : 'text-gray-500'}`}>settings</span>
                  ) : (
                     <span className={`material-symbols-rounded text-[16px] mr-2 transition-colors ${isActive ? 'text-md-sys-primary' : 'text-gray-500 group-hover:text-gray-400'}`}>music_note</span>
                  )}
                  <span className="text-[12px] truncate flex-1 mr-2 font-medium select-none tracking-tight" title={tab.id === 'settings' ? 'Settings' : 'Double click to rename'}>
                    {tab.title || "Untitled Project"}
                  </span>
                </>
              )}
              
              <button
                onClick={(e) => onTabClose(tab.id, e)}
                className={`
                  p-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10
                  ${isActive ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-300'}
                `}
              >
                <span className="material-symbols-rounded text-[14px] block">close</span>
              </button>

              {/* Mask bottom border to blend with content */}
               {isActive && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#0F0F0F] z-10" />
              )}
            </div>
          );
        })}

        {/* New Tab Button */}
        <button
          onClick={onNewTab}
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/10 text-gray-500 hover:text-white transition-colors ml-1 mb-0.5 flex-shrink-0"
          title="New Tab"
        >
          <span className="material-symbols-rounded text-[20px]">add</span>
        </button>
      </div>
    </div>
  );
};
