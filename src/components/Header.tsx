import React, { useRef } from 'react';
import { Save, Sun, Palette, Printer, FileDown, FileUp, Smartphone, Monitor, LogIn, LogOut, Cloud, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';
import { AppTheme } from '../types';
import { useFirebaseSync } from '../context/FirebaseSyncContext';

interface HeaderProps {
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onOpenTransferModal?: () => void;
  theme?: AppTheme;
  onToggleTheme?: () => void;
  onNavigateToCompletedProjects?: () => void;
  appMode?: 'full' | 'lite';
  onToggleAppMode?: () => void;
  onOpenAdminLicenses?: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  onExportJson,
  onImportJson,
  onOpenTransferModal,
  theme = 'light',
  onToggleTheme,
  onNavigateToCompletedProjects,
  appMode = 'full',
  onToggleAppMode,
  onOpenAdminLicenses,
}) => {
  const isGray = theme === 'gray';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, signInWithGoogle, signOut, syncStatus, isAdmin } = useFirebaseSync();

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
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 h-16 flex items-center justify-between gap-2 sm:gap-4 w-full min-w-0">
        {/* Brand Logo & Title using official AB YAPI SVG Logo */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 overflow-hidden">
          <Logo size="md" theme={theme} className="max-w-full" />
          {appMode === 'lite' && (
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-indigo-600 text-white shadow-xs shrink-0">
              LİTE
            </span>
          )}
        </div>

        {/* Right Actions: Mode Switch, Theme toggle & local save */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">

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

          {/* Proje İçe/Dışa Aktarma (Transfer Merkezi) */}
          {onOpenTransferModal ? (
            <button
              type="button"
              onClick={onOpenTransferModal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer ${
                isGray
                  ? 'bg-white hover:bg-slate-50 text-indigo-700 border-indigo-200'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200/90'
              }`}
              title="Proje İçe ve Dışa Aktarma Merkezi (JSON / Şablonlar)"
            >
              <FileUp className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">İçe / Dışa Aktar</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onExportJson}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                  isGray
                    ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                }`}
                title="Projeyi Bilgisayara Kaydet (JSON)"
              >
                <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Dışa Aktar</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                  isGray
                    ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                }`}
                title="Projeyi Bilgisayardan Yükle (JSON)"
              >
                <FileUp className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">İçe Aktar</span>
              </button>
            </>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />

          {/* User Sign In / Profile and Sync Status */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200/80">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex flex-col text-right hidden md:flex">
                  <span className="text-[11px] font-black leading-3 max-w-[120px] truncate text-slate-800">
                    {user.displayName}
                  </span>
                  <span className="text-[9px] text-emerald-600 font-extrabold flex items-center justify-end gap-0.5 mt-0.5">
                    <Cloud className="w-2.5 h-2.5" />
                    Bulut Senkronize
                  </span>
                </div>
                <img
                  src={user.photoURL || 'https://www.gravatar.com/avatar/?d=mp'}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full border-2 border-indigo-100 shadow-xs object-cover"
                  referrerPolicy="no-referrer"
                />
                {isAdmin && onOpenAdminLicenses && (
                  <button
                    type="button"
                    onClick={onOpenAdminLicenses}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-extrabold text-xs transition-all active:scale-95 cursor-pointer shadow-xs"
                    title="Müşteri ve Kullanıcı Lisanslarını Yönet"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden sm:inline">Lisans Paneli</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={signOut}
                  className="p-1.5 rounded-xl border border-rose-200/80 hover:bg-rose-50 text-rose-600 transition-all active:scale-95 cursor-pointer"
                  title="Bulut Oturumunu Kapat"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all active:scale-95 shadow-xs cursor-pointer"
                title="Google Hesabınız ile Giriş Yapın ve Projelerinizi Güvenle Bulutta Saklayın"
              >
                <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                <span>Bulut Girişi</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
