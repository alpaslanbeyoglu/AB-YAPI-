import React from 'react';
import { Cloud, Save, HardDrive, Sun, Palette, Building2 } from 'lucide-react';
import { User } from 'firebase/auth';
import { Logo } from './Logo';
import { AppTheme } from '../types';

interface HeaderProps {
  user: User | null;
  hasToken: boolean;
  isSavingToDrive: boolean;
  onOpenDrivePanel: () => void;
  onQuickSave: () => void;
  theme?: AppTheme;
  onToggleTheme?: () => void;
  onNavigateToCompletedProjects?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  hasToken,
  isSavingToDrive,
  onOpenDrivePanel,
  onQuickSave,
  theme = 'light',
  onToggleTheme,
  onNavigateToCompletedProjects,
}) => {
  const isGray = theme === 'gray';

  return (
    <header
      className={`sticky top-0 z-30 backdrop-blur-md border-b shadow-xs transition-colors duration-200 ${
        isGray
          ? 'bg-slate-100/95 border-slate-300 text-slate-800'
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-100/60'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo & Title using official AB YAPI SVG Logo */}
        <div className="flex items-center gap-3">
          <Logo size="md" theme={theme} />
        </div>

        {/* Right Actions: Nav Link, Theme toggle, Google Drive sync & quick save */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Tamamlanan Projelerimiz Sayfasına Yönlendiren Buton */}
          <button
            type="button"
            onClick={onNavigateToCompletedProjects}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
              isGray
                ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
            title="Tamamlanan Projeler Listesini Görüntüle"
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Tamamlanan Projeler</span>
          </button>

          {/* Light / Gray Theme Toggle Button (No Dark Theme) */}
          {onToggleTheme && (
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={onToggleTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                isGray
                  ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
              title={isGray ? 'Açık Beyaz Temaya Geç' : 'Gri Slate Temaya Geç'}
            >
              {isGray ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Açık Tema</span>
                </>
              ) : (
                <>
                  <Palette className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Gri Tema</span>
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
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-50 active:scale-95"
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
                ? isGray
                  ? 'bg-white text-slate-800 border-slate-300 hover:border-slate-400'
                  : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400'
                : isGray
                ? 'bg-slate-200/80 text-slate-700 border-slate-300 hover:bg-slate-200 hover:text-slate-900'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
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
                  <span className="w-2 h-2 bg-emerald-400 rounded-full absolute -bottom-0.5 -right-0.5 ring-2 ring-white" />
                </div>
                <div className="text-left leading-tight hidden sm:block">
                  <span className="block font-semibold text-[11px] text-slate-900">
                    Google Drive
                  </span>
                  <span className="block text-[9px] text-emerald-600 font-mono">
                    Bağlandı
                  </span>
                </div>
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4 text-slate-500" />
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
