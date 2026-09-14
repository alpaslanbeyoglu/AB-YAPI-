import React, { useState } from 'react';
import { useFirebaseSync } from '../context/FirebaseSyncContext';
import { 
  ShieldAlert, 
  LogOut, 
  Mail, 
  Loader2, 
  Building2, 
  ExternalLink, 
  AlertCircle, 
  KeyRound, 
  Copy, 
  Check, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface LicenseGateProps {
  children: React.ReactNode;
}

export const LicenseGate: React.FC<LicenseGateProps> = ({ children }) => {
  const { 
    user, 
    loading, 
    isLicensed, 
    licenseLoading, 
    signInWithGoogle, 
    signInAsAdmin,
    signOut 
  } = useFirebaseSync();

  const [authError, setAuthError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [showAdminPasscode, setShowAdminPasscode] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Check if running inside an iframe (e.g., AI Studio preview panel)
  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleSignIn = async () => {
    setAuthError(null);
    setUnauthorizedDomain(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Authentication Error in Gate:", err);
      const errorCode = err?.code || '';
      const errorMessage = err?.message || '';

      if (errorCode === 'auth/unauthorized-domain' || errorMessage.includes('unauthorized-domain')) {
        setUnauthorizedDomain(currentHostname);
        setAuthError(
          `Firebase alan adı yetkilendirme hatası (auth/unauthorized-domain). Bu alan adının Firebase Console üzerinde 'Authorized domains' listesine eklenmesi gerekmektedir.`
        );
      } else if (isInsideIframe) {
        setAuthError(
          "Önizleme çerçevesindeki güvenlik kısıtlamaları nedeniyle giriş penceresi açılamadı. Lütfen 'Yeni Sekmede Aç' butonuna basarak deneyin."
        );
      } else {
        setAuthError(
          err.message ? `Giriş hatası: ${err.message}` : "Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin."
        );
      }
    }
  };

  const handleAdminPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    const success = signInAsAdmin(adminPin);
    if (!success) {
      setPinError("Geçersiz yönetici erişim kodu. Lütfen tekrar deneyin.");
    }
  };

  const handleCopyDomain = () => {
    if (currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleOpenInNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.origin, '_blank');
    }
  };

  // Show a professional loading state while checking login or license
  if (loading || licenseLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-800 z-50 p-6">
        <Building2 className="h-12 w-12 text-indigo-600 animate-pulse mb-4" />
        <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mb-2" />
        <p className="text-sm font-medium text-slate-500">Güvenli lisans doğrulaması yapılıyor...</p>
      </div>
    );
  }

  // 1. IF NOT LOGGED IN - Show custom premium login page
  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50 text-slate-800 z-50 p-4 overflow-y-auto">
        <div className="w-full max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl p-8 flex flex-col items-center text-center my-auto">
          <div className="h-16 w-16 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-6">
            <Building2 className="h-9 w-9" />
          </div>
          
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
            AB YAPI
          </h1>
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-4">
            İnşaat Maliyet & Şantiye Yönetimi
          </p>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Şantiye takibi, detaylı maliyet hesaplama, taşeron sözleşmeleri ve teknik şartname modüllerine erişmek için lütfen giriş yapın.
          </p>

          {/* Unauthorized Domain Explanatory Box */}
          {unauthorizedDomain && (
            <div className="w-full mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs space-y-3">
              <div className="flex items-start gap-2 text-amber-900 font-bold">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>Firebase Alan Adı İzni Gerekiyor</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                Google ile giriş yapabilmek için aşağıdaki alan adını <strong>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains</strong> listesine ekleyin:
              </p>
              <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-amber-200 font-mono text-[11px] text-slate-800 break-all">
                <span className="truncate">{unauthorizedDomain}</span>
                <button
                  type="button"
                  onClick={handleCopyDomain}
                  className="shrink-0 flex items-center gap-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded font-sans text-xs transition-colors cursor-pointer"
                  title="Alan Adını Kopyala"
                >
                  {copiedDomain ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedDomain ? 'Kopyalandı' : 'Kopyala'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Standard Auth Error Box */}
          {authError && !unauthorizedDomain && (
            <div className="w-full mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-left text-xs text-rose-700 leading-relaxed">
              {authError}
            </div>
          )}

          {/* Login Actions */}
          <div className="w-full space-y-3">
            <button
              onClick={handleSignIn}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl shadow-sm transition-all text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 active:scale-[0.98] cursor-pointer"
            >
              {/* Standard Google Icon */}
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.62 0 3.08.56 4.22 1.64l3.15-3.15C17.45 1.68 14.9 1 12 1 7.24 1 3.2 3.74 1.22 7.74l3.8 2.95C5.93 7.37 8.71 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.03 3.67-5.01 3.67-8.64z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.02 14.69c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.22 7.15C.44 8.72 0 10.49 0 12.35s.44 3.63 1.22 5.2l3.8-2.86z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.76-2.91c-1.04.7-2.38 1.11-4.2 1.11-3.29 0-6.07-2.33-7.06-5.65l-3.8 2.95C3.2 20.26 7.24 23 12 23z"
                />
              </svg>
              Google ile Giriş Yap & Doğrula
            </button>

            {isInsideIframe && (
              <button
                onClick={handleOpenInNewTab}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition-all text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 active:scale-[0.98] cursor-pointer"
              >
                <ExternalLink className="h-4 w-4" />
                Uygulamayı Yeni Sekmede Aç
              </button>
            )}

            {/* Quick Admin Master Key Section */}
            <div className="pt-4 border-t border-slate-100">
              {!showAdminPasscode ? (
                <button
                  type="button"
                  onClick={() => setShowAdminPasscode(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Yönetici Doğrulama Kodu ile Giriş</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <form onSubmit={handleAdminPinSubmit} className="space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-indigo-600" />
                      Yönetici Şifresi / PIN
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAdminPasscode(false)}
                      className="text-[11px] text-slate-400 hover:text-slate-600"
                    >
                      Vazgeç
                    </button>
                  </div>
                  <input
                    type="password"
                    placeholder="Erişim kodunuzu girin..."
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    autoFocus
                  />
                  {pinError && (
                    <p className="text-[11px] text-rose-600 font-medium">{pinError}</p>
                  )}
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
                  >
                    Yönetici Olarak Başlat (Alpaslan Beyoğlu)
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. LOGGED IN BUT NOT LICENSED - Show professional subscription lock screen
  if (!isLicensed) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50 text-slate-800 z-50 p-4">
        <div className="w-full max-w-md bg-white border border-rose-100 shadow-xl rounded-2xl p-8 flex flex-col items-center text-center">
          <div className="h-16 w-16 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-500 mb-6">
            <ShieldAlert className="h-9 w-9 animate-bounce" />
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Erişim Yetkiniz Bulunmamaktadır
          </h2>
          <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-4">
            Lisans Süreniz Dolmuş Veya Tanımlanmamış
          </p>
          
          <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs text-slate-400 font-medium">Aktif Hesap:</p>
            <p className="text-sm font-semibold text-slate-700 truncate">{user.email}</p>
          </div>

          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Bu platformu kullanmak veya lisansınızı yenilemek için lütfen yönetici <strong>Alpaslan Beyoğlu</strong> ile iletişime geçin.
          </p>

          <div className="w-full flex flex-col gap-3">
            <a
              href={`mailto:alpaslan.beyoglu@gmail.com?subject=AB Yapı Lisans Talebi (${user.email})`}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-colors"
            >
              <Mail className="h-4 w-4" />
              İletişime Geç (Lisans Satın Al)
            </a>
            
            <button
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Farklı Hesapla Giriş Yap
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. LICENSED - Grant access to application!
  return <>{children}</>;
};
