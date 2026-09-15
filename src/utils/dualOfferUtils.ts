import { ProjectParams, CalculationResult } from '../types';
import { calculateProject } from './calculatorEngine';
import { getAcOptionById } from './acOptions';

export interface DualOfferNamingPresetItem {
  id: 'standard_prestij' | 'klasik_konfor' | 'gumus_altin' | 'temel_akilli' | 'custom';
  label: string;
  baseTitle: string;
  plusTitle: string;
  description: string;
  badgeBase: string;
  badgePlus: string;
}

export const DUAL_OFFER_NAMING_PRESETS: DualOfferNamingPresetItem[] = [
  {
    id: 'standard_prestij',
    label: 'Standart / Prestij',
    baseTitle: 'Standart (Baz) Paket',
    plusTitle: 'Prestij Plus Paket',
    description: 'En çok tercih edilen kurumsal standart: Temel yasal standartlar ile prestijli konfor donanımları karşılaştırması.',
    badgeBase: 'Temel Standart',
    badgePlus: 'Prestij & Konfor',
  },
  {
    id: 'klasik_konfor',
    label: 'Klasik / Konfor',
    baseTitle: 'Klasik Paket (Temel Standartlar)',
    plusTitle: 'Konfor Plus Paket (Lüks & Akıllı Donanım)',
    description: 'Geleneksel konut inşaatı ile ileri teknoloji ve modern konfor çözümleri ayrımı.',
    badgeBase: 'Klasik Yapım',
    badgePlus: 'Lüks & Akıllı',
  },
  {
    id: 'gumus_altin',
    label: 'Gümüş / Altın',
    baseTitle: 'Gümüş Paket (Ekonomik Yapım)',
    plusTitle: 'Altın Plus Paket (Premium Standart)',
    description: 'Bütçe odaklı ekonomik dönüşüm ile yüksek katma değerli yatırım paketi karşılaştırması.',
    badgeBase: 'Ekonomik',
    badgePlus: 'Premium',
  },
  {
    id: 'temel_akilli',
    label: 'Temel / Akıllı',
    baseTitle: 'Temel İmalat Paketi',
    plusTitle: 'Akıllı & Ekolojik Plus Paket',
    description: 'Standart mühendislik yapımı ile enerji tasarruflu, çevre dostu inovatif donanımlar.',
    badgeBase: 'Temel Yapı',
    badgePlus: 'Ekolojik & Akıllı',
  },
];

export interface DualOfferFeatureDiff {
  id: string;
  category?: 'climate' | 'water' | 'bathroom' | 'kitchen' | 'smart' | 'general';
  name: string;
  icon: string;
  baseIncluded: boolean;
  plusIncluded: boolean;
  baseSpec: string;
  plusSpec: string;
  homeownerBenefit: string;
  costDeltaPerFlat: number;
}

export function getBaseParams(params: ProjectParams): ProjectParams {
  return {
    ...params,
    hasUnderfloorHeating: false,
    hasWaterFiltration: false,
    hasAcOption: false,
    hasThermostaticShowerMixer: false,
    hasLinearShowerDrain: false,
    hasBathroomHumidityFan: false,
    hasTouchlessKitchenFaucet: false,
    priceSmartHome: 0, // Baz pakette akıllı ev yerine standart diafon/otomasyon
  };
}

export function getPlusParams(params: ProjectParams): ProjectParams {
  const plusFeatures = params.plusOfferFeatures || {};

  return {
    ...params,
    hasUnderfloorHeating: plusFeatures.underfloorHeating !== false, // Varsayılan açık
    hasWaterFiltration: plusFeatures.waterFiltration !== false,     // Varsayılan açık
    hasAcOption: plusFeatures.acOption !== false,                   // Varsayılan açık
    acType: plusFeatures.acType || params.acType || '18k_btu',
    hasThermostaticShowerMixer: plusFeatures.thermostaticShowerMixer !== false, // Varsayılan açık
    hasLinearShowerDrain: plusFeatures.linearShowerDrain !== false,       // Varsayılan açık
    hasBathroomHumidityFan: plusFeatures.bathroomHumidityFan !== false, // Varsayılan açık
    hasTouchlessKitchenFaucet: plusFeatures.touchlessKitchenFaucet !== false, // Varsayılan açık
    priceSmartHome: plusFeatures.smartHome !== false ? (params.priceSmartHome || 15000) : 0,
  };
}

