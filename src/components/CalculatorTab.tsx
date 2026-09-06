import React, { useState } from 'react';
import {
  Building,
  Calculator,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Users,
  Layers,
  Store,
  Home,
  CheckCircle2,
  Settings2,
  Percent,
  Ruler,
  Box,
  ArrowRight,
  Sparkles,
  Plus,
  Trash2,
  Sliders,
  Info,
  Compass,
  BarChart3,
  Palette,
} from 'lucide-react';
import { ProjectParams, CalculationResult, FlatItem, AppTheme, FootprintInputMode, CustomFacadeSide, BuildingModelParams } from '../types';
import {
  calculateFootprint,
  getDefaultCustomFacades,
  buildQuadrilateralPolygon,
  QuadrilateralResult,
  DEFAULT_CUSTOM_FACADES_4,
  DEFAULT_CUSTOM_FACADES_5,
  DEFAULT_CUSTOM_FACADES_6,
  DEFAULT_CUSTOM_FACADES_8,
  calculatePolygonArea,
  getPolygonBounds,
  POLYGON_PRESETS,
  InteractiveFacadeUpdateResult,
} from '../utils/footprintUtils';
import { InteractiveFacadeGeometryPanel } from './InteractiveFacadeGeometryPanel';
import { InteractiveFootprintCanvas } from './InteractiveFootprintCanvas';
import { ThreeBuildingView } from './ThreeBuildingView';
import { ZoningAuditPanel } from './ZoningAuditPanel';

interface CalculatorTabProps {
  params: ProjectParams;
  results: CalculationResult;
  onChangeParams: (newParams: ProjectParams) => void;
  onCalculate: () => void;
  onNavigateToModel?: () => void;
  onNavigateToCostDetails?: () => void;
  onNavigateToOwners?: () => void;
  theme?: AppTheme;
}

