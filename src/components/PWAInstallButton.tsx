import React, { useState } from 'react';
import { Smartphone, Share, PlusSquare, X, CheckCircle, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  theme?: 'light' | 'dark';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ theme = 'dark' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const isLight = theme === 'light';

  // If already running as standalone PWA app, hide button
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Android / Chromium direct install button */}
      {isInstallable && (
        <button
          id="pwa-install-btn"
          type="button"
          onClick={install}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          title="Uygulamayı Cihaza Yükle"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Uygulamayı Yükle</span>
          <span className="sm:hidden">Yükle</span>
        </button>
      )}

      {/* iOS Safari 'Ana Ekrana Ekle' Button */}
      {isIOS && (
        <button
          id="pwa-ios-install-btn"
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              : 'bg-[#18181b] hover:bg-zinc-800 text-zinc-200 border-zinc-700'
          }`}
          title="iPhone / iPad Ana Ekranına Ekle"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
          <span className="hidden sm:inline">Ana Ekrana Ekle</span>
          <span className="sm:hidden">Uygulama Yap</span>
        </button>
      )}

      {/* Fallback for general desktop/tablet browsers */}
      {!isInstallable && !isIOS && (
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all ${
            isLight
              ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
              : 'bg-[#121214] hover:bg-zinc-800 text-zinc-400 border-zinc-800'
          }`}
          title="Uygulama Olarak Kullan"
        >
          <Smartphone className="w-3 h-3 text-indigo-400" />
          <span>Web App</span>
        </button>
      )}

      {/* Guided Modal for iOS Safari / iPad / Tablet */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div
            className={`w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-[#121214] border-zinc-800 text-white'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">iPhone / iPad Ana Ekranına Ekle</h3>
                  <p className="text-[11px] text-zinc-400">Tam ekran yerel web uygulaması olarak kullanın</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div
                className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#18181b] border-zinc-800'
                }`}
              >
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">
                  1
                </div>
                <div>
                  <p className="font-semibold text-xs">Safari Paylaş Butonuna Dokunun</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1">
                    Safari alt veya üst çubuğundaki <Share className="w-3.5 h-3.5 inline text-indigo-400" /> Paylaş simgesine tıklayın.
                  </p>
                </div>
              </div>

              <div
                className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#18181b] border-zinc-800'
                }`}
              >
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">
                  2
                </div>
                <div>
                  <p className="font-semibold text-xs">"Ana Ekrana Ekle" Seçeneğini Seçin</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1">
                    Aşağı kaydırıp <PlusSquare className="w-3.5 h-3.5 inline text-emerald-400" /> "Ana Ekrana Ekle" (Add to Home Screen) butonuna basın.
                  </p>
                </div>
              </div>

              <div
                className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                  isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                }`}
              >
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  Artık <strong>AB Yapı</strong> uygulaması telefon veya tabletinizin ana ekranında tam ekran uygulama olarak çalışacak, çevrimdışı ve hızlı açılacaktır!
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full mt-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl text-xs transition-all shadow-md"
            >
              Anladım, Kapat
            </button>
          </div>
        </div>
      )}
    </>
  );
};
