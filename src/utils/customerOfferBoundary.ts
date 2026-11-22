import {
  ProjectParams,
  CalculationResult,
  CompanyProfile,
  ProposalStatus,
  OfferMeta,
  OfferVersionSnapshot,
  OfferStatusHistoryEntry,
  CustomerOfferPayload,
  CustomerOfferInnovativeOption,
  CustomerOfferDualData,
  CustomerOfferLandownerRow,
  CustomerOfferUnitRow,
} from '../types';
import { getAcOptionById } from './acOptions';
import { computeDualOffer } from './dualOfferUtils';
import { getCompletedProjectsText } from './completedProjectsData';
import { sanitizeCustomerMessageText } from './textSanitizer';

export const DEFAULT_OFFER_VALIDITY_DAYS = 30;

export const DEFAULT_INTRO_TEXT =
  "1960'lardan bugüne uzanan köklü inşaat tecrübemiz ve üçüncü nesil dinamizmimizle, kentsel dönüşüm projelerimizde hem güvenliği hem de modern konfor standartlarını en üst düzeyde buluşturuyoruz. Sektördeki yarım asrı aşan birikimimizle tasarladığımız bu projede, bütçe dostu akılcı çözümler sunarken, en güncel deprem yönetmeliklerine ve güvenlik standartlarına tavizsiz şekilde uyuyoruz. Depreme tam dayanıklı mühendislik anlayışımızı, yaşamı kolaylaştıran modern mimari detaylarla harmanlayarak sizler için uzun ömürlü, değerli ve huzurlu yaşam alanları inşa ediyoruz.";

export const DEFAULT_COMPANY_HISTORY_TEXT =
  "1960’lı yıllarda kurucumuz Emin Ahmetbeyoğlu’nun vizyonuyla temelleri atılan inşaat serüvenimiz, yarım asrı aşan tecrübesiyle sektördeki köklü yürüyüşünü sürdürmektedir. İkinci kuşak temsilcilerimiz Faruk Ahmetbeyoğlu ve aile büyüklerimizin öncülüğünde; Laleli, Fatih, Kocamustafapaşa, Silivrikapı, Samatya ve Yedikule gibi İstanbul’un tarihi suriçi bölgelerinde onlarca nitelikli projeye imza atarak şehrin dokusuna kalıcı değerler kattık.\n\n2010’lu yıllarda piyasa dinamiklerindeki değişimleri doğru okuyarak kurumsal yatırımlarımızı sağlık ve tarım gibi stratejik sektörlere de yönlendirdik ve vizyonumuzu daha da genişlettik. Bugün ise edindiğimiz bu çok yönlü kurumsal tecrübe ve artan sektörel talepler doğrultusunda, üçüncü nesil olarak inşaat markamızı çağın gereksinimlerine uygun, dinamik ve yenilikçi bir altyapıyla yeniden yapılandırıyoruz.\n\nGeçmişten aldığımız güven mirasını, geleceğin teknolojileriyle harmanlayarak kaldığımız yerden, daha güçlü bir şekilde üretmeye devam ediyoruz.";

export const DEFAULT_COMPANY_MISSION =
  'Köklerimizden aldığımız tecrübeyi modern mühendislik çözümleriyle birleştirerek; insan odaklı, yapısal güvenliği merkeze alan ve yaşam standartlarını daima yukarı taşıyan projeler üretmektir.';

export const DEFAULT_COMPANY_VISION =
  'Geleneksel inşaat kültürümüzü modern mimari trendlerle zenginleştirerek, müşterilerimiz için hem yüksek kaliteli hem de ulaşılabilir ve akılcı yaşam alanları inşa eden öncü bir marka olmaktır.';

export const DEFAULT_INFLATION_NOTICE_TITLE = 'Sabit Fiyat ve Vade Güvencesi';

export const DEFAULT_INFLATION_NOTICE_TEXT =
  'Sözleşme tarihinde mutabık kalınan teklif bedeli ve ödeme planı inşaat süresi boyunca sabit kalır. Ödeme takvimine uyulduğu sürece kat maliklerinden ayrıca TEFE/TÜFE, enflasyon farkı veya vade farkı talep edilmez.';

/**
 * Müşteri çıktılarında (CustomerOfferPayload) yapısal olarak KESİNLİKLE bulunmaması gereken
 * şirket içi gizli alan anahtarları.
 */
export const FORBIDDEN_CUSTOMER_KEYS = [
  'subTotalCost',
  'profitRate',
  'profitAmount',
  'inflationBufferRate',
  'inflationBufferAmount',
  'hasInflationBuffer',
  'contractorNetExtraMargin',
  'contractorNetMarginPerFlat',
  'contractorNetTotalProfit',
  'contractorRealizedMarginPercent',
  'calculatedTotalCostDiff',
  'calculatedAvgCostPerFlatDiff',
  'itemizedContractorCosts',
  'costDeltaPerFlat',
  'internalNotes',
  'underfloorHeatingCost',
  'waterFiltrationCost',
  'acCostTotal',
  'acCostPerFlat',
  'thermostaticMixerCost',
  'linearDrainCost',
  'bathroomHumidityFanCost',
  'touchlessKitchenFaucetCost',
  'smartDoorLockCost',
  'generatorCost',
  'porcelainCountertopCost',
  'grossCostPerSqM',
  'contractorNetProfit',
  'contractorSalesRevenue',
  'contractorSalePricePerSqM',
] as const;

/**
 * Tüm kullanıcı ve dinamik metinleri HTML bağlamında güvenli hale getirir.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

/**
 * CSS content: "..." bağlamı için güvenli kaçış uygular.
 */
export function escapeCssString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\r\n]/g, ' ')
    .replace(/[<>]/g, '');
}

/**
 * URL ve görsel src özniteliklerini zararlı protokollere (javascript:, vbscript:, data:text/html vb.) karşı doğrular.
 */
