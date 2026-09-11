import { ProjectParams, CalculationResult, FlatCalcResult, CashFlowRow, FlatItem } from '../types';
import { calculateNetDebt } from './debtUtils';
import { DEFAULT_CUSTOM_FACADES_4, calculateFootprint, FootprintCalculationResult } from './footprintUtils';

export interface FacadeCantileverDetail {
  index: number;
  name: string;
  length: number;
  isAdjacent: boolean;
  isBlind: boolean;
  cantileverDepth: number;
  addedArea: number;
}

export interface CantileverCalculationResult {
  upperFloorArea: number;
  singleFloorDiff: number;
  facades: FacadeCantileverDetail[];
  totalCantileverArea: number;
}

/**
 * Dinamik Konsol Çıkma ve Kat Alanı Hesaplayıcı
 * L-Tipi (6 cephe), U-Tipi (8 cephe), Çokgen (N cephe) ve 4 cepheli yapılarda
 * bitişik nizam ve kör cephe kurallarını (İmar Mevzuatı Md. 41) dikkate alarak
 * her cephenin konsol çıkmasını ve 1. kattan itibaren oluşan kat alanını hesaplar.
 */
export function calculateCantileverDetails(
  params: Partial<ProjectParams>,
  activeBaseArea?: number,
  footprintCalc?: FootprintCalculationResult
): CantileverCalculationResult {
  const calc = footprintCalc || calculateFootprint(params.footprintInputMode, params as ProjectParams);
  const baseArea = activeBaseArea !== undefined && activeBaseArea > 0 ? activeBaseArea : (calc.area || 100);

  const sides = (calc.sidesList && calc.sidesList.length > 0) ? calc.sidesList : [
    { name: '1. Ön Cephe', length: calc.effectiveWidth || 14 },
    { name: '2. Sağ Yan Cephe', length: calc.effectiveDepth || 18 },
    { name: '3. Arka Cephe', length: calc.effectiveWidth || 14 },
    { name: '4. Sol Yan Cephe', length: calc.effectiveDepth || 18 },
  ];

  const totalSides = sides.length;
  const hasCantilever = !!params.hasCantilever;
  const defaultDepth = params.cantileverDepth || 1.2;
  const direction = params.cantileverDirection || 'front_back';

  const facadeDetails: FacadeCantileverDetail[] = sides.map((side, idx) => {
    const cfg = params.facadeConfigs?.[idx];
    const isAdjacent = !!(cfg && (cfg.isAdjacent === true || cfg.isBlankWall === true || (cfg as any).isBlind === true));
    const isZeroWindowBlind = !!(cfg && cfg.windowCountPerFloor === 0);
    const isBlind = isAdjacent || isZeroWindowBlind;
    const len = side.length || cfg?.length || 10;

    let depth = 0;
    if (hasCantilever && !isBlind && defaultDepth > 0) {
      if (params.facadeCantilevers && params.facadeCantilevers[idx] !== undefined) {
        depth = Math.max(0, params.facadeCantilevers[idx]);
      } else if (direction === 'all' || direction === 'open_facades') {
        depth = defaultDepth;
      } else if (direction === 'front') {
        const isEntrance = idx === (params.mainEntranceFacadeIndex || 0) || !!cfg?.isEntrance || idx === 0;
        depth = isEntrance ? defaultDepth : 0;
      } else if (direction === 'front_back') {
        const isEntrance = idx === (params.mainEntranceFacadeIndex || 0) || !!cfg?.isEntrance || idx === 0;
        const isBack = totalSides === 4
          ? idx === 2
          : (idx === Math.floor(totalSides / 2) || (side.name && side.name.toLowerCase().includes('arka')));
        depth = (isEntrance || isBack) ? defaultDepth : 0;
      } else if (direction === 'custom') {
        depth = cfg?.cantileverDepth !== undefined ? cfg.cantileverDepth : 0;
      }
    }

    const addedArea = Math.round(len * depth * 100) / 100;
    return {
      index: idx,
      name: cfg?.name || side.name,
      length: len,
      isAdjacent,
      isBlind,
      cantileverDepth: depth,
      addedArea,
    };
  });

  let singleFloorDiff = 0;
  if (hasCantilever) {
    if (totalSides === 4 && (params.footprintInputMode === 'dimensions' || params.footprintInputMode === 'directArea' || !params.footprintInputMode)) {
      // Classic 4-wall box calculation
      const fC = facadeDetails[0]?.cantileverDepth || 0;
      const rC = facadeDetails[1]?.cantileverDepth || 0;
      const bC = facadeDetails[2]?.cantileverDepth || 0;
      const lC = facadeDetails[3]?.cantileverDepth || 0;
      const w = calc.effectiveWidth || 10;
      const d = calc.effectiveDepth || 10;
      const boxArea = (w + lC + rC) * (d + fC + bC);
      singleFloorDiff = Math.max(0, Math.round((boxArea - (w * d)) * 100) / 100);
    } else {
      // Polygon, L-Shape (6 facades), U-Shape (8 facades)
      const stripsArea = facadeDetails.reduce((sum, f) => sum + f.addedArea, 0);
      let cornerBonus = 0;
      for (let i = 0; i < totalSides; i++) {
        const nextIdx = (i + 1) % totalSides;
        // Skip concave inner corners for L-shape (inner notch)
        const isInnerNotch = totalSides === 6 && (i === 2 || i === 3);
        if (!isInnerNotch && facadeDetails[i].cantileverDepth > 0 && facadeDetails[nextIdx].cantileverDepth > 0) {
          cornerBonus += facadeDetails[i].cantileverDepth * facadeDetails[nextIdx].cantileverDepth;
        }
      }
      singleFloorDiff = Math.round((stripsArea + cornerBonus) * 100) / 100;
    }
  }

  const upperFloorArea = Math.round((baseArea + singleFloorDiff) * 100) / 100;
  const upperFloorsCount = Math.max(0, (params.floorCount || 5) - 1);
  const totalCantileverArea = Math.round(singleFloorDiff * upperFloorsCount * 100) / 100;

  return {
    upperFloorArea,
    singleFloorDiff,
    facades: facadeDetails,
    totalCantileverArea,
  };
}

