import React, { useState } from 'react';
import { Printer, FileDown, Loader2 } from 'lucide-react';
import { AppTheme } from '../types';

interface PrintAndPdfButtonsProps {
  onExportPdf: () => Promise<void>;
  onPrint: () => void;
  pdfFilename?: string;
  pdfLabel?: string;
  printLabel?: string;
  theme?: AppTheme;
  className?: string;
  disabled?: boolean;
}

export const PrintAndPdfButtons: React.FC<PrintAndPdfButtonsProps> = ({
  onExportPdf,
  onPrint,
  pdfLabel = 'PDF İndir',
  printLabel = 'Yazdır',
  theme = 'light',
  className = '',
  disabled = false,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isGray = theme === 'gray';

  const handlePdfClick = async () => {
    if (isExportingPdf || disabled) return;
    setIsExportingPdf(true);
    setStatusMessage('PDF hazırlanıyor...');
    try {
      await onExportPdf();
      setStatusMessage(null);
    } catch (err: any) {
      console.error('PDF export error:', err);
      setStatusMessage('PDF oluşturulamadı');
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrintClick = () => {
    if (disabled) return;
    onPrint();
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* PDF İndir Butonu */}
      <button
        type="button"
        onClick={handlePdfClick}
        disabled={isExportingPdf || disabled}
        className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
        title="Yüksek çözünürlüklü A4 PDF belgesi olarak bilgisayarınıza indirin"
      >
        {isExportingPdf ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          <FileDown className="w-4 h-4 shrink-0" />
        )}
        <span>{isExportingPdf ? 'PDF Hazırlanıyor...' : pdfLabel}</span>
      </button>

      {/* Yazdır Butonu */}
      <button
        type="button"
        onClick={handlePrintClick}
        disabled={disabled}
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer ${
          isGray
            ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
        }`}
        title="Yazdırma ekranını açın veya yazıcıya gönderin"
      >
        <Printer className="w-4 h-4 shrink-0" />
        <span>{printLabel}</span>
      </button>

      {statusMessage && (
        <span className="text-[11px] text-amber-600 font-medium animate-pulse ml-1">
          {statusMessage}
        </span>
      )}
    </div>
  );
};
