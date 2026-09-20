import React, { useState } from 'react';
import { ProjectParams, CalculationResult } from '../types';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Scale,
  Building2,
  Users,
  Layers,
  ArrowRight,
  ShieldCheck,
  X,
  Printer,
  Sparkles,
  HelpCircle,
  Calculator,
  RefreshCw,
  PieChart,
  FileText
} from 'lucide-react';

interface ReconciliationDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: ProjectParams;
  results: CalculationResult;
  onSyncParams?: (updatedParams: ProjectParams) => void;
  theme?: 'light' | 'gray';
}

export const ReconciliationDiagnosticModal: React.FC<ReconciliationDiagnosticModalProps> = ({
  isOpen,
  onClose,
  params,
  results,
  onSyncParams,
  theme = 'light',
}) => {
  if (!isOpen) return null;

  const isGray = theme === 'gray';

  // 1. Offer Projected Total Cost
  const offerTotalCost = results.grandTotal || 0;
  const subTotalCost = results.subTotalCost || 0;
  const profitAmount = results.profitAmount || 0;

  // 2. Sum of unit calculations
  const flats = results.flatResults || [];
  const sumUnitGrossPay = flats.reduce((acc, f) => acc + (f.grossPay || 0), 0);
  const ownerFlats = flats.filter((f) => !f.isContractorShare);
  const contractorFlats = flats.filter((f) => f.isContractorShare);

  const sumOwnerGrossPay = ownerFlats.reduce((acc, f) => acc + (f.grossPay || 0), 0);
  const sumContractorGrossPay = contractorFlats.reduce((acc, f) => acc + (f.grossPay || 0), 0);

  // 3. Financial Deductions & Net Debts
  const totalGrantUsed = ownerFlats.reduce((acc, f) => acc + (f.usedGrant || 0), 0);
  const totalCreditUsed = ownerFlats.reduce((acc, f) => acc + (f.usedCredit || 0), 0);
  const totalDownPayment = ownerFlats.reduce((acc, f) => acc + (f.downPayment || 0), 0);
  const totalNetRemainingDebt = ownerFlats.reduce((acc, f) => acc + (f.netRemainingDebt || 0), 0);

  // 4. Variance / Reconciliation Math
  const rawVariance = offerTotalCost - sumUnitGrossPay;
  const absVariance = Math.abs(rawVariance);
  const variancePercentage = offerTotalCost > 0 ? (absVariance / offerTotalCost) * 100 : 0;

  // Status classification
  const isPerfectMatch = absVariance <= 100;
  const isMinorVariance = absVariance > 100 && absVariance <= 10000;
  const isSignificantVariance = absVariance > 10000;

  // 5. Shared Area & Area Metrics
  const totalBuildingGrossArea = results.totalArea || 0;
  const sumUnitFootprintArea = flats.reduce((acc, f) => acc + (f.area || 0), 0);
  const totalCommonAreaShare = flats.reduce((acc, f) => acc + (f.commonAreaShare || 0), 0);
  const totalBalconyAreaShare = flats.reduce((acc, f) => acc + (f.balconyAreaShare || 0), 0);

  // Auto-sync button handler
  const handleAutoBalance = () => {
    if (onSyncParams) {
      // Clear manual unit price overrides if any exist to align 100% with global project cost
      onSyncParams({
        ...params,
        manualFlatUnitPrice: undefined,
        manualShopUnitPrice: undefined,
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/50 print:bg-none print:text-slate-900 print:p-0 print:border-b-2 print:border-slate-900">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-indigo-600/30 border border-indigo-400/30 rounded-2xl text-indigo-300 print:hidden">
              <Scale className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-extrabold text-white print:text-slate-900">
                  Proje & Malik Mali Mutabakat Teşhis Paneli
                </h3>
                <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full font-bold print:hidden">
                  Real-time Audit
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5 font-medium print:text-slate-600">
                Teklif Proje Maliyeti ile Bağımsız Bölüm Dağılımları Arasındaki Anlık Çapraz Denetim ve Ortak Alan Analizi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="p-2.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Mutabakat Raporunu Yazdır"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Yazdır</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200">
          {/* Status Diagnostic Banner */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
              isPerfectMatch
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200'
                : isMinorVariance
                ? 'bg-amber-50/90 border-amber-200 text-amber-950 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200'
                : 'bg-indigo-50/90 border-indigo-200 text-indigo-950 dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {isPerfectMatch ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : isMinorVariance ? (
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                  <span>
                    {isPerfectMatch
                      ? '🟢 %100 Tam Mutabakat (Sıfır Sapma)'
                      : isMinorVariance
                      ? '🟡 Dengeli Dağılım (Önemsiz Yuvarlama Farkı)'
                      : '🔵 Özel Fiyatlandırma / Şerefiye Farkı Tespit Edildi'}
                  </span>
                </div>
                <p className="text-xs mt-1 leading-relaxed opacity-90">
                  {isPerfectMatch
                    ? 'Teklif sayfasında hesaplanan toplam proje değeri ile bağımsız bölümlere dağıtılan brüt malik maliyetleri %100 örtüşmektedir.'
                    : isMinorVariance
                    ? `Teklif tutarı ile birimler toplamı arasında sadece ~${absVariance.toLocaleString(
                        'tr-TR'
                      )} ₺ (%${variancePercentage.toFixed(3)}) tutarında önemsiz küsurat/yuvarlama farkı mevcuttur.`
                    : `Teklif projelendirmesi ile birimler toplamı arasında ${absVariance.toLocaleString(
                        'tr-TR'
                      )} ₺ tutarında sapma mevcuttur. Bu durum özel birim fiyat girmelerinden veya şerefiye çarpanlarından kaynaklanmaktadır.`}
                </p>
              </div>
            </div>

            {onSyncParams && !isPerfectMatch && (
              <button
                onClick={handleAutoBalance}
                className="shrink-0 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 print:hidden"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Birim Fiyatları Dengele</span>
              </button>
            )}
          </div>

          {/* 3 Core Metric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Offer Projected Cost */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
              <div className="absolute -right-3 -bottom-3 text-slate-800 opacity-40">
                <Building2 className="w-24 h-24" />
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-1">
                1. Teklif Proje Değeri
              </span>
              <div className="text-2xl font-black font-mono text-emerald-400">
                {offerTotalCost.toLocaleString('tr-TR')} ₺
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Net İmalat Maliyeti:</span>
                  <span className="font-mono">{subTotalCost.toLocaleString('tr-TR')} ₺</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kâr & Genel Gider:</span>
                  <span className="font-mono text-amber-300">+{profitAmount.toLocaleString('tr-TR')} ₺</span>
                </div>
                <div className="flex justify-between font-bold text-white pt-1">
                  <span>Ort. M² İmalat Fiyatı:</span>
                  <span className="font-mono text-emerald-400">
                    ~{(results.grossCostPerSqM || 0).toLocaleString('tr-TR')} ₺/m²
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Cumulative Sum of Units */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <div className="absolute -right-3 -bottom-3 text-slate-200 dark:text-slate-700 opacity-40">
                <Users className="w-24 h-24" />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-widest block mb-1">
                2. Birimler Toplam Payı
              </span>
              <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                {sumUnitGrossPay.toLocaleString('tr-TR')} ₺
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    Malikler Payı ({ownerFlats.length} Birim):
                  </span>
                  <span className="font-mono font-bold">{sumOwnerGrossPay.toLocaleString('tr-TR')} ₺</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    Müteahhit Payı ({contractorFlats.length} Birim):
                  </span>
                  <span className="font-mono font-bold text-indigo-500">
                    {sumContractorGrossPay.toLocaleString('tr-TR')} ₺
                  </span>
                </div>
                <div className="flex justify-between font-bold pt-1 text-slate-700 dark:text-slate-300">
                  <span>Toplam Ünite Adedi:</span>
                  <span className="font-mono">{flats.length} Bağımsız Bölüm</span>
                </div>
              </div>
            </div>

            {/* Card 3: Reconciliation Variance */}
            <div
              className={`p-4 rounded-2xl border shadow-sm relative overflow-hidden ${
                isPerfectMatch
                  ? 'bg-emerald-500/10 border-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-500/10 border-amber-300 dark:border-amber-800'
              }`}
            >
              <div className="absolute -right-3 -bottom-3 text-slate-300 dark:text-slate-700 opacity-30">
                <Calculator className="w-24 h-24" />
              </div>
              <span className="text-[10px] uppercase font-black tracking-widest block mb-1 text-slate-600 dark:text-slate-400">
                3. Mutabakat Sapma Tutarı
              </span>
              <div
                className={`text-2xl font-black font-mono ${
                  isPerfectMatch
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {rawVariance > 0 ? '+' : ''}
                {rawVariance.toLocaleString('tr-TR')} ₺
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Sapma Oranı:</span>
                  <span className="font-mono font-bold">%{variancePercentage.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Uyum Durumu:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {isPerfectMatch ? 'Sıfır Sapma' : 'Dengeli'}
                  </span>
                </div>
                <div className="flex justify-between font-bold pt-1 text-slate-700 dark:text-slate-300">
                  <span>Ortak Alan Dağılımı:</span>
                  <span className="font-mono text-purple-600 dark:text-purple-400">Tam Dahil</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ortak Alan Dağılımı & Mimari Metraj Analizi */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Ortak Alan & Metraj Paylaşım Analizi</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold">
                Toplam İnşaat: {totalBuildingGrossArea} m²
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  🏠 Birimler Taban Net/Brütü
                </span>
                <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                  {sumUnitFootprintArea.toFixed(1)} m²
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Bağımsız bölümlerin doğrudan kullanılan kat m² toplamı
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase block">
                  🏬 Ortak Alan Payı (Sığınak/Otopark)
                </span>
                <div className="text-base font-extrabold font-mono text-purple-700 dark:text-purple-300">
                  +{totalCommonAreaShare.toFixed(1)} m²
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Merdiven, asansör, sığınak ve otoparkın birimlere adil oranı
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase block">
                  📐 Çıkma & Balkon Alanı
                </span>
                <div className="text-base font-extrabold font-mono text-indigo-700 dark:text-indigo-300">
                  +{totalBalconyAreaShare.toFixed(1)} m²
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Konsol çıkmalar ve açık/kapalı balkon kullanım hakları
                </p>
              </div>
            </div>
          </div>

          {/* Adım Adım Mutabakat Köprüsü (Reconciliation Bridge Table) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Adım Adım Mutabakat Köprüsü (Reconciliation Bridge)</span>
              </h4>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                Finansal Denetim Cetveli
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                    <th className="p-3">Adım / Kalem Açıklaması</th>
                    <th className="p-3 text-right">Miktar / Değer</th>
                    <th className="p-3 text-right">Giren / Çıkan Tutar (₺)</th>
                    <th className="p-3 text-right">Kümülatif Bakiye</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {/* Step 1 */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      1. Teklif Toplam İnşaat Proje Değeri
                    </td>
                    <td className="p-3 text-right font-mono">{results.totalArea} m²</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{offerTotalCost.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                      {offerTotalCost.toLocaleString('tr-TR')} ₺
                    </td>
                  </tr>

                  {/* Step 2 */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 text-slate-700 dark:text-slate-300 pl-6">
                      ↳ Dağıtılan Malik Bağımsız Bölüm Brüt Maliyetleri ({ownerFlats.length} Birim)
                    </td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {ownerFlats.reduce((s, f) => s + f.area, 0)} m²
                    </td>
                    <td className="p-3 text-right font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                      -{sumOwnerGrossPay.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {(offerTotalCost - sumOwnerGrossPay).toLocaleString('tr-TR')} ₺
                    </td>
                  </tr>

                  {/* Step 3 */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 text-slate-700 dark:text-slate-300 pl-6">
                      ↳ Düşülen Müteahhit Daire/Dükkan İmalat Payı ({contractorFlats.length} Birim)
                    </td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {contractorFlats.reduce((s, f) => s + f.area, 0)} m²
                    </td>
                    <td className="p-3 text-right font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                      -{sumContractorGrossPay.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="p-3 text-right font-mono text-slate-900 dark:text-white font-extrabold">
                      {rawVariance.toLocaleString('tr-TR')} ₺
                    </td>
                  </tr>

                  {/* Step 4: Grants */}
                  <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                    <td className="p-3 font-semibold text-emerald-950 dark:text-emerald-300 pl-6">
                      ↳ (-) Düşülen Yarısı Bizden Devlet Hibeleri
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-700 dark:text-emerald-400">
                      {ownerFlats.filter((f) => f.usedGrant > 0).length} Birim
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      -{totalGrantUsed.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-900 dark:text-emerald-200 font-bold">
                      {(sumOwnerGrossPay - totalGrantUsed).toLocaleString('tr-TR')} ₺
                    </td>
                  </tr>

                  {/* Step 5: Loans */}
                  <tr className="bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
                    <td className="p-3 font-semibold text-indigo-950 dark:text-indigo-300 pl-6">
                      ↳ (-) Düşülen Kentsel Dönüşüm Kredileri
                    </td>
                    <td className="p-3 text-right font-mono text-indigo-700 dark:text-indigo-400">
                      {ownerFlats.filter((f) => f.usedCredit > 0).length} Birim
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      -{totalCreditUsed.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="p-3 text-right font-mono text-indigo-900 dark:text-indigo-200 font-bold">
                      {(sumOwnerGrossPay - totalGrantUsed - totalCreditUsed).toLocaleString('tr-TR')} ₺
                    </td>
                  </tr>

                  {/* Step 6: Down Payments */}
                  <tr className="bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30">
                    <td className="p-3 font-semibold text-amber-950 dark:text-amber-300 pl-6">
                      ↳ (-) Malikler Tarafından Ödenen Peşinatlar
                    </td>
                    <td className="p-3 text-right font-mono text-amber-700 dark:text-amber-400">
                      {ownerFlats.filter((f) => (f.downPayment || 0) > 0).length} Birim
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                      -{totalDownPayment.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="p-3 text-right font-mono text-amber-900 dark:text-amber-200 font-bold">
                      {totalNetRemainingDebt.toLocaleString('tr-TR')} ₺
                    </td>
                  </tr>

                  {/* Final Net Remaining Debt */}
                  <tr className="bg-slate-900 text-white font-extrabold">
                    <td className="p-3.5 text-indigo-200">
                      = Kat Maliklerinin Cebinden Çıkacak Toplam Net Borç
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-400">
                      {ownerFlats.length} Malik
                    </td>
                    <td className="p-3.5 text-right font-mono text-emerald-400 text-sm">
                      {totalNetRemainingDebt.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="p-3.5 text-right font-mono text-emerald-400 text-sm">
                      {totalNetRemainingDebt.toLocaleString('tr-TR')} ₺
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-100 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Mali mutabakat denetimi tüm formüller üzerinden anlık hesaplanır.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