export const DEFAULT_PARAMS: ProjectParams = {
  projectName: 'Müşteri / Proje Adı Belirtilmedi',
  projectType: 'kentsel',
  basementPurpose: 'shelter_depot',
  roofAtticType: 'duplex_unified',
  projectAddress: 'İstanbul, Fatih Kocamustafapaşa Mah. 1024 Ada 15 Parsel',
  landArea: 350,
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
  profitRate: 0,

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
    { id: 1, name: 'Kat Maliki 1', tc: '10000000001', area: 50, downPayment: 0, useTransformationCredit: true, useGrant: true, useCredit: false },
    { id: 2, name: 'Kat Maliki 2', tc: '10000000002', area: 50, downPayment: 0, useTransformationCredit: true, useGrant: true, useCredit: false },
    { id: 3, name: 'Kat Maliki 3', tc: '10000000003', area: 50, downPayment: 0, useTransformationCredit: true, useGrant: true, useCredit: false },
    { id: 4, name: 'Kat Maliki 4', tc: '10000000004', area: 50, downPayment: 0, useTransformationCredit: true, useGrant: true, useCredit: false },
    { id: 5, name: 'Kat Maliki 5', tc: '10000000005', area: 50, downPayment: 0, useTransformationCredit: true, useGrant: true, useCredit: false },
    { id: 6, name: 'Kat Maliki 6', tc: '10000000006', area: 50, downPayment: 0, useTransformationCredit: true, useGrant: true, useCredit: false },
    { id: 7, name: 'Kat Maliki 7', tc: '10000000007', area: 50, downPayment: 0, useTransformationCredit: true, useGrant: true, useCredit: false },
    { id: 8, name: 'Kat Maliki 8', tc: '10000000008', area: 50, downPayment: 0, useTransformationCredit: true, useGrant: true, useCredit: false },
    { id: 9, name: 'Kat Maliki 9', tc: '10000000009', area: 50, downPayment: 0, useTransformationCredit: true, useGrant: true, useCredit: false },
    { id: 10, name: 'Kat Maliki 10', tc: '10000000010', area: 50, downPayment: 0, useTransformationCredit: true, useGrant: true, useCredit: false },
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
    useGrant: transStatus !== 'none',
    useCredit: false,
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
  shopCount: number = 1,
  upperFloorArea?: number,
  basementPurpose?: string,
  basementShopCount: number = 1,
  basementCount: number = 1
): FlatItem[] {
  const hasBasementCommercial = basementPurpose === 'commercial_shop' && (basementCount || 0) > 0;
  const activeBasementShopCount = hasBasementCommercial ? Math.max(1, basementShopCount || 1) : 0;
  const activeShopCount = hasGroundFloorShop ? Math.max(1, shopCount || 1) : 0;
  const resFloors = hasGroundFloorShop ? Math.max(1, floorCount - 1) : floorCount;
  const isMansard = roofType === 'mansard';
  const isDuplex = roofType === 'duplex';
  
  // Mansart çatı kuralı: Mansart SADECE en üst katta (çatı katında) yer alır.
  // Mansart seçildiğinde en üst katta mansardFlatCount veya flatsPerFloor kadar bağımsız bölüm oluşur.
  const extraMansardFlats = isMansard
    ? (mansardFlatCount && mansardFlatCount > 0 ? mansardFlatCount : Math.max(1, flatsPerFloor))
    : 0;

  const standardResidentialUnits = resFloors * flatsPerFloor;
  const calculatedTotalUnits = activeBasementShopCount + standardResidentialUnits + activeShopCount + extraMansardFlats;
  const newCount = Math.max(1, flatCount || calculatedTotalUnits);

  const effectiveUpperFloorArea = (upperFloorArea && upperFloorArea > 0) ? upperFloorArea : baseBuildArea;

  // Dükkan başına alanlar
  const basementShopAvg = activeBasementShopCount > 0 ? parseFloat((baseBuildArea / activeBasementShopCount).toFixed(2)) : 0;
  const shopAvg = activeShopCount > 0 ? parseFloat((baseBuildArea / activeShopCount).toFixed(2)) : 0;

  // Kural: 1 katta N daire varsa (örn. 4 daire), aksi belirtilmemişse o katın alanı eşit olarak kattaki daire sayısına bölünerek bulunur
  const normalFloorFlatAvg = parseFloat((effectiveUpperFloorArea / Math.max(1, flatsPerFloor)).toFixed(2));
  const groundFloorResFlatAvg = parseFloat((baseBuildArea / Math.max(1, flatsPerFloor)).toFixed(2));

  // Mansart bağımsız bölüm alanı: Sadece en üst kattaki çatı piyesi inşaat alanının mansart daire sayısına eşit bölünmesiyle bulunur
  const mansardAvg = extraMansardFlats > 0
    ? (roofAtticArea > 0
        ? parseFloat((roofAtticArea / extraMansardFlats).toFixed(2))
        : parseFloat(((effectiveUpperFloorArea * 0.70) / extraMansardFlats).toFixed(2)))
    : 0;

  // Dubleks için son kattaki dairelere eklenen çatı teras alanı
  const duplexCount = Math.min(Math.max(1, flatsPerFloor), standardResidentialUnits);
  const duplexAddArea = isDuplex && roofAtticArea > 0
    ? parseFloat((roofAtticArea / duplexCount).toFixed(2))
    : 0;

  return Array.from({ length: newCount }, (_, i) => {
    const existing = flats[i];
    // Daire numaralandırması en alt kattan (No 1) başlar, en üst kata ve mansarta doğru artar
    const isBasementShopFlat = activeBasementShopCount > 0 && i < activeBasementShopCount;
    const groundShopIndex = i - activeBasementShopCount;
    const isShopFlat = activeShopCount > 0 && groundShopIndex >= 0 && groundShopIndex < activeShopCount;
    const isMansardFlat = isMansard && i >= newCount - extraMansardFlats;
    const residentialIdx = i - activeBasementShopCount - activeShopCount;
    const isDuplexFlat = isDuplex && !isBasementShopFlat && !isShopFlat && !isMansardFlat && residentialIdx >= standardResidentialUnits - duplexCount;

    let flatType: FlatItem['flatType'] = 'standard';
    let description: string | undefined;
    let calculatedFloor = 1;
    let defaultSerefiye = 1.0;
    let defaultName = `Kat Maliki ${i + 1}`;
    let defaultArea = normalFloorFlatAvg;

    if (isBasementShopFlat) {
      flatType = 'shop';
      defaultArea = basementShopAvg;
      calculatedFloor = -1; // Bodrum Kat
      defaultSerefiye = 1.15;
      defaultName = activeBasementShopCount === 1 ? 'Bodrum Kat İşyeri' : `Bodrum İşyeri ${i + 1}`;
      description = '1. Bodrum Kat Ticari Bağımsız Bölüm (İşyeri/Dükkan)';
    } else if (isShopFlat) {
      flatType = 'shop';
      defaultArea = shopAvg;
      calculatedFloor = 0; // Zemin Kat
      defaultSerefiye = 1.25;
      defaultName = activeShopCount === 1 ? 'Zemin Dükkan' : `Dükkan ${groundShopIndex + 1} (Zemin Kat)`;
      description = 'Zemin Kat Ticari Bağımsız Bölüm (Dükkan/İşyeri)';
    } else if (isMansardFlat) {
      flatType = 'mansard';
      defaultArea = mansardAvg;
      calculatedFloor = floorCount; // KURAL: Mansart sadece en üst katta olur
      defaultSerefiye = 1.08;
      defaultName = `Kat Maliki ${i + 1} (Çatı Mansart)`;
      description = `En Üst Kat (${floorCount}. Kat) Mansart - Ayrı Bağımsız Bölüm`;
    } else if (isDuplexFlat) {
      flatType = 'duplex';
      defaultArea = parseFloat((normalFloorFlatAvg + duplexAddArea).toFixed(2));
      calculatedFloor = floorCount; // Son kat dubleksi
      defaultSerefiye = 1.18;
      defaultName = `Kat Maliki ${i + 1} (Çatı Dubleksi)`;
      description = `Son Kat (${floorCount}. Kat) Çatı Dubleksi - Tek Bağımsız Bölüm`;
    } else {
      flatType = 'standard';
      // Katta daire sayısına göre kat indeksi (en alt kattan en üst kata doğru)
      const resFloorOffset = Math.floor(Math.max(0, residentialIdx) / Math.max(1, flatsPerFloor));
      calculatedFloor = 1 + resFloorOffset;
      
      // 1. Kat (zemin üstü veya zemin konut) ve üst kat alan hesabı:
      defaultArea = (!hasGroundFloorShop && calculatedFloor === 1) ? groundFloorResFlatAvg : normalFloorFlatAvg;
      defaultName = (activeShopCount > 0 || activeBasementShopCount > 0)
        ? `Kat Maliki ${i + 1} (Daire ${residentialIdx + 1})`
        : `Kat Maliki ${i + 1}`;
      description = `${calculatedFloor}. Kat Konut (Daire)`;

      if (calculatedFloor === 1) defaultSerefiye = 0.98;
      else if (calculatedFloor >= floorCount - 1) defaultSerefiye = 1.10;
      else defaultSerefiye = 1.02;
    }

    if (existing) {
      const mergedFlatType = (isBasementShopFlat || isShopFlat) ? 'shop' : (existing.flatType === 'shop' ? 'standard' : (existing.flatType || flatType));
      
      let mergedFloor = calculatedFloor;
      if (mergedFlatType === 'mansard') {
        mergedFloor = floorCount;
      } else if (mergedFlatType === 'shop') {
        mergedFloor = isBasementShopFlat ? -1 : 0;
      } else if (existing.floorNumber !== undefined) {
        mergedFloor = existing.floorNumber;
      }

      const mergedArea = existing.area !== undefined && existing.area > 0 && !((isBasementShopFlat || isShopFlat) && existing.flatType !== 'shop') 
        ? existing.area 
        : defaultArea;

      let mergedName = existing.name;
      if (!mergedName || mergedName.startsWith('Kat Maliki') || mergedName.startsWith('Dükkan') || mergedName.startsWith('Zemin Dükkan') || mergedName.startsWith('Bodrum')) {
        mergedName = defaultName;
      }

      return {
        ...existing,
        id: i + 1,
        area: mergedArea,
        flatType: mergedFlatType,
        description: existing.description !== undefined ? existing.description : description,
        floorNumber: mergedFloor,
        facade: existing.facade || (i % 2 === 0 ? 'guney' : 'kuzey'),
        serefiyeMultiplier: existing.serefiyeMultiplier !== undefined ? existing.serefiyeMultiplier : defaultSerefiye,
        landShareNumerator: existing.landShareNumerator !== undefined ? existing.landShareNumerator : Math.round(mergedArea * 10),
        landShareDenominator: existing.landShareDenominator !== undefined ? existing.landShareDenominator : 1000,
        name: mergedName,
      };
    }

    return {
      id: i + 1,
      name: defaultName,
      tc: `1000000000${i + 1}`,
      area: defaultArea,
      downPayment: 0,
      useTransformationCredit: transStatus !== 'none',
      useGrant: transStatus !== 'none',
      useCredit: false,
      flatType,
      description,
      floorNumber: calculatedFloor,
      facade: i % 2 === 0 ? 'guney' : 'kuzey',
      serefiyeMultiplier: defaultSerefiye,
      landShareNumerator: Math.round(defaultArea * 10),
      landShareDenominator: 1000,
    };
  });
}

