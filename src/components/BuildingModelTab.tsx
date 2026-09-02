import React, { useState } from 'react';
import {
  Box,
  Compass,
  Layers,
  Ruler,
  Maximize2,
  Building2,
  Sliders,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Eye,
  Armchair,
  Home,
  Check,
  Building,
  Grid,
} from 'lucide-react';
import { BuildingModelParams, ProjectParams, RoomType, RoofType } from '../types';
import {
  DEFAULT_BUILDING_PARAMS,
  calculateBuildingMetrics,
} from '../utils/buildingModelUtils';
import { ThreeBuildingView } from './ThreeBuildingView';
import { FloorPlan2DView } from './FloorPlan2DView';
import { Logo } from './Logo';

interface BuildingModelTabProps {
  params?: BuildingModelParams;
  onUpdateParams?: (updates: Partial<BuildingModelParams>) => void;
  onSyncWithCalculator?: (newParams: Partial<ProjectParams>) => void;
  onNavigateToCalculator?: () => void;
  onNavigateToFloorPlan?: () => void;
  theme?: 'light' | 'dark';
}

export const BuildingModelTab: React.FC<BuildingModelTabProps> = ({
  params: propParams,
  onUpdateParams,
  onSyncWithCalculator,
  onNavigateToCalculator,
  onNavigateToFloorPlan,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  // Building Model Parameters (local state if not provided from parent)
  const [internalModelParams, setInternalModelParams] = useState<BuildingModelParams>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_building_model');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_BUILDING_PARAMS;
  });

  const modelParams = propParams || internalModelParams;

  // Active subview: 3D Model vs 2D Floor Plan
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [syncedFeedback, setSyncedFeedback] = useState<string | null>(null);

  // Save to local storage on change
  const updateParams = (updates: Partial<BuildingModelParams>) => {
    if (onUpdateParams) {
      onUpdateParams(updates);
    } else {
      setInternalModelParams((prev) => {
        const next = { ...prev, ...updates };
        try {
          localStorage.setItem('ab_yapi_building_model', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    }
  };

  const metrics = calculateBuildingMetrics(modelParams);

  // Sync dimensions to main calculation engine
  const handleSyncToCalculator = () => {
    if (onSyncWithCalculator) {
      onSyncWithCalculator({
        baseBuildArea: Math.round(metrics.footprintArea),
        floorCount: modelParams.floorCount,
        flatCount: metrics.totalFlats,
      });
      setSyncedFeedback(
        `Taban Alanı (${metrics.footprintArea} m²), ${modelParams.floorCount} Kat ve ${metrics.totalFlats} Daire ana hesaplama tablosuna başarıyla aktarıldı!`
      );
      setTimeout(() => setSyncedFeedback(null), 4000);
    }
  };

  // Common card style based on theme
  const cardBg = isLight
    ? 'bg-white border-slate-200 shadow-sm'
    : 'bg-[#121214] border-zinc-800 shadow-xl';
  const subCardBg = isLight
    ? 'bg-slate-50 border-slate-200 text-slate-800'
    : 'bg-[#18181b] border-zinc-700/80 text-zinc-200';
  const textMuted = isLight ? 'text-slate-500' : 'text-zinc-400';
  const textTitle = isLight ? 'text-slate-900' : 'text-white';
  const inputBg = isLight
    ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600'
    : 'bg-[#18181b] border-zinc-700 text-white focus:border-indigo-500';

  return (
    <div className="space-y-6">
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

      {/* Top Header & View Switcher Bento Card */}
      <div
        className={`border rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${cardBg}`}
      >
        <div className="flex items-center gap-3.5">
          <Logo size="md" variant="icon" theme={theme} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-lg font-bold leading-tight ${textTitle}`}>
                3D Yapı Modeli & Mimari Kat Planı
              </h2>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  isLight
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/80'
                }`}
              >
                İç Mekan & Odalar
              </span>
            </div>
            <p className={`text-xs mt-1 ${textMuted}`}>
              Manuel ölçü girişi, iç mekan odaları, dubleks & mansart çatı simülasyonu
            </p>
          </div>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end flex-wrap">
          {onNavigateToFloorPlan && (
            <button
              type="button"
              onClick={onNavigateToFloorPlan}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
              }`}
              title="Ayrı 2D Kat Planı sekmesine git"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-500" />
              <span>2D Kat Planı Sekmesi</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </button>
          )}

          <div className={`flex items-center p-1 rounded-2xl border ${subCardBg}`}>
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === '3d'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Box className="w-4 h-4" />
              <span>3D Model</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === '2d'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>2D Çizim</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSyncToCalculator}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all active:scale-95 shrink-0"
            title="Bu ölçüleri ana inşaat maliyet tablosuna aktar"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Maliyete Aktar</span>
          </button>
        </div>
      </div>

      {/* Instant Summary Metrics Bento Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className={`border rounded-3xl p-4 text-center ${cardBg}`}>
          <span className={`text-[11px] font-medium block mb-1 ${textMuted}`}>Taban Alanı</span>
          <span className={`text-xl font-bold font-mono ${textTitle}`}>{metrics.footprintArea}</span>
          <span className={`text-xs ml-1 ${textMuted}`}>m²</span>
        </div>

        <div className={`border rounded-3xl p-4 text-center ${cardBg}`}>
          <span className={`text-[11px] font-medium block mb-1 ${textMuted}`}>Toplam İnşaat Alanı</span>
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
            {metrics.totalBuiltArea}
          </span>
          <span className={`text-xs ml-1 ${textMuted}`}>m²</span>
        </div>

        <div className={`border rounded-3xl p-4 text-center ${cardBg}`}>
          <span className={`text-[11px] font-medium block mb-1 ${textMuted}`}>Bina Yüksekliği (H)</span>
          <span className={`text-xl font-bold font-mono ${textTitle}`}>{metrics.totalHeight}</span>
          <span className={`text-xs ml-1 ${textMuted}`}>m</span>
        </div>

        <div className={`border rounded-3xl p-4 text-center ${cardBg}`}>
          <span className={`text-[11px] font-medium block mb-1 ${textMuted}`}>Daire Net Alanı</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            ~{metrics.flatNetArea}
          </span>
          <span className={`text-xs ml-1 ${textMuted}`}>m²</span>
        </div>

        <div className={`border rounded-3xl p-4 text-center col-span-2 sm:col-span-1 ${cardBg}`}>
          <span className={`text-[11px] font-medium block mb-1 ${textMuted}`}>Merdiven & Asansör</span>
          <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
            {metrics.coreArea}
          </span>
          <span className={`text-xs ml-1 ${textMuted}`}>m²</span>
        </div>
      </div>

      {/* Main Content Layout: Left Controls Form & Right Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Dimension Inputs Form (Bento Cards) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: 3D Görünüm Modu & Odalar (Solid / X-Ray / Cutaway) */}
          <div className={`border rounded-3xl p-5 space-y-3.5 ${cardBg}`}>
            <div className="flex items-center justify-between pb-2 border-b border-inherit">
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${textTitle}`}>
                <Eye className="w-4 h-4 text-indigo-500" />
                <span>3D Görünüm & İç Mekan</span>
              </h3>
              <span className={`text-[10px] ${textMuted}`}>X-Ray & Kesit</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => updateParams({ interiorCutMode: 'solid' })}
                className={`py-2 px-1 text-center rounded-xl text-[11px] font-semibold border transition-all ${
                  modelParams.interiorCutMode === 'solid' || !modelParams.interiorCutMode
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : isLight
                    ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    : 'bg-[#18181b] text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                🏢 Dış Cephe
              </button>
              <button
                type="button"
                onClick={() => updateParams({ interiorCutMode: 'xray' })}
                className={`py-2 px-1 text-center rounded-xl text-[11px] font-semibold border transition-all ${
                  modelParams.interiorCutMode === 'xray'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : isLight
                    ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    : 'bg-[#18181b] text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                🔍 Odalar (X-Ray)
              </button>
              <button
                type="button"
                onClick={() => updateParams({ interiorCutMode: 'cutaway' })}
                className={`py-2 px-1 text-center rounded-xl text-[11px] font-semibold border transition-all ${
                  modelParams.interiorCutMode === 'cutaway'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : isLight
                    ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    : 'bg-[#18181b] text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                📐 Açık Kesit
              </button>
            </div>

            {/* Furniture toggle */}
            <div className="flex items-center justify-between pt-1">
              <label className={`text-xs font-medium flex items-center gap-1.5 ${textTitle}`}>
                <Armchair className="w-3.5 h-3.5 text-indigo-500" />
                <span>3D Mobilyaları & Donatıları Göster:</span>
              </label>
              <input
                type="checkbox"
                checked={modelParams.showFurniture}
                onChange={(e) => updateParams({ showFurniture: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Card 2: Facade & Building Dimensions (Dual Slider + Manual Number Input) */}
          <div className={`border rounded-3xl p-5 space-y-4 ${cardBg}`}>
            <div className="flex items-center justify-between pb-2 border-b border-inherit">
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${textTitle}`}>
                <Ruler className="w-4 h-4 text-indigo-500" />
                <span>1. Bina ve Cephe Ölçüleri</span>
              </h3>
              <span className={`text-[10px] font-mono ${textMuted}`}>Metre (m)</span>
            </div>

            {/* Facade Width: Dual Slider & Manual Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className={`font-semibold ${textTitle}`}>Ön Cephe (Genişlik):</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    min="6"
                    max="60"
                    value={modelParams.facadeWidth}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) updateParams({ facadeWidth: val });
                    }}
                    className={`w-20 px-2 py-1 text-right font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                  />
                  <span className={`text-xs font-medium ${textMuted}`}>m</span>
                </div>
              </div>
              <input
                type="range"
                min="8"
                max="40"
                step="0.5"
                value={modelParams.facadeWidth}
                onChange={(e) => updateParams({ facadeWidth: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className={`flex justify-between text-[10px] ${textMuted}`}>
                <span>8.0 m</span>
                <span>24.0 m</span>
                <span>40.0 m</span>
              </div>
            </div>

            {/* Facade Depth: Dual Slider & Manual Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className={`font-semibold ${textTitle}`}>Yan Cephe (Derinlik):</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    min="6"
                    max="60"
                    value={modelParams.facadeDepth}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) updateParams({ facadeDepth: val });
                    }}
                    className={`w-20 px-2 py-1 text-right font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                  />
                  <span className={`text-xs font-medium ${textMuted}`}>m</span>
                </div>
              </div>
              <input
                type="range"
                min="8"
                max="40"
                step="0.5"
                value={modelParams.facadeDepth}
                onChange={(e) => updateParams({ facadeDepth: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className={`flex justify-between text-[10px] ${textMuted}`}>
                <span>8.0 m</span>
                <span>24.0 m</span>
                <span>40.0 m</span>
              </div>
            </div>

            {/* Floor Height: Dual Slider & Manual Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className={`font-semibold ${textTitle}`}>Kat Yüksekliği (H):</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.05"
                    min="2.4"
                    max="4.5"
                    value={modelParams.floorHeight}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) updateParams({ floorHeight: val });
                    }}
                    className={`w-20 px-2 py-1 text-right font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                  />
                  <span className={`text-xs font-medium ${textMuted}`}>m</span>
                </div>
              </div>
              <input
                type="range"
                min="2.60"
                max="3.60"
                step="0.05"
                value={modelParams.floorHeight}
                onChange={(e) => updateParams({ floorHeight: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className={`flex justify-between text-[10px] ${textMuted}`}>
                <span>2.60 m</span>
                <span>2.95 m (Standart)</span>
                <span>3.60 m</span>
              </div>
            </div>

            {/* Balcony Depth */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className={`font-semibold ${textTitle}`}>Balkon Çıkması Payı:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="3.0"
                    value={modelParams.balconyDepth}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0) updateParams({ balconyDepth: val });
                    }}
                    className={`w-20 px-2 py-1 text-right font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                  />
                  <span className={`text-xs font-medium ${textMuted}`}>m</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="2.5"
                step="0.1"
                value={modelParams.balconyDepth}
                onChange={(e) => updateParams({ balconyDepth: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Card 3: Floor Counts & Flat Types */}
          <div className={`border rounded-3xl p-5 space-y-4 ${cardBg}`}>
            <div className="flex items-center justify-between pb-2 border-b border-inherit">
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${textTitle}`}>
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>2. Kat ve Daire Tipolojisi</span>
              </h3>
            </div>

            {/* Floor counts */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textTitle}`}>Normal Kat:</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateParams({ floorCount: Math.max(1, modelParams.floorCount - 1) })}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={modelParams.floorCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1) updateParams({ floorCount: val });
                    }}
                    className={`w-full text-center py-1.5 font-bold font-mono text-xs rounded-lg border ${inputBg}`}
                  />
                  <button
                    type="button"
                    onClick={() => updateParams({ floorCount: modelParams.floorCount + 1 })}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textTitle}`}>Bodrum Kat:</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateParams({ basementCount: Math.max(0, modelParams.basementCount - 1) })}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={modelParams.basementCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 0) updateParams({ basementCount: val });
                    }}
                    className={`w-full text-center py-1.5 font-bold font-mono text-xs rounded-lg border ${inputBg}`}
                  />
                  <button
                    type="button"
                    onClick={() => updateParams({ basementCount: modelParams.basementCount + 1 })}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Flats per floor */}
            <div className="space-y-1.5">
              <label className={`text-xs font-semibold block ${textTitle}`}>Katta Daire Sayısı:</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => updateParams({ flatsPerFloor: num })}
                    className={`py-2 text-center rounded-xl text-xs font-semibold border transition-all ${
                      modelParams.flatsPerFloor === num
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : isLight
                        ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        : 'bg-[#18181b] text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                    }`}
                  >
                    {num} Daire
                  </button>
                ))}
              </div>
            </div>

            {/* Room Type */}
            <div className="space-y-1.5">
              <label className={`text-xs font-semibold block ${textTitle}`}>Daire Oda Tipolojisi:</label>
              <div className="grid grid-cols-4 gap-2">
                {(['1+1', '2+1', '3+1', '4+1'] as RoomType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateParams({ roomType: type })}
                    className={`py-2 text-center rounded-xl text-xs font-semibold border transition-all ${
                      modelParams.roomType === type
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : isLight
                        ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        : 'bg-[#18181b] text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 4: Roof Types with Mansard & Duplex Penthouse */}
          <div className={`border rounded-3xl p-5 space-y-3.5 ${cardBg}`}>
            <div className="flex items-center justify-between pb-2 border-b border-inherit">
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${textTitle}`}>
                <Home className="w-4 h-4 text-indigo-500" />
                <span>3. Çatı & Dubleks Seçenekleri</span>
              </h3>
              <span className={`text-[10px] ${textMuted}`}>4 Tip Mimari</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateParams({ roofType: 'gable' })}
                className={`p-2.5 rounded-2xl text-left border transition-all ${
                  modelParams.roofType === 'gable'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                    : isLight
                    ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    : 'bg-[#18181b] text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                <span className="font-bold text-xs block">🏠 Kırma Çatı</span>
                <span className="text-[10px] opacity-80 block mt-0.5">Klasik 4 eğimli kiremit çatı</span>
              </button>

              <button
                type="button"
                onClick={() => updateParams({ roofType: 'flat' })}
                className={`p-2.5 rounded-2xl text-left border transition-all ${
                  modelParams.roofType === 'flat'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                    : isLight
                    ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    : 'bg-[#18181b] text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                <span className="font-bold text-xs block">🏙️ Düz Teras</span>
                <span className="text-[10px] opacity-80 block mt-0.5">Parapetli modern teras çatı</span>
              </button>

              <button
                type="button"
                onClick={() => updateParams({ roofType: 'mansard' })}
                className={`p-2.5 rounded-2xl text-left border transition-all ${
                  modelParams.roofType === 'mansard'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                    : isLight
                    ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    : 'bg-[#18181b] text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                <span className="font-bold text-xs block">🏛️ Mansart Çatı</span>
                <span className="text-[10px] opacity-80 block mt-0.5">Fransız çatı & güvercinlik pencereli</span>
              </button>

              <button
                type="button"
                onClick={() => updateParams({ roofType: 'duplex' })}
                className={`p-2.5 rounded-2xl text-left border transition-all ${
                  modelParams.roofType === 'duplex'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                    : isLight
                    ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    : 'bg-[#18181b] text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                <span className="font-bold text-xs block">🌟 Çatı Dubleksi</span>
                <span className="text-[10px] opacity-80 block mt-0.5">Dubleks daire & çatı terası</span>
              </button>
            </div>
          </div>

          {/* Card 5: Staircase & Elevator Core (Merdiven ve Asansör) */}
          <div className={`border rounded-3xl p-5 space-y-4 ${cardBg}`}>
            <div className="flex items-center justify-between pb-2 border-b border-inherit">
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${textTitle}`}>
                <Building className="w-4 h-4 text-indigo-500" />
                <span>4. Merdiven & Asansör Şaftı</span>
              </h3>
              <span className={`text-[10px] ${textMuted}`}>Kuyu Ölçüleri</span>
            </div>

            {/* Stair Width & Depth */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textTitle}`}>Merdiven Genişliği:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.05"
                    min="1.8"
                    max="4.5"
                    value={modelParams.stairWidth}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) updateParams({ stairWidth: val });
                    }}
                    className={`w-full px-2 py-1 font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                  />
                  <span className={`text-xs ${textMuted}`}>m</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textTitle}`}>Merdiven Derinliği:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.05"
                    min="3.0"
                    max="7.0"
                    value={modelParams.stairDepth}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) updateParams({ stairDepth: val });
                    }}
                    className={`w-full px-2 py-1 font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                  />
                  <span className={`text-xs ${textMuted}`}>m</span>
                </div>
              </div>
            </div>

            {/* Elevator Width & Depth */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textTitle}`}>Asansör Genişliği:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.05"
                    min="1.2"
                    max="3.0"
                    value={modelParams.elevatorWidth}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) updateParams({ elevatorWidth: val });
                    }}
                    className={`w-full px-2 py-1 font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                  />
                  <span className={`text-xs ${textMuted}`}>m</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textTitle}`}>Asansör Derinliği:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.05"
                    min="1.4"
                    max="3.5"
                    value={modelParams.elevatorDepth}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) updateParams({ elevatorDepth: val });
                    }}
                    className={`w-full px-2 py-1 font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                  />
                  <span className={`text-xs ${textMuted}`}>m</span>
                </div>
              </div>
            </div>

            {/* Facade Material Style */}
            <div className="space-y-1.5 pt-1">
              <label className={`text-xs font-semibold block ${textTitle}`}>Dış Cephe Tasarım Stili:</label>
              <select
                value={modelParams.facadeStyle}
                onChange={(e) => updateParams({ facadeStyle: e.target.value as any })}
                className={`w-full px-3 py-2 rounded-xl text-xs font-medium border focus:outline-hidden ${inputBg}`}
              >
                <option value="wood_anthracite">Ahşap & Antrasit Modern Kompozit</option>
                <option value="modern">Açık Gri & İndigo Geometrik</option>
                <option value="glass_minimal">Minimalist Cam & Alüminyum</option>
                <option value="brick_stone">Tuğla Doku & Doğal Taş Dokunuşu</option>
              </select>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 3D Model Canvas OR 2D Architectural Floor Plan */}
        <div className="lg:col-span-8 space-y-4">
          {viewMode === '3d' ? (
            <ThreeBuildingView params={modelParams} theme={theme} />
          ) : (
            <FloorPlan2DView params={modelParams} theme={theme} />
          )}

          {/* Informational Technical Note */}
          <div
            className={`border rounded-2xl p-4 text-xs flex items-start gap-3 ${
              isLight
                ? 'bg-indigo-50/50 border-indigo-200/70 text-slate-700'
                : 'bg-indigo-950/20 border-indigo-900/40 text-zinc-300'
            }`}
          >
            <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className={`font-bold ${textTitle}`}>
                AB YAPI İnşaat ve Mimari Hesap Modeli
              </span>
              <p className={`leading-relaxed ${textMuted}`}>
                Burada girdiğiniz ölçüler (Ön cephe: {modelParams.facadeWidth}m, Yan cephe: {modelParams.facadeDepth}m, Kat: {modelParams.floorCount}, Çatı:{' '}
                {modelParams.roofType === 'duplex'
                  ? 'Çatı Dubleksi'
                  : modelParams.roofType === 'mansard'
                  ? 'Mansart Çatı'
                  : modelParams.roofType === 'gable'
                  ? 'Kırma Çatı'
                  : 'Teras Çatı'}
                ), Türk İmar Yönetmeliği ve Mimarlar Odası standartlarına göre merdiven, asansör, balkon ve iç oda bölmelerini anlık simüle eder.{' '}
                <strong>"Maliyete Aktar"</strong> butonuyla tek tıkla resmi teklif ve hakediş tablolarına bağlanır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