export function sanitizeUrl(
  rawUrl?: string,
  options?: { allowDataImage?: boolean }
): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // Kontrol karakterlerini temizle
  const cleaned = trimmed.replace(/[\u0000-\u001F\u007F]/g, '');
  const lower = cleaned.toLowerCase();

  // Zararlı şemaları kesin reddet
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('data:text/') ||
    lower.startsWith('data:application/') ||
    lower.startsWith('data:image/svg')
  ) {
    return '';
  }

  if (options?.allowDataImage && /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(cleaned)) {
    return cleaned;
  }

  if (lower.startsWith('https://') || lower.startsWith('http://')) {
    return cleaned;
  }

  // Protokol içermeyen web sitesi alan adı (örn: ab-yapi.com.tr)
  if (!options?.allowDataImage && !cleaned.includes(':') && /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(cleaned)) {
    return `https://${cleaned}`;
  }

  return '';
}

export function formatTurkishDate(isoOrDate: string | Date): string {
  const dateObj = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(dateObj.getTime())) {
    return new Date().toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  return dateObj.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function computeValidUntilIso(createdAtIso: string, validityDays: number): string {
  const base = new Date(createdAtIso);
  const safeBase = Number.isNaN(base.getTime()) ? new Date() : base;
  const safeDays = Math.max(1, Math.min(365, Math.round(validityDays || DEFAULT_OFFER_VALIDITY_DAYS)));
  return new Date(safeBase.getTime() + safeDays * 24 * 60 * 60 * 1000).toISOString();
}

function stableNumericCode(seed: string): string {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) >>> 0;
  }
  return String((hash % 9000) + 1000);
}

/**
 * Kalıcı teklif numarası üretir (Örn: ABY-2026-4821).
 * seedText verilirse (eski projeler için) tutarlı deterministik kod üretir.
 */
