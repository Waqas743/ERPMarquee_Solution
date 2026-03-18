import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  type = 'danger'
}) => {
  if (!isOpen) return null;

  const colors = {
    danger: {
      bg: 'bg-red-50',
      icon: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      bg: 'bg-amber-50',
      icon: 'text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700',
    },
    info: {
      bg: 'bg-indigo-50',
      icon: 'text-indigo-600',
      button: 'bg-indigo-600 hover:bg-indigo-700',
    }
  };

  const activeColor = colors[type];

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 flex flex-col items-center text-center">
          <div className={`w-12 h-12 ${activeColor.bg} rounded-full flex items-center justify-center mb-4`}>
            <AlertTriangle className={activeColor.icon} size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            {message}
          </p>
        </div>
        
        <div className="p-4 bg-slate-50 flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-white transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 ${activeColor.button} text-white rounded-xl font-medium transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
