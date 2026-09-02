import React, { useState } from 'react';
import {
  Compass,
  Box,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Maximize2,
  Building2,
  Users,
  Layers,
  Ruler,
} from 'lucide-react';
import { BuildingModelParams, ProjectParams } from '../types';
import { calculateBuildingMetrics } from '../utils/buildingModelUtils';
import { FloorPlan2DView } from './FloorPlan2DView';
import { Logo } from './Logo';

interface FloorPlanTabProps {
  params: BuildingModelParams;
  onUpdateParams: (updates: Partial<BuildingModelParams>) => void;
  onSyncWithCalculator?: (newParams: Partial<ProjectParams>) => void;
  onNavigateToCalculator?: () => void;
  onNavigateToModel?: () => void;
  theme?: 'light' | 'dark';
}

export const FloorPlanTab: React.FC<FloorPlanTabProps> = ({
  params,
  onUpdateParams,
  onSyncWithCalculator,
  onNavigateToCalculator,
  onNavigateToModel,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [syncedFeedback, setSyncedFeedback] = useState<string | null>(null);

  const metrics = calculateBuildingMetrics(params);

  // Sync to calculation engine
  const handleSyncToCalculator = () => {
    if (onSyncWithCalculator) {
      onSyncWithCalculator({
        baseBuildArea: Math.round(metrics.footprintArea),
        floorCount: params.floorCount,
        flatCount: metrics.totalFlats,
      });
      setSyncedFeedback(
        `Taban Alanı (${metrics.footprintArea} m²), ${params.floorCount} Kat ve ${metrics.totalFlats} Daire ana hesaplama tablosuna başarıyla aktarıldı!`
      );
      setTimeout(() => setSyncedFeedback(null), 4000);
    }
  };

  const cardBg = isLight
    ? 'bg-white border-slate-200 shadow-sm'
    : 'bg-[#121214] border-zinc-800 shadow-xl';
  const subCardBg = isLight
    ? 'bg-slate-50 border-slate-200 text-slate-800'
    : 'bg-[#18181b] border-zinc-700/80 text-zinc-200';
  const textMuted = isLight ? 'text-slate-500' : 'text-zinc-400';
  const textTitle = isLight ? 'text-slate-900' : 'text-white';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Feedback Toast */}
      {syncedFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-lg animate-fade-in ${
            isLight
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-semibold">{syncedFeedback}</span>
          </div>
          {onNavigateToCalculator && (
            <button
              type="button"
              onClick={onNavigateToCalculator}
              className={`inline-flex items-center gap-1.5 font-bold underline ${
                isLight ? 'text-emerald-700 hover:text-emerald-900' : 'text-emerald-200 hover:text-white'
              }`}
            >
              <span>Hesaplama Tablosuna Git</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Top Header Bento Card */}
      <div
        className={`border rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${cardBg}`}
      >
        <div className="flex items-center gap-3.5">
          <Logo size="md" variant="icon" theme={theme} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-lg font-bold leading-tight ${textTitle}`}>
                2D Mimari Kat Planı
              </h2>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  isLight
                    ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                    : 'bg-cyan-950/60 text-cyan-300 border-cyan-800/80'
                }`}
              >
                Vektörel Çizim
              </span>
            </div>
            <p className={`text-xs mt-1 ${textMuted}`}>
              İnce profesyonel mimari duvarlar, daire başına net/brüt alanlar, DXF & SVG dışa aktarım
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {onNavigateToModel && (
            <button
              type="button"
              onClick={onNavigateToModel}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-indigo-400" />
              <span>3D Modele Geç</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSyncToCalculator}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all active:scale-95 shrink-0"
            title="Bu ölçüleri ana inşaat maliyet tablosuna aktar"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Maliyete Aktar</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`border rounded-3xl p-4 text-center ${cardBg}`}>
          <span className={`text-[11px] block font-medium ${textMuted}`}>Kat Başına Daire</span>
          <span className="text-xl font-bold text-indigo-500 font-mono mt-0.5 block">
            {params.flatsPerFloor} Daire
          </span>
          <span className={`text-[10px] ${textMuted}`}>Tip: {params.roomType}</span>
        </div>

        <div className={`border rounded-3xl p-4 text-center ${cardBg}`}>
          <span className={`text-[11px] block font-medium ${textMuted}`}>Daire Brüt Alanı</span>
          <span className="text-xl font-bold text-emerald-500 font-mono mt-0.5 block">
            ~{metrics.flatGrossArea} m²
          </span>
          <span className={`text-[10px] ${textMuted}`}>Net: ~{metrics.flatNetArea} m²</span>
        </div>

        <div className={`border rounded-3xl p-4 text-center ${cardBg}`}>
          <span className={`text-[11px] block font-medium ${textMuted}`}>Taban Ölçüleri</span>
          <span className="text-xl font-bold text-cyan-500 font-mono mt-0.5 block">
            {params.facadeWidth.toFixed(1)} × {params.facadeDepth.toFixed(1)}m
          </span>
          <span className={`text-[10px] ${textMuted}`}>{metrics.footprintArea} m² Taban</span>
        </div>

        <div className={`border rounded-3xl p-4 text-center ${cardBg}`}>
          <span className={`text-[11px] block font-medium ${textMuted}`}>Toplam Daire (Bina)</span>
          <span className="text-xl font-bold text-amber-500 font-mono mt-0.5 block">
            {metrics.totalFlats} Daire
          </span>
          <span className={`text-[10px] ${textMuted}`}>{params.floorCount} Normal Kat</span>
        </div>
      </div>

      {/* 2D Plan View Component */}
      <FloorPlan2DView
        params={params}
        theme={theme}
        onUpdateParams={onUpdateParams}
      />
    </div>
  );
};
