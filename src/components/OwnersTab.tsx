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
  AlertTriangle,
  Info,
  ExternalLink,
  Store,
  Home,
  Wrench,
  Equal,
} from 'lucide-react';
import { ProjectParams, CalculationResult, FlatItem, AppTheme, FlatCalcResult } from '../types';
import { OfficialOwnerReportModal } from './OfficialOwnerReportModal';
import { calculateFootprint } from '../utils/footprintUtils';
import { calculateCantileverDetails } from '../utils/calculatorEngine';

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

  // States to toggle sections (defaults to closed / collapsed)
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [isStagesOpen, setIsStagesOpen] = useState(false);
  const [isSerefiyeOpen, setIsSerefiyeOpen] = useState(false);
  const [isOwnersGridOpen, setIsOwnersGridOpen] = useState(false);

  const updateParam = <K extends keyof ProjectParams>(key: K, value: ProjectParams[K]) => {
    onChangeParams({
      ...params,
      [key]: value,
    });
  };

  const handleFlatChange = (idx: number, fieldOrUpdates: keyof FlatItem | Partial<FlatItem>, val?: any) => {
    const floorCount = Math.max(1, params.floorCount || 1);
    const updatedFlats = params.flats.map((flat, i) => {
      if (i === idx) {
        let merged: FlatItem;
        if (typeof fieldOrUpdates === 'string') {
          merged = { ...flat, [fieldOrUpdates]: val };
        } else {
          merged = { ...flat, ...fieldOrUpdates };
        }

        // KURAL 1: Mansart sadece en üst katta olur!
        if (merged.flatType === 'mansard') {
          merged.floorNumber = floorCount;
          if (!merged.description || merged.description.includes('Kat')) {
            merged.description = `En Üst Kat (${floorCount}. Kat) Mansart - Ayrı Bağımsız Bölüm`;
          }
        } else if (merged.floorNumber !== undefined && merged.floorNumber < floorCount && flat.flatType === 'mansard') {
          // Alt kata taşınırsa mimari kural gereği mansart kalamaz, konut olur
          merged.flatType = 'standard';
        }

        return merged;
      }
      return flat;
    });
    onChangeParams({
      ...params,
      flats: updatedFlats,
    });
    if (onCalculate) onCalculate();
  };

  // KURAL: 1 katta N daire varsa aksi belirtilmemişse o kat alanı eşit olarak kattaki daire sayısına bölünerek bulunur
  const handleDistributeFloorAreasEqually = () => {
    const floorCount = Math.max(1, params.floorCount || 1);
    const flatsPerFloor = Math.max(1, params.flatsPerFloor || 2);
    const hasShop = !!params.hasGroundFloorShop;
    const shopCount = hasShop ? Math.max(1, params.shopCount || 1) : 0;

    // Aktif taban alanı ve çıkmalı üst kat alanı
    const footprintCalc = calculateFootprint(params.footprintInputMode, params);
    const baseArea = footprintCalc.area;
    const cantileverInfo = calculateCantileverDetails(params, baseArea, footprintCalc);
    const upperFloorArea = cantileverInfo.upperFloorArea;
    const roofType = params.roofType || 'gable';
    const isMansard = roofType === 'mansard';
    const isDuplex = roofType === 'duplex';
    const roofAtticArea = isDuplex
      ? Math.round(upperFloorArea * 0.65 * 100) / 100
      : isMansard
      ? Math.round(upperFloorArea * 0.70 * 100) / 100
      : 0;

    const mansardFlats = params.flats.filter((f) => f.flatType === 'mansard');
    const mansardCount = mansardFlats.length > 0 ? mansardFlats.length : (params.mansardFlatCount || flatsPerFloor);
    const mansardAreaShare = mansardCount > 0 && roofAtticArea > 0
      ? parseFloat((roofAtticArea / mansardCount).toFixed(2))
      : parseFloat(((upperFloorArea * 0.70) / Math.max(1, flatsPerFloor)).toFixed(2));

    const shopAvg = shopCount > 0 ? parseFloat((baseArea / shopCount).toFixed(2)) : 0;
    const upperFlatAvg = parseFloat((upperFloorArea / flatsPerFloor).toFixed(2));
    const groundResFlatAvg = parseFloat((baseArea / flatsPerFloor).toFixed(2));

    const updatedFlats = params.flats.map((flat, idx) => {
      let targetFloor = flat.floorNumber;
      if (flat.flatType === 'mansard') {
        targetFloor = floorCount; // Kural: Mansart sadece en üst katta olur
      } else if (flat.flatType === 'shop') {
        targetFloor = 0;
      } else if (targetFloor === undefined) {
        const resIdx = hasShop ? Math.max(0, idx - shopCount) : idx;
        targetFloor = 1 + Math.floor(resIdx / flatsPerFloor);
      }

      let equalArea = upperFlatAvg;
      if (flat.flatType === 'shop') {
        equalArea = shopAvg;
      } else if (flat.flatType === 'mansard') {
        equalArea = mansardAreaShare;
      } else if (targetFloor === 1 && !hasShop) {
        equalArea = groundResFlatAvg;
      } else {
        equalArea = upperFlatAvg;
      }

      return {
        ...flat,
        floorNumber: targetFloor,
        area: equalArea,
        landShareNumerator: Math.round(equalArea * 10),
      };
    });

    onChangeParams({
      ...params,
      flats: updatedFlats,
    });
    if (onCalculate) onCalculate();
  };

  const handleToggleFlatGrant = (idx: number, enable: boolean) => {
    const updatedFlats = params.flats.map((flat, i) => {
      if (i === idx) {
        return {
          ...flat,
          useGrant: enable,
          useTransformationCredit: enable || !!flat.useCredit,
        };
      }
      return flat;
    });
    onChangeParams({
      ...params,
      flats: updatedFlats,
    });
    if (onCalculate) onCalculate();
  };

  const handleToggleFlatCredit = (idx: number, enable: boolean) => {
    const updatedFlats = params.flats.map((flat, i) => {
      if (i === idx) {
        const currentGrant = flat.useGrant !== undefined ? flat.useGrant : !!flat.useTransformationCredit;
        return {
          ...flat,
          useCredit: enable,
          useTransformationCredit: currentGrant || enable,
        };
      }
      return flat;
    });
    onChangeParams({
      ...params,
      flats: updatedFlats,
    });
    if (onCalculate) onCalculate();
  };

  // Auto-Presets for Serefiye
  const handleApplyAutoSerefiye = (preset: 'standard' | 'luxury' | 'reset') => {
    const floorCount = Math.max(1, params.floorCount || 1);
    const flatsPerFloor = Math.max(1, params.flatsPerFloor || 2);

    const updatedFlats = params.flats.map((flat, idx) => {
      if (preset === 'reset') {
        return { ...flat, serefiyeMultiplier: 1.0 };
      }

      const floor = flat.flatType === 'mansard'
        ? floorCount
        : (flat.floorNumber !== undefined
            ? flat.floorNumber
            : (params.hasGroundFloorShop
                ? (idx < (params.shopCount || 1) ? 0 : 1 + Math.floor((idx - (params.shopCount || 1)) / flatsPerFloor))
                : 1 + Math.floor(idx / flatsPerFloor)));
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

  const handleToggleAllGrant = (enable: boolean) => {
    const updatedFlats = params.flats.map((flat) => {
      const isContractor = params.contractorFlatIds?.includes(flat.id) || flat.isContractorShare;
      return {
        ...flat,
        useGrant: isContractor ? false : enable,
        useTransformationCredit: isContractor ? false : (enable || !!flat.useCredit),
      };
    });
    onChangeParams({
      ...params,
      flats: updatedFlats,
    });
    if (onCalculate) onCalculate();
  };

  const handleToggleAllCredit = (enable: boolean) => {
    const updatedFlats = params.flats.map((flat) => {
      const isContractor = params.contractorFlatIds?.includes(flat.id) || flat.isContractorShare;
      const currentGrant = flat.useGrant !== undefined ? flat.useGrant : !!flat.useTransformationCredit;
      return {
        ...flat,
        useCredit: isContractor ? false : enable,
        useTransformationCredit: isContractor ? false : (currentGrant || enable),
      };
    });
    onChangeParams({
      ...params,
      flats: updatedFlats,
    });
    if (onCalculate) onCalculate();
  };

  // Konut (Daire) Özel Toggle'ları
  const handleToggleFlatsGrant = (enable: boolean) => {
    const updatedFlats = params.flats.map((flat) => {
      const isContractor = params.contractorFlatIds?.includes(flat.id) || flat.isContractorShare;
      if (flat.flatType === 'shop' || isContractor) return flat;
      return {
        ...flat,
        useGrant: enable,
        useTransformationCredit: enable || !!flat.useCredit,
      };
    });
    onChangeParams({ ...params, flats: updatedFlats });
    if (onCalculate) onCalculate();
  };

  const handleToggleFlatsCredit = (enable: boolean) => {
    const updatedFlats = params.flats.map((flat) => {
      const isContractor = params.contractorFlatIds?.includes(flat.id) || flat.isContractorShare;
      if (flat.flatType === 'shop' || isContractor) return flat;
      const currentGrant = flat.useGrant !== undefined ? flat.useGrant : !!flat.useTransformationCredit;
      return {
        ...flat,
        useCredit: enable,
        useTransformationCredit: currentGrant || enable,
      };
    });
    onChangeParams({ ...params, flats: updatedFlats });
    if (onCalculate) onCalculate();
  };

  // Dükkan (Ticari) Özel Toggle'ları
  const handleToggleShopsGrant = (enable: boolean) => {
    const updatedFlats = params.flats.map((flat) => {
      const isContractor = params.contractorFlatIds?.includes(flat.id) || flat.isContractorShare;
      if (flat.flatType !== 'shop' || isContractor) return flat;
      return {
        ...flat,
        useGrant: enable,
        useTransformationCredit: enable || !!flat.useCredit,
      };
    });
    onChangeParams({ ...params, flats: updatedFlats });
    if (onCalculate) onCalculate();
  };

  const handleToggleShopsCredit = (enable: boolean) => {
    const updatedFlats = params.flats.map((flat) => {
      const isContractor = params.contractorFlatIds?.includes(flat.id) || flat.isContractorShare;
      if (flat.flatType !== 'shop' || isContractor) return flat;
      const currentGrant = flat.useGrant !== undefined ? flat.useGrant : !!flat.useTransformationCredit;
      return {
        ...flat,
        useCredit: enable,
        useTransformationCredit: currentGrant || enable,
      };
    });
    onChangeParams({ ...params, flats: updatedFlats });
    if (onCalculate) onCalculate();
  };

  // Hak Sahipleri Brüt m² Canlı Denetim ve Uyarı Motoru
  const areaAudit = useMemo(() => {
    const totalFlatsArea = params.flats.reduce((sum, f) => sum + (Number(f.area) || 0), 0);
    const totalConstructionArea = results.totalArea || 0;
    const averageFlatArea = params.flats.length > 0 ? totalFlatsArea / params.flats.length : 0;
    const commonArea = Math.max(0, totalConstructionArea - totalFlatsArea);
    const commonAreaRatio = totalConstructionArea > 0 ? (commonArea / totalConstructionArea) * 100 : 0;
    const zeroOrMissingFlats = params.flats.filter((f) => !f.area || Number(f.area) <= 0 || isNaN(Number(f.area)));
    const isOverTotal = totalFlatsArea > totalConstructionArea && totalConstructionArea > 0;
    const difference = totalConstructionArea - totalFlatsArea;
    const isHealthy = !isOverTotal && zeroOrMissingFlats.length === 0 && (totalConstructionArea === 0 || (commonAreaRatio >= 5 && commonAreaRatio <= 45));

    return {
      totalFlatsArea,
      totalConstructionArea,
      averageFlatArea,
      commonArea,
      commonAreaRatio,
      zeroOrMissingFlats,
      isOverTotal,
      isHealthy,
      difference,
    };
  }, [params.flats, results.totalArea]);

  // Otomatik Metraj Dengeleme Fonksiyonu
  const handleAutoBalanceAreas = () => {
    if (params.flats.length === 0) return;
    const targetUsableTotal = results.totalArea > 0 ? results.totalArea * 0.78 : (params.flats.length * 100);
    const avgArea = Math.max(30, Math.round((targetUsableTotal / params.flats.length) * 10) / 10);

    const updatedFlats = params.flats.map((flat) => {
      const currentArea = Number(flat.area) || 0;
      return {
        ...flat,
        area: currentArea > 0 ? currentArea : (flat.flatType === 'shop' ? Math.round(avgArea * 0.8) : avgArea),
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
  const totalStateSupport = ownerFlats.reduce((sum, f) => sum + (f.usedGrant || 0) + (f.usedCredit || 0), 0);
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
        const shopNo = `dükkan ${item.flat.id}`.toLowerCase();
        const idStr = `${item.flat.id}`;
        const name = (item.flat.name || '').toLowerCase();
        const tc = (item.flat.tc || '').toLowerCase();
        const desc = (item.flat.description || '').toLowerCase();
        return flatNo.includes(q) || shopNo.includes(q) || idStr.includes(q) || name.includes(q) || tc.includes(q) || desc.includes(q);
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
                Kat maliklerinin alan paylaşımlarını, peşinatlarını, devlet hibelerini, maliyet dağılımlarını ve 5 aşamalı taksit ödemelerini tek sayfadan yönetin.
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
              <label className={`block text-xs ${labelColor} mb-1.5`}>Malik Maliyet Hesabı Esası:</label>
              <select
                value={params.includeProfitOwner}
                onChange={(e) => updateParam('includeProfitOwner', e.target.value as any)}
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border ${inputBg}`}
              >
                <option value="yes">Genel Proje Bedeli Üzerinden</option>
                <option value="no">Yalnızca Net İnşaat Maliyeti Üzerinden</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs ${labelColor} mb-1.5`}>Daire Birim m² Maliyeti / Teklifi (TL):</label>
                <input
                  type="number"
                  value={params.manualFlatUnitPrice || ''}
                  onChange={(e) => updateParam('manualFlatUnitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder={`Otomatik (${results.grossCostPerSqM ? results.grossCostPerSqM.toFixed(0) : '42000'} TL/m²)`}
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border font-mono font-bold text-indigo-700 dark:text-indigo-400 ${inputBg}`}
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Örn: Standart 42.000 TL veya müteahhit daire payından dolayı indirimli 32.000 TL
                </span>
              </div>
              <div>
                <label className={`block text-xs ${labelColor} mb-1.5`}>Dükkan Birim m² Maliyeti / Teklifi (TL):</label>
                <input
                  type="number"
                  value={params.manualShopUnitPrice || ''}
                  onChange={(e) => updateParam('manualShopUnitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder={`Otomatik (${results.grossCostPerSqM ? results.grossCostPerSqM.toFixed(0) : '42000'} TL/m²)`}
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border font-mono font-bold text-amber-700 dark:text-amber-400 ${inputBg}`}
                  disabled={!params.hasGroundFloorShop}
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Örn: Ticari/dükkan için özel teklif fiyatı (Örn: 30.000 TL)
                </span>
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

            {/* Kat Alanını Dairelere Eşit Dağıt */}
            <button
              type="button"
              onClick={handleDistributeFloorAreasEqually}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Her katın brüt alanını kattaki daire sayısına (örn. 1 katta 4 daire) göre eşit olarak paylaştırır. Mansartları en üst kata yerleştirir."
            >
              <Equal className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kat Alanını Eşit Paylaştır</span>
            </button>

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
            {/* Kat & Mansart & Eşit Alan Kuralı Bilgilendirme Kartı */}
            <div className="p-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 rounded-2xl flex items-start gap-3 text-xs text-blue-950 shadow-2xs">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed space-y-1">
                <div className="font-bold text-blue-900 flex items-center gap-2">
                  <span>Mimari & Hukuki Kat Malikleri Kuralları</span>
                  <span className="text-[10px] bg-blue-100/80 text-blue-800 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                    Otomatik Senkronize
                  </span>
                </div>
                <div className="text-blue-800/90">
                  <strong>• Mansart Kuralı:</strong> Mansart bağımsız bölüm <u>yalnızca en üst katta (çatı katında)</u> yer alır. Mansart seçilen daireler otomatik olarak binanın en üst katına atanır.
                </div>
                <div className="text-blue-800/90">
                  <strong>• Daire Numaralandırma:</strong> Daire numarası en alt katlardan (Daire 1, 2...) başlar ve yukarıya doğru artar.
                </div>
                <div className="text-blue-800/90">
                  <strong>• Eşit Kat Alanı Kuralı:</strong> 1 katta {params.flatsPerFloor || 2} daire olduğunda, aksi belirtilmedikçe o katın brüt alanı kattaki daire sayısına eşit bölünerek bulunur. Daire alanlarını tablodan tek tek özelleştirebilir veya yukarıdaki <em>"Kat Alanını Eşit Paylaştır"</em> butonuyla standart eşit dağılıma döndürebilirsiniz.
                </div>
              </div>
            </div>
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

              {/* Akıllı Filtreleme Butonları (Chips) */}
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
                    Dönüşüm Destekli ({ownerFlats.filter((f) => (f.usedCredit || 0) > 0 || (f.usedGrant || 0) > 0).length})
                  </button>
                </div>
              </div>

              {/* HİBE, KREDİ VE PEŞİNAT MERKEZİ PARAMETRE KONTROL PANELİ (KONUT VE DÜKKAN AYRI) */}
              <div className="p-4 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-emerald-50/20 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-indigo-600" />
                        Hibe, Kredi ve Peşinat Parametreleri
                      </span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                        Ödeme Önceliği: 1. Peşinat → 2. Hibe → 3. Kredi
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Konut ve dükkanlar için hibe ve kredi tutarları ayrı ayrı belirlenir. Daire borcundan önce peşinat, ardından hibe, kalan bakiyeye kredi mahsup edilir.
                    </p>
                  </div>

                  {/* Toplu Peşinat Belirleme */}
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-indigo-300 shadow-2xs">
                    <span className="text-[11px] font-bold text-indigo-900">Toplu Peşinat:</span>
                    <input
                      type="number"
                      step="25000"
                      min="0"
                      value={bulkDownPayment || ''}
                      onChange={(e) => setBulkDownPayment(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="Tutar (TL)"
                      className="w-24 text-xs px-2 py-1 rounded-lg border border-slate-200 font-mono font-bold text-right text-indigo-700 focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400 font-mono">TL</span>
                    <button
                      type="button"
                      onClick={handleApplyBulkDownPayment}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      Uygula
                    </button>
                  </div>
                </div>

                {/* Hızlı Toplu Destek Butonları */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-200/50">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                    <span>Tüm Hak Sahipleri:</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleToggleAllGrant(true)}
                      className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/80 px-2.5 py-1 rounded-lg border border-emerald-300 transition-all cursor-pointer shadow-2xs"
                      title="Tüm hak sahiplerine hibe desteğini aç"
                    >
                      ✓ Tümüne Hibe Aç
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAllGrant(false)}
                      className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg border border-slate-300 transition-all cursor-pointer"
                      title="Tüm hak sahiplerinden hibeyi kapat"
                    >
                      ✕ Hibe Kapat
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAllCredit(true)}
                      className="text-[10px] font-bold text-sky-800 bg-sky-100/80 hover:bg-sky-200/80 px-2.5 py-1 rounded-lg border border-sky-300 transition-all cursor-pointer shadow-2xs"
                      title="Tüm hak sahiplerine kredi desteğini aç"
                    >
                      ✓ Tümüne Kredi Aç
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAllCredit(false)}
                      className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg border border-slate-300 transition-all cursor-pointer"
                      title="Tüm hak sahiplerinden krediyi kapat"
                    >
                      ✕ Kredi Kapat
                    </button>
                  </div>
                </div>

                {/* Konut ve Dükkan Parametreleri Yan Yana */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* 1. KONUT (DAİRE) DESTEKLERİ */}
                  <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-emerald-600" />
                        🏠 Konut (Daire) Destekleri
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleToggleFlatsGrant(true)}
                          className="text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-all cursor-pointer"
                          title="Tüm dairelere hibe aç"
                        >
                          Hibe Aç
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleFlatsGrant(false)}
                          className="text-[9px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 transition-all cursor-pointer"
                          title="Tüm dairelerde hibeyi kapat"
                        >
                          Hibe Kapat
                        </button>
                        <span className="text-slate-200">|</span>
                        <button
                          type="button"
                          onClick={() => handleToggleFlatsCredit(true)}
                          className="text-[9px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 px-1.5 py-0.5 rounded border border-sky-200 transition-all cursor-pointer"
                          title="Tüm dairelere kredi aç"
                        >
                          Kredi Aç
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleFlatsCredit(false)}
                          className="text-[9px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 transition-all cursor-pointer"
                          title="Tüm dairelerde krediyi kapat"
                        >
                          Kredi Kapat
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200/70">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                        <span className="text-[10px] font-bold text-slate-600">Daire Hibe:</span>
                        <input
                          type="number"
                          step="50000"
                          min="0"
                          value={params.grantAmountPerFlat !== undefined ? params.grantAmountPerFlat : 700000}
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            updateParam('grantAmountPerFlat', val);
                            if (onCalculate) onCalculate();
                          }}
                          className="w-full text-xs px-1.5 py-0.5 rounded border border-slate-200 font-mono font-bold text-right text-emerald-800 bg-white"
                        />
                        <span className="text-[9px] text-slate-400 font-mono">TL</span>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200/70">
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"></div>
                        <span className="text-[10px] font-bold text-slate-600">Daire Kredi:</span>
                        <input
                          type="number"
                          step="50000"
                          min="0"
                          value={params.creditAmountPerFlat !== undefined ? params.creditAmountPerFlat : 700000}
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            updateParam('creditAmountPerFlat', val);
                            if (onCalculate) onCalculate();
                          }}
                          className="w-full text-xs px-1.5 py-0.5 rounded border border-slate-200 font-mono font-bold text-right text-sky-800 bg-white"
                        />
                        <span className="text-[9px] text-slate-400 font-mono">TL</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. DÜKKAN (TİCARİ) DESTEKLERİ */}
                  <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-amber-600" />
                        🏪 Dükkan (Ticari) Destekleri
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleToggleShopsGrant(true)}
                          className="text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-all cursor-pointer"
                          title="Tüm dükkanlara hibe aç"
                        >
                          Hibe Aç
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleShopsGrant(false)}
                          className="text-[9px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 transition-all cursor-pointer"
                          title="Tüm dükkanlarda hibeyi kapat"
                        >
                          Hibe Kapat
                        </button>
                        <span className="text-slate-200">|</span>
                        <button
                          type="button"
                          onClick={() => handleToggleShopsCredit(true)}
                          className="text-[9px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 px-1.5 py-0.5 rounded border border-sky-200 transition-all cursor-pointer"
                          title="Tüm dükkanlara kredi aç"
                        >
                          Kredi Aç
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleShopsCredit(false)}
                          className="text-[9px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 transition-all cursor-pointer"
                          title="Tüm dükkanlarda krediyi kapat"
                        >
                          Kredi Kapat
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200/70">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                        <span className="text-[10px] font-bold text-slate-600">Dükkan Hibe:</span>
                        <input
                          type="number"
                          step="50000"
                          min="0"
                          value={params.shopGrantAmountPerFlat !== undefined ? params.shopGrantAmountPerFlat : 350000}
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            updateParam('shopGrantAmountPerFlat', val);
                            if (onCalculate) onCalculate();
                          }}
                          className="w-full text-xs px-1.5 py-0.5 rounded border border-slate-200 font-mono font-bold text-right text-emerald-800 bg-white"
                        />
                        <span className="text-[9px] text-slate-400 font-mono">TL</span>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200/70">
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"></div>
                        <span className="text-[10px] font-bold text-slate-600">Dükkan Kredi:</span>
                        <input
                          type="number"
                          step="50000"
                          min="0"
                          value={params.shopCreditAmountPerFlat !== undefined ? params.shopCreditAmountPerFlat : 350000}
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            updateParam('shopCreditAmountPerFlat', val);
                            if (onCalculate) onCalculate();
                          }}
                          className="w-full text-xs px-1.5 py-0.5 rounded border border-slate-200 font-mono font-bold text-right text-sky-800 bg-white"
                        />
                        <span className="text-[9px] text-slate-400 font-mono">TL</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* HAK SAHİPLERİ BRÜT M² CANLI DENETİM & UYARI PANELI */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  areaAudit.isOverTotal || areaAudit.zeroOrMissingFlats.length > 0
                    ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                    : areaAudit.isHealthy
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50/50 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-indigo-600" />
                        Hak Sahipleri Brüt m² Canlı Denetimi & Metraj Dengesi
                      </span>
                      {areaAudit.isOverTotal ? (
                        <span className="text-[10px] bg-rose-600 text-white font-bold px-2.5 py-0.5 rounded-full shadow-2xs flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Kritik: Toplam Alan Aşıldı
                        </span>
                      ) : areaAudit.zeroOrMissingFlats.length > 0 ? (
                        <span className="text-[10px] bg-amber-600 text-white font-bold px-2.5 py-0.5 rounded-full shadow-2xs flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {areaAudit.zeroOrMissingFlats.length} Dairenin m² Bilgisi Eksik
                        </span>
                      ) : areaAudit.isHealthy ? (
                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-2.5 py-0.5 rounded-full shadow-2xs flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Canlı Metraj Dengeli & Uygun
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-500 text-white font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                          Metraj İnceleniyor
                        </span>
                      )}
                    </div>

                    {/* Metraj Açıklama ve Uyarı Metni */}
                    <p className="text-[11px] text-slate-600">
                      {areaAudit.isOverTotal ? (
                        <span className="text-rose-700 font-semibold">
                          🚨 Dikkat: Dairelerin brüt alanları toplamı ({areaAudit.totalFlatsArea.toFixed(1)} m²), projenin toplam inşaat alanından ({areaAudit.totalConstructionArea.toFixed(1)} m²) {Math.abs(areaAudit.difference).toFixed(1)} m² daha fazla! Lütfen bağımsız bölüm m² ölçülerini güncelleyin.
                        </span>
                      ) : areaAudit.zeroOrMissingFlats.length > 0 ? (
                        <span className="text-amber-800 font-semibold">
                          ⚠️ {areaAudit.zeroOrMissingFlats.map((f) => `No ${f.id}`).join(', ')} numaralı bölümlerin m² alanı 0 veya girilmemiş. Hesaplamaların sıhhati için lütfen alanları tamamlayın.
                        </span>
                      ) : (
                        <span>
                          Bağımsız bölümler toplamı: <strong>{areaAudit.totalFlatsArea.toLocaleString('tr-TR')} m²</strong> | Bina ortak alan payı: <strong>{areaAudit.commonArea.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m² (%{areaAudit.commonAreaRatio.toFixed(1)})</strong> | Ortalama daire: <strong>{areaAudit.averageFlatArea.toFixed(1)} m²</strong>
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Hızlı Dengeleme ve Metraj Özet Rozetleri */}
                  <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
                    <div className="flex items-center gap-2 text-xs font-mono bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-slate-500 text-[10px]">Toplam Bağımsız:</span>
                      <strong className="text-slate-900">{areaAudit.totalFlatsArea.toLocaleString('tr-TR')} m²</strong>
                    </div>

                    {(areaAudit.isOverTotal || areaAudit.zeroOrMissingFlats.length > 0) && (
                      <button
                        type="button"
                        onClick={handleAutoBalanceAreas}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                        title="Tüm daire metrajlarını mimari inşaat alanına göre oransal dengele"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Metrajları Otomatik Dengele</span>
                      </button>
                    )}
                  </div>
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
                      Hibe/Kredi Desteği:{' '}
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
                      <th className="p-3 w-24 text-center">Bölüm Tipi</th>
                      <th className="p-3 min-w-[150px]">Hak Sahibi Adı Soyadı</th>
                      <th className="p-3 w-24">T.C. Kimlik</th>
                      <th className="p-3 w-20 text-right">Brüt (m²)</th>
                      {params.enableSerefiye && (
                        <th className="p-3 w-24 text-center">Şerefiye</th>
                      )}
                      {params.enableLandShareBalancing && (
                        <th className="p-3 w-24 text-center">Arsa Payı (KMK)</th>
                      )}
                      <th className="p-3 w-28 text-right">Peşinat (TL)</th>
                      <th className="p-3 w-20 text-center">
                        <div className="flex flex-col items-center">
                          <span>Hibe</span>
                          <span className="text-[9px] font-normal text-emerald-700 font-mono lowercase">
                            {((params.grantAmountPerFlat !== undefined ? params.grantAmountPerFlat : 700000) / 1000).toFixed(0)}k TL
                          </span>
                        </div>
                      </th>
                      <th className="p-3 w-20 text-center">
                        <div className="flex flex-col items-center">
                          <span>Kredi</span>
                          <span className="text-[9px] font-normal text-sky-700 font-mono lowercase">
                            {((params.creditAmountPerFlat !== undefined ? params.creditAmountPerFlat : 700000) / 1000).toFixed(0)}k TL
                          </span>
                        </div>
                      </th>
                      {params.projectModel === 'contractorShare' && (
                        <th className="p-3 w-20 text-center">Müteahhit</th>
                      )}
                      <th className="p-3 w-28 text-right text-slate-800">İmalat Bedeli</th>
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
                          colSpan={
                            8 +
                            (params.enableSerefiye ? 1 : 0) +
                            (params.enableLandShareBalancing ? 2 : 0) +
                            (params.projectModel === 'contractorShare' ? 1 : 0)
                          }
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
                            {/* Daire No & Rol & Kat */}
                            <td className="p-2 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-slate-900 font-mono text-xs">
                                  No {flat.id}
                                </span>
                                <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                  {flat.floorNumber === 0
                                    ? 'Zemin Kat'
                                    : flat.flatType === 'mansard'
                                    ? `${flat.floorNumber || params.floorCount}. Kat (Mansart)`
                                    : `${flat.floorNumber !== undefined ? flat.floorNumber : (params.hasGroundFloorShop ? (originalIndex < (params.shopCount || 1) ? 'Zemin' : `${1 + Math.floor((originalIndex - (params.shopCount || 1)) / (params.flatsPerFloor || 2))}. Kat`) : `${1 + Math.floor(originalIndex / (params.flatsPerFloor || 2))}. Kat`)}`}
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

                            {/* Bölüm Tipi Seçimi */}
                            <td className="p-2 text-center">
                              <select
                                value={flat.flatType || 'standard'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === 'mansard') {
                                    handleFlatChange(originalIndex, {
                                      flatType: 'mansard',
                                      floorNumber: Math.max(1, params.floorCount || 1),
                                      description: `En Üst Kat (${params.floorCount}. Kat) Mansart`,
                                    });
                                  } else {
                                    handleFlatChange(originalIndex, 'flatType', val);
                                  }
                                }}
                                className={`text-[10px] px-1.5 py-1.5 rounded border font-bold ${
                                  flat.flatType === 'shop' ? 'bg-amber-50 border-amber-300 text-amber-800' : inputBg
                                } w-28 text-center`}
                              >
                                <option value="standard">🏠 Konut</option>
                                <option value="shop">🏪 Dükkan</option>
                                <option value="mansard">🏚️ Mansart (En Üst)</option>
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

                            {/* Şerefiye Çarpanı (Inline Input & Badge) - Sadece Şerefiye Seçeneği Açıkken */}
                            {params.enableSerefiye && (
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
                                    className="w-16 text-xs px-1 py-1 rounded-lg border font-mono text-center font-bold bg-amber-50/60 border-amber-300 text-amber-950"
                                  />
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
                                </div>
                              </td>
                            )}

                            {/* Arsa Payı (KMK Hisse / Payda) - Sadece Arsa Payı Dengeleme Açıkken */}
                            {params.enableLandShareBalancing && (
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
                                    className="w-12 text-xs px-1 py-1 rounded-lg border text-center font-bold bg-emerald-50/60 border-emerald-300 text-emerald-950"
                                  />
                                  <span className="text-[10px] text-slate-400">
                                    /{flat.landShareDenominator || params.totalLandShareDenominator || 1000}
                                  </span>
                                </div>
                              </td>
                            )}

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

                            {/* Hibe Checkbox & Mahsup Tutarı */}
                            <td className="p-2 text-center">
                              <label className="inline-flex flex-col items-center justify-center cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={flat.useGrant !== undefined ? flat.useGrant : (flat.useTransformationCredit ?? false)}
                                  onChange={(e) => handleToggleFlatGrant(originalIndex, e.target.checked)}
                                  disabled={isContractor}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 disabled:opacity-40 cursor-pointer"
                                />
                                {calc && (calc.usedGrant || 0) > 0 ? (
                                  <span className="text-[9px] font-mono font-bold text-emerald-700 mt-0.5 whitespace-nowrap">
                                    -{(calc.usedGrant || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-slate-300 mt-0.5">-</span>
                                )}
                              </label>
                            </td>

                            {/* Kredi Checkbox & Mahsup Tutarı */}
                            <td className="p-2 text-center">
                              <label className="inline-flex flex-col items-center justify-center cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={!!flat.useCredit}
                                  onChange={(e) => handleToggleFlatCredit(originalIndex, e.target.checked)}
                                  disabled={isContractor}
                                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 disabled:opacity-40 cursor-pointer"
                                />
                                {calc && (calc.usedCredit || 0) > 0 ? (
                                  <span className="text-[9px] font-mono font-bold text-sky-700 mt-0.5 whitespace-nowrap">
                                    -{(calc.usedCredit || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-slate-300 mt-0.5">-</span>
                                )}
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

                            {/* İmalat Bedeli */}
                            <td className="p-2 text-right font-mono text-slate-800 font-semibold">
                              {calc ? (
                                <div>
                                  <div className="text-slate-900 font-bold">
                                    {calc.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-normal">
                                    {(calc.unitPrice || results.grossCostPerSqM).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²
                                  </div>
                                </div>
                              ) : '-'}
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
                              isContractor ? 'bg-amber-500' : flat.flatType === 'shop' ? 'bg-amber-600' : 'bg-indigo-500'
                            }`}
                          />
                          <span className="font-extrabold">
                            {flat.flatType === 'shop' ? `🏪 Dükkan ${flat.id}` : `Daire ${flat.id}`}
                          </span>
                          <span className="text-[10px] text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {flat.floorNumber === 0
                              ? 'Zemin Kat'
                              : flat.flatType === 'mansard'
                              ? `${flat.floorNumber || params.floorCount}. Kat (Mansart)`
                              : `${flat.floorNumber !== undefined ? flat.floorNumber : (params.hasGroundFloorShop ? (originalIndex < (params.shopCount || 1) ? 'Zemin' : `${1 + Math.floor((originalIndex - (params.shopCount || 1)) / (params.flatsPerFloor || 2))}. Kat`) : `${1 + Math.floor(originalIndex / (params.flatsPerFloor || 2))}. Kat`)}`}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              isContractor
                                ? 'bg-amber-100 text-amber-800'
                                : flat.flatType === 'shop'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {isContractor ? 'Müteahhit' : flat.flatType === 'shop' ? 'Zemin Dükkan' : 'Hak Sahibi'}
                          </span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] bg-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded-full border border-slate-300/50">
                            {flat.area} m²
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedFlatId(flat.id)}
                            className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-200 transition-all cursor-pointer"
                            title="Uçan Panelde Aç"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Uçan Panel</span>
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

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Bağımsız Bölüm Tipi:
                        </label>
                        <select
                          value={flat.flatType || 'standard'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'mansard') {
                              handleFlatChange(originalIndex, {
                                flatType: 'mansard',
                                floorNumber: Math.max(1, params.floorCount || 1),
                                description: `En Üst Kat (${params.floorCount}. Kat) Mansart`,
                              });
                            } else {
                              handleFlatChange(originalIndex, 'flatType', val);
                            }
                          }}
                          className={`w-full text-xs px-3 py-1.5 rounded-xl border font-bold ${
                            flat.flatType === 'shop' ? 'bg-amber-50 border-amber-300 text-amber-800' : inputBg
                          }`}
                        >
                          <option value="standard">🏠 Konut (Daire)</option>
                          <option value="shop">🏪 Ticari (Dükkan/Mağaza)</option>
                          <option value="mansard">
                            {flat.floorNumber === params.floorCount ? '🏚️ Mansart (En Üst Kat)' : '🏚️ Mansart (En Üst Kata Taşınır)'}
                          </option>
                          <option value="duplex">🏘️ Çatı Dubleksi</option>
                        </select>
                      </div>

                      {/* Şerefiye & Arsa Payı (Yalnızca seçenekler aktifken görünür) */}
                      {(params.enableSerefiye || params.enableLandShareBalancing) && (
                        <div className="grid grid-cols-2 gap-2">
                          {params.enableSerefiye ? (
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
                                className="w-full text-xs px-2.5 py-1.5 rounded-xl border font-mono bg-amber-50/50 border-amber-300 font-bold"
                              />
                            </div>
                          ) : <div />}

                          {params.enableLandShareBalancing ? (
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
                                  className="w-full text-xs px-2.5 py-1.5 rounded-xl border font-mono text-center bg-emerald-50/50 border-emerald-300 font-bold"
                                />
                                <span className="text-[10px] text-slate-400 font-mono">
                                  /{flat.landShareDenominator || params.totalLandShareDenominator || 1000}
                                </span>
                              </div>
                            </div>
                          ) : <div />}
                        </div>
                      )}

                      {/* Peşinat & Destekler (Ödeme Önceliği: 1. Peşinat -> 2. Hibe -> 3. Kredi) */}
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              1. Öncelik: Peşinat (TL):
                            </label>
                          </div>
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
                            className={`w-full text-xs px-3 py-1.5 rounded-xl border font-mono font-bold text-indigo-700 ${inputBg}`}
                            disabled={isContractor}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {/* Hibe */}
                          {(() => {
                            const isShop = flat.flatType === 'shop';
                            const applicableGrant = isShop
                              ? (params.shopGrantAmountPerFlat !== undefined ? params.shopGrantAmountPerFlat : 350000)
                              : (params.grantAmountPerFlat !== undefined ? params.grantAmountPerFlat : 700000);
                            const applicableCredit = isShop
                              ? (params.shopCreditAmountPerFlat !== undefined ? params.shopCreditAmountPerFlat : 350000)
                              : (params.creditAmountPerFlat !== undefined ? params.creditAmountPerFlat : 700000);

                            return (
                              <>
                                <div className="p-2 rounded-xl bg-emerald-50/40 border border-emerald-200">
                                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-900 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={flat.useGrant !== undefined ? flat.useGrant : (flat.useTransformationCredit ?? false)}
                                      onChange={(e) => handleToggleFlatGrant(originalIndex, e.target.checked)}
                                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                                      disabled={isContractor}
                                    />
                                    <span>2. Hibe ({(applicableGrant / 1000).toFixed(0)}k TL)</span>
                                  </label>
                                  {calc && (calc.usedGrant || 0) > 0 && (
                                    <div className="text-[9px] font-mono font-bold text-emerald-700 mt-1">
                                      Mahsup: -{(calc.usedGrant || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                                    </div>
                                  )}
                                </div>

                                {/* Kredi */}
                                <div className="p-2 rounded-xl bg-sky-50/40 border border-sky-200">
                                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-sky-900 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={!!flat.useCredit}
                                      onChange={(e) => handleToggleFlatCredit(originalIndex, e.target.checked)}
                                      className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5 cursor-pointer"
                                      disabled={isContractor}
                                    />
                                    <span>3. Kredi ({(applicableCredit / 1000).toFixed(0)}k TL)</span>
                                  </label>
                                  {calc && (calc.usedCredit || 0) > 0 && (
                                    <div className="text-[9px] font-mono font-bold text-sky-700 mt-1">
                                      Mahsup: -{(calc.usedCredit || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                                    </div>
                                  )}
                                </div>
                              </>
                            );
                          })()}
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

      {/* 5. ÇIKTILAR & DAIRE HAKEDİŞ HESAP TABLOSU */}
      <div className={`p-6 rounded-3xl border ${cardBg} shadow-sm space-y-6`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <Building className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                📊 Hak Sahipleri Ödeme Çıktıları & Hakediş Tablosu
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Daire bazlı brüt alan maliyeti, peşinat mahsubu, kentsel dönüşüm yardımı ve net kalan borç listesi. Detaylı uçan panel ve takvim için daire satırına tıklayın.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV İndir</span>
            </button>
          </div>
        </div>

        {/* Tam Genişlik Liste Tablosu */}
        <div className="overflow-x-auto border border-slate-200/80 rounded-2xl max-h-[550px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider z-10">
              <tr>
                <th className="p-3">Daire No</th>
                <th className="p-3">Tip</th>
                <th className="p-3">Hak Sahibi / Durum</th>
                <th className="p-3 text-right">Brüt Alan</th>
                <th className="p-3 text-right">İmalat Bedeli</th>
                <th className="p-3 text-right text-indigo-700">1. Peşinat</th>
                <th className="p-3 text-right text-emerald-700">2. Hibe</th>
                <th className="p-3 text-right text-sky-700">3. Kredi</th>
                <th className="p-3 text-right text-slate-900">Kalan Net Borç</th>
                <th className="p-3 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {results.flatResults?.map((flat) => {
                const flatItem = params.flats.find((f) => f.id === flat.id);
                const isSelected = selectedFlatId === flat.id;
                const isShop = flatItem?.flatType === 'shop' || flat.flatType === 'shop';

                return (
                  <tr
                    key={flat.id}
                    onClick={() => setSelectedFlatId(flat.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/80 hover:bg-indigo-100/60'
                        : flat.isContractorShare
                        ? 'bg-amber-50/20 hover:bg-amber-50/40 text-slate-500'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="p-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        <span>No {flat.id}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isShop
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : flat.flatType === 'duplex'
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {isShop ? '🏪 Dükkan' : flat.flatType === 'duplex' ? '🏘️ Dubleks' : flat.flatType === 'mansard' ? '🏚️ Mansart' : '🏠 Konut'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800">
                        {flat.isContractorShare ? (
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Müteahhit Payı
                          </span>
                        ) : (
                          flat.name || 'İsimsiz Malik'
                        )}
                      </div>
                      {!flat.isContractorShare && (
                        <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
                          TC: {flat.tc || '-'}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700 font-bold">
                      {flat.area} m²
                    </td>
                    <td className="p-3 text-right font-mono text-slate-900">
                      {flat.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 text-right font-mono text-indigo-700 font-bold">
                      {flat.downPayment > 0 ? `${flat.downPayment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL` : '-'}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-700 font-bold">
                      {(flat.usedGrant || 0) > 0 ? `${(flat.usedGrant || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL` : '-'}
                    </td>
                    <td className="p-3 text-right font-mono text-sky-700 font-bold">
                      {(flat.usedCredit || 0) > 0 ? `${(flat.usedCredit || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL` : '-'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold">
                      <span
                        className={`px-2 py-1 rounded-lg ${
                          flat.isContractorShare
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : flat.netRemainingDebt <= 0
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        {flat.isContractorShare
                          ? 'Müteahhit Uhdesi'
                          : flat.netRemainingDebt <= 0
                          ? '0 TL (Borçsuz)'
                          : `${flat.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL`}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFlatId(flat.id);
                        }}
                        className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all cursor-pointer shadow-2xs"
                        title="Uçan Panelde Detayları Aç"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* UÇAN PANEL (MALİK DETAY VE ÖDEME TAKVİMİ SLIDE-OVER DRAWER) */}
      {selectedFlatId !== null && selectedFlatResult && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
          {/* Karartma ve Blur Katmanı */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedFlatId(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-xl w-full bg-white shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200">
            {/* Panel Üst Başlığı */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold tracking-wide">
                      Bağımsız Bölüm No: {selectedFlatResult.id}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedFlatResult.isContractorShare
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                          : 'bg-indigo-400/20 text-indigo-300 border border-indigo-400/30'
                      }`}
                    >
                      {selectedFlatResult.isContractorShare ? 'Müteahhit Payı' : 'Kat Maliki'}
                    </span>
                    <span className="text-[10px] bg-white/10 text-slate-200 font-mono px-2 py-0.5 rounded-full border border-white/10">
                      {selectedFlatResult.area} m² Brüt
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 truncate max-w-sm">
                    {selectedFlatResult.name || 'Hak Sahibi İsimsiz'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenReport(selectedFlatResult.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                  title="Resmi A4 Taahhütname Yazdır / PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>A4 Rapor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFlatId(null)}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                  title="Paneli Kapat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Panel Gövdesi (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50">
              {(() => {
                const flatIndex = params.flats.findIndex((f) => f.id === selectedFlatId);
                const currentFlat = params.flats[flatIndex] || selectedFlatResult;
                const isShop = currentFlat.flatType === 'shop';
                const applicableGrant = isShop
                  ? (params.shopGrantAmountPerFlat !== undefined ? params.shopGrantAmountPerFlat : 350000)
                  : (params.grantAmountPerFlat !== undefined ? params.grantAmountPerFlat : 700000);
                const applicableCredit = isShop
                  ? (params.shopCreditAmountPerFlat !== undefined ? params.shopCreditAmountPerFlat : 350000)
                  : (params.creditAmountPerFlat !== undefined ? params.creditAmountPerFlat : 700000);

                return (
                  <>
                    {/* 1. Canlı Malik ve Bölüm Bilgileri */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                          Malik & Bağımsız Bölüm Bilgileri
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Daire #{currentFlat.id}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Hak Sahibi Adı Soyadı:
                          </label>
                          <input
                            type="text"
                            value={currentFlat.name || ''}
                            onChange={(e) => handleFlatChange(flatIndex, 'name', e.target.value)}
                            className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 font-bold text-slate-800"
                            placeholder="Malik Adı Soyadı"
                            disabled={selectedFlatResult.isContractorShare}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            T.C. Kimlik No:
                          </label>
                          <input
                            type="text"
                            maxLength={11}
                            value={currentFlat.tc || ''}
                            onChange={(e) => handleFlatChange(flatIndex, 'tc', e.target.value)}
                            className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 font-mono font-bold text-slate-800"
                            placeholder="11 Haneli TC"
                            disabled={selectedFlatResult.isContractorShare}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Brüt Alan (m²):
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const flatsPerFloor = Math.max(1, params.flatsPerFloor || 2);
                                const footprintCalc = calculateFootprint(params.footprintInputMode, params);
                                const baseArea = footprintCalc.area;
                                const cantileverInfo = calculateCantileverDetails(params, baseArea, footprintCalc);
                                const upperFloorArea = cantileverInfo.upperFloorArea;
                                const roofType = params.roofType || 'gable';
                                const roofAtticArea = roofType === 'mansard' ? Math.round(upperFloorArea * 0.70 * 100) / 100 : 0;
                                let equalVal = parseFloat((upperFloorArea / flatsPerFloor).toFixed(2));
                                if (currentFlat.flatType === 'shop') {
                                  const shopCount = Math.max(1, params.shopCount || 1);
                                  equalVal = parseFloat((baseArea / shopCount).toFixed(2));
                                } else if (currentFlat.flatType === 'mansard') {
                                  const mansardFlats = params.flats.filter(f => f.flatType === 'mansard');
                                  const mCount = mansardFlats.length > 0 ? mansardFlats.length : (params.mansardFlatCount || flatsPerFloor);
                                  equalVal = mCount > 0 && roofAtticArea > 0 ? parseFloat((roofAtticArea / mCount).toFixed(2)) : parseFloat(((upperFloorArea * 0.70) / flatsPerFloor).toFixed(2));
                                }
                                handleFlatChange(flatIndex, 'area', equalVal);
                              }}
                              className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                              title="Kat alanını kattaki daire sayısına bölerek eşit payı atar"
                            >
                              <Equal className="w-2.5 h-2.5" />
                              <span>Eşit Payı Al</span>
                            </button>
                          </div>
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={currentFlat.area || ''}
                            onChange={(e) =>
                              handleFlatChange(
                                flatIndex,
                                'area',
                                Math.max(1, parseFloat(e.target.value) || 0)
                              )
                            }
                            className={`w-full text-xs px-3 py-2 rounded-xl border font-mono font-bold ${
                              !currentFlat.area || currentFlat.area <= 0
                                ? 'bg-rose-50 border-rose-300 text-rose-800'
                                : 'bg-slate-50 focus:bg-white border-slate-200 text-slate-800'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Bağımsız Bölüm Tipi:
                          </label>
                          <select
                            value={currentFlat.flatType || 'standard'}
                            onChange={(e) => {
                              const val = e.target.value as FlatItem['flatType'];
                              if (val === 'mansard') {
                                handleFlatChange(flatIndex, {
                                  flatType: 'mansard',
                                  floorNumber: Math.max(1, params.floorCount || 1),
                                  description: `En Üst Kat (${params.floorCount}. Kat) Mansart`,
                                });
                              } else {
                                handleFlatChange(flatIndex, 'flatType', val);
                              }
                            }}
                            className={`w-full text-xs px-3 py-2 rounded-xl border font-bold ${
                              isShop ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <option value="standard">🏠 Konut (Daire)</option>
                            <option value="shop">🏪 Ticari (Dükkan/Mağaza)</option>
                            <option value="mansard">
                              {currentFlat.floorNumber === params.floorCount ? '🏚️ Mansart Katı (En Üst Kat)' : '🏚️ Mansart Katı (En Üst Kata Taşınır)'}
                            </option>
                            <option value="duplex">🏘️ Çatı Dubleksi</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Bulunduğu Kat:
                          </label>
                          {currentFlat.flatType === 'mansard' ? (
                            <div className="w-full text-xs px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50/80 text-indigo-900 font-bold flex items-center justify-between">
                              <span>{params.floorCount}. Kat (En Üst Kat - Çatı)</span>
                              <span className="text-[9px] bg-indigo-200/70 text-indigo-800 px-1.5 py-0.5 rounded font-semibold">
                                Mansart Kuralı
                              </span>
                            </div>
                          ) : (
                            <select
                              value={currentFlat.floorNumber !== undefined ? currentFlat.floorNumber : (params.hasGroundFloorShop ? (flatIndex < (params.shopCount || 1) ? 0 : 1 + Math.floor((flatIndex - (params.shopCount || 1)) / (params.flatsPerFloor || 2))) : 1 + Math.floor(flatIndex / (params.flatsPerFloor || 2)))}
                              onChange={(e) => handleFlatChange(flatIndex, 'floorNumber', parseInt(e.target.value, 10))}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-bold"
                            >
                              {params.hasGroundFloorShop && (
                                <option value={0}>Zemin Kat (Dükkan/Ticari)</option>
                              )}
                              {Array.from({ length: params.floorCount }, (_, i) => i + 1).map((f) => (
                                <option key={f} value={f}>
                                  {f}. Kat {f === params.floorCount ? '(En Üst Kat)' : ''}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Şerefiye ve Arsa Payı (Açıksa) */}
                      {(params.enableSerefiye || params.enableLandShareBalancing) && (
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                          {params.enableSerefiye && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  Şerefiye Çarpanı:
                                </label>
                                <span className="text-[9px] font-mono font-bold text-amber-700">
                                  {Math.round(((currentFlat.serefiyeMultiplier || 1.0) - 1.0) * 100) > 0
                                    ? `+${Math.round(((currentFlat.serefiyeMultiplier || 1.0) - 1.0) * 100)}%`
                                    : `${Math.round(((currentFlat.serefiyeMultiplier || 1.0) - 1.0) * 100)}%`}
                                </span>
                              </div>
                              <input
                                type="number"
                                step="0.01"
                                min="0.5"
                                max="2.5"
                                value={currentFlat.serefiyeMultiplier !== undefined ? currentFlat.serefiyeMultiplier : 1.0}
                                onChange={(e) =>
                                  handleFlatChange(
                                    flatIndex,
                                    'serefiyeMultiplier',
                                    Math.max(0.5, parseFloat(e.target.value) || 1.0)
                                  )
                                }
                                className="w-full text-xs px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50/50 font-mono font-bold"
                              />
                            </div>
                          )}

                          {params.enableLandShareBalancing && (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Arsa Payı (Hisse / Payda):
                              </label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={currentFlat.landShareNumerator !== undefined ? currentFlat.landShareNumerator : ''}
                                  onChange={(e) =>
                                    handleFlatChange(
                                      flatIndex,
                                      'landShareNumerator',
                                      Math.max(0, parseInt(e.target.value) || 0)
                                    )
                                  }
                                  placeholder="0"
                                  className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50/50 font-mono font-bold text-center"
                                />
                                <span className="text-[10px] text-slate-400 font-mono">
                                  /{currentFlat.landShareDenominator || params.totalLandShareDenominator || 1000}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 2. Fiziki Mimari Metraj Dağılımı */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          Fiziki Metraj Dağılımı
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Net / Brüt Oranı: %{((selectedFlatResult.netArea / Math.max(1, selectedFlatResult.totalGrossArea)) * 100).toFixed(0)}</span>
                      </div>

                      <div className="space-y-1.5 text-[11px] pt-1">
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
                          <strong className="font-mono text-slate-800">
                            {selectedFlatResult.balconyAreaShare > 0 ? `${selectedFlatResult.balconyAreaShare} m²` : 'Yok'}
                          </strong>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-dashed border-slate-200 font-bold text-slate-900 text-xs">
                          <span>Genel Toplam Brüt Alan:</span>
                          <strong className="font-mono text-indigo-900">{selectedFlatResult.totalGrossArea} m²</strong>
                        </div>
                      </div>
                    </div>

                    {/* 3. Ödeme Önceliği & Destek Mahsubu (1. Peşinat -> 2. Hibe -> 3. Kredi) */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                          3 Aşamalı Ödeme Önceliği & Mahsup
                        </span>
                        <span className="text-[9px] bg-indigo-50 text-indigo-800 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                          1. Peşinat → 2. Hibe → 3. Kredi
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                          <span className="text-slate-600 font-semibold">Toplam İnşaat Katkı Payı:</span>
                          <strong className="font-mono text-sm text-slate-900">
                            {selectedFlatResult.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                          </strong>
                        </div>

                        {/* 1. Öncelik: Peşinat */}
                        <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-200/80 space-y-1.5">
                          <label className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                            1. Öncelik: Peşinat Tutarı (TL):
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="5000"
                              min="0"
                              value={currentFlat.downPayment || ''}
                              onChange={(e) =>
                                handleFlatChange(
                                  flatIndex,
                                  'downPayment',
                                  Math.max(0, parseFloat(e.target.value) || 0)
                                )
                              }
                              className="w-full text-xs px-3 py-1.5 rounded-lg border border-indigo-300 bg-white font-mono font-bold text-indigo-800"
                              disabled={selectedFlatResult.isContractorShare}
                              placeholder="0 TL"
                            />
                            <span className="text-xs font-mono font-bold text-indigo-700 whitespace-nowrap">
                              -{selectedFlatResult.downPayment.toLocaleString('tr-TR')} TL
                            </span>
                          </div>
                        </div>

                        {/* 2. Öncelik: Hibe & 3. Öncelik: Kredi */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* 2. Hibe */}
                          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-1.5">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-950 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={currentFlat.useGrant !== undefined ? currentFlat.useGrant : (currentFlat.useTransformationCredit ?? false)}
                                onChange={(e) => handleToggleFlatGrant(flatIndex, e.target.checked)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                disabled={selectedFlatResult.isContractorShare}
                              />
                              <span>2. Hibe ({(applicableGrant / 1000).toFixed(0)}k TL)</span>
                            </label>
                            {(selectedFlatResult.usedGrant || 0) > 0 ? (
                              <div className="text-[10px] font-mono font-bold text-emerald-800 pt-1 border-t border-emerald-200/60">
                                Mahsup: -{(selectedFlatResult.usedGrant || 0).toLocaleString('tr-TR')} TL
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 font-mono pt-1">Uygulanmadı</div>
                            )}
                          </div>

                          {/* 3. Kredi */}
                          <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-200 space-y-1.5">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-sky-950 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={!!currentFlat.useCredit}
                                onChange={(e) => handleToggleFlatCredit(flatIndex, e.target.checked)}
                                className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                                disabled={selectedFlatResult.isContractorShare}
                              />
                              <span>3. Kredi ({(applicableCredit / 1000).toFixed(0)}k TL)</span>
                            </label>
                            {(selectedFlatResult.usedCredit || 0) > 0 ? (
                              <div className="text-[10px] font-mono font-bold text-sky-800 pt-1 border-t border-sky-200/60">
                                Mahsup: -{(selectedFlatResult.usedCredit || 0).toLocaleString('tr-TR')} TL
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 font-mono pt-1">Uygulanmadı</div>
                            )}
                          </div>
                        </div>

                        {/* Net Kalan Borç Kutusu */}
                        <div
                          className={`p-3 rounded-xl border flex items-center justify-between ${
                            selectedFlatResult.netRemainingDebt <= 0
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                              : 'bg-slate-900 text-white border-slate-800'
                          }`}
                        >
                          <span className="text-xs font-bold uppercase tracking-wider">
                            Kalan Net Borç (Taksit):
                          </span>
                          <span className="font-mono text-base font-bold">
                            {selectedFlatResult.netRemainingDebt <= 0
                              ? 'Tamamı Karşılandı'
                              : `${selectedFlatResult.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 4. Bireysel Taksit & Hakediş Takvimi */}
                    {selectedFlatResult.netRemainingDebt > 0 && (
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                            {params.paymentPlanType === 'installments'
                              ? `Aylık Eşit Taksit Takvimi (${params.installmentCount || 12} Ay)`
                              : params.paymentPlanType === 'hybrid'
                              ? 'Karma Ödeme Takvimi'
                              : '5 Aşamalı İnşaat Hakediş Takvimi'}
                          </span>
                        </div>

                        {params.paymentPlanType === 'installments' ? (
                          <div className="space-y-1.5 font-mono text-[11px]">
                            {Array.from({ length: Math.min(12, params.installmentCount || 12) }).map((_, idx) => (
                              <div key={idx} className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-700">
                                <span>{idx + 1}. Ay Taksiti:</span>
                                <strong className="text-emerald-800 font-bold">
                                  {selectedFlatResult.monthlyInstallment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                                </strong>
                              </div>
                            ))}
                          </div>
                        ) : params.paymentPlanType === 'hybrid' ? (
                          <div className="space-y-1.5 font-mono text-[11px]">
                            <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-700">
                              <span>1. Ara Ödeme (%25 Kaba):</span>
                              <strong className="text-indigo-900">
                                {Math.round(selectedFlatResult.netRemainingDebt * 0.25).toLocaleString('tr-TR')} TL
                              </strong>
                            </div>
                            <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-700">
                              <span>2. Ara Ödeme (%15 İskân):</span>
                              <strong className="text-purple-900">
                                {Math.round(selectedFlatResult.netRemainingDebt * 0.15).toLocaleString('tr-TR')} TL
                              </strong>
                            </div>
                            <div className="flex justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 font-bold">
                              <span>Aylık Taksit ({params.installmentCount || 12} Ay):</span>
                              <span>
                                {Math.round(
                                  (selectedFlatResult.netRemainingDebt * 0.6) / Math.max(1, params.installmentCount || 12)
                                ).toLocaleString('tr-TR')}{' '}
                                TL / Ay
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5 font-mono text-[11px]">
                            <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-700">
                              <span>Aşama 1 (Sözleşme - %{params.stage1Pay}):</span>
                              <strong className="text-slate-900">
                                {selectedFlatResult.stagePayments[0].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                              </strong>
                            </div>
                            <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-700">
                              <span>Aşama 2 (Temel - %{params.stage2Pay}):</span>
                              <strong className="text-slate-900">
                                {selectedFlatResult.stagePayments[1].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                              </strong>
                            </div>
                            <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-700">
                              <span>Aşama 3 (Kaba - %{params.stage3Pay}):</span>
                              <strong className="text-slate-900">
                                {selectedFlatResult.stagePayments[2].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                              </strong>
                            </div>
                            <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-700">
                              <span>Aşama 4 (İnce - %{params.stage4Pay}):</span>
                              <strong className="text-slate-900">
                                {selectedFlatResult.stagePayments[3].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                              </strong>
                            </div>
                            <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-700">
                              <span>Aşama 5 (Anahtar - %{params.stage5Pay}):</span>
                              <strong className="text-slate-900">
                                {selectedFlatResult.stagePayments[4].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                              </strong>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Panel Alt Eylemler (Sticky Footer) */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 shadow-lg">
              <button
                type="button"
                onClick={() => setSelectedFlatId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Kapat
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenReport(selectedFlatResult.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Resmi Taahhütname</span>
                </button>

                {onCalculate && (
                  <button
                    type="button"
                    onClick={onCalculate}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Değişiklikleri Kaydet</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
