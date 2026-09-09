import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  HardHat,
  Users,
  FileText,
  Smartphone,
  Monitor,
  CheckCircle2,
  Clock,
  Send,
  Copy,
  Phone,
  MessageCircle,
  Camera,
  Plus,
  ChevronRight,
  TrendingUp,
  Building2,
  Calendar,
  Layers,
  Share2,
  Save,
  Check,
  AlertCircle,
  Search,
  Filter,
  ArrowRightLeft,
  DollarSign,
  Briefcase
} from 'lucide-react';
import {
  ProjectParams,
  CalculationResult,
  AppTheme,
  FlatItem,
  ConstructionStage,
  ConstructionStageStatus,
  ConstructionProgressLog,
  CompanyProfile
} from '../types';
import { useCompanyProfile } from '../context/CompanyProfileContext';
import { Logo } from './Logo';
import { CompactSummaryBar } from './CompactSummaryBar';

interface LiteMobileViewProps {
  params: ProjectParams;
  results: CalculationResult;
  onChangeParams: (updates: Partial<ProjectParams>) => void;
  onSwitchToFull: () => void;
  theme: AppTheme;
  onToggleTheme: () => void;
  onQuickSave: () => void;
  isSavingToDrive: boolean;
}

type LiteTab = 'hesapla' | 'santiye' | 'malikler' | 'teklif';

