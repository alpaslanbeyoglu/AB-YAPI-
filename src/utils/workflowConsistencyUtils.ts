import {
  ProjectParams,
  BuildingModelParams,
  ProposalStatus,
  OfferMeta,
  FlatItem,
} from '../types';
import {
  calculateCantileverDetails,
  calculateFlatCount,
  synchronizeFlats,
} from './calculatorEngine';
import { calculateFootprint } from './footprintUtils';
import {
  appendOfferStatusHistory,
  buildInitializedOfferMeta,
} from './customerOfferBoundary';

const ACCEPTED_PROPOSAL_STATUSES: ReadonlySet<ProposalStatus> = new Set<ProposalStatus>([
  'accepted',
  'contracted',
  'active_site',
]);

/**
 * K-3: Teklif durumu ('accepted' | 'contracted' | 'active_site') ve isOfferAccepted
 * bayrağından tutarlı teklif kabul durumunu türetir.
 */
export function isAcceptedProposalStatus(status?: ProposalStatus | null): boolean {
  return Boolean(status && ACCEPTED_PROPOSAL_STATUSES.has(status));
}

export function resolveEffectiveOfferAccepted(
  params: Pick<ProjectParams, 'isOfferAccepted' | 'proposalStatus'>
): boolean {
  if (isAcceptedProposalStatus(params.proposalStatus)) {
    return true;
  }
  return Boolean(params.isOfferAccepted);
}

/**
 * K-3: Mevcut projeden anlamlı proposalStatus değerini çözer.
 * Eğer proposalStatus tanımlıysa onu korur; yalnızca isOfferAccepted=true olan eski
 * kayıtlarda 'accepted' olarak yorumlar.
 */
export function resolveEffectiveProposalStatus(
  params: Pick<ProjectParams, 'isOfferAccepted' | 'proposalStatus'>
): ProposalStatus {
  if (params.proposalStatus) {
    if (
      params.isOfferAccepted &&
      !isAcceptedProposalStatus(params.proposalStatus) &&
      params.proposalStatus === 'draft'
    ) {
      return 'accepted';
    }
    return params.proposalStatus;
  }
  return params.isOfferAccepted ? 'accepted' : 'draft';
}

/**
 * K-3: Şantiye veya üst çubuk üzerinden "Teklif Kabul Edildi / Değerlendirmede" veya
 * doğrudan durum geçişi yapıldığında isOfferAccepted, proposalStatus ve offerMeta.statusHistory
 * alanlarını mevcut geçmişi silmeden atomik olarak üretir.
 */
export function buildOfferAcceptanceTransitionPatch(
  params: ProjectParams,
  nextAccepted: boolean,
  options?: {
    companyName?: string;
    targetAcceptedStatus?: 'accepted' | 'contracted' | 'active_site';
    targetUnacceptedStatus?: 'draft' | 'in_review' | 'presented';
    note?: string;
  }
): Pick<ProjectParams, 'isOfferAccepted' | 'proposalStatus' | 'offerMeta'> {
  const prevStatus: ProposalStatus = params.proposalStatus || (params.isOfferAccepted ? 'accepted' : 'draft');

  let nextStatus: ProposalStatus;
  if (nextAccepted) {
    if (options?.targetAcceptedStatus) {
      nextStatus = options.targetAcceptedStatus;
    } else if (isAcceptedProposalStatus(prevStatus)) {
      nextStatus = prevStatus;
    } else {
      nextStatus = 'accepted';
    }
  } else {
    if (options?.targetUnacceptedStatus) {
      nextStatus = options.targetUnacceptedStatus;
    } else if (!isAcceptedProposalStatus(prevStatus)) {
      nextStatus = prevStatus;
    } else {
      // Geçmişte 'presented' veya 'in_review' varsa ona, yoksa 'in_review' durumuna dön
      const history = params.offerMeta?.statusHistory || [];
      let fallbackStatus: ProposalStatus = 'in_review';
      for (let i = history.length - 1; i >= 0; i--) {
        const candidate = history[i].fromStatus;
        if (candidate === 'presented' || candidate === 'in_review' || candidate === 'draft') {
          fallbackStatus = candidate;
          break;
        }
      }
      nextStatus = fallbackStatus;
    }
  }

  let nextOfferMeta: OfferMeta | undefined = params.offerMeta;
  if (prevStatus !== nextStatus) {
    nextOfferMeta = appendOfferStatusHistory(
      params,
      options?.companyName,
      prevStatus,
      nextStatus,
      options?.note ||
        (nextAccepted
          ? 'Şantiye / süreç ekranından teklif onaylandı'
          : 'Teklif değerlendirme aşamasına alındı')
    );
  } else if (params.offerMeta) {
    nextOfferMeta = buildInitializedOfferMeta(params, options?.companyName);
  }

  return {
    isOfferAccepted: nextAccepted,
    proposalStatus: nextStatus,
    ...(nextOfferMeta ? { offerMeta: nextOfferMeta } : {}),
  };
}

