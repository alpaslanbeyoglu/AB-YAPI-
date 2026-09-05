import { ProjectParams, CalculationResult, FlatCalcResult, CashFlowRow, FlatItem } from '../types';
import { DEFAULT_CUSTOM_FACADES_4, calculateFootprint } from './footprintUtils';

export const DEFAULT_PARAMS: ProjectParams = {
  projectAddress: 'İstanbul, Fatih Kocamustafapaşa Mah. 1024 Ada 15 Parsel',
  landArea: 250,
  manualUnitPrice: 0,
  durationOption: 'manual',
  manualMonths: 14,
  transformationStatus: 'currentSupport',
  projectModel: 'cash',
  baseBuildArea: 100,
  floorCount: 5,
  flatCount: 5,
  contractorShareRate: 50,
  buildingType: 'standard',
  roomType: '3+1',
  usdRate: 48.24,
  costMultiplier: 2.5,
  profitRate: 25,

  // Taban Oturumu ve Çoklu Cephe Seçenekleri
  footprintInputMode: 'directArea',
  facadeWidth: 14.0,
  facadeDepth: 18.0,
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
  costNotaryContract: 35000,
  costCompany: 45000,
  priceProjectPermit: 550,
  priceSgk: 420,
  costInsurance: 30000,
  costSalesMarketing: 25000,

  // Kaba
  priceConcrete: 3950,
  priceSteel: 36200,
  costKabaWork: 2200,

  // Ince
  costElevator: 320000,
  priceSmartHome: 15000,
  costIntercom: 50000,
  priceGas: 60000,
  pricePlumbing: 70000,
  priceElectric: 55000,
  pricePvc: 4800,
  priceTiles: 850,
  priceKitchen: 125000,
  priceDoors: 80000,
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
    { id: 1, name: 'Kat Maliki 1', tc: '10000000001', area: 100, downPayment: 0, useTransformationCredit: true },
    { id: 2, name: 'Kat Maliki 2', tc: '10000000002', area: 100, downPayment: 0, useTransformationCredit: true },
    { id: 3, name: 'Kat Maliki 3', tc: '10000000003', area: 100, downPayment: 0, useTransformationCredit: true },
    { id: 4, name: 'Kat Maliki 4', tc: '10000000004', area: 100, downPayment: 0, useTransformationCredit: true },
    { id: 5, name: 'Kat Maliki 5', tc: '10000000005', area: 100, downPayment: 0, useTransformationCredit: true },
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
  transStatus: string
): FlatItem[] {
  const newCount = Math.max(1, flatCount);
  const total = baseBuildArea * floorCount;
  const avg = parseFloat((total / newCount).toFixed(2));
  return Array.from({ length: newCount }, (_, i) => {
    const existing = flats[i];
    if (existing) {
      return {
        ...existing,
        id: i + 1,
        area: avg, // Recalculate area to match the current flatCount & building size
      };
    }
    return {
      id: i + 1,
      name: `Kat Maliki ${i + 1}`,
      tc: `1000000000${i + 1}`,
      area: avg,
      downPayment: 0,
      useTransformationCredit: transStatus !== 'none',
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
  const upperFloorsCount = Math.max(0, floorCount - 1);
  let upperFloorArea = activeBaseArea;
  if (hasCantilever && cantileverDepth > 0) {
    if (cantileverDirection === 'all') {
      upperFloorArea = (estW + 2 * cantileverDepth) * (estD + 2 * cantileverDepth);
    } else if (cantileverDirection === 'front') {
      upperFloorArea = estW * (estD + cantileverDepth);
    } else {
      // front_back (standard)
      upperFloorArea = estW * (estD + 2 * cantileverDepth);
    }
    upperFloorArea = Math.round(upperFloorArea * 100) / 100;
  }

  const rawTotalArea = activeBaseArea + upperFloorsCount * upperFloorArea;
  const totalArea = Math.round(Math.max(1, rawTotalArea) * 100) / 100;

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
  const autoDurationMonths = totalDaysAuto / 30;

  let finalMonths = autoDurationMonths;
  let totalDays = totalDaysAuto;

  if (durationOption === 'manual') {
    finalMonths = manualMonths;
    totalDays = manualMonths * 30;
  } else if (durationOption === 'hide') {
    finalMonths = 0;
    totalDays = 0;
  }

  // Cost items
  const officialCost =
    (params.costNotaryContract +
      params.costCompany +
      totalArea * params.priceProjectPermit) *
    costMultiplier;

  const sgkSalesCost =
    (totalArea * params.priceSgk +
      params.costInsurance +
      flatCount * params.costSalesMarketing) *
    costMultiplier;

  const concreteM3 = Math.round(totalArea * 0.45 * 100) / 100;
  const steelTon = Math.round(totalArea * 0.04 * 100) / 100;

  const kabaTotalCost =
    Math.round(
      (concreteM3 * params.priceConcrete +
        steelTon * params.priceSteel +
        totalArea * params.costKabaWork) *
      kabaTypeMult *
      costMultiplier * 100
    ) / 100;

  const systemsCost =
    Math.round(
      (params.costElevator +
        flatCount * params.priceSmartHome +
        params.costIntercom +
        flatCount * params.priceGas) *
      costMultiplier * 100
    ) / 100;

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

  const finishingTotalCost =
    Math.round(
      (flatCount * params.pricePlumbing +
        flatCount * params.priceElectric +
        totalArea * pvcAreaFactor * params.pricePvc +
        totalArea * params.priceTiles +
        flatCount * params.priceKitchen +
        flatCount * params.priceDoors +
        totalArea * paintPlasterAreaFactor * params.pricePaintPlaster) *
      inceTypeMult *
      costMultiplier * 100
    ) / 100;

  const subTotalCost =
    Math.round(
      (officialCost + sgkSalesCost + kabaTotalCost + systemsCost + finishingTotalCost) * 100
    ) / 100;
  const profitAmount = Math.round(subTotalCost * (profitRate / 100) * 100) / 100;
  const grandTotal = Math.round((subTotalCost + profitAmount) * 100) / 100;

  const netCostPerSqM = Math.round((subTotalCost / totalArea) * 100) / 100;
  const calculatedGrossCostPerSqM = Math.round((grandTotal / totalArea) * 100) / 100;
  const grossCostPerSqM = (params.manualUnitPrice && params.manualUnitPrice > 0) 
    ? params.manualUnitPrice 
    : calculatedGrossCostPerSqM;
    
  const baseCostPerSqM =
    includeProfitOwner === 'yes' ? grossCostPerSqM : netCostPerSqM;

  const netUsdPerSqM = usdRate > 0 ? Math.round((netCostPerSqM / usdRate) * 100) / 100 : 0;
  const grossUsdPerSqM = usdRate > 0 ? Math.round((grossCostPerSqM / usdRate) * 100) / 100 : 0;

  const s1 = stage1Pay / 100;
  const s2 = stage2Pay / 100;
  const s3 = stage3Pay / 100;
  const s4 = stage4Pay / 100;
  const s5 = stage5Pay / 100;

  const contractorFlatsCount =
    projectModel === 'contractorShare' ? flatCount * (contractorShareRate / 100) : 0;
  const ownerFlatsCount = flatCount - contractorFlatsCount;

  const synchronizedFlats = synchronizeFlats(
    flats,
    flatCount,
    baseBuildArea,
    floorCount,
    transformationStatus
  );

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
    const grossPay = flat.area * baseCostPerSqM;
    const paid = flat.downPayment || 0;
    const remainingAfterDown = Math.max(0, grossPay - paid);

    let usedCredit = 0;
    if (flat.useTransformationCredit && !isContractor && projectModel !== 'contractorShare') {
      if (transformationStatus === 'currentSupport') {
        usedCredit = Math.min(remainingAfterDown, 1750000);
      } else if (transformationStatus === 'futureSupport2027') {
        usedCredit = Math.min(remainingAfterDown, 3000000);
      }
    }

    const netRemainingDebt =
      (projectModel === 'contractorShare' && isOwner) || isContractor
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
      stagePayments: [p1, p2, p3, p4, p5],
      monthlyInstallment,
    });
  });

  const totalMonthlyInstallments = flatResults
    .filter((f) => !f.isContractorShare)
    .reduce((sum, f) => sum + f.monthlyInstallment, 0);

  const totalMaterialCost =
    (concreteM3 * params.priceConcrete + steelTon * params.priceSteel) *
    costMultiplier;
  const totalLaborCost = Math.max(0, subTotalCost - totalMaterialCost);

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
    flatCount,
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
    cashFlowRows,
    flatResults,
    calculatedAt: new Date().toLocaleDateString('tr-TR'),
  };
}
