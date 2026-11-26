Warning: truncated output (original token count: 61401)
Total output lines: 4888

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  Building2,
  Send,
  Share2,
  Printer,
  FileDown,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Sparkles,
  Phone,
  MessageCircle,
  Mail,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Image,
  Upload,
  Layers,
  ArrowRight,
  ShieldCheck,
  Award,
  RefreshCw,
  TrendingUp,
  Users,
  HardHat,
  FileText,
  Smartphone,
  CheckCheck,
  SlidersHorizontal,
  History,
  Globe,
  HelpCircle,
  Edit3,
  Share,
  Search,
  X,
  Filter,
  Briefcase,
  FolderPlus,
  PlusCircle,
  Layers3,
  ArrowRightCircle,
  RotateCcw,
  CheckCircle,
  Building,
} from 'lucide-react';
import { sanitizeCustomerMessageText, countTypoOccurrences } from '../utils/textSanitizer';
import {
  ProjectParams,
  CalculationResult,
  AppTheme,
  ConstructionStage,
  ConstructionProgressLog,
  ConstructionStageStatus,
  ConstructionPeriodType,
  ClientNotificationDraft,
  ConstructionProgressProjectState,
  Subcontractor,
  SubcontractorPayment,
  SavedProjectData
} from '../types';
import { calculateProject, DEFAULT_PARAMS } from '../utils/calculatorEngine';
import { projectBasePrices } from '../utils/companyPrices';
import { latestExchange } from '../hooks/useMarketData';
import { useCompanyProfile } from '../context/CompanyProfileContext';
import { useFirebaseSync } from '../context/FirebaseSyncContext';
import {
  resolveProjectProgressKeys,
  getLocalProgressItemByKeys,
  setLocalProgressItemByKeys,
} from '../utils/syncKeys';
import {
  buildOfferAcceptanceTransitionPatch,
  resolveContractProposalNumber,
  resolveEffectiveOfferAccepted,
} from '../utils/workflowConsistencyUtils';
import {
  appendOfferStatusHistory,
  buildInitializedOfferMeta,
} from '../utils/customerOfferBoundary';
import { exportElementToPdf, printHtmlContent } from '../utils/pdfExport';
import { Logo } from './Logo';

interface ConstructionProgressTabProps {
  params: ProjectParams;
  results: CalculationResult;
  theme?: AppTheme;
  onNavigateToOffer?: () => void;
  onNavigateToContract?: () => void;
  onUpdateParam?: (key: keyof ProjectParams, value: any) => void;
  onUpdateAllParams?: (updates: Partial<ProjectParams>) => void;
  savedProjects?: SavedProjectData[];
  onSelectProject?: (project: SavedProjectData) => void;
  onAddNewProject?: (newProject: SavedProjectData) => void;
  onDeleteProject?: (address: string) => void;
  onSaveCurrentProject?: () => void;
}

// 12 Standard Turkish Urban Transformation & Construction Stages
const DEFAULT_STAGE_DEFINITIONS: Array<Omit<ConstructionStage, 'startDatePlanned' | 'endDatePlanned' | 'startDateActual' | 'endDateActual'>> = [
  {
    id: 'stage_1',
    order: 1,
    name: '1. Proje, Zemin Etüdü & Ruhsat Onayı',
    category: 'proje_ruhsat',
    categoryLabel: 'Proje & Ruhsat',
    progressPercent: 100,
    status: 'completed',
    responsible: 'Mimar & Statik Proje Müellifi',
    weightPercent: 8,
    notes: 'Zemin etüt raporu, mimari, statik ve mekanik projeler belediye onayına sunuldu; yapı ruhsatı alındı.',
    subTasks: [
      { id: 'st1_1', title: 'Zemin Sondajı ve Jeolojik Rapor', completed: true },
      { id: 'st1_2', title: 'Mimari ve Statik Proje Çizimleri', completed: true },
      { id: 'st1_3', title: 'Belediye Ruhsat Harçları & Yapı Denetim Ataması', completed: true },
      { id: 'st1_4', title: 'Resmî İnşaat Ruhsatının Alınması', completed: true },
    ]
  },
  {
    id: 'stage_2',
    order: 2,
    name: '2. Mevcut Yapının Tahliyesi, Güvenlik & Yıkım',
    category: 'proje_ruhsat',
    categoryLabel: 'Yıkım & Güvenlik',
    progressPercent: 100,
    status: 'completed',
    responsible: 'Yıkım Şefi & İSG Uzmanı',
    weightPercent: 6,
    notes: 'Elektrik, su, doğalgaz abonelikleri kesildi. Çevre güvenlik perdeleri çekilerek kontrollü yıkım ve moloz nakli tamamlandı.',
    subTasks: [
      { id: 'st2_1', title: 'İSKİ, BEDAŞ, İGDAŞ İptal & Güvenlik Kesişleri', completed: true },
      { id: 'st2_2', title: 'Çevre Güvenlik Perdeleri & İskele Kurulumu', completed: true },
      { id: 'st2_3', title: 'Kontrollü Yıkım ve Molozların Döküm Sahasına Nakli', completed: true },
      { id: 'st2_4', title: 'Arsa Tesviyesi ve Sıfır Kot Hazırlığı', completed: true },
    ]
  },
  {
    id: 'stage_3',
    order: 3,
    name: '3. Hafriyat, Temel Kazısı & İksa / İstinat',
    category: 'kaba_yapi',
    categoryLabel: 'Temel & Altyapı',
    progressPercent: 100,
    status: 'completed',
    responsible: 'Geoteknik Mühendisi & Hafriyat Ekibi',
    weightPercent: 7,
    notes: 'Derin temel kazısı kotuna inildi. Komşu parsel güvenliği için mini kazık ve istinat perdesi tamamlandı.',
    subTasks: [
      { id: 'st3_1', title: 'Parsel İçi Derin Kazı ve Fazlalık Toprak Nakli', completed: true },
      { id: 'st3_2', title: 'İksa & Komşu Parsel Güçlendirmesi', completed: true },
      { id: 'st3_3', title: 'Grobeton Öncesi Drenaj ve Stabilizasyon Katmanı', completed: true },
    ]
  },
  {
    id: 'stage_4',
    order: 4,
    name: '4. Radye Temel, Bodrum Katlar & Su Yalıtımı',
    category: 'kaba_yapi',
    categoryLabel: 'Temel & Bodrum',
    progressPercent: 85,
    status: 'in_progress',
    responsible: 'Şantiye Şefi & Kalıp-Demir Taşeronu',
    weightPercent: 12,
    notes: 'Membran bohçalama su yalıtımı yapıldı. Radye temel C35 hazır betonu döküldü; bodrum perde duvar donatıları bağlanıyor.',
    subTasks: [
      { id: 'st4_1', title: '10 cm Grobeton & Çift Kat Membran Bohçalama', completed: true },
      { id: 'st4_2', title: 'Radye Temel Çift Sıra Donatı Bağlama ve Topraklama', completed: true },
      { id: 'st4_3', title: 'Radye Temel C35/40 Hazır Beton Dökümü', completed: true },
      { id: 'st4_4', title: 'Bodrum Kat Betonarme Perdeleri ve Su Tutucu Bantlar', completed: false },
    ]
  },
  {
    id: 'stage_5',
    order: 5,
    name: '5. Taşıyıcı Kaba Yapı (Betonarme Karkas & Tablalar)',
    category: 'kaba_yapi',
    categoryLabel: 'Kaba Yapı',
    progressPercent: 40,
    status: 'in_progress',
    responsible: 'İnşaat Mühendisi & Kalıp Ekibi',
    weightPercent: 22,
    notes: 'Zemin ve 1. normal kat betonarme kolon ve döşeme imalatları tamamlandı. 2. kat kalıp imalatı sürüyor.',
    subTasks: [
      { id: 'st5_1', title: 'Zemin Kat Kolon, Perde ve Tablası Dökümü', completed: true },
      { id: 'st5_2', title: '1. ve 2. Normal Kat Taşıyıcı Döşemeleri', completed: true },
      { id: 'st5_3', title: 'Üst Katlar Karkas İskelet ve Merdiven İmalatları', completed: false },
      { id: 'st5_4', title: 'Yapı Denetim Demir-Beton Laboratuvar Kırım Onayları', completed: false },
    ]
  },
  {
    id: 'stage_6',
    order: 6,
    name: '6. Duvar Örümü & Çatı İmalatları',
    category: 'kaba_yapi',
    categoryLabel: 'Duvar & Çatı',
    progressPercent: 0,
    status: 'not_started',
    responsible: 'Duvar ve Çatı Taşeronu',
    weightPercent: 9,
    notes: 'Bölme duvarlarda gazbeton/bims kullanımı planlanmaktadır. Çatı karkası ve ısı yalıtımı projelendirildi.',
    subTasks: [
      { id: 'st6_1', title: 'Daire İçi ve Dış Cephe Gazbeton Duvar Örümleri', completed: false },
      { id: 'st6_2', title: 'Çelik/Ahşap Çatı Karkası Montajı', completed: false },
      { id: 'st6_3', title: 'Çatı Su, Buhar Dengeleyici ve Isı Yalıtım Örtüsü', completed: false },
      { id: 'st6_4', title: 'Kiremit / Shingle / Kenet Metal Çatı Kaplaması', completed: false },
    ]
  },
  {
    id: 'stage_7',
    order: 7,
    name: '7. Tesisat Altyapısı (Elektrik, Sıhhi, Doğalgaz)',
    category: 'tesisat_ince',
    categoryLabel: 'Tesisat Altyapı',
    progressPercent: 0,
    status: 'not_started',
    responsible: 'Mekanik & Elektrik Mühendisi',
    weightPercent: 9,
    notes: 'Sıva altı borulama, yangın ve temiz su altyapısı imalatları başlayacaktır.',
    subTasks: [
      { id: 'st7_1', title: 'Elektrik Borulama, Tava ve Dağıtım Kutuları', completed: false },
      { id: 'st7_2', title: 'Temiz Su (PPRC) ve Pis Su (Sessiz PVC) Hatları', completed: false },
      { id: 'st7_3', title: 'Kombi / Yerden Isıtma / Radyatör Altyapı Döşemesi', completed: false },
      { id: 'st7_4', title: 'Doğalgaz Kolon Hattı ve Sayaç Bağlantı Hazırlığı', completed: false },
    ]
  },
  {
    id: 'stage_8',
    order: 8,
    name: '8. İnce İşler (Kara Sıva, Alçı, Şap, Seramik)',
    category: 'tesisat_ince',
    categoryLabel: 'İnce İmalat',
    progressPercent: 0,
    status: 'not_started',
    responsible: 'İnce İşler Şefi',
    weightPercent: 11,
    notes: 'Daire içi zemin şapı, duvar alçı sıvaları ve ıslak hacim seramik kaplamaları yapılacaktır.',
    subTasks: [
      { id: 'st8_1', title: 'Daire İçi Şap İmalatı ve Mastarlama', completed: false },
      { id: 'st8_2', title: 'Duvar ve Tavan Alçı Sıva / Kartonpiyer İmalatları', completed: false },
      { id: 'st8_3', title: 'Banyo ve Mutfak 1. Sınıf Seramik / Granit Kaplama', completed: false },
      { id: 'st8_4', title: 'Banyo Su İzolasyonu ve Süzgeç Montajları', completed: false },
    ]
  },
  {
    id: 'stage_9',
    order: 9,
    name: '9. Dış Cephe Kaplama & Isı Yalıtımı (Mantolama)',
    category: 'tesisat_ince',
    categoryLabel: 'Dış Cephe & Doğrama',
    progressPercent: 0,
    status: 'not_started',
    responsible: 'Cephe Taşeronu',
    weightPercent: 7,
    notes: 'Taşyünü yangına dayanıklı mantolama, dekoratif cephe ve ısı yalıtımlı PVC doğramalar monte edilecektir.',
    subTasks: [
      { id: 'st9_1', title: 'Taşyünü Dış Cephe Mantolama ve Fileli Sıva', completed: false },
      { id: 'st9_2', title: 'Dekoratif Söve, Kompozit ve Dış Cephe Boyası', completed: false },
      { id: 'st9_3', title: 'Konfor Isıcamlı 70+ Serisi PVC Doğrama ve Balkon Küpeşteleri', completed: false },
    ]
  },
  {
    id: 'stage_10',
    order: 10,
    name: '10. Dekorasyon, Mutfak, Parke & Kapılar',
    category: 'tesisat_ince',
    categoryLabel: 'Dekorasyon & Montaj',
    progressPercent: 0,
    status: 'not_started',
    responsible: 'Mobilya ve İnce İşler Ekibi',
    weightPercent: 5,
    notes: 'Çelik kapılar, oda kapıları, mutfak dolapları, tezgahlar ve lamine parke montajları yapılacaktır.',
    subTasks: [
      { id: 'st10_1', title: 'Merkezi Kilitli Çelik Giriş Kapıları Montajı', completed: false },
      { id: 'st10_2', title: 'Mutfak Dolapları, Çimstone Tezgah ve Evyeler', completed: false },
      { id: 'st10_3', title: 'Laminat/Lamine Parke ve Süpürgelik Döşemesi', completed: false },
      { id: 'st10_4', title: 'Vitrifiyeler, Bataryalar ve Duşakabin Montajları', completed: false },
    ]
  },
  {
    id: 'stage_11',
    order: 11,
    name: '11. Asansör, Çevre Düzenleme & Peyzaj',
    category: 'teslim',
    categoryLabel: 'Mekanik & Çevre',
    progressPercent: 0,
    status: 'not_started',
    responsible: 'Asansör Mühendisi & Peyzaj Mimarı',
    weightPercent: 2,
    notes: 'TSE ve Yeşil Etiket onaylı tam otomatik asansör, bina girişi mermer kaplama ve çevre tanzimi tamamlanacaktır.',
    subTasks: [
      { id: 'st11_1', title: 'Asansör Motoru, Kabin, Ray ve Kapı Montajı', completed: false },
      { id: 'st11_2', title: 'Bina Giriş Holü, Merdiven Mermer Kaplamaları ve Posta Kutuları', completed: false },
      { id: 'st11_3', title: 'Bahçe Duvarları, Aydınlatma ve Peyzaj Düzenlemesi', completed: false },
      { id: 'st11_4', title: 'Bina Dış Sığınak, Otopark ve Su Deposu Bağlantıları', completed: false },
    ]
  },
  {
    id: 'stage_12',
    order: 12,
    name: '12. İskan (Yapı Kullanma İzni) & Anahtar Teslimi',
    category: 'teslim',
    categoryLabel: 'İskan & Teslim',
    progressPercent: 0,
    status: 'not_started',
    responsible: 'Genel Koordinatör & Ruhsat Birimi',
    weightPercent: 2,
    notes: 'Yapı Denetim ve Belediye heyeti incelemesi sonrası İskan Belgesi alınarak daire anahtarları hak sahiplerine teslim edilir.',
    subTasks: [
      { id: 'st12_1', title: 'Yapı Denetim Hakediş Kapanışı ve Belediye Denetimi', completed: false },
      { id: 'st12_2', title: 'İtfaiye, Sivil Savunma ve Enerji Kimlik Belgesi (EKB) Onayı', completed: false },
      { id: 'st12_3', title: 'Resmî İskan (Yapı Kullanma İzin Belgesi) Alınması', completed: false },
      { id: 'st12_4', title: 'Kat Mülkiyeti Tapularının Çıkartılması ve Anahtar Teslim Töreni', completed: false },
    ]
  }
];