/**
 * K-3: Doğrudan ProposalStatus seçildiğinde (Header veya OfferTab) isOfferAccepted,
 * proposalStatus ve offerMeta.statusHistory alanlarını tutarlı şekilde üretir.
 */
export function buildProposalStatusChangePatch(
  params: ProjectParams,
  newStatus: ProposalStatus,
  options?: {
    companyName?: string;
    note?: string;
  }
): Pick<ProjectParams, 'isOfferAccepted' | 'proposalStatus' | 'offerMeta'> {
  const prevStatus: ProposalStatus = params.proposalStatus || (params.isOfferAccepted ? 'accepted' : 'draft');
  const isAccepted = isAcceptedProposalStatus(newStatus);

  const nextOfferMeta =
    prevStatus !== newStatus
      ? appendOfferStatusHistory(
          params,
          options?.companyName,
          prevStatus,
          newStatus,
          options?.note || `Teklif durumu "${newStatus}" olarak güncellendi`
        )
      : params.offerMeta
      ? buildInitializedOfferMeta(params, options?.companyName)
      : undefined;

  return {
    proposalStatus: newStatus,
    isOfferAccepted: isAccepted,
    ...(nextOfferMeta ? { offerMeta: nextOfferMeta } : {}),
  };
}

/**
 * K-4: contractorFlatIds listesini doğrular (1..totalFlats aralığında tam sayı, tekil)
 * ve gerektiğinde flats[].isContractorShare bayraklarıyla senkronize eder.
 */
export function sanitizeContractorFlatIds(
  rawIds: readonly number[] | undefined,
  totalFlats: number
): number[] {
  if (!Array.isArray(rawIds) || totalFlats <= 0) return [];
  const seen = new Set<number>();
  const valid: number[] = [];
  for (const rawId of rawIds) {
    const id = Number(rawId);
    if (Number.isInteger(id) && id >= 1 && id <= totalFlats && !seen.has(id)) {
      seen.add(id);
      valid.push(id);
    }
  }
  return valid;
}

export function syncFlatsContractorShareFlags(
  flats: FlatItem[],
  sanitizedContractorIds: readonly number[]
): FlatItem[] {
  const idSet = new Set<number>(sanitizedContractorIds);
  return flats.map((flat) => {
    const isContractor = idSet.has(flat.id);
    if (flat.isContractorShare === isContractor) {
      return flat;
    }
    return {
      ...flat,
      isContractorShare: isContractor,
    };
  });
}

/**
 * K-1 & K-4: Fonksiyonel state güncellemesi için önceki ProjectParams ile gelen
 * kısmi veya tam güncellemeyi birleştirip bağımsız bölümleri ve müteahhit paylarını
 * atomik olarak senkronize eden saf (pure) yardımcı fonksiyon.
 */
