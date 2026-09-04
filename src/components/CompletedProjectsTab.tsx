import React, { useState, useEffect } from 'react';
import { Building2, Search, Plus, MapPin, Trash2, Printer, CheckCircle2 } from 'lucide-react';
import { AppTheme } from '../types';

interface ProjectItem {
  id: number;
  title: string;
  address: string;
  district: string;
  lat: string;
  lng: string;
  isOffice?: boolean;
}

const INITIAL_PROJECTS: ProjectItem[] = [
  { id: 1, title: "AB-YAPI Merkez Ofis", address: "Kocamustafapaşa Mah. İstanbul", district: "Fatih / İstanbul", lat: "41.004813", lng: "28.933724", isOffice: true },
  { id: 2, title: "Çınar Sokak No: 2", address: "Çınar Sk. No: 2, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.004768", lng: "28.933771" },
  { id: 3, title: "Çınar Sokak No: 14", address: "Çınar Sk. No: 14, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.005280", lng: "28.933787" },
  { id: 4, title: "Marmara Caddesi No: 64", address: "Marmara Cd. No: 64, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.002360", lng: "28.932800" },
  { id: 5, title: "Demirci Osman Sokak No: 9", address: "Demirci Osman Sk. No: 9, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.002884", lng: "28.932902" },
  { id: 6, title: "Demirci Osman Sokak No: 23", address: "Demirci Osman Sk. No: 23, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.002637", lng: "28.932571" },
  { id: 7, title: "Demirci Osman Sokak No: 25", address: "Demirci Osman Sk. No: 25, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.002561", lng: "28.932514" },
  { id: 8, title: "Demirci Osman Sokak No: 102", address: "Demirci Osman Sk. No: 102, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.000811", lng: "28.929924" },
  { id: 9, title: "Cambaziye Sokak No: 38", address: "Cambaziye Sk. No: 38, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.002848", lng: "28.932514" },
  { id: 10, title: "Cambaziye Sokak No: 46", address: "Cambaziye Sk. No: 46, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.002655", lng: "28.932836" },
  { id: 11, title: "Tütüncüzade Sokak No: 5", address: "Tütüncüzade Sk. No: 5, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.005046", lng: "28.934234" },
  { id: 12, title: "Kürkçübaşı Çeşmesi Sokak No: 42", address: "Kürkçübaşı Çeşmesi Sk. No: 42, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.005889", lng: "28.943891" },
  { id: 13, title: "Ahmet Hikmet Sokak No: 44", address: "Ahmet Hikmet Sk. No: 44, Fatih Mah.", district: "Fatih / İstanbul", lat: "41.008826", lng: "28.940347" },
  { id: 14, title: "Mecitbey Sokak No: 23", address: "Mecitbey Sk. No: 23, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.009681", lng: "28.929486" },
  { id: 15, title: "Zikirci Sokak No: 18", address: "Zikirci Sk. No: 18, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.009722", lng: "28.928867" },
  { id: 16, title: "Hacıhamza Sokak No: 7", address: "Hacıhamza Sk. No: 7, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.002207", lng: "28.924524" },
  { id: 17, title: "Silivrikapı Caddesi No: 69", address: "Silivrikapı Cd. No: 69, Silivrikapı Mah.", district: "Fatih / İstanbul", lat: "41.006614", lng: "28.925632" },
  { id: 18, title: "Yağhane Sokak Projesi", address: "Yağhane Sk., Silivrikapı Mah.", district: "Fatih / İstanbul", lat: "41.007388", lng: "28.925359" },
  { id: 19, title: "Yediemirler Sokak Projesi", address: "Yediemirler Sk., Silivrikapı Mah.", district: "Fatih / İstanbul", lat: "41.007206", lng: "28.925713" },
  { id: 20, title: "Sebzeci Sokak No: 20", address: "Sebzeci Sk. No: 20, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.004882", lng: "28.930022" },
  { id: 21, title: "Sebzeci Sokak No: 21", address: "Sebzeci Sk. No: 21, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.005019", lng: "28.929852" },
  { id: 22, title: "Ali Fakih Sokak No: 56", address: "Ali Fakih Sk. No: 56, Sümbül Efendi Mah.", district: "Fatih / İstanbul", lat: "41.002099", lng: "28.926823" }
];

