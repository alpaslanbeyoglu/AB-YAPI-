import React, { useRef } from 'react';
import { Save, Sun, Palette, Printer, FileDown, FileUp, LogIn, LogOut, Cloud, ShieldCheck, Building, Plus, ChevronDown, Check, Clock, HardHat, CheckCircle2, Sparkles } from 'lucide-react';
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
  onOpenAdminLicenses?: () => void;
  activeProjectName?: string;
  onNewProjectClick?: () => void;
  onOpenHistoryClick?: () => void;
  onOpenQuickProposal?: () => void;
  onOpenGuidedWizard?: () => void;
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
  onOpenAdminLicenses,
  activeProjectName,
  onNewProjectClick,
  onOpenHistoryClick,
  onOpenQuickProposal,
  onOpenGuidedWizard,
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
      className={`@container backdrop-blur-md border-b shadow-xs transition-colors duration-200 w-full max-w-full ${
        isGray
          ? 'bg-slate-100/95 border-slate-300 text-slate-800'
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-100/60'
      }`}
    >
      <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-7 min-h-[60px] py-2 @[1000px]:py-0 @[1000px]:h-16 flex flex-wrap @[1000px]:flex-nowrap items-center justify-between gap-x-3 @[1160px]:gap-x-5 gap-y-2">
        {/* 1. SOL BÖLÜM: Marka / Logo + Proje Durumu & Seçici */}
        <div className="flex items-center gap-2.5 @[1160px]:gap-3.5 min-w-0 shrink-0">
          {/* Logo ve AB-YAPI Marka Alanı */}
          <div className="shrink-0 flex items-center">
            <Logo size="sm" variant="compact" theme={theme} className="@[1180px]:hidden" />
            <Logo size="md" variant="compact" theme={theme} className="hidden @[1180px]:inline-flex" />
          </div>

          <div className="hidden lg:block h-7 w-px bg-slate-200/90 shrink-0" />

          {/* Aktif Proje & Teklif Durumu (Diğer butonlardan görsel olarak ayrı alan) */}
          <div className="relative hidden lg:flex items-center shrink-0">
            <div className="flex items-center gap-2 bg-slate-50/95 hover:bg-slate-100/90 px-2.5 h-10 rounded-xl border border-slate-200/90 shadow-2xs transition-colors">
              <button
                type="button"
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                className="flex items-center gap-2 text-xs transition-opacity hover:opacity-85 cursor-pointer text-left min-w-0"
                title="Aktif Proje / Projeler Arasında Hızlı Geçiş Yap"
              >
                <Building className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-600 mb-0.5">
                    Aktif Proje
                  </span>
                  <span className="text-xs font-extrabold text-slate-800 truncate max-w-[88px] @[1120px]:max-w-[130px] @[1320px]:max-w-[175px]">
                    {activeProjectName}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {onChangeProposalStatus && (
                <div className="flex items-center pl-2 border-l border-slate-200/90 shrink-0">
                  <select
                    value={currentProposalStatus}
                    onChange={(e) => onChangeProposalStatus(e.target.value as ProposalStatus)}
                    className={`h-7 text-[11px] font-bold tracking-tight px-2 rounded-lg border cursor-pointer focus:outline-none transition-colors ${
                      currentProposalStatus === 'accepted' || currentProposalStatus === 'active_site'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : currentProposalStatus === 'presented'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : currentProposalStatus === 'archived'
                        ? 'bg-slate-200 text-slate-700 border-slate-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                    title="Teklif Yaşam Döngüsü Durumu"
                  >
                    <option value="draft">⏳ Taslak</option>
                    <option value="presented">📤 Sunuldu</option>
                    <option value="accepted">✅ Kabul Edildi</option>
                    <option value="active_site">🏗️ Faal Şantiye</option>
                    <option value="archived">📦 Arşivlendi</option>
                  </select>
                </div>
              )}
            </div>

            {/* Quick Project Switcher Popover */}
            {isSwitcherOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSwitcherOpen(false)} />
                <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-2 space-y-1 animate-fade-in text-xs max-h-96 overflow-y-auto">
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

        {/* 2. ORTA BÖLÜM: Eşit Hizalı Hızlı İşlem Butonları */}
        {(onOpenGuidedWizard || onOpenQuickProposal || onNewProjectClick) && (
          <div className="hidden lg:flex items-center gap-2 @[1160px]:gap-2.5 shrink-0 order-3 @[1000px]:order-2 w-full @[1000px]:w-auto pt-1 @[1000px]:pt-0 border-t @[1000px]:border-t-0 border-slate-100">
            {onOpenGuidedWizard && (
              <button
                type="button"
                onClick={onOpenGuidedWizard}
                className="h-9 px-2.5 @[1160px]:px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] @[1160px]:text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs whitespace-nowrap leading-none shrink-0"
                title="4 Adımlı Akıllı Rehber Modunu Aç"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-200" />
                <span>4 Adımlı Rehber</span>
              </button>
            )}

            {onOpenQuickProposal && (
              <button
                type="button"
                onClick={onOpenQuickProposal}
                className="h-9 px-2.5 @[1160px]:px-3.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-[11px] @[1160px]:text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs whitespace-nowrap leading-none shrink-0"
                title="2 Dakikada Hızlı Teklif Sihirbazını Aç"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Hızlı Teklif</span>
              </button>
            )}

            {onNewProjectClick && (
              <button
                type="button"
                onClick={onNewProjectClick}
                className="h-9 px-2.5 @[1160px]:px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] @[1160px]:text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs whitespace-nowrap leading-none shrink-0"
                title="Mevcut çalışmayı arşive alıp sıfırdan yeni bir proje başlatır"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Sıfırla</span>
              </button>
            )}
          </div>
        )}

        {/* 3. SAĞ BÖLÜM: Tema, İçe/Dışa Aktar ve Kullanıcı / Giriş */}
        <div className="flex items-center gap-2 @[1160px]:gap-2.5 shrink-0 order-2 @[1000px]:order-3">
          {/* Light / Gray Theme Toggle Button */}
          {onToggleTheme && (
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={onToggleTheme}
              className={`h-9 w-9 @[1240px]:w-auto @[1240px]:px-3 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap leading-none shrink-0 ${
                isGray
                  ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300/90'
              }`}
              title={isGray ? 'Açık Beyaz Temaya Geç' : 'Gri Slate Temaya Geç'}
            >
              {isGray ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="hidden @[1240px]:inline">Açık</span>
                </>
              ) : (
                <>
                  <Palette className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="hidden @[1240px]:inline">Gri</span>
                </>
              )}
            </button>
          )}

          {/* Proje İçe/Dışa Aktarma (Transfer Merkezi) */}
          {onOpenTransferModal ? (
            <button
              type="button"
              onClick={onOpenTransferModal}
              className={`h-9 px-2.5 sm:px-3 rounded-xl border text-[11px] @[1160px]:text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap leading-none shrink-0 ${
                isGray
                  ? 'bg-white hover:bg-slate-50 text-indigo-700 border-indigo-200'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200/90'
              }`}
              title="Proje İçe ve Dışa Aktarma Merkezi (JSON / Şablonlar)"
            >
              <FileUp className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="hidden sm:inline">İçe / Dışa Aktar</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onExportJson}
                className={`h-9 px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 whitespace-nowrap leading-none shrink-0 ${
                  isGray
                    ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                }`}
                title="Projeyi Bilgisayara Kaydet (JSON)"
              >
                <FileDown className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="hidden @[1200px]:inline">Dışa Aktar</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`h-9 px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 whitespace-nowrap leading-none shrink-0 ${
                  isGray
                    ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                }`}
                title="Projeyi Bilgisayardan Yükle (JSON)"
              >
                <FileUp className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="hidden @[1200px]:inline">İçe Aktar</span>
              </button>
            </>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />

          {/* Kullanıcı Profili / Giriş & Senkron Durumu */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200/90 shrink-0">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden @[1280px]:flex flex-col text-right leading-tight">
                  <span className="text-[11px] font-black max-w-[120px] truncate text-slate-800">
                    {user.displayName}
                  </span>
                  <span
                    className={`text-[9px] font-extrabold inline-flex items-center justify-end gap-1 mt-0.5 ${
                      syncStatus === 'error'
                        ? 'text-rose-600'
                        : syncStatus === 'syncing'
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    <Cloud className="w-2.5 h-2.5 shrink-0" />
                    {syncStatus === 'error'
                      ? 'Bulut Hatası'
                      : syncStatus === 'syncing'
                      ? 'Kaydediliyor...'
                      : 'Bulut Senkronize'}
                  </span>
                </div>
                <img
                  src={user.photoURL || 'https://www.gravatar.com/avatar/?d=mp'}
                  alt={user.displayName || 'Kullanıcı'}
                  className="w-8 h-8 rounded-full border border-indigo-100 shadow-xs object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
                {isAdmin && onOpenAdminLicenses && (
                  <button
                    type="button"
                    onClick={onOpenAdminLicenses}
                    className="h-9 w-9 @[1220px]:w-auto @[1220px]:px-2.5 rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap leading-none shrink-0"
                    title="Müşteri ve Kullanıcı Lisanslarını Yönet"
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="hidden @[1220px]:inline">Lisans</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={signOut}
                  className="w-9 h-9 rounded-xl border border-rose-200/80 hover:bg-rose-50 text-rose-600 inline-flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
                  title="Bulut Oturumunu Kapat"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="h-9 px-3 sm:px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap leading-none shrink-0"
                title="Giriş Yapın ve Projelerinizi Güvenle Bulutta Saklayın"
              >
                <LogIn className="w-4 h-4 text-indigo-400 shrink-0" />
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
