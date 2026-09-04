import React, { useRef, useState } from 'react';
import {
  Compass,
  Building,
  Info,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  Store,
  Warehouse,
  Shield,
  Grid,
} from 'lucide-react';
import { exportElementToPdf, printHtmlContent } from '../utils/pdfExport';
import { PrintAndPdfButtons } from './PrintAndPdfButtons';
import { BuildingModelParams, ProjectParams, RoomType } from '../types';
import {
  calculateBuildingMetrics,
  getFloorFlatLayouts,
  getDuplexAtticRooms,
  getShopFloorLayout,
  getBasementFloorLayout,
  RoomDetail,
  FlatLayout,
} from '../utils/buildingModelUtils';

interface FloorPlan2DViewProps {
  params: BuildingModelParams;
  onUpdateParams?: (updates: Partial<BuildingModelParams>) => void;
  onSyncWithCalculator?: (newParams: Partial<ProjectParams>) => void;
  onNavigateToCalculator?: () => void;
  theme?: 'light' | 'gray' | 'dark';
}

export type SelectedFloorTab = 'basement' | 'ground' | 'first' | 'typical' | 'duplex';

export const FloorPlan2DView: React.FC<FloorPlan2DViewProps> = ({
  params,
  onUpdateParams,
  onSyncWithCalculator,
  onNavigateToCalculator,
  theme = 'light',
}) => {
  const planRef = useRef<HTMLDivElement>(null);
  const [selectedFloorTab, setSelectedFloorTab] = useState<SelectedFloorTab>('typical');
  const [syncedFeedback, setSyncedFeedback] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  const isGray = theme === 'gray';
  const isLight = !isGray;

  const metrics = calculateBuildingMetrics(params);
  const isDuplex = params.roofType === 'duplex';
  const hasCantilever = params.hasCantilever ?? false;
  const cantileverDepth = params.cantileverDepth ?? 1.2;
  const cantileverDirection = params.cantileverDirection ?? 'front_back';

  // Floor options for user selection
  const floorTabs: { id: SelectedFloorTab; label: string; sub: string; badge?: string }[] = [];

  if (params.basementCount > 0) {
    floorTabs.push({
      id: 'basement',
      label: 'Bodrum Kat',
      sub: 'Otopark & Sığınak',
      badge: 'Ortak Alan',
    });
  }

  floorTabs.push({
    id: 'ground',
    label: 'Zemin Kat',
    sub: params.hasGroundFloorShop ? 'Ticari Mağaza Planı' : 'Giriş Kat & Daireler',
    badge: params.hasGroundFloorShop ? 'Ticari Vitrin' : 'Giriş Holü',
  });

  if (hasCantilever && params.floorCount > 1) {
    floorTabs.push({
      id: 'first',
      label: '1. Kat (Çıkmalı)',
      sub: 'Konsol Tabla Çıkması',
      badge: `+${cantileverDepth.toFixed(2)}m Çıkma`,
    });
  }

  floorTabs.push({
    id: 'typical',
    label: hasCantilever && params.floorCount > 1 ? '2. Kat / Tip Kat' : 'Normal Tip Kat',
    sub: `Katta ${params.flatsPerFloor} Daire (${params.roomType})`,
    badge: 'Standart',
  });

  if (isDuplex) {
    floorTabs.push({
      id: 'duplex',
      label: 'Çatı Dubleksi',
      sub: 'Teras & Penthouse Süit',
      badge: 'Teraslı Kat',
    });
  }

  // Active layouts based on selected floor
  let activeLayouts: FlatLayout[] = [];
  let isDuplexAtticView = false;

  if (selectedFloorTab === 'basement') {
    activeLayouts = getBasementFloorLayout(params, metrics);
  } else if (selectedFloorTab === 'ground') {
    if (params.hasGroundFloorShop) {
      activeLayouts = getShopFloorLayout(params, metrics);
    } else {
      activeLayouts = getFloorFlatLayouts(params, metrics);
    }
  } else if (selectedFloorTab === 'duplex') {
    isDuplexAtticView = true;
    activeLayouts = [];
  } else {
    // 'first' or 'typical'
    activeLayouts = getFloorFlatLayouts(params, metrics);
  }

  const duplexAtticRooms: RoomDetail[] = isDuplex ? getDuplexAtticRooms(metrics.flatNetArea) : [];

  // Determine current floor dimensions (account for cantilevers on upper floors)
  const isUpperFloorWithCantilever =
    (selectedFloorTab === 'first' || selectedFloorTab === 'typical' || selectedFloorTab === 'duplex') &&
    hasCantilever;

  let currentFacadeWidth = params.facadeWidth;
  let currentFacadeDepth = params.facadeDepth;

  if (isUpperFloorWithCantilever) {
    if (cantileverDirection === 'all') {
      currentFacadeWidth += cantileverDepth * 2;
      currentFacadeDepth += cantileverDepth * 2;
    } else if (cantileverDirection === 'front_back') {
      currentFacadeDepth += cantileverDepth * 2;
    } else if (cantileverDirection === 'front') {
      currentFacadeDepth += cantileverDepth;
    }
  }

  // Base scale: 28 pixels per meter
  const scale = 28;
  const paddingM = 3.5; // Margin around building for grid axis and dimension lines
  const totalSvgWidth = (currentFacadeWidth + paddingM * 2) * scale;
  const totalSvgHeight = (currentFacadeDepth + paddingM * 2) * scale;

  // Building footprint in SVG coordinates
  const bX = paddingM * scale;
  const bY = paddingM * scale;
  const bW = currentFacadeWidth * scale;
  const bH = currentFacadeDepth * scale;

  // Ground floor footprint reference (for showing cantilever projection lines)
  const gW = params.facadeWidth * scale;
  const gH = params.facadeDepth * scale;
  const gX = bX + (bW - gW) / 2;
  const gY = cantileverDirection === 'front' ? bY : bY + (bH - gH) / 2;

  // CAD WALL THICKNESSES
  // Dış duvar: 25 cm = 0.25 * scale = 7.0 px
  const extWallThick = Math.round(0.25 * scale); // 7px
  // İç bölme duvarı: 15 cm = 0.15 * scale = 4.2 px
  const intWallThick = Math.max(3, Math.round(0.15 * scale)); // ~4.2px

  // Center core coordinates on symmetry axis
  const coreCenterX = bX + bW / 2;
  const coreCenterY = bY + bH / 2;

  // Core dimensions in pixels (Staircase & Elevator)
  const stairW = params.stairWidth * scale;
  const stairH = params.stairDepth * scale;
  const elevW = params.elevatorWidth * scale;
  const elevH = params.elevatorDepth * scale;

  // Core arrangement: Staircase on left of axis, Elevator on right, with common corridor surrounding
  const stairX = coreCenterX - stairW - 12;
  const stairY = coreCenterY - stairH / 2;
  const elevX = coreCenterX + 12;
  const elevY = coreCenterY - elevH / 2;

  // Common circulation corridor (Kat Holü) around core
  const corridorPad = 1.4 * scale; // 1.40m wide corridor
  const corrX = stairX - 8;
  const corrY = Math.min(stairY, elevY) - corridorPad;
  const corrW = elevX + elevW - stairX + 16;
  const corrH = Math.max(stairH, elevH) + corridorPad * 2;

  // Sync dimensions to main calculation engine
  const handleSyncToCalculator = () => {
    if (onSyncWithCalculator) {
      onSyncWithCalculator({
        baseBuildArea: Math.round(metrics.footprintArea * 100) / 100,
        floorCount: params.floorCount,
        flatCount: metrics.totalFlats,
        roofType: params.roofType,
        roomType: params.roomType,
        basementCount: params.basementCount,
        hasGroundFloorShop: params.hasGroundFloorShop,
        shopCount: params.shopCount,
        shopHeight: params.shopHeight,
        hasCantilever: params.hasCantilever,
        cantileverDepth: params.cantileverDepth,
        cantileverDirection: params.cantileverDirection,
        facadeWidth: params.facadeWidth,
        facadeDepth: params.facadeDepth,
        flatsPerFloor: params.flatsPerFloor,
        facadeStyle: params.facadeStyle,
        balconyDepth: params.balconyDepth,
      });
      setSyncedFeedback(
        `Taban Alanı (${metrics.footprintArea.toFixed(2)} m²), ${params.floorCount} Kat, ${params.roofType === 'duplex' ? 'Çatı Dubleksi' : params.roofType === 'mansard' ? 'Mansart Çatı' : params.roofType === 'flat' ? 'Düz Teras Çatı' : 'Kırma Çatı'} ve ${metrics.totalFlats} Daire ana hesaplama tablosuna aktarıldı!`
      );
      setTimeout(() => setSyncedFeedback(null), 4000);
    }
  };

  const handleExportPdf = async () => {
    if (!planRef.current) return;
    const fileName = `AB_YAPI_2D_Kat_Plani_${selectedFloorTab}_${new Date().toISOString().slice(0, 10)}.pdf`;
    await exportElementToPdf(planRef.current, fileName, { landscape: true });
  };

  const handlePrint = () => {
    if (!planRef.current) return;
    const planHtml = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <title>AB YAPI - 2D Mimari Kat Planı</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 15px; color: #000; background: #fff; }
          .print-container { width: 100%; display: flex; justify-content: center; }
          svg { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${planRef.current.innerHTML}
        </div>
      </body>
      </html>
    `;
    printHtmlContent(planHtml, `AB_YAPI_2D_Kat_Plani_${selectedFloorTab}`);
  };

  const cardBg = isGray
    ? 'bg-slate-100 border-slate-300 text-slate-900 shadow-sm'
    : 'bg-white border-slate-200 text-slate-900 shadow-sm';
  const subCardBg = isGray
    ? 'bg-white border-slate-300 text-slate-800'
    : 'bg-slate-50 border-slate-200 text-slate-800';
  const textMuted = 'text-slate-500';

  // Helper to render CAD 90-degree door swing
  const renderCadDoor = (
    hingeX: number,
    hingeY: number,
    doorWidth: number,
    orientation: 'N' | 'S' | 'E' | 'W',
    swing: 'left' | 'right',
    strokeColor: string,
    isEntrance = false
  ) => {
    const R = doorWidth;
    let leafEndX = hingeX;
    let leafEndY = hingeY;
    let arcStartX = hingeX;
    let arcStartY = hingeY;
    let sweepFlag = 1;

    if (orientation === 'N') {
      // Wall runs along X, door swings North (-Y)
      if (swing === 'right') {
        arcStartX = hingeX + R;
        arcStartY = hingeY;
        leafEndX = hingeX;
        leafEndY = hingeY - R;
        sweepFlag = 0;
      } else {
        arcStartX = hingeX - R;
        arcStartY = hingeY;
        leafEndX = hingeX;
        leafEndY = hingeY - R;
        sweepFlag = 1;
      }
    } else if (orientation === 'S') {
      // Wall runs along X, door swings South (+Y)
      if (swing === 'right') {
        arcStartX = hingeX + R;
        arcStartY = hingeY;
        leafEndX = hingeX;
        leafEndY = hingeY + R;
        sweepFlag = 1;
      } else {
        arcStartX = hingeX - R;
        arcStartY = hingeY;
        leafEndX = hingeX;
        leafEndY = hingeY + R;
        sweepFlag = 0;
      }
    } else if (orientation === 'E') {
      // Wall runs along Y, door swings East (+X)
      if (swing === 'right') {
        arcStartX = hingeX;
        arcStartY = hingeY + R;
        leafEndX = hingeX + R;
        leafEndY = hingeY;
        sweepFlag = 0;
      } else {
        arcStartX = hingeX;
        arcStartY = hingeY - R;
        leafEndX = hingeX + R;
        leafEndY = hingeY;
        sweepFlag = 1;
      }
    } else {
      // 'W' - Wall runs along Y, door swings West (-X)
      if (swing === 'right') {
        arcStartX = hingeX;
        arcStartY = hingeY - R;
        leafEndX = hingeX - R;
        leafEndY = hingeY;
        sweepFlag = 0;
      } else {
        arcStartX = hingeX;
        arcStartY = hingeY + R;
        leafEndX = hingeX - R;
        leafEndY = hingeY;
        sweepFlag = 1;
      }
    }

    return (
      <g className="pointer-events-none">
        {/* Door frame jambs */}
        <rect
          x={hingeX - 1.5}
          y={hingeY - 1.5}
          width="3"
          height="3"
          fill={isEntrance ? '#3b82f6' : '#64748b'}
        />
        {/* Door leaf (opened at 90 degrees) */}
        <line
          x1={hingeX}
          y1={hingeY}
          x2={leafEndX}
          y2={leafEndY}
          stroke={isEntrance ? '#2563eb' : strokeColor}
          strokeWidth={isEntrance ? '2' : '1.5'}
        />
        {/* 90-degree Circular Arc path */}
        <path
          d={`M ${arcStartX} ${arcStartY} A ${R} ${R} 0 0 ${sweepFlag} ${leafEndX} ${leafEndY}`}
          fill="none"
          stroke={isEntrance ? '#3b82f6' : strokeColor}
          strokeWidth="1"
          strokeDasharray="3,2"
          opacity="0.85"
        />
      </g>
    );
  };

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {syncedFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-lg animate-fade-in ${
            isLight
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-semibold">{syncedFeedback}</span>
          </div>
          {onNavigateToCalculator && (
            <button
              type="button"
              onClick={onNavigateToCalculator}
              className={`inline-flex items-center gap-1.5 font-bold underline ${
                isLight ? 'text-emerald-700 hover:text-emerald-900' : 'text-emerald-200 hover:text-white'
              }`}
            >
              <span>Hesaplama Tablosuna Git</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Action and Floor Selection Header */}
      <div className={`p-5 rounded-3xl border text-xs print:hidden shadow-lg space-y-4 ${cardBg}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isLight
                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-600'
                  : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
              }`}
            >
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-base">
                  Teknik Mimari CAD Kat Planı (Ölçek 1:50)
                </h4>
                <span
                  className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    isLight
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/80'
                  }`}
                >
                  TS EN ISO 128 Standartı
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${textMuted}`}>
                Seçili Kat:{' '}
                <strong className="text-indigo-600 font-semibold">
                  {floorTabs.find((t) => t.id === selectedFloorTab)?.label}
                </strong>{' '}
                ({floorTabs.find((t) => t.id === selectedFloorTab)?.sub}) | Dış Duvar:{' '}
                <strong>25 cm</strong> | İç Duvar: <strong>15 cm</strong> | Çekirdek: <strong>Sabit Simetri Ekseni</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Grid Toggle */}
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                showGrid
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
              }`}
              title="CAD Modüler Izgara & Aksları Göster/Gizle"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>CAD Izgara</span>
            </button>

            {/* Quick Param Selectors */}
            {onUpdateParams && selectedFloorTab === 'typical' && (
              <div className="flex items-center gap-2">
                <select
                  value={params.flatsPerFloor}
                  onChange={(e) => onUpdateParams({ flatsPerFloor: Number(e.target.value) })}
                  className={`text-xs px-2.5 py-1.5 rounded-xl border font-medium ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-[#18181b] border-zinc-700 text-zinc-200'
                  }`}
                  title="Katta Daire Adedi"
                >
                  <option value={1}>Katta 1 Daire (Tam Kat)</option>
                  <option value={2}>Katta 2 Daire (Standart)</option>
                  <option value={3}>Katta 3 Daire</option>
                  <option value={4}>Katta 4 Daire</option>
                </select>

                <select
                  value={params.roomType}
                  onChange={(e) => onUpdateParams({ roomType: e.target.value as RoomType })}
                  className={`text-xs px-2.5 py-1.5 rounded-xl border font-medium ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-[#18181b] border-zinc-700 text-zinc-200'
                  }`}
                  title="Oda Sayısı"
                >
                  <option value="1+1">1+1 Tip</option>
                  <option value="2+1">2+1 Tip</option>
                  <option value="3+1">3+1 Tip</option>
                  <option value="4+1">4+1 Tip</option>
                </select>
              </div>
            )}

            {onSyncWithCalculator && (
              <button
                type="button"
                onClick={handleSyncToCalculator}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                }`}
                title="Ölçüleri Maliyet Tablosuna Senkronize Et"
              >
                <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Hesaba Aktar</span>
              </button>
            )}

            <PrintAndPdfButtons
              onExportPdf={handleExportPdf}
              onPrint={handlePrint}
              theme={theme}
            />
          </div>
        </div>

        {/* 2D Floor Selection Segmented Control */}
        <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 mr-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>Görüntülenecek Kat:</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {floorTabs.map((tab) => {
              const isActive = selectedFloorTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedFloorTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold border transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 scale-[1.02]'
                      : isLight
                      ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${
                        isActive
                          ? 'bg-indigo-700 text-indigo-100'
                          : isLight
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Şematik Çizim Uyarı Bannerı */}
      <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed ${
        isLight
          ? 'bg-amber-50/70 border-amber-200 text-amber-800'
          : 'bg-amber-950/20 border-amber-900/60 text-amber-300'
      } print:hidden`}>
        <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">⚠️ Örnek Şematik Mimari Çizim Bilgilendirmesi</p>
          <p>
            Bu ekranda ve rapor çıktılarında üretilen 2D kat planı şeması, girdiğiniz dış ölçülere, merdiven/asansör boyutlarına ve katta seçilen daire sayısına göre <strong>dinamik ve fikir verme amaçlı (örnek)</strong> olarak çizdirilmektedir. Bu çizim kesinlikle bir inşaat uygulama projesi, statik projesi veya resmi belediye ruhsat projesi niteliğinde değildir. Kesin ölçüler ve oda yerleşimleri imar yönetmeliklerine bağlı resmi mimari proje aşamasında netleşecektir.
          </p>
        </div>
      </div>

      {/* Architectural Plan SVG Viewer Card */}
      <div
        ref={planRef}
        className={`border rounded-3xl p-4 sm:p-8 shadow-2xl overflow-x-auto print:bg-white print:border-none print:shadow-none print:p-0 ${cardBg}`}
      >
        <div className="min-w-[760px] mx-auto flex flex-col items-center">
          {/* North compass & Project Header Banner */}
          <div
            className={`w-full flex items-center justify-between pb-4 mb-3 border-b print:border-slate-300 ${
              isLight ? 'border-slate-200' : 'border-zinc-800/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                  isLight
                    ? 'border-slate-300 bg-slate-100 text-slate-700'
                    : 'border-zinc-700 bg-[#18181b] text-zinc-300'
                }`}
                title="Kuzey Yönü"
              >
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-bold font-mono leading-none">N</span>
                  <Compass className="w-4 h-4 text-indigo-500" />
                </div>
              </div>
              <div>
                <h5 className="font-bold text-xs uppercase tracking-wider">
                  MİMARİ UYGULAMA PLANI (TS EN ISO 128 CAD STANDARDI)
                </h5>
                <p className={`text-[11px] ${textMuted}`}>
                  {selectedFloorTab === 'basement'
                    ? 'BODRUM KAT ORTAK MAHALLER & SIĞINAK PLANI'
                    : selectedFloorTab === 'ground'
                    ? params.hasGroundFloorShop
                      ? 'ZEMİN KAT TİCARİ MAĞAZA / DÜKKAN PLANI'
                      : 'ZEMİN KAT GİRİŞ HOLÜ VE MESKEN PLANI'
                    : selectedFloorTab === 'first' && hasCantilever
                    ? `1. KAT KONSOL ÇIKMALI NORMAL KAT PLANI (+${cantileverDepth.toFixed(2)}m TABLA ÇIKMASI)`
                    : selectedFloorTab === 'duplex'
                    ? 'ÇATI ARASI DUBLEKS KAT & TERAS PLANI'
                    : `NORMAL TİP KAT PLANI • KATTA ${params.flatsPerFloor} BAĞIMSIZ BÖLÜM`}
                </p>
              </div>
            </div>

            {/* Quick Dimension Badges */}
            <div className={`flex items-center gap-4 text-xs ${textMuted}`}>
              <p>
                <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>
                  Ön Cephe:
                </strong>{' '}
                {currentFacadeWidth.toFixed(2)} m
              </p>
              <p>
                <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>
                  Derinlik:
                </strong>{' '}
                {currentFacadeDepth.toFixed(2)} m
              </p>
              <p>
                <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>
                  Kat Brüt Alanı:
                </strong>{' '}
                {(currentFacadeWidth * currentFacadeDepth).toFixed(2)} m²
              </p>
            </div>
          </div>

          {/* Scaled SVG Architectural Drawing adhering strictly to CAD rules */}
          <svg
            viewBox={`0 0 ${totalSvgWidth} ${totalSvgHeight}`}
            className={`w-full max-w-[920px] h-auto drop-shadow-md rounded-2xl border transition-colors ${
              isLight ? 'bg-[#fcfdfd] border-slate-300' : 'bg-[#0d0e12] border-zinc-800'
            } print:bg-white print:border-slate-300`}
          >
            <defs>
              {/* CAD 0.5m & 1.0m Modular Grid Pattern */}
              <pattern
                id="cadGridMinor"
                width={0.5 * scale}
                height={0.5 * scale}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${0.5 * scale} 0 L 0 0 0 ${0.5 * scale}`}
                  fill="none"
                  stroke={isLight ? '#f1f5f9' : '#1e1e24'}
                  strokeWidth="0.5"
                />
              </pattern>
              <pattern
                id="cadGridMajor"
                width={1.0 * scale}
                height={1.0 * scale}
                patternUnits="userSpaceOnUse"
              >
                <rect width={1.0 * scale} height={1.0 * scale} fill="url(#cadGridMinor)" />
                <path
                  d={`M ${1.0 * scale} 0 L 0 0 0 ${1.0 * scale}`}
                  fill="none"
                  stroke={isLight ? '#e2e8f0' : '#27272a'}
                  strokeWidth="0.8"
                />
              </pattern>

              {/* Structural Wall Concrete Poché Pattern (Dış Duvar Dolgusu) */}
              <pattern
                id="wallPoche"
                width="6"
                height="6"
                patternTransform="rotate(45 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="6"
                  stroke={isLight ? '#64748b' : '#71717a'}
                  strokeWidth="1.2"
                />
              </pattern>

              {/* Column Reinforced Concrete Hatch (Kolon Taraması) */}
              <pattern
                id="colHatch"
                width="6"
                height="6"
                patternTransform="rotate(-45 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="6"
                  stroke={isLight ? '#0f172a' : '#818cf8'}
                  strokeWidth="1.5"
                />
              </pattern>

              {/* Wet Area Ceramic Tile Pattern */}
              <pattern id="wetTilePattern" width="10" height="10" patternUnits="userSpaceOnUse">
                <path
                  d="M 10 0 L 0 0 0 10"
                  fill="none"
                  stroke={isLight ? '#cbd5e1' : '#27272a'}
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>

            {/* 1. CAD MODULAR GRID SYSTEM */}
            {showGrid && (
              <g id="cad-modular-grid">
                <rect
                  x={bX - 20}
                  y={bY - 20}
                  width={bW + 40}
                  height={bH + 40}
                  fill="url(#cadGridMajor)"
                  opacity="0.8"
                />
              </g>
            )}

            {/* Watermark indicating this is a sample/draft schema */}
            <g opacity="0.08" className="pointer-events-none select-none">
              <text
                x={bX + bW / 2}
                y={bY + bH / 2}
                fill="#ef4444"
                fontSize={Math.max(16, bW / 12)}
                fontWeight="900"
                textAnchor="middle"
                transform={`rotate(-28 ${bX + bW / 2} ${bY + bH / 2})`}
                className="font-mono"
              >
                TASLAK ÖRNEKTİR • KESİN PROJE DEĞİLDİR
              </text>
            </g>

            {/* 2. STRUCTURAL AXIS LINES & BUBBLES (AKSLAR) */}
            <g id="structural-axes">
              {/* Horizontal Axes (1, 2, 3...) */}
              {[0, 0.5, 1].map((pct, idx) => {
                const ay = bY + pct * bH;
                const axisLabel = String(idx + 1);
                return (
                  <g key={`axis-h-${idx}`}>
                    <line
                      x1={bX - 45}
                      y1={ay}
                      x2={bX + bW + 45}
                      y2={ay}
                      stroke={isLight ? '#94a3b8' : '#52525b'}
                      strokeWidth="0.8"
                      strokeDasharray="12,3,3,3"
                    />
                    {/* Axis bubble left */}
                    <circle
                      cx={bX - 45}
                      cy={ay}
                      r="9"
                      fill={isLight ? '#ffffff' : '#18181b'}
                      stroke={isLight ? '#0f172a' : '#f8fafc'}
                      strokeWidth="1"
                    />
                    <text
                      x={bX - 45}
                      y={ay + 3}
                      fill={isLight ? '#0f172a' : '#f8fafc'}
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="font-mono"
                    >
                      {axisLabel}
                    </text>
                  </g>
                );
              })}

              {/* Vertical Axes (A, B, C...) */}
              {[0, 0.5, 1].map((pct, idx) => {
                const ax = bX + pct * bW;
                const axisLabel = String.fromCharCode(65 + idx); // A, B, C
                return (
                  <g key={`axis-v-${idx}`}>
                    <line
                      x1={ax}
                      y1={bY - 45}
                      x2={ax}
                      y2={bY + bH + 45}
                      stroke={isLight ? '#94a3b8' : '#52525b'}
                      strokeWidth="0.8"
                      strokeDasharray="12,3,3,3"
                    />
                    {/* Axis bubble top */}
                    <circle
                      cx={ax}
                      cy={bY - 45}
                      r="9"
                      fill={isLight ? '#ffffff' : '#18181b'}
                      stroke={isLight ? '#0f172a' : '#f8fafc'}
                      strokeWidth="1"
                    />
                    <text
                      x={ax}
                      y={bY - 42}
                      fill={isLight ? '#0f172a' : '#f8fafc'}
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="font-mono"
                    >
                      {axisLabel}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* 3. CANTILEVER OVERHANG INDICATION (If upper floor has cantilever) */}
            {isUpperFloorWithCantilever && (
              <g id="cantilever-indication">
                {/* Ground floor footprint contour dashed line (Zemin İzdüşümü) */}
                <rect
                  x={gX}
                  y={gY}
                  width={gW}
                  height={gH}
                  fill="none"
                  stroke={isLight ? '#0284c7' : '#38bdf8'}
                  strokeWidth="1.2"
                  strokeDasharray="6,4"
                />
                <text
                  x={gX + gW / 2}
                  y={gY + 14}
                  fill={isLight ? '#0284c7' : '#38bdf8'}
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="font-mono"
                >
                  ZEMİN KAT BİNA OTURUM İZDÜŞÜMÜ (KONSOL ALTI)
                </text>
              </g>
            )}

            {/* 4. FLOOR SLAB BASE PLATE */}
            <rect
              x={bX}
              y={bY}
              width={bW}
              height={bH}
              fill={isLight ? '#ffffff' : '#121214'}
              stroke="none"
            />

            {/* 5. EXTERIOR WALLS (25 cm Double Line + Poché Fill) */}
            {/* Outer perimeter */}
            <rect
              x={bX}
              y={bY}
              width={bW}
              height={bH}
              fill="none"
              stroke={isLight ? '#0f172a' : '#f4f4f5'}
              strokeWidth="2.5"
            />
            {/* Inner perimeter (25cm offset) */}
            <rect
              x={bX + extWallThick}
              y={bY + extWallThick}
              width={bW - extWallThick * 2}
              height={bH - extWallThick * 2}
              fill="none"
              stroke={isLight ? '#334155' : '#71717a'}
              strokeWidth="1.2"
            />
            {/* Filled Wall Poché Border */}
            <path
              d={`
                M ${bX} ${bY} H ${bX + bW} V ${bY + bH} H ${bX} Z
                M ${bX + extWallThick} ${bY + extWallThick} V ${bY + bH - extWallThick} H ${
                bX + bW - extWallThick
              } V ${bY + extWallThick} Z
              `}
              fill="url(#wallPoche)"
              fillRule="evenodd"
              opacity="0.35"
            />

            {/* 6. STRUCTURAL COLUMNS (Betonarme Kolonlar - 45x45 cm) */}
            {[
              { x: bX, y: bY },
              { x: bX + bW / 2 - 8, y: bY },
              { x: bX + bW - 16, y: bY },
              { x: bX, y: bY + bH / 2 - 8 },
              { x: bX + bW - 16, y: bY + bH / 2 - 8 },
              { x: bX, y: bY + bH - 16 },
              { x: bX + bW / 2 - 8, y: bY + bH - 16 },
              { x: bX + bW - 16, y: bY + bH - 16 },
              // Core corner columns
              { x: stairX - 4, y: stairY - 4 },
              { x: elevX + elevW - 12, y: stairY - 4 },
              { x: stairX - 4, y: stairY + stairH - 12 },
              { x: elevX + elevW - 12, y: stairY + stairH - 12 },
            ].map((col, cIdx) => (
              <rect
                key={`col-${cIdx}`}
                x={col.x}
                y={col.y}
                width="16"
                height="16"
                fill="url(#colHatch)"
                stroke={isLight ? '#0f172a' : '#ffffff'}
                strokeWidth="1.5"
              />
            ))}

            {/* 7. BALCONIES (Balkon Çıkıntıları) on 1st/typical floors */}
            {(selectedFloorTab === 'first' || selectedFloorTab === 'typical') &&
              params.balconyDepth > 0.3 && (
                <>
                  {/* Front Left Balcony */}
                  <rect
                    x={bX + 20}
                    y={bY + bH}
                    width={bW * 0.38}
                    height={params.balconyDepth * scale}
                    fill={isLight ? '#f8fafc' : '#18181b'}
                    stroke={isLight ? '#6366f1' : '#818cf8'}
                    strokeWidth="1.2"
                    strokeDasharray="4,2"
                  />
                  <text
                    x={bX + 20 + (bW * 0.38) / 2}
                    y={bY + bH + (params.balconyDepth * scale) / 2 + 3}
                    fill={isLight ? '#4f46e5' : '#818cf8'}
                    fontSize="8"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="font-mono"
                  >
                    BALKON ({params.balconyDepth.toFixed(2)}m)
                  </text>

                  {/* Front Right Balcony if flatsPerFloor >= 2 */}
                  {params.flatsPerFloor >= 2 && (
                    <>
                      <rect
                        x={bX + bW - bW * 0.38 - 20}
                        y={bY + bH}
                        width={bW * 0.38}
                        height={params.balconyDepth * scale}
                        fill={isLight ? '#f8fafc' : '#18181b'}
                        stroke={isLight ? '#6366f1' : '#818cf8'}
                        strokeWidth="1.2"
                        strokeDasharray="4,2"
                      />
                      <text
                        x={bX + bW - (bW * 0.38) / 2 - 20}
                        y={bY + bH + (params.balconyDepth * scale) / 2 + 3}
                        fill={isLight ? '#4f46e5' : '#818cf8'}
                        fontSize="8"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="font-mono"
                      >
                        BALKON ({params.balconyDepth.toFixed(2)}m)
                      </text>
                    </>
                  )}
                </>
              )}

            {/* 8. COMMON CIRCULATION CORRIDOR (ORTAK KAT HOLÜ & YANGIN KORİDORU) */}
            <g id="common-circulation-corridor">
              <rect
                x={corrX}
                y={corrY}
                width={corrW}
                height={corrH}
                fill={isLight ? '#f8fafc' : '#18181b'}
                stroke={isLight ? '#cbd5e1' : '#3f3f46'}
                strokeWidth="1"
                strokeDasharray="4,2"
              />
              <text
                x={coreCenterX}
                y={corrY + 12}
                fill={isLight ? '#64748b' : '#94a3b8'}
                fontSize="7.5"
                fontWeight="bold"
                textAnchor="middle"
                className="font-mono"
              >
                ORTAK KAT HOLÜ & YANGIN KAÇIŞ KORİDORU
              </text>
            </g>

            {/* 9. CENTRAL CORE: STAIRCASE SHAFT (MERDİVEN KOVASI) */}
            <g id="staircase-core">
              {/* Staircase Enclosing Concrete Shaft (Perde Duvar) */}
              <rect
                x={stairX}
                y={stairY}
                width={stairW}
                height={stairH}
                fill={isLight ? '#fef3c7' : '#27272a'}
                stroke={isLight ? '#b45309' : '#f59e0b'}
                strokeWidth="2"
              />

              {/* 16 Parallel Equal-Spaced Treads (Eşit Aralıklı Basamak Çizgileri) */}
              {Array.from({ length: 16 }).map((_, stepIdx) => {
                const stepY = stairY + (stepIdx / 16) * stairH;
                return (
                  <line
                    key={`step-${stepIdx}`}
                    x1={stairX}
                    y1={stepY}
                    x2={stairX + stairW}
                    y2={stepY}
                    stroke={isLight ? '#b45309' : '#71717a'}
                    strokeWidth="0.8"
                  />
                );
              })}

              {/* Center dividing gap / stair eye (Kova Ayrımı) */}
              <line
                x1={stairX + stairW / 2}
                y1={stairY}
                x2={stairX + stairW / 2}
                y2={stairY + stairH}
                stroke={isLight ? '#92400e' : '#f59e0b'}
                strokeWidth="2"
              />

              {/* CAD Exit Direction Line & Arrow (Çıkış Oku ve Başlangıç Dairesi) */}
              {/* Starting circle at step 1 */}
              <circle
                cx={stairX + stairW * 0.25}
                cy={stairY + stairH - 8}
                r="3.5"
                fill={isLight ? '#b45309' : '#f59e0b'}
              />
              {/* Direction line going up */}
              <line
                x1={stairX + stairW * 0.25}
                y1={stairY + stairH - 8}
                x2={stairX + stairW * 0.25}
                y2={stairY + 12}
                stroke={isLight ? '#b45309' : '#f59e0b'}
                strokeWidth="1.5"
              />
              {/* Arrowhead */}
              <polygon
                points={`
                  ${stairX + stairW * 0.25},${stairY + 6}
                  ${stairX + stairW * 0.25 - 4},${stairY + 14}
                  ${stairX + stairW * 0.25 + 4},${stairY + 14}
                `}
                fill={isLight ? '#b45309' : '#f59e0b'}
              />
              {/* Direction Label */}
              <text
                x={stairX + stairW * 0.25 + 12}
                y={stairY + stairH / 2}
                fill={isLight ? '#92400e' : '#fbbf24'}
                fontSize="7"
                fontWeight="bold"
                className="font-mono"
              >
                ÇIKIŞ
              </text>

              {/* Core Dimension Label */}
              <text
                x={stairX + stairW / 2}
                y={stairY + stairH - 6}
                fill={isLight ? '#78350f' : '#fde68a'}
                fontSize="7.5"
                fontWeight="bold"
                textAnchor="middle"
                className="font-mono"
              >
                MERDİVEN ({params.stairWidth.toFixed(2)}×{params.stairDepth.toFixed(2)}m)
              </text>
            </g>

            {/* 10. CENTRAL CORE: ELEVATOR SHAFT (ASANSÖR ŞAFTI) */}
            <g id="elevator-core">
              {/* Concrete Shaft Wall */}
              <rect
                x={elevX}
                y={elevY}
                width={elevW}
                height={elevH}
                fill={isLight ? '#f3e8ff' : '#2e1065'}
                stroke={isLight ? '#7e22ce' : '#a855f7'}
                strokeWidth="2"
              />

              {/* CAD Cross Diagonal Lines (Asansör Boşluğu Çaprazı) */}
              <line
                x1={elevX}
                y1={elevY}
                x2={elevX + elevW}
                y2={elevY + elevH}
                stroke={isLight ? '#a855f7' : '#c084fc'}
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <line
                x1={elevX + elevW}
                y1={elevY}
                x2={elevX}
                y2={elevY + elevH}
                stroke={isLight ? '#a855f7' : '#c084fc'}
                strokeWidth="1"
                strokeDasharray="4,4"
              />

              {/* Elevator Cabin (Asansör Kabini) */}
              <rect
                x={elevX + elevW * 0.15}
                y={elevY + elevH * 0.15}
                width={elevW * 0.7}
                height={elevH * 0.7}
                fill={isLight ? '#faf5ff' : '#3b0764'}
                stroke={isLight ? '#9333ea' : '#e9d5ff'}
                strokeWidth="1.2"
                rx="2"
              />

              {/* Telescopic Sliding Door Symbol */}
              <line
                x1={elevX + elevW * 0.25}
                y1={elevY}
                x2={elevX + elevW * 0.75}
                y2={elevY}
                stroke={isLight ? '#6b21a8' : '#e9d5ff'}
                strokeWidth="2.5"
              />

              <text
                x={elevX + elevW / 2}
                y={elevY + elevH / 2 + 3}
                fill={isLight ? '#6b21a8' : '#e9d5ff'}
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
                className="font-mono"
              >
                ASANSÖR ({params.elevatorWidth.toFixed(2)}×{params.elevatorDepth.toFixed(2)}m)
              </text>
            </g>

            {/* 11. DUPLEX ATTIC VIEW MODE OR FLAT ROOMS */}
            {isDuplexAtticView ? (
              <g id="duplex-attic-floor-layout">
                {/* Terrace open area */}
                <rect
                  x={bX + extWallThick}
                  y={bY + bH * 0.55}
                  width={bW - extWallThick * 2}
                  height={bH * 0.45 - extWallThick}
                  fill={isLight ? '#f8fafc' : '#141417'}
                  stroke={isLight ? '#94a3b8' : '#52525b'}
                  strokeWidth="1.5"
                  strokeDasharray="4,2"
                />
                <text
                  x={bX + bW / 2}
                  y={bY + bH * 0.75}
                  fill={isLight ? '#0284c7' : '#38bdf8'}
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="font-mono"
                >
                  GENİŞ ÇATI TERASI & PERGOLA ALANI (~{(metrics.flatNetArea * 0.4).toFixed(2)} m²)
                </text>

                {/* Duplex attic living quarters */}
                {duplexAtticRooms.map((room) => {
                  const rx = bX + extWallThick + (room.xPercent / 100) * (bW - extWallThick * 2);
                  const ry = bY + extWallThick + (room.yPercent / 100) * (bH * 0.52);
                  const rw = (room.widthPercent / 100) * (bW - extWallThick * 2);
                  const rh = (room.depthPercent / 100) * (bH * 0.52);

                  return (
                    <g key={room.id}>
                      {/* Room boundary with 15cm interior partition walls */}
                      <rect
                        x={rx}
                        y={ry}
                        width={rw}
                        height={rh}
                        fill={isLight ? '#ffffff' : '#1a1a1e'}
                        stroke={isLight ? '#334155' : '#71717a'}
                        strokeWidth={intWallThick}
                      />
                      {/* 90-degree CAD Door */}
                      {renderCadDoor(rx + 8, ry + rh, 18, 'S', 'right', isLight ? '#475569' : '#a1a1aa')}

                      {/* Room label badge */}
                      <rect
                        x={rx + rw / 2 - 42}
                        y={ry + rh / 2 - 12}
                        width="84"
                        height="24"
                        fill={isLight ? '#f8fafc' : '#121214'}
                        stroke={isLight ? '#cbd5e1' : '#3f3f46'}
                        strokeWidth="0.8"
                        rx="5"
                      />
                      <text
                        x={rx + rw / 2}
                        y={ry + rh / 2 - 2}
                        fill={isLight ? '#0f172a' : '#ffffff'}
                        fontSize="8"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {room.name}
                      </text>
                      <text
                        x={rx + rw / 2}
                        y={ry + rh / 2 + 8}
                        fill={isLight ? '#4f46e5' : '#818cf8'}
                        fontSize="7.5"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="font-mono"
                      >
                        {room.areaM2.toFixed(2)} m²
                      </text>
                    </g>
                  );
                })}
              </g>
            ) : (
              /* FLATS AND INTERNAL ROOMS WITH CAD STANDARDS */
              activeLayouts.map((flat) => {
                const fX = bX + extWallThick + (flat.bounds.xPercent / 100) * (bW - extWallThick * 2);
                const fY = bY + extWallThick + (flat.bounds.yPercent / 100) * (bH - extWallThick * 2);
                const fW = (flat.bounds.widthPercent / 100) * (bW - extWallThick * 2);
                const fH = (flat.bounds.depthPercent / 100) * (bH - extWallThick * 2);

                // CAD APARTMENT ENTRANCE DOOR (Daire Giriş Kapısı):
                // Door opens directly from the common corridor into the apartment!
                const doorHingeX =
                  flat.entranceDoor?.xPercent !== undefined
                    ? bX + (flat.entranceDoor.xPercent / 100) * bW
                    : fX + fW / 2;
                const doorHingeY =
                  flat.entranceDoor?.yPercent !== undefined
                    ? bY + (flat.entranceDoor.yPercent / 100) * bH
                    : fY + fH;

                return (
                  <g key={flat.id} id={`flat-${flat.flatNumber}`}>
                    {/* Flat Boundary Header Badge */}
                    <rect
                      x={fX + 4}
                      y={fY + 4}
                      width={Math.min(180, fW * 0.65)}
                      height="17"
                      fill={isLight ? '#eef2ff' : '#1e1e24'}
                      stroke={isLight ? '#c7d2fe' : '#4338ca'}
                      strokeWidth="0.8"
                      rx="4"
                    />
                    <text
                      x={fX + 8 + Math.min(180, fW * 0.65) / 2}
                      y={fY + 15}
                      fill={isLight ? '#3730a3' : '#a5b4fc'}
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="font-mono"
                    >
                      {flat.name} • Net: {flat.netArea.toFixed(2)} m²
                    </text>

                    {/* APARTMENT ENTRANCE STEEL DOOR (90° CAD ARC FROM CORRIDOR) */}
                    {renderCadDoor(
                      doorHingeX,
                      doorHingeY,
                      24, // 90cm steel entrance door
                      doorHingeY > coreCenterY ? 'N' : 'S',
                      'right',
                      '#2563eb',
                      true
                    )}

                    {/* ROOMS INSIDE THIS FLAT (Snapping to Grid, 15cm Common Partitions) */}
                    {flat.rooms.map((room) => {
                      const rx = fX + 4 + (room.xPercent / 100) * (fW - 8);
                      const ry = fY + 20 + (room.yPercent / 100) * (fH - 26);
                      const rw = Math.max(14, (room.widthPercent / 100) * (fW - 8));
                      const rh = Math.max(14, (room.depthPercent / 100) * (fH - 26));

                      const isBath = room.type === 'bath' || room.type === 'parent_bath';
                      const isSalon = room.type === 'salon';

                      // Determine interior room door location
                      const roomDoorX = rx + 6;
                      const roomDoorY = ry + rh;

                      return (
                        <g key={room.id}>
                          {/* 15 cm Interior Partition Wall (Double / Solid CAD Wall) */}
                          <rect
                            x={rx}
                            y={ry}
                            width={rw}
                            height={rh}
                            fill={
                              isBath
                                ? 'url(#wetTilePattern)'
                                : isSalon
                                ? isLight
                                  ? '#fafafa'
                                  : '#1c1c20'
                                : isLight
                                ? '#ffffff'
                                : '#16161a'
                            }
                            stroke={isLight ? '#334155' : '#71717a'}
                            strokeWidth={intWallThick}
                          />

                          {/* 90-degree CAD Room Door */}
                          {rw > 32 &&
                            rh > 28 &&
                            renderCadDoor(
                              roomDoorX,
                              roomDoorY,
                              18, // 80cm interior room door
                              'N',
                              'right',
                              isLight ? '#64748b' : '#94a3b8'
                            )}

                          {/* Windows on Exterior Walls (Double-line glass + sill) */}
                          {(room.yPercent <= 10 || room.yPercent + room.depthPercent >= 85) && (
                            <g>
                              {/* Window opening in 25cm wall */}
                              <line
                                x1={rx + rw * 0.2}
                                y1={room.yPercent <= 10 ? ry : ry + rh}
                                x2={rx + rw * 0.8}
                                y2={room.yPercent <= 10 ? ry : ry + rh}
                                stroke={isLight ? '#0284c7' : '#38bdf8'}
                                strokeWidth="3"
                              />
                              {/* Twin glazing line */}
                              <line
                                x1={rx + rw * 0.2}
                                y1={room.yPercent <= 10 ? ry - 2 : ry + rh + 2}
                                x2={rx + rw * 0.8}
                                y2={room.yPercent <= 10 ? ry - 2 : ry + rh + 2}
                                stroke={isLight ? '#0284c7' : '#38bdf8'}
                                strokeWidth="1"
                              />
                            </g>
                          )}

                          {/* CAD Room Label Badge */}
                          {rw > 28 && rh > 22 && (
                            <g>
                              <rect
                                x={rx + rw / 2 - 38}
                                y={ry + rh / 2 - 11}
                                width="76"
                                height="22"
                                fill={isLight ? '#ffffff' : '#121214'}
                                stroke={isLight ? '#cbd5e1' : '#3f3f46'}
                                strokeWidth="0.8"
                                rx="4"
                                opacity="0.94"
                              />
                              <text
                                x={rx + rw / 2}
                                y={ry + rh / 2 - 2}
                                fill={isLight ? '#0f172a' : '#ffffff'}
                                fontSize="7.5"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                {room.name.length > 13 ? room.name.slice(0, 12) + '…' : room.name}
                              </text>
                              <text
                                x={rx + rw / 2}
                                y={ry + rh / 2 + 7}
                                fill={isLight ? '#4f46e5' : '#818cf8'}
                                fontSize="7.5"
                                fontWeight="bold"
                                textAnchor="middle"
                                className="font-mono"
                              >
                                {room.areaM2.toFixed(2)} m²
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })
            )}

            {/* 12. ARCHITECTURAL ELEVATION MARKER (KOT İŞARETİ) */}
            <g id="elevation-marker" transform={`translate(${bX + 35}, ${bY + 35})`}>
              <circle
                cx="0"
                cy="0"
                r="10"
                fill={isLight ? '#ffffff' : '#1e1e24'}
                stroke={isLight ? '#0f172a' : '#f8fafc'}
                strokeWidth="1.2"
              />
              <line x1="-10" y1="0" x2="10" y2="0" stroke={isLight ? '#0f172a' : '#f8fafc'} strokeWidth="1" />
              <line x1="0" y1="-10" x2="0" y2="10" stroke={isLight ? '#0f172a' : '#f8fafc'} strokeWidth="1" />
              <path d="M 0 0 L 10 0 A 10 10 0 0 1 0 10 Z" fill={isLight ? '#0f172a' : '#f8fafc'} />
              <path d="M 0 0 L -10 0 A 10 10 0 0 1 0 -10 Z" fill={isLight ? '#0f172a' : '#f8fafc'} />
              <text
                x="14"
                y="4"
                fill={isLight ? '#0f172a' : '#f8fafc'}
                fontSize="8"
                fontWeight="bold"
                className="font-mono"
              >
                {selectedFloorTab === 'basement'
                  ? '-3.00 KOTU'
                  : selectedFloorTab === 'ground'
                  ? '±0.00 KOTU'
                  : selectedFloorTab === 'first'
                  ? `+${params.hasGroundFloorShop ? (params.shopHeight ?? 3.8).toFixed(2) : params.floorHeight.toFixed(2)} KOTU`
                  : '+6.80 KOTU'}
              </text>
            </g>

            {/* 13. ARCHITECTURAL DIMENSION LINES (ÖLÇÜLENDİRME) */}
            {params.showDimensions && (
              <g
                id="dimensions"
                stroke={isLight ? '#334155' : '#cbd5e1'}
                strokeWidth="0.9"
                className="print:stroke-black"
              >
                {/* Top Front Width Dimension */}
                <line x1={bX} y1={bY - 24} x2={bX + bW} y2={bY - 24} />
                <line x1={bX} y1={bY - 30} x2={bX} y2={bY - 18} />
                <line x1={bX + bW} y1={bY - 30} x2={bX + bW} y2={bY - 18} />
                {/* 45-degree CAD dimension tick marks */}
                <line x1={bX - 3} y1={bY - 21} x2={bX + 3} y2={bY - 27} strokeWidth="1.5" />
                <line x1={bX + bW - 3} y1={bY - 21} x2={bX + bW + 3} y2={bY - 27} strokeWidth="1.5" />
                <text
                  x={bX + bW / 2}
                  y={bY - 30}
                  fill={isLight ? '#0f172a' : '#ffffff'}
                  fontSize="9.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="print:fill-black font-mono"
                >
                  ÖN CEPHE: {currentFacadeWidth.toFixed(2)} m
                </text>

                {/* Left Depth Dimension */}
                <line x1={bX - 24} y1={bY} x2={bX - 24} y2={bY + bH} />
                <line x1={bX - 30} y1={bY} x2={bX - 18} y2={bY} />
                <line x1={bX - 30} y1={bY + bH} x2={bX - 18} y2={bY + bH} />
                <line x1={bX - 27} y1={bY - 3} x2={bX - 21} y2={bY + 3} strokeWidth="1.5" />
                <line x1={bX - 27} y1={bY + bH - 3} x2={bX - 21} y2={bY + bH + 3} strokeWidth="1.5" />
                <text
                  x={bX - 30}
                  y={bY + bH / 2}
                  fill={isLight ? '#0f172a' : '#ffffff'}
                  fontSize="9.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  transform={`rotate(-90 ${bX - 30} ${bY + bH / 2})`}
                  className="print:fill-black font-mono"
                >
                  DERİNLİK: {currentFacadeDepth.toFixed(2)} m
                </text>
              </g>
            )}
          </svg>

          {/* Technical CAD Legend and Specification Details */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-xs print:grid-cols-3">
            <div className={`border rounded-2xl p-4 space-y-2 ${subCardBg} print:bg-white print:border-slate-300`}>
              <div className="flex items-center gap-2 font-bold text-indigo-500">
                <Shield className="w-4 h-4" />
                <span>Teknik Duvar & Taşıyıcı Standartları</span>
              </div>
              <ul className={`space-y-1 text-[11px] list-disc list-inside leading-relaxed ${textMuted}`}>
                <li>
                  <strong>Dış Çevre Duvarları:</strong> 25 cm çift çizgi + ısı yalıtımlı gazbeton / bims dolgulu.
                </li>
                <li>
                  <strong>İç Bölme Duvarları:</strong> 15 cm çift çizgi ses yalıtımlı ara bölme tuğlası.
                </li>
                <li>
                  <strong>Taşıyıcı Kolonlar:</strong> 45×45 cm 45° açılı taramalı betonarme karkas sistemi.
                </li>
              </ul>
            </div>

            <div className={`border rounded-2xl p-4 space-y-2 ${subCardBg} print:bg-white print:border-slate-300`}>
              <div className="flex items-center gap-2 font-bold text-amber-500">
                <Sparkles className="w-4 h-4" />
                <span>Çekirdek, Dolaşım ve Kapı Çözümü</span>
              </div>
              <ul className={`space-y-1 text-[11px] list-disc list-inside leading-relaxed ${textMuted}`}>
                <li>
                  <strong>Merkezi Simetrik Çekirdek:</strong> Yangın merdiveni ({params.stairWidth.toFixed(2)}×{params.stairDepth.toFixed(2)}m) & Sedye Asansörü ({params.elevatorWidth.toFixed(2)}×{params.elevatorDepth.toFixed(2)}m).
                </li>
                <li>
                  <strong>Merdiven Gösterimi:</strong> Eşit aralıklı rıht çizgileri, çıkış başlangıç dairesi ve çıkış oku.
                </li>
                <li>
                  <strong>Daire Girişleri:</strong> Ortak kat holünden 90° açılan CAD dairesel yaylı çelik kapı.
                </li>
              </ul>
            </div>

            <div className={`border rounded-2xl p-4 space-y-2 ${subCardBg} print:bg-white print:border-slate-300`}>
              <div className="flex items-center gap-2 font-bold text-emerald-500">
                <Info className="w-4 h-4" />
                <span>İmar ve Alan Metraj Özeti</span>
              </div>
              <div className={`space-y-1.5 text-[11px] ${textMuted}`}>
                <div className="flex justify-between">
                  <span>Taban Oturum Alanı:</span>
                  <strong className="text-slate-900 dark:text-zinc-100 font-mono">
                    {metrics.footprintArea.toFixed(2)} m²
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Seçili Kat Brüt Alanı:</span>
                  <strong className="text-slate-900 dark:text-zinc-100 font-mono">
                    {(currentFacadeWidth * currentFacadeDepth).toFixed(2)} m²
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Daire Başına Net Kullanım:</span>
                  <strong className="text-slate-900 dark:text-zinc-100 font-mono">
                    ~{metrics.flatNetArea.toFixed(2)} m²
                  </strong>
                </div>
                {hasCantilever && (
                  <div className="flex justify-between text-indigo-600 font-medium">
                    <span>Konsol Tabla Çıkması:</span>
                    <span className="font-mono">+{cantileverDepth.toFixed(2)} m ({cantileverDirection})</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
