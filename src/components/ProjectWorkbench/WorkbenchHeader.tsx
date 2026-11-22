import React from 'react';
import { ProjectParams, CalculationResult, AppTheme } from '../../types';
import { FileUp, Save, Printer, Building2, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

interface WorkbenchHeaderProps {
  params: ProjectParams;
  results: CalculationResult;
  theme?: AppTheme;
  isProjectSaved?: boolean;
  onOpenTransferModal?: () => void;
  onExportPdf?: () => void;
  onQuickSave?: () => void;
  onNavigateToSite?: () => void;
  isSaving?: boolean;
}

export const WorkbenchHeader: React.FC<WorkbenchHeaderProps> = ({
  params,
  results,
  theme = 'light',
  isProjectSaved = false,
  onOpenTransferModal,
  onExportPdf,
  onQuickSave,
  onNavigateToSite,
  isSaving = false,
}) => {
  const isGray = theme === 'gray';
  const bgCard = isGray ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/90 shadow-xs';
  const textTitle = isGray ? 'text-gray-100' : 'text-slate-900';
  const textMuted = isGray ? 'text-gray-400' : 'text-slate-500';

  const projectName = params.projectName?.trim() || 'İsimsiz Kentsel Dönüşüm Projesi';
  const projectAddress = params.projectAddress?.trim() || 'Adres Girilmedi';

  return (
    <div className={`${bgCard} rounded-2xl p-5 border shadow-xs relative overflow-hidden`}>
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        {/* Left: Project Title, Save Status & Summary */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              AB-YAPI PROJE ÇALIŞMA MASASI
            </span>
            {isProjectSaved ? (
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Arşivde Kayıtlı
              </span>
            ) : (
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Henüz Kaydedilmedi
              </span>
            )}
          </div>

          <h1 className={`text-lg sm:text-xl font-black tracking-tight ${textTitle} truncate max-w-2xl`}>
            {projectName}
          </h1>

          <div className={`text-xs ${textMuted} flex items-center gap-2 flex-wrap`}>
            <span className="font-medium text-slate-700">📍 {projectAddress}</span>
            <span>•</span>
            <span>Arsa: <strong className="text-slate-900">{params.landArea || 0} m²</strong></span>
            <span>•</span>
            <span>Toplam İnşaat: <strong className="text-slate-900">{Math.round(results.totalArea || 0).toLocaleString('tr-TR')} m²</strong></span>
            <span>•</span>
            <span>Hedef Bedel: <strong className="text-indigo-700">{Math.round(results.grandTotal || 0).toLocaleString('tr-TR')} ₺</strong></span>
          </div>
        </div>

        {/* Right: Action Buttons (Quick Save, Transfer, PDF, Site Transition) */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenTransferModal && (
            <button
              type="button"
              onClick={onOpenTransferModal}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Projeyi İçe veya Dışa Aktar"
            >
              <FileUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>İçe / Dışa Aktar</span>
            </button>
          )}

          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Teklif Aşamasına / PDF Çıktıya Git"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Teklif & PDF</span>
            </button>
          )}

          {onQuickSave && (
            <button
              type="button"
              onClick={onQuickSave}
              disabled={isSaving}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Projeyi Kaydet ve Hesaplamayı Güncelle"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Kaydediliyor...' : 'Projeyi Kaydet'}</span>
            </button>
          )}

          {onNavigateToSite && (
            <button
              type="button"
              onClick={onNavigateToSite}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Şantiye Aşamasına Geçiş Yap"
            >
              <span>Şantiye Aşaması</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
