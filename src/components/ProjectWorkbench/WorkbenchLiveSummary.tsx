import React, { useMemo } from 'react';
import { ProjectParams, CalculationResult, AppTheme } from '../../types';
import { calculateBuildingMetrics, DEFAULT_BUILDING_PARAMS } from '../../utils/buildingModelUtils';
import {
  BarChart3,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  FileText,
} from 'lucide-react';

export type StageStatus = 'completed' | 'in_progress' | 'needs_check' | 'incomplete';

export interface WorkbenchIssue {
  id: string;
  severity: 'critical' | 'warning';
  stage: number;
  stageLabel: string;
  focusFieldId?: string;
  message: string;
}

export interface StageEvaluation {
  id: number;
  status: StageStatus;
  isOptional: boolean;
  issueCount: number;
}

export type Stage6SubView = 'cost' | 'admin_report';
export type Stage8SubView = 'offer' | 'contract';

export interface WorkbenchStageNavigationOptions {
  stage6SubView?: Stage6SubView;
  stage8SubView?: Stage8SubView;
}

export interface WorkbenchNavigationRequest extends WorkbenchStageNavigationOptions {
  step: number;
  focusFieldId?: string;
  nonce: number;
}

export const STAGE6_COST_FOCUS_FIELD_IDS = [
  'stage3UnitPriceInput',
  'stage6CostParamsCard',
  'stage6DurationSelect',
] as const;

export function isStage6CostFocusField(focusFieldId?: string): boolean {
  return Boolean(
    focusFieldId &&
      (STAGE6_COST_FOCUS_FIELD_IDS as readonly string[]).includes(focusFieldId)
  );
}

export function resolveStage6SubViewForNavigation(
  current: Stage6SubView,
  options?: { focusFieldId?: string; explicitSubView?: Stage6SubView }
): Stage6SubView {
  if (options?.explicitSubView) return options.explicitSubView;
  if (isStage6CostFocusField(options?.focusFieldId)) return 'cost';
  return current;
}

export function resolveStage8SubViewForNavigation(
  current: Stage8SubView,
  explicitSubView?: Stage8SubView
): Stage8SubView {
  if (explicitSubView) return explicitSubView;
  return current;
}

export interface WorkbenchEvaluation {
  stages: Record<number, StageEvaluation>;
  issues: WorkbenchIssue[];
  requiredCompleted: number;
  requiredTotal: number;
  requiredPercent: number;
  optionalCompleted: number;
  optionalTotal: number;
  completedStageCount: number;
  isOfferReady: boolean;
}

