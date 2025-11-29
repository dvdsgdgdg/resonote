import React from 'react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#2B2B2B] rounded-[28px] p-0 shadow-2xl max-w-2xl w-full animate-in zoom-in-95 duration-200 flex flex-col ring-1 ring-white/5 max-h-[85vh]">
          
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-[#1E1E1E] flex items-center justify-center text-md-sys-primary">
                  <span className="material-symbols-rounded text-2xl">gavel</span>
              </div>
              <div>
                  <h2 className="text-xl font-bold text-white">Terms of Service</h2>
                  <p className="text-sm text-md-sys-secondary">Last updated: May 2024</p>
              </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto custom-scrollbar text-sm text-gray-300 leading-relaxed space-y-4">
              <p>Welcome to Resonote. By accessing or using our application, you agree to be bound by these Terms of Service.</p>
              
              <h3 className="text-white font-semibold pt-2">1. Service Description</h3>
              <p>Resonote is an experimental AI-powered tool that converts images of sheet music into ABC notation. The service utilizes Google's Gemini Vision models to analyze and transcribe visual data.</p>

              <h3 className="text-white font-semibold pt-2">2. Accuracy and Liability</h3>
              <p>The transcription services are provided "AS IS" and "AS AVAILABLE". Resonote relies on generative AI, which may produce inaccurate, incomplete, or unexpected results. We do not guarantee the accuracy of any transcription and are not liable for any errors in the musical output.</p>

              <h3 className="text-white font-semibold pt-2">3. User Conduct & Content</h3>
              <p>You are solely responsible for the content you upload. You represent and warrant that you own or have the necessary licenses, rights, consents, and permissions to upload and use any sheet music images. Do not upload copyrighted material unless you have the right to do so.</p>

              <h3 className="text-white font-semibold pt-2">4. Data Usage</h3>
              <p>Images uploaded to Resonote are processed by Google's Gemini API for the sole purpose of generating the transcription. We do not permanently store your uploaded images or personal data.</p>
              
              <h3 className="text-white font-semibold pt-2">5. Intellectual Property</h3>
              <p>You retain all ownership rights to your original uploaded content. The generated ABC notation is provided to you for your use.</p>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/5 flex justify-end">
              <button 
                  onClick={onClose}
                  className="px-8 py-2.5 bg-md-sys-primary text-md-sys-onPrimary rounded-full text-sm font-semibold hover:bg-[#8AB4F8] transition-colors"
              >
                  I Understand
              </button>
          </div>
      </div>
    </div>
  );
};