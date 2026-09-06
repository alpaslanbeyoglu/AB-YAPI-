import React, { useState, useRef, useEffect } from 'react';
import {
  Building,
  Upload,
  Trash2,
  Save,
  CheckCircle2,
  UserCheck,
  Users,
  CreditCard,
  FileText,
  Phone,
  Mail,
  Globe,
  MapPin,
  RotateCcw,
  Download,
  UploadCloud,
  Stamp,
  Award,
  ShieldCheck,
  Briefcase,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { useCompanyProfile } from '../context/CompanyProfileContext';
import { AppTheme, CompanyProfile, CompanyProfilePrintOptions } from '../types';

interface CompanyProfileTabProps {
  theme?: AppTheme;
}

const AUTHORIZED_TITLE_PRESETS = [
  'Genel Müdür / İnşaat Mühendisi',
  'Yönetim Kurulu Başkanı',
  'Şirket Müdürü / Müteahhit',
  'İnşaat Yüksek Mühendisi / Proje Müdürü',
  'Mimar / Kentsel Dönüşüm Uzmanı',
  'Teknik Müdür / Başmühendis',
  'Şirket Yetkilisi & Temsilcisi',
];

const SECOND_TITLE_PRESETS = [
  'Şantiye Şefi / Mimar',
  'Proje & Statik Sorumlusu / İnşaat Mühendisi',
  'Teknik Müdür',
  'Hakediş & Keşif Uzmanı',
  'Müdür Yardımcısı',
  'Saha Denetim Sorumlusu',
];

export const CompanyProfileTab: React.FC<CompanyProfileTabProps> = ({ theme = 'light' }) => {
  const {
    profile,
    profiles,
    updateProfile,
    setLogo,
    removeLogo,
    setStamp,
    removeStamp,
    resetToDefault,
    importProfile,
    switchProfile,
    createNewProfile,
    deleteProfile
  } = useCompanyProfile();
  
  const [formData, setFormData] = useState<CompanyProfile>(profile);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Multi-profile state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyLegalName, setNewCompanyLegalName] = useState('');
  const [newAuthorizedPerson, setNewAuthorizedPerson] = useState('');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePrintOptionToggle = (key: keyof CompanyProfilePrintOptions) => {
    setFormData((prev) => ({
      ...prev,
      printOptions: {
        ...(prev.printOptions || {}),
        [key]: prev.printOptions?.[key] === false ? true : false,
      },
    }));
  };

  const handleSave = () => {
    updateProfile(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo boyutu 2 MB altında olmalıdır.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogo(base64);
        setFormData((prev) => ({ ...prev, logoBase64: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Kaşe görseli 2 MB altında olmalıdır.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setStamp(base64);
        setFormData((prev) => ({ ...prev, stampBase64: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${formData.companyName || 'firma'}_profili.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          importProfile(parsed);
          setFormData(parsed);
          alert('Firma profili başarıyla içe aktarıldı.');
        } catch (err) {
          alert('Geçersiz profil dosyası formatı!');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleCreateNewProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) {
      alert("Lütfen kısa firma adını giriniz.");
      return;
    }

    const nameExists = profiles.some(
      (p) => p.companyName.trim().toLowerCase() === newCompanyName.trim().toLowerCase()
    );
    if (nameExists) {
      alert(`"${newCompanyName.trim()}" isminde bir firma zaten kayıtlı! Lütfen başka bir isim giriniz.`);
      return;
    }

    const templateProfile: CompanyProfile = {
      ...profile, // Copy printOptions and other static settings
      companyName: newCompanyName.trim(),
      legalName: newCompanyLegalName.trim() || `${newCompanyName.trim()} MÜTEAHHİTLİK VE MÜHENDİSLİK LTD. ŞTİ.`,
      authorizedPerson: newAuthorizedPerson.trim() || 'Yeni Yetkili Kişi',
      logoBase64: '', // Start with blank logo for new firm
      stampBase64: '', // Start with blank stamp for new firm
    };

    createNewProfile(templateProfile);

    // Reset fields & close modal
    setNewCompanyName('');
    setNewCompanyLegalName('');
    setNewAuthorizedPerson('');
    setShowCreateModal(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
            <Building className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Firma & Yetkili Profili</h1>
            <p className="text-sm text-slate-500">
              Yazdırma, resmî teklif, sözleşme ve keşif raporlarında yer alacak kurumsal kimlik ve imza yetkilileri.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button
            onClick={handleExportJson}
            title="Yedekle / JSON İndir"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            <Download className="w-4 h-4" /> JSON İndir
          </button>
          <button
            onClick={() => jsonImportRef.current?.click()}
            title="Geri Yükle / JSON Yükle"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            <UploadCloud className="w-4 h-4" /> İçe Aktar
          </button>
          <input
            type="file"
            ref={jsonImportRef}
            onChange={handleImportJson}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => {
              if (confirm('Firma bilgileri fabrika ayarlarına döndürülecek. Emin misiniz?')) {
                resetToDefault();
              }
            }}
            title="Varsayılanlara Sıfırla"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition"
          >
            <RotateCcw className="w-4 h-4" /> Sıfırla
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition active:scale-95"
          >
            <Save className="w-4 h-4" /> Kaydet
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm font-medium animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Firma ve yetkili bilgileri başarıyla kaydedildi. Tüm teklif, rapor ve sözleşmeler otomatik güncellendi.</span>
        </div>
      )}

      {/* ========================================================
          MULTI-COMPANY PROFILE SWITCHING & REGISTRATION DECK
         ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Firma Kayıt ve Geçiş Havuzu</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Farklı ticari unvanlar veya konsorsiyum ortaklıkları tanımlayıp aralarında anında geçiş yapabilirsiniz. Aktif seçilen firma tüm teklif, sözleşme ve raporlara otomatik yansır.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Yeni Firma Kaydet
          </button>
        </div>

        {/* Profiles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((p) => {
            const isActive = p.companyName === profile.companyName;
            return (
              <div
                key={p.companyName}
                onClick={() => !isActive && switchProfile(p.companyName)}
                className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between group ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      {p.logoBase64 ? (
                        <img src={p.logoBase64} alt={p.companyName} className="h-6 max-w-[60px] object-contain rounded" />
                      ) : (
                        <div className="p-1.5 bg-slate-100 rounded text-slate-500">
                          <Building className="w-4 h-4" />
                        </div>
                      )}
                      <span className="font-bold text-xs text-slate-800 line-clamp-1">{p.companyName}</span>
                    </div>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" />
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2 min-h-[30px] leading-relaxed">{p.legalName}</p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-mono">Temsilci: {p.authorizedPerson || 'Belirtilmedi'}</span>
                  {profiles.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`"${p.companyName}" firmasını silmek istediğinizden emin misiniz?`)) {
                          deleteProfile(p.companyName);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                      title="Firmayı Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* NEW COMPANY REGISTRATION MODAL/OVERLAY */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn print:hidden">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl w-full max-w-md space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Yeni Firma Profil Kaydı</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                Kapat
              </button>
            </div>

            <form onSubmit={handleCreateNewProfileSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Kısa Firma Adı / Marka *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: AB GÜVEN YAPI"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-slate-50 focus:bg-white transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Tam Resmî Şirket Ünvanı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: AB GÜVEN YAPI TAAHHÜT MÜHENDİSLİK A.Ş."
                  value={newCompanyLegalName}
                  onChange={(e) => setNewCompanyLegalName(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-slate-50 focus:bg-white transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">İmza Yetkilisi / Temsilci Personel *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: İnş. Müh. Alpaslan Beyoğlu"
                  value={newAuthorizedPerson}
                  onChange={(e) => setNewAuthorizedPerson(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-slate-50 focus:bg-white transition"
                />
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
                <p className="text-[10px] text-indigo-900 leading-relaxed font-medium">
                  Yeni firma profili kaydedildiğinde mevcut adres, iletişim, banka ve vergi dairesi şablon bilgileri otomatik olarak kopyalanacaktır. Kayıt işleminden sonra bu alanları dilediğiniz gibi güncelleyebilirsiniz.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 rounded-lg transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
                >
                  Firma Kaydet ve Aktif Et
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT 2 COLS: FORMS */}
        <div className="lg:col-span-2 space-y-8">
          {/* 1. SECTION: RESMİ FİRMA BİLGİLERİ */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-2.5">
                <Building className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">1. Resmî Ticari & Kurumsal Bilgiler</h2>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer bg-slate-100 px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.printOptions?.showLegalName !== false}
                    onChange={() => handlePrintOptionToggle('showLegalName')}
                    className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300"
                  />
                  Unvan Göster
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer bg-slate-100 px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.printOptions?.showTaxInfo !== false}
                    onChange={() => handlePrintOptionToggle('showTaxInfo')}
                    className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300"
                  />
                  Vergi Bilgisi
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tam Ticari Ünvan (Resmî Şirket Adı) *
                </label>
                <input
                  type="text"
                  name="legalName"
                  value={formData.legalName || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: AB YAPI MÜTEAHHİTLİK VE MÜHENDİSLİK TİC. LTD. ŞTİ."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kısa Firma Adı (Marka) *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: AB YAPI"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Slogan / Motto
                </label>
                <input
                  type="text"
                  name="slogan"
                  value={formData.slogan || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: Depreme Dayanıklı, Güvenli ve Modern Yaşam Alanları"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Faaliyet Tanımı / Alt Başlık
                </label>
                <input
                  type="text"
                  name="tagline"
                  value={formData.tagline || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: Kentsel Dönüşüm, Statik Projelendirme ve Kat Karşılığı İnşaat Taahhüt"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Vergi Dairesi
                </label>
                <input
                  type="text"
                  name="taxOffice"
                  value={formData.taxOffice || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: Fatih Vergi Dairesi"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Vergi Numarası
                </label>
                <input
                  type="text"
                  name="taxNumber"
                  value={formData.taxNumber || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: 0010523491"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ticaret Sicil No
                </label>
                <input
                  type="text"
                  name="tradeRegistryNo"
                  value={formData.tradeRegistryNo || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: İTO-412580"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  MERSİS Numarası
                </label>
                <input
                  type="text"
                  name="mersisNo"
                  value={formData.mersisNo || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: 0001052349100012"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Müteahhitlik Yetki Belge No (YAMBİS)
                </label>
                <input
                  type="text"
                  name="contractorLicenceNo"
                  value={formData.contractorLicenceNo || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: YAMBİS: 0034125890"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Oda Sicil / Kayıt No
                </label>
                <input
                  type="text"
                  name="chamberNo"
                  value={formData.chamberNo || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: İTO Sicil No: 412580"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          {/* 2. SECTION: 1. YETKİLİ KİŞİ VE ÜNVANLARI */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">2. Birinci Yetkili & İmza Sahibi (Teklif / Sözleşme)</h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-800 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={formData.printOptions?.showFirstAuthorized !== false}
                  onChange={() => handlePrintOptionToggle('showFirstAuthorized')}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                />
                Çıktılarda Göster
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Yetkili Adı Soyadı *
                </label>
                <input
                  type="text"
                  name="authorizedPerson"
                  value={formData.authorizedPerson || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: Müh. Alpaslan Beyoğlu"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Oda / Meslek Sicil No
                </label>
                <input
                  type="text"
                  name="authorizedChamberNo"
                  value={formData.authorizedChamberNo || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: İMO-74120"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Yetkili Ünvanı *
                </label>
                <input
                  type="text"
                  name="authorizedTitle"
                  value={formData.authorizedTitle || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: Genel Müdür / İnşaat Mühendisi"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />

                {/* Quick Title Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-500 font-medium self-center mr-1">Hızlı Seç:</span>
                  {AUTHORIZED_TITLE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, authorizedTitle: preset }))}
                      className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition ${
                        formData.authorizedTitle === preset
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. SECTION: 2. YETKİLİ / ŞANTİYE ŞEFİ */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">3. İkinci Yetkili / Şantiye Şefi / Teknik Sorumlu (Opsiyonel)</h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-800 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={formData.printOptions?.showSecondAuthorized !== false}
                  onChange={() => handlePrintOptionToggle('showSecondAuthorized')}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                />
                Çıktılarda Göster
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  2. Yetkili Adı Soyadı
                </label>
                <input
                  type="text"
                  name="authorizedPerson2"
                  value={formData.authorizedPerson2 || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: Mimar / Şantiye Şefi (İsteğe Bağlı)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Oda / Meslek Sicil No
                </label>
                <input
                  type="text"
                  name="authorizedChamberNo2"
                  value={formData.authorizedChamberNo2 || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: MO-55210"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Yetkili Ünvanı
                </label>
                <input
                  type="text"
                  name="authorizedTitle2"
                  value={formData.authorizedTitle2 || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: Şantiye Şefi / Mimar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />

                {/* Quick Title Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-500 font-medium self-center mr-1">Hızlı Seç:</span>
                  {SECOND_TITLE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, authorizedTitle2: preset }))}
                      className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition ${
                        formData.authorizedTitle2 === preset
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. SECTION: İLETİŞİM & BANKA */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">4. İletişim, Adres ve Resmî Banka Hesabı</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Telefon Numarası
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleInputChange}
                    placeholder="+90 (212) 585 10 20"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kurumsal E-posta
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    placeholder="info@abyapi.com.tr"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Web Sitesi
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    name="website"
                    value={formData.website || ''}
                    onChange={handleInputChange}
                    placeholder="www.abyapi.com.tr"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Resmî Tebligat & Ofis Adresi
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    rows={2}
                    name="address"
                    value={formData.address || ''}
                    onChange={handleInputChange}
                    placeholder="Kocamustafapaşa Mah. Orgeneral Abdurrahman Nafiz Gürman Cad. No:42 Fatih / İSTANBUL"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Banka Adı & Şubesi
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName || ''}
                  onChange={handleInputChange}
                  placeholder="T.C. Ziraat Bankası A.Ş. (Fatih Şubesi)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  IBAN Numarası
                </label>
                <input
                  type="text"
                  name="iban"
                  value={formData.iban || ''}
                  onChange={handleInputChange}
                  placeholder="TR42 0001 0002 1234 5678 9050 01"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          {/* 5. SECTION: ÇIKTILARDA GÖRÜNECEK BİLGİ TERCİHLERİ */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">5. Çıktılarda Görünecek Bilgi Tercihleri</h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">Teklif ve sözleşme çıktıları için alan seçimi</span>
            </div>

            <p className="text-xs text-slate-600">
              Aşağıdaki anahtarları kullanarak resmî teklif, hakediş raporu ve sözleşme çıktıverinde hangi firma bilgilerinin ve yetkililerin yer alacağını özelleştirebilirsiniz.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { key: 'showLogo', label: 'Kurumsal Logo' },
                { key: 'showLegalName', label: 'Resmi Unvan' },
                { key: 'showSlogan', label: 'Firma Sloganı' },
                { key: 'showTagline', label: 'Alt Açıklama (Tagline)' },
                { key: 'showTaxInfo', label: 'Vergi Dairesi ve No' },
                { key: 'showTradeRegistry', label: 'Ticaret Sicil No' },
                { key: 'showMersis', label: 'MERSİS No' },
                { key: 'showContractorLicence', label: 'Müteahhitlik Yetki Belgesi' },
                { key: 'showChamberNo', label: 'Oda Sicil No' },
                { key: 'showFirstAuthorized', label: '1. Yetkili Kişi & Ünvanı' },
                { key: 'showFirstAuthorizedChamber', label: '1. Yetkili Oda Sicil' },
                { key: 'showSecondAuthorized', label: '2. Yetkili Kişi & Ünvanı' },
                { key: 'showSecondAuthorizedChamber', label: '2. Yetkili Oda Sicil' },
                { key: 'showStamp', label: 'Resmî Kaşe & İmza' },
                { key: 'showPhone', label: 'Telefon Numarası' },
                { key: 'showEmail', label: 'E-posta Adresi' },
                { key: 'showWebsite', label: 'Web Sitesi' },
                { key: 'showAddress', label: 'İş Adresi' },
                { key: 'showBankInfo', label: 'Banka & IBAN Bilgileri' },
                { key: 'showFloorAndFacade', label: 'Kat ve Cephe Bilgisi' },
                { key: 'showLandShareAndSerefiye', label: 'Arsa Payı & Şerefiye' },
              ].map((item) => {
                const isChecked = (formData.printOptions?.[item.key as keyof CompanyProfilePrintOptions] !== false);
                return (
                  <label
                    key={item.key}
                    className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                      isChecked
                        ? 'bg-indigo-50/50 border-indigo-200 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-400 opacity-75'
                    }`}
                  >
                    <span className="text-xs font-semibold">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handlePrintOptionToggle(item.key as keyof CompanyProfilePrintOptions)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT 1 COL: LOGO, STAMP & LIVE SIGNATURE PREVIEW */}
        <div className="space-y-6">
          {/* LOGO CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" /> Kurumsal Logo
              </span>
              <span className="text-[10px] text-slate-400 font-medium">PNG / JPG</span>
            </div>

            <div className="w-full h-36 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50 relative group">
              {formData.logoBase64 ? (
                <img
                  src={formData.logoBase64}
                  alt="Firma Logosu"
                  className="max-w-full max-h-full object-contain p-2"
                />
              ) : (
                <div className="text-center p-4 text-slate-400 space-y-1">
                  <Building className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-xs font-medium">Logo Yüklenmedi</p>
                  <p className="text-[10px] text-slate-400">Teklif antetinde metin olarak görünür</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold transition"
              >
                <Upload className="w-3.5 h-3.5" /> Logo Yükle
              </button>
              {formData.logoBase64 && (
                <button
                  type="button"
                  onClick={removeLogo}
                  className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs transition"
                  title="Logoyu Kaldır"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <input
                type="file"
                ref={logoInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>

          {/* STAMP / SIGNATURE CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Stamp className="w-4 h-4 text-emerald-600" /> Resmî Kaşe & İmza
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Saydam PNG</span>
            </div>

            <div className="w-full h-36 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50 relative group">
              {formData.stampBase64 ? (
                <img
                  src={formData.stampBase64}
                  alt="Dijital Kaşe & İmza"
                  className="max-w-full max-h-full object-contain p-2"
                />
              ) : (
                <div className="text-center p-4 text-slate-400 space-y-1">
                  <Stamp className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-xs font-medium">Kaşe / İmza Yüklenmedi</p>
                  <p className="text-[10px] text-slate-400">Raporlarda imza çizgisi görünür</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => stampInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition"
              >
                <Upload className="w-3.5 h-3.5" /> Kaşe/İmza Yükle
              </button>
              {formData.stampBase64 && (
                <button
                  type="button"
                  onClick={removeStamp}
                  className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs transition"
                  title="Kaşeyi Kaldır"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <input
                type="file"
                ref={stampInputRef}
                onChange={handleStampUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>

          {/* LIVE SIGNATURE PREVIEW */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Resmî Belge İmza Bloğu
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                Canlı Önizleme
              </span>
            </div>

            <div className="bg-white text-slate-900 rounded-xl p-4 space-y-3 text-xs shadow-inner">
              {formData.printOptions?.showLegalName !== false && (
                <div className="text-center font-bold text-slate-900 border-b border-slate-200 pb-2">
                  {formData.legalName || 'FİRMA ÜNVANI'}
                </div>
              )}

              <div className={`grid gap-3 pt-2 ${
                (formData.printOptions?.showFirstAuthorized !== false) && (formData.printOptions?.showSecondAuthorized !== false) && formData.authorizedPerson2
                  ? 'grid-cols-2'
                  : 'grid-cols-1'
              }`}>
                {formData.printOptions?.showFirstAuthorized !== false && (
                  <div className={`text-center ${formData.printOptions?.showSecondAuthorized !== false && formData.authorizedPerson2 ? 'border-r border-slate-200 pr-2' : ''}`}>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">1. İmza / Yetkili</p>
                    <p className="font-bold text-slate-900 mt-1">{formData.authorizedPerson || 'Yetkili Adı'}</p>
                    <p className="text-[10px] text-indigo-600 font-semibold leading-tight">{formData.authorizedTitle || 'Ünvan'}</p>
                    {formData.printOptions?.showFirstAuthorizedChamber !== false && formData.authorizedChamberNo && (
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">{formData.authorizedChamberNo}</p>
                    )}
                    {formData.printOptions?.showStamp !== false && formData.stampBase64 ? (
                      <img src={formData.stampBase64} alt="Kaşe" className="h-10 mx-auto mt-2 object-contain" />
                    ) : (
                      <div className="h-8 border-b border-dashed border-slate-300 mt-2 flex items-end justify-center text-[9px] text-slate-400">
                        (İmza / Kaşe)
                      </div>
                    )}
                  </div>
                )}

                {formData.printOptions?.showSecondAuthorized !== false && formData.authorizedPerson2 && (
                  <div className="text-center pl-2">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">2. İmza / Teknik</p>
                    <p className="font-bold text-slate-900 mt-1">{formData.authorizedPerson2}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold leading-tight">{formData.authorizedTitle2 || 'Teknik Ünvan'}</p>
                    {formData.printOptions?.showSecondAuthorizedChamber !== false && formData.authorizedChamberNo2 && (
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">{formData.authorizedChamberNo2}</p>
                    )}
                    <div className="h-8 border-b border-dashed border-slate-300 mt-2 flex items-end justify-center text-[9px] text-slate-400">
                      (İmza)
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" /> Tüm Değişiklikleri Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
