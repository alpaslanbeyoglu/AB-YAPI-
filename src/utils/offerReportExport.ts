import { ProjectParams, CalculationResult, CompanyProfile } from '../types';
import { getAcOptionById } from './acOptions';
import { computeDualOffer } from './dualOfferUtils';
import { getCompletedProjectsText } from './completedProjectsData';

export function generateOfferHtml(
  params: ProjectParams,
  res: CalculationResult,
  showDrawings: boolean = false,
  companyProfile?: CompanyProfile,
  uploadedImages?: Array<{ url: string; caption?: string }>
): string {
  const isDualOffer = params.offerPresentationMode === 'dual';
  const dualData = isDualOffer ? computeDualOffer(params) : null;
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
  const shopUnits = res.flatResults.filter(f => f.flatType === 'shop' || f.flatType === 'basement_shop');
  const normalUnits = res.flatResults.filter(f => f.flatType !== 'shop' && f.flatType !== 'basement_shop' && f.flatType !== 'mansard');
  const mansardUnits = res.flatResults.filter(f => f.flatType === 'mansard');

  const avgShopArea = shopUnits.length > 0 ? Math.round(shopUnits.reduce((acc, f) => acc + f.area, 0) / shopUnits.length) : 0;
  const avgNormalArea = normalUnits.length > 0 ? Math.round(normalUnits.reduce((acc, f) => acc + f.area, 0) / normalUnits.length) : Math.round(res.totalArea / (res.flatCount || 1));
  const avgMansardArea = mansardUnits.length > 0 ? Math.round(mansardUnits.reduce((acc, f) => acc + f.area, 0) / mansardUnits.length) : 0;

  const flatUnitPriceVal = params.manualFlatUnitPrice || res.grossCostPerSqM;
  const shopUnitPriceVal = params.manualShopUnitPrice || res.grossCostPerSqM;

  let introPageHtml = '';
  if (params.showIntroPresentation) {
    const introText = params.introExplanation || "1960'lardan bugüne uzanan köklü inşaat tecrübemiz ve üçüncü nesil dinamizmimizle, kentsel dönüşüm projelerimizde hem güvenliği hem de modern konfor standartlarını en üst düzeyde buluşturuyoruz. Sektördeki yarım asrı aşan birikimimizle tasarladığımız bu projede, bütçe dostu akılcı maliyet çözümleri sunarken, en güncel deprem yönetmeliklerine ve güvenli standartlarına tavizsiz şekilde uyuyoruz. Depreme tam dayanıklı mühendislik anlayışımızı, yaşamı kolaylaştıran modern mimari detaylarla harmanlayarak sizler için uzun ömürlü, değerli ve huzurlu yaşam alanları inşa ediyoruz.";
    introPageHtml = `
  <!-- SUNUM VE GİRİŞ SAYFASI -->
  <div style="page-break-after: always; break-after: page; padding: 24px; border: 1px solid #e2e8f0; border-radius: 20px; margin-bottom: 30px; background: #faf5ff; position: relative; min-height: 260mm; box-sizing: border-box;">
    <!-- Logo ve Başlık -->
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #6b21a8; padding-bottom:15px; margin-bottom:30px;">
      <div style="display:flex; align-items:center; gap:12px;">
        ${showLogo && compLogo ? `<img src="${compLogo}" alt="${compName}" style="max-height:50px; max-width:130px; object-fit:contain;" />` : ''}
        <div>
          <span style="font-size:16px; font-weight:900; color:#6b21a8; letter-spacing:-0.2px; font-family:sans-serif;">${compName}</span>
          <div style="font-size:9px; color:#5b21b6; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; font-family:sans-serif; margin-top:2px;">PROJE ÖNSÖZÜ VE DEĞER SUNUMU</div>
        </div>
      </div>
      <span style="font-size:9.5px; font-weight:bold; padding:4px 10px; background:#f3e8ff; border:1px solid #d8b4fe; color:#6b21a8; border-radius:20px; font-family:sans-serif;">Özel Sunum</span>
    </div>

    <!-- Büyük Görsel / Kapak Havası -->
    <div style="text-align:center; padding:40px 20px; margin-bottom:35px; background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); border-radius:16px; color:#ffffff; box-shadow:0 4px 12px rgba(124, 58, 237, 0.15);">
      <div style="font-size:24px; font-weight:bold; letter-spacing:-0.5px; margin-bottom:10px; font-family:sans-serif;">Geleceği Güvenle İnşa Ediyoruz</div>
      <div style="font-size:12px; opacity:0.9; max-width:500px; margin:0 auto; line-height:1.5; font-family:sans-serif;">${params.projectAddress || 'Belirtilen Adres'} Kentsel Dönüşüm ve Yaşam Projesi Değer Teklifi</div>
    </div>

    <!-- Giriş Metni (Neleri Neden Yaptık?) -->
    <div style="background:#ffffff; border:1px solid #ddd6fe; padding:24px; border-radius:16px; box-shadow:0 2px 8px rgba(0,0,0,0.02); margin-bottom:30px;">
      <h2 style="font-size:14px; font-weight:bold; color:#4c1d95; margin-top:0; margin-bottom:12px; border-bottom:1px solid #f3e8ff; padding-bottom:8px; text-transform:uppercase; font-family:sans-serif;">Neleri, Neden ve Nasıl Yapıyoruz?</h2>
      <p style="font-size:11px; color:#334155; line-height:1.7; margin:0; text-align:justify; white-space:pre-wrap; font-family:sans-serif;">${introText}</p>
    </div>

    <!-- Temel Mühendislik Değerleri -->
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:30px;">
      <div style="background:#ffffff; border:1px solid #e2e8f0; padding:15px; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.01);">
        <strong style="color:#6b21a8; font-size:11.5px; display:block; margin-bottom:5px; font-family:sans-serif;">🛡️ Deprem Güvenliği Odaklılık</strong>
        <span style="font-size:10px; color:#475569; line-height:1.5; display:block; font-family:sans-serif;">Tüm taşıyıcı sistemlerimizi güncel deprem yönetmeliklerinin de ötesinde, en yüksek sınıf hazır beton ve sismik çelik donatı standartlarıyla tasarlıyoruz.</span>
      </div>
      <div style="background:#ffffff; border:1px solid #e2e8f0; padding:15px; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.01);">
        <strong style="color:#6b21a8; font-size:11.5px; display:block; margin-bottom:5px; font-family:sans-serif;">🌱 Sürdürülebilirlik & Enerji Verimliliği</strong>
        <span style="font-size:10px; color:#475569; line-height:1.5; display:block; font-family:sans-serif;">Yerden ısıtma, yüksek yalıtımlı cephe sistemleri ve akıllı su tasarrufu çözümleriyle çevre dostu, işletme maliyeti düşük binalar üretiyoruz.</span>
      </div>
    </div>

    <!-- Alt Bilgi -->
    <div style="position:absolute; bottom:25px; left:24px; right:24px; display:flex; justify-content:space-between; font-size:9px; color:#94a3b8; border-top:1px solid #f1f5f9; padding-top:15px; font-family:sans-serif;">
      <span>${compLegal}</span>
      <span>Sayfa I</span>
    </div>
  </div>
    `;
  }

  let historyPageHtml = '';
  if (params.showCompanyHistory) {
    const historyText = params.companyHistoryText || "1960’lı yıllarda kurucumuz Emin Ahmetbeyoğlu’nun vizyonuyla temelleri atılan inşaat serüvenimiz, yarım asrı aşan tecrübesiyle sektördeki köklü yürüyüşünü sürdürmektedir. İkinci kuşak temsilcilerimiz Faruk Ahmetbeyoğlu ve aile büyüklerimizin öncülüğünde; Laleli, Fatih, Kocamustafapaşa, Silivrikapı, Samatya ve Yedikule gibi İstanbul’un tarihi suriçi bölgelerinde onlarca nitelikli projeye imza atarak şehrin dokusuna kalıcı değerler kattık.\n\n2010’lu yıllarda piyasa dinamiklerindeki değişimleri doğru okuyarak kurumsal yatırımlarımızı sağlık ve tarım gibi stratejik sektörlere de yönlendirdik ve vizyonumuzu daha da genişlettik. Bugün ise edindiğimiz bu çok yönlü kurumsal tecrübe ve artan sektörel talepler doğrultusunda, üçüncü nesil olarak inşaat markamızı çağın gereksinimlerine uygun, dinamik ve yenilikçi bir altyapıyla yeniden yapılandırıyoruz.\n\nGeçmişten aldığımız güven mirasını, geleceğin teknolojileriyle harmanlayarak kaldığımız yerden, daha güçlü bir şekilde üretmeye devam ediyoruz.";
    const completedProjects = params.companyCompletedProjects || getCompletedProjectsText();
    const mission = params.companyMission || "Köklerimizden aldığımız tecrübeyi modern mühendislik çözümleriyle birleştirerek; insan odaklı, yapısal güvenliği merkeze alan ve yaşam standartlarını daima yukarı taşıyan projeler üretmektir.";
    const vision = params.companyVision || "Geleneksel inşaat kültürümüzü modern mimari trendlerle zenginleştirerek, müşterilerimiz için hem yüksek kaliteli hem de bütçe dostu, ulaşılabilir ve akılcı yaşam alanları inşa eden öncü bir marka olmaktır.";

    const projectList = completedProjects.split('\n').filter(p => p.trim().length > 0).map(p => `
      <li style="font-size:8.5px; color:#334155; margin-bottom:0; line-height:1.35; list-style-type:none; padding-left:12px; position:relative; font-family:sans-serif; box-sizing:border-box;">
        <span style="position:absolute; left:0; color:#6b21a8; font-weight:bold;">•</span>
        ${p.replace(/^\d+[\.\)]\s*/, '')}
      </li>
    `).join('');

    historyPageHtml = `
  <!-- FİRMA GEÇMİŞİ VE KURUMSAL PROFİL SAYFASI -->
  <div style="page-break-after: always; break-after: page; padding: 24px; border: 1px solid #e2e8f0; border-radius: 20px; margin-bottom: 30px; background: #ffffff; position: relative; min-height: 260mm; box-sizing: border-box;">
    <!-- Logo ve Başlık -->
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #6b21a8; padding-bottom:15px; margin-bottom:25px;">
      <div style="display:flex; align-items:center; gap:12px;">
        ${showLogo && compLogo ? `<img src="${compLogo}" alt="${compName}" style="max-height:50px; max-width:130px; object-fit:contain;" />` : ''}
        <div>
          <span style="font-size:16px; font-weight:900; color:#6b21a8; letter-spacing:-0.2px; font-family:sans-serif;">${compName}</span>
          <div style="font-size:9px; color:#5b21b6; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; font-family:sans-serif; margin-top:2px;">KURUMSAL ŞİRKET PROFİLİ & GEÇMİŞİ</div>
        </div>
      </div>
      <span style="font-size:9.5px; font-weight:bold; padding:4px 10px; background:#f3e8ff; border:1px solid #d8b4fe; color:#6b21a8; border-radius:20px; font-family:sans-serif;">Kurumsal Profil</span>
    </div>

    <!-- İki Sütunlu Düzen -->
    <div style="display:grid; grid-template-columns: 1.15fr 0.85fr; gap:24px; box-sizing: border-box;">
      <!-- Sol Sütun: Şirket Tarihçesi ve Referans Projeler -->
      <div style="display:flex; flex-direction:column; gap:20px;">
        <!-- Şirket Geçmişi -->
        <div style="background:#faf5ff; border:1px solid #e9d5ff; padding:20px; border-radius:14px; box-shadow:0 1px 3px rgba(0,0,0,0.01);">
          <h3 style="font-size:12px; font-weight:bold; color:#5b21b6; margin-top:0; margin-bottom:10px; text-transform:uppercase; border-bottom:1px solid #d8b4fe; padding-bottom:6px; font-family:sans-serif;">🏢 Biz Kimiz? Şirket Tarihçemiz</h3>
          <p style="font-size:11px; color:#334155; line-height:1.65; margin:0; text-align:justify; white-space:pre-wrap; font-family:sans-serif;">${historyText}</p>
        </div>

        <!-- Tamamlanan Referans Projeler -->
        <div style="background:#ffffff; border:1px solid #e2e8f0; padding:20px; border-radius:14px; box-shadow:0 1px 3px rgba(0,0,0,0.01);">
          <h3 style="font-size:12px; font-weight:bold; color:#1e1b4b; margin-top:0; margin-bottom:10px; text-transform:uppercase; border-bottom:1px solid #e2e8f0; padding-bottom:6px; font-family:sans-serif;">🏆 Tamamlanan Referans Projeler</h3>
          <ul style="margin:0; padding:0; display:grid; grid-template-columns:1fr 1fr; column-gap:15px; row-gap:4px; list-style-type:none;">
            ${projectList || '<li style="font-size:9px; color:#94a3b8; font-family:sans-serif;">Henüz eklenmedi.</li>'}
          </ul>
        </div>
      </div>

      <!-- Sağ Sütun: Misyon & Vizyon -->
      <div style="display:flex; flex-direction:column; gap:20px;">
        <!-- Misyonumuz -->
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-left:4px solid #6b21a8; padding:20px; border-radius:14px; box-shadow:0 1px 3px rgba(0,0,0,0.01);">
          <h3 style="font-size:12px; font-weight:bold; color:#5b21b6; margin-top:0; margin-bottom:8px; text-transform:uppercase; font-family:sans-serif;">🎯 Misyonumuz</h3>
          <p style="font-size:10px; color:#475569; line-height:1.6; margin:0; text-align:justify; white-space:pre-wrap; font-family:sans-serif;">${mission}</p>
        </div>

        <!-- Vizyonumuz -->
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-left:4px solid #4f46e5; padding:20px; border-radius:14px; box-shadow:0 1px 3px rgba(0,0,0,0.01);">
          <h3 style="font-size:12px; font-weight:bold; color:#4f46e5; margin-top:0; margin-bottom:8px; text-transform:uppercase; font-family:sans-serif;">🚀 Vizyonumuz</h3>
          <p style="font-size:10px; color:#475569; line-height:1.6; margin:0; text-align:justify; white-space:pre-wrap; font-family:sans-serif;">${vision}</p>
        </div>

        <!-- Mühendislik Taahhüt -->
        <div style="background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border:1px solid #cbd5e1; padding:15px; border-radius:12px; text-align:center;">
          <span style="font-size:24px; display:block; margin-bottom:5px;">⭐</span>
          <strong style="color:#0f172a; font-size:11px; display:block; margin-bottom:4px; font-family:sans-serif;">Yüksek Mühendislik Güvencesi</strong>
          <span style="font-size:9px; color:#475569; line-height:1.4; display:block; font-family:sans-serif;">Projelerimiz, İMO üyesi yetkin statikerler ve uzman mimarlar gözetiminde, 1. Sınıf malzemelerle hayata geçirilir.</span>
        </div>
      </div>
    </div>

    <!-- Alt Bilgi -->
    <div style="position:absolute; bottom:25px; left:24px; right:24px; display:flex; justify-content:space-between; font-size:9px; color:#94a3b8; border-top:1px solid #f1f5f9; padding-top:15px; font-family:sans-serif;">
      <span>${compLegal}</span>
      <span>Sayfa II</span>
    </div>
  </div>
    `;
  }

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
  ${introPageHtml}
  ${historyPageHtml}
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

    <!-- İNOVATİF TEKNOLOJİ VE KONFOR SEÇENEKLERİ (TEK TEKLİF İÇİN) -->
    ${!isDualOffer ? (() => {
      const currentAc = getAcOptionById(params.acType || '18k_btu');
      return `
    <div style="margin-top:10px;background:linear-gradient(135deg, #fdf8ff 0%, #f4f5ff 100%);border:1px solid #e9d5ff;border-radius:12px;padding:12px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
      <div style="font-weight:900;font-size:11px;color:#581c87;margin-bottom:8px;text-transform:uppercase;display:flex;align-items:center;gap:4px;">
        ✨ İnovatif Teknoloji ve Konfor Donanımları (Seçenekler)
      </div>
      <div class="grid-3" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;">
        <!-- Yerden Isitma -->
        <div class="card" style="background:#ffffff;border:1px solid #f3e8ff;padding:8px 10px;border-radius:8px;display:flex;flex-direction:column;justify-content:space-between;min-height:90px;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:9.5px;font-weight:bold;color:#1e1b4b;">🔥 Yerden Isıtma (Sulu)</span>
              <span style="font-size:8px;font-weight:900;text-transform:uppercase;padding:1px 5px;border-radius:10px;background:${params.hasUnderfloorHeating ? '#ecfdf5' : '#f1f5f9'};color:${params.hasUnderfloorHeating ? '#065f46' : '#475569'};border:1px solid ${params.hasUnderfloorHeating ? '#a7f3d0' : '#cbd5e1'}">${params.hasUnderfloorHeating ? 'Dahil' : 'Opsiyonel'}</span>
            </div>
            <p style="font-size:8.5px;color:#4b5563;margin:0 0 6px 0;line-height:1.35;">
              Radyatörlere kıyasla %15-20 yakıt tasarrufu, homojen ısı yayılımı, toz engelleme ve odalarda dekoratif genişlik sunan lüks sulu sistem.
            </p>
          </div>
          <div style="font-size:8.5px;color:#6b7280;border-top:1px solid #f3f4f6;padding-top:4px;display:flex;justify-content:space-between;align-items:center;">
            <span>Yatırım Maliyeti:</span>
            <span style="font-weight:bold;color:#6b21a8;">${res.underfloorHeatingCost ? res.underfloorHeatingCost.toLocaleString('tr-TR') : '0'} ₺</span>
          </div>
        </div>

        <!-- Su Aritma -->
        <div class="card" style="background:#ffffff;border:1px solid #f3e8ff;padding:8px 10px;border-radius:8px;display:flex;flex-direction:column;justify-content:space-between;min-height:90px;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:9.5px;font-weight:bold;color:#1e1b4b;">💧 Merkezi Su Arıtma</span>
              <span style="font-size:8px;font-weight:900;text-transform:uppercase;padding:1px 5px;border-radius:10px;background:${params.hasWaterFiltration ? '#ecfdf5' : '#f1f5f9'};color:${params.hasWaterFiltration ? '#065f46' : '#475569'};border:1px solid ${params.hasWaterFiltration ? '#a7f3d0' : '#cbd5e1'}">${params.hasWaterFiltration ? 'Dahil' : 'Opsiyonel'}</span>
            </div>
            <p style="font-size:8.5px;color:#4b5563;margin:0 0 6px 0;line-height:1.35;">
              Bina şebeke ana girişine monte edilerek tüm dairelerde klor, kireç, ağır metalleri giderir, tesisat ve beyaz eşyaları kireçten korur.
            </p>
          </div>
          <div style="font-size:8.5px;color:#6b7280;border-top:1px solid #f3f4f6;padding-top:4px;display:flex;justify-content:space-between;align-items:center;">
            <span>Yatırım Maliyeti:</span>
            <span style="font-weight:bold;color:#6b21a8;">${res.waterFiltrationCost ? res.waterFiltrationCost.toLocaleString('tr-TR') : '0'} ₺</span>
          </div>
        </div>

        <!-- Klima & Iklimlendirme -->
        <div class="card" style="background:#ffffff;border:1px solid #f3e8ff;padding:8px 10px;border-radius:8px;display:flex;flex-direction:column;justify-content:space-between;min-height:90px;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:9.5px;font-weight:bold;color:#1e1b4b;">❄️ A++ Inverter Klima</span>
              <span style="font-size:8px;font-weight:900;text-transform:uppercase;padding:1px 5px;border-radius:10px;background:${params.hasAcOption ? '#ecfdf5' : '#f1f5f9'};color:${params.hasAcOption ? '#065f46' : '#475569'};border:1px solid ${params.hasAcOption ? '#a7f3d0' : '#cbd5e1'}">${params.hasAcOption ? 'Dahil' : 'Opsiyonel'}</span>
            </div>
            <p style="font-size:8.5px;color:#4b5563;margin:0 0 4px 0;line-height:1.35;">
              <strong>${currentAc.shortTitle}</strong> (${currentAc.btu}) - ${currentAc.targetArea} salonlar için A++ inverter enerji tasarruflu iklimlendirme.
            </p>
          </div>
          <div style="font-size:8.5px;color:#6b7280;border-top:1px solid #f3f4f6;padding-top:4px;display:flex;justify-content:space-between;align-items:center;">
            <span>Yatırım Maliyeti:</span>
            <span style="font-weight:bold;color:#6b21a8;">${res.acCostTotal ? res.acCostTotal.toLocaleString('tr-TR') : '0'} ₺</span>
          </div>
        </div>

        <!-- Termostatik Duş Bataryası -->
        <div class="card" style="background:#ffffff;border:1px solid #f3e8ff;padding:8px 10px;border-radius:8px;display:flex;flex-direction:column;justify-content:space-between;min-height:90px;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:9.5px;font-weight:bold;color:#1e1b4b;">🚿 Termostatik Duş Bataryası (Konutlar)</span>
              <span style="font-size:8px;font-weight:900;text-transform:uppercase;padding:1px 5px;border-radius:10px;background:${params.hasThermostaticShowerMixer ? '#ecfdf5' : '#f1f5f9'};color:${params.hasThermostaticShowerMixer ? '#065f46' : '#475569'};border:1px solid ${params.hasThermostaticShowerMixer ? '#a7f3d0' : '#cbd5e1'}">${params.hasThermostaticShowerMixer ? 'Dahil' : 'Opsiyonel'}</span>
            </div>
            <p style="font-size:8.5px;color:#4b5563;margin:0 0 4px 0;line-height:1.35;">
              38°C emniyet kilitli, haşlanma önleyici ve %30 su tasarruflu termostatik batarya. Yalnızca konut dairelerine uygulanır (Dükkanlar hariç).
            </p>
          </div>
          <div style="font-size:8.5px;color:#6b7280;border-top:1px solid #f3f4f6;padding-top:4px;display:flex;justify-content:space-between;align-items:center;">
            <span>Yatırım Maliyeti:</span>
            <span style="font-weight:bold;color:#6b21a8;">${res.thermostaticMixerCost ? res.thermostaticMixerCost.toLocaleString('tr-TR') : '0'} ₺</span>
          </div>
        </div>

        <!-- Lineer Duş Süzgeci -->
        <div class="card" style="background:#ffffff;border:1px solid #f3e8ff;padding:8px 10px;border-radius:8px;display:flex;flex-direction:column;justify-content:space-between;min-height:90px;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:9.5px;font-weight:bold;color:#1e1b4b;">✨ Lineer Duş Süzgeci (Konutlar)</span>
              <span style="font-size:8px;font-weight:900;text-transform:uppercase;padding:1px 5px;border-radius:10px;background:${params.hasLinearShowerDrain ? '#ecfdf5' : '#f1f5f9'};color:${params.hasLinearShowerDrain ? '#065f46' : '#475569'};border:1px solid ${params.hasLinearShowerDrain ? '#a7f3d0' : '#cbd5e1'}">${params.hasLinearShowerDrain ? 'Dahil' : 'Opsiyonel'}</span>
            </div>
            <p style="font-size:8.5px;color:#4b5563;margin:0 0 4px 0;line-height:1.35;">
              304 paslanmaz çelik ızgaralı, çift hazneli koku çekvalfli hemzemin duş kanalı. Yalnızca konut dairelerine uygulanır.
            </p>
          </div>
          <div style="font-size:8.5px;color:#6b7280;border-top:1px solid #f3f4f6;padding-top:4px;display:flex;justify-content:space-between;align-items:center;">
            <span>Yatırım Maliyeti:</span>
            <span style="font-weight:bold;color:#6b21a8;">${res.linearDrainCost ? res.linearDrainCost.toLocaleString('tr-TR') : '0'} ₺</span>
          </div>
        </div>

        <!-- Nem Sensörlü Sessiz Banyo Fanı -->
        <div class="card" style="background:#ffffff;border:1px solid #f3e8ff;padding:8px 10px;border-radius:8px;display:flex;flex-direction:column;justify-content:space-between;min-height:90px;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:9.5px;font-weight:bold;color:#1e1b4b;">🌀 Nem Sensörlü Banyo Fanı (Konutlar)</span>
              <span style="font-size:8px;font-weight:900;text-transform:uppercase;padding:1px 5px;border-radius:10px;background:${params.hasBathroomHumidityFan ? '#ecfdf5' : '#f1f5f9'};color:${params.hasBathroomHumidityFan ? '#065f46' : '#475569'};border:1px solid ${params.hasBathroomHumidityFan ? '#a7f3d0' : '#cbd5e1'}">${params.hasBathroomHumidityFan ? 'Dahil' : 'Opsiyonel'}</span>
            </div>
            <p style="font-size:8.5px;color:#4b5563;margin:0 0 4px 0;line-height:1.35;">
              Banyo konfor dokunuşu: Otomatik higrostat sensörlü, 25 dB fısıltı sessizliğinde buhar ve küf önleyici fan.
            </p>
          </div>
          <div style="font-size:8.5px;color:#6b7280;border-top:1px solid #f3f4f6;padding-top:4px;display:flex;justify-content:space-between;align-items:center;">
            <span>Yatırım Maliyeti:</span>
            <span style="font-weight:bold;color:#6b21a8;">${res.bathroomHumidityFanCost ? res.bathroomHumidityFanCost.toLocaleString('tr-TR') : '0'} ₺</span>
          </div>
        </div>

        <!-- Fotoselli Mutfak Bataryası -->
        <div class="card" style="background:#ffffff;border:1px solid #f3e8ff;padding:8px 10px;border-radius:8px;display:flex;flex-direction:column;justify-content:space-between;min-height:90px;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:9.5px;font-weight:bold;color:#1e1b4b;">🫧 Fotoselli Mutfak & Banyo Bataryaları</span>
              <span style="font-size:8px;font-weight:900;text-transform:uppercase;padding:1px 5px;border-radius:10px;background:${params.hasTouchlessKitchenFaucet ? '#ecfdf5' : '#f1f5f9'};color:${params.hasTouchlessKitchenFaucet ? '#065f46' : '#475569'};border:1px solid ${params.hasTouchlessKitchenFaucet ? '#a7f3d0' : '#cbd5e1'}">${params.hasTouchlessKitchenFaucet ? 'Dahil' : 'Opsiyonel'}</span>
            </div>
            <p style="font-size:8.5px;color:#4b5563;margin:0 0 4px 0;line-height:1.35;">
              Mutfak eviyesi ve banyo lavabosunda temassız kızılötesi sensör ile üstün hijyen, kireç/su lekesiz temiz yüzeyler ve %40 yüksek su tasarrufu.
            </p>
          </div>
          <div style="font-size:8.5px;color:#6b7280;border-top:1px solid #f3f4f6;padding-top:4px;display:flex;justify-content:space-between;align-items:center;">
            <span>Yatırım Maliyeti:</span>
            <span style="font-weight:bold;color:#6b21a8;">${res.touchlessKitchenFaucetCost ? res.touchlessKitchenFaucetCost.toLocaleString('tr-TR') : '0'} ₺</span>
          </div>
        </div>

        <!-- Akıllı Daire Giriş Kapısı Kilidi -->
        <div class="card" style="background:#ffffff;border:1px solid #f3e8ff;padding:8px 10px;border-radius:8px;display:flex;flex-direction:column;justify-content:space-between;min-height:90px;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:9.5px;font-weight:bold;color:#1e1b4b;">🔑 Motorlu & Biyometrik Akıllı Daire Kapısı Kilidi</span>
              <span style="font-size:8px;font-weight:900;text-transform:uppercase;padding:1px 5px;border-radius:10px;background:${params.hasSmartDoorLock ? '#ecfdf5' : '#f1f5f9'};color:${params.hasSmartDoorLock ? '#065f46' : '#475569'};border:1px solid ${params.hasSmartDoorLock ? '#a7f3d0' : '#cbd5e1'}">${params.hasSmartDoorLock ? 'Dahil' : 'Opsiyonel'}</span>
            </div>
            <p style="font-size:8.5px;color:#4b5563;margin:0 0 4px 0;line-height:1.35;">
              DESİ / Kale / Smart marka parmak izli okuyucu, dokunmatik şifreli tuş takımı ve mobil uygulama (Bluetooth/Wi-Fi) entegreli motorlu çelik kapı kilidi.
            </p>
          </div>
          <div style="font-size:8.5px;color:#6b7280;border-top:1px solid #f3f4f6;padding-top:4px;display:flex;justify-content:space-between;align-items:center;">
            <span>Yatırım Maliyeti:</span>
            <span style="font-weight:bold;color:#6b21a8;">${res.smartDoorLockCost ? res.smartDoorLockCost.toLocaleString('tr-TR') : '0'} ₺</span>
          </div>
        </div>
      </div>
    </div>
    `;
    })() : ''}

    <!-- ÇİFT TEKLİF & SEÇENEK KARŞILAŞTIRMA MATRİSİ (DUAL OFFER İÇİN) -->
    ${isDualOffer && dualData ? `
    <div style="margin-top:14px;background:#ffffff;border:2px solid #818cf8;border-radius:12px;padding:12px;box-shadow:0 2px 6px rgba(99,102,241,0.08);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1.5px solid #e0e7ff;padding-bottom:6px;">
        <div style="font-weight:900;font-size:11.5px;color:#312e81;text-transform:uppercase;display:flex;align-items:center;gap:6px;">
          📑 İkili Teklif & Paket Karşılaştırma Matrisi (Seçenekli Sunum)
        </div>
        <span style="font-size:8.5px;font-weight:bold;background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:12px;">2 Alternatifli Resmi Teklif</span>
      </div>

      <!-- SIDE BY SIDE SUMMARY CARDS -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <!-- BASE OFFER BOX -->
        <div style="background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:10px;padding:10px;display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:11px;font-weight:800;color:#1e293b;">1. SEÇENEK: ${dualData.baseTitle}</span>
              <span style="font-size:8px;font-weight:bold;background:#e2e8f0;color:#334155;padding:1px 6px;border-radius:10px;">Temel Standart</span>
            </div>
            <p style="font-size:8.5px;color:#64748b;margin:0 0 8px 0;line-height:1.35;">
              Yasal mevzuat ve şartnamelere uygun, ekonomik ve güvenilir temel yapım paketi.
            </p>
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;padding:8px;margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;font-size:9px;color:#475569;margin-bottom:4px;">
                <span>Toplam İmalat Bedeli:</span>
                <strong style="color:#0f172a;font-family:monospace;">${dualData.customerBaseGrandTotal.toLocaleString('tr-TR')} ₺</strong>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:9px;color:#475569;margin-bottom:4px;">
                <span>Daire Başı Ortalama Pay:</span>
                <strong style="color:#0f172a;font-family:monospace;">${dualData.customerBaseFlatShare.toLocaleString('tr-TR')} ₺</strong>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:9.5px;color:#0f172a;font-weight:bold;border-top:1px dashed #cbd5e1;padding-top:4px;">
                <span>Hibe/Kredi Sonrası Net:</span>
                <span style="color:#16a34a;font-family:monospace;">${dualData.customerBaseNetDebtPerFlat.toLocaleString('tr-TR')} ₺</span>
              </div>
            </div>
          </div>
        </div>

        <!-- PLUS OFFER BOX -->
        <div style="background:linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);border:2px solid #8b5cf6;border-radius:10px;padding:10px;display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:11px;font-weight:900;color:#5b21b6;">2. SEÇENEK: ✨ ${dualData.plusTitle}</span>
              <span style="font-size:8px;font-weight:900;background:#7c3aed;color:#ffffff;padding:1px 6px;border-radius:10px;">Prestij & Konfor</span>
            </div>
            <p style="font-size:8.5px;color:#6d28d9;margin:0 0 8px 0;line-height:1.35;">
              Yerden ısıtma, su arıtma, A++ klima, termostatik batarya, lineer süzgeç, sessiz banyo fanı ile mutfak eviyesi ve banyo lavabosunda temassız fotoselli batarya paketi.
            </p>
            <div style="background:#ffffff;border:1px solid #ddd6fe;border-radius:6px;padding:8px;margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;font-size:9px;color:#475569;margin-bottom:4px;">
                <span>Toplam İmalat Bedeli:</span>
                <strong style="color:#5b21b6;font-family:monospace;">${dualData.customerPlusGrandTotal.toLocaleString('tr-TR')} ₺</strong>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:9px;color:#475569;margin-bottom:4px;">
                <span>Daire Başı Ortalama Pay:</span>
                <strong style="color:#5b21b6;font-family:monospace;">${dualData.customerPlusFlatShare.toLocaleString('tr-TR')} ₺</strong>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:9.5px;color:#5b21b6;font-weight:bold;border-top:1px dashed #ddd6fe;padding-top:4px;">
                <span>Hibe/Kredi Sonrası Net:</span>
                <span style="color:#7c3aed;font-family:monospace;">${dualData.customerPlusNetDebtPerFlat.toLocaleString('tr-TR')} ₺</span>
              </div>
            </div>
          </div>
          <div style="font-size:8.5px;color:#6d28d9;font-weight:bold;text-align:right;">
            Daire Başı Yatırım Farkı: +${dualData.customerFlatDelta.toLocaleString('tr-TR')} ₺
          </div>
        </div>
      </div>

      <!-- DETAILED FEATURE COMPARISON TABLE -->
      <table style="width:100%;border-collapse:collapse;font-size:8.5px;background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
        <thead>
          <tr style="background:#f1f5f9;color:#1e293b;border-bottom:1.5px solid #cbd5e1;text-align:left;">
            <th style="padding:5px 8px;width:24%;">Teknik Donanım & Sistem</th>
            <th style="padding:5px 8px;width:34%;color:#475569;">1. Seçenek: ${dualData.baseTitle}</th>
            <th style="padding:5px 8px;width:42%;color:#6d28d9;background:#f5f3ff;">2. Seçenek: ${dualData.plusTitle}</th>
          </tr>
        </thead>
        <tbody>
          ${dualData.features.map((f, idx) => `
          <tr style="border-bottom:1px solid #e2e8f0;background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding:5px 8px;font-weight:bold;color:#0f172a;">
              ${f.icon} ${f.name}
            </td>
            <td style="padding:5px 8px;color:#475569;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${f.baseIncluded ? '#94a3b8' : '#e2e8f0'};margin-right:4px;"></span>
              ${f.baseSpec}
            </td>
            <td style="padding:5px 8px;color:#4c1d95;font-weight:600;background:${idx % 2 === 0 ? '#faf5ff' : '#f3e8ff'};">
              <span style="display:inline-block;color:#7c3aed;font-weight:900;margin-right:4px;">✓</span>
              ${f.plusSpec}
            </td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
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
          Belediyeden inşaat ruhsatı onayından itibaren <strong>${res.finalMonths} Ay</strong> içerisinde iskânı alınmış, kat mülkiyeti kurulmuş ve bağımsız bölümleri anahtar teslim olarak hak sahiplerine devredilecektir.
        </p>
      </div>
      <div class="card-muted">
        <div style="font-weight:bold;font-size:11px;color:#0f172a;margin-bottom:3px;">💳 Ödeme Prensibi</div>
        <p style="font-size:9.5px;color:#475569;margin:0;line-height:1.45;">
          Ödemeler inşaatın fiziki ilerleme seviyesine göre hakediş usulü veya sözleşmede belirlenen eşit vadeli taksit planı ile güvenli ve şeffaf şekilde gerçekleştirilir.
        </p>
      </div>
    </div>
    <div style="margin-top:8px; background:#faf5ff; border:1px solid #e9d5ff; padding:8px 10px; border-radius:6px;">
      <div style="font-weight:bold; font-size:10px; color:#5b21b6; margin-bottom:2px;">🛡️ Enflasyon ve Vade Farkı Güvencesi (TEFE/TÜFE Farkı Yoktur)</div>
      <p style="font-size:8.5px; color:#5b21b6; margin:0; line-height:1.4;">
        Firmamız kentsel dönüşüm sürecinde kat maliklerinden herhangi bir TEFE/TÜFE, enflasyon farkı veya vade farkı talep etmemektedir. Anlaşma anında belirlenen ödeme takvimi ve rakamlar, inşaat süresi boyunca tamamen sabit kalır ve kesinlikle artırılmaz.
      </p>
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

  <!-- 6. KURUMSAL TAAHHÜTLER VE HUKUKI KORUMA PROTOKOLÜ -->
  <div class="avoid-break" style="margin-bottom:14px;">
    <div class="section-header">6. Kurumsal Taahhütler ve Hukuki Koruma Protokolü</div>
    <div class="grid-3">
      <div class="card-muted" style="border-left:3px solid #4f46e5; margin-bottom:8px;">
        <div style="font-weight:bold;font-size:10px;color:#1e1b4b;margin-bottom:2px;">🏛️ Yasal Garanti (TBK m. 478)</div>
        <p style="font-size:8.5px;color:#475569;margin:0;line-height:1.35;">
          Taşıyıcı karkas sistemde <strong>20 Yıl</strong>, ince işçilik ve cephede <strong>5 Yıl</strong>, mekanik/asansör sistemlerinde <strong>2 Yıl</strong> resmi garanti geçerlidir.
        </p>
      </div>
      <div class="card-muted" style="border-left:3px solid #059669; margin-bottom:8px;">
        <div style="font-weight:bold;font-size:10px;color:#064e3b;margin-bottom:2px;">🏠 Kesin Teslim & Kira Desteği</div>
        <p style="font-size:8.5px;color:#475569;margin:0;line-height:1.35;">
          Süresi aşılırsa gecikilen her ay için hak sahiplerine emsal kira bedeli tutarında gecikme tazminatı nakden ödenir.
        </p>
      </div>
      <div class="card-muted" style="border-left:3px solid #0284c7; margin-bottom:8px;">
        <div style="font-weight:bold;font-size:10px;color:#082f49;margin-bottom:2px;">📜 Noter Onaylı Sözleşme</div>
        <p style="font-size:8.5px;color:#475569;margin:0;line-height:1.35;">
          Teklif onaylandığında taraflar arasında ilgili Noterlik nezdinde resmî Düzenleme Şeklinde İnşaat Sözleşmesi imzalanacaktır.
        </p>
      </div>
      <div class="card-muted" style="border-left:3px solid #7c3aed; margin-bottom:8px;">
        <div style="font-weight:bold;font-size:10px;color:#5b21b6;margin-bottom:2px;">👥 Mirasçı Bağlayıcılığı</div>
        <p style="font-size:8.5px;color:#475569;margin:0;line-height:1.35;">
          Maliklerin vefatı, devri veya kısıtlanması durumunda mirasçılar veya yeni malikler sözleşmeye aynen tabidir, süreç durdurulamaz.
        </p>
      </div>
      <div class="card-muted" style="border-left:3px solid #b45309; margin-bottom:8px;">
        <div style="font-weight:bold;font-size:10px;color:#78350f;margin-bottom:2px;">⚖️ Yasal Salt Çoğunluk Kararı</div>
        <p style="font-size:8.5px;color:#475569;margin:0;line-height:1.35;">
          Teklif ve sözleşme yürürlüğü, kentsel dönüşüm mevzuatına göre arsa payı oranında yasal salt çoğunluğun (%50+1) onayına tabidir.
        </p>
      </div>
      <div class="card-muted" style="border-left:3px solid #db2777; margin-bottom:8px;">
        <div style="font-weight:bold;font-size:10px;color:#831843;margin-bottom:2px;">📈 Enflasyon & Maliyet Kilidi</div>
        <p style="font-size:8.5px;color:#475569;margin:0;line-height:1.35;">
          Ödeme planına uyulduğu sürece artışlar maliklere yansıtılamaz. Malik kusurlu gecikmelerinde ise maliyetler revize edilir.
        </p>
      </div>
    </div>
    <div style="margin-top:4px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:8.5px;color:#64748b;line-height:1.4;">
      <strong>📌 Mücbir Sebep & Resmi Süreç Bilgilendirmesi:</strong> Belirtilen teslim süresi, belediye yapı ruhsatının kesinleştiği tarihten itibaren başlar. Doğal afetler, resmî kurum (Belediye, Bakanlık vb.) imar onay veya askı süreçleri ve altyapı sağlayıcı kurumların (İSKİ, İGDAŞ, BEDAŞ vb.) resmî onay süreçlerindeki gecikmeler yasal olarak süreye ilave edilir.
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
        <div style="color:#64748b;font-size:9.5px;margin:2px 0 6px 0;">Kat Malikleri Kurulu / Temsilci Heyeti</div>
        
        ${isDualOffer && dualData ? `
        <div style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:5px 8px;margin:0 auto 10px auto;font-size:8.5px;text-align:left;display:inline-block;">
          <strong style="color:#1e293b;display:block;margin-bottom:3px;text-align:center;">Muvafakat Edilen Teklif Paketi:</strong>
          <div style="display:flex;gap:12px;justify-content:center;">
            <label style="display:flex;align-items:center;gap:3px;color:#334155;cursor:pointer;">
              <span style="display:inline-block;width:10px;height:10px;border:1.5px solid #64748b;border-radius:2px;"></span>
              1. Seçenek (${dualData.baseTitle})
            </label>
            <label style="display:flex;align-items:center;gap:3px;color:#6d28d9;font-weight:bold;cursor:pointer;">
              <span style="display:inline-block;width:10px;height:10px;border:1.5px solid #7c3aed;border-radius:2px;"></span>
              2. Seçenek (${dualData.plusTitle})
            </label>
          </div>
        </div>
        ` : ''}

        <div style="height:28px;border-bottom:1px solid #94a3b8;margin:0 24px 6px 24px;"></div>
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
