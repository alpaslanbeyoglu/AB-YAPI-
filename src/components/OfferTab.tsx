import React, { useState } from 'react';
import { Printer, Cloud, CheckCircle2, AlertCircle, ShieldCheck, FileText, Compass, LayoutGrid } from 'lucide-react';
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

// Helper to render front-elevation building schematic
const renderFrontViewSvg = (floorCount: number, hasShop: boolean, roofType: string) => {
  const N = floorCount || 5;
  const floorHeight = 22;
  const shopHeight = 32;
  
  const floors = [];
  let currentY = 190; // Bottom base ground line
  
  for (let f = 0; f < N; f++) {
    const isShop = f === 0 && hasShop;
    const h = isShop ? shopHeight : floorHeight;
    floors.push({
      index: f,
      isShop,
      y: currentY - h,
      h: h
    });
    currentY -= h;
  }
  
  const topY = currentY;
  
  return (
    <svg viewBox="0 0 220 220" className="w-full h-44 md:h-52 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
      <defs>
        <pattern id="gridPattern" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#1e293b" strokeWidth="0.5" />
        </pattern>
      </defs>
      {/* Background and grid */}
      <rect width="100%" height="100%" fill="#0b1329" />
      <rect width="100%" height="100%" fill="url(#gridPattern)" />
      
      {/* Ground Line */}
      <line x1="10" y1="190" x2="210" y2="190" stroke="#475569" strokeWidth="2.5" />
      
      {/* Building Frame */}
      <g stroke="#38bdf8" strokeWidth="1.2" fill="#1e293b" fillOpacity="0.75">
        {floors.map((fl) => (
          <g key={fl.index}>
            {/* Slab */}
            <rect x="45" y={fl.y} width="130" height={fl.h} rx="1" />
            
            {fl.isShop ? (
              // Ground floor commercial shop windows and door
              <g stroke="#38bdf8" strokeWidth="1" fill="#0f172a" fillOpacity="0.9">
                {/* Store 1 */}
                <rect x="52" y={fl.y + 10} width="34" height="19" rx="1" />
                {/* Store 2 */}
                <rect x="92" y={fl.y + 10} width="36" height="19" rx="1" />
                {/* Store 3 */}
                <rect x="134" y={fl.y + 10} width="34" height="19" rx="1" />
                {/* Divider lines inside shop windows */}
                <line x1="69" y1={fl.y + 10} x2="69" y2={fl.y + 29} stroke="#38bdf8" strokeWidth="0.5" />
                <line x1="110" y1={fl.y + 10} x2="110" y2={fl.y + 29} stroke="#38bdf8" strokeWidth="0.5" />
                <line x1="151" y1={fl.y + 10} x2="151" y2={fl.y + 29} stroke="#38bdf8" strokeWidth="0.5" />
                {/* Signboard */}
                <rect x="48" y={fl.y + 2} width="124" height="6" fill="#38bdf8" fillOpacity="0.25" />
                <text x="110" y={fl.y + 7} fill="#38bdf8" fontSize="4.5" textAnchor="middle" stroke="none" fontWeight="bold">AB TİCARET / TİCARİ MAĞAZA</text>
              </g>
            ) : (
              // Residential window patterns
              <g stroke="#38bdf8" strokeWidth="1" fill="none">
                {/* Window Left */}
                <rect x="54" y={fl.y + 4} width="18" height="12" rx="1" fill="#0f172a" />
                <line x1="63" y1={fl.y + 4} x2="63" y2={fl.y + 16} stroke="#38bdf8" strokeWidth="0.5" />
                <line x1="54" y1={fl.y + 10} x2="72" y2={fl.y + 10} stroke="#38bdf8" strokeWidth="0.5" />
                
                {/* Middle glass or balcony door */}
                <rect x="100" y={fl.y + 4} width="20" height="14" rx="1" fill="#0f172a" />
                <line x1="110" y1={fl.y + 4} x2="110" y2={fl.y + 18} stroke="#38bdf8" strokeWidth="0.5" />
                
                {/* Window Right */}
                <rect x="148" y={fl.y + 4} width="18" height="12" rx="1" fill="#0f172a" />
                <line x1="157" y1={fl.y + 4} x2="157" y2={fl.y + 16} stroke="#38bdf8" strokeWidth="0.5" />
                <line x1="148" y1={fl.y + 10} x2="166" y2={fl.y + 10} stroke="#38bdf8" strokeWidth="0.5" />
                
                {/* Balcony Railing */}
                {fl.index >= 1 && (
                  <rect x="94" y={fl.y + 11} width="32" height="7" fill="#38bdf8" fillOpacity="0.3" rx="0.5" />
                )}
              </g>
            )}
            
            {/* Label */}
            <text x="20" y={fl.y + fl.h / 2 + 2} fill="#64748b" fontSize="6" stroke="none" fontWeight="semibold">
              {fl.isShop ? "Zemin Kat" : `${fl.index}. Kat`}
            </text>
          </g>
        ))}
        
        {/* Roof rendering based on roofType */}
        {roofType === 'gable' && (
          <g>
            <polygon points={`45,${topY} 110,${topY - 24} 175,${topY}`} fill="#1e293b" fillOpacity="0.9" stroke="#38bdf8" strokeWidth="1.2" />
            <line x1="110" y1={topY - 24} x2="110" y2={topY} stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="2,2" />
          </g>
        )}
        {roofType === 'flat' && (
          <g fill="#1e293b">
            <rect x="45" y={topY - 4} width="130" height="4" stroke="#38bdf8" strokeWidth="1.2" />
            <line x1="60" y1={topY - 4} x2="60" y2={topY} stroke="#38bdf8" strokeWidth="0.5" />
            <line x1="160" y1={topY - 4} x2="160" y2={topY} stroke="#38bdf8" strokeWidth="0.5" />
          </g>
        )}
        {roofType === 'mansard' && (
          <g>
            <polygon points={`45,${topY} 65,${topY - 18} 155,${topY - 18} 175,${topY}`} fill="#1e293b" fillOpacity="0.9" stroke="#38bdf8" strokeWidth="1.2" />
            <line x1="65" y1={topY - 18} x2="65" y2={topY} stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="1,2" />
            <line x1="155" y1={topY - 18} x2="155" y2={topY} stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="1,2" />
          </g>
        )}
        {roofType === 'duplex' && (
          <g>
            <polygon points={`45,${topY} 65,${topY - 18} 155,${topY - 18} 175,${topY}`} fill="#1e293b" fillOpacity="0.9" stroke="#38bdf8" strokeWidth="1.2" />
            {/* Dormer Window */}
            <rect x="98" y={topY - 13} width="24" height="10" rx="1" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
            <line x1="110" y1={topY - 13} x2="110" y2={topY - 3} stroke="#38bdf8" strokeWidth="0.5" />
            <text x="110" y={topY - 15} fill="#10b981" fontSize="4.5" textAnchor="middle" stroke="none" fontWeight="bold">ÇATI DUBLEKSİ</text>
          </g>
        )}
      </g>
      
      {/* Schematic details */}
      <text x="110" y="210" fill="#38bdf8" fontSize="8" textAnchor="middle" stroke="none" fontWeight="bold" letterSpacing="1.5">
        ÖN CEPHE GÖRÜNÜMÜ
      </text>
    </svg>
  );
};

