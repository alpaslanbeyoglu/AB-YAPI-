import React, { useState, useMemo } from 'react';
import {
  History,
  Download,
  Trash2,
  Calendar,
  MapPin,
  Building2,
  FileUp,
  Search,
  X,
  ArrowDownUp,
  Briefcase,
  Layers,
  FileText,
  ScrollText,
  Activity,
  PlusCircle,
  Building,
  CheckCircle2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { SavedProjectData, AppTheme } from '../types';

interface HistoryTabProps {
  historyList: SavedProjectData[];
  onLoadItem: (data: SavedProjectData) => void;
  onClearHistory: () => void;
  onDeleteItem: (index: number) => void;
  onOpenTransferModal?: () => void;
  theme?: AppTheme;
  onNavigate?: (tab: any, project?: SavedProjectData) => void;
  onNewProject?: () => void;
}

type PortfolioFilter = 'all' | 'construction' | 'draft' | 'delivered';

export const HistoryTab: React.FC<HistoryTabProps> = ({
  historyList,
  onLoadItem,
  onClearHistory,
  onDeleteItem,
  onOpenTransferModal,
  theme = 'light',
  onNavigate,
  onNewProject,
}) => {
  const isGray = theme === 'gray';
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSegment, setFilterSegment] = useState<PortfolioFilter>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'area' | 'amount'>('newest');

  const cardBg = isGray
    ? 'bg-slate-100 border-slate-300 shadow-sm'
    : 'bg-white border-slate-200 shadow-sm';
  const subCardBg = isGray
    ? 'bg-white border-slate-300'
    : 'bg-slate-50 border-slate-200';
  const textTitle = 'text-slate-900';
  const textMuted = 'text-slate-500';

  // Portfolio Aggregates
  const portfolioStats = useMemo(() => {
    const totalProjects = historyList.length;
    const totalArea = historyList.reduce((acc, p) => acc + (p.results?.totalArea || 0), 0);
    const totalFlats = historyList.reduce((acc, p) => acc + (p.params?.flatCount || p.results?.flatCount || 0), 0);
    const totalValue = historyList.reduce((acc, p) => acc + (p.results?.grandTotal || 0), 0);

    const constructionCount = historyList.filter(p => p.params?.isOfferAccepted).length;
    const draftCount = historyList.filter(p => !p.params?.isOfferAccepted).length;

    return { totalProjects, totalArea, totalFlats, totalValue, constructionCount, draftCount };
  }, [historyList]);

  const filteredHistory = useMemo(() => {
    let items = historyList.map((item, originalIndex) => ({ item, originalIndex }));

    // Filter Segment
    if (filterSegment === 'construction') {
      items = items.filter(({ item }) => item.params?.isOfferAccepted);
    } else if (filterSegment === 'draft') {
      items = items.filter(({ item }) => !item.params?.isOfferAccepted);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(({ item }) => {
        const address = (item.projectAddress || '').toLowerCase();
        const name = (item.params?.projectName || '').toLowerCase();
        const dateStr = new Date(item.savedAt).toLocaleString('tr-TR').toLowerCase();
        return address.includes(q) || name.includes(q) || dateStr.includes(q);
      });
    }

    // Sorting
    items.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.item.savedAt).getTime() - new Date(a.item.savedAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.item.savedAt).getTime() - new Date(b.item.savedAt).getTime();
      }
      if (sortBy === 'area') {
        return (b.item.results?.totalArea || 0) - (a.item.results?.totalArea || 0);
      }
      if (sortBy === 'amount') {
        return (b.item.results?.grandTotal || 0) - (a.item.results?.grandTotal || 0);
      }
      return 0;
    });

    return items;
  }, [historyList, filterSegment, searchQuery, sortBy]);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* EXECUTIVE TOP HEADER */}
      <div className={`p-6 rounded-3xl border ${cardBg} flex flex-col md:flex-row items-start md:items-center justify-between gap-5`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-600 text-white shadow-md shadow-indigo-600/20 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                Müteahhit Portföy Merkezi
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                {historyList.length} Proje Kayıtlı
              </span>
            </div>
            <h3 className={`font-extrabold text-lg mt-0.5 ${textTitle}`}>
              Şantiyelerim & Proje Portföy Arşivi
            </h3>
            <p className={`text-xs ${textMuted}`}>
              İnşaatı süren faal şantiyeler, teklif aşamasındaki projeler ve kayıtlı hesaplamaların tek merkezden yönetimi.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
          {onNewProject && (
            <button
              type="button"
              onClick={onNewProject}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Yeni Proje Başlat</span>
            </button>
          )}

          {onOpenTransferModal && (
            <button
              type="button"
              onClick={onOpenTransferModal}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
            >
              <FileUp className="w-4 h-4 text-indigo-600" />
              <span>İçe / Dışa Aktar</span>
            </button>
          )}

          {historyList.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="p-2.5 rounded-xl text-xs font-medium transition-all text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer"
              title="Tüm Arşiv Kayıtlarını Temizle"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* PORTFOLIO AGGREGATE STATS (BENTO TILES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${cardBg} space-y-1`}>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            🏢 Toplam Portföy Hacmi
          </span>
          <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
            {portfolioStats.totalProjects} <span className="text-xs font-bold text-slate-500">Proje</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="text-emerald-600 font-bold">{portfolioStats.constructionCount} Faal Şantiye</span>
            <span>&bull;</span>
            <span className="text-amber-600 font-bold">{portfolioStats.draftCount} Teklif Fazı</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${cardBg} space-y-1`}>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            📐 Toplam İnşaat Sahası
          </span>
          <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
            {portfolioStats.totalArea.toLocaleString('tr-TR')} <span className="text-xs font-bold text-slate-500">m²</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Kayıtlı projelerdeki toplam kaba ve ince imalat alanı
          </p>
        </div>

        <div className={`p-4 rounded-2xl border ${cardBg} space-y-1`}>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            🚪 Bağımsız Bölüm Hacmi
          </span>
          <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
            {portfolioStats.totalFlats} <span className="text-xs font-bold text-slate-500">Daire / Dükkan</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Hak sahipleri ve müteahhit payı toplam bağımsız bölümler
          </p>
        </div>

        <div className={`p-4 rounded-2xl border ${cardBg} space-y-1`}>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            💰 Toplam Portföy Bedeli
          </span>
          <div className="text-2xl font-black font-mono text-indigo-600 tracking-tight">
            {(portfolioStats.totalValue / 1_000_000).toFixed(1)} <span className="text-xs font-bold text-indigo-500">Milyon TL</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Hesaplanan yaklaşık inşaat bütçesi toplamı
          </p>
        </div>
      </div>

      {/* SEARCH, SEGMENT TABS & SORT CONTROLS */}
      <div className={`p-4 rounded-2xl border ${cardBg} flex flex-col md:flex-row items-center justify-between gap-3`}>
        {/* Segment Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'all' as PortfolioFilter, label: `Tüm Projeler (${historyList.length})` },
            { id: 'construction' as PortfolioFilter, label: `🏗️ Faal Şantiyeler (${portfolioStats.constructionCount})` },
            { id: 'draft' as PortfolioFilter, label: `📝 Teklif & Taslaklar (${portfolioStats.draftCount})` },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterSegment(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterSegment === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Proje adı veya adres ara..."
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs font-bold py-1.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shrink-0"
          >
            <option value="newest">En Yeni</option>
            <option value="oldest">En Eski</option>
            <option value="area">İnşaat Alanı</option>
            <option value="amount">Proje Tutarı</option>
          </select>
        </div>
      </div>

      {/* PROJECT CARDS GRID */}
      {historyList.length === 0 ? (
        <div className={`rounded-3xl border border-dashed p-12 text-center text-xs space-y-3 bg-white border-slate-300 text-slate-500`}>
          <div className="w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto bg-indigo-50 border-indigo-200 text-indigo-600">
            <Building2 className="w-6 h-6" />
          </div>
          <p className="font-extrabold text-sm text-slate-800">
            Henüz portföyünüzde kayıtlı proje bulunmuyor.
          </p>
          <p className={`max-w-sm mx-auto leading-relaxed ${textMuted}`}>
            "Yeni Proje Başlat" butonu ile ilk kentsel dönüşüm veya müteahhitlik işinizi oluşturabilir, maliyet ve teklif hesaplamalarını buradan takip edebilirsiniz.
          </p>
          {onNewProject && (
            <button
              type="button"
              onClick={onNewProject}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>İlk Projenizi Oluşturun</span>
            </button>
          )}
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className={`rounded-3xl border border-dashed p-10 text-center text-xs space-y-3 bg-white border-slate-200 text-slate-500`}>
          <Search className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-bold text-sm text-slate-800">
            Arama ve filtre kriterlerine uygun proje kaydı bulunamadı.
          </p>
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setFilterSegment('all'); }}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer underline"
          >
            Filtreleri Temizle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHistory.map(({ item, originalIndex }) => {
            const isAccepted = item.params?.isOfferAccepted;
            const projName = item.params?.projectName || item.projectAddress || 'İsimsiz Proje';

            return (
              <div
                key={originalIndex}
                className={`rounded-3xl border p-5 flex flex-col justify-between space-y-4 transition-all hover:shadow-md ${
                  isAccepted
                    ? 'bg-white border-emerald-300 ring-1 ring-emerald-500/10'
                    : isGray
                    ? 'bg-slate-100 border-slate-300'
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* Card Header & Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    {isAccepted ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Faal Şantiye Fazı
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Teklif Aşamasında
                      </span>
                    )}

                    <span className={`text-[10px] font-mono ${textMuted}`}>
                      {new Date(item.savedAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>

                  <div>
                    <h4 className={`text-sm font-extrabold line-clamp-1 leading-snug ${textTitle}`}>
                      {projName}
                    </h4>
                    <p className={`text-xs flex items-center gap-1 mt-0.5 line-clamp-1 ${textMuted}`}>
                      <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span>{item.projectAddress}</span>
                    </p>
                  </div>
                </div>

                {/* Specs Bento */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className={`p-2.5 rounded-xl border ${subCardBg}`}>
                    <span className={`block text-[9px] font-bold uppercase ${textMuted}`}>Alan</span>
                    <span className={`font-mono font-black mt-0.5 block ${textTitle}`}>
                      {item.results?.totalArea || 0} m²
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${subCardBg}`}>
                    <span className={`block text-[9px] font-bold uppercase ${textMuted}`}>Daire</span>
                    <span className={`font-mono font-black mt-0.5 block ${textTitle}`}>
                      {item.params?.flatCount || 0} Adet
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border bg-indigo-50/80 border-indigo-200 text-indigo-900">
                    <span className="block text-[9px] font-black uppercase text-indigo-700">Bütçe</span>
                    <span className="font-mono font-black mt-0.5 block">
                      {((item.results?.grandTotal || 0) / 1_000_000).toFixed(2)}M TL
                    </span>
                  </div>
                </div>

                {/* Direct Action Hub */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onLoadItem(item)}
                      className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                      title="Bu projeyi aktif çalışma ekranına yükler"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Projeyi Yükle</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteItem(originalIndex)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer border border-transparent hover:border-rose-200"
                      title="Projeyi Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Lifecycle jump buttons */}
                  {onNavigate && (
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => onNavigate('teklif', item)}
                        className="py-1 px-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 text-center transition cursor-pointer"
                        title="Teklif Mektubunu Aç"
                      >
                        Teklif (PDF)
                      </button>

                      <button
                        type="button"
                        onClick={() => onNavigate('sozlesme', item)}
                        className="py-1 px-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 text-center transition cursor-pointer"
                        title="Yapım Sözleşmesini Aç"
                      >
                        Sözleşme
                      </button>

                      <button
                        type="button"
                        onClick={() => onNavigate('surec', item)}
                        className="py-1 px-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 text-center transition cursor-pointer"
                        title="İnşaat Süreci ve Şantiyeyi Yönet"
                      >
                        Şantiye
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
