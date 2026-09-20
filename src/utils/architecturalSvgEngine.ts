/**
 * High-Precision Architectural CAD & Blueprint Vector Engine
 * Generates standards-compliant architectural drawings (TS EN ISO 128)
 * matching exact building dimensions, edge lengths, corner vertices,
 * Turkish Zoning Regulations entrance standards (Planlı Alanlar İmar Yönetmeliği & TS 9111),
 * circulation core (staircase, stretcher elevator), and floor flat distribution.
 */

import { FlatDistributionMode } from '../types';

export interface DrawingProjectData {
  facadeWidth: number;
  facadeDepth: number;
  backFacadeLength?: number;
  leftFacadeLength?: number;
  floorCount: number;
  flatsPerFloor: number;
  flatDistributionMode?: FlatDistributionMode; // 'equal' | 'front_large' | 'asymmetric_master' | 'custom_proportions'
  hasGroundFloorShop?: boolean;
  shopCount?: number;
  hasBasement?: boolean;
  basementCount?: number;
  roofType?: string;
  customFacades?: Array<{ id?: number; name?: string; length: number; [key: string]: any }>;
  hasCantilever?: boolean;
  cantileverDepth?: number;
  // Exact model footprint geometry
  polygonPoints?: Array<{ id?: string; x: number; y: number }>;
  footprintInputMode?: string;
  baseBuildArea?: number;
  // Selected entrance facade & core properties
  mainEntranceFacadeIndex?: number;
  stairWidth?: number;
  stairDepth?: number;
  elevatorWidth?: number;
  elevatorDepth?: number;
  elevatorCount?: number;
  // Flats distribution from model
  flats?: Array<{
    id: number;
    name?: string;
    area?: number;
    isContractorShare?: boolean;
    flatType?: string;
    floorNumber?: number;
    description?: string;
  }>;
  roomType?: string;
  basementConfig?: Array<{
    id: string;
    type: 'commercial_shop' | 'residential' | 'shelter' | 'parking' | 'storage';
    count: number;
    description?: string;
  }>;
}

export type DrawingType = 'floor_plan' | 'facade_elevation' | 'ground_shop' | '3d_isometric';
export type StyleTheme = 'modern_architectural' | 'cad_blueprint' | 'colored_presentation';
export type AspectRatioType = '4:3' | '1:1' | '16:9';

interface ThemeColors {
  bg: string;
  gridLine: string;
  outerBorder: string;
  wallFill: string;
  wallStroke: string;
  innerWallStroke: string;
  columnFill: string;
  columnStroke: string;
  textPrimary: string;
  textSecondary: string;
  dimensionLine: string;
  dimensionText: string;
  axisBubbleFill: string;
  axisBubbleStroke: string;
  axisBubbleText: string;
  doorArc: string;
  windowGlass: string;
  stairStroke: string;
  elevatorCross: string;
  accent: string;
  accentBadge: string;
  accentBadgeText: string;
  roomFillLiving: string;
  roomFillKitchen: string;
  roomFillBed: string;
  roomFillBath: string;
  roomFillBalcony: string;
  roomFillCorridor: string;
  entranceCanopy: string;
  rampFill: string;
}

const THEMES: Record<StyleTheme, ThemeColors> = {
  cad_blueprint: {
    bg: '#081728',
    gridLine: 'rgba(56, 189, 248, 0.12)',
    outerBorder: '#38bdf8',
    wallFill: '#0e2b4d',
    wallStroke: '#38bdf8',
    innerWallStroke: '#7dd3fc',
    columnFill: '#0284c7',
    columnStroke: '#bae6fd',
    textPrimary: '#ffffff',
    textSecondary: '#7dd3fc',
    dimensionLine: '#38bdf8',
    dimensionText: '#ffffff',
    axisBubbleFill: '#0e2b4d',
    axisBubbleStroke: '#38bdf8',
    axisBubbleText: '#ffffff',
    doorArc: '#38bdf8',
    windowGlass: '#7dd3fc',
    stairStroke: '#38bdf8',
    elevatorCross: '#e0f2fe',
    accent: '#38bdf8',
    accentBadge: '#0284c7',
    accentBadgeText: '#ffffff',
    roomFillLiving: 'rgba(56, 189, 248, 0.08)',
    roomFillKitchen: 'rgba(125, 211, 252, 0.08)',
    roomFillBed: 'rgba(14, 165, 233, 0.08)',
    roomFillBath: 'rgba(186, 230, 253, 0.08)',
    roomFillBalcony: 'rgba(56, 189, 248, 0.15)',
    roomFillCorridor: 'rgba(15, 23, 42, 0.5)',
    entranceCanopy: 'rgba(56, 189, 248, 0.25)',
    rampFill: 'rgba(14, 165, 233, 0.2)',
  },
  modern_architectural: {
    bg: '#ffffff',
    gridLine: 'rgba(148, 163, 184, 0.2)',
    outerBorder: '#0f172a',
    wallFill: '#1e293b',
    wallStroke: '#0f172a',
    innerWallStroke: '#334155',
    columnFill: '#0f172a',
    columnStroke: '#020617',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    dimensionLine: '#0f172a',
    dimensionText: '#0f172a',
    axisBubbleFill: '#f8fafc',
    axisBubbleStroke: '#0f172a',
    axisBubbleText: '#0f172a',
    doorArc: '#64748b',
    windowGlass: '#0284c7',
    stairStroke: '#475569',
    elevatorCross: '#64748b',
    accent: '#4f46e5',
    accentBadge: '#4f46e5',
    accentBadgeText: '#ffffff',
    roomFillLiving: '#ffffff',
    roomFillKitchen: '#fafafa',
    roomFillBed: '#ffffff',
    roomFillBath: '#f8fafc',
    roomFillBalcony: '#f1f5f9',
    roomFillCorridor: '#f8fafc',
    entranceCanopy: 'rgba(79, 70, 229, 0.12)',
    rampFill: 'rgba(79, 70, 229, 0.08)',
  },
  colored_presentation: {
    bg: '#f8fafc',
    gridLine: 'rgba(203, 213, 225, 0.4)',
    outerBorder: '#1e293b',
    wallFill: '#334155',
    wallStroke: '#0f172a',
    innerWallStroke: '#475569',
    columnFill: '#1e293b',
    columnStroke: '#0f172a',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    dimensionLine: '#475569',
    dimensionText: '#0f172a',
    axisBubbleFill: '#ffffff',
    axisBubbleStroke: '#6366f1',
    axisBubbleText: '#4338ca',
    doorArc: '#b45309',
    windowGlass: '#38bdf8',
    stairStroke: '#64748b',
    elevatorCross: '#4f46e5',
    accent: '#d97706',
    accentBadge: '#d97706',
    accentBadgeText: '#ffffff',
    roomFillLiving: '#fef3c7',
    roomFillKitchen: '#e0f2fe',
    roomFillBed: '#fffbeb',
    roomFillBath: '#e0f7fa',
    roomFillBalcony: '#ecfdf5',
    roomFillCorridor: '#f1f5f9',
    entranceCanopy: 'rgba(217, 119, 6, 0.15)',
    rampFill: 'rgba(217, 119, 6, 0.1)',
  },
};

/**
 * Turkish Zoning Code (Planlı Alanlar İmar Yönetmeliği) & TS 9111 Recommendations
 */
export const TURKEY_ZONING_ENTRANCE_STANDARDS = {
  mainDoor: {
    title: 'Bina Ana Giriş Kapısı',
    regulationMin: 'Min. 1.50 m net',
    recommended: '1.80 m (1.20m + 0.60m Çift Kanat)',
    height: 'Min. 2.20 m net',
    codeRef: 'Planlı Alanlar İmar Yönetmeliği Madde 29',
    reason: 'Sedye, tekerlekli sandalye ve eşya taşınmasında çift kanatlı ferah geçiş şarttır.',
  },
  vestibule: {
    title: 'Rüzgarlık & Giriş Holü',
    regulationMin: 'Min. 2.20 m genişlik (4+ bağımsız bölüm)',
    recommended: '2.80 m × 2.40 m',
    depth: 'Min. 2.40 m tambur derinliği',
    codeRef: 'Planlı Alanlar İmar Yönetmeliği Madde 29 & 30',
    reason: 'Isı kaybını önleyici çift kapı tamburu, posta kutuları ve sedye manevra alanı.',
  },
  ramp: {
    title: 'Engelli Giriş Rampası (TS 9111)',
    regulationMin: 'Genişlik: Min. 1.20 m • Azami Eğim: %6.0',
    recommended: 'Genişlik: 1.50 m • Eğim: %5.0 (veya düzayak ±0.00 eşiksiz)',
    handrail: '70 cm ve 90 cm çift sıra paslanmaz küpeşte',
    codeRef: 'TS 9111 & İmar Yönetmeliği Madde 30',
    reason: 'İki tekerlekli sandalyenin karşılaşabileceği kesintisiz erişilebilirlik rotası.',
  },
  elevator: {
    title: 'Asansör Tesisi (TS EN 81-20/50)',
    regulationMin: '4+ katlı veya 10+ bağımsız bölümlü binalarda zorunlu',
    recommended: '10 Kişilik / 800 kg Sedye Tipi (Kuyu: 1.80m × 2.10m)',
    door: 'Net 90 cm teleskopik otomatik kapı',
    codeRef: 'Planlı Alanlar İmar Yönetmeliği Madde 34',
    reason: 'Acil durumlarda sağlık ekiplerinin sedye taşımasına elverişli kuyu ebatları.',
  },
  stair: {
    title: 'Ana & Yangın Merdiveni',
    regulationMin: 'Kol Genişliği: Min. 1.20 m (Yangın Yönetmeliği)',
    recommended: 'Kol Genişliği: 1.25 m - 1.30 m • Rıht: 16.5 cm • Basamak: 30 cm',
    fireDoor: '90 cm kendiliğinden kapanan duman sızdırmaz yangın kapısı',
    codeRef: 'Binaların Yangından Korunması Hakkında Yönetmelik',
    reason: 'Konforlu basamak geometrisi ve duman sızdırmaz güvenli kaçış rotası.',
  },
  meterShaft: {
    title: 'Tesisat & Sayaç Şaftı',
    regulationMin: 'Bağımsız kilitli yangına dayanıklı kabin',
    recommended: '60 cm × 120 cm Şaft (Giriş Holünde)',
    codeRef: 'İmar Yönetmeliği Madde 32',
    reason: 'Elektrik ve su sayaçlarının dışarıdan okunabilmesi ve yangın izolasyonu.',
  },
};

interface PolygonVertex {
  x: number;
  y: number;
}

interface CalculatedEdge {
  id: number;
  name: string;
  start: PolygonVertex;
  end: PolygonVertex;
  lengthM: number;
  angleDeg: number;
  midpoint: PolygonVertex;
  normal: { x: number; y: number };
  isEntrance: boolean;
}

/**
 * Resolves exact polygon vertices in real-world meters from projectData.
 */
function resolveMeterVertices(projectData: DrawingProjectData): PolygonVertex[] {
  // 1. If explicit polygon points are provided from model draw
  if (projectData.polygonPoints && Array.isArray(projectData.polygonPoints) && projectData.polygonPoints.length >= 3) {
    return projectData.polygonPoints.map((p) => ({
      x: typeof p.x === 'number' && !isNaN(p.x) ? p.x : 0,
      y: typeof p.y === 'number' && !isNaN(p.y) ? p.y : 0,
    }));
  }

  // 2. If customFacades provide 4 sides with skewed lengths
  const front = Math.max(2, projectData.facadeWidth || 14);
  const right = Math.max(2, projectData.facadeDepth || 18);
  const back = Math.max(2, projectData.backFacadeLength || projectData.customFacades?.[2]?.length || front);
  const left = Math.max(2, projectData.leftFacadeLength || projectData.customFacades?.[3]?.length || right);

  // Centered quadrilateral
  const halfF = front / 2;
  const halfB = back / 2;
  const halfR = right / 2;
  const halfL = left / 2;

  // Bottom is front (y = positive or negative depending on coords; let's place front at bottom)
  return [
    { x: -halfF, y: halfL },       // P1: Sol Ön
    { x: halfF, y: halfR },        // P2: Sağ Ön
    { x: halfB, y: -halfR },       // P3: Sağ Arka
    { x: -halfB, y: -halfL },      // P4: Sol Arka
  ];
}

/**
 * MAIN SVG DRAWING GENERATOR
 */
