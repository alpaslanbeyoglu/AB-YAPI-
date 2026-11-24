import { FACADE_ACCENTS, GROUND_FACADE_OPTIONS, FACADE_WINDOW_PROFILES, getFacadeSceneOptions, getNeighborBuildingCount, getNeighborFloorCount, MAX_NEIGHBOR_BUILDINGS, type FacadeSceneOptions } from '../utils/facadeSceneOptions';
import { useState } from 'react';
import { ChevronDown, ChevronUp, DoorOpen, Layers, LayoutGrid, Navigation, Plus, Ruler, Sparkles, Trash2 } from 'lucide-react';
import type { BuildingModelParams, CustomFacadeSide, FacadeDetailConfig, RoadConfig, RoadType } from '../types';
import { generateFacadeConfigs, getDefaultCustomFacades, getPolygonEdges, resolveThreeBuildingFootprint, syncPolygonToCustomFacades } from '../utils/footprintUtils';

const ROAD_TYPES_DATA: { id: RoadType; label: string; width: number; color: string }[] = [
  { id: 'street', label: 'Sokak', width: 7, color: '#64748b' },
  { id: 'road', label: 'Yol', width: 12, color: '#475569' },
  { id: 'avenue', label: 'Cadde', width: 20, color: '#334155' },
  { id: 'highway', label: 'Bulvar / Anayol', width: 35, color: '#1e293b' },
];

