import { describe, it, expect } from 'vitest';
import { DEFAULT_PARAMS, calculateProject } from './calculatorEngine';
import {
  buildCustomerOfferPayload,
  buildInitializedOfferMeta,
  createOfferVersionSnapshot,
  appendOfferStatusHistory,
  resolveOfferMetadata,
  generateCustomerWhatsAppSummary,
  findForbiddenCustomerKeys,
  escapeHtml,
  escapeCssString,
  sanitizeUrl,
} from './customerOfferBoundary';
import { generateOfferHtml, generateOfferHtmlFromPayload } from './offerReportExport';
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
