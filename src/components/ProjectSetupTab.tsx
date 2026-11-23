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
  Save,
  ShieldAlert,
  Car,
  Box,
  RotateCcw,
  Ruler,
  Plus,
  Trash2,
  Edit2,
  Check,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  Layout,
  DollarSign,
  Users,
  Percent,
  Scale,
  Sliders,
  Info,
  Sparkles,
  Wand2,
  MapPin,
  Maximize2,
  ArrowDownUp,
  ChevronDown,
  ChevronUp,
  X,
  BarChart3,
  Palette,
  ShieldCheck,
  Flame,
  Droplets,
  Wind,
  Zap,
  Bath,
  Fan,
  ChefHat,
  Lock,
  Printer,
  FileText,
  FileSpreadsheet,
  ScrollText
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { renderElementToCanvas } from '../utils/pdfExport';
import { AC_PRESET_OPTIONS, getAcOptionById } from '../utils/acOptions';
import { ZoningAuditPanel } from './ZoningAuditPanel';
import { calculateCantileverDetails, calculateFlatCount, calculateProject, synchronizeFlats } from '../utils/calculatorEngine';
import {
  POLYGON_PRESETS,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  getPolygonBounds,
  generateFacadeConfigs,
  syncPolygonToCustomFacades,
  calculateFootprint,
  buildPolygonEditUpdate,
  buildBaseAreaEditUpdate,
  DEFAULT_CUSTOM_FACADES_4,
  DEFAULT_CUSTOM_FACADES_5,
  DEFAULT_CUSTOM_FACADES_6,
  DEFAULT_CUSTOM_FACADES_8,
} from '../utils/footprintUtils';
import { TabId } from '../config/tabs';
import { WorkbenchHeader } from './ProjectWorkbench/WorkbenchHeader';
import { WorkbenchSidebar } from './ProjectWorkbench/WorkbenchSidebar';
import {
  WorkbenchLiveSummary,
  evaluateWorkbenchProject,
  WorkbenchNavigationRequest,
  WorkbenchStageNavigationOptions,
  resolveStage6SubViewForNavigation,
  resolveStage8SubViewForNavigation,
} from './ProjectWorkbench/WorkbenchLiveSummary';
import { CostDetailsTab } from './CostDetailsTab';
import { BuildingModelTab } from './BuildingModelTab';
import { OwnersTab } from './OwnersTab';
import { OfferTab } from './OfferTab';
import { ConstructionProgressTab } from './ConstructionProgressTab';
import { SpecificationTab } from './SpecificationTab';
import { AdminReportTab } from './AdminReportTab';
import { ContractTab } from './ContractTab';
import { InteractiveFootprintCanvas } from './InteractiveFootprintCanvas';
import { getInitialBuildingModelParams } from '../utils/buildingModelUtils';
import { BuildingModelParams, SavedProjectData } from '../types';
import {
  calculateProjectZoningRatios,
  equalizeFloorAreasPreservingManualValues,
} from '../utils/workflowConsistencyUtils';

interface ProjectSetupTabProps {
  params: ProjectParams;
  onChangeParams: (newParams: ProjectParams | Partial<ProjectParams>) => void;
  theme?: AppTheme;
  onNext: () => void;
  onNavigateToModel?: () => void;
  onNavigateToOwners?: () => void;
  onOpenTransferModal?: () => void;
  requestedStep?: number;
  navigationRequest?: WorkbenchNavigationRequest | null;
  onConsumeNavigationRequest?: (nonce: number) => void;
  onStepChange?: (step: number) => void;
  onNavigateToTab?: (tabId: TabId) => void;
  onQuickSave?: () => void;
  onNavigateToSite?: () => void;
  buildingModelParams?: BuildingModelParams;
  onUpdateBuildingModelParams?: (updates: Partial<BuildingModelParams>) => void;
  onSyncModelToCalculator?: (modelUpdates: Partial<ProjectParams>) => void;
  onCalculate?: () => void;
  onSaveOffer?: (offerMeta: ProjectParams['offerMeta']) => boolean;
  isArchiveAddressConflict?: boolean;
  savedProjects?: SavedProjectData[];
  onSelectProjectForProgress?: (project: SavedProjectData) => void;
  onAddNewConstructionProject?: (newProject: SavedProjectData) => void;
  onDeleteHistoryProject?: (address: string) => void;
  onNavigateToContract?: () => void;
  isFlowOpen?: boolean;
  onToggleFlow?: () => void;
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
  navigationRequest,
  onConsumeNavigationRequest,
  onStepChange,
  onNavigateToTab,
  onQuickSave,
  onNavigateToSite,
  buildingModelParams: propBuildingModelParams,
  onUpdateBuildingModelParams,
  onSyncModelToCalculator,
  onCalculate,
  onSaveOffer,
  isArchiveAddressConflict,
  savedProjects,
  onSelectProjectForProgress,
  onAddNewConstructionProject,
  onDeleteHistoryProject,
  onNavigateToContract,
  isFlowOpen,
  onToggleFlow,
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
  const [internalFlowOpen, setInternalFlowOpen] = useState<boolean>(false);
  const effectiveFlowOpen = isFlowOpen !== undefined ? isFlowOpen : internalFlowOpen;
  const handleToggleFlow = onToggleFlow || (() => setInternalFlowOpen((prev) => !prev));
  const [workbenchStage, setWorkbenchStage] = useState<number>(() => {
    if (requestedStep && requestedStep >= 1 && requestedStep <= 9) return requestedStep;
    return 1;
  });
  const [internalBuildingModelParams, setInternalBuildingModelParams] = useState<BuildingModelParams>(() => {
    return getInitialBuildingModelParams();
  });
  const activeBuildingModelParams = propBuildingModelParams || internalBuildingModelParams;
  const handleUpdateBuildingModel =
    onUpdateBuildingModelParams ||
    ((updates: Partial<BuildingModelParams>) =>
      setInternalBuildingModelParams((prev) => ({ ...prev, ...updates })));
  const isProjectSaved = useMemo(
    () => Boolean(savedProjects && savedProjects.some((p) => p.projectAddress === params.projectAddress)),
    [savedProjects, params.projectAddress]
  );

  const [activeStepState, setActiveStepState] = useState<number>(requestedStep || 2);
  const activeStep = requestedStep !== undefined ? requestedStep : activeStepState;

  // Calculate live project results for metrics and feasibility analysis
  const results = useMemo(() => calculateProject(params), [params]);

  const [viewMode, setViewMode] = useState<'grid' | 'drawing'>('grid');
  const [selectedDistributionFloor, setSelectedDistributionFloor] = useState('all');
  const [schematicDetailMode, setSchematicDetailMode] = useState<'financial' | 'architectural'>('architectural');
  const schematicRef = useRef<HTMLDivElement>(null);