export function generateArchitecturalSvgDrawing(
  projectData: DrawingProjectData,
  drawingType: DrawingType = 'floor_plan',
  styleTheme: StyleTheme = 'modern_architectural',
  aspectRatio: AspectRatioType = '4:3'
): string {
  const colors = THEMES[styleTheme] || THEMES.modern_architectural;

  // Canvas Dimensions
  let width = 1200;
  let height = 900;
  if (aspectRatio === '1:1') {
    width = 1000;
    height = 1000;
  } else if (aspectRatio === '16:9') {
    width = 1280;
    height = 720;
  }

  const {
    facadeWidth = 14,
    facadeDepth = 18,
    floorCount = 5,
    flatsPerFloor = 2,
    hasGroundFloorShop = false,
    shopCount = 1,
    baseBuildArea,
  } = projectData;

  const totalFlats = floorCount * flatsPerFloor;
  const computedArea = baseBuildArea && baseBuildArea > 0 ? baseBuildArea : (facadeWidth * facadeDepth);

  // Drawing Switcher
  let drawingSvgContent = '';
  let drawingTitle = '';

  if (drawingType === 'floor_plan') {
    drawingTitle = `MİMARİ TİP KAT PLANI (KATTA ${flatsPerFloor} DAİRE)`;
    drawingSvgContent = renderFloorPlanSvg(projectData, colors, width, height);
  } else if (drawingType === 'facade_elevation') {
    drawingTitle = `ÖN CEPHE MİMARİ GÖRÜNÜŞ ÇİZİMİ (${floorCount} KATLI)`;
    drawingSvgContent = renderFacadeElevationSvg(projectData, colors, width, height);
  } else if (drawingType === 'ground_shop') {
    drawingTitle = `ZEMİN KAT TİCARİ VE KONUT GİRİŞ PLANI`;
    drawingSvgContent = renderGroundShopSvg(projectData, colors, width, height);
  } else {
    drawingTitle = `3D AKSONOMETRİK KESİT KAT PLANI`;
    drawingSvgContent = renderIsometricSvg(projectData, colors, width, height);
  }

  // Antet Box in bottom right
  const antetWidth = 360;
  const antetHeight = 96;
  const antetX = width - antetWidth - 25;
  const antetY = height - antetHeight - 25;
  const isDark = styleTheme === 'cad_blueprint';

  const titleBlock = `
    <!-- TECHNICAL TITLE BLOCK (ANTET) -->
    <g id="drawing-antet" transform="translate(${antetX}, ${antetY})">
      <rect width="${antetWidth}" height="${antetHeight}" fill="${isDark ? '#0d2238' : '#ffffff'}" stroke="${colors.outerBorder}" stroke-width="1.5" rx="4" />
      <line x1="0" y1="28" x2="${antetWidth}" y2="28" stroke="${colors.gridLine}" stroke-width="1" />
      <line x1="0" y1="62" x2="${antetWidth}" y2="62" stroke="${colors.gridLine}" stroke-width="1" />
      <line x1="${antetWidth * 0.52}" y1="28" x2="${antetWidth * 0.52}" y2="${antetHeight}" stroke="${colors.gridLine}" stroke-width="1" />

      <!-- Title -->
      <text x="12" y="19" font-family="monospace, sans-serif" font-size="11" font-weight="bold" fill="${colors.textPrimary}">
        AB YAPI • ${drawingTitle}
      </text>

      <!-- Row 2 left: Dimensions & Area -->
      <text x="12" y="44" font-family="sans-serif" font-size="10" fill="${colors.textSecondary}">
        ÖLÇÜ: <tspan font-weight="bold" fill="${colors.textPrimary}">${facadeWidth}m × ${facadeDepth}m (~${computedArea.toFixed(1)} m²)</tspan>
      </text>
      <text x="12" y="56" font-family="sans-serif" font-size="9" fill="${colors.textSecondary}">
        MEVZUAT: <tspan font-weight="bold" fill="${colors.accent}">TS EN ISO 128 / TS 9111</tspan>
      </text>

      <!-- Row 2 right: Scale -->
      <text x="${antetWidth * 0.52 + 10}" y="44" font-family="sans-serif" font-size="10" fill="${colors.textSecondary}">
        ÖLÇEK: <tspan font-weight="bold" fill="${colors.textPrimary}">1/50 - 1/100</tspan>
      </text>
      <text x="${antetWidth * 0.52 + 10}" y="56" font-family="sans-serif" font-size="9" fill="${colors.textSecondary}">
        KOT: <tspan font-weight="bold" fill="${colors.textPrimary}">±0.00 / +2.90m</tspan>
      </text>

      <!-- Row 3 left: Flats & Floors -->
      <text x="12" y="80" font-family="sans-serif" font-size="10" fill="${colors.textSecondary}">
        PROGRAM: <tspan font-weight="bold" fill="${colors.textPrimary}">${floorCount} Kat (${flatsPerFloor} Daire/Kat - Top: ${totalFlats})</tspan>
      </text>

      <!-- Row 3 right: Engine -->
      <text x="${antetWidth * 0.52 + 10}" y="80" font-family="sans-serif" font-size="9" fill="${colors.textSecondary}">
        MOTOR: <tspan font-weight="bold" fill="${colors.accent}">Hassas Vektör CAD</tspan>
      </text>
    </g>
  `;

  // North Arrow Indicator in top right
  const northArrow = `
    <!-- NORTH ARROW -->
    <g id="north-arrow" transform="translate(${width - 65}, 50)">
      <circle cx="0" cy="0" r="20" fill="${isDark ? '#0b1f33' : '#ffffff'}" stroke="${colors.dimensionLine}" stroke-width="1.2" />
      <path d="M 0 -16 L 6 10 L 0 4 L -6 10 Z" fill="${colors.accent}" />
      <text x="0" y="-20" font-family="sans-serif" font-size="10" font-weight="bold" fill="${colors.textPrimary}" text-anchor="middle">K</text>
      <text x="0" y="2" font-family="sans-serif" font-size="7" font-weight="bold" fill="${isDark ? '#ffffff' : '#000000'}" text-anchor="middle">N</text>
      <text x="0" y="14" font-family="sans-serif" font-size="6" fill="${colors.textSecondary}" text-anchor="middle">KUZEY</text>
    </g>
  `;

  // CAD Drafting Grid Pattern
  const gridPattern = `
    <pattern id="cad-grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${colors.gridLine}" stroke-width="0.75" />
    </pattern>
  `;

  const rawSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    ${gridPattern}
    <style>
      .dim-text { font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: bold; }
      .room-label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; text-anchor: middle; }
      .room-sub { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9px; font-weight: 500; text-anchor: middle; }
      .axis-label { font-family: sans-serif; font-size: 11px; font-weight: 800; text-anchor: middle; dominant-baseline: central; }
      .tag-badge { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 8px; font-weight: bold; }
    </style>
  </defs>

  <!-- BACKGROUND -->
  <rect width="${width}" height="${height}" fill="${colors.bg}" />
  <rect width="${width}" height="${height}" fill="url(#cad-grid)" />

  <!-- DRAWING OUTER BORDER -->
  <rect x="15" y="15" width="${width - 30}" height="${height - 30}" fill="none" stroke="${colors.outerBorder}" stroke-width="1.5" />
  <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="none" stroke="${colors.outerBorder}" stroke-width="0.5" stroke-dasharray="4,2" />

  <!-- MAIN ARCHITECTURAL DRAWING -->
  ${drawingSvgContent}

  <!-- TITLE BLOCK & COMPASS -->
  ${titleBlock}
  ${northArrow}
