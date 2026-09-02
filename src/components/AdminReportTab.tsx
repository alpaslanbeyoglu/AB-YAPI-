import React, { useState } from 'react';
import { Printer, Cloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { ProjectParams, CalculationResult } from '../types';
import { saveReportDocumentToDrive } from '../services/drive';
import { Logo } from './Logo';

interface AdminReportTabProps {
  params: ProjectParams;
  results: CalculationResult;
  hasToken: boolean;
  onOpenDrivePanel: () => void;
  theme?: 'light' | 'dark';
}

export const AdminReportTab: React.FC<AdminReportTabProps> = ({
  params,
  results,
  hasToken,
  onOpenDrivePanel,
  theme = 'dark',
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const generateAdminReportHtml = () => {
    const cashFlowRowsHtml = results.cashFlowRows
      .map(
        (r) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${r.name}</td>
        <td style="padding:8px;border:1px solid #ddd;color:#28a745;font-weight:bold;">${r.income.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
        <td style="padding:8px;border:1px solid #ddd;color:#dc3545;">${r.expense.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
        <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${r.periodBalance >= 0 ? '+' : ''}${r.periodBalance.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
        <td style="padding:8px;border:1px solid #ddd;">
          <span style="padding:4px 8px;border-radius:4px;font-weight:bold;background:${r.cumulativeBalance >= 0 ? '#d4edda;color:#155724;' : '#f8d7da;color:#721c24;'}">
            ${r.cumulativeBalance.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL (${r.cumulativeBalance >= 0 ? 'Kasa Fazlası' : 'Kasa Açığı'})
          </span>
        </td>
      </tr>`
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>AB YAPI - İç Maliyet ve Finans Raporu</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; color: #111; max-width: 1000px; margin: 0 auto; line-height: 1.7; font-size: 13px; }
    h2 { color: #d9534f; text-align: center; }
    h3 { color: #1f7a7a; border-bottom: 2px solid #1f7a7a; padding-bottom: 4px; margin-top: 25px; font-size: 14px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th { background: #37474f; color: white; padding: 8px; border: 1px solid #ddd; text-align: left; }
    .profit-row { background: #fff3cd; font-weight: bold; }
    .total-row { background: #28a745; color: white; font-weight: bold; }
  </style>
</head>
<body>
  <h2>AB YAPI - İÇ MALİYET VE FİNANSAL YÖNETİM RAPORU (GİZLİ / ŞİRKET İÇİ)</h2>
  <p style="text-align:center;font-size:11px;color:#666;">Rapor Tarihi: ${results.calculatedAt} | Proje: ${params.projectAddress}</p>
  
  <h3>1. PROJE FİNANSAL VERİ VE MALİYET KARTLARI</h3>
  <table>
    <thead>
      <tr><th>Metrik / Gösterge</th><th>TL Değeri</th><th>USD Değeri ($)</th></tr>
    </thead>
    <tbody>
      <tr><td>Net İnşaat Maliyeti (Kârsız)</td><td>${results.subTotalCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td><td>$${(results.subTotalCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
      <tr><td>Net Birim m² Maliyeti (Kârsız)</td><td>${results.netCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²</td><td>$${results.netUsdPerSqM.toLocaleString('en-US', { maximumFractionDigits: 0 })}/m²</td></tr>
      <tr class="profit-row"><td>Hedeflenen Müteahhitlik Kârı (%${params.profitRate})</td><td>${results.profitAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td><td>$${(results.profitAmount / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
      <tr class="total-row"><td>Genel Proje Hakediş / Satış Değeri</td><td>${results.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td><td>$${(results.grandTotal / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
    </tbody>
  </table>

  <h3>2. DETAYLI İMALAT VE HARCAMA KALEMLERİ DÖKÜMÜ</h3>
  <table>
    <thead>
      <tr><th>İmalat Grubu</th><th>Açıklama</th><th>Maliyet (TL)</th><th>Maliyet (USD)</th></tr>
    </thead>
    <tbody>
      <tr><td>Resmi İşlemler & Projelendirme</td><td>Noter, YAMBİS, Ruhsat Projeleri & Harçlar</td><td>${results.officialCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td><td>$${(results.officialCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
      <tr><td>SGK, All-Risk & Pazarlama</td><td>Asgari İşçilik, Sigorta & Satış/Pazarlama</td><td>${results.sgkSalesCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td><td>$${(results.sgkSalesCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
      <tr><td>Kaba İnşaat İmalatı</td><td>Beton, Demir, Hafriyat & İşçilik</td><td>${results.kabaTotalCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td><td>$${(results.kabaTotalCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
      <tr><td>Ortak Tesisat & Donanım</td><td>Asansör, Akıllı Ev, Diafon, Gaz Tesisatı</td><td>${results.systemsCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td><td>$${(results.systemsCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
      <tr><td>İnce İşçilik & Kaplamalar</td><td>PVC, Seramik, Mutfak, Kapı, Şap, Boya</td><td>${results.finishingTotalCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td><td>$${(results.finishingTotalCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
    </tbody>
  </table>

  <h3>3. AŞAMA BAZLI KASA VE NAKİT AKIŞ PERFORMANSI</h3>
  <table>
    <thead>
      <tr><th>Şantiye Aşaması</th><th>Tahsil Edilen Müşteri Geliri</th><th>Ödenen Şantiye Gideri</th><th>Aşama Net Akışı</th><th>Kümülatif Kasa Durumu</th></tr>
    </thead>
    <tbody>${cashFlowRowsHtml}</tbody>
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
      const html = generateAdminReportHtml();
      const safeAddr = params.projectAddress.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').slice(0, 25);
      const fileName = `AB_YAPI_Yonetici_Finans_Raporu_${safeAddr}_${new Date().toISOString().slice(0, 10)}.html`;
      const res = await saveReportDocumentToDrive(
        fileName,
        html,
        `AB YAPI İç Maliyet ve Finans Raporu - ${params.projectAddress}`
      );
      setSaveStatus({
        type: 'success',
        msg: `Yönetici raporu Google Drive'a kaydedildi: "${res.name}"`,
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
          <h3 className="font-semibold text-sm text-red-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span>Müteahhit Özel Çıktısı (Şirket İçi / Gizli)</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Net maliyet, kâr marjı, harcama kalemleri ve şantiye kasası nakit akış tablosu
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
            className="flex items-center gap-2 px-4 py-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-200 border border-red-800/60 rounded-xl text-xs font-semibold transition-all active:scale-95"
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

      {/* Admin Document Content */}
      <div className="bg-[#121214] border border-zinc-800/80 rounded-3xl p-6 sm:p-10 shadow-xl text-xs leading-relaxed text-zinc-300 print:bg-white print:border-none print:shadow-none print:p-0 print:text-black">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800 pb-5 mb-6 print:border-red-700">
          <div className="flex items-center gap-3">
            <Logo size="lg" variant="full" theme={theme} />
          </div>
          <div className="text-center sm:text-right">
            <h2 className="text-base sm:text-lg font-bold text-red-400 uppercase tracking-wide print:text-red-900">
              AB YAPI - İÇ MALİYET VE FİNANSAL YÖNETİM RAPORU
            </h2>
            <p className="text-[11px] text-zinc-400 mt-1 print:text-slate-500 font-mono">
              Rapor Tarihi: {results.calculatedAt} | Proje: {params.projectAddress}
            </p>
          </div>
        </div>

        <div className="bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded-2xl mb-6 text-xs text-amber-200 print:bg-amber-50 print:border-amber-500 print:text-amber-900">
          <strong className="text-amber-300 print:text-amber-900">📌 Yönetici Özeti:</strong> Bu rapor müşteri teklifinden farklı olarak net inşaat maliyeti, hedeflenen müteahhitlik kârı, tüm alt imalat kalemlerinin maliyet dağılımı ve şantiye aşamalarındaki kasa durumunu içerir.
        </div>

        <div className="space-y-6">
          {/* Section 1 */}
          <div>
            <h3 className="font-semibold text-indigo-400 border-b border-zinc-800 pb-2 text-xs uppercase mb-3 print:text-teal-800 print:border-teal-800/30">
              1. PROJE FİNANSAL VERİ VE MALİYET KARTLARI
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 print:border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#18181b] text-zinc-300 print:bg-slate-800 print:text-white">
                  <tr>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">Metrik / Gösterge</th>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">TL Değeri</th>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">USD Değeri ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 print:divide-slate-200">
                  <tr className="hover:bg-zinc-800/20">
                    <td className="p-3 text-zinc-300 print:text-black">Net İnşaat Maliyeti (Kârsız)</td>
                    <td className="p-3 font-semibold text-white font-mono print:text-black">
                      {results.subTotalCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 text-zinc-400 font-mono print:text-slate-600">
                      ${(results.subTotalCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                  <tr className="hover:bg-zinc-800/20">
                    <td className="p-3 text-zinc-300 print:text-black">Net Birim m² Maliyeti (Kârsız)</td>
                    <td className="p-3 font-semibold text-white font-mono print:text-black">
                      {results.netCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²
                    </td>
                    <td className="p-3 text-zinc-400 font-mono print:text-slate-600">
                      ${results.netUsdPerSqM.toLocaleString('en-US', { maximumFractionDigits: 0 })}/m²
                    </td>
                  </tr>
                  <tr className="bg-amber-500/10 hover:bg-amber-500/15 font-semibold text-amber-300 print:bg-amber-50 print:text-amber-900">
                    <td className="p-3">
                      Hedeflenen Müteahhitlik Kârı (%{params.profitRate})
                    </td>
                    <td className="p-3 font-mono">
                      {results.profitAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 font-mono">
                      ${(results.profitAmount / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                  <tr className="bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-300 font-bold print:bg-emerald-600 print:text-white">
                    <td className="p-3">Genel Proje Hakediş / Satış Değeri</td>
                    <td className="p-3 font-mono">
                      {results.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 font-mono">
                      ${(results.grandTotal / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2 */}
          <div>
            <h3 className="font-semibold text-indigo-400 border-b border-zinc-800 pb-2 text-xs uppercase mb-3 print:text-teal-800 print:border-teal-800/30">
              2. DETAYLI İMALAT VE HARCAMA KALEMLERİ DÖKÜMÜ
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 print:border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#18181b] text-zinc-300 print:bg-slate-800 print:text-white">
                  <tr>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">İmalat Grubu</th>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">Açıklama / Kalem İçeriği</th>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">Maliyet (TL)</th>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">Maliyet (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 print:divide-slate-200">
                  <tr className="hover:bg-zinc-800/20">
                    <td className="p-3 text-white font-medium print:text-black">Resmi İşlemler & Projelendirme</td>
                    <td className="p-3 text-zinc-400 print:text-slate-600">Noter, YAMBİS, Ruhsat Projeleri & Harçlar</td>
                    <td className="p-3 text-zinc-200 font-mono print:text-black">{results.officialCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
                    <td className="p-3 text-zinc-400 font-mono print:text-slate-600">${(results.officialCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  </tr>
                  <tr className="hover:bg-zinc-800/20">
                    <td className="p-3 text-white font-medium print:text-black">SGK, All-Risk & Pazarlama</td>
                    <td className="p-3 text-zinc-400 print:text-slate-600">Asgari İşçilik SGK, Sigorta & Satış/Pazarlama</td>
                    <td className="p-3 text-zinc-200 font-mono print:text-black">{results.sgkSalesCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
                    <td className="p-3 text-zinc-400 font-mono print:text-slate-600">${(results.sgkSalesCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  </tr>
                  <tr className="hover:bg-zinc-800/20">
                    <td className="p-3 text-white font-medium print:text-black">Kaba İnşaat İmalatı</td>
                    <td className="p-3 text-zinc-400 print:text-slate-600">C30/35 Beton, Demir, Hafriyat & İşçilik</td>
                    <td className="p-3 text-zinc-200 font-mono print:text-black">{results.kabaTotalCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
                    <td className="p-3 text-zinc-400 font-mono print:text-slate-600">${(results.kabaTotalCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  </tr>
                  <tr className="hover:bg-zinc-800/20">
                    <td className="p-3 text-white font-medium print:text-black">Ortak Tesisat & Donanım</td>
                    <td className="p-3 text-zinc-400 print:text-slate-600">Asansör, Akıllı Ev, Diafon, Gaz Tesisatı</td>
                    <td className="p-3 text-zinc-200 font-mono print:text-black">{results.systemsCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
                    <td className="p-3 text-zinc-400 font-mono print:text-slate-600">${(results.systemsCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  </tr>
                  <tr className="hover:bg-zinc-800/20">
                    <td className="p-3 text-white font-medium print:text-black">İnce İşçilik & Kaplamalar</td>
                    <td className="p-3 text-zinc-400 print:text-slate-600">PVC, Seramik, Mutfak, Kapı, Şap, Sıva, Boya</td>
                    <td className="p-3 text-zinc-200 font-mono print:text-black">{results.finishingTotalCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
                    <td className="p-3 text-zinc-400 font-mono print:text-slate-600">${(results.finishingTotalCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3 */}
          <div>
            <h3 className="font-semibold text-indigo-400 border-b border-zinc-800 pb-2 text-xs uppercase mb-3 print:text-teal-800 print:border-teal-800/30">
              3. AŞAMA BAZLI KASA VE NAKİT AKIŞ PERFORMANSI
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 print:border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#18181b] text-zinc-300 print:bg-slate-800 print:text-white">
                  <tr>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">Şantiye Aşaması</th>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">Giren Tahsilat (Gelir)</th>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">Ödenen Gider</th>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">Aşama Net Akışı</th>
                    <th className="p-3 border-b border-zinc-800 font-semibold print:border-slate-300">Kümülatif Kasa Durumu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 print:divide-slate-200">
                  {results.cashFlowRows.map((row) => (
                    <tr key={row.stageNumber} className="hover:bg-zinc-800/20">
                      <td className="p-3 font-semibold text-white print:text-black">{row.name}</td>
                      <td className="p-3 text-emerald-400 font-semibold font-mono print:text-emerald-700">
                        {row.income.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 text-red-400 font-mono print:text-red-600">
                        {row.expense.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 font-semibold text-white font-mono print:text-black">
                        {row.periodBalance >= 0 ? '+' : ''}
                        {row.periodBalance.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                            row.cumulativeBalance >= 0
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-red-500/10 text-red-300 border-red-500/30'
                          }`}
                        >
                          {row.cumulativeBalance.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL (
                          {row.cumulativeBalance >= 0 ? 'Kasa Fazlası' : 'Kasa Açığı'})
                        </span>
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
              <p className="font-semibold mb-14 text-white print:text-black">PROJE MÜDÜRÜ / HESAPLAYAN</p>
              <p className="text-zinc-500 print:text-slate-500">AB YAPI Mühendislik</p>
            </div>
            <div className="text-center">
              <p className="font-semibold mb-14 text-white print:text-black">GENEL MÜDÜR ONAYI</p>
              <p className="text-zinc-500 print:text-slate-500">.... / .... / 2026</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
