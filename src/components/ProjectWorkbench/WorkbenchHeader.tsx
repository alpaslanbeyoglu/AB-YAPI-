import React from 'react';
import { ProjectParams, CalculationResult, AppTheme } from '../../types';
import { WorkbenchEvaluation, WorkbenchStageNavigationOptions } from './WorkbenchLiveSummary';
import { FileUp, Save, FileText, CheckCircle2, Clock, ArrowRight, MapPin, AlertCircle, PanelLeftOpen, PanelLeftClose } from 'lucide-react';

interface WorkbenchHeaderProps {
  params: ProjectParams;
  results: CalculationResult;
  theme?: AppTheme;
  isProjectSaved?: boolean;
  activeStage?: number;
  evaluation?: WorkbenchEvaluation;
  isFlowOpen?: boolean;
  onToggleFlow?: () => void;
  onSelectStage?: (
    stage: number,
    focusFieldId?: string,
    options?: WorkbenchStageNavigationOptions
  ) => void;
  onOpenTransferModal?: () => void;
  onExportPdf?: () => void;
  onQuickSave?: () => void;
  onNavigateToSite?: () => void;
  isSaving?: boolean;
}

const getModelLabel = (params: ProjectParams): string => {
  if (params.projectType === 'kentsel_imar' || (params.projectModel === 'urbanTransformation' && params.hasZoningIncrease)) {
    return 'Kentsel Dönüşüm + İmar';
  }
  if (params.projectType === 'kat_karsiligi' || params.projectModel === 'contractorShare') {
    return `Kat Karşılığı (%${params.contractorShareRate ?? 50})`;
  }
  if (params.projectType === 'muteahhitlik' || params.projectModel === 'contractorService') {
    return 'Anahtar Teslim Müteahhitlik';
  }
  if (params.projectType === 'nakit' || params.projectModel === 'cash') {
    return 'Nakit / Hakediş';
  }
  return 'Kentsel Dönüşüm (6306)';
};

