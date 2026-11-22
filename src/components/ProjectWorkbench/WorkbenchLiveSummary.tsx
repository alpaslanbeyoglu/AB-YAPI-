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
  Percent,
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
  const totalCost = results.grandTotal || 0;
  // Estimate revenue based on grandTotal and contractor share / profit markup (approx 35% margin)
  const totalRevenue = totalCost * 1.35;
  const netProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 35;
  const flatCount = results.flatCount || 0;

  // Real data warnings
  const warnings: string[] = [];
  if (!params.landArea || params.landArea <= 0) {
    warnings.push('Arsa alanı henüz girilmedi.');
  }
  if (!params.baseBuildArea || params.baseBuildArea <= 0) {
    warnings.push('Zemin taban oturum alanı girilmedi.');
  }
  if (!params.floorCount || params.floorCount <= 0) {
    warnings.push('Kat adedi tanımlanmadı.');
  }
  if (profitMargin < 15 && totalRevenue > 0) {
    warnings.push('Kâr marjı %15 altında. Maliyet veya birim satış fiyatını gözden geçirin.');
  }

  return (
    <div className={`${bgCard} rounded-2xl p-4 border shadow-xs space-y-4`}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className={`text-xs font-black uppercase tracking-wider ${textTitle} flex items-center gap-1.5`}>
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          Canlı Hesaplama Özeti
        </h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          Anlık Senkronize
        </span>
      </div>

      {/* Key Metrics Grid */}
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
            <DollarSign className="w-3 h-3 text-red-500" />
            <span>Toplam Maliyet</span>
          </div>
          <div className="text-xs font-black font-mono text-slate-900 truncate" title={`${totalCost.toLocaleString('tr-TR')} TL`}>
            {totalCost > 0 ? `${(totalCost / 1_000_000).toFixed(2)} M ₺` : '0 ₺'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-blue-500" />
            <span>Toplam Hasılat</span>
          </div>
          <div className="text-xs font-black font-mono text-slate-900 truncate" title={`${totalRevenue.toLocaleString('tr-TR')} TL`}>
            {totalRevenue > 0 ? `${(totalRevenue / 1_000_000).toFixed(2)} M ₺` : '0 ₺'}
          </div>
        </div>
      </div>

      {/* Profitability Bar */}
      <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-indigo-950 flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-indigo-600" />
            Tahmini Net Kâr Marjı
          </span>
          <span className="font-mono font-black text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
            %{profitMargin.toFixed(1)}
          </span>
        </div>
        <div className="w-full bg-indigo-200/50 rounded-full h-2 overflow-hidden">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, profitMargin))}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-indigo-950 font-medium">
          <span>Net Kâr:</span>
          <span className="font-mono font-bold">{(netProfit / 1_000_000).toFixed(2)} M ₺</span>
        </div>
      </div>

      {/* Unit Counts */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
        <span className="font-bold text-slate-700">Bağımsız Bölüm (Birlik):</span>
        <span className="font-mono font-black text-indigo-600 bg-white px-2 py-1 rounded border border-slate-200">
          {flatCount} Adet
        </span>
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
            <span>Tüm kritik parametreler tam ve tutarlı.</span>
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
