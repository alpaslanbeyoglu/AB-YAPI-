import React, { useRef, useState } from 'react';
import {
  Printer,
  Compass,
  Maximize2,
  Armchair,
  Ruler,
  Building,
  Info,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { BuildingModelParams, ProjectParams, RoomType } from '../types';
import {
  calculateBuildingMetrics,
  getFloorFlatLayouts,
  getDuplexAtticRooms,
  RoomDetail,
  FlatLayout,
} from '../utils/buildingModelUtils';
import { Logo } from './Logo';

interface FloorPlan2DViewProps {
  params: BuildingModelParams;
  onUpdateParams?: (updates: Partial<BuildingModelParams>) => void;
  onSyncWithCalculator?: (newParams: Partial<ProjectParams>) => void;
  onNavigateToCalculator?: () => void;
  theme?: 'light' | 'gray' | 'dark';
}

export const FloorPlan2DView: React.FC<FloorPlan2DViewProps> = ({
  params,
  onUpdateParams,
  onSyncWithCalculator,
  onNavigateToCalculator,
  theme = 'light',
}) => {
  const planRef = useRef<HTMLDivElement>(null);
  const [isDuplexAtticView, setIsDuplexAtticView] = useState<boolean>(false);
  const [syncedFeedback, setSyncedFeedback] = useState<string | null>(null);
  const isGray = theme === 'gray';
  const isLight = !isGray;

  const metrics = calculateBuildingMetrics(params);
  const isDuplex = params.roofType === 'duplex';

  // Compute multi-flat layout
  const flatLayouts: FlatLayout[] = getFloorFlatLayouts(params, metrics);
  const duplexAtticRooms: RoomDetail[] = isDuplex ? getDuplexAtticRooms(metrics.flatNetArea) : [];

  // SVG canvas dimensions and scaling
  // Base scale: 28 pixels per meter
  const scale = 28;
  const paddingM = 3.0; // Margin around building for dimension lines
  const totalSvgWidth = (params.facadeWidth + paddingM * 2) * scale;
  const totalSvgHeight = (params.facadeDepth + paddingM * 2) * scale;

  // Building footprint in SVG coordinates
  const bX = paddingM * scale;
  const bY = paddingM * scale;
  const bW = params.facadeWidth * scale;
  const bH = params.facadeDepth * scale;

  // Core dimensions in pixels (Staircase & Elevator)
  const stairW = params.stairWidth * scale;
  const stairH = params.stairDepth * scale;
  const elevW = params.elevatorWidth * scale;
  const elevH = params.elevatorDepth * scale;

  // Center core coordinates
  const coreCenterX = bX + bW / 2;
  const coreCenterY = bY + bH / 2;
  const stairX = coreCenterX - stairW - 8;
  const stairY = coreCenterY - stairH / 2;
  const elevX = coreCenterX + 8;
  const elevY = coreCenterY - elevH / 2;

  // Sync dimensions to main calculation engine
  const handleSyncToCalculator = () => {
    if (onSyncWithCalculator) {
      onSyncWithCalculator({
        baseBuildArea: Math.round(metrics.footprintArea),
        floorCount: params.floorCount,
        flatCount: metrics.totalFlats,
      });
      setSyncedFeedback(
        `Taban Alanı (${metrics.footprintArea} m²), ${params.floorCount} Kat ve ${metrics.totalFlats} Daire ana hesaplama tablosuna aktarıldı!`
      );
      setTimeout(() => setSyncedFeedback(null), 4000);
    }
  };

  const cardBg = isGray ? 'bg-slate-100 border-slate-300 text-slate-900 shadow-sm' : 'bg-white border-slate-200 text-slate-900 shadow-sm';
  const subCardBg = isGray ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-800';
  const textMuted = 'text-slate-500';

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

      {/* Action and Display Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl border text-xs print:hidden shadow-lg ${cardBg}`}>
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
                {isDuplex && isDuplexAtticView
                  ? 'Çatı Dubleksi Üst Kat Planı (Teras & Süit)'
                  : `Mimari Kat Planı (${params.roomType} Tip Proje)`}
              </h4>
              <span
                className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  isLight
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/80'
                }`}
              >
                Katta {params.flatsPerFloor} Daire
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${textMuted}`}>
              Daire Başına Net: ~{metrics.flatNetArea} m² | Brüt: ~{metrics.flatGrossArea} m² | Taban: {metrics.footprintArea} m²
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Param Selectors */}
          {onUpdateParams && (
            <div className="flex items-center gap-2 mr-2">
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

          {/* If Duplex is selected, allow toggling to Duplex Attic Floor Plan */}
          {isDuplex && (
            <button
              type="button"
              onClick={() => setIsDuplexAtticView(!isDuplexAtticView)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isDuplexAtticView
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isDuplexAtticView ? 'Normal Kat Planı' : 'Çatı Dubleksi Planı'}</span>
            </button>
          )}

          {onSyncWithCalculator && (
            <button
              type="button"
              onClick={handleSyncToCalculator}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
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

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Yazdır / PDF</span>
          </button>
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
                  MİMARİ KAT PLANI VE ODA YERLEŞİMİ (ÖLÇEK 1:50)
                </h5>
                <p className={`text-[11px] ${textMuted}`}>
                  {isDuplex && isDuplexAtticView
                    ? 'ÇATI ARASI DUBLEKS KAT PLANI'
                    : `NORMAL KAT PLANI • KATTA ${params.flatsPerFloor} BAĞIMSIZ BÖLÜM`}
                </p>
              </div>
            </div>

            {/* Quick Dimension Badges */}
            <div className={`flex items-center gap-4 text-xs ${textMuted}`}>
              <p>
                <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>
                  Ön Cephe:
                </strong>{' '}
                {params.facadeWidth.toFixed(2)} m
              </p>
              <p>
                <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>
                  Derinlik:
                </strong>{' '}
                {params.facadeDepth.toFixed(2)} m
              </p>
              <p>
                <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>
                  Taban Alanı:
                </strong>{' '}
                {metrics.footprintArea} m²
              </p>
            </div>
          </div>

          {/* Scaled SVG Architectural Drawing with Thin Lines and High-Contrast Theme */}
          <svg
            viewBox={`0 0 ${totalSvgWidth} ${totalSvgHeight}`}
            className={`w-full max-w-[860px] h-auto drop-shadow-md rounded-2xl border transition-colors ${
              isLight
                ? 'bg-[#f8fafc] border-slate-300'
                : 'bg-[#0d0e12] border-zinc-800'
            } print:bg-white print:border-slate-300`}
          >
            <defs>
              {/* Pattern for Structural Columns (Diagonal Hatching) */}
              <pattern id="columnHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke={isLight ? '#475569' : '#6366f1'} strokeWidth="1.5" />
              </pattern>
              {/* Pattern for Tiles in Bathroom */}
              <pattern id="tilePattern" width="12" height="12" patternUnits="userSpaceOnUse">
                <path d="M 12 0 L 0 0 0 12" fill="none" stroke={isLight ? '#cbd5e1' : '#27272a'} strokeWidth="0.5" />
              </pattern>
            </defs>

            {/* Architectural Grid Lines */}
            <line x1={bX} y1={bY} x2={bX} y2={bY + bH} stroke={isLight ? '#e2e8f0' : '#27272a'} strokeDasharray="6,4" strokeWidth="0.8" />
            <line x1={bX + bW} y1={bY} x2={bX + bW} y2={bY + bH} stroke={isLight ? '#e2e8f0' : '#27272a'} strokeDasharray="6,4" strokeWidth="0.8" />
            <line x1={bX} y1={bY} x2={bX + bW} y2={bY} stroke={isLight ? '#e2e8f0' : '#27272a'} strokeDasharray="6,4" strokeWidth="0.8" />
            <line x1={bX} y1={bY + bH} x2={bX + bW} y2={bY + bH} stroke={isLight ? '#e2e8f0' : '#27272a'} strokeDasharray="6,4" strokeWidth="0.8" />

            {/* FLOOR SLAB BASE (Kat Döşemesi) */}
            <rect
              x={bX}
              y={bY}
              width={bW}
              height={bH}
              fill={isLight ? '#ffffff' : '#141417'}
              stroke={isLight ? '#94a3b8' : '#3f3f46'}
              strokeWidth="1.2"
              className="print:fill-white print:stroke-slate-700"
            />

            {/* EXTERIOR WALLS (Dış Taşıyıcı Duvarlar - Crisp Thin 2.5px Line) */}
            <rect
              x={bX}
              y={bY}
              width={bW}
              height={bH}
              fill="none"
              stroke={isLight ? '#0f172a' : '#f4f4f5'}
              strokeWidth="2.5"
              className="print:stroke-black"
            />

            {/* CENTRAL CORRIDOR & FLAT SEPARATION LINES */}
            {params.flatsPerFloor >= 2 && (
              <line
                x1={bX + bW / 2}
                y1={bY}
                x2={bX + bW / 2}
                y2={bY + bH}
                stroke={isLight ? '#475569' : '#a1a1aa'}
                strokeWidth="1.8"
                strokeDasharray="8,2"
                className="print:stroke-slate-900"
              />
            )}
            {params.flatsPerFloor >= 3 && (
              <line
                x1={bX}
                y1={bY + bH / 2}
                x2={bX + bW}
                y2={bY + bH / 2}
                stroke={isLight ? '#475569' : '#a1a1aa'}
                strokeWidth="1.8"
                strokeDasharray="8,2"
                className="print:stroke-slate-900"
              />
            )}

            {/* BALCONIES (Balkon Çıkıntıları) */}
            {params.balconyDepth > 0.3 && (
              <>
                {/* Front Left Balcony */}
                <rect
                  x={bX + 16}
                  y={bY + bH}
                  width={bW * 0.38}
                  height={params.balconyDepth * scale}
                  fill={isLight ? '#f1f5f9' : '#18181b'}
                  stroke={isLight ? '#6366f1' : '#818cf8'}
                  strokeWidth="1.2"
                  strokeDasharray="4,2"
                  className="print:fill-slate-100 print:stroke-slate-600"
                />
                <text
                  x={bX + 16 + (bW * 0.38) / 2}
                  y={bY + bH + (params.balconyDepth * scale) / 2 + 3}
                  fill={isLight ? '#4f46e5' : '#818cf8'}
                  fontSize="8"
                  textAnchor="middle"
                  className="font-mono font-bold print:fill-black"
                >
                  BALKON {params.balconyDepth}m
                </text>

                {/* Front Right Balcony if flatsPerFloor >= 2 */}
                {params.flatsPerFloor >= 2 && (
                  <rect
                    x={bX + bW - bW * 0.38 - 16}
                    y={bY + bH}
                    width={bW * 0.38}
                    height={params.balconyDepth * scale}
                    fill={isLight ? '#f1f5f9' : '#18181b'}
                    stroke={isLight ? '#6366f1' : '#818cf8'}
                    strokeWidth="1.2"
                    strokeDasharray="4,2"
                    className="print:fill-slate-100 print:stroke-slate-600"
                  />
                )}
              </>
            )}

            {/* ================= STAIRCASE CORE (MERDİVEN KOVASI) ================= */}
            <g id="staircase-core">
              <rect
                x={stairX}
                y={stairY}
                width={stairW}
                height={stairH}
                fill={isLight ? '#fef3c7' : '#27272a'}
                stroke={isLight ? '#d97706' : '#f59e0b'}
                strokeWidth="1.5"
                className="print:fill-amber-50 print:stroke-amber-600"
              />
              {/* Individual Steps */}
              {Array.from({ length: 12 }).map((_, stepIdx) => {
                const stepY = stairY + (stepIdx / 12) * stairH;
                return (
                  <line
                    key={stepIdx}
                    x1={stairX}
                    y1={stepY}
                    x2={stairX + stairW}
                    y2={stepY}
                    stroke={isLight ? '#b45309' : '#71717a'}
                    strokeWidth="0.8"
                    className="print:stroke-slate-400"
                  />
                );
              })}
              {/* Center dividing line */}
              <line
                x1={stairX + stairW / 2}
                y1={stairY}
                x2={stairX + stairW / 2}
                y2={stairY + stairH}
                stroke={isLight ? '#b45309' : '#f59e0b'}
                strokeWidth="1.2"
              />
              {/* Direction Arrow */}
              <line
                x1={stairX + stairW * 0.25}
                y1={stairY + stairH - 6}
                x2={stairX + stairW * 0.25}
                y2={stairY + 8}
                stroke={isLight ? '#b45309' : '#f59e0b'}
                strokeWidth="1.2"
              />
              <circle cx={stairX + stairW * 0.25} cy={stairY + stairH - 6} r="2.5" fill={isLight ? '#b45309' : '#f59e0b'} />
              <text
                x={stairX + stairW / 2}
                y={stairY + 12}
                fill={isLight ? '#92400e' : '#fbbf24'}
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
                className="print:fill-amber-800"
              >
                MERDİVEN ({params.stairWidth}×{params.stairDepth}m)
              </text>
            </g>

            {/* ================= ELEVATOR SHAFT (ASANSÖR ŞAFTI) ================= */}
            <g id="elevator-core">
              <rect
                x={elevX}
                y={elevY}
                width={elevW}
                height={elevH}
                fill={isLight ? '#f3e8ff' : '#2e1065'}
                stroke={isLight ? '#9333ea' : '#a855f7'}
                strokeWidth="1.5"
                className="print:fill-purple-50 print:stroke-purple-700"
              />
              {/* Crossed shaft indicator */}
              <line x1={elevX} y1={elevY} x2={elevX + elevW} y2={elevY + elevH} stroke={isLight ? '#a855f7' : '#c084fc'} strokeWidth="0.8" strokeDasharray="3,3" />
              <line x1={elevX + elevW} y1={elevY} x2={elevX} y2={elevY + elevH} stroke={isLight ? '#a855f7' : '#c084fc'} strokeWidth="0.8" strokeDasharray="3,3" />
              {/* Elevator Cabin */}
              <rect
                x={elevX + elevW * 0.15}
                y={elevY + elevH * 0.15}
                width={elevW * 0.7}
                height={elevH * 0.7}
                fill={isLight ? '#faf5ff' : '#3b0764'}
                stroke={isLight ? '#7e22ce' : '#e9d5ff'}
                strokeWidth="1"
                rx="2"
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
                ASANSÖR
              </text>
            </g>

            {/* ================= STRUCTURAL COLUMNS (KOLONLAR) ================= */}
            {[
              { x: bX + 3, y: bY + 3 },
              { x: bX + bW / 2 - 7, y: bY + 3 },
              { x: bX + bW - 17, y: bY + 3 },
              { x: bX + 3, y: bY + bH / 2 - 8 },
              { x: bX + bW - 17, y: bY + bH / 2 - 8 },
              { x: bX + 3, y: bY + bH - 17 },
              { x: bX + bW / 2 - 7, y: bY + bH - 17 },
              { x: bX + bW - 17, y: bY + bH - 17 },
            ].map((col, cIdx) => (
              <rect
                key={cIdx}
                x={col.x}
                y={col.y}
                width="14"
                height="14"
                fill="url(#columnHatch)"
                stroke={isLight ? '#334155' : '#818cf8'}
                strokeWidth="1.2"
                className="print:fill-black print:stroke-black"
              />
            ))}

            {/* ================= ALL FLATS AND THEIR INTERNAL ROOMS ================= */}
            {isDuplex && isDuplexAtticView ? (
              // Duplex Attic Floor Mode
              <g id="duplex-attic-floor">
                {duplexAtticRooms.map((room) => {
                  const rx = bX + 6 + (room.xPercent / 100) * (bW - 12);
                  const ry = bY + 6 + (room.yPercent / 100) * (bH - 12);
                  const rw = (room.widthPercent / 100) * (bW - 12);
                  const rh = (room.depthPercent / 100) * (bH - 12);

                  return (
                    <g key={room.id}>
                      <rect
                        x={rx}
                        y={ry}
                        width={rw}
                        height={rh}
                        fill={isLight ? '#ffffff' : '#1a1a1e'}
                        stroke={isLight ? '#64748b' : '#52525b'}
                        strokeWidth="1.2"
                      />
                      <rect
                        x={rx + rw / 2 - 40}
                        y={ry + rh / 2 - 12}
                        width="80"
                        height="24"
                        fill={isLight ? '#f1f5f9' : '#121214'}
                        stroke={isLight ? '#cbd5e1' : '#3f3f46'}
                        strokeWidth="0.8"
                        rx="5"
                      />
                      <text
                        x={rx + rw / 2}
                        y={ry + rh / 2 - 2}
                        fill={isLight ? '#0f172a' : '#ffffff'}
                        fontSize="8.5"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {room.name}
                      </text>
                      <text
                        x={rx + rw / 2}
                        y={ry + rh / 2 + 8}
                        fill={isLight ? '#4f46e5' : '#818cf8'}
                        fontSize="8"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="font-mono"
                      >
                        {room.areaM2} m²
                      </text>
                    </g>
                  );
                })}
              </g>
            ) : (
              // Standard Normal Floor Multi-Flat Layout
              flatLayouts.map((flat) => {
                const fX = bX + (flat.bounds.xPercent / 100) * bW;
                const fY = bY + (flat.bounds.yPercent / 100) * bH;
                const fW = (flat.bounds.widthPercent / 100) * bW;
                const fH = (flat.bounds.depthPercent / 100) * bH;

                return (
                  <g key={flat.id} id={`flat-group-${flat.flatNumber}`}>
                    {/* Flat Boundary Header Badge */}
                    <rect
                      x={fX + 6}
                      y={fY + 4}
                      width={fW * 0.4}
                      height="15"
                      fill={isLight ? '#eef2ff' : '#1e1e24'}
                      stroke={isLight ? '#c7d2fe' : '#4338ca'}
                      strokeWidth="0.8"
                      rx="3"
                    />
                    <text
                      x={fX + 10 + (fW * 0.4) / 2}
                      y={fY + 14}
                      fill={isLight ? '#3730a3' : '#a5b4fc'}
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="font-mono"
                    >
                      {flat.name} • Net: {flat.netArea} m²
                    </text>

                    {/* Rooms inside this Flat */}
                    {flat.rooms.map((room) => {
                      const rx = fX + 4 + (room.xPercent / 100) * (fW - 8);
                      const ry = fY + 18 + (room.yPercent / 100) * (fH - 22);
                      const rw = Math.max(12, (room.widthPercent / 100) * (fW - 8));
                      const rh = Math.max(12, (room.depthPercent / 100) * (fH - 22));

                      const isBath = room.type === 'bath' || room.type === 'parent_bath';
                      const isSalon = room.type === 'salon';

                      return (
                        <g key={room.id}>
                          {/* Room Partition Wall (Crisp 1.2px Line) */}
                          <rect
                            x={rx}
                            y={ry}
                            width={rw}
                            height={rh}
                            fill={
                              isBath
                                ? 'url(#tilePattern)'
                                : isSalon
                                ? isLight
                                  ? '#fafafa'
                                  : '#1c1c20'
                                : isLight
                                ? '#ffffff'
                                : '#16161a'
                            }
                            stroke={isLight ? '#64748b' : '#52525b'}
                            strokeWidth="1.2"
                            className="print:fill-white print:stroke-slate-600"
                          />

                          {/* Outer Window Indication on Exterior Walls */}
                          {(room.yPercent <= 8 || room.yPercent + room.depthPercent >= 88) && (
                            <line
                              x1={rx + rw * 0.25}
                              y1={room.yPercent <= 8 ? ry : ry + rh}
                              x2={rx + rw * 0.75}
                              y2={room.yPercent <= 8 ? ry : ry + rh}
                              stroke={isLight ? '#0284c7' : '#38bdf8'}
                              strokeWidth="2.5"
                              className="print:stroke-sky-700"
                            />
                          )}

                          {/* Compact Architectural Room Label Badge (No Overflows!) */}
                          {rw > 28 && rh > 22 && (
                            <g>
                              <rect
                                x={rx + rw / 2 - 34}
                                y={ry + rh / 2 - 11}
                                width="68"
                                height="22"
                                fill={isLight ? '#ffffff' : '#121214'}
                                stroke={isLight ? '#cbd5e1' : '#3f3f46'}
                                strokeWidth="0.8"
                                rx="4"
                                opacity="0.92"
                                className="print:fill-white print:stroke-slate-300"
                              />
                              <text
                                x={rx + rw / 2}
                                y={ry + rh / 2 - 2}
                                fill={isLight ? '#0f172a' : '#ffffff'}
                                fontSize="7.5"
                                fontWeight="bold"
                                textAnchor="middle"
                                className="print:fill-slate-900"
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
                                className="print:fill-indigo-700 font-mono"
                              >
                                {room.areaM2} m²
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

            {/* ================= ARCHITECTURAL DIMENSION LINES (ÖLÇÜLENDİRME) ================= */}
            {params.showDimensions && (
              <g id="dimensions" stroke={isLight ? '#475569' : '#a1a1aa'} strokeWidth="0.8" className="print:stroke-black">
                {/* Top Width Dimension Line */}
                <line x1={bX} y1={bY - 20} x2={bX + bW} y2={bY - 20} />
                <line x1={bX} y1={bY - 25} x2={bX} y2={bY - 15} />
                <line x1={bX + bW} y1={bY - 25} x2={bX + bW} y2={bY - 15} />
                <text
                  x={bX + bW / 2}
                  y={bY - 26}
                  fill={isLight ? '#0f172a' : '#ffffff'}
                  fontSize="9.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="print:fill-black font-mono"
                >
                  ÖN CEPHE: {params.facadeWidth.toFixed(2)} m
                </text>

                {/* Left Depth Dimension Line */}
                <line x1={bX - 20} y1={bY} x2={bX - 20} y2={bY + bH} />
                <line x1={bX - 25} y1={bY} x2={bX - 15} y2={bY} />
                <line x1={bX - 25} y1={bY + bH} x2={bX - 15} y2={bY + bH} />
                <text
                  x={bX - 26}
                  y={bY + bH / 2}
                  fill={isLight ? '#0f172a' : '#ffffff'}
                  fontSize="9.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  transform={`rotate(-90 ${bX - 26} ${bY + bH / 2})`}
                  className="print:fill-black font-mono"
                >
                  DERİNLİK: {params.facadeDepth.toFixed(2)} m
                </text>
              </g>
            )}
          </svg>

          {/* Architectural Information Cards */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-xs print:grid-cols-2">
            <div className={`border rounded-2xl p-4 space-y-2 ${subCardBg} print:bg-white print:border-slate-300`}>
              <div className="flex items-center gap-2 font-bold text-indigo-500">
                <Info className="w-4 h-4" />
                <span>İmar ve Daire Tipolojisi Notları</span>
              </div>
              <ul className={`space-y-1 text-[11px] list-disc list-inside leading-relaxed ${textMuted}`}>
                <li>
                  Katta <strong>{params.flatsPerFloor} adet {params.roomType}</strong> bağımsız bölüm bulunmaktadır.
                </li>
                <li>
                  Daire başına net kullanım alanı <strong>~{metrics.flatNetArea} m²</strong>, kat brüt alanı <strong>~{metrics.flatGrossArea} m²</strong>'dir.
                </li>
                <li>Merdiven ve asansör çekirdeği yangın ve deprem yönetmeliğine uygun koridorla ayrılmıştır.</li>
              </ul>
            </div>

            <div className={`border rounded-2xl p-4 space-y-2 ${subCardBg} print:bg-white print:border-slate-300`}>
              <div className="flex items-center gap-2 font-bold text-amber-500">
                <Sparkles className="w-4 h-4" />
                <span>Teknik Mimari Gösterim Standartları</span>
              </div>
              <div className={`grid grid-cols-2 gap-2 text-[11px] ${textMuted}`}>
                <div>
                  <span className="font-semibold block text-slate-800 dark:text-zinc-200">Dış Duvarlar:</span>
                  <span>{params.wallThickness * 100} cm Yalıtımlı Gazbeton/Tuğla</span>
                </div>
                <div>
                  <span className="font-semibold block text-slate-800 dark:text-zinc-200">İç Ara Bölmeler:</span>
                  <span>15 cm Akustik Yalıtımlı Duvar</span>
                </div>
                <div>
                  <span className="font-semibold block text-slate-800 dark:text-zinc-200">Çekirdek:</span>
                  <span>{params.stairWidth}×{params.stairDepth}m Yangın Merdiveni</span>
                </div>
                <div>
                  <span className="font-semibold block text-slate-800 dark:text-zinc-200">Asansör:</span>
                  <span>{params.elevatorWidth}×{params.elevatorDepth}m Sedye/Yolcu Asansörü</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
