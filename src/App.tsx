import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, Suspense } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Settings2,
  Menu as MenuIcon,
  Check,
  PanelLeftClose,
  PanelLeft,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Header } from './components/Header';
import { AdminLicenseManager } from './components/AdminLicenseManager';
import { CompactSummaryBar } from './components/CompactSummaryBar';
import { TabLoadingSkeleton } from './components/TabLoadingSkeleton';
import { Logo } from './components/Logo';

import { ErrorBoundary } from './components/ErrorBoundary';
import { useFirebaseSync } from './context/FirebaseSyncContext';
import { getSafeProjectKey, getLegacySafeProjectKey, resolveProjectProgressKeys } from './utils/syncKeys';

// Primary tabs imported directly for instant, rock-solid mobile & Safari initial paint
import { ProjectSetupTab } from './components/ProjectSetupTab';
import { LiteMobileView } from './components/LiteMobileView';
import { ProjectTransferModal } from './components/ProjectTransferModal';
import {
  evaluateWorkbenchProject,
  WorkbenchNavigationRequest,
  WorkbenchStageNavigationOptions,
  isStage6CostFocusField,
} from './components/ProjectWorkbench/WorkbenchLiveSummary';

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


import { DEFAULT_PARAMS, calculateProject, synchronizeFlats, calculateFlatCount, calculateCantileverDetails, getInitialProjectParams } from './utils/calculatorEngine';
import { DEFAULT_BUILDING_PARAMS, getInitialBuildingModelParams } from './utils/buildingModelUtils';
import { calculateFootprint } from './utils/footprintUtils';
import { mergeProjectLists, shouldApplyCloudActiveState } from './utils/syncKeys';
import { getCurrentArchiveProjects } from './utils/projectArchive';
import {
  applyCalculatorParamsUpdate,
  applyBuildingModelUpdateToProjectParams,
  buildProposalStatusChangePatch,
  resolveEffectiveProposalStatus,
  sanitizeContractorFlatIds,
  syncFlatsContractorShareFlags,
  syncProjectParamsToBuildingModel,
} from './utils/workflowConsistencyUtils';
import {
  ProjectParams,
  CalculationResult,
  SavedProjectData,
  BuildingModelParams,
  AppTheme,
} from './types';

import { useCompanyProfile } from './context/CompanyProfileContext';
import { projectBasePrices } from './utils/companyPrices';
import { latestExchange } from './hooks/useMarketData';

