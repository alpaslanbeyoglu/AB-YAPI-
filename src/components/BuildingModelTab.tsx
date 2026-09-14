import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  ChevronUp,
  Store,
  Plus,
  Trash2,
  Sun,
  MapPin,
  Palette,
  Navigation,
  Milestone,
  Briefcase,
  RotateCcw,
  Info,
  Layout,
  LayoutGrid,
  AlertTriangle,
  DoorOpen,
  Paintbrush
} from 'lucide-react';
import { BuildingModelParams, ProjectParams, RoomType, RoofType, AppTheme, FootprintInputMode, CustomFacadeSide, FacadeDetailConfig, RoadConfig, RoadType } from '../types';
import {
  DEFAULT_BUILDING_PARAMS,
  calculateBuildingMetrics,
  WALL_COLOR_PRESETS,
  ROOF_COLOR_PRESETS,
  ACCENT_COLOR_PRESETS,
  FRAME_COLOR_PRESETS,
  FACADE_STYLES,
  MATERIAL_FINISH_OPTIONS,
  WALL_PATTERN_OPTIONS,
  ROOF_PATTERN_OPTIONS,
  ColorPreset,
} from '../utils/buildingModelUtils';
import {
  calculateFootprint,
  getDefaultCustomFacades,
  POLYGON_PRESETS,
  calculatePolygonArea,
  getPolygonBounds,
  generateFacadeConfigs,
  calculateInteractiveQuadrilateral,
  getPolygonEdges,
  updatePolygonEdgeLength,
  syncPolygonToCustomFacades,
} from '../utils/footprintUtils';

import {
  SolarLocation,
  TURKEY_CITIES,
  SOLAR_SEASONS,
  calculateSolarPosition,
} from '../utils/solarCalculations';
import { ThreeBuildingView } from './ThreeBuildingView';
import { NanoBananaDrawingGenerator } from './NanoBananaDrawingGenerator';
import { InteractiveFootprintCanvas } from './InteractiveFootprintCanvas';
import { SolarAnalysisPanel } from './SolarAnalysisPanel';
import { ZoningAuditPanel } from './ZoningAuditPanel';
import { InteractiveFacadeGeometryPanel } from './InteractiveFacadeGeometryPanel';

interface BuildingModelTabProps {
  params?: BuildingModelParams;
  onUpdateParams?: (updates: Partial<BuildingModelParams>) => void;
  onSyncWithCalculator?: (newParams: Partial<ProjectParams>) => void;
  onNavigateToFloorPlan?: () => void;
  theme?: AppTheme;
}

const ROAD_TYPES_DATA: { id: RoadType; label: string; width: number; color: string }[] = [
  { id: 'street', label: 'Sokak', width: 7, color: '#64748b' },
  { id: 'road', label: 'Yol', width: 12, color: '#475569' },
  { id: 'avenue', label: 'Cadde', width: 20, color: '#334155' },
  { id: 'highway', label: 'Bulvar / Anayol', width: 35, color: '#1e293b' },
];

