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

interface ThreeBuildingViewProps {
  params: BuildingModelParams;
  theme?: 'light' | 'gray' | 'dark';
}

export const ThreeBuildingView: React.FC<ThreeBuildingViewProps> = ({
  params,
  theme = 'light',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const buildingGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // View settings
  const [explodeRatio, setExplodeRatio] = useState<number>(0);
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [showCoreHighlight, setShowCoreHighlight] = useState<boolean>(true);
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'front' | 'side' | 'top'>('iso');
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
    const {
      facadeWidth: W,
      facadeDepth: D,
      floorHeight: H,
      floorCount: N,
      basementCount: B,
      stairWidth: sW,
      stairDepth: sD,
      elevatorWidth: eW,
      elevatorDepth: eD,
      balconyDepth: bD,
      roofType,
      interiorCutMode = 'solid',
      showFurniture = true,
      flatsPerFloor = 2,
    } = params;

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

    // Floor thickness
    const slabThickness = 0.25;
    const colSize = 0.45;
    const totalFloors = N + B;

    for (let f = 0; f < totalFloors; f++) {
      const isBasement = f < B;
      const floorIndex = f - B; // 0 = Ground floor, 1 = 1st floor...
      const isTopFloor = f === totalFloors - 1;
      const isVisible =
        selectedFloor === 'all' ||
        (selectedFloor === 'basement' && isBasement) ||
        selectedFloor === floorIndex;

      if (!isVisible) continue;

      const floorGroup = new THREE.Group();
      floorGroup.name = `Floor_${floorIndex}`;

      // Calculate base Y position with explosion factor
      const explodeOffset = f * (explodeRatio * 4.5);
      const baseY = f * H + explodeOffset;

      // 1. FLOOR SLAB (Döşeme Betonu)
      const slabGeo = new THREE.BoxGeometry(W, slabThickness, D);
      const slabMesh = new THREE.Mesh(slabGeo, slabMaterial);
      slabMesh.position.set(0, baseY + slabThickness / 2, 0);
      slabMesh.castShadow = true;
      slabMesh.receiveShadow = true;
      floorGroup.add(slabMesh);

      // Ceiling slab if top floor (Hidden in cutaway mode so inside is visible!)
      if (isTopFloor && (!isCutaway || selectedFloor !== 'all')) {
        const topSlab = new THREE.Mesh(slabGeo, slabMaterial);
        topSlab.position.set(0, baseY + H, 0);
        topSlab.castShadow = true;
        floorGroup.add(topSlab);
      }

      const roomHeight = H - slabThickness;
      const midY = baseY + slabThickness + roomHeight / 2;

      // 2. COLUMNS (Taşıyıcı Kolonlar)
      const colGeo = new THREE.BoxGeometry(colSize, roomHeight, colSize);
      const colXCoords = [-W / 2 + colSize / 2, 0, W / 2 - colSize / 2];
      const colZCoords = [-D / 2 + colSize / 2, 0, D / 2 - colSize / 2];

      colXCoords.forEach((cx) => {
        colZCoords.forEach((cz) => {
          const colMesh = new THREE.Mesh(colGeo, columnMaterial);
          colMesh.position.set(cx, midY, cz);
          colMesh.castShadow = true;
          floorGroup.add(colMesh);
        });
      });

      // 3. CORE: STAIRCASE & ELEVATOR SHAFT (Merdiven ve Asansör Çekirdeği)
      const coreZ = 0;
      const stairX = -sW / 2;
      const elevatorX = sW / 2 + eW / 2;

      // Staircase shaft volume
      const stairGeo = new THREE.BoxGeometry(sW, roomHeight, sD);
      const stairMesh = new THREE.Mesh(stairGeo, stairCoreMaterial);
      stairMesh.position.set(stairX, midY, coreZ);
      stairMesh.castShadow = true;
      floorGroup.add(stairMesh);

      // Add miniature stair steps inside the staircase
      const stepCount = 8;
      const stepHeight = roomHeight / stepCount;
      const stepGeo = new THREE.BoxGeometry(sW * 0.45, stepHeight * 0.85, sD * 0.18);
      for (let s = 0; s < stepCount; s++) {
        const stepMesh = new THREE.Mesh(stepGeo, slabMaterial);
        const stepZ = -sD / 3 + (s / stepCount) * (sD * 0.7);
        stepMesh.position.set(
          s < stepCount / 2 ? stairX - sW * 0.22 : stairX + sW * 0.22,
          baseY + slabThickness + (s + 0.5) * stepHeight,
          stepZ
        );
        floorGroup.add(stepMesh);
      }

      // Elevator shaft volume
      const elevatorGeo = new THREE.BoxGeometry(eW, roomHeight, eD);
      const elevatorMesh = new THREE.Mesh(elevatorGeo, elevatorCoreMaterial);
      elevatorMesh.position.set(elevatorX, midY, coreZ);
      elevatorMesh.castShadow = true;
      floorGroup.add(elevatorMesh);

      // Elevator cabin inside
      const cabinGeo = new THREE.BoxGeometry(eW * 0.75, roomHeight * 0.7, eD * 0.75);
      const cabinMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.8,
        roughness: 0.2,
      });
      const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
      cabinMesh.position.set(elevatorX, midY, coreZ);
      floorGroup.add(cabinMesh);

      // 4. INTERIOR ROOMS & PARTITION WALLS (İç Mekan & Bölmeler)
      if (!isBasement) {
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
              ? new THREE.BoxGeometry(length, intWallH, intWallThick)
              : new THREE.BoxGeometry(intWallThick, intWallH, length);
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
            const leftGeo = new THREE.BoxGeometry(leftLen, intWallH, intWallThick);
            const leftM = new THREE.Mesh(leftGeo, interiorWallMat);
            leftM.position.set(centerX - length / 2 + leftLen / 2, midY, centerZ);
            floorGroup.add(leftM);

            const rightGeo = new THREE.BoxGeometry(rightLen, intWallH, intWallThick);
            const rightM = new THREE.Mesh(rightGeo, interiorWallMat);
            rightM.position.set(centerX + length / 2 - rightLen / 2, midY, centerZ);
            floorGroup.add(rightM);

            // Lintel over door
            const lintelH = intWallH - doorH;
            if (lintelH > 0.05) {
              const lintelGeo = new THREE.BoxGeometry(doorW, lintelH, intWallThick);
              const lintelM = new THREE.Mesh(lintelGeo, interiorWallMat);
              lintelM.position.set(
                centerX - length / 2 + leftLen + doorW / 2,
                baseY + slabThickness + doorH + lintelH / 2,
                centerZ
              );
              floorGroup.add(lintelM);
            }
          } else {
            const leftGeo = new THREE.BoxGeometry(intWallThick, intWallH, leftLen);
            const leftM = new THREE.Mesh(leftGeo, interiorWallMat);
            leftM.position.set(centerX, midY, centerZ - length / 2 + leftLen / 2);
            floorGroup.add(leftM);

            const rightGeo = new THREE.BoxGeometry(intWallThick, intWallH, rightLen);
            const rightM = new THREE.Mesh(rightGeo, interiorWallMat);
            rightM.position.set(centerX, midY, centerZ + length / 2 - rightLen / 2);
            floorGroup.add(rightM);

            const lintelH = intWallH - doorH;
            if (lintelH > 0.05) {
              const lintelGeo = new THREE.BoxGeometry(intWallThick, lintelH, doorW);
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
          const grandSalonFloor = new THREE.Mesh(new THREE.BoxGeometry(grandSalonW, 0.02, grandSalonD), salonFloorMat);
          grandSalonFloor.position.set(0, floorFinishY, D * 0.28);
          grandSalonFloor.receiveShadow = true;
          floorGroup.add(grandSalonFloor);

          const rearRoomD = D * 0.32;
          createWallWithDoor(W * 0.42, true, -W * 0.25, -D * 0.2, true, 0);
          createWallWithDoor(W * 0.42, true, W * 0.25, -D * 0.2, true, 0);

          const bedFloorGeo = new THREE.BoxGeometry(W * 0.4, 0.02, rearRoomD * 0.85);
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

          const bathFloorGeo = new THREE.BoxGeometry(bathW * 0.9, 0.02, bathD * 0.9);
          const leftBathFloor = new THREE.Mesh(bathFloorGeo, bathFloorMat);
          leftBathFloor.position.set(-sW / 2 - bathW / 2, floorFinishY, -coreHallDistZ - bathD / 2);
          floorGroup.add(leftBathFloor);

          const rightBathFloor = new THREE.Mesh(bathFloorGeo, bathFloorMat);
          rightBathFloor.position.set(sW / 2 + eW + bathW / 2, floorFinishY, -coreHallDistZ - bathD / 2);
          floorGroup.add(rightBathFloor);

          if (showFurniture) {
            const sofaMain = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.55, 0.95), sofaMat);
            sofaMain.position.set(-W * 0.18, floorFinishY + 0.28, D * 0.35);
            floorGroup.add(sofaMain);

            const table = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.38, 0.8), woodFurnitureMat);
            table.position.set(-W * 0.18, floorFinishY + 0.19, D * 0.26);
            floorGroup.add(table);

            const dining = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 0.95), woodFurnitureMat);
            dining.position.set(W * 0.22, floorFinishY + 0.38, D * 0.32);
            floorGroup.add(dining);

            const islandKitchen = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.88, 0.75), kitchenCounterMat);
            islandKitchen.position.set(W * 0.22, floorFinishY + 0.44, D * 0.18);
            floorGroup.add(islandKitchen);

            const bed1 = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 2.1), bedMat);
            bed1.position.set(-W * 0.28, floorFinishY + 0.23, -D * 0.32);
            floorGroup.add(bed1);

            const bed2 = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 2.1), bedMat);
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

          const salonFloorGeo = new THREE.BoxGeometry(leftSalonWidth * 0.9, 0.02, salonDepth * 0.85);
          const leftSalonFloor = new THREE.Mesh(salonFloorGeo, salonFloorMat);
          leftSalonFloor.position.set(-W * 0.24, floorFinishY, D * 0.28);
          leftSalonFloor.receiveShadow = true;
          floorGroup.add(leftSalonFloor);

          const rightSalonFloor = new THREE.Mesh(salonFloorGeo, salonFloorMat);
          rightSalonFloor.position.set(W * 0.24, floorFinishY, D * 0.28);
          rightSalonFloor.receiveShadow = true;
          floorGroup.add(rightSalonFloor);

          const bedFloorGeo = new THREE.BoxGeometry(W * 0.38, 0.02, rearRoomDepth * 0.8);
          const leftBedFloor = new THREE.Mesh(bedFloorGeo, roomFloorMat);
          leftBedFloor.position.set(-W * 0.25, floorFinishY, -D * 0.3);
          leftBedFloor.receiveShadow = true;
          floorGroup.add(leftBedFloor);

          const rightBedFloor = new THREE.Mesh(bedFloorGeo, roomFloorMat);
          rightBedFloor.position.set(W * 0.25, floorFinishY, -D * 0.3);
          rightBedFloor.receiveShadow = true;
          floorGroup.add(rightBedFloor);

          if (showFurniture) {
            const sofaMainGeo = new THREE.BoxGeometry(2.2, 0.55, 0.85);
            const sofaLeft = new THREE.Mesh(sofaMainGeo, sofaMat);
            sofaLeft.position.set(-W * 0.26, floorFinishY + 0.28, D * 0.36);
            floorGroup.add(sofaLeft);

            const sofaRight = new THREE.Mesh(sofaMainGeo, sofaMat);
            sofaRight.position.set(W * 0.26, floorFinishY + 0.28, D * 0.36);
            floorGroup.add(sofaRight);

            const tableGeo = new THREE.BoxGeometry(1.2, 0.38, 0.7);
            const tableLeft = new THREE.Mesh(tableGeo, woodFurnitureMat);
            tableLeft.position.set(-W * 0.24, floorFinishY + 0.19, D * 0.26);
            floorGroup.add(tableLeft);

            const tableRight = new THREE.Mesh(tableGeo, woodFurnitureMat);
            tableRight.position.set(W * 0.24, floorFinishY + 0.19, D * 0.26);
            floorGroup.add(tableRight);

            const bedBaseGeo = new THREE.BoxGeometry(1.8, 0.45, 2.0);
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
          const rearFloor = new THREE.Mesh(new THREE.BoxGeometry(rearSalonW, 0.02, rearSalonD), salonFloorMat);
          rearFloor.position.set(0, floorFinishY, -D * 0.3);
          floorGroup.add(rearFloor);

          const fW = W * 0.42;
          const fD = D * 0.35;
          const fFloorL = new THREE.Mesh(new THREE.BoxGeometry(fW, 0.02, fD), salonFloorMat);
          fFloorL.position.set(-W * 0.24, floorFinishY, D * 0.3);
          floorGroup.add(fFloorL);

          const fFloorR = new THREE.Mesh(new THREE.BoxGeometry(fW, 0.02, fD), salonFloorMat);
          fFloorR.position.set(W * 0.24, floorFinishY, D * 0.3);
          floorGroup.add(fFloorR);

          if (showFurniture) {
            const sL = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.8), sofaMat);
            sL.position.set(-W * 0.24, floorFinishY + 0.25, D * 0.34);
            floorGroup.add(sL);

            const sR = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.8), sofaMat);
            sR.position.set(W * 0.24, floorFinishY + 0.25, D * 0.34);
            floorGroup.add(sR);

            const sRear = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.8), sofaMat);
            sRear.position.set(-W * 0.2, floorFinishY + 0.25, -D * 0.32);
            floorGroup.add(sRear);

            const bedRear = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 1.9), bedMat);
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

          const qFL = new THREE.Mesh(new THREE.BoxGeometry(qW, 0.02, qD), salonFloorMat);
          qFL.position.set(-W * 0.24, floorFinishY, D * 0.3);
          floorGroup.add(qFL);

          const qFR = new THREE.Mesh(new THREE.BoxGeometry(qW, 0.02, qD), salonFloorMat);
          qFR.position.set(W * 0.24, floorFinishY, D * 0.3);
          floorGroup.add(qFR);

          const qRL = new THREE.Mesh(new THREE.BoxGeometry(qW, 0.02, qD), roomFloorMat);
          qRL.position.set(-W * 0.24, floorFinishY, -D * 0.3);
          floorGroup.add(qRL);

          const qRR = new THREE.Mesh(new THREE.BoxGeometry(qW, 0.02, qD), roomFloorMat);
          qRR.position.set(W * 0.24, floorFinishY, -D * 0.3);
          floorGroup.add(qRR);

          if (showFurniture) {
            const sofaFL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.48, 0.75), sofaMat);
            sofaFL.position.set(-W * 0.24, floorFinishY + 0.24, D * 0.33);
            floorGroup.add(sofaFL);

            const sofaFR = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.48, 0.75), sofaMat);
            sofaFR.position.set(W * 0.24, floorFinishY + 0.24, D * 0.33);
            floorGroup.add(sofaFR);

            const bedRL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.8), bedMat);
            bedRL.position.set(-W * 0.24, floorFinishY + 0.23, -D * 0.32);
            floorGroup.add(bedRL);

            const bedRR = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.8), bedMat);
            bedRR.position.set(W * 0.24, floorFinishY + 0.23, -D * 0.32);
            floorGroup.add(bedRR);
          }
        }

        // If this is the Top Floor and Roof Type is DUPLEX, add internal duplex staircase
        if (isTopFloor && roofType === 'duplex') {
          const dStepCount = 10;
          const dStepH = roomHeight / dStepCount;
          const dStepGeo = new THREE.BoxGeometry(1.1, dStepH * 0.85, 0.3);
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
      if (!isBasement) {
        const wallThick = 0.22;
        const winWidth = 1.8;
        const winHeight = 1.6;
        const winSill = 0.85;

        // Front Wall (Z = D/2)
        const frontWallZ = D / 2 - wallThick / 2;
        const currentMat = f % 2 === 0 ? woodMaterial : wallMaterial;

        // Front piers / wall panels
        const panelWidth = (W - 3 * winWidth) / 4;
        for (let p = 0; p < 4; p++) {
          const pGeo = new THREE.BoxGeometry(panelWidth, roomHeight, wallThick);
          const pMesh = new THREE.Mesh(pGeo, currentMat);
          const px = -W / 2 + panelWidth / 2 + p * (panelWidth + winWidth);
          pMesh.position.set(px, midY, frontWallZ);
          pMesh.castShadow = !isXRay;
          pMesh.receiveShadow = true;
          floorGroup.add(pMesh);

          // Place Window next to pier
          if (p < 3) {
            const wx = px + panelWidth / 2 + winWidth / 2;
            // Sill wall under window
            const sillGeo = new THREE.BoxGeometry(winWidth, winSill, wallThick);
            const sillMesh = new THREE.Mesh(sillGeo, wallMaterial);
            sillMesh.position.set(wx, baseY + slabThickness + winSill / 2, frontWallZ);
            floorGroup.add(sillMesh);

            // Lintel above window
            const lintelH = roomHeight - (winSill + winHeight);
            if (lintelH > 0.05) {
              const lintelGeo = new THREE.BoxGeometry(winWidth, lintelH, wallThick);
              const lintelMesh = new THREE.Mesh(lintelGeo, wallMaterial);
              lintelMesh.position.set(
                wx,
                baseY + slabThickness + winSill + winHeight + lintelH / 2,
                frontWallZ
              );
              floorGroup.add(lintelMesh);
            }

            // Glass pane
            const glassGeo = new THREE.BoxGeometry(winWidth, winHeight, 0.06);
            const glassMesh = new THREE.Mesh(glassGeo, glassMaterial);
            glassMesh.position.set(wx, baseY + slabThickness + winSill + winHeight / 2, frontWallZ);
            floorGroup.add(glassMesh);

            // Window frame
            const frameGeo = new THREE.BoxGeometry(winWidth + 0.05, winHeight + 0.05, 0.08);
            const frameEdges = new THREE.EdgesGeometry(frameGeo);
            const line = new THREE.LineSegments(
              frameEdges,
              new THREE.LineBasicMaterial({
                color: isLight ? 0x64748b : 0x27272a,
              })
            );
            line.position.copy(glassMesh.position);
            floorGroup.add(line);
          }
        }

        // Back Wall (Z = -D/2)
        const backWallZ = -D / 2 + wallThick / 2;
        const backWallGeo = new THREE.BoxGeometry(W, roomHeight, wallThick);
        const backWallMesh = new THREE.Mesh(backWallGeo, wallMaterial);
        backWallMesh.position.set(0, midY, backWallZ);
        backWallMesh.castShadow = !isXRay;
        floorGroup.add(backWallMesh);

        // Side Walls (Left X = -W/2, Right X = W/2)
        const sideWallGeo = new THREE.BoxGeometry(wallThick, roomHeight, D);
        const leftSide = new THREE.Mesh(sideWallGeo, wallMaterial);
        leftSide.position.set(-W / 2 + wallThick / 2, midY, 0);
        leftSide.castShadow = !isXRay;
        floorGroup.add(leftSide);

        const rightSide = new THREE.Mesh(sideWallGeo, wallMaterial);
        rightSide.position.set(W / 2 - wallThick / 2, midY, 0);
        rightSide.castShadow = !isXRay;
        floorGroup.add(rightSide);

        // 7. BALCONY (Balkon Çıkması) on normal floors
        if (bD > 0.3 && floorIndex > 0) {
          const balcWidth = W * 0.38;
          const balcSlabGeo = new THREE.BoxGeometry(balcWidth, 0.2, bD);
          const balcSlab = new THREE.Mesh(balcSlabGeo, slabMaterial);
          balcSlab.position.set(-W / 4, baseY + 0.1, D / 2 + bD / 2);
          balcSlab.castShadow = true;
          floorGroup.add(balcSlab);

          // Balcony railing (Korkuluk)
          const railHeight = 1.05;
          const glassRailGeo = new THREE.BoxGeometry(balcWidth, railHeight, 0.05);
          const glassRail = new THREE.Mesh(glassRailGeo, glassMaterial);
          glassRail.position.set(-W / 4, baseY + 0.2 + railHeight / 2, D / 2 + bD);
          floorGroup.add(glassRail);

          // Top railing handrail
          const handrailGeo = new THREE.BoxGeometry(balcWidth + 0.04, 0.06, 0.08);
          const handrail = new THREE.Mesh(handrailGeo, frameMaterial);
          handrail.position.set(-W / 4, baseY + 0.2 + railHeight, D / 2 + bD);
          floorGroup.add(handrail);
        }
      } else {
        // Basement Retaining Wall (Perde Beton)
        const bsWallGeo = new THREE.BoxGeometry(W, roomHeight, D);
        const bsMat = new THREE.MeshStandardMaterial({
          color: 0x52525b,
          roughness: 0.9,
        });
        const bsMesh = new THREE.Mesh(bsWallGeo, bsMat);
        bsMesh.position.set(0, midY, 0);
        floorGroup.add(bsMesh);
      }

      buildingGroup.add(floorGroup);
    }

    // 8. ROOF TYPES: GABLE, FLAT, MANSARD, DUPLEX PENTHOUSE
    // (Only render roof if not isolated to a lower floor or cutaway)
    const shouldRenderRoof = selectedFloor === 'all' || selectedFloor === N - 1;
    if (shouldRenderRoof && !isCutaway) {
      const topFloorY = totalFloors * H + totalFloors * (explodeRatio * 4.5);
      const roofGroup = new THREE.Group();

      if (roofType === 'gable') {
        // 1. Classic Turkish Gable / Kırma Çatı
        const roofHeight = 2.8;
        const roofGeom = new THREE.ConeGeometry(Math.max(W, D) * 0.72, roofHeight, 4);
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
        const lowerGeo = new THREE.CylinderGeometry(
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
        const upperCapGeo = new THREE.BoxGeometry(W - setback * 2, 0.25, D - setback * 2);
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
          const dBodyGeo = new THREE.BoxGeometry(dormerW, dormerH, dormerD);
          const dBody = new THREE.Mesh(dBodyGeo, wallMaterial);
          dBody.position.set(dx, topFloorY + dormerH / 2 + 0.3, D / 2 - dormerD / 2 + 0.1);
          dBody.castShadow = true;
          roofGroup.add(dBody);

          // Dormer glass
          const dGlassGeo = new THREE.BoxGeometry(dormerW * 0.75, dormerH * 0.7, 0.05);
          const dGlass = new THREE.Mesh(dGlassGeo, glassMaterial);
          dGlass.position.set(dx, topFloorY + dormerH / 2 + 0.3, D / 2 + 0.12);
          roofGroup.add(dGlass);

          // Dormer mini pitched roof hood
          const dRoofGeo = new THREE.ConeGeometry(dormerW * 0.8, 0.5, 4);
          dRoofGeo.rotateY(Math.PI / 4);
          const dRoof = new THREE.Mesh(dRoofGeo, mansardMat);
          dRoof.position.set(dx, topFloorY + dormerH + 0.3 + 0.25, D / 2 - dormerD / 2 + 0.1);
          roofGroup.add(dRoof);
        }

        // Decorative cresting line on upper roof edge
        const crestGeo = new THREE.BoxGeometry(W - setback * 2 + 0.1, 0.08, D - setback * 2 + 0.1);
        const crestMesh = new THREE.Mesh(crestGeo, frameMaterial);
        crestMesh.position.set(0, topFloorY + mansardLowerH + 0.28, 0);
        roofGroup.add(crestMesh);
      } else if (roofType === 'duplex') {
        // 3. DUPLEX PENTHOUSE ROOF (Çatı Dubleksi - Teras, Pergola, Çatı Katı Dairesi)
        const duplexFloorH = 2.7;
        const terraceDepth = D * 0.45;
        const livingDepth = D - terraceDepth;

        // Duplex Enclosed Penthouse Living Suite (Back half)
        const livingGeo = new THREE.BoxGeometry(W * 0.85, duplexFloorH, livingDepth);
        const livingMesh = new THREE.Mesh(livingGeo, wallMaterial);
        livingMesh.position.set(0, topFloorY + duplexFloorH / 2, -terraceDepth / 2);
        livingMesh.castShadow = true;
        roofGroup.add(livingMesh);

        // Duplex Floor-to-ceiling panoramic sliding glass doors
        const slidingGlassGeo = new THREE.BoxGeometry(W * 0.7, duplexFloorH * 0.85, 0.06);
        const slidingGlass = new THREE.Mesh(slidingGlassGeo, glassMaterial);
        slidingGlass.position.set(0, topFloorY + duplexFloorH * 0.48, -terraceDepth / 2 + livingDepth / 2);
        roofGroup.add(slidingGlass);

        // Duplex Penthouse Sloped Roof Cap
        const pRoofGeo = new THREE.BoxGeometry(W * 0.9, 0.2, livingDepth + 0.4);
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
        const skyGeo = new THREE.BoxGeometry(skyW, 0.15, skyD);
        const skyMesh = new THREE.Mesh(skyGeo, glassMaterial);
        skyMesh.position.set(W * 0.22, topFloorY + duplexFloorH + 0.25, -terraceDepth / 2);
        skyMesh.rotation.x = -0.05;
        roofGroup.add(skyMesh);

        // Spacious Open-Air Roof Terrace (Front half)
        const terraceSlabGeo = new THREE.BoxGeometry(W, 0.2, terraceDepth);
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
        const terraceFrontRailGeo = new THREE.BoxGeometry(W, railH, 0.05);
        const terraceFrontRail = new THREE.Mesh(terraceFrontRailGeo, glassMaterial);
        terraceFrontRail.position.set(0, topFloorY + 0.2 + railH / 2, D / 2);
        roofGroup.add(terraceFrontRail);

        // Terrace Pergola (Ahşap Pergola / Gölgelik Kirişleri)
        const pergolaBeamCount = 7;
        const beamGeo = new THREE.BoxGeometry(0.12, 0.22, terraceDepth * 0.85);
        for (let b = 0; b < pergolaBeamCount; b++) {
          const bx = -W * 0.35 + (W * 0.7 / (pergolaBeamCount - 1)) * b;
          const beam = new THREE.Mesh(beamGeo, woodMaterial);
          beam.position.set(bx, topFloorY + 2.5, D / 2 - terraceDepth / 2);
          beam.castShadow = true;
          roofGroup.add(beam);
        }

        // Pergola support posts
        const postGeo = new THREE.BoxGeometry(0.16, 2.5, 0.16);
        const post1 = new THREE.Mesh(postGeo, woodMaterial);
        post1.position.set(-W * 0.35, topFloorY + 1.25, D / 2 - 0.2);
        roofGroup.add(post1);

        const post2 = new THREE.Mesh(postGeo, woodMaterial);
        post2.position.set(W * 0.35, topFloorY + 1.25, D / 2 - 0.2);
        roofGroup.add(post2);
      } else {
        // 4. Flat Roof with Parapet (Teras Çatı)
        const parapetHeight = 0.9;
        const parapetGeo = new THREE.BoxGeometry(W, parapetHeight, D);
        const parapetEdges = new THREE.EdgesGeometry(parapetGeo);
        const parapetLine = new THREE.LineSegments(
          parapetEdges,
          new THREE.LineBasicMaterial({
            color: isLight ? 0x94a3b8 : 0x71717a,
            linewidth: 2,
          })
        );
        parapetLine.position.set(0, topFloorY + parapetHeight / 2, 0);
        roofGroup.add(parapetLine);

        // Elevator Overrun / Asansör Makine Dairesi
        const overrunH = 2.2;
        const overrunGeo = new THREE.BoxGeometry(eW + 0.8, overrunH, eD + 0.8);
        const overrunMesh = new THREE.Mesh(overrunGeo, wallMaterial);
        overrunMesh.position.set(sW / 2 + eW / 2, topFloorY + overrunH / 2, 0);
        overrunMesh.castShadow = true;
        roofGroup.add(overrunMesh);
      }

      buildingGroup.add(roofGroup);
    }

    // Center building at origin
    buildingGroup.position.set(0, 0, 0);
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
      isLight ? 0.95 : 0.65
    );
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(
      isLight ? 0xfffaed : 0xffffff,
      isLight ? 1.4 : 1.3
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
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
    fillLight.position.set(-30, 20, -30);
    scene.add(fillLight);

    // 6. Ground Grid & Shadow Plane
    const gridColor1 = isLight ? 0x94a3b8 : 0x3f3f46;
    const gridColor2 = isLight ? 0xe2e8f0 : 0x18181b;
    const grid = new THREE.GridHelper(90, 60, gridColor1, gridColor2);
    grid.position.y = -0.05;
    scene.add(grid);

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

  // Camera presets
  const applyCameraPreset = (preset: 'iso' | 'front' | 'side' | 'top') => {
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
  };

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
      {exportFeedback && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="px-4 py-2 rounded-2xl text-xs font-semibold shadow-xl border flex items-center gap-2 animate-fade-in bg-white text-indigo-700 border-indigo-200">
            <Sparkles className="w-4 h-4 text-indigo-500 animate-spin" />
            <span>{exportFeedback}</span>
          </div>
        </div>
      )}

      {/* Top Left Overlay: Building Status & Active Cut Mode */}
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

      {/* Right Toolbar: Camera & Render & Export Controls */}
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

      {/* Bottom Bar: Explode Floors Slider & Floor Isolation */}
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
                  ? 'Zemin Kat'
                  : i === params.floorCount - 1 && params.roofType === 'duplex'
                  ? `${i}. Kat (Dubleks Alt Kat)`
                  : `${i}. Normal Kat`}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
