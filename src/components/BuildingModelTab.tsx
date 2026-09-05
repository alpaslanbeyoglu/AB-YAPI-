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
  ChevronDown,
  ChevronUp,
  Store,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
  Sun,
  MapPin,
} from 'lucide-react';
import { BuildingModelParams, ProjectParams, RoomType, RoofType, AppTheme, FootprintInputMode, CustomFacadeSide } from '../types';
import {
  DEFAULT_BUILDING_PARAMS,
  calculateBuildingMetrics,
} from '../utils/buildingModelUtils';
import {
  calculateFootprint,
  getDefaultCustomFacades,
  POLYGON_PRESETS,
  calculatePolygonArea,
  getPolygonBounds,
} from '../utils/footprintUtils';
import {
  SolarLocation,
  TURKEY_CITIES,
  calculateSolarPosition,
} from '../utils/solarCalculations';
import { ThreeBuildingView } from './ThreeBuildingView';
import { FloorPlan2DView } from './FloorPlan2DView';
import { InteractiveFootprintCanvas } from './InteractiveFootprintCanvas';
import { SolarAnalysisPanel } from './SolarAnalysisPanel';
import { ZoningAuditPanel } from './ZoningAuditPanel';
import { Logo } from './Logo';

interface BuildingModelTabProps {
  params?: BuildingModelParams;
  onUpdateParams?: (updates: Partial<BuildingModelParams>) => void;
  onSyncWithCalculator?: (newParams: Partial<ProjectParams>) => void;
  onNavigateToCalculator?: () => void;
  onNavigateToFloorPlan?: () => void;
  theme?: AppTheme;
}

