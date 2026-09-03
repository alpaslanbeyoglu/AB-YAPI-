import React, { useState } from 'react';
import { Printer, Cloud, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const isGray = theme === 'gray';

  const specTitle =
    params.projectModel === 'contractorShare'
      ? 'KAT KARŞILIĞI İNŞAAT YAPIM TEKNİK ŞARTNAMESİ'
      : 'BİNA YAPIM VE TEKNİK UYGULAMA ŞARTNAMESİ';

  const generateSpecHtml = () => {
    return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${specTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; color: #111; max-width: 1000px; margin: 0 auto; line-height: 1.8; font-size: 13px; }
    h2 { color: #37474f; text-align: center; }
    h3 { color: #1f7a7a; border-bottom: 2px solid #1f7a7a; padding-bottom: 4px; margin-top: 25px; font-size: 14px; text-transform: uppercase; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <h2>${specTitle}</h2>
  <p><strong>Paket Tipi:</strong> STANDART YÜKSEK KALİTE KONUT TEKNİK ŞARTNAMESİ (V01-STD)</p>
  <p>Bu şartname AB YAPI projesindeki dairelerin genel tasarım ve uygulama prensiplerini, kullanılacak sistem ve malzemelerin genel hatlarını tariflemektedir.</p>
  
  <h3>BÖLÜM 1: APARTMAN GENELİ VE İMAR ESASLARI</h3>
  <p>1.1. Yerleşimimizde ilgili bloklarda projesine uygun toplam <strong>${results.flatCount} adet</strong> daire bağımsız bölüm bulunacaktır.</p>
  <p>1.2. Proje ruhsat aşamasında doğabilecek imar değişiklikleri kat maliklerine metrekare oranında aynen yansıtılacaktır.</p>
  <p>1.3. Kullanılacak tüm malzemeler, 1. sınıf T.S.E. (Türk Standartları Enstitüsü) normlarında olacaktır.</p>

  <h3>BÖLÜM 2: YAPI STRÜKTÜRÜ VE GEOTEKNİK İMALATLAR</h3>
  <p>2.1. En son deprem yönetmeliğine uygun radye jeneral temel, projesine uygun C30/35 sınıfı beton ve demir donatılarla betonarme karkas yapı inşa edilecektir.</p>
  <p>2.2. Bölücü duvarlar: Kilsan marka kilitli tuğla, kara sıva (kaba sıva) ve pürüzsüz alçı sıva üzeri imal edilecektir.</p>
  <p>2.3. Altyapı ve yeraltı suları için drenaj tahliye sistemi uygulanacaktır.</p>

  <h3>BÖLÜM 3: DIŞ CEPHE KAPLAMA VE YALITIM</h3>
  <p>3.1. Isı yalıtım levhaları ile mantolanan betonarme perde, tuğla ve kara sıva dış duvar yapı elemanları üzeri dış cephe boyası ve dekoratif kaplama elemanları ile kaplanacaktır.</p>

  <h3>BÖLÜM 4: ÇATI STRÜKTÜRÜ VE İZOLASYON</h3>
  <p>4.1. Bina çatısı projesine uygun olarak ahşap, betonarme veya demir karkas olarak yapılacaktır.</p>
  <p>4.2. Çatı izolasyonu: 15 mm OSB + membran + dekoratif shingle düzeninde olacaktır. İç taraftan taş yünü veya püskürtme poliüretan köpük uygulanacaktır.</p>

  <h3>BÖLÜM 5: İÇ - DIŞ DOĞRAMA VE GÜVENLİK SİSTEMLERİ</h3>
  <p>5.1. Dış cephelerde, projesine uygun Pimapen, Fıratpen veya Adopen marka pencereler takılacaktır.</p>
  <p>5.2. Daire giriş kapıları, monoblok kilitli çelik kapı olacaktır. Mercekli dürbün ve güvenlik kancası bulunacaktır.</p>
  <p>5.3. Bina dış giriş kilit sistemi anahtarlı ve panelden şifreli girişe ek olarak NFC veya manyetik tag özellikli olacaktır.</p>

  <h3>BÖLÜM 6: DÖŞEME, İÇ DUVAR VE TAVAN KAPLAMALARI</h3>
  <p>6.1. Giriş Holü ve Koridorlar: 1. Sınıf seramik (Yurtbay, Ege veya Çanakkale); Duvarlar su bazlı saten boya (Jotun veya Marshall).</p>
  <p>6.2. Salon ve Odalar: Döşemeler AGT veya Çamsan laminat parke; Duvarlar saten alçı sıva üzeri boya.</p>
  <p>6.3. Mutfak: Seramik döşeme; 1. sınıf laminat/akrilik mutfak dolapları; paslanmaz çelik eviye; aç-kapa miks batarya.</p>
  <p>6.4. Banyolar: 1. sınıf seramik kaplama; şeffaf temperli cam duşakabin; gömme rezervuarlı asma klozet (Vitra / Serel / E.C.A.).</p>

  <h3>BÖLÜM 7: TESİSAT VE DONANIMLAR</h3>
  <p>7.1. Bireysel doğalgaz kombili ısıtma sistemi tesisatı ve panel radyatörler takılacaktır.</p>
  <p>7.2. Görüntülü diafon sistemi (Audio veya muadili), merkezi TV uydu altyapısı kurulacaktır.</p>
  <p>7.3. Asansör: TSE ve CE standartlarında, tam otomatik kapılı kat kurtarma sistemli yolcu asansörü tesis edilecektir.</p>

  <br><br>
  <table style="width: 100%; margin-top: 40px; border-collapse: collapse;">
    <tr>
      <td style="width: 50%; text-align: center; vertical-align: top;">
        <strong>KAT MALİKLERİ ONAYI</strong><br><br><br><br>
        İmza: .......................................
      </td>
      <td style="width: 50%; text-align: center; vertical-align: top;">
        <strong>AB YAPI MÜTEAHHİTLİK</strong><br><br><br><br>
        Kaşe / İmza: .......................................
      </td>
    </tr>
  </table>
</body>
</html>`;
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
      const fileName = `Teknik_Sartname_${params.projectAddress.replace(/\s+/g, '_') || 'Proje'}.html`;
      await saveReportDocumentToDrive(
        fileName,
        htmlContent,
        `AB YAPI Teknik Şartname - ${params.projectAddress}`
      );
      setSaveStatus({
        type: 'success',
        msg: 'Teknik şartname Google Drive hesabınıza başarıyla kaydedildi.',
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
  const subCardBg = isGray
    ? 'bg-white border-slate-300 text-slate-800'
    : 'bg-slate-50 border-slate-200 text-slate-800';
  const textMuted = 'text-slate-500';

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className={`flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl border print:hidden shadow-sm ${cardBg}`}>
        <div>
          <h3 className="font-semibold text-sm text-slate-900">Teknik Şartname Belgesi</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Malzeme standartları, marka listesi ve yapı imalat detaylarını içeren resmi şartname
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

      {/* Specification Content */}
      <div className={`border rounded-3xl p-6 sm:p-10 shadow-sm text-xs leading-relaxed text-slate-700 text-justify print:bg-white print:border-none print:shadow-none print:p-0 print:text-black ${cardBg}`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-6 print:border-slate-300">
          <div className="flex items-center gap-3">
            <Logo size="lg" variant="full" theme={theme} />
          </div>
          <div className="text-center sm:text-right">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">
              {specTitle}
            </h2>
            <p className="text-xs font-semibold text-indigo-600 mt-1">
              STANDART YÜKSEK KALİTE KONUT TEKNİK ŞARTNAMESİ (V01-STD)
            </p>
          </div>
        </div>

        <p className="p-4 rounded-2xl border-l-4 border-indigo-600 italic mb-6 bg-slate-50 border border-slate-200 text-slate-700">
          Bu şartname AB YAPI projesindeki dairelerin genel tasarım ve uygulama prensiplerini, kullanılacak sistem ve malzemelerin genel hatlarını tariflemektedir.
        </p>

        <div className="space-y-5">
          <div>
            <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-1.5 text-xs uppercase mb-2">
              BÖLÜM 1: APARTMAN GENELİ VE İMAR ESASLARI
            </h3>
            <div className="space-y-1 text-slate-700">
              <p>1.1. Yerleşimimizde ilgili bloklarda projesine uygun toplam <strong className="text-slate-900 font-mono">{results.flatCount} adet</strong> daire bağımsız bölüm bulunacaktır.</p>
              <p>1.2. İkinci bodrum katında ilgili Belediye İmar Müdürlüğünün tasdiklediği ruhsat projesine uygun yer bulunması durumunda kapalı/açık otopark yer alacaktır.</p>
              <p>1.3. Proje ruhsat aşamasında doğabilecek imar değişiklikleri (imar durumunun çoğalması veya eksilmesi) kat maliklerine metrekare oranında aynen yansıtılacaktır.</p>
              <p>1.4. Kullanılacak tüm malzemeler, 1. sınıf T.S.E. normlarında olacaktır.</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-1.5 text-xs uppercase mb-2">
              BÖLÜM 2: YAPI STRÜKTÜRÜ VE GEOTEKNİK İMALATLAR
            </h3>
            <div className="space-y-1 text-slate-700">
              <p>2.1. En son deprem yönetmeliğine uygun radye jeneral temel, C30/35 sınıfı hazır beton ve nervürlü demir donatılarla betonarme karkas yapı inşa edilecektir.</p>
              <p>2.2. Bölücü duvarlar: Kilsan marka kilitli tuğla, kaba kara sıva ve pürüzsüz saten alçı sıva üzeri imal edilecektir.</p>
              <p>2.3. Altyapı ve yeraltı suları için temel çevresinde drenaj tahliye sistemi kurulacaktır.</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-1.5 text-xs uppercase mb-2">
              BÖLÜM 3: DIŞ CEPHE KAPLAMA VE YALITIM
            </h3>
            <p className="text-slate-700">3.1. Dış cephe mimari tasarımı yapılarak kat maliklerinin beğenisine sunulacaktır. Isı yalıtım levhaları ile mantolanan betonarme perde ve tuğla dış duvarlar dekoratif dış cephe kaplamaları ile kaplanacaktır.</p>
          </div>

          <div>
            <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-1.5 text-xs uppercase mb-2">
              BÖLÜM 4: ÇATI STRÜKTÜRÜ VE İZOLASYON
            </h3>
            <div className="space-y-1 text-slate-700">
              <p>4.1. Bina çatısı projesine uygun olarak ahşap, betonarme veya çelik karkas olarak yapılacaktır.</p>
              <p>4.2. Çatı izolasyonu: 15 mm OSB + su yalıtım membranı + dekoratif shingle düzeninde olacaktır. İç taraftan taş yünü veya poliüretan köpük ile ısı/ses yalıtımı sağlanacaktır.</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-1.5 text-xs uppercase mb-2">
              BÖLÜM 5: İÇ - DIŞ DOĞRAMA VE GÜVENLİK SİSTEMLERİ
            </h3>
            <div className="space-y-1 text-slate-700">
              <p>5.1. Dış cephelerde, projesine uygun Pimapen, Fıratpen veya Adopen marka PVC doğrama pencereler ve çift camlı ısı cam takılacaktır.</p>
              <p>5.2. Daire giriş kapıları, monoblok kilit sistemli modern çizgilerde çelik kapı olacaktır. Mercekli dürbün ve güvenlik kancası bulunacaktır.</p>
              <p>5.3. Bina dış giriş kapısı şifreli kilit sistemine ek olarak NFC veya manyetik tag özellikli olacaktır.</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-1.5 text-xs uppercase mb-2">
              BÖLÜM 6: DÖŞEME, İÇ DUVAR VE TAVAN KAPLAMALARI
            </h3>
            <div className="space-y-1 text-slate-700">
              <p>6.1. <strong className="text-slate-900">Giriş Holü ve Koridorlar:</strong> 1. Sınıf seramik (Yurtbay, Ege veya Çanakkale); Duvarlar su bazlı saten boya (Jotun, Marshall veya Filli Boya).</p>
              <p>6.2. <strong className="text-slate-900">Salon ve Odalar:</strong> Döşemeler AGT veya Çamsan marka laminat parke; Duvarlar alçı sıva üzeri Jotun/Marshall boya.</p>
              <p>6.3. <strong className="text-slate-900">Mutfak:</strong> 1. sınıf seramik zemin; MDF gövde mutfak dolapları; ECA veya Artema armatürler.</p>
              <p>6.4. <strong className="text-slate-900">Banyolar:</strong> 1. sınıf seramik döşeme; Temperli 5mm şeffaf cam duşakabin; Gömme rezervuarlı asma klozet (ECA / Serel / Vitra); Suya dayanıklı banyo dolabı.</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-1.5 text-xs uppercase mb-2">
              BÖLÜM 7: SIHHİ TESİSAT, ELEKTRİK VE GÜVENLİK ALTYAPISI
            </h3>
            <div className="space-y-1 text-slate-700">
              <p>7.1. Apartman genelinde her bir daire için bağımsız kombili (E.C.A., Kale vb.) ısıtma sistemi ve doğalgaz kombisi.</p>
              <p>7.2. Yönetmeliğin öngördüğü kapasitede T.S.E. garantili sessiz hidrofor ve paslanmaz su deposu.</p>
              <p>7.3. AUDIO marka görüntülü diafon sistemi, merkezi uydu ve fiber internet altyapısı.</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-1.5 text-xs uppercase mb-2">
              BÖLÜM 8: ASANSÖR VE OTOPARK
            </h3>
            <p className="text-slate-700">8.1. Projede bulunması durumunda TSE standartlarındaki CE belgeli kat kurtarmalı modern asansör montajı yapılıp ruhsatı alınacaktır.</p>
          </div>

          <div>
            <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-1.5 text-xs uppercase mb-2">
              BÖLÜM 9: KENTSEL DÖNÜŞÜM HAKEDİŞ KOŞULLARI
            </h3>
            <p className="text-slate-700">9.1. Devletin kentsel dönüşüm desteğinde hibe ve kredi tutarları fiziki gerçekleşmeye göre hakediş hesabından düşülür.</p>
          </div>

          <div>
            <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-1.5 text-xs uppercase mb-3">
              BÖLÜM 10: KULLANILACAK ONAYLI MARKA LİSTESİ
            </h3>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs p-4 rounded-2xl border ${subCardBg}`}>
              <p><strong className="text-slate-900">PVC Doğrama:</strong> <span className="text-slate-600">PİMAPEN, FIRATPEN, ADOPEN</span></p>
              <p><strong className="text-slate-900">Laminat Parke:</strong> <span className="text-slate-600">ÇAMSAN, AGT</span></p>
              <p><strong className="text-slate-900">Seramik & Fayans:</strong> <span className="text-slate-600">YURTBAY, ÇANAKKALE, EGE</span></p>
              <p><strong className="text-slate-900">Armatür & Batarya:</strong> <span className="text-slate-600">E.C.A., ARTEMA, USO, KALE</span></p>
              <p><strong className="text-slate-900">Vitrifiye & Klozet:</strong> <span className="text-slate-600">E.C.A., SEREL, VİTRA</span></p>
              <p><strong className="text-slate-900">Tuğla & Blok:</strong> <span className="text-slate-600">KİLSAN TUĞLA, ASTOLEN</span></p>
              <p><strong className="text-slate-900">Boya:</strong> <span className="text-slate-600">JOTUN, MARSHALL, FİLLİ BOYA</span></p>
              <p><strong className="text-slate-900">Diafon & İnterkom:</strong> <span className="text-slate-600">AUDIO</span></p>
            </div>
          </div>

          {/* Signatures */}
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
    </div>
  );
};
