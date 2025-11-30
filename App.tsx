
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { Workspace } from './components/Workspace';
import { HomeView } from './components/HomeView';
import { AboutModal } from './components/modals/AboutModal';
import { FeedbackModal } from './components/modals/FeedbackModal';
import { TermsModal } from './components/modals/TermsModal';
import { ChangelogModal } from './components/modals/ChangelogModal';
import { convertImageToABC } from './services/geminiService';
import { Session, GenerationState, LogEntry } from './types';
import { DEFAULT_ABC } from './constants/defaults';
import { DEFAULT_MODEL_ID } from './constants/models';
import { validateABC } from './utils/abcValidator';
import { MusicDisplayHandle } from './components/MusicDisplay';
import { transposeABC } from './utils/abcTransposer';

const STORAGE_KEY = 'resonote_sessions_v1';

export default function App() {
  // --- State Management ---
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | 'home'>('home');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
  // Modals
  const [showAbout, setShowAbout] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  // Refs
  const sessionRefs = useRef<Map<string, MusicDisplayHandle>>(new Map());
  const importInputRef = useRef<HTMLInputElement>(null);
  
  // --- Persistence Logic ---
  
  // Load sessions on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: Session[] = JSON.parse(saved);
        // Hydrate: Ensure files array is empty (can't restore Files) but logs/abc are kept
        const hydrated = parsed.map(s => ({
            ...s,
            isOpen: s.isOpen ?? false, 
            data: {
                ...s.data,
                files: [], // Files cannot be persisted securely
                // Reset loading state on reload
                generation: { ...s.data.generation, isLoading: false, error: null } 
            }
        }));
        setSessions(hydrated);
      }
    } catch (e) {
      console.error("Failed to load sessions", e);
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
            }
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } else {
        localStorage.removeItem(STORAGE_KEY);
    }
  }, [sessions]);

  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [activeTabId]);

  // --- Session Helpers ---

  const createNewSession = useCallback((initialAbc?: string, title?: string) => {
    const newSession: Session = {
        id: Date.now().toString(),
        title: title || `Untitled Project`,
        lastModified: Date.now(),
        isOpen: true, 
        data: {
            files: [],
            prompt: "",
            abc: initialAbc || DEFAULT_ABC,
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

  const deleteSession = (id: string) => {
      if (window.confirm("Are you sure you want to permanently delete this project? This cannot be undone.")) {
          setSessions(prev => prev.filter(s => s.id !== id));
          sessionRefs.current.delete(id);
          if (activeTabId === id) {
              setActiveTabId('home');
          }
      }
  };

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

  const handleTabRename = (id: string, newTitle: string) => {
    setSessions(prev => prev.map(s => 
        s.id === id ? { ...s, title: newTitle, lastModified: Date.now() } : s
    ));
  };

  const handleTabsReorder = (newOrderIds: string[]) => {
    setSessions(prev => {
        const sessionMap = new Map(prev.map(s => [s.id, s]));
        const reorderedOpen = newOrderIds.map(id => sessionMap.get(id)).filter(Boolean) as Session[];
        const closed = prev.filter(s => !s.isOpen);
        return [...reorderedOpen, ...closed];
    });
  };

  const handleTranspose = (sessionId: string, semitones: number) => {
      const session = sessions.find(s => s.id === sessionId);
      if (!session || !session.data.abc) return;

      const transposedABC = transposeABC(session.data.abc, semitones);
      updateSession(sessionId, { abc: transposedABC });
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
        validateABC
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
        }
    } catch (error) {
        console.error(error);
        alert("Failed to read file.");
    }
  };

  const handleExport = (type: 'png' | 'pdf' | 'midi' | 'wav' | 'mp3' | 'abc' | 'txt') => {
    if (activeTabId === 'home') return;

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

  const handleExportFromHome = (sessionId: string, type: 'png' | 'pdf' | 'midi' | 'wav' | 'mp3' | 'abc' | 'txt') => {
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
        onImport={handleImportClick}
        onExport={handleExport}
      />

      <TabBar 
        tabs={openSessions.map(s => ({ id: s.id, title: s.title }))} 
        activeTabId={activeTabId}
        onTabClick={setActiveTabId}
        onTabClose={closeSessionTab}
        onNewTab={() => createNewSession()}
        onTabsReorder={handleTabsReorder}
        onTabRename={handleTabRename}
      />

      <main className="flex-1 overflow-hidden relative pt-20">
        
        <div className={`absolute inset-0 top-20 z-10 bg-md-sys-background transition-opacity duration-200 ${activeTabId === 'home' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
             <HomeView 
                sessions={sessions} 
                onOpenSession={handleOpenSession} 
                onNewSession={() => createNewSession()} 
                onDeleteSession={deleteSession}
                onExportSession={handleExportFromHome}
             />
        </div>

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
                />
            </div>
        ))}

        {sessions.length === 0 && activeTabId !== 'home' && (
             <div className="flex items-center justify-center h-full text-gray-500">
                 Session not found.
             </div>
        )}

      </main>

      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <ChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} />

    </div>
  );
}
