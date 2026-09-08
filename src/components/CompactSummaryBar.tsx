import React from 'react';
import { DollarSign, TrendingUp, Calendar, Target } from 'lucide-react';
import { CalculationResult, AppTheme, ProjectParams } from '../types';

interface CompactSummaryBarProps {
  results: CalculationResult;
  params: ProjectParams;
  theme: AppTheme;
}

export const CompactSummaryBar: React.FC<CompactSummaryBarProps> = ({ results, params, theme }) => {
  const isGray = theme === 'gray';

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined) return '0';
    return new Intl.NumberFormat('tr-TR', {
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatUsd = (val: number | undefined) => {
    if (val === undefined) return '0';
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(val);
  };

  const items = [
    {
      label: 'BİRİM SATIŞ MALİYETİ',
      value: formatCurrency(results.grossCostPerSqM),
      unit: 'TL / m²',
      subValue: `$${formatUsd(results.grossUsdPerSqM)} USD / m²`,
      classes: 'bg-amber-50 text-amber-700 border-amber-100'
    },
    {
      label: 'NET İNŞAAT MALİYETİ',
      value: formatCurrency(results.netCostPerSqM),
      unit: 'TL / m²',
      subValue: `$${formatUsd(results.netUsdPerSqM)} USD / m²`,
      classes: 'bg-blue-50 text-blue-700 border-blue-100'
    },
    {
      label: 'GENEL PROJE HEDEF BEDELİ',
      value: formatCurrency(results.grandTotal),
      unit: 'TL',
      subValue: `Kâr: ${formatCurrency(results.profitAmount)} TL (%${params.profitRate || 25})`,
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-100'
    },
    {
      label: 'TAHMİNİ TESLİM SÜRESİ',
      value: results.finalMonths,
      unit: 'Ay',
      subValue: 'Sözleşme hedef takvimi',
      classes: 'bg-indigo-50 text-indigo-700 border-indigo-100'
    }
  ];

  return (
    <div className={`w-full border-b shadow-sm transition-all overflow-hidden ${
      isGray ? 'bg-slate-100/95 border-slate-300' : 'bg-white/95 border-slate-200'
    } backdrop-blur-md`}>
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-col gap-1.5 shrink-0 min-w-[160px] p-2 rounded-xl border border-slate-200/50 bg-white/50">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider uppercase border w-fit ${item.classes}`}>
              {item.label}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-[15px] font-black text-slate-900 leading-none">
                {item.value}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                {item.unit}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 leading-none">
              {item.subValue}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
