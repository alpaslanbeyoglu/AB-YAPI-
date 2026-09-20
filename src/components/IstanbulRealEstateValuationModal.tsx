import React, { useState, useMemo } from 'react';
import { ProjectParams, FlatItem, AppTheme } from '../types';
import {
  ISTANBUL_DISTRICTS,
  STREET_TIER_OPTIONS,
  StreetTier,
  calculateAiValuation,
} from '../utils/istanbulRealEstateData';
import {
  Building2,
  MapPin,
  Sparkles,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  X,
  HelpCircle,
  Home,
  ShoppingBag,
  Sliders,
  RefreshCw,
  Calculator,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  Check,
  Scale
} from 'lucide-react';

interface IstanbulRealEstateValuationModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: ProjectParams;
  flats: FlatItem[];
  onUpdateFlats: (updatedFlats: FlatItem[]) => void;
  onUpdateParams?: (updatedParams: Partial<ProjectParams>) => void;
  totalConstructionCost?: number; // Toplam Proje Maliyeti (Kâr/Hasılat hesabı için)
  theme?: AppTheme;
}

export const IstanbulRealEstateValuationModal: React.FC<IstanbulRealEstateValuationModalProps> = ({
  isOpen,
  onClose,
  params,
  flats,
  onUpdateFlats,
  onUpdateParams,
  totalConstructionCost = 0,
  theme = 'light',
}) => {
  if (!isOpen) return null;

  const isGray = theme === 'gray';

  // Selected District & Street Tier State
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(
    params.valuationDistrict || 'kadikoy'
  );
  const [selectedStreetTier, setSelectedStreetTier] = useState<StreetTier>(
    params.valuationStreetTier || 'standard_street'
  );

  // Search / Filter Filter state inside modal
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'contractor' | 'owner'>('all');

  // Local state for unit custom valuations during editing
  const [localFlats, setLocalFlats] = useState<FlatItem[]>(() => {
    return flats.map((f) => {
      const calc = calculateAiValuation(
        params.valuationDistrict || 'kadikoy',
        params.valuationStreetTier || 'standard_street',
        f.floorNumber,
        f.flatType,
        f.facade,
        f.area,
        f.serefiyeMultiplier
      );
      return {
        ...f,
        marketUnitPrice: f.marketUnitPrice || calc.suggestedUnitPrice,
        customMarketPrice:
          f.customMarketPrice !== undefined
            ? f.customMarketPrice
            : f.salePrice !== undefined
            ? f.salePrice
            : calc.suggestedTotalPrice,
      };
    });
  });

  const activeDistrict = useMemo(
    () => ISTANBUL_DISTRICTS.find((d) => d.id === selectedDistrictId) || ISTANBUL_DISTRICTS[0],
    [selectedDistrictId]
  );

  // Recalculate AI suggestions dynamically as District or Street Tier changes
  const evaluatedFlats = useMemo(() => {
    return localFlats.map((f) => {
      const calc = calculateAiValuation(
        selectedDistrictId,
        selectedStreetTier,
        f.floorNumber,
        f.flatType,
        f.facade,
        f.area,
        f.serefiyeMultiplier
      );

      const aiSuggestedTotalPrice = calc.suggestedTotalPrice;
      const effectivePrice =
        f.customMarketPrice !== undefined && f.customMarketPrice > 0
          ? f.customMarketPrice
          : aiSuggestedTotalPrice;

      return {
        ...f,
        aiUnitPrice: calc.suggestedUnitPrice,
        aiTotalPrice: aiSuggestedTotalPrice,
        effectivePrice,
        calcDetails: calc,
      };
    });
  }, [localFlats, selectedDistrictId, selectedStreetTier]);

  // Handle District Change
  const handleDistrictChange = (districtId: string) => {
    setSelectedDistrictId(districtId);
    if (onUpdateParams) {
      onUpdateParams({ valuationDistrict: districtId });
    }
  };

  // Handle Street Tier Change
  const handleStreetTierChange = (streetTier: StreetTier) => {
    setSelectedStreetTier(streetTier);
    if (onUpdateParams) {
      onUpdateParams({ valuationStreetTier: streetTier });
    }
  };

  // Update a single flat's custom price
  const handlePriceChange = (flatId: number, val: number) => {
    setLocalFlats((prev) =>
      prev.map((f) => {
        if (f.id === flatId) {
          const isContractor = f.isContractorShare;
          return {
            ...f,
            customMarketPrice: val,
            salePrice: isContractor ? val : f.salePrice,
          };
        }
        return f;
      })
    );
  };

  // Reset single flat to AI recommendation
  const handleResetToAi = (flatId: number) => {
    setLocalFlats((prev) =>
      prev.map((f) => {
        if (f.id === flatId) {
          const calc = calculateAiValuation(
            selectedDistrictId,
            selectedStreetTier,
            f.floorNumber,
            f.flatType,
            f.facade,
            f.area,
            f.serefiyeMultiplier
          );
          return {
            ...f,
            marketUnitPrice: calc.suggestedUnitPrice,
            customMarketPrice: calc.suggestedTotalPrice,
            salePrice: f.isContractorShare ? calc.suggestedTotalPrice : f.salePrice,
          };
        }
        return f;
      })
    );
  };

  // Batch Apply Buttons
  const applyAiToAll = (target: 'all' | 'contractor' | 'owner') => {
    setLocalFlats((prev) =>
      prev.map((f) => {
        const isContractor = !!f.isContractorShare;
        if (
          target === 'all' ||
          (target === 'contractor' && isContractor) ||
          (target === 'owner' && !isContractor)
        ) {
          const calc = calculateAiValuation(
            selectedDistrictId,
            selectedStreetTier,
            f.floorNumber,
            f.flatType,
            f.facade,
            f.area,
            f.serefiyeMultiplier
          );
          return {
            ...f,
            marketUnitPrice: calc.suggestedUnitPrice,
            customMarketPrice: calc.suggestedTotalPrice,
            salePrice: isContractor ? calc.suggestedTotalPrice : f.salePrice,
          };
        }
        return f;
      })
    );
  };

  // Save changes and close modal
  const handleSaveAndClose = () => {
    const finalFlats = localFlats.map((f) => {
      const calc = calculateAiValuation(
        selectedDistrictId,
        selectedStreetTier,
        f.floorNumber,
        f.flatType,
        f.facade,
        f.area,
        f.serefiyeMultiplier
      );

      const customPrice = f.customMarketPrice !== undefined ? f.customMarketPrice : calc.suggestedTotalPrice;
      return {
        ...f,
        marketUnitPrice: calc.suggestedUnitPrice,
        customMarketPrice: customPrice,
        salePrice: f.isContractorShare ? customPrice : f.salePrice,
      };
    });

    onUpdateFlats(finalFlats);
    if (onUpdateParams) {
      onUpdateParams({
        valuationDistrict: selectedDistrictId,
        valuationStreetTier: selectedStreetTier,
      });
    }
    onClose();
  };

  // Financial Totals Calculation
  const totalProjectMarketValue = evaluatedFlats.reduce((sum, f) => sum + f.effectivePrice, 0);
  const contractorStockMarketValue = evaluatedFlats
    .filter((f) => f.isContractorShare)
    .reduce((sum, f) => sum + f.effectivePrice, 0);
  const ownerAssetsMarketValue = evaluatedFlats
    .filter((f) => !f.isContractorShare)
    .reduce((sum, f) => sum + f.effectivePrice, 0);

  // Profitability vs Total Cost
  const netEstimatedProfit = contractorStockMarketValue - totalConstructionCost;
  const profitMarginPercent =
    totalConstructionCost > 0 ? (netEstimatedProfit / totalConstructionCost) * 100 : 0;

  // Filtered flats list
  const filteredFlats = evaluatedFlats.filter((f) => {
    if (ownershipFilter === 'contractor') return f.isContractorShare;
    if (ownershipFilter === 'owner') return !f.isContractorShare;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto print:hidden">
      <div
        className={`relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          isGray ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-950 border-slate-800 text-white'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-white shadow-lg">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-black tracking-wide text-white">
                  İSTANBUL EMLAK PİYASASI & DEĞERLEME UZMANI
                </h2>
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  2026 Piyasa Rayiç Motoru
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Müteahhit ve Kat Malikleri Daire/Dükkanları İçin İlçe, Konum, Kat ve Cephe Bazlı Piyasa Satış Fiyatlaması
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Top Control Bar: District & Street Selector */}
          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>İstanbul İlçe ve Cadde / Sokak Özelliği Seçimi</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Seçili İlçe: <strong className="text-white">{activeDistrict.name}</strong> ({activeDistrict.side === 'anadolu' ? 'Anadolu Yakası' : 'Avrupa Yakası'})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* District Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  İlçe Seçimi (2026 m² Rayiç Fiyat Tabanı):
                </label>
                <select
                  value={selectedDistrictId}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-xs font-bold rounded-xl p-3 focus:border-amber-500 focus:outline-none cursor-pointer"
                >
                  {ISTANBUL_DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.side === 'anadolu' ? 'Anadolu' : 'Avrupa'}) - Konut: {d.baseResmSqMPrice.toLocaleString('tr-TR')} ₺/m² | Dükkan: {d.baseCommSqMPrice.toLocaleString('tr-TR')} ₺/m²
                    </option>
                  ))}
                </select>
              </div>

              {/* Street Tier Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Cadde / Sokak Tipi (Konum Çarpanı):
                </label>
                <select
                  value={selectedStreetTier}
                  onChange={(e) => handleStreetTierChange(e.target.value as StreetTier)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-xs font-bold rounded-xl p-3 focus:border-amber-500 focus:outline-none cursor-pointer"
                >
                  {STREET_TIER_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Neighborhoods Tags & Benchmark Banner */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  {activeDistrict.name} Öne Çıkan Semt & Mahalleler:
                </span>
                <div className="flex flex-wrap gap-1">
                  {activeDistrict.neighborhoods.map((n, i) => (
                    <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700 font-medium">
                      {n}
                    </span>
                  ))}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-3 font-mono text-xs">
                <div className="p-2 bg-indigo-950/50 border border-indigo-800/50 rounded-lg text-center">
                  <span className="text-[9px] text-indigo-300 block uppercase font-sans">Sıfır Konut Rayiç</span>
                  <span className="font-bold text-indigo-200">{activeDistrict.baseResmSqMPrice.toLocaleString('tr-TR')} ₺/m²</span>
                </div>
                <div className="p-2 bg-purple-950/50 border border-purple-800/50 rounded-lg text-center">
                  <span className="text-[9px] text-purple-300 block uppercase font-sans">Cadde Dükkan Rayiç</span>
                  <span className="font-bold text-purple-200">{activeDistrict.baseCommSqMPrice.toLocaleString('tr-TR')} ₺/m²</span>
                </div>
              </div>
            </div>

            {/* Batch Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-400">
                Toplu Fiyatlama İşlemleri:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => applyAiToAll('all')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tüm Birimlere AI Piyasa Fiyatlarını Uygula</span>
                </button>

                <button
                  onClick={() => applyAiToAll('contractor')}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Sadece Müteahhit Dairelerine Uygula</span>
                </button>

                <button
                  onClick={() => applyAiToAll('owner')}
                  className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Sadece Malik Dairelerine Uygula</span>
                </button>
              </div>
            </div>
          </div>

          {/* Key Financial Totals Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Toplam Gayrimenkul Piyasa Değeri
              </span>
              <div className="text-xl font-black font-mono text-amber-400">
                {totalProjectMarketValue.toLocaleString('tr-TR')} ₺
              </div>
              <p className="text-[10px] text-slate-400">
                Projedeki tüm bağımsız bölümlerin toplam rayiç değeri
              </p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Müteahhit Stok Satış Geliri Beklentisi
              </span>
              <div className="text-xl font-black font-mono text-emerald-400">
                {contractorStockMarketValue.toLocaleString('tr-TR')} ₺
              </div>
              <p className="text-[10px] text-slate-400">
                Müteahhitte kalan {evaluatedFlats.filter((f) => f.isContractorShare).length} adet dairenin satış hasılatı
              </p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Kat Malikleri Varlık Piyasa Değeri
              </span>
              <div className="text-xl font-black font-mono text-indigo-300">
                {ownerAssetsMarketValue.toLocaleString('tr-TR')} ₺
              </div>
              <p className="text-[10px] text-slate-400">
                Hak sahiplerine teslim edilecek {evaluatedFlats.filter((f) => !f.isContractorShare).length} adet daire/dükkan değeri
              </p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Müteahhit Satış Kârı & Marjı
              </span>
              <div className="flex items-baseline gap-2 font-mono">
                <span className={`text-xl font-black ${netEstimatedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {netEstimatedProfit.toLocaleString('tr-TR')} ₺
                </span>
                <span className="text-xs font-bold text-slate-300">
                  (%{profitMarginPercent.toFixed(1)})
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Maliyet: {totalConstructionCost > 0 ? totalConstructionCost.toLocaleString('tr-TR') + ' ₺' : 'Belirtilmedi'}
              </p>
            </div>
          </div>

          {/* Unit Valuation Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-400" />
                <span>Bağımsız Bölüm Fiyatlama ve Değerleme Tablosu ({filteredFlats.length} Birim)</span>
              </h3>

              {/* Ownership Filter */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setOwnershipFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    ownershipFilter === 'all'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tümü ({evaluatedFlats.length})
                </button>
                <button
                  onClick={() => setOwnershipFilter('contractor')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    ownershipFilter === 'contractor'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Müteahhit ({evaluatedFlats.filter((f) => f.isContractorShare).length})
                </button>
                <button
                  onClick={() => setOwnershipFilter('owner')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    ownershipFilter === 'owner'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Hak Sahipleri ({evaluatedFlats.filter((f) => !f.isContractorShare).length})
                </button>
              </div>
            </div>

            <div className="border border-slate-800 rounded-2xl overflow-x-auto bg-slate-900/60">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-[11px] font-extrabold uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Birim No & Adı</th>
                    <th className="p-3">Sahiplik</th>
                    <th className="p-3">Tip / Kat / Cephe</th>
                    <th className="p-3 text-right">Net Alan (m²)</th>
                    <th className="p-3 text-right">AI Birim Rayiç (TL/m²)</th>
                    <th className="p-3 text-right">AI Önerilen Fiyat (TL)</th>
                    <th className="p-3 text-right font-bold text-amber-300">Kendi Belirlediğim Fiyat (TL)</th>
                    <th className="p-3 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredFlats.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                        Seçili filtreye uygun bağımsız bölüm bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredFlats.map((flat) => {
                      const isContractor = !!flat.isContractorShare;
                      const isShop = flat.flatType === 'shop' || flat.flatType === 'basement_shop';
                      const isDuplex = flat.flatType === 'duplex' || flat.flatType === 'mansard';

                      return (
                        <tr key={flat.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-sans font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span>{flat.name}</span>
                              {flat.tc && (
                                <span className="text-[10px] font-mono text-slate-500">({flat.tc})</span>
                              )}
                            </div>
                          </td>

                          <td className="p-3 font-sans">
                            {isContractor ? (
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md text-[10px] font-bold">
                                🏢 Müteahhit
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md text-[10px] font-bold">
                                🏠 Hak Sahibi
                              </span>
                            )}
                          </td>

                          <td className="p-3 font-sans text-slate-300">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-slate-200">
                                {isShop
                                  ? '🏪 Cadde Dükkanı'
                                  : isDuplex
                                  ? '🌇 Çatı Dubleksi'
                                  : '🏠 Konut Dairesi'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Kat: {flat.floorNumber !== undefined ? flat.floorNumber : 1}. Kat | Cephe: {flat.facade || 'Ön'}
                              </span>
                            </div>
                          </td>

                          <td className="p-3 text-right font-bold text-white">
                            {flat.area || 100} m²
                          </td>

                          <td className="p-3 text-right text-indigo-300">
                            {flat.aiUnitPrice.toLocaleString('tr-TR')} ₺
                          </td>

                          <td className="p-3 text-right text-slate-300">
                            {flat.aiTotalPrice.toLocaleString('tr-TR')} ₺
                          </td>

                          {/* Interactive User Price Override */}
                          <td className="p-2 text-right">
                            <div className="relative inline-block w-40">
                              <input
                                type="number"
                                step="50000"
                                value={flat.customMarketPrice || flat.aiTotalPrice}
                                onChange={(e) => handlePriceChange(flat.id, Number(e.target.value))}
                                className="w-full bg-slate-950 border border-amber-500/60 rounded-xl px-2.5 py-1.5 text-right font-mono font-bold text-amber-300 focus:border-amber-400 focus:bg-slate-900 focus:outline-none text-xs"
                              />
                            </div>
                          </td>

                          <td className="p-3 text-center font-sans">
                            <button
                              onClick={() => handleResetToAi(flat.id)}
                              title="AI önerisine sıfırla"
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 mx-auto"
                            >
                              <RefreshCw className="w-3 h-3 text-amber-400" />
                              <span>Önerileni Al</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-5 border-t border-slate-800 bg-slate-900/90 shrink-0">
          <div className="text-xs text-slate-400 font-mono">
            Toplam Değerlenen: <strong className="text-amber-400">{evaluatedFlats.length} Bağımsız Bölüm</strong>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              İptal
            </button>

            <button
              onClick={handleSaveAndClose}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Değerleme Fiyatlarını Kaydet ve Hesaplamaya Aktar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
