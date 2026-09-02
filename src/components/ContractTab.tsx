import React, { useState } from 'react';
import { Printer, Cloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { ProjectParams, CalculationResult } from '../types';
import { saveReportDocumentToDrive } from '../services/drive';
import { generateContractHtml } from '../utils/reportExport';
import { Logo } from './Logo';

interface ContractTabProps {
  params: ProjectParams;
  results: CalculationResult;
  hasToken: boolean;
  onOpenDrivePanel: () => void;
  theme?: 'light' | 'dark';
}

export const ContractTab: React.FC<ContractTabProps> = ({
  params,
  results,
  hasToken,
  onOpenDrivePanel,
  theme = 'dark',
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const contractTitle =
    params.projectModel === 'contractorShare'
      ? 'ARSA PAYI KARŞILIĞI İNŞAAT VE GAYRİMENKUL SATIŞ VAADİ SÖZLEŞMESİ'
      : params.transformationStatus !== 'none'
      ? '6306 SAYILI KANUN KAPSAMINDA KENTSEL DÖNÜŞÜM BİNA YAPIM SÖZLEŞMESİ'
      : 'ÖZ KAYNAKLI BİNA YAPIM VE TAAHHÜT SÖZLEŞMESİ';

  const handleSaveToDrive = async () => {
    if (!hasToken) {
      onOpenDrivePanel();
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);
    try {
      const html = generateContractHtml(params, results);
      const safeAddr = params.projectAddress.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').slice(0, 25);
      const fileName = `AB_YAPI_Sozlesme_${safeAddr}_${new Date().toISOString().slice(0, 10)}.html`;
      const res = await saveReportDocumentToDrive(
        fileName,
        html,
        `AB YAPI Resmi İnşaat Sözleşmesi - ${params.projectAddress}`
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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#121214] p-5 rounded-3xl border border-zinc-800/80 shadow-xl print:hidden">
        <div>
          <h3 className="font-semibold text-sm text-white">Resmi İnşaat Yapım Sözleşmesi</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            TBK m. 478 ve 6306 sayılı kanun hükümlerine tam uyumlu 11 maddelik hukuki sözleşme metni
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSaveToDrive}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 active:scale-95"
          >
            <Cloud className="w-4 h-4" />
            <span>{isSaving ? 'Kaydediliyor...' : "Drive'a Kaydet"}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#18181b] hover:bg-zinc-800 text-zinc-100 border border-zinc-700/80 rounded-xl text-xs font-semibold transition-all active:scale-95"
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
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-red-500/10 text-red-300 border-red-500/30'
          }`}
        >
          {saveStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{saveStatus.msg}</span>
        </div>
      )}

      {/* Contract Document Content */}
      <div className="bg-[#121214] border border-zinc-800/80 rounded-3xl p-6 sm:p-10 shadow-xl text-xs leading-relaxed text-zinc-300 text-justify print:bg-white print:border-none print:shadow-none print:p-0 print:text-black">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800 pb-5 mb-6 print:border-slate-300">
          <div className="flex items-center gap-3">
            <Logo size="lg" variant="full" theme={theme} />
          </div>
          <div className="text-center sm:text-right">
            <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wide print:text-slate-900">
              {contractTitle}
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5 print:text-slate-500 font-mono">
              Tarih: {results.calculatedAt} | Belge No: AB-YAPI-{new Date().getFullYear()}/SÖZ-01
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <h3 className="font-semibold text-indigo-400 border-b border-zinc-800 pb-2 text-xs uppercase print:text-teal-800 print:border-teal-800/30">
            BÖLÜM I: TARAFLAR VE PROJE TANIMI
          </h3>

          <div>
            <h4 className="font-semibold text-white text-xs mb-1.5 print:text-slate-900">MADDE 1: TARAFLAR</h4>
            <p className="text-zinc-300 print:text-slate-700">
              İşbu Sözleşme, aşağıda bilgileri yer alan taraflar arasında 6306 sayılı Afet Riski Altındaki Alanların Dönüştürülmesi Hakkında Kanun ve Türk Borçlar Kanunu hükümleri çerçevesinde imza altına alınmıştır:
            </p>
            <p className="mt-2 text-zinc-300 print:text-slate-700">
              <strong className="text-zinc-100 print:text-slate-900">1. YÜKLENİCİ (MÜTEAHHİT):</strong> AB YAPI MÜTEAHHİTLİK LİMİTED ŞİRKETİ (Fatih Kocamustafapaşa Mah. İstanbul)
            </p>
            <p className="text-zinc-300 print:text-slate-700">
              <strong className="text-zinc-100 print:text-slate-900">2. İŞ SAHİBİ / KAT MALİKLERİ:</strong> İşbu Sözleşme'nin ayrılmaz parçası olan Ek-1 Hak Sahipleri Listesi'nde isim ve T.C. Kimlik numaraları yer alan gayrimenkul malikleri.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white text-xs mb-1.5 print:text-slate-900">MADDE 2: SÖZLEŞME KONUSU VE GAYRİMENKUL BİLGİLERİ</h4>
            <p className="text-zinc-300 print:text-slate-700">
              İşbu sözleşmenin konusu; Tapuda <strong className="text-indigo-400 print:text-slate-900">{params.projectAddress}</strong> adresinde kayıtlı bulunan taşınmaz üzerindeki mevcut yapının yıkılması, yerine yürürlükteki imar mevzuatına ve onaylı mimari/statik projesine uygun olarak; taban oturumu <strong className="text-white font-mono print:text-slate-900">{results.baseArea} m²</strong>, toplam brüt inşaat alanı <strong className="text-white font-mono print:text-slate-900">{results.totalArea} m²</strong> olan ve toplam <strong className="text-white font-mono print:text-slate-900">{results.flatCount} adet bağımsız bölümden</strong> oluşan yeni binanın Yüklenici tarafından anahtar teslim imal edilmesi ve hakediş esaslarının düzenlenmesidir.
            </p>
          </div>

          <h3 className="font-semibold text-indigo-400 border-b border-zinc-800 pb-2 text-xs uppercase pt-2 print:text-teal-800 print:border-teal-800/30">
            BÖLÜM II: MALİ HÜKÜMLER, DÖNÜŞÜM DESTEKLERİ VE HAKEDİŞLER
          </h3>

          <div>
            <h4 className="font-semibold text-white text-xs mb-1.5 print:text-slate-900">MADDE 3: PROJE İMALAT BEDELİ VE ENFLASYON UYARLAMASI</h4>
            <p className="text-zinc-300 print:text-slate-700">
              Projede yer alan bağımsız bölümlerin kâr dahil birim imalat fiyatı <strong className="text-white font-mono print:text-slate-900">{results.grossCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²</strong> olarak tespit edilmiştir. Toplam proje yapım bedeli <strong className="text-emerald-400 font-mono print:text-slate-900">{results.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</strong>'dir. Maliklerin daire başı yapacağı ödemeler inşaatın fiziki ilerleme seviyesine (hakedişe) göre tahsil edilir. Vadesinde ödenmeyen tutarlara TÜİK Yİ-ÜFE oranında fark yansıtılır.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white text-xs mb-1.5 print:text-slate-900">MADDE 4: KENTSEL DÖNÜŞÜM DESTEK MODELİ VE HARÇ MUAFİYETLERİ</h4>
            <p className="text-zinc-300 print:text-slate-700">
              İşbu proje 6306 sayılı Afet Riski Altındaki Alanların Dönüştürülmesi Hakkında Kanun kapsamında yürütülmektedir. Projede kamu hibe ve kredi desteği mekanizmaları uygulanacaktır. İlgili kamu hibeleri ve banka kredileri topluca müteahhide ödenmeyip, Çevre ve Şehircilik Bakanlığı ile banka ekspertiz yetkililerinin şantiyede onayladığı fiziki tamamlanma oranlarına göre Yüklenici hesabına aktarılır. 6306 sayılı Kanun'un sağladığı Tapu Harcı, Damga Vergisi, Noter Harçları ve Belediye Ruhsat Harç muafiyetleri aynen uygulanır.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white text-xs mb-1.5 print:text-slate-900">MADDE 5: DİNAMİK FİZİKİ İLERLEME HAKEDİŞ ORANLARI</h4>
            <p className="text-zinc-300 print:text-slate-700">Müteahhite yapılacak hakediş ödemeleri aşağıdaki 5 fiziki aşama takvimine göre gerçekleştirilir:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-zinc-300 print:text-slate-700">
              <li>
                <strong className="text-zinc-100 print:text-slate-900">1. Hakediş (%{params.stage1Pay}):</strong> Sözleşmenin karşılıklı olarak imzalanması, ruhsat ve imar projelerinin hazırlanması aşamasında.
              </li>
              <li>
                <strong className="text-zinc-100 print:text-slate-900">2. Hakediş (%{params.stage2Pay}):</strong> Binanın hafriyatının tamamlanıp radye temel ve subasman seviyesinin betonarme vizesinin alınması anında.
              </li>
              <li>
                <strong className="text-zinc-100 print:text-slate-900">3. Hakediş (%{params.stage3Pay}):</strong> Betonarme karkas, kat tabliyeleri ve tuğla duvar örümünün (Kaba İnşaat) eksiksiz tamamlanmasında.
              </li>
              <li>
                <strong className="text-zinc-100 print:text-slate-900">4. Hakediş (%{params.stage4Pay}):</strong> Çatı izolasyonları, cephe mantolama, elektrik/su/gaz tesisatları ile sıva ve doğrama aşamasında (Varsa banka kredi/hibe aktarımı bu aşamada gerçekleşir).
              </li>
              <li>
                <strong className="text-zinc-100 print:text-slate-900">5. Hakediş (%{params.stage5Pay}):</strong> Yapı Kullanım İzin Belgesi'nin (İskân) belediyeden alınması ve bağımsız bölümlerin anahtar teslim kabulünde.
              </li>
            </ul>
          </div>

          <h3 className="font-semibold text-indigo-400 border-b border-zinc-800 pb-2 text-xs uppercase pt-2 print:text-teal-800 print:border-teal-800/30">
            BÖLÜM III: TAHLİYE, YIKIM, SÜRE VE İŞ GÜVENLİĞİ
          </h3>

          <div>
            <h4 className="font-semibold text-white text-xs mb-1.5 print:text-slate-900">MADDE 6: BİNANIN TAHLİYESİ VE DEMİRBAŞLAR</h4>
            <p className="text-zinc-300 print:text-slate-700">
              İş Sahibi / Kat Malikleri veya kiracıları, yıkım ruhsatı alınmasını müteakip en geç 30 gün içerisinde binayı boş teslim edecektir. Dairelerde yer alan kombi, petek, çelik kapı ve sökülebilir demirbaş malzemeler yıkım sözleşmesi gereğince yıkıcı firmaya verilmek üzere <strong className="text-zinc-100 print:text-slate-900">Yüklenici Uhdesinde</strong> kalacaktır.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white text-xs mb-1.5 print:text-slate-900">MADDE 7: İNŞAAT SÜRESİ VE MÜCBİR SEBEPLER</h4>
            <p className="text-zinc-300 print:text-slate-700">
              İnşaatın proje çizimleri, belediye ruhsatı, kaba/ince imalatı ve iskân vizesi dahil toplam teslim süresi <strong className="text-white font-mono print:text-slate-900">{results.finalMonths} Ay</strong> olarak kararlaştırılmıştır. Aşırı hava koşulları, resmi kurum onay gecikmeleri ve altyapı kurumlarından kaynaklanan aksamalar teslim süresine eklenir.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white text-xs mb-1.5 print:text-slate-900">MADDE 8: İŞ SAĞLIĞI VE SGK YÜKÜMLÜLÜKLERİ</h4>
            <p className="text-zinc-300 print:text-slate-700">
              Yüklenici, 4857 sayılı İş Kanunu ve İş Sağlığı Tüzüğü hükümlerine uymak zorundadır. Şantiyede meydana gelebilecek iş kazalarından ve 3. şahıslara verilebilecek zararlardan tamamen Yüklenici sorumludur. Tüm personelin SGK primleri ve All-Risk sigortası Yüklenici tarafından karşılanacaktır.
            </p>
          </div>

          <h3 className="font-semibold text-indigo-400 border-b border-zinc-800 pb-2 text-xs uppercase pt-2 print:text-teal-800 print:border-teal-800/30">
            BÖLÜM IV: HUKUKİ GARANTİ SÜRELERİ (TBK m. 478)
          </h3>

          <div>
            <h4 className="font-semibold text-white text-xs mb-1.5 print:text-slate-900">MADDE 9: MALZEME SEÇİMİ VE DEĞİŞİKLİKLER</h4>
            <p className="text-zinc-300 print:text-slate-700">
              Yüklenici binayı 1. sınıf TSE belgeli malzemelerle inşa edecektir. Malikler teknik şartname dışında farklı malzeme seçerse, Yüklenici'ye malzeme farkı ile birlikte <strong className="text-zinc-100 print:text-slate-900">%10 müteahhitlik uygulama bedeli</strong> ödeyerek değişiklik yaptırabilir.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white text-xs mb-1.5 print:text-slate-900">MADDE 10: MEVZUATA UYGUN GARANTİ SÜRELERİ</h4>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-zinc-300 print:text-slate-700">
              <li>
                <strong className="text-zinc-100 print:text-slate-900">Ağır Kusur ve Gizli Ayıplar (Taşıyıcı Sistem, Beton, Demir):</strong> 20 (Yirmi) Yıl Garanti.
              </li>
              <li>
                <strong className="text-zinc-100 print:text-slate-900">Açık Ayıplar ve Genel İmalat Kusurları:</strong> 5 (Beş) Yıl Garanti.
              </li>
              <li>
                <strong className="text-zinc-100 print:text-slate-900">Mekanik, Elektrik Donanım ve Kombi/Asansör Cihazları:</strong> Üretici garantisi uyarınca 2 (İki) Yıl Garanti.
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white text-xs mb-1.5 print:text-slate-900">MADDE 11: İHTİLAFLARIN ÇÖZÜMÜ</h4>
            <p className="text-zinc-300 print:text-slate-700">
              İşbu Sözleşmeden doğabilecek uyuşmazlıklarda <strong className="text-zinc-100 print:text-slate-900">İstanbul Mahkemeleri ve İcra Daireleri</strong> yetkilidir.
            </p>
          </div>

          {/* Ek-1 Table */}
          <div className="pt-2">
            <h4 className="font-semibold text-indigo-400 text-xs mb-3 uppercase print:text-teal-800">
              BÖLÜM V: EK-1 HAK SAHİPLERİ VE BAĞIMSIZ BÖLÜM DAĞILIM LİSTESİ
            </h4>
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 print:border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#18181b] text-zinc-300 print:bg-slate-800 print:text-white">
                  <tr>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">Daire No</th>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">Hak Sahibi Adı</th>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">T.C. Kimlik No</th>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">Alan</th>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">Toplam Bedel</th>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">Peşinat</th>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">Kalan Borç</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 print:divide-slate-200">
                  {results.flatResults.map((f) => (
                    <tr key={f.id} className="hover:bg-zinc-800/30 transition-colors print:hover:bg-slate-50">
                      <td className="p-3 font-semibold text-white print:text-black">Daire {f.id}</td>
                      <td className="p-3 text-zinc-200 print:text-slate-900">{f.name}</td>
                      <td className="p-3 text-zinc-500 font-mono print:text-slate-700">{f.tc}</td>
                      <td className="p-3 text-zinc-300 font-mono print:text-slate-700">{f.area} m²</td>
                      <td className="p-3 text-zinc-200 font-mono print:text-slate-900">
                        {f.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 text-zinc-400 font-mono print:text-slate-600">{f.downPayment.toLocaleString('tr-TR')} TL</td>
                      <td className="p-3 font-bold text-white font-mono print:text-slate-900">
                        {f.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures */}
          <div className="flex justify-between pt-10 px-6 text-xs text-zinc-300 print:text-slate-800">
            <div className="text-center">
              <p className="font-semibold mb-14 text-white print:text-black">ARSA SAHİPLERİ / KAT MALİKLERİ</p>
              <p className="text-zinc-500 print:text-slate-500">.... / .... / 2026</p>
            </div>
            <div className="text-center">
              <p className="font-semibold mb-14 text-white print:text-black">YÜKLENİCİ (AB YAPI MÜTEAHHİTLİK)</p>
              <p className="text-zinc-500 print:text-slate-500">.... / .... / 2026</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
