import { describe, it, expect } from 'vitest';
import {
  evaluateWorkbenchProject,
  WorkbenchIssue,
  Stage6SubView,
  Stage8SubView,
  STAGE6_COST_FOCUS_FIELD_IDS,
  isStage6CostFocusField,
  resolveStage6SubViewForNavigation,
  resolveStage8SubViewForNavigation,
} from '../components/ProjectWorkbench/WorkbenchLiveSummary';
import { mapIssueToTarget } from '../components/CompanyProfileTab';
import { DEFAULT_PARAMS, calculateProject } from './calculatorEngine';
import { ProjectParams } from '../types';

function makeValidProject(overrides: Partial<ProjectParams> = {}): ProjectParams {
  const base: ProjectParams = {
    ...DEFAULT_PARAMS,
    projectName: 'Kadıköy Örnek Konut Projesi',
    projectAddress: 'Kadıköy / 124 Ada 5 Parsel',
    landArea: 500,
    baseBuildArea: 200,
    floorCount: 5,
    flatsPerFloor: 2,
    elevatorCount: 1,
    basementCount: 1,
    ...overrides,
  };
  const results = calculateProject(base);
  const flats =
    overrides.flats !== undefined
      ? overrides.flats
      : Array.from({ length: results.flatCount }, (_, i) => ({
          id: i + 1,
          name: `Malik ${i + 1}`,
          tc: '',
          area: 100,
          downPayment: 0,
          useTransformationCredit: false,
          flatType: 'standard' as const,
          floorNumber: Math.floor(i / 2) + 1,
        }));
  return { ...base, flats };
}

