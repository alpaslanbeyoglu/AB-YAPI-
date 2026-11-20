import React from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Activity, DollarSign, Coins, HardHat, Layers } from 'lucide-react';
import { AppTheme } from '../types';
import { useMarketData } from '../hooks/useMarketData';

interface LiveMarketPricesBarProps {
  theme?: AppTheme;
}

export const LiveMarketPricesBar: React.FC<LiveMarketPricesBarProps> = ({ theme = 'light' }) => {
  const isGray = theme === 'gray';
  const market = useMarketData();

  const marketData = [
    { id: 'gold', name: 'Gram Altın', price: market.GOLD, unit: 'TL/g', change: 1.45, isUp: true, icon: Coins },
    { id: 'steel', name: 'Nervürlü Demir', price: market.REBAR, unit: 'TL/Ton', change: 0.92, isUp: true, icon: HardHat },
    { id: 'concrete', name: 'C35 Hazır Beton', price: market.CONCRETE, unit: 'TL/m³', change: 0.65, isUp: true, icon: Layers },
    { id: 'usd', name: 'USD / TRY', price: market.USD, unit: 'TL', change: 0.22, isUp: true, icon: DollarSign },
    { id: 'eur', name: 'EUR / TRY', price: market.EUR, unit: 'TL', change: -0.15, isUp: false, icon: DollarSign },
  ];

  const lastUpdated = new Date(market.lastUpdated).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const formatPrice = (val: number, fraction = 2) => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: fraction,
      maximumFractionDigits: fraction,
    }).format(val);
  };

  return (
    <div className={`w-full rounded-2xl border p-3.5 shadow-xs transition-all ${
      isGray ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
    }`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-400">
            <Activity className="w-3.5 h-3.5" /> Canlı Piyasa & Malzeme Fiyatları (TCMB / Serbest Piyasa - Senkronize)
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <span>Son Güncelleme: <strong className="text-slate-200 font-mono">{lastUpdated}</strong></span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
            Canlı Senkronize
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {marketData.map((item) => {
          const IconComponent = item.icon;
          return (
            <div
              key={item.id}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                isGray
                  ? 'bg-white border-slate-200 shadow-2xs hover:border-indigo-300'
                  : 'bg-slate-800/80 border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className={`font-bold flex items-center gap-1 ${isGray ? 'text-slate-600' : 'text-slate-300'}`}>
                  <IconComponent className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0 ${
                  item.isUp
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {item.isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  {item.change > 0 ? `+${item.change}%` : `${item.change}%`}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-1 mt-1">
                <span className={`text-sm sm:text-base font-extrabold font-mono tracking-tight ${
                  isGray ? 'text-slate-900' : 'text-white'
                }`}>
                  {formatPrice(item.price, item.id === 'usd' || item.id === 'eur' ? 2 : 0)}
                </span>
                <span className={`text-[10px] font-semibold ${isGray ? 'text-slate-400' : 'text-slate-400'}`}>
                  {item.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
