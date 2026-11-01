import React, { useRef } from 'react';
import { Save, Sun, Palette, Printer, FileDown, FileUp, Smartphone, Monitor, LogIn, LogOut, Cloud, ShieldCheck, Building, Plus, ChevronDown, Check, Clock, HardHat, CheckCircle2, Sparkles } from 'lucide-react';
import { Logo } from './Logo';
import { AppTheme } from '../types';
import { useFirebaseSync } from '../context/FirebaseSyncContext';

import { SavedProjectData, ProposalStatus } from '../types';

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
  activeProjectName?: string;
  onNewProjectClick?: () => void;
  onOpenHistoryClick?: () => void;
  onOpenQuickProposal?: () => void;
  historyList?: SavedProjectData[];
  onSelectProject?: (project: SavedProjectData) => void;
  currentProposalStatus?: ProposalStatus;
  onChangeProposalStatus?: (status: ProposalStatus) => void;
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
  activeProjectName,
  onNewProjectClick,
  onOpenHistoryClick,
  onOpenQuickProposal,
  historyList = [],
  onSelectProject,
  currentProposalStatus = 'draft',
  onChangeProposalStatus,
}) => {
  const isGray = theme === 'gray';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, signInWithGoogle, signOut, syncStatus, isAdmin } = useFirebaseSync();
  const [isSwitcherOpen, setIsSwitcherOpen] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportJson(e.target.files[0]);
    }
  };

  const isStandalonePWA =
    typeof window !== 'undefined' &&
    ((window.navigator as any)?.standalone === true ||
      window.matchMedia?.('(display-mode: standalone)')?.matches === true);

  return (
    <header
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
      className={`backdrop-blur-md border-b shadow-xs transition-colors duration-200 w-full max-w-full overflow-hidden ${
        isGray
          ? 'bg-slate-100/95 border-slate-300 text-slate-800'
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-100/60'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 min-h-[52px] sm:h-16 py-1.5 sm:py-0 flex items-center justify-between gap-1.5 sm:gap-4 w-full min-w-0">
        {/* Brand Logo & Active Project Badge */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 overflow-hidden">
          <div className="sm:hidden min-w-0 overflow-hidden">
            <Logo size="sm" variant="compact" theme={theme} className="max-w-full shrink-0" />
          </div>
          <div className="hidden sm:block min-w-0 overflow-hidden">
            <Logo size="md" theme={theme} className="max-w-full shrink-0" />
          </div>
          {appMode === 'lite' && (
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-indigo-600 text-white shadow-xs shrink-0">
              LİTE
            </span>
          )}

          {/* Active Work Order / Project Switcher & Status Dropdown */}
          <div className="relative hidden lg:block">
            <div className="flex items-center gap-1.5 bg-slate-50/90 hover:bg-slate-100/90 p-1 pl-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                className="flex items-center gap-2 text-xs transition-all cursor-pointer text-left"
                title="Aktif Proje / Projeler Arasında Hızlı Geçiş Yap"
              >
                <Building className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[9px] uppercase font-black text-indigo-500">Aktif Proje</span>
                  <span className="font-extrabold text-slate-800 truncate max-w-[180px]">{activeProjectName}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>

              {/* Status Badge & Status Selector */}
              {onChangeProposalStatus && (
                <div className="flex items-center pl-1.5 border-l border-slate-200">
                  <select
                    value={currentProposalStatus}
                    onChange={(e) => onChangeProposalStatus(e.target.value as ProposalStatus)}
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border cursor-pointer focus:outline-none transition-colors ${
                      currentProposalStatus === 'accepted' || currentProposalStatus === 'active_site'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : currentProposalStatus === 'presented'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : currentProposalStatus === 'archived'
                        ? 'bg-slate-200 text-slate-700 border-slate-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                    title="Teklif Yaşam Döngüsü Durumu"
                  >
                    <option value="draft">⏳ Taslak / Hazırlanıyor</option>
                    <option value="presented">📤 Müşteriye Sunuldu</option>
                    <option value="accepted">✅ Teklif Kabul Edildi</option>
                    <option value="active_site">🏗️ Faal Şantiye</option>
                    <option value="archived">📦 Arşivlendi</option>
                  </select>
                </div>
              )}

              {onOpenQuickProposal && (
                <button
                  type="button"
                  onClick={onOpenQuickProposal}
                  className="p-1 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ml-1"
                  title="2 Dakikada Hızlı Teklif Sihirbazını Aç"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Hızlı Teklif</span>
                </button>
              )}

              {onNewProjectClick && (
                <button
                  type="button"
                  onClick={onNewProjectClick}
                  className="p-1 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Mevcut çalışmayı arşive alıp sıfırdan yeni bir proje başlatır"
                >
                  <Plus className="w-3 h-3" />
                  <span>Sıfırla</span>
                </button>
              )}
            </div>

            {/* Quick Project Switcher Popover */}
            {isSwitcherOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSwitcherOpen(false)} />
                <div className="absolute left-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-2 space-y-1 animate-fade-in text-xs max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100">
                    <span className="font-extrabold text-[11px] text-slate-700 uppercase tracking-wider">
                      Kayıtlı Projeler & Teklifler ({historyList.length})
                    </span>
                    {onNewProjectClick && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsSwitcherOpen(false);
                          onNewProjectClick();
                        }}
                        className="text-[10px] text-indigo-600 hover:underline font-bold"
                      >
                        + Yeni Başlat
                      </button>
                    )}
                  </div>

                  {historyList.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 text-xs">
                      Henüz kayıtlı başka proje bulunmuyor.
                    </div>
                  ) : (
                    historyList.map((p, idx) => {
                      const isCurrent = p.projectAddress === activeProjectName || p.params?.projectName === activeProjectName;
                      const isAcc = p.params?.isOfferAccepted || p.params?.proposalStatus === 'accepted';
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setIsSwitcherOpen(false);
                            onSelectProject?.(p);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            isCurrent
                              ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="truncate flex-1">
                            <div className="font-bold text-slate-900 truncate">
                              {p.params?.projectName || p.projectAddress || 'İsimsiz Proje'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {p.projectAddress} • {p.params?.flatCount || 10} Daire
                            </div>
                          </div>
                          {isAcc && (
                            <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                              Şantiye
                            </span>
                          )}
                          {isCurrent && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })
                  )}

                  {onOpenHistoryClick && (
                    <div className="pt-1.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSwitcherOpen(false);
                          onOpenHistoryClick();
                        }}
                        className="w-full py-1.5 text-center text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50 rounded-lg transition-colors cursor-pointer"
                      >
                        Tüm Proje Arşivini Görüntüle →
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Actions: Mode Switch, Theme toggle & local save */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">

          {/* App Mode Conversion Button (Mobil Lite vs Tam Sürüm) */}
          {onToggleAppMode && (
            <button
              id="app-mode-toggle-btn"
              type="button"
              onClick={onToggleAppMode}
              className={`flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-black transition-all active:scale-95 shadow-xs cursor-pointer ${
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
              className={`flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer ${
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
                className={`flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
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
                className={`flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
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
          <div className="flex items-center gap-1 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-200/80">
            {user ? (
              <div className="flex items-center gap-1 sm:gap-2">
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
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-indigo-100 shadow-xs object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
                {isAdmin && onOpenAdminLicenses && (
                  <button
                    type="button"
                    onClick={onOpenAdminLicenses}
                    className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-extrabold text-xs transition-all active:scale-95 cursor-pointer shadow-xs"
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
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] sm:text-xs font-black transition-all active:scale-95 shadow-xs cursor-pointer whitespace-nowrap"
                title="Giriş Yapın ve Projelerinizi Güvenle Bulutta Saklayın"
              >
                <LogIn className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Giriş</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
