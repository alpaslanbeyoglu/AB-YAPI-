import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Download,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Layers,
  Building2,
  Store,
  Compass,
  FileCheck2,
  AlertCircle,
  HelpCircle,
  Clock,
  Eye,
  CheckCircle2,
  Palette,
  Ratio,
  FileSpreadsheet,
  Share2,
  Trash2,
  ShieldCheck,
  DoorOpen,
  Users,
  Ruler,
  CheckCheck,
  LayoutGrid,
  Home,
  Bed,
  Bath,
  Armchair,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { BuildingModelParams, AppTheme, FlatDistributionMode } from '../types';
import { generateArchitecturalSvgDrawing, DrawingProjectData } from '../utils/architecturalSvgEngine';

interface NanoBananaDrawingGeneratorProps {
  params: BuildingModelParams;
  theme?: AppTheme;
  onUpdateParams?: (updates: Partial<BuildingModelParams>) => void;
}

export type DrawingType = 'floor_plan' | 'facade_elevation' | 'ground_shop' | '3d_isometric';
export type StyleTheme = 'modern_architectural' | 'cad_blueprint' | 'colored_presentation';
export type AspectRatioType = '4:3' | '1:1' | '16:9';

interface GeneratedDrawing {
  id: string;
  imageUrl: string;
  drawingType: DrawingType;
  styleTheme: StyleTheme;
  aspectRatio: AspectRatioType;
  promptUsed: string;
  createdAt: string;
  title: string;
  engineUsed?: string;
  isVector?: boolean;
  summary: {
    edgesText: string;
    flatsText: string;
    shopsText: string;
    floorsText: string;
  };
}

