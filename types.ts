
export interface ABCResult {
  abc: string;
  thoughtSignature?: string;
  thoughts?: string;
}

export interface UploadFileState {
  id: string;
  file: File;
  preview: string;
  status: 'idle' | 'uploading' | 'processing' | 'done' | 'error';
}

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'thinking';
}

export interface GenerationState {
  isLoading: boolean;
  error: string | null;
  result: ABCResult | null;
  logs: LogEntry[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface UserSettings {
  apiKey: string;
  enabledModels: string[]; // List of model IDs that are visible
  customModels: { id: string; name: string }[]; // User defined models
  theme: 'light' | 'dark'; // Added theme preference
}

export interface HistoryEntry {
  content: string;
  timestamp: number;
  label: string;
}

export interface Session {
  id: string;
  title: string;
  lastModified: number;
  isOpen?: boolean; // Tracks if the session is currently open in a tab
  customColor?: string; // Custom tab color (hex)
  customIcon?: string; // Custom tab icon name
  data: {
    files: UploadFileState[];
    prompt: string;
    abc: string;
    history: HistoryEntry[]; // History stack for Undo/Redo
    historyIndex: number; // Current position in history stack
    model: string;
    generation: GenerationState;
    thumbnail?: string;
  };
}