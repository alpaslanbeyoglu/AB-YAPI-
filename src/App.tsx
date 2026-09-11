import React, { useState, useEffect, useMemo, Suspense } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Settings2,
  Smartphone,
} from 'lucide-react';
import { Header } from './components/Header';
import { TabNavigation } from './components/TabNavigation';
import { CompactSummaryBar } from './components/CompactSummaryBar';
import { ConfirmModal } from './components/ConfirmModal';
import { TabLoadingSkeleton } from './components/TabLoadingSkeleton';

import { ErrorBoundary } from './components/ErrorBoundary';

// Primary tabs imported directly for instant, rock-solid mobile & Safari initial paint
import { ProjectSetupTab } from './components/ProjectSetupTab';
import { LiteMobileView } from './components/LiteMobileView';
import { ProjectTransferModal } from './components/ProjectTransferModal';

// Resilient lazy loader for secondary tabs that retries once on network hiccups
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return React.lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      console.warn('Sekme modülü yüklenirken ağ gecikmesi, tekrar deneniyor...', err);
      await new Promise((res) => setTimeout(res, 1200));
      return await factory();
    }
  });
}

const BuildingModelTab = lazyWithRetry(() => import('./components/BuildingModelTab').then(m => ({ default: m.BuildingModelTab })));
const CostDetailsTab = lazyWithRetry(() => import('./components/CostDetailsTab').then(m => ({ default: m.CostDetailsTab })));
const OwnersTab = lazyWithRetry(() => import('./components/OwnersTab').then(m => ({ default: m.OwnersTab })));
const OfferTab = lazyWithRetry(() => import('./components/OfferTab').then(m => ({ default: m.OfferTab })));
const ConstructionProgressTab = lazyWithRetry(() => import('./components/ConstructionProgressTab').then(m => ({ default: m.ConstructionProgressTab })));
const ContractTab = lazyWithRetry(() => import('./components/ContractTab').then(m => ({ default: m.ContractTab })));
const SpecificationTab = lazyWithRetry(() => import('./components/SpecificationTab').then(m => ({ default: m.SpecificationTab })));
const AdminReportTab = lazyWithRetry(() => import('./components/AdminReportTab').then(m => ({ default: m.AdminReportTab })));
const CompanyProfileTab = lazyWithRetry(() => import('./components/CompanyProfileTab').then(m => ({ default: m.CompanyProfileTab })));
const CompletedProjectsTab = lazyWithRetry(() => import('./components/CompletedProjectsTab').then(m => ({ default: m.CompletedProjectsTab })));
const HistoryTab = lazyWithRetry(() => import('./components/HistoryTab').then(m => ({ default: m.HistoryTab })));
const MenuSettingsModal = lazyWithRetry(() => import('./components/MenuSettingsModal').then(m => ({ default: m.MenuSettingsModal })));

import { DEFAULT_TABS, TabConfig, TabId, TAB_CATEGORIES } from './config/tabs';


import { DEFAULT_PARAMS, calculateProject, synchronizeFlats, calculateFlatCount, calculateCantileverDetails } from './utils/calculatorEngine';
import { DEFAULT_BUILDING_PARAMS } from './utils/buildingModelUtils';
import { calculateFootprint } from './utils/footprintUtils';
import {
  ProjectParams,
  CalculationResult,
  SavedProjectData,
  BuildingModelParams,
  AppTheme,
} from './types';

