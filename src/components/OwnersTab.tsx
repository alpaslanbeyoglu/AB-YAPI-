import React, { useState, useMemo } from 'react';
import {
  Users,
  Percent,
  Coins,
  ShieldCheck,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Sliders,
  DollarSign,
  Briefcase,
  FileText,
  UserCheck,
  Building,
  CheckCircle2,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  Clock,
  Search,
  Filter,
  LayoutGrid,
  Table as TableIcon,
  Download,
  ArrowUpDown,
  Check,
  X,
  Plus,
  RefreshCw,
  Printer,
  Scale,
  Compass,
  Award,
  TrendingUp,
} from 'lucide-react';
import { ProjectParams, CalculationResult, FlatItem, AppTheme, FlatCalcResult } from '../types';
import { OfficialOwnerReportModal } from './OfficialOwnerReportModal';

interface OwnersTabProps {
  params: ProjectParams;
  results: CalculationResult;
  theme?: AppTheme;
  onChangeParams: (newParams: ProjectParams) => void;
  onCalculate?: () => void;
}

type FilterType = 'all' | 'owners' | 'contractor' | 'withDebt' | 'paid' | 'withCredit' | 'shops';
type SortType = 'id_asc' | 'id_desc' | 'name_asc' | 'area_desc' | 'area_asc' | 'debt_desc' | 'debt_asc';
type ViewMode = 'grid' | 'table';

