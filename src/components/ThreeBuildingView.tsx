import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import {
  RotateCcw,
  Layers,
  Eye,
  Camera,
  Compass,
  Download,
  Armchair,
  Maximize2,
  Box,
  Home,
  Sliders,
  Smartphone,
  Sparkles,
  CheckCircle2,
  Ruler,
  Bug,
  Palette,
  ChevronDown,
  ChevronUp,
  Check,
  Sun,
  Clock,
  Play,
  Pause,
  MapPin,
  Globe,
} from 'lucide-react';
import { BuildingModelParams, CameraPresetType, FacadeStyleType } from '../types';
import { GoogleMaps3DView } from './GoogleMaps3DView';
import { generateFacadeConfigs, getPolygonEdges, getPolygonBounds, isPointInPolygon, getPolygonCentroid, buildQuadrilateralPolygon } from '../utils/footprintUtils';
import { WALL_COLOR_PRESETS, ROOF_COLOR_PRESETS, ACCENT_COLOR_PRESETS, FRAME_COLOR_PRESETS } from '../utils/buildingModelUtils';

// Safe geometry constructors to completely prevent any NaN/null/zero bounding sphere errors in Three.js
function safeBox(w: number, h: number, d: number, ws: number = 1, hs: number = 1, ds: number = 1): THREE.BoxGeometry {
  const safeW = (typeof w === 'number' && !isNaN(w) && Number.isFinite(w) && w > 0.001) ? w : 1.0;
  const safeH = (typeof h === 'number' && !isNaN(h) && Number.isFinite(h) && h > 0.001) ? h : 1.0;
  const safeD = (typeof d === 'number' && !isNaN(d) && Number.isFinite(d) && d > 0.001) ? d : 1.0;
  return new THREE.BoxGeometry(safeW, safeH, safeD, ws, hs, ds);
}

function safeCylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments: number = 8,
  heightSegments: number = 1,
  openEnded: boolean = false
): THREE.CylinderGeometry {
  const rt = (typeof radiusTop === 'number' && !isNaN(radiusTop) && Number.isFinite(radiusTop) && radiusTop >= 0) ? radiusTop : 0.1;
  const rb = (typeof radiusBottom === 'number' && !isNaN(radiusBottom) && Number.isFinite(radiusBottom) && radiusBottom >= 0) ? radiusBottom : 0.1;
  const h = (typeof height === 'number' && !isNaN(height) && Number.isFinite(height) && height > 0.001) ? height : 1.0;
  return new THREE.CylinderGeometry(rt, rb, h, radialSegments, heightSegments, openEnded);
}

function safeCone(
  radius: number,
  height: number,
  radialSegments: number = 4,
  heightSegments: number = 1,
  openEnded: boolean = false
): THREE.ConeGeometry {
  const r = (typeof radius === 'number' && !isNaN(radius) && Number.isFinite(radius) && radius > 0.001) ? radius : 1.0;
  const h = (typeof height === 'number' && !isNaN(height) && Number.isFinite(height) && height > 0.001) ? height : 1.0;
  return new THREE.ConeGeometry(r, h, radialSegments, heightSegments, openEnded);
}

function safeNum(val: any, fallback: number, minVal: number = 0.001): number {
  if (val === null || val === undefined) return fallback;
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (!isNaN(num) && Number.isFinite(num) && num >= minVal) {
    return num;
  }
  return fallback;
}

function createShapeFromPolygon(pts: Array<{ x: number; y: number }>, centerX: number, centerY: number): THREE.Shape {
  const shape = new THREE.Shape();
  const n = pts.length;
  if (n < 3) return shape;

  // Calculate signed area to check winding direction
  let signedArea = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x1 = pts[i].x - centerX;
    const y1 = pts[i].y - centerY;
    const x2 = pts[j].x - centerX;
    const y2 = pts[j].y - centerY;
    signedArea += (x1 * y2 - x2 * y1);
  }

  // Three.js ExtrudeGeometry expects COUNTER-CLOCKWISE winding for outer path shape.
  // In 2D plane with Y going UP, signedArea > 0 means CCW. If signedArea < 0 (CW), reverse.
  const pointsToUse = signedArea < 0 ? [...pts].reverse() : pts;

  pointsToUse.forEach((p, idx) => {
    const px = p.x - centerX;
    const py = p.y - centerY;
    if (idx === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  });

  const first = pointsToUse[0];
  shape.lineTo(first.x - centerX, first.y - centerY);

  return shape;
}

function pointToSegmentDistance(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) {
    return Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));
  }
  let t = ((x - x1) * dx + (y - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.sqrt((x - projX) * (x - projX) + (y - projY) * (y - projY));
}

function isPointInsideFootprint(
  x: number, z: number,
  isCustomPoly: boolean,
  activePolyPts: any[] | null,
  bounds: any,
  floorW: number, floorD: number, floorCenterX: number, floorCenterZ: number,
  margin: number = 0.4
): boolean {
  if (isCustomPoly && activePolyPts && bounds) {
    const gx = x + bounds.centerX;
    const gy = z + bounds.centerY;
    
    if (!isPointInPolygon(gx, gy, activePolyPts)) {
      return false;
    }
    
    const nPts = activePolyPts.length;
    for (let i = 0; i < nPts; i++) {
      const p1 = activePolyPts[i];
      const p2 = activePolyPts[(i + 1) % nPts];
      const dist = pointToSegmentDistance(gx, gy, p1.x, p1.y, p2.x, p2.y);
      if (dist < margin) {
        return false;
      }
    }
    return true;
  } else {
    const minX = floorCenterX - floorW / 2 + margin;
    const maxX = floorCenterX + floorW / 2 - margin;
    const minZ = floorCenterZ - floorD / 2 + margin;
    const maxZ = floorCenterZ + floorD / 2 - margin;
    return x >= minX && x <= maxX && z >= minZ && z <= maxZ;
  }
}

function getSafePoint(
  tx: number, tz: number, 
  cx: number, cz: number, 
  isCustomPoly: boolean, 
  activePolyPts: any[] | null, 
  bounds: any, 
  floorW: number, floorD: number, floorCenterX: number, floorCenterZ: number,
  margin: number = 0.4
): { x: number; z: number } {
  if (isPointInsideFootprint(tx, tz, isCustomPoly, activePolyPts, bounds, floorW, floorD, floorCenterX, floorCenterZ, margin)) {
    return { x: tx, z: tz };
  }
  
  let low = 0.0;
  let high = 1.0;
  let bestX = cx;
  let bestZ = cz;
  
  for (let iter = 0; iter < 12; iter++) {
    const mid = (low + high) / 2;
    const px = cx + (tx - cx) * mid;
    const pz = cz + (tz - cz) * mid;
    if (isPointInsideFootprint(px, pz, isCustomPoly, activePolyPts, bounds, floorW, floorD, floorCenterX, floorCenterZ, margin)) {
      bestX = px;
      bestZ = pz;
      low = mid;
    } else {
      high = mid;
    }
  }
  return { x: bestX, z: bestZ };
}

function createRectangularHipRoofGeometry(
  W: number,
  D: number,
  roofHeight: number,
  eavesOverhang: number = 0.35
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();

  const halfW = W / 2 + eavesOverhang;
  const halfD = D / 2 + eavesOverhang;

  // Eaves vertices at Y = 0
  const eFL = { x: -halfW, z: halfD };  // Front Left
  const eFR = { x: halfW, z: halfD };   // Front Right
  const eRL = { x: -halfW, z: -halfD }; // Rear Left
  const eRR = { x: halfW, z: -halfD };  // Rear Right

  // Ridge line endpoints at Y = roofHeight
  let r1: { x: number; z: number };
  let r2: { x: number; z: number };

  if (W >= D) {
    const ridgeHalfLen = Math.max(0.1, (W - D) / 2);
    r1 = { x: -ridgeHalfLen, z: 0 };
    r2 = { x: ridgeHalfLen, z: 0 };
  } else {
    const ridgeHalfLen = Math.max(0.1, (D - W) / 2);
    r1 = { x: 0, z: -ridgeHalfLen };
    r2 = { x: 0, z: ridgeHalfLen };
  }

  const positions: number[] = [];

  if (W >= D) {
    // Front face (trapezoid: eFL, eFR, r2, r1)
    positions.push(eFL.x, 0, eFL.z, eFR.x, 0, eFR.z, r2.x, roofHeight, r2.z);
    positions.push(eFL.x, 0, eFL.z, r2.x, roofHeight, r2.z, r1.x, roofHeight, r1.z);

    // Rear face (trapezoid: eRR, eRL, r1, r2)
    positions.push(eRR.x, 0, eRR.z, eRL.x, 0, eRL.z, r1.x, roofHeight, r1.z);
    positions.push(eRR.x, 0, eRR.z, r1.x, roofHeight, r1.z, r2.x, roofHeight, r2.z);

    // Left face (triangle: eRL, eFL, r1)
    positions.push(eRL.x, 0, eRL.z, eFL.x, 0, eFL.z, r1.x, roofHeight, r1.z);

    // Right face (triangle: eFR, eRR, r2)
    positions.push(eFR.x, 0, eFR.z, eRR.x, 0, eRR.z, r2.x, roofHeight, r2.z);
  } else {
    // Front face (triangle: eFL, eFR, r2)
    positions.push(eFL.x, 0, eFL.z, eFR.x, 0, eFR.z, r2.x, roofHeight, r2.z);

    // Rear face (triangle: eRR, eRL, r1)
    positions.push(eRR.x, 0, eRR.z, eRL.x, 0, eRL.z, r1.x, roofHeight, r1.z);

    // Left face (trapezoid: eRL, eFL, r2, r1)
    positions.push(eRL.x, 0, eRL.z, eFL.x, 0, eFL.z, r2.x, roofHeight, r2.z);
    positions.push(eRL.x, 0, eRL.z, r2.x, roofHeight, r2.z, r1.x, roofHeight, r1.z);

    // Right face (trapezoid: eFR, eRR, r1, r2)
    positions.push(eFR.x, 0, eFR.z, eRR.x, 0, eRR.z, r1.x, roofHeight, r1.z);
    positions.push(eFR.x, 0, eFR.z, r1.x, roofHeight, r1.z, r2.x, roofHeight, r2.z);
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();

  return geom;
}

function createOffsetPolygon(
  pts: Array<{ x: number; y: number }>,
  getDepthForEdge: (edgeIndex: number) => number
): Array<{ x: number; y: number }> {
  const n = pts.length;
  if (n < 3) return pts;

  let hasAnyOffset = false;
  for (let i = 0; i < n; i++) {
    if (getDepthForEdge(i) > 0.001) {
      hasAnyOffset = true;
      break;
    }
  }
  if (!hasAnyOffset) return pts;

  let signedArea = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    signedArea += (pts[i].x * pts[j].y - pts[j].x * pts[i].y);
  }
  const isCCW = signedArea > 0;

  interface Line2D {
    px: number;
    py: number;
    dx: number;
    dy: number;
    depth: number;
  }

  const lines: Line2D[] = [];
  for (let i = 0; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const ex = p2.x - p1.x;
    const ey = p2.y - p1.y;
    const len = Math.sqrt(ex * ex + ey * ey) || 1;
    const udx = ex / len;
    const udy = ey / len;

    // Outward normal: for CCW polygon, right perpendicular is (udy, -udx); for CW polygon, left perpendicular is (-udy, udx)
    const nx = isCCW ? udy : -udy;
    const ny = isCCW ? -udx : udx;

    const depth = Math.max(0, getDepthForEdge(i));
    lines.push({
      px: p1.x + nx * depth,
      py: p1.y + ny * depth,
      dx: udx,
      dy: udy,
      depth,
    });
  }

  const newPts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const prevIdx = (i - 1 + n) % n;
    const L1 = lines[prevIdx];
    const L2 = lines[i];

    const det = L1.dx * L2.dy - L1.dy * L2.dx;
    const origPt = pts[i];

    if (Math.abs(det) < 1e-4) {
      const avgDepth = (L1.depth + L2.depth) / 2;
      const nx = isCCW ? L2.dy : -L2.dy;
      const ny = isCCW ? -L2.dx : L2.dx;
      newPts.push({
        x: origPt.x + nx * avgDepth,
        y: origPt.y + ny * avgDepth,
      });
    } else {
      const dx = L2.px - L1.px;
      const dy = L2.py - L1.py;
      const t = (dx * L2.dy - dy * L2.dx) / det;
      let ix = L1.px + t * L1.dx;
      let iy = L1.py + t * L1.dy;

      const maxDist = Math.max(L1.depth, L2.depth) * 2.5;
      const distFromOrig = Math.sqrt((ix - origPt.x) ** 2 + (iy - origPt.y) ** 2);
      if (distFromOrig > maxDist && maxDist > 0) {
        const ratio = maxDist / distFromOrig;
        ix = origPt.x + (ix - origPt.x) * ratio;
        iy = origPt.y + (iy - origPt.y) * ratio;
      }

      newPts.push({
        x: Math.round(ix * 100) / 100,
        y: Math.round(iy * 100) / 100,
      });
    }
  }

  return newPts;
}

function createPolygonHipRoofGeometry(
  pts: Array<{ x: number; y: number }>,
  centerX: number,
  centerY: number,
  roofHeight: number,
  eavesOverhang: number = 0.35,
  ridgeInsetRatio: number = 0.25
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const n = pts.length;
  if (n < 3) return geom;

  // 1. Calculate polygon bounding box and span
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  pts.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });
  const width = maxX - minX;
  const depth = maxY - minY;
  const minSpan = Math.max(2, Math.min(width, depth));

  // 2. Winding order (signed area)
  let signedArea = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    signedArea += (pts[i].x * pts[j].y - pts[j].x * pts[i].y);
  }
  const isCCW = signedArea > 0;

  // 3. Edge vectors and inward unit normals
  const inwardNormals: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const dx = pts[next].x - pts[i].x;
    const dy = pts[next].y - pts[i].y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    if (isCCW) {
      inwardNormals.push({ x: -dy / len, y: dx / len });
    } else {
      inwardNormals.push({ x: dy / len, y: -dx / len });
    }
  }

  // 4. Eaves Points (at Y = 0)
  const eavesPts: Array<{ x: number; z: number }> = [];
  for (let i = 0; i < n; i++) {
    const prevIdx = (i - 1 + n) % n;
    const inPrev = inwardNormals[prevIdx];
    const inCurr = inwardNormals[i];

    const outPrev = { x: -inPrev.x, y: -inPrev.y };
    const outCurr = { x: -inCurr.x, y: -inCurr.y };

    let bisectX = outPrev.x + outCurr.x;
    let bisectY = outPrev.y + outCurr.y;
    const bLen = Math.sqrt(bisectX * bisectX + bisectY * bisectY) || 1;
    bisectX /= bLen;
    bisectY /= bLen;

    const dot = outPrev.x * outCurr.x + outPrev.y * outCurr.y;
    const sinHalf = Math.sqrt(Math.max(0.15, (1 + dot) / 2));
    const dist = Math.min(eavesOverhang * 1.5, eavesOverhang / sinHalf);

    eavesPts.push({
      x: (pts[i].x - centerX) + bisectX * dist,
      z: (pts[i].y - centerY) + bisectY * dist,
    });
  }

  // 5. Peak / Ridge Points (at Y = roofHeight)
  const ridgeInset = minSpan * ridgeInsetRatio;
  const peakPts: Array<{ x: number; z: number }> = [];
  for (let i = 0; i < n; i++) {
    const prevIdx = (i - 1 + n) % n;
    const inPrev = inwardNormals[prevIdx];
    const inCurr = inwardNormals[i];

    let bisectX = inPrev.x + inCurr.x;
    let bisectY = inPrev.y + inCurr.y;
    const bLen = Math.sqrt(bisectX * bisectX + bisectY * bisectY) || 1;
    bisectX /= bLen;
    bisectY /= bLen;

    const dot = inPrev.x * inCurr.x + inPrev.y * inCurr.y;
    const sinHalf = Math.sqrt(Math.max(0.15, (1 + dot) / 2));
    const dist = Math.min(minSpan * 0.42, ridgeInset / sinHalf);

    peakPts.push({
      x: (pts[i].x - centerX) + bisectX * dist,
      z: (pts[i].y - centerY) + bisectY * dist,
    });
  }

  // Helper function to push triangles with guaranteed upward/outward normal
  const positions: number[] = [];
  const pushTriangle = (
    p1: { x: number; y: number; z: number },
    p2: { x: number; y: number; z: number },
    p3: { x: number; y: number; z: number }
  ) => {
    const v1x = p2.x - p1.x, v1y = p2.y - p1.y, v1z = p2.z - p1.z;
    const v2x = p3.x - p1.x, v2y = p3.y - p1.y, v2z = p3.z - p1.z;
    const ny = v1z * v2x - v1x * v2z;

    if (ny < 0) {
      positions.push(p1.x, p1.y, p1.z);
      positions.push(p3.x, p3.y, p3.z);
      positions.push(p2.x, p2.y, p2.z);
    } else {
      positions.push(p1.x, p1.y, p1.z);
      positions.push(p2.x, p2.y, p2.z);
      positions.push(p3.x, p3.y, p3.z);
    }
  };

  // 6. Sloping Roof Faces
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;

    const e1 = { x: eavesPts[i].x, y: 0, z: eavesPts[i].z };
    const e2 = { x: eavesPts[next].x, y: 0, z: eavesPts[next].z };
    const p1 = { x: peakPts[i].x, y: roofHeight, z: peakPts[i].z };
    const p2 = { x: peakPts[next].x, y: roofHeight, z: peakPts[next].z };

    pushTriangle(e1, e2, p2);
    pushTriangle(e1, p2, p1);
  }

  // 7. Top Ridge Cap Triangulation
  for (let i = 1; i < n - 1; i++) {
    const p0 = { x: peakPts[0].x, y: roofHeight, z: peakPts[0].z };
    const p1 = { x: peakPts[i].x, y: roofHeight, z: peakPts[i].z };
    const p2 = { x: peakPts[i + 1].x, y: roofHeight, z: peakPts[i + 1].z };

    pushTriangle(p0, p1, p2);
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();

  return geom;
}

interface ThreeBuildingViewProps {
  params: BuildingModelParams;
  theme?: 'light' | 'gray' | 'dark';
  solarMode?: boolean;
  sunAltitude?: number;
  sunAzimuth?: number;
  sunTimeHour?: number;
  buildingRotation?: number;
  isSolarHeatmap?: boolean;
  forcedCameraPreset?: CameraPresetType;
  hideControls?: boolean;
  onUpdateColors?: (colors: { wallColor?: string; roofColor?: string; accentColor?: string; frameColor?: string; slabColor?: string }) => void;
  onUpdateFacadeStyle?: (style: FacadeStyleType) => void;
  onUpdateSunTimeHour?: (hour: number) => void;
  onUpdateBuildingRotation?: (rotation: number) => void;
  isPlayingSun?: boolean;
  onToggleSunPlay?: () => void;
}

