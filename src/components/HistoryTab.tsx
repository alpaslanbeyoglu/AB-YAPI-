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
import { getLocalProgressItemByKeys, resolveProjectProgressKeys } from '../utils/syncKeys';
import { ConfirmModal } from './ConfirmModal';
import { getCurrentArchiveProjects } from '../utils/projectArchive';

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

type PortfolioFilter = 'all' | 'construction' | 'draft' | 'site-record';

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
  const visibleHistory = useMemo(() => getCurrentArchiveProjects(historyList), [historyList]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSegment, setFilterSegment] = useState<PortfolioFilter>('all');
  const [pendingDeletion, setPendingDeletion] = useState<SavedProjectData | null>(null);
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
    const totalProjects = visibleHistory.length;
    const totalArea = visibleHistory.reduce((acc, p) => acc + (p.results?.totalArea || 0), 0);
    const totalFlats = visibleHistory.reduce((acc, p) => acc + (p.params?.flatCount || p.results?.flatCount || 0), 0);
    const totalValue = visibleHistory.reduce((acc, p) => acc + (p.results?.grandTotal || 0), 0);

    const constructionCount = visibleHistory.filter(p => p.params?.isOfferAccepted).length;
    const draftCount = visibleHistory.filter(p => !p.params?.isOfferAccepted).length;

    return { totalProjects, totalArea, totalFlats, totalValue, constructionCount, draftCount };
  }, [visibleHistory]);

  const archiveItems = useMemo(() => {
    const keyCounts = new Map<string, number>();
    const projects = historyList.map((item, originalIndex) => {
      const keys = resolveProjectProgressKeys({
        projectAddress: item.projectAddress,
        projectName: item.params?.projectName,
        proposalNumber: item.params?.offerMeta?.proposalNumber,
        registerAliases: false,
      });
      for (const key of keys.candidateKeys) {
        keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
      }
      return { item, originalIndex, keys };
    });

    const visible = new Set(visibleHistory);
    return projects.filter(({ item }) => visible.has(item)).map(({ item, originalIndex, keys }) => {
      // A shared legacy key or project name cannot identify a single archive entry.
      const candidateKeys = keys.candidateKeys.filter(
        key => key === keys.primaryKey || keyCounts.get(key) === 1,
      );
      const hasSiteRecord = getLocalProgressItemByKeys(candidateKeys, 'stages') !== null;
      return { item, originalIndex, hasSiteRecord };
    });
  }, [historyList, visibleHistory]);
  const siteRecordCount = archiveItems.filter(({ hasSiteRecord }) => hasSiteRecord).length;

  const confirmDeletion = () => {
    if (!pendingDeletion) return;
    const index = historyList.indexOf(pendingDeletion);
    if (index !== -1) onDeleteItem(index);
    setPendingDeletion(null);
  };

  const filteredHistory = useMemo(() => {
    let items = [...archiveItems];

    // Filter Segment
    if (filterSegment === 'construction') {
      items = items.filter(({ item }) => item.params?.isOfferAccepted);
    } else if (filterSegment === 'draft') {
      items = items.filter(({ item }) => !item.params?.isOfferAccepted);
    } else if (filterSegment === 'site-record') {
      items = items.filter(({ hasSiteRecord }) => hasSiteRecord);
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
  }, [archiveItems, filterSegment, searchQuery, sortBy]);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* EXECUTIVE TOP HEADER */}
      <div className={`p-6 rounded-3xl border ${cardBg} flex flex-col md:flex-row items-start md:items-center justify-between gap-5`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-600 text-white shadow-md shadow-indigo-600/20 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className={`font-extrabold text-lg ${textTitle}`}>Proje Arşivi</h1>
            <p className={`text-sm ${textMuted}`}>{visibleHistory.length} kayıtlı proje</p>
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


        </div>
      </div>

      {/* SEARCH, SEGMENT TABS & SORT CONTROLS */}
      <div className={`p-4 rounded-2xl border ${cardBg} flex flex-col md:flex-row items-center justify-between gap-3`}>
        {/* Segment Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'all' as PortfolioFilter, label: `Tüm Projeler (${visibleHistory.length})` },
            { id: 'construction' as PortfolioFilter, label: `Teklifi kabul edilenler (${portfolioStats.constructionCount})` },
            { id: 'draft' as PortfolioFilter, label: `Kabul bekleyenler (${portfolioStats.draftCount})` },
            { id: 'site-record' as PortfolioFilter, label: `Şantiye kaydı olanlar (${siteRecordCount})` },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={filterSegment === tab.id}
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
              aria-label="Proje adı veya adres ara"
              placeholder="Proje adı veya adres ara..."
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Aramayı temizle"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            aria-label="Projeleri sırala"
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
      {visibleHistory.length === 0 ? (
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
          {filteredHistory.map(({ item, originalIndex, hasSiteRecord }) => {
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
                        Teklif Kabul Edildi
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

                  {hasSiteRecord && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold text-sky-800">
                      <Activity className="w-3 h-3" aria-hidden="true" />
                      Şantiye kaydı var
                    </span>
                  )}

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
                      <span>Projeyi Aç</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPendingDeletion(item)}
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
                        Teklif
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
      <details className="rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">Arşiv toplamları</summary>
        <div className="mt-3">
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
            <span className="text-emerald-600 font-bold">{portfolioStats.constructionCount} Teklifi kabul edilen</span>
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
        </div>
      </details>
      <ConfirmModal
        isOpen={pendingDeletion !== null}
        title="Proje silinsin mi?"
        message={`“${pendingDeletion?.params?.projectName || pendingDeletion?.projectAddress || 'İsimsiz Proje'}” projesi, şantiye kayıtları ve 3D önizlemesi silinecek.`}
        confirmLabel="Projeyi sil"
        isDestructive
        onCancel={() => setPendingDeletion(null)}
        onConfirm={confirmDeletion}
      />
    </div>
  );
};