const DEFAULT_SUBCONTRACTORS: Subcontractor[] = [
  {
    id: 'sub_1',
    name: 'Yıldız Hafriyat ve Altyapı Ltd.',
    trade: 'Hafriyat, Kazı & Şev Koruma',
    contactPerson: 'Adnan Yıldız',
    phone: '0532 456 78 90',
    contractAmount: 450000,
    contractDate: '2026-03-10',
    startDate: '2026-03-15',
    endDatePlanned: '2026-04-10',
    progressPercent: 100,
    status: 'completed',
    payments: [
      { id: 'p_1_1', date: '2026-03-10', amount: 150000, paymentType: 'bank', paymentTypeLabel: 'Banka Havalesi', description: 'Sözleşme Avansı (%33)' },
      { id: 'p_1_2', date: '2026-04-12', amount: 300000, paymentType: 'bank', paymentTypeLabel: 'Banka Havalesi', description: 'Kazı ve İksa İşleri Teslim Hakedişi' }
    ],
    notes: 'Hafriyat işleri kotunda ve komşu binalara zarar vermeden mini kazık sistemiyle başarıyla tamamlandı.'
  },
  {
    id: 'sub_2',
    name: 'Karadeniz Betonarme Yapı',
    trade: 'Kaba İnşaat, Kalıp & Demir İşleri',
    contactPerson: 'Mustafa Temel',
    phone: '0542 987 65 43',
    contractAmount: 3200000,
    contractDate: '2026-04-05',
    startDate: '2026-04-15',
    endDatePlanned: '2026-09-30',
    progressPercent: 65,
    status: 'in_progress',
    payments: [
      { id: 'p_2_1', date: '2026-04-05', amount: 500000, paymentType: 'bank', paymentTypeLabel: 'Banka Havalesi', description: 'Mobilizasyon ve Demir Avansı' },
      { id: 'p_2_2', date: '2026-05-20', amount: 750000, paymentType: 'check', paymentTypeLabel: 'Şirket Çeki', description: 'Temel & Bodrum Kat Betonu Hakedişi' },
      { id: 'p_2_3', date: '2026-07-15', amount: 800000, paymentType: 'bank', paymentTypeLabel: 'Banka Havalesi', description: '1. ve 2. Normal Kat Döşeme Betonu Hakedişi' }
    ],
    notes: 'Şu an 4. kat kalıp imalatı devam etmektedir. Çelik hasır ve donatı denetimleri yapı denetim tarafından onaylıdır.'
  },
  {
    id: 'sub_3',
    name: 'Öz Aras Elektrik & Mekanik Tesisat',
    trade: 'Elektrik & Sıhhi Tesisat Altyapısı',
    contactPerson: 'Yılmaz Aras',
    phone: '0533 111 22 33',
    contractAmount: 1800000,
    contractDate: '2026-05-10',
    startDate: '2026-06-01',
    endDatePlanned: '2026-11-15',
    progressPercent: 30,
    status: 'in_progress',
    payments: [
      { id: 'p_3_1', date: '2026-05-12', amount: 300000, paymentType: 'bank', paymentTypeLabel: 'Banka Havalesi', description: 'Sözleşme İmza Avansı' },
      { id: 'p_3_2', date: '2026-07-01', amount: 200000, paymentType: 'cash', paymentTypeLabel: 'Kasa Nakit', description: 'Kaba Tesisat Borulama Malzeme Desteği' }
    ],
    notes: 'Kaba inşaatla eş zamanlı olarak beton içi borulama ve sorti çalışmaları yürütülmektedir.'
  }
];

