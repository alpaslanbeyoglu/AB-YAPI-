import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TabConfig, TabId } from '../config/tabs';

interface TabNavigationProps {
  activeTab: TabId;
  tabs: TabConfig[];
  onNavigate: (tabId: TabId) => void;
  theme: 'light' | 'gray';
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
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
    <div className={`mt-8 mb-4 pt-4 border-t flex items-center justify-between print:hidden ${
      isGray ? 'border-slate-300' : 'border-slate-200'
    }`}>
      <div>
        {prevTab && (
          <button
            onClick={() => onNavigate(prevTab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all hover:-translate-x-1 ${
              isGray
                ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <div className="text-left">
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Önceki</span>
              <span className="block text-sm font-bold text-slate-800">{prevTab.label.replace(/^\d+\.\s*/, '')}</span>
            </div>
          </button>
        )}
      </div>

      <div>
        {nextTab && (
          <button
            onClick={() => onNavigate(nextTab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all hover:translate-x-1 ${
              isGray
                ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700'
                : 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700'
            }`}
          >
            <div className="text-right">
              <span className="block text-[10px] uppercase tracking-wider text-indigo-200 font-semibold">Sonraki</span>
              <span className="block text-sm font-bold">{nextTab.label.replace(/^\d+\.\s*/, '')}</span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
