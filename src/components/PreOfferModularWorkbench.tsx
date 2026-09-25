import React, { useState, useRef } from 'react';
import {
  Building2,
  ShieldCheck,
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  Sparkles,
  BadgePercent,
  TrendingUp,
  Receipt,
  Upload,
  Trash2,
  Plus,
  Home,
  Sliders,
  Settings2,
  Calculator,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Minus,
  X,
  MessageSquare,
  Copy,
  RotateCcw,
  SlidersHorizontal,
  Flame,
  Droplets,
  Wind,
  Fan,
  Lock,
  Layers,
  Sparkles as SparkleIcon,
  Check,
  Info,
} from 'lucide-react';
import { ProjectParams, CalculationResult, CompanyProfile } from '../types';
import { computeDualOffer, DUAL_OFFER_NAMING_PRESETS } from '../utils/dualOfferUtils';

interface PreOfferModularWorkbenchProps {
  params: ProjectParams;
  results: CalculationResult;
  profile: CompanyProfile | null;
  onUpdateParam?: (key: keyof ProjectParams, val: any) => void;
  onUpdateAllParams?: (newParams: Partial<ProjectParams>) => void;
  uploadedImages: Array<{ id: string; url: string; name: string; caption: string }>;
  setUploadedImages: React.Dispatch<React.SetStateAction<Array<{ id: string; url: string; name: string; caption: string }>>>;
  onNavigateToPreview: () => void;
  onOpenWhatsApp: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
  onOpenUnitConfig: () => void;
}

