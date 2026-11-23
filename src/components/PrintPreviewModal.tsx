import React, { useEffect, useRef, useState } from 'react';
import { X, Printer, FileDown, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { AppTheme } from '../types';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  documentTitle: string;
  onPrint: () => void;
  onExportPdf: () => Promise<void>;
  theme?: AppTheme;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  htmlContent,
  documentTitle,
  onPrint,
  onExportPdf,
}) => {
  const pageWidth = 210 * 96 / 25.4;
  const pageHeight = 297 * 96 / 25.4;
  const viewportRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [manualZoom, setManualZoom] = useState<number | null>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    const viewport = viewportRef.current;
    if (!isOpen || !dialog || !viewport) return;
    dialog.showModal();
    const updateWidth = () => setAvailableWidth(viewport.clientWidth - 24);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(viewport);
    return () => {
      observer.disconnect();
      dialog.close();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const fitZoom = availableWidth > 0 ? Math.min(100, Math.floor(availableWidth / pageWidth * 100)) : 100;
  const zoom = manualZoom ?? fitZoom;
  const scale = zoom / 100;
  const handlePdfClick = async () => {
    if (isExporting) return;
    setExportError(false);
    setIsExporting(true);
    try {
      await onExportPdf();
    } catch (err) {
      console.error('PDF export failed:', err);
      setExportError(true);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <dialog ref={dialogRef} aria-labelledby="print-preview-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="m-auto max-h-none w-[calc(100%_-_1rem)] max-w-5xl overflow-hidden rounded-xl bg-white p-0 shadow-xl backdrop:bg-slate-900/75">
      <div className="flex h-[92dvh] flex-col">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 sm:px-5">
          <h2 id="print-preview-title" className="min-w-0 text-sm font-bold text-slate-900">
            {documentTitle}
          </h2>
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" onClick={() => setManualZoom(null)}
              aria-pressed={manualZoom === null}
              className="min-h-11 rounded-lg px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
              Ekrana sığdır
            </button>
            <button type="button" aria-label="Uzaklaştır" disabled={zoom <= Math.min(25, fitZoom)}
              onClick={() => setManualZoom(Math.max(Math.min(25, fitZoom), zoom - 15))}
              className="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-40">
              <ZoomOut className="size-4" />
            </button>
            <span className="text-xs tabular-nums">{zoom}%</span>
            <button type="button" aria-label="Yakınlaştır" disabled={zoom >= 130}
              onClick={() => setManualZoom(Math.min(130, zoom + 15))}
              className="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-40">
              <ZoomIn className="size-4" />
            </button>
            <button type="button" onClick={onClose} aria-label="Önizlemeyi kapat"
              className="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-slate-100">
              <X className="size-5" />
            </button>
          </div>
        </header>

        <div ref={viewportRef} className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3">
          <div className="relative mx-auto bg-white shadow-md" style={{ width: pageWidth * scale, height: pageHeight * scale }}>
            <iframe srcDoc={htmlContent} title={documentTitle}
              className="absolute left-0 top-0 origin-top-left border-0"
              style={{ width: pageWidth, height: pageHeight, transform: `scale(${scale})` }} />
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 p-3">
          {exportError && <p role="alert" className="mr-auto text-sm text-rose-700">PDF oluşturulamadı. Tekrar deneyin.</p>}
          <button type="button" onClick={onPrint}
            className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold">
            <Printer className="size-4" /> Yazdır
          </button>
          <button type="button" onClick={handlePdfClick} disabled={isExporting}
            className="flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
            {isExporting ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            {isExporting ? 'Hazırlanıyor…' : 'PDF İndir'}
          </button>
        </footer>
      </div>
    </dialog>
  );
};