export function evaluateWorkbenchProject(
  params: ProjectParams,
  results: CalculationResult,
  isProjectSaved = false
): WorkbenchEvaluation {
  const hasName = Boolean(params.projectName && params.projectName.trim().length > 0);
  const hasAddress = Boolean(params.projectAddress && params.projectAddress.trim().length > 0);
  const hasLandArea = Boolean(params.landArea && params.landArea > 0);
  const hasBaseArea = Boolean(params.baseBuildArea && params.baseBuildArea > 0);
  const hasFloorCount = Boolean(params.floorCount && params.floorCount > 0);
  const hasFlatsPerFloor = Boolean(params.flatsPerFloor && params.flatsPerFloor > 0);
  const hasFloors = hasFloorCount && hasFlatsPerFloor;
  const hasExistingBuildings = Boolean(params.existingBuildings && params.existingBuildings.length > 0);
  const hasPolygon = Boolean(params.polygonPoints && params.polygonPoints.length >= 3);
  const hasFlats = Boolean(params.flats && params.flats.length > 0 && results.flatCount > 0);
  const flatsAligned = hasFlats && params.flats.length === results.flatCount;
  const hasZeroAreaFlat = hasFlats && params.flats.some((f) => !f.area || f.area <= 0);
  const hasCosts = Boolean(results.totalArea > 0 && results.grandTotal > 0 && results.subTotalCost > 0);

  const baseArea = results.baseArea || params.baseBuildArea || 0;
  const landArea = params.landArea || 0;
  const totalArea = results.totalArea || 0;
  const taksPercent = landArea > 0 ? (baseArea / landArea) * 100 : 0;
  const kaksRatio = landArea > 0 ? totalArea / landArea : 0;
  const footprintExceedsLand = hasLandArea && hasBaseArea && baseArea > landArea;
  const taksHigh = hasLandArea && !footprintExceedsLand && taksPercent > 65;

  const isContractorShare = params.projectModel === 'contractorShare';
  const assignedContractorFlats = (params.contractorFlatIds || []).length;
  const contractorShareRate = params.contractorShareRate || 0;

  const issues: WorkbenchIssue[] = [];

  // 1. Aşama: Müşteri ve Proje Tanımlama (Zorunlu)
  if (!hasName) {
    issues.push({
      id: 'missing-name',
      severity: 'critical',
      stage: 1,
      stageLabel: '1. Aşama',
      focusFieldId: 'projectNameInput',
      message: 'Müşteri / proje adı girilmedi',
    });
  }
  if (!hasAddress) {
    issues.push({
      id: 'missing-address',
      severity: 'critical',
      stage: 1,
      stageLabel: '1. Aşama',
      focusFieldId: 'projectAddressInput',
      message: 'Proje adresi (ada/parsel) eksik',
    });
  }

  // 2. Aşama: Arsa ve İmar Analizi (Zorunlu)
  if (!hasLandArea) {
    issues.push({
      id: 'missing-land',
      severity: 'critical',
      stage: 2,
      stageLabel: '2. Aşama',
      focusFieldId: 'projectLandAreaInput',
      message: 'Arsa alanı girilmedi (TAKS/KAKS hesaplanamıyor)',
    });
  }
  if (!hasBaseArea) {
    issues.push({
      id: 'missing-base',
      severity: 'critical',
      stage: 2,
      stageLabel: '2. Aşama',
      focusFieldId: 'projectBaseAreaInput',
      message: 'Taban oturum alanı girilmedi',
    });
  } else if (footprintExceedsLand) {
    issues.push({
      id: 'base-exceeds-land',
      severity: 'critical',
      stage: 2,
      stageLabel: '2. Aşama',
      focusFieldId: 'projectBaseAreaInput',
      message: `Taban oturumu (${Math.round(baseArea)} m²) arsa alanından (${Math.round(landArea)} m²) büyük`,
    });
  } else if (taksHigh) {
    issues.push({
      id: 'high-taks',
      severity: 'warning',
      stage: 2,
      stageLabel: '2. Aşama',
      focusFieldId: 'projectBaseAreaInput',
      message: `TAKS oranı (%${taksPercent.toFixed(1)}) yüksek — imar sınırını doğrulayın`,
    });
  }

  // 2. Aşama: Mevcut Yapı Dengesi (yalnızca veri girilmiş ve tutarsızlık varsa uyar)
  const totalExistingUnits = (params.existingBuildings || []).reduce(
    (sum, b) => sum + (b.flatCount || 0) + (b.hasShop ? b.shopCount || 0 : 0),
    0
  );
  if (hasExistingBuildings && results.flatCount > 0 && totalExistingUnits > results.flatCount) {
    issues.push({
      id: 'existing-exceeds-planned',
      severity: 'warning',
      stage: 2,
      stageLabel: '2. Aşama',
      message: `Mevcut bölüm sayısı (${totalExistingUnits}) yeni plandan (${results.flatCount}) fazla`,
    });
  }

  // 3. Aşama: Mimari Tasarım ve Yapılandırma (Kat, Daire, Matris ve Mevzuat Sınırları)
  if (!hasFloorCount) {
    issues.push({
      id: 'missing-floors',
      severity: 'critical',
      stage: 3,
      stageLabel: '3. Aşama',
      focusFieldId: 'minimalFloorCountInput',
      message: 'Kat sayısı tanımlanmadı',
    });
  }
  if (!hasFlatsPerFloor) {
    issues.push({
      id: 'missing-flats-per-floor',
      severity: 'critical',
      stage: 3,
      stageLabel: '3. Aşama',
      focusFieldId: 'minimalFlatsPerFloorInput',
      message: 'Katta daire sayısı girilmedi',
    });
  }

  if (hasBaseArea && hasFloors) {
    const metrics = calculateBuildingMetrics({
      ...DEFAULT_BUILDING_PARAMS,
      ...params,
    });
    const flatsPerFloor = params.flatsPerFloor || 2;
    let minNetRequired = 55;
    if (flatsPerFloor === 2) {
      minNetRequired = params.roomType === '3+1' ? 90 : 65;
    } else if (flatsPerFloor >= 3 && flatsPerFloor <= 4) {
      minNetRequired = params.roomType === '1+1' ? 35 : 60;
    } else if (flatsPerFloor >= 5) {
      minNetRequired = 28;
    }

    if (metrics.flatNetArea > 0 && metrics.flatNetArea < minNetRequired) {
      issues.push({
        id: 'min-net-area',
        severity: 'warning',
        stage: 3,
        stageLabel: '3. Aşama',
        focusFieldId: 'minimalFlatsPerFloorInput',
        message: `Daire neti (~${Math.round(metrics.flatNetArea)} m²) imar asgarisi (${minNetRequired} m²) altında`,
      });
    }

    if ((params.floorCount >= 10 || results.flatCount > 20) && (params.elevatorCount ?? 1) < 2) {
      issues.push({
        id: 'double-elevator-required',
        severity: 'warning',
        stage: 3,
        stageLabel: '3. Aşama',
        focusFieldId: 'stage3ElevatorGroup',
        message: '10+ kat / 20+ bölümde çift asansör zorunludur',
      });
    }

    if ((results.flatCount >= 12 || totalArea >= 1500) && params.basementCount === 0) {
      issues.push({
        id: 'shelter-basement-check',
        severity: 'warning',
        stage: 3,
        stageLabel: '3. Aşama',
        focusFieldId: 'stage3BasementCard',
        message: '12+ bölüm veya 1500+ m² yapıda sığınak/bodrum kontrolü gerekli',
      });
    }

    if (hasLandArea && kaksRatio > 4.5) {
      issues.push({
        id: 'high-kaks',
        severity: 'warning',
        stage: 3,
        stageLabel: '3. Aşama',
        focusFieldId: 'minimalFloorCountInput',
        message: `Emsal (KAKS ${kaksRatio.toFixed(2)}) yüksek — kat/taban hesabını kontrol edin`,
      });
    }

    // 6. Aşama: Manuel m² Birim Fiyat Kontrolü (Maliyet ve Fizibilite)
    if (params.manualFlatUnitPrice !== undefined && params.manualFlatUnitPrice > 0 && params.manualFlatUnitPrice < 8000) {
      issues.push({
        id: 'low-manual-unit-price',
        severity: 'warning',
        stage: 6,
        stageLabel: '6. Aşama',
        focusFieldId: 'stage3UnitPriceInput',
        message: `Manuel m² birim fiyatı (${params.manualFlatUnitPrice.toLocaleString('tr-TR')} ₺) olağandışı düşük`,
      });
    }
  }

  // 3. Aşama: Bağımsız Bölüm Dağılımı & Daire Matrisi
  if (!hasFlats) {
    issues.push({
      id: 'missing-flats',
      severity: 'critical',
      stage: 3,
      stageLabel: '3. Aşama',
      focusFieldId: 'minimalFlatsPerFloorInput',
      message: 'Bağımsız bölüm matrisi oluşturulmadı',
    });
  } else if (!flatsAligned) {
    issues.push({
      id: 'flats-mismatch',
      severity: 'critical',
      stage: 3,
      stageLabel: '3. Aşama',
      focusFieldId: 'stage3FlatsMatrixSection',
      message: `Bölüm matrisi (${params.flats.length}) kat planıyla (${results.flatCount}) uyuşmuyor`,
    });
  } else if (hasZeroAreaFlat) {
    issues.push({
      id: 'zero-area-flat',
      severity: 'warning',
      stage: 3,
      stageLabel: '3. Aşama',
      focusFieldId: 'stage3FlatsMatrixSection',
      message: 'Metrekaresi sıfır olan bağımsız bölüm mevcut',
    });
  }

  // 6. Aşama: Maliyet ve Fizibilite
  if (!hasCosts) {
    issues.push({
      id: 'missing-costs',
      severity: 'critical',
      stage: 6,
      stageLabel: '6. Aşama',
      focusFieldId: 'stage6CostParamsCard',
      message: 'İnşaat maliyeti ve teklif bedeli hesaplanamıyor',
    });
  }

  // 7. Aşama: Kat Karşılığı & Malik Paylaşım Kontrolü
  const landownersList = params.landowners || [];
  const unassignedUnitsCount = (params.flats || []).filter((f) => {
    const isCont = !!(params.contractorFlatIds?.includes(f.id) || f.isContractorShare);
    if (isCont) return false;
    if (f.ownerId && landownersList.some((o) => o.id === f.ownerId)) return false;
    const trimmed = (f.name || '').trim();
    return !trimmed || /^(kat\s*maliki|malik|daire|bölüm|hak\s*sahibi)\s*\d*$/i.test(trimmed);
  }).length;

  const totalLandownerSharePct = landownersList.reduce((sum, o) => {
    if (o.sharePercent !== undefined && o.sharePercent > 0) return sum + o.sharePercent;
    const den = o.landShareDenominator || params.totalLandShareDenominator || 1000;
    if (o.landShareNumerator !== undefined && o.landShareNumerator > 0 && den > 0) {
      return sum + (o.landShareNumerator / den) * 100;
    }
    return sum;
  }, 0);

  if (landownersList.length > 0 && Math.abs(totalLandownerSharePct - 100) > 0.5) {
    issues.push({
      id: 'landowner-share-mismatch',
      severity: 'warning',
      stage: 7,
      stageLabel: '7. Aşama',
      message: `Malik arsa hisse toplamı (%${totalLandownerSharePct.toFixed(1)}) %100 ile uyuşmuyor`,
    });
  }

  if (hasFlats && unassignedUnitsCount > 0 && (landownersList.length > 0 || isContractorShare)) {
    issues.push({
      id: 'unassigned-owner-units',
      severity: 'warning',
      stage: 7,
      stageLabel: '7. Aşama',
      message: `${unassignedUnitsCount} bağımsız bölüm henüz malik veya müteahhide atanmadı`,
    });
  }

  if (isContractorShare) {
    if (assignedContractorFlats === 0 && contractorShareRate <= 0) {
      issues.push({
        id: 'missing-contractor-share',
        severity: 'critical',
        stage: 7,
        stageLabel: '7. Aşama',
        message: 'Kat karşılığı için müteahhit payı veya dairesi belirlenmedi',
      });
    } else if (assignedContractorFlats === 0 && contractorShareRate > 0) {
      issues.push({
        id: 'unassigned-contractor-flats',
        severity: 'warning',
        stage: 7,
        stageLabel: '7. Aşama',
        message: `%${contractorShareRate} oran aktif ancak müteahhit daireleri atanmadı`,
      });
    } else if (assignedContractorFlats > 0 && hasFlats) {
      const totalFlatsArea = (params.flats || []).reduce((s, f) => s + (f.area || 0), 0);
      const contArea = (params.flats || [])
        .filter((f) => !!(params.contractorFlatIds?.includes(f.id) || f.isContractorShare))
        .reduce((s, f) => s + (f.area || 0), 0);
      const actualContPct = totalFlatsArea > 0 ? (contArea / totalFlatsArea) * 100 : 0;
      if (Math.abs(actualContPct - contractorShareRate) > 10) {
        issues.push({
          id: 'contractor-rate-deviation',
          severity: 'warning',
          stage: 7,
          stageLabel: '7. Aşama',
          message: `Manuel müteahhit payı (%${actualContPct.toFixed(0)}) hedef orandan (%${contractorShareRate}) farklı`,
        });
      }
    }
  }

  const issueCountByStage = (stageId: number) =>
    issues.filter((i) => i.stage === stageId).length;
  const hasCriticalInStage = (stageId: number) =>
    issues.some((i) => i.stage === stageId && i.severity === 'critical');
  const hasAnyIssueInStage = (stageId: number) =>
    issues.some((i) => i.stage === stageId);

  // Zorunlu Çekirdek Tamamlanma (yanıltıcı yüzdeyi önlemek için yalnızca zorunlu verilerden hesaplanır)
  const requiredChecks: boolean[] = [
    hasName,
    hasAddress,
    hasLandArea && hasBaseArea && !footprintExceedsLand,
    hasFloors,
    flatsAligned && !hasZeroAreaFlat,
    hasCosts,
    ...(isContractorShare ? [assignedContractorFlats > 0 || contractorShareRate > 0] : []),
  ];
  const requiredTotal = requiredChecks.length;
  const requiredCompleted = requiredChecks.filter(Boolean).length;
  const requiredPercent = Math.round((requiredCompleted / requiredTotal) * 100);

  // İsteğe Bağlı Detay Tamamlanma
  const hasAnyComfort = Boolean(
    params.hasUnderfloorHeating ||
      params.hasWaterFiltration ||
      params.hasAcOption ||
      params.hasThermostaticShowerMixer ||
      params.hasLinearShowerDrain ||
      params.hasBathroomHumidityFan ||
      params.hasTouchlessKitchenFaucet ||
      params.hasSmartDoorLock ||
      params.hasGenerator ||
      params.hasPorcelainCountertop
  );
  const optionalChecks: boolean[] = [
    hasExistingBuildings || hasPolygon,
    assignedContractorFlats > 0 || params.flats.some((f) => Boolean(f.name && f.name.trim())),
    hasAnyComfort,
    isProjectSaved,
  ];
  const optionalTotal = optionalChecks.length;
  const optionalCompleted = optionalChecks.filter(Boolean).length;

  const criticalIssues = issues.filter((i) => i.severity === 'critical');
  const isOfferReady = criticalIssues.length === 0 && hasCosts && flatsAligned;

  // 9 Aşamanın Gerçek Veri Durumları (Yeni 1–9 Sıralaması)
  // 1. Müşteri ve Proje Tanımlama
  const stage1Status: StageStatus =
    hasName && hasAddress
      ? 'completed'
      : hasName || hasAddress
      ? 'in_progress'
      : 'incomplete';

  // 2. Arsa ve İmar Analizi
  const stage2Status: StageStatus =
    !hasLandArea && !hasBaseArea
      ? 'incomplete'
      : footprintExceedsLand
      ? 'needs_check'
      : !hasLandArea || !hasBaseArea
      ? 'in_progress'
      : hasAnyIssueInStage(2)
      ? 'needs_check'
      : 'completed';

  // 3. Mimari Tasarım ve Yapılandırma
  const stage3Status: StageStatus = hasCriticalInStage(3)
    ? hasFloorCount || hasFlatsPerFloor || hasFlats
      ? 'in_progress'
      : 'incomplete'
    : hasAnyIssueInStage(3)
    ? 'needs_check'
    : hasBaseArea && hasFloors && flatsAligned
    ? 'completed'
    : 'incomplete';

  // 4. 3D Tasarım ve Görselleştirme
  const stage4Status: StageStatus =
    !hasBaseArea || !hasFloors
      ? 'incomplete'
      : footprintExceedsLand || !hasLandArea
      ? 'needs_check'
      : hasPolygon || (params.facadeWidth > 0 && params.facadeDepth > 0) || hasBaseArea
      ? 'completed'
      : 'in_progress';

  // 5. Teknik Şartname ve Metraj
  const stage5Status: StageStatus =
    !hasBaseArea || !hasFloors || !hasCosts
      ? 'incomplete'
      : hasAnyIssueInStage(5)
      ? 'needs_check'
      : hasCosts && hasFlats
      ? 'completed'
      : 'in_progress';

  // 6. Maliyet ve Fizibilite
  const stage6Status: StageStatus = !hasCosts
    ? 'incomplete'
    : hasAnyIssueInStage(6) || !hasLandArea
    ? 'needs_check'
    : 'completed';

  // 7. Malik Paylaşımı ve Ticari Model
  const stage7Status: StageStatus = isContractorShare
    ? hasCriticalInStage(7)
      ? 'incomplete'
      : hasAnyIssueInStage(7)
      ? 'needs_check'
      : 'completed'
    : hasFlats && params.flats.some((f) => Boolean(f.name && f.name.trim()))
    ? 'completed'
    : hasFlats
    ? 'in_progress'
    : 'incomplete';

  // 8. Teklif ve Sözleşme
  const stage8Status: StageStatus = isOfferReady
    ? 'completed'
    : hasCosts && hasFlats
    ? 'needs_check'
    : 'incomplete';

  // 9. Proje ve Şantiye Yönetimi
  const stage9Status: StageStatus =
    isProjectSaved && isOfferReady ? 'completed' : isOfferReady || hasCosts ? 'in_progress' : 'incomplete';

  const stages: Record<number, StageEvaluation> = {
    1: { id: 1, status: stage1Status, isOptional: false, issueCount: issueCountByStage(1) },
    2: { id: 2, status: stage2Status, isOptional: false, issueCount: issueCountByStage(2) },
    3: { id: 3, status: stage3Status, isOptional: false, issueCount: issueCountByStage(3) },
    4: { id: 4, status: stage4Status, isOptional: true, issueCount: issueCountByStage(4) },
    5: { id: 5, status: stage5Status, isOptional: true, issueCount: issueCountByStage(5) },
    6: { id: 6, status: stage6Status, isOptional: false, issueCount: issueCountByStage(6) },
    7: { id: 7, status: stage7Status, isOptional: !isContractorShare, issueCount: issueCountByStage(7) },
    8: { id: 8, status: stage8Status, isOptional: false, issueCount: issueCountByStage(8) },
    9: { id: 9, status: stage9Status, isOptional: true, issueCount: issueCountByStage(9) },
  };

  // Önem sırasına göre sırala: kritik eksikler en üstte
  const sortedIssues = [...issues].sort((a, b) => {
    if (a.severity === b.severity) return a.stage - b.stage;
    return a.severity === 'critical' ? -1 : 1;
  });

  const completedStageCount = Object.values(stages).filter((s) => s.status === 'completed').length;

  return {
    stages,
    issues: sortedIssues,
    requiredCompleted,
    requiredTotal,
    requiredPercent,
    optionalCompleted,
    optionalTotal,
    completedStageCount,
    isOfferReady,
  };
}

