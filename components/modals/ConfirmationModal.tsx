import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  isDestructive = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#2B2B2B] rounded-[28px] p-6 shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200 flex flex-col ring-1 ring-white/5">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-300 mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${
              isDestructive
                ? 'bg-md-sys-error text-white hover:bg-red-400'
                : 'bg-md-sys-primary text-md-sys-onPrimary hover:bg-primary/90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};