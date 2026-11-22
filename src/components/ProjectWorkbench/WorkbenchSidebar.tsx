import React from 'react';
import { ProjectParams, CalculationResult, AppTheme } from '../../types';
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
} from 'lucide-react';

interface WorkbenchSidebarProps {
  activeWorkbenchStage: number;
  onSelectWorkbenchStage: (stage: number) => void;
  params: ProjectParams;
  results: CalculationResult;
  isProjectSaved?: boolean;
  theme?: AppTheme;
}

type StageStatus = 'completed' | 'in_progress' | 'needs_check' | 'incomplete';

export const WorkbenchSidebar: React.FC<WorkbenchSidebarProps> = ({
  activeWorkbenchStage,
  onSelectWorkbenchStage,
  params,
  results,
  isProjectSaved = false,
  theme = 'light',
}) => {
  const isGray = theme === 'gray';
  const bgCard = isGray ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/90 shadow-xs';
  const textTitle = isGray ? 'text-gray-100' : 'text-slate-900';

  const hasName = Boolean(params.projectName && params.projectName.trim().length > 0);
  const hasAddress = Boolean(params.projectAddress && params.projectAddress.trim().length > 0);
  const hasLandArea = Boolean(params.landArea && params.landArea > 0);
  const hasBaseArea = Boolean(params.baseBuildArea && params.baseBuildArea > 0);
  const hasExistingBuildings = Boolean(params.existingBuildings && params.existingBuildings.length > 0);
  const hasPolygon = Boolean(params.polygonPoints && params.polygonPoints.length >= 3);
  const hasFloors = Boolean(params.floorCount && params.floorCount > 0 && params.flatsPerFloor && params.flatsPerFloor > 0);
  const hasFlats = Boolean(params.flats && params.flats.length > 0 && results.flatCount > 0);
  const hasCosts = Boolean(results.totalArea > 0 && results.grandTotal > 0);
  const taksRatio = hasLandArea && hasBaseArea ? params.baseBuildArea / (params.landArea || 1) : 0;
  const taksExceeds = taksRatio > 0.65;

  const getStage1Status = (): StageStatus => {
    if (hasName && hasAddress && hasLandArea) return 'completed';
    if (hasName || hasAddress || hasLandArea) return 'in_progress';
    return 'incomplete';
  };

  const getStage2Status = (): StageStatus => {
    if (taksExceeds) return 'needs_check';
    if (hasBaseArea && (hasPolygon || hasExistingBuildings)) return 'completed';
    if (hasBaseArea || hasPolygon || hasExistingBuildings) return 'in_progress';
    return 'incomplete';
  };

  const getStage3Status = (): StageStatus => {
    if (hasBaseArea && hasFloors) return 'completed';
    if (hasFloors || hasBaseArea) return 'in_progress';
    return 'incomplete';
  };

  const getStage4Status = (): StageStatus => {
    if (!hasFlats) return 'incomplete';
    if (params.flats.length !== results.flatCount) return 'needs_check';
    return 'completed';
  };

  const getStage5Status = (): StageStatus => {
    if (!hasCosts) return 'incomplete';
    if (!hasLandArea) return 'needs_check';
    return 'completed';
  };

  const getStage6Status = (): StageStatus => {
    if (hasBaseArea && hasFloors && (hasPolygon || (params.facadeWidth && params.facadeDepth))) return 'completed';
    if (hasBaseArea && hasFloors) return 'in_progress';
    return 'incomplete';
  };

  const getStage7Status = (): StageStatus => {
    if (params.projectModel === 'contractorShare') {
      const assigned = (params.contractorFlatIds || []).length;
      if (assigned > 0 || (params.contractorShareRate || 0) > 0) return 'completed';
      return 'needs_check';
    }
    if (hasFlats && params.flats.some((f) => Boolean(f.name && f.name.trim()))) return 'completed';
    if (hasFlats) return 'in_progress';
    return 'incomplete';
  };

  const getStage8Status = (): StageStatus => {
    if (hasName && hasAddress && hasCosts && hasFlats) return 'completed';
    if (hasCosts && hasFlats) return 'in_progress';
    return 'incomplete';
  };

  const getStage9Status = (): StageStatus => {
    if (isProjectSaved && hasCosts) return 'completed';
    if (hasCosts) return 'in_progress';
    return 'incomplete';
  };

  const stages: Array<{
    id: number;
    title: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
    status: StageStatus;
  }> = [
    {
      id: 1,
      title: '1. Müşteri & Proje Bilgileri',
      desc: 'Proje adı, arsa alanı, adres',
      icon: Home,
      status: getStage1Status(),
    },
    {
      id: 2,
      title: '2. Arsa & Mevcut Yapı Analizi',
      desc: 'Parsel geometrisi, eski binalar',
      icon: Building,
      status: getStage2Status(),
    },
    {
      id: 3,
      title: '3. Yeni Bina Tasarımı',
      desc: 'Kat adedi, bodrum, çıkmalar',
      icon: Layers,
      status: getStage3Status(),
    },
    {
      id: 4,
      title: '4. Kat & Bağımsız Bölüm',
      desc: 'Daire tipleri, metrekareler',
      icon: LayoutGrid,
      status: getStage4Status(),
    },
    {
      id: 5,
      title: '5. Metraj, Maliyet & Fizibilite',
      desc: 'İnşaat maliyeti ve metraj',
      icon: DollarSign,
      status: getStage5Status(),
    },
    {
      id: 6,
      title: '6. 3D Bina Modeli & Cephe',
      desc: '3D önizleme ve dış cephe',
      icon: Box,
      status: getStage6Status(),
    },
    {
      id: 7,
      title: '7. Kat Karşılığı & Malik Payı',
      desc: 'Malik oranları ve paylaşım',
      icon: Users,
      status: getStage7Status(),
    },
    {
      id: 8,
      title: '8. Profesyonel Müşteri Teklifi',
      desc: 'Teklif özeti ve çıktı',
      icon: FileText,
      status: getStage8Status(),
    },
    {
      id: 9,
      title: '9. Proje Kaydı & Şantiye',
      desc: 'Kayıt ve şantiye takibi',
      icon: Hammer,
      status: getStage9Status(),
    },
  ];

  const completedCount = stages.filter((s) => s.status === 'completed').length;

  const statusMeta: Record<StageStatus, { label: string }> = {
    completed: { label: 'Tamamlandı' },
    in_progress: { label: 'Devam ediyor' },
    needs_check: { label: 'Kontrol gerekli' },
    incomplete: { label: 'Tamamlanmadı' },
  };

  return (
    <div className={`${bgCard} rounded-2xl p-4 border shadow-xs space-y-2`}>
      <div className="px-3 py-2 border-b border-slate-100 mb-2 flex items-center justify-between gap-2">
        <div>
          <h3 className={`text-xs font-black uppercase tracking-wider ${textTitle}`}>
            Proje Aşamaları
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            9 Aşamalı Çalışma Masası
          </p>
        </div>
        <span className="text-[10px] font-black font-mono px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
          {completedCount}/9
        </span>
      </div>

      <div className="space-y-1.5">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const isActive = activeWorkbenchStage === stage.id;
          const isCompleted = stage.status === 'completed';
          const isCheck = stage.status === 'needs_check';

          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onSelectWorkbenchStage(stage.id)}
              className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : isCompleted
                  ? 'bg-slate-50/80 hover:bg-slate-100/80 text-slate-800 border border-slate-200/60'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/40'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : isCompleted
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : isCheck
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-bold truncate ${isActive ? 'text-white' : textTitle}`}>
                    {stage.title}
                  </div>
                  <div
                    className={`text-[10px] truncate ${
                      isActive ? 'text-indigo-100' : 'text-slate-400'
                    }`}
                  >
                    {stage.desc}
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1" title={statusMeta[stage.status].label}>
                {isCompleted ? (
                  <CheckCircle2
                    className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-500'}`}
                  />
                ) : isCheck ? (
                  <AlertCircle
                    className={`w-4 h-4 ${isActive ? 'text-amber-200' : 'text-rose-500'}`}
                  />
                ) : (
                  <Clock
                    className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-200' : 'text-amber-500'}`}
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
