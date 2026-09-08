import React, { useState } from 'react';
import {
  Ruler,
  DoorOpen,
  Car,
  Trees,
  Layers,
  ShieldAlert,
  Sparkles,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  Building2,
  Maximize2,
  Compass,
  ArrowRight,
  Info,
  Sliders,
  Eye,
} from 'lucide-react';
import {
  ProjectParams,
  FacadeDetailConfig,
  RoadConfig,
  RoadType,
  BalconyType,
  AppTheme,
  PolygonPoint,
} from '../types';
import {
  generateFacadeConfigs,
  getPolygonEdges,
  getPolygonBounds,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  syncPolygonToCustomFacades,
  normalizePolygonAndAlignToGrid,
} from '../utils/footprintUtils';
import { calculateCantileverDetails } from '../utils/calculatorEngine';
import { InteractiveFootprintCanvas } from './InteractiveFootprintCanvas';

export interface UnifiedFacadeManagerProps {
  params: ProjectParams;
  onChangeParams: (newParams: ProjectParams) => void;
  theme?: AppTheme;
}

export const UnifiedFacadeManager: React.FC<UnifiedFacadeManagerProps> = ({
  params,
  onChangeParams,
  theme = 'light',
}) => {
  const isGray = theme === 'gray';
  const bgCard = isGray ? 'bg-zinc-800/80 border-zinc-700' : 'bg-white border-slate-200';
  const textTitle = isGray ? 'text-zinc-100' : 'text-slate-900';
  const textMuted = isGray ? 'text-zinc-400' : 'text-slate-500';

  const [selectedFacadeIdx, setSelectedFacadeIdx] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'interactive' | 'grid'>('interactive');

  // Points & Edges from current geometry
  const polygonPoints = params.polygonPoints && params.polygonPoints.length >= 3
    ? params.polygonPoints
    : [
        { x: -7, y: -9 },
        { x: 7, y: -9 },
        { x: 7, y: 9 },
        { x: -7, y: 9 },
      ];

  const edges = getPolygonEdges(polygonPoints);
  const bounds = getPolygonBounds(polygonPoints);
  const polyArea = calculatePolygonArea(polygonPoints);
  const polyPerimeter = calculatePolygonPerimeter(polygonPoints);

  // Synchronized facade configs
  const mainEntranceIndex = params.mainEntranceFacadeIndex || 0;
  const facadeConfigs = generateFacadeConfigs(
    polygonPoints,
    params.facadeConfigs,
    mainEntranceIndex
  );

  const roads = params.roads || [];

  // Cantilever details calculation
  const cantileverInfo = calculateCantileverDetails(params, polyArea);
  const hasGlobalCantilever = !!params.hasCantilever;
  const globalCantileverDepth = params.cantileverDepth || 1.2;

  // Selected facade object
  const safeIdx = Math.min(selectedFacadeIdx, edges.length - 1);
  const currentEdge = edges[safeIdx] || edges[0];
  const currentConfig = facadeConfigs[safeIdx] || facadeConfigs[0];
  const currentRoad = roads.find((r) => r.facadeIndex === safeIdx);

  // Helper to update facade configs
  const handleUpdateFacadeConfig = (idx: number, updates: Partial<FacadeDetailConfig>) => {
    const updatedConfigs = facadeConfigs.map((cfg, i) => {
      if (i === idx) {
        const next = { ...cfg, ...updates };

        // If turning into blind or adjacent, disable window, balcony, and cantilever
        if (updates.isBlankWall === true || updates.isAdjacent === true) {
          next.windowCountPerFloor = 0;
          next.hasBalcony = false;
          next.balconyCountPerFloor = 0;
          next.cantileverDepth = 0;
        } else if (updates.isBlankWall === false && updates.isAdjacent === false && cfg.windowCountPerFloor === 0) {
          // Re-enable default windows if coming out of blind
          next.windowCountPerFloor = Math.max(1, Math.min(6, Math.floor(cfg.length / 3.5)));
        }

        return next;
      }
      return cfg;
    });

    // Also update customFacades and facadeCantilevers if present
    const updatedCantilevers = updatedConfigs.map((c) => c.cantileverDepth || 0);

    onChangeParams({
      ...params,
      facadeConfigs: updatedConfigs,
      facadeCantilevers: updatedCantilevers,
    });
  };

  // Helper to set main entrance
  const handleSetMainEntrance = (idx: number) => {
    const updatedConfigs = facadeConfigs.map((cfg, i) => ({
      ...cfg,
      isEntrance: i === idx,
    }));

    onChangeParams({
      ...params,
      mainEntranceFacadeIndex: idx,
      facadeConfigs: updatedConfigs,
    });
  };

  // Helper to toggle road on facade
  const handleToggleRoad = (idx: number) => {
    const existing = roads.find((r) => r.facadeIndex === idx);
    let updatedRoads: RoadConfig[];

    if (existing) {
      updatedRoads = roads.filter((r) => r.facadeIndex !== idx);
    } else {
      const edge = edges[idx];
      const roadNames = ['Atatürk Cad.', 'Cumhuriyet Cad.', 'İnönü Cad.', 'Bağdat Cad.', '102. Sokak', 'Gülbahar Sokak'];
      const defaultName = roadNames[idx % roadNames.length] || `${idx + 1}. İmar Yolu`;

      const newRoad: RoadConfig = {
        id: `road-${Date.now()}-${idx}`,
        facadeIndex: idx,
        name: defaultName,
        type: 'street',
        width: 7,
      };
      updatedRoads = [...roads, newRoad];

      // Mark facade as open if it was blind
      if (facadeConfigs[idx]?.isBlankWall || facadeConfigs[idx]?.isAdjacent) {
        handleUpdateFacadeConfig(idx, { isBlankWall: false, isAdjacent: false });
      }
    }

    onChangeParams({
      ...params,
      roads: updatedRoads,
    });
  };

  // Helper to update road properties
  const handleUpdateRoad = (idx: number, updates: Partial<RoadConfig>) => {
    const updatedRoads = roads.map((r) => {
      if (r.facadeIndex === idx) {
        return { ...r, ...updates };
      }
      return r;
    });
    onChangeParams({
      ...params,
      roads: updatedRoads,
    });
  };

  // Helper to change edge length
  const handleChangeEdgeLength = (idx: number, newLength: number) => {
    const clamped = Math.max(1.0, Math.min(80.0, Math.round(newLength * 10) / 10));
    const edge = edges[idx];
    if (!edge) return;

    const currentLen = edge.length;
    if (Math.abs(currentLen - clamped) < 0.01) return;

    const ratio = clamped / currentLen;
    const pStart = polygonPoints[edge.startIndex];
    const pEnd = polygonPoints[edge.endIndex];

    const dx = pEnd.x - pStart.x;
    const dy = pEnd.y - pStart.y;

    const newPts = polygonPoints.map((p, pIdx) => {
      if (pIdx === edge.endIndex) {
        return {
          x: Math.round((pStart.x + dx * ratio) * 10) / 10,
          y: Math.round((pStart.y + dy * ratio) * 10) / 10,
        };
      }
      return p;
    });

    const { normalizedPoints: normalized } = normalizePolygonAndAlignToGrid(newPts, { gridStep: 0.5 });
    const newBounds = getPolygonBounds(normalized);
    const syncedConfigs = generateFacadeConfigs(normalized, facadeConfigs, mainEntranceIndex);
    const syncedCustom = syncPolygonToCustomFacades(normalized, params.customFacades, syncedConfigs, mainEntranceIndex);

    onChangeParams({
      ...params,
      polygonPoints: normalized,
      facadeWidth: Math.round(newBounds.width * 10) / 10,
      facadeDepth: Math.round(newBounds.depth * 10) / 10,
      facadeConfigs: syncedConfigs,
      customFacades: syncedCustom,
    });
  };

  // Quick Preset Handlers
  const handleApplyAllOpenWithCantilever = (depth: number) => {
    const updated = facadeConfigs.map((cfg) => ({
      ...cfg,
      isBlankWall: false,
      isAdjacent: false,
      windowCountPerFloor: cfg.windowCountPerFloor > 0 ? cfg.windowCountPerFloor : Math.max(1, Math.min(6, Math.floor(cfg.length / 3.5))),
      cantileverDepth: depth,
    }));

    onChangeParams({
      ...params,
      hasCantilever: true,
      cantileverDepth: depth,
      cantileverDirection: 'all',
      facadeConfigs: updated,
      facadeCantilevers: updated.map((c) => c.cantileverDepth || 0),
    });
  };

  const handleClearCantilevers = () => {
    const updated = facadeConfigs.map((cfg) => ({
      ...cfg,
      cantileverDepth: 0,
    }));

    onChangeParams({
      ...params,
      hasCantilever: false,
      cantileverDepth: 0,
      facadeConfigs: updated,
      facadeCantilevers: updated.map(() => 0),
    });
  };

  const handleApplyCornerLotPreset = () => {
    // Corner lot: Facades 0 (Front) & 1 (Right) are open/road, 2 (Back) & 3 (Left) are adjacent blind
    const updated = facadeConfigs.map((cfg, i) => {
      const isRoadOrFront = i === 0 || i === 1;
      return {
        ...cfg,
        isAdjacent: !isRoadOrFront,
        isBlankWall: !isRoadOrFront,
        windowCountPerFloor: isRoadOrFront ? Math.max(2, Math.floor(cfg.length / 3.5)) : 0,
        hasBalcony: isRoadOrFront,
        balconyCountPerFloor: isRoadOrFront ? 1 : 0,
        cantileverDepth: isRoadOrFront ? (params.cantileverDepth || 1.2) : 0,
      };
    });

    // Ensure road on front
    let updatedRoads = [...roads];
    if (!updatedRoads.find((r) => r.facadeIndex === 0)) {
      updatedRoads.push({
        id: `road-front-${Date.now()}`,
        facadeIndex: 0,
        name: 'Ana Cadde',
        type: 'avenue',
        width: 20,
      });
    }

    onChangeParams({
      ...params,
      hasCantilever: true,
      cantileverDepth: params.cantileverDepth || 1.2,
      cantileverDirection: 'custom',
      facadeConfigs: updated,
      facadeCantilevers: updated.map((c) => c.cantileverDepth || 0),
      roads: updatedRoads,
    });
  };

  return (
    <div id="unified-facade-manager" className="space-y-6 animate-fade-in">
      {/* 🌟 ANA BAŞLIK & METRAJ ÖZETİ ŞERİDİ */}
      <div className={`${bgCard} rounded-2xl p-6 border shadow-xs relative overflow-hidden`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                Merkezi Cephe & Geometri Yönetimi
              </span>
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                {edges.length} Cepheli Kütle
              </span>
            </div>
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${textTitle}`}>
              Tüm Cephe İşlemleri, Ölçüleri & Mimari Özellikleri
            </h2>
            <p className={`text-xs sm:text-sm ${textMuted} max-w-3xl leading-relaxed`}>
              Bina kütlesinin tüm cephe ölçülerini, yol ve bahçe bağlantılarını, kör cephe / bitişik nizam sınırlarını, bina ana giriş kapısını, balkon/pencere dağılımını ve konsol çıkma (tabla) alanlarını tek bir merkezden yönetin.
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 font-mono">
              <span>Taban:</span>
              <span className="text-indigo-600 font-black">{polyArea.toFixed(1)} m²</span>
            </div>
            {cantileverInfo.singleFloorDiff > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 font-mono">
                <span>Normal Kat:</span>
                <span className="text-emerald-700 font-black">{cantileverInfo.upperFloorArea.toFixed(1)} m²</span>
                <span className="text-[10px] text-emerald-600">(+{cantileverInfo.singleFloorDiff.toFixed(1)} m² Çıkma)</span>
              </div>
            )}
          </div>
        </div>

        {/* Hızlı Şablonlar & Toplu Aksiyon Çubuğu */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 mr-1">Hızlı Şablonlar:</span>
            <button
              type="button"
              onClick={() => handleApplyAllOpenWithCantilever(1.2)}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ayrık Nizam: Açık Cephelere 1.2m Çıkma</span>
            </button>
            <button
              type="button"
              onClick={handleApplyCornerLotPreset}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Köşe Parsel: Ön & Sağ Açık, Arka & Sol Bitişik</span>
            </button>
            <button
              type="button"
              onClick={handleClearCantilevers}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3 text-slate-500" />
              <span>Çıkmaları Sıfırla (Düz Cephe)</span>
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('interactive')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'interactive'
                  ? 'bg-white text-indigo-700 shadow-3xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📐 2D Çizim & Cephe Detayı
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-700 shadow-3xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 Tüm Cepheler Kart Listesi ({edges.length})
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2D ÇİZİM VE CEPHE DENETÇİSİ (İNTERAKTİF BÖLÜM) */}
      {/* ========================================================================= */}
      {viewMode === 'interactive' && (
        <div className="space-y-6">
          {/* Cephe Seçici Şerit (Pills) */}
          <div className={`${bgCard} rounded-2xl p-4 border shadow-xs space-y-3`}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Düzenlemek İstediğiniz Cepheyi Seçin:
              </label>
              <span className="text-[11px] font-mono text-slate-500">
                Toplam Çevre: {polyPerimeter.toFixed(1)} m
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {edges.map((edge, idx) => {
                const isSelected = safeIdx === idx;
                const isEntrance = idx === mainEntranceIndex;
                const road = roads.find((r) => r.facadeIndex === idx);
                const cfg = facadeConfigs[idx];
                const isBlind = cfg?.isBlankWall || cfg?.isAdjacent || cfg?.windowCountPerFloor === 0;
                const hasCant = (cfg?.cantileverDepth || 0) > 0;

                return (
                  <button
                    key={`facade-pill-${idx}`}
                    type="button"
                    onClick={() => setSelectedFacadeIdx(idx)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-200'
                        : isEntrance
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                        : road
                        ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                        : isBlind
                        ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-black">
                      {idx + 1}
                    </span>
                    <span>{cfg?.name || `${idx + 1}. Cephe`}</span>
                    <span className="opacity-90 font-mono font-black">({edge.length}m)</span>
                    {isEntrance && <span title="Ana Bina Girişi">🚪</span>}
                    {road && <span title="Yol Cephesi">🛣️</span>}
                    {isBlind && <span title="Kör / Bitişik Cephe">🧱</span>}
                    {hasCant && <span title="Konsol Çıkma Var">📐</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TEK CEPHE MASTER DÜZENLEME PANELİ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* SOL KOLON: SEÇİLİ CEPHENİN TÜM ÖZELLİKLERİ (7 KOLON) */}
            <div className="lg:col-span-7 space-y-4">
              <div className={`${bgCard} rounded-2xl p-5 border shadow-xs space-y-5`}>
                {/* 1. Üst Başlık & Giriş Butonu */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white text-sm font-black flex items-center justify-center shadow-3xs">
                      {safeIdx + 1}
                    </span>
                    <div>
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <span>{currentConfig?.name || `${safeIdx + 1}. Cephe`}</span>
                        <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                          {currentEdge?.length || 0} Metre
                        </span>
                      </h3>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Köşe K{currentEdge?.startIndex + 1} ({currentEdge?.start.x}m, {currentEdge?.start.y}m) ➔ Köşe K{currentEdge?.endIndex + 1} ({currentEdge?.end.x}m, {currentEdge?.end.y}m) • Açı: {currentEdge?.angleDeg}°
                      </span>
                    </div>
                  </div>

                  {/* 🚪 1-CLICK MAIN ENTRANCE TOGGLE BUTTON */}
                  <button
                    type="button"
                    onClick={() => handleSetMainEntrance(safeIdx)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      safeIdx === mainEntranceIndex
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200'
                        : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    <DoorOpen className="w-4 h-4" />
                    <span>{safeIdx === mainEntranceIndex ? '✓ Ana Bina Giriş Kapısı' : '🚪 Bu Cepheyi Ana Giriş Yap'}</span>
                  </button>
                </div>

                {/* 2. CEPHE ÖLÇÜSÜ (UZUNLUK METRAJ DÜZENLEYİCİ) */}
                <div id="facade-length-controls" className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        1. Cephe Ölçüsü (Uzunluk Metresi):
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-indigo-600">
                      Geometri & Kütleye Canlı Yansır
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleChangeEdgeLength(safeIdx, currentEdge.length - 1.0)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                    >
                      -1m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeEdgeLength(safeIdx, currentEdge.length - 0.5)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                    >
                      -0.5m
                    </button>

                    {/* Numeric Input */}
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-xl border border-indigo-300 shadow-3xs">
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="80"
                        value={currentEdge.length}
                        onChange={(e) => handleChangeEdgeLength(safeIdx, parseFloat(e.target.value) || 1)}
                        className="w-20 bg-transparent text-sm font-mono font-black text-indigo-900 focus:outline-none text-center"
                      />
                      <span className="text-xs font-bold text-indigo-600">m</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleChangeEdgeLength(safeIdx, currentEdge.length + 0.5)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                    >
                      +0.5m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeEdgeLength(safeIdx, currentEdge.length + 1.0)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                    >
                      +1m
                    </button>
                  </div>
                </div>

                {/* 3. CEPHE KONUMU VE ÇEVRE ÖZELLİĞİ (4 SEÇENEK: YOL / BAHÇE / KÖR / BİTİŞİK) */}
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Compass className="w-4 h-4 text-amber-600" />
                      2. Cephe Konumu & Çevre Özellikleri:
                    </span>
                    <span className="text-[10px] text-slate-400">Tek tıkla cephe türünü belirleyin</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* Seçenek A: Yol Cephesi */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentRoad) handleToggleRoad(safeIdx);
                        handleUpdateFacadeConfig(safeIdx, { isBlankWall: false, isAdjacent: false });
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        !!currentRoad
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Car className="w-4 h-4" />
                        {!!currentRoad && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-black">🛣️ Yol Cephesi</div>
                        <div className={`text-[10px] ${!!currentRoad ? 'text-amber-100' : 'text-slate-400'} mt-0.5`}>
                          Cadde / Sokak
                        </div>
                      </div>
                    </button>

                    {/* Seçenek B: Bahçe Cephesi */}
                    <button
                      type="button"
                      onClick={() => {
                        if (currentRoad) handleToggleRoad(safeIdx);
                        handleUpdateFacadeConfig(safeIdx, { isBlankWall: false, isAdjacent: false });
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        !currentRoad && !currentConfig.isBlankWall && !currentConfig.isAdjacent
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Trees className="w-4 h-4" />
                        {!currentRoad && !currentConfig.isBlankWall && !currentConfig.isAdjacent && (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-black">🌳 Bahçe Cephesi</div>
                        <div className={`text-[10px] ${!currentRoad && !currentConfig.isBlankWall && !currentConfig.isAdjacent ? 'text-emerald-100' : 'text-slate-400'} mt-0.5`}>
                          Açık Çekme Alanı
                        </div>
                      </div>
                    </button>

                    {/* Seçenek C: Kör Cephe (Sağır Duvar) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (currentRoad) handleToggleRoad(safeIdx);
                        handleUpdateFacadeConfig(safeIdx, { isBlankWall: true, isAdjacent: false });
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        currentConfig.isBlankWall && !currentConfig.isAdjacent
                          ? 'bg-slate-800 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Building2 className="w-4 h-4" />
                        {currentConfig.isBlankWall && !currentConfig.isAdjacent && (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-black">🧱 Kör Cephe</div>
                        <div className={`text-[10px] ${currentConfig.isBlankWall && !currentConfig.isAdjacent ? 'text-slate-300' : 'text-slate-400'} mt-0.5`}>
                          Sağır Duvar (0 Pencere)
                        </div>
                      </div>
                    </button>

                    {/* Seçenek D: Bitişik Nizam */}
                    <button
                      type="button"
                      onClick={() => {
                        if (currentRoad) handleToggleRoad(safeIdx);
                        handleUpdateFacadeConfig(safeIdx, { isAdjacent: true, isBlankWall: true });
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        currentConfig.isAdjacent
                          ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <ShieldAlert className="w-4 h-4" />
                        {currentConfig.isAdjacent && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-black">🏢 Bitişik Nizam</div>
                        <div className={`text-[10px] ${currentConfig.isAdjacent ? 'text-rose-100' : 'text-slate-400'} mt-0.5`}>
                          Komşu Parsel Sınırı
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Yol Detay Düzenleyicisi (Eğer Yol Aktifse) */}
                  {currentRoad && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5 animate-fade-in text-xs">
                      <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60">
                        <span className="font-bold text-amber-950 flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-amber-600" />
                          Yol Genişliği & İsim Ayarı:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleRoad(safeIdx)}
                          className="text-[10px] font-bold text-red-600 hover:text-red-800 cursor-pointer"
                        >
                          ✕ Yolu Kaldır
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">
                            Yol Tipi & Genişliği:
                          </label>
                          <select
                            value={currentRoad.type}
                            onChange={(e) => {
                              const type = e.target.value as RoadType;
                              const wMap: Record<RoadType, number> = { street: 7, road: 12, avenue: 20, highway: 35 };
                              handleUpdateRoad(safeIdx, { type, width: wMap[type] });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                          >
                            <option value="street">Sokak (7 metre)</option>
                            <option value="road">İmar Yolu (12 metre)</option>
                            <option value="avenue">Cadde (20 metre)</option>
                            <option value="highway">Bulvar / Anayol (35 metre)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">
                            Yol Adı (İsteğe Bağlı):
                          </label>
                          <input
                            type="text"
                            value={currentRoad.name || ''}
                            onChange={(e) => handleUpdateRoad(safeIdx, { name: e.target.value })}
                            placeholder="Örn: Atatürk Cad."
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bitişik Nizam / Kör Cephe Kanuni Bilgilendirmesi */}
                  {(currentConfig.isAdjacent || currentConfig.isBlankWall) && (
                    <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 flex items-start gap-2 animate-fade-in">
                      <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <b>Planlı Alanlar İmar Yönetmeliği (Md. 41):</b> Kör cephe ve komşu parsel sınırına bitişik nizam duvarlarda pencere, balkon ve konsol çıkma imalatı yapılamaz. Bu cephe sağır duvar olarak modellenir.
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. BALKON & PENCERE DURUMU (OLSUN / OLMASIN) */}
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-4">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    3. Pencere & Balkon Dağılımı (Katta):
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Pencere Bölümü */}
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentConfig.windowCountPerFloor > 0 && !currentConfig.isBlankWall && !currentConfig.isAdjacent}
                            disabled={currentConfig.isAdjacent || currentConfig.isBlankWall}
                            onChange={(e) => {
                              handleUpdateFacadeConfig(safeIdx, {
                                windowCountPerFloor: e.target.checked
                                  ? Math.max(1, Math.min(6, Math.floor(currentEdge.length / 3.5)))
                                  : 0,
                              });
                            }}
                            className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                          />
                          <span>🪟 Pencereler Olsun mu?</span>
                        </label>
                        <span className="text-[11px] font-mono font-bold text-indigo-700">
                          {currentConfig.windowCountPerFloor > 0 ? `${currentConfig.windowCountPerFloor} Adet / Kat` : 'Penceresiz'}
                        </span>
                      </div>

                      {currentConfig.windowCountPerFloor > 0 && !currentConfig.isBlankWall && !currentConfig.isAdjacent && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-600">Kat Başına Pencere Adedi:</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5, 6].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => handleUpdateFacadeConfig(safeIdx, { windowCountPerFloor: num })}
                                className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                  currentConfig.windowCountPerFloor === num
                                    ? 'bg-indigo-600 text-white shadow-3xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Balkon Bölümü */}
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!currentConfig.hasBalcony && currentConfig.windowCountPerFloor > 0}
                            disabled={currentConfig.isAdjacent || currentConfig.isBlankWall || currentConfig.windowCountPerFloor === 0}
                            onChange={(e) => {
                              handleUpdateFacadeConfig(safeIdx, {
                                hasBalcony: e.target.checked,
                                balconyCountPerFloor: e.target.checked ? (currentConfig.balconyCountPerFloor || 1) : 0,
                              });
                            }}
                            className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                          />
                          <span>🏞️ Balkon Olsun mu?</span>
                        </label>
                        <span className="text-[11px] font-mono font-bold text-indigo-700">
                          {currentConfig.hasBalcony ? `${currentConfig.balconyCountPerFloor || 1} Adet / Kat` : 'Balkonsuz'}
                        </span>
                      </div>

                      {currentConfig.hasBalcony && currentConfig.windowCountPerFloor > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">Balkon Sayısı:</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3].map((bCount) => (
                                <button
                                  key={bCount}
                                  type="button"
                                  onClick={() => handleUpdateFacadeConfig(safeIdx, { balconyCountPerFloor: bCount })}
                                  className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                    (currentConfig.balconyCountPerFloor || 1) === bCount
                                      ? 'bg-indigo-600 text-white shadow-3xs'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  {bCount}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">
                              Balkon Mimari Modeli:
                            </label>
                            <select
                              value={currentConfig.balconyType || 'standard'}
                              onChange={(e) => handleUpdateFacadeConfig(safeIdx, { balconyType: e.target.value as BalconyType })}
                              className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                            >
                              <option value="standard">Açık Konsol Balkon</option>
                              <option value="glass_enclosed">Katlanır Cam Balkon (Kış Bahçesi)</option>
                              <option value="recessed">Gömme / Lojya Balkon</option>
                              <option value="french">Fransız Balkon (Minimal Korkuluklu)</option>
                              <option value="corner">Köşe Balkon</option>
                              <option value="cumba">Cumba / Kapalı Yaşam Çıkması</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. KONSOL ÇIKMA (CEPHEDE ÇIKMA OLACAK / OLMAYACAK) */}
                <div id="facade-cantilever-controls" className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-200/60">
                    <label className="text-xs font-black text-emerald-950 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(currentConfig.cantileverDepth || 0) > 0 && !currentConfig.isAdjacent && !currentConfig.isBlankWall}
                        disabled={currentConfig.isAdjacent || currentConfig.isBlankWall}
                        onChange={(e) => {
                          const depth = e.target.checked ? (params.cantileverDepth || 1.2) : 0;
                          handleUpdateFacadeConfig(safeIdx, { cantileverDepth: depth });
                          if (e.target.checked && !params.hasCantilever) {
                            onChangeParams({ ...params, hasCantilever: true });
                          }
                        }}
                        className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                      />
                      <span>📐 4. Bu Cephede Konsol Çıkma (Tabla Çıkması) Olacak mı?</span>
                    </label>

                    {(currentConfig.cantileverDepth || 0) > 0 && (
                      <span className="text-xs font-black font-mono text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        +{(currentEdge.length * (currentConfig.cantileverDepth || 1.2)).toFixed(1)} m² / Kat Katkısı
                      </span>
                    )}
                  </div>

                  {(currentConfig.cantileverDepth || 0) > 0 && !currentConfig.isAdjacent && !currentConfig.isBlankWall ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="text-[11px] font-bold text-emerald-900 block mb-1">
                          Çıkma Mesafesi (m):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0.2"
                            max="3.0"
                            value={currentConfig.cantileverDepth || 1.2}
                            onChange={(e) => {
                              const val = Math.max(0, parseFloat(e.target.value) || 0);
                              handleUpdateFacadeConfig(safeIdx, { cantileverDepth: val });
                            }}
                            className="w-24 text-xs font-black font-mono px-3 py-1.5 rounded-lg border border-emerald-300 bg-white"
                          />
                          <div className="flex items-center gap-1">
                            {[1.0, 1.2, 1.5].map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => handleUpdateFacadeConfig(safeIdx, { cantileverDepth: d })}
                                className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                  Math.abs((currentConfig.cantileverDepth || 0) - d) < 0.05
                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                    : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                                }`}
                              >
                                {d.toFixed(1)}m
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-emerald-900 bg-white/80 p-3 rounded-xl border border-emerald-200/80 flex items-center justify-between">
                        <div>
                          <div className="font-bold">Toplam Kat Kazancı:</div>
                          <div className="text-[10px] text-slate-500">{params.floorCount || 5} Katta</div>
                        </div>
                        <div className="text-sm font-black font-mono text-emerald-700">
                          +{((currentEdge.length * (currentConfig.cantileverDepth || 1.2)) * Math.max(1, (params.floorCount || 5) - 1)).toFixed(1)} m²
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">
                      Bu cephede konsol çıkma planlanmadı (Düz düşey cephe yüzeyi).
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SAĞ KOLON: 2D İNTERAKTİF GEOMETRİ TUVALİ (5 KOLON) */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
              <div className={`${bgCard} rounded-2xl p-4 border shadow-xs space-y-3`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    2D Canlı Geometri Tuvali
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    {bounds.width}m × {bounds.depth}m
                  </span>
                </div>

                <InteractiveFootprintCanvas
                  points={params.polygonPoints}
                  onChangePoints={(newPoints) => {
                    const newBounds = getPolygonBounds(newPoints);
                    const syncedConfigs = generateFacadeConfigs(newPoints, params.facadeConfigs, mainEntranceIndex);
                    const syncedCustom = syncPolygonToCustomFacades(newPoints, params.customFacades, syncedConfigs, mainEntranceIndex);
                    onChangeParams({
                      ...params,
                      polygonPoints: newPoints,
                      facadeWidth: Math.round(newBounds.width * 10) / 10,
                      facadeDepth: Math.round(newBounds.depth * 10) / 10,
                      facadeConfigs: syncedConfigs,
                      customFacades: syncedCustom,
                    });
                  }}
                  facadeConfigs={params.facadeConfigs}
                  onChangeFacadeConfigs={(configs) => onChangeParams({ ...params, facadeConfigs: configs })}
                  mainEntranceIndex={mainEntranceIndex}
                  onChangeMainEntranceIndex={handleSetMainEntrance}
                  flatsPerFloor={params.flatsPerFloor || 2}
                  theme={theme}
                  compact
                  selectedEdgeIndex={safeIdx}
                  onSelectEdgeIndex={(idx) => {
                    if (idx !== null) setSelectedFacadeIdx(idx);
                  }}
                  roads={params.roads}
                  onChangeRoads={(roads) => onChangeParams({ ...params, roads })}
                />

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800">💡 İpucu:</div>
                  <div>Tuvaldeki herhangi bir kenara veya köşeye tıklayarak da doğrudan o cephenin özelliklerini açabilirsiniz.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TÜM CEPHELER KART LİSTESİ (GRİD GÖRÜNÜMÜ) */}
      {/* ========================================================================= */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
          {facadeConfigs.map((cfg, idx) => {
            const edge = edges[idx];
            const isEntrance = idx === mainEntranceIndex;
            const road = roads.find((r) => r.facadeIndex === idx);
            const isBlind = cfg.isBlankWall || cfg.isAdjacent || cfg.windowCountPerFloor === 0;
            const hasCant = (cfg.cantileverDepth || 0) > 0 && !isBlind;

            return (
              <div
                key={cfg.id || idx}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                  isEntrance
                    ? 'bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-200'
                    : isBlind
                    ? 'bg-slate-50/90 border-slate-300'
                    : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-black text-slate-900 truncate">
                      {cfg.name}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {edge?.length || cfg.length}m
                  </span>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-1 text-[10px]">
                  {isEntrance && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                      🚪 Ana Bina Girişi
                    </span>
                  )}
                  {road ? (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold">
                      🛣️ {road.name || 'Yol Cephesi'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold">
                      🌳 Bahçe Cephesi
                    </span>
                  )}
                  {isBlind && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">
                      🧱 Kör / Bitişik
                    </span>
                  )}
                  {hasCant && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono font-bold">
                      +{cfg.cantileverDepth}m Çıkma
                    </span>
                  )}
                </div>

                {/* Controls Grid */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Pencereler:</span>
                    <span className="font-bold text-slate-800">
                      {cfg.windowCountPerFloor > 0 ? `${cfg.windowCountPerFloor} Adet / Kat` : 'Yok (Kör)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Balkon:</span>
                    <span className="font-bold text-slate-800">
                      {cfg.hasBalcony ? `${cfg.balconyCountPerFloor || 1} Adet` : 'Yok'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Konsol Çıkma:</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {hasCant ? `+${cfg.cantileverDepth}m (+${((edge?.length || cfg.length) * (cfg.cantileverDepth || 0)).toFixed(1)} m²)` : 'Yok'}
                    </span>
                  </div>
                </div>

                {/* Quick Action Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFacadeIdx(idx);
                    setViewMode('interactive');
                  }}
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 mt-1"
                >
                  <span>Detayları Düzenle</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
