import React, { useState, useRef } from 'react';
import { Cloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { ProjectParams, CalculationResult, AppTheme } from '../types';
import { saveReportDocumentToDrive } from '../services/drive';
import { generateContractHtml } from '../utils/reportExport';
import { exportElementToPdf, printHtmlContent } from '../utils/pdfExport';
import { PrintAndPdfButtons } from './PrintAndPdfButtons';
import { Logo } from './Logo';
import { useCompanyProfile } from '../context/CompanyProfileContext';

interface ContractTabProps {
  params: ProjectParams;
  results: CalculationResult;
  hasToken: boolean;
  onOpenDrivePanel: () => void;
  theme?: AppTheme;
}

export const ContractTab: React.FC<ContractTabProps> = ({
  params,
  results,
  hasToken,
  onOpenDrivePanel,
  theme = 'light',
}) => {
  const { profile } = useCompanyProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const contractRef = useRef<HTMLDivElement>(null);

  const isGray = theme === 'gray';

  const contractTitle =
    params.projectModel === 'contractorShare'
      ? 'ARSA PAYI KARŞILIĞI İNŞAAT VE GAYRİMENKUL SATIŞ VAADİ SÖZLEŞMESİ'
      : params.transformationStatus !== 'none'
      ? '6306 SAYILI KANUN KAPSAMINDA KENTSEL DÖNÜŞÜM BİNA YAPIM SÖZLEŞMESİ'
      : 'ÖZ KAYNAKLI BİNA YAPIM VE TAAHHÜT SÖZLEŞMESİ';

  const handleExportPdf = async () => {
    if (!contractRef.current) return;
    const safeAddr = params.projectAddress.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').slice(0, 25);
    const safeName = (profile.companyName || 'AB_YAPI').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_');
    const fileName = `${safeName}_Resmi_Sozlesme_${safeAddr || 'Proje'}_${new Date().toISOString().slice(0, 10)}.pdf`;
    await exportElementToPdf(contractRef.current, fileName);
  };

  const handlePrint = () => {
    const html = generateContractHtml(params, results, profile);
    const safeName = (profile.companyName || 'AB_YAPI').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_');
    printHtmlContent(html, `${safeName}_Resmi_Sozlesme_${params.projectAddress || 'Proje'}`);
  };

  const handleSaveToDrive = async () => {
    if (!hasToken) {
      onOpenDrivePanel();
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);
    try {
      const html = generateContractHtml(params, results, profile);
      const safeAddr = params.projectAddress.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').slice(0, 25);
      const safeName = (profile.companyName || 'AB_YAPI').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_');
      const fileName = `${safeName}_Sozlesme_${safeAddr}_${new Date().toISOString().slice(0, 10)}.html`;
      const res = await saveReportDocumentToDrive(
        fileName,
        html,
        `${profile.companyName} Resmi İnşaat Sözleşmesi - ${params.projectAddress}`
      );
      setSaveStatus({
        type: 'success',
        msg: `Sözleşme belgesi Google Drive'a başarıyla kaydedildi: "${res.name}"`,
      });
    } catch (err: any) {
      setSaveStatus({ type: 'error', msg: err.message || 'Drive kaydı başarısız oldu.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl border shadow-sm print:hidden ${
          isGray ? 'bg-slate-100/90 border-slate-300' : 'bg-white border-slate-200'
        }`}
      >
        <div>
          <h3 className={`font-semibold text-sm ${isGray ? 'text-slate-900' : 'text-slate-800'}`}>
            Resmi İnşaat Yapım Sözleşmesi
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            TBK m. 478 ve 6306 sayılı kanun hükümlerine tam uyumlu 11 maddelik hukuki sözleşme metni
          </p>
        </div>
        <div className="flex items-center gap-2.5">
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
            theme={theme}
          />
        </div>
      </div>

      {saveStatus && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 print:hidden border ${
            saveStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
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

      {/* Contract Document Content */}
      <div
        ref={contractRef}
        className={`border rounded-3xl p-6 sm:p-10 shadow-sm text-xs leading-relaxed text-slate-700 text-justify print:bg-white print:border-none print:shadow-none print:p-0 print:text-black ${
          isGray ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-6 print:border-slate-300">
          <div className="flex items-center gap-3">
            <Logo size="lg" variant="full" theme={theme} />
          </div>
          <div className="text-center sm:text-right">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">
              {contractTitle}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Tarih: {results.calculatedAt} | Belge No: {profile.companyName}-{new Date().getFullYear()}/SÖZ-01
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-2 text-xs uppercase">
            BÖLÜM I: TARAFLAR VE PROJE TANIMI
          </h3>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">MADDE 1: TARAFLAR</h4>
            <p className="text-slate-700">
              İşbu Sözleşme, aşağıda bilgileri yer alan taraflar arasında 6306 sayılı Afet Riski Altındaki Alanların Dönüştürülmesi Hakkında Kanun ve Türk Borçlar Kanunu hükümleri çerçevesinde imza altına alınmıştır:
            </p>
            <p className="mt-2 text-slate-700">
              <strong className="text-slate-900">1. YÜKLENİCİ (MÜTEAHHİT):</strong> {profile.legalName} ({profile.address || 'İstanbul'})
              {profile.taxOffice && profile.taxNumber ? ` [${profile.taxOffice} - V.No: ${profile.taxNumber}]` : ''} - Yetkili Temsilci: {profile.authorizedPerson} ({profile.authorizedTitle})
            </p>
            <p className="text-slate-700">
              <strong className="text-slate-900">2. İŞ SAHİBİ / KAT MALİKLERİ:</strong> İşbu Sözleşme'nin ayrılmaz parçası olan Ek-1 Hak Sahipleri Listesi'nde isim ve T.C. Kimlik numaraları yer alan gayrimenkul malikleri.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">MADDE 2: SÖZLEŞME KONUSU VE GAYRİMENKUL BİLGİLERİ</h4>
            <p className="text-slate-700">
              İşbu sözleşmenin konusu; Tapuda <strong className="text-indigo-700">{params.projectAddress}</strong> adresinde kayıtlı bulunan taşınmaz üzerindeki mevcut yapının yıkılması, yerine yürürlükteki imar mevzuatına ve onaylı mimari/statik projesine uygun olarak; taban oturumu <strong className="text-slate-900 font-mono">{results.baseArea.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} m²</strong>, toplam brüt inşaat alanı <strong className="text-slate-900 font-mono">{results.totalArea.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} m²</strong> olan ve toplam <strong className="text-slate-900 font-mono">{params.hasGroundFloorShop ? `${results.flatCount + (params.shopCount || 1)} Adet (${results.flatCount} Daire, ${params.shopCount || 1} Dükkan)` : `${results.flatCount} Adet (${results.flatCount} Daire, 0 Dükkan)`} bağımsız bölümden</strong> oluşan yeni binanın Yüklenici tarafından anahtar teslim imal edilmesi ve hakediş esaslarının düzenlenmesidir.
            </p>
          </div>

          <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-2 text-xs uppercase pt-2">
            BÖLÜM II: MALİ HÜKÜMLER, DÖNÜŞÜM DESTEKLERİ VE HAKEDİŞLER
          </h3>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">MADDE 3: PROJE İMALAT BEDELİ VE ENFLASYON UYARLAMASI</h4>
            <p className="text-slate-700">
              Projede yer alan bağımsız bölümlerin kâr dahil birim imalat fiyatı <strong className="text-slate-900 font-mono">{results.grossCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²</strong> olarak tespit edilmiştir. Toplam proje yapım bedeli <strong className="text-emerald-700 font-mono">{results.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</strong>'dir. Maliklerin daire başı yapacağı ödemeler inşaatın fiziki ilerleme seviyesine (hakedişe) göre tahsil edilir. Vadesinde ödenmeyen tutarlara TÜİK Yİ-ÜFE oranında fark yansıtılır.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">MADDE 4: KENTSEL DÖNÜŞÜM DESTEK MODELİ VE HARÇ MUAFİYETLERİ</h4>
            <p className="text-slate-700">
              İşbu proje 6306 sayılı Afet Riski Altındaki Alanların Dönüştürülmesi Hakkında Kanun kapsamında yürütülmektedir. Projede kamu hibe ve kredi desteği mekanizmaları uygulanacaktır. İlgili kamu hibeleri ve banka kredileri topluca müteahhide ödenmeyip, Çevre ve Şehircilik Bakanlığı ile banka ekspertiz yetkililerinin şantiyede onayladığı fiziki tamamlanma oranlarına göre Yüklenici hesabına aktarılır. 6306 sayılı Kanun'un sağladığı Tapu Harcı, Damga Vergisi, Noter Harçları ve Belediye Ruhsat Harç muafiyetleri aynen uygulanır.
            </p>
          </div>

          <div>
            {params.paymentPlanType === 'installments' ? (
              <>
                <h4 className="font-semibold text-slate-900 text-xs mb-1.5">MADDE 5: AYLIK EŞİT TAKSİTLİ ÖDEME PLANI VE VADE ESASLARI</h4>
                <p className="text-slate-700">
                  Müteahhite yapılacak ödemeler, kat maliklerinin peşinat ve kentsel dönüşüm destekleri mahsup edildikten sonra kalan net borç tutarları üzerinden toplam <strong className="text-indigo-700 font-mono">{params.installmentCount || 12} eşit aylık taksite</strong> bölünerek tahsil edilecektir:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1.5 text-slate-700">
                  <li>
                    <strong className="text-slate-900">Peşinat ve Başlangıç:</strong> Sözleşme imza ve ruhsat aşamasında kararlaştırılan peşinat tutarları peşinen tahsil edilir.
                  </li>
                  <li>
                    <strong className="text-slate-900">Aylık Vade Günü:</strong> Taksitler her takvim ayının ilk 5 (beş) iş günü içerisinde Yüklenici'nin bildireceği resmi banka hesabına yatırılacaktır.
                  </li>
                  <li>
                    <strong className="text-slate-900">Gecikme Hali:</strong> Mücbir sebep olmaksızın vadesinde ödenmeyen taksitlere yasal temerrüt faizi ve enflasyon farkı yansıtılır. Üst üste 2 (iki) taksit ödenmemesi halinde kalan tüm bakiye muaccel hale gelir.
                  </li>
                </ul>
              </>
            ) : params.paymentPlanType === 'hybrid' ? (
              <>
                <h4 className="font-semibold text-slate-900 text-xs mb-1.5">MADDE 5: KARMA (HİBRİT) ÖDEME PLANI VE HAKEDİŞ ESASLARI</h4>
                <p className="text-slate-700">
                  Müteahhite yapılacak ödemeler peşinat, inşaat ilerleme ara ödemeleri ve aylık taksitlerin kombinasyonu ile gerçekleştirilir:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1.5 text-slate-700">
                  <li>
                    <strong className="text-slate-900">1. Peşinat:</strong> Sözleşme imzasında belirlenen tutar.
                  </li>
                  <li>
                    <strong className="text-slate-900">2. Kaba İnşaat Ara Ödemesi (%25):</strong> Taşıyıcı betonarme sistem ve duvarların tamamlanmasında.
                  </li>
                  <li>
                    <strong className="text-slate-900">3. İskân Ara Ödemesi (%15):</strong> İskân ruhsatının alınması ve teslim aşamasında.
                  </li>
                  <li>
                    <strong className="text-slate-900">4. Aylık Taksitler (%60):</strong> Kalan bakiye toplam <strong className="text-indigo-700 font-mono">{params.installmentCount || 12} eşit aylık taksite</strong> bölünerek tahsil edilir.
                  </li>
                </ul>
              </>
            ) : (
              <>
                <h4 className="font-semibold text-slate-900 text-xs mb-1.5">MADDE 5: DİNAMİK FİZİKİ İLERLEME HAKEDİŞ ORANLARI</h4>
                <p className="text-slate-700">Müteahhite yapılacak hakediş ödemeleri aşağıdaki 5 fiziki aşama takvimine göre gerçekleştirilir:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1.5 text-slate-700">
                  <li>
                    <strong className="text-slate-900">1. Hakediş (%{params.stage1Pay}):</strong> Sözleşmenin karşılıklı olarak imzalanması, ruhsat ve imar projelerinin hazırlanması aşamasında.
                  </li>
                  <li>
                    <strong className="text-slate-900">2. Hakediş (%{params.stage2Pay}):</strong> Binanın hafriyatının tamamlanıp radye temel ve subasman seviyesinin betonarme vizesinin alınması anında.
                  </li>
                  <li>
                    <strong className="text-slate-900">3. Hakediş (%{params.stage3Pay}):</strong> Betonarme karkas, kat tabliyeleri ve tuğla duvar örümünün (Kaba İnşaat) eksiksiz tamamlanmasında.
                  </li>
                  <li>
                    <strong className="text-slate-900">4. Hakediş (%{params.stage4Pay}):</strong> Çatı izolasyonları, cephe mantolama, elektrik/su/gaz tesisatları ile sıva ve doğrama aşamasında (Varsa banka kredi/hibe aktarımı bu aşamada gerçekleşir).
                  </li>
                  <li>
                    <strong className="text-slate-900">5. Hakediş (%{params.stage5Pay}):</strong> Yapı Kullanım İzin Belgesi'nin (İskân) belediyeden alınması ve bağımsız bölümlerin anahtar teslim kabulünde.
                  </li>
                </ul>
              </>
            )}
          </div>

          <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-2 text-xs uppercase pt-2">
            BÖLÜM III: TAHLİYE, YIKIM, SÜRE VE İŞ GÜVENLİĞİ
          </h3>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">MADDE 6: BİNANIN TAHLİYESİ VE DEMİRBAŞLAR</h4>
            <p className="text-slate-700">
              İş Sahibi / Kat Malikleri veya kiracıları, yıkım ruhsatı alınmasını müteakip en geç 30 gün içerisinde binayı boş teslim edecektir. Dairelerde yer alan kombi, petek, çelik kapı ve sökülebilir demirbaş malzemeler yıkım sözleşmesi gereğince yıkıcı firmaya verilmek üzere <strong className="text-slate-900">Yüklenici Uhdesinde</strong> kalacaktır.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">MADDE 7: İNŞAAT SÜRESİ VE MÜCBİR SEBEPLER</h4>
            <p className="text-slate-700">
              İnşaatın proje çizimleri, belediye ruhsatı, kaba/ince imalatı ve iskân vizesi dahil toplam teslim süresi <strong className="text-slate-900 font-mono">{results.finalMonths} Ay</strong> olarak kararlaştırılmıştır. Aşırı hava koşulları, resmi kurum onay gecikmeleri ve altyapı kurumlarından kaynaklanan aksamalar teslim süresine eklenir.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">MADDE 8: İŞ SAĞLIĞI VE SGK YÜKÜMLÜLÜKLERİ</h4>
            <p className="text-slate-700">
              Yüklenici, 4857 sayılı İş Kanunu ve İş Sağlığı Tüzüğü hükümlerine uymak zorundadır. Şantiyede meydana gelebilecek iş kazalarından ve 3. şahıslara verilebilecek zararlardan tamamen Yüklenici sorumludur. Tüm personelin SGK primleri ve All-Risk sigortası Yüklenici tarafından karşılanacaktır.
            </p>
          </div>

          <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-2 text-xs uppercase pt-2">
            BÖLÜM IV: HUKUKİ GARANTİ SÜRELERİ (TBK m. 478)
          </h3>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">MADDE 9: MALZEME SEÇİMİ VE DEĞİŞİKLİKLER</h4>
            <p className="text-slate-700">
              Yüklenici binayı 1. sınıf TSE belgeli malzemelerle inşa edecektir. Malikler teknik şartname dışında farklı malzeme seçerse, Yüklenici'ye malzeme farkı ile birlikte <strong className="text-slate-900">%10 müteahhitlik uygulama bedeli</strong> ödeyerek değişiklik yaptırabilir.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">MADDE 10: MEVZUATA UYGUN GARANTİ SÜRELERİ</h4>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-slate-700">
              <li>
                <strong className="text-slate-900">Ağır Kusur ve Gizli Ayıplar (Taşıyıcı Sistem, Beton, Demir):</strong> 20 (Yirmi) Yıl Garanti.
              </li>
              <li>
                <strong className="text-slate-900">Açık Ayıplar ve Genel İmalat Kusurları:</strong> 5 (Beş) Yıl Garanti.
              </li>
              <li>
                <strong className="text-slate-900">Mekanik, Elektrik Donanım ve Kombi/Asansör Cihazları:</strong> Üretici garantisi uyarınca 2 (İki) Yıl Garanti.
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">MADDE 11: İHTİLAFLARIN ÇÖZÜMÜ</h4>
            <p className="text-slate-700">
              İşbu Sözleşmeden doğabilecek uyuşmazlıklarda <strong className="text-slate-900">İstanbul Mahkemeleri ve İcra Daireleri</strong> yetkilidir.
            </p>
          </div>

          {/* Ek-1 Table */}
          <div className="pt-2">
            <h4 className="font-semibold text-indigo-700 text-xs mb-3 uppercase">
              BÖLÜM V: EK-1 HAK SAHİPLERİ VE BAĞIMSIZ BÖLÜM DAĞILIM LİSTESİ
            </h4>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3 border-b border-slate-200 font-semibold">Daire No</th>
                    <th className="p-3 border-b border-slate-200 font-semibold">Hak Sahibi Adı</th>
                    <th className="p-3 border-b border-slate-200 font-semibold">T.C. Kimlik No</th>
                    <th className="p-3 border-b border-slate-200 font-semibold">Alan</th>
                    <th className="p-3 border-b border-slate-200 font-semibold">Toplam Bedel</th>
                    <th className="p-3 border-b border-slate-200 font-semibold">Peşinat</th>
                    <th className="p-3 border-b border-slate-200 font-semibold">Kalan Borç</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.flatResults.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">Daire {f.id}</td>
                      <td className="p-3 text-slate-900">{f.name}</td>
                      <td className="p-3 text-slate-500 font-mono">{f.tc}</td>
                      <td className="p-3 text-slate-700 font-mono">{f.area} m²</td>
                      <td className="p-3 text-slate-900 font-mono">
                        {f.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 text-slate-600 font-mono">{f.downPayment.toLocaleString('tr-TR')} TL</td>
                      <td className="p-3 font-bold text-slate-900 font-mono">
                        {f.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures */}
          <div className="flex justify-between pt-10 px-6 text-xs text-slate-700">
            <div className="text-center">
              <p className="font-semibold mb-14 text-slate-900">ARSA SAHİPLERİ / KAT MALİKLERİ</p>
              <p className="text-slate-400">.... / .... / 2026</p>
            </div>
            <div className="text-center">
              <p className="font-semibold mb-1 text-slate-900">YÜKLENİCİ KAŞE / İMZA</p>
              <p className="text-[11px] text-slate-500 mb-10 leading-tight">
                {profile.legalName}
                <br />
                {profile.authorizedPerson} ({profile.authorizedTitle})
              </p>
              <p className="text-slate-400">.... / .... / 2026</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
