

import React, { useState, useRef, useEffect } from 'react';

interface TabBarProps {
  tabs: { id: string; title: string; customColor?: string; customIcon?: string }[];
  activeTabId: string | 'home' | 'settings';
  onTabClick: (id: string | 'home') => void;
  onTabClose: (id: string, e: React.MouseEvent) => void;
  onNewTab: () => void;
  onTabsReorder: (newOrder: string[]) => void;
  onTabRename: (id: string, newTitle: string) => void;
  onTabCustomize: (id: string, color?: string, icon?: string) => void;
}

const TAB_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
    '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', 
    '#d946ef', '#f43f5e', 'default'
];

const TAB_ICONS = [
    'music_note', 'piano', 'headphones', 'mic', 'library_music',
    'star', 'favorite', 'bookmark', 'folder', 'work', 
    'edit_note', 'code', 'palette', 'verified', 'bolt',
    'default'
];

export const TabBar: React.FC<TabBarProps> = ({ 
  tabs, 
  activeTabId, 
  onTabClick, 
  onTabClose,
  onNewTab,
  onTabsReorder,
  onTabRename,
  onTabCustomize
}) => {
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  // Close context menu on click outside
  useEffect(() => {
      const handleClickOutside = () => setContextMenu(null);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
    setContextMenu(null);
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

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (id === 'settings') return;
      
      const x = Math.min(e.clientX, window.innerWidth - 220); // Clamp X
      const y = Math.min(e.clientY, window.innerHeight - 300); // Clamp Y
      
      setContextMenu({ id, x, y });
  };

  const applyColor = (color: string) => {
      if (!contextMenu) return;
      onTabCustomize(contextMenu.id, color === 'default' ? undefined : color, undefined); // Keep icon undefined to prevent overwrite if not passed, but here we just update color
      // To properly update partial state, we might need to know the existing icon. 
      // For simplicity, let's assume the onTabCustomize merges or we just pass the new color. 
      // Actually App.tsx implementation replaces. Let's look at App.tsx:
      // s.id === id ? { ...s, customColor: color, customIcon: icon } : s
      // This wipes the other if undefined. We need to pass the existing one.
      
      const currentTab = tabs.find(t => t.id === contextMenu.id);
      if(currentTab) {
           onTabCustomize(contextMenu.id, color === 'default' ? undefined : color, currentTab.customIcon);
      }
      setContextMenu(null);
  };

  const applyIcon = (icon: string) => {
      if (!contextMenu) return;
      const currentTab = tabs.find(t => t.id === contextMenu.id);
      if(currentTab) {
           onTabCustomize(contextMenu.id, currentTab.customColor, icon === 'default' ? undefined : icon);
      }
      setContextMenu(null);
  };

  return (
    <>
    <div className="fixed top-10 left-0 right-0 z-40 flex items-end w-full h-10 bg-md-sys-surface border-b border-md-sys-outline/30 select-none pt-1 shadow-sm transition-colors duration-200">
      {/* Home Button (Not draggable) */}
      <button
        onClick={() => onTabClick('home')}
        className={`
          relative flex items-center justify-center w-12 h-full rounded-t-md mx-1 transition-all duration-200
          ${activeTabId === 'home' 
            ? 'bg-md-sys-background text-md-sys-primary shadow-sm border-t border-x border-md-sys-outline/20' 
            : 'bg-transparent text-md-sys-secondary hover:bg-md-sys-surfaceVariant hover:text-md-sys-onSurface'
          }
        `}
        title="Home / Recent"
      >
        {activeTabId === 'home' && (
             <div className="absolute top-[-1px] left-0 right-0 h-[3px] bg-md-sys-primary rounded-t-full shadow-[0_0_8px_rgba(var(--md-sys-primary),0.5)]" />
        )}
        <span className={`material-symbols-rounded text-[20px] ${activeTabId === 'home' ? 'font-variation-filled' : ''}`}>
          home
        </span>
        {activeTabId === 'home' && (
             <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-md-sys-background z-10" />
        )}
      </button>

      {/* Separator */}
      <div className="w-px h-4 bg-md-sys-outline/20 mx-1 mb-2.5"></div>

      {/* Scrollable Tab Area */}
      <div className="flex-1 flex overflow-x-auto custom-scrollbar-hide h-full items-end pr-2">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          const displayIcon = tab.customIcon || 'music_note';
          // Determine text color based on active state and custom color presence
          // If active: customColor or default active text
          // If inactive: customColor (dimmed) or default inactive text
          const tabStyle = isActive && tab.customColor ? { color: tab.customColor } : (tab.customColor ? { color: tab.customColor } : {});
          
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
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              className={`
                group relative flex items-center min-w-[120px] max-w-[200px] h-[34px] px-3 mr-1 rounded-t-md cursor-pointer border-t border-x transition-all duration-150 ease-out
                ${isActive 
                  ? 'bg-md-sys-background text-md-sys-onSurface border-md-sys-outline/20 z-10' 
                  : 'bg-md-sys-surfaceVariant/50 text-md-sys-secondary hover:bg-md-sys-surfaceVariant hover:text-md-sys-onSurface border-transparent hover:border-md-sys-outline/10'
                }
                ${draggedTabId === tab.id ? 'opacity-50' : 'opacity-100'}
              `}
            >
              {/* Top Active Indicator */}
              {isActive && (
                  <div 
                    className="absolute top-[-1px] left-0 right-0 h-[3px] rounded-t-full transition-colors"
                    style={{ backgroundColor: tab.customColor || 'rgb(var(--md-sys-primary))' }} 
                  />
              )}

              {editingTabId === tab.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={handleKeyDown}
                  className="flex-1 min-w-0 bg-transparent border-none outline-none text-[12px] font-medium text-md-sys-onSurface p-0 m-0 placeholder:text-md-sys-secondary"
                />
              ) : (
                <>
                  {tab.id === 'settings' ? (
                     <span className={`material-symbols-rounded text-[16px] mr-2 transition-colors ${isActive ? 'text-md-sys-primary' : 'text-md-sys-secondary'}`}>settings</span>
                  ) : (
                     <span 
                        className={`material-symbols-rounded text-[16px] mr-2 transition-colors ${!tab.customColor && !isActive ? 'text-md-sys-secondary group-hover:text-md-sys-onSurface' : ''}`}
                        style={tabStyle}
                     >
                        {displayIcon}
                     </span>
                  )}
                  <span className="text-[12px] truncate flex-1 mr-2 font-medium select-none tracking-tight" title={tab.id === 'settings' ? 'Settings' : 'Double click to rename, Right click to customize'}>
                    {tab.title || "Untitled Project"}
                  </span>
                </>
              )}
              
              <button
                onClick={(e) => onTabClose(tab.id, e)}
                className={`
                  p-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-md-sys-onSurface/10
                  ${isActive ? 'text-md-sys-secondary hover:text-md-sys-error' : 'text-md-sys-secondary hover:text-md-sys-onSurface'}
                `}
              >
                <span className="material-symbols-rounded text-[14px] block">close</span>
              </button>

              {/* Mask bottom border to blend with content */}
               {isActive && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-md-sys-background z-10" />
              )}
            </div>
          );
        })}

        {/* New Tab Button */}
        <button
          onClick={onNewTab}
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-md-sys-surfaceVariant text-md-sys-secondary hover:text-md-sys-onSurface transition-colors ml-1 mb-0.5 flex-shrink-0"
          title="New Tab"
        >
          <span className="material-symbols-rounded text-[20px]">add</span>
        </button>
      </div>
    </div>

    {/* Custom Context Menu */}
    {contextMenu && (
        <div 
            className="fixed z-[100] w-56 bg-md-sys-surface rounded-xl shadow-2xl ring-1 ring-md-sys-outline/10 border border-md-sys-outline/20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="p-2 border-b border-md-sys-outline/10 bg-md-sys-surfaceVariant/20">
                <span className="text-[10px] font-bold text-md-sys-secondary uppercase tracking-wider px-2">Tab Options</span>
            </div>
            
            <button 
                onClick={() => {
                    const t = tabs.find(t => t.id === contextMenu.id);
                    if(t) startEditing(t.id, t.title);
                }}
                className="text-left px-4 py-2.5 text-[13px] text-md-sys-onSurface hover:bg-md-sys-surfaceVariant/50 transition-colors flex items-center gap-3"
            >
                <span className="material-symbols-rounded text-[18px] text-md-sys-secondary">edit</span>
                Rename Tab
            </button>

            <div className="h-px bg-md-sys-outline/10 my-1 mx-2"></div>

            {/* Colors Grid */}
            <div className="px-3 py-2">
                <span className="text-[10px] font-bold text-md-sys-secondary uppercase tracking-wider mb-2 block">Tab Color</span>
                <div className="grid grid-cols-6 gap-2">
                    {TAB_COLORS.map(color => (
                        <button
                            key={color}
                            onClick={() => applyColor(color)}
                            className={`w-6 h-6 rounded-full border border-md-sys-outline/20 hover:scale-110 transition-transform flex items-center justify-center ${color === 'default' ? 'bg-transparent border-dashed' : ''}`}
                            style={color !== 'default' ? { backgroundColor: color } : {}}
                            title={color}
                        >
                            {color === 'default' && <span className="material-symbols-rounded text-[14px] text-md-sys-secondary">block</span>}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-px bg-md-sys-outline/10 my-1 mx-2"></div>

             {/* Icons Grid */}
             <div className="px-3 py-2">
                <span className="text-[10px] font-bold text-md-sys-secondary uppercase tracking-wider mb-2 block">Tab Icon</span>
                <div className="grid grid-cols-8 gap-1">
                    {TAB_ICONS.map(icon => (
                        <button
                            key={icon}
                            onClick={() => applyIcon(icon)}
                            className="w-6 h-6 rounded hover:bg-md-sys-surfaceVariant text-md-sys-secondary hover:text-md-sys-primary transition-colors flex items-center justify-center"
                            title={icon}
                        >
                            <span className="material-symbols-rounded text-[16px]">{icon === 'default' ? 'close' : icon}</span>
                        </button>
                    ))}
                </div>
            </div>

        </div>
    )}
    </>
  );
};