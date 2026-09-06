import React, { useState } from 'react';
import { Ruler, Sparkles, RefreshCw, AlertTriangle, CheckCircle2, Compass } from 'lucide-react';
import { AppTheme } from '../types';
import {
  buildQuadrilateralPolygon,
  calculateInteractiveQuadrilateral,
  getDefaultCustomFacades,
  InteractiveFacadeUpdateResult,
  QuadrilateralResult,
} from '../utils/footprintUtils';

interface InteractiveFacadeGeometryPanelProps {
  facadeWidth?: number;
  facadeDepth?: number;
  backFacadeLength?: number;
  leftFacadeLength?: number;
  theme?: AppTheme;
  title?: string;
  compact?: boolean;
  onUpdateFacades: (result: InteractiveFacadeUpdateResult) => void;
}

export const InteractiveFacadeGeometryPanel: React.FC<InteractiveFacadeGeometryPanelProps> = ({
  facadeWidth = 10.0,
  facadeDepth = 10.0,
  backFacadeLength,
  leftFacadeLength,
  theme = 'light',
  title = '4 Cepheli Canlı Geometri ve Cephe Ölçüleri',
  compact = false,
  onUpdateFacades,
}) => {
  const isGray = theme === 'gray';
  const textTitle = isGray ? 'text-gray-100' : 'text-slate-900';
  const textMuted = isGray ? 'text-gray-400' : 'text-slate-500';
  const inputBg = isGray
    ? 'bg-gray-800 border-gray-700 text-gray-100 focus:border-indigo-400'
    : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500';

  const [lastExplanation, setLastExplanation] = useState<string>('');

  // Current values
  const front = typeof facadeWidth === 'number' && !isNaN(facadeWidth) && facadeWidth > 0 ? facadeWidth : 10.0;
  const right = typeof facadeDepth === 'number' && !isNaN(facadeDepth) && facadeDepth > 0 ? facadeDepth : 10.0;
  const back = backFacadeLength !== undefined && typeof backFacadeLength === 'number' && !isNaN(backFacadeLength) && backFacadeLength > 0
    ? backFacadeLength
    : front;
  const left = leftFacadeLength !== undefined && typeof leftFacadeLength === 'number' && !isNaN(leftFacadeLength) && leftFacadeLength > 0
    ? leftFacadeLength
    : right;

  // Build polygon geometry
  const quad: QuadrilateralResult = buildQuadrilateralPolygon(front, right, back, left);

  const handleSideChange = (side: 'front' | 'right' | 'back' | 'left', rawVal: number) => {
    // Sınır kontrolü (QA kuralı: negatif/aşırı değerler engellenir [1.0m - 60.0m])
    const safeVal = Math.max(1.0, Math.min(60.0, isNaN(rawVal) ? 10.0 : rawVal));
    const result = calculateInteractiveQuadrilateral(side, safeVal, {
      front,
      right,
      back,
      left,
    });
    setLastExplanation(result.explanation);
    onUpdateFacades(result);
  };

  const handleResetToSquare = () => {
    const quad = buildQuadrilateralPolygon(10.0, 10.0, 10.0, 10.0);
    const customFacades = getDefaultCustomFacades(4, 10.0, 10.0, 10.0, 10.0);
    const result: InteractiveFacadeUpdateResult = {
      front: 10.0,
      right: 10.0,
      back: 10.0,
      left: 10.0,
      quadrilateral: quad,
      customFacades,
      explanation: 'Varsayılan 10.0m × 10.0m düzgün kare forma sıfırlandı (Tüm 4 cephe eşit 10.0m).',
    };
    setLastExplanation(result.explanation);
    onUpdateFacades(result);
  };

  const handleAlignRectangle = () => {
    const avgW = Math.round(((front + back) / 2) * 10) / 10;
    const avgD = Math.round(((right + left) / 2) * 10) / 10;
    const quad = buildQuadrilateralPolygon(avgW, avgD, avgW, avgD);
    const customFacades = getDefaultCustomFacades(4, avgW, avgD, avgW, avgD);
    const result: InteractiveFacadeUpdateResult = {
      front: avgW,
      right: avgD,
      back: avgW,
      left: avgD,
      quadrilateral: quad,
      customFacades,
      explanation: `Tüm cepheler eşitlenerek ${avgW}m × ${avgD}m dikdörtgen forma hizalandı.`,
    };
    setLastExplanation(result.explanation);
    onUpdateFacades(result);
  };

  // SVG coordinate transformation
  const pts = quad.polygonPoints;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const maxSpan = Math.max(spanX, spanY);

  const svgW = 240;
  const svgH = 180;
  const padding = 34;
  const scale = Math.min((svgW - padding * 2) / maxSpan, (svgH - padding * 2) / maxSpan);

  const toSvgX = (x: number) => svgW / 2 + x * scale;
  // Invert Y for architectural top-down view (positive Y goes up/north)
  const toSvgY = (y: number) => svgH / 2 - y * scale;

  const svgPoints = pts.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ');

  return (
    <div className={`p-4 rounded-2xl border transition-all ${isGray ? 'bg-gray-800/80 border-gray-700' : 'bg-slate-50/90 border-slate-200'} space-y-3.5`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
            📐
          </div>
          <div>
            <h4 className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>{title}</h4>
            <p className={`text-[11px] ${textMuted}`}>
              1 cephe değiştiğinde diğer cepheler düzlem geometrisine göre otomatik hesaplanır
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleResetToSquare}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs transition-colors flex items-center gap-1"
            title="Tüm cepheleri 10m olan ön tanımlı kare geometriye ayarla"
          >
            <RefreshCw className="w-3 h-3 text-indigo-500" />
            10×10 Kare
          </button>
          <button
            type="button"
            onClick={handleAlignRectangle}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs transition-colors"
            title="Karşılıklı cepheleri eşitleyerek düzgün dikdörtgen yap"
          >
            Dikdörtgen Hizala
          </button>
        </div>
      </div>

      {/* Geometry Status & Explanation Toast */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs ${
              quad.isSkewed
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}
          >
            {quad.isSkewed ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Asimetrik / Yamuk Kütle
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Düzenli Dikdörtgen / Kare
              </>
            )}
          </span>

          <span className="text-[11px] font-mono font-semibold text-slate-600">
            Taban Alanı: <strong className="text-indigo-600">{quad.area} m²</strong> | Çevre: {quad.perimeter} m
          </span>
        </div>

        <span className="text-[10px] font-medium text-slate-500">
          Açılar: P1: {quad.angles.p1}° | P2: {quad.angles.p2}° | P3: {quad.angles.p3}° | P4: {quad.angles.p4}°
        </span>
      </div>

      {lastExplanation && (
        <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <p className="leading-snug">{lastExplanation}</p>
        </div>
      )}

      {/* Main Grid: Inputs + 2D Geometric SVG Preview */}
      <div className={`grid grid-cols-1 ${compact ? 'lg:grid-cols-1' : 'lg:grid-cols-12'} gap-3.5 items-center`}>
        {/* 4 Facade Inputs */}
        <div className={`${compact ? 'w-full' : 'lg:col-span-7'} grid grid-cols-1 sm:grid-cols-2 gap-2.5`}>
          {/* 1. Ön Cephe */}
          <div className="p-2.5 bg-white rounded-xl border border-indigo-200/90 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-indigo-700 flex items-center gap-1">
                <span>1. Ön Cephe</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600 font-semibold">Yol/Giriş</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="60"
                  value={front}
                  onChange={(e) => handleSideChange('front', parseFloat(e.target.value))}
                  className={`w-16 px-2 py-0.5 text-right font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                />
                <span className="text-xs font-semibold text-slate-400">m</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="45"
              step="0.5"
              value={front}
              onChange={(e) => handleSideChange('front', parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-1.5"
            />
          </div>

          {/* 2. Sağ Yan Cephe */}
          <div className="p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className={`font-bold ${textTitle} flex items-center gap-1`}>
                <span>2. Sağ Cephe</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">Yan</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="60"
                  value={right}
                  onChange={(e) => handleSideChange('right', parseFloat(e.target.value))}
                  className={`w-16 px-2 py-0.5 text-right font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                />
                <span className="text-xs font-semibold text-slate-400">m</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="45"
              step="0.5"
              value={right}
              onChange={(e) => handleSideChange('right', parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-1.5"
            />
          </div>

          {/* 3. Arka Cephe */}
          <div className={`p-2.5 bg-white rounded-xl border shadow-2xs space-y-1.5 ${quad.isSkewed ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200/90'}`}>
            <div className="flex items-center justify-between text-xs">
              <label className={`font-bold ${textTitle} flex items-center gap-1`}>
                <span>3. Arka Cephe</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">Bahçe</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="60"
                  value={back}
                  onChange={(e) => handleSideChange('back', parseFloat(e.target.value))}
                  className={`w-16 px-2 py-0.5 text-right font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                />
                <span className="text-xs font-semibold text-slate-400">m</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="45"
              step="0.5"
              value={back}
              onChange={(e) => handleSideChange('back', parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-1.5"
            />
          </div>

          {/* 4. Sol Yan Cephe */}
          <div className={`p-2.5 bg-white rounded-xl border shadow-2xs space-y-1.5 ${quad.isSkewed ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200/90'}`}>
            <div className="flex items-center justify-between text-xs">
              <label className={`font-bold ${textTitle} flex items-center gap-1`}>
                <span>4. Sol Cephe</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">Yan</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="60"
                  value={left}
                  onChange={(e) => handleSideChange('left', parseFloat(e.target.value))}
                  className={`w-16 px-2 py-0.5 text-right font-mono font-bold text-xs rounded-lg border ${inputBg}`}
                />
                <span className="text-xs font-semibold text-slate-400">m</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="45"
              step="0.5"
              value={left}
              onChange={(e) => handleSideChange('left', parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-1.5"
            />
          </div>
        </div>

        {/* 2D Geometric SVG Canvas */}
        <div className={`${compact ? 'w-full' : 'lg:col-span-5'} bg-white p-2.5 rounded-xl border border-slate-200/90 flex flex-col items-center justify-center shadow-2xs relative`}>
          <div className="absolute top-1.5 left-2 flex items-center gap-1 text-[10px] font-bold text-slate-400">
            <Compass className="w-3 h-3 text-indigo-500" />
            <span>2D GEOMETRİ PLANI</span>
          </div>

          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-[240px] h-[160px] overflow-visible">
            {/* Grid background lines */}
            <defs>
              <pattern id="grid-pattern" width="16" height="16" patternUnits="userSpaceOnUse">
                <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#f1f5f9" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={svgW} height={svgH} fill="url(#grid-pattern)" rx="8" />

            {/* Skewed Quadrilateral Polygon */}
            <polygon
              points={svgPoints}
              fill={quad.isSkewed ? 'rgba(245, 158, 11, 0.12)' : 'rgba(99, 102, 241, 0.12)'}
              stroke={quad.isSkewed ? '#d97706' : '#4f46e5'}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Vertices & Corner Angle Labels */}
            {pts.map((p, i) => {
              const cx = toSvgX(p.x);
              const cy = toSvgY(p.y);
              const angle = i === 0 ? quad.angles.p1 : i === 1 ? quad.angles.p2 : i === 2 ? quad.angles.p3 : quad.angles.p4;
              return (
                <g key={p.id || i}>
                  <circle cx={cx} cy={cy} r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                  <text
                    x={cx + (i === 0 || i === 3 ? -14 : 14)}
                    y={cy + (i === 0 || i === 1 ? 14 : -8)}
                    fontSize="9"
                    fontWeight="bold"
                    fill="#334155"
                    textAnchor="middle"
                  >
                    {angle}°
                  </text>
                </g>
              );
            })}

            {/* Edge Dimension Labels */}
            {/* Front (Edge 0 -> 1) */}
            <text
              x={(toSvgX(pts[0].x) + toSvgX(pts[1].x)) / 2}
              y={toSvgY(pts[0].y) + 16}
              fontSize="10"
              fontWeight="bold"
              fill="#4338ca"
              textAnchor="middle"
            >
              Ön: {front}m
            </text>

            {/* Right (Edge 1 -> 2) */}
            <text
              x={Math.max(toSvgX(pts[1].x), toSvgX(pts[2].x)) + 8}
              y={(toSvgY(pts[1].y) + toSvgY(pts[2].y)) / 2}
              fontSize="10"
              fontWeight="bold"
              fill="#334155"
              textAnchor="start"
            >
              Sağ: {right}m
            </text>

            {/* Back (Edge 2 -> 3) */}
            <text
              x={(toSvgX(pts[2].x) + toSvgX(pts[3].x)) / 2}
              y={Math.min(toSvgY(pts[2].y), toSvgY(pts[3].y)) - 10}
              fontSize="10"
              fontWeight="bold"
              fill={quad.isSkewed ? '#b45309' : '#334155'}
              textAnchor="middle"
            >
              Arka: {back}m
            </text>

            {/* Left (Edge 3 -> 0) */}
            <text
              x={Math.min(toSvgX(pts[0].x), toSvgX(pts[3].x)) - 8}
              y={(toSvgY(pts[0].y) + toSvgY(pts[3].y)) / 2}
              fontSize="10"
              fontWeight="bold"
              fill="#334155"
              textAnchor="end"
            >
              Sol: {left}m
            </text>
          </svg>

          <div className="flex items-center justify-between w-full px-2 pt-1 text-[10px] text-slate-500 font-mono">
            <span>Ön: {front}m</span>
            <span>Sağ: {right}m</span>
            <span className={quad.isSkewed ? 'text-amber-700 font-bold' : ''}>Arka: {back}m</span>
            <span>Sol: {left}m</span>
          </div>
        </div>
      </div>
    </div>
  );
};
