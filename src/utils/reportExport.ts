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
        const floorNo = f.floorNumber !== undefined ? f.floorNumber : Math.min(totalFloors, Math.ceil(f.id / flatsPerFloor));
        const floorText = floorNo === 0 ? 'Zemin Kat' : `${floorNo}. Kat`;
        const facadeText = f.facade ? (f.facade.charAt(0).toUpperCase() + f.facade.slice(1)) : 'Güney';
        const roomCountText = params.roomType ? `${params.roomType} Oda` : (f.area < 65 ? '1+1 Oda' : f.area < 95 ? '2+1 Oda' : f.area < 135 ? '3+1 Oda' : '4+1 Oda');
        const netArea = physicalNetArea_rep;
        const flatBadge = f.flatType === 'mansard'
          ? `<span style="background:#e0e7ff;color:#3730a3;padding:2px 5px;border-radius:4px;font-size:8px;font-weight:bold;display:inline-block;margin-top:2px;">Mansart Çatı (Ayrı B.B.)</span>`
          : f.flatType === 'duplex'
          ? `<span style="background:#d1fae5;color:#065f46;padding:2px 5px;border-radius:4px;font-size:8px;font-weight:bold;display:inline-block;margin-top:2px;">Çatı Dubleksi (Tek B.B.)</span>`
          : '';

        const serefiyeText = f.serefiyeMultiplier && f.serefiyeMultiplier !== 1.0
          ? `<span style="color:#b45309;font-weight:bold;font-size:10px;">x${f.serefiyeMultiplier.toFixed(2)} (${Math.round((f.serefiyeMultiplier - 1) * 100) > 0 ? '+' : ''}${Math.round((f.serefiyeMultiplier - 1) * 100)}%)</span>`
          : `<span style="color:#64748b;font-size:10px;">1.00 (%0)</span>`;

        const landShareDiff = f.landShareDifference || 0;
        const landShareText = landShareDiff !== 0
          ? `<span style="font-weight:bold;font-size:10px;color:${landShareDiff > 0 ? '#b45309' : '#047857'};">${landShareDiff > 0 ? '+' : ''}${landShareDiff.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</span>`
          : `<span style="color:#64748b;font-size:10px;">Dengeli</span>`;

        if (isContractorShareModel) {
          const fundingType = f.isContractorShare ? 'Müteahhit Payı Satış' : 'Arsa Payı Mahsubu';
          return `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">
              Daire ${f.id} ${flatBadge ? `<br>${flatBadge}` : ''}<br>
              <small style="color:#4f46e5;font-weight:normal;">${floorText} / ${facadeText}</small>
            </td>
            <td style="padding:8px;border:1px solid #ddd;">${f.name} <br><small style="color:#666;">TC: ${f.tc}</small></td>
            <td style="padding:8px;border:1px solid #ddd;">
              <strong>${roomCountText}</strong><br>
              <small style="color:#555;">Fiziki Brüt: ${physicalGrossArea_rep} m² <span style="font-size:8px;color:#888;">(Pay: ${f.area} m²)</span><br>Net: ${netArea} m²</small>
            </td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;">${serefiyeText}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${landShareText}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;font-mono;">${f.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
            <td style="padding:8px;border:1px solid #ddd;color:#047857;font-weight:bold;text-align:right;">-${f.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL<br><small style="color:#666;">${fundingType}</small></td>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold;color:#047857;background-color:#f0fdf4;text-align:right;">0 TL</td>
          </tr>`;
        } else {
          return `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">
              Daire ${f.id} ${flatBadge ? `<br>${flatBadge}` : ''}<br>
              <small style="color:#4f46e5;font-weight:normal;">${floorText} / ${facadeText}</small>
            </td>
            <td style="padding:8px;border:1px solid #ddd;">${f.name} <br><small style="color:#666;">TC: ${f.tc}</small></td>
            <td style="padding:8px;border:1px solid #ddd;">
              <strong>${roomCountText}</strong><br>
              <small style="color:#555;">Fiziki Brüt: ${physicalGrossArea_rep} m² <span style="font-size:8px;color:#888;">(Pay: ${f.area} m²)</span><br>Net: ${netArea} m²</small>
            </td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;">${serefiyeText}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${landShareText}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;font-mono;">${f.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#4f46e5;">-${f.downPayment.toLocaleString('tr-TR')} TL</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#047857;">-${f.usedCredit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold;text-align:right;background-color:#faf5ff;">${f.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          </tr>`;
        }
      }
    )
    .join('');

  const table1Header = isContractorShareModel
    ? `<tr><th>Daire & Kat No</th><th>Hak Sahibi & TC</th><th>Özellikler (Oda / Alan)</th><th style="text-align:center;">Şerefiye</th><th style="text-align:right;">Arsa Mahsubu</th><th style="text-align:right;">İmalat Bedeli</th><th style="text-align:right;">Kat Karşılığı İndirimi</th><th style="color:#1e3a8a;text-align:right;">Net Malik Borcu</th></tr>`
    : `<tr><th>Daire & Kat No</th><th>Hak Sahibi & TC</th><th>Özellikler (Oda / Alan)</th><th style="text-align:center;">Şerefiye</th><th style="text-align:right;">Arsa Mahsubu</th><th style="text-align:right;">Daire Bedeli</th><th style="text-align:right;">Peşinat</th><th style="text-align:right;">Dönüşüm Desteği</th><th style="color:#1e3a8a;text-align:right;">Kalan Borç</th></tr>`;

  let table2OrStatement = '';
  if (isContractorShareModel) {
    table2OrStatement = `
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:16px;margin-bottom:20px;font-size:13px;color:#065f46;line-height:1.6;">
      <strong>🤝 Kat Karşılığı Finansman Beyanı:</strong>
      <p style="margin:4px 0 0 0;">Kat Karşılığı Yapım Modelinde, tüm imalat ve yapım maliyetleri müteahhite devredilen paylar ile finanse edildiğinden, arsa maliklerinin herhangi bir nakit borçlanması veya inşaat fiziki ilerlemesine bağlı hakediş takvimi bulunmamaktadır.</p>
    </div>`;
  } else if (params.paymentPlanType === 'installments') {
    table2OrStatement = `
    <h3>2. Aylık Eşit Taksitli Ödeme Takvimi (${params.installmentCount || 12} Ay Vadeli)</h3>
    <table>
      <thead>
        <tr>
          <th>Daire No / Hak Sahibi</th>
          <th style="text-align:right;">Daire Payı Bedeli</th>
          <th style="text-align:right;">Ödenen Peşinat</th>
          <th style="text-align:right;">Dönüşüm Desteği</th>
          <th style="text-align:right;">Kalan Net Borç</th>
          <th style="text-align:center;">Vade</th>
          <th style="text-align:right;background:#ecfdf5;color:#065f46;">Aylık Taksit Tutarı</th>
        </tr>
      </thead>
      <tbody>
        ${res.flatResults.map(f => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Daire ${f.id} (${f.name})</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${f.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#4f46e5;">-${f.downPayment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#047857;">${f.usedCredit > 0 ? `-${f.usedCredit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL` : '-'}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;">${f.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${f.netRemainingDebt > 0 ? `${params.installmentCount || 12} Ay` : '-'}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;color:#065f46;background:#f0fdf4;">${f.netRemainingDebt > 0 ? `${f.monthlyInstallment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL / Ay` : '0 TL'}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr style="background:#f8fafc;font-weight:bold;border-top:2px solid #cbd5e1;">
          <td colspan="4" style="padding:10px;border:1px solid #ddd;">PROJE TOPLAM AYLIK ŞANTİYE KASA GİRİŞİ:</td>
          <td style="padding:10px;border:1px solid #ddd;text-align:right;">${res.flatResults.reduce((s, f) => s + f.netRemainingDebt, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          <td style="padding:10px;border:1px solid #ddd;text-align:center;">${params.installmentCount || 12} Ay</td>
          <td style="padding:10px;border:1px solid #ddd;text-align:right;color:#065f46;background:#d1fae5;font-size:14px;">${(res.totalMonthlyInstallments || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL / Ay</td>
        </tr>
      </tfoot>
    </table>`;
  } else if (params.paymentPlanType === 'hybrid') {
    table2OrStatement = `
    <h3>2. Karma Ödeme Takvimi (Peşinat + Ara Ödemeler + ${params.installmentCount || 12} Ay Taksit)</h3>
    <table>
      <thead>
        <tr>
          <th>Daire No / Hak Sahibi</th>
          <th style="text-align:right;">Kalan Net Borç</th>
          <th style="text-align:right;color:#4338ca;">1. Ara Ödeme (%25 Kaba)</th>
          <th style="text-align:right;color:#7e22ce;">2. Ara Ödeme (%15 İskân)</th>
          <th style="text-align:right;">Taksitlendirilen (%60)</th>
          <th style="text-align:right;background:#ecfdf5;color:#065f46;">Aylık Taksit (${params.installmentCount || 12} Ay)</th>
        </tr>
      </thead>
      <tbody>
        ${res.flatResults.map(f => {
          const interim1 = Math.round(f.netRemainingDebt * 0.25);
          const interim2 = Math.round(f.netRemainingDebt * 0.15);
          const rem = Math.max(0, f.netRemainingDebt - interim1 - interim2);
          const monthly = Math.round(rem / Math.max(1, params.installmentCount || 12));
          return `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Daire ${f.id} (${f.name})</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;">${f.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#4338ca;">${interim1.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#7e22ce;">${interim2.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${rem.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;color:#065f46;background:#f0fdf4;">${f.netRemainingDebt > 0 ? `${monthly.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL / Ay` : '0 TL'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  } else {
    table2OrStatement = `
    <h3>2. Fiziki İlerleme Hakediş Takvimi (5 Aşamalı TL)</h3>
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
    <h4>📍 PROJE KÜNYESİ & GENEL BİLGİLER</h4>
    <p><strong>Proje Adresi:</strong> ${params.projectAddress}</p>
    <div style="display:grid;grid-template-columns: 1fr 1fr;gap: 8px;margin-top:10px;border-top:1px solid #ddd;padding-top:10px;">
      <div><strong>Proje Arsa Alanı:</strong> ${(params.landArea || Math.round(params.baseBuildArea / 0.4)).toLocaleString('tr-TR')} m²</div>
      <div><strong>Proje Kat Alanı (Oturum):</strong> ${res.baseArea.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m²</div>
      <div><strong>Toplam İnşaat Alanı:</strong> ${res.totalArea.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m²</div>
      <div><strong>Normal Kat Sayısı:</strong> ${params.floorCount} Kat</div>
      <div><strong>Kattaki Daire Sayısı:</strong> ${params.flatsPerFloor || 2} Adet</div>
      <div><strong>Toplam Daire Sayısı:</strong> ${res.flatCount} Adet</div>
      <div><strong>Daire İç Yerleşimi:</strong> ${params.roomType || '3+1'} Oda</div>
      <div><strong>Fiziki Daire Brüt Alanı:</strong> ${physicalGrossArea_rep} m²</div>
      <div><strong>Daire Net Alanı (~%80):</strong> ${physicalNetArea_rep} m²</div>
      <div><strong>Birim m² Maliyet Bedeli:</strong> <strong style="color:#1f7a7a;">${res.grossCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²</strong></div>
      <div><strong>Dolar Kuru Karşılığı:</strong> ${res.grossUsdPerSqM.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD/m²</div>
      <div><strong>Tahmini Teslim Süresi:</strong> ${res.finalMonths} Ay</div>
    </div>
    <div style="margin-top:10px;border-top:1px solid #ddd;padding-top:10px;">
      <p style="margin: 2px 0;"><strong>Kentsel Dönüşüm Destek Modeli:</strong> ${supportText}</p>
    </div>
  </div>

  ${showDrawings ? `
  <div style="margin-top: 25px; margin-bottom: 25px; page-break-inside: avoid;">
    <h3 style="border-bottom: 2px solid #1f7a7a; padding-bottom: 4px; color: #1f7a7a; text-transform: uppercase; font-size:14px; margin-bottom: 12px;">📐 Dinamik Mimari 3D Bina Görünümleri (Ön Tanımlı Cephe Yönleri)</h3>
    <div style="display: table; width: 100%; table-layout: fixed; border-spacing: 12px;">
      <div style="display: table-cell; background: #0b1329; border: 1px solid #1e293b; border-radius: 8px; padding: 10px; text-align: center; vertical-align: top;">
        <span style="font-size: 10px; font-weight: bold; color: #38bdf8; display: block; margin-bottom: 2px; text-transform: uppercase;">A. Ön Cephe (Güney)</span>
        <span style="font-size: 8.5px; color: #94a3b8; display: block; margin-bottom: 6px; font-weight: 600;">🧭 180° G (Front Elevation)</span>
        ${generateFrontViewSvgString(params.floorCount || 5, !!params.hasGroundFloorShop, params.roofType || 'gable', params.baseBuildArea, compName)}
        <span style="font-size: 8.5px; color: #8892b0; display: block; margin-top: 6px; font-style: italic;">Dış ölçüler (Yükseklik/Genişlik) ve kat seviyeleri</span>
      </div>
      <div style="display: table-cell; background: #060a13; border: 1px solid #1e293b; border-radius: 8px; padding: 10px; text-align: center; vertical-align: top;">
        <span style="font-size: 10px; font-weight: bold; color: #38bdf8; display: block; margin-bottom: 2px; text-transform: uppercase;">B. Kuşbakışı Kat Planı</span>
        <span style="font-size: 8.5px; color: #94a3b8; display: block; margin-bottom: 6px; font-weight: 600;">🧭 Üstten / Kuzey Açılı (Top Plan)</span>
        ${generateGroundFloorPlanSvgString(!!params.hasGroundFloorShop, `${params.roomType || '3+1'} ODA`, physicalGrossArea_rep, physicalNetArea_rep, params.baseBuildArea)}
        <span style="font-size: 8.5px; color: #8892b0; display: block; margin-top: 6px; font-style: italic;">Daire ve bağımsız bölüm sınırları, asansör ve merdiven kurgusu</span>
      </div>
      <div style="display: table-cell; background: #060a13; border: 1px solid #1e293b; border-radius: 8px; padding: 10px; text-align: center; vertical-align: top;">
        <span style="font-size: 10px; font-weight: bold; color: #38bdf8; display: block; margin-bottom: 2px; text-transform: uppercase;">C. 3D İzometrik Model</span>
        <span style="font-size: 8.5px; color: #94a3b8; display: block; margin-bottom: 6px; font-weight: 600;">🧭 Güneydoğu Aksonometrik (3D ISO)</span>
        ${generateNormalFloorPlanSvgString(`${params.roomType || '3+1'} ODA`, physicalGrossArea_rep, physicalNetArea_rep, params.baseBuildArea)}
        <span style="font-size: 8.5px; color: #8892b0; display: block; margin-top: 6px; font-style: italic;">Yapının tamamını şeffaf katmanlarla gösteren 3D perspektif</span>
      </div>
    </div>
    <p style="text-align:center; font-size:9px; color:#777; margin-top:8px; font-style:italic;">* Yukarıdaki görünümler, PDF çıktısında canlı 3D model olarak, statik raporlarda şematik CAD çizimi olarak sunulmaktadır.</p>
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
  ${params.paymentPlanType === 'installments' ? `
  <h4>MADDE 4: AYLIK EŞİT TAKSİTLİ ÖDEME PLANI VE VADE ESASLARI</h4>
  <p>Maliklerin peşinat ve kentsel dönüşüm destekleri düşüldükten sonra kalan net borç tutarları toplam <strong>${params.installmentCount || 12} eşit aylık taksite</strong> bölünmüştür. Taksitler her ayın ilk 5 iş günü içerisinde yüklenici firma banka hesabına ödenecektir.</p>
  ` : params.paymentPlanType === 'hybrid' ? `
  <h4>MADDE 4: KARMA (HİBRİT) ÖDEME PLANI VE HAKEDİŞ ESASLARI</h4>
  <ul>
    <li>1. Peşinat: Sözleşme imzasında kararlaştırılan tutar.</li>
    <li>2. Kaba İnşaat Ara Ödemesi (%25): Kaba inşaat ve tuğla duvarların tamamlanmasında.</li>
    <li>3. İskân Ara Ödemesi (%15): İskân ve anahtar teslim aşamasında.</li>
    <li>4. Aylık Taksitler (%60): Kalan bakiye ${params.installmentCount || 12} eşit aylık taksite bölünerek tahsil edilir.</li>
  </ul>
  ` : `
  <h4>MADDE 4: DİNAMİK FİZİKİ İLERLEME HAKEDİŞ ORANLARI</h4>
  <ul>
    <li>1. Hakediş (%${params.stage1Pay}): Sözleşme imzası ve ruhsat projelerinin hazırlanması.</li>
    <li>2. Hakediş (%${params.stage2Pay}): Hafriyat ve radye temel / subasman seviyesi betonarme vizesi.</li>
    <li>3. Hakediş (%${params.stage3Pay}): Kaba inşaat ve tuğla duvarların tamamlanması.</li>
    <li>4. Hakediş (%${params.stage4Pay}): İnce inşaat, tesisatlar ve cephe mantolama (Varsa kentsel dönüşüm kredi/hibe aktarımı bu aşamada gerçekleşir).</li>
    <li>5. Hakediş (%${params.stage5Pay}): İskân belgesinin alınması ve anahtar teslimi.</li>
  </ul>
  `}
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
  const N = Math.max(1, floorCount || 5);
  const floorHeightM = 2.95;
  const shopHeightM = 3.50;
  const estW = Math.max(8, Math.round(Math.sqrt(baseBuildArea / 1.2) * 10) / 10);
  const estD = Math.max(10, Math.round((estW * 1.2) * 10) / 10);
  const totalBuildingHeightM = Math.round(((hasShop ? shopHeightM : floorHeightM) + (N - 1) * floorHeightM + (roofType === 'duplex' || roofType === 'mansard' ? 2.80 : 1.50)) * 10) / 10;

  const groundY = 220;
  const availableH = 160;
  const scale = availableH / Math.max(12, totalBuildingHeightM);
  const bldgWidthPx = 140;
  const bldgLeftX = 75;
  const bldgRightX = bldgLeftX + bldgWidthPx;

  let currentElevation = 0;
  let currentY = groundY;
  const floorsList = [];

  for (let i = 0; i < N; i++) {
    const isShop = i === 0 && hasShop;
    const hM = isShop ? shopHeightM : floorHeightM;
    const hPx = hM * scale;
    const floorTopY = currentY - hPx;
    const elevationTop = currentElevation + hM;
    
    floorsList.push({
      index: i,
      name: isShop ? 'Zemin (Dükkan)' : `${i}. Kat`,
      isShop,
      bottomY: currentY,
      topY: floorTopY,
      hPx,
      elevation: elevationTop,
    });

    currentY = floorTopY;
    currentElevation = elevationTop;
  }

  const topRoofY = currentY;

  // Axis bubbles
  const axisA = bldgLeftX + 15;
  const axisB = bldgLeftX + bldgWidthPx * 0.5;
  const axisC = bldgRightX - 15;

  let roofSvg = '';
  if (roofType === 'flat') {
    roofSvg = `
      <rect x="${bldgLeftX - 4}" y="${topRoofY - 6}" width="${bldgWidthPx + 8}" height="6" fill="#1e293b" stroke="#38bdf8" stroke-width="1.2" />
      <line x1="${bldgLeftX - 4}" y1="${topRoofY - 2}" x2="${bldgRightX + 4}" y2="${topRoofY - 2}" stroke="#0284c7" stroke-width="0.6" />
      <text x="${bldgLeftX + bldgWidthPx / 2}" y="${topRoofY - 9}" fill="#38bdf8" font-size="5" text-anchor="middle" font-weight="bold">PARAPET / TERAS ÇATI (+${currentElevation.toFixed(2)}m)</text>
    `;
  } else if (roofType === 'mansard') {
    const mHeightPx = 2.4 * scale;
    roofSvg = `
      <polygon points="${bldgLeftX - 2},${topRoofY} ${bldgLeftX + 18},${topRoofY - mHeightPx} ${bldgRightX - 18},${topRoofY - mHeightPx} ${bldgRightX + 2},${topRoofY}" fill="#1e293b" stroke="#38bdf8" stroke-width="1.2" />
      <polygon points="${bldgLeftX + 18},${topRoofY - mHeightPx} ${bldgLeftX + bldgWidthPx / 2},${topRoofY - mHeightPx - 8} ${bldgRightX - 18},${topRoofY - mHeightPx}" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
      <!-- Mansard Dormer Windows -->
      <rect x="${bldgLeftX + 35}" y="${topRoofY - mHeightPx + 4}" width="16" height="12" fill="#0284c7" stroke="#38bdf8" stroke-width="0.8" rx="1" />
      <rect x="${bldgRightX - 51}" y="${topRoofY - mHeightPx + 4}" width="16" height="12" fill="#0284c7" stroke="#38bdf8" stroke-width="0.8" rx="1" />
      <text x="${bldgLeftX + bldgWidthPx / 2}" y="${topRoofY - mHeightPx - 11}" fill="#38bdf8" font-size="5" text-anchor="middle" font-weight="bold">MANSART ÇATI (+${(currentElevation + 2.4).toFixed(2)}m)</text>
    `;
  } else if (roofType === 'duplex') {
    const dHeightPx = 2.6 * scale;
    roofSvg = `
      <polygon points="${bldgLeftX - 2},${topRoofY} ${bldgLeftX + 22},${topRoofY - dHeightPx} ${bldgRightX - 22},${topRoofY - dHeightPx} ${bldgRightX + 2},${topRoofY}" fill="#1e293b" stroke="#38bdf8" stroke-width="1.2" />
      <rect x="${bldgLeftX + bldgWidthPx / 2 - 18}" y="${topRoofY - dHeightPx + 5}" width="36" height="14" fill="#0f172a" stroke="#10b981" stroke-width="1" rx="1" />
      <line x1="${bldgLeftX + bldgWidthPx / 2}" y1="${topRoofY - dHeightPx + 5}" x2="${bldgLeftX + bldgWidthPx / 2}" y2="${topRoofY - dHeightPx + 19}" stroke="#10b981" stroke-width="0.6" />
      <text x="${bldgLeftX + bldgWidthPx / 2}" y="${topRoofY - dHeightPx - 4}" fill="#10b981" font-size="5" text-anchor="middle" font-weight="bold">ÇATI DUBLEKSİ TERASI (+${(currentElevation + 2.6).toFixed(2)}m)</text>
    `;
  } else {
    // Gable (Kırma Çatı)
    const gHeightPx = 2.0 * scale;
    roofSvg = `
      <polygon points="${bldgLeftX - 4},${topRoofY} ${bldgLeftX + bldgWidthPx / 2},${topRoofY - gHeightPx} ${bldgRightX + 4},${topRoofY}" fill="#1e293b" stroke="#38bdf8" stroke-width="1.2" />
      <line x1="${bldgLeftX + bldgWidthPx / 2}" y1="${topRoofY - gHeightPx}" x2="${bldgLeftX + bldgWidthPx / 2}" y2="${topRoofY}" stroke="#38bdf8" stroke-width="0.6" stroke-dasharray="2,2" />
      <text x="${bldgLeftX + bldgWidthPx / 2}" y="${topRoofY - gHeightPx - 4}" fill="#38bdf8" font-size="5" text-anchor="middle" font-weight="bold">KIRMA ÇATI MAHYASI (+${(currentElevation + 2.0).toFixed(2)}m)</text>
    `;
  }

  return `
    <svg viewBox="0 0 300 270" style="width:100%; max-height:260px; background:#080e1a; font-family:monospace;">
      <!-- Grid Lines Background -->
      <defs>
        <pattern id="cadGrid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" stroke-width="0.3" opacity="0.6"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#cadGrid)" />

      <!-- North & CAD Stamp Header -->
      <g stroke="none">
        <text x="15" y="16" fill="#38bdf8" font-size="6.5" font-weight="bold">BİNA ÖN CEPHE TEKNİK ÇİZİMİ (GÜNEY ELEVATION)</text>
        <text x="15" y="24" fill="#64748b" font-size="5">ÖLÇEK: 1/100 | Hmax: ${totalBuildingHeightM}m | Genişlik: ${estW.toFixed(1)}m</text>
      </g>

      <!-- Structural Grid Axes (Vertical Lines & Top Bubbles) -->
      <g stroke="#0284c7" stroke-width="0.5" stroke-dasharray="4,2" opacity="0.6">
        <line x1="${axisA}" y1="30" x2="${axisA}" y2="${groundY + 15}" />
        <line x1="${axisB}" y1="30" x2="${axisB}" y2="${groundY + 15}" />
        <line x1="${axisC}" y1="30" x2="${axisC}" y2="${groundY + 15}" />
      </g>
      <!-- Axis Bubbles -->
      <g stroke="#38bdf8" stroke-width="0.8" fill="#0f172a">
        <circle cx="${axisA}" cy="28" r="5" />
        <circle cx="${axisB}" cy="28" r="5" />
        <circle cx="${axisC}" cy="28" r="5" />
        <text x="${axisA}" y="30" fill="#38bdf8" font-size="5" text-anchor="middle" stroke="none" font-weight="bold">A</text>
        <text x="${axisB}" y="30" fill="#38bdf8" font-size="5" text-anchor="middle" stroke="none" font-weight="bold">B</text>
        <text x="${axisC}" y="30" fill="#38bdf8" font-size="5" text-anchor="middle" stroke="none" font-weight="bold">C</text>
      </g>

      <!-- Ground Datum Line (±0.00 Kotu) -->
      <line x1="20" y1="${groundY}" x2="280" y2="${groundY}" stroke="#e2e8f0" stroke-width="1.5" />
      <!-- Earth Hatch Pattern under ground -->
      <g stroke="#475569" stroke-width="0.6">
        ${Array.from({ length: 25 }).map((_, i) => `<line x1="${25 + i * 10}" y1="${groundY}" x2="${15 + i * 10}" y2="${groundY + 10}" />`).join('')}
      </g>
      <text x="25" y="${groundY + 18}" fill="#94a3b8" font-size="5" font-weight="bold">TRETOVAR / TABİİ ZEMİN (±0.00 KOTU)</text>

      <!-- Building Body & Floors -->
      <g stroke="#38bdf8" stroke-width="1" fill="#0f172a">
        ${floorsList.map((fl) => `
          <g>
            <rect x="${bldgLeftX}" y="${fl.topY}" width="${bldgWidthPx}" height="${fl.hPx}" fill="#0f172a" fill-opacity="0.85" />
            <line x1="${bldgLeftX}" y1="${fl.topY}" x2="${bldgRightX}" y2="${fl.topY}" stroke="#38bdf8" stroke-width="0.8" />
            
            ${fl.isShop ? `
              <!-- Commercial Shop Facade -->
              <rect x="${bldgLeftX + 10}" y="${fl.topY + 8}" width="${bldgWidthPx - 20}" height="${fl.hPx - 10}" fill="#0284c7" fill-opacity="0.15" stroke="#38bdf8" stroke-width="0.8" rx="1" />
              <line x1="${bldgLeftX + bldgWidthPx / 2}" y1="${fl.topY + 8}" x2="${bldgLeftX + bldgWidthPx / 2}" y2="${fl.bottomY - 2}" stroke="#38bdf8" stroke-width="0.6" />
              <rect x="${bldgLeftX + 8}" y="${fl.topY + 2}" width="${bldgWidthPx - 16}" height="5" fill="#38bdf8" fill-opacity="0.3" />
              <text x="${bldgLeftX + bldgWidthPx / 2}" y="${fl.topY + 6}" fill="#38bdf8" font-size="4" text-anchor="middle" stroke="none" font-weight="bold">${compName} TİCARİ MAĞAZA (GİRİŞ)</text>
            ` : `
              <!-- Residential Windows & Balconies -->
              <!-- Left Window -->
              <rect x="${bldgLeftX + 12}" y="${fl.topY + 6}" width="22" height="14" fill="#0284c7" fill-opacity="0.25" stroke="#38bdf8" stroke-width="0.7" rx="1" />
              <line x1="${bldgLeftX + 23}" y1="${fl.topY + 6}" x2="${bldgLeftX + 23}" y2="${fl.topY + 20}" stroke="#38bdf8" stroke-width="0.4" />
              <!-- Center French / Balcony -->
              <rect x="${bldgLeftX + bldgWidthPx / 2 - 16}" y="${fl.topY + 4}" width="32" height="17" fill="#0284c7" fill-opacity="0.15" stroke="#38bdf8" stroke-width="0.7" rx="1" />
              <line x1="${bldgLeftX + bldgWidthPx / 2}" y1="${fl.topY + 4}" x2="${bldgLeftX + bldgWidthPx / 2}" y2="${fl.topY + 21}" stroke="#38bdf8" stroke-width="0.4" />
              <!-- Glass Balcony Railing -->
              <rect x="${bldgLeftX + bldgWidthPx / 2 - 18}" y="${fl.topY + 12}" width="36" height="9" fill="#38bdf8" fill-opacity="0.35" stroke="#38bdf8" stroke-width="0.6" rx="1" />
              <!-- Right Window -->
              <rect x="${bldgRightX - 34}" y="${fl.topY + 6}" width="22" height="14" fill="#0284c7" fill-opacity="0.25" stroke="#38bdf8" stroke-width="0.7" rx="1" />
              <line x1="${bldgRightX - 23}" y1="${fl.topY + 6}" x2="${bldgRightX - 23}" y2="${fl.topY + 20}" stroke="#38bdf8" stroke-width="0.4" />
            `}
          </g>
        `).join('')}

        <!-- Ground Floor Entrance Canopy -->
        ${!hasShop ? `
          <rect x="${bldgLeftX + bldgWidthPx / 2 - 14}" y="${groundY - 18}" width="28" height="18" fill="#0f172a" stroke="#10b981" stroke-width="1" rx="1" />
          <line x1="${bldgLeftX + bldgWidthPx / 2}" y1="${groundY - 18}" x2="${bldgLeftX + bldgWidthPx / 2}" y2="${groundY}" stroke="#10b981" stroke-width="0.5" />
          <!-- Canopy Roof -->
          <polygon points="${bldgLeftX + bldgWidthPx / 2 - 18},${groundY - 21} ${bldgLeftX + bldgWidthPx / 2 + 18},${groundY - 21} ${bldgLeftX + bldgWidthPx / 2 + 14},${groundY - 18} ${bldgLeftX + bldgWidthPx / 2 - 14},${groundY - 18}" fill="#10b981" fill-opacity="0.7" stroke="#10b981" stroke-width="0.8" />
          <text x="${bldgLeftX + bldgWidthPx / 2}" y="${groundY - 23}" fill="#10b981" font-size="4" text-anchor="middle" stroke="none" font-weight="bold">BİNA ANA GİRİŞİ</text>
        ` : ''}

        <!-- Roof Geometry -->
        ${roofSvg}
      </g>

      <!-- Floor Datum Level Markers (Left Side Kot İşaretleri) -->
      <g stroke="none" fill="#38bdf8">
        <!-- Ground Level 0.00 -->
        <polygon points="65,${groundY} 58,${groundY - 4} 58,${groundY + 4}" fill="#10b981" />
        <line x1="58" y1="${groundY}" x2="35" y2="${groundY}" stroke="#10b981" stroke-width="0.5" />
        <text x="32" y="${groundY + 2}" fill="#10b981" font-size="5" text-anchor="end" font-weight="bold">±0.00</text>

        ${floorsList.map((fl) => `
          <!-- Floor Level ${fl.elevation.toFixed(2)} -->
          <polygon points="65,${fl.topY} 58,${fl.topY - 4} 58,${fl.topY + 4}" fill="#38bdf8" />
          <line x1="58" y1="${fl.topY}" x2="35" y2="${fl.topY}" stroke="#38bdf8" stroke-width="0.5" />
          <text x="32" y="${fl.topY + 2}" fill="#38bdf8" font-size="5" text-anchor="end" font-weight="bold">+${fl.elevation.toFixed(2)}</text>
          <text x="32" y="${fl.topY - 4}" fill="#64748b" font-size="4" text-anchor="end">${fl.name}</text>
        `).join('')}
      </g>

      <!-- Height Dimension Line (Right Side) -->
      <g stroke="#10b981" stroke-width="0.8" fill="none">
        <line x1="${bldgRightX + 15}" y1="${topRoofY}" x2="${bldgRightX + 15}" y2="${groundY}" />
        <line x1="${bldgRightX + 5}" y1="${topRoofY}" x2="${bldgRightX + 20}" y2="${topRoofY}" stroke="#64748b" stroke-width="0.5" />
        <line x1="${bldgRightX + 5}" y1="${groundY}" x2="${bldgRightX + 20}" y2="${groundY}" stroke="#64748b" stroke-width="0.5" />
        <!-- Dimension Ticks -->
        <line x1="${bldgRightX + 12}" y1="${topRoofY + 3}" x2="${bldgRightX + 18}" y2="${topRoofY - 3}" stroke="#10b981" stroke-width="0.8" />
        <line x1="${bldgRightX + 12}" y1="${groundY + 3}" x2="${bldgRightX + 18}" y2="${groundY - 3}" stroke="#10b981" stroke-width="0.8" />
        <text x="${bldgRightX + 24}" y="${(topRoofY + groundY) / 2 + 2}" fill="#10b981" font-size="5.5" stroke="none" font-weight="bold" font-family="monospace">H = ${totalBuildingHeightM}m</text>
      </g>

      <!-- Width Dimension Line (Bottom) -->
      <g stroke="#10b981" stroke-width="0.8" fill="none">
        <line x1="${bldgLeftX}" y1="${groundY + 28}" x2="${bldgRightX}" y2="${groundY + 28}" />
        <line x1="${bldgLeftX}" y1="${groundY + 20}" x2="${bldgLeftX}" y2="${groundY + 33}" stroke="#64748b" stroke-width="0.5" />
        <line x1="${bldgRightX}" y1="${groundY + 20}" x2="${bldgRightX}" y2="${groundY + 33}" stroke="#64748b" stroke-width="0.5" />
        <line x1="${bldgLeftX - 3}" y1="${groundY + 31}" x2="${bldgLeftX + 3}" y2="${groundY + 25}" stroke="#10b981" stroke-width="0.8" />
        <line x1="${bldgRightX - 3}" y1="${groundY + 31}" x2="${bldgRightX + 3}" y2="${groundY + 25}" stroke="#10b981" stroke-width="0.8" />
        <text x="${bldgLeftX + bldgWidthPx / 2}" y="${groundY + 36}" fill="#10b981" font-size="6" text-anchor="middle" stroke="none" font-weight="bold" font-family="monospace">ÖN CEPHE ENİ: ${estW.toFixed(2)} m</text>
      </g>
    </svg>
  `;
}

function generateGroundFloorPlanSvgString(
  hasShop: boolean,
  roomType = '3+1 ODA',
  grossArea = 120,
  netArea = 96,
  baseBuildArea = 120,
  flatsPerFloor = 2,
  shopCount = 1
): string {
  const estW = Math.max(8, Math.round(Math.sqrt(baseBuildArea / 1.2) * 10) / 10);
  const estD = Math.max(10, Math.round((estW * 1.2) * 10) / 10);

  let contentMarkup = '';

  if (hasShop) {
    const sCount = Math.max(1, Math.min(4, shopCount));
    const shopGross = Math.round(((baseBuildArea * 0.85) / sCount) * 10) / 10;
    const shopNet = Math.round((shopGross * 0.8) * 10) / 10;

    contentMarkup = `
      <g stroke="#34d399" stroke-width="1.2" fill="none">
        <rect x="52" y="52" width="116" height="116" stroke-dasharray="3,3" />
        <rect x="56" y="56" width="108" height="108" fill="#047857" fill-opacity="0.1" />
        <text x="110" y="98" fill="#34d399" font-size="7" text-anchor="middle" stroke="none" font-weight="bold">TİCARİ MAĞAZA / DÜKKAN</text>
        <text x="110" y="108" fill="#94a3b8" font-size="5" text-anchor="middle" stroke="none">BRÜT: ~${shopGross} m² | NET: ~${shopNet} m²</text>
        <text x="110" y="118" fill="#38bdf8" font-size="5" text-anchor="middle" stroke="none" font-weight="bold">VİTRİN CEPHESİ & TİCARİ ALAN</text>
      </g>
    `;
  } else {
    return generateNormalFloorPlanSvgString(roomType, grossArea, netArea, baseBuildArea, flatsPerFloor);
  }

  return `
    <svg viewBox="0 0 240 240" style="width:100%; max-height:240px; background:#060a13; font-family:monospace;">
      <defs>
        <pattern id="planGrid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" stroke-width="0.3" opacity="0.6"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#planGrid)" />

      <!-- North Arrow -->
      <g transform="translate(210, 30)">
        <circle cx="0" cy="0" r="10" fill="#0f172a" stroke="#38bdf8" stroke-width="0.8" />
        <polygon points="0,-8 3,3 0,1 -3,3" fill="#38bdf8" />
        <text x="0" y="-10" fill="#38bdf8" font-size="4.5" text-anchor="middle" font-weight="bold">K</text>
      </g>

      <!-- Building Boundary (Thick CAD Outer Wall) -->
      <rect x="45" y="45" width="130" height="130" fill="none" stroke="#38bdf8" stroke-width="2" />
      <rect x="42" y="42" width="136" height="136" fill="none" stroke="#38bdf8" stroke-width="0.5" stroke-dasharray="2,2" />

      <!-- Elevator Core -->
      <g stroke="#f43f5e" stroke-width="1" fill="none">
        <rect x="98" y="70" width="24" height="24" stroke-width="1.2" fill="#0f172a" />
        <line x1="98" y1="70" x2="122" y2="94" stroke-width="0.6" />
        <line x1="122" y1="70" x2="98" y2="94" stroke-width="0.6" />
        <text x="110" y="84" fill="#f43f5e" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">ASANSÖR</text>
      </g>

      <!-- Staircase Core -->
      <g stroke="#38bdf8" stroke-width="1" fill="none">
        <rect x="98" y="94" width="24" height="36" stroke-width="1.2" fill="#0f172a" />
        <line x1="110" y1="94" x2="110" y2="130" stroke-width="0.8" />
        ${[100, 106, 112, 118, 124].map(y => `
          <line x1="98" y1="${y}" x2="110" y2="${y}" stroke="#38bdf8" stroke-width="0.5" />
          <line x1="110" y1="${y}" x2="122" y2="${y}" stroke="#38bdf8" stroke-width="0.5" />
        `).join('')}
        <path d="M 104,126 L 104,98 L 116,98 L 116,115" stroke="#10b981" stroke-width="0.8" fill="none" />
        <polygon points="114,113 116,117 118,113" fill="#10b981" stroke="none" />
        <text x="110" y="136" fill="#38bdf8" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">MERDİVEN</text>
      </g>

      ${contentMarkup}

      <!-- Dimension Lines -->
      <g stroke="#10b981" stroke-width="0.8" fill="none">
        <line x1="45" y1="23" x2="175" y2="23" />
        <line x1="45" y1="45" x2="45" y2="18" stroke="#475569" stroke-width="0.5" />
        <line x1="175" y1="45" x2="175" y2="18" stroke="#475569" stroke-width="0.5" />
        <line x1="42" y1="26" x2="48" y2="20" />
        <line x1="172" y1="26" x2="178" y2="20" />
        <text x="110" y="16" fill="#10b981" font-size="6" text-anchor="middle" stroke="none" font-weight="bold" font-family="monospace">${estW.toFixed(2)} m (EN)</text>

        <line x1="20" y1="45" x2="20" y2="175" />
        <line x1="45" y1="45" x2="15" y2="45" stroke="#475569" stroke-width="0.5" />
        <line x1="45" y1="175" x2="15" y2="175" stroke="#475569" stroke-width="0.5" />
        <line x1="17" y1="48" x2="23" y2="42" />
        <line x1="17" y1="178" x2="23" y2="172" />
        <text x="12" y="113" fill="#10b981" font-size="6" text-anchor="middle" stroke="none" font-weight="bold" font-family="monospace" transform="rotate(-90, 12, 113)">${estD.toFixed(2)} m (BOY)</text>
      </g>
      <text x="110" y="202" fill="#38bdf8" font-size="7.5" text-anchor="middle" stroke="none" font-weight="bold" letter-spacing="1">ZEMİN KAT PLANI (ÖLÇEK: 1/100)</text>
    </svg>
  `;
}

function generateNormalFloorPlanSvgString(
  roomType = '3+1 ODA',
  grossArea = 120,
  netArea = 96,
  baseBuildArea = 120,
  flatsPerFloor = 2
): string {
  const estW = Math.max(8, Math.round(Math.sqrt(baseBuildArea / 1.2) * 10) / 10);
  const estD = Math.max(10, Math.round((estW * 1.2) * 10) / 10);

  const fCount = Math.max(1, Math.min(4, flatsPerFloor));
  let flatLayoutMarkup = '';

  if (fCount === 1) {
    flatLayoutMarkup = `
      <g stroke="#a78bfa" stroke-width="1.2" fill="none">
        <rect x="48" y="48" width="124" height="124" stroke-dasharray="2,2" />
        <!-- Room Divisions -->
        <!-- Salon -->
        <rect x="48" y="48" width="50" height="60" stroke="#38bdf8" stroke-width="0.8" fill="#0284c7" fill-opacity="0.1" />
        <text x="73" y="75" fill="#38bdf8" font-size="5" text-anchor="middle" stroke="none" font-weight="bold">SALON</text>
        <text x="73" y="83" fill="#94a3b8" font-size="4" text-anchor="middle" stroke="none">~32 m²</text>
        
        <!-- Mutfak -->
        <rect x="48" y="108" width="50" height="35" stroke="#38bdf8" stroke-width="0.8" fill="#0284c7" fill-opacity="0.08" />
        <text x="73" y="126" fill="#38bdf8" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">MUTFAK</text>
        
        <!-- Ebeveyn Yatak Odası -->
        <rect x="122" y="48" width="50" height="55" stroke="#38bdf8" stroke-width="0.8" fill="#0284c7" fill-opacity="0.1" />
        <text x="147" y="75" fill="#38bdf8" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">E. YATAK ODASI</text>
        <text x="147" y="83" fill="#94a3b8" font-size="4" text-anchor="middle" stroke="none">~18 m²</text>

        <!-- Çocuk Odası -->
        <rect x="122" y="103" width="50" height="40" stroke="#38bdf8" stroke-width="0.8" fill="#0284c7" fill-opacity="0.08" />
        <text x="147" y="123" fill="#38bdf8" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">ÇOCUK ODASI</text>

        <!-- Banyo -->
        <rect x="48" y="143" width="35" height="29" stroke="#38bdf8" stroke-width="0.8" fill="#0284c7" fill-opacity="0.08" />
        <text x="65" y="160" fill="#38bdf8" font-size="4" text-anchor="middle" stroke="none" font-weight="bold">BANYO</text>

        <text x="110" y="160" fill="#a78bfa" font-size="6" text-anchor="middle" stroke="none" font-weight="bold">DAİRE 01 (TAM KAT REZİDANS)</text>
        <text x="110" y="168" fill="#94a3b8" font-size="4.5" text-anchor="middle" stroke="none">BRÜT: ~${grossArea} m² | NET: ~${netArea} m² (${roomType})</text>
      </g>
    `;
  } else if (fCount === 2) {
    flatLayoutMarkup = `
      <g stroke="#a78bfa" stroke-width="1.2" fill="none">
        <line x1="98" y1="45" x2="98" y2="175" stroke-dasharray="3,3" stroke="#a78bfa" />
        <line x1="122" y1="45" x2="122" y2="175" stroke-dasharray="3,3" stroke="#a78bfa" />
        
        <!-- Daire 01 Sol Odalar -->
        <rect x="46" y="46" width="51" height="58" stroke="#38bdf8" stroke-width="0.6" fill="#0284c7" fill-opacity="0.1" />
        <text x="71" y="72" fill="#38bdf8" font-size="5" text-anchor="middle" stroke="none" font-weight="bold">SALON</text>
        <text x="71" y="80" fill="#94a3b8" font-size="3.8" text-anchor="middle" stroke="none">~26 m²</text>

        <rect x="46" y="104" width="51" height="40" stroke="#38bdf8" stroke-width="0.6" fill="#0284c7" fill-opacity="0.08" />
        <text x="71" y="122" fill="#38bdf8" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">Y. ODASI</text>

        <rect x="46" y="144" width="30" height="30" stroke="#38bdf8" stroke-width="0.6" fill="#0284c7" fill-opacity="0.08" />
        <text x="61" y="160" fill="#38bdf8" font-size="3.8" text-anchor="middle" stroke="none">MUTFAK</text>

        <text x="71" y="100" fill="#a78bfa" font-size="5.5" text-anchor="middle" stroke="none" font-weight="bold">DAİRE 01 (SOL)</text>
        <text x="71" y="138" fill="#94a3b8" font-size="4" text-anchor="middle" stroke="none">NET: ~${netArea} m²</text>

        <!-- Daire 02 Sağ Odalar -->
        <rect x="123" y="46" width="51" height="58" stroke="#38bdf8" stroke-width="0.6" fill="#0284c7" fill-opacity="0.1" />
        <text x="148" y="72" fill="#38bdf8" font-size="5" text-anchor="middle" stroke="none" font-weight="bold">SALON</text>
        <text x="148" y="80" fill="#94a3b8" font-size="3.8" text-anchor="middle" stroke="none">~26 m²</text>

        <rect x="123" y="104" width="51" height="40" stroke="#38bdf8" stroke-width="0.6" fill="#0284c7" fill-opacity="0.08" />
        <text x="148" y="122" fill="#38bdf8" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">Y. ODASI</text>

        <rect x="144" y="144" width="30" height="30" stroke="#38bdf8" stroke-width="0.6" fill="#0284c7" fill-opacity="0.08" />
        <text x="159" y="160" fill="#38bdf8" font-size="3.8" text-anchor="middle" stroke="none">MUTFAK</text>

        <text x="148" y="100" fill="#a78bfa" font-size="5.5" text-anchor="middle" stroke="none" font-weight="bold">DAİRE 02 (SAĞ)</text>
        <text x="148" y="138" fill="#94a3b8" font-size="4" text-anchor="middle" stroke="none">NET: ~${netArea} m²</text>
        
        <text x="110" y="58" fill="#10b981" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">KAT HOLÜ</text>
      </g>
    `;
  } else {
    // 3 or 4 flats
    flatLayoutMarkup = `
      <g stroke="#a78bfa" stroke-width="1.2" fill="none">
        <line x1="98" y1="45" x2="98" y2="175" stroke-dasharray="3,3" />
        <line x1="122" y1="45" x2="122" y2="175" stroke-dasharray="3,3" />
        <line x1="45" y1="110" x2="175" y2="110" stroke-dasharray="3,3" />
        
        <text x="71" y="75" fill="#a78bfa" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">DAİRE 01 (ÖN SOL)</text>
        <text x="71" y="84" fill="#94a3b8" font-size="3.5" text-anchor="middle" stroke="none">NET: ~${netArea} m²</text>

        <text x="148" y="75" fill="#a78bfa" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">DAİRE 02 (ÖN SAĞ)</text>
        <text x="148" y="84" fill="#94a3b8" font-size="3.5" text-anchor="middle" stroke="none">NET: ~${netArea} m²</text>

        <text x="71" y="140" fill="#a78bfa" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">DAİRE 03 (ARKA SOL)</text>
        <text x="71" y="149" fill="#94a3b8" font-size="3.5" text-anchor="middle" stroke="none">NET: ~${netArea} m²</text>

        <text x="148" y="140" fill="#a78bfa" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">DAİRE 04 (ARKA SAĞ)</text>
        <text x="148" y="149" fill="#94a3b8" font-size="3.5" text-anchor="middle" stroke="none">NET: ~${netArea} m²</text>
        <text x="110" y="58" fill="#10b981" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">HOL</text>
      </g>
    `;
  }

  return `
    <svg viewBox="0 0 240 240" style="width:100%; max-height:240px; background:#060a13; font-family:monospace;">
      <defs>
        <pattern id="planGridNorm" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" stroke-width="0.3" opacity="0.6"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#planGridNorm)" />

      <!-- North Arrow -->
      <g transform="translate(210, 30)">
        <circle cx="0" cy="0" r="10" fill="#0f172a" stroke="#38bdf8" stroke-width="0.8" />
        <polygon points="0,-8 3,3 0,1 -3,3" fill="#38bdf8" />
        <text x="0" y="-10" fill="#38bdf8" font-size="4.5" text-anchor="middle" font-weight="bold">K</text>
      </g>

      <!-- Outer Boundary Wall -->
      <rect x="45" y="45" width="130" height="130" fill="none" stroke="#38bdf8" stroke-width="2" />
      <rect x="42" y="42" width="136" height="136" fill="none" stroke="#38bdf8" stroke-width="0.5" stroke-dasharray="2,2" />

      <!-- Core: Elevator -->
      <g stroke="#f43f5e" stroke-width="1" fill="none">
        <rect x="98" y="70" width="24" height="24" stroke-width="1.2" fill="#0f172a" />
        <line x1="98" y1="70" x2="122" y2="94" stroke-width="0.6" />
        <line x1="122" y1="70" x2="98" y2="94" stroke-width="0.6" />
        <text x="110" y="84" fill="#f43f5e" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">ASANSÖR</text>
      </g>

      <!-- Core: Staircase -->
      <g stroke="#38bdf8" stroke-width="1" fill="none">
        <rect x="98" y="94" width="24" height="36" stroke-width="1.2" fill="#0f172a" />
        <line x1="110" y1="94" x2="110" y2="130" stroke-width="0.8" />
        ${[100, 106, 112, 118, 124].map(y => `
          <line x1="98" y1="${y}" x2="110" y2="${y}" stroke="#38bdf8" stroke-width="0.5" />
          <line x1="110" y1="${y}" x2="122" y2="${y}" stroke="#38bdf8" stroke-width="0.5" />
        `).join('')}
        <path d="M 104,126 L 104,98 L 116,98 L 116,115" stroke="#10b981" stroke-width="0.8" fill="none" />
        <polygon points="114,113 116,117 118,113" fill="#10b981" stroke="none" />
        <text x="110" y="136" fill="#38bdf8" font-size="4.5" text-anchor="middle" stroke="none" font-weight="bold">MERDİVEN</text>
      </g>

      ${flatLayoutMarkup}

      <!-- Dimension Lines & Kot Axis -->
      <g stroke="#10b981" stroke-width="0.8" fill="none">
        <line x1="45" y1="23" x2="175" y2="23" />
        <line x1="45" y1="45" x2="45" y2="18" stroke="#475569" stroke-width="0.5" />
        <line x1="175" y1="45" x2="175" y2="18" stroke="#475569" stroke-width="0.5" />
        <line x1="42" y1="26" x2="48" y2="20" />
        <line x1="172" y1="26" x2="178" y2="20" />
        <text x="110" y="16" fill="#10b981" font-size="6" text-anchor="middle" stroke="none" font-weight="bold" font-family="monospace">${estW.toFixed(2)} m (EN)</text>

        <line x1="20" y1="45" x2="20" y2="175" />
        <line x1="45" y1="45" x2="15" y2="45" stroke="#475569" stroke-width="0.5" />
        <line x1="45" y1="175" x2="15" y2="175" stroke="#475569" stroke-width="0.5" />
        <line x1="17" y1="48" x2="23" y2="42" />
        <line x1="17" y1="178" x2="23" y2="172" />
        <text x="12" y="113" fill="#10b981" font-size="6" text-anchor="middle" stroke="none" font-weight="bold" font-family="monospace" transform="rotate(-90, 12, 113)">${estD.toFixed(2)} m (BOY)</text>
      </g>
      <text x="110" y="202" fill="#38bdf8" font-size="7.5" text-anchor="middle" stroke="none" font-weight="bold" letter-spacing="1">MİMARİ NORMAL KAT PLANI (ÖLÇEK: 1/100)</text>
    </svg>
  `;
}
