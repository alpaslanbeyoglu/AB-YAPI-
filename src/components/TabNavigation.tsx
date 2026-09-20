import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TabConfig, TabId } from '../config/tabs';

interface TabNavigationProps {
  activeTab: TabId;
  tabs: TabConfig[];
  onNavigate: (tabId: TabId) => void;
  theme: 'light' | 'gray';
  internalStep?: number;
  totalInternalSteps?: number;
  stepLabels?: string[];
  onInternalStepChange?: (step: number) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = React.memo(({
  activeTab,
  tabs,
  onNavigate,
  theme,
  internalStep,
  totalInternalSteps,
  stepLabels,
  onInternalStepChange,
}) => {
  const visibleTabs = tabs.filter(t => t.visible).sort((a, b) => a.order - b.order);
  const currentIndex = visibleTabs.findIndex(t => t.id === activeTab);
  
  if (currentIndex === -1) return null;

  const isGray = theme === 'gray';

  // Wizard logic: If we are in an internal step and not at the boundaries, we navigate internally.
  const isInternal = internalStep !== undefined && totalInternalSteps !== undefined && onInternalStepChange;
  
  const handlePrev = () => {
    if (isInternal && internalStep > 1) {
      onInternalStepChange(internalStep - 1);
    } else {
      const prevTab = currentIndex > 0 ? visibleTabs[currentIndex - 1] : null;
      if (prevTab) onNavigate(prevTab.id);
    }
  };

  const handleNext = () => {
    if (isInternal && internalStep < totalInternalSteps) {
      onInternalStepChange(internalStep + 1);
    } else {
      const nextTab = currentIndex < visibleTabs.length - 1 ? visibleTabs[currentIndex + 1] : null;
      if (nextTab) onNavigate(nextTab.id);
    }
  };

  const prevTab = currentIndex > 0 ? visibleTabs[currentIndex - 1] : null;
  const nextTab = currentIndex < visibleTabs.length - 1 ? visibleTabs[currentIndex + 1] : null;

  const showPrev = (isInternal && internalStep > 1) || prevTab;
  const showNext = (isInternal && internalStep < totalInternalSteps) || nextTab;

  const prevLabel = (isInternal && internalStep > 1) 
    ? (stepLabels?.[internalStep - 2] ? `${stepLabels[internalStep - 2]}` : `Adım ${internalStep - 1}`)
    : (prevTab ? prevTab.shortLabel : '');
    
  const nextLabel = (isInternal && internalStep < totalInternalSteps)
    ? (stepLabels?.[internalStep] ? `${stepLabels[internalStep]}` : `Adım ${internalStep + 1}`)
    : (nextTab ? nextTab.shortLabel : '');

  return (
    <div className={`mt-auto pt-8 pb-10 border-t flex items-center justify-between gap-4 print:hidden w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${
      isGray ? 'border-slate-300' : 'border-slate-200'
    }`}>
      <div className="shrink min-w-0">
        {showPrev && (
          <button
            type="button"
            onClick={handlePrev}
            className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-2xl border transition-all hover:-translate-x-1 group min-w-[120px] sm:min-w-[200px] cursor-pointer active:scale-95 ${
              isGray
                ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
            <div className="text-left min-w-0">
              <span className="block text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">
                {isInternal && internalStep > 1 ? 'Geri Dön' : 'Önceki Sekme'}
              </span>
              <span className="block text-xs sm:text-[14px] font-bold text-slate-800 truncate">{prevLabel}</span>
            </div>
          </button>
        )}
      </div>

      <div className="hidden md:flex flex-col items-center shrink-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`w-2 h-2 rounded-full animate-pulse ${isInternal ? 'bg-amber-500' : 'bg-indigo-500'}`} />
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
            {isInternal ? 'Kurulum Aşaması' : 'Genel Süreç'}
          </span>
        </div>
        {isInternal && totalInternalSteps ? (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalInternalSteps }).map((_, idx) => {
                const stepNum = idx + 1;
                const isPast = stepNum < internalStep;
                const isCurr = stepNum === internalStep;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onInternalStepChange && onInternalStepChange(stepNum)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      isCurr
                        ? 'w-6 bg-indigo-600'
                        : isPast
                        ? 'w-2 bg-indigo-300 hover:bg-indigo-400'
                        : 'w-2 bg-slate-200 hover:bg-slate-300'
                    }`}
                    title={`Adım ${stepNum}: ${stepLabels?.[idx] || ''}`}
                  />
                );
              })}
            </div>
            <span className="text-[11px] font-bold text-slate-700">
              {stepLabels?.[internalStep - 1] ? `${internalStep}. ${stepLabels[internalStep - 1]}` : `${internalStep} / ${totalInternalSteps}`}
            </span>
          </div>
        ) : (
          <div className="text-sm font-black text-slate-700 font-mono">
            {currentIndex + 1} / {visibleTabs.length}
          </div>
        )}
      </div>

      <div className="shrink min-w-0">
        {showNext && (
          <button
            type="button"
            onClick={handleNext}
            className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-2xl border transition-all hover:translate-x-1 group min-w-[120px] sm:min-w-[200px] cursor-pointer active:scale-95 ${
              isGray
                ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700'
                : 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700 shadow-md shadow-indigo-600/20'
            }`}
          >
            <div className="text-right min-w-0">
              <span className="block text-[8px] sm:text-[9px] uppercase tracking-widest text-indigo-200 font-bold mb-0.5">
                {isInternal && internalStep < totalInternalSteps ? 'Sıradaki Adım' : 'Sonraki Sekme'}
              </span>
              <span className="block text-xs sm:text-[14px] font-bold truncate">{nextLabel}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-indigo-200 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
});

TabNavigation.displayName = 'TabNavigation';