export default function App() {
  const { profile } = useCompanyProfile();
  const newPriceDefaults = () => projectBasePrices(profile, latestExchange());
  const { 
    user, 
    isLicensed,
    saveProjectToCloud, 
    loadProjectsFromCloud, 
    deleteProjectFromCloud,
    saveActiveStateToCloud,
    loadActiveStateFromCloud,
    isAuthInitialized
  } = useFirebaseSync();
  const [isAdminLicensesOpen, setIsAdminLicensesOpen] = useState(false);
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
        // Restore icon references and enforce canonical order and category from DEFAULT_TABS
        return DEFAULT_TABS.map(defaultTab => {
          const savedTab = parsed.find(t => t.id === defaultTab.id);
          return savedTab
            ? { ...defaultTab, visible: savedTab.visible ?? defaultTab.visible, order: defaultTab.order, category: defaultTab.category, shortLabel: defaultTab.shortLabel, label: defaultTab.label }
            : defaultTab;
        }).sort((a, b) => a.order - b.order);
      }
    } catch (e) {}
    return DEFAULT_TABS;
  });

  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [requestedSetupStep, setRequestedSetupStep] = useState<number | undefined>(1);
  const [workbenchNavRequest, setWorkbenchNavRequest] = useState<WorkbenchNavigationRequest | null>(null);
  const workbenchNavNonceRef = useRef<number>(0);
  const [isProjectFlowOpen, setIsProjectFlowOpen] = useState<boolean>(false);
  const [isMenuSettingsOpen, setIsMenuSettingsOpen] = useState(false);
  const [isProjectTransferOpen, setIsProjectTransferOpen] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_sidebar');
      if (saved !== null) return saved === 'true';
    } catch (e) {}
    return true;
  });

  const toggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    try {
      localStorage.setItem('ab_yapi_sidebar', String(next));
    } catch (e) {}
  };

  const focusElementById = (targetId?: string) => {
    if (!targetId) return;
    setTimeout(() => {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-indigo-500/60', 'ring-offset-2', 'transition-all', 'duration-700');
        if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
          element.focus();
        }
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-indigo-500/60', 'ring-offset-2');
        }, 2500);
      }
    }, 120);
  };

  const navigateToWorkbenchStage = (
    stage: number,
    focusFieldId?: string,
    options?: WorkbenchStageNavigationOptions
  ) => {
    const normalized = Math.min(9, Math.max(1, stage));
    workbenchNavNonceRef.current += 1;
    const stage6SubView =
      options?.stage6SubView ??
      (normalized === 6 && isStage6CostFocusField(focusFieldId) ? 'cost' : undefined);
    setRequestedSetupStep(normalized);
    setWorkbenchNavRequest({
      step: normalized,
      focusFieldId,
      stage6SubView,
      stage8SubView: options?.stage8SubView,
      nonce: workbenchNavNonceRef.current,
    });
    setActiveTab('kurulum');
  };

  const handleSummaryChipNavigate = (itemId: string) => {
    let targetTab: TabId = 'kurulum';
    let targetId = '';
    let setupStep: number | undefined = undefined;

    switch (itemId) {
      case 'taban-alani':
        targetTab = 'kurulum';
        setupStep = 2;
        targetId = 'projectBaseAreaInput';
        break;
      case 'cikmali-taban':
        targetTab = 'kurulum';
        setupStep = 3;
        targetId = 'stage3CantileverCard';
        break;
      case 'kat-bolum':
        targetTab = 'kurulum';
        setupStep = 3;
        targetId = 'minimalFloorCountInput';
        break;
      case 'toplam-insaat':
        targetTab = 'kurulum';
        setupStep = 3;
        targetId = 'minimalFloorCountInput';
        break;
      case 'birim-satis':
        targetTab = 'kurulum';
        setupStep = 2;
        targetId = 'stage2OfferUnitPriceInput';
        break;
      case 'net-maliyet':
        targetTab = 'maliyet';
        targetId = 'cost-details-container';
        break;
      case 'hedef-bedel':
        targetTab = 'kurulum';
        setupStep = 6;
        targetId = 'stage6CostParamsCard';
        break;
      case 'teslim-suresi':
        targetTab = 'kurulum';
        setupStep = 6;
        targetId = 'stage6DurationSelect';
        break;
      default:
        break;
    }

    if (targetTab === 'kurulum' && setupStep !== undefined) {
      navigateToWorkbenchStage(setupStep, targetId || undefined);
      return;
    }

    setActiveTab(targetTab);
    focusElementById(targetId);
  };

  const activateProjectTabs = () => {
    setTabsConfig(prev => prev.map(t => {
      if (t.category === 'project_studio') return { ...t, visible: true };
      return t;
    }));
  };

  // App mode: 'full' (standart tam sürüm)
  // Kullanıcı isteği doğrultusunda uygulama hem mobil hem masaüstü cihazlarda daima 'full' (tam) sürüm olarak açılır.
  const [appMode, setAppMode] = useState<'full' | 'lite'>('full');

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
    return { ...DEFAULT_PARAMS, ...newPriceDefaults() };
  });

  const [buildingModelParams, setBuildingModelParams] = useState<BuildingModelParams>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_building_model');
      if (saved) {
        const parsed = JSON.parse(saved);
        const fpInit = calculateFootprint(params.footprintInputMode || 'directArea', params);
        const isDirectInit = !params.footprintInputMode || params.footprintInputMode === 'directArea';
        return {
          ...DEFAULT_BUILDING_PARAMS,
          ...parsed,
          floorCount: params.floorCount,
          floorHeight: params.floorHeight || 2.90,
          flatsPerFloor: params.flatsPerFloor || 2,
          roomType: params.roomType || '3+1',
          roofType: params.roofType || 'gable',
          mansardFlatCount: params.mansardFlatCount !== undefined ? params.mansardFlatCount : parsed.mansardFlatCount,
          wallColor: parsed.wallColor || params.wallColor || DEFAULT_BUILDING_PARAMS.wallColor,
          roofColor: parsed.roofColor || params.roofColor || DEFAULT_BUILDING_PARAMS.roofColor,
          accentColor: parsed.accentColor || params.accentColor || DEFAULT_BUILDING_PARAMS.accentColor,
          frameColor: parsed.frameColor || params.frameColor || DEFAULT_BUILDING_PARAMS.frameColor,
          slabColor: parsed.slabColor || params.slabColor || DEFAULT_BUILDING_PARAMS.slabColor,
          facadeStyle: params.facadeStyle || 'wood_anthracite',
          facadeWidth: isDirectInit ? fpInit.effectiveWidth : (params.facadeWidth || 14.0),
          facadeDepth: isDirectInit ? fpInit.effectiveDepth : (params.facadeDepth || 18.0),
          backFacadeLength: isDirectInit ? fpInit.effectiveWidth : (params.backFacadeLength !== undefined ? params.backFacadeLength : (params.facadeWidth || 14.0)),
          leftFacadeLength: isDirectInit ? fpInit.effectiveDepth : (params.leftFacadeLength !== undefined ? params.leftFacadeLength : (params.facadeDepth || 18.0)),
          baseBuildArea: params.baseBuildArea,
          basementCount: params.basementCount !== undefined ? params.basementCount : 1,
          elevatorCount: params.elevatorCount !== undefined ? params.elevatorCount : 1,
          balconyDepth: params.balconyDepth !== undefined ? params.balconyDepth : 1.4,
          hasGroundFloorShop: !!params.hasGroundFloorShop,
          hasBasementShop: params.hasBasementShop,
          basementPurpose: params.basementPurpose,
          basementShopCount: params.basementShopCount,
          shopLocation: params.shopLocation,
          basementConfig: params.basementConfig,
          shopCount: params.shopCount || 1,
          shopArea: params.shopArea !== undefined ? params.shopArea : parsed.shopArea,
          shopHeight: params.shopHeight || 3.8,
          flatCount: params.flatCount,
          hasCantilever: params.hasCantilever,
          cantileverDepth: params.cantileverDepth,
          cantileverDirection: params.cantileverDirection,
          facadeCantilevers: params.facadeCantilevers,
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
          flats: params.flats,
        };
      }
    } catch (e) {}
    const fpFallback = calculateFootprint(params.footprintInputMode || 'directArea', params);
    const isDirectFallback = !params.footprintInputMode || params.footprintInputMode === 'directArea';
    return {
      ...DEFAULT_BUILDING_PARAMS,
      floorCount: params.floorCount,
      floorHeight: params.floorHeight || 2.90,
      flatsPerFloor: params.flatsPerFloor || 2,
      roomType: params.roomType || '3+1',
      roofType: params.roofType || 'gable',
      mansardFlatCount: params.mansardFlatCount,
      wallColor: params.wallColor || DEFAULT_BUILDING_PARAMS.wallColor,
      roofColor: params.roofColor || DEFAULT_BUILDING_PARAMS.roofColor,
      accentColor: params.accentColor || DEFAULT_BUILDING_PARAMS.accentColor,
      frameColor: params.frameColor || DEFAULT_BUILDING_PARAMS.frameColor,
      slabColor: params.slabColor || DEFAULT_BUILDING_PARAMS.slabColor,
      facadeStyle: params.facadeStyle || 'wood_anthracite',
      facadeWidth: isDirectFallback ? fpFallback.effectiveWidth : (params.facadeWidth || 14.0),
      facadeDepth: isDirectFallback ? fpFallback.effectiveDepth : (params.facadeDepth || 18.0),
      backFacadeLength: isDirectFallback ? fpFallback.effectiveWidth : (params.backFacadeLength !== undefined ? params.backFacadeLength : (params.facadeWidth || 14.0)),
      leftFacadeLength: isDirectFallback ? fpFallback.effectiveDepth : (params.leftFacadeLength !== undefined ? params.leftFacadeLength : (params.facadeDepth || 18.0)),
      baseBuildArea: params.baseBuildArea,
      basementCount: params.basementCount !== undefined ? params.basementCount : 1,
      elevatorCount: params.elevatorCount !== undefined ? params.elevatorCount : 1,
      balconyDepth: params.balconyDepth !== undefined ? params.balconyDepth : 1.4,
      hasGroundFloorShop: !!params.hasGroundFloorShop,
      shopCount: params.shopCount || 1,
      shopArea: params.shopArea,
      shopHeight: params.shopHeight || 3.8,
      flatCount: params.flatCount,
      flats: params.flats,
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
    setParams((prevParams) => {
      const sanitizedParams = applyCalculatorParamsUpdate(prevParams, newParamsOrUpdates);

      // Live Sync from Proje Künyesi / Hesap to Building Model:
      setBuildingModelParams((prevModel) => syncProjectParamsToBuildingModel(prevModel, sanitizedParams));

      return sanitizedParams;
    });
  };

  // Live Sync from Building Model to Calculator: Synchronize all shared/matching data instantly
  const updateBuildingModelParams = (updates: Partial<BuildingModelParams>) => {
    // 1. Synchronize all matching parameters live to Calculator (ProjectParams)
    setParams((prev) => {
      const nextParams = applyBuildingModelUpdateToProjectParams(prev, updates);

      // 2. Update 3D Building Model state with validated contractorFlatIds & synchronized architectural params
      setBuildingModelParams((prevModel) => ({
        ...prevModel,
        ...updates,
        roofType: nextParams.roofType || prevModel.roofType,
        mansardFlatCount: nextParams.mansardFlatCount,
        shopArea: nextParams.shopArea !== undefined ? nextParams.shopArea : prevModel.shopArea,
        flatCount: nextParams.flatCount,
        flats: nextParams.flats,
        contractorFlatIds: nextParams.contractorFlatIds,
      }));

      return nextParams;
    });
  };

  const results: CalculationResult = useMemo(() => {
    return calculateProject(params);
  }, [params]);

  // LITE SURUM GENEL HESAPLAMADAN BAGIMSIZ PARAMETRELER VE HESAP MOTORU
  const [liteParams, setLiteParams] = useState<ProjectParams>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_lite_params');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return {
      ...DEFAULT_PARAMS, ...newPriceDefaults(),
      projectName: 'Hızlı Sözlü Teklif',
      projectAddress: 'Hızlı Teklif Sahası',
      floorCount: 5,
      flatsPerFloor: 2,
      hasGroundFloorShop: false,
      shopCount: 0,
      flatCount: 10,
    };
  });

  const liteResults: CalculationResult = useMemo(() => {
    return calculateProject(liteParams);
  }, [liteParams]);

  const updateLiteCalculatorParams = (newParamsOrUpdates: ProjectParams | Partial<ProjectParams>) => {
    const newParams: ProjectParams = {
      ...liteParams,
      ...newParamsOrUpdates,
    };
    
    const footprintResult = calculateFootprint(newParams.footprintInputMode, newParams);
    let activeBaseArea = newParams.baseBuildArea;
    if (!activeBaseArea || activeBaseArea <= 0) {
      activeBaseArea = footprintResult.area;
    }

    const cantileverInfo = calculateCantileverDetails(newParams, activeBaseArea, footprintResult);
    const upperFloorArea = cantileverInfo.upperFloorArea;

    const resFloors = newParams.hasGroundFloorShop
      ? Math.max(0, newParams.floorCount - 1)
      : newParams.floorCount;

    const roofType = newParams.roofType || 'gable';
    const isMansard = roofType === 'mansard';
    const isDuplex = roofType === 'duplex';
    const flatsPerFloor = newParams.flatsPerFloor || 2;

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
      upperFloorArea,
      newParams.basementPurpose,
      newParams.basementShopCount || 1,
      newParams.basementCount !== undefined ? newParams.basementCount : 1,
      newParams.basementConfig
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

    setLiteParams(sanitizedParams);
    try {
      localStorage.setItem('ab_yapi_lite_params', JSON.stringify(sanitizedParams));
    } catch (e) {}
  };

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [historyList, setHistoryList] = useState<SavedProjectData[]>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_history');
      const list = saved ? JSON.parse(saved) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {}
    return [];
  });

  const currentArchive = useMemo(() => getCurrentArchiveProjects(historyList), [historyList]);
  const archiveProjectCount = currentArchive.length;

  const openedArchiveKeyRef = useRef<string | null>(null);
  const latestHistoryRef = useRef(historyList);
  useLayoutEffect(() => {
    latestHistoryRef.current = historyList;
  }, [historyList]);

  const isCloudInitialSyncDoneRef = useRef(false);
  const lastLocalSignatureRef = useRef<string>('');

  // Synchronize calculation history and active state with Firebase on login (with timestamp comparison)
  useEffect(() => {
    if (!user || !isAuthInitialized || !isLicensed) {
      isCloudInitialSyncDoneRef.current = false;
      return;
    }

    let cancelled = false;
    const syncWithFirebase = async () => {
      try {
        // 1. Sync History with savedAt / updatedAt comparison (preserves both local & cloud work)
        const cloudProjects = await loadProjectsFromCloud();
        if (cancelled) return;

        const { merged, toUpload } = mergeProjectLists(latestHistoryRef.current, cloudProjects || []);
        setHistoryList(merged);
        try {
          localStorage.setItem('ab_yapi_history', JSON.stringify(merged));
        } catch (e) {}

        for (const projToUpload of toUpload) {
          if (cancelled) return;
          try {
            await saveProjectToCloud(projToUpload);
          } catch (uploadErr) {
            console.warn('Yerel proje buluta aktarılamadı:', projToUpload.projectAddress, uploadErr);
          }
        }

        // 2. Sync Active State (compare local updatedAt vs cloud updatedAt)
        const cloudActiveState = await loadActiveStateFromCloud();
        if (cancelled) return;

        let localUpdatedAt: string | null = null;
        try {
          localUpdatedAt = localStorage.getItem('ab_yapi_active_updated_at');
        } catch (e) {}

        if (cloudActiveState && shouldApplyCloudActiveState(localUpdatedAt, cloudActiveState.updatedAt)) {
          const nextParams = cloudActiveState.params || params;
          const nextModel = cloudActiveState.buildingModel || buildingModelParams;
          const nextActiveTab = cloudActiveState.uiState?.activeTab || activeTab;
          const cloudTabsConfig = cloudActiveState.uiState?.tabsConfig;

          if (cloudActiveState.params) {
            openedArchiveKeyRef.current = null;
            setParams(cloudActiveState.params);
            try {
              localStorage.setItem('ab_yapi_last_params', JSON.stringify(cloudActiveState.params));
            } catch (e) {}
          }
          if (cloudActiveState.buildingModel) {
            setBuildingModelParams(cloudActiveState.buildingModel);
            try {
              localStorage.setItem('ab_yapi_building_model', JSON.stringify(cloudActiveState.buildingModel));
            } catch (e) {}
          }
          if (cloudActiveState.uiState) {
            const cloudActiveTab = cloudActiveState.uiState.activeTab;
            if (cloudActiveTabValid(cloudActiveTab)) {
              setActiveTab(cloudActiveTab);
            }
            if (cloudTabsConfig) {
              setTabsConfig(prev => {
                const updatedTabs = prev.map(defaultTab => {
                  const savedTab = cloudTabsConfig.find((t: any) => t.id === defaultTab.id);
                  return savedTab ? {
                    ...defaultTab,
                    visible: savedTab.visible ?? defaultTab.visible,
                    order: savedTab.order ?? defaultTab.order,
                    label: savedTab.label ?? defaultTab.label,
                    shortLabel: savedTab.shortLabel ?? defaultTab.shortLabel
                  } : defaultTab;
                }).sort((a, b) => a.order - b.order);
                return updatedTabs;
              });
              try {
                localStorage.setItem('ab_yapi_tabs', JSON.stringify(cloudTabsConfig));
              } catch (e) {}
            }
          }

          const resolvedTimestamp = cloudActiveState.updatedAt || new Date().toISOString();
          try {
            localStorage.setItem('ab_yapi_active_updated_at', resolvedTimestamp);
          } catch (e) {}
          lastLocalSignatureRef.current = JSON.stringify({
            params: nextParams,
            buildingModelParams: nextModel,
            activeTab: nextActiveTab,
          });
        } else {
          // Local state is newer (or cloud is empty); back up local active state to cloud
          const pushTs = localUpdatedAt || new Date().toISOString();
          try {
            localStorage.setItem('ab_yapi_active_updated_at', pushTs);
          } catch (e) {}
          await saveActiveStateToCloud(
            params,
            buildingModelParams,
            {
              activeTab,
              tabsConfig: tabsConfig.map(t => ({
                id: t.id,
                visible: t.visible,
                order: t.order,
                label: t.label,
                shortLabel: t.shortLabel
              }))
            },
            pushTs
          ).catch(err => {
            console.warn('Yerel aktif durum buluta yüklenemedi:', err);
          });
        }
      } catch (err) {
        console.warn('Failed to sync with Firebase:', err);
      } finally {
        if (!cancelled) {
          isCloudInitialSyncDoneRef.current = true;
        }
      }
    };

    function cloudActiveTabValid(tabId: any): tabId is TabId {
      return typeof tabId === 'string' && DEFAULT_TABS.some(t => t.id === tabId);
    }

    syncWithFirebase();
    return () => {
      cancelled = true;
    };
  }, [user, isAuthInitialized, isLicensed]);

  // High-performance debounced persistence (Local Storage & Cloud)
  useEffect(() => {
    const currentSignature = JSON.stringify({ params, buildingModelParams, activeTab });
    if (!lastLocalSignatureRef.current) {
      lastLocalSignatureRef.current = currentSignature;
    }

    const timer = setTimeout(() => {
      const hasChanged = currentSignature !== lastLocalSignatureRef.current;
      const nowIso = new Date().toISOString();

      try {
        localStorage.setItem('ab_yapi_last_params', JSON.stringify(params));
        localStorage.setItem('ab_yapi_building_model', JSON.stringify(buildingModelParams));
        localStorage.setItem('ab_yapi_tabs', JSON.stringify(tabsConfig));
        if (hasChanged) {
          localStorage.setItem('ab_yapi_active_updated_at', nowIso);
          lastLocalSignatureRef.current = currentSignature;
        }
      } catch (e) {}

      if (user && isAuthInitialized && isLicensed && isCloudInitialSyncDoneRef.current && hasChanged) {
        saveActiveStateToCloud(
          params,
          buildingModelParams,
          {
            activeTab,
            tabsConfig: tabsConfig.map(t => ({
              id: t.id,
              visible: t.visible,
              order: t.order,
              label: t.label,
              shortLabel: t.shortLabel
            }))
          },
          nowIso
        ).catch(err => {
          console.warn('Aktif çalışma bulut senkronizasyonu başarısız oldu:', err);
        });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [params, buildingModelParams, tabsConfig, activeTab, user, isAuthInitialized, isLicensed]);

  // Flush pending data immediately if page closes
  useEffect(() => {
    const flushData = () => {
      try {
        const currentSignature = JSON.stringify({ params, buildingModelParams, activeTab });
        const nextTabs = JSON.stringify(tabsConfig);
        const prevTabs = localStorage.getItem('ab_yapi_tabs');
        const hasPendingChanges =
          (Boolean(lastLocalSignatureRef.current) && currentSignature !== lastLocalSignatureRef.current) ||
          (prevTabs !== null && prevTabs !== nextTabs);

        localStorage.setItem('ab_yapi_last_params', JSON.stringify(params));
        localStorage.setItem('ab_yapi_building_model', JSON.stringify(buildingModelParams));
        localStorage.setItem('ab_yapi_tabs', nextTabs);

        if (hasPendingChanges || !localStorage.getItem('ab_yapi_active_updated_at')) {
          localStorage.setItem('ab_yapi_active_updated_at', new Date().toISOString());
          lastLocalSignatureRef.current = currentSignature;
        }
      } catch (e) {}
    };
    window.addEventListener('beforeunload', flushData);
    return () => window.removeEventListener('beforeunload', flushData);
  }, [params, buildingModelParams, tabsConfig, activeTab]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // The address identifies the archive entry both locally and in Firestore.
  const activeAddressKey = getSafeProjectKey(params.projectAddress);
  const addressBelongsToAnotherProject = activeAddressKey !== openedArchiveKeyRef.current &&
    historyList.some(project => getSafeProjectKey(project.projectAddress) === activeAddressKey);

  const canSaveArchiveAddress = (address: string, allowedKey: string | null = null) => {
    const key = getSafeProjectKey(address);
    if (key === allowedKey || !latestHistoryRef.current.some(project => getSafeProjectKey(project.projectAddress) === key)) {
      return true;
    }
    showNotification('error', 'Bu adresle kayıtlı bir proje var. Güncellemek için projeyi arşivden açın veya yeni proje için farklı bir adres girin.');
    return false;
  };

  const saveProjectToArchive = (offerMeta?: ProjectParams['offerMeta']) => {
    if (!params.projectAddress.trim() || params.projectAddress === 'Yeni Kentsel Dönüşüm Projesi') {
      showNotification('error', 'Projeyi arşive kaydetmek için 1. aşamada yapı adresini veya ada ve parsel bilgisini girin.');
      return false;
    }

    if (!canSaveArchiveAddress(params.projectAddress, openedArchiveKeyRef.current)) return false;

    const existingProject = latestHistoryRef.current.find(project => getSafeProjectKey(project.projectAddress) === activeAddressKey);
    const nowIso = new Date().toISOString();
    const newSnapshot: SavedProjectData = {
      version: '1.0.0',
      savedAt: existingProject?.savedAt || nowIso,
      updatedAt: nowIso,
      projectAddress: params.projectAddress,
      params: offerMeta ? { ...params, offerMeta } : params,
      results,
      buildingModelParams, // 3D model parametrelerini de snapshot'a dahil ediyoruz!
    };
    const updatedHistory = [newSnapshot, ...latestHistoryRef.current.filter(project => project !== existingProject)];
    try {
      localStorage.setItem('ab_yapi_history', JSON.stringify(updatedHistory));
    } catch (error) {
      console.warn('Proje arşive yazılamadı:', error);
      showNotification('error', 'Proje yerel arşive kaydedilemedi. Tarayıcı depolama alanını ve izinlerini kontrol edin.');
      return false;
    }
    openedArchiveKeyRef.current = getSafeProjectKey(params.projectAddress);
    setHistoryList(updatedHistory);
    try {
      localStorage.setItem('ab_yapi_active_updated_at', nowIso);
    } catch (e) {}

    // Back up calculated project to cloud
    if (user && isLicensed) {
      saveProjectToCloud(newSnapshot).catch(err => {
        console.warn('Failed to save calculated project to cloud:', err);
        showNotification('error', 'Yerel kayıt tamamlandı ancak bulut senkronizasyonu başarısız oldu.');
      });
    }
    showNotification('success', 'Proje arşive kaydedildi.');
    return true;
  };

  const handleCalculate = () => {
    saveProjectToArchive();
  };

 
const handleQuickSave = () => {
  const nowIso = new Date().toISOString();

  const existingProject = historyList.find(
    p => p.projectAddress === liteParams.projectAddress
  );

  const newSnapshot: SavedProjectData = {
    version: '1.0.0',
    savedAt: existingProject?.savedAt || nowIso,
    updatedAt: nowIso,
    projectAddress: liteParams.projectAddress,
    params: liteParams,
    results: liteResults,
    buildingModelParams: existingProject?.buildingModelParams || buildingModelParams,
  };

  const updatedHistory = [
    newSnapshot,
    ...historyList.filter(p => p.projectAddress !== liteParams.projectAddress),
  ];

  setHistoryList(updatedHistory);

  try {
    localStorage.setItem('ab_yapi_history', JSON.stringify(updatedHistory));
    localStorage.setItem('ab_yapi_lite_params', JSON.stringify(liteParams));
    localStorage.setItem('ab_yapi_active_updated_at', nowIso);
  } catch (e) {}

  if (user && isLicensed) {
    saveProjectToCloud(newSnapshot).catch(err => {
      console.warn('Failed to save mobile project to cloud:', err);
      showNotification('error', 'Yerel kayıt tamamlandı ancak bulut senkronizasyonu başarısız oldu.');
    });
  }

  showNotification('success', 'Mobil proje başarıyla kaydedildi!');
};


  const handleStartNewProject = (customAddress?: string) => {
    if (!addressBelongsToAnotherProject && params.projectAddress.trim() && params.projectAddress !== 'Yeni Kentsel Dönüşüm Projesi') {
      if (!saveProjectToArchive()) return;
    }

    openedArchiveKeyRef.current = null;
    const initialP = { ...getInitialProjectParams(customAddress ?? ''), ...newPriceDefaults() };
    const initialModel = getInitialBuildingModelParams();

    setParams(initialP);
    setBuildingModelParams(initialModel);
    try {
      localStorage.setItem('ab_yapi_last_params', JSON.stringify(initialP));
      localStorage.setItem('ab_yapi_building_model', JSON.stringify(initialModel));
    } catch (e) {}

    activateProjectTabs();
    setActiveTab('kurulum');
    setRequestedSetupStep(1);
    showNotification('success', addressBelongsToAnotherProject
      ? 'Kayıtlı proje korunarak yeni çalışma alanı açıldı.'
      : 'Yeni proje çalışma alanı açıldı.');
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
          const sanitizedLoadedParams = applyCalculatorParamsUpdate(DEFAULT_PARAMS, paramsObj);
          openedArchiveKeyRef.current = null;
          setParams(sanitizedLoadedParams);
          if (data.buildingModelParams) {
            setBuildingModelParams(
              syncProjectParamsToBuildingModel(data.buildingModelParams, sanitizedLoadedParams)
            );
          } else {
            setBuildingModelParams(
              syncProjectParamsToBuildingModel(DEFAULT_BUILDING_PARAMS, sanitizedLoadedParams)
            );
          }
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
        const sanitizedLoadedParams = applyCalculatorParamsUpdate(DEFAULT_PARAMS, imported.params);
        openedArchiveKeyRef.current = null;
        setParams(sanitizedLoadedParams);
        if (imported.buildingModelParams) {
          setBuildingModelParams(
            syncProjectParamsToBuildingModel(imported.buildingModelParams, sanitizedLoadedParams)
          );
        } else {
          setBuildingModelParams(
            syncProjectParamsToBuildingModel(DEFAULT_BUILDING_PARAMS, sanitizedLoadedParams)
          );
        }
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

  const handleLoadProject = (savedData: SavedProjectData, targetTab: TabId = 'kurulum') => {
    if (savedData && savedData.params) {
      openedArchiveKeyRef.current = getSafeProjectKey(savedData.projectAddress);
      const sanitizedLoadedParams = applyCalculatorParamsUpdate(DEFAULT_PARAMS, savedData.params);
      setParams(sanitizedLoadedParams);
      if (savedData.buildingModelParams) {
        const syncedModel: BuildingModelParams = syncProjectParamsToBuildingModel(
          savedData.buildingModelParams,
          sanitizedLoadedParams
        );
        setBuildingModelParams(syncedModel);
        try {
          localStorage.setItem('ab_yapi_building_model', JSON.stringify(syncedModel));
        } catch (e) {}
      } else {
        // Eğer kayıtlı projede 3D model yoksa, o projenin params verileriyle sıfırdan oluştur
        const freshModel: BuildingModelParams = syncProjectParamsToBuildingModel(
          DEFAULT_BUILDING_PARAMS,
          sanitizedLoadedParams
        );
        setBuildingModelParams(freshModel);
        try {
          localStorage.setItem('ab_yapi_building_model', JSON.stringify(freshModel));
        } catch (e) {}
      }
      try {
        localStorage.setItem('ab_yapi_last_params', JSON.stringify(sanitizedLoadedParams));
      } catch (e) {}

      activateProjectTabs();
      showNotification('success', `"${savedData.params.projectName || savedData.projectAddress}" projesi ve 3D modeli başarıyla yüklendi.`);
      setActiveTab(targetTab);
    }
  };

  const handleLoadProjectForProgress = (savedData: SavedProjectData) => {
    handleLoadProject(savedData, 'surec');
  };

  const handleAddNewConstructionProject = (newProj: SavedProjectData) => {
    if (!canSaveArchiveAddress(newProj.projectAddress)) return;
    openedArchiveKeyRef.current = getSafeProjectKey(newProj.projectAddress);
    const updated = [newProj, ...historyList.filter(p => p.projectAddress !== newProj.projectAddress)];
    setHistoryList(updated);
    try {
      localStorage.setItem('ab_yapi_history', JSON.stringify(updated));
    } catch (e) {}
    if (user && isLicensed) {
      saveProjectToCloud(newProj).catch(err => {
        console.warn('Yeni şantiye buluta kaydedilemedi:', err);
        showNotification('error', 'Şantiye yerel olarak oluşturuldu ancak buluta kaydedilemedi.');
      });
    }
    const sanitizedNewParams = applyCalculatorParamsUpdate(DEFAULT_PARAMS, newProj.params);
    setParams(sanitizedNewParams);
    if (newProj.buildingModelParams) {
      setBuildingModelParams(
        syncProjectParamsToBuildingModel(newProj.buildingModelParams, sanitizedNewParams)
      );
    } else {
      setBuildingModelParams(
        syncProjectParamsToBuildingModel(DEFAULT_BUILDING_PARAMS, sanitizedNewParams)
      );
    }
    activateProjectTabs();
    showNotification('success', `Yeni şantiye "${newProj.projectAddress}" başarıyla oluşturuldu ve yüklendi.`);
    setActiveTab('surec');
  };

  const deleteArchivedProjects = (targets: SavedProjectData[]) => {
    const updated = historyList.filter(project => !targets.includes(project));
    const getProgressKeys = (project: SavedProjectData) => resolveProjectProgressKeys({
      projectAddress: project.projectAddress,
      projectName: project.params?.projectName,
      proposalNumber: project.params?.offerMeta?.proposalNumber,
      registerAliases: false,
    }).candidateKeys;
    const retainedKeys = new Set(updated.flatMap(getProgressKeys));
    const progressSuffixes = ['stages', 'logs', 'subcontractors', 'notif_history', 'contract_date', 'target_date', 'offer_accepted'];

    try {
      localStorage.setItem('ab_yapi_history', JSON.stringify(updated));
      for (const project of targets) {
        for (const key of getProgressKeys(project)) {
          if (retainedKeys.has(key)) continue;
          for (const suffix of progressSuffixes) {
            localStorage.removeItem(`ab_yapi_progress_${key}_${suffix}`);
          }
          localStorage.removeItem(`ab_yapi_offer_3d_${key}`);
        }
      }
    } catch (error) {
      console.warn('Yerel arşiv silme hatası:', error);
      showNotification('error', 'Yerel arşiv temizlenemedi.');
      return;
    }

    setHistoryList(updated);
    const activeProjectKey = getSafeProjectKey(params.projectAddress);
    if (targets.some(project => getSafeProjectKey(project.projectAddress) === activeProjectKey)) {
      if (updated.length > 0) {
        handleLoadProjectForProgress(updated[0]);
      } else {
        openedArchiveKeyRef.current = null;
        setParams({ ...getInitialProjectParams(''), ...newPriceDefaults() });
        setBuildingModelParams(getInitialBuildingModelParams());
        setActiveTab('gecmis');
      }
    }

    showNotification('success', `${targets.length} proje yerel arşivden silindi.`);
    if (user && isLicensed) {
      Promise.allSettled(targets.map(project => deleteProjectFromCloud(project.projectAddress))).then(outcomes => {
        const failedCount = outcomes.filter(outcome => outcome.status === 'rejected').length;
        if (failedCount > 0) {
          showNotification('error', `${failedCount} proje buluttan silinemedi. Yerel kayıtlar temizlendi.`);
        }
      });
    }
  };

  const handleClearHistory = () => {
    deleteArchivedProjects(historyList);
  };

  const handleDeleteHistoryItem = (identifier: number | string) => {
    let targetIndex = -1;
    if (typeof identifier === 'number') {
      targetIndex = identifier;
    } else {
      const rawId = String(identifier || '').trim();
      const queryStr = rawId.toLowerCase();
      const strippedId = rawId.replace(/^ab_yapi_progress_/, '');
      const querySafeKey = getSafeProjectKey(strippedId);
      targetIndex = historyList.findIndex(p => {
        const pAddr = String(p.projectAddress || '').trim().toLowerCase();
        const pSafeKey = getSafeProjectKey(p.projectAddress || '');
        const pLegacyKey = getLegacySafeProjectKey(p.projectAddress || '').slice(0, 128);
        return (
          pAddr === queryStr ||
          pAddr === strippedId.toLowerCase() ||
          pSafeKey === querySafeKey ||
          pSafeKey === getSafeProjectKey(strippedId) ||
          pLegacyKey === querySafeKey ||
          p.projectAddress === identifier ||
          p.params?.projectName?.trim().toLowerCase() === queryStr
        );
      });
    }

    if (targetIndex === -1 || targetIndex >= historyList.length) {
      showNotification('error', 'Silinecek proje kaydı bulunamadı.');
      return;
    }

    const targetProject = historyList[targetIndex];
    if (!targetProject) return;

    deleteArchivedProjects([targetProject]);
  };

  // Group tabs by category
  const workbenchVisible = tabsConfig.some(tab => tab.id === 'kurulum' && tab.visible);
  const categorizedTabs = TAB_CATEGORIES.map(cat => ({
    ...cat,
    tabs: tabsConfig.filter(tab =>
      tab.category === cat.id && tab.visible &&
      (cat.id !== 'project_studio' ||
        (activeTab !== 'profile' && (!workbenchVisible || tab.id === 'kurulum')))
    ).sort((a, b) => a.order - b.order)
  }));

  const handleRootErrorReset = () => {
    setIsProjectTransferOpen(false);
    setIsMenuSettingsOpen(false);
    setIsAdminLicensesOpen(false);
  };

  // If mobile Lite mode is active, render the dedicated LiteMobileView
  if (appMode === 'lite') {
    return (
      <ErrorBoundary
        fallbackTitle="Mobil Görünümde Bir Sorun Oluştu"
        onReset={handleRootErrorReset}
      >
        <Suspense fallback={<TabLoadingSkeleton theme={theme} title="Mobil Lite Sürüm Hazırlanıyor..." />}>
          <LiteMobileView
            params={liteParams}
            results={liteResults}
            onChangeParams={updateLiteCalculatorParams}
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
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary
      fallbackTitle="Uygulama Arayüzünde Bir Sorun Oluştu"
      onReset={handleRootErrorReset}
    >
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-indigo-500/30 selection:text-indigo-800 w-full max-w-full overflow-x-clip ${
        isGray ? 'bg-slate-100 text-slate-900' : 'bg-[#fafafa] text-slate-900'
      }`}
    >
      <div className="flex flex-1 relative w-full min-w-0">
        {/* DESKTOP SIDEBAR (Hidden on mobile and automatically hidden when Project Flow Diagram is expanded) */}
        <aside
          className={`${
            activeTab === 'kurulum' && isProjectFlowOpen ? 'hidden md:flex xl:hidden' : 'hidden md:flex'
          } flex-col shrink-0 border-r transition-all duration-300 print:hidden sticky top-0 h-screen z-20 ${
            sidebarOpen ? 'w-64' : 'w-16'
          } ${
            isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200/60'
          }`}
        >
          {/* Sidebar Logo & Branding Header */}
          <div className="h-16 flex items-center justify-between px-3.5 border-b border-slate-100 shrink-0 min-w-0">
            {sidebarOpen ? (
              <div className="flex items-center gap-2 min-w-0 flex-1 animate-fade-in pr-1 overflow-hidden">
                <Logo size="sm" variant="compact" theme={theme} />
              </div>
            ) : (
              <div className="mx-auto">
                <Logo size="sm" variant="icon" theme={theme} />
              </div>
            )}
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors hidden md:block cursor-pointer active:scale-95 shrink-0 ml-1"
              title={sidebarOpen ? "Menüyü Daralt" : "Menüyü Genişlet"}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Sidebar Menu Items (Categorized with light hiyerarsi & badges) */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5 no-scrollbar">
            {categorizedTabs.map((cat, idx) => (
              <div key={cat.id} className="space-y-1.5">
                {sidebarOpen && (
                  <div className="flex items-center justify-between px-2 pt-1 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-[10px] uppercase tracking-wider font-black text-slate-500">
                        {cat.label}
                      </h4>
                      {cat.badge && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                          {cat.badge}
                        </span>
                      )}
                    </div>
                    {idx > 0 && <div className="h-[1px] flex-1 bg-slate-200/60 ml-2" />}
                  </div>
                )}
                <div className="space-y-1">
                  {cat.tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <React.Fragment key={tab.id}>
                        <button
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          title={tab.label}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap overflow-hidden group cursor-pointer relative ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-black scale-[1.01]'
                              : isGray
                              ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
                          }`}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-2 bottom-2 w-1 bg-white rounded-r-full shadow-xs" />
                          )}
                          <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                          }`} />
                          {sidebarOpen && (
                            <span className="truncate flex-1 text-left animate-fade-in font-semibold">
                              {tab.shortLabel}
                            </span>
                          )}
                          {sidebarOpen && tab.id === 'gecmis' && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold ${
                              isActive ? 'bg-indigo-500 text-white' : 'bg-pink-100 text-pink-800'
                            }`}>
                              {archiveProjectCount}
                            </span>
                          )}
                        </button>
                        
                        {/* Render Sub-tabs if active and sidebar is open */}
                        {sidebarOpen && isActive && tab.subTabs && (
                          <div className="ml-7 mt-1.5 mb-2 space-y-1 border-l-2 border-indigo-100 pl-2.5 animate-fade-in-up">
                            {tab.subTabs.map((sub) => {
                              const isSubActive = requestedSetupStep === sub.step;
                              return (
                                <button
                                  key={sub.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (sub.step) navigateToWorkbenchStage(sub.step);
                                  }}
                                  className={`w-full text-left py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2 ${
                                    isSubActive
                                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/50'
                                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
                                  }`}
                                >
                                  {isSubActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />}
                                  <span className="truncate">{sub.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Collapse Quick Actions Footer */}

        </aside>

        {/* RIGHT CONTENT BODY COLUMN */}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-clip relative">
          {/* Unified Sticky Top Header & Mobile Menu Bar */}
          <div className="sticky top-0 z-30 print:hidden w-full max-w-full">
            <Header
              showLogoOnDesktop={activeTab === 'kurulum' && isProjectFlowOpen}
              onExportJson={handleExportJson}
              onImportJson={handleImportJson}
              onOpenTransferModal={() => setIsProjectTransferOpen(true)}
              theme={theme}
              onToggleTheme={toggleTheme}
              onNavigateToCompletedProjects={() => setActiveTab('tamamlanan')}
              onOpenAdminLicenses={() => setIsAdminLicensesOpen(true)}
              activeProjectName={params.projectName || params.projectAddress || 'Varsayılan Şantiye'}
              onNewProjectClick={() => handleStartNewProject()}
              onOpenHistoryClick={() => setActiveTab('gecmis')}
              historyList={historyList}
              onSelectProject={(proj) => handleLoadProject(proj, activeTab)}
              currentProposalStatus={resolveEffectiveProposalStatus(params)}
              onChangeProposalStatus={(newStatus) => {
                const statusLabels: Record<string, string> = {
                  draft: 'Taslak',
                  in_review: 'İncelemede',
                  presented: 'Sunuldu',
                  accepted: 'Kabul Edildi',
                  rejected: 'Reddedildi',
                  contracted: 'Sözleşmeli',
                  active_site: 'Aktif Şantiye',
                  archived: 'Arşivlendi',
                };
                const statusPatch = buildProposalStatusChangePatch(params, newStatus, {
                  note: `Durum "${statusLabels[newStatus] || newStatus}" olarak güncellendi`,
                });
                updateCalculatorParams(statusPatch);
                if (newStatus === 'active_site') {
                  showNotification('success', 'Şantiye süreci başlatıldı.');
                  setActiveTab('surec');
                } else {
                  showNotification('success', `Teklif durumu güncellendi: ${statusLabels[newStatus] || newStatus}`);
                }
              }}
            />

            <nav aria-label="Mobil ana menü" className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 md:hidden print:hidden">
              <select
                aria-label="Uygulama bölümü"
                value={activeTab}
                onChange={(event) => setActiveTab(event.currentTarget.value as TabId)}
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
              >
                {TAB_CATEGORIES.map(category => (
                  <optgroup key={category.id} label={category.label}>
                    {tabsConfig.filter(tab => tab.category === category.id && (tab.id === activeTab || (tab.visible && (category.id === 'contractor_core' || tab.id === 'kurulum')))).map(tab => (
                      <option key={tab.id} value={tab.id}>{tab.id === 'kurulum' ? 'Proje Çalışma Masası' : tab.shortLabel}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button type="button" aria-label="Menü ayarları" onClick={() => setIsMenuSettingsOpen(true)}
                className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-slate-300 text-slate-700">
                <Settings2 className="h-4 w-4" />
              </button>
            </nav>
          </div>

          {/* Global Live Summary Bar */}
          {activeTab !== 'profile' && (
            <div className="md:sticky md:top-[64px] z-10 print:hidden w-full max-w-full overflow-hidden">
              <CompactSummaryBar
                results={results}
                params={params}
                theme={theme}
                onNavigateToItem={handleSummaryChipNavigate}
              />
            </div>
          )}

          <main className={`flex-1 w-full ${activeTab === 'kurulum' ? (isProjectFlowOpen ? 'max-w-none' : 'max-w-[1600px]') : 'max-w-7xl'} mx-auto p-3 sm:p-6 pb-12 print:p-0 print:m-0 print:max-w-none print:w-full print:pb-0 flex flex-col gap-6 overflow-x-hidden min-w-0`}>
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
              navigationRequest={workbenchNavRequest}
              onConsumeNavigationRequest={(nonce) =>
                setWorkbenchNavRequest((prev) => (prev && prev.nonce === nonce ? null : prev))
              }
              onStepChange={setRequestedSetupStep}
              onNavigateToTab={setActiveTab}
              onQuickSave={handleCalculate}
              onNavigateToSite={() => setActiveTab('surec')}
              buildingModelParams={buildingModelParams}
              onUpdateBuildingModelParams={updateBuildingModelParams}
              onCalculate={handleCalculate}
              onSaveOffer={saveProjectToArchive}
              isArchiveAddressConflict={addressBelongsToAnotherProject}
              savedProjects={historyList}
              onSelectProjectForProgress={handleLoadProjectForProgress}
              onAddNewConstructionProject={handleAddNewConstructionProject}
              onDeleteHistoryProject={handleDeleteHistoryItem}
              onNavigateToContract={() => setActiveTab('sozlesme')}
              isFlowOpen={isProjectFlowOpen}
              onToggleFlow={() => setIsProjectFlowOpen((prev) => !prev)}
            />
          )}

          {activeTab === 'model' && (
            <BuildingModelTab
              params={buildingModelParams}
              projectParams={params}
              projectName={params.projectName}
              projectAddress={params.projectAddress}
              landArea={params.landArea}
              onUpdateParams={updateBuildingModelParams}
              onNavigateToSetup={() => {
                setRequestedSetupStep(2);
                setActiveTab('kurulum');
              }}
              onNavigateToArchitecture={() => {
                setRequestedSetupStep(3);
                setActiveTab('kurulum');
              }}
              onNavigateToOwners={() => setActiveTab('malikler')}
              onNavigateToOffer={() => setActiveTab('teklif')}
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
              onNavigateToUnits={() => {
                setRequestedSetupStep(3);
                setActiveTab('kurulum');
              }}
              onNavigateToCost={() => setActiveTab('maliyet')}
              onNavigateToOffer={() => setActiveTab('teklif')}
              theme={theme}
            />
          )}

          {activeTab === 'teklif' && (
            <OfferTab
              params={params}
              results={results}
              onUpdateParam={(key, val) => updateCalculatorParams({ [key]: val })}
              onUpdateAllParams={updateCalculatorParams}
              onNavigateToSurec={() => setActiveTab('surec')}
              onSaveOffer={saveProjectToArchive}
              onNavigateToContract={() => setActiveTab('sozlesme')}
              evaluation={evaluateWorkbenchProject(params, results, historyList.some((h) => h.projectAddress === params.projectAddress))}
              onSelectWorkbenchStage={(stage, focusFieldId) => {
                navigateToWorkbenchStage(stage, focusFieldId);
              }}
              theme={theme}
            />
          )}

          {activeTab === 'surec' && (addressBelongsToAnotherProject ? (
            <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-900">Bu adresle kayıtlı projeyi şantiye takibi için Proje Arşivi’nden açın.</p>
          ) : (
            <ConstructionProgressTab
              params={params}
              results={results}
              theme={theme}
              savedProjects={historyList}
              onSelectProject={handleLoadProjectForProgress}
              onAddNewProject={handleAddNewConstructionProject}
              onDeleteProject={handleDeleteHistoryItem}
              onSaveCurrentProject={handleCalculate}
              onUpdateParam={(key, val) => updateCalculatorParams({ [key]: val })}
              onUpdateAllParams={updateCalculatorParams}
              onNavigateToOffer={() => setActiveTab('teklif')}
              onNavigateToContract={() => setActiveTab('sozlesme')}
            />
          ))}

          {activeTab === 'sozlesme' && (
            <ContractTab
              params={params}
              results={results}
              onUpdateParam={(key, val) => updateCalculatorParams({ [key]: val })}
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
              params={params}
              results={results}
              historyList={currentArchive}
              onSelectProject={(project, targetTab) => {
                handleLoadProject(project, (targetTab as TabId) || 'kurulum');
              }}
              onNavigateToNewWorkOrder={() => handleStartNewProject()}
              onContinueActiveProject={(targetTab, setupStep, focusFieldId) => {
                activateProjectTabs();
                const resolvedTab = (targetTab as TabId) || 'kurulum';
                if (resolvedTab === 'kurulum' && setupStep !== undefined) {
                  navigateToWorkbenchStage(setupStep, focusFieldId);
                  return;
                }
                if (setupStep !== undefined) {
                  setRequestedSetupStep(setupStep);
                }
                setActiveTab(resolvedTab);
                focusElementById(focusFieldId);
              }}
              onNavigateToArchive={() => setActiveTab('gecmis')}
              onNavigateToPortfolio={() => setActiveTab('tamamlanan')}
              onDeleteProject={handleDeleteHistoryItem}
            />
          )}

          {activeTab === 'tamamlanan' && (
            <CompletedProjectsTab
              theme={theme}
              onTrackProgress={(title, address) => {
                updateCalculatorParams({ projectAddress: address || title });
                showNotification('success', `"${title}" şantiye ve süreç takip paneli yüklendi.`);
                setActiveTab('surec');
              }}
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
              onNavigate={(targetTab, project) => {
                if (project) handleLoadProject(project);
                setActiveTab(targetTab);
              }}
              onNewProject={() => handleStartNewProject()}
            />
          )}
          </Suspense>
        </ErrorBoundary>
        
      </div>
    </main>
    </div>
    </div>

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

    {isAdminLicensesOpen && (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs z-50 p-4">
        <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-950 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              Yönetici Lisans Paneli
            </h3>
            <button 
              onClick={() => setIsAdminLicensesOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <AdminLicenseManager />
          </div>
        </div>
      </div>
    )}

    </div>
    </ErrorBoundary>
  );
}
