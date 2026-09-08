import { ProjectParams, CalculationResult, FlatCalcResult, CashFlowRow, FlatItem } from '../types';
import { DEFAULT_CUSTOM_FACADES_4, calculateFootprint } from './footprintUtils';

export const DEFAULT_PARAMS: ProjectParams = {
  projectName: 'Müşteri / Proje Adı Belirtilmedi',
  projectType: 'kentsel',
  basementPurpose: 'shelter_depot',
  roofAtticType: 'duplex_unified',
  projectAddress: 'İstanbul, Fatih Kocamustafapaşa Mah. 1024 Ada 15 Parsel',
  manualFlatUnitPrice: 0,
  manualShopUnitPrice: 0,
  durationOption: 'manual',
  manualMonths: 14,
  transformationStatus: 'currentSupport',
  projectModel: 'cash',
  baseBuildArea: 100,
  floorCount: 5,
  flatCount: 10,
  contractorShareRate: 50,
  buildingType: 'standard',
  roomType: '3+1',
  usdRate: 48.24,
  costMultiplier: 1.0,
  profitRate: 25,

  // Taban Oturumu ve Çoklu Cephe Seçenekleri
  footprintInputMode: 'directArea',
  facadeWidth: 14.0,
  facadeDepth: 18.0,
  backFacadeLength: 14.0,
  leftFacadeLength: 18.0,
  customFacadeCount: 4,
  customFacades: DEFAULT_CUSTOM_FACADES_4,
  lShapeFrontMain: 16.0,
  lShapeDepthMain: 20.0,
  lShapeRecessFront: 6.0,
  lShapeRecessDepth: 8.0,

  // Dükkan / Ticari Seçeneği
  hasGroundFloorShop: false,
  shopCount: 1,
  shopHeight: 3.80,

  // Çıkma / Tabla Konsolu (1. Kattan sonra tabla çıkması)
  hasCantilever: false,
  cantileverDepth: 1.20,
  cantileverDirection: 'front_back',

  // Mimari Çatı ve Kütle Özellikleri
  roofType: 'gable',
  basementCount: 1,
  floorHeight: 2.90,
  flatsPerFloor: 2,
  facadeStyle: 'wood_anthracite',
  balconyDepth: 1.40,
  elevatorCount: 1,

  // Cost items
  costNotaryContract: 40000,
  costCompany: 50000,
  priceProjectPermit: 580,
  priceSgk: 460,
  costInsurance: 35000,
  costSalesMarketing: 30000,
  manualEqualExtraCost: 0,
  manualEqualExtraCostLabel: 'Malik Ortak Ek Gideri',
  additionalOfferClauses: [
    'Teklifimiz, resmi onayların alınmasını müteakip başlanacak inşaat ruhsat tarihinden itibaren geçerlidir.',
    'Sözleşme tarihinde yürürlükte olan resmi vergi ve harç oranlarındaki değişiklikler hakedişlere yansıtılacaktır.'
  ],

  // Kaba insaat (2026 Güncel Piyasa & ÇŞİDB Rayiçleri)
  priceConcrete: 3850,
  priceSteel: 36200,
  priceSteelLabor: 4800,
  priceBrickMaterial: 240,
  priceBrickLabor: 420,
  priceFormworkLabor: 1100,
  priceExcavation: 320,
  costKabaWork: 2200,

  // Ince insaat & Sistemler
  costElevator: 350000,
  priceSmartHome: 15000,
  costIntercom: 50000,
  priceGas: 65000,
  pricePlumbing: 75000,
  priceElectric: 60000,
  pricePvc: 4800,
  priceTiles: 850,
  priceKitchen: 135000,
  priceDoors: 85000,
  pricePaintPlaster: 520,

  includeProfitOwner: 'yes',
  paymentPlanType: 'stages',
  installmentCount: 12,
  installmentIntervalMonths: 1,
  stage1Pay: 10,
  stage2Pay: 25,
  stage3Pay: 30,
  stage4Pay: 25,
  stage5Pay: 10,

  flats: [
    { id: 1, name: 'Kat Maliki 1', tc: '10000000001', area: 50, downPayment: 0, useTransformationCredit: true },
    { id: 2, name: 'Kat Maliki 2', tc: '10000000002', area: 50, downPayment: 0, useTransformationCredit: true },
    { id: 3, name: 'Kat Maliki 3', tc: '10000000003', area: 50, downPayment: 0, useTransformationCredit: true },
    { id: 4, name: 'Kat Maliki 4', tc: '10000000004', area: 50, downPayment: 0, useTransformationCredit: true },
    { id: 5, name: 'Kat Maliki 5', tc: '10000000005', area: 50, downPayment: 0, useTransformationCredit: true },
    { id: 6, name: 'Kat Maliki 6', tc: '10000000006', area: 50, downPayment: 0, useTransformationCredit: true },
    { id: 7, name: 'Kat Maliki 7', tc: '10000000007', area: 50, downPayment: 0, useTransformationCredit: true },
    { id: 8, name: 'Kat Maliki 8', tc: '10000000008', area: 50, downPayment: 0, useTransformationCredit: true },
    { id: 9, name: 'Kat Maliki 9', tc: '10000000009', area: 50, downPayment: 0, useTransformationCredit: true },
    { id: 10, name: 'Kat Maliki 10', tc: '10000000010', area: 50, downPayment: 0, useTransformationCredit: true },
  ],
};

