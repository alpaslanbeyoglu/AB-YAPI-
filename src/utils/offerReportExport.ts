import { ProjectParams, CalculationResult, CompanyProfile } from '../types';

export function generateOfferHtml(
  params: ProjectParams,
  res: CalculationResult,
  showDrawings: boolean = false,
  companyProfile?: CompanyProfile,
  uploadedImages?: Array<{ url: string; caption?: string }>
): string {
  const opts = companyProfile?.printOptions || {};
  const showLogo = opts.showLogo !== false;
  const showLegal = opts.showLegalName !== false;
  const showSlogan = opts.showSlogan !== false;
  const showTagline = opts.showTagline !== false;
  const showPhone = opts.showPhone !== false;
  const showEmail = opts.showEmail !== false;
  const showWeb = opts.showWebsite !== false;
  const showAddr = opts.showAddress !== false;
  const showTax = opts.showTaxInfo !== false;
  const showBank = opts.showBankInfo !== false;
  const showFirstAuth = opts.showFirstAuthorized !== false;
  const showFirstAuthChamber = opts.showFirstAuthorizedChamber !== false;
  const showSecondAuth = opts.showSecondAuthorized === true && !!companyProfile?.authorizedPerson2;
  const showSecondAuthChamber = opts.showSecondAuthorizedChamber !== false;
  const showStamp = opts.showStamp !== false;

  const compName = companyProfile?.companyName || 'AB YAPI';
  const compLegal = companyProfile?.legalName || 'AB YAPI MÜTEAHHİTLİK VE MÜHENDİSLİK TİC. LTD. ŞTİ.';
  const compSlogan = companyProfile?.slogan || 'Güvene Yükselen Yapılar';
  const compTagline = companyProfile?.tagline || 'Kentsel Dönüşüm ve Nitelikli Konut Üretimi';
  const compAddress = companyProfile?.address || 'Kocamustafapaşa Mah. Orgeneral Abdurrahman Nafiz Gürman Cad. No:42 Fatih / İSTANBUL';
  const compPhone = companyProfile?.phone || '+90 (212) 585 10 20';
  const compEmail = companyProfile?.email || 'info@abyapi.com.tr';
  const compWeb = companyProfile?.website || 'www.abyapi.com.tr';
  const compAuth = companyProfile?.authorizedPerson || 'Müh. Alpaslan Beyoğlu';
  const compAuthTitle = companyProfile?.authorizedTitle || 'Genel Müdür / İnşaat Mühendisi';
  const compAuthChamber = companyProfile?.authorizedChamberNo || 'İMO-74120';
  const compAuth2 = companyProfile?.authorizedPerson2 || '';
  const compAuthTitle2 = companyProfile?.authorizedTitle2 || '';
  const compAuthChamber2 = companyProfile?.authorizedChamberNo2 || '';
  const compLogo = companyProfile?.logoBase64 || '';
  const compStamp = companyProfile?.stampBase64 || '';
  const compTax = companyProfile?.taxOffice && companyProfile?.taxNumber ? `${companyProfile.taxOffice} - V.No: ${companyProfile.taxNumber}` : '';
  const compBank = companyProfile?.bankName || '';
  const compIban = companyProfile?.iban || '';

  const supportText =
    params.transformationStatus === 'currentSupport'
      ? 'Yarısı Bizden (875 Bin TL Hibe + 875 Bin TL Kredi Desteği)'
      : params.transformationStatus === 'futureSupport2027'
      ? '2027 Kentsel Dönüşüm Kredi Modeli (3 Milyon TL / 180 Ay Vade)'
      : 'Öz Kaynaklı / Desteksiz Yapım Modeli';

  const isContractorShareModel = params.projectModel === 'contractorShare';

  const proposalNumber = `${compName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${String(res.flatCount || 10).padStart(3, '0')}`;
  const proposalDate = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const validityDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Categorize unit metrics matching OfferTab
  const shopUnits = res.flatResults.filter(f => f.flatType === 'shop');
  const normalUnits = res.flatResults.filter(f => f.flatType !== 'shop' && f.flatType !== 'mansard');
  const mansardUnits = res.flatResults.filter(f => f.flatType === 'mansard');

  const avgShopArea = shopUnits.length > 0 ? Math.round(shopUnits.reduce((acc, f) => acc + f.area, 0) / shopUnits.length) : 0;
  const avgNormalArea = normalUnits.length > 0 ? Math.round(normalUnits.reduce((acc, f) => acc + f.area, 0) / normalUnits.length) : Math.round(res.totalArea / (res.flatCount || 1));
  const avgMansardArea = mansardUnits.length > 0 ? Math.round(mansardUnits.reduce((acc, f) => acc + f.area, 0) / mansardUnits.length) : 0;

  const flatUnitPriceVal = params.manualFlatUnitPrice || res.grossCostPerSqM;
  const shopUnitPriceVal = params.manualShopUnitPrice || res.grossCostPerSqM;

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${compName} - Bina Yapım ve Kentsel Dönüşüm Teklifi</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 15mm 10mm;
      @bottom-right {
        content: "Sayfa " counter(page) " / " counter(pages);
        font-size: 9px;
        color: #64748b;
        font-weight: bold;
        font-family: sans-serif;
      }
      @bottom-left {
        content: "${compName} - Kentsel Dönüşüm Teklifi";
        font-size: 9px;
        color: #64748b;
        font-family: sans-serif;
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 0;
      color: #0f172a;
      max-width: 960px;
      margin: 0 auto;
      line-height: 1.5;
      font-size: 11px;
      background: #ffffff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; }
    .card-muted { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; }
    .card-dark { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; color: #f8fafc; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
    .badge-indigo { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }
    .badge-emerald { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .section-header { font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-top: 18px; margin-bottom: 10px; }
    .text-muted { color: #64748b; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
  </style>
</head>
<body>
  <!-- HEADER & CORPORATE BRANDING -->
  <div class="avoid-break" style="border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:14px;">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;">
      <div style="display:flex;align-items:center;gap:12px;">
        ${showLogo && compLogo ? `<img src="${compLogo}" alt="${compName}" style="max-height:54px;max-width:140px;object-fit:contain;" />` : ''}
        <div>
          <div style="font-size:16px;font-weight:bold;color:#0f172a;letter-spacing:-0.2px;">${compName}</div>
          ${showLegal ? `<div style="font-size:9.5px;font-weight:600;color:#334155;margin-top:1px;">${compLegal}</div>` : ''}
          ${showSlogan ? `<div style="font-size:9px;color:#64748b;font-style:italic;margin-top:1px;">"${compSlogan}"</div>` : ''}
          ${showTagline ? `<div style="font-size:8.5px;color:#475569;margin-top:1px;">${compTagline}</div>` : ''}
        </div>
      </div>
      <div style="text-align:right;font-size:9px;color:#475569;line-height:1.4;">
        ${showAddr && compAddress ? `<div>${compAddress}</div>` : ''}
        <div>${showPhone && compPhone ? `Tel: ${compPhone}` : ''} ${showEmail && compEmail ? `• E-posta: ${compEmail}` : ''}</div>
        <div>${showWeb && compWeb ? `Web: ${compWeb}` : ''} ${showTax && compTax ? `• ${compTax}` : ''}</div>
        ${showBank && compBank && compIban ? `<div style="font-family:monospace;color:#334155;">${compBank} - IBAN: ${compIban}</div>` : ''}
      </div>
    </div>
  </div>

  <!-- PROPOSAL TITLE & METADATA BAR -->
  <div class="avoid-break" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:14px;">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
      <div>
        <span class="badge ${isContractorShareModel ? 'badge-emerald' : 'badge-indigo'}">
          ${isContractorShareModel ? 'Kat Karşılığı İnşaat ve Bağımsız Bölüm Paylaşım Modeli' : supportText}
        </span>
        <h1 style="font-size:16px;font-weight:bold;color:#0f172a;margin:6px 0 2px 0;">BİNA YAPIM VE KENTSEL DÖNÜŞÜM TEKLİFİ</h1>
        <p style="font-size:10px;color:#64748b;margin:0;">
          ${isContractorShareModel ? 'Kat Karşılığı İnşaat ve Bağımsız Bölüm Paylaşım Teklifi' : 'Anahtar Teslim Bina Yapım ve Hakedişli Finansman Teklifi'} • Adres: <strong>${params.projectAddress || 'Belirtilen Adres'}</strong>
        </p>
      </div>
      <div style="text-align:right;font-size:9.5px;line-height:1.4;color:#475569;">
        <div>Teklif No: <strong style="font-family:monospace;color:#0f172a;">${proposalNumber}</strong></div>
        <div>Düzenleme Tarihi: <strong>${proposalDate}</strong></div>
        <div>Geçerlilik: <strong>${validityDate} (30 Gün)</strong></div>
        ${showFirstAuth ? `<div>Yetkili: <strong>${compAuth}</strong> (${compAuthTitle})</div>` : ''}
      </div>
    </div>
  </div>

  <!-- PROJE VİZYON VE YAŞAM DEĞERLERİ (3 CARDS) -->
  <div class="avoid-break" style="margin-bottom:14px;">
    <div class="grid-3">
      <div class="card-muted" style="border-left:3px solid #4f46e5;">
        <div style="font-weight:bold;font-size:11px;color:#1e1b4b;margin-bottom:4px;">✨ Yaşam Odaklı Tasarım</div>
        <p style="font-size:9.5px;color:#475569;margin:0;line-height:1.45;">
          Her metrekaresi huzurunuz için tasarlandı. Sadece bir yapı değil, nesiller boyu güvenle yaşayacağınız modern bir yuva inşa ediyoruz.
        </p>
      </div>
      <div class="card-muted" style="border-left:3px solid #059669;">
        <div style="font-weight:bold;font-size:11px;color:#064e3b;margin-bottom:4px;">🛡️ Maksimum Güvenlik</div>
        <p style="font-size:9.5px;color:#475569;margin:0;line-height:1.45;">
          En güncel deprem yönetmeliklerine uygun, ileri mühendislik teknikleri ve C35/40 sınıfı beton kalitesiyle sarsılmaz bir temel atıyoruz.
        </p>
      </div>
      <div class="card-muted" style="border-left:3px solid #0284c7;">
        <div style="font-weight:bold;font-size:11px;color:#082f49;margin-bottom:4px;">🤝 Şeffaf ve Adil Süreç</div>
        <p style="font-size:9.5px;color:#475569;margin:0;line-height:1.45;">
          Tüm maliyetleri ve planlamayı en başından paylaşıyor, her aşamada tam şeffaflıkla haklarınızı ve geleceğinizi koruyoruz.
        </p>
      </div>
    </div>
  </div>

  <!-- I. MİMARİ VE TEKNİK KÜNYE (4 SUMMARY CARDS - NO ARSA ALANI) -->
  <div class="avoid-break" style="margin-bottom:14px;">
    <div class="section-header">I. Mimari ve Teknik Künye</div>
    <div class="grid-4">
      <div class="card-muted">
        <div class="text-muted" style="font-size:9px;font-weight:bold;text-transform:uppercase;">Kat Yapısı</div>
        <div style="font-size:11.5px;font-weight:bold;color:#0f172a;margin-top:2px;">
          ${params.floorCount || 5} Katlı Yapı
        </div>
        <div class="text-muted" style="font-size:9px;margin-top:2px;">
          ${params.hasGroundFloorShop ? 'Zemin Ticari + Konut' : 'Tamamı Konut'}
        </div>
      </div>
      <div class="card-muted">
        <div class="text-muted" style="font-size:9px;font-weight:bold;text-transform:uppercase;">Toplam Birim</div>
        <div style="font-size:11.5px;font-weight:bold;color:#0f172a;margin-top:2px;">
          ${res.flatCount} Daire ${params.hasGroundFloorShop ? `+ ${params.shopCount || 1} Dükkan` : ''}
        </div>
        <div class="text-muted" style="font-size:9px;margin-top:2px;">
          ${res.totalArea.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} m² Toplam İnşaat Alanı
        </div>
      </div>
      <div class="card-muted" style="background:#eef2ff;border-color:#c7d2fe;">
        <div style="color:#4338ca;font-size:9px;font-weight:bold;text-transform:uppercase;">İmalat Bedelleri</div>
        <div style="font-size:11px;font-weight:bold;color:#1e1b4b;margin-top:2px;">
          Konut: ~${flatUnitPriceVal.toLocaleString('tr-TR')} ₺/m²
        </div>
        <div style="font-size:9px;color:#4338ca;margin-top:1px;">
          Dükkan: ~${shopUnitPriceVal.toLocaleString('tr-TR')} ₺/m²
        </div>
      </div>
      <div class="card-muted">
        <div class="text-muted" style="font-size:9px;font-weight:bold;text-transform:uppercase;">Teslim Süresi</div>
        <div style="font-size:11.5px;font-weight:bold;color:#0f172a;margin-top:2px;">
          ${res.finalMonths} Ay
        </div>
        <div class="text-muted" style="font-size:9px;margin-top:2px;">Anahtar Teslim Taahhüdü</div>
      </div>
    </div>
  </div>

  <!-- III. YAPISAL KALİTE VE TEKNİK STANDARTLAR -->
  <div class="avoid-break" style="margin-bottom:14px;">
    <div class="section-header">III. Yapısal Kalite ve Teknik Standartlar</div>
    <div class="grid-2">
      <div class="card-muted" style="border-left:3px solid #3b82f6;">
        <div style="font-weight:bold;font-size:11px;color:#1e293b;margin-bottom:3px;">🏗️ Deprem Güvenliği ve Altyapı</div>
        <p style="font-size:9.5px;color:#475569;margin:0;line-height:1.45;">
          C35/40 sınıfı yüksek mukavemetli hazır beton, radye jeneral temel ve sismik nervürlü donatı çeliği ile maksimum deprem direnci sağlanmaktadır.
        </p>
      </div>
      <div class="card-muted" style="border-left:3px solid #10b981;">
        <div style="font-weight:bold;font-size:11px;color:#1e293b;margin-bottom:3px;">🌿 Enerji Verimliliği ve Konfor</div>
        <p style="font-size:9.5px;color:#475569;margin:0;line-height:1.45;">
          Yüksek dansiteli taşyünü mantolama, Isıcam Konfor serisi çift cam ve ısı yalıtımlı PVC doğramalar ile 4 mevsim yüksek ısı ve ses tasarrufu.
        </p>
      </div>
    </div>
  </div>

  <!-- II. PROJE ÖZETİ VE FİNANSAL ÇERÇEVE -->
  <div class="avoid-break" style="margin-bottom:14px;">
    <div class="section-header">II. Proje Özeti ve Finansal Çerçeve</div>
    <div class="grid-2" style="align-items:stretch;">
      <!-- LEFT: KULLANIM VE YAŞAM ALANLARI -->
      <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <div style="font-size:11px;font-weight:bold;color:#0f172a;margin-bottom:8px;">Kullanım ve Yaşam Alanları</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${shopUnits.length > 0 ? `
            <div style="background:#f8fafc;padding:6px 10px;border-radius:8px;border:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:10px;font-weight:600;color:#334155;">🏪 Zemin Kat Ticari Dükkanlar:</span>
              <span style="font-size:10px;font-weight:bold;color:#0f172a;">${shopUnits.length} adet eşit dükkan, yaklaşık ~${avgShopArea} m²</span>
            </div>` : ''}
            <div style="background:#f8fafc;padding:6px 10px;border-radius:8px;border:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:10px;font-weight:600;color:#334155;">🏢 Modern Yaşam Daireleri:</span>
              <span style="font-size:10px;font-weight:bold;color:#0f172a;">Kat başına ${params.flatsPerFloor || 2} adet, yaklaşık ~${avgNormalArea} m² brüt alan</span>
            </div>
            ${mansardUnits.length > 0 ? `
            <div style="background:#f8fafc;padding:6px 10px;border-radius:8px;border:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:10px;font-weight:600;color:#334155;">🏚️ Mansart ve Çatı Özel Birimler:</span>
              <span style="font-size:10px;font-weight:bold;color:#0f172a;">${mansardUnits.length} adet, yaklaşık ~${avgMansardArea} m² brüt alan</span>
            </div>` : ''}
          </div>

          <!-- İMAR TEŞVİK AVANTAJI CARD -->
          <div style="margin-top:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-left:3px solid #16a34a;border-radius:8px;padding:8px 10px;">
            <div style="font-size:10px;font-weight:bold;color:#166534;margin-bottom:2px;">💎 İmar Teşvik Avantajı ve Finansman Modeli</div>
            <p style="font-size:9px;color:#14532d;margin:0;line-height:1.4;">
              Mevcut imar planındaki teşviklerden yararlanılarak kazanılan 4 adet mansart daire ve 2 adet normal kat dairenin mülkiyeti finansman karşılığı olarak yükleniciye devredilmiştir. Bu model sayesinde hak sahiplerinin imalat maliyetleri piyasa rayiçlerinin önemli ölçüde altında (subvanse edilmiş şekilde) belirlenmiştir.
            </p>
          </div>
        </div>

        <div style="margin-top:10px;padding-top:6px;border-top:1px dashed #e2e8f0;font-size:8.5px;color:#64748b;">
          * Belirtilen alanlar mimari ön etüt projesi baz alınarak hesaplanmış olup resmî ruhsat projesi ile kesinleşecektir.
        </div>
      </div>

      <!-- RIGHT: YATIRIM VE FİNANSMAN ÖZETİ (DARK CARD) -->
      <div class="card-dark" style="display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <div style="color:#94a3b8;font-size:9.5px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">
            Yatırım ve Finansman Özeti
          </div>
          <div style="font-size:20px;font-weight:800;color:#ffffff;margin-top:6px;font-family:monospace;">
            ${res.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
          </div>
          <div style="font-size:9.5px;color:#cbd5e1;margin-top:1px;">Toplam Tahmini Proje Değeri</div>

          <div style="margin-top:12px;border-top:1px solid #334155;padding-top:10px;display:flex;flex-direction:column;gap:6px;font-size:10px;">
            <div style="display:flex;justify-content:space-between;color:#cbd5e1;">
              <span>İnşaat ve İmalat Bedeli (%85):</span>
              <span style="font-family:monospace;font-weight:bold;color:#ffffff;">${(res.grandTotal * 0.85).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺</span>
            </div>
            <div style="display:flex;justify-content:space-between;color:#cbd5e1;">
              <span>Ruhsat, Harç ve Müşavirlik (%15):</span>
              <span style="font-family:monospace;font-weight:bold;color:#ffffff;">${(res.grandTotal * 0.15).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺</span>
            </div>
          </div>
        </div>

        <div style="margin-top:12px;padding:8px 10px;background:#1e293b;border-radius:8px;font-size:9px;color:#cbd5e1;border:1px solid #334155;">
          <strong style="color:#38bdf8;">Finansman Modeli:</strong> ${supportText}
        </div>
      </div>
    </div>
  </div>

  <!-- IV. ÖDEME VE TESLİM TAKVİMİ -->
  <div class="avoid-break" style="margin-bottom:14px;">
    <div class="section-header">IV. Ödeme ve Teslim Takvimi</div>
    <div class="grid-2">
      <div class="card-muted">
        <div style="font-weight:bold;font-size:11px;color:#0f172a;margin-bottom:3px;">📅 Uygulama Süreci</div>
        <p style="font-size:9.5px;color:#475569;margin:0;line-height:1.45;">
          Ruhsat onayından itibaren <strong>${res.finalMonths} Ay</strong> içerisinde iskânı alınmış, kat mülkiyeti kurulmuş ve bağımsız bölümleri anahtar teslim olarak hak sahiplerine devredilecektir.
        </p>
      </div>
      <div class="card-muted">
        <div style="font-weight:bold;font-size:11px;color:#0f172a;margin-bottom:3px;">💳 Ödeme Prensibi</div>
        <p style="font-size:9.5px;color:#475569;margin:0;line-height:1.45;">
          Ödemeler inşaatın fiziki ilerleme seviyesine göre hakediş usulü veya sözleşmede belirlenen eşit vadeli taksit planı ile güvenli ve şeffaf şekilde gerçekleştirilir.
        </p>
      </div>
    </div>
  </div>

  <!-- 5. TEKLİF EKLERİ VE GÖRSELLERİ (IF ANY) -->
  ${uploadedImages && uploadedImages.length > 0 ? `
  <div class="avoid-break" style="margin-bottom:14px;">
    <div class="section-header">5. Teklif Ekleri ve Görselleri</div>
    <div style="display:grid;grid-template-columns:${uploadedImages.length === 1 ? '1fr' : '1fr 1fr'};gap:12px;">
      ${uploadedImages.map((img, idx) => `
        <div class="card" style="text-align:center;">
          <img src="${img.url}" alt="${img.caption || 'Ek Belge'}" style="max-height:240px;max-width:100%;object-fit:contain;border-radius:6px;margin-bottom:6px;" />
          <div style="font-size:10px;font-weight:bold;color:#334155;">Ek ${idx + 1}: ${img.caption || 'Belge / Görsel'}</div>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <!-- 6. KURUMSAL TAAHHÜTLER VE YASAL GARANTİ PROTOKOLÜ -->
  <div class="avoid-break" style="margin-bottom:14px;">
    <div class="section-header">6. Kurumsal Taahhütler ve Yasal Garanti Protokolü</div>
    <div class="grid-3">
      <div class="card-muted" style="border-left:3px solid #4f46e5;">
        <div style="font-weight:bold;font-size:10.5px;color:#1e1b4b;margin-bottom:2px;">⚖️ Yasal Garanti (TBK m. 478)</div>
        <p style="font-size:9px;color:#475569;margin:0;line-height:1.4;">
          Taşıyıcı karkas sistemde <strong>20 Yıl</strong>, ince işçilik ve cephede <strong>5 Yıl</strong>, mekanik/asansör sistemlerinde <strong>2 Yıl</strong> resmi garanti geçerlidir.
        </p>
      </div>
      <div class="card-muted" style="border-left:3px solid #059669;">
        <div style="font-weight:bold;font-size:10.5px;color:#064e3b;margin-bottom:2px;">🏠 Kesin Teslim & Kira Desteği</div>
        <p style="font-size:9px;color:#475569;margin:0;line-height:1.4;">
          Süresi aşılırsa gecikilen her ay için hak sahiplerine emsal kira bedeli tutarında gecikme tazminatı nakden ödenir.
        </p>
      </div>
      <div class="card-muted" style="border-left:3px solid #0284c7;">
        <div style="font-weight:bold;font-size:10.5px;color:#082f49;margin-bottom:2px;">📜 Noter Onaylı Sözleşme</div>
        <p style="font-size:9px;color:#475569;margin:0;line-height:1.4;">
          Teklif onaylandığında taraflar arasında ilgili Noterlik nezdinde resmî Düzenleme Şeklinde İnşaat Sözleşmesi imzalanacaktır.
        </p>
      </div>
    </div>
    <div style="margin-top:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:9px;color:#64748b;line-height:1.4;">
      <strong>Mücbir Sebep & Resmi Süreç Bilgilendirmesi:</strong> Deprem, doğal afet, olağanüstü hâl ve ilgili resmî idareler (Belediye, Bakanlık vb.) nezdindeki imar planı askı ve yargı süreçlerindeki resmî beklemeler yasal mücbir sebep kabul edilir.
    </div>
  </div>

  <!-- TEKLİF EK MADDELERİ VE ÖZEL HÜKÜMLER -->
  ${params.additionalOfferClauses && params.additionalOfferClauses.length > 0 ? `
  <div class="avoid-break" style="margin-bottom:14px;">
    <div class="section-header">Teklif Ek Maddeleri ve Özel Hükümler</div>
    <div class="card-muted">
      <ol style="margin:0;padding-left:16px;font-size:9.5px;color:#334155;line-height:1.45;">
        ${params.additionalOfferClauses.map(clause => `
          <li style="margin-bottom:3px;">${clause}</li>
        `).join('')}
      </ol>
    </div>
  </div>
  ` : ''}

  <!-- 7. YETKİLİ İMZA VE KAŞE PROTOKOLÜ -->
  <div class="avoid-break" style="margin-top:16px;border-top:2px solid #0f172a;padding-top:14px;">
    <div class="grid-2">
      <!-- CLIENTS SIGNATURE -->
      <div style="text-align:center;border-right:1px dashed #cbd5e1;padding-right:16px;">
        <div style="font-weight:bold;font-size:11px;color:#0f172a;">ARSA SAHİPLERİ / BİNA YÖNETİMİ</div>
        <div style="color:#64748b;font-size:9.5px;margin:2px 0 24px 0;">Kat Malikleri Kurulu / Temsilci Heyeti</div>
        <div style="height:32px;border-bottom:1px solid #94a3b8;margin:0 24px 6px 24px;"></div>
        <div style="color:#64748b;font-size:9px;">(İmza / Tarih / TC)</div>
      </div>

      <!-- CONTRACTOR SIGNATURE -->
      <div style="text-align:center;padding-left:16px;position:relative;">
        <div style="font-weight:bold;font-size:11px;color:#0f172a;">YÜKLENİCİ FİRMA KAŞE / İMZA</div>
        <div style="font-size:9.5px;color:#475569;margin:2px 0 4px 0;font-weight:600;">${showLegal ? compLegal : compName}</div>
        
        <div style="display:flex;justify-content:center;gap:14px;align-items:center;min-height:48px;position:relative;">
          ${showStamp && compStamp ? `
            <img src="${compStamp}" alt="Kaşe/İmza" style="max-height:52px;object-fit:contain;position:absolute;z-index:2;opacity:0.9;" />
          ` : ''}
          ${showFirstAuth ? `
          <div style="position:relative;z-index:1;">
            <div style="font-weight:bold;color:#0f172a;font-size:10.5px;">${compAuth}</div>
            <div style="font-size:9px;color:#4338ca;font-weight:600;">${compAuthTitle}</div>
            ${showFirstAuthChamber && compAuthChamber ? `<div style="font-size:8.5px;color:#64748b;font-family:monospace;">${compAuthChamber}</div>` : ''}
          </div>
          ` : ''}
          ${showSecondAuth && compAuth2 ? `
          <div style="position:relative;z-index:1;border-left:1px solid #e2e8f0;padding-left:10px;">
            <div style="font-weight:bold;color:#0f172a;font-size:10.5px;">${compAuth2}</div>
            <div style="font-size:9px;color:#065f46;font-weight:600;">${compAuthTitle2}</div>
            ${showSecondAuthChamber && compAuthChamber2 ? `<div style="font-size:8.5px;color:#64748b;font-family:monospace;">${compAuthChamber2}</div>` : ''}
          </div>
          ` : ''}
        </div>
        <div style="height:12px;border-bottom:1px solid #94a3b8;margin:2px 24px 6px 24px;"></div>
        <div style="color:#64748b;font-size:9px;">Tarih: ${proposalDate}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
