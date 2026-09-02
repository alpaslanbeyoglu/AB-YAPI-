import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Calculator,
  Building,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Users,
  Layers,
} from 'lucide-react';
import { ProjectParams, CalculationResult, FlatItem } from '../types';

interface CalculatorTabProps {
  params: ProjectParams;
  results: CalculationResult;
  onChangeParams: (newParams: ProjectParams) => void;
  onCalculate: () => void;
  onNavigateToModel?: () => void;
  theme?: 'light' | 'dark';
}

export const CalculatorTab: React.FC<CalculatorTabProps> = ({
  params,
  results,
  onChangeParams,
  onCalculate,
  onNavigateToModel,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [isFlatsOpen, setIsFlatsOpen] = useState(true);
  const [activeCostTab, setActiveCostTab] = useState<'sozlesme' | 'kaba' | 'ince' | 'malik' | 'gelir'>('sozlesme');
  const [bulkDownPayment, setBulkDownPayment] = useState<number>(0);

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
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
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

      {/* 3D Model & Floor Plan Fast Trigger Banner */}
      {onNavigateToModel && (
        <div className="bg-[#121214] border border-indigo-500/30 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                3D Yapı Modeli & Mimari Kat Planı
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Cephe uzunluğu, kat yüksekliği, oda sayısı, merdiven ve asansör ölçülerini girerek 3D bina simülasyonu ve kat planı oluşturun.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToModel}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95 shrink-0"
          >
            <span>3D Model & Kat Planını Aç</span>
            <Building className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Bento Card: General Project Inputs */}
      <div className="bg-[#121214] rounded-3xl border border-zinc-800/80 p-6 shadow-xl space-y-5">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2.5 pb-3 border-b border-zinc-800/80">
          <Building className="w-4 h-4 text-indigo-400" />
          <span>Genel Proje ve Yapı Bilgileri</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Yapı / Proje Adresi (Ada, Parsel, İl/İlçe):
            </label>
            <input
              type="text"
              value={params.projectAddress}
              onChange={(e) => updateParam('projectAddress', e.target.value)}
              placeholder="Örn: İstanbul, Fatih, 1024 Ada 15 Parsel"
              className="w-full text-xs px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 text-zinc-100 placeholder:text-zinc-600 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Proje Teslim Süresi Seçeneği:
            </label>
            <select
              value={params.durationOption}
              onChange={(e) => updateParam('durationOption', e.target.value as any)}
              className="w-full text-xs px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 text-zinc-100 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            >
              <option value="auto">Otomatik Hesapla (Ruhsat + Kaba + İnce + İskân)</option>
              <option value="manual">Manuel Gir (Ay Olarak)</option>
              <option value="hide">Teklifte Süre Gösterme (Gizle)</option>
            </select>
          </div>

          {params.durationOption === 'manual' && (
            <div>
              <label className="block text-xs font-medium text-red-400 mb-1.5">
                Manuel İnşaat Süresi (Ay):
              </label>
              <input
                type="number"
                min="1"
                value={params.manualMonths}
                onChange={(e) => updateParam('manualMonths', parseFloat(e.target.value) || 1)}
                className="w-full text-xs px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 text-zinc-100 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-indigo-400 mb-1.5">
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
              className="w-full text-xs px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 text-zinc-100 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            >
              <option value="currentSupport">2025/2026 Mevcut Model (875 Bin TL Hibe + 875 Bin TL Kredi)</option>
              <option value="futureSupport2027">2027 Projeksiyon Modeli (3 Milyon TL Kredi / 180 Ay Vade)</option>
              <option value="none">Kentsel Dönüşüm Desteksiz (Öz Kaynak / Nakit Yapım)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-emerald-400 mb-1.5">
              Yapım Modeli:
            </label>
            <select
              value={params.projectModel}
              onChange={(e) => updateParam('projectModel', e.target.value as any)}
              className="w-full text-xs px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 text-zinc-100 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            >
              <option value="cash">Nakit Ödemeli / Müteahhit Yapımı</option>
              <option value="contractorShare">Kat Karşılığı Yapım (Arsa Payı Paylaşımlı)</option>
            </select>
          </div>

          {params.projectModel === 'contractorShare' && (
            <div>
              <label className="block text-xs font-medium text-emerald-400 mb-1.5">
                Müteahhit Daire Payı Oranı (%):
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={params.contractorShareRate}
                onChange={(e) => updateParam('contractorShareRate', parseFloat(e.target.value) || 50)}
                className="w-full text-xs px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 text-zinc-100 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
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
              className="w-full text-xs px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 text-zinc-100 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
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
              className="w-full text-xs px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 text-zinc-100 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Toplam Daire Sayısı:
            </label>
            <input
              type="number"
              min="1"
              value={params.flatCount}
              onChange={(e) => handleFlatCountChange(parseInt(e.target.value, 10) || 1)}
              className="w-full text-xs px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 text-zinc-100 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              İnşaat / Yapı Tipi:
            </label>
            <select
              value={params.buildingType}
              onChange={(e) => updateParam('buildingType', e.target.value as any)}
              className="w-full text-xs px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 text-zinc-100 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            >
              <option value="standard">Standart Konut (Orta Segment)</option>
              <option value="luxury">Lüks / Akıllı Yapı (İnce İşçilik +%35)</option>
              <option value="commercial">Karma Yapı (Dükkan+Konut / Kaba +%15)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-emerald-400 mb-1.5">
              Güncel Dolar Kuru (1 USD = TL):
            </label>
            <input
              type="number"
              step="0.01"
              value={params.usdRate}
              onChange={(e) => updateParam('usdRate', parseFloat(e.target.value) || 1)}
              className="w-full text-xs px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 text-zinc-100 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Özel Maliyet Çarpanı (Bölge/Enflasyon):
            </label>
            <input
              type="number"
              step="0.05"
              value={params.costMultiplier}
              onChange={(e) => updateParam('costMultiplier', parseFloat(e.target.value) || 1)}
              className="w-full text-xs px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 text-zinc-100 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Müteahhit Kâr Oranı (%):
            </label>
            <input
              type="number"
              value={params.profitRate}
              onChange={(e) => updateParam('profitRate', parseFloat(e.target.value) || 0)}
              className="w-full text-xs px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 text-zinc-100 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Accordion Bento Card: Kat Malikleri Bilgileri & Metrajlar */}
      <div className="bg-[#121214] rounded-3xl border border-zinc-800/80 overflow-hidden shadow-xl">
        <button
          type="button"
          onClick={() => setIsFlatsOpen(!isFlatsOpen)}
          className="w-full px-6 py-4 bg-[#18181b] hover:bg-zinc-800/70 flex items-center justify-between text-xs font-semibold text-zinc-200 transition-colors"
        >
          <span className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Kat Malikleri Bilgileri, Metrajlar ve Peşinat Kartları ({params.flats.length} Daire)</span>
          </span>
          <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
            {isFlatsOpen ? (
              <>
                <ChevronUp className="w-4 h-4" /> Gizle
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" /> Göster / Düzenle
              </>
            )}
          </span>
        </button>

        {isFlatsOpen && (
          <div className="p-6 space-y-5 bg-[#121214]">
            {/* Toplu Peşinat Çubuğu */}
            <div className="flex items-center gap-3 flex-wrap p-4 bg-[#18181b] border border-indigo-500/20 rounded-2xl text-xs">
              <label className="font-medium text-zinc-300 whitespace-nowrap">
                Tüm Dairelere Toplu Peşinat Uygula:
              </label>
              <input
                type="number"
                step="10000"
                value={bulkDownPayment}
                onChange={(e) => setBulkDownPayment(parseFloat(e.target.value) || 0)}
                placeholder="0 TL"
                className="w-36 text-xs px-3 py-2 bg-[#121214] border border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleApplyBulkDownPayment}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all active:scale-95"
              >
                Uygula
              </button>
            </div>

            {/* Flat cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {params.flats.map((flat, idx) => (
                <div
                  key={flat.id}
                  className="bg-[#18181b] rounded-2xl border border-zinc-800/80 hover:border-zinc-700 p-4 space-y-3 transition-all"
                >
                  <div className="font-semibold text-xs text-zinc-200 flex items-center justify-between pb-2 border-b border-zinc-800">
                    <span>Daire {flat.id} Bilgileri</span>
                    <span className="text-[10px] bg-zinc-800 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-zinc-700">
                      {flat.area} m²
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                      Hak Sahibi Adı Soyadı:
                    </label>
                    <input
                      type="text"
                      value={flat.name}
                      onChange={(e) => handleFlatChange(idx, 'name', e.target.value)}
                      className="w-full text-xs px-3 py-1.5 bg-[#121214] border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                      T.C. Kimlik No:
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      value={flat.tc}
                      onChange={(e) => handleFlatChange(idx, 'tc', e.target.value)}
                      className="w-full text-xs px-3 py-1.5 bg-[#121214] border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                        Alan (m²):
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={flat.area}
                        onChange={(e) =>
                          handleFlatChange(idx, 'area', parseFloat(e.target.value) || 0)
                        }
                        className="w-full text-xs px-3 py-1.5 bg-[#121214] border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                        Peşinat (TL):
                      </label>
                      <input
                        type="number"
                        step="5000"
                        value={flat.downPayment}
                        onChange={(e) =>
                          handleFlatChange(idx, 'downPayment', parseFloat(e.target.value) || 0)
                        }
                        className="w-full text-xs px-3 py-1.5 bg-[#121214] border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                      Dönüşüm Desteği:
                    </label>
                    <select
                      value={flat.useTransformationCredit ? 'yes' : 'no'}
                      onChange={(e) =>
                        handleFlatChange(idx, 'useTransformationCredit', e.target.value === 'yes')
                      }
                      className="w-full text-xs px-3 py-1.5 bg-[#121214] border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                    >
                      <option value="yes">Evet (Destekli)</option>
                      <option value="no">Hayır (Nakit / Öz Kaynak)</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Primary Calculation Button (Bento Action) */}
      <button
        id="calculate-and-update-btn"
        type="button"
        onClick={onCalculate}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all flex items-center justify-center gap-2.5 active:scale-[0.99]"
      >
        <Calculator className="w-5 h-5" />
        <span>HESAPLA VE TÜM TABLOLARI GÜNCELLE</span>
      </button>

      {/* Sub-Parameters Navigation Bento Card */}
      <div className="bg-[#121214] rounded-3xl border border-zinc-800/80 p-6 shadow-xl space-y-5">
        <div className="flex border-b border-zinc-800/80 overflow-x-auto gap-2 pb-2">
          <button
            type="button"
            onClick={() => setActiveCostTab('sozlesme')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeCostTab === 'sozlesme'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-[#18181b] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            1. Maliyet Kalemleri (Resmi, Kaba, İnce)
          </button>
          <button
            type="button"
            onClick={() => setActiveCostTab('malik')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeCostTab === 'malik'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-[#18181b] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            2. Malik Ödeme Politikası
          </button>
          <button
            type="button"
            onClick={() => setActiveCostTab('gelir')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeCostTab === 'gelir'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-[#18181b] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            3. Hakediş Oranları (% Aşama)
          </button>
        </div>

        {/* Tab 1: Maliyet Kalemleri */}
        {activeCostTab === 'sozlesme' && (
          <div className="space-y-5 pt-1">
            <div>
              <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">
                Resmi Süreç & Pazarlama (TL)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Noter & Tapu Şerh Giderleri:
                  </label>
                  <input
                    type="number"
                    value={params.costNotaryContract}
                    onChange={(e) => updateParam('costNotaryContract', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Şirket & YAMBİS Belgesi:
                  </label>
                  <input
                    type="number"
                    value={params.costCompany}
                    onChange={(e) => updateParam('costCompany', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Projeler & Harçlar (m² Başına):
                  </label>
                  <input
                    type="number"
                    value={params.priceProjectPermit}
                    onChange={(e) => updateParam('priceProjectPermit', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    SGK Asgari İşçilik (m² Başına):
                  </label>
                  <input
                    type="number"
                    value={params.priceSgk}
                    onChange={(e) => updateParam('priceSgk', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    All-Risk Sigortası:
                  </label>
                  <input
                    type="number"
                    value={params.costInsurance}
                    onChange={(e) => updateParam('costInsurance', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Pazarlama (Daire Başı):
                  </label>
                  <input
                    type="number"
                    value={params.costSalesMarketing}
                    onChange={(e) => updateParam('costSalesMarketing', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/80">
              <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">
                Kaba İnşaat Kalemleri (TL)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Beton C30/35 (m³):
                  </label>
                  <input
                    type="number"
                    value={params.priceConcrete}
                    onChange={(e) => updateParam('priceConcrete', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    İnşaat Demiri (Ton):
                  </label>
                  <input
                    type="number"
                    value={params.priceSteel}
                    onChange={(e) => updateParam('priceSteel', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Hafriyat & Kalıp/Demir İşçiliği (m²):
                  </label>
                  <input
                    type="number"
                    value={params.costKabaWork}
                    onChange={(e) => updateParam('costKabaWork', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Yaklaşık Kaba Malzeme Paneli */}
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-200">
                <div className="font-semibold text-amber-300 mb-2 flex items-center gap-1.5">
                  <span>📦 Yaklaşık Kaba İnşaat Malzeme Hesabı</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
                  <p>
                    Toplam Alan: <strong className="text-white">{results.totalArea.toLocaleString('tr-TR')} m²</strong>
                  </p>
                  <p>
                    Beton (≈0,45 m³/m²): <strong className="text-white">{results.concreteM3.toFixed(1)} m³</strong>
                  </p>
                  <p>
                    Demir (≈0,04 ton/m²): <strong className="text-white">{results.steelTon.toFixed(2)} ton</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/80">
              <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">
                İnce İşçilik & Donanım (TL)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Asansör (Bina):</label>
                  <input
                    type="number"
                    value={params.costElevator}
                    onChange={(e) => updateParam('costElevator', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Akıllı Ev (Daire):</label>
                  <input
                    type="number"
                    value={params.priceSmartHome}
                    onChange={(e) => updateParam('priceSmartHome', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Diafon & Giriş:</label>
                  <input
                    type="number"
                    value={params.costIntercom}
                    onChange={(e) => updateParam('costIntercom', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Doğalgaz & Kombi:</label>
                  <input
                    type="number"
                    value={params.priceGas}
                    onChange={(e) => updateParam('priceGas', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Sıhhi Tesisat/Vitrifiye:</label>
                  <input
                    type="number"
                    value={params.pricePlumbing}
                    onChange={(e) => updateParam('pricePlumbing', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Elektrik Altyapı:</label>
                  <input
                    type="number"
                    value={params.priceElectric}
                    onChange={(e) => updateParam('priceElectric', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">PVC Doğrama (m²):</label>
                  <input
                    type="number"
                    value={params.pricePvc}
                    onChange={(e) => updateParam('pricePvc', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Seramik & Parke (m²):</label>
                  <input
                    type="number"
                    value={params.priceTiles}
                    onChange={(e) => updateParam('priceTiles', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Mutfak & Tezgah (Daire):</label>
                  <input
                    type="number"
                    value={params.priceKitchen}
                    onChange={(e) => updateParam('priceKitchen', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">İç/Dış Kapılar (Daire):</label>
                  <input
                    type="number"
                    value={params.priceDoors}
                    onChange={(e) => updateParam('priceDoors', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Şap, Sıva & Boya (m²):</label>
                  <input
                    type="number"
                    value={params.pricePaintPlaster}
                    onChange={(e) => updateParam('pricePaintPlaster', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Malik Ödeme Politikası */}
        {activeCostTab === 'malik' && (
          <div className="pt-2">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Kat Maliklerine Müteahhit Kârı Yansıtılsın mı?:
            </label>
            <select
              value={params.includeProfitOwner}
              onChange={(e) => updateParam('includeProfitOwner', e.target.value as any)}
              className="w-full sm:w-80 text-xs px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="yes">Evet (Maliyet + Kâr Yansıtılsın)</option>
              <option value="no">Hayır (Sadece Net İnşaat Maliyeti)</option>
            </select>
          </div>
        )}

        {/* Tab 3: Hakediş Oranları */}
        {activeCostTab === 'gelir' && (
          <div className="space-y-4 pt-2">
            {/* Live Percentage Status Badge */}
            <div
              className={`p-4 rounded-2xl text-xs flex items-center justify-between font-medium border ${
                isStageValid
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-red-500/10 text-red-300 border-red-500/30'
              }`}
            >
              <span>
                {isStageValid
                  ? '✔ Aşama Yüzdeleri Toplamı: %100 (Uygun)'
                  : `⚠️ Aşama Toplamı Hatalı! (Toplam: %${stageTotal.toFixed(1)})`}
              </span>
              <span className="font-mono">
                {params.stage1Pay} + {params.stage2Pay} + {params.stage3Pay} + {params.stage4Pay} + {params.stage5Pay} = %{stageTotal.toFixed(1)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  1. Aşama % (Sözleşme / Peşinat):
                </label>
                <input
                  type="number"
                  value={params.stage1Pay}
                  onChange={(e) => updateParam('stage1Pay', parseFloat(e.target.value) || 0)}
                  className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  2. Aşama % (Subasman / Temel):
                </label>
                <input
                  type="number"
                  value={params.stage2Pay}
                  onChange={(e) => updateParam('stage2Pay', parseFloat(e.target.value) || 0)}
                  className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  3. Aşama % (Kaba İnşaat Bitimi):
                </label>
                <input
                  type="number"
                  value={params.stage3Pay}
                  onChange={(e) => updateParam('stage3Pay', parseFloat(e.target.value) || 0)}
                  className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  4. Aşama % (İnce İnşaat & Tesisat):
                </label>
                <input
                  type="number"
                  value={params.stage4Pay}
                  onChange={(e) => updateParam('stage4Pay', parseFloat(e.target.value) || 0)}
                  className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  5. Aşama % (İskân & Teslim):
                </label>
                <input
                  type="number"
                  value={params.stage5Pay}
                  onChange={(e) => updateParam('stage5Pay', parseFloat(e.target.value) || 0)}
                  className="w-full text-xs px-3 py-2 bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calculation Overview Cards (Bento Metric Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bento Card 1: Birim Satış Maliyeti */}
        <div className="bg-[#121214] border border-amber-500/20 rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-semibold text-amber-400 uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              Birim Satış Maliyeti
            </span>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight font-mono">
            {results.grossCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}{' '}
            <span className="text-xs font-normal text-zinc-400">TL / m²</span>
          </p>
          <p className="text-xs font-semibold text-amber-400/90 mt-1 font-mono">
            ${results.grossUsdPerSqM.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD / m²
          </p>
        </div>

        {/* Bento Card 2: Net İnşaat Maliyeti */}
        <div className="bg-[#121214] border border-blue-500/20 rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-semibold text-blue-400 uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
              Net İnşaat Maliyeti
            </span>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight font-mono">
            {results.netCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}{' '}
            <span className="text-xs font-normal text-zinc-400">TL / m²</span>
          </p>
          <p className="text-xs font-semibold text-blue-400/90 mt-1 font-mono">
            ${results.netUsdPerSqM.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD / m²
          </p>
        </div>

        {/* Bento Card 3: Genel Proje Hedef Bedeli */}
        <div className="bg-[#121214] border border-emerald-500/20 rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-semibold text-emerald-400 uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              Genel Proje Hedef Bedeli
            </span>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight font-mono">
            {results.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}{' '}
            <span className="text-xs font-normal text-zinc-400">TL</span>
          </p>
          <p className="text-xs font-semibold text-emerald-400/90 mt-1 font-mono">
            Kâr: {results.profitAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL (%{params.profitRate})
          </p>
        </div>

        {/* Bento Card 4: Tahmini Teslim Süresi */}
        <div className="bg-[#121214] border border-indigo-500/20 rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-semibold text-indigo-400 uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              Tahmini Teslim Süresi
            </span>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight font-mono">
            {params.durationOption === 'hide' ? 'Gizlendi' : `${results.finalMonths} Ay`}
          </p>
          <p className="text-xs text-zinc-400 mt-1 truncate">
            {params.durationOption === 'auto'
              ? `Ruhsat: 3 Ay | Kaba: ${(results.kabaDaysTotal / 30).toFixed(1)} Ay | İnce: ${(results.inceDaysTotal / 30).toFixed(1)} Ay`
              : 'Sözleşme hedef takvimi'}
          </p>
        </div>
      </div>
    </div>
  );
};