export function generatePersistentProposalNumber(
  companyName?: string,
  seedText?: string,
  seedDate?: Date
): string {
  const prefix = (companyName || 'ABY')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 3)
    .toUpperCase() || 'ABY';
  const year = (seedDate && !Number.isNaN(seedDate.getTime()) ? seedDate : new Date()).getFullYear();
  const suffix = seedText
    ? stableNumericCode(seedText)
    : String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}-${year}-${suffix}`;
}

/**
 * Mevcut veya eski (offerMeta alanı olmayan) projelerden teklif kimlik ve geçerlilik bilgisini
 * geriye dönük uyumlu biçimde çözer. Eski tekliflerin durumunu ASLA otomatik değiştirmez.
 */
export function resolveOfferMetadata(
  params: ProjectParams,
  companyName?: string
): {
  proposalNumber: string;
  createdAt: string;
  proposalDateFormatted: string;
  validityDays: number;
  validUntil: string;
  validUntilFormatted: string;
  version: number;
  status: ProposalStatus;
  hasPersistedMeta: boolean;
} {
  const meta = params.offerMeta;
  const status: ProposalStatus = params.proposalStatus || 'draft';

  if (meta && meta.proposalNumber) {
    const createdAt = meta.createdAt || new Date().toISOString();
    const validityDays = Math.max(1, Math.round(meta.validityDays || DEFAULT_OFFER_VALIDITY_DAYS));
    const validUntil = meta.validUntil || computeValidUntilIso(createdAt, validityDays);
    return {
      proposalNumber: meta.proposalNumber,
      createdAt,
      proposalDateFormatted: formatTurkishDate(createdAt),
      validityDays,
      validUntil,
      validUntilFormatted: formatTurkishDate(validUntil),
      version: Math.max(1, Math.round(meta.currentVersion || 1)),
      status,
      hasPersistedMeta: true,
    };
  }

  // Eski kayıtlar için deterministik ve geriye dönük uyumlu fallback (status'u değiştirmez)
  const fallbackSeed = [
    params.projectName || '',
    params.projectAddress || '',
    String(params.landArea || 0),
    String(params.floorCount || 0),
    String(params.flatCount || 0),
  ].join('|');
  const nowIso = new Date().toISOString();
  const validityDays = DEFAULT_OFFER_VALIDITY_DAYS;
  const validUntil = computeValidUntilIso(nowIso, validityDays);

  return {
    proposalNumber: generatePersistentProposalNumber(companyName, fallbackSeed),
    createdAt: nowIso,
    proposalDateFormatted: formatTurkishDate(nowIso),
    validityDays,
    validUntil,
    validUntilFormatted: formatTurkishDate(validUntil),
    version: 1,
    status,
    hasPersistedMeta: false,
  };
}

/**
 * Kaydetme anında eksikse kalıcı OfferMeta başlatır; mevcutsa tüm sürüm/not/geçmiş alanlarını korur.
 */
export function buildInitializedOfferMeta(
  params: ProjectParams,
  companyName?: string
): OfferMeta {
  const existing = params.offerMeta;
  if (existing && existing.proposalNumber) {
    const createdAt = existing.createdAt || new Date().toISOString();
    const validityDays = Math.max(1, Math.round(existing.validityDays || DEFAULT_OFFER_VALIDITY_DAYS));
    return {
      ...existing,
      createdAt,
      validityDays,
      validUntil: existing.validUntil || computeValidUntilIso(createdAt, validityDays),
      currentVersion: Math.max(1, Math.round(existing.currentVersion || 1)),
      versions: existing.versions || [],
      statusHistory: existing.statusHistory || [],
    };
  }

  const nowIso = new Date().toISOString();
  const validityDays = DEFAULT_OFFER_VALIDITY_DAYS;
  const resolved = resolveOfferMetadata(params, companyName);

  return {
    proposalNumber: resolved.proposalNumber,
    createdAt: nowIso,
    validityDays,
    validUntil: computeValidUntilIso(nowIso, validityDays),
    currentVersion: 1,
    internalNotes: existing?.internalNotes || '',
    versions: existing?.versions || [],
    statusHistory: existing?.statusHistory || [],
  };
}

export function appendOfferStatusHistory(
  params: ProjectParams,
  companyName: string | undefined,
  fromStatus: ProposalStatus,
  toStatus: ProposalStatus,
  note?: string
): OfferMeta {
  const baseMeta = buildInitializedOfferMeta(params, companyName);
  const entry: OfferStatusHistoryEntry = {
    fromStatus,
    toStatus,
    changedAt: new Date().toISOString(),
    note,
  };
  return {
    ...baseMeta,
    statusHistory: [...(baseMeta.statusHistory || []), entry],
  };
}

function formatUnitTypeLabel(ft?: string): string {
  switch (ft) {
    case 'shop':
      return 'Zemin Dükkan';
    case 'basement_shop':
      return 'Bodrum Dükkan';
    case 'mansard':
      return 'Mansart / Çatı';
    case 'duplex':
      return 'Çatı Dubleks';
    case 'basement_flat':
      return 'Bodrum Daire';
    default:
      return 'Konut Dairesi';
  }
}

function formatFloorLabel(floorNum?: number, ft?: string): string {
  if (ft === 'basement_shop' || ft === 'basement_flat') return 'Bodrum Kat';
  if (ft === 'shop' || floorNum === 0) return 'Zemin Kat';
  if (floorNum !== undefined && floorNum > 0) return `${floorNum}. Kat`;
  return 'Normal Kat';
}

function buildCustomerInnovativeOptions(
  params: ProjectParams,
  isDualOffer: boolean
): CustomerOfferInnovativeOption[] {
  const currentAc = getAcOptionById(params.acType || '18k_btu');
  const allOptions: CustomerOfferInnovativeOption[] = [
    {
      id: 'underfloorHeating',
      icon: '🔥',
      title: 'Yerden Isıtma (Sulu)',
      included: Boolean(params.hasUnderfloorHeating),
      statusLabel: params.hasUnderfloorHeating ? 'Teklife Dahil' : 'Opsiyonel Donanım',
      description:
        'Radyatörlere kıyasla %15-20 yakıt tasarrufu, homojen ısı yayılımı ve odalarda dekoratif genişlik sunan sulu sistem (Fraenkische / Rehau veya muadili).',
    },
    {
      id: 'waterFiltration',
      icon: '💧',
      title: 'Merkezi Su Arıtma',
      included: Boolean(params.hasWaterFiltration),
      statusLabel: params.hasWaterFiltration ? 'Teklife Dahil' : 'Opsiyonel Donanım',
      description:
        'Bina şebeke ana girişine monte edilerek tüm dairelerde klor, kireç ve tortuyu giderir, tesisat ve beyaz eşyaları korur (Vipsu / Brita veya muadili).',
    },
    {
      id: 'acOption',
      icon: '❄️',
      title: 'A++ Inverter Klima',
      included: Boolean(params.hasAcOption),
      statusLabel: params.hasAcOption ? 'Teklife Dahil' : 'Opsiyonel Donanım',
      description: `${currentAc.shortTitle} (${currentAc.btu}) - ${currentAc.targetArea} salonlar için A++ inverter iklimlendirme (E.C.A. / Mitsubishi / Daikin veya muadili).`,
    },
    {
      id: 'thermostaticShowerMixer',
      icon: '🚿',
      title: 'Termostatik Duş Bataryası',
      included: Boolean(params.hasThermostaticShowerMixer),
      statusLabel: params.hasThermostaticShowerMixer ? 'Teklife Dahil' : 'Opsiyonel Donanım',
      description:
        '38°C emniyet kilitli, haşlanma önleyici termostatik batarya (E.C.A. / Artema / VitrA veya muadili).',
      scopeBadge: 'Konutlar',
    },
    {
      id: 'linearShowerDrain',
      icon: '✨',
      title: 'Lineer Duş Süzgeci',
      included: Boolean(params.hasLinearShowerDrain),
      statusLabel: params.hasLinearShowerDrain ? 'Teklife Dahil' : 'Opsiyonel Donanım',
      description:
        '304 paslanmaz çelik ızgaralı, çift hazneli koku çekvalfli hemzemin duş kanalı (Hüppe / Geberit veya muadili).',
      scopeBadge: 'Konutlar',
    },
    {
      id: 'bathroomHumidityFan',
      icon: '🌀',
      title: 'Nem Sensörlü Banyo Fanı',
      included: Boolean(params.hasBathroomHumidityFan),
      statusLabel: params.hasBathroomHumidityFan ? 'Teklife Dahil' : 'Opsiyonel Donanım',
      description:
        'Otomatik higrostat sensörlü, geri tepme klapeli ve 25 dB sessiz havalandırma fanı (Vortice / E.C.A. veya muadili).',
      scopeBadge: 'Konutlar',
    },
    {
      id: 'touchlessKitchenFaucet',
      icon: '🫧',
      title: 'Fotoselli Mutfak & Banyo Bataryaları',
      included: Boolean(params.hasTouchlessKitchenFaucet),
      statusLabel: params.hasTouchlessKitchenFaucet ? 'Teklife Dahil' : 'Opsiyonel Donanım',
      description:
        'Mutfak eviyesi ve banyo lavabosunda temassız kızılötesi sensörlü hijyenik batarya sistemi (E.C.A. / Artema / VitrA veya muadili).',
      scopeBadge: 'Konutlar',
    },
    {
      id: 'smartDoorLock',
      icon: '🔑',
      title: 'Motorlu & Biyometrik Akıllı Kapı Kilidi',
      included: Boolean(params.hasSmartDoorLock),
      statusLabel: params.hasSmartDoorLock ? 'Teklife Dahil' : 'Opsiyonel Donanım',
      description:
        'DESİ / Kale / Smart veya muadili parmak izi okuyuculu, şifreli ve mobil uygulamalı motorlu çelik kapı kilidi.',
      scopeBadge: 'Konutlar',
    },
    {
      id: 'generator',
      icon: '⚡',
      title: 'Otomatik Transfer Panolu (ATS) Jeneratör',
      included: Boolean(params.hasGenerator),
      statusLabel: params.hasGenerator ? 'Teklife Dahil' : 'Opsiyonel Donanım',
      description:
        'Aksa / Alimar / Teksan veya muadili kabinli dizel jeneratör ve otomatik transfer panosu (ATS). Elektrik kesintisinde asansör, hidrofor ve ortak aydınlatmalar kesintisiz çalışır.',
    },
    {
      id: 'porcelainCountertop',
      icon: '🍳',
      title: '12-15mm Lüks Porselen Mutfak Tezgahı',
      included: Boolean(params.hasPorcelainCountertop),
      statusLabel: params.hasPorcelainCountertop ? 'Teklife Dahil' : 'Opsiyonel Donanım',
      description:
        'Lamar / Neolith / Belenco veya muadili 1. sınıf 12-15mm porselen plaka tezgah ve alınlık. Sıcağa ve çizilmeye dayanıklı yüzey.',
      scopeBadge: 'Konutlar',
    },
  ];

  // Tekli Paket modunda yalnızca seçilen pakete dahil donanımlar sunulur;
  // seçilmemiş Plus özellikleri "Opsiyonel Donanım / Upgrade" olarak gösterilmez.
  if (!isDualOffer) {
    return allOptions
      .filter((opt) => opt.included)
      .map((opt) => ({
        ...opt,
        statusLabel: 'Teklife Dahil',
      }));
  }

  return allOptions;
}

const DUAL_FEATURE_ID_TO_PLUS_KEY: Record<
  string,
  keyof NonNullable<ProjectParams['plusOfferFeatures']>
> = {
  heating: 'underfloorHeating',
  ac: 'acOption',
  water: 'waterFiltration',
  thermostatic_mixer: 'thermostaticShowerMixer',
  linear_drain: 'linearShowerDrain',
  bathroom_fan: 'bathroomHumidityFan',
  touchless_kitchen: 'touchlessKitchenFaucet',
  smart_door_lock: 'smartDoorLock',
  smart_home: 'smartHome',
  generator: 'generator',
  porcelain_countertop: 'porcelainCountertop',
};

/**
 * İki seçenekli (Baz + Plus) teklifte, kullanıcının Plus paket için seçtiği
 * özellik kimliklerini (dualOfferUtils feature id) döndürür.
 * getPlusParams() ile birebir aynı iş kuralını uygular: ilgili anahtar false değilse seçilidir.
 */
export function resolveSelectedDualFeatureIds(
  plusOfferFeatures?: ProjectParams['plusOfferFeatures']
): Set<string> {
  const selected = new Set<string>();
  const feats = plusOfferFeatures || {};
  for (const [featureId, plusKey] of Object.entries(DUAL_FEATURE_ID_TO_PLUS_KEY)) {
    if (feats[plusKey] !== false) {
      selected.add(featureId);
    }
  }
  return selected;
}

/**
 * Proje parametreleri ve hesaplama çıktısından YALNIZCA müşteriye açık alanları içeren
 * güvenli CustomerOfferPayload nesnesini üretir.
 *
 * İç maliyet, kâr, enflasyon tamponu, iç notlar ve dahili teşhis verileri bu fonksiyon
 * tarafından yapısal olarak DIŞARIDA BIRAKILIR.
 */
export function buildCustomerOfferPayload(
  params: ProjectParams,
  results: CalculationResult,
  companyProfile?: CompanyProfile,
  uploadedImages?: Array<{ url: string; caption?: string }>
): CustomerOfferPayload {
  const opts = companyProfile?.printOptions || {};
  const compName = companyProfile?.companyName || 'AB YAPI';
  const compLegal =
    companyProfile?.legalName || 'AB YAPI MÜTEAHHİTLİK VE MÜHENDİSLİK TİC. LTD. ŞTİ.';
  const compSlogan = companyProfile?.slogan || 'Güvene Yükselen Yapılar';
  const compTagline = companyProfile?.tagline || 'Kentsel Dönüşüm ve Nitelikli Konut Üretimi';
  const compAddress =
    companyProfile?.address ||
    'Kocamustafapaşa Mah. Orgeneral Abdurrahman Nafiz Gürman Cad. No:42 Fatih / İSTANBUL';
  const compPhone = companyProfile?.phone || '+90 (212) 585 10 20';
  const compEmail = companyProfile?.email || 'info@abyapi.com.tr';
  const rawCompWeb =
    companyProfile?.website ||
    (companyProfile?.companyName === 'AB YAPI' ? 'https://ab-yapi.com.tr/' : '');
  const compWeb = sanitizeUrl(rawCompWeb, { allowDataImage: false });
  const compTax =
    companyProfile?.taxOffice && companyProfile?.taxNumber
      ? `${companyProfile.taxOffice} - V.No: ${companyProfile.taxNumber}`
      : '';

  const identityMeta = resolveOfferMetadata(params, compName);
  const isContractorShareModel = params.projectModel === 'contractorShare';

  const supportModelTitle =
    params.transformationStatus === 'currentSupport'
      ? 'Yarısı Bizden (875 Bin TL Hibe + 875 Bin TL Kredi Desteği)'
      : params.transformationStatus === 'futureSupport2027'
      ? '2027 Kentsel Dönüşüm Kredi Modeli (3 Milyon TL / 180 Ay Vade)'
      : 'Öz Kaynaklı / Desteksiz Yapım Modeli';

  const flatResults = results.flatResults || [];
  const shopUnits = flatResults.filter(
    (f) => f.flatType === 'shop' || f.flatType === 'basement_shop'
  );
  const normalUnits = flatResults.filter(
    (f) =>
      f.flatType !== 'shop' &&
      f.flatType !== 'basement_shop' &&
      f.flatType !== 'mansard' &&
      f.flatType !== 'duplex'
  );
  const mansardUnits = flatResults.filter(
    (f) => f.flatType === 'mansard' || f.flatType === 'duplex'
  );

  const avgShopArea =
    shopUnits.length > 0
      ? Math.round(shopUnits.reduce((acc, f) => acc + (f.area || 0), 0) / shopUnits.length)
      : 0;
  const avgNormalArea =
    normalUnits.length > 0
      ? Math.round(normalUnits.reduce((acc, f) => acc + (f.area || 0), 0) / normalUnits.length)
      : Math.round((results.totalArea || 0) / Math.max(1, results.flatCount || 1));
  const avgMansardArea =
    mansardUnits.length > 0
      ? Math.round(mansardUnits.reduce((acc, f) => acc + (f.area || 0), 0) / mansardUnits.length)
      : 0;

  const ownerUnitResults = flatResults.filter((f) => !f.isContractorShare);
  const contractorUnitResults = flatResults.filter((f) => f.isContractorShare);
  const totalAllocatedArea = flatResults.reduce((sum, f) => sum + (f.area || 0), 0);
  const ownerAllocatedArea = ownerUnitResults.reduce((sum, f) => sum + (f.area || 0), 0);
  const contractorAllocatedArea = contractorUnitResults.reduce((sum, f) => sum + (f.area || 0), 0);
  const ownerSharePercent =
    totalAllocatedArea > 0 ? Math.round((ownerAllocatedArea / totalAllocatedArea) * 100) : 100;
  const contractorSharePercent = totalAllocatedArea > 0 ? 100 - ownerSharePercent : 0;

  const landAreaVal = params.landArea || 0;
  const baseAreaVal = results.baseArea || params.baseBuildArea || 0;
  const taksText = landAreaVal > 0 ? `%${((baseAreaVal / landAreaVal) * 100).toFixed(1)}` : '-';
  const kaksText =
    landAreaVal > 0 ? `${((results.totalArea || 0) / landAreaVal).toFixed(2)}` : '-';

  // Müşteri birim fiyatı (yalnızca müşteriye sunulan teklif tutarından türetilir, iç maliyet kullanılmaz)
  const offerAvgPerSqM =
    (results.totalArea || 0) > 0
      ? Math.round((results.grandTotal || 0) / results.totalArea)
      : 0;
  const displayFlatUnitPrice = Math.round(params.manualFlatUnitPrice || offerAvgPerSqM);
  const displayShopUnitPrice = Math.round(params.manualShopUnitPrice || offerAvgPerSqM);

  const landowners: CustomerOfferLandownerRow[] = (params.landowners || []).map((owner) => {
    const den = owner.landShareDenominator || params.totalLandShareDenominator || 1000;
    const sharePercent =
      owner.sharePercent && owner.sharePercent > 0
        ? owner.sharePercent
        : owner.landShareNumerator && den > 0
        ? Math.round((owner.landShareNumerator / den) * 1000) / 10
        : 0;
    const landShareArea =
      params.landArea && params.landArea > 0
        ? Math.round(((params.landArea * sharePercent) / 100) * 10) / 10
        : 0;
    const assignedUnits = (params.flats || []).filter(
      (fl) =>
        fl.ownerId === owner.id &&
        !(params.contractorFlatIds?.includes(fl.id) || fl.isContractorShare)
    );
    const assignedUnitsSummary =
      assignedUnits.length > 0
        ? assignedUnits.map((u) => `No ${u.id} (${Math.round(u.area)} m²)`).join(', ')
        : 'Belirlenecek';

    return {
      id: owner.id,
      displayName: owner.companyName ? `${owner.name} (${owner.companyName})` : owner.name,
      sharePercent,
      landShareArea,
      existingUnitInfo: owner.existingUnitInfo || '—',
      assignedUnitsSummary,
      specialAgreement: owner.specialAgreement || '—',
    };
  });

  const units: CustomerOfferUnitRow[] = flatResults.map((flat) => {
    const origFlat = params.flats?.find((f) => f.id === flat.id);
    const linkedOwner =
      !flat.isContractorShare && origFlat?.ownerId
        ? (params.landowners || []).find((o) => o.id === origFlat.ownerId)
        : undefined;
    const rawName = (
      linkedOwner
        ? linkedOwner.companyName
          ? `${linkedOwner.name} (${linkedOwner.companyName})`
          : linkedOwner.name
        : flat.name || origFlat?.name || ''
    ).trim();
    const isPlaceholder =
      !rawName || /^(kat\s*maliki|malik|daire|bölüm|hak\s*sahibi)\s*\d*$/i.test(rawName);
    const allocationType = flat.isContractorShare
      ? 'contractor'
      : isPlaceholder
      ? 'owner_pending'
      : 'owner_assigned';
    const allocationBadge =
      allocationType === 'contractor'
        ? 'Yüklenici Firma'
        : allocationType === 'owner_pending'
        ? 'Arsa Sahibi (Atanacak)'
        : 'Arsa Sahibi';

    const row: CustomerOfferUnitRow = {
      id: flat.id,
      displayLabel:
        !flat.isContractorShare && !isPlaceholder
          ? `Bölüm #${flat.id} — ${rawName}`
          : `Bölüm #${flat.id}`,
      floorLabel: formatFloorLabel(origFlat?.floorNumber, flat.flatType),
      unitTypeLabel: formatUnitTypeLabel(flat.flatType),
      grossArea: Math.round(flat.area || 0),
      netArea: Math.round(flat.netArea || (flat.area || 0) * 0.8),
      allocationType,
      allocationBadge,
    };

    if (!isContractorShareModel && !flat.isContractorShare) {
      row.netRemainingDebt = Math.round(flat.netRemainingDebt || 0);
    }

    return row;
  });

  const isDualOffer = params.offerPresentationMode === 'dual';
  let dualOffer: CustomerOfferDualData | null = null;
  if (isDualOffer) {
    const rawDual = computeDualOffer(params);
    const selectedDualFeatureIds = resolveSelectedDualFeatureIds(params.plusOfferFeatures);
    // Yalnızca müşteriye ait alanları ve kullanıcının Plus için seçtiği özellikleri projekte et
    dualOffer = {
      baseTitle: rawDual.baseTitle,
      plusTitle: rawDual.plusTitle,
      customerBaseGrandTotal: rawDual.customerBaseGrandTotal,
      customerPlusGrandTotal: rawDual.customerPlusGrandTotal,
      customerFlatDelta: rawDual.customerFlatDelta,
      customerTotalCostDiff: rawDual.customerTotalCostDiff,
      customerBaseFlatShare: rawDual.customerBaseFlatShare,
      customerPlusFlatShare: rawDual.customerPlusFlatShare,
      customerBaseShopShare: rawDual.baseShopShare,
      customerPlusShopShare: rawDual.plusShopShare,
      customerBaseNetDebtPerFlat: rawDual.customerBaseNetDebtPerFlat,
      customerPlusNetDebtPerFlat: rawDual.customerPlusNetDebtPerFlat,
      hasShops: rawDual.hasShops,
      features: rawDual.features
        .filter((f) => selectedDualFeatureIds.has(f.id))
        .map((f) => ({
          id: f.id,
          name: f.name,
          icon: f.icon,
          baseIncluded: f.baseIncluded,
          baseSpec: f.baseSpec,
          plusIncluded: f.plusIncluded,
          plusSpec: f.plusSpec,
        })),
    };
  }

  const paymentPlanType = params.paymentPlanType || 'stages';
  const installmentCount = params.installmentCount || 12;
  const paymentPlanLabel =
    paymentPlanType === 'hybrid'
      ? 'Karma Ödeme (Peşinat + Ara Ödeme + Taksit)'
      : paymentPlanType === 'stages'
      ? '5 Aşamalı Fiziki İlerleme Hakedişi'
      : `Aylık Eşit Taksit (${installmentCount} Ay Vade)`;

  const grandTotal = Math.round(results.grandTotal || 0);
  const firstOwnerUnit = ownerUnitResults[0] || flatResults[0];
  const avgFlatShare = Math.round(grandTotal / Math.max(1, results.flatCount || 1));
  const firstOwnerNetDebt = Math.round(firstOwnerUnit?.netRemainingDebt || 0);
  const firstOwnerMonthlyInstallment = Math.round(
    firstOwnerUnit?.monthlyInstallment ||
      (firstOwnerNetDebt > 0
        ? firstOwnerNetDebt / Math.max(1, installmentCount)
        : avgFlatShare / Math.max(1, installmentCount))
  );

  const completedProjectsRaw = params.companyCompletedProjects || getCompletedProjectsText();
  const completedProjects = completedProjectsRaw
    .split('\n')
    .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter((line) => line.length > 0);

  const safeAttachments = (uploadedImages || [])
    .map((img, idx) => ({
      url: sanitizeUrl(img.url, { allowDataImage: true }),
      caption: (img.caption || `Belge / Görsel ${idx + 1}`).trim(),
    }))
    .filter((img) => img.url.length > 0);

  return {
    schemaVersion: 1,
    branding: {
      companyName: compName,
      legalName: compLegal,
      slogan: compSlogan,
      tagline: compTagline,
      address: compAddress,
      phone: compPhone,
      email: compEmail,
      website: compWeb,
      taxInfo: compTax,
      bankName: companyProfile?.bankName || '',
      iban: companyProfile?.iban || '',
      logoBase64: sanitizeUrl(companyProfile?.logoBase64, { allowDataImage: true }),
      stampBase64: sanitizeUrl(companyProfile?.stampBase64, { allowDataImage: true }),
      authorizedPerson: companyProfile?.authorizedPerson || 'Müh. Alpaslan Beyoğlu',
      authorizedTitle: companyProfile?.authorizedTitle || 'Genel Müdür / İnşaat Mühendisi',
      authorizedChamberNo: companyProfile?.authorizedChamberNo || 'İMO-74120',
      authorizedPerson2: companyProfile?.authorizedPerson2 || '',
      authorizedTitle2: companyProfile?.authorizedTitle2 || '',
      authorizedChamberNo2: companyProfile?.authorizedChamberNo2 || '',
      visibility: {
        showLogo: opts.showLogo !== false,
        showLegal: opts.showLegalName !== false,
        showSlogan: opts.showSlogan !== false,
        showTagline: opts.showTagline !== false,
        showPhone: opts.showPhone !== false,
        showEmail: opts.showEmail !== false,
        showWebsite: opts.showWebsite !== false,
        showAddress: opts.showAddress !== false,
        showTax: opts.showTaxInfo !== false,
        showBank: opts.showBankInfo !== false,
        showFirstAuth: opts.showFirstAuthorized !== false,
        showFirstAuthChamber: opts.showFirstAuthorizedChamber !== false,
        showSecondAuth: opts.showSecondAuthorized === true && !!companyProfile?.authorizedPerson2,
        showSecondAuthChamber: opts.showSecondAuthorizedChamber !== false,
        showStamp: opts.showStamp !== false,
      },
    },
    identity: {
      proposalNumber: identityMeta.proposalNumber,
      createdAt: identityMeta.createdAt,
      proposalDateFormatted: identityMeta.proposalDateFormatted,
      validityDays: identityMeta.validityDays,
      validUntil: identityMeta.validUntil,
      validUntilFormatted: identityMeta.validUntilFormatted,
      version: identityMeta.version,
      status: identityMeta.status,
    },
    project: {
      projectName: (params.projectName || '').trim(),
      projectAddress: (params.projectAddress || 'Belirtilen Adres').trim(),
      isContractorShareModel,
      modelTitle: isContractorShareModel
        ? 'Kat Karşılığı İnşaat ve Bağımsız Bölüm Paylaşım Teklifi'
        : 'Anahtar Teslim Bina Yapım ve Hakedişli Finansman Teklifi',
      supportModelTitle,
      landArea: landAreaVal,
      baseArea: Math.round(baseAreaVal),
      taksText,
      kaksText,
      floorCount: params.floorCount || 5,
      flatsPerFloor: params.flatsPerFloor || 2,
      floorStructureShort:
        results.floorStructure?.shortLabel || `Z+${Math.max(0, (params.floorCount || 5) - 1)} Kat`,
      floorStructureDetailed:
        results.floorStructure?.detailedLabel || `${params.floorCount || 5} Katlı Yapı`,
      unitBreakdownShort:
        results.unitBreakdown?.shortLabel || `${results.flatCount || flatResults.length} Bağımsız Bölüm`,
      totalArea: Math.round(results.totalArea || 0),
      finalMonths: results.finalMonths || params.manualMonths || 15,
      hasGroundFloorShop: Boolean(params.hasGroundFloorShop),
      shopUnitsCount: shopUnits.length,
      normalUnitsCount: normalUnits.length,
      mansardUnitsCount: mansardUnits.length,
      avgShopArea,
      avgNormalArea,
      avgMansardArea,
    },
    sharing: {
      totalUnitCount: flatResults.length,
      totalAllocatedArea: Math.round(totalAllocatedArea),
      ownerUnitsCount: ownerUnitResults.length,
      ownerAllocatedArea: Math.round(ownerAllocatedArea),
      ownerSharePercent,
      contractorUnitsCount: contractorUnitResults.length,
      contractorAllocatedArea: Math.round(contractorAllocatedArea),
      contractorSharePercent,
      landowners,
      units,
    },
    pricing: {
      grandTotal,
      constructionScopeAmount: Math.round(grandTotal * 0.85),
      permitAndConsultancyAmount: Math.round(grandTotal * 0.15),
      displayFlatUnitPrice,
      displayShopUnitPrice,
      avgFlatShare,
      firstOwnerNetDebt,
      firstOwnerMonthlyInstallment,
      paymentPlanType,
      paymentPlanLabel,
      installmentCount,
      parkingFeeMode: params.parkingFeeMode || 'none',
      parkingFeeActual: Math.round(results.parkingFeeActual || 0),
      parkingFeePerFlat: Math.round(results.parkingFeePerFlat || 0),
      parkingDeficientSpaces: results.parkingDeficientSpaces || 0,
      parkingBirimBedeli: Math.round(results.parkingBirimBedeli || 0),
    },
    presentation: {
      mode: isDualOffer ? 'dual' : 'single',
      showIntroPresentation: Boolean(params.showIntroPresentation),
      introText: (params.introExplanation || DEFAULT_INTRO_TEXT).trim(),
      showCompanyHistory: Boolean(params.showCompanyHistory),
      companyHistoryText: (params.companyHistoryText || DEFAULT_COMPANY_HISTORY_TEXT).trim(),
      completedProjects,
      companyMission: (params.companyMission || DEFAULT_COMPANY_MISSION).trim(),
      companyVision: (params.companyVision || DEFAULT_COMPANY_VISION).trim(),
      showProposalHeader: params.showProposalHeader !== false,
      showVisionCards: params.showVisionCards !== false,
      showTechnicalSummary: params.showTechnicalSummary !== false,
      showQualityStandards: params.showQualityStandards !== false,
      showInnovativeOptions: params.showInnovativeOptions !== false,
      showDualOfferMatrix: params.showDualOfferMatrix !== false,
      showFinancialSummary: params.showFinancialSummary !== false,
      showPaymentTimeline: params.showPaymentTimeline !== false,
      showInflationGuaranteeNotice: params.showInflationGuaranteeNotice !== false,
      inflationNoticeTitle: (
        params.customInflationNoticeTitle || DEFAULT_INFLATION_NOTICE_TITLE
      ).trim(),
      inflationNoticeText: (
        params.customInflationNoticeText || DEFAULT_INFLATION_NOTICE_TEXT
      ).trim(),
      showLegalTaahhut: params.showLegalTaahhut !== false,
      showContractorSignature: params.showContractorSignature !== false,
    },
    innovativeOptions: buildCustomerInnovativeOptions(params, isDualOffer),
    dualOffer,
    publicNotes: (params.customContractNotes || '').trim(),
    additionalClauses: (params.additionalOfferClauses || [])
      .map((c) => c.trim())
      .filter((c) => c.length > 0),
    attachments: safeAttachments,
  };
}

