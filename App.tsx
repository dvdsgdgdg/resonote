
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { Workspace } from './components/Workspace';
import { HomeView } from './components/HomeView';
import { AboutModal } from './components/modals/AboutModal';
import { FeedbackModal } from './components/modals/FeedbackModal';
import { TermsModal } from './components/modals/TermsModal';
import { ChangelogModal } from './components/modals/ChangelogModal';
import { ConfirmationModal } from './components/modals/ConfirmationModal';
import { SettingsView } from './components/SettingsView';
import { convertImageToABC } from './services/geminiService';
import { Session, GenerationState, LogEntry, UserSettings, HistoryEntry } from './types';
import { DEFAULT_ABC } from './constants/defaults';
import { DEFAULT_MODEL_ID, AVAILABLE_MODELS } from './constants/models';
import { validateABC } from './utils/abcValidator';
import { MusicDisplayHandle } from './components/MusicDisplay';
import { transposeABC } from './utils/abcTransposer';

// Bumped version to v2 to force load new DEFAULT_ABC with multi-tracks
const STORAGE_KEY = 'resonote_sessions_v2';
const SETTINGS_KEY = 'resonote_user_settings_v2'; // Bumped for theme support

export interface ViewSettings {
  showSidebar: boolean;
  zoomLevel: number;
}

const DEFAULT_USER_SETTINGS: UserSettings = {
  apiKey: '',
  enabledModels: AVAILABLE_MODELS.map(m => m.id),
  theme: 'dark'
};

