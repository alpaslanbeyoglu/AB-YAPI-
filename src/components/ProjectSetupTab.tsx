import React, { useState, useMemo } from 'react';
import {
  ProjectParams,
  ExistingBuilding,
  ShopLocation,
  AppTheme,
  PolygonPoint,
  FacadeDetailConfig,
  RoadConfig,
  FootprintInputMode,
  CustomFacadeSide,
  RoomType,
} from '../types';
import {
  Building2,
  Building,
  Home,
  Store,
  Compass,
  Ruler,
  Plus,
  Trash2,
  Edit2,
  Check,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  Users,
  Percent,
  Scale,
  Sliders,
  Info,
  Sparkles,
  MapPin,
  Maximize2,
  ArrowDownUp,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  X,
  ShieldAlert,
} from 'lucide-react';
import { InteractiveFootprintCanvas } from './InteractiveFootprintCanvas';
import { MunicipalIncentivesPanel } from './MunicipalIncentivesPanel';
import { calculateCantileverDetails } from '../utils/calculatorEngine';
import {
  POLYGON_PRESETS,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  getPolygonBounds,
  generateFacadeConfigs,
  syncPolygonToCustomFacades,
  calculateFootprint,
  DEFAULT_CUSTOM_FACADES_4,
  DEFAULT_CUSTOM_FACADES_5,
  DEFAULT_CUSTOM_FACADES_6,
  DEFAULT_CUSTOM_FACADES_8,
} from '../utils/footprintUtils';

interface ProjectSetupTabProps {
  params: ProjectParams;
  onChangeParams: (newParams: ProjectParams) => void;
  theme?: AppTheme;
  onNext: () => void;
  onNavigateToModel?: () => void;
  onNavigateToOwners?: () => void;
}

