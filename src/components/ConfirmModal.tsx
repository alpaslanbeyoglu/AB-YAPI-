import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Onayla',
  cancelLabel = 'İptal',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      id="confirm-modal-backdrop"
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-xs"
      onClick={onCancel}
    >
      <div
        id="confirm-modal-content"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onCancel();
          }
        }}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
              isDestructive
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-amber-50 border-amber-200 text-amber-600'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 id="confirm-modal-title" className="text-base font-semibold text-slate-900">
              {title}
            </h3>
            <p id="confirm-modal-desc" className="mt-2 text-xs text-slate-600 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            id="confirm-modal-cancel-btn"
            type="button"
            autoFocus
            className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-all active:scale-95"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            id="confirm-modal-confirm-btn"
            type="button"
            className={`rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all active:scale-95 ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