export const BuildingModelTab: React.FC<BuildingModelTabProps> = ({
  params: propParams,
  onUpdateParams,
  onSyncWithCalculator,
  onNavigateToFloorPlan,
  theme = 'light',
}) => {
  const isGray = theme === 'gray';
  const [selectedEdgeIndex, setSelectedEdgeIndex] = useState<number | null>(null);

  // Building Model Parameters (local state if not provided from parent)
  const [internalModelParams, setInternalModelParams] = useState<BuildingModelParams>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_building_model');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_BUILDING_PARAMS;
  });

  const modelParams = propParams || internalModelParams;

  // Collapsible section for Facade & Roof customization
  const [isAppearanceSectionOpen, setIsAppearanceSectionOpen] = useState<boolean>(true);

  // Active subview: 3D Model vs Solar Exposure vs 2D Floor Plan
  const [viewMode, setViewMode] = useState<'3d' | 'solar' | '2d'>('3d');
  const [syncedFeedback, setSyncedFeedback] = useState<string | null>(null);

  // Auto-sync when propParams change
  React.useEffect(() => {
    if (propParams) {
      setInternalModelParams(prev => ({ ...prev, ...propParams }));
    }
  }, [propParams]);

  // Solar Exposure Simulation States
  const [solarLocation, setSolarLocation] = useState<SolarLocation>(TURKEY_CITIES[0]);
  const [solarSeasonId, setSolarSeasonId] = useState<string>('summer_solstice');
  const [solarTimeHour, setSolarTimeHour] = useState<number>(13.5);
  const [solarBuildingRotation, setSolarBuildingRotation] = useState<number>(0);
  const [isSolarHeatmap, setIsSolarHeatmap] = useState<boolean>(false);
  const [isPlayingSolar, setIsPlayingSolar] = useState<boolean>(false);

  // Continuous play animation for solar simulation
  useEffect(() => {
    if (!isPlayingSolar) return;
    const interval = setInterval(() => {
      setSolarTimeHour((prev) => {
        const next = prev + 0.15;
        if (next > 20.0) return 6.0;
        return Math.round(next * 100) / 100;
      });
    }, 60);

    return () => clearInterval(interval);
  }, [isPlayingSolar]);

  const currentSeasonDay = SOLAR_SEASONS.find(s => s.id === solarSeasonId)?.dayOfYear ?? 172;
  const solarPos = calculateSolarPosition(solarLocation.lat, currentSeasonDay, solarTimeHour);

  // 2. Collapsible accordion states for each individual measurement card
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    viewCut: false,
    dimensions: false,
    generalStructure: false,
    typology: false,
    roof: false,
    roads: false,
    shafts: false,
    entranceCore: false,
    contractorShare: false,
  });

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

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
        hasGroundFloorShop: modelParams.hasGroundFloorShop,
        shopCount: modelParams.shopCount,
        shopHeight: modelParams.shopHeight,
        roofType: modelParams.roofType,
        roomType: modelParams.roomType,
        basementCount: modelParams.basementCount,
        hasCantilever: modelParams.hasCantilever,
        cantileverDepth: modelParams.cantileverDepth,
        cantileverDirection: modelParams.cantileverDirection,
        facadeCantilevers: modelParams.facadeCantilevers,
        facadeWidth: modelParams.facadeWidth,
        facadeDepth: modelParams.facadeDepth,
        flatsPerFloor: modelParams.flatsPerFloor,
        facadeStyle: modelParams.facadeStyle,
        balconyDepth: modelParams.balconyDepth,
      });
      setSyncedFeedback(
        `Taban Alanı (${metrics.footprintArea} m²), Z+${(modelParams.floorCount || 5) - 1} Kat, ${modelParams.roofType === 'duplex' ? 'Çatı Dubleksi' : modelParams.roofType === 'mansard' ? 'Mansart Çatı' : modelParams.roofType === 'flat' ? 'Düz Teras Çatı' : 'Kırma Çatı'} ve ${metrics.totalFlats} Daire ana hesaplama tablosuna aktarıldı!`
      );
      setTimeout(() => setSyncedFeedback(null), 4000);
    }
  };

  // Common card style based on theme (strictly light and gray)
  const cardBg = isGray ? 'bg-slate-100 border-slate-300 shadow-sm' : 'bg-white border-slate-200 shadow-sm';
  const subCardBg = isGray ? 'bg-white/90 border-slate-300 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-800';
  const textMuted = 'text-slate-500';
  const textTitle = 'text-slate-900';
  const inputBg = isGray
    ? 'bg-white border-slate-300 hover:border-slate-400 text-slate-900 focus:border-indigo-600'
    : 'bg-white border-slate-300 hover:border-slate-400 text-slate-900 focus:border-indigo-600';

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {syncedFeedback && (
        <div className="p-4 rounded-2xl border text-xs flex items-center justify-between shadow-sm animate-fade-in bg-emerald-50 border-emerald-300 text-emerald-800">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{syncedFeedback}</span>
          </div>
        </div>
      )}

      {/* Instant Summary Metrics Bento Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Toplam Bağımsız Bölüm Card (Daire + Dükkan) */}
        <div className={`border rounded-3xl p-3.5 text-center ${cardBg}`}>
          <span className={`text-[11px] font-medium block mb-1 ${textMuted}`}>Toplam Bağımsız Bölüm</span>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-xl font-bold text-indigo-700 font-mono">
              {metrics.totalFlats + (modelParams.hasGroundFloorShop ? (modelParams.shopCount || 1) : 0)}
            </span>
            <span className="text-xs font-semibold text-indigo-600">Adet</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium block mt-0.5 truncate">
            {metrics.totalFlats} Daire{modelParams.hasGroundFloorShop ? `, ${modelParams.shopCount || 1} Dükkan` : ''}
          </span>
        </div>

        <div className={`border rounded-3xl p-3.5 text-center ${cardBg}`}>
          <span className={`text-[11px] font-medium block mb-1 ${textMuted}`}>Taban Alanı</span>
          <span className={`text-xl font-bold font-mono ${textTitle}`}>{metrics.footprintArea.toFixed(2)}</span>
          <span className={`text-xs ml-1 ${textMuted}`}>m²</span>
        </div>

        <div className={`border rounded-3xl p-3.5 text-center ${cardBg}`}>
          <span className={`text-[11px] font-medium block mb-1 ${textMuted}`}>Toplam İnşaat Alanı</span>
          <span className="text-xl font-bold text-indigo-600 font-mono">
            {metrics.totalBuiltArea.toFixed(2)}
          </span>
          <span className={`text-xs ml-1 ${textMuted}`}>m²</span>
        </div>

        <div className={`border rounded-3xl p-3.5 text-center ${cardBg}`}>
          <span className={`text-[11px] font-medium block mb-1 ${textMuted}`}>Bina Yüksekliği (H)</span>
          <span className={`text-xl font-bold font-mono ${textTitle}`}>{metrics.totalHeight.toFixed(2)}</span>
          <span className={`text-xs ml-1 ${textMuted}`}>m</span>
        </div>

        <div className={`border rounded-3xl p-3.5 text-center ${cardBg}`}>
          <span className={`text-[11px] font-medium block mb-1 ${textMuted}`}>Daire Net Alanı</span>
          <span className="text-xl font-bold text-emerald-600 font-mono">
            ~{metrics.flatNetArea.toFixed(2)}
          </span>
          <span className={`text-xs ml-1 ${textMuted}`}>m²</span>
        </div>

        <div className={`border rounded-3xl p-3.5 text-center ${cardBg}`}>
          <span className={`text-[11px] font-medium block mb-1 ${textMuted}`}>Merdiven & Asansör</span>
          <span className="text-xl font-bold text-amber-600 font-mono">
            {metrics.coreArea.toFixed(2)}
          </span>
          <span className={`text-xs ml-1 ${textMuted}`}>m²</span>
        </div>
      </div>

      {/* Main Content Layout: Stacked Layout (3D Visualizer Top, Input Cards Below) */}
      <div className="space-y-6">
        {/* TOP SECTION: 3D Model Canvas / Solar Simulation / 2D Floor Plan */}
        <div className="space-y-4">
          <div className={`border rounded-3xl p-5 ${cardBg}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className={`text-sm font-bold ${textTitle}`}>
                    {viewMode === '3d'
                      ? '3D İnteraktif Yapı Modeli'
                      : viewMode === 'solar'
                      ? 'Güneş Alma & Gölge Analizi Simülasyonu'
                      : 'Nano Banana Mimari Çizim & Kat Planı'}
                  </h3>
                </div>

                {/* View Switcher Controls */}
                <div className={`flex items-center p-0.5 rounded-xl border ${subCardBg}`}>
                  <button
                    type="button"
                    onClick={() => setViewMode('3d')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === '3d'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>3D Model</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('solar')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'solar'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                    title="Harita konumu ve cephe yönlerine göre güneş alma simülasyonu"
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Güneş Analizi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('2d')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === '2d'
                        ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Nano Banana Çizim</span>
                  </button>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span>Hesap ile Canlı Senkron</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* 3D Cut mode buttons in top bar */}
                {viewMode === '3d' && (
                  <div className="flex items-center gap-1 p-1 rounded-xl border bg-slate-50 border-slate-200">
                    <button
                      type="button"
                      onClick={() => updateParams({ interiorCutMode: 'solid' })}
                      className={`py-1 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                        modelParams.interiorCutMode === 'solid' || !modelParams.interiorCutMode
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      🏢 Dış
                    </button>
                    <button
                      type="button"
                      onClick={() => updateParams({ interiorCutMode: 'xray' })}
                      className={`py-1 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                        modelParams.interiorCutMode === 'xray'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      🔍 Odalar
                    </button>
                    <button
                      type="button"
                      onClick={() => updateParams({ interiorCutMode: 'cutaway' })}
                      className={`py-1 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                        modelParams.interiorCutMode === 'cutaway'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      📐 Açık Kesit
                    </button>
                  </div>
                )}

                {/* Yüzey / Parsel Rotasyonu Kontrolü */}
                <div className="flex items-center gap-2 p-1 px-2.5 rounded-xl border bg-slate-50 border-slate-200">
                  <div className="flex items-center gap-1.5 py-0.5">
                    <Compass className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">Yüzey Açısı:</span>
                    <input
                      type="range"
                      min="0"
                      max="359"
                      step="1"
                      value={modelParams.surfaceRotation || 0}
                      onChange={(e) => updateParams({ surfaceRotation: parseInt(e.target.value) || 0, buildingRotation: parseInt(e.target.value) || 0 })}
                      className="w-20 sm:w-28 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      title="Yüzey / Parsel Rotasyonu"
                    />
                    <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md min-w-[36px] text-center">
                      {modelParams.surfaceRotation || 0}°
                    </span>
                  </div>
                </div>

                <span className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-xl border ${subCardBg} ${textMuted}`}>
                  Yol İsimleri & Yüzey Rotasyonu Aktif
                </span>
              </div>
            </div>

            {viewMode === '3d' && (
              <div className="space-y-3">
                <ThreeBuildingView
                  params={modelParams}
                  theme={theme}
                  surfaceRotation={modelParams.surfaceRotation || 0}
                  buildingRotation={modelParams.surfaceRotation || 0}
                  onUpdateColors={(colors) => updateParams(colors)}
                  onUpdateBuildingRotation={(rot) => updateParams({ surfaceRotation: rot, buildingRotation: rot })}
                />

                {/* Bina Dış Görünümü & Çatı Renkleri Özelleştirme Paneli (Gizlenebilir / Akordeon) */}
                <div className={`p-4 rounded-2xl border ${subCardBg} shadow-sm transition-all duration-200`}>
                  {/* Başlık & Gizle/Göster Butonu */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-200">
                        <Paintbrush className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                            Bina Dış Görünümü, Malzeme & Desenler
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100/70 text-indigo-700 border border-indigo-200">
                            {MATERIAL_FINISH_OPTIONS.find(f => f.id === (modelParams.materialFinish || 'satin'))?.badge || 'Yarı Mat'} · {WALL_PATTERN_OPTIONS.find(p => p.id === (modelParams.wallPattern || 'smooth'))?.badge || 'Düz Sıva'}
                          </span>
                        </div>
                        <p className={`text-[10px] ${textMuted}`}>
                          Mat/parlak malzeme simülasyonu, dış cephe/çatı doku desenleri ve mimari renk paleti
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Gizle / Göster Butonu */}
                      <button
                        type="button"
                        onClick={() => setIsAppearanceSectionOpen(!isAppearanceSectionOpen)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 transition-all flex items-center gap-1.5 shadow-2xs"
                      >
                        {isAppearanceSectionOpen ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                            <span>Bölümü Gizle</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="text-indigo-600">Özelleştir / Göster</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Kapalı Durum Özeti (Collapsed State Summary) */}
                  {!isAppearanceSectionOpen && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-2 animate-fade-in">
                      <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap">
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-slate-800">Yüzey:</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700">
                            {MATERIAL_FINISH_OPTIONS.find(f => f.id === (modelParams.materialFinish || 'satin'))?.title || 'Yarı Mat (Saten)'}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-slate-800">Cephe Dokusu:</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700">
                            {WALL_PATTERN_OPTIONS.find(p => p.id === (modelParams.wallPattern || 'smooth'))?.title || 'Pürüzsüz Düz Sıva'}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-slate-800">Çatı Deseni:</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700">
                            {ROOF_PATTERN_OPTIONS.find(p => p.id === (modelParams.roofPattern || 'tiles'))?.title || 'Klasik Oluklu Kiremit'}
                          </span>
                        </span>
                        <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
                          <span className="text-[10px] text-slate-500">Renkler:</span>
                          <span className="w-3 h-3 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: modelParams.wallColor || '#f1f5f9' }} title="Duvar" />
                          <span className="w-3 h-3 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: modelParams.roofColor || '#b91c1c' }} title="Çatı" />
                          <span className="w-3 h-3 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: modelParams.accentColor || '#b5734c' }} title="Ahşap/Söve" />
                          <span className="w-3 h-3 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: modelParams.frameColor || '#18181b' }} title="Doğrama" />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsAppearanceSectionOpen(true)}
                        className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 underline flex items-center gap-1"
                      >
                        Tüm Detayları Düzenle →
                      </button>
                    </div>
                  )}

                  {/* Açık Durum İçeriği (Expanded State Body) */}
                  {isAppearanceSectionOpen && (
                    <div className="mt-4 space-y-4 animate-fade-in">
                      {/* Hızlı Renk Paleti Kombinasyonları */}
                      <div className="flex items-center justify-between flex-wrap gap-2 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-[11px] font-bold text-slate-800">
                            Hızlı Mimari Renk & Stil Kombinasyonları:
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
                          {[
                            { label: 'Açık & Kiremit', wall: '#f8fafc', roof: '#b91c1c', accent: '#b5734c', frame: '#18181b' },
                            { label: 'Antrasit & Çinko', wall: '#22252a', roof: '#1e293b', accent: '#b5734c', frame: '#18181b' },
                            { label: 'Bej & Kestane', wall: '#f5efe6', roof: '#451a03', accent: '#8c6239', frame: '#334155' },
                            { label: 'Beyaz & Grafit', wall: '#f8fafc', roof: '#0f172a', accent: '#334155', frame: '#18181b' },
                            { label: 'Tuğla & Kırmızı', wall: '#9a3412', roof: '#7f1d1d', accent: '#451a03', frame: '#18181b' },
                          ].map((combo, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => updateParams({
                                wallColor: combo.wall,
                                roofColor: combo.roof,
                                accentColor: combo.accent,
                                frameColor: combo.frame,
                              })}
                              className="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 transition-all flex items-center gap-1.5 shrink-0 shadow-2xs"
                            >
                              <span className="flex items-center -space-x-1">
                                <span className="w-2.5 h-2.5 rounded-full border border-white" style={{ backgroundColor: combo.wall }} />
                                <span className="w-2.5 h-2.5 rounded-full border border-white" style={{ backgroundColor: combo.roof }} />
                              </span>
                              <span>{combo.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 1. MALZEME SİMÜLASYONU: MAT / PARLAK AYRIMI */}
                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            Yüzey Kaplama Bitişi & Işık Yansıma Simülasyonu (Mat / Parlak Ayrımı)
                          </span>
                          <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                            {MATERIAL_FINISH_OPTIONS.find(f => f.id === (modelParams.materialFinish || 'satin'))?.title}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {MATERIAL_FINISH_OPTIONS.map((fOption) => {
                            const isSelected = (modelParams.materialFinish || 'satin') === fOption.id;
                            return (
                              <button
                                key={fOption.id}
                                type="button"
                                onClick={() => updateParams({ materialFinish: fOption.id })}
                                className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between gap-1.5 relative ${
                                  isSelected
                                    ? 'bg-gradient-to-br from-indigo-50/80 to-amber-50/30 border-indigo-600 ring-2 ring-indigo-500/25 shadow-xs'
                                    : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${
                                      fOption.id === 'matte' ? 'bg-amber-600' : fOption.id === 'glossy' ? 'bg-sky-500' : 'bg-indigo-600'
                                    }`} />
                                    {fOption.title}
                                  </span>
                                  {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                                </div>
                                <span className="text-[10px] text-slate-500 leading-snug">
                                  {fOption.description}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. DOKU VE DESEN SEÇENEKLERİ (DIŞ CEPHE & ÇATI) */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                        {/* Dış Cephe Duvar Deseni */}
                        <div className="lg:col-span-8 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                              <Building className="w-3.5 h-3.5 text-indigo-600" />
                              Dış Cephe Doku & Malzeme Deseni
                            </span>
                            <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                              {WALL_PATTERN_OPTIONS.find(p => p.id === (modelParams.wallPattern || 'smooth'))?.title}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {WALL_PATTERN_OPTIONS.map((pat) => {
                              const isSelected = (modelParams.wallPattern || 'smooth') === pat.id;
                              return (
                                <button
                                  key={pat.id}
                                  type="button"
                                  onClick={() => updateParams({ wallPattern: pat.id as any })}
                                  className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between gap-1 text-xs relative ${
                                    isSelected
                                      ? 'bg-gradient-to-br from-indigo-50 to-amber-50/40 border-indigo-600 ring-2 ring-indigo-500/25 shadow-xs'
                                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-[11px] text-slate-900">{pat.title}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                                  </div>
                                  <span className="text-[9px] text-slate-500 line-clamp-2 leading-tight">
                                    {pat.subtitle}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Çatı Kaplama Deseni */}
                        <div className="lg:col-span-4 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                              <Layers className="w-3.5 h-3.5 text-rose-600" />
                              Çatı Deseni
                            </span>
                            <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                              {ROOF_PATTERN_OPTIONS.find(p => p.id === (modelParams.roofPattern || 'tiles'))?.title}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            {ROOF_PATTERN_OPTIONS.map((rPat) => {
                              const isSelected = (modelParams.roofPattern || 'tiles') === rPat.id;
                              return (
                                <button
                                  key={rPat.id}
                                  type="button"
                                  onClick={() => updateParams({ roofPattern: rPat.id as any })}
                                  className={`p-2 rounded-xl text-left border transition-all flex flex-col justify-between gap-0.5 text-xs relative ${
                                    isSelected
                                      ? 'bg-gradient-to-br from-rose-50 to-amber-50/40 border-rose-600 ring-2 ring-rose-500/25 shadow-xs'
                                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-[11px] text-slate-900">{rPat.title}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                                  </div>
                                  <span className="text-[9px] text-slate-500 leading-tight">
                                    {rPat.subtitle}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Mimari Cephe Tasarım & Kaplama Tarzı Seçici */}
                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                            <Building className="w-3.5 h-3.5 text-indigo-600" />
                            Mimari Cephe Tasarım Tarzı (Hazır Kombinasyonlar)
                          </span>
                          <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                            {FACADE_STYLES.find(s => s.id === (modelParams.facadeStyle || 'modern'))?.title || 'Modern Açık Gri'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                          {FACADE_STYLES.map((style) => {
                            const isSelected = (modelParams.facadeStyle || 'modern') === style.id;
                            return (
                              <button
                                key={style.id}
                                type="button"
                                onClick={() => {
                                  updateParams({
                                    facadeStyle: style.id,
                                    wallColor: style.wallColorHex,
                                    accentColor: style.accentColorHex,
                                  });
                                }}
                                className={`p-2 rounded-xl text-left border transition-all flex flex-col justify-between gap-1 text-xs relative ${
                                  isSelected
                                    ? 'bg-gradient-to-br from-indigo-50 to-amber-50/40 border-indigo-600 ring-2 ring-indigo-500/30 shadow-xs'
                                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[11px] text-slate-900 truncate">{style.title}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                                </div>
                                <span className="text-[9px] text-slate-500 line-clamp-2 leading-tight">
                                  {style.subtitle}
                                </span>
                                <div className="flex items-center gap-1 mt-1 pt-1 border-t border-slate-200/60">
                                  <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: style.wallColorHex }} title="Duvar Rengi" />
                                  <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: style.accentColorHex }} title="Vurgu Rengi" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 4 Ana Renk Seçim Izgarası */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* 1. Dış Cephe Duvar Rengi */}
                        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                              Dış Cephe Duvarı
                            </span>
                            <div className="flex items-center gap-1">
                              <input
                                type="color"
                                value={modelParams.wallColor || '#f1f5f9'}
                                onChange={(e) => updateParams({ wallColor: e.target.value })}
                                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                                title="Özel Dış Cephe Rengi Seç"
                              />
                              <span className="text-[10px] font-mono text-slate-500 uppercase">
                                {modelParams.wallColor || '#f1f5f9'}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5">
                            {WALL_COLOR_PRESETS.map((p) => {
                              const isSelected = (modelParams.wallColor || '#f1f5f9').toLowerCase() === p.hex.toLowerCase();
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => updateParams({ wallColor: p.hex })}
                                  title={p.name}
                                  className={`p-1 rounded-lg border text-left transition-all flex flex-col items-center gap-1 ${
                                    isSelected
                                      ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500 shadow-2xs'
                                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <span
                                    className="w-5 h-5 rounded-full border border-black/10 shadow-2xs"
                                    style={{ backgroundColor: p.hex }}
                                  />
                                  <span className="text-[9px] text-slate-600 font-medium truncate w-full text-center leading-tight">
                                    {p.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. Çatı Kaplama Rengi */}
                        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              Çatı Kaplaması
                            </span>
                            <div className="flex items-center gap-1">
                              <input
                                type="color"
                                value={modelParams.roofColor || '#b91c1c'}
                                onChange={(e) => updateParams({ roofColor: e.target.value })}
                                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                                title="Özel Çatı Rengi Seç"
                              />
                              <span className="text-[10px] font-mono text-slate-500 uppercase">
                                {modelParams.roofColor || '#b91c1c'}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5">
                            {ROOF_COLOR_PRESETS.map((p) => {
                              const isSelected = (modelParams.roofColor || '#b91c1c').toLowerCase() === p.hex.toLowerCase();
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => updateParams({ roofColor: p.hex })}
                                  title={p.name}
                                  className={`p-1 rounded-lg border text-left transition-all flex flex-col items-center gap-1 ${
                                    isSelected
                                      ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500 shadow-2xs'
                                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <span
                                    className="w-5 h-5 rounded-full border border-black/10 shadow-2xs"
                                    style={{ backgroundColor: p.hex }}
                                  />
                                  <span className="text-[9px] text-slate-600 font-medium truncate w-full text-center leading-tight">
                                    {p.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 3. Ahşap, Söve & Vurgu Rengi */}
                        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-600" />
                              Ahşap & Söve Detayları
                            </span>
                            <div className="flex items-center gap-1">
                              <input
                                type="color"
                                value={modelParams.accentColor || '#b5734c'}
                                onChange={(e) => updateParams({ accentColor: e.target.value })}
                                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                                title="Özel Vurgu Rengi Seç"
                              />
                              <span className="text-[10px] font-mono text-slate-500 uppercase">
                                {modelParams.accentColor || '#b5734c'}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5">
                            {ACCENT_COLOR_PRESETS.map((p) => {
                              const isSelected = (modelParams.accentColor || '#b5734c').toLowerCase() === p.hex.toLowerCase();
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => updateParams({ accentColor: p.hex })}
                                  title={p.name}
                                  className={`p-1 rounded-lg border text-left transition-all flex flex-col items-center gap-1 ${
                                    isSelected
                                      ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500 shadow-2xs'
                                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <span
                                    className="w-5 h-5 rounded-full border border-black/10 shadow-2xs"
                                    style={{ backgroundColor: p.hex }}
                                  />
                                  <span className="text-[9px] text-slate-600 font-medium truncate w-full text-center leading-tight">
                                    {p.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 4. Doğrama & Korkuluk Rengi */}
                        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-slate-900" />
                              Doğrama & Korkuluklar
                            </span>
                            <div className="flex items-center gap-1">
                              <input
                                type="color"
                                value={modelParams.frameColor || '#18181b'}
                                onChange={(e) => updateParams({ frameColor: e.target.value })}
                                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                                title="Özel Doğrama Rengi Seç"
                              />
                              <span className="text-[10px] font-mono text-slate-500 uppercase">
                                {modelParams.frameColor || '#18181b'}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            {FRAME_COLOR_PRESETS.map((p) => {
                              const isSelected = (modelParams.frameColor || '#18181b').toLowerCase() === p.hex.toLowerCase();
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => updateParams({ frameColor: p.hex })}
                                  title={p.name}
                                  className={`p-1 rounded-lg border text-left transition-all flex flex-col items-center gap-1 ${
                                    isSelected
                                      ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500 shadow-2xs'
                                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <span
                                    className="w-5 h-5 rounded-full border border-black/10 shadow-2xs"
                                    style={{ backgroundColor: p.hex }}
                                  />
                                  <span className="text-[9px] text-slate-600 font-medium truncate w-full text-center leading-tight">
                                    {p.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {viewMode === 'solar' && (
              <div className="space-y-4 animate-fade-in">
                <ThreeBuildingView
                  params={modelParams}
                  theme={theme}
                  solarMode={true}
                  sunAltitude={solarPos.altitude}
                  sunAzimuth={solarPos.azimuth}
                  sunTimeHour={solarTimeHour}
                  buildingRotation={solarBuildingRotation}
                  isSolarHeatmap={isSolarHeatmap}
                  onUpdateColors={(colors) => updateParams(colors)}
                  onUpdateSunTimeHour={setSolarTimeHour}
                  onUpdateBuildingRotation={setSolarBuildingRotation}
                  isPlayingSun={isPlayingSolar}
                  onToggleSunPlay={() => setIsPlayingSolar(!isPlayingSolar)}
                />
                <SolarAnalysisPanel
                  location={solarLocation}
                  onChangeLocation={setSolarLocation}
                  selectedSeasonId={solarSeasonId}
                  onChangeSeasonId={setSolarSeasonId}
                  timeHour={solarTimeHour}
                  onChangeTimeHour={setSolarTimeHour}
                  buildingRotation={solarBuildingRotation}
                  onChangeBuildingRotation={setSolarBuildingRotation}
                  isSolarHeatmap={isSolarHeatmap}
                  onChangeSolarHeatmap={setIsSolarHeatmap}
                  isPlaying={isPlayingSolar}
                  onTogglePlay={() => setIsPlayingSolar(!isPlayingSolar)}
                  theme={theme}
                />
              </div>
            )}

            {viewMode === '2d' && (
              <NanoBananaDrawingGenerator
                params={modelParams}
                theme={theme}
                onUpdateParams={updateParams}
              />
            )}
          </div>
        </div>

        {/* BOTTOM SECTION: Dimension & Structural Parameter Input Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Card 1: Facade & Building Dimensions (Expanded Horizontally - Full Width) */}
            <div className={`col-span-full border rounded-3xl overflow-hidden ${cardBg}`}>
              <button
                type="button"
                onClick={() => toggleSection('dimensions')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-indigo-600" />
                  <span className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                    1. Bina ve Cephe Ölçüleri
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="font-mono">
                    {modelParams.facadeWidth}m × {modelParams.facadeDepth}m ({(modelParams.facadeWidth * modelParams.facadeDepth).toFixed(1)} m²)
                  </span>
                  {collapsedSections.dimensions ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </button>

              {!collapsedSections.dimensions && (() => {
                const isPolyDrawMode = modelParams.footprintInputMode === 'polygonDraw' || (modelParams.polygonPoints && modelParams.polygonPoints.length > 4);
                const polygonEdges = (modelParams.polygonPoints && modelParams.polygonPoints.length >= 3)
                  ? getPolygonEdges(modelParams.polygonPoints)
                  : [];

                const facadeItems = isPolyDrawMode && polygonEdges.length > 0
                  ? polygonEdges.map((edge, idx) => ({
                      id: idx + 1,
                      key: `edge_${idx}`,
                      label: idx === 0 ? '1. Ön Cephe (Yol/Giriş)'
                        : idx === 1 ? '2. Sağ Yan Cephe'
                        : idx === 2 && polygonEdges.length === 4 ? '3. Arka Cephe (Bahçe)'
                        : idx === 3 && polygonEdges.length === 4 ? '4. Sol Yan Cephe'
                        : `${idx + 1}. Kırık Cephe`,
                      value: edge.length,
                      isMain: idx === (modelParams.mainEntranceFacadeIndex || 0),
                    }))
                  : [
                      { id: 1, key: 'front', label: '1. Ön Cephe (Yol/Giriş)', value: modelParams.facadeWidth, isMain: (modelParams.mainEntranceFacadeIndex || 0) === 0 },
                      { id: 2, key: 'right', label: '2. Sağ Yan Cephe', value: modelParams.facadeDepth, isMain: (modelParams.mainEntranceFacadeIndex || 0) === 1 },
                      { id: 3, key: 'back', label: '3. Arka Cephe (Bahçe)', value: modelParams.backFacadeLength !== undefined ? modelParams.backFacadeLength : modelParams.facadeWidth, isMain: (modelParams.mainEntranceFacadeIndex || 0) === 2 },
                      { id: 4, key: 'left', label: '4. Sol Yan Cephe', value: modelParams.leftFacadeLength !== undefined ? modelParams.leftFacadeLength : modelParams.facadeDepth, isMain: (modelParams.mainEntranceFacadeIndex || 0) === 3 },
                    ];

                const activeCfgs = generateFacadeConfigs(
                  isPolyDrawMode && modelParams.polygonPoints && modelParams.polygonPoints.length >= 3
                    ? modelParams.polygonPoints
                    : (modelParams.customFacades && modelParams.customFacades.length > 4 ? modelParams.customFacades.length : 4),
                  modelParams.facadeConfigs,
                  modelParams.mainEntranceFacadeIndex || 0
                );

                const currentDefaultCantilever = modelParams.cantileverDepth || 1.2;

                const updateFacadeDetail = (fIdx: number, updates: Partial<FacadeDetailConfig>) => {
                  const newCfgs = [...activeCfgs];
                  const currentCfg: FacadeDetailConfig = newCfgs[fIdx] || {
                    id: fIdx + 1,
                    name: facadeItems[fIdx]?.label || `${fIdx + 1}. Cephe`,
                    length: facadeItems[fIdx]?.value || 10,
                    windowCountPerFloor: fIdx === 0 ? 3 : 2,
                    hasBalcony: fIdx === 0,
                    balconyCountPerFloor: fIdx === 0 ? 1 : 0,
                    balconyType: 'standard',
                    isEntrance: fIdx === (modelParams.mainEntranceFacadeIndex || 0),
                    isAdjacent: false,
                    isBlankWall: false,
                    cantileverDepth: currentDefaultCantilever,
                  };
                  
                  const isNowAdjacent = updates.isAdjacent !== undefined ? updates.isAdjacent : (currentCfg.isAdjacent ?? false);

                  newCfgs[fIdx] = {
                    ...currentCfg,
                    ...updates,
                    ...(isNowAdjacent ? {
                      isAdjacent: true,
                      isBlankWall: true,
                      windowCountPerFloor: 0,
                      hasBalcony: false,
                      balconyCountPerFloor: 0,
                      cantileverDepth: 0,
                    } : {}),
                  };

                  if (updates.isEntrance) {
                    newCfgs.forEach((c, i) => {
                      if (i !== fIdx) c.isEntrance = false;
                    });
                  }

                  let customList: CustomFacadeSide[] = [];
                  if (isPolyDrawMode && modelParams.polygonPoints && modelParams.polygonPoints.length >= 3) {
                    customList = syncPolygonToCustomFacades(
                      modelParams.polygonPoints,
                      modelParams.customFacades,
                      newCfgs,
                      updates.isEntrance ? fIdx : (modelParams.mainEntranceFacadeIndex || 0)
                    );
                  } else {
                    customList = [...(modelParams.customFacades || getDefaultCustomFacades(4, modelParams.facadeWidth, modelParams.facadeDepth, modelParams.backFacadeLength, modelParams.leftFacadeLength))];
                    if (customList[fIdx]) {
                      customList[fIdx] = {
                        ...customList[fIdx],
                        windowCountPerFloor: newCfgs[fIdx].windowCountPerFloor,
                        hasBalcony: newCfgs[fIdx].hasBalcony,
                        balconyCountPerFloor: newCfgs[fIdx].balconyCountPerFloor,
                        balconyType: newCfgs[fIdx].balconyType,
                        isEntrance: newCfgs[fIdx].isEntrance,
                        isAdjacent: newCfgs[fIdx].isAdjacent,
                        isBlankWall: newCfgs[fIdx].isBlankWall,
                        cantileverDepth: newCfgs[fIdx].cantileverDepth,
                      };
                    }
                  }

                  // Synchronize cantilever array
                  const nextCantilevers = [...(modelParams.facadeCantilevers || Array(newCfgs.length).fill(currentDefaultCantilever))];
                  while (nextCantilevers.length < newCfgs.length) {
                    nextCantilevers.push(currentDefaultCantilever);
                  }
                  if (updates.cantileverDepth !== undefined) {
                    nextCantilevers[fIdx] = updates.cantileverDepth;
                  } else if (isNowAdjacent) {
                    nextCantilevers[fIdx] = 0;
                  }

                  // If facade is made adjacent, remove any road attached to it
                  let updatedRoads = modelParams.roads;
                  if (isNowAdjacent && modelParams.roads) {
                    updatedRoads = modelParams.roads.filter(r => r.facadeIndex !== fIdx);
                  }

                  updateParams({
                    facadeConfigs: newCfgs,
                    customFacades: customList,
                    facadeCantilevers: nextCantilevers,
                    ...(updatedRoads !== undefined ? { roads: updatedRoads } : {}),
                    ...(updates.isEntrance ? { mainEntranceFacadeIndex: fIdx } : {}),
                  });
                };

                const toggleRoadOnFacade = (fIdx: number) => {
                  const currentRoads = modelParams.roads || [];
                  const exists = currentRoads.find(r => r.facadeIndex === fIdx);
                  let nextRoads: RoadConfig[];
                  if (exists) {
                    nextRoads = currentRoads.filter(r => r.facadeIndex !== fIdx);
                    updateParams({ roads: nextRoads });
                  } else {
                    const defaultType: RoadType = fIdx === 0 ? 'street' : 'street';
                    const typeObj = ROAD_TYPES_DATA.find(t => t.id === defaultType);
                    nextRoads = [
                      ...currentRoads,
                      {
                        id: `road-${Date.now()}-${fIdx}`,
                        facadeIndex: fIdx,
                        type: defaultType,
                        name: fIdx === 0 ? 'Ön İmar Yolu' : `${fIdx + 1}. Cephe Yolu`,
                        width: typeObj?.width || 7,
                      },
                    ];
                    // If facade was marked adjacent, open it up because it has road frontage
                    const cfg = activeCfgs[fIdx];
                    if (cfg && (cfg as any).isAdjacent) {
                      updateFacadeDetail(fIdx, {
                        isAdjacent: false,
                        isBlankWall: false,
                        windowCountPerFloor: 2,
                        hasBalcony: true,
                        balconyCountPerFloor: 1,
                        cantileverDepth: currentDefaultCantilever,
                      });
                    }
                    updateParams({ roads: nextRoads });
                  }
                };

                const updateRoadTypeOnFacade = (fIdx: number, typeId: RoadType) => {
                  const currentRoads = modelParams.roads || [];
                  const typeObj = ROAD_TYPES_DATA.find(t => t.id === typeId);
                  const nextRoads = currentRoads.map(r => {
                    if (r.facadeIndex === fIdx) {
                      return {
                        ...r,
                        type: typeId,
                        width: typeObj?.width || 7,
                      };
                    }
                    return r;
                  });
                  updateParams({ roads: nextRoads });
                };

                const handleLengthChange = (fIdx: number, val: number) => {
                  if (isNaN(val) || val < 1.0) return;
                  const safeVal = Math.round(Math.max(1.0, Math.min(80.0, val)) * 10) / 10;
                  if (isPolyDrawMode && modelParams.polygonPoints && modelParams.polygonPoints.length >= 3) {
                    const newPts = updatePolygonEdgeLength(modelParams.polygonPoints, fIdx, safeVal);
                    const bounds = getPolygonBounds(newPts);
                    const syncedConfigs = generateFacadeConfigs(newPts, activeCfgs, modelParams.mainEntranceFacadeIndex || 0);
                    const syncedCustom = syncPolygonToCustomFacades(newPts, modelParams.customFacades, syncedConfigs, modelParams.mainEntranceFacadeIndex || 0);
                    updateParams({
                      polygonPoints: newPts,
                      facadeWidth: Math.round(bounds.width * 10) / 10,
                      facadeDepth: Math.round(bounds.depth * 10) / 10,
                      facadeConfigs: syncedConfigs,
                      customFacades: syncedCustom,
                    });
                  } else {
                    const sideKey = fIdx === 0 ? 'front' : fIdx === 1 ? 'right' : fIdx === 2 ? 'back' : 'left';
                    const res = calculateInteractiveQuadrilateral(sideKey, safeVal, {
                      front: modelParams.facadeWidth,
                      right: modelParams.facadeDepth,
                      back: modelParams.backFacadeLength,
                      left: modelParams.leftFacadeLength,
                    });
                    updateParams({
                      facadeWidth: res.front,
                      facadeDepth: res.right,
                      backFacadeLength: res.back,
                      leftFacadeLength: res.left,
                      polygonPoints: res.quadrilateral.polygonPoints,
                      customFacades: res.customFacades,
                    });
                  }
                };

                const currentArea = modelParams.footprintInputMode === 'polygonDraw' && modelParams.polygonPoints && modelParams.polygonPoints.length >= 3
                  ? calculatePolygonArea(modelParams.polygonPoints)
                  : modelParams.facadeWidth * modelParams.facadeDepth;

                const currentPerimeter = facadeItems.reduce((acc, f) => acc + (f.value || 0), 0);

                return (
                  <div className="p-5 pt-0 space-y-4 border-t border-slate-100">
                    {/* Mode Selector & Quick Preset Pills */}
                    <div className="pt-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit">
                        <button
                          type="button"
                          onClick={() => updateParams({ footprintInputMode: 'dimensions' })}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            (modelParams.footprintInputMode || 'dimensions') !== 'polygonDraw'
                              ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Ruler className="w-3.5 h-3.5" />
                          <span>Standart Geometri (4 Cephe)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateParams({ footprintInputMode: 'polygonDraw' })}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            modelParams.footprintInputMode === 'polygonDraw'
                              ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Layout className="w-3.5 h-3.5" />
                          <span>Serbest Çizim (İnteraktif Poligon)</span>
                        </button>
                      </div>

                      {/* Quick Standard Presets */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                        <span className="text-[11px] font-semibold text-slate-400 shrink-0">Hızlı Boyut:</span>
                        {[
                          { w: 12, d: 15, label: '12×15m' },
                          { w: 14, d: 18, label: '14×18m' },
                          { w: 15, d: 20, label: '15×20m' },
                          { w: 16, d: 22, label: '16×22m' },
                          { w: 15, d: 15, label: '15×15m (Kare)' },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              updateParams({
                                facadeWidth: preset.w,
                                facadeDepth: preset.d,
                                backFacadeLength: preset.w,
                                leftFacadeLength: preset.d,
                                footprintInputMode: 'dimensions',
                              });
                            }}
                            className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-all shrink-0 ${
                              modelParams.facadeWidth === preset.w && modelParams.facadeDepth === preset.d && modelParams.footprintInputMode !== 'polygonDraw'
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Primary Global Dimensions & Structure Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80">
                      {/* 1. Ön Cephe Genişliği (X) */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between text-xs">
                          <label className={`font-bold ${textTitle}`}>1. Ön Cephe (X):</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              min="4"
                              max="60"
                              value={modelParams.facadeWidth}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val >= 1) handleLengthChange(0, val);
                              }}
                              className={`w-16 px-1.5 py-0.5 text-right font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                            />
                            <span className="text-xs font-semibold text-slate-400">m</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleLengthChange(0, Math.max(4, modelParams.facadeWidth - 0.5))}
                            className="w-6 h-6 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs flex items-center justify-center shrink-0"
                          >
                            -
                          </button>
                          <input
                            type="range"
                            min="6"
                            max="40"
                            step="0.5"
                            value={modelParams.facadeWidth}
                            onChange={(e) => handleLengthChange(0, parseFloat(e.target.value))}
                            className="flex-1 accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleLengthChange(0, Math.min(60, modelParams.facadeWidth + 0.5))}
                            className="w-6 h-6 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs flex items-center justify-center shrink-0"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* 2. Sağ Yan Cephe Derinliği (Y) */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between text-xs">
                          <label className={`font-bold ${textTitle}`}>2. Yan Cephe (Y):</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              min="4"
                              max="60"
                              value={modelParams.facadeDepth}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val >= 1) handleLengthChange(1, val);
                              }}
                              className={`w-16 px-1.5 py-0.5 text-right font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                            />
                            <span className="text-xs font-semibold text-slate-400">m</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleLengthChange(1, Math.max(4, modelParams.facadeDepth - 0.5))}
                            className="w-6 h-6 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs flex items-center justify-center shrink-0"
                          >
                            -
                          </button>
                          <input
                            type="range"
                            min="6"
                            max="40"
                            step="0.5"
                            value={modelParams.facadeDepth}
                            onChange={(e) => handleLengthChange(1, parseFloat(e.target.value))}
                            className="flex-1 accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleLengthChange(1, Math.min(60, modelParams.facadeDepth + 0.5))}
                            className="w-6 h-6 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs flex items-center justify-center shrink-0"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* 3. Kat Yüksekliği (H) */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between text-xs">
                          <label className={`font-bold ${textTitle}`}>Kat Yüksekliği (H):</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.05"
                              min="2.4"
                              max="4.5"
                              value={modelParams.floorHeight || 2.9}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val > 0) updateParams({ floorHeight: val });
                              }}
                              className={`w-16 px-1.5 py-0.5 text-right font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                            />
                            <span className="text-xs font-semibold text-slate-400">m</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 pt-0.5">
                          {[2.80, 2.90, 3.00, 3.20].map((hVal) => (
                            <button
                              key={hVal}
                              type="button"
                              onClick={() => updateParams({ floorHeight: hVal })}
                              className={`flex-1 py-0.5 text-[10px] font-bold rounded border transition-all ${
                                (modelParams.floorHeight || 2.9) === hVal
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {hVal.toFixed(2)}m
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 4. Tabla Konsol Çıkması & Balkon */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between text-xs">
                          <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800">
                            <input
                              type="checkbox"
                              checked={modelParams.hasCantilever || false}
                              onChange={(e) => updateParams({ hasCantilever: e.target.checked })}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                            />
                            <span>Tabla Çıkması (Konsol)</span>
                          </label>
                          {modelParams.hasCantilever && (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                min="0.5"
                                max="2.5"
                                value={currentDefaultCantilever}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val >= 0) updateParams({ cantileverDepth: val });
                                }}
                                className={`w-14 px-1 py-0.5 text-right font-mono font-bold text-xs rounded border ${inputBg}`}
                              />
                              <span className="text-[10px] font-semibold text-slate-400">m</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-0.5 text-slate-500">
                          <span>Balkon Çıkması Payı:</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="2.5"
                              value={modelParams.balconyDepth !== undefined ? modelParams.balconyDepth : 1.2}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val >= 0) updateParams({ balconyDepth: val });
                              }}
                              className={`w-14 px-1 py-0.5 text-right font-mono font-bold text-[11px] rounded border ${inputBg}`}
                            />
                            <span className="text-[10px] text-slate-400">m</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Calculated Live Footprint Metrics Banner */}
                    <div className="p-3 bg-indigo-50/70 border border-indigo-150 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 font-medium">Taban Oturumu:</span>
                          <span className="font-mono font-bold text-indigo-900 bg-white px-2 py-0.5 rounded-lg border border-indigo-100 shadow-2xs">
                            {currentArea.toFixed(1)} m²
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 font-medium">Bina Çevresi:</span>
                          <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-indigo-100 shadow-2xs">
                            {currentPerimeter.toFixed(1)} m
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 font-medium">Cephe Sayısı:</span>
                          <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-100 shadow-2xs">
                            {facadeItems.length} Cephe
                          </span>
                        </div>
                      </div>

                      {/* Quick Presets for Facade Roles */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const allOpen = activeCfgs.map(c => ({
                              ...c,
                              isAdjacent: false,
                              isBlankWall: false,
                              windowCountPerFloor: 2,
                              hasBalcony: true,
                              balconyCountPerFloor: 1,
                              cantileverDepth: currentDefaultCantilever,
                            }));
                            updateParams({
                              facadeConfigs: allOpen,
                              facadeCantilevers: Array(activeCfgs.length).fill(currentDefaultCantilever),
                              cantileverDirection: 'open_facades',
                            });
                          }}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all shadow-2xs"
                        >
                          🏢 Tümünü Açık Yap
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Preset: Back & Left blind (L-Nizam adjacent)
                            const newCfgs = activeCfgs.map((c, i) => {
                              const isAdj = i === 2 || i === 3;
                              return {
                                ...c,
                                isAdjacent: isAdj,
                                isBlankWall: isAdj,
                                windowCountPerFloor: isAdj ? 0 : 2,
                                hasBalcony: !isAdj,
                                balconyCountPerFloor: isAdj ? 0 : 1,
                                cantileverDepth: isAdj ? 0 : currentDefaultCantilever,
                              };
                            });
                            updateParams({
                              facadeConfigs: newCfgs,
                              facadeCantilevers: newCfgs.map(c => ((c as any).isAdjacent ? 0 : currentDefaultCantilever)),
                              cantileverDirection: 'custom',
                            });
                          }}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-2xs"
                        >
                          🏘️ Arka & Sol Bitişik Nizam
                        </button>
                      </div>
                    </div>

                    {/* Mode: Freehand Polygon Canvas (Serbest Çizim Modu) */}
                    {modelParams.footprintInputMode === 'polygonDraw' && (
                      <div className="p-3 bg-slate-50/90 rounded-2xl border border-indigo-200 shadow-sm">
                        <InteractiveFootprintCanvas
                          points={modelParams.polygonPoints}
                          selectedEdgeIndex={selectedEdgeIndex}
                          onSelectEdgeIndex={setSelectedEdgeIndex}
                          onChangePoints={(newPoints) => {
                            const bounds = getPolygonBounds(newPoints);
                            const syncedConfigs = generateFacadeConfigs(newPoints, modelParams.facadeConfigs, modelParams.mainEntranceFacadeIndex || 0);
                            const syncedCustom = syncPolygonToCustomFacades(newPoints, modelParams.customFacades, syncedConfigs, modelParams.mainEntranceFacadeIndex || 0);
                            updateParams({
                              polygonPoints: newPoints,
                              facadeWidth: Math.round(bounds.width * 10) / 10,
                              facadeDepth: Math.round(bounds.depth * 10) / 10,
                              facadeConfigs: syncedConfigs,
                              customFacades: syncedCustom,
                            });
                          }}
                          facadeConfigs={modelParams.facadeConfigs}
                          onChangeFacadeConfigs={(newConfigs) => {
                            updateParams({ facadeConfigs: newConfigs });
                          }}
                          mainEntranceIndex={modelParams.mainEntranceFacadeIndex || 0}
                          onChangeMainEntranceIndex={(idx) => {
                            updateParams({ mainEntranceFacadeIndex: idx });
                          }}
                          flatsPerFloor={modelParams.flatsPerFloor || 2}
                          theme={theme}
                          compact
                          roads={modelParams.roads}
                          onChangeRoads={(newRoads) => {
                            updateParams({ roads: newRoads });
                          }}
                          stairWidth={modelParams.stairWidth}
                          stairDepth={modelParams.stairDepth}
                          elevatorWidth={modelParams.elevatorWidth}
                          elevatorDepth={modelParams.elevatorDepth}
                          elevatorCount={modelParams.elevatorCount}
                          coreOffsetX={modelParams.coreOffsetX}
                          coreOffsetY={modelParams.coreOffsetY}
                          corePositionPreset={modelParams.corePositionPreset}
                          onChangeCoreParams={(coreUpdates) => {
                            updateParams(coreUpdates);
                          }}
                        />
                      </div>
                    )}

                    {/* Unified Facade Management Matrix (Tek ve Birleşik Cephe Tablosu) */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                            Cephe Mimari Ayrıntıları & Giriş Yönetimi ({facadeItems.length} Cephe)
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Anında 3D & 2D Yansır
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 hidden sm:inline">
                          Her cephenin uzunluk, ana giriş, pencere, balkon ve konsol çıkmasını tek tablodan yönetin
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {facadeItems.map((facadeItem, fIdx) => {
                          const cfg = activeCfgs[fIdx] || {
                            id: fIdx + 1,
                            name: facadeItem.label,
                            length: facadeItem.value,
                            windowCountPerFloor: fIdx === 0 ? 3 : 2,
                            hasBalcony: fIdx === 0,
                            balconyCountPerFloor: fIdx === 0 ? 1 : 0,
                            balconyType: 'standard',
                            isEntrance: fIdx === (modelParams.mainEntranceFacadeIndex || 0),
                            isAdjacent: false,
                            isBlankWall: false,
                          };

                          const isEntrance = fIdx === (modelParams.mainEntranceFacadeIndex || 0) || cfg.isEntrance === true;
                          const isAdjacent = (cfg as any).isAdjacent === true;
                          const isBlind = isAdjacent || (cfg as any).isBlankWall === true || cfg.windowCountPerFloor === 0;
                          const isSelectedInCanvas = selectedEdgeIndex === fIdx;
                          const currentRoad = (modelParams.roads || []).find((r) => r.facadeIndex === fIdx);

                          // Formulated Balcony Combo Key
                          let balconyCombo = 'none';
                          if (!isBlind && cfg.hasBalcony) {
                            if (cfg.balconyType === 'glass_enclosed') balconyCombo = 'glass_enclosed';
                            else if (cfg.balconyType === 'recessed') balconyCombo = 'recessed';
                            else if (cfg.balconyType === 'french') balconyCombo = 'french';
                            else if (cfg.balconyType === 'corner') balconyCombo = 'corner';
                            else if (cfg.balconyType === 'cumba') balconyCombo = 'cumba';
                            else if (cfg.balconyCountPerFloor === 2) balconyCombo = 'standard_2';
                            else balconyCombo = 'standard_1';
                          }

                          return (
                            <div
                              key={facadeItem.id}
                              onClick={() => setSelectedEdgeIndex(fIdx)}
                              className={`p-3.5 bg-white rounded-2xl border transition-all space-y-3 shadow-2xs relative cursor-pointer ${
                                isSelectedInCanvas
                                  ? 'ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/20'
                                  : isEntrance
                                  ? 'border-emerald-500 ring-1 ring-emerald-300 bg-emerald-50/10'
                                  : isAdjacent
                                  ? 'border-slate-300 bg-slate-50/60'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {/* Facade Title & Length Header */}
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-1.5">
                                <div className="min-w-0 flex-1">
                                  <span className={`text-xs font-bold truncate block ${isEntrance ? 'text-emerald-700' : textTitle}`} title={facadeItem.label}>
                                    {facadeItem.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="1"
                                    max="60"
                                    value={facadeItem.value}
                                    onChange={(e) => handleLengthChange(fIdx, parseFloat(e.target.value))}
                                    className={`w-14 px-1.5 py-0.5 text-right font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                                  />
                                  <span className="text-[11px] font-semibold text-slate-400">m</span>
                                </div>
                              </div>

                              {/* Bina Girişi & Bitişik Nizam Hızlı Seçim Butonları */}
                              <div className="grid grid-cols-2 gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => updateFacadeDetail(fIdx, { isEntrance: true })}
                                  className={`py-1 px-1.5 text-[10px] font-bold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                                    isEntrance
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  <DoorOpen className="w-3 h-3" />
                                  <span>{isEntrance ? 'Ana Giriş ✓' : 'Giriş Yap'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextAdj = !isAdjacent;
                                    updateFacadeDetail(fIdx, {
                                      isAdjacent: nextAdj,
                                      isBlankWall: nextAdj,
                                      windowCountPerFloor: nextAdj ? 0 : 2,
                                      hasBalcony: !nextAdj,
                                      balconyCountPerFloor: nextAdj ? 0 : 1,
                                      cantileverDepth: nextAdj ? 0 : currentDefaultCantilever,
                                    });
                                  }}
                                  className={`py-1 px-1.5 text-[10px] font-bold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                                    isAdjacent
                                      ? 'bg-rose-100 text-rose-800 border-rose-300 font-black'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                  title="Komşu parsele bitişik / yangın duvarı (İmar gereği pencere ve çıkma yapılamaz)"
                                >
                                  <span>{isAdjacent ? '🧱 Bitişik Kör' : 'Açık Cephe'}</span>
                                </button>
                              </div>

                              {/* İmar Yolu Ekleme / Yönetimi */}
                              <div className="pt-1 border-t border-slate-100/80" onClick={(e) => e.stopPropagation()}>
                                {isAdjacent ? (
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 py-1 px-2 bg-slate-50 border border-slate-200/70 rounded-lg">
                                    <span className="flex items-center gap-1">
                                      <Navigation className="w-3 h-3 text-slate-400" />
                                      <span>Yol Durumu:</span>
                                    </span>
                                    <span className="font-semibold text-slate-400 italic">Bitişik Kör</span>
                                  </div>
                                ) : currentRoad ? (
                                  <div className="flex items-center justify-between gap-1 p-1 bg-amber-50/80 border border-amber-300 rounded-lg shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() => toggleRoadOnFacade(fIdx)}
                                      className="flex items-center gap-1 text-[10px] font-bold text-amber-950 hover:text-rose-600 transition-colors shrink-0 pl-0.5"
                                      title="Yolu Kaldır"
                                    >
                                      <Navigation className="w-3 h-3 text-amber-600" />
                                      <span>Yol:</span>
                                      <Trash2 className="w-2.5 h-2.5 text-slate-400 hover:text-rose-600 ml-0.5" />
                                    </button>
                                    <select
                                      value={currentRoad.type}
                                      onChange={(e) => updateRoadTypeOnFacade(fIdx, e.target.value as RoadType)}
                                      className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-white border border-amber-300 text-amber-900 focus:outline-none"
                                    >
                                      {ROAD_TYPES_DATA.map((t) => (
                                        <option key={t.id} value={t.id}>
                                          {t.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => toggleRoadOnFacade(fIdx)}
                                    className="w-full py-1 px-2 text-[10px] font-bold rounded-lg border border-dashed border-amber-300 hover:border-amber-400 bg-amber-50/40 hover:bg-amber-50 text-amber-900 transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3 text-amber-600" />
                                    <span>🛣️ Bu Cepheye Yol Ekle</span>
                                  </button>
                                )}
                              </div>

                              {/* Pencere & Balkon Seçimi */}
                              <div className="space-y-2 pt-1 border-t border-slate-100/80" onClick={(e) => e.stopPropagation()}>
                                {/* Pencereler */}
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-600 font-medium">Pencereler:</span>
                                  <select
                                    disabled={isBlind}
                                    value={isBlind ? 0 : cfg.windowCountPerFloor}
                                    onChange={(e) => {
                                      const wCount = parseInt(e.target.value, 10);
                                      updateFacadeDetail(fIdx, {
                                        windowCountPerFloor: wCount,
                                        isBlankWall: wCount === 0,
                                      });
                                    }}
                                    className={`w-28 px-1.5 py-0.5 text-xs font-semibold rounded-md border ${
                                      isBlind ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : inputBg
                                    }`}
                                  >
                                    <option value={0}>0 (Penceresiz)</option>
                                    <option value={1}>1 Pencere</option>
                                    <option value={2}>2 Pencere</option>
                                    <option value={3}>3 Pencere</option>
                                    <option value={4}>4 Pencere</option>
                                    <option value={5}>5 Pencere</option>
                                    <option value={6}>6 Pencere</option>
                                  </select>
                                </div>

                                {/* Balkonlar */}
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-600 font-medium">Balkon:</span>
                                  <select
                                    disabled={isBlind}
                                    value={isBlind ? 'none' : balconyCombo}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === 'none') {
                                        updateFacadeDetail(fIdx, { hasBalcony: false, balconyCountPerFloor: 0 });
                                      } else if (val === 'standard_1') {
                                        updateFacadeDetail(fIdx, { hasBalcony: true, balconyCountPerFloor: 1, balconyType: 'standard' });
                                      } else if (val === 'standard_2') {
                                        updateFacadeDetail(fIdx, { hasBalcony: true, balconyCountPerFloor: 2, balconyType: 'standard' });
                                      } else if (val === 'glass_enclosed') {
                                        updateFacadeDetail(fIdx, { hasBalcony: true, balconyCountPerFloor: 1, balconyType: 'glass_enclosed' });
                                      } else if (val === 'recessed') {
                                        updateFacadeDetail(fIdx, { hasBalcony: true, balconyCountPerFloor: 1, balconyType: 'recessed' });
                                      } else if (val === 'french') {
                                        updateFacadeDetail(fIdx, { hasBalcony: true, balconyCountPerFloor: 1, balconyType: 'french' });
                                      } else if (val === 'corner') {
                                        updateFacadeDetail(fIdx, { hasBalcony: true, balconyCountPerFloor: 1, balconyType: 'corner' });
                                      } else if (val === 'cumba') {
                                        updateFacadeDetail(fIdx, { hasBalcony: true, balconyCountPerFloor: 1, balconyType: 'cumba' });
                                      }
                                    }}
                                    className={`w-28 px-1.5 py-0.5 text-xs font-semibold rounded-md border ${
                                      isBlind ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : inputBg
                                    }`}
                                  >
                                    <option value="none">Balkonsuz</option>
                                    <option value="standard_1">1 Açık Balkon</option>
                                    <option value="standard_2">2 Açık Balkon</option>
                                    <option value="glass_enclosed">Katlanır Cam Balkon</option>
                                    <option value="recessed">Gömme Lojya</option>
                                    <option value="french">Fransız Balkon</option>
                                    <option value="corner">Köşe Balkon</option>
                                    <option value="cumba">Cumba (Kapalı)</option>
                                  </select>
                                </div>

                                {/* Konsol Çıkması (Tabla) */}
                                {modelParams.hasCantilever && (
                                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                                    <span className="text-slate-600 font-medium">Konsol Çıkması:</span>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="2.5"
                                        disabled={isBlind}
                                        value={isBlind ? 0 : (cfg.cantileverDepth !== undefined ? cfg.cantileverDepth : currentDefaultCantilever)}
                                        onChange={(e) => {
                                          if (isBlind) return;
                                          const val = parseFloat(e.target.value);
                                          if (!isNaN(val) && val >= 0) {
                                            updateFacadeDetail(fIdx, { cantileverDepth: val });
                                          }
                                        }}
                                        className={`w-14 px-1 py-0.5 text-right font-mono font-bold text-xs rounded border ${
                                          isBlind ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : inputBg
                                        }`}
                                      />
                                      <span className="text-[10px] text-slate-400">m</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Card 1.5: General Structure & Floor Planning (Collapsible) */}
            <div className={`border rounded-3xl overflow-hidden ${cardBg}`}>
              <button
                type="button"
                onClick={() => toggleSection('generalStructure')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-600" />
                  <span className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                    1.5 Genel Yapı & Kat Planlaması
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span>
                    Z+{(modelParams.floorCount || 5) - 1} Kat, {modelParams.flatsPerFloor || 2} Daire/Kat
                  </span>
                  {collapsedSections.generalStructure ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </button>

              {!collapsedSections.generalStructure && (
                <div className="p-5 pt-0 space-y-4 border-t border-slate-100">
                  <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Normal Kat Sayısı */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase">Yeni Normal Kat Sayısı:</label>
                        <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                          Z+{(modelParams.floorCount || 5) - 1} Kat
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.max(1, (modelParams.floorCount || 5) - 1);
                            updateParams({ floorCount: val });
                          }}
                          className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center justify-center text-sm active:scale-95 transition-all shadow-2xs"
                        >
                          -
                        </button>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          step="1"
                          value={modelParams.floorCount || 5}
                          onChange={(e) => updateParams({ floorCount: parseInt(e.target.value) || 5 })}
                          className="flex-1 accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.min(40, (modelParams.floorCount || 5) + 1);
                            updateParams({ floorCount: val });
                          }}
                          className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center justify-center text-sm active:scale-95 transition-all shadow-2xs"
                        >
                          +
                        </button>
                      </div>
                      {/* Hızlı Seçim Butonları */}
                      <div className="flex gap-1">
                        {[3, 4, 5, 6, 8, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => updateParams({ floorCount: num })}
                            className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                              modelParams.floorCount === num
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {num} Kat
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Katta Daire Sayısı */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase">Katta Daire Sayısı:</label>
                        <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                          {modelParams.flatsPerFloor || 2} Daire
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.max(1, (modelParams.flatsPerFloor || 2) - 1);
                            updateParams({ flatsPerFloor: val });
                          }}
                          className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center justify-center text-sm active:scale-95 transition-all shadow-2xs"
                        >
                          -
                        </button>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={modelParams.flatsPerFloor || 2}
                          onChange={(e) => updateParams({ flatsPerFloor: parseInt(e.target.value) || 2 })}
                          className="flex-1 accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.min(10, (modelParams.flatsPerFloor || 2) + 1);
                            updateParams({ flatsPerFloor: val });
                          }}
                          className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center justify-center text-sm active:scale-95 transition-all shadow-2xs"
                        >
                          +
                        </button>
                      </div>
                      {/* Hızlı Seçim Butonları */}
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 6].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => updateParams({ flatsPerFloor: num })}
                            className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                              modelParams.flatsPerFloor === num
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {num} Dr.
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Kattaki Daire Dağılım Stratejisi (Kat Alanı Bölüşümü) */}
                    <div className="space-y-1.5 p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-indigo-950 uppercase">
                          Kat Alanı & Daire Dağılımı:
                        </label>
                        <span className="text-[10px] font-semibold text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                          {modelParams.flatsPerFloor === 4 ? 'Katta 4 Daire' : `${modelParams.flatsPerFloor || 2} Daire/Kat`}
                        </span>
                      </div>
                      <select
                        value={modelParams.flatDistributionMode || 'equal'}
                        onChange={(e) => updateParams({ flatDistributionMode: e.target.value as any })}
                        className={`w-full text-xs font-bold px-2.5 py-2 rounded-lg border border-indigo-200 focus:outline-hidden bg-white text-slate-800 shadow-2xs`}
                      >
                        <option value="equal">Eşit Dağılım (%25 x 4 Daire - Eşit Kat Alanı)</option>
                        <option value="front_large">Ön Cephe Daireleri Daha Büyük (%30 Ön 3+1 / %20 Arka 2+1)</option>
                        <option value="asymmetric_master">1 Master Köşe Daire (%40) + 3 Daire (%20'şer)</option>
                        <option value="custom_proportions">Özel Metrekare Dağılımı (Mülkiyet Tablosu)</option>
                      </select>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        {modelParams.flatDistributionMode === 'front_large'
                          ? 'Caddeye / ön cepheye bakan daireler geniş 3+1 (ayrı mutfak, ebeveyn banyolu), arka daireler kompakt 2+1 planlanır.'
                          : modelParams.flatDistributionMode === 'asymmetric_master'
                          ? '1 adet geniş manzaralı köşe daire (%40 alan), diğer daireler standart (%20) pay alır.'
                          : 'Kat alanı tüm dairelere eşit pay edilir. Her bağımsız bölüm eşit m² ve simetrik oda planına sahip olur.'}
                      </p>
                    </div>

                    {/* Bodrum Kat Sayısı */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase">Bodrum Kat Sayısı:</label>
                      <select
                        value={modelParams.basementCount !== undefined ? modelParams.basementCount : 1}
                        onChange={(e) => updateParams({ basementCount: parseInt(e.target.value) || 0 })}
                        className={`w-full text-xs font-bold px-3 py-2 rounded-xl border focus:outline-hidden ${inputBg}`}
                      >
                        <option value={0}>Yok (0 Bodrum)</option>
                        <option value={1}>1 Bodrum Kat (Standart Sığınak/Otopark)</option>
                        <option value={2}>2 Bodrum Kat</option>
                        <option value={3}>3 Bodrum Kat</option>
                        <option value={4}>4 Bodrum Kat</option>
                      </select>
                    </div>

                    {/* Daire Tipi */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase">Oda Tipi / Yerleşimi:</label>
                      <select
                        value={modelParams.roomType || '3+1'}
                        onChange={(e) => updateParams({ roomType: e.target.value as any })}
                        className={`w-full text-xs font-bold px-3 py-2 rounded-xl border focus:outline-hidden ${inputBg}`}
                      >
                        <option value="1+1">1+1 Studio Daireler</option>
                        <option value="2+1">2+1 Konut Planı</option>
                        <option value="3+1">3+1 Standart Aile Planı</option>
                        <option value="4+1">4+1 Lüks Geniş Plan</option>
                      </select>
                    </div>

                    {/* Toplam Yeni Daire Sayısı - Otomatik Gösterim */}
                    <div className="col-span-full p-3 bg-indigo-50/70 border border-indigo-150 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-indigo-900 block">
                          Toplam Yeni Daire Sayısı
                        </span>
                        <span className="text-[10px] text-indigo-700/80 block">
                          Katta Daire, Kat Sayısı ve Çatı tipi dikkate alınarak otomatik belirlenir.
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-lg">
                          {(modelParams.hasGroundFloorShop ? `1 Zemin Dükkan + ${Math.max(0, modelParams.floorCount - 1)} Normal Kat` : `1 Zemin Konut + ${Math.max(0, modelParams.floorCount - 1)} Normal Kat`)} × {modelParams.flatsPerFloor || 2} Daire
                          {modelParams.roofType === 'mansard' ? ' + Mansart Çatı' : ''}
                        </span>
                        <span className="font-mono font-black text-indigo-800 text-sm bg-indigo-200/60 px-3 py-1 rounded-xl">
                          {metrics.totalFlats} Daire
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Roof Types with Mansard & Duplex Penthouse (Collapsible) */}
            <div className={`border rounded-3xl overflow-hidden ${cardBg}`}>
              <button
                type="button"
                onClick={() => toggleSection('roof')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-indigo-600" />
                  <span className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                    2. Çatı & Dubleks Seçenekleri
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span>
                    {modelParams.roofType === 'duplex'
                      ? 'Dubleks'
                      : modelParams.roofType === 'mansard'
                      ? 'Mansart'
                      : modelParams.roofType === 'gable'
                      ? 'Kırma'
                      : 'Teras'}
                  </span>
                  {collapsedSections.roof ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </button>

              {!collapsedSections.roof && (
                <div className="p-5 pt-0 space-y-3.5 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => updateParams({ roofType: 'gable' })}
                      className={`p-2.5 rounded-2xl text-left border transition-all ${
                        modelParams.roofType === 'gable'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="font-bold text-xs block">🏛️ Mansart Çatı</span>
                      <span className="text-[10px] opacity-80 block mt-0.5">Tek Seçim: Ekstra Bağımsız Bölüm Oluşur</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateParams({ roofType: 'duplex' })}
                      className={`p-2.5 rounded-2xl text-left border transition-all ${
                        modelParams.roofType === 'duplex'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="font-bold text-xs block">🌟 Mansart + Dubleks</span>
                      <span className="text-[10px] opacity-80 block mt-0.5">Son Katla Birleşik: Tek Bağımsız Bölüm</span>
                    </button>
                  </div>

                  {modelParams.roofType === 'mansard' && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Kural Uygulandı (Mansart Çatı Tek):</span> Çatı katında ilave bağımsız bölüm ortaya çıkar. Eklenen bağımsız bölümler ({metrics.extraMansardFlats || (modelParams.flatsPerFloor || 2)} daire) inşaat maliyetlerine, hakedişlere ve daire listesine dahil edildi.
                      </div>
                    </div>
                  )}

                  {modelParams.roofType === 'duplex' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Kural Uygulandı (Mansart + Dubleks):</span> Çatı yaşam alanı üst kattaki normal daireler ile birleştirildi ve <strong>tek bağımsız bölüm</strong> olarak kabul edildi (ekstra daire eklenmez, m² dubleks büyür).
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card 2.5: Ground Floor Commercial Shops (Zemin Kat Dükkan Ayarları) */}
            <div className={`border rounded-3xl overflow-hidden ${cardBg}`}>
              <button
                type="button"
                onClick={() => toggleSection('typology')} // Reuse typology or create new state key if needed, but let's use typology toggle
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-amber-600" />
                  <span className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                    2.5 Zemin Kat & Ticari Dükkanlar
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span>
                    {modelParams.hasGroundFloorShop ? `${modelParams.shopCount || 1} Dükkan` : 'Konut Girişi'}
                  </span>
                  {collapsedSections.typology ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </button>

              {!collapsedSections.typology && (
                <div className="p-5 pt-0 space-y-3.5 border-t border-slate-100">
                  <div className="pt-3 space-y-3">
                    <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-amber-200 bg-amber-50/40 cursor-pointer group transition-all hover:bg-amber-50">
                      <input
                        type="checkbox"
                        checked={modelParams.hasGroundFloorShop || false}
                        onChange={(e) => updateParams({ hasGroundFloorShop: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-amber-900 block group-hover:text-amber-700">Zemin Katta Ticari Dükkan Var</span>
                        <span className="text-[10px] text-amber-700/70 block">Bina giriş katını ticari dükkan/mağaza olarak kurgular.</span>
                      </div>
                      <Store className={`w-5 h-5 transition-colors ${modelParams.hasGroundFloorShop ? 'text-amber-600' : 'text-slate-300'}`} />
                    </label>

                    {modelParams.hasGroundFloorShop && (
                      <div className="space-y-4 animate-fade-in pl-1">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <label className="font-bold text-slate-700">Dükkan Sayısı (Zemin Kat):</label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                max="12"
                                value={modelParams.shopCount || 1}
                                onChange={(e) => updateParams({ shopCount: parseInt(e.target.value) || 1 })}
                                className={`w-14 px-2 py-1 text-right font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                              />
                              <span className="text-xs text-slate-500 font-medium">Adet</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="8"
                            step="1"
                            value={modelParams.shopCount || 1}
                            onChange={(e) => updateParams({ shopCount: parseInt(e.target.value) })}
                            className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                          />
                        </div>

                        <div className="p-3 bg-amber-50/80 border border-amber-100 rounded-2xl space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                            <Info className="w-3.5 h-3.5" />
                            <span>Ticari Bölüm Kuralları</span>
                          </div>
                          <ul className="text-[10px] text-amber-800/80 space-y-1.5 list-disc pl-3.5">
                            <li>Dükkanlar zemin kat yüksekliğini otomatik olarak <b>+1.0m</b> (asma kat payı) artırır.</li>
                            <li>Teklif formunda dükkanlar için <b>"Ticari / Dükkan"</b> etiketi kullanılır.</li>
                            <li>Dükkanlar için taksitli ödeme planı gizlenir, "Tek Sefer" kabul edilir.</li>
                            <li>Dükkan m²'leri toplam inşaat alanına ticari emsal olarak yansır.</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CARD 2.8: ENTRANCE, LOBBY & STAIRCASE LANDING (BİNA GİRİŞİ, GİRİŞ HOLÜ & SAHANLIKLAR) */}
            <div className={`border rounded-3xl overflow-hidden ${cardBg}`}>
              <button
                type="button"
                onClick={() => toggleSection('entranceCore')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <DoorOpen className="w-4 h-4 text-emerald-600" />
                  <span className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                    2.8 Bina Girişi, Hol & Sahanlık
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span>Giriş & Çekirdek Ölçüleri</span>
                  {collapsedSections.entranceCore ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </button>

              {!collapsedSections.entranceCore && (
                <div className="p-5 pt-0 space-y-5 border-t border-slate-100">
                  {/* Subsection 1: Bina Giriş Kapısı ve Konumu */}
                  <div className="space-y-3 pt-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <DoorOpen className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Bina Ana Girişi & Cephe Konumu</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Giriş Cephesi Seçimi */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Giriş Cephesi</label>
                        <select
                          value={modelParams.mainEntranceFacadeIndex ?? 0}
                          onChange={(e) => updateParams({ mainEntranceFacadeIndex: parseInt(e.target.value) })}
                          className={`w-full p-2.5 rounded-xl border text-xs ${inputBg}`}
                        >
                          <option value={0}>Ön Cephe (Güney / Cadde Girişi)</option>
                          <option value={1}>Sağ Cephe (Doğu)</option>
                          <option value={2}>Arka Cephe (Kuzey / Bahçe Girişi)</option>
                          <option value={3}>Sol Cephe (Batı)</option>
                        </select>
                      </div>

                      {/* Girişin Cephedeki Konumu / Kaydırma */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Cephedeki Konumu (Ofset)</span>
                          <span className="font-mono text-emerald-700 font-bold">
                            {(modelParams.entranceOffset ?? 0) === 0 ? 'Merkez (0.0 m)' : `${(modelParams.entranceOffset ?? 0) > 0 ? '+' : ''}${(modelParams.entranceOffset ?? 0).toFixed(2)} m`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="-5"
                            max="5"
                            step="0.2"
                            value={modelParams.entranceOffset ?? 0}
                            onChange={(e) => updateParams({ entranceOffset: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={modelParams.entranceOffset ?? 0}
                            onChange={(e) => updateParams({ entranceOffset: parseFloat(e.target.value) || 0 })}
                            className={`w-16 p-1.5 rounded-lg border text-xs text-center font-mono ${inputBg}`}
                          />
                        </div>
                      </div>

                      {/* Giriş Kapı Genişliği */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Kapı Genişliği</span>
                          <span className="font-mono text-emerald-700 font-bold">
                            {(modelParams.entranceDoorWidth ?? 2.2).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="1.2"
                          max="4.5"
                          step="0.1"
                          value={modelParams.entranceDoorWidth ?? 2.2}
                          onChange={(e) => updateParams({ entranceDoorWidth: parseFloat(e.target.value) || 2.2 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>

                      {/* Giriş Kapı Yüksekliği */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Kapı Yüksekliği</span>
                          <span className="font-mono text-emerald-700 font-bold">
                            {(modelParams.entranceDoorHeight ?? 2.4).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="2.1"
                          max="3.5"
                          step="0.05"
                          value={modelParams.entranceDoorHeight ?? 2.4}
                          onChange={(e) => updateParams({ entranceDoorHeight: parseFloat(e.target.value) || 2.4 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>

                      {/* Giriş Saçağı / Markiz Derinliği */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Giriş Saçağı / Markiz</span>
                          <span className="font-mono text-emerald-700 font-bold">
                            {(modelParams.entranceCanopyDepth ?? 1.2).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="0.5"
                          max="3.0"
                          step="0.1"
                          value={modelParams.entranceCanopyDepth ?? 1.2}
                          onChange={(e) => updateParams({ entranceCanopyDepth: parseFloat(e.target.value) || 1.2 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>

                      {/* Giriş Basamak Sayısı */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Giriş Basamak Sayısı</span>
                          <span className="font-mono text-emerald-700 font-bold">
                            {modelParams.entranceStepsCount ?? 3} Adet
                          </span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="8"
                          step="1"
                          value={modelParams.entranceStepsCount ?? 3}
                          onChange={(e) => updateParams({ entranceStepsCount: parseInt(e.target.value) || 0 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Subsection 2: Giriş Holü & Rüzgarlık (Lobi) */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Giriş Holü & Rüzgarlık (Lobi Boyutları)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Giriş Holü Genişliği</span>
                          <span className="font-mono text-indigo-700 font-bold">
                            {(modelParams.entranceLobbyWidth ?? 3.2).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="1.8"
                          max="8.0"
                          step="0.2"
                          value={modelParams.entranceLobbyWidth ?? 3.2}
                          onChange={(e) => updateParams({ entranceLobbyWidth: parseFloat(e.target.value) || 3.2 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Giriş Holü Derinliği</span>
                          <span className="font-mono text-indigo-700 font-bold">
                            {(modelParams.entranceLobbyDepth ?? 4.0).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="2.0"
                          max="10.0"
                          step="0.2"
                          value={modelParams.entranceLobbyDepth ?? 4.0}
                          onChange={(e) => updateParams({ entranceLobbyDepth: parseFloat(e.target.value) || 4.0 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Subsection 3: Merdiven Sahanlığı & Çekirdek */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Layers className="w-3.5 h-3.5 text-sky-600" />
                      <span>Merdiven Kovası & Kat Sahanlığı</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Sahanlık Genişliği</span>
                          <span className="font-mono text-sky-700 font-bold">
                            {(modelParams.staircaseLandingWidth ?? 2.6).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="1.5"
                          max="5.0"
                          step="0.1"
                          value={modelParams.staircaseLandingWidth ?? 2.6}
                          onChange={(e) => updateParams({ staircaseLandingWidth: parseFloat(e.target.value) || 2.6 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Sahanlık Derinliği</span>
                          <span className="font-mono text-sky-700 font-bold">
                            {(modelParams.staircaseLandingDepth ?? 1.4).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="1.0"
                          max="3.0"
                          step="0.1"
                          value={modelParams.staircaseLandingDepth ?? 1.4}
                          onChange={(e) => updateParams({ staircaseLandingDepth: parseFloat(e.target.value) || 1.4 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Merdiven Kovası Genişliği</span>
                          <span className="font-mono text-sky-700 font-bold">
                            {(modelParams.stairWidth ?? 2.6).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="1.8"
                          max="5.0"
                          step="0.1"
                          value={modelParams.stairWidth ?? 2.6}
                          onChange={(e) => updateParams({ stairWidth: parseFloat(e.target.value) || 2.6 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Merdiven Kovası Derinliği</span>
                          <span className="font-mono text-sky-700 font-bold">
                            {(modelParams.stairDepth ?? 4.8).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="3.0"
                          max="8.0"
                          step="0.1"
                          value={modelParams.stairDepth ?? 4.8}
                          onChange={(e) => updateParams({ stairDepth: parseFloat(e.target.value) || 4.8 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Subsection 4: Asansör Kuyusu & Sayısı */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Asansör Kuyusu Boyutları & Sayısı</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Asansör Adedi</label>
                        <select
                          value={modelParams.elevatorCount ?? 1}
                          onChange={(e) => updateParams({ elevatorCount: parseInt(e.target.value) || 1 })}
                          className={`w-full p-2.5 rounded-xl border text-xs ${inputBg}`}
                        >
                          <option value={1}>1 Asansör</option>
                          <option value={2}>2 Asansör (Çiftli Grup)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Asansör Genişliği</span>
                          <span className="font-mono text-purple-700 font-bold">
                            {(modelParams.elevatorWidth ?? 1.8).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="1.2"
                          max="3.0"
                          step="0.1"
                          value={modelParams.elevatorWidth ?? 1.8}
                          onChange={(e) => updateParams({ elevatorWidth: parseFloat(e.target.value) || 1.8 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Asansör Derinliği</span>
                          <span className="font-mono text-purple-700 font-bold">
                            {(modelParams.elevatorDepth ?? 2.0).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="1.2"
                          max="3.0"
                          step="0.1"
                          value={modelParams.elevatorDepth ?? 2.0}
                          onChange={(e) => updateParams({ elevatorDepth: parseFloat(e.target.value) || 2.0 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CARD 3: CONTRACTOR SHARE (MÜTEAHHİT DAİRE PAYLAŞIMI) */}
            <div className={`border rounded-3xl overflow-hidden ${cardBg}`}>
              <button
                type="button"
                onClick={() => toggleSection('contractorShare')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                    3. Daire Dağılımı & Paylaşım
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span>Müteahhit Payı</span>
                  {collapsedSections.contractorShare ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </button>

              {!collapsedSections.contractorShare && (
                <div className="p-5 pt-0 space-y-4 border-t border-slate-100">
                  <div className="space-y-1.5 pt-3">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modelParams.projectModel === 'contractorShare'}
                        onChange={(e) => {
                          const isContractorModel = e.target.checked;
                          updateParams({
                            projectModel: isContractorModel ? 'contractorShare' : 'cash',
                          });
                        }}
                        className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className={`font-semibold ${textTitle}`}>Kat Karşılığı Yapım Modeli</span>
                    </label>
                    <p className={`text-[10px] ${textMuted} leading-relaxed`}>
                      Arsa sahipleri ile müteahhit arasında daire paylaşımı yapılan modeldir.
                    </p>
                  </div>

                  {modelParams.projectModel === 'contractorShare' && (
                    <div className="space-y-3.5 pt-1.5 border-t border-slate-100">
                      <div className="space-y-1">
                        <label className={`text-xs font-semibold block ${textTitle}`}>Müteahhit Daire Payı Oranı (%):</label>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={modelParams.contractorShareRate || 50}
                          onChange={(e) => updateParams({ contractorShareRate: parseFloat(e.target.value) || 50 })}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border focus:outline-hidden ${inputBg}`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={modelParams.showContractorShare3D || false}
                            onChange={(e) => updateParams({ showContractorShare3D: e.target.checked })}
                            className="rounded-sm text-amber-600 focus:ring-amber-500"
                          />
                          <span className={`font-semibold ${textTitle}`}>3D Modelde Payları Renklendir</span>
                        </label>
                        <p className={`text-[10px] ${textMuted} leading-relaxed`}>
                          3D bina modeli üzerinde müteahhite kalan daireler <span className="text-amber-600 font-bold">Turuncu</span>, hak sahiplerine kalan daireler <span className="text-emerald-600 font-bold">Yeşil</span> renk şeffaf bloklar halinde belirtilir.
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <span className={`block text-[11px] font-semibold ${textTitle}`}>
                          Daireleri 3D Model İçin Belirle:
                        </span>
                        
                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-1.5">
                          {Array.from({ length: modelParams.flatCount || 12 }).map((_, i) => {
                            const flatId = i + 1;
                            const defaultCount = Math.round((modelParams.flatCount || 12) * ((modelParams.contractorShareRate || 50) / 100));
                            const isContractor = modelParams.contractorFlatIds && modelParams.contractorFlatIds.length > 0
                              ? modelParams.contractorFlatIds.includes(flatId)
                              : flatId > ((modelParams.flatCount || 12) - defaultCount);
                            return (
                              <button
                                key={flatId}
                                type="button"
                                onClick={() => {
                                  const totalFlats = modelParams.flatCount || 12;
                                  const currentIds = modelParams.contractorFlatIds && modelParams.contractorFlatIds.length > 0
                                    ? [...modelParams.contractorFlatIds]
                                    : Array.from({ length: totalFlats })
                                        .map((_, i) => i + 1)
                                        .slice(totalFlats - defaultCount);
                                  
                                  let nextIds: number[];
                                  if (currentIds.includes(flatId)) {
                                    nextIds = currentIds.filter(id => id !== flatId);
                                  } else {
                                    nextIds = [...currentIds, flatId];
                                  }
                                  
                                  updateParams({
                                    contractorFlatIds: nextIds,
                                  });
                                }}
                                className={`py-1.5 text-xs font-mono font-bold rounded-lg border text-center transition-all ${
                                  isContractor
                                    ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                D{flatId}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1">
                          <span>
                            Seçilen: <strong>{(modelParams.contractorFlatIds && modelParams.contractorFlatIds.length > 0) ? modelParams.contractorFlatIds.length : Math.round((modelParams.flatCount || 12) * ((modelParams.contractorShareRate || 50) / 100))} / {modelParams.flatCount || 12}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              updateParams({
                                contractorFlatIds: [],
                              });
                            }}
                            className="text-indigo-600 font-medium hover:underline"
                          >
                            Otomatik Sıfırla
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        {/* İmar & Yangın Mevzuatı Otomatik Denetim Paneli */}
        <ZoningAuditPanel params={modelParams} theme={theme} />

        {/* Informational Technical Note */}
        <div className="border border-indigo-200/70 rounded-2xl p-4 text-xs flex items-start gap-3 bg-indigo-50/50 text-slate-700">
          <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className={`font-bold ${textTitle}`}>
              AB YAPI İnşaat ve Mimari Hesap Modeli
            </span>
            <p className={`leading-relaxed ${textMuted}`}>
              Burada girdiğiniz ölçüler (Ön cephe: {modelParams.facadeWidth}m, Yan cephe: {modelParams.facadeDepth}m, Kat: Z+{(modelParams.floorCount || 5) - 1}, {modelParams.hasGroundFloorShop ? `Zemin Dükkan: ${modelParams.shopCount} adet, ` : ''}Çatı:{' '}
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
  );
};