  const exportSchematic = async (format: 'png' | 'pdf') => {
    if (!schematicRef.current) return;

    try {
      const canvas = await renderElementToCanvas(schematicRef.current, {
        scale: 2,
        backgroundColor: '#f8fafc', // slate-50
        useCORS: true,
        logging: false,
        windowWidth: schematicRef.current.scrollWidth,
        windowHeight: schematicRef.current.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `bina-sematik-cizimi-${params.projectName || 'proje'}.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'l' : 'p',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`bina-sematik-cizimi-${params.projectName || 'proje'}.pdf`);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };
  const [backupParams, setBackupParams] = useState<ProjectParams | null>(null);

  // Group flats by floor for visual consistency and layout logic
  // KURAL: Ortak alanlar (sığınak, otopark, depo) hesaplamalara tam dahil edilir, ancak kat planı şemalarında bağımsız daire kutusu olarak gösterilmez.
  const groupedFlats = useMemo(() => {
    const groups: Record<number, any[]> = {};
    params.flats.forEach(flat => {
      if (flat.flatType === 'shelter' || flat.flatType === 'parking' || flat.flatType === 'storage') {
        return;
      }
      const floor = flat.floorNumber ?? 0;
      if (!groups[floor]) groups[floor] = [];
      groups[floor].push(flat);
    });
    // Sort floors from top to bottom (highest floor number first)
    return Object.entries(groups).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [params.flats]);

  const distributionFloor = groupedFlats.some(([floor]) => floor === selectedDistributionFloor)
    ? selectedDistributionFloor
    : 'all';
  const visibleDistributionFloors = distributionFloor === 'all'
    ? groupedFlats
    : groupedFlats.filter(([floor]) => floor === distributionFloor);

  const getFlatStyles = (flat: any, isContractor: boolean) => {
    if (isContractor) return 'bg-amber-100 border-amber-400 text-amber-950 shadow-sm ring-2 ring-amber-400/50';
    
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

    // Dubleks ve Mansart (Ayrı mor/eflatun renk tonu ile Müteahhit sarısından belirgin ayrışır)
    if (type === 'duplex') return 'bg-purple-50 border-purple-200 text-purple-900';
    if (type === 'mansard') return 'bg-fuchsia-50/70 border-fuchsia-200 text-fuchsia-900';
    
    return 'bg-white border-slate-200 text-slate-800 hover:border-indigo-300';
  };

  const setActiveStep = (step: number) => {
    setActiveStepState(step);
    if (onStepChange) onStepChange(step);
  };

  const [activeScenario, setActiveScenario] = useState<number | null>(null);
  const [showExistingForm, setShowExistingForm] = useState<boolean>(false);
  const [showComfortOptions, setShowComfortOptions] = useState<boolean>(true);
  const [stage5SubView, setStage5SubView] = useState<'spec' | 'takeoff' | 'comfort'>('spec');
  const [stage6SubView, setStage6SubView] = useState<'cost' | 'admin_report'>('cost');
  const [stage8SubView, setStage8SubView] = useState<'offer' | 'contract'>('offer');
  const [equalizeSuccessToast, setEqualizeSuccessToast] = useState<string | null>(null);

  const focusDomTarget = (focusFieldId?: string, highlight = false) => {
    if (!focusFieldId) return;
    window.setTimeout(() => {
      const el = document.getElementById(focusFieldId);
      if (el) {
        for (let group = el.closest('details'); group; group = group.parentElement?.closest('details') ?? null) {
          group.open = true;
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (highlight) {
          el.classList.add('ring-4', 'ring-indigo-500/60', 'ring-offset-2', 'transition-all', 'duration-700');
          window.setTimeout(() => {
            el.classList.remove('ring-4', 'ring-indigo-500/60', 'ring-offset-2');
          }, 2500);
        }
        if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
          el.focus();
        }
      }
    }, 80);
  };

  useEffect(() => {
    if (requestedStep !== undefined && requestedStep >= 1 && requestedStep <= 9) {
      setActiveStepState(requestedStep);
      setWorkbenchStage(requestedStep);
    }
  }, [requestedStep]);

  useEffect(() => {
    if (!navigationRequest) return;
    const normalized = Math.min(9, Math.max(1, navigationRequest.step));
    setActiveStepState(normalized);
    setWorkbenchStage(normalized);

    if (normalized === 6) {
      setStage6SubView((prev) =>
        resolveStage6SubViewForNavigation(prev, {
          focusFieldId: navigationRequest.focusFieldId,
          explicitSubView: navigationRequest.stage6SubView,
        })
      );
    } else if (normalized === 8) {
      setStage8SubView((prev) =>
        resolveStage8SubViewForNavigation(prev, navigationRequest.stage8SubView)
      );
    }

    focusDomTarget(navigationRequest.focusFieldId, true);
    onConsumeNavigationRequest?.(navigationRequest.nonce);
  }, [navigationRequest, onConsumeNavigationRequest]);

  const goToStage = (
    stage: number,
    focusFieldId?: string,
    options?: WorkbenchStageNavigationOptions
  ) => {
    const normalized = Math.min(9, Math.max(1, stage));
    setWorkbenchStage(normalized);
    setActiveStep(normalized);

    if (normalized === 6) {
      setStage6SubView((prev) =>
        resolveStage6SubViewForNavigation(prev, {
          focusFieldId,
          explicitSubView: options?.stage6SubView,
        })
      );
    } else if (normalized === 8) {
      setStage8SubView((prev) =>
        resolveStage8SubViewForNavigation(prev, options?.stage8SubView)
      );
    }

    focusDomTarget(focusFieldId, false);
  };

  const workbenchEvaluation = useMemo(
    () => evaluateWorkbenchProject(params, results, isProjectSaved),
    [params, results, isProjectSaved]
  );

  const activeComfortStats = useMemo(() => {
    const items = [
      { active: !!params.hasUnderfloorHeating, cost: results.underfloorHeatingCost || 0 },
      { active: !!params.hasWaterFiltration, cost: results.waterFiltrationCost || 0 },
      { active: !!params.hasAcOption, cost: results.acCostTotal || 0 },
      { active: !!params.hasThermostaticShowerMixer, cost: results.thermostaticMixerCost || 0 },
      { active: !!params.hasLinearShowerDrain, cost: results.linearDrainCost || 0 },
      { active: !!params.hasBathroomHumidityFan, cost: results.bathroomHumidityFanCost || 0 },
      { active: !!params.hasTouchlessKitchenFaucet, cost: results.touchlessKitchenFaucetCost || 0 },
      { active: !!params.hasSmartDoorLock, cost: results.smartDoorLockCost || 0 },
      { active: !!params.hasGenerator, cost: results.generatorCost || 0 },
      { active: !!params.hasPorcelainCountertop, cost: results.porcelainCountertopCost || 0 },
    ];
    const activeItems = items.filter((i) => i.active);
    return {
      count: activeItems.length,
      totalCost: activeItems.reduce((sum, i) => sum + i.cost, 0),
    };
  }, [params, results]);

  const handleEqualizeFloorAreas = () => {
    const footprintResult = calculateFootprint(params.footprintInputMode, params);
    const baseArea = params.baseBuildArea || footprintResult.area;
    const cantileverInfo = calculateCantileverDetails(params, baseArea, footprintResult);
    const upperFloorArea = cantileverInfo.upperFloorArea;
    const flatsPerFloor = Math.max(1, params.flatsPerFloor || 2);
    const totalFlats = calculateFlatCount(params);
    const upperFlatAvg = parseFloat((upperFloorArea / flatsPerFloor).toFixed(2));

    const updatedFlats = equalizeFloorAreasPreservingManualValues(params, {
      preserveManualAreas: false,
      preserveManualLandShares: true,
    });

    const sanitizedContractorIds = (params.contractorFlatIds || []).filter((id) => id <= totalFlats);

    onChangeParams({
      baseBuildArea: baseArea,
      flatCount: totalFlats,
      flats: updatedFlats,
      contractorFlatIds: sanitizedContractorIds,
    });

    setEqualizeSuccessToast(`Tüm kat alanları (${upperFlatAvg} m²/daire) ve ${totalFlats} bağımsız bölümün kat dağılımı (manuel arsa payları korunarak) dengelendi.`);
    setTimeout(() => setEqualizeSuccessToast(null), 4000);
  };

  // Y-5: Bağımsız bölüm sayısı değiştiğinde mevcut dairelerin manuel alan ve arsa payı değerlerini ezmeden senkronize et
  const expectedFlatCount = useMemo(() => calculateFlatCount(params), [params]);
  useEffect(() => {
    if (params.flats && params.flats.length !== expectedFlatCount && expectedFlatCount > 0) {
      onChangeParams({ flatCount: expectedFlatCount });
    }
  }, [expectedFlatCount, params.flats?.length]);

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
  const shopRequiresBasement = !!params.hasGroundFloorShop && newShopLocation !== 'ground';
  const newShopArea = params.shopArea || 80;
  const resFloors = newHasShop ? Math.max(0, newFloorCount - 1) : newFloorCount;
  const newFlatCount = calcResult.normalFlats !== undefined ? calcResult.normalFlats : (params.flatCount || (resFloors * newFlatsPerFloor));
  const newTotalUnits = calcResult.flatCount;
  const newApartmentSize = params.apartmentSize || 90;
  const newBaseArea = calcResult.baseArea || params.baseBuildArea || 140;
  const newTotalConstructionArea = Math.round(calcResult.totalArea);

  const plannedKonutCount = useMemo(() => {
    return (params.flats || []).filter(
      (f) => f.flatType === 'standard' || f.flatType === 'mansard' || f.flatType === 'duplex' || f.flatType === 'basement_flat'
    ).length;
  }, [params.flats]);

  const plannedShopCount = useMemo(() => {
    return (params.flats || []).filter((f) => f.flatType === 'shop').length;
  }, [params.flats]);

  const plannedBasementShopCount = useMemo(() => {
    return (params.flats || []).filter((f) => f.flatType === 'basement_shop').length;
  }, [params.flats]);

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
      onChangeParams({ baseBuildArea: 0 });
      return;
    }
    const parsed = parseFloat(valStr);
    if (isNaN(parsed) || parsed <= 0) return;
    const patch = buildBaseAreaEditUpdate(params, parsed, activePoints);
    onChangeParams(patch);
    if (!onUpdateBuildingModelParams) {
      setInternalBuildingModelParams((prev) => ({ ...prev, ...patch }));
    }
  };

  // Polygon & Geometry handling
  const activeInputMode = params.footprintInputMode || 'directArea';
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
  const directAreaFootprint = useMemo(
    () => calculateFootprint('directArea', params),
    [params.baseBuildArea, params.facadeWidth, params.facadeDepth]
  );

  useEffect(() => {
    if (params.footprintInputMode === 'polygonDraw' && currentPolyArea > 0) {
      const rounded = Math.round(currentPolyArea * 10) / 10;
      if (Math.abs((params.baseBuildArea || 0) - rounded) > 0.5) {
        onChangeParams({
          baseBuildArea: rounded,
        });
      }
    }
  }, [currentPolyArea, params.footprintInputMode, params.baseBuildArea]);

  const handlePolygonPointsChange = (newPoints: PolygonPoint[]) => {
    const patch = buildPolygonEditUpdate(params, newPoints);
    onChangeParams(patch);
    if (!onUpdateBuildingModelParams) {
      setInternalBuildingModelParams((prev) => ({ ...prev, ...patch }));
    }
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
    <div className="space-y-5 pb-12">
      {/* 1. Üst Bölüm: Proje Künyesi ve Hızlı Karar İşlemleri */}
      <WorkbenchHeader
        params={params}
        results={results}
        theme={theme}
        isProjectSaved={isProjectSaved}
        activeStage={workbenchStage}
        evaluation={workbenchEvaluation}
        isFlowOpen={effectiveFlowOpen}
        onToggleFlow={handleToggleFlow}
        onSelectStage={goToStage}
        onOpenTransferModal={onOpenTransferModal}
        onExportPdf={() => goToStage(8, undefined, { stage8SubView: 'offer' })}
        onQuickSave={onQuickSave || onCalculate}
        onNavigateToSite={() => goToStage(9)}
      />

      {/* 2. Ana Çalışma Masası Grid Düzeni (Akış Şeması Açıldığında Sol Navigasyon Gizlenerek İçerik Genişler) */}
      <div
        className={`grid grid-cols-1 gap-5 items-start ${
          effectiveFlowOpen
            ? 'xl:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[240px_minmax(0,1fr)_290px]'
            : '2xl:grid-cols-[minmax(0,1fr)_290px]'
        }`}
      >
        {/* Sol Bölüm: Proje Akış Şeması (Genişletildiğinde Gösterilir) */}
        {effectiveFlowOpen && (
          <div className="hidden xl:block xl:sticky xl:top-24">
            <WorkbenchSidebar
              activeWorkbenchStage={workbenchStage}
              onSelectWorkbenchStage={goToStage}
              onClose={handleToggleFlow}
              params={params}
              results={results}
              isProjectSaved={isProjectSaved}
              evaluation={workbenchEvaluation}
              theme={theme}
            />
          </div>
        )}

        {/* Orta Bölüm: Aktif Aşama Çalışma Alanı */}
        <div className="space-y-5 min-w-0">
          {workbenchStage >= 5 && workbenchStage <= 7 && (
            <dl className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-3">
              {[
                ['Toplam proje bedeli', results.grandTotal, 'TL'],
                ['Ortalama brüt m² bedeli', results.grossCostPerSqM, 'TL/m²'],
                ['Kalan malik bakiyesi', results.flatResults.reduce((sum, flat) =>
                  sum + (flat.isContractorShare ? 0 : flat.netRemainingDebt || 0), 0), 'TL'],
              ].map(([label, value, unit]) => (
                <div key={label}>
                  <dt className="text-slate-600">{label}</dt>
                  <dd className="mt-1 text-base font-bold tabular-nums text-slate-900">
                    {Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} {unit}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {/* 1. AŞAMA: MÜŞTERİ VE PROJE TANIMLAMA */}
          {workbenchStage === 1 && (
      <div className="space-y-6">
        <div className={`${bgCard} rounded-2xl p-6 border shadow-xs space-y-6 animate-fade-in`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="projectNameInput" className="block text-sm font-bold text-slate-700 mb-1.5">
                  Müşteri / Proje Adı
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
                <label htmlFor="projectAddressInput" className="block text-sm font-bold text-slate-700 mb-1.5">
                  Yapı Adresi veya Ada / Parsel
                </label>
                <div className="relative">
                  <input
                    ref={addressInputRef}
                    id="projectAddressInput"
                    aria-describedby="projectAddressHelp"
                    type="text"
                    value={params.projectAddress || ''}
                    onChange={(e) => onChangeParams({ ...params, projectAddress: e.target.value })}
                    placeholder="Örn: İstanbul, Kadıköy, Göztepe Mah. 1024 Ada 15 Parsel"
                    className={inputClass}
                  />
                </div>
                <span id="projectAddressHelp" className="text-xs text-slate-600 mt-1 block">
                  Arşive kaydetmek için yapı adresini veya ada ve parsel numarasını girin.
                </span>
              </div>
            </div>

            {/* Proje Türü Seçimi (Tek Kaynak — 5 Model) */}
            <div className="pt-4 border-t border-slate-100/80 space-y-3">
              <label className="block text-xs font-black text-indigo-950 uppercase tracking-wider">
                💼 İş / Dönüşüm Modeli Seçin
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
                {[
                  { id: 'kentsel', model: 'urbanTransformation', label: '🏢 Kentsel Dönüşüm', desc: '6306 Sayılı Yasa kapsamında dönüşüm.' },
                  { id: 'kentsel_imar', model: 'urbanTransformation', label: '⚡ Kentsel + İmar Artışı', desc: 'İlave emsal / kat artışı teşvikli model.' },
                  { id: 'kat_karsiligi', model: 'contractorShare', label: '🤝 Kat Karşılığı', desc: 'Arsa payı karşılığı daire paylaşım modeli.' },
                  { id: 'muteahhitlik', model: 'contractorService', label: '🔨 Müteahhitlik Hizmeti', desc: 'Anahtar teslim yapım bedeli modeli.' },
                  { id: 'nakit', model: 'cash', label: '💵 Nakit / Hakediş', desc: 'İlerleme bazlı nakit hakediş usulü.' },
                ].map((type) => {
                  const isSel = params.projectType === type.id || (type.id === 'kentsel' && !params.projectType);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        const newParams: any = {
                          ...params,
                          projectType: type.id,
                          projectModel: type.model,
                          hasZoningIncrease: type.id === 'kentsel_imar',
                        };
                        onChangeParams(newParams);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSel
                          ? 'bg-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/10'
                          : 'bg-white/60 hover:bg-white border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                          {isSel && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0"></span>}
                          <span>{type.label}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 leading-snug font-medium">{type.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. AŞAMA: ARSA VE İMAR ANALİZİ */}
      {workbenchStage === 2 && (
        <div className={`${bgCard} rounded-2xl p-6 border shadow-xs space-y-5 animate-fade-in`}>
          <section aria-labelledby="stage2-offer-prices" className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
            <h3 id="stage2-offer-prices" className="text-sm font-bold text-slate-900">Teklife yansıyacak m² fiyatları</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-semibold text-slate-800">
                <span className="block">Konut (TL/m²)</span>
                <input id="stage2OfferUnitPriceInput" type="number" inputMode="decimal" min={0} step="any"
                  value={params.manualFlatUnitPrice || ''}
                  onChange={e => onChangeParams({ manualFlatUnitPrice: Math.max(0, Number(e.target.value)) })}
                  placeholder="Otomatik hesaplanan fiyat"
                  className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="space-y-1 text-sm font-semibold text-slate-800">
                <span className="block">Dükkân (TL/m²)</span>
                <input id="stage2ShopOfferUnitPriceInput" type="number" inputMode="decimal" min={0} step="any"
                  value={params.manualShopUnitPrice || ''}
                  onChange={e => onChangeParams({ manualShopUnitPrice: Math.max(0, Number(e.target.value)) })}
                  placeholder="Konut fiyatıyla aynı"
                  className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm" />
              </label>
            </div>
            <p className="text-xs text-slate-600">Konut fiyatı boşsa otomatik hesap kullanılır. Dükkân fiyatı boşsa konut fiyatı uygulanır.</p>
          </section>

          {/* Arsa & Taban Oturumu Temel Girdileri */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  onChange={(e) => handleBaseAreaInputChange(e.target.value)}
                  placeholder="Örn: 140"
                  className={inputClassIndigo}
                />
                <span className="absolute right-3.5 text-xs font-black text-indigo-600 font-mono">m²</span>
              </div>
              <span className="text-[10px] text-indigo-700 block font-medium">
                Binanın arsa üzerine oturacağı net zemin alanı (2D poligon ve 3D model ile eşzamanlıdır).
              </span>
            </div>
          </div>

          {/* Live TAKS & KAKS Hızlı İmar Oranları Çubuğu */}
          {params.landArea && params.landArea > 0 ? (() => {
            const zoningRatios = calculateProjectZoningRatios(params, results);
            return (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600">TAKS (Taban Oturum Oranı):</span>
                    <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                      %{zoningRatios.taksPercent.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600">Tahmini KAKS (Emsal):</span>
                    <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                      {zoningRatios.kaksRatio.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-500 mr-1">Hızlı TAKS Seçin:</span>
                  {[25, 30, 35, 40, 50].map((taks) => {
                    const calculatedBase = Math.round((params.landArea! * taks) / 100);
                    const isActive = Math.abs(zoningRatios.taksPercent - taks) < 1;
                    return (
                      <button
                        key={taks}
                        type="button"
                        onClick={() => handleBaseAreaInputChange(String(calculatedBase))}
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
            );
          })() : null}

          {/* Parsel / Taban Şekli Hızlı Geometri Seçimi */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-bold text-slate-800 block">Parsel / Taban Oturum Formu</span>
              <span className="text-[11px] text-slate-500 font-mono">
                {currentPolyBounds.width.toFixed(1)}m × {currentPolyBounds.depth.toFixed(1)}m • Çevre: {currentPolyPerimeter.toFixed(1)}m • {activePoints.length} Köşe
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'rectangle', label: 'Dikdörtgen' },
                { key: 'lShape', label: 'L-Tipi' },
                { key: 'trapezoid', label: 'Trapez / Açılı' },
              ].map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handleApplyPreset(preset.key)}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2D Akıllı Poligon & Taban Oturumu Editörü (Tek Veri Kaynağı — 4. Aşama 3D Model ile Canlı Senkronize) */}
          <details className="rounded-2xl border border-indigo-200/70 bg-slate-50/70 p-3.5">
            <summary className="cursor-pointer text-sm font-bold text-slate-800">Parsel çizimi ve taban oturumu</summary>
            <div className="mt-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  2D Parsel & Taban Oturumu Poligon Editörü
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  3D Model ile Canlı Senkronize
                </span>
              </div>
              <button
                type="button"
                onClick={() => goToStage(4)}
                className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                3D Önizlemede Gör (4. Aşama) →
              </button>
            </div>
            <InteractiveFootprintCanvas
              points={activePoints}
              onChangePoints={handlePolygonPointsChange}
              facadeConfigs={params.facadeConfigs || activeBuildingModelParams.facadeConfigs}
              onChangeFacadeConfigs={(configs) => {
                onChangeParams({ facadeConfigs: configs });
                if (!onUpdateBuildingModelParams) {
                  setInternalBuildingModelParams((prev) => ({ ...prev, facadeConfigs: configs }));
                }
              }}
              mainEntranceIndex={params.mainEntranceFacadeIndex ?? activeBuildingModelParams.mainEntranceFacadeIndex ?? 0}
              onChangeMainEntranceIndex={(idx) => {
                onChangeParams({ ...params, mainEntranceFacadeIndex: idx });
                if (!onUpdateBuildingModelParams) {
                  setInternalBuildingModelParams((prev) => ({ ...prev, mainEntranceFacadeIndex: idx }));
                }
              }}
              flatsPerFloor={params.flatsPerFloor || 2}
              theme={theme}
              compact
              roads={activeBuildingModelParams.roads}
              onChangeRoads={(newRoads) => handleUpdateBuildingModel({ roads: newRoads })}
              stairWidth={activeBuildingModelParams.stairWidth}
              stairDepth={activeBuildingModelParams.stairDepth}
              elevatorWidth={activeBuildingModelParams.elevatorWidth}
              elevatorDepth={activeBuildingModelParams.elevatorDepth}
              elevatorCount={params.elevatorCount ?? activeBuildingModelParams.elevatorCount}
              coreOffsetX={activeBuildingModelParams.coreOffsetX}
              coreOffsetY={activeBuildingModelParams.coreOffsetY}
              corePositionPreset={activeBuildingModelParams.corePositionPreset}
              onChangeCoreParams={(coreUpdates) => handleUpdateBuildingModel(coreUpdates)}
            />
            </div>
          </details>

          <div className="space-y-4">
              {/* 1. GRUP: MEVCUT BİNALAR & HAK DAĞILIMI ENVANTERİ */}
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
                      Mevcut ({totalExistingFlats} Konut + {totalExistingShops} Ticari) ➡️ Yeni Planlanan ({plannedKonutCount} Konut + {plannedShopCount} Dükkan{plannedBasementShopCount > 0 ? ` + ${plannedBasementShopCount} Bodrum İş yeri` : ''})
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
            </div>
          </div>
      )}

      {/* 3. AŞAMA: MİMARİ TASARIM VE YAPILANDIRMA */}
      {workbenchStage === 3 && (
        <div className="space-y-5 animate-fade-in">
        <div className={`${bgCard} rounded-2xl border p-4 shadow-xs sm:p-6 space-y-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={`text-lg font-bold ${textTitle}`}>Yeni bina planı</h2>
            <button
              type="button"
              onClick={() => goToStage(2)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
              title="Arsa ve taban oturumunu 2. aşamada düzenle"
            >
              Taban oturumu {params.baseBuildArea.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} m² · 2. aşamada düzenle
            </button>
          </div>

              {/* PLANLANAN YENİ BİNA PARAMETRELERİ */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* GRUP 1: YAPI GEOMETRİSİ (6 Columns) */}
                  <div className="md:col-span-6 p-3.5 rounded-xl bg-slate-50/50 border border-slate-200/60 space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/40">
                      <div className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-bold text-slate-800">Kat ve yapı ölçüleri</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                      {/* Normal Kat Sayısı */}
                      <div>
                        <label htmlFor="minimalFloorCountInput" className="block text-xs font-bold text-slate-700 mb-1">
                          Kat sayısı (zemin dahil, bodrum hariç)
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
                            onChangeParams({
                              floorCount: val === '' ? 0 : parsed,
                            });
                          }}
                          className={`w-full text-xs font-black font-mono px-2.5 py-1.5 rounded-lg border ${inputBg}`}
                        />
                        {params.floorCount > 0 && (
                          <span className="mt-1 block text-xs text-slate-600">
                            Zemin + {params.floorCount - 1} normal kat
                          </span>
                        )}
                      </div>

                      {/* Kat Yüksekliği */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                          📏 Kat H (m)
                        </label>
                        <input
                          id="minimalFloorHeightInput"
                          type="number"
                          step={0.05}
                          min={2.5}
                          max={4.5}
                          value={params.floorHeight || 2.9}
                          onChange={(e) => onChangeParams({ floorHeight: parseFloat(e.target.value) || 2.9 })}
                          className={`w-full text-xs font-bold font-mono px-2.5 py-1.5 rounded-lg border ${inputBg}`}
                        />
                      </div>

                      <div>
                        <label className="flex min-h-9 items-center gap-2 text-sm font-semibold">
                          <input type="checkbox" checked={(params.balconyDepth ?? 1.4) > 0}
                            onChange={e => onChangeParams({ balconyDepth: e.target.checked ? 1.4 : 0 })} />
                          Balkon
                          <span aria-hidden="true" className="text-xs text-slate-600">{(params.balconyDepth ?? 1.4) > 0 ? 'Açık' : 'Kapalı'}</span>
                        </label>
                        {(params.balconyDepth ?? 1.4) > 0 && (
                          <input aria-label="Balkon derinliği (m)" type="number" step="0.1" min="0" max="3"
                            value={params.balconyDepth ?? 1.4}
                            onChange={e => onChangeParams({ balconyDepth: Math.max(0, Number(e.target.value)) })}
                            className={`w-full rounded-lg border px-2.5 py-1.5 text-sm ${inputBg}`} />
                        )}
                      </div>

                      <div id="stage3ElevatorGroup">
                        <label className="flex min-h-9 items-center gap-2 text-sm font-semibold">
                          <input type="checkbox" checked={(params.elevatorCount ?? 1) > 0}
                            onChange={e => onChangeParams({ elevatorCount: e.target.checked ? 1 : 0 })} />
                          Asansör
                          <span aria-hidden="true" className="text-xs text-slate-600">{(params.elevatorCount ?? 1) > 0 ? 'Açık' : 'Kapalı'}</span>
                        </label>
                        {(params.elevatorCount ?? 1) > 0 && (
                          <select aria-label="Asansör adedi" value={params.elevatorCount ?? 1}
                            onChange={e => onChangeParams({ elevatorCount: Number(e.target.value) })}
                            className={`w-full rounded-lg border px-2.5 py-1.5 text-sm ${inputBg}`}>
                            <option value={1}>1 asansör</option>
                            <option value={2}>2 asansör</option>
                            <option value={3}>3 asansör</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* GRUP 2: BAĞIMSIZ BÖLÜM PLANLAMA (6 Columns) */}
                  <div className="md:col-span-6 p-3.5 rounded-xl bg-indigo-50/30 border border-indigo-100/60 space-y-3.5">
                    <div className="flex items-center gap-2 pb-2 border-b border-indigo-200/40">
                      <Layout className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-bold text-slate-800">Daire planı</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                      <div className="space-y-3">
                        {/* Katta Daire Sayısı */}
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
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
                              onChangeParams({
                                flatsPerFloor: val === '' ? 0 : parsed,
                              });
                            }}
                            className={`w-full text-xs font-black font-mono px-2.5 py-1.5 rounded-lg border ${inputBg}`}
                          />
                        </div>

                        {/* Daire Oda Planı */}
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                            🚪 Varsayılan Oda Planı
                          </label>
                          <select
                            id="minimalRoomTypeSelect"
                            value={params.roomType || '3+1'}
                            onChange={(e) => onChangeParams({ roomType: e.target.value as RoomType })}
                            className="w-full text-[11px] font-bold px-2.5 py-1.5 rounded-lg border bg-white border-slate-200"
                          >
                            <option value="1+1">1+1 Stüdyo</option>
                            <option value="2+1">2+1 Standart</option>
                            <option value="3+1">3+1 Geniş</option>
                            <option value="4+1">4+1 Lüks</option>
                            <option value="5+1">5+1 Büyük</option>
                          </select>
                        </div>
                      </div>

                      {/* Toplam Bağımsız Bölüm (Display) */}
                      <div className="p-3 rounded-xl bg-white border border-indigo-100 shadow-sm space-y-1.5 h-full flex flex-col justify-between">
                        <span className="block text-[10px] font-extrabold text-indigo-500 uppercase">Hesaplanan Toplam</span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-black text-slate-900 font-mono">
                            {results.unitBreakdown?.totalUnits || calculateFlatCount(params)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">BÖLÜM</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1 pt-1.5 border-t border-slate-50">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-100">
                            {results.unitBreakdown ? results.unitBreakdown.residentialCount : (resFloors * newFlatsPerFloor)} Konut
                          </span>
                          {(results.unitBreakdown ? results.unitBreakdown.commercialCount > 0 : newHasShop) && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[9px] font-bold border border-amber-100">
                              {results.unitBreakdown ? results.unitBreakdown.commercialCount : newShopCount} Dükkan
                            </span>
                          )}
                          {results.unitBreakdown?.mansardUnitsCount ? (
                            <span className="px-1.5 py-0.5 rounded bg-fuchsia-50 text-fuchsia-700 text-[9px] font-bold border border-fuchsia-100">
                              {results.unitBreakdown.mansardUnitsCount} Mansart
                            </span>
                          ) : null}
                          {(results.unitBreakdown?.basementUnitsCount ?? 0) > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[9px] font-bold border border-purple-100">
                              {results.unitBreakdown.basementUnitsCount} Bodrum
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alt Satır: Bodrum, Zemin Kat Dükkan, Çatı ve Konsol Çıkma (Modernized Cards) */}
                <section aria-labelledby="stage3-building-options" className="space-y-3 border-t border-slate-200 pt-4">
                  <h3 id="stage3-building-options" className={`text-sm font-bold ${textTitle}`}>Bodrum, dükkân, çatı ve çıkma</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Bodrum Kat Grubu */}
                  <div id="stage3BasementCard" className={`p-3.5 rounded-xl border transition-all ${
                    (params.basementCount !== undefined ? params.basementCount > 0 : true)
                      ? 'bg-indigo-50/20 border-indigo-200 shadow-3xs ring-1 ring-indigo-50'
                      : 'bg-slate-50/50 border-slate-200 opacity-80'
                  } space-y-3`}>
                    <div className="flex items-center justify-between">
                      <label className="flex min-h-9 flex-wrap items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(params.basementCount ?? 1) > 0}
                          disabled={shopRequiresBasement && (params.basementCount ?? 1) > 0}
                          onChange={(e) => onChangeParams({ ...params, basementCount: e.target.checked ? 1 : 0 })}
                          className="w-4 h-4 text-indigo-600 rounded-md cursor-pointer"
                        />
                        <span>Bodrum kat</span>
                        <span aria-hidden="true" className={`rounded-md px-2 py-0.5 text-xs ${(params.basementCount ?? 1) > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          {(params.basementCount ?? 1) > 0 ? 'Açık' : 'Kapalı'}
                        </span>
                      </label>
                      {shopRequiresBasement && (
                      <p className="text-xs text-indigo-800">Dükkân konumu bodrum içeriyor. Bodrumu kapatmak için önce dükkân konumunu Zemin yapın veya dükkânı kapatın.</p>
                    )}
                    {(params.basementCount !== undefined ? params.basementCount > 0 : true) && (
                        <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                          <input
                            type="number"
                            min={1}
                            max={5}
                            value={params.basementCount || 1}
                            onChange={(e) => onChangeParams({ ...params, basementCount: parseInt(e.target.value) || 1 })}
                            className="w-10 text-xs font-black font-mono bg-transparent text-indigo-700 outline-none"
                          />
                          <span className="text-[10px] text-indigo-400 font-bold">KAT</span>
                        </div>
                      )}
                    </div>
                    {(params.basementCount !== undefined ? params.basementCount > 0 : true) ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Ünite Dağılımı</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newUnits = [...(params.basementConfig || [])];
                              newUnits.push({ id: Date.now().toString(), type: 'commercial_shop', count: 1 });
                              onChangeParams({ ...params, basementConfig: newUnits });
                            }}
                            className="text-[9px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full hover:bg-indigo-700 transition-colors"
                          >
                            + EKLE
                          </button>
                        </div>
                        
                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                          {(!params.basementConfig || params.basementConfig.length === 0) ? (
                            <div className="p-2 border border-dashed border-slate-300 rounded-lg text-center bg-white/50">
                              <p className="text-[9px] text-slate-400 font-medium leading-tight">
                                Henüz ünite eklenmedi. Hızlı seçim için aşağıyı kullanın veya ekle butonuna basın.
                              </p>
                              <select
                                value={params.basementPurpose || 'shelter_depot'}
                                onChange={(e) => onChangeParams({ ...params, basementPurpose: e.target.value })}
                                className="mt-1.5 w-full text-[10px] font-bold px-2 py-1 rounded-md border bg-white border-indigo-100"
                              >
                                <option value="shelter_depot">🛡️ Sığınak & Depo</option>
                                <option value="parking">🚗 Otopark</option>
                                <option value="commercial_shop">🏪 Ticari İşyeri</option>
                                <option value="residential">🏠 Konut (Daire)</option>
                              </select>
                            </div>
                          ) : (
                            params.basementConfig.map((unit, idx) => (
                              <div key={unit.id} className="bg-white border border-indigo-100 rounded-lg p-2 flex flex-col gap-1.5 shadow-xs relative group/unit">
                                <button 
                                  onClick={() => {
                                    const newUnits = params.basementConfig?.filter(u => u.id !== unit.id);
                                    onChangeParams({ ...params, basementConfig: newUnits });
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover/unit:opacity-100 transition-opacity"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={unit.type}
                                    onChange={(e) => {
                                      const newUnits = [...(params.basementConfig || [])];
                                      newUnits[idx] = { ...unit, type: e.target.value as any };
                                      onChangeParams({ ...params, basementConfig: newUnits });
                                    }}
                                    className="flex-1 text-[10px] font-bold bg-transparent outline-none border-b border-indigo-50"
                                  >
                                    <option value="commercial_shop">🏪 İşyeri (B.B.)</option>
                                    <option value="shop_storage">📦 Zemin Dükkan Deposu (Bodrum)</option>
                                    <option value="residential">🏠 Konut (B.B.)</option>
                                    <option value="shelter">🛡️ Sığınak</option>
                                    <option value="parking">🚗 Otopark</option>
                                    <option value="storage">📦 Depo/Ortak Alan</option>
                                  </select>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <input
                                      type="number"
                                      min={1}
                                      value={unit.count}
                                      onChange={(e) => {
                                        const newUnits = [...(params.basementConfig || [])];
                                        newUnits[idx] = { ...unit, count: parseInt(e.target.value) || 1 };
                                        onChangeParams({ ...params, basementConfig: newUnits });
                                      }}
                                      className="w-6 text-[10px] font-black text-center bg-indigo-50 rounded"
                                    />
                                    <span className="text-[9px] font-bold text-slate-400">Adet</span>
                                  </div>
                                </div>
                                <input
                                  type="text"
                                  placeholder="Açıklama (opsiyonel)..."
                                  value={unit.description || ''}
                                  onChange={(e) => {
                                    const newUnits = [...(params.basementConfig || [])];
                                    newUnits[idx] = { ...unit, description: e.target.value };
                                    onChangeParams({ ...params, basementConfig: newUnits });
                                  }}
                                  className="text-[9px] font-medium text-slate-500 bg-transparent border-none focus:ring-0 p-0"
                                />
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic">Bodrum kat planlanmadı</div>
                    )}
                  </div>

                  {/* Zemin Kat Dükkan Grubu */}
                  <div className={`p-3.5 rounded-xl border transition-all ${
                    !!params.hasGroundFloorShop
                      ? 'bg-amber-50/20 border-amber-200 shadow-3xs ring-1 ring-amber-50'
                      : 'bg-slate-50/50 border-slate-200 opacity-80'
                  } space-y-3`}>
                    <div className="flex items-center justify-between">
                      <label className="flex min-h-9 flex-wrap items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!params.hasGroundFloorShop}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            const footprintResult = calculateFootprint(params.footprintInputMode, params);
                            const baseArea = params.baseBuildArea || footprintResult.area || 100;
                            onChangeParams({
                              ...params,
                              hasGroundFloorShop: isChecked,
                              shopCount: isChecked ? params.shopCount || 1 : 0,
                              shopArea: isChecked ? (params.shopArea && params.shopArea > 0 ? params.shopArea : baseArea) : params.shopArea
                            });
                          }}
                          className="w-4 h-4 text-amber-600 rounded-md cursor-pointer"
                        />
                        <span>Zemin dükkân</span>
                        <span aria-hidden="true" className={`rounded-md px-2 py-0.5 text-xs ${params.hasGroundFloorShop ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          {params.hasGroundFloorShop ? 'Açık' : 'Kapalı'}
                        </span>
                      </label>
                      {params.hasGroundFloorShop && (
                        <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-lg border border-amber-200">
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={params.shopCount || 1}
                            onChange={(e) => onChangeParams({ ...params, shopCount: parseInt(e.target.value) || 1 })}
                            className="w-10 text-xs font-black font-mono bg-transparent text-amber-700 outline-none"
                          />
                          <span className="text-[10px] text-amber-400 font-bold">ADET</span>
                        </div>
                      )}
                    </div>
                    {params.hasGroundFloorShop ? (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={params.shopLocation || 'ground'}
                            onChange={(e) => {
                              const shopLocation = e.target.value as ShopLocation;
                              onChangeParams({
                                shopLocation,
                                basementCount: shopLocation === 'ground' ? params.basementCount : Math.max(1, params.basementCount ?? 1),
                              });
                            }}
                            className="text-[10px] font-bold px-2 py-1.5 rounded-lg border bg-white border-amber-100"
                          >
                            <option value="ground">Zemin</option>
                            <option value="basement">Bodrum</option>
                            <option value="both">Zemin + Bodrum</option>
                          </select>
                          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-amber-100">
                            <span className="text-[9px] text-amber-400 font-black">H:</span>
                            <input
                              type="number"
                              step={0.1}
                              min={2.8}
                              max={5.5}
                              value={params.shopHeight || 3.8}
                              onChange={(e) => onChangeParams({ shopHeight: parseFloat(e.target.value) || 3.8 })}
                              className="w-10 text-xs font-black font-mono bg-transparent text-amber-700 outline-none"
                            />
                            <span className="text-[9px] text-amber-400 font-black">m</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-amber-100/60">
                          <div>
                            <span className="text-[10px] font-bold text-amber-900/70 block">Ortalama Dükkan (Brüt):</span>
                            <span className="text-[9px] text-emerald-700 font-bold block font-mono">
                              Net Tahmini: ~{Math.round((params.shopArea || 80) * 0.82)} m² (%82)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-amber-200">
                            <input
                              type="number"
                              min={10}
                              max={2000}
                              value={params.shopArea || 80}
                              onChange={(e) => onChangeParams({ shopArea: parseFloat(e.target.value) || 80 })}
                              className="w-12 text-xs font-black font-mono bg-transparent text-amber-700 outline-none"
                            />
                            <span className="text-[10px] text-amber-400 font-bold">m²</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic">Zeminde konut daireleri planlandı</div>
                    )}
                  </div>

                  {/* Çatı Tipi Grubu */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="text-[11px] font-black text-slate-800 flex items-center gap-2">
                      <Home className="w-4 h-4 text-slate-600" />
                      <span className="uppercase tracking-tight">🏠 Çatı & Çatı Arası</span>
                    </div>
                    <div className="space-y-2.5">
                      <select
                        value={params.roofType || 'gable'}
                        onChange={(e) => onChangeParams({ roofType: e.target.value as any })}
                        className="w-full text-[11px] font-bold px-2.5 py-1.5 rounded-lg border bg-white border-slate-200"
                      >
                        <option value="gable">📐 Kırma Çatı</option>
                        <option value="flat">🧱 Teras Çatı (Düz)</option>
                        <option value="mansard">🏢 Mansart Çatı</option>
                        <option value="duplex">💎 Çatı Dubleksi</option>
                      </select>
                      {(params.roofType === 'mansard' || params.roofType === 'duplex') && (
                        <div className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-100">
                          <select
                            value={params.roofAtticType || (params.roofType === 'mansard' ? 'independent' : 'duplex_unified')}
                            onChange={(e) => onChangeParams({ roofAtticType: e.target.value as any })}
                            className="w-full text-[10px] font-bold bg-transparent outline-none text-slate-600"
                          >
                            <option value="duplex_unified">🔗 Alt Katla Birleşik</option>
                            <option value="independent">🚪 Bağımsız Ayrı Daire</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Konsol Çıkma Grubu */}
                  <div id="stage3CantileverCard" className={`p-3.5 rounded-xl border transition-all ${
                    !!params.hasCantilever
                      ? 'bg-emerald-50/20 border-emerald-200 shadow-3xs ring-1 ring-emerald-50'
                      : 'bg-slate-50/50 border-slate-200 opacity-80'
                  } space-y-3`}>
                    <div className="flex items-center justify-between">
                      <label className="flex min-h-9 flex-wrap items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!params.hasCantilever}
                          onChange={(e) => onChangeParams({
                            ...params,
                            hasCantilever: e.target.checked,
                            cantileverDepth: e.target.checked ? params.cantileverDepth || 1.20 : 0
                          })}
                          className="w-4 h-4 text-emerald-600 rounded-md cursor-pointer"
                        />
                        <span>Konsol çıkma</span>
                        <span aria-hidden="true" className={`rounded-md px-2 py-0.5 text-xs ${params.hasCantilever ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          {params.hasCantilever ? 'Açık' : 'Kapalı'}
                        </span>
                      </label>
                      {params.hasCantilever && params.cantileverDirection !== 'custom' && (
                        <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                          <input
                            type="number"
                            step={0.1}
                            min={0.2}
                            max={3.0}
                            aria-label="Genel çıkma derinliği (m)"
                            value={params.cantileverDepth || 1.2}
                            onChange={(e) => onChangeParams({ ...params, cantileverDepth: parseFloat(e.target.value) || 1.2 })}
                            className="w-10 text-xs font-black font-mono bg-transparent text-emerald-700 outline-none"
                          />
                          <span className="text-[10px] text-emerald-400 font-bold">m</span>
                        </div>
                      )}
                    </div>
                    {params.hasCantilever && (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold">
                          Çıkma yapılacak cepheler
                          <select value={params.cantileverDirection === 'open_facades' ? 'all' : params.cantileverDirection || 'front_back'}
                            onChange={e => onChangeParams({
                              cantileverDirection: e.target.value as ProjectParams['cantileverDirection'],
                              facadeCantilevers: e.target.value === 'custom'
                                ? cantileverInfo.facades.map(facade => facade.cantileverDepth)
                                : [],
                            })}
                            className="mt-1 w-full rounded-lg border border-emerald-100 bg-white px-2.5 py-2 text-sm text-emerald-900">
                            <option value="all">Uygun tüm cepheler</option>
                            <option value="front">Ön cephe</option>
                            <option value="front_back">Ön ve arka cephe</option>
                            <option value="custom">Cepheye göre ayrı ölçü</option>
                          </select>
                        </label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {cantileverInfo.facades.map(facade => (
                            <label key={facade.index} className="rounded-lg border border-slate-200 bg-white p-2 text-xs">
                              <span className="block font-semibold">{facade.name}</span>
                              {params.cantileverDirection === 'custom' && !facade.isBlind ? (
                                <input aria-label={`${facade.name} çıkma derinliği (m)`} type="number" min="0" max="3" step="0.1"
                                  value={facade.cantileverDepth}
                                  onChange={e => {
                                    const depth = Math.min(3, Math.max(0, Number(e.target.value)));
                                    onChangeParams({ facadeCantilevers: cantileverInfo.facades.map(item =>
                                      item.index === facade.index ? depth : item.cantileverDepth) });
                                  }}
                                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1" />
                              ) : (
                                <span className="mt-1 block text-slate-600">
                                  {facade.isBlind ? 'Kör / bitişik cephe' : `${facade.cantileverDepth.toLocaleString('tr-TR')} m`}
                                </span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                </section>
              </div>
        </div>

        {/* KAT BAZLI BAĞIMSIZ BÖLÜM ŞEMASI & DAİRE DAĞILIMI (3. Aşama — Mimari Yapılandırma) */}
        <div className={`${bgCard} rounded-2xl p-6 border shadow-xs space-y-4`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
            <h2 className={`text-base font-bold ${textTitle}`}>Katlara göre bölüm dağılımı</h2>
            <p className={`mt-1 text-xs ${textMuted}`}>
              Z+{(params.floorCount || 5) - 1} Kat Yapısı • {params.hasGroundFloorShop ? `${params.shopCount || 1} Dükkan + ` : ''}{newFlatCount} Bağımsız Bölüm • Katta {params.flatsPerFloor || 2} Daire {params.roofType === 'mansard' ? '• Mansart Çatı' : params.roofType === 'duplex' ? '• Çatı Dubleksi' : ''}
            </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200" title="Sığınak, otopark, kazan dairesi, merdiven ve asansör şaftları inşaat alanı ve maliyet hesaplamalarına dahil edilmiştir.">
                🛡️ Ortak Alanlar Hesaba Dahil
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-100 text-purple-800">
                {newTotalConstructionArea.toLocaleString('tr-TR')} m² Toplam İnşaat
              </span>
              {wizardMode && (
                <button
                  type="button"
                  onClick={() => goToStage(2)}
                  className="px-3 py-1 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Arsa ve ölçü parametrelerini düzenle"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Ölçüleri Düzenle</span>
                </button>
              )}
            </div>
          </div>

          {/* BAĞIMSIZ BÖLÜM VE KAT BAZLI DAĞILIM ŞEMASI */}
          <div id="stage3FlatsMatrixSection" className="space-y-4">
            {params.projectModel === 'contractorShare' && (
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
            )}

            {/* Daire ve Dükkan Kat Bazlı Dağılım Grid */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">Kat paylaşım şeması</h3>
                <div role="group" aria-label="Kat paylaşımı görünümü" className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
                  {([
                    ['grid', 'Kat listesi'],
                    ['drawing', 'Bina şeması'],
                  ] as const).map(([mode, label]) => (
                    <button key={mode} type="button" aria-pressed={viewMode === mode}
                      onClick={() => setViewMode(mode)}
                      className={`min-h-10 rounded-md px-3 text-sm font-semibold ${viewMode === mode
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-700 hover:bg-white'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <summary className="cursor-pointer py-1 text-sm font-semibold text-slate-800">Toplu işlemler ve geri yükleme</summary>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleEqualizeFloorAreas}
                    className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg shadow-xs transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    title="Kat alanını kattaki dairelere tam eşit olarak paylaştırır ve kat düzenini hizalar"
                  >
                    <Scale className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Kat Alanını Eşit Paylaştır</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const totalCount = params.flats.length;
                      const rate = (params.contractorShareRate ?? 50) / 100;
                      const targetContractorCount = Math.round(totalCount * rate);
                      // En üst katlardan başlayarak müteahhide ata
                      const sortedFlatsByFloorDesc = [...params.flats].sort(
                        (a, b) => (b.floorNumber ?? 0) - (a.floorNumber ?? 0) || b.id - a.id
                      );
                      const contractorFlats = sortedFlatsByFloorDesc.slice(0, targetContractorCount);
                      const contractorIds = contractorFlats.map((f) => f.id);
                      const updatedFlats = params.flats.map((f) => ({
                        ...f,
                        isContractorShare: contractorIds.includes(f.id),
                      }));
                      onChangeParams({ ...params, contractorFlatIds: contractorIds, flats: updatedFlats });
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-xs transition-transform active:scale-95 flex items-center gap-1"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Otomatik Dağıt (%{params.contractorShareRate ?? 50})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const updatedFlats = params.flats.map((f) => ({ ...f, isContractorShare: false }));
                      onChangeParams({ ...params, contractorFlatIds: [], flats: updatedFlats });
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-transform active:scale-95"
                  >
                    Tümü Hak Sahibi
                  </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBackupParams(JSON.parse(JSON.stringify(params)));
                        alert('Geri yükleme noktası oluşturuldu.');
                      }}
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      title="Geri Yükleme Noktası Oluştur"
                    >
                      Geri yükleme noktası oluştur
                    </button>
                    
                    {backupParams && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Kaydedilen geri yükleme noktasına dönmek istiyor musunuz? Mevcut değişiklikler kaybolacaktır.')) {
                            onChangeParams(backupParams);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors animate-pulse"
                        title="Geri Yükle"
                      >
                        Geri yükle
                      </button>
                    )}
                </div>
              </details>

              {equalizeSuccessToast && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{equalizeSuccessToast}</span>
                </div>
              )}

              {/* ÖZET İSTATİSTİK ROZETLERİ */}
              {(() => {
                const displayedFlats = groupedFlats.flatMap(([, flats]) => flats);
                const totalFlats = displayedFlats.length;
                const contractorFlats = displayedFlats.filter(
                  (f) => (params.contractorFlatIds || []).includes(f.id) || !!f.isContractorShare
                );
                const ownerFlats = displayedFlats.filter(
                  (f) => !(params.contractorFlatIds || []).includes(f.id) && !f.isContractorShare
                );
                const totalArea = displayedFlats.reduce((sum, f) => sum + (f.area || 0), 0);
                const contractorArea = contractorFlats.reduce((sum, f) => sum + (f.area || 0), 0);
                const ownerArea = ownerFlats.reduce((sum, f) => sum + (f.area || 0), 0);

                return (
                  <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/80 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <span className="text-[11px] font-bold text-slate-600">Toplam Bölüm:</span>
                      <span className="font-mono font-black text-slate-900">{totalFlats} Adet ({totalArea.toFixed(0)} m²)</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <span className="text-[11px] font-bold text-amber-800">Müteahhit Payı:</span>
                      <span className="font-mono font-black text-amber-950">{contractorFlats.length} Adet ({contractorArea.toFixed(0)} m²)</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <span className="text-[11px] font-bold text-emerald-800">Hak Sahipleri:</span>
                      <span className="font-mono font-black text-emerald-950">{ownerFlats.length} Adet ({ownerArea.toFixed(0)} m²)</span>
                    </div>
                  </div>
                );
              })()}

              <div className="relative">
                {viewMode === 'drawing' ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        Şema içeriği
                        <select value={schematicDetailMode}
                          onChange={e => setSchematicDetailMode(e.target.value as 'financial' | 'architectural')}
                          className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">
                          <option value="architectural">Mimari görünüm</option>
                          <option value="financial">Mali detaylar</option>
                        </select>
                      </label>
                      <button type="button" onClick={() => exportSchematic('png')}
                        className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold">PNG indir</button>
                      <button type="button" onClick={() => exportSchematic('pdf')}
                        className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold">PDF indir</button>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:p-4">
                    <div ref={schematicRef} style={{ backgroundColor: '#f8fafc', padding: '16px' }}
                      className="mx-auto min-w-[520px] max-w-4xl">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-800">Bina paylaşım şeması</h4>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                          <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-900">Müteahhit</span>
                          <span className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-800">Hak sahibi</span>
                        </div>
                      </div>

                      {/* Building Floors Stacked */}
                      <div className="flex flex-col w-full border-l-4 border-slate-300">
                        {groupedFlats.map(([floor, floorFlats]) => {
                          const sortedFloorFlats = [...floorFlats].sort((a, b) => a.id - b.id);
                          const floorNum = Number(floor);
                          const isMansard = sortedFloorFlats.some(f => f.flatType === 'mansard' || (f.description || '').toLowerCase().includes('mansart'));
                          const isShopFloor = floorNum === 0 && sortedFloorFlats.some(f => f.flatType === 'shop');
                          
                          return (
                            <div key={floor} className="flex group min-h-[82px]">
                              {/* Floor Label (Elevation) */}
                              <div className="w-24 shrink-0 flex items-center justify-end pr-3.5 text-[10px] font-mono border-r-2 border-slate-300 relative bg-slate-50/70 select-none">
                                <span className="absolute -right-[5px] w-2.5 h-[2px] bg-slate-400"></span>
                                <div className="text-right">
                                  <div className="flex items-center justify-end gap-0.5 font-bold text-slate-700 leading-tight">
                                    <span className="text-[7.5px] text-slate-400">▼</span>
                                    <span>{floorNum > 0 ? `+${(floorNum * 3).toFixed(2)}` : floorNum === 0 ? '±0.00' : `${(floorNum * 3).toFixed(2)}`}</span>
                                  </div>
                                  <div className={`text-[8px] font-bold mt-0.5 tracking-wider ${floorNum === 0 ? 'text-blue-700 font-black' : 'text-slate-400'}`}>
                                    {floorNum === 0 ? 'ZEMİN KOTU' : floorNum > 0 ? `${floorNum}. KAT` : `B${Math.abs(floorNum)} BODRUM`}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Floor Structure */}
                              <div 
                                style={{ 
                                  backgroundColor: floorNum < 0 ? '#f8fafc' : floorNum === 0 ? '#f0f9ff' : '#ffffff',
                                  borderBottom: floorNum === 0 ? '3px solid #64748b' : '2px solid #cbd5e1'
                                }}
                                className={`flex-1 flex gap-2 p-2.5 relative transition-colors ${
                                  isMansard ? 'rounded-t-2xl border-t-4 border-slate-400 mt-2' : ''
                                }`}
                              >
                                {sortedFloorFlats.map(flat => {
                                  const isContractor = (params.contractorFlatIds || []).includes(flat.id) || !!flat.isContractorShare;
                                  const fr = results.flatResults?.find((f) => f.id === flat.id);
                                  
                                  // Clean architectural hex color palette for html2canvas compatibility
                                  const getFlatStyles = () => {
                                    if (isContractor) return { backgroundColor: '#fffbeb', borderColor: '#f59e0b', color: '#78350f' };
                                    if (flat.flatType === 'shelter') return { backgroundColor: '#f0fdf4', borderColor: '#86efac', color: '#14532d' };
                                    if (flat.flatType === 'parking') return { backgroundColor: '#f1f5f9', borderColor: '#94a3b8', color: '#1e293b' };
                                    if (flat.flatType === 'storage') return { backgroundColor: '#fff7ed', borderColor: '#fdba74', color: '#9a3412' };
                                    if (flat.flatType === 'shop' || floorNum === 0) return { backgroundColor: '#f0f7ff', borderColor: '#93c5fd', color: '#1e3a8a' };
                                    if (floorNum < 0) return { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#334155' };
                                    return { backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b' };
                                  };
                                  
                                  const flatStyle = getFlatStyles();

                                  return (
                                    <div 
                                      key={flat.id}
                                      style={{
                                        backgroundColor: flatStyle.backgroundColor,
                                        borderColor: flatStyle.borderColor,
                                        color: flatStyle.color,
                                        borderWidth: isContractor ? '2px' : '1.5px',
                                        borderStyle: 'solid'
                                      }}
                                      onClick={() => {
                                        const currentIds = params.contractorFlatIds || [];
                                        const nextIsContractor = !isContractor;
                                        const newIds = nextIsContractor
                                          ? [...new Set([...currentIds, flat.id])]
                                          : currentIds.filter((id) => id !== flat.id);
                                        const updatedFlats = params.flats.map((f) =>
                                          f.id === flat.id ? { ...f, isContractorShare: nextIsContractor } : f
                                        );
                                        onChangeParams({ ...params, contractorFlatIds: newIds, flats: updatedFlats });
                                      }}
                                      className={`flex-1 min-w-[115px] min-h-[72px] rounded-xl flex flex-col justify-between p-2 cursor-pointer transition-all hover:ring-3 hover:ring-indigo-400/30 hover:border-indigo-400 shadow-xs relative group/flat select-none ${
                                        isContractor ? 'shadow-md -translate-y-0.5 z-10' : ''
                                      }`}
                                    >
                                      {/* Kart Üst Başlık & Paydaş Rozeti */}
                                      <div className="flex items-start justify-between gap-1 w-full">
                                        <div className="flex flex-col text-left overflow-hidden">
                                          <span className="text-[10px] font-extrabold leading-tight text-slate-800 uppercase tracking-tight truncate" title={flat.name}>
                                            {flat.name}
                                          </span>
                                          <span className="text-[8px] font-medium text-slate-400 leading-none mt-0.5">
                                            {floorNum === 0 ? 'Zemin Kat' : floorNum < 0 ? 'Bodrum Kat' : `${floorNum}. Kat`}
                                          </span>
                                        </div>

                                        {/* Mülkiyet Durum Rozeti (Tıklanabilir) */}
                                        <div 
                                          className={`shrink-0 px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider ${
                                            isContractor
                                              ? 'bg-amber-500 text-white shadow-xs'
                                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                                          }`}
                                          title="Tıklayarak Müteahhit / Malik Payı Arasında Değiştirin"
                                        >
                                          {isContractor ? 'Müteahhit' : 'Malik'}
                                        </div>
                                      </div>

                                      {/* Alan & Tip Bilgisi */}
                                      <div className="flex items-center justify-between gap-1 mt-1.5 pt-1 border-t border-slate-100/90">
                                        <div className="inline-flex items-center gap-1 text-[9.5px] font-bold text-slate-700 bg-white/90 px-1.5 py-0.5 rounded-md border border-slate-200/70 shadow-2xs">
                                          {flat.flatType === 'shop' || flat.flatType === 'basement_shop' ? <Store className="w-3 h-3 text-blue-600" /> : 
                                           flat.flatType === 'shelter' ? <ShieldAlert className="w-3 h-3 text-emerald-600" /> :
                                           flat.flatType === 'parking' ? <Car className="w-3 h-3 text-slate-600" /> :
                                           flat.flatType === 'storage' ? <Box className="w-3 h-3 text-amber-600" /> :
                                           <Home className="w-3 h-3 text-indigo-600" />}
                                          <span>{flat.area} m²</span>
                                        </div>

                                        {flat.effectiveShareRatio ? (
                                          <span className="text-[8px] font-mono text-slate-400 font-bold">
                                            %{flat.effectiveShareRatio.toFixed(1)}
                                          </span>
                                        ) : null}
                                      </div>

                                      {/* Finansal Detaylar (Sadece Hak Sahipleri İçin ve Financial Modda) */}
                                      {(() => {
                                        if (schematicDetailMode !== 'financial') return null;
                                        const fr = results.flatResults?.find((f) => f.id === flat.id);
                                        if (!fr || isContractor || flat.flatType === 'shelter' || flat.flatType === 'parking' || flat.flatType === 'storage') return null;
                                        return (
                                          <div className="mt-1.5 pt-1 border-t border-slate-200/70 flex flex-col gap-0.5 text-[8px]">
                                            <div className="flex items-center justify-between text-slate-500 font-medium">
                                              <span>Birim: {new Intl.NumberFormat('tr-TR').format(Math.round(fr.effectiveUnitPrice || 0))} ₺</span>
                                              <span className="font-bold text-slate-800">{((fr.grossPay || 0) / 1_000_000).toFixed(2)}M ₺</span>
                                            </div>
                                            <div className="bg-emerald-50 text-emerald-800 border border-emerald-300/90 px-1.5 py-0.5 rounded-md font-bold text-center text-[8.5px] tracking-tight">
                                              Destekli: {new Intl.NumberFormat('tr-TR').format(Math.round(fr.netRemainingDebt || 0))} ₺
                                            </div>
                                          </div>
                                        );
                                      })()}

                                      {/* Price Input in Drawing Mode */}
                                      <div className="absolute inset-x-0 bottom-0 p-1 opacity-0 group-hover/flat:opacity-100 transition-opacity bg-black/10 rounded-b-xl backdrop-blur-xs z-20" onClick={(e) => e.stopPropagation()}>
                                        {isContractor ? (
                                          <input
                                            type="number"
                                            value={flat.salePrice || ''}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value) || 0;
                                              const updatedFlats = params.flats.map((f) => (f.id === flat.id ? { ...f, salePrice: val } : f));
                                              onChangeParams({ ...params, flats: updatedFlats });
                                            }}
                                            placeholder="Satış Değeri..."
                                            title="Müteahhit Dairesi Satış Değeri (TL)"
                                            className="w-full text-[8.5px] font-bold px-1.5 py-0.5 rounded border border-amber-300 bg-white/95 text-amber-950 focus:outline-hidden"
                                          />
                                        ) : (
                                          <div className="flex items-center gap-0.5 bg-white/95 px-1 py-0.5 rounded border border-slate-300 shadow-2xs">
                                            <input
                                              type="number"
                                              step="500"
                                              value={flat.manualUnitPrice || ''}
                                              onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                const updatedFlats = params.flats.map((f) => (f.id === flat.id ? { ...f, manualUnitPrice: val > 0 ? val : undefined } : f));
                                                onChangeParams({ ...params, flats: updatedFlats });
                                              }}
                                              placeholder={fr ? `${Math.round(fr.effectiveUnitPrice)} ₺` : 'Özel m² ₺'}
                                              title="Daireye özel m² birim maliyeti (TL). Boş bırakılırsa standart fiyat geçerlidir."
                                              className="w-full text-[8px] font-mono font-bold text-slate-800 focus:outline-hidden"
                                            />
                                            {flat.manualUnitPrice ? (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const updatedFlats = params.flats.map((f) => (f.id === flat.id ? { ...f, manualUnitPrice: undefined } : f));
                                                  onChangeParams({ ...params, flats: updatedFlats });
                                                }}
                                                className="text-[8px] font-bold text-slate-400 hover:text-red-500 px-0.5"
                                                title="Standart birim fiyata sıfırla"
                                              >
                                                ✕
                                              </button>
                                            ) : null}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Ground Line & Foundation */}
                      <div className="w-full mt-2">
                        {/* Tabii Zemin Seviyesi */}
                        <div className="flex items-center justify-between px-3 py-1 bg-slate-200/80 border-t-2 border-b border-slate-400 text-slate-700 text-[9px] font-mono font-bold">
                          <span>▼ ±0.00 TABİİ ZEMİN SEVİYESİ</span>
                          <span className="text-[8px] opacity-75">Kentsel Dönüşüm Parseli</span>
                        </div>

                        {/* Betonarme Radye Temel Kesiti */}
                        <div className="h-9 w-full bg-slate-300 border-b-4 border-slate-600 flex items-center justify-center relative overflow-hidden shadow-inner">
                          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-950 via-slate-700 to-transparent"></div>
                          <div className="flex items-center gap-2 relative z-10">
                            <Building2 className="w-3.5 h-3.5 text-slate-600" />
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.25em]">
                              RADYE TEMEL & ZEMİN KESİTİ (C35/45 BETONARME)
                            </span>
                          </div>
                        </div>

                        {/* Zemin Taşıyıcı Tabakası */}
                        <div className="h-7 w-full bg-slate-200/60 flex items-center justify-center gap-4 text-[8px] font-mono text-slate-500 border-dashed border-b border-slate-300">
                          <span className="w-16 h-0.5 bg-slate-300"></span>
                          <span>ZEMİN ETÜDÜ: ZB/ZC TAŞIYICI TABAKA</span>
                          <span className="w-16 h-0.5 bg-slate-300"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupedFlats.length > 0 ? (
                      <label className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        Gösterilecek kat
                        <select value={distributionFloor} onChange={e => setSelectedDistributionFloor(e.target.value)}
                          className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">
                          <option value="all">Tüm katlar</option>
                          {groupedFlats.map(([floor, flats]) => (
                            <option key={floor} value={floor}>
                              {Number(floor) === 0 ? 'Zemin kat' : Number(floor) < 0 ? `${Math.abs(Number(floor))}. bodrum kat` : `${floor}. kat`}
                              {' · '}{flats.length} bölüm
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : <p className="text-sm text-slate-600">Henüz bağımsız bölüm yok.</p>}
                    {visibleDistributionFloors.map(([floor, floorFlats]) => {
                  const sortedFloorFlats = [...floorFlats].sort((a, b) => a.id - b.id);
                  const isMansardFloor = sortedFloorFlats.some(
                    (f) => f.flatType === 'mansard' || (f.description || '').toLowerCase().includes('mansart')
                  );
                  return (
                    <div key={floor} className="space-y-2.5 border-t-2 border-indigo-200/90 pt-3">
                      <div className="flex flex-wrap items-center gap-2 px-1">
                        <div className="flex items-center gap-2 bg-indigo-700 text-white px-3 py-1 rounded-lg shadow-xs">
                          <Building2 className="w-3.5 h-3.5 text-indigo-200" />
                          <span className="text-xs font-black uppercase tracking-wider">
                            {Number(floor) === 0
                              ? '🏢 ZEMİN KAT'
                              : Number(floor) > 0
                              ? isMansardFloor
                                ? `🏢 ${floor}. KAT (ÇATIKATI MANSART)`
                                : `🏢 ${floor}. KAT`
                              : `🏢 ${Math.abs(Number(floor))}. BODRUM KAT`}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                          {sortedFloorFlats.length} bölüm · {sortedFloorFlats.reduce((sum, flat) => sum + (flat.area || 0), 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} m²
                        </span>
                      </div>
                        
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                          {sortedFloorFlats.map((flat) => {
                            const isContractor = (params.contractorFlatIds || []).includes(flat.id) || !!flat.isContractorShare;
                            const fr = results.flatResults?.find((f) => f.id === flat.id);
                            const styles = getFlatStyles(flat, isContractor);
                            return (
                              <div
                                key={flat.id}
                                className={`p-3 rounded-2xl border transition-all duration-300 space-y-2 text-xs relative overflow-hidden group ${styles}`}
                              >
                                <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 text-sm font-bold">
                                  <span className="min-w-0 break-words">{flat.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentIds = params.contractorFlatIds || [];
                                      const nextIsContractor = !isContractor;
                                      const newIds = nextIsContractor
                                        ? [...new Set([...currentIds, flat.id])]
                                        : currentIds.filter((id) => id !== flat.id);
                                      const updatedFlats = params.flats.map((f) =>
                                        f.id === flat.id ? { ...f, isContractorShare: nextIsContractor } : f
                                      );
                                      onChangeParams({ ...params, contractorFlatIds: newIds, flats: updatedFlats });
                                    }}
                                    aria-pressed={isContractor}
                                    aria-label={`${flat.name}: ${isContractor ? 'Müteahhit' : 'Hak sahibi'}. Payı değiştir`}
                                    className={`min-h-9 px-2 py-1 text-xs font-semibold rounded-lg cursor-pointer shadow-sm transition-transform active:scale-90 shrink-0 ${
                                      isContractor
                                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                    }`}
                                  >
                                    {isContractor ? 'Müteahhit' : 'Hak sahibi'}
                                  </button>
                                </div>
                                
                                <div className="text-[10px] opacity-70 flex items-center justify-between relative z-10">
                                  <span className="flex items-center gap-1 font-medium truncate">
                                    {flat.flatType === 'shop' || flat.flatType === 'basement_shop' ? <Store className="w-3 h-3 shrink-0" /> : <Home className="w-3 h-3 shrink-0" />}
                                    <span className="truncate">{flat.description || flat.flatType || 'Daire'}</span>
                                  </span>
                                  <span className="font-bold shrink-0 ml-1">{flat.area} m²</span>
                                </div>
                                
                                <div className="pt-2 border-t border-black/5 relative z-10">
                                  {isContractor ? (
                                    <>
                                      <div className="flex items-center justify-between mb-1">
                                        <label className="text-[9px] font-bold opacity-60 uppercase tracking-tighter">Satış Değeri</label>
                                        <span className="text-[9px] font-black text-indigo-600">TL</span>
                                      </div>
                                      <input
                                        type="number"
                                        aria-label={`${flat.name} satış değeri (TL)`}
                                        value={flat.salePrice || ''}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          const updatedFlats = params.flats.map((f) => (f.id === flat.id ? { ...f, salePrice: val } : f));
                                          onChangeParams({ ...params, flats: updatedFlats });
                                        }}
                                        placeholder="0"
                                        className="w-full text-[11px] font-mono font-bold px-2 py-1 rounded-lg border border-slate-200 bg-white/70 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all"
                                      />
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex items-center justify-between mb-1">
                                        <label className="text-[9px] font-bold opacity-60 uppercase tracking-tighter">Özel Birim Maliyet</label>
                                        <span className="text-[9px] font-black text-indigo-600">TL/m²</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          step="500"
                                          aria-label={`${flat.name} özel birim fiyatı (TL/m²)`}
                                          value={flat.manualUnitPrice || ''}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            const updatedFlats = params.flats.map((f) => (f.id === flat.id ? { ...f, manualUnitPrice: val > 0 ? val : undefined } : f));
                                            onChangeParams({ ...params, flats: updatedFlats });
                                          }}
                                          placeholder={fr ? `${Math.round(fr.effectiveUnitPrice)}` : 'Standart'}
                                          title="Daireye özel m² maliyeti (TL). Boş bırakılırsa standart fiyat uygulanır."
                                          className={`w-full text-[11px] font-mono font-bold px-2 py-1 rounded-lg border transition-all ${
                                            flat.manualUnitPrice
                                              ? 'bg-amber-50 border-amber-400 text-amber-900 ring-1 ring-amber-300'
                                              : 'border-slate-200 bg-white/70 focus:bg-white focus:ring-2 focus:ring-indigo-500/20'
                                          }`}
                                        />
                                        {flat.manualUnitPrice ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updatedFlats = params.flats.map((f) => (f.id === flat.id ? { ...f, manualUnitPrice: undefined } : f));
                                              onChangeParams({ ...params, flats: updatedFlats });
                                            }}
                                            className="text-[10px] font-bold text-slate-400 hover:text-red-500 px-1"
                                            title="Sıfırla"
                                          >
                                            ✕
                                          </button>
                                        ) : null}
                                      </div>
                                    </>
                                  )}
                                </div>
                                
                                {/* Background Pattern for specific types */}
                                {(flat.flatType === 'shop' || flat.flatType === 'basement_shop') && (
                                  <div className="absolute -right-2 -bottom-2 opacity-[0.03] rotate-12">
                                    <Store className="w-12 h-12" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
        </div>
      )}

      {/* 2. AŞAMA (DEVAM): OTOPARK HARCI & İMAR MEVZUAT DENETİMİ */}
      {workbenchStage === 2 && (
        <details className={`${bgCard} rounded-2xl p-4 border shadow-xs sm:p-6`}>
          <summary className="cursor-pointer text-sm font-bold text-slate-800">Otopark hesabı ve imar denetimi</summary>
          <div className="mt-4 space-y-5">
          {/* OTOPARK HARCI HESAPLAMA VE MEVZUAT TARAMA MODÜLÜ */}
          <div className="space-y-4">
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

          {/* MEVZUAT VE İMAR DENETİMİ PANELİ */}
          <div className="pt-4 border-t border-slate-100">
            <ZoningAuditPanel params={params} theme={theme} />
          </div>
          </div>
        </details>
      )}

      {/* 4. AŞAMA: 3D TASARIM VE GÖRSELLEŞTİRME (2. ve 3. Aşamayla Tek Kaynaktan Senkronize) */}
      {workbenchStage === 4 && (
        <BuildingModelTab
          params={activeBuildingModelParams}
          projectParams={params}
          projectName={params.projectName}
          projectAddress={params.projectAddress}
          landArea={params.landArea}
          onUpdateParams={handleUpdateBuildingModel}
          onSyncWithCalculator={onSyncModelToCalculator}
          onNavigateToSetup={() => goToStage(2)}
          onNavigateToCost={() => goToStage(6)}
          onNavigateToOwners={() => goToStage(7)}
          onNavigateToOffer={() => goToStage(8, undefined, { stage8SubView: 'offer' })}
          workbenchVisualizationMode={true}
          theme={theme}
        />
      )}

      {/* 5. AŞAMA: TEKNİK ŞARTNAME VE METRAJ */}
      {workbenchStage === 5 && (
        <div className="space-y-4 animate-fade-in">
          <div className={`${bgCard} rounded-2xl p-2 border shadow-xs flex flex-wrap items-center justify-between gap-2`}>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'spec' as const, label: 'Teknik Şartname', icon: FileText },
                { id: 'takeoff' as const, label: 'Metraj ve Keşif Cetveli', icon: FileSpreadsheet },
                { id: 'comfort' as const, label: `Konfor ve İnovatif Donanımlar (${activeComfortStats.count}/10)`, icon: Sparkles },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = stage5SubView === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStage5SubView(tab.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isGray
                          ? 'text-slate-300 hover:bg-slate-700/60'
                          : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => goToStage(6)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
            >
              Maliyet ve Fizibilite (6. Aşama) →
            </button>
          </div>

          {stage5SubView === 'spec' && (
            <SpecificationTab
              params={params}
              results={results}
              theme={theme}
            />
          )}

          {stage5SubView === 'takeoff' && (
            <CostDetailsTab
              params={params}
              results={results}
              theme={theme}
              viewMode="takeoff"
              onChangeParams={onChangeParams}
              onCalculate={onCalculate}
            />
          )}
        </div>
      )}

      {/* 5. AŞAMA (ALT SEKME): İNOVATİF VE KONFORLU SEÇENEKLER MODÜLÜ */}
      {workbenchStage === 5 && stage5SubView === 'comfort' && (
        <div className={`${bgCard} rounded-2xl p-6 border shadow-xs space-y-4 animate-fade-in`}>
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowComfortOptions(!showComfortOptions)}
              className="w-full text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-purple-50 to-indigo-50/50 hover:from-purple-100/70 hover:to-indigo-50 p-4 rounded-xl border border-purple-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-purple-950 flex flex-wrap items-center gap-2">
                    <span>Teklif Donanım & Konfor Paketleri</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white text-purple-800 border border-purple-200">
                      {activeComfortStats.count > 0
                        ? `${activeComfortStats.count} Paket Aktif (+${Math.round(activeComfortStats.totalCost).toLocaleString('tr-TR')} ₺)`
                        : 'Opsiyonel (10 Paket)'}
                    </span>
                  </h3>
                  <p className="text-xs text-purple-800/80">
                    Yerden ısıtma, klima, jeneratör, akıllı kilit ve ekstra donanımları yönetin.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 shrink-0">
                <span>{showComfortOptions ? 'Gizle' : 'Paketleri Aç'}</span>
                {showComfortOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showComfortOptions && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in">
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

              {/* Option 8: Motorlu & Biyometrik Akıllı Daire Kapısı Kilitleri (DESİ / Kale / Smart) */}
              <div className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${params.hasSmartDoorLock ? 'border-purple-300 bg-purple-50/20 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${params.hasSmartDoorLock ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Akıllı Daire Kapısı Motorlu Kilit Sistemi</span>
                        <span className="text-[10px] text-purple-700 font-semibold">Parmak İzli + Şifreli + Mobil Uygulamalı (DESİ / Kale / Smart)</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!params.hasSmartDoorLock}
                        onChange={(e) => onChangeParams({ ...params, hasSmartDoorLock: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-semibold">
                    <span>🔑 Konut Daire Giriş Kapıları İçin</span>
                    <span className="text-amber-600 font-normal">(Dükkanlar hariç tüm konut çelik kapılarına entegre edilir)</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Daire giriş çelik kapılarında mekanik anahtar taşıma derdini sona erdiren; <strong>parmak izi okuyucu, dokunmatik şifreli tuş takımı ve mobil uygulama (Bluetooth/Wi-Fi)</strong> erişimli orta segment motorlu akıllı kilit sistemidir (DESİ, Kale veya Smart markaları).
                  </p>

                  {params.hasSmartDoorLock ? (
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] text-slate-600 bg-purple-50/60 p-2.5 rounded-lg border border-purple-100 space-y-1">
                        <div className="flex items-center justify-between font-bold text-purple-950">
                          <span>DESİ / Kale / Smart Akıllı Motorlu Kilit Entegrasyonu</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-200 text-purple-900 font-bold">Orta Segment Konfor</span>
                        </div>
                        <ul className="text-[10px] text-slate-600 space-y-0.5 list-disc pl-3.5 pt-0.5">
                          <li><strong>3 Farklı Giriş Yöntemi:</strong> Biyometrik Parmak İzi, Şifreli Tuş Takımı ve Mobil Uygulama ile Uzaktan Açma.</li>
                          <li>Çelik kapı milini motorlu olarak otomatik kilitler ve açar, kapı açık kaldığında uyarı verir.</li>
                          {(results.shopUnitsCount || 0) > 0 && (
                            <li className="text-amber-800 font-medium font-mono text-[9px]">
                              {results.shopUnitsCount} adet dükkan muaf tutulmuştur ({results.residentialUnitsCount ?? (results.flatCount - (results.shopUnitsCount || 0))} konut çelik kapısına uygulanır).
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">Konut Başı Akıllı Motorlu Kilit Seti Bedeli (TL)</label>
                        <input
                          type="number"
                          value={params.smartDoorLockPricePerFlat ?? ''}
                          onChange={(e) => {
                            const val = e.target.value ? Math.max(0, parseFloat(e.target.value)) : undefined;
                            onChangeParams({ ...params, smartDoorLockPricePerFlat: val });
                          }}
                          placeholder="8500"
                          className="w-full text-[11px] font-mono font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 bg-slate-100/60 p-2.5 rounded-lg border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-700 block">Daire Kapısı Biyometrik Güvenlik Paketi:</span>
                      <ul className="list-disc pl-3.5 space-y-0.5">
                        <li>Konut başı paket maliyeti: <strong>8.500 TL</strong> (Motorlu Kilit + Parmak İzi Sensörü + Şifre Paneli + Mobil Bağlantı + Montaj).</li>
                        <li>DESİ, Kale veya Smart markalı orta segment yerli/ithal üstün güvenlikli motor kilit seti.</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Ekstra İmalat Bedeli</span>
                    {params.hasSmartDoorLock && (
                      <span className="text-[9px] text-purple-700 font-bold">
                        {results.smartDoorLockUnits ?? results.residentialUnitsCount ?? results.flatCount} Konut × {(params.smartDoorLockPricePerFlat || 8500).toLocaleString('tr-TR')} TL
                        {(results.shopUnitsCount || 0) > 0 && <span className="text-amber-700 block text-[8px] font-medium">({results.shopUnitsCount} dükkan hariç)</span>}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-black text-slate-900 font-mono">
                    {params.hasSmartDoorLock ? `${results.smartDoorLockCost?.toLocaleString('tr-TR')} TL` : 'Pasif'}
                  </div>
                </div>
              </div>

              {/* Option 9: Otomatik Dizel Jeneratör & ATS Transfer Panosu (Aksa / Alimar / Teksan veya muadili) */}
              <div className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${params.hasGenerator ? 'border-purple-300 bg-purple-50/20 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${params.hasGenerator ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Otomatik Dizel Jeneratör Sistemi</span>
                        <span className="text-[10px] text-purple-700 font-semibold">Kabinli + Otomatik Transfer Panolu (ATS) (Aksa / Alimar / Teksan)</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!params.hasGenerator}
                        onChange={(e) => onChangeParams({ ...params, hasGenerator: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-semibold">
                    <span>⚡ Kesintisiz Enerji Güvenliği</span>
                    <span className="text-amber-600 font-normal">(Asansör, hidrofor, yangın pompası & ortak alanlar)</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Şebeke elektriği kesildiğinde 8 saniye içinde otomatik devreye girerek asansörde mahsur kalmayı önleyen, suyun kesilmesini engelleyen ve ortak alanları aydınlatan <strong>ses izolasyon kabinli dizel jeneratör ve ATS transfer panosu</strong> sistemidir.
                  </p>

                  {params.hasGenerator ? (
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] text-slate-600 bg-purple-50/60 p-2.5 rounded-lg border border-purple-100 space-y-1">
                        <div className="flex items-center justify-between font-bold text-purple-950">
                          <span>Jeneratör Besleme Kapsamı</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-200 text-purple-900 font-bold">Kabinli Dizel</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <label className={`flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer text-[10px] ${params.generatorScope !== 'full_building' ? 'bg-purple-100 border-purple-300 font-bold text-purple-900' : 'bg-white border-slate-200 text-slate-600'}`}>
                            <input
                              type="radio"
                              name="generatorScope"
                              checked={params.generatorScope !== 'full_building'}
                              onChange={() => onChangeParams({ ...params, generatorScope: 'common_areas' })}
                              className="sr-only"
                            />
                            <span>🏢 Ortak Alan & Asansör + Hidrofor</span>
                          </label>
                          <label className={`flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer text-[10px] ${params.generatorScope === 'full_building' ? 'bg-purple-100 border-purple-300 font-bold text-purple-900' : 'bg-white border-slate-200 text-slate-600'}`}>
                            <input
                              type="radio"
                              name="generatorScope"
                              checked={params.generatorScope === 'full_building'}
                              onChange={() => onChangeParams({ ...params, generatorScope: 'full_building' })}
                              className="sr-only"
                            />
                            <span>⚡ Tam Bina & Tüm Daireler</span>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">Özel Jeneratör Toplam Bütçesi (İsteğe Bağlı TL - Boş bırakılırsa otomatik hesaplanır)</label>
                        <input
                          type="number"
                          value={params.generatorPrice ?? ''}
                          onChange={(e) => {
                            const val = e.target.value ? Math.max(0, parseFloat(e.target.value)) : undefined;
                            onChangeParams({ ...params, generatorPrice: val });
                          }}
                          placeholder={params.generatorScope === 'full_building' ? String(Math.round(250000 + (results.flatCount || 10) * 22000)) : String(Math.round(180000 + (results.flatCount || 10) * 6000))}
                          className="w-full text-[11px] font-mono font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 bg-slate-100/60 p-2.5 rounded-lg border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-700 block">Jeneratör Güvencesi:</span>
                      <ul className="list-disc pl-3.5 space-y-0.5">
                        <li>Aksa / Alimar / Teksan veya muadili kabinli dizel jeneratör & transfer panosu.</li>
                        <li>Elektrik kesintisinde dairelerde suyun akmaya devam etmesi ve asansör güvenliği sağlanır.</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Ekstra İmalat Bedeli</span>
                    {params.hasGenerator && (
                      <span className="text-[9px] text-purple-700 font-bold">
                        {params.generatorScope === 'full_building' ? 'Tam Bina Besleme' : 'Ortak Alanlar & Asansör'}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-black text-slate-900 font-mono">
                    {params.hasGenerator ? `${results.generatorCost?.toLocaleString('tr-TR')} TL` : 'Pasif'}
                  </div>
                </div>
              </div>

              {/* Option 10: 12-15mm Lüks Porselen Mutfak Tezgahı & Alınlık (Lamar / Neolith / Belenco veya muadili) */}
              <div className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${params.hasPorcelainCountertop ? 'border-purple-300 bg-purple-50/20 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${params.hasPorcelainCountertop ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                        <ChefHat className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Lüks Porselen Mutfak Tezgahı</span>
                        <span className="text-[10px] text-purple-700 font-semibold">12-15mm Çizilmez & Yanmaz Plaka (Lamar / Neolith / Belenco)</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!params.hasPorcelainCountertop}
                        onChange={(e) => onChangeParams({ ...params, hasPorcelainCountertop: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-semibold">
                    <span>🍳 Konut Mutfakları İçin</span>
                    <span className="text-amber-600 font-normal">(Sıcak tencere yanığına ve çizilmeye %100 dayanıklı)</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Standart granit ve akrilik tezgahlara kıyasla gözeneksiz yapısıyla limon, sirke ve yağ lekesi tutmayan; sıcak tencere ve tavayı doğrudan üzerine koyabileceğiniz <strong>12-15 mm kalınlığında 1. sınıf lüks porselen mutfak tezgahı ve süpürgelik/alınlık kaplamasıdır</strong> (Lamar, Neolith veya Belenco muadilleri).
                  </p>

                  {params.hasPorcelainCountertop ? (
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] text-slate-600 bg-purple-50/60 p-2.5 rounded-lg border border-purple-100 space-y-1">
                        <div className="flex items-center justify-between font-bold text-purple-950">
                          <span>Lamar / Neolith / Belenco veya muadili Porselen Plaka</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-200 text-purple-900 font-bold">Ultra Dayanıklı</span>
                        </div>
                        <ul className="text-[10px] text-slate-600 space-y-0.5 list-disc pl-3.5 pt-0.5">
                          <li><strong>Yanmaz & Çizilmez:</strong> Bıçakla doğrudan üzerinde kesim yapılabilir, sıcaktan sararmaz ve yanmaz.</li>
                          <li>Bakteri barındırmaz, gıda temasına %100 uygundur ve leke tutmaz.</li>
                          {(results.shopUnitsCount || 0) > 0 && (
                            <li className="text-amber-800 font-medium font-mono text-[9px]">
                              {results.shopUnitsCount} adet dükkan muaf tutulmuştur ({results.residentialUnitsCount ?? (results.flatCount - (results.shopUnitsCount || 0))} konut mutfağına uygulanır).
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">Konut Başı Porselen Mutfak Tezgahı Bedeli (TL)</label>
                        <input
                          type="number"
                          value={params.porcelainCountertopPricePerFlat ?? ''}
                          onChange={(e) => {
                            const val = e.target.value ? Math.max(0, parseFloat(e.target.value)) : undefined;
                            onChangeParams({ ...params, porcelainCountertopPricePerFlat: val });
                          }}
                          placeholder="25000"
                          className="w-full text-[11px] font-mono font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 bg-slate-100/60 p-2.5 rounded-lg border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-700 block">Porselen Mutfak Tezgahı Standartları:</span>
                      <ul className="list-disc pl-3.5 space-y-0.5">
                        <li>Konut başı paket maliyeti: <strong>25.000 TL</strong> (12-15mm Porselen Plaka + Alınlık + Eviye Altı İmalat + Montaj).</li>
                        <li>Lamar, Neolith veya Belenco gibi A-kalite üretici garantili ürünler.</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Ekstra İmalat Bedeli</span>
                    {params.hasPorcelainCountertop && (
                      <span className="text-[9px] text-purple-700 font-bold">
                        {results.porcelainCountertopUnits ?? results.residentialUnitsCount ?? results.flatCount} Konut × {(params.porcelainCountertopPricePerFlat || 25000).toLocaleString('tr-TR')} TL
                        {(results.shopUnitsCount || 0) > 0 && <span className="text-amber-700 block text-[8px] font-medium">({results.shopUnitsCount} dükkan hariç)</span>}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-black text-slate-900 font-mono">
                    {params.hasPorcelainCountertop ? `${results.porcelainCountertopCost?.toLocaleString('tr-TR')} TL` : 'Pasif'}
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      )}

          {/* 6. AŞAMA: MALİYET VE FİZİBİLİTE */}
          {workbenchStage === 6 && (
            <div className="space-y-4 animate-fade-in">
              <div className={`${bgCard} rounded-2xl p-2 border shadow-xs flex flex-wrap items-center justify-between gap-2`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'cost' as const, label: 'Maliyet ve Rayiç Analizi', icon: DollarSign },
                    { id: 'admin_report' as const, label: 'Yönetici Raporu ve CFO Fizibilite (Firma İçi)', icon: BarChart3 },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = stage6SubView === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStage6SubView(tab.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : isGray
                              ? 'text-slate-300 hover:bg-slate-700/60'
                              : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStage5SubView('takeoff');
                    goToStage(5);
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  ← Metraj Cetveli (5. Aşama)
                </button>
              </div>

              {stage6SubView === 'cost' && (
                <>
                  {/* Yapı Sınıfı, Teslim Süresi ve Birim m² Maliyet Parametre Şeridi */}
                  <div id="stage6CostParamsCard" className={`${bgCard} rounded-2xl p-4 border shadow-xs`}>
                    <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                          Maliyet Temel Parametreleri
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        Yapı sınıfı, teslim süresi ve birim m² fiyatı doğrudan maliyet hesabını günceller
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Yapı Sınıfı */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                          🏛️ Yapı Sınıfı
                        </label>
                        <select
                          value={params.buildingType || 'standard'}
                          onChange={(e) => onChangeParams({ ...params, buildingType: e.target.value as any })}
                          className="w-full text-xs font-bold px-2.5 py-2 rounded-lg border bg-white border-slate-200"
                        >
                          <option value="standard">Standart</option>
                          <option value="luxury">Lüks (A+)</option>
                          <option value="commercial">Ticari</option>
                        </select>
                      </div>

                      {/* Teslim Süresi */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                          ⏱️ Teslim Süresi
                        </label>
                        <div className="flex items-center gap-1.5">
                          <select
                            id="stage6DurationSelect"
                            value={params.durationOption || 'auto'}
                            onChange={(e) => onChangeParams({ ...params, durationOption: e.target.value as any })}
                            className="flex-1 text-xs font-bold px-2.5 py-2 rounded-lg border bg-white border-slate-200"
                          >
                            <option value="auto">Otomatik ({results.finalMonths} Ay)</option>
                            <option value="manual">Manuel</option>
                          </select>
                          {params.durationOption === 'manual' && (
                            <input
                              type="number"
                              min="1"
                              max="60"
                              value={params.manualMonths || 18}
                              onChange={(e) => onChangeParams({ ...params, manualMonths: Math.max(1, parseFloat(e.target.value) || 1) })}
                              className="w-16 text-xs font-mono font-bold px-2 py-2 rounded-lg border border-slate-200 bg-white"
                            />
                          )}
                          <span className="text-[10px] font-bold text-slate-400">Ay</span>
                        </div>
                      </div>

                      <div className="self-end">
                        <button type="button" onClick={() => goToStage(2, 'stage2OfferUnitPriceInput')}
                          className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800">
                          Teklif m² fiyatlarını düzenle
                        </button>
                      </div>
                    </div>
                  </div>

                  <details className="rounded-xl border border-slate-200 bg-white p-4">
                    <summary className="cursor-pointer text-sm font-bold text-slate-800">Maliyet kalemleri ve rayiç ayrıntıları</summary>
                    <div className="mt-4">
                      <CostDetailsTab
                        params={params}
                        results={results}
                        theme={theme}
                        viewMode="cost"
                        onChangeParams={onChangeParams}
                        onCalculate={onCalculate}
                      />
                    </div>
                  </details>
                </>
              )}

              {stage6SubView === 'admin_report' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-xs text-amber-950 font-semibold">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Bu bölüm yalnızca firma içi finansal fizibilite ve CFO nakit akışı analizi içindir; müşteri teklif belgelerine ve PDF/yazdırma çıktılarına dahil edilmez.
                    </span>
                  </div>
                  <AdminReportTab
                    params={params}
                    results={results}
                    theme={theme}
                  />
                </div>
              )}
            </div>
          )}

          {/* 7. AŞAMA: MALİK PAYLAŞIMI VE TİCARİ MODEL */}
          {workbenchStage === 7 && (
            <div className="space-y-4 animate-fade-in">
              {/* Ticari Model & 6306 Destek Parametre Şeridi */}
              <div className={`${bgCard} rounded-2xl p-4 border shadow-xs space-y-3`}>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Ticari Model & 6306 Destek Parametreleri
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToStage(1)}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    İş Modelini Değiştir (1. Aşama) →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                  {/* Aktif İş Modeli */}
                  <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block">Aktif Ticari Model</span>
                      <div className="text-xs font-black text-emerald-950">
                        {params.projectType === 'kentsel_imar' || (params.projectModel === 'urbanTransformation' && params.hasZoningIncrease)
                          ? '⚡ Kentsel Dönüşüm + İmar Artışı'
                          : params.projectType === 'kat_karsiligi' || params.projectModel === 'contractorShare'
                          ? '🤝 Kat Karşılığı İnşaat'
                          : params.projectType === 'muteahhitlik' || params.projectModel === 'contractorService'
                          ? '🔨 Anahtar Teslim Müteahhitlik'
                          : params.projectType === 'nakit' || params.projectModel === 'cash'
                          ? '💵 Nakit / Hakediş Usulü'
                          : '🏢 Kentsel Dönüşüm (6306)'}
                      </div>
                    </div>
                  </div>

                  {/* Modele Özel Ticari Oran */}
                  <div>
                    {(params.projectModel === 'contractorService' || params.projectModel === 'cash') && (
                      <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900">Müteahhit Hizmet Bedeli:</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={params.contractorFeeRate ?? 15}
                            onChange={(e) => onChangeParams({ ...params, contractorFeeRate: Math.max(0, parseFloat(e.target.value) || 0) })}
                            className="w-16 text-xs font-mono font-bold px-2 py-1 rounded-lg border border-emerald-300 bg-white text-center"
                          />
                          <span className="text-xs text-emerald-800 font-black">%</span>
                        </div>
                      </div>
                    )}

                    {params.projectModel === 'contractorShare' && (
                      <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900">Müteahhit Pay Oranı:</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={params.contractorShareRate ?? 50}
                            onChange={(e) => onChangeParams({ ...params, contractorShareRate: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
                            className="w-16 text-xs font-mono font-bold px-2 py-1 rounded-lg border border-amber-300 bg-white text-center"
                          />
                          <span className="text-xs text-amber-800 font-black">%</span>
                        </div>
                      </div>
                    )}

                    {params.projectModel === 'urbanTransformation' && (
                      <div className="p-2.5 bg-indigo-50/70 rounded-xl border border-indigo-200 flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-indigo-900 text-xs">
                          <input
                            type="checkbox"
                            checked={!!params.hasZoningIncrease}
                            onChange={(e) => onChangeParams({ ...params, hasZoningIncrease: e.target.checked })}
                            className="w-3.5 h-3.5 rounded text-indigo-600"
                          />
                          <span>İmar Artışı</span>
                        </label>
                        {params.hasZoningIncrease && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={params.zoningIncreaseRate ?? 20}
                              onChange={(e) => onChangeParams({ ...params, zoningIncreaseRate: Math.max(0, parseFloat(e.target.value) || 0) })}
                              className="w-14 text-xs font-mono font-bold px-1.5 py-1 rounded-lg border border-indigo-300 bg-white text-center"
                            />
                            <span className="text-xs font-bold text-indigo-800">%</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 6306 Destek Modeli */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                      🎁 6306 Destek Modeli
                    </label>
                    <select
                      value={params.transformationStatus || 'currentSupport'}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        const updatedFlats = params.flats.map((f) => ({ ...f, useTransformationCredit: val !== 'none' }));
                        onChangeParams({ ...params, transformationStatus: val, flats: updatedFlats });
                      }}
                      className="w-full text-xs font-bold px-2.5 py-2 rounded-lg border bg-white border-slate-200"
                    >
                      <option value="currentSupport">Hibe + Kredi (Yarısı Bizden)</option>
                      <option value="futureSupport2027">180 Ay Vade</option>
                      <option value="none">Desteksiz</option>
                    </select>
                  </div>
                </div>
              </div>

              <OwnersTab
                params={params}
                results={results}
                onChangeParams={onChangeParams}
                onCalculate={onCalculate}
                onNavigateToUnits={() => goToStage(3)}
                onNavigateToCost={() => goToStage(6)}
                onNavigateToOffer={() => goToStage(8, undefined, { stage8SubView: 'offer' })}
                theme={theme}
              />
            </div>
          )}

          {/* 8. AŞAMA: TEKLİF VE SÖZLEŞME */}
          {workbenchStage === 8 && (
            <div className="space-y-4 animate-fade-in">
              <div className={`${bgCard} rounded-2xl p-2 border shadow-xs flex flex-wrap items-center justify-between gap-2`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'offer' as const, label: 'Müşteri Teklifi ve Teklif Yönetimi', icon: FileText },
                    { id: 'contract' as const, label: 'Resmi Yapım Sözleşmesi', icon: ScrollText },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = stage8SubView === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStage8SubView(tab.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : isGray
                              ? 'text-slate-300 hover:bg-slate-700/60'
                              : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => goToStage(9)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                >
                  Proje ve Şantiye Yönetimi (9. Aşama) →
                </button>
              </div>

              {stage8SubView === 'offer' && (
                <OfferTab
                  params={params}
                  results={results}
                  onUpdateParam={(k, v) => onChangeParams({ [k]: v })}
                  onUpdateAllParams={(partial) => onChangeParams(partial)}
                  onNavigateToSurec={() => goToStage(9)}
                  onSaveOffer={onSaveOffer}
                  onNavigateToContract={() => setStage8SubView('contract')}
                  onSelectWorkbenchStage={goToStage}
                  evaluation={workbenchEvaluation}
                  theme={theme}
                />
              )}

              {stage8SubView === 'contract' && (
                <ContractTab
                  params={params}
                  results={results}
                  onUpdateParam={(k, v) => onChangeParams({ [k]: v })}
                  theme={theme}
                />
              )}
            </div>
          )}

          {/* 9. AŞAMA: PROJE VE ŞANTİYE YÖNETİMİ */}
          {workbenchStage === 9 && (isArchiveAddressConflict ? (
            <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-900">Bu adresle kayıtlı projeyi şantiye takibi için Proje Arşivi’nden açın.</p>
          ) : (
            <ConstructionProgressTab
              params={params}
              results={results}
              theme={theme}
              savedProjects={savedProjects}
              onSelectProject={onSelectProjectForProgress}
              onAddNewProject={onAddNewConstructionProject}
              onDeleteProject={onDeleteHistoryProject}
              onSaveCurrentProject={onCalculate || onQuickSave}
              onUpdateParam={(k, v) => onChangeParams({ [k]: v })}
              onUpdateAllParams={(partial) => onChangeParams(partial)}
              onNavigateToOffer={() =>
                goToStage(8, undefined, { stage8SubView: 'offer' })
              }
              onNavigateToContract={() =>
                goToStage(8, undefined, { stage8SubView: 'contract' })
              }
            />
          ))}
        </div>

        {/* Sağ Bölüm: Canlı Karar Özeti ve Tıklanabilir Kontroller */}
        <div className="2xl:sticky 2xl:top-24">
          <WorkbenchLiveSummary
            params={params}
            results={results}
            theme={theme}
            activeStage={workbenchStage}
            isProjectSaved={isProjectSaved}
            evaluation={workbenchEvaluation}
            onSelectStage={goToStage}
          />
        </div>
      </div>
    </div>
  );
};
