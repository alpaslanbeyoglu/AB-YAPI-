import React, { useState, useRef } from 'react';
import { Cloud, CheckCircle2, AlertCircle, Sparkles, ShieldCheck, FileText, FileSpreadsheet, Layers, Compass, Building, Check, Copy, Search, X } from 'lucide-react';
import { ProjectParams, CalculationResult, AppTheme } from '../types';
import { saveReportDocumentToDrive } from '../services/drive';
import { exportElementToPdf, printHtmlContent } from '../utils/pdfExport';
import { PrintAndPdfButtons } from './PrintAndPdfButtons';
import { Logo } from './Logo';
import { getRoofInfo, getRoomTypeDescription } from '../utils/roofUtils';
import { useCompanyProfile } from '../context/CompanyProfileContext';

interface SpecificationTabProps {
  params: ProjectParams;
  results: CalculationResult;
  hasToken: boolean;
  onOpenDrivePanel: () => void;
  theme?: AppTheme;
}

export const SpecificationTab: React.FC<SpecificationTabProps> = ({
  params,
  results,
  hasToken,
  onOpenDrivePanel,
  theme = 'light',
}) => {
  const { profile } = useCompanyProfile();
  const [activeTab, setActiveTab] = useState<'common' | 'project'>('common');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedStatus, setCopiedStatus] = useState(false);
  const specContainerRef = useRef<HTMLDivElement>(null);

  const isGray = theme === 'gray';

  // Boundary checks for mathematical metrics to prevent negative or NaN values
  const safeBaseArea = Math.max(0, results.baseArea || 0);
  const safeTotalArea = Math.max(0, results.totalArea || 0);
  const safeFlatCount = Math.max(0, results.flatCount || 0);
  const safeShopCount = Math.max(0, params.shopCount || 0);
  const safeConcrete = Math.max(0, results.concreteM3 || 0);
  const safeSteel = Math.max(0, results.steelTon || 0);
  const safeMonths = Math.max(1, results.finalMonths || 12);
  const safeFloorCount = Math.max(1, params.floorCount || 1);
  const safeBasementCount = Math.max(0, params.basementCount ?? 1);
  const safeAddress = params.projectAddress?.trim() || 'İstanbul (Adres Belirtilmemiş)';

  // Authorizations print toggles
  const showFirstAuth = profile.printOptions?.showFirstAuthorized !== false && !!profile.authorizedPerson;
  const showFirstAuthChamber = profile.printOptions?.showFirstAuthorizedChamber !== false && !!(profile.authorizedChamberNo || profile.authorizedChamber);
  const showSecondAuth = profile.printOptions?.showSecondAuthorized === true && !!profile.authorizedPerson2;
  const showSecondAuthChamber = profile.printOptions?.showSecondAuthorizedChamber !== false && !!(profile.authorizedChamberNo2 || profile.authorizedChamber2);

  const companyLegalName = profile.legalName || profile.companyName || 'AB YAPI MÜTEAHHİTLİK';

  const specTitle = "KENTSEL DÖNÜŞÜM ORTAK TEKNİK ŞARTNAMESİ";
  const specSubtitle = `${profile.companyName} Proje Çeşitlilikleri, Malzeme ve Uygulama Esasları`;

  const projectTitle = "PROJEYE ÖZEL KENTSEL DÖNÜŞÜM YAPIM ŞARTNAMESİ";
  const projectSubtitle = `Adres: ${safeAddress} | Özel Mühendislik ve Malzeme Listesi`;

  const currentRoof = getRoofInfo(params.roofType);
  const currentRoom = getRoomTypeDescription(params.roomType);
  const totalUnitsDisplay = params.hasGroundFloorShop 
    ? `${safeFlatCount + (safeShopCount || 1)} Adet, ${safeFlatCount} Daire, ${safeShopCount || 1} Dükkan`
    : `${safeFlatCount} Adet, ${safeFlatCount} Daire, 0 Dükkan`;

  const handleExportPdf = async () => {
    if (!specContainerRef.current) return;
    const isCommon = activeTab === 'common';
    const safeAddr = safeAddress.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').slice(0, 25);
    const safeName = profile.companyName.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_');
    const fileName = isCommon
      ? `${safeName}_Ortak_Teknik_Sartname_${new Date().toISOString().slice(0, 10)}.pdf`
      : `${safeName}_Projeye_Ozel_Teknik_Sartname_${safeAddr}_${new Date().toISOString().slice(0, 10)}.pdf`;
    await exportElementToPdf(specContainerRef.current, fileName);
  };

  const handlePrint = () => {
    const html = generateSpecHtml();
    const safeName = profile.companyName.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_');
    const docTitle = activeTab === 'common' 
      ? `${safeName}_Ortak_Teknik_Sartname` 
      : `${safeName}_Projeye_Ozel_Sartname_${safeAddress}`;
    printHtmlContent(html, docTitle);
  };

  const handleCopyToClipboard = () => {
    if (!specContainerRef.current) return;
    const textContent = specContainerRef.current.innerText;
    navigator.clipboard.writeText(textContent);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2500);
  };

  // Helper to highlight search keywords dynamically
  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-amber-200 text-amber-900 rounded font-semibold px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const generateSpecHtml = () => {
    const compLogo = profile.logoBase64 || '';
    const compName = profile.companyName || 'AB YAPI';
    const compLegal = companyLegalName;

    if (activeTab === 'common') {
      return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${specTitle}</title>
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
        content: "${compName} - Ortak Teknik Şartname";
        font-size: 9px;
        color: #64748b;
        font-family: sans-serif;
      }
    }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 0; color: #0f172a; max-width: 960px; margin: 0 auto; line-height: 1.5; font-size: 11px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    h2 { color: #0f172a; text-align: left; font-size: 15px; margin: 0; font-weight: bold; }
    .section-title { font-size: 12px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 3px; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .subsection-title { font-size: 11px; font-weight: 700; color: #1e293b; border-left: 3px solid #f59e0b; padding-left: 8px; margin-top: 14px; margin-bottom: 8px; }
    ul { padding-left: 18px; margin: 4px 0 8px 0; }
    li { margin-bottom: 4px; }
    .flexibility-box { background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 10px; margin: 8px 0; font-size: 10.5px; color: #78350f; }
    .flexibility-box strong { color: #92400e; }
    .footer-table { width: 100%; margin-top: 30px; border-collapse: collapse; }
    .footer-table td { width: 50%; text-align: center; vertical-align: top; font-size: 11px; }
    .footer-meta { text-align: center; font-size: 10px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
  </style>
</head>
<body>
  <div class="avoid-break" style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #0f172a;padding-bottom:10px;margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:12px;">
      ${compLogo ? `<img src="${compLogo}" alt="${compName}" style="max-height:50px;max-width:130px;object-fit:contain;" />` : ''}
      <div>
        <h2>${specTitle}</h2>
        <p style="margin:2px 0 0 0;font-size:10px;color:#64748b;font-weight:600;">${compLegal}</p>
        <p style="margin:2px 0 0 0;font-size:10px;color:#64748b;">Tarih: ${new Date().toLocaleDateString('tr-TR')} | Belge No: ${compName}-2026/TŞ-01 | Kentsel Dönüşüm Ortak Standartları</p>
      </div>
    </div>
  </div>

  <div class="section-title">01. KABA YAPI, ZEMİN VE STATİK KRİTERLERİ</div>
  
  <div class="subsection-title">Zemin Etüdü ve Statik Projelendirme</div>
  <ul>
    <li>Zemin etütleri ruhsat aşamasında yetkili zemin mekaniği firmalarına yaptırılarak ilgili belediyeye onaylattırılacaktır.</li>
    <li>Statik hesaplamalar; zemin emniyet gerilmeleri ve yürürlükteki Deprem Yönetmeliği esas alınarak hazırlanacaktır.</li>
  </ul>
  <div class="flexibility-box">
    <strong>Proje Çeşitliliği / Esneklik:</strong> Parsel oturum alanına ve zemin sınıfına (Z1-Z5) bağlı olarak temel tipi (Radye Jeneral, İyileştirmeli veya projeye göre gerekli görüldüğünde kuyu temel sistemleri) statik gerekler doğrultusunda farklılık gösterebilir.
  </div>

  <div class="subsection-title">Betonarme Taşıyıcı Sistem ve Malzemeler</div>
  <ul>
    <li>Binanın taşıyıcı sistemi betonarme karkas olup, en son deprem yönetmeliğine uygun projelendirilecektir.</li>
    <li>Hazır beton sınıfı asgari C30 standardında temin edilecek, demir donatı olarak S420 nervürlü TSE belgeli sismik çelik kullanılacaktır. Beton döküm test sonuçları paydaşlara sunulacaktır.</li>
  </ul>
  <div class="flexibility-box">
    <strong>Proje Çeşitliliği / Esneklik:</strong> Bodrum kat perdeleri ve bina yüksekliğine/statik hesaplara göre beton sınıfları (C30, C35 vb.) mühendislik hesapları baz alınarak projeye özel optimize edilir.
  </div>

  <div class="subsection-title">Su Yalıtımı ve Drenaj Sistemleri</div>
  <ul>
    <li>Temel ve toprak altı bodrum perdelerinde bina ömrünü korumak amacıyla su yalıtımı (bohçalama veya uygun perde yalıtımları) uygulanacaktır.</li>
    <li>Perde duvarlarda yalıtımı korumak amacıyla yüksek dansite XPS levhalar ve drenaj levhaları konumlandırılacaktır.</li>
  </ul>

  <div class="section-title">02. DUVARLAR VE ÇATI İMALAT ÇEŞİTLİLİKLERİ</div>
  
  <div class="subsection-title">Bölücü Duvarlar ve Ses / Isı Yalıtımı</div>
  <ul>
    <li>Dış duvarlar ve ıslak hacim duvarları projesine uygun tuğla veya yalıtımlı blok elemanlarla örülecektir.</li>
  </ul>
  <div class="flexibility-box">
    <strong>Proje Çeşitliliği / Esneklik:</strong> Duvar kalınlıkları (8.5 cm, 13.5 cm) ve iki daire arası ses/ısı yalıtım detayları (çift duvar uygulaması veya akustik tuğla/taş yünü yalıtım katmanları); mimari akslara ve akustik yönetmelik gereksinimlerine göre her projede farklılık gösterebilir. Kesin bir tek tip duvar detayı dayatılmaz.
  </div>

  <div class="subsection-title">Çatı Konstrüksiyonu ve Yalıtım Detayları</div>
  <ul>
    <li>Çatı sistemleri onaylı mimari projeye uygun olarak çelik veya ahşap karkas konstrüksiyon şeklinde imal edilecektir.</li>
    <li>Çatı kaplamasında OSB, su yalıtım membranı ve shingle / kenet sac alternatifleri projenin mimari çizgisine göre uygulanacaktır. Isı yalıtımı için taş yünü veya poliüretan köpük sistemleri tercih edilecektir.</li>
  </ul>

  <div class="section-title">03. DIŞ CEPHE VE DOĞRAMA ÇEŞİTLİLİKLERİ</div>
  
  <div class="subsection-title">Dış Cephe Mantolama ve Tasarım</div>
  <ul>
    <li>Bina dış cepheleri ısı yalıtım projesi (BEP) değerlerini sağlayacak kalınlık ve yoğunlukta mantolama (EPS veya Taşyünü) ile kaplanacaktır.</li>
    <li>Belediye onaylı dış cephe renk ve kompozit/dekoratif kaplama alternatifleri uygulanarak üst segment dış cephe boyaları tercih edilecektir.</li>
  </ul>

  <div class="subsection-title">Doğramalar ve Cam Sistemleri</div>
  <ul>
    <li>Pencereler ve balkon kapıları projenin mimari rengine uyumlu üst segment PVC doğrama (Egepen, Fıratpen, Pimapen veya muadili) olacaktır.</li>
    <li>Camlar konfor ısıcam (çift cam kombinasyonları) olarak uygulanacak, Fransız balkon önlerinde projeye uygun lamine/temperli cam korkuluklar yer alacaktır.</li>
  </ul>

  <div class="section-title">04. İÇ MEKÂN, KAPLAMA VE DONATI SEÇENEKLERİ</div>
  
  <div class="subsection-title">Zeminler ve İç Yüzeyler</div>
  <ul>
    <li>Salon ve odalarda 1. sınıf laminat parke (AGT, Çamsan, Terraclick veya muadili), antre ve mutfakta 1. sınıf granit/seramik kaplama kullanılacaktır.</li>
    <li>Duvarlar alçı sıva üzeri su bazlı silinebilir saten boya ile tamamlanacak, ıslak hacimlerde 1. sınıf seramik kaplama tercih edilecektir.</li>
  </ul>
  <div class="flexibility-box">
    <strong>Proje Çeşitliliği / Esneklik:</strong> Daire sahiplerine sunulacak renk, ebat (örn. 60x60 veya 60x120 seramik) ve model alternatifleri; projenin konseptine ve o dönemsel üretici kataloglarına göre çeşitlilik arz edebilir.
  </div>

  <div class="subsection-title">Mutfak, Banyo ve İç Kapılar</div>
  <ul>
    <li>Mutfak dolapları gövde MDF, kapaklar Highgloss veya Lake; tezgahlar ise 1. sınıf granit/kuvars esaslı malzemeden yapılacaktır.</li>
    <li>Banyolarda gömme rezervuar, TSE belgeli armatürler, duşakabin ve suya dayanıklı banyo dolabı uygulanacaktır. İç kapılar PVC kaplamalı veya Lake ahşap kapı olacaktır.</li>
  </ul>

  <div class="section-title">05. MEKANİK, ELEKTRİK VE ASANSÖR STANDARTLARI</div>
  
  <div class="subsection-title">Asansör Sistemlerinde Esneklik</div>
  <ul>
    <li>Binaya tesis edilecek asansörler; ilgili belediye imar mevzuatına, Asansör Yönetmeliği'ne ve TSE standartlarına tam uygun, yeşil etiketli olacaktır.</li>
  </ul>
  <div class="flexibility-box">
    <strong>Proje Çeşitliliği / Esneklik:</strong> Asansörün kişi kapasitesi, taşıma tonajı (örn. 630 kg / 8 kişilik veya parsele/binaya özel mimari kuyu boyutlarına göre 4-6 kişilik alternatifler) ve kabin tasarımı; her binanın arsa oturumuna, kat sayısına ve ruhsat projesine göre değişkenlik gösterir. Sabit bir kişi sayısı dayatılmaz.
  </div>

  <div class="subsection-title">Isıtma, Elektrik ve Güvenlik Altyapısı</div>
  <ul>
    <li>Her bağımsız bölümde bağımsız kombili doğalgaz ısıtma altyapısı, radyatörler ve klima tesisat altyapısı bulunacaktır.</li>
    <li>Tüm elektrik tesisatında TSE belgeli kablolar, kaçak akım röleleri, merkezi uydu ve fiber internet altyapısı kurulacaktır.</li>
    <li>Audio marka görüntülü diafon sistemi ve bina çevresi güvenlik kamera altyapısı tesis edilecektir.</li>
  </ul>

  <div class="section-title">06. YIKIM VE UYGULAMA ESASLARI</div>
  
  <div class="subsection-title">Yıkım ve Proje Yönetimi</div>
  <ul>
    <li>Eski binaların yıkımı, yasal ruhsatlar alındıktan sonra iş güvenliği kurallarına tam uygun olarak ${profile.companyName} güvencesiyle gerçekleştirilecektir. Hafriyat ve yıkım maliyetleri yükleniciye aittir.</li>
    <li>Tüm imalatlar onaylı mimari, statik ve tesisat projeleri ile yapı denetim denetiminde yürütülecektir. Yüklenici, kalite standardından ödün vermemek şartıyla eşdeğer muadil malzeme uygulama hakkına sahiptir.</li>
  </ul>

  <table class="footer-table">
    <tr>
      <td>
        <strong>KAT MALİKLERİ ONAYI</strong><br><br>
        <div style="height: 30px;"></div>
        İmza: .......................................<br>
        <span style="font-size:10px; color:#64748b;">Tarih: ${new Date().toLocaleDateString('tr-TR')}</span>
      </td>
      <td>
        <strong>${companyLegalName.toUpperCase()} ONAYI</strong><br>
        ${profile.stampUrl ? `<img src="${profile.stampUrl}" style="max-height: 48px; margin: 4px auto; display:block;" />` : ''}
        <div style="font-size: 11px; color: #1e293b; margin-top: 4px;">
          ${showFirstAuth ? `<strong>${profile.authorizedPerson}</strong> (${profile.authorizedTitle})<br>` : ''}
          ${showSecondAuth && profile.authorizedPerson2 ? `<strong>${profile.authorizedPerson2}</strong> (${profile.authorizedTitle2 || ''})<br>` : ''}
        </div>
        Kaşe / İmza: .......................................<br>
        <span style="font-size:10px; color:#64748b;">Tarih: ${new Date().toLocaleDateString('tr-TR')}</span>
      </td>
    </tr>
  </table>

  <div class="footer-meta">
    ${profile.companyName} - Güvene Yükselen Yapılar | Ortak Teknik Şartname
  </div>
</body>
</html>`;
    } else {
      // Dynamic Project-Specific HTML
      const isShop = params.hasGroundFloorShop 
        ? `Var (${safeShopCount} Adet Zemin Kat Ticari Dükkan)` 
        : "Yok (Tamamı Konut)";
      const roofInfo = getRoofInfo(params.roofType);
      const bType = params.buildingType === 'standard' ? 'Standart Konut (A Sınıfı)' : params.buildingType === 'luxury' ? 'Lüks Konut / Rezidans' : 'Ticari + Konut Karma Yapı';
      const cantDesc = params.hasCantilever 
        ? `Var (Konsol Çıkma: ${Math.max(0, params.cantileverDepth || 1.2)}m, Yön: ${params.cantileverDirection === 'front_back' ? 'Ön-Arka Cepheler' : params.cantileverDirection === 'front' ? 'Yalnızca Ön Cephe' : 'Ayrık / Tüm Cepheler'})` 
        : 'Yok (Düz Prizmatik Kütle)';
      const basementDesc = safeBasementCount > 0 
        ? `${safeBasementCount} Kat Bodrum (Sığınak, Su Deposu, Ortak Alan & Kapalı Otopark)` 
        : 'Bodrum Kat Yok';
      const totalUnits = params.hasGroundFloorShop 
        ? `${safeFlatCount} Adet Konut + ${safeShopCount} Adet Ticari Dükkan (Toplam ${safeFlatCount + safeShopCount} Bağımsız Bölüm)` 
        : `${safeFlatCount} Adet Konut`;

      return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${projectTitle}</title>
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
        content: "${compName} - Projeye Özel Şartname";
        font-size: 9px;
        color: #64748b;
        font-family: sans-serif;
      }
    }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 0; color: #0f172a; max-width: 960px; margin: 0 auto; line-height: 1.5; font-size: 11px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    h2 { color: #0f172a; text-align: left; font-size: 15px; margin: 0; font-weight: bold; }
    .specs-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 10px; }
    .specs-table th, .specs-table td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
    .specs-table th { background: #f8fafc; font-weight: bold; width: 30%; color: #334155; }
    .section-title { font-size: 12px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 3px; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase; }
    .footer-table { width: 100%; margin-top: 30px; border-collapse: collapse; }
    .footer-table td { width: 50%; text-align: center; vertical-align: top; font-size: 11px; }
    .footer-meta { text-align: center; font-size: 10px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
  </style>
</head>
<body>
  <div class="avoid-break" style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #0f172a;padding-bottom:10px;margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:12px;">
      ${compLogo ? `<img src="${compLogo}" alt="${compName}" style="max-height:50px;max-width:130px;object-fit:contain;" />` : ''}
      <div>
        <h2>${projectTitle}</h2>
        <p style="margin:2px 0 0 0;font-size:10px;color:#64748b;font-weight:600;">${compLegal}</p>
        <p style="margin:2px 0 0 0;font-size:10px;color:#64748b;">Tarih: ${new Date().toLocaleDateString('tr-TR')} | Belge No: ${compName}-2026/TŞ-02 | Adres: ${safeAddress}</p>
      </div>
    </div>
  </div>

  <div class="section-title">01. PROJE GENEL METRAJ KÜNYESİ</div>
  <table class="specs-table">
    <tr>
      <th>Proje Adresi</th>
      <td>${safeAddress}</td>
    </tr>
    <tr>
      <th>Yapı Tipi Sınıfı</th>
      <td>${bType}</td>
    </tr>
    <tr>
      <th>Taban Oturum Alanı</th>
      <td>${safeBaseArea.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} m²</td>
    </tr>
    <tr>
      <th>Toplam İnşaat Alanı</th>
      <td>${safeTotalArea.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} m²</td>
    </tr>
    <tr>
      <th>Kat Yapısı</th>
      <td>${safeFloorCount} Normal Kat + ${safeBasementCount} Bodrum Kat ${params.hasGroundFloorShop ? `(Zemin Kat Ticari Dükkan + ${Math.max(0, safeFloorCount - 1)} Normal Kat)` : '(Tamamı Konut)'}</td>
    </tr>
    <tr>
      <th>Bodrum Kat Durumu</th>
      <td>${basementDesc}</td>
    </tr>
    <tr>
      <th>Bağımsız Bölüm Dağılımı</th>
      <td>${totalUnits}</td>
    </tr>
    <tr>
      <th>Daire Tipi (Oda + Salon Sayısı)</th>
      <td>${currentRoom} Yapı Standardı</td>
    </tr>
    <tr>
      <th>Zemin Kat Dükkan Seçeneği</th>
      <td>${isShop}</td>
    </tr>
    <tr>
      <th>Tahmini Yapım Süresi</th>
      <td>${safeMonths} Ay</td>
    </tr>
  </table>

  <div class="section-title">02. TAHMİNİ TAŞIYICI SİSTEM METRAJLARI (HAKEDİŞE ESAS)</div>
  <table class="specs-table">
    <tr>
      <th>Betonarme Karkas Beton Sınıfı</th>
      <td>Asgari C30/35 Hazır Beton</td>
    </tr>
    <tr>
      <th>Tahmini Beton Hacmi</th>
      <td>${safeConcrete.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} m³</td>
    </tr>
    <tr>
      <th>Demir Donatı Kalitesi</th>
      <td>S420 Nervürlü Sismik Çelik</td>
    </tr>
    <tr>
      <th>Tahmini Çelik Tonajı</th>
      <td>${safeSteel.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} Ton</td>
    </tr>
  </table>

  <div class="section-title">03. CEPHE, ÇATI VE MİMARİ BİLEŞENLER AYRINTILARI</div>
  <table class="specs-table">
    <tr>
      <th>1. Kattan Sonra Çıkma Durumu</th>
      <td>${cantDesc}</td>
    </tr>
    <tr>
      <th>Mimari Çatı Konstrüksiyonu</th>
      <td>
        <strong>${roofInfo.title}</strong> (${roofInfo.badge})<br />
        <span style="font-size:11px; color:#475569; display:block; margin-top:4px;">${roofInfo.technicalSpecification}</span>
      </td>
    </tr>
    <tr>
      <th>Bodrum & Ortak Alanlar</th>
      <td>${basementDesc}</td>
    </tr>
    <tr>
      <th>Dış Cephe Yalıtımı (Mantolama)</th>
      <td>Minimum 5 cm Karbonlu EPS mantolama, dekoratif mineral sıva ve silikon esaslı dış cephe boyası.</td>
    </tr>
  </table>

  <div class="section-title">04. PAYDAŞ MALİK KATILIM LİSTESİ</div>
  <table class="specs-table" style="font-size:11px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th>Daire No</th>
        <th>Hak Sahibi Ad Soyad</th>
        <th>T.C. Kimlik Numarası</th>
        <th>Hisse Alanı (m²)</th>
      </tr>
    </thead>
    <tbody>
      ${results.flatResults.map(f => `
      <tr>
        <td>Daire ${f.id}</td>
        <td>${f.name}</td>
        <td>${f.tc}</td>
        <td>${f.area} m²</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <table class="footer-table">
    <tr>
      <td>
        <strong>KAT MALİKLERİ ONAYI</strong><br><br>
        <div style="height: 30px;"></div>
        İmza: .......................................<br>
        <span style="font-size:10px; color:#64748b;">Tarih: ${new Date().toLocaleDateString('tr-TR')}</span>
      </td>
      <td>
        <strong>${companyLegalName.toUpperCase()} ONAYI</strong><br>
        ${profile.stampUrl ? `<img src="${profile.stampUrl}" style="max-height: 48px; margin: 4px auto; display:block;" />` : ''}
        <div style="font-size: 11px; color: #1e293b; margin-top: 4px;">
          ${showFirstAuth ? `<strong>${profile.authorizedPerson}</strong> (${profile.authorizedTitle})<br>` : ''}
          ${showSecondAuth && profile.authorizedPerson2 ? `<strong>${profile.authorizedPerson2}</strong> (${profile.authorizedTitle2 || ''})<br>` : ''}
        </div>
        Kaşe / İmza: .......................................<br>
        <span style="font-size:10px; color:#64748b;">Tarih: ${new Date().toLocaleDateString('tr-TR')}</span>
      </td>
    </tr>
  </table>

  <div class="footer-meta">
    ${profile.companyName} - Güvene Yükselen Yapılar | Projeye Özel Teknik Şartname
  </div>
</body>
</html>`;
    }
  };

  const handleSaveToDrive = async () => {
    if (!hasToken) {
      onOpenDrivePanel();
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);
    try {
      const htmlContent = generateSpecHtml();
      const prefix = activeTab === 'common' ? 'Ortak_Teknik_Sartname' : 'Projeye_Ozel_Teknik_Sartname';
      const safeAddr = safeAddress.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').slice(0, 20);
      const safeName = profile.companyName.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_');
      const fileName = `${safeName}_${prefix}_${safeAddr}_${new Date().toISOString().slice(0, 10)}.html`;
      await saveReportDocumentToDrive(
        fileName,
        htmlContent,
        activeTab === 'common'
          ? `${profile.companyName} Ortak Teknik Şartname - ${safeAddress}`
          : `${profile.companyName} Projeye Özel Teknik Şartname - ${safeAddress}`
      );
      setSaveStatus({
        type: 'success',
        msg: `${activeTab === 'common' ? 'Ortak' : 'Projeye Özel'} teknik şartname Google Drive hesabınıza başarıyla kaydedildi: "${fileName}"`,
      });
    } catch (err: any) {
      setSaveStatus({
        type: 'error',
        msg: `Drive kaydı başarısız: ${err?.message || 'Bilinmeyen hata'}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const cardBg = isGray
    ? 'bg-slate-100 border-slate-300 text-slate-900 shadow-sm'
    : 'bg-white border-slate-200 text-slate-900 shadow-sm';

  const renderSignatureBlock = () => (
    <div className="grid grid-cols-2 gap-8 pt-8 px-4 text-xs text-slate-700 border-t border-slate-200">
      <div className="text-center border-r border-dashed border-slate-300 pr-4">
        <p className="font-bold mb-10 text-slate-900">KAT MALİKLERİ ONAYI</p>
        <div className="h-10 border-b border-slate-300 mx-8 mb-2"></div>
        <p className="text-slate-400 text-[10px]">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
      </div>

      <div className="text-center pl-4 relative">
        <p className="font-bold mb-1 text-slate-900">YÜKLENİCİ FİRMA KAŞE / İMZA</p>
        <p className="text-[11px] text-slate-600 mb-2 leading-tight">
          {companyLegalName}
        </p>

        <div className="flex items-center justify-center gap-4 min-h-[45px] relative my-1">
          {profile.stampUrl && (
            <img
              src={profile.stampUrl}
              alt="Kaşe/İmza"
              className="max-h-12 object-contain absolute opacity-80 z-10 pointer-events-none"
            />
          )}
          {showFirstAuth && profile.authorizedPerson && (
            <div className="relative z-0">
              <p className="font-bold text-slate-900 text-xs">{profile.authorizedPerson}</p>
              <p className="text-[10px] text-indigo-700">{profile.authorizedTitle}</p>
              {showFirstAuthChamber && (profile.authorizedChamberNo || profile.authorizedChamber) && (
                <p className="text-[9px] text-slate-500 font-mono">{profile.authorizedChamberNo || profile.authorizedChamber}</p>
              )}
            </div>
          )}
          {showSecondAuth && profile.authorizedPerson2 && (
            <div className="relative z-0 border-l border-slate-200 pl-3">
              <p className="font-bold text-slate-900 text-xs">{profile.authorizedPerson2}</p>
              <p className="text-[10px] text-emerald-700">{profile.authorizedTitle2}</p>
              {showSecondAuthChamber && (profile.authorizedChamberNo2 || profile.authorizedChamber2) && (
                <p className="text-[9px] text-slate-500 font-mono">{profile.authorizedChamberNo2 || profile.authorizedChamber2}</p>
              )}
            </div>
          )}
        </div>

        <div className="h-6 border-b border-slate-300 mx-8 mb-2"></div>
        <p className="text-slate-400 text-[10px]">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Top Controls Bar */}
      <div className={`p-5 rounded-3xl border print:hidden shadow-sm space-y-4 ${cardBg}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-sm text-slate-900">
              {activeTab === 'common' ? 'Ortak Teknik Şartname Belgesi' : 'Projeye Özel Teknik Şartname'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === 'common'
                ? 'Kentsel dönüşüm bina yapımında esnek ve standart teknik kriterler şartnamesi'
                : 'Projenin geometrik, metraj ve mühendislik detaylarını içeren dinamik şartname'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Tab Switcher */}
            <div className="flex bg-slate-200/80 p-1 rounded-xl border border-slate-300 mr-2">
              <button
                type="button"
                onClick={() => { setActiveTab('common'); setSaveStatus(null); }}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'common'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Ortak Şartname</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('project'); setSaveStatus(null); }}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'project'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Projeye Özel Şartname</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyToClipboard}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow-sm border transition-all active:scale-95 cursor-pointer ${
                copiedStatus
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              {copiedStatus ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedStatus ? 'Metin Kopyalandı!' : 'Metni Kopyala'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToDrive}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              <Cloud className="w-4 h-4" />
              <span>{isSaving ? 'Kaydediliyor...' : "Drive'a Kaydet"}</span>
            </button>

            <PrintAndPdfButtons
              onExportPdf={handleExportPdf}
              onPrint={handlePrint}
              getHtmlContent={generateSpecHtml}
              documentTitle={activeTab === 'common' ? 'Ortak Teknik Şartname' : 'Projeye Özel Teknik Şartname'}
              theme={theme}
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-200/80">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Şartnamede ara (örn: C30, asansör, mantolama, çatı, seramik, radon)..."
              className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {searchQuery && (
            <span className="text-[11px] text-slate-500 font-medium">
              Kelime Vurgulama Aktif
            </span>
          )}
        </div>
      </div>

      {saveStatus && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 print:hidden border ${
            saveStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}
        >
          {saveStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{saveStatus.msg}</span>
        </div>
      )}

      {/* RENDER ACTIVE TAB BODY */}
      <div ref={specContainerRef}>
      {activeTab === 'common' ? (
        /* COMMON SPECIFICATION DOCUMENT */
        <div className="bg-white border border-slate-200 rounded-3xl shadow-md p-6 sm:p-10 text-xs leading-relaxed text-slate-800 print:border-none print:shadow-none print:p-0">
          
          {/* Corporate Header Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-6 print:border-slate-300">
            <div className="flex items-center gap-3">
              <Logo size="lg" variant="full" theme={theme} />
            </div>
            <div className="text-center sm:text-right">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">
                {highlightText(specTitle)}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                Tarih: {results.calculatedAt || new Date().toLocaleDateString('tr-TR')} | Belge No: {profile.companyName}-{new Date().getFullYear()}/TŞ-01
              </p>
              <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                {companyLegalName} | Kentsel Dönüşüm Ortak Teknik Standartları
              </p>
            </div>
          </div>

          {/* Content Modules */}
          <div className="space-y-8">
            {/* SECTION 01 */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-indigo-950 text-xs sm:text-sm border-b-2 border-slate-200 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-indigo-600 font-mono">01.</span> {highlightText('KABA YAPI, ZEMİN VE STATİK KRİTERLERİ')}
              </h3>
              
              <div className="pl-1 sm:pl-3 space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-indigo-600 pl-2.5 text-xs">
                    {highlightText('Zemin Etüdü ve Statik Projelendirme')}
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>{highlightText('Zemin etütleri ruhsat aşamasında yetkili zemin mekaniği firmalarına yaptırılarak ilgili belediyeye onaylattırılacaktır.')}</li>
                    <li>{highlightText('Statik hesaplamalar; zemin emniyet gerilmeleri ve yürürlükteki Deprem Yönetmeliği esas alınarak hazırlanacaktır.')}</li>
                  </ul>
                  <div className="bg-indigo-50/30 border border-slate-200 border-l-4 border-l-indigo-600 rounded-xl p-3 text-[11px] text-slate-800 leading-relaxed mt-2">
                    <span className="font-bold text-indigo-900">{highlightText('Proje Çeşitliliği / Esneklik:')}</span> {highlightText('Parsel oturum alanına ve zemin sınıfına (Z1-Z5) bağlı olarak temel tipi (Radye Jeneral, İyileştirmeli veya projeye göre gerekli görüldüğünde kuyu temel sistemleri) statik gerekler doğrultusunda farklılık gösterebilir.')}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-indigo-600 pl-2.5 text-xs">
                    {highlightText('Betonarme Taşıyıcı Sistem ve Malzemeler')}
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>{highlightText('Binanın taşıyıcı sistemi betonarme karkas olup, en son deprem yönetmeliğine uygun projelendirilecektir.')}</li>
                    <li>{highlightText('Hazır beton sınıfı asgari C30 standardında temin edilecek, demir donatı olarak S420 nervürlü TSE belgeli sismik çelik kullanılacaktır. Beton döküm test sonuçları paydaşlara sunulacaktır.')}</li>
                  </ul>
                  <div className="bg-indigo-50/30 border border-slate-200 border-l-4 border-l-indigo-600 rounded-xl p-3 text-[11px] text-slate-800 leading-relaxed mt-2">
                    <span className="font-bold text-indigo-900">{highlightText('Proje Çeşitliliği / Esneklik:')}</span> {highlightText('Bodrum kat perdeleri ve bina yüksekliğine/statik hesaplara göre beton sınıfları (C30, C35 vb.) mühendislik hesapları baz alınarak projeye özel optimize edilir.')}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-indigo-600 pl-2.5 text-xs">
                    {highlightText('Su Yalıtımı ve Drenaj Sistemleri')}
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>{highlightText('Temel ve toprak altı bodrum perdelerinde bina ömrünü korumak amacıyla su yalıtımı (bohçalama veya uygun perde yalıtımları) uygulanacaktır.')}</li>
                    <li>{highlightText('Perde duvarlarda yalıtımı korumak amacıyla yüksek dansite XPS levhalar ve drenaj levhaları konumlandırılacaktır.')}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* SECTION 02 */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-indigo-955 text-xs sm:text-sm border-b-2 border-slate-200 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-indigo-600 font-mono">02.</span> {highlightText('DUVARLAR VE ÇATI İMALAT ÇEŞİTLİLİKLERİ')}
              </h3>
              
              <div className="pl-1 sm:pl-3 space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-indigo-600 pl-2.5 text-xs">
                    {highlightText('Bölücü Duvarlar ve Ses / Isı Yalıtımı')}
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>{highlightText('Dış duvarlar ve ıslak hacim duvarları projesine uygun tuğla veya yalıtımlı blok elemanlarla örülecektir.')}</li>
                  </ul>
                  <div className="bg-indigo-50/30 border border-slate-200 border-l-4 border-l-indigo-600 rounded-xl p-3 text-[11px] text-slate-800 leading-relaxed mt-2">
                    <span className="font-bold text-indigo-900">{highlightText('Proje Çeşitliliği / Esneklik:')}</span> {highlightText('Duvar kalınlıkları (8.5 cm, 13.5 cm) ve iki daire arası ses/ısı yalıtım detayları (çift duvar uygulaması veya akustik tuğla/taş yünü yalıtım katmanları); mimari akslara ve akustik yönetmelik gereksinimlerine göre her projede farklılık gösterebilir. Kesin bir tek tip duvar detayı dayatılmaz.')}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-indigo-600 pl-2.5 text-xs">
                    {highlightText('Çatı Konstrüksiyonu ve Yalıtım Detayları')}
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>{highlightText('Çatı sistemleri onaylı mimari projeye uygun olarak çelik veya ahşap karkas konstrüksiyon şeklinde imal edilecektir.')}</li>
                    <li>{highlightText('Çatı kaplamasında OSB, su yalıtım membranı ve shingle / kenet sac alternatifleri projenin mimari çizgisine göre uygulanacaktır. Isı yalıtımı için taş yünü veya poliüretan köpük sistemleri tercih edilecektir.')}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* SECTION 03 */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-indigo-950 text-xs sm:text-sm border-b-2 border-slate-200 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-indigo-600 font-mono">03.</span> {highlightText('DIŞ CEPHE VE DOĞRAMA ÇEŞİTLİLİKLERİ')}
              </h3>
              
              <div className="pl-1 sm:pl-3 space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-indigo-600 pl-2.5 text-xs">
                    {highlightText('Dış Cephe Mantolama ve Tasarım')}
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>{highlightText('Bina dış cepheleri ısı yalıtım projesi (BEP) değerlerini sağlayacak kalınlık ve yoğunlukta mantolama (EPS veya Taşyünü) ile kaplanacaktır.')}</li>
                    <li>{highlightText('Belediye onaylı dış cephe renk ve kompozit/dekoratif kaplama alternatifleri uygulanarak üst segment dış cephe boyaları tercih edilecektir.')}</li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-indigo-600 pl-2.5 text-xs">
                    {highlightText('Doğramalar ve Cam Sistemleri')}
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>{highlightText('Pencereler ve balkon kapıları projenin mimari rengine uyumlu üst segment PVC doğrama (Egepen, Fıratpen, Pimapen veya muadili) olacaktır.')}</li>
                    <li>{highlightText('Camlar konfor ısıcam (çift cam kombinasyonları) olarak uygulanacak, Fransız balkon önlerinde projeye uygun lamine/temperli cam korkuluklar yer alacaktır.')}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* SECTION 04 */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-indigo-950 text-xs sm:text-sm border-b-2 border-slate-200 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-indigo-600 font-mono">04.</span> {highlightText('İÇ MEKÂN, KAPLAMA VE DONATI SEÇENEKLERİ')}
              </h3>
              
              <div className="pl-1 sm:pl-3 space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-indigo-600 pl-2.5 text-xs">
                    {highlightText('Zeminler ve İç Yüzeyler')}
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>{highlightText('Salon ve odalarda 1. sınıf laminat parke (AGT, Çamsan, Terraclick veya muadili), antre ve mutfakta 1. sınıf granit/seramik kaplama kullanılacaktır.')}</li>
                    <li>{highlightText('Duvarlar alçı sıva üzeri su bazlı silinebilir saten boya ile tamamlanacak, ıslak hacimlerde 1. sınıf seramik kaplama tercih edilecektir.')}</li>
                  </ul>
                  <div className="bg-indigo-50/30 border border-slate-200 border-l-4 border-l-indigo-600 rounded-xl p-3 text-[11px] text-slate-800 leading-relaxed mt-2">
                    <span className="font-bold text-indigo-900">{highlightText('Proje Çeşitliliği / Esneklik:')}</span> {highlightText('Daire sahiplerine sunulacak renk, ebat (örn. 60x60 veya 60x120 seramik) ve model alternatifleri; projenin konseptine ve o dönemsel üretici kataloglarına göre çeşitlilik arz edebilir.')}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-indigo-600 pl-2.5 text-xs">
                    {highlightText('Mutfak, Banyo ve İç Kapılar')}
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>{highlightText('Mutfak dolapları gövde MDF, kapaklar Highgloss veya Lake; tezgahlar ise 1. sınıf granit/kuvars esaslı malzemeden yapılacaktır.')}</li>
                    <li>{highlightText('Banyolarda gömme rezervuar, TSE belgeli armatürler, duşakabin ve suya dayanıklı banyo dolabı uygulanacaktır. İç kapılar PVC kaplamalı veya Lake ahşap kapı olacaktır.')}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* SECTION 05 */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-indigo-950 text-xs sm:text-sm border-b-2 border-slate-200 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-indigo-600 font-mono">05.</span> {highlightText('MEKANİK, ELEKTRİK VE ASANSÖR STANDARTLARI')}
              </h3>
              
              <div className="pl-1 sm:pl-3 space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-indigo-600 pl-2.5 text-xs">
                    {highlightText('Asansör Sistemlerinde Esneklik')}
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>{highlightText('Binaya tesis edilecek asansörler; ilgili belediye imar mevzuatına, Asansör Yönetmeliği\'ne ve TSE standartlarına tam uygun, yeşil etiketli olacaktır.')}</li>
                  </ul>
                  <div className="bg-indigo-50/30 border border-slate-200 border-l-4 border-l-indigo-600 rounded-xl p-3 text-[11px] text-slate-800 leading-relaxed mt-2">
                    <span className="font-bold text-indigo-900">{highlightText('Proje Çeşitliliği / Esneklik:')}</span> {highlightText('Asansörün kişi kapasitesi, taşıma tonajı (örn. 630 kg / 8 kişilik veya parsele/binaya özel mimari kuyu boyutlarına göre 4-6 kişilik alternatifler) ve kabin tasarımı; her binanın arsa oturumuna, kat sayısına ve ruhsat projesine göre değişkenlik gösterir. Sabit bir kişi sayısı dayatılmaz.')}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-indigo-600 pl-2.5 text-xs">
                    {highlightText('Isıtma, Elektrik ve Güvenlik Altyapısı')}
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>{highlightText('Her bağımsız bölümde bağımsız kombili doğalgaz ısıtma altyapısı, radyatörler ve klima tesisat altyapısı bulunacaktır.')}</li>
                    <li>{highlightText('Tüm elektrik tesisatında TSE belgeli kablolar, kaçak akım röleleri, merkezi uydu ve fiber internet altyapısı kurulacaktır.')}</li>
                    <li>{highlightText('Audio marka görüntülü diafon sistemi ve bina çevresi güvenlik kamera altyapısı tesis edilecektir.')}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* SECTION 06 */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-indigo-950 text-xs sm:text-sm border-b-2 border-slate-200 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-indigo-600 font-mono">06.</span> {highlightText('YIKIM VE UYGULAMA ESASLARI')}
              </h3>
              
              <div className="pl-1 sm:pl-3 space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-indigo-600 pl-2.5 text-xs">
                    {highlightText('Yıkım ve Proje Yönetimi')}
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>{highlightText(`Eski binaların yıkımı, yasal ruhsatlar alındıktan sonra iş güvenliği kurallarına tam uygun olarak ${profile.companyName} güvencesiyle gerçekleştirilecektir. Hafriyat ve yıkım maliyetleri yükleniciye aittir.`)}</li>
                    <li>{highlightText('Tüm imalatlar onaylı mimari, statik ve tesisat projeleri ile yapı denetim denetiminde yürütülecektir. Yüklenici, kalite standardından ödün vermemek şartıyla eşdeğer muadil malzeme uygulama hakkına sahiptir.')}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Kurumsal Onay */}
            <div className="p-4 bg-slate-50 border border-slate-200 border-l-4 border-l-slate-500 rounded-xl text-[11px] text-slate-700 leading-relaxed mt-6">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-4 h-4 text-slate-600" />
                Kurumsal Onay:
              </span>
              İşbu Teknik Şartname, {profile.companyName} kentsel dönüşüm projelerinde uygulanacak asgari kalite standartlarını ve parsele özel projeye göre şekillenebilecek esnek yapısal çeşitlilikleri resmi olarak belirlemektedir.
            </div>

            {/* Signature Block */}
            {renderSignatureBlock()}
          </div>
        </div>
      ) : (
        /* PROJECT-SPECIFIC DYNAMIC SPECIFICATION */
        <div className="bg-white border border-slate-200 rounded-3xl shadow-md p-6 sm:p-10 text-xs leading-relaxed text-slate-800 print:border-none print:shadow-none print:p-0">
          
          {/* Corporate Header Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-6 print:border-slate-300">
            <div className="flex items-center gap-3">
              <Logo size="lg" variant="full" theme={theme} />
            </div>
            <div className="text-center sm:text-right">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">
                {highlightText(projectTitle)}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                Tarih: {results.calculatedAt || new Date().toLocaleDateString('tr-TR')} | Belge No: {profile.companyName}-{new Date().getFullYear()}/TŞ-02
              </p>
              <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                {companyLegalName} | Adres: {highlightText(safeAddress)}
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {/* C-01 */}
            <div>
              <h3 className="font-extrabold text-indigo-900 text-xs sm:text-sm border-b-2 border-slate-200 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-indigo-600 font-mono">01.</span> {highlightText('PROJE GENEL METRAJ KÜNYESİ')}
              </h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Proje Konumu (Adres)</span>
                  <p className="text-xs font-semibold text-slate-800">{highlightText(safeAddress)}</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Yapı Sınıfı ve Standart</span>
                  <p className="text-xs font-semibold text-slate-800">
                    {params.buildingType === 'standard' ? 'Standart Konut (A Sınıfı)' : params.buildingType === 'luxury' ? 'Lüks Konut / Rezidans' : 'Ticari + Konut Karma Yapı'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Bina Oturumu (Taban Alanı)</span>
                  <p className="text-xs font-semibold text-slate-800 font-mono">
                    {safeBaseArea.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} m²
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Toplam Kapalı İnşaat Alanı</span>
                  <p className="text-xs font-semibold text-slate-800 font-mono">
                    {safeTotalArea.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} m²
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Kat Yapısı</span>
                  <p className="text-xs font-semibold text-slate-800">
                    {safeFloorCount} Normal Kat + {safeBasementCount} Bodrum Kat {params.hasGroundFloorShop ? `(Zemin Kat: ${safeShopCount} Ticari Dükkan)` : "(Tamamı Konut)"}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Bodrum Kat & Altyapı</span>
                  <p className="text-xs font-semibold text-slate-800">
                    {safeBasementCount > 0 
                      ? `${safeBasementCount} Kat Bodrum (Sığınak, Su Deposu, Otopark)` 
                      : 'Bodrum Kat Planlanmamıştır'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Bağımsız Bölüm Sayısı</span>
                  <p className="text-xs font-semibold text-slate-800">{totalUnitsDisplay}</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Daire Tipi (Oda + Salon Sayısı)</span>
                  <p className="text-xs font-semibold text-indigo-600 font-bold font-mono">
                    {currentRoom}
                  </p>
                </div>
              </div>
            </div>

            {/* C-02 */}
            <div>
              <h3 className="font-extrabold text-indigo-900 text-xs sm:text-sm border-b-2 border-slate-200 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-indigo-600 font-mono">02.</span> {highlightText('TAŞIYICI SİSTEM MÜHENDİSLİK METRAJLARI')}
              </h3>
              <p className="text-slate-600 text-xs mt-2">
                Aşağıdaki değerler, binanın toplam kat alanı ve yapı geometrisine bağlı statik katsayılar göz önünde bulundurularak hesaplanan tahmini kaba yapı hakediş metrajlarıdır:
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-indigo-400 uppercase">Tahmini Hazır Beton Hacmi</span>
                    <p className="text-sm font-bold text-indigo-950 font-mono">
                      {safeConcrete.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} m³
                    </p>
                    <span className="text-[10px] text-indigo-600 font-semibold">C30/35 Hazır Beton</span>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-blue-400 uppercase">Tahmini Sismik Demir Çelik</span>
                    <p className="text-sm font-bold text-blue-950 font-mono">
                      {safeSteel.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} Ton
                    </p>
                    <span className="text-[10px] text-blue-600 font-semibold">S420 Nervürlü Demir</span>
                  </div>
                </div>
              </div>
            </div>

            {/* C-03 */}
            <div>
              <h3 className="font-extrabold text-indigo-900 text-xs sm:text-sm border-b-2 border-slate-200 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-indigo-600 font-mono">03.</span> {highlightText('CEPHE, DIŞ GEOMETRİ VE MİMARİ BİLEŞENLER')}
              </h3>
              <div className="mt-3 space-y-3">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start justify-between gap-4">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Konsol Çıkma (Tabla Çıkması)</span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">
                      {params.hasCantilever 
                        ? `1. Kattan İtibaren Tabla Çıkması Mevcuttur.` 
                        : "Yapıda konsol çıkma planlanmamıştır, düz kütle şeklinde inşa edilecektir."}
                    </p>
                  </div>
                  {params.hasCantilever && (
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-[10px] font-mono">
                        Derinlik: {Math.max(0, params.cantileverDepth || 0)}m
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-1 uppercase">
                        Yön: {params.cantileverDirection === 'front_back' ? 'Ön-Arka' : params.cantileverDirection === 'front' ? 'Ön Cephe' : 'Ayrık / Tüm Cepheler'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Mimari Çatı Konstrüksiyonu</span>
                      <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-semibold rounded text-[10px]">
                        {currentRoof.badge}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-indigo-900 mt-0.5">
                      {currentRoof.title}
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
                      {currentRoof.technicalSpecification}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Dış Cephe Isı Yalıtımı & Mantolama</span>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">
                    Isı yalıtım yönetmeliği TS 825 standartlarına uygun <span className="font-semibold text-indigo-700">minimum 5 cm kalınlığında Karbonlu EPS mantolama</span>, fileli sıva ve nefes alan silikonlu dış cephe boyası tatbikatı yapılacaktır.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Bodrum Kat & Sığınak / Otopark Altyapısı</span>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">
                    {safeBasementCount > 0
                      ? `${safeBasementCount} Kat Bodrum İmalatı: Deprem ve sığınak yönetmeliğine tam uyumlu sığınak, su deposu (hidroforlu), yangın tesisatı ve kapalı otopark alanları.`
                      : 'Bodrum kat planlanmamış olup sığınak ve teknik hacimler zemin katta yönetmelik şartlarına göre ayrılacaktır.'}
                  </p>
                </div>
              </div>
            </div>

            {/* C-04 */}
            <div>
              <h3 className="font-extrabold text-indigo-900 text-xs sm:text-sm border-b-2 border-slate-200 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-indigo-600 font-mono">04.</span> {highlightText('HAK SAHİBİ MALİKLER KATILIM TABLOSU')}
              </h3>
              <p className="text-slate-600 text-xs mt-2 mb-3">
                Bu proje özel teknik şartnamesi, aşağıda hisseleri ve isimleri belirtilen bağımsız bölüm sahiplerinin ortak muvafakati ve onayı ile geçerlilik kazanır:
              </p>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="p-3 border-b border-slate-200 font-semibold">Bağımsız Bölüm</th>
                      <th className="p-3 border-b border-slate-200 font-semibold">Hak Sahibi Adı Soyadı</th>
                      <th className="p-3 border-b border-slate-200 font-semibold">T.C. Kimlik No</th>
                      <th className="p-3 border-b border-slate-200 font-semibold text-right">Bölüm Alanı (m²)</th>
                      <th className="p-3 border-b border-slate-200 font-semibold text-center">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {results.flatResults.map((flat) => (
                      <tr key={flat.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">Daire {flat.id}</td>
                        <td className="p-3 font-medium text-slate-900">{highlightText(flat.name)}</td>
                        <td className="p-3 font-mono text-slate-500">{highlightText(flat.tc)}</td>
                        <td className="p-3 text-right font-semibold font-mono">{Math.max(0, flat.area || 0)} m²</td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-semibold border border-emerald-200">
                            <Check className="w-3 h-3" />
                            Muvafakat Var
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signature Block */}
            {renderSignatureBlock()}

          </div>
        </div>
      )}
      </div>

    </div>
  );
};
