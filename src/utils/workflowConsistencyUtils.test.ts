import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_PARAMS, calculateProject } from './calculatorEngine';
import { DEFAULT_BUILDING_PARAMS } from './buildingModelUtils';
import { DUAL_OFFER_NAMING_PRESETS } from './dualOfferUtils';
import {
  resolveProjectProgressKeys,
  getLocalProgressItemByKeys,
  setLocalProgressItemByKeys,
} from './syncKeys';
import {
  applyCalculatorParamsUpdate,
  applyBuildingModelUpdateToProjectParams,
  buildComfortSystemTakeoffItems,
  buildCommonCategoryTakeoffItems,
  buildKitchenAndDoorTakeoffItems,
  buildOfferAcceptanceTransitionPatch,
  buildProposalStatusChangePatch,
  calculateProjectZoningRatios,
  computeTakeoffCategoryTotals,
  equalizeFloorAreasPreservingManualValues,
  formatSpecificationBasementSummary,
  formatSpecificationUnitLabels,
  getSelectedSpecificationComfortFeatures,
  getSpecificationComfortFeatures,
  loadProjectScopedOffer3DPreview,
  OFFER_3D_PREVIEW_GLOBAL_STORAGE_KEY,
  preserveExistingFlatsOnSynchronize,
  resolveContractAnnexOwnerInfo,
  resolveContractProposalNumber,
  resolveEffectiveOfferAccepted,
  resolveEffectiveProposalStatus,
  saveProjectScopedOffer3DPreview,
  sanitizeContractorFlatIds,
  SPECIFICATION_EMPTY_COMFORT_MESSAGE,
  syncProjectParamsToBuildingModel,
} from './workflowConsistencyUtils';
import { generateContractHtml } from './reportExport';
import { calculatePolygonArea } from './footprintUtils';
import type { ProjectParams } from '../types';

function createSampleProject(overrides: Partial<ProjectParams> = {}): ProjectParams {
  return applyCalculatorParamsUpdate(DEFAULT_PARAMS, {
    projectName: 'Fatih Kentsel Dönüşüm',
    projectAddress: 'Cerrahpaşa Mah. 1422 Ada 18 Parsel',
    landArea: 320,
    baseBuildArea: 180,
    floorCount: 5,
    flatsPerFloor: 2,
    projectModel: 'contractorShare',
    contractorShareRate: 40,
    ...overrides,
  });
}

