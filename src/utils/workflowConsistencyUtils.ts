import {
  ProjectParams,
  BuildingModelParams,
  ProposalStatus,
  OfferMeta,
  FlatItem,
  FlatCalcResult,
  LandownerItem,
  CalculationResult,
  RoofType,
  PolygonPoint,
} from '../types';
import {
  calculateCantileverDetails,
  calculateFlatCount,
  synchronizeFlats,
} from './calculatorEngine';
import {
  calculateFootprint,
  calculatePolygonArea,
  buildBaseAreaEditUpdate,
} from './footprintUtils';
import {
  appendOfferStatusHistory,
  buildInitializedOfferMeta,
} from './customerOfferBoundary';
import { getSafeProjectKey } from './syncKeys';

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
 * Y-4: roofType ve roofAtticType alanlarının birbirleriyle ve eski kayıtlarla tutarlı
 * kalmasını sağlayan yardımcı fonksiyon.
 */
export function resolveSynchronizedRoofAndAtticType(
  prev: Pick<ProjectParams, 'roofType' | 'roofAtticType'>,
  updates: Partial<Pick<ProjectParams, 'roofType' | 'roofAtticType'>>
): {
  roofType: RoofType;
  roofAtticType?: 'independent' | 'duplex_unified';
} {
  const roofExplicit = Object.prototype.hasOwnProperty.call(updates, 'roofType') && updates.roofType !== undefined;
  const atticExplicit =
    Object.prototype.hasOwnProperty.call(updates, 'roofAtticType') && updates.roofAtticType !== undefined;

  let nextRoofType: RoofType = (updates.roofType || prev.roofType || 'gable') as RoofType;
  let nextAtticType: 'independent' | 'duplex_unified' | undefined =
    updates.roofAtticType !== undefined ? updates.roofAtticType : prev.roofAtticType;

  if (roofExplicit && !atticExplicit) {
    if (nextRoofType === 'mansard') {
      nextAtticType = 'independent';
    } else if (nextRoofType === 'duplex') {
      nextAtticType = 'duplex_unified';
    } else {
      // 'gable' veya 'flat' çatı tiplerinde roofAtticType geçerli bir alt seçenek değildir; temizle
      nextAtticType = undefined;
    }
  } else if (atticExplicit && !roofExplicit) {
    if (nextAtticType === 'independent' && (prev.roofType === 'duplex' || prev.roofType === 'mansard')) {
      nextRoofType = 'mansard';
      nextAtticType = 'independent';
    } else if (nextAtticType === 'duplex_unified' && (prev.roofType === 'mansard' || prev.roofType === 'duplex')) {
      nextRoofType = 'duplex';
      nextAtticType = 'duplex_unified';
    } else if (prev.roofType !== 'mansard' && prev.roofType !== 'duplex') {
      nextAtticType = undefined;
    }
  } else if (roofExplicit && atticExplicit) {
    if (nextRoofType === 'mansard') {
      nextAtticType = 'independent';
    } else if (nextRoofType === 'duplex') {
      nextAtticType = 'duplex_unified';
    } else {
      nextAtticType = undefined;
    }
  } else {
    if (nextRoofType === 'mansard') {
      nextAtticType = 'independent';
    } else if (nextRoofType === 'duplex') {
      nextAtticType = 'duplex_unified';
    } else {
      nextAtticType = undefined;
    }
  }

  return {
    roofType: nextRoofType,
    roofAtticType: nextAtticType,
  };
}

type FlatUnitCategory = 'basement' | 'shop' | 'residential';

function getFlatUnitCategory(flat: Partial<FlatItem>): FlatUnitCategory {
  if (
    flat.flatType === 'basement_shop' ||
    flat.flatType === 'basement_flat' ||
    (flat.floorNumber !== undefined && flat.floorNumber < 0)
  ) {
    return 'basement';
  }
  if (flat.flatType === 'shop') {
    return 'shop';
  }
  return 'residential';
}

function isAutoGeneratedDefaultFlatName(name: string | undefined, id: number | undefined): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (id !== undefined) {
    const defaultsForId = [
      `Kat Maliki ${id}`,
      `Dükkan ${id}`,
      `Bodrum Ticari İşyeri ${id}`,
      `Bodrum Daire ${id}`,
      `Daire ${id}`,
    ];
    if (defaultsForId.some((d) => d.toLocaleLowerCase('tr-TR') === trimmed.toLocaleLowerCase('tr-TR'))) {
      return true;
    }
  }
  return /^(kat maliki|dükkan|dukkan|bodrum ticari işyeri|bodrum daire)\s+\d+$/i.test(trimmed);
}

function isAutoGeneratedDefaultFlatTc(tc: string | undefined, id: number | undefined): boolean {
  if (!tc) return true;
  const trimmed = tc.trim();
  if (!trimmed) return true;
  if (id !== undefined && trimmed === `1000000000${id}`) return true;
  return /^1000000000\d+$/.test(trimmed);
}

function scalePolygonPointsToTargetArea(
  points: readonly PolygonPoint[],
  targetArea: number
): PolygonPoint[] {
  const currentArea = calculatePolygonArea([...points]);
  if (currentArea <= 0 || targetArea <= 0) {
    return [...points];
  }
  const factor = Math.sqrt(targetArea / currentArea);
  return points.map((pt) => ({
    ...pt,
    x: Math.round(pt.x * factor * 100) / 100,
    y: Math.round(pt.y * factor * 100) / 100,
  }));
}

/**
 * Y-5: Yeni bağımsız bölüm eklenirken veya kat/ünite dağılımı değişirken mevcut dairelerin
 * manuel alan (area), arsa payı (landShareNumerator), malik (ownerId, name, tc) ve finansal
 * verilerini kategori sırasına göre koruyan saf yardımcı fonksiyon.
 */
export function preserveExistingFlatsOnSynchronize(
  sourceFlats: readonly FlatItem[] | undefined,
  synchronizedFlats: readonly FlatItem[]
): FlatItem[] {
  if (!Array.isArray(sourceFlats) || sourceFlats.length === 0) {
    return [...synchronizedFlats];
  }

  const sourceByCategory: Record<FlatUnitCategory, FlatItem[]> = {
    basement: [],
    shop: [],
    residential: [],
  };
  for (const flat of sourceFlats) {
    if (!flat) continue;
    sourceByCategory[getFlatUnitCategory(flat)].push(flat);
  }

  const syncBasementCount = synchronizedFlats.filter(
    (f) => getFlatUnitCategory(f) === 'basement'
  ).length;
  const syncShopCount = synchronizedFlats.filter(
    (f) => getFlatUnitCategory(f) === 'shop'
  ).length;

  const prefixCountsShifted =
    sourceByCategory.basement.length !== syncBasementCount ||
    sourceByCategory.shop.length !== syncShopCount;

  const catIndex: Record<FlatUnitCategory, number> = {
    basement: 0,
    shop: 0,
    residential: 0,
  };

  return synchronizedFlats.map((syncFlat) => {
    const cat = getFlatUnitCategory(syncFlat);
    const idxInCat = catIndex[cat]++;

    const existingFlat = !prefixCountsShifted
      ? sourceFlats.find((f) => f.id === syncFlat.id && getFlatUnitCategory(f) === cat) ||
        sourceByCategory[cat][idxInCat]
      : sourceByCategory[cat][idxInCat];

    if (!existingFlat) {
      return syncFlat;
    }

    const idShifted = existingFlat.id !== syncFlat.id;
    const preservedName =
      idShifted && isAutoGeneratedDefaultFlatName(existingFlat.name, existingFlat.id)
        ? syncFlat.name
        : existingFlat.name || syncFlat.name;

    const preservedTc =
      idShifted && isAutoGeneratedDefaultFlatTc(existingFlat.tc, existingFlat.id)
        ? syncFlat.tc
        : existingFlat.tc || syncFlat.tc;

    const preservedArea =
      existingFlat.area !== undefined && existingFlat.area > 0
        ? existingFlat.area
        : syncFlat.area;

    const preservedLandShareNum =
      existingFlat.landShareNumerator !== undefined && existingFlat.landShareNumerator > 0
        ? existingFlat.landShareNumerator
        : syncFlat.landShareNumerator;

    return {
      ...syncFlat,
      name: preservedName,
      tc: preservedTc,
      ownerId: existingFlat.ownerId !== undefined ? existingFlat.ownerId : syncFlat.ownerId,
      area: preservedArea,
      landShareNumerator: preservedLandShareNum,
      landShareDenominator:
        existingFlat.landShareDenominator !== undefined
          ? existingFlat.landShareDenominator
          : syncFlat.landShareDenominator,
      useTransformationCredit:
        existingFlat.useTransformationCredit !== undefined
          ? existingFlat.useTransformationCredit
          : syncFlat.useTransformationCredit,
      useGrant: existingFlat.useGrant !== undefined ? existingFlat.useGrant : syncFlat.useGrant,
      useCredit: existingFlat.useCredit !== undefined ? existingFlat.useCredit : syncFlat.useCredit,
      downPayment:
        existingFlat.downPayment !== undefined ? existingFlat.downPayment : syncFlat.downPayment,
      salePrice: existingFlat.salePrice !== undefined ? existingFlat.salePrice : syncFlat.salePrice,
      manualUnitPrice:
        existingFlat.manualUnitPrice !== undefined
          ? existingFlat.manualUnitPrice
          : syncFlat.manualUnitPrice,
      serefiyeMultiplier:
        existingFlat.serefiyeMultiplier !== undefined
          ? existingFlat.serefiyeMultiplier
          : syncFlat.serefiyeMultiplier,
      facade: existingFlat.facade !== undefined ? existingFlat.facade : syncFlat.facade,
      isContractorShare:
        existingFlat.isContractorShare !== undefined
          ? existingFlat.isContractorShare
          : syncFlat.isContractorShare,
    };
  });
}

/**
 * K-1, K-4, Y-4, Y-5 & Y-6: Fonksiyonel state güncellemesi için önceki ProjectParams ile gelen
 * kısmi veya tam güncellemeyi birleştirip bağımsız bölümleri, müteahhit paylarını, poligon/taban
 * geometrisini ve çatı/dükkan parametrelerini atomik olarak senkronize eden saf yardımcı fonksiyon.
 */