export const OwnersTab: React.FC<OwnersTabProps> = ({
  params,
  results,
  theme = 'light',
  onChangeParams,
  onCalculate,
}) => {
  const isGray = theme === 'gray';
  const cardBg = isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200';
  const innerCardBg = isGray ? 'bg-white border-slate-300' : 'bg-slate-50/80 border-slate-200/80';
  const labelColor = 'text-slate-700 font-semibold';
  const inputBg = isGray
    ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500'
    : 'bg-white text-slate-900 border-slate-200 focus:border-indigo-500';

  // Local state for bulk down payment and selected flat detail
  const [bulkDownPayment, setBulkDownPayment] = useState<number>(0);
  const [selectedFlatId, setSelectedFlatId] = useState<number | null>(null);

  // Official Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportModalFlatId, setReportModalFlatId] = useState<number | null>(null);

  const handleOpenReport = (flatId?: number) => {
    setReportModalFlatId(flatId || selectedFlatId || params.flats[0]?.id || 1);
    setIsReportModalOpen(true);
  };

  // Search, Filter, Sort and View Mode States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('id_asc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // States to toggle sections
  const [isPolicyOpen, setIsPolicyOpen] = useState(true);
  const [isStagesOpen, setIsStagesOpen] = useState(false);
  const [isSerefiyeOpen, setIsSerefiyeOpen] = useState(true);
  const [isOwnersGridOpen, setIsOwnersGridOpen] = useState(true);

  const updateParam = <K extends keyof ProjectParams>(key: K, value: ProjectParams[K]) => {
    onChangeParams({
      ...params,
      [key]: value,
    });
  };

  const handleFlatChange = (idx: number, field: keyof FlatItem, val: any) => {
    const updatedFlats = params.flats.map((flat, i) => {
      if (i === idx) {
        return { ...flat, [field]: val };
      }
      return flat;
    });
    onChangeParams({
      ...params,
      flats: updatedFlats,
    });
  };

  // Auto-Presets for Serefiye
  const handleApplyAutoSerefiye = (preset: 'standard' | 'luxury' | 'reset') => {
    const floorCount = Math.max(1, params.floorCount || 1);
    const flatsPerFloor = Math.max(1, params.flatsPerFloor || 2);

    const updatedFlats = params.flats.map((flat, idx) => {
      if (preset === 'reset') {
        return { ...flat, serefiyeMultiplier: 1.0 };
      }

      const floor = flat.floorNumber !== undefined ? flat.floorNumber : Math.floor(idx / flatsPerFloor);
      let mult = 1.0;

      if (preset === 'standard') {
        if (flat.flatType === 'duplex') mult = 1.18;
        else if (flat.flatType === 'mansard') mult = 1.08;
        else if (floor === 0) mult = 0.92; // Zemin
        else if (floor === 1) mult = 0.98; // 1. Kat
        else if (floor >= floorCount - 1) mult = 1.10; // En Üst Kat
        else mult = 1.02; // Ara Katlar

        // Cephe Yön Bonusu
        if (flat.facade === 'guney' || flat.facade === 'guney_bati' || flat.facade === 'guney_dogu' || flat.facade === 'on') {
          mult += 0.03;
        } else if (flat.facade === 'kuzey' || flat.facade === 'arka') {
          mult -= 0.03;
        }
      } else if (preset === 'luxury') {
        if (flat.flatType === 'duplex') mult = 1.25;
        else if (flat.flatType === 'mansard') mult = 1.12;
        else if (floor === 0) mult = 0.88;
        else if (floor === 1) mult = 0.95;
        else if (floor >= floorCount - 1) mult = 1.18;
        else mult = 1.05;

        if (flat.facade === 'guney' || flat.facade === 'guney_bati' || flat.facade === 'on') {
          mult += 0.04;
        }
      }

      return {
        ...flat,
        floorNumber: floor,
        serefiyeMultiplier: parseFloat(mult.toFixed(2)),
      };
    });

    onChangeParams({
      ...params,
      enableSerefiye: preset !== 'reset',
      flats: updatedFlats,
    });
    if (onCalculate) onCalculate();
  };

  // Auto-Presets for Land Shares (Arsa Payı KMK)
  const handleApplyAutoLandShare = (mode: 'proportional' | 'equal') => {
    const denominator = params.totalLandShareDenominator || 1000;
    const totalFlatsArea = params.flats.reduce((sum, f) => sum + (f.area || 0), 0) || 1;
    const flatCount = Math.max(1, params.flats.length);

    const updatedFlats = params.flats.map((flat) => {
      let numerator = 0;
      if (mode === 'proportional') {
        numerator = Math.round(((flat.area || 0) / totalFlatsArea) * denominator);
      } else {
        numerator = Math.round(denominator / flatCount);
      }
      return {
        ...flat,
        landShareNumerator: numerator,
        landShareDenominator: denominator,
      };
    });

    onChangeParams({
      ...params,
      enableLandShareBalancing: true,
      flats: updatedFlats,
    });
    if (onCalculate) onCalculate();
  };

  const handleApplyBulkDownPayment = () => {
    const updatedFlats = params.flats.map((flat) => {
      // Don't apply to contractor shares
      const isContractor = params.contractorFlatIds?.includes(flat.id) || flat.isContractorShare;
      return {
        ...flat,
        downPayment: isContractor ? 0 : Math.max(0, bulkDownPayment),
      };
    });
    onChangeParams({
      ...params,
      flats: updatedFlats,
    });
    if (onCalculate) onCalculate();
  };

  const stageTotal =
    (params.stage1Pay || 0) +
    (params.stage2Pay || 0) +
    (params.stage3Pay || 0) +
    (params.stage4Pay || 0) +
    (params.stage5Pay || 0);
  const isStageValid = Math.abs(stageTotal - 100) < 0.1;

  // Global Owners calculation summaries
  const totalArea = results.totalArea || 0;
  const ownerFlats = results.flatResults?.filter((f) => !f.isContractorShare) || [];
  const contractorFlats = results.flatResults?.filter((f) => f.isContractorShare) || [];

  const totalDownPayments = ownerFlats.reduce((sum, f) => sum + (f.downPayment || 0), 0);
  const totalStateSupport = ownerFlats.reduce((sum, f) => sum + (f.usedCredit || 0), 0);
  const totalOwnerDebt = ownerFlats.reduce((sum, f) => sum + (f.grossPay || 0), 0);
  const totalRemainingDebt = ownerFlats.reduce((sum, f) => sum + (f.netRemainingDebt || 0), 0);

  // Merged flats with calculation results and filter/sort logic
  const mergedFlats = useMemo(() => {
    return params.flats.map((flat, idx) => {
      const isContractor = !!(params.contractorFlatIds?.includes(flat.id) || flat.isContractorShare);
      const calc = results.flatResults?.find((f) => f.id === flat.id);
      return {
        flat,
        originalIndex: idx,
        calc,
        isContractor,
      };
    });
  }, [params.flats, params.contractorFlatIds, results.flatResults]);

  // Filtered & Sorted Flats
  const filteredFlats = useMemo(() => {
    let list = [...mergedFlats];

    // 1. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const flatNo = `daire ${item.flat.id}`.toLowerCase();
        const idStr = `${item.flat.id}`;
        const name = (item.flat.name || '').toLowerCase();
        const tc = (item.flat.tc || '').toLowerCase();
        return flatNo.includes(q) || idStr.includes(q) || name.includes(q) || tc.includes(q);
      });
    }

    // 2. Category filter
    if (activeFilter === 'owners') {
      list = list.filter((item) => !item.isContractor);
    } else if (activeFilter === 'contractor') {
      list = list.filter((item) => item.isContractor);
    } else if (activeFilter === 'shops') {
      list = list.filter((item) => item.flat.flatType === 'shop');
    } else if (activeFilter === 'withDebt') {
      list = list.filter((item) => !item.isContractor && (item.calc?.netRemainingDebt || 0) > 0);
    } else if (activeFilter === 'paid') {
      list = list.filter((item) => !item.isContractor && (item.calc?.netRemainingDebt || 0) <= 0);
    } else if (activeFilter === 'withCredit') {
      list = list.filter((item) => !item.isContractor && !!item.flat.useTransformationCredit);
    }

    // 3. Sorting
    list.sort((a, b) => {
      switch (sortBy) {
        case 'id_asc':
          return a.flat.id - b.flat.id;
        case 'id_desc':
          return b.flat.id - a.flat.id;
        case 'name_asc':
          return (a.flat.name || '').localeCompare(b.flat.name || '', 'tr');
        case 'area_desc':
          return b.flat.area - a.flat.area;
        case 'area_asc':
          return a.flat.area - b.flat.area;
        case 'debt_desc':
          return (b.calc?.netRemainingDebt || 0) - (a.calc?.netRemainingDebt || 0);
        case 'debt_asc':
          return (a.calc?.netRemainingDebt || 0) - (b.calc?.netRemainingDebt || 0);
        default:
          return a.flat.id - b.flat.id;
      }
    });

    return list;
  }, [mergedFlats, searchQuery, activeFilter, sortBy]);

  // Dynamic metrics for filtered items
  const filteredMetrics = useMemo(() => {
    const count = filteredFlats.length;
    const totalFlatsCount = params.flats.length;
    const totalAreaFiltered = filteredFlats.reduce((sum, item) => sum + (item.flat.area || 0), 0);
    const totalDownPaymentFiltered = filteredFlats
      .filter((i) => !i.isContractor)
      .reduce((sum, item) => sum + (item.flat.downPayment || 0), 0);
    const totalDebtFiltered = filteredFlats
      .filter((i) => !i.isContractor)
      .reduce((sum, item) => sum + (item.calc?.netRemainingDebt || 0), 0);
    const totalSupportFiltered = filteredFlats
      .filter((i) => !i.isContractor)
      .reduce((sum, item) => sum + (item.calc?.usedCredit || 0), 0);

    return {
      count,
      totalFlatsCount,
      totalArea: totalAreaFiltered,
      totalDownPayment: totalDownPaymentFiltered,
      totalDebt: totalDebtFiltered,
      totalSupport: totalSupportFiltered,
    };
  }, [filteredFlats, params.flats.length]);

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = [
      'Daire No',
      'Mülkiyet Durumu',
      'Kat No',
      'Cephe',
      'Daire Tipi',
      'Hak Sahibi Adı Soyadı',
      'TC Kimlik No',
      'Brüt Alan (m²)',
      'Şerefiye Çarpanı',
      'Arsa Payı (Hisse/Payda)',
      'Şerefiyeli İnşaat Katkı Payı (TL)',
      'Arsa Payı Mahsuplaşma Farkı (TL)',
      'Ödenen Peşinat (TL)',
      'Kentsel Dönüşüm Hibesi (TL)',
      'Kalan Net Borç (TL)',
      'Aylık Taksit / Aşama Tutarı (TL)',
    ];

    const rows = (results.flatResults || []).map((f) => {
      const isContractor = !!f.isContractorShare;
      const flatType = f.flatType === 'duplex' ? 'Çatı Dubleksi' : f.flatType === 'mansard' ? 'Mansart' : f.flatType === 'shop' ? 'Dükkan' : 'Standart';
      const facadeLabel = f.facade === 'guney' ? 'Güney' : f.facade === 'kuzey' ? 'Kuzey' : f.facade === 'dogu' ? 'Doğu' : f.facade === 'bati' ? 'Batı' : f.facade === 'on' ? 'Ön Cephe' : f.facade === 'arka' ? 'Arka Cephe' : 'Standart';
      return [
        `"Daire ${f.id}"`,
        isContractor ? '"Müteahhit Payı"' : '"Hak Sahibi"',
        `"${f.floorNumber !== undefined ? (f.floorNumber === 0 ? 'Zemin' : `${f.floorNumber}. Kat`) : '-'}"`,
        `"${facadeLabel}"`,
        `"${flatType}"`,
        `"${(f.name || '').replace(/"/g, '""')}"`,
        `"${f.tc || '-'}"`,
        f.area,
        f.serefiyeMultiplier || 1.0,
        `"${f.landShareNumerator || 0}/${f.landShareDenominator || params.totalLandShareDenominator || 1000}"`,
        f.grossPay,
        f.landShareDifference || 0,
        f.downPayment,
        f.usedCredit,
        f.netRemainingDebt,
        f.monthlyInstallment || 0,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Kat_Malikleri_Hakedis_Tablosu_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedFlatResult = results.flatResults?.find((f) => f.id === selectedFlatId);

  return (
    <div className="space-y-6 animate-fade-in print:p-0">
      {/* 1. ÜST BAŞLIK & ÖZET METRAJ / PEŞİNAT KARTLARI */}
      <div className={`p-6 rounded-3xl border ${cardBg} shadow-sm space-y-6`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                👥 Kat Malikleri, Ödeme Planları & Pay Oranları Yönetimi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kat maliklerinin alan paylaşımlarını, peşinatlarını, devlet hibelerini, müteahhit kâr paylarını ve 5 aşamalı taksit ödemelerini tek sayfadan yönetin.
              </p>
            </div>
          </div>
          {onCalculate && (
            <button
              type="button"
              onClick={onCalculate}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>HESAPLARI YENİLE VE SAKLA</span>
            </button>
          )}
        </div>

        {/* Özet Peşinat, Metraj ve Destek Kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-2xl border ${innerCardBg} space-y-1`}>
            <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Toplanan Peşinat</span>
            <span className="block text-xl font-extrabold font-mono text-indigo-700">
              {totalDownPayments.toLocaleString('tr-TR')} <span className="text-xs">TL</span>
            </span>
            <span className="block text-[10px] text-slate-500">
              {ownerFlats.length} Hak Sahibi Dairesinden
            </span>
          </div>

          <div className={`p-4 rounded-2xl border ${innerCardBg} space-y-1`}>
            <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Toplam Kalan Taksit</span>
            <span className="block text-xl font-extrabold font-mono text-amber-700">
              {totalRemainingDebt.toLocaleString('tr-TR')} <span className="text-xs">TL</span>
            </span>
            <span className="block text-[10px] text-slate-500">
              Hak sahiplerinin ödeyeceği 5 aşamalı bakiye
            </span>
          </div>

          <div className={`p-4 rounded-2xl border ${innerCardBg} space-y-1`}>
            <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Kentsel Dönüşüm Hibe/Destek</span>
            <span className="block text-xl font-extrabold font-mono text-emerald-700">
              {totalStateSupport.toLocaleString('tr-TR')} <span className="text-xs">TL</span>
            </span>
            <span className="block text-[10px] text-slate-500">
              Devlet tarafından karşılanan toplam kredi/yardım
            </span>
          </div>

          <div className={`p-4 rounded-2xl border ${innerCardBg} space-y-1`}>
            <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Paylaşım Dağılımı</span>
            <span className="block text-base font-extrabold text-slate-800">
              {ownerFlats.length} Malik (%{(100 - params.contractorShareRate).toFixed(0)})
            </span>
            <span className="block text-xs font-semibold text-indigo-600">
              {contractorFlats.length} Müteahhit (%{params.contractorShareRate.toFixed(0)})
            </span>
          </div>
        </div>
      </div>

      {/* 2. PAY ORANLARI VE MALİK ÖDEME POLİTİKASI */}
      <div className={`rounded-3xl border ${cardBg} shadow-sm overflow-hidden`}>
        <button
          type="button"
          onClick={() => setIsPolicyOpen(!isPolicyOpen)}
          className="w-full px-6 py-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors border-b border-slate-200/60"
        >
          <div className="flex items-center gap-2.5">
            <Percent className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              1. Malik Ödeme Politikası & Müteahhit Pay Oranları
            </span>
          </div>
          <span>{isPolicyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
        </button>

        {isPolicyOpen && (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            <div>
              <label className={`block text-xs ${labelColor} mb-1.5`}>Proje Yapım Modeli:</label>
              <select
                value={params.projectModel}
                onChange={(e) => updateParam('projectModel', e.target.value as any)}
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border ${inputBg}`}
              >
                <option value="contractorShare">Kat Karşılığı (Müteahhit Paylaşımı var)</option>
                <option value="cash">Nakit Paylaşımlı (Tüm maliyet maliklere dağıtılır)</option>
              </select>
            </div>

            {params.projectModel === 'contractorShare' && (
              <div>
                <label className={`block text-xs ${labelColor} mb-1.5`}>Müteahhit Pay Oranı (%):</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={params.contractorShareRate}
                  onChange={(e) => updateParam('contractorShareRate', parseFloat(e.target.value) || 0)}
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border font-mono font-bold ${inputBg}`}
                />
              </div>
            )}

            <div>
              <label className={`block text-xs ${labelColor} mb-1.5`}>Maliklere Müteahhit Kârı Yansıtılsın mı?:</label>
              <select
                value={params.includeProfitOwner}
                onChange={(e) => updateParam('includeProfitOwner', e.target.value as any)}
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border ${inputBg}`}
              >
                <option value="yes">Evet (Maliyet + Kâr Payı %{params.profitRate} Yansıtılsın)</option>
                <option value="no">Hayır (Yalnızca Net İnşaat Maliyeti Üzerinden)</option>
              </select>
            </div>

            <div>
              <label className={`block text-xs ${labelColor} mb-1.5`}>Müteahhit Kâr Oranı (%):</label>
              <input
                type="number"
                value={params.profitRate}
                onChange={(e) => updateParam('profitRate', parseFloat(e.target.value) || 0)}
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border font-mono font-bold ${inputBg}`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs ${labelColor} mb-1.5`}>Daire Birim m² Maliyeti (TL):</label>
                <input
                  type="number"
                  value={params.manualFlatUnitPrice || ''}
                  onChange={(e) => updateParam('manualFlatUnitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="Otomatik (Boş Bırakılabilir)"
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border font-mono font-bold text-indigo-700 dark:text-indigo-400 ${inputBg}`}
                />
              </div>
              <div>
                <label className={`block text-xs ${labelColor} mb-1.5`}>Dükkan Birim m² Maliyeti (TL):</label>
                <input
                  type="number"
                  value={params.manualShopUnitPrice || ''}
                  onChange={(e) => updateParam('manualShopUnitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="Otomatik (Boş Bırakılabilir)"
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border font-mono font-bold text-amber-700 dark:text-amber-400 ${inputBg}`}
                  disabled={!params.hasGroundFloorShop}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs ${labelColor} mb-1.5`}>USD Dolar Kuru (₺):</label>
              <input
                type="number"
                step="0.1"
                value={params.usdRate || 36.5}
                onChange={(e) => updateParam('usdRate', parseFloat(e.target.value) || 1)}
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border font-mono font-bold ${inputBg}`}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. ÖDEME PLANLARI VE HAKEDİŞ ORANLARI / TAKSİTLİ ÖDEME SEÇENEĞİ */}
      <div className={`rounded-3xl border ${cardBg} shadow-sm overflow-hidden`}>
        <button
          type="button"
          onClick={() => setIsStagesOpen(!isStagesOpen)}
          className="w-full px-6 py-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors border-b border-slate-200/60"
        >
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              2. Ödeme Planı Şablonu (Fiziki Hakediş / Aylık Taksitli Ödeme Seçenekleri)
            </span>
          </div>
          <span>{isStagesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
        </button>

        {isStagesOpen && (
          <div className="p-6 space-y-6">
            {/* Ödeme Modeli Seçici (Aşamalı vs Taksitli vs Hibrit) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Ödeme ve Hakediş Tahsilat Modeli:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => updateParam('paymentPlanType', 'stages')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    (params.paymentPlanType || 'stages') === 'stages'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      5 Kademeli Fiziki Hakediş
                    </span>
                    {(params.paymentPlanType || 'stages') === 'stages' && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Sözleşme, temel, kaba, ince ve iskân fiziki inşaat ilerleme yüzdelerine göre 5 kademeli tahsilat.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => updateParam('paymentPlanType', 'installments')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    params.paymentPlanType === 'installments'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      Aylık Eşit Taksitli Ödeme
                    </span>
                    {params.paymentPlanType === 'installments' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Kalan borcun {params.installmentCount || 12} aya bölünerek eşit vadelerle tahsil edilmesi.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => updateParam('paymentPlanType', 'hybrid')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    params.paymentPlanType === 'hybrid'
                      ? 'bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-500/20 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      Karma (Ara Ödemeli + Taksit)
                    </span>
                    {params.paymentPlanType === 'hybrid' && (
                      <span className="w-2 h-2 rounded-full bg-purple-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Peşinat + Kaba/İskân Ara Ödemesi + Kalan tutarın aylık eşit taksitlere yayılması.
                  </p>
                </button>
              </div>
            </div>

            {/* SEÇENEK 1: 5 KADEMELİ FİZİKİ HAKEDİŞ AYARLARI */}
            {(params.paymentPlanType || 'stages') === 'stages' && (
              <div className="space-y-6 animate-fade-in">
                {/* Live Percentage Validation Bar */}
                <div
                  className={`p-4 rounded-2xl text-xs flex items-center justify-between font-semibold border ${
                    isStageValid
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : 'bg-rose-50 text-rose-900 border-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isStageValid ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'}`} />
                    <span>
                      {isStageValid
                        ? '✔ Ödeme aşaması dağılımı mükemmel dengelendi (%100)'
                        : `⚠️ Hatalı Dağılım! Toplam yüzde %100 olmalıdır. (Şu an: %${stageTotal.toFixed(1)})`}
                    </span>
                  </div>
                  <span className="font-mono bg-white/60 px-3 py-1 rounded-lg border border-slate-200/40">
                    {params.stage1Pay} + {params.stage2Pay} + {params.stage3Pay} + {params.stage4Pay} + {params.stage5Pay} = %{stageTotal.toFixed(1)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      1. Aşama % (Sözleşme / Peşinat):
                    </label>
                    <input
                      type="number"
                      value={params.stage1Pay}
                      onChange={(e) => updateParam('stage1Pay', parseFloat(e.target.value) || 0)}
                      className={`w-full text-xs px-3.5 py-2.5 rounded-xl border font-mono ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      2. Aşama % (Subasman / Temel):
                    </label>
                    <input
                      type="number"
                      value={params.stage2Pay}
                      onChange={(e) => updateParam('stage2Pay', parseFloat(e.target.value) || 0)}
                      className={`w-full text-xs px-3.5 py-2.5 rounded-xl border font-mono ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      3. Aşama % (Kaba İnşaat Bitimi):
                    </label>
                    <input
                      type="number"
                      value={params.stage3Pay}
                      onChange={(e) => updateParam('stage3Pay', parseFloat(e.target.value) || 0)}
                      className={`w-full text-xs px-3.5 py-2.5 rounded-xl border font-mono ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      4. Aşama % (İnce İnşaat & Tesisat):
                    </label>
                    <input
                      type="number"
                      value={params.stage4Pay}
                      onChange={(e) => updateParam('stage4Pay', parseFloat(e.target.value) || 0)}
                      className={`w-full text-xs px-3.5 py-2.5 rounded-xl border font-mono ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      5. Aşama % (İskân & Teslim):
                    </label>
                    <input
                      type="number"
                      value={params.stage5Pay}
                      onChange={(e) => updateParam('stage5Pay', parseFloat(e.target.value) || 0)}
                      className={`w-full text-xs px-3.5 py-2.5 rounded-xl border font-mono ${inputBg}`}
                    />
                  </div>
                </div>

                {/* Cash Flow Projections Table */}
                <div className="overflow-x-auto border border-slate-200/60 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                        <th className="p-3">İnşaat Ödeme Aşaması</th>
                        <th className="p-3 text-right">Oran</th>
                        <th className="p-3 text-right text-indigo-700">Malik Geliri</th>
                        <th className="p-3 text-right text-rose-700">Tahmini Gider</th>
                        <th className="p-3 text-right">Dönem Dengesi</th>
                        <th className="p-3 text-right">Kümülatif Kasa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {results.cashFlowRows?.map((row) => (
                        <tr key={row.stageNumber} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-800">{row.name}</td>
                          <td className="p-3 text-right font-mono text-slate-600">
                            %{row.stageNumber === 1 ? params.stage1Pay : row.stageNumber === 2 ? params.stage2Pay : row.stageNumber === 3 ? params.stage3Pay : row.stageNumber === 4 ? params.stage4Pay : params.stage5Pay}
                          </td>
                          <td className="p-3 text-right font-mono text-indigo-700">
                            {row.income.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                          </td>
                          <td className="p-3 text-right font-mono text-rose-700">
                            {row.expense.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                          </td>
                          <td className={`p-3 text-right font-mono ${row.periodBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {row.periodBalance >= 0 ? '+' : ''}{row.periodBalance.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                          </td>
                          <td className={`p-3 text-right font-mono font-bold ${row.cumulativeBalance >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                            {row.cumulativeBalance.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SEÇENEK 2: AYLIK EŞİT TAKSİTLİ ÖDEME AYARLARI */}
            {params.paymentPlanType === 'installments' && (
              <div className="space-y-6 animate-fade-in">
                {/* Vade & Taksit Sayısı Seçim Çubuğu */}
                <div className={`p-5 rounded-2xl border ${innerCardBg} space-y-4`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        Taksit Vadesi & Süresi Seçimi
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Kat maliklerinin net kalan borçları seçilen vade boyunca eşit aylık taksitlere bölünür.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Özel Vade (Ay):</span>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={params.installmentCount || 12}
                        onChange={(e) => updateParam('installmentCount', Math.max(1, parseInt(e.target.value) || 1))}
                        className={`w-20 text-xs px-3 py-1.5 rounded-xl border font-mono font-bold text-center ${inputBg}`}
                      />
                    </div>
                  </div>

                  {/* Hızlı Vade Butonları */}
                  <div className="flex flex-wrap gap-2">
                    {[6, 12, 18, 24, 36, 48].map((months) => (
                      <button
                        key={months}
                        type="button"
                        onClick={() => updateParam('installmentCount', months)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          (params.installmentCount || 12) === months
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {months} Ay Taksit
                      </button>
                    ))}
                    {results.finalMonths && (
                      <button
                        type="button"
                        onClick={() => updateParam('installmentCount', results.finalMonths)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          (params.installmentCount || 12) === results.finalMonths
                            ? 'bg-emerald-700 text-white shadow-sm'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                        }`}
                      >
                        Proje Süresi Boyunca ({results.finalMonths} Ay)
                      </button>
                    )}
                  </div>
                </div>

                {/* Taksit Finansal Gösterge Kartları */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-2xl border ${innerCardBg} space-y-1`}>
                    <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Toplam Taksitlenecek Borç</span>
                    <span className="block text-lg font-extrabold font-mono text-slate-900">
                      {totalRemainingDebt.toLocaleString('tr-TR')} <span className="text-xs">TL</span>
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      {ownerFlats.length} Hak Sahibi Dairesi
                    </span>
                  </div>

                  <div className={`p-4 rounded-2xl border ${innerCardBg} space-y-1`}>
                    <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Aylık Toplam Şantiye Geliri</span>
                    <span className="block text-lg font-extrabold font-mono text-emerald-700">
                      {(results.totalMonthlyInstallments || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} <span className="text-xs">TL/Ay</span>
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      Her ay kasaya girecek toplam taksit
                    </span>
                  </div>

                  <div className={`p-4 rounded-2xl border ${innerCardBg} space-y-1`}>
                    <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Daire Başı Ortalama Taksit</span>
                    <span className="block text-lg font-extrabold font-mono text-indigo-700">
                      {(ownerFlats.length > 0 && results.totalMonthlyInstallments
                        ? results.totalMonthlyInstallments / ownerFlats.length
                        : 0
                      ).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}{' '}
                      <span className="text-xs">TL/Ay</span>
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      Ortalama 1 bağımsız bölüm yükü
                    </span>
                  </div>

                  <div className={`p-4 rounded-2xl border ${innerCardBg} space-y-1`}>
                    <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Vade & Taksit Süresi</span>
                    <span className="block text-lg font-extrabold font-mono text-purple-700">
                      {params.installmentCount || 12} <span className="text-xs">Ay Vadeli</span>
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      Her ayın 1-5'i arası tahsilat
                    </span>
                  </div>
                </div>

                {/* Daire Bazlı Aylık Taksit Tablosu */}
                <div className="overflow-x-auto border border-slate-200/60 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                        <th className="p-3">Daire No / Hak Sahibi</th>
                        <th className="p-3 text-right">Daire Payı Bedeli</th>
                        <th className="p-3 text-right text-indigo-700">Peşinat</th>
                        <th className="p-3 text-right text-emerald-700">Dönüşüm Desteği</th>
                        <th className="p-3 text-right">Net Kalan Borç</th>
                        <th className="p-3 text-center">Vade</th>
                        <th className="p-3 text-right text-emerald-800 font-bold bg-emerald-50/50">Aylık Taksit Tutarı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {results.flatResults.map((flat) => (
                        <tr
                          key={flat.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            flat.isContractorShare ? 'bg-amber-50/20 text-slate-500' : ''
                          }`}
                        >
                          <td className="p-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span>Daire {flat.id} ({flat.name})</span>
                              {flat.flatType === 'shop' && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md border border-amber-200">
                                  DÜKKAN
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-700">
                            {flat.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                          </td>
                          <td className="p-3 text-right font-mono text-indigo-700">
                            {flat.downPayment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-700 font-semibold">
                            {flat.usedCredit > 0 ? `${flat.usedCredit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL` : '-'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {flat.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                          </td>
                          <td className="p-3 text-center font-mono text-slate-600">
                            {flat.netRemainingDebt > 0 ? `${params.installmentCount || 12} Ay` : '-'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-800 bg-emerald-50/50">
                            {flat.netRemainingDebt > 0
                              ? `${flat.monthlyInstallment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL / Ay`
                              : '0 TL'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SEÇENEK 3: KARMA / HİBRİT PLAN (PEŞİNAT + ARA ÖDEMELER + AYLIK TAKSİT) */}
            {params.paymentPlanType === 'hybrid' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 text-xs text-purple-900 leading-relaxed">
                  <h5 className="font-bold text-purple-900 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Karma / Hibrit Ödeme Modeli Açıklaması:
                  </h5>
                  <p>
                    Bu modelde kat malikleri başlangıçta peşinatlarını öder; inşaatın kritik dönemlerinde 2 adet ara ödeme (%25 Kaba İnşaat Bitiminde + %15 İskân Aşamasında) gerçekleştirir. Kalan bakiye ise {params.installmentCount || 12} eşit aylık taksite bölünerek hafifletilmiş vadelerle tahsil edilir.
                  </p>
                </div>

                <div className="overflow-x-auto border border-slate-200/60 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                        <th className="p-3">Daire / Malik</th>
                        <th className="p-3 text-right">Kalan Net Borç</th>
                        <th className="p-3 text-right text-indigo-700">1. Ara Ödeme (%25 Kaba)</th>
                        <th className="p-3 text-right text-purple-700">2. Ara Ödeme (%15 İskân)</th>
                        <th className="p-3 text-right text-slate-700">Taksitlendirilen Bakiye (%60)</th>
                        <th className="p-3 text-right text-emerald-800 font-bold bg-emerald-50/50">
                          Aylık Taksit ({params.installmentCount || 12} Ay)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {results.flatResults.map((flat) => {
                        const interim1 = Math.round(flat.netRemainingDebt * 0.25);
                        const interim2 = Math.round(flat.netRemainingDebt * 0.15);
                        const remainingToInstallments = Math.max(0, flat.netRemainingDebt - interim1 - interim2);
                        const hybridMonthly = Math.round(remainingToInstallments / Math.max(1, params.installmentCount || 12));

                        return (
                          <tr key={flat.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-semibold text-slate-900">
                              <div className="flex items-center gap-2">
                                <span>Daire {flat.id} ({flat.name})</span>
                                {flat.flatType === 'shop' && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md border border-amber-200">
                                    DÜKKAN
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-right font-mono text-slate-900 font-bold">
                              {flat.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                            </td>
                            <td className="p-3 text-right font-mono text-indigo-700">
                              {interim1.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                            </td>
                            <td className="p-3 text-right font-mono text-purple-700">
                              {interim2.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                            </td>
                            <td className="p-3 text-right font-mono text-slate-700 font-semibold">
                              {remainingToInstallments.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-800 bg-emerald-50/50">
                              {flat.netRemainingDebt > 0 ? `${hybridMonthly.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL / Ay` : '0 TL'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. ŞEREFİYE & KAT/CEPHE DEĞERLEME VE ARSA PAYI (KMK) DENGESİ MODÜLÜ */}
      <div className={`rounded-3xl border ${cardBg} shadow-sm overflow-hidden`}>
        <button
          type="button"
          onClick={() => setIsSerefiyeOpen(!isSerefiyeOpen)}
          className="w-full px-6 py-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors border-b border-slate-200/60"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  3. Şerefiye (Kat / Cephe / Manzara) & Arsa Payı (KMK) Değerleme Modülü
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                    params.enableSerefiye
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  Şerefiye: {params.enableSerefiye ? 'AKTİF' : 'KAPALI'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                    params.enableLandShareBalancing
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  Arsa Payı: {params.enableLandShareBalancing ? 'DENGELENİYOR' : 'KAPALI'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Kat farkı, güney/kuzey cephe çarpanları ve tapudaki arsa payı (hisse/payda) mahsuplaşmalarını yönetin.
              </p>
            </div>
          </div>
          <span>{isSerefiyeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
        </button>

        {isSerefiyeOpen && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* A) Şerefiye Değerleme Çarpanı Kontrolü */}
              <div className={`p-5 rounded-2xl border ${innerCardBg} space-y-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-bold uppercase text-slate-800">
                      A) Şerefiye (Kat, Cephe & Konum) Dağıtımı
                    </h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!params.enableSerefiye}
                      onChange={(e) => {
                        updateParam('enableSerefiye', e.target.checked);
                        if (onCalculate) onCalculate();
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Şerefiye çarpanı aktif edildiğinde, binanın toplam inşaat maliyet havuzu <strong>asla değişmez</strong>;
                  ancak zemin kat ile manzaralı üst kat ve güney cephe dairelerin katkı payı oranları adil olarak ağırlıklandırılır.
                </p>

                {/* Hızlı Şablon Butonları */}
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Hızlı Şerefiye Şablonları:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyAutoSerefiye('standard')}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Standart Kat & Cephe Dağıtımı</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyAutoSerefiye('luxury')}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                      <span>Lüks / Üst Kat Ağırlıklı</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyAutoSerefiye('reset')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Sıfırla (Eşit 1.00)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* B) Kat Mülkiyeti Kanunu (KMK) Arsa Payı Dengeleme Modülü */}
              <div className={`p-5 rounded-2xl border ${innerCardBg} space-y-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold uppercase text-slate-800">
                      B) Arsa Payı (KMK) Mahsuplaşma & Dengeleme
                    </h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!params.enableLandShareBalancing}
                      onChange={(e) => {
                        updateParam('enableLandShareBalancing', e.target.checked);
                        if (onCalculate) onCalculate();
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Kat maliklerinin tapudaki mevcut arsa payı hisse oranı ile yeni projede aldıkları bağımsız bölümün değeri
                  karşılaştırılır. Arsa payından daha küçük daire alan maliklere <strong>alacak/mahsup hakkı</strong>, daha büyük daire alanlara <strong>dengeleme borcu</strong> yansıtılır.
                </p>

                <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600">Toplam Arsa Paydası:</span>
                    <input
                      type="number"
                      min="1"
                      value={params.totalLandShareDenominator || 1000}
                      onChange={(e) => {
                        updateParam('totalLandShareDenominator', Math.max(1, parseInt(e.target.value) || 1000));
                        if (onCalculate) onCalculate();
                      }}
                      className={`w-24 text-xs px-2.5 py-1.5 rounded-lg border font-mono font-bold ${inputBg}`}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyAutoLandShare('proportional')}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      title="Her dairenin arsa payını brüt m² alanına orantılı olarak dağıtır"
                    >
                      📐 m² Alanına Orantılı Dağıt
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyAutoLandShare('equal')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      title="Tüm dairelere eşit hisse payı dağıtır"
                    >
                      ⚖️ Eşit Dağıt
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* C) Şerefiye & Arsa Payı Özet Metrik Şeridi */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/70 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">Şerefiye Durumu</span>
                <strong className="text-sm font-mono text-amber-950 font-bold">
                  {params.enableSerefiye ? 'Aktif (Ağırlıklı)' : 'Pasif (Eşit Dağılım)'}
                </strong>
                <span className="text-[10px] text-amber-700 block">Toplam inşaat maliyeti korunur</span>
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200/70 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-indigo-800 block">En Yüksek Şerefiye</span>
                <strong className="text-sm font-mono text-indigo-950 font-bold">
                  {Math.max(...params.flats.map((f) => f.serefiyeMultiplier || 1.0)).toFixed(2)}x
                </strong>
                <span className="text-[10px] text-indigo-700 block">Üst Kat / Dubleks / Güney</span>
              </div>

              <div className="p-3 bg-slate-100/70 rounded-xl border border-slate-200 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-600 block">En Düşük Şerefiye</span>
                <strong className="text-sm font-mono text-slate-900 font-bold">
                  {Math.min(...params.flats.map((f) => f.serefiyeMultiplier || 1.0)).toFixed(2)}x
                </strong>
                <span className="text-[10px] text-slate-500 block">Zemin Kat / Arka Cephe</span>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/70 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Arsa Payı Dengesi</span>
                <strong className="text-sm font-mono text-emerald-950 font-bold">
                  {params.enableLandShareBalancing ? 'Mahsuplaşma Aktif' : 'Standart'}
                </strong>
                <span className="text-[10px] text-emerald-700 block">Payda: /{params.totalLandShareDenominator || 1000}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. KAT MALİKLERİ BİLGİ GİRİŞLERİ, ARAMA & TABLO / KART YÖNETİMİ */}
      <div className={`rounded-3xl border ${cardBg} shadow-sm overflow-hidden`}>
        <div className="w-full px-6 py-4 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsOwnersGridOpen(!isOwnersGridOpen)}
              className="flex items-center gap-2.5 text-left cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    4. Kat Malikleri Yönetimi & Pay Dağılımı
                  </span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full font-mono">
                    {params.flats.length} Daire
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Daire bazlı hak sahiplerini, hisse alanlarını, peşinat ve ödeme planlarını düzenleyin.
                </p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Görünüm Modu Değiştirici */}
            <div className="flex items-center p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Kompakt Excel Tablo Görünümü"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Tablo (Excel)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Kart Görünümü"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kartlar</span>
              </button>
            </div>

            {/* Excel / CSV İndir */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Kat Malikleri Hakediş ve Ödeme Planını Excel / CSV Olarak İndir"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel / CSV</span>
            </button>

            {/* Resmi A4 Raporu / Taahhütname */}
            <button
              type="button"
              onClick={() => handleOpenReport()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Resmi A4 Kat Maliki Taahhütnamesi ve Genel Kurul Raporunu Aç"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-600" />
              <span>Resmi A4 Rapor</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOwnersGridOpen(!isOwnersGridOpen)}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              {isOwnersGridOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isOwnersGridOpen && (
          <div className="p-6 space-y-5">
            {/* 1. KONTROL & ARAMA & FİLTRELEME ÇUBUĞU */}
            <div className="space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Arama Kutusu */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Daire no, malik adı soyadı veya TC ile filtrele..."
                    className={`w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border ${inputBg}`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sıralama Seçici */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 shrink-0">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    Sırala:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortType)}
                    className={`text-xs px-3 py-2 rounded-xl border font-medium ${inputBg}`}
                  >
                    <option value="id_asc">Daire No (Artan 1-N)</option>
                    <option value="id_desc">Daire No (Azalan N-1)</option>
                    <option value="name_asc">Malik Adı (A - Z)</option>
                    <option value="area_desc">Brüt Alan (Büyükten Küçüğe)</option>
                    <option value="area_asc">Brüt Alan (Küçükten Büyüğe)</option>
                    <option value="debt_desc">Kalan Borç (En Yüksek)</option>
                    <option value="debt_asc">Kalan Borç (En Düşük)</option>
                  </select>
                </div>
              </div>

              {/* Akıllı Filtreleme Butonları (Chips) & Toplu Peşinat Paneli */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Filtrele:
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      activeFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    Tümü ({params.flats.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('owners')}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      activeFilter === 'owners'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    Hak Sahipleri ({ownerFlats.length})
                  </button>
                  {params.projectModel === 'contractorShare' && (
                    <button
                      type="button"
                      onClick={() => setActiveFilter('contractor')}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        activeFilter === 'contractor'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                      }`}
                    >
                      Müteahhit Payı ({contractorFlats.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveFilter('shops')}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      activeFilter === 'shops'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-orange-50 hover:bg-orange-100 text-orange-700'
                    }`}
                  >
                    Dükkanlar ({params.flats.filter(f => f.flatType === 'shop').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('withDebt')}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      activeFilter === 'withDebt'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                    }`}
                  >
                    Borcu Olanlar ({ownerFlats.filter((f) => f.netRemainingDebt > 0).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('paid')}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      activeFilter === 'paid'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    Borcu Kapananlar ({ownerFlats.filter((f) => f.netRemainingDebt <= 0).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('withCredit')}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      activeFilter === 'withCredit'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-sky-50 hover:bg-sky-100 text-sky-800'
                    }`}
                  >
                    Dönüşüm Destekli ({ownerFlats.filter((f) => f.usedCredit > 0).length})
                  </button>
                </div>

                {/* Toplu Peşinat Uygulama Aracı (Kompakt) */}
                <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 shrink-0">
                  <span className="text-[11px] font-bold text-slate-700 pl-2">Toplu Peşinat:</span>
                  <input
                    type="number"
                    step="25000"
                    min="0"
                    value={bulkDownPayment || ''}
                    onChange={(e) => setBulkDownPayment(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="Tutar (TL)"
                    className={`w-28 text-xs px-2.5 py-1.5 rounded-lg border font-mono ${inputBg}`}
                  />
                  <button
                    type="button"
                    onClick={handleApplyBulkDownPayment}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    Uygula
                  </button>
                </div>
              </div>
            </div>

            {/* 2. FİLTRE VE ARAMA ÖZET ŞERİDİ */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="font-semibold">
                  Gösterilen:{' '}
                  <strong className="text-slate-900 font-mono">
                    {filteredMetrics.count} / {filteredMetrics.totalFlatsCount}
                  </strong>{' '}
                  Daire
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Toplam Alan:{' '}
                  <strong className="text-slate-900 font-mono">
                    {filteredMetrics.totalArea.toLocaleString('tr-TR')} m²
                  </strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Toplanan Peşinat:{' '}
                  <strong className="text-indigo-700 font-mono">
                    {filteredMetrics.totalDownPayment.toLocaleString('tr-TR')} TL
                  </strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Kalan Borç:{' '}
                  <strong className="text-amber-700 font-mono">
                    {filteredMetrics.totalDebt.toLocaleString('tr-TR')} TL
                  </strong>
                </span>
                {filteredMetrics.totalSupport > 0 && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span>
                      Hibe/Destek:{' '}
                      <strong className="text-emerald-700 font-mono">
                        {filteredMetrics.totalSupport.toLocaleString('tr-TR')} TL
                      </strong>
                    </span>
                  </>
                )}
              </div>

              {(searchQuery || activeFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveFilter('all');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Filtreleri Sıfırla</span>
                </button>
              )}
            </div>

            {/* 3. KOMPAKT EXCEL TABLO GÖRÜNÜMÜ */}
            {viewMode === 'table' ? (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs max-h-[650px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider z-10 border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="p-3 w-16 text-center">Daire</th>
                      <th className="p-3 w-28 text-center">Kat / Cephe</th>
                      <th className="p-3 w-24 text-center">Bölüm Tipi</th>
                      <th className="p-3 min-w-[150px]">Hak Sahibi Adı Soyadı</th>
                      <th className="p-3 w-24">T.C. Kimlik</th>
                      <th className="p-3 w-20 text-right">Brüt (m²)</th>
                      <th className="p-3 w-24 text-center">Şerefiye</th>
                      <th className="p-3 w-24 text-center">Arsa Payı (KMK)</th>
                      <th className="p-3 w-28 text-right">Peşinat (TL)</th>
                      <th className="p-3 w-16 text-center">Hibe</th>
                      {params.projectModel === 'contractorShare' && (
                        <th className="p-3 w-20 text-center">Müteahhit</th>
                      )}
                      <th className="p-3 w-28 text-right text-slate-800">Katkı Payı</th>
                      {params.enableLandShareBalancing && (
                        <th className="p-3 w-28 text-right text-emerald-800">Arsa Mahsubu</th>
                      )}
                      <th className="p-3 w-28 text-right text-slate-900">Kalan Net Borç</th>
                      <th className="p-3 w-20 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredFlats.length === 0 ? (
                      <tr>
                        <td
                          colSpan={14}
                          className="p-8 text-center text-slate-400 font-medium"
                        >
                          Arama kriterlerine uygun kat maliki bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      filteredFlats.map(({ flat, originalIndex, calc, isContractor }) => {
                        const isSelected = selectedFlatId === flat.id;
                        const netDebt = calc?.netRemainingDebt || 0;
                        const isPaid = !isContractor && netDebt <= 0;
                        const serefiyePct = Math.round(((flat.serefiyeMultiplier || 1.0) - 1.0) * 100);
                        const landShareDiff = calc?.landShareDifference || 0;

                        return (
                          <tr
                            key={flat.id}
                            className={`transition-colors ${
                              isSelected
                                ? 'bg-indigo-50/80 ring-1 ring-indigo-400/40'
                                : isContractor
                                ? 'bg-amber-50/20 hover:bg-amber-50/40 text-slate-600'
                                : isPaid
                                ? 'bg-emerald-50/20 hover:bg-emerald-50/30'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Daire No & Rol */}
                            <td className="p-2 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-slate-900 font-mono text-xs">
                                  No {flat.id}
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold mt-0.5 ${
                                    isContractor
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-indigo-100 text-indigo-800'
                                  }`}
                                >
                                  {isContractor ? 'Müteahhit' : 'Malik'}
                                </span>
                              </div>
                            </td>

                            {/* Kat ve Cephe Seçimi */}
                            <td className="p-2 text-center">
                              <div className="flex flex-col gap-1 items-center">
                                <select
                                  value={flat.floorNumber !== undefined ? flat.floorNumber : ''}
                                  onChange={(e) =>
                                    handleFlatChange(originalIndex, 'floorNumber', parseInt(e.target.value) || 0)
                                  }
                                  className={`text-[10px] px-1.5 py-1 rounded border font-medium ${inputBg} w-20 text-center`}
                                >
                                  <option value={-1}>Bodrum</option>
                                  <option value={0}>Zemin Kat</option>
                                  {Array.from({ length: Math.max(1, params.floorCount || 5) }).map((_, fIdx) => (
                                    <option key={fIdx + 1} value={fIdx + 1}>
                                      {fIdx + 1}. Kat
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={flat.facade || 'guney'}
                                  onChange={(e) => handleFlatChange(originalIndex, 'facade', e.target.value)}
                                  className={`text-[9px] px-1 py-0.5 rounded border font-medium ${inputBg} w-20 text-center`}
                                >
                                  <option value="guney">Güney</option>
                                  <option value="guney_bati">G-Batı</option>
                                  <option value="guney_dogu">G-Doğu</option>
                                  <option value="kuzey">Kuzey</option>
                                  <option value="dogu">Doğu</option>
                                  <option value="bati">Batı</option>
                                  <option value="on">Ön Cephe</option>
                                  <option value="arka">Arka Cephe</option>
                                </select>
                              </div>
                            </td>

                            {/* Bölüm Tipi Seçimi */}
                            <td className="p-2 text-center">
                              <select
                                value={flat.flatType || 'standard'}
                                onChange={(e) => handleFlatChange(originalIndex, 'flatType', e.target.value)}
                                className={`text-[10px] px-1.5 py-1.5 rounded border font-bold ${
                                  flat.flatType === 'shop' ? 'bg-amber-50 border-amber-300 text-amber-800' : inputBg
                                } w-24 text-center`}
                              >
                                <option value="standard">🏠 Konut</option>
                                <option value="shop">🏪 Dükkan</option>
                                <option value="mansard">🏚️ Mansart</option>
                                <option value="duplex">🏘️ Dubleks</option>
                              </select>
                            </td>

                            {/* Malik Adı Soyadı (Inline Input) */}
                            <td className="p-2">
                              <input
                                type="text"
                                value={flat.name || ''}
                                onChange={(e) => handleFlatChange(originalIndex, 'name', e.target.value)}
                                disabled={isContractor}
                                placeholder={isContractor ? 'MÜTEAHHİT SATIŞ PAYI' : 'Malik Adı Soyadı'}
                                className={`w-full text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                                  isContractor
                                    ? 'bg-slate-100/80 text-slate-500 border-transparent italic'
                                    : 'bg-white border-slate-200 focus:border-indigo-500 text-slate-800 shadow-2xs'
                                }`}
                              />
                            </td>

                            {/* T.C. Kimlik No (Inline Input) */}
                            <td className="p-2">
                              <input
                                type="text"
                                maxLength={11}
                                value={flat.tc || ''}
                                onChange={(e) => handleFlatChange(originalIndex, 'tc', e.target.value)}
                                disabled={isContractor}
                                placeholder="TC No"
                                className={`w-full text-xs px-2 py-1.5 rounded-lg border font-mono transition-all text-center ${
                                  isContractor
                                    ? 'bg-slate-100/80 text-slate-400 border-transparent'
                                    : 'bg-white border-slate-200 focus:border-indigo-500 text-slate-700 shadow-2xs'
                                }`}
                              />
                            </td>

                            {/* Brüt Alan m² (Inline Input) */}
                            <td className="p-2 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    value={flat.area || ''}
                                    onChange={(e) =>
                                      handleFlatChange(
                                        originalIndex,
                                        'area',
                                        Math.max(1, parseFloat(e.target.value) || 0)
                                      )
                                    }
                                    className={`w-16 text-xs px-1.5 py-1.5 rounded-lg border font-mono font-bold text-right ${inputBg} shadow-2xs`}
                                  />
                                  <span className="text-[10px] text-slate-400">m²</span>
                                </div>
                                {calc && (
                                  <div className="text-[9px] text-slate-500 font-mono text-right leading-tight border-t border-slate-200/50 pt-1 mt-1 w-full max-w-[130px]">
                                    <div>Net: <span className="font-bold text-emerald-700">{calc.netArea} m²</span></div>
                                    <div>Ortak: <span className="font-bold text-slate-600">+{calc.commonAreaShare} m²</span></div>
                                    <div>Balkon: <span className="font-bold text-indigo-600">{calc.balconyAreaShare > 0 ? `${calc.balconyAreaShare} m²` : 'Yok'}</span></div>
                                    {calc.cantileverAreaShare > 0 && (
                                      <div>Çıkma: <span className="font-bold text-amber-700">+{calc.cantileverAreaShare} m²</span></div>
                                    )}
                                    <div className="font-bold text-slate-900 border-t border-dashed border-slate-200 pt-0.5 mt-0.5">Topl: {calc.totalGrossArea} m²</div>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Şerefiye Çarpanı (Inline Input & Badge) */}
                            <td className="p-2 text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.5"
                                  max="2.5"
                                  value={flat.serefiyeMultiplier !== undefined ? flat.serefiyeMultiplier : 1.0}
                                  onChange={(e) =>
                                    handleFlatChange(
                                      originalIndex,
                                      'serefiyeMultiplier',
                                      Math.max(0.5, parseFloat(e.target.value) || 1.0)
                                    )
                                  }
                                  className={`w-16 text-xs px-1 py-1 rounded-lg border font-mono text-center font-bold ${
                                    params.enableSerefiye ? 'bg-amber-50/60 border-amber-300 text-amber-950' : inputBg
                                  }`}
                                />
                                {params.enableSerefiye && (
                                  <span
                                    className={`text-[9px] font-mono font-bold px-1 rounded ${
                                      serefiyePct > 0
                                        ? 'text-emerald-700 bg-emerald-50'
                                        : serefiyePct < 0
                                        ? 'text-amber-700 bg-amber-50'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    {serefiyePct > 0 ? `+${serefiyePct}%` : serefiyePct < 0 ? `${serefiyePct}%` : '0%'}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Arsa Payı (KMK Hisse / Payda) */}
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1 font-mono text-xs">
                                <input
                                  type="number"
                                  min="0"
                                  value={flat.landShareNumerator !== undefined ? flat.landShareNumerator : ''}
                                  onChange={(e) =>
                                    handleFlatChange(
                                      originalIndex,
                                      'landShareNumerator',
                                      Math.max(0, parseInt(e.target.value) || 0)
                                    )
                                  }
                                  placeholder="0"
                                  className={`w-12 text-xs px-1 py-1 rounded-lg border text-center font-bold ${
                                    params.enableLandShareBalancing
                                      ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                                      : inputBg
                                  }`}
                                />
                                <span className="text-[10px] text-slate-400">
                                  /{flat.landShareDenominator || params.totalLandShareDenominator || 1000}
                                </span>
                              </div>
                            </td>

                            {/* Peşinat TL (Inline Input) */}
                            <td className="p-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  step="10000"
                                  min="0"
                                  value={flat.downPayment || ''}
                                  onChange={(e) =>
                                    handleFlatChange(
                                      originalIndex,
                                      'downPayment',
                                      Math.max(0, parseFloat(e.target.value) || 0)
                                    )
                                  }
                                  disabled={isContractor}
                                  placeholder="0"
                                  className={`w-20 text-xs px-1.5 py-1.5 rounded-lg border font-mono text-right ${
                                    isContractor
                                      ? 'bg-slate-100 text-slate-400 border-transparent'
                                      : 'bg-white border-slate-200 text-indigo-700 font-bold focus:border-indigo-500 shadow-2xs'
                                  }`}
                                />
                                <span className="text-[10px] text-slate-400">₺</span>
                              </div>
                            </td>

                            {/* Devlet Desteği Checkbox */}
                            <td className="p-2 text-center">
                              <label className="inline-flex items-center justify-center cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={!!flat.useTransformationCredit}
                                  onChange={(e) =>
                                    handleFlatChange(originalIndex, 'useTransformationCredit', e.target.checked)
                                  }
                                  disabled={isContractor}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 disabled:opacity-40 cursor-pointer"
                                />
                              </label>
                            </td>

                            {/* Müteahhit Payı Toggle */}
                            {params.projectModel === 'contractorShare' && (
                              <td className="p-2 text-center">
                                <label className="inline-flex items-center justify-center cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isContractor}
                                    onChange={(e) => {
                                      const isChecked = e.target.checked;
                                      const currentIds = params.contractorFlatIds
                                        ? [...params.contractorFlatIds]
                                        : [];
                                      let nextIds: number[];
                                      if (isChecked) {
                                        nextIds = currentIds.includes(flat.id)
                                          ? currentIds
                                          : [...currentIds, flat.id];
                                      } else {
                                        nextIds = currentIds.filter((id) => id !== flat.id);
                                      }
                                      onChangeParams({
                                        ...params,
                                        contractorFlatIds: nextIds,
                                        flats: params.flats.map((f, i) =>
                                          i === originalIndex ? { ...f, isContractorShare: isChecked } : f
                                        ),
                                      });
                                    }}
                                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                                  />
                                </label>
                              </td>
                            )}

                            {/* Toplam Katkı Payı */}
                            <td className="p-2 text-right font-mono text-slate-800 font-semibold">
                              {calc
                                ? `${calc.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL`
                                : '-'}
                            </td>

                            {/* Arsa Payı Mahsuplaşma Dengesi (+ / - TL) */}
                            {params.enableLandShareBalancing && (
                              <td className="p-2 text-right font-mono text-xs">
                                {isContractor ? (
                                  <span className="text-slate-400">-</span>
                                ) : landShareDiff > 0 ? (
                                  <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    +{landShareDiff.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                                  </span>
                                ) : landShareDiff < 0 ? (
                                  <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    {landShareDiff.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                                  </span>
                                ) : (
                                  <span className="text-slate-400">0 TL</span>
                                )}
                              </td>
                            )}

                            {/* Kalan Net Borç */}
                            <td className="p-2 text-right font-mono">
                              {isContractor ? (
                                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  Müteahhitte
                                </span>
                              ) : isPaid ? (
                                <span className="text-emerald-700 font-bold flex items-center justify-end gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>0 TL</span>
                                </span>
                              ) : (
                                <span className="font-extrabold text-slate-900">
                                  {netDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                                </span>
                              )}
                            </td>

                            {/* Detay Kartı & A4 Rapor Butonları */}
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedFlatId(flat.id)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200'
                                  }`}
                                  title="Ödeme Kartını Aç"
                                >
                                  {isSelected ? 'Açık' : 'Kart'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenReport(flat.id)}
                                  className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-all cursor-pointer"
                                  title={`Daire ${flat.id} Resmi A4 Taahhütnamesini Yazdır / PDF`}
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* 4. KART GÖRÜNÜMÜ */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFlats.map(({ flat, originalIndex, calc, isContractor }) => {
                  const isSelected = selectedFlatId === flat.id;
                  const netDebt = calc?.netRemainingDebt || 0;

                  return (
                    <div
                      key={flat.id}
                      className={`${innerCardBg} rounded-2xl border p-4 space-y-3 transition-all ${
                        isSelected
                          ? 'ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/30 shadow-md'
                          : isContractor
                          ? 'ring-1 ring-amber-500/20 border-amber-300'
                          : 'hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-800 flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isContractor ? 'bg-amber-500' : 'bg-indigo-500'
                            }`}
                          />
                          <span>Daire {flat.id}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              isContractor
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {isContractor ? 'Müteahhit' : 'Hak Sahibi'}
                          </span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] bg-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded-full border border-slate-300/50">
                            {flat.area} m²
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedFlatId(flat.id)}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                          >
                            Kart
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Hak Sahibi Adı Soyadı:
                        </label>
                        <input
                          type="text"
                          value={flat.name || ''}
                          onChange={(e) => handleFlatChange(originalIndex, 'name', e.target.value)}
                          className={`w-full text-xs px-3 py-1.5 rounded-xl border ${inputBg}`}
                          disabled={isContractor}
                          placeholder={isContractor ? 'MÜTEAHHİT KONTROLÜNDE' : 'Daire Sahibi Adı Soyadı'}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            T.C. Kimlik No:
                          </label>
                          <input
                            type="text"
                            maxLength={11}
                            value={flat.tc || ''}
                            onChange={(e) => handleFlatChange(originalIndex, 'tc', e.target.value)}
                            className={`w-full text-xs px-3 py-1.5 rounded-xl border ${inputBg}`}
                            disabled={isContractor}
                            placeholder="-"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Brüt Alan (m²):
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={flat.area || ''}
                            onChange={(e) =>
                              handleFlatChange(
                                originalIndex,
                                'area',
                                Math.max(1, parseFloat(e.target.value) || 0)
                              )
                            }
                            className={`w-full text-xs px-3 py-1.5 rounded-xl border ${inputBg}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Kat No:
                          </label>
                          <select
                            value={flat.floorNumber !== undefined ? flat.floorNumber : ''}
                            onChange={(e) =>
                              handleFlatChange(originalIndex, 'floorNumber', parseInt(e.target.value) || 0)
                            }
                            className={`w-full text-xs px-2.5 py-1.5 rounded-xl border ${inputBg}`}
                          >
                            <option value={-1}>Bodrum Kat</option>
                            <option value={0}>Zemin Kat</option>
                            {Array.from({ length: Math.max(1, params.floorCount || 5) }).map((_, fIdx) => (
                              <option key={fIdx + 1} value={fIdx + 1}>
                                {fIdx + 1}. Kat
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Cephe Yönü:
                          </label>
                          <select
                            value={flat.facade || 'guney'}
                            onChange={(e) => handleFlatChange(originalIndex, 'facade', e.target.value)}
                            className={`w-full text-xs px-2.5 py-1.5 rounded-xl border ${inputBg}`}
                          >
                            <option value="guney">Güney Cephe</option>
                            <option value="guney_bati">Güney-Batı</option>
                            <option value="guney_dogu">Güney-Doğu</option>
                            <option value="kuzey">Kuzey Cephe</option>
                            <option value="dogu">Doğu Cephe</option>
                            <option value="bati">Batı Cephe</option>
                            <option value="on">Ön Cephe</option>
                            <option value="arka">Arka Cephe</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Bağımsız Bölüm Tipi:
                        </label>
                        <select
                          value={flat.flatType || 'standard'}
                          onChange={(e) => handleFlatChange(originalIndex, 'flatType', e.target.value)}
                          className={`w-full text-xs px-3 py-1.5 rounded-xl border font-bold ${
                            flat.flatType === 'shop' ? 'bg-amber-50 border-amber-300 text-amber-800' : inputBg
                          }`}
                        >
                          <option value="standard">🏠 Konut (Daire)</option>
                          <option value="shop">🏪 Ticari (Dükkan/Mağaza)</option>
                          <option value="mansard">🏚️ Mansart Katı</option>
                          <option value="duplex">🏘️ Çatı Dubleksi</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Şerefiye:
                            </label>
                            <span className="text-[9px] font-mono font-bold text-amber-700">
                              {Math.round(((flat.serefiyeMultiplier || 1.0) - 1.0) * 100) > 0
                                ? `+${Math.round(((flat.serefiyeMultiplier || 1.0) - 1.0) * 100)}%`
                                : `${Math.round(((flat.serefiyeMultiplier || 1.0) - 1.0) * 100)}%`}
                            </span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0.5"
                            max="2.5"
                            value={flat.serefiyeMultiplier !== undefined ? flat.serefiyeMultiplier : 1.0}
                            onChange={(e) =>
                              handleFlatChange(
                                originalIndex,
                                'serefiyeMultiplier',
                                Math.max(0.5, parseFloat(e.target.value) || 1.0)
                              )
                            }
                            className={`w-full text-xs px-2.5 py-1.5 rounded-xl border font-mono ${
                              params.enableSerefiye ? 'bg-amber-50/50 border-amber-300 font-bold' : inputBg
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Arsa Payı (KMK):
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={flat.landShareNumerator !== undefined ? flat.landShareNumerator : ''}
                              onChange={(e) =>
                                handleFlatChange(
                                  originalIndex,
                                  'landShareNumerator',
                                  Math.max(0, parseInt(e.target.value) || 0)
                                )
                              }
                              placeholder="0"
                              className={`w-full text-xs px-2.5 py-1.5 rounded-xl border font-mono text-center ${
                                params.enableLandShareBalancing ? 'bg-emerald-50/50 border-emerald-300 font-bold' : inputBg
                              }`}
                            />
                            <span className="text-[10px] text-slate-400 font-mono">
                              /{flat.landShareDenominator || params.totalLandShareDenominator || 1000}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Peşinat (TL):
                          </label>
                          <input
                            type="number"
                            step="5000"
                            min="0"
                            value={flat.downPayment || ''}
                            onChange={(e) =>
                              handleFlatChange(
                                originalIndex,
                                'downPayment',
                                Math.max(0, parseFloat(e.target.value) || 0)
                              )
                            }
                            className={`w-full text-xs px-3 py-1.5 rounded-xl border ${inputBg}`}
                            disabled={isContractor}
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-700 cursor-pointer h-full pb-2 select-none">
                            <input
                              type="checkbox"
                              checked={!!flat.useTransformationCredit}
                              onChange={(e) =>
                                handleFlatChange(originalIndex, 'useTransformationCredit', e.target.checked)
                              }
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                              disabled={isContractor}
                            />
                            <span>Devlet Desteği</span>
                          </label>
                        </div>
                      </div>

                      {/* Canlı Maliyet & Kalan Borç Göstergesi */}
                      {calc && !isContractor && (
                        <div className="pt-2 border-t border-slate-200/60 space-y-1 text-xs font-mono">
                          {params.enableLandShareBalancing && (calc.landShareDifference || 0) !== 0 && (
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-500">Arsa Payı Dengelemesi:</span>
                              <span
                                className={`font-bold ${
                                  (calc.landShareDifference || 0) > 0 ? 'text-amber-700' : 'text-emerald-700'
                                }`}
                              >
                                {(calc.landShareDifference || 0) > 0 ? '+' : ''}
                                {(calc.landShareDifference || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}{' '}
                                TL
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">Kalan Net Borç:</span>
                            <span
                              className={`font-bold ${
                                netDebt <= 0 ? 'text-emerald-700' : 'text-slate-900'
                              }`}
                            >
                              {netDebt <= 0
                                ? 'Tamamı Ödendi'
                                : `${netDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL`}
                            </span>
                          </div>
                        </div>
                      )}

                      {params.projectModel === 'contractorShare' && (
                        <div className="pt-1.5 border-t border-slate-200/50">
                          <label className="flex items-center gap-2 text-[10px] font-bold text-amber-800 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isContractor}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                const currentIds = params.contractorFlatIds
                                  ? [...params.contractorFlatIds]
                                  : [];
                                let nextIds: number[];
                                if (isChecked) {
                                  nextIds = currentIds.includes(flat.id)
                                    ? currentIds
                                    : [...currentIds, flat.id];
                                } else {
                                  nextIds = currentIds.filter((id) => id !== flat.id);
                                }
                                onChangeParams({
                                  ...params,
                                  contractorFlatIds: nextIds,
                                  flats: params.flats.map((f, i) =>
                                    i === originalIndex ? { ...f, isContractorShare: isChecked } : f
                                  ),
                                });
                              }}
                              className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                            />
                            <span>Bu Daire Müteahhide Ait (Satış Payı)</span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. ÇIKTILAR & DAIRE HAKEDİŞ HESAP TABLOSU & BİREYSEL ÖDEME TAKVİMİ */}
      <div className={`p-6 rounded-3xl border ${cardBg} shadow-sm space-y-6`}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <Building className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                📊 Hak Sahipleri Ödeme Çıktıları & Bireysel Ödeme Takvimleri
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Daire bazlı brüt alan maliyeti, peşinat mahsubu, kentsel dönüşüm yardımı ve net kalan borç listesi. Detaylar için dairenin üzerine tıklayın.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol Taraf: Özet Liste Tablosu */}
          <div className="lg:col-span-2 overflow-x-auto border border-slate-200/60 rounded-2xl max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider z-10">
                <tr>
                  <th className="p-3">Daire No / Hak Sahibi</th>
                  <th className="p-3 text-right">Brüt Alan</th>
                  <th className="p-3 text-right">Toplam Borç</th>
                  <th className="p-3 text-right text-indigo-700">Ödenen Peşinat</th>
                  <th className="p-3 text-right text-emerald-700">Devlet Desteği</th>
                  <th className="p-3 text-right text-slate-900">Kalan Bakiye</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {results.flatResults?.map((flat) => (
                  <tr
                    key={flat.id}
                    onClick={() => setSelectedFlatId(flat.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedFlatId === flat.id
                        ? 'bg-indigo-50/70 hover:bg-indigo-50'
                        : flat.isContractorShare
                        ? 'bg-amber-50/20 hover:bg-amber-50/40 text-slate-500'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-3">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>No {flat.id}:</span>
                        <span className="truncate max-w-[120px]">{flat.name || 'İsimsiz Malik'}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
                        {flat.isContractorShare ? 'Müteahhit Payı' : `TC: ${flat.tc || 'Belirtilmedi'}`}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700">{flat.area} m²</td>
                    <td className="p-3 text-right font-mono text-slate-900">
                      {flat.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 text-right font-mono text-indigo-700">
                      {flat.downPayment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-700 font-bold">
                      {flat.usedCredit > 0 ? `${flat.usedCredit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL` : '-'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {flat.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sağ Taraf: Tıklanan Dairenin Bireysel Ödeme Takvimi ve Makbuz Kartı */}
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
            {selectedFlatResult ? (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>Daire {selectedFlatResult.id} Ödeme Kartı</span>
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenReport(selectedFlatResult.id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-200 transition-all cursor-pointer"
                      title="Resmi A4 Taahhütname Yazdır / PDF"
                    >
                      <Printer className="w-3 h-3 text-indigo-600" />
                      <span>A4 Taahhütname</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFlatId(null)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1.5 py-1"
                    >
                      Kapat
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="flex justify-between">
                    <span className="text-slate-500">Mülk Sahibi:</span>
                    <strong className="text-slate-800">{selectedFlatResult.name || 'Belirtilmedi'}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Konum / Kat & Cephe:</span>
                    <strong className="text-slate-800">
                      {selectedFlatResult.floorNumber !== undefined ? (selectedFlatResult.floorNumber === 0 ? 'Zemin' : `${selectedFlatResult.floorNumber}. Kat`) : '-'} / {selectedFlatResult.facade || 'Güney'}
                    </strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Bağımsız Bölüm Alanı:</span>
                    <strong className="font-mono text-slate-800">{selectedFlatResult.area} m²</strong>
                  </p>
                  <div className="bg-white/80 p-3 rounded-xl border border-slate-200/50 space-y-1.5 text-[11px] my-2 shadow-2xs">
                    <div className="text-[10px] font-bold text-indigo-900 tracking-wider uppercase mb-1">Fiziki Metraj Dağılımı</div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">İç Net Alan (Süpürülebilir):</span>
                      <strong className="font-mono text-emerald-800">{selectedFlatResult.netArea} m²</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bölüm Brüt Alanı:</span>
                      <strong className="font-mono text-slate-800">{selectedFlatResult.grossArea} m²</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bina Ortak Alan Payı:</span>
                      <strong className="font-mono text-slate-800">+{selectedFlatResult.commonAreaShare} m²</strong>
                    </div>
                    {selectedFlatResult.cantileverAreaShare > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Çıkma Katkısı:</span>
                        <strong className="font-mono text-slate-800">+{selectedFlatResult.cantileverAreaShare} m²</strong>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Balkon / Teras Alanı:</span>
                      <strong className="font-mono text-slate-800">{selectedFlatResult.balconyAreaShare > 0 ? `${selectedFlatResult.balconyAreaShare} m²` : 'Yok'}</strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-dashed border-slate-200 font-bold text-slate-900">
                      <span>Genel Toplam Brüt:</span>
                      <strong className="font-mono">{selectedFlatResult.totalGrossArea} m²</strong>
                    </div>
                  </div>
                  {params.enableSerefiye && (
                    <p className="flex justify-between text-amber-900 bg-amber-50/70 px-2 py-1 rounded border border-amber-200/60">
                      <span>Şerefiye Katsayısı:</span>
                      <strong className="font-mono">
                        {selectedFlatResult.serefiyeMultiplier || 1.0} ({Math.round(((selectedFlatResult.serefiyeMultiplier || 1.0) - 1.0) * 100) > 0 ? '+' : ''}{Math.round(((selectedFlatResult.serefiyeMultiplier || 1.0) - 1.0) * 100)}%)
                      </strong>
                    </p>
                  )}
                  {params.enableLandShareBalancing && (
                    <p className="flex justify-between text-emerald-900 bg-emerald-50/70 px-2 py-1 rounded border border-emerald-200/60">
                      <span>Arsa Payı Dengelemesi:</span>
                      <strong className="font-mono">
                        {(selectedFlatResult.landShareDifference || 0) > 0 ? '+' : ''}{(selectedFlatResult.landShareDifference || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </strong>
                    </p>
                  )}
                  <p className="flex justify-between">
                    <span className="text-slate-500">Toplam İnşaat Katkı Payı:</span>
                    <strong className="font-mono text-slate-900">
                      {selectedFlatResult.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </strong>
                  </p>
                  <p className="flex justify-between text-indigo-700">
                    <span>Peşinat (Mahsup Edilen):</span>
                    <strong className="font-mono">
                      -{selectedFlatResult.downPayment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </strong>
                  </p>
                  {selectedFlatResult.usedCredit > 0 && (
                    <p className="flex justify-between text-emerald-700 font-semibold">
                      <span>Devlet Hibe / Dönüşüm Desteği:</span>
                      <strong className="font-mono">
                        -{selectedFlatResult.usedCredit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </strong>
                    </p>
                  )}
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 bg-white/50 p-2.5 rounded-lg border">
                    <span>Bakiye Taksit Tutarı:</span>
                    <span className="font-mono">
                      {selectedFlatResult.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </span>
                  </div>
                </div>

                {selectedFlatResult.netRemainingDebt > 0 ? (
                  <div className="pt-2.5 space-y-2">
                    {params.paymentPlanType === 'installments' ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                            Aylık Eşit Taksit Takvimi ({params.installmentCount || 12} Ay)
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                            {selectedFlatResult.monthlyInstallment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL / Ay
                          </span>
                        </div>
                        <div className="space-y-1.5 font-mono text-[11px] max-h-48 overflow-y-auto pr-1">
                          {Array.from({ length: Math.min(12, params.installmentCount || 12) }).map((_, idx) => (
                            <div key={idx} className="flex justify-between p-2 rounded bg-white border border-slate-200/50 text-slate-700">
                              <span>{idx + 1}. Ay Taksiti:</span>
                              <strong className="text-emerald-800">
                                {selectedFlatResult.monthlyInstallment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                              </strong>
                            </div>
                          ))}
                          {(params.installmentCount || 12) > 12 && (
                            <div className="p-2 text-center text-[10px] text-slate-400 bg-slate-100 rounded">
                              ... ve devam eden {(params.installmentCount || 12) - 12} ay boyunca aynı tutar.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : params.paymentPlanType === 'hybrid' ? (
                      <div>
                        <span className="block text-[10px] font-bold text-purple-800 uppercase tracking-wider mb-2">
                          Karma Ödeme Takvimi (Ara Ödemeli + Taksit)
                        </span>
                        <div className="space-y-1.5 font-mono text-[11px]">
                          <div className="flex justify-between p-2 rounded bg-white border border-slate-200/50 text-slate-700">
                            <span>1. Ara Ödeme (%25 Kaba):</span>
                            <strong className="text-indigo-900">
                              {Math.round(selectedFlatResult.netRemainingDebt * 0.25).toLocaleString('tr-TR')} TL
                            </strong>
                          </div>
                          <div className="flex justify-between p-2 rounded bg-white border border-slate-200/50 text-slate-700">
                            <span>2. Ara Ödeme (%15 İskân):</span>
                            <strong className="text-purple-900">
                              {Math.round(selectedFlatResult.netRemainingDebt * 0.15).toLocaleString('tr-TR')} TL
                            </strong>
                          </div>
                          <div className="flex justify-between p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold">
                            <span>Aylık Taksit ({params.installmentCount || 12} Ay):</span>
                            <span>
                              {Math.round(
                                (selectedFlatResult.netRemainingDebt * 0.6) / Math.max(1, params.installmentCount || 12)
                              ).toLocaleString('tr-TR')}{' '}
                              TL / Ay
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                          5 Aşamalı Taksit Takvimi (%{params.stage1Pay} / %{params.stage2Pay} / %{params.stage3Pay} / %{params.stage4Pay} / %{params.stage5Pay})
                        </span>
                        <div className="space-y-1.5 font-mono text-[11px]">
                          <div className="flex justify-between p-2 rounded bg-white border border-slate-200/50 text-slate-700">
                            <span>Aşama 1 (Sözleşme):</span>
                            <strong className="text-slate-900">
                              {selectedFlatResult.stagePayments[0].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                            </strong>
                          </div>
                          <div className="flex justify-between p-2 rounded bg-white border border-slate-200/50 text-slate-700">
                            <span>Aşama 2 (Temel):</span>
                            <strong className="text-slate-900">
                              {selectedFlatResult.stagePayments[1].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                            </strong>
                          </div>
                          <div className="flex justify-between p-2 rounded bg-white border border-slate-200/50 text-slate-700">
                            <span>Aşama 3 (Kaba):</span>
                            <strong className="text-slate-900">
                              {selectedFlatResult.stagePayments[2].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                            </strong>
                          </div>
                          <div className="flex justify-between p-2 rounded bg-white border border-slate-200/50 text-slate-700">
                            <span>Aşama 4 (İnce):</span>
                            <strong className="text-slate-900">
                              {selectedFlatResult.stagePayments[3].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                            </strong>
                          </div>
                          <div className="flex justify-between p-2 rounded bg-white border border-slate-200/50 text-slate-700">
                            <span>Aşama 5 (Anahtar):</span>
                            <strong className="text-slate-900">
                              {selectedFlatResult.stagePayments[4].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                            </strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-semibold">
                    🎉 Müteahhit Dairesi veya Kalan Borcu Olmayan Hak Sahibi.
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
                <FileText className="w-8 h-8" />
                <p className="text-xs">
                  Bireysel hakediş, peşinat makbuzu ve 5 aşamalı detaylı takvimini görüntülemek için yan listeden bir daireye tıklayın.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resmi A4 Kat Maliki Rapor ve Taahhütname Modalı */}
      <OfficialOwnerReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        params={params}
        results={results}
        initialFlatId={reportModalFlatId}
      />
    </div>
  );
};
