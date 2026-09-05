import React, { useState } from 'react';
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
} from 'lucide-react';
import { ProjectParams, CalculationResult, FlatItem, AppTheme, FlatCalcResult } from '../types';

interface OwnersTabProps {
  params: ProjectParams;
  results: CalculationResult;
  theme?: AppTheme;
  onChangeParams: (newParams: ProjectParams) => void;
  onCalculate?: () => void;
}

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

  // States to toggle sections
  const [isPolicyOpen, setIsPolicyOpen] = useState(true);
  const [isStagesOpen, setIsStagesOpen] = useState(true);
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

  const handleApplyBulkDownPayment = () => {
    const updatedFlats = params.flats.map((flat) => {
      // Don't apply to contractor shares
      const isContractor = params.contractorFlatIds?.includes(flat.id) || flat.isContractorShare;
      return {
        ...flat,
        downPayment: isContractor ? 0 : bulkDownPayment,
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
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border ${inputBg}`}
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
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border ${inputBg}`}
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
                            Daire {flat.id} ({flat.name})
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
                              Daire {flat.id} ({flat.name})
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

      {/* 4. KAT MALİKLERİ BİLGİ GİRİŞLERİ & PEŞİNAT KARTLARI */}
      <div className={`rounded-3xl border ${cardBg} shadow-sm overflow-hidden`}>
        <button
          type="button"
          onClick={() => setIsOwnersGridOpen(!isOwnersGridOpen)}
          className="w-full px-6 py-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors border-b border-slate-200/60"
        >
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              3. Kat Malikleri Bilgi Girişleri & Özel Peşinat Kartları ({params.flats.length} Bağımsız Bölüm)
            </span>
          </div>
          <span>{isOwnersGridOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
        </button>

        {isOwnersGridOpen && (
          <div className="p-6 space-y-6">
            {/* Toplu Peşinat Uygulama Aracı */}
            <div className={`flex items-center gap-3 flex-wrap p-4 ${innerCardBg} rounded-2xl text-xs border`}>
              <label className="font-bold text-slate-800 whitespace-nowrap">
                Tüm Dairelere Toplu Peşinat Uygula (TL):
              </label>
              <input
                type="number"
                step="10000"
                value={bulkDownPayment}
                onChange={(e) => setBulkDownPayment(parseFloat(e.target.value) || 0)}
                placeholder="Örn: 250000 TL"
                className={`w-40 text-xs px-3.5 py-2.5 rounded-xl border ${inputBg}`}
              />
              <button
                type="button"
                onClick={handleApplyBulkDownPayment}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
              >
                Toplu Tanımla & Uygula
              </button>
            </div>

            {/* Flat cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {params.flats.map((flat, idx) => {
                const isContractor = params.contractorFlatIds?.includes(flat.id) || flat.isContractorShare;
                return (
                  <div
                    key={flat.id}
                    className={`${innerCardBg} rounded-2xl border p-4 space-y-3 transition-all ${
                      isContractor ? 'ring-2 ring-amber-500/20 border-amber-300' : 'hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-800 flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isContractor ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                        Daire {flat.id} {isContractor ? '(Müteahhit Payı)' : '(Hak Sahibi)'}
                      </span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded-full border border-slate-300/50">
                        {flat.area} m²
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Hak Sahibi Adı Soyadı:
                      </label>
                      <input
                        type="text"
                        value={flat.name}
                        onChange={(e) => handleFlatChange(idx, 'name', e.target.value)}
                        className={`w-full text-xs px-3 py-1.5 rounded-xl border ${inputBg}`}
                        disabled={isContractor}
                        placeholder={isContractor ? "MÜTEAHHİT KONTROLÜNDE" : "Daire Sahibi Adı Soyadı"}
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
                          value={flat.tc}
                          onChange={(e) => handleFlatChange(idx, 'tc', e.target.value)}
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
                          value={flat.area}
                          onChange={(e) => handleFlatChange(idx, 'area', parseFloat(e.target.value) || 0)}
                          className={`w-full text-xs px-3 py-1.5 rounded-xl border ${inputBg}`}
                        />
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
                          value={flat.downPayment}
                          onChange={(e) => handleFlatChange(idx, 'downPayment', parseFloat(e.target.value) || 0)}
                          className={`w-full text-xs px-3 py-1.5 rounded-xl border ${inputBg}`}
                          disabled={isContractor}
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-700 cursor-pointer h-full pb-2 select-none">
                          <input
                            type="checkbox"
                            checked={!!flat.useTransformationCredit}
                            onChange={(e) => handleFlatChange(idx, 'useTransformationCredit', e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                            disabled={isContractor}
                          />
                          <span>Devlet Desteği</span>
                        </label>
                      </div>
                    </div>

                    {params.projectModel === 'contractorShare' && (
                      <div className="pt-1.5 border-t border-slate-200/50">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-amber-800 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isContractor}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              const currentIds = params.contractorFlatIds ? [...params.contractorFlatIds] : [];
                              let nextIds: number[];
                              if (isChecked) {
                                nextIds = currentIds.includes(flat.id) ? currentIds : [...currentIds, flat.id];
                              } else {
                                nextIds = currentIds.filter((id) => id !== flat.id);
                              }
                              onChangeParams({
                                ...params,
                                contractorFlatIds: nextIds,
                                flats: params.flats.map((f, i) => (i === idx ? { ...f, isContractorShare: isChecked } : f)),
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
                  <button
                    type="button"
                    onClick={() => setSelectedFlatId(null)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    Kapat
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="flex justify-between">
                    <span className="text-slate-500">Mülk Sahibi:</span>
                    <strong className="text-slate-800">{selectedFlatResult.name || 'Belirtilmedi'}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Bağımsız Bölüm Brüt:</span>
                    <strong className="font-mono text-slate-800">{selectedFlatResult.area} m²</strong>
                  </p>
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
    </div>
  );
};