export function applyCalculatorParamsUpdate(
  prevParams: ProjectParams,
  newParamsOrUpdates: ProjectParams | Partial<ProjectParams>
): ProjectParams {
  const syncedRoof = resolveSynchronizedRoofAndAtticType(prevParams, newParamsOrUpdates);

  const newParams: ProjectParams = {
    ...prevParams,
    ...newParamsOrUpdates,
    roofType: syncedRoof.roofType,
    roofAtticType: syncedRoof.roofAtticType,
  };

  if (newParams.hasGroundFloorShop && (newParams.shopLocation === 'basement' || newParams.shopLocation === 'both')) {
    newParams.basementCount = Math.max(1, newParams.basementCount ?? 1);
  }

  // Y-6: Poligon / parsel geometrisi ile baseBuildArea senkronizasyonu
  const baseAreaExplicitlyUpdated = Object.prototype.hasOwnProperty.call(
    newParamsOrUpdates,
    'baseBuildArea'
  );
  const polygonExplicitlyUpdated = Object.prototype.hasOwnProperty.call(
    newParamsOrUpdates,
    'polygonPoints'
  );
  const dimensionsExplicitlyUpdated = [
    'facadeWidth',
    'facadeDepth',
    'backFacadeLength',
    'leftFacadeLength',
  ].some((k) => Object.prototype.hasOwnProperty.call(newParamsOrUpdates, k));
  const lShapeOrCustomExplicitlyUpdated = [
    'lShapeFrontMain',
    'lShapeDepthMain',
    'lShapeRecessFront',
    'lShapeRecessDepth',
    'customFacades',
  ].some((k) => Object.prototype.hasOwnProperty.call(newParamsOrUpdates, k));
  const modeExplicitlyUpdated = Object.prototype.hasOwnProperty.call(
    newParamsOrUpdates,
    'footprintInputMode'
  );

  const polygonChanged =
    polygonExplicitlyUpdated &&
    newParams.polygonPoints !== prevParams.polygonPoints &&
    Array.isArray(newParams.polygonPoints) &&
    newParams.polygonPoints.length >= 3;
  const baseAreaChanged =
    baseAreaExplicitlyUpdated && newParams.baseBuildArea !== prevParams.baseBuildArea;
  const dimensionsChanged =
    dimensionsExplicitlyUpdated &&
    (newParams.facadeWidth !== prevParams.facadeWidth ||
      newParams.facadeDepth !== prevParams.facadeDepth ||
      newParams.backFacadeLength !== prevParams.backFacadeLength ||
      newParams.leftFacadeLength !== prevParams.leftFacadeLength);
  const modeChanged =
    modeExplicitlyUpdated && newParams.footprintInputMode !== prevParams.footprintInputMode;

  if (
    newParams.footprintInputMode === 'polygonDraw' &&
    Array.isArray(newParams.polygonPoints) &&
    newParams.polygonPoints.length >= 3
  ) {
    if (baseAreaChanged && !polygonChanged && newParams.baseBuildArea > 0) {
      newParams.polygonPoints = scalePolygonPointsToTargetArea(
        newParams.polygonPoints,
        newParams.baseBuildArea
      );
    } else if (
      polygonChanged ||
      modeChanged ||
      !baseAreaChanged ||
      !newParams.baseBuildArea ||
      newParams.baseBuildArea <= 0
    ) {
      const polyArea = Math.round(calculatePolygonArea(newParams.polygonPoints) * 10) / 10;
      if (polyArea > 0) {
        newParams.baseBuildArea = polyArea;
      }
    }
  } else if (newParams.footprintInputMode === 'dimensions') {
    if ((dimensionsChanged || modeChanged) && !baseAreaChanged) {
      const fp = calculateFootprint('dimensions', newParams);
      if (fp.area > 0) {
        newParams.baseBuildArea = Math.round(fp.area * 10) / 10;
      }
    }
  } else if (
    (newParams.footprintInputMode === 'lShape' ||
      newParams.footprintInputMode === 'customFacades') &&
    (lShapeOrCustomExplicitlyUpdated || modeChanged) &&
    !baseAreaChanged
  ) {
    const fp = calculateFootprint(newParams.footprintInputMode, newParams);
    if (fp.area > 0) {
      newParams.baseBuildArea = Math.round(fp.area * 10) / 10;
    }
  }

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

  const sourceFlats = Array.isArray(newParams.flats) ? newParams.flats : prevParams.flats;

  // Önce temiz yapısal şablonu üret, ardından mevcut bağımsız bölümleri kendi kategorileriyle (bodrum/dükkan/konut) eşleştir
  const structuralFlats = synchronizeFlats(
    [],
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

  // Y-5: Mevcut bağımsız bölümlerin manuel alan, arsa payı ve malik verilerini kategori bazlı koru
  let synchronizedFlats = preserveExistingFlatsOnSynchronize(sourceFlats, structuralFlats);

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
    synchronizedFlats = syncFlatsContractorShareFlags(
      synchronizedFlats,
      sanitizedContractorIds
    );
  } else if (contractorIdsExplicitlyUpdated && flatsExplicitlyUpdated) {
    synchronizedFlats = syncFlatsContractorShareFlags(
      synchronizedFlats,
      sanitizedContractorIds
    );
  } else if (flatsExplicitlyUpdated && !contractorIdsExplicitlyUpdated) {
    const hasExplicitFlatFlags = synchronizedFlats.some(
      (f) => f.isContractorShare !== undefined
    );
    if (hasExplicitFlatFlags) {
      sanitizedContractorIds = sanitizeContractorFlatIds(
        synchronizedFlats.filter((f) => Boolean(f.isContractorShare)).map((f) => f.id),
        totalFlats
      );
    }
  } else {
    // Kategori kayması (örn. zemin dükkan veya bodrum ünite eklenmesi) olduğunda
    // dairelerdeki isContractorShare bayraklarıyla contractorFlatIds listesini senkron tut
    const sourceBasementCount = (sourceFlats || []).filter(
      (f) => getFlatUnitCategory(f) === 'basement'
    ).length;
    const sourceShopCount = (sourceFlats || []).filter(
      (f) => getFlatUnitCategory(f) === 'shop'
    ).length;
    const syncBasementCount = synchronizedFlats.filter(
      (f) => getFlatUnitCategory(f) === 'basement'
    ).length;
    const syncShopCount = synchronizedFlats.filter(
      (f) => getFlatUnitCategory(f) === 'shop'
    ).length;

    if (sourceBasementCount !== syncBasementCount || sourceShopCount !== syncShopCount) {
      const hasExplicitFlatFlags = synchronizedFlats.some((f) => Boolean(f.isContractorShare));
      if (hasExplicitFlatFlags) {
        sanitizedContractorIds = sanitizeContractorFlatIds(
          synchronizedFlats.filter((f) => Boolean(f.isContractorShare)).map((f) => f.id),
          totalFlats
        );
      }
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
 * Y-4: ProjectParams'tan BuildingModelParams'a canlı senkronizasyon yaparken
 * mansardFlatCount, shopArea ve roofType dahil tüm ortak mimari parametreleri
 * eksiksiz eşitleyen saf yardımcı fonksiyon.
 */
export function syncProjectParamsToBuildingModel(
  prevModel: BuildingModelParams,
  sanitizedParams: ProjectParams
): BuildingModelParams {
  const resFloors = sanitizedParams.hasGroundFloorShop
    ? Math.max(0, sanitizedParams.floorCount - 1)
    : sanitizedParams.floorCount;
  const totalFlats = sanitizedParams.flatCount;

  const fpSync = calculateFootprint(
    sanitizedParams.footprintInputMode || prevModel.footprintInputMode || 'directArea',
    sanitizedParams
  );
  const isDirectMode =
    !sanitizedParams.footprintInputMode || sanitizedParams.footprintInputMode === 'directArea';

  const newW = isDirectMode
    ? fpSync.effectiveWidth
    : sanitizedParams.facadeWidth || prevModel.facadeWidth;
  const newD = isDirectMode
    ? fpSync.effectiveDepth
    : sanitizedParams.facadeDepth || prevModel.facadeDepth;
  const newBackW = isDirectMode
    ? fpSync.effectiveWidth
    : sanitizedParams.backFacadeLength !== undefined
    ? sanitizedParams.backFacadeLength
    : prevModel.backFacadeLength ?? newW;
  const newLeftD = isDirectMode
    ? fpSync.effectiveDepth
    : sanitizedParams.leftFacadeLength !== undefined
    ? sanitizedParams.leftFacadeLength
    : prevModel.leftFacadeLength ?? newD;

  return {
    ...prevModel,
    footprintInputMode: sanitizedParams.footprintInputMode || prevModel.footprintInputMode,
    facadeWidth: newW,
    facadeDepth: newD,
    backFacadeLength: newBackW,
    leftFacadeLength: newLeftD,
    baseBuildArea: sanitizedParams.baseBuildArea,
    customFacadeCount: sanitizedParams.customFacadeCount || prevModel.customFacadeCount,
    customFacades: sanitizedParams.customFacades || prevModel.customFacades,
    lShapeFrontMain: sanitizedParams.lShapeFrontMain || prevModel.lShapeFrontMain,
    lShapeDepthMain: sanitizedParams.lShapeDepthMain || prevModel.lShapeDepthMain,
    lShapeRecessFront: sanitizedParams.lShapeRecessFront || prevModel.lShapeRecessFront,
    lShapeRecessDepth: sanitizedParams.lShapeRecessDepth || prevModel.lShapeRecessDepth,
    floorCount: sanitizedParams.floorCount,
    floorHeight: sanitizedParams.floorHeight || prevModel.floorHeight || 2.9,
    elevatorCount:
      sanitizedParams.elevatorCount !== undefined
        ? sanitizedParams.elevatorCount
        : prevModel.elevatorCount,
    flatsPerFloor:
      sanitizedParams.flatsPerFloor ||
      Math.max(1, Math.round(totalFlats / Math.max(1, resFloors))),
    hasGroundFloorShop: !!sanitizedParams.hasGroundFloorShop,
    hasBasementShop:
      sanitizedParams.hasBasementShop !== undefined
        ? sanitizedParams.hasBasementShop
        : prevModel.hasBasementShop,
    basementPurpose:
      sanitizedParams.basementPurpose !== undefined
        ? sanitizedParams.basementPurpose
        : prevModel.basementPurpose,
    basementShopCount:
      sanitizedParams.basementShopCount !== undefined
        ? sanitizedParams.basementShopCount
        : prevModel.basementShopCount,
    shopLocation:
      sanitizedParams.shopLocation !== undefined
        ? sanitizedParams.shopLocation
        : prevModel.shopLocation,
    basementConfig:
      sanitizedParams.basementConfig !== undefined
        ? sanitizedParams.basementConfig
        : prevModel.basementConfig,
    shopCount: sanitizedParams.shopCount || 1,
    shopHeight: sanitizedParams.shopHeight || 3.8,
    shopArea:
      sanitizedParams.shopArea !== undefined ? sanitizedParams.shopArea : prevModel.shopArea,
    contractorFlatIds: sanitizedParams.contractorFlatIds,
    showContractorShare3D: sanitizedParams.showContractorShare3D,
    contractorShareRate: sanitizedParams.contractorShareRate,
    projectModel: sanitizedParams.projectModel,
    flatCount: totalFlats,
    roomType: sanitizedParams.roomType || prevModel.roomType,
    hasCantilever: sanitizedParams.hasCantilever,
    cantileverDepth: sanitizedParams.cantileverDepth,
    cantileverDirection: sanitizedParams.cantileverDirection,
    facadeCantilevers: sanitizedParams.facadeCantilevers || prevModel.facadeCantilevers,
    roofType: sanitizedParams.roofType || prevModel.roofType,
    mansardFlatCount:
      sanitizedParams.mansardFlatCount !== undefined
        ? sanitizedParams.mansardFlatCount
        : prevModel.mansardFlatCount,
    wallColor: sanitizedParams.wallColor || prevModel.wallColor,
    roofColor: sanitizedParams.roofColor || prevModel.roofColor,
    accentColor: sanitizedParams.accentColor || prevModel.accentColor,
    frameColor: sanitizedParams.frameColor || prevModel.frameColor,
    slabColor: sanitizedParams.slabColor || prevModel.slabColor,
    basementCount:
      sanitizedParams.basementCount !== undefined
        ? sanitizedParams.basementCount
        : prevModel.basementCount,
    facadeStyle: sanitizedParams.facadeStyle || prevModel.facadeStyle,
    balconyDepth:
      sanitizedParams.balconyDepth !== undefined
        ? sanitizedParams.balconyDepth
        : prevModel.balconyDepth,
    polygonPoints: sanitizedParams.polygonPoints || prevModel.polygonPoints,
    facadeConfigs: sanitizedParams.facadeConfigs || prevModel.facadeConfigs,
    mainEntranceFacadeIndex:
      sanitizedParams.mainEntranceFacadeIndex !== undefined
        ? sanitizedParams.mainEntranceFacadeIndex
        : prevModel.mainEntranceFacadeIndex,
    flats: sanitizedParams.flats || prevModel.flats,
  };
}

/**
 * K-4 & Y-4: 3D Bina Modeli (BuildingModelParams) üzerinden yapılan güncellemeleri
 * ProjectParams'a uygularken contractorFlatIds, flats[].isContractorShare,
 * mansardFlatCount, roofAtticType ve shopArea alanlarını aynı işlemde senkronize eden
 * saf yardımcı fonksiyon.
 */
export function applyBuildingModelUpdateToProjectParams(
  prev: ProjectParams,
  updates: Partial<BuildingModelParams> & Partial<Pick<ProjectParams, 'roofAtticType'>>
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
  const nextShopArea =
    updates.shopArea !== undefined ? updates.shopArea : prev.shopArea;
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

  const syncedRoof = resolveSynchronizedRoofAndAtticType(prev, updates);
  const roofType = syncedRoof.roofType;
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
    ...(nextShopArea !== undefined ? { shopArea: nextShopArea } : {}),
    roofType: roofType,
    roofAtticType: syncedRoof.roofAtticType,
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
    updates.roofAtticType === undefined &&
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
    roofType: roofType,
    roofAtticType: syncedRoof.roofAtticType,
    ...(nextMansardFlatCount !== undefined ? { mansardFlatCount: nextMansardFlatCount } : {}),
    ...(nextShopArea !== undefined ? { shopArea: nextShopArea } : {}),
    flats: synchronizedFlats,
    contractorFlatIds: sanitizedContractorIds,
  };
}

// ============================================================================
// Y-1 & 2B-1: METRAJ / MALİYET TUTARLILIĞI (KONFOR, DÜKKAN MUTFAK/KAPI, ORTAK)
// ============================================================================

export interface ComfortTakeoffItem {
  id: string;
  category: 'kaba' | 'ince' | 'tesisat' | 'resmi' | 'ortak';
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  laborShare: number;
}

/**
 * 2B-1: calculatorEngine.ts içindeki ticari dükkan mutfak (%20) ve kapı (%40)
 * formülleriyle birebir eşleşen ince inşaat mutfak (i5 / i5_shop) ve kapı (i6 / i6_shop)
 * metraj kalemlerini üretir. Konut ve dükkan miktarlarını birbirine karıştırmaz.
 */
export function buildKitchenAndDoorTakeoffItems(
  params: Pick<ProjectParams, 'priceKitchen' | 'priceDoors'>,
  results: Pick<CalculationResult, 'residentialUnitsCount' | 'shopUnitsCount'>,
  flatCount: number,
  inceFactor: number
): ComfortTakeoffItem[] {
  const safeFlatCount = Math.max(1, flatCount || 1);
  const totalShopUnits = Math.max(0, results.shopUnitsCount ?? 0);
  const residentialUnitsCount =
    results.residentialUnitsCount !== undefined
      ? Math.max(0, results.residentialUnitsCount)
      : Math.max(0, safeFlatCount - totalShopUnits);

  const safeKitchenPrice = Math.max(0, params.priceKitchen ?? 135000);
  const safeDoorsPrice = Math.max(0, params.priceDoors ?? 85000);

  const effKitchenPrice = Math.round(safeKitchenPrice * inceFactor * 100) / 100;
  const effDoorsPrice = Math.round(safeDoorsPrice * inceFactor * 100) / 100;

  const shopBaseKitchenPrice = Math.round(safeKitchenPrice * 0.2);
  const shopBaseDoorsPrice = Math.round(safeDoorsPrice * 0.4);
  const effShopKitchenPrice = Math.round(shopBaseKitchenPrice * inceFactor * 100) / 100;
  const effShopDoorsPrice = Math.round(shopBaseDoorsPrice * inceFactor * 100) / 100;

  const items: ComfortTakeoffItem[] = [];

  if (totalShopUnits === 0) {
    items.push(
      {
        id: 'i5',
        category: 'ince',
        name: 'Lake / Akrilik Mutfak Dolabı & Tezgah',
        unit: 'Daire',
        quantity: residentialUnitsCount,
        unitPrice: effKitchenPrice,
        total: Math.round(residentialUnitsCount * effKitchenPrice * 100) / 100,
        laborShare: 20,
      },
      {
        id: 'i6',
        category: 'ince',
        name: 'Ahşap Panel & Çelik Kapı Setleri',
        unit: 'Daire',
        quantity: residentialUnitsCount,
        unitPrice: effDoorsPrice,
        total: Math.round(residentialUnitsCount * effDoorsPrice * 100) / 100,
        laborShare: 20,
      }
    );
    return items;
  }

  // Konut mutfak kalemi
  if (residentialUnitsCount > 0) {
    items.push({
      id: 'i5',
      category: 'ince',
      name: 'Lake / Akrilik Mutfak Dolabı & Tezgah (Konut)',
      unit: 'Daire',
      quantity: residentialUnitsCount,
      unitPrice: effKitchenPrice,
      total: Math.round(residentialUnitsCount * effKitchenPrice * 100) / 100,
      laborShare: 20,
    });
  }

  // Ticari dükkan mutfak/çay ocağı kalemi (%20 katsayı)
  items.push({
    id: 'i5_shop',
    category: 'ince',
    name: 'Ticari Dükkan Çay Ocağı / Mini Mutfak Nişi (%20 Ticari Katsayı)',
    unit: 'Dükkan',
    quantity: totalShopUnits,
    unitPrice: effShopKitchenPrice,
    total: Math.round(totalShopUnits * effShopKitchenPrice * 100) / 100,
    laborShare: 20,
  });

  // Konut kapı kalemi
  if (residentialUnitsCount > 0) {
    items.push({
      id: 'i6',
      category: 'ince',
      name: 'Ahşap Panel & Çelik Kapı Setleri (Konut)',
      unit: 'Daire',
      quantity: residentialUnitsCount,
      unitPrice: effDoorsPrice,
      total: Math.round(residentialUnitsCount * effDoorsPrice * 100) / 100,
      laborShare: 20,
    });
  }

  // Ticari dükkan kapı kalemi (%40 katsayı)
  items.push({
    id: 'i6_shop',
    category: 'ince',
    name: 'Ticari Dükkan Giriş & WC Kapı Doğrama Seti (%40 Ticari Katsayı)',
    unit: 'Dükkan',
    quantity: totalShopUnits,
    unitPrice: effShopDoorsPrice,
    total: Math.round(totalShopUnits * effShopDoorsPrice * 100) / 100,
    laborShare: 20,
  });

  return items;
}

/**
 * 2B-1: Ortak kategori ('ortak') altındaki manualEqualExtraCost (o1) ve
 * inflationBufferAmount (o_inflation_buffer) kalemlerini üretir.
 */
export function buildCommonCategoryTakeoffItems(
  params: Pick<
    ProjectParams,
    | 'manualEqualExtraCost'
    | 'manualEqualExtraCostLabel'
    | 'hasInflationBuffer'
    | 'inflationBufferRate'
  >,
  results: Pick<CalculationResult, 'inflationBufferAmount'>
): ComfortTakeoffItem[] {
  const safeManualExtraCost = Math.max(
    0,
    Number.isFinite(params.manualEqualExtraCost) ? params.manualEqualExtraCost || 0 : 0
  );

  return [
    {
      id: 'o1',
      category: 'ortak',
      name: params.manualEqualExtraCostLabel || 'Ortak Ekstra Malik Gideri',
      unit: 'Lump-sum',
      quantity: 1,
      unitPrice: safeManualExtraCost,
      total: safeManualExtraCost,
      laborShare: 0,
    },
    ...(params.hasInflationBuffer && results.inflationBufferAmount
      ? [
          {
            id: 'o_inflation_buffer',
            category: 'ortak' as const,
            name: `Fiyat İstikrar Sigortası / Enflasyon Risk Payı (%${params.inflationBufferRate || 15})`,
            unit: 'Risk Payı',
            quantity: 1,
            unitPrice: results.inflationBufferAmount,
            total: results.inflationBufferAmount,
            laborShare: 50,
          },
        ]
      : []),
  ];
}

/**
 * 2B-1: Metraj cetvelindeki tüm kategorilerin ('kaba', 'ince', 'tesisat', 'resmi', 'ortak')
 * toplam tutar, işçilik ve malzeme kırılımlarını çift sayım olmadan hesaplar.
 */
export function computeTakeoffCategoryTotals(items: readonly ComfortTakeoffItem[]): {
  roughCost: number;
  fineCost: number;
  systemsCost: number;
  officialCostCombined: number;
  commonCost: number;
  roughLabor: number;
  roughMaterial: number;
  fineLabor: number;
  fineMaterial: number;
  systemsLabor: number;
  systemsMaterial: number;
  officialLabor: number;
  officialMaterial: number;
  commonLabor: number;
  commonMaterial: number;
  totalSum: number;
  totalLabor: number;
  totalMaterial: number;
} {
  const sumByCategory = (cat: ComfortTakeoffItem['category']) =>
    items.filter((i) => i.category === cat).reduce((sum, i) => sum + i.total, 0);

  const laborByCategory = (cat: ComfortTakeoffItem['category']) =>
    items
      .filter((i) => i.category === cat)
      .reduce((sum, i) => sum + (i.total * i.laborShare) / 100, 0);

  const roughCost = sumByCategory('kaba');
  const fineCost = sumByCategory('ince');
  const systemsCost = sumByCategory('tesisat');
  const officialCostCombined = sumByCategory('resmi');
  const commonCost = sumByCategory('ortak');

  const roughLabor = laborByCategory('kaba');
  const roughMaterial = Math.max(0, roughCost - roughLabor);

  const fineLabor = laborByCategory('ince');
  const fineMaterial = Math.max(0, fineCost - fineLabor);

  const systemsLabor = laborByCategory('tesisat');
  const systemsMaterial = Math.max(0, systemsCost - systemsLabor);

  const officialLabor = laborByCategory('resmi');
  const officialMaterial = Math.max(0, officialCostCombined - officialLabor);

  const commonLabor = laborByCategory('ortak');
  const commonMaterial = Math.max(0, commonCost - commonLabor);

  const totalSum = roughCost + fineCost + systemsCost + officialCostCombined + commonCost;
  const totalLabor = roughLabor + fineLabor + systemsLabor + officialLabor + commonLabor;
  const totalMaterial =
    roughMaterial + fineMaterial + systemsMaterial + officialMaterial + commonMaterial;

  return {
    roughCost,
    fineCost,
    systemsCost,
    officialCostCombined,
    commonCost,
    roughLabor,
    roughMaterial,
    fineLabor,
    fineMaterial,
    systemsLabor,
    systemsMaterial,
    officialLabor,
    officialMaterial,
    commonLabor,
    commonMaterial,
    totalSum,
    totalLabor,
    totalMaterial,
  };
}

/**
 * Y-1: Hesaplama motorunun (calculatorEngine.ts) ürettiği 10 konfor/yenilik
 * maliyeti kalemini CostDetailsTab metraj ve maliyet listesi için tekil ve
 * eksiksiz biçimde üretir (bathroomHumidityFanCost dahil, çift ekleme olmadan).
 */
export function buildComfortSystemTakeoffItems(
  params: ProjectParams,
  results: CalculationResult,
  flatCount: number
): ComfortTakeoffItem[] {
  const safeFlatCount = Math.max(1, flatCount || 1);

  return [
    ...(params.hasUnderfloorHeating && results.underfloorHeatingCost
      ? [
          {
            id: 't5',
            category: 'tesisat' as const,
            name: 'Lüks Sulu Yerden Isıtma Sistemi (Konfor Upgrade)',
            unit: 'm²',
            quantity: Math.round(results.underfloorHeatingCost / 750),
            unitPrice: 750,
            total: results.underfloorHeatingCost,
            laborShare: 30,
          },
        ]
      : []),
    ...(params.hasWaterFiltration && results.waterFiltrationCost
      ? [
          {
            id: 't6',
            category: 'tesisat' as const,
            name: 'Bina Girişi Endüstriyel Merkezi Su Arıtma & Filtrasyon Sistemi',
            unit: 'Sistem',
            quantity: 1,
            unitPrice: results.waterFiltrationCost,
            total: results.waterFiltrationCost,
            laborShare: 10,
          },
        ]
      : []),
    ...(params.hasAcOption && results.acCostTotal
      ? [
          {
            id: 't7',
            category: 'tesisat' as const,
            name: `A++ Inverter Klima Sistemi (${results.acBtuInfo || '18.000 BTU/h'}) - Salon Konfor Paketi`,
            unit: 'Daire',
            quantity: results.acUnitCount || safeFlatCount,
            unitPrice:
              results.acCostPerFlat ||
              Math.round(results.acCostTotal / (results.acUnitCount || safeFlatCount || 1)),
            total: results.acCostTotal,
            laborShare: results.acLaborShare || 15,
          },
        ]
      : []),
    ...(params.hasThermostaticShowerMixer && results.thermostaticMixerCost
      ? [
          {
            id: 't8',
            category: 'tesisat' as const,
            name: 'Termostatik Banyo Duş Bataryası (38°C Emniyet Kilitli, Haşlanma Önleyici Kartuş)',
            unit: 'Daire/Banyo',
            quantity: results.thermostaticMixerUnits || safeFlatCount,
            unitPrice: results.thermostaticMixerPricePerFlat || 6500,
            total: results.thermostaticMixerCost,
            laborShare: 15,
          },
        ]
      : []),
    ...(params.hasLinearShowerDrain && results.linearDrainCost
      ? [
          {
            id: 't9',
            category: 'tesisat' as const,
            name: 'Duş Kabini Lineer Su Süzgeci / Duş Kanalı (304 Paslanmaz Çelik, Koku Çekvalfli, Etekli Yalıtım)',
            unit: 'Daire/Duş',
            quantity: results.linearDrainUnits || safeFlatCount,
            unitPrice: results.linearDrainPricePerFlat || 2800,
            total: results.linearDrainCost,
            laborShare: 25,
          },
        ]
      : []),
    ...(params.hasBathroomHumidityFan && results.bathroomHumidityFanCost
      ? [
          {
            id: 't9b',
            category: 'tesisat' as const,
            name: 'Nem Sensörlü Sessiz Banyo Havalandırma Fanı (Higrostatlı Otomatik Nem Tahliye, Geri Tepme Klapeli)',
            unit: 'Daire/Banyo',
            quantity: results.bathroomHumidityFanUnits || safeFlatCount,
            unitPrice: results.bathroomHumidityFanPricePerFlat || 3200,
            total: results.bathroomHumidityFanCost,
            laborShare: 20,
          },
        ]
      : []),
    ...(params.hasTouchlessKitchenFaucet && results.touchlessKitchenFaucetCost
      ? [
          {
            id: 't10',
            category: 'tesisat' as const,
            name: 'Fotoselli Mutfak & Banyo Batarya Seti (Temassız Kızılötesi Sensörlü, Hijyenik & Su Tasarruflu)',
            unit: 'Daire/Set',
            quantity: results.touchlessKitchenFaucetUnits || safeFlatCount,
            unitPrice: results.touchlessKitchenFaucetPricePerFlat || 8500,
            total: results.touchlessKitchenFaucetCost,
            laborShare: 15,
          },
        ]
      : []),
    ...(params.hasSmartDoorLock && results.smartDoorLockCost
      ? [
          {
            id: 't11',
            category: 'tesisat' as const,
            name: 'Motorlu & Biyometrik Akıllı Daire Kapısı Kilit Sistemi (Parmak İzli + Dokunmatik Şifreli + Mobil Uygulamalı DESİ/Kale/Smart)',
            unit: 'Daire Kapısı',
            quantity: results.smartDoorLockUnits || safeFlatCount,
            unitPrice: results.smartDoorLockPricePerFlat || 8500,
            total: results.smartDoorLockCost,
            laborShare: 15,
          },
        ]
      : []),
    ...(params.hasGenerator && results.generatorCost
      ? [
          {
            id: 't12',
            category: 'tesisat' as const,
            name: `Otomatik Dizel Jeneratör & ATS Transfer Panosu (${params.generatorScope === 'full_building' ? 'Tam Bina & Daireler' : 'Ortak Alan, Asansör & Hidrofor'}) (Aksa / Alimar / Teksan veya muadili)`,
            unit: 'Sistem',
            quantity: 1,
            unitPrice: results.generatorCost,
            total: results.generatorCost,
            laborShare: 15,
          },
        ]
      : []),
    ...(params.hasPorcelainCountertop && results.porcelainCountertopCost
      ? [
          {
            id: 'i8',
            category: 'ince' as const,
            name: '12-15mm Lüks Porselen Mutfak Tezgahı ve Alınlığı (Lamar / Neolith / Belenco veya muadili)',
            unit: 'Daire/Mutfak',
            quantity: results.porcelainCountertopUnits || safeFlatCount,
            unitPrice: results.porcelainCountertopPricePerFlat || 25000,
            total: results.porcelainCountertopCost,
            laborShare: 15,
          },
        ]
      : []),
  ];
}

// ============================================================================
// Y-2 & 2B-2: ON KONFOR ÖZELLİĞİNİN VE BODRUM ETİKETLERİNİN TEKNİK ŞARTNAME TUTARLILIĞI
// ============================================================================

export const SPECIFICATION_EMPTY_COMFORT_MESSAGE =
  'İlave opsiyonel konfor donanımı seçilmemiştir; standart teknik şartname donanımları uygulanacaktır.';

export type SpecificationComfortFeatureKey =
  | 'underfloorHeating'
  | 'waterFiltration'
  | 'acOption'
  | 'thermostaticShowerMixer'
  | 'linearShowerDrain'
  | 'bathroomHumidityFan'
  | 'touchlessKitchenFaucet'
  | 'smartDoorLock'
  | 'generator'
  | 'porcelainCountertop';

export interface SpecificationComfortFeatureItem {
  key: SpecificationComfortFeatureKey;
  icon: string;
  title: string;
  description: string;
  selected: boolean;
}

/**
 * Y-2: Uygulamadaki 10 konfor/yenilik özelliğinin tamamını tek bir ortak veri
 * kaynağından üretir. SpecificationTab ekran görünümü ve yazdırma HTML çıktısı
 * bu fonksiyonu kullanarak birebir aynı özellikleri ve seçilme durumlarını gösterir.
 */
export function getSpecificationComfortFeatures(
  params: ProjectParams,
  results?: Pick<CalculationResult, 'acBtuInfo'>
): SpecificationComfortFeatureItem[] {
  const acBtuLabel = results?.acBtuInfo || '18.000 BTU/h';
  const acScopeLabel =
    params.acScope === 'residential_only' ? '(Yalnızca Konutlar)' : '(Tüm Birimler)';
  const generatorScopeLabel =
    params.generatorScope === 'full_building'
      ? '(Tüm Bina & Daireler)'
      : '(Asansör, Hidrofor & Ortak Alanlar)';

  return [
    {
      key: 'underfloorHeating',
      icon: '🔥',
      title: 'Yerden Isıtma',
      description:
        'Sulu yerden ısıtma sistemi ile homojen zemin ısınması ve enerji tasarrufu.',
      selected: Boolean(params.hasUnderfloorHeating),
    },
    {
      key: 'waterFiltration',
      icon: '💧',
      title: 'Su Arıtma',
      description:
        'Bina şebeke girişinde merkezi klor, tortu ve kireç filtrasyon sistemi.',
      selected: Boolean(params.hasWaterFiltration),
    },
    {
      key: 'acOption',
      icon: '❄️',
      title: 'İklimlendirme',
      description: `A++ Inverter klima sistemi (${acBtuLabel}) ${acScopeLabel}.`,
      selected: Boolean(params.hasAcOption),
    },
    {
      key: 'thermostaticShowerMixer',
      icon: '🚿',
      title: 'Banyo Duş Bataryası',
      description:
        '38°C emniyet kilitli, haşlanma korumalı, anlık basınç dengeleyici ve %30 su tasarruflu termostatik duş bataryası seti (Yalnızca Konutlar — Dükkanlar Hariç).',
      selected: Boolean(params.hasThermostaticShowerMixer),
    },
    {
      key: 'linearShowerDrain',
      icon: '📐',
      title: 'Duş Drenajı',
      description:
        'Duş kabinlerinde 304 kalite paslanmaz çelik ızgaralı, koku önleyici çekvalfli hemzemin lineer duş süzgeci (Yalnızca Konutlar — Dükkanlar Hariç).',
      selected: Boolean(params.hasLinearShowerDrain),
    },
    {
      key: 'bathroomHumidityFan',
      icon: '🌀',
      title: 'Banyo Nem Havalandırma Fanı',
      description:
        'Banyo ve ıslak hacimlerde bağıl nem (%60-%90) yükseldiğinde otomatik devreye giren higrostat sensörlü, geri tepme klapeli sessiz buhar/küf tahliye fanı (Yalnızca Konutlar — Dükkanlar Hariç).',
      selected: Boolean(params.hasBathroomHumidityFan),
    },
    {
      key: 'touchlessKitchenFaucet',
      icon: '🚰',
      title: 'Mutfak & Banyo Bataryası',
      description:
        'Mutfak eviyesi ve banyo lavabosunda temassız kızılötesi sensörlü, hijyenik ve %40 su tasarruflu fotoselli akıllı batarya seti veya muadili.',
      selected: Boolean(params.hasTouchlessKitchenFaucet),
    },
    {
      key: 'smartDoorLock',
      icon: '🔑',
      title: 'Akıllı Daire Kapısı Kilidi',
      description:
        'Daire çelik giriş kapılarında parmak izli okuyucu, dokunmatik şifre tuş takımı ve mobil uygulama (Bluetooth/Wi-Fi) kontrollü DESİ / Kale / Smart veya muadili motorlu kilit sistemi.',
      selected: Boolean(params.hasSmartDoorLock),
    },
    {
      key: 'generator',
      icon: '⚡',
      title: 'Jeneratör Sistemi',
      description: `Aksa / Alimar / Teksan veya muadili otomatik transfer panolu (ATS) kabinli dizel jeneratör sistemi ${generatorScopeLabel}.`,
      selected: Boolean(params.hasGenerator),
    },
    {
      key: 'porcelainCountertop',
      icon: '🪨',
      title: 'Mutfak Tezgahı',
      description:
        'Lamar / Neolith / Belenco veya muadili 12-15mm lüks porselen plaka tezgah ve süpürgelik/alınlık kaplaması; sıcağa, yanmaya ve çizilmeye %100 dayanıklı leke tutmaz hijyenik yüzey (Konutlar).',
      selected: Boolean(params.hasPorcelainCountertop),
    },
  ];
}

/**
 * Y-2: Teknik şartnamede yalnızca seçili olan konfor/yenilik özelliklerini döndürür.
 */
export function getSelectedSpecificationComfortFeatures(
  params: ProjectParams,
  results?: Pick<CalculationResult, 'acBtuInfo'>
): SpecificationComfortFeatureItem[] {
  return getSpecificationComfortFeatures(params, results).filter((item) => item.selected);
}

/**
 * 2B-2: Teknik şartname (01. Proje Genel Metraj Künyesi ve 03. Cephe, Çatı ve Mimari Bileşenler)
 * için bodrum kat sözel özetlerini tek kaynaktan üretir.
 * - `basementPurpose === 'residential'` veya `basementConfig` içinde `residential` olduğunda
 *   `"Bodrum Dairesi"` ifadesini kullanır.
 * - Çoklu bodrum (`basementConfig`) kombinasyonlarını ekran, PDF ve yazdırma HTML çıktılarında
 *   birebir aynı mantıkla destekler.
 */
export function formatSpecificationBasementSummary(
  params: Pick<
    ProjectParams,
    'basementCount' | 'basementFloors' | 'basementPurpose' | 'basementShopCount' | 'basementConfig'
  >
): {
  shortSummary: string;
  htmlSummary: string;
  detailedSummary: string;
} {
  const safeBasementCount = Math.max(
    0,
    Number(params.basementCount ?? params.basementFloors ?? 1)
  );

  if (safeBasementCount <= 0) {
    return {
      shortSummary: 'Bodrum Kat Planlanmamıştır',
      htmlSummary: 'Bodrum Kat Yok',
      detailedSummary:
        'Bodrum kat planlanmamış olup sığınak ve teknik hacimler zemin katta yönetmelik şartlarına göre ayrılacaktır.',
    };
  }

  let residentialCount = 0;
  let commercialShopCount = 0;
  let hasParking = false;
  let hasShopDepot = false;
  let hasShelterDepot = false;

  if (Array.isArray(params.basementConfig) && params.basementConfig.length > 0) {
    for (const unit of params.basementConfig) {
      const count = Math.max(1, Number(unit.count) || 1);
      if (unit.type === 'residential') {
        residentialCount += count;
      } else if (unit.type === 'commercial_shop') {
        commercialShopCount += count;
      } else if (unit.type === 'parking') {
        hasParking = true;
      } else if (unit.type === 'shop_storage') {
        hasShopDepot = true;
      } else if (unit.type === 'shelter' || unit.type === 'storage') {
        hasShelterDepot = true;
      }
    }
  } else {
    const unitCount = Math.max(1, Number(params.basementShopCount) || 1);
    if (params.basementPurpose === 'residential') {
      residentialCount = unitCount;
    } else if (params.basementPurpose === 'commercial_shop') {
      commercialShopCount = unitCount;
    } else if (params.basementPurpose === 'parking') {
      hasParking = true;
    } else if (params.basementPurpose === 'shop') {
      hasShopDepot = true;
    } else {
      hasShelterDepot = true;
    }
  }

  const shortParts: string[] = [];
  const detailParts: string[] = [];

  if (residentialCount > 0) {
    shortParts.push(`${residentialCount} Adet Bodrum Dairesi`);
    detailParts.push(`${residentialCount} Adet Bodrum Dairesi (Konut Bağımsız Bölüm)`);
  }
  if (commercialShopCount > 0) {
    shortParts.push(`${commercialShopCount} Adet Ticari İşyeri / Dükkan`);
    detailParts.push(`${commercialShopCount} Adet Bodrum Kat Ticari İşyeri / Dükkan`);
  }
  if (hasParking) {
    shortParts.push('Kapalı Otopark');
    detailParts.push('kapalı otopark alanları');
  }
  if (hasShopDepot) {
    shortParts.push('Dükkan Deposu');
    detailParts.push('dükkan deposu');
  }

  if (shortParts.length === 0 || hasShelterDepot) {
    if (!hasParking && shortParts.length === 0) {
      shortParts.push('Sığınak, Su Deposu, Ortak Alan & Kapalı Otopark');
    } else {
      shortParts.push('Sığınak, Su Deposu & Ortak Alanlar');
    }
  } else {
    shortParts.push('Sığınak & Ortak Alanlar');
  }

  detailParts.push(
    'deprem ve sığınak yönetmeliğine tam uyumlu sığınak, su deposu (hidroforlu), yangın tesisatı ve ortak hacimler'
  );

  const joinedShort = shortParts.join(', ');
  const summaryText = `${safeBasementCount} Kat Bodrum (${joinedShort})`;
  const detailedSummary = `${safeBasementCount} Kat Bodrum İmalatı: ${detailParts.join(', ')}.`;

  return {
    shortSummary: summaryText,
    htmlSummary: summaryText,
    detailedSummary,
  };
}

/**
 * Y-2: Teknik şartname ekran tablosu ve yazdırma HTML tablosu için bağımsız bölüm
 * etiketlerini (bodrum dükkânı ve bodrum dairesi dahil) tek kaynaktan biçimlendirir.
 */
export function formatSpecificationUnitLabels(
  flat: Pick<FlatItem, 'id' | 'flatType' | 'floorNumber'>,
  flatsPerFloor: number = 2
): {
  floorText: string;
  unitTitle: string;
  unitTypeBadge: string;
} {
  const safeFlatsPerFloor = Math.max(1, flatsPerFloor || 2);

  let floorText: string;
  if (flat.floorNumber !== undefined) {
    if (flat.floorNumber === 0) {
      floorText = 'Zemin Kat';
    } else if (flat.floorNumber < 0) {
      floorText =
        flat.floorNumber === -1
          ? 'Bodrum Kat'
          : `${Math.abs(flat.floorNumber)}. Bodrum Kat`;
    } else {
      floorText = `${flat.floorNumber}. Kat`;
    }
  } else if (flat.flatType === 'shop') {
    floorText = 'Zemin Kat';
  } else if (flat.flatType === 'basement_shop' || flat.flatType === 'basement_flat') {
    floorText = 'Bodrum Kat';
  } else {
    floorText = `${Math.ceil(flat.id / safeFlatsPerFloor)}. Kat`;
  }

  let unitTitle: string;
  let unitTypeBadge: string;

  if (flat.flatType === 'basement_shop') {
    unitTitle = `🏬 Bodrum İşyeri ${flat.id}`;
    unitTypeBadge = 'Bodrum İşyeri';
  } else if (flat.flatType === 'basement_flat') {
    unitTitle = `🏠 Bodrum Daire ${flat.id}`;
    unitTypeBadge = 'Bodrum Dairesi';
  } else if (flat.flatType === 'shop') {
    unitTitle = `🏪 Dükkan ${flat.id}`;
    unitTypeBadge = 'Ticari Dükkan';
  } else if (flat.flatType === 'mansard') {
    unitTitle = `🏚️ Daire ${flat.id}`;
    unitTypeBadge = 'Mansart Katı';
  } else if (flat.flatType === 'duplex') {
    unitTitle = `🏠 Daire ${flat.id}`;
    unitTypeBadge = 'Çatı Dubleksi';
  } else {
    unitTitle = `🏠 Daire ${flat.id}`;
    unitTypeBadge = 'Konut';
  }

  return {
    floorText,
    unitTitle,
    unitTypeBadge,
  };
}

// ============================================================================
// Y-3 & 2B-3: 3D TEKLİF GÖRSELİNİN PROJEYE ÖZEL OLMASI VE İZOLASYONU
// ============================================================================

export const OFFER_3D_PREVIEW_GLOBAL_STORAGE_KEY = 'ab_yapi_offer_3d_preview';
export const OFFER_3D_PREVIEW_SCOPED_KEY_PREFIX = 'ab_yapi_offer_3d_preview_';

export interface Offer3DPreviewRecord {
  url: string;
  caption: string;
  projectKey?: string;
  projectAddress?: string;
  projectName?: string;
  updatedAt?: string;
}

/**
 * 2B-3: 3D teklif görseli için doğrulanabilir birincil proje kimliğini çözer.
 * - Hem `projectAddress` hem `projectName` varsa birleşik anahtar (`addr__name`) üretir;
 *   böylece aynı arsa adresindeki farklı proje alternatifleri birbirine karışmaz.
 * - Yalnızca adres veya yalnızca isim varsa mevcut olanı kullanır.
 * - İkisi de boşsa boş string döndürür.
 */
export function resolveOffer3DPreviewProjectId(project: {
  projectAddress?: string | null;
  projectName?: string | null;
}): string {
  const addr = (project.projectAddress || '').trim();
  const name = (project.projectName || '').trim();
  if (!addr && !name) {
    return '';
  }
  if (addr && name) {
    return getSafeProjectKey(`${addr}__${name}`);
  }
  return getSafeProjectKey(addr || name);
}

/**
 * 2B-3: Bir proje için 3D görsel aranırken kontrol edilecek aday storage anahtarlarını
 * öncelik sırasıyla döndürür:
 * 1) Birleşik anahtar (`addr__name`)
 * 2) Yalnızca adres anahtarı (`addr`) — eski kayıt uyumluluğu için
 * 3) Yalnızca proje adı anahtarı (`name`) — önce yalnızca `projectName` ile oluşturulup
 *    sonradan `projectAddress` eklenen projelerde görselin kaybolmaması için
 */
export function resolveOffer3DPreviewCandidateKeys(project: {
  projectAddress?: string | null;
  projectName?: string | null;
}): string[] {
  const addr = (project.projectAddress || '').trim();
  const name = (project.projectName || '').trim();
  const keys: string[] = [];

  if (addr && name) {
    const combined = getSafeProjectKey(`${addr}__${name}`);
    if (combined) keys.push(combined);
  }
  if (addr) {
    const addrKey = getSafeProjectKey(addr);
    if (addrKey && !keys.includes(addrKey)) keys.push(addrKey);
  }
  if (name) {
    const nameKey = getSafeProjectKey(name);
    if (nameKey && !keys.includes(nameKey)) keys.push(nameKey);
  }

  return keys;
}

/**
 * Y-3 & 2B-3: Kayıtlı bir 3D teklif görselinin verilen projeye ait olup olmadığını doğrular.
 * - Görsel verisi geçerli bir `data:image/` URL'i içermelidir.
 * - Aktif projenin doğrulanabilir bir kimliği (`projectAddress` veya `projectName`) olmalıdır.
 * - Görsel kaydında `projectKey`, `projectAddress` ve `projectName` alanlarının hiçbiri yoksa
 *   (kimliği doğrulanamayan eski kayıt), başka bir projeye sızmaması için `false` döner.
 * - Hem kayıtta hem aktif projede `projectAddress` VE `projectName` doluysa İKİSİNİN BİRLİKTE
 *   eşleşmesi zorunludur (aynı arsa adresindeki farklı proje alternatiflerini izole eder).
 * - Önce yalnızca `projectName` ile kaydedilmiş bir görsele daha sonra aynı projede
 *   `projectAddress` eklendiğinde `projectName` eşleşmesi üzerinden görseli korur.
 * - Eski kayıtta yalnızca `projectAddress` varsa adres eşleşmesi üzerinden doğrular.
 */
export function doesOffer3DPreviewMatchProject(
  record: unknown,
  project: {
    projectAddress?: string | null;
    projectName?: string | null;
  }
): record is Offer3DPreviewRecord {
  if (!record || typeof record !== 'object') return false;
  const candidate = record as Partial<Offer3DPreviewRecord>;
  if (typeof candidate.url !== 'string' || !candidate.url.startsWith('data:image/')) {
    return false;
  }

  const currentProjectKey = resolveOffer3DPreviewProjectId(project);
  if (!currentProjectKey) {
    return false;
  }

  const currentAddrNorm = (project.projectAddress || '').trim().toLocaleLowerCase('tr-TR');
  const currentNameNorm = (project.projectName || '').trim().toLocaleLowerCase('tr-TR');

  const recordKey = typeof candidate.projectKey === 'string' ? candidate.projectKey.trim() : '';
  const recordAddrNorm =
    typeof candidate.projectAddress === 'string'
      ? candidate.projectAddress.trim().toLocaleLowerCase('tr-TR')
      : '';
  const recordNameNorm =
    typeof candidate.projectName === 'string'
      ? candidate.projectName.trim().toLocaleLowerCase('tr-TR')
      : '';

  // Kimliği hiç olmayan eski görselleri hiçbir projede gösterme
  if (!recordKey && !recordAddrNorm && !recordNameNorm) {
    return false;
  }

  // 1) Hem kayıtta hem aktif projede hem adres hem proje adı varsa İKİSİ BİRLİKTE eşleşmelidir
  // (Aynı arsa adresindeki farklı proje alternatiflerinin görselleri birbirine karışmaz)
  if (currentAddrNorm && currentNameNorm && recordAddrNorm && recordNameNorm) {
    return currentAddrNorm === recordAddrNorm && currentNameNorm === recordNameNorm;
  }

  // 2) Her iki tarafta da adres varsa (ve en az bir tarafta proje adı yoksa) adresler eşleşmelidir
  if (currentAddrNorm && recordAddrNorm) {
    return currentAddrNorm === recordAddrNorm;
  }

  // 3) Her iki tarafta da proje adı varsa (ve en az bir tarafta adres yoksa, örn. önce yalnızca
  // projectName ile kaydedilip sonradan projectAddress eklenen proje) proje adları eşleşmelidir
  if (currentNameNorm && recordNameNorm) {
    return currentNameNorm === recordNameNorm;
  }

  // 4) Bir tarafta yalnızca adres, diğer tarafta yalnızca isim veya yalnızca projectKey varsa
  // güvenli anahtar üzerinden kontrol et
  const candidateKeys = resolveOffer3DPreviewCandidateKeys(project);
  if (recordKey) {
    return candidateKeys.includes(recordKey);
  }

  if (recordAddrNorm) {
    return candidateKeys.includes(getSafeProjectKey(recordAddrNorm));
  }

  if (recordNameNorm) {
    return candidateKeys.includes(getSafeProjectKey(recordNameNorm));
  }

  return false;
}

/**
 * Y-3 & 2B-3: 3D görseli aktif proje kimliğiyle ilişkilendirerek kaydeder.
 */
export function saveProjectScopedOffer3DPreview(
  input: {
    url: string;
    caption: string;
    projectAddress?: string | null;
    projectName?: string | null;
    updatedAt?: string;
  },
  storage?: Pick<Storage, 'setItem'>
): Offer3DPreviewRecord | null {
  if (!input.url || !input.url.startsWith('data:image/')) {
    return null;
  }

  const projectAddress = (input.projectAddress || '').trim();
  const projectName = (input.projectName || '').trim();
  const projectKey = resolveOffer3DPreviewProjectId({ projectAddress, projectName });

  const payload: Offer3DPreviewRecord = {
    url: input.url,
    caption: input.caption || '3D Mimari Model — 3D Perspektif Görünüm',
    projectKey: projectKey || undefined,
    projectAddress,
    projectName: projectName || undefined,
    updatedAt: input.updatedAt || new Date().toISOString(),
  };

  const targetStorage =
    storage || (typeof localStorage !== 'undefined' ? localStorage : undefined);

  if (targetStorage) {
    const serialized = JSON.stringify(payload);
    if (projectKey) {
      try {
        targetStorage.setItem(`${OFFER_3D_PREVIEW_SCOPED_KEY_PREFIX}${projectKey}`, serialized);
      } catch {
        // Ignore quota errors on scoped key and attempt global key fallback
      }
    }
    targetStorage.setItem(OFFER_3D_PREVIEW_GLOBAL_STORAGE_KEY, serialized);
  }

  return payload;
}

/**
 * Y-3 & 2B-3: Yalnızca aktif projeye ait olduğu doğrulanan 3D teklif görselini yükler.
 * - Önce birleşik anahtarı (`addr__name`), ardından adres ve isim aday anahtarlarını kontrol eder.
 * - Her aday kaydı `doesOffer3DPreviewMatchProject` ile doğrular; böylece aynı adresteki farklı
 *   isimli alternatifler reddedilirken, önce yalnızca isimle oluşturulup sonradan adres eklenen
 *   projenin kendi görseli korunur.
 */
export function loadProjectScopedOffer3DPreview(
  project: {
    projectAddress?: string | null;
    projectName?: string | null;
  },
  storage?: Pick<Storage, 'getItem'>
): Offer3DPreviewRecord | null {
  const candidateKeys = resolveOffer3DPreviewCandidateKeys(project);
  if (candidateKeys.length === 0) {
    return null;
  }

  const targetStorage =
    storage || (typeof localStorage !== 'undefined' ? localStorage : undefined);
  if (!targetStorage) {
    return null;
  }

  // 1. Önce aday proje anahtarlarını sırasıyla kontrol et ve kimlik doğrulamasından geçir
  for (const candidateKey of candidateKeys) {
    try {
      const scopedRaw = targetStorage.getItem(
        `${OFFER_3D_PREVIEW_SCOPED_KEY_PREFIX}${candidateKey}`
      );
      if (scopedRaw) {
        const parsed = JSON.parse(scopedRaw);
        if (doesOffer3DPreviewMatchProject(parsed, project)) {
          return parsed;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  // 2. Geriye dönük uyumluluk için global anahtarı kontrol et, ancak yalnızca
  // proje kimliği doğrulanabiliyorsa ve bu projeyle eşleşiyorsa kabul et
  try {
    const globalRaw = targetStorage.getItem(OFFER_3D_PREVIEW_GLOBAL_STORAGE_KEY);
    if (globalRaw) {
      const parsed = JSON.parse(globalRaw);
      if (doesOffer3DPreviewMatchProject(parsed, project)) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }

  return null;
}

/**
 * Y-5: Kat alanı eşitleme işleminde kullanıcının manuel girdiği arsa payı (landShareNumerator)
 * ve opsiyonel olarak manuel daire alanlarını (preserveManualAreas=true ise) koruyan saf yardımcı fonksiyon.
 */
export function equalizeFloorAreasPreservingManualValues(
  params: ProjectParams,
  options?: {
    preserveManualAreas?: boolean;
    preserveManualLandShares?: boolean;
  }
): FlatItem[] {
  const preserveManualAreas = options?.preserveManualAreas ?? false;
  const preserveManualLandShares = options?.preserveManualLandShares ?? true;

  const syncedParams = applyCalculatorParamsUpdate(params, {});
  const footprintResult = calculateFootprint(syncedParams.footprintInputMode, syncedParams);
  const baseArea =
    syncedParams.baseBuildArea && syncedParams.baseBuildArea > 0
      ? syncedParams.baseBuildArea
      : footprintResult.area;
  const cantileverInfo = calculateCantileverDetails(syncedParams, baseArea, footprintResult);
  const upperFloorArea = cantileverInfo.upperFloorArea;

  const flatsPerFloor = Math.max(1, syncedParams.flatsPerFloor || 2);
  const floorCount = Math.max(1, syncedParams.floorCount || 5);
  const hasShop = Boolean(syncedParams.hasGroundFloorShop);
  const shopCount = hasShop ? Math.max(1, syncedParams.shopCount || 1) : 0;

  const activeBasementCount =
    syncedParams.basementCount !== undefined ? syncedParams.basementCount : 1;
  let activeBasementUnitCount = 0;
  if (activeBasementCount > 0) {
    if (syncedParams.basementConfig && syncedParams.basementConfig.length > 0) {
      activeBasementUnitCount = syncedParams.basementConfig
        .filter((u) => u.type === 'commercial_shop' || u.type === 'residential')
        .reduce((acc, u) => acc + u.count, 0);
    } else if (
      syncedParams.basementPurpose === 'commercial_shop' ||
      syncedParams.basementPurpose === 'residential'
    ) {
      activeBasementUnitCount = Math.max(1, syncedParams.basementShopCount || 1);
    }
  }

  const groundResFlatAvg = Math.max(10, Math.round(baseArea / flatsPerFloor));
  const upperFlatAvg = Math.max(10, Math.round(upperFloorArea / flatsPerFloor));
  const shopAvg = hasShop ? Math.max(10, Math.round(baseArea / Math.max(1, shopCount))) : upperFlatAvg;
  const basementUnitAvg =
    activeBasementUnitCount > 0
      ? Math.max(10, Math.round(baseArea / Math.max(1, activeBasementUnitCount)))
      : shopAvg;

  const mansardUnits = (syncedParams.flats || []).filter((f) => f.flatType === 'mansard');
  const mansardCount = Math.max(1, mansardUnits.length || syncedParams.mansardFlatCount || 1);
  const mansardAreaShare = Math.max(10, Math.round((upperFloorArea * 0.7) / mansardCount));

  const originalFlats = Array.isArray(params.flats) ? params.flats : [];

  return (syncedParams.flats || []).map((flat, idx) => {
    const rawOriginal = originalFlats.find((f) => f.id === flat.id) || originalFlats[idx];

    let targetFloor = flat.floorNumber;
    if (flat.flatType === 'mansard') {
      targetFloor = floorCount;
    } else if (flat.flatType === 'shop') {
      targetFloor = 0;
    } else if (flat.flatType === 'basement_shop' || flat.flatType === 'basement_flat') {
      targetFloor = -1;
    } else if (targetFloor === undefined) {
      const resIdx = Math.max(0, idx - activeBasementUnitCount - shopCount);
      targetFloor = 1 + Math.floor(resIdx / flatsPerFloor);
    }

    let equalArea = upperFlatAvg;
    if (flat.flatType === 'basement_shop' || flat.flatType === 'basement_flat') {
      equalArea = basementUnitAvg;
    } else if (flat.flatType === 'shop') {
      equalArea = shopAvg;
    } else if (flat.flatType === 'mansard') {
      equalArea = mansardAreaShare;
    } else if (targetFloor === 1 && !hasShop) {
      equalArea = groundResFlatAvg;
    } else {
      equalArea = upperFlatAvg;
    }

    const oldArea = rawOriginal?.area ?? flat.area ?? equalArea;
    const oldShare = rawOriginal?.landShareNumerator ?? flat.landShareNumerator;
    const hadCustomManualLandShare =
      oldShare !== undefined &&
      oldShare > 0 &&
      oldShare !== Math.round(oldArea * 10) &&
      oldShare !== Math.round(equalArea * 10);

    const nextArea =
      preserveManualAreas && rawOriginal?.area !== undefined && rawOriginal.area > 0
        ? rawOriginal.area
        : equalArea;

    const nextLandShareNumerator =
      preserveManualLandShares &&
      oldShare !== undefined &&
      oldShare > 0 &&
      (preserveManualAreas || hadCustomManualLandShare)
        ? oldShare
        : Math.round(nextArea * 10);

    return {
      ...flat,
      floorNumber: targetFloor,
      area: nextArea,
      landShareNumerator: nextLandShareNumerator,
    };
  });
}

export interface ProjectZoningRatios {
  landArea: number;
  baseArea: number;
  totalConstructionArea: number;
  taksPercent: number;
  kaksRatio: number;
}

/**
 * Y-6: Arsa alanı, poligon/taban oturumu, konsol çıkma ve çatı/mansart/dubleks alanlarıyla
 * tam senkronize TAKS (%) ve KAKS (Emsal) oranlarını hesaplayan saf yardımcı fonksiyon.
 */
export function calculateProjectZoningRatios(
  params: ProjectParams,
  results?: Pick<CalculationResult, 'baseArea' | 'totalArea'> | null
): ProjectZoningRatios {
  const landArea = Math.max(0, Number(params.landArea) || 0);
  const footprintResult = calculateFootprint(params.footprintInputMode, params);

  let baseArea = Number(params.baseBuildArea) || 0;
  if (
    params.footprintInputMode === 'polygonDraw' &&
    Array.isArray(params.polygonPoints) &&
    params.polygonPoints.length >= 3
  ) {
    const polyArea = Math.round(calculatePolygonArea(params.polygonPoints) * 10) / 10;
    if (polyArea > 0) {
      baseArea = polyArea;
    }
  } else if (
    params.footprintInputMode === 'dimensions' ||
    params.footprintInputMode === 'lShape' ||
    params.footprintInputMode === 'customFacades'
  ) {
    if (footprintResult.area > 0) {
      baseArea = Math.round(footprintResult.area * 10) / 10;
    }
  }

  if (!baseArea || baseArea <= 0) {
    baseArea = results?.baseArea || footprintResult.area || 0;
  }

  const cantileverInfo = calculateCantileverDetails(params, baseArea, footprintResult);
  const upperFloorArea = cantileverInfo.upperFloorArea;
  const floorCount = Math.max(1, Number(params.floorCount) || 5);
  const roofType = params.roofType || 'gable';
  const roofExtraArea =
    roofType === 'duplex'
      ? Math.round(upperFloorArea * 0.65 * 100) / 100
      : roofType === 'mansard'
      ? Math.round(upperFloorArea * 0.7 * 100) / 100
      : 0;

  const computedTotalArea =
    Math.round((baseArea + Math.max(0, floorCount - 1) * upperFloorArea + roofExtraArea) * 100) /
    100;

  // Eğer results.totalArea mevcutsa ve results.baseArea ile senkronize baseArea uyuşuyorsa results.totalArea kullan
  const totalConstructionArea =
    results &&
    typeof results.totalArea === 'number' &&
    results.totalArea > 0 &&
    Math.abs((results.baseArea || baseArea) - baseArea) <= 0.5
      ? results.totalArea
      : computedTotalArea;

  const taksPercent = landArea > 0 ? (baseArea / landArea) * 100 : 0;
  const kaksRatio = landArea > 0 ? totalConstructionArea / landArea : 0;

  return {
    landArea,
    baseArea,
    totalConstructionArea,
    taksPercent,
    kaksRatio,
  };
}

/**
 * Y-7 & Y-8: Sözleşme ve Şantiye özetlerinde kullanılacak geçerli teklif numarasını
 * (params.offerMeta?.proposalNumber veya deterministik fallback) döndürür.
 */
export function resolveContractProposalNumber(
  params: ProjectParams,
  _companyName?: string
): string {
  const explicit = params.offerMeta?.proposalNumber?.trim();
  if (explicit) {
    return explicit;
  }
  return buildInitializedOfferMeta(params).proposalNumber;
}

export interface ContractAnnexOwnerResolution {
  isContractor: boolean;
  ownerId?: string;
  ownerName: string;
  ownerTc: string;
  ownerPhone?: string;
  landShareNumerator?: number;
  landShareDenominator: number;
  landShareText: string;
  matchedLandowner?: LandownerItem;
}

function isPlaceholderOwnerName(name?: string | null): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  if (!trimmed) return true;
  return /^(kat maliki|daire|dükkan|dukkan|bodrum ticari işyeri|bodrum daire|bağımsız bölüm|bagimsiz bolum|malik|hak sahibi)\s*\d*$/i.test(
    trimmed
  );
}

function isPlaceholderOwnerTc(tc?: string | null): boolean {
  if (!tc) return true;
  const trimmed = tc.trim();
  if (!trimmed || trimmed === '-') return true;
  return /^100000000\d+$/.test(trimmed);
}

/**
 * Y-7: Sözleşme Ek-1 (Bağımsız Bölüm ve Malik Tablosu) için malik bilgilerini çözer.
 * Eğer bağımsız bölümdeki ownerId tanımlı değilse veya params.landowners içinde bulunamazsa,
 * params.landowners verisini (TC/Vergi No, isim veya malik sıra eşleşmesiyle) fallback olarak kullanır.
 */
export function resolveContractAnnexOwnerInfo(
  flat: Pick<
    FlatCalcResult | FlatItem,
    'id' | 'name' | 'tc' | 'area' | 'landShareNumerator' | 'isContractorShare'
  > & {
    ownerId?: string;
    landShareDenominator?: number;
    phone?: string;
  },
  params: ProjectParams,
  flatIndex: number
): ContractAnnexOwnerResolution {
  const allFlats = Array.isArray(params.flats) ? params.flats : [];
  const rawFlat = allFlats.find((f) => f.id === flat.id) || allFlats[flatIndex];
  const contractorIds = Array.isArray(params.contractorFlatIds) ? params.contractorFlatIds : [];
  const isContractor = Boolean(
    flat.isContractorShare || rawFlat?.isContractorShare || contractorIds.includes(flat.id)
  );

  const defaultDenominator =
    rawFlat?.landShareDenominator || params.totalLandShareDenominator || 1000;

  if (isContractor) {
    const num = flat.landShareNumerator ?? rawFlat?.landShareNumerator;
    return {
      isContractor: true,
      ownerName: flat.name || rawFlat?.name || 'Müteahhit Payı',
      ownerTc: '-',
      landShareNumerator: num,
      landShareDenominator: defaultDenominator,
      landShareText: num && defaultDenominator ? `${num}/${defaultDenominator}` : '-',
    };
  }

  const landowners = Array.isArray(params.landowners) ? params.landowners : [];
  const candidateOwnerId = flat.ownerId || rawFlat?.ownerId;

  // 1. Önce ownerId ile doğrudan eşleşme ara
  let matchedOwner: LandownerItem | undefined = candidateOwnerId
    ? landowners.find((o) => o && o.id === candidateOwnerId)
    : undefined;

  const ownerIdWasMissingOrNotFound = !matchedOwner;

  // 2. ownerId bulunamadıysa TC / Vergi No ile eşleşme ara
  if (!matchedOwner && landowners.length > 0) {
    const rawTc = (rawFlat?.tc || flat.tc || '').trim();
    if (rawTc && !isPlaceholderOwnerTc(rawTc)) {
      matchedOwner = landowners.find(
        (o) => o?.tcOrTaxNo && o.tcOrTaxNo.trim() === rawTc
      );
    }
  }

  // 3. İsim ile eşleşme ara
  if (!matchedOwner && landowners.length > 0) {
    const rawName = (rawFlat?.name || flat.name || '').trim().toLocaleLowerCase('tr-TR');
    if (rawName && !isPlaceholderOwnerName(rawName)) {
      matchedOwner = landowners.find((o) => {
        if (!o?.name) return false;
        const oName = o.name.trim().toLocaleLowerCase('tr-TR');
        const oWithCompany = o.companyName
          ? `${o.name.trim()} (${o.companyName.trim()})`.toLocaleLowerCase('tr-TR')
          : '';
        return oName === rawName || (oWithCompany && oWithCompany === rawName);
      });
    }
  }

  // 4. Hâlâ bulunamadıysa malik sırasına (müteahhit dışı bağımsız bölüm sırası veya flatIndex) göre landowners listesinden eşleştir
  if (!matchedOwner && landowners.length > 0) {
    const nonContractorFlats = allFlats.filter(
      (f) => !f.isContractorShare && !contractorIds.includes(f.id)
    );
    const nonContractorIdx = nonContractorFlats.findIndex((f) => f.id === flat.id);
    const effectiveOwnerIdx = nonContractorIdx >= 0 ? nonContractorIdx : flatIndex;

    matchedOwner =
      landowners[effectiveOwnerIdx] ||
      landowners[flatIndex] ||
      (landowners.length === 1 ? landowners[0] : undefined);
  }

  const formattedLandownerName = matchedOwner?.name
    ? matchedOwner.companyName
      ? `${matchedOwner.name} (${matchedOwner.companyName})`
      : matchedOwner.name
    : '';

  const flatCandidateName = (rawFlat?.name || flat.name || '').trim();
  const ownerName =
    matchedOwner &&
    (ownerIdWasMissingOrNotFound || isPlaceholderOwnerName(flatCandidateName)) &&
    formattedLandownerName
      ? formattedLandownerName
      : flatCandidateName || formattedLandownerName || `Kat Maliki ${flat.id}`;

  const flatCandidateTc = (rawFlat?.tc || flat.tc || '').trim();
  const ownerTc =
    matchedOwner?.tcOrTaxNo?.trim() &&
    (ownerIdWasMissingOrNotFound || isPlaceholderOwnerTc(flatCandidateTc))
      ? matchedOwner.tcOrTaxNo.trim()
      : !isPlaceholderOwnerTc(flatCandidateTc)
      ? flatCandidateTc
      : matchedOwner?.tcOrTaxNo?.trim() || flatCandidateTc || '-';

  const flatArea = Number(rawFlat?.area ?? flat.area ?? 0);
  const autoAreaShare = flatArea > 0 ? Math.round(flatArea * 10) : 0;
  const flatShareNum = flat.landShareNumerator ?? rawFlat?.landShareNumerator;
  const flatHasCustomShare =
    flatShareNum !== undefined && flatShareNum > 0 && flatShareNum !== autoAreaShare;

  const resolvedShareNumerator =
    !ownerIdWasMissingOrNotFound && flatHasCustomShare
      ? flatShareNum
      : matchedOwner?.landShareNumerator !== undefined && matchedOwner.landShareNumerator > 0
      ? matchedOwner.landShareNumerator
      : flatShareNum;

  const resolvedShareDenominator =
    (ownerIdWasMissingOrNotFound || !flatHasCustomShare) &&
    matchedOwner?.landShareNumerator !== undefined &&
    matchedOwner.landShareNumerator > 0 &&
    matchedOwner?.landShareDenominator &&
    matchedOwner.landShareDenominator > 0
      ? matchedOwner.landShareDenominator
      : defaultDenominator;

  const landShareText =
    resolvedShareNumerator && resolvedShareDenominator
      ? `${resolvedShareNumerator}/${resolvedShareDenominator}`
      : '-';

  return {
    isContractor: false,
    ownerId: matchedOwner?.id || candidateOwnerId,
    ownerName,
    ownerTc,
    ownerPhone: matchedOwner?.phone || flat.phone,
    landShareNumerator: resolvedShareNumerator,
    landShareDenominator: resolvedShareDenominator,
    landShareText,
    matchedLandowner: matchedOwner,
  };
}



