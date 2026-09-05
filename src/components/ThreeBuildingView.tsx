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
} from 'lucide-react';
import { BuildingModelParams } from '../types';
import { generateFacadeConfigs, getPolygonEdges, getPolygonBounds, isPointInPolygon, getPolygonCentroid } from '../utils/footprintUtils';

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

interface ThreeBuildingViewProps {
  params: BuildingModelParams;
  theme?: 'light' | 'gray' | 'dark';
  solarMode?: boolean;
  sunAltitude?: number;
  sunAzimuth?: number;
  buildingRotation?: number;
  isSolarHeatmap?: boolean;
  forcedCameraPreset?: 'iso' | 'front' | 'side' | 'top';
  hideControls?: boolean;
}

export const ThreeBuildingView: React.FC<ThreeBuildingViewProps> = ({
  params,
  theme = 'light',
  solarMode = false,
  sunAltitude = 45,
  sunAzimuth = 180,
  buildingRotation = 0,
  isSolarHeatmap = false,
  forcedCameraPreset,
  hideControls = false,
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

  // View settings
  const [explodeRatio, setExplodeRatio] = useState<number>(0);
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [showCoreHighlight, setShowCoreHighlight] = useState<boolean>(true);
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'front' | 'side' | 'top'>(forcedCameraPreset || 'iso');
  const [isExportingUSDZ, setIsExportingUSDZ] = useState<boolean>(false);
  const [isExportingGLTF, setIsExportingGLTF] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const isGray = theme === 'gray';
  const isLight = !isGray;

  // Colors & Materials depending on facade style
  const getStyleColors = useCallback((style: BuildingModelParams['facadeStyle']) => {
    switch (style) {
      case 'wood_anthracite':
        return {
          wall: 0x22252a, // dark anthracite
          woodAccent: 0xb5734c, // warm teak wood
          slab: 0xd6d3cb, // light concrete
          glass: 0x38bdf8, // sky glass
          column: 0x3f3f46,
          balcony: 0x18181b,
          roof: 0x1e293b,
        };
      case 'glass_minimal':
        return {
          wall: 0xe2e8f0,
          woodAccent: 0x0284c7,
          slab: 0xf8fafc,
          glass: 0x0ea5e9,
          column: 0x64748b,
          balcony: 0x0284c7,
          roof: 0x334155,
        };
      case 'brick_stone':
        return {
          wall: 0x9a3412, // rustic brick
          woodAccent: 0x451a03,
          slab: 0xe7e5e4,
          glass: 0x38bdf8,
          column: 0x78716c,
          balcony: 0x44403c,
          roof: 0x7f1d1d,
        };
      case 'modern':
      default:
        return {
          wall: 0xf1f5f9,
          woodAccent: 0x6366f1,
          slab: 0xcccccc,
          glass: 0x38bdf8,
          column: 0x475569,
          balcony: 0x312e81,
          roof: 0x1e293b,
        };
    }
  }, []);

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

    const colors = getStyleColors(params.facadeStyle);
    let W = safeNum(params?.facadeWidth, 14.0, 1.0);
    let D = safeNum(params?.facadeDepth, 18.0, 1.0);

    const isCustomPoly = params.footprintInputMode === 'polygonDraw' && !!params.polygonPoints && params.polygonPoints.length >= 3;
    const activePolyPts = isCustomPoly ? params.polygonPoints : null;

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

    const isXRay = interiorCutMode === 'xray';
    const isCutaway = interiorCutMode === 'cutaway';

    // Materials
    const slabMaterial = new THREE.MeshStandardMaterial({
      color: colors.slab,
      roughness: 0.8,
      metalness: 0.1,
      wireframe: isWireframe,
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
      color: colors.glass,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.85,
      thickness: 0.4,
      transparent: true,
      opacity: isXRay ? 0.25 : 0.65,
      wireframe: isWireframe,
    });

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.4,
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

    // Core Highlight Materials
    const stairCoreMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Amber
      roughness: 0.3,
      transparent: true,
      opacity: showCoreHighlight ? 0.85 : 0.4,
      wireframe: isWireframe,
    });

    const elevatorCoreMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6, // Violet
      roughness: 0.3,
      transparent: true,
      opacity: showCoreHighlight ? 0.9 : 0.5,
      wireframe: isWireframe,
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
    let cumulativeY = 0;

    for (let f = 0; f < totalFloors; f++) {
      const isBasement = f < B;
      const floorIndex = f - B;
      const isShop = !isBasement && floorIndex === 0 && hasGroundFloorShop;
      const fh = isShop ? shopHeight : H;
      floorHeights.push(fh);
      floorBaseYs.push(cumulativeY + f * (explodeRatio * 4.5));
      cumulativeY += fh;
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
      let floorCenterZ = 0;

      const isCantileverFloor = !isBasement && floorIndex >= 1 && hasCantilever;
      if (isCantileverFloor) {
        if (cantileverDirection === 'front') {
          floorD = D + cantileverDepth;
          floorCenterZ = cantileverDepth / 2;
        } else if (cantileverDirection === 'all') {
          floorW = W + 2 * cantileverDepth;
          floorD = D + 2 * cantileverDepth;
          floorCenterZ = 0;
        } else {
          // 'front_back'
          floorD = D + 2 * cantileverDepth;
          floorCenterZ = 0;
        }
      }

      // 1. FLOOR SLAB (Döşeme Betonu)
      let slabGeo: THREE.BufferGeometry;
      let slabMesh: THREE.Mesh;
      if (isCustomPoly && activePolyPts) {
        const shape = new THREE.Shape();
        const bounds = getPolygonBounds(activePolyPts);
        
        // In 2D Shape plane: X is World X, Y is World Z
        activePolyPts.forEach((p: any, idx: number) => {
          const px = p.x - bounds.centerX;
          const py = p.y - bounds.centerY;
          if (idx === 0) shape.moveTo(px, py);
          else shape.lineTo(px, py);
        });
        
        // Close the shape
        const first = activePolyPts[0];
        shape.lineTo(first.x - bounds.centerX, first.y - bounds.centerY);

        slabGeo = new THREE.ExtrudeGeometry(shape, { depth: slabThickness, bevelEnabled: false });
        slabMesh = new THREE.Mesh(slabGeo, isShopFloor ? commercialFloorMat : slabMaterial);
        
        // Extrude along local +Z. Rotate X by +90deg (Math.PI / 2):
        // Local (px, py, lz) -> World (px, Y_pos - lz, py)
        // With position.set(0, baseY + slabThickness, 0):
        // Top of slab is exactly at baseY + slabThickness, bottom at baseY
        slabMesh.rotation.x = Math.PI / 2;
        slabMesh.position.set(0, baseY + slabThickness, 0);
      } else {
        slabGeo = safeBox(floorW, slabThickness, floorD);
        slabMesh = new THREE.Mesh(slabGeo, isShopFloor ? commercialFloorMat : slabMaterial);
        slabMesh.position.set(0, baseY + slabThickness / 2, floorCenterZ);
      }
      
      slabMesh.castShadow = true;
      slabMesh.receiveShadow = true;
      floorGroup.add(slabMesh);

      // Under-slab Cantilever Soffit (Konsol Altı Kaplama) on 1st Floor
      if (hasCantilever && floorIndex === 1 && !isCustomPoly) {
        const soffitGeo = safeBox(floorW, 0.08, floorD);
        const soffitMesh = new THREE.Mesh(soffitGeo, soffitMaterial);
        soffitMesh.position.set(0, baseY - 0.04, floorCenterZ);
        floorGroup.add(soffitMesh);

        // Recessed downlights under cantilever overhang
        const dlCount = Math.max(3, Math.floor(floorW / 2.5));
        for (let d = 0; d < dlCount; d++) {
          const dlX = -floorW / 2 + (floorW / (dlCount + 1)) * (d + 1);
          const dlMesh = new THREE.Mesh(
            safeCylinder(0.12, 0.12, 0.04, 12),
            downlightMat
          );
          dlMesh.position.set(dlX, baseY - 0.07, floorD / 2 - 0.4);
          floorGroup.add(dlMesh);
        }
      }

      // Ceiling slab if top floor (Hidden in cutaway mode so inside is visible!)
      if (isTopFloor && (!isCutaway || selectedFloor !== 'all')) {
        const topSlab = new THREE.Mesh(slabGeo, slabMaterial);
        if (isCustomPoly) {
          topSlab.rotation.x = Math.PI / 2;
          topSlab.position.set(0, baseY + currentFloorH + slabThickness, 0);
        } else {
          topSlab.position.set(0, baseY + currentFloorH, floorCenterZ);
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

      if (isCustomPoly && activePolyPts) {
        const centroid = getPolygonCentroid(activePolyPts);
        const bounds = getPolygonBounds(activePolyPts);
        if (isPointInPolygon(centroid.x, centroid.y, activePolyPts)) {
          coreCenterX = centroid.x - bounds.centerX;
          coreCenterZ = centroid.y - bounds.centerY;
        }
      }

      const stairX = coreCenterX - sW / 2;
      const elevatorX = coreCenterX + sW / 2 + eW / 2;
      const coreZ = coreCenterZ;

      // Staircase shaft volume
      const stairGeo = safeBox(sW, roomHeight, sD);
      const stairMesh = new THREE.Mesh(stairGeo, stairCoreMaterial);
      stairMesh.position.set(stairX, midY, coreZ);
      stairMesh.castShadow = true;
      floorGroup.add(stairMesh);

      // Add miniature stair steps inside the staircase
      const stepCount = 8;
      const stepHeight = roomHeight / stepCount;
      const stepGeo = safeBox(sW * 0.45, stepHeight * 0.85, sD * 0.18);
      for (let s = 0; s < stepCount; s++) {
        const stepMesh = new THREE.Mesh(stepGeo, slabMaterial);
        const stepZ = coreZ - sD / 3 + (s / stepCount) * (sD * 0.7);
        stepMesh.position.set(
          s < stepCount / 2 ? stairX - sW * 0.22 : stairX + sW * 0.22,
          baseY + slabThickness + (s + 0.5) * stepHeight,
          stepZ
        );
        floorGroup.add(stepMesh);
      }

      // Elevator shaft volume
      const elevatorGeo = safeBox(eW, roomHeight, eD);
      const elevatorMesh = new THREE.Mesh(elevatorGeo, elevatorCoreMaterial);
      elevatorMesh.position.set(elevatorX, midY, coreZ);
      elevatorMesh.castShadow = true;
      floorGroup.add(elevatorMesh);

      // Elevator cabin inside
      const cabinGeo = safeBox(eW * 0.75, roomHeight * 0.7, eD * 0.75);
      const cabinMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.8,
        roughness: 0.2,
      });
      const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
      cabinMesh.position.set(elevatorX, midY, coreZ);
      floorGroup.add(cabinMesh);

      // 4. INTERIOR ROOMS & PARTITION WALLS (İç Mekan & Bölmeler)
      if (isShopFloor) {
        // COMMERCIAL SHOP INTERIOR (ZEMİN KAT TİCARİ MAĞAZA / DÜKKAN İÇİ)
        const shopFloorGeo = safeBox(floorW - 0.4, 0.02, floorD - 0.4);
        const shopFloorMesh = new THREE.Mesh(shopFloorGeo, commercialFloorMat);
        shopFloorMesh.position.set(0, baseY + slabThickness + 0.01, floorCenterZ);
        floorGroup.add(shopFloorMesh);

        // Commercial partition if shopCount > 1
        if (shopCount > 1) {
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

        // Function to create a wall segment with an optional door opening
        const createWallWithDoor = (
          length: number,
          isAlongX: boolean,
          centerX: number,
          centerZ: number,
          hasDoor: boolean = false,
          doorOffset: number = 0
        ) => {
          if (!hasDoor) {
            const wGeo = isAlongX
              ? safeBox(length, intWallH, intWallThick)
              : safeBox(intWallThick, intWallH, length);
            const wMesh = new THREE.Mesh(wGeo, interiorWallMat);
            wMesh.position.set(centerX, midY, centerZ);
            wMesh.castShadow = true;
            wMesh.receiveShadow = true;
            floorGroup.add(wMesh);
            return;
          }

          // Wall with 0.9m wide x 2.1m high doorway
          const doorW = 0.9;
          const doorH = Math.min(2.1, intWallH * 0.85);
          const leftLen = Math.max(0.2, (length - doorW) / 2 + doorOffset);
          const rightLen = Math.max(0.2, length - doorW - leftLen);

          // Left wall chunk
          if (isAlongX) {
            const leftGeo = safeBox(leftLen, intWallH, intWallThick);
            const leftM = new THREE.Mesh(leftGeo, interiorWallMat);
            leftM.position.set(centerX - length / 2 + leftLen / 2, midY, centerZ);
            floorGroup.add(leftM);

            const rightGeo = safeBox(rightLen, intWallH, intWallThick);
            const rightM = new THREE.Mesh(rightGeo, interiorWallMat);
            rightM.position.set(centerX + length / 2 - rightLen / 2, midY, centerZ);
            floorGroup.add(rightM);

            // Lintel over door
            const lintelH = intWallH - doorH;
            if (lintelH > 0.05) {
              const lintelGeo = safeBox(doorW, lintelH, intWallThick);
              const lintelM = new THREE.Mesh(lintelGeo, interiorWallMat);
              lintelM.position.set(
                centerX - length / 2 + leftLen + doorW / 2,
                baseY + slabThickness + doorH + lintelH / 2,
                centerZ
              );
              floorGroup.add(lintelM);
            }
          } else {
            const leftGeo = safeBox(intWallThick, intWallH, leftLen);
            const leftM = new THREE.Mesh(leftGeo, interiorWallMat);
            leftM.position.set(centerX, midY, centerZ - length / 2 + leftLen / 2);
            floorGroup.add(leftM);

            const rightGeo = safeBox(intWallThick, intWallH, rightLen);
            const rightM = new THREE.Mesh(rightGeo, interiorWallMat);
            rightM.position.set(centerX, midY, centerZ + length / 2 - rightLen / 2);
            floorGroup.add(rightM);

            const lintelH = intWallH - doorH;
            if (lintelH > 0.05) {
              const lintelGeo = safeBox(intWallThick, lintelH, doorW);
              const lintelM = new THREE.Mesh(lintelGeo, interiorWallMat);
              lintelM.position.set(
                centerX,
                baseY + slabThickness + doorH + lintelH / 2,
                centerZ - length / 2 + leftLen + doorW / 2
              );
              floorGroup.add(lintelM);
            }
          }
        };

        // Layout the apartments dynamically based on flatsPerFloor:
        const coreHallDistZ = sD / 2 + 1.2;

        if (flatsPerFloor === 1) {
          // ================= SINGLE FLAT (Tam Kat Lüks Rezidans) =================
          createWallWithDoor(W * 0.85, true, 0, coreHallDistZ, true, 0);
          createWallWithDoor(W * 0.85, true, 0, -coreHallDistZ, true, 0);

          const grandSalonW = W * 0.86;
          const grandSalonD = D * 0.38;
          const grandSalonFloor = new THREE.Mesh(safeBox(grandSalonW, 0.02, grandSalonD), salonFloorMat);
          grandSalonFloor.position.set(0, floorFinishY, D * 0.28);
          grandSalonFloor.receiveShadow = true;
          floorGroup.add(grandSalonFloor);

          const rearRoomD = D * 0.32;
          createWallWithDoor(W * 0.42, true, -W * 0.25, -D * 0.2, true, 0);
          createWallWithDoor(W * 0.42, true, W * 0.25, -D * 0.2, true, 0);

          const bedFloorGeo = safeBox(W * 0.4, 0.02, rearRoomD * 0.85);
          const leftBedFloor = new THREE.Mesh(bedFloorGeo, roomFloorMat);
          leftBedFloor.position.set(-W * 0.25, floorFinishY, -D * 0.3);
          leftBedFloor.receiveShadow = true;
          floorGroup.add(leftBedFloor);

          const rightBedFloor = new THREE.Mesh(bedFloorGeo, roomFloorMat);
          rightBedFloor.position.set(W * 0.25, floorFinishY, -D * 0.3);
          rightBedFloor.receiveShadow = true;
          floorGroup.add(rightBedFloor);

          const bathW = 2.2;
          const bathD = 2.2;
          createWallWithDoor(bathD, false, -sW / 2 - 0.1, -coreHallDistZ - bathD / 2, true, 0);
          createWallWithDoor(bathW, true, -sW / 2 - bathW / 2, -coreHallDistZ - bathD, false);
          createWallWithDoor(bathD, false, sW / 2 + eW + 0.1, -coreHallDistZ - bathD / 2, true, 0);
          createWallWithDoor(bathW, true, sW / 2 + eW + bathW / 2, -coreHallDistZ - bathD, false);

          const bathFloorGeo = safeBox(bathW * 0.9, 0.02, bathD * 0.9);
          const leftBathFloor = new THREE.Mesh(bathFloorGeo, bathFloorMat);
          leftBathFloor.position.set(-sW / 2 - bathW / 2, floorFinishY, -coreHallDistZ - bathD / 2);
          floorGroup.add(leftBathFloor);

          const rightBathFloor = new THREE.Mesh(bathFloorGeo, bathFloorMat);
          rightBathFloor.position.set(sW / 2 + eW + bathW / 2, floorFinishY, -coreHallDistZ - bathD / 2);
          floorGroup.add(rightBathFloor);

          if (showFurniture) {
            const sofaMain = new THREE.Mesh(safeBox(3.0, 0.55, 0.95), sofaMat);
            sofaMain.position.set(-W * 0.18, floorFinishY + 0.28, D * 0.35);
            floorGroup.add(sofaMain);

            const table = new THREE.Mesh(safeBox(1.5, 0.38, 0.8), woodFurnitureMat);
            table.position.set(-W * 0.18, floorFinishY + 0.19, D * 0.26);
            floorGroup.add(table);

            const dining = new THREE.Mesh(safeBox(2.0, 0.75, 0.95), woodFurnitureMat);
            dining.position.set(W * 0.22, floorFinishY + 0.38, D * 0.32);
            floorGroup.add(dining);

            const islandKitchen = new THREE.Mesh(safeBox(2.8, 0.88, 0.75), kitchenCounterMat);
            islandKitchen.position.set(W * 0.22, floorFinishY + 0.44, D * 0.18);
            floorGroup.add(islandKitchen);

            const bed1 = new THREE.Mesh(safeBox(1.9, 0.45, 2.1), bedMat);
            bed1.position.set(-W * 0.28, floorFinishY + 0.23, -D * 0.32);
            floorGroup.add(bed1);

            const bed2 = new THREE.Mesh(safeBox(1.9, 0.45, 2.1), bedMat);
            bed2.position.set(W * 0.28, floorFinishY + 0.23, -D * 0.32);
            floorGroup.add(bed2);
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

          if (showFurniture) {
            const sofaMainGeo = safeBox(2.2, 0.55, 0.85);
            const sofaLeft = new THREE.Mesh(sofaMainGeo, sofaMat);
            sofaLeft.position.set(-W * 0.26, floorFinishY + 0.28, D * 0.36);
            floorGroup.add(sofaLeft);

            const sofaRight = new THREE.Mesh(sofaMainGeo, sofaMat);
            sofaRight.position.set(W * 0.26, floorFinishY + 0.28, D * 0.36);
            floorGroup.add(sofaRight);

            const tableGeo = safeBox(1.2, 0.38, 0.7);
            const tableLeft = new THREE.Mesh(tableGeo, woodFurnitureMat);
            tableLeft.position.set(-W * 0.24, floorFinishY + 0.19, D * 0.26);
            floorGroup.add(tableLeft);

            const tableRight = new THREE.Mesh(tableGeo, woodFurnitureMat);
            tableRight.position.set(W * 0.24, floorFinishY + 0.19, D * 0.26);
            floorGroup.add(tableRight);

            const bedBaseGeo = safeBox(1.8, 0.45, 2.0);
            const bedLeft = new THREE.Mesh(bedBaseGeo, bedMat);
            bedLeft.position.set(-W * 0.26, floorFinishY + 0.23, -D * 0.32);
            floorGroup.add(bedLeft);

            const bedRight = new THREE.Mesh(bedBaseGeo, bedMat);
            bedRight.position.set(W * 0.26, floorFinishY + 0.23, -D * 0.32);
            floorGroup.add(bedRight);
          }
        } else if (flatsPerFloor === 3) {
          // ================= 3 FLATS (Front-Left, Front-Right, Rear-Garden) =================
          createWallWithDoor(W * 0.85, true, 0, coreHallDistZ, true, -W * 0.2);
          createWallWithDoor(W * 0.85, true, 0, -coreHallDistZ, true, W * 0.2);

          const frontDivLen = D / 2 - coreHallDistZ;
          createWallWithDoor(frontDivLen, false, 0, D / 4 + coreHallDistZ / 2, false);

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

          if (showFurniture) {
            const sL = new THREE.Mesh(safeBox(2.0, 0.5, 0.8), sofaMat);
            sL.position.set(-W * 0.24, floorFinishY + 0.25, D * 0.34);
            floorGroup.add(sL);

            const sR = new THREE.Mesh(safeBox(2.0, 0.5, 0.8), sofaMat);
            sR.position.set(W * 0.24, floorFinishY + 0.25, D * 0.34);
            floorGroup.add(sR);

            const sRear = new THREE.Mesh(safeBox(2.2, 0.5, 0.8), sofaMat);
            sRear.position.set(-W * 0.2, floorFinishY + 0.25, -D * 0.32);
            floorGroup.add(sRear);

            const bedRear = new THREE.Mesh(safeBox(1.8, 0.45, 1.9), bedMat);
            bedRear.position.set(W * 0.22, floorFinishY + 0.23, -D * 0.32);
            floorGroup.add(bedRear);
          }
        } else {
          // ================= 4 FLATS (4 Quadrants: FL, FR, RL, RR) =================
          createWallWithDoor(W * 0.85, true, 0, coreHallDistZ, true, -W * 0.2);
          createWallWithDoor(W * 0.85, true, 0, -coreHallDistZ, true, W * 0.2);

          const frontDivLen = D / 2 - coreHallDistZ;
          createWallWithDoor(frontDivLen, false, 0, D / 4 + coreHallDistZ / 2, false);
          const backDivLen = D / 2 - coreHallDistZ;
          createWallWithDoor(backDivLen, false, 0, -D / 4 - coreHallDistZ / 2, false);

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

          if (showFurniture) {
            const sofaFL = new THREE.Mesh(safeBox(1.8, 0.48, 0.75), sofaMat);
            sofaFL.position.set(-W * 0.24, floorFinishY + 0.24, D * 0.33);
            floorGroup.add(sofaFL);

            const sofaFR = new THREE.Mesh(safeBox(1.8, 0.48, 0.75), sofaMat);
            sofaFR.position.set(W * 0.24, floorFinishY + 0.24, D * 0.33);
            floorGroup.add(sofaFR);

            const bedRL = new THREE.Mesh(safeBox(1.6, 0.45, 1.8), bedMat);
            bedRL.position.set(-W * 0.24, floorFinishY + 0.23, -D * 0.32);
            floorGroup.add(bedRL);

            const bedRR = new THREE.Mesh(safeBox(1.6, 0.45, 1.8), bedMat);
            bedRR.position.set(W * 0.24, floorFinishY + 0.23, -D * 0.32);
            floorGroup.add(bedRR);
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
        const backWallThick = 0.25;
        // Back Wall
        const backWallGeo = safeBox(floorW, roomHeight, backWallThick);
        const backWallMesh = new THREE.Mesh(backWallGeo, wallMaterial);
        backWallMesh.position.set(0, midY, floorCenterZ - floorD / 2 + backWallThick / 2);
        backWallMesh.castShadow = !isXRay;
        floorGroup.add(backWallMesh);

        // Side Walls
        const sideWallGeo = safeBox(backWallThick, roomHeight, floorD);
        const leftSide = new THREE.Mesh(sideWallGeo, wallMaterial);
        leftSide.position.set(-floorW / 2 + backWallThick / 2, midY, floorCenterZ);
        floorGroup.add(leftSide);

        const rightSide = new THREE.Mesh(sideWallGeo, wallMaterial);
        rightSide.position.set(floorW / 2 - backWallThick / 2, midY, floorCenterZ);
        floorGroup.add(rightSide);

        // FRONT STOREFRONT (VİTRİN VE TABELA BANDI)
        const frontZ = floorCenterZ + floorD / 2;
        const vitrineHeight = roomHeight - 0.75;
        const fasciaHeight = 0.75;

        // 1. Sleek Commercial Signage Fascia Band (Işıklı Tabela Bandı)
        const fasciaGeo = safeBox(floorW + 0.1, fasciaHeight, 0.3);
        const fasciaMesh = new THREE.Mesh(fasciaGeo, shopSignFasciaMat);
        fasciaMesh.position.set(0, baseY + slabThickness + vitrineHeight + fasciaHeight / 2, frontZ);
        fasciaMesh.castShadow = true;
        floorGroup.add(fasciaMesh);

        // Illuminated Signage Bar
        const signBarGeo = safeBox(floorW * 0.7, 0.35, 0.08);
        const signBarMesh = new THREE.Mesh(signBarGeo, shopSignGlowMat);
        signBarMesh.position.set(0, baseY + slabThickness + vitrineHeight + fasciaHeight / 2, frontZ + 0.16);
        floorGroup.add(signBarMesh);

        // 2. Modern Steel & Glass Entrance Canopy (Giriş Saçağı / Markiz)
        const canopyDepth = 1.1;
        const canopyGeo = safeBox(floorW * 0.85, 0.1, canopyDepth);
        const canopyMesh = new THREE.Mesh(canopyGeo, frameMaterial);
        canopyMesh.position.set(0, baseY + slabThickness + vitrineHeight + 0.05, frontZ + canopyDepth / 2);
        canopyMesh.castShadow = true;
        floorGroup.add(canopyMesh);

        // 3. Full Height Storefront Glass Panels (Geniş Alüminyum Vitrin Camları)
        const glassVitrineGeo = safeBox(floorW - 0.6, vitrineHeight, 0.08);
        const glassVitrineMesh = new THREE.Mesh(glassVitrineGeo, glassMaterial);
        glassVitrineMesh.position.set(0, baseY + slabThickness + vitrineHeight / 2, frontZ - 0.05);
        floorGroup.add(glassVitrineMesh);

        // Storefront Vertical Aluminum Mullions
        const mullionCount = Math.max(4, Math.floor(floorW / 2));
        for (let m = 0; m <= mullionCount; m++) {
          const mx = -(floorW - 0.6) / 2 + ((floorW - 0.6) / mullionCount) * m;
          const mulGeo = safeBox(0.08, vitrineHeight, 0.12);
          const mulMesh = new THREE.Mesh(mulGeo, frameMaterial);
          mulMesh.position.set(mx, baseY + slabThickness + vitrineHeight / 2, frontZ - 0.05);
          floorGroup.add(mulMesh);
        }

        // Commercial Entrance Glass Doors with Stainless Handles
        const doorW = 1.8;
        const doorH = Math.min(2.4, vitrineHeight - 0.2);
        const doorFrameGeo = safeBox(doorW, doorH, 0.14);
        const doorFrameMesh = new THREE.Mesh(doorFrameGeo, frameMaterial);
        doorFrameMesh.position.set(0, baseY + slabThickness + doorH / 2, frontZ - 0.02);
        floorGroup.add(doorFrameMesh);

        const doorGlass = new THREE.Mesh(
          safeBox(doorW - 0.15, doorH - 0.15, 0.06),
          glassMaterial
        );
        doorGlass.position.copy(doorFrameMesh.position);
        floorGroup.add(doorGlass);

        // Vertical steel handles
        for (const hSide of [-0.15, 0.15]) {
          const handle = new THREE.Mesh(
            safeCylinder(0.025, 0.025, 0.9, 8),
            new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 })
          );
          handle.position.set(hSide, baseY + slabThickness + 1.1, frontZ + 0.1);
          floorGroup.add(handle);
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
          const bounds = getPolygonBounds(activePolyPts);
          const edges = getPolygonEdges(activePolyPts);

          // Calculate signed area to know clockwise vs counter-clockwise winding
          let signedArea = 0;
          for (let i = 0; i < activePolyPts.length; i++) {
            const j = (i + 1) % activePolyPts.length;
            signedArea += (activePolyPts[i].x * activePolyPts[j].y - activePolyPts[j].x * activePolyPts[i].y);
          }
          const isCW = signedArea > 0;

          wallDefs = edges.map((edge, idx) => {
            const x1 = edge.start.x - bounds.centerX;
            const z1 = edge.start.y - bounds.centerY;
            const x2 = edge.end.x - bounds.centerX;
            const z2 = edge.end.y - bounds.centerY;

            const dx = x2 - x1;
            const dz = z2 - z1;
            const length = Math.sqrt(dx * dx + dz * dz);

            // Unit outward normal
            const normalX = isCW ? dz / length : -dz / length;
            const normalZ = isCW ? -dx / length : dx / length;

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
            { name: 'Ön Cephe', length: floorW, x: 0, z: floorCenterZ + floorD / 2 - wallThick / 2, rotationY: 0, isCustom: false },
            { name: 'Sağ Cephe', length: floorD, x: floorW / 2 - wallThick / 2, z: floorCenterZ, rotationY: Math.PI / 2, isCustom: false },
            { name: 'Arka Cephe', length: floorW, x: 0, z: floorCenterZ - floorD / 2 + wallThick / 2, rotationY: Math.PI, isCustom: false },
            { name: 'Sol Cephe', length: floorD, x: -floorW / 2 + wallThick / 2, z: floorCenterZ, rotationY: -Math.PI / 2, isCustom: false },
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

            const canopyMesh = new THREE.Mesh(safeBox(doorW + 1.2, 0.14, 1.4), frameMaterial);
            canopyMesh.position.set(0, baseY + slabThickness + doorH + 0.1, 0.7);
            canopyMesh.castShadow = true;
            wallGroup.add(canopyMesh);

            const signMesh = new THREE.Mesh(safeBox(doorW * 0.8, 0.3, 0.08), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
            signMesh.position.set(0, baseY + slabThickness + doorH + 0.35, 0.12);
            wallGroup.add(signMesh);

            const doorFrameMesh = new THREE.Mesh(safeBox(doorW, doorH, 0.12), frameMaterial);
            doorFrameMesh.position.set(0, baseY + slabThickness + doorH / 2, 0);
            wallGroup.add(doorFrameMesh);

            const doorGlass = new THREE.Mesh(safeBox(doorW - 0.2, doorH - 0.2, 0.06), glassMaterial);
            doorGlass.position.copy(doorFrameMesh.position);
            wallGroup.add(doorGlass);
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
            const balcWidth = Math.min(localW * 0.4, 4.5);
            const balcOffsetZ = bD / 2 + wallThick / 2; // offset outside wall
            
            for (let b = 0; b < balcCount; b++) {
              const balcX = balcCount === 1 ? -localW * 0.22 : (b === 0 ? -localW * 0.25 : localW * 0.25);
              const balcSlab = new THREE.Mesh(safeBox(balcWidth, 0.2, bD), slabMaterial);
              balcSlab.position.set(balcX, baseY + 0.1, balcOffsetZ);
              balcSlab.castShadow = true;
              wallGroup.add(balcSlab);

              const railH = 1.05;
              const railZ = balcOffsetZ + bD / 2;
              const railMesh = new THREE.Mesh(safeBox(balcWidth, railH, 0.05), glassMaterial);
              railMesh.position.set(balcX, baseY + 0.2 + railH / 2, railZ);
              wallGroup.add(railMesh);

              const handrail = new THREE.Mesh(safeBox(balcWidth + 0.04, 0.06, 0.08), frameMaterial);
              handrail.position.set(balcX, baseY + 0.2 + railH, railZ);
              wallGroup.add(handrail);
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

        for (let flatSeq = 0; flatSeq < flatsPerFloor; flatSeq++) {
          const flatId = resFloorSeq * flatsPerFloor + flatSeq + 1;
          const isContractor = params.contractorFlatIds && params.contractorFlatIds.length > 0
            ? params.contractorFlatIds.includes(flatId)
            : flatId > (totalFlats - defaultCount);

          // Get dimensions and center offsets for this specific apartment zone
          let zoneW = floorW * 0.95;
          let zoneD = floorD * 0.95;
          let zoneX = 0;
          let zoneZ = floorCenterZ;

          if (flatsPerFloor === 2) {
            zoneW = floorW * 0.44;
            zoneX = (flatSeq === 0) ? -floorW / 4 : floorW / 4;
          } else if (flatsPerFloor === 3) {
            if (flatSeq === 0) { // Left Front
              zoneW = floorW * 0.42;
              zoneD = floorD * 0.44;
              zoneX = -floorW * 0.24;
              zoneZ = floorCenterZ + floorD / 4;
            } else if (flatSeq === 1) { // Right Front
              zoneW = floorW * 0.42;
              zoneD = floorD * 0.44;
              zoneX = floorW * 0.24;
              zoneZ = floorCenterZ + floorD / 4;
            } else { // Rear
              zoneW = floorW * 0.85;
              zoneD = floorD * 0.44;
              zoneX = 0;
              zoneZ = floorCenterZ - floorD / 4;
            }
          } else if (flatsPerFloor === 4) {
            zoneW = floorW * 0.44;
            zoneD = floorD * 0.44;
            if (flatSeq === 0) { // Front Left
              zoneX = -floorW / 4;
              zoneZ = floorCenterZ + floorD / 4;
            } else if (flatSeq === 1) { // Front Right
              zoneX = floorW / 4;
              zoneZ = floorCenterZ + floorD / 4;
            } else if (flatSeq === 2) { // Rear Left
              zoneX = -floorW / 4;
              zoneZ = floorCenterZ - floorD / 4;
            } else { // Rear Right
              zoneX = floorW / 4;
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

      buildingGroup.add(floorGroup);
    }

    // 8. ROOF TYPES: GABLE, FLAT, MANSARD, DUPLEX PENTHOUSE
    // (Only render roof if not isolated to a lower floor or cutaway)
    const shouldRenderRoof = selectedFloor === 'all' || selectedFloor === N - 1;
    if (shouldRenderRoof && !isCutaway) {
      const topFloorY = floorBaseYs[totalFloors - 1] + floorHeights[totalFloors - 1];
      const roofGroup = new THREE.Group();

      if (roofType === 'gable') {
        // 1. Classic Turkish Gable / Kırma Çatı
        const roofHeight = 2.8;
        const roofGeom = safeCone(Math.max(W, D) * 0.72, roofHeight, 4);
        roofGeom.rotateY(Math.PI / 4);
        const roofMesh = new THREE.Mesh(
          roofGeom,
          new THREE.MeshStandardMaterial({
            color: colors.roof,
            roughness: 0.5,
            metalness: 0.1,
            wireframe: isWireframe,
          })
        );
        roofMesh.position.set(0, topFloorY + roofHeight / 2, 0);
        roofMesh.scale.set(W / Math.max(W, D), 1, D / Math.max(W, D));
        roofMesh.castShadow = true;
        roofGroup.add(roofMesh);
      } else if (roofType === 'mansard') {
        // 2. MANSARD ROOF (Fransız Mansart Çatı - Dik Alt Eğimler + Güvercinlik Pencereleri)
        const mansardLowerH = 2.2;
        const mansardUpperH = 1.0;
        const setback = 1.2;

        // Mansard Lower Steep Slope Mesh (Truncated Pyramid)
        const lowerGeo = safeCylinder(
          Math.max(W - setback * 2, 4) * 0.71,
          Math.max(W, D) * 0.71,
          mansardLowerH,
          4
        );
        lowerGeo.rotateY(Math.PI / 4);
        const mansardMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b, // Dark zinc charcoal
          roughness: 0.4,
          metalness: 0.2,
          wireframe: isWireframe,
        });
        const lowerMesh = new THREE.Mesh(lowerGeo, mansardMat);
        lowerMesh.position.set(0, topFloorY + mansardLowerH / 2, 0);
        lowerMesh.scale.set(W / Math.max(W, D), 1, D / Math.max(W, D));
        lowerMesh.castShadow = true;
        roofGroup.add(lowerMesh);

        // Mansard Upper Flat/Low-Pitched Cap
        const upperCapGeo = safeBox(W - setback * 2, 0.25, D - setback * 2);
        const upperCapMesh = new THREE.Mesh(upperCapGeo, mansardMat);
        upperCapMesh.position.set(0, topFloorY + mansardLowerH + 0.12, 0);
        upperCapMesh.castShadow = true;
        roofGroup.add(upperCapMesh);

        // Dormer Windows (Mansart Çatı Pencereleri / Güvercinlik Pencereleri)
        const dormerCount = Math.max(2, Math.floor(W / 4));
        const dormerW = 1.2;
        const dormerH = 1.4;
        const dormerD = 1.1;

        for (let d = 0; d < dormerCount; d++) {
          const dx = -W / 2 + (W / (dormerCount + 1)) * (d + 1);

          // Front dormer body
          const dBodyGeo = safeBox(dormerW, dormerH, dormerD);
          const dBody = new THREE.Mesh(dBodyGeo, wallMaterial);
          dBody.position.set(dx, topFloorY + dormerH / 2 + 0.3, D / 2 - dormerD / 2 + 0.1);
          dBody.castShadow = true;
          roofGroup.add(dBody);

          // Dormer glass
          const dGlassGeo = safeBox(dormerW * 0.75, dormerH * 0.7, 0.05);
          const dGlass = new THREE.Mesh(dGlassGeo, glassMaterial);
          dGlass.position.set(dx, topFloorY + dormerH / 2 + 0.3, D / 2 + 0.12);
          roofGroup.add(dGlass);

          // Dormer mini pitched roof hood
          const dRoofGeo = safeCone(dormerW * 0.8, 0.5, 4);
          dRoofGeo.rotateY(Math.PI / 4);
          const dRoof = new THREE.Mesh(dRoofGeo, mansardMat);
          dRoof.position.set(dx, topFloorY + dormerH + 0.3 + 0.25, D / 2 - dormerD / 2 + 0.1);
          roofGroup.add(dRoof);
        }

        // Decorative cresting line on upper roof edge
        const crestGeo = safeBox(W - setback * 2 + 0.1, 0.08, D - setback * 2 + 0.1);
        const crestMesh = new THREE.Mesh(crestGeo, frameMaterial);
        crestMesh.position.set(0, topFloorY + mansardLowerH + 0.28, 0);
        roofGroup.add(crestMesh);
      } else if (roofType === 'duplex') {
        // 3. DUPLEX PENTHOUSE ROOF (Çatı Dubleksi - Teras, Pergola, Çatı Katı Dairesi)
        const duplexFloorH = 2.7;
        const terraceDepth = D * 0.45;
        const livingDepth = D - terraceDepth;

        // Duplex Enclosed Penthouse Living Suite (Back half)
        const livingGeo = safeBox(W * 0.85, duplexFloorH, livingDepth);
        const livingMesh = new THREE.Mesh(livingGeo, wallMaterial);
        livingMesh.position.set(0, topFloorY + duplexFloorH / 2, -terraceDepth / 2);
        livingMesh.castShadow = true;
        roofGroup.add(livingMesh);

        // Duplex Floor-to-ceiling panoramic sliding glass doors
        const slidingGlassGeo = safeBox(W * 0.7, duplexFloorH * 0.85, 0.06);
        const slidingGlass = new THREE.Mesh(slidingGlassGeo, glassMaterial);
        slidingGlass.position.set(0, topFloorY + duplexFloorH * 0.48, -terraceDepth / 2 + livingDepth / 2);
        roofGroup.add(slidingGlass);

        // Duplex Penthouse Sloped Roof Cap
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

        // Skylight / Çatı Güvercinlik Pencereleri on Penthouse roof
        const skyW = 1.4;
        const skyD = 1.2;
        const skyGeo = safeBox(skyW, 0.15, skyD);
        const skyMesh = new THREE.Mesh(skyGeo, glassMaterial);
        skyMesh.position.set(W * 0.22, topFloorY + duplexFloorH + 0.25, -terraceDepth / 2);
        skyMesh.rotation.x = -0.05;
        roofGroup.add(skyMesh);

        // Spacious Open-Air Roof Terrace (Front half)
        const terraceSlabGeo = safeBox(W, 0.2, terraceDepth);
        const terraceSlab = new THREE.Mesh(
          terraceSlabGeo,
          new THREE.MeshStandardMaterial({
            color: 0x94a3b8, // Light stone terrace decking
            roughness: 0.8,
          })
        );
        terraceSlab.position.set(0, topFloorY + 0.1, D / 2 - terraceDepth / 2);
        roofGroup.add(terraceSlab);

        // Terrace Glass Balustrade (Cam Küpeşte)
        const railH = 1.1;
        const terraceFrontRailGeo = safeBox(W, railH, 0.05);
        const terraceFrontRail = new THREE.Mesh(terraceFrontRailGeo, glassMaterial);
        terraceFrontRail.position.set(0, topFloorY + 0.2 + railH / 2, D / 2);
        roofGroup.add(terraceFrontRail);

        // Terrace Pergola (Ahşap Pergola / Gölgelik Kirişleri)
        const pergolaBeamCount = 7;
        const beamGeo = safeBox(0.12, 0.22, terraceDepth * 0.85);
        for (let b = 0; b < pergolaBeamCount; b++) {
          const bx = -W * 0.35 + (W * 0.7 / (pergolaBeamCount - 1)) * b;
          const beam = new THREE.Mesh(beamGeo, woodMaterial);
          beam.position.set(bx, topFloorY + 2.5, D / 2 - terraceDepth / 2);
          beam.castShadow = true;
          roofGroup.add(beam);
        }

        // Pergola support posts
        const postGeo = safeBox(0.16, 2.5, 0.16);
        const post1 = new THREE.Mesh(postGeo, woodMaterial);
        post1.position.set(-W * 0.35, topFloorY + 1.25, D / 2 - 0.2);
        roofGroup.add(post1);

        const post2 = new THREE.Mesh(postGeo, woodMaterial);
        post2.position.set(W * 0.35, topFloorY + 1.25, D / 2 - 0.2);
        roofGroup.add(post2);
      } else {
        // 4. Flat Roof with Parapet (Teras Çatı)
        const parapetHeight = 0.9;
        const parapetMat = new THREE.LineBasicMaterial({
          color: isLight ? 0x94a3b8 : 0x71717a,
          linewidth: 2,
        });

        if (isCustomPoly && activePolyPts) {
          const bounds = getPolygonBounds(activePolyPts);
          const edges = getPolygonEdges(activePolyPts);
          edges.forEach((edge) => {
            const x1 = edge.start.x - bounds.centerX;
            const z1 = edge.start.y - bounds.centerY;
            const x2 = edge.end.x - bounds.centerX;
            const z2 = edge.end.y - bounds.centerY;
            const pPoints = [
              new THREE.Vector3(x1, topFloorY, z1),
              new THREE.Vector3(x2, topFloorY, z2),
              new THREE.Vector3(x2, topFloorY + parapetHeight, z2),
              new THREE.Vector3(x1, topFloorY + parapetHeight, z1),
              new THREE.Vector3(x1, topFloorY, z1),
            ];
            const pGeom = new THREE.BufferGeometry().setFromPoints(pPoints);
            const pLine = new THREE.Line(pGeom, parapetMat);
            roofGroup.add(pLine);
          });
        } else {
          const parapetGeo = safeBox(W, parapetHeight, D);
          const parapetEdges = new THREE.EdgesGeometry(parapetGeo);
          const parapetLine = new THREE.LineSegments(parapetEdges, parapetMat);
          parapetLine.position.set(0, topFloorY + parapetHeight / 2, 0);
          roofGroup.add(parapetLine);
        }

        // Elevator Overrun / Asansör Makine Dairesi
        const overrunH = 2.2;
        const overrunGeo = safeBox(eW + 0.8, overrunH, eD + 0.8);
        const overrunMesh = new THREE.Mesh(overrunGeo, wallMaterial);
        overrunMesh.position.set(sW / 2 + eW / 2, topFloorY + overrunH / 2, 0);
        overrunMesh.castShadow = true;
        roofGroup.add(overrunMesh);
      }

      buildingGroup.add(roofGroup);
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
  }, [params, isWireframe, showCoreHighlight, selectedFloor, explodeRatio, isLight, getStyleColors]);

  // Initialize Three.js Canvas & Animation Loop
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 550;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Background color based on theme (light or gray, strictly no dark theme)
    const bgHex = isGray ? 0xe2e8f0 : 0xf8fafc;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.012);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 1000);
    cameraRef.current = camera;
    camera.position.set(28, 22, 34);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isLight ? 1.05 : 1.25;

    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Do not go under ground
    controls.minDistance = 5;
    controls.maxDistance = 250;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(
      isLight ? 0xffffff : 0xd4d4d8,
      isLight ? 0.5 : 0.4
    );
    ambientLightRef.current = ambientLight;
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(
      isLight ? 0xfffaed : 0xffffff,
      isLight ? 1.8 : 1.5
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

    // 6. Ground Grid & Shadow Plane
    const gridColor1 = isLight ? 0x94a3b8 : 0x3f3f46;
    const gridColor2 = isLight ? 0xe2e8f0 : 0x18181b;
    const grid = new THREE.GridHelper(90, 60, gridColor1, gridColor2);
    grid.position.y = -0.05;
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
    // 1. Rotate building group according to compass angle
    if (buildingGroupRef.current) {
      buildingGroupRef.current.rotation.y = (buildingRotation * Math.PI) / 180;
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
  const applyCameraPreset = useCallback((preset: 'iso' | 'front' | 'side' | 'top') => {
    if (!cameraRef.current || !controlsRef.current) return;
    setCameraPreset(preset);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const H = params.floorHeight * params.floorCount;
    const targetY = H / 2;

    controls.target.set(0, targetY, 0);

    const dist = Math.max(params.facadeWidth, params.facadeDepth, H) * 1.8;

    switch (preset) {
      case 'front':
        camera.position.set(0, targetY + 2, dist);
        break;
      case 'side':
        camera.position.set(dist, targetY + 2, 0);
        break;
      case 'top':
        camera.position.set(0, dist * 1.3, 0.1);
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

      {/* Top Left Overlay: Building Status & Active Cut Mode */}
      {!hideControls && (
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-10">
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
        </div>
      )}

      {/* Right Toolbar: Camera & Render & Export Controls */}
      {!hideControls && (
        <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto z-10">
        {/* Camera presets */}
        <div className={`flex flex-col gap-1 backdrop-blur-md p-1.5 rounded-2xl border shadow-md ${
          isGray ? 'bg-white/95 border-slate-300 text-slate-700' : 'bg-white/95 border-slate-200 text-slate-700'
        }`}>
          <button
            type="button"
            onClick={() => applyCameraPreset('iso')}
            className={`p-2 rounded-xl text-xs flex items-center justify-center transition-all ${
              cameraPreset === 'iso'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="İzometrik Görünüm"
          >
            <Compass className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => applyCameraPreset('front')}
            className={`p-2 rounded-xl text-xs flex items-center justify-center transition-all ${
              cameraPreset === 'front'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Ön Cephe Görünümü"
          >
            <span className="text-[10px] font-bold">ÖN</span>
          </button>
          <button
            type="button"
            onClick={() => applyCameraPreset('side')}
            className={`p-2 rounded-xl text-xs flex items-center justify-center transition-all ${
              cameraPreset === 'side'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Yan Cephe Görünümü"
          >
            <span className="text-[10px] font-bold">YAN</span>
          </button>
          <button
            type="button"
            onClick={() => applyCameraPreset('top')}
            className={`p-2 rounded-xl text-xs flex items-center justify-center transition-all ${
              cameraPreset === 'top'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Üstten / Kuşbakışı Görünüm"
          >
            <span className="text-[10px] font-bold">ÜST</span>
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
            onClick={() => setShowCoreHighlight(!showCoreHighlight)}
            className={`p-2 rounded-xl text-xs transition-all ${
              showCoreHighlight
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Merdiven & Asansör Şaftını Vurgula"
          >
            <Eye className="w-4 h-4" />
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
      )}

      {/* Bottom Bar: Explode Floors Slider & Floor Isolation */}
      {!hideControls && (
        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
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
    </div>
  );
};
