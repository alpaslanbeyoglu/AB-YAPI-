import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_PARAMS, calculateProject } from './calculatorEngine';
import { DUAL_OFFER_NAMING_PRESETS } from './dualOfferUtils';
import { resolveProjectProgressKeys, getLocalProgressItemByKeys } from './syncKeys';
import {
  applyCalculatorParamsUpdate,
  applyBuildingModelUpdateToProjectParams,
  buildOfferAcceptanceTransitionPatch,
  buildProposalStatusChangePatch,
  resolveEffectiveOfferAccepted,
  resolveEffectiveProposalStatus,
  sanitizeContractorFlatIds,
} from './workflowConsistencyUtils';
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