export function ArchitecturalModelDetails({ modelParams, updateParams, compact = false, selectedFacadeIndex, onSelectFacade }: {
  modelParams: BuildingModelParams;
  compact?: boolean;
  selectedFacadeIndex?: number;
  onSelectFacade?: (index: number) => void;
  updateParams: (updates: Partial<BuildingModelParams>) => void;
}) {
  const [collapsedSections, setCollapsedSections] = useState({ dimensions: !compact, entranceCore: true });
  const toggleSection = (section: keyof typeof collapsedSections) =>
    setCollapsedSections(previous => ({ ...previous, [section]: !previous[section] }));
  const cardBg = 'bg-white border-slate-200';
  const inputBg = 'bg-white border-slate-300 text-slate-900';
  const textTitle = 'text-slate-900';
  return (
        <div className="grid grid-cols-1 gap-3 items-start">
            {/* Card 1: Facade & Building Dimensions (Expanded Horizontally - Full Width) */}
            <div className={`col-span-full border rounded-3xl overflow-hidden ${cardBg}`}>
              <button
                type="button"
                aria-expanded={!collapsedSections.dimensions}
                onClick={() => toggleSection('dimensions')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-indigo-600" />
                  <span className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                    Cephe, pencere ve balkon
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  {collapsedSections.dimensions ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </button>

              {!collapsedSections.dimensions && (() => {
                const { activePolyPts } = resolveThreeBuildingFootprint(modelParams);
                const polygonEdges = activePolyPts ? getPolygonEdges(activePolyPts) : [];

                const facadeItems = polygonEdges.length > 0
                  ? polygonEdges.map((edge, idx) => ({
                      id: idx + 1,
                      key: `edge_${idx}`,
                      label: idx === 0 ? '1. Ön Cephe (Yol/Giriş)'
                        : idx === 1 ? '2. Sağ Yan Cephe'
                        : idx === 2 && polygonEdges.length === 4 ? '3. Arka Cephe (Bahçe)'
                        : idx === 3 && polygonEdges.length === 4 ? '4. Sol Yan Cephe'
                        : `${idx + 1}. Kırık Cephe`,
                      value: edge.length,
                      isMain: idx === (modelParams.mainEntranceFacadeIndex || 0),
                    }))
                  : [
                      { id: 1, key: 'front', label: '1. Ön Cephe (Yol/Giriş)', value: modelParams.facadeWidth, isMain: (modelParams.mainEntranceFacadeIndex || 0) === 0 },
                      { id: 2, key: 'right', label: '2. Sağ Yan Cephe', value: modelParams.facadeDepth, isMain: (modelParams.mainEntranceFacadeIndex || 0) === 1 },
                      { id: 3, key: 'back', label: '3. Arka Cephe (Bahçe)', value: modelParams.backFacadeLength !== undefined ? modelParams.backFacadeLength : modelParams.facadeWidth, isMain: (modelParams.mainEntranceFacadeIndex || 0) === 2 },
                      { id: 4, key: 'left', label: '4. Sol Yan Cephe', value: modelParams.leftFacadeLength !== undefined ? modelParams.leftFacadeLength : modelParams.facadeDepth, isMain: (modelParams.mainEntranceFacadeIndex || 0) === 3 },
                    ];

                const activeCfgs = generateFacadeConfigs(
                  activePolyPts ?? 4,
                  modelParams.facadeConfigs,
                  modelParams.mainEntranceFacadeIndex || 0
                );

                const currentDefaultCantilever = modelParams.cantileverDepth || 1.2;

                const updateFacadeDetail = (fIdx: number, updates: Partial<FacadeDetailConfig> & FacadeSceneOptions) => {
                  const newCfgs = [...activeCfgs];
                  const currentCfg: FacadeDetailConfig = newCfgs[fIdx] || {
                    id: fIdx + 1,
                    name: facadeItems[fIdx]?.label || `${fIdx + 1}. Cephe`,
                    length: facadeItems[fIdx]?.value || 10,
                    windowCountPerFloor: fIdx === 0 ? 3 : 2,
                    hasBalcony: fIdx === 0,
                    balconyCountPerFloor: fIdx === 0 ? 1 : 0,
                    balconyType: 'standard',
                    isEntrance: fIdx === (modelParams.mainEntranceFacadeIndex || 0),
                    isAdjacent: false,
                    isBlankWall: false,
                    cantileverDepth: currentDefaultCantilever,
                  };
                  
                  const isNowAdjacent = updates.isAdjacent !== undefined ? updates.isAdjacent : (currentCfg.isAdjacent ?? false);

                  newCfgs[fIdx] = {
                    ...currentCfg,
                    ...updates,
                    ...(isNowAdjacent ? {
                      isAdjacent: true,
                      isBlankWall: true,
                      windowCountPerFloor: 0,
                      hasBalcony: false,
                      balconyCountPerFloor: 0,
                      cantileverDepth: 0,
                    } : {}),
                  };

                  if (updates.isEntrance) {
                    newCfgs.forEach((c, i) => {
                      if (i !== fIdx) newCfgs[i] = { ...c, isEntrance: false };
                    });
                  }

                  let customList: CustomFacadeSide[] = [];
                  if (modelParams.footprintInputMode === 'polygonDraw' && modelParams.polygonPoints && modelParams.polygonPoints.length >= 3) {
                    customList = syncPolygonToCustomFacades(
                      modelParams.polygonPoints,
                      modelParams.customFacades,
                      newCfgs,
                      updates.isEntrance ? fIdx : (modelParams.mainEntranceFacadeIndex || 0)
                    );
                  } else {
                    customList = [...(modelParams.customFacades || getDefaultCustomFacades(4, modelParams.facadeWidth, modelParams.facadeDepth, modelParams.backFacadeLength, modelParams.leftFacadeLength))];
                    if (customList[fIdx]) {
                      customList[fIdx] = {
                        ...customList[fIdx],
                        windowCountPerFloor: newCfgs[fIdx].windowCountPerFloor,
                        hasBalcony: newCfgs[fIdx].hasBalcony,
                        balconyCountPerFloor: newCfgs[fIdx].balconyCountPerFloor,
                        balconyType: newCfgs[fIdx].balconyType,
                        isEntrance: newCfgs[fIdx].isEntrance,
                        isAdjacent: newCfgs[fIdx].isAdjacent,
                        isBlankWall: newCfgs[fIdx].isBlankWall,
                        cantileverDepth: newCfgs[fIdx].cantileverDepth,
                      };
                    }
                  }

                  // Synchronize cantilever array
                  const nextCantilevers = [...(modelParams.facadeCantilevers || Array(newCfgs.length).fill(currentDefaultCantilever))];
                  while (nextCantilevers.length < newCfgs.length) {
                    nextCantilevers.push(currentDefaultCantilever);
                  }
                  if (updates.cantileverDepth !== undefined) {
                    nextCantilevers[fIdx] = updates.cantileverDepth;
                  } else if (isNowAdjacent) {
                    nextCantilevers[fIdx] = 0;
                  }

                  // If facade is made adjacent, remove any road attached to it
                  let updatedRoads = modelParams.roads;
                  if (isNowAdjacent && modelParams.roads) {
                    updatedRoads = modelParams.roads.filter(r => r.facadeIndex !== fIdx);
                  }

                  updateParams({
                    facadeConfigs: newCfgs,
                    customFacades: customList,
                    facadeCantilevers: nextCantilevers,
                    ...(updatedRoads !== undefined ? { roads: updatedRoads } : {}),
                    ...(updates.isEntrance ? { mainEntranceFacadeIndex: fIdx } : {}),
                  });
                };

                const toggleRoadOnFacade = (fIdx: number) => {
                  const currentRoads = modelParams.roads || [];
                  const exists = currentRoads.find(r => r.facadeIndex === fIdx);
                  let nextRoads: RoadConfig[];
                  if (exists) {
                    nextRoads = currentRoads.filter(r => r.facadeIndex !== fIdx);
                    updateParams({ roads: nextRoads });
                  } else {
                    const defaultType: RoadType = fIdx === 0 ? 'street' : 'street';
                    const typeObj = ROAD_TYPES_DATA.find(t => t.id === defaultType);
                    nextRoads = [
                      ...currentRoads,
                      {
                        id: `road-${Date.now()}-${fIdx}`,
                        facadeIndex: fIdx,
                        type: defaultType,
                        name: fIdx === 0 ? 'Ön İmar Yolu' : `${fIdx + 1}. Cephe Yolu`,
                        width: typeObj?.width || 7,
                      },
                    ];
                    // If facade was marked adjacent, open it up because it has road frontage
                    const cfg = activeCfgs[fIdx];
                    if (cfg && (cfg as any).isAdjacent) {
                      updateFacadeDetail(fIdx, {
                        isAdjacent: false,
                        isBlankWall: false,
                        windowCountPerFloor: 2,
                        hasBalcony: true,
                        balconyCountPerFloor: 1,
                        cantileverDepth: currentDefaultCantilever,
                      });
                    }
                    updateParams({ roads: nextRoads });
                  }
                };

                const updateRoadTypeOnFacade = (fIdx: number, typeId: RoadType) => {
                  const currentRoads = modelParams.roads || [];
                  const typeObj = ROAD_TYPES_DATA.find(t => t.id === typeId);
                  const nextRoads = currentRoads.map(r => {
                    if (r.facadeIndex === fIdx) {
                      return {
                        ...r,
                        type: typeId,
                        width: typeObj?.width || 7,
                      };
                    }
                    return r;
                  });
                  updateParams({ roads: nextRoads });
                };

                return (
                  <div className="p-4 pt-0">
                    {/* Unified Facade Management Matrix (Tek ve Birleşik Cephe Tablosu) */}
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {facadeItems.map((facadeItem, fIdx) => {
                          const cfg = activeCfgs[fIdx] || {
                            id: fIdx + 1,
                            name: facadeItem.label,
                            length: facadeItem.value,
                            windowCountPerFloor: fIdx === 0 ? 3 : 2,
                            hasBalcony: fIdx === 0,
                            balconyCountPerFloor: fIdx === 0 ? 1 : 0,
                            balconyType: 'standard',
                            isEntrance: fIdx === (modelParams.mainEntranceFacadeIndex || 0),
                            isAdjacent: false,
                            isBlankWall: false,
                          };

                          const isEntrance = fIdx === (modelParams.mainEntranceFacadeIndex || 0) || cfg.isEntrance === true;
                          const isAdjacent = (cfg as any).isAdjacent === true;
                          const isBlind = isAdjacent || (cfg as any).isBlankWall === true || cfg.windowCountPerFloor === 0;
                          const currentRoad = (modelParams.roads || []).find(road => road.facadeIndex === fIdx);
                          const scene = getFacadeSceneOptions(cfg);
                          const isSelectedInCanvas = selectedFacadeIndex === fIdx;

                          // Formulated Balcony Combo Key
                          let balconyCombo = 'none';
                          if (!isBlind && cfg.hasBalcony) {
                            if (cfg.balconyType === 'glass_enclosed') balconyCombo = 'glass_enclosed';
                            else if (cfg.balconyType === 'recessed') balconyCombo = 'recessed';
                            else if (cfg.balconyType === 'french') balconyCombo = 'french';
                            else if (cfg.balconyType === 'corner') balconyCombo = 'corner';
                            else if (cfg.balconyType === 'cumba') balconyCombo = 'cumba';
                            else if (cfg.balconyCountPerFloor === 2) balconyCombo = 'standard_2';
                            else balconyCombo = 'standard_1';
                          }

                          return (
                            <div
                              key={facadeItem.id}
                              onFocusCapture={() => onSelectFacade?.(fIdx)}
                              className={`p-3.5 bg-white rounded-2xl border transition-all space-y-3 shadow-2xs relative cursor-pointer ${
                                isSelectedInCanvas
                                  ? 'ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/20'
                                  : isEntrance
                                  ? 'border-emerald-500 ring-1 ring-emerald-300 bg-emerald-50/10'
                                  : isAdjacent
                                  ? 'border-slate-300 bg-slate-50/60'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {/* Facade Title & Length Header */}
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-1.5">
                                <div className="min-w-0 flex-1">
                                  <button type="button" aria-pressed={isSelectedInCanvas} onClick={() => onSelectFacade?.(fIdx)}
                                    className={`text-left text-xs font-bold truncate block ${isEntrance ? 'text-emerald-700' : textTitle}`} title={facadeItem.label}>
                                    {facadeItem.label}
                                  </button>
                                </div>
                                <span className="shrink-0 text-[11px] text-slate-600">{facadeItem.value.toFixed(1)} m</span>
                              </div>

                              {/* Bina Girişi & Bitişik Nizam Hızlı Seçim Butonları */}
                              <div className="grid grid-cols-2 gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  disabled={isAdjacent}
                                  onClick={() => updateFacadeDetail(fIdx, { isEntrance: true })}
                                  className={`py-1 px-1.5 text-[10px] font-bold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                                    isEntrance
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  <DoorOpen className="w-3 h-3" />
                                  <span>{isEntrance ? 'Ana Giriş ✓' : 'Giriş Yap'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextAdj = !isAdjacent;
                                    updateFacadeDetail(fIdx, {
                                      neighborBuildingCount: nextAdj ? scene.neighborBuildingCount ?? 1 : scene.neighborBuildingCount,
                                      isAdjacent: nextAdj,
                                      isBlankWall: nextAdj,
                                      windowCountPerFloor: nextAdj ? 0 : 2,
                                      hasBalcony: !nextAdj,
                                      balconyCountPerFloor: nextAdj ? 0 : 1,
                                      cantileverDepth: nextAdj ? 0 : currentDefaultCantilever,
                                    });
                                  }}
                                  className={`py-1 px-1.5 text-[10px] font-bold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                                    isAdjacent
                                      ? 'bg-rose-100 text-rose-800 border-rose-300 font-black'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                  title="Komşu parsele bitişik / yangın duvarı (İmar gereği pencere ve çıkma yapılamaz)"
                                >
                                  <span>{isAdjacent ? '🧱 Bitişik Kör' : 'Açık Cephe'}</span>
                                </button>
                              </div>

                              {/* İmar Yolu Ekleme / Yönetimi */}
                              <div className="pt-1 border-t border-slate-100/80" onClick={(e) => e.stopPropagation()}>
                                {isAdjacent ? (
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 py-1 px-2 bg-slate-50 border border-slate-200/70 rounded-lg">
                                    <span className="flex items-center gap-1">
                                      <Navigation className="w-3 h-3 text-slate-400" />
                                      <span>Yol Durumu:</span>
                                    </span>
                                    <span className="font-semibold text-slate-400 italic">Bitişik Kör</span>
                                  </div>
                                ) : currentRoad ? (
                                  <div className="flex items-center justify-between gap-1 p-1 bg-amber-50/80 border border-amber-300 rounded-lg shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() => toggleRoadOnFacade(fIdx)}
                                      className="flex items-center gap-1 text-[10px] font-bold text-amber-950 hover:text-rose-600 transition-colors shrink-0 pl-0.5"
                                      title="Yolu Kaldır"
                                    >
                                      <Navigation className="w-3 h-3 text-amber-600" />
                                      <span>Yol:</span>
                                      <Trash2 className="w-2.5 h-2.5 text-slate-400 hover:text-rose-600 ml-0.5" />
                                    </button>
                                    <select
                                      value={currentRoad.type}
                                      onChange={(e) => updateRoadTypeOnFacade(fIdx, e.target.value as RoadType)}
                                      className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-white border border-amber-300 text-amber-900 focus:outline-none"
                                    >
                                      {ROAD_TYPES_DATA.map((t) => (
                                        <option key={t.id} value={t.id}>
                                          {t.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => toggleRoadOnFacade(fIdx)}
                                    className="w-full py-1 px-2 text-[10px] font-bold rounded-lg border border-dashed border-amber-300 hover:border-amber-400 bg-amber-50/40 hover:bg-amber-50 text-amber-900 transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3 text-amber-600" />
                                    <span>🛣️ Bu Cepheye Yol Ekle</span>
                                  </button>
                                )}
                              </div>

                              {isAdjacent ? (
                                <div className="space-y-2">
                                  <label className="flex items-center justify-between gap-2 text-xs">
                                    Komşu bina adedi
                                    <input type="number" min={0} max={MAX_NEIGHBOR_BUILDINGS} step={1}
                                      value={getNeighborBuildingCount(scene.neighborBuildingCount)}
                                      onChange={event => updateFacadeDetail(fIdx, {
                                        neighborBuildingCount: getNeighborBuildingCount(event.currentTarget.valueAsNumber),
                                      })}
                                      className="w-16 rounded-md border border-slate-300 px-2 py-1" />
                                  </label>
                                  {getNeighborBuildingCount(scene.neighborBuildingCount) > 0 && (
                                    <details className="rounded-md border border-slate-200 p-2">
                                      <summary className="cursor-pointer text-xs font-semibold">Komşu bina yükseklikleri</summary>
                                      <div className="mt-2 space-y-1.5">
                                        {Array.from({ length: getNeighborBuildingCount(scene.neighborBuildingCount) }, (_, index) => (
                                          <label key={index} className="flex items-center justify-between gap-2 text-xs">
                                            {index + 1}. bina · kat sayısı
                                            <input type="number" min={1} max={30} step={1}
                                              value={getNeighborFloorCount(scene.neighborFloorCounts?.[index], modelParams.floorCount)}
                                              onChange={event => {
                                                if (!Number.isFinite(event.currentTarget.valueAsNumber)) return;
                                                const neighborFloorCounts = Array.from({ length: Math.max(index + 1, scene.neighborFloorCounts?.length ?? 0) },
                                                  (_, i) => getNeighborFloorCount(scene.neighborFloorCounts?.[i], modelParams.floorCount));
                                                neighborFloorCounts[index] = getNeighborFloorCount(event.currentTarget.valueAsNumber);
                                                updateFacadeDetail(fIdx, { neighborFloorCounts });
                                              }}
                                              className="w-16 rounded-md border border-slate-300 px-2 py-1" />
                                          </label>
                                        ))}
                                      </div>
                                    </details>
                                  )}
                                </div>
                              ) : !currentRoad && (
                                <label className="flex items-center gap-2 text-xs">
                                  <input type="checkbox" checked={!!scene.showGarden}
                                    onChange={event => updateFacadeDetail(fIdx, { showGarden: event.currentTarget.checked })} />
                                  Bahçeyi göster
                                </label>
                              )}

                              {/* Pencere & Balkon Seçimi */}
                              <div className="space-y-2 pt-1 border-t border-slate-100/80" onClick={(e) => e.stopPropagation()}>
                                {/* Pencereler */}
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-600 font-medium">Pencereler:</span>
                                  <select
                                    disabled={isAdjacent}
                                    value={isAdjacent ? 0 : cfg.windowCountPerFloor}
                                    onChange={(e) => {
                                      const wCount = parseInt(e.target.value, 10);
                                      updateFacadeDetail(fIdx, {
                                        windowCountPerFloor: wCount,
                                        isBlankWall: wCount === 0,
                                      });
                                    }}
                                    className={`w-28 px-1.5 py-0.5 text-xs font-semibold rounded-md border ${
                                      isAdjacent ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : inputBg
                                    }`}
                                  >
                                    <option value={0}>0 (Penceresiz)</option>
                                    <option value={1}>1 Pencere</option>
                                    <option value={2}>2 Pencere</option>
                                    <option value={3}>3 Pencere</option>
                                    <option value={4}>4 Pencere</option>
                                    <option value={5}>5 Pencere</option>
                                    <option value={6}>6 Pencere</option>
                                  </select>
                                </div>

                                {!isBlind && (
                                  <label className="flex items-center justify-between gap-2 text-xs">
                                    Pencere tipi
                                    <select className="w-28 rounded-md border border-slate-300 px-1.5 py-1"
                                      value={scene.windowProfile ?? 'standard'}
                                      onChange={event => updateFacadeDetail(fIdx, {
                                        windowProfile: event.currentTarget.value as FacadeSceneOptions['windowProfile'],
                                      })}>
                                      {Object.entries(FACADE_WINDOW_PROFILES).map(([key, profile]) => (
                                        <option key={key} value={key}>{profile.label}</option>
                                      ))}
                                    </select>
                                  </label>
                                )}

                                {!isAdjacent && !isEntrance && !modelParams.hasGroundFloorShop && (
                                  <label className="flex items-center justify-between gap-2 text-xs">
                                    Zemin kat
                                    <select className="w-28 rounded-md border border-slate-300 px-1.5 py-1"
                                      value={scene.groundFacade ?? 'project'}
                                      onChange={event => updateFacadeDetail(fIdx, {
                                        groundFacade: event.currentTarget.value as FacadeSceneOptions['groundFacade'],
                                      })}>
                                      {Object.entries(GROUND_FACADE_OPTIONS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                      ))}
                                    </select>
                                  </label>
                                )}
                                {!isAdjacent && (
                                  <label className="flex items-center justify-between gap-2 text-xs">
                                    Kat silmesi
                                    <select className="w-28 rounded-md border border-slate-300 px-1.5 py-1"
                                      value={scene.accentBand ?? ''}
                                      onChange={event => updateFacadeDetail(fIdx, {
                                        accentBand: event.currentTarget.value as FacadeSceneOptions['accentBand'],
                                      })}>
                                      <option value="">Varsayılan</option>
                                      {Object.entries(FACADE_ACCENTS).map(([key, accent]) => (
                                        <option key={key} value={key}>{accent.label}</option>
                                      ))}
                                    </select>
                                  </label>
                                )}

                                {/* Balkonlar */}
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-600 font-medium">Balkon:</span>
                                  <select
                                    disabled={isBlind}
                                    value={isBlind ? 'none' : balconyCombo}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === 'none') {
                                        updateFacadeDetail(fIdx, { hasBalcony: false, balconyCountPerFloor: 0 });
                                      } else if (val === 'standard_1') {
                                        updateFacadeDetail(fIdx, { hasBalcony: true, balconyCountPerFloor: 1, balconyType: 'standard' });
                                      } else if (val === 'standard_2') {
                                        updateFacadeDetail(fIdx, { hasBalcony: true, balconyCountPerFloor: 2, balconyType: 'standard' });
                                      } else if (val === 'glass_enclosed') {
                                        updateFacadeDetail(fIdx, { hasBalcony: true, balconyCountPerFloor: 1, balconyType: 'glass_enclosed' });
                                      } else if (val === 'recessed') {
                                        updateFacadeDetail(fIdx, { hasBalcony: true, balconyCountPerFloor: 1, balconyType: 'recessed' });
                                      } else if (val === 'french') {
                                        updateFacadeDetail(fIdx, { hasBalcony: true, balconyCountPerFloor: 1, balconyType: 'french' });
                                      } else if (val === 'corner') {
                                        updateFacadeDetail(fIdx, { hasBalcony: true, balconyCountPerFloor: 1, balconyType: 'corner' });
                                      } else if (val === 'cumba') {
                                        updateFacadeDetail(fIdx, { hasBalcony: true, balconyCountPerFloor: 1, balconyType: 'cumba' });
                                      }
                                    }}
                                    className={`w-28 px-1.5 py-0.5 text-xs font-semibold rounded-md border ${
                                      isBlind ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : inputBg
                                    }`}
                                  >
                                    <option value="none">Balkonsuz</option>
                                    <option value="standard_1">1 Açık Balkon</option>
                                    <option value="standard_2">2 Açık Balkon</option>
                                    <option value="glass_enclosed">Katlanır Cam Balkon</option>
                                    <option value="recessed">Gömme Lojya</option>
                                    <option value="french">Fransız Balkon</option>
                                    <option value="corner">Köşe Balkon</option>
                                    <option value="cumba">Cumba (Kapalı)</option>
                                  </select>
                                </div>

                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* CARD 2.8: ENTRANCE, LOBBY & STAIRCASE LANDING (BİNA GİRİŞİ, GİRİŞ HOLÜ & SAHANLIKLAR) */}
            <div className={`border rounded-3xl overflow-hidden ${cardBg}`}>
              <button
                type="button"
                aria-expanded={!collapsedSections.entranceCore}
                onClick={() => toggleSection('entranceCore')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <DoorOpen className="w-4 h-4 text-emerald-600" />
                  <span className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                    2.8 Bina Girişi, Hol & Sahanlık
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span>Giriş & Çekirdek Ölçüleri</span>
                  {collapsedSections.entranceCore ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </button>

              {!collapsedSections.entranceCore && (
                <div className="p-5 pt-0 space-y-5 border-t border-slate-100">
                  {/* Subsection 1: Bina Giriş Kapısı ve Konumu */}
                  <div className="space-y-3 pt-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <DoorOpen className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Bina Ana Girişi & Cephe Konumu</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Girişin Cephedeki Konumu / Kaydırma */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Cephedeki Konumu (Ofset)</span>
                          <span className="font-mono text-emerald-700 font-bold">
                            {(modelParams.entranceOffset ?? 0) === 0 ? 'Merkez (0.0 m)' : `${(modelParams.entranceOffset ?? 0) > 0 ? '+' : ''}${(modelParams.entranceOffset ?? 0).toFixed(2)} m`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="-5"
                            max="5"
                            step="0.2"
                            value={modelParams.entranceOffset ?? 0}
                            onChange={(e) => updateParams({ entranceOffset: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={modelParams.entranceOffset ?? 0}
                            onChange={(e) => updateParams({ entranceOffset: parseFloat(e.target.value) || 0 })}
                            className={`w-16 p-1.5 rounded-lg border text-xs text-center font-mono ${inputBg}`}
                          />
                        </div>
                      </div>

                      {/* Giriş Kapı Genişliği */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Kapı Genişliği</span>
                          <span className="font-mono text-emerald-700 font-bold">
                            {(modelParams.entranceDoorWidth ?? 2.2).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="1.2"
                          max="4.5"
                          step="0.1"
                          value={modelParams.entranceDoorWidth ?? 2.2}
                          onChange={(e) => updateParams({ entranceDoorWidth: parseFloat(e.target.value) || 2.2 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>

                      {/* Giriş Kapı Yüksekliği */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Kapı Yüksekliği</span>
                          <span className="font-mono text-emerald-700 font-bold">
                            {(modelParams.entranceDoorHeight ?? 2.4).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="2.1"
                          max="3.5"
                          step="0.05"
                          value={modelParams.entranceDoorHeight ?? 2.4}
                          onChange={(e) => updateParams({ entranceDoorHeight: parseFloat(e.target.value) || 2.4 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>

                      {/* Giriş Saçağı / Markiz Derinliği */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Giriş Saçağı / Markiz</span>
                          <span className="font-mono text-emerald-700 font-bold">
                            {(modelParams.entranceCanopyDepth ?? 1.2).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="0.5"
                          max="3.0"
                          step="0.1"
                          value={modelParams.entranceCanopyDepth ?? 1.2}
                          onChange={(e) => updateParams({ entranceCanopyDepth: parseFloat(e.target.value) || 1.2 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>

                      {/* Giriş Basamak Sayısı */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Giriş Basamak Sayısı</span>
                          <span className="font-mono text-emerald-700 font-bold">
                            {modelParams.entranceStepsCount ?? 3} Adet
                          </span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="8"
                          step="1"
                          value={modelParams.entranceStepsCount ?? 3}
                          onChange={(e) => updateParams({ entranceStepsCount: parseInt(e.target.value) || 0 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Subsection 2: Giriş Holü & Rüzgarlık (Lobi) */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Giriş Holü & Rüzgarlık (Lobi Boyutları)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Giriş Holü Genişliği</span>
                          <span className="font-mono text-indigo-700 font-bold">
                            {(modelParams.entranceLobbyWidth ?? 3.2).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="1.8"
                          max="8.0"
                          step="0.2"
                          value={modelParams.entranceLobbyWidth ?? 3.2}
                          onChange={(e) => updateParams({ entranceLobbyWidth: parseFloat(e.target.value) || 3.2 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Giriş Holü Derinliği</span>
                          <span className="font-mono text-indigo-700 font-bold">
                            {(modelParams.entranceLobbyDepth ?? 4.0).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="2.0"
                          max="10.0"
                          step="0.2"
                          value={modelParams.entranceLobbyDepth ?? 4.0}
                          onChange={(e) => updateParams({ entranceLobbyDepth: parseFloat(e.target.value) || 4.0 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Subsection 3: Merdiven Sahanlığı & Çekirdek */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Layers className="w-3.5 h-3.5 text-sky-600" />
                      <span>Merdiven Kovası & Kat Sahanlığı</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Sahanlık Genişliği</span>
                          <span className="font-mono text-sky-700 font-bold">
                            {(modelParams.staircaseLandingWidth ?? 2.6).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="1.5"
                          max="5.0"
                          step="0.1"
                          value={modelParams.staircaseLandingWidth ?? 2.6}
                          onChange={(e) => updateParams({ staircaseLandingWidth: parseFloat(e.target.value) || 2.6 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Sahanlık Derinliği</span>
                          <span className="font-mono text-sky-700 font-bold">
                            {(modelParams.staircaseLandingDepth ?? 1.4).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="1.0"
                          max="3.0"
                          step="0.1"
                          value={modelParams.staircaseLandingDepth ?? 1.4}
                          onChange={(e) => updateParams({ staircaseLandingDepth: parseFloat(e.target.value) || 1.4 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Merdiven Kovası Genişliği</span>
                          <span className="font-mono text-sky-700 font-bold">
                            {(modelParams.stairWidth ?? 2.6).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="1.8"
                          max="5.0"
                          step="0.1"
                          value={modelParams.stairWidth ?? 2.6}
                          onChange={(e) => updateParams({ stairWidth: parseFloat(e.target.value) || 2.6 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Merdiven Kovası Derinliği</span>
                          <span className="font-mono text-sky-700 font-bold">
                            {(modelParams.stairDepth ?? 4.8).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="3.0"
                          max="8.0"
                          step="0.1"
                          value={modelParams.stairDepth ?? 4.8}
                          onChange={(e) => updateParams({ stairDepth: parseFloat(e.target.value) || 4.8 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Subsection 4: Asansör Kuyusu & Sayısı */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Asansör kuyusu ölçüleri</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Asansör Genişliği</span>
                          <span className="font-mono text-purple-700 font-bold">
                            {(modelParams.elevatorWidth ?? 1.8).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="1.2"
                          max="3.0"
                          step="0.1"
                          value={modelParams.elevatorWidth ?? 1.8}
                          onChange={(e) => updateParams({ elevatorWidth: parseFloat(e.target.value) || 1.8 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Asansör Derinliği</span>
                          <span className="font-mono text-purple-700 font-bold">
                            {(modelParams.elevatorDepth ?? 2.0).toFixed(2)} m
                          </span>
                        </div>
                        <input
                          type="number"
                          min="1.2"
                          max="3.0"
                          step="0.1"
                          value={modelParams.elevatorDepth ?? 2.0}
                          onChange={(e) => updateParams({ elevatorDepth: parseFloat(e.target.value) || 2.0 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono ${inputBg}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
  );
}
