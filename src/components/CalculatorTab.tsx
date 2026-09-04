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
} from 'lucide-react';
import { ProjectParams, CalculationResult, FlatItem, AppTheme } from '../types';

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

          <div>
            <label className={`block text-xs font-medium ${labelColor} mb-1.5`}>
              Bina Taban Oturumu (m²):
            </label>
            <input
              type="number"
              min="10"
              value={params.baseBuildArea}
              onChange={(e) => {
                const base = parseFloat(e.target.value) || 0;
                const total = base * params.floorCount;
                const avg = parseFloat((total / params.flatCount).toFixed(1));
                const updatedFlats = params.flats.map((f) => ({ ...f, area: avg }));
                onChangeParams({
                  ...params,
                  baseBuildArea: base,
                  flats: updatedFlats,
                });
              }}
              className={`w-full text-xs px-3.5 py-2.5 rounded-xl border transition-all ${inputBg}`}
            />
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
