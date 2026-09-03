import React, { useState } from 'react';
import { Printer, Cloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { ProjectParams, CalculationResult, AppTheme } from '../types';
import { saveReportDocumentToDrive } from '../services/drive';
import { generateOfferHtml } from '../utils/reportExport';
import { Logo } from './Logo';

interface OfferTabProps {
  params: ProjectParams;
  results: CalculationResult;
  hasToken: boolean;
  onOpenDrivePanel: () => void;
  theme?: AppTheme;
}

export const OfferTab: React.FC<OfferTabProps> = ({
  params,
  results,
  hasToken,
  onOpenDrivePanel,
  theme = 'light',
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const isGray = theme === 'gray';

  const supportText =
    params.transformationStatus === 'currentSupport'
      ? '2025/2026 Mevcut Model (875 Bin TL Hibe + 875 Bin TL Kredi)'
      : params.transformationStatus === 'futureSupport2027'
      ? '2027 Projeksiyon Modeli (3 Milyon TL Kredi / 180 Ay Vade)'
      : 'Desteksiz / Öz Kaynaklı Yapım';

  const handleSaveToDrive = async () => {
    if (!hasToken) {
      onOpenDrivePanel();
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);
    try {
      const html = generateOfferHtml(params, results);
      const safeAddr = params.projectAddress.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').slice(0, 25);
      const fileName = `AB_YAPI_Teklif_${safeAddr}_${new Date().toISOString().slice(0, 10)}.html`;
      const res = await saveReportDocumentToDrive(
        fileName,
        html,
        `AB YAPI Müşteri Teklifi - ${params.projectAddress}`
      );
      setSaveStatus({
        type: 'success',
        msg: `Teklif belgesi Google Drive'a başarıyla kaydedildi: "${res.name}"`,
      });
    } catch (err: any) {
      setSaveStatus({ type: 'error', msg: err.message || 'Drive kaydı başarısız oldu.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl border shadow-sm print:hidden ${
          isGray ? 'bg-slate-100/90 border-slate-300' : 'bg-white border-slate-200'
        }`}
      >
        <div>
          <h3 className={`font-semibold text-sm ${isGray ? 'text-slate-900' : 'text-slate-800'}`}>
            Resmi Müşteri Teklif Çıktısı
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Hak sahipleri borçlanma tablosu ve hakediş vadeleri ile hazır teklif belgesi
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
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all active:scale-95"
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

      {/* Offer Document */}
      <div
        className={`border rounded-3xl p-6 sm:p-10 shadow-sm print:bg-white print:border-none print:shadow-none print:p-0 print:text-black ${
          isGray ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200'
        }`}
      >
        {/* Title Header with Official AB YAPI Logo */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-6 print:border-slate-300">
          <div className="flex items-center gap-3">
            <Logo size="lg" variant="full" theme={theme} />
          </div>
          <div className="text-center sm:text-right">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-wide">
              İNŞAAT TEKLİF VE ÖDEME PLANI
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Teklif No: AB-{new Date().getFullYear()}-{(results.flatCount || 10).toString().padStart(3, '0')} | Tarih: {new Date().toLocaleDateString('tr-TR')}
            </p>
          </div>
        </div>

        {/* Project Meta Box */}
        <div className="bg-slate-50 border-l-4 border-indigo-600 p-5 rounded-2xl mb-6 text-xs text-slate-700 leading-relaxed space-y-1.5 print:bg-slate-50 print:border-teal-800 print:text-slate-700">
          <h4 className="font-semibold text-slate-900 text-sm mb-2">📍 Yapı & Proje Genel Bilgileri</h4>
          <p>
            <strong className="text-slate-700">Yapı Adresi:</strong>{' '}
            <span className="text-indigo-700 font-bold">{params.projectAddress}</span>
          </p>
          <p>
            <strong className="text-slate-700">Bina Oturumu:</strong> {results.baseArea} m² |{' '}
            <strong className="text-slate-700">Toplam İnşaat Alanı:</strong> {results.totalArea} m² |{' '}
            <strong className="text-slate-700">Daire Sayısı:</strong> {results.flatCount} Adet
          </p>
          <p>
            <strong className="text-slate-700">Birim İmalat Fiyatı:</strong>{' '}
            <span className="font-mono font-semibold text-slate-900">
              {results.grossCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²
            </span>{' '}
            (
            <span className="font-mono text-slate-500">
              {results.grossUsdPerSqM.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD/m²
            </span>
            )
          </p>
          {params.durationOption !== 'hide' && (
            <p>
              <strong className="text-slate-700">Tahmini Proje ve Teslim Süresi:</strong>{' '}
              <span className="font-semibold text-slate-900">{results.finalMonths} Ay</span>{' '}
              <em className="text-slate-500">
                {params.durationOption === 'auto'
                  ? '(Proje Çizimi, Ruhsat ve İskân Süreçleri Dahil)'
                  : '(Sözleşmede Kararlaştırılan Süre)'}
              </em>
            </p>
          )}
          <p>
            <strong className="text-slate-700">Kentsel Dönüşüm Destek Modeli:</strong>{' '}
            <span className="font-semibold text-amber-700">{supportText}</span>
          </p>
        </div>

        {/* Table 1: Hak Sahipleri Özet */}
        <h4 className="text-xs font-semibold text-indigo-700 border-b border-slate-200 pb-2 mb-3 uppercase tracking-wider">
          1. Hak Sahipleri Ödeme ve Borçlandırma Özeti
        </h4>
        <div className="overflow-x-auto mb-6 rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-3 border-b border-slate-200 font-semibold">Daire No</th>
                <th className="p-3 border-b border-slate-200 font-semibold">Hak Sahibi & TC</th>
                <th className="p-3 border-b border-slate-200 font-semibold">Alan</th>
                <th className="p-3 border-b border-slate-200 font-semibold">Toplam Borç</th>
                <th className="p-3 border-b border-slate-200 font-semibold">Ödenen Peşinat</th>
                <th className="p-3 border-b border-slate-200 font-semibold">Dönüşüm Desteği</th>
                <th className="p-3 border-b border-slate-200 font-semibold">Kalan Öz Kaynak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.flatResults.map((flat) => (
                <tr key={flat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-semibold text-slate-900">Daire {flat.id}</td>
                  <td className="p-3">
                    <div className="font-medium text-slate-900">{flat.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">TC: {flat.tc}</div>
                  </td>
                  <td className="p-3 text-slate-700 font-mono">{flat.area} m²</td>
                  <td className="p-3 text-slate-900 font-mono">
                    {flat.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                  </td>
                  <td className="p-3 text-slate-600 font-mono">
                    -{flat.downPayment.toLocaleString('tr-TR')} TL
                  </td>
                  <td className="p-3 text-indigo-700 font-mono">
                    {flat.usedCredit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                  </td>
                  <td className="p-3 font-bold text-slate-900 font-mono">
                    {flat.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table 2: Hakediş Takvimi */}
        <h4 className="text-xs font-semibold text-indigo-700 border-b border-slate-200 pb-2 mb-3 uppercase tracking-wider">
          2. Fiziki İlerleme Hakediş Takvimi (TL)
        </h4>
        <div className="overflow-x-auto mb-6 rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-3 border-b border-slate-200 font-semibold">Daire / Malik</th>
                <th className="p-3 border-b border-slate-200 font-semibold">1. Aşama (%{params.stage1Pay})</th>
                <th className="p-3 border-b border-slate-200 font-semibold">2. Aşama (%{params.stage2Pay})</th>
                <th className="p-3 border-b border-slate-200 font-semibold">3. Aşama (%{params.stage3Pay})</th>
                <th className="p-3 border-b border-slate-200 font-semibold">4. Aşama (%{params.stage4Pay} + Destek)</th>
                <th className="p-3 border-b border-slate-200 font-semibold">5. Aşama (%{params.stage5Pay})</th>
                <th className="p-3 border-b border-slate-200 font-semibold">Toplam Borç</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.flatResults.map((flat) => (
                <tr key={flat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-semibold text-slate-900">
                    Daire {flat.id} ({flat.name})
                  </td>
                  <td className="p-3 text-slate-700 font-mono">
                    {flat.stagePayments[0].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                  </td>
                  <td className="p-3 text-slate-700 font-mono">
                    {flat.stagePayments[1].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                  </td>
                  <td className="p-3 text-slate-700 font-mono">
                    {flat.stagePayments[2].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                  </td>
                  <td className="p-3 font-semibold text-indigo-700 font-mono">
                    {flat.stagePayments[3].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                  </td>
                  <td className="p-3 text-slate-700 font-mono">
                    {flat.stagePayments[4].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                  </td>
                  <td className="p-3 font-bold text-slate-900 font-mono">
                    {flat.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notice Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed mb-8">
          <h5 className="font-semibold text-amber-800 text-xs mb-1">
            📌 Önemli Bilgilendirme ve Teslim Koşulları:
          </h5>
          <p>
            Yukarıda belirtilen proje süresine mimari, statik ve altyapı projelerinin hazırlanması, ilgili belediyeden yapı ruhsatı alma ve inşaat bitimi yapı kullanım izin belgesi (iskân) onay süreçleri dahildir. İnşaat imalatı süresince olumsuz hava koşulları, resmi kurum onay/vize süreçlerindeki gecikmeler veya altyapı sağlayıcı kurumlardan (İSKİ, İGDAŞ, BEDAŞ vb.) kaynaklanan firmamız kontrolü dışındaki gecikmeler proje teslim süresine ilave edilir.
          </p>
        </div>

        {/* Signature Blocks */}
        <div className="flex justify-between pt-6 px-6 text-xs text-slate-700">
          <div className="text-center">
            <p className="font-semibold mb-14 text-slate-900">MÜŞTERİ / KAT MALİKİ İMZA</p>
            <p className="text-slate-400">.... / .... / 2026</p>
          </div>
          <div className="text-center">
            <p className="font-semibold mb-14 text-slate-900">AB YAPI MÜTEAHHİTLİK İMZA / KAŞE</p>
            <p className="text-slate-400">.... / .... / 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
};
