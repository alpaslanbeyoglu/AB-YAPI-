import React from 'react';
import { Loader2 } from 'lucide-react';
import { AppTheme } from '../types';

interface TabLoadingSkeletonProps {
  theme?: AppTheme;
  title?: string;
}

export const TabLoadingSkeleton: React.FC<TabLoadingSkeletonProps> = ({
  theme = 'light',
  title = 'Modül yükleniyor...'
}) => {
  const isGray = theme === 'gray';

  return (
    <div
      id="tab-loading-skeleton"
      className={`w-full min-h-[360px] rounded-3xl border p-8 flex flex-col items-center justify-center gap-4 transition-colors animate-pulse ${
        isGray
          ? 'bg-white/70 border-slate-300'
          : 'bg-white/80 border-slate-200 shadow-xs'
      }`}
    >
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-xs">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
      <div className="text-center space-y-1.5">
        <h4 className="text-sm font-bold text-slate-800 tracking-tight">
          {title}
        </h4>
        <p className="text-xs text-slate-500 max-w-sm">
          Gerekli bileşen ve veriler optimize edilerek hazırlanıyor...
        </p>
      </div>

      {/* Subtle skeleton bars */}
      <div className="w-full max-w-md space-y-2 mt-2">
        <div className="h-3 bg-slate-100 rounded-full w-3/4 mx-auto" />
        <div className="h-2.5 bg-slate-100/80 rounded-full w-1/2 mx-auto" />
      </div>
    </div>
  );
};