export function calculateFlatCount(params: ProjectParams): number {
  const floorCount = Math.max(1, params.floorCount || 5);
  const flatsPerFloor = Math.max(1, params.flatsPerFloor || 2);
  const hasShop = !!params.hasGroundFloorShop;
  const shopCount = hasShop ? Math.max(1, params.shopCount || 1) : 0;

  const basementFloorsCount = Math.max(0, params.basementCount !== undefined && !isNaN(params.basementCount) ? params.basementCount : 1);
  const hasBasementCommercial = params.basementPurpose === 'commercial_shop' && basementFloorsCount > 0;
  const basementShopCount = hasBasementCommercial ? Math.max(1, params.basementShopCount || 1) : 0;

  const isMansard = params.roofType === 'mansard';
  const resFloors = hasShop ? Math.max(0, floorCount - 1) : floorCount;
  const normalFloorFlats = resFloors * flatsPerFloor;
  const extraMansardFlats = isMansard
    ? (params.mansardFlatCount && params.mansardFlatCount > 0 ? params.mansardFlatCount : Math.max(1, flatsPerFloor))
    : 0;

  const totalCalculatedUnits = normalFloorFlats + shopCount + basementShopCount + extraMansardFlats;
  return totalCalculatedUnits;
}

export function calculateProject(params: ProjectParams): CalculationResult {
  const {
    baseBuildArea,
    floorCount,
    flatCount,
    buildingType,
    costMultiplier,
    usdRate,
    profitRate = 0,
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
  // KURAL: Tabla çıkması KÖR CEPHELERDE / BİTİŞİK NİZAMDA (komşu parsel sınırı) kesinlikle yapılamaz!
  const cantileverInfo = calculateCantileverDetails(params, activeBaseArea, footprintCalc);
  const upperFloorArea = cantileverInfo.upperFloorArea;
  const upperFloorsCount = Math.max(0, floorCount - 1);

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
  // KURAL: Zemin dükkan, normal konutlar ve çatı/mansart bağımsız bölümlerinin tamamı eksiksiz toplanır.
  const flatsPerFloor = Math.max(1, params.flatsPerFloor || 2);
  const hasShop = !!params.hasGroundFloorShop;
  const shopCount = hasShop ? Math.max(1, params.shopCount || 1) : 0;
  const resFloors = hasShop ? Math.max(0, floorCount - 1) : floorCount;
  const normalFloorFlats = resFloors * flatsPerFloor;
  const extraMansardFlats = isMansard
    ? (params.mansardFlatCount && params.mansardFlatCount > 0 ? params.mansardFlatCount : Math.max(1, flatsPerFloor))
    : 0;
  const effectiveFlatCount = calculateFlatCount(params);

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

  const hasBasementCommercial = params.basementPurpose === 'commercial_shop' && basementFloorsCount > 0;
  const activeBasementShopCount = hasBasementCommercial ? Math.max(1, params.basementShopCount || 1) : 0;
  const basementShopTotalArea = activeBasementShopCount > 0 ? activeBaseArea : 0;
  const groundShopTotalArea = params.hasGroundFloorShop ? activeBaseArea : 0;
  const shopArea = groundShopTotalArea + basementShopTotalArea;
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
    activeBaseArea,
    floorCount,
    transformationStatus,
    roofType,
    flatsPerFloor,
    params.mansardFlatCount,
    roofAtticArea,
    params.hasGroundFloorShop,
    params.shopCount || 1,
    upperFloorArea,
    params.basementPurpose,
    params.basementShopCount || 1,
    basementFloorsCount
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

  const duplexCount = Math.min(Math.max(1, flatsPerFloor), effectiveFlatCount);
  const duplexAddArea = isDuplex && roofAtticArea > 0
    ? parseFloat((roofAtticArea / duplexCount).toFixed(2))
    : 0;

  const flatResults: FlatCalcResult[] = [];
  const totalStageIncomes = [0, 0, 0, 0, 0];

  synchronizedFlats.forEach((flat, idx) => {
    // Determine whether this flat is designated for the contractor
    let isContractor = false;
    if (flat.isContractorShare !== undefined) {
      isContractor = flat.isContractorShare;
    } else if (params.contractorFlatIds && params.contractorFlatIds.length > 0) {
      isContractor = params.contractorFlatIds.includes(flat.id);
    } else if (projectModel === 'contractorShare') {
      isContractor = idx + 1 > ownerFlatsCount;
    }

    const isOwner = !isContractor;

    // Bağımsız bölüm tipine göre m² birim maliyet seçimi
    // Senaryo 1 & 2: Kullanıcı müteahhit teklif birim fiyatını genel olarak (örn: 42.000 TL) 
    // veya müteahhite kalan daireler/özelleştirme nedeniyle (örn: daireler için 32.000 TL, dükkanlar için 30.000 TL) belirleyebilir
    let unitBaseCost = baseCostPerSqM;
    if (hasManualPrice) {
      unitBaseCost = flat.flatType === 'shop' ? finalShopPrice : finalFlatPrice;
    } else if (params.manualFlatUnitPrice && params.manualFlatUnitPrice > 0 && flat.flatType !== 'shop') {
      unitBaseCost = params.manualFlatUnitPrice;
    } else if (params.manualShopUnitPrice && params.manualShopUnitPrice > 0 && flat.flatType === 'shop') {
      unitBaseCost = params.manualShopUnitPrice;
    }

    // Şerefiye ile düzeltilmiş birim maliyet & brüt maliyet
    const mult = flat.serefiyeMultiplier !== undefined ? flat.serefiyeMultiplier : 1.0;
    const effectiveUnitPrice = enableSerefiye
      ? Math.round(unitBaseCost * mult * serefiyeNormFactor * 100) / 100
      : unitBaseCost;

    // Merkezi Borç Hesaplama Fonksiyonu Kullanımı
    const isShop = flat.flatType === 'shop';
    const defaultGrant = isShop ? 350000 : (transformationStatus === 'futureSupport2027' ? 1000000 : 700000);
    const grantLimit = isShop
      ? (params.shopGrantAmountPerFlat !== undefined ? params.shopGrantAmountPerFlat : 350000)
      : (params.grantAmountPerFlat !== undefined ? params.grantAmountPerFlat : defaultGrant);

    const defaultCredit = isShop ? 350000 : (transformationStatus === 'futureSupport2027' ? 1500000 : 700000);
    const creditLimit = isShop
      ? (params.shopCreditAmountPerFlat !== undefined ? params.shopCreditAmountPerFlat : 350000)
      : (params.creditAmountPerFlat !== undefined ? params.creditAmountPerFlat : defaultCredit);

    const isGrantActive = !isContractor && (flat.useGrant !== undefined ? flat.useGrant : (flat.useTransformationCredit ?? false));
    const isCreditActive = !isContractor && !!flat.useCredit;

    const debtCalc = calculateNetDebt({
      area: flat.area,
      unitPrice: effectiveUnitPrice,
      downPayment: flat.downPayment || 0,
      grant: isGrantActive ? grantLimit : 0,
      credit: isCreditActive ? creditLimit : 0,
      isContractorShare: isContractor,
      extraCosts: isOwner ? equalShareCost : 0
    });

    const { grossPay, netRemainingDebt, usedGrant, usedCredit, usedDownPayment } = debtCalc;
    const paid = usedDownPayment; // debtCalc içinde hesaplanan kullanılan peşinat
    const contractorShareDeduction = isContractor ? grossPay : 0;
    const serefiyeAdjustedCost = grossPay;

    // Arsa Payı Oranı ve Mahsuplaşma Farkı Hesabı
    const num = flat.landShareNumerator !== undefined ? flat.landShareNumerator : Math.round(flat.area * 10);
    const den = flat.landShareDenominator !== undefined ? flat.landShareDenominator : (params.totalLandShareDenominator || 1000);
    const landShareRatio = den > 0 ? (num / den) * 100 : 0;
    const baseGrossPay = Math.round(flat.area * effectiveUnitPrice);
    const totalLandShareNumerators = synchronizedFlats.reduce((sum, f) => sum + (f.landShareNumerator !== undefined ? f.landShareNumerator : Math.round(f.area * 10)), 0) || (den || 1);
    const ownerNormalizedRatio = totalLandShareNumerators > 0 ? (num / totalLandShareNumerators) : 0;
    const ownerLandValueEntitlement = ownerNormalizedRatio * totalProjectValue;
    const landShareDifference = enableLandShare ? Math.round(baseGrossPay - ownerLandValueEntitlement) : 0;

    const totalSupport = usedGrant + usedCredit;

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

    const flatType = flat.flatType || 'standard';
    let floorNumber = flat.floorNumber;
    if (floorNumber === undefined) {
      if (flatType === 'shop') {
        floorNumber = 0;
      } else if (flatType === 'mansard') {
        floorNumber = floorCount;
      } else {
        const resIdx = hasShop ? Math.max(0, idx - shopCount) : idx;
        floorNumber = 1 + Math.floor(resIdx / flatsPerFloor);
      }
    } else if (flatType === 'mansard') {
      floorNumber = floorCount; // Kural: Mansart sadece en üst katta olur
    }

    // Toplam Ortak Alan: Temel zemin altı bodrum + kat sahanlıkları
    const totalBasementArea = (params.basementCount !== undefined ? params.basementCount : 1) * activeBaseArea;
    const commonCirculationArea = floorCount * 22; // Asansör, merdiven vb. kat başı ortak imalat alanları
    const totalCommonArea = totalBasementArea + commonCirculationArea;

    // Dükkanlar ortak alandan daha az pay alır (Örn: %35 oranında ortak alan payı)
    const commonWeights = synchronizedFlats.map(f => {
      if (f.flatType === 'shop') return 0.35;
      return 1.0;
    });
    const totalCommonWeight = commonWeights.reduce((sum, w) => sum + w, 0) || 1;
    const commonAreaShare = Math.round((totalCommonArea * commonWeights[idx] / totalCommonWeight) * 100) / 100;

    // Çıkma Payı Alanı: Üst katlarda konsol/tabla çıkması varsa bağımsız bölüme katılan çıkma m²'si
    const floorCantileverTotal = upperFloorArea - activeBaseArea;
    const cantileverAreaShare = (floorNumber > 0 && floorCantileverTotal > 0)
      ? Math.round((floorCantileverTotal / (params.flatsPerFloor || 2)) * 100) / 100
      : 0;

    // Balkon Alanı Hesaplama
    let balconyAreaShare = 0;
    if (flatType === 'shop') {
      balconyAreaShare = 0;
    } else if (flatType === 'mansard') {
      balconyAreaShare = Math.round(flat.area * 0.12 * 100) / 100;
    } else if (flatType === 'duplex') {
      const lowerBalcony = Math.round((flat.area - duplexAddArea) * 0.08 * 100) / 100;
      const roofTerrace = Math.round(duplexAddArea * 0.25 * 100) / 100;
      balconyAreaShare = Math.round((lowerBalcony + roofTerrace) * 100) / 100;
    } else {
      if (floorNumber === 0) {
        balconyAreaShare = Math.round(flat.area * 0.04 * 100) / 100;
      } else {
        balconyAreaShare = Math.round(flat.area * 0.08 * 100) / 100;
      }
    }

    // Bağımsız Bölüm Brüt Alanı (Balkonlar dahil)
    const grossArea = Math.round((flat.area + balconyAreaShare) * 100) / 100;

    // Toplam Brüt Alan (Bağımsız Bölüm Brüt + Ortak Alan Payı)
    const totalGrossArea = Math.round((grossArea + commonAreaShare) * 100) / 100;

    // Bağımsız Bölüm Net Alanı (Net usable space)
    let netArea = 0;
    if (flatType === 'shop') {
      netArea = Math.round(flat.area * 0.88 * 100) / 100;
    } else if (flatType === 'mansard') {
      netArea = Math.round(flat.area * 0.72 * 100) / 100;
    } else if (flatType === 'duplex') {
      const lowerNet = (flat.area - duplexAddArea) * 0.80;
      const upperNet = duplexAddArea * 0.70;
      netArea = Math.round((lowerNet + upperNet) * 100) / 100;
    } else {
      netArea = Math.round(flat.area * 0.81 * 100) / 100;
    }

    flatResults.push({
      id: flat.id,
      name: isContractor && (!flat.name || flat.name.startsWith('Daire Sahibi'))
        ? `Müteahhit Payı (Daire ${flat.id})`
        : flat.name,
      tc: isContractor ? '-' : flat.tc,
      area: flat.area,
      unitPrice: Math.round(unitBaseCost * 100) / 100,
      effectiveUnitPrice: Math.round(effectiveUnitPrice * 100) / 100,
      grossPay: Math.round(grossPay * 100) / 100,
      contractorShareDeduction: Math.round(contractorShareDeduction * 100) / 100,
      downPayment: paid,
      usedCredit,
      usedGrant,
      grantLimit: grantLimit,
      creditLimit: creditLimit,
      totalSupport,
      netRemainingDebt: Math.round(netRemainingDebt * 100) / 100,
      isContractorShare: isContractor,
      salePrice: flat.salePrice !== undefined ? flat.salePrice : Math.round(flat.area * (flat.flatType === 'shop' ? finalShopPrice : finalFlatPrice) * 1.5 * (flat.serefiyeMultiplier || 1.0)),
      flatType: flat.flatType || 'standard',
      description: flat.description,
      floorNumber: floorNumber,
      facade: flat.facade,
      serefiyeMultiplier: flat.serefiyeMultiplier,
      serefiyeAdjustedCost: Math.round(serefiyeAdjustedCost * 100) / 100,
      landShareNumerator: num,
      landShareDenominator: den,
      landShareRatio: Math.round(landShareRatio * 100) / 100,
      landShareDifference: Math.round(landShareDifference * 100) / 100,
      netArea,
      grossArea,
      totalGrossArea,
      commonAreaShare,
      cantileverAreaShare,
      balconyAreaShare,
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
    baseArea: Math.round(activeBaseArea * 100) / 100,
    flatCount: effectiveFlatCount,
    normalFlats: normalFloorFlats,
    extraMansardFlats,
    roofAtticArea,
    upperFloorArea: Math.round(upperFloorArea * 100) / 100,
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