export function generateInitialFlats(baseArea: number, floorCount: number, flatCount: number, transStatus: string) {
  const total = baseArea * floorCount;
  const avg = flatCount > 0 ? parseFloat((total / flatCount).toFixed(1)) : 100;
  return Array.from({ length: flatCount }, (_, i) => ({
    id: i + 1,
    name: `Kat Maliki ${i + 1}`,
    tc: `1000000000${i + 1}`,
    area: avg,
    downPayment: 0,
    useTransformationCredit: transStatus !== 'none',
  }));
}

export function synchronizeFlats(
  flats: FlatItem[] = [],
  flatCount: number,
  baseBuildArea: number,
  floorCount: number,
  transStatus: string,
  roofType?: ProjectParams['roofType'],
  flatsPerFloor: number = 2,
  mansardFlatCount?: number,
  roofAtticArea: number = 0,
  hasGroundFloorShop?: boolean,
  shopCount: number = 1
): FlatItem[] {
  const newCount = Math.max(1, flatCount);
  const isMansard = roofType === 'mansard';
  const isDuplex = roofType === 'duplex';
  
  // Mansart çatı tek seçildiğinde ekstra bağımsız bölümler eklenir
  // Mansart + Dubleks seçildiğinde son katla birleşip TEK bağımsız bölüm sayılır
  const extraMansardFlats = isMansard
    ? (mansardFlatCount && mansardFlatCount > 0 ? mansardFlatCount : Math.max(1, flatsPerFloor))
    : 0;

  const normalFlatsCount = isMansard ? Math.max(1, newCount - extraMansardFlats) : newCount;
  const normalTotalArea = baseBuildArea * floorCount;
  const normalAvg = parseFloat((normalTotalArea / normalFlatsCount).toFixed(2));
  
  // Mansart bağımsız bölüm alanı (çatı piyesi inşaat alanına göre)
  const mansardAvg = extraMansardFlats > 0 && roofAtticArea > 0
    ? parseFloat((roofAtticArea / extraMansardFlats).toFixed(2))
    : parseFloat((normalAvg * 0.70).toFixed(2));

  // Dubleks için son kattaki dairelere eklenen çatı teras alanı
  const duplexCount = Math.min(Math.max(1, flatsPerFloor), newCount);
  const duplexAddArea = isDuplex && roofAtticArea > 0
    ? parseFloat((roofAtticArea / duplexCount).toFixed(2))
    : 0;

  return Array.from({ length: newCount }, (_, i) => {
    const existing = flats[i];
    const isMansardFlat = isMansard && i >= normalFlatsCount;
    const isDuplexFlat = isDuplex && i >= newCount - duplexCount;
    const isShopFlat = !!hasGroundFloorShop && i < (shopCount || 1);

    let area = normalAvg;
    let flatType: FlatItem['flatType'] = isShopFlat ? 'shop' : 'standard';
    let description: string | undefined;

    if (isShopFlat) {
      description = 'Zemin Kat Ticari Bağımsız Bölüm (Dükkan/Mağaza)';
    }

    // Automatic floor calculation: 0 = Ground, 1 = 1st floor, etc.
    const calculatedFloor = Math.floor(i / Math.max(1, flatsPerFloor));

    // Default Serefiye based on floor & flat type
    let defaultSerefiye = 1.0;
    if (isShopFlat) {
      defaultSerefiye = 1.25; // Dükkanlar genellikle daha değerlidir
    } else if (isDuplexFlat) {
      defaultSerefiye = 1.18;
    } else if (isMansardFlat) {
      defaultSerefiye = 1.08;
    } else if (calculatedFloor === 0) {
      defaultSerefiye = 0.92; // Zemin Kat
    } else if (calculatedFloor === 1) {
      defaultSerefiye = 0.98; // 1. Kat
    } else if (calculatedFloor >= floorCount - 1) {
      defaultSerefiye = 1.10; // En Üst Kat
    } else {
      defaultSerefiye = 1.02; // Ara Katlar
    }

    if (isMansardFlat) {
      area = mansardAvg;
      flatType = 'mansard';
      description = 'Çatı Katı Mansart - Ayrı Bağımsız Bölüm';
    } else if (isDuplexFlat) {
      area = parseFloat((normalAvg + duplexAddArea).toFixed(2));
      flatType = 'duplex';
      description = 'Çatı Dubleksi - Tek Bağımsız Bölüm (Alt Kat + Çatı Terası)';
    }

    if (existing) {
      return {
        ...existing,
        id: i + 1,
        area: existing.area !== undefined && existing.area > 0 ? existing.area : area,
        flatType: existing.flatType !== undefined ? existing.flatType : flatType,
        description: existing.description !== undefined ? existing.description : description,
        floorNumber: existing.floorNumber !== undefined ? existing.floorNumber : calculatedFloor,
        facade: existing.facade || (i % 2 === 0 ? 'guney' : 'kuzey'),
        serefiyeMultiplier: existing.serefiyeMultiplier !== undefined ? existing.serefiyeMultiplier : defaultSerefiye,
        landShareNumerator: existing.landShareNumerator !== undefined ? existing.landShareNumerator : Math.round(area * 10),
        landShareDenominator: existing.landShareDenominator !== undefined ? existing.landShareDenominator : 1000,
        name: (existing.name && (existing.name.startsWith('Kat Maliki') || existing.name.startsWith('Dükkan')))
          ? (existing.flatType === 'shop' || (existing.flatType === undefined && isShopFlat) 
              ? `Dükkan ${i + 1}` 
              : isMansardFlat 
                ? `Kat Maliki ${i + 1} (Mansart Çatı)` 
                : isDuplexFlat 
                  ? `Kat Maliki ${i + 1} (Çatı Dubleksi)` 
                  : `Kat Maliki ${i + 1}`)
          : existing.name,
      };
    }

    const defaultName = isShopFlat
      ? `Dükkan ${i + 1}`
      : isMansardFlat
      ? `Kat Maliki ${i + 1} (Mansart Çatı)`
      : isDuplexFlat
      ? `Kat Maliki ${i + 1} (Çatı Dubleksi)`
      : `Kat Maliki ${i + 1}`;

    return {
      id: i + 1,
      name: defaultName,
      tc: `1000000000${i + 1}`,
      area,
      downPayment: 0,
      useTransformationCredit: transStatus !== 'none',
      flatType,
      description,
      floorNumber: calculatedFloor,
      facade: i % 2 === 0 ? 'guney' : 'kuzey',
      serefiyeMultiplier: defaultSerefiye,
      landShareNumerator: Math.round(area * 10),
      landShareDenominator: 1000,
    };
  });
}