export default function App() {
  // --- State Management ---
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | 'home' | 'settings'>('home');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
  // User Preferences (Persisted)
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);

  // View Settings (Global for simplicity, keeps UI consistent across tabs)
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    showSidebar: true,
    zoomLevel: 1.0
  });

  // Special Tabs State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Modals
  const [showAbout, setShowAbout] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  
  // Delete Confirmation State
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Refs
  const sessionRefs = useRef<Map<string, MusicDisplayHandle>>(new Map());
  const importInputRef = useRef<HTMLInputElement>(null);
  
  // --- Persistence Logic ---
  
  // Load sessions and settings on mount
  useEffect(() => {
    try {
      // Load Sessions
      const savedSessions = localStorage.getItem(STORAGE_KEY);
      if (savedSessions) {
        const parsed: any[] = JSON.parse(savedSessions);
        // Hydrate
        const hydrated: Session[] = parsed.map(s => {
            // Migration for History: string[] -> HistoryEntry[]
            let history: HistoryEntry[] = [];
            if (Array.isArray(s.data.history)) {
                if (s.data.history.length > 0 && typeof s.data.history[0] === 'string') {
                    // Old format
                    history = (s.data.history as unknown as string[]).map((h, i) => ({
                        content: h,
                        timestamp: s.lastModified,
                        label: i === 0 ? 'Initial State' : 'Legacy Edit'
                    }));
                } else {
                    history = s.data.history;
                }
            } else {
                 history = [{ content: s.data.abc || DEFAULT_ABC, timestamp: Date.now(), label: 'Initial' }];
            }

            return {
                ...s,
                isOpen: s.isOpen ?? false, 
                data: {
                    ...s.data,
                    files: [], // Files cannot be persisted securely
                    history: history,
                    historyIndex: s.data.historyIndex ?? (history.length - 1),
                    // Reset loading state on reload
                    generation: { ...s.data.generation, isLoading: false, error: null } 
                }
            };
        });
        setSessions(hydrated);
      }

      // Load Settings
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        // Merge with default to ensure new keys (like theme) exist if loading old settings
        setUserSettings({ ...DEFAULT_USER_SETTINGS, ...parsedSettings });
      }
    } catch (e) {
      console.error("Failed to load local storage data", e);
    }
  }, []);

  // Save sessions on change
  useEffect(() => {
    if (sessions.length > 0) {
        const toSave = sessions.map(s => ({
            ...s,
            data: {
                ...s.data,
                files: [], // Don't save files
                // We save history, but maybe limit it? For now save all.
            }
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } else {
        localStorage.removeItem(STORAGE_KEY);
    }
  }, [sessions]);

  // Save Settings on change
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(userSettings));
  }, [userSettings]);

  // Theme Effect
  useEffect(() => {
    const root = document.documentElement;
    if (userSettings.theme === 'dark') {
      root.classList.add('dark');
      // Also set meta theme color
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0F0F0F');
    } else {
      root.classList.remove('dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#FFFFFF');
    }
  }, [userSettings.theme]);

  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [activeTabId, viewSettings.showSidebar]); // Trigger resize when layout changes

  // --- Session Helpers ---

  const createNewSession = useCallback((initialAbc?: string, title?: string) => {
    const startAbc = initialAbc || DEFAULT_ABC;
    const newSession: Session = {
        id: Date.now().toString(),
        title: title || `Untitled Project`,
        lastModified: Date.now(),
        isOpen: true, 
        data: {
            files: [],
            prompt: "",
            abc: startAbc,
            history: [{ content: startAbc, timestamp: Date.now(), label: 'Initial' }],
            historyIndex: 0,
            model: DEFAULT_MODEL_ID,
            generation: {
                isLoading: false,
                error: null,
                result: null,
                logs: []
            }
        }
    };
    setSessions(prev => [...prev, newSession]);
    setActiveTabId(newSession.id);
  }, []);

  const closeSessionTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Handle special tabs
    if (id === 'settings') {
      setIsSettingsOpen(false);
      if (activeTabId === 'settings') setActiveTabId('home');
      return;
    }

    // Handle normal sessions
    setSessions(prev => prev.map(s => s.id === id ? { ...s, isOpen: false } : s));
    sessionRefs.current.delete(id);

    if (activeTabId === id) {
        setActiveTabId('home');
    }
  };

  const handleOpenSession = (id: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, isOpen: true } : s));
    setActiveTabId(id);
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
    setActiveTabId('settings');
  };

  const requestDeleteSession = useCallback((id: string) => {
    setSessionToDelete(id);
  }, []);

  const confirmDeleteSession = useCallback(() => {
      if (!sessionToDelete) return;

      setSessions(prev => {
          const newSessions = prev.filter(s => s.id !== sessionToDelete);
          return newSessions;
      });
      sessionRefs.current.delete(sessionToDelete);
      
      if (activeTabId === sessionToDelete) {
          setActiveTabId('home');
      }
      setSessionToDelete(null);
  }, [sessionToDelete, activeTabId]);

  // General Update Helper
  const updateSession = useCallback((id: string, updates: Partial<Session['data']>) => {
    setSessions(prev => prev.map(s => {
        if (s.id !== id) return s;
        
        let newTitle = s.title;
        if (updates.abc) {
            const match = updates.abc.match(/T:(.*)/);
            if (match && match[1]) {
                newTitle = match[1].trim();
            }
        }

        return {
            ...s,
            title: newTitle,
            lastModified: Date.now(),
            data: { ...s.data, ...updates }
        };
    }));
  }, []);

  // --- History Management ---

  const pushToHistory = useCallback((sessionId: string, label: string = 'Manual Edit') => {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;

      const currentAbc = s.data.abc;
      const lastHistoryEntry = s.data.history[s.data.historyIndex];

      // Avoid duplicates
      if (lastHistoryEntry && currentAbc === lastHistoryEntry.content) return s;

      const newHistory = s.data.history.slice(0, s.data.historyIndex + 1);
      newHistory.push({
          content: currentAbc,
          timestamp: Date.now(),
          label: label
      });

      // Limit history size (optional, e.g., 50 steps)
      if (newHistory.length > 50) {
        newHistory.shift();
      }

      return {
        ...s,
        data: {
          ...s.data,
          history: newHistory,
          historyIndex: newHistory.length - 1
        }
      };
    }));
  }, []);

  const handleUndo = useCallback(() => {
    if (activeTabId === 'home' || activeTabId === 'settings') return;
    
    setSessions(prev => prev.map(s => {
      if (s.id !== activeTabId) return s;
      
      if (s.data.historyIndex > 0) {
        const newIndex = s.data.historyIndex - 1;
        const entry = s.data.history[newIndex];
        return {
          ...s,
          data: {
            ...s.data,
            historyIndex: newIndex,
            abc: entry.content
          }
        };
      }
      return s;
    }));
  }, [activeTabId]);

  const handleRedo = useCallback(() => {
    if (activeTabId === 'home' || activeTabId === 'settings') return;

    setSessions(prev => prev.map(s => {
      if (s.id !== activeTabId) return s;

      if (s.data.historyIndex < s.data.history.length - 1) {
        const newIndex = s.data.historyIndex + 1;
        const entry = s.data.history[newIndex];
        return {
          ...s,
          data: {
            ...s.data,
            historyIndex: newIndex,
            abc: entry.content
          }
        };
      }
      return s;
    }));
  }, [activeTabId]);

  const handleJumpToHistory = useCallback((index: number) => {
      if (activeTabId === 'home' || activeTabId === 'settings') return;
      
      setSessions(prev => prev.map(s => {
          if (s.id !== activeTabId) return s;
          if (index < 0 || index >= s.data.history.length) return s;
          
          return {
              ...s,
              data: {
                  ...s.data,
                  historyIndex: index,
                  abc: s.data.history[index].content
              }
          };
      }));
  }, [activeTabId]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);


  const handleTabRename = (id: string, newTitle: string) => {
    setSessions(prev => prev.map(s => 
        s.id === id ? { ...s, title: newTitle, lastModified: Date.now() } : s
    ));
  };

  const handleTabsReorder = (newOrderIds: string[]) => {
    setSessions(prev => {
        const sessionMap = new Map(prev.map(s => [s.id, s]));
        const reorderedOpen = newOrderIds.filter(id => id !== 'settings').map(id => sessionMap.get(id)).filter(Boolean) as Session[];
        const closed = prev.filter(s => !s.isOpen);
        return [...reorderedOpen, ...closed];
    });
  };

  const handleTranspose = (sessionId: string, semitones: number) => {
      const session = sessions.find(s => s.id === sessionId);
      if (!session || !session.data.abc) return;

      const transposedABC = transposeABC(session.data.abc, semitones);
      updateSession(sessionId, { abc: transposedABC });
      // Commit transpose to history immediately
      setTimeout(() => pushToHistory(sessionId, `Transpose ${semitones > 0 ? '+' : ''}${semitones}`), 0); 
  };

  // --- View Handlers ---
  const handleToggleSidebar = () => {
    setViewSettings(prev => ({ ...prev, showSidebar: !prev.showSidebar }));
  };

  const handleZoom = (delta: number) => {
    setViewSettings(prev => ({ 
      ...prev, 
      zoomLevel: Math.max(0.5, Math.min(2.0, prev.zoomLevel + delta)) 
    }));
  };

  const handleResetZoom = () => {
    setViewSettings(prev => ({ ...prev, zoomLevel: 1.0 }));
  };

  const handleToggleTheme = () => {
    setUserSettings(prev => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark'
    }));
  };

  // --- Generation Logic ---

  const addLogToSession = useCallback((sessionId: string, message: string, type: LogEntry['type']) => {
    setSessions(prev => prev.map(s => {
        if (s.id !== sessionId) return s;
        
        const currentLogs = s.data.generation.logs;
        const lastLog = currentLogs[currentLogs.length - 1];
        const now = new Date();
        const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        if (type === 'thinking' && lastLog?.type === 'thinking') {
             if (lastLog.message === message) return s;
             const newLogs = [...currentLogs];
             newLogs[newLogs.length - 1] = { ...lastLog, message };
             return { ...s, data: { ...s.data, generation: { ...s.data.generation, logs: newLogs } } };
        }

        return {
            ...s,
            data: {
                ...s.data,
                generation: {
                    ...s.data.generation,
                    logs: [...currentLogs, { timestamp, message, type }]
                }
            }
        };
    }));
  }, []);

  const handleGenerate = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    const { data } = session;

    if (data.files.length === 0 && !data.prompt.trim()) return;

    // Save current state before generation wipes it (if it wasn't empty)
    if (data.abc.trim()) {
       pushToHistory(sessionId, 'Pre-Generation Save');
    }

    updateSession(sessionId, { 
        abc: "", 
        generation: { isLoading: true, error: null, result: null, logs: [] } 
    });

    try {
      const rawFiles = data.files.map(f => f.file);
      
      const result = await convertImageToABC(
        rawFiles, 
        data.prompt,
        data.model,
        (msg, type) => addLogToSession(sessionId, msg, type),
        (streamedText) => updateSession(sessionId, { abc: streamedText }),
        validateABC,
        userSettings.apiKey // Pass Custom API Key
      );

      setSessions(prev => prev.map(s => {
          if (s.id !== sessionId) return s;
          return {
              ...s,
              data: {
                  ...s.data,
                  abc: result.abc,
                  generation: { ...s.data.generation, isLoading: false, result }
              }
          };
      }));
      
      // Commit successful generation to history
      setTimeout(() => pushToHistory(sessionId, 'AI Generation'), 0);

      addLogToSession(sessionId, "Generation Complete.", 'success');

    } catch (err: any) {
        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            return {
                ...s,
                data: {
                    ...s.data,
                    generation: { ...s.data.generation, isLoading: false, error: err.message || "Unknown error" }
                }
            };
        }));
    }
  };

  // --- Import / Export Logic ---

  const handleImportClick = () => {
    if (importInputRef.current) {
        importInputRef.current.value = '';
        importInputRef.current.click();
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (evt) => resolve(evt.target?.result as string || "");
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsText(file);
        });
        
        if (!text.trim()) {
            alert("The selected file is empty.");
            return;
        }

        if (activeTabId === 'home') {
            createNewSession(text, file.name.replace(/\.(abc|txt)$/i, ''));
        } else {
             updateSession(activeTabId, { abc: text });
             // Commit import to history
             setTimeout(() => pushToHistory(activeTabId, 'Import File'), 0);
        }
    } catch (error) {
        console.error(error);
        alert("Failed to read file.");
    }
  };

  const handleExport = (type: 'png' | 'jpg' | 'webp' | 'svg' | 'pdf' | 'doc' | 'midi' | 'wav' | 'mp3' | 'abc' | 'txt') => {
    if (activeTabId === 'home' || activeTabId === 'settings') return;

    if (type === 'abc' || type === 'txt') {
        const session = sessions.find(s => s.id === activeTabId);
        if (!session) return;

        const blob = new Blob([session.data.abc], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${session.title || 'music'}.${type}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
    }

    const ref = sessionRefs.current.get(activeTabId);
    if (ref) {
        ref.exportFile(type);
    }
  };

  const handleExportFromHome = (sessionId: string, type: 'png' | 'jpg' | 'webp' | 'svg' | 'pdf' | 'doc' | 'midi' | 'wav' | 'mp3' | 'abc' | 'txt') => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    if (type === 'abc' || type === 'txt') {
        const blob = new Blob([session.data.abc], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${session.title || 'music'}.${type}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
    }

    const ref = sessionRefs.current.get(sessionId);
    if (ref) {
        ref.exportFile(type);
    } else {
        alert("Unable to export media. Please open the project first to initialize the engine.");
    }
  };

  // --- Rendering ---
  
  const openSessions = sessions.filter(s => s.isOpen);
  
  // Combine sessions with special tabs
  const visibleTabs = [
    ...openSessions.map(s => ({ id: s.id, title: s.title })),
    ...(isSettingsOpen ? [{ id: 'settings', title: 'Settings' }] : [])
  ];

  const currentSession = sessions.find(s => s.id === activeTabId);
  const canUndo = currentSession ? currentSession.data.historyIndex > 0 : false;
  const canRedo = currentSession ? currentSession.data.historyIndex < currentSession.data.history.length - 1 : false;

  return (
    <div className="min-h-screen bg-md-sys-background text-md-sys-secondary selection:bg-md-sys-primary selection:text-md-sys-onPrimary font-sans flex flex-col overflow-hidden">
      
      <input 
        type="file" 
        ref={importInputRef} 
        className="hidden" 
        accept=".abc,.txt" 
        onChange={handleFileImport}
      />

      <Header 
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        onOpenAbout={() => setShowAbout(true)}
        onOpenFeedback={() => setShowFeedback(true)}
        onOpenTerms={() => setShowTerms(true)}
        onOpenChangelog={() => setShowChangelog(true)}
        onOpenSettings={handleOpenSettings}
        onImport={handleImportClick}
        onExport={handleExport}
        viewSettings={viewSettings}
        onToggleSidebar={handleToggleSidebar}
        onZoom={handleZoom}
        onResetZoom={handleResetZoom}
        theme={userSettings.theme}
        onToggleTheme={handleToggleTheme}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        sessionHistory={currentSession?.data.history || []}
        historyIndex={currentSession?.data.historyIndex || 0}
        onJumpToHistory={handleJumpToHistory}
      />

      <TabBar 
        tabs={visibleTabs} 
        activeTabId={activeTabId}
        onTabClick={setActiveTabId}
        onTabClose={closeSessionTab}
        onNewTab={() => createNewSession()}
        onTabsReorder={handleTabsReorder}
        onTabRename={handleTabRename}
      />

      <main className="flex-1 overflow-hidden relative pt-20">
        
        {/* Home View */}
        <div className={`absolute inset-0 top-20 z-10 bg-md-sys-background transition-opacity duration-200 ${activeTabId === 'home' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
             <HomeView 
                sessions={sessions} 
                onOpenSession={handleOpenSession} 
                onNewSession={() => createNewSession()} 
                onDeleteSession={requestDeleteSession}
                onExportSession={handleExportFromHome}
             />
        </div>

        {/* Settings View */}
        {activeTabId === 'settings' && isSettingsOpen && (
             <div className="absolute inset-0 top-20 z-20 bg-md-sys-background">
                <SettingsView 
                    settings={userSettings}
                    onSaveSettings={setUserSettings}
                />
             </div>
        )}

        {/* Workspaces */}
        {openSessions.map(session => (
            <div 
                key={session.id} 
                className={`w-full h-full pt-4 pb-2 px-4 lg:px-6 max-w-[1920px] mx-auto ${activeTabId === session.id ? 'block' : 'hidden'}`}
            >
                <Workspace 
                    session={session}
                    onUpdateSession={updateSession}
                    onGenerate={handleGenerate}
                    musicDisplayRef={(el) => {
                        if (el) sessionRefs.current.set(session.id, el);
                        else sessionRefs.current.delete(session.id);
                    }}
                    onImport={handleImportClick}
                    onExport={() => handleExport('abc')}
                    onTranspose={(st) => handleTranspose(session.id, st)}
                    onCommitHistory={() => pushToHistory(session.id, 'Manual Edit')}
                    viewSettings={viewSettings}
                    userSettings={userSettings}
                />
            </div>
        ))}

      </main>

      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <ChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} />
      <ConfirmationModal 
          isOpen={!!sessionToDelete}
          onClose={() => setSessionToDelete(null)}
          onConfirm={confirmDeleteSession}
          title="Delete Project?"
          message="Are you sure you want to permanently delete this project? This action cannot be undone."
          confirmLabel="Delete"
          isDestructive={true}
      />

    </div>
  );
}
