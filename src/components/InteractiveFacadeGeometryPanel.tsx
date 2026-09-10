import React, { useState } from 'react';
import { Ruler, Sparkles, RefreshCw, AlertTriangle, CheckCircle2, Compass, DoorOpen } from 'lucide-react';
import { AppTheme, PolygonPoint, RoadConfig } from '../types';
import {
  buildQuadrilateralPolygon,
  calculateInteractiveQuadrilateral,
  getDefaultCustomFacades,
  InteractiveFacadeUpdateResult,
  QuadrilateralResult,
} from '../utils/footprintUtils';

const computePolygonArea = (points: PolygonPoint[]): number => {
  if (!points || points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
};

interface InteractiveFacadeGeometryPanelProps {
  facadeWidth?: number;
  facadeDepth?: number;
  backFacadeLength?: number;
  leftFacadeLength?: number;
  polygonPoints?: PolygonPoint[];
  roads?: RoadConfig[];
  mainEntranceIndex?: number;
  theme?: AppTheme;
  title?: string;
  compact?: boolean;
  onUpdateFacades: (result: InteractiveFacadeUpdateResult) => void;
  onUpdateRoads?: (roads: RoadConfig[]) => void;
  onEditInSmartPolygon?: () => void;
}

export const InteractiveFacadeGeometryPanel: React.FC<InteractiveFacadeGeometryPanelProps> = ({
  facadeWidth = 10.0,
  facadeDepth = 10.0,
  backFacadeLength,
  leftFacadeLength,
  polygonPoints,
  roads = [],
  mainEntranceIndex = 0,
  theme = 'light',
  title = '2D Geometri Planı ve Cephe Ölçüleri',
  compact = false,
  onUpdateFacades,
  onUpdateRoads,
  onEditInSmartPolygon,
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

  // Check if active smart polygon is available
  const hasSmartPoly = Boolean(polygonPoints && polygonPoints.length >= 3);

  // Determine points to render
  const pts: PolygonPoint[] = hasSmartPoly && polygonPoints ? polygonPoints : quad.polygonPoints;
  const polyArea = hasSmartPoly && polygonPoints ? computePolygonArea(polygonPoints) : quad.area;

  // Calculate perimeter
  let polyPerimeter = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    polyPerimeter += Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }
  polyPerimeter = Math.round(polyPerimeter * 10) / 10;

  // SVG coordinate transformation
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const maxSpan = Math.max(spanX, spanY);

  const svgW = 260;
  const svgH = 190;
  const padding = 42;
  const scale = Math.min((svgW - padding * 2) / maxSpan, (svgH - padding * 2) / maxSpan);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const toSvgX = (x: number) => svgW / 2 + (x - centerX) * scale;
  const toSvgY = (y: number) => svgH / 2 - (y - centerY) * scale;

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
            <div className="flex items-center gap-2">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>{title}</h4>
              {hasSmartPoly && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Akıllı Poligon Referansı
                </span>
              )}
            </div>
            <p className={`text-[11px] ${textMuted}`}>
              {hasSmartPoly
                ? `Akıllı çizimden aktarılan ${pts.length} köşeli form (${polyArea.toFixed(1)} m² taban, ${polyPerimeter}m çevre)`
                : '1 cephe değiştiğinde diğer cepheler düzlem geometrisine göre otomatik hesaplanır'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {onEditInSmartPolygon && (
            <button
              type="button"
              onClick={onEditInSmartPolygon}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 shadow-2xs transition-colors flex items-center gap-1"
            >
              <Compass className="w-3 h-3 text-indigo-600" />
              Poligon Çiziminde Aç
            </button>
          )}
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
          {(() => {
            const frontRoad = (roads || []).find(r => r.facadeIndex === 0);
            return (
              <div className="p-2.5 bg-white rounded-xl border border-indigo-200/90 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-indigo-700 flex items-center gap-1">
                    <span>1. Ön Cephe</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600 font-semibold">
                      {frontRoad ? `🛣️ ${frontRoad.name || 'Yol'}` : 'Giriş / Yol'}
                    </span>
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
                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      const currentRoads = roads || [];
                      const exists = currentRoads.find(r => r.facadeIndex === 0);
                      let newRoads;
                      if (exists) {
                        newRoads = currentRoads.filter(r => r.facadeIndex !== 0);
                      } else {
                        newRoads = [...currentRoads, { id: `road-${Date.now()}-0`, facadeIndex: 0, name: 'Ön İmar Yolu', type: 'street' as const, width: 7 }];
                      }
                      if (onUpdateRoads) onUpdateRoads(newRoads);
                    }}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                      frontRoad
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {frontRoad ? '🛣️ Yol Var (%7m)' : '+ Yol Ekle'}
                  </button>
                  <span className="text-slate-400 font-mono">0. Cephe</span>
                </div>
              </div>
            );
          })()}

          {/* 2. Sağ Yan Cephe */}
          {(() => {
            const rightRoad = (roads || []).find(r => r.facadeIndex === 1);
            return (
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className={`font-bold ${textTitle} flex items-center gap-1`}>
                    <span>2. Sağ Cephe</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                      {rightRoad ? `🛣️ ${rightRoad.name || 'Yol'}` : 'Yan'}
                    </span>
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
                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      const currentRoads = roads || [];
                      const exists = currentRoads.find(r => r.facadeIndex === 1);
                      let newRoads;
                      if (exists) {
                        newRoads = currentRoads.filter(r => r.facadeIndex !== 1);
                      } else {
                        newRoads = [...currentRoads, { id: `road-${Date.now()}-1`, facadeIndex: 1, name: 'Sağ İmar Yolu', type: 'street' as const, width: 7 }];
                      }
                      if (onUpdateRoads) onUpdateRoads(newRoads);
                    }}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                      rightRoad
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {rightRoad ? '🛣️ Yol Var (%7m)' : '+ Yol Ekle'}
                  </button>
                  <span className="text-slate-400 font-mono">1. Cephe</span>
                </div>
              </div>
            );
          })()}

          {/* 3. Arka Cephe */}
          {(() => {
            const backRoad = (roads || []).find(r => r.facadeIndex === 2);
            return (
              <div className={`p-2.5 bg-white rounded-xl border shadow-2xs space-y-1.5 ${quad.isSkewed ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200/90'}`}>
                <div className="flex items-center justify-between text-xs">
                  <label className={`font-bold ${textTitle} flex items-center gap-1`}>
                    <span>3. Arka Cephe</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                      {backRoad ? `🛣️ ${backRoad.name || 'Yol'}` : 'Bahçe'}
                    </span>
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
                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      const currentRoads = roads || [];
                      const exists = currentRoads.find(r => r.facadeIndex === 2);
                      let newRoads;
                      if (exists) {
                        newRoads = currentRoads.filter(r => r.facadeIndex !== 2);
                      } else {
                        newRoads = [...currentRoads, { id: `road-${Date.now()}-2`, facadeIndex: 2, name: 'Arka İmar Yolu', type: 'street' as const, width: 7 }];
                      }
                      if (onUpdateRoads) onUpdateRoads(newRoads);
                    }}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                      backRoad
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {backRoad ? '🛣️ Yol Var (%7m)' : '+ Yol Ekle'}
                  </button>
                  <span className="text-slate-400 font-mono">2. Cephe</span>
                </div>
              </div>
            );
          })()}

          {/* 4. Sol Yan Cephe */}
          {(() => {
            const leftRoad = (roads || []).find(r => r.facadeIndex === 3);
            return (
              <div className={`p-2.5 bg-white rounded-xl border shadow-2xs space-y-1.5 ${quad.isSkewed ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200/90'}`}>
                <div className="flex items-center justify-between text-xs">
                  <label className={`font-bold ${textTitle} flex items-center gap-1`}>
                    <span>4. Sol Cephe</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                      {leftRoad ? `🛣️ ${leftRoad.name || 'Yol'}` : 'Yan'}
                    </span>
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
                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      const currentRoads = roads || [];
                      const exists = currentRoads.find(r => r.facadeIndex === 3);
                      let newRoads;
                      if (exists) {
                        newRoads = currentRoads.filter(r => r.facadeIndex !== 3);
                      } else {
                        newRoads = [...currentRoads, { id: `road-${Date.now()}-3`, facadeIndex: 3, name: 'Sol İmar Yolu', type: 'street' as const, width: 7 }];
                      }
                      if (onUpdateRoads) onUpdateRoads(newRoads);
                    }}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                      leftRoad
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {leftRoad ? '🛣️ Yol Var (%7m)' : '+ Yol Ekle'}
                  </button>
                  <span className="text-slate-400 font-mono">3. Cephe</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 2D Geometric SVG Canvas */}
        <div className={`${compact ? 'w-full' : 'lg:col-span-5'} bg-white p-2.5 rounded-xl border border-slate-200/90 flex flex-col items-center justify-center shadow-2xs relative`}>
          <div className="absolute top-1.5 left-2 flex items-center gap-1 text-[10px] font-bold text-slate-500">
            <Compass className="w-3 h-3 text-indigo-500" />
            <span>2D GEOMETRİ PLANI</span>
          </div>

          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-[260px] h-[190px] overflow-visible">
            {/* Grid background lines */}
            <defs>
              <pattern id="grid-pattern-geom" width="16" height="16" patternUnits="userSpaceOnUse">
                <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#f1f5f9" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={svgW} height={svgH} fill="url(#grid-pattern-geom)" rx="8" />

            {/* Adjacent Roads */}
            {roads.map((road, rIdx) => {
              if (road.facadeIndex >= pts.length) return null;
              const p1 = pts[road.facadeIndex];
              const p2 = pts[(road.facadeIndex + 1) % pts.length];
              const x1 = toSvgX(p1.x);
              const y1 = toSvgY(p1.y);
              const x2 = toSvgX(p2.x);
              const y2 = toSvgY(p2.y);
              const dx = x2 - x1;
              const dy = y2 - y1;
              const len = Math.hypot(dx, dy);
              if (len === 0) return null;
              const nx = -dy / len;
              const ny = dx / len;
              const roadWidth = Math.min(18, (road.width || 10) * 1.2);
              const midX = (x1 + x2) / 2 + nx * (roadWidth / 2 + 3);
              const midY = (y1 + y2) / 2 + ny * (roadWidth / 2 + 3);

              return (
                <g key={road.id || rIdx}>
                  <line
                    x1={x1 + nx * (roadWidth / 2)}
                    y1={y1 + ny * (roadWidth / 2)}
                    x2={x2 + nx * (roadWidth / 2)}
                    y2={y2 + ny * (roadWidth / 2)}
                    stroke="#475569"
                    strokeWidth={roadWidth}
                    strokeOpacity="0.35"
                    strokeLinecap="round"
                  />
                  <line
                    x1={x1 + nx * (roadWidth / 2)}
                    y1={y1 + ny * (roadWidth / 2)}
                    x2={x2 + nx * (roadWidth / 2)}
                    y2={y2 + ny * (roadWidth / 2)}
                    stroke="#f59e0b"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                    strokeOpacity="0.8"
                  />
                  <text
                    x={midX}
                    y={midY}
                    fontSize="7"
                    fontWeight="bold"
                    fill="#334155"
                    textAnchor="middle"
                    className="select-none font-mono"
                  >
                    🛣️ {road.name}
                  </text>
                </g>
              );
            })}

            {/* Polygon Boundary */}
            <polygon
              points={svgPoints}
              fill={hasSmartPoly ? 'rgba(79, 70, 229, 0.14)' : quad.isSkewed ? 'rgba(245, 158, 11, 0.12)' : 'rgba(99, 102, 241, 0.12)'}
              stroke={hasSmartPoly ? '#4338ca' : quad.isSkewed ? '#d97706' : '#4f46e5'}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Vertices & Points */}
            {pts.map((p, i) => {
              const cx = toSvgX(p.x);
              const cy = toSvgY(p.y);
              return (
                <g key={p.id || i}>
                  <circle cx={cx} cy={cy} r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                  <text
                    x={cx}
                    y={cy - 6}
                    fontSize="8"
                    fontWeight="bold"
                    fill="#1e293b"
                    textAnchor="middle"
                    className="font-mono select-none"
                  >
                    P{i + 1}
                  </text>
                </g>
              );
            })}

            {/* Edge Dimension Labels */}
            {pts.map((p1, i) => {
              const p2 = pts[(i + 1) % pts.length];
              const x1 = toSvgX(p1.x);
              const y1 = toSvgY(p1.y);
              const x2 = toSvgX(p2.x);
              const y2 = toSvgY(p2.y);
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;
              const edgeDist = Math.hypot(p2.x - p1.x, p2.y - p1.y).toFixed(1);
              const isEntrance = i === mainEntranceIndex;

              return (
                <g key={`edge-${i}`}>
                  <rect
                    x={midX - 16}
                    y={midY - 7}
                    width="32"
                    height="14"
                    rx="3"
                    fill="#ffffff"
                    stroke="#e2e8f0"
                    strokeWidth="0.8"
                    className="opacity-95"
                  />
                  <text
                    x={midX}
                    y={midY + 3.5}
                    fontSize="8.5"
                    fontWeight="bold"
                    fill={isEntrance ? '#059669' : '#334155'}
                    textAnchor="middle"
                    className="font-mono select-none"
                  >
                    {edgeDist}m
                  </text>

                  {/* Main Entrance Marker */}
                  {isEntrance && (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <circle cx="0" cy="12" r="6" fill="#059669" />
                      <text x="0" y="14" fontSize="7" fill="#ffffff" fontWeight="bold" textAnchor="middle">
                        🚪
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          <div className="flex items-center justify-between w-full px-2 pt-1 text-[10px] text-slate-600 font-mono">
            <span>{pts.length} Kenar / Cephe</span>
            <span className="font-bold text-indigo-700">{polyArea.toFixed(1)} m²</span>
            <span>Çevre: {polyPerimeter}m</span>
          </div>
        </div>
      </div>
    </div>
  );
};
