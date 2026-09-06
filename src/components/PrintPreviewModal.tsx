import React, { useState } from 'react';
import { X, Printer, FileDown, ZoomIn, ZoomOut, Loader2, FileText } from 'lucide-react';
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
  theme = 'light',
}) => {
  const [zoom, setZoom] = useState<number>(85);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handlePdfClick = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await onExportPdf();
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Yazdırma Önizleme
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  A4 Sayfa Düzeni
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                {documentTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setZoom(Math.max(50, zoom - 15))}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition-colors"
                title="Uzaklaştır"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium px-2 text-slate-700 dark:text-slate-300 min-w-[48px] text-center">
                {zoom}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(Math.min(130, zoom + 15))}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition-colors"
                title="Yakınlaştır"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Preview Canvas */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-6 overflow-auto flex justify-center items-start">
          <div 
            className="transition-transform duration-200 origin-top bg-white shadow-2xl rounded-sm my-2"
            style={{ 
              width: '210mm', 
              minHeight: '297mm',
              transform: `scale(${zoom / 100})`,
              marginBottom: zoom > 100 ? `${(zoom - 100) * 3}mm` : '0px'
            }}
          >
            <iframe
              srcDoc={htmlContent}
              title={documentTitle}
              className="w-full h-full border-0 min-h-[297mm] pointer-events-auto"
              style={{ width: '210mm', minHeight: '297mm', background: '#fff' }}
            />
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            * Yazdırma işlemi tarayıcınızın yazdırma diyaloğunu açar. PDF indirme belgesi doğrudan diskinize kaydedilir.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            >
              Kapat
            </button>
            <button
              type="button"
              onClick={onPrint}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white transition-all cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdır</span>
            </button>
            <button
              type="button"
              onClick={handlePdfClick}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              <span>{isExporting ? 'Hazırlanıyor...' : 'PDF İndir'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
