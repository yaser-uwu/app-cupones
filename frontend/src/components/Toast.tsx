import { useEffect } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'info';

interface Props {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'info', onClose, duration = 3500 }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={`toast toast-${type}`} role="status">
      <span>{message}</span>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Cerrar">
        ×
      </button>
    </div>
  );
}