export const ProjectSetupTab: React.FC<ProjectSetupTabProps> = ({
  params,
  onChangeParams,
  theme = 'light',
  onNext,
  onNavigateToModel,
  onNavigateToOwners,
}) => {
  const isGray = theme === 'gray';
  const textTitle = isGray ? 'text-gray-100' : 'text-slate-900';
  const textMuted = isGray ? 'text-gray-400' : 'text-slate-500';
  const bgCard = isGray ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/90 shadow-xs';
  const innerCardBg = isGray ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50/80 border-slate-200/80';
  const inputBg = isGray
    ? 'bg-slate-900 text-gray-100 border-slate-700 focus:border-indigo-500'
    : 'bg-white text-slate-900 border-slate-200 focus:border-indigo-500';

  // State for new existing building creation
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [bldgName, setBldgName] = useState<string>('A Blok (Eski Yapı)');
  const [bldgFloors, setBldgFloors] = useState<number>(4);
  const [bldgFlats, setBldgFlats] = useState<number>(8);
  const [bldgAvgFlatArea, setBldgAvgFlatArea] = useState<number>(85);
  const [bldgHasShop, setBldgHasShop] = useState<boolean>(false);
  const [bldgShopCount, setBldgShopCount] = useState<number>(1);
  const [bldgShopLocation, setBldgShopLocation] = useState<ShopLocation>('ground');
  const [bldgAvgShopArea, setBldgAvgShopArea] = useState<number>(60);
  const [bldgBaseArea, setBldgBaseArea] = useState<number>(140);
  const [bldgLandShareNum, setBldgLandShareNum] = useState<number>(50);
  const [bldgLandShareDenom, setBldgLandShareDenom] = useState<number>(100);
  const [bldgNote, setBldgNote] = useState<string>('');

  // Interactive Scenario Flow States
  const [wizardMode, setWizardMode] = useState<boolean>(true);
  const [activeStep, setActiveStep] = useState<number>(2);
  const [activeScenario, setActiveScenario] = useState<number | null>(null);
  const [showExistingForm, setShowExistingForm] = useState<boolean>(false);
  const [showManualDataSection, setShowManualDataSection] = useState<boolean>(true);

  const handleLoadScenario = (scenarioId: number) => {
    let scenarioParams: Partial<ProjectParams> = {};
    if (scenarioId === 1) {
      // Standart Apartman (Tek Yapı)
      scenarioParams = {
        projectAddress: 'İstanbul, Kadıköy, 124 Ada 5 Parsel (Huzur Apartmanı)',
        baseBuildArea: 140,
        floorCount: 5,
        flatsPerFloor: 2,
        flatCount: 10,
        basementCount: 1,
        hasGroundFloorShop: false,
        shopCount: 0,
        shopArea: 0,
        roofType: 'gable',
        existingBuildings: [
          {
            id: 'bldg-std',
            name: 'Mevcut Huzur Apartmanı',
            floorCount: 4,
            flatCount: 8,
            avgFlatArea: 80,
            hasShop: false,
            shopCount: 0,
            shopLocation: 'ground',
            avgShopArea: 0,
            baseArea: 120,
            totalExistingArea: 480,
            landShareNumerator: 1,
            landShareDenominator: 1,
            note: 'Ekonomik ömrünü tamamlamış 4 katlı betonarme bina'
          }
        ],
        polygonPoints: POLYGON_PRESETS.rectangle.points,
        footprintInputMode: 'polygonDraw',
        mainEntranceFacadeIndex: 0,
        contractorShareRate: 40,
      };
    } else if (scenarioId === 2) {
      // Tevhitli Ada (3 Blok + Ticari)
      scenarioParams = {
        projectAddress: 'İstanbul, Beşiktaş, Kentsel Sit Alanı (Yıldız Sitesi Tevhit Projesi)',
        baseBuildArea: 480,
        floorCount: 8,
        flatsPerFloor: 4,
        flatCount: 32,
        basementCount: 2,
        hasGroundFloorShop: true,
        shopCount: 6,
        shopArea: 90,
        shopHeight: 4.0,
        shopLocation: 'ground',
        roofType: 'mansard',
        existingBuildings: [
          {
            id: 'bldg-yildiz-a',
            name: 'Yıldız Sitesi A Blok',
            floorCount: 5,
            flatCount: 10,
            avgFlatArea: 90,
            hasShop: true,
            shopCount: 2,
            shopLocation: 'ground',
            avgShopArea: 75,
            baseArea: 180,
            totalExistingArea: 1050,
            landShareNumerator: 1,
            landShareDenominator: 3,
            note: '1985 yapımı, yıpranmış bina'
          },
          {
            id: 'bldg-yildiz-b',
            name: 'Yıldız Sitesi B Blok',
            floorCount: 5,
            flatCount: 10,
            avgFlatArea: 90,
            hasShop: true,
            shopCount: 2,
            shopLocation: 'ground',
            avgShopArea: 75,
            baseArea: 180,
            totalExistingArea: 1050,
            landShareNumerator: 1,
            landShareDenominator: 3,
            note: 'Riskli yapı raporu alınmış bina'
          },
          {
            id: 'bldg-yildiz-c',
            name: 'Müstakil Depolu İşyeri',
            floorCount: 1,
            flatCount: 0,
            avgFlatArea: 0,
            hasShop: true,
            shopCount: 1,
            shopLocation: 'both',
            avgShopArea: 150,
            baseArea: 150,
            totalExistingArea: 300,
            landShareNumerator: 1,
            landShareDenominator: 3,
            note: 'Tevhit edilecek yan dükkan parseli'
          }
        ],
        polygonPoints: POLYGON_PRESETS.lShape.points,
        footprintInputMode: 'polygonDraw',
        mainEntranceFacadeIndex: 0,
        contractorShareRate: 50,
      };
    } else {
      // Çarpık İmar / Dar Parsel (Sıkışık Bölge)
      scenarioParams = {
        projectAddress: 'İstanbul, Fatih, Tarihi Yarımada (Kadırga Konakları Sokağı)',
        baseBuildArea: 125,
        floorCount: 4,
        flatsPerFloor: 2,
        flatCount: 8,
        basementCount: 1,
        hasGroundFloorShop: true,
        shopCount: 1,
        shopArea: 70,
        shopHeight: 3.5,
        shopLocation: 'ground',
        roofType: 'duplex',
        existingBuildings: [
          {
            id: 'bldg-fatih-1',
            name: 'Eski Kadırga İşhanı',
            floorCount: 3,
            flatCount: 4,
            avgFlatArea: 65,
            hasShop: true,
            shopCount: 1,
            shopLocation: 'ground',
            avgShopArea: 55,
            baseArea: 100,
            totalExistingArea: 355,
            landShareNumerator: 100,
            landShareDenominator: 100,
            note: 'Dar sokakta bitişik nizam eski yığma bina'
          }
        ],
        polygonPoints: POLYGON_PRESETS.trapezoid.points,
        footprintInputMode: 'polygonDraw',
        mainEntranceFacadeIndex: 0,
        contractorShareRate: 45,
      };
    }

    onChangeParams({
      ...params,
      ...scenarioParams,
      existingBuildings: [],
    } as ProjectParams);
    setActiveScenario(scenarioId);
  };

  // Default existing buildings from params
  const existingBuildings: ExistingBuilding[] = useMemo(() => {
    return params.existingBuildings || [];
  }, [params.existingBuildings]);

  // Totals for existing buildings
  const totalExistingFlats = useMemo(
    () => existingBuildings.reduce((sum, b) => sum + (b.flatCount || 0), 0),
    [existingBuildings]
  );
  const totalExistingShops = useMemo(
    () => existingBuildings.reduce((sum, b) => sum + (b.hasShop ? b.shopCount || 0 : 0), 0),
    [existingBuildings]
  );
  const totalExistingUnits = totalExistingFlats + totalExistingShops;
  const totalExistingFlatArea = useMemo(
    () => existingBuildings.reduce((sum, b) => sum + (b.flatCount || 0) * (b.avgFlatArea || 80), 0),
    [existingBuildings]
  );
  const totalExistingShopArea = useMemo(
    () =>
      existingBuildings.reduce(
        (sum, b) => sum + (b.hasShop ? (b.shopCount || 0) * (b.avgShopArea || 60) : 0),
        0
      ),
    [existingBuildings]
  );
  const totalExistingConstructionArea = useMemo(
    () =>
      existingBuildings.reduce(
        (sum, b) =>
          sum +
          (b.totalExistingArea ||
            (b.baseArea || 120) * (b.floorCount || 4) +
              (b.hasShop && b.shopLocation === 'both' ? (b.shopCount || 1) * (b.avgShopArea || 60) : 0)),
        0
      ),
    [existingBuildings]
  );

  // New building planned metrics
  const newFloorCount = params.floorCount || 5;
  const newFlatsPerFloor = params.flatsPerFloor || 2;
  const newHasShop = !!params.hasGroundFloorShop;
  const newShopCount = params.shopCount || (newHasShop ? 1 : 0);
  const newShopLocation = params.shopLocation || 'ground';
  const newShopArea = params.shopArea || 80;
  const resFloors = newHasShop ? Math.max(1, newFloorCount - 1) : newFloorCount;
  const newFlatCount = params.flatCount || (resFloors * newFlatsPerFloor);
  const newApartmentSize = params.apartmentSize || 90;
  const newBaseArea = params.baseBuildArea || 140;
  const newTotalConstructionArea = Math.round(
    newBaseArea * newFloorCount +
      (params.basementCount ? newBaseArea * params.basementCount : 0)
  );

  // Konsol Çıkma Alan Etkisi Hesabı (N-Cephe, L-Tipi ve Bitişik Nizam Uyumlu)
  const footprintCalc = calculateFootprint(params.footprintInputMode, params);
  const activeBaseArea = footprintCalc.area || 100;
  const cantileverInfo = calculateCantileverDetails(params, activeBaseArea, footprintCalc);
  const upperFloorArea = cantileverInfo.upperFloorArea;
  const singleFloorCantileverDiff = cantileverInfo.singleFloorDiff;
  const percentIncrease = activeBaseArea > 0 ? (singleFloorCantileverDiff / activeBaseArea) * 100 : 0;
  const upperFloorsCount = Math.max(0, (params.floorCount || 5) - 1);
  const totalCantileverContribution = cantileverInfo.totalCantileverArea;

  // Calculation difference (New vs Old)
  const flatDifference = newFlatCount - totalExistingFlats;
  const shopDifference = (newHasShop ? newShopCount : 0) - totalExistingShops;
  const totalUnitDifference = newFlatCount + (newHasShop ? newShopCount : 0) - totalExistingUnits;

  // Contractor shares in new building
  const contractorFlatCount =
    params.contractorFlatIds && params.contractorFlatIds.length > 0
      ? params.contractorFlatIds.length
      : Math.round(newFlatCount * ((params.contractorShareRate || 50) / 100));

  // Add or update existing building
  const handleSaveBuilding = () => {
    if (!bldgName.trim() || bldgFloors < 1 || bldgFlats < 0) return;

    const calcTotalArea =
      bldgBaseArea * bldgFloors +
      (bldgHasShop && bldgShopLocation === 'both' ? bldgShopCount * bldgAvgShopArea : 0);

    const bldgData: ExistingBuilding = {
      id: editingBuildingId || `bldg-${Date.now()}`,
      name: bldgName.trim(),
      floorCount: bldgFloors,
      flatCount: bldgFlats,
      avgFlatArea: bldgAvgFlatArea,
      hasShop: bldgHasShop,
      shopCount: bldgHasShop ? bldgShopCount : 0,
      shopLocation: bldgHasShop ? bldgShopLocation : 'ground',
      avgShopArea: bldgHasShop ? bldgAvgShopArea : 0,
      baseArea: bldgBaseArea,
      totalExistingArea: calcTotalArea,
      landShareNumerator: bldgLandShareNum,
      landShareDenominator: bldgLandShareDenom,
      note: bldgNote.trim(),
    };

    let updatedList: ExistingBuilding[];
    if (editingBuildingId) {
      updatedList = existingBuildings.map((b) => (b.id === editingBuildingId ? bldgData : b));
      setEditingBuildingId(null);
    } else {
      updatedList = [...existingBuildings, bldgData];
    }

    onChangeParams({
      ...params,
      existingBuildings: updatedList,
    });

    // Reset form for next entry
    setBldgName(`Bina ${updatedList.length + 1}`);
    setBldgFloors(4);
    setBldgFlats(6);
    setBldgAvgFlatArea(85);
    setBldgHasShop(false);
    setBldgShopCount(1);
    setBldgShopLocation('ground');
    setBldgAvgShopArea(60);
    setBldgBaseArea(130);
    setBldgLandShareNum(50);
    setBldgLandShareDenom(100);
    setBldgNote('');
    setShowExistingForm(false);
  };

  const handleEditBuilding = (b: ExistingBuilding) => {
    setEditingBuildingId(b.id);
    setBldgName(b.name);
    setBldgFloors(b.floorCount);
    setBldgFlats(b.flatCount);
    setBldgAvgFlatArea(b.avgFlatArea || 85);
    setBldgHasShop(!!b.hasShop);
    setBldgShopCount(b.shopCount || 1);
    setBldgShopLocation(b.shopLocation || 'ground');
    setBldgAvgShopArea(b.avgShopArea || 60);
    setBldgBaseArea(b.baseArea || 140);
    setBldgLandShareNum(b.landShareNumerator || 50);
    setBldgLandShareDenom(b.landShareDenominator || 100);
    setBldgNote(b.note || '');
    setShowExistingForm(true);
  };

  const handleCancelBuilding = () => {
    setEditingBuildingId(null);
    setShowExistingForm(false);
  };

  const handleDeleteBuilding = (id: string) => {
    const updated = existingBuildings.filter((b) => b.id !== id);
    onChangeParams({
      ...params,
      existingBuildings: updated,
    });
    if (editingBuildingId === id) {
      setEditingBuildingId(null);
      setShowExistingForm(false);
    }
  };

  const handleBaseAreaInputChange = (valStr: string) => {
    if (valStr === '') {
      onChangeParams({ ...params, baseBuildArea: 0 });
      return;
    }
    const parsed = parseFloat(valStr);
    if (isNaN(parsed) || parsed <= 0) return;
    const currentArea = calculatePolygonArea(activePoints);
    if (currentArea > 0) {
      const scaleFactor = Math.sqrt(parsed / currentArea);
      const scaledPoints = activePoints.map((p) => ({
        ...p,
        x: Math.round(p.x * scaleFactor * 100) / 100,
        y: Math.round(p.y * scaleFactor * 100) / 100,
      }));
      handlePolygonPointsChange(scaledPoints);
    } else {
      onChangeParams({ ...params, baseBuildArea: parsed });
    }
  };

  // Polygon & Geometry handling
  const activeInputMode = params.footprintInputMode || 'polygonDraw';
  const activePoints = useMemo(() => {
    if (params.polygonPoints && params.polygonPoints.length >= 3) {
      return params.polygonPoints;
    }
    // Scale the default rectangle to params.baseBuildArea
    const defaultPoints = POLYGON_PRESETS.rectangle.points;
    const targetArea = params.baseBuildArea || 150;
    const currentArea = calculatePolygonArea(defaultPoints);
    if (currentArea > 0 && targetArea > 0) {
      const scaleFactor = Math.sqrt(targetArea / currentArea);
      return defaultPoints.map(p => ({
        ...p,
        x: Math.round(p.x * scaleFactor * 100) / 100,
        y: Math.round(p.y * scaleFactor * 100) / 100,
      }));
    }
    return defaultPoints;
  }, [params.polygonPoints, params.baseBuildArea]);

  const currentPolyArea = calculatePolygonArea(activePoints);
  const currentPolyPerimeter = calculatePolygonPerimeter(activePoints);
  const currentPolyBounds = getPolygonBounds(activePoints);

  const handlePolygonPointsChange = (newPoints: PolygonPoint[]) => {
    const bounds = getPolygonBounds(newPoints);
    const syncedConfigs = generateFacadeConfigs(
      newPoints,
      params.facadeConfigs,
      params.mainEntranceFacadeIndex || 0
    );
    const syncedCustom = syncPolygonToCustomFacades(
      newPoints,
      params.customFacades,
      syncedConfigs,
      params.mainEntranceFacadeIndex || 0
    );
    const area = calculatePolygonArea(newPoints);

    onChangeParams({
      ...params,
      polygonPoints: newPoints,
      facadeWidth: Math.round(bounds.width * 10) / 10,
      facadeDepth: Math.round(bounds.depth * 10) / 10,
      facadeConfigs: syncedConfigs,
      customFacades: syncedCustom,
      baseBuildArea: Math.round(area * 10) / 10,
    });
  };

  const handleApplyPreset = (presetKey: string) => {
    const preset = POLYGON_PRESETS[presetKey];
    if (!preset) return;

    // Scale points to match params.baseBuildArea if defined
    let pointsToApply = preset.points;
    const targetArea = params.baseBuildArea || 150;
    const currentArea = calculatePolygonArea(pointsToApply);
    if (currentArea > 0 && targetArea > 0) {
      const scaleFactor = Math.sqrt(targetArea / currentArea);
      pointsToApply = pointsToApply.map(p => ({
        ...p,
        x: Math.round(p.x * scaleFactor * 100) / 100,
        y: Math.round(p.y * scaleFactor * 100) / 100,
      }));
    }

    handlePolygonPointsChange(pointsToApply);
  };

  // Multi-facade adjacent & cantilever handlers (L-Tipi, N-Cephe ve Bitişik Nizam Yönetimi)
  const handleToggleFacadeAdjacent = (idx: number) => {
    const activeSides = cantileverInfo.facades;
    const currentFacade = activeSides[idx];
    const willBeAdjacent = !currentFacade.isAdjacent;

    const updatedConfigs = [...(params.facadeConfigs || [])];
    while (updatedConfigs.length < activeSides.length) {
      const s = activeSides[updatedConfigs.length];
      updatedConfigs.push({
        id: updatedConfigs.length + 1,
        name: s.name,
        length: s.length,
        windowCountPerFloor: 2,
        hasBalcony: true,
        balconyCountPerFloor: 1,
        balconyType: 'standard',
        isAdjacent: false,
        isBlankWall: false,
        cantileverDepth: params.cantileverDepth || 1.2,
      });
    }

    const existing = updatedConfigs[idx];
    if (willBeAdjacent) {
      updatedConfigs[idx] = {
        ...existing,
        isAdjacent: true,
        isBlankWall: true,
        windowCountPerFloor: 0,
        hasBalcony: false,
        balconyCountPerFloor: 0,
        cantileverDepth: 0,
      };
    } else {
      const defaultWin = Math.max(1, Math.min(6, Math.floor((existing.length || 10) / 3.5)));
      updatedConfigs[idx] = {
        ...existing,
        isAdjacent: false,
        isBlankWall: false,
        windowCountPerFloor: defaultWin,
        hasBalcony: (existing.length || 10) >= 6,
        balconyCountPerFloor: 1,
        cantileverDepth: params.cantileverDepth || 1.2,
      };
    }

    const updatedCantilevers = [...(params.facadeCantilevers || Array(activeSides.length).fill(params.cantileverDepth || 1.2))];
    while (updatedCantilevers.length < activeSides.length) {
      updatedCantilevers.push(params.cantileverDepth || 1.2);
    }
    updatedCantilevers[idx] = willBeAdjacent ? 0 : (params.cantileverDepth || 1.2);

    onChangeParams({
      ...params,
      cantileverDirection: 'custom',
      facadeConfigs: updatedConfigs,
      facadeCantilevers: updatedCantilevers,
    });
  };

  const handleUpdateFacadeCantileverDepth = (idx: number, depth: number) => {
    const activeSides = cantileverInfo.facades;
    const updatedCantilevers = [...(params.facadeCantilevers || Array(activeSides.length).fill(params.cantileverDepth || 1.2))];
    while (updatedCantilevers.length < activeSides.length) {
      updatedCantilevers.push(params.cantileverDepth || 1.2);
    }
    updatedCantilevers[idx] = Math.max(0, depth);

    const updatedConfigs = [...(params.facadeConfigs || [])];
    if (updatedConfigs[idx]) {
      updatedConfigs[idx] = {
        ...updatedConfigs[idx],
        cantileverDepth: Math.max(0, depth),
      };
    }

    onChangeParams({
      ...params,
      cantileverDirection: 'custom',
      facadeCantilevers: updatedCantilevers,
      facadeConfigs: updatedConfigs.length > 0 ? updatedConfigs : undefined,
    });
  };

  const handleApplyPresetAdjacent = (preset: 'l_corner' | 'all_open' | 'all_cantilever' | 'clear_cantilever') => {
    const activeSides = cantileverInfo.facades;
    const defaultDepth = params.cantileverDepth || 1.2;

    const updatedConfigs = [...(params.facadeConfigs || [])];
    while (updatedConfigs.length < activeSides.length) {
      const s = activeSides[updatedConfigs.length];
      updatedConfigs.push({
        id: updatedConfigs.length + 1,
        name: s.name,
        length: s.length,
        windowCountPerFloor: 2,
        hasBalcony: true,
        balconyCountPerFloor: 1,
        balconyType: 'standard',
        isAdjacent: false,
        isBlankWall: false,
        cantileverDepth: defaultDepth,
      });
    }

    const updatedCantilevers = Array(activeSides.length).fill(0);

    if (preset === 'l_corner') {
      // For L-shape (6 sides), typical corner adjacent lot:
      // Facades 2 (back) and 5 (left/inner) are adjacent to neighbors
      activeSides.forEach((_, i) => {
        const isAdj = (activeSides.length === 6 && (i === 2 || i === 5)) || (activeSides.length === 4 && (i === 1 || i === 2));
        const len = updatedConfigs[i].length || 10;
        if (isAdj) {
          updatedConfigs[i] = {
            ...updatedConfigs[i],
            isAdjacent: true,
            isBlankWall: true,
            windowCountPerFloor: 0,
            hasBalcony: false,
            balconyCountPerFloor: 0,
            cantileverDepth: 0,
          };
          updatedCantilevers[i] = 0;
        } else {
          updatedConfigs[i] = {
            ...updatedConfigs[i],
            isAdjacent: false,
            isBlankWall: false,
            windowCountPerFloor: Math.max(1, Math.floor(len / 3.5)),
            hasBalcony: len >= 6,
            balconyCountPerFloor: 1,
            cantileverDepth: defaultDepth,
          };
          updatedCantilevers[i] = defaultDepth;
        }
      });
    } else if (preset === 'all_open') {
      activeSides.forEach((_, i) => {
        const len = updatedConfigs[i].length || 10;
        updatedConfigs[i] = {
          ...updatedConfigs[i],
          isAdjacent: false,
          isBlankWall: false,
          windowCountPerFloor: Math.max(1, Math.floor(len / 3.5)),
          hasBalcony: len >= 6,
          balconyCountPerFloor: 1,
          cantileverDepth: defaultDepth,
        };
        updatedCantilevers[i] = defaultDepth;
      });
    } else if (preset === 'all_cantilever') {
      activeSides.forEach((_, i) => {
        const isAdj = updatedConfigs[i]?.isAdjacent || updatedConfigs[i]?.isBlankWall;
        if (!isAdj) {
          updatedConfigs[i] = { ...updatedConfigs[i], cantileverDepth: defaultDepth };
          updatedCantilevers[i] = defaultDepth;
        } else {
          updatedCantilevers[i] = 0;
        }
      });
    } else if (preset === 'clear_cantilever') {
      activeSides.forEach((_, i) => {
        updatedConfigs[i] = { ...updatedConfigs[i], cantileverDepth: 0 };
        updatedCantilevers[i] = 0;
      });
    }

    onChangeParams({
      ...params,
      cantileverDirection: 'custom',
      facadeConfigs: updatedConfigs,
      facadeCantilevers: updatedCantilevers,
    });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className={`${bgCard} rounded-2xl p-6 border shadow-xs relative overflow-hidden`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                1. AŞAMA: PROJE & PARSEL KURULUMU
              </span>
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                Kentsel Dönüşüm Başlangıcı
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textTitle}`}>
              Mevcut Binalar, Parsel Çizimi & Hak Dağılımı Başlangıcı
            </h1>
            <p className={`text-xs sm:text-sm ${textMuted} max-w-3xl`}>
              Birleşecek mevcut binaların bağımsız bölümlerini (konut & dükkan) envantere ekleyin, parsel
              ve bina taban geometrisini milimetrik ölçüleriyle çizin; yeni yapının hak dağılım dengesini
              sağlayın.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onNext}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Proje Künyesi & Maliyete Geç</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Interactive Mode & Step Selector */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mt-6 pt-5 border-t border-slate-100">
          <div className="flex-1 max-w-2xl mx-auto md:mx-0">
            <div className="flex items-center justify-between gap-1">
              {[
                { step: 1, label: 'Müşteri, Proje & Tür', icon: Home },
                { step: 2, label: 'Ölçüler & 2D Çizim', icon: Ruler },
                { step: 3, label: 'Yapı Metraj & Teşvikler', icon: Building2 },
              ].map((s) => {
                const Icon = s.icon;
                const isActive = activeStep === s.step;
                const isCompleted = activeStep > s.step;

                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => {
                      setActiveStep(s.step);
                    }}
                    className="flex-1 group flex flex-col items-center gap-1.5 focus:outline-none cursor-pointer animate-fade-in"
                  >
                    <div className="flex items-center w-full">
                      <div className={`h-1 flex-1 rounded-full ${
                        s.step === 1 ? 'invisible' : isCompleted || isActive ? 'bg-indigo-600' : 'bg-slate-200'
                      }`} />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all font-mono font-bold text-xs ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-600 scale-110 shadow-xs ring-4 ring-indigo-50'
                          : isCompleted
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-white text-slate-400 border-slate-200 group-hover:border-slate-400'
                      }`}>
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.step}
                      </div>
                      <div className={`h-1 flex-1 rounded-full ${
                        s.step === 3 ? 'invisible' : isCompleted ? 'bg-indigo-600' : 'bg-slate-200'
                      }`} />
                    </div>
                    <span className={`text-[10px] font-bold tracking-tight text-center ${
                      isActive ? 'text-indigo-600 font-extrabold' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {wizardMode && activeStep === 1 && (
        <div className="space-y-6">
          <div className={`${bgCard} rounded-2xl p-6 border shadow-xs space-y-6 animate-fade-in`}>
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold ${textTitle}`}>
                  1. Müşteri & Proje Bilgileri
                </h2>
                <p className={`text-xs ${textMuted}`}>
                  Projeyi tanımlamak, resmi sözleşme ve teklif belgelerinde kullanılmak üzere isim ve konum bilgilerini girin.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  👤 Müşteri / Proje Adı
                </label>
                <input
                  id="projectNameInput"
                  type="text"
                  value={params.projectName || ''}
                  onChange={(e) => onChangeParams({ ...params, projectName: e.target.value })}
                  placeholder="Örn: Alpaslan Beyoğlu Apartmanı Kentsel Dönüşüm Projesi"
                  className={`w-full text-xs font-bold px-3 py-2.5 rounded-lg border ${inputBg}`}
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Teklif çıktılarında ve sözleşme metinlerinde proje başlığı olarak görünecektir.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  📍 Yapı / Proje Adresi (Ada & Parsel)
                </label>
                <input
                  id="projectAddressInput"
                  type="text"
                  value={params.projectAddress || ''}
                  onChange={(e) => onChangeParams({ ...params, projectAddress: e.target.value })}
                  placeholder="Örn: İstanbul, Kadıköy, Göztepe Mah. 1024 Ada 15 Parsel"
                  className={`w-full text-xs font-bold px-3 py-2.5 rounded-lg border ${inputBg}`}
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Tapu kaydı, ada parsel ve belediye yazışmalarında kullanılacak resmi adres.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-950 mb-1">
                  📐 Planlanan Yapı Taban Alanı (m²)
                </label>
                <div className="relative">
                  <input
                    id="projectBaseAreaInput"
                    type="number"
                    min="10"
                    value={params.baseBuildArea || ''}
                    onChange={(e) => onChangeParams({ ...params, baseBuildArea: Math.max(0, parseFloat(e.target.value) || 0) })}
                    placeholder="Örn: 150"
                    className={`w-full text-xs font-black px-3 py-2.5 rounded-lg border border-indigo-200 bg-indigo-50/20 text-indigo-900 ${inputBg}`}
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-indigo-500">m²</span>
                </div>
                <span className="text-[10px] text-indigo-500 mt-1 block font-semibold animate-pulse">
                  Binanın oturacağı taban alan ölçüsü (m²).
                </span>
              </div>
            </div>

            {/* Proje Türü Seçimi */}
            <div className="pt-5 border-t border-slate-100/80 space-y-3.5">
              <label className="block text-xs font-black text-indigo-950 uppercase tracking-wider">
                💼 Proje Türü & Dönüşüm Modeli Seçin
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { id: 'kentsel', label: '🏢 Kentsel Dönüşüm', desc: '6306 Sayılı Afet Riski Altındaki Alanların Dönüştürülmesi yasası kapsamında.' },
                  { id: 'kentsel_imar', label: '⚡ Kentsel Dönüşüm + İmar Artışı', desc: 'İlave imar hakkı veya belediye emsal artış teşvikleri entegre edilmiş kentsel dönüşüm modeli.' },
                  { id: 'kat_karsiligi', label: '🤝 Kat Karşılığı', desc: 'Arsa maliklerinin arsa paylarını müteahhide bağımsız bölüm karşılığı devretmesi.' },
                  { id: 'muteahhitlik', label: '🔨 Müteahhitlik Hizmeti', desc: 'Tüm inşaat maliyetinin maliklerce karşılandığı, müteahhidin yapım hizmeti verdiği model.' },
                ].map((type) => {
                  const isSel = params.projectType === type.id || (type.id === 'kentsel' && !params.projectType);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => onChangeParams({ ...params, projectType: type.id })}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSel
                          ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/10'
                          : 'bg-white/60 hover:bg-white border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                          {isSel && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>}
                          {type.label}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1.5 leading-relaxed font-medium">{type.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. BÖLÜM: PARSEL ALANI & YAPI GEOMETRİSİ (POLİGON & ÖLÇÜLER) */}
      {(!wizardMode || activeStep === 2) && (
        <div className={`${bgCard} rounded-2xl p-6 border shadow-xs space-y-6 animate-fade-in`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base sm:text-lg font-bold ${textTitle}`}>
                2. Proje Ölçüleri & 2D Çizim (Tüm Proje Parametreleri)
              </h2>
              <p className={`text-xs ${textMuted}`}>
                Müşteri, mevcut binalar, planlanan kat/daire özellikleri ve bina taban geometrisini buradan doğrudan yönetin; 2D akıllı çizim tuvalinde geometriyi oluşturun.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              {currentPolyArea.toFixed(1)} m² Taban Oturumu
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MINIMALIST PROJE, MEVCUT BİNALAR & YAPI PARAMETRELERİ (ÖLÇÜLER & ÇİZİM ÜSTÜ) */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-indigo-100/80 shadow-3xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-indigo-100/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-4 rounded-full bg-indigo-600"></span>
              <h3 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span>📋 Tüm Elle Girilen Proje & Yapı Parametreleri</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  Minimalist Hızlı Giriş
                </span>
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="font-mono text-[11px] font-bold text-slate-600">
                {params.floorCount || 5} Kat • {newFlatCount} Daire {newHasShop ? `• ${newShopCount} Dükkan` : ''} • {newTotalConstructionArea.toLocaleString('tr-TR')} m² Brüt
              </span>
              <button
                type="button"
                onClick={() => setShowManualDataSection(!showManualDataSection)}
                className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title={showManualDataSection ? 'Bölümü Gizle' : 'Bölümü Genişlet'}
              >
                {showManualDataSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {showManualDataSection && (
            <div className="space-y-4 animate-fade-in">
              {/* 1. GRUP: MÜŞTERİ, PROJE & ARSA KÜNYESİ */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-3xs space-y-2.5">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-indigo-600" />
                    Müşteri, Konum & Sözleşme Türü
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Teklif ve sözleşmeye yansır</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      👤 Müşteri / Proje Adı
                    </label>
                    <input
                      id="minimalProjectNameInput"
                      type="text"
                      value={params.projectName || ''}
                      onChange={(e) => onChangeParams({ ...params, projectName: e.target.value })}
                      placeholder="Örn: Huzur Apartmanı Kentsel Dönüşüm"
                      className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${inputBg}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      📍 Yapı / Proje Adresi (Ada & Parsel)
                    </label>
                    <input
                      id="minimalProjectAddressInput"
                      type="text"
                      value={params.projectAddress || ''}
                      onChange={(e) => onChangeParams({ ...params, projectAddress: e.target.value })}
                      placeholder="Örn: Kadıköy, 124 Ada 5 Parsel"
                      className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${inputBg}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      📐 Arsa / Parsel Alanı (m²)
                    </label>
                    <input
                      id="minimalLandAreaInput"
                      type="number"
                      min={0}
                      value={params.landArea || ''}
                      onChange={(e) => onChangeParams({ ...params, landArea: Number(e.target.value) || 0 })}
                      placeholder="Örn: 450"
                      className={`w-full text-xs font-bold font-mono px-2.5 py-1.5 rounded-lg border ${inputBg}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      💼 Sözleşme & Dönüşüm Modeli
                    </label>
                    <select
                      id="minimalProjectTypeSelect"
                      value={params.projectType || 'kentsel'}
                      onChange={(e) => onChangeParams({ ...params, projectType: e.target.value })}
                      className={`w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border bg-white border-slate-200`}
                    >
                      <option value="kentsel">🏢 Kentsel Dönüşüm (6306 S.K.)</option>
                      <option value="kentsel_imar">⚡ Kentsel + İmar Artışlı</option>
                      <option value="kat_karsiligi">🤝 Kat Karşılığı Sözleşme</option>
                      <option value="muteahhitlik">🔨 Anahtar Teslim Müteahhitlik</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. GRUP: MEVCUT BİNALAR & HAK DAĞILIMI ENVANTERİ */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-3xs space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                      Mevcut Bina Envanteri & Hak Dağılımı ({existingBuildings.length} Blok)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {totalExistingFlats} Daire • {totalExistingShops} Dükkan • {totalExistingConstructionArea.toLocaleString('tr-TR')} m²
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (showExistingForm) {
                        handleCancelBuilding();
                      } else {
                        setShowExistingForm(true);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showExistingForm ? 'Formu Kapat' : 'Mevcut Yapı Ekle'}</span>
                  </button>
                </div>

                {/* Mevcut Yapı Listesi */}
                {existingBuildings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {existingBuildings.map((b) => (
                      <div
                        key={b.id}
                        className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between gap-2 transition-all ${
                          editingBuildingId === b.id
                            ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-100'
                            : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div>
                            <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                              <span>🏢 {b.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {b.floorCount} Kat • {b.flatCount} Daire ({b.avgFlatArea || 80} m²)
                              {b.hasShop && ` • ${b.shopCount || 1} Dükkan (${b.avgShopArea || 60} m²)`}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Taban: {b.baseArea || 140} m² • Arsa Payı: {b.landShareNumerator || 50}/{b.landShareDenominator || 100}
                              {b.note ? ` • "${b.note}"` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditBuilding(b)}
                              className="p-1 rounded text-slate-400 hover:text-purple-600 hover:bg-white cursor-pointer"
                              title="Düzenle"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBuilding(b.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-white cursor-pointer"
                              title="Sil"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-2 text-center bg-slate-50/60 rounded-lg border border-dashed border-slate-200">
                    Henüz mevcut bina tanımlanmadı. Hak dağılım dengesini hesaplamak için yukarıdaki <strong>"Mevcut Yapı Ekle"</strong> butonuna tıklayabilirsiniz.
                  </div>
                )}

                {/* Minimalist Inline Existing Building Form */}
                {showExistingForm && (
                  <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-xl space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-900 border-b border-purple-200/60 pb-2">
                      <span>{editingBuildingId ? '✏️ Mevcut Yapıyı Düzenle' : '➕ Yeni Mevcut Yapı Tanımla'}</span>
                      <button
                        type="button"
                        onClick={handleCancelBuilding}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Bina / Blok Adı</label>
                        <input
                          type="text"
                          value={bldgName}
                          onChange={(e) => setBldgName(e.target.value)}
                          placeholder="Örn: A Blok (Eski Yapı)"
                          className="w-full text-xs px-2 py-1.5 rounded-md border border-purple-200 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Kat Sayısı</label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={bldgFloors}
                          onChange={(e) => setBldgFloors(parseInt(e.target.value) || 1)}
                          className="w-full text-xs font-mono px-2 py-1.5 rounded-md border border-purple-200 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Daire Sayısı</label>
                        <input
                          type="number"
                          min={0}
                          max={200}
                          value={bldgFlats}
                          onChange={(e) => setBldgFlats(parseInt(e.target.value) || 0)}
                          className="w-full text-xs font-mono px-2 py-1.5 rounded-md border border-purple-200 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Ort. Daire m²</label>
                        <input
                          type="number"
                          min={20}
                          max={500}
                          value={bldgAvgFlatArea}
                          onChange={(e) => setBldgAvgFlatArea(parseInt(e.target.value) || 80)}
                          className="w-full text-xs font-mono px-2 py-1.5 rounded-md border border-purple-200 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Taban m²</label>
                        <input
                          type="number"
                          min={30}
                          max={2000}
                          value={bldgBaseArea}
                          onChange={(e) => setBldgBaseArea(parseInt(e.target.value) || 120)}
                          className="w-full text-xs font-mono px-2 py-1.5 rounded-md border border-purple-200 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Arsa Payı (Pay)</label>
                        <input
                          type="number"
                          min={1}
                          value={bldgLandShareNum}
                          onChange={(e) => setBldgLandShareNum(parseInt(e.target.value) || 50)}
                          className="w-full text-xs font-mono px-2 py-1.5 rounded-md border border-purple-200 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Arsa Payı (Payda)</label>
                        <input
                          type="number"
                          min={1}
                          value={bldgLandShareDenom}
                          onChange={(e) => setBldgLandShareDenom(parseInt(e.target.value) || 100)}
                          className="w-full text-xs font-mono px-2 py-1.5 rounded-md border border-purple-200 bg-white"
                        />
                      </div>

                      <div className="col-span-2 flex items-center gap-2 pt-3">
                        <input
                          type="checkbox"
                          id="bldgHasShopCheck"
                          checked={bldgHasShop}
                          onChange={(e) => setBldgHasShop(e.target.checked)}
                          className="w-3.5 h-3.5 text-purple-600 rounded cursor-pointer"
                        />
                        <label htmlFor="bldgHasShopCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                          Dükkan / Ticari Var mı?
                        </label>
                      </div>

                      {bldgHasShop && (
                        <>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Dükkan Adedi</label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={bldgShopCount}
                              onChange={(e) => setBldgShopCount(parseInt(e.target.value) || 1)}
                              className="w-full text-xs font-mono px-2 py-1.5 rounded-md border border-purple-200 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Ort. Dükkan m²</label>
                            <input
                              type="number"
                              min={10}
                              max={500}
                              value={bldgAvgShopArea}
                              onChange={(e) => setBldgAvgShopArea(parseInt(e.target.value) || 60)}
                              className="w-full text-xs font-mono px-2 py-1.5 rounded-md border border-purple-200 bg-white"
                            />
                          </div>
                        </>
                      )}

                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Açıklama / Not</label>
                        <input
                          type="text"
                          value={bldgNote}
                          onChange={(e) => setBldgNote(e.target.value)}
                          placeholder="Örn: 1988 yapımı riskli bina"
                          className="w-full text-xs px-2 py-1.5 rounded-md border border-purple-200 bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-purple-200/60">
                      <button
                        type="button"
                        onClick={handleCancelBuilding}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveBuilding}
                        className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        {editingBuildingId ? 'Değişiklikleri Güncelle' : 'Binayı Listeye Ekle'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Hak Dağılımı Dengeleme Şeridi */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="font-semibold text-slate-700">
                      Mevcut ({totalExistingFlats} Konut + {totalExistingShops} Ticari) ➡️ Yeni Planlanan ({newFlatCount} Konut + {newHasShop ? newShopCount : 0} Ticari)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono font-bold">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] ${
                      totalUnitDifference >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      Fark: {totalUnitDifference >= 0 ? `+${totalUnitDifference}` : totalUnitDifference} Bağımsız Bölüm
                    </span>
                    <span className="text-[11px] text-slate-500 font-sans">
                      (Müteahhit Payı: ~%{params.contractorShareRate || 50})
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. GRUP: PLANLANAN YENİ BİNA PARAMETRELERİ (MİNiMALİST IZGARA) */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-3xs space-y-3">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    Planlanan Yeni Yapı Parametreleri & Boyutları
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    2D Çizim ve 3D Modelle anında senkronize olur
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Taban Oturumu */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      📐 Taban Oturumu (m²)
                    </label>
                    <input
                      id="minimalBaseAreaInput"
                      type="number"
                      min={10}
                      max={10000}
                      value={params.baseBuildArea || ''}
                      onChange={(e) => handleBaseAreaInputChange(e.target.value)}
                      className={`w-full text-xs font-black font-mono px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50/40 text-emerald-900`}
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block">2D çizimle bağlıdır</span>
                  </div>

                  {/* Normal Kat Sayısı */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      🏢 Normal Kat Sayısı
                    </label>
                    <input
                      id="minimalFloorCountInput"
                      type="number"
                      min={1}
                      max={40}
                      value={params.floorCount || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const parsed = parseInt(val) || 0;
                        const normalFloors = params.hasGroundFloorShop ? Math.max(1, parsed - 1) : parsed;
                        onChangeParams({
                          ...params,
                          floorCount: val === '' ? 0 : parsed,
                          flatCount: val === '' ? 0 : normalFloors * (params.flatsPerFloor || 2),
                        });
                      }}
                      className={`w-full text-xs font-black font-mono px-2.5 py-1.5 rounded-lg border ${inputBg}`}
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Toplam kat adedi</span>
                  </div>

                  {/* Katta Daire Sayısı */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      🔢 Katta Daire Sayısı
                    </label>
                    <input
                      id="minimalFlatsPerFloorInput"
                      type="number"
                      min={1}
                      max={10}
                      value={params.flatsPerFloor || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const parsed = parseInt(val) || 0;
                        const normalFloors = params.hasGroundFloorShop ? Math.max(1, (params.floorCount || 5) - 1) : (params.floorCount || 5);
                        onChangeParams({
                          ...params,
                          flatsPerFloor: val === '' ? 0 : parsed,
                          flatCount: val === '' ? 0 : normalFloors * parsed,
                        });
                      }}
                      className={`w-full text-xs font-black font-mono px-2.5 py-1.5 rounded-lg border ${inputBg}`}
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Kattaki bağımsız konut</span>
                  </div>

                  {/* Daire Oda Planı */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      🚪 Daire Oda Planı
                    </label>
                    <select
                      id="minimalRoomTypeSelect"
                      value={params.roomType || '3+1'}
                      onChange={(e) => onChangeParams({ ...params, roomType: e.target.value as RoomType })}
                      className={`w-full text-xs font-bold px-2 py-1.5 rounded-lg border bg-white border-slate-200`}
                    >
                      <option value="1+1">1+1 Stüdyo Plan</option>
                      <option value="2+1">2+1 Standart Plan</option>
                      <option value="3+1">3+1 Geniş Konut</option>
                      <option value="4+1">4+1 Lüks Konut</option>
                      <option value="5+1">5+1 Büyük Aile</option>
                    </select>
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Varsayılan oda tipi</span>
                  </div>

                  {/* Kat Yüksekliği */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      📏 Kat Yüksekliği (m)
                    </label>
                    <input
                      id="minimalFloorHeightInput"
                      type="number"
                      step={0.05}
                      min={2.5}
                      max={4.5}
                      value={params.floorHeight || 2.9}
                      onChange={(e) => onChangeParams({ ...params, floorHeight: parseFloat(e.target.value) || 2.9 })}
                      className={`w-full text-xs font-bold font-mono px-2.5 py-1.5 rounded-lg border ${inputBg}`}
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Döşemeden döşemeye</span>
                  </div>

                  {/* Toplam Daire (Otomatik) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      🏠 Toplam Daire (Oto)
                    </label>
                    <div className="w-full text-xs font-black font-mono px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 flex items-center justify-between">
                      <span>{params.flatCount || (resFloors * newFlatsPerFloor)} Adet</span>
                      <span className="text-[10px] text-emerald-600 font-sans">Otomatik</span>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Hesaplanan bağımsız bölüm</span>
                  </div>
                </div>

                {/* Alt Satır: Bodrum, Zemin Kat Dükkan, Çatı ve Konsol Çıkma */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                  {/* Bodrum Kat Grubu */}
                  <div className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={params.basementCount !== undefined ? params.basementCount > 0 : true}
                          onChange={(e) => onChangeParams({ ...params, basementCount: e.target.checked ? 1 : 0 })}
                          className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                        />
                        <span>Bodrum Kat</span>
                      </label>
                      {(params.basementCount !== undefined ? params.basementCount > 0 : true) && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={5}
                            value={params.basementCount || 1}
                            onChange={(e) => onChangeParams({ ...params, basementCount: parseInt(e.target.value) || 1 })}
                            className="w-12 text-[11px] font-bold font-mono px-1.5 py-0.5 rounded border border-slate-200 bg-white"
                          />
                          <span className="text-[10px] text-slate-500 font-bold">Kat</span>
                        </div>
                      )}
                    </div>
                    {(params.basementCount !== undefined ? params.basementCount > 0 : true) ? (
                      <select
                        value={params.basementPurpose || 'shelter_depot'}
                        onChange={(e) => onChangeParams({ ...params, basementPurpose: e.target.value })}
                        className="w-full text-[11px] font-semibold px-2 py-1 rounded border bg-white border-slate-200"
                      >
                        <option value="shelter_depot">🛡️ Sığınak & Depo</option>
                        <option value="parking">🚗 Kapalı Otopark</option>
                        <option value="shop">🛍️ Dükkan Deposu</option>
                      </select>
                    ) : (
                      <div className="text-[10px] text-slate-400">Bodrum kat planlanmadı</div>
                    )}
                  </div>

                  {/* Zemin Kat Dükkan Grubu */}
                  <div className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!params.hasGroundFloorShop}
                          onChange={(e) => onChangeParams({
                            ...params,
                            hasGroundFloorShop: e.target.checked,
                            shopCount: e.target.checked ? params.shopCount || 1 : 0
                          })}
                          className="w-3.5 h-3.5 text-amber-600 rounded cursor-pointer"
                        />
                        <span>Zemin Kat Dükkan</span>
                      </label>
                      {params.hasGroundFloorShop && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={params.shopCount || 1}
                            onChange={(e) => onChangeParams({ ...params, shopCount: parseInt(e.target.value) || 1 })}
                            className="w-12 text-[11px] font-bold font-mono px-1.5 py-0.5 rounded border border-amber-300 bg-white"
                          />
                          <span className="text-[10px] text-amber-700 font-bold">Adet</span>
                        </div>
                      )}
                    </div>
                    {params.hasGroundFloorShop ? (
                      <>
                        <div className="grid grid-cols-2 gap-1.5">
                          <select
                            value={params.shopLocation || 'ground'}
                            onChange={(e) => onChangeParams({ ...params, shopLocation: e.target.value as ShopLocation })}
                            className="text-[10px] font-semibold px-1.5 py-1 rounded border bg-white border-amber-300"
                          >
                            <option value="ground">Zemin</option>
                            <option value="basement">Bodrum</option>
                            <option value="both">Zemin+Bodrum</option>
                          </select>
                          <div className="flex items-center gap-1 text-[10px]">
                            <span className="text-slate-500 font-bold">Yükseklik:</span>
                            <input
                              type="number"
                              step={0.1}
                              min={2.8}
                              max={5.5}
                              value={params.shopHeight || 3.8}
                              onChange={(e) => onChangeParams({ ...params, shopHeight: parseFloat(e.target.value) || 3.8 })}
                              className="w-12 text-[10px] font-mono px-1 py-0.5 rounded border border-slate-200 bg-white"
                            />
                            <span className="text-slate-400">m</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] pt-1 border-t border-amber-100/60">
                          <span className="text-slate-500 font-bold">Ortalama Dükkan Alanı:</span>
                          <input
                            type="number"
                            min={10}
                            max={2000}
                            value={params.shopArea || 80}
                            onChange={(e) => onChangeParams({ ...params, shopArea: parseFloat(e.target.value) || 80 })}
                            className="w-14 text-[10px] font-mono px-1 py-0.5 rounded border border-amber-300 bg-white text-slate-800"
                          />
                          <span className="text-slate-400">m²</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-[10px] text-slate-400">Zeminde konut daireleri var ({params.flatsPerFloor || 2} Daire)</div>
                    )}
                  </div>

                  {/* Çatı Tipi Grubu */}
                  <div className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-2">
                    <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      <span>🏠 Çatı & Çatı Arası</span>
                    </div>
                    <div className="space-y-1.5">
                      <select
                        value={params.roofType || 'gable'}
                        onChange={(e) => onChangeParams({ ...params, roofType: e.target.value as any })}
                        className="w-full text-[11px] font-semibold px-2 py-1 rounded border bg-white border-slate-200"
                      >
                        <option value="gable">📐 Kırma Çatı</option>
                        <option value="flat">🧱 Teras Çatı (Düz)</option>
                        <option value="mansard">🏢 Mansart Çatı</option>
                        <option value="duplex">💎 Çatı Dubleksi</option>
                      </select>
                      {params.roofType !== 'flat' && (
                        <select
                          value={params.roofAtticType || 'duplex_unified'}
                          onChange={(e) => onChangeParams({ ...params, roofAtticType: e.target.value as any })}
                          className="w-full text-[10px] font-medium px-2 py-0.5 rounded border bg-white border-slate-200 text-slate-700"
                        >
                          <option value="duplex_unified">🔗 Alt Katla Birleşik Dubleks</option>
                          <option value="independent">🚪 Bağımsız Ayrı Daire</option>
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Konsol Çıkma Grubu */}
                  <div className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!params.hasCantilever}
                          onChange={(e) => onChangeParams({
                            ...params,
                            hasCantilever: e.target.checked,
                            cantileverDepth: e.target.checked ? params.cantileverDepth || 1.20 : 0
                          })}
                          className="w-3.5 h-3.5 text-emerald-600 rounded cursor-pointer"
                        />
                        <span>Konsol Çıkma</span>
                      </label>
                      {params.hasCantilever && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step={0.1}
                            min={0.2}
                            max={3.0}
                            value={params.cantileverDepth || 1.2}
                            onChange={(e) => onChangeParams({ ...params, cantileverDepth: parseFloat(e.target.value) || 1.2 })}
                            className="w-12 text-[11px] font-bold font-mono px-1.5 py-0.5 rounded border border-emerald-300 bg-white"
                          />
                          <span className="text-[10px] text-emerald-700 font-bold">m</span>
                        </div>
                      )}
                    </div>
                    {params.hasCantilever ? (
                      <select
                        value={params.cantileverDirection || 'all'}
                        onChange={(e) => onChangeParams({ ...params, cantileverDirection: e.target.value as any })}
                        className="w-full text-[10px] font-semibold px-1.5 py-1 rounded border bg-white border-emerald-300 text-emerald-900"
                      >
                        <option value="all">Tüm Cephelerde Çıkma</option>
                        <option value="front">Yalnızca Ön Cephe</option>
                        <option value="front_back">Ön & Arka Cepheler</option>
                      </select>
                    ) : (
                      <div className="text-[10px] text-slate-400">Üst katlarda çıkma yok (Düz bina)</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Parcel Info & Input Mode Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Geometrik Giriş Metodu</label>
            <select
              value={activeInputMode}
              onChange={(e) =>
                onChangeParams({
                  ...params,
                  footprintInputMode: e.target.value as FootprintInputMode,
                })
              }
              className={`w-full text-xs font-bold px-3 py-2 rounded-lg border ${inputBg}`}
            >
              <option value="polygonDraw">📐 İnteraktif Poligon Çizimi (Serbest Çokgen)</option>
              <option value="dimensions">📏 4 Cephe / Çarpık Dörtgen (Ön x Yan)</option>
              <option value="customFacades">📐 Çoklu Cephe (5, 6, 8 Kenarlı)</option>
              <option value="lShape">🔲 L-Tipi Kademeli Kütle</option>
              <option value="directArea">🏷️ Doğrudan Taban m² Alanı</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Hazır Geometri Şablonları</label>
            <div className="flex items-center gap-1.5">
              {Object.entries(POLYGON_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleApplyPreset(key)}
                  className="px-2.5 py-2 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 transition-colors"
                >
                  {preset.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cantilever / Çıkma / Konsol Görsel Özellikleri */}
        <div className="p-4 bg-emerald-50/50 border border-emerald-200/60 rounded-xl space-y-3 shadow-3xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                id="hasCantileverCheckbox"
                type="checkbox"
                checked={!!params.hasCantilever}
                onChange={(e) =>
                  onChangeParams({
                    ...params,
                    hasCantilever: e.target.checked,
                    cantileverDepth: e.target.checked ? params.cantileverDepth || 1.20 : 0,
                  })
                }
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-emerald-300 cursor-pointer"
              />
              <label htmlFor="hasCantileverCheckbox" className="text-xs font-black text-emerald-950 flex items-center gap-1.5 cursor-pointer">
                <Ruler className="w-4 h-4 text-emerald-600" />
                Üst Katlarda Konsol Çıkma (Tabla Çıkması / Konsol) Görsel Olarak Eklensin mi?
              </label>
            </div>
            {params.hasCantilever && (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300/50 animate-fade-in flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                {params.cantileverDepth || 1.20}m Çıkma Planlandı • {cantileverInfo.facades.length} Cepheli Kütle ({cantileverInfo.facades.filter(f => f.isAdjacent).length} Bitişik, {cantileverInfo.facades.filter(f => !f.isAdjacent).length} Açık)
              </span>
            )}
          </div>

          {params.hasCantilever && (
            <div className="space-y-4 pt-3 border-t border-emerald-200/60 animate-fade-in">
              {/* Üst Ayar Kontrolleri: Varsayılan Derinlik ve Kapsam */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-emerald-900">📐 Varsayılan Konsol Çıkma Derinliği</label>
                    <div className="flex items-center gap-1">
                      {[1.0, 1.2, 1.5].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            onChangeParams({
                              ...params,
                              cantileverDepth: d,
                            });
                          }}
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                            params.cantileverDepth === d
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          {d.toFixed(1)}m
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step={0.05}
                      min={0.2}
                      max={3.0}
                      value={params.cantileverDepth || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        onChangeParams({
                          ...params,
                          cantileverDepth: val === '' ? 0 : parseFloat(val) || 0,
                        });
                      }}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || val < 0.2) {
                          onChangeParams({
                            ...params,
                            cantileverDepth: 1.20,
                          });
                        }
                      }}
                      className="w-full text-xs font-bold font-mono px-3 py-1.5 rounded-lg border border-emerald-300 bg-white focus:outline-emerald-500"
                    />
                    <span className="absolute right-3 top-1.5 text-xs font-semibold text-emerald-600">metre</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-900 mb-1">🚪 Konsol Çıkma Yönü / Kapsamı</label>
                  <select
                    value={params.cantileverDirection || 'open_facades'}
                    onChange={(e) => {
                      const newDir = e.target.value as any;
                      onChangeParams({
                        ...params,
                        cantileverDirection: newDir,
                      });
                    }}
                    className="w-full text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-300 bg-white focus:outline-emerald-500 cursor-pointer"
                  >
                    <option value="open_facades">🌳 Tüm Açık Cepheler (Bitişik Olmayanlarda Çıkma - Önerilen)</option>
                    <option value="front_back">🚪 Ön & Arka Cepheler (Cadde ve Bahçe Yönü)</option>
                    <option value="front">🏠 Yalnızca Ön Cephe (Yol Cephesi)</option>
                    <option value="all">🌐 Tüm Cephelerde Çıkma (Ayrık Nizam Dört Taraf)</option>
                    <option value="custom">⚙️ Cephe Bazlı Özel Ayar (Her Kenarı Ayrı Ayarla)</option>
                  </select>
                </div>
              </div>

              {/* Dinamik N-Cephe & Bitişik Nizam Yönetim Paneli */}
              <div className="p-3.5 bg-emerald-50/25 border border-emerald-200/70 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/50 pb-2.5">
                  <div>
                    <div className="text-[11px] font-black text-emerald-950 flex items-center gap-1.5 uppercase tracking-wider">
                      <Layers className="w-3.5 h-3.5 text-emerald-700" />
                      Cephe Bazlı Bitişik Nizam & Konsol Çıkma Ayarları ({cantileverInfo.facades.length} Cephe)
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      L-Tipi veya çokgen binalarda komşu parsele bakan sağır cepheleri <strong>Bitişik Nizam</strong> yaparak konsol çıkmayı ve pencereyi otomatik sıfırlayabilirsiniz.
                    </p>
                  </div>

                  {/* Hızlı Şablon Butonları */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {cantileverInfo.facades.length === 6 && (
                      <button
                        type="button"
                        onClick={() => handleApplyPresetAdjacent('l_corner')}
                        className="px-2 py-1 text-[10px] font-bold rounded-md bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 transition-colors cursor-pointer flex items-center gap-1"
                        title="L-Tipi yapılarda klasik köşe parsel: Arka ve Yan cepheleri bitişik yapar"
                      >
                        <ShieldAlert className="w-3 h-3 text-amber-700" />
                        L-Tipi: Arka & Yanı Bitişik Yap
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleApplyPresetAdjacent('all_cantilever')}
                      className="px-2 py-1 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300 transition-colors cursor-pointer"
                    >
                      Açık Cephelere {params.cantileverDepth || 1.2}m Ver
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetAdjacent('all_open')}
                      className="px-2 py-1 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                    >
                      Tümünü Açık Yap
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetAdjacent('clear_cantilever')}
                      className="px-2 py-1 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                    >
                      Çıkmaları Sıfırla
                    </button>
                  </div>
                </div>

                {/* Cephe Kartları Grid'i */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cantileverInfo.facades.map((facade) => {
                    const idx = facade.index;
                    const isAdjacent = facade.isAdjacent;
                    const depth = facade.cantileverDepth;
                    const hasCant = depth > 0;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all shadow-3xs ${
                          isAdjacent
                            ? 'bg-rose-50/40 border-rose-200'
                            : hasCant
                            ? 'bg-white border-emerald-300 ring-1 ring-emerald-200/50'
                            : 'bg-white/80 border-slate-200'
                        }`}
                      >
                        {/* Başlık & Ölçü & Bitişiklik Durumu */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11px] font-black text-slate-800 truncate flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[9px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="truncate">{facade.name}</span>
                            </div>
                            <div className="text-[10px] font-mono font-bold text-slate-500 ml-5.5">
                              Kenar Uzunluğu: <span className="text-slate-800 font-black">{facade.length.toFixed(1)} m</span>
                            </div>
                          </div>

                          {/* Bitişik / Açık Toggle Butonu */}
                          <button
                            type="button"
                            onClick={() => handleToggleFacadeAdjacent(idx)}
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold border transition-all cursor-pointer shrink-0 ${
                              isAdjacent
                                ? 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                            title={isAdjacent ? 'Açık cepheye çevirmek için tıklayın' : 'Komşu parsel sınırı (bitişik) yapmak için tıklayın'}
                          >
                            {isAdjacent ? '🏢 Bitişik Nizam' : '🌳 Açık Cephe'}
                          </button>
                        </div>

                        {/* Duruma Göre Konsol Ayarı */}
                        {isAdjacent ? (
                          <div className="p-2 rounded-lg bg-rose-50 border border-rose-200/80 text-[10px] text-rose-800 space-y-0.5 leading-tight">
                            <div className="font-bold flex items-center gap-1 text-rose-900">
                              <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
                              Komşu Parsel Sınırı (Sağır Duvar)
                            </div>
                            <div className="text-rose-700 text-[9px]">
                              İmar Kanunu Md. 41 uyarınca komşu parsel sınırında konsol çıkma yapılamaz (0.00 m).
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 pt-1 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={hasCant}
                                  onChange={(e) => {
                                    handleUpdateFacadeCantileverDepth(
                                      idx,
                                      e.target.checked ? (params.cantileverDepth || 1.2) : 0
                                    );
                                  }}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                                />
                                <span>Konsol Çıkma</span>
                              </label>

                              {hasCant && (
                                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                                  +{(facade.length * depth).toFixed(1)} m²
                                </span>
                              )}
                            </div>

                            {hasCant ? (
                              <div className="flex items-center gap-1.5">
                                <div className="relative flex-1">
                                  <input
                                    type="number"
                                    step={0.1}
                                    min={0.2}
                                    max={3.0}
                                    value={depth || ''}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                      handleUpdateFacadeCantileverDepth(idx, val);
                                    }}
                                    className="w-full text-xs font-bold font-mono pl-2 pr-7 py-1 rounded border border-emerald-300 bg-white focus:outline-emerald-500"
                                  />
                                  <span className="absolute right-2 top-1 text-[10px] font-bold text-slate-400">m</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {[1.0, 1.2, 1.5].map((d) => (
                                    <button
                                      key={d}
                                      type="button"
                                      onClick={() => handleUpdateFacadeCantileverDepth(idx, d)}
                                      className={`px-1.5 py-1 text-[9px] font-bold rounded border transition-all cursor-pointer ${
                                        Math.abs(depth - d) < 0.05
                                          ? 'bg-emerald-600 text-white border-emerald-700'
                                          : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50'
                                      }`}
                                    >
                                      {d.toFixed(1)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 italic">
                                Bu cephede çıkma yok (Düz bina yüzeyi)
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Çıkma Alanı Etki Analiz Kartı */}
              {singleFloorCantileverDiff > 0 && (
                <div className="p-3 bg-white border border-emerald-200 rounded-xl flex flex-col gap-2 shadow-2xs animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-950 uppercase tracking-wide">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Konsol Çıkma Alan Etki Analizi
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {cantileverInfo.facades.filter(f => f.cantileverDepth > 0).length} Cephede Çıkma Uygulandı
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-medium">Zemin Kat (Taban)</div>
                      <div className="text-xs font-black text-slate-800 font-mono">{activeBaseArea.toFixed(1)} m²</div>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-medium">Normal Kat (Çıkmalı)</div>
                      <div className="text-xs font-black text-emerald-800 font-mono">
                        {upperFloorArea.toFixed(1)} m²
                        <span className="text-[9px] text-emerald-600 block">+{percentIncrease.toFixed(1)}% Artış</span>
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-medium">Tek Katta Çıkma Alanı</div>
                      <div className="text-xs font-black text-amber-700 font-mono">+{singleFloorCantileverDiff.toFixed(1)} m²</div>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-medium">Toplam Çıkma Katkısı</div>
                      <div className="text-xs font-black text-indigo-700 font-mono">
                        +{totalCantileverContribution.toFixed(1)} m²
                        <span className="text-[9px] text-slate-400 block">{upperFloorsCount} Normal Katta</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed italic border-t border-slate-100 pt-1.5">
                    * <strong>Planlı Alanlar İmar Yönetmeliği Md. 41:</strong> Komşu parsel sınırına bitişik sağır cephelerde konsol / tabla çıkması kesinlikle yapılamaz. Çıkmalar sadece parsel içi bahçe mesafesi veya yol cephesi bulunan açık cephelerde geçerlidir.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Interactive Polygon Drawer & Canvas */}
        <div className="p-4 rounded-2xl border border-indigo-200 bg-slate-50/50 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                2D İnteraktif Geometri Çizim Tuvali ({activePoints.length} Köşe / Kenar)
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
              <span>Genişlik: {currentPolyBounds.width}m</span>
              <span>•</span>
              <span>Derinlik: {currentPolyBounds.depth}m</span>
              <span>•</span>
              <span>Çevre: {currentPolyPerimeter}m</span>
            </div>
          </div>

          <InteractiveFootprintCanvas
            points={params.polygonPoints}
            onChangePoints={handlePolygonPointsChange}
            facadeConfigs={params.facadeConfigs}
            onChangeFacadeConfigs={(configs) => onChangeParams({ ...params, facadeConfigs: configs })}
            mainEntranceIndex={params.mainEntranceFacadeIndex || 0}
            onChangeMainEntranceIndex={(idx) =>
              onChangeParams({ ...params, mainEntranceFacadeIndex: idx })
            }
            flatsPerFloor={params.flatsPerFloor || 2}
            theme={theme}
            compact={false}
            roads={params.roads}
            onChangeRoads={(roads) => onChangeParams({ ...params, roads })}
          />
        </div>
      </div>
      )}

      {/* 3. BÖLÜM: BELİRLENEN YAPI KONFİGÜRASYONU ÖZETİ */}
      {(!wizardMode || activeStep === 3) && (
        <div className={`${bgCard} rounded-2xl p-6 border shadow-xs space-y-4 animate-fade-in`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 font-bold">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold ${textTitle}`}>
                  3. İmal Edilecek Yapı Özeti & İmar Parametreleri
                </h2>
                <p className={`text-xs ${textMuted}`}>
                  Önceki adımlarda belirlenen yapı parametreleri özeti. Değiştirmek için doğrudan 2. Adıma dönebilirsiniz.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-100 text-purple-800">
                {newTotalConstructionArea.toLocaleString('tr-TR')} m² Yeni İnşaat
              </span>
              {wizardMode && (
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="px-3 py-1 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="2. Adıma dönerek parametreleri düzenle"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Ölçüleri Düzenle</span>
                </button>
              )}
            </div>
          </div>

          {/* Özet Kartları Izgarası */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Kat Düzeni</span>
              </div>
              <div className="text-xs font-black text-slate-800">
                {params.floorCount || 5} Normal Kat
              </div>
              <div className="text-[10px] text-slate-500">
                {params.hasGroundFloorShop ? '+ 1 Zemin Dükkan' : '+ Zemin Konut'} • {params.basementCount ? `${params.basementCount} Kat Bodrum` : 'Bodrumsuz'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Home className="w-3.5 h-3.5 text-indigo-600" />
                <span>Konut Daireler</span>
              </div>
              <div className="text-xs font-black text-indigo-700">
                {newFlatCount} Daire ({params.roomType || '3+1'})
              </div>
              <div className="text-[10px] text-slate-500">
                Katta {params.flatsPerFloor || 2} daire • {params.floorHeight || 2.9}m kat yüksekliği
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-amber-600" />
                <span>Zemin & Ticari</span>
              </div>
              <div className="text-xs font-black text-amber-700">
                {params.hasGroundFloorShop ? `${params.shopCount || 1} Dükkan` : 'Konut Katı'}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {params.hasGroundFloorShop ? `${params.shopLocation === 'both' ? 'Zemin+Bodrum' : params.shopLocation === 'basement' ? 'Bodrum' : 'Zemin'} • ${params.shopHeight || 3.8}m h • ${params.shopArea || 80}m²` : 'Zeminde konut'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-purple-600" />
                <span>Çatı & Çatı Katı</span>
              </div>
              <div className="text-xs font-black text-purple-700">
                {params.roofType === 'mansard' ? 'Mansart Çatı' : params.roofType === 'flat' ? 'Teras Çatı' : params.roofType === 'duplex' ? 'Çatı Dubleksi' : 'Kırma Çatı'}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {params.roofType !== 'flat' ? (params.roofAtticType === 'independent' ? 'Ayrı Bağımsız Daire' : 'Alt Katla Birleşik') : 'Düz Teras'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-emerald-600" />
                <span>Taban & Konsol</span>
              </div>
              <div className="text-xs font-black text-emerald-700">
                {currentPolyArea.toFixed(1)} m² Oturum
              </div>
              <div className="text-[10px] text-slate-500">
                {params.hasCantilever ? `${params.cantileverDepth || 1.2}m Konsol Çıkma` : 'Konsol Çıkmasız'}
              </div>
            </div>
          </div>
        </div>
      )}

      {(!wizardMode || activeStep === 3) && (
        /* BELEDİYE İMAR TEŞVİKLERİ & TEVHİT KAT / MANSART BONUSU */
        <MunicipalIncentivesPanel
          params={params}
          onChangeParams={onChangeParams}
          theme={theme}
        />
      )}

      {/* 3. BÖLÜM: GÜNCEL YAPI METRAJ BİLGİLERİ */}
      {(!wizardMode || activeStep === 3) && (
        <div className={`${bgCard} rounded-2xl p-6 border shadow-xs space-y-6 animate-fade-in`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base sm:text-lg font-bold ${textTitle}`}>
                3. Güncel Yapı Metraj Bilgileri
              </h2>
              <p className={`text-xs ${textMuted}`}>
                Planlanan güncel projenin bağımsız bölüm adetleri, imalat alanları ve kat yapıları.
              </p>
            </div>
          </div>
        </div>

        {/* Planned Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl border ${innerCardBg} space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                🏠 Konut Bağımsız Bölüm
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                Aktif Proje
              </span>
            </div>
            <div className="pt-1">
              <span className="text-xs text-slate-400 block font-medium">Toplam Planlanan Konut</span>
              <span className="text-2xl font-black text-indigo-700">{newFlatCount} Daire</span>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${innerCardBg} space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                🏪 Dükkan / Ticari Alan
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                Ticari Bağımsız Bölüm
              </span>
            </div>
            <div className="pt-1">
              <span className="text-xs text-slate-400 block font-medium">Toplam Dükkan Sayısı</span>
              <span className="text-2xl font-black text-amber-700">
                {newHasShop ? newShopCount : 0} Adet
              </span>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${innerCardBg} space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                📐 Toplam İnşaat Alanı
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                Brüt Alan
              </span>
            </div>
            <div className="pt-1">
              <span className="text-xs text-slate-400 block font-medium">Toplam Brüt Metraj</span>
              <span className="text-2xl font-black text-blue-700">
                {newTotalConstructionArea.toLocaleString('tr-TR')} m²
              </span>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${innerCardBg} space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                🏢 Yapı Kat Sayısı
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                Düşey Yapı
              </span>
            </div>
            <div className="pt-1">
              <span className="text-xs text-slate-400 block font-medium">Kat Adedi (Zemin Dahil)</span>
              <span className="text-2xl font-black text-purple-700">
                {newFloorCount} Kat
              </span>
            </div>
          </div>
        </div>

        {/* Navigation & Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            ✅ Parsel ve planlanan yeni kütle geometrisi diğer tüm hesaplama ve 3D modelleme sayfalarına otomatik aktarılmıştır.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onNavigateToModel && (
              <button
                type="button"
                onClick={onNavigateToModel}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
              >
                3D Modeli İncele
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proje Künyesi & Maliyet Detaylarına Geç</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Pro Tips & Multi-step Wizard Navigation Panel */}
      {wizardMode && (
        <div className="bg-indigo-600 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md mt-6">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/50 flex items-center justify-center shrink-0 border border-indigo-400">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold">
                {activeStep === 1 && '💡 1. Adım İpucu: Müşteri, Proje ve Dönüşüm Türünü Belirleyin'}
                {activeStep === 2 && '💡 2. Adım İpucu: Proje Ölçülerini Belirleyin & 2D Çizim Yapın'}
                {activeStep === 3 && '💡 3. Adım İpucu: İmar Teşvikleri & Yapı Metrajlarını İnceleyin'}
              </h4>
              <p className="text-xs text-indigo-100 leading-relaxed max-w-3xl">
                {activeStep === 1 && 'Projenizin ismini, adresini, hedeflenen taban oturum alanını m² cinsinden ve kentsel dönüşüm / kat karşılığı gibi sözleşme modelinizi bu adımda tanımlayabilirsiniz.'}
                {activeStep === 2 && '2D Akıllı Çizim Tuvali üzerinde binanızın taban geometrisini poligon veya kenar uzunluklarıyla tasarlayabilir, üst katlar için Konsol Çıkma (çıkma derinliği ve cephesi) ekleyebilirsiniz.'}
                {activeStep === 3 && 'İmal edilecek yapının belediye imar teşviklerini, tevhit / mansart bonuslarını ve hesaplanan güncel metraj tablosunu bu adımda inceleyebilir, ardından Proje Künyesine geçebilirsiniz.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 border-t border-indigo-500/30 sm:border-t-0 pt-3 sm:pt-0">
            {activeStep > 1 && (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep - 1)}
                className="flex-1 sm:flex-none px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all border border-indigo-400"
              >
                ⬅️ Geri Dön
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (activeStep < 3) {
                  setActiveStep(activeStep + 1);
                } else {
                  onNext();
                }
              }}
              className="flex-1 sm:flex-none px-5 py-2 bg-white hover:bg-slate-50 text-indigo-900 rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
            >
              <span>{activeStep === 3 ? 'Proje Künyesine Geç 🚀' : 'İleri Adım ➡️'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
