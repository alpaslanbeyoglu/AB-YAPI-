import { ProjectParams, CalculationResult, FlatCalcResult, CashFlowRow } from '../types';

export const DEFAULT_PARAMS: ProjectParams = {
  projectAddress: 'İstanbul, Fatih Kocamustafapaşa Mah. 1024 Ada 15 Parsel',
  durationOption: 'manual',
  manualMonths: 14,
  transformationStatus: 'currentSupport',
  projectModel: 'cash',
  baseBuildArea: 100,
  floorCount: 5,
  flatCount: 5,
  contractorShareRate: 50,
  buildingType: 'standard',
  usdRate: 48.24,
  costMultiplier: 2.5,
  profitRate: 25,

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
    flats,
    stage1Pay,
    stage2Pay,
    stage3Pay,
    stage4Pay,
    stage5Pay,
  } = params;

  const totalArea = Math.max(1, baseBuildArea * floorCount);

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

  const concreteM3 = totalArea * 0.45;
  const steelTon = totalArea * 0.04;

  const kabaTotalCost =
    (concreteM3 * params.priceConcrete +
      steelTon * params.priceSteel +
      totalArea * params.costKabaWork) *
    kabaTypeMult *
    costMultiplier;

  const systemsCost =
    (params.costElevator +
      flatCount * params.priceSmartHome +
      params.costIntercom +
      flatCount * params.priceGas) *
    costMultiplier;

  const finishingTotalCost =
    (flatCount * params.pricePlumbing +
      flatCount * params.priceElectric +
      totalArea * 0.18 * params.pricePvc +
      totalArea * params.priceTiles +
      flatCount * params.priceKitchen +
      flatCount * params.priceDoors +
      totalArea * 2.8 * params.pricePaintPlaster) *
    inceTypeMult *
    costMultiplier;

  const subTotalCost =
    officialCost + sgkSalesCost + kabaTotalCost + systemsCost + finishingTotalCost;
  const profitAmount = subTotalCost * (profitRate / 100);
  const grandTotal = subTotalCost + profitAmount;

  const netCostPerSqM = subTotalCost / totalArea;
  const grossCostPerSqM = grandTotal / totalArea;
  const baseCostPerSqM =
    includeProfitOwner === 'yes' ? grossCostPerSqM : netCostPerSqM;

  const netUsdPerSqM = usdRate > 0 ? netCostPerSqM / usdRate : 0;
  const grossUsdPerSqM = usdRate > 0 ? grossCostPerSqM / usdRate : 0;

  const s1 = stage1Pay / 100;
  const s2 = stage2Pay / 100;
  const s3 = stage3Pay / 100;
  const s4 = stage4Pay / 100;
  const s5 = stage5Pay / 100;

  const contractorFlatsCount =
    projectModel === 'contractorShare' ? flatCount * (contractorShareRate / 100) : 0;
  const ownerFlatsCount = flatCount - contractorFlatsCount;

  const flatResults: FlatCalcResult[] = [];
  const totalStageIncomes = [0, 0, 0, 0, 0];

  flats.forEach((flat, idx) => {
    const isOwner = projectModel === 'contractorShare' ? idx + 1 <= ownerFlatsCount : true;
    const grossPay = flat.area * baseCostPerSqM;
    const paid = flat.downPayment || 0;
    const remainingAfterDown = Math.max(0, grossPay - paid);

    let usedCredit = 0;
    if (flat.useTransformationCredit && projectModel !== 'contractorShare') {
      if (transformationStatus === 'currentSupport') {
        usedCredit = Math.min(remainingAfterDown, 1750000);
      } else if (transformationStatus === 'futureSupport2027') {
        usedCredit = Math.min(remainingAfterDown, 3000000);
      }
    }

    const netRemainingDebt =
      projectModel === 'contractorShare' && isOwner
        ? 0
        : Math.max(0, remainingAfterDown - usedCredit);

    const p1 = netRemainingDebt * s1;
    const p2 = netRemainingDebt * s2;
    const p3 = netRemainingDebt * s3;
    const p4 = netRemainingDebt * s4 + usedCredit;
    const p5 = netRemainingDebt * s5;

    totalStageIncomes[0] += p1 + paid / 5;
    totalStageIncomes[1] += p2;
    totalStageIncomes[2] += p3;
    totalStageIncomes[3] += p4;
    totalStageIncomes[4] += p5;

    flatResults.push({
      id: flat.id,
      name: flat.name,
      tc: flat.tc,
      area: flat.area,
      grossPay,
      downPayment: paid,
      usedCredit,
      netRemainingDebt,
      isContractorShare: projectModel === 'contractorShare' && !isOwner,
      stagePayments: [p1, p2, p3, p4, p5],
    });
  });

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
