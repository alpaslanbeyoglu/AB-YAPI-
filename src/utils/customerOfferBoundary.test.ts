import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { DEFAULT_PARAMS, calculateProject } from './calculatorEngine';
import {
  buildCustomerOfferPayload,
  buildInitializedOfferMeta,
  createOfferVersionSnapshot,
  appendOfferStatusHistory,
  resolveOfferMetadata,
  resolveSelectedDualFeatureIds,
  generateCustomerWhatsAppSummary,
  findForbiddenCustomerKeys,
  escapeHtml,
  escapeCssString,
  sanitizeUrl,
} from './customerOfferBoundary';
import { generateOfferHtml, generateOfferHtmlFromPayload } from './offerReportExport';
import { computeDualOffer } from './dualOfferUtils';
import { OfferTab } from '../components/OfferTab';
import { CompanyProfile, ProjectParams, CalculationResult } from '../types';

const SECRET_INTERNAL_NOTE = 'GIZLI_SIRKET_NOTU_KAR_MARJI_OZEL_998877';

const SENTINEL_VALUES = {
  subTotalCost: 11223344,
  profitAmount: 5566778,
  inflationBufferAmount: 3344556,
  underfloorHeatingCost: 413579,
  waterFiltrationCost: 174283,
  acCostTotal: 298765,
  acCostPerFlat: 49123,
  thermostaticMixerCost: 83619,
  linearDrainCost: 62917,
  bathroomHumidityFanCost: 54713,
  touchlessKitchenFaucetCost: 71829,
  smartDoorLockCost: 92461,
  generatorCost: 638142,
  porcelainCountertopCost: 519374,
  grossCostPerSqM: 47891,
};

const MOCK_COMPANY_PROFILE: CompanyProfile = {
  companyName: 'AB YAPI',
  legalName: 'AB YAPI MÜTEAHHİTLİK TİC. LTD. ŞTİ.',
  slogan: 'Güvene Yükselen Yapılar',
  tagline: 'Kentsel Dönüşüm ve Nitelikli Konut',
  address: 'Fatih / İstanbul',
  phone: '+90 212 585 10 20',
  email: 'info@abyapi.com.tr',
  website: 'https://ab-yapi.com.tr',
  taxOffice: 'Fatih VD',
  taxNumber: '1234567890',
  authorizedPerson: 'Müh. Alpaslan Beyoğlu',
  authorizedTitle: 'Genel Müdür',
  authorizedChamberNo: 'İMO-74120',
};

function createTurnkeyFixture(): { params: ProjectParams; results: CalculationResult } {
  const params: ProjectParams = {
    ...DEFAULT_PARAMS,
    projectName: 'Fatih Merkez Konutları',
    projectAddress: 'Kocamustafapaşa Mah. Fatih / İstanbul',
    projectModel: 'urbanTransformation',
    transformationStatus: 'currentSupport',
    offerPresentationMode: 'dual',
    profitRate: 28,
    hasInflationBuffer: true,
    inflationBufferRate: 17,
    hasUnderfloorHeating: true,
    hasWaterFiltration: true,
    hasAcOption: true,
    hasThermostaticShowerMixer: true,
    hasLinearShowerDrain: true,
    hasBathroomHumidityFan: true,
    hasTouchlessKitchenFaucet: true,
    hasSmartDoorLock: true,
    hasGenerator: true,
    hasPorcelainCountertop: true,
    customContractNotes: 'Müşteriye açık şeffaf sözleşme notu.',
    offerMeta: {
      proposalNumber: 'ABY-2026-4091',
      createdAt: '2026-05-10T09:00:00.000Z',
      validityDays: 30,
      validUntil: '2026-06-09T09:00:00.000Z',
      currentVersion: 2,
      internalNotes: SECRET_INTERNAL_NOTE,
      versions: [],
      statusHistory: [],
    },
  };

  const baseResults = calculateProject(params);
  const results: CalculationResult = {
    ...baseResults,
    ...SENTINEL_VALUES,
  };

  return { params, results };
}

function createContractorShareFixture(): { params: ProjectParams; results: CalculationResult } {
  const params: ProjectParams = {
    ...DEFAULT_PARAMS,
    projectName: 'Silivrikapı Kat Karşılığı Rezidans',
    projectAddress: 'Silivrikapı Mah. Fatih / İstanbul',
    projectModel: 'contractorShare',
    transformationStatus: 'none',
    offerPresentationMode: 'single',
    profitRate: 35,
    hasInflationBuffer: true,
    inflationBufferRate: 20,
    contractorFlatIds: [1, 2],
    offerMeta: {
      proposalNumber: 'ABY-2026-7712',
      createdAt: '2026-06-01T10:00:00.000Z',
      validityDays: 45,
      validUntil: '2026-07-16T10:00:00.000Z',
      currentVersion: 1,
      internalNotes: SECRET_INTERNAL_NOTE,
      versions: [],
      statusHistory: [],
    },
  };

  const baseResults = calculateProject(params);
  const results: CalculationResult = {
    ...baseResults,
    ...SENTINEL_VALUES,
  };

  return { params, results };
}

