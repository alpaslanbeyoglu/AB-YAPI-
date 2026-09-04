import { ProjectParams, CalculationResult, CompanyProfile } from '../types';

export function generateOfferHtml(
  params: ProjectParams,
  res: CalculationResult,
  showDrawings: boolean = true,
  companyProfile?: CompanyProfile
): string {
  const compName = companyProfile?.companyName || 'AB YAPI';
  const compLegal = companyProfile?.legalName || 'AB YAPI MÜTEAHHİTLİK LİMİTED ŞİRKETİ';
  const compSlogan = companyProfile?.slogan || 'Güvene Yükselen Yapılar';
  const compAddress = companyProfile?.address || 'İstanbul';
  const compPhone = companyProfile?.phone || '';
  const compEmail = companyProfile?.email || '';
  const compWeb = companyProfile?.website || '';
  const compAuth = companyProfile?.authorizedPerson || '';
  const compLogo = companyProfile?.logoBase64 || '';

  const supportText =
    params.transformationStatus === 'currentSupport'
      ? '2025/2026 Mevcut Model (875 Bin TL Hibe + 875 Bin TL Kredi)'
      : params.transformationStatus === 'futureSupport2027'
      ? '2027 Projeksiyon Modeli (3 Milyon TL Kredi / 180 Ay Vade)'
      : 'Desteksiz / Öz Kaynaklı Yapım';

  // Upper floor area and physical gross/net area estimation for consistency
  const upperFloorsCount_rep = Math.max(0, params.floorCount - 1);
  let upperFloorArea_rep = params.baseBuildArea;
  if (params.hasCantilever && params.cantileverDepth && params.cantileverDepth > 0) {
    const estW = Math.sqrt(params.baseBuildArea / 1.2);
    const estD = estW * 1.2;
    if (params.cantileverDirection === 'all') {
      upperFloorArea_rep = (estW + 2 * params.cantileverDepth) * (estD + 2 * params.cantileverDepth);
    } else if (params.cantileverDirection === 'front') {
      upperFloorArea_rep = estW * (estD + params.cantileverDepth);
    } else {
      upperFloorArea_rep = estW * (estD + 2 * params.cantileverDepth);
    }
  }
  const residentialFloors_rep = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
  const flatsPerFloor_rep = Math.max(1, Math.round(res.flatCount / residentialFloors_rep));
  const physicalGrossArea_rep = Math.round((upperFloorArea_rep / flatsPerFloor_rep) * 10) / 10;
  const physicalNetArea_rep = Math.round((physicalGrossArea_rep * 0.8) * 10) / 10;

  const isContractorShareModel = params.projectModel === 'contractorShare';

  const totalFlats = res.flatCount || 10;
  const totalFloors = params.floorCount || 5;
  const flatsPerFloor = Math.max(1, Math.ceil(totalFlats / totalFloors));

  const flatRows = res.flatResults
    .map(
      (f) => {
        const floorNo = Math.min(totalFloors, Math.ceil(f.id / flatsPerFloor));
        const roomCountText = params.roomType ? `${params.roomType} Oda` : (f.area < 65 ? '1+1 Oda' : f.area < 95 ? '2+1 Oda' : f.area < 135 ? '3+1 Oda' : '4+1 Oda');
        const netArea = physicalNetArea_rep;

        if (isContractorShareModel) {
          const fundingType = f.isContractorShare ? 'Müteahhit Payı Satış' : 'Arsa Payı Mahsubu';
          return `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">
              Daire ${f.id}<br>
              <small style="color:#4f46e5;font-weight:normal;">${floorNo}. Kat / ${totalFloors} Kat</small>
            </td>
            <td style="padding:8px;border:1px solid #ddd;">${f.name} <br><small style="color:#666;">TC: ${f.tc}</small></td>
            <td style="padding:8px;border:1px solid #ddd;">
              <strong>${roomCountText}</strong><br>
              <small style="color:#555;">Fiziki Brüt: ${physicalGrossArea_rep} m² <span style="font-size:8px;color:#888;">(Pay: ${f.area} m²)</span><br>Net: ${netArea} m²</small>
            </td>
            <td style="padding:8px;border:1px solid #ddd;">${f.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
            <td style="padding:8px;border:1px solid #ddd;color:#047857;font-weight:bold;">-${f.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL<br><small style="color:#666;">${fundingType}</small></td>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold;color:#047857;background-color:#f0fdf4;">0 TL</td>
          </tr>`;
        } else {
          return `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">
              Daire ${f.id}<br>
              <small style="color:#4f46e5;font-weight:normal;">${floorNo}. Kat / ${totalFloors} Kat</small>
            </td>
            <td style="padding:8px;border:1px solid #ddd;">${f.name} <br><small style="color:#666;">TC: ${f.tc}</small></td>
            <td style="padding:8px;border:1px solid #ddd;">
              <strong>${roomCountText}</strong><br>
              <small style="color:#555;">Fiziki Brüt: ${physicalGrossArea_rep} m² <span style="font-size:8px;color:#888;">(Pay: ${f.area} m²)</span><br>Net: ${netArea} m²</small>
            </td>
            <td style="padding:8px;border:1px solid #ddd;">${f.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
            <td style="padding:8px;border:1px solid #ddd;">-${f.downPayment.toLocaleString('tr-TR')} TL</td>
            <td style="padding:8px;border:1px solid #ddd;">-${f.usedCredit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${f.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          </tr>`;
        }
      }
    )
    .join('');

  const table1Header = isContractorShareModel
    ? `<tr><th>Daire & Kat No</th><th>Hak Sahibi & TC</th><th>Özellikler (Oda / Alan)</th><th>Daire Yapım Bedeli</th><th>Kat Karşılığı İndirimi</th><th style="color:#1e3a8a;">Net Malik Borcu</th></tr>`
    : `<tr><th>Daire & Kat No</th><th>Hak Sahibi & TC</th><th>Özellikler (Oda / Alan)</th><th>Toplam Borç</th><th>Ödenen Peşinat</th><th>Dönüşüm Desteği</th><th style="color:#1e3a8a;">Kalan Borç</th></tr>`;

  let table2OrStatement = '';
  if (isContractorShareModel) {
    table2OrStatement = `
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:16px;margin-bottom:20px;font-size:13px;color:#065f46;line-height:1.6;">
      <strong>🤝 Kat Karşılığı Finansman Beyanı:</strong>
      <p style="margin:4px 0 0 0;">Kat Karşılığı Yapım Modelinde, tüm imalat ve yapım maliyetleri müteahhite devredilen paylar ile finanse edildiğinden, arsa maliklerinin herhangi bir nakit borçlanması veya inşaat fiziki ilerlemesine bağlı hakediş takvimi bulunmamaktadır.</p>
    </div>`;
  } else {
    table2OrStatement = `
    <h3>2. Fiziki İlerleme Hakediş Takvimi (TL)</h3>
    <table>
      <thead>
        <tr>
          <th>Daire No / Hak Sahibi</th>
          <th>1. Aşama (%${params.stage1Pay})</th>
          <th>2. Aşama (%${params.stage2Pay})</th>
          <th>3. Aşama (%${params.stage3Pay})</th>
          <th>4. Aşama (%${params.stage4Pay})</th>
          <th>5. Aşama (%${params.stage5Pay})</th>
          <th>Toplam Malik Borcu</th>
        </tr>
      </thead>
      <tbody>
        ${res.flatResults.map(f => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Daire ${f.id} (${f.name})</td>
          <td style="padding:8px;border:1px solid #ddd;">${f.stagePayments[0].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          <td style="padding:8px;border:1px solid #ddd;">${f.stagePayments[1].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          <td style="padding:8px;border:1px solid #ddd;">${f.stagePayments[2].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          <td style="padding:8px;border:1px solid #ddd;font-weight:bold;color:#4f46e5;">${f.stagePayments[3].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          <td style="padding:8px;border:1px solid #ddd;">${f.stagePayments[4].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${f.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${compName} - Teklif ve Ödeme Planı</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; color: #333; max-width: 1000px; margin: 0 auto; }
    h2, h3, h4 { color: #1f7a7a; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 13px; }
    th { background: #37474f; color: white; padding: 8px; border: 1px solid #ddd; text-align: left; }
    .box { background: #f8f9fa; border-left: 4px solid #1f7a7a; padding: 15px; margin-bottom: 20px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="print-header" style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1f7a7a;padding-bottom:15px;margin-bottom:20px;">
    <div style="display:flex;align-items:center;gap:12px;">
      ${compLogo ? `<img src="${compLogo}" alt="${compName}" style="max-height:55px;max-width:140px;object-fit:contain;" />` : ''}
      <div>
        <h2 style="margin:0;color:#37474f;font-size:18px;">${compLegal}</h2>
        <p style="margin:3px 0 0 0;font-size:11px;color:#556068;">${compSlogan} - Resmi Müşteri Bilgilendirme ve Teklif Formu</p>
      </div>
    </div>
    <div style="text-align:right;font-size:11px;color:#666;">
      ${compPhone ? `<div>📞 ${compPhone}</div>` : ''}
      ${compEmail ? `<div>✉️ ${compEmail}</div>` : ''}
      ${compAddress ? `<div>📍 ${compAddress}</div>` : ''}
    </div>
  </div>
  <div class="box">
    <h4>📍 Yapı & Proje Genel Bilgileri</h4>
    <p><strong>Yapı Adresi:</strong> ${params.projectAddress}</p>
    <div style="display:grid;grid-template-columns: 1fr 1fr;gap: 8px;margin-top:10px;border-top:1px solid #ddd;padding-top:10px;">
      <div><strong>Toplam Kat Sayısı:</strong> ${params.floorCount} Kat</div>
      <div><strong>Toplam Daire Sayısı:</strong> ${res.flatCount} Adet</div>
      <div><strong>Bina Oturumu (Taban):</strong> ${res.baseArea.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m²</div>
      <div><strong>Toplam İnşaat Alanı:</strong> ${res.totalArea.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m²</div>
      <div><strong>Fiziki Daire Brüt Alanı:</strong> ${physicalGrossArea_rep} m²</div>
      <div><strong>Daire Net Alanı (~%80):</strong> ${physicalNetArea_rep} m²</div>
      <div><strong>Daire Tipi (Oda+Salon):</strong> ${params.roomType || '3+1'}</div>
      <div><strong>İnşaat Hakediş Payı (Daire Başı):</strong> ${res.flatResults.length > 0 ? res.flatResults[0].area : 0} m² <span style="font-size:8px;color:#888;">(Ortak alanlar dahil)</span></div>
      <div><strong>Birim İmalat Fiyatı:</strong> ${res.grossCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m² (${res.grossUsdPerSqM.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD/m²)</div>
    </div>
    <div style="margin-top:10px;border-top:1px solid #ddd;padding-top:10px;">
      ${
        params.durationOption !== 'hide'
          ? `<p style="margin: 2px 0;"><strong>Tahmini Proje ve Teslim Süresi:</strong> ${res.finalMonths} Ay <em style="color:#666;">${params.durationOption === 'auto' ? '(Proje Çizimi, Ruhsat ve İskân Süreçleri Dahil)' : '(Sözleşmede Kararlaştırılan Süre)'}</em></p>`
          : ''
      }
      <p style="margin: 2px 0;"><strong>Kentsel Dönüşüm Destek Modeli:</strong> ${supportText}</p>
    </div>
  </div>

  ${showDrawings ? `
  <div style="margin-top: 25px; margin-bottom: 25px; page-break-inside: avoid;">
    <h3 style="border-bottom: 2px solid #1f7a7a; padding-bottom: 4px; color: #1f7a7a; text-transform: uppercase; font-size:14px; margin-bottom: 12px;">📐 Dinamik Mimari Kütle Tasarımı & Şematik CAD Çizimleri</h3>
    <div style="display: table; width: 100%; table-layout: fixed; border-spacing: 12px;">
      <div style="display: table-cell; background: #0b1329; border: 1px solid #1e293b; border-radius: 8px; padding: 10px; text-align: center; vertical-align: top;">
        <span style="font-size: 10px; font-weight: bold; color: #38bdf8; display: block; margin-bottom: 6px; text-transform: uppercase;">A. Ön Cephe Görünümü (Elevation)</span>
        ${generateFrontViewSvgString(params.floorCount || 5, !!params.hasGroundFloorShop, (params as any).roofType || 'gable', params.baseBuildArea, compName)}
        <span style="font-size: 8.5px; color: #8892b0; display: block; margin-top: 6px; font-style: italic;">Dış ölçüler (Yükseklik/Genişlik) ve kat kotları</span>
      </div>
      <div style="display: table-cell; background: #060a13; border: 1px solid #1e293b; border-radius: 8px; padding: 10px; text-align: center; vertical-align: top;">
        <span style="font-size: 10px; font-weight: bold; color: #38bdf8; display: block; margin-bottom: 6px; text-transform: uppercase;">B. Zemin Kat Planı (Ground Floor)</span>
        ${generateGroundFloorPlanSvgString(!!params.hasGroundFloorShop, `${params.roomType || '3+1'} ODA`, physicalGrossArea_rep, physicalNetArea_rep, params.baseBuildArea)}
        <span style="font-size: 8.5px; color: #8892b0; display: block; margin-top: 6px; font-style: italic;">Bağımsız bölüm sınırları, asansör, merdiven, dış ölçüler</span>
      </div>
      <div style="display: table-cell; background: #060a13; border: 1px solid #1e293b; border-radius: 8px; padding: 10px; text-align: center; vertical-align: top;">
        <span style="font-size: 10px; font-weight: bold; color: #38bdf8; display: block; margin-bottom: 6px; text-transform: uppercase;">C. Normal Kat Planı (Normal Floor)</span>
        ${generateNormalFloorPlanSvgString(`${params.roomType || '3+1'} ODA`, physicalGrossArea_rep, physicalNetArea_rep, params.baseBuildArea)}
        <span style="font-size: 8.5px; color: #8892b0; display: block; margin-top: 6px; font-style: italic;">Normal kat dairesel ve şematik sınırları, asansör, merdiven</span>
      </div>
    </div>
  </div>` : ''}

  <h3>1. Hak Sahipleri Ödeme ve Borçlandırma Özeti</h3>
  <table>
    <thead>
      ${table1Header}
    </thead>
    <tbody>${flatRows}</tbody>
  </table>
  ${table2OrStatement}
  <div style="background:#fff8e6;border:1px solid #ffeeba;border-radius:6px;padding:12px;margin-top:20px;font-size:12px;color:#856404;line-height:1.5;">
    <strong>📌 Önemli Bilgilendirme ve Teslim Koşulları:</strong>
    <p style="margin:4px 0 0 0;">Yukarıda belirtilen proje süresine ruhsat alma ve iskân süreçleri dahildir. Firmamız kontrolü dışındaki gecikmeler proje süresine eklenir.</p>
  </div>
  <div style="display:flex;justify-content:space-between;margin-top:40px;font-size:13px;">
    <div style="text-align:center;">
      <p style="font-weight:bold;margin-bottom:40px;">MÜŞTERİ / KAT MALİKİ İMZA</p>
      <p>.... / .... / 2026</p>
    </div>
    <div style="text-align:center;">
      <p style="font-weight:bold;margin-bottom:6px;">YÜKLENİCİ İMZA / KAŞE</p>
      <p style="font-size:11px;color:#555;margin:0 0 40px 0;">${compLegal}${compAuth ? `<br>Yetkili: ${compAuth}` : ''}</p>
      <p>.... / .... / 2026</p>
    </div>
  </div>
</body>
</html>`;
}

export function generateContractHtml(
  params: ProjectParams,
  res: CalculationResult,
  companyProfile?: CompanyProfile
): string {
  const compName = companyProfile?.companyName || 'AB YAPI';
  const compLegal = companyProfile?.legalName || 'AB YAPI MÜTEAHHİTLİK LİMİTED ŞİRKETİ';
  const compAddress = companyProfile?.address || 'Fatih Kocamustafapaşa Mah. İstanbul';
  const compAuth = companyProfile?.authorizedPerson || 'Müh. Alpaslan Beyoğlu';
  const compAuthTitle = companyProfile?.authorizedTitle || 'Genel Müdür';
  const compLogo = companyProfile?.logoBase64 || '';
  const compTax = companyProfile?.taxOffice && companyProfile?.taxNumber ? `(${companyProfile.taxOffice} - V.No: ${companyProfile.taxNumber})` : '';

  const contractTitle =
    params.projectModel === 'contractorShare'
      ? 'ARSA PAYI KARŞILIĞI İNŞAAT VE GAYRİMENKUL SATIŞ VAADİ SÖZLEŞMESİ'
      : params.transformationStatus !== 'none'
      ? '6306 SAYILI KANUN KAPSAMINDA KENTSEL DÖNÜŞÜM BİNA YAPIM SÖZLEŞMESİ'
      : 'ÖZ KAYNAKLI BİNA YAPIM VE TAAHHÜT SÖZLEŞMESİ';

  const flatRows = res.flatResults
    .map(
      (f) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Daire ${f.id}</td>
      <td style="padding:8px;border:1px solid #ddd;">${f.name}</td>
      <td style="padding:8px;border:1px solid #ddd;">${f.tc}</td>
      <td style="padding:8px;border:1px solid #ddd;">${f.area} m²</td>
      <td style="padding:8px;border:1px solid #ddd;">${f.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
      <td style="padding:8px;border:1px solid #ddd;">${f.downPayment.toLocaleString('tr-TR')} TL</td>
      <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${f.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${contractTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; color: #111; max-width: 1000px; margin: 0 auto; line-height: 1.7; font-size: 13px; }
    h2 { color: #37474f; text-align: center; font-size: 18px; margin-bottom: 5px; }
    h3 { color: #1f7a7a; border-bottom: 2px solid #1f7a7a; padding-bottom: 4px; margin-top: 25px; font-size: 14px; text-transform: uppercase; }
    h4 { color: #37474f; margin-top: 15px; margin-bottom: 5px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th { background: #37474f; color: white; padding: 8px; border: 1px solid #ddd; text-align: left; }
  </style>
</head>
<body>
  <div class="print-header" style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1f7a7a;padding-bottom:12px;margin-bottom:20px;">
    <div style="display:flex;align-items:center;gap:12px;">
      ${compLogo ? `<img src="${compLogo}" alt="${compName}" style="max-height:80px;max-width:200px;object-fit:contain;" />` : ''}
      <div>
        <h2 style="margin:0;color:#37474f;text-align:left;">${contractTitle}</h2>
        <p style="margin:3px 0 0 0;font-size:11px;color:#556068;">Düzenleme Tarihi: ${new Date().toLocaleDateString('tr-TR')} | Belge No: ${compName}-2026/SÖZ-01</p>
      </div>
    </div>
  </div>
  <h3>BÖLÜM I: TARAFLAR VE PROJE TANIMI</h3>
  <h4>MADDE 1: TARAFLAR</h4>
  <p><strong>1. YÜKLENİCİ (MÜTEAHHİT):</strong> ${compLegal} (${compAddress}) ${compTax} - Yetkili Temsilci: ${compAuth} (${compAuthTitle})<br>
  <strong>2. İŞ SAHİBİ / KAT MALİKLERİ:</strong> Ek-1 Hak Sahipleri Listesinde isim ve TC kimlikleri bulunan taşınmaz malikleri.</p>
  <h4>MADDE 2: SÖZLEŞME KONUSU VE GAYRİMENKUL</h4>
  <p>Tapuda <strong>${params.projectAddress}</strong> adresinde kayıtlı taşınmazın yıkılarak yerine taban oturumu <strong>${res.baseArea} m²</strong>, toplam brüt inşaat alanı <strong>${res.totalArea} m²</strong> olan ve toplam <strong>${res.flatCount} adet bağımsız bölümden</strong> oluşan yeni binanın yapılmasıdır.</p>
  <h3>BÖLÜM II: MALİ HÜKÜMLER VE HAKEDİŞLER</h3>
  <h4>MADDE 3: PROJE İMALAT BEDELİ</h4>
  <p>Birim imalat fiyatı <strong>${res.grossCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²</strong>, toplam bedel <strong>${res.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</strong> olarak belirlenmiştir.</p>
  <h4>MADDE 4: DİNAMİK FİZİKİ İLERLEME HAKEDİŞ ORANLARI</h4>
  <ul>
    <li>1. Hakediş (%${params.stage1Pay}): Sözleşme imzası ve ruhsat projelerinin hazırlanması.</li>
    <li>2. Hakediş (%${params.stage2Pay}): Hafriyat ve radye temel / subasman seviyesi betonarme vizesi.</li>
    <li>3. Hakediş (%${params.stage3Pay}): Kaba inşaat ve tuğla duvarların tamamlanması.</li>
    <li>4. Hakediş (%${params.stage4Pay}): İnce inşaat, tesisatlar ve cephe mantolama (Varsa kentsel dönüşüm kredi/hibe aktarımı bu aşamada gerçekleşir).</li>
    <li>5. Hakediş (%${params.stage5Pay}): İskân belgesinin alınması ve anahtar teslimi.</li>
  </ul>
  <h3>BÖLÜM III: SÜRE VE İŞ GÜVENLİĞİ</h3>
  <p>Proje ve inşaat süresi <strong>${res.finalMonths} Ay</strong> olarak kararlaştırılmıştır. Mücbir sebepler ve kurum onay gecikmeleri süreye ilave edilir.</p>
  <h3>BÖLÜM IV: GARANTİ SÜRELERİ (TBK m. 478)</h3>
  <ul>
    <li>Ağır Kusur ve Gizli Ayıplar (Taşıyıcı Sistem): 20 Yıl Garanti.</li>
    <li>Açık Ayıplar ve İmalat Kusurları: 5 Yıl Garanti.</li>
    <li>Mekanik & Elektrik Donanım, Cihazlar: 2 Yıl Garanti.</li>
  </ul>
  <h3>BÖLÜM V: EK-1 HAK SAHİPLERİ VE BAĞIMSIZ BÖLÜM DAĞILIMI</h3>
  <table>
    <thead>
      <tr><th>Daire No</th><th>Hak Sahibi</th><th>T.C. No</th><th>Alan</th><th>Toplam Bedel</th><th>Peşinat</th><th>Kalan Borç</th></tr>
    </thead>
    <tbody>${flatRows}</tbody>
  </table>
  <div style="display:flex;justify-content:space-between;margin-top:50px;font-size:13px;">
    <div style="text-align:center;">
      <p style="font-weight:bold;margin-bottom:50px;">ARSA SAHİPLERİ / KAT MALİKLERİ</p>
      <p>.... / .... / 2026</p>
    </div>
    <div style="text-align:center;">
      <p style="font-weight:bold;margin-bottom:6px;">YÜKLENİCİ KAŞE / İMZA</p>
      <p style="font-size:11px;color:#555;margin:0 0 40px 0;">${compLegal}<br>${compAuth} (${compAuthTitle})</p>
      <p>.... / .... / 2026</p>
    </div>
  </div>
</body>
</html>`;
}

// CAD SVG helpers for report exports
function generateFrontViewSvgString(
  floorCount: number,
  hasShop: boolean,
  roofType: string,
  baseBuildArea: number = 120,
  compName: string = 'AB YAPI'
): string {
  const N = floorCount || 5;
  const floorHeight = 22;
  const shopHeight = 32;
  const estW = Math.sqrt(baseBuildArea / 1.2);
  
  const floors = [];
  let currentY = 190;
  
  for (let f = 0; f < N; f++) {
    const isShop = f === 0 && hasShop;
    const h = isShop ? shopHeight : floorHeight;
    floors.push({
      index: f,
      isShop,
      y: currentY - h,
      h: h
    });
    currentY -= h;
  }
  
  const topY = currentY;
  const totalHeightM = (N * 3.0 + (hasShop ? 1.5 : 0)).toFixed(2);

  const floorsMarkup = floors.map((fl) => `
    <g>
      <rect x="45" y="${fl.y}" width="130" height="${fl.h}" rx="1" />
      ${fl.isShop ? `
        <g stroke="#38bdf8" stroke-width="1" fill="#0f172a" fill-opacity="0.9">
          <rect x="52" y="${fl.y + 10}" width="34" height="19" rx="1" />
          <rect x="92" y="${fl.y + 10}" width="36" height="19" rx="1" />
          <rect x="134" y="${fl.y + 10}" width="34" height="19" rx="1" />
          <line x1="69" y1="${fl.y + 10}" x2="69" y2="${fl.y + 29}" stroke="#38bdf8" stroke-width="0.5" />
          <line x1="110" y1="${fl.y + 10}" x2="110" y2="${fl.y + 29}" stroke="#38bdf8" stroke-width="0.5" />
          <line x1="151" y1="${fl.y + 10}" x2="151" y2="${fl.y + 29}" stroke="#38bdf8" stroke-width="0.5" />
          <rect x="48" y="${fl.y + 2}" width="124" height="6" fill="#38bdf8" fill-opacity="0.25" />
          <text x="110" y="${fl.y + 7}" fill="#38bdf8" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">${compName} TİCARET / TİCARİ MAĞAZA</text>
        </g>
      ` : `
        <g stroke="#38bdf8" stroke-width="1" fill="none">
          <rect x="54" y="${fl.y + 4}" width="18" height="12" rx="1" fill="#0f172a" />
          <line x1="63" y1="${fl.y + 4}" x2="63" y2="${fl.y + 16}" stroke="#38bdf8" stroke-width="0.5" />
          <line x1="54" y1="${fl.y + 10}" x2="72" y2="${fl.y + 10}" stroke="#38bdf8" stroke-width="0.5" />
          
          <rect x="100" y="${fl.y + 4}" width="20" height="14" rx="1" fill="#0f172a" />
          <line x1="110" y1="${fl.y + 4}" x2="110" y2="${fl.y + 18}" stroke="#38bdf8" stroke-width="0.5" />
          
          <rect x="148" y="${fl.y + 4}" width="18" height="12" rx="1" fill="#0f172a" />
          <line x1="157" y1="${fl.y + 4}" x2="157" y2="${fl.y + 16}" stroke="#38bdf8" stroke-width="0.5" />
          <line x1="148" y1="${fl.y + 10}" x2="166" y2="${fl.y + 10}" stroke="#38bdf8" stroke-width="0.5" />
          
          ${fl.index >= 1 ? `<rect x="94" y="${fl.y + 11}" width="32" height="7" fill="#38bdf8" fill-opacity="0.3" rx="0.5" />` : ''}
        </g>
      `}
      <text x="20" y="${fl.y + fl.h / 2 + 2}" fill="#64748b" font-size="6" stroke="none" font-weight="semibold">${fl.isShop ? "Zemin Kat" : `${fl.index}. Kat`}</text>
    </g>
  `).join('');

  let roofMarkup = '';
  if (roofType === 'flat') {
    roofMarkup = `
      <rect x="45" y="${topY - 4}" width="130" height="4" stroke="#38bdf8" stroke-width="1.2" fill="#1e293b" />
      <line x1="60" y1="${topY - 4}" x2="60" y2="${topY}" stroke="#38bdf8" stroke-width="0.5" />
      <line x1="160" y1="${topY - 4}" x2="160" y2="${topY}" stroke="#38bdf8" stroke-width="0.5" />
    `;
  } else if (roofType === 'mansard') {
    roofMarkup = `
      <polygon points="45,${topY} 65,${topY - 18} 155,${topY - 18} 175,${topY}" fill="#1e293b" fill-opacity="0.9" stroke="#38bdf8" stroke-width="1.2" />
      <line x1="65" y1="${topY - 18}" x2="65" y2="${topY}" stroke="#38bdf8" stroke-width="0.5" stroke-dasharray="1,2" />
      <line x1="155" y1="${topY - 18}" x2="155" y2="${topY}" stroke="#38bdf8" stroke-width="0.5" stroke-dasharray="1,2" />
    `;
  } else if (roofType === 'duplex') {
    roofMarkup = `
      <polygon points="45,${topY} 65,${topY - 18} 155,${topY - 18} 175,${topY}" fill="#1e293b" fill-opacity="0.9" stroke="#38bdf8" stroke-width="1.2" />
      <rect x="98" y="${topY - 13}" width="24" height="10" rx="1" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
      <line x1="110" y1="${topY - 13}" x2="110" y2="${topY - 3}" stroke="#38bdf8" stroke-width="0.5" />
      <text x="110" y="${topY - 15}" fill="#10b981" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">ÇATI DUBLEKSİ</text>
    `;
  } else {
    // Default: gable (Kırma Çatı)
    roofMarkup = `
      <polygon points="45,${topY} 110,${topY - 24} 175,${topY}" fill="#1e293b" fill-opacity="0.9" stroke="#38bdf8" stroke-width="1.2" />
      <line x1="110" y1="${topY - 24}" x2="110" y2="${topY}" stroke="#38bdf8" stroke-width="0.5" stroke-dasharray="2,2" />
    `;
  }

  return `
    <svg viewBox="0 0 220 220" style="width:100%; max-height:220px; background:#0b1329;">
      <line x1="10" y1="190" x2="210" y2="190" stroke="#475569" stroke-width="2.5" />
      <g stroke="#38bdf8" stroke-width="1.2" fill="#1e293b" fill-opacity="0.75">
        ${floorsMarkup}
        ${roofMarkup}
      </g>
      <g stroke="#10b981" stroke-width="0.8" fill="none">
        <line x1="45" y1="205" x2="175" y2="205" />
        <line x1="45" y1="190" x2="45" y2="210" stroke="#475569" stroke-width="0.5" />
        <line x1="175" y1="190" x2="175" y2="210" stroke="#475569" stroke-width="0.5" />
        <line x1="42" y1="208" x2="48" y2="202" />
        <line x1="172" y1="208" x2="178" y2="202" />
        <text x="110" y="215" fill="#10b981" font-size="6.5" text-anchor="middle" stroke="none" font-weight="bold" font-family="monospace">GENİŞLİK: \${estW.toFixed(2)} m</text>

        <line x1="195" y1="${topY}" x2="195" y2="190" />
        <line x1="175" y1="${topY}" x2="200" y2="${topY}" stroke="#475569" stroke-width="0.5" />
        <line x1="175" y1="190" x2="200" y2="190" stroke="#475569" stroke-width="0.5" />
        <line x1="192" y1="${topY + 3}" x2="198" y2="${topY - 3}" />
        <line x1="192" y1="193" x2="198" y2="187" />
        <text x="204" y="${(topY + 190) / 2}" fill="#10b981" font-size="6" text-anchor="middle" stroke="none" font-weight="bold" font-family="monospace" transform="rotate(90, 204, ${(topY + 190) / 2})">YÜKSEKLİK: ${totalHeightM} m</text>
      </g>
      <text x="110" y="12" fill="#38bdf8" font-size="8" text-anchor="middle" stroke="none" font-weight="bold" letter-spacing="1">ÖN CEPHE GÖRÜNÜMÜ</text>
    </svg>
  `;
}

function generateGroundFloorPlanSvgString(hasShop: boolean, roomType = '3+1 ODA', grossArea = 120, netArea = 96, baseBuildArea = 120): string {
  const estW = Math.sqrt(baseBuildArea / 1.2);
  const estD = estW * 1.2;
  const shopGross = Math.round(((baseBuildArea * 0.85) / 2) * 10) / 10;
  const shopNet = Math.round((shopGross * 0.8) * 10) / 10;

  return `
    <svg viewBox="0 0 220 220" style="width:100%; max-height:220px; background:#060a13;">
      <rect x="45" y="45" width="130" height="130" fill="none" stroke="#38bdf8" stroke-width="1.5" />
      <rect x="42" y="42" width="136" height="136" fill="none" stroke="#38bdf8" stroke-width="0.5" stroke-dasharray="1,2" />

      <g stroke="#f43f5e" stroke-width="1" fill="none">
        <rect x="98" y="70" width="24" height="24" stroke-width="1.2" />
        <line x1="98" y1="70" x2="122" y2="94" stroke-width="0.6" />
        <line x1="122" y1="70" x2="98" y2="94" stroke-width="0.6" />
        <text x="110" y="84" fill="#f43f5e" font-size="5" text-anchor="middle" stroke="none" font-weight="bold">ASANSÖR</text>
      </g>

      <g stroke="#38bdf8" stroke-width="1" fill="none">
        <rect x="98" y="94" width="24" height="36" stroke-width="1.2" />
        <line x1="110" y1="94" x2="110" y2="130" stroke-width="0.8" />
        <line x1="98" y1="100" x2="110" y2="100" />
        <line x1="98" y1="106" x2="110" y2="106" />
        <line x1="98" y1="112" x2="110" y2="112" />
        <line x1="98" y1="118" x2="110" y2="118" />
        <line x1="98" y1="124" x2="110" y2="124" />
        <line x1="110" y1="100" x2="122" y2="100" />
        <line x1="110" y1="106" x2="122" y2="106" />
        <line x1="110" y1="112" x2="122" y2="112" />
        <line x1="110" y1="118" x2="122" y2="118" />
        <line x1="110" y1="124" x2="122" y2="124" />
        <path d="M 104,126 L 104,98 L 116,98 L 116,115" stroke="#10b981" stroke-width="0.8" fill="none" />
        <polygon points="114,113 116,117 118,113" fill="#10b981" stroke="none" />
        <text x="110" y="136" fill="#38bdf8" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">MERDİVEN</text>
      </g>

      ${hasShop ? `
        <g stroke="#34d399" stroke-width="1.2" fill="none">
          <line x1="98" y1="45" x2="98" y2="175" stroke-dasharray="3,3" />
          <text x="71" y="105" fill="#34d399" font-size="6" text-anchor="middle" stroke="none" font-weight="bold">DÜKKAN 01</text>
          <text x="71" y="115" fill="#64748b" font-size="4.5" text-anchor="middle" stroke="none">BRÜT: ~\${shopGross} m²</text>
          <text x="71" y="122" fill="#64748b" font-size="4" text-anchor="middle" stroke="none">NET: ~\${shopNet} m²</text>

          <line x1="122" y1="45" x2="122" y2="175" stroke-dasharray="3,3" />
          <text x="148" y="105" fill="#34d399" font-size="6" text-anchor="middle" stroke="none" font-weight="bold">DÜKKAN 02</text>
          <text x="148" y="115" fill="#64748b" font-size="4.5" text-anchor="middle" stroke="none">BRÜT: ~\${shopGross} m²</text>
          <text x="148" y="122" fill="#64748b" font-size="4" text-anchor="middle" stroke="none">NET: ~\${shopNet} m²</text>
          <text x="110" y="58" fill="#10b981" font-size="5" text-anchor="middle" stroke="none" font-weight="bold">ORTAK HOL</text>
        </g>
      ` : `
        <g stroke="#a78bfa" stroke-width="1.2" fill="none">
          <line x1="98" y1="45" x2="98" y2="175" stroke-dasharray="3,3" />
          <text x="71" y="105" fill="#a78bfa" font-size="6" text-anchor="middle" stroke="none" font-weight="bold">DAİRE 01</text>
          <text x="71" y="115" fill="#64748b" font-size="4.5" text-anchor="middle" stroke="none">BRÜT: ~${grossArea} m²</text>
          <text x="71" y="122" fill="#64748b" font-size="4" text-anchor="middle" stroke="none">NET: ~${netArea} m²</text>
          <text x="71" y="130" fill="#a78bfa" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">${roomType}</text>

          <line x1="122" y1="45" x2="122" y2="175" stroke-dasharray="3,3" />
          <text x="148" y="105" fill="#a78bfa" font-size="6" text-anchor="middle" stroke="none" font-weight="bold">DAİRE 02</text>
          <text x="148" y="115" fill="#64748b" font-size="4.5" text-anchor="middle" stroke="none">BRÜT: ~${grossArea} m²</text>
          <text x="148" y="122" fill="#64748b" font-size="4" text-anchor="middle" stroke="none">NET: ~${netArea} m²</text>
          <text x="148" y="130" fill="#a78bfa" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">${roomType}</text>
          <text x="110" y="58" fill="#10b981" font-size="5" text-anchor="middle" stroke="none" font-weight="bold">ORTAK HOL</text>
        </g>
      `}

      <g stroke="#e2e8f0" stroke-width="0.6" fill="none" opacity="0.8">
        <line x1="45" y1="23" x2="175" y2="23" stroke="#10b981" stroke-width="0.8" />
        <line x1="45" y1="45" x2="45" y2="18" stroke="#475569" stroke-width="0.5" />
        <line x1="175" y1="45" x2="175" y2="18" stroke="#475569" stroke-width="0.5" />
        <line x1="42" y1="26" x2="48" y2="20" stroke="#10b981" stroke-width="0.8" />
        <line x1="172" y1="26" x2="178" y2="20" stroke="#10b981" stroke-width="0.8" />
        <text x="110" y="16" fill="#10b981" font-size="6" text-anchor="middle" stroke="none" font-weight="bold" font-family="monospace">\${estW.toFixed(2)} m</text>

        <line x1="20" y1="45" x2="20" y2="175" stroke="#10b981" stroke-width="0.8" />
        <line x1="45" y1="45" x2="15" y2="45" stroke="#475569" stroke-width="0.5" />
        <line x1="45" y1="175" x2="15" y2="175" stroke="#475569" stroke-width="0.5" />
        <line x1="17" y1="48" x2="23" y2="42" stroke="#10b981" stroke-width="0.8" />
        <line x1="17" y1="178" x2="23" y2="172" stroke="#10b981" stroke-width="0.8" />
        <text x="12" y="113" fill="#10b981" font-size="6" text-anchor="middle" stroke="none" font-weight="bold" font-family="monospace" transform="rotate(-90, 12, 113)">\${estD.toFixed(2)} m</text>
      </g>
      <text x="110" y="202" fill="#38bdf8" font-size="8" text-anchor="middle" stroke="none" font-weight="bold" letter-spacing="1">ZEMİN KAT PLANI</text>
    </svg>
  `;
}

function generateNormalFloorPlanSvgString(roomType = '3+1 ODA', grossArea = 120, netArea = 96, baseBuildArea = 120): string {
  const estW = Math.sqrt(baseBuildArea / 1.2);
  const estD = estW * 1.2;

  return `
    <svg viewBox="0 0 220 220" style="width:100%; max-height:220px; background:#060a13;">
      <rect x="45" y="45" width="130" height="130" fill="none" stroke="#38bdf8" stroke-width="1.5" />
      <rect x="42" y="42" width="136" height="136" fill="none" stroke="#38bdf8" stroke-width="0.5" stroke-dasharray="1,2" />

      <g stroke="#f43f5e" stroke-width="1" fill="none">
        <rect x="98" y="70" width="24" height="24" stroke-width="1.2" />
        <line x1="98" y1="70" x2="122" y2="94" stroke-width="0.6" />
        <line x1="122" y1="70" x2="98" y2="94" stroke-width="0.6" />
        <text x="110" y="84" fill="#f43f5e" font-size="5" text-anchor="middle" stroke="none" font-weight="bold">ASANSÖR</text>
      </g>

      <g stroke="#38bdf8" stroke-width="1" fill="none">
        <rect x="98" y="94" width="24" height="36" stroke-width="1.2" />
        <line x1="110" y1="94" x2="110" y2="130" stroke-width="0.8" />
        <line x1="98" y1="100" x2="110" y2="100" />
        <line x1="98" y1="106" x2="110" y2="106" />
        <line x1="98" y1="112" x2="110" y2="112" />
        <line x1="98" y1="118" x2="110" y2="118" />
        <line x1="98" y1="124" x2="110" y2="124" />
        <line x1="110" y1="100" x2="122" y2="100" />
        <line x1="110" y1="106" x2="122" y2="106" />
        <line x1="110" y1="112" x2="122" y2="112" />
        <line x1="110" y1="118" x2="122" y2="118" />
        <line x1="110" y1="124" x2="122" y2="124" />
        <path d="M 104,126 L 104,98 L 116,98 L 116,115" stroke="#10b981" stroke-width="0.8" fill="none" />
        <polygon points="114,113 116,117 118,113" fill="#10b981" stroke="none" />
        <text x="110" y="136" fill="#38bdf8" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">MERDİVEN</text>
      </g>

      <g stroke="#a78bfa" stroke-width="1.2" fill="none">
        <line x1="98" y1="45" x2="98" y2="175" stroke-dasharray="3,3" />
        <text x="71" y="105" fill="#a78bfa" font-size="6" text-anchor="middle" stroke="none" font-weight="bold">DAİRE A (SOL)</text>
        <text x="71" y="115" fill="#64748b" font-size="4.5" text-anchor="middle" stroke="none">BRÜT: ~${grossArea} m²</text>
        <text x="71" y="122" fill="#64748b" font-size="4" text-anchor="middle" stroke="none">NET: ~${netArea} m²</text>
        <text x="71" y="130" fill="#a78bfa" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">${roomType}</text>

        <line x1="122" y1="45" x2="122" y2="175" stroke-dasharray="3,3" />
        <text x="148" y="105" fill="#a78bfa" font-size="6" text-anchor="middle" stroke="none" font-weight="bold">DAİRE B (SAĞ)</text>
        <text x="148" y="115" fill="#64748b" font-size="4.5" text-anchor="middle" stroke="none">BRÜT: ~${grossArea} m²</text>
        <text x="148" y="122" fill="#64748b" font-size="4" text-anchor="middle" stroke="none">NET: ~${netArea} m²</text>
        <text x="148" y="130" fill="#a78bfa" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">${roomType}</text>
        <text x="110" y="58" fill="#10b981" font-size="5" text-anchor="middle" stroke="none" font-weight="bold">KAT HOLÜ</text>
      </g>

      <g stroke="#e2e8f0" stroke-width="0.6" fill="none" opacity="0.8">
        <line x1="45" y1="23" x2="175" y2="23" stroke="#10b981" stroke-width="0.8" />
        <line x1="45" y1="45" x2="45" y2="18" stroke="#475569" stroke-width="0.5" />
        <line x1="175" y1="45" x2="175" y2="18" stroke="#475569" stroke-width="0.5" />
        <line x1="42" y1="26" x2="48" y2="20" stroke="#10b981" stroke-width="0.8" />
        <line x1="172" y1="26" x2="178" y2="20" stroke="#10b981" stroke-width="0.8" />
        <text x="110" y="16" fill="#10b981" font-size="6" text-anchor="middle" stroke="none" font-weight="bold" font-family="monospace">\${estW.toFixed(2)} m</text>

        <line x1="20" y1="45" x2="20" y2="175" stroke="#10b981" stroke-width="0.8" />
        <line x1="45" y1="45" x2="15" y2="45" stroke="#475569" stroke-width="0.5" />
        <line x1="45" y1="175" x2="15" y2="175" stroke="#475569" stroke-width="0.5" />
        <line x1="17" y1="48" x2="23" y2="42" stroke="#10b981" stroke-width="0.8" />
        <line x1="17" y1="178" x2="23" y2="172" stroke="#10b981" stroke-width="0.8" />
        <text x="12" y="113" fill="#10b981" font-size="6" text-anchor="middle" stroke="none" font-weight="bold" font-family="monospace" transform="rotate(-90, 12, 113)">\${estD.toFixed(2)} m</text>
      </g>
      <text x="110" y="202" fill="#38bdf8" font-size="8" text-anchor="middle" stroke="none" font-weight="bold" letter-spacing="1">NORMAL KAT PLANI</text>
    </svg>
  `;
}
