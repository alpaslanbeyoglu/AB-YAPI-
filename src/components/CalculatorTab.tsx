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
} from 'lucide-react';
import { ProjectParams, CalculationResult, FlatItem, AppTheme, FootprintInputMode, CustomFacadeSide, BuildingModelParams } from '../types';
import {
  calculateFootprint,
  getDefaultCustomFacades,
  DEFAULT_CUSTOM_FACADES_4,
  DEFAULT_CUSTOM_FACADES_5,
  DEFAULT_CUSTOM_FACADES_6,
  DEFAULT_CUSTOM_FACADES_8,
  calculatePolygonArea,
  getPolygonBounds,
  POLYGON_PRESETS,
} from '../utils/footprintUtils';
import { InteractiveFootprintCanvas } from './InteractiveFootprintCanvas';
import { ThreeBuildingView } from './ThreeBuildingView';

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
  const [activeSection, setActiveSection] = useState<'project' | 'footprint' | 'structure' | 'financial'>('project');
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
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation for Calculator Sections */}
      <div className="lg:w-72 shrink-0 space-y-2 print:hidden">
        {[
          { id: 'project', label: '1. Proje Künyesi', icon: Building },
          { id: 'footprint', label: '2. Arsa & Oturum', icon: Ruler },
          { id: 'structure', label: '3. Yapı Parametreleri', icon: Layers },
          { id: 'financial', label: '4. Finansal Model', icon: BarChart3 },
        ].map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all border ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-indigo-600'}`} />
              <span>{sec.label}</span>
              {isActive && <ArrowRight className="w-3.5 h-3.5 ml-auto text-indigo-200" />}
            </button>
          );
        })}

        <div className="mt-8 p-5 rounded-3xl bg-indigo-50 border border-indigo-100 hidden lg:block">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest">Tasarım İpucu</span>
          </div>
          <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">
            Oturum ölçülerini değiştirdiğinizde 3D model ve maliyetler anlık olarak güncellenir.
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-6">
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

        {/* Section 1: General Project Information */}
        {activeSection === 'project' && (
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
                  <div className="text-xs font-mono font-bold text-slate-800">{params.flatsPerFloor || 1} Adet</div>
                </div>
                <div className="space-y-0.5 col-span-2 sm:col-span-1 lg:col-span-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Toplam Bağımsız Bölüm</span>
                  <div className="text-xs font-mono font-bold text-emerald-900">
                    {params.hasGroundFloorShop
                      ? `${params.flatCount + (params.shopCount || 1)} Adet (${params.flatCount} Daire, ${params.shopCount || 1} Dükkan)`
                      : `${params.flatCount} Adet (${params.flatCount} Daire)`}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Toplam İnşaat</span>
                  <div className="text-xs font-mono font-bold text-slate-800">{results.totalGrossArea ? results.totalGrossArea.toFixed(0) : 0} m²</div>
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
                      onChange={(e) => updateParam('landArea', parseFloat(e.target.value) || 0)}
                      className={`w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">m²</span>
                  </div>
                </div>

                {/* 2. Bina Ön Cephe Genişliği (m) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Bina Ön Cephe Genişliği (m):</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="3"
                      value={params.facadeWidth || 14}
                      onChange={(e) => {
                        const w = parseFloat(e.target.value) || 0;
                        const d = params.facadeDepth || 18;
                        const newArea = Math.round(w * d * 10) / 10;
                        onChangeParams({
                          ...params,
                          facadeWidth: w,
                          baseBuildArea: newArea > 0 ? newArea : params.baseBuildArea,
                        });
                      }}
                      className={`w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">m</span>
                  </div>
                </div>

                {/* 3. Bina Yan Cephe Derinliği (m) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Bina Yan Cephe Derinliği (m):</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="3"
                      value={params.facadeDepth || 18}
                      onChange={(e) => {
                        const d = parseFloat(e.target.value) || 0;
                        const w = params.facadeWidth || 14;
                        const newArea = Math.round(w * d * 10) / 10;
                        onChangeParams({
                          ...params,
                          facadeDepth: d,
                          baseBuildArea: newArea > 0 ? newArea : params.baseBuildArea,
                        });
                      }}
                      className={`w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">m</span>
                  </div>
                </div>

                {/* 4. Proje Kat Alanı / Taban Oturum (m²) */}
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
                        const area = parseFloat(e.target.value) || 0;
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
                          const flatsPerFloor = params.flatsPerFloor || 1;
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
                        const totalFlats = normalFloors * (params.flatsPerFloor || 1);
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
                          const totalFlats = normalFloors * (params.flatsPerFloor || 1);
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
                        const totalFlats = normalFloors * (params.flatsPerFloor || 1);
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
                          const totalFlats = normalFloors * (params.flatsPerFloor || 1);
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
                    <span className="text-[10px] font-bold text-indigo-600 font-mono">Katta {params.flatsPerFloor || 1} Daire</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const nextFlats = Math.max(1, (params.flatsPerFloor || 1) - 1);
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
                        value={params.flatsPerFloor || 1}
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
                        const nextFlats = (params.flatsPerFloor || 1) + 1;
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
                        const calcTotal = normalFloors * (params.flatsPerFloor || 1);
                        onChangeParams({
                          ...params,
                          flatCount: calcTotal,
                        });
                      }}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                      title="Kat × Katta Daire formülü ile güncelle"
                    >
                      <span>⚡ Kattan Hesapla ({params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount}×{params.flatsPerFloor || 1})</span>
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

                {/* 12. Çatı Tipi */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Çatı Tipi (3D Model & Bağımsız Bölüm):</label>
                    {params.roofType === 'mansard' && (
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        +{(params.mansardFlatCount && params.mansardFlatCount > 0 ? params.mansardFlatCount : (params.flatsPerFloor || 1))} Ayrı B.B. Dahil
                      </span>
                    )}
                    {params.roofType === 'duplex' && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        Tek B.B. (Dubleks Birleşik)
                      </span>
                    )}
                  </div>
                  <select
                    value={params.roofType || 'gable'}
                    onChange={(e) => {
                      const newRoof = e.target.value as any;
                      const resFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
                      const normalFlats = resFloors * (params.flatsPerFloor || 1);
                      const extraMansard = newRoof === 'mansard'
                        ? (params.mansardFlatCount && params.mansardFlatCount > 0 ? params.mansardFlatCount : (params.flatsPerFloor || 1))
                        : 0;

                      onChangeParams({
                        ...params,
                        roofType: newRoof,
                        flatCount: newRoof === 'mansard' ? normalFlats + extraMansard : (params.flatCount === normalFlats + (params.flatsPerFloor || 1) ? normalFlats : params.flatCount),
                      });
                    }}
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
                  >
                    <option value="gable">Kırma Çatı (Ahşap/Kiremit İskelet)</option>
                    <option value="flat">Teras / Düz Çatı (Gezilebilir İzolasyonlu)</option>
                    <option value="mansard">Mansart Çatı (Tek: Ayrı Bağımsız Bölüm Oluşturur)</option>
                    <option value="duplex">Mansart Çatı + Dubleks (Son Katla Birleşik Tek Bağımsız Bölüm)</option>
                  </select>

                  {/* Mansart Tek Seçildiğinde Ekstra Bağımsız Bölüm Bilgilendirmesi ve Adet Girişi */}
                  {params.roofType === 'mansard' && (
                    <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-[11px] space-y-2 mt-1">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div className="leading-snug">
                          <span className="font-bold">Mansart Çatı Tek Seçildi:</span> Çatı katında ilave bağımsız bölüm ortaya çıkmaktadır. Bu bağımsız bölümler maliyet, malzeme ve kat maliki hesaplarına dahil edilmiştir.
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-indigo-200/60">
                        <span className="text-[10px] font-bold text-indigo-800">Çatıdaki İlave Bağımsız Bölüm Sayısı:</span>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4].map((cnt) => {
                            const activeCnt = params.mansardFlatCount && params.mansardFlatCount > 0 ? params.mansardFlatCount : (params.flatsPerFloor || 1);
                            return (
                              <button
                                key={cnt}
                                type="button"
                                onClick={() => {
                                  const resFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
                                  const normalFlats = resFloors * (params.flatsPerFloor || 1);
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
                    <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-[11px] flex items-start gap-2 mt-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="leading-snug">
                        <span className="font-bold">Mansart Çatı + Dubleks Seçildi:</span> Çatı piyesi üst kat daireleri ile birleştirilerek dubleks yapılmıştır ve <strong>tek bağımsız bölüm</strong> olarak kabul edilmektedir (ekstra daire eklenmez, mevcut dairelerin metrekareleri dubleks olarak büyütülür).
                      </div>
                    </div>
                  )}
                </div>

                {/* 13. Dış Cephe Mimari Stili */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Dış Cephe Mimari Stili:</label>
                  <select
                    value={params.facadeStyle || 'wood_anthracite'}
                    onChange={(e) => updateParam('facadeStyle', e.target.value as any)}
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
                  >
                    <option value="wood_anthracite">Antrasit & Ahşap Kompozit</option>
                    <option value="modern">Modern Açık Gri & Ahşap</option>
                    <option value="glass_minimal">Cam & Minimalist Alüminyum</option>
                    <option value="brick_stone">Tuğla & Doğal Taş Kaplama</option>
                  </select>
                </div>

                {/* 14. Yapı Kalitesi / Sınıfı */}
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

                {/* 15. Müteahhit Kâr Oranı (%) */}
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

                {/* 16. Balkon / Konsol Derinliği (m) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Balkon Derinliği (m):</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="3.0"
                      value={params.balconyDepth ?? 1.4}
                      onChange={(e) => updateParam('balconyDepth', parseFloat(e.target.value) || 0)}
                      className={`w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">m</span>
                  </div>
                </div>

                {/* 17. Konsol / Tabla Çıkması (3D Modelde Canlı Yansır) */}
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
                            onChange={(e) => updateParam('cantileverDepth', parseFloat(e.target.value) || 1.2)}
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



                {/* 19. Teklif Birim m2 Maliyet Fiyatı */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-indigo-700 uppercase">Teklif Birim m² Maliyeti (TL):</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={params.manualUnitPrice || ''}
                      onChange={(e) => updateParam('manualUnitPrice', parseFloat(e.target.value) || 0)}
                      placeholder={`${results.grossCostPerSqM ? results.grossCostPerSqM.toFixed(0) : ''} TL (Otomatik)`}
                      className={`w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-xl border border-indigo-200 ${inputBg}`}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">TL/m²</span>
                  </div>
                  <p className="text-[9px] text-slate-400 italic">Boş bırakılırsa maliyet motoru otomatik hesaplar.</p>
                </div>

                {/* 20. Proje Teslim Süresi */}
                <div className="space-y-1.5">
                  <label className={`block text-xs font-bold ${labelColor} uppercase`}>
                    Proje Teslim Süresi:
                  </label>
                  <select
                    value={params.durationOption}
                    onChange={(e) => updateParam('durationOption', e.target.value as any)}
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
                  >
                    <option value="auto">Otomatik Hesapla (Gantt Çizelgesi)</option>
                    <option value="manual">Manuel Gir (Ay)</option>
                    <option value="hide">Gizle</option>
                  </select>
                </div>

                {params.durationOption === 'manual' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-red-600 uppercase">
                      Manuel Süre (Ay):
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={params.manualMonths}
                      onChange={(e) => updateParam('manualMonths', parseFloat(e.target.value) || 1)}
                      className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
                    />
                  </div>
                )}

                {/* 21. Destek Modeli */}
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

                {/* 22. Yapım Modeli */}
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
        )}

        {activeSection === 'footprint' && (
          <div className="animate-fade-in space-y-6">
            <div className={`${cardBg} rounded-3xl border p-6 shadow-sm space-y-6`}>
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Ruler className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">1. Arsa & Yoğunluk Verileri</h3>
                  <p className="text-[11px] text-slate-500">Arsa alanı ve her kattaki daire sayısını belirleyerek projeye başlayın.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sol Panel: Temel Veriler */}
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Taban Oturumu Belirleme Yöntemi:</label>
                    <select
                      value={activeFootprintMode}
                      onChange={(e) => handleFootprintUpdate({ footprintInputMode: e.target.value as any })}
                      className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
                    >
                      <option value="directArea">A. Doğrudan Alan Girişi (m²)</option>
                      <option value="dimensions">B. Ön × Yan Cephe (Dikdörtgen)</option>
                      <option value="polygonDraw">C. Serbest Çizim (Köşe Noktaları)</option>
                      <option value="customFacades">D. Çoklu Cephe Uzunlukları</option>
                      <option value="lShape">E. L-Tipi / Kademeli Kütle</option>
                    </select>
                  </div>
                </div>

                {/* Sağ Panel: Dinamik Giriş Alanı */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-center">
                  {activeFootprintMode === 'directArea' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5 text-center">
                        <p className="text-[11px] text-slate-500 italic">
                          Oturum alanı "Proje Künyesi" sekmesinden belirlenmiştir. Hızlı seçim butonlarını kullanarak güncelleyebilirsiniz:
                        </p>
                        <div className="flex gap-2 mt-3">
                          {[100, 150, 250, 400].map(v => (
                            <button key={v} onClick={() => handleFootprintUpdate({ baseBuildArea: v })} className="flex-1 py-2 text-[10px] font-bold bg-white border border-slate-200 rounded-lg hover:bg-indigo-50 transition-colors">{v} m²</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeFootprintMode === 'dimensions' && (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>Ön Cephe Genişliği (W):</span>
                          <span className="text-indigo-600">{params.facadeWidth}m</span>
                        </div>
                        <input type="range" min="5" max="50" step="0.5" value={params.facadeWidth} onChange={(e) => handleFootprintUpdate({ facadeWidth: parseFloat(e.target.value) })} className="w-full accent-indigo-600" />
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>Yan Cephe Derinliği (D):</span>
                          <span className="text-indigo-600">{params.facadeDepth}m</span>
                        </div>
                        <input type="range" min="5" max="50" step="0.5" value={params.facadeDepth} onChange={(e) => handleFootprintUpdate({ facadeDepth: parseFloat(e.target.value) })} className="w-full accent-indigo-600" />
                      </div>
                    </div>
                  )}

                  {activeFootprintMode === 'polygonDraw' && (
                    <div className="text-center py-4">
                      <p className="text-[11px] text-indigo-600 font-bold mb-3 flex items-center justify-center gap-1.5">
                        <Compass className="w-3.5 h-3.5" />
                        Aşağıdaki editörden formu düzenleyebilirsiniz.
                      </p>
                      <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700">Editöre Git</button>
                    </div>
                  )}

                  {(activeFootprintMode === 'customFacades' || activeFootprintMode === 'lShape') && (
                    <div className="text-center py-4 text-slate-400 italic text-xs">
                      Seçilen mod için gelişmiş ayarlar alt kısımda aktiftir.
                    </div>
                  )}
                </div>
              </div>

              {activeFootprintMode === 'polygonDraw' && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="h-[400px] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner relative">
                    <InteractiveFootprintCanvas
                      points={params.polygonPoints}
                      onChangePoints={(newPoints) => {
                        const area = calculatePolygonArea(newPoints);
                        const bounds = getPolygonBounds(newPoints);
                        handleFootprintUpdate({
                          polygonPoints: newPoints,
                          baseBuildArea: area,
                          facadeWidth: Math.round(bounds.width * 10) / 10,
                          facadeDepth: Math.round(bounds.depth * 10) / 10,
                        });
                      }}
                      facadeConfigs={params.facadeConfigs}
                      onChangeFacadeConfigs={(newConfigs) => updateParam('facadeConfigs', newConfigs)}
                      mainEntranceIndex={params.mainEntranceFacadeIndex || 0}
                      onChangeMainEntranceIndex={(idx) => updateParam('mainEntranceFacadeIndex', idx)}
                      flatsPerFloor={params.flatsPerFloor || 2}
                      theme={theme}
                    />
                  </div>
                </div>
              )}

              {/* Özet Panel */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 group hover:border-slate-300 transition-colors">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Taban Oturumu</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-mono font-bold text-slate-900">{params.baseBuildArea.toFixed(1)}</span>
                    <span className="text-[10px] font-bold text-slate-400">m²</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 group hover:border-indigo-200 transition-colors">
                  <span className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Toplam İnşaat</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-mono font-bold text-indigo-900">{(params.baseBuildArea * params.floorCount).toFixed(1)}</span>
                    <span className="text-[10px] font-bold text-indigo-400">m²</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 group hover:border-emerald-200 transition-colors">
                  <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Toplam Daire</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-mono font-bold text-emerald-900">{params.flatCount}</span>
                    <span className="text-[10px] font-bold text-emerald-400">Adet</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 group hover:border-amber-200 transition-colors">
                  <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Daire Başı Brüt</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-mono font-bold text-amber-900">{(params.baseBuildArea / (params.flatsPerFloor || 1)).toFixed(1)}</span>
                    <span className="text-[10px] font-bold text-amber-400">m²</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3D Model Entegrasyonu */}
            <div className="h-80 rounded-3xl overflow-hidden border border-slate-200 shadow-inner relative group bg-slate-50">
              <ThreeBuildingView params={calcBuildingModelParams} theme={theme} />
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200 text-[10px] font-bold text-indigo-700 shadow-sm flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                <span>Canlı 3D Kütle Modeli</span>
              </div>
              <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200 text-[9px] font-bold text-slate-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                Modeli sürükleyerek inceleyebilirsiniz.
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Structure Parameters */}
        {activeSection === 'structure' && (
          <div className={`${cardBg} rounded-3xl border p-6 shadow-sm space-y-6 animate-fade-in`}>
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">2. Yapı Parametreleri & Mimari Form</h3>
                <p className="text-[11px] text-slate-500">Bina yüksekliği, çatı modeli ve mimari segment ayarlarını yapın.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Kat Sayıları Grubu */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-5">
                <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2">Hacim ve Katlar</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase">Bodrum Katlar:</label>
                      <span className="text-xs font-mono font-bold text-slate-500">{params.basementCount} Kat</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="4"
                        value={params.basementCount}
                        onChange={(e) => updateParam('basementCount', parseInt(e.target.value))}
                        className="flex-1 accent-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Zemin Kat Detayları (Sadece aktifse) */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
                <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2">Zemin Detayları</h4>
                {params.hasGroundFloorShop ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dükkan Sayısı:</label>
                      <input type="number" value={params.shopCount} onChange={(e) => updateParam('shopCount', parseInt(e.target.value))} className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kat Yüksekliği (m):</label>
                      <input type="number" step="0.1" value={params.shopHeight} onChange={(e) => updateParam('shopHeight', parseFloat(e.target.value))} className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`} />
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">Zemin kat konut olarak planlanmıştır. Değiştirmek için "Proje Künyesi" sekmesini kullanın.</p>
                )}
              </div>

              {/* Mimari Segment & Stil */}
              <div className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-4">
                <h4 className="text-[11px] font-bold text-indigo-900 uppercase tracking-widest border-b border-indigo-100 pb-2">Görsel Karakter</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-700 mb-1.5 uppercase">Yapı Kalitesi:</label>
                    <select
                      value={params.buildingType}
                      onChange={(e) => updateParam('buildingType', e.target.value as any)}
                      className={`w-full text-xs px-3 py-2.5 rounded-xl border border-indigo-200 bg-white font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-hidden`}
                    >
                      <option value="standard">Ekonomik / Standart Yapı</option>
                      <option value="luxury">Lüks / A+ Segment Yapı</option>
                      <option value="commercial">Ticari Odaklı / Ofis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-700 mb-1.5 uppercase">Cephe Tasarımı:</label>
                    <select
                      value={params.facadeStyle}
                      onChange={(e) => updateParam('facadeStyle', e.target.value as any)}
                      className={`w-full text-xs px-3 py-2.5 rounded-xl border border-indigo-200 bg-white font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-hidden`}
                    >
                      <option value="modern">Modern (Sıva & Boya)</option>
                      <option value="wood_anthracite">Ahşap & Antrasit Detaylar</option>
                      <option value="glass_minimal">Minimalist & Geniş Camlı</option>
                      <option value="brick_stone">Tuğla & Doğal Taş Kaplama</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Alt Panel: Çatı ve Daire Tipleri */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              {/* Çatı Tipleri */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">Mimari Çatı Modeli:</label>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    {params.roofType === 'mansard'
                      ? 'Mansart Çatı (Ayrı Bağımsız Bölüm)'
                      : params.roofType === 'duplex'
                      ? 'Mansart + Dubleks (Tek Bağımsız Bölüm)'
                      : params.roofType === 'flat'
                      ? 'Teras Çatı'
                      : 'Kırma Çatı'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'gable', label: 'Kırma Çatı', sub: 'Standart', icon: ChevronUp },
                    { id: 'flat', label: 'Teraslı Çatı', sub: 'Düz Çatı', icon: Layers },
                    { id: 'mansard', label: 'Mansart Çatı', sub: '+Ayrı B.B.', icon: Compass },
                    { id: 'duplex', label: 'Mansart + Dubleks', sub: 'Tek B.B.', icon: Sparkles },
                  ].map((roof) => {
                    const Icon = roof.icon;
                    const isSelected = params.roofType === roof.id;
                    return (
                      <button
                        key={roof.id}
                        type="button"
                        onClick={() => {
                          const newRoof = roof.id as any;
                          const resFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
                          const normalFlats = resFloors * (params.flatsPerFloor || 1);
                          const extraMansard = newRoof === 'mansard'
                            ? (params.mansardFlatCount && params.mansardFlatCount > 0 ? params.mansardFlatCount : (params.flatsPerFloor || 1))
                            : 0;

                          onChangeParams({
                            ...params,
                            roofType: newRoof,
                            flatCount: newRoof === 'mansard' ? normalFlats + extraMansard : (params.flatCount === normalFlats + (params.flatsPerFloor || 1) ? normalFlats : params.flatCount),
                          });
                        }}
                        className={`flex flex-col items-center gap-1.5 p-3.5 rounded-2xl border transition-all duration-300 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30 -translate-y-0.5'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-500/50' : 'bg-slate-100'}`}>
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                        </div>
                        <span className="text-[11px] font-bold tracking-tight text-center">{roof.label}</span>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-sm ${isSelected ? 'bg-indigo-700/60 text-indigo-100' : 'bg-slate-100 text-slate-500'}`}>{roof.sub}</span>
                      </button>
                    );
                  })}
                </div>
                {params.roofType === 'mansard' ? (
                  <p className="text-[11px] text-indigo-700 bg-indigo-50/80 p-2.5 rounded-xl border border-indigo-200 font-medium leading-relaxed">
                    ✨ <strong>Kural Uygulandı:</strong> Mansart çatı tek seçildiğinde ortaya ekstra bağımsız bölüm çıkmaktadır. Eklenen çatı katı bağımsız bölümü (+{params.mansardFlatCount || (params.flatsPerFloor || 1)} daire) tüm inşaat, hakediş ve kat maliki hesaplarına dahil edilmiştir.
                  </p>
                ) : params.roofType === 'duplex' ? (
                  <p className="text-[11px] text-emerald-700 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 font-medium leading-relaxed">
                    🏢 <strong>Kural Uygulandı:</strong> Mansart çatı + Dubleks seçildiğinde çatı alanı üst kat daireleri ile birleşerek <strong>tek bağımsız bölüm</strong> olarak kabul edilmiştir (ekstra daire eklenmez, m²'ler dubleks olarak hesaplanır).
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 italic font-medium leading-relaxed">
                    * Mansart çatı tek seçildiğinde çatı katında ekstra bağımsız bölüm oluşturulur ve hesaplara dahil edilir. Dubleks seçildiğinde tek bağımsız bölüm kabul edilir.
                  </p>
                )}
              </div>

              {/* Daire Tipi Özeti */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">Proje Kapsam Özeti:</label>
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-[11px] font-bold text-emerald-800 uppercase">Toplam Bağımsız Bölüm</span>
                  </div>
                  <span className="text-base font-mono font-bold text-emerald-900">
                    {params.hasGroundFloorShop
                      ? `${params.flatCount + (params.shopCount || 1)} Adet, ${params.flatCount} Daire, ${params.shopCount || 1} Dükkan`
                      : `${params.flatCount} Adet, ${params.flatCount} Daire, 0 Dükkan`}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  Not: Daire tipi ve kattaki daire sayısı "Proje Künyesi" sekmesinden düzenlenebilir.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Financial Model & Owners */}
        {activeSection === 'financial' && (
          <div className="animate-fade-in space-y-6">
            <div className={`${cardBg} rounded-3xl border shadow-sm overflow-hidden`}>
              <div className="p-6 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Kat Malikleri & Daire Listesi</h3>
                      <p className="text-[11px] text-slate-500">Mülk sahiplerinin hakediş ve ödeme detayları</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {params.flats.map((flat, i) => (
                    <div key={flat.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-sm transition-all group relative">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-[10px] font-bold text-indigo-600 border border-indigo-100">D{flat.id}</span>
                          {flat.flatType === 'mansard' && (
                            <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-200" title="Mansart Çatı ile Eklenen Bağımsız Bölüm">
                              Çatı Mansart (Ayrı B.B.)
                            </span>
                          )}
                          {flat.flatType === 'duplex' && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200" title="Mansart Çatı + Dubleks (Tek Bağımsız Bölüm)">
                              Çatı Dubleksi (Tek B.B.)
                            </span>
                          )}
                        </div>
                        {flat.isContractorShare && (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">MÜTEAHHİT</span>
                        )}
                      </div>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={flat.name}
                          onChange={(e) => handleFlatChange(i, 'name', e.target.value)}
                          className={`w-full text-[11px] font-bold px-3 py-2.5 rounded-xl border transition-all ${inputBg}`}
                          placeholder="Malik Adı / Soyadı"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <input
                              type="number"
                              value={flat.area}
                              onChange={(e) => handleFlatChange(i, 'area', parseFloat(e.target.value) || 0)}
                              className={`w-full text-xs font-mono font-bold px-3 py-2.5 rounded-xl border transition-all ${inputBg}`}
                            />
                            <span className="absolute right-2 top-2.5 text-[9px] font-bold text-slate-400">m²</span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              value={flat.downPayment}
                              onChange={(e) => handleFlatChange(i, 'downPayment', parseFloat(e.target.value) || 0)}
                              className={`w-full text-xs font-mono font-bold px-3 py-2.5 rounded-xl border transition-all ${inputBg}`}
                            />
                            <span className="absolute right-2 top-2.5 text-[9px] font-bold text-slate-400">₺ Peşin</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`${cardBg} rounded-3xl border p-6 shadow-sm space-y-6`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2.5">
                  <Calculator className="w-4 h-4 text-indigo-600" />
                  <span>Maliyet ve Finansman Parametreleri</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">Ekonomi & Kâr</label>
                  <div className="space-y-3">
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-xs font-bold text-slate-400">USD Kuru:</span>
                      <input
                        type="number"
                        step="0.01"
                        value={params.usdRate}
                        onChange={(e) => updateParam('usdRate', parseFloat(e.target.value) || 1)}
                        className={`w-full text-xs font-mono font-bold pl-20 pr-4 py-3 rounded-2xl border transition-all ${inputBg}`}
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-xs font-bold text-slate-400">Kâr Oranı:</span>
                      <input
                        type="number"
                        value={params.profitRate}
                        onChange={(e) => updateParam('profitRate', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs font-mono font-bold pl-20 pr-4 py-3 rounded-2xl border transition-all ${inputBg}`}
                      />
                      <span className="absolute right-3 top-3.5 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-center">
                <button
                  type="button"
                  onClick={onCalculate}
                  className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95 group"
                >
                  <Calculator className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>MALİYETLERİ HESAPLA VE RAPORLARI GÜNCELLE</span>
                </button>
              </div>
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
  </div>
);
};
