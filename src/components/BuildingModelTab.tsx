import { ArchitecturalModelDetails } from './ArchitecturalModelDetails';
import { ResidentialFloorPlan } from './ResidentialFloorPlan';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Layers,
  Sliders,
  ArrowRight,
  CheckCircle2,
  Eye,
  Sun,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { BuildingModelParams, ProjectParams, AppTheme } from '../types';
import { saveProjectScopedOffer3DPreview } from '../utils/workflowConsistencyUtils';
import {
  DEFAULT_BUILDING_PARAMS,
  calculateBuildingMetrics,
  WALL_COLOR_PRESETS,
  ROOF_COLOR_PRESETS,
  ACCENT_COLOR_PRESETS,
  FRAME_COLOR_PRESETS,
  FACADE_STYLES,
  getFacadeStyleConfig,
  MATERIAL_FINISH_OPTIONS,
  WALL_PATTERN_OPTIONS,
  ROOF_PATTERN_OPTIONS,
} from '../utils/buildingModelUtils';
import { calculateFootprint } from '../utils/footprintUtils';

import {
  SolarLocation,
  TURKEY_CITIES,
  SOLAR_SEASONS,
  calculateSolarPosition,
} from '../utils/solarCalculations';
import { ThreeBuildingView } from './ThreeBuildingView';
import { SolarAnalysisPanel } from './SolarAnalysisPanel';
import { ZoningAuditPanel } from './ZoningAuditPanel';

const appearanceSelectClass = 'mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm focus-visible:outline-2 focus-visible:outline-indigo-600';

const APPEARANCE_PALETTES = [
  { label: 'Açık & Kiremit', wall: '#f8fafc', roof: '#b91c1c', accent: '#b5734c', frame: '#18181b' },
  { label: 'Antrasit & Çinko', wall: '#22252a', roof: '#1e293b', accent: '#b5734c', frame: '#18181b' },
  { label: 'Bej & Kestane', wall: '#f5efe6', roof: '#451a03', accent: '#8c6239', frame: '#334155' },
  { label: 'Beyaz & Grafit', wall: '#f8fafc', roof: '#0f172a', accent: '#334155', frame: '#18181b' },
  { label: 'Tuğla & Kırmızı', wall: '#9a3412', roof: '#7f1d1d', accent: '#451a03', frame: '#18181b' },
];

interface BuildingModelTabProps {
  params?: BuildingModelParams;
  projectParams?: ProjectParams;
  projectName?: string;
  projectAddress?: string;
  landArea?: number;
  onUpdateParams?: (updates: Partial<BuildingModelParams>) => void;
  onNavigateToArchitecture?: () => void;
  onNavigateToSetup?: () => void;
  onNavigateToOwners?: () => void;
  onNavigateToOffer?: () => void;
  theme?: AppTheme;
  openFacadeEditorOnMount?: boolean;
}