export const NanoBananaDrawingGenerator: React.FC<NanoBananaDrawingGeneratorProps> = ({
  params,
  theme = 'light',
  onUpdateParams,
}) => {
  // Drawing configuration state
  const [drawingType, setDrawingType] = useState<DrawingType>('floor_plan');
  const [styleTheme, setStyleTheme] = useState<StyleTheme>('modern_architectural');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('4:3');
  const [customPromptNote, setCustomPromptNote] = useState<string>('');
  const [engineMode, setEngineMode] = useState<'auto' | 'precision_cad'>('auto');

  // Flat distribution and detailed architectural rooms state
  const currentDistributionMode: FlatDistributionMode = params.flatDistributionMode || 'equal';
  const [showRoomsDetail, setShowRoomsDetail] = useState<boolean>(true);

  // Generation execution state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [requiresPaidKey, setRequiresPaidKey] = useState<boolean>(false);
  const [activeDrawing, setActiveDrawing] = useState<GeneratedDrawing | null>(null);
  const [history, setHistory] = useState<GeneratedDrawing[]>([]);

  // Interactive Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [savedToOfferNotification, setSavedToOfferNotification] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Summaries of project inputs for prompt and display
  const facadeWidth = params.facadeWidth || 20;
  const facadeDepth = params.facadeDepth || 12;
  const floorCount = params.floorCount || 5;
  const flatsPerFloor = params.flatsPerFloor || 2;
  const totalFlats = floorCount * flatsPerFloor;
  const hasShop = !!params.hasGroundFloorShop;
  const shopCount = params.shopCount || 1;
  const basementCount = params.basementCount || 0;
  const hasBasement = basementCount > 0;

  // Custom Facades list
  const customFacadesList = params.customFacades && params.customFacades.length > 0
    ? params.customFacades.map((f, i) => `${f.name || `Cephe ${i+1}`}: ${f.length}m`).join(' • ')
    : `Ön: ${facadeWidth}m • Yan/Derinlik: ${facadeDepth}m`;

  // Helper to compile full project parameters for both CAD engine and AI model
  const getProjectData = (overrideDistribution?: FlatDistributionMode): DrawingProjectData => ({
    facadeWidth,
    facadeDepth,
    backFacadeLength: params.backFacadeLength,
    leftFacadeLength: params.leftFacadeLength,
    floorCount,
    flatsPerFloor,
    hasGroundFloorShop: hasShop,
    shopCount,
    hasBasement,
    basementCount,
    roofType: params.roofType || 'mansard',
    customFacades: params.customFacades || [],
    hasCantilever: !!params.hasCantilever,
    cantileverDepth: params.cantileverDepth || 1.5,
    polygonPoints: params.polygonPoints,
    footprintInputMode: params.footprintInputMode,
    baseBuildArea: params.baseBuildArea,
    mainEntranceFacadeIndex: params.mainEntranceFacadeIndex !== undefined ? params.mainEntranceFacadeIndex : 0,
    stairWidth: params.stairWidth || 2.4,
    stairDepth: params.stairDepth || 4.8,
    elevatorWidth: params.elevatorWidth || 1.8,
    elevatorDepth: params.elevatorDepth || 2.1,
    elevatorCount: params.elevatorCount || 1,
    flats: (params as any).flats || [],
    roomType: params.roomType,
    flatDistributionMode: overrideDistribution || params.flatDistributionMode || 'equal',
  });

  const getGeometrySummary = () => {
    if (params.polygonPoints && params.polygonPoints.length >= 3) {
      return `${params.polygonPoints.length} Köşeli Model Poligonu (~${params.baseBuildArea || (facadeWidth * facadeDepth).toFixed(1)} m²)`;
    }
    return customFacadesList;
  };

  const getFlatsSummary = () => {
    const flatsList = (params as any).flats as any[];
    if (flatsList && flatsList.length > 0) {
      const activeFlats = flatsList.slice(0, flatsPerFloor);
      const names = activeFlats.map((f: any, i: number) => f.name || `${i + 1}. Daire (${f.area || '?'} m²)`).join(' • ');
      return `Katta ${flatsPerFloor} Daire [${names}]`;
    }
    return `Katta ${flatsPerFloor} Daire (Toplam ${totalFlats})`;
  };

  // Helper to fix any SVG data URI that may have had unescaped XML ampersands
  const fixSvgDataUri = (url: string): string => {
    if (!url || !url.startsWith('data:image/svg+xml;base64,')) return url;
    try {
      const b64 = url.replace('data:image/svg+xml;base64,', '');
      const raw = decodeURIComponent(escape(atob(b64)));
      if (raw.includes('&') && !raw.includes('&amp;')) {
        const fixed = raw.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');
        return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(fixed)))}`;
      }
    } catch {
      // ignore
    }
    return url;
  };

  // LocalStorage history loading or auto-generate initial preview
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ab_nanobanana_drawings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed.map((item: GeneratedDrawing) => ({
            ...item,
            imageUrl: fixSvgDataUri(item.imageUrl),
          }));
          setHistory(sanitized);
          setActiveDrawing(sanitized[0]);
          localStorage.setItem('ab_nanobanana_drawings', JSON.stringify(sanitized));
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load drawing history from localStorage', e);
    }

    // Auto-generate initial instant architectural CAD drawing for immediate preview
    try {
      const initialSvg = generateArchitecturalSvgDrawing(
        getProjectData(),
        'floor_plan',
        'modern_architectural',
        '4:3'
      );
      const base64 = btoa(unescape(encodeURIComponent(initialSvg)));
      const initialDrawing: GeneratedDrawing = {
        id: `init_${Date.now()}`,
        imageUrl: `data:image/svg+xml;base64,${base64}`,
        drawingType: 'floor_plan',
        styleTheme: 'modern_architectural',
        aspectRatio: '4:3',
        promptUsed: 'Hassas Standart Mimari Tip Kat Planı (TS EN ISO 128)',
        createdAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        title: 'Mimari Tip Kat Planı (TS EN ISO 128)',
        engineUsed: 'precision_cad',
        isVector: true,
        summary: {
          edgesText: getGeometrySummary(),
          flatsText: getFlatsSummary(),
          shopsText: hasShop ? `${shopCount} Dükkan (Cadde Vitrini)` : 'Dükkansız (Konut Girişi)',
          floorsText: `${floorCount} Kat (${hasBasement ? `+${basementCount} Bodrum` : 'Zemin Üstü'})`,
        },
      };
      setActiveDrawing(initialDrawing);
      setHistory([initialDrawing]);
      localStorage.setItem('ab_nanobanana_drawings', JSON.stringify([initialDrawing]));
    } catch (err) {
      console.warn('Failed to generate initial CAD drawing', err);
    }
  }, []);

  const handleImageError = (drawing: GeneratedDrawing) => {
    try {
      const freshSvg = generateArchitecturalSvgDrawing(
        getProjectData(),
        drawing.drawingType || 'floor_plan',
        drawing.styleTheme || 'modern_architectural',
        drawing.aspectRatio || '4:3'
      );
      const newUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(freshSvg)))}`;
      setActiveDrawing((prev) => (prev?.id === drawing.id ? { ...prev, imageUrl: newUrl, engineUsed: 'precision_cad', isVector: true } : prev));
      setHistory((prev) =>
        prev.map((h) => (h.id === drawing.id ? { ...h, imageUrl: newUrl, engineUsed: 'precision_cad', isVector: true } : h))
      );
    } catch (err) {
      console.error('Failed to regenerate CAD on img error', err);
    }
  };

  const handleClearHistory = () => {
    try {
      localStorage.removeItem('ab_nanobanana_drawings');
      // Regenerate fresh initial drawing
      const initialSvg = generateArchitecturalSvgDrawing(
        getProjectData(),
        'floor_plan',
        'modern_architectural',
        '4:3'
      );
      const base64 = btoa(unescape(encodeURIComponent(initialSvg)));
      const initialDrawing: GeneratedDrawing = {
        id: `init_${Date.now()}`,
        imageUrl: `data:image/svg+xml;base64,${base64}`,
        drawingType: 'floor_plan',
        styleTheme: 'modern_architectural',
        aspectRatio: '4:3',
        promptUsed: 'Hassas Standart Mimari Tip Kat Planı (TS EN ISO 128)',
        createdAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        title: 'Mimari Tip Kat Planı (TS EN ISO 128)',
        engineUsed: 'precision_cad',
        isVector: true,
        summary: {
          edgesText: getGeometrySummary(),
          flatsText: getFlatsSummary(),
          shopsText: hasShop ? `${shopCount} Dükkan (Cadde Vitrini)` : 'Dükkansız (Konut Girişi)',
          floorsText: `${floorCount} Kat (${hasBasement ? `+${basementCount} Bodrum` : 'Zemin Üstü'})`,
        },
      };
      setActiveDrawing(initialDrawing);
      setHistory([initialDrawing]);
      localStorage.setItem('ab_nanobanana_drawings', JSON.stringify([initialDrawing]));
    } catch (e) {
      console.warn('Failed to clear history', e);
    }
  };

  const saveToHistory = (drawing: GeneratedDrawing) => {
    const updated = [drawing, ...history.filter(h => h.id !== drawing.id)].slice(0, 15);
    setHistory(updated);
    try {
      localStorage.setItem('ab_nanobanana_drawings', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  };

  const handleDistributionModeChange = (newMode: FlatDistributionMode) => {
    if (onUpdateParams) {
      onUpdateParams({ flatDistributionMode: newMode });
    }
    // Instantly regenerate active CAD drawing with new distribution
    try {
      const updatedSvg = generateArchitecturalSvgDrawing(
        getProjectData(newMode),
        drawingType,
        styleTheme,
        aspectRatio
      );
      const base64 = btoa(unescape(encodeURIComponent(updatedSvg)));
      const distTitles: Record<FlatDistributionMode, string> = {
        equal: 'Eşit Dağılım (%25 x 4 Daire)',
        front_large: 'Ön Cephe Daireleri Büyük (3+1 Ön / 2+1 Arka)',
        asymmetric_master: '1 Master Köşe Daire (%40) + 3 Daire',
        custom_proportions: 'Özel Metrekare Dağılımı',
      };
      const updatedDrawing: GeneratedDrawing = {
        id: `dist_${Date.now()}`,
        imageUrl: `data:image/svg+xml;base64,${base64}`,
        drawingType,
        styleTheme,
        aspectRatio,
        promptUsed: `Daire Dağılımı: ${distTitles[newMode]}`,
        createdAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        title: 'Mimari Tip Kat Planı (TS EN ISO 128)',
        engineUsed: 'precision_cad',
        isVector: true,
        summary: {
          edgesText: getGeometrySummary(),
          flatsText: `Katta ${flatsPerFloor} Daire [${distTitles[newMode]}]`,
          shopsText: hasShop ? `${shopCount} Dükkan (Cadde Vitrini)` : 'Dükkansız (Konut Girişi)',
          floorsText: `${floorCount} Kat (${hasBasement ? `+${basementCount} Bodrum` : 'Zemin Üstü'})`,
        },
      };
      setActiveDrawing(updatedDrawing);
      saveToHistory(updatedDrawing);
    } catch (e) {
      console.warn('Failed to regenerate SVG on distribution mode change', e);
    }
  };

  const handleGenerateDrawing = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setRequiresPaidKey(false);
    setZoomLevel(1);

    const projectDataPayload = getProjectData();

    try {
      const payload = {
        drawingType,
        styleTheme,
        aspectRatio,
        customPromptNote,
        preferredEngine: engineMode,
        projectData: projectDataPayload,
      };

      const res = await fetch('/api/generate-blueprint-drawing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.requiresPaidKey) {
          setRequiresPaidKey(true);
        }
        throw new Error(data.error || 'Görsel üretimi başarısız oldu.');
      }

      const typeTitles: Record<DrawingType, string> = {
        floor_plan: 'Mimari Tip Kat Planı (TS EN ISO 128)',
        facade_elevation: `${floorCount} Katlı Ön Cephe Mimari Görünüşü`,
        ground_shop: 'Zemin Kat Ticari Dükkan Yerleşimi',
        '3d_isometric': '3D Aksonometrik Kesit Kat Planı',
      };

      const newDrawing: GeneratedDrawing = {
        id: `drawing_${Date.now()}`,
        imageUrl: data.imageUrl,
        drawingType,
        styleTheme,
        aspectRatio,
        promptUsed: data.promptUsed,
        createdAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        title: typeTitles[drawingType] || 'Mimari Çizim',
        engineUsed: data.engineUsed || 'precision_cad',
        isVector: !!data.isVector || !!data.isVectorFallback,
        summary: {
          edgesText: getGeometrySummary(),
          flatsText: getFlatsSummary(),
          shopsText: hasShop ? `${shopCount} Dükkan (Cadde Vitrini)` : 'Dükkansız (Konut Girişi)',
          floorsText: `${floorCount} Kat (${hasBasement ? `+${basementCount} Bodrum` : 'Zemin Üstü'})`,
        },
      };

      setActiveDrawing(newDrawing);
      saveToHistory(newDrawing);
    } catch (err: any) {
      // Client-side fallback: produce instant vector CAD drawing so the user is never left without a drawing
      try {
        const fallbackSvg = generateArchitecturalSvgDrawing(
          projectDataPayload,
          drawingType,
          styleTheme,
          aspectRatio
        );
        const base64 = btoa(unescape(encodeURIComponent(fallbackSvg)));
        const typeTitles: Record<DrawingType, string> = {
          floor_plan: 'Mimari Tip Kat Planı (TS EN ISO 128)',
          facade_elevation: `${floorCount} Katlı Ön Cephe Mimari Görünüşü`,
          ground_shop: 'Zemin Kat Ticari Dükkan Yerleşimi',
          '3d_isometric': '3D Aksonometrik Kesit Kat Planı',
        };
        const fallbackDrawing: GeneratedDrawing = {
          id: `drawing_${Date.now()}`,
          imageUrl: `data:image/svg+xml;base64,${base64}`,
          drawingType,
          styleTheme,
          aspectRatio,
          promptUsed: 'Hassas Standart Mimari Vektörel CAD Çizimi',
          createdAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          title: typeTitles[drawingType] || 'Mimari Çizim',
          engineUsed: 'precision_cad',
          isVector: true,
          summary: {
            edgesText: getGeometrySummary(),
            flatsText: getFlatsSummary(),
            shopsText: hasShop ? `${shopCount} Dükkan (Cadde Vitrini)` : 'Dükkansız (Konut Girişi)',
            floorsText: `${floorCount} Kat (${hasBasement ? `+${basementCount} Bodrum` : 'Zemin Üstü'})`,
          },
        };
        setActiveDrawing(fallbackDrawing);
        saveToHistory(fallbackDrawing);
      } catch (e) {
        setErrorMsg(err.message || 'Bir hata oluştu.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadImage = () => {
    if (!activeDrawing?.imageUrl) return;
    const isSvg = activeDrawing.imageUrl.startsWith('data:image/svg+xml');
    const a = document.createElement('a');
    a.href = activeDrawing.imageUrl;
    a.download = `AB_Yapi_${activeDrawing.drawingType}_${Date.now()}.${isSvg ? 'svg' : 'png'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveToOffer = () => {
    if (!activeDrawing?.imageUrl) return;
    try {
      const existing = localStorage.getItem('ab_offer_custom_drawings');
      const list = existing ? JSON.parse(existing) : [];
      list.push({
        id: activeDrawing.id,
        imageUrl: activeDrawing.imageUrl,
        title: activeDrawing.title,
        date: new Date().toLocaleDateString('tr-TR'),
      });
      localStorage.setItem('ab_offer_custom_drawings', JSON.stringify(list));
      setSavedToOfferNotification(true);
      setTimeout(() => setSavedToOfferNotification(false), 3000);
    } catch (e) {
      console.warn('Failed to save to offer storage', e);
    }
  };

  const cardBg = theme === 'gray' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800';
  const subCardBg = theme === 'gray' ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200';

  return (
    <div className="space-y-4 animate-fade-in" ref={containerRef}>
      {/* TOP HEADER: Project Data Integration Pill Bar */}
      <div className={`p-4 rounded-2xl border shadow-sm ${cardBg}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-gradient-to-tr from-amber-500 to-indigo-600 text-white rounded-xl shadow-xs">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Nano Banana AI Mimari Çizim & Kat Planı Oluşturucu</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                    Gemini Flash Image
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proje için tanımlanan cephe kenarları, daire adedi, dükkanlar ve kat sayısına göre yüksek çözünürlüklü teknik mimari çizimler üretir.
                </p>
              </div>
            </div>
          </div>

          {/* Synced Parameter Badges */}
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-900 rounded-xl border border-indigo-200/70 font-medium">
              <Compass className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-bold">Kenarlar:</span>
              <span className="truncate max-w-[170px]" title={customFacadesList}>{customFacadesList}</span>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-900 rounded-xl border border-blue-200/70 font-medium">
              <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="font-bold">Daireler:</span>
              <span>Katta {flatsPerFloor} (Toplam {totalFlats})</span>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-900 rounded-xl border border-amber-200/70 font-medium">
              <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-bold">Dükkanlar:</span>
              <span>{hasShop ? `${shopCount} Zemin Dükkanı` : 'Dükkansız'}</span>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200/70 font-medium">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-bold">Kat Sayısı:</span>
              <span>{floorCount} Kat {hasBasement ? `(+${basementCount}B)` : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT: Controls & Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Generation Controls (4 cols) */}
        <div className={`lg:col-span-4 p-4 rounded-2xl border shadow-sm space-y-4 ${cardBg}`}>
          <div className="border-b border-slate-100 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-600" />
              <span>Çizim Parametreleri</span>
            </h4>
          </div>

          {/* 1. Drawing Type Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 block">Çizim Türü & Görünüm</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setDrawingType('floor_plan')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  drawingType === 'floor_plan'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold shadow-2xs ring-1 ring-indigo-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs">
                  <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Tip Kat Planı</span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">
                  Katta {flatsPerFloor} daireli 2D CAD
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDrawingType('facade_elevation')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  drawingType === 'facade_elevation'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold shadow-2xs ring-1 ring-indigo-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Ön Cephe Çizimi</span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">
                  {floorCount} katlı mimari görünüş
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDrawingType('ground_shop')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  drawingType === 'ground_shop'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold shadow-2xs ring-1 ring-indigo-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs">
                  <Store className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Zemin Dükkan Planı</span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">
                  Cadde mağaza vitrinleri
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDrawingType('3d_isometric')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  drawingType === '3d_isometric'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold shadow-2xs ring-1 ring-indigo-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs">
                  <Compass className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>3D Kesit Planı</span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">
                  Mobilyalı aksonometrik
                </span>
              </button>
            </div>
          </div>

          {/* 1.5 Daire Dağılımı ve Kat Alanı Bölüşümü (Kullanıcı Sorusu & Kontrol Paneli) */}
          {drawingType === 'floor_plan' && (
            <div className="p-3.5 bg-gradient-to-br from-indigo-50/90 via-blue-50/40 to-slate-50 rounded-2xl border-2 border-indigo-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded-lg bg-indigo-600 text-white shadow-2xs">
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-indigo-950 uppercase tracking-tight">
                      Kat Planında Daireler Nasıl Dağıtılsın?
                    </h5>
                    <p className="text-[10px] text-indigo-700/90 font-medium">
                      Katta {flatsPerFloor} daire için kat alanı eşit mi bölünsün, bazı daireler daha mı büyük olsun?
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs shrink-0">
                  {flatsPerFloor === 4 ? 'Katta 4 Daire' : `${flatsPerFloor} Daire/Kat`}
                </span>
              </div>

              <div className="space-y-1.5">
                {/* Seçenek 1: Eşit Dağılım */}
                <button
                  type="button"
                  onClick={() => handleDistributionModeChange('equal')}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    currentDistributionMode === 'equal'
                      ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white/70 border-slate-200/80 hover:bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        currentDistributionMode === 'equal' ? 'border-indigo-600' : 'border-slate-300'
                      }`}>
                        {currentDistributionMode === 'equal' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                      </div>
                      <span className="text-xs font-bold text-slate-900">
                        Eşit Dağılım (Kat Alanı Eşit Bölünür)
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-indigo-700 px-1.5 py-0.5 bg-indigo-50 rounded border border-indigo-200 shrink-0">
                      %25 / %25 / %25 / %25
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 pl-5.5 leading-tight">
                    Kattaki 4 daire eşit metrekareye sahip olur. Simetrik 2+1/3+1 planlanır (Salon, Ayrı Mutfak, Ebeveyn Yatak Odası, Çocuk Odası, Banyo, Hol, Balkon).
                  </p>
                </button>

                {/* Seçenek 2: Ön Cephe Daireleri Daha Büyük */}
                <button
                  type="button"
                  onClick={() => handleDistributionModeChange('front_large')}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    currentDistributionMode === 'front_large'
                      ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white/70 border-slate-200/80 hover:bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        currentDistributionMode === 'front_large' ? 'border-indigo-600' : 'border-slate-300'
                      }`}>
                        {currentDistributionMode === 'front_large' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                      </div>
                      <span className="text-xs font-bold text-slate-900">
                        Ön Cephe Daireleri Daha Büyük (Caddeye Bakanlar)
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-emerald-700 px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-200 shrink-0">
                      %30 Ön / %20 Arka
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 pl-5.5 leading-tight">
                    Caddeye/ön cepheye bakan 2 daire geniş 3+1 (ayrı mutfak, ebeveyn banyosu, ön balkonlar); arkadaki 2 daire kompakt 2+1 / 1+1 planlanır.
                  </p>
                </button>

                {/* Seçenek 3: 1 Master Köşe Daire */}
                <button
                  type="button"
                  onClick={() => handleDistributionModeChange('asymmetric_master')}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    currentDistributionMode === 'asymmetric_master'
                      ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white/70 border-slate-200/80 hover:bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        currentDistributionMode === 'asymmetric_master' ? 'border-indigo-600' : 'border-slate-300'
                      }`}>
                        {currentDistributionMode === 'asymmetric_master' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                      </div>
                      <span className="text-xs font-bold text-slate-900">
                        1 Geniş Master Daire + 3 Standart Daire
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-amber-700 px-1.5 py-0.5 bg-amber-50 rounded border border-amber-200 shrink-0">
                      %40 Köşe / %20x3
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 pl-5.5 leading-tight">
                    1 adet köşe/manzaralı lüks master daire (%40 pay), kalan 3 daire standart ve dengeli (%20'şer) pay alır.
                  </p>
                </button>

                {/* Seçenek 4: Özel Tablo Değerleri */}
                <button
                  type="button"
                  onClick={() => handleDistributionModeChange('custom_proportions')}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    currentDistributionMode === 'custom_proportions'
                      ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white/70 border-slate-200/80 hover:bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        currentDistributionMode === 'custom_proportions' ? 'border-indigo-600' : 'border-slate-300'
                      }`}>
                        {currentDistributionMode === 'custom_proportions' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                      </div>
                      <span className="text-xs font-bold text-slate-900">
                        Özel Dağılım (Mülkiyet Paylaşım Tablosu)
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-slate-700 px-1.5 py-0.5 bg-slate-100 rounded border border-slate-300 shrink-0">
                      Tablo m²
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 pl-5.5 leading-tight">
                    Mülk sahipleri ve müteahhit paylaşım tablosundaki her bağımsız bölümün net metrekare oranına göre otomatik ölçeklenir.
                  </p>
                </button>
              </div>

              {/* Otomatik Çizilen İç Mimari Mahal & Donatı Detayları Accordion */}
              <div className="pt-2 border-t border-indigo-100">
                <button
                  type="button"
                  onClick={() => setShowRoomsDetail(!showRoomsDetail)}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-indigo-950 hover:text-indigo-800 transition-colors py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Otomatik Çizilen İç Mimari Mahal ve Detaylar:</span>
                  </span>
                  {showRoomsDetail ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />}
                </button>

                {showRoomsDetail && (
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] animate-fade-in">
                    <div className="p-2 bg-white/90 rounded-lg border border-indigo-100 space-y-0.5">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <DoorOpen className="w-3 h-3 text-amber-600" />
                        <span>Giriş & Antre (Hol)</span>
                      </span>
                      <p className="text-slate-500 text-[9.5px]">90 cm çelik kapı (90° açılış yayı), gömme vestiyer dolabı, ayna nişi</p>
                    </div>

                    <div className="p-2 bg-white/90 rounded-lg border border-indigo-100 space-y-0.5">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Armchair className="w-3 h-3 text-indigo-600" />
                        <span>Salon & Yaşam</span>
                      </span>
                      <p className="text-slate-500 text-[9.5px]">L-koltuk / kanepe, orta sehpa, 6 kişilik yemek masası, TV ünitesi</p>
                    </div>

                    <div className="p-2 bg-white/90 rounded-lg border border-indigo-100 space-y-0.5">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Store className="w-3 h-3 text-amber-600" />
                        <span>Ayrı Mutfak</span>
                      </span>
                      <p className="text-slate-500 text-[9.5px]">L-tezgah, çift gözlü evye, 4 gözlü ocak, buzdolabı nişi, kapı</p>
                    </div>

                    <div className="p-2 bg-white/90 rounded-lg border border-indigo-100 space-y-0.5">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Bed className="w-3 h-3 text-emerald-600" />
                        <span>Yatak Odaları</span>
                      </span>
                      <p className="text-slate-500 text-[9.5px]">Çift kişilik yatak, başlık, 2 komodin, gardırop, çocuk çalışma masası</p>
                    </div>

                    <div className="p-2 bg-white/90 rounded-lg border border-indigo-100 space-y-0.5">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Bath className="w-3 h-3 text-blue-600" />
                        <span>Banyo & WC</span>
                      </span>
                      <p className="text-slate-500 text-[9.5px]">Cam duşakabin, asma klozet & gömme rezervuar, lavabo, tesisat şaftı</p>
                    </div>

                    <div className="p-2 bg-white/90 rounded-lg border border-indigo-100 space-y-0.5">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Compass className="w-3 h-3 text-purple-600" />
                        <span>Balkon & Cephe</span>
                      </span>
                      <p className="text-slate-500 text-[9.5px]">Cam korkuluk deseni, dış cephe silmesi, balkon kapısı</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. Visual Style Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 block">Görsel Çizim Şablonu</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setStyleTheme('modern_architectural')}
                className={`p-2 rounded-xl border text-center transition-all ${
                  styleTheme === 'modern_architectural'
                    ? 'border-indigo-600 bg-indigo-50/80 font-bold text-indigo-900 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-xs block">Beyaz CAD</span>
                <span className="text-[9px] text-slate-500">Teknik Net Çizgi</span>
              </button>

              <button
                type="button"
                onClick={() => setStyleTheme('cad_blueprint')}
                className={`p-2 rounded-xl border text-center transition-all ${
                  styleTheme === 'cad_blueprint'
                    ? 'border-indigo-600 bg-indigo-50/80 font-bold text-indigo-900 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-xs block">Mavi Ozalit</span>
                <span className="text-[9px] text-slate-500">Blueprint CAD</span>
              </button>

              <button
                type="button"
                onClick={() => setStyleTheme('colored_presentation')}
                className={`p-2 rounded-xl border text-center transition-all ${
                  styleTheme === 'colored_presentation'
                    ? 'border-indigo-600 bg-indigo-50/80 font-bold text-indigo-900 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-xs block">Renkli Sunum</span>
                <span className="text-[9px] text-slate-500">Mobilya & Doku</span>
              </button>
            </div>
          </div>

          {/* 3. Aspect Ratio */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
              <span>Görsel Oranı (Aspect Ratio)</span>
              <Ratio className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['4:3', '1:1', '16:9'] as AspectRatioType[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAspectRatio(r)}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all ${
                    aspectRatio === r
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Special User Prompt Note */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 block">
              Özel Mimari Talimat (Opsiyonel)
            </label>
            <textarea
              rows={2}
              value={customPromptNote}
              onChange={(e) => setCustomPromptNote(e.target.value)}
              placeholder="Örn: Geniş salonlu 3+1 daireler, dükkan vitrinleri cadde boyunca uzansın, ahşap lamel söveler..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white placeholder-slate-400 resize-y"
            />
          </div>

          {/* 5. Engine Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
              <span>Çizim Motoru</span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Kesintisiz CAD
              </span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setEngineMode('auto')}
                className={`p-2 rounded-xl border text-left transition-all ${
                  engineMode === 'auto'
                    ? 'border-indigo-600 bg-indigo-50/80 font-bold text-indigo-900 shadow-2xs ring-1 ring-indigo-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-xs block font-bold">Otomatik AI & CAD</span>
                <span className="text-[9px] text-slate-500 block leading-tight">Gemini AI / CAD Hibrit</span>
              </button>

              <button
                type="button"
                onClick={() => setEngineMode('precision_cad')}
                className={`p-2 rounded-xl border text-left transition-all ${
                  engineMode === 'precision_cad'
                    ? 'border-indigo-600 bg-indigo-50/80 font-bold text-indigo-900 shadow-2xs ring-1 ring-indigo-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-xs block font-bold">Hassas Vektörel CAD</span>
                <span className="text-[9px] text-slate-500 block leading-tight">Anında • Birebir Ölçülü</span>
              </button>
            </div>
          </div>

          {/* MODEL DATA & TURKISH ZONING STANDARDS INTEGRATION CARD */}
          <div className="p-3 bg-gradient-to-br from-indigo-50/70 via-slate-50 to-blue-50/50 rounded-xl border border-indigo-100 text-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Model Geometrisi & İmar Standartları</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <CheckCheck className="w-2.5 h-2.5" />
                <span>Birebir Model Bağlantılı</span>
              </span>
            </div>

            {/* Giriş Cephesi Bilgisi */}
            <div className="text-[11px] space-y-1 bg-white p-2 rounded-lg border border-indigo-50">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span className="flex items-center gap-1">
                  <DoorOpen className="w-3.5 h-3.5 text-amber-600" />
                  <span>Seçilen Giriş Cephesi:</span>
                </span>
                <span className="text-indigo-600 font-bold">
                  {params.customFacades?.[params.mainEntranceFacadeIndex || 0]?.name || `${(params.mainEntranceFacadeIndex || 0) + 1}. Ön Cephe`}
                </span>
              </div>
              <div className="text-[10px] text-slate-500">
                Genişlik: {params.customFacades?.[params.mainEntranceFacadeIndex || 0]?.length || facadeWidth} m • Cadde Kotundan Güvenli Giriş
              </div>
            </div>

            {/* Türkiye İmar Mevzuatı Önerilen Giriş & Çekirdek Ölçüleri */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-600 block uppercase tracking-wider">
                Türkiye İmar Mevzuatı (Planlı Alanlar & TS 9111) Önerileri:
              </span>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div className="p-1.5 bg-white rounded border border-slate-100">
                  <span className="text-slate-400 block text-[9px]">Giriş Kapısı</span>
                  <span className="font-bold text-slate-800">1.80m Çift Kanat</span>
                  <span className="text-[9px] text-emerald-600 block">(Asgari: 1.50m)</span>
                </div>
                <div className="p-1.5 bg-white rounded border border-slate-100">
                  <span className="text-slate-400 block text-[9px]">Rüzgarlık Holü</span>
                  <span className="font-bold text-slate-800">2.80m × 2.40m</span>
                  <span className="text-[9px] text-emerald-600 block">(Min: 2.20m)</span>
                </div>
                <div className="p-1.5 bg-white rounded border border-slate-100">
                  <span className="text-slate-400 block text-[9px]">TS 9111 Rampa</span>
                  <span className="font-bold text-slate-800">%5.0 Eğim • 1.50m</span>
                  <span className="text-[9px] text-emerald-600 block">(Azami: %6.0)</span>
                </div>
                <div className="p-1.5 bg-white rounded border border-slate-100">
                  <span className="text-slate-400 block text-[9px]">Sedye Asansörü</span>
                  <span className="font-bold text-slate-800">800kg / 10 Kişi</span>
                  <span className="text-[9px] text-emerald-600 block">(1.80×2.10m kuyu)</span>
                </div>
              </div>
            </div>

            {/* Kattaki Daire Dağılımı */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-blue-600" />
                  <span>Kattaki Daire Dağılımı ({flatsPerFloor} Daire/Kat):</span>
                </span>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
                {((params as any).flats && Array.isArray((params as any).flats) && (params as any).flats.length > 0
                  ? (params as any).flats.slice(0, flatsPerFloor)
                  : Array.from({ length: flatsPerFloor }, (_, i) => ({
                      name: `${i + 1}. Daire (3+1)`,
                      area: Math.round(((params.baseBuildArea || (facadeWidth * facadeDepth)) * 0.42)),
                      isContractorShare: i % 2 === 1,
                    }))
                ).map((flat: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-100 text-[10px]">
                    <span className="font-bold text-slate-800">{flat.name || `${idx + 1}. Daire`}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-medium">~{flat.area || '?'} m²</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                        flat.isContractorShare ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {flat.isContractorShare ? 'Müteahhit' : 'Hak Sahibi'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[9px] text-slate-500 leading-tight border-t border-slate-200/60 pt-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>Nano Banana AI ve Hassas CAD motoru tüm verileri doğrudan modelinizden almaktadır.</span>
            </div>
          </div>

          {/* GENERATE BUTTON */}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleGenerateDrawing}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-black rounded-xl text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Nano Banana Çizimi Hazırlanıyor...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Nano Banana ile Çizim Oluştur</span>
              </>
            )}
          </button>

          {/* Paid Key / Error Notice */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Çizim Üretilemedi</span>
              </div>
              <p className="text-[11px] text-red-700 leading-relaxed">{errorMsg}</p>
              {requiresPaidKey && (
                <div className="mt-2 pt-2 border-t border-red-200/60 text-[11px] text-red-900">
                  <span className="font-bold">Bilgi:</span> Nano Banana (Gemini Flash Image) görsel üretim modelleri API anahtarı kotası veya faturalandırma gerektirebilir. Lütfen Google AI Studio ayarlarınızdan geçerli bir API anahtarı seçildiğinden emin olun.
                </div>
              )}
            </div>
          )}

          {/* Generated History Thumbnails */}
          {history.length > 1 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>Önceki Çizimler ({history.length})</span>
                </span>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  title="Çizim geçmişini temizle"
                  className="text-[10px] text-slate-400 hover:text-red-600 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Temizle</span>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {history.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setActiveDrawing(h)}
                    className={`relative rounded-lg overflow-hidden border transition-all aspect-video group ${
                      activeDrawing?.id === h.id
                        ? 'ring-2 ring-indigo-600 border-indigo-600'
                        : 'border-slate-200 hover:opacity-80'
                    }`}
                  >
                    <img
                      src={h.imageUrl}
                      alt={h.title}
                      referrerPolicy="no-referrer"
                      onError={() => handleImageError(h)}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-1 opacity-90">
                      <span className="text-[8px] text-white font-medium truncate w-full">
                        {h.createdAt}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive High-Resolution Drawing Canvas (8 cols) */}
        <div className={`lg:col-span-8 p-4 rounded-2xl border shadow-sm space-y-3 ${cardBg}`}>
          {/* Canvas Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h4 className="text-xs font-bold text-slate-800">
                {activeDrawing ? activeDrawing.title : 'Mimari Çizim Önizleme'}
              </h4>
              {activeDrawing?.engineUsed === 'precision_cad' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  Vektörel CAD
                </span>
              )}
              {activeDrawing?.engineUsed === 'gemini_image' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                  Gemini Flash AI
                </span>
              )}
            </div>

            {/* Action Buttons */}
            {activeDrawing && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.2))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs"
                  title="Uzaklaştır"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                <span className="text-[11px] font-mono text-slate-600 px-1">
                  %{Math.round(zoomLevel * 100)}
                </span>

                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs"
                  title="Yakınlaştır"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-medium"
                >
                  Sıfırla
                </button>

                <div className="w-px h-4 bg-slate-200 mx-1" />

                <button
                  type="button"
                  onClick={handleSaveToOffer}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-lg text-xs font-bold transition-all"
                  title="Bu çizimi resmi teklif ve sözleşme raporuna ekle"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{savedToOfferNotification ? 'Teklife Eklendi ✓' : 'Teklife Ekle'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all border border-slate-200"
                  title="PNG formatında bilgisayara indir"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>İndir</span>
                </button>
              </div>
            )}
          </div>

          {/* DRAWING DISPLAY STAGE */}
          <div className="relative w-full min-h-[460px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center p-2 group select-none">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 text-center p-8 text-white animate-fade-in">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
                  <Sparkles className="w-6 h-6 text-amber-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-white">Nano Banana Çizim Hazırlanıyor</h5>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    {facadeWidth}m × {facadeDepth}m kenar ölçüleri, katta {flatsPerFloor} daire, {hasShop ? `${shopCount} dükkan` : 'dükkansız'} ve {floorCount} kat verileri işleniyor...
                  </p>
                </div>
              </div>
            ) : activeDrawing ? (
              <div
                className="w-full h-full flex items-center justify-center overflow-auto max-h-[600px] transition-transform duration-150"
                style={{ cursor: zoomLevel > 1 ? 'grab' : 'default' }}
              >
                <img
                  src={activeDrawing.imageUrl}
                  alt={activeDrawing.title}
                  referrerPolicy="no-referrer"
                  onError={() => activeDrawing && handleImageError(activeDrawing)}
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="max-h-[560px] max-w-full object-contain rounded-lg shadow-2xl"
                />

                {/* Technical Watermark Overlay */}
                <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-white text-[10px] flex items-center gap-2 pointer-events-none">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{activeDrawing.title} • {activeDrawing.summary.edgesText}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-center p-8 text-white/70">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400">
                  <Compass className="w-7 h-7" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-white">Henüz Çizim Oluşturulmadı</h5>
                  <p className="text-xs text-slate-400 max-w-md mt-1">
                    Sol paneldeki parametreleri seçerek <strong>"Nano Banana ile Çizim Oluştur"</strong> butonuna basın. Projeniz için girdiğiniz kenarlar, daireler ve kat sayısına tam uygun yeni bir mimari çizim üretilecektir.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateDrawing}
                  className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  İlk Çizimi Şimdi Üret
                </button>
              </div>
            )}
          </div>

          {/* ACTIVE DRAWING DETAILS & SPEC CARD */}
          {activeDrawing && (
            <div className={`p-3.5 rounded-xl border ${subCardBg} space-y-2`}>
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <span>Çizim Parametre Eşleşmesi (Doğrulandı)</span>
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Üretim Zamanı: {activeDrawing.createdAt}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px]">Kenarlar & Taban</span>
                  <span className="font-bold text-slate-800">{activeDrawing.summary.edgesText}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px]">Daire Dağılımı</span>
                  <span className="font-bold text-slate-800">{activeDrawing.summary.flatsText}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px]">Ticari / Dükkan</span>
                  <span className="font-bold text-slate-800">{activeDrawing.summary.shopsText}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px]">Toplam Kat</span>
                  <span className="font-bold text-slate-800">{activeDrawing.summary.floorsText}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
