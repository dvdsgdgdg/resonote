import React, { useState } from 'react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    const title = encodeURIComponent(feedbackTitle);
    const body = encodeURIComponent(feedbackInput);
    window.open(`https://github.com/IRedDragonICY/resonote/issues/new?title=${title}&body=${body}`, '_blank');
    onClose();
    // Reset fields
    setFeedbackTitle("");
    setFeedbackInput("");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#2B2B2B] rounded-[28px] p-6 shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200 flex flex-col ring-1 ring-white/5">
        <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-[#1E1E1E] flex items-center justify-center text-md-sys-primary">
                <span className="material-symbols-rounded text-2xl">chat</span>
            </div>
            <div>
                <h2 className="text-xl font-bold text-white">Give Feedback</h2>
                <p className="text-sm text-md-sys-secondary">Submit issues directly to our GitHub repository.</p>
            </div>
        </div>

        <div className="flex flex-col gap-4 mb-6">
            <input
                type="text"
                value={feedbackTitle}
                onChange={(e) => setFeedbackTitle(e.target.value)}
                placeholder="Title (e.g., Feature: Dark Mode)"
                className="w-full bg-[#1E1E1E] text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-md-sys-primary/50 transition-all placeholder:text-gray-500 font-medium"
            />
            <textarea 
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                placeholder="Describe your issue, feature request, or suggestion..."
                className="w-full h-48 bg-[#1E1E1E] text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-md-sys-primary/50 transition-all resize-none placeholder:text-gray-500"
            />
        </div>
        
        <div className="flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-6 py-2.5 text-md-sys-primary hover:bg-[#1E1E1E] rounded-full text-sm font-medium transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-md-sys-primary text-md-sys-onPrimary rounded-full text-sm font-semibold hover:bg-[#8AB4F8] transition-colors flex items-center gap-2"
            >
                Continue to GitHub
                <span className="material-symbols-rounded text-[18px]">arrow_forward</span>
            </button>
        </div>
      </div>
    </div>
  );
};