</svg>`;

  return rawSvg.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');
}

/**
 * 2D FLOOR PLAN RENDERER - FULLY GEOMETRIC & REGULATION COMPLIANT
 */
function renderFloorPlanSvg(
  projectData: DrawingProjectData,
  colors: ThemeColors,
  canvasW: number,
  canvasH: number
): string {
  const {
    facadeWidth = 14,
    facadeDepth = 18,
    flatsPerFloor = 2,
    mainEntranceFacadeIndex = 0,
    stairWidth = 2.4,
    elevatorWidth = 1.8,
    elevatorDepth = 2.1,
    elevatorCount = 1,
    customFacades = [],
    flats = [],
  } = projectData;

  // 1. Resolve exact meter vertices
  const meterVertices = resolveMeterVertices(projectData);
  const n = meterVertices.length;

  // Calculate bounding box in meters
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const v of meterVertices) {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
  }
  const spanXM = Math.max(1, maxX - minX);
  const spanYM = Math.max(1, maxY - minY);
  const centerXM = (minX + maxX) / 2;
  const centerYM = (minY + maxY) / 2;

  // Canvas drawing boundaries
  const maxDrawW = canvasW - 320;
  const maxDrawH = canvasH - 240;
  const scale = Math.min(maxDrawW / spanXM, maxDrawH / spanYM);

  const canvasCenterX = canvasW / 2;
  const canvasCenterY = (canvasH - 20) / 2;

  // Function to convert meter coordinate to SVG pixel coordinate
  const toSvg = (m: PolygonVertex): PolygonVertex => ({
    x: Math.round((canvasCenterX + (m.x - centerXM) * scale) * 10) / 10,
    y: Math.round((canvasCenterY + (m.y - centerYM) * scale) * 10) / 10,
  });

  const svgVertices = meterVertices.map(toSvg);

  // 2. Compute edges in SVG and meters
  const edges: CalculatedEdge[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const p1 = svgVertices[i];
    const p2 = svgVertices[j];
    const m1 = meterVertices[i];
    const m2 = meterVertices[j];
    const mdx = m2.x - m1.x;
    const mdy = m2.y - m1.y;
    const lenM = Math.round(Math.sqrt(mdx * mdx + mdy * mdy) * 10) / 10;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    // Outward normal vector (pointing out from clockwise or standard oriented polygon)
    const nx = dy / len;
    const ny = -dx / len;

    const customName = customFacades?.[i]?.name || `${i + 1}. Cephe`;

    edges.push({
      id: i + 1,
      name: customName,
      start: p1,
      end: p2,
      lengthM: lenM,
      angleDeg: Math.round(angle),
      midpoint: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
      normal: { x: nx, y: ny },
      isEntrance: i === (mainEntranceFacadeIndex % n),
    });
  }

  // Selected Entrance Edge
  const entranceEdge = edges[mainEntranceFacadeIndex % n] || edges[0];

  let content = '';

  // 3. Technical Turkish Zoning Regulation Standards Table (Upper Left)
  content += renderZoningStandardsTable(35, 35, colors);

  // 4. Draw Exterior Dimension Strings for all edges
  edges.forEach((edge) => {
    const offsetDist = edge.isEntrance ? 40 : 28;
    const p1Offset = {
      x: edge.start.x + edge.normal.x * offsetDist,
      y: edge.start.y + edge.normal.y * offsetDist,
    };
    const p2Offset = {
      x: edge.end.x + edge.normal.x * offsetDist,
      y: edge.end.y + edge.normal.y * offsetDist,
    };

    const isNearHorizontal = Math.abs(edge.end.y - edge.start.y) < Math.abs(edge.end.x - edge.start.x);

    content += `
      <!-- Edge ${edge.id} Dimension Line -->
      <g id="dim-edge-${edge.id}">
        <!-- Leader lines from corners -->
        <line x1="${edge.start.x}" y1="${edge.start.y}" x2="${p1Offset.x}" y2="${p1Offset.y}" stroke="${colors.gridLine}" stroke-width="0.8" />
        <line x1="${edge.end.x}" y1="${edge.end.y}" x2="${p2Offset.x}" y2="${p2Offset.y}" stroke="${colors.gridLine}" stroke-width="0.8" />

        <!-- Dimension line -->
        <line x1="${p1Offset.x}" y1="${p1Offset.y}" x2="${p2Offset.x}" y2="${p2Offset.y}" stroke="${edge.isEntrance ? colors.accent : colors.dimensionLine}" stroke-width="1.2" />

        <!-- Tick marks -->
        <circle cx="${p1Offset.x}" cy="${p1Offset.y}" r="2" fill="${edge.isEntrance ? colors.accent : colors.dimensionLine}" />
        <circle cx="${p2Offset.x}" cy="${p2Offset.y}" r="2" fill="${edge.isEntrance ? colors.accent : colors.dimensionLine}" />

        <!-- Dimension label with badge -->
        <rect x="${(p1Offset.x + p2Offset.x) / 2 - (edge.isEntrance ? 55 : 40)}" y="${(p1Offset.y + p2Offset.y) / 2 - 9}" width="${edge.isEntrance ? 110 : 80}" height="18" fill="${colors.bg}" stroke="${edge.isEntrance ? colors.accent : 'none'}" stroke-width="1" rx="3" />
        <text x="${(p1Offset.x + p2Offset.x) / 2}" y="${(p1Offset.y + p2Offset.y) / 2 + 4}" class="dim-text" font-size="10" fill="${edge.isEntrance ? colors.accent : colors.dimensionText}" text-anchor="middle">
          ${edge.lengthM.toFixed(2)} m ${edge.isEntrance ? '★ GİRİŞ' : ''}
        </text>
      </g>
    `;
  });

  // 5. Exterior Building Shell (Wall Polygon)
  const outerPointsStr = svgVertices.map((p) => `${p.x},${p.y}`).join(' ');

  // Calculate inner polygon by inset
  const wallPx = 8;
  const innerVertices = svgVertices.map((p, idx) => {
    // Vector towards center
    const dx = canvasCenterX - p.x;
    const dy = canvasCenterY - p.y;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    return {
      x: p.x + (dx / dist) * wallPx,
      y: p.y + (dy / dist) * wallPx,
    };
  });
  const innerPointsStr = innerVertices.map((p) => `${p.x},${p.y}`).join(' ');

  content += `
    <!-- Building Perimeter Outer Wall -->
    <polygon points="${outerPointsStr}" fill="${colors.wallFill}" stroke="${colors.wallStroke}" stroke-width="2.5" />
    <!-- Building Inner Usable Boundary -->
    <polygon points="${innerPointsStr}" fill="${colors.bg}" stroke="${colors.innerWallStroke}" stroke-width="1.2" />
  `;

  // 6. Corner Vertex Nodes & Labels (P1, P2, P3...)
  svgVertices.forEach((v, idx) => {
    content += `
      <g id="corner-node-${idx + 1}">
        <circle cx="${v.x}" cy="${v.y}" r="4" fill="${colors.accent}" stroke="${colors.outerBorder}" stroke-width="1" />
        <text x="${v.x + 8}" y="${v.y - 8}" font-family="sans-serif" font-size="9" font-weight="bold" fill="${colors.textPrimary}">P${idx + 1}</text>
      </g>
    `;
  });

  // 7. BİNA GİRİŞİ, GİRİŞ SAÇAĞI, RAMPASI & RÜZGARLIĞI ON THE SELECTED ENTRANCE FACADE
  content += renderBuildingEntranceComplex(entranceEdge, colors, scale);

  // 8. CENTRAL CIRCULATION CORE (Staircase, Stretcher Elevator & Floor Corridor)
  // Compute core location oriented toward entrance or central
  const coreWidthPx = Math.max(120, Math.min(220, (stairWidth + elevatorWidth) * scale));
  const coreDepthPx = Math.max(100, Math.min(180, Math.max(elevatorDepth, 2.4) * scale));

  // Position core slightly inward from the entrance edge or centered
  const corePos = {
    x: canvasCenterX - coreWidthPx / 2,
    y: canvasCenterY - coreDepthPx / 2,
  };

  content += renderCirculationCore(corePos.x, corePos.y, coreWidthPx, coreDepthPx, projectData, colors);

  // 9. APARTMENT PARTITIONING & ROOM DISTRIBUTION
  content += renderApartmentsDistribution(
    innerVertices,
    corePos.x,
    corePos.y,
    coreWidthPx,
    coreDepthPx,
    projectData,
    colors
  );

  return content;
}

/**
 * Renders the Building Main Entrance Portal, Canopy, TS 9111 Ramp, and Vestibule
 */
function renderBuildingEntranceComplex(
  entranceEdge: CalculatedEdge,
  colors: ThemeColors,
  scale: number
): string {
  const mid = entranceEdge.midpoint;
  const nx = entranceEdge.normal.x;
  const ny = entranceEdge.normal.y;

  // Tangent vector along edge
  const tx = -ny;
  const ty = nx;

  // Canopy dimensions (2.20 m konsol saçak, 4.0 m genişlik)
  const canopyDepthPx = Math.max(28, 2.2 * scale);
  const canopyWidthPx = Math.max(70, 4.0 * scale);

  const cP1 = { x: mid.x - tx * (canopyWidthPx / 2), y: mid.y - ty * (canopyWidthPx / 2) };
  const cP2 = { x: mid.x + tx * (canopyWidthPx / 2), y: mid.y + ty * (canopyWidthPx / 2) };
  const cP3 = { x: cP2.x + nx * canopyDepthPx, y: cP2.y + ny * canopyDepthPx };
  const cP4 = { x: cP1.x + nx * canopyDepthPx, y: cP1.y + ny * canopyDepthPx };

  // Door opening (1.80 m çift kanat kapı)
  const doorWidthPx = Math.max(34, 1.8 * scale);
  const doorLeaf1 = doorWidthPx * 0.67; // 1.20 m ana kanat
  const doorLeaf2 = doorWidthPx * 0.33; // 0.60 m yavru kanat

  const dStart = { x: mid.x - tx * (doorWidthPx / 2), y: mid.y - ty * (doorWidthPx / 2) };
  const dEnd = { x: mid.x + tx * (doorWidthPx / 2), y: mid.y + ty * (doorWidthPx / 2) };

  // TS 9111 Accessibility Ramp (Width 1.50 m, Slope %5)
  const rampWidthPx = Math.max(26, 1.5 * scale);
  const rampLengthPx = Math.max(50, 3.5 * scale);
  const rampStart = { x: cP2.x + tx * 6, y: cP2.y + ty * 6 };
  const rampP1 = rampStart;
  const rampP2 = { x: rampStart.x + tx * rampWidthPx, y: rampStart.y + ty * rampWidthPx };
  const rampP3 = { x: rampP2.x + nx * rampLengthPx, y: rampP2.y + ny * rampLengthPx };
  const rampP4 = { x: rampP1.x + nx * rampLengthPx, y: rampP1.y + ny * rampLengthPx };

  return `
    <!-- MAIN BUILDING ENTRANCE ON SELECTED FACADE: ${entranceEdge.name} -->
    <g id="main-building-entrance">
      <!-- 1. Architectural Entrance Canopy (Saçak / Markiz) -->
      <polygon points="${cP1.x},${cP1.y} ${cP2.x},${cP2.y} ${cP3.x},${cP3.y} ${cP4.x},${cP4.y}" fill="${colors.entranceCanopy}" stroke="${colors.accent}" stroke-width="2" />
      <line x1="${(cP3.x + cP4.x) / 2}" y1="${(cP3.y + cP4.y) / 2}" x2="${mid.x}" y2="${mid.y}" stroke="${colors.accent}" stroke-width="1" stroke-dasharray="3,3" />
      <text x="${(cP3.x + cP4.x) / 2 + nx * 14}" y="${(cP3.y + cP4.y) / 2 + ny * 14}" class="room-sub" font-size="8" font-weight="bold" fill="${colors.accent}">
        GİRİŞ SAÇAĞI & MARKİZ (2.20 m Konsol)
      </text>

      <!-- 2. TS 9111 Engelli Rampası (Slope %5, Width 1.50 m) -->
      <polygon points="${rampP1.x},${rampP1.y} ${rampP2.x},${rampP2.y} ${rampP3.x},${rampP3.y} ${rampP4.x},${rampP4.y}" fill="${colors.rampFill}" stroke="${colors.accent}" stroke-width="1.5" />
      <!-- Ramp slope directional arrow -->
      <line x1="${(rampP3.x + rampP4.x) / 2}" y1="${(rampP3.y + rampP4.y) / 2}" x2="${(rampP1.x + rampP2.x) / 2}" y2="${(rampP1.y + rampP2.y) / 2}" stroke="${colors.accent}" stroke-width="1.5" />
      <!-- Stainless steel handrails -->
      <line x1="${rampP1.x}" y1="${rampP1.y}" x2="${rampP4.x}" y2="${rampP4.y}" stroke="${colors.textPrimary}" stroke-width="2" />
      <line x1="${rampP2.x}" y1="${rampP2.y}" x2="${rampP3.x}" y2="${rampP3.y}" stroke="${colors.textPrimary}" stroke-width="2" />
      <text x="${(rampP3.x + rampP4.x) / 2 + nx * 10}" y="${(rampP3.y + rampP4.y) / 2 + ny * 10}" class="room-sub" font-size="7" fill="${colors.accent}">
        TS 9111 ENGELLİ RAMPASI (EĞİM: %5 - 1.50m)
      </text>

      <!-- 3. Entrance Steps (Subasman Basamakları: ±0.00 / +0.45m) -->
      <line x1="${cP1.x}" y1="${cP1.y + ny * 8}" x2="${cP2.x}" y2="${cP2.y + ny * 8}" stroke="${colors.stairStroke}" stroke-width="1" />
      <line x1="${cP1.x}" y1="${cP1.y + ny * 16}" x2="${cP2.x}" y2="${cP2.y + ny * 16}" stroke="${colors.stairStroke}" stroke-width="1" />
      <text x="${mid.x + nx * 18}" y="${mid.y + ny * 18}" class="room-sub" font-size="7" fill="${colors.textSecondary}">
        ±0.00 / +0.45m KOTU
      </text>

      <!-- 4. Double-Leaf Main Entrance Door (1.80m Çift Kanat Kapı) -->
      <!-- Door opening cutout in exterior wall -->
      <line x1="${dStart.x}" y1="${dStart.y}" x2="${dEnd.x}" y2="${dEnd.y}" stroke="${colors.bg}" stroke-width="10" />
      <!-- Door Leaf 1 (1.20 m Ana Kanat) with swing arc -->
      <line x1="${dStart.x}" y1="${dStart.y}" x2="${dStart.x - ny * doorLeaf1 * 0.8}" y2="${dStart.y + nx * doorLeaf1 * 0.8}" stroke="${colors.accent}" stroke-width="2" />
      <!-- Door Leaf 2 (0.60 m Yavru Kanat) with swing arc -->
      <line x1="${dEnd.x}" y1="${dEnd.y}" x2="${dEnd.x - ny * doorLeaf2 * 0.8}" y2="${dEnd.y + nx * doorLeaf2 * 0.8}" stroke="${colors.accent}" stroke-width="1.8" />
      <!-- Swing arcs -->
      <path d="M ${dStart.x} ${dStart.y} A ${doorLeaf1} ${doorLeaf1} 0 0 0 ${dStart.x - ny * doorLeaf1 * 0.8} ${dStart.y + nx * doorLeaf1 * 0.8}" fill="none" stroke="${colors.doorArc}" stroke-width="1" stroke-dasharray="2,2" />

      <!-- 5. Entrance Vestibule & Windbreak (Rüzgarlık Holü 2.80m x 2.40m) -->
      <g id="entrance-vestibule">
        <rect x="${mid.x - 35}" y="${mid.y - ny * 35 - 15}" width="70" height="30" fill="${colors.roomFillCorridor}" stroke="${colors.innerWallStroke}" stroke-width="1" rx="2" />
        <text x="${mid.x}" y="${mid.y - ny * 35}" class="room-label" font-size="8" fill="${colors.textPrimary}">
          RÜZGARLIK & GİRİŞ HOLÜ
        </text>
        <text x="${mid.x}" y="${mid.y - ny * 35 + 10}" class="room-sub" font-size="7" fill="${colors.textSecondary}">
          Posta Kutuları • Diyafon • Paspas
        </text>
      </g>
    </g>
  `;
}

/**
 * Circulation Core (Reinforced Concrete Staircase, Stretcher Elevator, Kat Holü)
 */
function renderCirculationCore(
  coreX: number,
  coreY: number,
  coreW: number,
  coreH: number,
  projectData: DrawingProjectData,
  colors: ThemeColors
): string {
  const { elevatorCount = 1, flatsPerFloor = 2 } = projectData;

  const stairW = coreW * 0.54;
  const elevW = (coreW * 0.46) / Math.max(1, elevatorCount);

  let elevatorShafts = '';
  for (let e = 0; e < elevatorCount; e++) {
    const ex = coreX + e * elevW;
    const isStretcher = e === 0;
    elevatorShafts += `
      <!-- Elevator Shaft ${e + 1} -->
      <g id="elevator-shaft-${e + 1}">
        <rect x="${ex}" y="${coreY}" width="${elevW}" height="${coreH * 0.65}" fill="${colors.wallFill}" stroke="${colors.innerWallStroke}" stroke-width="1.5" />
        <!-- Diagonal crossing lines -->
        <line x1="${ex}" y1="${coreY}" x2="${ex + elevW}" y2="${coreY + coreH * 0.65}" stroke="${colors.elevatorCross}" stroke-width="1" />
        <line x1="${ex}" y1="${coreY + coreH * 0.65}" x2="${ex + elevW}" y2="${coreY}" stroke="${colors.elevatorCross}" stroke-width="1" />
        <!-- Label & Capacity -->
        <text x="${ex + elevW / 2}" y="${coreY + coreH * 0.28}" class="room-sub" font-weight="bold" fill="${colors.textPrimary}">ASANSÖR ${elevatorCount > 1 ? `#${e + 1}` : ''}</text>
        <text x="${ex + elevW / 2}" y="${coreY + coreH * 0.42}" class="room-sub" font-size="7" fill="${colors.textSecondary}">
          ${isStretcher ? '800 kg / 10 KİŞİ' : '630 kg / 8 KİŞİ'}
        </text>
        <text x="${ex + elevW / 2}" y="${coreY + coreH * 0.54}" class="tag-badge" font-size="6" fill="${colors.accent}">
          ${isStretcher ? 'SEDYE & TS EN 81-20' : 'STANDART KABİN'}
        </text>
      </g>
    `;
  }

  return `
    <!-- REINFORCED CONCRETE CIRCULATION CORE -->
    <g id="circulation-core">
      <!-- Outer Core Walls -->
      <rect x="${coreX}" y="${coreY}" width="${coreW}" height="${coreH}" fill="${colors.roomFillCorridor}" stroke="${colors.wallStroke}" stroke-width="2" />

      <!-- Elevator Shaft(s) -->
      ${elevatorShafts}

      <!-- Reinforced Concrete Staircase (Yangın ve Ana Merdiven) -->
      <g id="staircase-core">
        <rect x="${coreX + coreW * 0.46}" y="${coreY}" width="${stairW}" height="${coreH * 0.72}" fill="${colors.bg}" stroke="${colors.innerWallStroke}" stroke-width="1.5" />
        <!-- Stair Treads -->
        ${Array.from({ length: 9 })
          .map((_, i) => {
            const stepY = coreY + (i + 1) * ((coreH * 0.72) / 10);
            return `<line x1="${coreX + coreW * 0.46}" y1="${stepY}" x2="${coreX + coreW}" y2="${stepY}" stroke="${colors.stairStroke}" stroke-width="1" />`;
          })
          .join('')}
        <!-- Intermediate landing (Sahanlık) -->
        <line x1="${coreX + coreW * 0.46 + stairW / 2}" y1="${coreY}" x2="${coreX + coreW * 0.46 + stairW / 2}" y2="${coreY + coreH * 0.72}" stroke="${colors.innerWallStroke}" stroke-width="1.2" />
        <!-- Directional exit flight arrow -->
        <line x1="${coreX + coreW * 0.46 + stairW * 0.25}" y1="${coreY + coreH * 0.65}" x2="${coreX + coreW * 0.46 + stairW * 0.25}" y2="${coreY + 12}" stroke="${colors.accent}" stroke-width="1.5" />
        <polygon points="${coreX + coreW * 0.46 + stairW * 0.25},${coreY + 8} ${coreX + coreW * 0.46 + stairW * 0.25 - 4},${coreY + 16} ${coreX + coreW * 0.46 + stairW * 0.25 + 4},${coreY + 16}" fill="${colors.accent}" />
        <text x="${coreX + coreW * 0.46 + stairW / 2}" y="${coreY + coreH * 0.85}" class="room-sub" font-size="8" fill="${colors.textSecondary}">
          YANGIN & ANA MERDİVEN (Kol: 1.25m)
        </text>
      </g>

      <!-- Central Floor Lobby (Kat Holü & Sayaç Şaftı) -->
      <g id="floor-lobby">
        <text x="${coreX + coreW / 2}" y="${coreY + coreH - 10}" class="room-label" font-size="9" fill="${colors.textPrimary}">
          KAT HOLÜ (Genişlik: 2.20 m) • SAYAÇ ŞAFTI
        </text>
      </g>
    </g>
  `;
}

/**
 * Renders Apartment Partitioning according to flatsPerFloor & flats model data
 */
/**
 * ARCHITECTURAL SYMBOL & COMPONENT GENERATORS (DOORS, FIXTURES, FURNITURE)
 */

// Draw an architectural door with 90° swing arc
function drawArchDoor(
  hingeX: number,
  hingeY: number,
  leafLength: number,
  baseAngleDeg: number, // 0: right, 90: down, 180: left, 270: up
  swingClockwise: boolean,
  color: string,
  arcColor: string,
  label?: string
): string {
  const rad = (baseAngleDeg * Math.PI) / 180;
  const swingAngleDeg = swingClockwise ? baseAngleDeg + 90 : baseAngleDeg - 90;
  const swingRad = (swingAngleDeg * Math.PI) / 180;

  // Door leaf end
  const leafEndX = hingeX + Math.cos(swingRad) * leafLength;
  const leafEndY = hingeY + Math.sin(swingRad) * leafLength;

  // Arc end point (where the door swings from)
  const arcStartX = hingeX + Math.cos(rad) * leafLength;
  const arcStartY = hingeY + Math.sin(rad) * leafLength;

  const sweepFlag = swingClockwise ? 1 : 0;

  let out = `
    <!-- Door at (${hingeX.toFixed(1)}, ${hingeY.toFixed(1)}) -->
    <g class="arch-door">
      <!-- Door opening clear gap -->
      <line x1="${hingeX}" y1="${hingeY}" x2="${arcStartX}" y2="${arcStartY}" stroke="rgba(255,255,255,0.05)" stroke-width="6" />
      <!-- Door swing arc -->
      <path d="M ${arcStartX.toFixed(1)} ${arcStartY.toFixed(1)} A ${leafLength} ${leafLength} 0 0 ${sweepFlag} ${leafEndX.toFixed(1)} ${leafEndY.toFixed(1)}" fill="none" stroke="${arcColor}" stroke-width="0.85" stroke-dasharray="2,2" />
      <!-- Door leaf -->
      <line x1="${hingeX.toFixed(1)}" y1="${hingeY.toFixed(1)}" x2="${leafEndX.toFixed(1)}" y2="${leafEndY.toFixed(1)}" stroke="${color}" stroke-width="1.6" stroke-linecap="round" />
      <!-- Hinge pivot dot -->
      <circle cx="${hingeX.toFixed(1)}" cy="${hingeY.toFixed(1)}" r="1.5" fill="${color}" />
  `;

  if (label) {
    const labelX = (hingeX + leafEndX) / 2;
    const labelY = (hingeY + leafEndY) / 2;
    out += `<text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" class="room-sub" font-size="6" fill="${color}">${label}</text>`;
  }

  out += `</g>`;
  return out;
}

// Draw a reinforced steel entrance door with prominent security frame
function drawSteelEntranceDoor(
  hingeX: number,
  hingeY: number,
  leafLength: number,
  baseAngleDeg: number,
  swingClockwise: boolean,
  colors: ThemeColors,
  flatCode: string
): string {
  const rad = (baseAngleDeg * Math.PI) / 180;
  const swingAngleDeg = swingClockwise ? baseAngleDeg + 90 : baseAngleDeg - 90;
  const swingRad = (swingAngleDeg * Math.PI) / 180;

  const leafEndX = hingeX + Math.cos(swingRad) * leafLength;
  const leafEndY = hingeY + Math.sin(swingRad) * leafLength;
  const arcStartX = hingeX + Math.cos(rad) * leafLength;
  const arcStartY = hingeY + Math.sin(rad) * leafLength;
  const sweepFlag = swingClockwise ? 1 : 0;

  return `
    <!-- Steel Entrance Door [${flatCode}] -->
    <g class="steel-entrance-door">
      <path d="M ${arcStartX.toFixed(1)} ${arcStartY.toFixed(1)} A ${leafLength} ${leafLength} 0 0 ${sweepFlag} ${leafEndX.toFixed(1)} ${leafEndY.toFixed(1)}" fill="none" stroke="${colors.accent}" stroke-width="1.2" stroke-dasharray="3,2" />
      <!-- Steel blade -->
      <line x1="${hingeX.toFixed(1)}" y1="${hingeY.toFixed(1)}" x2="${leafEndX.toFixed(1)}" y2="${leafEndY.toFixed(1)}" stroke="${colors.accent}" stroke-width="2.8" stroke-linecap="square" />
      <!-- Handle and rosette -->
      <circle cx="${hingeX.toFixed(1)}" cy="${hingeY.toFixed(1)}" r="2.5" fill="${colors.accent}" />
      <!-- Badge label -->
      <rect x="${((hingeX + leafEndX) / 2 - 24).toFixed(1)}" y="${((hingeY + leafEndY) / 2 - 12).toFixed(1)}" width="48" height="12" fill="${colors.bg}" stroke="${colors.accent}" stroke-width="0.8" rx="2" />
      <text x="${((hingeX + leafEndX) / 2).toFixed(1)}" y="${((hingeY + leafEndY) / 2 - 3).toFixed(1)}" font-family="sans-serif" font-size="7" font-weight="bold" fill="${colors.accent}" text-anchor="middle">
        ÇELİK KAPI [${flatCode}]
      </text>
    </g>
  `;
}