interface WorkbenchLiveSummaryProps {
  params: ProjectParams;
  results: CalculationResult;
  theme?: AppTheme;
  activeStage?: number;
  isProjectSaved?: boolean;
  evaluation?: WorkbenchEvaluation;
  onSelectStage?: (
    stage: number,
    focusFieldId?: string,
    options?: WorkbenchStageNavigationOptions
  ) => void;
}

export const WorkbenchLiveSummary: React.FC<WorkbenchLiveSummaryProps> = ({
  params,
  results,
  theme = 'light',
  activeStage = 1,
  isProjectSaved = false,
  evaluation: propEvaluation,
  onSelectStage,
}) => {
  const isGray = theme === 'gray';
  const bgCard = isGray ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/90 shadow-xs';
  const textTitle = isGray ? 'text-gray-100' : 'text-slate-900';

  const evaluation = useMemo(
    () => propEvaluation || evaluateWorkbenchProject(params, results, isProjectSaved),
    [propEvaluation, params, results, isProjectSaved]
  );

  const totalArea = results.totalArea || 0;
  const baseArea = results.baseArea || params.baseBuildArea || 0;
  const subTotalCost = results.subTotalCost || 0;
  const grandTotal = results.grandTotal || 0;
  const profitAmount = results.profitAmount || 0;
  const flatCount = results.flatCount || 0;
  const grossCostPerSqM = results.grossCostPerSqM || 0;
  const netCostPerSqM = results.netCostPerSqM || 0;
  const finalMonths = results.finalMonths || 0;

  const taksPercent =
    params.landArea && params.landArea > 0 ? (baseArea / params.landArea) * 100 : 0;
  const kaksRatio =
    params.landArea && params.landArea > 0 ? totalArea / params.landArea : 0;

  const criticalCount = evaluation.issues.filter((i) => i.severity === 'critical').length;

  return (
    <div className={`${bgCard} rounded-2xl p-4 border shadow-xs space-y-3.5`}>
      {/* Başlık & Hazırlık Durumu */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <h3 className={`text-xs font-black uppercase tracking-wider ${textTitle} flex items-center gap-1.5`}>
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          Karar Özeti
        </h3>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
            evaluation.isOfferReady
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {evaluation.isOfferReady ? 'Teklife Hazır' : `${criticalCount} Zorunlu Eksik`}
        </span>
      </div>

      {/* Zorunlu vs İsteğe Bağlı Tamamlanma Çubuğu */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-slate-700">
            Zorunlu Veriler: <strong className="font-mono text-indigo-700">%{evaluation.requiredPercent}</strong>
            <span className="text-slate-400 font-normal ml-1">
              ({evaluation.requiredCompleted}/{evaluation.requiredTotal})
            </span>
          </span>
          <span className="text-[10px] font-semibold text-slate-500">
            Detay: {evaluation.optionalCompleted}/{evaluation.optionalTotal}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              evaluation.isOfferReady ? 'bg-emerald-500' : 'bg-indigo-600'
            }`}
            style={{ width: `${evaluation.requiredPercent}%` }}
          />
        </div>
      </div>

      {/* Finansal Karar Bloğu */}
      <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/90 to-slate-50 border border-indigo-200/80 space-y-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              Hedef Teklif Bedeli
            </div>
            <div className="text-lg font-black font-mono text-indigo-950 leading-tight mt-0.5">
              {grandTotal > 0 ? `${Math.round(grandTotal).toLocaleString('tr-TR')} ₺` : '0 ₺'}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-slate-500 font-semibold">Birim m²</div>
            <div className="text-xs font-black font-mono text-indigo-700">
              {Math.round(grossCostPerSqM).toLocaleString('tr-TR')} ₺
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-indigo-200/60 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Net Yapım Maliyeti</span>
            <span className="font-mono font-bold text-slate-900">
              {Math.round(subTotalCost).toLocaleString('tr-TR')} ₺
              <span className="text-[10px] text-slate-400 font-normal ml-1">
                ({Math.round(netCostPerSqM).toLocaleString('tr-TR')} ₺/m²)
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Müteahhit Kâr Payı</span>
            <span className="font-mono font-bold text-emerald-700">
              {Math.round(profitAmount).toLocaleString('tr-TR')} ₺
            </span>
          </div>
        </div>
      </div>

      {/* Fiziksel & İmar Özeti */}
      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 text-xs">
        <div>
          <div className="text-[10px] font-semibold text-slate-500">Toplam İnşaat</div>
          <div className="font-mono font-black text-slate-900">
            {Math.round(totalArea).toLocaleString('tr-TR')} m²
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-slate-500">Bağımsız Bölüm</div>
          <div className="font-mono font-black text-slate-900">{flatCount} Adet</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-slate-500">Teslim Süresi</div>
          <div className="font-mono font-black text-slate-900">{finalMonths} Ay</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-slate-500">TAKS / Emsal</div>
          <div className="font-mono font-black text-slate-900">
            {params.landArea && params.landArea > 0
              ? `%${taksPercent.toFixed(0)} / ${kaksRatio.toFixed(2)}`
              : '—'}
          </div>
        </div>
      </div>

      {/* Tek Merkezli Akıllı Proje Kontrolleri (Tıklanabilir Yönlendirme) */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            Akıllı Proje Kontrolü
          </span>
          {evaluation.issues.length > 0 && (
            <span className="text-[10px] text-slate-400 font-medium">Alana git</span>
          )}
        </div>

        {evaluation.issues.length === 0 ? (
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Zorunlu alanlar ve imar sınırları tutarlı.</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {evaluation.issues.slice(0, 6).map((item) => {
              const isCritical = item.severity === 'critical';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectStage?.(item.stage, item.focusFieldId)}
                  className={`w-full text-left p-2 rounded-lg border text-[11px] flex items-center justify-between gap-2 transition-colors cursor-pointer group ${
                    isCritical
                      ? 'bg-rose-50/80 hover:bg-rose-100/80 text-rose-950 border-rose-200'
                      : 'bg-amber-50/90 hover:bg-amber-100/80 text-amber-950 border-amber-200'
                  }`}
                >
                  <span className="flex items-start gap-1.5 min-w-0">
                    {isCritical ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-snug">{item.message}</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border shrink-0 ${
                      isCritical
                        ? 'text-rose-700 border-rose-200 group-hover:border-rose-400'
                        : 'text-amber-700 border-amber-200 group-hover:border-amber-400'
                    }`}
                  >
                    {item.stageLabel} →
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Teklif Ekranına Hızlı Geçiş CTA */}
      {activeStage !== 8 && onSelectStage && (
        <button
          type="button"
          onClick={() => onSelectStage(8, undefined, { stage8SubView: 'offer' })}
          className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer active:scale-98 ${
            evaluation.isOfferReady
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20'
              : 'bg-slate-900 hover:bg-slate-800 text-white'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>
              {evaluation.isOfferReady
                ? 'Müşteri Teklifine Geç (Hazır)'
                : 'Teklif ve Sözleşmeye Geç (8. Aşama)'}
            </span>
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
