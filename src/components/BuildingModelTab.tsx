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
  PanelLeftClose,
  PanelLeftOpen,
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
  Layout
} from 'lucide-react';
import { BuildingModelParams, ProjectParams, RoomType, RoofType, AppTheme, FootprintInputMode, CustomFacadeSide, FacadeDetailConfig, FacadeStyleType, RoadConfig, RoadType } from '../types';
import {
  DEFAULT_BUILDING_PARAMS,
  calculateBuildingMetrics,
  FACADE_STYLES,
  getFacadeStyleConfig,
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
import { InteractiveFacadeGeometryPanel } from './InteractiveFacadeGeometryPanel';
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
    roads: false,
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
        facadeCantilevers: modelParams.facadeCantilevers,
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

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>Hesap ile Canlı Senkron</span>
          </div>

          {onNavigateToCalculator && (
            <button
              type="button"
              onClick={onNavigateToCalculator}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition-all active:scale-95 shrink-0"
              title="Hesaplama ve Proje Künyesi sayfasına git"
            >
              <span>Hesaba Git</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

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
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className={`text-sm font-bold ${textTitle}`}>
                  {viewMode === '3d'
                    ? '3D İnteraktif Yapı Modeli'
                    : viewMode === 'solar'
                    ? 'Güneş Alma & Gölge Analizi Simülasyonu'
                    : '2D Mimari Kat Planı'}
                </h3>
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

                {/* Quick Solar & Rotation Controls (Moved inside 3D View for User Access) */}
                <div className="flex items-center gap-2 p-1 rounded-xl border bg-amber-50/50 border-amber-200">
                  <div className="flex items-center gap-1.5 px-2 py-1">
                    <Sun className="w-3.5 h-3.5 text-amber-600" />
                    <input
                      type="range"
                      min="6"
                      max="20"
                      step="0.5"
                      value={solarTimeHour}
                      onChange={(e) => setSolarTimeHour(parseFloat(e.target.value))}
                      className="w-16 h-1 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      title="Güneş Saati"
                    />
                  </div>
                  <div className="w-px h-4 bg-amber-200" />
                  <div className="flex items-center gap-1.5 px-2 py-1">
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={solarBuildingRotation}
                      onChange={(e) => setSolarBuildingRotation(parseInt(e.target.value))}
                      className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      title="Yapı Rotasyonu"
                    />
                  </div>
                </div>

                <span className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-xl border ${subCardBg} ${textMuted}`}>
                  Güneş Yönü & 360° Döndürme Aktif
                </span>
              </div>
            </div>

            {viewMode === '3d' && (
              <div className="space-y-3">
                <ThreeBuildingView
                  params={modelParams}
                  theme={theme}
                  sunTimeHour={solarTimeHour}
                  buildingRotation={solarBuildingRotation}
                  sunAltitude={solarPos.altitude}
                  sunAzimuth={solarPos.azimuth}
                  onUpdateFacadeStyle={(style) => updateParams({ facadeStyle: style })}
                  onUpdateSunTimeHour={setSolarTimeHour}
                  onUpdateBuildingRotation={setSolarBuildingRotation}
                  isPlayingSun={isPlayingSolar}
                  onToggleSunPlay={() => setIsPlayingSolar(!isPlayingSolar)}
                />

                {/* Görsel Karakter & Dış Cephe Stili Hızlı Seçim Şeridi (10 Mimari Seçenek) */}
                <div className={`p-3.5 rounded-2xl border ${subCardBg} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-indigo-600" />
                      <span className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                        Görsel Karakter & Dış Cephe Stili (10 Seçenek):
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-600 font-mono">
                      Seçili: {getFacadeStyleConfig(modelParams.facadeStyle).title}
                    </span>
                  </div>

                  {/* Yatay Kaydırılabilir 10 Stil Kartları */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {FACADE_STYLES.map((st) => {
                      const isSelected = (modelParams.facadeStyle || 'wood_anthracite') === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => updateParams({ facadeStyle: st.id })}
                          className={`shrink-0 px-3 py-2 rounded-xl text-left border transition-all flex items-center gap-2.5 ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-300'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {/* Color dots */}
                          <div className="flex items-center -space-x-1 shrink-0">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white shadow-xs"
                              style={{ backgroundColor: st.wallColorHex }}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white shadow-xs"
                              style={{ backgroundColor: st.accentColorHex }}
                            />
                          </div>

                          <div className="leading-tight">
                            <span className="font-bold text-[11px] block whitespace-nowrap">
                              {st.title}
                            </span>
                            <span className={`text-[9px] block whitespace-nowrap ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                              {st.subtitle}
                            </span>
                          </div>

                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                        </button>
                      );
                    })}
                  </div>
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
                  onUpdateFacadeStyle={(style) => updateParams({ facadeStyle: style })}
                  onUpdateSunTimeHour={setSolarTimeHour}
                  onUpdateBuildingRotation={setSolarBuildingRotation}
                  isPlayingSun={isPlayingSolar}
                  onToggleSunPlay={() => setIsPlayingSolar(!isPlayingSolar)}
                />
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
          </div>
        </div>

        {/* BOTTOM SECTION: Dimension & Structural Parameter Input Cards */}
        {showMeasurementPanel && (
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

              {!collapsedSections.dimensions && (
                <div className="p-5 pt-0 space-y-4 border-t border-slate-100">
                  {/* Footprint Input Mode Switcher */}
                  <div className="pt-3 space-y-2">
                    <label className={`block text-[11px] font-bold uppercase tracking-wider ${textTitle}`}>
                      Taban Oturumu & Cephe Modu:
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-w-md">
                      <button
                        type="button"
                        onClick={() => updateParams({ footprintInputMode: 'dimensions' })}
                        className={`py-2 px-3 text-center rounded-xl text-[11px] font-semibold border transition-all ${
                          (modelParams.footprintInputMode || 'dimensions') === 'dimensions' || modelParams.footprintInputMode === 'directArea' || modelParams.footprintInputMode === 'customFacades' || modelParams.footprintInputMode === 'lShape'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        📐 Cephe Ölçüleri (4 Cephe)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateParams({ footprintInputMode: 'polygonDraw' })}
                        className={`py-2 px-3 text-center rounded-xl text-[11px] font-semibold border transition-all ${
                          modelParams.footprintInputMode === 'polygonDraw'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-1 ring-indigo-400'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        ✏️ Çizim Modu (Serbest Poligon)
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Facade Measurement & Architectural Details (Supports 4 Sides & N Polygon Edges) */}
                  {(() => {
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

                    const updateFacadeDetail = (fIdx: number, updates: Partial<FacadeDetailConfig>) => {
                      const newCfgs = [...activeCfgs];
                      newCfgs[fIdx] = {
                        ...newCfgs[fIdx],
                        ...updates,
                      };

                      if (updates.windowCountPerFloor === 0) {
                        newCfgs[fIdx].hasBalcony = false;
                        newCfgs[fIdx].balconyCountPerFloor = 0;
                      }

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
                          };
                        }
                      }

                      updateParams({
                        facadeConfigs: newCfgs,
                        customFacades: customList,
                        ...(updates.isEntrance ? { mainEntranceFacadeIndex: fIdx } : {}),
                      });
                    };

                    const handleLengthChange = (fIdx: number, val: number) => {
                      if (isNaN(val) || val < 1.0) return;
                      const safeVal = Math.round(val * 10) / 10;
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

                    return (
                      <div className="space-y-4">
                        {/* Mode 1: 4 Cepheli Canlı Geometri ve Cephe Ölçüleri (Eğer Serbest Çizim değilse) */}
                        {!isPolyDrawMode && (
                          <InteractiveFacadeGeometryPanel
                            facadeWidth={modelParams.facadeWidth || 10.0}
                            facadeDepth={modelParams.facadeDepth || 10.0}
                            backFacadeLength={modelParams.backFacadeLength}
                            leftFacadeLength={modelParams.leftFacadeLength}
                            theme={theme}
                            title="4 Cepheli Canlı Geometri & 3D Kütle Şekillendirme"
                            onUpdateFacades={(res) => {
                              updateParams({
                                facadeWidth: res.front,
                                facadeDepth: res.right,
                                backFacadeLength: res.back,
                                leftFacadeLength: res.left,
                                polygonPoints: res.quadrilateral.polygonPoints,
                                customFacades: res.customFacades,
                              });
                            }}
                          />
                        )}

                        {/* Mode: Freehand Polygon Point Drawing (Eğer Serbest Çizim modundaysa) */}
                        {modelParams.footprintInputMode === 'polygonDraw' && (
                          <div className="space-y-3 p-3 bg-slate-50/80 rounded-2xl border border-indigo-200 shadow-sm">
                            <InteractiveFootprintCanvas
                              points={modelParams.polygonPoints}
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

                        {/* Canlı Cephe Mimari Ayrıntıları Kartları (N Cephe İçin Dinamik Genişleyen) */}
                        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3.5">
                          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                            <div>
                              <span className={`text-xs font-bold uppercase tracking-wider block ${textTitle}`}>
                                Cephe Ölçüleri & Mimari Ayrıntılar ({facadeItems.length} Cephe Girişi)
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {isPolyDrawMode ? 'Poligona eklenen her kenar buraya anında yansır; ölçü, giriş ve balkon tiplerini yönetebilirsiniz.' : '4 cephenin ölçüleri, pencereleri, balkon türleri ve bina ana girişi'}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              3D Modele Reaktif Yansır
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
                              };

                              const isEntrance = fIdx === (modelParams.mainEntranceFacadeIndex || 0) || cfg.isEntrance === true;
                              const isBlind = (cfg as any).windowCountPerFloor === 0 || (cfg as any).isBlankWall === true;

                              return (
                                <div
                                  key={facadeItem.id}
                                  className={`p-3 bg-white rounded-xl border transition-all space-y-3 shadow-2xs ${
                                    isEntrance ? 'border-emerald-500 ring-1 ring-emerald-400/40 bg-emerald-50/10' : 'border-slate-200/90'
                                  }`}
                                >
                                  {/* Facade Title & Length Input */}
                                  <div className="space-y-1.5 pb-2 border-b border-slate-100">
                                    <div className="flex items-center justify-between text-xs">
                                      <label className={`font-bold truncate max-w-[130px] ${isEntrance ? 'text-emerald-700' : textTitle}`}>
                                        {facadeItem.label}:
                                      </label>
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          step="0.1"
                                          min="1"
                                          max="60"
                                          value={facadeItem.value}
                                          onChange={(e) => handleLengthChange(fIdx, parseFloat(e.target.value))}
                                          className={`w-16 px-2 py-1 text-right font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                                        />
                                        <span className={`text-xs font-medium ${textMuted}`}>m</span>
                                      </div>
                                    </div>
                                    <input
                                      type="range"
                                      min="1"
                                      max="40"
                                      step="0.5"
                                      value={facadeItem.value}
                                      onChange={(e) => handleLengthChange(fIdx, parseFloat(e.target.value))}
                                      className="w-full accent-indigo-600 cursor-pointer"
                                    />
                                  </div>

                                  {/* Bina Ana Girişi Seçimi (Radio Button) */}
                                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-800">
                                      <input
                                        type="radio"
                                        name="mainBuildingEntranceRadio"
                                        checked={isEntrance}
                                        onChange={() => updateFacadeDetail(fIdx, { isEntrance: true })}
                                        className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer"
                                      />
                                      <span>🚪 Bina Girişi Bu Cephede</span>
                                    </label>
                                    {isEntrance && (
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                                        Ana Giriş
                                      </span>
                                    )}
                                  </div>

                                  {/* Kör Cephe Onay Kutusu */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={isBlind}
                                          onChange={(e) => {
                                            const isChecked = e.target.checked;
                                            updateFacadeDetail(fIdx, {
                                              windowCountPerFloor: isChecked ? 0 : 2,
                                              hasBalcony: !isChecked,
                                              balconyCountPerFloor: isChecked ? 0 : 1,
                                            });
                                          }}
                                          className="rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span>🧱 Kör Cephe (Penceresiz)</span>
                                      </label>
                                      {isBlind && (
                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                          Dolu Duvar
                                        </span>
                                      )}
                                    </div>

                                    {/* Window Count Selection */}
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-slate-600 font-medium">Pencere Sayısı:</span>
                                        <span className="font-mono font-bold text-indigo-700">{cfg.windowCountPerFloor} Adet</span>
                                      </div>
                                      <select
                                        disabled={isBlind}
                                        value={cfg.windowCountPerFloor}
                                        onChange={(e) => {
                                          const wCount = parseInt(e.target.value, 10);
                                          updateFacadeDetail(fIdx, { windowCountPerFloor: wCount });
                                        }}
                                        className={`w-full px-2 py-1 text-xs rounded-lg border font-semibold ${
                                          isBlind ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : inputBg
                                        }`}
                                      >
                                        <option value={0}>0 (Kör / Penceresiz)</option>
                                        <option value={1}>1 Pencere</option>
                                        <option value={2}>2 Pencere</option>
                                        <option value={3}>3 Pencere</option>
                                        <option value={4}>4 Pencere</option>
                                        <option value={5}>5 Pencere</option>
                                        <option value={6}>6 Pencere</option>
                                      </select>
                                    </div>

                                    {/* Balcony Options & Types */}
                                    <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                                      <div className="flex items-center justify-between text-[11px]">
                                        <label className="flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            disabled={isBlind}
                                            checked={!isBlind && cfg.hasBalcony}
                                            onChange={(e) => {
                                              const hasB = e.target.checked;
                                              updateFacadeDetail(fIdx, {
                                                hasBalcony: hasB,
                                                balconyCountPerFloor: hasB ? 1 : 0,
                                              });
                                            }}
                                            className="rounded text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                          />
                                          <span className="font-semibold">🏞️ Balkon Ekle</span>
                                        </label>
                                      </div>

                                      {!isBlind && cfg.hasBalcony && (
                                        <div className="space-y-2 pt-1">
                                          <div className="grid grid-cols-2 gap-1.5">
                                            <div>
                                              <span className="block text-[10px] text-slate-500 font-semibold mb-0.5">Adet:</span>
                                              <select
                                                value={cfg.balconyCountPerFloor || 1}
                                                onChange={(e) => updateFacadeDetail(fIdx, { balconyCountPerFloor: parseInt(e.target.value, 10) })}
                                                className={`w-full px-1.5 py-1 text-[11px] font-semibold rounded-md border ${inputBg}`}
                                              >
                                                <option value={1}>1 Balkon</option>
                                                <option value={2}>2 Balkon</option>
                                                <option value={3}>3 Balkon</option>
                                              </select>
                                            </div>
                                            <div>
                                              <span className="block text-[10px] text-slate-500 font-semibold mb-0.5">Balkon Türü:</span>
                                              <select
                                                value={cfg.balconyType || 'standard'}
                                                onChange={(e) => updateFacadeDetail(fIdx, { balconyType: e.target.value as any })}
                                                className={`w-full px-1.5 py-1 text-[11px] font-semibold rounded-md border ${inputBg}`}
                                              >
                                                <option value="standard">Açık Konsol (Klasik)</option>
                                                <option value="glass_enclosed">Katlanır Cam Balkon</option>
                                                <option value="recessed">Gömme Lojya</option>
                                                <option value="french">Fransız Balkon</option>
                                                <option value="corner">Köşe / L-Tipi</option>
                                                <option value="cumba">Cumba (Kapalı)</option>
                                              </select>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Calculated Area Live Badge */}
                  <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-900">Hesaplanan Taban Alanı:</span>
                    <span className="font-mono font-bold text-indigo-700">
                      {(modelParams.facadeWidth * modelParams.facadeDepth).toFixed(1)} m²
                    </span>
                  </div>

                  {/* Horizontal Sub-Parameters Row: Floor Height, Balcony, Cantilever */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-200/60">
                    {/* Floor Height */}
                    <div className="space-y-1.5 p-3 bg-slate-50/60 rounded-2xl border border-slate-100">
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
                            className={`w-16 px-1.5 py-0.5 text-right font-mono font-bold text-xs rounded-lg border ${inputBg}`}
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
                    <div className="space-y-1.5 p-3 bg-slate-50/60 rounded-2xl border border-slate-100">
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
                            className={`w-16 px-1.5 py-0.5 text-right font-mono font-bold text-xs rounded-lg border ${inputBg}`}
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
                    <div className="p-3 bg-slate-50/60 rounded-2xl border border-slate-100 space-y-2">
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={modelParams.hasCantilever || false}
                          onChange={(e) => updateParams({ hasCantilever: e.target.checked })}
                          className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className={`font-semibold ${textTitle}`}>Tabla Çıkması (Konsol)</span>
                      </label>

                      {modelParams.hasCantilever && (
                        <div className="space-y-4 pt-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[11px] font-bold text-slate-700">Genel Çıkma Modu:</span>
                            <select
                              value={modelParams.cantileverDirection || 'front_back'}
                              onChange={(e) => updateParams({ cantileverDirection: e.target.value as any })}
                              className={`w-32 text-[10px] px-2 py-1 rounded-lg border focus:outline-hidden ${inputBg}`}
                            >
                              <option value="front_back">Ön ve Arka</option>
                              <option value="front">Yalnız Ön</option>
                              <option value="all">Dört Cephe</option>
                            </select>
                          </div>

                          <div className="space-y-2.5 p-3 bg-white/50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Layout className="w-3.5 h-3.5 text-indigo-600" />
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">Cephe Bazlı Çıkmalar (m)</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                              {[
                                { label: 'Ön Cephe', idx: 0 },
                                { label: 'Sağ Yan', idx: 1 },
                                { label: 'Arka Cephe', idx: 2 },
                                { label: 'Sol Yan', idx: 3 }
                              ].map((f) => (
                                <div key={f.idx} className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-500">{f.label}:</span>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="2.5"
                                    value={modelParams.facadeCantilevers?.[f.idx] !== undefined ? modelParams.facadeCantilevers[f.idx] : (
                                      modelParams.cantileverDirection === 'all' ? (modelParams.cantileverDepth || 1.2) :
                                      modelParams.cantileverDirection === 'front_back' && (f.idx === 0 || f.idx === 2) ? (modelParams.cantileverDepth || 1.2) :
                                      modelParams.cantileverDirection === 'front' && f.idx === 0 ? (modelParams.cantileverDepth || 1.2) : 0
                                    )}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      if (!isNaN(val) && val >= 0) {
                                        const next = [...(modelParams.facadeCantilevers || [0,0,0,0])];
                                        // Initialize if empty
                                        if (next.length < 4) {
                                          const base = modelParams.cantileverDepth || 1.2;
                                          if (modelParams.cantileverDirection === 'all') next.splice(0, 4, base, base, base, base);
                                          else if (modelParams.cantileverDirection === 'front_back') next.splice(0, 4, base, 0, base, 0);
                                          else if (modelParams.cantileverDirection === 'front') next.splice(0, 4, base, 0, 0, 0);
                                          else next.splice(0, 4, 0, 0, 0, 0);
                                        }
                                        next[f.idx] = val;
                                        updateParams({ facadeCantilevers: next });
                                      }
                                    }}
                                    className={`w-12 px-1.5 py-0.5 text-right font-mono font-bold text-[10px] rounded border ${inputBg}`}
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[9px] text-slate-400 italic">Değerleri tek tek özelleştirebilirsiniz.</span>
                              <button 
                                onClick={() => updateParams({ facadeCantilevers: undefined })}
                                className="text-[9px] text-indigo-600 font-bold hover:underline"
                              >
                                Sıfırla
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
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

            {/* Card 3: Roads & Environment (Yol & Çevre Bilgileri) */}
            <div className={`border rounded-3xl overflow-hidden ${cardBg}`}>
              <button
                type="button"
                onClick={() => toggleSection('roads')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-indigo-600" />
                  <span className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                    3. Yol & Çevre Bilgileri
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span>{modelParams.roads?.length || 0} Yol</span>
                  {collapsedSections.roads ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </button>

              {!collapsedSections.roads && (
                <div className="p-5 pt-0 space-y-4 border-t border-slate-100">
                  <div className="pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold ${textTitle}`}>Mevcut Yollar:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const currentRoads = modelParams.roads || [];
                          const newRoad: RoadConfig = {
                            id: Math.random().toString(36).substr(2, 9),
                            facadeIndex: 0,
                            type: 'street',
                            width: 7
                          };
                          updateParams({ roads: [...currentRoads, newRoad] });
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-all shadow-xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Yeni Yol Ekle</span>
                      </button>
                    </div>

                    {(modelParams.roads || []).length === 0 ? (
                      <div className="p-4 border border-dashed border-slate-200 rounded-2xl text-center">
                        <Milestone className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                        <p className="text-[10px] text-slate-400">Henüz yol tanımlanmadı. Binanın cephelerine yol ekleyerek vaziyet planını netleştirebilirsiniz.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(modelParams.roads || []).map((road, idx) => (
                          <div key={road.id} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-slate-100 rounded-lg">
                                  <Navigation className="w-3.5 h-3.5 text-slate-600" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-800">{idx + 1}. Yol Tanımı</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextRoads = (modelParams.roads || []).filter(r => r.id !== road.id);
                                  updateParams({ roads: nextRoads });
                                }}
                                className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Cephe:</label>
                                <select
                                  value={road.facadeIndex}
                                  onChange={(e) => {
                                    const nextRoads = (modelParams.roads || []).map(r => 
                                      r.id === road.id ? { ...r, facadeIndex: parseInt(e.target.value) } : r
                                    );
                                    updateParams({ roads: nextRoads });
                                  }}
                                  className={`w-full px-2 py-1.5 text-xs rounded-lg border focus:outline-hidden ${inputBg}`}
                                >
                                  {(modelParams.facadeConfigs || Array.from({ length: 4 })).map((_, fIdx) => (
                                    <option key={fIdx} value={fIdx}>
                                      {fIdx === 0 ? 'Ön Cephe' : fIdx === 1 ? 'Sağ Cephe' : fIdx === 2 ? 'Arka Cephe' : fIdx === 3 ? 'Sol Cephe' : `${fIdx + 1}. Cephe`}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Yol Tipi:</label>
                                <select
                                  value={road.type}
                                  onChange={(e) => {
                                    const typeId = e.target.value as RoadType;
                                    const typeData = ROAD_TYPES_DATA.find(t => t.id === typeId);
                                    const nextRoads = (modelParams.roads || []).map(r => 
                                      r.id === road.id ? { ...r, type: typeId, width: typeData?.width || 7 } : r
                                    );
                                    updateParams({ roads: nextRoads });
                                  }}
                                  className={`w-full px-2 py-1.5 text-xs rounded-lg border focus:outline-hidden ${inputBg}`}
                                >
                                  {ROAD_TYPES_DATA.map(t => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CARD 4: CONTRACTOR SHARE (MÜTEAHHİT DAİRE PAYLAŞIMI) */}
            <div className={`border rounded-3xl overflow-hidden ${cardBg}`}>
              <button
                type="button"
                onClick={() => toggleSection('contractorShare')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                    4. Daire Dağılımı & Paylaşım
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
  );
};