export function applyCalculatorParamsUpdate(
  prevParams: ProjectParams,
  newParamsOrUpdates: ProjectParams | Partial<ProjectParams>
): ProjectParams {
  const newParams: ProjectParams = {
    ...prevParams,
    ...newParamsOrUpdates,
  };

  const footprintResult = calculateFootprint(newParams.footprintInputMode, newParams);
  let activeBaseArea = newParams.baseBuildArea;
  if (!activeBaseArea || activeBaseArea <= 0) {
    activeBaseArea = footprintResult.area;
  }

  const cantileverInfo = calculateCantileverDetails(newParams, activeBaseArea, footprintResult);
  const upperFloorArea = cantileverInfo.upperFloorArea;

  const roofType = newParams.roofType || 'gable';
  const isMansard = roofType === 'mansard';
  const isDuplex = roofType === 'duplex';
  const flatsPerFloor = newParams.flatsPerFloor || 2;

  const totalFlats = calculateFlatCount(newParams);

  const roofAtticArea = isDuplex
    ? Math.round(upperFloorArea * 0.65 * 100) / 100
    : isMansard
    ? Math.round(upperFloorArea * 0.70 * 100) / 100
    : 0;

  let synchronizedFlats = synchronizeFlats(
    newParams.flats,
    totalFlats,
    activeBaseArea,
    newParams.floorCount,
    newParams.transformationStatus,
    roofType,
    flatsPerFloor,
    newParams.mansardFlatCount,
    roofAtticArea,
    newParams.hasGroundFloorShop,
    newParams.shopCount || 1,
    upperFloorArea,
    newParams.basementPurpose,
    newParams.basementShopCount || 1,
    newParams.basementCount !== undefined ? newParams.basementCount : 1,
    newParams.basementConfig
  );

  const contractorIdsExplicitlyUpdated = Object.prototype.hasOwnProperty.call(
    newParamsOrUpdates,
    'contractorFlatIds'
  );
  const flatsExplicitlyUpdated = Object.prototype.hasOwnProperty.call(
    newParamsOrUpdates,
    'flats'
  );

  let sanitizedContractorIds = sanitizeContractorFlatIds(
    newParams.contractorFlatIds,
    totalFlats
  );

  if (contractorIdsExplicitlyUpdated && !flatsExplicitlyUpdated) {
    // contractorFlatIds doğrudan güncellendiyse tüm dairelerin isContractorShare bayrağını eşitle
    synchronizedFlats = syncFlatsContractorShareFlags(
      synchronizedFlats,
      sanitizedContractorIds
    );
  } else if (contractorIdsExplicitlyUpdated && flatsExplicitlyUpdated) {
    // Her ikisi birlikte verildiyse geçerli contractorFlatIds kümesini daire bayraklarına uygula
    synchronizedFlats = syncFlatsContractorShareFlags(
      synchronizedFlats,
      sanitizedContractorIds
    );
  } else if (flatsExplicitlyUpdated && !contractorIdsExplicitlyUpdated) {
    // Yalnızca flats güncellendiyse ve dairelerde açık isContractorShare tanımlıysa contractorFlatIds listesini türet
    const hasExplicitFlatFlags = synchronizedFlats.some(
      (f) => f.isContractorShare !== undefined
    );
    if (hasExplicitFlatFlags) {
      sanitizedContractorIds = sanitizeContractorFlatIds(
        synchronizedFlats.filter((f) => Boolean(f.isContractorShare)).map((f) => f.id),
        totalFlats
      );
    }
  }

  return {
    ...newParams,
    baseBuildArea: activeBaseArea,
    flatCount: totalFlats,
    flats: synchronizedFlats,
    contractorFlatIds: sanitizedContractorIds,
  };
}

/**
 * K-4: 3D Bina Modeli (BuildingModelParams) üzerinden yapılan güncellemeleri
 * ProjectParams'a uygularken contractorFlatIds ve flats[].isContractorShare
 * alanlarını aynı işlemde senkronize eden saf yardımcı fonksiyon.
 */