// Helper to render 3D Isometric Projection building schematic
const renderIsometricViewSvg = (floorCount: number, hasShop: boolean, roofType: string) => {
  const N = floorCount || 5;
  
  // Set up floors list from bottom to top
  const floors = [];
  let currentBaseY = 175; // Isometric center base point
  
  for (let f = 0; f < N; f++) {
    const isShop = f === 0 && hasShop;
    const h = isShop ? 22 : 15;
    floors.push({
      index: f,
      isShop,
      baseY: currentBaseY,
      h: h
    });
    currentBaseY -= h;
  }
  
  const topBaseY = currentBaseY;
  
  return (
    <svg viewBox="0 0 220 220" className="w-full h-44 md:h-52 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
      <defs>
        <pattern id="gridPatternIso" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#1e293b" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="#0b1329" />
      <rect width="100%" height="100%" fill="url(#gridPatternIso)" />
      
      {/* 3D Stacked Boxes */}
      {floors.map((fl) => {
        const x_c = 110;
        const y_c = fl.baseY;
        const h = fl.h;
        
        // Isometric perspective vectors:
        const dx_w = 45;
        const dy_w = 13;
        const dx_d = -45;
        const dy_d = 13;
        
        // Define points for faces
        // 1. Left face (depth side)
        const leftFacePoints = `
          ${x_c},${y_c} 
          ${x_c + dx_d},${y_c + dy_d} 
          ${x_c + dx_d},${y_c + dy_d - h} 
          ${x_c},${y_c - h}
        `.trim().replace(/\s+/g, ' ');
        
        // 2. Right face (width side)
        const rightFacePoints = `
          ${x_c},${y_c} 
          ${x_c + dx_w},${y_c + dy_w} 
          ${x_c + dx_w},${y_c + dy_w - h} 
          ${x_c},${y_c - h}
        `.trim().replace(/\s+/g, ' ');
        
        // 3. Top face (slab cover)
        const topFacePoints = `
          ${x_c},${y_c - h} 
          ${x_c + dx_w},${y_c + dy_w - h} 
          ${x_c + dx_w + dx_d},${y_c + dy_w + dy_d - h} 
          ${x_c + dx_d},${y_c + dy_d - h}
        `.trim().replace(/\s+/g, ' ');

        return (
          <g key={fl.index}>
            {/* Left Face Shaded */}
            <polygon points={leftFacePoints} fill="#1e293b" fillOpacity="0.85" stroke="#38bdf8" strokeWidth="0.8" />
            
            {/* Right Face Darker Shaded */}
            <polygon points={rightFacePoints} fill="#0f172a" fillOpacity="0.9" stroke="#38bdf8" strokeWidth="0.8" />
            
            {/* Top Slab Highlight */}
            <polygon points={topFacePoints} fill="#334155" fillOpacity="0.9" stroke="#38bdf8" strokeWidth="0.8" />
            
            {/* Architectural details / window lines on isometric faces */}
            {!fl.isShop ? (
              <g stroke="#38bdf8" strokeWidth="0.5" fill="none">
                {/* Left Face Windows */}
                <line x1={x_c - 15} y1={y_c - h/2 + 2} x2={x_c - 30} y2={y_c - h/2 + 6} strokeWidth="0.8" />
                <line x1={x_c - 15} y1={y_c - h/2 - 2} x2={x_c - 30} y2={y_c - h/2 + 2} strokeWidth="0.8" />
                
                {/* Right Face Windows */}
                <line x1={x_c + 15} y1={y_c - h/2 + 2} x2={x_c + 30} y2={y_c - h/2 + 6} strokeWidth="0.8" />
                <line x1={x_c + 15} y1={y_c - h/2 - 2} x2={x_c + 30} y2={y_c - h/2 + 2} strokeWidth="0.8" />
              </g>
            ) : (
              // Ground Shop Entrance indicator
              <g stroke="#34d399" strokeWidth="0.8" fill="none">
                <line x1={x_c + 10} y1={y_c + 3} x2={x_c + 25} y2={y_c + 7} />
                <line x1={x_c + 10} y1={y_c - 6} x2={x_c + 25} y2={y_c - 2} />
                <line x1={x_c + 10} y1={y_c + 3} x2={x_c + 10} y2={y_c - 6} />
                <line x1={x_c + 25} y1={y_c + 7} x2={x_c + 25} y2={y_c - 2} />
              </g>
            )}
          </g>
        );
      })}
      
      {/* Roof drawing on top of everything */}
      {(() => {
        const x_c = 110;
        const y_c = topBaseY;
        const dx_w = 45;
        const dy_w = 13;
        const dx_d = -45;
        const dy_d = 13;
        
        const rH = 18; // Roof peak height
        
        if (roofType === 'gable') {
          // Gable peak line from left ridge to right ridge
          const peakLeftX = x_c + dx_d / 2;
          const peakLeftY = y_c + dy_d / 2 - rH;
          const peakRightX = x_c + dx_w + dx_d / 2;
          const peakRightY = y_c + dy_w + dy_d / 2 - rH;
          
          return (
            <g stroke="#38bdf8" strokeWidth="1" fill="#1e293b" fillOpacity="0.8">
              {/* Front left pitch */}
              <polygon points={`
                ${x_c + dx_d},${y_c + dy_d} 
                ${x_c},${y_c} 
                ${peakRightX - dx_d/2},${peakRightY - dy_d/2} 
                ${peakLeftX},${peakLeftY}
              `} fill="#334155" stroke="#38bdf8" />
              
              {/* Front right pitch */}
              <polygon points={`
                ${x_c},${y_c} 
                ${x_c + dx_w},${y_c + dy_w} 
                ${peakRightX},${peakRightY} 
                ${peakRightX - dx_d/2},${peakRightY - dy_d/2}
              `} fill="#0f172a" stroke="#38bdf8" />
            </g>
          );
        } else if (roofType === 'flat') {
          return (
            <g stroke="#38bdf8" strokeWidth="1" fill="#111827">
              {/* Thin parapet borders */}
              <polygon points={`
                ${x_c},${y_c - 3} 
                ${x_c + dx_w},${y_c + dy_w - 3} 
                ${x_c + dx_w + dx_d},${y_c + dy_w + dy_d - 3} 
                ${x_c + dx_d},${y_c + dy_d - 3}
              `} fill="#1e293b" fillOpacity="0.5" />
            </g>
          );
        } else {
          // Mansard / Duplex trapezoid box
          const peakW_x = dx_w * 0.7;
          const peakW_y = dy_w * 0.7;
          const peakD_x = dx_d * 0.7;
          const peakD_y = dy_d * 0.7;
          
          const mansardTopPoints = `
            ${x_c + (dx_w - peakW_x)/2 + (dx_d - peakD_x)/2},${y_c - rH} 
            ${x_c + (dx_w - peakW_x)/2 + (dx_d - peakD_x)/2 + peakW_x},${y_c + peakW_y - rH} 
            ${x_c + (dx_w - peakW_x)/2 + (dx_d - peakD_x)/2 + peakW_x + peakD_x},${y_c + peakW_y + peakD_y - rH} 
            ${x_c + (dx_w - peakW_x)/2 + (dx_d - peakD_x)/2 + peakD_x},${y_c + peakD_y - rH}
          `.trim().replace(/\s+/g, ' ');
          
          return (
            <g stroke="#38bdf8" strokeWidth="1" fill="#1e293b">
              {/* Top slab */}
              <polygon points={mansardTopPoints} fill="#475569" />
              {/* Slopes */}
              <polygon points={`
                ${x_c + dx_d},${y_c + dy_d} 
                ${x_c},${y_c} 
                ${x_c + (dx_w - peakW_x)/2 + (dx_d - peakD_x)/2 + peakW_x},${y_c + peakW_y - rH} 
                ${x_c + (dx_w - peakW_x)/2 + (dx_d - peakD_x)/2},${y_c - rH}
              `} fill="#334155" />
            </g>
          );
        }
      })()}
      
      {/* Schematic details */}
      <text x="110" y="210" fill="#38bdf8" fontSize="8" textAnchor="middle" stroke="none" fontWeight="bold" letterSpacing="1.5">
        AKSONOMETRİK GÖRÜNÜM (3D)
      </text>
    </svg>
  );
};

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
            <strong className="text-slate-700">Bina Oturumu:</strong>{' '}
            {results.baseArea.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} m² |{' '}
            <strong className="text-slate-700">Toplam İnşaat Alanı:</strong>{' '}
            {results.totalArea.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} m² |{' '}
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

        {/* Dynamic Architectural Views Component */}
        <div className="mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-200">
          <h4 className="text-xs font-bold text-indigo-700 mb-4 uppercase tracking-wider flex items-center gap-2">
            <Compass className="w-4 h-4" />
            <span>🎨 Mimari Kütle & Cephe Görünümleri (3D & 2D)</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-6">
            <div className="space-y-2">
              <span className="block text-[11px] font-bold text-slate-600 tracking-wide uppercase">A. Ön Cephe Görünümü (2D Elevation)</span>
              {renderFrontViewSvg(params.floorCount || 5, !!params.hasGroundFloorShop, params.roofType || 'gable')}
            </div>
            <div className="space-y-2">
              <span className="block text-[11px] font-bold text-slate-600 tracking-wide uppercase">B. Çapraz / Aksonometrik Perspektif (3D Wireframe)</span>
              {renderIsometricViewSvg(params.floorCount || 5, !!params.hasGroundFloorShop, params.roofType || 'gable')}
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 text-center italic">
            * Yukarıdaki teknik çizimler, girdiğiniz kat adedi ({params.floorCount} Kat), zemin ticari alan durumu ({params.hasGroundFloorShop ? "Var" : "Yok"}) ve çatı tipi ({params.roofType === 'gable' ? "Beşik Çatı" : params.roofType === 'flat' ? "Düz Çatı / Teras" : params.roofType === 'mansard' ? "Mansard Çatı" : "Dubleks Teras Çatı"}) özelliklerine göre dinamik olarak şematize edilmiştir.
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
                <th className="p-3 border-b border-slate-200 font-semibold">Daire No</th>
                <th className="p-3 border-b border-slate-200 font-semibold">Hak Sahibi & TC</th>
                <th className="p-3 border-b border-slate-200 font-semibold">Alan (m²)</th>
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
                
                return (
                  <tr key={flat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">Daire {flat.id}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{flat.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">TC: {flat.tc}</div>
                    </td>
                    <td className="p-3 text-slate-700 font-mono">{flat.area} m²</td>
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

        {/* Table 2: Hakediş Takvimi */}
        <h4 className="text-xs font-bold text-indigo-700 border-b border-slate-200 pb-2 mb-3 uppercase tracking-wider flex items-center gap-2">
          <LayoutGrid className="w-4 h-4" />
          <span>2. Fiziki İlerleme Hakediş Takvimi</span>
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
        ) : (
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
