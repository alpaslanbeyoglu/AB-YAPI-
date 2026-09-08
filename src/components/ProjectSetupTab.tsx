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
} from 'lucide-react';
import { InteractiveFootprintCanvas } from './InteractiveFootprintCanvas';
import { MunicipalIncentivesPanel } from './MunicipalIncentivesPanel';
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
  const [activeStep, setActiveStep] = useState<number>(1);
  const [activeScenario, setActiveScenario] = useState<number | null>(null);

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

  // Default existing buildings to empty array
  const existingBuildings: ExistingBuilding[] = useMemo(() => {
    return [];
  }, []);

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

  // Konsol Çıkma Alan Etkisi Hesabı
  const footprintCalc = calculateFootprint(params.footprintInputMode, params);
  const activeBaseArea = footprintCalc.area || 100;
  const estW = footprintCalc.effectiveWidth || 10;
  const estD = footprintCalc.effectiveDepth || 10;

  let upperFloorArea = activeBaseArea;
  let fCant = 0, rCant = 0, bCant = 0, lCant = 0;
  const isBlind = (idx: number) => {
    const cfg = params.facadeConfigs?.[idx];
    return cfg && (cfg.windowCountPerFloor === 0 || (cfg as any).isBlankWall === true);
  };
  const cantileverDepth = params.cantileverDepth || 1.2;
  const cantileverDirection = params.cantileverDirection || 'front_back';

  if (params.hasCantilever && cantileverDepth > 0) {
    if (cantileverDirection === 'custom' && params.facadeCantilevers && params.facadeCantilevers.length >= 4) {
      fCant = isBlind(0) ? 0 : (params.facadeCantilevers[0] || 0);
      rCant = isBlind(1) ? 0 : (params.facadeCantilevers[1] || 0);
      bCant = isBlind(2) ? 0 : (params.facadeCantilevers[2] || 0);
      lCant = isBlind(3) ? 0 : (params.facadeCantilevers[3] || 0);
    } else {
      if (cantileverDirection === 'all') {
        fCant = isBlind(0) ? 0 : cantileverDepth;
        rCant = isBlind(1) ? 0 : cantileverDepth;
        bCant = isBlind(2) ? 0 : cantileverDepth;
        lCant = isBlind(3) ? 0 : cantileverDepth;
      } else if (cantileverDirection === 'front') {
        fCant = isBlind(0) ? 0 : cantileverDepth;
      } else {
        // front_back
        fCant = isBlind(0) ? 0 : cantileverDepth;
        bCant = isBlind(2) ? 0 : cantileverDepth;
      }
    }
    upperFloorArea = (estW + lCant + rCant) * (estD + fCant + bCant);
    upperFloorArea = Math.round(upperFloorArea * 100) / 100;
  }

  const singleFloorCantileverDiff = Math.max(0, upperFloorArea - activeBaseArea);
  const percentIncrease = activeBaseArea > 0 ? (singleFloorCantileverDiff / activeBaseArea) * 100 : 0;
  const upperFloorsCount = Math.max(0, (params.floorCount || 5) - 1);
  const totalCantileverContribution = singleFloorCantileverDiff * upperFloorsCount;

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
  };

  const handleDeleteBuilding = (id: string) => {
    const updated = existingBuildings.filter((b) => b.id !== id);
    onChangeParams({
      ...params,
      existingBuildings: updated,
    });
    if (editingBuildingId === id) {
      setEditingBuildingId(null);
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
                { step: 3, label: 'Yapı Özellikleri', icon: Building2 },
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
                3. Proje Ölçüleri & Yapı Taban Geometrisi (2D Akıllı Çizim)
              </h2>
              <p className={`text-xs ${textMuted}`}>
                Parsel ve bina taban oturumunu çokgen / poligon çizerek veya kenar ölçülerini girerek
                birebir oluşturun.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              {currentPolyArea.toFixed(1)} m² Taban Oturumu
            </span>
          </div>
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
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300/50 animate-fade-in">
                {params.cantileverDepth || 1.20}m Çıkma Planlandı ({params.cantileverDirection === 'all' ? 'Tüm Cepheler' : params.cantileverDirection === 'front' ? 'Yalnızca Ön Cephe' : 'Ön & Arka Cepheler'})
              </span>
            )}
          </div>

          {params.hasCantilever && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-emerald-200/60 animate-fade-in">
              <div>
                <label className="block text-[11px] font-bold text-emerald-900 mb-1">📐 Konsol / Çıkma Derinliği (Metre)</label>
                <div className="relative">
                  <input
                    type="number"
                    step={0.1}
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
                <label className="block text-[11px] font-bold text-emerald-900 mb-1">🚪 Konsol Çıkma Cephesi / Yönü</label>
                <select
                  value={params.cantileverDirection || 'front_back'}
                  onChange={(e) => {
                    const newDir = e.target.value as any;
                    let newFacades = params.facadeCantilevers;
                    if (newDir !== 'custom') {
                      // reset facadeCantilevers array or clear it so it doesn't pollute standard ones
                      newFacades = undefined;
                    } else {
                      const d = params.cantileverDepth || 1.2;
                      newFacades = [d, 0, d, 0]; // default to front_back
                    }
                    onChangeParams({
                      ...params,
                      cantileverDirection: newDir,
                      facadeCantilevers: newFacades,
                    });
                  }}
                  className="w-full text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-300 bg-white focus:outline-emerald-500"
                >
                  <option value="front_back">Ön & Arka Cepheler (Sokak ve Bahçe Yönü)</option>
                  <option value="front">Yalnızca Ön Cephe (Yol Cephesi)</option>
                  <option value="all">Ayrık Nizam / Tüm Cephelerde Çıkma (Dört Taraf)</option>
                  <option value="custom">Özel Cephe Seçimi (Her Kenarı Ayrı Ayarla)</option>
                </select>
              </div>

              {/* Özel Cephe Seçici Grid */}
              {params.cantileverDirection === 'custom' && (
                <div className="col-span-1 sm:col-span-2 p-3.5 bg-emerald-50/20 border border-emerald-200/50 rounded-xl space-y-3 animate-fade-in">
                  <div className="text-[11px] font-black text-emerald-950 flex items-center gap-1.5 uppercase tracking-wider border-b border-emerald-200/40 pb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Kenar Bazlı Özelleştirilmiş Çıkma Derinlikleri
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { idx: 0, label: 'Ön Cephe (Yol)' },
                      { idx: 1, label: 'Sağ Yan Cephe' },
                      { idx: 2, label: 'Arka Cephe (Bahçe)' },
                      { idx: 3, label: 'Sol Yan Cephe' },
                    ].map(({ idx, label }) => {
                      const blind = isBlind(idx);
                      const currentList = params.facadeCantilevers && params.facadeCantilevers.length >= 4
                        ? [...params.facadeCantilevers]
                        : [params.cantileverDepth || 1.2, 0, params.cantileverDepth || 1.2, 0];
                      
                      const val = currentList[idx] || 0;
                      const hasCant = val > 0;

                      return (
                        <div 
                          key={idx} 
                          className={`p-2.5 rounded-lg border flex flex-col gap-2 transition-all ${
                            blind 
                              ? 'bg-slate-100/60 border-slate-200 opacity-60 select-none' 
                              : hasCant 
                                ? 'bg-white border-emerald-300 shadow-3xs' 
                                : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold text-slate-700">{label}</span>
                            {blind && (
                              <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1 rounded border border-red-200">
                                Sağır Duvar
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              disabled={blind}
                              checked={!blind && hasCant}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const updated = [...currentList];
                                updated[idx] = checked ? (params.cantileverDepth || 1.2) : 0;
                                onChangeParams({
                                  ...params,
                                  facadeCantilevers: updated,
                                });
                              }}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 disabled:opacity-50 cursor-pointer"
                            />
                            <span className="text-xs text-slate-600 font-bold">Çıkma Aktif</span>
                          </div>

                          {!blind && hasCant && (
                            <div className="relative mt-1 animate-fade-in">
                              <input
                                type="number"
                                step={0.1}
                                min={0.2}
                                max={3.0}
                                value={val || ''}
                                onChange={(e) => {
                                  const updated = [...currentList];
                                  updated[idx] = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                  onChangeParams({
                                    ...params,
                                    facadeCantilevers: updated,
                                  });
                                }}
                                className="w-full text-xs font-bold font-mono pl-2 pr-8 py-1 rounded border border-emerald-200 bg-white focus:outline-emerald-500"
                              />
                              <span className="absolute right-2 top-1 text-[10px] font-bold text-slate-400">m</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Çıkma Alanı Etki Analiz Kartı */}
              {singleFloorCantileverDiff > 0 && (
                <div className="col-span-1 sm:col-span-2 mt-3 p-3 bg-white border border-emerald-200 rounded-lg flex flex-col gap-2 shadow-2xs animate-fade-in">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-950 uppercase tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Konsol Çıkma Alan Etki Analizi
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded">
                      <div className="text-[10px] text-slate-500 font-medium">Zemin Kat (Taban)</div>
                      <div className="text-xs font-black text-slate-800 font-mono">{activeBaseArea.toFixed(1)} m²</div>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded">
                      <div className="text-[10px] text-slate-500 font-medium">Normal Kat (Çıkmalı)</div>
                      <div className="text-xs font-black text-emerald-800 font-mono">
                        {upperFloorArea.toFixed(1)} m²
                        <span className="text-[9px] text-emerald-600 block">+{percentIncrease.toFixed(1)}% Artış</span>
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded">
                      <div className="text-[10px] text-slate-500 font-medium">Tek Katta Çıkma Alanı</div>
                      <div className="text-xs font-black text-amber-700 font-mono">+{singleFloorCantileverDiff.toFixed(1)} m²</div>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded">
                      <div className="text-[10px] text-slate-500 font-medium">Toplam Çıkma Katkısı</div>
                      <div className="text-xs font-black text-indigo-700 font-mono">
                        +{totalCantileverContribution.toFixed(1)} m²
                        <span className="text-[9px] text-slate-400 block">{upperFloorsCount} Normal Katta</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed italic">
                    * İmar yönetmeliğine göre, kör cephelerde (bina yan/arka sağır duvarı) konsol çıkma yapılamaz. Çıkmalar sadece pencereli / açık cephelerde hesaplanmıştır.
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

        {/* Edge Lengths & Dimensions Summary Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5 text-indigo-600" />
            Poligon Kenar & Cephe Ölçü Detayları
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {activePoints.map((p1, i) => {
              const p2 = activePoints[(i + 1) % activePoints.length];
              const edgeLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
              const isEntrance = i === (params.mainEntranceFacadeIndex || 0);

              return (
                <div
                  key={i}
                  className={`p-2.5 rounded-xl border text-xs ${
                    isEntrance
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                    <span>{i + 1}. Kenar</span>
                    {isEntrance && <span className="text-[10px] text-emerald-700 font-bold">🚪 Giriş</span>}
                  </div>
                  <div className="text-sm font-black font-mono">{edgeLen.toFixed(2)} m</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    P{i + 1} ➡️ P{((i + 1) % activePoints.length) + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* 3. BÖLÜM: YAPILACAK (YENİ) BİNA KONFİGÜRASYONU (İMAL EDİLECEK YAPININ ÖZELLİKLERİ) */}
      {(!wizardMode || activeStep === 3) && (
        <div className={`${bgCard} rounded-2xl p-6 border shadow-xs space-y-6 animate-fade-in`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 font-bold">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold ${textTitle}`}>
                  3. İmal Edilecek Yeni Yapı Konfigürasyonu & Özellikleri
                </h2>
                <p className={`text-xs ${textMuted}`}>
                  Yeni projenin kat adetlerini, dairesel iç bölümlerini, bodrum ve zemin kat kullanımları ile çatı detaylarını girin.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-100 text-purple-800">
              {newTotalConstructionArea.toLocaleString('tr-TR')} m² Yeni İnşaat
            </span>
          </div>

          <div className="space-y-6">
            {/* GRUP 1: NORMAL KATLAR & DAİRE İÇ BÖLÜMLERİ */}
            <div className="p-5 border border-slate-200/80 rounded-xl space-y-4 bg-white/50">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-2">
                <span className="w-1.5 h-3 rounded-sm bg-purple-600"></span>
                Normal Katlar & Daire Planlaması
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Yeni Normal Kat Sayısı</label>
                  <input
                    id="newNormalFloorCountInput"
                    type="number"
                    min={1}
                    max={40}
                    value={params.floorCount || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const parsed = parseInt(val) || 0;
                      const normalFloors = params.hasGroundFloorShop ? Math.max(1, parsed - 1) : parsed;
                      const totalFlats = normalFloors * (params.flatsPerFloor || 2);
                      onChangeParams({
                        ...params,
                        floorCount: val === '' ? 0 : parsed,
                        flatCount: val === '' ? 0 : totalFlats,
                      });
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value);
                      if (isNaN(val) || val < 1) {
                        const defaultVal = 5;
                        const normalFloors = params.hasGroundFloorShop ? Math.max(1, defaultVal - 1) : defaultVal;
                        onChangeParams({
                          ...params,
                          floorCount: defaultVal,
                          flatCount: normalFloors * (params.flatsPerFloor || 2),
                        });
                      }
                    }}
                    className={`w-full text-xs font-bold font-mono px-3 py-2 rounded-lg border ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Normal Katta Daire Sayısı</label>
                  <input
                    id="flatsPerFloorInput"
                    type="number"
                    min={1}
                    max={10}
                    value={params.flatsPerFloor || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const parsed = parseInt(val) || 0;
                      const normalFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
                      onChangeParams({
                        ...params,
                        flatsPerFloor: val === '' ? 0 : parsed,
                        flatCount: val === '' ? 0 : normalFloors * parsed,
                      });
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value);
                      if (isNaN(val) || val < 1) {
                        const defaultVal = 2;
                        const normalFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
                        onChangeParams({
                          ...params,
                          flatsPerFloor: defaultVal,
                          flatCount: normalFloors * defaultVal,
                        });
                      }
                    }}
                    className={`w-full text-xs font-bold font-mono px-3 py-2 rounded-lg border ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">🚪 Daire İç Bölümleri (Oda Tipi)</label>
                  <select
                    id="roomTypeSelect"
                    value={params.roomType || '3+1'}
                    onChange={(e) =>
                      onChangeParams({
                        ...params,
                        roomType: e.target.value as RoomType,
                      })
                    }
                    className={`w-full text-xs font-bold px-3 py-2 rounded-lg border bg-white`}
                  >
                    <option value="1+1">Stüdyo / 1+1 Daire Planı</option>
                    <option value="2+1">Standart 2+1 Aile Planı</option>
                    <option value="3+1">Geniş 3+1 Konut Planı</option>
                    <option value="4+1">Büyük 4+1 Lüsk Konut Planı</option>
                    <option value="5+1">Geniş Aile / 5+1 Konut Planı</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-lg flex items-center justify-between text-xs text-indigo-900 border border-indigo-100">
                <span className="font-semibold">Toplam Planlanan Bağımsız Daire Sayısı (Otomatik):</span>
                <span className="font-mono font-black text-sm text-indigo-700 bg-white px-3 py-1 rounded-md border border-indigo-200">
                  {params.flatCount || (resFloors * newFlatsPerFloor)} Adet Daire
                </span>
              </div>
            </div>

            {/* GRUP 2: BODRUM KAT DURUMU */}
            <div className="p-5 border border-slate-200/80 rounded-xl space-y-4 bg-white/50">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-3 rounded-sm bg-purple-600"></span>
                  Bodrum Kat Planlaması
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold normal-case text-slate-600 select-none">
                  <input
                    id="hasBasementToggle"
                    type="checkbox"
                    checked={params.basementCount !== undefined ? params.basementCount > 0 : true}
                    onChange={(e) => {
                      onChangeParams({
                        ...params,
                        basementCount: e.target.checked ? 1 : 0,
                      });
                    }}
                    className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                  />
                  <span>Bodrum Kat Var mı?</span>
                </label>
              </h3>

              {(params.basementCount !== undefined ? params.basementCount > 0 : true) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Bodrum Kat Sayısı</label>
                    <input
                      id="basementCountInput"
                      type="number"
                      min={1}
                      max={10}
                      value={params.basementCount || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        onChangeParams({
                          ...params,
                          basementCount: val === '' ? 0 : parseInt(val) || 0,
                        });
                      }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val) || val < 1) {
                          onChangeParams({
                            ...params,
                            basementCount: 1,
                          });
                        }
                      }}
                      className={`w-full text-xs font-bold font-mono px-3 py-2 rounded-lg border ${inputBg}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">🏢 Bodrum Kat Kullanım Amacı</label>
                    <select
                      id="basementPurposeSelect"
                      value={params.basementPurpose || 'shelter_depot'}
                      onChange={(e) =>
                        onChangeParams({
                          ...params,
                          basementPurpose: e.target.value,
                        })
                      }
                      className="w-full text-xs font-bold px-3 py-2 rounded-lg border bg-white"
                    >
                      <option value="shelter_depot">🛡️ Sığınak & Ortak Depo Alanları</option>
                      <option value="parking">🚗 Kapalı Otopark Alanı</option>
                      <option value="shop">🛍️ Ticari Dükkan / İşyeri Deposu</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  ℹ️ Bodrum kat planlanmadı. Bina doğrudan temel üzerine zemin kat ile başlayacaktır.
                </div>
              )}
            </div>

            {/* GRUP 3: ZEMİN KAT DAİRE Mİ / DÜKKAN MI & ADET */}
            <div className="p-5 border border-slate-200/80 rounded-xl space-y-4 bg-white/50">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-2">
                <span className="w-1.5 h-3 rounded-sm bg-purple-600"></span>
                Zemin Kat Kullanımı
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Zemin Kat Fonksiyonu</label>
                  <div className="flex gap-2">
                    <button
                      id="zeminKonutBtn"
                      type="button"
                      onClick={() =>
                        onChangeParams({
                          ...params,
                          hasGroundFloorShop: false,
                        })
                      }
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                        !params.hasGroundFloorShop
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      🏠 Konut Daireleri
                    </button>
                    <button
                      id="zeminTicariBtn"
                      type="button"
                      onClick={() =>
                        onChangeParams({
                          ...params,
                          hasGroundFloorShop: true,
                          shopCount: params.shopCount || 1,
                        })
                      }
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                        params.hasGroundFloorShop
                          ? 'bg-amber-50 border-amber-500 text-amber-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      🛍️ Ticari Dükkanlar
                    </button>
                  </div>
                </div>

                {params.hasGroundFloorShop ? (
                  <div className="animate-fade-in">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Zemin Dükkan Adedi</label>
                    <input
                      id="zeminDukkanCountInput"
                      type="number"
                      min={1}
                      max={20}
                      value={params.shopCount || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        onChangeParams({
                          ...params,
                          shopCount: val === '' ? 0 : parseInt(val) || 0,
                        });
                      }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val) || val < 1) {
                          onChangeParams({
                            ...params,
                            shopCount: 1,
                          });
                        }
                      }}
                      className="w-full text-xs font-bold font-mono px-3 py-2 rounded-lg border border-amber-300 bg-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Zemin Kat Daire Sayısı (Otomatik)</label>
                    <div className="px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs font-mono font-bold text-slate-700">
                      {params.flatsPerFloor || 2} Adet Konut Dairesi
                    </div>
                  </div>
                )}
              </div>

              {params.hasGroundFloorShop && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-amber-100 bg-amber-50/20 p-3 rounded-lg border border-amber-100 animate-fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">Dükkan Konumu</label>
                    <select
                      id="shopLocationSelect"
                      value={params.shopLocation || 'ground'}
                      onChange={(e) =>
                        onChangeParams({
                          ...params,
                          shopLocation: e.target.value as ShopLocation,
                        })
                      }
                      className="w-full text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-300 bg-white"
                    >
                      <option value="ground">Sadece Zemin Kat Dükkan</option>
                      <option value="basement">Sadece Bodrum Kat Dükkan</option>
                      <option value="both">Zemin + Bodrum Bağlantılı Dükkan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">Dükkan Kat Yüksekliği (m)</label>
                    <input
                      id="shopHeightInput"
                      type="number"
                      step="0.1"
                      min={2.8}
                      max={6.0}
                      value={params.shopHeight || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        onChangeParams({
                          ...params,
                          shopHeight: val === '' ? 0 : parseFloat(val) || 0,
                        });
                      }}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || val < 2.5) {
                          onChangeParams({
                            ...params,
                            shopHeight: 3.8,
                          });
                        }
                      }}
                      className="w-full text-xs font-bold font-mono px-3 py-1.5 rounded-lg border border-amber-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">Ortalama Dükkan Alanı (m²)</label>
                    <input
                      id="shopAreaInput"
                      type="number"
                      min={20}
                      max={2000}
                      value={params.shopArea || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        onChangeParams({
                          ...params,
                          shopArea: val === '' ? 0 : parseFloat(val) || 0,
                        });
                      }}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || val < 10) {
                          onChangeParams({
                            ...params,
                            shopArea: 80,
                          });
                        }
                      }}
                      className="w-full text-xs font-bold font-mono px-3 py-1.5 rounded-lg border border-amber-300 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* GRUP 4: ÇATI TİPİ & ÇATI ARASI KULLANIMI */}
            <div className="p-5 border border-slate-200/80 rounded-xl space-y-4 bg-white/50">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-2">
                <span className="w-1.5 h-3 rounded-sm bg-purple-600"></span>
                Çatı Yapısı & Çatı Katı Kullanımı
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">🏠 Çatı Tipi</label>
                  <select
                    id="roofTypeSelect"
                    value={params.roofType || 'gable'}
                    onChange={(e) =>
                      onChangeParams({
                        ...params,
                        roofType: e.target.value as any,
                      })
                    }
                    className="w-full text-xs font-bold px-3 py-2 rounded-lg border bg-white"
                  >
                    <option value="gable">📐 Kırma Çatı (Geleneksel Eğik Çatı)</option>
                    <option value="flat">🧱 Teras Çatı (Düz Modern Çatı)</option>
                    <option value="mansard">🏢 Mansart Çatı (Kırıklı Geniş Hacim Çatı)</option>
                    <option value="duplex">💎 Çatı Dubleksi (Alt Katla Birleşik Lüks Dubleks)</option>
                  </select>
                </div>

                {params.roofType !== 'flat' ? (
                  <div className="animate-fade-in">
                    <label className="block text-xs font-bold text-slate-700 mb-1">🏠 Çatı Arası / Çatı Katı Kullanımı</label>
                    <select
                      id="roofAtticTypeSelect"
                      value={params.roofAtticType || 'duplex_unified'}
                      onChange={(e) =>
                        onChangeParams({
                          ...params,
                          roofAtticType: e.target.value as any,
                        })
                      }
                      className="w-full text-xs font-bold px-3 py-2 rounded-lg border bg-white"
                    >
                      <option value="duplex_unified">🔗 Alt Katla Birleşik Çatı Dubleksi (Paylaşımlı Hacim)</option>
                      <option value="independent">🚪 Tamamen Bağımsız Ayrı Daire / Kat (Ayrı Malik Meskeni)</option>
                    </select>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center">
                    ℹ️ Düz teras çatıda çatı arası bağımsız daire veya dubleks hacmi imal edilemez. Teras alanı ortak kullanım alanı olarak ayrılır.
                  </div>
                )}
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
                {activeStep === 3 && '💡 3. Adım İpucu: Yapı Özelliklerini Planlayın'}
              </h4>
              <p className="text-xs text-indigo-100 leading-relaxed max-w-3xl">
                {activeStep === 1 && 'Projenizin ismini, adresini, hedeflenen taban oturum alanını m² cinsinden ve kentsel dönüşüm / kat karşılığı gibi sözleşme modelinizi bu adımda tanımlayabilirsiniz.'}
                {activeStep === 2 && '2D Akıllı Çizim Tuvali üzerinde binanızın taban geometrisini poligon veya kenar uzunluklarıyla tasarlayabilir, üst katlar için Konsol Çıkma (çıkma derinliği ve cephesi) ekleyebilirsiniz.'}
                {activeStep === 3 && 'İmal edilecek yeni yapının bodrum amaçlarını (otopark, sığınak, depo), zemin kat fonksiyonunu (konut / dükkan), normal kat adetleri ile daire tiplerini (2+1, 3+1 vb.) ve çatı yapısını (dubleks/bağımsız) belirleyebilirsiniz.'}
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
