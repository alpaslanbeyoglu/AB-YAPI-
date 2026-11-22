import React from 'react';
import {
  Compass,
  FileText,
  ScrollText,
  HardHat,
  CheckCircle2,
  ChevronRight,
  Clock,
  Sparkles,
  ArrowRight,
  Box,
  Users,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';
import { TabId } from '../config/tabs';
import { AppTheme } from '../types';

interface ProjectLifecycleBarProps {
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
  isOfferAccepted: boolean;
  onToggleOfferAccepted: (val: boolean) => void;
  projectName?: string;
  theme?: AppTheme;
}

interface LifecycleStage {
  id: string;
  number: number;
  label: string;
  shortLabel: string;
  targetTab: TabId;
  matchingTabs: TabId[];
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export const ProjectLifecycleBar: React.FC<ProjectLifecycleBarProps> = ({
  activeTab,
  onNavigate,
  isOfferAccepted,
  onToggleOfferAccepted,
  projectName,
  theme = 'light',
}) => {
  const isGray = theme === 'gray';

  const stages: LifecycleStage[] = [
    {
      id: 'setup',
      number: 1,
      label: '1. Kurulum & İmar',
      shortLabel: '1. Kurulum & İmar',
      targetTab: 'kurulum',
      matchingTabs: ['kurulum'],
      icon: Compass,
      description: 'Müşteri tanımı, arsa/imar analizi ve mimari yapılandırma',
    },
    {
      id: 'design3d',
      number: 2,
      label: '2. 3D Tasarım & Görsel',
      shortLabel: '2. 3D Tasarım',
      targetTab: 'model',
      matchingTabs: ['model'],
      icon: Box,
      description: '3D bina modeli, dış cephe, AI render ve güneşlenme analizi',
    },
    {
      id: 'specsCost',
      number: 3,
      label: '3. Şartname & Maliyet',
      shortLabel: '3. Şartname & Maliyet',
      targetTab: 'maliyet',
      matchingTabs: ['sartname', 'maliyet', 'raporlar'],
      icon: BarChart3,
      description: 'Teknik şartname, metraj cetveli, maliyet analizi ve yönetici raporu',
    },
    {
      id: 'ownersOffer',
      number: 4,
      label: '4. Malik, Teklif & Sözleşme',
      shortLabel: '4. Malik & Teklif',
      targetTab: 'teklif',
      matchingTabs: ['malikler', 'teklif', 'sozlesme'],
      icon: FileText,
      description: 'Malik paylaşımı (CRM), müşteri teklifi ve yapım sözleşmesi',
    },
    {
      id: 'construction',
      number: 5,
      label: '5. Proje & Şantiye',
      shortLabel: '5. Şantiye',
      targetTab: 'surec',
      matchingTabs: ['surec'],
      icon: HardHat,
      description: 'Şantiye süreci, taşeron hakedişleri ve malik bildirimleri',
    },
  ];

  // Determine current active stage index
  const activeStageIndex = stages.findIndex(s => s.matchingTabs.includes(activeTab));

  return (
    <div
      className={`rounded-2xl border px-3 sm:px-4 py-2 sm:py-2.5 transition-all print:hidden shadow-2xs ${
        isGray
          ? 'bg-slate-200/80 border-slate-300'
          : 'bg-white/95 border-slate-200/80 shadow-slate-100/60'
      }`}
    >
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 sm:gap-3">
        {/* PIPELINE STAGES PROGRESS ROW */}
        <div className="flex items-center gap-1 xl:gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-0.5 min-w-0 flex-1">
          {stages.map((stage, idx) => {
            const Icon = stage.icon;
            const isCurrent = stage.matchingTabs.includes(activeTab);
            const isPassed = activeStageIndex > idx || (idx <= 3 && isOfferAccepted);

            return (
              <React.Fragment key={stage.id}>
                {idx > 0 && (
                  <ChevronRight
                    className={`w-3 h-3 xl:w-3.5 xl:h-3.5 shrink-0 transition-colors ${
                      isPassed ? 'text-indigo-400' : 'text-slate-300'
                    }`}
                  />
                )}

                <button
                  type="button"
                  onClick={() => onNavigate(stage.targetTab)}
                  title={`${stage.number}. Aşama: ${stage.label} (${stage.description})`}
                  className={`flex items-center gap-1 xl:gap-1.5 px-2 xl:px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer group ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 scale-[1.01]'
                      : isPassed
                      ? 'bg-indigo-50/80 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/60'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] xl:text-[10px] font-black shrink-0 ${
                      isCurrent
                        ? 'bg-white/20 text-white'
                        : isPassed
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isPassed && !isCurrent ? '✓' : stage.number}
                  </span>

                  <Icon
                    className={`w-3 h-3 xl:w-3.5 xl:h-3.5 shrink-0 ${
                      isCurrent ? 'text-white' : isPassed ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />

                  <span className="whitespace-nowrap font-extrabold tracking-tight text-[11px] xl:text-xs">
                    <span className="hidden xl:inline">{stage.label}</span>
                    <span className="xl:hidden">{stage.shortLabel}</span>
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* STATUS BADGE & QUICK LIFECYCLE ACTION */}
        <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0 pt-1.5 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden xl:inline">
              Şantiye Statüsü:
            </span>

            {isOfferAccepted ? (
              <button
                type="button"
                onClick={() => onToggleOfferAccepted(false)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-50 hover:bg-rose-50 text-emerald-800 hover:text-rose-800 border border-emerald-200 hover:border-rose-200 transition-all cursor-pointer shadow-2xs group"
                title="Sözleşme durumunu 'Değerlendirmede' olarak değiştirmek için tıklayın"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse group-hover:bg-rose-600" />
                <span className="group-hover:hidden">Sözleşmeli / Faal Şantiye</span>
                <span className="hidden group-hover:inline">Değerlendirmeye Al?</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onToggleOfferAccepted(true);
                  onNavigate('surec');
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-50 hover:bg-emerald-50 text-amber-800 hover:text-emerald-800 border border-amber-200 hover:border-emerald-200 transition-all cursor-pointer shadow-2xs group"
                title="Teklifi kabul edildi olarak işaretleyip şantiye sürecini başlatın"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600 group-hover:text-emerald-600" />
                <span className="group-hover:hidden">Teklif Değerlendirmede</span>
                <span className="hidden group-hover:inline flex items-center gap-1">
                  Sözleşmeyi İmzala & Başlat <ArrowRight className="w-3 h-3 inline" />
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