export const LiteMobileView: React.FC<LiteMobileViewProps> = ({
  params,
  results,
  onChangeParams,
  onSwitchToFull,
  theme,
  onToggleTheme,
  onQuickSave,
  isSavingToDrive,
}) => {
  const { profile } = useCompanyProfile();
  const isGray = theme === 'gray';

  // Sub-tab selection inside Lite
  const [activeTab, setActiveTab] = useState<LiteTab>('hesapla');

  // Search in owners
  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'signed' | 'pending' | 'contractor'>('all');

  // Project safe key for localStorage stages & logs
  const safeProjectKey = (params.projectAddress || 'default_project').replace(/[^a-zA-Z0-9]/g, '_');

  // Stages State (synced with full version)
  const [stages, setStages] = useState<ConstructionStage[]>(() => {
    try {
      const saved = localStorage.getItem(safeProjectKey + '_construction_stages');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    return [
      { id: 'st_1', order: 1, name: '1. Proje & Ruhsat Onayı', category: 'proje_ruhsat', progressPercent: 100, status: 'completed', weightPercent: 8, notes: 'Ruhsat alındı.' },
      { id: 'st_2', order: 2, name: '2. Yıkım & Güvenlik', category: 'proje_ruhsat', progressPercent: 100, status: 'completed', weightPercent: 6, notes: 'Yıkım tamamlandı.' },
      { id: 'st_3', order: 3, name: '3. Hafriyat & İksa', category: 'kaba_yapi', progressPercent: 100, status: 'completed', weightPercent: 7, notes: 'Temel kazısı bitti.' },
      { id: 'st_4', order: 4, name: '4. Radye Temel & Yalıtım', category: 'kaba_yapi', progressPercent: 100, status: 'completed', weightPercent: 12, notes: 'Beton döküldü.' },
      { id: 'st_5', order: 5, name: '5. Bodrum & Zemin Karkas', category: 'kaba_yapi', progressPercent: 80, status: 'in_progress', weightPercent: 12, notes: 'Kalıp işleri devam ediyor.' },
      { id: 'st_6', order: 6, name: '6. Normal Katlar Karkas', category: 'kaba_yapi', progressPercent: 20, status: 'in_progress', weightPercent: 15, notes: 'Kat tabliyeleri sürdürülüyor.' },
      { id: 'st_7', order: 7, name: '7. Çatı Yapımı & Yalıtım', category: 'kaba_yapi', progressPercent: 0, status: 'pending', weightPercent: 6, notes: 'Planlama aşamasında.' },
      { id: 'st_8', order: 8, name: '8. Duvar & Elektrik-Mekanik', category: 'ince_yapi', progressPercent: 0, status: 'pending', weightPercent: 10, notes: 'Altyapı bekleniyor.' },
      { id: 'st_9', order: 9, name: '9. Sıva, Şap & Dış Cephe', category: 'ince_yapi', progressPercent: 0, status: 'pending', weightPercent: 10, notes: 'Kaba sonrası başlayacak.' },
      { id: 'st_10', order: 10, name: '10. İnce İmalatlar & Mobilya', category: 'ince_yapi', progressPercent: 0, status: 'pending', weightPercent: 8, notes: 'Daire içi işler.' },
      { id: 'st_11', order: 11, name: '11. Çevre Düzenleme & Testler', category: 'teslim_iskan', progressPercent: 0, status: 'pending', weightPercent: 3, notes: 'Peyzaj ve testler.' },
      { id: 'st_12', order: 12, name: '12. İskan & Daire Teslimi', category: 'teslim_iskan', progressPercent: 0, status: 'pending', weightPercent: 3, notes: 'Anahtar teslim.' },
    ];
  });

  // Calculate overall progress from weighted stages
  const overallProgress = useMemo(() => {
    const totalWeight = stages.reduce((acc, s) => acc + (s.weightPercent || 1), 0);
    const weightedSum = stages.reduce((acc, s) => acc + (s.progressPercent * (s.weightPercent || 1)), 0);
    return Math.round(weightedSum / (totalWeight || 1));
  }, [stages]);

  // Save stages when modified
  const handleUpdateStageProgress = (stageId: string, newPct: number) => {
    const clamped = Math.min(100, Math.max(0, newPct));
    setStages(prev => {
      const next = prev.map(s => {
        if (s.id === stageId) {
          const status = (clamped === 100 ? 'completed' : clamped > 0 ? 'in_progress' : 'not_started') as ConstructionStageStatus;
          return { ...s, progressPercent: clamped, status };
        }
        return s;
      });
      try {
        localStorage.setItem(safeProjectKey + '_construction_stages', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // WhatsApp broadcast state
  const [copySuccess, setCopySuccess] = useState(false);

  // New quick note in field
  const [quickNote, setQuickNote] = useState('');
  const [fieldPhoto, setFieldPhoto] = useState<string | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);

  // Contractor flat count calculation
  const contractorFlatsCount = useMemo(() => {
    if (results.flatResults && results.flatResults.length > 0) {
      const count = results.flatResults.filter(f => f.isContractorShare).length;
      if (count > 0) return count;
    }
    if (params.projectModel === 'contractorShare') {
      return Math.round((results.flatCount || 10) * ((params.contractorShareRate || 50) / 100));
    }
    return 0;
  }, [results.flatResults, results.flatCount, params.projectModel, params.contractorShareRate]);

  // Synchronized parameter step handlers
  const handleUpdateFloorCount = (delta: number) => {
    const nextCount = Math.max(1, (params.floorCount || 5) + delta);
    onChangeParams({
      floorCount: nextCount,
    });
  };

  const handleUpdateFlatsPerFloor = (delta: number) => {
    const nextFpf = Math.max(1, (params.flatsPerFloor || 2) + delta);
    onChangeParams({
      flatsPerFloor: nextFpf,
    });
  };

  const handleToggleShop = (hasShop: boolean) => {
    onChangeParams({
      hasGroundFloorShop: hasShop,
    });
  };

  const handleUpdateRoofType = (roof: 'flat' | 'gable' | 'duplex' | 'mansard') => {
    onChangeParams({
      roofType: roof,
    });
  };

  const handleSaveQuickNote = () => {
    if (!quickNote.trim()) return;
    try {
      const savedLogs = localStorage.getItem(safeProjectKey + '_construction_logs');
      const logs = savedLogs ? JSON.parse(savedLogs) : [];
      const newLog: ConstructionProgressLog = {
        id: 'log_' + Date.now(),
        date: new Date().toISOString().slice(0, 10),
        periodType: 'weekly',
        periodLabel: 'Mobil Saha Notu',
        title: quickNote.slice(0, 50),
        overallProgress,
        completedWork: quickNote,
        plannedNextWork: 'Saha kontrolleri devam ediyor.',
        workDaysCount: 6,
        weatherStatus: 'Açık / Şantiye şartları uygun',
        isSharedWithClients: true,
        photoUrls: fieldPhoto ? [fieldPhoto] : undefined
      };
      logs.unshift(newLog);
      localStorage.setItem(safeProjectKey + '_construction_logs', JSON.stringify(logs));
      setQuickNote('');
      setFieldPhoto(null);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2500);
    } catch (e) {}
  };

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Generate WhatsApp text
  const generateWhatsAppBroadcast = () => {
    const compName = profile.companyName || 'AB YAPI';
    const projName = params.projectAddress || 'Kentsel Dönüşüm Projemiz';
    const todayStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

    const totalBars = 10;
    const filled = Math.min(totalBars, Math.max(0, Math.round((overallProgress / 100) * totalBars)));
    const bar = '▓'.repeat(filled) + '░'.repeat(totalBars - filled);

    const activeStage = stages.find(s => s.status === 'in_progress') || stages[0];

    return `🏗️ *${compName.toUpperCase()} - ŞANTİYE İLERLEME RAPORU*\n` +
      `📍 *Proje:* ${projName}\n` +
      `📅 *Tarih:* ${todayStr}\n\n` +
      `Sayın Kat Maliklerimiz,\n` +
      `Binamızın kentsel dönüşüm inşaatında güncel ilerleme durumu:\n\n` +
      `📊 *Fiziki İlerleme:* [${bar}] *%${overallProgress}*\n` +
      `🔨 *Aktif Aşama:* ${activeStage?.name || 'Kaba Yapı'}\n` +
      `⏱️ *Hedef Teslim:* ${results.finalMonths || 18} Ay\n\n` +
      `Şantiyemizdeki tüm imalatlar deprem yönetmeliği ve yapı denetim standartlarına tam uyumlu olarak sürdürülmektedir.\n\n` +
      `*${compName} Şantiye Yönetimi*\n` +
      `📞 ${profile.phone || '+90 (212) 585 10 20'}`;
  };

  const handleSendWhatsApp = () => {
    const text = encodeURIComponent(generateWhatsAppBroadcast());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(generateWhatsAppBroadcast());
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Toggle owner status
  const handleToggleOwnerStatus = (flatId: number) => {
    const currentFlats = params.flats || [];
    const flat = currentFlats.find(f => f.id === flatId);
    if (!flat) return;

    // Cycle through: signed -> pending -> objection -> signed
    const currentDesc = flat.description || '';
    let nextDesc = '';
    if (!currentDesc || currentDesc.includes('İmzalandı')) {
      nextDesc = 'Görüşülüyor / Bekliyor';
    } else if (currentDesc.includes('Görüşülüyor')) {
      nextDesc = 'İtiraz / Şartlı';
    } else {
      nextDesc = 'Sözleşme İmzalandı';
    }

    const updated = currentFlats.map(f => f.id === flatId ? { ...f, description: nextDesc } : f);
    onChangeParams({ flats: updated });
  };

  // Filtered flats
  const filteredFlats = useMemo(() => {
    const list = params.flats || [];
    return list.filter(flat => {
      const nameMatch = (flat.name || '').toLowerCase().includes(ownerSearch.toLowerCase()) ||
        String(flat.id).includes(ownerSearch);
      if (!nameMatch) return false;

      if (ownerFilter === 'signed') return (flat.description || '').includes('İmzalandı');
      if (ownerFilter === 'pending') return (flat.description || '').includes('Görüşülüyor') || !flat.description;
      if (ownerFilter === 'contractor') return !!flat.isContractorShare;
      return true;
    });
  }, [params.flats, ownerSearch, ownerFilter]);

  // Card background styling based on theme
  const cardBg = isGray ? 'bg-white/90 border-slate-300' : 'bg-white border-slate-200';

  return (
    <div className={`min-h-screen pb-24 font-sans ${isGray ? 'bg-slate-200 text-slate-900' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* ------------------------------------------------------------- */}
      {/* TOP STICKY BAR: LOGO, QUICK ACTIONS, CONVERSION BUTTON        */}
      {/* ------------------------------------------------------------- */}
      <div className={`sticky top-0 z-40 backdrop-blur-md border-b px-3 py-2.5 flex items-center justify-between shadow-xs ${
        isGray ? 'bg-slate-100/95 border-slate-300' : 'bg-white/95 border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <Logo size="sm" theme={theme} />
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-indigo-600 text-white shadow-xs">
            LİTE
          </span>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1.5">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className={`p-2 rounded-xl border text-xs font-bold transition active:scale-95 ${
              isGray ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title="Temayı Değiştir"
          >
            {isGray ? '☀️' : '🎨'}
          </button>

          {/* Quick save */}
          <button
            type="button"
            onClick={onQuickSave}
            disabled={isSavingToDrive}
            className="p-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 disabled:opacity-50"
            title="Google Drive Kaydet"
          >
            {isSavingToDrive ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
          </button>

          {/* PROMINENT SWITCH TO FULL / DESKTOP BUTTON */}
          <button
            type="button"
            onClick={onSwitchToFull}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-black shadow-sm transition cursor-pointer"
            title="Gelişmiş Masaüstü ve 3D Modeline Geç"
          >
            <Monitor className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tam Sürüm</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PERSISTENT CONVERSION BANNER (CLEAR PROMPT)                   */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white px-4 py-2 text-xs flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-[11px] leading-tight">
            Mobil Hızlı Kullanım Modundasınız
          </span>
        </div>
        <button
          type="button"
          onClick={onSwitchToFull}
          className="flex items-center gap-1 text-[11px] font-black text-amber-300 hover:text-amber-200 underline cursor-pointer shrink-0"
        >
          <span>3D & Detaylı Sözleşmeye Dön &rarr;</span>
        </button>
      </div>

      <CompactSummaryBar results={results} params={params} theme={theme} />

      {/* ------------------------------------------------------------- */}
      {/* PROJECT HEADER CARD                                           */}
      {/* ------------------------------------------------------------- */}
      <div className="p-3">
        <div className={`${cardBg} rounded-2xl border p-4 shadow-xs space-y-3`}>
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 flex-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 block">
                Aktif Proje
              </span>
              <input
                type="text"
                value={params.projectAddress || ''}
                onChange={(e) => onChangeParams({ projectAddress: e.target.value })}
                placeholder="Örn: Kadıköy Moda Kentsel Dönüşüm"
                className="w-full text-sm font-black text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-600 outline-none pb-0.5"
              />
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Süre</span>
              <span className="text-xs font-black text-indigo-700">{results.finalMonths || 18} Ay</span>
            </div>
          </div>

          {/* Quick KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-500 block">Toplam İnşaat</span>
              <span className="text-xs font-black text-slate-900">{Math.round(results.totalArea || 0)} m²</span>
            </div>

            <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/70">
              <span className="text-[10px] font-bold text-emerald-800 block">Toplam Maliyet</span>
              <span className="text-xs font-black text-emerald-700">{formatCurrency(results.grandTotal)}</span>
            </div>

            <div className="p-2 rounded-xl bg-indigo-50/80 border border-indigo-200/70">
              <span className="text-[10px] font-bold text-indigo-800 block">Daire Başı</span>
              <span className="text-xs font-black text-indigo-700">
                {formatCurrency(results.flatCount ? results.grandTotal / results.flatCount : 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTENT BASED ON ACTIVE LITE TAB                         */}
      {/* ------------------------------------------------------------- */}
      <div className="px-3 space-y-4">

        {/* =========================================================== */}
        {/* TAB 1: ⚡ HESAPLA (HIZLI MOBİL METRAJ & MALİYET MOTORU)       */}
        {/* =========================================================== */}
        {activeTab === 'hesapla' && (
          <div className="space-y-4">
            {/* Quick Param Adjustment Steppers */}
            <div className={`${cardBg} rounded-2xl border p-4 shadow-xs space-y-4`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-indigo-600" />
                  <span>Hızlı Metraj & Kat Ayarları</span>
                </h3>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Anlık Hesaplama
                </span>
              </div>

              {/* Stepper: Kat Sayısı */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <div>
                  <span className="text-xs font-extrabold text-slate-800 block">Toplam Kat Sayısı</span>
                  <span className="text-[10px] text-slate-500">Zemin + Normal Katlar</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateFloorCount(-1)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 active:scale-95 shadow-xs flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-black text-sm text-indigo-900">{params.floorCount || 5}</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateFloorCount(1)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 active:scale-95 shadow-xs flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Stepper: Katta Daire Sayısı */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <div>
                  <span className="text-xs font-extrabold text-slate-800 block">Katta Daire Sayısı</span>
                  <span className="text-[10px] text-slate-500">Her katta kaç daire var</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateFlatsPerFloor(-1)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 active:scale-95 shadow-xs flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-black text-sm text-indigo-900">{params.flatsPerFloor || 2}</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateFlatsPerFloor(1)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 active:scale-95 shadow-xs flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Numeric Input: Taban Alanı */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <label className="text-xs font-extrabold text-slate-800 block mb-1">Taban Oturumu (m²)</label>
                <input
                  type="number"
                  value={params.baseBuildArea || ''}
                  onChange={(e) => onChangeParams({ baseBuildArea: Number(e.target.value) || 0 })}
                  placeholder="Örn: 180"
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                />
              </div>

              {/* Quick Toggle: Zemin Kat Dükkan */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <div>
                  <span className="text-xs font-extrabold text-slate-800 block">Zemin Kat Dükkan / Ticari</span>
                  <span className="text-[10px] text-slate-500">Zemin katta cadde dükkanı var mı?</span>
                </div>
                <input
                  type="checkbox"
                  checked={!!params.hasGroundFloorShop}
                  onChange={(e) => handleToggleShop(e.target.checked)}
                  className="w-5 h-5 rounded text-indigo-600 cursor-pointer"
                />
              </div>

              {params.hasGroundFloorShop && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <label className="text-xs font-extrabold text-slate-800 block mb-1">Dükkan Adeti</label>
                  <input
                    type="number"
                    value={params.shopCount || ''}
                    onChange={(e) => onChangeParams({ shopCount: Number(e.target.value) || 0 })}
                    placeholder="Örn: 2"
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              )}

              {/* Quick Select: Çatı Tipi */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase block">Çatı Tipi & İmar Durumu</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'flat', label: 'Düz Çatı' },
                    { id: 'gable', label: 'Beşik Çatı' },
                    { id: 'duplex', label: 'Dubleks' },
                    { id: 'mansard', label: 'Mansart' },
                  ].map((roof) => (
                    <button
                      key={roof.id}
                      type="button"
                      onClick={() => handleUpdateRoofType(roof.id as any)}
                      className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition text-center cursor-pointer ${
                        params.roofType === roof.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {roof.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={`${cardBg} rounded-2xl border p-4 shadow-xs space-y-4`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Birim Maliyet Ayarları</span>
                </h3>
              </div>

              {/* Birim m2 Maliyeti Hızlı Butonlar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">
                    m² İnşaat Birim Maliyeti (₺/m²)
                  </label>
                  <span className="text-xs font-black text-indigo-700">
                    {formatCurrency(params.manualFlatUnitPrice || results.grossCostPerSqM)}/m²
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[18500, 21000, 24000, 27500].map((cost) => (
                    <button
                      key={cost}
                      type="button"
                      onClick={() => onChangeParams({ manualFlatUnitPrice: cost })}
                      className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border transition cursor-pointer text-center ${
                        params.manualFlatUnitPrice === cost
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {cost / 1000}k ₺
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={params.manualFlatUnitPrice || ''}
                  onChange={(e) => onChangeParams({ manualFlatUnitPrice: Number(e.target.value) || 0 })}
                  placeholder="Manuel Maliyet Girişi (Örn: 23500)"
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white mt-1"
                />
              </div>
            </div>

            {/* Mini Finansal Döküm */}
            <div className={`${cardBg} rounded-2xl border p-4 shadow-xs space-y-2.5`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Hızlı Maliyet Dağılımı Özeti
                </h4>
                <span className="text-[11px] font-mono font-bold text-indigo-700">
                  {formatCurrency(results.grossCostPerSqM)}/m²
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Kaba İnşaat (Beton, Demir, Duvar)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(results.kabaTotalCost)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">İnce İmalatlar & Cephe</span>
                  <span className="font-bold text-slate-900">{formatCurrency(results.finishingTotalCost)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Elektrik, Sıhhi & Mekanik Tesisat</span>
                  <span className="font-bold text-slate-900">{formatCurrency(results.systemsCost)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Proje, SGK & Ruhsat Harçları</span>
                  <span className="font-bold text-slate-900">{formatCurrency(results.officialCost + results.sgkSalesCost)}</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 font-black text-emerald-800 text-sm">
                  <span>TOPLAM PROJE MALİYETİ</span>
                  <span className="text-indigo-700 font-mono text-sm">{formatCurrency(results.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================== */}
        {/* TAB 2: 🏗️ ŞANTİYE (SAHA İLERLEME & WHATSAPP BÜLTENİ)         */}
        {/* =========================================================== */}
        {activeTab === 'santiye' && (
          <div className="space-y-4">
            {/* Overall Progress Gauge Card */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300 block">Şantiye Durumu</span>
                  <h3 className="text-base font-black">Genel Fiziki Gerçekleşme</h3>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/50 border border-indigo-400/40 flex items-center justify-center text-xl font-black text-white">
                  %{overallProgress}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-700/60 rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>

              {/* Quick WhatsApp Share Action */}
              <div className="pt-2 border-t border-slate-700 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp ile Maliklere Gönder</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  className="py-2.5 px-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  title="Metni Kopyala"
                >
                  {copySuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Hızlı Saha Notu & Fotoğraf Ekleme (Şantiyede Kamerayla) */}
            <div className={`${cardBg} rounded-2xl border p-4 shadow-xs space-y-3`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>Hızlı Saha Günlüğü & Fotoğraf</span>
                </h4>
                {noteSaved && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" /> Kaydedildi
                  </span>
                )}
              </div>

              <textarea
                rows={2}
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Bugün şantiyede ne yapıldı? (Örn: 2. kat kolon demirleri bağlandı ve beton döküldü)"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white transition outline-none"
              />

              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{fieldPhoto ? 'Fotoğraf Seçildi' : 'Fotoğraf Çek / Ekle'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setFieldPhoto(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleSaveQuickNote}
                  disabled={!quickNote.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl cursor-pointer active:scale-95 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Günlüğe Kaydet</span>
                </button>
              </div>

              {fieldPhoto && (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-32">
                  <img src={fieldPhoto} alt="Saha Görseli" className="w-full h-32 object-cover" />
                  <button
                    type="button"
                    onClick={() => setFieldPhoto(null)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center text-xs"
                  >
                    &times;
                  </button>
                </div>
              )}
            </div>

            {/* 12 Ana İnşaat Aşaması (Hızlı İlerleme Düzenleme) */}
            <div className={`${cardBg} rounded-2xl border p-4 shadow-xs space-y-3`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <HardHat className="w-4 h-4 text-indigo-600" />
                  <span>12 İnşaat Aşaması</span>
                </h4>
                <span className="text-[10px] text-slate-400 font-bold">Dokunarak İlerletin</span>
              </div>

              <div className="space-y-2.5">
                {stages.map((stage) => (
                  <div
                    key={stage.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">{stage.name}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        stage.progressPercent === 100
                          ? 'bg-emerald-100 text-emerald-800'
                          : stage.progressPercent > 0
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        %{stage.progressPercent}
                      </span>
                    </div>

                    {/* Progress slider bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          stage.progressPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${stage.progressPercent}%` }}
                      />
                    </div>

                    {/* Steppers: -10%, +10%, %100 */}
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateStageProgress(stage.id, stage.progressPercent - 10)}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-[10px] font-bold text-slate-700 active:scale-95"
                      >
                        -10%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStageProgress(stage.id, stage.progressPercent + 10)}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-[10px] font-bold text-slate-700 active:scale-95"
                      >
                        +10%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStageProgress(stage.id, 100)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black active:scale-95"
                      >
                        Tamamlandı ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================== */}
        {/* TAB 3: 👥 MALİKLER (HAK SAHİPLERİ, İLETİŞİM, DURUM)         */}
        {/* =========================================================== */}
        {activeTab === 'malikler' && (
          <div className="space-y-4">
            <div className={`${cardBg} rounded-2xl border p-4 shadow-xs space-y-3`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Kat Malikleri & Daireler</span>
                </h3>
                <span className="text-xs font-extrabold text-indigo-700 font-mono">
                  {filteredFlats.length} / {params.flats?.length || 0} Daire
                </span>
              </div>

              {/* Search & Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={ownerSearch}
                    onChange={(e) => setOwnerSearch(e.target.value)}
                    placeholder="İsim veya Daire No ile ara..."
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white transition outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {[
                    { id: 'all', label: 'Tümü' },
                    { id: 'signed', label: 'İmzalayanlar' },
                    { id: 'pending', label: 'Bekleyenler' },
                    { id: 'contractor', label: 'Müteahhit Payı' },
                  ].map((flt) => (
                    <button
                      key={flt.id}
                      type="button"
                      onClick={() => setOwnerFilter(flt.id as any)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                        ownerFilter === flt.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {flt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Flats List */}
              <div className="space-y-2.5 pt-1">
                {filteredFlats.map((flat) => {
                  const isSigned = (flat.description || '').includes('İmzalandı');
                  const isObjection = (flat.description || '').includes('İtiraz');
                  const flatRes = results.flatResults?.find(fr => fr.id === flat.id);

                  return (
                    <div
                      key={flat.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                              {flat.id}
                            </span>
                            <span className="text-xs font-black text-slate-900">
                              {flat.name || `Kat Maliki ${flat.id}`}
                            </span>
                            {flat.isContractorShare && (
                              <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                Müteahhit
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[11px] text-slate-500">
                              {flat.area || 95} m² &bull; Kat {flat.floorNumber ?? Math.ceil(flat.id / 2)}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                              {flat.isContractorShare
                                ? 'Finansman (Müteahhit)'
                                : params.projectModel === 'contractorShare'
                                ? 'Kat Karşılığı (0 TL Borç)'
                                : `Maliyet: ${formatCurrency(flatRes?.netRemainingDebt || 0)}`}
                            </span>
                          </div>
                        </div>

                        {/* Status badge - clickable to toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleOwnerStatus(flat.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide cursor-pointer transition ${
                            isSigned
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isObjection
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {isSigned ? '✓ İmzalandı' : isObjection ? '✕ İtirazlı' : '⏳ Bekliyor'}
                        </button>
                      </div>

                      {/* Action buttons: Call, WhatsApp */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {flat.tc ? `TC: ${flat.tc.slice(0, 3)}***` : 'TC Girilmedi'}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              window.location.href = `tel:+905320000000`;
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-slate-100 active:scale-95"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>Ara</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const msg = encodeURIComponent(
                                `Sayın ${flat.name || 'Kat Malikimiz'}, ${params.projectAddress || 'Projemiz'} inşaat ilerleme ve sözleşme süreci hakkında bilgilendirme:`
                              );
                              window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-300 rounded-lg text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 active:scale-95"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                            <span>WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================== */}
        {/* TAB 4: 📄 TEKLİF (MÜŞTERİ TEKLİF KARTI & PAYLAŞIM)          */}
        {/* =========================================================== */}
        {activeTab === 'teklif' && (
          <div className="space-y-4">
            {/* Customer Presentation Card */}
            <div className={`${cardBg} rounded-3xl border p-5 shadow-sm space-y-4`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                    Resmî Teklif Özeti
                  </span>
                  <h3 className="text-base font-black text-slate-900">
                    {profile.companyName || 'AB YAPI'}
                  </h3>
                </div>
                <Logo size="sm" theme={theme} />
              </div>

              {/* Project specs */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Proje Adresi:</span>
                  <span className="font-bold text-slate-900 text-right">{params.projectAddress || 'İstanbul'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Arsa Alanı:</span>
                  <span className="font-bold text-slate-900">{params.landArea || 0} m²</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Toplam İnşaat Alanı:</span>
                  <span className="font-bold text-slate-900">{Math.round(results.totalArea || 0)} m²</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Bağımsız Bölüm Sayısı:</span>
                  <span className="font-bold text-slate-900">
                    {results.flatCount || 0} Adet {params.projectModel === 'contractorShare' ? `(${contractorFlatsCount} Müteahhit / ${Math.max(0, (results.flatCount || 0) - contractorFlatsCount)} Malik)` : ''}
                  </span>
                </div>
                {params.projectModel === 'contractorShare' && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Paylaşım Şartı:</span>
                    <span className="font-black text-amber-700">%{params.contractorShareRate || 50} Müteahhit Payı</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Taahhüt Edilen Süre:</span>
                  <span className="font-black text-indigo-700">{results.finalMonths || 18} Ay (Anahtar Teslim)</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Birim İmalat Bedeli:</span>
                  <span className="font-mono font-bold text-emerald-700">{formatCurrency(results.grossCostPerSqM)}/m²</span>
                </div>
                <div className="flex items-center justify-between pt-2 text-sm font-black text-emerald-800">
                  <span>TOPLAM PROJE BEDELİ:</span>
                  <span className="text-indigo-700 font-mono text-base">{formatCurrency(results.grandTotal)}</span>
                </div>
              </div>

              {/* Authorized person */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs space-y-1">
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Yetkili İletişim</span>
                <p className="font-black text-slate-900">{profile.authorizedPerson || 'Müh. Alpaslan Beyoğlu'}</p>
                <p className="text-slate-600 text-[11px]">{profile.phone || '+90 (212) 585 10 20'} &bull; {profile.email || 'info@abyapi.com.tr'}</p>
              </div>

              {/* Share actions */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const comp = profile.companyName || 'AB YAPI';
                    const msg = `🏢 *${comp.toUpperCase()} - KENTSEL DÖNÜŞÜM VE İNŞAAT TEKLİFİ*\n` +
                      `📍 *Proje:* ${params.projectAddress || 'İstanbul'}\n` +
                      `📐 *Toplam İnşaat Alanı:* ${Math.round(results.totalArea || 0)} m²\n` +
                      `🚪 *Daire Sayısı:* ${results.flatCount || 0} Adet ${params.projectModel === 'contractorShare' ? `(${contractorFlatsCount} Müteahhit / ${Math.max(0, (results.flatCount || 0) - contractorFlatsCount)} Malik)` : ''}\n` +
                      `⏱️ *Taahhüt Süresi:* ${results.finalMonths || 18} Ay\n` +
                      `📊 *Birim m² Bedeli:* ${formatCurrency(results.grossCostPerSqM)}/m²\n` +
                      `💰 *Toplam Maliyet Bedeli:* ${formatCurrency(results.grandTotal)}\n` +
                      `${params.projectModel === 'contractorShare' ? `🤝 *Paylaşım:* %${params.contractorShareRate || 50} Kat Karşılığı\n\n` : ''}` +
                      `Detaylı mimari projeler, teknik şartname ve resmi sözleşme için ofisimizle iletişime geçebilirsiniz.\n\n` +
                      `*${profile.authorizedPerson || 'Şirket Yönetimi'}*\n` +
                      `📞 ${profile.phone || '+90 (212) 585 10 20'}`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp ile Teklif Gönder</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Teklifi Yazdır / PDF İndir</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* BOTTOM CONVERSION BAR (ALWAYS VISIBLE BEFORE FOOTER)          */}
      {/* ------------------------------------------------------------- */}
      <div className="p-3 mt-4">
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-center space-y-2">
          <p className="text-xs text-indigo-950 font-bold">
            3D Bina Modeli, Kat Planı CAD çizimi ve 20 maddelik tam sözleşmeye mi ihtiyacınız var?
          </p>
          <button
            type="button"
            onClick={onSwitchToFull}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 active:scale-95 transition cursor-pointer"
          >
            <Monitor className="w-4 h-4" />
            <span>Masaüstü / Tam Sürüme Geç</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE THUMB-FRIENDLY BOTTOM NAVIGATION BAR                   */}
      {/* ------------------------------------------------------------- */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-md px-2 py-1.5 flex items-center justify-around shadow-lg ${
        isGray ? 'bg-slate-100/95 border-slate-300' : 'bg-white/95 border-slate-200'
      }`}>
        <button
          type="button"
          onClick={() => setActiveTab('hesapla')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition cursor-pointer ${
            activeTab === 'hesapla'
              ? 'text-indigo-600 font-black'
              : 'text-slate-500 font-semibold hover:text-slate-900'
          }`}
        >
          <Calculator className="w-5 h-5" />
          <span className="text-[10px]">Hesapla</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('santiye')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition cursor-pointer ${
            activeTab === 'santiye'
              ? 'text-indigo-600 font-black'
              : 'text-slate-500 font-semibold hover:text-slate-900'
          }`}
        >
          <HardHat className="w-5 h-5" />
          <span className="text-[10px]">Şantiye</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('malikler')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition cursor-pointer ${
            activeTab === 'malikler'
              ? 'text-indigo-600 font-black'
              : 'text-slate-500 font-semibold hover:text-slate-900'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">Malikler</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('teklif')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition cursor-pointer ${
            activeTab === 'teklif'
              ? 'text-indigo-600 font-black'
              : 'text-slate-500 font-semibold hover:text-slate-900'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px]">Teklif</span>
        </button>
      </nav>

    </div>
  );
};
