import React, { useRef } from 'react';
import { Save, Sun, Palette, Printer, FileDown, FileUp, Smartphone, Monitor } from 'lucide-react';
import { Logo } from './Logo';
import { AppTheme } from '../types';

interface HeaderProps {
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  theme?: AppTheme;
  onToggleTheme?: () => void;
  onNavigateToCompletedProjects?: () => void;
  appMode?: 'full' | 'lite';
  onToggleAppMode?: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
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
      className={`sticky top-0 z-30 backdrop-blur-md border-b shadow-xs transition-colors duration-200 w-full max-w-full overflow-hidden ${
        isGray
          ? 'bg-slate-100/95 border-slate-300 text-slate-800'
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-100/60'
      }`}
    >
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 h-16 flex items-center justify-between gap-1.5 sm:gap-3 w-full">
        {/* Brand Logo & Title using official AB YAPI SVG Logo */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink min-w-0">
          <Logo size="md" theme={theme} />
          {appMode === 'lite' && (
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-indigo-600 text-white shadow-xs shrink-0">
              LİTE
            </span>
          )}
        </div>

        {/* Right Actions: Mode Switch, Theme toggle & local save */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">

          {/* App Mode Conversion Button (Mobil Lite vs Tam Sürüm) */}
          {onToggleAppMode && (
            <button
              id="app-mode-toggle-btn"
              type="button"
              onClick={onToggleAppMode}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl border text-xs font-black transition-all active:scale-95 shadow-xs cursor-pointer ${
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
                  <span className="hidden sm:inline">Tam Sürüm</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Mobil Lite</span>
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
              className={`flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
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
            className={`flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
              isGray
                ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
            }`}
            title="Projeyi Bilgisayara Kaydet (JSON)"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">Kaydet</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`hidden xs:flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
              isGray
                ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
            }`}
            title="Projeyi Bilgisayardan Yükle (JSON)"
          >
            <FileUp className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">Yükle</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