export interface ContractorItemCostBreakdown {
  id: string;
  name: string;
  icon: string;
  unitCost: number;
  totalCost: number;
  scope: string;
}

export interface DualOfferComparisonResult {
  baseTitle: string;
  plusTitle: string;
  baseParams: ProjectParams;
  plusParams: ProjectParams;
  baseResult: CalculationResult;
  plusResult: CalculationResult;
  // Gerçek teknik maliyetler (Yüklenicinin iç hesabı)
  calculatedTotalCostDiff: number;
  calculatedAvgCostPerFlatDiff: number;
  // Müşteriye sunulan fiyatlar (Teklif çıktısı)
  customerFlatDelta: number;
  customerTotalCostDiff: number;
  customerBaseGrandTotal: number;
  customerPlusGrandTotal: number;
  customerBaseFlatShare: number;
  customerPlusFlatShare: number;
  customerBaseNetDebtPerFlat: number;
  customerPlusNetDebtPerFlat: number;
  isCustomDeltaApplied: boolean;
  contractorNetExtraMargin: number;
  contractorMarginPercent: number;
  contractorNetMarginPerFlat: number;
  contractorNetTotalProfit: number;
  // Müteahhite Yansıyan Finansal Analiz Metrikleri (Müteahhidin Kazanç & Maliyet Özeti)
  contractorFlatsCount: number;
  ownerFlatsCount: number;
  contractorOwnFlatsCost: number;
  collectedFromOwners: number;
  netContractorBalance: number;
  unitProfitPerFlat: number;
  baseProfitAmount: number;
  plusProfitAmount: number;
  profitDiffAmount: number;
  profitDiffPercent: number;
  itemizedContractorCosts: ContractorItemCostBreakdown[];
  // Geriye dönük uyumluluk alanları
  totalCostDiff: number;
  avgCostPerFlatDiff: number;
  totalNetRemainingDebtDiff: number;
  features: DualOfferFeatureDiff[];
  // Dükkan ve Konut Ayrımı
  hasShops: boolean;
  shopCount: number;
  residentialCount: number;
  baseFlatUnitPrice: number;
  baseShopUnitPrice: number;
  plusFlatUnitPrice: number;
  plusShopUnitPrice: number;
  customerShopDelta: number;
  baseFlatShare: number;
  baseShopShare: number;
  plusFlatShare: number;
  plusShopShare: number;
  baseFlatNetDebt: number;
  baseShopNetDebt: number;
  plusFlatNetDebt: number;
  plusShopNetDebt: number;
}