describe('Phase 2: 9-Stage Workbench Evaluation & Cross-Routing', () => {
  it('1. Stage 1 issues (missing name/address) target Stage 1 with exact focusFieldId', () => {
    const params = makeValidProject({ projectName: '', projectAddress: '   ' });
    const results = calculateProject(params);
    const evalRes = evaluateWorkbenchProject(params, results, false);

    const nameIssue = evalRes.issues.find((i) => i.id === 'missing-name');
    const addrIssue = evalRes.issues.find((i) => i.id === 'missing-address');

    expect(nameIssue).toMatchObject({
      stage: 1,
      stageLabel: '1. Aşama',
      focusFieldId: 'projectNameInput',
      severity: 'critical',
    });
    expect(addrIssue).toMatchObject({
      stage: 1,
      stageLabel: '1. Aşama',
      focusFieldId: 'projectAddressInput',
      severity: 'critical',
    });
    expect(evalRes.stages[1].status).toBe('incomplete');
    expect(evalRes.stages[1].isOptional).toBe(false);
  });

  it('2. Stage 2 issues (landArea, baseArea, TAKS, existing units) target Stage 2 with exact focusFieldId', () => {
    const paramsExceed = makeValidProject({ landArea: 150, baseBuildArea: 200 });
    const resExceed = calculateProject(paramsExceed);
    const evalExceed = evaluateWorkbenchProject(paramsExceed, resExceed, false);

    const exceedIssue = evalExceed.issues.find((i) => i.id === 'base-exceeds-land');
    expect(exceedIssue).toMatchObject({
      stage: 2,
      stageLabel: '2. Aşama',
      focusFieldId: 'projectBaseAreaInput',
      severity: 'critical',
    });
    expect(evalExceed.stages[2].status).toBe('needs_check');
    expect(evalExceed.stages[2].isOptional).toBe(false);

    const paramsMissingLand = makeValidProject({ landArea: 0 });
    const evalMissingLand = evaluateWorkbenchProject(
      paramsMissingLand,
      calculateProject(paramsMissingLand),
      false
    );
    expect(evalMissingLand.issues.find((i) => i.id === 'missing-land')).toMatchObject({
      stage: 2,
      stageLabel: '2. Aşama',
      focusFieldId: 'projectLandAreaInput',
    });

    const paramsHighTaks = makeValidProject({ landArea: 250, baseBuildArea: 200 });
    const evalHighTaks = evaluateWorkbenchProject(
      paramsHighTaks,
      calculateProject(paramsHighTaks),
      false
    );
    expect(evalHighTaks.issues.find((i) => i.id === 'high-taks')).toMatchObject({
      stage: 2,
      stageLabel: '2. Aşama',
      focusFieldId: 'projectBaseAreaInput',
      severity: 'warning',
    });
  });

  it('3. Stage 3 issues (floors, flats, elevator, basement, flats mismatch, zero area) target Stage 3', () => {
    const params = makeValidProject({
      floorCount: 11,
      flatsPerFloor: 2,
      elevatorCount: 1,
      basementCount: 0,
      flats: [
        {
          id: 1,
          name: 'D1',
          tc: '',
          area: 0,
          downPayment: 0,
          useTransformationCredit: false,
          flatType: 'standard',
        },
      ],
    });
    const results = calculateProject(params);
    const evalRes = evaluateWorkbenchProject(params, results, false);

    expect(evalRes.issues.find((i) => i.id === 'double-elevator-required')).toMatchObject({
      stage: 3,
      stageLabel: '3. Aşama',
      focusFieldId: 'stage3ElevatorGroup',
    });
    expect(evalRes.issues.find((i) => i.id === 'shelter-basement-check')).toMatchObject({
      stage: 3,
      stageLabel: '3. Aşama',
      focusFieldId: 'stage3BasementCard',
    });
    expect(evalRes.issues.find((i) => i.id === 'flats-mismatch')).toMatchObject({
      stage: 3,
      stageLabel: '3. Aşama',
      focusFieldId: 'stage3FlatsMatrixSection',
      severity: 'critical',
    });

    // Aligned flats with zero-area flat
    const zeroAreaParams = makeValidProject();
    zeroAreaParams.flats[0].area = 0;
    const zeroEval = evaluateWorkbenchProject(
      zeroAreaParams,
      calculateProject(zeroAreaParams),
      false
    );
    expect(zeroEval.issues.find((i) => i.id === 'zero-area-flat')).toMatchObject({
      stage: 3,
      stageLabel: '3. Aşama',
      focusFieldId: 'stage3FlatsMatrixSection',
      severity: 'warning',
    });
  });

  it('4. Stage 6 issues (low manual unit price & missing costs) target Stage 6 with exact focusFieldId', () => {
    const lowPriceParams = makeValidProject({ manualFlatUnitPrice: 5000 });
    const lowPriceResults = calculateProject(lowPriceParams);
    const evalLowPrice = evaluateWorkbenchProject(lowPriceParams, lowPriceResults, false);

    expect(evalLowPrice.issues.find((i) => i.id === 'low-manual-unit-price')).toMatchObject({
      stage: 6,
      stageLabel: '6. Aşama',
      focusFieldId: 'stage3UnitPriceInput',
      severity: 'warning',
    });
    expect(evalLowPrice.stages[6].status).toBe('needs_check');
    expect(evalLowPrice.stages[6].isOptional).toBe(false);

    const noCostResults = { ...lowPriceResults, grandTotal: 0, subTotalCost: 0 };
    const evalNoCost = evaluateWorkbenchProject(lowPriceParams, noCostResults, false);
    expect(evalNoCost.issues.find((i) => i.id === 'missing-costs')).toMatchObject({
      stage: 6,
      stageLabel: '6. Aşama',
      focusFieldId: 'stage6CostParamsCard',
      severity: 'critical',
    });
  });

  it('5. Stage 7 issues (contractorShare & landowner share) remain on Stage 7', () => {
    const params = makeValidProject({
      projectModel: 'contractorShare',
      contractorShareRate: 0,
      contractorFlatIds: [],
      landowners: [
        { id: 'o1', name: 'Ali Yılmaz', sharePercent: 40 },
        { id: 'o2', name: 'Ayşe Kaya', sharePercent: 40 },
      ],
    });
    const evalRes = evaluateWorkbenchProject(params, calculateProject(params), false);

    expect(evalRes.issues.find((i) => i.id === 'missing-contractor-share')).toMatchObject({
      stage: 7,
      stageLabel: '7. Aşama',
      severity: 'critical',
    });
    expect(evalRes.issues.find((i) => i.id === 'landowner-share-mismatch')).toMatchObject({
      stage: 7,
      stageLabel: '7. Aşama',
      severity: 'warning',
    });
    expect(evalRes.stages[7].isOptional).toBe(false);
  });

  it('6. Complete valid saved project marks all 9 stages ready/completed and isOfferReady = true', () => {
    const params = makeValidProject();
    const results = calculateProject(params);
    const evalRes = evaluateWorkbenchProject(params, results, true);

    expect(evalRes.issues).toHaveLength(0);
    expect(evalRes.isOfferReady).toBe(true);
    expect(evalRes.requiredPercent).toBe(100);
    for (let s = 1; s <= 9; s += 1) {
      expect(evalRes.stages[s].status).toBe('completed');
    }
    expect(evalRes.stages[4].isOptional).toBe(true);
    expect(evalRes.stages[5].isOptional).toBe(true);
    expect(evalRes.stages[6].isOptional).toBe(false);
    expect(evalRes.stages[8].isOptional).toBe(false);
    expect(evalRes.stages[9].isOptional).toBe(true);
  });

  it('7. CompanyProfileTab mapIssueToTarget routes every stage 1..9 directly into kurulum with exact setupStep and focusFieldId', () => {
    for (let stage = 1; stage <= 9; stage += 1) {
      const mockIssue: WorkbenchIssue = {
        id: `test-${stage}`,
        severity: 'warning',
        stage,
        stageLabel: `${stage}. Aşama`,
        focusFieldId: `field-${stage}`,
        message: 'Test',
      };
      expect(mapIssueToTarget(mockIssue)).toEqual({
        tab: 'kurulum',
        setupStep: stage,
        focusFieldId: `field-${stage}`,
      });
    }
  });

  it('8. Stage 8 sub-view: Sözleşme -> başka aşama -> Teklif/PDF bağlantısı resets stage8SubView to offer', () => {
    let stage = 8;
    let stage8SubView: Stage8SubView = 'offer';

    // User switches to Sözleşme inside Stage 8
    stage8SubView = resolveStage8SubViewForNavigation(stage8SubView, 'contract');
    expect(stage8SubView).toBe('contract');

    // User leaves Stage 8 to another stage (e.g. Stage 3)
    stage = 3;
    expect(stage).toBe(3);
    expect(stage8SubView).toBe('contract'); // state persisted while away

    // User returns to Stage 8 via Teklif/PDF/Teklif Hazırla link (explicit 'offer' intent)
    stage = 8;
    stage8SubView = resolveStage8SubViewForNavigation(stage8SubView, 'offer');
    expect(stage).toBe(8);
    expect(stage8SubView).toBe('offer');
  });

  it('9. Stage 8 sub-view: Teklif -> Sözleşme bağlantısı switches to contract without losing plain stage navigation', () => {
    let stage8SubView: Stage8SubView = 'offer';

    // Navigating via Contract link (e.g. Stage 9 onNavigateToContract or OfferTab -> Contract)
    stage8SubView = resolveStage8SubViewForNavigation(stage8SubView, 'contract');
    expect(stage8SubView).toBe('contract');

    // Plain Stage 8 re-entry without explicit sub-view preserves current sub-view
    expect(resolveStage8SubViewForNavigation(stage8SubView)).toBe('contract');
  });

  it('10. Stage 6 external focus: admin_report -> external cost warning switches stage6SubView to cost', () => {
    const lowPriceParams = makeValidProject({ manualFlatUnitPrice: 5000 });
    const evalLowPrice = evaluateWorkbenchProject(
      lowPriceParams,
      calculateProject(lowPriceParams),
      false
    );
    const lowPriceIssue = evalLowPrice.issues.find((i) => i.id === 'low-manual-unit-price');
    expect(lowPriceIssue).toBeDefined();

    // External jump from CompanyProfileTab / CompactSummaryBar while Stage 6 was on admin_report
    const target = mapIssueToTarget(lowPriceIssue!);
    expect(target).toEqual({
      tab: 'kurulum',
      setupStep: 6,
      focusFieldId: 'stage3UnitPriceInput',
    });

    const currentSubView: Stage6SubView = 'admin_report';
    const nextSubView = resolveStage6SubViewForNavigation(currentSubView, {
      focusFieldId: target.focusFieldId,
    });
    expect(nextSubView).toBe('cost');
  });

  it('11. Stage 6 three cost targets individually switch admin_report -> cost, while non-cost navigation preserves admin_report', () => {
    expect(STAGE6_COST_FOCUS_FIELD_IDS).toEqual([
      'stage3UnitPriceInput',
      'stage6CostParamsCard',
      'stage6DurationSelect',
    ]);

    // 1) stage3UnitPriceInput
    expect(isStage6CostFocusField('stage3UnitPriceInput')).toBe(true);
    expect(
      resolveStage6SubViewForNavigation('admin_report', {
        focusFieldId: 'stage3UnitPriceInput',
      })
    ).toBe('cost');

    // 2) stage6CostParamsCard
    expect(isStage6CostFocusField('stage6CostParamsCard')).toBe(true);
    expect(
      resolveStage6SubViewForNavigation('admin_report', {
        focusFieldId: 'stage6CostParamsCard',
      })
    ).toBe('cost');

    // 3) stage6DurationSelect
    expect(isStage6CostFocusField('stage6DurationSelect')).toBe(true);
    expect(
      resolveStage6SubViewForNavigation('admin_report', {
        focusFieldId: 'stage6DurationSelect',
      })
    ).toBe('cost');

    // Non-cost navigation preserves admin_report
    expect(isStage6CostFocusField(undefined)).toBe(false);
    expect(isStage6CostFocusField('minimalFloorCountInput')).toBe(false);
    expect(resolveStage6SubViewForNavigation('admin_report')).toBe('admin_report');
    expect(
      resolveStage6SubViewForNavigation('cost', { explicitSubView: 'admin_report' })
    ).toBe('admin_report');
  });
});