export function applyBuildingModelUpdateToProjectParams(
  prev: ProjectParams,
  updates: Partial<BuildingModelParams>
): ProjectParams {
  const mergedForFootprint: ProjectParams = {
    ...prev,
    footprintInputMode:
      updates.footprintInputMode !== undefined
        ? updates.footprintInputMode
        : prev.footprintInputMode,
    facadeWidth: updates.facadeWidth !== undefined ? updates.facadeWidth : prev.facadeWidth,
    facadeDepth: updates.facadeDepth !== undefined ? updates.facadeDepth : prev.facadeDepth,
    backFacadeLength:
      updates.backFacadeLength !== undefined ? updates.backFacadeLength : prev.backFacadeLength,
    leftFacadeLength:
      updates.leftFacadeLength !== undefined ? updates.leftFacadeLength : prev.leftFacadeLength,
    customFacadeCount:
      updates.customFacadeCount !== undefined ? updates.customFacadeCount : prev.customFacadeCount,
    customFacades:
      updates.customFacades !== undefined ? updates.customFacades : prev.customFacades,
    lShapeFrontMain:
      updates.lShapeFrontMain !== undefined ? updates.lShapeFrontMain : prev.lShapeFrontMain,
    lShapeDepthMain:
      updates.lShapeDepthMain !== undefined ? updates.lShapeDepthMain : prev.lShapeDepthMain,
    lShapeRecessFront:
      updates.lShapeRecessFront !== undefined ? updates.lShapeRecessFront : prev.lShapeRecessFront,
    lShapeRecessDepth:
      updates.lShapeRecessDepth !== undefined ? updates.lShapeRecessDepth : prev.lShapeRecessDepth,
    polygonPoints:
      updates.polygonPoints !== undefined ? updates.polygonPoints : prev.polygonPoints,
  };

  let activeBaseArea = prev.baseBuildArea;
  if (updates.baseBuildArea !== undefined && updates.baseBuildArea > 0) {
    activeBaseArea = updates.baseBuildArea;
  } else if (
    updates.facadeWidth !== undefined ||
    updates.facadeDepth !== undefined ||
    updates.customFacades !== undefined ||
    updates.lShapeFrontMain !== undefined ||
    updates.lShapeDepthMain !== undefined ||
    updates.lShapeRecessFront !== undefined ||
    updates.lShapeRecessDepth !== undefined ||
    updates.polygonPoints !== undefined
  ) {
    const footprintResult = calculateFootprint(
      mergedForFootprint.footprintInputMode,
      mergedForFootprint
    );
    activeBaseArea = footprintResult.area;
  }

  const nextFloorCount = updates.floorCount !== undefined ? updates.floorCount : prev.floorCount;
  const nextFlatsPerFloor =
    updates.flatsPerFloor !== undefined ? updates.flatsPerFloor : prev.flatsPerFloor || 2;
  const nextHasShop =
    updates.hasGroundFloorShop !== undefined
      ? updates.hasGroundFloorShop
      : prev.hasGroundFloorShop || false;
  const nextShopCount =
    updates.shopCount !== undefined ? updates.shopCount : prev.shopCount || 1;
  const nextBasementCount =
    updates.basementCount !== undefined
      ? updates.basementCount
      : prev.basementCount !== undefined
      ? prev.basementCount
      : 1;
  const nextBasementPurpose =
    updates.basementPurpose !== undefined ? updates.basementPurpose : prev.basementPurpose;
  const nextBasementShopCount =
    updates.basementShopCount !== undefined
      ? updates.basementShopCount
      : prev.basementShopCount || 1;
  const nextBasementConfig =
    updates.basementConfig !== undefined ? updates.basementConfig : prev.basementConfig;
  const roofType = updates.roofType !== undefined ? updates.roofType : prev.roofType || 'gable';
  const isMansard = roofType === 'mansard';
  const isDuplex = roofType === 'duplex';
  const nextMansardFlatCount =
    updates.mansardFlatCount !== undefined ? updates.mansardFlatCount : prev.mansardFlatCount;

  const calcParamsMerged: ProjectParams = {
    ...prev,
    ...updates,
    baseBuildArea: activeBaseArea,
    floorCount: nextFloorCount,
    flatsPerFloor: nextFlatsPerFloor,
    hasGroundFloorShop: nextHasShop,
    shopCount: nextShopCount,
    roofType: roofType,
    mansardFlatCount: nextMansardFlatCount,
    basementCount: nextBasementCount,
    basementPurpose: nextBasementPurpose,
    basementShopCount: nextBasementShopCount,
    basementConfig: nextBasementConfig,
  };

  let nextFlatCount = calculateFlatCount(calcParamsMerged);
  if (
    updates.flatCount !== undefined &&
    updates.flatCount > 0 &&
    updates.floorCount === undefined &&
    updates.flatsPerFloor === undefined &&
    updates.hasGroundFloorShop === undefined &&
    updates.roofType === undefined &&
    updates.mansardFlatCount === undefined &&
    updates.shopCount === undefined &&
    updates.basementCount === undefined
  ) {
    nextFlatCount = updates.flatCount;
  }

  const footprintResult = calculateFootprint(
    mergedForFootprint.footprintInputMode,
    mergedForFootprint
  );
  const cantileverInfo = calculateCantileverDetails(
    calcParamsMerged,
    activeBaseArea,
    footprintResult
  );
  const upperFloorArea = cantileverInfo.upperFloorArea;

  const roofAtticArea = isDuplex
    ? Math.round(upperFloorArea * 0.65 * 100) / 100
    : isMansard
    ? Math.round(upperFloorArea * 0.70 * 100) / 100
    : 0;

  const baseFlatsInput = updates.flats !== undefined ? updates.flats : prev.flats;

  let synchronizedFlats = synchronizeFlats(
    baseFlatsInput,
    nextFlatCount,
    activeBaseArea,
    nextFloorCount,
    prev.transformationStatus,
    roofType,
    nextFlatsPerFloor,
    nextMansardFlatCount,
    roofAtticArea,
    nextHasShop,
    nextShopCount,
    upperFloorArea,
    nextBasementPurpose,
    nextBasementShopCount,
    nextBasementCount,
    nextBasementConfig
  );

  const contractorIdsExplicitlyUpdated = Object.prototype.hasOwnProperty.call(
    updates,
    'contractorFlatIds'
  );

  const rawContractorIds = contractorIdsExplicitlyUpdated
    ? updates.contractorFlatIds
    : prev.contractorFlatIds;

  const sanitizedContractorIds = sanitizeContractorFlatIds(rawContractorIds, nextFlatCount);

  if (contractorIdsExplicitlyUpdated || Array.isArray(prev.contractorFlatIds)) {
    synchronizedFlats = syncFlatsContractorShareFlags(
      synchronizedFlats,
      sanitizedContractorIds
    );
  }

  return {
    ...prev,
    ...updates,
    baseBuildArea: activeBaseArea,
    floorCount: nextFloorCount,
    flatCount: nextFlatCount,
    flatsPerFloor: nextFlatsPerFloor,
    flats: synchronizedFlats,
    contractorFlatIds: sanitizedContractorIds,
  };
}