/**
 * Yeni bir teklif sürümü (OfferVersionSnapshot) oluşturur.
 * Sürüm anlık görüntüsü YALNIZCA CustomerOfferPayload saklar (iç maliyet/kâr içermez).
 */
export function createOfferVersionSnapshot(
  params: ProjectParams,
  results: CalculationResult,
  companyProfile?: CompanyProfile,
  uploadedImages?: Array<{ url: string; caption?: string }>,
  summaryNote?: string
): { nextOfferMeta: OfferMeta; snapshot: OfferVersionSnapshot } {
  const baseMeta = buildInitializedOfferMeta(params, companyProfile?.companyName);
  const existingVersions = baseMeta.versions || [];
  const nextVersionNumber =
    existingVersions.length > 0
      ? Math.max(baseMeta.currentVersion, ...existingVersions.map((v) => v.version)) + 1
      : Math.max(1, baseMeta.currentVersion);

  const nowIso = new Date().toISOString();
  const validUntil = computeValidUntilIso(nowIso, baseMeta.validityDays);

  const paramsWithUpdatedMeta: ProjectParams = {
    ...params,
    offerMeta: {
      ...baseMeta,
      currentVersion: nextVersionNumber,
      validUntil,
    },
  };

  const payload = buildCustomerOfferPayload(
    paramsWithUpdatedMeta,
    results,
    companyProfile,
    uploadedImages
  );

  const snapshot: OfferVersionSnapshot = {
    version: nextVersionNumber,
    proposalNumber: baseMeta.proposalNumber,
    createdAt: nowIso,
    validUntil,
    status: params.proposalStatus || 'draft',
    summaryNote: summaryNote?.trim() || undefined,
    grandTotal: payload.pricing.grandTotal,
    presentationMode: payload.presentation.mode,
    customerPayload: payload,
  };

  const nextOfferMeta: OfferMeta = {
    ...baseMeta,
    currentVersion: nextVersionNumber,
    validUntil,
    versions: [...existingVersions, snapshot],
  };

  return { nextOfferMeta, snapshot };
}

