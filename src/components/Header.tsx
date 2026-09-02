import React from 'react';
import { Cloud, Save, HardDrive, Sun, Moon, Building2 } from 'lucide-react';
import { User } from 'firebase/auth';
import { Logo } from './Logo';

interface HeaderProps {
  user: User | null;
  hasToken: boolean;
  isSavingToDrive: boolean;
  onOpenDrivePanel: () => void;
  onQuickSave: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  hasToken,
  isSavingToDrive,
  onOpenDrivePanel,
  onQuickSave,
  theme = 'dark',
  onToggleTheme,
}) => {
  const isLight = theme === 'light';

  return (
    <header
      className={`sticky top-0 z-30 backdrop-blur-md border-b shadow-sm transition-colors duration-200 ${
        isLight
          ? 'bg-white/90 border-slate-200 shadow-slate-100'
          : 'bg-[#09090b]/90 border-zinc-800/80 shadow-black/20'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo & Title using official AB YAPI SVG Logo */}
        <div className="flex items-center gap-3">
          <Logo size="md" theme={theme} />
          <span
            className={`hidden md:inline-block px-2.5 py-0.5 text-[10px] font-medium border rounded-full tracking-wide ${
              isLight
                ? 'bg-slate-100 text-slate-700 border-slate-200'
                : 'bg-zinc-800/90 text-zinc-300 border-zinc-700/60'
            }`}
          >
            Bento Engine • İnşaat & Mimari
          </span>
        </div>

        {/* Right Actions: Nav Link, Theme toggle, Google Drive sync & quick save */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Tamamlanan Projelerimiz Sayfasına Yönlendiren Buton */}
          <a
            href="/AB-YAPI-/tamamlanan-projeler.html"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-[#18181b] hover:bg-zinc-800 text-zinc-200 border-zinc-700'
            }`}
            title="Tamamlanan Projeler Listesini Görüntüle"
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Tamamlanan Projeler</span>
          </a>

          {/* Light / Dark Mode Toggle Button */}
          {onToggleTheme && (
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={onToggleTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-[#18181b] hover:bg-zinc-800 text-zinc-200 border-zinc-700'
              }`}
              title={isLight ? 'Koyu Temaya Geç' : 'Açık Temaya Geç'}
            >
              {isLight ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Koyu Tema</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Açık Tema</span>
                </>
              )}
            </button>
          )}

          {/* Quick Save to Drive button */}
          <button
            id="quick-save-drive-btn"
            type="button"
            onClick={onQuickSave}
            disabled={isSavingToDrive}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 active:scale-95"
            title="Projeyi Google Drive'a Kaydet"
          >
            {isSavingToDrive ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Drive'a Kaydet</span>
          </button>

          {/* Google Drive Status Pill */}
          <button
            id="google-drive-status-btn"
            type="button"
            onClick={onOpenDrivePanel}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              hasToken && user
                ? isLight
                  ? 'bg-white text-slate-800 border-slate-300 hover:border-slate-400'
                  : 'bg-[#121214] text-zinc-200 border-zinc-800 hover:border-zinc-700'
                : isLight
                ? 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-800'
                : 'bg-[#121214] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            {hasToken && user ? (
              <>
                <div className="relative flex items-center justify-center">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Kullanıcı'}
                      className="w-5 h-5 rounded-full ring-1 ring-emerald-500/50"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <HardDrive className="w-4 h-4 text-emerald-500" />
                  )}
                  <span className="w-2 h-2 bg-emerald-400 rounded-full absolute -bottom-0.5 -right-0.5 ring-2 ring-white dark:ring-[#121214]" />
                </div>
                <div className="text-left leading-tight hidden sm:block">
                  <span
                    className={`block font-semibold text-[11px] ${
                      isLight ? 'text-slate-900' : 'text-zinc-200'
                    }`}
                  >
                    Google Drive
                  </span>
                  <span className="block text-[9px] text-emerald-600 dark:text-emerald-400 font-mono">
                    Bağlandı
                  </span>
                </div>
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
                <span className="hidden sm:inline font-semibold text-[11px]">
                  Google Drive Bağla
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
