import React, { useRef } from 'react';
import { Cloud, Save, HardDrive, Sun, Palette, Printer, FileDown, FileUp, Smartphone, Monitor } from 'lucide-react';
import { User } from 'firebase/auth';
import { Logo } from './Logo';
import { AppTheme } from '../types';

interface HeaderProps {
  user: User | null;
  hasToken: boolean;
  isSavingToDrive: boolean;
  onOpenDrivePanel: () => void;
  onQuickSave: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  theme?: AppTheme;
  onToggleTheme?: () => void;
  onNavigateToCompletedProjects?: () => void;
  appMode?: 'full' | 'lite';
  onToggleAppMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  hasToken,
  isSavingToDrive,
  onOpenDrivePanel,
  onQuickSave,
  onExportJson,
  onImportJson,
  theme = 'light',
  onToggleTheme,
  onNavigateToCompletedProjects,
  appMode = 'full',
  onToggleAppMode,
}) => {
  const isGray = theme === 'gray';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportJson(e.target.files[0]);
    }
  };

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
          {appMode === 'lite' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-xs">
              LİTE
            </span>
          )}
        </div>

        {/* Right Actions: Mode Switch, Theme toggle, Google Drive sync & quick save */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* App Mode Conversion Button (Mobil Lite vs Tam Sürüm) */}
          {onToggleAppMode && (
            <button
              id="app-mode-toggle-btn"
              type="button"
              onClick={onToggleAppMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all active:scale-95 shadow-xs cursor-pointer ${
                appMode === 'lite'
                  ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                  : isGray
                  ? 'bg-white hover:bg-slate-50 text-indigo-700 border-indigo-200'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
              }`}
              title={appMode === 'lite' ? 'Masaüstü / Tam Sürüme Geç' : 'Mobil Lite Sürüme Geç'}
            >
              {appMode === 'lite' ? (
                <>
                  <Monitor className="w-3.5 h-3.5 text-white" />
                  <span>Tam Sürüm</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Mobil Lite</span>
                </>
              )}
            </button>
          )}
          
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

          {/* Local Import/Export */}
          <button
            type="button"
            onClick={onExportJson}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
              isGray
                ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
            }`}
            title="Projeyi Bilgisayara Kaydet (JSON)"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Kaydet</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
              isGray
                ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
            }`}
            title="Projeyi Bilgisayardan Yükle (JSON)"
          >
            <FileUp className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Yükle</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />

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
            <span className="hidden sm:inline">Drive Kayıt</span>
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