// Draw exterior window symbol
function drawWindowSymbol(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  wallColor: string,
  glassColor: string
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return `
    <g class="arch-window">
      <!-- Window cut out in wall -->
      <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${wallColor}" stroke-width="1.8" />
      <!-- Glass pane line -->
      <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${glassColor}" stroke-width="1.2" />
    </g>
  `;
}

// Draw Entrance Hall (Antre) & Cloakroom (Portmanto)
function drawEntranceFoyer(
  x: number,
  y: number,
  w: number,
  h: number,
  areaM2: number,
  colors: ThemeColors,
  isLeftFacing: boolean = true
): string {
  const portW = Math.min(w * 0.45, 38);
  const portH = Math.min(h * 0.7, 45);
  const portX = isLeftFacing ? x + 4 : x + w - portW - 4;
  const portY = y + 4;

  return `
    <g class="foyer-cloakroom">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${colors.roomFillCorridor}" stroke="${colors.innerWallStroke}" stroke-width="0.75" />
      <!-- Built-in Cloakroom (Portmanto / Vestiyer) -->
      <rect x="${portX.toFixed(1)}" y="${portY.toFixed(1)}" width="${portW.toFixed(1)}" height="${portH.toFixed(1)}" fill="${colors.bg}" stroke="${colors.accent}" stroke-width="1" rx="1.5" />
      <!-- Hanger rail line -->
      <line x1="${(portX + 4).toFixed(1)}" y1="${(portY + portH / 2).toFixed(1)}" x2="${(portX + portW - 4).toFixed(1)}" y2="${(portY + portH / 2).toFixed(1)}" stroke="${colors.textSecondary}" stroke-width="0.8" stroke-dasharray="2,2" />
      <text x="${(portX + portW / 2).toFixed(1)}" y="${(portY + portH / 2 - 4).toFixed(1)}" font-family="sans-serif" font-size="6.5" font-weight="bold" fill="${colors.accent}" text-anchor="middle">PORTMANTO</text>
      <text x="${(portX + portW / 2).toFixed(1)}" y="${(portY + portH / 2 + 7).toFixed(1)}" font-family="sans-serif" font-size="5.5" fill="${colors.textSecondary}" text-anchor="middle">Gömme Dolap</text>

      <!-- Foyer Area Label -->
      <text x="${(x + w / 2).toFixed(1)}" y="${(y + h - 6).toFixed(1)}" class="room-label" font-size="8" fill="${colors.textPrimary}">GİRİŞ ANTRE</text>
      <text x="${(x + w / 2).toFixed(1)}" y="${(y + h + 4).toFixed(1)}" class="room-sub" font-size="7" fill="${colors.textSecondary}">${areaM2.toFixed(1)} m²</text>
    </g>
  `;
}

// Draw Kitchen Counter, Sink, and Cooktop
function drawKitchenFixtures(
  x: number,
  y: number,
  w: number,
  h: number,
  colors: ThemeColors
): string {
  const counterDepth = Math.min(22, Math.min(w, h) * 0.35);
  const sinkW = 20;
  const sinkH = 12;

  return `
    <g class="kitchen-fixtures">
      <!-- L-Countertop along top and side -->
      <path d="M ${x + 2} ${y + 2} L ${x + w - 2} ${y + 2} L ${x + w - 2} ${y + counterDepth + 2} L ${x + counterDepth + 2} ${y + counterDepth + 2} L ${x + counterDepth + 2} ${y + h - 2} L ${x + 2} ${y + h - 2} Z" fill="${colors.roomFillKitchen}" stroke="${colors.innerWallStroke}" stroke-width="1" />
      
      <!-- Dual-Basin Sink (Evye) -->
      <rect x="${x + 6}" y="${y + 5}" width="${sinkW}" height="${sinkH}" fill="${colors.bg}" stroke="${colors.textSecondary}" stroke-width="0.8" rx="1" />
      <circle cx="${x + 11}" cy="${y + 11}" r="1.5" fill="${colors.accent}" />
      <circle cx="${x + 21}" cy="${y + 11}" r="1.5" fill="${colors.accent}" />

      <!-- 4-Burner Cooktop (Ocak) -->
      <rect x="${x + 30}" y="${y + 5}" width="${sinkW}" height="${sinkH}" fill="${colors.bg}" stroke="${colors.textSecondary}" stroke-width="0.8" rx="1" />
      <circle cx="${x + 34}" cy="${y + 8}" r="1.5" fill="${colors.wallStroke}" />
      <circle cx="${x + 44}" cy="${y + 8}" r="2" fill="${colors.wallStroke}" />
      <circle cx="${x + 34}" cy="${y + 14}" r="2" fill="${colors.wallStroke}" />
      <circle cx="${x + 44}" cy="${y + 14}" r="1.5" fill="${colors.wallStroke}" />

      <!-- Refrigerator niche (Buzdolabı [B]) -->
      <rect x="${x + 3}" y="${y + h - 22}" width="${counterDepth - 2}" height="18" fill="${colors.bg}" stroke="${colors.accent}" stroke-width="0.8" rx="1" />
      <text x="${x + counterDepth / 2 + 1}" y="${y + h - 10}" font-family="sans-serif" font-size="7" font-weight="bold" fill="${colors.accent}" text-anchor="middle">BUZDOLABI</text>
    </g>
  `;
}

// Draw Living Room Furniture (Sofa, Coffee Table, Dining Table with Chairs)
function drawLivingFurniture(
  x: number,
  y: number,
  w: number,
  h: number,
  colors: ThemeColors
): string {
  const sofaW = Math.min(w * 0.48, 55);
  const sofaH = Math.min(h * 0.35, 30);
  const tableW = Math.min(w * 0.35, 40);
  const tableH = Math.min(h * 0.28, 24);

  return `
    <g class="living-furniture">
      <!-- 3-Seater Sofa / L-Couch -->
      <g transform="translate(${x + 8}, ${y + 8})">
        <rect width="${sofaW}" height="${sofaH}" rx="3" fill="${colors.bg}" stroke="${colors.textSecondary}" stroke-width="0.9" />
        <!-- Backrest -->
        <rect x="0" y="0" width="${sofaW}" height="6" rx="1" fill="${colors.roomFillLiving}" stroke="${colors.textSecondary}" stroke-width="0.5" />
        <!-- Armrests -->
        <rect x="0" y="6" width="5" height="${sofaH - 6}" rx="1" fill="${colors.roomFillLiving}" stroke="${colors.textSecondary}" stroke-width="0.5" />
        <rect x="${sofaW - 5}" y="6" width="5" height="${sofaH - 6}" rx="1" fill="${colors.roomFillLiving}" stroke="${colors.textSecondary}" stroke-width="0.5" />
        <!-- Coffee Table (Orta Sehpa) -->
        <rect x="${sofaW * 0.2}" y="${sofaH + 4}" width="${sofaW * 0.6}" height="10" rx="2" fill="${colors.bg}" stroke="${colors.accent}" stroke-width="0.75" />
      </g>

      <!-- Dining Table & Chairs (Yemek Masası) -->
      <g transform="translate(${x + w - tableW - 8}, ${y + 8})">
        <rect width="${tableW}" height="${tableH}" rx="2" fill="${colors.bg}" stroke="${colors.textSecondary}" stroke-width="0.9" />
        <text x="${tableW / 2}" y="${tableH / 2 + 3}" font-family="sans-serif" font-size="6" fill="${colors.textSecondary}" text-anchor="middle">YEMEK</text>
        <!-- Chairs -->
        <rect x="4" y="-3" width="8" height="3" rx="0.5" fill="${colors.textSecondary}" />
        <rect x="${tableW - 12}" y="-3" width="8" height="3" rx="0.5" fill="${colors.textSecondary}" />
        <rect x="4" y="${tableH}" width="8" height="3" rx="0.5" fill="${colors.textSecondary}" />
        <rect x="${tableW - 12}" y="${tableH}" width="8" height="3" rx="0.5" fill="${colors.textSecondary}" />
      </g>
    </g>
  `;
}

// Draw Bedroom Furniture (Bed, Pillows, Nightstands, Wardrobe)
function drawBedroomFurniture(
  x: number,
  y: number,
  w: number,
  h: number,
  isMaster: boolean,
  colors: ThemeColors
): string {
  const bedW = isMaster ? Math.min(w * 0.45, 46) : Math.min(w * 0.35, 30);
  const bedH = isMaster ? Math.min(h * 0.55, 52) : Math.min(h * 0.5, 45);
  const bedX = x + (w - bedW) / 2;
  const bedY = y + 8;

  const wardH = Math.min(h * 0.7, 50);
  const wardW = 16;

  return `
    <g class="bedroom-furniture">
      <!-- Wardrobe (Gardırop) -->
      <g transform="translate(${x + 4}, ${y + 6})">
        <rect width="${wardW}" height="${wardH}" rx="1" fill="${colors.bg}" stroke="${colors.textSecondary}" stroke-width="0.9" />
        <line x1="0" y1="${wardH / 2}" x2="${wardW}" y2="${wardH / 2}" stroke="${colors.textSecondary}" stroke-width="0.6" stroke-dasharray="1,1" />
        <text x="${wardW / 2}" y="${wardH / 2 - 2}" font-family="sans-serif" font-size="5.5" fill="${colors.textSecondary}" text-anchor="middle">DOLAP</text>
      </g>

      <!-- Bed (Yatak) with Headboard & Pillows -->
      <g transform="translate(${bedX.toFixed(1)}, ${bedY.toFixed(1)})">
        <!-- Headboard -->
        <rect x="0" y="0" width="${bedW}" height="4" rx="1" fill="${colors.accent}" />
        <!-- Mattress -->
        <rect x="0" y="4" width="${bedW}" height="${bedH - 4}" rx="2" fill="${colors.bg}" stroke="${colors.textSecondary}" stroke-width="0.9" />
        <!-- Blanket fold line -->
        <line x1="0" y1="${bedH * 0.45}" x2="${bedW}" y2="${bedH * 0.45}" stroke="${colors.textSecondary}" stroke-width="0.6" stroke-dasharray="2,2" />
        <!-- Pillows (Yastıklar) -->
        ${
          isMaster
            ? `
          <rect x="3" y="6" width="${bedW * 0.42}" height="8" rx="1.5" fill="${colors.roomFillBed}" stroke="${colors.textSecondary}" stroke-width="0.6" />
          <rect x="${bedW * 0.52}" y="6" width="${bedW * 0.42}" height="8" rx="1.5" fill="${colors.roomFillBed}" stroke="${colors.textSecondary}" stroke-width="0.6" />
        `
            : `
          <rect x="4" y="6" width="${bedW - 8}" height="8" rx="1.5" fill="${colors.roomFillBed}" stroke="${colors.textSecondary}" stroke-width="0.6" />
        `
        }
      </g>

      <!-- Nightstands (Komodinler) -->
      ${
        isMaster
          ? `
        <rect x="${(bedX - 10).toFixed(1)}" y="${(bedY + 2).toFixed(1)}" width="8" height="8" rx="1" fill="${colors.bg}" stroke="${colors.textSecondary}" stroke-width="0.75" />
        <rect x="${(bedX + bedW + 2).toFixed(1)}" y="${(bedY + 2).toFixed(1)}" width="8" height="8" rx="1" fill="${colors.bg}" stroke="${colors.textSecondary}" stroke-width="0.75" />
      `
          : ''
      }
    </g>
  `;
}

// Draw Bathroom (Glass Shower, Wall-Hung WC, Vanity Sink, Plumbing Shaft)
function drawBathroomFixtures(
  x: number,
  y: number,
  w: number,
  h: number,
  colors: ThemeColors
): string {
  const showerSize = Math.min(26, Math.min(w, h) * 0.45);
  const shaftW = 14;
  const shaftH = 14;

  return `
    <g class="bathroom-fixtures">
      <!-- Background wet room tiling -->
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${colors.roomFillBath}" stroke="${colors.innerWallStroke}" stroke-width="1" />

      <!-- Glass Shower Cabin (Duşakabin) -->
      <rect x="${x + 2}" y="${y + 2}" width="${showerSize}" height="${showerSize}" fill="${colors.bg}" stroke="${colors.accent}" stroke-width="1" rx="2" />
      <line x1="${x + 2}" y1="${y + 2}" x2="${x + 2 + showerSize}" y2="${y + 2 + showerSize}" stroke="${colors.accent}" stroke-width="0.75" />
      <circle cx="${x + 2 + showerSize / 2}" cy="${y + 2 + showerSize / 2}" r="2" fill="${colors.accent}" />

      <!-- Wall-Hung Toilet (Asma Klozet & Gömme Rezervuar) -->
      <g transform="translate(${x + showerSize + 8}, ${y + 2})">
        <!-- Flush tank -->
        <rect width="14" height="4" fill="${colors.textSecondary}" rx="0.5" />
        <!-- Bowl -->
        <ellipse cx="7" cy="9" rx="5.5" ry="6" fill="${colors.bg}" stroke="${colors.textSecondary}" stroke-width="0.85" />
      </g>

      <!-- Vanity Sink (Lavabo Tezgahı) -->
      <g transform="translate(${x + w - 24}, ${y + 4})">
        <rect width="20" height="12" fill="${colors.bg}" stroke="${colors.textSecondary}" stroke-width="0.85" rx="1" />
        <ellipse cx="10" cy="6" rx="6" ry="4" fill="${colors.bg}" stroke="${colors.accent}" stroke-width="0.75" />
        <circle cx="10" cy="4" r="0.8" fill="${colors.accent}" />
      </g>

      <!-- MEP Plumbing Shaft (Tesisat & Havalık Şaftı) -->
      <g transform="translate(${x + 2}, ${y + h - shaftH - 2})">
        <rect width="${shaftW}" height="${shaftH}" fill="${colors.wallFill}" stroke="${colors.wallStroke}" stroke-width="1" />
        <line x1="0" y1="0" x2="${shaftW}" y2="${shaftH}" stroke="${colors.textSecondary}" stroke-width="0.7" />
        <line x1="0" y1="${shaftH}" x2="${shaftW}" y2="0" stroke="${colors.textSecondary}" stroke-width="0.7" />
        <text x="${shaftW / 2}" y="${shaftH / 2 + 2}" font-family="sans-serif" font-size="4.5" font-weight="bold" fill="#ffffff" text-anchor="middle">ŞAFT</text>
      </g>
    </g>
  `;
}

/**
 * Renders Apartment Partitioning according to flatsPerFloor, flatDistributionMode & flats model data
 * Fully detailed with internal room partitions, interior doors, swing arcs, entrance vestibule,
 * cloakroom (portmanto), kitchen counters, living room furniture, bedrooms, bathrooms, and balconies.
 */
