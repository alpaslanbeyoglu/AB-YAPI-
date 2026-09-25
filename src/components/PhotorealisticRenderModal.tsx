import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Sun,
  Sunset,
  Sunrise,
  Moon,
  Sparkles,
  Download,
  Copy,
  Check,
  Maximize2,
  RefreshCw,
  Layers,
  Compass,
  Building2,
  Sliders,
  Image as ImageIcon,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { BuildingModelParams, FacadeStyleType, LightingPresetType } from '../types';
import { FACADE_STYLES, getFacadeStyleConfig } from '../utils/buildingModelUtils';
import { useCompanyProfile } from '../context/CompanyProfileContext';
import { processLogoForPageEmbed } from '../utils/logoProcessor';

interface PhotorealisticRenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: BuildingModelParams;
  getCanvasDataUrl?: () => string | null;
  onApplyFacadeStyle?: (style: FacadeStyleType) => void;
  onApplyLightingPreset?: (preset: LightingPresetType) => void;
  currentLightingPreset?: LightingPresetType;
  currentSunTimeHour?: number;
}

export const PhotorealisticRenderModal: React.FC<PhotorealisticRenderModalProps> = ({
  isOpen,
  onClose,
  params,
  getCanvasDataUrl,
  onApplyFacadeStyle,
  onApplyLightingPreset,
  currentLightingPreset = 'sunset',
  currentSunTimeHour = 19.2,
}) => {
  const { profile } = useCompanyProfile();
  const [selectedFacade, setSelectedFacade] = useState<FacadeStyleType>(
    params.facadeStyle || 'concrete_brutalist'
  );
  const [selectedLighting, setSelectedLighting] = useState<LightingPresetType>(
    currentLightingPreset || 'sunset'
  );
  const [selectedCameraAngle, setSelectedCameraAngle] = useState<'iso' | 'street' | 'front' | 'aerial'>('iso');
  const [resolution, setResolution] = useState<'4k' | '1080p' | 'social'>('4k');
  const [renderEngine, setRenderEngine] = useState<'studio' | 'ai_archviz'>('studio');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiRenderUrl, setAiRenderUrl] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRenderingStudio, setIsRenderingStudio] = useState(false);
  const [studioRenderUrl, setStudioRenderUrl] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync selected facade with model params
  useEffect(() => {
    if (params.facadeStyle) {
      setSelectedFacade(params.facadeStyle);
    }
  }, [params.facadeStyle]);

  // Generate composite studio render with professional architectural title block
  const generateStudioRender = () => {
    setIsRenderingStudio(true);
    try {
      const rawDataUrl = getCanvasDataUrl?.();
      if (!rawDataUrl) {
        setIsRenderingStudio(false);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetW = resolution === '4k' ? 3840 : resolution === '1080p' ? 1920 : 1600;
        const targetH = resolution === 'social' ? 1600 : Math.round((targetW * 9) / 16);
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 1. Background gradient
        const isSunset = selectedLighting === 'sunset';
        const isNight = selectedLighting === 'blue_hour';
        const isSunrise = selectedLighting === 'sunrise';

        const bgGrad = ctx.createLinearGradient(0, 0, 0, targetH);
        if (isSunset) {
          bgGrad.addColorStop(0, '#1e1b4b');
          bgGrad.addColorStop(0.35, '#431407');
          bgGrad.addColorStop(0.7, '#9a3412');
          bgGrad.addColorStop(0.92, '#ea580c');
          bgGrad.addColorStop(1, '#fed7aa');
        } else if (isNight) {
          bgGrad.addColorStop(0, '#030712');
          bgGrad.addColorStop(0.5, '#0f172a');
          bgGrad.addColorStop(1, '#1e293b');
        } else if (isSunrise) {
          bgGrad.addColorStop(0, '#1e293b');
          bgGrad.addColorStop(0.4, '#7c2d12');
          bgGrad.addColorStop(0.8, '#fdba74');
          bgGrad.addColorStop(1, '#fef08a');
        } else {
          bgGrad.addColorStop(0, '#0284c7');
          bgGrad.addColorStop(0.45, '#38bdf8');
          bgGrad.addColorStop(0.85, '#bae6fd');
          bgGrad.addColorStop(1, '#f0f9ff');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, targetW, targetH);

        // 2. Draw 3D scene image with aspect ratio containment
        const imgAspect = img.width / img.height;
        const targetAspect = targetW / targetH;
        let drawW = targetW;
        let drawH = targetH;
        let offsetX = 0;
        let offsetY = 0;

        if (imgAspect > targetAspect) {
          drawW = targetW;
          drawH = targetW / imgAspect;
          offsetY = (targetH - drawH) / 2;
        } else {
          drawH = targetH;
          drawW = targetH * imgAspect;
          offsetX = (targetW - drawW) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        // 3. Cinematic Vignette
        const vignette = ctx.createRadialGradient(
          targetW / 2,
          targetH / 2,
          targetW * 0.3,
          targetW / 2,
          targetH / 2,
          targetW * 0.75
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, isSunset ? 'rgba(30, 10, 0, 0.45)' : 'rgba(0, 0, 0, 0.4)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, targetW, targetH);

        // 4. Subtle Architectural Frame Border
        const margin = Math.round(targetW * 0.02);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = Math.max(2, Math.round(targetW * 0.001));
        ctx.strokeRect(margin, margin, targetW - margin * 2, targetH - margin * 2);

        // 5. Professional Project Title Block (Antet) in Bottom-Right
        const titleW = Math.round(targetW * 0.32);
        const titleH = Math.round(targetH * 0.16);
        const titleX = targetW - margin - titleW - 10;
        const titleY = targetH - margin - titleH - 10;

        // Frosted Glass Title Box
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.beginPath();
        ctx.roundRect(titleX, titleY, titleW, titleH, 16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Accent gold/indigo line on left of antet
        ctx.fillStyle = isSunset ? '#f59e0b' : '#6366f1';
        ctx.beginPath();
        ctx.roundRect(titleX + 12, titleY + 14, 6, titleH - 28, 3);
        ctx.fill();

        // Typography inside antet
        const fontSizeMain = Math.round(titleH * 0.22);
        const fontSizeSub = Math.round(titleH * 0.13);
        const textLeft = titleX + 28;

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${fontSizeMain}px "Plus Jakarta Sans", system-ui, sans-serif`;
        ctx.fillText(
          `AB YAPI | ${params.floorCount} KATLI MİMARİ PROJE`,
          textLeft,
          titleY + titleH * 0.32
        );

        ctx.fillStyle = isSunset ? '#fdba74' : '#93c5fd';
        ctx.font = `600 ${fontSizeSub}px "Plus Jakarta Sans", monospace, sans-serif`;
        const facadeConfig = getFacadeStyleConfig(selectedFacade);
        ctx.fillText(
          `CEPHE: ${facadeConfig.title.toUpperCase()}  |  IŞIK: ${
            isSunset ? 'GÜN BATIMI (ALTIN SAAT)' : isSunrise ? 'GÜNDOĞUMU' : isNight ? 'MAVİ SAAT' : 'GÜN IŞIĞI'
          }`,
          textLeft,
          titleY + titleH * 0.54
        );

        ctx.fillStyle = '#94a3b8';
        ctx.font = `500 ${fontSizeSub * 0.9}px "Plus Jakarta Sans", monospace, sans-serif`;
        const widthM = params.facadeWidth?.toFixed(1) || '14.0';
        const depthM = params.facadeDepth?.toFixed(1) || '18.0';
        const totalFlats = (params.floorCount || 5) * (params.flatsPerFloor || 2);
        ctx.fillText(
          `ÖLÇÜ: ${widthM}m × ${depthM}m  |  ${totalFlats} BAĞIMSIZ BÖLÜM  |  ÇÖZÜNÜRLÜK: ${targetW}×${targetH}`,
          textLeft,
          titleY + titleH * 0.74
        );

        // Top Left Stamp
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.beginPath();
        ctx.roundRect(margin + 16, margin + 16, 260, 48, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.stroke();

        ctx.fillStyle = isSunset ? '#fbbf24' : '#38bdf8';
        ctx.font = `bold 14px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText(`FOTOGERÇEKÇİ 3D MİMARİ RENDER`, margin + 30, margin + 45);

        // Draw Company Logo (Top-Right, Embedded without Box, Background Removed)
        if (profile?.logoBase64) {
          processLogoForPageEmbed(profile.logoBase64, {
            mode: 'adaptive_clean',
            isDarkSurface: true,
            tolerance: 44,
          }).then((processedLogo) => {
            if (processedLogo && processedLogo.width > 0 && processedLogo.height > 0) {
              const maxLogoW = Math.round(targetW * 0.16);
              const maxLogoH = Math.round(targetH * 0.11);
              const ratio = processedLogo.width / processedLogo.height;
              let drawW = maxLogoW;
              let drawH = drawW / ratio;
              if (drawH > maxLogoH) {
                drawH = maxLogoH;
                drawW = drawH * ratio;
              }
              const logoX = targetW - margin - drawW - 16;
              const logoY = margin + 16;

              ctx.save();
              ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
              ctx.shadowBlur = 18;
              ctx.shadowOffsetY = 4;
              ctx.drawImage(processedLogo, logoX, logoY, drawW, drawH);
              ctx.restore();
            }
            const renderedData = canvas.toDataURL('image/png', 0.98);
            setStudioRenderUrl(renderedData);
            setIsRenderingStudio(false);
          });
          return;
        }

        const renderedData = canvas.toDataURL('image/png', 0.98);
        setStudioRenderUrl(renderedData);
        setIsRenderingStudio(false);
      };
      img.src = rawDataUrl;
    } catch (err) {
      console.error('Studio render generation error:', err);
      setIsRenderingStudio(false);
    }
  };

  // Shared branding logic
  const applyBranding = async (imgUrl: string, resolutionMode: '4k' | '1080p' | 'social'): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetW = resolutionMode === '4k' ? 3840 : resolutionMode === '1080p' ? 1920 : 1600;
        const targetH = resolutionMode === 'social' ? 1600 : Math.round((targetW * 9) / 16);
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No context');

        ctx.drawImage(img, 0, 0, targetW, targetH);
        
        const margin = Math.round(targetW * 0.02);
        
        // Add Title Block
        const titleW = Math.round(targetW * 0.32);
        const titleH = Math.round(targetH * 0.16);
        const titleX = targetW - margin - titleW - 10;
        const titleY = targetH - margin - titleH - 10;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.beginPath();
        ctx.roundRect(titleX, titleY, titleW, titleH, 16);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(titleH * 0.22)}px "Plus Jakarta Sans", system-ui, sans-serif`;
        ctx.fillText(`AB YAPI | ${params.floorCount} KATLI MİMARİ PROJE`, titleX + 28, titleY + titleH * 0.32);

        // Add Logo (Embedded without Box, Background Removed)
        if (profile?.logoBase64) {
          processLogoForPageEmbed(profile.logoBase64, {
            mode: 'adaptive_clean',
            isDarkSurface: true,
            tolerance: 44,
          }).then((processedLogo) => {
            if (processedLogo && processedLogo.width > 0 && processedLogo.height > 0) {
              const maxLogoW = Math.round(targetW * 0.16);
              const maxLogoH = Math.round(targetH * 0.11);
              const ratio = processedLogo.width / processedLogo.height;
              let drawW = maxLogoW;
              let drawH = drawW / ratio;
              if (drawH > maxLogoH) {
                drawH = maxLogoH;
                drawW = drawH * ratio;
              }
              const logoX = targetW - margin - drawW - 16;
              const logoY = margin + 16;

              ctx.save();
              ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
              ctx.shadowBlur = 18;
              ctx.shadowOffsetY = 4;
              ctx.drawImage(processedLogo, logoX, logoY, drawW, drawH);
              ctx.restore();
            }
            resolve(canvas.toDataURL('image/png', 0.98));
          });
          return;
        }
        resolve(canvas.toDataURL('image/png', 0.98));
      };
      img.src = imgUrl;
    });
  };

  // Generate AI Photorealistic ArchViz Render (Gemini Engine)
  const handleGenerateAiRender = async () => {
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      const payload = {
        drawingType: 'photorealistic_render',
        styleTheme: 'colored_presentation',
        aspectRatio: resolution === 'social' ? '1:1' : '16:9',
        customPromptNote: `Modern architectural exterior render of a residential building. Facade style: ${selectedFacade}. Lighting atmosphere: ${selectedLighting} golden hour sunset lighting with rich warm reflections. High resolution architectural photography.`,
        projectData: {
          facadeWidth: params.facadeWidth || 14,
          facadeDepth: params.facadeDepth || 18,
          floorCount: params.floorCount || 5,
          flatsPerFloor: params.flatsPerFloor || 2,
          hasGroundFloorShop: params.hasGroundFloorShop || false,
          shopCount: params.shopCount || 1,
          hasBasement: (params.basementCount || 0) > 0,
          basementCount: params.basementCount || 1,
          roofType: params.roofType || 'gable',
          facadeStyle: selectedFacade,
          lightingMode: selectedLighting,
          sunTimeHour: currentSunTimeHour,
        },
      };

      const response = await fetch('/api/generate-blueprint-drawing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Render sunucusu hatası (${response.status})`);
      }

      const data = await response.json();
      if (data.imageUrl) {
        const branded = await applyBranding(data.imageUrl, resolution);
        setAiRenderUrl(branded);
        setRenderEngine('ai_archviz');
      } else {
        throw new Error('Görsel çıktısı alınamadı.');
      }
    } catch (err: any) {
      console.error('AI Render Error:', err);
      setAiError(err.message || 'Yapay zeka render işlemi sırasında bir hata oluştu.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Handle Download
  const handleDownload = () => {
    const activeUrl = renderEngine === 'ai_archviz' && aiRenderUrl ? aiRenderUrl : studioRenderUrl;
    if (!activeUrl) return;

    const a = document.createElement('a');
    a.href = activeUrl;
    a.download = `AB_YAPI_Fotogercekci_${selectedFacade}_${selectedLighting}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Handle Copy Image
  const handleCopyImage = async () => {
    const activeUrl = renderEngine === 'ai_archviz' && aiRenderUrl ? aiRenderUrl : studioRenderUrl;
    if (!activeUrl) return;

    try {
      const response = await fetch(activeUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Copy image error:', err);
    }
  };

  if (!isOpen) return null;

  const currentFacadeConfig = getFacadeStyleConfig(selectedFacade);
  const activeImageUrl = renderEngine === 'ai_archviz' && aiRenderUrl ? aiRenderUrl : studioRenderUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-6xl max-h-[95vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Fotogerçekçi 3D Stüdyo & ArchViz Render
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  4K Ultra-HD
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Modern beton cephe, gün batımı altın saat ve sinematik mimari görselleştirme stüdyosu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
          {/* Left Panel: Studio Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* 1. Cephe Tarzı Seçimi (Modern Beton Cephe Vurgusu) */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  Dış Cephe Tasarımı & Dokusu
                </span>
                <span className="text-[10px] text-amber-400 font-medium">
                  {currentFacadeConfig.title}
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                {/* 1. Modern Beton Cephe (Öncelikli Seçenek) */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFacade('concrete_brutalist');
                    onApplyFacadeStyle?.('concrete_brutalist');
                  }}
                  className={`relative p-3 rounded-2xl border text-left transition-all col-span-2 flex items-center justify-between gap-3 ${
                    selectedFacade === 'concrete_brutalist'
                      ? 'bg-gradient-to-r from-slate-800 to-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg'
                      : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-700 border border-slate-500/40 flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:4px_4px] opacity-60" />
                      <span className="text-xs font-bold text-slate-200 z-10">BETON</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Modern Beton Cephe</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                          Önerilen
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Mimari brüt panel beton, derz çizgileri, kalıp delikleri & antrasit profiller
                      </p>
                    </div>
                  </div>
                  {selectedFacade === 'concrete_brutalist' && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  )}
                </button>

                {/* Diğer Cephe Seçenekleri */}
                {FACADE_STYLES.filter((f) => f.id !== 'concrete_brutalist').slice(0, 4).map((style) => {
                  const isSelected = selectedFacade === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => {
                        setSelectedFacade(style.id);
                        onApplyFacadeStyle?.(style.id);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-950/70 border-indigo-500 ring-1 ring-indigo-400 text-white shadow-md'
                          : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: style.wallColorHex }}
                        />
                        <span className="text-[11px] font-bold truncate">{style.title}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 line-clamp-1">{style.subtitle}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Aydınlatma & Atmosfer (Gün Batımı Vurgusu) */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-400" />
                  Aydınlatma & Gökyüzü Atmosferi
                </span>
                <span className="text-[10px] text-amber-300 font-mono font-bold">
                  {selectedLighting === 'sunset'
                    ? '19:15 (Altın Saat)'
                    : selectedLighting === 'midday'
                    ? '12:30 (Öğle Güneşi)'
                    : selectedLighting === 'sunrise'
                    ? '07:15 (Gündoğumu)'
                    : '20:45 (Mavi Saat)'}
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                {/* 1. Gün Batımı / Altın Saat (Vurgulu) */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLighting('sunset');
                    onApplyLightingPreset?.('sunset');
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all col-span-2 flex items-center justify-between gap-3 ${
                    selectedLighting === 'sunset'
                      ? 'bg-gradient-to-r from-amber-950/70 via-orange-950/50 to-slate-900 border-amber-500 ring-2 ring-amber-500/40 shadow-lg text-white'
                      : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
                      <Sunset className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-200">Gün Batımı Aydınlatması</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/30 text-amber-300 border border-amber-500/40">
                          Altın Saat
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300">
                        Sıcak amber gün batımı ışığı, derin gölgeler & pencere iç aydınlatmaları
                      </p>
                    </div>
                  </div>
                  {selectedLighting === 'sunset' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                </button>

                {/* 2. Öğle Güneşi */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLighting('midday');
                    onApplyLightingPreset?.('midday');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedLighting === 'midday'
                      ? 'bg-sky-950/70 border-sky-500 ring-1 ring-sky-400 text-white'
                      : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="text-[11px] font-bold text-white">Öğle Güneşi</span>
                  </div>
                  <p className="text-[9px] text-slate-400">Net gölgeler, berrak gün ışığı</p>
                </button>

                {/* 3. Mavi Saat & Gece */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLighting('blue_hour');
                    onApplyLightingPreset?.('blue_hour');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedLighting === 'blue_hour'
                      ? 'bg-indigo-950/70 border-indigo-500 ring-1 ring-indigo-400 text-white'
                      : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Moon className="w-4 h-4 text-indigo-300" />
                    <span className="text-[11px] font-bold text-white">Mavi Saat & Gece</span>
                  </div>
                  <p className="text-[9px] text-slate-400">Alacakaranlık & dükkan ışıkları</p>
                </button>
              </div>
            </div>

            {/* 3. Render Çözünürlüğü */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-slate-400" />
                Render Çıktı Çözünürlüğü
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '4k', label: '4K Ultra-HD', sub: '3840 × 2160' },
                  { id: '1080p', label: 'Full HD (1080p)', sub: '1920 × 1080' },
                  { id: 'social', label: 'Kare (1:1)', sub: '1600 × 1600' },
                ].map((res) => (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => setResolution(res.id as any)}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      resolution === res.id
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm font-bold'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-[11px] leading-tight">{res.label}</div>
                    <div className="text-[9px] opacity-75 font-mono">{res.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Render Motoru Seçimi */}
            <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Görselleştirme Motoru
                </span>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setRenderEngine('studio')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      renderEngine === 'studio'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    4K Stüdyo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenderEngine('ai_archviz');
                      if (!aiRenderUrl) {
                        handleGenerateAiRender();
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      renderEngine === 'ai_archviz'
                        ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    AI ArchViz
                  </button>
                </div>
              </div>

              {renderEngine === 'ai_archviz' && (
                <button
                  type="button"
                  onClick={handleGenerateAiRender}
                  disabled={isGeneratingAi}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                  <span>
                    {isGeneratingAi ? 'AI Fotogerçekçi Render Üretiliyor...' : 'Yeniden AI Render Oluştur'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Right Panel: Live Render Display & Export Actions (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Render Canvas Container */}
            <div className="relative flex-1 min-h-[380px] sm:min-h-[460px] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner group">
              {isRenderingStudio || isGeneratingAi ? (
                <div className="flex flex-col items-center gap-3 p-8 text-center animate-pulse">
                  <div className="p-4 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
                    <Sparkles className="w-8 h-8 animate-spin" />
                  </div>
                  <div className="text-sm font-bold text-white">
                    {isGeneratingAi
                      ? 'Yapay Zeka Fotogerçekçi ArchViz Renderı Hesaplanıyor...'
                      : '4K Stüdyo Renderı & Antet Çerçevesi Derleniyor...'}
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {selectedFacade === 'concrete_brutalist' ? 'Modern beton cephe' : 'Seçili cephe'} kaplaması ve{' '}
                    {selectedLighting === 'sunset' ? 'gün batımı altın saat' : 'seçili aydınlatma'} parametreleri işleniyor.
                  </p>
                </div>
              ) : activeImageUrl ? (
                <>
                  <img
                    src={activeImageUrl}
                    alt="Fotogerçekçi 3D Render"
                    className="w-full h-full object-contain max-h-[520px] transition-all"
                  />
                  {/* Floating Metadata Overlay */}
                  <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-[10px] font-mono text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      {renderEngine === 'ai_archviz' ? 'AI ArchViz Render' : '4K Ultra-HD Stüdyo'}
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className="text-amber-300">
                      {selectedLighting === 'sunset' ? '🌅 Gün Batımı' : '☀️ Gün Işığı'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-slate-500 text-xs flex flex-col items-center gap-2">
                  <ImageIcon className="w-8 h-8 opacity-40" />
                  <span>Render önizlemesi yüklenemedi</span>
                </div>
              )}

              {aiError && (
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-rose-950/90 border border-rose-800 text-rose-200 text-xs flex items-center justify-between">
                  <span>{aiError}</span>
                  <button
                    type="button"
                    onClick={generateStudioRender}
                    className="px-2 py-1 bg-rose-900 rounded text-[10px] font-bold hover:bg-rose-800"
                  >
                    Stüdyoya Dön
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={generateStudioRender}
                  disabled={isRenderingStudio}
                  className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5"
                  title="Render Görünümünü Yenile"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRenderingStudio ? 'animate-spin' : ''}`} />
                  <span>Yenile</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyImage}
                  className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Kopyalandı</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Panoya Kopyala</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!activeImageUrl}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{resolution.toUpperCase()} PNG Renderı İndir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