export default function App() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_theme');
      if (saved === 'gray' || saved === 'light') return saved as AppTheme;
    } catch (e) {}
    return 'light';
  });

  useEffect(() => {
    // Remove dark mode class completely - only light and gray
    document.documentElement.classList.remove('dark');
    if (theme === 'gray') {
      document.documentElement.classList.add('theme-gray');
      document.documentElement.classList.remove('theme-light');
    } else {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('theme-gray');
    }
  }, [theme]);

  const toggleTheme = () => {
    const next: AppTheme = theme === 'light' ? 'gray' : 'light';
    setTheme(next);
    try {
      localStorage.setItem('ab_yapi_theme', next);
    } catch (e) {}
  };

  const isLight = theme === 'light';
  const isGray = theme === 'gray';

  const [tabsConfig, setTabsConfig] = useState<TabConfig[]>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_tabs');
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<TabConfig>[];
        // Restore icon references from DEFAULT_TABS
        return DEFAULT_TABS.map(defaultTab => {
          const savedTab = parsed.find(t => t.id === defaultTab.id);
          return savedTab ? { ...defaultTab, visible: savedTab.visible ?? defaultTab.visible, order: savedTab.order ?? defaultTab.order } : defaultTab;
        });
      }
    } catch (e) {}
    return DEFAULT_TABS;
  });

  const [activeTab, setActiveTab] = useState<TabId>('kurulum');
  const [requestedSetupStep, setRequestedSetupStep] = useState<number | undefined>(2);
  const [isMenuSettingsOpen, setIsMenuSettingsOpen] = useState(false);
  const [isProjectTransferOpen, setIsProjectTransferOpen] = useState(false);

  const handleSummaryChipNavigate = (itemId: string) => {
    let targetTab: TabId = 'kurulum';
    let targetId = '';
    let setupStep: number | undefined = undefined;

    switch (itemId) {
      case 'taban-alani':
        targetTab = 'kurulum';
        setupStep = 2;
        targetId = 'minimalBaseAreaInput';
        break;
      case 'cikmali-taban':
        targetTab = 'kurulum';
        setupStep = 2;
        targetId = 'facade-cantilever-controls';
        break;
      case 'kat-bolum':
        targetTab = 'kurulum';
        setupStep = 2;
        targetId = 'minimalFloorCountInput';
        break;
      case 'toplam-insaat':
        targetTab = 'kurulum';
        setupStep = 2;
        break;
      case 'birim-satis':
        targetTab = 'kurulum';
        setupStep = 2;
        break;
      case 'net-maliyet':
        targetTab = 'maliyet';
        targetId = 'cost-details-header';
        break;
      case 'hedef-bedel':
        targetTab = 'kurulum';
        setupStep = 2;
        break;
      case 'teslim-suresi':
        targetTab = 'kurulum';
        setupStep = 2;
        break;
      default:
        break;
    }

    if (setupStep !== undefined) {
      setRequestedSetupStep(setupStep);
    }
    setActiveTab(targetTab);

    // Smooth scroll and pulse highlight
    setTimeout(() => {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-indigo-500/60', 'transition-all', 'duration-500');
        if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
          element.focus();
        }
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-indigo-500/60');
        }, 2000);
      }
    }, 120);
  };

  // App mode: 'full' (standart tam sürüm) or 'lite' (kullanıcı isterse geçebileceği hafif sürüm)
  // Kullanıcı isteği doğrultusunda sayfa ilk yüklemede daima 'full' (tam) sürüm olarak açılır.
  const [appMode, setAppMode] = useState<'full' | 'lite'>('full');

  const toggleAppMode = () => {
    const next = appMode === 'full' ? 'lite' : 'full';
    setAppMode(next);
  };

  const handleSaveTabs = (newTabs: TabConfig[]) => {
    setTabsConfig(newTabs);
    try {
      localStorage.setItem('ab_yapi_tabs', JSON.stringify(newTabs));
    } catch (e) {}
  };

  const [params, setParams] = useState<ProjectParams>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_last_params');
      if (saved) {
        const parsed = JSON.parse(saved);
        const fc = parsed.floorCount || 5;
        const fpf = parsed.flatsPerFloor || 2;
        const hasShop = !!parsed.hasGroundFloorShop;
        const rf = hasShop ? Math.max(1, fc - 1) : fc;
        const normalFlats = rf * fpf;
        let fcCorrected = parsed.flatCount;
        if (!fcCorrected || fcCorrected <= 0 || (fcCorrected === fc && fpf > 1)) {
          fcCorrected = normalFlats;
        }
        return {
          ...DEFAULT_PARAMS,
          ...parsed,
          profitRate: 0,
          floorCount: fc,
          flatsPerFloor: fpf,
          flatCount: fcCorrected,
          roofType: parsed.roofType || 'gable',
          basementCount: parsed.basementCount !== undefined ? parsed.basementCount : 1,
        };
      }
    } catch (e) {}
    return DEFAULT_PARAMS;
  });

  const [buildingModelParams, setBuildingModelParams] = useState<BuildingModelParams>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_building_model');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_BUILDING_PARAMS,
          ...parsed,
          floorCount: params.floorCount,
          floorHeight: params.floorHeight || 2.90,
          flatsPerFloor: params.flatsPerFloor || 2,
          roomType: params.roomType || '3+1',
          roofType: params.roofType || 'gable',
          wallColor: parsed.wallColor || params.wallColor || DEFAULT_BUILDING_PARAMS.wallColor,
          roofColor: parsed.roofColor || params.roofColor || DEFAULT_BUILDING_PARAMS.roofColor,
          accentColor: parsed.accentColor || params.accentColor || DEFAULT_BUILDING_PARAMS.accentColor,
          frameColor: parsed.frameColor || params.frameColor || DEFAULT_BUILDING_PARAMS.frameColor,
          slabColor: parsed.slabColor || params.slabColor || DEFAULT_BUILDING_PARAMS.slabColor,
          facadeStyle: params.facadeStyle || 'wood_anthracite',
          facadeWidth: params.facadeWidth || 14.0,
          facadeDepth: params.facadeDepth || 18.0,
          backFacadeLength: params.backFacadeLength !== undefined ? params.backFacadeLength : (params.facadeWidth || 14.0),
          leftFacadeLength: params.leftFacadeLength !== undefined ? params.leftFacadeLength : (params.facadeDepth || 18.0),
          baseBuildArea: params.baseBuildArea,
          basementCount: params.basementCount !== undefined ? params.basementCount : 1,
          elevatorCount: params.elevatorCount !== undefined ? params.elevatorCount : 1,
          balconyDepth: params.balconyDepth !== undefined ? params.balconyDepth : 1.4,
          hasGroundFloorShop: !!params.hasGroundFloorShop,
          shopCount: params.shopCount || 1,
          shopHeight: params.shopHeight || 3.8,
          flatCount: params.flatCount,
          hasCantilever: params.hasCantilever,
          cantileverDepth: params.cantileverDepth,
          cantileverDirection: params.cantileverDirection,
          footprintInputMode: params.footprintInputMode,
          customFacadeCount: params.customFacadeCount,
          customFacades: params.customFacades,
          lShapeFrontMain: params.lShapeFrontMain,
          lShapeDepthMain: params.lShapeDepthMain,
          lShapeRecessFront: params.lShapeRecessFront,
          lShapeRecessDepth: params.lShapeRecessDepth,
          polygonPoints: params.polygonPoints,
          facadeConfigs: params.facadeConfigs,
          mainEntranceFacadeIndex: params.mainEntranceFacadeIndex,
          contractorShareRate: params.contractorShareRate,
          contractorFlatIds: params.contractorFlatIds,
          showContractorShare3D: params.showContractorShare3D,
          projectModel: params.projectModel,
        };
      }
    } catch (e) {}
    return {
      ...DEFAULT_BUILDING_PARAMS,
      floorCount: params.floorCount,
      floorHeight: params.floorHeight || 2.90,
      flatsPerFloor: params.flatsPerFloor || 2,
      roomType: params.roomType || '3+1',
      roofType: params.roofType || 'gable',
      wallColor: params.wallColor || DEFAULT_BUILDING_PARAMS.wallColor,
      roofColor: params.roofColor || DEFAULT_BUILDING_PARAMS.roofColor,
      accentColor: params.accentColor || DEFAULT_BUILDING_PARAMS.accentColor,
      frameColor: params.frameColor || DEFAULT_BUILDING_PARAMS.frameColor,
      slabColor: params.slabColor || DEFAULT_BUILDING_PARAMS.slabColor,
      facadeStyle: params.facadeStyle || 'wood_anthracite',
      facadeWidth: params.facadeWidth || 14.0,
      facadeDepth: params.facadeDepth || 18.0,
      backFacadeLength: params.backFacadeLength !== undefined ? params.backFacadeLength : (params.facadeWidth || 14.0),
      leftFacadeLength: params.leftFacadeLength !== undefined ? params.leftFacadeLength : (params.facadeDepth || 18.0),
      baseBuildArea: params.baseBuildArea,
      basementCount: params.basementCount !== undefined ? params.basementCount : 1,
      elevatorCount: params.elevatorCount !== undefined ? params.elevatorCount : 1,
      balconyDepth: params.balconyDepth !== undefined ? params.balconyDepth : 1.4,
      hasGroundFloorShop: !!params.hasGroundFloorShop,
      shopCount: params.shopCount || 1,
      shopHeight: params.shopHeight || 3.8,
      flatCount: params.flatCount,
      hasCantilever: params.hasCantilever,
      cantileverDepth: params.cantileverDepth,
      cantileverDirection: params.cantileverDirection,
      footprintInputMode: params.footprintInputMode,
      customFacadeCount: params.customFacadeCount,
      customFacades: params.customFacades,
      lShapeFrontMain: params.lShapeFrontMain,
      lShapeDepthMain: params.lShapeDepthMain,
      lShapeRecessFront: params.lShapeRecessFront,
      lShapeRecessDepth: params.lShapeRecessDepth,
      polygonPoints: params.polygonPoints,
      facadeConfigs: params.facadeConfigs,
      mainEntranceFacadeIndex: params.mainEntranceFacadeIndex,
      contractorShareRate: params.contractorShareRate,
      contractorFlatIds: params.contractorFlatIds,
      showContractorShare3D: params.showContractorShare3D,
      projectModel: params.projectModel,
    };
  });

  // Keep Building Model and Calculator synchronized LIVE bidirectionally
  const updateCalculatorParams = (newParamsOrUpdates: ProjectParams | Partial<ProjectParams>) => {
    const newParams: ProjectParams = {
      ...params,
      ...newParamsOrUpdates,
    };
    // 1. Determine activeBaseArea: Keep user's explicit manual entry if provided (> 0)
    const footprintResult = calculateFootprint(newParams.footprintInputMode, newParams);
    let activeBaseArea = newParams.baseBuildArea;
    if (!activeBaseArea || activeBaseArea <= 0) {
      activeBaseArea = footprintResult.area;
    }

    const cantileverInfo = calculateCantileverDetails(newParams, activeBaseArea, footprintResult);
    const upperFloorArea = cantileverInfo.upperFloorArea;

    const resFloors = newParams.hasGroundFloorShop
      ? Math.max(1, newParams.floorCount - 1)
      : newParams.floorCount;

    const roofType = newParams.roofType || 'gable';
    const isMansard = roofType === 'mansard';
    const isDuplex = roofType === 'duplex';
    const flatsPerFloor = newParams.flatsPerFloor || 2;
    const normalFloorFlats = resFloors * flatsPerFloor;

    // KURAL:
    // 1) Mansart çatı tek seçildiğinde çatı katında ekstra bağımsız bölüm(ler) oluşur ve hesaplara dahil edilir.
    // 2) Mansart çatı + dubleks seçilirse tek bağımsız bölüm olarak kabul edilir (ekstra daire eklenmez).
    const totalFlats = calculateFlatCount(newParams);

    const roofAtticArea = isDuplex
      ? Math.round(upperFloorArea * 0.65 * 100) / 100
      : isMansard
      ? Math.round(upperFloorArea * 0.70 * 100) / 100
      : 0;

    const synchronizedFlats = synchronizeFlats(
      newParams.flats,
      totalFlats,
      activeBaseArea,
      newParams.floorCount,
      newParams.transformationStatus,
      roofType,
      flatsPerFloor,
      newParams.mansardFlatCount,
      roofAtticArea,
      newParams.hasGroundFloorShop,
      newParams.shopCount || 1,
      upperFloorArea
    );

    const sanitizedContractorIds = (newParams.contractorFlatIds || []).filter(
      (id) => id <= totalFlats
    );

    const sanitizedParams: ProjectParams = {
      ...newParams,
      baseBuildArea: activeBaseArea,
      flatCount: totalFlats,
      flats: synchronizedFlats,
      contractorFlatIds: sanitizedContractorIds,
    };

    setParams(sanitizedParams);

    // Live Sync from Proje Künyesi / Hesap to Building Model:
    setBuildingModelParams((prevModel) => {
      let newW = sanitizedParams.facadeWidth || prevModel.facadeWidth;
      let newD = sanitizedParams.facadeDepth || prevModel.facadeDepth;
      let newBackW = sanitizedParams.backFacadeLength !== undefined ? sanitizedParams.backFacadeLength : (prevModel.backFacadeLength ?? newW);
      let newLeftD = sanitizedParams.leftFacadeLength !== undefined ? sanitizedParams.leftFacadeLength : (prevModel.leftFacadeLength ?? newD);

      const nextModel: BuildingModelParams = {
        ...prevModel,
        footprintInputMode: sanitizedParams.footprintInputMode || prevModel.footprintInputMode,
        facadeWidth: newW,
        facadeDepth: newD,
        backFacadeLength: newBackW,
        leftFacadeLength: newLeftD,
        baseBuildArea: sanitizedParams.baseBuildArea,
        customFacadeCount: sanitizedParams.customFacadeCount || prevModel.customFacadeCount,
        customFacades: sanitizedParams.customFacades || prevModel.customFacades,
        lShapeFrontMain: sanitizedParams.lShapeFrontMain || prevModel.lShapeFrontMain,
        lShapeDepthMain: sanitizedParams.lShapeDepthMain || prevModel.lShapeDepthMain,
        lShapeRecessFront: sanitizedParams.lShapeRecessFront || prevModel.lShapeRecessFront,
        lShapeRecessDepth: sanitizedParams.lShapeRecessDepth || prevModel.lShapeRecessDepth,
        floorCount: sanitizedParams.floorCount,
        floorHeight: sanitizedParams.floorHeight || prevModel.floorHeight || 2.90,
        elevatorCount: sanitizedParams.elevatorCount !== undefined ? sanitizedParams.elevatorCount : prevModel.elevatorCount,
        flatsPerFloor: sanitizedParams.flatsPerFloor || Math.max(1, Math.round(totalFlats / Math.max(1, resFloors))),
        hasGroundFloorShop: !!sanitizedParams.hasGroundFloorShop,
        shopCount: sanitizedParams.shopCount || 1,
        shopHeight: sanitizedParams.shopHeight || 3.8,
        contractorFlatIds: sanitizedParams.contractorFlatIds,
        showContractorShare3D: sanitizedParams.showContractorShare3D,
        contractorShareRate: sanitizedParams.contractorShareRate,
        projectModel: sanitizedParams.projectModel,
        flatCount: totalFlats,
        roomType: sanitizedParams.roomType || prevModel.roomType,
        hasCantilever: sanitizedParams.hasCantilever,
        cantileverDepth: sanitizedParams.cantileverDepth,
        cantileverDirection: sanitizedParams.cantileverDirection,
        roofType: sanitizedParams.roofType || prevModel.roofType,
        wallColor: sanitizedParams.wallColor || prevModel.wallColor,
        roofColor: sanitizedParams.roofColor || prevModel.roofColor,
        accentColor: sanitizedParams.accentColor || prevModel.accentColor,
        frameColor: sanitizedParams.frameColor || prevModel.frameColor,
        slabColor: sanitizedParams.slabColor || prevModel.slabColor,
        basementCount: sanitizedParams.basementCount !== undefined ? sanitizedParams.basementCount : prevModel.basementCount,
        facadeStyle: sanitizedParams.facadeStyle || prevModel.facadeStyle,
        balconyDepth: sanitizedParams.balconyDepth !== undefined ? sanitizedParams.balconyDepth : prevModel.balconyDepth,
        polygonPoints: sanitizedParams.polygonPoints || prevModel.polygonPoints,
        facadeConfigs: sanitizedParams.facadeConfigs || prevModel.facadeConfigs,
        mainEntranceFacadeIndex: sanitizedParams.mainEntranceFacadeIndex !== undefined ? sanitizedParams.mainEntranceFacadeIndex : prevModel.mainEntranceFacadeIndex,
      };

      return nextModel;
    });
  };

  // Live Sync from Building Model to Calculator: Synchronize all shared/matching data instantly
  const updateBuildingModelParams = (updates: Partial<BuildingModelParams>) => {
    // 1. Update 3D Building Model state
    setBuildingModelParams((prevModel) => {
      const nextModel: BuildingModelParams = { ...prevModel, ...updates };
      return nextModel;
    });

    // 2. Synchronize all matching parameters live to Calculator (ProjectParams)
    setParams((prev) => {
      const mergedForFootprint: ProjectParams = {
        ...prev,
        footprintInputMode: updates.footprintInputMode !== undefined ? updates.footprintInputMode : prev.footprintInputMode,
        facadeWidth: updates.facadeWidth !== undefined ? updates.facadeWidth : prev.facadeWidth,
        facadeDepth: updates.facadeDepth !== undefined ? updates.facadeDepth : prev.facadeDepth,
        backFacadeLength: updates.backFacadeLength !== undefined ? updates.backFacadeLength : prev.backFacadeLength,
        leftFacadeLength: updates.leftFacadeLength !== undefined ? updates.leftFacadeLength : prev.leftFacadeLength,
        customFacadeCount: updates.customFacadeCount !== undefined ? updates.customFacadeCount : prev.customFacadeCount,
        customFacades: updates.customFacades !== undefined ? updates.customFacades : prev.customFacades,
        lShapeFrontMain: updates.lShapeFrontMain !== undefined ? updates.lShapeFrontMain : prev.lShapeFrontMain,
        lShapeDepthMain: updates.lShapeDepthMain !== undefined ? updates.lShapeDepthMain : prev.lShapeDepthMain,
        lShapeRecessFront: updates.lShapeRecessFront !== undefined ? updates.lShapeRecessFront : prev.lShapeRecessFront,
        lShapeRecessDepth: updates.lShapeRecessDepth !== undefined ? updates.lShapeRecessDepth : prev.lShapeRecessDepth,
        polygonPoints: updates.polygonPoints !== undefined ? updates.polygonPoints : prev.polygonPoints,
      };

      let activeBaseArea = prev.baseBuildArea;
      if (updates.baseBuildArea !== undefined && updates.baseBuildArea > 0) {
        activeBaseArea = updates.baseBuildArea;
      } else if (
        updates.facadeWidth !== undefined ||
        updates.facadeDepth !== undefined ||
        updates.customFacades !== undefined ||
        updates.lShapeFrontMain !== undefined ||
        updates.lShapeDepthMain !== undefined ||
        updates.lShapeRecessFront !== undefined ||
        updates.lShapeRecessDepth !== undefined ||
        updates.polygonPoints !== undefined
      ) {
        const footprintResult = calculateFootprint(mergedForFootprint.footprintInputMode, mergedForFootprint);
        activeBaseArea = footprintResult.area;
      }

      const nextFloorCount = updates.floorCount !== undefined ? updates.floorCount : prev.floorCount;
      const nextFlatsPerFloor = updates.flatsPerFloor !== undefined ? updates.flatsPerFloor : (prev.flatsPerFloor || 2);
      const nextHasShop = updates.hasGroundFloorShop !== undefined ? updates.hasGroundFloorShop : (prev.hasGroundFloorShop || false);

      const resFloors = nextHasShop ? Math.max(1, nextFloorCount - 1) : nextFloorCount;

      const roofType = updates.roofType !== undefined ? updates.roofType : (prev.roofType || 'gable');
      const isMansard = roofType === 'mansard';
      const isDuplex = roofType === 'duplex';
      const extraMansardFlats = isMansard
        ? (updates.mansardFlatCount && updates.mansardFlatCount > 0
            ? updates.mansardFlatCount
            : prev.mansardFlatCount && prev.mansardFlatCount > 0
            ? prev.mansardFlatCount
            : Math.max(1, nextFlatsPerFloor))
        : 0;

      let nextFlatCount = Math.max(1, resFloors * nextFlatsPerFloor + extraMansardFlats);
      if (
        updates.flatCount !== undefined &&
        updates.flatCount > 0 &&
        updates.floorCount === undefined &&
        updates.flatsPerFloor === undefined &&
        updates.hasGroundFloorShop === undefined &&
        updates.roofType === undefined &&
        updates.mansardFlatCount === undefined
      ) {
        nextFlatCount = updates.flatCount;
      }

      const roofAtticArea = isDuplex
        ? Math.round(activeBaseArea * 0.65 * 100) / 100
        : isMansard
        ? Math.round(activeBaseArea * 0.70 * 100) / 100
        : 0;

      const synchronizedFlats = synchronizeFlats(
        prev.flats,
        nextFlatCount,
        activeBaseArea,
        nextFloorCount,
        prev.transformationStatus,
        roofType,
        nextFlatsPerFloor,
        updates.mansardFlatCount || prev.mansardFlatCount,
        roofAtticArea,
        nextHasShop,
        updates.shopCount || prev.shopCount || 1
      );

      const sanitizedContractorIds = (updates.contractorFlatIds ?? prev.contractorFlatIds ?? []).filter(
        (id) => id <= nextFlatCount
      );

      const nextParams: ProjectParams = {
        ...prev,
        ...updates,
        baseBuildArea: activeBaseArea,
        floorCount: nextFloorCount,
        flatCount: nextFlatCount,
        flatsPerFloor: nextFlatsPerFloor,
        flats: synchronizedFlats,
        contractorFlatIds: sanitizedContractorIds,
      };

      return nextParams;
    });
  };

  const handleSyncModelToCalculator = (modelUpdates: Partial<ProjectParams>) => {
    setParams((prev) => {
      const next = { ...prev, ...modelUpdates };
      
      const prevCount = prev.flatCount;
      const nextCount = next.flatCount;
      
      if (nextCount !== prevCount || next.baseBuildArea !== prev.baseBuildArea || next.floorCount !== prev.floorCount) {
        const footprintResult = calculateFootprint(next.footprintInputMode, next);
        const baseArea = next.baseBuildArea || footprintResult.area;
        const cantileverInfo = calculateCantileverDetails(next, baseArea, footprintResult);
        const upperFloorArea = cantileverInfo.upperFloorArea;
        const roofType = next.roofType || 'gable';
        const isMansard = roofType === 'mansard';
        const isDuplex = roofType === 'duplex';
        const roofAtticArea = isDuplex
          ? Math.round(upperFloorArea * 0.65 * 100) / 100
          : isMansard
          ? Math.round(upperFloorArea * 0.70 * 100) / 100
          : 0;

        next.flats = synchronizeFlats(
          next.flats || prev.flats,
          nextCount,
          baseArea,
          next.floorCount,
          next.transformationStatus,
          roofType,
          next.flatsPerFloor || 2,
          next.mansardFlatCount,
          roofAtticArea,
          next.hasGroundFloorShop,
          next.shopCount || 1,
          upperFloorArea
        );
        // Keep contractor IDs valid
        next.contractorFlatIds = (next.contractorFlatIds || prev.contractorFlatIds || []).filter(
          (id) => id <= nextCount
        );
      }

      return next;
    });
    showNotification(
      'success',
      '3D Model, Kat Planı ve Hesaplama Paneli ölçüleri anlık olarak senkronize edildi.'
    );
  };

  const results: CalculationResult = useMemo(() => {
    return calculateProject(params);
  }, [params]);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [historyList, setHistoryList] = useState<SavedProjectData[]>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // High-performance debounced persistence (prevents input lag and stutter)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('ab_yapi_last_params', JSON.stringify(params));
      } catch (e) {}
    }, 300);
    return () => clearTimeout(timer);
  }, [params]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('ab_yapi_building_model', JSON.stringify(buildingModelParams));
      } catch (e) {}
    }, 300);
    return () => clearTimeout(timer);
  }, [buildingModelParams]);

  // Flush pending data immediately if page closes
  useEffect(() => {
    const flushData = () => {
      try {
        localStorage.setItem('ab_yapi_last_params', JSON.stringify(params));
        localStorage.setItem('ab_yapi_building_model', JSON.stringify(buildingModelParams));
      } catch (e) {}
    };
    window.addEventListener('beforeunload', flushData);
    return () => window.removeEventListener('beforeunload', flushData);
  }, [params, buildingModelParams]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  const handleCalculate = () => {
    const newSnapshot: SavedProjectData = {
      version: '1.0.0',
      savedAt: new Date().toISOString(),
      projectAddress: params.projectAddress,
      params,
      results,
    };
    const updatedHistory = [newSnapshot, ...historyList.slice(0, 19)];
    setHistoryList(updatedHistory);
    try {
      localStorage.setItem('ab_yapi_history', JSON.stringify(updatedHistory));
    } catch (e) {}
    showNotification('success', 'Hesaplama tamamlandı ve tüm tablolar güncellendi!');
  };

  const handleQuickSave = () => {
    handleCalculate();
  };

  const handleExportJson = (includeHistory = false) => {
    const exportData = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      params,
      buildingModelParams,
      ...(includeHistory ? { historyList } : {}),
    };
    const data = JSON.stringify(exportData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanAddress = (params.projectAddress || 'AB_YAPI_Proje')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .slice(0, 30);
    a.download = `${cleanAddress}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('success', 'Proje verileri başarıyla dışa aktarıldı (JSON).');
  };

  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        const paramsObj = data.params || data;
        if (paramsObj && (paramsObj.landArea !== undefined || paramsObj.projectAddress)) {
          setParams(paramsObj);
          if (data.buildingModelParams) setBuildingModelParams(data.buildingModelParams);
          if (data.historyList && Array.isArray(data.historyList)) {
            setHistoryList(data.historyList);
            try {
              localStorage.setItem('ab_yapi_history', JSON.stringify(data.historyList));
            } catch (err) {}
          }
          showNotification('success', `"${paramsObj.projectAddress || 'Proje'}" başarıyla yüklendi.`);
          setActiveTab('kurulum');
        } else {
          throw new Error('Geçersiz veya eksik dosya formatı.');
        }
      } catch (err: any) {
        showNotification('error', 'Dosya okunamadı: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleImportProjectData = (imported: {
    params: ProjectParams;
    buildingModelParams?: BuildingModelParams;
    historyList?: SavedProjectData[];
  }) => {
    try {
      if (imported.params) {
        setParams(imported.params);
        if (imported.buildingModelParams) setBuildingModelParams(imported.buildingModelParams);
        if (imported.historyList && Array.isArray(imported.historyList)) {
          setHistoryList(imported.historyList);
          try {
            localStorage.setItem('ab_yapi_history', JSON.stringify(imported.historyList));
          } catch (e) {}
        }
        showNotification('success', `"${imported.params.projectAddress || 'Proje'}" verileri çalışma alanına yüklendi.`);
        setActiveTab('kurulum');
      }
    } catch (err: any) {
      showNotification('error', 'Proje aktarılamadı: ' + err.message);
    }
  };

  const handleLoadProject = (savedData: SavedProjectData) => {
    if (savedData && savedData.params) {
      setParams(savedData.params);
      showNotification('success', `"${savedData.projectAddress}" projesi başarıyla yüklendi.`);
      setActiveTab('hesapla');
    }
  };

  const handleClearHistory = () => {
    setHistoryList([]);
    try {
      localStorage.removeItem('ab_yapi_history');
    } catch (e) {}
    showNotification('success', 'Hesaplama geçmişi temizlendi.');
  };

  const handleDeleteHistoryItem = (index: number) => {
    const updated = historyList.filter((_, idx) => idx !== index);
    setHistoryList(updated);
    try {
      localStorage.setItem('ab_yapi_history', JSON.stringify(updated));
    } catch (e) {}
    showNotification('success', 'Seçilen proje kaydı başarıyla silindi.');
  };

  // Group tabs by category
  const categorizedTabs = TAB_CATEGORIES.map(cat => ({
    ...cat,
    tabs: tabsConfig.filter(t => t.category === cat.id && t.visible).sort((a, b) => a.order - b.order)
  }));

  // If mobile Lite mode is active, render the dedicated LiteMobileView
  if (appMode === 'lite') {
    return (
      <Suspense fallback={<TabLoadingSkeleton theme={theme} title="Mobil Lite Sürüm Hazırlanıyor..." />}>
        <LiteMobileView
          params={params}
          results={results}
          onChangeParams={updateCalculatorParams}
          onSwitchToFull={() => {
            setAppMode('full');
            try {
              localStorage.removeItem('ab_yapi_mode');
            } catch (e) {}
          }}
          theme={theme}
          onToggleTheme={toggleTheme}
          onQuickSave={handleQuickSave}
          onOpenTransferModal={() => setIsProjectTransferOpen(true)}
        />
      </Suspense>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-indigo-500/30 selection:text-indigo-800 w-full max-w-full overflow-x-hidden ${
        isGray ? 'bg-slate-200/80 text-slate-900' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <div className="sticky top-0 z-30 print:hidden w-full max-w-full overflow-hidden">
        <Header
          onExportJson={handleExportJson}
          onImportJson={handleImportJson}
          onOpenTransferModal={() => setIsProjectTransferOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          onNavigateToCompletedProjects={() => setActiveTab('tamamlanan')}
          appMode={appMode}
          onToggleAppMode={toggleAppMode}
        />
      </div>

      {/* Top Menu Bar (Categorized & Sticky) */}
      <div className={`sticky top-[64px] z-20 border-b shadow-sm transition-colors print:hidden w-full max-w-full overflow-hidden ${
        isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar w-full max-w-full">
          {categorizedTabs.map((cat, catIdx) => (
            <div key={cat.id} className="flex items-center gap-1 shrink-0">
              {catIdx > 0 && <div className="w-[1px] h-4 bg-slate-300 mx-1" />}
              <div className={`flex flex-col gap-0.5 ${catIdx === 0 ? '' : 'ml-1'}`}>
                <span className="text-[8px] uppercase tracking-tighter font-bold text-slate-400 px-1">{cat.label}</span>
                <div className="flex items-center gap-1.5">
                  {cat.tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        title={tab.label}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap shrink-0 ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-[1.02]'
                            : isGray
                            ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : ''}`} />
                        <span>{tab.shortLabel}</span>
                        {tab.id === 'gecmis' && (
                          <span className={`ml-0.5 text-[9px] px-1.5 rounded-full font-bold ${
                            isActive ? 'bg-indigo-500 text-white' : 'bg-pink-100 text-pink-800'
                          }`}>
                            {historyList.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {/* Quick Mobile Lite Mode Switch Button */}
          <button
            type="button"
            onClick={toggleAppMode}
            title="Mobil Lite Sürüme Geç"
            className={`self-end mb-0.5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 border cursor-pointer active:scale-95 ${
              isGray
                ? 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border-indigo-200 shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 shadow-xs'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Mobil Lite</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMenuSettingsOpen(true)}
            title="Menü Ayarları"
            className={`ml-auto self-end mb-0.5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
              isGray
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 border-slate-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Menü</span>
          </button>
        </div>
      </div>

      {/* Global Live Summary Bar */}
      <div className="sticky top-[118px] z-10 print:hidden w-full max-w-full overflow-hidden">
        <CompactSummaryBar
          results={results}
          params={params}
          theme={theme}
          onNavigateToItem={handleSummaryChipNavigate}
        />
      </div>

      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 pb-12 print:p-0 print:m-0 print:max-w-none print:w-full print:pb-0 flex flex-col gap-6 w-full max-w-full overflow-x-hidden min-w-0">
        {/* Tab Views */}
        <div className="flex-1 w-full min-w-0 max-w-full overflow-x-hidden">
          {feedback && (
            <div
              className={`mb-5 p-4 rounded-2xl text-xs flex items-center justify-between border shadow-sm transition-all animate-fade-in print:hidden ${
                feedback.type === 'success'
                  ? isGray
                    ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : isGray
                  ? 'bg-red-100/90 text-red-900 border-red-300'
                  : 'bg-red-50 text-red-900 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span className="font-semibold text-slate-800">
                  {feedback.message}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-slate-700 text-base leading-none px-1"
              >
                &times;
              </button>
            </div>
          )}

        {/* Tab Views */}
        <ErrorBoundary fallbackTitle="Sekme Yüklenirken Bir Hata Oluştu">
          <Suspense fallback={<TabLoadingSkeleton theme={theme} />}>
            {activeTab === 'kurulum' && (
            <ProjectSetupTab
              params={params}
              onChangeParams={updateCalculatorParams}
              onNext={() => setActiveTab('model')}
              onNavigateToModel={() => setActiveTab('model')}
              onNavigateToOwners={() => setActiveTab('malikler')}
              onOpenTransferModal={() => setIsProjectTransferOpen(true)}
              theme={theme}
              requestedStep={requestedSetupStep}
              onStepChange={setRequestedSetupStep}
            />
          )}

          {activeTab === 'model' && (
            <BuildingModelTab
              params={buildingModelParams}
              onUpdateParams={updateBuildingModelParams}
              onSyncWithCalculator={handleSyncModelToCalculator}
              theme={theme}
            />
          )}

          {activeTab === 'maliyet' && (
            <CostDetailsTab
              params={params}
              results={results}
              theme={theme}
              onChangeParams={updateCalculatorParams}
              onCalculate={handleCalculate}
            />
          )}

          {activeTab === 'malikler' && (
            <OwnersTab
              params={params}
              results={results}
              onChangeParams={updateCalculatorParams}
              onCalculate={handleCalculate}
              theme={theme}
            />
          )}

          {activeTab === 'teklif' && (
            <OfferTab
              params={params}
              results={results}
              onUpdateParam={(key, val) => updateCalculatorParams({ ...params, [key]: val })}
              onNavigateToSurec={() => setActiveTab('surec')}
              theme={theme}
            />
          )}

          {activeTab === 'surec' && (
            <ConstructionProgressTab
              params={params}
              results={results}
              theme={theme}
              onNavigateToOffer={() => setActiveTab('teklif')}
              onNavigateToContract={() => setActiveTab('sozlesme')}
            />
          )}

          {activeTab === 'sozlesme' && (
            <ContractTab
              params={params}
              results={results}
              onUpdateParam={(key, val) => updateCalculatorParams({ ...params, [key]: val })}
              theme={theme}
            />
          )}

          {activeTab === 'sartname' && (
            <SpecificationTab
              params={params}
              results={results}
              theme={theme}
            />
          )}

          {activeTab === 'raporlar' && (
            <AdminReportTab
              params={params}
              results={results}
              theme={theme}
            />
          )}

          {activeTab === 'profile' && (
            <CompanyProfileTab
              theme={theme}
            />
          )}

          {activeTab === 'tamamlanan' && (
            <CompletedProjectsTab
              theme={theme}
            />
          )}

          {activeTab === 'gecmis' && (
            <HistoryTab
              historyList={historyList}
              onLoadItem={handleLoadProject}
              onClearHistory={handleClearHistory}
              onDeleteItem={handleDeleteHistoryItem}
              onOpenTransferModal={() => setIsProjectTransferOpen(true)}
              theme={theme}
            />
          )}
          </Suspense>
        </ErrorBoundary>
        
        <TabNavigation
          activeTab={activeTab}
          tabs={tabsConfig}
          onNavigate={setActiveTab}
          theme={theme}
        />
      </div>
    </main>

    {isMenuSettingsOpen && (
      <Suspense fallback={null}>
        <MenuSettingsModal
          isOpen={isMenuSettingsOpen}
          onClose={() => setIsMenuSettingsOpen(false)}
          tabs={tabsConfig}
          onSave={handleSaveTabs}
          theme={theme}
        />
      </Suspense>
    )}

    <ProjectTransferModal
      isOpen={isProjectTransferOpen}
      onClose={() => setIsProjectTransferOpen(false)}
      currentParams={params}
      currentBuildingModelParams={buildingModelParams}
      onImportProject={handleImportProjectData}
      onExportProject={handleExportJson}
      historyList={historyList}
      theme={theme}
    />

    </div>
  );
}