function renderApartmentsDistribution(
  innerVertices: PolygonVertex[],
  coreX: number,
  coreY: number,
  coreW: number,
  coreH: number,
  projectData: DrawingProjectData,
  colors: ThemeColors
): string {
  const {
    flatsPerFloor = 2,
    flats = [],
    baseBuildArea,
    facadeWidth = 14,
    facadeDepth = 18,
    flatDistributionMode = 'equal',
  } = projectData;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const v of innerVertices) {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
  }

  const w = maxX - minX;
  const h = maxY - minY;
  const totalFloorArea = baseBuildArea && baseBuildArea > 0 ? baseBuildArea : facadeWidth * facadeDepth;
  const netResidentialFloorArea = totalFloorArea * 0.82; // Net usable apartment area excluding core

  let content = '';

  // 1. DISTRIBUTION STRATEGY BANNER AT TOP
  const modeBadge =
    flatDistributionMode === 'front_large'
      ? 'ÖN CEPHE AĞIRLIKLI DAĞILIM (Ön Daireler %30 3+1 • Arka Daireler %20 2+1/1+1)'
      : flatDistributionMode === 'asymmetric_master'
      ? 'ASİMETRİK DAĞILIM (1 Master Köşe Daire %40 • Diğerleri %20)'
      : flatDistributionMode === 'custom_proportions'
      ? 'ÖZEL METREKARE DAĞILIMI (Mülk Sahibi / Müteahhit Pay Oranları)'
      : `KAT ALANI EŞİT BÖLÜNMÜŞTÜR (Katta ${flatsPerFloor} Daire • %${Math.round(100 / Math.max(1, flatsPerFloor))}'şer Eşit Pay)`;

  content += `
    <!-- Flat Distribution Mode Banner -->
    <g id="flat-distribution-banner" transform="translate(${minX + 8}, ${minY - 24})">
      <rect width="${w - 16}" height="18" fill="${colors.bg}" stroke="${colors.accent}" stroke-width="1" rx="3" />
      <text x="${(w - 16) / 2}" y="12" font-family="sans-serif" font-size="9" font-weight="bold" fill="${colors.accent}" text-anchor="middle">
        ★ DAİRE DAĞITIM STRATEJİSİ: ${modeBadge}
      </text>
    </g>
  `;

  // -------------------------------------------------------------
  // CASE A: 4 FLATS PER FLOOR (KAT ALANI EŞİT Mİ, ÖN DAİRELER BÜYÜK MÜ?)
  // -------------------------------------------------------------
  if (flatsPerFloor >= 4) {
    // Determine split lines based on flatDistributionMode:
    // If 'front_large': Front flats take 58% of depth, Rear flats take 42%
    // If 'equal': Exactly 50% / 50%
    // If 'asymmetric_master': D1 takes 58% width and 58% depth (~40% area)
    let frontDepthRatio = 0.5;
    let frontLeftWidthRatio = 0.5;
    let isFrontLarge = false;

    if (flatDistributionMode === 'front_large') {
      frontDepthRatio = 0.58; // Front flats are 30% area each, rear are 20% each
      isFrontLarge = true;
    } else if (flatDistributionMode === 'asymmetric_master') {
      frontDepthRatio = 0.58;
      frontLeftWidthRatio = 0.6;
    }

    const splitY = minY + h * frontDepthRatio;
    const splitX = minX + w * frontLeftWidthRatio;

    // Flats metadata
    const f1 = flats[0];
    const f2 = flats[1];
    const f3 = flats[2];
    const f4 = flats[3];

    // Net area calculations
    let area1 = Math.round(netResidentialFloorArea * (isFrontLarge ? 0.3 : 0.25));
    let area2 = Math.round(netResidentialFloorArea * (isFrontLarge ? 0.3 : 0.25));
    let area3 = Math.round(netResidentialFloorArea * (isFrontLarge ? 0.2 : 0.25));
    let area4 = Math.round(netResidentialFloorArea * (isFrontLarge ? 0.2 : 0.25));

    if (flatDistributionMode === 'asymmetric_master') {
      area1 = Math.round(netResidentialFloorArea * 0.4);
      area2 = Math.round(netResidentialFloorArea * 0.2);
      area3 = Math.round(netResidentialFloorArea * 0.2);
      area4 = Math.round(netResidentialFloorArea * 0.2);
    } else if (flatDistributionMode === 'custom_proportions' && f1?.area) {
      area1 = f1.area;
      area2 = f2?.area || area2;
      area3 = f3?.area || area3;
      area4 = f4?.area || area4;
    }

    // Quadrant 1: DAİRE 1 - ÖN SOL (Front-Left)
    const q1X = minX + 6;
    const q1Y = minY + 6;
    const q1W = splitX - minX - 10;
    const q1H = splitY - minY - 10;
    content += renderDetailedFlatQuadrant({
      flatId: 1,
      flatCode: 'D1',
      title: f1?.name || (isFrontLarge ? '1. Daire (Ön Sol 3+1 Geniş)' : '1. Daire (Ön Sol 2+1)'),
      areaM2: area1,
      isContractor: !!f1?.isContractorShare,
      isLarge: isFrontLarge || flatDistributionMode === 'asymmetric_master',
      box: { x: q1X, y: q1Y, w: q1W, h: q1H },
      coreEdge: { x: coreX, y: coreY },
      quadrant: 'front_left',
      colors,
    });

    // Quadrant 2: DAİRE 2 - ÖN SAĞ (Front-Right)
    const q2X = splitX + 4;
    const q2Y = minY + 6;
    const q2W = maxX - splitX - 10;
    const q2H = splitY - minY - 10;
    content += renderDetailedFlatQuadrant({
      flatId: 2,
      flatCode: 'D2',
      title: f2?.name || (isFrontLarge ? '2. Daire (Ön Sağ 3+1 Geniş)' : '2. Daire (Ön Sağ 2+1)'),
      areaM2: area2,
      isContractor: !!f2?.isContractorShare,
      isLarge: isFrontLarge,
      box: { x: q2X, y: q2Y, w: q2W, h: q2H },
      coreEdge: { x: coreX + coreW, y: coreY },
      quadrant: 'front_right',
      colors,
    });

    // Quadrant 3: DAİRE 3 - ARKA SOL (Rear-Left)
    const q3X = minX + 6;
    const q3Y = splitY + 4;
    const q3W = splitX - minX - 10;
    const q3H = maxY - splitY - 10;
    content += renderDetailedFlatQuadrant({
      flatId: 3,
      flatCode: 'D3',
      title: f3?.name || (isFrontLarge ? '3. Daire (Arka Sol 2+1/1+1 Kompakt)' : '3. Daire (Arka Sol 2+1)'),
      areaM2: area3,
      isContractor: !!f3?.isContractorShare,
      isLarge: false,
      box: { x: q3X, y: q3Y, w: q3W, h: q3H },
      coreEdge: { x: coreX, y: coreY + coreH },
      quadrant: 'rear_left',
      colors,
    });

    // Quadrant 4: DAİRE 4 - ARKA SAĞ (Rear-Right)
    const q4X = splitX + 4;
    const q4Y = splitY + 4;
    const q4W = maxX - splitX - 10;
    const q4H = maxY - splitY - 10;
    content += renderDetailedFlatQuadrant({
      flatId: 4,
      flatCode: 'D4',
      title: f4?.name || (isFrontLarge ? '4. Daire (Arka Sağ 2+1/1+1 Kompakt)' : '4. Daire (Arka Sağ 2+1)'),
      areaM2: area4,
      isContractor: !!f4?.isContractorShare,
      isLarge: false,
      box: { x: q4X, y: q4Y, w: q4W, h: q4H },
      coreEdge: { x: coreX + coreW, y: coreY + coreH },
      quadrant: 'rear_right',
      colors,
    });
  }

  // -------------------------------------------------------------
  // CASE B: 2 FLATS PER FLOOR (SOL KANAT & SAĞ KANAT 3+1 / 4+1)
  // -------------------------------------------------------------
  else if (flatsPerFloor === 2) {
    const f1 = flats[0];
    const f2 = flats[1];
    const area1 = f1?.area || Math.round(netResidentialFloorArea * 0.5);
    const area2 = f2?.area || Math.round(netResidentialFloorArea * 0.5);

    // Left Wing (D1)
    const leftW = coreX - minX - 12;
    content += renderDetailedWingFlat({
      flatId: 1,
      flatCode: 'D1',
      title: f1?.name || '1. Daire (Sol Kanat 3+1)',
      areaM2: area1,
      isContractor: !!f1?.isContractorShare,
      box: { x: minX + 6, y: minY + 6, w: leftW, h: h - 12 },
      corePos: { x: coreX, y: coreY, w: coreW, h: coreH },
      isLeft: true,
      colors,
    });

    // Right Wing (D2)
    const rightX = coreX + coreW + 12;
    const rightW = maxX - rightX - 6;
    content += renderDetailedWingFlat({
      flatId: 2,
      flatCode: 'D2',
      title: f2?.name || '2. Daire (Sağ Kanat 3+1)',
      areaM2: area2,
      isContractor: !!f2?.isContractorShare,
      box: { x: rightX, y: minY + 6, w: rightW, h: h - 12 },
      corePos: { x: coreX, y: coreY, w: coreW, h: coreH },
      isLeft: false,
      colors,
    });
  }

  // -------------------------------------------------------------
  // CASE C: 3 FLATS PER FLOOR
  // -------------------------------------------------------------
  else if (flatsPerFloor === 3) {
    const colW = (w - 20) / 3;
    const f1 = flats[0];
    const f2 = flats[1];
    const f3 = flats[2];

    // Left Flat D1
    content += renderDetailedWingFlat({
      flatId: 1,
      flatCode: 'D1',
      title: f1?.name || '1. Daire (Sol 2+1)',
      areaM2: f1?.area || Math.round(netResidentialFloorArea * 0.38),
      isContractor: !!f1?.isContractorShare,
      box: { x: minX + 6, y: minY + 6, w: colW, h: h - 12 },
      corePos: { x: coreX, y: coreY, w: coreW, h: coreH },
      isLeft: true,
      colors,
    });

    // Center Flat D2 (Compact 1+1 above or below core)
    const cX = minX + 10 + colW;
    const cY = minY + 6;
    const cH = Math.max(100, coreY - minY - 12);
    content += `
      <g id="flat-center-unit">
        <rect x="${cX}" y="${cY}" width="${colW}" height="${cH}" fill="${colors.roomFillKitchen}" fill-opacity="0.3" stroke="${colors.innerWallStroke}" stroke-width="1.2" />
        <!-- Steel door from floor lobby -->
        ${drawSteelEntranceDoor(cX + colW / 2 - 10, cY + cH, 18, 270, true, colors, 'D2')}
        <!-- Entrance Foyer with Cloakroom -->
        ${drawEntranceFoyer(cX + colW / 2 - 35, cY + cH - 35, 70, 30, 4.5, colors, true)}
        <!-- Open Kitchen & Salon -->
        <rect x="${cX + 4}" y="${cY + 4}" width="${colW * 0.55}" height="${cH - 42}" fill="${colors.roomFillLiving}" stroke="${colors.innerWallStroke}" stroke-width="0.8" />
        <text x="${cX + colW * 0.28}" y="${cY + 20}" class="room-label" font-size="8" fill="${colors.textPrimary}">SALON & MUTFAK</text>
        <text x="${cX + colW * 0.28}" y="${cY + 32}" class="room-sub" font-size="7" fill="${colors.textSecondary}">18.5 m² • Açık Konsept</text>
        ${drawKitchenFixtures(cX + 6, cY + 36, colW * 0.5, cH - 78, colors)}

        <!-- Bedroom -->
        <rect x="${cX + colW * 0.58}" y="${cY + 4}" width="${colW * 0.4}" height="${(cH - 42) * 0.55}" fill="${colors.roomFillBed}" stroke="${colors.innerWallStroke}" stroke-width="0.8" />
        <text x="${cX + colW * 0.78}" y="${cY + 20}" class="room-label" font-size="8" fill="${colors.textPrimary}">YATAK ODASI</text>
        <text x="${cX + colW * 0.78}" y="${cY + 32}" class="room-sub" font-size="7" fill="${colors.textSecondary}">11.0 m²</text>

        <!-- Bathroom -->
        ${drawBathroomFixtures(cX + colW * 0.58, cY + (cH - 42) * 0.58, colW * 0.4, (cH - 42) * 0.42, colors)}
      </g>
    `;

    // Right Flat D3
    const rX = minX + 14 + colW * 2;
    content += renderDetailedWingFlat({
      flatId: 3,
      flatCode: 'D3',
      title: f3?.name || '3. Daire (Sağ 2+1)',
      areaM2: f3?.area || Math.round(netResidentialFloorArea * 0.38),
      isContractor: !!f3?.isContractorShare,
      box: { x: rX, y: minY + 6, w: colW, h: h - 12 },
      corePos: { x: coreX, y: coreY, w: coreW, h: coreH },
      isLeft: false,
      colors,
    });
  }

  // -------------------------------------------------------------
  // CASE D: 1 SINGLE LUXURY FLAT (4+1 / 5+1 PENTHOUSE FLOOR)
  // -------------------------------------------------------------
  else {
    const f1 = flats[0];
    const area = f1?.area || Math.round(netResidentialFloorArea);

    content += `
      <g id="flat-single-luxury">
        <!-- Main Entrance Steel Double Door from core -->
        ${drawSteelEntranceDoor(coreX - 12, coreY + coreH * 0.5, 24, 180, true, colors, 'LÜKS')}
        <!-- Grand Entrance Foyer (Antre & Vestiyer Odası) -->
        ${drawEntranceFoyer(coreX - 85, coreY + coreH * 0.35, 70, 50, 12.0, colors, true)}

        <!-- Grand Salon (Living Room) - West / Front -->
        <rect x="${minX + 8}" y="${minY + 8}" width="${w * 0.52}" height="${h * 0.48}" fill="${colors.roomFillLiving}" stroke="${colors.innerWallStroke}" stroke-width="1.2" />
        <text x="${minX + w * 0.26}" y="${minY + 24}" class="room-label" font-size="11" fill="${colors.textPrimary}">BÜYÜK SALON & YEMEK SALONU</text>
        <text x="${minX + w * 0.26}" y="${minY + 38}" class="room-sub" font-size="9" fill="${colors.textSecondary}">42.5 m² • Panoramik Cephe • Şömine Köşesi</text>
        ${drawLivingFurniture(minX + 14, minY + 44, w * 0.48, h * 0.38, colors)}
        ${drawArchDoor(minX + w * 0.48, minY + h * 0.48, 20, 270, true, colors.accent, colors.doorArc, 'K1')}

        <!-- Island Kitchen (Ada Mutfak & Kiler) -->
        <rect x="${minX + w * 0.55}" y="${minY + 8}" width="${w * 0.43}" height="${h * 0.48}" fill="${colors.roomFillKitchen}" stroke="${colors.innerWallStroke}" stroke-width="1.2" />
        <text x="${minX + w * 0.76}" y="${minY + 24}" class="room-label" font-size="10" fill="${colors.textPrimary}">ADA MUTFAK & KİLER</text>
        <text x="${minX + w * 0.76}" y="${minY + 38}" class="room-sub" font-size="9" fill="${colors.textSecondary}">18.0 m² • Ada Tezgah & Ankastre</text>
        ${drawKitchenFixtures(minX + w * 0.58, minY + 44, w * 0.38, h * 0.38, colors)}

        <!-- Master Suite (Ebeveyn Yatak Odası + Giyinme + Banyo) -->
        <rect x="${minX + 8}" y="${minY + h * 0.52}" width="${w * 0.48}" height="${h * 0.45}" fill="${colors.roomFillBed}" stroke="${colors.innerWallStroke}" stroke-width="1.2" />
        <text x="${minX + w * 0.24}" y="${minY + h * 0.52 + 20}" class="room-label" font-size="10" fill="${colors.textPrimary}">EBEVEYN SÜİTİ (Master Bedroom)</text>
        <text x="${minX + w * 0.24}" y="${minY + h * 0.52 + 34}" class="room-sub" font-size="9" fill="${colors.textSecondary}">24.0 m² • Giyinme Odası & Özel Ebeveyn Banyosu</text>
        ${drawBedroomFurniture(minX + 14, minY + h * 0.52 + 40, w * 0.44, h * 0.32, true, colors)}

        <!-- Additional Bedrooms & Main Bathroom -->
        <rect x="${minX + w * 0.52}" y="${minY + h * 0.52}" width="${w * 0.46}" height="${h * 0.45}" fill="${colors.roomFillBed}" stroke="${colors.innerWallStroke}" stroke-width="1.2" />
        <text x="${minX + w * 0.75}" y="${minY + h * 0.52 + 20}" class="room-label" font-size="10" fill="${colors.textPrimary}">ÇOCUK & MİSAFİR YATAK ODALARI</text>
        <text x="${minX + w * 0.75}" y="${minY + h * 0.52 + 34}" class="room-sub" font-size="9" fill="${colors.textSecondary}">15.0 m² + 13.5 m² • Gömme Gardıroplu</text>
        ${drawBedroomFurniture(minX + w * 0.54, minY + h * 0.52 + 40, w * 0.22, h * 0.32, false, colors)}
        ${drawBathroomFixtures(minX + w * 0.78, minY + h * 0.52 + 40, w * 0.18, h * 0.32, colors)}
      </g>
    `;
  }

  return content;
}