export const WorkbenchHeader: React.FC<WorkbenchHeaderProps> = ({
  params,
  results,
  theme = 'light',
  isProjectSaved = false,
  activeStage = 1,
  evaluation,
  isFlowOpen = false,
  onToggleFlow,
  onSelectStage,
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

  const projectName = params.projectName?.trim() || 'İsimsiz Proje';
  const projectAddress = params.projectAddress?.trim() || 'Adres henüz girilmedi';
  const modelLabel = getModelLabel(params);
  const firstCritical = evaluation?.issues.find((i) => i.severity === 'critical');
  const criticalCount = evaluation?.issues.filter((i) => i.severity === 'critical').length || 0;

  return (
    <div className={`${bgCard} rounded-2xl px-5 py-4 border shadow-xs`}>
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        {/* Sol: Proje Künyesi & Hızlı Erişim Bilgileri */}
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectStage?.(1, 'projectNameInput')}
              className={`text-lg font-black tracking-tight ${textTitle} truncate max-w-xl text-left hover:text-indigo-600 transition-colors cursor-pointer`}
              title="Proje adını düzenle (1. Aşama)"
            >
              {projectName}
            </button>

            {isProjectSaved ? (
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Kayıtlı
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 text-slate-500" />
                Taslak
              </span>
            )}

            <button
              type="button"
              onClick={() => onSelectStage?.(1)}
              className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100 transition-colors cursor-pointer shrink-0"
              title="Proje modelini değiştirmek için 1. aşamaya gidin"
            >
              {modelLabel}
            </button>

            {evaluation && (
              <button
                type="button"
                onClick={() => {
                  if (firstCritical) {
                    onSelectStage?.(firstCritical.stage, firstCritical.focusFieldId);
                  } else {
                    onSelectStage?.(8, undefined, { stage8SubView: 'offer' });
                  }
                }}
                className={`px-2 py-0.5 text-[11px] font-bold rounded-md border flex items-center gap-1 shrink-0 cursor-pointer transition-colors ${
                  evaluation.isOfferReady
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                }`}
                title={
                  evaluation.isOfferReady
                    ? 'Zorunlu bilgiler tamam — teklif ekranına geçebilirsiniz'
                    : 'İlk eksik zorunlu alana git'
                }
              >
                {evaluation.isOfferReady ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Teklife Hazır • %{evaluation.requiredPercent}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-rose-600" />
                    <span>{criticalCount} Zorunlu Eksik • %{evaluation.requiredPercent}</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className={`text-xs ${textMuted} flex items-center gap-x-3 gap-y-1 flex-wrap`}>
            <button
              type="button"
              onClick={() => onSelectStage?.(1, 'projectAddressInput')}
              className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer truncate max-w-md"
              title="Adresi düzenle (1. Aşama)"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{projectAddress}</span>
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => onSelectStage?.(2, 'projectLandAreaInput')}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
              title="Arsa ve imar analizine git (2. Aşama)"
            >
              Arsa: <strong className="text-slate-900 font-mono">{(params.landArea || 0).toLocaleString('tr-TR')} m²</strong>
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => onSelectStage?.(3, 'minimalFloorCountInput')}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
              title="Mimari tasarıma git (3. Aşama)"
            >
              İnşaat: <strong className="text-slate-900 font-mono">{Math.round(results.totalArea || 0).toLocaleString('tr-TR')} m²</strong>
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => onSelectStage?.(3, 'stage3FlatsMatrixSection')}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
              title="Kat ve daire matrisine git (3. Aşama)"
            >
              Bölüm: <strong className="text-slate-900 font-mono">{results.flatCount || 0} Adet</strong>
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => onSelectStage?.(6, 'stage6CostParamsCard')}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
              title="Maliyet ve fizibiliteye git (6. Aşama)"
            >
              Teklif Bedeli: <strong className="text-indigo-700 font-mono">{Math.round(results.grandTotal || 0).toLocaleString('tr-TR')} ₺</strong>
            </button>
          </div>
        </div>

        {/* Sağ: Hızlı Karar ve Geçiş İşlemleri */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onToggleFlow && (
            <button
              type="button"
              onClick={onToggleFlow}
              aria-expanded={isFlowOpen}
              className={`px-3 py-2 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border ${
                isFlowOpen
                  ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title={
                isFlowOpen
                  ? 'Proje akış şemasını kapat ve sol navigasyona dön'
                  : 'Proje akış şemasını aç (sol navigasyon otomatik gizlenir)'
              }
            >
              {isFlowOpen ? (
                <PanelLeftClose className="w-3.5 h-3.5" />
              ) : (
                <PanelLeftOpen className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>{isFlowOpen ? 'Akış Şemasını Kapat' : 'Proje Akış Şeması'}</span>
              {evaluation && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                    isFlowOpen
                      ? 'bg-white/15 text-slate-100'
                      : 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  {evaluation.completedStageCount}/9
                </span>
              )}
            </button>
          )}

          {onOpenTransferModal && (
            <button
              type="button"
              onClick={onOpenTransferModal}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Projeyi İçe veya Dışa Aktar"
            >
              <FileUp className="w-3.5 h-3.5 text-slate-500" />
              <span>İçe / Dışa Aktar</span>
            </button>
          )}

          {onQuickSave && (
            <button
              type="button"
              onClick={onQuickSave}
              disabled={isSaving}
              className="px-3 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Projeyi Kaydet ve Hesaplamayı Güncelle"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</span>
            </button>
          )}

          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                activeStage === 8
                  ? 'bg-indigo-700 text-white ring-2 ring-indigo-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
              title="Müşteri Teklifi ve PDF Çıktı Ekranına Geç"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Teklif Hazırla</span>
            </button>
          )}

          {onNavigateToSite && (
            <button
              type="button"
              onClick={onNavigateToSite}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                activeStage === 9
                  ? 'bg-emerald-700 text-white ring-2 ring-emerald-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              title="Şantiye Aşamasına Geçiş Yap"
            >
              <span>Şantiye</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
