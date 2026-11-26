import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  AlertTriangle,
  HardHat,
  ArrowRight,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Twitter,
  Share2,
  MessageSquare,
  Send,
  Smartphone,
  Settings2,
  Search,
  Archive,
  Zap,
  ChevronRight,
  FolderOpen,
  SlidersHorizontal,
} from 'lucide-react';
import { useCompanyProfile } from '../context/CompanyProfileContext';
import {
  CompanyProfile,
  CompanyProfilePrintOptions,
  SavedProjectData,
  ProjectParams,
  CalculationResult,
  ProposalStatus,
  AppTheme,
} from '../types';
import { FIRESTORE_MEDIA_CHAR_LIMIT } from '../utils/syncKeys';
import { LiveMarketPricesBar } from './LiveMarketPricesBar';
import { evaluateWorkbenchProject, WorkbenchIssue } from './ProjectWorkbench/WorkbenchLiveSummary';

export interface CompanyProfileTabProps {
  theme?: AppTheme | string;
  historyList?: SavedProjectData[];
  onNavigateToNewWorkOrder?: () => void;
  onOpenQuickProposal?: () => void;
  onContinueActiveProject?: (targetTab?: string, setupStep?: number, focusFieldId?: string) => void;
  onNavigateToArchive?: () => void;
  onNavigateToPortfolio?: () => void;
  onNavigateToCRM?: () => void;
  onNavigateToCost?: () => void;
  onSelectProject?: (project: SavedProjectData, targetTab?: string) => void;
  onDeleteProject?: (addressOrKey: string | number) => void;
  params?: ProjectParams;
  results?: CalculationResult;
}

type DashboardView = 'overview' | 'profile';
type ProjectFilterStatus = 'all' | 'active_site' | 'presented' | 'draft' | 'archived';
type ProjectSortKey = 'newest' | 'area' | 'budget' | 'name';

const AUTHORIZED_TITLE_PRESETS = [
  'Yönetim Kurulu Başkanı',
  'Şirket Müdürü / Genel Müdür',
  'İnşaat Mühendisi',
  'Proje Müdürü',
  'Mimar',
  'Teknik Müdür'
];

const SECOND_TITLE_PRESETS = [
  'Şantiye Şefi',
  'Proje Müdürü',
  'İş Geliştirme Sorumlusu',
  'Finans Müdürü',
  'Kalite Güvence Sorumlusu',
  'Sözleşmeler Yöneticisi'
];

const resolveProjectStatus = (proj: SavedProjectData): ProposalStatus => {
  const status = proj.params?.proposalStatus;
  if (status === 'archived') return 'archived';
  if (status === 'active_site') return 'active_site';
  if (status === 'contracted') return 'contracted';
  if (status === 'accepted') return 'accepted';
  if (status === 'rejected') return 'rejected';
  if (status === 'presented') return 'presented';
  if (status === 'in_review') return 'in_review';
  if (proj.params?.isOfferAccepted) return 'active_site';
  return 'draft';
};

const getStatusMeta = (status: ProposalStatus): { label: string; textClass: string } => {
  switch (status) {
    case 'active_site':
      return { label: 'Aktif Şantiye', textClass: 'text-emerald-700 font-semibold' };
    case 'contracted':
      return { label: 'Sözleşmeli', textClass: 'text-indigo-700 font-semibold' };
    case 'accepted':
      return { label: 'Kabul Edildi', textClass: 'text-emerald-700 font-medium' };
    case 'rejected':
      return { label: 'Reddedildi', textClass: 'text-rose-700 font-medium' };
    case 'presented':
      return { label: 'Teklif Sunuldu', textClass: 'text-amber-700 font-semibold' };
    case 'in_review':
      return { label: 'İncelemede', textClass: 'text-violet-700 font-medium' };
    case 'archived':
      return { label: 'Arşiv', textClass: 'text-slate-500 font-medium' };
    default:
      return { label: 'Taslak', textClass: 'text-slate-600 font-medium' };
  }
};

const getProjectModelLabel = (model?: string): string => {
  if (model === 'contractorShare') return 'Kat Karşılığı';
  if (model === 'urbanTransformation') return 'Kentsel Dönüşüm';
  if (model === 'turnkey') return 'Anahtar Teslim';
  return 'Müteahhitlik';
};

