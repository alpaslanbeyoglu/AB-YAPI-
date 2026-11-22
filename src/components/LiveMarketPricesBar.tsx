import React from 'react';
import { AppTheme } from '../types';
import { useMarketData } from '../hooks/useMarketData';

interface LiveMarketPricesBarProps {
  theme?: AppTheme;
  compact?: boolean;
}

export const LiveMarketPricesBar: React.FC<LiveMarketPricesBarProps> = ({
  theme = 'light',
  compact = false,
}) => {
  const isGray = theme === 'gray';
  const market = useMarketData();

  const marketData = [
    { id: 'steel', name: 'Nervürlü Demir', price: market.REBAR, unit: 'TL/Ton', decimals: 0 },
    { id: 'concrete', name: 'C35 Hazır Beton', price: market.CONCRETE, unit: 'TL/m³', decimals: 0 },
    { id: 'gold', name: 'Gram Altın', price: market.GOLD, unit: 'TL/g', decimals: 0 },
    { id: 'usd', name: 'USD / TRY', price: market.USD, unit: 'TL', decimals: 2 },
    { id: 'eur', name: 'EUR / TRY', price: market.EUR, unit: 'TL', decimals: 2 },
  ];

  const lastUpdated = new Date(market.lastUpdated).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const formatPrice = (val: number, fraction = 2) =>
    new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: fraction,
      maximumFractionDigits: fraction,
    }).format(val);

  if (compact) {
    return (
      <div
        className={`w-full rounded-xl border px-4 py-2.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 ${
          isGray
            ? 'bg-slate-100/90 border-slate-300 text-slate-800'
            : 'bg-slate-50/90 border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
          <span className="font-semibold text-slate-700">Piyasa Referansları</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-[11px] text-slate-500">
            {lastUpdated}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center lg:flex-wrap gap-x-5 gap-y-2">
          {marketData.map((item) => (
            <div key={item.id} className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-xs text-slate-500">{item.name}</span>
              <span className="text-xs font-semibold font-mono tabular-nums text-slate-900">
                {formatPrice(item.price, item.decimals)}
              </span>
              <span className="text-[11px] text-slate-400">{item.unit}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-xl border p-4 ${
        isGray
          ? 'bg-slate-100 border-slate-300 text-slate-800'
          : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200">
        <span className="text-xs font-semibold text-slate-800">
          Güncel Piyasa ve Malzeme Referansları
        </span>
        <span className="text-xs text-slate-500 font-mono tabular-nums">
          Son güncelleme: {lastUpdated}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {marketData.map((item) => (
          <div
            key={item.id}
            className="px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col gap-1"
          >
            <span className="text-xs text-slate-500 truncate">{item.name}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                {formatPrice(item.price, item.decimals)}
              </span>
              <span className="text-[11px] text-slate-400">{item.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