export function calculateProject(params: ProjectParams): CalculationResult {
  const {
    baseBuildArea,
    floorCount,
    flatCount,
    buildingType,
    costMultiplier,
    usdRate,
    profitRate,
    durationOption,
    manualMonths,
    transformationStatus,
    projectModel,
    contractorShareRate,
    includeProfitOwner,
    flats = [],
    stage1Pay,
    stage2Pay,
    stage3Pay,
    stage4Pay,
    stage5Pay,
    paymentPlanType = 'stages',
    installmentCount = 12,
    hasCantilever,
    cantileverDepth = 1.2,
    cantileverDirection = 'front_back',
  } = params;

  // Dynamically calculate active footprint area and dimensions using active footprint mode (Direct, Dimensions, Polygon, Custom Facades, L-Shape)
  const footprintCalc = calculateFootprint(params.footprintInputMode, params);
  const activeBaseArea = footprintCalc.area;
  const estW = footprintCalc.effectiveWidth;
  const estD = footprintCalc.effectiveDepth;

  // Calculate upper floor area if cantilever (tabla çıkması) is present
  // KURAL: Tabla çıkması KÖR CEPHELERDE (yangın duvarı / komşu parsel sınırı) kesinlikle yapılamaz!
  const upperFloorsCount = Math.max(0, floorCount - 1);
  let upperFloorArea = activeBaseArea;
  if (hasCantilever && cantileverDepth > 0) {
    const isBlind = (idx: number) => {
      const cfg = params.facadeConfigs?.[idx];
      return cfg && (cfg.windowCountPerFloor === 0 || (cfg as any).isBlankWall === true);
    };

    let fCant = 0;
    let rCant = 0;
    let bCant = 0;
    let lCant = 0;

    if (params.facadeCantilevers && params.facadeCantilevers.length >= 4) {
      fCant = isBlind(0) ? 0 : (params.facadeCantilevers[0] || 0);
      rCant = isBlind(1) ? 0 : (params.facadeCantilevers[1] || 0);
      bCant = isBlind(2) ? 0 : (params.facadeCantilevers[2] || 0);
      lCant = isBlind(3) ? 0 : (params.facadeCantilevers[3] || 0);
    } else {
      if (cantileverDirection === 'all') {
        fCant = isBlind(0) ? 0 : cantileverDepth;
        rCant = isBlind(1) ? 0 : cantileverDepth;
        bCant = isBlind(2) ? 0 : cantileverDepth;
        lCant = isBlind(3) ? 0 : cantileverDepth;
      } else if (cantileverDirection === 'front') {
        fCant = isBlind(0) ? 0 : cantileverDepth;
      } else {
        // front_back
        fCant = isBlind(0) ? 0 : cantileverDepth;
        bCant = isBlind(2) ? 0 : cantileverDepth;
      }
    }

    upperFloorArea = (estW + lCant + rCant) * (estD + fCant + bCant);
    upperFloorArea = Math.round(upperFloorArea * 100) / 100;
  }

  // Çatı ve Dubleks İnşaat Alanı Hesabı:
  const roofType = params.roofType || 'gable';
  const isMansard = roofType === 'mansard';
  const isDuplex = roofType === 'duplex';

  const roofAtticArea = isDuplex
    ? Math.round(upperFloorArea * 0.65 * 100) / 100
    : isMansard
    ? Math.round(upperFloorArea * 0.70 * 100) / 100
    : 0;

  const basementFloorsCount = Math.max(0, params.basementCount !== undefined && !isNaN(params.basementCount) ? params.basementCount : 1);
  let rawTotalArea = activeBaseArea * (1 + basementFloorsCount) + upperFloorsCount * upperFloorArea + roofAtticArea;

  // Belediye İmar Teşviki Emsal Bonusu (%):
  if (params.municipalIncentives?.enabled && (params.municipalIncentives.grantedFloorAreaBonusPercent || 0) > 0) {
    const bonusMultiplier = 1 + (params.municipalIncentives.grantedFloorAreaBonusPercent / 100);
    rawTotalArea = rawTotalArea * bonusMultiplier;
  }

  const totalArea = Math.round(Math.max(1, rawTotalArea) * 100) / 100;

  // Bağımsız Bölüm Sayısı Hesabı:
  // KURAL: Mansart çatı tek seçildiğinde çatı katında ekstra bağımsız bölüm çıkar ve hesaplara dahil edilir.
  // Mansart çatı + dubleks seçildiğinde son katla birleştiği için tek bağımsız bölüm kabul edilir (ekstra daire eklenmez).
  const resFloors = params.hasGroundFloorShop ? Math.max(1, floorCount - 1) : floorCount;
  const flatsPerFloor = params.flatsPerFloor || 2;
  const normalFloorFlats = resFloors * flatsPerFloor;
  const extraMansardFlats = isMansard
    ? (params.mansardFlatCount && params.mansardFlatCount > 0 ? params.mansardFlatCount : Math.max(1, flatsPerFloor))
    : 0;

  const effectiveFlatCount = isMansard
    ? Math.max(flatCount, normalFloorFlats + extraMansardFlats)
    : (flatCount === floorCount && flatsPerFloor > 1 ? normalFloorFlats : (flatCount || normalFloorFlats));

  let kabaDaysPerFloor = 22;
  let inceDaysPerFloor = 28;
  let kabaTypeMult = 1.0;
  let inceTypeMult = 1.0;

  if (buildingType === 'luxury') {
    kabaDaysPerFloor = 25;
    inceDaysPerFloor = 35;
    inceTypeMult = 1.35;
  } else if (buildingType === 'commercial') {
    kabaDaysPerFloor = 26;
    inceDaysPerFloor = 30;
    kabaTypeMult = 1.15;
  }

  const permitDays = 90;
  const iskanDays = 45;
  const kabaDaysTotal = floorCount * kabaDaysPerFloor + 15;
  const inceDaysTotal = floorCount * inceDaysPerFloor + 30;
  const totalDaysAuto = permitDays + kabaDaysTotal + inceDaysTotal + iskanDays;
  const autoDurationMonths = Math.round((totalDaysAuto / 30) * 10) / 10;

  let finalMonths = autoDurationMonths;
  let totalDays = totalDaysAuto;

  if (durationOption === 'manual') {
    finalMonths = Math.round((manualMonths || 0) * 10) / 10;
    totalDays = finalMonths * 30;
  } else if (durationOption === 'hide') {
    finalMonths = 0;
    totalDays = 0;
  }

  // Cost items with boundary checks
  const safeNotary = Math.max(0, params.costNotaryContract ?? 40000);
  const safeCompany = Math.max(0, params.costCompany ?? 50000);
  const safeProjectPermit = Math.max(0, params.priceProjectPermit ?? 580);
  const safeSgk = Math.max(0, params.priceSgk ?? 460);
  const safeInsurance = Math.max(0, params.costInsurance ?? 35000);
  const safeSalesMarketing = Math.max(0, params.costSalesMarketing ?? 30000);

  const officialCost =
    (safeNotary + safeCompany + totalArea * safeProjectPermit) * costMultiplier;

  const sgkSalesCost =
    (totalArea * safeSgk + safeInsurance + effectiveFlatCount * safeSalesMarketing) * costMultiplier;

  // --- KABA İNŞAAT METRAJ & KALEMLERİ ---
  const concreteM3 = Math.round(totalArea * 0.42 * 100) / 100;
  const steelTon = Math.round(totalArea * 0.042 * 100) / 100;
  const brickM2 = Math.round(totalArea * 0.75 * 100) / 100; // İç ve dış tuğla/gazbeton duvar metrajı
  const formworkM2 = Math.round(totalArea * 2.65 * 100) / 100; // Kalıp yüzey alanı
  const excavationM3 = Math.round(activeBaseArea * (Math.max(1, basementFloorsCount) * (params.floorHeight || 2.9) + 1.6) * 1.15 * 100) / 100;

  const safePriceConcrete = Math.max(0, params.priceConcrete ?? 3850);
  const safePriceSteel = Math.max(0, params.priceSteel ?? 36200);
  const safePriceSteelLabor = Math.max(0, params.priceSteelLabor ?? 4800);
  const safePriceBrickMat = Math.max(0, params.priceBrickMaterial ?? 240);
  const safePriceBrickLab = Math.max(0, params.priceBrickLabor ?? 420);
  const safePriceFormworkLab = Math.max(
    0,
    params.priceFormworkLabor ?? (params.costKabaWork ? params.costKabaWork * 0.50 : 1100)
  );
  const safePriceExcavation = Math.max(0, params.priceExcavation ?? 320);

  // Kaba İnşaat Malzeme Kalemleri
  const costConcreteMat = concreteM3 * safePriceConcrete;
  const costSteelMat = steelTon * safePriceSteel;
  const costBrickMat = brickM2 * safePriceBrickMat;
  const costExcavationMat = excavationM3 * safePriceExcavation * 0.4; // Akaryakıt, makine aşınma payı & döküm harcı

  // Kaba İnşaat İşçilik Kalemleri
  const costSteelLab = steelTon * safePriceSteelLabor;
  const costBrickLab = brickM2 * safePriceBrickLab;
  const costFormworkLab = totalArea * safePriceFormworkLab;
  const costExcavationLab = excavationM3 * safePriceExcavation * 0.6; // Ekskavatör operatör & kamyon şoför işçiliği

  const kabaMaterialCost =
    Math.round((costConcreteMat + costSteelMat + costBrickMat + costExcavationMat) * kabaTypeMult * costMultiplier * 100) / 100;
  const kabaLaborCost =
    Math.round((costSteelLab + costBrickLab + costFormworkLab + costExcavationLab) * kabaTypeMult * costMultiplier * 100) / 100;
  const kabaTotalCost = Math.round((kabaMaterialCost + kabaLaborCost) * 100) / 100;

  // --- SİSTEMLER & MEKANİK ---
  const safeCostElevator = Math.max(0, params.costElevator ?? 350000);
  const safePriceSmartHome = Math.max(0, params.priceSmartHome ?? 15000);
  const safeCostIntercom = Math.max(0, params.costIntercom ?? 50000);
  const safePriceGas = Math.max(0, params.priceGas ?? 65000);

  const costElevatorTotal = safeCostElevator * (params.elevatorCount || 1);
  const costSmartHomeTotal = effectiveFlatCount * safePriceSmartHome;
  const costIntercomTotal = safeCostIntercom;
  const costGasTotal = effectiveFlatCount * safePriceGas;

  const systemsRawTotal = costElevatorTotal + costSmartHomeTotal + costIntercomTotal + costGasTotal;
  const systemsCost = Math.round(systemsRawTotal * costMultiplier * 100) / 100;
  const systemsLaborCost = Math.round(
    (costElevatorTotal * 0.20 + costSmartHomeTotal * 0.15 + costIntercomTotal * 0.20 + costGasTotal * 0.30) *
      costMultiplier *
      100
  ) / 100;
  const systemsMaterialCost = Math.round((systemsCost - systemsLaborCost) * 100) / 100;

  // Compute blind vs open facade ratio for PVC and paint/plaster takeoff adjustments
  let activeOpenFacadeRatio = 1.0;
  if (params.facadeConfigs && params.facadeConfigs.length > 0) {
    const totalCount = params.facadeConfigs.length;
    const openCount = params.facadeConfigs.filter((c) => (c.windowCountPerFloor ?? 1) > 0).length;
    activeOpenFacadeRatio = totalCount > 0 ? openCount / totalCount : 1.0;
  } else if (params.customFacades && params.customFacades.length > 0) {
    const totalCount = params.customFacades.length;
    const openCount = params.customFacades.filter((c) => (c.windowCountPerFloor ?? 1) > 0).length;
    activeOpenFacadeRatio = totalCount > 0 ? openCount / totalCount : 1.0;
  }

  const pvcAreaFactor = 0.18 * activeOpenFacadeRatio;
  const paintPlasterAreaFactor = 2.8 + 0.18 * (1 - activeOpenFacadeRatio);

  // --- İNCE İNŞAAT ---
  const safePricePlumbing = Math.max(0, params.pricePlumbing ?? 75000);
  const safePriceElectric = Math.max(0, params.priceElectric ?? 60000);
  const safePricePvc = Math.max(0, params.pricePvc ?? 4800);
  const safePriceTiles = Math.max(0, params.priceTiles ?? 850);
  const safePriceKitchen = Math.max(0, params.priceKitchen ?? 135000);
  const safePriceDoors = Math.max(0, params.priceDoors ?? 85000);
  const safePricePaintPlaster = Math.max(0, params.pricePaintPlaster ?? 520);

  const costPlumbing = effectiveFlatCount * safePricePlumbing;
  const costElectric = effectiveFlatCount * safePriceElectric;
  const costPvc = totalArea * pvcAreaFactor * safePricePvc;
  const costTiles = totalArea * safePriceTiles;
  const costKitchen = effectiveFlatCount * safePriceKitchen;
  const costDoors = effectiveFlatCount * safePriceDoors;
  const costPaintPlaster = totalArea * paintPlasterAreaFactor * safePricePaintPlaster;

  const finishingRawTotal =
    costPlumbing + costElectric + costPvc + costTiles + costKitchen + costDoors + costPaintPlaster;
  const finishingTotalCost = Math.round(finishingRawTotal * inceTypeMult * costMultiplier * 100) / 100;

  const fineLaborCost = Math.round(
    (costPlumbing * 0.45 +
      costElectric * 0.45 +
      costPvc * 0.25 +
      costTiles * 0.50 +
      costKitchen * 0.20 +
      costDoors * 0.20 +
      costPaintPlaster * 0.70) *
      inceTypeMult *
      costMultiplier *
      100
  ) / 100;
  const fineMaterialCost = Math.round((finishingTotalCost - fineLaborCost) * 100) / 100;

  // --- RESMİ & İDARİ ---
  const officialCombinedCost = officialCost + sgkSalesCost;
  const officialLaborCost = Math.round((totalArea * safeSgk * costMultiplier + safeSalesMarketing * effectiveFlatCount * 0.5 * costMultiplier) * 100) / 100;
  const officialMaterialCost = Math.round((officialCombinedCost - officialLaborCost) * 100) / 100;

  // Genel Malzeme vs İşçilik Toplamları
  const totalLaborCost = Math.round((kabaLaborCost + fineLaborCost + systemsLaborCost + officialLaborCost) * 100) / 100;
  const totalMaterialCost = Math.round((kabaMaterialCost + fineMaterialCost + systemsMaterialCost + officialMaterialCost) * 100) / 100;

  const subTotalCost =
    Math.round(
      (officialCost + sgkSalesCost + kabaTotalCost + systemsCost + finishingTotalCost) * 100
    ) / 100;
  const calculatedProfitAmount = Math.round(subTotalCost * (profitRate / 100) * 100) / 100;
  const calculatedGrandTotal = Math.round((subTotalCost + calculatedProfitAmount) * 100) / 100;

  const netCostPerSqM = totalArea > 0 ? Math.round((subTotalCost / totalArea) * 100) / 100 : 0;
  const calculatedGrossCostPerSqM = totalArea > 0 ? Math.round((calculatedGrandTotal / totalArea) * 100) / 100 : 0;

  const shopArea = params.hasGroundFloorShop ? activeBaseArea : 0;
  const flatArea = Math.max(0, totalArea - shopArea);

  const hasManualFlatPrice = !!(params.manualFlatUnitPrice && params.manualFlatUnitPrice > 0);
  const hasManualShopPrice = !!(params.manualShopUnitPrice && params.manualShopUnitPrice > 0);
  const hasManualPrice = hasManualFlatPrice || hasManualShopPrice;

  const finalFlatPrice = hasManualFlatPrice ? params.manualFlatUnitPrice! : calculatedGrossCostPerSqM;
  const finalShopPrice = hasManualShopPrice ? params.manualShopUnitPrice! : (hasManualFlatPrice ? params.manualFlatUnitPrice! : calculatedGrossCostPerSqM);

  const safeManualExtraCost = Math.max(0, params.manualEqualExtraCost || 0);

  const grandTotal = hasManualPrice
    ? Math.round((finalFlatPrice * flatArea + finalShopPrice * shopArea + safeManualExtraCost) * 100) / 100
    : Math.round((calculatedGrandTotal + safeManualExtraCost) * 100) / 100;

  const grossCostPerSqM = totalArea > 0 ? Math.round((grandTotal / totalArea) * 100) / 100 : calculatedGrossCostPerSqM;

  const profitAmount = hasManualPrice
    ? Math.max(0, Math.round((grandTotal - subTotalCost - safeManualExtraCost) * 100) / 100)
    : calculatedProfitAmount;

  const baseCostPerSqM = hasManualPrice
    ? grossCostPerSqM
    : (includeProfitOwner === 'yes' ? grossCostPerSqM : netCostPerSqM);

  const netUsdPerSqM = usdRate > 0 ? Math.round((netCostPerSqM / usdRate) * 100) / 100 : 0;
  const grossUsdPerSqM = usdRate > 0 ? Math.round((grossCostPerSqM / usdRate) * 100) / 100 : 0;

  const s1 = stage1Pay / 100;
  const s2 = stage2Pay / 100;
  const s3 = stage3Pay / 100;
  const s4 = stage4Pay / 100;
  const s5 = stage5Pay / 100;

  const contractorFlatsCount =
    projectModel === 'contractorShare' ? effectiveFlatCount * (contractorShareRate / 100) : 0;
  const ownerFlatsCount = effectiveFlatCount - contractorFlatsCount;

  const synchronizedFlats = synchronizeFlats(
    flats,
    effectiveFlatCount,
    baseBuildArea,
    floorCount,
    transformationStatus,
    roofType,
    flatsPerFloor,
    params.mansardFlatCount,
    roofAtticArea,
    params.hasGroundFloorShop,
    params.shopCount || 1
  );

  // Şerefiye (Kat/Konum/Yön Çarpanı) Normalizasyon Hesabı:
  const enableSerefiye = params.enableSerefiye || false;
  const enableLandShare = params.enableLandShareBalancing || false;

  const totalFlatsArea = synchronizedFlats.reduce((acc, f) => acc + (f.area || 0), 0) || 1;
  const totalWeightedFlatsArea = synchronizedFlats.reduce(
    (acc, f) => acc + (f.area || 0) * (f.serefiyeMultiplier !== undefined ? f.serefiyeMultiplier : 1.0),
    0
  ) || 1;
  const serefiyeNormFactor = enableSerefiye ? totalFlatsArea / totalWeightedFlatsArea : 1.0;

  // Arsa Payı Toplam Havuzu:
  const totalProjectValue = totalFlatsArea * baseCostPerSqM;

  // Pre-calculate owner flats count to distribute equal share of manual equal extra cost
  let ownerFlatsCountActual = 0;
  synchronizedFlats.forEach((flat, idx) => {
    let isContractor = false;
    if (projectModel === 'contractorShare') {
      if (flat.isContractorShare !== undefined) {
        isContractor = flat.isContractorShare;
      } else if (params.contractorFlatIds && params.contractorFlatIds.length > 0) {
        isContractor = params.contractorFlatIds.includes(flat.id);
      } else {
        isContractor = idx + 1 > ownerFlatsCount;
      }
    }
    if (!isContractor) {
      ownerFlatsCountActual++;
    }
  });

  const equalShareCost = ownerFlatsCountActual > 0 ? safeManualExtraCost / ownerFlatsCountActual : 0;

  const flatResults: FlatCalcResult[] = [];
  const totalStageIncomes = [0, 0, 0, 0, 0];

  synchronizedFlats.forEach((flat, idx) => {
    // Determine whether this flat is designated for the contractor
    let isContractor = false;
    if (projectModel === 'contractorShare') {
      if (flat.isContractorShare !== undefined) {
        isContractor = flat.isContractorShare;
      } else if (params.contractorFlatIds && params.contractorFlatIds.length > 0) {
        isContractor = params.contractorFlatIds.includes(flat.id);
      } else {
        isContractor = idx + 1 > ownerFlatsCount;
      }
    }

    const isOwner = !isContractor;

    // Şerefiye ile düzeltilmiş birim maliyet & brüt maliyet
    const mult = flat.serefiyeMultiplier !== undefined ? flat.serefiyeMultiplier : 1.0;
    
    // Bağımsız bölüm tipine göre birim maliyet seçimi (Eğer manuel fiyat girilmişse)
    let unitBaseCost = baseCostPerSqM;
    if (hasManualPrice) {
      unitBaseCost = flat.flatType === 'shop' ? finalShopPrice : finalFlatPrice;
    }

    const effectiveUnitPrice = enableSerefiye
      ? unitBaseCost * mult * serefiyeNormFactor
      : unitBaseCost;
    const baseGrossPay = flat.area * effectiveUnitPrice;
    const grossPay = baseGrossPay + (isOwner ? equalShareCost : 0);
    const serefiyeAdjustedCost = grossPay;

    // Arsa Payı Oranı ve Mahsuplaşma Farkı Hesabı
    const num = flat.landShareNumerator !== undefined ? flat.landShareNumerator : Math.round(flat.area * 10);
    const den = flat.landShareDenominator !== undefined ? flat.landShareDenominator : (params.totalLandShareDenominator || 1000);
    const landShareRatio = den > 0 ? (num / den) * 100 : 0;
    const ownerLandValueEntitlement = (num / (den || 1)) * totalProjectValue;
    const landShareDifference = enableLandShare ? baseGrossPay - ownerLandValueEntitlement : 0;

    const paid = flat.downPayment || 0;
    
    // In contractorShare model, owners don't pay base grossPay, they only pay the equalShareCost
    const baseDebtToPay = (projectModel === 'contractorShare' && isOwner)
      ? equalShareCost
      : isContractor
      ? 0
      : grossPay;

    const remainingAfterDown = Math.max(0, baseDebtToPay - paid);

    let usedCredit = 0;
    if (flat.useTransformationCredit && !isContractor && (projectModel !== 'contractorShare' || isOwner)) {
      if (transformationStatus === 'currentSupport') {
        usedCredit = Math.min(remainingAfterDown, 1750000);
      } else if (transformationStatus === 'futureSupport2027') {
        usedCredit = Math.min(remainingAfterDown, 3000000);
      }
    }

    const netRemainingDebt = isContractor
      ? 0
      : Math.max(0, remainingAfterDown - usedCredit);

    const p1 = Math.round(netRemainingDebt * s1 * 100) / 100;
    const p2 = Math.round(netRemainingDebt * s2 * 100) / 100;
    const p3 = Math.round(netRemainingDebt * s3 * 100) / 100;
    const p4 = Math.round(netRemainingDebt * s4 * 100) / 100;
    const p5 = Math.round(netRemainingDebt * s5 * 100) / 100;

    const effectiveInstallmentCount = Math.max(1, installmentCount || 12);
    const monthlyInstallment = Math.round((netRemainingDebt / effectiveInstallmentCount) * 100) / 100;

    totalStageIncomes[0] += p1 + paid / 5;
    totalStageIncomes[1] += p2;
    totalStageIncomes[2] += p3;
    totalStageIncomes[3] += p4;
    totalStageIncomes[4] += p5;

    flatResults.push({
      id: flat.id,
      name: isContractor && (!flat.name || flat.name.startsWith('Daire Sahibi'))
        ? `Müteahhit Payı (Daire ${flat.id})`
        : flat.name,
      tc: isContractor ? '-' : flat.tc,
      area: flat.area,
      grossPay: Math.round(grossPay * 100) / 100,
      downPayment: paid,
      usedCredit,
      netRemainingDebt: Math.round(netRemainingDebt * 100) / 100,
      isContractorShare: isContractor,
      flatType: flat.flatType || 'standard',
      description: flat.description,
      floorNumber: flat.floorNumber,
      facade: flat.facade,
      serefiyeMultiplier: flat.serefiyeMultiplier,
      serefiyeAdjustedCost: Math.round(serefiyeAdjustedCost * 100) / 100,
      landShareNumerator: num,
      landShareDenominator: den,
      landShareRatio: Math.round(landShareRatio * 100) / 100,
      landShareDifference: Math.round(landShareDifference * 100) / 100,
      stagePayments: [p1, p2, p3, p4, p5],
      monthlyInstallment,
    });
  });

  const totalMonthlyInstallments = flatResults
    .filter((f) => !f.isContractorShare)
    .reduce((sum, f) => sum + f.monthlyInstallment, 0);

  const stagesMeta = [
    { name: '1. Aşama: Sözleşme İmzası / Peşinat', matMult: 0.1, labMult: 0.05 },
    { name: '2. Aşama: Subasman / Temel Seviyesi', matMult: 0.25, labMult: 0.2 },
    { name: '3. Aşama: Kaba İnşaat Bitimi (Betonarme)', matMult: 0.35, labMult: 0.35 },
    { name: '4. Aşama: İnce İnşaat & Tesisatlar (Banka Hakedişi)', matMult: 0.2, labMult: 0.3 },
    { name: '5. Aşama: İskân & Anahtar Teslim', matMult: 0.1, labMult: 0.1 },
  ];

  let cumulativeBalance = 0;
  const cashFlowRows: CashFlowRow[] = stagesMeta.map((st, i) => {
    const income = totalStageIncomes[i];
    const supplierExp = totalMaterialCost * st.matMult;
    const laborExp = totalLaborCost * st.labMult;
    const totalExp = supplierExp + laborExp;
    const periodBalance = income - totalExp;
    cumulativeBalance += periodBalance;

    return {
      stageNumber: i + 1,
      name: st.name,
      income,
      expense: totalExp,
      periodBalance,
      cumulativeBalance,
    };
  });

  return {
    totalArea,
    baseArea: baseBuildArea,
    flatCount: effectiveFlatCount,
    normalFlats: normalFloorFlats,
    extraMansardFlats,
    roofAtticArea,
    isMansardIndependent: isMansard,
    isDuplexUnified: isDuplex,
    autoDurationMonths,
    finalMonths,
    totalDays,
    kabaDaysTotal,
    inceDaysTotal,
    paymentPlanType,
    installmentCount: Math.max(1, installmentCount || 12),
    totalMonthlyInstallments: Math.round(totalMonthlyInstallments * 100) / 100,
    officialCost,
    sgkSalesCost,
    kabaTotalCost,
    systemsCost,
    finishingTotalCost,
    subTotalCost,
    profitAmount,
    grandTotal,
    netCostPerSqM,
    grossCostPerSqM,
    netUsdPerSqM,
    grossUsdPerSqM,
    baseCostPerSqM,
    concreteM3,
    steelTon,
    brickM2,
    formworkM2,
    excavationM3,
    kabaLaborCost,
    kabaMaterialCost,
    fineLaborCost,
    fineMaterialCost,
    systemsLaborCost,
    systemsMaterialCost,
    officialLaborCost,
    officialMaterialCost,
    totalLaborCost,
    totalMaterialCost,
    cashFlowRows,
    flatResults,
    calculatedAt: new Date().toLocaleDateString('tr-TR'),
  };
}