const formatCompactCurrency = (amount: number): string => {
  if (!amount || !Number.isFinite(amount)) return '0 ₺';
  return `${Math.round(amount).toLocaleString('tr-TR')} ₺`;
};

const formatShortDate = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const mapIssueToTarget = (
  issue: WorkbenchIssue
): { tab: string; setupStep?: number; focusFieldId?: string } => {
  const normalizedStage = Math.min(9, Math.max(1, Math.round(issue.stage || 1)));
  return {
    tab: 'kurulum',
    setupStep: normalizedStage,
    focusFieldId: issue.focusFieldId,
  };
};

export const CompanyProfileTab: React.FC<CompanyProfileTabProps> = ({
  theme = 'light',
  historyList = [],
  onNavigateToNewWorkOrder,
  onOpenQuickProposal,
  onContinueActiveProject,
  onNavigateToArchive,
  onNavigateToPortfolio,
  onSelectProject,
  onDeleteProject,
  params,
  results,
}) => {
  const {
    profile,
    profiles,
    updateProfile,
    updatePrintOptions,
    togglePrintOption,
    setLogo,
    removeLogo,
    setStamp,
    removeStamp,
    resetToDefault,
    importProfile,
    switchProfile,
    createNewProfile,
    deleteProfile,
    cloudSyncWarning,
    clearCloudSyncWarning,
  } = useCompanyProfile();
  
  const [formData, setFormData] = useState<CompanyProfile>(profile);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [mediaWarning, setMediaWarning] = useState<string | null>(null);
  
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
    if (name === 'legalName' || name === 'companyName') {
      setValidationError(null);
    }
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
    const trimmedLegalName = (formData.legalName || '').trim();
    const trimmedCompanyName = (formData.companyName || '').trim();

    if (!trimmedLegalName) {
      setValidationError('Tam Ticari Ünvan (Resmî Şirket Adı) boş bırakılamaz. Kaydetmeden önce lütfen şirket unvanını giriniz.');
      setSaveSuccess(false);
      return;
    }
    if (trimmedLegalName.length > 250) {
      setValidationError('Tam Ticari Ünvan en fazla 250 karakter olabilir.');
      setSaveSuccess(false);
      return;
    }
    if (!trimmedCompanyName) {
      setValidationError('Kısa Firma Adı (Marka) boş bırakılamaz. Kaydetmeden önce lütfen kısa firma adını giriniz.');
      setSaveSuccess(false);
      return;
    }
    if (trimmedCompanyName.length > 100) {
      setValidationError('Kısa Firma Adı en fazla 100 karakter olabilir.');
      setSaveSuccess(false);
      return;
    }

    setValidationError(null);
    updateProfile({
      ...formData,
      legalName: trimmedLegalName,
      companyName: trimmedCompanyName,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMediaWarning('Logo boyutu 2 MB altında olmalıdır.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (base64.length > FIRESTORE_MEDIA_CHAR_LIMIT) {
          setMediaWarning(
            `Yüklenen logo görseli (${base64.length.toLocaleString('tr-TR')} karakter) bulut güvenlik sınırını (800.000 karakter) aşıyor. Görsel yalnızca yerel cihazda saklanacak ve buluta gönderilmeyecektir; bulut senkronizasyonu için lütfen daha küçük boyutlu bir görsel yükleyin.`
          );
        } else {
          setMediaWarning(null);
        }
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
        setMediaWarning('Kaşe görseli 2 MB altında olmalıdır.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (base64.length > FIRESTORE_MEDIA_CHAR_LIMIT) {
          setMediaWarning(
            `Yüklenen kaşe/imza görseli (${base64.length.toLocaleString('tr-TR')} karakter) bulut güvenlik sınırını (800.000 karakter) aşıyor. Görsel yalnızca yerel cihazda saklanacak ve buluta gönderilmeyecektir; bulut senkronizasyonu için lütfen daha küçük boyutlu bir görsel yükleyin.`
          );
        } else {
          setMediaWarning(null);
        }
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
      ...profile,
      companyName: newCompanyName.trim(),
      legalName: newCompanyLegalName.trim() || `${newCompanyName.trim()} MÜTEAHHİTLİK VE DÖNÜŞÜM HİZMETLERİ LTD. ŞTİ.`,
      authorizedPerson: newAuthorizedPerson.trim() || 'Yeni Yetkili Kişi',
      website: '',
      logoBase64: '',
      stampBase64: '',
    };

    createNewProfile(templateProfile);

    setNewCompanyName('');
    setNewCompanyLegalName('');
    setNewAuthorizedPerson('');
    setShowCreateModal(false);
  };

  // Dashboard view & project list controls
  const [activeView, setActiveView] = useState<DashboardView>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectFilterStatus>('all');
  const [sortKey, setSortKey] = useState<ProjectSortKey>('newest');
  const [showAllProjects, setShowAllProjects] = useState(false);

  const safeHistory = useMemo(
    () => (Array.isArray(historyList) ? historyList : []),
    [historyList]
  );

  // Real company-wide KPI aggregation from historyList
  const companyMetrics = useMemo(() => {
    let activeSites = 0;
    let acceptedCount = 0;
    let presentedCount = 0;
    let draftCount = 0;
    let archivedCount = 0;
    let totalPortfolioArea = 0;
    let activePortfolioBudget = 0;

    for (const proj of safeHistory) {
      const status = resolveProjectStatus(proj);
      const area = Number(proj.results?.totalArea || 0);
      const budget = Number(proj.results?.grandTotal || 0);

      if (status === 'active_site') activeSites += 1;
      else if (status === 'accepted') acceptedCount += 1;
      else if (status === 'presented') presentedCount += 1;
      else if (status === 'archived') archivedCount += 1;
      else draftCount += 1;

      if (status !== 'archived') {
        totalPortfolioArea += area;
        activePortfolioBudget += budget;
      }
    }

    return {
      totalProjects: safeHistory.length,
      activeAndAccepted: activeSites + acceptedCount,
      activeSites,
      acceptedCount,
      presentedCount,
      draftCount,
      archivedCount,
      totalPortfolioArea,
      activePortfolioBudget,
    };
  }, [safeHistory]);

  // Real filtered & sorted project list
  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = safeHistory.filter((proj) => {
      const status = resolveProjectStatus(proj);
      if (statusFilter === 'active_site' && status !== 'active_site' && status !== 'accepted') {
        return false;
      }
      if (statusFilter === 'presented' && status !== 'presented') return false;
      if (statusFilter === 'draft' && status !== 'draft') return false;
      if (statusFilter === 'archived' && status !== 'archived') return false;

      if (!q) return true;
      const name = (proj.params?.projectName || '').toLowerCase();
      const address = (proj.projectAddress || '').toLowerCase();
      const model = getProjectModelLabel(proj.params?.projectModel).toLowerCase();
      return name.includes(q) || address.includes(q) || model.includes(q);
    });

    return [...filtered].sort((a, b) => {
      if (sortKey === 'area') {
        return Number(b.results?.totalArea || 0) - Number(a.results?.totalArea || 0);
      }
      if (sortKey === 'budget') {
        return Number(b.results?.grandTotal || 0) - Number(a.results?.grandTotal || 0);
      }
      if (sortKey === 'name') {
        const nameA = (a.params?.projectName || a.projectAddress || '').toLocaleLowerCase('tr-TR');
        const nameB = (b.params?.projectName || b.projectAddress || '').toLocaleLowerCase('tr-TR');
        return nameA.localeCompare(nameB, 'tr-TR');
      }
      const dateA = new Date(a.updatedAt || a.savedAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.savedAt || 0).getTime();
      return dateB - dateA;
    });
  }, [safeHistory, searchQuery, statusFilter, sortKey]);

  const visibleProjects = showAllProjects ? filteredProjects : filteredProjects.slice(0, 8);

  // Active in-memory workspace evaluation (real smart check)
  const isActiveProjectSaved = useMemo(
    () => Boolean(params?.projectAddress && safeHistory.some((p) => p.projectAddress === params.projectAddress)),
    [safeHistory, params?.projectAddress]
  );

  const activeEvaluation = useMemo(() => {
    if (!params || !results) return null;
    return evaluateWorkbenchProject(params, results, isActiveProjectSaved);
  }, [params, results, isActiveProjectSaved]);

  const activeCriticalIssues = useMemo(
    () => (activeEvaluation ? activeEvaluation.issues.filter((i) => i.severity === 'critical') : []),
    [activeEvaluation]
  );
  const activeWarningIssues = useMemo(
    () => (activeEvaluation ? activeEvaluation.issues.filter((i) => i.severity === 'warning') : []),
    [activeEvaluation]
  );

  // Pending proposals for right-side Work Tracking panel (real data from historyList)
  const pendingProposalProjects = useMemo(() => {
    return safeHistory
      .filter((proj) => {
        const st = resolveProjectStatus(proj);
        return st === 'presented' || st === 'draft';
      })
      .sort((a, b) => {
        const stA = resolveProjectStatus(a) === 'presented' ? 0 : 1;
        const stB = resolveProjectStatus(b) === 'presented' ? 0 : 1;
        if (stA !== stB) return stA - stB;
        return (
          new Date(b.updatedAt || b.savedAt || 0).getTime() -
          new Date(a.updatedAt || a.savedAt || 0).getTime()
        );
      })
      .slice(0, 4);
  }, [safeHistory]);

  // Corporate profile completeness check (real data from CompanyProfile)
  const missingProfileFields = useMemo(() => {
    const missing: string[] = [];
    if (!profile.logoBase64) missing.push('Firma logosu');
    if (!profile.taxNumber?.trim()) missing.push('Vergi numarası');
    if (!profile.iban?.trim()) missing.push('Banka / IBAN bilgisi');
    if (!profile.phone?.trim()) missing.push('Telefon bilgisi');
    return missing;
  }, [profile]);

  const companyInitials = useMemo(() => {
    const words = (profile.companyName || 'AB').trim().split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'AB';
  }, [profile.companyName]);

  const filterButtons: { id: ProjectFilterStatus; label: string; count: number }[] = [
    { id: 'all', label: 'Tümü', count: companyMetrics.totalProjects },
    { id: 'active_site', label: 'Aktif Şantiye', count: companyMetrics.activeAndAccepted },
    { id: 'presented', label: 'Teklif Sunuldu', count: companyMetrics.presentedCount },
    { id: 'draft', label: 'Taslak', count: companyMetrics.draftCount },
    { id: 'archived', label: 'Arşiv', count: companyMetrics.archivedCount },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-16">
      {/* ========================================================
          TOP COMPANY HEADER & VIEW SWITCHER (GENEL BAKIŞ | FİRMA PROFİLİ)
         ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="flex items-center gap-3.5 min-w-0">
          {profile.logoBase64 ? (
            <img
              src={profile.logoBase64}
              alt={profile.companyName || 'Firma Logosu'}
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-xl object-contain bg-white border border-slate-200 p-1 shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0 tracking-tight">
              {companyInitials}
            </div>
          )}

          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              {profile.companyName || 'AB-YAPI'}
            </h1>
            <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5">
              <span className="truncate max-w-md">{profile.legalName || 'Şirket Genel Yönetim Paneli'}</span>
              {profile.authorizedPerson && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="whitespace-nowrap">{profile.authorizedPerson}</span>
                </>
              )}
              {profiles.length > 1 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="whitespace-nowrap">{profiles.length} kayıtlı firma profili</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Segmented View Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/80 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveView('overview')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'overview'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Genel Bakış
          </button>
          <button
            type="button"
            onClick={() => setActiveView('profile')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeView === 'profile'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Firma Profili & Ayarları</span>
            {missingProfileFields.length > 0 && (
              <span className="text-[11px] font-mono tabular-nums text-amber-700 font-bold">
                ({missingProfileFields.length})
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================
          VIEW 1: GENEL BAKIŞ (EXECUTIVE COMPANY DASHBOARD)
         ======================================================== */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* 2. ANA İŞLEM ALANI: HIZLI İŞLEMLER & AKTİF PROJEYE DEVAM ET */}
          <section
            aria-label="Ana İşlemler"
            className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5"
          >
            {/* Primary Actions */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {onNavigateToNewWorkOrder && (
                <button
                  type="button"
                  onClick={onNavigateToNewWorkOrder}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yeni Proje Oluştur</span>
                </button>
              )}
              {onNavigateToArchive && (
                <button type="button" onClick={onNavigateToArchive}
                  className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  Proje Arşivi
                </button>
              )}
            </div>

            {/* Active Workspace Project Resume Strip (does not overwrite active params) */}
            {params && results && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 xl:pl-5 xl:border-l border-slate-200 flex-1 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">Çalışma Masasında Açık</span>
                    <span aria-hidden="true">·</span>
                    <span>{getProjectModelLabel(params.projectModel)}</span>
                    {activeEvaluation && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-mono tabular-nums font-semibold ${
                            activeEvaluation.isOfferReady ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          %{activeEvaluation.requiredPercent} tamamlandı
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                    {params.projectName || params.projectAddress || 'Adsız Çalışma Taslağı'}
                  </p>
                  <div className="flex items-center flex-wrap gap-x-2 text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                    <span>{results.totalArea ? `${Math.round(results.totalArea).toLocaleString('tr-TR')} m²` : '0 m²'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{results.flatCount || 0} bölüm</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-700 font-medium">{formatCompactCurrency(results.grandTotal)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onContinueActiveProject && (
                    <>
                      <button
                        type="button"
                        onClick={() => onContinueActiveProject('teklif')}
                        className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Teklif
                      </button>
                      <button
                        type="button"
                        onClick={() => onContinueActiveProject('kurulum')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Aktif Projeye Devam Et</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* 1. ÜST BÖLÜM: GERÇEK ŞİRKET KPI ŞERİDİ (historyList) */}
          <section aria-label="Şirket Genel Özeti" className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 bg-white border border-slate-200 rounded-xl divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-hidden">
              <div className="p-4 flex flex-col justify-between gap-1">
                <span className="text-xs font-medium text-slate-500">Toplam Proje</span>
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {companyMetrics.totalProjects}
                </span>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {companyMetrics.totalPortfolioArea > 0
                    ? `${Math.round(companyMetrics.totalPortfolioArea).toLocaleString('tr-TR')} m² aktif portföy`
                    : 'Kayıtlı proje yok'}
                </span>
              </div>

              <div className="p-4 flex flex-col justify-between gap-1">
                <span className="text-xs font-medium text-slate-500">Aktif Şantiye</span>
                <span className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
                  {companyMetrics.activeAndAccepted}
                </span>
                <span className="text-xs text-slate-500">
                  {companyMetrics.acceptedCount > 0
                    ? `${companyMetrics.activeSites} sahada · ${companyMetrics.acceptedCount} onaylı`
                    : 'Onaylanmış ve devam eden'}
                </span>
              </div>

              <div className="p-4 flex flex-col justify-between gap-1">
                <span className="text-xs font-medium text-slate-500">Sunulan Teklif</span>
                <span className="text-2xl font-bold font-mono tabular-nums text-amber-700">
                  {companyMetrics.presentedCount}
                </span>
                <span className="text-xs text-slate-500">Müşteri dönüşü bekleyen</span>
              </div>

              <div className="p-4 flex flex-col justify-between gap-1">
                <span className="text-xs font-medium text-slate-500">Taslak / Hazırlanan</span>
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {companyMetrics.draftCount}
                </span>
                <span className="text-xs text-slate-500">Fizibilite ve teklif aşaması</span>
              </div>

              <div className="p-4 flex flex-col justify-between gap-1 col-span-2 md:col-span-1">
                <span className="text-xs font-medium text-slate-500">Aktif Portföy Hacmi</span>
                <span className="text-xl font-bold font-mono tabular-nums text-slate-900 truncate">
                  {formatCompactCurrency(companyMetrics.activePortfolioBudget)}
                </span>
                <span className="text-xs text-slate-500">
                  {companyMetrics.archivedCount > 0
                    ? `${companyMetrics.archivedCount} arşiv proje hariç`
                    : 'Kayıtlı projeler toplamı'}
                </span>
              </div>
            </div>

            {/* Kompakt Canlı Piyasa Referans Şeridi */}
            <LiveMarketPricesBar />
          </section>

          {/* 3 & 4. ANA YÖNETİM ALANI: SOL (PROJE YÖNETİMİ) + SAĞ (İŞ TAKİBİ) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* SOL 8 KOLON: PROJE YÖNETİMİ (SON VE DEVAM EDEN PROJELER) */}
            <section
              aria-label="Proje Yönetimi"
              className="xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden"
            >
              {/* Header + Search + Sort */}
              <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Son ve Devam Eden Projeler
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kayıtlı projelerinizi durumuna göre filtreleyin, doğrudan çalışma masası, teklif veya şantiye ekranına geçin.
                    </p>
                  </div>

                  {onNavigateToArchive && safeHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={onNavigateToArchive}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Tüm Arşiv ({safeHistory.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Search + Sort Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative flex-1 min-w-0">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Proje adı, adres veya yapım türü ara..."
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
                    <select
                      aria-label="Projeleri sırala"
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as ProjectSortKey)}
                      className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="newest">En Yeni Güncelleme</option>
                      <option value="budget">En Yüksek Bütçe</option>
                      <option value="area">En Büyük İnşaat Alanı</option>
                      <option value="name">Proje Adı (A-Z)</option>
                    </select>
                  </div>
                </div>

                {/* Segmented Status Filter Bar */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  {filterButtons.map((btn) => {
                    const isActive = statusFilter === btn.id;
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => {
                          setStatusFilter(btn.id);
                          setShowAllProjects(false);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {btn.label}{' '}
                        <span
                          className={`font-mono tabular-nums ml-1 ${
                            isActive ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          {btn.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Project Data Table / Empty States */}
              {safeHistory.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <FolderOpen className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800">
                      Henüz kayıtlı proje bulunmuyor
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Yeni bir proje oluşturup kaydettiğinizde projeleriniz burada durumlarına göre listelenir.
                    </p>
                  </div>
                  {onNavigateToNewWorkOrder && (
                    <button
                      type="button"
                      onClick={onNavigateToNewWorkOrder}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>İlk Projeyi Oluştur</span>
                    </button>
                  )}
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="p-10 text-center space-y-2.5">
                  <p className="text-sm font-semibold text-slate-800">
                    Arama ve filtre kriterlerine uyan proje bulunamadı
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                          <th className="py-2.5 px-4">Proje / Adres</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Durum</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Alan · Bölüm</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Proje Bedeli</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap hidden sm:table-cell">Güncelleme</th>
                          <th className="py-2.5 px-4 text-right whitespace-nowrap">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {visibleProjects.map((proj, idx) => {
                          const status = resolveProjectStatus(proj);
                          const statusMeta = getStatusMeta(status);
                          const isCurrentActive =
                            Boolean(params?.projectAddress) &&
                            params?.projectAddress === proj.projectAddress;
                          const displayName =
                            proj.params?.projectName?.trim() ||
                            proj.projectAddress ||
                            'İsimsiz Proje';
                          const flatCount = proj.results?.flatCount || proj.params?.flatCount || 0;
                          const area = proj.results?.totalArea || 0;

                          return (
                            <tr
                              key={`${proj.projectAddress}-${proj.savedAt || idx}`}
                              className={`transition-colors ${
                                isCurrentActive ? 'bg-indigo-50/40 hover:bg-indigo-50/70' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-3 px-4 max-w-[260px]">
                                <button
                                  type="button"
                                  onClick={() => onSelectProject?.(proj, 'kurulum')}
                                  className="text-left group block w-full cursor-pointer"
                                >
                                  <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                    {displayName}
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                    <span>{proj.projectAddress || 'Adres girilmedi'}</span>
                                    <span aria-hidden="true"> · </span>
                                    <span>{getProjectModelLabel(proj.params?.projectModel)}</span>
                                    {isCurrentActive && (
                                      <>
                                        <span aria-hidden="true"> · </span>
                                        <span className="text-indigo-600 font-semibold">Açık</span>
                                      </>
                                    )}
                                  </div>
                                </button>
                              </td>

                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className={`text-xs ${statusMeta.textClass}`}>
                                  {statusMeta.label}
                                </span>
                              </td>

                              <td className="py-3 px-3 text-right whitespace-nowrap font-mono tabular-nums text-slate-700">
                                <span>{area > 0 ? `${Math.round(area).toLocaleString('tr-TR')} m²` : '—'}</span>
                                <span className="text-slate-400"> · </span>
                                <span>{flatCount} blm</span>
                              </td>

                              <td className="py-3 px-3 text-right whitespace-nowrap font-mono tabular-nums font-semibold text-slate-900">
                                {proj.results?.grandTotal
                                  ? formatCompactCurrency(proj.results.grandTotal)
                                  : '—'}
                              </td>

                              <td className="py-3 px-3 text-right whitespace-nowrap font-mono tabular-nums text-slate-500 hidden sm:table-cell">
                                {formatShortDate(proj.updatedAt || proj.savedAt)}
                              </td>

                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onSelectProject?.(proj, 'kurulum')}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-md transition-colors cursor-pointer"
                                  >
                                    Aç
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onSelectProject?.(proj, 'teklif')}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-md transition-colors cursor-pointer"
                                  >
                                    Teklif
                                  </button>
                                  {(status === 'active_site' || status === 'accepted') && (
                                    <button
                                      type="button"
                                      onClick={() => onSelectProject?.(proj, 'surec')}
                                      className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                                    >
                                      Şantiye
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {filteredProjects.length > 8 && (
                    <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-mono tabular-nums">
                        {visibleProjects.length} / {filteredProjects.length} proje gösteriliyor
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAllProjects((prev) => !prev)}
                        className="font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                      >
                        {showAllProjects ? 'Daha Az Göster' : `Tümünü Göster (${filteredProjects.length})`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* SAĞ 4 KOLON: İŞ TAKİBİ (GERÇEK ÖNCELİKLER VE UYARILAR) */}
            <aside aria-label="İş Takibi ve Öncelikler" className="xl:col-span-4 space-y-4">
              {/* 4A. Aktif Proje Kritik Kontrolleri */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-slate-900">Aktif Proje Kontrolleri</h2>
                  {activeEvaluation && (
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      {activeEvaluation.requiredCompleted}/{activeEvaluation.requiredTotal} zorunlu
                    </span>
                  )}
                </div>

                {activeEvaluation ? (
                  activeCriticalIssues.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {activeCriticalIssues.slice(0, 4).map((issue) => {
                        const target = mapIssueToTarget(issue);
                        return (
                          <button
                            key={issue.id}
                            type="button"
                            onClick={() => onContinueActiveProject?.(target.tab, target.setupStep, target.focusFieldId)}
                            className="w-full py-2.5 first:pt-1 last:pb-0 flex items-start justify-between gap-2.5 text-left group cursor-pointer"
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-800 group-hover:text-indigo-600 transition-colors leading-snug">
                                  {issue.message}
                                </p>
                                <span className="text-[11px] text-slate-400">{issue.stageLabel}</span>
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0 mt-0.5" />
                          </button>
                        );
                      })}
                      {activeWarningIssues.length > 0 && (
                        <p className="pt-2.5 text-[11px] text-amber-700 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Ayrıca {activeWarningIssues.length} teknik kontrol uyarısı var.</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2 text-xs text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          Aktif projede kritik eksik yok; teklif ve sözleşme çıktısı hazırlanabilir.
                        </span>
                      </div>
                      {activeWarningIssues.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const firstTarget = mapIssueToTarget(activeWarningIssues[0]);
                            onContinueActiveProject?.(firstTarget.tab, firstTarget.setupStep, firstTarget.focusFieldId);
                          }}
                          className="w-full text-left text-xs text-amber-700 hover:text-amber-800 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 cursor-pointer"
                        >
                          <span className="truncate">{activeWarningIssues[0].message}</span>
                          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      )}
                      {onContinueActiveProject && (
                        <button
                          type="button"
                          onClick={() => onContinueActiveProject('teklif')}
                          className="w-full py-2 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Teklif Ekranına Geç
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-500">
                    Aktif proje verisi yüklendiğinde eksik ve kritik kontroller burada listelenir.
                  </p>
                )}
              </div>

              {/* 4B. Takip / Onay Bekleyen Teklifler */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-slate-900">Bekleyen Teklifler</h2>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {companyMetrics.presentedCount + companyMetrics.draftCount} proje
                  </span>
                </div>

                {pendingProposalProjects.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {pendingProposalProjects.map((proj, idx) => {
                      const status = resolveProjectStatus(proj);
                      const statusMeta = getStatusMeta(status);
                      return (
                        <button
                          key={`pending-${proj.projectAddress}-${idx}`}
                          type="button"
                          onClick={() => onSelectProject?.(proj, 'teklif')}
                          className="w-full py-2.5 first:pt-1 last:pb-0 flex items-center justify-between gap-3 text-left group cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                              {proj.params?.projectName || proj.projectAddress || 'İsimsiz Proje'}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              <span className={statusMeta.textClass}>{statusMeta.label}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                {formatCompactCurrency(proj.results?.grandTotal || 0)}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Onay veya teklif hazırlığı bekleyen kayıtlı proje bulunmuyor.
                  </p>
                )}
              </div>

              {/* 4C. Kurumsal Profil Eksikliği (Yalnızca gerçekten eksik varsa gösterilir) */}
              {missingProfileFields.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-slate-900">Kurumsal Çıktı Hazırlığı</h2>
                    <span className="text-xs font-mono tabular-nums text-amber-700 font-semibold">
                      {missingProfileFields.length} eksik
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Teklif ve sözleşme PDF çıktılarında görünmesi için şu bilgiler eksik:{' '}
                    <span className="font-medium text-slate-800">
                      {missingProfileFields.join(', ')}
                    </span>
                    .
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveView('profile')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    <span>Firma Profilini Tamamla</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </aside>
          </div>

          {/* 5. ALT BÖLÜM: ARŞİV VE GEÇMİŞ İŞLEMLER */}
          <footer className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-slate-500">
              <span className="font-medium text-slate-700">Arşiv ve Portföy</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {companyMetrics.totalProjects} kayıtlı proje
              </span>
              {companyMetrics.archivedCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {companyMetrics.archivedCount} arşivlenmiş
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center flex-wrap gap-2">
              {onNavigateToArchive && (
                <button
                  type="button"
                  onClick={onNavigateToArchive}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5 text-slate-500" />
                  <span>Proje Arşivi & Yedekleme</span>
                </button>
              )}
              {onNavigateToPortfolio && (
                <button
                  type="button"
                  onClick={onNavigateToPortfolio}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <HardHat className="w-3.5 h-3.5 text-slate-500" />
                  <span>Referans Tamamlanan Projeler</span>
                </button>
              )}
            </div>
          </footer>
        </div>
      )}

      {/* ========================================================
          VIEW 2: FİRMA PROFİLİ & AYARLARI (MEVCUT TÜM ÖZELLİKLER KORUNUR)
         ======================================================== */}
      {activeView === 'profile' && (
      <div className="space-y-6">
          {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
            <Building className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Firma & Yetkili Profili</h2>
            <p className="text-xs text-slate-500">
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

      {validationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm font-medium animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{validationError}</span>
        </div>
      )}

      {(cloudSyncWarning || mediaWarning) && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start justify-between gap-3 text-amber-900 text-sm font-medium animate-fadeIn">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <span>{mediaWarning || cloudSyncWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setMediaWarning(null);
              clearCloudSyncWarning();
            }}
            className="text-xs font-bold text-amber-700 hover:text-amber-900 shrink-0"
          >
            Kapat
          </button>
        </div>
      )}

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
                  required
                  value={formData.legalName || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: AB YAPI MÜTEAHHİTLİK VE MÜHENDİSLİK TİC. LTD. ŞTİ."
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${
                    validationError && !(formData.legalName || '').trim() ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kısa Firma Adı (Marka) *
                </label>
                <input
                  type="text"
                  name="companyName"
                  required
                  value={formData.companyName || ''}
                  onChange={handleInputChange}
                  placeholder="Örn: AB YAPI"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${
                    validationError && !(formData.companyName || '').trim() ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
                  }`}
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
                  placeholder="Örn: Yetkili / Şantiye Sorumlusu (İsteğe Bağlı)"
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
                  placeholder="Örn: Şantiye Sorumlusu / Yetkili"
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
                    placeholder="https://ab-yapi.com.tr/"
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
                  <p className="text-[10px] text-slate-400">Teklif, sözleşme, şartname ve başlıklarda kurumsal monogram gösterilir</p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
              💡 <strong>Tek Merkezden Yönetim:</strong> Yüklediğiniz logo; Üst Başlık, Mobil Ekran, Teklif, Sözleşme, Şartname, Şantiye Takip ve PDF çıktılarının tamamında otomatik olarak tek ve aynı logo olarak kullanılır.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Logo Yükle / Değiştir
              </button>
              {formData.logoBase64 && (
                <button
                  type="button"
                  onClick={() => {
                    removeLogo();
                    setFormData((prev) => ({ ...prev, logoBase64: '' }));
                  }}
                  className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs transition cursor-pointer"
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

            {validationError && (
              <div className="p-3 bg-rose-500/20 border border-rose-400/50 rounded-lg text-[11px] text-rose-100 leading-relaxed">
                {validationError}
              </div>
            )}

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
      )}
    </div>
  );
};