/**
 * Detailed renderer for a 4-flat Quadrant (D1, D2, D3, D4)
 */
function renderDetailedFlatQuadrant(params: {
  flatId: number;
  flatCode: string;
  title: string;
  areaM2: number;
  isContractor: boolean;
  isLarge: boolean;
  box: { x: number; y: number; w: number; h: number };
  coreEdge: { x: number; y: number };
  quadrant: 'front_left' | 'front_right' | 'rear_left' | 'rear_right';
  colors: ThemeColors;
}): string {
  const { flatId, flatCode, title, areaM2, isContractor, isLarge, box, coreEdge, quadrant, colors } = params;
  const { x, y, w, h } = box;

  const isLeft = quadrant === 'front_left' || quadrant === 'rear_left';
  const isFront = quadrant === 'front_left' || quadrant === 'front_right';

  let out = `
    <!-- DETAILED APARTMENT ${flatCode} (${title}) -->
    <g id="flat-unit-${flatId}">
      <!-- Flat Perimeter Boundary & Background -->
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${colors.bg}" stroke="${colors.innerWallStroke}" stroke-width="1.4" rx="2" />

      <!-- Flat Title & Area Tag -->
      <g transform="translate(${x + 6}, ${y + 6})">
        <rect width="${Math.min(w - 12, 175)}" height="16" fill="${colors.bg}" stroke="${isContractor ? '#d97706' : colors.accent}" stroke-width="0.8" rx="2" />
        <text x="6" y="11" font-family="sans-serif" font-size="7.5" font-weight="bold" fill="${colors.textPrimary}">
          ${flatCode}: ${title.slice(0, 22)}
        </text>
        <text x="${Math.min(w - 18, 168)}" y="11" font-family="sans-serif" font-size="7" font-weight="bold" fill="${isContractor ? '#d97706' : colors.accent}" text-anchor="end">
          Net: ~${areaM2} m²
        </text>
      </g>
  `;

  // 1. STEEL ENTRANCE DOOR & ANTRE (GİRİŞ HOLÜ & PORTMANTO)
  // Positioned at the inner corner adjacent to core lobby
  const foyerW = Math.min(w * 0.45, 68);
  const foyerH = Math.min(h * 0.38, 48);
  const foyerX = isLeft ? x + w - foyerW : x;
  const foyerY = isFront ? y + h - foyerH : y;

  const steelDoorHingeX = isLeft ? x + w : x;
  const steelDoorHingeY = isFront ? y + h - foyerH * 0.5 : y + foyerH * 0.5;
  const steelDoorAngle = isLeft ? 180 : 0;

  out += `
    <!-- Entrance Steel Door -->
    ${drawSteelEntranceDoor(steelDoorHingeX, steelDoorHingeY, 18, steelDoorAngle, isFront, colors, flatCode)}
    <!-- Foyer & Cloakroom -->
    ${drawEntranceFoyer(foyerX, foyerY, foyerW, foyerH, Math.round(areaM2 * 0.12), colors, isLeft)}
  `;

  // 2. SALON (LIVING ROOM) - Takes prime exterior corner with large windows
  const salonW = isLeft ? foyerX - x - 2 : x + w - (foyerX + foyerW) - 2;
  const salonH = isFront ? h * 0.58 : h * 0.52;
  const salonX = isLeft ? x + 2 : foyerX + foyerW + 2;
  const salonY = isFront ? y + 24 : y + h - salonH - 2;

  out += `
    <!-- Living Room (Salon) -->
    <g class="flat-salon">
      <rect x="${salonX}" y="${salonY}" width="${salonW}" height="${salonH}" fill="${colors.roomFillLiving}" stroke="${colors.innerWallStroke}" stroke-width="1" />
      <text x="${salonX + salonW / 2}" y="${salonY + 14}" class="room-label" font-size="8.5" fill="${colors.textPrimary}">SALON</text>
      <text x="${salonX + salonW / 2}" y="${salonY + 25}" class="room-sub" font-size="7.5" fill="${colors.textSecondary}">
        ${Math.round(areaM2 * 0.36)} m² • ${isLarge ? 'Geniş Oturma & Yemek' : 'Oturma Odası'}
      </text>
      ${drawLivingFurniture(salonX + 2, salonY + 28, salonW - 4, salonH - 32, colors)}
      <!-- Exterior Window -->
      ${
        isFront
          ? drawWindowSymbol(salonX + 10, y, salonX + salonW - 10, y, colors.wallStroke, colors.windowGlass)
          : drawWindowSymbol(salonX + 10, y + h, salonX + salonW - 10, y + h, colors.wallStroke, colors.windowGlass)
      }
      <!-- Salon Door from Hall -->
      ${drawArchDoor(isLeft ? salonX + salonW : salonX, salonY + salonH - 4, 15, isLeft ? 180 : 0, true, colors.textSecondary, colors.doorArc, 'K1')}
    </g>
  `;

  // 3. MUTFAK (KITCHEN)
  const kitchenW = salonW;
  const kitchenH = h - salonH - 28;
  const kitchenX = salonX;
  const kitchenY = isFront ? salonY + salonH + 2 : y + 24;

  out += `
    <!-- Kitchen (Mutfak) -->
    <g class="flat-kitchen">
      <rect x="${kitchenX}" y="${kitchenY}" width="${kitchenW}" height="${kitchenH}" fill="${colors.roomFillKitchen}" stroke="${colors.innerWallStroke}" stroke-width="1" />
      <text x="${kitchenX + kitchenW / 2}" y="${kitchenY + 12}" class="room-label" font-size="8" fill="${colors.textPrimary}">MUTFAK</text>
      <text x="${kitchenX + kitchenW / 2}" y="${kitchenY + 22}" class="room-sub" font-size="7" fill="${colors.textSecondary}">${Math.round(areaM2 * 0.16)} m²</text>
      ${drawKitchenFixtures(kitchenX + 2, kitchenY + 24, kitchenW - 4, kitchenH - 26, colors)}
      <!-- Kitchen Window / Door -->
      ${
        isLeft
          ? drawWindowSymbol(x, kitchenY + 8, x, kitchenY + kitchenH - 8, colors.wallStroke, colors.windowGlass)
          : drawWindowSymbol(x + w, kitchenY + 8, x + w, kitchenY + kitchenH - 8, colors.wallStroke, colors.windowGlass)
      }
      <!-- Kitchen Door -->
      ${drawArchDoor(isLeft ? kitchenX + kitchenW : kitchenX, kitchenY + 6, 14, isLeft ? 180 : 0, false, colors.textSecondary, colors.doorArc, 'K2')}
    </g>
  `;

  // 4. MASTER BEDROOM (EBEVEYN YATAK ODASI)
  const bedW = foyerW;
  const bedH = h - foyerH - 28;
  const bedX = foyerX;
  const bedY = isFront ? y + 24 : foyerY + foyerH + 2;

  out += `
    <!-- Master Bedroom (Ebeveyn Odası) -->
    <g class="flat-bedroom">
      <rect x="${bedX}" y="${bedY}" width="${bedW}" height="${bedH}" fill="${colors.roomFillBed}" stroke="${colors.innerWallStroke}" stroke-width="1" />
      <text x="${bedX + bedW / 2}" y="${bedY + 12}" class="room-label" font-size="8" fill="${colors.textPrimary}">EBEVEYN ODASI</text>
      <text x="${bedX + bedW / 2}" y="${bedY + 22}" class="room-sub" font-size="7" fill="${colors.textSecondary}">${Math.round(areaM2 * 0.22)} m²</text>
      ${drawBedroomFurniture(bedX + 2, bedY + 24, bedW - 4, bedH - 28, isLarge, colors)}
      <!-- Bedroom Window -->
      ${
        isFront
          ? drawWindowSymbol(bedX + 8, y, bedX + bedW - 8, y, colors.wallStroke, colors.windowGlass)
          : drawWindowSymbol(bedX + 8, y + h, bedX + bedW - 8, y + h, colors.wallStroke, colors.windowGlass)
      }
      <!-- Bedroom Door from Hall -->
      ${drawArchDoor(isLeft ? bedX + bedW - 4 : bedX + 4, isFront ? bedY + bedH : bedY, 15, isFront ? 90 : 270, isLeft, colors.textSecondary, colors.doorArc, 'K3')}
    </g>
  `;

  // 5. BATHROOM (BANYO & WC)
  const bathW = Math.min(foyerW * 0.65, 38);
  const bathH = Math.min(foyerH * 0.85, 36);
  const bathX = isLeft ? foyerX + 2 : foyerX + foyerW - bathW - 2;
  const bathY = isFront ? foyerY + 2 : foyerY + foyerH - bathH - 2;

  out += `
    <!-- Bathroom (Banyo) -->
    <g class="flat-bathroom">
      ${drawBathroomFixtures(bathX, bathY, bathW, bathH, colors)}
      <text x="${bathX + bathW / 2}" y="${bathY + bathH - 5}" class="room-label" font-size="6.5" fill="${colors.textPrimary}">BANYO</text>
      <!-- Bathroom Inward Door -->
      ${drawArchDoor(isLeft ? bathX : bathX + bathW, isFront ? bathY + bathH : bathY, 12, isFront ? 270 : 90, isLeft, colors.textSecondary, colors.doorArc, 'K4')}
    </g>
  `;

  // 6. BALCONY (BALKON)
  const balcW = Math.min(salonW * 0.65, 36);
  const balcH = 14;
  const balcX = salonX + (salonW - balcW) / 2;
  const balcY = isFront ? y - 4 : y + h - 10;

  out += `
    <!-- Balcony -->
    <g class="flat-balcony">
      <rect x="${balcX}" y="${balcY}" width="${balcW}" height="${balcH}" fill="${colors.roomFillBalcony}" stroke="${colors.accent}" stroke-width="0.9" rx="1" />
      <line x1="${balcX}" y1="${isFront ? balcY : balcY + balcH}" x2="${balcX + balcW}" y2="${isFront ? balcY : balcY + balcH}" stroke="${colors.textPrimary}" stroke-width="1.5" stroke-dasharray="3,1.5" />
      <text x="${balcX + balcW / 2}" y="${balcY + 9}" font-family="sans-serif" font-size="6" font-weight="bold" fill="${colors.accent}" text-anchor="middle">BALKON</text>
    </g>
  `;

  out += `</g>`;
  return out;
}

/**
 * Detailed renderer for 2-flat wings (D1 Sol Kanat, D2 Sağ Kanat)
 */