export function computeDualOffer(params: ProjectParams): DualOfferComparisonResult {
  const preset = DUAL_OFFER_NAMING_PRESETS.find(p => p.id === params.offerNamingPreset) || DUAL_OFFER_NAMING_PRESETS[0];
  const baseTitle = params.baseOfferTitle?.trim() || preset.baseTitle;
  const plusTitle = params.plusOfferTitle?.trim() || preset.plusTitle;

  const baseParams = getBaseParams(params);
  const plusParams = getPlusParams(params);

  const baseResult = calculateProject(baseParams);
  const plusResult = calculateProject(plusParams);

  const baseCost = baseResult.grandTotal || baseResult.subTotalCost;
  const plusCost = plusResult.grandTotal || plusResult.subTotalCost;

  const baseFlatCount = baseResult.flatCount || 1;
  const plusFlatCount = plusResult.flatCount || 1;

  const baseAvgCostPerFlat = Math.round(baseCost / baseFlatCount);
  const plusAvgCostPerFlat = Math.round(plusCost / plusFlatCount);

  const baseNetRemainingDebt = baseResult.flatResults?.reduce((acc, f) => acc + (f.netRemainingDebt || 0), 0) || 0;
  const plusNetRemainingDebt = plusResult.flatResults?.reduce((acc, f) => acc + (f.netRemainingDebt || 0), 0) || 0;

  const acInfo = getAcOptionById(plusParams.acType || '18k_btu');
  const plusFeatures = params.plusOfferFeatures || {};

  // Müteahhidin dahil ettiği Plus kalemlerinin kalem bazında şantiye maliyeti
  const itemizedContractorCosts: ContractorItemCostBreakdown[] = [];

  if (plusFeatures.underfloorHeating !== false && (plusResult.underfloorHeatingCost || 0) > 0) {
    itemizedContractorCosts.push({
      id: 'heating',
      name: 'Sulu Yerden Isıtma Sistemi',
      icon: '🔥',
      unitCost: Math.round((plusResult.underfloorHeatingCost || 0) / plusFlatCount),
      totalCost: Math.round(plusResult.underfloorHeatingCost || 0),
      scope: 'Tüm Konut & Alanlar',
    });
  }

  if (plusFeatures.acOption !== false && (plusResult.acCostTotal || 0) > 0) {
    itemizedContractorCosts.push({
      id: 'ac',
      name: `A++ Inverter Klima (${acInfo.shortTitle})`,
      icon: '❄️',
      unitCost: Math.round((plusResult.acCostTotal || 0) / plusFlatCount),
      totalCost: Math.round(plusResult.acCostTotal || 0),
      scope: plusParams.acScope === 'residential_only' ? 'Yalnızca Konutlar' : 'Tüm Birimler',
    });
  }

  if (plusFeatures.waterFiltration !== false && (plusResult.waterFiltrationCost || 0) > 0) {
    itemizedContractorCosts.push({
      id: 'water',
      name: 'Merkezi Su Arıtma İstasyonu',
      icon: '💧',
      unitCost: Math.round((plusResult.waterFiltrationCost || 0) / plusFlatCount),
      totalCost: Math.round(plusResult.waterFiltrationCost || 0),
      scope: 'Bina Girişi (Ortak)',
    });
  }

  if (plusFeatures.thermostaticShowerMixer !== false && (plusResult.thermostaticMixerCost || 0) > 0) {
    itemizedContractorCosts.push({
      id: 'thermostatic_mixer',
      name: 'Termostatik Duş Bataryası (38°C Emniyetli)',
      icon: '🚿',
      unitCost: Math.round((plusResult.thermostaticMixerCost || 0) / plusFlatCount),
      totalCost: Math.round(plusResult.thermostaticMixerCost || 0),
      scope: 'Yalnızca Konutlar',
    });
  }

  if (plusFeatures.linearShowerDrain !== false && (plusResult.linearDrainCost || 0) > 0) {
    itemizedContractorCosts.push({
      id: 'linear_drain',
      name: 'Paslanmaz Lineer Duş Süzgeci',
      icon: '✨',
      unitCost: Math.round((plusResult.linearDrainCost || 0) / plusFlatCount),
      totalCost: Math.round(plusResult.linearDrainCost || 0),
      scope: 'Yalnızca Konutlar',
    });
  }

  if (plusFeatures.bathroomHumidityFan !== false && (plusResult.bathroomHumidityFanCost || 0) > 0) {
    itemizedContractorCosts.push({
      id: 'bathroom_fan',
      name: 'Sessiz Nem Sensörlü Banyo Fanı',
      icon: '🌀',
      unitCost: Math.round((plusResult.bathroomHumidityFanCost || 0) / plusFlatCount),
      totalCost: Math.round(plusResult.bathroomHumidityFanCost || 0),
      scope: 'Yalnızca Konutlar',
    });
  }

  if (plusFeatures.touchlessKitchenFaucet !== false && (plusResult.touchlessKitchenFaucetCost || 0) > 0) {
    itemizedContractorCosts.push({
      id: 'touchless_faucet',
      name: 'Fotoselli Akıllı Mutfak Bataryası',
      icon: '🫧',
      unitCost: Math.round((plusResult.touchlessKitchenFaucetCost || 0) / plusFlatCount),
      totalCost: Math.round(plusResult.touchlessKitchenFaucetCost || 0),
      scope: 'Yalnızca Konutlar',
    });
  }

  if (plusFeatures.smartHome !== false && (plusParams.priceSmartHome || 0) > 0) {
    itemizedContractorCosts.push({
      id: 'smart_home',
      name: 'Akıllı Ev & Güvenlik Modülü',
      icon: '🏡',
      unitCost: Math.round(plusParams.priceSmartHome || 15000),
      totalCost: Math.round((plusParams.priceSmartHome || 15000) * plusFlatCount),
      scope: 'Yalnızca Konutlar',
    });
  }

  // Gerçek teknik maliyet farkı:
  // Manuel m² birim fiyatı girilse dahi kalem bazlı teknik maliyetler toplamı (technicalItemsTotal)
  // asla 0 olamaz ve gerçek şantiye donanım farkını yansıtır.
  const technicalItemsTotal = itemizedContractorCosts.reduce((sum, item) => sum + item.totalCost, 0);
  const calculatedTotalCostDiff = technicalItemsTotal > 0
    ? technicalItemsTotal
    : Math.max(0, plusCost - baseCost);

  const calculatedAvgCostPerFlatDiff = plusFlatCount > 0
    ? Math.round(calculatedTotalCostDiff / plusFlatCount)
    : 0;

  // Müteahhit özel daire başı fark girdi mi?
  const hasCustomDelta = params.plusOfferCustomFlatDelta !== undefined && params.plusOfferCustomFlatDelta > 0;
  const customerFlatDelta = hasCustomDelta 
    ? Math.round(params.plusOfferCustomFlatDelta!) 
    : calculatedAvgCostPerFlatDiff;
  const customerTotalCostDiff = customerFlatDelta * plusFlatCount;

  // Yüklenicinin ilave kârı ve marjı (Müşteriye teklifte asla gösterilmez!)
  const contractorNetExtraMargin = customerTotalCostDiff - calculatedTotalCostDiff;
  const contractorMarginPercent = calculatedTotalCostDiff > 0 
    ? Math.round((contractorNetExtraMargin / calculatedTotalCostDiff) * 1000) / 10 
    : 0;

  // Müşteriye sunulan teklif tutarları (Teklifte ve resmi belgede görünecek rakamlar)
  const customerBaseGrandTotal = baseCost;
  const customerPlusGrandTotal = baseCost + customerTotalCostDiff;
  const customerBaseFlatShare = baseAvgCostPerFlat;
  const customerPlusFlatShare = baseAvgCostPerFlat + customerFlatDelta;
  const customerBaseNetDebtPerFlat = Math.round(baseNetRemainingDebt / baseFlatCount);
  const customerPlusNetDebtPerFlat = customerBaseNetDebtPerFlat + customerFlatDelta;

  // DÜKKAN VE KONUT AYRIMI (Unit Price & Cost Breakdown)
  const baseShops = baseResult.flatResults?.filter(f => f.flatType === 'shop' || f.flatType === 'basement_shop') || [];
  const baseFlats = baseResult.flatResults?.filter(f => f.flatType !== 'shop' && f.flatType !== 'basement_shop') || [];

  const hasShops = baseShops.length > 0;
  const shopCount = baseShops.length;
  const residentialCount = baseFlats.length;

  const baseFlatUnitPrice = params.manualFlatUnitPrice && params.manualFlatUnitPrice > 0
    ? params.manualFlatUnitPrice
    : baseResult.grossCostPerSqM;
  const baseShopUnitPrice = params.manualShopUnitPrice && params.manualShopUnitPrice > 0
    ? params.manualShopUnitPrice
    : (params.manualFlatUnitPrice && params.manualFlatUnitPrice > 0 ? params.manualFlatUnitPrice : baseResult.grossCostPerSqM);

  const baseFlatShare = baseFlats.length > 0
    ? Math.round(baseFlats.reduce((s, f) => s + f.grossPay, 0) / baseFlats.length)
    : baseAvgCostPerFlat;
  const baseShopShare = baseShops.length > 0
    ? Math.round(baseShops.reduce((s, f) => s + f.grossPay, 0) / baseShops.length)
    : 0;

  const plusFlatShare = baseFlatShare + customerFlatDelta;
  // Dükkanlar konutlara özel donanımlardan (banyo fanı, duş süzgeci, termostatik batarya, mutfak bataryası vb.) muaf olduğundan kendi ticari standart baz payındadır
  const plusShopShare = baseShopShare;

  const baseFlatNetDebt = baseFlats.length > 0
    ? Math.round(baseFlats.reduce((s, f) => s + (f.netRemainingDebt || 0), 0) / baseFlats.length)
    : customerBaseNetDebtPerFlat;
  const baseShopNetDebt = baseShops.length > 0
    ? Math.round(baseShops.reduce((s, f) => s + (f.netRemainingDebt || 0), 0) / baseShops.length)
    : 0;

  const plusFlatNetDebt = baseFlatNetDebt + customerFlatDelta;
  const plusShopNetDebt = baseShopNetDebt;

  // Geriye dönük uyumluluk için totalCostDiff ve avgCostPerFlatDiff müşteriye sunulan farkı yansıtır
  const totalCostDiff = customerTotalCostDiff;
  const avgCostPerFlatDiff = customerFlatDelta;
  const totalNetRemainingDebtDiff = hasCustomDelta
    ? customerTotalCostDiff
    : plusNetRemainingDebt - baseNetRemainingDebt;

  const features: DualOfferFeatureDiff[] = [
    {
      id: 'heating',
      category: 'climate',
      name: 'Isıtma Sistemi',
      icon: '🔥',
      baseIncluded: true,
      plusIncluded: true,
      baseSpec: 'Standart Panel Radyatör & Kombi Tesisatı',
      plusSpec: 'Homojen Sulu Yerden Isıtma Sistemi (Oda Bazlı Termostatik Kontrol)',
      homeownerBenefit: 'Mobilya yerleşiminde %100 duvar serbestliği, %18-22 doğalgaz faturası tasarrufu ve konforlu ayak ısınması.',
      costDeltaPerFlat: Math.round(plusResult.underfloorHeatingCost ? plusResult.underfloorHeatingCost / plusFlatCount : 0),
    },
    {
      id: 'ac',
      category: 'climate',
      name: 'İklimlendirme & Soğutma',
      icon: '❄️',
      baseIncluded: false,
      plusIncluded: true,
      baseSpec: 'Klimasız (Standart Daire)',
      plusSpec: `${acInfo.shortTitle} (${acInfo.btu}) A++ Inverter Salon Kliması`,
      homeownerBenefit: 'Yaz sıcaklarında yüksek enerji verimliliğiyle serinlik, cephe estetiğini bozmayan gizli montaj.',
      costDeltaPerFlat: Math.round(plusResult.acCostTotal ? plusResult.acCostTotal / plusFlatCount : 0),
    },
    {
      id: 'water',
      category: 'water',
      name: 'Merkezi Su Arıtma İstasyonu',
      icon: '💧',
      baseIncluded: false,
      plusIncluded: true,
      baseSpec: 'Standart Şebeke Bağlantısı (Filtresiz)',
      plusSpec: 'Bina Girişi Merkezi Klor, Kireç ve Tortu Filtrasyon Sistemi',
      homeownerBenefit: 'Kombiyi, bataryaları, çamaşır/bulaşık makinelerini kireçten korur; cihaz ömrünü 3 katına çıkarır, içilebilir temiz su sağlar.',
      costDeltaPerFlat: Math.round(plusResult.waterFiltrationCost ? plusResult.waterFiltrationCost / plusFlatCount : 0),
    },
    // EVİN BANYOSUNDAKİ YAŞAM KALİTESİNE DEĞER KATAN KONFOR DOKUNUŞLARI
    {
      id: 'thermostatic_mixer',
      category: 'bathroom',
      name: '38°C Emniyetli Termostatik Duş Bataryası',
      icon: '🚿',
      baseIncluded: true,
      plusIncluded: true,
      baseSpec: 'Standart Aç-Kapa Pirinç Batarya',
      plusSpec: '38°C Emniyet Kilitli Termostatik Duş Bataryası Seti (Yalnızca Konutlar — Dükkanlar Hariç)',
      homeownerBenefit: 'Banyoda ani sıcak su yanmalarını ve basınç şoklarını sıfırlar; çocuk ve yaşlı güvenliği sağlar, %30 su tasarrufu sunar. Dükkanlarda duş olmadığından yalnızca konut dairelerine uygulanır.',
      costDeltaPerFlat: Math.round(
        plusResult.thermostaticMixerCost && plusResult.residentialUnitsCount && plusResult.residentialUnitsCount > 0
          ? plusResult.thermostaticMixerCost / plusResult.residentialUnitsCount
          : plusResult.thermostaticMixerCost
          ? plusResult.thermostaticMixerCost / plusFlatCount
          : (params.thermostaticMixerPricePerFlat || 6500)
      ),
    },
    {
      id: 'linear_drain',
      category: 'bathroom',
      name: 'Lineer Duş Süzgeci & Koku Çekvalfi',
      icon: '✨',
      baseIncluded: true,
      plusIncluded: true,
      baseSpec: 'Standart Plastik Noktasal Yer Süzgeci',
      plusSpec: '304 Paslanmaz Çelik Etekli Lineer Duş Kanalı & Koku Çekvalfi (Yalnızca Konutlar — Dükkanlar Hariç)',
      homeownerBenefit: 'Hemzemin engelsiz modern banyo estetiği, %100 kötü koku ve böcek bariyeri, saç tutucu kolay temizlik. Dükkanlarda duş olmadığından yalnızca konut dairelerine uygulanır.',
      costDeltaPerFlat: Math.round(
        plusResult.linearDrainCost && plusResult.residentialUnitsCount && plusResult.residentialUnitsCount > 0
          ? plusResult.linearDrainCost / plusResult.residentialUnitsCount
          : plusResult.linearDrainCost
          ? plusResult.linearDrainCost / plusFlatCount
          : (params.linearDrainPricePerFlat || 2800)
      ),
    },
    {
      id: 'bathroom_fan',
      category: 'bathroom',
      name: 'Nem Sensörlü Sessiz Banyo Fanı',
      icon: '🌀',
      baseIncluded: false,
      plusIncluded: true,
      baseSpec: 'Standart Pasif Menfez / Fansız Şaft',
      plusSpec: 'Akıllı Nem Sensörlü, Geri Tepme Klapeli Sessiz Banyo Fanı (Yalnızca Konutlar — Dükkanlar Hariç)',
      homeownerBenefit: 'Banyoda oluşan buğu ve nemi otomatik algılayıp sessizce tahliye eder; küf, mantar ve rutubet kokusunu tamamen önler. Geri tepme klapesi şafttan geri hava ve koku girişini engeller.',
      costDeltaPerFlat: Math.round(
        plusResult.bathroomHumidityFanCost && plusResult.residentialUnitsCount && plusResult.residentialUnitsCount > 0
          ? plusResult.bathroomHumidityFanCost / plusResult.residentialUnitsCount
          : plusResult.bathroomHumidityFanCost
          ? plusResult.bathroomHumidityFanCost / plusFlatCount
          : (params.bathroomHumidityFanPricePerFlat || 3200)
      ),
    },
    // KADINLARIN HAYATINI KOLAYLAŞTIRAN MUTFAK KONFORU
    {
      id: 'touchless_kitchen',
      category: 'kitchen',
      name: 'Fotoselli / Temassız Mutfak Bataryası',
      icon: '🫧',
      baseIncluded: false,
      plusIncluded: true,
      baseSpec: 'Standart Manuel Aç-Kapa Eviye Bataryası',
      plusSpec: 'Kadınların Hayatını Kolaylaştıran Temassız Fotoselli Akıllı Mutfak Bataryası (Yalnızca Konutlar)',
      homeownerBenefit: 'Hamurlu, yağlı veya etli ellerle bataryaya temas etmeden suyu açıp kapatma kolaylığı; tezgaha su damlatmaz, mutfak temizliğini hafifletir ve %40 su tasarrufu sağlar.',
      costDeltaPerFlat: Math.round(
        plusResult.touchlessKitchenFaucetCost && plusResult.residentialUnitsCount && plusResult.residentialUnitsCount > 0
          ? plusResult.touchlessKitchenFaucetCost / plusResult.residentialUnitsCount
          : plusResult.touchlessKitchenFaucetCost
          ? plusResult.touchlessKitchenFaucetCost / plusFlatCount
          : (params.touchlessKitchenFaucetPricePerFlat || 4500)
      ),
    },
    {
      id: 'smart_home',
      category: 'smart',
      name: 'Akıllı Ev & Otomasyon',
      icon: '🏡',
      baseIncluded: false,
      plusIncluded: true,
      baseSpec: 'Standart Görüntülü Diafon Sistemi',
      plusSpec: 'Mobil Entegre Akıllı Ev Paketi (Aydınlatma, Ana Su/Gaz Vanası & Güvenlik)',
      homeownerBenefit: 'Evden uzaktayken cep telefonundan su ve gazı kapatabilme, senaryolu aydınlatma ile yüksek konfor ve güvenlik.',
      costDeltaPerFlat: Math.round(plusParams.priceSmartHome || 15000),
    },
  ];

  // Müteahhite Yansıyan Finansal Analiz Hesaplamaları
  const contractorFlatsCount = baseResult.flatResults?.filter(f => f.isContractorShare).length || 0;
  const ownerFlatsCount = Math.max(0, (baseResult.flatResults?.length || plusFlatCount) - contractorFlatsCount);
  const contractorOwnFlatsCost = contractorFlatsCount * calculatedAvgCostPerFlatDiff;
  const collectedFromOwners = ownerFlatsCount * customerFlatDelta;
  const netContractorBalance = contractorFlatsCount > 0 
    ? (collectedFromOwners - calculatedTotalCostDiff) 
    : contractorNetExtraMargin;
  const unitProfitPerFlat = customerFlatDelta - calculatedAvgCostPerFlatDiff;

  const baseProfitAmount = Math.round(baseResult.profitAmount || 0);
  const plusProfitAmount = Math.round(
    hasCustomDelta 
      ? baseProfitAmount + contractorNetExtraMargin 
      : (plusResult.profitAmount || baseProfitAmount)
  );
  const profitDiffAmount = Math.round(plusProfitAmount - baseProfitAmount);
  const profitDiffPercent = baseProfitAmount > 0 
    ? Math.round((profitDiffAmount / baseProfitAmount) * 1000) / 10 
    : 0;

  return {
    baseTitle,
    plusTitle,
    baseParams,
    plusParams,
    baseResult,
    plusResult,
    calculatedTotalCostDiff,
    calculatedAvgCostPerFlatDiff,
    customerFlatDelta,
    customerTotalCostDiff,
    customerBaseGrandTotal,
    customerPlusGrandTotal,
    customerBaseFlatShare,
    customerPlusFlatShare,
    customerBaseNetDebtPerFlat,
    customerPlusNetDebtPerFlat,
    isCustomDeltaApplied: hasCustomDelta,
    contractorNetExtraMargin,
    contractorMarginPercent,
    contractorNetMarginPerFlat: unitProfitPerFlat,
    contractorNetTotalProfit: plusProfitAmount,
    contractorFlatsCount,
    ownerFlatsCount,
    contractorOwnFlatsCost,
    collectedFromOwners,
    netContractorBalance,
    unitProfitPerFlat,
    baseProfitAmount,
    plusProfitAmount,
    profitDiffAmount,
    profitDiffPercent,
    itemizedContractorCosts,
    totalCostDiff,
    avgCostPerFlatDiff,
    totalNetRemainingDebtDiff,
    features,
    // Dükkan ve Konut Ayrımı
    hasShops,
    shopCount,
    residentialCount,
    baseFlatUnitPrice,
    baseShopUnitPrice,
    plusFlatUnitPrice: baseFlatUnitPrice + Math.round(customerFlatDelta / Math.max(1, (baseFlats[0]?.grossArea || 100))),
    plusShopUnitPrice: baseShopUnitPrice,
    customerShopDelta: 0,
    baseFlatShare,
    baseShopShare,
    plusFlatShare,
    plusShopShare,
    baseFlatNetDebt,
    baseShopNetDebt,
    plusFlatNetDebt,
    plusShopNetDebt,
  };
}
