import React from 'react';
import { ProjectParams, CalculationResult, AppTheme } from '../../types';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Building2,
  Maximize2,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
} from 'lucide-react';

interface WorkbenchLiveSummaryProps {
  params: ProjectParams;
  results: CalculationResult;
  theme?: AppTheme;
}

export const WorkbenchLiveSummary: React.FC<WorkbenchLiveSummaryProps> = ({
  params,
  results,
  theme = 'light',
}) => {
  const isGray = theme === 'gray';
  const bgCard = isGray ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/90 shadow-xs';
  const textTitle = isGray ? 'text-gray-100' : 'text-slate-900';

  const totalArea = results.totalArea || 0;
  const baseArea = results.baseArea || params.baseBuildArea || 0;
  const subTotalCost = results.subTotalCost || 0;
  const grandTotal = results.grandTotal || 0;
  const profitAmount = results.profitAmount || 0;
  const flatCount = results.flatCount || 0;
  const grossCostPerSqM = results.grossCostPerSqM || 0;
  const netCostPerSqM = results.netCostPerSqM || 0;
  const finalMonths = results.finalMonths || 0;

  const taksPercent =
    params.landArea && params.landArea > 0 ? (baseArea / params.landArea) * 100 : 0;
  const kaksRatio =
    params.landArea && params.landArea > 0 ? totalArea / params.landArea : 0;

  // Real data warnings from actual ProjectParams and CalculationResult
  const warnings: string[] = [];
  if (!params.projectName || !params.projectName.trim()) {
    warnings.push('Müşteri / Proje adı henüz tanımlanmadı.');
  }
  if (!params.landArea || params.landArea <= 0) {
    warnings.push('Arsa alanı henüz girilmedi (TAKS/KAKS hesaplanamıyor).');
  }
  if (!params.baseBuildArea || params.baseBuildArea <= 0) {
    warnings.push('Zemin taban oturum alanı girilmedi.');
  }
  if (!params.floorCount || params.floorCount <= 0) {
    warnings.push('Kat adedi tanımlanmadı.');
  }
  if (taksPercent > 65) {
    warnings.push(`TAKS oranı (%${taksPercent.toFixed(1)}) yüksek görünüyor; imar sınırını kontrol edin.`);
  }
  if (params.projectModel === 'contractorShare' && !(params.contractorFlatIds?.length) && !(params.contractorShareRate > 0)) {
    warnings.push('Kat karşılığı modunda müteahhit paylaşım oranı veya dairesi seçilmedi.');
  }

  return (
    <div className={`${bgCard} rounded-2xl p-4 border shadow-xs space-y-4`}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className={`text-xs font-black uppercase tracking-wider ${textTitle} flex items-center gap-1.5`}>
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          Canlı Hesaplama Özeti
        </h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          Canlı Motor
        </span>
      </div>

      {/* Key Metrics Grid - 100% fed by calculateProject(params) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
            <Maximize2 className="w-3 h-3 text-indigo-500" />
            <span>Toplam İnş. Alanı</span>
          </div>
          <div className="text-sm font-black font-mono text-slate-900">
            {Math.round(totalArea).toLocaleString('tr-TR')} <span className="text-[10px] font-normal text-slate-500">m²</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-emerald-500" />
            <span>Taban Oturumu</span>
          </div>
          <div className="text-sm font-black font-mono text-slate-900">
            {Math.round(baseArea).toLocaleString('tr-TR')} <span className="text-[10px] font-normal text-slate-500">m²</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-rose-500" />
            <span>Net Yapım Maliyeti</span>
          </div>
          <div className="text-xs font-black font-mono text-slate-900 truncate" title={`${Math.round(subTotalCost).toLocaleString('tr-TR')} TL`}>
            {subTotalCost > 0 ? `${(subTotalCost / 1_000_000).toFixed(2)} M ₺` : '0 ₺'}
          </div>
          <div className="text-[10px] font-mono text-slate-500">
            {Math.round(netCostPerSqM).toLocaleString('tr-TR')} ₺/m²
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-indigo-600" />
            <span>Hedef Teklif Bedeli</span>
          </div>
          <div className="text-xs font-black font-mono text-indigo-900 truncate" title={`${Math.round(grandTotal).toLocaleString('tr-TR')} TL`}>
            {grandTotal > 0 ? `${(grandTotal / 1_000_000).toFixed(2)} M ₺` : '0 ₺'}
          </div>
          <div className="text-[10px] font-mono text-indigo-600">
            {Math.round(grossCostPerSqM).toLocaleString('tr-TR')} ₺/m²
          </div>
        </div>
      </div>

      {/* Profit & Zoning Summary */}
      <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-indigo-950">Müteahhit Kâr Payı</span>
          <span className="font-mono font-black text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
            {profitAmount > 0 ? `${(profitAmount / 1_000_000).toFixed(2)} M ₺` : '0 ₺'}
          </span>
        </div>
        {params.landArea && params.landArea > 0 ? (
          <div className="flex items-center justify-between text-[11px] text-indigo-950 font-medium pt-1 border-t border-indigo-200/60">
            <span>TAKS: <strong className="font-mono">%{taksPercent.toFixed(1)}</strong></span>
            <span>Emsal: <strong className="font-mono">{kaksRatio.toFixed(2)}</strong></span>
          </div>
        ) : null}
      </div>

      {/* Unit & Timeline Summary */}
      <div className="space-y-2">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            Bağımsız Bölüm:
          </span>
          <span className="font-mono font-black text-indigo-600 bg-white px-2 py-0.5 rounded border border-slate-200">
            {flatCount} Adet
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Teslim Süresi:
          </span>
          <span className="font-mono font-black text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
            {finalMonths} Ay
          </span>
        </div>
      </div>

      {/* Warnings & Alerts */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          Proje Kontrol & Uyarılar
        </div>

        {warnings.length === 0 ? (
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Temel proje verileri ve hesaplamalar tutarlı.</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {warnings.map((warn, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-amber-50 text-amber-950 border border-amber-200 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{warn}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
