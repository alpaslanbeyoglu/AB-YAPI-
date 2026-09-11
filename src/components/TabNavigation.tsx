import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TabConfig, TabId } from '../config/tabs';

interface TabNavigationProps {
  activeTab: TabId;
  tabs: TabConfig[];
  onNavigate: (tabId: TabId) => void;
  theme: 'light' | 'gray';
}

export const TabNavigation: React.FC<TabNavigationProps> = React.memo(({
  activeTab,
  tabs,
  onNavigate,
  theme,
}) => {
  const visibleTabs = tabs.filter(t => t.visible).sort((a, b) => a.order - b.order);
  const currentIndex = visibleTabs.findIndex(t => t.id === activeTab);
  
  if (currentIndex === -1) return null;

  const prevTab = currentIndex > 0 ? visibleTabs[currentIndex - 1] : null;
  const nextTab = currentIndex < visibleTabs.length - 1 ? visibleTabs[currentIndex + 1] : null;

  const isGray = theme === 'gray';

  return (
    <div className={`mt-8 mb-4 pt-6 border-t flex items-center justify-between gap-2 print:hidden w-full max-w-full overflow-hidden ${
      isGray ? 'border-slate-300' : 'border-slate-200'
    }`}>
      <div className="shrink min-w-0">
        {prevTab && (
          <button
            type="button"
            onClick={() => onNavigate(prevTab.id)}
            className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl border transition-all hover:-translate-x-1 group max-w-[160px] sm:max-w-xs cursor-pointer active:scale-95 ${
              isGray
                ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
            <div className="text-left min-w-0">
              <span className="block text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Önceki</span>
              <span className="block text-xs sm:text-[13px] font-bold text-slate-800 truncate">{prevTab.label.replace(/^\d+\.\s*/, '')}</span>
            </div>
          </button>
        )}
      </div>

      <div className="hidden md:flex flex-col items-center shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Süreç İlerleme</span>
        </div>
        <div className="text-xs font-bold text-slate-600">
          Adım {currentIndex + 1} / {visibleTabs.length}
        </div>
      </div>

      <div className="shrink min-w-0">
        {nextTab && (
          <button
            type="button"
            onClick={() => onNavigate(nextTab.id)}
            className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl border transition-all hover:translate-x-1 group max-w-[160px] sm:max-w-xs cursor-pointer active:scale-95 ${
              isGray
                ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700'
                : 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700 shadow-md shadow-indigo-600/20'
            }`}
          >
            <div className="text-right min-w-0">
              <span className="block text-[8px] sm:text-[9px] uppercase tracking-widest text-indigo-200 font-bold mb-0.5">Sonraki</span>
              <span className="block text-xs sm:text-[13px] font-bold truncate">{nextTab.label.replace(/^\d+\.\s*/, '')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-indigo-200 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
});

TabNavigation.displayName = 'TabNavigation';
