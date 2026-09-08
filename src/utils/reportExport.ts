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
  const showTrade = opts.showTradeRegistry !== false;
  const showMersis = opts.showMersis !== false;
  const showLicence = opts.showContractorLicence !== false;
  const showChamber = opts.showChamberNo !== false;
  const showBank = opts.showBankInfo !== false;
  const showFirstAuth = opts.showFirstAuthorized !== false;
  const showFirstAuthChamber = opts.showFirstAuthorizedChamber !== false;
  const showSecondAuth = opts.showSecondAuthorized === true && !!companyProfile?.authorizedPerson2;
  const showSecondAuthChamber = opts.showSecondAuthorizedChamber !== false;
  const showStamp = opts.showStamp !== false;
  const showFloorFacade = opts.showFloorAndFacade !== false;
  const showLandSerefiye = opts.showLandShareAndSerefiye !== false;

  const compName = companyProfile?.companyName || 'AB YAPI';
  const compLegal = companyProfile?.legalName || 'AB YAPI MÜTEAHHİTLİK VE MÜHENDİSLİK TİC. LTD. ŞTİ.';
  const compSlogan = companyProfile?.slogan || 'Depreme Dayanıklı, Güvenli ve Modern Yaşam Alanları';
  const compTagline = companyProfile?.tagline || 'Kentsel Dönüşüm, Statik & Mimari Projelendirme, Kat Karşılığı İnşaat';
  const compAddress = companyProfile?.address || 'Kocamustafapaşa Mah. Orgeneral Abdurrahman Nafiz Gürman Cad. No:42 Fatih / İSTANBUL';
  const compPhone = companyProfile?.phone || '+90 (212) 585 10 20';
  const compEmail = companyProfile?.email || 'info@abyapi.com.tr';
  const compWeb = companyProfile?.website || 'www.abyapi.com.tr';
  
  // 1st Authorized
  const compAuth = companyProfile?.authorizedPerson || 'Müh. Alpaslan Beyoğlu';
  const compAuthTitle = companyProfile?.authorizedTitle || 'Genel Müdür / İnşaat Mühendisi';
  const compAuthChamber = companyProfile?.authorizedChamberNo || 'İMO-74120';

  // 2nd Authorized (Technical / Site Chief)
  const compAuth2 = companyProfile?.authorizedPerson2 || '';
  const compAuthTitle2 = companyProfile?.authorizedTitle2 || '';
  const compAuthChamber2 = companyProfile?.authorizedChamberNo2 || '';

  // Legal & Tax registry
  const compTax = companyProfile?.taxOffice && companyProfile?.taxNumber ? `${companyProfile.taxOffice} / V.No: ${companyProfile.taxNumber}` : '';
  const compTrade = companyProfile?.tradeRegistryNo ? `Tic. Sicil: ${companyProfile.tradeRegistryNo}` : '';
  const compMersis = companyProfile?.mersisNo ? `MERSİS: ${companyProfile.mersisNo}` : '';
  const compLicence = companyProfile?.contractorLicenceNo ? `Müteahhitlik Yetki: ${companyProfile.contractorLicenceNo}` : '';
  const compChamber = companyProfile?.chamberNo ? `Oda Sicil: ${companyProfile.chamberNo}` : '';
  const compBank = companyProfile?.bankName || '';
  const compIban = companyProfile?.iban || '';

  const compLogo = companyProfile?.logoBase64 || '';
  const compStamp = companyProfile?.stampBase64 || '';

  const supportText =
    params.transformationStatus === 'currentSupport'
      ? 'Yarısı Bizden Modeli (875.000 TL Hibe + 875.000 TL Kredi Desteği)'
      : params.transformationStatus === 'futureSupport2027'
      ? '2027 Kentsel Dönüşüm Kredi Modeli (3 Milyon TL / 180 Ay Vade)'
      : 'Öz Kaynaklı / Desteksiz Yapım Modeli';

  const isContractorShareModel = params.projectModel === 'contractorShare';

  // Physical gross and net area calculation
  const upperFloorsCount_rep = Math.max(0, (params.floorCount || 5) - 1);
  let upperFloorArea_rep = Math.max(10, params.baseBuildArea || 120);
  if (params.hasCantilever && params.cantileverDepth && params.cantileverDepth > 0) {
    const estW = Math.max(5, Math.sqrt(upperFloorArea_rep / 1.2));
    const estD = estW * 1.2;
    if (params.cantileverDirection === 'all') {
      upperFloorArea_rep = (estW + 2 * params.cantileverDepth) * (estD + 2 * params.cantileverDepth);
    } else if (params.cantileverDirection === 'front') {
      upperFloorArea_rep = estW * (estD + params.cantileverDepth);
    } else {
      upperFloorArea_rep = estW * (estD + 2 * params.cantileverDepth);
    }
  }
  const residentialFloors_rep = params.hasGroundFloorShop ? Math.max(1, (params.floorCount || 5) - 1) : Math.max(1, params.floorCount || 5);
  const flatsPerFloor_rep = Math.max(1, Math.round((res.flatCount || 10) / residentialFloors_rep));
  const physicalGrossArea_rep = Math.max(20, Math.round((upperFloorArea_rep / flatsPerFloor_rep) * 10) / 10);
  const physicalNetArea_rep = Math.max(15, Math.round((physicalGrossArea_rep * 0.8) * 10) / 10);
  const estimatedLandArea_rep = Math.round((params.baseBuildArea || 150) / 0.4);

  const proposalNumber = `${compName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${String(res.flatCount || 10).padStart(3, '0')}`;
  const proposalDate = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const validityDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const totalFlats = res.flatCount || 10;
  const totalFloors = params.floorCount || 5;
  const flatsPerFloor = Math.max(1, Math.ceil(totalFlats / totalFloors));

  const flatRows = res.flatResults
    .map((f) => {
      const floorNo = f.floorNumber !== undefined ? f.floorNumber : Math.min(totalFloors, Math.ceil(f.id / flatsPerFloor));
      const floorText = floorNo === 0 ? 'Zemin Kat' : `${floorNo}. Kat`;
      const facadeText = f.facade ? (f.facade.charAt(0).toUpperCase() + f.facade.slice(1)) : 'Güney';
      const floorFacadeHtml = showFloorFacade ? `<div style="color:#4f46e5;font-weight:normal;font-size:9.5px;margin-top:1px;">${floorText} • ${facadeText}</div>` : '';
      const roomCountText = f.flatType === 'shop' 
        ? 'Ticari / Dükkan' 
        : params.roomType ? `${params.roomType} Oda` : (f.area < 65 ? '1+1' : f.area < 95 ? '2+1' : f.area < 135 ? '3+1' : '4+1');
      
      const flatBadge = f.flatType === 'mansard'
        ? `<span style="background:#e0e7ff;color:#3730a3;padding:2px 5px;border-radius:4px;font-size:9px;font-weight:bold;display:inline-block;">Mansart Çatı</span>`
        : f.flatType === 'duplex'
        ? `<span style="background:#d1fae5;color:#065f46;padding:2px 5px;border-radius:4px;font-size:9px;font-weight:bold;display:inline-block;">Çatı Dubleksi</span>`
        : '';

      const serefiyeText = f.serefiyeMultiplier && f.serefiyeMultiplier !== 1.0
        ? `<span style="color:#b45309;font-weight:bold;font-size:10.5px;">x${f.serefiyeMultiplier.toFixed(2)} (${Math.round((f.serefiyeMultiplier - 1) * 100) > 0 ? '+' : ''}${Math.round((f.serefiyeMultiplier - 1) * 100)}%)</span>`
        : `<span style="color:#64748b;font-size:10.5px;">1.00 (%0)</span>`;

      const landShareDiff = f.landShareDifference || 0;
      const landShareText = landShareDiff !== 0
        ? `<span style="font-weight:bold;font-size:10.5px;color:${landShareDiff > 0 ? '#b45309' : '#047857'};">${landShareDiff > 0 ? '+' : ''}${landShareDiff.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</span>`
        : `<span style="color:#64748b;font-size:10.5px;">0 TL</span>`;

      const serefiyeCell = showLandSerefiye ? `<td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;">${serefiyeText}</td>` : '';
      const landShareCell = showLandSerefiye ? `<td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;">${landShareText}</td>` : '';

      if (isContractorShareModel) {
        const fundingType = f.isContractorShare ? 'Müteahhit Payı Satış' : 'Arsa Payı Mahsubu';
        return `
        <tr>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:bold;color:#0f172a;">
            Daire ${f.id} ${flatBadge ? `<br>${flatBadge}` : ''}
            ${floorFacadeHtml}
          </td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;">
            <strong>${f.name}</strong>
            <div style="color:#64748b;font-size:9.5px;font-family:monospace;">TC: ${f.tc}</div>
          </td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;">
            <strong>${roomCountText}</strong>
            <div style="color:#475569;font-size:9.5px;">Brüt: ${physicalGrossArea_rep} m² | <span style="color:#047857;font-weight:bold;">Net: ${physicalNetArea_rep} m²</span></div>
          </td>
          ${serefiyeCell}
          ${landShareCell}
          <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;font-weight:600;font-family:monospace;">${f.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;color:#047857;font-weight:bold;text-align:right;font-family:monospace;">
            -${f.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
            <div style="color:#64748b;font-size:8.5px;font-weight:normal;">${fundingType}</div>
          </td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:bold;color:#047857;background-color:#f0fdf4;text-align:right;font-family:monospace;">0 TL</td>
        </tr>`;
      } else {
        return `
        <tr>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:bold;color:#0f172a;">
            Daire ${f.id} ${flatBadge ? `<br>${flatBadge}` : ''}
            ${floorFacadeHtml}
          </td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;">
            <strong>${f.name}</strong>
            <div style="color:#64748b;font-size:9.5px;font-family:monospace;">TC: ${f.tc}</div>
          </td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;">
            <strong>${roomCountText}</strong>
            <div style="color:#475569;font-size:9.5px;">Brüt: ${physicalGrossArea_rep} m² | <span style="color:#047857;font-weight:bold;">Net: ${physicalNetArea_rep} m²</span></div>
          </td>
          ${serefiyeCell}
          ${landShareCell}
          <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;font-weight:600;font-family:monospace;">${f.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;color:#4f46e5;font-family:monospace;">-${f.downPayment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;color:#047857;font-family:monospace;">-${f.usedCredit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:bold;text-align:right;background-color:#f8fafc;color:#0f172a;font-family:monospace;">${f.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
        </tr>`;
      }
    })
    .join('');

  const serefiyeHeader = showLandSerefiye ? `<th style="background:#0f172a;color:#fff;padding:8px;border:1px solid #cbd5e1;text-align:center;">Şerefiye</th>` : '';
  const landShareHeader = showLandSerefiye ? `<th style="background:#0f172a;color:#fff;padding:8px;border:1px solid #cbd5e1;text-align:right;">Arsa Mahsubu</th>` : '';

  const table1Header = isContractorShareModel
    ? `<tr>
        <th style="background:#0f172a;color:#fff;padding:8px;border:1px solid #cbd5e1;text-align:left;">Daire & Kat No</th>
        <th style="background:#0f172a;color:#fff;padding:8px;border:1px solid #cbd5e1;text-align:left;">Hak Sahibi & TC</th>
        <th style="background:#0f172a;color:#fff;padding:8px;border:1px solid #cbd5e1;text-align:left;">Oda & Alan</th>
        ${serefiyeHeader}
        ${landShareHeader}
        <th style="background:#0f172a;color:#fff;padding:8px;border:1px solid #cbd5e1;text-align:right;">İmalat Bedeli</th>
        <th style="background:#0f172a;color:#fff;padding:8px;border:1px solid #cbd5e1;text-align:right;">Kat Karşılığı İndirimi</th>
        <th style="background:#065f46;color:#fff;padding:8px;border:1px solid #cbd5e1;text-align:right;">Net Malik Borcu</th>
      </tr>`
    : `<tr>
        <th style="background:#0f172a;color:#fff;padding:8px;border:1px solid #cbd5e1;text-align:left;">Daire & Kat No</th>
        <th style="background:#0f172a;color:#fff;padding:8px;border:1px solid #cbd5e1;text-align:left;">Hak Sahibi & TC</th>
        <th style="background:#0f172a;color:#fff;padding:8px;border:1px solid #cbd5e1;text-align:left;">Oda & Alan</th>
        ${serefiyeHeader}
        ${landShareHeader}
        <th style="background:#0f172a;color:#fff;padding:8px;border:1px solid #cbd5e1;text-align:right;">Daire Bedeli</th>
        <th style="background:#0f172a;color:#fff;padding:8px;border:1px solid #cbd5e1;text-align:right;">Ödenen Peşinat</th>
        <th style="background:#0f172a;color:#fff;padding:8px;border:1px solid #cbd5e1;text-align:right;">Dönüşüm Desteği</th>
        <th style="background:#1e3a8a;color:#fff;padding:8px;border:1px solid #cbd5e1;text-align:right;">Net Kalan Borç</th>
      </tr>`;

  let paymentScheduleBlock = '';
  if (isContractorShareModel) {
    paymentScheduleBlock = `
    <div class="avoid-break" style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:11px;color:#065f46;line-height:1.5;">
      <strong style="font-size:12px;display:block;margin-bottom:3px;">🤝 Kat Karşılığı Yapım Modeli Finansman Beyanı:</strong>
      <p style="margin:0;">Kat Karşılığı Yapım Modelinde, yapının tasarım, mimari/statik proje, ruhsat harçları, zemin güçlendirme, malzeme ve şantiye yapım maliyetlerinin tamamı yüklenici firma tarafından üstlenilmiştir. Arsa maliklerinin herhangi bir nakit borçlanması, ara ödeme veya taksit yükümlülüğü bulunmamaktadır.</p>
    </div>`;
  } else if (params.paymentPlanType === 'installments') {
    paymentScheduleBlock = `
    <div class="avoid-break">
      <h3 style="color:#0f172a;font-size:12px;text-transform:uppercase;border-bottom:2px solid #cbd5e1;padding-bottom:4px;margin-top:16px;margin-bottom:8px;">
        4. Aylık Eşit Taksitli Ödeme Takvimi (${params.installmentCount || 12} Ay Vadeli - Proje Geneli Özet Plan)
      </h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10.5px;">
        <thead>
          <tr>
            <th style="background:#0f172a;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:left;">Proje Ödeme Kapsamı</th>
            <th style="background:#0f172a;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">Daire Ortalama Bedeli</th>
            <th style="background:#0f172a;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">Daire Başı Peşinat</th>
            <th style="background:#0f172a;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">Daire Başı Destek</th>
            <th style="background:#0f172a;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">Daire Başı Kalan Borç</th>
            <th style="background:#0f172a;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:center;">Vade</th>
            <th style="background:#065f46;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">Daire Başı Aylık Taksit</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Tüm Bağımsız Bölümler (${res.flatResults.length} Adet Konut - Ortak Plan)</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-family:monospace;">${Math.round(res.flatResults.reduce((s,f)=>s+f.grossPay,0)/res.flatResults.length).toLocaleString('tr-TR')} TL</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;color:#4f46e5;font-family:monospace;">-${Math.round(res.flatResults.reduce((s,f)=>s+f.downPayment,0)/res.flatResults.length).toLocaleString('tr-TR')} TL</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;color:#047857;font-family:monospace;">-${Math.round(res.flatResults.reduce((s,f)=>s+f.usedCredit,0)/res.flatResults.length).toLocaleString('tr-TR')} TL</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-weight:bold;font-family:monospace;">${Math.round(res.flatResults.reduce((s,f)=>s+f.netRemainingDebt,0)/res.flatResults.length).toLocaleString('tr-TR')} TL</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${params.installmentCount || 12} Ay</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-weight:bold;color:#065f46;background:#f0fdf4;font-family:monospace;">${Math.round(res.flatResults.reduce((s,f)=>s+f.monthlyInstallment,0)/res.flatResults.length).toLocaleString('tr-TR')} TL / Ay</td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="background:#f8fafc;font-weight:bold;border-top:2px solid #cbd5e1;">
            <td colspan="4" style="padding:8px;border:1px solid #cbd5e1;">PROJE GENELİ TOPLAM HAKEDİŞ / BORÇ HACMİ:</td>
            <td style="padding:8px;border:1px solid #cbd5e1;text-align:right;font-family:monospace;">${res.flatResults.reduce((s, f) => s + f.netRemainingDebt, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
            <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;">${params.installmentCount || 12} Ay</td>
            <td style="padding:8px;border:1px solid #cbd5e1;text-align:right;color:#065f46;background:#d1fae5;font-size:11.5px;font-family:monospace;">${(res.totalMonthlyInstallments || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL / Ay</td>
          </tr>
        </tfoot>
      </table>
    </div>`;
  } else if (params.paymentPlanType === 'hybrid') {
    paymentScheduleBlock = `
    <div class="avoid-break">
      <h3 style="color:#0f172a;font-size:12px;text-transform:uppercase;border-bottom:2px solid #cbd5e1;padding-bottom:4px;margin-top:16px;margin-bottom:8px;">
        4. Karma Ödeme Takvimi (Peşinat + Ara Ödemeler + ${params.installmentCount || 12} Ay Taksit - Proje Geneli Özet Plan)
      </h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10.5px;">
        <thead>
          <tr>
            <th style="background:#0f172a;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:left;">Proje Ödeme Kapsamı</th>
            <th style="background:#0f172a;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">Daire Başı Net Borç</th>
            <th style="background:#0f172a;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">1. Ara Ödeme (%25 Kaba)</th>
            <th style="background:#0f172a;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">2. Ara Ödeme (%15 İskân)</th>
            <th style="background:#0f172a;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">Taksitlendirilen (%60)</th>
            <th style="background:#065f46;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">Daire Başı Aylık (${params.installmentCount || 12} Ay)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Tüm Bağımsız Bölümler (${res.flatResults.length} Adet Konut - Karma Plan)</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-weight:bold;font-family:monospace;">${Math.round(res.flatResults.reduce((s,f)=>s+f.netRemainingDebt,0)/res.flatResults.length).toLocaleString('tr-TR')} TL</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;color:#4338ca;font-family:monospace;">${Math.round(res.flatResults.reduce((s,f)=>s+(f.netRemainingDebt*0.25),0)/res.flatResults.length).toLocaleString('tr-TR')} TL</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;color:#7e22ce;font-family:monospace;">${Math.round(res.flatResults.reduce((s,f)=>s+(f.netRemainingDebt*0.15),0)/res.flatResults.length).toLocaleString('tr-TR')} TL</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-family:monospace;">${Math.round(res.flatResults.reduce((s,f)=>s+(f.netRemainingDebt*0.60),0)/res.flatResults.length).toLocaleString('tr-TR')} TL</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-weight:bold;color:#065f46;background:#f0fdf4;font-family:monospace;">${Math.round(res.flatResults.reduce((s,f)=>s+(f.netRemainingDebt*0.60/Math.max(1, params.installmentCount || 12)),0)/res.flatResults.length).toLocaleString('tr-TR')} TL / Ay</td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="background:#f8fafc;font-weight:bold;border-top:2px solid #cbd5e1;">
            <td style="padding:8px;border:1px solid #cbd5e1;">PROJE GENELİ TOPLAM:</td>
            <td colspan="5" style="padding:8px;border:1px solid #cbd5e1;text-align:right;font-family:monospace;">${res.flatResults.reduce((s, f) => s + f.netRemainingDebt, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL Toplam Borç Hacmi</td>
          </tr>
        </tfoot>
      </table>
    </div>`;
  } else {
    paymentScheduleBlock = `
    <div class="avoid-break">
      <h3 style="color:#0f172a;font-size:12px;text-transform:uppercase;border-bottom:2px solid #cbd5e1;padding-bottom:4px;margin-top:16px;margin-bottom:8px;">
        4. Fiziki İlerleme Hakediş Takvimi (5 Aşamalı - Proje Geneli Özet Plan)
      </h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10.5px;">
        <thead>
          <tr>
            <th style="background:#0f172a;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:left;">Proje İlerleme Kapsamı</th>
            <th style="background:#0f172a;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">1. Ruhsat (%${params.stage1Pay || 20})</th>
            <th style="background:#0f172a;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">2. Temel (%${params.stage2Pay || 20})</th>
            <th style="background:#0f172a;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">3. Kaba (%${params.stage3Pay || 30})</th>
            <th style="background:#0f172a;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">4. İnce (%${params.stage4Pay || 20})</th>
            <th style="background:#0f172a;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">5. İskân (%${params.stage5Pay || 10})</th>
            <th style="background:#1e3a8a;color:#fff;padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">Ortalama Net Borç</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Tüm Bağımsız Bölümler (${res.flatResults.length} Adet Konut - Aşama Planı)</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-family:monospace;">${Math.round(res.flatResults.reduce((s,f)=>s+f.stagePayments[0],0)/res.flatResults.length).toLocaleString('tr-TR')} TL</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-family:monospace;">${Math.round(res.flatResults.reduce((s,f)=>s+f.stagePayments[1],0)/res.flatResults.length).toLocaleString('tr-TR')} TL</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-family:monospace;">${Math.round(res.flatResults.reduce((s,f)=>s+f.stagePayments[2],0)/res.flatResults.length).toLocaleString('tr-TR')} TL</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-weight:bold;color:#4f46e5;font-family:monospace;">${Math.round(res.flatResults.reduce((s,f)=>s+f.stagePayments[3],0)/res.flatResults.length).toLocaleString('tr-TR')} TL</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-family:monospace;">${Math.round(res.flatResults.reduce((s,f)=>s+f.stagePayments[4],0)/res.flatResults.length).toLocaleString('tr-TR')} TL</td>
            <td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;text-align:right;font-family:monospace;">${Math.round(res.flatResults.reduce((s,f)=>s+f.netRemainingDebt,0)/res.flatResults.length).toLocaleString('tr-TR')} TL</td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="background:#f8fafc;font-weight:bold;border-top:2px solid #cbd5e1;">
            <td style="padding:8px;border:1px solid #cbd5e1;">PROJE GENELİ TOPLAM:</td>
            <td colspan="6" style="padding:8px;border:1px solid #cbd5e1;text-align:right;font-family:monospace;">${res.flatResults.reduce((s, f) => s + f.netRemainingDebt, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL Toplam Hakediş</td>
          </tr>
        </tfoot>
      </table>
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${compName} - Resmî Bina Yapım ve Kentsel Dönüşüm Teklifnamesi</title>
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
        content: "${compName} - Resmî Teklifname";
        font-size: 9px;
        color: #64748b;
        font-family: sans-serif;
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      padding: 0;
      margin: 0 auto;
      color: #0f172a;
      max-width: 960px;
      line-height: 1.45;
      font-size: 11px;
      background: #ffffff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    h1, h2, h3, h4 { color: #0f172a; margin: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 14px; font-size: 10.5px; page-break-inside: auto; }
    tr { page-break-inside: avoid !important; break-inside: avoid !important; }
    .meta-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; }
    .spec-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; }
    .highlight-box { background: #0f172a; color: #ffffff; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; }
    .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
    .no-print { display: none !important; }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="avoid-break" style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:14px;">
    <div style="display:flex;align-items:center;gap:12px;">
      ${showLogo && compLogo ? `<img src="${compLogo}" alt="${compName}" style="max-height:50px;max-width:130px;object-fit:contain;" />` : ''}
      <div>
        <h1 style="font-size:15px;font-weight:bold;color:#0f172a;letter-spacing:-0.2px;">${showLegal ? compLegal : compName}</h1>
        ${showSlogan && compSlogan ? `<p style="margin:2px 0 0 0;font-size:11px;color:#4338ca;font-weight:600;">${compSlogan}</p>` : ''}
        ${showTagline && compTagline ? `<p style="margin:1px 0 0 0;font-size:9.5px;color:#475569;">${compTagline}</p>` : ''}
        <div style="font-size:9.5px;color:#64748b;margin-top:3px;line-height:1.3;">
          ${showAddr && compAddress ? `${compAddress} <br>` : ''}
          ${showPhone && compPhone ? `Tel: ${compPhone} ` : ''}
          ${showPhone && compPhone && showEmail && compEmail ? '| ' : ''}
          ${showEmail && compEmail ? `E-posta: ${compEmail} ` : ''}
          ${(showPhone || showEmail) && showWeb && compWeb ? '| ' : ''}
          ${showWeb && compWeb ? `Web: ${compWeb}` : ''}
          ${(showTax && compTax) || (showLicence && compLicence) || (showTrade && compTrade) || (showMersis && compMersis) || (showChamber && compChamber) ? '<br>' : ''}
          ${showTax && compTax ? `<strong>${compTax}</strong> ` : ''}
          ${showTrade && compTrade ? `| <strong>${compTrade}</strong> ` : ''}
          ${showMersis && compMersis ? `| <strong>${compMersis}</strong> ` : ''}
          ${showLicence && compLicence ? `| <strong>${compLicence}</strong> ` : ''}
          ${showChamber && compChamber ? `| <strong>${compChamber}</strong>` : ''}
        </div>
      </div>
    </div>
    <div style="text-align:right;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px;font-family:monospace;font-size:9.5px;min-width:160px;">
      <div style="color:#64748b;font-weight:bold;text-transform:uppercase;font-size:9px;">RESMÎ TEKLİFNAME</div>
      <div style="color:#0f172a;font-weight:bold;font-size:11px;margin:1px 0;">${proposalNumber}</div>
      <div>Tarih: <strong>${proposalDate}</strong></div>
      <div>Geçerlilik: <strong style="color:#047857;">${validityDate}</strong></div>
    </div>
  </div>

  <!-- PROPOSAL TITLE -->
  <div class="avoid-break" style="margin-bottom:14px;">
    <span style="background:#e0e7ff;color:#3730a3;font-size:8.5px;font-weight:bold;padding:2px 7px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;">
      ${isContractorShareModel ? 'KAT KARŞILIĞI İNŞAAT PROTOKOLÜ' : 'KENTSEL DÖNÜŞÜM & BİNA YAPIM TEKLİFİ'}
    </span>
    <h2 style="font-size:14px;font-weight:bold;margin-top:4px;color:#0f172a;">
      ${params.projectAddress || 'Taşınmaz Malikleri'} - Resmî Yapım ve Ödeme Protokolü
    </h2>
  </div>

  <!-- 1. PROJECT META -->
  <div class="avoid-break">
    <h3 style="color:#0f172a;font-size:12px;text-transform:uppercase;border-bottom:2px solid #cbd5e1;padding-bottom:4px;margin-bottom:8px;">
      1. Proje ve Taşınmaz Mimari Künyesi
    </h3>
    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:8px;margin-bottom:14px;">
      <div class="meta-card">
        <div style="color:#64748b;font-size:9.5px;font-weight:600;">Arsa Alanı</div>
        <div style="font-size:12px;font-weight:bold;color:#0f172a;font-family:monospace;">${estimatedLandArea_rep.toLocaleString('tr-TR')} m²</div>
      </div>
      <div class="meta-card">
        <div style="color:#64748b;font-size:9.5px;font-weight:600;">Taban Oturumu</div>
        <div style="font-size:12px;font-weight:bold;color:#0f172a;font-family:monospace;">${res.baseArea.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m²</div>
      </div>
      <div class="meta-card">
        <div style="color:#64748b;font-size:9.5px;font-weight:600;">Toplam İnşaat Alanı</div>
        <div style="font-size:12px;font-weight:bold;color:#1e3a8a;font-family:monospace;">${res.totalArea.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m²</div>
      </div>
      <div class="meta-card">
        <div style="color:#64748b;font-size:9.5px;font-weight:600;">Kat ve Daire Sayısı</div>
        <div style="font-size:12px;font-weight:bold;color:#0f172a;">${params.floorCount || 5} Kat / ${res.flatCount} Daire</div>
      </div>
      <div class="meta-card">
        <div style="color:#64748b;font-size:9.5px;font-weight:600;">Tipik Daire Alanı</div>
        <div style="font-size:11px;font-weight:bold;color:#0f172a;font-family:monospace;">Brüt: ${physicalGrossArea_rep} m² | Net: ${physicalNetArea_rep} m²</div>
      </div>
      <div class="meta-card">
        <div style="color:#64748b;font-size:9.5px;font-weight:600;">Birim İmalat Fiyatı</div>
        <div style="font-size:12px;font-weight:bold;color:#047857;font-family:monospace;">${res.grossCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²</div>
      </div>
      <div class="meta-card">
        <div style="color:#64748b;font-size:9.5px;font-weight:600;">Teslim Süresi</div>
        <div style="font-size:12px;font-weight:bold;color:#0f172a;font-family:monospace;">${res.finalMonths} Ay</div>
      </div>
      <div class="meta-card">
        <div style="color:#64748b;font-size:9.5px;font-weight:600;">Dönüşüm Modeli</div>
        <div style="font-size:10.5px;font-weight:bold;color:#b45309;">${params.transformationStatus === 'currentSupport' ? 'Yarısı Bizden Hibe/Kredi' : 'Öz Kaynaklı'}</div>
      </div>
    </div>
  </div>

  <!-- 2. FINANCIAL SUMMARY -->
  <div class="highlight-box avoid-break">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #334155;padding-bottom:6px;margin-bottom:8px;">
      <span style="font-size:10.5px;color:#94a3b8;font-weight:bold;text-transform:uppercase;">TOPLAM PROJE İMALAT HACMİ</span>
      <span style="font-size:16px;font-weight:bold;color:#34d399;font-family:monospace;">${res.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</span>
    </div>
    <div style="font-size:10.5px;color:#cbd5e1;line-height:1.5;">
      <strong>Finansman ve Teşvik:</strong> ${supportText}<br>
      <strong>Taahhüt Modeli:</strong> ${isContractorShareModel ? 'Kat Karşılığı Yapım (Maliklere 0 TL Borç)' : 'Hak Sahipleri Hakedişli Yapım'}
      ${compBank && compIban ? `<br><strong>Resmî Proje Hesabı:</strong> ${compBank} - IBAN: <span style="font-family:monospace;color:#ffffff;font-weight:bold;">${compIban}</span>` : ''}
    </div>
  </div>

  <!-- 3. TECHNICAL SPECIFICATIONS -->
  <div class="avoid-break">
    <h3 style="color:#0f172a;font-size:12px;text-transform:uppercase;border-bottom:2px solid #cbd5e1;padding-bottom:4px;margin-bottom:8px;">
      2. Yapısal Teknik Şartname ve Standartlar
    </h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;font-size:10.5px;">
      <div class="spec-card">
        <strong>🏗️ Taşıyıcı Karkas & Temel:</strong> TBDY-2018 standartlarında C30/35 & C35/40 Hazır Beton, B420C Nervürlü Çelik Donatı, Radye Temel ve Çift Kat Membranlı Su Yalıtımı.
      </div>
      <div class="spec-card">
        <strong>🌡️ Dış Cephe & Yalıtım:</strong> Minimum 5 cm Karbonlu EPS Mantolama, Dekoratif Sıva, Nefes Alan Silikon Esaslı Boya ve Çatı Su/Isı Yalıtımı.
      </div>
      <div class="spec-card">
        <strong>🪟 Doğrama & Cam:</strong> 70-76 mm Seri PVC Doğramalar, Argon Gazlı Isıcam Konfor Sinerji Çift Cam ve Monoblok Kilitli 1. Sınıf Çelik Daire Kapısı.
      </div>
      <div class="spec-card">
        <strong>⚙️ Tesisat & Donanım:</strong> Bireysel Doğalgaz Kombili Kalorifer Altyapısı, Tam Otomatik Paslanmaz Kabinli Asansör, 1. Sınıf Seramik ve Parke Kaplamaları.
      </div>
    </div>
  </div>

  <!-- 4. ALLOCATION TABLE -->
  <div>
    <h3 style="color:#0f172a;font-size:12px;text-transform:uppercase;border-bottom:2px solid #cbd5e1;padding-bottom:4px;margin-bottom:8px;">
      3. Hak Sahipleri Bağımsız Bölüm Dağılım ve Borçlandırma Tablosu
    </h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:10.5px;">
      <thead>
        ${table1Header}
      </thead>
      <tbody>${flatRows}</tbody>
      <tfoot>
        <tr style="background:#f8fafc;font-weight:bold;border-top:2px solid #cbd5e1;">
          <td colspan="${showLandSerefiye ? 5 : 3}" style="padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">TOPLAM (${res.flatResults.length} Bağımsız Bölüm):</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:right;font-family:monospace;">${res.flatResults.reduce((s, f) => s + f.grossPay, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          ${isContractorShareModel ? `
          <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:right;font-family:monospace;color:#047857;">-${res.flatResults.reduce((s, f) => s + f.grossPay, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:right;font-family:monospace;background:#f0fdf4;color:#047857;">0 TL</td>
          ` : `
          <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:right;font-family:monospace;color:#4f46e5;">-${res.flatResults.reduce((s, f) => s + f.downPayment, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:right;font-family:monospace;color:#047857;">-${res.flatResults.reduce((s, f) => s + f.usedCredit, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:right;font-family:monospace;background:#e0e7ff;color:#1e3a8a;">${res.flatResults.reduce((s, f) => s + f.netRemainingDebt, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
          `}
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- 5. PAYMENT SCHEDULE -->
  ${paymentScheduleBlock}

  <!-- 6. GUARANTEES -->
  <div class="avoid-break" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin-bottom:16px;font-size:10.5px;color:#334155;line-height:1.5;">
    <strong>⚖️ Kurumsal Taahhütler ve Garanti Hükümleri:</strong>
    <p style="margin:2px 0 0 0;">Firmamız (TBK m. 478) uyarınca taşıyıcı betonarme karkas sistemde 20 Yıl, ince işçilik ve çatı/cephe imalatlarında 5 Yıl, mekanik/asansör donatılarında 2 Yıl resmi garanti taahhüt eder. Yapım süresince tüm süreç T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı onaylı Yapı Denetim Kuruluşu denetiminde yürütülür.</p>
  </div>

  <!-- 6.2. ADDITIONAL CLAUSES / EK MADDELER -->
  ${params.additionalOfferClauses && params.additionalOfferClauses.length > 0 ? `
  <div class="avoid-break" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin-bottom:16px;font-size:10.5px;color:#334155;line-height:1.5;">
    <strong>✍️ Teklif Ek Maddeleri ve Özel Hükümler:</strong>
    <ol style="margin:4px 0 0 0; padding-left:16px; list-style-type: decimal;">
      ${params.additionalOfferClauses.map(clause => `
        <li style="margin-bottom:3px; padding-left:2px;">${clause}</li>
      `).join('')}
    </ol>
  </div>
  ` : ''}

  <!-- 6.5. ATTACHMENTS / EKLER -->
  ${uploadedImages && uploadedImages.length > 0 ? `
  <div class="avoid-break" style="margin-top:20px;border-top:2px solid #0f172a;padding-top:14px;">
    <h3 style="color:#0f172a;font-size:12px;text-transform:uppercase;border-bottom:2px solid #cbd5e1;padding-bottom:4px;margin-bottom:12px;text-align:left;font-weight:bold;">
      5. TEKLİF EKLERİ VE GÖRSELLERİ
    </h3>
    <div style="display:grid;grid-template-columns:${uploadedImages.length === 1 ? '1fr' : '1fr 1fr'};gap:16px;margin-bottom:16px;">
      ${uploadedImages.map((img, idx) => `
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px;background:#ffffff;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.05);page-break-inside:avoid;break-inside:avoid;">
          <img src="${img.url}" alt="${img.caption || 'Ek Belge'}" style="max-height:280px;max-width:100%;object-fit:contain;border-radius:4px;margin-bottom:8px;" />
          <div style="font-size:10.5px;font-weight:bold;color:#334155;margin-top:4px;">Ek ${idx + 1}: ${img.caption || 'Belge / Görsel'}</div>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <!-- 7. SIGNATURES -->
  <div class="avoid-break" style="margin-top:20px;border-top:2px solid #0f172a;padding-top:14px;font-size:11px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
      <!-- CLIENTS SIGNATURE -->
      <div style="text-align:center;border-right:1px dashed #cbd5e1;padding-right:16px;">
        <p style="font-weight:bold;margin:0 0 2px 0;color:#0f172a;font-size:11.5px;">ARSA SAHİPLERİ / BİNA YÖNETİMİ</p>
        <p style="color:#64748b;font-size:10px;margin:0 0 30px 0;">Kat Malikleri Kurulu / Temsilci Heyeti</p>
        <div style="height:35px;border-bottom:1px solid #94a3b8;margin:0 20px 6px 20px;"></div>
        <p style="color:#64748b;font-size:9.5px;margin:0;">(İmza / Tarih / TC)</p>
      </div>

      <!-- CONTRACTOR SIGNATURE -->
      <div style="text-align:center;padding-left:16px;position:relative;">
        <p style="font-weight:bold;margin:0 0 2px 0;color:#0f172a;font-size:11.5px;">YÜKLENİCİ FİRMA KAŞE / İMZA</p>
        <p style="font-size:9.5px;color:#475569;margin:0 0 6px 0;font-weight:600;">${compLegal}</p>
        
        <div style="display:flex;justify-content:center;gap:16px;align-items:center;min-height:50px;position:relative;">
          ${showStamp && compStamp ? `
            <img src="${compStamp}" alt="Kaşe/İmza" style="max-height:55px;object-fit:contain;position:absolute;z-index:2;opacity:0.9;" />
          ` : ''}
          ${showFirstAuth ? `
          <div style="position:relative;z-index:1;">
            <p style="font-weight:bold;color:#0f172a;font-size:11px;margin:0;">${compAuth}</p>
            <p style="font-size:9.5px;color:#4338ca;margin:0;font-weight:600;">${compAuthTitle}</p>
            ${showFirstAuthChamber && compAuthChamber ? `<p style="font-size:8.5px;color:#64748b;margin:0;font-family:monospace;">${compAuthChamber}</p>` : ''}
          </div>
          ` : ''}
          ${showSecondAuth && compAuth2 ? `
          <div style="position:relative;z-index:1;border-left:1px solid #e2e8f0;padding-left:12px;">
            <p style="font-weight:bold;color:#0f172a;font-size:11px;margin:0;">${compAuth2}</p>
            <p style="font-size:9.5px;color:#065f46;margin:0;font-weight:600;">${compAuthTitle2}</p>
            ${showSecondAuthChamber && compAuthChamber2 ? `<p style="font-size:8.5px;color:#64748b;margin:0;font-family:monospace;">${compAuthChamber2}</p>` : ''}
          </div>
          ` : ''}
        </div>
        <div style="height:15px;border-bottom:1px solid #94a3b8;margin:4px 20px 6px 20px;"></div>
        <p style="color:#64748b;font-size:9.5px;margin:0;">Tarih: ${proposalDate}</p>
      </div>
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
  const opts = companyProfile?.printOptions || {};
  const showLogo = opts.showLogo !== false;
  const showLegal = opts.showLegalName !== false;
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
  const compAddress = companyProfile?.address || 'Kocamustafapaşa Mah. Orgeneral Abdurrahman Nafiz Gürman Cad. No:42 Fatih / İSTANBUL';
  const compPhone = companyProfile?.phone || '+90 (212) 585 10 20';
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

  const contractTitle =
    params.projectModel === 'contractorShare'
      ? 'ARSA PAYI KARŞILIĞI İNŞAAT VE GAYRİMENKUL SATIŞ VAADİ SÖZLEŞMESİ'
      : params.transformationStatus !== 'none'
      ? '6306 SAYILI KANUN KAPSAMINDA KENTSEL DÖNÜŞÜM BİNA YAPIM SÖZLEŞMESİ'
      : 'ÖZ KAYNAKLI BİNA YAPIM VE TAAHHÜT SÖZLEŞMESİ';

  const flatRows = res.flatResults
    .map(
      (f, idx) => {
        const landShareStr = f.landShareNumerator && params.totalLandShareDenominator
          ? `${f.landShareNumerator}/${params.totalLandShareDenominator}`
          : `1/${res.flatResults.length}`;
        return `
    <tr>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:bold;">Daire ${f.id}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;">${f.name}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;font-family:monospace;">${f.tc}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;font-family:monospace;text-align:center;">${landShareStr}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;">${f.area} m²</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:right;font-family:monospace;">${f.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:right;font-family:monospace;">${f.downPayment.toLocaleString('tr-TR')} TL</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:bold;text-align:right;font-family:monospace;">${f.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;font-size:9px;color:#94a3b8;">........................</td>
    </tr>`;
      }
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${contractTitle}</title>
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
        content: "${compName} - Yapım Sözleşmesi";
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
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    h2 { color: #0f172a; text-align: center; font-size: 15px; margin-bottom: 4px; font-weight: bold; }
    h3 { color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 3px; margin-top: 16px; font-size: 12px; text-transform: uppercase; }
    h4 { color: #1e293b; margin-top: 10px; margin-bottom: 3px; font-size: 11px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px; }
    th { background: #0f172a; color: white; padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; }
    .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
    .no-print { display: none !important; }
  </style>
</head>
<body>
  <div class="avoid-break" style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #0f172a;padding-bottom:10px;margin-bottom:14px;">
    <div style="display:flex;align-items:center;gap:12px;">
      ${compLogo ? `<img src="${compLogo}" alt="${compName}" style="max-height:50px;max-width:130px;object-fit:contain;" />` : ''}
      <div>
        <h2 style="margin:0;color:#0f172a;text-align:left;font-size:14px;">${contractTitle}</h2>
        <p style="margin:2px 0 0 0;font-size:10px;color:#64748b;">Düzenleme Tarihi: ${new Date().toLocaleDateString('tr-TR')} | Belge No: ${compName}-2026/SÖZ-01</p>
      </div>
    </div>
  </div>

  <div class="avoid-break">
    <h3>BÖLÜM I: TARAFLAR VE PROJE TANIMI</h3>
    <h4>MADDE 1: TARAFLAR</h4>
    <p><strong>1. YÜKLENİCİ (MÜTEAHHİT):</strong> ${showLegal ? compLegal : compName} ${showAddr && compAddress ? `(${compAddress})` : ''} ${showTax && compTax ? `[Vergi Dairesi/No: ${compTax}]` : ''}<br>
    ${showFirstAuth || showSecondAuth ? `Yetkili Temsilci: ${showFirstAuth ? `${compAuth} (${compAuthTitle}${showFirstAuthChamber && compAuthChamber ? ` - ${compAuthChamber}` : ''})` : ''}${showFirstAuth && showSecondAuth && compAuth2 ? ' / ' : ''}${showSecondAuth && compAuth2 ? `${compAuth2} (${compAuthTitle2}${showSecondAuthChamber && compAuthChamber2 ? ` - ${compAuthChamber2}` : ''})` : ''}<br>` : ''}
    ${showBank && compBank && compIban ? `Resmî Hesap: ${compBank} - IBAN: ${compIban}<br>` : ''}
    <strong>2. İŞ SAHİBİ / KAT MALİKLERİ:</strong> Ek-1 Hak Sahipleri Listesinde isim, TC kimlik ve arsa payı bilgileri bulunan taşınmaz malikleri.</p>
    
    <h4>MADDE 2: SÖZLEŞME KONUSU VE GAYRİMENKUL</h4>
    <p>Tapuda <strong>${params.projectAddress || 'Belirtilen Adres'}</strong> adresinde kayıtlı taşınmazın yıkılarak yerine taban oturumu <strong>${res.baseArea} m²</strong>, toplam brüt inşaat alanı <strong>${res.totalArea} m²</strong> olan ve toplam <strong>${res.flatCount} adet bağımsız bölümden</strong> oluşan yeni binanın yapılmasıdır.</p>
  </div>

  <div class="avoid-break">
    <h3>BÖLÜM II: MALİ HÜKÜMLER VE HAKEDİŞ MUDAT DÜZENLEMELERİ</h3>
    <h4>MADDE 3: PROJE İMALAT BEDELİ</h4>
    <p>Birim imalat fiyatı <strong>${res.grossCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²</strong>, toplam proje yapım bedeli <strong>${res.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</strong> olarak belirlenmiştir.</p>
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
      <li>5. Hakediş (%${params.stage5Pay}): İskân belgesinin alınıp bağımsız bölümlerin fiilen anahtar teslimi.</li>
    </ul>
    `}
    <h4>MADDE 5: HAKEDİŞ VE YAPI DENETİM VİZELERİ</h4>
    <p>Hakediş ödemelerinin serbest bırakılmasında T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı onaylı Yapı Denetim Firması hakediş seviye raporları ile ilgili belediyenin betonarme ve donatı vize tutanakları esas alınır.</p>
  </div>

  <div class="avoid-break">
    <h3>BÖLÜM III: SÜRE, İŞ GÜVENLİĞİ, GECİKME TAZMİNATI VE GARANTİLER (TBK m. 478)</h3>
    <h4>MADDE 6: TESLİM SÜRESİ VE GECİKME TAZMİNATI (CEZAİ ŞART)</h4>
    <p>Proje ve inşaat teslim süresi, inşaat ruhsatının alındığı tarihten itibaren <strong>${res.finalMonths} Ay</strong> olarak kararlaştırılmıştır. İnşaatın taahhüt edilen sürede teslim edilmemesi halinde Yüklenici, gecikilen her ay için her bir bağımsız bölüm başına bölgedeki emsal rayiç kira bedeli tutarında gecikme tazminatını Arsa Sahiplerine ödemeyi kabul ve taahhüt eder.</p>

    <h4>MADDE 7: MÜCBİR SEBEPLER VE SÜRE UZATIMI</h4>
    <p>Deprem, sel, salgın gibi doğal afetler ile T.C. Belediyeleri ve resmî kurumlar nezdinde yürütülen ruhsat/imar planı askı ve itiraz süreçleri, imar planı değişiklikleri ve idari durdurmalar mücbir sebep kabul edilir. Mücbir sebep hallerinde geçen süreler inşaat teslim süresine ilave edilir.</p>

    <h4>MADDE 8: YAPI GARANTİLERİ VE TEKNİK SORUMLULUK (TBK m. 478)</h4>
    <p>Taşıyıcı betonarme sistemde <strong>20 Yıl</strong>, ince işçilik ve su/ısı yalıtımında <strong>5 Yıl</strong>, mekanik/asansör ve elektronik donatılarda <strong>2 Yıl</strong> garanti geçerlidir.</p>

    <h4>MADDE 9: KAT İRTİFAKI VE MÜLKİYET DEVRİ</h4>
    <p>Kat irtifakı ve kat mülkiyeti kurulması işlemleri Yüklenici tarafından takip edilir, mevzuat harç ve masrafları taraflarca anlaşılan usulde karşılanır.</p>

    <h4>MADDE 10: UYUŞMAZLIKLARIN ÇÖZÜMÜ</h4>
    <p>İşbu sözleşmeden doğacak tüm uyuşmazlıklarda <strong>${params.projectAddress?.split('/')[0] || 'Yerel'} Mahkemeleri ve İcra Daireleri</strong> yetkilidir.</p>
    ${params.customContractNotes ? `
    <h4>MADDE 11: İLAVE ÖZEL ŞARTLAR VE HÜKÜMLER</h4>
    <p style="white-space:pre-wrap;background:#f8fafc;padding:8px 10px;border-left:3px solid #0f172a;font-family:monospace;font-size:10px;color:#1e293b;">${params.customContractNotes}</p>
    ` : ''}
  </div>

  <div class="avoid-break">
    <h3>BÖLÜM IV: EK-1 HAK SAHİPLERİ VE BAĞIMSIZ BÖLÜM DAĞILIMI</h3>
    <table>
      <thead>
        <tr>
          <th>Daire No</th>
          <th>Hak Sahibi</th>
          <th>T.C. No</th>
          <th>Arsa Payı</th>
          <th>Alan</th>
          <th>Toplam Bedel</th>
          <th>Peşinat</th>
          <th>Kalan Borç</th>
          <th style="text-align:center;">İmza</th>
        </tr>
      </thead>
      <tbody>${flatRows}</tbody>
    </table>
  </div>

  <div class="avoid-break" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px;border-top:2px solid #0f172a;padding-top:14px;font-size:11px;">
    <div style="text-align:center;border-right:1px dashed #cbd5e1;padding-right:16px;">
      <p style="font-weight:bold;margin-bottom:30px;color:#0f172a;">ARSA SAHİPLERİ / KAT MALİKLERİ</p>
      <div style="height:35px;border-bottom:1px solid #94a3b8;margin:0 20px 6px 20px;"></div>
      <p style="color:#64748b;font-size:9.5px;">Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
    </div>
    <div style="text-align:center;padding-left:16px;position:relative;">
      <p style="font-weight:bold;margin:0 0 4px 0;color:#0f172a;">YÜKLENİCİ FİRMA KAŞE / İMZA</p>
      <p style="font-size:9.5px;color:#475569;margin:0 0 6px 0;">${showLegal ? compLegal : compName}</p>
      
      <div style="display:flex;justify-content:center;gap:16px;align-items:center;min-height:50px;position:relative;">
        ${showStamp && compStamp ? `
          <img src="${compStamp}" alt="Kaşe/İmza" style="max-height:50px;object-fit:contain;position:absolute;z-index:2;opacity:0.9;" />
        ` : ''}
        ${showFirstAuth ? `
        <div style="position:relative;z-index:1;">
          <p style="font-weight:bold;color:#0f172a;font-size:11px;margin:0;">${compAuth}</p>
          <p style="font-size:9.5px;color:#4338ca;margin:0;">${compAuthTitle}</p>
          ${showFirstAuthChamber && compAuthChamber ? `<p style="font-size:8.5px;color:#64748b;margin:0;font-family:monospace;">${compAuthChamber}</p>` : ''}
        </div>
        ` : ''}
        ${showSecondAuth && compAuth2 ? `
        <div style="position:relative;z-index:1;border-left:1px solid #e2e8f0;padding-left:12px;">
          <p style="font-weight:bold;color:#0f172a;font-size:11px;margin:0;">${compAuth2}</p>
          <p style="font-size:9.5px;color:#065f46;margin:0;">${compAuthTitle2}</p>
          ${showSecondAuthChamber && compAuthChamber2 ? `<p style="font-size:8.5px;color:#64748b;margin:0;font-family:monospace;">${compAuthChamber2}</p>` : ''}
        </div>
        ` : ''}
      </div>
      <div style="height:15px;border-bottom:1px solid #94a3b8;margin:4px 20px 6px 20px;"></div>
      <p style="color:#64748b;font-size:9.5px;">Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
    </div>
  </div>
</body>
</html>`;
}

// CAD SVG helpers for report exports
export function generateFrontViewSvgString(
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

export function generateGroundFloorPlanSvgString(
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

export function generateNormalFloorPlanSvgString(
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
