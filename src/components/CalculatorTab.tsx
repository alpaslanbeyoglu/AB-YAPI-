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
    const total = params.baseBuildArea * params.floorCount;
    const avg = parseFloat((total / newCount).toFixed(1));
    const newFlats: FlatItem[] = Array.from({ length: newCount }, (_, i) => {
      if (params.flats[i]) {
        return { ...params.flats[i], id: i + 1, area: avg };
      }
      return {
        id: i + 1,
        name: `Kat Maliki ${i + 1}`,
        tc: `1000000000${i + 1}`,
        area: avg,
        downPayment: 0,
        useTransformationCredit: params.transformationStatus !== 'none',
      };
    });

    onChangeParams({
      ...params,
      flatCount: newCount,
      flats: newFlats,
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
    <div className="space-y-6">
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

      {/* Main Card: General Project Inputs */}
      <div className={`${cardBg} rounded-3xl border p-6 shadow-sm space-y-5`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2.5">
            <Building className="w-4 h-4 text-indigo-600" />
            <span>Genel Proje ve Yapı Bilgileri</span>
          </h3>
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>3D Model ile Senkron</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={`block text-xs font-medium ${labelColor} mb-1.5`}>
              Yapı / Proje Adresi (Ada, Parsel, İl/İlçe):
            </label>
            <input
              type="text"
              value={params.projectAddress}
              onChange={(e) => updateParam('projectAddress', e.target.value)}
              placeholder="Örn: İstanbul, Fatih, 1024 Ada 15 Parsel"
              className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
            />
          </div>

          <div>
            <label className={`block text-xs font-medium ${labelColor} mb-1.5`}>
              Proje Teslim Süresi Seçeneği:
            </label>
            <select
              value={params.durationOption}
              onChange={(e) => updateParam('durationOption', e.target.value as any)}
              className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
            >
              <option value="auto">Otomatik Hesapla (Ruhsat + Kaba + İnce + İskân)</option>
              <option value="manual">Manuel Gir (Ay Olarak)</option>
              <option value="hide">Teklifte Süre Gösterme (Gizle)</option>
            </select>
          </div>

          {params.durationOption === 'manual' && (
            <div>
              <label className="block text-xs font-medium text-red-600 mb-1.5">
                Manuel İnşaat Süresi (Ay):
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

          <div>
            <label className="block text-xs font-medium text-indigo-700 mb-1.5">
              Kentsel Dönüşüm Destek Modeli:
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
              <option value="currentSupport">2025/2026 Mevcut Model (875 Bin TL Hibe + 875 Bin TL Kredi)</option>
              <option value="futureSupport2027">2027 Projeksiyon Modeli (3 Milyon TL Kredi / 180 Ay Vade)</option>
              <option value="none">Kentsel Dönüşüm Desteksiz (Öz Kaynak / Nakit Yapım)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-emerald-700 mb-1.5">
              Yapım Modeli:
            </label>
            <select
              value={params.projectModel}
              onChange={(e) => updateParam('projectModel', e.target.value as any)}
              className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
            >
              <option value="cash">Nakit Ödemeli / Müteahhit Yapımı</option>
              <option value="contractorShare">Kat Karşılığı Yapım (Arsa Payı Paylaşımlı)</option>
            </select>
          </div>

          {params.projectModel === 'contractorShare' && (
            <div className="space-y-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 col-span-1 sm:col-span-2 lg:col-span-1">
              <div>
                <label className="block text-xs font-semibold text-amber-900 mb-1.5">
                  Müteahhit Daire Payı Oranı (%):
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={params.contractorShareRate}
                  onChange={(e) => updateParam('contractorShareRate', parseFloat(e.target.value) || 50)}
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-amber-900 mb-2">
                  Müteahhite Kalacak Daireleri Seçin:
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-1.5">
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
                        className={`py-1.5 text-xs font-mono font-bold rounded-lg border text-center transition-all ${
                          isContractor
                            ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        D{flat.id}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-amber-100">
                  <span className="text-[10px] text-slate-600">
                    Müteahhit Daire Sayısı: <strong className="text-amber-800 font-mono">{(params.contractorFlatIds && params.contractorFlatIds.length > 0) ? params.contractorFlatIds.length : Math.round(params.flatCount * (params.contractorShareRate / 100))} / {params.flatCount}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeParams({
                        ...params,
                        contractorFlatIds: [],
                        flats: params.flats.map(f => ({ ...f, isContractorShare: undefined }))
                      });
                    }}
                    className="text-[10px] text-indigo-600 font-medium hover:underline"
                  >
                    Orana Göre Sıfırla
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200/50">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.showContractorShare3D || false}
                    onChange={(e) => updateParam('showContractorShare3D', e.target.checked)}
                    className="rounded-sm text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-medium text-slate-800">3D Modelde Müteahhit Paylarını Belirt</span>
                </label>
              </div>
            </div>
          )}

          {/* BİNA TABAN OTURUMU & CEPHE GİRİŞ SEÇENEKLERİ (3D MODEL CANLI ENTEGRE) */}
          <div className="sm:col-span-2 lg:col-span-3 p-4 sm:p-5 rounded-3xl border bg-slate-50/90 border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                  <Ruler className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Bina Taban Oturumu & Cephe Ölçüleri</span>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      3D Model ile Canlı Entegre
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Taban alanını doğrudan m² olarak veya alternatif cephe adetleri ve uzunlukları ile belirleyin
                  </p>
                </div>
              </div>

              {/* Quick Navigation to 3D Model */}
              {onNavigateToModel && (
                <button
                  type="button"
                  onClick={onNavigateToModel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 transition-all shadow-xs self-start sm:self-auto"
                >
                  <Box className="w-3.5 h-3.5 text-indigo-600" />
                  <span>3D Modelde Canlı Gör</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              )}
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => handleFootprintUpdate({ footprintInputMode: 'directArea' })}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition-all flex flex-col items-center gap-1 ${
                  activeFootprintMode === 'directArea'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-[11px] font-bold">1. Doğrudan m²</span>
                <span className={`text-[10px] ${activeFootprintMode === 'directArea' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {params.baseBuildArea} m²
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleFootprintUpdate({ footprintInputMode: 'dimensions' })}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition-all flex flex-col items-center gap-1 ${
                  activeFootprintMode === 'dimensions'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-[11px] font-bold">2. Ön × Yan</span>
                <span className={`text-[10px] ${activeFootprintMode === 'dimensions' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {params.facadeWidth || 14}m × {params.facadeDepth || 18}m
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleFootprintUpdate({ footprintInputMode: 'polygonDraw' })}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition-all flex flex-col items-center gap-1 ${
                  activeFootprintMode === 'polygonDraw'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-1 ring-indigo-400'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-[11px] font-bold">3. ✏️ Nokta Çizim</span>
                <span className={`text-[10px] ${activeFootprintMode === 'polygonDraw' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  Serbest Parsel & Çizgi
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleFootprintUpdate({ footprintInputMode: 'customFacades' })}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition-all flex flex-col items-center gap-1 ${
                  activeFootprintMode === 'customFacades'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-[11px] font-bold">4. Çoklu Cephe</span>
                <span className={`text-[10px] ${activeFootprintMode === 'customFacades' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {params.customFacadeCount || customFacadesList.length} Cepheli Parsel
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleFootprintUpdate({ footprintInputMode: 'lShape' })}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition-all flex flex-col items-center gap-1 col-span-2 sm:col-span-1 ${
                  activeFootprintMode === 'lShape'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-[11px] font-bold">5. L-Tipi Kütle</span>
                <span className={`text-[10px] ${activeFootprintMode === 'lShape' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  Kademeli Form
                </span>
              </button>
            </div>

            {/* Mode 1: Doğrudan Alan (m²) */}
            {activeFootprintMode === 'directArea' && (
              <div className="space-y-3 p-3.5 bg-white rounded-2xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Bina Taban Oturumu (Net m²):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="20"
                        step="1"
                        value={params.baseBuildArea}
                        onChange={(e) => {
                          const base = parseFloat(e.target.value) || 0;
                          handleFootprintUpdate({ baseBuildArea: base });
                        }}
                        className={`w-full text-sm font-mono font-bold px-3.5 py-2 rounded-xl border transition-all ${inputBg}`}
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">m²</span>
                    </div>
                  </div>

                  <div className="sm:w-64">
                    <span className="block text-[11px] font-medium text-slate-500 mb-1">Hızlı Seçim Şablonları:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[100, 140, 180, 220, 252, 300, 400].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleFootprintUpdate({ baseBuildArea: preset })}
                          className={`px-2 py-1 text-[11px] font-mono rounded-lg border transition-all ${
                            params.baseBuildArea === preset
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {preset} m²
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: Ön × Yan Cephe (4 Cephe) */}
            {activeFootprintMode === 'dimensions' && (
              <div className="space-y-4 p-3.5 bg-white rounded-2xl border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-slate-800">Ön Cephe Genişliği (W):</label>
                      <div className="flex items-center gap-1 font-mono font-bold text-indigo-700">
                        <input
                          type="number"
                          step="0.5"
                          min="5"
                          max="60"
                          value={params.facadeWidth || 14}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleFootprintUpdate({ facadeWidth: val });
                          }}
                          className={`w-20 px-2 py-1 text-right text-xs rounded-lg border ${inputBg}`}
                        />
                        <span className="text-xs font-normal text-slate-500">m</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="6"
                      max="40"
                      step="0.5"
                      value={params.facadeWidth || 14}
                      onChange={(e) => handleFootprintUpdate({ facadeWidth: parseFloat(e.target.value) || 14 })}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-slate-800">Yan Cephe Derinliği (D):</label>
                      <div className="flex items-center gap-1 font-mono font-bold text-indigo-700">
                        <input
                          type="number"
                          step="0.5"
                          min="5"
                          max="60"
                          value={params.facadeDepth || 18}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleFootprintUpdate({ facadeDepth: val });
                          }}
                          className={`w-20 px-2 py-1 text-right text-xs rounded-lg border ${inputBg}`}
                        />
                        <span className="text-xs font-normal text-slate-500">m</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="6"
                      max="40"
                      step="0.5"
                      value={params.facadeDepth || 18}
                      onChange={(e) => handleFootprintUpdate({ facadeDepth: parseFloat(e.target.value) || 18 })}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
                  <span className="text-[10px] font-medium text-slate-500 mr-1">Standart Cephe Ölçüleri:</span>
                  {[
                    { label: 'Kare 14×14 (196 m²)', w: 14, d: 14 },
                    { label: 'Standart 14×18 (252 m²)', w: 14, d: 18 },
                    { label: 'Geniş 16×20 (320 m²)', w: 16, d: 20 },
                    { label: 'Uzun Parsel 12×24 (288 m²)', w: 12, d: 24 },
                    { label: 'Dar Parsel 10×20 (200 m²)', w: 10, d: 20 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleFootprintUpdate({ facadeWidth: preset.w, facadeDepth: preset.d })}
                      className={`px-2 py-0.5 text-[10px] rounded-lg border transition-all ${
                        params.facadeWidth === preset.w && params.facadeDepth === preset.d
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mode 3: Serbest Nokta ve Çizgi Çizimi (Polygon Footprint & Facade Detail) */}
            {activeFootprintMode === 'polygonDraw' && (
              <div className="space-y-4 p-4 sm:p-5 bg-gradient-to-b from-indigo-50/40 to-white rounded-3xl border border-indigo-200/90 shadow-md">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-indigo-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Nokta Çizim Modu & Eşzamanlı 3D Canlı Görünüm
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Sol tarafta köşe noktalarını ve cephe detaylarını belirleyin, sağ tarafta 3D binanın anlık değişimini izleyin.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Canlı 3D Senkronizasyon
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Sol Bölüm: 2D Çizim ve Nokta Editörü */}
                  <div className="lg:col-span-7 space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-indigo-600" />
                        2D Poligon Taban & Cephe Çizim Alanı
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {params.polygonPoints?.length || 4} Köşe Noktası • {Math.round(params.baseBuildArea || 0)} m² Taban
                      </span>
                    </div>

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
                      onChangeFacadeConfigs={(newConfigs) => {
                        onChangeParams({ ...params, facadeConfigs: newConfigs });
                      }}
                      mainEntranceIndex={params.mainEntranceFacadeIndex || 0}
                      onChangeMainEntranceIndex={(idx) => {
                        onChangeParams({ ...params, mainEntranceFacadeIndex: idx });
                      }}
                      flatsPerFloor={Math.max(1, Math.round(params.flatCount / (params.floorCount || 1)))}
                      theme={theme}
                      compact={false}
                    />
                  </div>

                  {/* Sağ Bölüm: 3D Canlı Bina Modeli */}
                  <div className="lg:col-span-5 space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Sağ Taraf: 3D Canlı Model Görünümü
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {params.floorCount} Kat • {params.roofType === 'flat' ? 'Teras Çatı' : 'Kırma Çatı'}
                      </span>
                    </div>

                    <div className="h-[600px] rounded-2xl overflow-hidden border border-slate-300 shadow-inner bg-slate-950 relative">
                      <ThreeBuildingView
                        params={calcBuildingModelParams}
                        theme={theme}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 4: Çoklu Cephe Adetleri & Uzunlukları */}
            {activeFootprintMode === 'customFacades' && (
              <div className="space-y-4 p-3.5 bg-white rounded-2xl border border-slate-200">
                {/* Facade Count selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">Bina Cephe Adedi:</span>
                    <div className="flex items-center gap-1">
                      {[4, 5, 6, 8].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => {
                            const newSides = getDefaultCustomFacades(cnt, params.facadeWidth || 14, params.facadeDepth || 18);
                            handleFootprintUpdate({
                              customFacadeCount: cnt,
                              customFacades: newSides,
                            });
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                            (params.customFacadeCount || customFacadesList.length) === cnt
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cnt} Cephe
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const current = [...customFacadesList];
                      const newId = current.length + 1;
                      current.push({
                        id: newId,
                        name: `${newId}. Cephe`,
                        length: 10.0,
                      });
                      handleFootprintUpdate({
                        customFacadeCount: current.length,
                        customFacades: current,
                      });
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Özel Cephe Ekle</span>
                  </button>
                </div>

                {/* Facade length inputs grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {customFacadesList.map((side, idx) => (
                    <div
                      key={side.id || idx}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 hover:border-indigo-200 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={side.name}
                          onChange={(e) => {
                            const updated = [...customFacadesList];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            handleFootprintUpdate({ customFacades: updated });
                          }}
                          className="text-[11px] font-semibold text-slate-700 bg-transparent border-none p-0 focus:ring-0 w-full truncate"
                          placeholder="Cephe Adı"
                        />
                        {customFacadesList.length > 3 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = customFacadesList.filter((_, i) => i !== idx);
                              handleFootprintUpdate({
                                customFacadeCount: updated.length,
                                customFacades: updated,
                              });
                            }}
                            className="text-slate-400 hover:text-red-600 p-0.5"
                            title="Bu cepheyi sil"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="100"
                          value={side.length}
                          onChange={(e) => {
                            const updated = [...customFacadesList];
                            updated[idx] = { ...updated[idx], length: parseFloat(e.target.value) || 0 };
                            handleFootprintUpdate({ customFacades: updated });
                          }}
                          className={`w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border transition-all ${inputBg}`}
                        />
                        <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-medium">m</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mode 4: L-Tipi / Kademeli */}
            {activeFootprintMode === 'lShape' && (
              <div className="space-y-3 p-3.5 bg-white rounded-2xl border border-slate-200">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Ana Ön Genişlik:
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        value={params.lShapeFrontMain || 16.0}
                        onChange={(e) => handleFootprintUpdate({ lShapeFrontMain: parseFloat(e.target.value) || 16.0 })}
                        className={`w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border ${inputBg}`}
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-slate-400">m</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Ana Derinlik:
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        value={params.lShapeDepthMain || 20.0}
                        onChange={(e) => handleFootprintUpdate({ lShapeDepthMain: parseFloat(e.target.value) || 20.0 })}
                        className={`w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border ${inputBg}`}
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-slate-400">m</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Girinti Eni:
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        value={params.lShapeRecessFront || 6.0}
                        onChange={(e) => handleFootprintUpdate({ lShapeRecessFront: parseFloat(e.target.value) || 6.0 })}
                        className={`w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border ${inputBg}`}
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-slate-400">m</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Girinti Derinliği:
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        value={params.lShapeRecessDepth || 8.0}
                        onChange={(e) => handleFootprintUpdate({ lShapeRecessDepth: parseFloat(e.target.value) || 8.0 })}
                        className={`w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border ${inputBg}`}
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-slate-400">m</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Live Calculation Summary Bar */}
            <div className="p-3 bg-gradient-to-r from-indigo-50/90 via-slate-50 to-emerald-50/90 rounded-2xl border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 font-medium">Hesaplanan Taban Oturumu:</span>
                  <span className="font-mono font-bold text-base text-indigo-700">
                    {footprintCalc.area.toFixed(1)} m²
                  </span>
                </div>

                <div className="h-4 w-px bg-slate-300 hidden sm:block" />

                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className="font-medium">Bina Çevresi:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {footprintCalc.perimeter.toFixed(1)} m
                  </span>
                </div>

                <div className="h-4 w-px bg-slate-300 hidden sm:block" />

                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className="font-medium">3D Model Eşleşmesi:</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {footprintCalc.effectiveWidth}m (Ön) × {footprintCalc.effectiveDepth}m (Yan)
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 italic">
                {footprintCalc.description}
              </div>
            </div>
          </div>

          <div>
            <label className={`block text-xs font-medium ${labelColor} mb-1.5`}>
              Toplam Kat Sayısı:
            </label>
            <input
              type="number"
              min="1"
              value={params.floorCount}
              onChange={(e) => {
                const floors = parseInt(e.target.value, 10) || 1;
                const total = params.baseBuildArea * floors;
                const avg = parseFloat((total / params.flatCount).toFixed(1));
                const updatedFlats = params.flats.map((f) => ({ ...f, area: avg }));
                onChangeParams({
                  ...params,
                  floorCount: floors,
                  flats: updatedFlats,
                });
              }}
              className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
            />
          </div>

          <div>
            <label className={`block text-xs font-medium ${labelColor} mb-1.5`}>
              Toplam Daire Sayısı:
            </label>
            <input
              type="number"
              min="1"
              value={params.flatCount}
              onChange={(e) => handleFlatCountChange(parseInt(e.target.value, 10) || 1)}
              className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
            />
          </div>

          {/* Dükkan / Ticari Seçeneği */}
          <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-200 space-y-2">
            <label className="block text-xs font-semibold text-indigo-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-indigo-600" />
                <span>Normal Kat Harici Zemin Dükkan:</span>
              </span>
              {params.hasGroundFloorShop ? (
                <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                  Dükkan Var
                </span>
              ) : (
                <span className="text-[10px] font-medium bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                  Dükkansız
                </span>
              )}
            </label>
            <select
              value={params.hasGroundFloorShop ? 'shop' : 'no_shop'}
              onChange={(e) => {
                const hasShop = e.target.value === 'shop';
                onChangeParams({
                  ...params,
                  hasGroundFloorShop: hasShop,
                  shopCount: params.shopCount || 1,
                  shopHeight: params.shopHeight || 3.8,
                });
              }}
              className={`w-full text-xs px-3 py-2 rounded-xl border transition-all ${inputBg}`}
            >
              <option value="no_shop">Dükkansız (Sadece Normal Katlar)</option>
              <option value="shop">Zemin Katta Dükkan / Ticari Var</option>
            </select>
          </div>

          {params.hasGroundFloorShop && (
            <>
              <div>
                <label className={`block text-xs font-medium ${labelColor} mb-1.5`}>
                  Zemin Dükkan Sayısı (Adet):
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={params.shopCount || 1}
                  onChange={(e) => updateParam('shopCount', Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-medium ${labelColor} mb-1.5`}>
                  Dükkan Tavan Yüksekliği (m):
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="3.0"
                  max="6.0"
                  value={params.shopHeight || 3.8}
                  onChange={(e) => updateParam('shopHeight', parseFloat(e.target.value) || 3.8)}
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
                />
              </div>
            </>
          )}

          {/* İnşaat / Yapı Tipi */}
          <div>
            <label className={`block text-xs font-medium ${labelColor} mb-1.5`}>
              İnşaat / Yapı Tipi:
            </label>
            <select
              value={params.buildingType}
              onChange={(e) => updateParam('buildingType', e.target.value as any)}
              className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
            >
              <option value="standard">Standart Konut (Orta Segment)</option>
              <option value="luxury">Lüks / Akıllı Yapı (İnce İşçilik +%35)</option>
              <option value="commercial">Karma Yapı (Dükkan+Konut / Kaba +%15)</option>
            </select>
          </div>

          {/* Çatı Tipi & Dubleks Seçeneği */}
          <div>
            <label className={`block text-xs font-medium ${labelColor} mb-1.5`}>
              Mimari Çatı Konstrüksiyonu:
            </label>
            <select
              value={params.roofType || 'gable'}
              onChange={(e) => updateParam('roofType', e.target.value as any)}
              className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
            >
              <option value="gable">🏠 Kırma Çatı (Klasik 4 Eğimli / Kiremit Çatı)</option>
              <option value="flat">🏙️ Düz Teras Çatı (Modern Parapetli Teras)</option>
              <option value="mansard">🏛️ Mansart Çatı (Pencereli Çatı Arası Kat)</option>
              <option value="duplex">🌟 Çatı Dubleksi (Dubleks Daire & Çatı Terası)</option>
            </select>
          </div>

          {/* Bodrum Kat Sayısı */}
          <div>
            <label className={`block text-xs font-medium ${labelColor} mb-1.5`}>
              Bodrum Kat Sayısı (Otopark & Sığınak):
            </label>
            <input
              type="number"
              min="0"
              max="5"
              value={params.basementCount !== undefined ? params.basementCount : 1}
              onChange={(e) => updateParam('basementCount', parseInt(e.target.value, 10) || 0)}
              className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-emerald-700 mb-1.5">
              Güncel Dolar Kuru (1 USD = TL):
            </label>
            <input
              type="number"
              step="0.01"
              value={params.usdRate}
              onChange={(e) => updateParam('usdRate', parseFloat(e.target.value) || 1)}
              className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
            />
          </div>

          <div>
            <label className={`block text-xs font-medium ${labelColor} mb-1.5`}>
              Özel Maliyet Çarpanı (Bölge/Enflasyon):
            </label>
            <input
              type="number"
              step="0.05"
              value={params.costMultiplier}
              onChange={(e) => updateParam('costMultiplier', parseFloat(e.target.value) || 1)}
              className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
            />
          </div>

          <div>
            <label className={`block text-xs font-medium ${labelColor} mb-1.5`}>
              Müteahhit Kâr Oranı (%):
            </label>
            <input
              type="number"
              value={params.profitRate}
              onChange={(e) => updateParam('profitRate', parseFloat(e.target.value) || 0)}
              className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
            />
          </div>
        </div>

        {/* User Request: "Hesaplama tuşu Genel proje ve yapı bilgileri girişlerinin altında olsun." */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Ölçüler 3D Model ve 2D Kat Planı ile eşzamanlı güncellenir.</span>
          </div>
          <button
            id="btn-calculate-general-inputs"
            type="button"
            onClick={onCalculate}
            className="flex items-center justify-center gap-2.5 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 text-xs sm:text-sm transition-all shrink-0 cursor-pointer"
          >
            <Calculator className="w-4 h-4" />
            <span>PROJEYİ HESAPLA & TÜM TABLOLARI GÜNCELLE</span>
          </button>
        </div>
      </div>

      {/* Calculation Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