export const BuildingModelTab: React.FC<BuildingModelTabProps> = ({
  params: propParams,
  projectParams,
  projectName,
  projectAddress,
  landArea,
  onUpdateParams,
  onNavigateToArchitecture,
  onNavigateToSetup,
  onNavigateToOwners,
  onNavigateToOffer,
  theme = 'light',
  openFacadeEditorOnMount = false,
}) => {
  const isGray = theme === 'gray';
  const [lightingMode, setLightingMode] = useState<'day' | 'sunset' | 'night'>('day');
  const [showStreetNames, setShowStreetNames] = useState(true);
  const [facadeEditorOpen, setFacadeEditorOpen] = useState(openFacadeEditorOnMount);
  const [selectedFacadeIndex, setSelectedFacadeIndex] = useState(0);
  const facadeDialog = React.useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = facadeDialog.current;
    if (facadeEditorOpen && dialog && !dialog.open) dialog.showModal();
  }, [facadeEditorOpen]);

  // Building Model Parameters (local state if not provided from parent)
  const [internalModelParams, setInternalModelParams] = useState<BuildingModelParams>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_building_model');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_BUILDING_PARAMS;
  });

  const modelParams = propParams || internalModelParams;

  // Collapsible section for Facade & Roof customization

  // Active subview: 3D Model vs Solar Exposure vs 2D Floor Plan
  const [viewMode, setViewMode] = useState<'3d' | 'solar' | 'plan'>('3d');
  // Teknik Düzenleme vs Müşteri Sunumu Modu
  const [presentationMode, setPresentationMode] = useState<boolean>(false);
  const [syncedFeedback, setSyncedFeedback] = useState<string | null>(null);

  // Auto-sync when propParams change
  React.useEffect(() => {
    if (propParams) {
      setInternalModelParams(prev => ({ ...prev, ...propParams }));
    }
  }, [propParams]);

  // Solar Exposure Simulation States
  const [solarLocation, setSolarLocation] = useState<SolarLocation>(TURKEY_CITIES[0]);
  const [solarSeasonId, setSolarSeasonId] = useState<string>('summer_solstice');
  const [solarTimeHour, setSolarTimeHour] = useState<number>(13.5);
  const [solarBuildingRotation, setSolarBuildingRotation] = useState<number>(0);
  const [isSolarHeatmap, setIsSolarHeatmap] = useState<boolean>(false);
  const [isPlayingSolar, setIsPlayingSolar] = useState<boolean>(false);

  // Continuous play animation for solar simulation
  useEffect(() => {
    if (!isPlayingSolar) return;
    const interval = setInterval(() => {
      setSolarTimeHour((prev) => {
        const next = prev + 0.15;
        if (next > 20.0) return 6.0;
        return Math.round(next * 100) / 100;
      });
    }, 60);

    return () => clearInterval(interval);
  }, [isPlayingSolar]);

  const currentSeasonDay = SOLAR_SEASONS.find(s => s.id === solarSeasonId)?.dayOfYear ?? 172;
  const solarPos = calculateSolarPosition(solarLocation.lat, currentSeasonDay, solarTimeHour);

  // 2. Collapsible accordion states for each individual measurement card
  // Save to local storage on change
  const updateParams = (updates: Partial<BuildingModelParams>) => {
    if (onUpdateParams) {
      onUpdateParams(updates);
    } else {
      setInternalModelParams((prev) => {
        const next = { ...prev, ...updates };
        try {
          localStorage.setItem('ab_yapi_building_model', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    }
  };

  const metrics = calculateBuildingMetrics(modelParams);
  const effectiveLandArea = landArea ?? projectParams?.landArea ?? 0;
  const effectiveProjectName = projectName ?? projectParams?.projectName ?? '';
  const effectiveProjectAddress = projectAddress ?? projectParams?.projectAddress ?? '';
  const effectiveFootprint = calculateFootprint(modelParams.footprintInputMode || 'directArea', modelParams);
  const isProportionalFootprint =
    !modelParams.footprintInputMode || modelParams.footprintInputMode === 'directArea';
  const footprintExceedsLand =
    effectiveLandArea > 0 && metrics.footprintArea > effectiveLandArea * 1.01;

  // Save 3D view snapshot for OfferTab attachments (project-scoped for Y-3)
  const handleAttachSnapshotToOffer = (dataUrl: string) => {
    try {
      saveProjectScopedOffer3DPreview({
        url: dataUrl,
        caption: `${effectiveProjectName || '3D Mimari Model'} — 3D Perspektif Görünüm`,
        projectAddress: effectiveProjectAddress,
        projectName: effectiveProjectName,
        updatedAt: new Date().toISOString(),
      });
      setSyncedFeedback(
        '3D görsel Teklif eklerine kaydedildi. 8. Aşama (Teklif & Sunum) ekranından müşteri teklifine dahil edebilirsiniz.'
      );
      setTimeout(() => setSyncedFeedback(null), 5000);
    } catch (e) {
      setSyncedFeedback('3D görsel kaydedilemedi (tarayıcı depolama limiti).');
      setTimeout(() => setSyncedFeedback(null), 4000);
    }
  };

  // Common card style based on theme (strictly light and gray)
  const cardBg = isGray ? 'bg-slate-100 border-slate-300 shadow-sm' : 'bg-white border-slate-200 shadow-sm';
  const subCardBg = isGray ? 'bg-white/90 border-slate-300 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-800';
  const textMuted = 'text-slate-500';
  const textTitle = 'text-slate-900';

  return (
    <div className="space-y-6">
      {facadeEditorOpen && (
        <dialog ref={facadeDialog} onClose={() => setFacadeEditorOpen(false)} aria-labelledby="facade-editor-title"
          className="m-auto h-[95dvh] max-h-none w-[min(96vw,90rem)] max-w-none overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl backdrop:bg-slate-900/50">
          <div className="flex h-full min-h-0 flex-col">
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 sm:px-4">
              <h2 id="facade-editor-title" className="text-sm font-bold sm:text-base">Cephe ve giriş düzenleme</h2>
              <button type="button" autoFocus onClick={() => facadeDialog.current?.close()}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100">
                Düzenlemeyi kapat
              </button>
            </header>
            <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,2fr)_minmax(0,3fr)] gap-2 p-2 sm:gap-3 sm:p-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
              <div className="min-h-0 min-w-0">
                <ThreeBuildingView params={modelParams} theme={theme} compactPreview highlightedFacadeIndex={selectedFacadeIndex}
                  projectName={effectiveProjectName} projectAddress={effectiveProjectAddress}
                  landArea={effectiveLandArea}
                  sceneAppearance={{ lightingMode, showStreetNames, onLightingChange: setLightingMode }} />
              </div>
              <div role="region" aria-label="Cephe ve giriş ayarları" tabIndex={0}
                className="min-h-0 min-w-0 overflow-y-auto overscroll-contain rounded-lg border border-slate-200 p-2 sm:p-3">
                <ArchitecturalModelDetails modelParams={modelParams} updateParams={updateParams} compact
                  selectedFacadeIndex={selectedFacadeIndex} onSelectFacade={setSelectedFacadeIndex} />
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Feedback Toast */}
      {syncedFeedback && (
        <div className="p-4 rounded-2xl border text-xs flex items-center justify-between shadow-sm animate-fade-in bg-emerald-50 border-emerald-300 text-emerald-800">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{syncedFeedback}</span>
          </div>
        </div>
      )}

      {/* Main Content Layout: Stacked Layout (3D Visualizer Top, Input Cards Below) */}
      <div className="space-y-6">
        {/* TOP SECTION: 3D Model Canvas / Solar Simulation */}
        <div className="space-y-4">
          <div className={`border rounded-2xl p-3 sm:p-4 ${cardBg}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div role="group" aria-label="Model görünümü" className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
                {([
                  ['3d', '3D Model', Box],
                  ['plan', 'Kat ön planı', Layers],
                  ['solar', 'Güneş Analizi', Sun],
                ] as const).map(([mode, label, Icon]) => (
                  <button key={mode} type="button" aria-pressed={viewMode === mode}
                    onClick={() => setViewMode(mode)}
                    className={`flex min-h-9 items-center gap-1 rounded-md px-2.5 text-sm font-semibold ${viewMode === mode
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-700 hover:bg-white'}`}>
                    <Icon aria-hidden="true" className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
                {/* Teknik Düzenleme vs Müşteri Sunumu */}
                <div className={`flex items-center p-0.5 rounded-xl border ${subCardBg}`}>
                  <button
                    type="button"
                    onClick={() => setPresentationMode(false)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      !presentationMode
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Teknik Düzenleme</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresentationMode(true)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      presentationMode
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Müşteri Sunumu</span>
                  </button>
                </div>

            </div>

            {viewMode === '3d' && (
              <div className="space-y-3">
                {!facadeEditorOpen && (
                <ThreeBuildingView
                  params={modelParams}
                  theme={theme}
                  presentationMode={presentationMode}
                  sceneAppearance={{ lightingMode, showStreetNames, onLightingChange: setLightingMode }}
                  projectName={effectiveProjectName}
                  projectAddress={effectiveProjectAddress}
                  landArea={effectiveLandArea}
                  onAttachToOffer={handleAttachSnapshotToOffer}
                  surfaceRotation={modelParams.surfaceRotation || 0}
                  buildingRotation={modelParams.surfaceRotation || 0}
                  onUpdateColors={(colors) => updateParams(colors)}
                  onUpdateBuildingRotation={(rot) => updateParams({ surfaceRotation: rot, buildingRotation: rot })}
                />
                )}
                {!presentationMode && (
                  <button type="button" onClick={() => setFacadeEditorOpen(true)}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                    Cephe ve girişi düzenle
                  </button>
                )}

                <section aria-label="Dış görünüm" className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 text-slate-800 sm:p-4">
                  <h3 className="text-sm font-bold">Dış görünüm</h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <label className="min-w-0 text-xs font-semibold">
                      Cephe tarzı
                      <select className={appearanceSelectClass} value={modelParams.facadeStyle || 'modern'}
                        onChange={event => {
                          const style = FACADE_STYLES.find(option => option.id === event.currentTarget.value);
                          if (style) updateParams({
                            facadeStyle: style.id,
                            wallColor: style.wallColorHex,
                            accentColor: style.accentColorHex,
                            wallPattern: style.wallPattern,
                          });
                        }}>
                        {FACADE_STYLES.map(style => <option key={style.id} value={style.id}>{style.title}</option>)}
                      </select>
                    </label>
                    {([
                      ['wallPattern', 'Cephe dokusu', modelParams.wallPattern ?? getFacadeStyleConfig(modelParams.facadeStyle || 'modern').wallPattern, WALL_PATTERN_OPTIONS],
                      ['roofPattern', 'Çatı dokusu', modelParams.roofPattern || 'tiles', ROOF_PATTERN_OPTIONS],
                      ['materialFinish', 'Yüzey bitişi', modelParams.materialFinish || 'satin', MATERIAL_FINISH_OPTIONS],
                    ] as const).map(([field, label, value, options]) => (
                      <label key={field} className="min-w-0 text-xs font-semibold">
                        {label}
                        <select className={appearanceSelectClass} value={value} onChange={event => {
                          const option = options.find(item => item.id === event.currentTarget.value);
                          if (option) updateParams({ [field]: option.id });
                        }}>
                          {options.map(option => <option key={option.id} value={option.id}>{option.title}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                  <div className="grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-[minmax(8rem,1fr)_3fr]">
                    <label className="min-w-0 text-xs font-semibold">
                      Renk paleti
                      <select className={appearanceSelectClass}
                        value={APPEARANCE_PALETTES.find(palette => palette.wall === modelParams.wallColor && palette.roof === modelParams.roofColor &&
                          palette.accent === modelParams.accentColor && palette.frame === modelParams.frameColor)?.label || ''}
                        onChange={event => {
                          const palette = APPEARANCE_PALETTES.find(item => item.label === event.currentTarget.value);
                          if (palette) updateParams({ wallColor: palette.wall, roofColor: palette.roof, accentColor: palette.accent, frameColor: palette.frame });
                        }}>
                        <option value="" disabled>Özel renkler</option>
                        {APPEARANCE_PALETTES.map(palette => <option key={palette.label}>{palette.label}</option>)}
                      </select>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        ['wallColor', 'Duvar', '#f1f5f9', WALL_COLOR_PRESETS],
                        ['roofColor', 'Çatı', '#b91c1c', ROOF_COLOR_PRESETS],
                        ['accentColor', 'Söve', '#b5734c', ACCENT_COLOR_PRESETS],
                        ['frameColor', 'Doğrama', '#18181b', FRAME_COLOR_PRESETS],
                      ] as const).map(([field, label, fallback, presets]) => (
                        <label key={field} className="min-w-0 text-xs font-semibold">
                          {label}
                          <input type="color" list={`appearance-${field}`} value={modelParams[field] || fallback}
                            onChange={event => updateParams({ [field]: event.currentTarget.value })}
                            className="mt-1 block h-10 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1 focus-visible:outline-2 focus-visible:outline-indigo-600" />
                          <datalist id={`appearance-${field}`}>
                            {presets.map(preset => <option key={preset.id} value={preset.hex} label={preset.name} />)}
                          </datalist>
                        </label>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {viewMode === 'plan' && <ResidentialFloorPlan model={modelParams} flats={projectParams?.flats} />}

            {viewMode === 'solar' && (
              <div className="space-y-4 animate-fade-in">
                <ThreeBuildingView
                  params={modelParams}
                  theme={theme}
                  presentationMode={presentationMode}
                  projectName={effectiveProjectName}
                  projectAddress={effectiveProjectAddress}
                  landArea={effectiveLandArea}
                  onAttachToOffer={handleAttachSnapshotToOffer}
                  solarMode={true}
                  sunAltitude={solarPos.altitude}
                  sunAzimuth={solarPos.azimuth}
                  sunTimeHour={solarTimeHour}
                  buildingRotation={solarBuildingRotation}
                  isSolarHeatmap={isSolarHeatmap}
                  onUpdateColors={(colors) => updateParams(colors)}
                  onUpdateSunTimeHour={setSolarTimeHour}
                  onUpdateBuildingRotation={setSolarBuildingRotation}
                  isPlayingSun={isPlayingSolar}
                  onToggleSunPlay={() => setIsPlayingSolar(!isPlayingSolar)}
                />
                <SolarAnalysisPanel
                  location={solarLocation}
                  onChangeLocation={setSolarLocation}
                  selectedSeasonId={solarSeasonId}
                  onChangeSeasonId={setSolarSeasonId}
                  timeHour={solarTimeHour}
                  onChangeTimeHour={setSolarTimeHour}
                  buildingRotation={solarBuildingRotation}
                  onChangeBuildingRotation={setSolarBuildingRotation}
                  isSolarHeatmap={isSolarHeatmap}
                  onChangeSolarHeatmap={setIsSolarHeatmap}
                  isPlaying={isPlayingSolar}
                  onTogglePlay={() => setIsPlayingSolar(!isPlayingSolar)}
                  theme={theme}
                />
              </div>
            )}

            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 rounded-lg border border-slate-200 px-3 py-2 text-xs">
              {[
                ['Kat', modelParams.floorCount],
                ['Taban', `${metrics.footprintArea.toFixed(2)} m²`],
                ['Toplam inşaat', `${metrics.totalBuiltArea.toFixed(2)} m²`],
                ['Bina yüksekliği', `${metrics.totalHeight.toFixed(2)} m`],
                ['Daire net alanı', `~${metrics.flatNetArea.toFixed(2)} m²`],
                ['Merdiven ve asansör', `${metrics.coreArea.toFixed(2)} m²`],
                ['Bölüm', metrics.totalFlats + (modelParams.hasGroundFloorShop ? (modelParams.shopCount || 1) : 0)],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-wrap items-baseline gap-1.5">
                  <dt className={textMuted}>{label}</dt>
                  <dd className={`font-semibold tabular-nums ${textTitle}`}>{value}</dd>
                </div>
              ))}
            </dl>
            {viewMode === '3d' && (
              <section aria-labelledby="model-view-settings" className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <h3 id="model-view-settings" className="text-sm font-bold text-slate-900">Görünüm ve sunum</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Model görünümü
                    <select className={appearanceSelectClass} value={modelParams.interiorCutMode || 'solid'}
                      onChange={event => updateParams({ interiorCutMode: event.currentTarget.value as BuildingModelParams['interiorCutMode'] })}>
                      <option value="solid">Dış görünüm</option>
                      <option value="xray">Şeffaf iç görünüm</option>
                      <option value="cutaway">Açık kesit</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Işık
                    <select className={appearanceSelectClass} value={lightingMode}
                      onChange={event => setLightingMode(event.currentTarget.value as typeof lightingMode)}>
                      <option value="day">Gündüz</option>
                      <option value="sunset">Gün batımı</option>
                      <option value="night">Gece</option>
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={showStreetNames} onChange={event => setShowStreetNames(event.currentTarget.checked)} />
                    Sokak adlarını göster
                  </label>
                  {modelParams.interiorCutMode && modelParams.interiorCutMode !== 'solid' && (
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={modelParams.showFurniture ?? true}
                        onChange={event => updateParams({ showFurniture: event.currentTarget.checked })} />
                      Mobilyaları göster
                    </label>
                  )}
                  {!presentationMode && modelParams.projectModel === 'contractorShare' && (
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={!!modelParams.showContractorShare3D}
                        onChange={event => updateParams({ showContractorShare3D: event.currentTarget.checked })} />
                      Malik ve müteahhit paylarını renklendir
                    </label>
                  )}
                </div>
              </section>
            )}

            {/* Honest Model Data Source & Assumptions Banner */}
            {!presentationMode && (
              <div
                className={`mt-3 px-3.5 py-2.5 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                  footprintExceedsLand
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : isProportionalFootprint || effectiveLandArea <= 0
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-start sm:items-center gap-2">
                  {footprintExceedsLand ? (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5 sm:mt-0" />
                  ) : (
                    <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 sm:mt-0" />
                  )}
                  <div className="leading-relaxed">
                    <span className="font-bold">Model Veri Kaynağı: </span>
                    <span>
                      Taban oturumu ({Math.round(metrics.footprintArea)} m²), {modelParams.floorCount} kat ve{' '}
                      {effectiveLandArea > 0 ? `${Math.round(effectiveLandArea)} m² arsa` : 'arsa girilmemiş'} verisi proje formundan alınır.
                    </span>
                    {isProportionalFootprint && (
                      <span className="ml-1 font-medium">
                        Ön/yan cephe ölçüleri ({effectiveFootprint.effectiveWidth.toFixed(1)}m × {effectiveFootprint.effectiveDepth.toFixed(1)}m) taban alanından orantılı türetilmiştir (varsayılan oran).
                      </span>
                    )}
                    {footprintExceedsLand && (
                      <span className="ml-1 font-bold text-red-700">
                        Uyarı: Bina taban alanı arsa alanını aşıyor!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {!presentationMode && (
          <details className="rounded-xl border border-slate-200 p-4">
            <summary className="cursor-pointer text-sm font-bold">Model denetimi</summary>
            <div className="mt-3"><ZoningAuditPanel params={modelParams} theme={theme} /></div>
          </details>
        )}

        {/* Workflow Adım Geçiş Butonları */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToSetup && (
              <button
                type="button"
                onClick={onNavigateToSetup}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>← 2. Aşama: Arsa ve imar</span>
              </button>
            )}
            {onNavigateToArchitecture && (
              <button type="button" onClick={onNavigateToArchitecture}
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200">
                3. Aşama: Mimari tasarım
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5 ml-auto flex-wrap">
            {onNavigateToOwners && (
              <button
                type="button"
                onClick={onNavigateToOwners}
                className="px-4 py-2.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold rounded-xl flex items-center gap-1.5 text-xs transition-all cursor-pointer"
              >
                <span>7. Aşama: Malik Paylaşımı</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            {onNavigateToOffer && (
              <button
                type="button"
                onClick={onNavigateToOffer}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 text-xs sm:text-sm transition-all hover:translate-x-0.5 cursor-pointer active:scale-95"
              >
                <span>8. Aşama: Teklif & Sözleşme</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