describe('FAZ 3 / UYGULAMA 1: Kritik Veri Tutarlılığı Regresyon Testleri (K-1..K-4)', () => {
  describe('K-1: Stale Closure Önleme ve Atomik Çoklu Alan Güncellemeleri', () => {
    it('Ardışık tekil alan güncellemeleri fonksiyonel state zincirinde birbirini ezmez', () => {
      let state = createSampleProject();

      // Aynı render döngüsünde ardışık çağrılan fonksiyonel güncellemeleri simüle et
      const updateParam = <K extends keyof ProjectParams>(key: K, value: ProjectParams[K]) => {
        state = applyCalculatorParamsUpdate(state, { [key]: value });
      };

      const preset = DUAL_OFFER_NAMING_PRESETS.find((p) => p.id === 'gumus_altin')!;
      updateParam('offerNamingPreset', preset.id);
      updateParam('baseOfferTitle', preset.baseTitle);
      updateParam('plusOfferTitle', preset.plusTitle);

      expect(state.offerNamingPreset).toBe('gumus_altin');
      expect(state.baseOfferTitle).toBe(preset.baseTitle);
      expect(state.plusOfferTitle).toBe(preset.plusTitle);
    });

    it('Özel Baz ve Plus başlığı yazılırken offerNamingPreset="custom" ile başlık metni birlikte korunur', () => {
      let state = createSampleProject({
        offerNamingPreset: 'standard_prestij',
        baseOfferTitle: 'Standart Paket',
        plusOfferTitle: 'Prestij Paket',
      });

      // Özel Baz başlığı güncellemesi
      state = applyCalculatorParamsUpdate(state, {
        baseOfferTitle: 'Özel Mimari Baz Paket',
        offerNamingPreset: 'custom',
      });

      expect(state.baseOfferTitle).toBe('Özel Mimari Baz Paket');
      expect(state.offerNamingPreset).toBe('custom');
      expect(state.plusOfferTitle).toBe('Prestij Paket');

      // Özel Plus başlığı güncellemesi
      state = applyCalculatorParamsUpdate(state, {
        plusOfferTitle: 'Özel VIP Plus Paket',
        offerNamingPreset: 'custom',
      });

      expect(state.baseOfferTitle).toBe('Özel Mimari Baz Paket');
      expect(state.plusOfferTitle).toBe('Özel VIP Plus Paket');
      expect(state.offerNamingPreset).toBe('custom');
    });

    it('Teklif rapor kartları Tümünü Kaldır / Tümünü Seç ve enflasyon metni sıfırlama atomik olarak tüm alanları günceller', () => {
      const cardKeys = [
        'showProposalHeader',
        'showVisionCards',
        'showTechnicalSummary',
        'showQualityStandards',
        'showInnovativeOptions',
        'showDualOfferMatrix',
        'showFinancialSummary',
        'showPaymentTimeline',
        'showInflationGuaranteeNotice',
        'showLegalTaahhut',
        'showContractorSignature',
      ] as const;

      let state = createSampleProject({
        customInflationNoticeTitle: 'Özel Başlık',
        customInflationNoticeText: 'Özel Açıklama',
      });

      // Tümünü Kaldır
      const disablePatch: Partial<ProjectParams> = {};
      cardKeys.forEach((k) => {
        (disablePatch as Record<string, boolean>)[k] = false;
      });
      state = applyCalculatorParamsUpdate(state, disablePatch);
      cardKeys.forEach((k) => {
        expect(state[k]).toBe(false);
      });

      // Tümünü Seç
      const enablePatch: Partial<ProjectParams> = {};
      cardKeys.forEach((k) => {
        (enablePatch as Record<string, boolean>)[k] = true;
      });
      state = applyCalculatorParamsUpdate(state, enablePatch);
      cardKeys.forEach((k) => {
        expect(state[k]).toBe(true);
      });

      // Enflasyon güvence notunu varsayılana sıfırla
      state = applyCalculatorParamsUpdate(state, {
        customInflationNoticeTitle: undefined,
        customInflationNoticeText: undefined,
      });
      expect(state.customInflationNoticeTitle).toBeUndefined();
      expect(state.customInflationNoticeText).toBeUndefined();
    });
  });

  describe('K-2: Şantiye Verilerinin Projeler Arasında İzolasyonu', () => {
    const storageMap = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => (storageMap.has(key) ? storageMap.get(key)! : null),
      setItem: (key: string, val: string) => {
        storageMap.set(key, val);
      },
      clear: () => storageMap.clear(),
    };

    beforeEach(() => {
      storageMap.clear();
      Object.defineProperty(globalThis, 'localStorage', {
        value: mockStorage,
        configurable: true,
        writable: true,
      });
    });

    it('Proje değişiminde activeLoadedKey kilidi yeni proje yüklenmeden eski projenin verisinin yeni anahtara yazılmasını engeller', () => {
      const projAKeys = resolveProjectProgressKeys({
        projectAddress: 'Cerrahpaşa Mah. 100 Ada 1 Parsel',
        projectName: 'Proje A',
      });
      const projBKeys = resolveProjectProgressKeys({
        projectAddress: 'Kocamustafapaşa Mah. 200 Ada 2 Parsel',
        projectName: 'Proje B',
      });

      const keyA = `ab_yapi_progress_${projAKeys.primaryKey}`;
      const keyB = `ab_yapi_progress_${projBKeys.primaryKey}`;

      expect(keyA).not.toBe(keyB);

      // Proje A için ilerlemiş şantiye verisi ve özel tarihler kaydet
      localStorage.setItem(`${keyA}_stages`, JSON.stringify([{ id: 'stage_1', progressPercent: 95 }]));
      localStorage.setItem(`${keyA}_logs`, JSON.stringify([{ id: 'log_a', title: 'Proje A Raporu' }]));
      localStorage.setItem(`${keyA}_subcontractors`, JSON.stringify([{ id: 'sub_a', name: 'A Taşeron' }]));
      localStorage.setItem(`${keyA}_contract_date`, '2026-01-15');
      localStorage.setItem(`${keyA}_target_date`, '2027-03-15');

      // Proje B için kendi başlangıç aşamaları var ancak kayıtlı tarihi yok
      localStorage.setItem(`${keyB}_stages`, JSON.stringify([{ id: 'stage_1', progressPercent: 10 }]));

      // Proje A'dan Proje B'ye geçiş anında (henüz yükleme tamamlanmadan: activeLoadedKey === keyA, safeProjectKey === keyB)
      const activeLoadedKeyDuringSwitch: string = keyA;
      const nextSafeProjectKey: string = keyB;
      const shouldWriteDuringSwitch = activeLoadedKeyDuringSwitch === nextSafeProjectKey;

      expect(shouldWriteDuringSwitch).toBe(false);

      // Proje B verileri okunduğunda A'nın verileri B'ye karışmamış olmalı
      const loadedBStages = JSON.parse(getLocalProgressItemByKeys(projBKeys.candidateKeys, 'stages')!);
      expect(loadedBStages).toEqual([{ id: 'stage_1', progressPercent: 10 }]);
      expect(getLocalProgressItemByKeys(projBKeys.candidateKeys, 'logs')).toBeNull();

      // Proje B'de kayıtlı tarih olmadığında varsayılan tarihler kullanılmalı (Proje A'nın tarihleri taşınmamalı)
      const defaultStart = '2026-11-22';
      const defaultEnd = '2028-01-16';
      const bContractDate =
        getLocalProgressItemByKeys(projBKeys.candidateKeys, 'contract_date') || defaultStart;
      const bTargetDate =
        getLocalProgressItemByKeys(projBKeys.candidateKeys, 'target_date') || defaultEnd;

      expect(bContractDate).toBe(defaultStart);
      expect(bTargetDate).toBe(defaultEnd);
    });
  });

  describe('K-3: Teklif ve Şantiye Durum Senkronizasyonu (isOfferAccepted <-> proposalStatus)', () => {
    it('accepted, contracted ve active_site durumlarının tümünü onaylı kabul eder', () => {
      expect(
        resolveEffectiveOfferAccepted({ isOfferAccepted: false, proposalStatus: 'accepted' })
      ).toBe(true);
      expect(
        resolveEffectiveOfferAccepted({ isOfferAccepted: false, proposalStatus: 'contracted' })
      ).toBe(true);
      expect(
        resolveEffectiveOfferAccepted({ isOfferAccepted: false, proposalStatus: 'active_site' })
      ).toBe(true);
      expect(
        resolveEffectiveOfferAccepted({ isOfferAccepted: false, proposalStatus: 'presented' })
      ).toBe(false);
      expect(
        resolveEffectiveOfferAccepted({ isOfferAccepted: true, proposalStatus: 'draft' })
      ).toBe(true);
      expect(
        resolveEffectiveProposalStatus({ isOfferAccepted: true, proposalStatus: 'draft' })
      ).toBe('accepted');
    });

    it('Şantiyeden teklif onaylandığında ve tekrar değerlendirmeye alındığında statusHistory geçmişini silmeden korur', () => {
      let state = createSampleProject({
        proposalStatus: 'draft',
        isOfferAccepted: false,
      });

      // 1) Teklif 'presented' durumuna geçsin
      const presentedPatch = buildProposalStatusChangePatch(state, 'presented', {
        companyName: 'AB YAPI',
        note: 'Müşteriye sunuldu',
      });
      state = applyCalculatorParamsUpdate(state, presentedPatch);
      expect(state.proposalStatus).toBe('presented');
      expect(state.isOfferAccepted).toBe(false);
      expect(state.offerMeta?.statusHistory).toHaveLength(1);

      // 2) Şantiye ekranından "Teklif Kabul Edildi" olarak işaretlensin
      const acceptPatch = buildOfferAcceptanceTransitionPatch(state, true, {
        companyName: 'AB YAPI',
      });
      state = applyCalculatorParamsUpdate(state, acceptPatch);
      expect(state.isOfferAccepted).toBe(true);
      expect(state.proposalStatus).toBe('accepted');
      expect(state.offerMeta?.statusHistory).toHaveLength(2);
      expect(state.offerMeta?.statusHistory?.[1].fromStatus).toBe('presented');
      expect(state.offerMeta?.statusHistory?.[1].toStatus).toBe('accepted');

      // 3) Şantiye ekranından tekrar "Değerlendirmede" durumuna alınsın (geçmişteki 'presented' durumuna döner ve geçmiş korunur)
      const revertPatch = buildOfferAcceptanceTransitionPatch(state, false, {
        companyName: 'AB YAPI',
      });
      state = applyCalculatorParamsUpdate(state, revertPatch);
      expect(state.isOfferAccepted).toBe(false);
      expect(state.proposalStatus).toBe('presented');
      expect(state.offerMeta?.statusHistory).toHaveLength(3);
      expect(state.offerMeta?.statusHistory?.[0].toStatus).toBe('presented');
      expect(state.offerMeta?.statusHistory?.[1].toStatus).toBe('accepted');
      expect(state.offerMeta?.statusHistory?.[2].toStatus).toBe('presented');
    });
  });

  describe('K-4: 3D Model ve Hesaplama Arasında Müteahhit Dairesi (contractorFlatIds <-> isContractorShare) Senkronizasyonu', () => {
    it('updateBuildingModelParams üzerinden contractorFlatIds değiştiğinde flats[].isContractorShare, malik bilgileri ve özel daire m² alanları korunarak güncellenir', () => {
      let state = createSampleProject({
        floorCount: 4,
        flatsPerFloor: 2, // 8 bağımsız bölüm
      });

      // Başlangıçta 1. ve 2. daire maliklere özel m² ve isimle atanmış, 7. ve 8. daire müteahhit payı olsun
      const customFlats = state.flats.map((f) => {
        if (f.id === 1) {
          return {
            ...f,
            name: 'Ahmet Yılmaz',
            ownerId: 'owner_1',
            area: 112,
            isContractorShare: false,
          };
        }
        if (f.id === 7 || f.id === 8) {
          return {
            ...f,
            isContractorShare: true,
          };
        }
        return {
          ...f,
          isContractorShare: false,
        };
      });

      state = applyCalculatorParamsUpdate(state, {
        flats: customFlats,
        contractorFlatIds: [7, 8],
      });

      // Şimdi 4. Aşama (3D Model) üzerinden müteahhit daireleri [5, 6] olarak değiştirilsin ve geçersiz [0, -3, 99, 5] kimlikleri gönderilsin
      const after3DUpdate = applyBuildingModelUpdateToProjectParams(state, {
        contractorFlatIds: [5, 6, 0, -3, 99, 5],
      });

      // 1) Geçersiz ve mükerrer kimlikler elenmiş olmalı
      expect(after3DUpdate.contractorFlatIds).toEqual([5, 6]);

      // 2) flats[].isContractorShare bayrakları [5, 6] ile birebir eşleşmeli (eski 7 ve 8 false olmalı)
      const contractorFlagIds = after3DUpdate.flats
        .filter((f) => f.isContractorShare)
        .map((f) => f.id);
      expect(contractorFlagIds).toEqual([5, 6]);

      // 3) Malik adı, ownerId ve özel daire alanı (112 m²) korunmalı
      const flat1 = after3DUpdate.flats.find((f) => f.id === 1)!;
      expect(flat1.name).toBe('Ahmet Yılmaz');
      expect(flat1.ownerId).toBe('owner_1');
      expect(flat1.area).toBe(112);

      // 4) calculatorEngine sonuçlarında (results.flatResults) yeni müteahhit daireleri [5, 6] olarak görünmeli
      const calcResults = calculateProject(after3DUpdate);
      const calcContractorIds = calcResults.flatResults
        .filter((f) => f.isContractorShare)
        .map((f) => f.id);
      expect(calcContractorIds).toEqual([5, 6]);
    });

    it('sanitizeContractorFlatIds geçersiz, negatif, sınır dışı ve tekrarlı kimlikleri filtreler', () => {
      expect(sanitizeContractorFlatIds([3, 1, 3, 0, -2, 11, 10, NaN], 10)).toEqual([3, 1, 10]);
      expect(sanitizeContractorFlatIds(undefined, 10)).toEqual([]);
    });
  });
});

