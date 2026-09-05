import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MousePointer,
  Plus,
  Trash2,
  RotateCcw,
  Maximize2,
  Grid,
  CheckCircle2,
  Layers,
  Sparkles,
  Compass,
  DoorOpen,
  Armchair,
  Home,
  Sliders,
  Eye,
  Info,
} from 'lucide-react';
import { PolygonPoint, FacadeDetailConfig, AppTheme } from '../types';
import {
  POLYGON_PRESETS,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  getPolygonEdges,
  getPolygonBounds,
  generateFacadeConfigs,
} from '../utils/footprintUtils';

interface InteractiveFootprintCanvasProps {
  points?: PolygonPoint[];
  onChangePoints: (newPoints: PolygonPoint[]) => void;
  facadeConfigs?: FacadeDetailConfig[];
  onChangeFacadeConfigs?: (configs: FacadeDetailConfig[]) => void;
  mainEntranceIndex?: number;
  onChangeMainEntranceIndex?: (index: number) => void;
  flatsPerFloor?: number;
  theme?: AppTheme;
  compact?: boolean;
}

export const InteractiveFootprintCanvas: React.FC<InteractiveFootprintCanvasProps> = ({
  points: propPoints,
  onChangePoints,
  facadeConfigs,
  onChangeFacadeConfigs,
  mainEntranceIndex = 0,
  onChangeMainEntranceIndex,
  flatsPerFloor = 2,
  theme = 'light',
  compact = false,
}) => {
  const points = (propPoints && propPoints.length >= 3) ? propPoints : POLYGON_PRESETS.rectangle.points;
  const isGray = theme === 'gray';

  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [gridStep, setGridStep] = useState<number>(0.5); // 0.5m grid step
  const [activeTab, setActiveTab] = useState<'canvas' | 'facades' | 'core'>('canvas');
  const [selectedEdgeIndex, setSelectedEdgeIndex] = useState<number | null>(0);

  // Canvas coordinate system parameters: -15m to +15m
  const viewBoxSize = 34; // 34 meters total width/height (-17 to +17)
  const halfSize = viewBoxSize / 2;

  // Real-time geometric calculations
  const area = calculatePolygonArea(points);
  const perimeter = calculatePolygonPerimeter(points);
  const edges = getPolygonEdges(points);
  const bounds = getPolygonBounds(points);

  // Sync facade configurations when edges change
  const currentFacadeConfigs = generateFacadeConfigs(points, facadeConfigs, mainEntranceIndex);

  // Convert SVG mouse/touch coordinates to meters (-17 to +17)
  const getMeterCoordinates = useCallback(
    (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>): { x: number; y: number } | null => {
      if (!svgRef.current) return null;
      const rect = svgRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const normX = (clientX - rect.left) / rect.width;
      const normY = (clientY - rect.top) / rect.height;

      let meterX = (normX * viewBoxSize) - halfSize;
      let meterY = (normY * viewBoxSize) - halfSize;

      if (snapToGrid) {
        meterX = Math.round(meterX / gridStep) * gridStep;
        meterY = Math.round(meterY / gridStep) * gridStep;
      }

      return {
        x: Math.round(meterX * 10) / 10,
        y: Math.round(meterY * 10) / 10,
      };
    },
    [snapToGrid, gridStep, viewBoxSize, halfSize]
  );

  // Handle Canvas Click to add vertex if not dragging
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) return;
    const coords = getMeterCoordinates(e);
    if (!coords) return;

    // Check if clicked near existing point
    const nearIndex = points.findIndex(
      (p) => Math.hypot(p.x - coords.x, p.y - coords.y) < 1.0
    );

    if (nearIndex !== -1) {
      setSelectedPointIndex(nearIndex);
      return;
    }

    // Insert point after the closest edge
    let closestEdgeIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const dist = Math.hypot(midX - coords.x, midY - coords.y);
      if (dist < minDistance) {
        minDistance = dist;
        closestEdgeIndex = i;
      }
    }

    const newPoints = [...points];
    const newPoint: PolygonPoint = {
      id: `p_${Date.now()}`,
      x: coords.x,
      y: coords.y,
    };
    newPoints.splice(closestEdgeIndex + 1, 0, newPoint);
    onChangePoints(newPoints);
    setSelectedPointIndex(closestEdgeIndex + 1);
  };

  // Vertex Drag Handlers
  const handlePointMouseDown = (index: number, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setSelectedPointIndex(index);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!isDragging || selectedPointIndex === null) return;
    const coords = getMeterCoordinates(e);
    if (!coords) return;

    const updated = [...points];
    updated[selectedPointIndex] = {
      ...updated[selectedPointIndex],
      x: coords.x,
      y: coords.y,
    };
    onChangePoints(updated);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Delete selected vertex
  const handleDeletePoint = (index: number) => {
    if (points.length <= 3) {
      alert('Bina taban poligonu en az 3 köşe noktasından oluşmalıdır.');
      return;
    }
    const updated = points.filter((_, i) => i !== index);
    onChangePoints(updated);
    setSelectedPointIndex(null);
  };

  // Apply Preset
  const handleApplyPreset = (presetKey: string) => {
    const preset = POLYGON_PRESETS[presetKey];
    if (preset) {
      onChangePoints(preset.points);
      setSelectedPointIndex(null);
      if (onChangeMainEntranceIndex) onChangeMainEntranceIndex(0);
    }
  };

  // Update specific facade configuration
  const handleUpdateFacadeConfig = (index: number, updates: Partial<FacadeDetailConfig>) => {
    const updated = currentFacadeConfigs.map((cfg, i) => {
      if (i === index) {
        return { ...cfg, ...updates };
      }
      if (updates.isEntrance && i !== index) {
        return { ...cfg, isEntrance: false };
      }
      return cfg;
    });

    if (onChangeFacadeConfigs) {
      onChangeFacadeConfigs(updated);
    }
    if (updates.isEntrance && onChangeMainEntranceIndex) {
      onChangeMainEntranceIndex(index);
    }
  };

  // SVG Polygon Points String
  const polygonPointsStr = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className={`space-y-3 ${isGray ? 'text-slate-200' : 'text-slate-800'}`}>
      {/* Sub-Header & Mode Navigation */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('canvas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'canvas'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Nokta & Çizgi Çizimi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('facades')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'facades'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cephe, Pencere & Balkonlar ({edges.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('core')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'core'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5" />
            <span>Giriş & Merdiven Dağılımı</span>
          </button>
        </div>

        {/* Live Area / Metrics Badge */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-900 font-mono">
            Alan: <span className="text-indigo-600">{area.toFixed(1)} m²</span>
          </div>
          <div className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 font-mono">
            Çevre: {perimeter.toFixed(1)} m
          </div>
        </div>
      </div>

      {/* TAB 1: INTERACTIVE 2D CANVAS */}
      {activeTab === 'canvas' && (
        <div className="space-y-2.5">
          {/* Quick Preset Selector & Grid Controls */}
          <div className="flex items-center justify-between gap-1 flex-wrap text-xs">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500">Hazır Şablonlar:</span>
              {Object.entries(POLYGON_PRESETS).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleApplyPreset(key)}
                  className="px-2 py-0.5 bg-white border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 rounded-lg text-[11px] font-medium transition-colors"
                >
                  {item.name.split(' ')[0]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-600 font-medium">
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(e) => setSnapToGrid(e.target.checked)}
                  className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer"
                />
                <span>Izgaraya Yapış ({gridStep}m)</span>
              </label>
              <button
                type="button"
                onClick={() => handleApplyPreset('rectangle')}
                className="p-1 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Sıfırla"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive SVG Drawing Board */}
          <div className="relative w-full aspect-[4/3] max-h-[380px] bg-slate-900 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-inner cursor-crosshair select-none">
            <svg
              ref={svgRef}
              viewBox={`-${halfSize} -${halfSize} ${viewBoxSize} ${viewBoxSize}`}
              className="w-full h-full"
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            >
              <defs>
                {/* 1-meter grid pattern */}
                <pattern id="grid-1m" width="1" height="1" patternUnits="userSpaceOnUse">
                  <path d="M 1 0 L 0 0 0 1" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.04" />
                </pattern>
                {/* 5-meter major grid pattern */}
                <pattern id="grid-5m" width="5" height="5" patternUnits="userSpaceOnUse">
                  <rect width="5" height="5" fill="url(#grid-1m)" />
                  <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.08" />
                </pattern>
                {/* Diagonal hatch for building interior */}
                <pattern id="hatch-arch" width="1" height="1" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="1" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="0.15" />
                </pattern>
              </defs>

              {/* Grid Background */}
              <rect x={`-${halfSize}`} y={`-${halfSize}`} width={viewBoxSize} height={viewBoxSize} fill="#0f172a" />
              <rect x={`-${halfSize}`} y={`-${halfSize}`} width={viewBoxSize} height={viewBoxSize} fill="url(#grid-5m)" />

              {/* Center Axes (X, Y in meters) */}
              <line x1={`-${halfSize}`} y1="0" x2={halfSize} y2="0" stroke="rgba(255,255,255,0.2)" strokeWidth="0.06" strokeDasharray="0.3,0.3" />
              <line x1="0" y1={`-${halfSize}`} x2="0" y2={halfSize} stroke="rgba(255,255,255,0.2)" strokeWidth="0.06" strokeDasharray="0.3,0.3" />

              {/* Direction Indicator */}
              <text x={0} y={`-${halfSize - 1.2}`} fill="rgba(255,255,255,0.4)" fontSize="0.9" fontWeight="bold" textAnchor="middle">
                ▲ ARKA PARSEL / KUZEY
              </text>
              <text x={0} y={`${halfSize - 0.6}`} fill="rgba(99, 102, 241, 0.8)" fontSize="0.9" fontWeight="bold" textAnchor="middle">
                ▼ ÖN YOL / GİRİŞ CEPHESİ
              </text>

              {/* Filled Polygon Floor */}
              <polygon
                points={polygonPointsStr}
                fill="url(#hatch-arch)"
                stroke="rgba(99, 102, 241, 0.4)"
                strokeWidth="0.1"
              />

              {/* Central Stair & Elevator Core Representation */}
              <g transform={`translate(${bounds.centerX}, ${bounds.centerY})`}>
                <rect
                  x="-1.8"
                  y="-1.5"
                  width="3.6"
                  height="3.0"
                  fill="rgba(234, 179, 8, 0.2)"
                  stroke="rgba(234, 179, 8, 0.8)"
                  strokeWidth="0.12"
                  rx="0.2"
                />
                <text x="0" y="-0.2" fill="#fef08a" fontSize="0.55" fontWeight="bold" textAnchor="middle">
                  🏛️ MERDİVEN & ASANSÖR
                </text>
                <text x="0" y="0.7" fill="#fde047" fontSize="0.45" textAnchor="middle">
                  {flatsPerFloor} Daireli Kat Holü
                </text>
              </g>

              {/* Polygon Edges with Lengths and Entrance Indicator */}
              {edges.map((edge, idx) => {
                const isEntrance = (currentFacadeConfigs[idx]?.isEntrance) || (idx === mainEntranceIndex);
                const isSelected = selectedEdgeIndex === idx;

                return (
                  <g key={`edge-${idx}`} className="cursor-pointer" onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEdgeIndex(idx);
                    setActiveTab('facades');
                  }}>
                    {/* Line */}
                    <line
                      x1={edge.start.x}
                      y1={edge.start.y}
                      x2={edge.end.x}
                      y2={edge.end.y}
                      stroke={isEntrance ? '#22c55e' : (isSelected ? '#6366f1' : '#38bdf8')}
                      strokeWidth={isEntrance ? '0.4' : '0.28'}
                      strokeLinecap="round"
                    />

                    {/* Edge Midpoint Label & Length Badge */}
                    <g transform={`translate(${edge.midpoint.x}, ${edge.midpoint.y})`}>
                      <circle
                        r="0.85"
                        fill={isEntrance ? '#15803d' : '#1e293b'}
                        stroke={isEntrance ? '#4ade80' : '#64748b'}
                        strokeWidth="0.08"
                      />
                      <text
                        x="0"
                        y="0.25"
                        fill="#ffffff"
                        fontSize="0.52"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {edge.length}m
                      </text>

                      {isEntrance && (
                        <g transform="translate(0, 1.4)">
                          <rect x="-2.2" y="-0.5" width="4.4" height="1.0" rx="0.3" fill="#16a34a" />
                          <text x="0" y="0.22" fill="#ffffff" fontSize="0.45" fontWeight="bold" textAnchor="middle">
                            🚪 ANA GİRİŞ
                          </text>
                        </g>
                      )}
                    </g>
                  </g>
                );
              })}

              {/* Vertex Control Points (Draggable Dots) */}
              {points.map((p, idx) => {
                const isSelected = selectedPointIndex === idx;
                return (
                  <g
                    key={`point-${p.id || idx}`}
                    className="cursor-move"
                    onMouseDown={(e) => handlePointMouseDown(idx, e)}
                    onTouchStart={(e) => handlePointMouseDown(idx, e)}
                  >
                    {/* Outer Glow Halo */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isSelected ? '1.0' : '0.75'}
                      fill={isSelected ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.2)'}
                    />
                    {/* Core Handle */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="0.45"
                      fill={isSelected ? '#6366f1' : '#f8fafc'}
                      stroke="#0f172a"
                      strokeWidth="0.12"
                    />
                    {/* Vertex Index Label */}
                    <text
                      cx={p.x}
                      cy={p.y}
                      x={p.x}
                      y={p.y - 0.7}
                      fill="#94a3b8"
                      fontSize="0.55"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      K{idx + 1}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Canvas Overlay Helper */}
            <div className="absolute top-2 left-2 px-2 py-1 bg-slate-900/85 backdrop-blur-sm rounded-lg border border-slate-700 text-[10px] text-slate-300 pointer-events-none">
              💡 <b>İpucu:</b> Boş yere tıklayarak <b>yeni köşe ekleyin</b>, noktaları <b>sürükleyerek</b> formu değiştirin.
            </div>

            {/* Selected Vertex Delete Action Bar */}
            {selectedPointIndex !== null && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-sm p-1.5 rounded-xl border border-slate-700">
                <span className="text-[11px] font-bold text-indigo-400 px-1">
                  Köşe {selectedPointIndex + 1}: ({points[selectedPointIndex].x}m, {points[selectedPointIndex].y}m)
                </span>
                <button
                  type="button"
                  onClick={() => handleDeletePoint(selectedPointIndex)}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Köşeyi Sil</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CEPHELER, PENCERELER & BALKONLAR MANUEL GİRİŞİ */}
      {activeTab === 'facades' && (
        <div className="space-y-3">
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-xs text-indigo-950 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <b>3D Model Cephe Özelleştirmesi:</b> Aşağıdaki listeden her cephenin pencere adedini, balkon var/yok durumunu ve bina ana giriş kapısının hangi cephede olacağını manuel olarak seçebilirsiniz. 3D modele anında yansır.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
            {currentFacadeConfigs.map((cfg, idx) => {
              const edge = edges[idx];
              const isEntrance = cfg.isEntrance || idx === mainEntranceIndex;

              return (
                <div
                  key={cfg.id || idx}
                  className={`p-3 rounded-2xl border transition-all ${
                    isEntrance
                      ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300'
                      : 'bg-slate-50/90 border-slate-200 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {cfg.name}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {edge ? edge.length : cfg.length} m
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2.5 text-xs">
                    {/* Pencere Sayısı */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        🪟 Kat Başına Pencere:
                      </label>
                      <select
                        value={cfg.windowCountPerFloor}
                        onChange={(e) => handleUpdateFacadeConfig(idx, { windowCountPerFloor: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-semibold"
                      >
                        <option value={0}>0 (Kör Cephe)</option>
                        <option value={1}>1 Pencere</option>
                        <option value={2}>2 Pencere</option>
                        <option value={3}>3 Pencere</option>
                        <option value={4}>4 Pencere</option>
                        <option value={5}>5 Pencere</option>
                        <option value={6}>6 Pencere</option>
                      </select>
                    </div>

                    {/* Balkon Sayısı ve Tipi */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        🏞️ Balkon Durumu:
                      </label>
                      <select
                        value={cfg.hasBalcony ? cfg.balconyCountPerFloor || 1 : 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          handleUpdateFacadeConfig(idx, {
                            hasBalcony: val > 0,
                            balconyCountPerFloor: val,
                          });
                        }}
                        className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-semibold"
                      >
                        <option value={0}>Balkon Yok</option>
                        <option value={1}>1 Adet Balkon</option>
                        <option value={2}>2 Adet Balkon</option>
                        <option value={3}>3 Adet Balkon</option>
                      </select>
                    </div>
                  </div>

                  {/* Balkon Tipi Seçimi (Balkon varsa) */}
                  {cfg.hasBalcony && (
                    <div className="pt-2 flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 font-medium">Balkon Mimari Tipi:</span>
                      <div className="flex items-center gap-1">
                        {(['standard', 'french', 'recessed'] as const).map((bType) => (
                          <button
                            key={bType}
                            type="button"
                            onClick={() => handleUpdateFacadeConfig(idx, { balconyType: bType })}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
                              (cfg.balconyType || 'standard') === bType
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {bType === 'standard' ? 'Çıkma' : bType === 'french' ? 'Fransız' : 'Gömme'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bina Giriş Kapısı Seçimi */}
                  <div className="pt-2.5 mt-2 border-t border-slate-200 flex items-center justify-between">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="radio"
                        name="mainEntranceFacade"
                        checked={isEntrance}
                        onChange={() => handleUpdateFacadeConfig(idx, { isEntrance: true })}
                        className="w-4 h-4 accent-emerald-600 cursor-pointer"
                      />
                      <span>🚪 Bina Ana Giriş Kapısı Bu Cephede</span>
                    </label>
                    {isEntrance && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        Seçili Giriş
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: MERDİVEN, DAİRE DAĞILIMI & BİNA GİRİŞİ */}
      {activeTab === 'core' && (
        <div className="space-y-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 pb-2 border-b border-slate-200">
            <DoorOpen className="w-4 h-4 text-indigo-600" />
            <span>Gerçekçi Bina Girişi & Kat Sirkülasyon Planı</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Seçili Giriş Cephesi:</span>
              <div className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                <DoorOpen className="w-4 h-4 text-emerald-600" />
                <span>
                  {currentFacadeConfigs[mainEntranceIndex]?.name || `${mainEntranceIndex + 1}. Ön Cephe`}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Zemin katta ana giriş kapısı, sundurma ve giriş rüzgarlığı bu cepheye konumlandırılır.
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Daire Dağılımı:</span>
              <div className="text-sm font-bold text-indigo-700 flex items-center gap-1.5">
                <Home className="w-4 h-4 text-indigo-600" />
                <span>Katta {flatsPerFloor} Daire</span>
              </div>
              <p className="text-[10px] text-slate-500">
                {flatsPerFloor === 1
                  ? 'Tek daireli kat: Merdiven sahanlığından doğrudan daire ana kapısına giriş.'
                  : flatsPerFloor === 2
                  ? 'Çift daireli kat: Sağ ve sol kanat simetrik daire giriş kapıları.'
                  : 'Çoklu daireli kat: Merkezi sahanlık etrafında eşit açılı kapı dağılımı.'}
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Merdiven & Asansör Şaftı:</span>
              <div className="text-sm font-bold text-amber-700 flex items-center gap-1.5">
                <Armchair className="w-4 h-4 text-amber-600" />
                <span>Merkezi Yangın Güvenlikli Çekirdek</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Bina ağırlık merkezine yakın, ana giriş holü ile doğrudan irtibatlı konsept yerleşim.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
