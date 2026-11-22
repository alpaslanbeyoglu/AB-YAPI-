import React, { useMemo } from 'react';
import { ProjectParams, CalculationResult, AppTheme } from '../../types';
import { evaluateWorkbenchProject, StageStatus, WorkbenchEvaluation } from './WorkbenchLiveSummary';
import {
  Home,
  Building,
  Layers,
  LayoutGrid,
  DollarSign,
  Box,
  Users,
  FileText,
  Hammer,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  PanelLeftClose,
} from 'lucide-react';

interface WorkbenchSidebarProps {
  activeWorkbenchStage: number;
  onSelectWorkbenchStage: (stage: number) => void;
  onClose?: () => void;
  params: ProjectParams;
  results: CalculationResult;
  isProjectSaved?: boolean;
  evaluation?: WorkbenchEvaluation;
  theme?: AppTheme;
}

export const WorkbenchSidebar: React.FC<WorkbenchSidebarProps> = ({
  activeWorkbenchStage,
  onSelectWorkbenchStage,
  onClose,
  params,
  results,
  isProjectSaved = false,
  evaluation: propEvaluation,
  theme = 'light',
}) => {
  const isGray = theme === 'gray';
  const bgCard = isGray ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/90 shadow-xs';
  const textTitle = isGray ? 'text-gray-100' : 'text-slate-900';

  const evaluation = useMemo(
    () => propEvaluation || evaluateWorkbenchProject(params, results, isProjectSaved),
    [propEvaluation, params, results, isProjectSaved]
  );

  const stages: Array<{
    id: number;
    title: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 1, title: '1. Müşteri & Proje', desc: 'Ad, adres, arsa, model', icon: Home },
    { id: 2, title: '2. Arsa & Mevcut Yapı', desc: 'Parsel ve eski binalar', icon: Building },
    { id: 3, title: '3. Yeni Bina Tasarımı', desc: 'Kat, bodrum, dükkan, çatı', icon: Layers },
    { id: 4, title: '4. Kat & Daire Matrisi', desc: 'Daire dağılımı, metraj', icon: LayoutGrid },
    { id: 5, title: '5. Metraj & Maliyet', desc: 'Bütçe ve kalem analizi', icon: DollarSign },
    { id: 6, title: '6. 3D Bina & Cephe', desc: 'Model ve dış görünüm', icon: Box },
    { id: 7, title: '7. Malik Paylaşımı', desc: 'Pay oranları ve dağıtım', icon: Users },
    { id: 8, title: '8. Müşteri Teklifi', desc: 'Teklif hazırlama ve PDF', icon: FileText },
    { id: 9, title: '9. Kayıt & Şantiye', desc: 'Arşiv ve şantiye takibi', icon: Hammer },
  ];

  const statusMeta: Record<StageStatus, { label: string }> = {
    completed: { label: 'Tamamlandı' },
    in_progress: { label: 'Devam ediyor' },
    needs_check: { label: 'Kontrol gerekli' },
    incomplete: { label: 'Eksik' },
  };

  return (
    <div className={`${bgCard} rounded-2xl p-3 border shadow-xs space-y-2`}>
      <div className="px-2 py-1.5 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className={`text-[11px] font-black uppercase tracking-wider ${textTitle} truncate`}>
            Proje Akış Şeması
          </h3>
          <p className="text-[10px] text-slate-500">
            Zorunlu: <strong className="text-indigo-700 font-mono">%{evaluation.requiredPercent}</strong>
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
            {evaluation.completedStageCount}/9
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Akış şemasını kapat ve sol navigasyona dön"
              aria-label="Proje akış şemasını kapat"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const stageEval = evaluation.stages[stage.id] || {
            id: stage.id,
            status: 'incomplete' as StageStatus,
            isOptional: false,
            issueCount: 0,
          };
          const status = stageEval.status;
          const isActive = activeWorkbenchStage === stage.id;
          const isCompleted = status === 'completed';
          const isCheck = status === 'needs_check';

          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onSelectWorkbenchStage(stage.id)}
              className={`w-full text-left px-2.5 py-2 rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : isCompleted
                  ? 'bg-slate-50/80 hover:bg-slate-100 text-slate-800 border border-slate-200/60'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/40'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : isCompleted
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : isCheck
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-bold truncate leading-tight ${isActive ? 'text-white' : textTitle}`}>
                    {stage.title}
                  </div>
                  <div
                    className={`text-[10px] truncate leading-tight mt-0.5 ${
                      isActive ? 'text-indigo-100' : 'text-slate-400'
                    }`}
                  >
                    {stageEval.isOptional && !isCompleted && !isCheck
                      ? `${stage.desc} (İsteğe bağlı)`
                      : stage.desc}
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1" title={statusMeta[status].label}>
                {isCompleted ? (
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-emerald-500'}`}
                  />
                ) : isCheck ? (
                  <AlertCircle
                    className={`w-3.5 h-3.5 ${isActive ? 'text-amber-200' : 'text-rose-500'}`}
                  />
                ) : (
                  <Clock
                    className={`w-3.5 h-3.5 ${
                      isActive
                        ? 'text-indigo-200'
                        : stageEval.isOptional
                        ? 'text-slate-300'
                        : 'text-amber-500'
                    }`}
                  />
                )}
                <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
