import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  FileUp,
  FileDown,
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
  BarChart3,
  Palette,
  Car,
  ShieldCheck,
  Flame,
  Droplets,
  Wind,
  Zap,
  Bath,
  Fan,
  ChefHat,
} from 'lucide-react';
import { AC_PRESET_OPTIONS, getAcOptionById } from '../utils/acOptions';
import { ZoningAuditPanel } from './ZoningAuditPanel';
import { calculateCantileverDetails, calculateFlatCount, calculateProject } from '../utils/calculatorEngine';
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
  onOpenTransferModal?: () => void;
  requestedStep?: number;
  onStepChange?: (step: number) => void;
}

export const ProjectSetupTab: React.FC<ProjectSetupTabProps> = ({
  params,
  onChangeParams,
  theme = 'light',
  onNext,
  onNavigateToModel,
  onNavigateToOwners,
  onOpenTransferModal,
  requestedStep,
  onStepChange,
}) => {
  const isGray = theme === 'gray';
  const textTitle = isGray ? 'text-gray-100' : 'text-slate-900';
  const textMuted = isGray ? 'text-gray-400' : 'text-slate-500';
  const bgCard = isGray ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/90 shadow-xs';
  const innerCardBg = isGray ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50/80 border-slate-200/80';
  const inputBg = isGray
    ? 'bg-slate-900 text-gray-100 border-slate-700 focus:border-indigo-500'
    : 'bg-white text-slate-900 border-slate-200 focus:border-indigo-500';

  const inputClass = `w-full text-xs font-bold px-3.5 py-3 rounded-xl border transition-all duration-200 focus:outline-hidden focus:ring-4 ${
    isGray
      ? 'bg-slate-900 text-gray-100 border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/10'
      : 'bg-white text-slate-900 border-slate-200/80 focus:border-indigo-500 focus:ring-indigo-500/10 shadow-2xs'
  }`;

  const inputClassEmerald = `w-full text-xs font-black px-3.5 py-3 rounded-xl border transition-all duration-200 focus:outline-hidden focus:ring-4 ${
    isGray
      ? 'border-emerald-800/80 bg-slate-900 text-emerald-100 focus:border-emerald-500 focus:ring-emerald-500/10'
      : 'border-emerald-300 bg-white text-emerald-950 focus:border-emerald-500 focus:ring-emerald-500/10 shadow-2xs'
  }`;

  const inputClassIndigo = `w-full text-xs font-black px-3.5 py-3 rounded-xl border transition-all duration-200 focus:outline-hidden focus:ring-4 ${
    isGray
      ? 'border-indigo-800/80 bg-slate-900 text-indigo-100 focus:border-indigo-500 focus:ring-indigo-500/10'
      : 'border-indigo-300 bg-white text-indigo-950 focus:border-indigo-500 focus:ring-indigo-500/10 shadow-2xs'
  }`;

  const addressInputRef = useRef<HTMLInputElement>(null);
  const minimalAddressInputRef = useRef<HTMLInputElement>(null);

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
  const [activeStepState, setActiveStepState] = useState<number>(requestedStep || 2);
  const activeStep = requestedStep !== undefined ? requestedStep : activeStepState;

  // Calculate live project results for metrics and feasibility analysis
  const results = useMemo(() => calculateProject(params), [params]);

  // Group flats by floor for visual consistency and layout logic
  const groupedFlats = useMemo(() => {
    const groups: Record<number, any[]> = {};
    params.flats.forEach(flat => {
      const floor = flat.floorNumber ?? 0;
      if (!groups[floor]) groups[floor] = [];
      groups[floor].push(flat);
    });
    // Sort floors from top to bottom (highest floor number first)
    return Object.entries(groups).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [params.flats]);

  const getFlatStyles = (flat: any, isContractor: boolean) => {
    if (isContractor) return 'bg-amber-50 border-amber-300 text-amber-950 shadow-sm ring-1 ring-amber-400/20';
    
    const type = flat.flatType || 'standard';
    const desc = (flat.description || '').toLowerCase();
    const floor = flat.floorNumber ?? 0;

    // Bodrum sığınak gri
    if (desc.includes('sığınak') || desc.includes('depo') || desc.includes('ortak')) {
      return 'bg-slate-200 border-slate-300 text-slate-700';
    }
    
    // Bodrum daire açık mavi
    if (floor < 0) {
      return 'bg-sky-50 border-sky-200 text-sky-800';
    }
    
    // Zemin dükkan mavi
    if (type === 'shop' || (floor === 0 && desc.includes('dükkan'))) {
      return 'bg-blue-100 border-blue-300 text-blue-900 shadow-sm';
    }

    // Dubleks ve Mansart
    if (type === 'duplex') return 'bg-purple-50 border-purple-200 text-purple-900';
    if (type === 'mansard') return 'bg-amber-50 border-amber-200 text-amber-900';
    
    return 'bg-white border-slate-200 text-slate-800 hover:border-indigo-300';
  };

  const setActiveStep = (step: number) => {
    setActiveStepState(step);
    if (onStepChange) onStepChange(step);
  };

  useEffect(() => {
    if (requestedStep !== undefined) {
      setActiveStepState(requestedStep);
    }
  }, [requestedStep]);
  const [activeScenario, setActiveScenario] = useState<number | null>(null);
  const [showExistingForm, setShowExistingForm] = useState<boolean>(false);
  const [showManualDataSection, setShowManualDataSection] = useState<boolean>(true);

  const handleLoadScenario = (scenarioId: number) => {
    let scenarioParams: Partial<ProjectParams> = {};
    if (scenarioId === 1) {
      // Standart Apartman (Tek Yapı)
      scenarioParams = {
        projectAddress: 'İstanbul, Kadıköy, 124 Ada 5 Parsel (Huzur Apartmanı)',
        landArea: 400,
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
        landArea: 1200,
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
        landArea: 250,
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

  // New building planned metrics using central calculator engine
  const calcResult = useMemo(() => calculateProject(params), [params]);
  const newFloorCount = params.floorCount || 5;
  const newFlatsPerFloor = params.flatsPerFloor || 2;
  const newHasShop = !!params.hasGroundFloorShop;
  const newShopCount = params.shopCount || (newHasShop ? 1 : 0);
  const newShopLocation = params.shopLocation || 'ground';
  const newShopArea = params.shopArea || 80;
  const resFloors = newHasShop ? Math.max(1, newFloorCount - 1) : newFloorCount;
  const newFlatCount = calcResult.normalFlats !== undefined ? calcResult.normalFlats : (params.flatCount || (resFloors * newFlatsPerFloor));
  const newTotalUnits = calcResult.flatCount;
  const newApartmentSize = params.apartmentSize || 90;
  const newBaseArea = calcResult.baseArea || params.baseBuildArea || 140;
  const newTotalConstructionArea = Math.round(calcResult.totalArea);

  // Konsol Çıkma Alan Etkisi Hesabı (N-Cephe, L-Tipi ve Bitişik Nizam Uyumlu)
  const footprintCalc = calculateFootprint(params.footprintInputMode, params);
  const activeBaseArea = calcResult.baseArea || footprintCalc.area || 100;
  const cantileverInfo = calculateCantileverDetails(params, activeBaseArea, footprintCalc);
  const upperFloorArea = calcResult.upperFloorArea || cantileverInfo.upperFloorArea;
  const singleFloorCantileverDiff = cantileverInfo.singleFloorDiff;
  const percentIncrease = activeBaseArea > 0 ? (singleFloorCantileverDiff / activeBaseArea) * 100 : 0;
  const upperFloorsCount = Math.max(0, (params.floorCount || 5) - 1);
  const totalCantileverContribution = cantileverInfo.totalCantileverArea;

  // Calculation difference (New vs Old)
  const flatDifference = newFlatCount - totalExistingFlats;
  const shopDifference = (newHasShop ? newShopCount : 0) - totalExistingShops;
  const totalUnitDifference = newTotalUnits - totalExistingUnits;

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

  useEffect(() => {
    if (params.footprintInputMode === 'polygonDraw' && currentPolyArea > 0) {
      const rounded = Math.round(currentPolyArea * 10) / 10;
      if (Math.abs((params.baseBuildArea || 0) - rounded) > 0.5) {
        onChangeParams({
          ...params,
          baseBuildArea: rounded,
        });
      }
    }
  }, [currentPolyArea, params.footprintInputMode]);

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

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenTransferModal && (
              <button
                type="button"
                onClick={onOpenTransferModal}
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Projeyi Bilgisayardan İçe Aktar veya Dışa Aktar (JSON)"
              >
                <FileUp className="w-4 h-4 text-indigo-600" />
                <span>İçe / Dışa Aktar</span>
              </button>
            )}
          </div>
        </div>

        {/* Interactive Mode & Step Selector */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mt-6 pt-5 border-t border-slate-100">
          <div className="flex-1 max-w-2xl mx-auto md:mx-0">
            <div className="flex items-center justify-between gap-1">
              {[
                { step: 1, label: 'Müşteri, Proje & Tür', icon: Home },
                { step: 2, label: 'Ölçüler, 2D Çizim & Cepheler', icon: Ruler },
                { step: 3, label: 'Harç, Özet & Seçenekler', icon: Sparkles },
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  👤 Müşteri / Proje Adı
                </label>
                <input
                  id="projectNameInput"
                  type="text"
                  value={params.projectName || ''}
                  onChange={(e) => onChangeParams({ ...params, projectName: e.target.value })}
                  placeholder="Örn: Alpaslan Beyoğlu Apartmanı Kentsel Dönüşüm Projesi"
                  className={inputClass}
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Teklif çıktılarında ve sözleşme metinlerinde proje başlığı olarak görünecektir.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  📍 Yapı / Proje Adresi (Ada & Parsel)
                </label>
                <div className="relative">
                  <input
                    ref={addressInputRef}
                    id="projectAddressInput"
                    type="text"
                    value={params.projectAddress || ''}
                    onChange={(e) => onChangeParams({ ...params, projectAddress: e.target.value })}
                    placeholder="Örn: İstanbul, Kadıköy, Göztepe Mah. 1024 Ada 15 Parsel"
                    className={inputClass}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  İl, ilçe, mahalle ve ada/parsel bilgisini yazabilirsiniz.
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-1.5">
                <label className="block text-xs font-bold text-emerald-950 flex items-center justify-between">
                  <span>📐 Arsa / Parsel Alanı (m²)</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded">
                    Temel Giriş
                  </span>
                </label>
                <div className="relative flex items-center">
                  <input
                    id="projectLandAreaInput"
                    type="number"
                    min="10"
                    value={params.landArea || ''}
                    onChange={(e) => {
                      const newLandArea = Math.max(0, parseFloat(e.target.value) || 0);
                      onChangeParams({ ...params, landArea: newLandArea });
                    }}
                    placeholder="Örn: 350"
                    className={inputClassEmerald}
                  />
                  <span className="absolute right-3.5 text-xs font-black text-emerald-600 font-mono">m²</span>
                </div>
                <span className="text-[10px] text-emerald-700 block font-medium">
                  Tüm modüllerdeki (TAKS, KAKS, Arsa Payı) hesaplamaları doğrudan günceller.
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-1.5">
                <label className="block text-xs font-bold text-indigo-950 flex items-center justify-between">
                  <span>🏗️ Taban Oturumu (m²)</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-extrabold px-1.5 py-0.5 rounded">
                    Zemin Kat
                  </span>
                </label>
                <div className="relative flex items-center">
                  <input
                    id="projectBaseAreaInput"
                    type="number"
                    min="10"
                    value={params.baseBuildArea || ''}
                    onChange={(e) => onChangeParams({ ...params, baseBuildArea: Math.max(0, parseFloat(e.target.value) || 0) })}
                    placeholder="Örn: 140"
                    className={inputClassIndigo}
                  />
                  <span className="absolute right-3.5 text-xs font-black text-indigo-600 font-mono">m²</span>
                </div>
                <span className="text-[10px] text-indigo-700 block font-medium">
                  Binanın arsa üzerine oturacağı net zemin alanı (m²).
                </span>
              </div>
            </div>

            {/* Live TAKS & KAKS Hızlı İmar Oranları Çubuğu */}
            {params.landArea && params.landArea > 0 ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600">TAKS (Taban Oturum Oranı):</span>
                    <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                      %{((params.baseBuildArea / params.landArea) * 100).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600">Tahmini KAKS (Emsal):</span>
                    <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                      {(((params.baseBuildArea * (params.floorCount || 5)) / params.landArea)).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-500 mr-1">Hızlı TAKS Seçin:</span>
                  {[25, 30, 35, 40, 50].map((taks) => {
                    const calculatedBase = Math.round((params.landArea! * taks) / 100);
                    const isActive = Math.abs((params.baseBuildArea / params.landArea!) * 100 - taks) < 1;
                    return (
                      <button
                        key={taks}
                        type="button"
                        onClick={() => onChangeParams({ ...params, baseBuildArea: calculatedBase })}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold font-mono transition-all cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        %{taks} ({calculatedBase}m²)
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Location Summary Card */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  Proje Adresi & Konum Bilgisi
                </h3>
              </div>
              <div className="w-full rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4 border border-slate-200/80 flex flex-col sm:flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
                  <MapPin className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="text-xs font-extrabold text-slate-800 truncate">
                    {params.projectAddress || 'Proje Adresi Tanımlanmadı'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Arsa Alanı: <span className="font-semibold text-slate-700">{params.landArea} m²</span> | Taban Alanı: <span className="font-semibold text-slate-700">{results.baseArea.toFixed(1)} m²</span>
                  </p>
                </div>
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
                2. Proje Ölçüleri & Yapı Parametreleri
              </h2>
              <p className={`text-xs ${textMuted}`}>
                Müşteri, mevcut binalar ve planlanan kat/daire/yapı parametrelerini buradan doğrudan yönetebilirsiniz.
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
                Z+{(params.floorCount || 5) - 1} Kat • {newFlatCount} Daire {newHasShop ? `• ${newShopCount} Dükkan` : ''} • {newTotalConstructionArea.toLocaleString('tr-TR')} m² Brüt
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    <div className="relative">
                      <input
                        ref={minimalAddressInputRef}
                        id="minimalProjectAddressInput"
                        type="text"
                        value={params.projectAddress || ''}
                        onChange={(e) => onChangeParams({ ...params, projectAddress: e.target.value })}
                        placeholder="Örn: Kadıköy, 124 Ada 5 Parsel"
                        className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${inputBg}`}
                      />
                    </div>
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
                              Z+{(b.floorCount || 1) - 1} Kat • {b.flatCount} Daire ({b.avgFlatArea || 80} m²)
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
                      🏢 Bina Kat Sayısı (Z+{(params.floorCount || 5) - 1})
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
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Zemin + {(params.floorCount || 5) - 1} Normal Kat</span>
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

                  {/* Asansör Sayısı */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      🛗 Asansör Adedi
                    </label>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => onChangeParams({ ...params, elevatorCount: cnt })}
                          className={`flex-1 py-1 text-[11px] font-bold rounded border transition-all ${
                            (params.elevatorCount ?? 1) === cnt
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Kova sayısı</span>
                  </div>

                  {/* Balkon Derinliği */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      🖼️ Balkon Derinliği (m)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="3.0"
                      value={params.balconyDepth ?? 1.4}
                      onChange={(e) => onChangeParams({ ...params, balconyDepth: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className={`w-full text-xs font-bold font-mono px-2.5 py-1.5 rounded-lg border ${inputBg}`}
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Daire içi balkon</span>
                  </div>

                  {/* Yapı Sınıfı & Segment */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      🏛️ Yapı Sınıfı & Kalite
                    </label>
                    <select
                      value={params.buildingType || 'standard'}
                      onChange={(e) => onChangeParams({ ...params, buildingType: e.target.value as any })}
                      className="w-full text-[11px] font-bold px-2 py-1.5 rounded-lg border bg-white border-slate-200 text-slate-800"
                    >
                      <option value="standard">Standart / Ekonomik (1. Sınıf)</option>
                      <option value="luxury">Lüks / A+ Segment (Akıllı Ev)</option>
                      <option value="commercial">Ticari / Ofis Odaklı Karma</option>
                    </select>
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Maliyet & malzeme çarpanı</span>
                  </div>

                  {/* Yapım Modeli */}
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                      🤝 Yapım Modeli
                    </label>
                    <select
                      value={params.projectModel || 'cash'}
                      onChange={(e) => onChangeParams({ ...params, projectModel: e.target.value as any })}
                      className="w-full text-[11px] font-bold px-2 py-1.5 rounded-lg border bg-emerald-50/50 border-emerald-300 text-emerald-950"
                    >
                      <option value="cash">Nakit Ödemeli / Müteahhit</option>
                      <option value="contractorShare">Kat Karşılığı Paylaşımlı</option>
                    </select>
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Sözleşme modeli</span>
                  </div>

                  {/* Destek Modeli */}
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-800 mb-1">
                      🎁 Destek Modeli
                    </label>
                    <select
                      value={params.transformationStatus || 'currentSupport'}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        const updatedFlats = params.flats.map((f) => ({ ...f, useTransformationCredit: val !== 'none' }));
                        onChangeParams({ ...params, transformationStatus: val, flats: updatedFlats });
                      }}
                      className="w-full text-[11px] font-bold px-2 py-1.5 rounded-lg border bg-indigo-50/50 border-indigo-300 text-indigo-950"
                    >
                      <option value="currentSupport">2025/2026 Mevcut (Hibe+Kredi)</option>
                      <option value="futureSupport2027">2027 Projeksiyon (180 Ay Vade)</option>
                      <option value="none">Desteksiz (Öz Kaynak)</option>
                    </select>
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Devlet teşvik modeli</span>
                  </div>

                  {/* Proje Teslim Süresi */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ⏱️ Proje Teslim Süresi
                    </label>
                    <div className="flex items-center gap-1">
                      <select
                        value={params.durationOption || 'auto'}
                        onChange={(e) => onChangeParams({ ...params, durationOption: e.target.value as any })}
                        className="flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg border bg-white border-slate-200"
                      >
                        <option value="auto">Otomatik ({results.finalMonths} Ay)</option>
                        <option value="manual">Manuel Gir</option>
                        <option value="hide">Gizle</option>
                      </select>
                      {params.durationOption === 'manual' && (
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={params.manualMonths || 18}
                          onChange={(e) => onChangeParams({ ...params, manualMonths: Math.max(1, parseFloat(e.target.value) || 1) })}
                          className="w-14 text-xs font-mono font-bold px-1.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Tahmini yapım süresi</span>
                  </div>

                  {/* Birim m² Maliyet Fiyatı (Daire) */}
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-800 mb-1">
                      💰 Daire Birim m² (TL)
                    </label>
                    <input
                      type="number"
                      value={params.manualFlatUnitPrice || ''}
                      onChange={(e) => onChangeParams({ ...params, manualFlatUnitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                      placeholder={`${results.grossCostPerSqM ? results.grossCostPerSqM.toFixed(0) : ''} TL`}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-white text-indigo-900"
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Opsiyonel birim teklif</span>
                  </div>

                  {/* Birim m² Maliyet Fiyatı (Dükkan) */}
                  <div>
                    <label className="block text-[11px] font-bold text-amber-800 mb-1">
                      🏬 Dükkan Birim m² (TL)
                    </label>
                    <input
                      type="number"
                      value={params.manualShopUnitPrice || ''}
                      onChange={(e) => onChangeParams({ ...params, manualShopUnitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                      placeholder={`${results.grossCostPerSqM ? results.grossCostPerSqM.toFixed(0) : ''} TL`}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border border-amber-200 bg-white text-amber-900"
                      disabled={!params.hasGroundFloorShop}
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Ticari teklif</span>
                  </div>

                  {/* Toplam Bağımsız Bölüm (Otomatik) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      🏢 Toplam Bağımsız Bölüm
                    </label>
                    <div className="w-full text-xs font-black font-mono px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 flex items-center justify-between">
                      <span>{calculateFlatCount(params)} Bölüm</span>
                      <span className="text-[10px] text-emerald-600 font-sans">
                        {newHasShop ? `${resFloors * newFlatsPerFloor} Daire + ${newShopCount} Dükkan` : `${resFloors * newFlatsPerFloor} Daire`}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Hesaplanan tüm bağımsız bölümler</span>
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
                      <div className="space-y-2">
                        <select
                          value={params.basementPurpose || 'shelter_depot'}
                          onChange={(e) => onChangeParams({ ...params, basementPurpose: e.target.value })}
                          className="w-full text-[11px] font-semibold px-2 py-1 rounded border bg-white border-slate-200"
                        >
                          <option value="shelter_depot">🛡️ Sığınak & Depo</option>
                          <option value="parking">🚗 Kapalı Otopark</option>
                          <option value="shop">🛍️ Dükkan Deposu</option>
                          <option value="commercial_shop">🏪 Bodrum Kat İşyeri / Ticari Dükkan</option>
                        </select>
                        {params.basementPurpose === 'commercial_shop' && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                            <span className="text-[10px] font-bold text-slate-700">İşyeri Adedi:</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={1}
                                max={12}
                                value={params.basementShopCount || 1}
                                onChange={(e) => onChangeParams({ ...params, basementShopCount: parseInt(e.target.value) || 1 })}
                                className="w-12 text-[11px] font-bold font-mono px-1.5 py-0.5 rounded border border-indigo-300 bg-white"
                              />
                              <span className="text-[10px] text-indigo-700 font-bold">Adet</span>
                            </div>
                          </div>
                        )}
                      </div>
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
                Z+{(params.floorCount || 5) - 1} Kat Yapısı
              </div>
              <div className="text-[10px] text-slate-500">
                1 Zemin ({params.hasGroundFloorShop ? 'Dükkan' : 'Konut'}) + {(params.floorCount || 5) - 1} Normal Kat • {params.basementCount ? `${params.basementCount} Kat Bodrum` : 'Bodrumsuz'}
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

          {/* MÜTEAHHİT KAT KARŞILIĞI VE FİNANSAL FİZİBİLİTE BÖLÜMÜ */}
          {params.projectModel === 'contractorShare' && (
            <div className="pt-4 border-t border-slate-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-950">Kat Karşılığı Müteahhit Paylaşım Ayarları</h3>
                    <p className="text-xs text-amber-800">Oran belirleyebilir veya daireleri doğrudan listede müteahhide atayabilirsiniz.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-900">Müteahhit Oranı:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={params.contractorShareRate ?? 50}
                    onChange={(e) => onChangeParams({ ...params, contractorShareRate: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
                    className="w-16 text-xs font-bold font-mono px-2 py-1 rounded-lg border border-amber-300 bg-white text-amber-950 text-center"
                  />
                  <span className="text-xs font-bold text-amber-900">%</span>
                </div>
              </div>

              {/* Daire ve Dükkan Satış Fiyatları & Paylaşım Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>Bağımsız Bölüm Paylaşımı & Tahmini Satış Fiyatları</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">Müteahhit payı olarak seçilen daireler renklendirilir</span>
                </div>

                <div className="space-y-6">
                  {groupedFlats.map(([floor, floorFlats]) => (
                    <div key={floor} className="space-y-2.5">
                      <div className="flex items-center gap-3 px-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {Number(floor) === 0 ? 'Zemin Kat' : Number(floor) > 0 ? `${floor}. Kat` : `${Math.abs(Number(floor))}. Bodrum`}
                        </span>
                        <div className="h-px flex-1 bg-slate-200/80"></div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{floorFlats.length} Bağımsız Bölüm</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {floorFlats.map((flat) => {
                          const isContractor = (params.contractorFlatIds || []).includes(flat.id);
                          const styles = getFlatStyles(flat, isContractor);
                          return (
                            <div
                              key={flat.id}
                              className={`p-3 rounded-2xl border transition-all duration-300 space-y-2 text-xs relative overflow-hidden group ${styles}`}
                            >
                              <div className="flex items-center justify-between font-bold relative z-10">
                                <span className="truncate pr-1">{flat.name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentIds = params.contractorFlatIds || [];
                                    const newIds = isContractor
                                      ? currentIds.filter((id) => id !== flat.id)
                                      : [...currentIds, flat.id];
                                    onChangeParams({ ...params, contractorFlatIds: newIds });
                                  }}
                                  className={`px-1.5 py-0.5 text-[9px] font-black rounded-lg cursor-pointer shadow-sm transition-transform active:scale-90 shrink-0 ${
                                    isContractor
                                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                  }`}
                                >
                                  {isContractor ? 'MÜTEAHHİT' : 'SAHİBİ'}
                                </button>
                              </div>
                              
                              <div className="text-[10px] opacity-70 flex items-center justify-between relative z-10">
                                <span className="flex items-center gap-1 font-medium">
                                  {flat.flatType === 'shop' ? <Store className="w-3 h-3" /> : <Home className="w-3 h-3" />}
                                  {flat.description || flat.flatType || 'Daire'}
                                </span>
                                <span className="font-bold">{flat.area} m²</span>
                              </div>
                              
                              <div className="pt-2 border-t border-black/5 relative z-10">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[9px] font-bold opacity-60 uppercase tracking-tighter">Satış Değeri</label>
                                  <span className="text-[9px] font-black text-indigo-600">TL</span>
                                </div>
                                <input
                                  type="number"
                                  value={flat.salePrice || ''}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const updatedFlats = params.flats.map((f) => (f.id === flat.id ? { ...f, salePrice: val } : f));
                                    onChangeParams({ ...params, flats: updatedFlats });
                                  }}
                                  placeholder="0"
                                  className="w-full text-[11px] font-mono font-bold px-2 py-1 rounded-lg border border-slate-200 bg-white/70 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all"
                                />
                              </div>
                              
                              {/* Background Pattern for specific types */}
                              {flat.flatType === 'shop' && (
                                <div className="absolute -right-2 -bottom-2 opacity-[0.03] rotate-12">
                                  <Store className="w-12 h-12" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CANLI HESAPLAMA METRİK KARTLARI (Birim Satış Maliyeti, Net İnşaat, Genel Bedel, Teslim Süresi) */}
          <div className="pt-5 border-t border-slate-100 space-y-4 animate-fade-in">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Finansal Özet & Maliyet Metrikleri (Bento Grid)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Bento Hero Card: Tahmini Genel Proje Bedeli + Tahmini Teslim Süresi */}
              <div className="lg:col-span-2 md:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/[0.015] border-2 border-amber-300 flex flex-col justify-between shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-amber-200/40 pb-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">Tahmini Genel Proje Bedeli</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-950 font-mono tracking-tight leading-none pt-1">
                      {results.grandTotal ? `${results.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL` : 'Hesaplanıyor...'}
                    </div>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-300/60 px-3 py-1.5 rounded-xl text-center shrink-0">
                    <span className="text-[9px] font-bold text-amber-800 uppercase block tracking-wider leading-none mb-1">Tahmini Süre</span>
                    <span className="text-sm font-black text-amber-950 font-mono leading-none">{results.finalMonths} Ay</span>
                  </div>
                </div>
                <div className="text-[10.5px] text-amber-700/80 leading-relaxed font-medium">
                  Yapı yaklaşık inşaat maliyeti, resmi belediye harçları, otopark payı ve %15 genel yüklenici kârı dahil tüm bütçeyi kapsar.
                </div>
              </div>

              {/* Bento Card 2: Birim Satış / İnşaat Maliyeti */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors duration-200 flex flex-col justify-between shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 block">Birim Metrekare Maliyeti</span>
                  <div className="text-lg font-black text-slate-800 font-mono tracking-tight pt-1">
                    {results.grossCostPerSqM ? `${results.grossCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL / m²` : 'Hesaplanıyor...'}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 leading-normal border-t border-slate-100 pt-2.5 mt-3">
                  Brüt inşaat alanı üzerinden hesaplanan resmi m² imalat birim maliyeti.
                </div>
              </div>

              {/* Bento Card 3: Net İnşaat Yapım Maliyeti */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors duration-200 flex flex-col justify-between shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block">Net Yapım Maliyet Alt Toplamı</span>
                  <div className="text-lg font-black text-slate-800 font-mono tracking-tight pt-1">
                    {results.subTotalCost ? `${results.subTotalCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL` : 'Hesaplanıyor...'}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 leading-normal border-t border-slate-100 pt-2.5 mt-3">
                  Sözleşme kapsamındaki kaba karkas ve ince yapı imalat işleri alt toplamı.
                </div>
              </div>
            </div>
          </div>

          {/* OTOPARK HARCI HESAPLAMA VE MEVZUAT TARAMA MODÜLÜ */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                    Otopark Harcı Hesaplama Modülü
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      Otopark Yönetmeliği (2021)
                    </span>
                  </h3>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Arsa payı, yapı yaklaşık maliyeti, bölgesel katsayı ve kentsel dönüşüm %75 yasal indirimiyle mevzuata uygun harç analizi yapın.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-900 whitespace-nowrap">Harcın Teklife Etkisi:</span>
                <select
                  value={params.parkingFeeMode || 'excluded'}
                  onChange={(e) => onChangeParams({ ...params, parkingFeeMode: e.target.value as any })}
                  className="text-xs font-black px-3.5 py-2.5 rounded-xl border border-blue-300 bg-white text-blue-950 transition-all duration-200 outline-hidden focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="none">Hesaplamayı Kapat</option>
                  <option value="excluded">Teklife Hariç (İşveren Öder - Bilgi Amaçlı Hesapla)</option>
                  <option value="included">Teklife Dahil Et (Müteahhit Öder)</option>
                </select>
              </div>
            </div>

            {params.parkingFeeMode !== 'none' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 rounded-xl border border-slate-200 bg-slate-50/50 animate-fade-in">
                {/* Sol Taraf: Parametre Girdileri */}
                <div className="lg:col-span-6 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Harcı Etkileyen Mevzuat Parametreleri</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">Yapılan Otopark Sayısı (Adet)</label>
                      <input
                        type="number"
                        min="0"
                        value={params.providedParkingSpaces !== undefined ? params.providedParkingSpaces : 0}
                        onChange={(e) => onChangeParams({ ...params, providedParkingSpaces: Math.max(0, parseInt(e.target.value) || 0) })}
                        placeholder="Yapılan otopark sayısı"
                        className="w-full text-xs font-black font-mono px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 shadow-2xs"
                      />
                      <span className="text-[10px] text-slate-500 block leading-tight">Parselde yapılan otopark adedi zorunlu miktarı düşürür.</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">Emlak Vergisi Arsa m² Değeri (A)</label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          value={params.parkingLandTaxValue !== undefined ? params.parkingLandTaxValue : 12000}
                          onChange={(e) => onChangeParams({ ...params, parkingLandTaxValue: Math.max(0, parseFloat(e.target.value) || 0) })}
                          placeholder="Emlak vergisi değeri"
                          className="w-full text-xs font-black font-mono pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 shadow-2xs"
                        />
                        <span className="absolute right-3.5 text-xs font-black text-slate-400 font-mono">TL</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block leading-tight">Belediye Emlak Vergisi arsa rayiç m² bedelidir.</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">Yapı Yaklaşık Birim Maliyeti (B)</label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          value={params.parkingBuildingCostValue !== undefined ? params.parkingBuildingCostValue : 9000}
                          onChange={(e) => onChangeParams({ ...params, parkingBuildingCostValue: Math.max(0, parseFloat(e.target.value) || 0) })}
                          placeholder="Maliye birim değeri"
                          className="w-full text-xs font-black font-mono pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 shadow-2xs"
                        />
                        <span className="absolute right-3.5 text-xs font-black text-slate-400 font-mono">TL</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block leading-tight">Bakanlık tebliğindeki otopark birim yapı bedelidir.</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">Belediye Bölge Katsayısı (Y)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="60"
                          max="100"
                          step="5"
                          value={params.parkingRegionalRatio !== undefined ? params.parkingRegionalRatio : 80}
                          onChange={(e) => onChangeParams({ ...params, parkingRegionalRatio: parseInt(e.target.value) })}
                          className="flex-1 accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                        />
                        <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md min-w-[48px] text-center font-mono">% {params.parkingRegionalRatio !== undefined ? params.parkingRegionalRatio : 80}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block leading-tight">Belediye meclis kararı bölgesel katsayısıdır (%60 - %100).</span>
                    </div>
                  </div>
                </div>

                {/* Sağ Taraf: Canlı Hesaplama Sonuçları ve Mevzuat Analiz Özet Ekranı */}
                <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-4 space-y-4 flex flex-col justify-between shadow-xs">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <span>Mevzuat Özet & Harç Sonucu</span>
                      {results.parkingFeeIsKentselDiscount && (
                        <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          %75 Yasal İndirim Aktif
                        </span>
                      )}
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Yasal Zorunluluk</span>
                        <div className="text-xs font-black text-slate-800 font-mono">
                          {results.parkingRequiredSpaces?.toLocaleString('tr-TR')} Araç
                        </div>
                        <span className="text-[8px] text-slate-500 block leading-none">M² bazlı yasal adet</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200/80 space-y-0.5">
                        <span className="text-[9px] font-bold text-blue-700 uppercase tracking-wide">Ödenecek Eksik Araç</span>
                        <div className="text-xs font-black text-blue-950 font-mono">
                          {results.parkingDeficientSpaces?.toLocaleString('tr-TR')} Araç
                        </div>
                        <span className="text-[8px] text-blue-600 font-medium block leading-none">
                          {params.providedParkingSpaces ? `(${params.providedParkingSpaces} yapıldı)` : 'Harca tabi toplam'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">1 Araç Birim Bedeli</span>
                        <div className="text-xs font-black text-slate-800 font-mono">
                          {results.parkingBirimBedeli?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                        </div>
                        <span className="text-[8px] text-slate-500 block leading-none">Tek 1 araçlık yasal harç</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200/80 space-y-0.5">
                        <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-wide">Daire Başı Harç Payı</span>
                        <div className="text-xs font-black text-indigo-950 font-mono">
                          {results.parkingFeePerFlat?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                        </div>
                        <span className="text-[8px] text-indigo-600 font-medium block leading-none">Daire başına düşen pay</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Toplam Ödenecek Otopark Harcı:</span>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {results.parkingDeficientSpaces?.toLocaleString('tr-TR')} Araç İçin
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-slate-900 font-mono">
                          {results.parkingFeeActual?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                        </span>
                        <span className="text-xs font-bold text-indigo-600">
                          (Daire Başı: {results.parkingFeePerFlat?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL)
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {results.parkingDeficientSpaces} Araç × {results.parkingBirimBedeli?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL {results.parkingFeeIsKentselDiscount ? '(%75 kentsel indirimli)' : ''}
                      </span>
                    </div>
                    <div className="shrink-0">
                      {params.parkingFeeMode === 'included' ? (
                        <div className="text-left sm:text-right">
                          <span className="inline-block text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg shadow-2xs">
                            🟢 TEKLİFE DAHİL EDİLDİ
                          </span>
                          <span className="block text-[9px] text-slate-500 mt-1">Müteahhit maliyetine dahil.</span>
                        </div>
                      ) : (
                        <div className="text-left sm:text-right">
                          <span className="inline-block text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-lg shadow-2xs">
                            🟡 TEKLİF HARİCİ (İŞVEREN ÖDER)
                          </span>
                          <span className="block text-[9px] text-slate-500 mt-1">Malikler/işveren belediyeye öder.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* İNOVATİF VE KONFORLU SEÇENEKLER MODÜLÜ */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                    Teklife İnovatif ve Konfor Seçenekleri Ekle
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      Canlı 2026 Maliyetleri
                    </span>
                  </h3>
                  <p className="text-xs text-purple-800 leading-relaxed">
                    Sözleşmeye değer katan, satış kabiliyetini ve konforu artıran inovatif seçenekleri seçerek doğrudan müteahhit maliyet bütçesine dahil edin.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Option 1: Yerden Isıtma */}
              <div className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${params.hasUnderfloorHeating ? 'border-purple-300 bg-purple-50/20 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${params.hasUnderfloorHeating ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Flame className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">Yerden Isıtma Sistemi (Sulu)</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!params.hasUnderfloorHeating}
                        onChange={(e) => onChangeParams({ ...params, hasUnderfloorHeating: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Petekli (radyatörlü) ısıtma yerine homojen ısı dağılımı ve <strong>%15-20 yakıt tasarrufu</strong> sağlayan, odalarda duvar payı kazandıran lüks sulu yerden ısıtma sistemidir. Toz kalkmasını önlediği için alerji dostudur.
                  </p>
                  
                  <div className="text-[11px] text-slate-500 bg-slate-100/60 p-2.5 rounded-lg border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-700 block">Mevzuat & Canlı Piyasa Bilgisi:</span>
                    <ul className="list-disc pl-3.5 space-y-0.5">
                      <li>Metrekare başına malzeme ve işçilik dahil güncel maliyet: <strong>750 TL/m²</strong>.</li>
                      <li>Hesaplanan konut alanı: <strong>{Math.max(0, results.totalArea - (params.hasGroundFloorShop ? activeBaseArea : 0)).toLocaleString('tr-TR')} m²</strong>.</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Ekstra İmalat Bedeli</span>
                  <div className="text-sm font-black text-slate-900 font-mono">
                    {params.hasUnderfloorHeating ? `${results.underfloorHeatingCost?.toLocaleString('tr-TR')} TL` : 'Pasif'}
                  </div>
                </div>
              </div>

              {/* Option 2: Bina Tipi Su Arıtma */}
              <div className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${params.hasWaterFiltration ? 'border-purple-300 bg-purple-50/20 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${params.hasWaterFiltration ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Droplets className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">Bina Girişi Merkezi Su Arıtma</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!params.hasWaterFiltration}
                        onChange={(e) => onChangeParams({ ...params, hasWaterFiltration: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Dairelere giren tüm suyu şebeke girişinde tortu, klor, kireç ve ağır metallerden arındıran endüstriyel çok kademeli merkezi filtrasyon sistemidir. Beyaz eşyaların ömrünü uzatır ve her musluktan içilebilir/temiz su akıtır.
                  </p>
                  
                  <div className="text-[11px] text-slate-500 bg-slate-100/60 p-2.5 rounded-lg border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-700 block">Mevzuat & Canlı Piyasa Bilgisi:</span>
                    <ul className="list-disc pl-3.5 space-y-0.5">
                      <li>Merkezi aktif karbon / sediment filtrasyon sistemi: <strong>150.000 TL taban</strong> + daire başı <strong>5.000 TL</strong> kartuşlama.</li>
                      <li>Bireysel arıtıcı ve damacana bağımlılığını tamamen ortadan kaldırır.</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Ekstra İmalat Bedeli</span>
                  <div className="text-sm font-black text-slate-900 font-mono">
                    {params.hasWaterFiltration ? `${results.waterFiltrationCost?.toLocaleString('tr-TR')} TL` : 'Pasif'}
                  </div>
                </div>
              </div>

              {/* Option 3: İklimlendirme ve Klima Sistemleri */}
              <div className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${params.hasAcOption ? 'border-purple-300 bg-purple-50/20 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${params.hasAcOption ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Wind className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">A++ Inverter Klima Paketi</span>
                        <span className="text-[10px] text-purple-700 font-semibold">Salon İklimlendirme & Konfor</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!params.hasAcOption}
                        onChange={(e) => onChangeParams({ ...params, hasAcOption: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Yaz ve kış 4 mevsim bağımsız iklimlendirme sağlayan, <strong>%40 enerji tasarruflu</strong> Inverter A++ split veya multi klima paketidir. Bakır borulama, drenaj hattı ve montaj işçiliği dahildir.
                  </p>
                  
                  {params.hasAcOption ? (
                    <div className="space-y-2.5 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                          Salon Ölçüsü & BTU Kapasite Seçimi
                        </label>
                        <select
                          value={params.acType || '18k_btu'}
                          onChange={(e) => onChangeParams({ ...params, acType: e.target.value as any })}
                          className="w-full text-xs font-black px-2.5 py-2 rounded-xl border border-purple-200 bg-white text-purple-950 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 shadow-2xs"
                        >
                          {AC_PRESET_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.shortTitle} — {opt.targetArea} ({opt.avgPricePerFlat.toLocaleString('tr-TR')} TL/Daire)
                            </option>
                          ))}
                        </select>
                      </div>

                      {(() => {
                        const currentAc = getAcOptionById(params.acType || '18k_btu');
                        return (
                          <div className="text-[11px] text-slate-600 bg-purple-50/60 p-2.5 rounded-lg border border-purple-100 space-y-1.5">
                            <div className="flex items-center justify-between font-bold text-purple-950">
                              <span>{currentAc.btu}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-200/80 text-purple-900">{currentAc.energyClass}</span>
                            </div>
                            <div className="text-[10px] text-slate-600">
                              <strong>Uygun Alan:</strong> {currentAc.targetArea} ({currentAc.recommendedRoom})
                            </div>
                            <div className="text-[10px] text-slate-500 border-t border-purple-100/80 pt-1">
                              {currentAc.description}
                            </div>
                            <div className="text-[9.5px] text-purple-800 font-semibold pt-0.5">
                              ✨ Gaz / Çevre: {currentAc.refrigerant} • Montaj Payı: %{currentAc.laborShare}
                            </div>
                          </div>
                        );
                      })()}

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase block">Klima Kapsamı</label>
                          <select
                            value={params.acScope || 'all_units'}
                            onChange={(e) => onChangeParams({ ...params, acScope: e.target.value as any })}
                            className="w-full text-[11px] font-semibold px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                          >
                            <option value="all_units">Tüm Birimler ({results.flatCount} Adet)</option>
                            <option value="residential_only">Sadece Konutlar</option>
                          </select>
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase block">Daire Başı Fiyat (TL)</label>
                          <input
                            type="number"
                            value={params.acCustomPricePerFlat ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? Math.max(0, parseFloat(e.target.value)) : undefined;
                              onChangeParams({ ...params, acCustomPricePerFlat: val });
                            }}
                            placeholder={getAcOptionById(params.acType || '18k_btu').avgPricePerFlat.toString()}
                            className="w-full text-[11px] font-mono font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 bg-slate-100/60 p-2.5 rounded-lg border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-700 block">Piyasa & Salon Standartları:</span>
                      <ul className="list-disc pl-3.5 space-y-0.5">
                        <li>Standart 25-35 m² salonlar için en yaygın: <strong>18.000 BTU/h A++ Inverter (~39.500 TL/Daire)</strong>.</li>
                        <li>12.000 BTU, 24.000 BTU veya Multi-Split seçenekleri teklife entegre edilebilir.</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Ekstra İmalat Bedeli</span>
                    {params.hasAcOption && (
                      <span className="text-[9px] text-purple-700 font-bold">
                        {results.acUnitCount || results.flatCount} Daire × {results.acCostPerFlat?.toLocaleString('tr-TR')} TL
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-black text-slate-900 font-mono">
                    {params.hasAcOption ? `${results.acCostTotal?.toLocaleString('tr-TR')} TL` : 'Pasif'}
                  </div>
                </div>
              </div>

              {/* Option 4: Banyo Duşunda Termostatik Batarya */}
              <div className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${params.hasThermostaticShowerMixer ? 'border-purple-300 bg-purple-50/20 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${params.hasThermostaticShowerMixer ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Bath className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Termostatik Duş Bataryası</span>
                        <span className="text-[10px] text-purple-700 font-semibold">38°C Emniyet Kilitli & Haşlanma Korumalı</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!params.hasThermostaticShowerMixer}
                        onChange={(e) => onChangeParams({ ...params, hasThermostaticShowerMixer: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-semibold">
                    <span>🏠 Yalnızca Konut Daireleri İçindir</span>
                    <span className="text-amber-600 font-normal">(Dükkanlarda duş olmadığından hariç tutulur)</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Banyoda su sıcaklığını milisaniyeler içinde dengeleyen, <strong>38°C çocuk/yaşlı haşlanma emniyet kilitli</strong> ve %30 su tasarruflu lüks termostatik banyo bataryası setidir (Pirinç gövde, duş başlığı seti ve montaj dahil).
                  </p>
                  
                  {params.hasThermostaticShowerMixer ? (
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] text-slate-600 bg-purple-50/60 p-2.5 rounded-lg border border-purple-100 space-y-1">
                        <div className="flex items-center justify-between font-bold text-purple-950">
                          <span>38°C SafeStop Emniyet Kilidi</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-200 text-purple-900 font-bold">%30 Su Tasarrufu</span>
                        </div>
                        <ul className="text-[10px] text-slate-600 space-y-0.5 list-disc pl-3.5 pt-0.5">
                          <li>Ani kombi/basınç dalgalanmasında sıcak su şokunu ve yanmayı sıfırlar.</li>
                          <li>İstenen sıcaklığa anında ulaşarak gereksiz su akıtma süresini önler.</li>
                          {(results.shopUnitsCount || 0) > 0 && (
                            <li className="text-amber-800 font-medium font-mono text-[9px]">
                              {results.shopUnitsCount} adet ticari dükkan duş donanımından muaf tutulmuştur ({results.residentialUnitsCount ?? (results.flatCount - (results.shopUnitsCount || 0))} konut daireye uygulanır).
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">Konut Başı Batarya Seti Bedeli (TL)</label>
                        <input
                          type="number"
                          value={params.thermostaticMixerPricePerFlat ?? ''}
                          onChange={(e) => {
                            const val = e.target.value ? Math.max(0, parseFloat(e.target.value)) : undefined;
                            onChangeParams({ ...params, thermostaticMixerPricePerFlat: val });
                          }}
                          placeholder="6500"
                          className="w-full text-[11px] font-mono font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 bg-slate-100/60 p-2.5 rounded-lg border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-700 block">Konfor & Güvenlik Standardı:</span>
                      <ul className="list-disc pl-3.5 space-y-0.5">
                        <li>Konut başı ortalama maliyet: <strong>6.500 TL</strong> (Malzeme + Montaj).</li>
                        <li>Özellikle çocuklu ve yaşlı aileler için kentsel dönüşümde yüksek ikna edicilik sağlar.</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Ekstra İmalat Bedeli</span>
                    {params.hasThermostaticShowerMixer && (
                      <span className="text-[9px] text-purple-700 font-bold">
                        {results.thermostaticMixerUnits ?? results.residentialUnitsCount ?? results.flatCount} Konut × {(params.thermostaticMixerPricePerFlat || 6500).toLocaleString('tr-TR')} TL
                        {(results.shopUnitsCount || 0) > 0 && <span className="text-amber-700 block text-[8px] font-medium">({results.shopUnitsCount} dükkan hariç)</span>}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-black text-slate-900 font-mono">
                    {params.hasThermostaticShowerMixer ? `${results.thermostaticMixerCost?.toLocaleString('tr-TR')} TL` : 'Pasif'}
                  </div>
                </div>
              </div>

              {/* Option 5: Duş Kabinine Lineer Su Süzgeci (Duş Kanalı) */}
              <div className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${params.hasLinearShowerDrain ? 'border-purple-300 bg-purple-50/20 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${params.hasLinearShowerDrain ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Lineer Duş Süzgeci</span>
                        <span className="text-[10px] text-purple-700 font-semibold">304 Paslanmaz Çelik & Koku Çekvalfli</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!params.hasLinearShowerDrain}
                        onChange={(e) => onChangeParams({ ...params, hasLinearShowerDrain: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-semibold">
                    <span>🏠 Yalnızca Konut Daireleri İçindir</span>
                    <span className="text-amber-600 font-normal">(Dükkanlarda duş olmadığından hariç tutulur)</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Klasik noktasal süzgeç yerine duş zeminine sıfır gömülen, <strong>304 kalite paslanmaz çelik ızgaralı</strong>, çift hazneli koku önleyici çekvalfli ve su yalıtım etekli modern lineer duş kanalıdır.
                  </p>
                  
                  {params.hasLinearShowerDrain ? (
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] text-slate-600 bg-purple-50/60 p-2.5 rounded-lg border border-purple-100 space-y-1">
                        <div className="flex items-center justify-between font-bold text-purple-950">
                          <span>304 Paslanmaz Duş Kanalı</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-200 text-purple-900 font-bold">Koku & Böcek Önleyici</span>
                        </div>
                        <ul className="text-[10px] text-slate-600 space-y-0.5 list-disc pl-3.5 pt-0.5">
                          <li>Hemzemin duş zeminlerinde kesintisiz mimari akış ve hızlı tahliye.</li>
                          <li>Giderden gelen kötü kokuları ve böcekleri %100 kesen mekanik çekvalf.</li>
                          {(results.shopUnitsCount || 0) > 0 && (
                            <li className="text-amber-800 font-medium font-mono text-[9px]">
                              {results.shopUnitsCount} adet ticari dükkan duş donanımından muaf tutulmuştur ({results.residentialUnitsCount ?? (results.flatCount - (results.shopUnitsCount || 0))} konut daireye uygulanır).
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">Konut Başı Duş Kanalı Bedeli (TL)</label>
                        <input
                          type="number"
                          value={params.linearDrainPricePerFlat ?? ''}
                          onChange={(e) => {
                            const val = e.target.value ? Math.max(0, parseFloat(e.target.value)) : undefined;
                            onChangeParams({ ...params, linearDrainPricePerFlat: val });
                          }}
                          placeholder="2800"
                          className="w-full text-[11px] font-mono font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 bg-slate-100/60 p-2.5 rounded-lg border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-700 block">Modern Banyo Mimarisi:</span>
                      <ul className="list-disc pl-3.5 space-y-0.5">
                        <li>Konut başı ortalama maliyet: <strong>2.800 TL</strong> (304 Çelik Kanal + Etekli Yalıtım + Montaj).</li>
                        <li>Duş küveti veya yüksek basamak ihtiyacını ortadan kaldırarak engelsiz ve modern banyo sağlar.</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Ekstra İmalat Bedeli</span>
                    {params.hasLinearShowerDrain && (
                      <span className="text-[9px] text-purple-700 font-bold">
                        {results.linearDrainUnits ?? results.residentialUnitsCount ?? results.flatCount} Konut × {(params.linearDrainPricePerFlat || 2800).toLocaleString('tr-TR')} TL
                        {(results.shopUnitsCount || 0) > 0 && <span className="text-amber-700 block text-[8px] font-medium">({results.shopUnitsCount} dükkan hariç)</span>}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-black text-slate-900 font-mono">
                    {params.hasLinearShowerDrain ? `${results.linearDrainCost?.toLocaleString('tr-TR')} TL` : 'Pasif'}
                  </div>
                </div>
              </div>

              {/* Option 6: Nem Sensörlü Sessiz Banyo Fanı */}
              <div className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${params.hasBathroomHumidityFan ? 'border-purple-300 bg-purple-50/20 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${params.hasBathroomHumidityFan ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Fan className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Nem Sensörlü Banyo Fanı</span>
                        <span className="text-[10px] text-purple-700 font-semibold">Geri Tepme Klapeli & Ultra Sessiz</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!params.hasBathroomHumidityFan}
                        onChange={(e) => onChangeParams({ ...params, hasBathroomHumidityFan: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-semibold">
                    <span>🏠 Yalnızca Konut Daireleri İçindir</span>
                    <span className="text-amber-600 font-normal">(Dükkanlarda banyo/duş olmadığından hariç tutulur)</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Banyodaki nem ve buharı otomatik algılayarak çalışan, <strong>25 dB ultra sessiz motorlu</strong> ve şafttan koku geri dönüşünü sıfırlayan çekvalfli akıllı egzoz fanıdır. Küf, mantar ve rutubet kokusunu tamamen yok eder.
                  </p>

                  {params.hasBathroomHumidityFan ? (
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] text-slate-600 bg-purple-50/60 p-2.5 rounded-lg border border-purple-100 space-y-1">
                        <div className="flex items-center justify-between font-bold text-purple-950">
                          <span>Elektronik Nem Sensörü (Higrostat)</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-200 text-purple-900 font-bold">25 dB Sessiz</span>
                        </div>
                        <ul className="text-[10px] text-slate-600 space-y-0.5 list-disc pl-3.5 pt-0.5">
                          <li>Nem %60 eşiğini aştığında otomatik devreye girer, ortam kuruyunca kapanır.</li>
                          <li>Geri tepme klapesi şafttan diğer katların kokusunun ve haşerenin içeri sızmasını önler.</li>
                          {(results.shopUnitsCount || 0) > 0 && (
                            <li className="text-amber-800 font-medium font-mono text-[9px]">
                              {results.shopUnitsCount} adet dükkan muaf tutulmuştur ({results.residentialUnitsCount ?? (results.flatCount - (results.shopUnitsCount || 0))} konuta uygulanır).
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">Konut Başı Nem Sensörlü Fan Bedeli (TL)</label>
                        <input
                          type="number"
                          value={params.bathroomHumidityFanPricePerFlat ?? ''}
                          onChange={(e) => {
                            const val = e.target.value ? Math.max(0, parseFloat(e.target.value)) : undefined;
                            onChangeParams({ ...params, bathroomHumidityFanPricePerFlat: val });
                          }}
                          placeholder="3200"
                          className="w-full text-[11px] font-mono font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 bg-slate-100/60 p-2.5 rounded-lg border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-700 block">Banyo Havalandırma Konforu:</span>
                      <ul className="list-disc pl-3.5 space-y-0.5">
                        <li>Konut başı ortalama maliyet: <strong>3.200 TL</strong> (Otomatik Higrostatlı Fan + Montaj).</li>
                        <li>Ayna buğulanmasını önler, banyo dolaplarının nemden şişmesini engeller.</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Ekstra İmalat Bedeli</span>
                    {params.hasBathroomHumidityFan && (
                      <span className="text-[9px] text-purple-700 font-bold">
                        {results.bathroomHumidityFanUnits ?? results.residentialUnitsCount ?? results.flatCount} Konut × {(params.bathroomHumidityFanPricePerFlat || 3200).toLocaleString('tr-TR')} TL
                        {(results.shopUnitsCount || 0) > 0 && <span className="text-amber-700 block text-[8px] font-medium">({results.shopUnitsCount} dükkan hariç)</span>}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-black text-slate-900 font-mono">
                    {params.hasBathroomHumidityFan ? `${results.bathroomHumidityFanCost?.toLocaleString('tr-TR')} TL` : 'Pasif'}
                  </div>
                </div>
              </div>

              {/* Option 7: Günlük Hayatı Kolaylaştıran Fotoselli Mutfak ve Banyo Bataryaları */}
              <div className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${params.hasTouchlessKitchenFaucet ? 'border-purple-300 bg-purple-50/20 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${params.hasTouchlessKitchenFaucet ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                        <ChefHat className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Fotoselli Mutfak & Banyo Bataryaları</span>
                        <span className="text-[10px] text-purple-700 font-semibold">Mutfak ve Banyo Lavabosunda Temassız Konfor</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!params.hasTouchlessKitchenFaucet}
                        onChange={(e) => onChangeParams({ ...params, hasTouchlessKitchenFaucet: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-semibold">
                    <span>🏠 Yalnızca Konut Daireleri İçindir</span>
                    <span className="text-amber-600 font-normal">(Dükkanlarda konut tipi ıslak hacimler olmadığından hariç tutulur)</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Mutfak eviyesi ve banyo lavabosunda, el yaklaştırıldığında dokunmadan çalışan <strong>temassız kızılötesi sensörlü</strong> akıllı batarya setidir. Üstün hijyen sağlar, sabun/su lekelerini önler ve %40 su tasarrufu sunar.
                  </p>

                  {params.hasTouchlessKitchenFaucet ? (
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] text-slate-600 bg-purple-50/60 p-2.5 rounded-lg border border-purple-100 space-y-1">
                        <div className="flex items-center justify-between font-bold text-purple-950">
                          <span>Temassız Kızılötesi Sensör Paketi (2 Adet)</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-200 text-purple-900 font-bold">%40 Su Tasarrufu</span>
                        </div>
                        <ul className="text-[10px] text-slate-600 space-y-0.5 list-disc pl-3.5 pt-0.5">
                          <li>Hem mutfak eviyesinde hem banyo lavabosunda hijyenik ve tam otomatik su kontrolü sağlar.</li>
                          <li>Islak/kirli ellerle bataryaya dokunmayı önler, kireç ve su lekesi birikimini sıfırlar.</li>
                          {(results.shopUnitsCount || 0) > 0 && (
                            <li className="text-amber-800 font-medium font-mono text-[9px]">
                              {results.shopUnitsCount} adet dükkan muaf tutulmuştur ({results.residentialUnitsCount ?? (results.flatCount - (results.shopUnitsCount || 0))} konuta uygulanır).
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">Konut Başı Mutfak & Banyo Batarya Seti Bedeli (TL)</label>
                        <input
                          type="number"
                          value={params.touchlessKitchenFaucetPricePerFlat ?? ''}
                          onChange={(e) => {
                            const val = e.target.value ? Math.max(0, parseFloat(e.target.value)) : undefined;
                            onChangeParams({ ...params, touchlessKitchenFaucetPricePerFlat: val });
                          }}
                          placeholder="8500"
                          className="w-full text-[11px] font-mono font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 bg-slate-100/60 p-2.5 rounded-lg border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-700 block">Mutfak & Banyo Hijyeni ve Pratiklik:</span>
                      <ul className="list-disc pl-3.5 space-y-0.5">
                        <li>Konut başı paket maliyeti (2 Adet): <strong>8.500 TL</strong> (Mutfak Eviye + Banyo Lavabo Sensörlü Bataryaları + Kurulum).</li>
                        <li>Mutfakta yemek hazırlığı, banyoda günlük temizlik süreçlerini pratikleştirerek yüksek hijyen sağlar.</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Ekstra İmalat Bedeli</span>
                    {params.hasTouchlessKitchenFaucet && (
                      <span className="text-[9px] text-purple-700 font-bold">
                        {results.touchlessKitchenFaucetUnits ?? results.residentialUnitsCount ?? results.flatCount} Konut × {(params.touchlessKitchenFaucetPricePerFlat || 8500).toLocaleString('tr-TR')} TL
                        {(results.shopUnitsCount || 0) > 0 && <span className="text-amber-700 block text-[8px] font-medium">({results.shopUnitsCount} dükkan hariç)</span>}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-black text-slate-900 font-mono">
                    {params.hasTouchlessKitchenFaucet ? `${results.touchlessKitchenFaucetCost?.toLocaleString('tr-TR')} TL` : 'Pasif'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MEVZUAT VE İMAR DENETİMİ PANELİ */}
          <div className="pt-4 border-t border-slate-100">
            <ZoningAuditPanel params={params} theme={theme} />
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
                {activeStep === 2 && '💡 2. Adım İpucu: Proje Ölçülerini, Cepheleri & 2D Çizimi Yapın'}
                {activeStep === 3 && '💡 3. Adım İpucu: Harçlar, Mevzuat & İnovatif Konfor Seçeneklerini İnceleyin'}
              </h4>
              <p className="text-xs text-indigo-100 leading-relaxed max-w-3xl">
                {activeStep === 1 && 'Projenizin ismini, adresini, hedeflenen taban oturum alanını m² cinsinden ve kentsel dönüşüm / kat karşılığı gibi sözleşme modelinizi bu adımda tanımlayabilirsiniz.'}
                {activeStep === 2 && 'Cephe Yönetim Merkezi ve 2D Canlı Çizim Tuvali üzerinde bina tabanınızı, cephe ölçülerini, bina girişini, yol/kör cepheleri ve konsol çıkmaları kolayca düzenleyebilirsiniz.'}
                {activeStep === 3 && 'Bu adımda yasal otopark harcı hesaplamasını yönetebilir, kentsel dönüşüm muafiyet durumunu inceleyebilir ve sulu yerden ısıtma, bina tipi su arıtma gibi lüks seçenekleri teklife dahil edebilirsiniz.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 border-t border-indigo-500/30 sm:border-t-0 pt-3 sm:pt-0">
            {activeStep > 1 && (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep - 1)}
                className="flex-1 sm:flex-none px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all border border-indigo-400 cursor-pointer"
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
              className="flex-1 sm:flex-none px-5 py-2 bg-white hover:bg-slate-50 text-indigo-900 rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>
                {activeStep === 1 && '2. Adım: Ölçüler & 2D Çizim ➡️'}
                {activeStep === 2 && '3. Adım: Özet & Seçenekler ➡️'}
                {activeStep === 3 && '1. 3D Yapı Modeline Geç 🚀'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
