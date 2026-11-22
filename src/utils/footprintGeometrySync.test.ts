import { describe, it, expect } from 'vitest';
import {
  POLYGON_PRESETS,
  buildPolygonEditUpdate,
  buildFacadeEditUpdate,
  buildBaseAreaEditUpdate,
  calculateFootprint,
  calculateInteractiveQuadrilateral,
  buildQuadrilateralPolygon,
  getDefaultCustomFacades,
  isAxisAlignedRectanglePolygon,
  resolveThreeBuildingFootprint,
  calculatePolygonArea,
  InteractiveFacadeUpdateResult,
} from './footprintUtils';
import { DEFAULT_PARAMS } from './calculatorEngine';
import { BuildingModelParams, PolygonPoint, ProjectParams } from '../types';
import { getInitialBuildingModelParams } from './buildingModelUtils';

/**
 * Mirrors App.tsx updateCalculatorParams -> setBuildingModelParams live sync
 * so tests validate the real Stage 2 -> Stage 3 -> Stage 4 pipeline end-to-end.
 */
function simulateSinglePathSync(
  prevParams: ProjectParams,
  prevModel: BuildingModelParams,
  patch: Partial<ProjectParams>
): { nextParams: ProjectParams; nextModel: BuildingModelParams } {
  const nextParams: ProjectParams = {
    ...prevParams,
    ...patch,
  };

  const fpSync = calculateFootprint(
    nextParams.footprintInputMode || prevModel.footprintInputMode || 'directArea',
    nextParams
  );
  const isDirectMode =
    !nextParams.footprintInputMode || nextParams.footprintInputMode === 'directArea';

  const newW = isDirectMode
    ? fpSync.effectiveWidth
    : nextParams.facadeWidth || prevModel.facadeWidth;
  const newD = isDirectMode
    ? fpSync.effectiveDepth
    : nextParams.facadeDepth || prevModel.facadeDepth;
  const newBackW = isDirectMode
    ? fpSync.effectiveWidth
    : nextParams.backFacadeLength !== undefined
    ? nextParams.backFacadeLength
    : prevModel.backFacadeLength ?? newW;
  const newLeftD = isDirectMode
    ? fpSync.effectiveDepth
    : nextParams.leftFacadeLength !== undefined
    ? nextParams.leftFacadeLength
    : prevModel.leftFacadeLength ?? newD;

  const nextModel: BuildingModelParams = {
    ...prevModel,
    footprintInputMode: nextParams.footprintInputMode || prevModel.footprintInputMode,
    facadeWidth: newW,
    facadeDepth: newD,
    backFacadeLength: newBackW,
    leftFacadeLength: newLeftD,
    baseBuildArea: nextParams.baseBuildArea,
    customFacades: nextParams.customFacades || prevModel.customFacades,
    polygonPoints: nextParams.polygonPoints || prevModel.polygonPoints,
    facadeConfigs: nextParams.facadeConfigs || prevModel.facadeConfigs,
    mainEntranceFacadeIndex:
      nextParams.mainEntranceFacadeIndex !== undefined
        ? nextParams.mainEntranceFacadeIndex
        : prevModel.mainEntranceFacadeIndex,
  };

  return { nextParams, nextModel };
}