export const ConstructionProgressTab: React.FC<ConstructionProgressTabProps> = ({
  params,
  results,
  theme = 'light',
  onNavigateToOffer,
  onNavigateToContract,
  onUpdateParam,
  onUpdateAllParams,
  savedProjects = [],
  onSelectProject,
  onAddNewProject,
  onDeleteProject,
  onSaveCurrentProject,
}) => {
  const { profile } = useCompanyProfile();
  const { user, saveProjectToCloud } = useFirebaseSync();
  const isGray = theme === 'gray';
  const cardBg = isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200';
  const printDocRef = useRef<HTMLDivElement>(null);

  const proposalNumber = useMemo(
    () => resolveContractProposalNumber(params, profile.companyName),
    [params, profile.companyName]
  );

  const matchingSavedAddresses = useMemo(() => {
    const pName = (params.projectName || '').trim().toLocaleLowerCase('tr-TR');
    const pNum = (params.offerMeta?.proposalNumber || '').trim();
    return savedProjects
      .filter((sp) => {
        const spName = (sp.params?.projectName || '').trim().toLocaleLowerCase('tr-TR');
        const spNum = (sp.params?.offerMeta?.proposalNumber || '').trim();
        if (pNum && spNum && pNum === spNum) return true;
        if (
          pName &&
          spName &&
          pName === spName &&
          pName !== 'müşteri / proje adı belirtilmedi' &&
          pName !== 'proje adı belirtilmedi'
        ) {
          return true;
        }
        return false;
      })
      .map((sp) => sp.projectAddress || sp.params?.projectAddress);
  }, [savedProjects, params.projectName, params.offerMeta?.proposalNumber]);

  // Storage key anchored on canonical projectAddress with backward-compatible fallback keys (Turkish-safe)
  const progressKeys = useMemo(
    () =>
      resolveProjectProgressKeys({
        projectAddress: params.projectAddress,
        projectName: params.projectName,
        proposalNumber: params.offerMeta?.proposalNumber,
        additionalCandidateAddresses: matchingSavedAddresses,
      }),
    [
      params.projectAddress,
      params.projectName,
      params.offerMeta?.proposalNumber,
      matchingSavedAddresses,
    ]
  );
  const safeSlugKey = progressKeys.primaryKey;
  const safeProjectKey = 'ab_yapi_progress_' + safeSlugKey;

  // Project Duration in Months
  const totalMonths = useMemo(() => {
    return results.finalMonths || params.manualMonths || 14;
  }, [results.finalMonths, params.manualMonths]);

  // Compute realistic target dates
  const defaultDates = useMemo(() => {
    const now = new Date();
    const startDateStr = now.toISOString().slice(0, 10);
    const targetDate = new Date(now.getTime() + totalMonths * 30 * 24 * 60 * 60 * 1000);
    const endDateStr = targetDate.toISOString().slice(0, 10);
    return { startDateStr, endDateStr };
  }, [totalMonths]);

  // Track which project key the current in-memory state belongs to so we never overwrite a newly selected project's localStorage with the previous project's state
  const [activeLoadedKey, setActiveLoadedKey] = useState<string>(safeProjectKey);
  const lastLoadedKeyRef = useRef<string>(safeProjectKey);

  // Main State
  const [stages, setStages] = useState<ConstructionStage[]>(() => {
    try {
      const saved = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'stages');
      if (saved) {
        const parsed: ConstructionStage[] = JSON.parse(saved);
        return parsed.map(s => ({
          ...s,
          name: sanitizeCustomerMessageText(s.name),
          notes: s.notes ? sanitizeCustomerMessageText(s.notes) : s.notes,
          subTasks: s.subTasks?.map(st => ({
            ...st,
            title: sanitizeCustomerMessageText(st.title),
          })),
        }));
      }
    } catch (e) {}

    // Initialize clean 0% stages with distributed dates across total duration
    const startDate = new Date();
    const totalDays = totalMonths * 30;

    return DEFAULT_STAGE_DEFINITIONS.map((def, idx) => {
      const startDayOffset = Math.floor((idx / DEFAULT_STAGE_DEFINITIONS.length) * totalDays);
      const stageDuration = Math.max(20, Math.floor((def.weightPercent / 100) * totalDays * 1.3));
      
      const stDate = new Date(startDate.getTime() + startDayOffset * 24 * 60 * 60 * 1000);
      const enDate = new Date(stDate.getTime() + stageDuration * 24 * 60 * 60 * 1000);

      const cleanSubTasks = def.subTasks ? def.subTasks.map(sub => ({ ...sub, completed: false })) : undefined;

      return {
        ...def,
        status: 'not_started',
        progressPercent: 0,
        subTasks: cleanSubTasks,
        startDatePlanned: stDate.toISOString().slice(0, 10),
        endDatePlanned: enDate.toISOString().slice(0, 10),
        startDateActual: undefined,
        endDateActual: undefined,
      };
    });
  });

  // Logs (Weekly & Monthly Reports)
  const [logs, setLogs] = useState<ConstructionProgressLog[]>(() => {
    try {
      const saved = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    return [];
  });

  // Project Info State - Syncs bidirectionally with params.isOfferAccepted & params.proposalStatus
  const isOfferAccepted = resolveEffectiveOfferAccepted(params);

  const setIsOfferAccepted = (val: boolean) => {
    const compName = profile.companyName || 'AB YAPI';
    const patch = buildOfferAcceptanceTransitionPatch(params, val, {
      companyName: compName,
    });
    if (onUpdateAllParams) {
      onUpdateAllParams(patch);
    } else if (onUpdateParam) {
      onUpdateParam('isOfferAccepted', patch.isOfferAccepted);
      onUpdateParam('proposalStatus', patch.proposalStatus);
      if (patch.offerMeta) {
        onUpdateParam('offerMeta', patch.offerMeta);
      }
    }
    try {
      localStorage.setItem(safeProjectKey + '_offer_accepted', JSON.stringify(val));
    } catch (e) {}
  };

  const [contractDate, setContractDate] = useState<string>(() => {
    try {
      const saved = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'contract_date');
      if (saved) return saved;
    } catch (e) {}
    return new Date().toISOString().slice(0, 10);
  });

  const [plannedCompletionDate, setPlannedCompletionDate] = useState<string>(() => {
    try {
      const saved = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'target_date');
      if (saved) return saved;
    } catch (e) {}
    return defaultDates.endDateStr;
  });

  // View Mode: 'admin' (can edit everything) vs 'client' (clean view for clients)
  const [isClientMode, setIsClientMode] = useState<boolean>(false);

  // Active Sub-Tab: 'timeline' | 'portfolio' | 'logs' | 'notification' | 'report' | 'subcontractors'
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'portfolio' | 'logs' | 'notification' | 'report' | 'subcontractors'>('timeline');

  // Interactive Reset Modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetModeOption, setResetModeOption] = useState<'clean' | 'demo'>('clean');
  const [resetLogsOption, setResetLogsOption] = useState<boolean>(false);

  // Interactive New Project / Site Modal state
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [newSiteName, setNewSiteName] = useState<string>('');
  const [newSiteAddress, setNewSiteAddress] = useState<string>('');
  const [newSiteBaseArea, setNewSiteBaseArea] = useState<number>(120);
  const [newSiteFloorCount, setNewSiteFloorCount] = useState<number>(5);
  const [newSiteFlatsPerFloor, setNewSiteFlatsPerFloor] = useState<number>(2);
  const [newSiteMonths, setNewSiteMonths] = useState<number>(14);

  // Toast feedback state
  const [toastNotification, setToastNotification] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastNotification({ type, text });
    setTimeout(() => setToastNotification(null), 3500);
  };

  // Portfolio filter states
  const [portfolioSearchQuery, setPortfolioSearchQuery] = useState<string>('');
  const [portfolioStatusFilter, setPortfolioStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'preparing'>('all');

  // Subcontractor State
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>(() => {
    try {
      const saved = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'subcontractors');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_SUBCONTRACTORS.map(sub => ({
      ...sub,
      progressPercent: 0,
      status: 'not_started',
      payments: [],
      notes: ''
    }));
  });

  // Watch for project key changes to cleanly reload project data without overwriting
  useEffect(() => {
    if (lastLoadedKeyRef.current !== safeProjectKey) {
      lastLoadedKeyRef.current = safeProjectKey;

      try {
        const savedStages = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'stages');
        if (savedStages) {
          const parsed: ConstructionStage[] = JSON.parse(savedStages);
          setStages(parsed.map(s => ({
            ...s,
            name: sanitizeCustomerMessageText(s.name),
            notes: s.notes ? sanitizeCustomerMessageText(s.notes) : s.notes,
            subTasks: s.subTasks?.map(st => ({
              ...st,
              title: sanitizeCustomerMessageText(st.title),
            })),
          })));
        } else {
          // Initialize clean 0% stages for this new project
          const startDate = new Date();
          const totalDays = totalMonths * 30;
          const cleanStages = DEFAULT_STAGE_DEFINITIONS.map((def, idx) => {
            const startDayOffset = Math.floor((idx / DEFAULT_STAGE_DEFINITIONS.length) * totalDays);
            const stageDuration = Math.max(20, Math.floor((def.weightPercent / 100) * totalDays * 1.3));
            const stDate = new Date(startDate.getTime() + startDayOffset * 24 * 60 * 60 * 1000);
            const enDate = new Date(stDate.getTime() + stageDuration * 24 * 60 * 60 * 1000);
            return {
              ...def,
              status: 'not_started' as ConstructionStageStatus,
              progressPercent: 0,
              subTasks: def.subTasks ? def.subTasks.map(t => ({ ...t, completed: false })) : undefined,
              startDatePlanned: stDate.toISOString().slice(0, 10),
              endDatePlanned: enDate.toISOString().slice(0, 10),
              startDateActual: undefined,
              endDateActual: undefined,
            };
          });
          setStages(cleanStages);
        }

        const savedLogs = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'logs');
        if (savedLogs) {
          const parsed: ConstructionProgressLog[] = JSON.parse(savedLogs);
          setLogs(parsed.map(l => ({
            ...l,
            periodLabel: sanitizeCustomerMessageText(l.periodLabel),
            title: sanitizeCustomerMessageText(l.title),
            completedWork: sanitizeCustomerMessageText(l.completedWork),
            plannedNextWork: sanitizeCustomerMessageText(l.plannedNextWork),
          })));
        } else {
          setLogs([]);
        }

        const savedSubs = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'subcontractors');
        setSubcontractors(savedSubs ? JSON.parse(savedSubs) : DEFAULT_SUBCONTRACTORS.map(sub => ({
          ...sub,
          progressPercent: 0,
          status: 'not_started',
          payments: [],
          notes: ''
        })));

        const savedNotif = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'notif_history');
        setNotificationHistory(savedNotif ? JSON.parse(savedNotif) : []);

        const savedContract = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'contract_date');
        setContractDate(savedContract || defaultDates.startDateStr);

        const savedTarget = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'target_date');
        setPlannedCompletionDate(savedTarget || defaultDates.endDateStr);
      } catch (err) {
        console.error("Proje verisi yüklenirken hata:", err);
      } finally {
        setActiveLoadedKey(safeProjectKey);
      }
    }
  }, [safeProjectKey, progressKeys, totalMonths, defaultDates.startDateStr, defaultDates.endDateStr]);

  // Selected subcontractor for viewing/editing details
  const [selectedSubcontractorId, setSelectedSubcontractorId] = useState<string | null>(null);

  // Stage Search & Filter states for Timeline
  const [stageSearchQuery, setStageSearchQuery] = useState<string>('');
  const [stageStatusFilter, setStageStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'delayed' | 'not_started'>('all');

  const filteredStages = useMemo(() => {
    return stages.filter((stage) => {
      const q = stageSearchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        stage.name.toLowerCase().includes(q) ||
        stage.categoryLabel.toLowerCase().includes(q) ||
        stage.responsible.toLowerCase().includes(q) ||
        stage.subTasks.some(st => st.title.toLowerCase().includes(q));

      const matchesStatus = stageStatusFilter === 'all' || stage.status === stageStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [stages, stageSearchQuery, stageStatusFilter]);

  // Subcontractor Modal/Form states
  const [isAddSubOpen, setIsAddSubOpen] = useState<boolean>(false);
  const [subName, setSubName] = useState('');
  const [subTrade, setSubTrade] = useState('');
  const [subContact, setSubContact] = useState('');
  const [subPhone, setSubPhone] = useState('');
  const [subContractAmount, setSubContractAmount] = useState<number>(0);
  const [subContractDate, setSubContractDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [subStartDate, setSubStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [subEndDatePlanned, setSubEndDatePlanned] = useState(() => new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [subProgress, setSubProgress] = useState<number>(0);
  const [subStatus, setSubStatus] = useState<'not_started' | 'in_progress' | 'completed' | 'paused'>('not_started');
  const [subNotes, setSubNotes] = useState('');

  // Payment Form states inside subcontractor detail
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState<boolean>(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payType, setPayType] = useState<'cash' | 'bank' | 'check' | 'other'>('bank');
  const [payDescription, setPayDescription] = useState('');

  // New Log Form Modal / State
  const [isAddLogOpen, setIsAddLogOpen] = useState<boolean>(false);
  const [newLogTitle, setNewLogTitle] = useState('');
  const [newLogPeriodType, setNewLogPeriodType] = useState<ConstructionPeriodType>('weekly');
  const [newLogPeriodLabel, setNewLogPeriodLabel] = useState('');
  const [newLogCompleted, setNewLogCompleted] = useState('');
  const [newLogPlanned, setNewLogPlanned] = useState('');
  const [newLogWorkDays, setNewLogWorkDays] = useState<number>(6);
  const [newLogWeather, setNewLogWeather] = useState('Güneşli / Çalışmaya Uygun');

  // -------------------------------------------------------------
  // ADVANCED NOTIFICATION TEMPLATE ENGINE STATE
  // -------------------------------------------------------------
  type PeriodSelectMode =
    | 'active_stage_live'
    | 'milestone_stage'
    | 'stage_payment_call'
    | 'full_stage_scorecard'
    | 'weekly_current'
    | 'monthly_current'
    | 'specific_log'
    | 'custom_period';

  const [periodMode, setPeriodMode] = useState<PeriodSelectMode>('weekly_current');
  const [selectedLogId, setSelectedLogId] = useState<string>(() => logs[0]?.id || '');
  const [selectedStageId, setSelectedStageId] = useState<string>(() => 'stage_4');
  const [customPeriodTitle, setCustomPeriodTitle] = useState<string>('Özel Dönem Şantiye Raporu');
  const [customNote, setCustomNote] = useState<string>('');

  // Format & Channel
  const [messageChannel, setMessageChannel] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');

  // Content Modular Toggles
  const [includeProgressBar, setIncludeProgressBar] = useState<boolean>(true);
  const [includeRemainingDays, setIncludeRemainingDays] = useState<boolean>(true);
  const [includeCompleted, setIncludeCompleted] = useState<boolean>(true);
  const [includePlanned, setIncludePlanned] = useState<boolean>(true);
  const [includeWeather, setIncludeWeather] = useState<boolean>(true);
  const [includeContact, setIncludeContact] = useState<boolean>(true);

  // Recipient details
  const [recipientType, setRecipientType] = useState<'all' | 'individual'>('all');
  const [selectedFlatId, setSelectedFlatId] = useState<number | undefined>(undefined);
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');

  // Editable Draft Text & Manual Edit Flag
  const [messageBody, setMessageBody] = useState<string>('');
  const [isManuallyEdited, setIsManuallyEdited] = useState<boolean>(false);

  // Notification Generator History
  const [notificationHistory, setNotificationHistory] = useState<Array<{
    id: string;
    timestamp: string;
    channel: 'whatsapp' | 'sms' | 'email';
    periodLabel: string;
    recipientLabel: string;
    text: string;
  }>>(() => {
    try {
      const saved = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'notif_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);

  // Save history to localStorage (only when state is synchronized to current safeProjectKey)
  useEffect(() => {
    if (activeLoadedKey !== safeProjectKey) return;
    setLocalProgressItemByKeys(
      safeSlugKey,
      progressKeys.candidateKeys.slice(1),
      'notif_history',
      JSON.stringify(notificationHistory)
    );
  }, [notificationHistory, safeProjectKey, safeSlugKey, progressKeys.candidateKeys, activeLoadedKey]);

  // Save to LocalStorage whenever state changes (guarded against cross-project write during key change)
  useEffect(() => {
    if (activeLoadedKey !== safeProjectKey) return;
    const mirrorKeys = progressKeys.candidateKeys.slice(1);
    setLocalProgressItemByKeys(safeSlugKey, mirrorKeys, 'stages', JSON.stringify(stages));
    setLocalProgressItemByKeys(safeSlugKey, mirrorKeys, 'logs', JSON.stringify(logs));
    setLocalProgressItemByKeys(safeSlugKey, mirrorKeys, 'offer_accepted', JSON.stringify(isOfferAccepted));
    setLocalProgressItemByKeys(safeSlugKey, mirrorKeys, 'contract_date', contractDate);
    setLocalProgressItemByKeys(safeSlugKey, mirrorKeys, 'target_date', plannedCompletionDate);
    setLocalProgressItemByKeys(safeSlugKey, mirrorKeys, 'subcontractors', JSON.stringify(subcontractors));
  }, [
    stages,
    logs,
    isOfferAccepted,
    contractDate,
    plannedCompletionDate,
    subcontractors,
    safeProjectKey,
    safeSlugKey,
    progressKeys.candidateKeys,
    activeLoadedKey,
  ]);

  const matchingSavedProject = savedProjects.find(project =>
    project.projectAddress === params.projectAddress
  );

  // An unsaved workspace cannot become an archive entry by opening this screen.
  useEffect(() => {
    if (!user || activeLoadedKey !== safeProjectKey || !matchingSavedProject) return;
    const timer = setTimeout(() => {
      const currentSnapshot: SavedProjectData = {
        ...matchingSavedProject,
        updatedAt: new Date().toISOString(),
        params,
        results,
      };
      saveProjectToCloud(currentSnapshot).catch(err => {
        console.warn("Cloud construction progress sync error:", err);
        if (err instanceof Error && err.message.includes('1 MB belge sınırını')) {
          showToast(err.message, 'info');
        }
      });
    }, 1500); // 1.5 seconds debounce
    return () => clearTimeout(timer);
  }, [stages, logs, isOfferAccepted, contractDate, plannedCompletionDate, subcontractors, safeProjectKey, activeLoadedKey, user, matchingSavedProject]);

  // Overall progress calculation (weighted sum of stages)
  const overallProgress = useMemo(() => {
    const weightedSum = stages.reduce((acc, stage) => {
      return acc + (stage.progressPercent * (stage.weightPercent || 1));
    }, 0);
    const totalWeight = stages.reduce((acc, s) => acc + (s.weightPercent || 1), 0);
    return Math.min(100, Math.round(weightedSum / (totalWeight || 100)));
  }, [stages]);

  // Active stage (first stage that is not completed, or last if all completed)
  const currentActiveStage = useMemo(() => {
    return stages.find(s => s.status === 'in_progress') ||
           stages.find(s => s.status === 'delayed') ||
           stages.find(s => s.status === 'not_started') ||
           stages[stages.length - 1];
  }, [stages]);

  // Days remaining calculation
  const remainingDays = useMemo(() => {
    if (!plannedCompletionDate) return 0;
    const target = new Date(plannedCompletionDate).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [plannedCompletionDate]);

  // Subcontractor financial summary calculation
  const subcontractorSummary = useMemo(() => {
    let totalContract = 0;
    let totalPaid = 0;
    subcontractors.forEach(sub => {
      totalContract += sub.contractAmount;
      const subPaid = sub.payments.reduce((acc, p) => acc + p.amount, 0);
      totalPaid += subPaid;
    });
    const totalRemaining = totalContract - totalPaid;
    const paymentProgress = totalContract > 0 ? Math.round((totalPaid / totalContract) * 100) : 0;
    return {
      totalContract,
      totalPaid,
      totalRemaining,
      paymentProgress
    };
  }, [subcontractors]);

  // Update Stage Progress
  const handleUpdateStageProgress = (id: string, percent: number) => {
    setStages(prev => prev.map(stage => {
      if (stage.id !== id) return stage;
      const clamped = Math.min(100, Math.max(0, percent));
      let newStatus = stage.status;
      if (clamped === 100) newStatus = 'completed';
      else if (clamped > 0 && newStatus === 'not_started') newStatus = 'in_progress';
      return {
        ...stage,
        progressPercent: clamped,
        status: newStatus,
        endDateActual: clamped === 100 ? new Date().toISOString().slice(0, 10) : undefined,
      };
    }));
  };

  // Update Stage Status
  const handleUpdateStageStatus = (id: string, status: ConstructionStageStatus) => {
    setStages(prev => prev.map(stage => {
      if (stage.id !== id) return stage;
      let newPercent = stage.progressPercent;
      if (status === 'completed') newPercent = 100;
      else if (status === 'not_started') newPercent = 0;
      else if (status === 'in_progress' && newPercent === 0) newPercent = 25;
      return {
        ...stage,
        status,
        progressPercent: newPercent,
      };
    }));
  };

  // Toggle Stage Subtask
  const handleToggleSubtask = (stageId: string, subTaskId: string) => {
    setStages(prev => prev.map(stage => {
      if (stage.id !== stageId || !stage.subTasks) return stage;
      const updatedSubTasks = stage.subTasks.map(st => 
        st.id === subTaskId ? { ...st, completed: !st.completed } : st
      );
      // Auto compute stage progress from subtasks
      const completedCount = updatedSubTasks.filter(t => t.completed).length;
      const autoPercent = Math.round((completedCount / updatedSubTasks.length) * 100);
      return {
        ...stage,
        subTasks: updatedSubTasks,
        progressPercent: autoPercent,
        status: autoPercent === 100 ? 'completed' : autoPercent > 0 ? 'in_progress' : stage.status,
      };
    }));
  };

  // Add Log Entry
  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogTitle.trim()) return;

    const newEntry: ConstructionProgressLog = {
      id: 'log_' + Date.now(),
      date: new Date().toISOString().slice(0, 10),
      periodType: newLogPeriodType,
      periodLabel: sanitizeCustomerMessageText(newLogPeriodLabel.trim() || `${newLogPeriodType === 'weekly' ? 'Haftalık' : 'Aylık'} Rapor`),
      title: sanitizeCustomerMessageText(newLogTitle.trim()),
      overallProgress: overallProgress,
      completedWork: sanitizeCustomerMessageText(newLogCompleted.trim()),
      plannedNextWork: sanitizeCustomerMessageText(newLogPlanned.trim()),
      workDaysCount: Number(newLogWorkDays) || 6,
      weatherStatus: newLogWeather.trim(),
      isSharedWithClients: true,
    };

    setLogs([newEntry, ...logs]);
    setIsAddLogOpen(false);

    // Reset fields
    setNewLogTitle('');
    setNewLogPeriodLabel('');
    setNewLogCompleted('');
    setNewLogPlanned('');
  };

  // Delete Log Entry
  const handleDeleteLog = (id: string) => {
    if (window.confirm('Bu şantiye günlüğü kaydını silmek istediğinize emin misiniz?')) {
      setLogs(logs.filter(l => l.id !== id));
    }
  };

  // Add Subcontractor
  const handleAddSubcontractor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() || !subTrade.trim()) return;

    const newSub: Subcontractor = {
      id: 'sub_' + Date.now(),
      name: subName.trim(),
      trade: subTrade.trim(),
      contactPerson: subContact.trim(),
      phone: subPhone.trim(),
      contractAmount: Number(subContractAmount) || 0,
      contractDate: subContractDate,
      startDate: subStartDate,
      endDatePlanned: subEndDatePlanned,
      progressPercent: Number(subProgress) || 0,
      status: subStatus,
      payments: [],
      notes: subNotes.trim()
    };

    setSubcontractors([...subcontractors, newSub]);
    setIsAddSubOpen(false);

    // Reset fields
    setSubName('');
    setSubTrade('');
    setSubContact('');
    setSubPhone('');
    setSubContractAmount(0);
    setSubNotes('');
    setSubProgress(0);
    setSubStatus('not_started');
  };

  // Delete Subcontractor
  const handleDeleteSubcontractor = (id: string) => {
    if (window.confirm('Bu taşeron kaydını ve yapılan tüm ödeme geçmişini silmek istediğinize emin misiniz?')) {
      setSubcontractors(subcontractors.filter(s => s.id !== id));
      if (selectedSubcontractorId === id) {
        setSelectedSubcontractorId(null);
      }
    }
  };

  // Add Subcontractor Payment
  const handleAddPayment = (e: React.FormEvent, subId: string) => {
    e.preventDefault();
    if (payAmount <= 0) return;

    const newPayment: SubcontractorPayment = {
      id: 'p_' + Date.now(),
      date: payDate,
      amount: payAmount,
      paymentType: payType,
      paymentTypeLabel: payType === 'cash' ? 'Kasa Nakit' : payType === 'bank' ? 'Banka Havalesi' : payType === 'check' ? 'Şirket Çeki' : 'Diğer',
      description: payDescription.trim() || 'Hakediş Ödemesi'
    };

    setSubcontractors(prev => prev.map(sub => {
      if (sub.id !== subId) return sub;
      return {
        ...sub,
        payments: [...sub.payments, newPayment]
      };
    }));

    setIsAddPaymentOpen(false);
    // Reset fields
    setPayAmount(0);
    setPayDescription('');
  };

  // Delete Subcontractor Payment
  const handleDeletePayment = (subId: string, paymentId: string) => {
    if (window.confirm('Bu ödeme kaydını silmek istediğinize emin misiniz?')) {
      setSubcontractors(prev => prev.map(sub => {
        if (sub.id !== subId) return sub;
        return {
          ...sub,
          payments: sub.payments.filter(p => p.id !== paymentId)
        };
      }));
    }
  };

  // Execute Reset with either Clean 0% or Demo state
  const handleExecuteReset = (mode: 'clean' | 'demo') => {
    const startDate = new Date();
    const totalDays = totalMonths * 30;

    let nextStages: ConstructionStage[];
    if (mode === 'clean') {
      // 0% - Brand new construction site (all 12 stages at 0%, not_started, clean subtasks)
      nextStages = DEFAULT_STAGE_DEFINITIONS.map((def, idx) => {
        const startDayOffset = Math.floor((idx / DEFAULT_STAGE_DEFINITIONS.length) * totalDays);
        const stageDuration = Math.max(20, Math.floor((def.weightPercent / 100) * totalDays * 1.3));
        const stDate = new Date(startDate.getTime() + startDayOffset * 24 * 60 * 60 * 1000);
        const enDate = new Date(stDate.getTime() + stageDuration * 24 * 60 * 60 * 1000);
        return {
          ...def,
          progressPercent: 0,
          status: 'not_started' as ConstructionStageStatus,
          startDatePlanned: stDate.toISOString().slice(0, 10),
          endDatePlanned: enDate.toISOString().slice(0, 10),
          startDateActual: undefined,
          endDateActual: undefined,
          subTasks: def.subTasks ? def.subTasks.map(t => ({ ...t, completed: false })) : undefined,
        };
      });
    } else {
      // Demo / sample state
      nextStages = DEFAULT_STAGE_DEFINITIONS.map((def, idx) => {
        const startDayOffset = Math.floor((idx / DEFAULT_STAGE_DEFINITIONS.length) * totalDays);
        const stageDuration = Math.max(20, Math.floor((def.weightPercent / 100) * totalDays * 1.3));
        const stDate = new Date(startDate.getTime() + startDayOffset * 24 * 60 * 60 * 1000);
        const enDate = new Date(stDate.getTime() + stageDuration * 24 * 60 * 60 * 1000);
        return {
          ...def,
          startDatePlanned: stDate.toISOString().slice(0, 10),
          endDatePlanned: enDate.toISOString().slice(0, 10),
          startDateActual: def.status !== 'not_started' ? stDate.toISOString().slice(0, 10) : undefined,
          endDateActual: def.status === 'completed' ? enDate.toISOString().slice(0, 10) : undefined,
        };
      });
    }

    setStages(nextStages);
    try {
      localStorage.setItem(safeProjectKey + '_stages', JSON.stringify(nextStages));
    } catch (e) {}

    if (resetLogsOption) {
      setLogs([]);
      try {
        localStorage.setItem(safeProjectKey + '_logs', JSON.stringify([]));
      } catch (e) {}
    }

    setIsResetModalOpen(false);
    showToast(
      mode === 'clean'
        ? 'İnşaat aşamaları başarıyla %0 olarak sıfırlandı. Yeni şantiye takvimi hazır!'
        : 'İnşaat aşamaları örnek demo takvimine güncellendi.'
    );
  };

  // Quick notify for a specific stage from the timeline card
  const handleQuickNotifyStage = (stage: ConstructionStage) => {
    setSelectedStageId(stage.id);
    setPeriodMode('milestone_stage');
    setIsManuallyEdited(false);
    setActiveSubTab('notification');
    showToast(`"${stage.name}" aşaması için bilgilendirme mesajı hazırlandı.`);
  };

  // Create a new concurrent construction site
  const handleCreateNewSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteAddress.trim()) {
      showToast('Lütfen şantiye adresini veya ada/parsel bilgisini girin.', 'info');
      return;
    }

    const cleanName = newSiteName.trim() || newSiteAddress.trim().slice(0, 40);
    const months = Number(newSiteMonths) || 14;
    const baseArea = Number(newSiteBaseArea) || 120;
    const flCount = Number(newSiteFloorCount) || 5;
    const fPerFloor = Number(newSiteFlatsPerFloor) || 2;
    const totalFlats = flCount * fPerFloor;

    const baseNewParams: ProjectParams = {
      ...DEFAULT_PARAMS,
      ...projectBasePrices(profile, latestExchange()),
      projectName: cleanName,
      projectAddress: newSiteAddress.trim(),
      manualMonths: months,
      baseBuildArea: baseArea,
      floorCount: flCount,
      flatsPerFloor: fPerFloor,
      flatCount: totalFlats,
      isOfferAccepted: true,
      proposalStatus: 'active_site',
      flats: Array.from({ length: totalFlats }, (_, i) => ({
        id: i + 1,
        name: `Kat Maliki ${i + 1}`,
        area: Math.round((baseArea * 0.8) / fPerFloor),
        tc: '',
        phone: '',
        downPayment: 0,
        useTransformationCredit: false,
      })),
    };

    const compName = profile.companyName || 'AB YAPI';
    const initialOfferMeta = appendOfferStatusHistory(
      {
        ...baseNewParams,
        offerMeta: buildInitializedOfferMeta(baseNewParams, compName),
      },
      compName,
      'draft',
      'active_site',
      'Yeni şantiye oluşturuldu ve süreç başlatıldı'
    );

    const newParams: ProjectParams = {
      ...baseNewParams,
      offerMeta: initialOfferMeta,
    };

    const calculated = calculateProject(newParams);

    const newSnapshot: SavedProjectData = {
      version: '1.0.0',
      savedAt: new Date().toISOString(),
      projectAddress: newSiteAddress.trim(),
      params: newParams,
      results: calculated,
    };

    // Pre-initialize clean 0% stages in localStorage for this new site
    const newKey =
      'ab_yapi_progress_' +
      resolveProjectProgressKeys({
        projectAddress: newSiteAddress.trim(),
        projectName: cleanName,
      }).primaryKey;
    const startDate = new Date();
    const totalDays = months * 30;
    const startIso = startDate.toISOString().slice(0, 10);
    const targetIso = new Date(startDate.getTime() + totalDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const freshStages = DEFAULT_STAGE_DEFINITIONS.map((def, idx) => {
      const startDayOffset = Math.floor((idx / DEFAULT_STAGE_DEFINITIONS.length) * totalDays);
      const stageDuration = Math.max(20, Math.floor((def.weightPercent / 100) * totalDays * 1.3));
      const stDate = new Date(startDate.getTime() + startDayOffset * 24 * 60 * 60 * 1000);
      const enDate = new Date(stDate.getTime() + stageDuration * 24 * 60 * 60 * 1000);
      return {
        ...def,
        progressPercent: 0,
        status: 'not_started' as ConstructionStageStatus,
        startDatePlanned: stDate.toISOString().slice(0, 10),
        endDatePlanned: enDate.toISOString().slice(0, 10),
        startDateActual: undefined,
        endDateActual: undefined,
        subTasks: def.subTasks ? def.subTasks.map(t => ({ ...t, completed: false })) : undefined,
      };
    });

    try {
      localStorage.setItem(newKey + '_stages', JSON.stringify(freshStages));
      localStorage.setItem(newKey + '_logs', JSON.stringify([]));
      localStorage.setItem(newKey + '_subcontractors', JSON.stringify([]));
      localStorage.setItem(newKey + '_offer_accepted', JSON.stringify(true));
      localStorage.setItem(newKey + '_contract_date', startIso);
      localStorage.setItem(newKey + '_target_date', targetIso);
    } catch (e) {}

    if (onAddNewProject) {
      onAddNewProject(newSnapshot);
    } else if (onSelectProject) {
      onSelectProject(newSnapshot);
    }

    setIsNewProjectModalOpen(false);
    setNewSiteName('');
    setNewSiteAddress('');
    showToast(`"${cleanName}" yeni şantiyesi başarıyla oluşturuldu ve yüklendi!`);
  };

  // Multi-Project Portfolio projects list
  const portfolioList = useMemo(() => {
    const currentItem = {
      id: safeProjectKey,
      name: params.projectName || params.projectAddress || 'Mevcut Şantiye',
      address: params.projectAddress || 'Adres Belirtilmedi',
      totalArea: results.totalArea || 0,
      flatCount: results.flatCount || params.flatCount || 0,
      floorCount: params.floorCount || 5,
      overallProgress: overallProgress,
      activeStageName: currentActiveStage?.name || 'Kaba Yapı',
      status: overallProgress === 100 ? ('completed' as const) : overallProgress > 0 ? ('in_progress' as const) : ('preparing' as const),
      remainingDays: remainingDays,
      targetDate: plannedCompletionDate,
      contractDate: contractDate,
      subcontractorCount: subcontractors.length,
      isCurrent: true,
      rawProject: undefined as SavedProjectData | undefined,
    };

    const list: typeof currentItem[] = [currentItem];

    if (savedProjects && savedProjects.length > 0) {
      savedProjects.forEach(sp => {
        const spKeys = resolveProjectProgressKeys({
          projectAddress: sp.projectAddress,
          projectName: sp.params?.projectName,
        });
        const spSlug = spKeys.primaryKey;
        const spKey = 'ab_yapi_progress_' + spSlug;
        if (spKey === safeProjectKey) {
          currentItem.rawProject = sp;
          return;
        }

        let spProgress = 0;
        let spActiveStageName = '1. Proje & Ruhsat';
        try {
          const spStagesStr = getLocalProgressItemByKeys(spKeys.candidateKeys, 'stages');
          if (spStagesStr) {
            const spStages: ConstructionStage[] = JSON.parse(spStagesStr);
            const wSum = spStages.reduce((acc, s) => acc + (s.progressPercent * (s.weightPercent || 1)), 0);
            const tW = spStages.reduce((acc, s) => acc + (s.weightPercent || 1), 0);
            spProgress = Math.min(100, Math.round(wSum / (tW || 100)));
            const activeSt = spStages.find(s => s.status === 'in_progress') || spStages.find(s => s.status === 'not_started') || spStages[0];
            if (activeSt) spActiveStageName = activeSt.name;
          }
        } catch (e) {}

        let spSubsCount = 0;
        try {
          const spSubsStr = getLocalProgressItemByKeys(spKeys.candidateKeys, 'subcontractors');
          if (spSubsStr) {
            spSubsCount = JSON.parse(spSubsStr).length;
          }
        } catch (e) {}

        const targetDate = getLocalProgressItemByKeys(spKeys.candidateKeys, 'target_date') || defaultDates.endDateStr;
        const targetMs = new Date(targetDate).getTime();
        const nowMs = Date.now();
        const remDays = Math.max(0, Math.ceil((targetMs - nowMs) / (1000 * 60 * 60 * 24)));

        list.push({
          id: spKey,
          name: sp.params.projectName || sp.projectAddress,
          address: sp.projectAddress,
          totalArea: sp.results?.totalArea || 0,
          flatCount: sp.results?.flatCount || sp.params?.flatCount || 0,
          floorCount: sp.params?.floorCount || 5,
          overallProgress: spProgress,
          activeStageName: spActiveStageName,
          status: spProgress === 100 ? ('completed' as const) : spProgress > 0 ? ('in_progress' as const) : ('preparing' as const),
          remainingDays: remDays,
          targetDate: targetDate,
          contractDate: (sp.params as any)?.contractDate || new Date().toISOString().slice(0, 10),
          subcontractorCount: spSubsCount,
          isCurrent: false,
          rawProject: sp,
        });
      });
    }

    return list;
  }, [safeProjectKey, params, results, overallProgress, currentActiveStage, remainingDays, plannedCompletionDate, contractDate, subcontractors.length, savedProjects, defaultDates]);

  // Filtered portfolio list
  const filteredPortfolio = useMemo(() => {
    return portfolioList.filter(item => {
      const q = portfolioSearchQuery.toLowerCase().trim();
      const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.address.toLowerCase().includes(q);
      const matchesStatus = portfolioStatusFilter === 'all' || item.status === portfolioStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [portfolioList, portfolioSearchQuery, portfolioStatusFilter]);

  // Aggregate metrics for multiple construction sites
  const portfolioAggregates = useMemo(() => {
    const totalSites = portfolioList.length;
    const totalArea = portfolioList.reduce((acc, s) => acc + (s.totalArea || 0), 0);
    const totalFlats = portfolioList.reduce((acc, s) => acc + (s.flatCount || 0), 0);
    const avgProgress = Math.round(portfolioList.reduce((acc, s) => acc + (s.overallProgress || 0), 0) / (totalSites || 1));
    const totalSubs = portfolioList.reduce((acc, s) => acc + (s.subcontractorCount || 0), 0);
    const inProgressCount = portfolioList.filter(s => s.status === 'in_progress').length;
    const completedCount = portfolioList.filter(s => s.status === 'completed').length;
    const preparingCount = portfolioList.filter(s => s.status === 'preparing').length;
    return {
      totalSites,
      totalArea,
      totalFlats,
      avgProgress,
      totalSubs,
      inProgressCount,
      completedCount,
      preparingCount,
    };
  }, [portfolioList]);

  // Aggregate Category percentages for stage scorecards
  const categoryProgress = useMemo(() => {
    const getCatPct = (cat: string) => {
      const catStages = stages.filter(s => s.category === cat);
      if (catStages.length === 0) return 0;
      const wSum = catStages.reduce((acc, s) => acc + (s.progressPercent * (s.weightPercent || 1)), 0);
      const tW = catStages.reduce((acc, s) => acc + (s.weightPercent || 1), 0);
      return Math.min(100, Math.round(wSum / (tW || 1)));
    };
    return {
      projeRuhsat: getCatPct('proje_ruhsat'),
      kabaYapi: getCatPct('kaba_yapi'),
      tesisatInce: getCatPct('tesisat_ince'),
      teslim: getCatPct('teslim'),
    };
  }, [stages]);

  // Ascii / Unicode Progress Bar Generator for SMS & WhatsApp
  const makeAsciiProgressBar = (pct: number) => {
    const total = 10;
    const filled = Math.min(total, Math.max(0, Math.round((pct / 100) * total)));
    return '▓'.repeat(filled) + '░'.repeat(total - filled);
  };

  // Generate Message Template aligned with construction stages and payment milestones
  const generateMessageContent = () => {
    const compName = profile.companyName || 'AB YAPI';
    const projName = params.projectName || params.projectAddress || 'İstanbul Kentsel Dönüşüm Projemiz';
    const todayStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
    const selectedLog = logs.find(l => l.id === selectedLogId) || logs[0];
    const selectedStage = stages.find(s => s.id === selectedStageId) || currentActiveStage;

    // Determine period label & title
    let periodLabel = 'Haftalık İnşaat İlerleme Bülteni';
    let periodIcon = '🏗️';
    let completedText = '';
    let plannedText = '';
    let effectiveProgress = overallProgress;

    if (periodMode === 'active_stage_live') {
      periodLabel = sanitizeCustomerMessageText(`Mevcut Faz Durumu: ${currentActiveStage?.name || 'Kaba Yapı'}`);
      periodIcon = '🏗️';
      effectiveProgress = overallProgress;
      const completedSub = currentActiveStage?.subTasks?.filter(t => t.completed).map(t => `• ${t.title}`).join('\n');
      const pendingSub = currentActiveStage?.subTasks?.filter(t => !t.completed).map(t => `• ${t.title}`).join('\n');
      completedText = completedSub ? `Tamamlanan İmalat Adımları:\n${completedSub}` : (currentActiveStage?.notes || 'İmalatlar devam etmektedir.');
      plannedText = pendingSub ? `Aynı Aşamada Devam Eden / Sıradaki İşler:\n${pendingSub}` : 'Aşama tamamlanmak üzeredir, sonraki faza geçilecektir.';
    } else if (periodMode === 'milestone_stage') {
      periodLabel = sanitizeCustomerMessageText(`Aşama Tamamlandı: ${selectedStage?.name || 'İnşaat Fazı'}`);
      periodIcon = '🎉';
      effectiveProgress = overallProgress;
      const allSub = selectedStage?.subTasks?.map(t => `• ${t.title} (Tamamlandı)`).join('\n');
      completedText = `"${selectedStage?.name}" etabı şantiyemizde Yapı Denetim ve Şantiye Şefliğimiz kontrolünde eksiksiz tamamlanmıştır.\n${allSub || selectedStage?.notes || ''}`;
      plannedText = 'Bir sonraki imalat etabına derhal başlanmış olup şantiye takvimine uygun şekilde hızla ilerlenmektedir.';
    } else if (periodMode === 'stage_payment_call') {
      periodLabel = sanitizeCustomerMessageText(`Hakediş & Ödeme Bilgilendirmesi (${selectedStage?.name || 'Aşama Ödemesi'})`);
      periodIcon = '💳';
      effectiveProgress = overallProgress;
      completedText = `Sözleşmemizin hakediş protokolü uyarınca "${selectedStage?.name}" imalatları başarıyla tamamlanmış olup ilgili aşama hakediş taksiti muaccel hale gelmiştir.\nKat maliklerimizin sözleşmede kararlaştırılan hakediş bedellerini şirket hesabına intikal ettirmesi rica olunur.`;
      plannedText = 'Ödemelerin tamamlanmasının ardından bir sonraki etap imalatlarına aralıksız devam edilecektir.';
    } else if (periodMode === 'full_stage_scorecard') {
      periodLabel = '12 Aşamalı Genel Şantiye Süreç Karnesi';
      periodIcon = '📊';
      effectiveProgress = overallProgress;
      completedText = `Kategori Bazlı Şantiye Fiziki Gerçekleşme:\n` +
        `1️⃣ Proje, Zemin & Ruhsat: %${categoryProgress.projeRuh…31401 tokens truncated…-[10px] font-black uppercase tracking-wider">
                  Resmî Şantiye Durum Raporu
                </span>
                <p className="text-xs font-bold text-slate-800">
                  Rapor Tarihi: {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Ref: RAPOR-{new Date().getFullYear()}-{params.flatCount || 10}
                </p>
              </div>
            </div>

            {/* Project Summary Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proje Adresi & İmar</span>
                  <h3 className="text-base font-black text-slate-900">
                    {params.projectAddress || 'İstanbul Kentsel Dönüşüm Projesi'}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Toplam Fiziki Gerçekleşme</span>
                  <div className="text-2xl font-black text-indigo-600">
                    %{overallProgress}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Kat Adedi</span>
                  <span className="font-bold text-slate-800">{params.floorCount} Kat</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Bağımsız Bölüm</span>
                  <span className="font-bold text-slate-800">{params.flatCount} Daire</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Sözleşme Tarihi</span>
                  <span className="font-bold text-slate-800">{contractDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Hedef Teslim</span>
                  <span className="font-bold text-slate-800">{plannedCompletionDate}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mr-1.5">Teklif Numarası:</span>
                  <span className="font-mono font-bold text-indigo-700">{proposalNumber}</span>
                </div>
                {params.customContractNotes && params.customContractNotes.trim() && (
                  <div className="text-slate-700">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mr-1.5">Sözleşme Özel Notları:</span>
                    <span className="font-medium">{params.customContractNotes.trim()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stages Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b pb-1">
                İnşaat Aşamaları ve Gerçekleşme Oranları
              </h4>

              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-[10px] uppercase text-slate-500 font-black">
                    <th className="py-2">No & İmalat Aşaması</th>
                    <th className="py-2">Sorumlu</th>
                    <th className="py-2 text-center">Ağırlık</th>
                    <th className="py-2 text-center">Durum</th>
                    <th className="py-2 text-right">Tamamlanma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stages.map((stage) => (
                    <tr key={stage.id} className="hover:bg-slate-50">
                      <td className="py-2 font-semibold text-slate-900 pr-2">
                        {stage.name}
                      </td>
                      <td className="py-2 text-slate-600 text-[11px]">
                        {stage.responsible}
                      </td>
                      <td className="py-2 text-center font-mono font-bold text-slate-500">
                        %{stage.weightPercent}
                      </td>
                      <td className="py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          stage.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : stage.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {stage.status === 'completed' ? 'Tamamlandı' : stage.status === 'in_progress' ? 'Devam Ediyor' : 'Planlandı'}
                        </span>
                      </td>
                      <td className="py-2 text-right font-black text-slate-900">
                        %{stage.progressPercent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Latest Update & Notes */}
            {logs[0] && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <span className="text-[10px] font-black uppercase text-indigo-700 block">
                  Son Şantiye Raporu Özeti ({logs[0].periodLabel} &bull; {logs[0].date})
                </span>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {logs[0].completedWork}
                </p>
                <p className="text-slate-500 text-[11px] pt-1 border-t border-slate-200">
                  <b>Sıradaki Adım:</b> {logs[0].plannedNextWork}
                </p>
              </div>
            )}

            {/* Signatures & Certification */}
            <div className="pt-8 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Yapı Denetim & İSG Sorumlusu</span>
                <p className="font-bold text-slate-900">Teknik Kontrolör</p>
                <p className="text-[10px] text-slate-500">İnşaat Ruhsatı & Şantiye Denetimi</p>
                <div className="h-12 border-b border-dashed border-slate-300 mt-2" />
                <span className="text-[9px] text-slate-400">İmza / Tarih</span>
              </div>

              <div className="space-y-1 text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Yüklenici Firma Yetkilisi</span>
                <p className="font-bold text-slate-900">{profile.authorizedPerson || 'Müh. Alpaslan Beyoğlu'}</p>
                <p className="text-[10px] text-slate-500">{profile.authorizedTitle || 'Genel Müdür / İnşaat Mühendisi'}</p>
                <div className="h-12 border-b border-dashed border-slate-300 mt-2 flex justify-end items-center">
                  {profile.stampBase64 && (
                    <img src={profile.stampBase64} alt="Kaşe" className="h-10 object-contain" referrerPolicy="no-referrer" />
                  )}
                </div>
                <span className="text-[9px] text-slate-400">Kaşe / Islak İmza</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. SUB-TAB: INTERNAL TRACKING & SUBCONTRACTORS                 */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'subcontractors' && (
        <div className="space-y-6">
          {/* TOP ANALYTICS BENTO GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                🤝 Toplam Taşeron Taahhütleri
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 tracking-tight">
                {subcontractorSummary.totalContract.toLocaleString('tr-TR')} <span className="text-xs font-bold text-slate-500">TL</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Aktif şantiyedeki toplam sözleşmeli taşeron iş bedeli.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                💵 Toplam Yapılan Ödemeler
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-900 tracking-tight">
                {subcontractorSummary.totalPaid.toLocaleString('tr-TR')} <span className="text-xs font-bold text-emerald-600">TL</span>
              </div>
              <p className="text-[10px] text-emerald-700 font-medium">
                Taşeronlara bugüne kadar kasa ve bankadan ödenen miktar.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-100 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider block">
                ⏳ Kalan Finansal Bakiye
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-amber-900 tracking-tight">
                {subcontractorSummary.totalRemaining.toLocaleString('tr-TR')} <span className="text-xs font-bold text-amber-600">TL</span>
              </div>
              <p className="text-[10px] text-amber-700 font-medium">
                Sözleşmelere göre taşeronlara yapılacak kalan borç tutarı.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 shadow-2xs flex flex-col justify-between min-h-[105px]">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-indigo-800 tracking-wider flex items-center justify-between">
                  <span>📊 Ödeme Oranı</span>
                  <span className="font-mono text-xs font-extrabold text-indigo-700">%{subcontractorSummary.paymentProgress}</span>
                </span>
                <div className="w-full bg-indigo-100 h-2 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-500 rounded-full" 
                    style={{ width: `${subcontractorSummary.paymentProgress}%` }}
                  />
                </div>
              </div>
              <p className="text-[10px] text-indigo-700 font-medium mt-1">
                Kaba ve ince yapı taşeron hakedişlerinin ödenme yüzdesi.
              </p>
            </div>
          </div>

          {/* ADD NEW SUBCONTRACTOR COLLAPSIBLE PANEL */}
          {isAddSubOpen && (
            <div className="bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-sm space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <HardHat className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-black text-slate-800">Yeni Alt Yüklenici / Taşeron Tanımla</h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsAddSubOpen(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Kapat
                </button>
              </div>

              <form onSubmit={handleAddSubcontractor} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">👤 Taşeron / Firma Adı</label>
                    <input 
                      type="text"
                      required
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                      placeholder="Örn: Kuzey Yapı Doğrama A.Ş."
                      className="w-full text-xs font-bold px-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">🏗️ Yapacağı İş Kolu / Kategori</label>
                    <input 
                      type="text"
                      required
                      value={subTrade}
                      onChange={(e) => setSubTrade(e.target.value)}
                      placeholder="Örn: PVC Pencere ve Cam Çözümleri"
                      className="w-full text-xs font-bold px-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">📞 Yetkili Kişi & İletişim</label>
                    <input 
                      type="text"
                      value={subContact}
                      onChange={(e) => setSubContact(e.target.value)}
                      placeholder="Örn: Serkan Demir (Şantiye Sorumlusu)"
                      className="w-full text-xs font-bold px-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">📱 Telefon Numarası</label>
                    <input 
                      type="text"
                      value={subPhone}
                      onChange={(e) => setSubPhone(e.target.value)}
                      placeholder="Örn: 0532 123 45 67"
                      className="w-full text-xs font-bold px-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">💰 Toplam Sözleşme Tutarı (TL)</label>
                    <div className="relative flex items-center">
                      <input 
                        type="number"
                        min="0"
                        required
                        value={subContractAmount || ''}
                        onChange={(e) => setSubContractAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="Örn: 750000"
                        className="w-full text-xs font-black font-mono pl-3.5 pr-8 py-3 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                      />
                      <span className="absolute right-3.5 text-xs font-black text-slate-400 font-mono">TL</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">📅 Sözleşme İmza Tarihi</label>
                    <input 
                      type="date"
                      value={subContractDate}
                      onChange={(e) => setSubContractDate(e.target.value)}
                      className="w-full text-xs font-bold px-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">🚀 İşe Başlama Tarihi</label>
                    <input 
                      type="date"
                      value={subStartDate}
                      onChange={(e) => setSubStartDate(e.target.value)}
                      className="w-full text-xs font-bold px-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">🏁 Planlanan İmalat Bitiş Tarihi</label>
                    <input 
                      type="date"
                      value={subEndDatePlanned}
                      onChange={(e) => setSubEndDatePlanned(e.target.value)}
                      className="w-full text-xs font-bold px-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">📊 Başlangıç İlerleme Yüzdesi (%)</label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={subProgress}
                      onChange={(e) => setSubProgress(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      placeholder="Örn: 0"
                      className="w-full text-xs font-bold px-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">🚦 Taşeronun Aktif Durumu</label>
                    <select 
                      value={subStatus}
                      onChange={(e) => setSubStatus(e.target.value as any)}
                      className="w-full text-xs font-bold px-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                    >
                      <option value="not_started">Henüz Başlamadı</option>
                      <option value="in_progress">Aktif Çalışıyor (Şantiyede)</option>
                      <option value="completed">İşini Tamamladı / Devretti</option>
                      <option value="paused">Geçici Olarak Durduruldu / Askıda</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">📝 Genel Notlar & Sözleşme Detayları</label>
                    <input 
                      type="text"
                      value={subNotes}
                      onChange={(e) => setSubNotes(e.target.value)}
                      placeholder="Örn: Ödemeler 3 ara hakedişle yapılacaktır."
                      className="w-full text-xs font-bold px-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsAddSubOpen(false)}
                    className="px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 cursor-pointer animate-scaleIn"
                  >
                    Vazgeç
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-600/10 cursor-pointer animate-scaleIn"
                  >
                    Taşeronu Kaydet
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MAIN GRID COLLABORATION VIEW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT 2 COLUMNS: LIST OF SUBCONTRACTORS */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <span>📋 Aktif Alt Yükleniciler & Sözleşmeler</span>
                    <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {subcontractors.length} Firma
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Projede görevli alt yükleniciler, taahhüt tutarları ve finansal durum hakedişleri.
                  </p>
                </div>
                {!isClientMode && (
                  <button 
                    type="button" 
                    onClick={() => setIsAddSubOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Yeni Taşeron Ekle</span>
                  </button>
                )}
              </div>

              {subcontractors.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                  <HardHat className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">Tanımlı Alt Yüklenici Bulunamadı</p>
                  <p className="text-[11px] text-slate-400">Yeni bir taşeron eklemek için sağ üstteki butona tıklayın.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                        <th className="p-3">Taşeron / Firma</th>
                        <th className="p-3">Sözleşme Bedeli</th>
                        <th className="p-3">Ödenen Tutar</th>
                        <th className="p-3">Kalan Borç</th>
                        <th className="p-3 text-center">İş İlerleme</th>
                        <th className="p-3">Durum</th>
                        <th className="p-3 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subcontractors.map((sub) => {
                        const subPaid = sub.payments.reduce((acc, p) => acc + p.amount, 0);
                        const subRemaining = sub.contractAmount - subPaid;
                        const isSelected = selectedSubcontractorId === sub.id;

                        return (
                          <tr 
                            key={sub.id}
                            onClick={() => setSelectedSubcontractorId(sub.id)}
                            className={`border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors ${
                              isSelected ? 'bg-indigo-50/40 hover:bg-indigo-50/50' : ''
                            }`}
                          >
                            <td className="p-3 space-y-1">
                              <div className="font-black text-slate-900 flex items-center gap-1.5">
                                <HardHat className="w-3.5 h-3.5 text-slate-500" />
                                <span>{sub.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded w-max">
                                {sub.trade}
                              </div>
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {sub.contractAmount.toLocaleString('tr-TR')} <span className="text-[10px] font-bold text-slate-400">TL</span>
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-700 whitespace-nowrap">
                              {subPaid.toLocaleString('tr-TR')} <span className="text-[10px] font-bold text-emerald-400">TL</span>
                            </td>
                            <td className="p-3 font-mono font-bold text-amber-700 whitespace-nowrap">
                              {subRemaining.toLocaleString('tr-TR')} <span className="text-[10px] font-bold text-amber-400">TL</span>
                            </td>
                            <td className="p-3 text-center space-y-1 min-w-[80px]">
                              <span className="font-mono font-black text-[11px] text-slate-800">%{sub.progressPercent}</span>
                              <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden mx-auto">
                                <div 
                                  className="bg-emerald-500 h-full" 
                                  style={{ width: `${sub.progressPercent}%` }}
                                />
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                sub.status === 'completed' 
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : sub.status === 'in_progress'
                                  ? 'bg-blue-100 text-blue-800'
                                  : sub.status === 'paused'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {sub.status === 'completed' ? 'Tamamlandı' : sub.status === 'in_progress' ? 'Çalışıyor' : sub.status === 'paused' ? 'Askıda' : 'Başlamadı'}
                              </span>
                            </td>
                            <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button 
                                  type="button"
                                  onClick={() => setSelectedSubcontractorId(sub.id)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 cursor-pointer"
                                  title="Detay ve Ödemeler"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                                {!isClientMode && (
                                  <button 
                                    type="button"
                                    onClick={() => handleDeleteSubcontractor(sub.id)}
                                    className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 cursor-pointer"
                                    title="Taşeronu Sil"
                                  >
                                    <Trash2 className="w-4 h-4" />
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
              )}
            </div>

            {/* RIGHT COLUMN: INSPECTOR PANEL FOR SELECTED SUBCONTRACTOR */}
            <div className="space-y-6">
              {(() => {
                const selectedSub = subcontractors.find(s => s.id === selectedSubcontractorId);

                if (!selectedSub) {
                  return (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 text-center space-y-3.5 shadow-2xs h-full flex flex-col justify-center items-center py-16">
                      <div className="p-3 bg-slate-50 text-slate-400 rounded-full">
                        <HardHat className="w-8 h-8" />
                      </div>
                      <div className="space-y-1 max-w-[240px]">
                        <h4 className="text-xs font-black text-slate-800">Taşeron Detay Paneli</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Ödeme hakediş geçmişi kaydetmek, sözleşme taahhüt detaylarını ve iletişim bilgilerini yönetmek için soldaki tablodan bir taşeron seçin.
                        </p>
                      </div>
                    </div>
                  );
                }

                const subPaid = selectedSub.payments.reduce((acc, p) => acc + p.amount, 0);
                const subRemaining = selectedSub.contractAmount - subPaid;

                return (
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden divide-y divide-slate-100">
                    {/* PANEL HEADER */}
                    <div className="p-5 bg-slate-50/50 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded uppercase tracking-wide inline-block">
                            {selectedSub.trade}
                          </span>
                          <h4 className="text-xs font-black text-slate-900">{selectedSub.name}</h4>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setSelectedSubcontractorId(null)}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Kapat
                        </button>
                      </div>

                      {/* CALL INFO */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100 space-y-0.5">
                          <span className="text-[9px] text-slate-400 font-bold block">İletişim Yetkilisi</span>
                          <span className="font-bold text-slate-800 truncate block">{selectedSub.contactPerson || 'Belirtilmedi'}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100 space-y-0.5">
                          <span className="text-[9px] text-slate-400 font-bold block">Telefon</span>
                          <a 
                            href={`tel:${selectedSub.phone}`}
                            className="font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{selectedSub.phone || 'Girilmedi'}</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* INTERACTIVE STATE MODIFIERS */}
                    {!isClientMode && (
                      <div className="p-4 bg-white space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 block">İş Tamamlama %</label>
                            <input 
                              type="number"
                              min="0"
                              max="100"
                              value={selectedSub.progressPercent}
                              onChange={(e) => {
                                const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                setSubcontractors(prev => prev.map(s => s.id === selectedSub.id ? { ...s, progressPercent: val, status: val === 100 ? 'completed' : s.status } : s));
                              }}
                              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 block">Şantiye Durumu</label>
                            <select 
                              value={selectedSub.status}
                              onChange={(e) => {
                                const val = e.target.value as any;
                                setSubcontractors(prev => prev.map(s => s.id === selectedSub.id ? { ...s, status: val } : s));
                              }}
                              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white"
                            >
                              <option value="not_started">Başlamadı</option>
                              <option value="in_progress">Çalışıyor</option>
                              <option value="completed">Tamamlandı</option>
                              <option value="paused">Askıda</option>
                            </select>
                          </div>
                        </div>

                        {selectedSub.notes && (
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[10px] text-slate-500 font-medium leading-relaxed">
                            <b>Sözleşme Notu:</b> {selectedSub.notes}
                          </div>
                        )}
                      </div>
                    )}

                    {/* FINANCES COMPARISON */}
                    <div className="p-4 bg-slate-50/30 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-bold">Sözleşme Tutarı:</span>
                        <span className="font-mono font-black text-slate-900">{selectedSub.contractAmount.toLocaleString('tr-TR')} TL</span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-700">
                        <span className="font-bold">Ödenen Tutar:</span>
                        <span className="font-mono font-black">{subPaid.toLocaleString('tr-TR')} TL</span>
                      </div>
                      <div className="flex items-center justify-between text-amber-700 pt-1.5 border-t border-slate-100">
                        <span className="font-bold">Kalan Bakiye:</span>
                        <span className="font-mono font-black">{subRemaining.toLocaleString('tr-TR')} TL</span>
                      </div>
                    </div>

                    {/* PAYMENTS HISTORY LIST */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                          💵 Ödeme & Hakediş Geçmişi ({selectedSub.payments.length})
                        </h5>
                        {!isClientMode && (
                          <button 
                            type="button"
                            onClick={() => setIsAddPaymentOpen(!isAddPaymentOpen)}
                            className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Ödeme Ekle</span>
                          </button>
                        )}
                      </div>

                      {/* COMPACT ADD PAYMENT FORM INLINE */}
                      {isAddPaymentOpen && !isClientMode && (
                        <form 
                          onSubmit={(e) => handleAddPayment(e, selectedSub.id)} 
                          className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 space-y-2.5 animate-fadeIn"
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                              <label className="text-[9px] font-bold text-slate-600">Ödeme Tutarı (TL)</label>
                              <input 
                                type="number"
                                min="1"
                                required
                                value={payAmount || ''}
                                onChange={(e) => setPayAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                                placeholder="Tutar"
                                className="w-full text-xs font-black px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[9px] font-bold text-slate-600">Ödeme Tarihi</label>
                              <input 
                                type="date"
                                required
                                value={payDate}
                                onChange={(e) => setPayDate(e.target.value)}
                                className="w-full text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                              <label className="text-[9px] font-bold text-slate-600">Ödeme Yöntemi</label>
                              <select 
                                value={payType}
                                onChange={(e) => setPayType(e.target.value as any)}
                                className="w-full text-[10px] font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                              >
                                <option value="bank">Banka Havalesi</option>
                                <option value="cash">Kasa Nakit</option>
                                <option value="check">Şirket Çeki</option>
                                <option value="other">Diğer</option>
                              </select>
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[9px] font-bold text-slate-600">Açıklama / Hakediş</label>
                              <input 
                                type="text"
                                value={payDescription}
                                onChange={(e) => setPayDescription(e.target.value)}
                                placeholder="Örn: 2. Kat Döşeme Hakedişi"
                                className="w-full text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-1.5 pt-1">
                            <button 
                              type="button" 
                              onClick={() => setIsAddPaymentOpen(false)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 cursor-pointer"
                            >
                              İptal
                            </button>
                            <button 
                              type="submit" 
                              className="px-2.5 py-1 text-[10px] font-black bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-xs cursor-pointer"
                            >
                              Kaydet
                            </button>
                          </div>
                        </form>
                      )}

                      {/* COMPACT PAYMENTS HISTORY ROWS */}
                      {selectedSub.payments.length === 0 ? (
                        <p className="text-[11px] text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-100">
                          Henüz hiçbir ödeme veya avans kaydı yapılmadı.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {selectedSub.payments.map((p) => (
                            <div 
                              key={p.id}
                              className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition-colors"
                            >
                              <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                                <div className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-emerald-700">{p.amount.toLocaleString('tr-TR')} TL</span>
                                  <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-bold">{p.paymentTypeLabel}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium truncate">
                                  {p.description} &bull; <span className="text-slate-400 font-semibold">{p.date}</span>
                                </div>
                              </div>
                              {!isClientMode && (
                                <button 
                                  type="button"
                                  onClick={() => handleDeletePayment(selectedSub.id, p.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded-md cursor-pointer hover:bg-white flex-shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: RESET CONSTRUCTION STAGES & TIMELINE MODAL           */}
      {/* ------------------------------------------------------------- */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in print:hidden">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    İnşaat Aşamaları ve Takvim Sıfırlama
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {params.projectName || params.projectAddress || 'Mevcut Şantiye'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
              <p className="font-extrabold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Bu işlem şantiye ilerleme durumunu yeniden yapılandırır.</span>
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Aşağıdaki sıfırlama türünü seçip onayladığınızda, seçilen şantiyenin 12 aşaması güncellenecektir.
              </p>
            </div>

            {/* Reset Mode Selection */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-800 block">
                Sıfırlama Şablonunu Seçin:
              </label>

              <label
                onClick={() => setResetModeOption('clean')}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                  resetModeOption === 'clean'
                    ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="resetOption"
                  checked={resetModeOption === 'clean'}
                  onChange={() => setResetModeOption('clean')}
                  className="mt-0.5 text-indigo-600"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-slate-900">%0 Temiz Şantiye Başlangıcı</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800">
                      Önerilen
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Tüm 12 inşaat aşamasını <b>%0</b> durumuna çeker, işaretlenmiş alt görevleri temizler ve bugünün tarihinden itibaren sözleşme süresine ({totalMonths} ay) göre gerçekçi yeni bir şantiye takvimi oluşturur.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setResetModeOption('demo')}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                  resetModeOption === 'demo'
                    ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="resetOption"
                  checked={resetModeOption === 'demo'}
                  onChange={() => setResetModeOption('demo')}
                  className="mt-0.5 text-indigo-600"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-extrabold text-slate-900">Örnek Demo Takvimi</span>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Örnek imalat yüzdeleri (kaba yapı devam eden, ruhsat tamamlanan vb.) içeren tanıtım verisini yükler.
                  </p>
                </div>
              </label>
            </div>

            {/* Checkbox to also clear logs */}
            <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={resetLogsOption}
                onChange={(e) => setResetLogsOption(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span>Şantiye bültenlerini ve haftalık rapor geçmişini de temizle</span>
            </label>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
              >
                Vazgeç
              </button>

              <button
                type="button"
                onClick={() => handleExecuteReset(resetModeOption)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-extrabold shadow-md shadow-rose-600/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Sıfırlamayı Onayla & Uygula</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: ADD NEW CONCURRENT CONSTRUCTION SITE / PROJECT        */}
      {/* ------------------------------------------------------------- */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in print:hidden">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-up max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Yeni Şantiye / İnşaat Projesi Başlat
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Portföye ekleyin, eşzamanlı olarak bağımsız yönetin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateNewSite} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  🏗️ Proje / Şantiye Adı
                </label>
                <input
                  type="text"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="Örn: Moda Kentsel Dönüşüm Projesi"
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  📍 Şantiye Adresi / Ada-Parsel <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newSiteAddress}
                  onChange={(e) => setNewSiteAddress(e.target.value)}
                  placeholder="Örn: Kadıköy Caferağa Mah. Moda Cad. No: 42 (Ada 124 / Parsel 8)"
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    ⏱️ Sözleşme Süresi (Ay)
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="48"
                    value={newSiteMonths}
                    onChange={(e) => setNewSiteMonths(Math.max(6, parseInt(e.target.value) || 12))}
                    className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    📐 Taban Oturumu (m²)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="5000"
                    value={newSiteBaseArea}
                    onChange={(e) => setNewSiteBaseArea(Math.max(50, parseInt(e.target.value) || 120))}
                    className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    🏢 Kat Sayısı
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newSiteFloorCount}
                    onChange={(e) => setNewSiteFloorCount(Math.max(1, parseInt(e.target.value) || 5))}
                    className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    🚪 Kat Başı Daire Sayısı
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newSiteFlatsPerFloor}
                    onChange={(e) => setNewSiteFlatsPerFloor(Math.max(1, parseInt(e.target.value) || 2))}
                    className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Dynamic summary */}
              <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Hesaplanan Hacim</span>
                  <span className="font-extrabold text-slate-800">
                    {newSiteFloorCount * newSiteFlatsPerFloor} Bağımsız Bölüm &bull; {Math.round(newSiteBaseArea * newSiteFloorCount * 1.35)} m² İnşaat
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Başlangıç Durumu</span>
                  <span className="font-extrabold text-emerald-700">%0 Temiz Takvim</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-600/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Şantiyeyi Başlat & Portföye Ekle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