describe('FAZ 3 / UYGULAMA 2A: Yüksek Öncelikli Veri Tutarlılığı Regresyon Testleri (Y-1..Y-4)', () => {
  describe('Y-1: Banyo Nem Fanı Maliyet Kaleminin Metraj ve Sistem Toplamıyla Tutarlılığı', () => {
    it('hasBathroomHumidityFan açıkken bathroomHumidityFanCost tam olarak bir kez eklenir ve konfor sistemleri toplamı motorla eşleşir', () => {
      const paramsWithFan = createSampleProject({
        hasBathroomHumidityFan: true,
        hasUnderfloorHeating: true,
        hasThermostaticShowerMixer: true,
        hasLinearShowerDrain: true,
        hasTouchlessKitchenFaucet: true,
        hasSmartDoorLock: true,
        hasPorcelainCountertop: true,
        hasWaterFiltration: true,
        hasGenerator: true,
        hasAcOption: true,
      });

      const resultsWithFan = calculateProject(paramsWithFan);
      expect(resultsWithFan.bathroomHumidityFanCost).toBeGreaterThan(0);

      const itemsWithFan = buildComfortSystemTakeoffItems(
        paramsWithFan,
        resultsWithFan,
        paramsWithFan.flatCount
      );

      const fanItems = itemsWithFan.filter((item) => item.id === 't9b');
      expect(fanItems).toHaveLength(1);
      expect(fanItems[0].total).toBe(resultsWithFan.bathroomHumidityFanCost);
      expect(fanItems[0].category).toBe('tesisat');

      // Tesisat konfor kalemleri toplamı (t5..t12 + t9b) motorun hesapladığı konfor tesisat toplamına eşit olmalı
      const tesisatComfortSum = itemsWithFan
        .filter((item) => item.category === 'tesisat')
        .reduce((acc, item) => acc + item.total, 0);

      const expectedMotorComfortSystemsSum =
        (resultsWithFan.underfloorHeatingCost || 0) +
        (resultsWithFan.waterFiltrationCost || 0) +
        (resultsWithFan.acCostTotal || 0) +
        (resultsWithFan.thermostaticMixerCost || 0) +
        (resultsWithFan.linearDrainCost || 0) +
        (resultsWithFan.bathroomHumidityFanCost || 0) +
        (resultsWithFan.touchlessKitchenFaucetCost || 0) +
        (resultsWithFan.smartDoorLockCost || 0) +
        (resultsWithFan.generatorCost || 0);

      expect(tesisatComfortSum).toBe(expectedMotorComfortSystemsSum);

      // hasBathroomHumidityFan kapalıyken t9b listeye eklenmemeli
      const paramsWithoutFan = applyCalculatorParamsUpdate(paramsWithFan, {
        hasBathroomHumidityFan: false,
      });
      const resultsWithoutFan = calculateProject(paramsWithoutFan);
      const itemsWithoutFan = buildComfortSystemTakeoffItems(
        paramsWithoutFan,
        resultsWithoutFan,
        paramsWithoutFan.flatCount
      );
      expect(itemsWithoutFan.find((item) => item.id === 't9b')).toBeUndefined();
    });
  });

  describe('Y-2: On Konfor Özelliğinin ve Bodrum Birim Etiketlerinin Teknik Şartname Tutarlılığı', () => {
    it('10 konfor özelliğinin tamamı tek ortak kaynaktan yönetilir ve yalnızca seçili olanlar (bathroomHumidityFan dahil) döner', () => {
      const params = createSampleProject({
        hasUnderfloorHeating: true,
        hasWaterFiltration: false,
        hasAcOption: false,
        hasThermostaticShowerMixer: false,
        hasLinearShowerDrain: true,
        hasBathroomHumidityFan: true,
        hasTouchlessKitchenFaucet: false,
        hasSmartDoorLock: true,
        hasGenerator: false,
        hasPorcelainCountertop: true,
      });
      const results = calculateProject(params);

      const allTen = getSpecificationComfortFeatures(params, results);
      expect(allTen).toHaveLength(10);

      const selected = getSelectedSpecificationComfortFeatures(params, results);
      expect(selected.map((f) => f.key)).toEqual([
        'underfloorHeating',
        'linearShowerDrain',
        'bathroomHumidityFan',
        'smartDoorLock',
        'porcelainCountertop',
      ]);

      const fanFeature = selected.find((f) => f.key === 'bathroomHumidityFan')!;
      expect(fanFeature.title).toContain('Banyo Nem');
      expect(fanFeature.selected).toBe(true);
    });

    it('formatSpecificationUnitLabels bodrum dükkânı ve bodrum dairesi etiketlerini ekran ve yazdırma için doğru üretir', () => {
      const basementShopLabels = formatSpecificationUnitLabels(
        { id: 1, floorNumber: -1, flatType: 'basement_shop' },
        2
      );
      expect(basementShopLabels.floorText).toBe('Bodrum Kat');
      expect(basementShopLabels.unitTitle).toContain('Bodrum İşyeri');
      expect(basementShopLabels.unitTypeBadge).toBe('Bodrum İşyeri');

      const basementFlatLabels = formatSpecificationUnitLabels(
        { id: 2, floorNumber: -1, flatType: 'basement_flat' },
        2
      );
      expect(basementFlatLabels.floorText).toBe('Bodrum Kat');
      expect(basementFlatLabels.unitTitle).toContain('Bodrum Daire');
      expect(basementFlatLabels.unitTypeBadge).toBe('Bodrum Dairesi');
    });
  });

  describe('Y-3: 3D Teklif Görselinin Projeye Özel Olması ve İzolasyonu', () => {
    const storageMap = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => (storageMap.has(key) ? storageMap.get(key)! : null),
      setItem: (key: string, val: string) => {
        storageMap.set(key, val);
      },
      clear: () => storageMap.clear(),
    };

    beforeEach(() => {
      storageMap.clear();
      Object.defineProperty(globalThis, 'localStorage', {
        value: mockStorage,
        configurable: true,
        writable: true,
      });
    });

    it('Proje A için kaydedilen 3D görsel Proje B açıldığında teklif veya PDF önizlemesine sızmaz', () => {
      const projectA = {
        projectName: 'Proje A Konutları',
        projectAddress: 'Cerrahpaşa Mah. 101 Ada 5 Parsel',
      };
      const projectB = {
        projectName: 'Proje B Rezidans',
        projectAddress: 'Kocamustafapaşa Mah. 202 Ada 9 Parsel',
      };

      saveProjectScopedOffer3DPreview({
        url: 'data:image/jpeg;base64,PROJE_A_3D',
        caption: 'Proje A 3D Perspektif',
        ...projectA,
      });

      // Proje A kendi 3D görselini okuyabilmeli
      const loadedForA = loadProjectScopedOffer3DPreview(projectA);
      expect(loadedForA).not.toBeNull();
      expect(loadedForA?.url).toBe('data:image/jpeg;base64,PROJE_A_3D');

      // Proje B açıldığında Proje A'nın 3D görseli kesinlikle yüklenmemeli
      const loadedForB = loadProjectScopedOffer3DPreview(projectB);
      expect(loadedForB).toBeNull();

      // Proje B kendi görselini kaydettiğinde Proje A'nın görseli de kaybolmamalı
      saveProjectScopedOffer3DPreview({
        url: 'data:image/jpeg;base64,PROJE_B_3D',
        caption: 'Proje B 3D Perspektif',
        ...projectB,
      });
      expect(loadProjectScopedOffer3DPreview(projectB)?.url).toBe(
        'data:image/jpeg;base64,PROJE_B_3D'
      );
      expect(loadProjectScopedOffer3DPreview(projectA)?.url).toBe(
        'data:image/jpeg;base64,PROJE_A_3D'
      );
    });

    it('Kimliği doğrulanamayan veya başka projeye ait eski format (legacy) kayıtları reddeder, yalnızca adres eşleşirse kabul eder', () => {
      const activeProject = {
        projectName: 'Fatih Palas',
        projectAddress: 'Haseki Sultan Mah. 500 Ada 12 Parsel',
      };

      // 1) Proje kimliği olmayan eski kayıt -> reddedilmeli
      localStorage.setItem(
        OFFER_3D_PREVIEW_GLOBAL_STORAGE_KEY,
        JSON.stringify({
          url: 'data:image/jpeg;base64,UNKNOWN_LEGACY',
          caption: '3D Model',
        })
      );
      expect(loadProjectScopedOffer3DPreview(activeProject)).toBeNull();

      // 2) Başka projeye ait eski kayıt -> reddedilmeli
      localStorage.setItem(
        OFFER_3D_PREVIEW_GLOBAL_STORAGE_KEY,
        JSON.stringify({
          url: 'data:image/jpeg;base64,OTHER_LEGACY',
          caption: '3D Model',
          projectAddress: 'Fındıkzade Mah. 999 Ada 1 Parsel',
        })
      );
      expect(loadProjectScopedOffer3DPreview(activeProject)).toBeNull();

      // 3) Aktif projeyle adres eşleşmesi olan eski kayıt -> kabul edilmeli
      localStorage.setItem(
        OFFER_3D_PREVIEW_GLOBAL_STORAGE_KEY,
        JSON.stringify({
          url: 'data:image/jpeg;base64,MATCHING_LEGACY',
          caption: '3D Model',
          projectAddress: 'Haseki Sultan Mah. 500 Ada 12 Parsel',
        })
      );
      expect(loadProjectScopedOffer3DPreview(activeProject)?.url).toBe(
        'data:image/jpeg;base64,MATCHING_LEGACY'
      );
    });
  });

  describe('Y-4: Mimari Parametrelerin (mansardFlatCount, roofAtticType, shopArea) Çift Yönlü Senkronizasyonu', () => {
    it('Aşama 3 <-> Aşama 4 arasında mansardFlatCount, roofType/roofAtticType ve shopArea kayıpsız senkronize olur', () => {
      // 1) Aşama 3'te mansard çatı, 3 mansard dairesi ve 135 m² dükkan alanı seçilsin
      let projectState = createSampleProject({
        hasGroundFloorShop: true,
        shopCount: 2,
        shopArea: 135,
        roofType: 'mansard',
        mansardFlatCount: 3,
      });

      expect(projectState.roofType).toBe('mansard');
      expect(projectState.roofAtticType).toBe('independent');
      expect(projectState.mansardFlatCount).toBe(3);
      expect(projectState.shopArea).toBe(135);

      const mansardUnits = projectState.flats.filter((f) => f.flatType === 'mansard');
      expect(mansardUnits).toHaveLength(3);

      // 2) ProjectParams -> BuildingModelParams senkronizasyonu
      let modelState = syncProjectParamsToBuildingModel(DEFAULT_BUILDING_PARAMS, projectState);
      expect(modelState.roofType).toBe('mansard');
      expect(modelState.mansardFlatCount).toBe(3);
      expect(modelState.shopArea).toBe(135);

      // 3) Aşama 4 (3D Model) üzerinden mansardFlatCount=4 ve shopArea=160 olarak güncellensin
      projectState = applyBuildingModelUpdateToProjectParams(projectState, {
        mansardFlatCount: 4,
        shopArea: 160,
      });
      expect(projectState.mansardFlatCount).toBe(4);
      expect(projectState.shopArea).toBe(160);
      expect(projectState.flats.filter((f) => f.flatType === 'mansard')).toHaveLength(4);

      // 4) Aşama 3'te roofAtticType='duplex_unified' seçildiğinde roofType otomatik 'duplex' olmalı ve 3D modele yansımalı
      projectState = applyCalculatorParamsUpdate(projectState, {
        roofAtticType: 'duplex_unified',
      });
      expect(projectState.roofType).toBe('duplex');
      expect(projectState.roofAtticType).toBe('duplex_unified');

      modelState = syncProjectParamsToBuildingModel(modelState, projectState);
      expect(modelState.roofType).toBe('duplex');
    });
  });
});

