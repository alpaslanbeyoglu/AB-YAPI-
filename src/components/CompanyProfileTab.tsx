import React, { useState, useRef } from 'react';
import {
  Building2,
  Upload,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Download,
  FileUp,
  ShieldCheck,
  FileSignature,
  FileText,
  BadgePercent,
  Phone,
  Mail,
  Globe,
  MapPin,
  CreditCard,
  User,
  Briefcase,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useCompanyProfile, DEFAULT_COMPANY_PROFILE } from '../context/CompanyProfileContext';
import { CompanyProfile, AppTheme } from '../types';
import { Logo } from './Logo';

interface CompanyProfileTabProps {
  theme?: AppTheme;
  onNavigateTab?: (tabKey: string) => void;
}

export const CompanyProfileTab: React.FC<CompanyProfileTabProps> = ({
  theme = 'light',
  onNavigateTab,
}) => {
  const { profile, updateProfile, setLogo, removeLogo, resetToDefault, importProfile } =
    useCompanyProfile();

  const [formData, setFormData] = useState<CompanyProfile>(profile);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Sync state if external profile changes
  React.useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorToast(msg);
      setTimeout(() => setErrorToast(null), 4000);
    } else {
      setSaveToast(msg);
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  const handleInputChange = (field: keyof CompanyProfile, value: string) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    // Live update context and localStorage so immediate preview is reflected
    updateProfile({ [field]: value });
  };

  const handleManualSave = () => {
    updateProfile(formData);
    showNotification('Firma bilgileri tarayıcı hafızasına (localStorage) başarıyla kaydedildi!');
  };

  // Optimize and process image using canvas to ensure it fits nicely in localStorage without bloat
  const processAndSetImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showNotification('Lütfen geçerli bir resim dosyası seçin (PNG, JPG, WebP veya SVG).', true);
      return;
    }

    // If SVG, read text directly
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setLogo(result);
          setFormData((prev) => ({ ...prev, logoBase64: result }));
          showNotification('SVG logosu başarıyla yüklendi ve kaydedildi.');
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    // For raster images (PNG, JPEG, WebP), resize to max 500x500 to keep localStorage slim
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 500;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/png', 0.9);
          setLogo(compressedDataUrl);
          setFormData((prev) => ({ ...prev, logoBase64: compressedDataUrl }));
          showNotification('Firma logosu optimize edilerek başarıyla kaydedildi.');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndSetImage(file);
    }
    // reset input value so re-selecting same file triggers change
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAndSetImage(file);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Firma profili varsayılan AB YAPI ayarlarına döndürülsün mü?')) {
      resetToDefault();
      setFormData(DEFAULT_COMPANY_PROFILE);
      showNotification('Profil varsayılan AB YAPI ayarlarına döndürüldü.');
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `${(formData.companyName || 'Firma').replace(/\s+/g, '_')}_Profil_Yedegi.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification('Firma profili JSON dosyası olarak indirildi.');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (typeof parsed === 'object' && parsed !== null) {
          importProfile(parsed);
          setFormData(parsed);
          showNotification('Firma profili JSON dosyasından başarıyla içe aktarıldı.');
        } else {
          showNotification('Geçersiz JSON formatı.', true);
        }
      } catch (err) {
        showNotification('JSON dosyası okunurken hata oluştu.', true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isGray = theme === 'gray';

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Toast Notifications */}
      {saveToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-600 text-white rounded-2xl shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-red-600 text-white rounded-2xl shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-bold uppercase tracking-wider border border-indigo-400/20">
                <Building2 className="w-3 h-3" />
                KURUMSAL KİMLİK & PROFİL YÖNETİMİ
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/15 text-emerald-300 rounded-full text-[10px] font-semibold border border-emerald-400/20">
                <ShieldCheck className="w-3 h-3" />
                Yalnızca Tarayıcıda Saklanır (LocalStorage)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Firma Bilgileri & Kurumsal Logo
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Burada tanımladığınız firma ünvanı, iletişim kanalları, yetkili mühendis bilgileri ve kurumsal şirket logosu;
              teklif mektupları, resmi inşaat sözleşmeleri, teknik şartnameler ve yönetici raporları dahil tüm projeye anında uygulanır.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleManualSave}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Değişiklikleri Kaydet</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              title="Profili JSON olarak yedekle"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Yedekle</span>
            </button>
            <label
              className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              title="JSON dosyasından geri yükle"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Geri Yükle</span>
              <input
                ref={jsonInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 rounded-xl text-xs font-semibold border border-red-800/40 transition-all cursor-pointer"
              title="Varsayılan AB YAPI profiline döndür"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sıfırla</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Preview Card */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-sm ${isGray ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Canlı Belge Anteti & Görsel Önizleme
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Teklif mektupları ve sözleşmelerinizin üst antetinde ve imza bloklarında görünecek canlı görünüm
            </p>
          </div>
          <span className="text-[11px] font-mono text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 font-semibold">
            Canlı Senkronizasyon Aktif
          </span>
        </div>

        {/* Mock Official Document Header Preview */}
        <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-6 shadow-inner">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-slate-200 pb-5">
            <div className="flex items-center gap-4">
              <Logo size="lg" variant="full" theme={theme} />
            </div>
            <div className="text-center sm:text-right space-y-1">
              <div className="text-sm font-black text-slate-900 tracking-tight">
                {formData.legalName || 'FİRMA ÜNVANI'}
              </div>
              <div className="text-[11px] text-slate-600 flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1 font-mono">
                {formData.phone && <span>📞 {formData.phone}</span>}
                {formData.email && <span>✉️ {formData.email}</span>}
                {formData.website && <span>🌐 {formData.website}</span>}
              </div>
              <div className="text-[10px] text-slate-500">
                📍 {formData.address || 'Firma Adresi'} | {formData.taxOffice} - V.No: {formData.taxNumber}
              </div>
            </div>
          </div>

          {/* Mock Signature Preview */}
          <div className="mt-5 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 bg-white/70 p-4 rounded-xl border border-slate-200/80">
            <div className="space-y-0.5 text-center sm:text-left">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">YETKİLİ İMZA BLOĞU</span>
              <div className="font-bold text-slate-900">{formData.authorizedPerson || 'Yetkili Adı Soyadı'}</div>
              <div className="text-[11px] text-slate-500">{formData.authorizedTitle || 'Ünvan'} • {formData.companyName}</div>
            </div>
            {formData.iban && (
              <div className="text-center sm:text-right font-mono text-[11px] bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-[9px] text-slate-500 block uppercase font-sans font-semibold">HAKEDİŞ BANKA HESABI</span>
                <span className="font-bold text-slate-800">{formData.bankName}</span> - {formData.iban}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Logo Management + Info Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Logo Uploader & Management */}
        <div className="lg:col-span-1 space-y-6">
          <div className={`p-6 rounded-3xl border shadow-sm ${isGray ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Upload className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Kurumsal Firma Logosu</h3>
            </div>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Kendi şirket logonuzu yükleyerek tüm sistemdeki varsayılan AB YAPI logosunu değiştirebilirsiniz.
            </p>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                  : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileSelect}
                className="hidden"
              />

              {formData.logoBase64 ? (
                <div className="space-y-3">
                  <div className="w-32 h-32 mx-auto rounded-2xl bg-white p-3 border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
                    <img
                      src={formData.logoBase64}
                      alt="Firma Logosu"
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-700">
                    Logoyu değiştirmek için tıklayın veya yeni dosya sürükleyin
                  </div>
                  <span className="inline-block text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium border border-emerald-200">
                    ✓ Özel Logo Yüklü
                  </span>
                </div>
              ) : (
                <div className="space-y-3 py-2">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                    <Upload className="w-8 h-8 stroke-[1.5]" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-800">
                      Logo Yüklemek İçin Tıklayın
                    </div>
                    <div className="text-[11px] text-slate-500">
                      veya dosyayı buraya sürükleyip bırakın
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    PNG, JPG, SVG veya WebP (Otomatik optimize edilir)
                  </div>
                </div>
              )}
            </div>

            {/* Logo Action Buttons */}
            {formData.logoBase64 && (
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLogo();
                    setFormData((prev) => ({ ...prev, logoBase64: '' }));
                    showNotification('Özel logo kaldırıldı, varsayılan logoya dönüldü.');
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Logoyu Kaldır</span>
                </button>
              </div>
            )}

            {/* Privacy notice box */}
            <div className="mt-5 p-3.5 bg-blue-50/70 border border-blue-200/70 rounded-2xl text-[11px] text-blue-900 leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-blue-800">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Gizlilik ve Güvenlik
              </div>
              <p className="text-blue-700">
                Yüklediğiniz logo ve girdiğiniz tüm bilgiler harici hiçbir sunucuya aktarılmaz; yalnızca mevcut web tarayıcınızın belleğinde saklanır.
              </p>
            </div>
          </div>

          {/* Quick Links / Navigation Cards to Project Outputs */}
          <div className={`p-6 rounded-3xl border shadow-sm ${isGray ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200'}`}>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Uygulanan Proje Bölümleri
            </h3>
            <div className="space-y-2">
              {[
                { tab: 'teklif', label: '4. Müşteri Teklif Çıktısı', icon: FileText, desc: 'Logo, antet, teklif numarası ve imza' },
                { tab: 'sozlesme', label: '5. Resmi Sözleşme Metni', icon: FileSignature, desc: 'Madde 1 Yüklenici bilgileri & kaşe alanı' },
                { tab: 'sartname', label: '6. Teknik Şartname', icon: Building2, desc: 'Antet ve yüklenici taahhüt bloğu' },
                { tab: 'raporlar', label: '7. Müteahhit Raporu', icon: BadgePercent, desc: 'Yetkili mühendis & şirket anteti' },
              ].map((item) => (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => onNavigateTab?.(item.tab)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100/80 text-left transition-colors group cursor-pointer border border-transparent hover:border-slate-200"
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-400">{item.desc}</div>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Company & Legal Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`p-6 sm:p-8 rounded-3xl border shadow-sm ${isGray ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Kurumsal & Ticari Bilgiler</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Resmi belgelerde, antetlerde ve sözleşme akitlerinde kullanılacak şirket kimliği
                </p>
              </div>
              <button
                type="button"
                onClick={handleManualSave}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Kaydet</span>
              </button>
            </div>

            <div className="space-y-6 text-xs">
              
              {/* Group 1: Temel Marka Bilgileri */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  1. Temel Marka & İsimlendirme
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Kısa Marka / Firma Adı *
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      placeholder="Örn: AB YAPI"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 font-semibold"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Üst logo yanında ve kısa başlıklarda görünür
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Slogan / Mottosu
                    </label>
                    <input
                      type="text"
                      value={formData.slogan}
                      onChange={(e) => handleInputChange('slogan', e.target.value)}
                      placeholder="Örn: Güvene Yükselen Yapılar"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Logo altında yer alan kurumsal motto
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Resmi Ticari Ünvan (Sözleşme & Faturalandırma) *
                    </label>
                    <input
                      type="text"
                      value={formData.legalName}
                      onChange={(e) => handleInputChange('legalName', e.target.value)}
                      placeholder="Örn: AB YAPI MÜTEAHHİTLİK İNŞAAT TİCARET LİMİTED ŞİRKETİ"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 font-medium"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Kentsel dönüşüm sözleşmesi 1. Madde Yüklenici başlığı ve imza bloğunda kullanılır
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Faaliyet Alanı / Alt Başlık Rozeti
                    </label>
                    <input
                      type="text"
                      value={formData.tagline}
                      onChange={(e) => handleInputChange('tagline', e.target.value)}
                      placeholder="Örn: Kentsel Dönüşüm & Danışmanlık"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Group 2: Yetkili Kişi & Temsil */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  2. Şirket Yetkilisi & İmza Sahibi
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Yetkili Adı ve Soyadı *
                    </label>
                    <input
                      type="text"
                      value={formData.authorizedPerson}
                      onChange={(e) => handleInputChange('authorizedPerson', e.target.value)}
                      placeholder="Örn: Müh. Alpaslan Beyoğlu"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Müteahhit kaşe ve imza altlığı olarak yazılır
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Yetkili Ünvanı / Mesleği
                    </label>
                    <input
                      type="text"
                      value={formData.authorizedTitle}
                      onChange={(e) => handleInputChange('authorizedTitle', e.target.value)}
                      placeholder="Örn: Müteahhit / Genel Müdür / İnşaat Mühendisi"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Group 3: İletişim & Lokasyon */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  3. İletişim & Şirket Adresi
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Telefon Numarası
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Örn: +90 (212) 585 10 20"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      E-Posta Adresi
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Örn: info@abyapi.com.tr"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Web Sitesi
                    </label>
                    <input
                      type="text"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="Örn: www.abyapi.com.tr"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tebligat & Şirket Merkez Adresi *
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Örn: Fatih Kocamustafapaşa Mah. İstanbul"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Group 4: Resmi Sicil & Vergi Kayıtları */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-3 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  4. Vergi Dairesi, Sicil & Banka Bilgileri
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Vergi Dairesi
                    </label>
                    <input
                      type="text"
                      value={formData.taxOffice}
                      onChange={(e) => handleInputChange('taxOffice', e.target.value)}
                      placeholder="Örn: Fatih V.D."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Vergi Numarası
                    </label>
                    <input
                      type="text"
                      value={formData.taxNumber}
                      onChange={(e) => handleInputChange('taxNumber', e.target.value)}
                      placeholder="Örn: 0010523491"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Ticaret Sicil No
                    </label>
                    <input
                      type="text"
                      value={formData.tradeRegistryNo || ''}
                      onChange={(e) => handleInputChange('tradeRegistryNo', e.target.value)}
                      placeholder="Örn: İTO-412580"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      MERSİS Numarası
                    </label>
                    <input
                      type="text"
                      value={formData.mersisNo || ''}
                      onChange={(e) => handleInputChange('mersisNo', e.target.value)}
                      placeholder="Örn: 0001052349100012"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Hakediş Banka Adı & Şubesi
                    </label>
                    <input
                      type="text"
                      value={formData.bankName || ''}
                      onChange={(e) => handleInputChange('bankName', e.target.value)}
                      placeholder="Örn: Ziraat Bankası A.Ş. / Fatih Şubesi"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Hakediş IBAN Numarası
                    </label>
                    <input
                      type="text"
                      value={formData.iban || ''}
                      onChange={(e) => handleInputChange('iban', e.target.value)}
                      placeholder="Örn: TR42 0001 0002 1234 5678 9050 01"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Save Button */}
            <div className="mt-8 pt-5 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Tüm değişiklikler anında kaydedilir ve tarayıcı oturumlarınızda korunur.
              </span>
              <button
                type="button"
                onClick={handleManualSave}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Profili Kaydet</span>
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