interface CompletedProjectsTabProps {
  theme?: AppTheme;
}

export const CompletedProjectsTab: React.FC<CompletedProjectsTabProps> = ({ theme = 'light' }) => {
  const isGray = theme === 'gray';
  const cardBg = isGray ? 'bg-slate-200/50' : 'bg-white';
  const inputBg = isGray
    ? 'bg-white border-slate-300 focus:ring-slate-500/10 focus:border-slate-500'
    : 'bg-slate-50 border-slate-200 focus:ring-indigo-500/10 focus:border-indigo-500';

  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    try {
      const saved = localStorage.getItem('abyapi_completed_projects');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_PROJECTS;
  });

  const [companyProfile, setCompanyProfile] = useState({
    companyName: 'AB YAPI',
    slogan: 'GÜVENE YÜKSELEN YAPILAR',
    logoBase64: ''
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Add form fields
  const [newTitle, setNewTitle] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newDistrict, setNewDistrict] = useState('Fatih / İstanbul');
  const [newCoords, setNewCoords] = useState('');

  useEffect(() => {
    try {
      const storedStr = localStorage.getItem('ab_yapi_company_profile');
      if (storedStr) {
        const parsed = JSON.parse(storedStr);
        setCompanyProfile({
          companyName: parsed.companyName || 'AB YAPI',
          slogan: parsed.slogan || 'GÜVENE YÜKSELEN YAPILAR',
          logoBase64: parsed.logoBase64 || ''
        });
      }
    } catch (e) {}
  }, []);

  const saveToStorage = (updatedList: ProjectItem[]) => {
    try {
      localStorage.setItem('abyapi_completed_projects', JSON.stringify(updatedList));
    } catch (e) {}
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAddress.trim()) return;

    let lat = "41.0048";
    let lng = "28.9337";

    if (newCoords && newCoords.includes(',')) {
      const parts = newCoords.split(',');
      lat = parts[0].trim();
      lng = parts[1].trim();
    }

    const item: ProjectItem = {
      id: Date.now(),
      title: newTitle.trim(),
      address: newAddress.trim(),
      district: newDistrict.trim(),
      lat,
      lng,
      isOffice: false
    };

    const updated = [...projects, item];
    setProjects(updated);
    saveToStorage(updated);

    // Reset fields
    setNewTitle('');
    setNewAddress('');
    setNewCoords('');
  };

  const handleDeleteProject = (id: number) => {
    if (window.confirm("Bu projeyi listeden kaldırmak istediğinize emin misiniz?")) {
      const updated = projects.filter(p => p.id !== id);
      setProjects(updated);
      saveToStorage(updated);
    }
  };

  const filteredProjects = projects.filter(p => {
    const term = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(term) ||
      p.address.toLowerCase().includes(term) ||
      p.district.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* HEADER SECTION FOR PRINTING AND CONTROL */}
      <div className={`${cardBg} rounded-3xl border p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Tamamlanan Projelerimiz</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              AB YAPI tarafından başarıyla tamamlanmış ve teslim edilmiş kentsel dönüşüm referans projelerimiz.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Yazdır / PDF Al</span>
        </button>
      </div>

      {/* COMPACT PRINT-ONLY HEADER */}
      <div className="hidden print:block text-center space-y-3 pb-6 border-b border-slate-200">
        {companyProfile.logoBase64 ? (
          <div className="flex justify-center mb-2">
            <img src={companyProfile.logoBase64} alt={companyProfile.companyName} className="h-16 object-contain" referrerPolicy="no-referrer" />
          </div>
        ) : (
          <div className="flex justify-center mb-2">
            <img src="/logo.svg" alt="AB YAPI Logo" className="h-16 object-contain" referrerPolicy="no-referrer" />
          </div>
        )}
        <h1 className="text-2xl font-black text-slate-900">{companyProfile.companyName} A.Ş.</h1>
        <p className="text-[10px] font-mono tracking-widest text-indigo-600 uppercase font-bold">{companyProfile.slogan}</p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border text-[10px] font-bold text-slate-700">
          ✓ {filteredProjects.length} Tamamlanan Proje Listesi
        </div>
      </div>

      {/* FORM: ADD NEW COMPLETED PROJECT (no-print) */}
      <div className={`${cardBg} rounded-3xl border p-5 shadow-sm space-y-4 print:hidden`}>
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <span className="text-base">🏗️</span>
          <h4 className="text-xs font-extrabold text-slate-800">Yeni Tamamlanan Proje Ekle</h4>
        </div>
        <form onSubmit={handleAddProject} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Proje Başlığı / Apartman Adı</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Örn: Çınar Sk. No: 18"
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none transition-all ${inputBg}`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Açık Adres (Sokak & Kapı No)</label>
              <input
                type="text"
                required
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Örn: Çınar Sk. No: 18, Kocamustafapaşa"
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none transition-all ${inputBg}`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">İlçe / Şehir</label>
              <input
                type="text"
                required
                value={newDistrict}
                onChange={(e) => setNewDistrict(e.target.value)}
                placeholder="Örn: Fatih / İstanbul"
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none transition-all ${inputBg}`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Harita Koordinatları (Opsiyonel)</label>
              <input
                type="text"
                value={newCoords}
                onChange={(e) => setNewCoords(e.target.value)}
                placeholder="Örn: 41.0047, 28.9337"
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none transition-all ${inputBg}`}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/15"
            >
              <Plus className="w-4 h-4" />
              <span>Projeyi Listeye Ekle</span>
            </button>
          </div>
        </form>
      </div>

      {/* SEARCH AND COUNT BADGE (no-print) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sokak adı, proje başlığı veya ilçe ara..."
            className={`w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border outline-none transition-all ${inputBg}`}
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-xs font-bold self-start sm:self-auto">
          <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse shrink-0"></span>
          <span>{filteredProjects.length} Kayıt Gösteriliyor</span>
        </div>
      </div>

      {/* LIST OF COMPLETED PROJECTS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 print:grid-cols-2 print:gap-4">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((p) => {
            const isOffice = p.isOffice;
            const badgeStyle = isOffice
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200';
            const badgeLabel = isOffice ? '📍 Merkez Ofis' : '✓ Tamamlandı';

            return (
              <div
                key={p.id}
                className={`${cardBg} rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between`}
              >
                <div className="space-y-3">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[9px] font-bold tracking-widest uppercase ${badgeStyle}`}>
                    {badgeLabel}
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight leading-tight">{p.title}</h4>
                  
                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1.5 leading-relaxed">
                    <div className="flex items-start gap-1.5">
                      <span className="text-indigo-600 font-bold shrink-0">📍 Adres:</span>
                      <span className="break-words">{p.address}</span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200/40">
                      <span className="text-slate-400 font-bold shrink-0">🏢 Bölge:</span>
                      <span className="font-semibold text-slate-700">{p.district}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100/80 print:hidden">
                  <a
                    href={`https://maps.google.com/?q=${p.lat},${p.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-xl transition border border-slate-200/60 shadow-2xs"
                  >
                    Haritada Aç ↗
                  </a>
                  {!isOffice && (
                    <button
                      type="button"
                      onClick={() => handleDeleteProject(p.id)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition border border-rose-100/60 cursor-pointer"
                      title="Projeyi Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            Arama kriterlerine uygun tamamlanmış proje kaydı bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
};
