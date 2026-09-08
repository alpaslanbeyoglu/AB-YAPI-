import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MousePointer,
  Move,
  Plus,
  Trash2,
  RotateCcw,
  RotateCw,
  Maximize2,
  Grid,
  CheckCircle2,
  Layers,
  Sparkles,
  Compass,
  DoorOpen,
  Home,
  Sliders,
  Eye,
  Info,
  ZoomIn,
  ZoomOut,
  Navigation,
  CornerDownRight,
  Ruler,
  Split,
  Crosshair,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Car,
  Building2,
  Check,
} from 'lucide-react';
import {
  PolygonPoint,
  FacadeDetailConfig,
  AppTheme,
  RoadConfig,
  RoadType,
} from '../types';
import {
  POLYGON_PRESETS,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  getPolygonEdges,
  getPolygonBounds,
  generateFacadeConfigs,
  normalizePolygonAndAlignToGrid,
  validatePolygonFootprint,
  isPointInPolygon,
  getPolygonCentroid,
} from '../utils/footprintUtils';

export interface InteractiveFootprintCanvasProps {
  points?: PolygonPoint[];
  onChangePoints: (newPoints: PolygonPoint[]) => void;
  facadeConfigs?: FacadeDetailConfig[];
  onChangeFacadeConfigs?: (configs: FacadeDetailConfig[]) => void;
  mainEntranceIndex?: number;
  onChangeMainEntranceIndex?: (index: number) => void;
  flatsPerFloor?: number;
  theme?: AppTheme;
  compact?: boolean;
  selectedEdgeIndex?: number | null;
  onSelectEdgeIndex?: (index: number | null) => void;
  // Enhanced features requested by user:
  roads?: RoadConfig[];
  onChangeRoads?: (roads: RoadConfig[]) => void;
  stairWidth?: number;
  stairDepth?: number;
  elevatorWidth?: number;
  elevatorDepth?: number;
  elevatorCount?: number;
  coreOffsetX?: number;
  coreOffsetY?: number;
  corePositionPreset?: 'center' | 'entrance' | 'rear' | 'left' | 'right' | 'custom';
  onChangeCoreParams?: (params: {
    stairWidth?: number;
    stairDepth?: number;
    elevatorWidth?: number;
    elevatorDepth?: number;
    elevatorCount?: number;
    coreOffsetX?: number;
    coreOffsetY?: number;
    corePositionPreset?: 'center' | 'entrance' | 'rear' | 'left' | 'right' | 'custom';
  }) => void;
}

