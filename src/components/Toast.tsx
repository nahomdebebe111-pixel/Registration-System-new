import { useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastConfig {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastConfig) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-600" />,
    error: <AlertTriangle className="w-5 h-5 text-rose-600" />,
    info: <Info className="w-5 h-5 text-indigo-600" />,
  };

  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    error: 'bg-rose-50 border-rose-200 text-rose-900',
    info: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  };

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 p-4 rounded-xl border-1 shadow-lg toast-enter max-w-sm ${colors[type]}`}>
      <div className="flex-shrink-0">{icons[type]}</div>
      <p className="text-sm font-medium pr-4">{message}</p>
      <button
        onClick={onClose}
        id="toast-close-btn"
        className="ml-auto text-slate-400 hover:text-slate-600 rounded-full p-0.5 hover:bg-slate-200/50 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