export const BuildingModelTab: React.FC<BuildingModelTabProps> = ({
  params: propParams,
  onUpdateParams,
  onSyncWithCalculator,
  onNavigateToCalculator,
  onNavigateToFloorPlan,
  theme = 'light',
}) => {
  const isGray = theme === 'gray';

  // Building Model Parameters (local state if not provided from parent)
  const [internalModelParams, setInternalModelParams] = useState<BuildingModelParams>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_building_model');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_BUILDING_PARAMS;
  });

  const modelParams = propParams || internalModelParams;

  // Active subview: 3D Model vs Solar Exposure vs 2D Floor Plan
  const [viewMode, setViewMode] = useState<'3d' | 'solar' | '2d'>('3d');
  const [syncedFeedback, setSyncedFeedback] = useState<string | null>(null);

  // Solar Exposure Simulation States
  const [solarLocation, setSolarLocation] = useState<SolarLocation>(TURKEY_CITIES[0]);
  const [solarSeasonId, setSolarSeasonId] = useState<string>('summer_solstice');
  const [solarTimeHour, setSolarTimeHour] = useState<number>(13.5);
  const [solarBuildingRotation, setSolarBuildingRotation] = useState<number>(0);
  const [isSolarHeatmap, setIsSolarHeatmap] = useState<boolean>(false);

  const solarPos = calculateSolarPosition(solarLocation.lat, solarSeasonId, solarTimeHour);

  // User Request: "3d model sayfasındaki ölçü girilen bölümler gizlenebilen yapıda olsun"
  // 1. Master toggle to collapse/hide the entire measurement panel for immersive 3D view
  const [showMeasurementPanel, setShowMeasurementPanel] = useState<boolean>(true);

  // 2. Collapsible accordion states for each individual measurement card
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    viewCut: false,
    dimensions: false,
    typology: false,
    roof: false,
    shafts: false,
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
        facadeWidth: modelParams.facadeWidth,
        facadeDepth: modelParams.facadeDepth,
        flatsPerFloor: modelParams.flatsPerFloor,
        facadeStyle: modelParams.facadeStyle,
        balconyDepth: modelParams.balconyDepth,
      });
      setSyncedFeedback(
        `Taban Alanı (${metrics.footprintArea} m²), ${modelParams.floorCount} Kat, ${modelParams.roofType === 'duplex' ? 'Çatı Dubleksi' : modelParams.roofType === 'mansard' ? 'Mansart Çatı' : modelParams.roofType === 'flat' ? 'Düz Teras Çatı' : 'Kırma Çatı'} ve ${metrics.totalFlats} Daire ana hesaplama tablosuna aktarıldı!`
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
          {onNavigateToCalculator && (
            <button
              type="button"
              onClick={onNavigateToCalculator}
              className="inline-flex items-center gap-1.5 font-bold underline text-emerald-800 hover:text-emerald-950"
            >
              <span>Hesaplama Tablosuna Git</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Top Header & View Switcher Bento Card */}
      <div className={`border rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${cardBg}`}>
        <div className="flex items-center gap-3.5">
          <Logo size="md" variant="icon" theme={theme} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-lg font-bold leading-tight ${textTitle}`}>
                3D Yapı Modeli & Mimari Kat Planı
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">
                İç Mekan & Dükkan
              </span>
            </div>
            <p className={`text-xs mt-1 ${textMuted}`}>
              Bina ölçüleri, iç mekan odaları, zemin dükkan & dubleks çatı simülasyonu
            </p>
          </div>
        </div>

        {/* View Switcher Controls & Measurement Toggle */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end flex-wrap">
          {/* User Request: "3d model sayfasındaki ölçü girilen bölümler gizlenebilen yapıda olsun" */}
          <button
            type="button"
            onClick={() => setShowMeasurementPanel(!showMeasurementPanel)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              !showMeasurementPanel
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : isGray
                ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
            }`}
            title="Ölçü giriş bölümlerini gizle veya göster"
          >
            {showMeasurementPanel ? (
              <>
                <PanelLeftClose className="w-4 h-4 text-indigo-600" />
                <span>Ölçü Panelini Gizle</span>
              </>
            ) : (
              <>
                <PanelLeftOpen className="w-4 h-4" />
                <span>Ölçü Panelini Göster</span>
              </>
            )}
          </button>

          {onNavigateToFloorPlan && (
            <button
              type="button"
              onClick={onNavigateToFloorPlan}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isGray
                  ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Ayrı 2D Kat Planı sekmesine git"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-600" />
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
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Box className="w-4 h-4" />
              <span>3D Model</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('solar')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'solar'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title="Harita konumu ve cephe yönlerine göre güneş alma simülasyonu"
            >
              <Sun className="w-4 h-4" />
              <span>Güneş Analizi</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === '2d'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>2D Çizim</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSyncToCalculator}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 shrink-0"
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
          <span className={`text-xl font-bold font-mono ${textTitle}`}>{metrics.footprintArea.toFixed(2)}</span>
          <span className={`text-xs ml-1 ${textMuted}`}>m²</span>
        </div>

        <div className={`border rounded-3xl p-4 text-center ${cardBg}`}>
          <span className={`text-[11px] font-medium block mb-1 ${textMuted}`}>Toplam İnşaat Alanı</span>
          <span className="text-xl font-bold text-indigo-600 font-mono">
            {metrics.totalBuiltArea.toFixed(2)}
          </span>
          <span className={`text-xs ml-1 ${textMuted}`}>m²</span>
        </div>

        <div className={`border rounded-3xl p-4 text-center ${cardBg}`}>
          <span className={`text-[11px] font-medium block mb-1 ${textMuted}`}>Bina Yüksekliği (H)</span>
          <span className={`text-xl font-bold font-mono ${textTitle}`}>{metrics.totalHeight.toFixed(2)}</span>
          <span className={`text-xs ml-1 ${textMuted}`}>m</span>
        </div>

        <div className={`border rounded-3xl p-4 text-center ${cardBg}`}>
          <span className={`text-[11px] font-medium block mb-1 ${textMuted}`}>Daire Net Alanı</span>
          <span className="text-xl font-bold text-emerald-600 font-mono">
            ~{metrics.flatNetArea.toFixed(2)}
          </span>
          <span className={`text-xs ml-1 ${textMuted}`}>m²</span>
        </div>

        <div className={`border rounded-3xl p-4 text-center col-span-2 sm:col-span-1 ${cardBg}`}>
          <span className={`text-[11px] font-medium block mb-1 ${textMuted}`}>Merdiven & Asansör</span>
          <span className="text-xl font-bold text-amber-600 font-mono">
            {metrics.coreArea.toFixed(2)}
          </span>
          <span className={`text-xs ml-1 ${textMuted}`}>m²</span>
        </div>
      </div>

      {/* Main Content Layout: Left Controls Form & Right Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Collapsible Dimension Inputs Form (User Request: Gizlenebilen Yapıda Olsun) */}
        {showMeasurementPanel && (
          <div className="lg:col-span-4 space-y-4">
            {/* Card 1: 3D Görünüm Modu & Odalar (Solid / X-Ray / Cutaway) */}
            <div className={`border rounded-3xl overflow-hidden ${cardBg}`}>
              <button
                type="button"
                onClick={() => toggleSection('viewCut')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                    3D Görünüm & İç Mekan
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span>X-Ray & Kesit</span>
                  {collapsedSections.viewCut ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </button>

              {!collapsedSections.viewCut && (
                <div className="p-5 pt-0 space-y-3.5 border-t border-slate-100">
                  <div className="grid grid-cols-3 gap-1.5 pt-3">
                    <button
                      type="button"
                      onClick={() => updateParams({ interiorCutMode: 'solid' })}
                      className={`py-2 px-1 text-center rounded-xl text-[11px] font-semibold border transition-all ${
                        modelParams.interiorCutMode === 'solid' || !modelParams.interiorCutMode
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      📐 Açık Kesit
                    </button>
                  </div>

                  {/* Furniture toggle */}
                  <div className="flex items-center justify-between pt-1">
                    <label className={`text-xs font-medium flex items-center gap-1.5 ${textTitle}`}>
                      <Armchair className="w-3.5 h-3.5 text-indigo-600" />
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
              )}
            </div>

            {/* Card 2: Facade & Building Dimensions (Collapsible) */}
            <div className={`border rounded-3xl overflow-hidden ${cardBg}`}>
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

              {!collapsedSections.dimensions && (
                <div className="p-5 pt-0 space-y-4 border-t border-slate-100">
                  {/* Footprint Input Mode Switcher */}
                  <div className="pt-3 space-y-2">
                    <label className={`block text-[11px] font-bold uppercase tracking-wider ${textTitle}`}>
                      Taban Oturumu & Cephe Modu:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateParams({ footprintInputMode: 'dimensions' })}
                        className={`py-1.5 px-1.5 text-center rounded-xl text-[11px] font-semibold border transition-all ${
                          (modelParams.footprintInputMode || 'dimensions') === 'dimensions' || modelParams.footprintInputMode === 'directArea'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        📏 Ön × Yan
                      </button>
                      <button
                        type="button"
                        onClick={() => updateParams({ footprintInputMode: 'polygonDraw' })}
                        className={`py-1.5 px-1.5 text-center rounded-xl text-[11px] font-semibold border transition-all ${
                          modelParams.footprintInputMode === 'polygonDraw'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-1 ring-indigo-400'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        ✏️ Nokta Çizim
                      </button>
                      <button
                        type="button"
                        onClick={() => updateParams({ footprintInputMode: 'customFacades' })}
                        className={`py-1.5 px-1.5 text-center rounded-xl text-[11px] font-semibold border transition-all ${
                          modelParams.footprintInputMode === 'customFacades'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        🧱 Çoklu Cephe
                      </button>
                      <button
                        type="button"
                        onClick={() => updateParams({ footprintInputMode: 'lShape' })}
                        className={`py-1.5 px-1.5 text-center rounded-xl text-[11px] font-semibold border transition-all ${
                          modelParams.footprintInputMode === 'lShape'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        🔲 L-Tipi
                      </button>
                    </div>
                  </div>

                  {/* Mode 1 & Default: Dimensions (Ön × Yan) */}
                  {(modelParams.footprintInputMode === 'dimensions' || modelParams.footprintInputMode === 'directArea' || !modelParams.footprintInputMode) && (
                    <div className="space-y-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-200">
                      {/* Facade Width */}
                      <div className="space-y-1">
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
                      </div>

                      {/* Facade Depth */}
                      <div className="space-y-1">
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
                      </div>
                    </div>
                  )}

                  {/* Mode: Freehand Polygon Point Drawing (Nokta & Çizgi Çizimi) */}
                  {modelParams.footprintInputMode === 'polygonDraw' && (
                    <div className="space-y-3 p-3 bg-slate-50/80 rounded-2xl border border-indigo-200 shadow-sm">
                      <InteractiveFootprintCanvas
                        points={modelParams.polygonPoints}
                        onChangePoints={(newPoints) => {
                          const area = calculatePolygonArea(newPoints);
                          const bounds = getPolygonBounds(newPoints);
                          updateParams({
                            polygonPoints: newPoints,
                            facadeWidth: Math.round(bounds.width * 10) / 10,
                            facadeDepth: Math.round(bounds.depth * 10) / 10,
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
                      />
                    </div>
                  )}

                  {/* Mode 2: Custom Facades (Çoklu Cephe) */}
                  {modelParams.footprintInputMode === 'customFacades' && (
                    <div className="space-y-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between gap-1 flex-wrap pb-2 border-b border-slate-200">
                        <span className="text-[11px] font-bold text-slate-800">Cephe Sayısı:</span>
                        <div className="flex items-center gap-1">
                          {[4, 5, 6, 8].map((cnt) => (
                            <button
                              key={cnt}
                              type="button"
                              onClick={() => {
                                const newSides = getDefaultCustomFacades(cnt, modelParams.facadeWidth, modelParams.facadeDepth);
                                const calc = calculateFootprint('customFacades', {
                                  customFacadeCount: cnt,
                                  customFacades: newSides,
                                });
                                updateParams({
                                  customFacadeCount: cnt,
                                  customFacades: newSides,
                                  facadeWidth: calc.effectiveWidth,
                                  facadeDepth: calc.effectiveDepth,
                                });
                              }}
                              className={`px-2 py-0.5 text-[11px] font-bold rounded-lg border transition-all ${
                                (modelParams.customFacadeCount || (modelParams.customFacades || []).length || 4) === cnt
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {cnt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {(modelParams.customFacades && modelParams.customFacades.length >= 3
                          ? modelParams.customFacades
                          : getDefaultCustomFacades(modelParams.customFacadeCount || 4, modelParams.facadeWidth, modelParams.facadeDepth)
                        ).map((side, sIdx, allSides) => (
                          <div key={side.id || sIdx} className="flex items-center justify-between gap-2 p-1.5 bg-white rounded-xl border border-slate-200">
                            <input
                              type="text"
                              value={side.name}
                              onChange={(e) => {
                                const updated = [...allSides];
                                updated[sIdx] = { ...updated[sIdx], name: e.target.value };
                                updateParams({ customFacades: updated });
                              }}
                              className="text-[11px] font-medium text-slate-700 bg-transparent border-none p-0 focus:ring-0 w-28 truncate"
                            />
                            <div className="flex items-center gap-1 font-mono font-bold text-xs text-indigo-700">
                              <input
                                type="number"
                                step="0.5"
                                min="1"
                                max="80"
                                value={side.length}
                                onChange={(e) => {
                                  const updated = [...allSides];
                                  updated[sIdx] = { ...updated[sIdx], length: parseFloat(e.target.value) || 0 };
                                  const calc = calculateFootprint('customFacades', {
                                    customFacadeCount: updated.length,
                                    customFacades: updated,
                                  });
                                  updateParams({
                                    customFacades: updated,
                                    facadeWidth: calc.effectiveWidth,
                                    facadeDepth: calc.effectiveDepth,
                                  });
                                }}
                                className={`w-16 px-1.5 py-0.5 text-right rounded-lg border ${inputBg}`}
                              />
                              <span className="text-[10px] text-slate-500 font-normal">m</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mode 3: L-Shape / Kademeli */}
                  {modelParams.footprintInputMode === 'lShape' && (
                    <div className="space-y-2.5 p-3 bg-slate-50/80 rounded-2xl border border-slate-200">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-700">Ana Ön Eni (m):</label>
                          <input
                            type="number"
                            step="0.5"
                            value={modelParams.lShapeFrontMain || 16.0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 16.0;
                              const calc = calculateFootprint('lShape', {
                                lShapeFrontMain: val,
                                lShapeDepthMain: modelParams.lShapeDepthMain || 20.0,
                                lShapeRecessFront: modelParams.lShapeRecessFront || 6.0,
                                lShapeRecessDepth: modelParams.lShapeRecessDepth || 8.0,
                              });
                              updateParams({
                                lShapeFrontMain: val,
                                facadeWidth: calc.effectiveWidth,
                                facadeDepth: calc.effectiveDepth,
                              });
                            }}
                            className={`w-full px-2 py-1 text-xs rounded-lg border font-mono font-bold ${inputBg}`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-700">Ana Derinlik (m):</label>
                          <input
                            type="number"
                            step="0.5"
                            value={modelParams.lShapeDepthMain || 20.0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 20.0;
                              const calc = calculateFootprint('lShape', {
                                lShapeFrontMain: modelParams.lShapeFrontMain || 16.0,
                                lShapeDepthMain: val,
                                lShapeRecessFront: modelParams.lShapeRecessFront || 6.0,
                                lShapeRecessDepth: modelParams.lShapeRecessDepth || 8.0,
                              });
                              updateParams({
                                lShapeDepthMain: val,
                                facadeWidth: calc.effectiveWidth,
                                facadeDepth: calc.effectiveDepth,
                              });
                            }}
                            className={`w-full px-2 py-1 text-xs rounded-lg border font-mono font-bold ${inputBg}`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-700">Girinti Önü (m):</label>
                          <input
                            type="number"
                            step="0.5"
                            value={modelParams.lShapeRecessFront || 6.0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 6.0;
                              const calc = calculateFootprint('lShape', {
                                lShapeFrontMain: modelParams.lShapeFrontMain || 16.0,
                                lShapeDepthMain: modelParams.lShapeDepthMain || 20.0,
                                lShapeRecessFront: val,
                                lShapeRecessDepth: modelParams.lShapeRecessDepth || 8.0,
                              });
                              updateParams({
                                lShapeRecessFront: val,
                                facadeWidth: calc.effectiveWidth,
                                facadeDepth: calc.effectiveDepth,
                              });
                            }}
                            className={`w-full px-2 py-1 text-xs rounded-lg border font-mono font-bold ${inputBg}`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-700">Girinti Derinlik (m):</label>
                          <input
                            type="number"
                            step="0.5"
                            value={modelParams.lShapeRecessDepth || 8.0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 8.0;
                              const calc = calculateFootprint('lShape', {
                                lShapeFrontMain: modelParams.lShapeFrontMain || 16.0,
                                lShapeDepthMain: modelParams.lShapeDepthMain || 20.0,
                                lShapeRecessFront: modelParams.lShapeRecessFront || 6.0,
                                lShapeRecessDepth: val,
                              });
                              updateParams({
                                lShapeRecessDepth: val,
                                facadeWidth: calc.effectiveWidth,
                                facadeDepth: calc.effectiveDepth,
                              });
                            }}
                            className={`w-full px-2 py-1 text-xs rounded-lg border font-mono font-bold ${inputBg}`}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Calculated Area Live Badge */}
                  <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-900">Hesaplanan Taban Alanı:</span>
                    <span className="font-mono font-bold text-indigo-700">
                      {(modelParams.facadeWidth * modelParams.facadeDepth).toFixed(1)} m²
                    </span>
                  </div>

                  {/* Floor Height */}
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

                  {/* Tabla / Konsol Çıkması (Cantilever) */}
                  <div className="pt-3 border-t border-slate-200/60 space-y-3">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modelParams.hasCantilever || false}
                        onChange={(e) => updateParams({ hasCantilever: e.target.checked })}
                        className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className={`font-semibold ${textTitle}`}>1. Kattan İtibaren Tabla Çıkması (Konsol)</span>
                    </label>

                    {modelParams.hasCantilever && (
                      <div className="pl-6 space-y-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                        {/* Cantilever Depth */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <label className={`font-medium ${textTitle}`}>Çıkma Derinliği:</label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.05"
                                min="0.5"
                                max="2.5"
                                value={modelParams.cantileverDepth || 1.2}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val > 0) updateParams({ cantileverDepth: val });
                                }}
                                className={`w-20 px-2 py-1 text-right font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                              />
                              <span className={`text-xs font-medium ${textMuted}`}>m</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="2.5"
                            step="0.05"
                            value={modelParams.cantileverDepth || 1.2}
                            onChange={(e) => updateParams({ cantileverDepth: parseFloat(e.target.value) })}
                            className="w-full accent-indigo-600 cursor-pointer"
                          />
                        </div>

                        {/* Cantilever Direction */}
                        <div className="space-y-1">
                          <label className={`block text-xs font-medium ${textTitle} mb-1`}>Çıkma Yönü:</label>
                          <select
                            value={modelParams.cantileverDirection || 'front_back'}
                            onChange={(e) => updateParams({ cantileverDirection: e.target.value as any })}
                            className={`w-full text-xs px-2.5 py-1.5 rounded-lg border focus:outline-hidden ${inputBg}`}
                          >
                            <option value="front_back">Ön ve Arka Cephe (Standart İmar)</option>
                            <option value="front">Yalnız Ön Cephe</option>
                            <option value="all">Dört Cephe Çıkmalı (Ayrık Nizam)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Card 3: Floor Counts, Flat Types & Ground Floor Shop (Collapsible) */}
            <div className={`border rounded-3xl overflow-hidden ${cardBg}`}>
              <button
                type="button"
                onClick={() => toggleSection('typology')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                    2. Kat, Daire ve Dükkan
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span>{modelParams.floorCount} Kat • {modelParams.roomType}</span>
                  {collapsedSections.typology ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </button>

              {!collapsedSections.typology && (
                <div className="p-5 pt-0 space-y-4 border-t border-slate-100">
                  {/* Floor counts */}
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <div className="space-y-1">
                      <label className={`text-xs font-semibold ${textTitle}`}>Normal Kat:</label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateParams({ floorCount: Math.max(1, modelParams.floorCount - 1) })}
                          className="px-2.5 py-1.5 rounded-lg border text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800"
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
                          className="px-2.5 py-1.5 rounded-lg border text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800"
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
                          className="px-2.5 py-1.5 rounded-lg border text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800"
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
                          className="px-2.5 py-1.5 rounded-lg border text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Ground floor commercial shop option */}
                  <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-200 space-y-2.5">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-semibold text-indigo-950 flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-indigo-600" />
                        <span>Zemin Katta Dükkan / Mağaza</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={modelParams.hasGroundFloorShop || false}
                        onChange={(e) => updateParams({ hasGroundFloorShop: e.target.checked })}
                        className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                      />
                    </label>

                    {modelParams.hasGroundFloorShop && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="text-[10px] font-medium text-slate-600 block mb-1">Dükkan Sayısı:</label>
                          <input
                            type="number"
                            min="1"
                            max="8"
                            value={modelParams.shopCount || 1}
                            onChange={(e) => updateParams({ shopCount: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            className={`w-full px-2 py-1 font-mono text-xs rounded-lg border ${inputBg}`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-slate-600 block mb-1">Tavan Boyu (m):</label>
                          <input
                            type="number"
                            step="0.1"
                            min="3.0"
                            max="6.0"
                            value={modelParams.shopHeight || 3.8}
                            onChange={(e) => updateParams({ shopHeight: parseFloat(e.target.value) || 3.8 })}
                            className={`w-full px-2 py-1 font-mono text-xs rounded-lg border ${inputBg}`}
                          />
                        </div>
                      </div>
                    )}
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
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Card 4: Roof Types with Mansard & Duplex Penthouse (Collapsible) */}
            <div className={`border rounded-3xl overflow-hidden ${cardBg}`}>
              <button
                type="button"
                onClick={() => toggleSection('roof')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-indigo-600" />
                  <span className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                    3. Çatı & Dubleks Seçenekleri
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
                      <span className="text-[10px] opacity-80 block mt-0.5">Fransız çatı & pencereli</span>
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
                      <span className="font-bold text-xs block">🌟 Çatı Dubleksi</span>
                      <span className="text-[10px] opacity-80 block mt-0.5">Dubleks daire & çatı terası</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card 5: Staircase & Elevator Core (Collapsible) */}
            <div className={`border rounded-3xl overflow-hidden ${cardBg}`}>
              <button
                type="button"
                onClick={() => toggleSection('shafts')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-600" />
                  <span className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                    4. Merdiven, Asansör & Cephe
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span>Şaft Ölçüleri</span>
                  {collapsedSections.shafts ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </button>

              {!collapsedSections.shafts && (
                <div className="p-5 pt-0 space-y-4 border-t border-slate-100">
                  {/* Stair Width & Depth */}
                  <div className="grid grid-cols-2 gap-3 pt-3">
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
              )}
            </div>

            {/* CARD 6: CONTRACTOR SHARE (MÜTEAHHİT DAİRE PAYLAŞIMI) */}
            <div className={`${cardBg} rounded-2xl border shadow-xs overflow-hidden`}>
              <button
                type="button"
                onClick={() => toggleSection('contractorShare')}
                className="w-full px-5 py-4 flex items-center justify-between text-left transition-colors hover:bg-slate-50/50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                    Daire Dağılımı & Paylaşım
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
        )}

        {/* RIGHT COLUMN: 3D Model Canvas OR Solar Exposure Simulation OR 2D Architectural Floor Plan */}
        {/* Dynamic column span: expands to 12 when measurement panel is hidden! */}
        <div className={`${showMeasurementPanel ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4 transition-all duration-300`}>
          {viewMode === '3d' && (
            <ThreeBuildingView params={modelParams} theme={theme} />
          )}

          {viewMode === 'solar' && (
            <div className="space-y-4 animate-fade-in">
              {/* Live 3D Building with Sun Light and Ground Compass */}
              <ThreeBuildingView
                params={modelParams}
                theme={theme}
                solarMode={true}
                sunAltitude={solarPos.altitude}
                sunAzimuth={solarPos.azimuth}
                buildingRotation={solarBuildingRotation}
                isSolarHeatmap={isSolarHeatmap}
              />

              {/* Interactive Solar Simulation & Map Location Control Panel */}
              <SolarAnalysisPanel
                location={solarLocation}
                onChangeLocation={setSolarLocation}
                seasonId={solarSeasonId}
                onChangeSeason={setSolarSeasonId}
                timeHour={solarTimeHour}
                onChangeTimeHour={setSolarTimeHour}
                buildingRotation={solarBuildingRotation}
                onChangeBuildingRotation={setSolarBuildingRotation}
                isHeatmap={isSolarHeatmap}
                onChangeHeatmap={setIsSolarHeatmap}
                theme={theme}
              />
            </div>
          )}

          {viewMode === '2d' && (
            <FloorPlan2DView params={modelParams} theme={theme} />
          )}

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
                Burada girdiğiniz ölçüler (Ön cephe: {modelParams.facadeWidth}m, Yan cephe: {modelParams.facadeDepth}m, Kat: {modelParams.floorCount}, {modelParams.hasGroundFloorShop ? `Zemin Dükkan: ${modelParams.shopCount} adet, ` : ''}Çatı:{' '}
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
