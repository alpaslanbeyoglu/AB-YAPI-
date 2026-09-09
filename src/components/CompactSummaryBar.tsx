import React, { useState } from 'react';
import { 
  Building2, 
  Maximize2, 
  Layers, 
  Home, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Eye, 
  EyeOff,
  SlidersHorizontal
} from 'lucide-react';
import { CalculationResult, AppTheme, ProjectParams } from '../types';

interface CompactSummaryBarProps {
  results: CalculationResult;
  params: ProjectParams;
  theme: AppTheme;
  onNavigateToItem?: (itemId: string) => void;
}

export const CompactSummaryBar: React.FC<CompactSummaryBarProps> = React.memo(({ results, params, theme, onNavigateToItem }) => {
  const isGray = theme === 'gray';
  const [activeView, setActiveView] = useState<'project' | 'financial' | 'all'>('all');

  const formatNumber = (val: number | undefined, fraction = 0) => {
    if (val === undefined || isNaN(val)) return '0';
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: fraction,
      maximumFractionDigits: fraction,
    }).format(val);
  };

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '0';
    return new Intl.NumberFormat('tr-TR', {
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatUsd = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '0';
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(val);
  };

  // 1. Taban Alanı (Zemin Oturumu)
  const baseArea = results.baseArea || params.baseBuildArea || 140;

  // 2. Varsa Çıkmadan Sonraki Taban Alanı (Konsol Çıkmalı Kat Oturumu)
  const hasCantilever = !!params.hasCantilever && (params.cantileverDepth || 0) > 0;
  const upperFloorArea = results.upperFloorArea && results.upperFloorArea > 0
    ? results.upperFloorArea
    : (hasCantilever ? Math.round(baseArea * 1.15 * 100) / 100 : baseArea);
  const cantileverDiff = Math.max(0, Math.round((upperFloorArea - baseArea) * 100) / 100);

  // 3. Kat ve Bağımsız Bölüm Bilgileri
  const floorCount = params.floorCount || 5;
  const flatCount = results.flatCount || params.flatCount || 10;
  const shopCount = params.hasGroundFloorShop ? (params.shopCount || 1) : 0;
  const totalUnits = flatCount + shopCount;
  const basementCount = params.basementCount || 0;

  // 4. Toplam İnşaat Alanı Bilgileri
  const totalConstructionArea = results.totalArea || 0;

  // Proje Mimari & Yapı Ölçü Kartları (Özet ve Kompakt Boyut)
  const projectItems = [
    {
      id: 'taban-alani',
      label: 'TABAN ALANI',
      value: `${formatNumber(baseArea)}`,
      unit: 'm²',
      subValue: 'Zemin oturum alanı',
      icon: Maximize2,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      valueColor: 'text-emerald-950',
    },
    {
      id: 'cikmali-taban',
      label: 'ÇIKMA SONRASI TABAN',
      value: hasCantilever && cantileverDiff > 0 ? `${formatNumber(upperFloorArea)}` : 'Çıkmasız',
      unit: hasCantilever && cantileverDiff > 0 ? 'm²' : '',
      subValue: hasCantilever && cantileverDiff > 0 
        ? `+${formatNumber(cantileverDiff)} m² konsol çıkma` 
        : `Zeminle aynı (${formatNumber(baseArea)} m²)`,
      icon: Building2,
      badgeColor: hasCantilever && cantileverDiff > 0 
        ? 'bg-amber-50 text-amber-700 border-amber-200/80'
        : 'bg-slate-50 text-slate-600 border-slate-200/80',
      valueColor: hasCantilever && cantileverDiff > 0 ? 'text-amber-950' : 'text-slate-800',
    },
    {
      id: 'kat-bolum',
      label: 'KAT & BAĞIMSIZ BÖLÜM',
      value: `${floorCount} Kat • ${totalUnits}`,
      unit: 'Bölüm',
      subValue: `${flatCount} Daire${shopCount > 0 ? ` + ${shopCount} Dükkan` : ''}${basementCount > 0 ? ` • ${basementCount} Bodrum` : ''}`,
      icon: Layers,
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200/80',
      valueColor: 'text-purple-950',
    },
    {
      id: 'toplam-insaat',
      label: 'TOPLAM İNŞAAT ALANI',
      value: `${formatNumber(totalConstructionArea)}`,
      unit: 'm²',
      subValue: params.landArea 
        ? `Arsa: ${formatNumber(params.landArea)} m² • Emsal: ${(totalConstructionArea / params.landArea).toFixed(2)}`
        : 'Tüm katlar toplam brüt alan',
      icon: Home,
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200/80',
      valueColor: 'text-blue-950',
    },
  ];

  // Finansal & Süre Kartları (Kompakt Boyut)
  const financialItems = [
    {
      id: 'birim-satis',
      label: 'BİRİM SATIŞ',
      value: formatCurrency(results.grossCostPerSqM),
      unit: 'TL/m²',
      subValue: `$${formatUsd(results.grossUsdPerSqM)} USD/m²`,
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200/80',
      valueColor: 'text-slate-900',
    },
    {
      id: 'net-maliyet',
      label: 'NET MALİYET',
      value: formatCurrency(results.netCostPerSqM),
      unit: 'TL/m²',
      subValue: `$${formatUsd(results.netUsdPerSqM)} USD/m²`,
      badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200/80',
      valueColor: 'text-slate-900',
    },
    {
      id: 'hedef-bedel',
      label: 'HEDEF BEDEL',
      value: formatCurrency(results.grandTotal),
      unit: 'TL',
      subValue: `Kâr: %${params.profitRate || 25}`,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      valueColor: 'text-slate-900',
    },
    {
      id: 'teslim-suresi',
      label: 'TESLİM SÜRESİ',
      value: `${results.finalMonths}`,
      unit: 'Ay',
      subValue: `${results.totalDays || Math.round((results.finalMonths || 12) * 30)} Gün hedef takvim`,
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
      valueColor: 'text-slate-900',
    },
  ];

  const showProject = activeView === 'project' || activeView === 'all';
  const showFinancial = activeView === 'financial' || activeView === 'all';

  return (
    <div 
      id="compact-summary-bar"
      className={`w-full border-b shadow-sm transition-all overflow-hidden ${
        isGray ? 'bg-slate-100/95 border-slate-300' : 'bg-white/95 border-slate-200'
      } backdrop-blur-md`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2.5 overflow-x-auto no-scrollbar">
        {/* Sol Grup: Mimari & Yapı Ölçüleri (Kullanıcının talep ettiği taban, çıkma, kat/bölüm, toplam inşaat) */}
        {showProject && (
          <div className="flex items-center gap-2 shrink-0">
            {projectItems.map((item) => {
              return (
                <button 
                  key={item.id}
                  id={`summary-chip-${item.id}`}
                  type="button"
                  onClick={() => onNavigateToItem?.(item.id)}
                  title={`${item.label}: Veri giriş ekranına atlamak için tıklayın`}
                  className="flex flex-col justify-center px-2.5 py-1 rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] shrink-0 min-w-[130px] max-w-[175px] hover:border-indigo-400 hover:ring-2 hover:ring-indigo-100/80 active:scale-[0.98] transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-1 leading-none mb-0.5 w-full">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase border ${item.badgeColor}`}>
                      {item.label}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">↗</span>
                  </div>
                  
                  <div className="flex items-baseline gap-1 leading-none">
                    <span className={`text-[12px] sm:text-[13px] font-black font-mono tracking-tight ${item.valueColor}`}>
                      {item.value}
                    </span>
                    {item.unit && (
                      <span className="text-[9px] font-bold text-slate-500">
                        {item.unit}
                      </span>
                    )}
                  </div>

                  <span className="text-[8.5px] font-medium text-slate-400 mt-0.5 leading-tight truncate">
                    {item.subValue}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Orta Ayırıcı (Her iki grup aktifken görünür) */}
        {showProject && showFinancial && (
          <div className="hidden md:block h-7 w-[1px] bg-slate-200 shrink-0 mx-0.5" />
        )}

        {/* Sağ Grup: Finans & Süre Özeti (Kompakt Mini Kartlar) */}
        {showFinancial && (
          <div className="flex items-center gap-2 shrink-0">
            {financialItems.map((item) => (
              <button 
                key={item.id}
                id={`summary-chip-${item.id}`}
                type="button"
                onClick={() => onNavigateToItem?.(item.id)}
                title={`${item.label}: Veri giriş ekranına atlamak için tıklayın`}
                className="flex flex-col justify-center px-2.5 py-1 rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] shrink-0 min-w-[120px] max-w-[160px] hover:border-indigo-400 hover:ring-2 hover:ring-indigo-100/80 active:scale-[0.98] transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-1 leading-none mb-0.5 w-full">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase border ${item.badgeColor}`}>
                    {item.label}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">↗</span>
                </div>
                
                <div className="flex items-baseline gap-1 leading-none">
                  <span className={`text-[12px] sm:text-[13px] font-black font-mono tracking-tight ${item.valueColor}`}>
                    {item.value}
                  </span>
                  {item.unit && (
                    <span className="text-[9px] font-bold text-slate-500">
                      {item.unit}
                    </span>
                  )}
                </div>

                <span className="text-[8.5px] font-medium text-slate-400 mt-0.5 leading-tight truncate">
                  {item.subValue}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Görünüm Filtre / Segment Seçici (Mimari, Finans veya Tümü) */}
        <div className="flex items-center gap-1 shrink-0 ml-auto pl-1">
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80 text-[9px] font-bold text-slate-600">
            <button
              type="button"
              id="summary-view-project"
              onClick={() => setActiveView('project')}
              title="Sadece Yapı & Mimari Ölçülerini Göster"
              className={`px-2 py-0.5 rounded-md transition-all ${
                activeView === 'project'
                  ? 'bg-white text-indigo-700 shadow-xs font-black'
                  : 'hover:text-slate-900 text-slate-500'
              }`}
            >
              📐 Mimari
            </button>
            <button
              type="button"
              id="summary-view-all"
              onClick={() => setActiveView('all')}
              title="Mimari ve Finansal Özetin Tamamını Göster"
              className={`px-2 py-0.5 rounded-md transition-all ${
                activeView === 'all'
                  ? 'bg-white text-indigo-700 shadow-xs font-black'
                  : 'hover:text-slate-900 text-slate-500'
              }`}
            >
              Tümü
            </button>
            <button
              type="button"
              id="summary-view-financial"
              onClick={() => setActiveView('financial')}
              title="Sadece Maliyet & Süre Özetini Göster"
              className={`px-2 py-0.5 rounded-md transition-all ${
                activeView === 'financial'
                  ? 'bg-white text-indigo-700 shadow-xs font-black'
                  : 'hover:text-slate-900 text-slate-500'
              }`}
            >
              💰 Maliyet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

CompactSummaryBar.displayName = 'CompactSummaryBar';
