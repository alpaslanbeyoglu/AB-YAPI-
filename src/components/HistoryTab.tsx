import React, { useState, useMemo } from 'react';
import { History, Download, Trash2, Calendar, MapPin, Building2, FileUp, Search, X, ArrowDownUp } from 'lucide-react';
import { SavedProjectData, AppTheme } from '../types';

interface HistoryTabProps {
  historyList: SavedProjectData[];
  onLoadItem: (data: SavedProjectData) => void;
  onClearHistory: () => void;
  onDeleteItem: (index: number) => void;
  onOpenTransferModal?: () => void;
  theme?: AppTheme;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  historyList,
  onLoadItem,
  onClearHistory,
  onDeleteItem,
  onOpenTransferModal,
  theme = 'light',
}) => {
  const isGray = theme === 'gray';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'area' | 'amount'>('newest');

  const cardBg = isGray
    ? 'bg-slate-100 border-slate-300 shadow-sm'
    : 'bg-white border-slate-200 shadow-sm';
  const subCardBg = isGray
    ? 'bg-white border-slate-300'
    : 'bg-slate-50 border-slate-200';
  const textTitle = 'text-slate-900';
  const textMuted = 'text-slate-500';

  const filteredHistory = useMemo(() => {
    let items = historyList.map((item, originalIndex) => ({ item, originalIndex }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(({ item }) => {
        const address = (item.projectAddress || '').toLowerCase();
        const dateStr = new Date(item.savedAt).toLocaleString('tr-TR').toLowerCase();
        return address.includes(q) || dateStr.includes(q);
      });
    }

    items.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.item.savedAt).getTime() - new Date(a.item.savedAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.item.savedAt).getTime() - new Date(b.item.savedAt).getTime();
      }
      if (sortBy === 'area') {
        return (b.item.results.totalArea || 0) - (a.item.results.totalArea || 0);
      }
      if (sortBy === 'amount') {
        return (b.item.results.grandTotal || 0) - (a.item.results.grandTotal || 0);
      }
      return 0;
    });

    return items;
  }, [historyList, searchQuery, sortBy]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className={`flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl border ${cardBg}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-indigo-50 border border-indigo-200 text-indigo-600">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`font-semibold text-sm ${textTitle}`}>Hesaplama ve Proje Geçmişi</h3>
            <p className={`text-xs mt-0.5 ${textMuted}`}>
              Yapılan hesaplamaların zaman damgalı kayıtları ({historyList.length} Kayıt)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenTransferModal && (
            <button
              type="button"
              onClick={onOpenTransferModal}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer"
            >
              <FileUp className="w-4 h-4 text-indigo-600" />
              <span>İçe / Dışa Aktar</span>
            </button>
          )}
          {historyList.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all text-slate-500 hover:text-red-600 hover:bg-slate-100 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Geçmişi Temizle</span>
            </button>
          )}
        </div>
      </div>

      {historyList.length > 0 && (
        <div className={`p-4 rounded-2xl border ${cardBg} flex flex-col sm:flex-row items-center justify-between gap-3`}>
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Proje adresi veya tarihe göre ara..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder:text-slate-400"
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

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <ArrowDownUp className="w-3 h-3 text-slate-400" />
              Sırala:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="newest">En Yeni Kayıt</option>
              <option value="oldest">En Eski Kayıt</option>
              <option value="area">Toplam Alana Göre (Büyükten Küçüğe)</option>
              <option value="amount">Proje Tutarına Göre (Yüksekten Düşüğe)</option>
            </select>
          </div>
        </div>
      )}

      {historyList.length === 0 ? (
        <div className={`rounded-3xl border border-dashed p-12 text-center text-xs space-y-3 bg-white border-slate-300 text-slate-500`}>
          <div className="w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto bg-slate-50 border-slate-200 text-slate-400">
            <Building2 className="w-6 h-6" />
          </div>
          <p className="font-semibold text-sm text-slate-800">
            Henüz kayıtlı geçmiş hesaplama bulunmuyor.
          </p>
          <p className={`max-w-sm mx-auto leading-relaxed ${textMuted}`}>
            Hesaplama yaptıkça veya "Kaydet" butonunu kullandıkça projeleriniz burada listelenecektir.
          </p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className={`rounded-3xl border border-dashed p-10 text-center text-xs space-y-3 bg-white border-slate-200 text-slate-500`}>
          <Search className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-bold text-sm text-slate-800">
            "{searchQuery}" aramasıyla eşleşen proje kaydı bulunamadı.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer underline"
          >
            Aramayı Temizle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHistory.map(({ item, originalIndex }) => (
            <div
              key={originalIndex}
              className={`rounded-3xl border p-5 space-y-4 transition-all group ${
                isGray
                  ? 'bg-slate-100 border-slate-300 hover:border-slate-400 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className={`flex items-center gap-2 font-semibold text-xs ${textTitle}`}>
                    <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="truncate max-w-[240px]" title={item.projectAddress}>
                      {item.projectAddress}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-[11px] ${textMuted}`}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(item.savedAt).toLocaleString('tr-TR')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onLoadItem(item)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Yükle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteItem(originalIndex)}
                    title="Kayıtlı Projeyi Sil"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95 border border-transparent hover:border-red-200 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center pt-3 border-t border-slate-100 text-xs">
                <div className={`p-3 rounded-2xl border ${subCardBg}`}>
                  <span className={`block text-[10px] font-medium ${textMuted}`}>Toplam Alan</span>
                  <span className={`font-semibold mt-0.5 block font-mono ${textTitle}`}>
                    {item.results.totalArea} m²
                  </span>
                </div>
                <div className={`p-3 rounded-2xl border ${subCardBg}`}>
                  <span className={`block text-[10px] font-medium ${textMuted}`}>Daire Sayısı</span>
                  <span className={`font-semibold mt-0.5 block font-mono ${textTitle}`}>
                    {item.params.flatCount} Adet
                  </span>
                </div>
                <div className="p-3 rounded-2xl border bg-indigo-50 border-indigo-200">
                  <span className="block text-[10px] font-medium text-indigo-700">
                    Hedef Tutar
                  </span>
                  <span className="font-semibold mt-0.5 block font-mono text-indigo-700">
                    {(item.results.grandTotal / 1_000_000).toFixed(2)}M TL
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