describe('CustomerOfferPayload veri sınırı ve gizlilik testleri', () => {
  it('buildCustomerOfferPayload yasaklı hiçbir şirket içi alan anahtarını barındırmaz (Turnkey + Dual)', () => {
    const { params, results } = createTurnkeyFixture();
    const payload = buildCustomerOfferPayload(params, results, MOCK_COMPANY_PROFILE);

    expect(findForbiddenCustomerKeys(payload)).toEqual([]);

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain(SECRET_INTERNAL_NOTE);
    for (const [key, sentinel] of Object.entries(SENTINEL_VALUES)) {
      expect(serialized, `Gizli değer sızdı: ${key}`).not.toContain(String(sentinel));
    }

    expect(payload.dualOffer).not.toBeNull();
    expect(payload.identity.proposalNumber).toBe('ABY-2026-4091');
    expect(payload.identity.version).toBe(2);
    expect(payload.identity.validityDays).toBe(30);
    expect(payload.publicNotes).toBe('Müşteriye açık şeffaf sözleşme notu.');
  });

  it('buildCustomerOfferPayload Kat Karşılığı modelinde gizli alanları dışarıda bırakır', () => {
    const { params, results } = createContractorShareFixture();
    const payload = buildCustomerOfferPayload(params, results, MOCK_COMPANY_PROFILE);

    expect(findForbiddenCustomerKeys(payload)).toEqual([]);
    expect(payload.project.isContractorShareModel).toBe(true);
    expect(payload.sharing.contractorUnitsCount).toBeGreaterThan(0);

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain(SECRET_INTERNAL_NOTE);
    for (const sentinel of Object.values(SENTINEL_VALUES)) {
      expect(serialized).not.toContain(String(sentinel));
    }

    // Kat karşılığı modelinde bağımsız bölüm satırlarında nakit borç alanı bulunmaz
    for (const unit of payload.sharing.units) {
      expect(unit.netRemainingDebt).toBeUndefined();
    }
  });

  it('generateOfferHtml çıktısında iç maliyet, kâr, iç not ve enflasyon tamponu ibaresi bulunmaz', () => {
    const { params, results } = createTurnkeyFixture();
    const html = generateOfferHtml(params, results, false, MOCK_COMPANY_PROFILE);

    expect(html).not.toContain(SECRET_INTERNAL_NOTE);
    expect(html.toLowerCase()).not.toContain('enflasyon risk payı dahil edilmiş');

    for (const [key, sentinel] of Object.entries(SENTINEL_VALUES)) {
      const rawStr = String(sentinel);
      const formattedTr = sentinel.toLocaleString('tr-TR');
      expect(html, `HTML içine ham gizli değer sızdı: ${key}`).not.toContain(rawStr);
      expect(html, `HTML içine biçimli gizli değer sızdı: ${key}`).not.toContain(formattedTr);
    }

    // Kalıcı kimlik bilgileri HTML çıktısında görünmelidir
    expect(html).toContain('ABY-2026-4091');
    expect(html).toContain('v2');
    expect(html).toContain('30 Gün');
  });

  it('HTML çıktısında XSS ve enjeksiyon girişimleri güvenli biçimde escape edilir', () => {
    const { params, results } = createTurnkeyFixture();
    const xssProjectName = '<script>alert("xss-proj")</script>';
    const xssAddress = 'Fatih "<img src=x onerror=alert(1)>" & Mah.';
    const xssNote = '<svg onload=alert("note")>Özel & "Not"</svg>';
    const xssClause = '<iframe src="javascript:alert(2)"></iframe>';
    const xssCompany: CompanyProfile = {
      ...MOCK_COMPANY_PROFILE,
      companyName: 'AB <b>"YAPI"</b> & Co',
      website: 'javascript:alert("web")',
      logoBase64: 'javascript:alert("logo")',
    };

    const poisonedParams: ProjectParams = {
      ...params,
      projectName: xssProjectName,
      projectAddress: xssAddress,
      customContractNotes: xssNote,
      additionalOfferClauses: [xssClause],
      landowners: [
        {
          id: 'owner-1',
          name: '<script>alert("owner")</script> Ahmet Yılmaz',
          sharePercent: 50,
          existingUnitInfo: '<img src=x onerror=alert(3)>',
          specialAgreement: '<b>Özel</b>',
        },
      ],
    };

    const payload = buildCustomerOfferPayload(poisonedParams, results, xssCompany, [
      { url: 'javascript:alert("img")', caption: '<script>bad()</script>' },
      { url: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', caption: 'SVG engellenmeli' },
      { url: 'data:image/png;base64,iVBORw0KGgo=', caption: 'Güvenli "PNG" <Ek>' },
    ]);

    expect(payload.branding.website).toBe('');
    expect(payload.branding.logoBase64).toBe('');
    expect(payload.attachments).toHaveLength(1);
    expect(payload.attachments[0].caption).toBe('Güvenli "PNG" <Ek>');

    const html = generateOfferHtmlFromPayload(payload);
    // Zararlı HTML etiketleri ham olarak asla render edilmemeli
    expect(html).not.toContain('<script>alert(');
    expect(html).not.toContain('<iframe src=');
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<svg onload=');
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('src="javascript:');
    // Metin olarak güvenli biçimde HTML entity kaçışı uygulanmış olmalı
    expect(html).toContain('&lt;script&gt;alert(&quot;xss-proj&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;svg onload=alert(&quot;note&quot;)&gt;');
    expect(html).toContain('Güvenli &quot;PNG&quot; &lt;Ek&gt;');
  });

  it('escapeHtml, escapeCssString ve sanitizeUrl yardımcı fonksiyonları doğru çalışır', () => {
    expect(escapeHtml(`<a href="x">&'test'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&#39;test&#39;&lt;/a&gt;'
    );
    expect(escapeCssString('AB "YAPI" \\ <test>\nalt')).toBe('AB \\"YAPI\\" \\\\ test alt');

    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>', { allowDataImage: true })).toBe('');
    expect(sanitizeUrl('data:image/svg+xml;base64,abc', { allowDataImage: true })).toBe('');
    expect(sanitizeUrl('data:image/png;base64,iVBORw0KGgo=', { allowDataImage: true })).toBe(
      'data:image/png;base64,iVBORw0KGgo='
    );
    expect(sanitizeUrl('https://ab-yapi.com.tr/teklif')).toBe('https://ab-yapi.com.tr/teklif');
    expect(sanitizeUrl('ab-yapi.com.tr')).toBe('https://ab-yapi.com.tr');
  });
});

describe('WhatsApp müşteri özeti doğruluk testleri', () => {
  it('Anahtar Teslim özetinde "State Hibesi" yerine "Devlet Hibesi/Kredisi" yer alır ve gizli bilgi sızmaz', () => {
    const { params, results } = createTurnkeyFixture();
    const payload = buildCustomerOfferPayload(params, results, MOCK_COMPANY_PROFILE);
    const message = generateCustomerWhatsAppSummary(payload);

    expect(message).not.toContain('State Hibesi');
    expect(message).toContain('Devlet Hibesi/Kredisi');
    expect(message).toContain('ABY-2026-4091');
    expect(message).toContain('(v2)');
    expect(message).toContain('30 Gün');
    expect(message).not.toContain(SECRET_INTERNAL_NOTE);
    for (const sentinel of Object.values(SENTINEL_VALUES)) {
      expect(message).not.toContain(String(sentinel));
      expect(message).not.toContain(sentinel.toLocaleString('tr-TR'));
    }
  });

  it('Kat Karşılığı özetinde paylaşım bilgileri yer alır ve nakit taksit borcu yazılmaz', () => {
    const { params, results } = createContractorShareFixture();
    const payload = buildCustomerOfferPayload(params, results, MOCK_COMPANY_PROFILE);
    const message = generateCustomerWhatsAppSummary(payload);

    expect(message).toContain('KAT KARŞILIĞI PAYLAŞIM ÖZETİ');
    expect(message).toContain('Arsa Sahipleri Payı');
    expect(message).toContain('Yüklenici Payı');
    expect(message).toContain('nakit inşaat bedeli talep edilmez');
    expect(message).not.toContain('Aylık Taksit');
    expect(message).not.toContain('State Hibesi');
    expect(message).not.toContain(SECRET_INTERNAL_NOTE);
  });
});

describe('Geriye dönük uyumluluk ve sürümleme testleri', () => {
  it('Eski projelerde (offerMeta ve proposalStatus yokken) deterministik numara üretir ve durumu asla kabul/sunulmuş yapmaz', () => {
    const legacyParams: ProjectParams = {
      ...DEFAULT_PARAMS,
      projectName: 'Eski Kayıt Projesi',
      projectAddress: 'Kocamustafapaşa',
      proposalStatus: undefined,
      offerMeta: undefined,
    };

    const metaA = resolveOfferMetadata(legacyParams, 'AB YAPI');
    const metaB = resolveOfferMetadata(legacyParams, 'AB YAPI');

    expect(metaA.proposalNumber).toBe(metaB.proposalNumber);
    expect(metaA.proposalNumber).toMatch(/^ABY-\d{4}-\d{4}$/);
    expect(metaA.status).toBe('draft');
    expect(metaA.version).toBe(1);
    expect(metaA.hasPersistedMeta).toBe(false);
  });

  it('buildInitializedOfferMeta mevcut teklif numarasını ve oluşturma tarihini korur', () => {
    const { params } = createTurnkeyFixture();
    const preserved = buildInitializedOfferMeta(params, 'AB YAPI');

    expect(preserved.proposalNumber).toBe('ABY-2026-4091');
    expect(preserved.createdAt).toBe('2026-05-10T09:00:00.000Z');
    expect(preserved.currentVersion).toBe(2);
    expect(preserved.internalNotes).toBe(SECRET_INTERNAL_NOTE);
  });

  it('createOfferVersionSnapshot yalnızca güvenli CustomerOfferPayload dondurur ve sürüm numarasını artırır', () => {
    const { params, results } = createTurnkeyFixture();
    const { nextOfferMeta: meta1, snapshot: snap1 } = createOfferVersionSnapshot(
      params,
      results,
      MOCK_COMPANY_PROFILE,
      undefined,
      'İlk sunum revizyonu'
    );

    expect(snap1.version).toBe(2);
    expect(snap1.proposalNumber).toBe('ABY-2026-4091');
    expect(findForbiddenCustomerKeys(snap1.customerPayload)).toEqual([]);
    expect(JSON.stringify(snap1.customerPayload)).not.toContain(SECRET_INTERNAL_NOTE);

    const { nextOfferMeta: meta2, snapshot: snap2 } = createOfferVersionSnapshot(
      { ...params, offerMeta: meta1 },
      results,
      MOCK_COMPANY_PROFILE,
      undefined,
      'İkinci revizyon'
    );

    expect(snap2.version).toBe(3);
    expect(meta2.currentVersion).toBe(3);
    expect(meta2.versions).toHaveLength(2);
    expect(findForbiddenCustomerKeys(snap2.customerPayload)).toEqual([]);
  });

  it('appendOfferStatusHistory durum geçiş geçmişini kayıpsız ekler', () => {
    const { params } = createTurnkeyFixture();
    const updatedMeta = appendOfferStatusHistory(
      params,
      'AB YAPI',
      'draft',
      'presented',
      'Müşteriye ilk sunum yapıldı'
    );

    expect(updatedMeta.statusHistory).toHaveLength(1);
    expect(updatedMeta.statusHistory[0].fromStatus).toBe('draft');
    expect(updatedMeta.statusHistory[0].toStatus).toBe('presented');
    expect(updatedMeta.statusHistory[0].note).toBe('Müşteriye ilk sunum yapıldı');
  });
});

describe('Tekli Paket ve İkili Paket donanım sunumu doğrulaması', () => {
  it('Tekli Paket modunda hiçbir konfor donanımı seçili değilse opsiyonel/upgrade listesi üretilmez', () => {
    const { params, results } = createTurnkeyFixture();
    const singleEmptyParams: ProjectParams = {
      ...params,
      offerPresentationMode: 'single',
      showInnovativeOptions: true,
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
    };

    const payload = buildCustomerOfferPayload(singleEmptyParams, results, MOCK_COMPANY_PROFILE);
    const html = generateOfferHtmlFromPayload(payload);

    expect(payload.presentation.mode).toBe('single');
    expect(payload.dualOffer).toBeNull();
    expect(payload.innovativeOptions).toEqual([]);
    expect(html).not.toContain('Opsiyonel');
    expect(html).not.toContain('Opsiyonel Upgrade');
    expect(html).not.toContain('Opsiyonel Donanım');
    expect(html).not.toContain('İsteğe bağlı olarak eklenebilir');
    expect(html).not.toContain('İkili Teklif & Paket Karşılaştırma Matrisi');
    expect(html).not.toContain('Muvafakat Edilen Teklif Paketi');
    expect(findForbiddenCustomerKeys(payload)).toEqual([]);
  });

  it('Tekli Paket modunda yalnızca seçili pakete dahil donanımlar "Teklife Dahil" olarak sunulur, seçilmeyen Plus kalemleri opsiyonel gösterilmez', () => {
    const { params, results } = createTurnkeyFixture();
    const singlePartialParams: ProjectParams = {
      ...params,
      offerPresentationMode: 'single',
      showInnovativeOptions: true,
      hasUnderfloorHeating: true,
      hasWaterFiltration: false,
      hasAcOption: false,
      hasThermostaticShowerMixer: false,
      hasLinearShowerDrain: false,
      hasBathroomHumidityFan: false,
      hasTouchlessKitchenFaucet: false,
      hasSmartDoorLock: false,
      hasGenerator: true,
      hasPorcelainCountertop: false,
    };

    const payload = buildCustomerOfferPayload(singlePartialParams, results, MOCK_COMPANY_PROFILE);
    const html = generateOfferHtml(singlePartialParams, results, false, MOCK_COMPANY_PROFILE);

    expect(payload.presentation.mode).toBe('single');
    expect(payload.dualOffer).toBeNull();
    expect(payload.innovativeOptions).toHaveLength(2);
    expect(payload.innovativeOptions.map((o) => o.id)).toEqual(['underfloorHeating', 'generator']);
    expect(payload.innovativeOptions.every((o) => o.included && o.statusLabel === 'Teklife Dahil')).toBe(true);

    expect(html).toContain('Yerden Isıtma (Sulu)');
    expect(html).toContain('Otomatik Transfer Panolu (ATS) Jeneratör');
    expect(html).toContain('Teklife Dahil');
    expect(html).toContain('✓ Teklif kapsamına dahildir');
    expect(html).not.toContain('Merkezi Su Arıtma');
    expect(html).not.toContain('Termostatik Duş Bataryası');
    expect(html).not.toContain('Motorlu &amp; Biyometrik Akıllı Kapı Kilidi');
    expect(html).not.toContain('Opsiyonel');
    expect(html).not.toContain('İsteğe bağlı olarak eklenebilir');
    expect(html).not.toContain('İkili Teklif & Paket Karşılaştırma Matrisi');
    expect(findForbiddenCustomerKeys(payload)).toEqual([]);
  });

  it('İki Seçenekli Paket (dual) modunda Baz/Plus karşılaştırma matrisi ve paket farkları korunur, iç maliyet sızmaz', () => {
    const { params, results } = createTurnkeyFixture();
    const dualParams: ProjectParams = {
      ...params,
      offerPresentationMode: 'dual',
      showDualOfferMatrix: true,
      hasUnderfloorHeating: true,
      hasGenerator: false,
    };

    const payload = buildCustomerOfferPayload(dualParams, results, MOCK_COMPANY_PROFILE);
    const html = generateOfferHtmlFromPayload(payload);

    expect(payload.presentation.mode).toBe('dual');
    expect(payload.dualOffer).not.toBeNull();
    expect(payload.innovativeOptions).toHaveLength(10);
    expect(payload.innovativeOptions.find((o) => o.id === 'underfloorHeating')?.included).toBe(true);
    expect(payload.innovativeOptions.find((o) => o.id === 'generator')?.included).toBe(false);
    expect(payload.innovativeOptions.find((o) => o.id === 'generator')?.statusLabel).toBe('Opsiyonel Donanım');

    expect(html).toContain('İkili Teklif & Paket Karşılaştırma Matrisi');
    expect(html).toContain('1. SEÇENEK:');
    expect(html).toContain('2. SEÇENEK:');
    expect(html).toContain('Muvafakat Edilen Teklif Paketi');
    expect(findForbiddenCustomerKeys(payload)).toEqual([]);
    expect(html).not.toContain(SECRET_INTERNAL_NOTE);
  });

  const ALL_SINGLE_OFF: Partial<ProjectParams> = {
    offerPresentationMode: 'single',
    showInnovativeOptions: true,
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
  };

  const ALL_PLUS_OFF: NonNullable<ProjectParams['plusOfferFeatures']> = {
    underfloorHeating: false,
    waterFiltration: false,
    acOption: false,
    thermostaticShowerMixer: false,
    linearShowerDrain: false,
    bathroomHumidityFan: false,
    touchlessKitchenFaucet: false,
    smartDoorLock: false,
    smartHome: false,
    generator: false,
    porcelainCountertop: false,
  };

  it('Tekli Paket: 0 / 1 / 3 / 10 donanım seçim senaryoları payload, PDF/yazdırma HTML ve canlı önizleme DOM üzerinde birebir aynıdır', () => {
    const { params } = createTurnkeyFixture();

    // 1) 0 / 10 seçili -> Donanım bölümü tamamen gizli
    const p0: ProjectParams = { ...params, ...ALL_SINGLE_OFF };
    const r0 = calculateProject(p0);
    const payload0 = buildCustomerOfferPayload(p0, r0, MOCK_COMPANY_PROFILE);
    const html0 = generateOfferHtmlFromPayload(payload0);
    const preview0 = renderToStaticMarkup(
      React.createElement(OfferTab, { params: p0, results: r0, initialView: 'preview' })
    );
    expect(payload0.innovativeOptions).toHaveLength(0);
    expect(html0).not.toContain('Teklif Kapsamındaki Yapısal Kalite ve Yaşam Konforu Donanımları');
    expect(html0).not.toContain('Opsiyonel');
    expect(preview0).not.toContain('data-testid="single-offer-comfort-section"');
    expect(preview0).not.toContain('Opsiyonel Upgrade');

    // 2) 1 / 10 seçili -> Yalnızca seçilen 1 donanım
    const p1: ProjectParams = { ...params, ...ALL_SINGLE_OFF, hasThermostaticShowerMixer: true };
    const r1 = calculateProject(p1);
    const payload1 = buildCustomerOfferPayload(p1, r1, MOCK_COMPANY_PROFILE);
    const html1 = generateOfferHtmlFromPayload(payload1);
    const preview1 = renderToStaticMarkup(
      React.createElement(OfferTab, { params: p1, results: r1, initialView: 'preview' })
    );
    expect(payload1.innovativeOptions.map((o) => o.id)).toEqual(['thermostaticShowerMixer']);
    expect(html1).toContain('Termostatik Duş Bataryası');
    expect(html1).not.toContain('Yerden Isıtma (Sulu)');
    expect(html1).not.toContain('Merkezi Su Arıtma');
    expect(html1).not.toContain('Lineer Duş Süzgeci');
    expect(html1).not.toContain('Opsiyonel');
    expect(preview1).toContain('data-testid="single-offer-comfort-section"');
    expect(preview1).toContain('Termostatik Duş Bataryası');
    expect(preview1).not.toContain('Yerden Isıtma Sistemi (Sulu)');
    expect(preview1).not.toContain('Bina Girişi Merkezi Su Arıtma');
    expect(preview1).not.toContain('Opsiyonel Upgrade');

    // 3) 3 / 10 seçili -> Yalnızca seçilen 3 donanım
    const p3: ProjectParams = {
      ...params,
      ...ALL_SINGLE_OFF,
      hasUnderfloorHeating: true,
      hasSmartDoorLock: true,
      hasPorcelainCountertop: true,
    };
    const r3 = calculateProject(p3);
    const payload3 = buildCustomerOfferPayload(p3, r3, MOCK_COMPANY_PROFILE);
    const html3 = generateOfferHtmlFromPayload(payload3);
    const preview3 = renderToStaticMarkup(
      React.createElement(OfferTab, { params: p3, results: r3, initialView: 'preview' })
    );
    expect(payload3.innovativeOptions.map((o) => o.id)).toEqual([
      'underfloorHeating',
      'smartDoorLock',
      'porcelainCountertop',
    ]);
    expect(html3).toContain('Yerden Isıtma (Sulu)');
    expect(html3).toContain('Motorlu &amp; Biyometrik Akıllı Kapı Kilidi');
    expect(html3).toContain('12-15mm Lüks Porselen Mutfak Tezgahı');
    expect(html3).not.toContain('Merkezi Su Arıtma');
    expect(html3).not.toContain('Nem Sensörlü Banyo Fanı');
    expect(html3).not.toContain('Otomatik Transfer Panolu (ATS) Jeneratör');
    expect(html3).not.toContain('Opsiyonel');
    expect(preview3).toContain('Yerden Isıtma Sistemi (Sulu)');
    expect(preview3).toContain('Motorlu &amp; Biyometrik Akıllı Daire Kapısı Kilit Sistemi');
    expect(preview3).toContain('12-15mm Lüks Porselen Mutfak Tezgahı ve Alınlığı');
    expect(preview3).not.toContain('Bina Girişi Merkezi Su Arıtma');
    expect(preview3).not.toContain('Nem Sensörlü Sessiz Banyo Fanı');
    expect(preview3).not.toContain('Otomatik Transfer Panolu (ATS) Kabinli Jeneratör Sistemi');
    expect(preview3).not.toContain('Opsiyonel Upgrade');

    // 4) 10 / 10 seçili -> 10 donanımın tamamı
    const p10: ProjectParams = {
      ...params,
      offerPresentationMode: 'single',
      showInnovativeOptions: true,
      hasUnderfloorHeating: true,
      hasWaterFiltration: true,
      hasAcOption: true,
      hasThermostaticShowerMixer: true,
      hasLinearShowerDrain: true,
      hasBathroomHumidityFan: true,
      hasTouchlessKitchenFaucet: true,
      hasSmartDoorLock: true,
      hasGenerator: true,
      hasPorcelainCountertop: true,
    };
    const r10 = calculateProject(p10);
    const payload10 = buildCustomerOfferPayload(p10, r10, MOCK_COMPANY_PROFILE);
    const html10 = generateOfferHtmlFromPayload(payload10);
    const preview10 = renderToStaticMarkup(
      React.createElement(OfferTab, { params: p10, results: r10, initialView: 'preview' })
    );
    expect(payload10.innovativeOptions).toHaveLength(10);
    expect(payload10.innovativeOptions.every((o) => o.included && o.statusLabel === 'Teklife Dahil')).toBe(true);
    expect(html10).toContain('Yerden Isıtma (Sulu)');
    expect(html10).toContain('12-15mm Lüks Porselen Mutfak Tezgahı');
    expect(html10).not.toContain('Opsiyonel');
    expect(preview10).toContain('Teklif Kapsamına Dahil Donanımlar (10)');
    expect(preview10).not.toContain('Opsiyonel Upgrade');
  });

  it('İki Seçenekli Paket (dual): 0 / 1 / 3 / 11 Plus donanım seçim senaryoları payload, PDF/yazdırma HTML ve canlı önizleme DOM üzerinde birebir aynıdır', () => {
    const { params } = createTurnkeyFixture();

    // 1) 0 Plus seçili -> Karşılaştırma tablosu gizli, seçilmeyen Plus donanımları görünmez
    const d0: ProjectParams = {
      ...params,
      offerPresentationMode: 'dual',
      showDualOfferMatrix: true,
      showInnovativeOptions: true,
      plusOfferFeatures: { ...ALL_PLUS_OFF },
    };
    const dr0 = calculateProject(d0);
    const dp0 = buildCustomerOfferPayload(d0, dr0, MOCK_COMPANY_PROFILE);
    const dh0 = generateOfferHtmlFromPayload(dp0);
    const dprev0 = renderToStaticMarkup(
      React.createElement(OfferTab, { params: d0, results: dr0, initialView: 'preview' })
    );
    expect(resolveSelectedDualFeatureIds(d0.plusOfferFeatures).size).toBe(0);
    expect(dp0.dualOffer?.features).toEqual([]);
    expect(dh0).not.toContain('E.C.A. / Demirdöküm Sulu Yerden Isıtma Sistemi');
    expect(dh0).not.toContain('Merkezi Su Arıtma İstasyonu');
    expect(dh0).toContain('Plus paket kapsamında ek konfor donanımı seçilmemiştir.');
    // Önizlemede Tekli Paket 10 kart kutusu dual modda görünmez!
    expect(dprev0).not.toContain('data-testid="single-offer-comfort-section"');
    expect(dprev0).toContain('data-testid="dual-offer-matrix-section"');
    expect(dprev0).not.toContain('E.C.A. / Demirdöküm Sulu Yerden Isıtma Sistemi');
    expect(dprev0).not.toContain('Merkezi Su Arıtma İstasyonu');
    expect(dprev0).toContain('Plus paket kapsamında ek konfor donanımı seçilmemiştir.');

    // 2) 1 Plus seçili -> Yalnızca o 1 özellik
    const d1: ProjectParams = {
      ...params,
      offerPresentationMode: 'dual',
      showDualOfferMatrix: true,
      plusOfferFeatures: { ...ALL_PLUS_OFF, underfloorHeating: true },
    };
    const dr1 = calculateProject(d1);
    const dp1 = buildCustomerOfferPayload(d1, dr1, MOCK_COMPANY_PROFILE);
    const dh1 = generateOfferHtmlFromPayload(dp1);
    const dprev1 = renderToStaticMarkup(
      React.createElement(OfferTab, { params: d1, results: dr1, initialView: 'preview' })
    );
    expect(dp1.dualOffer?.features.map((f) => f.id)).toEqual(['heating']);
    expect(dh1).toContain('Isıtma Sistemi');
    expect(dh1).not.toContain('Merkezi Su Arıtma İstasyonu');
    expect(dh1).not.toContain('Nem Sensörlü Sessiz Banyo Fanı');
    expect(dh1).not.toContain('Motorlu Akıllı Daire Kapısı Kilidi');
    expect(dprev1).toContain('Isıtma Sistemi');
    expect(dprev1).not.toContain('Merkezi Su Arıtma İstasyonu');
    expect(dprev1).not.toContain('Nem Sensörlü Sessiz Banyo Fanı');
    expect(dprev1).not.toContain('Motorlu Akıllı Daire Kapısı Kilidi');

    // 3) 3 Plus seçili -> Yalnızca o 3 özellik
    const d3: ProjectParams = {
      ...params,
      offerPresentationMode: 'dual',
      showDualOfferMatrix: true,
      plusOfferFeatures: {
        ...ALL_PLUS_OFF,
        waterFiltration: true,
        smartDoorLock: true,
        generator: true,
      },
    };
    const dr3 = calculateProject(d3);
    const dp3 = buildCustomerOfferPayload(d3, dr3, MOCK_COMPANY_PROFILE);
    const dh3 = generateOfferHtmlFromPayload(dp3);
    const dprev3 = renderToStaticMarkup(
      React.createElement(OfferTab, { params: d3, results: dr3, initialView: 'preview' })
    );
    expect(dp3.dualOffer?.features.map((f) => f.id)).toEqual([
      'water',
      'smart_door_lock',
      'generator',
    ]);
    expect(dh3).toContain('Merkezi Su Arıtma İstasyonu');
    expect(dh3).toContain('Motorlu Akıllı Daire Kapısı Kilidi');
    expect(dh3).toContain('Otomatik Jeneratör &amp; ATS Transfer Panosu');
    expect(dh3).not.toContain('Emniyetli Termostatik Duş Bataryası');
    expect(dh3).not.toContain('Lüks Porselen Mutfak Tezgahı (12-15mm)');
    expect(dprev3).toContain('Merkezi Su Arıtma İstasyonu');
    expect(dprev3).toContain('Motorlu Akıllı Daire Kapısı Kilidi');
    expect(dprev3).toContain('Otomatik Jeneratör &amp; ATS Transfer Panosu');
    expect(dprev3).not.toContain('Emniyetli Termostatik Duş Bataryası');
    expect(dprev3).not.toContain('Lüks Porselen Mutfak Tezgahı (12-15mm)');

    // 4) 11 / 11 Plus seçili -> Tüm 11 özellik
    const d11: ProjectParams = {
      ...params,
      offerPresentationMode: 'dual',
      showDualOfferMatrix: true,
      plusOfferFeatures: {
        underfloorHeating: true,
        waterFiltration: true,
        acOption: true,
        thermostaticShowerMixer: true,
        linearShowerDrain: true,
        bathroomHumidityFan: true,
        touchlessKitchenFaucet: true,
        smartDoorLock: true,
        smartHome: true,
        generator: true,
        porcelainCountertop: true,
      },
    };
    const dr11 = calculateProject(d11);
    const dp11 = buildCustomerOfferPayload(d11, dr11, MOCK_COMPANY_PROFILE);
    const dh11 = generateOfferHtmlFromPayload(dp11);
    const dprev11 = renderToStaticMarkup(
      React.createElement(OfferTab, { params: d11, results: dr11, initialView: 'preview' })
    );
    expect(dp11.dualOffer?.features).toHaveLength(11);
    expect(dh11).toContain('Isıtma Sistemi');
    expect(dh11).toContain('Motorlu Akıllı Daire Kapısı Kilidi');
    expect(dh11).toContain('Lüks Porselen Mutfak Tezgahı (12-15mm)');
    expect(dprev11).toContain('Isıtma Sistemi');
    expect(dprev11).toContain('Motorlu Akıllı Daire Kapısı Kilidi');
    expect(dprev11).toContain('Lüks Porselen Mutfak Tezgahı (12-15mm)');
  });

  it('Plus Teklif 11 özelliğin her biri tikli/tiksiz fiyat kontrolü: her özellik fiyata doğru eklenir, kaldırıldığında birebir düşer ve 0 seçimde fark 0 TL olur', () => {
    const featureKeys = Object.keys(ALL_PLUS_OFF) as Array<keyof typeof ALL_PLUS_OFF>;
    const baseDualParams: ProjectParams = {
      ...DEFAULT_PARAMS,
      offerPresentationMode: 'dual',
    };

    // 1) 0/11 seçili -> fark 0 TL (eski custom delta kalsa bile!)
    const d0 = computeDualOffer({
      ...baseDualParams,
      plusOfferFeatures: { ...ALL_PLUS_OFF },
    });
    expect(d0.itemizedContractorCosts).toHaveLength(0);
    expect(d0.calculatedTotalCostDiff).toBe(0);
    expect(d0.customerFlatDelta).toBe(0);
    expect(d0.customerPlusGrandTotal).toBe(d0.customerBaseGrandTotal);

    const d0WithStaleCustom = computeDualOffer({
      ...baseDualParams,
      plusOfferCustomFlatDelta: 150000,
      plusOfferFeatures: { ...ALL_PLUS_OFF },
    });
    expect(d0WithStaleCustom.isCustomDeltaApplied).toBe(false);
    expect(d0WithStaleCustom.customerFlatDelta).toBe(0);
    expect(d0WithStaleCustom.customerPlusGrandTotal).toBe(d0WithStaleCustom.customerBaseGrandTotal);

    // 2) 11/11 hepsi seçili
    const dAll = computeDualOffer(baseDualParams);
    expect(dAll.itemizedContractorCosts).toHaveLength(11);

    // 3) Her 11 özelliğin tek tek (0->1) artışı ile (11->10) düşüşü birebir eşit ve > 0 olmalı
    let sumIndividual = 0;
    for (const key of featureKeys) {
      const dSingle = computeDualOffer({
        ...baseDualParams,
        plusOfferFeatures: { ...ALL_PLUS_OFF, [key]: true },
      });
      const dWithout = computeDualOffer({
        ...baseDualParams,
        plusOfferFeatures: {
          underfloorHeating: true,
          waterFiltration: true,
          acOption: true,
          thermostaticShowerMixer: true,
          linearShowerDrain: true,
          bathroomHumidityFan: true,
          touchlessKitchenFaucet: true,
          smartDoorLock: true,
          smartHome: true,
          generator: true,
          porcelainCountertop: true,
          [key]: false,
        },
      });

      expect(dSingle.itemizedContractorCosts, `${key} tek başına maliyet kalemi üretmeli`).toHaveLength(1);
      expect(dSingle.calculatedTotalCostDiff, `${key} tek başına > 0 TL eklemeli`).toBeGreaterThan(0);
      expect(dSingle.customerFlatDelta, `${key} daire başı farkı > 0 TL olmalı`).toBeGreaterThan(0);
      expect(dSingle.customerPlusGrandTotal - dSingle.customerBaseGrandTotal).toBe(dSingle.customerTotalCostDiff);

      // 11 -> 10 düşüşü birebir tek başına eklenen maliyetle eşit olmalı
      const dropTotal = dAll.calculatedTotalCostDiff - dWithout.calculatedTotalCostDiff;
      expect(dropTotal, `${key} tik kaldırıldığında toplam fark birebir düşmeli`).toBe(dSingle.calculatedTotalCostDiff);

      // Manuel m² birim fiyat girili projede dahi ilgili özellik fiyat farkı üretmeli
      const dManual = computeDualOffer({
        ...baseDualParams,
        manualFlatUnitPrice: 45000,
        plusOfferFeatures: { ...ALL_PLUS_OFF, [key]: true },
      });
      expect(dManual.calculatedTotalCostDiff, `${key} manuel m² fiyatlı projede de > 0 olmalı`).toBe(
        dSingle.calculatedTotalCostDiff
      );

      sumIndividual += dSingle.calculatedTotalCostDiff;
    }

    // 11 özelliğin tek tek toplamı, 11/11 toplamına birebir eşit olmalı
    expect(dAll.calculatedTotalCostDiff).toBe(sumIndividual);
  });
});