/**
 * Müşteriye gönderilecek WhatsApp özet metnini YALNIZCA CustomerOfferPayload üzerinden üretir.
 * Kat Karşılığı ve Anahtar Teslim modelleri arasında doğru finansal anlatımı uygular.
 */
export function generateCustomerWhatsAppSummary(payload: CustomerOfferPayload): string {
  const { branding, identity, project, sharing, pricing, presentation, dualOffer } = payload;

  const projectHeaderLine = project.projectName
    ? `${project.projectName} — ${project.projectAddress}`
    : project.projectAddress;

  const financialSection = project.isContractorShareModel
    ? `🤝 *KAT KARŞILIĞI PAYLAŞIM ÖZETİ:*
• Toplam Bağımsız Bölüm: ${sharing.totalUnitCount} Adet (${sharing.totalAllocatedArea.toLocaleString('tr-TR')} m²)
• Arsa Sahipleri Payı: ${sharing.ownerUnitsCount} Bölüm • ${sharing.ownerAllocatedArea.toLocaleString('tr-TR')} m² (%${sharing.ownerSharePercent})
• Yüklenici Payı: ${sharing.contractorUnitsCount} Bölüm • ${sharing.contractorAllocatedArea.toLocaleString('tr-TR')} m² (%${sharing.contractorSharePercent})
• Finansman: Arsa sahiplerinden nakit inşaat bedeli talep edilmez; tüm yapım finansmanı yüklenici tarafından karşılanır.`
    : `💰 *FİNANSAL TEKLİF ÖZETİ:*
• Toplam Anahtar Teslim Bedel: ${pricing.grandTotal.toLocaleString('tr-TR')} ₺
• Bölüm Başı Ortalama Pay: ${pricing.avgFlatShare.toLocaleString('tr-TR')} ₺${
        pricing.firstOwnerNetDebt > 0
          ? `\n• Devlet Hibesi/Kredisi Düşülmüş Örnek Net Ödeme: *${pricing.firstOwnerNetDebt.toLocaleString('tr-TR')} ₺ / Daire*`
          : ''
      }${
        dualOffer
          ? `\n• ${dualOffer.baseTitle}: ${dualOffer.customerBaseGrandTotal.toLocaleString('tr-TR')} ₺\n• ${dualOffer.plusTitle}: ${dualOffer.customerPlusGrandTotal.toLocaleString('tr-TR')} ₺ (+${dualOffer.customerFlatDelta.toLocaleString('tr-TR')} ₺ / Daire)`
          : ''
      }

💳 *ÖDEME VE VADE PLANI:*
• Ödeme Modeli: ${pricing.paymentPlanLabel}${
        pricing.paymentPlanType !== 'stages'
          ? `\n• Örnek Aylık Taksit (${pricing.installmentCount} Ay): ~${pricing.firstOwnerMonthlyInstallment.toLocaleString('tr-TR')} ₺ / Ay`
          : ''
      }`;

  const msg = `🏢 *${branding.companyName.toUpperCase()} - KURUMSAL İNŞAAT & KENTSEL DÖNÜŞÜM TEKLİFİ*
📍 *Proje:* ${projectHeaderLine}
📄 *Teklif No:* ${identity.proposalNumber} (v${identity.version}) | *Tarih:* ${identity.proposalDateFormatted}
⏳ *Geçerlilik:* ${identity.validUntilFormatted} (${identity.validityDays} Gün)

📊 *MİMARİ KÜNYE:*
• Yapı Düzeni: ${project.floorStructureShort} (${project.floorStructureDetailed})
• Bağımsız Bölüm: ${project.unitBreakdownShort}
• Toplam İnşaat Alanı: ${project.totalArea.toLocaleString('tr-TR')} m²
• Anahtar Teslim Süresi: ${project.finalMonths} Ay

${financialSection}

🛡️ *GÜVENLİK VE TEKNİK TAAHHÜTLER:*
✓ 2018 Türkiye Bina Deprem Yönetmeliği %100 Uyum
✓ Radye Jeneral Temel & C35/40 Beton Sınıfı
✓ 20 Yıl Taşıyıcı Sistem & 5 Yıl İnce İşçilik Garantisi
✓ ${presentation.inflationNoticeTitle}

📞 *Detaylı görüşme ve randevu için:*
👤 ${branding.authorizedPerson} (${branding.authorizedTitle})
📱 Tel: ${branding.phone}
📧 E-posta: ${branding.email}${branding.visibility.showWebsite && branding.website ? `\n🌐 ${branding.website}` : ''}`;

  return sanitizeCustomerMessageText(msg);
}

/**
 * Bir nesne ağacında yasaklı şirket içi anahtarların bulunmadığını denetler (güvenlik testleri için).
 */
export function findForbiddenCustomerKeys(obj: unknown, path = ''): string[] {
  const hits: string[] = [];
  if (!obj || typeof obj !== 'object') return hits;

  const forbiddenSet = new Set<string>(FORBIDDEN_CUSTOMER_KEYS);

  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      hits.push(...findForbiddenCustomerKeys(item, `${path}[${idx}]`));
    });
    return hits;
  }

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (forbiddenSet.has(key)) {
      hits.push(currentPath);
    }
    if (value && typeof value === 'object') {
      hits.push(...findForbiddenCustomerKeys(value, currentPath));
    }
  }

  return hits;
}