export const CalculatorTab: React.FC<CalculatorTabProps> = ({
  params,
  results,
  onChangeParams,
  onCalculate,
  onNavigateToModel,
  onNavigateToCostDetails,
  onNavigateToOwners,
  theme = 'light',
}) => {
  const isGray = theme === 'gray';

  const calcBuildingModelParams: BuildingModelParams = React.useMemo(() => {
    const resFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
    const calcFlatsPerFloor = Math.max(
      1,
      Math.min(4, Math.round(params.flatCount / Math.max(1, resFloors)))
    );

    return {
      facadeWidth: params.facadeWidth || 14,
      facadeDepth: params.facadeDepth || 18,
      floorCount: params.floorCount,
      flatsPerFloor: params.flatsPerFloor || calcFlatsPerFloor,
      flatArea: params.apartmentSize,
      hasGroundFloorShop: !!params.hasGroundFloorShop,
      shopCount: params.shopCount || 1,
      shopHeight: params.shopHeight || 3.8,
      footprintInputMode: params.footprintInputMode || 'polygonDraw',
      polygonPoints: params.polygonPoints,
      facadeConfigs: params.facadeConfigs,
      mainEntranceFacadeIndex: params.mainEntranceFacadeIndex || 0,
      customFacadeCount: params.customFacadeCount,
      customFacades: params.customFacades,
      facadeStyle: 'modern_glass',
      roofType: params.roofType || 'gable',
      basementCount: params.basementCount !== undefined ? params.basementCount : 1,
      showCoreHighlight: true,
      balconyDepth: 1.4,
      cantileverDepth: 1.2,
      cantileverFloors: 'all_upper',
    };
  }, [params]);

  // Request: "Kat malikleri bilgiler kısmı varsayılan gizli gelsin."
  const [isFlatsOpen, setIsFlatsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'project' | 'structure'>('project');
  const [activeCostTab, setActiveCostTab] = useState<'sozlesme' | 'kaba' | 'ince' | 'malik' | 'gelir'>('sozlesme');
  const [bulkDownPayment, setBulkDownPayment] = useState<number>(0);

  const cardBg = isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200';
  const innerCardBg = isGray ? 'bg-white/90 border-slate-300' : 'bg-slate-50 border-slate-200';
  const inputBg = isGray
    ? 'bg-white border-slate-300 hover:border-slate-400 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500/30'
    : 'bg-white border-slate-300 hover:border-slate-400 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500/30';
  const labelColor = isGray ? 'text-slate-700' : 'text-slate-600';

  // Active Footprint and Facade Calculation
  const activeFootprintMode: FootprintInputMode = params.footprintInputMode || 'directArea';
  const customFacadesList = params.customFacades && params.customFacades.length >= 3
    ? params.customFacades
    : getDefaultCustomFacades(params.customFacadeCount || 4, params.facadeWidth || 14, params.facadeDepth || 18);

  const footprintCalc = calculateFootprint(activeFootprintMode, {
    baseBuildArea: params.baseBuildArea,
    facadeWidth: params.facadeWidth || 14,
    facadeDepth: params.facadeDepth || 18,
    customFacadeCount: params.customFacadeCount || customFacadesList.length,
    customFacades: customFacadesList,
    lShapeFrontMain: params.lShapeFrontMain || 16.0,
    lShapeDepthMain: params.lShapeDepthMain || 20.0,
    lShapeRecessFront: params.lShapeRecessFront || 6.0,
    lShapeRecessDepth: params.lShapeRecessDepth || 8.0,
  });

  const handleFootprintUpdate = (updates: Partial<ProjectParams>) => {
    const merged = { ...params, ...updates };
    const mode = merged.footprintInputMode || activeFootprintMode;
    const calc = calculateFootprint(mode, {
      baseBuildArea: merged.baseBuildArea,
      facadeWidth: merged.facadeWidth ?? params.facadeWidth ?? 14,
      facadeDepth: merged.facadeDepth ?? params.facadeDepth ?? 18,
      customFacadeCount: merged.customFacadeCount ?? params.customFacadeCount ?? 4,
      customFacades: merged.customFacades ?? customFacadesList,
      lShapeFrontMain: merged.lShapeFrontMain ?? params.lShapeFrontMain ?? 16.0,
      lShapeDepthMain: merged.lShapeDepthMain ?? params.lShapeDepthMain ?? 20.0,
      lShapeRecessFront: merged.lShapeRecessFront ?? params.lShapeRecessFront ?? 6.0,
      lShapeRecessDepth: merged.lShapeRecessDepth ?? params.lShapeRecessDepth ?? 8.0,
    });

    const newBaseArea = calc.area;
    const total = newBaseArea * merged.floorCount;
    const avg = parseFloat((total / merged.flatCount).toFixed(1));
    const updatedFlats = merged.flats.map((f) => ({ ...f, area: avg }));

    onChangeParams({
      ...merged,
      baseBuildArea: newBaseArea,
      facadeWidth: calc.effectiveWidth,
      facadeDepth: calc.effectiveDepth,
      flats: updatedFlats,
    });
  };

  const updateParam = <K extends keyof ProjectParams>(key: K, value: ProjectParams[K]) => {
    onChangeParams({
      ...params,
      [key]: value,
    });
  };

  const handleFlatChange = (index: number, field: keyof FlatItem, value: any) => {
    const updated = [...params.flats];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    updateParam('flats', updated);
  };

  const handleApplyBulkDownPayment = () => {
    const updated = params.flats.map((f) => ({
      ...f,
      downPayment: bulkDownPayment,
    }));
    updateParam('flats', updated);
    onCalculate();
  };

  const handleFlatCountChange = (count: number) => {
    const newCount = Math.max(1, count);
    onChangeParams({
      ...params,
      flatCount: newCount,
    });
  };

  // Helper for live 4-facade geometry calculation
  const handleFacadeChange = (wVal: number, dVal: number, backVal?: number, leftVal?: number) => {
    const quad = buildQuadrilateralPolygon(wVal, dVal, backVal, leftVal);
    const newCustom = getDefaultCustomFacades(4, quad.front, quad.right, quad.back, quad.left);
    onChangeParams({
      ...params,
      facadeWidth: quad.front,
      facadeDepth: quad.right,
      backFacadeLength: quad.back,
      leftFacadeLength: quad.left,
      baseBuildArea: quad.area,
      polygonPoints: quad.polygonPoints,
      customFacades: newCustom,
      footprintInputMode: 'polygonDraw',
    });
  };

  const currentQuad = buildQuadrilateralPolygon(
    params.facadeWidth || 10,
    params.facadeDepth || 10,
    params.backFacadeLength,
    params.leftFacadeLength
  );

  // Live stage percentage validator
  const stageTotal =
    params.stage1Pay +
    params.stage2Pay +
    params.stage3Pay +
    params.stage4Pay +
    params.stage5Pay;
  const isStageValid = Math.abs(stageTotal - 100) < 0.01;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="w-full space-y-6">
        {/* Validation alert if stages do not total 100% */}
        {!isStageValid && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between font-medium">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Aşama hakediş oranlarının toplamı %100 olmalıdır! (Şu anki Toplam: %{stageTotal.toFixed(1)})
              </span>
            </div>
            <span className="font-mono">
              {stageTotal < 100
                ? `Kalan: %${(100 - stageTotal).toFixed(1)}`
                : `Fazlalık: %${(stageTotal - 100).toFixed(1)}`}
            </span>
          </div>
        )}

        {/* Proje Künyesi & Yapı Bilgileri */}
        <div className="animate-fade-in space-y-5">
            <div className={`${cardBg} rounded-3xl border p-6 shadow-sm space-y-6`}>
              {/* Header & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      PROJE KÜNYESİ VE YAPI BİLGİLERİ
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Tüm hesap ve 3D model verilerini buradan manuel girebilirsiniz. Değişiklikler canlı olarak model ve hesaplara aktarılır.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Canlı 3D Model Senkronu Aktif</span>
                  </span>
                </div>
              </div>

              {/* Live Scannable Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Arsa Alanı</span>
                  <div className="text-xs font-mono font-bold text-slate-800">{params.landArea || 0} m²</div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Taban Oturumu (TAKS)</span>
                  <div className="text-xs font-mono font-bold text-indigo-900">
                    {params.baseBuildArea || 0} m² <span className="text-[10px] font-normal text-indigo-500">(%{params.landArea ? ((params.baseBuildArea / params.landArea) * 100).toFixed(1) : 0})</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Toplam Kat</span>
                  <div className="text-xs font-mono font-bold text-slate-800">
                    {params.floorCount} Kat {params.hasGroundFloorShop ? `(Zemin Dükkan + ${Math.max(1, params.floorCount - 1)} Kat)` : ''}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Katta Daire</span>
                  <div className="text-xs font-mono font-bold text-slate-800">{params.flatsPerFloor || 2} Adet</div>
                </div>
                <div className="space-y-0.5 col-span-2 sm:col-span-1 lg:col-span-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Toplam Bağımsız Bölüm</span>
                  <div className="text-xs font-mono font-bold text-emerald-900">
                    {params.hasGroundFloorShop
                      ? `${(params.flatCount || 10) + (params.shopCount || 1)} Adet (${params.flatCount || 10} Daire, ${params.shopCount || 1} Dükkan)`
                      : `${params.flatCount || 10} Adet (${params.flatCount || 10} Daire)`}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Toplam İnşaat</span>
                  <div className="text-xs font-mono font-bold text-slate-800">
                    {((results?.totalArea || (params.baseBuildArea * params.floorCount)) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} m²
                  </div>
                </div>
              </div>

              {/* Main Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Yapı / Proje Adresi */}
                <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
                  <label className={`block text-xs font-bold ${labelColor} uppercase`}>
                    Yapı / Proje Adresi:
                  </label>
                  <input
                    type="text"
                    value={params.projectAddress}
                    onChange={(e) => updateParam('projectAddress', e.target.value)}
                    placeholder="Örn: İstanbul, Fatih, 1024 Ada 15 Parsel"
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all font-medium ${inputBg}`}
                  />
                </div>

                {/* 1. Proje Arsa Alanı */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Proje Arsa Alanı (m²):</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={params.landArea || ''}
                      onChange={(e) => updateParam('landArea', Math.max(0, parseFloat(e.target.value) || 0))}
                      className={`w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">m²</span>
                  </div>
                </div>

                {/* 2. Taban Oturumu / Kat Alanı (m²) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Taban Oturumu / Kat Alanı (m²):</label>
                    <span className="text-[10px] font-mono text-slate-500">
                      {params.facadeWidth && params.facadeDepth ? `~${params.facadeWidth}m × ${params.facadeDepth}m` : ''}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={params.baseBuildArea || ''}
                      onChange={(e) => {
                        const area = Math.max(0, parseFloat(e.target.value) || 0);
                        onChangeParams({
                          ...params,
                          baseBuildArea: area,
                        });
                      }}
                      className={`w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">m²</span>
                  </div>
                </div>

                {/* 3. Bahçe & Parsel Açık Alanı (Oturum / TAKS Dengesi) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-emerald-700 uppercase">Bahçe / Açık Alan (m²):</label>
                    <span className="text-[10px] font-bold text-emerald-600 font-mono">
                      TAKS: %{params.landArea && params.baseBuildArea ? Math.min(100, (params.baseBuildArea / params.landArea) * 100).toFixed(1) : 0}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={`${Math.max(0, (params.landArea || 0) - (params.baseBuildArea || 0)).toLocaleString('tr-TR')} m²`}
                      className="w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 text-emerald-900 cursor-default"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-semibold text-emerald-600">Açık Parsel</span>
                  </div>
                </div>

                {/* 4 Cepheli Canlı Geometri ve Cephe Ölçüleri (Tam Genişlik CAD Paneli) */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <InteractiveFacadeGeometryPanel
                    facadeWidth={params.facadeWidth || 10.0}
                    facadeDepth={params.facadeDepth || 10.0}
                    backFacadeLength={params.backFacadeLength}
                    leftFacadeLength={params.leftFacadeLength}
                    theme={theme}
                    title="Bina Cephe Ölçüleri & Geometrik Hesaplama"
                    onUpdateFacades={(res) => {
                      onChangeParams({
                        ...params,
                        facadeWidth: res.front,
                        facadeDepth: res.right,
                        backFacadeLength: res.back,
                        leftFacadeLength: res.left,
                        baseBuildArea: res.quadrilateral.area,
                        polygonPoints: res.quadrilateral.polygonPoints,
                        customFacades: res.customFacades,
                      });
                    }}
                  />
                </div>

                {/* Zemin Kat Ticari Dükkan Paneli */}
                <div className="sm:col-span-2 lg:col-span-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!params.hasGroundFloorShop}
                        onChange={(e) => {
                          const hasShop = e.target.checked;
                          const normalFloors = hasShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
                          const flatsPerFloor = params.flatsPerFloor || 2;
                          const totalFlats = normalFloors * flatsPerFloor;
                          onChangeParams({
                            ...params,
                            hasGroundFloorShop: hasShop,
                            flatCount: totalFlats,
                          });
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex items-center gap-2">
                        <Store className={`w-4 h-4 transition-colors ${params.hasGroundFloorShop ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-slate-900 uppercase">Zemin Kat Ticari (Dükkan / Mağaza)</span>
                      </div>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {params.hasGroundFloorShop ? 'Zemin kat dükkan olarak ayrıldı, üst katlar konuttur.' : 'Zemin kat dahil tüm katlar konut olarak planlandı.'}
                    </span>
                  </div>

                  {params.hasGroundFloorShop && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase">Dükkan Adedi:</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={params.shopCount || 1}
                          onChange={(e) => updateParam('shopCount', parseInt(e.target.value) || 1)}
                          className={`w-full text-xs px-3 py-2 rounded-xl border ${inputBg}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase">Dükkan Kat Yüksekliği (m):</label>
                        <input
                          type="number"
                          step="0.1"
                          min="3.0"
                          max="6.0"
                          value={params.shopHeight || 3.8}
                          onChange={(e) => updateParam('shopHeight', parseFloat(e.target.value) || 3.8)}
                          className={`w-full text-xs px-3 py-2 rounded-xl border ${inputBg}`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Toplam Kat Sayısı (Manuel Girilebilir & Stepper & Hızlı Butonlar) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-indigo-700 uppercase">Toplam Kat Sayısı:</label>
                    <span className="text-[10px] font-bold text-slate-500 font-mono">
                      {params.hasGroundFloorShop ? `${Math.max(1, params.floorCount - 1)} Konut + 1 Dükkan` : `${params.floorCount} Kat`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const nextCount = Math.max(1, params.floorCount - 1);
                        const normalFloors = params.hasGroundFloorShop ? Math.max(1, nextCount - 1) : nextCount;
                        const totalFlats = normalFloors * (params.flatsPerFloor || 2);
                        onChangeParams({
                          ...params,
                          floorCount: nextCount,
                          flatCount: totalFlats,
                        });
                      }}
                      className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center justify-center text-lg active:scale-95 transition-all shadow-2xs"
                    >
                      -
                    </button>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={params.floorCount}
                        onChange={(e) => {
                          const count = Math.max(1, parseInt(e.target.value) || 1);
                          const normalFloors = params.hasGroundFloorShop ? Math.max(1, count - 1) : count;
                          const totalFlats = normalFloors * (params.flatsPerFloor || 2);
                          onChangeParams({
                            ...params,
                            floorCount: count,
                            flatCount: totalFlats,
                          });
                        }}
                        className={`w-full text-center text-sm font-mono font-bold px-3 py-2 rounded-xl border transition-all ${inputBg}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextCount = params.floorCount + 1;
                        const normalFloors = params.hasGroundFloorShop ? Math.max(1, nextCount - 1) : nextCount;
                        const totalFlats = normalFloors * (params.flatsPerFloor || 2);
                        onChangeParams({
                          ...params,
                          floorCount: nextCount,
                          flatCount: totalFlats,
                        });
                      }}
                      className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center justify-center text-lg active:scale-95 transition-all shadow-2xs"
                    >
                      +
                    </button>
                  </div>
                  {/* Hızlı Kat Butonları */}
                  <div className="flex gap-1 pt-1">
                    {[3, 4, 5, 6, 8, 10].map((fl) => (
                      <button
                        key={fl}
                        type="button"
                        onClick={() => {
                          const normalFloors = params.hasGroundFloorShop ? Math.max(1, fl - 1) : fl;
                          const totalFlats = normalFloors * (params.flatsPerFloor || 2);
                          onChangeParams({
                            ...params,
                            floorCount: fl,
                            flatCount: totalFlats,
                          });
                        }}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                          params.floorCount === fl
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {fl}K
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Kattaki Daire Sayısı (Manuel Girilebilir & Stepper & Butonlar) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-indigo-700 uppercase">Kattaki Daire Sayısı:</label>
                    <span className="text-[10px] font-bold text-indigo-600 font-mono">Katta {params.flatsPerFloor || 2} Daire</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const nextFlats = Math.max(1, (params.flatsPerFloor || 2) - 1);
                        const normalFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
                        onChangeParams({
                          ...params,
                          flatsPerFloor: nextFlats,
                          flatCount: normalFloors * nextFlats,
                        });
                      }}
                      className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center justify-center text-lg active:scale-95 transition-all shadow-2xs"
                    >
                      -
                    </button>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={params.flatsPerFloor || 2}
                        onChange={(e) => {
                          const num = Math.max(1, parseInt(e.target.value) || 1);
                          const normalFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
                          onChangeParams({
                            ...params,
                            flatsPerFloor: num,
                            flatCount: normalFloors * num,
                          });
                        }}
                        className={`w-full text-center text-sm font-mono font-bold px-3 py-2 rounded-xl border transition-all ${inputBg}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextFlats = (params.flatsPerFloor || 2) + 1;
                        const normalFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
                        onChangeParams({
                          ...params,
                          flatsPerFloor: nextFlats,
                          flatCount: normalFloors * nextFlats,
                        });
                      }}
                      className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center justify-center text-lg active:scale-95 transition-all shadow-2xs"
                    >
                      +
                    </button>
                  </div>
                  {/* Hızlı Katta Daire Butonları */}
                  <div className="flex gap-1 pt-1">
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          const normalFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
                          onChangeParams({
                            ...params,
                            flatsPerFloor: num,
                            flatCount: normalFloors * num,
                          });
                        }}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                          params.flatsPerFloor === num
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 7. Toplam Daire Sayısı (Manuel Girilebilir & Kattan Hesapla Butonu) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Toplam Daire Sayısı:</label>
                    <button
                      type="button"
                      onClick={() => {
                        const normalFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
                        const calcTotal = normalFloors * (params.flatsPerFloor || 2);
                        onChangeParams({
                          ...params,
                          flatCount: calcTotal,
                        });
                      }}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                      title="Kat × Katta Daire formülü ile güncelle"
                    >
                      <span>⚡ Kattan Hesapla ({params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount}×{params.flatsPerFloor || 2})</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={params.flatCount}
                      onChange={(e) => {
                        const count = Math.max(1, parseInt(e.target.value) || 1);
                        onChangeParams({
                          ...params,
                          flatCount: count,
                        });
                      }}
                      className={`w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">Daire</span>
                  </div>
                  <span className="block text-[10px] text-slate-400">
                    Özel veya serbest toplam daire adedi girebilirsiniz.
                  </span>
                </div>

                {/* 8. Kat Yüksekliği (m) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Kat Yüksekliği (m):</label>
                    <span className="text-[10px] font-mono text-slate-400">Standart 2.80 - 3.00m</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      min="2.4"
                      max="4.5"
                      value={params.floorHeight || 2.9}
                      onChange={(e) => updateParam('floorHeight', parseFloat(e.target.value) || 2.9)}
                      className={`w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">m</span>
                  </div>
                </div>

                {/* 9. Bodrum Kat Sayısı */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Bodrum Kat Sayısı:</label>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      {(params.basementCount ?? 1) === 0 ? 'Bodrumsuz' : `${params.basementCount ?? 1} Kat`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-24 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="6"
                        value={params.basementCount ?? 1}
                        onChange={(e) => updateParam('basementCount', Math.max(0, parseInt(e.target.value) || 0))}
                        className={`w-full text-sm font-mono font-bold px-3 py-2 rounded-xl border transition-all ${inputBg}`}
                      />
                      <span className="absolute right-2.5 top-2 text-xs font-semibold text-slate-400">Kat</span>
                    </div>
                    <div className="flex flex-1 gap-1">
                      {[0, 1, 2, 3, 4].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => updateParam('basementCount', b)}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                            (params.basementCount ?? 1) === b
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'
                          }`}
                        >
                          {b === 0 ? 'Yok' : `${b}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 10. Asansör Sayısı */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Asansör Adedi:</label>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      {(params.elevatorCount ?? 1) === 0 ? 'Yok' : `${params.elevatorCount ?? 1} Adet`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-24 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="6"
                        value={params.elevatorCount ?? 1}
                        onChange={(e) => updateParam('elevatorCount', Math.max(0, parseInt(e.target.value) || 0))}
                        className={`w-full text-sm font-mono font-bold px-3 py-2 rounded-xl border transition-all ${inputBg}`}
                      />
                      <span className="absolute right-2.5 top-2 text-xs font-semibold text-slate-400">Adet</span>
                    </div>
                    <div className="flex flex-1 gap-1">
                      {[0, 1, 2, 3].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => updateParam('elevatorCount', cnt)}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                            (params.elevatorCount ?? 1) === cnt
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'
                          }`}
                        >
                          {cnt === 0 ? 'Yok' : `${cnt}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 11. Daire Oda Tipi */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 uppercase">Daire İç Yerleşimi (Oda):</label>
                  <div className="flex gap-1.5">
                    {['1+1', '2+1', '3+1', '4+1', '5+1'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateParam('roomType', type as any)}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                          params.roomType === type
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 12. Balkon / Konsol Derinliği (m) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Balkon Derinliği (m):</label>
                    <span className="text-[10px] font-mono font-bold text-indigo-600">{params.balconyDepth ?? 1.4} m</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="3.0"
                      value={params.balconyDepth ?? 1.4}
                      onChange={(e) => updateParam('balconyDepth', Math.max(0, parseFloat(e.target.value) || 0))}
                      className={`w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">m</span>
                  </div>
                </div>

                {/* 13. Yapı Kalitesi / Sınıfı */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Yapı Sınıfı & Kalite Segmenti:</label>
                  <select
                    value={params.buildingType || 'standard'}
                    onChange={(e) => updateParam('buildingType', e.target.value as any)}
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
                  >
                    <option value="standard">Standart / Ekonomik Yapı (1. Sınıf İşçilik)</option>
                    <option value="luxury">Lüks / A+ Segment (Özel Mimari & Akıllı Ev)</option>
                    <option value="commercial">Ticari / Ofis Odaklı Karma Yapı</option>
                  </select>
                </div>

                {/* Mimari Çatı Modeli Paneli */}
                <div className="sm:col-span-2 lg:col-span-3 p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        🏛️ Mimari Çatı Modeli & Bağımsız Bölüm Kurgusu
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-600 font-mono">
                      {params.roofType === 'mansard'
                        ? 'Mansart Çatı (Ayrı B.B.)'
                        : params.roofType === 'duplex'
                        ? 'Mansart + Dubleks'
                        : params.roofType === 'gable'
                        ? 'Kırma Çatı'
                        : 'Düz Teras'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const resFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
                          const normalFlats = resFloors * (params.flatsPerFloor || 2);
                          onChangeParams({
                            ...params,
                            roofType: 'gable',
                            flatCount: normalFlats,
                          });
                        }}
                        className={`p-3 rounded-2xl text-left border transition-all ${
                          (params.roofType || 'gable') === 'gable'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-bold text-xs block">🏠 Kırma Çatı</span>
                        <span className={`text-[10px] block mt-0.5 ${(params.roofType || 'gable') === 'gable' ? 'text-indigo-100' : 'text-slate-500'}`}>
                          Klasik 4 eğimli kiremit çatı
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const resFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
                          const normalFlats = resFloors * (params.flatsPerFloor || 2);
                          onChangeParams({
                            ...params,
                            roofType: 'flat',
                            flatCount: normalFlats,
                          });
                        }}
                        className={`p-3 rounded-2xl text-left border transition-all ${
                          params.roofType === 'flat'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-bold text-xs block">🏙️ Düz Teras</span>
                        <span className={`text-[10px] block mt-0.5 ${params.roofType === 'flat' ? 'text-indigo-100' : 'text-slate-500'}`}>
                          Parapetli modern teras çatı
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const resFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
                          const normalFlats = resFloors * (params.flatsPerFloor || 2);
                          const extraMansard = params.mansardFlatCount && params.mansardFlatCount > 0 ? params.mansardFlatCount : (params.flatsPerFloor || 2);
                          onChangeParams({
                            ...params,
                            roofType: 'mansard',
                            flatCount: normalFlats + extraMansard,
                          });
                        }}
                        className={`p-3 rounded-2xl text-left border transition-all ${
                          params.roofType === 'mansard'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-bold text-xs block">🏛️ Mansart Çatı</span>
                        <span className={`text-[10px] block mt-0.5 ${params.roofType === 'mansard' ? 'text-indigo-100' : 'text-slate-500'}`}>
                          Tek Seçim: Ekstra Bağımsız Bölüm
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const resFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
                          const normalFlats = resFloors * (params.flatsPerFloor || 2);
                          onChangeParams({
                            ...params,
                            roofType: 'duplex',
                            flatCount: normalFlats,
                          });
                        }}
                        className={`p-3 rounded-2xl text-left border transition-all ${
                          params.roofType === 'duplex'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-bold text-xs block">🌟 Mansart + Dubleks</span>
                        <span className={`text-[10px] block mt-0.5 ${params.roofType === 'duplex' ? 'text-indigo-100' : 'text-slate-500'}`}>
                          Son Katla Birleşik: Tek B.B.
                        </span>
                      </button>
                    </div>

                    {/* Mansart Tek Seçildiğinde Ekstra Bağımsız Bölüm Bilgilendirmesi ve Adet Girişi */}
                    {params.roofType === 'mansard' && (
                      <div className="p-3 rounded-xl bg-indigo-50/90 border border-indigo-200 text-indigo-900 text-[11px] space-y-2">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <div className="leading-snug">
                            <span className="font-bold">Mansart Çatı Tek Seçildi:</span> Çatı katında ilave bağımsız bölüm ortaya çıkar. Maliyet ve daire paylaşımına otomatik dahil edilmiştir.
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-indigo-200/60">
                          <span className="text-[10px] font-bold text-indigo-800">Çatıdaki İlave Bağımsız Bölüm Sayısı:</span>
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4].map((cnt) => {
                              const activeCnt = params.mansardFlatCount && params.mansardFlatCount > 0 ? params.mansardFlatCount : (params.flatsPerFloor || 2);
                              return (
                                <button
                                  key={cnt}
                                  type="button"
                                  onClick={() => {
                                    const resFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
                                    const normalFlats = resFloors * (params.flatsPerFloor || 2);
                                    onChangeParams({
                                      ...params,
                                      mansardFlatCount: cnt,
                                      flatCount: normalFlats + cnt,
                                    });
                                  }}
                                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                                    activeCnt === cnt
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                      : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-100/50'
                                  }`}
                                >
                                  +{cnt} B.B.
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mansart + Dubleks Seçildiğinde Bilgilendirme */}
                    {params.roofType === 'duplex' && (
                      <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-[11px] flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="leading-snug">
                          <span className="font-bold">Mansart Çatı + Dubleks Seçildi:</span> Çatı piyesi üst kat daireleri ile birleştirilerek dubleks yapılmıştır ve <strong>tek bağımsız bölüm</strong> olarak kabul edilmektedir (ekstra daire eklenmez, metrekare dubleks olarak büyür).
                        </div>
                      </div>
                    )}

                    {/* 3D Canlı Model Ekranına Taşınan Dış Cephe Stili Bilgi Rozeti */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="text-[11px] text-slate-700">
                          <strong>Dış Cephe Stili:</strong> 10 zengin mimari seçenek doğrudan <strong>3D Canlı Model</strong> ekranına taşınmıştır.
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-1 rounded-lg border border-indigo-200 shrink-0">
                        3D Ekranda Canlı Seçilebilir
                      </span>
                    </div>
                  </div>
                </div>

                {/* 14. Konsol / Tabla Çıkması (3D Modelde Canlı Yansır) */}
                <div className="sm:col-span-2 lg:col-span-3 p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!params.hasCantilever}
                        onChange={(e) => updateParam('hasCantilever', e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-slate-900 uppercase">
                        1. Kattan İtibaren Konsol / Tabla Çıkması (Balkon & Kat Genişlemesi)
                      </span>
                    </label>
                    <span className="text-[10px] font-mono font-bold text-indigo-600">
                      {params.hasCantilever ? 'Aktif (3D Modelde Çıkma Modellenir)' : 'Pasif (Düz Cephe)'}
                    </span>
                  </div>
                  {params.hasCantilever && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-indigo-100">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase">Çıkma / Konsol Mesafesi (m):</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0.5"
                            max="2.5"
                            value={params.cantileverDepth || 1.2}
                            onChange={(e) => updateParam('cantileverDepth', Math.max(0.5, parseFloat(e.target.value) || 1.2))}
                            className={`w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border ${inputBg}`}
                          />
                          <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">m</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase">Çıkma Yönü:</label>
                        <select
                          value={params.cantileverDirection || 'front'}
                          onChange={(e) => updateParam('cantileverDirection', e.target.value as any)}
                          className={`w-full text-xs px-3 py-2 rounded-xl border ${inputBg}`}
                        >
                          <option value="front">Sadece Ön Cephe</option>
                          <option value="front_back">Ön ve Arka Cephe</option>
                          <option value="all">Dört Cephe (Tüm Çevre)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* 15. Yapım Modeli */}
                <div>
                  <label className="block text-xs font-bold text-emerald-700 mb-1.5 uppercase">
                    Yapım Modeli:
                  </label>
                  <select
                    value={params.projectModel}
                    onChange={(e) => updateParam('projectModel', e.target.value as any)}
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
                  >
                    <option value="cash">Nakit Ödemeli / Müteahhit</option>
                    <option value="contractorShare">Kat Karşılığı Paylaşımlı</option>
                  </select>
                </div>

                {/* 16. Destek Modeli */}
                <div>
                  <label className="block text-xs font-bold text-indigo-700 mb-1.5 uppercase">
                    Destek Modeli:
                  </label>
                  <select
                    value={params.transformationStatus}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      const updatedFlats = params.flats.map((f) => ({
                        ...f,
                        useTransformationCredit: val !== 'none',
                      }));
                      onChangeParams({
                        ...params,
                        transformationStatus: val,
                        flats: updatedFlats,
                      });
                    }}
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
                  >
                    <option value="currentSupport">2025/2026 Mevcut Model (Hibe + Kredi)</option>
                    <option value="futureSupport2027">2027 Projeksiyon Modeli (180 Ay Vade)</option>
                    <option value="none">Desteksiz (Öz Kaynak)</option>
                  </select>
                </div>

                {/* 17. Proje Teslim Süresi */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={`block text-xs font-bold ${labelColor} uppercase`}>
                      Proje Teslim Süresi:
                    </label>
                    <span className="text-[10px] font-mono font-bold text-indigo-600">
                      {params.durationOption === 'hide'
                        ? 'Gizli'
                        : `${Number.isInteger(results.finalMonths) ? results.finalMonths : Number(results.finalMonths).toFixed(1)} Ay`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={params.durationOption}
                      onChange={(e) => updateParam('durationOption', e.target.value as any)}
                      className={`flex-1 text-xs px-3 py-2 rounded-xl border transition-all ${inputBg}`}
                    >
                      <option value="auto">Otomatik (Gantt Çizelgesi)</option>
                      <option value="manual">Manuel Gir (Ay)</option>
                      <option value="hide">Gizle</option>
                    </select>
                    {params.durationOption === 'manual' && (
                      <div className="relative w-24 shrink-0">
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={params.manualMonths}
                          onChange={(e) => updateParam('manualMonths', Math.max(1, parseFloat(e.target.value) || 1))}
                          className={`w-full text-xs font-mono font-bold px-2.5 py-2 rounded-xl border text-center transition-all ${inputBg}`}
                        />
                        <span className="absolute right-2 top-2 text-[10px] font-semibold text-slate-400">Ay</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 18. Müteahhit Kâr Oranı (%) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Müteahhit Kâr Oranı (%):</label>
                    <span className="text-[10px] font-bold text-indigo-600 font-mono">%{params.profitRate ?? 25}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={params.profitRate ?? 25}
                      onChange={(e) => updateParam('profitRate', Math.max(0, parseFloat(e.target.value) || 0))}
                      className={`w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">%</span>
                  </div>
                </div>

                {/* 19. Teklif Birim m2 Maliyet Fiyatları (Daire ve Dükkan Ayrı) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-indigo-700 uppercase leading-tight">Daire Birim m² (TL):</label>
                      <span className="text-[9px] font-mono text-slate-400">Opsiyonel</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={params.manualFlatUnitPrice || ''}
                        onChange={(e) => updateParam('manualFlatUnitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder={`${results.grossCostPerSqM ? results.grossCostPerSqM.toFixed(0) : ''} TL`}
                        className={`w-full text-[13px] font-mono font-bold px-3 py-2 rounded-xl border border-indigo-200 ${inputBg}`}
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] font-semibold text-slate-400">TL</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-amber-700 uppercase leading-tight">Dükkan Birim m² (TL):</label>
                      <span className="text-[9px] font-mono text-slate-400">Opsiyonel</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={params.manualShopUnitPrice || ''}
                        onChange={(e) => updateParam('manualShopUnitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder={`${results.grossCostPerSqM ? results.grossCostPerSqM.toFixed(0) : ''} TL`}
                        className={`w-full text-[13px] font-mono font-bold px-3 py-2 rounded-xl border border-amber-200 ${inputBg}`}
                        disabled={!params.hasGroundFloorShop}
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] font-semibold text-slate-400">TL</span>
                    </div>
                  </div>
                </div>

                {/* 20. Canlı Birim Maliyet & Hedef Özeti */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Hedef Maliyet Özeti:</label>
                    <span className="text-[10px] font-mono font-bold text-emerald-700">Canlı Hesap</span>
                  </div>
                  <div className="p-2 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 h-[42px]">
                    <div>
                      <span className="text-[9px] text-slate-500 block leading-tight">Net İnşaat m²</span>
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {results.netCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </span>
                    </div>
                    <div className="h-6 w-px bg-slate-200 shrink-0" />
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 block leading-tight">Hedef Satış m²</span>
                      <span className="text-xs font-mono font-bold text-indigo-700">
                        {results.grossCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {params.projectModel === 'contractorShare' && (
              <div className={`${cardBg} rounded-3xl border p-6 shadow-sm space-y-4 animate-fade-in mt-5`}>
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Müteahhit Paylaşım Ayarları</h3>
                    <p className="text-[10px] text-slate-500">Müteahhite kalacak dairelerin seçimi ve paylaşım oranı.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-amber-900 mb-1.5 uppercase">
                        Müteahhit Daire Payı Oranı (%):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={params.contractorShareRate}
                        onChange={(e) => updateParam('contractorShareRate', parseFloat(e.target.value) || 50)}
                        className={`w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-xl border border-amber-200 ${inputBg}`}
                      />
                    </div>
                    
                    <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-800 uppercase">Müteahhit Daire Sayısı</span>
                        <span className="text-sm font-mono font-bold text-amber-900">
                          {(params.contractorFlatIds && params.contractorFlatIds.length > 0) ? params.contractorFlatIds.length : Math.round(params.flatCount * (params.contractorShareRate / 100))} / {params.flatCount}
                        </span>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            onChangeParams({
                              ...params,
                              contractorFlatIds: [],
                              flats: params.flats.map(f => ({ ...f, isContractorShare: undefined }))
                            });
                          }}
                          className="text-[10px] text-indigo-600 font-bold hover:underline underline-offset-2"
                        >
                          Seçimleri Sıfırla (Orana Dön)
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold text-slate-700 mb-2.5 uppercase">Daire Seçimi (Hangi Daireler Müteahhitin?):</span>
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
                      {params.flats.map((flat) => {
                        const defaultCount = Math.round(params.flatCount * (params.contractorShareRate / 100));
                        const isContractor = params.contractorFlatIds && params.contractorFlatIds.length > 0
                          ? params.contractorFlatIds.includes(flat.id)
                          : flat.id > (params.flatCount - defaultCount);
                        return (
                          <button
                            key={flat.id}
                            type="button"
                            onClick={() => {
                              const currentIds = params.contractorFlatIds && params.contractorFlatIds.length > 0
                                ? [...params.contractorFlatIds]
                                : params.flats
                                    .slice(params.flatCount - defaultCount)
                                    .map(f => f.id);
                              
                              let nextIds: number[];
                              if (currentIds.includes(flat.id)) {
                                nextIds = currentIds.filter(id => id !== flat.id);
                              } else {
                                nextIds = [...currentIds, flat.id];
                              }
                              
                              const updatedFlats = params.flats.map(f => {
                                if (f.id === flat.id) {
                                  return { ...f, isContractorShare: !currentIds.includes(flat.id) };
                                }
                                return f;
                              });

                              onChangeParams({
                                ...params,
                                contractorFlatIds: nextIds,
                                flats: updatedFlats,
                              });
                            }}
                            className={`py-2 text-[10px] font-mono font-bold rounded-lg border text-center transition-all ${
                              isContractor
                                ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            D{flat.id}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200/50">
                  <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={params.showContractorShare3D || false}
                      onChange={(e) => updateParam('showContractorShare3D', e.target.checked)}
                      className="rounded-sm text-amber-600 focus:ring-amber-500"
                    />
                    <span>3D Modelde Müteahhit Paylarını Renkli Göster</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

    {/* Calculation Overview Metric Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-8">
      {/* Bento Card 1: Birim Satış Maliyeti */}
      <div className={`${cardBg} border border-amber-300 rounded-3xl p-5 shadow-sm relative overflow-hidden`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono font-semibold text-amber-800 uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300">
            Birim Satış Maliyeti
          </span>
        </div>
        <p className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
          {results.grossCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}{' '}
          <span className="text-xs font-normal text-slate-600">TL / m²</span>
        </p>
        <p className="text-xs font-semibold text-amber-700 mt-1 font-mono">
          ${results.grossUsdPerSqM.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD / m²
        </p>
      </div>

      {/* Bento Card 2: Net İnşaat Maliyeti */}
      <div className={`${cardBg} border border-blue-300 rounded-3xl p-5 shadow-sm relative overflow-hidden`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono font-semibold text-blue-800 uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-100 border border-blue-300">
            Net İnşaat Maliyeti
          </span>
        </div>
        <p className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
          {results.netCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}{' '}
          <span className="text-xs font-normal text-slate-600">TL / m²</span>
        </p>
        <p className="text-xs font-semibold text-blue-700 mt-1 font-mono">
          ${results.netUsdPerSqM.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD / m²
        </p>
      </div>

      {/* Bento Card 3: Genel Proje Hedef Bedeli */}
      <div className={`${cardBg} border border-emerald-300 rounded-3xl p-5 shadow-sm relative overflow-hidden`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono font-semibold text-emerald-800 uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300">
            Genel Proje Hedef Bedeli
          </span>
        </div>
        <p className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
          {results.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}{' '}
          <span className="text-xs font-normal text-slate-600">TL</span>
        </p>
        <p className="text-xs font-semibold text-emerald-700 mt-1 font-mono">
          Kâr: {results.profitAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL (%{params.profitRate})
        </p>
      </div>

      {/* Bento Card 4: Tahmini Teslim Süresi */}
      <div className={`${cardBg} border border-indigo-300 rounded-3xl p-5 shadow-sm relative overflow-hidden`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono font-semibold text-indigo-800 uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-100 border border-indigo-300">
            Tahmini Teslim Süresi
          </span>
        </div>
        <p className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
          {params.durationOption === 'hide' ? 'Gizlendi' : `${results.finalMonths} Ay`}
        </p>
        <p className="text-xs text-slate-600 mt-1 truncate">
          {params.durationOption === 'auto'
            ? `Ruhsat: 3 Ay | Kaba: ${(results.kabaDaysTotal / 30).toFixed(1)} Ay | İnce: ${(results.inceDaysTotal / 30).toFixed(1)} Ay`
            : 'Sözleşme hedef takvimi'}
        </p>
      </div>
    </div>

    {/* Mevzuat Denetimi (Sayfa En Altı) */}
    <div className="mt-8 pt-6 border-t border-slate-200">
      <ZoningAuditPanel params={params as any} theme={theme} />
    </div>
  </div>
);
};
