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
  Share
} from 'lucide-react';
import {
  ProjectParams,
  CalculationResult,
  AppTheme,
  ConstructionStage,
  ConstructionProgressLog,
  ConstructionStageStatus,
  ConstructionPeriodType,
  ClientNotificationDraft,
  ConstructionProgressProjectState
} from '../types';
import { useCompanyProfile } from '../context/CompanyProfileContext';
import { exportElementToPdf, printHtmlContent } from '../utils/pdfExport';
import { Logo } from './Logo';

interface ConstructionProgressTabProps {
  params: ProjectParams;
  results: CalculationResult;
  theme?: AppTheme;
  onNavigateToOffer?: () => void;
  onNavigateToContract?: () => void;
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

export const ConstructionProgressTab: React.FC<ConstructionProgressTabProps> = ({
  params,
  results,
  theme = 'light',
  onNavigateToOffer,
  onNavigateToContract,
}) => {
  const { profile } = useCompanyProfile();
  const isGray = theme === 'gray';
  const cardBg = isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200';
  const printDocRef = useRef<HTMLDivElement>(null);

  // Storage key based on project address to support multi-project persistence
  const safeProjectKey = useMemo(() => {
    const addr = params.projectAddress || 'default_project';
    return 'ab_yapi_progress_' + addr.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }, [params.projectAddress]);

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

  // Main State
  const [stages, setStages] = useState<ConstructionStage[]>(() => {
    try {
      const saved = localStorage.getItem(safeProjectKey + '_stages');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    // Initialize with distributed dates across total duration
    const startDate = new Date();
    const totalDays = totalMonths * 30;

    return DEFAULT_STAGE_DEFINITIONS.map((def, idx) => {
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
  });

  // Logs (Weekly & Monthly Reports)
  const [logs, setLogs] = useState<ConstructionProgressLog[]>(() => {
    try {
      const saved = localStorage.getItem(safeProjectKey + '_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    return [
      {
        id: 'log_1',
        date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        periodType: 'weekly',
        periodLabel: 'Hafta 1 (Yıkım & Güvenlik)',
        title: 'Mevcut Yapı Yıkımı Tamamlandı ve Molozlar Taşındı',
        overallProgress: 14,
        completedWork: 'Bina çevre perdesi çekildi, İSKİ/BEDAŞ/İGDAŞ kesimleri yapıldı ve kontrollü yıkım tamamlanarak hafriyat kotuna inildi.',
        plannedNextWork: 'Zemin drenajı, geoteknik kontroller ve temel altı grobeton dökümü gerçekleştirilecektir.',
        workDaysCount: 6,
        weatherStatus: 'Açık / Şantiye şartları uygun',
        isSharedWithClients: true,
      },
      {
        id: 'log_2',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        periodType: 'weekly',
        periodLabel: 'Hafta 3 (Radye Temel)',
        title: 'Radye Temel Betonu Döküldü ve Su Yalıtımı Tamamlandı',
        overallProgress: 32,
        completedWork: 'Çift kat mebran bohçalama üzerine C35/40 hazır beton dökümü gerçekleştirildi. Laboratuvar numuneleri alındı.',
        plannedNextWork: 'Bodrum kat betonarme perdeleri ve zemin kat döşeme kalıpları kurulmaya başlanacaktır.',
        workDaysCount: 6,
        weatherStatus: 'Parçalı bulutlu / Beton kürü sağlandı',
        isSharedWithClients: true,
      }
    ];
  });

  // Project Info State
  const [isOfferAccepted, setIsOfferAccepted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(safeProjectKey + '_offer_accepted');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return true; // Default to accepted in tracking tab
  });

  const [contractDate, setContractDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(safeProjectKey + '_contract_date');
      if (saved) return saved;
    } catch (e) {}
    return new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  });

  const [plannedCompletionDate, setPlannedCompletionDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(safeProjectKey + '_target_date');
      if (saved) return saved;
    } catch (e) {}
    return defaultDates.endDateStr;
  });

  // View Mode: 'admin' (can edit everything) vs 'client' (clean view for clients)
  const [isClientMode, setIsClientMode] = useState<boolean>(false);