export const ThreeBuildingView: React.FC<ThreeBuildingViewProps> = ({
  params,
  theme = 'light',
  solarMode = false,
  sunAltitude = 45,
  sunAzimuth = 180,
  sunTimeHour = 12.0,
  buildingRotation = 0,
  isSolarHeatmap = false,
  forcedCameraPreset,
  hideControls = false,
  onUpdateColors,
  onUpdateFacadeStyle,
  onUpdateSunTimeHour,
  onUpdateBuildingRotation,
  isPlayingSun = false,
  onToggleSunPlay,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const buildingGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sunSphereMeshRef = useRef<THREE.Mesh | null>(null);
  const compassGroupRef = useRef<THREE.Group | null>(null);
  const roadsGroupRef = useRef<THREE.Group | null>(null);

  // View settings
  const [explodeRatio, setExplodeRatio] = useState<number>(0);
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [showDebugOverlay, setShowDebugOverlay] = useState<boolean>(params.showDebugOverlay3D || false);
  const [selectedFloor, setSelectedFloor] = useState<number | 'all' | 'basement'>('all');
  const [cameraPreset, setCameraPreset] = useState<CameraPresetType>(forcedCameraPreset || 'iso');
  const [showStreetNames, setShowStreetNames] = useState<boolean>(false);
  const [buildingColor, setBuildingColor] = useState<string>('');
  const [isExportingUSDZ, setIsExportingUSDZ] = useState<boolean>(false);
  const [isExportingGLTF, setIsExportingGLTF] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [isColorQuickPickerOpen, setIsColorQuickPickerOpen] = useState<boolean>(false);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true); // Cinematic tour mode
  const [isMaps3DOpen, setIsMaps3DOpen] = useState<boolean>(false);

  const isGray = theme === 'gray';
  const isLight = !isGray;

  // Helper to parse hex colors
  const parseHexColor = (hex?: string, fallback: number = 0xf1f5f9): number => {
    if (!hex) return fallback;
    const clean = hex.replace('#', '').trim();
    const num = parseInt(clean, 16);
    return isNaN(num) ? fallback : num;
  };

  // Construct 3D Building Geometry with Rooms, Duplex, Mansard & Cut Modes
  const buildScene = useCallback(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Remove existing building group
    if (buildingGroupRef.current) {
      scene.remove(buildingGroupRef.current);
      buildingGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    const buildingGroup = new THREE.Group();
    buildingGroupRef.current = buildingGroup;

    const colors = {
      wall: parseHexColor(buildingColor || params.wallColor, 0xf1f5f9),
      roof: parseHexColor(params.roofColor, 0xb91c1c),
      woodAccent: parseHexColor(params.accentColor, 0xb5734c),
      slab: parseHexColor(params.slabColor, 0xcbd5e1),
      frame: parseHexColor(params.frameColor, 0x18181b),
      glass: parseHexColor(params.glassColor, 0xbae6fd),
      column: 0x475569,
      balcony: parseHexColor(params.accentColor, 0x18181b),
    };
    let W = safeNum(params?.facadeWidth, 14.0, 1.0);
    let D = safeNum(params?.facadeDepth, 18.0, 1.0);

    const isPolygonDraw = params.footprintInputMode === 'polygonDraw' && !!params.polygonPoints && params.polygonPoints.length >= 3;
    const isLShapeMode = params.footprintInputMode === 'lShape';

    // Check if 4 facades form a non-rectangular / skewed quadrilateral
    const quadInfo = buildQuadrilateralPolygon(
      params.facadeWidth || 10.0,
      params.facadeDepth || 10.0,
      params.backFacadeLength,
      params.leftFacadeLength
    );

    let activePolyPts: Array<{ id?: string; x: number; y: number }> | null = null;
    if (isPolygonDraw) {
      activePolyPts = params.polygonPoints!;
    } else if (isLShapeMode) {
      const front = safeNum(params?.lShapeFrontMain, 16.0, 2.0);
      const depth = safeNum(params?.lShapeDepthMain, 20.0, 2.0);
      const recFront = safeNum(params?.lShapeRecessFront, 6.0, 1.0);
      const recDepth = safeNum(params?.lShapeRecessDepth, 8.0, 1.0);

      activePolyPts = [
        { id: 'l1', x: -front / 2, y: -depth / 2 },
        { id: 'l2', x: front / 2, y: -depth / 2 },
        { id: 'l3', x: front / 2, y: depth / 2 - recDepth },
        { id: 'l4', x: front / 2 - recFront, y: depth / 2 - recDepth },
        { id: 'l5', x: front / 2 - recFront, y: depth / 2 },
        { id: 'l6', x: -front / 2, y: depth / 2 },
      ];
    } else if (quadInfo.isSkewed) {
      // Skewed 4-facade geometry (trapezoid / non-rectangular building mass)
      activePolyPts = (params.polygonPoints && params.polygonPoints.length >= 3)
        ? params.polygonPoints
        : quadInfo.polygonPoints;
    } else if (params.polygonPoints && params.polygonPoints.length >= 3 && params.footprintInputMode === 'customFacades') {
      activePolyPts = params.polygonPoints;
    }

    const isCustomPoly = !!activePolyPts && activePolyPts.length >= 3;

    if (isCustomPoly && activePolyPts) {
      const bounds = getPolygonBounds(activePolyPts);
      W = bounds.width;
      D = bounds.depth;
    }

    const H = safeNum(params?.floorHeight, 2.95, 1.5);
    const N = Math.max(1, Math.round(safeNum(params?.floorCount, 5, 1)));
    const B = Math.max(0, Math.round(safeNum(params?.basementCount, 1, 0)));
    const sW = safeNum(params?.stairWidth, 2.6, 0.5);
    const sD = safeNum(params?.stairDepth, 4.8, 0.5);
    const eW = safeNum(params?.elevatorWidth, 1.8, 0.5);
    const eD = safeNum(params?.elevatorDepth, 2.0, 0.5);
    const bD = safeNum(params?.balconyDepth, 1.4, 0.2);
    const roofType = params?.roofType || 'gable';
    const interiorCutMode = params?.interiorCutMode || 'solid';
    const showFurniture = params?.showFurniture ?? true;
    const flatsPerFloor = safeNum(params?.flatsPerFloor, 2, 1);
    const hasGroundFloorShop = params?.hasGroundFloorShop ?? false;
    const shopCount = Math.max(1, Math.round(safeNum(params?.shopCount, 1, 1)));
    const shopHeight = safeNum(params?.shopHeight, 3.8, 2.0);
    const hasCantilever = params?.hasCantilever ?? false;
    const cantileverDepth = safeNum(params?.cantileverDepth, 1.2, 0.2);
    const cantileverDirection = params?.cantileverDirection || 'front_back';
    const facadeCantilevers = params?.facadeCantilevers;

    // Helper to get cantilever depth for a specific facade
    // KURAL: Tabla çıkması KÖR CEPHELERDE ve BİTİŞİK NİZAM (yangın duvarı) yüzeylerde kesinlikle yapılamaz!
    const isBlindFacade = (idx: number) => {
      const cfg = params?.facadeConfigs?.[idx];
      return cfg && (cfg.windowCountPerFloor === 0 || (cfg as any).isBlankWall === true || (cfg as any).isAdjacent === true);
    };

    const getFacadeCantilever = (idx: number) => {
      if (isBlindFacade(idx)) return 0;
      if (facadeCantilevers && facadeCantilevers[idx] !== undefined) return Math.max(0, facadeCantilevers[idx]);
      if (cantileverDirection === 'all' || cantileverDirection === 'open_facades') return cantileverDepth;
      if (cantileverDirection === 'front_back' && (idx === 0 || idx === 2)) return cantileverDepth;
      if (cantileverDirection === 'front' && idx === 0) return cantileverDepth;
      return 0;
    };

    const cF = getFacadeCantilever(0); // +Z
    const cR = getFacadeCantilever(1); // +X
    const cB = getFacadeCantilever(2); // -Z
    const cL = getFacadeCantilever(3); // -X

    const isXRay = interiorCutMode === 'xray';
    const isCutaway = interiorCutMode === 'cutaway';

    // Materials
    const slabMaterial = new THREE.MeshStandardMaterial({
      color: colors.slab,
      roughness: 0.8,
      metalness: 0.1,
      wireframe: isWireframe,
      side: THREE.DoubleSide,
    });

    // Exterior Wall Material (Transparent in X-Ray mode so rooms are visible!)
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: isXRay ? (isLight ? 0x94a3b8 : 0x38bdf8) : colors.wall,
      roughness: 0.6,
      metalness: 0.1,
      wireframe: isWireframe,
      transparent: isXRay,
      opacity: isXRay ? 0.18 : 1.0,
      depthWrite: !isXRay,
    });

    const woodMaterial = new THREE.MeshStandardMaterial({
      color: colors.woodAccent,
      roughness: 0.5,
      metalness: 0.1,
      wireframe: isWireframe,
      transparent: isXRay,
      opacity: isXRay ? 0.22 : 1.0,
      depthWrite: !isXRay,
    });

    const columnMaterial = new THREE.MeshStandardMaterial({
      color: colors.column,
      roughness: 0.7,
      metalness: 0.2,
      wireframe: isWireframe,
      transparent: isXRay,
      opacity: isXRay ? 0.45 : 1.0,
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.95,
      thickness: 0.5,
      transparent: true,
      opacity: isXRay ? 0.25 : 0.6,
      reflectivity: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      wireframe: isWireframe,
    });

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: colors.frame,
      roughness: 0.2,
      metalness: 0.8
    });

    // Turkish Architectural Balcony Materials
    const glassBalconyMat = new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      roughness: 0.08,
      metalness: 0.2,
      transmission: 0.85,
      thickness: 0.4,
      transparent: true,
      opacity: isXRay ? 0.3 : 0.65,
      clearcoat: 1.0,
      wireframe: isWireframe,
    });

    const antraciteAluminumMat = new THREE.MeshStandardMaterial({
      color: 0x27272a, // RAL 7016 Antrasit profil
      roughness: 0.35,
      metalness: 0.6,
    });

    const cumbaTrimMat = new THREE.MeshStandardMaterial({
      color: 0x78350f, // Sıcak ahşap / kompozit detay
      roughness: 0.55,
    });

    // Interior Partition Walls Material (Solid and crisp!)
    const interiorWallMat = new THREE.MeshStandardMaterial({
      color: isLight ? 0xe2e8f0 : 0xd4d4d8,
      roughness: 0.85,
      metalness: 0.05,
      wireframe: isWireframe,
    });

    const interiorDoorFrameMat = new THREE.MeshStandardMaterial({
      color: 0x854d0e, // Warm wood door frame
      roughness: 0.6,
    });

    // Room Floor Zone Materials
    const salonFloorMat = new THREE.MeshStandardMaterial({
      color: 0xb45309, // Warm Oak parquet
      roughness: 0.6,
    });
    const roomFloorMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Natural light maple parquet
      roughness: 0.65,
    });
    const bathFloorMat = new THREE.MeshStandardMaterial({
      color: 0x0f766e, // Teal ceramic tile
      roughness: 0.3,
    });
    const kitchenFloorMat = new THREE.MeshStandardMaterial({
      color: 0x71717a, // Grey porcelain slab
      roughness: 0.4,
    });

    // Furniture Materials
    const sofaMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb, // Royal Blue fabric
      roughness: 0.8,
    });
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Crisp white linens
      roughness: 0.7,
    });
    const woodFurnitureMat = new THREE.MeshStandardMaterial({
      color: 0x78350f, // Walnut
      roughness: 0.5,
    });
    const kitchenCounterMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Charcoal quartz countertop
      roughness: 0.25,
      metalness: 0.3,
    });
    const sanitaryMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.1,
    });

    // Commercial Shop Materials
    const commercialFloorMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Polished slate grey terrazzo
      roughness: 0.25,
      metalness: 0.1,
    });
    const shopSignFasciaMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Dark anthracite fascia band
      roughness: 0.3,
      metalness: 0.4,
    });
    const shopSignGlowMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa, // Illuminated LED blue-white sign
    });
    const shopCounterMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Modern commercial retail desk
      roughness: 0.3,
      metalness: 0.2,
    });
    const shopSpotlightMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a, // Warm yellow ceiling spot
    });
    const soffitMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Dark composite soffit under cantilever
      roughness: 0.4,
      metalness: 0.2,
    });
    const downlightMat = new THREE.MeshBasicMaterial({
      color: 0xfef3c7, // Warm white downlight
    });

    // Floor thickness
    const slabThickness = 0.25;
    const colSize = 0.45;
    const totalFloors = N + B;

    // Pre-calculate floor heights and base Y positions to support taller ground floor shop
    const floorHeights: number[] = [];
    const floorBaseYs: number[] = [];

    // First populate heights
    for (let f = 0; f < totalFloors; f++) {
      const isBasement = f < B;
      const floorIndex = f - B;
      const isShop = !isBasement && floorIndex === 0 && hasGroundFloorShop;
      const fh = isShop ? shopHeight : H;
      floorHeights.push(fh);
    }

    // Now calculate baseY relative to ground floor (index B) at Y = 0
    for (let f = 0; f < totalFloors; f++) {
      let heightOffset = 0;
      if (f >= B) {
        // Above or at ground level
        for (let i = B; i < f; i++) {
          heightOffset += floorHeights[i];
        }
      } else {
        // Below ground level (basements)
        for (let i = f; i < B; i++) {
          heightOffset -= floorHeights[i];
        }
      }
      const explodeOffset = (f - B) * (explodeRatio * 4.5);
      floorBaseYs.push(heightOffset + explodeOffset);
    }

    for (let f = 0; f < totalFloors; f++) {
      const isBasement = f < B;
      const floorIndex = f - B; // 0 = Ground floor, 1 = 1st floor...
      const isShopFloor = !isBasement && floorIndex === 0 && hasGroundFloorShop;
      const isTopFloor = f === totalFloors - 1;
      const currentFloorH = floorHeights[f];
      const isVisible =
        selectedFloor === 'all' ||
        (selectedFloor === 'basement' && isBasement) ||
        selectedFloor === floorIndex;

      if (!isVisible) continue;

      const floorGroup = new THREE.Group();
      floorGroup.name = `Floor_${floorIndex}`;

      // Calculate base Y position with explosion factor
      const baseY = floorBaseYs[f];

      // Determine floor dimensions accounting for cantilevers on upper floors
      let floorW = W;
      let floorD = D;
      let floorCenterX = 0;
      let floorCenterZ = 0;

      const isCantileverFloor = !isBasement && floorIndex >= 1 && hasCantilever;
      if (isCantileverFloor) {
        floorW = W + cR + cL;
        floorD = D + cF + cB;
        floorCenterX = (cR - cL) / 2;
        floorCenterZ = (cF - cB) / 2;
      }

      // 1. FLOOR SLAB (Döşeme Betonu)
      let slabGeo: THREE.BufferGeometry;
      let slabMesh: THREE.Mesh;
      const currentFloorPts = (isCustomPoly && activePolyPts)
        ? (isCantileverFloor ? createOffsetPolygon(activePolyPts, (i) => getFacadeCantilever(i)) : activePolyPts)
        : null;

      if (isCustomPoly && currentFloorPts) {
        const bounds = getPolygonBounds(currentFloorPts);
        const shape = createShapeFromPolygon(currentFloorPts, bounds.centerX, bounds.centerY);

        slabGeo = new THREE.ExtrudeGeometry(shape, { depth: slabThickness, bevelEnabled: false });
        slabMesh = new THREE.Mesh(slabGeo, isShopFloor ? commercialFloorMat : slabMaterial);
        
        slabMesh.rotation.x = Math.PI / 2;
        slabMesh.position.set(0, baseY + slabThickness, 0);
      } else {
        slabGeo = safeBox(floorW, slabThickness, floorD);
        slabMesh = new THREE.Mesh(slabGeo, isShopFloor ? commercialFloorMat : slabMaterial);
        slabMesh.position.set(floorCenterX, baseY + slabThickness / 2, floorCenterZ);
      }
      
      slabMesh.castShadow = true;
      slabMesh.receiveShadow = true;
      floorGroup.add(slabMesh);

      // Under-slab Cantilever Soffit (Konsol Altı Kaplama) on 1st Floor
      if (hasCantilever && floorIndex === 1) {
        if (isCustomPoly && currentFloorPts) {
          const bounds = getPolygonBounds(currentFloorPts);
          const cShape = createShapeFromPolygon(currentFloorPts, bounds.centerX, bounds.centerY);
          const soffitGeo = new THREE.ExtrudeGeometry(cShape, { depth: 0.08, bevelEnabled: false });
          const soffitMesh = new THREE.Mesh(soffitGeo, soffitMaterial);
          soffitMesh.rotation.x = Math.PI / 2;
          soffitMesh.position.set(0, baseY + 0.04, 0);
          floorGroup.add(soffitMesh);
        } else {
          const soffitGeo = safeBox(floorW, 0.08, floorD);
          const soffitMesh = new THREE.Mesh(soffitGeo, soffitMaterial);
          soffitMesh.position.set(floorCenterX, baseY - 0.04, floorCenterZ);
          floorGroup.add(soffitMesh);

          // Recessed downlights under cantilever overhang
          const dlCount = Math.max(3, Math.floor(floorW / 2.5));
          for (let d = 0; d < dlCount; d++) {
            const dlX = floorCenterX - floorW / 2 + (floorW / (dlCount + 1)) * (d + 1);
            const dlMesh = new THREE.Mesh(
              safeCylinder(0.12, 0.12, 0.04, 12),
              downlightMat
            );
            dlMesh.position.set(dlX, baseY - 0.07, floorCenterZ + floorD / 2 - 0.4);
            floorGroup.add(dlMesh);
          }
        }
      }

      // Ceiling slab (Kat Tablası) if top floor or when floor is isolated
      const shouldRenderTopSlab = isTopFloor || (selectedFloor !== 'all' && !isCutaway);
      if (shouldRenderTopSlab) {
        const topSlab = new THREE.Mesh(slabGeo, slabMaterial);
        if (isCustomPoly) {
          topSlab.rotation.x = Math.PI / 2;
          topSlab.position.set(0, baseY + currentFloorH + slabThickness, 0);
        } else {
          topSlab.position.set(floorCenterX, baseY + currentFloorH, floorCenterZ);
        }
        topSlab.castShadow = true;
        floorGroup.add(topSlab);
      }

      const roomHeight = currentFloorH - slabThickness;
      const midY = baseY + slabThickness + roomHeight / 2;

      // 2. COLUMNS (Taşıyıcı Kolonlar)
      const colGeo = safeBox(colSize, roomHeight, colSize);
      if (isCustomPoly && activePolyPts) {
        const bounds = getPolygonBounds(activePolyPts);
        const edges = getPolygonEdges(activePolyPts);
        const nPts = activePolyPts.length;

        // Calculate signed area to know winding direction
        let signedArea = 0;
        for (let i = 0; i < nPts; i++) {
          const j = (i + 1) % nPts;
          signedArea += (activePolyPts[i].x * activePolyPts[j].y - activePolyPts[j].x * activePolyPts[i].y);
        }
        const isCW = signedArea > 0;

        // A. Corner Structural Columns along true inward angle bisector
        activePolyPts.forEach((p: any, i: number) => {
          const px = p.x - bounds.centerX;
          const pz = p.y - bounds.centerY;

          const pPrev = activePolyPts[(i - 1 + nPts) % nPts];
          const pNext = activePolyPts[(i + 1) % nPts];

          // Edge 1 vector & inward normal
          const dx1 = p.x - pPrev.x, dy1 = p.y - pPrev.y;
          const l1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
          const inN1X = isCW ? dy1 / l1 : -dy1 / l1;
          const inN1Z = isCW ? -dx1 / l1 : dx1 / l1;

          // Edge 2 vector & inward normal
          const dx2 = pNext.x - p.x, dy2 = pNext.y - p.y;
          const l2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
          const inN2X = isCW ? dy2 / l2 : -dy2 / l2;
          const inN2Z = isCW ? -dx2 / l2 : dx2 / l2;

          // Bisector vector
          let bisectX = (inN1X + inN2X) / 2;
          let bisectZ = (inN1Z + inN2Z) / 2;
          const bLen = Math.sqrt(bisectX * bisectX + bisectZ * bisectZ) || 1;
          bisectX /= bLen;
          bisectZ /= bLen;

          const colX = px + bisectX * (colSize * 0.45);
          const colZ = pz + bisectZ * (colSize * 0.45);

          const colMesh = new THREE.Mesh(colGeo, columnMaterial);
          colMesh.position.set(colX, midY, colZ);
          colMesh.castShadow = true;
          floorGroup.add(colMesh);
        });

        // B. Internal Structural Skeleton Columns (Inside Polygon)
        const gridStepX = Math.max(4.0, bounds.width / 3);
        const gridStepZ = Math.max(4.0, bounds.depth / 3);
        for (let gx = bounds.minX + gridStepX; gx < bounds.maxX - 1.0; gx += gridStepX) {
          for (let gy = bounds.minY + gridStepZ; gy < bounds.maxY - 1.0; gy += gridStepZ) {
            if (isPointInPolygon(gx, gy, activePolyPts)) {
              let farEnough = true;
              for (const edge of edges) {
                const x1 = edge.start.x, y1 = edge.start.y;
                const x2 = edge.end.x, y2 = edge.end.y;
                const C = x2 - x1, D = y2 - y1;
                const lenSq = C * C + D * D;
                let param = lenSq !== 0 ? ((gx - x1) * C + (gy - y1) * D) / lenSq : -1;
                let xx = param < 0 ? x1 : (param > 1 ? x2 : x1 + param * C);
                let yy = param < 0 ? y1 : (param > 1 ? y2 : y1 + param * D);
                const dist = Math.sqrt((gx - xx) * (gx - xx) + (gy - yy) * (gy - yy));
                if (dist < 1.3) {
                  farEnough = false;
                  break;
                }
              }
              if (farEnough) {
                const colMesh = new THREE.Mesh(colGeo, columnMaterial);
                colMesh.position.set(gx - bounds.centerX, midY, gy - bounds.centerY);
                colMesh.castShadow = true;
                floorGroup.add(colMesh);
              }
            }
          }
        }
      } else {
        const colXCoords = [-floorW / 2 + colSize / 2, 0, floorW / 2 - colSize / 2];
        const colZCoords = [floorCenterZ - floorD / 2 + colSize / 2, floorCenterZ, floorCenterZ + floorD / 2 - colSize / 2];

        colXCoords.forEach((cx) => {
          colZCoords.forEach((cz) => {
            const colMesh = new THREE.Mesh(colGeo, columnMaterial);
            colMesh.position.set(cx, midY, cz);
            colMesh.castShadow = true;
            floorGroup.add(colMesh);
          });
        });
      }

      // 3. CORE: STAIRCASE & ELEVATOR SHAFT (Merdiven ve Asansör Çekirdeği)
      let coreCenterX = 0;
      let coreCenterZ = 0;
      const bounds = isCustomPoly && activePolyPts ? getPolygonBounds(activePolyPts) : null;

      if (isCustomPoly && activePolyPts && bounds) {
        const centroid = getPolygonCentroid(activePolyPts);
        if (isPointInPolygon(centroid.x, centroid.y, activePolyPts)) {
          coreCenterX = centroid.x - bounds.centerX;
          coreCenterZ = centroid.y - bounds.centerY;
        }
      }

      if (params.coreOffsetX !== undefined && !isNaN(params.coreOffsetX)) {
        coreCenterX += params.coreOffsetX;
      }
      if (params.coreOffsetY !== undefined && !isNaN(params.coreOffsetY)) {
        coreCenterZ += params.coreOffsetY;
      }

      // Shift core and scale dynamically to NEVER overflow building footprint limits!
      let safeCoreCenterX = coreCenterX;
      let safeCoreCenterZ = coreCenterZ;
      let safeSW = sW;
      let safeSD = sD;
      let safeEW = eW;
      let safeED = eD;
      let safeHallDist = 1.2;

      const minSW = 1.5;
      const minSD = 3.2;
      const minEW = 1.0;
      const minED = 1.0;
      const minHall = 0.8;

      const buildingCentroidX = isCustomPoly && activePolyPts && bounds ? (getPolygonCentroid(activePolyPts).x - bounds.centerX) : 0;
      const buildingCentroidZ = isCustomPoly && activePolyPts && bounds ? (getPolygonCentroid(activePolyPts).y - bounds.centerY) : floorCenterZ;

      // Iteratively shrink core and shift towards building centroid if it overflows
      for (let scaleIter = 0; scaleIter < 12; scaleIter++) {
        const minX = safeCoreCenterX - safeSW - 0.4;
        const maxX = safeCoreCenterX + safeSW / 2 + safeEW + 0.4;
        const minZ = safeCoreCenterZ - Math.max(safeSD, safeED) / 2 - safeHallDist;
        const maxZ = safeCoreCenterZ + Math.max(safeSD, safeED) / 2 + safeHallDist;

        // Check 4 corners of bounds
        const c1 = isPointInsideFootprint(minX, minZ, isCustomPoly, activePolyPts, bounds, floorW, floorD, floorCenterX, floorCenterZ, 0.22);
        const c2 = isPointInsideFootprint(maxX, minZ, isCustomPoly, activePolyPts, bounds, floorW, floorD, floorCenterX, floorCenterZ, 0.22);
        const c3 = isPointInsideFootprint(minX, maxZ, isCustomPoly, activePolyPts, bounds, floorW, floorD, floorCenterX, floorCenterZ, 0.22);
        const c4 = isPointInsideFootprint(maxX, maxZ, isCustomPoly, activePolyPts, bounds, floorW, floorD, floorCenterX, floorCenterZ, 0.22);

        if (c1 && c2 && c3 && c4) {
          break; // Fitting perfectly!
        }

        // Shift towards safe centroid
        safeCoreCenterX = safeCoreCenterX * 0.75 + buildingCentroidX * 0.25;
        safeCoreCenterZ = safeCoreCenterZ * 0.75 + buildingCentroidZ * 0.25;

        // Shrink dimensions safely
        safeSW = Math.max(minSW, safeSW * 0.9);
        safeSD = Math.max(minSD, safeSD * 0.9);
        safeEW = Math.max(minEW, safeEW * 0.9);
        safeED = Math.max(minED, safeED * 0.9);
        safeHallDist = Math.max(minHall, safeHallDist * 0.9);
      }

      // 4. INTERIOR ROOMS & PARTITION WALLS (İç Mekan & Bölmeler)
      if (isShopFloor) {
        // COMMERCIAL SHOP INTERIOR (ZEMİN KAT TİCARİ MAĞAZA / DÜKKAN İÇİ)
        if (!isCustomPoly) {
          const shopFloorGeo = safeBox(floorW - 0.4, 0.02, floorD - 0.4);
          const shopFloorMesh = new THREE.Mesh(shopFloorGeo, commercialFloorMat);
          shopFloorMesh.position.set(0, baseY + slabThickness + 0.01, floorCenterZ);
          floorGroup.add(shopFloorMesh);
        }

        // Commercial partition if shopCount > 1
        if (shopCount > 1 && !isCustomPoly) {
          const divThick = 0.2;
          const divGeo = safeBox(divThick, roomHeight, floorD - 1.2);
          const divMesh = new THREE.Mesh(divGeo, interiorWallMat);
          divMesh.position.set(0, midY, floorCenterZ - 0.4);
          divMesh.castShadow = true;
          floorGroup.add(divMesh);
        }

        // Retail Checkout Counters / Reception Desks
        const activeShops = Math.min(2, shopCount);
        for (let s = 0; s < activeShops; s++) {
          const sSign = activeShops === 1 ? 0 : s === 0 ? -1 : 1;
          const deskX = sSign * (floorW * 0.28);
          const deskZ = floorCenterZ - floorD * 0.15;

          if (isCustomPoly && activePolyPts) {
            const bounds = getPolygonBounds(activePolyPts);
            if (!isPointInPolygon(deskX + bounds.centerX, deskZ + bounds.centerY, activePolyPts)) {
              continue;
            }
          }

          // Counter
          const counterGeo = safeBox(2.4, 1.1, 0.9);
          const counterMesh = new THREE.Mesh(counterGeo, shopCounterMat);
          counterMesh.position.set(deskX, baseY + slabThickness + 0.55, deskZ);
          counterMesh.castShadow = true;
          floorGroup.add(counterMesh);

          // POS display
          const posGeo = safeBox(0.4, 0.35, 0.1);
          const posMesh = new THREE.Mesh(posGeo, frameMaterial);
          posMesh.position.set(deskX, baseY + slabThickness + 1.28, deskZ);
          floorGroup.add(posMesh);

          // Display Islands in Showroom
          const islandGeo = safeBox(1.6, 0.8, 1.2);
          const islandMesh = new THREE.Mesh(islandGeo, woodFurnitureMat);
          islandMesh.position.set(deskX, baseY + slabThickness + 0.4, floorCenterZ + floorD * 0.12);
          islandMesh.castShadow = true;
          floorGroup.add(islandMesh);

          // Ceiling Track Lighting
          const trackGeo = safeBox(floorW * 0.35, 0.08, 0.08);
          const trackMesh = new THREE.Mesh(trackGeo, frameMaterial);
          trackMesh.position.set(deskX, baseY + currentFloorH - 0.2, floorCenterZ);
          floorGroup.add(trackMesh);

          for (let sp = -1; sp <= 1; sp++) {
            const spotMesh = new THREE.Mesh(
              safeCylinder(0.08, 0.12, 0.15, 8),
              shopSpotlightMat
            );
            spotMesh.position.set(deskX + sp * 0.9, baseY + currentFloorH - 0.3, floorCenterZ);
            floorGroup.add(spotMesh);
          }
        }
      } else if (!isBasement) {
        const intWallThick = 0.12;
        const intWallH = roomHeight;
        const floorFinishY = baseY + slabThickness + 0.02;

        const addInterior = (obj: THREE.Object3D, lx: number, lz: number) => {
          if (isCustomPoly && activePolyPts) {
            const bounds = getPolygonBounds(activePolyPts);
            if (!isPointInPolygon(lx + bounds.centerX, lz + bounds.centerY, activePolyPts)) {
              return;
            }
          }
          obj.position.x = lx;
          obj.position.z = lz;
          floorGroup.add(obj);
        };

        if (isCustomPoly && currentFloorPts) {
          const bounds = getPolygonBounds(currentFloorPts);
          const shape = createShapeFromPolygon(currentFloorPts, bounds.centerX, bounds.centerY);
          const finishGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
          const finishMesh = new THREE.Mesh(finishGeo, salonFloorMat);
          finishMesh.rotation.x = Math.PI / 2;
          finishMesh.position.set(0, floorFinishY + 0.01, 0);
          finishMesh.receiveShadow = true;
          floorGroup.add(finishMesh);
        } else if (!isCustomPoly) {
          const finishGeo = safeBox(floorW - 0.2, 0.02, floorD - 0.2);
          const finishMesh = new THREE.Mesh(finishGeo, salonFloorMat);
          finishMesh.position.set(floorCenterX, floorFinishY + 0.01, floorCenterZ);
          finishMesh.receiveShadow = true;
          floorGroup.add(finishMesh);
        }

        // Function to create a wall segment with an optional door opening
        const createWallWithDoor = (
          length: number,
          isAlongX: boolean,
          centerX: number,
          centerZ: number,
          hasDoor: boolean = false,
          doorOffset: number = 0
        ) => {
          let x1 = isAlongX ? (centerX - length / 2) : centerX;
          let z1 = isAlongX ? centerZ : (centerZ - length / 2);
          let x2 = isAlongX ? (centerX + length / 2) : centerX;
          let z2 = isAlongX ? centerZ : (centerZ + length / 2);

          const p1Safe = getSafePoint(x1, z1, buildingCentroidX, buildingCentroidZ, isCustomPoly, activePolyPts, bounds, floorW, floorD, floorCenterX, floorCenterZ, 0.22);
          const p2Safe = getSafePoint(x2, z2, buildingCentroidX, buildingCentroidZ, isCustomPoly, activePolyPts, bounds, floorW, floorD, floorCenterX, floorCenterZ, 0.22);

          // Re-calculate actual safe length and center
          const newCenterX = (p1Safe.x + p2Safe.x) / 2;
          const newCenterZ = (p1Safe.z + p2Safe.z) / 2;
          const newLength = Math.sqrt((p1Safe.x - p2Safe.x) ** 2 + (p1Safe.z - p2Safe.z) ** 2);

          if (newLength < 0.2) {
            return; // Too small/outside to render
          }

          if (!hasDoor) {
            const wGeo = isAlongX
              ? safeBox(newLength, intWallH, intWallThick)
              : safeBox(intWallThick, intWallH, newLength);
            const wMesh = new THREE.Mesh(wGeo, interiorWallMat);
            wMesh.position.set(newCenterX, midY, newCenterZ);
            wMesh.castShadow = true;
            wMesh.receiveShadow = true;
            floorGroup.add(wMesh);
            return;
          }

          // Wall with 0.9m wide x 2.1m high doorway
          const doorW = 0.9;
          const doorH = Math.min(2.1, intWallH * 0.85);
          const leftLen = Math.max(0.2, (newLength - doorW) / 2 + doorOffset);
          const rightLen = Math.max(0.2, newLength - doorW - leftLen);

          // Left wall chunk
          if (isAlongX) {
            const leftGeo = safeBox(leftLen, intWallH, intWallThick);
            const leftM = new THREE.Mesh(leftGeo, interiorWallMat);
            leftM.position.set(newCenterX - newLength / 2 + leftLen / 2, midY, newCenterZ);
            floorGroup.add(leftM);

            const rightGeo = safeBox(rightLen, intWallH, intWallThick);
            const rightM = new THREE.Mesh(rightGeo, interiorWallMat);
            rightM.position.set(newCenterX + newLength / 2 - rightLen / 2, midY, newCenterZ);
            floorGroup.add(rightM);

            // Lintel over door
            const lintelH = intWallH - doorH;
            if (lintelH > 0.05) {
              const lintelGeo = safeBox(doorW, lintelH, intWallThick);
              const lintelM = new THREE.Mesh(lintelGeo, interiorWallMat);
              lintelM.position.set(
                newCenterX - newLength / 2 + leftLen + doorW / 2,
                baseY + slabThickness + doorH + lintelH / 2,
                newCenterZ
              );
              floorGroup.add(lintelM);
            }
          } else {
            const leftGeo = safeBox(intWallThick, intWallH, leftLen);
            const leftM = new THREE.Mesh(leftGeo, interiorWallMat);
            leftM.position.set(newCenterX, midY, newCenterZ - newLength / 2 + leftLen / 2);
            floorGroup.add(leftM);

            const rightGeo = safeBox(intWallThick, intWallH, rightLen);
            const rightM = new THREE.Mesh(rightGeo, interiorWallMat);
            rightM.position.set(newCenterX, midY, newCenterZ + newLength / 2 - rightLen / 2);
            floorGroup.add(rightM);

            const lintelH = intWallH - doorH;
            if (lintelH > 0.05) {
              const lintelGeo = safeBox(intWallThick, lintelH, doorW);
              const lintelM = new THREE.Mesh(lintelGeo, interiorWallMat);
              lintelM.position.set(
                newCenterX,
                baseY + slabThickness + doorH + lintelH / 2,
                newCenterZ - newLength / 2 + leftLen + doorW / 2
              );
              floorGroup.add(lintelM);
            }
          }
        };

        // Layout the apartments dynamically based on flatsPerFloor:
        const coreHallDistZ = safeSD / 2 + safeHallDist;
        const isGroundFloor = floorIndex === 0;

        if (isGroundFloor && !isShopFloor) {
          // ================= LOBBY & GROUND FLOOR ENTRANCE (Giriş Holü, Rüzgarlık, Posta Kutuları) =================
          const mainEntranceIdx = params.mainEntranceFacadeIndex || 0;
          
          const lobbyFloorMat = new THREE.MeshStandardMaterial({
            color: 0xf1f5f9,
            roughness: 0.1,
            metalness: 0.1,
          });

          // Width of the lobby path
          const lobbyW = 3.0;

          if (mainEntranceIdx === 0) {
            // FRONT FACADE ENTRANCE
            const pathStartZ = safeCoreCenterZ + safeSD / 2;
            const pathEndZ = floorCenterZ + D / 2;
            const pathLength = Math.max(1.0, pathEndZ - pathStartZ);
            const pathCenterZ = pathStartZ + pathLength / 2;

            if (!isCustomPoly) {
              const lobbyFloor = new THREE.Mesh(safeBox(lobbyW, 0.02, pathLength), lobbyFloorMat);
              lobbyFloor.position.set(safeCoreCenterX, floorFinishY, pathCenterZ);
              lobbyFloor.receiveShadow = true;
              floorGroup.add(lobbyFloor);
            }

            createWallWithDoor(pathLength, false, safeCoreCenterX - lobbyW / 2, pathCenterZ, true, 0);
            createWallWithDoor(pathLength, false, safeCoreCenterX + lobbyW / 2, pathCenterZ, true, 0);

            // Add mailboxes (posta kutuları)
            const mbGeo = safeBox(0.2, 1.2, 1.8);
            const mbMesh = new THREE.Mesh(mbGeo, woodFurnitureMat);
            mbMesh.position.set(safeCoreCenterX - lobbyW / 2 + 0.1, baseY + slabThickness + 0.9, pathCenterZ);
            floorGroup.add(mbMesh);

          } else if (mainEntranceIdx === 2) {
            // BACK FACADE ENTRANCE
            const pathStartZ = floorCenterZ - D / 2;
            const pathEndZ = safeCoreCenterZ - safeSD / 2;
            const pathLength = Math.max(1.0, pathEndZ - pathStartZ);
            const pathCenterZ = pathStartZ + pathLength / 2;

            if (!isCustomPoly) {
              const lobbyFloor = new THREE.Mesh(safeBox(lobbyW, 0.02, pathLength), lobbyFloorMat);
              lobbyFloor.position.set(safeCoreCenterX, floorFinishY, pathCenterZ);
              lobbyFloor.receiveShadow = true;
              floorGroup.add(lobbyFloor);
            }

            createWallWithDoor(pathLength, false, safeCoreCenterX - lobbyW / 2, pathCenterZ, true, 0);
            createWallWithDoor(pathLength, false, safeCoreCenterX + lobbyW / 2, pathCenterZ, true, 0);

            // Add mailboxes
            const mbGeo = safeBox(0.2, 1.2, 1.8);
            const mbMesh = new THREE.Mesh(mbGeo, woodFurnitureMat);
            mbMesh.position.set(safeCoreCenterX - lobbyW / 2 + 0.1, baseY + slabThickness + 0.9, pathCenterZ);
            floorGroup.add(mbMesh);

          } else if (mainEntranceIdx === 1) {
            // RIGHT FACADE ENTRANCE
            const pathStartX = safeCoreCenterX + safeSW / 2 + safeEW;
            const pathEndX = W / 2;
            const pathLength = Math.max(1.0, pathEndX - pathStartX);
            const pathCenterX = pathStartX + pathLength / 2;

            if (!isCustomPoly) {
              const lobbyFloor = new THREE.Mesh(safeBox(pathLength, 0.02, lobbyW), lobbyFloorMat);
              lobbyFloor.position.set(pathCenterX, floorFinishY, safeCoreCenterZ);
              lobbyFloor.receiveShadow = true;
              floorGroup.add(lobbyFloor);
            }

            createWallWithDoor(pathLength, true, pathCenterX, safeCoreCenterZ - lobbyW / 2, true, 0);
            createWallWithDoor(pathLength, true, pathCenterX, safeCoreCenterZ + lobbyW / 2, true, 0);

          } else if (mainEntranceIdx === 3) {
            // LEFT FACADE ENTRANCE
            const pathStartX = -W / 2;
            const pathEndX = safeCoreCenterX - safeSW / 2;
            const pathLength = Math.max(1.0, pathEndX - pathStartX);
            const pathCenterX = pathStartX + pathLength / 2;

            if (!isCustomPoly) {
              const lobbyFloor = new THREE.Mesh(safeBox(pathLength, 0.02, lobbyW), lobbyFloorMat);
              lobbyFloor.position.set(pathCenterX, floorFinishY, safeCoreCenterZ);
              lobbyFloor.receiveShadow = true;
              floorGroup.add(lobbyFloor);
            }

            createWallWithDoor(pathLength, true, pathCenterX, safeCoreCenterZ - lobbyW / 2, true, 0);
            createWallWithDoor(pathLength, true, pathCenterX, safeCoreCenterZ + lobbyW / 2, true, 0);
          }

          // Connecting general circulation walls (kat holü) so everything is enclosed properly
          createWallWithDoor(W * 0.85, true, safeCoreCenterX, safeCoreCenterZ + coreHallDistZ, true, 0);
          createWallWithDoor(W * 0.85, true, safeCoreCenterX, safeCoreCenterZ - coreHallDistZ, true, 0);

        } else if (flatsPerFloor === 1) {
          // ================= SINGLE FLAT (Tam Kat Lüks Rezidans) =================
          createWallWithDoor(W * 0.85, true, 0, coreHallDistZ, true, 0);
          createWallWithDoor(W * 0.85, true, 0, -coreHallDistZ, true, 0);

          const grandSalonW = W * 0.86;
          const grandSalonD = D * 0.38;
          if (!isCustomPoly) {
            const grandSalonFloor = new THREE.Mesh(safeBox(grandSalonW, 0.02, grandSalonD), salonFloorMat);
            grandSalonFloor.position.set(0, floorFinishY, D * 0.28);
            grandSalonFloor.receiveShadow = true;
            floorGroup.add(grandSalonFloor);
          }

          const rearRoomD = D * 0.32;
          createWallWithDoor(W * 0.42, true, -W * 0.25, -D * 0.2, true, 0);
          createWallWithDoor(W * 0.42, true, W * 0.25, -D * 0.2, true, 0);

          if (!isCustomPoly) {
            const bedFloorGeo = safeBox(W * 0.4, 0.02, rearRoomD * 0.85);
            const leftBedFloor = new THREE.Mesh(bedFloorGeo, roomFloorMat);
            leftBedFloor.position.set(-W * 0.25, floorFinishY, -D * 0.3);
            leftBedFloor.receiveShadow = true;
            floorGroup.add(leftBedFloor);

            const rightBedFloor = new THREE.Mesh(bedFloorGeo, roomFloorMat);
            rightBedFloor.position.set(W * 0.25, floorFinishY, -D * 0.3);
            rightBedFloor.receiveShadow = true;
            floorGroup.add(rightBedFloor);
          }

          const bathW = 2.2;
          const bathD = 2.2;
          createWallWithDoor(bathD, false, -sW / 2 - 0.1, -coreHallDistZ - bathD / 2, true, 0);
          createWallWithDoor(bathW, true, -sW / 2 - bathW / 2, -coreHallDistZ - bathD, false);
          createWallWithDoor(bathD, false, sW / 2 + eW + 0.1, -coreHallDistZ - bathD / 2, true, 0);
          createWallWithDoor(bathW, true, sW / 2 + eW + bathW / 2, -coreHallDistZ - bathD, false);

          if (!isCustomPoly) {
            const bathFloorGeo = safeBox(bathW * 0.9, 0.02, bathD * 0.9);
            const leftBathFloor = new THREE.Mesh(bathFloorGeo, bathFloorMat);
            leftBathFloor.position.set(-sW / 2 - bathW / 2, floorFinishY, -coreHallDistZ - bathD / 2);
            floorGroup.add(leftBathFloor);

            const rightBathFloor = new THREE.Mesh(bathFloorGeo, bathFloorMat);
            rightBathFloor.position.set(sW / 2 + eW + bathW / 2, floorFinishY, -coreHallDistZ - bathD / 2);
            floorGroup.add(rightBathFloor);
          }

          if (showFurniture) {
            const sofaMain = new THREE.Mesh(safeBox(3.0, 0.55, 0.95), sofaMat);
            sofaMain.position.y = floorFinishY + 0.28;
            addInterior(sofaMain, -W * 0.18, D * 0.35);

            const table = new THREE.Mesh(safeBox(1.5, 0.38, 0.8), woodFurnitureMat);
            table.position.y = floorFinishY + 0.19;
            addInterior(table, -W * 0.18, D * 0.26);

            const dining = new THREE.Mesh(safeBox(2.0, 0.75, 0.95), woodFurnitureMat);
            dining.position.y = floorFinishY + 0.38;
            addInterior(dining, W * 0.22, D * 0.32);

            const islandKitchen = new THREE.Mesh(safeBox(2.8, 0.88, 0.75), kitchenCounterMat);
            islandKitchen.position.y = floorFinishY + 0.44;
            addInterior(islandKitchen, W * 0.22, D * 0.18);

            const bed1 = new THREE.Mesh(safeBox(1.9, 0.45, 2.1), bedMat);
            bed1.position.y = floorFinishY + 0.23;
            addInterior(bed1, -W * 0.28, -D * 0.32);

            const bed2 = new THREE.Mesh(safeBox(1.9, 0.45, 2.1), bedMat);
            bed2.position.y = floorFinishY + 0.23;
            addInterior(bed2, W * 0.28, -D * 0.32);
          }
        } else if (flatsPerFloor === 2) {
          // ================= 2 FLATS (Dual Symmetrical Flats) =================
          createWallWithDoor(W * 0.85, true, 0, coreHallDistZ, true, -W * 0.2);
          createWallWithDoor(W * 0.85, true, 0, -coreHallDistZ, true, W * 0.2);

          const frontDividingLen = D / 2 - coreHallDistZ;
          createWallWithDoor(frontDividingLen, false, 0, D / 4 + coreHallDistZ / 2, false);
          const backDividingLen = D / 2 - coreHallDistZ;
          createWallWithDoor(backDividingLen, false, 0, -D / 4 - coreHallDistZ / 2, false);

          const leftSalonWidth = W * 0.44;
          const salonDepth = D * 0.38;
          createWallWithDoor(leftSalonWidth * 0.8, true, -W * 0.25, D * 0.15, true, 0.4);
          createWallWithDoor(salonDepth * 0.7, false, -W * 0.28, D * 0.3, true, -0.2);

          const rightSalonWidth = W * 0.44;
          createWallWithDoor(rightSalonWidth * 0.8, true, W * 0.25, D * 0.15, true, -0.4);
          createWallWithDoor(salonDepth * 0.7, false, W * 0.28, D * 0.3, true, 0.2);

          const rearRoomDepth = D * 0.32;
          createWallWithDoor(W * 0.4, true, -W * 0.25, -D * 0.2, true, 0);
          createWallWithDoor(W * 0.4, true, W * 0.25, -D * 0.2, true, 0);

          const bathW = 2.0;
          const bathD = 2.0;
          createWallWithDoor(bathD, false, -sW / 2 - 0.1, -coreHallDistZ - bathD / 2, true, 0);
          createWallWithDoor(bathW, true, -sW / 2 - bathW / 2, -coreHallDistZ - bathD, false);
          createWallWithDoor(bathD, false, sW / 2 + eW + 0.1, -coreHallDistZ - bathD / 2, true, 0);
          createWallWithDoor(bathW, true, sW / 2 + eW + bathW / 2, -coreHallDistZ - bathD, false);

          if (!isCustomPoly) {
            const salonFloorGeo = safeBox(leftSalonWidth * 0.9, 0.02, salonDepth * 0.85);
            const leftSalonFloor = new THREE.Mesh(salonFloorGeo, salonFloorMat);
            leftSalonFloor.position.set(-W * 0.24, floorFinishY, D * 0.28);
            leftSalonFloor.receiveShadow = true;
            floorGroup.add(leftSalonFloor);

            const rightSalonFloor = new THREE.Mesh(salonFloorGeo, salonFloorMat);
            rightSalonFloor.position.set(W * 0.24, floorFinishY, D * 0.28);
            rightSalonFloor.receiveShadow = true;
            floorGroup.add(rightSalonFloor);

            const bedFloorGeo = safeBox(W * 0.38, 0.02, rearRoomDepth * 0.8);
            const leftBedFloor = new THREE.Mesh(bedFloorGeo, roomFloorMat);
            leftBedFloor.position.set(-W * 0.25, floorFinishY, -D * 0.3);
            leftBedFloor.receiveShadow = true;
            floorGroup.add(leftBedFloor);

            const rightBedFloor = new THREE.Mesh(bedFloorGeo, roomFloorMat);
            rightBedFloor.position.set(W * 0.25, floorFinishY, -D * 0.3);
            rightBedFloor.receiveShadow = true;
            floorGroup.add(rightBedFloor);
          }

          if (showFurniture) {
            const sofaMainGeo = safeBox(2.2, 0.55, 0.85);
            const sofaLeft = new THREE.Mesh(sofaMainGeo, sofaMat);
            sofaLeft.position.y = floorFinishY + 0.28;
            addInterior(sofaLeft, -W * 0.26, D * 0.36);

            const sofaRight = new THREE.Mesh(sofaMainGeo, sofaMat);
            sofaRight.position.y = floorFinishY + 0.28;
            addInterior(sofaRight, W * 0.26, D * 0.36);

            const tableGeo = safeBox(1.2, 0.38, 0.7);
            const tableLeft = new THREE.Mesh(tableGeo, woodFurnitureMat);
            tableLeft.position.y = floorFinishY + 0.19;
            addInterior(tableLeft, -W * 0.24, D * 0.26);

            const tableRight = new THREE.Mesh(tableGeo, woodFurnitureMat);
            tableRight.position.y = floorFinishY + 0.19;
            addInterior(tableRight, W * 0.24, D * 0.26);

            const bedBaseGeo = safeBox(1.8, 0.45, 2.0);
            const bedLeft = new THREE.Mesh(bedBaseGeo, bedMat);
            bedLeft.position.y = floorFinishY + 0.23;
            addInterior(bedLeft, -W * 0.26, -D * 0.32);

            const bedRight = new THREE.Mesh(bedBaseGeo, bedMat);
            bedRight.position.y = floorFinishY + 0.23;
            addInterior(bedRight, W * 0.26, -D * 0.32);
          }
        } else if (flatsPerFloor === 3) {
          // ================= 3 FLATS (Front-Left, Front-Right, Rear-Garden) =================
          createWallWithDoor(W * 0.85, true, 0, coreHallDistZ, true, -W * 0.2);
          createWallWithDoor(W * 0.85, true, 0, -coreHallDistZ, true, W * 0.2);

          const frontDivLen = D / 2 - coreHallDistZ;
          createWallWithDoor(frontDivLen, false, 0, D / 4 + coreHallDistZ / 2, false);

          if (!isCustomPoly) {
            const rearSalonW = W * 0.85;
            const rearSalonD = D * 0.35;
            const rearFloor = new THREE.Mesh(safeBox(rearSalonW, 0.02, rearSalonD), salonFloorMat);
            rearFloor.position.set(0, floorFinishY, -D * 0.3);
            floorGroup.add(rearFloor);

            const fW = W * 0.42;
            const fD = D * 0.35;
            const fFloorL = new THREE.Mesh(safeBox(fW, 0.02, fD), salonFloorMat);
            fFloorL.position.set(-W * 0.24, floorFinishY, D * 0.3);
            floorGroup.add(fFloorL);

            const fFloorR = new THREE.Mesh(safeBox(fW, 0.02, fD), salonFloorMat);
            fFloorR.position.set(W * 0.24, floorFinishY, D * 0.3);
            floorGroup.add(fFloorR);
          }

          if (showFurniture) {
            const sL = new THREE.Mesh(safeBox(2.0, 0.5, 0.8), sofaMat);
            sL.position.y = floorFinishY + 0.25;
            addInterior(sL, -W * 0.24, D * 0.34);

            const sR = new THREE.Mesh(safeBox(2.0, 0.5, 0.8), sofaMat);
            sR.position.y = floorFinishY + 0.25;
            addInterior(sR, W * 0.24, D * 0.34);

            const sRear = new THREE.Mesh(safeBox(2.2, 0.5, 0.8), sofaMat);
            sRear.position.y = floorFinishY + 0.25;
            addInterior(sRear, -W * 0.2, -D * 0.32);

            const bedRear = new THREE.Mesh(safeBox(1.8, 0.45, 1.9), bedMat);
            bedRear.position.y = floorFinishY + 0.23;
            addInterior(bedRear, W * 0.22, -D * 0.32);
          }
        } else {
          // ================= 4 FLATS (4 Quadrants: FL, FR, RL, RR) =================
          createWallWithDoor(W * 0.85, true, 0, coreHallDistZ, true, -W * 0.2);
          createWallWithDoor(W * 0.85, true, 0, -coreHallDistZ, true, W * 0.2);

          const frontDivLen = D / 2 - coreHallDistZ;
          createWallWithDoor(frontDivLen, false, 0, D / 4 + coreHallDistZ / 2, false);
          const backDivLen = D / 2 - coreHallDistZ;
          createWallWithDoor(backDivLen, false, 0, -D / 4 - coreHallDistZ / 2, false);

          if (!isCustomPoly) {
            const qW = W * 0.42;
            const qD = D * 0.34;

            const qFL = new THREE.Mesh(safeBox(qW, 0.02, qD), salonFloorMat);
            qFL.position.set(-W * 0.24, floorFinishY, D * 0.3);
            floorGroup.add(qFL);

            const qFR = new THREE.Mesh(safeBox(qW, 0.02, qD), salonFloorMat);
            qFR.position.set(W * 0.24, floorFinishY, D * 0.3);
            floorGroup.add(qFR);

            const qRL = new THREE.Mesh(safeBox(qW, 0.02, qD), roomFloorMat);
            qRL.position.set(-W * 0.24, floorFinishY, -D * 0.3);
            floorGroup.add(qRL);

            const qRR = new THREE.Mesh(safeBox(qW, 0.02, qD), roomFloorMat);
            qRR.position.set(W * 0.24, floorFinishY, -D * 0.3);
            floorGroup.add(qRR);
          }

          if (showFurniture) {
            const sofaFL = new THREE.Mesh(safeBox(1.8, 0.48, 0.75), sofaMat);
            sofaFL.position.y = floorFinishY + 0.24;
            addInterior(sofaFL, -W * 0.24, D * 0.33);

            const sofaFR = new THREE.Mesh(safeBox(1.8, 0.48, 0.75), sofaMat);
            sofaFR.position.y = floorFinishY + 0.24;
            addInterior(sofaFR, W * 0.24, D * 0.33);

            const bedRL = new THREE.Mesh(safeBox(1.6, 0.45, 1.8), bedMat);
            bedRL.position.y = floorFinishY + 0.23;
            addInterior(bedRL, -W * 0.24, -D * 0.32);

            const bedRR = new THREE.Mesh(safeBox(1.6, 0.45, 1.8), bedMat);
            bedRR.position.y = floorFinishY + 0.23;
            addInterior(bedRR, W * 0.24, -D * 0.32);
          }
        }

        // If this is the Top Floor and Roof Type is DUPLEX, add internal duplex staircase
        if (isTopFloor && roofType === 'duplex') {
          const dStepCount = 10;
          const dStepH = roomHeight / dStepCount;
          const dStepGeo = safeBox(1.1, dStepH * 0.85, 0.3);
          for (let ds = 0; ds < dStepCount; ds++) {
            const dStepMesh = new THREE.Mesh(dStepGeo, woodFurnitureMat);
            dStepMesh.position.set(
              -W * 0.12,
              baseY + slabThickness + (ds + 0.5) * dStepH,
              -coreHallDistZ + ds * 0.26
            );
            floorGroup.add(dStepMesh);
          }
        }
      }

      // 6. EXTERIOR FAÇADE WALLS & WINDOWS
      if (isShopFloor) {
        // COMMERCIAL STOREFRONT FAÇADE (VİTRİN, TABELA BANDI VE GİRİŞ MARKİZİ)
        if (isCustomPoly && activePolyPts) {
          const bounds = getPolygonBounds(activePolyPts);
          const edges = getPolygonEdges(activePolyPts);
          const activeFacadeConfigs = generateFacadeConfigs(
            activePolyPts.length,
            params.facadeConfigs,
            params.mainEntranceFacadeIndex || 0
          );

          let signedArea = 0;
          for (let i = 0; i < activePolyPts.length; i++) {
            const j = (i + 1) % activePolyPts.length;
            signedArea += (activePolyPts[i].x * activePolyPts[j].y - activePolyPts[j].x * activePolyPts[i].y);
          }
          const isCW = signedArea > 0;

          edges.forEach((edge, idx) => {
            const x1 = edge.start.x - bounds.centerX;
            const z1 = edge.start.y - bounds.centerY;
            const x2 = edge.end.x - bounds.centerX;
            const z2 = edge.end.y - bounds.centerY;

            const dx = x2 - x1;
            const dz = z2 - z1;
            const length = Math.sqrt(dx * dx + dz * dz);

            const normalX = isCW ? dz / length : -dz / length;
            const normalZ = isCW ? -dx / length : dx / length;

            const midX = (x1 + x2) / 2;
            const midZ = (z1 + z2) / 2;

            const wallThick = 0.25;
            const wallCenterX = midX - normalX * (wallThick / 2);
            const wallCenterZ = midZ - normalZ * (wallThick / 2);
            const rotationY = Math.atan2(normalX, normalZ);

            const cfg = activeFacadeConfigs[idx] || {
              isEntrance: idx === (params.mainEntranceFacadeIndex || 0),
              windowCountPerFloor: 2,
            };
            const isEntrance = cfg.isEntrance || idx === (params.mainEntranceFacadeIndex || 0);
            const isBlind = (cfg as any).windowCountPerFloor === 0;

            const wallGroup = new THREE.Group();
            wallGroup.position.set(wallCenterX, 0, wallCenterZ);
            wallGroup.rotation.y = rotationY;
            floorGroup.add(wallGroup);

            if (isBlind) {
              // Completely SOLID wall for blind facades!
              const solidShopWall = new THREE.Mesh(safeBox(length, roomHeight, wallThick), wallMaterial);
              solidShopWall.position.set(0, midY, 0);
              solidShopWall.castShadow = !isXRay;
              wallGroup.add(solidShopWall);
            } else {
              // Beautiful Glass Storefront Vitrine with Fascia
              const vitrineHeight = roomHeight - 0.75;
              const fasciaHeight = 0.75;

              // Illuminated Signage Fascia Band
              const fasciaGeo = safeBox(length, fasciaHeight, wallThick);
              const fasciaMesh = new THREE.Mesh(fasciaGeo, shopSignFasciaMat);
              fasciaMesh.position.set(0, baseY + slabThickness + vitrineHeight + fasciaHeight / 2, 0);
              fasciaMesh.castShadow = true;
              wallGroup.add(fasciaMesh);

              if (isEntrance) {
                const signBarGeo = safeBox(Math.min(length * 0.7, 4.0), 0.35, 0.02);
                const signBarMesh = new THREE.Mesh(signBarGeo, shopSignGlowMat);
                signBarMesh.position.set(0, baseY + slabThickness + vitrineHeight + fasciaHeight / 2, 0); // flush
                wallGroup.add(signBarMesh);

                const canopyDepth = 0.1;
                const canopyGeo = safeBox(Math.min(length * 0.8, 3.2), 0.05, canopyDepth);
                const canopyMesh = new THREE.Mesh(canopyGeo, frameMaterial);
                canopyMesh.position.set(0, baseY + slabThickness + vitrineHeight + 0.025, -wallThick / 2 + canopyDepth / 2); // recessed
                canopyMesh.castShadow = true;
                wallGroup.add(canopyMesh);
              }

              // Full Height Storefront Glass Panels (Geniş Alüminyum Vitrin Camları)
              const glassVitrineGeo = safeBox(length - 0.2, vitrineHeight, 0.08);
              const glassVitrineMesh = new THREE.Mesh(glassVitrineGeo, glassMaterial);
              glassVitrineMesh.position.set(0, baseY + slabThickness + vitrineHeight / 2, 0);
              wallGroup.add(glassVitrineMesh);

              // Storefront Vertical Aluminum Mullions
              const mullionCount = Math.max(2, Math.floor(length / 2));
              for (let m = 0; m <= mullionCount; m++) {
                const mx = -(length - 0.2) / 2 + ((length - 0.2) / mullionCount) * m;
                const mulGeo = safeBox(0.08, vitrineHeight, 0.12);
                const mulMesh = new THREE.Mesh(mulGeo, frameMaterial);
                mulMesh.position.set(mx, baseY + slabThickness + vitrineHeight / 2, 0);
                wallGroup.add(mulMesh);
              }

              if (isEntrance) {
                // Commercial Entrance Glass Doors with Stainless Handles recessed (içten birleşik)
                const doorW = Math.min(1.8, length * 0.5);
                const doorH = Math.min(2.4, vitrineHeight - 0.2);
                const doorFrameMesh = new THREE.Mesh(safeBox(doorW, doorH, 0.14), frameMaterial);
                doorFrameMesh.position.set(0, baseY + slabThickness + doorH / 2, -wallThick / 4);
                wallGroup.add(doorFrameMesh);

                const doorGlass = new THREE.Mesh(safeBox(doorW - 0.15, doorH - 0.15, 0.06), glassMaterial);
                doorGlass.position.copy(doorFrameMesh.position);
                wallGroup.add(doorGlass);
              }
            }
          });
        } else {
          // Standard Rectangular Shop
          const backWallThick = 0.25;
          const activeFacadeConfigs = generateFacadeConfigs(
            4,
            params.facadeConfigs,
            params.mainEntranceFacadeIndex || 0
          );

          const wallDefs = [
            { name: 'Ön Cephe', length: floorW, x: floorCenterX, z: floorCenterZ + floorD / 2 - backWallThick / 2, rotationY: 0, idx: 0 },
            { name: 'Sağ Cephe', length: floorD, x: floorCenterX + floorW / 2 - backWallThick / 2, z: floorCenterZ, rotationY: Math.PI / 2, idx: 1 },
            { name: 'Arka Cephe', length: floorW, x: floorCenterX, z: floorCenterZ - floorD / 2 + backWallThick / 2, rotationY: Math.PI, idx: 2 },
            { name: 'Sol Cephe', length: floorD, x: floorCenterX - floorW / 2 + backWallThick / 2, z: floorCenterZ, rotationY: -Math.PI / 2, idx: 3 },
          ];

          wallDefs.forEach((wall) => {
            const cfg = activeFacadeConfigs[wall.idx] || {
              isEntrance: wall.idx === (params.mainEntranceFacadeIndex || 0),
              windowCountPerFloor: 2,
            };
            const isEntrance = cfg.isEntrance || wall.idx === (params.mainEntranceFacadeIndex || 0);
            const isBlind = (cfg as any).windowCountPerFloor === 0;

            const wallGroup = new THREE.Group();
            wallGroup.position.set(wall.x, 0, wall.z);
            wallGroup.rotation.y = wall.rotationY;
            floorGroup.add(wallGroup);

            if (isBlind) {
              // Completely SOLID wall for blind facades!
              const solidShopWall = new THREE.Mesh(safeBox(wall.length, roomHeight, backWallThick), wallMaterial);
              solidShopWall.position.set(0, midY, 0);
              solidShopWall.castShadow = !isXRay;
              wallGroup.add(solidShopWall);
            } else {
              // Beautiful Glass Storefront Vitrine with Fascia
              const vitrineHeight = roomHeight - 0.75;
              const fasciaHeight = 0.75;

              // Illuminated Signage Fascia Band
              const fasciaGeo = safeBox(wall.length, fasciaHeight, backWallThick);
              const fasciaMesh = new THREE.Mesh(fasciaGeo, shopSignFasciaMat);
              fasciaMesh.position.set(0, baseY + slabThickness + vitrineHeight + fasciaHeight / 2, 0);
              fasciaMesh.castShadow = true;
              wallGroup.add(fasciaMesh);

              if (isEntrance) {
                const signBarGeo = safeBox(Math.min(wall.length * 0.7, 4.0), 0.35, 0.02);
                const signBarMesh = new THREE.Mesh(signBarGeo, shopSignGlowMat);
                signBarMesh.position.set(0, baseY + slabThickness + vitrineHeight + fasciaHeight / 2, 0); // flush
                wallGroup.add(signBarMesh);

                const canopyDepth = 0.1;
                const canopyGeo = safeBox(Math.min(wall.length * 0.85, 3.2), 0.05, canopyDepth);
                const canopyMesh = new THREE.Mesh(canopyGeo, frameMaterial);
                canopyMesh.position.set(0, baseY + slabThickness + vitrineHeight + 0.025, -backWallThick / 2 + canopyDepth / 2); // recessed
                canopyMesh.castShadow = true;
                wallGroup.add(canopyMesh);
              }

              // Full Height Storefront Glass Panels (Geniş Alüminyum Vitrin Camları)
              const glassVitrineGeo = safeBox(wall.length - 0.2, vitrineHeight, 0.08);
              const glassVitrineMesh = new THREE.Mesh(glassVitrineGeo, glassMaterial);
              glassVitrineMesh.position.set(0, baseY + slabThickness + vitrineHeight / 2, 0);
              wallGroup.add(glassVitrineMesh);

              // Storefront Vertical Aluminum Mullions
              const mullionCount = Math.max(2, Math.floor(wall.length / 2));
              for (let m = 0; m <= mullionCount; m++) {
                const mx = -(wall.length - 0.2) / 2 + ((wall.length - 0.2) / mullionCount) * m;
                const mulGeo = safeBox(0.08, vitrineHeight, 0.12);
                const mulMesh = new THREE.Mesh(mulGeo, frameMaterial);
                mulMesh.position.set(mx, baseY + slabThickness + vitrineHeight / 2, 0);
                wallGroup.add(mulMesh);
              }

              if (isEntrance) {
                // Commercial Entrance Glass Doors with Stainless Handles recessed (içten birleşik)
                const doorW = Math.min(1.8, wall.length * 0.5);
                const doorH = Math.min(2.4, vitrineHeight - 0.2);
                const doorFrameGeo = safeBox(doorW, doorH, 0.14);
                const doorFrameMesh = new THREE.Mesh(doorFrameGeo, frameMaterial);
                doorFrameMesh.position.set(0, baseY + slabThickness + doorH / 2, -backWallThick / 4);
                wallGroup.add(doorFrameMesh);

                const doorGlass = new THREE.Mesh(
                  safeBox(doorW - 0.15, doorH - 0.15, 0.06),
                  glassMaterial
                );
                doorGlass.position.copy(doorFrameMesh.position);
                wallGroup.add(doorGlass);

                // Vertical steel handles recessed
                for (const hSide of [-0.15, 0.15]) {
                  const handle = new THREE.Mesh(
                    safeCylinder(0.025, 0.025, 0.9, 8),
                    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 })
                  );
                  handle.position.set(hSide, baseY + slabThickness + 1.1, -backWallThick / 4 + 0.06);
                  wallGroup.add(handle);
                }
              }
            }
          });
        }
      } else if (!isBasement) {
        const wallThick = 0.22;
        const currentMat = f % 2 === 0 ? woodMaterial : wallMaterial;
        const isGroundFloor = floorIndex === 0;

        // Resolve active facade configurations
        const activeFacadeConfigs = generateFacadeConfigs(
          params.polygonPoints && params.polygonPoints.length >= 3
            ? params.polygonPoints
            : (params.customFacades || 4),
          params.facadeConfigs,
          params.mainEntranceFacadeIndex || 0
        );

        let wallDefs: Array<{ name: string; length: number; x: number; z: number; rotationY: number; isCustom: boolean }> = [];
        if (isCustomPoly && activePolyPts) {
          const currentFloorWallPts = isCantileverFloor
            ? createOffsetPolygon(activePolyPts, (i) => getFacadeCantilever(i))
            : activePolyPts;
          const bounds = getPolygonBounds(currentFloorWallPts);
          const edges = getPolygonEdges(currentFloorWallPts);

          // Calculate signed area to know clockwise vs counter-clockwise winding
          let signedArea = 0;
          for (let i = 0; i < currentFloorWallPts.length; i++) {
            const j = (i + 1) % currentFloorWallPts.length;
            signedArea += (currentFloorWallPts[i].x * currentFloorWallPts[j].y - currentFloorWallPts[j].x * currentFloorWallPts[i].y);
          }
          const isCCW = signedArea > 0;

          wallDefs = edges.map((edge, idx) => {
            const x1 = edge.start.x - bounds.centerX;
            const z1 = edge.start.y - bounds.centerY;
            const x2 = edge.end.x - bounds.centerX;
            const z2 = edge.end.y - bounds.centerY;

            const dx = x2 - x1;
            const dz = z2 - z1;
            const length = Math.sqrt(dx * dx + dz * dz);

            // Unit outward normal
            const normalX = isCCW ? dz / length : -dz / length;
            const normalZ = isCCW ? -dx / length : dx / length;

            // Midpoint of edge
            const midX = (x1 + x2) / 2;
            const midZ = (z1 + z2) / 2;

            // Inset wall center by wallThick / 2 so outer face is exactly flush with the slab edge
            const wallCenterX = midX - normalX * (wallThick / 2);
            const wallCenterZ = midZ - normalZ * (wallThick / 2);

            // Rotation so local +Z points along outward normal (where windows, door canopies, balconies face)
            const rotationY = Math.atan2(normalX, normalZ);

            return {
              name: `Cephe ${idx + 1}`,
              length: length,
              x: wallCenterX,
              z: wallCenterZ,
              rotationY: rotationY,
              isCustom: true
            };
          });
        } else {
          wallDefs = [
            { name: 'Ön Cephe', length: floorW, x: floorCenterX, z: floorCenterZ + floorD / 2 - wallThick / 2, rotationY: 0, isCustom: false },
            { name: 'Sağ Cephe', length: floorD, x: floorCenterX + floorW / 2 - wallThick / 2, z: floorCenterZ, rotationY: Math.PI / 2, isCustom: false },
            { name: 'Arka Cephe', length: floorW, x: floorCenterX, z: floorCenterZ - floorD / 2 + wallThick / 2, rotationY: Math.PI, isCustom: false },
            { name: 'Sol Cephe', length: floorD, x: floorCenterX - floorW / 2 + wallThick / 2, z: floorCenterZ, rotationY: -Math.PI / 2, isCustom: false },
          ];
        }

        wallDefs.forEach((wDef, wIdx) => {
          const cfg = activeFacadeConfigs[wIdx] || {
            windowCountPerFloor: wIdx === 0 ? 3 : 2,
            hasBalcony: wIdx === 0,
            balconyCountPerFloor: wIdx === 0 ? 1 : 0,
            balconyType: 'standard',
            isEntrance: wIdx === (params.mainEntranceFacadeIndex || 0),
          };

          const isEntranceFacade = cfg.isEntrance || wIdx === (params.mainEntranceFacadeIndex || 0);
          const winCount = typeof cfg.windowCountPerFloor === 'number' ? cfg.windowCountPerFloor : (wIdx === 0 ? 3 : 2);
          
          // Under TR regulations, a blind facade (windowCountPerFloor === 0) cannot have balconies
          const hasBalc = winCount === 0 ? false : (cfg.hasBalcony && floorIndex > 0);
          const balcCount = winCount === 0 ? 0 : (cfg.balconyCountPerFloor || 1);

          const wallGroup = new THREE.Group();
          wallGroup.position.set(wDef.x, 0, wDef.z);
          wallGroup.rotation.y = wDef.rotationY;
          floorGroup.add(wallGroup);

          const localW = wDef.length;
          
          if (isGroundFloor && isEntranceFacade) {
            const doorW = 2.4;
            const doorH = Math.min(2.4, roomHeight - 0.2);
            const sidePiersW = (localW - doorW) / 2;

            for (const sign of [-1, 1]) {
              const pMesh = new THREE.Mesh(safeBox(sidePiersW, roomHeight, wallThick), currentMat);
              pMesh.position.set(sign * (doorW / 2 + sidePiersW / 2), midY, 0);
              pMesh.castShadow = !isXRay; pMesh.receiveShadow = true;
              wallGroup.add(pMesh);
            }
            
            const lintelH = roomHeight - doorH;
            if (lintelH > 0.1) {
              const lintelMesh = new THREE.Mesh(safeBox(doorW, lintelH, wallThick), wallMaterial);
              lintelMesh.position.set(0, baseY + slabThickness + doorH + lintelH / 2, 0);
              wallGroup.add(lintelMesh);
            }

            // Recess the door and framing slightly inwards so it connects inwardly with the wall (içten birleşik)
            const recessZ = -wallThick / 4; 

            const doorFrameMesh = new THREE.Mesh(safeBox(doorW, doorH, 0.12), frameMaterial);
            doorFrameMesh.position.set(0, baseY + slabThickness + doorH / 2, recessZ);
            wallGroup.add(doorFrameMesh);

            const doorGlass = new THREE.Mesh(safeBox(doorW - 0.2, doorH - 0.2, 0.06), glassMaterial);
            doorGlass.position.copy(doorFrameMesh.position);
            wallGroup.add(doorGlass);

            // Keep the canopy and signage inside/flush with the wall opening face, preventing any outer protrusion
            const canopyMesh = new THREE.Mesh(safeBox(doorW, 0.05, 0.1), frameMaterial); // slightly deeper but recessed!
            canopyMesh.position.set(0, baseY + slabThickness + doorH + 0.025, -wallThick / 2 + 0.05);
            canopyMesh.castShadow = true;
            wallGroup.add(canopyMesh);

            const signMesh = new THREE.Mesh(safeBox(doorW * 0.8, 0.3, 0.02), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
            signMesh.position.set(0, baseY + slabThickness + doorH + 0.35, -wallThick / 2 + 0.01);
            wallGroup.add(signMesh);
          } else if (winCount === 0) {
            const solidWall = new THREE.Mesh(safeBox(localW, roomHeight, wallThick), currentMat);
            solidWall.position.set(0, midY, 0);
            solidWall.castShadow = !isXRay; solidWall.receiveShadow = true;
            wallGroup.add(solidWall);
          } else {
            const winWidth = Math.min(1.8, (localW - 1) / (winCount + 1));
            const winHeight = 1.5;
            const winSill = 0.9;
            const pierW = (localW - winCount * winWidth) / (winCount + 1);

            // Pre-calculate balcony center positions on this wall
            const balcXPositions: number[] = [];
            if (hasBalc && bD > 0.3) {
              for (let b = 0; b < balcCount; b++) {
                const bx = balcCount === 1 ? -localW * 0.22 : (b === 0 ? -localW * 0.25 : localW * 0.25);
                balcXPositions.push(bx);
              }
            }

            // Find window opening index closest to each balcony position
            const balconyOpeningIndices = new Set<number>();
            balcXPositions.forEach((bx) => {
              let closestIdx = 0;
              let minDist = Infinity;
              for (let p = 0; p < winCount; p++) {
                const px = -localW / 2 + pierW / 2 + p * (pierW + winWidth);
                const wx = px + pierW / 2 + winWidth / 2;
                const dist = Math.abs(wx - bx);
                if (dist < minDist) {
                  minDist = dist;
                  closestIdx = p;
                }
              }
              balconyOpeningIndices.add(closestIdx);
            });

            // Fallback: Ensure at least one door if balcony exists
            if (hasBalc && winCount > 0 && balconyOpeningIndices.size === 0) {
              balconyOpeningIndices.add(0);
            }

            for (let p = 0; p <= winCount; p++) {
              const px = -localW / 2 + pierW / 2 + p * (pierW + winWidth);
              const pierMesh = new THREE.Mesh(safeBox(pierW, roomHeight, wallThick), currentMat);
              pierMesh.position.set(px, midY, 0);
              pierMesh.castShadow = !isXRay; pierMesh.receiveShadow = true;
              wallGroup.add(pierMesh);

              if (p < winCount) {
                const wx = px + pierW / 2 + winWidth / 2;
                const isBalconyDoor = balconyOpeningIndices.has(p);

                if (isBalconyDoor) {
                  // --- BALKON KAPISI (FULL-HEIGHT GLASS BALCONY DOOR WITH LOW THRESHOLD & HANDLE) ---
                  const thresholdH = 0.05;
                  const doorH = 2.15;
                  const glassH = doorH - thresholdH;

                  // Low threshold step
                  const thresholdMesh = new THREE.Mesh(safeBox(winWidth, thresholdH, wallThick), wallMaterial);
                  thresholdMesh.position.set(wx, baseY + slabThickness + thresholdH / 2, 0);
                  wallGroup.add(thresholdMesh);

                  // Lintel wall above door
                  const lintelH = roomHeight - doorH;
                  if (lintelH > 0.05) {
                    const lintelMesh = new THREE.Mesh(safeBox(winWidth, lintelH, wallThick), wallMaterial);
                    lintelMesh.position.set(wx, baseY + slabThickness + doorH + lintelH / 2, 0);
                    wallGroup.add(lintelMesh);
                  }

                  // Glass door panel
                  const glassMesh = new THREE.Mesh(safeBox(winWidth - 0.08, glassH, 0.06), glassMaterial);
                  glassMesh.position.set(wx, baseY + slabThickness + thresholdH + glassH / 2, 0);
                  wallGroup.add(glassMesh);

                  // Door frame
                  const frameGeo = safeBox(winWidth, glassH, 0.08);
                  const line = new THREE.LineSegments(
                    new THREE.EdgesGeometry(frameGeo),
                    new THREE.LineBasicMaterial({ color: isLight ? 0x334155 : 0x1e293b })
                  );
                  line.position.copy(glassMesh.position);
                  wallGroup.add(line);

                  // Vertical aluminum mullion for double French balcony door look
                  if (winWidth > 1.0) {
                    const dividerMesh = new THREE.Mesh(safeBox(0.06, glassH, 0.08), frameMaterial);
                    dividerMesh.position.copy(glassMesh.position);
                    wallGroup.add(dividerMesh);
                  }

                  // Chrome/Dark Balcony Door Handle
                  const handleMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.1 });
                  const handleX = wx + (winWidth > 1.0 ? 0.08 : winWidth * 0.25);
                  const handleY = baseY + slabThickness + 1.05;
                  const handleZ = wallThick / 2 + 0.04;

                  const handleBar = new THREE.Mesh(safeCylinder(0.018, 0.018, 0.35, 8), handleMat);
                  handleBar.position.set(handleX, handleY, handleZ);
                  handleBar.castShadow = true;
                  wallGroup.add(handleBar);

                  for (const hY of [-0.12, 0.12]) {
                    const mount = new THREE.Mesh(safeBox(0.02, 0.02, 0.04), handleMat);
                    mount.position.set(handleX, handleY + hY, wallThick / 2 + 0.02);
                    wallGroup.add(mount);
                  }
                } else {
                  // --- STANDARD WINDOW (PENCERE) ---
                  const sillMesh = new THREE.Mesh(safeBox(winWidth, winSill, wallThick), wallMaterial);
                  sillMesh.position.set(wx, baseY + slabThickness + winSill / 2, 0);
                  wallGroup.add(sillMesh);

                  const lintelH = roomHeight - (winSill + winHeight);
                  if (lintelH > 0.05) {
                    const lintelMesh = new THREE.Mesh(safeBox(winWidth, lintelH, wallThick), wallMaterial);
                    lintelMesh.position.set(wx, baseY + slabThickness + winSill + winHeight + lintelH / 2, 0);
                    wallGroup.add(lintelMesh);
                  }

                  const glassMesh = new THREE.Mesh(safeBox(winWidth, winHeight, 0.06), glassMaterial);
                  glassMesh.position.set(wx, baseY + slabThickness + winSill + winHeight / 2, 0);
                  wallGroup.add(glassMesh);

                  const frameGeo = safeBox(winWidth + 0.04, winHeight + 0.04, 0.08);
                  const line = new THREE.LineSegments(
                    new THREE.EdgesGeometry(frameGeo),
                    new THREE.LineBasicMaterial({ color: isLight ? 0x64748b : 0x27272a })
                  );
                  line.position.copy(glassMesh.position);
                  wallGroup.add(line);
                }
              }
            }
          }

          if (hasBalc && bD > 0.3) {
            const rawType = (cfg.balconyType || 'standard').toLowerCase();
            const balcType = rawType === 'cantilever' ? 'standard' : rawType;
            const balcWidth = Math.min(localW * 0.45, 4.5);
            
            for (let b = 0; b < balcCount; b++) {
              const balcX = balcCount === 1 ? -localW * 0.22 : (b === 0 ? -localW * 0.25 : localW * 0.25);

              if (balcType === 'french') {
                // ================= 1. FRANSIZ BALKON (Minimal Emniyet Korkuluklu Zemin Balkonu) =================
                const fDepth = 0.24;
                const fWidth = Math.min(balcWidth * 0.75, 2.2);
                const fOffsetZ = fDepth / 2 + wallThick / 2;

                // Mermer / beton denizlik bazası
                const sillMesh = new THREE.Mesh(safeBox(fWidth, 0.08, fDepth), slabMaterial);
                sillMesh.position.set(balcX, baseY + slabThickness + 0.04, fOffsetZ);
                wallGroup.add(sillMesh);

                // Antrasit şık emniyet korkuluğu (1.10m standart yönetmelik yüksekliği)
                const railH = 1.1;
                const railZ = fOffsetZ + fDepth / 2;
                const glassRail = new THREE.Mesh(safeBox(fWidth, railH, 0.03), glassMaterial);
                glassRail.position.set(balcX, baseY + slabThickness + railH / 2 + 0.05, railZ);
                wallGroup.add(glassRail);

                // Üst küpeşte ve 2 adet yatay antrasit güvenlik emniyet mili
                const handrail = new THREE.Mesh(safeBox(fWidth + 0.04, 0.04, 0.06), antraciteAluminumMat);
                handrail.position.set(balcX, baseY + slabThickness + railH + 0.05, railZ);
                wallGroup.add(handrail);

                for (const hFrac of [0.35, 0.7]) {
                  const bar = new THREE.Mesh(safeBox(fWidth, 0.025, 0.025), antraciteAluminumMat);
                  bar.position.set(balcX, baseY + slabThickness + railH * hFrac, railZ);
                  wallGroup.add(bar);
                }

                // Dikey yan sabitleme profilleri
                for (const sideSign of [-1, 1]) {
                  const post = new THREE.Mesh(safeBox(0.04, railH, 0.04), antraciteAluminumMat);
                  post.position.set(balcX + sideSign * (fWidth / 2 - 0.02), baseY + slabThickness + railH / 2 + 0.05, railZ);
                  wallGroup.add(post);
                }

              } else if (balcType === 'glass_enclosed') {
                // ================= 2. KATLANIR CAM BALKON (Türkiye'de En Yaygın Kış Bahçesi / Camlama) =================
                const balcOffsetZ = bD / 2 + wallThick / 2;

                // Betonarme konsol döşeme
                const balcSlab = new THREE.Mesh(safeBox(balcWidth, 0.22, bD), slabMaterial);
                balcSlab.position.set(balcX, baseY + 0.11, balcOffsetZ);
                balcSlab.castShadow = true;
                wallGroup.add(balcSlab);

                // Üst tavan saçağı ve kılavuz profili
                const topSoffit = new THREE.Mesh(safeBox(balcWidth + 0.04, 0.1, bD + 0.04), antraciteAluminumMat);
                topSoffit.position.set(balcX, baseY + slabThickness + roomHeight - 0.05, balcOffsetZ);
                wallGroup.add(topSoffit);

                // Alt mermer küpeşte bazası / parapet
                const parapetH = 0.35;
                const parapetMesh = new THREE.Mesh(safeBox(balcWidth, parapetH, 0.08), currentMat);
                parapetMesh.position.set(balcX, baseY + slabThickness + parapetH / 2, balcOffsetZ + bD / 2 - 0.04);
                wallGroup.add(parapetMesh);

                // Yan parapetler
                for (const sideSign of [-1, 1]) {
                  const sideParapet = new THREE.Mesh(safeBox(0.08, parapetH, bD), currentMat);
                  sideParapet.position.set(balcX + sideSign * (balcWidth / 2 - 0.04), baseY + slabThickness + parapetH / 2, balcOffsetZ);
                  wallGroup.add(sideParapet);
                }

                // Katlanır camlama yüksekliği (alt parapetten tavana kadar)
                const glassHeight = roomHeight - parapetH - 0.12;
                const glassCenterY = baseY + slabThickness + parapetH + glassHeight / 2;

                // Ön katlanır cam panelleri (4 adet temperli katlanır kanat)
                const glassFrontZ = balcOffsetZ + bD / 2 - 0.04;
                const frontGlass = new THREE.Mesh(safeBox(balcWidth - 0.08, glassHeight, 0.03), glassBalconyMat);
                frontGlass.position.set(balcX, glassCenterY, glassFrontZ);
                wallGroup.add(frontGlass);

                // Dikey katlanır antrasit alüminyum profil çizgileri / fitilleri
                const panelCount = 4;
                const panelStep = (balcWidth - 0.1) / panelCount;
                for (let pi = 1; pi < panelCount; pi++) {
                  const px = balcX - balcWidth / 2 + 0.05 + pi * panelStep;
                  const jointProfile = new THREE.Mesh(safeBox(0.025, glassHeight, 0.04), antraciteAluminumMat);
                  jointProfile.position.set(px, glassCenterY, glassFrontZ);
                  wallGroup.add(jointProfile);
                }

                // İki yan katlanır cam panelleri
                for (const sideSign of [-1, 1]) {
                  const sideGlass = new THREE.Mesh(safeBox(0.03, glassHeight, bD - 0.08), glassBalconyMat);
                  sideGlass.position.set(balcX + sideSign * (balcWidth / 2 - 0.04), glassCenterY, balcOffsetZ);
                  wallGroup.add(sideGlass);

                  // Yan köşe dikey antrasit profil
                  const cornerPost = new THREE.Mesh(safeBox(0.05, glassHeight + parapetH, 0.05), antraciteAluminumMat);
                  cornerPost.position.set(balcX + sideSign * (balcWidth / 2 - 0.025), baseY + slabThickness + (glassHeight + parapetH) / 2, glassFrontZ);
                  wallGroup.add(cornerPost);
                }

              } else if (balcType === 'recessed') {
                // ================= 3. GÖMME / LOJYA BALKON (İki Yanı Masif Duvarlı Mahremiyetli İç Balkon) =================
                const recDepth = bD * 0.85;
                const balcOffsetZ = recDepth / 2 + wallThick / 2;

                // Masif döşeme
                const balcSlab = new THREE.Mesh(safeBox(balcWidth, 0.22, recDepth), slabMaterial);
                balcSlab.position.set(balcX, baseY + 0.11, balcOffsetZ);
                balcSlab.castShadow = true;
                wallGroup.add(balcSlab);

                // İki yanda masif cephe duvarı kanatları (mahremiyet sağlayan lojya yan duvarları)
                const wingThick = 0.25;
                for (const sideSign of [-1, 1]) {
                  const sideWall = new THREE.Mesh(safeBox(wingThick, roomHeight, recDepth), currentMat);
                  sideWall.position.set(balcX + sideSign * (balcWidth / 2 - wingThick / 2), midY, balcOffsetZ);
                  sideWall.castShadow = true;
                  wallGroup.add(sideWall);
                }

                // Ön cam veya dikey antrasit emniyet korkuluğu
                const railH = 1.05;
                const railZ = balcOffsetZ + recDepth / 2;
                const railWidth = balcWidth - wingThick * 2;
                const railMesh = new THREE.Mesh(safeBox(railWidth, railH, 0.04), glassMaterial);
                railMesh.position.set(balcX, baseY + slabThickness + railH / 2, railZ);
                wallGroup.add(railMesh);

                const handrail = new THREE.Mesh(safeBox(railWidth + 0.02, 0.05, 0.08), antraciteAluminumMat);
                handrail.position.set(balcX, baseY + slabThickness + railH, railZ);
                wallGroup.add(handrail);

                // Üst tavan örtüsü
                const ceilingSlab = new THREE.Mesh(safeBox(balcWidth, 0.12, recDepth), slabMaterial);
                ceilingSlab.position.set(balcX, baseY + slabThickness + roomHeight - 0.06, balcOffsetZ);
                wallGroup.add(ceilingSlab);

              } else if (balcType === 'cumba') {
                // ================= 4. CUMBA / KAPALI ÇIKMA (Pencereli Kapalı Yaşam Alanı) =================
                const cDepth = bD * 0.9;
                const balcOffsetZ = cDepth / 2 + wallThick / 2;

                // Cumba alt konsol tabliyesi
                const baseSlab = new THREE.Mesh(safeBox(balcWidth, 0.22, cDepth), slabMaterial);
                baseSlab.position.set(balcX, baseY + 0.11, balcOffsetZ);
                baseSlab.castShadow = true;
                wallGroup.add(baseSlab);

                // Taşıyıcı mimari payandalar / konsol pahları
                const corbelW = 0.18;
                const corbelH = 0.55;
                for (const sideSign of [-1, 1]) {
                  const corbel = new THREE.Mesh(safeBox(corbelW, corbelH, cDepth * 0.8), cumbaTrimMat);
                  corbel.position.set(balcX + sideSign * (balcWidth * 0.35), baseY - corbelH / 2 + 0.05, balcOffsetZ);
                  corbel.castShadow = true;
                  wallGroup.add(corbel);
                }

                // 0.85m Masif alt parapet duvarı
                const parapetH = 0.85;
                const parapetFront = new THREE.Mesh(safeBox(balcWidth, parapetH, 0.12), currentMat);
                parapetFront.position.set(balcX, baseY + slabThickness + parapetH / 2, balcOffsetZ + cDepth / 2 - 0.06);
                wallGroup.add(parapetFront);

                // Yan parapetler
                for (const sideSign of [-1, 1]) {
                  const sideP = new THREE.Mesh(safeBox(0.12, parapetH, cDepth), currentMat);
                  sideP.position.set(balcX + sideSign * (balcWidth / 2 - 0.06), baseY + slabThickness + parapetH / 2, balcOffsetZ);
                  wallGroup.add(sideP);
                }

                // Cumba geniş pencereleri
                const winH = roomHeight - parapetH - 0.15;
                const winY = baseY + slabThickness + parapetH + winH / 2;

                const cWindowFront = new THREE.Mesh(safeBox(balcWidth - 0.1, winH, 0.04), glassMaterial);
                cWindowFront.position.set(balcX, winY, balcOffsetZ + cDepth / 2 - 0.06);
                wallGroup.add(cWindowFront);

                for (const sideSign of [-1, 1]) {
                  const cWinSide = new THREE.Mesh(safeBox(0.04, winH, cDepth - 0.1), glassMaterial);
                  cWinSide.position.set(balcX + sideSign * (balcWidth / 2 - 0.06), winY, balcOffsetZ);
                  wallGroup.add(cWinSide);
                }

                // Üst tavan saçağı ve ahşap/antrasit silme taç
                const roofTrim = new THREE.Mesh(safeBox(balcWidth + 0.1, 0.14, cDepth + 0.1), cumbaTrimMat);
                roofTrim.position.set(balcX, baseY + slabThickness + roomHeight - 0.07, balcOffsetZ);
                wallGroup.add(roofTrim);

              } else if (balcType === 'corner') {
                // ================= 5. KÖŞE / L-TİPİ BALKON (Panoramik Köşe Balkonu) =================
                const balcOffsetZ = bD / 2 + wallThick / 2;
                const cornerWidth = balcWidth * 1.15;

                const balcSlab = new THREE.Mesh(safeBox(cornerWidth, 0.22, bD), slabMaterial);
                balcSlab.position.set(balcX, baseY + 0.11, balcOffsetZ);
                balcSlab.castShadow = true;
                wallGroup.add(balcSlab);

                // Köşe aksında silindirik antrasit taşıyıcı kolon
                const colRadius = 0.08;
                const colMesh = new THREE.Mesh(safeCylinder(colRadius, colRadius, roomHeight, 16), antraciteAluminumMat);
                colMesh.position.set(balcX + cornerWidth / 2 - colRadius - 0.05, midY, balcOffsetZ + bD / 2 - colRadius - 0.05);
                colMesh.castShadow = true;
                wallGroup.add(colMesh);

                // Ön ve yan cam korkuluk
                const railH = 1.05;
                const railZ = balcOffsetZ + bD / 2;
                const railMesh = new THREE.Mesh(safeBox(cornerWidth, railH, 0.04), glassMaterial);
                railMesh.position.set(balcX, baseY + slabThickness + railH / 2, railZ);
                wallGroup.add(railMesh);

                // Yan cam korkuluk
                const sideRail = new THREE.Mesh(safeBox(0.04, railH, bD), glassMaterial);
                sideRail.position.set(balcX + cornerWidth / 2, baseY + slabThickness + railH / 2, balcOffsetZ);
                wallGroup.add(sideRail);

                // Üst antrasit alüminyum küpeşteler
                const handrail = new THREE.Mesh(safeBox(cornerWidth + 0.05, 0.06, 0.08), antraciteAluminumMat);
                handrail.position.set(balcX, baseY + slabThickness + railH, railZ);
                wallGroup.add(handrail);

                const sideHandrail = new THREE.Mesh(safeBox(0.08, 0.06, bD + 0.05), antraciteAluminumMat);
                sideHandrail.position.set(balcX + cornerWidth / 2, baseY + slabThickness + railH, balcOffsetZ);
                wallGroup.add(sideHandrail);

              } else {
                // ================= 6. AÇIK KONSOL BALKON (Klasik Çıkma - Standard) =================
                const balcOffsetZ = bD / 2 + wallThick / 2;

                const balcSlab = new THREE.Mesh(safeBox(balcWidth, 0.2, bD), slabMaterial);
                balcSlab.position.set(balcX, baseY + 0.1, balcOffsetZ);
                balcSlab.castShadow = true;
                wallGroup.add(balcSlab);

                const railH = 1.05;
                const railZ = balcOffsetZ + bD / 2;

                // Ön cam korkuluk
                const railMesh = new THREE.Mesh(safeBox(balcWidth, railH, 0.04), glassMaterial);
                railMesh.position.set(balcX, baseY + slabThickness + railH / 2, railZ);
                wallGroup.add(railMesh);

                // İki yan kenar güvenlik korkulukları
                for (const sideSign of [-1, 1]) {
                  const sideRail = new THREE.Mesh(safeBox(0.04, railH, bD), glassMaterial);
                  sideRail.position.set(balcX + sideSign * (balcWidth / 2), baseY + slabThickness + railH / 2, balcOffsetZ);
                  wallGroup.add(sideRail);

                  // Yan küpeşte
                  const sideHandrail = new THREE.Mesh(safeBox(0.06, 0.05, bD + 0.04), antraciteAluminumMat);
                  sideHandrail.position.set(balcX + sideSign * (balcWidth / 2), baseY + slabThickness + railH, balcOffsetZ);
                  wallGroup.add(sideHandrail);
                }

                // Ön üst küpeşte
                const handrail = new THREE.Mesh(safeBox(balcWidth + 0.04, 0.05, 0.08), antraciteAluminumMat);
                handrail.position.set(balcX, baseY + slabThickness + railH, railZ);
                wallGroup.add(handrail);
              }
            }
          }        });
      } else {
        // Basement Retaining Wall (Perde Beton)
        const bsMat = new THREE.MeshStandardMaterial({
          color: 0x52525b,
          roughness: 0.9,
          wireframe: isWireframe,
        });

        if (isCustomPoly && activePolyPts) {
          const bounds = getPolygonBounds(activePolyPts);
          const edges = getPolygonEdges(activePolyPts);
          let signedArea = 0;
          for (let i = 0; i < activePolyPts.length; i++) {
            const j = (i + 1) % activePolyPts.length;
            signedArea += (activePolyPts[i].x * activePolyPts[j].y - activePolyPts[j].x * activePolyPts[i].y);
          }
          const isCW = signedArea > 0;

          edges.forEach((edge) => {
            const x1 = edge.start.x - bounds.centerX;
            const z1 = edge.start.y - bounds.centerY;
            const x2 = edge.end.x - bounds.centerX;
            const z2 = edge.end.y - bounds.centerY;
            const dx = x2 - x1;
            const dz = z2 - z1;
            const length = Math.sqrt(dx * dx + dz * dz);
            const normalX = isCW ? dz / length : -dz / length;
            const normalZ = isCW ? -dx / length : dx / length;
            const midX = (x1 + x2) / 2;
            const midZ = (z1 + z2) / 2;
            const wallCenterX = midX - normalX * (0.25 / 2);
            const wallCenterZ = midZ - normalZ * (0.25 / 2);
            const rotationY = Math.atan2(normalX, normalZ);

            const bsWall = new THREE.Mesh(safeBox(length, roomHeight, 0.25), bsMat);
            bsWall.position.set(wallCenterX, midY, wallCenterZ);
            bsWall.rotation.y = rotationY;
            bsWall.castShadow = true;
            floorGroup.add(bsWall);
          });
        } else {
          const bsWallGeo = safeBox(W, roomHeight, D);
          const bsMesh = new THREE.Mesh(bsWallGeo, bsMat);
          bsMesh.position.set(0, midY, 0);
          floorGroup.add(bsMesh);
        }
      }

      // 7. CONTRACTOR AND OWNER FLAT OVERLAYS (Müteahhit ve Hak Sahibi Daire Bölmeleri)
      const resFloors = hasGroundFloorShop ? Math.max(1, N - 1) : N;
      if (params.showContractorShare3D && !isBasement && !isShopFloor) {
        const resFloorSeq = hasGroundFloorShop ? floorIndex - 1 : floorIndex;
        const totalFlats = resFloors * flatsPerFloor;
        const defaultCount = Math.round(totalFlats * (params.contractorShareRate || 50) / 100);

        if (isCustomPoly && activePolyPts) {
          const bounds = getPolygonBounds(activePolyPts);
          const shape = createShapeFromPolygon(activePolyPts, bounds.centerX, bounds.centerY);
          const overlayGeo = new THREE.ExtrudeGeometry(shape, { depth: roomHeight * 0.92, bevelEnabled: false });
          const isContractor = resFloorSeq >= Math.floor(resFloors / 2);
          const overlayColor = isContractor ? 0xf59e0b : 0x10b981; // Orange vs Emerald Green
          const overlayMat = new THREE.MeshBasicMaterial({
            color: overlayColor,
            transparent: true,
            opacity: isContractor ? 0.35 : 0.15,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const overlayMesh = new THREE.Mesh(overlayGeo, overlayMat);
          overlayMesh.rotation.x = Math.PI / 2;
          overlayMesh.position.set(0, baseY + slabThickness + roomHeight * 0.92, 0);
          floorGroup.add(overlayMesh);
        } else {
          for (let flatSeq = 0; flatSeq < flatsPerFloor; flatSeq++) {
            const flatId = resFloorSeq * flatsPerFloor + flatSeq + 1;
            const isContractor = params.contractorFlatIds && params.contractorFlatIds.length > 0
              ? params.contractorFlatIds.includes(flatId)
              : flatId > (totalFlats - defaultCount);

            // Get dimensions and center offsets for this specific apartment zone
            let zoneW = floorW * 0.95;
            let zoneD = floorD * 0.95;
            let zoneX = floorCenterX;
            let zoneZ = floorCenterZ;

            if (flatsPerFloor === 2) {
              zoneW = floorW * 0.44;
              zoneX = floorCenterX + ((flatSeq === 0) ? -floorW / 4 : floorW / 4);
            } else if (flatsPerFloor === 3) {
              if (flatSeq === 0) { // Left Front
                zoneW = floorW * 0.42;
                zoneD = floorD * 0.44;
                zoneX = floorCenterX - floorW * 0.24;
                zoneZ = floorCenterZ + floorD / 4;
              } else if (flatSeq === 1) { // Right Front
                zoneW = floorW * 0.42;
                zoneD = floorD * 0.44;
                zoneX = floorCenterX + floorW * 0.24;
                zoneZ = floorCenterZ + floorD / 4;
              } else { // Rear
                zoneW = floorW * 0.85;
                zoneD = floorD * 0.44;
                zoneX = floorCenterX;
                zoneZ = floorCenterZ - floorD / 4;
              }
            } else if (flatsPerFloor === 4) {
              zoneW = floorW * 0.44;
              zoneD = floorD * 0.44;
              if (flatSeq === 0) { // Front Left
                zoneX = floorCenterX - floorW / 4;
                zoneZ = floorCenterZ + floorD / 4;
              } else if (flatSeq === 1) { // Front Right
                zoneX = floorCenterX + floorW / 4;
                zoneZ = floorCenterZ + floorD / 4;
              } else if (flatSeq === 2) { // Rear Left
                zoneX = floorCenterX - floorW / 4;
                zoneZ = floorCenterZ - floorD / 4;
              } else { // Rear Right
                zoneX = floorCenterX + floorW / 4;
                zoneZ = floorCenterZ - floorD / 4;
              }
            }

            // Create translucent overlay box
            const overlayGeo = safeBox(zoneW, roomHeight * 0.92, zoneD);
            const overlayColor = isContractor ? 0xf59e0b : 0x10b981; // Orange vs Emerald Green
            const overlayMat = new THREE.MeshBasicMaterial({
              color: overlayColor,
              transparent: true,
              opacity: isContractor ? 0.35 : 0.15,
              side: THREE.DoubleSide,
              depthWrite: false,
            });
            const overlayMesh = new THREE.Mesh(overlayGeo, overlayMat);
            overlayMesh.position.set(zoneX, midY, zoneZ);
            floorGroup.add(overlayMesh);

            // Technical wireframe around the box to make it look premium
            const edgesGeo = new THREE.EdgesGeometry(overlayGeo);
            const edgesMat = new THREE.LineBasicMaterial({
              color: overlayColor,
              linewidth: 1.5,
              transparent: true,
              opacity: 0.8,
            });
            const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
            wireframe.position.set(zoneX, midY, zoneZ);
            floorGroup.add(wireframe);
          }
        }
      }

      buildingGroup.add(floorGroup);
    }

    // 8. ROOF TYPES: GABLE, FLAT, MANSARD, DUPLEX PENTHOUSE
    // (Only render roof if not isolated to a lower floor or cutaway)
    const shouldRenderRoof = selectedFloor === 'all' || selectedFloor === N - 1;
    if (shouldRenderRoof && !isCutaway) {
      const topFloorY = floorBaseYs[totalFloors - 1] + floorHeights[totalFloors - 1];
      const roofGroup = new THREE.Group();

      const isTopFloorCantilever = totalFloors >= 2 && hasCantilever;
      let topFloorW = W;
      let topFloorD = D;
      let topFloorCenterX = 0;
      let topFloorCenterZ = 0;
      if (isTopFloorCantilever) {
        topFloorW = W + cR + cL;
        topFloorD = D + cF + cB;
        topFloorCenterX = (cR - cL) / 2;
        topFloorCenterZ = (cF - cB) / 2;
      }

      // 50cm standard Turkish eaves overhang (Çatı Saçağı)
      const eavesOverhang = 0.5;

      const roofPolyPts = (isCustomPoly && activePolyPts)
        ? (isTopFloorCantilever ? createOffsetPolygon(activePolyPts, (i) => getFacadeCantilever(i)) : activePolyPts)
        : null;

      const minSpan = isCustomPoly && roofPolyPts
        ? Math.min(getPolygonBounds(roofPolyPts).width, getPolygonBounds(roofPolyPts).depth)
        : Math.min(topFloorW, topFloorD);

      if (roofType === 'gable') {
        // 1. Classic Turkish Gable / Kırma Çatı
        const roofHeight = Math.max(1.8, Math.min(4.2, minSpan * 0.28 + 0.8));
        if (isCustomPoly && roofPolyPts) {
          const bounds = getPolygonBounds(roofPolyPts);
          const roofGeo = createPolygonHipRoofGeometry(roofPolyPts, bounds.centerX, bounds.centerY, roofHeight, eavesOverhang, 0.25);
          const roofMesh = new THREE.Mesh(
            roofGeo,
            new THREE.MeshStandardMaterial({
              color: colors.roof,
              roughness: 0.5,
              metalness: 0.1,
              wireframe: isWireframe,
              side: THREE.DoubleSide,
            })
          );
          roofMesh.position.set(0, topFloorY, 0);
          roofMesh.castShadow = true;
          roofGroup.add(roofMesh);
        } else {
          const roofGeom = createRectangularHipRoofGeometry(topFloorW, topFloorD, roofHeight, eavesOverhang);
          const roofMesh = new THREE.Mesh(
            roofGeom,
            new THREE.MeshStandardMaterial({
              color: colors.roof,
              roughness: 0.5,
              metalness: 0.1,
              wireframe: isWireframe,
              side: THREE.DoubleSide,
            })
          );
          roofMesh.position.set(topFloorCenterX, topFloorY, topFloorCenterZ);
          roofMesh.castShadow = true;
          roofGroup.add(roofMesh);
        }
      } else if (roofType === 'mansard') {
        // 2. MANSARD ROOF (Fransız Mansart Çatı - Dik Alt Eğimler + Güvercinlik Pencereleri)
        const mansardLowerH = Math.max(2.0, Math.min(3.5, minSpan * 0.22 + 0.8));
        const mansardMat = new THREE.MeshStandardMaterial({
          color: colors.roof, // User-selected roof color
          roughness: 0.4,
          metalness: 0.2,
          wireframe: isWireframe,
          side: THREE.DoubleSide,
        });

        if (isCustomPoly && roofPolyPts) {
          const bounds = getPolygonBounds(roofPolyPts);
          const lowerGeo = createPolygonHipRoofGeometry(roofPolyPts, bounds.centerX, bounds.centerY, mansardLowerH, eavesOverhang, 0.2);
          const lowerMesh = new THREE.Mesh(lowerGeo, mansardMat);
          lowerMesh.position.set(0, topFloorY, 0);
          lowerMesh.castShadow = true;
          roofGroup.add(lowerMesh);

          // Dormers along front polygon edge
          const edges = getPolygonEdges(roofPolyPts);
          const mainEntranceIdx = params.mainEntranceFacadeIndex || 0;
          const mainEdge = edges[mainEntranceIdx] || edges[0];
          if (mainEdge) {
            const edgeLen = mainEdge.length;
            const dormerCount = Math.max(1, Math.floor(edgeLen / 4));
            const dormerW = 1.2;
            const dormerH = 1.4;
            const dormerD = 1.1;

            for (let d = 0; d < dormerCount; d++) {
              const t = (d + 1) / (dormerCount + 1);
              const dx = (mainEdge.start.x + t * (mainEdge.end.x - mainEdge.start.x)) - bounds.centerX;
              const dz = (mainEdge.start.y + t * (mainEdge.end.y - mainEdge.start.y)) - bounds.centerY;

              const dBody = new THREE.Mesh(safeBox(dormerW, dormerH, dormerD), wallMaterial);
              dBody.position.set(dx, topFloorY + dormerH / 2 + 0.3, dz);
              dBody.castShadow = true;
              roofGroup.add(dBody);

              const dGlass = new THREE.Mesh(safeBox(dormerW * 0.75, dormerH * 0.7, 0.05), glassMaterial);
              dGlass.position.set(dx, topFloorY + dormerH / 2 + 0.3, dz + 0.12);
              roofGroup.add(dGlass);
            }
          }
        } else {
          const lowerGeo = createRectangularHipRoofGeometry(topFloorW, topFloorD, mansardLowerH, eavesOverhang);
          const lowerMesh = new THREE.Mesh(lowerGeo, mansardMat);
          lowerMesh.position.set(topFloorCenterX, topFloorY, topFloorCenterZ);
          lowerMesh.castShadow = true;
          roofGroup.add(lowerMesh);

          const setback = 0.8;
          const upperCapGeo = safeBox(Math.max(1, topFloorW - setback * 2), 0.15, Math.max(1, topFloorD - setback * 2));
          const upperCapMesh = new THREE.Mesh(upperCapGeo, mansardMat);
          upperCapMesh.position.set(topFloorCenterX, topFloorY + mansardLowerH + 0.08, topFloorCenterZ);
          upperCapMesh.castShadow = true;
          roofGroup.add(upperCapMesh);

          const dormerCount = Math.max(2, Math.floor(topFloorW / 4));
          const dormerW = 1.2;
          const dormerH = 1.4;
          const dormerD = 1.1;

          for (let d = 0; d < dormerCount; d++) {
            const dx = topFloorCenterX - topFloorW / 2 + (topFloorW / (dormerCount + 1)) * (d + 1);

            const dBodyGeo = safeBox(dormerW, dormerH, dormerD);
            const dBody = new THREE.Mesh(dBodyGeo, wallMaterial);
            dBody.position.set(dx, topFloorY + dormerH / 2 + 0.3, topFloorCenterZ + topFloorD / 2 - dormerD / 2 + 0.1);
            dBody.castShadow = true;
            roofGroup.add(dBody);

            const dGlassGeo = safeBox(dormerW * 0.75, dormerH * 0.7, 0.05);
            const dGlass = new THREE.Mesh(dGlassGeo, glassMaterial);
            dGlass.position.set(dx, topFloorY + dormerH / 2 + 0.3, topFloorCenterZ + topFloorD / 2 + 0.12);
            roofGroup.add(dGlass);

            const dRoofGeo = safeCone(dormerW * 0.8, 0.5, 4);
            dRoofGeo.rotateY(Math.PI / 4);
            const dRoof = new THREE.Mesh(dRoofGeo, mansardMat);
            dRoof.position.set(dx, topFloorY + dormerH + 0.3 + 0.25, topFloorCenterZ + topFloorD / 2 - dormerD / 2 + 0.1);
            roofGroup.add(dRoof);
          }

          const crestGeo = safeBox(Math.max(1, topFloorW - setback * 2 + 0.1), 0.08, Math.max(1, topFloorD - setback * 2 + 0.1));
          const crestMesh = new THREE.Mesh(crestGeo, frameMaterial);
          crestMesh.position.set(topFloorCenterX, topFloorY + mansardLowerH + 0.2, topFloorCenterZ);
          roofGroup.add(crestMesh);
        }
      } else if (roofType === 'duplex') {
        // 3. DUPLEX PENTHOUSE ROOF (Çatı Dubleksi - Teras, Pergola, Çatı Katı Dairesi)
        const duplexFloorH = 2.7;
        const terraceDepth = D * 0.45;
        const livingDepth = D - terraceDepth;

        let roofCoreCenterX = 0;
        let roofCoreCenterZ = 0;
        if (isCustomPoly && activePolyPts) {
          const centroid = getPolygonCentroid(activePolyPts);
          const bounds = getPolygonBounds(activePolyPts);
          if (isPointInPolygon(centroid.x, centroid.y, activePolyPts)) {
            roofCoreCenterX = centroid.x - bounds.centerX;
            roofCoreCenterZ = centroid.y - bounds.centerY;
          }
        } else {
          roofCoreCenterX = sW / 2 + eW / 2;
          roofCoreCenterZ = 0;
        }

        if (isCustomPoly && activePolyPts) {
          const bounds = getPolygonBounds(activePolyPts);
          const shape = createShapeFromPolygon(activePolyPts, bounds.centerX, bounds.centerY);
          const roofSlabGeo = new THREE.ExtrudeGeometry(shape, { depth: slabThickness, bevelEnabled: false });
          const roofSlab = new THREE.Mesh(roofSlabGeo, slabMaterial);
          roofSlab.rotation.x = Math.PI / 2;
          roofSlab.position.set(0, topFloorY + slabThickness, 0);
          roofSlab.castShadow = true;
          roofGroup.add(roofSlab);

          // Penthouse suite
          const livingGeo = safeBox(W * 0.7, duplexFloorH, livingDepth * 0.8);
          const livingMesh = new THREE.Mesh(livingGeo, wallMaterial);
          livingMesh.position.set(roofCoreCenterX, topFloorY + duplexFloorH / 2, roofCoreCenterZ - D * 0.1);
          livingMesh.castShadow = true;
          roofGroup.add(livingMesh);

          const pRoofGeo = safeBox(W * 0.75, 0.2, livingDepth * 0.85);
          const pRoof = new THREE.Mesh(
            pRoofGeo,
            new THREE.MeshStandardMaterial({
              color: colors.roof,
              roughness: 0.4,
              metalness: 0.2,
            })
          );
          pRoof.position.set(roofCoreCenterX, topFloorY + duplexFloorH + 0.1, roofCoreCenterZ - D * 0.1);
          roofGroup.add(pRoof);
        } else {
          // Duplex Enclosed Penthouse Living Suite (Back half)
          const livingGeo = safeBox(W * 0.85, duplexFloorH, livingDepth);
          const livingMesh = new THREE.Mesh(livingGeo, wallMaterial);
          livingMesh.position.set(0, topFloorY + duplexFloorH / 2, -terraceDepth / 2);
          livingMesh.castShadow = true;
          roofGroup.add(livingMesh);

          const slidingGlassGeo = safeBox(W * 0.7, duplexFloorH * 0.85, 0.06);
          const slidingGlass = new THREE.Mesh(slidingGlassGeo, glassMaterial);
          slidingGlass.position.set(0, topFloorY + duplexFloorH * 0.48, -terraceDepth / 2 + livingDepth / 2);
          roofGroup.add(slidingGlass);

          const pRoofGeo = safeBox(W * 0.9, 0.2, livingDepth + 0.4);
          const pRoof = new THREE.Mesh(
            pRoofGeo,
            new THREE.MeshStandardMaterial({
              color: colors.roof,
              roughness: 0.4,
              metalness: 0.2,
            })
          );
          pRoof.position.set(0, topFloorY + duplexFloorH + 0.1, -terraceDepth / 2);
          pRoof.rotation.x = -0.05;
          roofGroup.add(pRoof);

          const skyGeo = safeBox(1.4, 0.15, 1.2);
          const skyMesh = new THREE.Mesh(skyGeo, glassMaterial);
          skyMesh.position.set(W * 0.22, topFloorY + duplexFloorH + 0.25, -terraceDepth / 2);
          skyMesh.rotation.x = -0.05;
          roofGroup.add(skyMesh);

          const terraceSlabGeo = safeBox(W, 0.2, terraceDepth);
          const terraceSlab = new THREE.Mesh(
            terraceSlabGeo,
            new THREE.MeshStandardMaterial({
              color: 0x94a3b8,
              roughness: 0.8,
            })
          );
          terraceSlab.position.set(0, topFloorY + 0.1, D / 2 - terraceDepth / 2);
          roofGroup.add(terraceSlab);

          const railH = 1.1;
          const terraceFrontRailGeo = safeBox(W, railH, 0.05);
          const terraceFrontRail = new THREE.Mesh(terraceFrontRailGeo, glassMaterial);
          terraceFrontRail.position.set(0, topFloorY + 0.2 + railH / 2, D / 2);
          roofGroup.add(terraceFrontRail);

          const pergolaBeamCount = 7;
          const beamGeo = safeBox(0.12, 0.22, terraceDepth * 0.85);
          for (let b = 0; b < pergolaBeamCount; b++) {
            const bx = -W * 0.35 + (W * 0.7 / (pergolaBeamCount - 1)) * b;
            const beam = new THREE.Mesh(beamGeo, woodMaterial);
            beam.position.set(bx, topFloorY + 2.5, D / 2 - terraceDepth / 2);
            beam.castShadow = true;
            roofGroup.add(beam);
          }

          const postGeo = safeBox(0.16, 2.5, 0.16);
          const post1 = new THREE.Mesh(postGeo, woodMaterial);
          post1.position.set(-W * 0.35, topFloorY + 1.25, D / 2 - 0.2);
          roofGroup.add(post1);

          const post2 = new THREE.Mesh(postGeo, woodMaterial);
          post2.position.set(W * 0.35, topFloorY + 1.25, D / 2 - 0.2);
          roofGroup.add(post2);
        }
      } else {
        // 4. Flat Roof with Parapet (Teras Çatı)
        const parapetHeight = 0.9;
        if (isCustomPoly && roofPolyPts) {
          const bounds = getPolygonBounds(roofPolyPts);
          const shape = createShapeFromPolygon(roofPolyPts, bounds.centerX, bounds.centerY);
          const roofSlabGeo = new THREE.ExtrudeGeometry(shape, { depth: slabThickness, bevelEnabled: false });
          const roofSlab = new THREE.Mesh(roofSlabGeo, slabMaterial);
          roofSlab.rotation.x = Math.PI / 2;
          roofSlab.position.set(0, topFloorY + slabThickness, 0);
          roofSlab.castShadow = true;
          roofGroup.add(roofSlab);

          const edges = getPolygonEdges(roofPolyPts);
          let signedArea = 0;
          for (let i = 0; i < roofPolyPts.length; i++) {
            const j = (i + 1) % roofPolyPts.length;
            signedArea += (roofPolyPts[i].x * roofPolyPts[j].y - roofPolyPts[j].x * roofPolyPts[i].y);
          }
          const isCW = signedArea > 0;

          const parapetMat = new THREE.MeshStandardMaterial({
            color: isLight ? 0xcbd5e1 : 0x475569,
            roughness: 0.6,
          });

          edges.forEach((edge) => {
            const x1 = edge.start.x - bounds.centerX;
            const z1 = edge.start.y - bounds.centerY;
            const x2 = edge.end.x - bounds.centerX;
            const z2 = edge.end.y - bounds.centerY;
            const dx = x2 - x1;
            const dz = z2 - z1;
            const length = Math.sqrt(dx * dx + dz * dz);

            const normalX = isCW ? dz / length : -dz / length;
            const normalZ = isCW ? -dx / length : dx / length;
            const midX = (x1 + x2) / 2;
            const midZ = (z1 + z2) / 2;

            const wallCenterX = midX - normalX * (0.22 / 2);
            const wallCenterZ = midZ - normalZ * (0.22 / 2);
            const rotationY = Math.atan2(normalX, normalZ);

            const pWall = new THREE.Mesh(safeBox(length, parapetHeight, 0.22), parapetMat);
            pWall.position.set(wallCenterX, topFloorY + parapetHeight / 2, wallCenterZ);
            pWall.rotation.y = rotationY;
            pWall.castShadow = true;
            roofGroup.add(pWall);

            const pCap = new THREE.Mesh(safeBox(length + 0.04, 0.08, 0.28), frameMaterial);
            pCap.position.set(wallCenterX, topFloorY + parapetHeight + 0.04, wallCenterZ);
            pCap.rotation.y = rotationY;
            roofGroup.add(pCap);
          });
        } else {
          const parapetMat = new THREE.LineBasicMaterial({
            color: isLight ? 0x94a3b8 : 0x71717a,
            linewidth: 2,
          });
          const parapetGeo = safeBox(topFloorW, parapetHeight, topFloorD);
          const parapetEdges = new THREE.EdgesGeometry(parapetGeo);
          const parapetLine = new THREE.LineSegments(parapetEdges, parapetMat);
          parapetLine.position.set(topFloorCenterX, topFloorY + parapetHeight / 2, topFloorCenterZ);
          roofGroup.add(parapetLine);
        }
      }

      buildingGroup.add(roofGroup);
    }

    // -------------------------------------------------------------------------
    // HATA AYIKLAMA KATMANI (DEBUG OVERLAY) - Geometrik Sınırlar & Kesişim Noktaları
    // -------------------------------------------------------------------------
    if (showDebugOverlay) {
      const debugGroup = new THREE.Group();

      let bbMinX = -W / 2;
      let bbMaxX = W / 2;
      let bbMinZ = -D / 2;
      let bbMaxZ = D / 2;

      if (isCustomPoly && activePolyPts) {
        const bounds = getPolygonBounds(activePolyPts);
        bbMinX = bounds.minX - bounds.centerX;
        bbMaxX = bounds.maxX - bounds.centerX;
        bbMinZ = bounds.minY - bounds.centerY;
        bbMaxZ = bounds.maxY - bounds.centerY;
      }

      const totalBuildingH = floorBaseYs[totalFloors - 1] + floorHeights[totalFloors - 1];
      const roofH = roofType !== 'flat' ? 2.8 : 0.2;
      const bbMinY = 0;
      const bbMaxY = totalBuildingH + roofH;

      const bbWidth = bbMaxX - bbMinX;
      const bbDepth = bbMaxZ - bbMinZ;
      const bbHeight = bbMaxY - bbMinY;

      // 1. 3D Global Geometrik Sınır Kutusu (Bounding Box Wireframe)
      const bbBoxGeo = safeBox(bbWidth + 0.4, bbHeight, bbDepth + 0.4);
      const bbBoxEdges = new THREE.EdgesGeometry(bbBoxGeo);
      const bbBoxLineMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 });
      const bbBoxLine = new THREE.LineSegments(bbBoxEdges, bbBoxLineMat);
      bbBoxLine.position.set((bbMinX + bbMaxX) / 2, (bbMinY + bbMaxY) / 2, (bbMinZ + bbMaxZ) / 2);
      debugGroup.add(bbBoxLine);

      // 8 Köşe Sınır Noktaları
      const cornerGeo = new THREE.SphereGeometry(0.18, 8, 8);
      const cyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const cornerCoords = [
        [bbMinX - 0.2, bbMinY, bbMinZ - 0.2],
        [bbMaxX + 0.2, bbMinY, bbMinZ - 0.2],
        [bbMinX - 0.2, bbMinY, bbMaxZ + 0.2],
        [bbMaxX + 0.2, bbMinY, bbMaxZ + 0.2],
        [bbMinX - 0.2, bbMaxY, bbMinZ - 0.2],
        [bbMaxX + 0.2, bbMaxY, bbMinZ - 0.2],
        [bbMinX - 0.2, bbMaxY, bbMaxZ + 0.2],
        [bbMaxX + 0.2, bbMaxY, bbMaxZ + 0.2],
      ];
      cornerCoords.forEach(([cx, cy, cz]) => {
        const cMesh = new THREE.Mesh(cornerGeo, cyanMat);
        cMesh.position.set(cx, cy, cz);
        debugGroup.add(cMesh);
      });

      // 2. Kat Tablaları Sınır Hatları & Köşe Düğümleri
      const slabCornerGeo = new THREE.SphereGeometry(0.16, 8, 8);
      const limeMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const lineSlabMat = new THREE.LineBasicMaterial({ color: 0x10b981 });

      floorBaseYs.forEach((yLevel) => {
        if (isCustomPoly && activePolyPts) {
          const bounds = getPolygonBounds(activePolyPts);
          const points3D = activePolyPts.map(p => new THREE.Vector3(p.x - bounds.centerX, yLevel, p.y - bounds.centerY));
          points3D.push(points3D[0]);
          const slabLineGeo = new THREE.BufferGeometry().setFromPoints(points3D);
          const slabLine = new THREE.Line(slabLineGeo, lineSlabMat);
          debugGroup.add(slabLine);

          points3D.slice(0, -1).forEach(pt => {
            const nodeMesh = new THREE.Mesh(slabCornerGeo, limeMat);
            nodeMesh.position.copy(pt);
            debugGroup.add(nodeMesh);
          });
        } else {
          const rectBoxGeo = safeBox(W, 0.05, D);
          const rectEdges = new THREE.EdgesGeometry(rectBoxGeo);
          const rectLine = new THREE.LineSegments(rectEdges, lineSlabMat);
          rectLine.position.set(0, yLevel, 0);
          debugGroup.add(rectLine);

          [
            [-W / 2, yLevel, -D / 2],
            [W / 2, yLevel, -D / 2],
            [-W / 2, yLevel, D / 2],
            [W / 2, yLevel, D / 2],
          ].forEach(([kx, ky, kz]) => {
            const nodeMesh = new THREE.Mesh(slabCornerGeo, limeMat);
            nodeMesh.position.set(kx, ky, kz);
            debugGroup.add(nodeMesh);
          });
        }
      });

      // 3. Çatı ve En Üst Kat Tablası Kesişim Noktaları
      const topSlabY = totalBuildingH;
      const roofPeakY = topSlabY + roofH;

      const roofIntersectGeo = new THREE.SphereGeometry(0.22, 10, 10);
      const redIntersectMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
      const magentaPeakMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });

      const isTopFloorCantilever = totalFloors >= 2 && hasCantilever;
      let topFloorW = W;
      let topFloorD = D;
      let topFloorCenterX = 0;
      let topFloorCenterZ = 0;
      if (isTopFloorCantilever) {
        topFloorW = W + cR + cL;
        topFloorD = D + cF + cB;
        topFloorCenterX = (cR - cL) / 2;
        topFloorCenterZ = (cF - cB) / 2;
      }
      const eavesOverhang = 0.5;

      if (isCustomPoly && activePolyPts) {
        const bounds = getPolygonBounds(activePolyPts);
        activePolyPts.forEach((p) => {
          const eX = p.x - bounds.centerX;
          const eZ = p.y - bounds.centerY;

          const eMesh = new THREE.Mesh(roofIntersectGeo, redIntersectMat);
          eMesh.position.set(eX, topSlabY, eZ);
          debugGroup.add(eMesh);

          const vLineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(eX, topSlabY, eZ),
            new THREE.Vector3(eX, roofPeakY, eZ),
          ]);
          const vLineMat = new THREE.LineDashedMaterial({ color: 0xff0055, dashSize: 0.3, gapSize: 0.2 });
          const vLine = new THREE.Line(vLineGeo, vLineMat);
          vLine.computeLineDistances();
          debugGroup.add(vLine);
        });

        const centroid = getPolygonCentroid(activePolyPts);
        const pMesh = new THREE.Mesh(roofIntersectGeo, magentaPeakMat);
        pMesh.position.set(centroid.x - bounds.centerX, roofPeakY, centroid.y - bounds.centerY);
        debugGroup.add(pMesh);
      } else {
        const eaveNodes = [
          [topFloorCenterX - topFloorW / 2 - eavesOverhang, topSlabY, topFloorCenterZ - topFloorD / 2 - eavesOverhang],
          [topFloorCenterX + topFloorW / 2 + eavesOverhang, topSlabY, topFloorCenterZ - topFloorD / 2 - eavesOverhang],
          [topFloorCenterX - topFloorW / 2 - eavesOverhang, topSlabY, topFloorCenterZ + topFloorD / 2 + eavesOverhang],
          [topFloorCenterX + topFloorW / 2 + eavesOverhang, topSlabY, topFloorCenterZ + topFloorD / 2 + eavesOverhang],
        ];

        let r1X = topFloorCenterX, r2X = topFloorCenterX, r1Z = topFloorCenterZ, r2Z = topFloorCenterZ;
        if (topFloorW >= topFloorD) {
          const ridgeHalfLen = Math.max(0.1, (topFloorW - topFloorD) / 2);
          r1X = topFloorCenterX - ridgeHalfLen;
          r2X = topFloorCenterX + ridgeHalfLen;
        } else {
          const ridgeHalfLen = Math.max(0.1, (topFloorD - topFloorW) / 2);
          r1Z = topFloorCenterZ - ridgeHalfLen;
          r2Z = topFloorCenterZ + ridgeHalfLen;
        }

        eaveNodes.forEach(([ex, ey, ez]) => {
          const eMesh = new THREE.Mesh(roofIntersectGeo, redIntersectMat);
          eMesh.position.set(ex, ey, ez);
          debugGroup.add(eMesh);

          const targetRidgeX = ex < 0 ? r1X : r2X;
          const targetRidgeZ = topFloorW >= topFloorD ? topFloorCenterZ : (ez < topFloorCenterZ ? r1Z : r2Z);

          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(ex, ey, ez),
            new THREE.Vector3(targetRidgeX, roofPeakY, targetRidgeZ),
          ]);
          const lineMat = new THREE.LineBasicMaterial({ color: 0xff0055 });
          const lineMesh = new THREE.Line(lineGeo, lineMat);
          debugGroup.add(lineMesh);
        });

        const ridgeMesh1 = new THREE.Mesh(roofIntersectGeo, magentaPeakMat);
        ridgeMesh1.position.set(r1X, roofPeakY, r1Z);
        debugGroup.add(ridgeMesh1);

        const ridgeMesh2 = new THREE.Mesh(roofIntersectGeo, magentaPeakMat);
        ridgeMesh2.position.set(r2X, roofPeakY, r2Z);
        debugGroup.add(ridgeMesh2);

        // Visual Eaves Boundary Box (dashed line segments) in 3D representing the limit
        const limitW = topFloorW + 2 * eavesOverhang;
        const limitD = topFloorD + 2 * eavesOverhang;
        const limitBoxGeo = safeBox(limitW, totalBuildingH + roofH, limitD);
        const limitEdges = new THREE.EdgesGeometry(limitBoxGeo);
        const limitLineMat = new THREE.LineDashedMaterial({
          color: 0xff0055,
          dashSize: 0.5,
          gapSize: 0.2,
        });
        const limitLine = new THREE.LineSegments(limitEdges, limitLineMat);
        limitLine.computeLineDistances();
        limitLine.position.set(topFloorCenterX, (totalBuildingH + roofH) / 2, topFloorCenterZ);
        debugGroup.add(limitLine);
      }

      buildingGroup.add(debugGroup);
    }

    // 6.3 Render Roads
    if (roadsGroupRef.current) {
      const roadsGroup = roadsGroupRef.current;
      // Clear existing roads
      while (roadsGroup.children.length > 0) {
        const child = roadsGroup.children[0];
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
        roadsGroup.remove(child);
      }

      if (params.roads && params.roads.length > 0) {
        params.roads.forEach((road) => {
          const roadWidth = road.width || 7;
          const roadLength = 300; 
          
          let posX = 0;
          let posZ = 0;
          let rotY = 0;
          
          const offset = 3.0; // Increased offset to accommodate sidewalks (swW = 2.5) without clipping

          if (isCustomPoly && activePolyPts) {
            const edges = getPolygonEdges(activePolyPts);
            const edge = edges[road.facadeIndex % edges.length];
            if (edge) {
              const bounds = getPolygonBounds(activePolyPts);
              const midX = (edge.start.x + edge.end.x) / 2 - bounds.centerX;
              const midZ = (edge.start.y + edge.end.y) / 2 - bounds.centerY;
              
              const dx = edge.end.x - edge.start.x;
              const dz = edge.end.y - edge.start.y;
              const len = Math.sqrt(dx * dx + dz * dz) || 1;
              
              // Normal points outward
              const nx = dz / len;
              const nz = -dx / len;
              
              posX = midX + nx * (roadWidth / 2 + offset);
              posZ = midZ + nz * (roadWidth / 2 + offset);
              rotY = Math.atan2(dz, dx);
            }
          } else {
            // Standard Box (W x D)
            if (road.facadeIndex === 0) { // Front (+Z)
              posZ = D / 2 + roadWidth / 2 + offset;
              rotY = 0;
            } else if (road.facadeIndex === 1) { // Right (+X)
              posX = W / 2 + roadWidth / 2 + offset;
              rotY = Math.PI / 2;
            } else if (road.facadeIndex === 2) { // Rear (-Z)
              posZ = -D / 2 - roadWidth / 2 - offset;
              rotY = 0;
            } else if (road.facadeIndex === 3) { // Left (-X)
              posX = -W / 2 - roadWidth / 2 - offset;
              rotY = Math.PI / 2;
            }
          }

          // Road Surface
          const roadGeo = new THREE.PlaneGeometry(roadLength, roadWidth);
          const roadMat = new THREE.MeshStandardMaterial({ 
            color: 0x334155, 
            roughness: 0.9,
            metalness: 0.05
          });
          const roadMesh = new THREE.Mesh(roadGeo, roadMat);
          roadMesh.rotation.x = -Math.PI / 2;
          roadMesh.rotation.z = rotY;
          roadMesh.position.set(posX, 0.01, posZ);
          roadMesh.receiveShadow = true;
          roadsGroup.add(roadMesh);

          // Road Markings (Yellow/White center line)
          if (road.type !== 'street') {
            const lineGeo = new THREE.PlaneGeometry(roadLength, 0.15);
            const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
            const lineMesh = new THREE.Mesh(lineGeo, lineMat);
            lineMesh.rotation.x = -Math.PI / 2;
            lineMesh.rotation.z = rotY;
            lineMesh.position.set(posX, 0.02, posZ);
            roadsGroup.add(lineMesh);
          }
          
          // Side Curbs / Sidewalks (Tretuvar)
          const swW = 2.5; // Sidewalk width
          const swGeo = new THREE.PlaneGeometry(roadLength, swW);
          const swMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
          
          // Calculate sidewalk positions based on road normal (perpendicular to road direction)
          const s1Offset = (roadWidth / 2 + swW / 2);
          const nx_sw = -Math.sin(rotY);
          const nz_sw = Math.cos(rotY);

          const s1 = new THREE.Mesh(swGeo, swMat);
          s1.rotation.x = -Math.PI / 2;
          s1.rotation.z = rotY;
          s1.position.set(posX + nx_sw * s1Offset, 0.12, posZ + nz_sw * s1Offset);
          roadsGroup.add(s1);

          const s2 = new THREE.Mesh(swGeo, swMat);
          s2.rotation.x = -Math.PI / 2;
          s2.rotation.z = rotY;
          s2.position.set(posX - nx_sw * s1Offset, 0.12, posZ - nz_sw * s1Offset);
          roadsGroup.add(s2);
        });
      }
    }

    // Center building at origin
    buildingGroup.position.set(0, 0, 0);

    // Explicitly enable shadows for all meshes in the building group
    buildingGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = !isXRay;
        child.receiveShadow = true;
      }
    });

    scene.add(buildingGroup);

    // Adjust camera to frame the building properly
    if (cameraRef.current && controlsRef.current) {
      const maxDim = Math.max(W, D, N * H);
      const camDist = maxDim * 1.7;
      controlsRef.current.target.set(0, (N * H) / 2, 0);
      controlsRef.current.update();
    }
  }, [params, isWireframe, showDebugOverlay, selectedFloor, explodeRatio, isLight, buildingColor]);

  // Initialize Three.js Canvas & Animation Loop
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 550;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Atmospheric Sky Gradient
    const bgHex = isGray ? 0xd1d5db : 0xf0f9ff;
    scene.background = new THREE.Color(bgHex);
    
    // Add a sky dome for a more immersive feel
    const skyGeo = new THREE.SphereGeometry(450, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      color: isLight ? 0xbae6fd : 0x94a3b8,
      side: THREE.BackSide,
      fog: false,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 1200);
    cameraRef.current = camera;
    camera.position.set(32, 24, 38);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      logarithmicDepthBuffer: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isLight ? 1.1 : 1.3;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Stay slightly above ground
    controls.minDistance = 8;
    controls.maxDistance = 350;
    controls.autoRotate = isAutoRotate;
    controls.autoRotateSpeed = 0.65;

    // 5. Lighting
    // Cinematic Hemisphere Light (Sky illumination + Ground bounce)
    const hemiLight = new THREE.HemisphereLight(
      isLight ? 0xe0f2fe : 0xd1d5db, // Sky color
      isLight ? 0x166534 : 0x334155, // Ground/Grass bounce color
      isLight ? 0.8 : 0.6
    );
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(
      isLight ? 0xffffff : 0xd4d4d8,
      isLight ? 0.35 : 0.25
    );
    ambientLightRef.current = ambientLight;
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(
      isLight ? 0xfffaed : 0xffffff,
      isLight ? 2.2 : 1.8
    );
    sunLight.position.set(35, 60, 45);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 250;
    const d = 35;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLightRef.current = sunLight;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
    fillLight.position.set(-30, 20, -30);
    scene.add(fillLight);

    // 5.1 3D Sun Sphere Mesh in the sky
    const sunSphereGeo = new THREE.SphereGeometry(3.5, 16, 16);
    const sunSphereMat = new THREE.MeshBasicMaterial({
      color: 0xffdd55,
      wireframe: false,
    });
    const sunSphereMesh = new THREE.Mesh(sunSphereGeo, sunSphereMat);
    sunSphereMesh.position.set(35, 60, 45);
    sunSphereMeshRef.current = sunSphereMesh;
    scene.add(sunSphereMesh);

    // 6. Ground & Environment
    // Create a procedural grass/garden texture for the ground
    const createGroundTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      // Base green/grey
      ctx.fillStyle = isLight ? '#14532d' : '#334155';
      ctx.fillRect(0, 0, 512, 512);
      // Add organic noise/texture
      for (let i = 0; i < 8000; i++) {
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.1})`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(12, 12);
      return tex;
    };

    const groundGeo = new THREE.CircleGeometry(180, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      map: createGroundTexture(),
      roughness: 0.9,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.15;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridColor1 = isLight ? 0xffffff : 0x94a3b8;
    const gridColor2 = isLight ? 0x16a34a : 0x475569;
    const grid = new THREE.GridHelper(100, 50, gridColor1, gridColor2);
    grid.position.y = -0.12;
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    // 6.1 3D Ground Compass Rose (Kuzey / Güney / Doğu / Batı)
    const compassGroup = new THREE.Group();
    compassGroup.position.y = -0.04;
    compassGroupRef.current = compassGroup;

    // Outer compass ring
    const ringGeo = new THREE.RingGeometry(24, 24.6, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isLight ? 0x6366f1 : 0x818cf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    compassGroup.add(ringMesh);

    // North Pointer (Red Arrow pointing -Z)
    const northArrowShape = new THREE.Shape();
    northArrowShape.moveTo(0, 27);
    northArrowShape.lineTo(2.2, 23);
    northArrowShape.lineTo(-2.2, 23);
    northArrowShape.closePath();
    const northGeo = new THREE.ShapeGeometry(northArrowShape);
    const northMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    const northMesh = new THREE.Mesh(northGeo, northMat);
    northMesh.rotation.x = -Math.PI / 2;
    compassGroup.add(northMesh);

    // South Pointer (Blue Arrow pointing +Z)
    const southArrowShape = new THREE.Shape();
    southArrowShape.moveTo(0, -27);
    southArrowShape.lineTo(2.2, -23);
    southArrowShape.lineTo(-2.2, -23);
    southArrowShape.closePath();
    const southGeo = new THREE.ShapeGeometry(southArrowShape);
    const southMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide });
    const southMesh = new THREE.Mesh(southGeo, southMat);
    southMesh.rotation.x = -Math.PI / 2;
    compassGroup.add(southMesh);

    scene.add(compassGroup);
    
    // 6.2 Roads Group
    const roadsGroup = new THREE.Group();
    roadsGroup.position.y = -0.05;
    roadsGroupRef.current = roadsGroup;
    scene.add(roadsGroup);

    const planeGeo = new THREE.PlaneGeometry(200, 200);
    const planeMat = new THREE.ShadowMaterial({ opacity: isLight ? 0.25 : 0.4 });
    const shadowPlane = new THREE.Mesh(planeGeo, planeMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.06;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Build model
    buildScene();

    // Resize observer
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Animation Loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
      if (rendererRef.current) rendererRef.current.dispose();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [isLight]);

  // Re-build geometry on params change
  useEffect(() => {
    buildScene();
  }, [buildScene]);

  // Synchronize Solar Light, Sun Sphere & Building Compass Orientation
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoRotate;
    }
  }, [isAutoRotate]);

  useEffect(() => {
    // 1. Rotate building group according to compass angle
    if (buildingGroupRef.current) {
      buildingGroupRef.current.rotation.y = (buildingRotation * Math.PI) / 180;
    }
    if (roadsGroupRef.current) {
      roadsGroupRef.current.rotation.y = (buildingRotation * Math.PI) / 180;
    }

    // 2. Adjust Sun Position and Lighting when in solarMode or with custom angles
    if (solarMode && sunAltitude !== undefined && sunAzimuth !== undefined) {
      const R = 85;
      const altRad = (sunAltitude * Math.PI) / 180;
      const azRad = (sunAzimuth * Math.PI) / 180;

      // Azimuth: 0 = North (+Z offset in scene or -Z), 90 = East (+X), 180 = South (-Z or +Z), 270 = West (-X)
      // In Three.js: -Z is North, +Z is South, +X is East, -X is West
      const y = Math.max(1.5, R * Math.sin(altRad));
      const rGround = R * Math.cos(altRad);
      const x = rGround * Math.sin(azRad);
      const z = -rGround * Math.cos(azRad); // -cos(azimuth) maps 0 (North) to -Z, 180 (South) to +Z

      if (sunLightRef.current) {
        sunLightRef.current.position.set(x, y, z);
        
        if (sunAltitude > 0) {
          const intensity = Math.max(0.35, Math.sin(altRad) * 1.5);
          sunLightRef.current.intensity = intensity;
          
          if (sunAltitude < 12) {
            // Golden Dawn / Dusk orange
            sunLightRef.current.color.setHex(0xff7b25);
          } else if (sunAltitude < 30) {
            // Warm morning / late afternoon light
            sunLightRef.current.color.setHex(0xffdf99);
          } else {
            // Crisp midday sunlight
            sunLightRef.current.color.setHex(0xfffaed);
          }
        } else {
          // Night / twilight
          sunLightRef.current.intensity = 0.08;
          sunLightRef.current.color.setHex(0x38bdf8);
        }
      }

      if (sunSphereMeshRef.current) {
        sunSphereMeshRef.current.visible = sunAltitude > -2;
        sunSphereMeshRef.current.position.set(x, y, z);
        const mat = sunSphereMeshRef.current.material as THREE.MeshBasicMaterial;
        if (mat) {
          mat.color.setHex(sunAltitude < 15 ? 0xff5500 : 0xffdd55);
        }
      }

      if (ambientLightRef.current) {
        if (sunAltitude > 15) {
          ambientLightRef.current.intensity = isLight ? 0.5 : 0.4;
          ambientLightRef.current.color.setHex(isLight ? 0xffffff : 0xd4d4d8);
        } else if (sunAltitude > 0) {
          ambientLightRef.current.intensity = isLight ? 0.35 : 0.3;
          ambientLightRef.current.color.setHex(0xffeedd);
        } else {
          ambientLightRef.current.intensity = 0.15;
          ambientLightRef.current.color.setHex(0x64748b);
        }
      }
    } else {
      // Default non-solar lighting
      if (ambientLightRef.current) {
        ambientLightRef.current.intensity = isLight ? 0.5 : 0.4;
        ambientLightRef.current.color.setHex(isLight ? 0xffffff : 0xd4d4d8);
      }
      if (sunLightRef.current) {
        sunLightRef.current.position.set(35, 60, 45);
        sunLightRef.current.intensity = isLight ? 1.8 : 1.5;
        sunLightRef.current.color.setHex(isLight ? 0xfffaed : 0xffffff);
      }
      if (sunSphereMeshRef.current) {
        sunSphereMeshRef.current.position.set(35, 60, 45);
        sunSphereMeshRef.current.visible = true;
      }
    }
  }, [solarMode, sunAltitude, sunAzimuth, buildingRotation, isLight]);

  // Camera presets
  const applyCameraPreset = useCallback((preset: CameraPresetType) => {
    if (!cameraRef.current || !controlsRef.current) return;
    setCameraPreset(preset);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const H = (params?.floorHeight || 2.95) * (params?.floorCount || 5);
    const targetY = H / 2;

    controls.target.set(0, targetY, 0);

    const W = params?.facadeWidth || 14;
    const D = params?.facadeDepth || 16;
    const dist = Math.max(W, D, H) * 1.8;

    switch (preset) {
      case 'front':
        camera.position.set(0, targetY + 2, dist);
        break;
      case 'rear':
        camera.position.set(0, targetY + 2, -dist);
        break;
      case 'right':
      case 'side':
        camera.position.set(dist, targetY + 2, 0);
        break;
      case 'left':
        camera.position.set(-dist, targetY + 2, 0);
        break;
      case 'top':
        camera.position.set(0, dist * 1.35, 0.05);
        break;
      case 'iso':
      default:
        camera.position.set(dist * 0.7, dist * 0.65, dist * 0.7);
        break;
    }
    controls.update();
  }, [params.floorHeight, params.floorCount, params.facadeWidth, params.facadeDepth]);

  useEffect(() => {
    if (forcedCameraPreset) {
      // Use a small delay to ensure scene is built and refs are set
      const timer = setTimeout(() => {
        applyCameraPreset(forcedCameraPreset);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [forcedCameraPreset, applyCameraPreset]);

  // Download screenshot as PNG
  const handleDownloadSnapshot = () => {
    if (!rendererRef.current) return;
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `AB_YAPI_3D_Model_${params.roomType}_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  // Export 3D model as Apple USDZ (Native AR Quick Look for iPhone / iPad)
  const handleExportUSDZ = async () => {
    if (!buildingGroupRef.current) return;
    setIsExportingUSDZ(true);
    setExportFeedback('iPhone AR / USDZ modeli derleniyor...');
    try {
      buildingGroupRef.current.updateMatrixWorld(true);
      const exporter = new USDZExporter();
      // Three.js USDZExporter uses parseAsync
      const arrayBuffer = await exporter.parseAsync(buildingGroupRef.current, {
        quickLookCompatible: true,
        maxTextureSize: 1024,
      });
      const blob = new Blob([arrayBuffer], { type: 'model/vnd.usdz+zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('rel', 'ar');
      a.download = `AB_YAPI_${params.floorCount}Kat_Bina.usdz`;
      const img = document.createElement('img');
      img.alt = 'AR Quick Look';
      a.appendChild(img);
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 500);
      setExportFeedback('iPhone AR Quick Look (.usdz) başarıyla oluşturuldu ve indirildi!');
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err: any) {
      console.error('USDZ export error:', err);
      setExportFeedback('USDZ hatası: ' + (err?.message || 'Dönüştürme yapılamadı'));
      setTimeout(() => setExportFeedback(null), 4000);
    } finally {
      setIsExportingUSDZ(false);
    }
  };

  // Export 3D model as universal GLTF/GLB
  const handleExportGLTF = () => {
    if (!buildingGroupRef.current) return;
    setIsExportingGLTF(true);
    setExportFeedback('3D GLB dosyası oluşturuluyor...');
    try {
      const exporter = new GLTFExporter();
      exporter.parse(
        buildingGroupRef.current,
        (gltf) => {
          const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `AB_YAPI_${params.floorCount}Kat_Bina.glb`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setIsExportingGLTF(false);
          setExportFeedback('3D GLB modeli indirildi!');
          setTimeout(() => setExportFeedback(null), 4000);
        },
        (error) => {
          console.error('GLTF export error:', error);
          setIsExportingGLTF(false);
          setExportFeedback('GLTF dışa aktarma hatası.');
          setTimeout(() => setExportFeedback(null), 3000);
        },
        { binary: true }
      );
    } catch (err) {
      console.error('GLTF export error:', err);
      setIsExportingGLTF(false);
    }
  };

  return (
    <div className={`relative w-full h-[540px] sm:h-[620px] rounded-3xl overflow-hidden border ${isGray ? 'border-slate-300' : 'border-slate-200'} shadow-lg transition-colors duration-300`}>
      {/* Three.js canvas container */}
      <div
        ref={containerRef}
        className={`w-full h-full cursor-grab active:cursor-grabbing ${
          isGray ? 'bg-slate-200/50' : 'bg-slate-50'
        }`}
      />

      {/* Export Status Toast */}
      {exportFeedback && !hideControls && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="px-4 py-2 rounded-2xl text-xs font-semibold shadow-xl border flex items-center gap-2 animate-fade-in bg-white text-indigo-700 border-indigo-200">
            <Sparkles className="w-4 h-4 text-indigo-500 animate-spin" />
            <span>{exportFeedback}</span>
          </div>
        </div>
      )}

      {/* Top Left Overlay: Building Status & Interactive Facade Style Selector */}
      {!hideControls && (
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-20 max-w-[calc(100vw-120px)] sm:max-w-md">
          {/* Status Badge */}
          <div className={`backdrop-blur-md px-3.5 py-2.5 rounded-2xl border shadow-md flex items-center gap-3 ${
            isGray ? 'bg-white/95 text-slate-800 border-slate-300' : 'bg-white/95 text-slate-800 border-slate-200'
          }`}>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="text-xs">
              <span className="font-bold tracking-wide block">
                {params.floorCount} Kat + {params.basementCount} Bodrum ({params.roomType}) - Kat Başına {params.flatsPerFloor} Daire
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Ön: {params.facadeWidth.toFixed(1)}m × Yan: {params.facadeDepth.toFixed(1)}m | Çatı:{' '}
                {params.roofType === 'duplex'
                  ? 'Çatı Dubleksi'
                  : params.roofType === 'mansard'
                  ? 'Mansart Çatı'
                  : params.roofType === 'gable'
                  ? 'Kırma Çatı'
                  : 'Teras Çatı'}
              </span>
            </div>
          </div>

          {/* Canlı Dış Cephe & Çatı Rengi Canlı Seçim Paneli */}
          <div className="pointer-events-auto relative">
            <button
              type="button"
              onClick={() => setIsColorQuickPickerOpen(!isColorQuickPickerOpen)}
              className={`backdrop-blur-md px-3 py-2 rounded-2xl border shadow-md flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                isColorQuickPickerOpen
                  ? 'bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-300'
                  : isGray
                  ? 'bg-white/95 text-slate-800 border-slate-300 hover:bg-slate-50'
                  : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Palette className={`w-4 h-4 ${isColorQuickPickerOpen ? 'text-white' : 'text-indigo-600'}`} />
              
              {/* Color dots preview */}
              <div className="flex items-center -space-x-1 shrink-0">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/80 shadow-xs"
                  style={{ backgroundColor: params.wallColor || '#f1f5f9' }}
                  title="Dış Cephe Duvarı"
                />
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/80 shadow-xs"
                  style={{ backgroundColor: params.roofColor || '#b91c1c' }}
                  title="Çatı Kaplaması"
                />
              </div>

              <div className="text-left leading-tight pr-1">
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                  Renk Seçimi
                </div>
                <div className="text-xs font-bold truncate max-w-[130px] sm:max-w-[170px]">
                  Dış Görünüm & Çatı
                </div>
              </div>

              {isColorQuickPickerOpen ? (
                <ChevronUp className="w-3.5 h-3.5 opacity-70" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              )}
            </button>

            {/* Quick Color Picker Popover */}
            {isColorQuickPickerOpen && (
              <div className={`mt-2 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl animate-fade-in w-72 sm:w-80 space-y-3 ${
                isGray ? 'bg-white/98 border-slate-300 text-slate-800' : 'bg-white/98 border-slate-200 text-slate-800'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                    <Palette className="w-4 h-4 text-indigo-600" />
                    Dış Görünüm & Çatı Renkleri
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsColorQuickPickerOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs px-1.5 py-0.5 rounded-md hover:bg-slate-100"
                  >
                    Kapat
                  </button>
                </div>

                {/* Duvar Rengi */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full border border-black/20" style={{ backgroundColor: params.wallColor || '#f1f5f9' }} />
                      Dış Cephe Duvarı
                    </span>
                    <input
                      type="color"
                      value={params.wallColor || '#f1f5f9'}
                      onChange={(e) => onUpdateColors?.({ wallColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {WALL_COLOR_PRESETS.slice(0, 6).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onUpdateColors?.({ wallColor: p.hex })}
                        title={p.name}
                        className="w-5 h-5 rounded-full border border-black/20 hover:scale-110 transition-transform shrink-0"
                        style={{ backgroundColor: p.hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Çatı Rengi */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full border border-black/20" style={{ backgroundColor: params.roofColor || '#b91c1c' }} />
                      Çatı Kaplaması
                    </span>
                    <input
                      type="color"
                      value={params.roofColor || '#b91c1c'}
                      onChange={(e) => onUpdateColors?.({ roofColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {ROOF_COLOR_PRESETS.slice(0, 6).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onUpdateColors?.({ roofColor: p.hex })}
                        title={p.name}
                        className="w-5 h-5 rounded-full border border-black/20 hover:scale-110 transition-transform shrink-0"
                        style={{ backgroundColor: p.hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Vurgu & Söve Rengi */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full border border-black/20" style={{ backgroundColor: params.accentColor || '#b5734c' }} />
                      Ahşap & Söve Detayları
                    </span>
                    <input
                      type="color"
                      value={params.accentColor || '#b5734c'}
                      onChange={(e) => onUpdateColors?.({ accentColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {ACCENT_COLOR_PRESETS.slice(0, 6).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onUpdateColors?.({ accentColor: p.hex })}
                        title={p.name}
                        className="w-5 h-5 rounded-full border border-black/20 hover:scale-110 transition-transform shrink-0"
                        style={{ backgroundColor: p.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Right Toolbar: Camera & Render & Export Controls */}
      {!hideControls && (
        <>
          {showStreetNames && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="bg-slate-900/70 text-white px-4 py-2 rounded-lg text-sm font-bold backdrop-blur-sm">
                Cadde / Sokak İsimleri (Önizleme)
              </div>
            </div>
          )}
          <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto z-10 hidden sm:flex">
          {/* Street names toggle */}
          <button
            type="button"
            onClick={() => setShowStreetNames(!showStreetNames)}
            className={`p-2 rounded-xl text-xs transition-all ${
              showStreetNames
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Cadde ve Sokak İsimlerini Göster"
          >
            <MapPin className="w-4 h-4" />
          </button>
          {/* Color picker */}
          <div className="p-1.5 rounded-2xl border bg-white/95 border-slate-200">
            <input
              type="color"
              value={buildingColor || params.wallColor || '#f1f5f9'}
              onChange={(e) => {
                setBuildingColor(e.target.value);
                onUpdateColors?.({ wallColor: e.target.value });
              }}
              className="w-8 h-8 rounded cursor-pointer"
              title="Manuel Bina Rengi Seç"
            />
          </div>
        {/* Camera presets */}
        <div className={`flex flex-col gap-1 backdrop-blur-md p-1.5 rounded-2xl border shadow-md ${
          isGray ? 'bg-white/95 border-slate-300 text-slate-700' : 'bg-white/95 border-slate-200 text-slate-700'
        }`}>
          <button
            type="button"
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            className={`p-1.5 rounded-xl text-xs flex items-center justify-center transition-all ${
              isAutoRotate
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={isAutoRotate ? "Otomatik Sunumu Durdur" : "Otomatik Sunumu Başlat (360°)"}
          >
            <RotateCcw className={`w-4 h-4 ${isAutoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
          </button>
          <div className="h-px bg-slate-200/50 my-0.5 mx-1" />
          <button
            type="button"
            onClick={() => applyCameraPreset('iso')}
            className={`p-1.5 rounded-xl text-xs flex items-center justify-center transition-all ${
              cameraPreset === 'iso'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="3D İzometrik Görünüm"
          >
            <Compass className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => applyCameraPreset('front')}
            className={`px-1.5 py-1 rounded-xl text-xs flex items-center justify-center transition-all ${
              cameraPreset === 'front'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Ön Cephe"
          >
            <span className="text-[10px] font-bold">ÖN</span>
          </button>
        </div>

        {/* Visibility tools */}
        <div className={`flex flex-col gap-1 backdrop-blur-md p-1.5 rounded-2xl border shadow-md ${
          isGray ? 'bg-white/95 border-slate-300 text-slate-700' : 'bg-white/95 border-slate-200 text-slate-700'
        }`}>
          <button
            type="button"
            onClick={() => setIsWireframe(!isWireframe)}
            className={`p-2 rounded-xl text-xs transition-all ${
              isWireframe
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Tel Kafes (Wireframe) Modu"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowDebugOverlay(!showDebugOverlay)}
            className={`p-2 rounded-xl text-xs transition-all ${
              showDebugOverlay
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Hata Ayıklama Katmanı (Geometrik Sınır Kutusu & Kesişim Noktaları)"
          >
            <Bug className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDownloadSnapshot}
            className="p-2 rounded-xl transition-all text-xs text-slate-600 hover:text-emerald-600 hover:bg-slate-100"
            title="3D Model Görüntüsünü İndir (PNG)"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* 3D Exports for iOS / AR Quick Look */}
        <div className={`flex flex-col gap-1 backdrop-blur-md p-1.5 rounded-2xl border shadow-md ${
          isGray ? 'bg-white/95 border-slate-300 text-slate-700' : 'bg-white/95 border-slate-200 text-slate-700'
        }`}>
          <button
            type="button"
            onClick={() => setIsMaps3DOpen(true)}
            className="p-2 rounded-xl transition-all text-xs flex flex-col items-center gap-0.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 border border-emerald-100"
            title="Google Photorealistic 3D Tiles (Dünya Koordinatlarında Göster)"
          >
            <Globe className="w-4 h-4" />
            <span className="text-[8px] font-bold">3D MAP</span>
          </button>

          <button
            type="button"
            onClick={handleExportUSDZ}
            disabled={isExportingUSDZ}
            className={`p-2 rounded-xl transition-all text-xs flex flex-col items-center gap-0.5 ${
              isExportingUSDZ
                ? 'opacity-50 cursor-not-allowed'
                : 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800'
            }`}
            title="iPhone/iPad AR Quick Look (.usdz)"
          >
            <Smartphone className="w-4 h-4" />
            <span className="text-[8px] font-bold">AR</span>
          </button>

          <button
            type="button"
            onClick={handleExportGLTF}
            disabled={isExportingGLTF}
            className={`p-2 rounded-xl transition-all text-xs flex flex-col items-center gap-0.5 ${
              isExportingGLTF
                ? 'opacity-50 cursor-not-allowed'
                : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'
            }`}
            title="Evrensel 3D Modeli İndir (.glb)"
          >
            <Box className="w-4 h-4" />
            <span className="text-[8px] font-bold">GLB</span>
          </button>
        </div>
      </div>
        </>
      )}

      {/* Bottom Bar: Explode Floors Slider & Floor Isolation */}
      {!hideControls && (
        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-center sm:justify-between gap-3 pointer-events-none">
        
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
          {/* Explode Floors Slider */}
          <div className={`pointer-events-auto flex items-center gap-3 backdrop-blur-md px-4 py-2.5 rounded-2xl border shadow-md text-xs ${
            isGray ? 'bg-white/95 border-slate-300 text-slate-800' : 'bg-white/95 border-slate-200 text-slate-800'
          }`}>
            <span className="text-[11px] font-semibold flex items-center gap-1.5 text-slate-700">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Katları Patlat:</span>
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={explodeRatio}
              onChange={(e) => setExplodeRatio(parseFloat(e.target.value))}
              className="w-24 sm:w-36 accent-indigo-600 cursor-pointer"
            />
            <span className="font-mono text-[11px] text-indigo-600 font-bold">
              {Math.round(explodeRatio * 100)}%
            </span>
          </div>

          {/* Sun Hour Slider (Overlay) */}
          {onUpdateSunTimeHour && (
            <div className={`pointer-events-auto flex items-center gap-3 backdrop-blur-md px-4 py-2.5 rounded-2xl border shadow-md text-xs ring-1 ring-amber-200/50 ${
              isGray ? 'bg-white/95 border-slate-300 text-slate-800' : 'bg-white/95 border-slate-200 text-slate-800'
            }`}>
              <span className="text-[11px] font-bold flex items-center gap-1.5 text-slate-700">
                <Sun className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="uppercase tracking-tight">Güneş Saati:</span>
              </span>
              
              <button
                type="button"
                onClick={onToggleSunPlay}
                className={`p-1.5 rounded-lg transition-all shadow-sm active:scale-95 ${
                  isPlayingSun ? 'bg-amber-500 text-white shadow-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isPlayingSun ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
              </button>

              <input
                type="range"
                min="5.5"
                max="20.5"
                step="0.1"
                value={sunTimeHour}
                onChange={(e) => onUpdateSunTimeHour(parseFloat(e.target.value))}
                className="w-24 sm:w-40 accent-amber-500 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
              />
              <span className="font-mono text-xs text-amber-600 font-black bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                {Math.floor(sunTimeHour).toString().padStart(2, '0')}:
                {Math.round((sunTimeHour % 1) * 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Building Rotation Slider (Overlay) */}
          {onUpdateBuildingRotation && (
            <div className={`pointer-events-auto flex items-center gap-3 backdrop-blur-md px-4 py-2.5 rounded-2xl border shadow-md text-xs ring-1 ring-indigo-200/50 ${
              isGray ? 'bg-white/95 border-slate-300 text-slate-800' : 'bg-white/95 border-slate-200 text-slate-800'
            }`}>
              <span className="text-[11px] font-bold flex items-center gap-1.5 text-slate-700">
                <RotateCcw className="w-4 h-4 text-indigo-600" />
                <span className="uppercase tracking-tight">Yapı Rotasyonu:</span>
              </span>
              
              <input
                type="range"
                min="0"
                max="359"
                step="1"
                value={buildingRotation}
                onChange={(e) => onUpdateBuildingRotation(parseInt(e.target.value))}
                className="w-24 sm:w-40 accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
              />
              <span className="font-mono text-xs text-indigo-700 font-black bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                {buildingRotation}°
              </span>
            </div>
          )}
        </div>

        {/* Floor selector */}
        <div className={`pointer-events-auto flex items-center gap-2 backdrop-blur-md px-3.5 py-2 rounded-2xl border shadow-md text-xs ${
          isGray ? 'bg-white/95 border-slate-300 text-slate-800' : 'bg-white/95 border-slate-200 text-slate-800'
        }`}>
          <span className="text-[11px] text-slate-600">
            Kat İncele:
          </span>
          <select
            value={selectedFloor === 'all' ? 'all' : String(selectedFloor)}
            onChange={(e) =>
              setSelectedFloor(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-hidden border bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600"
          >
            <option value="all">Tüm Bina</option>
            {params.basementCount > 0 && <option value="basement">Bodrum Kat</option>}
            {Array.from({ length: params.floorCount }).map((_, i) => (
              <option key={i} value={i}>
                {i === 0
                  ? params.hasGroundFloorShop
                    ? 'Zemin Kat (Dükkan / Mağaza)'
                    : 'Zemin Kat (Giriş / Daireler)'
                  : i === 1 && params.hasCantilever
                  ? '1. Kat (Çıkmalı Normal Kat)'
                  : i === params.floorCount - 1 && params.roofType === 'duplex'
                  ? `${i}. Kat (Dubleks Alt Kat)`
                  : `${i}. Normal Kat`}
              </option>
            ))}
          </select>
        </div>
      </div>
      )}
      {/* Bottom Left: Debug Overlay Legend Panel */}
      {showDebugOverlay && !hideControls && (
        <div className="absolute bottom-4 left-4 z-20 pointer-events-auto bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-3 rounded-2xl border border-cyan-500/40 shadow-xl max-w-xs text-xs space-y-1.5 animate-fade-in">
          <div className="flex items-center gap-2 font-bold text-cyan-400 border-b border-slate-700/80 pb-1.5">
            <Bug className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>HATA AYIKLAMA (DEBUG MODE)</span>
          </div>
          <div className="text-[11px] text-slate-300 space-y-1 font-mono">
            <p className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block shrink-0" />
              <span><strong>Geometrik Sınır Kutusu (BB):</strong> {(params.facadeWidth || 14).toFixed(1)}m × {(params.facadeDepth || 16).toFixed(1)}m</span>
            </p>
            <p className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0" />
              <span><strong>Kat Tablaları:</strong> {params.floorCount} Kat Düğüm Noktası</span>
            </p>
            <p className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block shrink-0" />
              <span><strong>Kesişim Noktaları:</strong> Çatı Saçak & Mahya Düğümleri</span>
            </p>
          </div>
        </div>
      )}

      {/* Google Maps 3D View Modal */}
      {isMaps3DOpen && (
        <GoogleMaps3DView 
          params={params} 
          buildingGroup={buildingGroupRef.current} 
          onClose={() => setIsMaps3DOpen(false)} 
        />
      )}
    </div>
  );
};
