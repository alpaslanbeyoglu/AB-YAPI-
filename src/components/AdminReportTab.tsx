import React, { useRef } from 'react';
import { ProjectParams, CalculationResult, AppTheme } from '../types';
import { exportElementToPdf, printHtmlContent } from '../utils/pdfExport';
import { PrintAndPdfButtons } from './PrintAndPdfButtons';
import { Logo } from './Logo';
import { useCompanyProfile } from '../context/CompanyProfileContext';

interface AdminReportTabProps {
  params: ProjectParams;
  results: CalculationResult;
  theme?: AppTheme;
}

export const AdminReportTab: React.FC<AdminReportTabProps> = ({
  params,
  results,
  theme = 'light',
}) => {
  const { profile } = useCompanyProfile();
  const adminDocRef = useRef<HTMLDivElement>(null);

  const isGray = theme === 'gray';

  const compName = profile?.companyName || 'AB YAPI';
  const compLogo = profile?.logoBase64 || '';

  const handleExportPdf = async () => {
    if (!adminDocRef.current) return;
    const safeAddr = params.projectAddress.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').slice(0, 25);
    const fileName = `${compName.replace(/\s+/g, '_')}_Yonetici_Finans_Raporu_${safeAddr || 'Proje'}_${new Date().toISOString().slice(0, 10)}.pdf`;
    await exportElementToPdf(adminDocRef.current, fileName);
  };

  const handlePrint = () => {
    const html = generateAdminReportHtml();
    printHtmlContent(html, `${compName}_Yonetici_Finans_Raporu_${params.projectAddress || 'Proje'}`);
  };

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
  <title>${compName} - İç Maliyet ve Finans Raporu</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; color: #111; max-width: 1000px; margin: 0 auto; line-height: 1.7; font-size: 13px; }
    h2 { color: #d9534f; text-align: left; }
    h3 { color: #1f7a7a; border-bottom: 2px solid #1f7a7a; padding-bottom: 4px; margin-top: 25px; font-size: 14px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th { background: #37474f; color: white; padding: 8px; border: 1px solid #ddd; text-align: left; }
    .profit-row { background: #fff3cd; font-weight: bold; }
    .total-row { background: #28a745; color: white; font-weight: bold; }
  </style>
</head>
<body>
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #d9534f;padding-bottom:12px;margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:12px;">
      ${compLogo ? `<img src="${compLogo}" alt="${compName}" style="max-height:50px;max-width:130px;object-fit:contain;" />` : ''}
      <div>
        <h2 style="margin:0;font-size:16px;">${compName} - İÇ MALİYET VE FİNANSAL YÖNETİM RAPORU</h2>
        <p style="margin:2px 0 0 0;font-size:11px;color:#666;">Rapor Tarihi: ${results.calculatedAt} | Proje: ${params.projectAddress}</p>
      </div>
    </div>
  </div>
  
  <p style="background:#fff3cd;padding:10px;border-left:4px solid #ffc107;">
    <strong>📌 Yönetici Özeti:</strong> Bu rapor şirket içi gizli finansal tablodur. Net inşaat maliyeti, genel hakediş ve aşama bazlı kasa nakit dengesi aşağıda sunulmuştur.
  </p>

  <h3>1. PROJE FİNANSAL GÖSTERGELERİ</h3>
  <table>
    <tr><th>Kalem</th><th>TL Değeri</th><th>USD Değeri ($)</th></tr>
    <tr><td>Net İnşaat Maliyeti</td><td><strong>${results.subTotalCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</strong></td><td>$${(results.subTotalCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
    <tr><td>Net Birim m² Maliyeti</td><td><strong>${results.netCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²</strong></td><td>$${results.netUsdPerSqM.toLocaleString('en-US', { maximumFractionDigits: 0 })}/m²</td></tr>
    <tr class="profit-row"><td>Müteahhitlik Kâr / Hizmet Payı</td><td><strong>${results.profitAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</strong></td><td>$${(results.profitAmount / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
    <tr class="total-row"><td>Genel Hakediş / Satış Değeri</td><td><strong>${results.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</strong></td><td>$${(results.grandTotal / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
  </table>

  <h3>2. DETAYLI İMALAT GRUBU HARCAMALARI</h3>
  <table>
    <tr><th>İmalat Grubu</th><th>Kalem İçeriği</th><th>Tutar (TL)</th><th>Tutar (USD)</th></tr>
    <tr><td>Resmi İşlemler & Projelendirme</td><td>Noter, YAMBİS, Harçlar, Ruhsat Projeleri</td><td>${results.officialCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td><td>$${(results.officialCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
    <tr><td>SGK, Sigorta & Satış/Pazarlama</td><td>Asgari İşçilik SGK, All-Risk & Ofis</td><td>${results.sgkSalesCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td><td>$${(results.sgkSalesCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
    <tr><td>Kaba İnşaat İmalatları</td><td>C30/35 Beton, Demir Donatı, Hafriyat & İşçilik</td><td>${results.kabaTotalCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td><td>$${(results.kabaTotalCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
    <tr><td>Tesisat & Ortak Sistemler</td><td>Asansör, Akıllı Ev, Diafon, Mekanik Tesisat</td><td>${results.systemsCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td><td>$${(results.systemsCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
    <tr><td>İnce İşçilik & Kaplamalar</td><td>PVC, Seramik, Mutfak, Parke, Şap, Boya</td><td>${results.finishingTotalCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td><td>$${(results.finishingTotalCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
  </table>

  <h3>3. ŞANTİYE AŞAMA BAZLI KASA VE NAKİT AKIŞ DENGESİ</h3>
  <table>
    <tr>
      <th>Şantiye Aşaması</th>
      <th>Giren Tahsilat (Gelir)</th>
      <th>Ödenen İmalat Gideri</th>
      <th>Aşama Net Akışı</th>
      <th>Kümülatif Kasa Durumu</th>
    </tr>
    ${cashFlowRowsHtml}
  </table>

  <br><br>
  <table style="width: 100%; margin-top: 40px; border-collapse: collapse;">
    <tr>
      <td style="width: 50%; text-align: center; vertical-align: top;">
        <strong>PROJE MÜDÜRÜ / HESAPLAYAN</strong><br><br><br><br>
        AB YAPI Mühendislik
      </td>
      <td style="width: 50%; text-align: center; vertical-align: top;">
        <strong>GENEL MÜDÜR ONAYI</strong><br><br><br><br>
        .......................................
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  const cardBg = isGray
    ? 'bg-slate-100 border-slate-300 text-slate-900 shadow-sm'
    : 'bg-white border-slate-200 text-slate-900 shadow-sm';
  const subCardBg = isGray
    ? 'bg-white border-slate-300 text-slate-800'
    : 'bg-slate-50 border-slate-200 text-slate-800';

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl border shadow-sm print:hidden ${cardBg}`}>
        <div>
          <h3 className="font-semibold text-sm text-red-700 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
            <span>Müteahhit Özel Çıktısı (Şirket İçi / Gizli)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Net maliyet, kâr marjı, harcama kalemleri ve şantiye kasası nakit akış tablosu
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <PrintAndPdfButtons
            onExportPdf={handleExportPdf}
            onPrint={handlePrint}
            getHtmlContent={generateAdminReportHtml}
            documentTitle="Müteahhit Özel / Finans Raporu"
            theme={theme}
          />
        </div>
      </div>

      {/* Admin Document Content */}
      <div
        ref={adminDocRef}
        className={`border rounded-3xl p-6 sm:p-10 shadow-sm text-xs leading-relaxed text-slate-700 print:bg-white print:border-none print:shadow-none print:p-0 print:text-black ${cardBg}`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-6 print:border-red-700">
          <div className="flex items-center gap-3">
            <Logo size="lg" variant="full" theme={theme} />
          </div>
          <div className="text-center sm:text-right">
            <h2 className="text-base sm:text-lg font-bold text-red-700 uppercase tracking-wide">
              {compName} - İÇ MALİYET VE FİNANSAL YÖNETİM RAPORU
            </h2>
            <p className="text-[11px] text-slate-500 mt-1 font-mono">
              Rapor Tarihi: {results.calculatedAt} | Proje: {params.projectAddress}
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-2xl mb-6 text-xs text-amber-900">
          <strong className="text-amber-900">📌 Yönetici Özeti:</strong> Bu rapor müşteri teklifinden farklı olarak net inşaat maliyeti, hedeflenen müteahhitlik kârı, tüm alt imalat kalemlerinin maliyet dağılımı ve şantiye aşamalarındaki kasa durumunu içerir.
        </div>

        <div className="space-y-6">
          {/* Section 1 */}
          <div>
            <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-2 text-xs uppercase mb-3">
              1. PROJE FİNANSAL VERİ VE MALİYET KARTLARI
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800">
                  <tr>
                    <th className="p-3 border-b border-slate-200 font-semibold">Metrik / Gösterge</th>
                    <th className="p-3 border-b border-slate-200 font-semibold">TL Değeri</th>
                    <th className="p-3 border-b border-slate-200 font-semibold">USD Değeri ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 text-slate-700 font-medium">Net İnşaat Maliyeti (Kârsız)</td>
                    <td className="p-3 font-semibold text-slate-900 font-mono">
                      {results.subTotalCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 text-slate-600 font-mono">
                      ${(results.subTotalCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 text-slate-700 font-medium">Net Birim m² Maliyeti</td>
                    <td className="p-3 font-semibold text-slate-900 font-mono">
                      {results.netCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²
                    </td>
                    <td className="p-3 text-slate-600 font-mono">
                      ${results.netUsdPerSqM.toLocaleString('en-US', { maximumFractionDigits: 0 })}/m²
                    </td>
                  </tr>
                  <tr className="bg-amber-50 hover:bg-amber-100/50 font-semibold text-amber-900">
                    <td className="p-3">
                      Müteahhitlik Kâr / Hizmet Payı
                    </td>
                    <td className="p-3 font-mono">
                      {results.profitAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 font-mono">
                      ${(results.profitAmount / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50 hover:bg-emerald-100/50 text-emerald-800 font-bold">
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
            <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-2 text-xs uppercase mb-3">
              2. DETAYLI İMALAT VE HARCAMA KALEMLERİ DÖKÜMÜ
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800">
                  <tr>
                    <th className="p-3 border-b border-slate-200 font-semibold">İmalat Grubu</th>
                    <th className="p-3 border-b border-slate-200 font-semibold">Açıklama / Kalem İçeriği</th>
                    <th className="p-3 border-b border-slate-200 font-semibold">Maliyet (TL)</th>
                    <th className="p-3 border-b border-slate-200 font-semibold">Maliyet (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 text-slate-900 font-medium">Resmi İşlemler & Projelendirme</td>
                    <td className="p-3 text-slate-600">Noter, YAMBİS, Ruhsat Projeleri & Harçlar</td>
                    <td className="p-3 text-slate-800 font-mono">{results.officialCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
                    <td className="p-3 text-slate-600 font-mono">${(results.officialCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 text-slate-900 font-medium">SGK, All-Risk & Pazarlama</td>
                    <td className="p-3 text-slate-600">Asgari İşçilik SGK, Sigorta & Satış/Pazarlama</td>
                    <td className="p-3 text-slate-800 font-mono">{results.sgkSalesCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
                    <td className="p-3 text-slate-600 font-mono">${(results.sgkSalesCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 text-slate-900 font-medium">Kaba İnşaat İmalatı</td>
                    <td className="p-3 text-slate-600">C30/35 Beton, Demir, Hafriyat & İşçilik</td>
                    <td className="p-3 text-slate-800 font-mono">{results.kabaTotalCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
                    <td className="p-3 text-slate-600 font-mono">${(results.kabaTotalCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 text-slate-900 font-medium">Ortak Tesisat & Donanım</td>
                    <td className="p-3 text-slate-600">Asansör, Akıllı Ev, Diafon, Gaz Tesisatı</td>
                    <td className="p-3 text-slate-800 font-mono">{results.systemsCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
                    <td className="p-3 text-slate-600 font-mono">${(results.systemsCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 text-slate-900 font-medium">İnce İşçilik & Kaplamalar</td>
                    <td className="p-3 text-slate-600">PVC, Seramik, Mutfak, Kapı, Şap, Sıva, Boya</td>
                    <td className="p-3 text-slate-800 font-mono">{results.finishingTotalCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
                    <td className="p-3 text-slate-600 font-mono">${(results.finishingTotalCost / params.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3 */}
          <div>
            <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-2 text-xs uppercase mb-3">
              3. AŞAMA BAZLI KASA VE NAKİT AKIŞ PERFORMANSI
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800">
                  <tr>
                    <th className="p-3 border-b border-slate-200 font-semibold">Şantiye Aşaması</th>
                    <th className="p-3 border-b border-slate-200 font-semibold">Giren Tahsilat (Gelir)</th>
                    <th className="p-3 border-b border-slate-200 font-semibold">Ödenen Gider</th>
                    <th className="p-3 border-b border-slate-200 font-semibold">Aşama Net Akışı</th>
                    <th className="p-3 border-b border-slate-200 font-semibold">Kümülatif Kasa Durumu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {results.cashFlowRows.map((row) => (
                    <tr key={row.stageNumber} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">{row.name}</td>
                      <td className="p-3 text-emerald-700 font-semibold font-mono">
                        {row.income.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 text-red-600 font-mono">
                        {row.expense.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 font-semibold text-slate-800 font-mono">
                        {row.periodBalance >= 0 ? '+' : ''}
                        {row.periodBalance.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                            row.cumulativeBalance >= 0
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-red-50 text-red-800 border-red-300'
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
          <div className="flex justify-between pt-10 px-6 text-xs text-slate-700">
            <div className="text-center">
              <p className="font-semibold mb-14 text-slate-900">PROJE MÜDÜRÜ / HESAPLAYAN</p>
              <p className="text-slate-500">AB YAPI Mühendislik</p>
            </div>
            <div className="text-center">
              <p className="font-semibold mb-14 text-slate-900">GENEL MÜDÜR ONAYI</p>
              <p className="text-slate-500">.... / .... / 2026</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
