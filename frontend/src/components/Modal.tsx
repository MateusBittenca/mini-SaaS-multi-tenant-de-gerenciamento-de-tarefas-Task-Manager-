import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleEsc);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-sidebar/50 backdrop-blur-[2px] animate-modal-backdrop"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="modal-title"
        className={`relative flex max-h-[min(90dvh,900px)] w-full flex-col ${sizeClasses[size]} animate-modal-panel rounded-2xl bg-surface shadow-[var(--shadow-modal)]`}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-sand/80 px-6 py-5">
          <h2 id="modal-title" className="pr-4 text-xl font-display font-semibold text-espresso">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-espresso-faint transition-colors hover:bg-cream-dark hover:text-espresso"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