  // Active Sub-Tab: 'timeline' | 'logs' | 'notification' | 'report'
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'logs' | 'notification' | 'report'>('timeline');

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
  type PeriodSelectMode = 'weekly_current' | 'monthly_current' | 'specific_log' | 'milestone_stage' | 'custom_period';

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
      const saved = localStorage.getItem(safeProjectKey + '_notif_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(safeProjectKey + '_notif_history', JSON.stringify(notificationHistory));
    } catch (e) {}
  }, [notificationHistory, safeProjectKey]);

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(safeProjectKey + '_stages', JSON.stringify(stages));
      localStorage.setItem(safeProjectKey + '_logs', JSON.stringify(logs));
      localStorage.setItem(safeProjectKey + '_offer_accepted', JSON.stringify(isOfferAccepted));
      localStorage.setItem(safeProjectKey + '_contract_date', contractDate);
      localStorage.setItem(safeProjectKey + '_target_date', plannedCompletionDate);
    } catch (e) {}
  }, [stages, logs, isOfferAccepted, contractDate, plannedCompletionDate, safeProjectKey]);

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
      periodLabel: newLogPeriodLabel.trim() || `${newLogPeriodType === 'weekly' ? 'Haftalık' : 'Aylık'} Rapor`,
      title: newLogTitle.trim(),
      overallProgress: overallProgress,
      completedWork: newLogCompleted.trim(),
      plannedNextWork: newLogPlanned.trim(),
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

  // Reset to default stages
  const handleResetStages = () => {
    if (window.confirm('Tüm aşamaları ve varsayılan takvimi sıfırlamak istediğinize emin misiniz?')) {
      const startDate = new Date();
      const totalDays = totalMonths * 30;

      const freshStages = DEFAULT_STAGE_DEFINITIONS.map((def, idx) => {
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

      setStages(freshStages);
    }
  };

  // Ascii / Unicode Progress Bar Generator for SMS & WhatsApp
  const makeAsciiProgressBar = (pct: number) => {
    const total = 10;
    const filled = Math.min(total, Math.max(0, Math.round((pct / 100) * total)));
    return '▓'.repeat(filled) + '░'.repeat(total - filled);
  };

  // Generate Message Template for any selected period
  const generateMessageContent = () => {
    const compName = profile.companyName || 'AB YAPI';
    const projName = params.projectAddress || 'İstanbul Kentsel Dönüşüm Projemiz';
    const todayStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
    const selectedLog = logs.find(l => l.id === selectedLogId) || logs[0];
    const selectedStage = stages.find(s => s.id === selectedStageId) || currentActiveStage;

    // Determine period label & title
    let periodLabel = 'Haftalık İnşaat İlerleme Bülteni';
    let periodIcon = '🏗️';
    let completedText = selectedLog?.completedWork || 'Kalıp, demir ve beton döküm imalatları şantiyede eksiksiz tamamlanmıştır.';
    let plannedText = selectedLog?.plannedNextWork || 'Önümüzdeki etap karkas ve donatı işleri takvime uygun sürdürülecektir.';
    let effectiveProgress = overallProgress;

    if (periodMode === 'weekly_current') {
      periodLabel = `Haftalık İnşaat Bülteni (${todayStr})`;
      periodIcon = '🏗️';
      completedText = selectedLog?.completedWork || 'Kaba inşaat kalıp ve donatı işleri tamamlandı.';
      plannedText = selectedLog?.plannedNextWork || 'Bir sonraki kat tabliyesi ve kolon betonu dökülecektir.';
      effectiveProgress = overallProgress;
    } else if (periodMode === 'monthly_current') {
      const monthName = new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
      periodLabel = `Aylık İnşaat Faaliyet Raporu (${monthName})`;
      periodIcon = '🏢';
      completedText = selectedLog?.completedWork || 'Aylık hakediş ve imalat programındaki tüm betonarme işleri tamamlanmıştır.';
      plannedText = selectedLog?.plannedNextWork || 'Sonraki ay tesisat altyapı ve duvar örüm imalatlarına geçilecektir.';
      effectiveProgress = overallProgress;
    } else if (periodMode === 'specific_log') {
      periodLabel = selectedLog?.periodLabel || 'Şantiye Bülteni';
      periodIcon = '📝';
      completedText = selectedLog?.completedWork || '';
      plannedText = selectedLog?.plannedNextWork || '';
      effectiveProgress = selectedLog?.overallProgress || overallProgress;
    } else if (periodMode === 'milestone_stage') {
      periodLabel = `Kritik Aşama Müjdesi: ${selectedStage?.name || 'İmalat Aşaması'}`;
      periodIcon = '🎉';
      completedText = selectedStage?.notes || `${selectedStage?.name} aşaması tüm kontrolleri yapılarak başarıyla tamamlanmıştır.`;
      plannedText = 'Sonraki imalat etabına derhal başlanmaktadır.';
      effectiveProgress = overallProgress;
    } else if (periodMode === 'custom_period') {
      periodLabel = customPeriodTitle || 'Şantiye Özel Duyurusu';
      periodIcon = '📢';
    }

    // Recipient Greeting
    let greeting = 'Sayın Kat Maliklerimiz,';
    if (recipientType === 'individual' && recipientName.trim()) {
      const flatInfo = selectedFlatId ? ` (Daire ${selectedFlatId})` : '';
      greeting = `Sayın ${recipientName.trim()}${flatInfo},`;
    }

    // 1. WHATSAPP FORMAT (Rich with Emojis & Bold structure)
    if (messageChannel === 'whatsapp') {
      let msg = `${periodIcon} *${compName.toUpperCase()} - ${periodLabel.toUpperCase()}*\n`;
      msg += `📍 *Proje:* ${projName}\n`;
      msg += `📅 *Tarih:* ${todayStr}\n\n`;

      msg += `${greeting}\n`;

      if (periodMode === 'milestone_stage') {
        msg += `Binamızın inşaat yolculuğunda önemli bir dönüm noktasını daha başarıyla tamamladık:\n`;
        msg += `🎯 *${selectedStage?.name}* aşaması tamamlandı!\n\n`;
      } else {
        msg += `Kentsel dönüşüm projemizin seçili dönem saha ilerleme ve şantiye bülteni bilgilerinize sunulmuştur:\n\n`;
      }

      if (includeProgressBar) {
        const bar = makeAsciiProgressBar(effectiveProgress);
        msg += `📊 *Fiziki İlerleme:* [${bar}] *%${effectiveProgress}*\n`;
      }

      if (includeRemainingDays) {
        msg += `⏱️ *Kalan Süre:* ${remainingDays} Gün (Hedef Teslim: ${plannedCompletionDate})\n`;
        msg += `🏗️ *Mevcut Faz:* ${currentActiveStage?.name || 'Kaba Yapı'}\n\n`;
      } else {
        msg += `\n`;
      }

      if (includeCompleted && completedText) {
        msg += `✅ *Tamamlanan İmalatlar:*\n${completedText}\n\n`;
      }

      if (includePlanned && plannedText) {
        msg += `🔜 *Gelecek Dönem Hedefleri:*\n${plannedText}\n\n`;
      }

      if (includeWeather && selectedLog?.weatherStatus) {
        msg += `🌤️ *Şantiye Şartları:* ${selectedLog.weatherStatus} (${selectedLog.workDaysCount || 6} aktif iş günü)\n\n`;
      }

      if (customNote.trim()) {
        msg += `📌 *Özel Şantiye Notu:*\n${customNote.trim()}\n\n`;
      }

      if (includeContact) {
        msg += `Tüm imalatlarımız yürürlükteki Deprem Yönetmeliği ve Yapı Denetim standartlarına uygun olarak sürdürülmektedir.\n\n`;
        msg += `*${compName} Şantiye Yönetimi*\n`;
        if (profile.authorizedPerson) msg += `Yetkili: ${profile.authorizedPerson}\n`;
        if (profile.phone) msg += `📞 İletişim: ${profile.phone}\n`;
        if (profile.website) msg += `🌐 ${profile.website}\n`;
      }

      return msg.trim();
    }

    // 2. SMS FORMAT (Concise, character-optimized)
    if (messageChannel === 'sms') {
      let sms = `${compName} - ${projName.slice(0, 30)}: `;
      if (recipientType === 'individual' && recipientName.trim()) {
        sms = `Sn. ${recipientName.trim()}, ${sms}`;
      }
      sms += `${periodLabel}. `;
      if (includeProgressBar) {
        sms += `Ilerleme: %${effectiveProgress}. `;
      }
      if (includeCompleted && completedText) {
        const shortCompleted = completedText.length > 90 ? completedText.slice(0, 87) + '...' : completedText;
        sms += `Yapilan: ${shortCompleted} `;
      }
      if (includeRemainingDays) {
        sms += `Kalan: ${remainingDays} gun (Hedef: ${plannedCompletionDate}). `;
      }
      if (customNote.trim()) {
        sms += `Not: ${customNote.trim()} `;
      }
      if (includeContact && profile.phone) {
        sms += `Bilgi: ${profile.phone}`;
      }
      return sms.trim();
    }

    // 3. EMAIL FORMAT (Formal corporate letter)
    if (messageChannel === 'email') {
      let em = `Konu: ${projName} - ${periodLabel}\n\n`;
      em += `${greeting}\n\n`;
      em += `${profile.legalName || compName} olarak yapımını üstlendiğimiz ${projName} adresindeki kentsel dönüşüm projemizin ${periodLabel} özeti aşağıda bilgilerinize sunulmuştur.\n\n`;

      em += `GENEL ŞANTİYE DURUMU:\n`;
      em += `----------------------------------------\n`;
      em += `• Toplam Fiziki Gerçekleşme: %${effectiveProgress}\n`;
      em += `• Aktif Çalışılan Aşama: ${currentActiveStage?.name || 'Kaba Yapı'}\n`;
      em += `• Sözleşme Bitiş & Teslim Tarihi: ${plannedCompletionDate} (${remainingDays} gün kalmıştır)\n`;
      if (includeWeather && selectedLog?.weatherStatus) {
        em += `• Saha Koşulları: ${selectedLog.weatherStatus}\n`;
      }
      em += `\n`;

      if (includeCompleted && completedText) {
        em += `TAMAMLANAN İMALATLAR:\n`;
        em += `${completedText}\n\n`;
      }

      if (includePlanned && plannedText) {
        em += `ÖNÜMÜZDEKİ PERİYOTTA GERÇEKLEŞTİRİLECEK İŞLER:\n`;
        em += `${plannedText}\n\n`;
      }

      if (customNote.trim()) {
        em += `ŞANTİYE VE YÖNETİM DUYURUSU:\n`;
        em += `${customNote.trim()}\n\n`;
      }

      em += `Tüm aşamalar yapı denetim firması ve mühendislerimiz kontrolünde titizlikle sürdürülmektedir. Canlı süreç karnemizi inceleyebilir, her türlü sorunuz için şantiye ofisimiz ile iletişime geçebilirsiniz.\n\n`;
      em += `Saygılarımızla,\n`;
      em += `${profile.legalName || compName}\n`;
      em += `${profile.authorizedPerson || 'Şantiye Yönetimi'} - ${profile.authorizedTitle || 'İnşaat Mühendisi'}\n`;
      em += `Telefon: ${profile.phone || '+90 (212) 585 10 20'}\n`;
      em += `Web: ${profile.website || 'www.abyapi.com.tr'}\n`;

      return em.trim();
    }

    return '';
  };

  // Automatically update message body whenever parameters change unless user made manual edits
  useEffect(() => {
    if (!isManuallyEdited) {
      const generated = generateMessageContent();
      setMessageBody(generated);
    }
  }, [
    periodMode,
    selectedLogId,
    selectedStageId,
    customPeriodTitle,
    customNote,
    messageChannel,
    includeProgressBar,
    includeRemainingDays,
    includeCompleted,
    includePlanned,
    includeWeather,
    includeContact,
    recipientType,
    recipientName,
    overallProgress,
    remainingDays,
    plannedCompletionDate,
    params.projectAddress,
    profile.companyName,
    isManuallyEdited
  ]);

  // Record a sent notification in history
  const recordNotificationSent = (channel: 'whatsapp' | 'sms' | 'email', text: string) => {
    const periodLabel = periodMode === 'weekly_current' ? 'Haftalık Bülten' :
      periodMode === 'monthly_current' ? 'Aylık Rapor' :
      periodMode === 'specific_log' ? 'Şantiye Günlüğü' :
      periodMode === 'milestone_stage' ? 'Aşama Müjdesi' : 'Özel Bildirim';

    const recLabel = recipientType === 'all'
      ? 'Tüm Kat Malikleri (Grup)'
      : (recipientName ? `${recipientName} (${recipientPhone || 'Telefon yok'})` : 'Bireysel Malik');

    const newHistoryItem = {
      id: 'notif_' + Date.now(),
      timestamp: new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      channel,
      periodLabel,
      recipientLabel: recLabel,
      text,
    };

    setNotificationHistory(prev => [newHistoryItem, ...prev.slice(0, 19)]);
  };

  // Copy to clipboard
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageBody);
    setCopySuccess(true);
    recordNotificationSent(messageChannel, messageBody);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Open WhatsApp
  const handleSendWhatsApp = () => {
    const text = encodeURIComponent(messageBody);
    const cleanPhone = recipientPhone ? recipientPhone.replace(/[^0-9]/g, '') : '';
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, '_blank');
    recordNotificationSent('whatsapp', messageBody);
  };

  // Send SMS
  const handleSendSMS = () => {
    const text = encodeURIComponent(messageBody);
    const cleanPhone = recipientPhone ? recipientPhone.replace(/[^0-9]/g, '') : '';
    const url = cleanPhone ? `sms:${cleanPhone}?body=${text}` : `sms:?body=${text}`;
    window.location.href = url;
    recordNotificationSent('sms', messageBody);
  };

  // Send Email
  const handleSendEmail = () => {
    const subject = encodeURIComponent(`${params.projectAddress || 'Projemiz'} İnşaat İlerleme Raporu`);
    const body = encodeURIComponent(messageBody);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    recordNotificationSent('email', messageBody);
  };

  // Native Web Share API
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${params.projectAddress || 'Projemiz'} İnşaat İlerleme Raporu`,
          text: messageBody,
        });
        setShareSuccess(true);
        recordNotificationSent(messageChannel, messageBody);
        setTimeout(() => setShareSuccess(false), 2500);
      } catch (e) {
        // User cancelled share
      }
    } else {
      handleCopyMessage();
    }
  };

  // Export PDF
  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* TOP HEADER & ACTION CONTROLS */}
      <div className={`${cardBg} rounded-3xl border p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 print:hidden`}>
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
              <HardHat className="w-3.5 h-3.5" />
              İnşaat Süreç & İlerleme Portalı
            </span>
            {isOfferAccepted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Teklif Kabul Edildi (İnşaat Fazı)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
                Teklif Değerlendirme Aşamasında
              </span>
            )}
            <span className="text-xs text-slate-400 font-medium">
              Sözleşme Süresi: {totalMonths} Ay ({totalMonths * 30} Gün)
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {params.projectAddress || 'Proje Süreç Takibi'}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Teklif kabulü sonrası 12 resmî imalat aşamasının, haftalık şantiye bültenlerinin ve hak sahipleri bilgilendirme süreçlerinin canlı takip platformu.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setIsClientMode(!isClientMode)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isClientMode
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/20'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isClientMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{isClientMode ? 'Yönetici Moduna Dön' : 'Müşteri Canlı Modu'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('notification');
              // scroll into view
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Müşterilere Mesaj Gönder</span>
          </button>

          <button
            type="button"
            onClick={handlePrintPdf}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>PDF Çıktısı Al</span>
          </button>
        </div>
      </div>

      {/* OVERALL METRICS BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Overall Progress */}
        <div className={`${cardBg} rounded-2xl border p-5 shadow-xs flex flex-col justify-between relative overflow-hidden`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fiziki İlerleme</span>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">%{overallProgress}</span>
              <span className="text-xs font-bold text-emerald-600">
                {overallProgress >= 100 ? 'Teslime Hazır' : 'Faal Şantiye'}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3 border border-slate-200">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>12 Aşamadan Ağırlıklı</span>
            <span>Hedef: %100</span>
          </div>
        </div>

        {/* Metric 2: Active Stage */}
        <div className={`${cardBg} rounded-2xl border p-5 shadow-xs flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aktif İmalat Fazı</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <h4 className="text-sm font-extrabold text-slate-900 line-clamp-2 leading-snug">
              {currentActiveStage?.name || 'Temel & Bodrum'}
            </h4>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-600">
                Aşama İlerlemesi: %{currentActiveStage?.progressPercent || 0}
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <span>Sorumlu:</span>
            <span className="font-semibold text-slate-700 truncate">{currentActiveStage?.responsible}</span>
          </div>
        </div>

        {/* Metric 3: Target Completion & Remaining Days */}
        <div className={`${cardBg} rounded-2xl border p-5 shadow-xs flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kalan Süre & Hedef</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{remainingDays}</span>
              <span className="text-xs font-bold text-slate-500">Gün Kaldı</span>
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              Teslim: {new Date(plannedCompletionDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>Resmî Takvime Tam Uyumlu</span>
          </div>
        </div>

        {/* Metric 4: Stage Completion Ratio */}
        <div className={`${cardBg} rounded-2xl border p-5 shadow-xs flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aşama Durumu</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {stages.filter(s => s.status === 'completed').length} / {stages.length}
              </span>
              <span className="text-xs font-bold text-slate-500">Tamamlandı</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stages.filter(s => s.status === 'in_progress').length} Devam Ediyor &bull; {stages.filter(s => s.status === 'not_started').length} Planlandı
            </p>
          </div>
          <div className="text-[10px] text-slate-500 flex items-center justify-between">
            <span>Bağımsız Bölüm: {params.flatCount} Adet</span>
            <span>Kat: {params.floorCount}</span>
          </div>
        </div>
      </div>

      {/* SUB-TAB NAVIGATOR (print:hidden) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar print:hidden">
        <button
          type="button"
          onClick={() => setActiveSubTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'timeline'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>12 İnşaat Aşaması & Yol Haritası</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'logs'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Haftalık / Aylık Şantiye Günlüğü ({logs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('notification')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'notification'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Müşteri Bilgilendirme Mesaj Motoru</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('report')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'report'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Resmî Canlı Süreç Raporu (A4)</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. SUB-TAB: 12 CONSTRUCTION STAGES & TIMELINE                  */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'timeline' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                12
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">
                  Resmî Kentsel Dönüşüm & İnşaat İmalat Fazları
                </h4>
                <p className="text-[11px] text-slate-600">
                  Her aşamanın ilerleme yüzdesini güncelleyebilir, alt görevleri işaretleyerek fiziki gerçekleşmeyi takip edebilirsiniz.
                </p>
              </div>
            </div>

            {!isClientMode && (
              <button
                type="button"
                onClick={handleResetStages}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                title="Aşamaları varsayılan süre ve değerlerle yeniden hesapla"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Takvimi Sıfırla</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stages.map((stage) => {
              const isCompleted = stage.status === 'completed';
              const isInProgress = stage.status === 'in_progress';
              const isDelayed = stage.status === 'delayed';

              let statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
              let statusLabel = 'Planlandı';

              if (isCompleted) {
                statusBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                statusLabel = 'Tamamlandı';
              } else if (isInProgress) {
                statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
                statusLabel = 'Devam Ediyor';
              } else if (isDelayed) {
                statusBadgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
                statusLabel = 'Gecikmede';
              }

              return (
                <div
                  key={stage.id}
                  className={`${cardBg} rounded-2xl border p-5 shadow-xs transition-all duration-200 flex flex-col justify-between space-y-4`}
                >
                  <div className="space-y-3">
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {stage.categoryLabel} &bull; Ağırlık: %{stage.weightPercent}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900 mt-1.5 leading-snug">
                          {stage.name}
                        </h4>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider shrink-0 ${statusBadgeClass}`}>
                        {statusLabel}
                      </span>
                    </div>

                    {/* Progress Bar & Percentage */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold">İlerleme Oranı</span>
                        <span className="font-extrabold text-slate-900">%{stage.progressPercent}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-emerald-600' : isInProgress ? 'bg-indigo-600' : 'bg-slate-300'
                          }`}
                          style={{ width: `${stage.progressPercent}%` }}
                        />
                      </div>

                      {/* Admin Slider Control */}
                      {!isClientMode && (
                        <div className="pt-1 flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={stage.progressPercent}
                            onChange={(e) => handleUpdateStageProgress(stage.id, Number(e.target.value))}
                            className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateStageProgress(stage.id, 0)}
                              className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-600 cursor-pointer"
                            >
                              0%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStageProgress(stage.id, 50)}
                              className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-600 cursor-pointer"
                            >
                              50%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStageProgress(stage.id, 100)}
                              className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-100 hover:bg-emerald-200 font-bold text-emerald-800 cursor-pointer"
                            >
                              100%
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Subtasks checklist */}
                    {stage.subTasks && stage.subTasks.length > 0 && (
                      <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          İmalat Adımları & Kontrol Noktaları
                        </span>
                        <div className="space-y-1.5">
                          {stage.subTasks.map((task) => (
                            <label
                              key={task.id}
                              className={`flex items-start gap-2 text-xs transition-colors ${
                                isClientMode ? 'cursor-default' : 'cursor-pointer hover:text-indigo-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                disabled={isClientMode}
                                checked={task.completed}
                                onChange={() => handleToggleSubtask(stage.id, task.id)}
                                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer disabled:cursor-default"
                              />
                              <span className={task.completed ? 'line-through text-slate-400 font-medium' : 'text-slate-700 font-semibold'}>
                                {task.title}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes & details */}
                    <div className="text-xs text-slate-600 space-y-1">
                      <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                        &ldquo;{stage.notes}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Stage Footer: Dates & Status changer */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {stage.startDatePlanned} &rarr; {stage.endDatePlanned}
                      </span>
                    </div>

                    {!isClientMode ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={stage.status}
                          onChange={(e) => handleUpdateStageStatus(stage.id, e.target.value as ConstructionStageStatus)}
                          className="text-[11px] font-bold px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer"
                        >
                          <option value="not_started">Planlandı</option>
                          <option value="in_progress">Devam Ediyor</option>
                          <option value="completed">Tamamlandı</option>
                          <option value="delayed">Gecikmede</option>
                        </select>
                      </div>
                    ) : (
                      <span className="font-semibold text-slate-600">
                        Yetkili: {stage.responsible}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. SUB-TAB: WEEKLY / MONTHLY CONSTRUCTION LOGS (BÜLTENLER)    */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'logs' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Şantiye İlerleme Günlüğü & Faaliyet Bültenleri
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Haftalık ve aylık periyotlarla kaydedilen şantiye raporları, tamamlanan imalatlar ve hak sahipleri paylaşımları.
              </p>
            </div>

            {!isClientMode && (
              <button
                type="button"
                onClick={() => setIsAddLogOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Bülten / Rapor Ekle</span>
              </button>
            )}
          </div>

          {/* Add Log Modal */}
          {isAddLogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
              <div className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📝</span>
                    <h4 className="text-sm font-extrabold text-slate-900">Yeni Şantiye Bülteni Ekle</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddLogOpen(false)}
                    className="text-slate-400 hover:text-slate-700 text-lg leading-none"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleAddLog} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Rapor Periyodu</label>
                      <select
                        value={newLogPeriodType}
                        onChange={(e) => setNewLogPeriodType(e.target.value as ConstructionPeriodType)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-none"
                      >
                        <option value="weekly">Haftalık İlerleme Raporu</option>
                        <option value="monthly">Aylık Şantiye Özeti</option>
                        <option value="milestone">Kritik Aşama / Milat Duyurusu</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dönem Başlığı</label>
                      <input
                        type="text"
                        required
                        value={newLogPeriodLabel}
                        onChange={(e) => setNewLogPeriodLabel(e.target.value)}
                        placeholder="Örn: 4. Hafta (1-7 Kasım) veya Kasım Ayı"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-none"
                      >
                      </input>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bülten Konu Başlığı</label>
                    <input
                      type="text"
                      required
                      value={newLogTitle}
                      onChange={(e) => setNewLogTitle(e.target.value)}
                      placeholder="Örn: 1. Kat Tablası Betonu Döküldü ve Laboratuvar Onayı Alındı"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bu Periyotta Tamamlanan İmalatlar</label>
                    <textarea
                      required
                      rows={3}
                      value={newLogCompleted}
                      onChange={(e) => setNewLogCompleted(e.target.value)}
                      placeholder="Bu hafta/ay şantiyede tamamlanan tüm işleri detaylandırın..."
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Önümüzdeki Periyot Hedefleri</label>
                    <textarea
                      required
                      rows={2}
                      value={newLogPlanned}
                      onChange={(e) => setNewLogPlanned(e.target.value)}
                      placeholder="Önümüzdeki hafta başlayacak veya tamamlanacak işler..."
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Çalışılan Gün</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={newLogWorkDays}
                        onChange={(e) => setNewLogWorkDays(Number(e.target.value))}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Hava / Zemin Şartları</label>
                      <input
                        type="text"
                        value={newLogWeather}
                        onChange={(e) => setNewLogWeather(e.target.value)}
                        placeholder="Örn: Açık, Sıcaklık 18°C"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsAddLogOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
                    >
                      Bülteni Kaydet
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Logs List */}
          <div className="space-y-4">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div
                  key={log.id}
                  className={`${cardBg} rounded-2xl border p-5 shadow-xs space-y-3 relative`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                        #{logs.length - index}
                      </span>
                      <div>
                        <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-100">
                          {log.periodLabel} &bull; {log.date}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900 mt-1">
                          {log.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold rounded-full">
                        İlerleme: %{log.overallProgress}
                      </span>
                      {!isClientMode && (
                        <button
                          type="button"
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Bülteni Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[10px] font-extrabold text-emerald-700 uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Tamamlanan İmalatlar
                      </span>
                      <p className="text-slate-700 font-medium leading-relaxed">
                        {log.completedWork}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[10px] font-extrabold text-indigo-700 uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Önümüzdeki Periyot Hedefleri
                      </span>
                      <p className="text-slate-700 font-medium leading-relaxed">
                        {log.plannedNextWork}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-slate-500 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <span>Çalışılan Gün: <b>{log.workDaysCount || 6} Gün</b></span>
                      <span>Hava Durumu: <b>{log.weatherStatus || 'Uygun'}</b></span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPeriodMode('specific_log');
                        setSelectedLogId(log.id);
                        setMessageChannel('whatsapp');
                        setIsManuallyEdited(false);
                        setActiveSubTab('notification');
                      }}
                      className="flex items-center gap-1 text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Bu Bülteni Bildirim Şablonunda Aç & Paylaş &rarr;</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Henüz kayıtlı şantiye bülteni bulunmamaktadır.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. SUB-TAB: CLIENT NOTIFICATION & AUTOMATED MESSAGING ENGINE   */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'notification' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50/60 border border-emerald-200/80 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20 shrink-0">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">
                    Otomatik Müşteri & Hak Sahibi Bilgilendirme Motoru
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Canlı Şantiye Senkron
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Seçili periyotlar (haftalık, aylık, kayıtlı bülten veya aşama müjdesi) için şablonlar oluşturun; WhatsApp, SMS veya E-posta ile paylaşın.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-white/80 backdrop-blur-xs border border-slate-200 px-3 py-1.5 rounded-xl text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Şantiye İlerlemesi</span>
                <span className="text-xs font-black text-emerald-600">%{overallProgress} Tamamlandı</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ----------------------------------------------------------- */}
            {/* LEFT COLUMN: PERIOD & TEMPLATE SETTINGS (5 Cols)           */}
            {/* ----------------------------------------------------------- */}
            <div className="lg:col-span-5 space-y-5">
              {/* Adım 1: Periyot & Rapor Türü */}
              <div className={`${cardBg} rounded-2xl border p-5 shadow-xs space-y-4`}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>1. Periyot & Rapor Türü</span>
                  </label>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {periodMode === 'weekly_current' ? 'Haftalık' :
                     periodMode === 'monthly_current' ? 'Aylık' :
                     periodMode === 'specific_log' ? 'Bülten Seçimi' :
                     periodMode === 'milestone_stage' ? 'Aşama Müjdesi' : 'Özel Dönem'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodMode('weekly_current');
                      setIsManuallyEdited(false);
                    }}
                    className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                      periodMode === 'weekly_current'
                        ? 'bg-indigo-50/90 border-indigo-300 text-indigo-900 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <span>📢</span> Bu Hafta
                      </span>
                      {periodMode === 'weekly_current' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 font-normal">
                      Haftalık tamamlanan işler ve hedefler
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPeriodMode('monthly_current');
                      setIsManuallyEdited(false);
                    }}
                    className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                      periodMode === 'monthly_current'
                        ? 'bg-indigo-50/90 border-indigo-300 text-indigo-900 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <span>🗓️</span> Bu Ay
                      </span>
                      {periodMode === 'monthly_current' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 font-normal">
                      Aylık genel gerçekleşme & takvim
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPeriodMode('specific_log');
                      setIsManuallyEdited(false);
                    }}
                    className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                      periodMode === 'specific_log'
                        ? 'bg-indigo-50/90 border-indigo-300 text-indigo-900 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <span>📜</span> Kayıtlı Bülten
                      </span>
                      {periodMode === 'specific_log' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 font-normal">
                      Geçmiş şantiye raporlarından biri
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPeriodMode('milestone_stage');
                      setIsManuallyEdited(false);
                    }}
                    className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                      periodMode === 'milestone_stage'
                        ? 'bg-indigo-50/90 border-indigo-300 text-indigo-900 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <span>🏆</span> Aşama Müjdesi
                      </span>
                      {periodMode === 'milestone_stage' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 font-normal">
                      Önemli bir imalat tamamlandığında
                    </p>
                  </button>
                </div>

                {/* Sub-selectors based on mode */}
                {periodMode === 'specific_log' && (
                  <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-1.5">
                    <label className="text-[11px] font-extrabold text-indigo-950 block">
                      Paylaşılacak Şantiye Bültenini Seçin:
                    </label>
                    <select
                      value={selectedLogId}
                      onChange={(e) => {
                        setSelectedLogId(e.target.value);
                        setIsManuallyEdited(false);
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-indigo-200 bg-white font-medium text-slate-800"
                    >
                      {logs.map((log) => (
                        <option key={log.id} value={log.id}>
                          {log.periodLabel} ({log.date}) &bull; {log.title.slice(0, 40)}...
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {periodMode === 'milestone_stage' && (
                  <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 space-y-1.5">
                    <label className="text-[11px] font-extrabold text-amber-950 block">
                      Tamamlanan / Kutlanacak Aşamayı Seçin:
                    </label>
                    <select
                      value={selectedStageId}
                      onChange={(e) => {
                        setSelectedStageId(e.target.value);
                        setIsManuallyEdited(false);
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-amber-200 bg-white font-medium text-slate-800"
                    >
                      {stages.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name} (%{stage.progressPercent} - {stage.status === 'completed' ? 'Tamamlandı' : 'Devam Ediyor'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {periodMode === 'custom_period' && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-800 block">
                      Özel Rapor / Dönem Başlığı:
                    </label>
                    <input
                      type="text"
                      value={customPeriodTitle}
                      onChange={(e) => {
                        setCustomPeriodTitle(e.target.value);
                        setIsManuallyEdited(false);
                      }}
                      placeholder="Örn: 1-15 Eylül Ara Denetim Raporu"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Adım 2: İletişim Kanalı & Format */}
              <div className={`${cardBg} rounded-2xl border p-5 shadow-xs space-y-3`}>
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>2. Gönderim Kanalı & Format</span>
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMessageChannel('whatsapp');
                      setIsManuallyEdited(false);
                    }}
                    className={`py-2.5 px-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      messageChannel === 'whatsapp'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-black shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs">WhatsApp</span>
                    <span className="text-[9px] text-slate-400 font-normal">Zengin Emoji</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMessageChannel('sms');
                      setIsManuallyEdited(false);
                    }}
                    className={`py-2.5 px-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      messageChannel === 'sms'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-black shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs">Kısa SMS</span>
                    <span className="text-[9px] text-slate-400 font-normal">Karakter Net</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMessageChannel('email');
                      setIsManuallyEdited(false);
                    }}
                    className={`py-2.5 px-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      messageChannel === 'email'
                        ? 'bg-slate-100 border-slate-300 text-slate-900 font-black shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Mail className="w-4 h-4 text-slate-700" />
                    <span className="text-xs">E-Posta</span>
                    <span className="text-[9px] text-slate-400 font-normal">Resmî Mektup</span>
                  </button>
                </div>
              </div>

              {/* Adım 3: Alıcı ve Kişiselleştirme */}
              <div className={`${cardBg} rounded-2xl border p-5 shadow-xs space-y-3`}>
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>3. Alıcı & Kişiselleştirme</span>
                </label>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="recipientType"
                      checked={recipientType === 'all'}
                      onChange={() => {
                        setRecipientType('all');
                        setRecipientName('');
                        setRecipientPhone('');
                        setIsManuallyEdited(false);
                      }}
                      className="text-indigo-600"
                    />
                    <span>Tüm Kat Malikleri (WhatsApp Grubu / Genel Bülten)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="recipientType"
                      checked={recipientType === 'individual'}
                      onChange={() => {
                        setRecipientType('individual');
                        setIsManuallyEdited(false);
                      }}
                      className="text-indigo-600"
                    />
                    <span>Belirli Bir Hak Sahibi (Bireysel İletişim)</span>
                  </label>
                </div>

                {recipientType === 'individual' && (
                  <div className="pt-2 space-y-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                        Daire & Hak Sahibi Seçin:
                      </label>
                      <select
                        value={selectedFlatId || ''}
                        onChange={(e) => {
                          const flatId = Number(e.target.value);
                          const flat = params.flats.find(f => f.id === flatId);
                          setSelectedFlatId(flatId || undefined);
                          if (flat) {
                            setRecipientName(flat.name || `Kat Maliki ${flat.id}`);
                          }
                          setIsManuallyEdited(false);
                        }}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-medium"
                      >
                        <option value="">-- Hak Sahibi Seçin --</option>
                        {params.flats.map((flat, i) => (
                          <option key={flat.id || i} value={flat.id}>
                            Daire {flat.id}: {flat.name || `Malik ${flat.id}`} ({flat.area} m²)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Alıcı İsmi:</label>
                        <input
                          type="text"
                          value={recipientName}
                          onChange={(e) => {
                            setRecipientName(e.target.value);
                            setIsManuallyEdited(false);
                          }}
                          placeholder="Örn: Ahmet Bey"
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Telefon No:</label>
                        <input
                          type="tel"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          placeholder="Örn: 0532 123 45 67"
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Adım 4: Mesaj İçerik Bileşenleri (Modüler Toggles) */}
              <div className={`${cardBg} rounded-2xl border p-5 shadow-xs space-y-3`}>
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  <span>4. Şablon İçerik Bileşenleri</span>
                </label>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer">
                    <span className="text-slate-700 font-medium">Görsel İlerleme Çubuğu ([▓▓░░] %{overallProgress})</span>
                    <input
                      type="checkbox"
                      checked={includeProgressBar}
                      onChange={(e) => {
                        setIncludeProgressBar(e.target.checked);
                        setIsManuallyEdited(false);
                      }}
                      className="rounded text-indigo-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer">
                    <span className="text-slate-700 font-medium">Kalan Süre & Hedef Teslim Tarihi</span>
                    <input
                      type="checkbox"
                      checked={includeRemainingDays}
                      onChange={(e) => {
                        setIncludeRemainingDays(e.target.checked);
                        setIsManuallyEdited(false);
                      }}
                      className="rounded text-indigo-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer">
                    <span className="text-slate-700 font-medium">Tamamlanan İmalatlar Bölümü</span>
                    <input
                      type="checkbox"
                      checked={includeCompleted}
                      onChange={(e) => {
                        setIncludeCompleted(e.target.checked);
                        setIsManuallyEdited(false);
                      }}
                      className="rounded text-indigo-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer">
                    <span className="text-slate-700 font-medium">Önümüzdeki Periyot Hedefleri</span>
                    <input
                      type="checkbox"
                      checked={includePlanned}
                      onChange={(e) => {
                        setIncludePlanned(e.target.checked);
                        setIsManuallyEdited(false);
                      }}
                      className="rounded text-indigo-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer">
                    <span className="text-slate-700 font-medium">Şantiye Şartları & Çalışılan Gün</span>
                    <input
                      type="checkbox"
                      checked={includeWeather}
                      onChange={(e) => {
                        setIncludeWeather(e.target.checked);
                        setIsManuallyEdited(false);
                      }}
                      className="rounded text-indigo-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer">
                    <span className="text-slate-700 font-medium">Firma & Yetkili İletişim Bilgileri</span>
                    <input
                      type="checkbox"
                      checked={includeContact}
                      onChange={(e) => {
                        setIncludeContact(e.target.checked);
                        setIsManuallyEdited(false);
                      }}
                      className="rounded text-indigo-600"
                    />
                  </label>
                </div>

                {/* Özel Müteahhit / Şantiye Notu */}
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Özel Şantiye Notu / Duyuru Ekle (İsteğe Bağlı):
                  </label>
                  <input
                    type="text"
                    value={customNote}
                    onChange={(e) => {
                      setCustomNote(e.target.value);
                      setIsManuallyEdited(false);
                    }}
                    placeholder="Örn: Cuma günü beton dökümü nedeniyle sokak 09:00-14:00 arası trafiğe kapalı olacaktır."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 placeholder:text-slate-400 focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            {/* ----------------------------------------------------------- */}
            {/* RIGHT COLUMN: INTERACTIVE PREVIEW & SHARING ACTIONS (7 Cols)*/}
            {/* ----------------------------------------------------------- */}
            <div className="lg:col-span-7 space-y-5 flex flex-col justify-between">
              {/* Preview Window */}
              <div className={`${cardBg} rounded-2xl border p-5 shadow-xs space-y-4`}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Canlı Mesaj Önizlemesi ({messageChannel.toUpperCase()})
                    </h4>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Character & SMS count badge */}
                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <span>{messageBody.length} Karakter</span>
                      {messageChannel === 'sms' && (
                        <span className="font-bold text-indigo-700">
                          &bull; {Math.ceil(messageBody.length / 160) || 1} SMS
                        </span>
                      )}
                    </div>

                    {isManuallyEdited && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsManuallyEdited(false);
                          setMessageBody(generateMessageContent());
                        }}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                        title="Manuel düzenlemeleri sıfırlayıp şablon ayarlarına döner"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Şablonu Sıfırla</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* VISUAL DEVICE MOCKUP */}
                {messageChannel === 'whatsapp' ? (
                  // WhatsApp Chat Balloon Mockup
                  <div className="rounded-2xl border border-emerald-200 bg-[#efeae2] p-4 shadow-inner space-y-2">
                    {/* WhatsApp Top bar */}
                    <div className="flex items-center justify-between pb-2 border-b border-black/5 text-xs text-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                          AB
                        </div>
                        <div>
                          <p className="font-bold text-[11px] leading-tight">
                            {recipientType === 'all' ? `${profile.companyName || 'AB Yapı'} - Kat Malikleri Grubu` : recipientName || 'Sayın Hak Sahibi'}
                          </p>
                          <span className="text-[9px] text-emerald-700 font-medium">çevrimiçi</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500">Şantiye Canlı</span>
                    </div>

                    {/* Chat Bubble */}
                    <div className="flex justify-end">
                      <div className="max-w-[95%] bg-[#d9fdd3] rounded-2xl rounded-tr-xs p-3.5 shadow-xs text-xs text-slate-900 font-sans whitespace-pre-wrap leading-relaxed relative">
                        {messageBody}
                        <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 mt-2 font-mono">
                          <span>{new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                          <CheckCheck className="w-3.5 h-3.5 text-sky-500 inline" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : messageChannel === 'sms' ? (
                  // SMS Phone Bubble Mockup
                  <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-inner space-y-2">
                    <div className="text-center text-[10px] text-slate-400 font-mono pb-1">
                      Kısa Mesaj (SMS) &bull; {new Date().toLocaleDateString('tr-TR')}
                    </div>
                    <div className="flex justify-end">
                      <div className="max-w-[95%] bg-indigo-600 text-white rounded-2xl rounded-br-xs p-3.5 shadow-sm text-xs font-sans whitespace-pre-wrap leading-relaxed">
                        {messageBody}
                        <div className="text-[9px] text-indigo-200 text-right mt-1.5 font-mono">
                          Teslim Edildi
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Email Formal Mockup
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 font-sans text-xs">
                    <div className="border-b border-slate-100 pb-2 space-y-1 text-[11px] text-slate-600">
                      <div><b className="text-slate-900">Kimden:</b> {profile.authorizedPerson || 'Şantiye Yönetimi'} &lt;bilgi@{profile.website?.replace(/https?:\/\//, '') || 'abyapi.com.tr'}&gt;</div>
                      <div><b className="text-slate-900">Kime:</b> {recipientType === 'all' ? 'Tüm Hak Sahipleri & Kat Malikleri' : `${recipientName || 'Kat Maliki'}`}</div>
                      <div><b className="text-slate-900">Konu:</b> {params.projectAddress || 'Projemiz'} - İnşaat İlerleme Raporu</div>
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed text-slate-800 font-mono text-[11px] pt-1">
                      {messageBody}
                    </div>
                  </div>
                )}

                {/* Direct Editing Box */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Metni Doğrudan Düzenle (Son Rötuşlar)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {isManuallyEdited ? '✏️ Özel düzenlendi' : 'Otomatik şablon'}
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={messageBody}
                    onChange={(e) => {
                      setMessageBody(e.target.value);
                      setIsManuallyEdited(true);
                    }}
                    className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-indigo-500 transition outline-none"
                    placeholder="Mesaj metnini burada doğrudan değiştirebilirsiniz..."
                  />
                </div>

                {/* ACTIONS & MULTI-CHANNEL SHARE BAR */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                    >
                      {copySuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copySuccess ? 'Metin Kopyalandı!' : 'Metni Kopyala'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                      title="Cihazınızın paylaşım menüsünü açar"
                    >
                      {shareSuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                      <span>Paylaş</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSendSMS}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition cursor-pointer"
                      title="Varsayılan SMS uygulamasını açar"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>SMS Gönder</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSendEmail}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      <span>E-Posta</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSendWhatsApp}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-extrabold shadow-md shadow-emerald-600/20 transition cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp ile Gönder</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* RECENT NOTIFICATIONS ARCHIVE (Tarihçe) */}
              <div className={`${cardBg} rounded-2xl border p-5 shadow-xs space-y-3`}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase tracking-wider">
                    <History className="w-4 h-4 text-slate-500" />
                    <span>Son Gönderilen / Kopyalanan Bildirimler</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {notificationHistory.length} Kayıt
                  </span>
                </div>

                {notificationHistory.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {notificationHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-xs flex items-center justify-between gap-3 transition"
                      >
                        <div className="space-y-0.5 overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                              item.channel === 'whatsapp' ? 'bg-emerald-100 text-emerald-800' :
                              item.channel === 'sms' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-800'
                            }`}>
                              {item.channel}
                            </span>
                            <span className="font-bold text-slate-800 truncate">
                              {item.periodLabel} &bull; {item.recipientLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate max-w-md">
                            {item.text.replace(/\n/g, ' ')}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-400 font-mono">{item.timestamp}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(item.text);
                              setMessageBody(item.text);
                              setIsManuallyEdited(true);
                              setCopySuccess(true);
                              setTimeout(() => setCopySuccess(false), 2000);
                            }}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                            title="Bu bildirimi yeniden yükle ve kopyala"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-400 text-xs">
                    Henüz paylaşılmış veya kopyalanmış bir bildirim kaydı bulunmamaktadır.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. SUB-TAB: OFFICIAL PRINTABLE LIVE PROGRESS REPORT (A4)       */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'report' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-xs print:hidden">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">
                  Resmî Müşteri Canlı İlerleme Karnesi (A4 Formatı)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Kat maliklerine, bankalara veya genel kurullara sunulabilecek resmî antetli inşaat durum raporu.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdır / PDF Olarak Kaydet</span>
            </button>
          </div>

          {/* Printable Container */}
          <div
            ref={printDocRef}
            className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm space-y-8 max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none print:m-0 print:max-w-none text-slate-900"
          >
            {/* Header / Logo */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
              <div className="space-y-1">
                <Logo />
                <p className="text-xs font-mono font-bold tracking-widest text-indigo-600 uppercase mt-1">
                  {profile.slogan || 'Güvene Yükselen Yapılar'}
                </p>
                <p className="text-[10px] text-slate-500 max-w-sm leading-tight">
                  {profile.address || 'Kocamustafapaşa Mah. Fatih / İSTANBUL'} &bull; {profile.phone || '+90 (212) 585 10 20'}
                </p>
              </div>

              <div className="text-right space-y-1">
                <span className="inline-block px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
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
    </div>
  );
};