export type CanvasToolMode = 'select' | 'addPoint' | 'pan';

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
  selectedEdgeIndex: propSelectedEdgeIndex,
  onSelectEdgeIndex,
  roads = [],
  onChangeRoads,
  stairWidth = 2.6,
  stairDepth = 4.8,
  elevatorWidth = 1.8,
  elevatorDepth = 2.0,
  elevatorCount = 1,
  coreOffsetX = 0,
  coreOffsetY = 0,
  corePositionPreset = 'center',
  onChangeCoreParams,
}) => {
  const points = (propPoints && propPoints.length >= 3) ? propPoints : POLYGON_PRESETS.rectangle.points;
  const isGray = theme === 'gray';

  const svgRef = useRef<SVGSVGElement>(null);

  // Tool Modes: 'select' (default - points NEVER jump or add accidentally), 'addPoint' (only when clicked explicitly), 'pan'
  const [toolMode, setToolMode] = useState<CanvasToolMode>('select');

  // Active selections
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [internalSelectedEdgeIndex, setInternalSelectedEdgeIndex] = useState<number | null>(0);
  const selectedEdgeIndex = propSelectedEdgeIndex !== undefined ? propSelectedEdgeIndex : internalSelectedEdgeIndex;
  const setSelectedEdgeIndex = (idx: number | null) => {
    setInternalSelectedEdgeIndex(idx);
    if (onSelectEdgeIndex) {
      onSelectEdgeIndex(idx);
    }
  };

  // Dragging state
  const [isDraggingPoint, setIsDraggingPoint] = useState<boolean>(false);
  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);
  const [isDraggingCore, setIsDraggingCore] = useState<boolean>(false);
  const coreDragStartRef = useRef<{ mouseX: number; mouseY: number; initialOffsetX: number; initialOffsetY: number }>({
    mouseX: 0,
    mouseY: 0,
    initialOffsetX: 0,
    initialOffsetY: 0,
  });

  // History for Undo / Redo
  const [history, setHistory] = useState<PolygonPoint[][]>([points]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Push to history helper
  const commitPointsWithHistory = useCallback((newPts: PolygonPoint[]) => {
    setHistory(prev => {
      const next = prev.slice(0, historyIndex + 1);
      return [...next, newPts];
    });
    setHistoryIndex(prev => prev + 1);
    onChangePoints(newPts);
  }, [historyIndex, onChangePoints]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      onChangePoints(history[newIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      onChangePoints(history[newIdx]);
    }
  };

  // Snapping & Grid settings
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [gridStep, setGridStep] = useState<number>(0.5); // 0.5m default grid step

  // Zoom & Pan State
  const [zoom, setZoom] = useState<number>(1.0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0,
  });

  // Flag to differentiate a genuine click from a pan drag release
  const hasMovedRef = useRef<boolean>(false);

  // Canvas coordinate system parameters: -18m to +18m
  const viewBoxSize = 36;
  const halfSize = viewBoxSize / 2;

  // Real-time geometric calculations & validation
  const area = calculatePolygonArea(points);
  const perimeter = calculatePolygonPerimeter(points);
  const edges = getPolygonEdges(points);
  const bounds = getPolygonBounds(points);
  const centroid = getPolygonCentroid(points);
  const validation = validatePolygonFootprint(points, gridStep);

  // Active feature tab in sidebar
  const [activeTab, setActiveTab] = useState<'edges' | 'core'>('edges');

  // Sync facade configurations when edges change
  const currentFacadeConfigs = generateFacadeConfigs(points, facadeConfigs, mainEntranceIndex);

  // Helper to extract mouse/touch client coords safely
  const getClientCoords = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e) {
      if (e.touches && e.touches.length > 0) {
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
      }
      if ('changedTouches' in e && e.changedTouches && e.changedTouches.length > 0) {
        return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
      }
    }
    return { clientX: (e as any).clientX, clientY: (e as any).clientY };
  };

  // Convert client screen coordinates to meters in polygon world space
  const screenToMeters = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      if (!svgRef.current) return null;
      const rect = svgRef.current.getBoundingClientRect();
      const normX = (clientX - rect.left) / rect.width;
      const normY = (clientY - rect.top) / rect.height;

      const baseSvgX = normX * viewBoxSize - halfSize;
      const baseSvgY = normY * viewBoxSize - halfSize;

      let meterX = (baseSvgX - panX) / zoom;
      let meterY = (baseSvgY - panY) / zoom;

      if (snapToGrid) {
        meterX = Math.round(meterX / gridStep) * gridStep;
        meterY = Math.round(meterY / gridStep) * gridStep;
      }

      return {
        x: Math.round(meterX * 100) / 100,
        y: Math.round(meterY * 100) / 100,
      };
    },
    [snapToGrid, gridStep, viewBoxSize, halfSize, zoom, panX, panY]
  );

  // Wheel zoom centered on cursor
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomIntensity = 0.08;
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const normX = mouseX / rect.width;
      const normY = mouseY / rect.height;

      const baseSvgX = normX * viewBoxSize - halfSize;
      const baseSvgY = normY * viewBoxSize - halfSize;

      const oldZoom = zoom;
      const wheel = e.deltaY < 0 ? 1 : -1;
      const newZoom = Math.max(0.6, Math.min(5.0, zoom + wheel * zoomIntensity));

      setPanX(prev => baseSvgX - (baseSvgX - prev) * (newZoom / oldZoom));
      setPanY(prev => baseSvgY - (baseSvgY - prev) * (newZoom / oldZoom));
      setZoom(newZoom);
    };

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      svg.removeEventListener('wheel', handleWheel);
    };
  }, [zoom, panX, panY, viewBoxSize, halfSize]);

  // Window-level dragging listener so fast mouse moves or drags never drop or misfire
  useEffect(() => {
    if (!isDraggingPoint && !isPanning && !isDraggingCore) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      hasMovedRef.current = true;

      // Handle Point Dragging
      if (isDraggingPoint && draggedPointIndex !== null && draggedPointIndex < points.length) {
        const coords = screenToMeters(e.clientX, e.clientY);
        if (!coords) return;

        const updated = points.map((p, idx) => {
          if (idx === draggedPointIndex) {
            return { ...p, x: coords.x, y: coords.y };
          }
          return p;
        });
        onChangePoints(updated);
      }

      // Handle Core Dragging
      if (isDraggingCore && onChangeCoreParams) {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const deltaPxX = e.clientX - coreDragStartRef.current.mouseX;
        const deltaPxY = e.clientY - coreDragStartRef.current.mouseY;

        const deltaMetersX = (deltaPxX / rect.width) * (viewBoxSize / zoom);
        const deltaMetersY = (deltaPxY / rect.height) * (viewBoxSize / zoom);

        let newOffsetX = coreDragStartRef.current.initialOffsetX + deltaMetersX;
        let newOffsetY = coreDragStartRef.current.initialOffsetY + deltaMetersY;

        if (snapToGrid) {
          newOffsetX = Math.round(newOffsetX / gridStep) * gridStep;
          newOffsetY = Math.round(newOffsetY / gridStep) * gridStep;
        }

        // Clamp inside bounding box
        const maxDistX = Math.max(1, bounds.width / 2 - 2);
        const maxDistY = Math.max(1, bounds.depth / 2 - 2);
        newOffsetX = Math.max(-maxDistX, Math.min(maxDistX, newOffsetX));
        newOffsetY = Math.max(-maxDistY, Math.min(maxDistY, newOffsetY));

        onChangeCoreParams({
          coreOffsetX: Math.round(newOffsetX * 10) / 10,
          coreOffsetY: Math.round(newOffsetY * 10) / 10,
          corePositionPreset: 'custom',
        });
      }

      // Handle Pan
      if (isPanning) {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const deltaPxX = e.clientX - panStartRef.current.clientX;
        const deltaPxY = e.clientY - panStartRef.current.clientY;

        const deltaSvgX = (deltaPxX / rect.width) * viewBoxSize;
        const deltaSvgY = (deltaPxY / rect.height) * viewBoxSize;

        setPanX(panStartRef.current.panX + deltaSvgX);
        setPanY(panStartRef.current.panY + deltaSvgY);
      }
    };

    const handleWindowPointerUp = () => {
      if (isDraggingPoint) {
        setIsDraggingPoint(false);
        setDraggedPointIndex(null);
        // Save current state to history
        commitPointsWithHistory(points);
      }
      if (isDraggingCore) {
        setIsDraggingCore(false);
      }
      if (isPanning) {
        setIsPanning(false);
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [
    isDraggingPoint,
    draggedPointIndex,
    isPanning,
    isDraggingCore,
    points,
    screenToMeters,
    commitPointsWithHistory,
    onChangePoints,
    onChangeCoreParams,
    viewBoxSize,
    zoom,
    snapToGrid,
    gridStep,
    bounds.width,
    bounds.depth,
  ]);

  // Canvas Mouse Down: Starts pan in 'pan' or 'select' mode when not hitting a vertex
  const handleCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    hasMovedRef.current = false;
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX,
      panY,
    };
    setIsPanning(true);
  };

  // Canvas Click: Only in 'addPoint' mode does clicking empty canvas insert a vertex!
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    // If pointer was moved (dragging or panning), do not treat as click
    if (hasMovedRef.current) {
      hasMovedRef.current = false;
      return;
    }

    if (toolMode === 'select') {
      // In select mode, clicking empty canvas simply deselects active point/edge!
      // This prevents the common frustration of accidental points jumping into the polygon!
      setSelectedPointIndex(null);
      return;
    }

    if (toolMode === 'addPoint') {
      const coords = screenToMeters(e.clientX, e.clientY);
      if (!coords) return;

      // Find closest edge to insert after
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

      const newPoint: PolygonPoint = {
        id: `p_${Date.now()}`,
        x: coords.x,
        y: coords.y,
      };

      const newPoints = [...points];
      newPoints.splice(closestEdgeIndex + 1, 0, newPoint);
      commitPointsWithHistory(newPoints);
      setSelectedPointIndex(closestEdgeIndex + 1);
      // Switch back to select mode automatically so subsequent clicks don't spawn more points accidentally
      setToolMode('select');
    }
  };

  // Start dragging a point
  const handlePointPointerDown = (index: number, e: React.PointerEvent) => {
    e.stopPropagation();
    hasMovedRef.current = false;
    setSelectedPointIndex(index);
    setDraggedPointIndex(index);
    setIsDraggingPoint(true);
  };

  // Start dragging circulation core
  const handleCorePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    hasMovedRef.current = false;
    coreDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialOffsetX: coreOffsetX || 0,
      initialOffsetY: coreOffsetY || 0,
    };
    setIsDraggingCore(true);
    setActiveTab('core');
  };

  // Split an edge at its exact midpoint (1-click fail-safe vertex addition)
  const handleSplitEdge = (edgeIdx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const edge = edges[edgeIdx];
    if (!edge) return;

    let splitX = edge.midpoint.x;
    let splitY = edge.midpoint.y;
    if (snapToGrid) {
      splitX = Math.round(splitX / gridStep) * gridStep;
      splitY = Math.round(splitY / gridStep) * gridStep;
    }

    const newPoint: PolygonPoint = {
      id: `p_${Date.now()}`,
      x: splitX,
      y: splitY,
    };

    const newPoints = [...points];
    newPoints.splice(edgeIdx + 1, 0, newPoint);
    commitPointsWithHistory(newPoints);
    setSelectedPointIndex(edgeIdx + 1);
    setSelectedEdgeIndex(edgeIdx);
  };

  // Delete Vertex
  const handleDeletePoint = (index: number) => {
    if (points.length <= 3) {
      alert('Poligon en az 3 köşeden oluşmalıdır. Daha fazla köşe silinemez.');
      return;
    }
    const newPoints = points.filter((_, idx) => idx !== index);
    commitPointsWithHistory(newPoints);
    setSelectedPointIndex(null);
  };

  // Manual Nudge of Selected Vertex
  const handleNudgePoint = (dx: number, dy: number) => {
    if (selectedPointIndex === null || selectedPointIndex >= points.length) return;
    const pt = points[selectedPointIndex];
    const newX = Math.round((pt.x + dx) * 10) / 10;
    const newY = Math.round((pt.y + dy) * 10) / 10;
    const newPoints = points.map((p, idx) =>
      idx === selectedPointIndex ? { ...p, x: newX, y: newY } : p
    );
    commitPointsWithHistory(newPoints);
  };

  // Direct Coordinate Input Change
  const handlePointCoordChange = (axis: 'x' | 'y', value: number) => {
    if (selectedPointIndex === null || selectedPointIndex >= points.length) return;
    if (isNaN(value)) return;
    const safeVal = Math.max(-25, Math.min(25, value));
    const newPoints = points.map((p, idx) =>
      idx === selectedPointIndex ? { ...p, [axis]: safeVal } : p
    );
    commitPointsWithHistory(newPoints);
  };

  // Change Edge Length
  const handleChangeEdgeLength = (edgeIdx: number, newLengthM: number, mode: 'extendEnd' | 'symmetric' = 'extendEnd') => {
    if (edgeIdx < 0 || edgeIdx >= points.length) return;
    const safeLen = Math.max(1.0, Math.min(80.0, typeof newLengthM === 'number' && !isNaN(newLengthM) ? newLengthM : 10.0));

    const n = points.length;
    const p1 = points[edgeIdx];
    const p2 = points[(edgeIdx + 1) % n];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const curLen = Math.hypot(dx, dy);
    if (curLen < 0.001) return;

    let updatedPoints: PolygonPoint[];

    if (mode === 'symmetric') {
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const halfLen = safeLen / 2;
      const unitX = dx / curLen;
      const unitY = dy / curLen;

      updatedPoints = points.map((p, idx) => {
        if (idx === edgeIdx) {
          return {
            ...p,
            x: Math.round((midX - unitX * halfLen) * 10) / 10,
            y: Math.round((midY - unitY * halfLen) * 10) / 10,
          };
        }
        if (idx === (edgeIdx + 1) % n) {
          return {
            ...p,
            x: Math.round((midX + unitX * halfLen) * 10) / 10,
            y: Math.round((midY + unitY * halfLen) * 10) / 10,
          };
        }
        return p;
      });
    } else {
      // Extend end vertex along edge vector
      const scale = safeLen / curLen;
      const deltaX = dx * (scale - 1);
      const deltaY = dy * (scale - 1);

      updatedPoints = points.map((p, idx) => {
        if (idx === (edgeIdx + 1) % n) {
          return {
            ...p,
            x: Math.round((p.x + deltaX) * 10) / 10,
            y: Math.round((p.y + deltaY) * 10) / 10,
          };
        }
        return p;
      });
    }

    commitPointsWithHistory(updatedPoints);
  };

  // Make Edge Perfectly Orthogonal (Snap to 0, 90, 180, 270 degrees)
  const handleOrthogonalizeEdge = (edgeIdx: number) => {
    if (edgeIdx < 0 || edgeIdx >= points.length) return;
    const n = points.length;
    const p1 = points[edgeIdx];
    const p2 = points[(edgeIdx + 1) % n];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);

    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const absAngle = (angleDeg + 360) % 360;

    const targets = [0, 90, 180, 270, 360];
    let closestTarget = targets[0];
    let minDiff = Infinity;
    for (const tgt of targets) {
      const diff = Math.abs(absAngle - tgt);
      if (diff < minDiff) {
        minDiff = diff;
        closestTarget = tgt % 360;
      }
    }

    const rad = (closestTarget * Math.PI) / 180;
    const newX = Math.round((p1.x + Math.cos(rad) * len) * 10) / 10;
    const newY = Math.round((p1.y + Math.sin(rad) * len) * 10) / 10;

    const updated = points.map((p, idx) => {
      if (idx === (edgeIdx + 1) % n) {
        return { ...p, x: newX, y: newY };
      }
      return p;
    });
    commitPointsWithHistory(updated);
  };

  // Geometric Normalization & Structural Grid Alignment
  const handleNormalizeAndAlign = () => {
    const { normalizedPoints, actionsTaken } = normalizePolygonAndAlignToGrid(points, {
      gridStep,
      angleSnapToleranceDeg: 10,
      minEdgeLength: 0.5,
    });
    commitPointsWithHistory(normalizedPoints);
    if (actionsTaken.length > 0) {
      alert(`Geometrik Doğrulama & Aks Hizalaması Tamamlandı:\n\n• ` + actionsTaken.join('\n• '));
    } else {
      alert(`Geometrik form zaten ${gridStep}m yapısal aks ızgarası ile mükemmel uyumludur.`);
    }
  };

  // ROAD MANAGEMENT: Add, Update, or Remove Road on a Facade/Edge
  const handleToggleRoadOnFacade = (facadeIdx: number, roadType: RoadType = 'road', customName?: string) => {
    if (!onChangeRoads) return;
    const existing = roads.find(r => r.facadeIndex === facadeIdx);

    if (existing) {
      // Remove road
      const updated = roads.filter(r => r.facadeIndex !== facadeIdx);
      onChangeRoads(updated);
    } else {
      // Add road
      const defaultWidth = roadType === 'street' ? 7 : roadType === 'road' ? 12 : roadType === 'avenue' ? 20 : 35;
      const defaultName = roadType === 'street' ? `${facadeIdx + 1}. Sokak` : roadType === 'avenue' ? `${facadeIdx + 1}. Cadde` : `${facadeIdx + 1}. Ön Yol`;
      const newRoad: RoadConfig = {
        id: `road_${Date.now()}_${facadeIdx}`,
        facadeIndex: facadeIdx,
        type: roadType,
        name: customName || defaultName,
        width: defaultWidth,
      };
      onChangeRoads([...roads, newRoad]);
    }
  };

  const handleUpdateRoadType = (facadeIdx: number, newType: RoadType) => {
    if (!onChangeRoads) return;
    const defaultWidth = newType === 'street' ? 7 : newType === 'road' ? 12 : newType === 'avenue' ? 20 : 35;
    const updated = roads.map(r => {
      if (r.facadeIndex === facadeIdx) {
        return { ...r, type: newType, width: defaultWidth };
      }
      return r;
    });
    onChangeRoads(updated);
  };

  const handleUpdateRoadName = (facadeIdx: number, newName: string) => {
    if (!onChangeRoads) return;
    const updated = roads.map(r => {
      if (r.facadeIndex === facadeIdx) {
        return { ...r, name: newName };
      }
      return r;
    });
    onChangeRoads(updated);
  };

  // ENTRANCE MANAGEMENT: Select Main Building Entrance
  const handleSetMainEntrance = (idx: number) => {
    if (onChangeMainEntranceIndex) {
      onChangeMainEntranceIndex(idx);
    }
    if (onChangeFacadeConfigs) {
      const updated = currentFacadeConfigs.map((cfg, i) => ({
        ...cfg,
        isEntrance: i === idx,
      }));
      onChangeFacadeConfigs(updated);
    }
  };

  // CORE PRESET MANAGEMENT
  const handleApplyCorePreset = (preset: 'center' | 'entrance' | 'rear' | 'left' | 'right') => {
    if (!onChangeCoreParams) return;
    let offX = 0;
    let offY = 0;

    const wHalf = bounds.width / 4;
    const dHalf = bounds.depth / 4;

    if (preset === 'center') {
      offX = 0;
      offY = 0;
    } else if (preset === 'entrance') {
      // Find entrance edge midpoint relative to centroid
      const entEdge = edges[mainEntranceIndex] || edges[0];
      if (entEdge) {
        offX = Math.round((entEdge.midpoint.x - centroid.x) * 0.45 * 10) / 10;
        offY = Math.round((entEdge.midpoint.y - centroid.y) * 0.45 * 10) / 10;
      } else {
        offY = dHalf * 0.8;
      }
    } else if (preset === 'rear') {
      offY = -dHalf * 0.9;
    } else if (preset === 'left') {
      offX = -wHalf * 0.9;
    } else if (preset === 'right') {
      offX = wHalf * 0.9;
    }

    onChangeCoreParams({
      coreOffsetX: offX,
      coreOffsetY: offY,
      corePositionPreset: preset,
    });
  };

  // Facade config individual update
  const handleUpdateFacadeConfig = (idx: number, updates: Partial<FacadeDetailConfig>) => {
    if (!onChangeFacadeConfigs) return;
    const updated = currentFacadeConfigs.map((cfg, i) => {
      if (i === idx) {
        return { ...cfg, ...updates };
      }
      return cfg;
    });
    onChangeFacadeConfigs(updated);
  };

  // Convert points to SVG polygon points string
  const polygonPointsStr = points.map(p => `${p.x},${p.y}`).join(' ');

  // Computed Circulation Core Center Coordinates
  const effectiveCoreCenterX = bounds.centerX + (coreOffsetX || 0);
  const effectiveCoreCenterY = bounds.centerY + (coreOffsetY || 0);

  // Selected edge object
  const currentSelectedEdge = selectedEdgeIndex !== null ? edges[selectedEdgeIndex] : null;
  const currentEdgeRoad = selectedEdgeIndex !== null ? roads.find(r => r.facadeIndex === selectedEdgeIndex) : null;
  const isSelectedEdgeEntrance = selectedEdgeIndex === mainEntranceIndex;

  return (
    <div className="space-y-3">
      {/* 🧭 TOP HEADER: AREA, PERIMETER, STATUS & TOOL MODES */}
      {compact ? (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 text-white shadow-inner">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-indigo-400" />
              <span>{points.length} Köşe • {area.toFixed(1)} m²</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              ({bounds.width.toFixed(1)}m × {bounds.depth.toFixed(1)}m)
            </span>
          </div>

          {/* Quick Tools */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setToolMode('select')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                toolMode === 'select' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Seç & Düzenle"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Seç</span>
            </button>

            <button
              type="button"
              onClick={() => setToolMode('addPoint')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                toolMode === 'addPoint' ? 'bg-emerald-600 text-white animate-pulse' : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="+ Nokta Ekle (Çizim alanına tıklayarak yeni köşe ekleyin)"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ Nokta</span>
            </button>

            <button
              type="button"
              onClick={() => setToolMode('pan')}
              className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                toolMode === 'pan' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Tuvali Kaydır"
            >
              <Move className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="Geri Al"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="İleri Al"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleNormalizeAndAlign}
              className="px-2 py-1 rounded-lg text-xs font-bold text-indigo-300 bg-indigo-950/90 hover:bg-indigo-900 border border-indigo-700/60 flex items-center gap-1 transition-all"
              title="Aksa Hizala & 90° Dikleştir"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Hizala</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Ruler className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800">
                  2D Akıllı Poligon Taban Çizim Editörü
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                  validation.isValid
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {points.length} Köşe • {area.toFixed(1)} m²
                </span>
              </div>
              <span className="text-xs text-slate-500">
                Çevre: <b className="text-slate-700">{perimeter.toFixed(1)}m</b> • Boyutlar:{' '}
                <b className="text-slate-700">{bounds.width.toFixed(1)}m × {bounds.depth.toFixed(1)}m</b>
              </span>
            </div>
          </div>

          {/* PRIMARY TOOL MODE SELECTOR BAR */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setToolMode('select')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                toolMode === 'select'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-white/80'
              }`}
              title="Seç ve Taşı Modu: Köşeleri ve kenarları seçin veya sürükleyin. Boşluğa tıklamak yanlışlıkla nokta eklemez!"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>Seç & Düzenle</span>
            </button>

            <button
              type="button"
              onClick={() => setToolMode('addPoint')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                toolMode === 'addPoint'
                  ? 'bg-emerald-600 text-white shadow-sm animate-pulse'
                  : 'text-slate-700 hover:bg-white/80'
              }`}
              title="Serbest Nokta Ekleme Modu: Çizim alanına tıklayarak yeni köşe noktası ekleyin."
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>+ Nokta Ekle</span>
            </button>

            <button
              type="button"
              onClick={() => setToolMode('pan')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                toolMode === 'pan'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-white/80'
              }`}
              title="Çizim alanını kaydırmak için tuvali sürükleyin"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Kaydır</span>
            </button>

            <div className="w-[1px] h-5 bg-slate-300 mx-1" />

            {/* UNDO / REDO */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg text-slate-700 hover:bg-white disabled:opacity-30 transition-all"
              title="Geri Al (Undo)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-lg text-slate-700 hover:bg-white disabled:opacity-30 transition-all"
              title="İleri Al (Redo)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-5 bg-slate-300 mx-1" />

            {/* Aksa Hizala & Dikleştir */}
            <button
              type="button"
              onClick={handleNormalizeAndAlign}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1 transition-all"
              title="Köşeleri 90° ve 45° dik açılara bağlar, çakışan noktaları temizler."
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Aksa Hizala</span>
            </button>
          </div>
        </div>
      )}

      {/* 🔄 RESPONSIVE CAD GRID LAYOUT: If compact, full width single column; otherwise Left Canvas + Right Sidebar */}
      <div className={compact ? "w-full space-y-3" : "grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-6 items-start"}>
        {/* Left Column: Canvas, Modes, Vertex Fine-Tuning */}
        <div className={`space-y-3 ${compact ? 'w-full' : 'lg:sticky lg:top-6'}`}>
          {/* ⚠️ TOOLBAR ACTIVE MODE NOTIFICATION BANNER */}
          {toolMode === 'addPoint' && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-emerald-600 animate-spin" />
            <span>
              <b>Nokta Ekleme Modu Aktif:</b> Çizim üzerinde istediğiniz konuma tıklayarak yeni köşe ekleyin. Ekledikten sonra otomatik olarak Seçim moduna dönülür.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setToolMode('select')}
            className="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 text-[11px]"
          >
            İptal Et
          </button>
        </div>
      )}

      {/* 🖥️ MAIN CANVAS & DRAWING STAGE */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-inner">
        {/* SVG Drawing Surface */}
        <div className={`w-full relative select-none ${
          compact
            ? 'aspect-[4/3] sm:aspect-[16/11] min-h-[320px] max-h-[460px]'
            : 'aspect-[16/10] min-h-[380px] max-h-[560px]'
        }`}>
          <svg
            ref={svgRef}
            viewBox={`${-halfSize} ${-halfSize} ${viewBoxSize} ${viewBoxSize}`}
            className={`w-full h-full ${
              toolMode === 'addPoint'
                ? 'cursor-crosshair'
                : toolMode === 'pan' || isPanning
                ? 'cursor-grab active:cursor-grabbing'
                : 'cursor-default'
            }`}
            onPointerDown={handleCanvasPointerDown}
            onClick={handleCanvasClick}
          >
            <defs>
              {/* 1-meter minor grid pattern */}
              <pattern id="grid-1m" width="1" height="1" patternUnits="userSpaceOnUse">
                <path d="M 1 0 L 0 0 0 1" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.04" />
              </pattern>
              {/* 5-meter major grid pattern */}
              <pattern id="grid-5m" width="5" height="5" patternUnits="userSpaceOnUse">
                <rect width="5" height="5" fill="url(#grid-1m)" />
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.08" />
              </pattern>
              {/* Diagonal architectural building hatch */}
              <pattern id="hatch-arch" width="1.2" height="1.2" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="1.2" stroke="rgba(99, 102, 241, 0.28)" strokeWidth="0.16" />
              </pattern>
              {/* Asphalt road pattern */}
              <pattern id="road-asphalt" width="2" height="2" patternUnits="userSpaceOnUse">
                <rect width="2" height="2" fill="#1e293b" />
                <line x1="0" y1="1" x2="2" y2="1" stroke="rgba(255,255,255,0.04)" strokeWidth="0.1" strokeDasharray="0.3,0.3" />
              </pattern>
            </defs>

            {/* Transform Container with Pan & Zoom */}
            <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
              {/* Infinite Grid Background */}
              <rect x="-150" y="-150" width="300" height="300" fill="#0f172a" />
              <rect x="-150" y="-150" width="300" height="300" fill="url(#grid-5m)" />

              {/* World Axes (X=0, Y=0 in meters) */}
              <line x1="-150" y1="0" x2="150" y2="0" stroke="rgba(255,255,255,0.18)" strokeWidth="0.06" strokeDasharray="0.4,0.4" />
              <line x1="0" y1="-150" x2="0" y2="150" stroke="rgba(255,255,255,0.18)" strokeWidth="0.06" strokeDasharray="0.4,0.4" />

              {/* 🛣️ 2D ROADS RENDERING ON ATTACHED FACADES */}
              {roads.map(road => {
                const edge = edges[road.facadeIndex];
                if (!edge) return null;

                const p1 = edge.start;
                const p2 = edge.end;
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const len = Math.hypot(dx, dy);
                if (len < 0.1) return null;

                // Outward normal vector perpendicular to edge (CCW winding points outside)
                // Normal = (dy / len, -dx / len)
                const nx = dy / len;
                const ny = -dx / len;

                const roadW = Math.max(3, Math.min(15, (road.width || 12) * 0.45)); // Scaled for clean 2D representation

                // 4 corners of road strip
                const r1x = p1.x;
                const r1y = p1.y;
                const r2x = p2.x;
                const r2y = p2.y;
                const r3x = p2.x + nx * roadW;
                const r3y = p2.y + ny * roadW;
                const r4x = p1.x + nx * roadW;
                const r4y = p1.y + ny * roadW;

                const midRoadX = edge.midpoint.x + nx * (roadW * 0.5);
                const midRoadY = edge.midpoint.y + ny * (roadW * 0.5);

                const roadAngle = (Math.atan2(dy, dx) * 180) / Math.PI;

                return (
                  <g key={`road-polygon-${road.id}`} className="cursor-pointer" onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEdgeIndex(road.facadeIndex);
                    setActiveTab('edges');
                  }}>
                    {/* Road Pavement Ribbon */}
                    <polygon
                      points={`${r1x},${r1y} ${r2x},${r2y} ${r3x},${r3y} ${r4x},${r4y}`}
                      fill="#1e293b"
                      stroke="#475569"
                      strokeWidth="0.1"
                    />

                    {/* Road Centerline dashed stripe */}
                    <line
                      x1={(r1x + r4x) / 2}
                      y1={(r1y + r4y) / 2}
                      x2={(r2x + r3x) / 2}
                      y2={(r2y + r3y) / 2}
                      stroke="#facc15"
                      strokeWidth="0.12"
                      strokeDasharray="0.8,0.5"
                    />

                    {/* Sidewalk Curb line */}
                    <line
                      x1={r1x}
                      y1={r1y}
                      x2={r2x}
                      y2={r2y}
                      stroke="#94a3b8"
                      strokeWidth="0.16"
                    />

                    {/* Road Name Badge */}
                    <g transform={`translate(${midRoadX}, ${midRoadY})`}>
                      <rect
                        x="-2.6"
                        y="-0.5"
                        width="5.2"
                        height="1.0"
                        rx="0.25"
                        fill="#0f172a"
                        stroke="#f59e0b"
                        strokeWidth="0.08"
                      />
                      <text
                        x="0"
                        y="0.2"
                        fill="#fde68a"
                        fontSize="0.46"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        🛣️ {road.name || 'İmar Yolu'} ({road.width || 12}m)
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Filled Building Polygon Footprint */}
              <polygon
                points={polygonPointsStr}
                fill="url(#hatch-arch)"
                stroke="rgba(99, 102, 241, 0.4)"
                strokeWidth="0.12"
              />

              {/* 🏛️ REALISTIC STAIRCASE & ELEVATOR CIRCULATION CORE (DRAGGABLE) */}
              <g
                transform={`translate(${effectiveCoreCenterX}, ${effectiveCoreCenterY})`}
                className="cursor-move group"
                onPointerDown={handleCorePointerDown}
              >
                {/* Core Boundary Enclosure Box */}
                {(() => {
                  const sW = stairWidth || 2.6;
                  const sD = stairDepth || 4.8;
                  const eW = (elevatorWidth || 1.8) * (elevatorCount || 1);
                  const eD = elevatorDepth || 2.0;

                  const totalCoreW = sW + eW + 0.4;
                  const totalCoreD = Math.max(sD, eD) + 0.8;
                  const halfCW = totalCoreW / 2;
                  const halfCD = totalCoreD / 2;

                  return (
                    <g>
                      {/* Drop shadow / glow */}
                      <rect
                        x={-halfCW}
                        y={-halfCD}
                        width={totalCoreW}
                        height={totalCoreD}
                        fill="rgba(15, 23, 42, 0.75)"
                        stroke="#f59e0b"
                        strokeWidth="0.12"
                        rx="0.3"
                      />

                      {/* Staircase Shaft Volume (Left Half) */}
                      <g transform={`translate(${-halfCW + 0.2}, ${-halfCD + 0.2})`}>
                        <rect
                          x="0"
                          y="0"
                          width={sW}
                          height={sD}
                          fill="rgba(245, 158, 11, 0.15)"
                          stroke="#d97706"
                          strokeWidth="0.08"
                          rx="0.15"
                        />
                        {/* Stair steps lines */}
                        {Array.from({ length: 8 }).map((_, stepIdx) => (
                          <line
                            key={`step-${stepIdx}`}
                            x1="0.1"
                            y1={0.3 + stepIdx * (sD - 0.6) / 8}
                            x2={sW - 0.1}
                            y2={0.3 + stepIdx * (sD - 0.6) / 8}
                            stroke="rgba(253, 230, 138, 0.4)"
                            strokeWidth="0.05"
                          />
                        ))}
                        {/* Stair central eye & UP arrow */}
                        <line
                          x1={sW / 2}
                          y1="0.3"
                          x2={sW / 2}
                          y2={sD - 0.3}
                          stroke="#f59e0b"
                          strokeWidth="0.07"
                          strokeDasharray="0.2,0.2"
                        />
                        <text
                          x={sW / 2}
                          y={sD / 2}
                          fill="#fef08a"
                          fontSize="0.4"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          ▲ ÇIKIŞ
                        </text>
                        <text
                          x={sW / 2}
                          y={0.5}
                          fill="#fbbf24"
                          fontSize="0.38"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          MERDİVEN ({sW}m)
                        </text>
                      </g>

                      {/* Elevator Shaft Volume (Right Half) */}
                      <g transform={`translate(${-halfCW + sW + 0.3}, ${-halfCD + 0.2})`}>
                        {Array.from({ length: elevatorCount || 1 }).map((_, elevIdx) => {
                          const singleEW = (elevatorWidth || 1.8);
                          const elevX = elevIdx * (singleEW + 0.1);
                          return (
                            <g key={`elev-shaft-${elevIdx}`} transform={`translate(${elevX}, 0)`}>
                              <rect
                                x="0"
                                y="0"
                                width={singleEW}
                                height={eD}
                                fill="rgba(56, 189, 248, 0.15)"
                                stroke="#38bdf8"
                                strokeWidth="0.08"
                                rx="0.15"
                              />
                              {/* Architectural Shaft Cross 'X' */}
                              <line x1="0.1" y1="0.1" x2={singleEW - 0.1} y2={eD - 0.1} stroke="rgba(56, 189, 248, 0.35)" strokeWidth="0.06" />
                              <line x1={singleEW - 0.1} y1="0.1" x2="0.1" y2={eD - 0.1} stroke="rgba(56, 189, 248, 0.35)" strokeWidth="0.06" />
                              <text
                                x={singleEW / 2}
                                y={eD / 2 + 0.1}
                                fill="#bae6fd"
                                fontSize="0.36"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                ASANSÖR {elevatorCount > 1 ? `#${elevIdx + 1}` : ''}
                              </text>
                            </g>
                          );
                        })}
                      </g>

                      {/* Circulation Lobby & Drag Handle Header */}
                      <g transform={`translate(0, ${halfCD - 0.4})`}>
                        <rect
                          x={-halfCW + 0.3}
                          y="-0.3"
                          width={totalCoreW - 0.6}
                          height="0.6"
                          rx="0.15"
                          fill="#334155"
                          stroke="#64748b"
                          strokeWidth="0.06"
                        />
                        <text
                          x="0"
                          y="0.12"
                          fill="#f8fafc"
                          fontSize="0.38"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          ✥ Çekirdek Konumu (Sürükleyin)
                        </text>
                      </g>
                    </g>
                  );
                })()}
              </g>

              {/* 🚪 MAIN BUILDING ENTRANCE AWNING & ENTRY ARROW */}
              {(() => {
                const entranceEdge = edges[mainEntranceIndex];
                if (!entranceEdge) return null;

                const p1 = entranceEdge.start;
                const p2 = entranceEdge.end;
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const len = Math.hypot(dx, dy);
                if (len < 0.1) return null;

                // Outward normal vector
                const nx = dy / len;
                const ny = -dx / len;

                const midX = entranceEdge.midpoint.x;
                const midY = entranceEdge.midpoint.y;

                return (
                  <g key="main-entrance-portal" className="pointer-events-none">
                    {/* Entrance steps / ramp outside */}
                    <line
                      x1={midX - (dx / len) * 1.6 + nx * 0.3}
                      y1={midY - (dy / len) * 1.6 + ny * 0.3}
                      x2={midX + (dx / len) * 1.6 + nx * 0.3}
                      y2={midY + (dy / len) * 1.6 + ny * 0.3}
                      stroke="#22c55e"
                      strokeWidth="0.25"
                    />

                    {/* High-visibility Entrance Canopy Badge */}
                    <g transform={`translate(${midX + nx * 1.4}, ${midY + ny * 1.4})`}>
                      <rect
                        x="-3.0"
                        y="-0.65"
                        width="6.0"
                        height="1.3"
                        rx="0.3"
                        fill="#15803d"
                        stroke="#86efac"
                        strokeWidth="0.1"
                      />
                      <text
                        x="0"
                        y="0.25"
                        fill="#ffffff"
                        fontSize="0.52"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        🚪 BİNA ANA GİRİŞİ
                      </text>
                    </g>

                    {/* Inward direction entrance arrow */}
                    <line
                      x1={midX + nx * 0.8}
                      y1={midY + ny * 0.8}
                      x2={midX - nx * 1.2}
                      y2={midY - ny * 1.2}
                      stroke="#4ade80"
                      strokeWidth="0.18"
                      strokeDasharray="0.3,0.2"
                    />
                  </g>
                );
              })()}

              {/* 📏 POLYGON EDGES WITH DIRECT LENGTH LABELS & MIDPOINT SPLIT BUTTONS */}
              {edges.map((edge, idx) => {
                const isEntrance = idx === mainEntranceIndex;
                const isSelected = selectedEdgeIndex === idx;
                const hasRoad = roads.some(r => r.facadeIndex === idx);

                return (
                  <g key={`edge-${idx}`}>
                    {/* Edge Main Line (Click to select edge) */}
                    <line
                      x1={edge.start.x}
                      y1={edge.start.y}
                      x2={edge.end.x}
                      y2={edge.end.y}
                      stroke={
                        isEntrance
                          ? '#22c55e'
                          : isSelected
                          ? '#a855f7'
                          : hasRoad
                          ? '#f59e0b'
                          : '#38bdf8'
                      }
                      strokeWidth={isSelected ? '0.45' : isEntrance ? '0.38' : '0.28'}
                      strokeLinecap="round"
                      className="cursor-pointer transition-all hover:stroke-indigo-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEdgeIndex(idx);
                        setActiveTab('edges');
                      }}
                    />

                    {/* Edge Midpoint Interactive Cluster */}
                    <g transform={`translate(${edge.midpoint.x}, ${edge.midpoint.y})`}>
                      {/* Length Badge Circle */}
                      <g
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEdgeIndex(idx);
                          setActiveTab('edges');
                        }}
                      >
                        <circle
                          r="0.9"
                          fill={
                            isEntrance
                              ? '#15803d'
                              : isSelected
                              ? '#7e22ce'
                              : hasRoad
                              ? '#b45309'
                              : '#1e293b'
                          }
                          stroke={isSelected ? '#d8b4fe' : '#94a3b8'}
                          strokeWidth="0.08"
                        />
                        <text
                          x="0"
                          y="0.25"
                          fill="#ffffff"
                          fontSize="0.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {edge.length}m
                        </text>
                      </g>

                      {/* ➕ Quick Edge Split Button (Adds Point Right Here Without Slipping!) */}
                      {toolMode === 'select' && (
                        <g
                          transform="translate(1.4, -0.4)"
                          className="cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                          onClick={(e) => handleSplitEdge(idx, e)}
                        >
                          <circle r="0.45" fill="#10b981" stroke="#ffffff" strokeWidth="0.06" />
                          <text x="0" y="0.18" fill="#ffffff" fontSize="0.5" fontWeight="bold" textAnchor="middle">
                            +
                          </text>
                        </g>
                      )}
                    </g>
                  </g>
                );
              })}

              {/* 🎯 VERTEX CONTROL POINTS (DRAGGABLE WITH POINTER LOCK) */}
              {points.map((p, idx) => {
                const isSelected = selectedPointIndex === idx;

                return (
                  <g
                    key={`point-${p.id || idx}`}
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={(e) => handlePointPointerDown(idx, e)}
                  >
                    {/* Outer Glow Halo */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isSelected ? '1.1' : '0.8'}
                      fill={isSelected ? 'rgba(168, 85, 247, 0.45)' : 'rgba(255, 255, 255, 0.18)'}
                    />
                    {/* Core Point Dot */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="0.48"
                      fill={isSelected ? '#a855f7' : '#ffffff'}
                      stroke="#0f172a"
                      strokeWidth="0.12"
                    />
                    {/* Point Index Label (K1, K2...) */}
                    <text
                      x={p.x}
                      y={p.y - 0.75}
                      fill={isSelected ? '#d8b4fe' : '#94a3b8'}
                      fontSize="0.58"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      K{idx + 1}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Static Compass Overlay (Cardinal Directions) */}
            <g className="pointer-events-none opacity-40">
              <text x="0" y={`-${halfSize - 1.2}`} fill="#94a3b8" fontSize="0.95" fontWeight="bold" textAnchor="middle">
                ▲ KUZEY / ARKA PARSEL
              </text>
              <text x="0" y={`${halfSize - 0.8}`} fill="#818cf8" fontSize="0.95" fontWeight="bold" textAnchor="middle">
                ▼ GÜNEY / ÖN CEPHE
              </text>
            </g>
          </svg>

          {/* Floating Navigation Controls (Zoom / Center / Reset) */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 shadow-xl">
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(5.0, z + 0.25))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-slate-200 transition-colors"
              title="Yakınlaştır (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(0.6, z - 0.25))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-slate-200 transition-colors"
              title="Uzaklaştır (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setPanX(-bounds.centerX);
                setPanY(-bounds.centerY);
                const maxDim = Math.max(bounds.width, bounds.depth);
                if (maxDim > 0) {
                  setZoom(Math.max(0.7, Math.min(2.0, (viewBoxSize * 0.7) / maxDim)));
                }
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-amber-400 transition-colors"
              title="Modeli Ortala / Sığdır"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1.0);
                setPanX(0);
                setPanY(0);
              }}
              className="px-1.5 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-indigo-300 transition-colors text-center"
              title="Birebir Ölçek (1:1)"
            >
              1:1
            </button>
          </div>

          {/* Grid Snap & Tolerance Floating Bar */}
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl text-xs text-slate-300">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer rounded"
              />
              <span className="text-[11px] font-semibold">Izgaraya Yapış:</span>
            </label>
            <select
              value={gridStep}
              onChange={(e) => setGridStep(parseFloat(e.target.value) || 0.5)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-[11px] rounded px-1.5 py-0.5"
            >
              <option value={0.25}>0.25m</option>
              <option value={0.5}>0.5m (Standart)</option>
              <option value={1.0}>1.0m (Kaba)</option>
            </select>
          </div>

          {/* Selected Vertex Fine-Tuning Overlay Bar */}
          {selectedPointIndex !== null && selectedPointIndex < points.length && (
            <div className="absolute bottom-3 left-3 right-3 sm:right-auto flex flex-wrap items-center gap-2 bg-slate-900/95 backdrop-blur-md p-2.5 rounded-xl border border-purple-500/50 shadow-2xl animate-fadeIn">
              <span className="text-xs font-bold text-purple-300 px-1">
                📍 Köşe K{selectedPointIndex + 1} Koordinatları:
              </span>

              {/* Manual numeric coordinate inputs */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400">X:</span>
                  <input
                    type="number"
                    step={gridStep}
                    value={points[selectedPointIndex].x}
                    onChange={(e) => handlePointCoordChange('x', parseFloat(e.target.value))}
                    className="w-14 bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">m</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400">Y:</span>
                  <input
                    type="number"
                    step={gridStep}
                    value={points[selectedPointIndex].y}
                    onChange={(e) => handlePointCoordChange('y', parseFloat(e.target.value))}
                    className="w-14 bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">m</span>
                </div>
              </div>

              {/* Nudge arrow buttons */}
              <div className="flex items-center gap-0.5 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => handleNudgePoint(-gridStep, 0)}
                  className="p-1 hover:bg-slate-700 text-slate-200 rounded"
                  title="Sola Kaydır"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNudgePoint(0, -gridStep)}
                  className="p-1 hover:bg-slate-700 text-slate-200 rounded"
                  title="Yukarı Kaydır"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNudgePoint(0, gridStep)}
                  className="p-1 hover:bg-slate-700 text-slate-200 rounded"
                  title="Aşağı Kaydır"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNudgePoint(gridStep, 0)}
                  className="p-1 hover:bg-slate-700 text-slate-200 rounded"
                  title="Sağa Kaydır"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Delete Vertex Button */}
              <button
                type="button"
                onClick={() => handleDeletePoint(selectedPointIndex)}
                disabled={points.length <= 3}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ml-auto"
                title="Köşeyi Sil"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sil</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div> {/* Closes Left Column */}

    {/* Right Column: Active Controls Panel (ONLY shown when NOT compact) */}
    {!compact && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden lg:sticky lg:top-6 lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('edges')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'edges'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Ruler className="w-4 h-4 text-indigo-600" />
            <span>Kenar Boyutu & Geometri</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('core')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'core'
                ? 'bg-white text-amber-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-600" />
            <span>Merdiven & Çekirdek</span>
          </button>
        </div>

        {/* TAB 1: KENAR UZUNLUĞU DEĞİŞTİRME, YOL EKLEME & GİRİŞ SEÇME */}
        {activeTab === 'edges' && (
          <div className="p-4 space-y-4">
            {/* Edge Selector Carousel / Pills */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-2">
                Düzenlemek İstediğiniz Cepheyi / Kenarı Seçin:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {edges.map((edge, idx) => {
                  const isSelected = selectedEdgeIndex === idx;
                  const isEntrance = idx === mainEntranceIndex;
                  const road = roads.find(r => r.facadeIndex === idx);

                  return (
                    <button
                      key={`edge-btn-${idx}`}
                      type="button"
                      onClick={() => setSelectedEdgeIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                          : isEntrance
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : road
                          ? 'bg-amber-50 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span>K{edge.startIndex + 1}→K{edge.endIndex + 1}</span>
                      <span className="opacity-80 font-mono">({edge.length}m)</span>
                      {isEntrance && <span>🚪</span>}
                      {road && <span>🛣️</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Edge Details & Controls Box */}
            {currentSelectedEdge && selectedEdgeIndex !== null && (
              <div className="p-4 bg-slate-50/90 rounded-2xl border border-indigo-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                      {selectedEdgeIndex + 1}
                    </span>
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">
                        {currentFacadeConfigs[selectedEdgeIndex]?.name || `${selectedEdgeIndex + 1}. Cephe`}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Köşeler: K{currentSelectedEdge.startIndex + 1} ({currentSelectedEdge.start.x}m, {currentSelectedEdge.start.y}m) → K{currentSelectedEdge.endIndex + 1} ({currentSelectedEdge.end.x}m, {currentSelectedEdge.end.y}m)
                      </span>
                    </div>
                  </div>

                  {/* 🚪 1-CLICK MAIN ENTRANCE TOGGLE BUTTON */}
                  <button
                    type="button"
                    onClick={() => handleSetMainEntrance(selectedEdgeIndex)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isSelectedEdgeEntrance
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    <DoorOpen className="w-4 h-4" />
                    <span>{isSelectedEdgeEntrance ? '✓ Ana Bina Girişi' : '🚪 Bu Cepheyi Ana Giriş Yap'}</span>
                  </button>
                </div>

                {/* 1. KENAR UZUNLUĞUNU DEĞİŞTİRME KONTROLLERİ */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">
                        Kenar Uzunluğu (Metre):
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-600">
                      Açı: {currentSelectedEdge.angleDeg}°
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Stepper buttons */}
                    <button
                      type="button"
                      onClick={() => handleChangeEdgeLength(selectedEdgeIndex, currentSelectedEdge.length - 1.0)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                    >
                      -1m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeEdgeLength(selectedEdgeIndex, currentSelectedEdge.length - 0.5)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                    >
                      -0.5m
                    </button>

                    {/* Numeric Input */}
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50/50 rounded-xl border border-indigo-300">
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="80"
                        value={currentSelectedEdge.length}
                        onChange={(e) => handleChangeEdgeLength(selectedEdgeIndex, parseFloat(e.target.value))}
                        className="w-20 bg-transparent text-sm font-mono font-bold text-indigo-900 focus:outline-none text-center"
                      />
                      <span className="text-xs font-bold text-indigo-600">m</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleChangeEdgeLength(selectedEdgeIndex, currentSelectedEdge.length + 0.5)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                    >
                      +0.5m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeEdgeLength(selectedEdgeIndex, currentSelectedEdge.length + 1.0)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                    >
                      +1m
                    </button>

                    {/* Orthogonal Snap Button */}
                    <button
                      type="button"
                      onClick={() => handleOrthogonalizeEdge(selectedEdgeIndex)}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold ml-auto"
                      title="Kenarı en yakın 90° dik veya yatay aksa hizalar"
                    >
                      ⚡ 90° Dikleştir
                    </button>
                  </div>
                </div>

                {/* 2. CEPHEYE YOL EKLEME KONTROLLERİ */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-slate-800">
                        Bu Cepheye Yol Durumu:
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleRoadOnFacade(selectedEdgeIndex)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        currentEdgeRoad
                          ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                          : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                      }`}
                    >
                      {currentEdgeRoad ? <Trash2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{currentEdgeRoad ? 'Yolu Kaldır' : '🛣️ Cepheye Yol Ekle'}</span>
                    </button>
                  </div>

                  {currentEdgeRoad ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Yol Genişliği / Tipi:
                        </label>
                        <select
                          value={currentEdgeRoad.type}
                          onChange={(e) => handleUpdateRoadType(selectedEdgeIndex, e.target.value as RoadType)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                        >
                          <option value="street">Sokak (7 metre genişlik)</option>
                          <option value="road">İmar Yolu (12 metre genişlik)</option>
                          <option value="avenue">Cadde (20 metre genişlik)</option>
                          <option value="highway">Bulvar / Anayol (35 metre genişlik)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Yol Adı (İsteğe Bağlı):
                        </label>
                        <input
                          type="text"
                          value={currentEdgeRoad.name || ''}
                          onChange={(e) => handleUpdateRoadName(selectedEdgeIndex, e.target.value)}
                          placeholder="Örn: Atatürk Cad., 104. Sokak"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Bu cephede şu an yol tanımlı değildir (komşu parsel / bahçe çekme mesafesi olarak değerlendirilir). Yol eklemek için yukarıdaki butona tıklayınız.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MERDİVEN & ASANSÖR ÇEKİRDEK YAPISI DÜZENLEYİCİSİ */}
        {activeTab === 'core' && (
          <div className="p-4 space-y-4">
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <b>Dolaşım & Çekirdek Yapısı Özelleştirme:</b> Merdiven kovası ve asansör şaftının bina içerisindeki konumunu, merdiven genişliğini, asansör sayısını ve kuyu ölçülerini buradan aktif olarak değiştirebilirsiniz. Değişiklikler 2D plan ve 3D modele anında işlenir.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Core Position Presets */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Çekirdek Konumu / Yerleşimi:
                  </span>
                  <span className="text-[11px] font-mono text-amber-700 font-bold">
                    ({effectiveCoreCenterX.toFixed(1)}m, {effectiveCoreCenterY.toFixed(1)}m)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyCorePreset('center')}
                    className={`p-2 rounded-xl text-xs font-bold text-center border transition-all ${
                      corePositionPreset === 'center'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Merkez (Ortalı)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyCorePreset('entrance')}
                    className={`p-2 rounded-xl text-xs font-bold text-center border transition-all ${
                      corePositionPreset === 'entrance'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Giriş Yanı
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyCorePreset('rear')}
                    className={`p-2 rounded-xl text-xs font-bold text-center border transition-all ${
                      corePositionPreset === 'rear'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Arka Cephe
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyCorePreset('left')}
                    className={`p-2 rounded-xl text-xs font-bold text-center border transition-all ${
                      corePositionPreset === 'left'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Sol Kanat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyCorePreset('right')}
                    className={`p-2 rounded-xl text-xs font-bold text-center border transition-all ${
                      corePositionPreset === 'right'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Sağ Kanat
                  </button>
                  <div className="p-2 rounded-xl text-[10px] font-bold text-center text-slate-500 border border-dashed border-slate-300 flex items-center justify-center">
                    ✥ Sürükleyerek Taşı
                  </div>
                </div>

                {/* Fine Manual Offset Controls */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">X Kaçıklığı:</span>
                    <input
                      type="range"
                      min={-bounds.width / 2 + 1}
                      max={bounds.width / 2 - 1}
                      step={0.2}
                      value={coreOffsetX || 0}
                      onChange={(e) => onChangeCoreParams && onChangeCoreParams({ coreOffsetX: parseFloat(e.target.value) || 0, corePositionPreset: 'custom' })}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">Y Kaçıklığı:</span>
                    <input
                      type="range"
                      min={-bounds.depth / 2 + 1}
                      max={bounds.depth / 2 - 1}
                      step={0.2}
                      value={coreOffsetY || 0}
                      onChange={(e) => onChangeCoreParams && onChangeCoreParams({ coreOffsetY: parseFloat(e.target.value) || 0, corePositionPreset: 'custom' })}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Stair and Elevator Dimensions */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">
                  Merdiven & Asansör Boyutları:
                </span>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {/* Merdiven Genişliği */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">
                      Merdiven Genişliği (sW):
                    </label>
                    <select
                      value={stairWidth}
                      onChange={(e) => onChangeCoreParams && onChangeCoreParams({ stairWidth: parseFloat(e.target.value) })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                    >
                      <option value={2.2}>2.20 m (Dar / Kompakt)</option>
                      <option value={2.4}>2.40 m (Standart)</option>
                      <option value={2.6}>2.60 m (Geniş Yangın Kaçış)</option>
                      <option value={2.8}>2.80 m (Lüks Rezidans)</option>
                      <option value={3.2}>3.20 m (Çift Kollu Galeri)</option>
                    </select>
                  </div>

                  {/* Merdiven Derinliği */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">
                      Merdiven Derinliği (sD):
                    </label>
                    <select
                      value={stairDepth}
                      onChange={(e) => onChangeCoreParams && onChangeCoreParams({ stairDepth: parseFloat(e.target.value) })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                    >
                      <option value={4.2}>4.20 m (Kısa Kollu)</option>
                      <option value={4.8}>4.80 m (Standart Sahanlıklı)</option>
                      <option value={5.2}>5.20 m (Geniş Ara Sahanlık)</option>
                      <option value={5.8}>5.80 m (Sedye Uyumlu)</option>
                    </select>
                  </div>

                  {/* Asansör Sayısı */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">
                      Asansör Sayısı:
                    </label>
                    <select
                      value={elevatorCount}
                      onChange={(e) => onChangeCoreParams && onChangeCoreParams({ elevatorCount: parseInt(e.target.value) })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                    >
                      <option value={1}>1 Adet (Standart 8 Kişilik)</option>
                      <option value={2}>2 Adet (Sedye + Yolcu)</option>
                    </select>
                  </div>

                  {/* Asansör Kuyu Genişliği */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">
                      Asansör Kuyu Genişliği:
                    </label>
                    <select
                      value={elevatorWidth}
                      onChange={(e) => onChangeCoreParams && onChangeCoreParams({ elevatorWidth: parseFloat(e.target.value) })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                    >
                      <option value={1.6}>1.60 m (6 Kişilik)</option>
                      <option value={1.8}>1.80 m (8 Kişilik Standart)</option>
                      <option value={2.0}>2.00 m (10 Kişilik)</option>
                      <option value={2.4}>2.40 m (Sedye / Yük Asansörü)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
</div>
);
};
