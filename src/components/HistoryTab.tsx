import React from 'react';
import { History, Cloud, Download, Trash2, Calendar, MapPin, Building2 } from 'lucide-react';
import { SavedProjectData } from '../types';

interface HistoryTabProps {
  historyList: SavedProjectData[];
  onLoadItem: (data: SavedProjectData) => void;
  onClearHistory: () => void;
  onOpenDrivePanel: () => void;
  hasDriveToken: boolean;
  theme?: 'light' | 'dark';
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  historyList,
  onLoadItem,
  onClearHistory,
  onOpenDrivePanel,
  hasDriveToken,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  const cardBg = isLight
    ? 'bg-white border-slate-200 shadow-sm'
    : 'bg-[#121214] border-zinc-800/80 shadow-xl';
  const subCardBg = isLight
    ? 'bg-slate-50 border-slate-200'
    : 'bg-[#18181b] border-zinc-800/60';
  const textTitle = isLight ? 'text-slate-900' : 'text-white';
  const textMuted = isLight ? 'text-slate-500' : 'text-zinc-400';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className={`flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl border ${cardBg}`}>
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isLight
                ? 'bg-indigo-50 border border-indigo-200 text-indigo-600'
                : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
            }`}
          >
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
          <button
            type="button"
            onClick={onOpenDrivePanel}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
              isLight
                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Google Drive Dosyaları</span>
          </button>
          {historyList.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isLight
                  ? 'text-slate-500 hover:text-red-600 hover:bg-slate-100'
                  : 'text-zinc-400 hover:text-red-400 hover:bg-zinc-800/50'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Geçmişi Temizle</span>
            </button>
          )}
        </div>
      </div>

      {historyList.length === 0 ? (
        <div
          className={`rounded-3xl border border-dashed p-12 text-center text-xs space-y-3 ${
            isLight
              ? 'bg-white border-slate-300 text-slate-500'
              : 'bg-[#121214] border-zinc-800 text-zinc-500 shadow-xl'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-400'
                : 'bg-[#18181b] border-zinc-800 text-zinc-400'
            }`}
          >
            <Building2 className="w-6 h-6" />
          </div>
          <p className={`font-semibold text-sm ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
            Henüz kayıtlı geçmiş hesaplama bulunmuyor.
          </p>
          <p className={`max-w-sm mx-auto leading-relaxed ${textMuted}`}>
            Hesaplama yaptıkça veya "Kaydet" butonunu kullandıkça projeleriniz burada listelenecektir.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {historyList.map((item, idx) => (
            <div
              key={idx}
              className={`rounded-3xl border p-5 space-y-4 transition-all group ${
                isLight
                  ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  : 'bg-[#121214] border-zinc-800/80 hover:border-zinc-700 shadow-xl'
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

                <button
                  type="button"
                  onClick={() => onLoadItem(item)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all shrink-0 active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Yükle</span>
                </button>
              </div>

              <div
                className={`grid grid-cols-3 gap-2.5 text-center pt-3 border-t text-xs ${
                  isLight ? 'border-slate-100' : 'border-zinc-800/80'
                }`}
              >
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
                <div
                  className={`p-3 rounded-2xl border ${
                    isLight
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-indigo-500/10 border-indigo-500/20'
                  }`}
                >
                  <span
                    className={`block text-[10px] font-medium ${
                      isLight ? 'text-indigo-700' : 'text-indigo-300'
                    }`}
                  >
                    Hedef Tutar
                  </span>
                  <span
                    className={`font-semibold mt-0.5 block font-mono ${
                      isLight ? 'text-indigo-700' : 'text-indigo-400'
                    }`}
                  >
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