function renderDetailedWingFlat(params: {
  flatId: number;
  flatCode: string;
  title: string;
  areaM2: number;
  isContractor: boolean;
  box: { x: number; y: number; w: number; h: number };
  corePos: { x: number; y: number; w: number; h: number };
  isLeft: boolean;
  colors: ThemeColors;
}): string {
  const { flatId, flatCode, title, areaM2, isContractor, box, corePos, isLeft, colors } = params;
  const { x, y, w, h } = box;

  let out = `
    <!-- WING APARTMENT ${flatCode} -->
    <g id="wing-flat-${flatId}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${colors.bg}" stroke="${colors.innerWallStroke}" stroke-width="1.5" rx="2" />

      <!-- Title Badge -->
      <g transform="translate(${x + 8}, ${y + 8})">
        <rect width="190" height="18" fill="${colors.bg}" stroke="${isContractor ? '#d97706' : colors.accent}" stroke-width="1" rx="2.5" />
        <text x="8" y="12" font-family="sans-serif" font-size="8" font-weight="bold" fill="${colors.textPrimary}">
          ${flatCode}: ${title}
        </text>
        <text x="182" y="12" font-family="sans-serif" font-size="7.5" font-weight="bold" fill="${isContractor ? '#d97706' : colors.accent}" text-anchor="end">
          Net: ~${areaM2} m²
        </text>
      </g>
  `;

  // Entrance Door from Floor Corridor
  const doorHingeX = isLeft ? x + w : x;
  const doorHingeY = corePos.y + corePos.h * 0.45;
  out += drawSteelEntranceDoor(doorHingeX, doorHingeY, 20, isLeft ? 180 : 0, true, colors, flatCode);

  // Entrance Foyer (Antre) with Cloakroom
  const foyerW = Math.min(w * 0.42, 65);
  const foyerH = Math.min(h * 0.35, 60);
  const foyerX = isLeft ? x + w - foyerW - 2 : x + 2;
  const foyerY = doorHingeY - foyerH * 0.35;
  out += drawEntranceFoyer(foyerX, foyerY, foyerW, foyerH, Math.round(areaM2 * 0.12), colors, isLeft);

  // Grand Salon (Living Room) - Front Zone
  const salonW = isLeft ? foyerX - x - 4 : x + w - (foyerX + foyerW) - 4;
  const salonH = h * 0.52;
  const salonX = isLeft ? x + 4 : foyerX + foyerW + 4;
  const salonY = y + 32;

  out += `
    <!-- Living Room (Salon) -->
    <g class="wing-salon">
      <rect x="${salonX}" y="${salonY}" width="${salonW}" height="${salonH}" fill="${colors.roomFillLiving}" stroke="${colors.innerWallStroke}" stroke-width="1" />
      <text x="${salonX + salonW / 2}" y="${salonY + 16}" class="room-label" font-size="9" fill="${colors.textPrimary}">SALON</text>
      <text x="${salonX + salonW / 2}" y="${salonY + 28}" class="room-sub" font-size="8" fill="${colors.textSecondary}">
        ${Math.round(areaM2 * 0.35)} m² • Panoramik Balkonlu
      </text>
      ${drawLivingFurniture(salonX + 4, salonY + 32, salonW - 8, salonH - 38, colors)}
      ${drawWindowSymbol(salonX + 12, y, salonX + salonW - 12, y, colors.wallStroke, colors.windowGlass)}
      ${drawArchDoor(isLeft ? salonX + salonW : salonX, salonY + salonH - 8, 16, isLeft ? 180 : 0, true, colors.textSecondary, colors.doorArc, 'K1')}
    </g>
  `;

  // Kitchen (Mutfak)
  const kitchenW = foyerW;
  const kitchenH = y + salonH - foyerY;
  const kitchenX = foyerX;
  const kitchenY = y + 32;

  out += `
    <!-- Kitchen -->
    <g class="wing-kitchen">
      <rect x="${kitchenX}" y="${kitchenY}" width="${kitchenW}" height="${foyerY - kitchenY - 4}" fill="${colors.roomFillKitchen}" stroke="${colors.innerWallStroke}" stroke-width="1" />
      <text x="${kitchenX + kitchenW / 2}" y="${kitchenY + 14}" class="room-label" font-size="8" fill="${colors.textPrimary}">MUTFAK</text>
      <text x="${kitchenX + kitchenW / 2}" y="${kitchenY + 25}" class="room-sub" font-size="7" fill="${colors.textSecondary}">${Math.round(areaM2 * 0.15)} m²</text>
      ${drawKitchenFixtures(kitchenX + 2, kitchenY + 28, kitchenW - 4, foyerY - kitchenY - 34, colors)}
      ${drawArchDoor(isLeft ? kitchenX : kitchenX + kitchenW, foyerY - 8, 14, isLeft ? 0 : 180, false, colors.textSecondary, colors.doorArc, 'K2')}
    </g>
  `;

  // Master Bedroom (Ebeveyn Yatak Odası) - Rear Zone
  const bed1W = (w - 12) * 0.52;
  const bed1H = h - salonH - 42;
  const bed1X = x + 4;
  const bed1Y = salonY + salonH + 4;

  out += `
    <!-- Master Bedroom -->
    <g class="wing-bed-master">
      <rect x="${bed1X}" y="${bed1Y}" width="${bed1W}" height="${bed1H}" fill="${colors.roomFillBed}" stroke="${colors.innerWallStroke}" stroke-width="1" />
      <text x="${bed1X + bed1W / 2}" y="${bed1Y + 14}" class="room-label" font-size="8.5" fill="${colors.textPrimary}">EBEVEYN ODASI</text>
      <text x="${bed1X + bed1W / 2}" y="${bed1Y + 25}" class="room-sub" font-size="7.5" fill="${colors.textSecondary}">${Math.round(areaM2 * 0.22)} m²</text>
      ${drawBedroomFurniture(bed1X + 4, bed1Y + 26, bed1W - 8, bed1H - 30, true, colors)}
      ${drawWindowSymbol(bed1X + 10, y + h, bed1X + bed1W - 10, y + h, colors.wallStroke, colors.windowGlass)}
      ${drawArchDoor(bed1X + bed1W, bed1Y + 10, 15, 0, true, colors.textSecondary, colors.doorArc, 'K3')}
    </g>
  `;

  // 2nd Bedroom (Çocuk / Misafir Odası)
  const bed2W = w - bed1W - 12;
  const bed2H = bed1H * 0.65;
  const bed2X = bed1X + bed1W + 4;
  const bed2Y = bed1Y;

  out += `
    <!-- Kids Bedroom -->
    <g class="wing-bed-kids">
      <rect x="${bed2X}" y="${bed2Y}" width="${bed2W}" height="${bed2H}" fill="${colors.roomFillBed}" stroke="${colors.innerWallStroke}" stroke-width="1" />
      <text x="${bed2X + bed2W / 2}" y="${bed2Y + 12}" class="room-label" font-size="8" fill="${colors.textPrimary}">ÇOCUK ODASI</text>
      <text x="${bed2X + bed2W / 2}" y="${bed2Y + 22}" class="room-sub" font-size="7" fill="${colors.textSecondary}">${Math.round(areaM2 * 0.12)} m²</text>
      ${drawBedroomFurniture(bed2X + 2, bed2Y + 24, bed2W - 4, bed2H - 26, false, colors)}
      ${drawArchDoor(bed2X, bed2Y + 8, 14, 180, false, colors.textSecondary, colors.doorArc, 'K4')}
    </g>
  `;

  // Bathroom (Banyo & WC)
  const bathH = bed1H - bed2H - 4;
  const bathX = bed2X;
  const bathY = bed2Y + bed2H + 4;

  out += `
    <!-- Bathroom -->
    <g class="wing-bath">
      ${drawBathroomFixtures(bathX, bathY, bed2W, bathH, colors)}
      <text x="${bathX + bed2W / 2}" y="${bathY + bathH - 6}" class="room-label" font-size="7.5" fill="${colors.textPrimary}">BANYO & WC</text>
      ${drawArchDoor(bathX, bathY + 6, 12, 180, true, colors.textSecondary, colors.doorArc, 'K5')}
    </g>
  `;

  // Balcony (Balkon)
  const balcW = Math.min(salonW * 0.6, 42);
  const balcH = 16;
  const balcX = salonX + (salonW - balcW) / 2;
  const balcY = y - 4;

  out += `
    <!-- Front Balcony -->
    <g class="wing-balcony">
      <rect x="${balcX}" y="${balcY}" width="${balcW}" height="${balcH}" fill="${colors.roomFillBalcony}" stroke="${colors.accent}" stroke-width="1" rx="1.5" />
      <line x1="${balcX}" y1="${balcY}" x2="${balcX + balcW}" y2="${balcY}" stroke="${colors.textPrimary}" stroke-width="1.8" stroke-dasharray="3,1.5" />
      <text x="${balcX + balcW / 2}" y="${balcY + 10}" font-family="sans-serif" font-size="6.5" font-weight="bold" fill="${colors.accent}" text-anchor="middle">BALKON</text>
    </g>
  `;

  out += `</g>`;
  return out;
}

/**
 * Renders Official Turkish Zoning Regulation Standards Table on Drawing
 */
function renderZoningStandardsTable(x: number, y: number, colors: ThemeColors): string {
  const tableW = 340;
  const tableH = 135;
  const s = TURKEY_ZONING_ENTRANCE_STANDARDS;

  return `
    <!-- TÜRKİYE İMAR MEVZUATI & TS 9111 GİRİŞ STANDARTLARI TABLOSU -->
    <g id="zoning-standards-legend" transform="translate(${x}, ${y})">
      <rect width="${tableW}" height="${tableH}" fill="${colors.bg}" stroke="${colors.outerBorder}" stroke-width="1.2" rx="4" />
      <rect width="${tableW}" height="24" fill="${colors.accent}" rx="3" />
      <text x="${tableW / 2}" y="16" class="room-label" font-size="9" fill="#ffffff">
        TÜRKİYE İMAR VE TS 9111 STANDART GİRİŞ ÖNERİSİ
      </text>

      <!-- Row 1: Ana Giriş Kapısı -->
      <text x="10" y="42" class="room-sub" font-weight="bold" fill="${colors.textPrimary}">• Bina Ana Giriş Kapısı:</text>
      <text x="145" y="42" class="room-sub" fill="${colors.accent}">${s.mainDoor.recommended}</text>
      <text x="325" y="42" class="room-sub" font-size="8" fill="${colors.textSecondary}" text-anchor="end">(Yön: ${s.mainDoor.regulationMin})</text>

      <!-- Row 2: Rüzgarlık -->
      <text x="10" y="60" class="room-sub" font-weight="bold" fill="${colors.textPrimary}">• Giriş Rüzgarlık Holü:</text>
      <text x="145" y="60" class="room-sub" fill="${colors.accent}">${s.vestibule.recommended}</text>
      <text x="325" y="60" class="room-sub" font-size="8" fill="${colors.textSecondary}" text-anchor="end">(Yön: Min. 2.20 m)</text>

      <!-- Row 3: Engelli Rampası -->
      <text x="10" y="78" class="room-sub" font-weight="bold" fill="${colors.textPrimary}">• TS 9111 Engelli Rampası:</text>
      <text x="145" y="78" class="room-sub" fill="${colors.accent}">Eğim: %5.0 • Genişlik: 1.50 m</text>
      <text x="325" y="78" class="room-sub" font-size="8" fill="${colors.textSecondary}" text-anchor="end">(Azami: %6.0)</text>

      <!-- Row 4: Asansör -->
      <text x="10" y="96" class="room-sub" font-weight="bold" fill="${colors.textPrimary}">• Asansör Tesisi (TS EN 81):</text>
      <text x="145" y="96" class="room-sub" fill="${colors.accent}">800 kg / 10 Kişi (Sedye Uyumlu)</text>
      <text x="325" y="96" class="room-sub" font-size="8" fill="${colors.textSecondary}" text-anchor="end">(Kuyu: 1.80×2.10m)</text>

      <!-- Row 5: Yangın Merdiveni & Şaft -->
      <text x="10" y="114" class="room-sub" font-weight="bold" fill="${colors.textPrimary}">• Merdiven & Tesisat Şaftı:</text>
      <text x="145" y="114" class="room-sub" fill="${colors.accent}">Kol: 1.25 m • Rıht: 16.5 cm • Sayaç Nişi</text>
      <text x="325" y="114" class="room-sub" font-size="8" fill="${colors.textSecondary}" text-anchor="end">(Yangın Yön.)</text>
    </g>
  `;
}

/**
 * ELEVATION DRAWING RENDERER (Ön Cephe Görünüşü)
 */