describe('FAZ 3 / UYGULAMA 2B: Bağımsız Denetim Tutarsızlık Düzeltmeleri Regresyon Testleri', () => {
  describe('2B-1: Dükkan Mutfak/Kapı (i5/i6) ve Ortak Kategori (manualEqualExtraCost, inflationBufferAmount) Maliyet Tutarlılığı', () => {
    it('Dükkansız ve dükkanlı projelerde i5 (mutfak) ve i6 (kapı) kalemleri motorun residential/shop ağırlıklarıyla (%20 mutfak, %40 kapı) birebir eşleşir ve birimleri karıştırmaz', () => {
      // 1) Dükkansız proje: 10 konut dairesi
      const noShopParams = createSampleProject({
        floorCount: 5,
        flatsPerFloor: 2,
        hasGroundFloorShop: false,
        priceKitchen: 135000,
        priceDoors: 85000,
        costMultiplier: 1.0,
      });
      const noShopResults = calculateProject(noShopParams);
      const noShopItems = buildKitchenAndDoorTakeoffItems(
        noShopParams,
        noShopResults,
        noShopParams.flatCount,
        1.0
      );

      expect(noShopItems).toHaveLength(2);
      expect(noShopItems.find((i) => i.id === 'i5')?.quantity).toBe(10);
      expect(noShopItems.find((i) => i.id === 'i5')?.unit).toBe('Daire');
      expect(noShopItems.find((i) => i.id === 'i5')?.total).toBe(10 * 135000);
      expect(noShopItems.find((i) => i.id === 'i6')?.quantity).toBe(10);
      expect(noShopItems.find((i) => i.id === 'i6')?.unit).toBe('Daire');
      expect(noShopItems.find((i) => i.id === 'i6')?.total).toBe(10 * 85000);

      // 2) Zemin katta 2 ticari dükkan + üst katlarda 8 konut dairesi olan proje
      const withShopParams = createSampleProject({
        floorCount: 5,
        flatsPerFloor: 2,
        hasGroundFloorShop: true,
        shopCount: 2,
        priceKitchen: 135000,
        priceDoors: 85000,
        costMultiplier: 1.0,
      });
      const withShopResults = calculateProject(withShopParams);
      expect(withShopResults.residentialUnitsCount).toBe(8);
      expect(withShopResults.shopUnitsCount).toBe(2);

      const withShopItems = buildKitchenAndDoorTakeoffItems(
        withShopParams,
        withShopResults,
        withShopParams.flatCount,
        1.0
      );

      const resKitchen = withShopItems.find((i) => i.id === 'i5')!;
      const shopKitchen = withShopItems.find((i) => i.id === 'i5_shop')!;
      const resDoors = withShopItems.find((i) => i.id === 'i6')!;
      const shopDoors = withShopItems.find((i) => i.id === 'i6_shop')!;

      // Konut ve dükkan miktarları ayrı kalemlerde ve ayrı birimlerde ('Daire' vs 'Dükkan') tutulmalı
      expect(resKitchen.unit).toBe('Daire');
      expect(resKitchen.quantity).toBe(8);
      expect(resKitchen.unitPrice).toBe(135000);
      expect(resKitchen.total).toBe(8 * 135000);

      expect(shopKitchen.unit).toBe('Dükkan');
      expect(shopKitchen.quantity).toBe(2);
      expect(shopKitchen.unitPrice).toBe(Math.round(135000 * 0.2)); // %20 = 27.000
      expect(shopKitchen.total).toBe(2 * 27000);

      expect(resDoors.unit).toBe('Daire');
      expect(resDoors.quantity).toBe(8);
      expect(resDoors.unitPrice).toBe(85000);
      expect(resDoors.total).toBe(8 * 85000);

      expect(shopDoors.unit).toBe('Dükkan');
      expect(shopDoors.quantity).toBe(2);
      expect(shopDoors.unitPrice).toBe(Math.round(85000 * 0.4)); // %40 = 34.000
      expect(shopDoors.total).toBe(2 * 34000);

      // İnce inşaat toplamının motorun finishingTotalCost değeriyle birebir eşleştiğini doğrula
      const totalArea = withShopResults.totalArea;
      const pvcM2 = Math.round(totalArea * 0.18 * 10) / 10;
      const paintPlasterM2 = Math.round(totalArea * 2.8 * 10) / 10;
      const allInceTotal =
        withShopParams.flatCount * (withShopParams.pricePlumbing ?? 75000) +
        withShopParams.flatCount * (withShopParams.priceElectric ?? 60000) +
        pvcM2 * (withShopParams.pricePvc ?? 4800) +
        totalArea * (withShopParams.priceTiles ?? 850) +
        paintPlasterM2 * (withShopParams.pricePaintPlaster ?? 520) +
        withShopItems.reduce((sum, i) => sum + i.total, 0);

      expect(Math.round(allInceTotal)).toBe(withShopResults.finishingTotalCost);
    });

    it('manualEqualExtraCost ve inflationBufferAmount açık/kapalıyken commonCost ve totalSum çift sayım olmadan motorla tutarlıdır', () => {
      // 1) İkisi de kapalıyken
      const baseParams = createSampleProject({
        manualEqualExtraCost: 0,
        hasInflationBuffer: false,
      });
      const baseResults = calculateProject(baseParams);
      const baseCommonItems = buildCommonCategoryTakeoffItems(baseParams, baseResults);
      const baseTotals = computeTakeoffCategoryTotals([
        {
          id: 'k_all',
          category: 'kaba',
          name: 'Kaba',
          unit: 'Set',
          quantity: 1,
          unitPrice: baseResults.kabaTotalCost,
          total: baseResults.kabaTotalCost,
          laborShare: 30,
        },
        {
          id: 'i_all',
          category: 'ince',
          name: 'İnce',
          unit: 'Set',
          quantity: 1,
          unitPrice: baseResults.finishingTotalCost,
          total: baseResults.finishingTotalCost,
          laborShare: 40,
        },
        {
          id: 't_all',
          category: 'tesisat',
          name: 'Tesisat',
          unit: 'Set',
          quantity: 1,
          unitPrice: baseResults.systemsCost,
          total: baseResults.systemsCost,
          laborShare: 20,
        },
        {
          id: 'r_all',
          category: 'resmi',
          name: 'Resmi',
          unit: 'Set',
          quantity: 1,
          unitPrice: baseResults.officialCost + baseResults.sgkSalesCost,
          total: baseResults.officialCost + baseResults.sgkSalesCost,
          laborShare: 40,
        },
        ...baseCommonItems,
      ]);

      expect(baseTotals.commonCost).toBe(0);
      expect(baseTotals.totalSum).toBe(baseResults.subTotalCost);

      // 2) Her ikisi de açıkken (manualEqualExtraCost = 400.000 TL, hasInflationBuffer = true %15)
      const activeParams = createSampleProject({
        manualEqualExtraCost: 400000,
        manualEqualExtraCostLabel: 'Belediye Trafo Katkı Payı',
        hasInflationBuffer: true,
        inflationBufferRate: 15,
      });
      const activeResults = calculateProject(activeParams);
      expect(activeResults.inflationBufferAmount).toBeGreaterThan(0);

      const activeCommonItems = buildCommonCategoryTakeoffItems(activeParams, activeResults);
      expect(activeCommonItems).toHaveLength(2);

      const activeTotals = computeTakeoffCategoryTotals([
        {
          id: 'k_all',
          category: 'kaba',
          name: 'Kaba',
          unit: 'Set',
          quantity: 1,
          unitPrice: activeResults.kabaTotalCost,
          total: activeResults.kabaTotalCost,
          laborShare: 30,
        },
        {
          id: 'i_all',
          category: 'ince',
          name: 'İnce',
          unit: 'Set',
          quantity: 1,
          unitPrice: activeResults.finishingTotalCost,
          total: activeResults.finishingTotalCost,
          laborShare: 40,
        },
        {
          id: 't_all',
          category: 'tesisat',
          name: 'Tesisat',
          unit: 'Set',
          quantity: 1,
          unitPrice: activeResults.systemsCost,
          total: activeResults.systemsCost,
          laborShare: 20,
        },
        {
          id: 'r_all',
          category: 'resmi',
          name: 'Resmi',
          unit: 'Set',
          quantity: 1,
          unitPrice: activeResults.officialCost + activeResults.sgkSalesCost,
          total: activeResults.officialCost + activeResults.sgkSalesCost,
          laborShare: 40,
        },
        ...activeCommonItems,
      ]);

      expect(activeTotals.commonCost).toBe(400000 + (activeResults.inflationBufferAmount || 0));
      expect(activeTotals.commonLabor).toBe((activeResults.inflationBufferAmount || 0) * 0.5);
      // subTotalCost zaten inflationBufferAmount içerir; manualEqualExtraCost eklendiğinde totalSum ile birebir eşleşir
      expect(activeTotals.totalSum).toBe(activeResults.subTotalCost + 400000);
    });
  });

  describe('2B-2: Teknik Şartname Boş Konfor Bilgi Notu ve Bodrum Sözel Özetleri', () => {
    it('Hiçbir konfor özelliği seçilmediğinde boş liste döner ve standart bilgi mesajı sabiti tanımlıdır', () => {
      const params = createSampleProject({
        hasUnderfloorHeating: false,
        hasWaterFiltration: false,
        hasAcOption: false,
        hasThermostaticShowerMixer: false,
        hasLinearShowerDrain: false,
        hasBathroomHumidityFan: false,
        hasTouchlessKitchenFaucet: false,
        hasSmartDoorLock: false,
        hasGenerator: false,
        hasPorcelainCountertop: false,
      });
      const selected = getSelectedSpecificationComfortFeatures(params);
      expect(selected).toHaveLength(0);
      expect(SPECIFICATION_EMPTY_COMFORT_MESSAGE).toBe(
        'İlave opsiyonel konfor donanımı seçilmemiştir; standart teknik şartname donanımları uygulanacaktır.'
      );
    });

    it('basementPurpose === "residential" ve çoklu basementConfig kombinasyonlarında sözel özetlerde "Bodrum Dairesi" ifadesini tutarlı üretir', () => {
      // 1) Tekli basementPurpose === 'residential'
      const resBasement = formatSpecificationBasementSummary({
        basementCount: 1,
        basementPurpose: 'residential',
        basementShopCount: 2,
      });
      expect(resBasement.shortSummary).toContain('2 Adet Bodrum Dairesi');
      expect(resBasement.htmlSummary).toContain('2 Adet Bodrum Dairesi');
      expect(resBasement.detailedSummary).toContain('2 Adet Bodrum Dairesi');

      // 2) Çoklu basementConfig kombinasyonu (Bodrum Dairesi + Ticari İşyeri + Kapalı Otopark)
      const multiBasement = formatSpecificationBasementSummary({
        basementCount: 2,
        basementConfig: [
          { id: 'b1', type: 'residential', count: 1 },
          { id: 'b2', type: 'commercial_shop', count: 2 },
          { id: 'b3', type: 'parking', count: 1 },
        ],
      });
      expect(multiBasement.shortSummary).toContain('2 Kat Bodrum');
      expect(multiBasement.shortSummary).toContain('1 Adet Bodrum Dairesi');
      expect(multiBasement.shortSummary).toContain('2 Adet Ticari İşyeri / Dükkan');
      expect(multiBasement.shortSummary).toContain('Kapalı Otopark');
      expect(multiBasement.detailedSummary).toContain('1 Adet Bodrum Dairesi');
      expect(multiBasement.detailedSummary).toContain('2 Adet Bodrum Kat Ticari İşyeri / Dükkan');
      expect(multiBasement.detailedSummary).toContain('kapalı otopark alanları');
    });
  });

  describe('2B-3: Aynı Adreste Farklı Proje Alternatiflerinin İzolasyonu ve Sonradan Adres Eklenen Projenin 3D Görsel Koruması', () => {
    const storageMap = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => (storageMap.has(key) ? storageMap.get(key)! : null),
      setItem: (key: string, val: string) => {
        storageMap.set(key, val);
      },
      clear: () => storageMap.clear(),
    };

    beforeEach(() => {
      storageMap.clear();
      Object.defineProperty(globalThis, 'localStorage', {
        value: mockStorage,
        configurable: true,
        writable: true,
      });
    });

    it('Aynı arsa adresinde farklı projectName değerine sahip iki proje alternatifinin 3D görselleri birbirine karışmaz', () => {
      const sharedAddress = 'Cerrahpaşa Mah. 1422 Ada 18 Parsel';
      const alternativeA = {
        projectAddress: sharedAddress,
        projectName: 'Alternatif A - 5 Kat Konut',
      };
      const alternativeB = {
        projectAddress: sharedAddress,
        projectName: 'Alternatif B - Zemin Ticari + 4 Kat',
      };

      saveProjectScopedOffer3DPreview({
        url: 'data:image/jpeg;base64,ALT_A_IMAGE',
        caption: 'Alternatif A 3D',
        ...alternativeA,
      });

      // Alternatif A kendi görselini yükler, ancak aynı adresteki Alternatif B bu görseli yüklemez
      expect(loadProjectScopedOffer3DPreview(alternativeA)?.url).toBe(
        'data:image/jpeg;base64,ALT_A_IMAGE'
      );
      expect(loadProjectScopedOffer3DPreview(alternativeB)).toBeNull();

      // Alternatif B de kendi görselini kaydettiğinde her iki alternatif kendi görselini bağımsız korur
      saveProjectScopedOffer3DPreview({
        url: 'data:image/jpeg;base64,ALT_B_IMAGE',
        caption: 'Alternatif B 3D',
        ...alternativeB,
      });

      expect(loadProjectScopedOffer3DPreview(alternativeA)?.url).toBe(
        'data:image/jpeg;base64,ALT_A_IMAGE'
      );
      expect(loadProjectScopedOffer3DPreview(alternativeB)?.url).toBe(
        'data:image/jpeg;base64,ALT_B_IMAGE'
      );
    });

    it('Önce yalnızca projectName ile oluşturulan projeye daha sonra projectAddress eklendiğinde kaydedilmiş 3D görsel korunur', () => {
      const initialNameOnlyProject = {
        projectName: 'Güneş Rezidans',
        projectAddress: '',
      };

      saveProjectScopedOffer3DPreview({
        url: 'data:image/jpeg;base64,GUNES_3D_IMAGE',
        caption: 'Güneş Rezidans 3D',
        ...initialNameOnlyProject,
      });

      expect(loadProjectScopedOffer3DPreview(initialNameOnlyProject)?.url).toBe(
        'data:image/jpeg;base64,GUNES_3D_IMAGE'
      );

      // Daha sonra aynı projeye arsa adresi eklensin
      const projectAfterAddressAdded = {
        projectName: 'Güneş Rezidans',
        projectAddress: 'Kocamustafapaşa Mah. 777 Ada 4 Parsel',
      };

      const preservedPreview = loadProjectScopedOffer3DPreview(projectAfterAddressAdded);
      expect(preservedPreview).not.toBeNull();
      expect(preservedPreview?.url).toBe('data:image/jpeg;base64,GUNES_3D_IMAGE');
    });
  });

  describe('2B-4: Çatı Tipi (gable/flat) Geçişlerinde roofAtticType Temizliği ve Eski Proje Yükleme Senkronizasyonu', () => {
    it('mansard veya duplex çatı tipinden gable veya flat tipine geçildiğinde roofAtticType temizlenir ve gable altında roofAtticType atanmaz', () => {
      let state = createSampleProject({
        roofType: 'mansard',
        mansardFlatCount: 3,
      });
      expect(state.roofType).toBe('mansard');
      expect(state.roofAtticType).toBe('independent');

      // gable çatıya geçiş
      state = applyCalculatorParamsUpdate(state, { roofType: 'gable' });
      expect(state.roofType).toBe('gable');
      expect(state.roofAtticType).toBeUndefined();

      // duplex çatıya geçiş
      state = applyCalculatorParamsUpdate(state, { roofType: 'duplex' });
      expect(state.roofType).toBe('duplex');
      expect(state.roofAtticType).toBe('duplex_unified');

      // flat çatıya geçiş
      state = applyCalculatorParamsUpdate(state, { roofType: 'flat' });
      expect(state.roofType).toBe('flat');
      expect(state.roofAtticType).toBeUndefined();
    });

    it('Eski proje yüklemede savedData.buildingModelParams mevcut olsa bile params içindeki mansardFlatCount, roofType ve shopArea 3D modele senkronize edilir', () => {
      const legacySavedParams = applyCalculatorParamsUpdate(DEFAULT_PARAMS, {
        projectName: 'Eski Kayıtlı Proje',
        projectAddress: 'Fatih Mah. 300 Ada 1 Parsel',
        hasGroundFloorShop: true,
        shopCount: 2,
        shopArea: 145,
        roofType: 'mansard',
        mansardFlatCount: 3,
      });

      // Eski kayıttaki buildingModelParams içinde mansardFlatCount ve shopArea eksik, roofType eski 'gable' kalmış olsun
      const staleSavedBuildingModel = {
        ...DEFAULT_BUILDING_PARAMS,
        roofType: 'gable' as const,
        mansardFlatCount: undefined,
        shopArea: undefined,
      };

      const syncedOnLoad = syncProjectParamsToBuildingModel(
        staleSavedBuildingModel,
        legacySavedParams
      );

      expect(syncedOnLoad.roofType).toBe('mansard');
      expect(syncedOnLoad.mansardFlatCount).toBe(3);
      expect(syncedOnLoad.shopArea).toBe(145);
      expect(syncedOnLoad.flatCount).toBe(legacySavedParams.flatCount);
    });
  });

  describe('FAZ 3 / UYGULAMA 3 (Y-5–Y-8) Veri Tutarlılığı Testleri', () => {
    describe('Y-5: Mimari Parametrelerin ve Manuel Daire Verilerinin Korunması', () => {
      it('Yeni bağımsız bölüm eklenirken (kat artışı veya zemin dükkan eklenmesi) mevcut dairelerin manuel alan, arsa payı ve malik verileri korunur', () => {
        let state = createSampleProject({
          floorCount: 3,
          flatsPerFloor: 2,
          hasGroundFloorShop: false,
        });
        expect(state.flats).toHaveLength(6);

        // Kullanıcı 1. ve 2. dairede manuel alan, arsa payı ve malik bilgisi tanımlasın
        const customFlats = state.flats.map((f, idx) =>
          idx === 0
            ? {
                ...f,
                name: 'Ahmet Yılmaz',
                tc: '12345678901',
                ownerId: 'owner-ahmet',
                area: 138,
                landShareNumerator: 1750,
                manualUnitPrice: 31500,
              }
            : idx === 1
            ? {
                ...f,
                name: 'Ayşe Kaya',
                tc: '23456789012',
                ownerId: 'owner-ayse',
                area: 112,
                landShareNumerator: 1420,
              }
            : f
        );
        state = applyCalculatorParamsUpdate(state, { flats: customFlats });

        // Kat sayısı 3 -> 4 yapılarak 2 yeni bağımsız bölüm eklensin
        state = applyCalculatorParamsUpdate(state, { floorCount: 4 });
        expect(state.flats).toHaveLength(8);
        expect(state.flats[0].name).toBe('Ahmet Yılmaz');
        expect(state.flats[0].area).toBe(138);
        expect(state.flats[0].landShareNumerator).toBe(1750);
        expect(state.flats[0].ownerId).toBe('owner-ahmet');
        expect(state.flats[0].manualUnitPrice).toBe(31500);
        expect(state.flats[1].name).toBe('Ayşe Kaya');
        expect(state.flats[1].area).toBe(112);
        expect(state.flats[1].landShareNumerator).toBe(1420);

        // Zemin kata dükkan eklendiğinde de konutların manuel verileri ezilmez
        state = applyCalculatorParamsUpdate(state, {
          hasGroundFloorShop: true,
          shopCount: 1,
        });
        const ahmetFlat = state.flats.find((f) => f.ownerId === 'owner-ahmet');
        const ayseFlat = state.flats.find((f) => f.ownerId === 'owner-ayse');
        expect(ahmetFlat).toBeDefined();
        expect(ahmetFlat?.area).toBe(138);
        expect(ahmetFlat?.landShareNumerator).toBe(1750);
        expect(ayseFlat?.area).toBe(112);
        expect(ayseFlat?.landShareNumerator).toBe(1420);
      });

      it('Kat alanı eşitleme işlemi kullanıcının manuel özelleştirdiği arsa paylarını (landShareNumerator) ezmez', () => {
        let state = createSampleProject({
          floorCount: 3,
          flatsPerFloor: 2,
          baseBuildArea: 200,
        });
        const customFlats = state.flats.map((f, idx) =>
          idx === 0
            ? { ...f, area: 125, landShareNumerator: 2450 } // Manuel özel arsa payı (125*10=1250'den farklı)
            : f
        );
        state = applyCalculatorParamsUpdate(state, { flats: customFlats });

        const equalized = equalizeFloorAreasPreservingManualValues(state, {
          preserveManualAreas: false,
          preserveManualLandShares: true,
        });
        // 1. dairenin alanı kat ortalamasına eşitlenirken manuel arsa payı (2450) korunur
        expect(equalized[0].landShareNumerator).toBe(2450);
      });
    });

    describe('Y-6: KAKS Hesaplaması ve Poligon/Arsa Geometrisi Senkronizasyonu', () => {
      it('polygonDraw modunda poligon noktaları değiştiğinde baseBuildArea ve KAKS/TAKS oranları senkronize güncellenir', () => {
        let state = createSampleProject({
          landArea: 500,
          floorCount: 5,
          footprintInputMode: 'polygonDraw',
          hasCantilever: true,
          cantileverDepth: 1.5,
          cantileverDirection: 'front',
        });

        // 20m x 12m = 240 m² dikdörtgen poligon
        const poly240 = [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 20, y: 12 },
          { x: 0, y: 12 },
        ];
        state = applyCalculatorParamsUpdate(state, { polygonPoints: poly240 });
        expect(state.baseBuildArea).toBe(240);

        const calcResults = calculateProject(state);
        const ratios = calculateProjectZoningRatios(state, calcResults);

        // TAKS = 240 / 500 = %48.0
        expect(ratios.baseArea).toBe(240);
        expect(ratios.taksPercent).toBeCloseTo(48, 2);
        // KAKS konsol çıkma dahil gerçek toplam inşaat alanı / arsa alanına eşit olmalı
        expect(ratios.totalConstructionArea).toBeCloseTo(calcResults.totalArea, 2);
        expect(ratios.kaksRatio).toBeCloseTo(calcResults.totalArea / 500, 4);
      });

      it('polygonDraw modunda baseBuildArea güncellendiğinde poligon geometrisi yeni taban alanına ölçeklenir', () => {
        let state = createSampleProject({
          footprintInputMode: 'polygonDraw',
          polygonPoints: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
          ],
          baseBuildArea: 100,
        });

        state = applyCalculatorParamsUpdate(state, { baseBuildArea: 225 });
        expect(state.baseBuildArea).toBe(225);
        expect(calculatePolygonArea(state.polygonPoints!)).toBeCloseTo(225, 1);
      });
    });

    describe('Y-7: Sözleşme Teklif Numarası ve Ek-1 Malik Bilgileri (landowners Fallback)', () => {
      it('Sözleşme belgesinde teklif numarası yer alır ve Ek-1 tablosunda ownerId bulunamadığında landowners verisi kullanılır', () => {
        const state = createSampleProject({
          offerMeta: {
            proposalNumber: 'ABY-2026-8842',
            createdAt: '2026-04-01T10:00:00.000Z',
            validUntil: '2026-04-16T10:00:00.000Z',
            validityDays: 15,
            currentVersion: 1,
            statusHistory: [],
          },
          landowners: [
            {
              id: 'real-owner-1',
              name: 'Mustafa Demir',
              tcOrTaxNo: '44556677880',
              phone: '0532 111 22 33',
              landShareNumerator: 320,
              landShareDenominator: 1000,
            },
            {
              id: 'real-owner-2',
              name: 'Zeynep Çelik',
              tcOrTaxNo: '99887766554',
              phone: '0533 444 55 66',
              landShareNumerator: 280,
              landShareDenominator: 1000,
            },
          ],
        });

        // Dairelerin ownerId değeri silinmiş veya geçersiz ('stale-id') bırakılmış olsun
        state.flats[0] = {
          ...state.flats[0],
          ownerId: 'non-existent-owner-id',
          name: 'Kat Maliki 1',
          tc: '10000000001',
        };
        state.flats[1] = {
          ...state.flats[1],
          ownerId: undefined,
          name: 'Kat Maliki 2',
          tc: '10000000002',
        };

        const results = calculateProject(state);

        expect(resolveContractProposalNumber(state, 'AB YAPI')).toBe('ABY-2026-8842');

        const owner1Info = resolveContractAnnexOwnerInfo(results.flatResults[0], state, 0);
        expect(owner1Info.ownerName).toBe('Mustafa Demir');
        expect(owner1Info.ownerTc).toBe('44556677880');
        expect(owner1Info.landShareText).toBe('320/1000');

        const owner2Info = resolveContractAnnexOwnerInfo(results.flatResults[1], state, 1);
        expect(owner2Info.ownerName).toBe('Zeynep Çelik');
        expect(owner2Info.ownerTc).toBe('99887766554');
        expect(owner2Info.landShareText).toBe('280/1000');

        const html = generateContractHtml(state, results);
        expect(html).toContain('ABY-2026-8842');
        expect(html).toContain('Mustafa Demir');
        expect(html).toContain('44556677880');
        expect(html).toContain('320/1000');
      });
    });

    describe('Y-8: projectAddress Değiştiğinde Şantiye Kayıtlarının Korunması', () => {
      beforeEach(() => {
        localStorage.clear();
      });

      it('Proje adresi değiştiğinde resolveProjectProgressKeys eski şantiye kayıtlarını kaybettirmez, ancak farklı projeleri birbirinden izole tutar', () => {
        const initialKeys = resolveProjectProgressKeys({
          projectAddress: 'Kadıköy Moda Mah. 10 Ada 2 Parsel',
          projectName: 'Moda Sahil Konakları',
          proposalNumber: 'ABY-2026-9901',
        });

        // İlk adres anahtarına şantiye verisi kaydedilsin
        setLocalProgressItemByKeys(
          initialKeys.primaryKey,
          initialKeys.candidateKeys.slice(1),
          'stages',
          JSON.stringify([{ id: 'stage_1', progressPercent: 85 }])
        );

        // Kullanıcı aynı projenin adresini güncellesin
        const updatedAddressKeys = resolveProjectProgressKeys({
          projectAddress: 'Kadıköy Caferağa Mah. 10 Ada 2 Parsel (Yeni Adres)',
          projectName: 'Moda Sahil Konakları',
          proposalNumber: 'ABY-2026-9901',
        });

        const recoveredStages = getLocalProgressItemByKeys(
          updatedAddressKeys.candidateKeys,
          'stages'
        );
        expect(recoveredStages).not.toBeNull();
        expect(JSON.parse(recoveredStages!)[0].progressPercent).toBe(85);

        // Tamamen farklı bir projeye geçildiğinde eski projenin şantiye verisi karışmaz (K-2 koruması)
        const otherProjectKeys = resolveProjectProgressKeys({
          projectAddress: 'Beşiktaş Levent Mah. 55 Ada 9 Parsel',
          projectName: 'Levent Kule',
          proposalNumber: 'ABY-2026-7700',
        });
        expect(
          getLocalProgressItemByKeys(otherProjectKeys.candidateKeys, 'stages')
        ).toBeNull();
      });
    });
  });
});




describe('optional building features', () => {
  it('keeps a basement when the shop extends below ground', () => {
    for (const shopLocation of ['basement', 'both'] as const) {
      const project = createSampleProject({ hasGroundFloorShop: true, shopLocation, basementCount: 0 });
      expect(project.basementCount).toBe(1);
      expect(applyCalculatorParamsUpdate(project, { basementCount: 0 }).basementCount).toBe(1);
      expect(applyCalculatorParamsUpdate(project, { shopLocation: 'ground', basementCount: 0 }).basementCount).toBe(0);
    }
  });

  it('preserves disabled balcony and elevator values in the model and omits elevator cost', () => {
    const without = createSampleProject({ balconyDepth: 0, elevatorCount: 0 });
    const withElevator = { ...without, elevatorCount: 1 };
    const model = syncProjectParamsToBuildingModel(DEFAULT_BUILDING_PARAMS, without);
    expect(model.balconyDepth).toBe(0);
    expect(model.elevatorCount).toBe(0);
    expect(calculateProject(withElevator).systemsCost).toBeGreaterThan(calculateProject(without).systemsCost);
  });
});