describe('Footprint & 3D Geometry Synchronization (Phase 1 Fix)', () => {
  it('1. L-tipi poligon: Stage 2 -> polygonDraw -> Stage 4 3D preserves exact 6-vertex L geometry', () => {
    const baseParams: ProjectParams = { ...DEFAULT_PARAMS, baseBuildArea: 100 };
    const baseModel: BuildingModelParams = {
      ...getInitialBuildingModelParams(),
      wallColor: '#123456',
      roads: [{ id: 'r1', facadeIndex: 0, type: 'avenue', width: 7, name: 'Ana Cadde' }],
    };

    const lPoints = POLYGON_PRESETS.lShape.points;
    const patch = buildPolygonEditUpdate(baseParams, lPoints);

    expect(patch.footprintInputMode).toBe('polygonDraw');
    expect(patch.polygonPoints).toHaveLength(6);
    expect(patch.baseBuildArea).toBeCloseTo(calculatePolygonArea(lPoints), 1);

    const { nextModel } = simulateSinglePathSync(baseParams, baseModel, patch);
    // Preserves unrelated buildingModelParams fields
    expect(nextModel.wallColor).toBe('#123456');
    expect(nextModel.roads).toHaveLength(1);

    const resolved3D = resolveThreeBuildingFootprint(nextModel);
    expect(resolved3D.isPolygonDraw).toBe(true);
    expect(resolved3D.isCustomPoly).toBe(true);
    expect(resolved3D.activePolyPts).toHaveLength(6);
    expect(resolved3D.W).toBeCloseTo(16, 1);
    expect(resolved3D.D).toBeCloseTo(20, 1);
  });

  it('2. Serbest poligon (5 köşeli / köşe sürüklemeli): Stage 2 -> polygonDraw -> Stage 4 3D preserves exact freehand vertices', () => {
    const baseParams: ProjectParams = { ...DEFAULT_PARAMS };
    const baseModel = getInitialBuildingModelParams();

    const freehandPoints: PolygonPoint[] = [
      { id: 'f1', x: -7, y: -9 },
      { id: 'f2', x: 4, y: -9 },
      { id: 'f3', x: 8, y: -3 },
      { id: 'f4', x: 6, y: 9 },
      { id: 'f5', x: -8, y: 7 },
    ];

    const patch = buildPolygonEditUpdate(baseParams, freehandPoints);
    expect(patch.footprintInputMode).toBe('polygonDraw');
    expect(isAxisAlignedRectanglePolygon(freehandPoints)).toBe(false);

    const { nextModel } = simulateSinglePathSync(baseParams, baseModel, patch);
    const resolved3D = resolveThreeBuildingFootprint(nextModel);

    expect(resolved3D.isPolygonDraw).toBe(true);
    expect(resolved3D.isCustomPoly).toBe(true);
    expect(resolved3D.activePolyPts).toEqual(freehandPoints);
  });

  it('3. Kare dikdörtgen (10 x 10): Stage 2 & Stage 3 -> dimensions -> Stage 4 3D renders exact 10x10', () => {
    const baseParams: ProjectParams = { ...DEFAULT_PARAMS };
    const baseModel = getInitialBuildingModelParams();

    // Stage 3 10x10 square reset
    const quad10 = buildQuadrilateralPolygon(10, 10, 10, 10);
    const squareResult: InteractiveFacadeUpdateResult = {
      front: 10,
      right: 10,
      back: 10,
      left: 10,
      quadrilateral: quad10,
      customFacades: getDefaultCustomFacades(4, 10, 10, 10, 10),
      explanation: '10x10 square',
    };

    const patch = buildFacadeEditUpdate(baseParams, squareResult);
    expect(patch.footprintInputMode).toBe('dimensions');
    expect(patch.facadeWidth).toBe(10);
    expect(patch.facadeDepth).toBe(10);
    expect(patch.baseBuildArea).toBe(100);

    const { nextModel } = simulateSinglePathSync(baseParams, baseModel, patch);
    const resolved3D = resolveThreeBuildingFootprint(nextModel);

    expect(resolved3D.isDirectFootprint).toBe(false);
    expect(resolved3D.isCustomPoly).toBe(false);
    expect(resolved3D.W).toBe(10);
    expect(resolved3D.D).toBe(10);

    // Stage 2 axis-aligned 10x10 polygon also maps cleanly to dimensions
    const polyPatch = buildPolygonEditUpdate(baseParams, quad10.polygonPoints);
    expect(polyPatch.footprintInputMode).toBe('dimensions');
    expect(polyPatch.facadeWidth).toBe(10);
    expect(polyPatch.facadeDepth).toBe(10);
  });

  it('4. Farklı en-boy oranlı dikdörtgen (15 x 8): Stage 3 -> dimensions -> Stage 4 3D renders exact 15x8 (not square)', () => {
    const baseParams: ProjectParams = { ...DEFAULT_PARAMS, baseBuildArea: 100 };
    const baseModel = getInitialBuildingModelParams();

    const quad15x8 = buildQuadrilateralPolygon(15, 8, 15, 8);
    const rectResult: InteractiveFacadeUpdateResult = {
      front: 15,
      right: 8,
      back: 15,
      left: 8,
      quadrilateral: quad15x8,
      customFacades: getDefaultCustomFacades(4, 15, 8, 15, 8),
      explanation: '15x8 rectangle',
    };

    const patch = buildFacadeEditUpdate(baseParams, rectResult);
    expect(patch.footprintInputMode).toBe('dimensions');
    expect(patch.baseBuildArea).toBe(120);

    const { nextParams, nextModel } = simulateSinglePathSync(baseParams, baseModel, patch);
    const resolved3D = resolveThreeBuildingFootprint(nextModel);

    expect(resolved3D.isDirectFootprint).toBe(false);
    expect(resolved3D.isCustomPoly).toBe(false);
    expect(resolved3D.W).toBe(15);
    expect(resolved3D.D).toBe(8);

    // Scaling base area in dimensions mode preserves 15:8 aspect ratio & dimensions mode
    const scalePatch = buildBaseAreaEditUpdate(nextParams, 240, nextParams.polygonPoints || []);
    expect(scalePatch.footprintInputMode).toBe('dimensions');
    expect((scalePatch.facadeWidth || 0) / (scalePatch.facadeDepth || 1)).toBeCloseTo(15 / 8, 1);
  });

  it('5. Yamuk parsel: both Stage 2 trapezoid preset (polygonDraw) and Stage 3 skewed facade (dimensions) preserve skewed 3D geometry', () => {
    const baseParams: ProjectParams = { ...DEFAULT_PARAMS };
    const baseModel = getInitialBuildingModelParams();

    // 5a. Stage 2 trapezoid preset
    const trapPoints = POLYGON_PRESETS.trapezoid.points;
    const trapPatch = buildPolygonEditUpdate(baseParams, trapPoints);
    expect(trapPatch.footprintInputMode).toBe('polygonDraw');

    const syncTrap = simulateSinglePathSync(baseParams, baseModel, trapPatch);
    const resolvedTrap3D = resolveThreeBuildingFootprint(syncTrap.nextModel);
    expect(resolvedTrap3D.isPolygonDraw).toBe(true);
    expect(resolvedTrap3D.isCustomPoly).toBe(true);
    expect(resolvedTrap3D.activePolyPts).toEqual(trapPoints);

    // 5b. Stage 3 skewed trapezoid via InteractiveFacadeGeometryPanel (back != front)
    const skewedRes = calculateInteractiveQuadrilateral('back', 10, {
      front: 16,
      right: 14,
      back: 16,
      left: 14,
    });
    const skewedPatch = buildFacadeEditUpdate(baseParams, skewedRes);
    expect(skewedPatch.footprintInputMode).toBe('dimensions');

    const syncSkewed = simulateSinglePathSync(baseParams, baseModel, skewedPatch);
    const resolvedSkewed3D = resolveThreeBuildingFootprint(syncSkewed.nextModel);
    expect(resolvedSkewed3D.isDirectFootprint).toBe(false);
    expect(resolvedSkewed3D.quadInfo.isSkewed).toBe(true);
    expect(resolvedSkewed3D.isCustomPoly).toBe(true);
    expect(resolvedSkewed3D.activePolyPts).toEqual(skewedRes.quadrilateral.polygonPoints);
  });

  it('6. Stage 2 -> Stage 3 -> Stage 4 full workflow: L-shape in Stage 2, then facade edit in Stage 3 updates Stage 4 3D cleanly', () => {
    let params: ProjectParams = { ...DEFAULT_PARAMS, baseBuildArea: 100 };
    let model = getInitialBuildingModelParams();

    // Step 1 (Stage 2): Pick L-shape
    const lPatch = buildPolygonEditUpdate(params, POLYGON_PRESETS.lShape.points);
    ({ nextParams: params, nextModel: model } = simulateSinglePathSync(params, model, lPatch));
    expect(resolveThreeBuildingFootprint(model).activePolyPts).toHaveLength(6);

    // Step 2 (Stage 3): Change facade to 15 x 8 rectangle
    const quad15x8 = buildQuadrilateralPolygon(15, 8, 15, 8);
    const facadePatch = buildFacadeEditUpdate(params, {
      front: 15,
      right: 8,
      back: 15,
      left: 8,
      quadrilateral: quad15x8,
      customFacades: getDefaultCustomFacades(4, 15, 8, 15, 8),
      explanation: '15x8',
    });
    ({ nextParams: params, nextModel: model } = simulateSinglePathSync(params, model, facadePatch));

    // Step 3 (Stage 4): 3D now reflects 15x8 dimensions accurately
    const resolved3D = resolveThreeBuildingFootprint(model);
    expect(model.footprintInputMode).toBe('dimensions');
    expect(resolved3D.isPolygonDraw).toBe(false);
    expect(resolved3D.isCustomPoly).toBe(false);
    expect(resolved3D.W).toBe(15);
    expect(resolved3D.D).toBe(8);
  });

  it('7. Legacy directArea backward compatibility: remains directArea on load and baseBuildArea-only edits', () => {
    const legacyParams: ProjectParams = {
      ...DEFAULT_PARAMS,
      footprintInputMode: 'directArea',
      baseBuildArea: 100,
      polygonPoints: undefined,
      // Simulate stale skewed backFacadeLength in a legacy directArea project
      facadeWidth: 14,
      facadeDepth: 18,
      backFacadeLength: 10,
      leftFacadeLength: 18,
    };
    const legacyModel: BuildingModelParams = {
      ...getInitialBuildingModelParams(),
      footprintInputMode: 'directArea',
      baseBuildArea: 100,
    };

    // Opening legacy project directly in 3D uses effectiveWidth x effectiveDepth (never skewed)
    const initial3D = resolveThreeBuildingFootprint(legacyParams);
    const expectedFp = calculateFootprint('directArea', legacyParams);
    expect(initial3D.isDirectFootprint).toBe(true);
    expect(initial3D.isCustomPoly).toBe(false);
    expect(initial3D.W).toBeCloseTo(expectedFp.effectiveWidth, 1);
    expect(initial3D.D).toBeCloseTo(expectedFp.effectiveDepth, 1);

    // Editing only Taban Oturumu (e.g. 100 -> 140 m²) keeps footprintInputMode = 'directArea'
    const baseAreaPatch = buildBaseAreaEditUpdate(legacyParams, 140, POLYGON_PRESETS.rectangle.points);
    expect(baseAreaPatch.footprintInputMode).toBe('directArea');
    expect(baseAreaPatch.baseBuildArea).toBe(140);
    expect(baseAreaPatch.polygonPoints).toBeUndefined();

    const { nextParams, nextModel } = simulateSinglePathSync(legacyParams, legacyModel, baseAreaPatch);
    expect(nextParams.footprintInputMode).toBe('directArea');
    expect(nextModel.footprintInputMode).toBe('directArea');

    const updated3D = resolveThreeBuildingFootprint(nextModel);
    const expectedUpdatedFp = calculateFootprint('directArea', nextModel);
    expect(updated3D.isDirectFootprint).toBe(true);
    expect(updated3D.isCustomPoly).toBe(false);
    expect(updated3D.W).toBeCloseTo(expectedUpdatedFp.effectiveWidth, 1);
    expect(updated3D.D).toBeCloseTo(expectedUpdatedFp.effectiveDepth, 1);
  });
});
