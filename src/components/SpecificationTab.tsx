import React, { useState } from 'react';
import { Printer, Cloud, CheckCircle2, AlertCircle, Sparkles, ShieldCheck, FileText, FileSpreadsheet, Layers, Compass, Building, Check } from 'lucide-react';
import { ProjectParams, CalculationResult, AppTheme } from '../types';
import { saveReportDocumentToDrive } from '../services/drive';
import { Logo } from './Logo';

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
  const [activeTab, setActiveTab] = useState<'common' | 'project'>('common');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const isGray = theme === 'gray';

  const specTitle = "KENTSEL DÖNÜŞÜM ORTAK TEKNİK ŞARTNAMESİ";
  const specSubtitle = "AB Yapı Proje Çeşitlilikleri, Malzeme ve Uygulama Esasları";

  const projectTitle = "PROJEYE ÖZEL KENTSEL DÖNÜŞÜM YAPIM ŞARTNAMESİ";
  const projectSubtitle = `Adres: ${params.projectAddress || 'Belirtilmemiş'} | Özel Mühendislik ve Malzeme Listesi`;

  const generateSpecHtml = () => {
    if (activeTab === 'common') {
      return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${specTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #1e293b; max-width: 1000px; margin: 0 auto; line-height: 1.6; font-size: 13px; }
    .header-card { background: #0f172a; color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; }
    .header-card h1 { margin: 0 0 5px 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: #38bdf8; }
    .header-card h2 { margin: 0 0 15px 0; font-size: 13px; font-weight: 400; color: #94a3b8; }
    .meta-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 10px; font-size: 11px; border-top: 1px solid #334155; padding-top: 15px; color: #cbd5e1; }
    .section-title { font-size: 14px; font-weight: 800; color: #b45309; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px; }
    .subsection-title { font-size: 12px; font-weight: 700; color: #0f172a; border-left: 3px solid #f59e0b; padding-left: 10px; margin-top: 20px; margin-bottom: 10px; }
    ul { padding-left: 20px; margin: 5px 0 10px 0; }
    li { margin-bottom: 6px; }
    .flexibility-box { background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 10px 0; font-size: 11.5px; color: #78350f; }
    .flexibility-box strong { color: #92400e; }
    .footer-table { width: 100%; margin-top: 50px; border-collapse: collapse; }
    .footer-table td { width: 50%; text-align: center; vertical-align: top; font-size: 12px; }
    .footer-meta { text-align: center; font-size: 11px; color: #64748b; margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="header-card">
    <h1>${specTitle}</h1>
    <h2>${specSubtitle}</h2>
    <div class="meta-grid">
      <div><strong>Yüklenici:</strong> AB YAPI - Güvene Yükselen Yapılar</div>
      <div><strong>Doküman Kodu:</strong> AB-TŞ-REV2026</div>
      <div><strong>Kapsam:</strong> Kentsel Dönüşüm Projeleri Esnek ve Standart Teknik Kriterleri</div>
      <div><strong>Tarih:</strong> Eylül 2026</div>
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
    <li>Eski binaların yıkımı, yasal ruhsatlar alındıktan sonra iş güvenliği kurallarına tam uygun olarak AB YAPI güvencesiyle gerçekleştirilecektir. Hafriyat ve yıkım maliyetleri yükleniciye aittir.</li>
    <li>Tüm imalatlar onaylı mimari, statik ve tesisat projeleri ile yapı denetim denetiminde yürütülecektir. Yüklenici, kalite standardından ödün vermemek şartıyla eşdeğer muadil malzeme uygulama hakkına sahiptir.</li>
  </ul>

  <table class="footer-table">
    <tr>
      <td>
        <strong>KAT MALİKLERİ ONAYI</strong><br><br><br><br>
        İmza: .......................................
      </td>
      <td>
        <strong>AB YAPI MÜTEAHHİTLİK ONAYI</strong><br><br><br><br>
        Kaşe / İmza: .......................................
      </td>
    </tr>
  </table>

  <div class="footer-meta">
    AB YAPI - Güvene Yükselen Yapılar | Ortak Teknik Şartname
  </div>
</body>
</html>`;
    } else {
      // Dynamic Project-Specific HTML
      const isShop = params.hasGroundFloorShop ? "Evet" : "Hayır";
      const roofDesc = params.roofType === 'gable' ? "Beşik Çatı" : params.roofType === 'flat' ? "Düz Teras Çatı" : params.roofType === 'mansard' ? "Mansard Çatı" : "Dubleks Teras Çatı";
      const bType = params.buildingType === 'standard' ? 'Standart Konut' : params.buildingType === 'luxury' ? 'Lüks Konut / Rezidans' : 'Ticari + Konut';
      const cantDesc = params.hasCantilever ? `Var (Derinlik: ${params.cantileverDepth}m, Yön: ${params.cantileverDirection === 'front_back' ? 'Ön-Arka' : params.cantileverDirection === 'front' ? 'Yalnız Ön' : 'Tüm Cepheler'})` : 'Yok';

      return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${projectTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #1e293b; max-width: 1000px; margin: 0 auto; line-height: 1.6; font-size: 13px; }
    .header-card { background: #1e3a8a; color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; }
    .header-card h1 { margin: 0 0 5px 0; font-size: 20px; font-weight: 800; color: #60a5fa; }
    .header-card h2 { margin: 0 0 15px 0; font-size: 13px; font-weight: 400; color: #93c5fd; }
    .meta-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 10px; font-size: 11px; border-top: 1px solid #3b82f6; padding-top: 15px; color: #eff6ff; }
    .specs-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; }
    .specs-table th, .specs-table td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
    .specs-table th { background: #f8fafc; font-weight: bold; width: 30%; color: #334155; }
    .section-title { font-size: 14px; font-weight: 800; color: #1e3a8a; border-bottom: 2px solid #cbd5e1; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px; text-transform: uppercase; }
    .footer-table { width: 100%; margin-top: 50px; border-collapse: collapse; }
    .footer-table td { width: 50%; text-align: center; vertical-align: top; font-size: 12px; }
    .footer-meta { text-align: center; font-size: 11px; color: #64748b; margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="header-card">
    <h1>${projectTitle}</h1>
    <h2>${projectSubtitle}</h2>
    <div class="meta-grid">
      <div><strong>Proje Adresi:</strong> ${params.projectAddress}</div>
      <div><strong>Daire Sayısı:</strong> ${results.flatCount} Adet</div>
      <div><strong>İmalat Süresi:</strong> ${results.finalMonths} Ay</div>
      <div><strong>Tarih:</strong> ${new Date().toLocaleDateString('tr-TR')}</div>
    </div>
  </div>

  <div class="section-title">01. PROJE GENEL METRAJ KÜNYESİ</div>
  <table class="specs-table">
    <tr>
      <th>Proje Adresi</th>
      <td>${params.projectAddress}</td>
    </tr>
    <tr>
      <th>Yapı Tipi Sınıfı</th>
      <td>${bType}</td>
    </tr>
    <tr>
      <th>Taban Oturum Alanı</th>
      <td>${results.baseArea.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} m²</td>
    </tr>
    <tr>
      <th>Toplam İnşaat Alanı</th>
      <td>${results.totalArea.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} m²</td>
    </tr>
    <tr>
      <th>Kat Adedi</th>
      <td>${params.floorCount} Kat</td>
    </tr>
    <tr>
      <th>Daire Adedi</th>
      <td>${results.flatCount} Adet</td>
    </tr>
    <tr>
      <th>Daire Tipi (Oda + Salon Sayısı)</th>
      <td>${params.roomType || '3+1'} (${params.roomType === '1+1' ? '1 Oda, 1 Salon' : params.roomType === '2+1' ? '2 Oda, 1 Salon' : params.roomType === '3+1' ? '3 Oda, 1 Salon' : params.roomType === '4+1' ? '4 Oda, 1 Salon' : params.roomType}) Konut Yapı Standardı</td>
    </tr>
    <tr>
      <th>Zemin Kat Dükkan Seçeneği</th>
      <td>${isShop}</td>
    </tr>
    <tr>
      <th>Tahmini Yapım Süresi</th>
      <td>${results.finalMonths} Ay</td>
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
      <td>${results.concreteM3.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} m³</td>
    </tr>
    <tr>
      <th>Demir Donatı Kalitesi</th>
      <td>S420 Nervürlü Sismik Çelik</td>
    </tr>
    <tr>
      <th>Tahmini Çelik Tonajı</th>
      <td>${results.steelTon.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} Ton</td>
    </tr>
  </table>

  <div class="section-title">03. CEPHE VE GEOMETRİ AYRINTILARI</div>
  <table class="specs-table">
    <tr>
      <th>1. Kattan Sonra Çıkma Durumu</th>
      <td>${cantDesc}</td>
    </tr>
    <tr>
      <th>Mimari Çatı Konstrüksiyonu</th>
      <td>${roofDesc}</td>
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
        <strong>KAT MALİKLERİ ONAYI</strong><br><br><br><br>
        İmza: .......................................
      </td>
      <td>
        <strong>AB YAPI MÜTEAHHİTLİK ONAYI</strong><br><br><br><br>
        Kaşe / İmza: .......................................
      </td>
    </tr>
  </table>

  <div class="footer-meta">
    AB YAPI - Güvene Yükselen Yapılar | Projeye Özel Teknik Şartname
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
      const fileName = `AB_YAPI_${prefix}_${params.projectAddress.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').slice(0, 20)}.html`;
      await saveReportDocumentToDrive(
        fileName,
        htmlContent,
        activeTab === 'common'
          ? `AB YAPI Ortak Teknik Şartname - ${params.projectAddress}`
          : `AB YAPI Projeye Özel Teknik Şartname - ${params.projectAddress}`
      );
      setSaveStatus({
        type: 'success',
        msg: `${activeTab === 'common' ? 'Ortak' : 'Projeye Özel'} teknik şartname Google Drive hesabınıza başarıyla kaydedildi.`,
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

  return (
    <div className="space-y-6">
      
      {/* Tab Switcher */}
      <div className="flex bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 max-w-md print:hidden">
        <button
          type="button"
          onClick={() => { setActiveTab('common'); setSaveStatus(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'common'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Ortak Teknik Şartname</span>
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('project'); setSaveStatus(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'project'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Projeye Özel Şartname</span>
        </button>
      </div>

      {/* Top action bar */}
      <div className={`flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl border print:hidden shadow-sm ${cardBg}`}>
        <div>
          <h3 className="font-semibold text-sm text-slate-900">
            {activeTab === 'common' ? 'Ortak Teknik Şartname Belgesi' : 'Projeye Özel Teknik Şartname'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeTab === 'common'
              ? 'Yenilenen resmi esnek ve ortak teknik kriterler şartnamesi'
              : 'Üzerinde çalışılan projenin fiziksel, geometrik ve metraj detaylarını içeren dinamik şartname'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSaveToDrive}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 active:scale-95"
          >
            <Cloud className="w-4 h-4" />
            <span>{isSaving ? 'Kaydediliyor...' : "Drive'a Kaydet"}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-semibold transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Yazdır / PDF</span>
          </button>
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

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'common' ? (
        /* Specification Document Body (matches scanned image exactly) */
        <div className="bg-white border border-slate-200 rounded-3xl shadow-md p-6 sm:p-10 text-xs leading-relaxed text-slate-800 print:border-none print:shadow-none print:p-0">
          
          {/* Scanned-style Header Bar */}
          <div className="bg-indigo-950 text-white rounded-2xl p-6 sm:p-8 mb-6 relative overflow-hidden border border-slate-800 shadow-sm print:bg-slate-900 print:text-white">
            <div className="absolute right-0 top-0 opacity-10 translate-x-4 -translate-y-4">
              <Logo size="xl" variant="icon" theme="dark" />
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  Resmi Ortak Şartname
                </span>
                <h1 className="text-base sm:text-xl font-black tracking-wide text-white uppercase mt-1">
                  {specTitle}
                </h1>
                <p className="text-[11px] text-indigo-200">
                  {specSubtitle}
                </p>
              </div>
              
              <div className="bg-white/10 p-2 rounded-xl border border-white/15 shrink-0 print:bg-slate-800">
                <Logo size="md" variant="compact" theme="dark" />
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-white/10 text-[10px] text-indigo-100 font-mono">
              <div>
                <span className="block text-indigo-300 font-sans text-[9px] uppercase">YÜKLENİCİ</span>
                <strong>AB YAPI - Güvene Yükselen</strong>
              </div>
              <div>
                <span className="block text-indigo-300 font-sans text-[9px] uppercase">DOKÜMAN KODU</span>
                <strong>AB-TŞ-REV2026</strong>
              </div>
              <div>
                <span className="block text-indigo-300 font-sans text-[9px] uppercase">KAPSAM</span>
                <strong>Kentsel Dönüşüm Projeleri</strong>
              </div>
              <div>
                <span className="block text-indigo-300 font-sans text-[9px] uppercase">TARİH</span>
                <strong>Eylül 2026</strong>
              </div>
            </div>
          </div>

          {/* Content Modules */}
          <div className="space-y-8">
            {/* SECTION 01 */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-amber-800 text-xs sm:text-sm border-b-2 border-amber-100 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-amber-500 font-mono">01.</span> KABA YAPI, ZEMİN VE STATİK KRİTERLERİ
              </h3>
              
              <div className="pl-1 sm:pl-3 space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-amber-500 pl-2.5 text-xs">
                    Zemin Etüdü ve Statik Projelendirme
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Zemin etütleri ruhsat aşamasında yetkili zemin mekaniği firmalarına yaptırılarak ilgili belediyeye onaylattırılacaktır.</li>
                    <li>Statik hesaplamalar; zemin emniyet gerilmeleri ve yürürlükteki Deprem Yönetmeliği esas alınarak hazırlanacaktır.</li>
                  </ul>
                  <div className="bg-amber-50/70 border border-amber-100 border-l-4 border-l-amber-500 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed mt-2">
                    <span className="font-bold text-amber-800">Proje Çeşitliliği / Esneklik:</span> Parsel oturum alanına ve zemin sınıfına (Z1-Z5) bağlı olarak temel tipi (Radye Jeneral, İyileştirmeli veya projeye göre gerekli görüldüğünde kuyu temel sistemleri) statik gerekler doğrultusunda farklılık gösterebilir.
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-amber-500 pl-2.5 text-xs">
                    Betonarme Taşıyıcı Sistem ve Malzemeler
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Binanın taşıyıcı sistemi betonarme karkas olup, en son deprem yönetmeliğine uygun projelendirilecektir.</li>
                    <li>Hazır beton sınıfı asgari C30 standardında temin edilecek, demir donatı olarak S420 nervürlü TSE belgeli sismik çelik kullanılacaktır. Beton döküm test sonuçları paydaşlara sunulacaktır.</li>
                  </ul>
                  <div className="bg-amber-50/70 border border-amber-100 border-l-4 border-l-amber-500 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed mt-2">
                    <span className="font-bold text-amber-800">Proje Çeşitliliği / Esneklik:</span> Bodrum kat perdeleri ve bina yüksekliğine/statik hesaplara göre beton sınıfları (C30, C35 vb.) mühendislik hesapları baz alınarak projeye özel optimize edilir.
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-amber-500 pl-2.5 text-xs">
                    Su Yalıtımı ve Drenaj Sistemleri
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Temel ve toprak altı bodrum perdelerinde bina ömrünü korumak amacıyla su yalıtımı (bohçalama veya uygun perde yalıtımları) uygulanacaktır.</li>
                    <li>Perde duvarlarda yalıtımı korumak amacıyla yüksek dansite XPS levhalar ve drenaj levhaları konumlandırılacaktır.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* SECTION 02 */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-amber-800 text-xs sm:text-sm border-b-2 border-amber-100 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-amber-500 font-mono">02.</span> DUVARLAR VE ÇATI İMALAT ÇEŞİTLİLİKLERİ
              </h3>
              
              <div className="pl-1 sm:pl-3 space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-amber-500 pl-2.5 text-xs">
                    Bölücü Duvarlar ve Ses / Isı Yalıtımı
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Dış duvarlar ve ıslak hacim duvarları projesine uygun tuğla veya yalıtımlı blok elemanlarla örülecektir.</li>
                  </ul>
                  <div className="bg-amber-50/70 border border-amber-100 border-l-4 border-l-amber-500 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed mt-2">
                    <span className="font-bold text-amber-800">Proje Çeşitliliği / Esneklik:</span> Duvar kalınlıkları (8.5 cm, 13.5 cm) ve iki daire arası ses/ısı yalıtım detayları (çift duvar uygulaması veya akustik tuğla/taş yünü yalıtım katmanları); mimari akslara ve akustik yönetmelik gereksinimlerine göre her projede farklılık gösterebilir. Kesin bir tek tip duvar detayı dayatılmaz.
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-amber-500 pl-2.5 text-xs">
                    Çatı Konstrüksiyonu ve Yalıtım Detayları
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Çatı sistemleri onaylı mimari projeye uygun olarak çelik veya ahşap karkas konstrüksiyon şeklinde imal edilecektir.</li>
                    <li>Çatı kaplamasında OSB, su yalıtım membranı ve shingle / kenet sac alternatifleri projenin mimari çizgisine göre uygulanacaktır. Isı yalıtımı için taş yünü veya poliüretan köpük sistemleri tercih edilecektir.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* SECTION 03 */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-amber-800 text-xs sm:text-sm border-b-2 border-amber-100 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-amber-500 font-mono">03.</span> DIŞ CEPHE VE DOĞRAMA ÇEŞİTLİLİKLERİ
              </h3>
              
              <div className="pl-1 sm:pl-3 space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-amber-500 pl-2.5 text-xs">
                    Dış Cephe Mantolama ve Tasarım
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Bina dış cepheleri ısı yalıtım projesi (BEP) değerlerini sağlayacak kalınlık ve yoğunlukta mantolama (EPS veya Taşyünü) ile kaplanacaktır.</li>
                    <li>Belediye onaylı dış cephe renk ve kompozit/dekoratif kaplama alternatifleri uygulanarak üst segment dış cephe boyaları tercih edilecektir.</li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-amber-500 pl-2.5 text-xs">
                    Doğramalar ve Cam Sistemleri
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Pencereler ve balkon kapıları projenin mimari rengine uyumlu üst segment PVC doğrama (Egepen, Fıratpen, Pimapen veya muadili) olacaktır.</li>
                    <li>Camlar konfor ısıcam (çift cam kombinasyonları) olarak uygulanacak, Fransız balkon önlerinde projeye uygun lamine/temperli cam korkuluklar yer alacaktır.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* SECTION 04 */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-amber-800 text-xs sm:text-sm border-b-2 border-amber-100 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-amber-500 font-mono">04.</span> İÇ MEKÂN, KAPLAMA VE DONATI SEÇENEKLERİ
              </h3>
              
              <div className="pl-1 sm:pl-3 space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-amber-500 pl-2.5 text-xs">
                    Zeminler ve İç Yüzeyler
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Salon ve odalarda 1. sınıf laminat parke (AGT, Çamsan, Terraclick veya muadili), antre ve mutfakta 1. sınıf granit/seramik kaplama kullanılacaktır.</li>
                    <li>Duvarlar alçı sıva üzeri su bazlı silinebilir saten boya ile tamamlanacak, ıslak hacimlerde 1. sınıf seramik kaplama tercih edilecektir.</li>
                  </ul>
                  <div className="bg-amber-50/70 border border-amber-100 border-l-4 border-l-amber-500 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed mt-2">
                    <span className="font-bold text-amber-800">Proje Çeşitliliği / Esneklik:</span> Daire sahiplerine sunulacak renk, ebat (örn. 60x60 veya 60x120 seramik) ve model alternatifleri; projenin konseptine ve o dönemsel üretici kataloglarına göre çeşitlilik arz edebilir.
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-amber-500 pl-2.5 text-xs">
                    Mutfak, Banyo ve İç Kapılar
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Mutfak dolapları gövde MDF, kapaklar Highgloss veya Lake; tezgahlar ise 1. sınıf granit/kuvars esaslı malzemeden yapılacaktır.</li>
                    <li>Banyolarda gömme rezervuar, TSE belgeli armatürler, duşakabin ve suya dayanıklı banyo dolabı uygulanacaktır. İç kapılar PVC kaplamalı veya Lake ahşap kapı olacaktır.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* SECTION 05 */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-amber-800 text-xs sm:text-sm border-b-2 border-amber-100 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-amber-500 font-mono">05.</span> MEKANİK, ELEKTRİK VE ASANSÖR STANDARTLARI
              </h3>
              
              <div className="pl-1 sm:pl-3 space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-amber-500 pl-2.5 text-xs">
                    Asansör Sistemlerinde Esneklik
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Binaya tesis edilecek asansörler; ilgili belediye imar mevzuatına, Asansör Yönetmeliği'ne ve TSE standartlarına tam uygun, yeşil etiketli olacaktır.</li>
                  </ul>
                  <div className="bg-amber-50/70 border border-amber-100 border-l-4 border-l-amber-500 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed mt-2">
                    <span className="font-bold text-amber-800">Proje Çeşitliliği / Esneklik:</span> Asansörün kişi kapasitesi, taşıma tonajı (örn. 630 kg / 8 kişilik veya parsele/binaya özel mimari kuyu boyutlarına göre 4-6 kişilik alternatifler) ve kabin tasarımı; her binanın arsa oturumuna, kat sayısına ve ruhsat projesine göre değişkenlik gösterir. Sabit bir kişi sayısı dayatılmaz.
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-amber-500 pl-2.5 text-xs">
                    Isıtma, Elektrik ve Güvenlik Altyapısı
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Her bağımsız bölümde bağımsız kombili doğalgaz ısıtma altyapısı, radyatörler ve klima tesisat altyapısı bulunacaktır.</li>
                    <li>Tüm elektrik tesisatında TSE belgeli kablolar, kaçak akım röleleri, merkezi uydu ve fiber internet altyapısı kurulacaktır.</li>
                    <li>Audio marka görüntülü diafon sistemi ve bina çevresi güvenlik kamera altyapısı tesis edilecektir.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* SECTION 06 */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-amber-800 text-xs sm:text-sm border-b-2 border-amber-100 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-amber-500 font-mono">06.</span> YIKIM VE UYGULAMA ESASLARI
              </h3>
              
              <div className="pl-1 sm:pl-3 space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 border-l-2 border-amber-500 pl-2.5 text-xs">
                    Yıkım ve Proje Yönetimi
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Eski binaların yıkımı, yasal ruhsatlar alındıktan sonra iş güvenliği kurallarına tam uygun olarak AB YAPI güvencesiyle gerçekleştirilecektir. Hafriyat ve yıkım maliyetleri yükleniciye aittir.</li>
                    <li>Tüm imalatlar onaylı mimari, statik ve tesisat projeleri ile yapı denetim denetiminde yürütülecektir. Yüklenici, kalite standardından ödün vermemek şartıyla eşdeğer muadil malzeme uygulama hakkına sahiptir.</li>
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
              İşbu Teknik Şartname, AB YAPI kentsel dönüşüm projelerinde uygulanacak asgari kalite standartlarını ve parsele özel projeye göre şekillenebilecek esnek yapısal çeşitlilikleri resmi olarak belirlemektedir.
            </div>

            {/* Signature Blocks */}
            <div className="flex justify-between pt-10 px-6 text-xs text-slate-700">
              <div className="text-center">
                <p className="font-semibold mb-14 text-slate-900">KAT MALİKLERİ ONAYI</p>
                <p className="text-slate-500">.... / .... / 2026</p>
              </div>
              <div className="text-center">
                <p className="font-semibold mb-14 text-slate-900">AB YAPI MÜTEAHHİTLİK ONAYI</p>
                <p className="text-slate-500">.... / .... / 2026</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* PROJECT-SPECIFIC DYNAMIC SPECIFICATION */
        <div className="bg-white border border-slate-200 rounded-3xl shadow-md p-6 sm:p-10 text-xs leading-relaxed text-slate-800 print:border-none print:shadow-none print:p-0">
          
          {/* Project Specific Blue Header Bar */}
          <div className="bg-blue-950 text-white rounded-2xl p-6 sm:p-8 mb-6 relative overflow-hidden border border-blue-900 shadow-sm print:bg-slate-900 print:text-white">
            <div className="absolute right-0 top-0 opacity-10 translate-x-4 -translate-y-4">
              <Logo size="xl" variant="icon" theme="dark" />
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/30 text-blue-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  <Building className="w-3.5 h-3.5" />
                  PROJEYE ÖZEL YAPIM ŞARTNAMESİ
                </span>
                <h1 className="text-base sm:text-xl font-black tracking-wide text-white uppercase mt-1">
                  {projectTitle}
                </h1>
                <p className="text-[11px] text-blue-200">
                  {projectSubtitle}
                </p>
              </div>
              
              <div className="bg-white/10 p-2 rounded-xl border border-white/15 shrink-0 print:bg-slate-800">
                <Logo size="md" variant="compact" theme="dark" />
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-white/10 text-[10px] text-blue-100 font-mono">
              <div className="col-span-2 sm:col-span-1">
                <span className="block text-blue-300 font-sans text-[9px] uppercase">PROJE ADRESİ</span>
                <strong>{params.projectAddress || 'İstanbul'}</strong>
              </div>
              <div>
                <span className="block text-blue-300 font-sans text-[9px] uppercase">TOPLAM BAĞIMSIZ BÖLÜM</span>
                <strong>{results.flatCount} Daire</strong>
              </div>
              <div>
                <span className="block text-blue-300 font-sans text-[9px] uppercase">TAHMİNİ YAPIM SÜRESİ</span>
                <strong>{results.finalMonths} Ay</strong>
              </div>
              <div>
                <span className="block text-blue-300 font-sans text-[9px] uppercase">TAAHHÜT TARİHİ</span>
                <strong>Eylül 2026</strong>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* C-01 */}
            <div>
              <h3 className="font-extrabold text-indigo-900 text-xs sm:text-sm border-b-2 border-slate-200 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-indigo-600 font-mono">01.</span> PROJE GENEL METRAJ KÜNYESİ
              </h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Proje Konumu (Adres)</span>
                  <p className="text-xs font-semibold text-slate-800">{params.projectAddress}</p>
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
                    {results.baseArea.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} m²
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Toplam Kapalı İnşaat Alanı</span>
                  <p className="text-xs font-semibold text-slate-800 font-mono">
                    {results.totalArea.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} m²
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Kat Yapısı</span>
                  <p className="text-xs font-semibold text-slate-800">
                    {params.floorCount} Kat {params.hasGroundFloorShop ? "(Zemin Kat Dükkanlı)" : "(Tamamı Konut)"}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Bağımsız Bölüm Sayısı</span>
                  <p className="text-xs font-semibold text-slate-800">{results.flatCount} Daire</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Daire Tipi (Oda + Salon Sayısı)</span>
                  <p className="text-xs font-semibold text-indigo-600 font-bold font-mono">
                    {params.roomType || '3+1'} ({params.roomType === '1+1' ? '1 Oda, 1 Salon' : params.roomType === '2+1' ? '2 Oda, 1 Salon' : params.roomType === '3+1' ? '3 Oda, 1 Salon' : params.roomType === '4+1' ? '4 Oda, 1 Salon' : params.roomType})
                  </p>
                </div>
              </div>
            </div>

            {/* C-02 */}
            <div>
              <h3 className="font-extrabold text-indigo-900 text-xs sm:text-sm border-b-2 border-slate-200 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-indigo-600 font-mono">02.</span> TAŞIYICI SİSTEM MÜHENDİSLİK METRAJLARI
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
                      {results.concreteM3.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} m³
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
                      {results.steelTon.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} Ton
                    </p>
                    <span className="text-[10px] text-blue-600 font-semibold">S420 Nervürlü Demir</span>
                  </div>
                </div>
              </div>
            </div>

            {/* C-03 */}
            <div>
              <h3 className="font-extrabold text-indigo-900 text-xs sm:text-sm border-b-2 border-slate-200 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-indigo-600 font-mono">03.</span> CEPHE, DIŞ GEOMETRİ VE MİMARİ BİLEŞENLER
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
                        Derinlik: {params.cantileverDepth}m
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-1 uppercase">
                        Yön: {params.cantileverDirection === 'front_back' ? 'Ön-Arka' : params.cantileverDirection === 'front' ? 'Ön Cephe' : 'Ayrık / Tüm Cepheler'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start justify-between gap-4">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Mimari Çatı Konstrüksiyonu</span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">
                      Çatı tipi <span className="font-bold text-indigo-700">{params.roofType === 'gable' ? "Beşik Çatı" : params.roofType === 'flat' ? "Düz Teras Çatı" : params.roofType === 'mansard' ? "Mansard Çatı" : "Dubleks Teras Çatı"}</span> olarak projelendirilmiştir.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 bg-amber-100 text-amber-800 font-semibold rounded-lg text-[10px] uppercase">
                      {params.roofType === 'flat' ? 'Teras Yalıtımlı' : 'Karkas Kaplama'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* C-04 */}
            <div>
              <h3 className="font-extrabold text-indigo-900 text-xs sm:text-sm border-b-2 border-slate-200 pb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-indigo-600 font-mono">04.</span> HAK SAHİBİ MALİKLER KATILIM TABLOSU
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
                        <td className="p-3 font-medium text-slate-900">{flat.name}</td>
                        <td className="p-3 font-mono text-slate-500">{flat.tc}</td>
                        <td className="p-3 text-right font-semibold font-mono">{flat.area} m²</td>
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

            {/* Signature Blocks */}
            <div className="flex justify-between pt-10 px-6 text-xs text-slate-700">
              <div className="text-center">
                <p className="font-semibold mb-14 text-slate-900">KAT MALİKLERİ ONAYI</p>
                <p className="text-slate-500">.... / .... / 2026</p>
              </div>
              <div className="text-center">
                <p className="font-semibold mb-14 text-slate-900">AB YAPI MÜTEAHHİTLİK ONAYI</p>
                <p className="text-slate-500">.... / .... / 2026</p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
