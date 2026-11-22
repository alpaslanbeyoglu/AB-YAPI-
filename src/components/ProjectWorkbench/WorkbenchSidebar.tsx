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
  ChevronRight,
} from 'lucide-react';

interface WorkbenchSidebarProps {
  activeStep: number;
  onSelectStep: (step: number) => void;
  params: ProjectParams;
  results: CalculationResult;
  theme?: AppTheme;
  onNavigateToTab?: (tabId: string) => void;
}

export const WorkbenchSidebar: React.FC<WorkbenchSidebarProps> = ({
  activeStep,
  onSelectStep,
  params,
  results,
  theme = 'light',
  onNavigateToTab,
}) => {
  const isGray = theme === 'gray';
  const bgCard = isGray ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/90 shadow-xs';
  const textTitle = isGray ? 'text-gray-100' : 'text-slate-900';

  // Compute real completion status for each stage based on actual project data
  const isStep1Complete = !!(params.projectName && params.landArea && params.landArea > 0);
  const isStep2Complete = !!(params.baseBuildArea && params.baseBuildArea > 0);
  const isStep3Complete = !!(params.floorCount && params.floorCount > 0 && params.flatsPerFloor && params.flatsPerFloor > 0);
  const isStep4Complete = !!(params.flats && params.flats.length > 0);
  const isStep5Complete = !!(results.totalArea > 0 && results.grandTotal > 0);
  const isStep6Complete = !!(params.polygonPoints && params.polygonPoints.length >= 3);
  const isStep7Complete = !!(params.contractorShareRate && params.contractorShareRate > 0);
  const isStep8Complete = !!(params.projectName);
  const isStep9Complete = !!(params.transformationStatus);

  const stages = [
    {
      id: 1,
      title: '1. Müşteri & Proje Bilgileri',
      desc: 'Proje adı, arsa alanı, adres',
      icon: Home,
      complete: isStep1Complete,
      type: 'setup',
      setupStep: 1,
    },
    {
      id: 2,
      title: '2. Arsa & Mevcut Yapı Analizi',
      desc: 'Parsel geometrisi, eski binalar',
      icon: Building,
      complete: isStep2Complete,
      type: 'setup',
      setupStep: 2,
    },
    {
      id: 3,
      title: '3. Yeni Bina Tasarımı',
      desc: 'Kat adedi, bodrum, çıkmalar',
      icon: Layers,
      complete: isStep3Complete,
      type: 'setup',
      setupStep: 2,
    },
    {
      id: 4,
      title: '4. Kat & Bağımsız Bölüm',
      desc: 'Daire tipleri, metrekareler',
      icon: LayoutGrid,
      complete: isStep4Complete,
      type: 'setup',
      setupStep: 3,
    },
    {
      id: 5,
      title: '5. Metraj, Maliyet & Fizibilite',
      desc: 'İnşaat maliyeti ve kârlılık',
      icon: DollarSign,
      complete: isStep5Complete,
      type: 'tab',
      targetTab: 'maliyet',
    },
    {
      id: 6,
      title: '6. 3D Bina Modeli & Cephe',
      desc: '3D önizleme ve dış cephe',
      icon: Box,
      complete: isStep6Complete,
      type: 'tab',
      targetTab: 'model',
    },
    {
      id: 7,
      title: '7. Kat Karşılığı & Malik Payı',
      desc: 'Malik oranları ve paylaşım',
      icon: Users,
      complete: isStep7Complete,
      type: 'tab',
      targetTab: 'malikler',
    },
    {
      id: 8,
      title: '8. Profesyonel Müşteri Teklifi',
      desc: 'Teklif özeti ve sözleşme',
      icon: FileText,
      complete: isStep8Complete,
      type: 'tab',
      targetTab: 'teklif',
    },
    {
      id: 9,
      title: '9. Proje Kaydı & Şantiye',
      desc: 'Kayıt ve şantiyeye aktarım',
      icon: Hammer,
      complete: isStep9Complete,
      type: 'tab',
      targetTab: 'surec',
    },
  ];

  return (
    <div className={`${bgCard} rounded-2xl p-4 border shadow-xs space-y-2`}>
      <div className="px-3 py-2 border-b border-slate-100 mb-2">
        <h3 className={`text-xs font-black uppercase tracking-wider ${textTitle}`}>
          Proje Hazırlık Aşamaları
        </h3>
        <p className="text-[10px] text-slate-500 mt-0.5">
          Çalışma masası adımları ve modül geçişleri
        </p>
      </div>

      <div className="space-y-1.5">
        {stages.map((stage) => {
          const Icon = stage.icon;
          // For setup stages, active if activeStep matches setupStep; for tabs, inactive in setup tab view
          const isActive = stage.type === 'setup' && activeStep === stage.setupStep;

          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => {
                if (stage.type === 'setup' && stage.setupStep !== undefined) {
                  onSelectStep(stage.setupStep);
                } else if (stage.type === 'tab' && onNavigateToTab) {
                  onNavigateToTab(stage.targetTab);
                } else {
                  onSelectStep(1);
                }
              }}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : stage.complete
                  ? 'bg-slate-50/80 hover:bg-slate-100/80 text-slate-800 border border-slate-200/60'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/40'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : stage.complete
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
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

              <div className="shrink-0 flex items-center gap-1.5" title={stage.complete ? 'Tamamlandı' : 'Devam Ediyor / Eksik'}>
                {stage.complete ? (
                  <CheckCircle2
                    className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-500'}`}
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