export const PreOfferModularWorkbench: React.FC<PreOfferModularWorkbenchProps> = ({
  params,
  results,
  profile,
  onUpdateParam,
  onUpdateAllParams,
  uploadedImages,
  setUploadedImages,
  onNavigateToPreview,
  onOpenWhatsApp,
  onExportPdf,
  onPrint,
  onOpenUnitConfig,
}) => {
  // Module collapse state for 8 workbench modules
  const [openModules, setOpenModules] = useState<{ [key: string]: boolean }>({
    m1_identity: true,
    m2_pricing: true,
    m3_inflation: true,
    m4_payment: true,
    m5_package: true,
    m6_clauses: true,
    m7_media: true,
    m8_layout: true,
  });

  const toggleModule = (modKey: string) => {
    setOpenModules((prev) => ({ ...prev, [modKey]: !prev[modKey] }));
  };

  const expandAllModules = () => {
    setOpenModules({
      m1_identity: true,
      m2_pricing: true,
      m3_inflation: true,
      m4_payment: true,
      m5_package: true,
      m6_clauses: true,
      m7_media: true,
      m8_layout: true,
    });
  };

  const collapseAllModules = () => {
    setOpenModules({
      m1_identity: false,
      m2_pricing: false,
      m3_inflation: false,
      m4_payment: false,
      m5_package: false,
      m6_clauses: false,
      m7_media: false,
      m8_layout: false,
    });
  };

  // Image Drag & Drop
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (files: FileList) => {
    if (uploadedImages.length >= 6) {
      alert('En fazla 6 adet görsel veya resmi evrak ekleyebilirsiniz.');
      return;
    }
    const remainingSlots = 6 - uploadedImages.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        alert(`"${file.name}" desteklenen bir görsel formatı değil.`);
        return;
      }
      if (file.size > 4 * 1024 * 1024) {
        alert(`"${file.name}" boyutu 4MB limitini aşıyor.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const resultUrl = e.target?.result;
        if (typeof resultUrl === 'string') {
          const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          setUploadedImages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              url: resultUrl,
              name: file.name,
              caption: baseName.charAt(0).toUpperCase() + baseName.slice(1),
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const dualData = computeDualOffer(params);
  const clauses = params.additionalOfferClauses || [];

  const handleAddClause = () => {
    if (onUpdateParam) {
      onUpdateParam('additionalOfferClauses', [
        ...clauses,
        '2018 Türkiye Bina Deprem Yönetmeliği standartlarına uygun C35/45 beton ve B420C nervürlü demir kullanılacaktır.',
      ]);
    }
  };

  const handleUpdateClause = (index: number, val: string) => {
    if (onUpdateParam) {
      const updated = [...clauses];
      updated[index] = val;
      onUpdateParam('additionalOfferClauses', updated);
    }
  };

  const handleRemoveClause = (index: number) => {
    if (onUpdateParam) {
      const updated = clauses.filter((_, i) => i !== index);
      onUpdateParam('additionalOfferClauses', updated);
    }
  };

  // Quick Preset Scenarios
  const applyPresetScenario = (scenario: 'owner_friendly' | 'half_grant_dual' | 'fixed_price_inflation' | 'luxury_residence') => {
    if (!onUpdateAllParams) return;

    if (scenario === 'owner_friendly') {
      onUpdateAllParams({
        profitRate: 15,
        includeProfitOwner: 'yes',
        hasInflationBuffer: true,
        inflationBufferRate: 10,
        paymentPlanType: 'installments',
        installmentCount: 12,
        offerPresentationMode: 'single',
        transformationStatus: 'currentSupport',
        showIntroPresentation: true,
        showInflationGuaranteeNotice: true,
      });
    } else if (scenario === 'half_grant_dual') {
      onUpdateAllParams({
        profitRate: 20,
        offerPresentationMode: 'dual',
        offerNamingPreset: 'standard_prestij',
        baseOfferTitle: 'Standart Deprem & Yapı Paketi',
        plusOfferTitle: 'Prestij Konfor & Akıllı Ev Paketi',
        transformationStatus: 'currentSupport',
        installmentCount: 24,
        paymentPlanType: 'installments',
        showDualOfferMatrix: true,
      });
    } else if (scenario === 'fixed_price_inflation') {
      onUpdateAllParams({
        hasInflationBuffer: true,
        inflationBufferRate: 20,
        profitRate: 15,
        showInflationGuaranteeNotice: true,
        customInflationNoticeTitle: '🛡️ TEFE/TÜFE Enflasyon Farkı Alınmaz (Kesin Sabit Fiyat)',
        customInflationNoticeText:
          'Proje boyunca inşaat girdi maliyetleri ne kadar artarsa artsın kat maliklerinden hiçbir aşamada TEFE/TÜFE veya fiyat farkı talep edilmeyecektir.',
      });
    } else if (scenario === 'luxury_residence') {
      onUpdateAllParams({
        buildingType: 'luxury',
        quality: 'premium',
        offerPresentationMode: 'dual',
        profitRate: 25,
        hasUnderfloorHeating: true,
        hasWaterFiltration: true,
        hasLinearShowerDrain: true,
        hasSmartDoorLock: true,
        hasAcOption: true,
        plusOfferFeatures: {
          underfloorHeating: true,
          waterFiltration: true,
          acOption: true,
          thermostaticShowerMixer: true,
          linearShowerDrain: true,
          bathroomHumidityFan: true,
          touchlessKitchenFaucet: true,
          smartHome: true,
        },
      });
    }
  };

  // Calculated Financial Key Metrics
  const grandTotal = results.grandTotal || 0;
  const flatCount = results.flatCount || 10;
  const perFlatAvg = Math.round(grandTotal / (flatCount || 1));
  const netDebtAvg = results.flatResults?.[0]?.netRemainingDebt || Math.round(perFlatAvg * 0.5);
  const monthlyInst =
    results.flatResults?.[0]?.monthlyInstallment ||
    Math.round(netDebtAvg / (params.installmentCount || 12));
  const profitAmount = results.profitAmount || Math.round(grandTotal * ((params.profitRate || 15) / 100));
  const inflationBufferAmount =
    results.inflationBufferAmount ||
    Math.round(grandTotal * ((params.inflationBufferRate || 15) / 100));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* WORKBENCH TOP HERO HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>Teklif Öncesi Modüler Düzenleme Workbenchi</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {params.projectName || 'Kentsel Dönüşüm Projesi'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Resmî Teklif Şartnamesi, Bütçe & Modül Yapılandırıcı
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Kat maliklerine sunulacak resmi teklifi çıktısını (PDF) almadan önce 8 bağımsız modülde anlık düzenleyin.
              Değişiklikler anında hesaplanır ve teklif dokümanına yansır.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={expandAllModules}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              ▲ Tüm Modülleri Aç
            </button>
            <button
              type="button"
              onClick={collapseAllModules}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              ▼ Tümünü Daralt
            </button>
            <button
              type="button"
              onClick={onNavigateToPreview}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>📑 Teklif PDF Önizlemesine Geç</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* LIVE METRIC SUMMARY BAR */}
        <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Toplam İmalat Bedeli</span>
            <span className="text-sm font-black text-white font-mono mt-0.5 block truncate">
              {grandTotal.toLocaleString('tr-TR')} ₺
            </span>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Daire Başı Brüt Pay</span>
            <span className="text-sm font-black text-amber-300 font-mono mt-0.5 block truncate">
              {perFlatAvg.toLocaleString('tr-TR')} ₺
            </span>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Destek Sonrası Net Borç</span>
            <span className="text-sm font-black text-emerald-400 font-mono mt-0.5 block truncate">
              {netDebtAvg.toLocaleString('tr-TR')} ₺
            </span>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Aylık Taksit ({params.installmentCount || 12} Ay)</span>
            <span className="text-sm font-black text-indigo-300 font-mono mt-0.5 block truncate">
              {monthlyInst.toLocaleString('tr-TR')} ₺/Ay
            </span>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Müteahhit Kârı (%{params.profitRate || 0})</span>
            <span className="text-sm font-black text-amber-400 font-mono mt-0.5 block truncate">
              {profitAmount.toLocaleString('tr-TR')} ₺
            </span>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">
              Risk Payı ({params.hasInflationBuffer ? `%${params.inflationBufferRate || 15}` : 'Kapalı'})
            </span>
            <span className="text-sm font-black text-indigo-200 font-mono mt-0.5 block truncate">
              {params.hasInflationBuffer ? `${inflationBufferAmount.toLocaleString('tr-TR')} ₺` : '0 ₺'}
            </span>
          </div>
        </div>

        {/* FAST PRESET SCENARIOS STRIP */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Hızlı Hazır Teklif Senaryoları:</span>
          </span>

          <button
            type="button"
            onClick={() => applyPresetScenario('owner_friendly')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            🌟 Standart Malik Dostu
          </button>

          <button
            type="button"
            onClick={() => applyPresetScenario('half_grant_dual')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            ⚡ Yarısı Bizden + Çift Paket
          </button>

          <button
            type="button"
            onClick={() => applyPresetScenario('fixed_price_inflation')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            🛡️ Sabit Fiyat Enflasyon Korumalı
          </button>

          <button
            type="button"
            onClick={() => applyPresetScenario('luxury_residence')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            💎 Lüks Rezidans Prestij Paket
          </button>
        </div>
      </div>

      {/* MODULAR GRID (8 MODULE CARDS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MODULE 1: PROJE & MİMARİ KÜNYE */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl font-black">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Modül 1: Proje & Mimarî Kimlik</h3>
                <p className="text-[11px] text-slate-500">Adres, kat sayısı, daire adedi ve teslim süresi</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleModule('m1_identity')}
              className="p-1.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {openModules.m1_identity ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {openModules.m1_identity && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Proje / Bina Adı:</label>
                <input
                  type="text"
                  value={params.projectName || ''}
                  onChange={(e) => onUpdateParam && onUpdateParam('projectName', e.target.value)}
                  placeholder="Örn: Yuvam Apartmanı Kentsel Dönüşüm Projesi"
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Proje Adresi & İlçe:</label>
                <input
                  type="text"
                  value={params.projectAddress || ''}
                  onChange={(e) => onUpdateParam && onUpdateParam('projectAddress', e.target.value)}
                  placeholder="Örn: Kadıköy Bağdat Caddesi No:12 İstanbul"
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Kat Yapısı</span>
                  <div className="text-xs font-bold text-slate-900">
                    Zemin + {params.floorCount || 5} Kat ({results.flatCount || 10} Birim)
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Zemin & Bodrum</span>
                  <div className="text-xs font-bold text-slate-900">
                    {params.hasGroundFloorShop ? `${params.shopCount || 1} Dükkan` : 'Tam Konut'} • {params.basementCount || 1} Bodrum
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onOpenUnitConfig}
                  className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Daire, Kat ve Bodrum Sayılarını Düzenle ➔</span>
                </button>
              </div>

              <div className="pt-2 space-y-1">
                <label className="text-xs font-bold text-slate-700">Anahtar Teslim İnşaat Süresi (Ay):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={params.manualMonths || 15}
                    onChange={(e) => onUpdateParam && onUpdateParam('manualMonths', Number(e.target.value))}
                    className="w-32 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 font-mono"
                  />
                  <span className="text-xs font-bold text-slate-500">Ay (Gecikme cezalı taahhüt süresi)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODULE 2: FİYATLANDIRMA & MÜTEAHHİT KÂRI */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-700 rounded-2xl font-black">
                <BadgePercent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Modül 2: Fiyatlandırma & Müteahhit Kârı</h3>
                <p className="text-[11px] text-slate-500">Kâr marjı, birim m² fiyatları ve borçlanma etkisi</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleModule('m2_pricing')}
              className="p-1.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {openModules.m2_pricing ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {openModules.m2_pricing && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-150">
              <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-800">Müteahhit Kâr Oranı (%):</label>
                  <span className="font-mono font-black text-indigo-600 text-sm">%{params.profitRate || 0}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="35"
                  step="1"
                  value={params.profitRate || 0}
                  onChange={(e) => onUpdateParam && onUpdateParam('profitRate', Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[0, 10, 15, 20, 25, 30].map((pr) => (
                    <button
                      key={pr}
                      type="button"
                      onClick={() => onUpdateParam && onUpdateParam('profitRate', pr)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        (params.profitRate || 0) === pr
                          ? 'bg-slate-900 text-white font-black shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      %{pr} {pr === 0 ? '(Maliyet)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800">
                  Kâr Oranı Kat Malikleri Borçlanmasına Yansısın mı?
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateParam && onUpdateParam('includeProfitOwner', 'yes')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      params.includeProfitOwner !== 'no'
                        ? 'bg-emerald-600 text-white font-black shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ✓ Evet (Malik Borcuna Ekle)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateParam && onUpdateParam('includeProfitOwner', 'no')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      params.includeProfitOwner === 'no'
                        ? 'bg-amber-600 text-white font-black shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ✕ Hayır (Maliyetine Yapım)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Manuel Konut m² Fiyatı:</label>
                  <input
                    type="number"
                    value={params.manualFlatUnitPrice ?? ''}
                    onChange={(e) =>
                      onUpdateParam &&
                      onUpdateParam('manualFlatUnitPrice', e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder={`Sistem: ${results.grossCostPerSqM?.toLocaleString('tr-TR')} ₺`}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Manuel Dükkan m² Fiyatı:</label>
                  <input
                    type="number"
                    value={params.manualShopUnitPrice ?? ''}
                    onChange={(e) =>
                      onUpdateParam &&
                      onUpdateParam('manualShopUnitPrice', e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder="Sistem Hesabı"
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODULE 3: ENFLASYON & TEFE/TÜFE RİSK SİGORTASI */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl font-black">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Modül 3: Enflasyon & Risk Sigortası</h3>
                <p className="text-[11px] text-slate-500">TEFE/TÜFE artış tamponu ve sabit fiyat taahhüdü</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleModule('m3_inflation')}
              className="p-1.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {openModules.m3_inflation ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {openModules.m3_inflation && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-150">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-800">TEFE/TÜFE Risk Payı Aktif mi?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!params.hasInflationBuffer}
                    onChange={(e) => onUpdateParam && onUpdateParam('hasInflationBuffer', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {params.hasInflationBuffer && (
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-800">Risk Oranı (%):</label>
                    <span className="font-mono font-black text-emerald-600">%{params.inflationBufferRate ?? 15}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={params.inflationBufferRate ?? 15}
                    onChange={(e) => onUpdateParam && onUpdateParam('inflationBufferRate', Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[5, 10, 15, 20, 25].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => onUpdateParam && onUpdateParam('inflationBufferRate', rate)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          (params.inflationBufferRate ?? 15) === rate
                            ? 'bg-emerald-600 text-white font-black'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        %{rate}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Çıktıda "Sabit Fiyat / Enflasyon Notu" Görünsün mü?
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateParam &&
                      onUpdateParam('showInflationGuaranteeNotice', !(params.showInflationGuaranteeNotice !== false))
                    }
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      params.showInflationGuaranteeNotice !== false
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {params.showInflationGuaranteeNotice !== false ? '✓ Açık' : '✕ Kapalı'}
                  </button>
                </div>

                {params.showInflationGuaranteeNotice !== false && (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={params.customInflationNoticeTitle ?? ''}
                      onChange={(e) =>
                        onUpdateParam && onUpdateParam('customInflationNoticeTitle', e.target.value || undefined)
                      }
                      placeholder="Özel Not Başlığı..."
                      className="w-full text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600"
                    />
                    <textarea
                      rows={2}
                      value={params.customInflationNoticeText ?? ''}
                      onChange={(e) =>
                        onUpdateParam && onUpdateParam('customInflationNoticeText', e.target.value || undefined)
                      }
                      placeholder="Özel Not Açıklama Metni..."
                      className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODULE 4: ÖDEME MODELİ, VADE & DEVLET DESTEĞİ */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-700 rounded-2xl font-black">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Modül 4: Ödeme Planı & Devlet Desteği</h3>
                <p className="text-[11px] text-slate-500">Taksit sayısı, Yarısı Bizden ve ödeme modeli</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleModule('m4_payment')}
              className="p-1.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {openModules.m4_payment ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {openModules.m4_payment && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-150">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">Ödeme Modeli:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'installments', label: '1. Aylık Taksit' },
                    { id: 'hybrid', label: '2. Karma Model' },
                    { id: 'stages', label: '3. 5 Hakediş' },
                  ].map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => onUpdateParam && onUpdateParam('paymentPlanType', plan.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        (params.paymentPlanType || 'installments') === plan.id
                          ? 'bg-indigo-600 text-white font-black shadow-xs'
                          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {plan.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">Vade / Taksit Sayısı (Ay):</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {[6, 12, 18, 24, 36, 48].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => onUpdateParam && onUpdateParam('installmentCount', count)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        (params.installmentCount || 12) === count
                          ? 'bg-slate-900 text-white font-black'
                          : 'bg-slate-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {count}Ay
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">Kentsel Dönüşüm Devlet Desteği:</label>
                <div className="space-y-1.5">
                  {[
                    { id: 'currentSupport', label: 'Yarısı Bizden (875k Hibe + 875k Kredi)' },
                    { id: 'futureSupport2027', label: '2027 Kredi Modeli (3 Milyon TL / 180 Ay)' },
                    { id: 'custom', label: 'Öz Kaynaklı / Desteksiz Model' },
                  ].map((sup) => (
                    <button
                      key={sup.id}
                      type="button"
                      onClick={() => onUpdateParam && onUpdateParam('transformationStatus', sup.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        params.transformationStatus === sup.id
                          ? 'bg-emerald-600 text-white font-black shadow-xs'
                          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sup.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODULE 5: PAKET & SUNUM MODU (BAZ VS PLUS) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 text-purple-700 rounded-2xl font-black">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Modül 5: Sunum Modu & Çift Paket</h3>
                <p className="text-[11px] text-slate-500">Baz vs Plus paket seçeneği ve donanım togglları</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleModule('m5_package')}
              className="p-1.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {openModules.m5_package ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {openModules.m5_package && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateParam && onUpdateParam('offerPresentationMode', 'dual')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    params.offerPresentationMode === 'dual'
                      ? 'bg-purple-600 text-white font-black shadow-xs'
                      : 'bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  ⚡ Çift Paket (Baz + Plus)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateParam && onUpdateParam('offerPresentationMode', 'single')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    params.offerPresentationMode !== 'dual'
                      ? 'bg-slate-900 text-white font-black shadow-xs'
                      : 'bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  📄 Tek Standart Paket
                </button>
              </div>

              {params.offerPresentationMode === 'dual' && (
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-800">Paket İsim Şablonu:</label>
                  <select
                    value={params.offerNamingPreset || 'standard_plus'}
                    onChange={(e) => {
                      const selected = DUAL_OFFER_NAMING_PRESETS.find((p) => p.id === e.target.value);
                      if (selected && onUpdateAllParams) {
                        onUpdateAllParams({
                          offerNamingPreset: e.target.value as any,
                          baseOfferTitle: selected.baseTitle,
                          plusOfferTitle: selected.plusTitle,
                        });
                      }
                    }}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-white text-slate-800 border border-slate-200"
                  >
                    {DUAL_OFFER_NAMING_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label} ({p.baseTitle} / {p.plusTitle})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Plus Paket Konfor Özellikleri:</label>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    { key: 'underfloorHeating', label: '♨️ Yerden Isıtma' },
                    { key: 'acOption', label: '❄️ Klima Altyapısı' },
                    { key: 'smartHome', label: '🔑 Akıllı Kapı/Sistem' },
                    { key: 'waterFiltration', label: '💧 Su Arıtma' },
                    { key: 'thermostaticShowerMixer', label: '🚿 Termostatik Batarya' },
                    { key: 'linearShowerDrain', label: '📐 Lineer Süzgeç' },
                  ].map((item) => {
                    const feats = params.plusOfferFeatures || {
                      underfloorHeating: true,
                      waterFiltration: true,
                      acOption: true,
                      thermostaticShowerMixer: true,
                      linearShowerDrain: true,
                      smartHome: true,
                    };
                    const isActive = feats[item.key as keyof typeof feats] !== false;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          if (onUpdateParam) {
                            onUpdateParam('plusOfferFeatures', {
                              ...feats,
                              [item.key]: !isActive,
                            });
                          }
                        }}
                        className={`p-2 rounded-xl text-[11px] font-bold text-left transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                        }`}
                      >
                        {isActive ? '✓ ' : '✕ '} {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODULE 6: ÖZEL MADDELER, ŞARTLAR & GARANTİLER */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-700 rounded-2xl font-black">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Modül 6: Özel Maddeler & Şartname</h3>
                <p className="text-[11px] text-slate-500">Teklif evrakında yer alacak özel hüküm ve maddeler</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleModule('m6_clauses')}
              className="p-1.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {openModules.m6_clauses ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {openModules.m6_clauses && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Ek Maddeler ({clauses.length} Adet):</span>
                <button
                  type="button"
                  onClick={handleAddClause}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Madde Ekle</span>
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {clauses.map((c, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-indigo-600 mt-1 shrink-0">{idx + 1}.</span>
                    <textarea
                      rows={2}
                      value={c}
                      onChange={(e) => handleUpdateClause(idx, e.target.value)}
                      className="w-full text-xs font-medium bg-white p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveClause(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MODULE 7: GÖRSEL EVRAK & KAT PLANI EKLERİ */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl font-black">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Modül 7: Görsel & Belge Ekleri</h3>
                <p className="text-[11px] text-slate-500">Kat planı, vaziyet planı ve 3D render yükleyici</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleModule('m7_media')}
              className="p-1.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {openModules.m7_media ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {openModules.m7_media && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
              {uploadedImages.length < 6 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-4 text-center cursor-pointer transition-all bg-slate-50/50 flex flex-col items-center justify-center gap-1.5"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && processFiles(e.target.files)}
                    className="hidden"
                  />
                  <Upload className="w-5 h-5 text-teal-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Sürükleyip bırakın veya seçmek için tıklayın ({uploadedImages.length}/6)
                  </span>
                </div>
              ) : (
                <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  Maksimum limit olan 6 adet görsele ulaşıldı.
                </div>
              )}

              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {uploadedImages.map((img) => (
                    <div key={img.id} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
                      <img src={img.url} alt={img.caption} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setUploadedImages((prev) => prev.filter((i) => i.id !== img.id))}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODULE 8: ÖNSÖZ & RAPOR DÜZENİ */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-700 rounded-2xl font-black">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Modül 8: Önsöz & Rapor Görünürlüğü</h3>
                <p className="text-[11px] text-slate-500">PDF çıktısındaki kapak, önsöz ve sayfa seçenekleri</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleModule('m8_layout')}
              className="p-1.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {openModules.m8_layout ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {openModules.m8_layout && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Önsöz Sunum Sayfası Gösterilsin mi?</span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateParam && onUpdateParam('showIntroPresentation', !params.showIntroPresentation)
                  }
                  className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                    params.showIntroPresentation !== false
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {params.showIntroPresentation !== false ? '✓ Açık' : '✕ Kapalı'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Şirket Profili & Tarihçesi Sayfası:</span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateParam && onUpdateParam('showCompanyHistory', !params.showCompanyHistory)
                  }
                  className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                    params.showCompanyHistory !== false
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {params.showCompanyHistory !== false ? '✓ Açık' : '✕ Kapalı'}
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1">
                <label className="text-xs font-bold text-slate-800">Özel Önsöz Açıklama Metni:</label>
                <textarea
                  rows={2}
                  value={params.introExplanation || ''}
                  onChange={(e) => onUpdateParam && onUpdateParam('introExplanation', e.target.value)}
                  placeholder="Kat maliklerine özel hitap ve sunum açıklaması..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 bg-slate-50"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM ACTION STICKY FOOTER STRIP */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-800">
            Modüler düzenlemeler resmî teklif belgesine anında işlendi.
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onOpenWhatsApp}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Özeti Paylaş</span>
          </button>

          <button
            type="button"
            onClick={onExportPdf}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>PDF İndir</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToPreview}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <span>📑 Teklif PDF Önizleme & Baskı</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
