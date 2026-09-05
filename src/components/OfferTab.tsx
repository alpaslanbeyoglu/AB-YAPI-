import React, { useState, useRef } from 'react';
import { Cloud, CheckCircle2, AlertCircle, ShieldCheck, FileText, Compass, LayoutGrid, Calendar, Clock, Sparkles, Layers, Box } from 'lucide-react';
import { ProjectParams, CalculationResult, AppTheme, BuildingModelParams } from '../types';
import { saveReportDocumentToDrive } from '../services/drive';
import { generateOfferHtml } from '../utils/reportExport';
import { exportElementToPdf, printHtmlContent } from '../utils/pdfExport';
import { PrintAndPdfButtons } from './PrintAndPdfButtons';
import { Logo } from './Logo';
import { getRoofTypeShortTitle } from '../utils/roofUtils';
import { useCompanyProfile } from '../context/CompanyProfileContext';
import { ThreeBuildingView } from './ThreeBuildingView';

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
  const { profile } = useCompanyProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showDrawingsInReport, setShowDrawingsInReport] = useState(true);
  const offerDocRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = async () => {
    if (!offerDocRef.current) return;
    const safeAddr = params.projectAddress.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').slice(0, 25);
    const safeName = (profile.companyName || 'AB_YAPI').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_');
    const fileName = `${safeName}_Musteri_Teklifi_${safeAddr || 'Proje'}_${new Date().toISOString().slice(0, 10)}.pdf`;
    await exportElementToPdf(offerDocRef.current, fileName);
  };

  const handlePrint = () => {
    const html = generateOfferHtml(params, results, showDrawingsInReport, profile);
    const safeName = (profile.companyName || 'AB_YAPI').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_');
    printHtmlContent(html, `${safeName}_Musteri_Teklifi_${params.projectAddress || 'Proje'}`);
  };

  // Copy protection side effects and handlers
  React.useEffect(() => {
    const blockShortcuts = (e: KeyboardEvent) => {
      // Blocks Ctrl+C, Ctrl+X, Ctrl+A, Command+C, Command+X, Command+A
      if ((e.ctrlKey || e.metaKey) && ['c', 'C', 'x', 'X', 'a', 'A'].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', blockShortcuts);
    return () => window.removeEventListener('keydown', blockShortcuts);
  }, []);

  const handleCopyProtect = (e: React.ClipboardEvent) => {
    e.preventDefault();
  };

  const handleContextMenuProtect = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Upper floor area and physical gross/net area estimation for consistency
  const upperFloorsCount = Math.max(0, params.floorCount - 1);
  let upperFloorArea = params.baseBuildArea;
  if (params.hasCantilever && params.cantileverDepth && params.cantileverDepth > 0) {
    const estW = Math.sqrt(params.baseBuildArea / 1.2);
    const estD = estW * 1.2;
    if (params.cantileverDirection === 'all') {
      upperFloorArea = (estW + 2 * params.cantileverDepth) * (estD + 2 * params.cantileverDepth);
    } else if (params.cantileverDirection === 'front') {
      upperFloorArea = estW * (estD + params.cantileverDepth);
    } else {
      upperFloorArea = estW * (estD + 2 * params.cantileverDepth);
    }
  }
  const residentialFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
  const flatsPerFloor = Math.max(1, Math.round(results.flatCount / residentialFloors));
  const physicalGrossArea = Math.round((upperFloorArea / flatsPerFloor) * 10) / 10;
  const physicalNetArea = Math.round((physicalGrossArea * 0.8) * 10) / 10;

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
      const html = generateOfferHtml(params, results, showDrawingsInReport, profile);
      const safeAddr = params.projectAddress.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').slice(0, 25);
      const safeName = (profile.companyName || 'AB_YAPI').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_');
      const fileName = `${safeName}_Teklif_${safeAddr}_${new Date().toISOString().slice(0, 10)}.html`;
      const res = await saveReportDocumentToDrive(
        fileName,
        html,
        `${profile.companyName} Müşteri Teklifi - ${params.projectAddress}`
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

  const isContractorShareModel = params.projectModel === 'contractorShare';

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
          <div className="mt-2.5 flex items-center gap-2">
            <input
              id="toggle-drawings-checkbox"
              type="checkbox"
              checked={showDrawingsInReport}
              onChange={(e) => setShowDrawingsInReport(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="toggle-drawings-checkbox" className="text-xs font-medium text-slate-600 cursor-pointer select-none">
              3D Bina Modeli Görünümlerini Çıktıda ve Raporlarda Göster
            </label>
          </div>
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

      {/* Offer Document */}
      <div
        ref={offerDocRef}
        onCopy={handleCopyProtect}
        onContextMenu={handleContextMenuProtect}
        onDragStart={(e) => e.preventDefault()}
        className={`relative overflow-hidden select-none copy-protected border rounded-3xl p-6 sm:p-10 shadow-sm print:bg-white print:border-none print:shadow-none print:p-0 print:text-black ${
          isGray ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200'
        }`}
      >
        {/* Subtle Diagonal Security Watermark Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none opacity-[0.025] flex flex-wrap gap-16 justify-center items-center rotate-12 z-0">
          {Array.from({ length: 48 }).map((_, i) => (
            <span key={i} className="text-slate-900 font-extrabold text-[10px] tracking-widest whitespace-nowrap">
              {profile.companyName} - KOPYALANMAZ / DIŞARI PAYLAŞILMAZ
            </span>
          ))}
        </div>

        {/* Title Header with Official Logo */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-6 print:border-slate-300">
          <div className="flex items-center gap-3">
            <Logo size="lg" variant="full" theme={theme} />
          </div>
          <div className="text-center sm:text-right">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-wide">
              İNŞAAT TEKLİF VE ÖDEME PLANI
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Teklif No: {(profile.companyName || 'AB').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase()}-{new Date().getFullYear()}-{(results.flatCount || 10).toString().padStart(3, '0')} | Tarih: {new Date().toLocaleDateString('tr-TR')}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-4 border-t border-slate-200/60 pt-2 mt-2">
            <p>
              <strong className="text-slate-700">Toplam Kat Sayısı:</strong>{' '}
              <span className="font-semibold text-slate-900">{params.floorCount} Kat</span>
            </p>
            <p>
              <strong className="text-slate-700">Toplam Daire Sayısı:</strong>{' '}
              <span className="font-semibold text-slate-900">{results.flatCount} Adet</span>
            </p>
            <p>
              <strong className="text-slate-700">Bina Oturumu (Taban):</strong>{' '}
              <span className="font-semibold text-slate-900 font-mono">
                {results.baseArea.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m²
              </span>
            </p>
            <p>
              <strong className="text-slate-700">Toplam İnşaat Alanı:</strong>{' '}
              <span className="font-semibold text-slate-900 font-mono">
                {results.totalArea.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m²
              </span>
            </p>
            <p>
              <strong className="text-slate-700">Fiziki Daire Brüt Alanı:</strong>{' '}
              <span className="font-semibold text-slate-900 font-mono text-indigo-600">
                {physicalGrossArea} m²
              </span>
            </p>
            <p>
              <strong className="text-slate-700">Daire Net Alanı (~%80):</strong>{' '}
              <span className="font-semibold text-slate-900 font-mono">
                {physicalNetArea} m²
              </span>
            </p>
            <p>
              <strong className="text-slate-700">Daire Tipi (Oda+Salon):</strong>{' '}
              <span className="font-semibold text-indigo-600 font-mono">
                {params.roomType || '3+1'}
              </span>
            </p>
            <p>
              <strong className="text-slate-700">İnşaat Hakediş Payı (Daire Başı):</strong>{' '}
              <span className="font-semibold text-slate-600 font-mono text-xs">
                {results.flatResults.length > 0 ? (results.flatResults[0].area) : 0} m² <span className="text-[9px] text-slate-400 font-normal">(Bodrum, Ortak Alan, Dükkan payları dahil)</span>
              </span>
            </p>
            <p>
              <strong className="text-slate-700">Birim İmalat Fiyatı:</strong>{' '}
              <span className="font-mono font-semibold text-slate-900">
                {results.grossCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²
              </span>
            </p>
            <p>
              <strong className="text-slate-700">Dolar Kuru Eşdeğeri:</strong>{' '}
              <span className="font-mono font-semibold text-slate-500">
                {results.grossUsdPerSqM.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD/m²
              </span>
            </p>
          </div>
          <div className="border-t border-slate-200/60 pt-2 mt-2">
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
        </div>

        {/* Dynamic Architectural Views Component */}
        <div className={`mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-200 ${!showDrawingsInReport ? 'print:hidden border-dashed border-slate-300 opacity-80' : ''}`}>
          <h4 className="text-xs font-bold text-indigo-700 mb-4 uppercase tracking-wider flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Box className="w-4 h-4" />
              <span>🏢 Dinamik Mimari 3D Canlı Bina Görünümleri (Canlı CAD Modeli)</span>
            </span>
            {!showDrawingsInReport && (
              <span className="text-[10px] bg-amber-500/10 text-amber-700 border border-amber-500/25 px-2.5 py-0.5 rounded-full font-semibold print:hidden">
                Çıktıda Gizlenecek
              </span>
            )}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 bg-[#090f1d]/5 p-3 rounded-2xl border border-slate-200/60 shadow-sm text-center">
              <span className="block text-xs font-bold text-indigo-700 tracking-wide uppercase mb-1">
                A. Ön Cephe Görünümü (Front Elevation)
              </span>
              <div className="h-48 md:h-56 bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-inner group transition-transform duration-500 hover:scale-[1.02]">
                <ThreeBuildingView 
                  params={{
                    ...params,
                    floorHeight: 2.95,
                    stairWidth: 2.6,
                    stairDepth: 4.8,
                    elevatorWidth: 1.8,
                    elevatorDepth: 2.0,
                    wallThickness: 0.2,
                    showFurniture: true,
                    showDimensions: false,
                    showInteriorRooms: true,
                    interiorCutMode: 'solid'
                  } as BuildingModelParams} 
                  forcedCameraPreset="front" 
                  hideControls={true} 
                  theme="dark"
                />
              </div>
              <p className="text-[10px] text-slate-500 italic mt-1 px-2">Dış ölçüler (Yükseklik/Genişlik) ve kat seviyeleri 3D olarak hesaplanmıştır.</p>
            </div>
            
            <div className="space-y-2 bg-[#090f1d]/5 p-3 rounded-2xl border border-slate-200/60 shadow-sm text-center">
              <span className="block text-xs font-bold text-indigo-700 tracking-wide uppercase mb-1">
                B. Kuşbakışı Görünüm (Top / Plan View)
              </span>
              <div className="h-48 md:h-56 bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-inner group transition-transform duration-500 hover:scale-[1.02]">
                <ThreeBuildingView 
                  params={{
                    ...params,
                    floorHeight: 2.95,
                    stairWidth: 2.6,
                    stairDepth: 4.8,
                    elevatorWidth: 1.8,
                    elevatorDepth: 2.0,
                    wallThickness: 0.2,
                    showFurniture: true,
                    showDimensions: true,
                    showInteriorRooms: true,
                    interiorCutMode: 'cutaway'
                  } as BuildingModelParams} 
                  forcedCameraPreset="top" 
                  hideControls={true} 
                  theme="dark"
                />
              </div>
              <p className="text-[10px] text-slate-500 italic mt-1 px-2">Daire ve bağımsız bölüm sınırları, asansör ve merdiven kurgusunu içerir.</p>
            </div>
            
            <div className="space-y-2 bg-[#090f1d]/5 p-3 rounded-2xl border border-slate-200/60 shadow-sm text-center">
              <span className="block text-xs font-bold text-indigo-700 tracking-wide uppercase mb-1">
                C. İzometrik Mimari Model (3D Isometric)
              </span>
              <div className="h-48 md:h-56 bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-inner group transition-transform duration-500 hover:scale-[1.02]">
                <ThreeBuildingView 
                  params={{
                    ...params,
                    floorHeight: 2.95,
                    stairWidth: 2.6,
                    stairDepth: 4.8,
                    elevatorWidth: 1.8,
                    elevatorDepth: 2.0,
                    wallThickness: 0.2,
                    showFurniture: true,
                    showDimensions: false,
                    showInteriorRooms: true,
                    interiorCutMode: 'xray'
                  } as BuildingModelParams} 
                  forcedCameraPreset="iso" 
                  hideControls={true} 
                  theme="dark"
                />
              </div>
              <p className="text-[10px] text-slate-500 italic mt-1 px-2">Yapının tamamını şeffaf katmanlarla gösteren 3D perspektif görünüm.</p>
            </div>
          </div>
          <p className="mt-4 text-[10px] text-slate-400 font-mono border-t border-slate-200 pt-3 italic text-center">
            * Yukarıdaki 3D mimari model görünümleri, girdiğiniz verilere ({params.floorCount} Kat, {results.baseArea.toFixed(1)}m²) göre gerçek zamanlı CAD motoru tarafından oluşturulmuştur.
          </p>
        </div>

        {/* Detailed Technical / Structural Specifications (Technical Spec Summary) */}
        <div className="mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-200">
          <h4 className="text-xs font-bold text-indigo-700 mb-3 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>🏢 Yapısal Özellikler & Teknik Şartname Özeti</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
            <div className="space-y-2">
              <p>
                <strong className="text-slate-900 font-semibold">⚡ Yapı Strüktürü & Betonarme:</strong>
                <br />
                En son deprem yönetmeliğine uygun, deprem yük katsayıları hesaplanmış radye jeneral temel sistemi. İmalatta yüksek dayanımlı <span className="font-semibold text-indigo-700">C30/35 Hazır Beton</span> ve nervürlü demir donatılarla taşıyıcı karkas yapımı. Temel altı membran bohçalama su yalıtımı ve çevre drenajı standarttır.
              </p>
              <p>
                <strong className="text-slate-900 font-semibold">🧱 Bölücü Duvarlar & Kaba Yapı:</strong>
                <br />
                Kat bölücü ve dış cephe duvarlarında yüksek ısı ve ses yalıtımlı Kilsan marka kilitli tuğlalar. İç mekanda kaba kara sıva üzeri pürüzsüz saten alçı sıva ve Jotun/Marshall su bazlı antibakteriyel iç boya uygulaması.
              </p>
              <p>
                <strong className="text-slate-900 font-semibold">🌡️ Cephe Yalıtımı (Mantolama):</strong>
                <br />
                Isı yalıtım levhaları ile mantolanan karkas cephe elemanları. <span className="font-semibold text-slate-900">Minimum 5 cm kalınlığında Karbonlu EPS mantolama</span>, dış cephe dekoratif kaplamaları ve silikon esaslı nefes alan dış cephe boyası.
              </p>
            </div>
            <div className="space-y-2">
              <p>
                <strong className="text-slate-900 font-semibold">🪟 İç & Dış Doğramalar:</strong>
                <br />
                Pimapen, Fıratpen veya Adopen marka PVC pencereler (70'lik seri, çift contalı). Tüm camlar <span className="font-semibold text-slate-900">Isıcam Konfor</span> serisi sinerji özellikli argon gazlı çift cam olacaktır. Monoblok kilitli 1. Sınıf çelik daire kapısı ve ahşap görünümlü lake kapılar.
              </p>
              <p>
                <strong className="text-slate-900 font-semibold">🛋️ İç Mekan Kaplamaları:</strong>
                <br />
                Giriş holleri ve mutfak banyo zeminleri 1. sınıf Çanakkale/Ege Seramik. Salon ve yatak odalarında derzli AGT/Çamsan laminat parke. Vitra/Serel asma klozetler, gömme rezervuarlar ve E.C.A. bataryalar ile lüks banyo donanımları.
              </p>
              <p>
                <strong className="text-slate-900 font-semibold">⚙️ Tesisat & Ortak Alanlar:</strong>
                <br />
                Doğalgaz kombili bireysel kalorifer tesisatı ve panel radyatörler. Audio marka renkli görüntülü diafon altyapısı. <span className="font-semibold text-slate-900">TSE ve CE standartlarına uygun</span> tam otomatik paslanmaz çelik kabinli kat kurtaran sistemli asansör.
              </p>
            </div>
          </div>
        </div>

        {/* Table 1: Hak Sahipleri Özet */}
        <h4 className="text-xs font-bold text-indigo-700 border-b border-slate-200 pb-2 mb-3 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>1. Hak Sahipleri Ödeme ve Borçlandırma Özeti</span>
        </h4>
        <div className="overflow-x-auto mb-6 rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-3 border-b border-slate-200 font-semibold">Daire & Kat No</th>
                <th className="p-3 border-b border-slate-200 font-semibold">Hak Sahibi & TC</th>
                <th className="p-3 border-b border-slate-200 font-semibold">Özellikler (Oda / Alan)</th>
                <th className="p-3 border-b border-slate-200 font-semibold">Daire İmalat Bedeli</th>
                {isContractorShareModel ? (
                  <>
                    <th className="p-3 border-b border-slate-200 font-semibold">Kat Karşılığı İndirimi</th>
                    <th className="p-3 border-b border-slate-200 font-semibold text-indigo-700">Net Malik Borcu</th>
                  </>
                ) : (
                  <>
                    <th className="p-3 border-b border-slate-200 font-semibold">Ödenen Peşinat</th>
                    <th className="p-3 border-b border-slate-200 font-semibold">Dönüşüm Desteği</th>
                    <th className="p-3 border-b border-slate-200 font-semibold text-indigo-700">Kalan Öz Kaynak</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.flatResults.map((flat) => {
                const isContractor = flat.isContractorShare;
                // Calculate approximate floor based on flat id and average flats per floor
                const totalFlats = results.flatCount || 10;
                const totalFloors = params.floorCount || 5;
                const flatsPerFloor = Math.max(1, Math.ceil(totalFlats / totalFloors));
                const floorNo = Math.min(totalFloors, Math.ceil(flat.id / flatsPerFloor));
                
                // Determine room count
                const roomCountText = params.roomType ? `${params.roomType} Oda` : (flat.area < 65 ? '1+1 Oda' : flat.area < 95 ? '2+1 Oda' : flat.area < 135 ? '3+1 Oda' : '4+1 Oda');
                
                return (
                  <tr key={flat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">
                      <div>Daire {flat.id}</div>
                      <div className="text-[10px] text-indigo-600 font-normal">
                        {floorNo}. Kat / {totalFloors} Kat
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{flat.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">TC: {flat.tc}</div>
                    </td>
                    <td className="p-3 text-slate-700">
                      <div className="font-semibold text-slate-800">{roomCountText}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Brüt: {physicalGrossArea} m² <span className="text-[9px] text-slate-400 font-normal">(Pay: {flat.area} m²)</span> | Net: {physicalNetArea} m²
                      </div>
                    </td>
                    <td className="p-3 text-slate-900 font-mono">
                      {flat.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    {isContractorShareModel ? (
                      <>
                        <td className="p-3 text-emerald-700 font-semibold font-mono">
                          -{flat.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                          <span className="block text-[9px] text-slate-500 font-normal">
                            {isContractor ? "Müteahhit Payı Satış" : "Arsa Payı Mahsubu"}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-emerald-800 font-mono bg-emerald-50/40">
                          0 TL
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 text-slate-600 font-mono">
                          -{flat.downPayment.toLocaleString('tr-TR')} TL
                        </td>
                        <td className="p-3 text-indigo-700 font-mono">
                          -{flat.usedCredit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                        </td>
                        <td className="p-3 font-bold text-slate-900 font-mono bg-indigo-50/20">
                          {flat.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table 2: Hakediş ve Ödeme Takvimi */}
        <h4 className="text-xs font-bold text-indigo-700 border-b border-slate-200 pb-2 mb-3 uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-2">
            {params.paymentPlanType === 'installments' ? (
              <Calendar className="w-4 h-4 text-emerald-600" />
            ) : params.paymentPlanType === 'hybrid' ? (
              <Sparkles className="w-4 h-4 text-purple-600" />
            ) : (
              <LayoutGrid className="w-4 h-4 text-indigo-600" />
            )}
            <span>
              2.{' '}
              {params.paymentPlanType === 'installments'
                ? `Aylık Eşit Taksitli Ödeme Takvimi (${params.installmentCount || 12} Ay Vadeli)`
                : params.paymentPlanType === 'hybrid'
                ? `Karma Ödeme Takvimi (Peşinat + Ara Ödemeler + ${params.installmentCount || 12} Ay Taksit)`
                : `Fiziki İlerleme Hakediş Takvimi (5 Kademeli Aşama)`}
            </span>
          </div>
          <span className="text-[10px] font-normal text-slate-500 font-mono">
            Model:{' '}
            {params.paymentPlanType === 'installments'
              ? 'Taksitli Ödeme'
              : params.paymentPlanType === 'hybrid'
              ? 'Karma (Hibrit)'
              : 'Fiziki Hakediş'}
          </span>
        </h4>
        
        {isContractorShareModel ? (
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 leading-relaxed mb-6">
            <h5 className="font-semibold text-emerald-800 text-xs mb-1">
              🤝 Kat Karşılığı Finansman Beyanı:
            </h5>
            <p>
              Kat Karşılığı Yapım Modelinde, tüm yapı tasarım, ruhsat, malzeme ve yapım bedelleri müteahhite devredilen paylardan ({results.flatResults.filter(f => f.isContractorShare).length} adet Müteahhit Dairesi) finanse edilir. Bu nedenle arsa maliklerinin herhangi bir nakit borçlanma yükümlülüğü veya inşaat fiziki ilerlemesine bağlı hakediş ödeme takvimi bulunmamaktadır. Tüm yapım riski ve finansal yönetim AB YAPI tarafından üstlenilmiştir.
            </p>
          </div>
        ) : params.paymentPlanType === 'installments' ? (
          /* SEÇENEK A: SADECE AYLIK TAKSİT TABLOSU GÖSTERİLİR */
          <div className="overflow-x-auto mb-6 rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3 border-b border-slate-200 font-semibold">Daire / Malik</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right">Daire Payı Bedeli</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right text-indigo-700">Ödenen Peşinat</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right text-emerald-700">Devlet Desteği</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right">Kalan Net Borç</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-center">Vade</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right text-emerald-800 bg-emerald-50/50">
                    Aylık Taksit Tutarı
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.flatResults.map((flat) => (
                  <tr key={flat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">
                      Daire {flat.id} ({flat.name})
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700">
                      {flat.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 text-right font-mono text-indigo-700">
                      -{flat.downPayment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-700 font-semibold">
                      {flat.usedCredit > 0 ? `-${flat.usedCredit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL` : '-'}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900 font-mono">
                      {flat.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600">
                      {flat.netRemainingDebt > 0 ? `${params.installmentCount || 12} Ay` : '-'}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-800 font-mono bg-emerald-50/50">
                      {flat.netRemainingDebt > 0
                        ? `${flat.monthlyInstallment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL / Ay`
                        : '0 TL'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                <tr>
                  <td colSpan={4} className="p-3 text-slate-800">
                    PROJE AYLIK TOPLAM ŞANTİYE KASA GİRİŞİ:
                  </td>
                  <td className="p-3 text-right font-mono text-slate-900">
                    {results.flatResults
                      .reduce((sum, f) => sum + f.netRemainingDebt, 0)
                      .toLocaleString('tr-TR', { maximumFractionDigits: 0 })}{' '}
                    TL
                  </td>
                  <td className="p-3 text-center font-mono text-slate-700">
                    {params.installmentCount || 12} Ay
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-800 text-sm bg-emerald-100/60">
                    {(results.totalMonthlyInstallments || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL / Ay
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : params.paymentPlanType === 'hybrid' ? (
          /* SEÇENEK B: SADECE KARMA / HİBRİT TABLOSU GÖSTERİLİR */
          <div className="overflow-x-auto mb-6 rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3 border-b border-slate-200 font-semibold">Daire / Malik</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right">Net Kalan Borç</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right text-indigo-700">1. Ara Ödeme (%25 Kaba)</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right text-purple-700">2. Ara Ödeme (%15 İskân)</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right">Taksitlendirilen Tutar (%60)</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right text-emerald-800 bg-emerald-50/50">
                    Aylık Taksit ({params.installmentCount || 12} Ay)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.flatResults.map((flat) => {
                  const interim1 = Math.round(flat.netRemainingDebt * 0.25);
                  const interim2 = Math.round(flat.netRemainingDebt * 0.15);
                  const remainingToInstallments = Math.max(0, flat.netRemainingDebt - interim1 - interim2);
                  const hybridMonthly = Math.round(remainingToInstallments / Math.max(1, params.installmentCount || 12));

                  return (
                    <tr key={flat.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">
                        Daire {flat.id} ({flat.name})
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900 font-mono">
                        {flat.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 text-right text-indigo-700 font-mono">
                        {interim1.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 text-right text-purple-700 font-mono">
                        {interim2.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700 font-semibold">
                        {remainingToInstallments.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-800 font-mono bg-emerald-50/50">
                        {flat.netRemainingDebt > 0 ? `${hybridMonthly.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL / Ay` : '0 TL'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* SEÇENEK C: SADECE 5 KADEMELİ FİZİKİ HAKEDİŞ TABLOSU GÖSTERİLİR */
          <div className="overflow-x-auto mb-6 rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3 border-b border-slate-200 font-semibold">Daire / Malik</th>
                  <th className="p-3 border-b border-slate-200 font-semibold">1. Aşama (%{params.stage1Pay})</th>
                  <th className="p-3 border-b border-slate-200 font-semibold">2. Aşama (%{params.stage2Pay})</th>
                  <th className="p-3 border-b border-slate-200 font-semibold">3. Aşama (%{params.stage3Pay})</th>
                  <th className="p-3 border-b border-slate-200 font-semibold">4. Aşama (%{params.stage4Pay})</th>
                  <th className="p-3 border-b border-slate-200 font-semibold">5. Aşama (%{params.stage5Pay})</th>
                  <th className="p-3 border-b border-slate-200 font-semibold">Toplam Malik Borcu</th>
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
                      {flat.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
            <p className="font-semibold mb-1 text-slate-900">MÜŞTERİ / KAT MALİKİ İMZA</p>
            <p className="text-[11px] text-slate-500 mb-10 leading-tight">Kat Maliki / Hak Sahibi</p>
            <p className="text-slate-400">.... / .... / 2026</p>
          </div>
          <div className="text-center">
            <p className="font-semibold mb-1 text-slate-900">YÜKLENİCİ İMZA / KAŞE</p>
            <p className="text-[11px] text-slate-500 mb-10 leading-tight">
              {profile.legalName}
              {profile.authorizedPerson ? <><br />Yetkili: {profile.authorizedPerson}</> : null}
            </p>
            <p className="text-slate-400">.... / .... / 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
};