function renderFacadeElevationSvg(
  projectData: DrawingProjectData,
  colors: ThemeColors,
  canvasW: number,
  canvasH: number
): string {
  const { facadeWidth = 14, floorCount = 5, hasGroundFloorShop = false, shopCount = 1, hasBasement = false, basementCount = 1, roofType = 'mansard' } = projectData;

  const groundY = canvasH - 120;
  const maxBldgW = canvasW - 240;
  const maxBldgH = canvasH - 220;

  const totalStoreys = floorCount + (hasBasement ? basementCount : 0);
  const floorHeightPx = Math.min(65, Math.max(35, (maxBldgH - 40) / (totalStoreys + 0.6)));

  const bldgW = Math.min(maxBldgW, Math.max(380, facadeWidth * 25));
  const startX = (canvasW - bldgW) / 2;

  let content = `
    <!-- GROUND LINE (±0.00) -->
    <line x1="50" y1="${groundY}" x2="${canvasW - 50}" y2="${groundY}" stroke="${colors.wallStroke}" stroke-width="3" />
    <text x="70" y="${groundY + 18}" class="dim-text" fill="${colors.textPrimary}">±0.00 DOĞAL ZEMİN & CADDE KOTU</text>

    <!-- SOIL HATCHING -->
    ${Array.from({ length: 25 })
      .map((_, i) => {
        const hx = 60 + i * ((canvasW - 120) / 25);
        return `<line x1="${hx}" y1="${groundY + 4}" x2="${hx - 8}" y2="${groundY + 16}" stroke="${colors.dimensionLine}" stroke-width="1" />`;
      })
      .join('')}
  `;

  // Draw basement if exists
  if (hasBasement) {
    for (let b = 1; b <= basementCount; b++) {
      const bY = groundY + (b - 1) * floorHeightPx;
      
      // Detailed basement label if config exists
      let basementLabel = `BODRUM KAT (${b})`;
      if (projectData.basementConfig && projectData.basementConfig.length > 0) {
        const units = projectData.basementConfig.map(u => `${u.count} ${u.type === 'commercial_shop' ? 'İşyeri' : u.type === 'residential' ? 'Konut' : u.type === 'shelter' ? 'Sığınak' : u.type === 'parking' ? 'Otopark' : 'Depo'}`).join(', ');
        basementLabel = `${b}. BODRUM: ${units}`;
      }

      content += `
        <!-- Basement Level -${b} -->
        <rect x="${startX}" y="${bY}" width="${bldgW}" height="${floorHeightPx}" fill="${colors.wallFill}" stroke="${colors.wallStroke}" stroke-width="1.5" />
        <text x="${startX + 15}" y="${bY + floorHeightPx / 2 + 4}" class="dim-text" font-size="9" fill="${colors.textSecondary}">-${(b * 3).toFixed(2)}m ${basementLabel}</text>
      `;
    }
  }

  // Draw Above Ground Floors
  for (let f = 0; f < floorCount; f++) {
    const floorY = groundY - (f + 1) * floorHeightPx;
    const isGround = f === 0;
    const levelElevation = `+${(f * 2.9).toFixed(2)}m`;

    content += `
      <!-- Level Marker Floor ${f + 1} -->
      <line x1="${startX - 75}" y1="${floorY + floorHeightPx}" x2="${startX}" y2="${floorY + floorHeightPx}" stroke="${colors.dimensionLine}" stroke-width="0.75" stroke-dasharray="3,3" />
      <polygon points="${startX - 75},${floorY + floorHeightPx} ${startX - 65},${floorY + floorHeightPx - 6} ${startX - 65},${floorY + floorHeightPx + 6}" fill="${colors.accent}" />
      <text x="${startX - 60}" y="${floorY + floorHeightPx + 4}" class="dim-text" font-size="10" fill="${colors.dimensionText}">${levelElevation}</text>

      <!-- Floor Facade Box -->
      <rect x="${startX}" y="${floorY}" width="${bldgW}" height="${floorHeightPx}" fill="${isGround && hasGroundFloorShop ? colors.roomFillCorridor : colors.wallFill}" stroke="${colors.wallStroke}" stroke-width="2" />
    `;

    if (isGround) {
      if (hasGroundFloorShop) {
        // Ground Floor with Commercial Shops + Residential Entrance
        const sCount = shopCount || 1;
        const shopW = (bldgW - 90) / sCount;
        content += `
          <!-- Residential Lobby Entrance Portal -->
          <rect x="${startX + 8}" y="${floorY + 6}" width="74" height="${floorHeightPx - 6}" fill="${colors.accent}" stroke="${colors.outerBorder}" stroke-width="1.5" />
          <text x="${startX + 45}" y="${floorY + floorHeightPx * 0.4}" class="room-label" font-size="9" fill="#ffffff">KONUT GİRİŞİ</text>
          <text x="${startX + 45}" y="${floorY + floorHeightPx * 0.62}" class="room-sub" font-size="7" fill="#ffffff">1.80m ÇİFT KANAT</text>

          <!-- Commercial Shops -->
          ${Array.from({ length: sCount })
            .map((_, sIdx) => {
              const sx = startX + 90 + sIdx * shopW;
              return `
                <rect x="${sx + 4}" y="${floorY + 6}" width="${shopW - 8}" height="${floorHeightPx - 6}" fill="${colors.windowGlass}" fill-opacity="0.35" stroke="${colors.accent}" stroke-width="1.5" />
                <text x="${sx + shopW / 2}" y="${floorY + floorHeightPx * 0.4}" class="room-label" font-size="10" fill="${colors.textPrimary}">CADDE DÜKKANI ${sIdx + 1}</text>
                <text x="${sx + shopW / 2}" y="${floorY + floorHeightPx * 0.65}" class="room-sub" font-size="8" fill="${colors.textSecondary}">CAM VİTRİN & OTOMATİK KAPI</text>
              `;
            })
            .join('')}
        `;
      } else {
        // Pure Residential Ground Floor Entrance Portal (Prestigious Lobby & Canopy)
        const portalW = Math.max(100, bldgW * 0.28);
        const portalX = startX + (bldgW - portalW) / 2;
        content += `
          <!-- Ground Residential Main Entrance Portal -->
          <rect x="${portalX}" y="${floorY + 6}" width="${portalW}" height="${floorHeightPx - 6}" fill="${colors.accent}" fill-opacity="0.15" stroke="${colors.accent}" stroke-width="2" />
          <!-- Cantilever Canopy above entrance -->
          <rect x="${portalX - 10}" y="${floorY - 6}" width="${portalW + 20}" height="8" fill="${colors.outerBorder}" />
          <!-- 1.80m Double Glass Entrance Door -->
          <rect x="${portalX + portalW * 0.2}" y="${floorY + 12}" width="${portalW * 0.6}" height="${floorHeightPx - 12}" fill="${colors.windowGlass}" fill-opacity="0.5" stroke="${colors.outerBorder}" stroke-width="1.5" />
          <line x1="${portalX + portalW * 0.5}" y1="${floorY + 12}" x2="${portalX + portalW * 0.5}" y2="${floorY + floorHeightPx}" stroke="${colors.outerBorder}" stroke-width="1.5" />
          <text x="${portalX + portalW / 2}" y="${floorY + floorHeightPx * 0.45}" class="room-label" font-size="9" fill="${colors.textPrimary}">BİNA ANA GİRİŞİ</text>
          <text x="${portalX + portalW / 2}" y="${floorY + floorHeightPx * 0.65}" class="room-sub" font-size="8" fill="${colors.accent}">1.80m Çift Kanat • TS 9111 Rampa</text>
        `;
      }
    } else {
      // Normal Residential Floors (Windows and Balconies)
      const windowCount = Math.max(3, Math.min(6, Math.round(facadeWidth / 3.5)));
      const winW = (bldgW * 0.62) / windowCount;
      const winH = floorHeightPx * 0.65;
      const winY = floorY + (floorHeightPx - winH) / 2;

      content += `
        <text x="${startX + 15}" y="${floorY + 16}" class="room-sub" font-size="9" fill="${colors.textSecondary}">${f}. KAT (NORMAL KAT)</text>

        <!-- Glass Balconies on edges -->
        <rect x="${startX + 25}" y="${floorY + floorHeightPx * 0.4}" width="${bldgW * 0.22}" height="${floorHeightPx * 0.6}" fill="${colors.roomFillBalcony}" stroke="${colors.accent}" stroke-width="1.2" />
        <rect x="${startX + bldgW - 25 - bldgW * 0.22}" y="${floorY + floorHeightPx * 0.4}" width="${bldgW * 0.22}" height="${floorHeightPx * 0.6}" fill="${colors.roomFillBalcony}" stroke="${colors.accent}" stroke-width="1.2" />

        <!-- Windows -->
        ${Array.from({ length: windowCount })
          .map((_, wIdx) => {
            const wx = startX + bldgW * 0.28 + wIdx * winW;
            return `
              <rect x="${wx + 3}" y="${winY}" width="${winW - 6}" height="${winH}" fill="${colors.windowGlass}" fill-opacity="0.4" stroke="${colors.wallStroke}" stroke-width="1.2" />
              <line x1="${wx + winW / 2}" y1="${winY}" x2="${wx + winW / 2}" y2="${winY + winH}" stroke="${colors.wallStroke}" stroke-width="1" />
            `;
          })
          .join('')}
      `;
    }
  }

  // Roof Structure
  const roofStartY = groundY - floorCount * floorHeightPx;
  if (roofType === 'mansard' || roofType === 'duplex') {
    content += `
      <!-- Mansard Terrace Penthouse -->
      <polygon points="${startX},${roofStartY} ${startX + 35},${roofStartY - 35} ${startX + bldgW - 35},${roofStartY - 35} ${startX + bldgW},${roofStartY}" fill="${colors.wallFill}" stroke="${colors.wallStroke}" stroke-width="2" />
      <rect x="${startX + bldgW * 0.3}" y="${roofStartY - 30}" width="${bldgW * 0.4}" height="25" fill="${colors.windowGlass}" stroke="${colors.accent}" stroke-width="1.2" />
      <text x="${startX + bldgW / 2}" y="${roofStartY - 14}" class="room-sub" font-size="9" fill="${colors.textPrimary}">MANSART ÇATI DUBLEKSİ & TERAS</text>
    `;
  } else {
    content += `
      <!-- Parapet Flat Roof -->
      <rect x="${startX - 4}" y="${roofStartY - 12}" width="${bldgW + 8}" height="12" fill="${colors.wallFill}" stroke="${colors.wallStroke}" stroke-width="1.5" />
      <text x="${startX + bldgW / 2}" y="${roofStartY - 2}" class="room-sub" font-size="8" fill="${colors.textSecondary}">PARAPET DUVARI (+${(floorCount * 2.9).toFixed(2)}m)</text>
    `;
  }

  // Bottom Dimension Line
  content += `
    <g id="elevation-bottom-dim">
      <line x1="${startX}" y1="${groundY + 35}" x2="${startX + bldgW}" y2="${groundY + 35}" stroke="${colors.dimensionLine}" stroke-width="1" />
      <line x1="${startX}" y1="${groundY + 28}" x2="${startX}" y2="${groundY + 42}" stroke="${colors.dimensionLine}" stroke-width="1.5" />
      <line x1="${startX + bldgW}" y1="${groundY + 28}" x2="${startX + bldgW}" y2="${groundY + 42}" stroke="${colors.dimensionLine}" stroke-width="1.5" />
      <text x="${startX + bldgW / 2}" y="${groundY + 52}" class="dim-text" fill="${colors.dimensionText}" text-anchor="middle">ÖN CEPHE GENİŞLİĞİ: ${facadeWidth}.00 METRE</text>
    </g>
  `;

  return content;
}

/**
 * GROUND COMMERCIAL FLOOR PLAN RENDERER
 */
function renderGroundShopSvg(
  projectData: DrawingProjectData,
  colors: ThemeColors,
  canvasW: number,
  canvasH: number
): string {
  const { facadeWidth = 14, facadeDepth = 18, shopCount = 1, hasGroundFloorShop = true } = projectData;

  const bldgW = Math.min(canvasW - 260, facadeWidth * 26);
  const bldgH = Math.min(canvasH - 240, facadeDepth * 26);
  const startX = (canvasW - bldgW) / 2;
  const startY = (canvasH - bldgH) / 2;

  const actualShopCount = hasGroundFloorShop ? Math.max(1, shopCount) : 1;
  const lobbyW = Math.max(130, bldgW * 0.24);
  const commercialW = bldgW - lobbyW;
  const shopW = commercialW / actualShopCount;

  let content = `
    <!-- STREET PAVEMENT (CADDE & YOL) -->
    <rect x="${startX - 40}" y="${startY + bldgH + 10}" width="${bldgW + 80}" height="45" fill="${colors.roomFillCorridor}" stroke="${colors.outerBorder}" stroke-width="1" />
    <text x="${startX + bldgW / 2}" y="${startY + bldgH + 36}" class="dim-text" fill="${colors.textPrimary}" text-anchor="middle">▼ İMAR YOLU & YAYA KALDIRIMI (CADDE CEPHESİ) ▼</text>

    <!-- EXTERIOR BUILDING PERIMETER -->
    <rect x="${startX}" y="${startY}" width="${bldgW}" height="${bldgH}" fill="${colors.bg}" stroke="${colors.wallStroke}" stroke-width="2.5" />

    <!-- RESIDENTIAL LOBBY ENTRANCE (BİNA GİRİŞİ) -->
    <g id="residential-lobby">
      <rect x="${startX}" y="${startY}" width="${lobbyW}" height="${bldgH}" fill="${colors.roomFillCorridor}" stroke="${colors.innerWallStroke}" stroke-width="1.5" />
      <text x="${startX + lobbyW / 2}" y="${startY + 35}" class="room-label" fill="${colors.textPrimary}">KONUT GİRİŞİ</text>
      <text x="${startX + lobbyW / 2}" y="${startY + 50}" class="room-sub" fill="${colors.textSecondary}">1.80m Çift Kanat • TS 9111 Rampa</text>

      <!-- Stairs & Elevator in Lobby -->
      <rect x="${startX + 15}" y="${startY + bldgH * 0.35}" width="${lobbyW - 30}" height="${bldgH * 0.4}" fill="${colors.wallFill}" stroke="${colors.accent}" stroke-width="1.2" />
      <line x1="${startX + 15}" y1="${startY + bldgH * 0.35}" x2="${startX + lobbyW - 15}" y2="${startY + bldgH * 0.75}" stroke="${colors.elevatorCross}" stroke-width="1" />
      <line x1="${startX + 15}" y1="${startY + bldgH * 0.75}" x2="${startX + lobbyW - 15}" y2="${startY + bldgH * 0.35}" stroke="${colors.elevatorCross}" stroke-width="1" />
      <text x="${startX + lobbyW / 2}" y="${startY + bldgH * 0.52}" class="room-sub" font-weight="bold" fill="${colors.textPrimary}">ASANSÖR & MERDİVEN</text>
      <text x="${startX + lobbyW / 2}" y="${startY + bldgH * 0.62}" class="tag-badge" font-size="7" fill="${colors.accent}">800 kg SEDYE UYUMLU</text>
    </g>
  `;

  // Commercial Shops
  for (let s = 0; s < actualShopCount; s++) {
    const sx = startX + lobbyW + s * shopW;
    content += `
      <g id="shop-${s + 1}">
        <!-- Shop Space -->
        <rect x="${sx}" y="${startY}" width="${shopW}" height="${bldgH}" fill="${colors.roomFillLiving}" stroke="${colors.innerWallStroke}" stroke-width="1.5" />

        <!-- Shop Name & Area -->
        <text x="${sx + shopW / 2}" y="${startY + bldgH * 0.28}" class="room-label" fill="${colors.textPrimary}">DÜKKAN / MAĞAZA ${s + 1}</text>
        <text x="${sx + shopW / 2}" y="${startY + bldgH * 0.28 + 18}" class="room-sub" fill="${colors.textSecondary}">
          Net Alan: ~${((facadeWidth * facadeDepth * 0.75) / actualShopCount).toFixed(1)} m²
        </text>

        <!-- Back Storage & WC -->
        <rect x="${sx + 10}" y="${startY + 10}" width="${shopW * 0.4}" height="45" fill="${colors.roomFillBath}" stroke="${colors.innerWallStroke}" stroke-width="1" />
        <text x="${sx + 10 + (shopW * 0.4) / 2}" y="${startY + 36}" class="room-sub" font-size="8" fill="${colors.textPrimary}">DEPO & WC</text>

        <!-- Glass Shopfront Vitrine -->
        <rect x="${sx + 6}" y="${startY + bldgH - 12}" width="${shopW - 12}" height="10" fill="${colors.windowGlass}" stroke="${colors.accent}" stroke-width="2" />
        <text x="${sx + shopW / 2}" y="${startY + bldgH - 18}" class="room-sub" font-size="9" fill="${colors.accent}">CAM VİTRİN & GİRİŞ</text>
      </g>
    `;
  }

  return content;
}

/**
 * 3D ISOMETRIC / AXONOMETRIC RENDERER
 */
function renderIsometricSvg(
  projectData: DrawingProjectData,
  colors: ThemeColors,
  canvasW: number,
  canvasH: number
): string {
  const { facadeWidth = 14, facadeDepth = 18, flatsPerFloor = 2 } = projectData;

  const centerX = canvasW / 2;
  const centerY = canvasH / 2 + 30;

  const isoScale = Math.min(22, 450 / Math.max(facadeWidth, facadeDepth));
  const isoW = facadeWidth * isoScale;
  const isoD = facadeDepth * isoScale;

  const pTop = { x: centerX, y: centerY - (isoW + isoD) * 0.28 };
  const pRight = { x: centerX + isoW * 0.86, y: centerY - (isoD - isoW) * 0.28 };
  const pBottom = { x: centerX, y: centerY + (isoW + isoD) * 0.28 };
  const pLeft = { x: centerX - isoD * 0.86, y: centerY + (isoD - isoW) * 0.28 };

  const slabDepth = 25;

  return `
    <!-- 3D ISOMETRIC SLAB THICKNESS -->
    <polygon points="${pLeft.x},${pLeft.y} ${pBottom.x},${pBottom.y} ${pBottom.x},${pBottom.y + slabDepth} ${pLeft.x},${pLeft.y + slabDepth}" fill="${colors.wallFill}" stroke="${colors.outerBorder}" stroke-width="1.5" />
    <polygon points="${pBottom.x},${pBottom.y} ${pRight.x},${pRight.y} ${pRight.x},${pRight.y + slabDepth} ${pBottom.x},${pBottom.y + slabDepth}" fill="${colors.columnFill}" stroke="${colors.outerBorder}" stroke-width="1.5" />

    <!-- TOP CUTAWAY FLOOR SURFACE -->
    <polygon points="${pTop.x},${pTop.y} ${pRight.x},${pRight.y} ${pBottom.x},${pBottom.y} ${pLeft.x},${pLeft.y}" fill="${colors.roomFillLiving}" stroke="${colors.outerBorder}" stroke-width="2" />

    <!-- ISOMETRIC INTERNAL PARTITION WALLS -->
    <line x1="${centerX}" y1="${centerY}" x2="${pTop.x}" y2="${pTop.y}" stroke="${colors.innerWallStroke}" stroke-width="3" />
    <line x1="${centerX}" y1="${centerY}" x2="${pBottom.x}" y2="${pBottom.y}" stroke="${colors.innerWallStroke}" stroke-width="3" />
    <line x1="${centerX}" y1="${centerY}" x2="${pLeft.x}" y2="${pLeft.y}" stroke="${colors.innerWallStroke}" stroke-width="3" />
    <line x1="${centerX}" y1="${centerY}" x2="${pRight.x}" y2="${pRight.y}" stroke="${colors.innerWallStroke}" stroke-width="3" />

    <!-- CENTRAL CORE EXTENSION -->
    <rect x="${centerX - 40}" y="${centerY - 28}" width="80" height="56" fill="${colors.roomFillCorridor}" stroke="${colors.accent}" stroke-width="2" rx="4" />
    <text x="${centerX}" y="${centerY + 4}" class="room-sub" font-size="9" font-weight="bold" fill="${colors.textPrimary}">ASANSÖR & MERDİVEN</text>

    <!-- LABELS -->
    <text x="${centerX - 90}" y="${centerY - 45}" class="room-label" fill="${colors.textPrimary}">DAİRE 1 (3+1)</text>
    <text x="${centerX + 90}" y="${centerY - 45}" class="room-label" fill="${colors.textPrimary}">DAİRE 2 (3+1)</text>
    <text x="${centerX}" y="${pBottom.y + 55}" class="dim-text" fill="${colors.dimensionText}" text-anchor="middle">AKSONOMETRİK 3D MİMARİ KESİT (KATTA ${flatsPerFloor} DAİRE)</text>
  `;
}
