import React, { useState } from 'react';
import {
  Printer,
  FileText,
  X,
  CheckCircle2,
  Building2,
  UserCheck,
  Calendar,
  ShieldCheck,
  Scale,
  Download,
  Share2,
} from 'lucide-react';
import { ProjectParams, CalculationResult, FlatItem, FlatCalcResult } from '../types';

interface OfficialOwnerReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: ProjectParams;
  results: CalculationResult;
  initialFlatId?: number | null;
}

export const OfficialOwnerReportModal: React.FC<OfficialOwnerReportModalProps> = ({
  isOpen,
  onClose,
  params,
  results,
  initialFlatId,
}) => {
  const [reportType, setReportType] = useState<'individual' | 'collective'>('individual');
  const [selectedFlatId, setSelectedFlatId] = useState<number>(initialFlatId || (params.flats[0]?.id || 1));
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const selectedFlat = params.flats.find((f) => f.id === selectedFlatId) || params.flats[0];
  const selectedCalc = results.flatResults?.find((f) => f.id === selectedFlatId);
  const isContractor = !!(params.contractorFlatIds?.includes(selectedFlat?.id || 0) || selectedFlat?.isContractorShare);

  const ownerFlats = results.flatResults?.filter((f) => !f.isContractorShare) || [];
  const totalOwnerDebt = ownerFlats.reduce((sum, f) => sum + (f.grossPay || 0), 0);
  const totalDownPayments = ownerFlats.reduce((sum, f) => sum + (f.downPayment || 0), 0);
  const totalStateSupport = ownerFlats.reduce((sum, f) => sum + (f.usedCredit || 0), 0);
  const totalRemainingDebt = ownerFlats.reduce((sum, f) => sum + (f.netRemainingDebt || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    if (!selectedFlat || !selectedCalc) return;
    const text = `KAT MALİKİ BİLGİLENDİRME VE ÖDEME TAAHHÜTNAMESİ
--------------------------------------------------
Proje: ${params.projectName || 'Kentsel Dönüşüm ve Konut Projesi'}
Bağımsız Bölüm: Daire No ${selectedFlat.id} (${selectedFlat.area} m²)
Hak Sahibi: ${selectedFlat.name || 'Belirtilmedi'} (TC: ${selectedFlat.tc || '-'})
Toplam İnşaat Maliyeti Katkı Payı: ${selectedCalc.grossPay.toLocaleString('tr-TR')} TL
Tahsil Edilen Peşinat: ${selectedCalc.downPayment.toLocaleString('tr-TR')} TL
Devlet Hibe Desteği (6306 Sayılı Kanun): ${selectedCalc.usedCredit.toLocaleString('tr-TR')} TL
Net Kalan Ödenecek Borç: ${selectedCalc.netRemainingDebt.toLocaleString('tr-TR')} TL
Ödeme Modeli: ${
      params.paymentPlanType === 'installments'
        ? `${params.installmentCount || 12} Ay x ${selectedCalc.monthlyInstallment.toLocaleString('tr-TR')} TL/Ay`
        : '5 Aşamalı Fiziki Hakediş Takvimi'
    }
Tarih: ${new Date().toLocaleDateString('tr-TR')}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:rounded-none print:w-full">
        {/* MODAL ÜST KONTROL ÇUBUĞU (Ekranda görünür, Yazdırmada gizlenir) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide">Resmi A4 Kat Maliki Raporu & Ödeme Protokolü</h2>
              <p className="text-[11px] text-slate-400">Yazdırılabilir, onaylı resmi A4 sözleşme eki ve bilgilendirme çıktısı</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Rapor Tipi Seçici */}
            <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-700">
              <button
                type="button"
                onClick={() => setReportType('individual')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  reportType === 'individual' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Bireysel Taahhütname
              </button>
              <button
                type="button"
                onClick={() => setReportType('collective')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  reportType === 'collective' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Genel Kurul Cetveli
              </button>
            </div>

            {/* Daire Seçici (Bireysel Modda) */}
            {reportType === 'individual' && (
              <select
                value={selectedFlatId}
                onChange={(e) => setSelectedFlatId(parseInt(e.target.value))}
                className="bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 font-medium focus:ring-2 focus:ring-indigo-500"
              >
                {params.flats.map((f) => (
                  <option key={f.id} value={f.id}>
                    Daire {f.id} {f.name ? `- ${f.name}` : ''}
                  </option>
                ))}
              </select>
            )}

            {/* Kopyala */}
            <button
              type="button"
              onClick={handleCopySummary}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all cursor-pointer"
              title="Özeti Panoya Kopyala"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Yazdır / PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>A4 Yazdır / PDF</span>
            </button>

            {/* Kapat */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* A4 KAĞIT ALANI (Print edilebilir) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          {reportType === 'individual' ? (
            /* ========================================================= */
            /* 1. BİREYSEL KAT MALİKİ BİLGİLENDİRME VE ÖDEME TAAHHÜTNAMESİ */
            /* ========================================================= */
            <div className="w-full max-w-[210mm] bg-white border border-slate-300 print:border-none shadow-md print:shadow-none p-8 sm:p-12 text-slate-900 font-sans space-y-6">
              {/* Resmi Antet */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                    T.C. KENTSEL DÖNÜŞÜM & İNŞAAT PROJE YÖNETİMİ
                  </div>
                  <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
                    KAT MALİKİ BİLGİLENDİRME VE FİNANSAL ÖDEME TAAHHÜTNAMESİ
                  </h1>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {params.projectName || 'Kentsel Dönüşüm ve Yenileme Projesi'} — İnşaat Yapım & Hakediş Ek Protokolü
                  </p>
                </div>
                <div className="text-right font-mono text-xs">
                  <div className="font-bold text-slate-900">BELGE REF: KD-{selectedFlat?.id}-{new Date().getFullYear()}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Tarih: {new Date().toLocaleDateString('tr-TR')}
                  </div>
                </div>
              </div>

              {/* 1. Taraf ve Bağımsız Bölüm Bilgileri */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1.5 rounded">
                  1. KAT MALİKİ VE BAĞIMSIZ BÖLÜM KİMLİK BİLGİLERİ
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs border border-slate-200 rounded-lg p-3">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Hak Sahibi Adı Soyadı:</span>
                    <strong className="text-slate-900 text-xs">
                      {isContractor ? 'MÜTEAHHİT SATIŞ PAYI' : selectedFlat?.name || 'Belirtilmedi'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">T.C. Kimlik Numarası:</span>
                    <strong className="text-slate-900 font-mono">{selectedFlat?.tc || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Bağımsız Bölüm (Daire):</span>
                    <strong className="text-indigo-900 font-bold">Daire No {selectedFlat?.id}</strong>
                    <span className="text-slate-500 ml-2">
                      ({selectedFlat?.flatType === 'duplex' ? 'Çatı Dubleksi' : selectedFlat?.flatType === 'mansard' ? 'Mansart' : selectedFlat?.flatType === 'shop' ? 'Dükkan / Ticari' : 'Standart Daire'})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Brüt İnşaat Alanı:</span>
                    <strong className="text-slate-900 font-mono font-bold">{selectedFlat?.area} m²</strong>
                    <span className="text-slate-500 text-[11px] ml-2">
                      (Toplamın %{(((selectedFlat?.area || 0) / (results.totalArea || 1)) * 100).toFixed(2)}'si)
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Finansal Maliyet ve Mahsup Tablosu */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1.5 rounded">
                  2. İNŞAAT MALİYETİ, HİBE VE NET BORÇ DAĞILIMI
                </div>
                <table className="w-full text-xs border-collapse border border-slate-300">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-medium text-slate-700 bg-slate-50 w-2/3">
                        A) Toplam Bağımsız Bölüm İnşaat Katkı Payı (Brüt):
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {selectedCalc?.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-medium text-slate-700 bg-slate-50">
                        B) Tahsil Edilen / Ödenecek Peşinat Tutarı:
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-indigo-700">
                        (-) {selectedCalc?.downPayment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-medium text-slate-700 bg-slate-50">
                        C) 6306 Sayılı Kanun Kapsamı Kentsel Dönüşüm Hibe/Kredi Desteği:
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                        (-) {selectedCalc?.usedCredit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                    </tr>
                    <tr className="bg-slate-900 text-white font-bold">
                      <td className="p-3 uppercase text-xs">
                        NET KALAN ÖDENECEK MALİK BAKİYESİ (A - B - C):
                      </td>
                      <td className="p-3 text-right font-mono text-sm">
                        {selectedCalc?.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 3. Ödeme Takvimi ve Aşamalar */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1.5 rounded">
                  3. RESMİ ÖDEME PLANI VE VADE TAKVİMİ
                </div>
                {isContractor ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                    Bu bağımsız bölüm yüklenici müteahhide aittir. İnşaat maliyeti müteahhit satış payı kapsamında karşılanacaktır.
                  </div>
                ) : selectedFlat?.flatType === 'shop' ? (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded text-xs text-indigo-900 font-medium">
                    Bu bağımsız bölüm ticari / dükkan statüsündedir. Ödeme, hakediş aşamalarından bağımsız olarak tek seferde veya özel protokolle tahsil edilecektir.
                  </div>
                ) : (selectedCalc?.netRemainingDebt || 0) <= 0 ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 font-medium">
                    Peşinat ve hibe desteği sonrasında hak sahibinin taksitli inşaat borcu kalmamıştır.
                  </div>
                ) : params.paymentPlanType === 'installments' ? (
                  <div className="border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex justify-between font-bold text-slate-900 border-b pb-2">
                      <span>Ödeme Modeli: Eşit Aylık Taksit</span>
                      <span className="font-mono text-emerald-800">
                        {params.installmentCount || 12} Ay x{' '}
                        {selectedCalc?.monthlyInstallment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                      {Array.from({ length: Math.min(12, params.installmentCount || 12) }).map((_, idx) => (
                        <div key={idx} className="p-1.5 bg-slate-50 rounded border border-slate-200 flex justify-between">
                          <span>{idx + 1}. Taksit:</span>
                          <span className="font-bold">
                            {selectedCalc?.monthlyInstallment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-xs border-collapse border border-slate-300">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2 border border-slate-300 text-left">Aşama & İmalat Kademesi</th>
                        <th className="p-2 border border-slate-300 text-center w-20">Oran</th>
                        <th className="p-2 border border-slate-300 text-right w-36">Ödeme Tutarı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      <tr>
                        <td className="p-2 border border-slate-300 font-sans font-medium">
                          1. Aşama: Sözleşme İmzası & Ruhsat / Yıkım
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-bold">%{params.stage1Pay}</td>
                        <td className="p-2 border border-slate-300 text-right font-bold">
                          {(selectedCalc?.stagePayments?.[0] || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-slate-300 font-sans font-medium">
                          2. Aşama: Temel Vizesi & Subasman İmalatı
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-bold">%{params.stage2Pay}</td>
                        <td className="p-2 border border-slate-300 text-right font-bold">
                          {(selectedCalc?.stagePayments?.[1] || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-slate-300 font-sans font-medium">
                          3. Aşama: Kaba Yapı & Betonarme İskelet Tamamlama
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-bold">%{params.stage3Pay}</td>
                        <td className="p-2 border border-slate-300 text-right font-bold">
                          {(selectedCalc?.stagePayments?.[2] || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-slate-300 font-sans font-medium">
                          4. Aşama: İnce İşler (Sıva, Şap, Tesisat, Cephe)
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-bold">%{params.stage4Pay}</td>
                        <td className="p-2 border border-slate-300 text-right font-bold">
                          {(selectedCalc?.stagePayments?.[3] || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-slate-300 font-sans font-medium">
                          5. Aşama: İskân Alımı & Anahtar Teslim
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-bold">%{params.stage5Pay}</td>
                        <td className="p-2 border border-slate-300 text-right font-bold">
                          {(selectedCalc?.stagePayments?.[4] || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              {/* 4. Yasal Taahhüt Şartları */}
              <div className="space-y-1.5 text-[10px] text-slate-600 leading-relaxed border-t border-slate-200 pt-3">
                <p>
                  <strong>1. Ödeme Sorumluluğu:</strong> Kat maliki, yukarıda dökümü yapılan net borç tutarını belirlenen takvim ve hakediş vadelerinde yüklenici ortak inşaat hesabına eksiksiz yatırmayı taahhüt eder.
                </p>
                <p>
                  <strong>2. Hakediş Denetimi:</strong> İmalat aşama ödemeleri, şantiye teknik denetim heyeti ve yapı denetim kuruluşunun saha ilerleme raporu onayına müteakip tahsil edilir.
                </p>
                <p>
                  <strong>3. Fiyat Sabitliği:</strong> İşbu taahhütname, sözleşmede belirlenen birim inşaat maliyeti ve hakediş esaslarına göre tanzim edilmiştir.
                </p>
              </div>

              {/* 5. İmza Alanı */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-slate-800 text-center text-xs">
                <div className="space-y-12">
                  <div className="font-bold text-slate-800">KAT MALİKİ / HAK SAHİBİ</div>
                  <div className="text-[11px] text-slate-500 border-t border-slate-300 pt-1">
                    {selectedFlat?.name || 'İsim & İmza'}
                  </div>
                </div>
                <div className="space-y-12">
                  <div className="font-bold text-slate-800">YÜKLENİCİ MÜTEAHHİT</div>
                  <div className="text-[11px] text-slate-500 border-t border-slate-300 pt-1">
                    Yetkili İmza & Kaşe
                  </div>
                </div>
                <div className="space-y-12">
                  <div className="font-bold text-slate-800">BİNA YÖNETİM KURULU</div>
                  <div className="text-[11px] text-slate-500 border-t border-slate-300 pt-1">
                    Temsilci Onayı
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* 2. TOPLU GENEL KURUL HAKEDİŞ VE PAY DAĞILIM CETVELİ (A4) */
            /* ========================================================= */
            <div className="w-full max-w-[210mm] bg-white border border-slate-300 print:border-none shadow-md print:shadow-none p-8 sm:p-10 text-slate-900 font-sans space-y-6">
              {/* Üst Bilgi */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    KAT MALİKLERİ KURULU RESMİ DAĞITIM LİSTESİ
                  </div>
                  <h1 className="text-base sm:text-lg font-black text-slate-900">
                    BİNA HAKEDİŞ, PEŞİNAT VE NET MALİK PAYLARI CETVELİ
                  </h1>
                  <p className="text-xs text-slate-600">
                    {params.projectName || 'Kentsel Dönüşüm Projesi'} ({params.flats.length} Bağımsız Bölüm)
                  </p>
                </div>
                <div className="text-right text-xs font-mono">
                  <div className="font-bold">TARİH: {new Date().toLocaleDateString('tr-TR')}</div>
                  <div className="text-slate-500 text-[11px]">Toplam Alan: {results.totalArea} m²</div>
                </div>
              </div>

              {/* Genel Özet Kutuları */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-100 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Toplam Malik Payı</span>
                  <strong className="font-mono text-slate-900">{totalOwnerDebt.toLocaleString('tr-TR')} TL</strong>
                </div>
                <div className="p-2 bg-indigo-50 rounded border border-indigo-200">
                  <span className="text-[10px] text-indigo-700 uppercase block font-bold">Toplanan Peşinat</span>
                  <strong className="font-mono text-indigo-900">{totalDownPayments.toLocaleString('tr-TR')} TL</strong>
                </div>
                <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 uppercase block font-bold">Dönüşüm Hibesi</span>
                  <strong className="font-mono text-emerald-900">{totalStateSupport.toLocaleString('tr-TR')} TL</strong>
                </div>
                <div className="p-2 bg-amber-50 rounded border border-amber-200">
                  <span className="text-[10px] text-amber-700 uppercase block font-bold">Kalan Net Borç</span>
                  <strong className="font-mono text-amber-900">{totalRemainingDebt.toLocaleString('tr-TR')} TL</strong>
                </div>
              </div>

              {/* Tam Tablo */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse border border-slate-300">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border border-slate-300 text-center w-12">No</th>
                      <th className="p-2 border border-slate-300 text-left">Hak Sahibi Adı Soyadı</th>
                      <th className="p-2 border border-slate-300 text-center w-24">TC No</th>
                      <th className="p-2 border border-slate-300 text-right w-16">Alan (m²)</th>
                      <th className="p-2 border border-slate-300 text-right w-24">Toplam Pay</th>
                      <th className="p-2 border border-slate-300 text-right w-24">Peşinat</th>
                      <th className="p-2 border border-slate-300 text-right w-24">Net Kalan Borç</th>
                      <th className="p-2 border border-slate-300 text-center w-20">İmza</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {params.flats.map((flat) => {
                      const calc = results.flatResults?.find((f) => f.id === flat.id);
                      const isContractorFlat = !!(params.contractorFlatIds?.includes(flat.id) || flat.isContractorShare);

                      return (
                        <tr key={flat.id} className={isContractorFlat ? 'bg-amber-50/40' : ''}>
                          <td className="p-1.5 border border-slate-300 text-center font-bold">{flat.id}</td>
                          <td className="p-1.5 border border-slate-300 font-sans">
                            {isContractorFlat ? (
                              <span className="text-amber-800 font-bold italic">MÜTEAHHİT SATIŞ PAYI</span>
                            ) : (
                              flat.name || '-'
                            )}
                          </td>
                          <td className="p-1.5 border border-slate-300 text-center">{flat.tc || '-'}</td>
                          <td className="p-1.5 border border-slate-300 text-right font-bold">{flat.area}</td>
                          <td className="p-1.5 border border-slate-300 text-right">
                            {calc ? calc.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : '-'}
                          </td>
                          <td className="p-1.5 border border-slate-300 text-right text-indigo-700 font-bold">
                            {flat.downPayment ? flat.downPayment.toLocaleString('tr-TR') : '0'}
                          </td>
                          <td className="p-1.5 border border-slate-300 text-right font-bold text-slate-900">
                            {isContractorFlat
                              ? '-'
                              : (calc?.netRemainingDebt || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="p-1.5 border border-slate-300 text-center"></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Alt İmza */}
              <div className="pt-8 border-t border-slate-300 flex justify-between text-xs">
                <div>
                  <span className="font-bold block">Divan Başkanı / Temsilci</span>
                  <span className="text-[11px] text-slate-400">İmza</span>
                </div>
                <div>
                  <span className="font-bold block">Kat Malikleri Kurulu Adına</span>
                  <span className="text-[11px] text-slate-400">İmza</span>
                </div>
                <div>
                  <span className="font-bold block">Yüklenici Firma Onayı</span>
                  <span className="text-[11px] text-slate-400">Kaşe & İmza</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
