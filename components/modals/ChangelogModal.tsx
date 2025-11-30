import React, { useEffect, useState } from 'react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Release {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  const [releases, setReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch('https://api.github.com/repos/IRedDragonICY/resonote/releases')
        .then(res => {
            if (!res.ok) throw new Error('Failed to fetch releases');
            return res.json();
        })
        .then(data => {
            // Filter out drafts if necessary, though public API usually hides them
            setReleases(data);
            setIsLoading(false);
        })
        .catch(err => {
            console.error(err);
            setError("Could not load release notes from GitHub.");
            setIsLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#2B2B2B] rounded-[28px] shadow-2xl max-w-2xl w-full animate-in zoom-in-95 duration-200 flex flex-col ring-1 ring-white/5 max-h-[85vh]">
          
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-[#2B2B2B] rounded-t-[28px]">
               <div className="w-10 h-10 rounded-full bg-[#1E1E1E] flex items-center justify-center text-md-sys-primary">
                  <span className="material-symbols-rounded text-2xl">history</span>
              </div>
              <div>
                  <h2 className="text-xl font-bold text-white">Changelog</h2>
                  <p className="text-sm text-md-sys-secondary">Latest updates from Resonote</p>
              </div>
          </div>

          {/* Content */}
          <div className="p-0 overflow-y-auto custom-scrollbar bg-[#1E1E1E] flex-1">
              {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
                      <span className="material-symbols-rounded animate-spin text-3xl">sync</span>
                      <p className="text-sm">Fetching releases...</p>
                  </div>
              ) : error ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-3 text-red-400">
                      <span className="material-symbols-rounded text-3xl">wifi_off</span>
                      <p className="text-sm">{error}</p>
                      <a 
                        href="https://github.com/IRedDragonICY/resonote/releases" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-md-sys-primary hover:underline"
                      >
                        View on GitHub
                      </a>
                  </div>
              ) : releases.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                      <p>No releases found. This might be a development version.</p>
                  </div>
              ) : (
                  <div className="divide-y divide-white/5">
                      {releases.map((release) => (
                          <div key={release.id} className="p-6 hover:bg-white/[0.02] transition-colors">
                              <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-baseline gap-3">
                                      <h3 className="text-lg font-bold text-white">
                                          {release.name || release.tag_name}
                                      </h3>
                                      <span className="px-2 py-0.5 rounded-full bg-md-sys-primary/10 text-md-sys-primary text-[10px] font-mono font-bold border border-md-sys-primary/20">
                                          {release.tag_name}
                                      </span>
                                  </div>
                                  <span className="text-xs text-gray-500 font-mono">
                                      {new Date(release.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </span>
                              </div>
                              <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-mono text-[13px] opacity-90">
                                  {release.body}
                              </div>
                              <div className="mt-4">
                                  <a 
                                    href={release.html_url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="inline-flex items-center gap-1 text-xs text-md-sys-primary hover:text-white transition-colors"
                                  >
                                    View full release
                                    <span className="material-symbols-rounded text-[14px]">open_in_new</span>
                                  </a>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/5 bg-[#2B2B2B] rounded-b-[28px] flex justify-between items-center">
              <p className="text-[10px] text-gray-500">
                  Data retrieved from GitHub API
              </p>
              <button 
                  onClick={onClose}
                  className="px-6 py-2 bg-[#333] text-white rounded-full text-xs font-medium hover:bg-[#444] transition-colors border border-white/5"
              >
                  Close
              </button>
          </div>
      </div>
    </div>
  );
};