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