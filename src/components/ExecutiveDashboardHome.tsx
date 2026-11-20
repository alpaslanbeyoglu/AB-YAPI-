import React from 'react';
import { 
  Building2, 
  Calculator, 
  Users, 
  Scale, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Activity, 
  Box, 
  CheckCircle2,
  Building
} from 'lucide-react';
import { ProjectParams, CalculationResult, AppTheme } from '../types';

interface ExecutiveDashboardHomeProps {
  params: ProjectParams;
  results: CalculationResult;
  onNavigateTab: (tabId: string) => void;
  onOpenWizard: () => void;
  theme?: AppTheme;
}

export const ExecutiveDashboardHome: React.FC<ExecutiveDashboardHomeProps> = ({
  params,
  results,
  onNavigateTab,
  onOpenWizard,
  theme = 'light',
}) => {
  const isGray = theme === 'gray';

  const modules = [
    {
      id: 'kurulum',
      title: 'Mimari & 3D Kütle Stüdyosu',
      subtitle: 'Arsa, Kat Planı, Çatı ve 3D Bina Modeli',
      icon: Building2,
      color: 'from-indigo-600 to-indigo-800',
      badge: '1. Aşama',
      stats: `${params.floorCount || 5} Kat • ${results.flatCount || 10} Daire`
    },
    {
      id: 'maliyet',
      title: 'Maliyet & Finansal Fizibilite',
      subtitle: 'Birim Maliyetler, Kaba/İnce Yapı ve CFO Analizi',
      icon: Calculator,
      color: 'from-emerald-600 to-teal-800',
      badge: '2. Aşama',
      stats: `${((results.grandTotal || 0)/1_000_000).toFixed(2)}M ₺ Toplam Maliyet`
    },
    {
      id: 'malikler',
      title: 'Malikler & Daire Paylaşımı',
      subtitle: 'Hak Sahibi Matrisi, Şerefiye ve Müteahhit Payı',
      icon: Users,
      color: 'from-amber-600 to-orange-700',
      badge: '3. Aşama',
      stats: `%${params.contractorShareRate || 50} Müteahhit Payı`
    },
    {
      id: 'teklif',
      title: '6306 Hukuki Sözleşme & Raporlar',
      subtitle: 'Noter Sözleşme Taslağı, Tapu ve Resmi Raporlar',
      icon: Scale,
      color: 'from-blue-600 to-cyan-800',
      badge: '4. Aşama',
      stats: '6306 Kanun Tam Uyum'
    },
  ];

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* Hero Executive Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 shadow-xl overflow-hidden border border-indigo-900/50">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            Executive Architecture & Engineering Suite
          </div>
          
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            {params.projectName || params.projectAddress || 'Yeni Kentsel Dönüşüm Projesi'}
          </h1>
          
          <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
            Mimari modelleme, 6306 kentsel dönüşüm kanun uyumu, maliyet hesaplamaları ve hak sahibi sözleşme yönetimini tek ekranda profesyonelce yönetin.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenWizard}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>4 Adımlı Akıllı Rehberi Başlat</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('kurulum')}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl border border-white/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Projeye Git</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* Real-time KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Arsa Alanı', val: `${params.landArea || 400} m²`, icon: Layers, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Toplam İnşaat', val: `${results.totalArea?.toLocaleString('tr-TR')} m²`, icon: Building, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Bağımsız Bölüm', val: `${results.flatCount || 10} Adet`, icon: Users, color: 'text-amber-600 bg-amber-50' },
          { label: 'Toplam Yatırım', val: `${((results.grandTotal || 0)/1_000_000).toFixed(2)}M ₺`, icon: DollarSign, color: 'text-blue-600 bg-blue-50' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${kpi.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">{kpi.label}</span>
                <span className="text-base sm:text-lg font-black text-slate-900 font-mono tracking-tight block truncate mt-0.5">{kpi.val}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4 Core Executive Modules Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-900 text-sm sm:text-base uppercase tracking-wider">
            Proje Yönetim Modülleri
          </h3>
          <span className="text-xs text-slate-400 font-bold">Tüm modüller senkronizedir</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                onClick={() => onNavigateTab(m.id)}
                className="group relative bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${m.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {m.badge}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                      {m.title}
                    </h4>
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                      {m.subtitle}
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
                  <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    {m.stats}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
