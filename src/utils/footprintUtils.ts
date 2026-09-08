import {
  CustomFacadeSide,
  FootprintInputMode,
  PolygonPoint,
  FacadeDetailConfig,
  GeometricValidationResult,
} from '../types';

export const DEFAULT_CUSTOM_FACADES_4: CustomFacadeSide[] = [
  { id: 1, name: '1. Ön Cephe (Yol / Ana Giriş)', length: 14.0, windowCountPerFloor: 3, hasBalcony: true, balconyCountPerFloor: 1, isEntrance: true },
  { id: 2, name: '2. Sağ Yan Cephe (Komşu / Çekme Payı)', length: 18.0, windowCountPerFloor: 4, hasBalcony: true, balconyCountPerFloor: 1, isEntrance: false },
  { id: 3, name: '3. Arka Cephe (Bahçe / Arka Parsel)', length: 14.0, windowCountPerFloor: 3, hasBalcony: true, balconyCountPerFloor: 1, isEntrance: false },
  { id: 4, name: '4. Sol Yan Cephe (Komşu / Çekme Payı)', length: 18.0, windowCountPerFloor: 4, hasBalcony: false, balconyCountPerFloor: 0, isEntrance: false },
];

export const DEFAULT_CUSTOM_FACADES_5: CustomFacadeSide[] = [
  { id: 1, name: '1. Ön Cephe (Ana Yol)', length: 14.0, windowCountPerFloor: 3, hasBalcony: true, balconyCountPerFloor: 1, isEntrance: true },
  { id: 2, name: '2. Sağ Ön Köşe Cephe (Pah / Kırılım)', length: 6.0, windowCountPerFloor: 1, hasBalcony: false, balconyCountPerFloor: 0, isEntrance: false },
  { id: 3, name: '3. Sağ Yan Cephe', length: 13.0, windowCountPerFloor: 3, hasBalcony: true, balconyCountPerFloor: 1, isEntrance: false },
  { id: 4, name: '4. Arka Cephe (Bahçe)', length: 10.0, windowCountPerFloor: 2, hasBalcony: true, balconyCountPerFloor: 1, isEntrance: false },
  { id: 5, name: '5. Sol Yan Cephe', length: 18.0, windowCountPerFloor: 4, hasBalcony: false, balconyCountPerFloor: 0, isEntrance: false },
];

export const DEFAULT_CUSTOM_FACADES_6: CustomFacadeSide[] = [
  { id: 1, name: '1. Ön Cephe (Ana Kütle)', length: 16.0, windowCountPerFloor: 4, hasBalcony: true, balconyCountPerFloor: 1, isEntrance: true },
  { id: 2, name: '2. Sağ Yan Cephe (Boyuna)', length: 20.0, windowCountPerFloor: 4, hasBalcony: true, balconyCountPerFloor: 1, isEntrance: false },
  { id: 3, name: '3. Arka Cephe (Geniş Kanat)', length: 9.0, windowCountPerFloor: 2, hasBalcony: true, balconyCountPerFloor: 1, isEntrance: false },
  { id: 4, name: '4. İç Girinti Cephesi (I. Kırılım)', length: 7.0, windowCountPerFloor: 1, hasBalcony: false, balconyCountPerFloor: 0, isEntrance: false },
  { id: 5, name: '5. İç Girinti Yan Cephesi (II. Kırılım)', length: 7.0, windowCountPerFloor: 1, hasBalcony: false, balconyCountPerFloor: 0, isEntrance: false },
  { id: 6, name: '6. Sol Yan Cephe (Kısa Kanat)', length: 13.0, windowCountPerFloor: 3, hasBalcony: true, balconyCountPerFloor: 1, isEntrance: false },
];

export const DEFAULT_CUSTOM_FACADES_8: CustomFacadeSide[] = [
  { id: 1, name: '1. Ön Cephe (Ana Giriş)', length: 12.0, windowCountPerFloor: 3, hasBalcony: true, balconyCountPerFloor: 1, isEntrance: true },
  { id: 2, name: '2. Sağ Ön Köşe Cephesi', length: 4.0, windowCountPerFloor: 1, hasBalcony: false, balconyCountPerFloor: 0, isEntrance: false },
  { id: 3, name: '3. Sağ Yan Cephe', length: 14.0, windowCountPerFloor: 3, hasBalcony: true, balconyCountPerFloor: 1, isEntrance: false },
  { id: 4, name: '4. Sağ Arka Köşe Cephesi', length: 4.0, windowCountPerFloor: 1, hasBalcony: false, balconyCountPerFloor: 0, isEntrance: false },
  { id: 5, name: '5. Arka Cephe', length: 12.0, windowCountPerFloor: 3, hasBalcony: true, balconyCountPerFloor: 1, isEntrance: false },
  { id: 6, name: '6. Sol Arka Köşe Cephesi', length: 4.0, windowCountPerFloor: 1, hasBalcony: false, balconyCountPerFloor: 0, isEntrance: false },
  { id: 7, name: '7. Sol Yan Cephe', length: 14.0, windowCountPerFloor: 3, hasBalcony: false, balconyCountPerFloor: 0, isEntrance: false },
  { id: 8, name: '8. Sol Ön Köşe Cephesi', length: 4.0, windowCountPerFloor: 1, hasBalcony: false, balconyCountPerFloor: 0, isEntrance: false },
];

// Presets for 2D Interactive Polygon Drawer (coordinates in meters centered at 0,0)
export const POLYGON_PRESETS: Record<string, { name: string; points: PolygonPoint[] }> = {
  rectangle: {
    name: 'Dikdörtgen (14m × 18m)',
    points: [
      { id: 'p1', x: -7, y: -9 },
      { id: 'p2', x: 7, y: -9 },
      { id: 'p3', x: 7, y: 9 },
      { id: 'p4', x: -7, y: 9 },
    ],
  },
  lShape: {
    name: 'L-Tipi Kütle (6 Köşe)',
    points: [
      { id: 'p1', x: -8, y: -10 },
      { id: 'p2', x: 8, y: -10 },
      { id: 'p3', x: 8, y: 2 },
      { id: 'p4', x: 0, y: 2 },
      { id: 'p5', x: 0, y: 10 },
      { id: 'p6', x: -8, y: 10 },
    ],
  },
  chamfer: {
    name: 'Köşe Pahlı / 5 Cepheli',
    points: [
      { id: 'p1', x: -7, y: -9 },
      { id: 'p2', x: 3, y: -9 },
      { id: 'p3', x: 7, y: -5 },
      { id: 'p4', x: 7, y: 9 },
      { id: 'p5', x: -7, y: 9 },
    ],
  },
  trapezoid: {
    name: 'Açılı / Yamuk Parsel',
    points: [
      { id: 'p1', x: -6, y: -9 },
      { id: 'p2', x: 8, y: -9 },
      { id: 'p3', x: 5, y: 9 },
      { id: 'p4', x: -8, y: 9 },
    ],
  },
  uShape: {
    name: 'U-Tipi İç Avlulu (8 Köşe)',
    points: [
      { id: 'p1', x: -9, y: -9 },
      { id: 'p2', x: 9, y: -9 },
      { id: 'p3', x: 9, y: 9 },
      { id: 'p4', x: 4, y: 9 },
      { id: 'p5', x: 4, y: -1 },
      { id: 'p6', x: -4, y: -1 },
      { id: 'p7', x: -4, y: 9 },
      { id: 'p8', x: -9, y: 9 },
    ],
  },
  tShape: {
    name: 'T-Tipi Kanatlı (8 Köşe)',
    points: [
      { id: 'p1', x: -9, y: -9 },
      { id: 'p2', x: 9, y: -9 },
      { id: 'p3', x: 9, y: -2 },
      { id: 'p4', x: 4, y: -2 },
      { id: 'p5', x: 4, y: 9 },
      { id: 'p6', x: -4, y: 9 },
      { id: 'p7', x: -4, y: -2 },
      { id: 'p8', x: -9, y: -2 },
    ],
  },
};

/**
 * Calculates polygon area using the Shoelace (Gauss) formula.
 * Returns positive area in m².
 */
export function calculatePolygonArea(points: PolygonPoint[]): number {
  if (!points || points.length < 3) return 0;
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Calculates perimeter of polygon in meters.
 */
export function calculatePolygonPerimeter(points: PolygonPoint[]): number {
  if (!points || points.length < 2) return 0;
  let perimeter = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = points[j].x - points[i].x;
    const dy = points[j].y - points[i].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter;
}

/**
 * Calculates each edge's length and metadata from polygon points.
 */
export function getPolygonEdges(points: PolygonPoint[]): {
  id: number;
  startIndex: number;
  endIndex: number;
  start: PolygonPoint;
  end: PolygonPoint;
  length: number;
  midpoint: { x: number; y: number };
  angleDeg: number;
}[] {
  if (!points || points.length < 2) return [];
  const edges = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const p1 = points[i];
    const p2 = points[j];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    edges.push({
      id: i + 1,
      startIndex: i,
      endIndex: j,
      start: p1,
      end: p2,
      length: Math.round(len * 10) / 10,
      midpoint: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
      angleDeg: Math.round(angle),
    });
  }
  return edges;
}

/**
 * Returns bounding box for polygon points.
 */
export function getPolygonBounds(points: PolygonPoint[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  depth: number;
  centerX: number;
  centerY: number;
} {
  if (!points || points.length === 0) {
    return { minX: -7, maxX: 7, minY: -9, maxY: 9, width: 14, depth: 18, centerX: 0, centerY: 0 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const width = Math.max(1, maxX - minX);
  const depth = Math.max(1, maxY - minY);
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: Math.round(width * 10) / 10,
    depth: Math.round(depth * 10) / 10,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

/**
 * Ray-casting algorithm to test if point (px, py) is inside polygon points.
 */
export function isPointInPolygon(px: number, py: number, points: PolygonPoint[]): boolean {
  if (!points || points.length < 3) return false;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;

    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Helper: Tests whether line segment p1-p2 intersects line segment p3-p4 (excluding endpoints).
 */
export function checkLineSegmentsIntersect(
  p1: PolygonPoint,
  p2: PolygonPoint,
  p3: PolygonPoint,
  p4: PolygonPoint
): boolean {
  function ccw(A: PolygonPoint, B: PolygonPoint, C: PolygonPoint) {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  }

  if (
    (Math.abs(p1.x - p3.x) < 0.01 && Math.abs(p1.y - p3.y) < 0.01) ||
    (Math.abs(p1.x - p4.x) < 0.01 && Math.abs(p1.y - p4.y) < 0.01) ||
    (Math.abs(p2.x - p3.x) < 0.01 && Math.abs(p2.y - p3.y) < 0.01) ||
    (Math.abs(p2.x - p4.x) < 0.01 && Math.abs(p2.y - p4.y) < 0.01)
  ) {
    return false;
  }

  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
    ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}

/**
 * Checks if a polygon contains any self-intersecting edges.
 */
export function checkSelfIntersection(points: PolygonPoint[]): boolean {
  if (!points || points.length < 4) return false;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];

    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const p3 = points[j];
      const p4 = points[(j + 1) % n];

      if (checkLineSegmentsIntersect(p1, p2, p3, p4)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Checks if all internal corners of the polygon are convex.
 */
export function checkIsConvex(points: PolygonPoint[]): boolean {
  if (!points || points.length < 3) return false;
  const n = points.length;
  let sign = 0;

  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    const dx1 = p2.x - p1.x;
    const dy1 = p2.y - p1.y;
    const dx2 = p3.x - p2.x;
    const dy2 = p3.y - p2.y;

    const cross = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(cross) > 1e-6) {
      const currentSign = cross > 0 ? 1 : -1;
      if (sign === 0) {
        sign = currentSign;
      } else if (sign !== currentSign) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Checks if all edges are orthogonal (aligned within tolerance to 0°, 90°, 180°, 270°).
 */
export function checkIsOrthogonal(points: PolygonPoint[], toleranceDeg = 6): boolean {
  if (!points || points.length < 3) return false;
  const edges = getPolygonEdges(points);
  for (const edge of edges) {
    const normAngle = Math.abs(edge.angleDeg) % 90;
    const diff = Math.min(normAngle, 90 - normAngle);
    if (diff > toleranceDeg) {
      return false;
    }
  }
  return true;
}

/**
 * Geometric Normalization & Structural Grid Alignment Engine.
 * Cross-references 2D coordinates with 3D structural requirements,
 * snapping near-orthogonal edges, removing collinear vertices, enforcing CCW winding,
 * and aligning coordinates to the structural grid (e.g., 0.5m).
 */
export function normalizePolygonAndAlignToGrid(
  points: PolygonPoint[],
  options?: {
    gridStep?: number;
    angleSnapToleranceDeg?: number;
    minEdgeLength?: number;
  }
): { normalizedPoints: PolygonPoint[]; actionsTaken: string[] } {
  if (!points || points.length < 3) {
    return { normalizedPoints: points || [], actionsTaken: [] };
  }

  const gridStep = options?.gridStep ?? 0.5;
  const angleSnapTolerance = options?.angleSnapToleranceDeg ?? 8;
  const minEdgeLength = options?.minEdgeLength ?? 0.5;
  const actionsTaken: string[] = [];

  // 1. Clean duplicate points (< 0.15m apart)
  let cleanPts: PolygonPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const prev = cleanPts[cleanPts.length - 1];
    if (!prev || Math.hypot(curr.x - prev.x, curr.y - prev.y) >= 0.15) {
      cleanPts.push({ ...curr });
    }
  }
  if (cleanPts.length > 1) {
    const first = cleanPts[0];
    const last = cleanPts[cleanPts.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) < 0.15) {
      cleanPts.pop();
    }
  }
  if (cleanPts.length < points.length) {
    actionsTaken.push(`${points.length - cleanPts.length} adet çakışan köşe noktası temizlendi.`);
  }

  if (cleanPts.length < 3) {
    cleanPts = POLYGON_PRESETS.rectangle.points;
  }

  // 2. Remove collinear adjacent points
  let nonCollinearPts: PolygonPoint[] = [];
  const n0 = cleanPts.length;
  for (let i = 0; i < n0; i++) {
    const prev = cleanPts[(i - 1 + n0) % n0];
    const curr = cleanPts[i];
    const next = cleanPts[(i + 1) % n0];

    const v1x = curr.x - prev.x, v1y = curr.y - prev.y;
    const v2x = next.x - curr.x, v2y = next.y - curr.y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);

    if (len1 > 0.001 && len2 > 0.001) {
      const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
      if (Math.abs(dot) > 0.996) {
        continue;
      }
    }
    nonCollinearPts.push(curr);
  }
  if (nonCollinearPts.length < cleanPts.length && nonCollinearPts.length >= 3) {
    actionsTaken.push(`${cleanPts.length - nonCollinearPts.length} adet doğrusal (collinear) ara nokta birleştirildi.`);
    cleanPts = nonCollinearPts;
  }

  // 3. Ensure Counter-Clockwise (CCW) winding order
  let signedArea = 0;
  const n1 = cleanPts.length;
  for (let i = 0; i < n1; i++) {
    const j = (i + 1) % n1;
    signedArea += cleanPts[i].x * cleanPts[j].y - cleanPts[j].x * cleanPts[i].y;
  }
  if (signedArea < 0) {
    cleanPts.reverse();
    actionsTaken.push('Poligon saat yönünün tersi (CCW) standart koordinat dizilimine çevrildi.');
  }

  // 4. Near-orthogonal and 45-degree angle snapping
  let angleSnapped = false;
  const snappedPts = cleanPts.map(p => ({ ...p }));
  for (let i = 0; i < n1; i++) {
    const p1 = snappedPts[i];
    const p2 = snappedPts[(i + 1) % n1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < minEdgeLength) continue;

    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const absAngle = (angleDeg + 360) % 360;

    const targetAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
    let closestTarget = absAngle;
    let minDiff = Infinity;

    for (const tgt of targetAngles) {
      const diff = Math.abs(absAngle - tgt);
      if (diff < minDiff) {
        minDiff = diff;
        closestTarget = tgt % 360;
      }
    }

    if (minDiff > 0.2 && minDiff <= angleSnapTolerance) {
      const rad = (closestTarget * Math.PI) / 180;
      p2.x = Math.round((p1.x + Math.cos(rad) * len) * 100) / 100;
      p2.y = Math.round((p1.y + Math.sin(rad) * len) * 100) / 100;
      angleSnapped = true;
    }
  }
  if (angleSnapped) {
    actionsTaken.push(`Kenar açıları dik (90°) ve 45° akslarına hizalandı.`);
  }

  // 5. Align coordinates to Structural Grid step (e.g., 0.5m / 0.25m)
  const finalPts = snappedPts.map(p => {
    const snappedX = Math.round(p.x / gridStep) * gridStep;
    const snappedY = Math.round(p.y / gridStep) * gridStep;
    return {
      ...p,
      x: Math.round(snappedX * 100) / 100,
      y: Math.round(snappedY * 100) / 100,
    };
  });
  actionsTaken.push(`Köşe koordinatları ${gridStep}m aks ızgarasına sabitlendi.`);

  return {
    normalizedPoints: finalPts,
    actionsTaken,
  };
}

/**
 * Geometric Validation Engine
 * Cross-references 2D floor plan polygon coordinates against 3D model footprint rules.
 */
export function validatePolygonFootprint(
  points: PolygonPoint[],
  gridStep = 0.5
): GeometricValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (!points || points.length < 3) {
    return {
      isValid: false,
      healthScore: 0,
      issues: ['Poligon en az 3 köşe noktasından oluşmalıdır.'],
      warnings: [],
      recommendations: ['Lütfen 2D çizim ekranında en az 3 nokta tanımlayınız.'],
      metrics: {
        area: 0,
        perimeter: 0,
        edgeCount: 0,
        boundingBox: { width: 0, depth: 0, centerX: 0, centerY: 0 },
        centroid: { x: 0, y: 0 },
        isSelfIntersecting: false,
        isConvex: true,
        isOrthogonal: true,
        minEdgeLength: 0,
        maxEdgeLength: 0,
        avgEdgeLength: 0,
      },
      gridAlignment: {
        totalVertices: 0,
        alignedVertices: 0,
        alignmentPercentage: 0,
        axesX: [],
        axesY: [],
      },
    };
  }

  const area = calculatePolygonArea(points);
  const perimeter = calculatePolygonPerimeter(points);
  const edges = getPolygonEdges(points);
  const bounds = getPolygonBounds(points);
  const centroid = getPolygonCentroid(points);
  const isSelfIntersecting = checkSelfIntersection(points);
  const isConvex = checkIsConvex(points);
  const isOrthogonal = checkIsOrthogonal(points, 6);

  const edgeLengths = edges.map(e => e.length);
  const minEdgeLength = Math.min(...edgeLengths);
  const maxEdgeLength = Math.max(...edgeLengths);
  const avgEdgeLength = perimeter / points.length;

  let alignedCount = 0;
  const uniqueX = new Set<number>();
  const uniqueY = new Set<number>();

  points.forEach(p => {
    const remX = Math.abs(p.x % gridStep);
    const remY = Math.abs(p.y % gridStep);
    const alignedX = remX < 0.05 || Math.abs(remX - gridStep) < 0.05;
    const alignedY = remY < 0.05 || Math.abs(remY - gridStep) < 0.05;

    if (alignedX && alignedY) {
      alignedCount++;
    }
    uniqueX.add(Math.round(p.x / gridStep) * gridStep);
    uniqueY.add(Math.round(p.y / gridStep) * gridStep);
  });

  const alignmentPercentage = Math.round((alignedCount / points.length) * 100);

  let healthScore = 100;

  if (isSelfIntersecting) {
    healthScore -= 50;
    issues.push('Poligon kenarları birbiriyle kesişmektedir (Kendi kendini kesen poligon).');
    recommendations.push('Kesişen köşe noktalarını taşıyarak düzeltin veya "Otomatik Düzelt" butonunu kullanın.');
  }

  if (area < 10) {
    healthScore -= 30;
    issues.push(`Taban oturum alanı çok küçük (${area.toFixed(1)} m² < 10 m²).`);
  }

  if (minEdgeLength < 0.8) {
    healthScore -= 15;
    warnings.push(`Poligonda çok kısa kenar mevcut (${minEdgeLength.toFixed(2)} m).`);
    recommendations.push('0.8m altındaki kısa kenarlar taşıyıcı kolon yerleşimini zorlaştırabilir.');
  }

  if (!isOrthogonal && points.length <= 8) {
    healthScore -= 10;
    warnings.push('Bazı kenar açıları 90° / 45° dik akslardan hafif açıyla sapmaktadır.');
    recommendations.push('Kenarları akslara tam hizalamak için "Izgaraya Hizala" özelliğini uygulayınız.');
  }

  if (alignmentPercentage < 80) {
    healthScore -= 10;
    warnings.push(`Köşelerin %${100 - alignmentPercentage}'si ${gridStep}m yapısal ızgara dışında kalmaktadır.`);
  }

  if (!isConvex) {
    warnings.push('Poligonda iç bükey (L/T tipi girintili) mimari kırılımlar bulunmaktadır.');
  }

  healthScore = Math.max(0, Math.min(100, healthScore));
  const isValid = issues.length === 0;

  return {
    isValid,
    healthScore,
    issues,
    warnings,
    recommendations,
    metrics: {
      area: Math.round(area * 10) / 10,
      perimeter: Math.round(perimeter * 10) / 10,
      edgeCount: points.length,
      boundingBox: {
        width: bounds.width,
        depth: bounds.depth,
        centerX: bounds.centerX,
        centerY: bounds.centerY,
      },
      centroid: {
        x: Math.round(centroid.x * 100) / 100,
        y: Math.round(centroid.y * 100) / 100,
      },
      isSelfIntersecting,
      isConvex,
      isOrthogonal,
      minEdgeLength: Math.round(minEdgeLength * 10) / 10,
      maxEdgeLength: Math.max(...edgeLengths),
      avgEdgeLength: Math.round(avgEdgeLength * 10) / 10,
    },
    gridAlignment: {
      totalVertices: points.length,
      alignedVertices: alignedCount,
      alignmentPercentage,
      axesX: Array.from(uniqueX).sort((a, b) => a - b),
      axesY: Array.from(uniqueY).sort((a, b) => a - b),
    },
  };
}

/**
 * Calculates geometric centroid (center of mass) of polygon points.
 */
export function getPolygonCentroid(points: PolygonPoint[]): { x: number; y: number } {
  if (!points || points.length === 0) return { x: 0, y: 0 };
  let area = 0;
  let cx = 0;
  let cy = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const p1 = points[i];
    const p2 = points[j];
    const cross = (p1.x * p2.y - p2.x * p1.y);
    area += cross;
    cx += (p1.x + p2.x) * cross;
    cy += (p1.y + p2.y) * cross;
  }

  area /= 2;
  if (Math.abs(area) < 0.0001) {
    let sumX = 0, sumY = 0;
    points.forEach(p => { sumX += p.x; sumY += p.y; });
    return { x: sumX / n, y: sumY / n };
  }

  cx = cx / (6 * area);
  cy = cy / (6 * area);
  return { x: cx, y: cy };
}

/**
 * Generates initial or synced FacadeDetailConfigs for all polygon edges.
 */
export function generateFacadeConfigs(
  edgesCountOrSides: number | CustomFacadeSide[] | PolygonPoint[],
  existingConfigs?: FacadeDetailConfig[],
  mainEntranceIndex = 0
): FacadeDetailConfig[] {
  let count = 4;
  let lengths: number[] = [];
  let names: string[] = [];

  if (Array.isArray(edgesCountOrSides)) {
    if (edgesCountOrSides.length > 0 && 'length' in edgesCountOrSides[0]) {
      // CustomFacadeSide[]
      const sides = edgesCountOrSides as CustomFacadeSide[];
      count = sides.length;
      lengths = sides.map((s) => s.length || 10);
      names = sides.map((s, i) => s.name || `${i + 1}. Cephe`);
    } else if (edgesCountOrSides.length > 0 && 'x' in edgesCountOrSides[0]) {
      // PolygonPoint[]
      const pts = edgesCountOrSides as PolygonPoint[];
      const edges = getPolygonEdges(pts);
      count = edges.length;
      lengths = edges.map((e) => e.length);
      names = edges.map((e, i) => `${i + 1}. Cephe (${e.length}m)`);
    }
  } else if (typeof edgesCountOrSides === 'number') {
    count = edgesCountOrSides;
    lengths = Array(count).fill(14);
    names = Array.from({ length: count }, (_, i) => `${i + 1}. Cephe`);
  }

  return Array.from({ length: count }, (_, i) => {
    const existing = existingConfigs?.[i];
    const len = lengths[i] || existing?.length || 14;
    const defaultWindows = Math.max(1, Math.min(6, Math.floor(len / 3.5)));
    const isEntrance = (existing?.isEntrance !== undefined) ? existing.isEntrance : (i === mainEntranceIndex);
    
    // Determine window count first
    const windowCountPerFloor = existing?.windowCountPerFloor !== undefined ? existing.windowCountPerFloor : defaultWindows;
    
    // Under TR regulations, adjacent or blind facades (0 windows) cannot have balconies, windows or cantilevers
    const isAdjacent = existing?.isAdjacent ?? false;
    const isBlankWall = existing?.isBlankWall ?? isAdjacent;
    const isBlind = windowCountPerFloor === 0 || isBlankWall || isAdjacent;
    
    const hasBalcony = isBlind ? false : ((existing?.hasBalcony !== undefined) ? existing.hasBalcony : (len >= 6 && i !== 2));
    const balconyCountPerFloor = isBlind ? 0 : (existing?.balconyCountPerFloor !== undefined ? existing.balconyCountPerFloor : (hasBalcony ? 1 : 0));
    const cantileverDepth = isBlind ? 0 : (existing?.cantileverDepth !== undefined ? existing.cantileverDepth : 1.2);

    return {
      id: i + 1,
      name: existing?.name || names[i] || `${i + 1}. Cephe`,
      length: len,
      windowCountPerFloor: isBlind ? 0 : windowCountPerFloor,
      hasBalcony,
      balconyCountPerFloor,
      balconyType: existing?.balconyType || 'standard',
      isEntrance,
      isAdjacent,
      isBlankWall,
      cantileverDepth,
    };
  });
}

/**
 * Synchronizes polygon edges to custom facades dynamically when polygon has N vertices/edges.
 */
export function syncPolygonToCustomFacades(
  points: PolygonPoint[],
  existingFacades?: CustomFacadeSide[],
  facadeConfigs?: FacadeDetailConfig[],
  mainEntranceIndex = 0
): CustomFacadeSide[] {
  if (!points || points.length < 3) return existingFacades || [];
  const edges = getPolygonEdges(points);
  return edges.map((edge, idx) => {
    const existingSide = existingFacades?.[idx];
    const existingCfg = facadeConfigs?.[idx];
    const isEntrance = (existingCfg?.isEntrance !== undefined)
      ? existingCfg.isEntrance
      : (existingSide?.isEntrance !== undefined ? existingSide.isEntrance : idx === mainEntranceIndex);

    let defaultName = `${idx + 1}. Cephe (${edge.length}m)`;
    if (idx === 0) defaultName = `1. Ön Cephe (Yol / Giriş - ${edge.length}m)`;
    else if (idx === 1) defaultName = `2. Sağ Yan Cephe (${edge.length}m)`;
    else if (idx === 2 && edges.length === 4) defaultName = `3. Arka Cephe (Bahçe - ${edge.length}m)`;
    else if (idx === 3 && edges.length === 4) defaultName = `4. Sol Yan Cephe (${edge.length}m)`;
    else if (idx === 2) defaultName = `3. Arka Cephe (${edge.length}m)`;

    const defaultWindows = Math.max(1, Math.min(6, Math.floor(edge.length / 3.5)));

    return {
      id: idx + 1,
      name: existingSide?.name || defaultName,
      length: edge.length,
      windowCountPerFloor: existingCfg?.windowCountPerFloor ?? existingSide?.windowCountPerFloor ?? defaultWindows,
      hasBalcony: existingCfg?.hasBalcony ?? existingSide?.hasBalcony ?? (idx === 0 || edge.length >= 6),
      balconyCountPerFloor: existingCfg?.balconyCountPerFloor ?? existingSide?.balconyCountPerFloor ?? 1,
      balconyType: existingCfg?.balconyType ?? existingSide?.balconyType ?? 'standard',
      isEntrance,
    };
  });
}

/**
 * Mathematically scales an edge's length by moving the target vertex along edge vector
 */
export function updatePolygonEdgeLength(
  points: PolygonPoint[],
  edgeIndex: number,
  newLength: number
): PolygonPoint[] {
  if (!points || points.length < 3 || edgeIndex < 0 || edgeIndex >= points.length) {
    return points;
  }
  const safeLen = Math.max(1.0, Math.min(80.0, typeof newLength === 'number' && !isNaN(newLength) ? newLength : 10.0));
  const n = points.length;
  const p1 = points[edgeIndex];
  const p2 = points[(edgeIndex + 1) % n];

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const curLen = Math.hypot(dx, dy);

  if (curLen < 0.001) return points;

  const scale = safeLen / curLen;
  const deltaX = dx * (scale - 1);
  const deltaY = dy * (scale - 1);

  const updated = points.map((p, idx) => {
    if (idx === (edgeIndex + 1) % n) {
      return {
        ...p,
        x: Math.round((p.x + deltaX) * 10) / 10,
        y: Math.round((p.y + deltaY) * 10) / 10,
      };
    }
    return p;
  });

  return updated;
}

export function getDefaultCustomFacades(count: number, width = 14, depth = 18, backWidth?: number, leftDepth?: number): CustomFacadeSide[] {
  if (count === 5) return DEFAULT_CUSTOM_FACADES_5;
  if (count === 6) return DEFAULT_CUSTOM_FACADES_6;
  if (count === 8) return DEFAULT_CUSTOM_FACADES_8;

  const bw = backWidth !== undefined && backWidth > 0 ? backWidth : (width > 0 ? width : 14.0);
  const ld = leftDepth !== undefined && leftDepth > 0 ? leftDepth : (depth > 0 ? depth : 18.0);

  // Default 4 sides
  return [
    { id: 1, name: '1. Ön Cephe (Yol / Giriş)', length: width > 0 ? width : 14.0, windowCountPerFloor: 3, hasBalcony: true, balconyCountPerFloor: 1, isEntrance: true },
    { id: 2, name: '2. Sağ Yan Cephe (Komşu/Çekme)', length: depth > 0 ? depth : 18.0, windowCountPerFloor: 4, hasBalcony: true, balconyCountPerFloor: 1, isEntrance: false },
    { id: 3, name: '3. Arka Cephe (Bahçe)', length: bw, windowCountPerFloor: 3, hasBalcony: true, balconyCountPerFloor: 1, isEntrance: false },
    { id: 4, name: '4. Sol Yan Cephe (Komşu/Çekme)', length: ld, windowCountPerFloor: 4, hasBalcony: false, balconyCountPerFloor: 0, isEntrance: false },
  ];
}

export interface QuadrilateralResult {
  polygonPoints: PolygonPoint[];
  front: number;
  right: number;
  back: number;
  left: number;
  area: number;
  perimeter: number;
  angles: { p1: number; p2: number; p3: number; p4: number };
  isSkewed: boolean;
  statusText: string;
}

/**
 * Calculates exact 2D quadrilateral polygon points (centered around origin)
 * and geometric properties from 4 facade edge lengths: front, right, back, left.
 * Applies strict boundary checks to prevent negative/NaN dimensions and enforce polygon closure rules.
 */
export function buildQuadrilateralPolygon(
  frontInput: number,
  rightInput: number,
  backInput?: number,
  leftInput?: number
): QuadrilateralResult {
  // Sınır kontrolü (QA kuralı: negatif ve aşırı değerler engellenir [1.0m - 150.0m])
  const L1 = Math.max(1.0, Math.min(150.0, typeof frontInput === 'number' && !isNaN(frontInput) && Number.isFinite(frontInput) ? frontInput : 10.0));
  const L2 = Math.max(1.0, Math.min(150.0, typeof rightInput === 'number' && !isNaN(rightInput) && Number.isFinite(rightInput) ? rightInput : 10.0));
  const L4 = Math.max(1.0, Math.min(150.0, typeof leftInput === 'number' && !isNaN(leftInput) && Number.isFinite(leftInput) ? leftInput : L2));

  // Dik açılı baz düzlemine göre doğal geometrik arka cephe uzunluğu:
  const defaultBack = Math.round(Math.sqrt(L1 * L1 + (L4 - L2) * (L4 - L2)) * 10) / 10;

  let L3 = backInput !== undefined && typeof backInput === 'number' && !isNaN(backInput) && Number.isFinite(backInput) && backInput > 0
    ? backInput
    : defaultBack;

  // Poligon eşitsizliği (bir kenar diğer üç kenarın toplamından küçük olmalıdır)
  const maxL3 = Math.max(1.0, L1 + L2 + L4 - 0.5);
  const minL3 = 1.0;
  L3 = Math.max(minL3, Math.min(maxL3, L3));

  let rawPoints: { x: number; y: number }[] = [];
  let actualL3 = L3;
  let isSkewed = false;

  const isRectangular = Math.abs(L1 - L3) < 0.1 && Math.abs(L2 - L4) < 0.1;
  const isRightTrapezoid = !isRectangular && Math.abs(L3 - defaultBack) < 0.15 && Math.abs(L2 - L4) >= 0.1;
  const isSymmetricTrapezoid = !isRectangular && Math.abs(L2 - L4) < 0.2 && Math.abs(L1 - L3) >= 0.1;

  if (isRectangular) {
    // 1. Düzenli Dikdörtgen veya Kare
    actualL3 = L3;
    isSkewed = false;
    rawPoints = [
      { x: 0, y: 0 },
      { x: L1, y: 0 },
      { x: L1, y: L2 },
      { x: 0, y: L4 },
    ];
  } else if (isRightTrapezoid) {
    // 2. Dik Açılı Yamuk (Yan cepheler öne dik, arka cephe hipotenüs düzleminde)
    actualL3 = L3;
    isSkewed = true;
    rawPoints = [
      { x: 0, y: 0 },
      { x: L1, y: 0 },
      { x: L1, y: L2 },
      { x: 0, y: L4 },
    ];
  } else if (isSymmetricTrapezoid) {
    // 3. Simetrik Yamuk (Arkaya daralan veya genişleyen form; örn: Ön=10m, Arka=8m, Yanlar=10m)
    actualL3 = L3;
    isSkewed = true;
    const deltaX = (L1 - L3) / 2;
    const sideLen = (L2 + L4) / 2;
    const hSq = Math.max(1.0, sideLen * sideLen - deltaX * deltaX);
    const H = Math.sqrt(hSq);
    rawPoints = [
      { x: 0, y: 0 },
      { x: L1, y: 0 },
      { x: L1 - deltaX, y: H },
      { x: deltaX, y: H },
    ];
  } else {
    // 4. Genel Asimetrik 4-Gen: Çember kesişimi veya orantılı daralma
    const d = Math.sqrt(L1 * L1 + L4 * L4);
    const minCircleL3 = Math.abs(d - L2);
    const maxCircleL3 = d + L2;

    if (L3 >= minCircleL3 && L3 <= maxCircleL3 && L4 > 0.5) {
      const k = L1 / L4;
      const C = (L2 * L2 - L3 * L3 + L4 * L4 - L1 * L1) / (2 * L4);
      const A = 1 + k * k;
      const B = 2 * (k * C - L1);
      const D_coef = L1 * L1 + C * C - L2 * L2;
      const delta = B * B - 4 * A * D_coef;

      if (delta >= 0) {
        const root1 = (-B + Math.sqrt(delta)) / (2 * A);
        const root2 = (-B - Math.sqrt(delta)) / (2 * A);
        const x3 = Math.max(root1, root2);
        const y3 = k * x3 + C;
        actualL3 = Math.round(Math.sqrt(x3 * x3 + (y3 - L4) * (y3 - L4)) * 10) / 10;
        isSkewed = true;
        rawPoints = [
          { x: 0, y: 0 },
          { x: L1, y: 0 },
          { x: x3, y: y3 },
          { x: 0, y: L4 },
        ];
      } else {
        const deltaX = (L1 - L3) / 2;
        const H = Math.sqrt(Math.max(1.0, L2 * L2 - deltaX * deltaX));
        actualL3 = L3;
        isSkewed = true;
        rawPoints = [
          { x: 0, y: 0 },
          { x: L1, y: 0 },
          { x: L1 - deltaX, y: H },
          { x: deltaX, y: H },
        ];
      }
    } else {
      const deltaX_L = (L1 - L3) * (L4 / (L2 + L4));
      const deltaX_R = (L1 - L3) - deltaX_L;
      const y4 = Math.sqrt(Math.max(1.0, L4 * L4 - deltaX_L * deltaX_L));
      const y3 = Math.sqrt(Math.max(1.0, L2 * L2 - deltaX_R * deltaX_R));
      actualL3 = L3;
      isSkewed = true;
      rawPoints = [
        { x: 0, y: 0 },
        { x: L1, y: 0 },
        { x: L1 - deltaX_R, y: y3 },
        { x: deltaX_L, y: y4 },
      ];
    }
  }

  const bounds = getPolygonBounds(rawPoints);
  const centerX = bounds.centerX;
  const centerY = bounds.centerY;

  const polygonPoints: PolygonPoint[] = rawPoints.map((p, idx) => ({
    id: `p${idx + 1}`,
    x: Math.round((p.x - centerX) * 10) / 10,
    y: Math.round((p.y - centerY) * 10) / 10,
  }));

  const area = Math.round(calculatePolygonArea(polygonPoints) * 10) / 10;
  const perimeter = Math.round(calculatePolygonPerimeter(polygonPoints) * 10) / 10;

  // Vector based interior angles calculation:
  const getAngleBetween = (v1: { x: number; y: number }, v2: { x: number; y: number }) => {
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    if (mag1 < 0.001 || mag2 < 0.001) return 90.0;
    const cosVal = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.round(Math.acos(cosVal) * (180 / Math.PI) * 10) / 10;
  };

  const p1 = rawPoints[0];
  const p2 = rawPoints[1];
  const p3 = rawPoints[2];
  const p4 = rawPoints[3];

  const angleP1 = getAngleBetween({ x: p2.x - p1.x, y: p2.y - p1.y }, { x: p4.x - p1.x, y: p4.y - p1.y });
  const angleP2 = getAngleBetween({ x: p1.x - p2.x, y: p1.y - p2.y }, { x: p3.x - p2.x, y: p3.y - p2.y });
  const angleP3 = getAngleBetween({ x: p2.x - p3.x, y: p2.y - p3.y }, { x: p4.x - p3.x, y: p4.y - p3.y });
  const angleP4 = Math.round(Math.max(10, 360.0 - angleP1 - angleP2 - angleP3) * 10) / 10;

  return {
    polygonPoints,
    front: L1,
    right: L2,
    back: actualL3,
    left: L4,
    area: Math.max(1.0, area),
    perimeter,
    angles: { 
      p1: angleP1, 
      p2: angleP2, 
      p3: angleP3, 
      p4: angleP4 
    },
    isSkewed,
    statusText: isSkewed 
      ? `Asimetrik / Yamuk Kütle (Ön: ${L1}m, Sağ: ${L2}m, Arka: ${actualL3}m, Sol: ${L4}m)` 
      : (Math.abs(L1 - L2) < 0.1 
          ? `Düzenli Kare Form (${L1}m × ${L2}m)` 
          : `Düzenli Dikdörtgen Form (${L1}m × ${L2}m)`),
  };
}

export interface InteractiveFacadeInput {
  front: number;
  right: number;
  back?: number;
  left?: number;
}

export interface InteractiveFacadeUpdateResult {
  front: number;
  right: number;
  back: number;
  left: number;
  quadrilateral: QuadrilateralResult;
  customFacades: CustomFacadeSide[];
  explanation: string;
}

/**
 * Interactively recalculates the 4 facades (front, right, back, left) in the 2D plane
 * when any one of the facade edge lengths changes.
 */
export function calculateInteractiveQuadrilateral(
  changedSide: 'front' | 'right' | 'back' | 'left',
  rawNewValue: number,
  current: InteractiveFacadeInput
): InteractiveFacadeUpdateResult {
  // Sınır kontrolü: [1.0m - 60.0m] (QA kuralı)
  const val = Math.max(1.0, Math.min(60.0, typeof rawNewValue === 'number' && !isNaN(rawNewValue) && Number.isFinite(rawNewValue) ? rawNewValue : 10.0));
  
  const curFront = Math.max(1.0, Math.min(60.0, typeof current.front === 'number' && !isNaN(current.front) ? current.front : 10.0));
  const curRight = Math.max(1.0, Math.min(60.0, typeof current.right === 'number' && !isNaN(current.right) ? current.right : 10.0));
  const curBack = Math.max(1.0, Math.min(60.0, current.back !== undefined && typeof current.back === 'number' && !isNaN(current.back) ? current.back : curFront));
  const curLeft = Math.max(1.0, Math.min(60.0, current.left !== undefined && typeof current.left === 'number' && !isNaN(current.left) ? current.left : curRight));

  let nextFront = curFront;
  let nextRight = curRight;
  let nextBack = curBack;
  let nextLeft = curLeft;
  let explanation = '';

  const wasRectangular = Math.abs(curLeft - curRight) < 0.1 && Math.abs(curFront - curBack) < 0.1;

  if (changedSide === 'front') {
    nextFront = val;
    const deltaY = Math.abs(nextLeft - nextRight);
    if (wasRectangular || deltaY < 0.1) {
      nextBack = val;
      explanation = `Ön cephe ${val}m yapıldı. Yan cepheler eşit olduğundan arka cephe de ${val}m olarak güncellendi.`;
    } else {
      nextBack = Math.round(Math.sqrt(nextFront * nextFront + deltaY * deltaY) * 10) / 10;
      explanation = `Ön cephe ${val}m yapıldı. Sol (${nextLeft}m) ve Sağ (${nextRight}m) cephe farkından dolayı arka cephe ${nextBack}m olarak hesaplandı.`;
    }
  } else if (changedSide === 'right') {
    nextRight = val;
    const deltaY = Math.abs(nextLeft - nextRight);
    if (deltaY < 0.1) {
      nextBack = nextFront;
      explanation = `Sağ cephe ${val}m yapıldı. Sol cephe ile eşitlendiğinden arka cephe ön cepheye (${nextFront}m) eşitlendi.`;
    } else {
      nextBack = Math.round(Math.sqrt(nextFront * nextFront + deltaY * deltaY) * 10) / 10;
      explanation = `Sağ cephe ${val}m yapıldı. Sol (${nextLeft}m) ve Sağ (${nextRight}m) farkı nedeniyle arka cephe ${nextBack}m oldu. Yapı yamuk forma geçti.`;
    }
  } else if (changedSide === 'left') {
    nextLeft = val;
    const deltaY = Math.abs(nextLeft - nextRight);
    if (deltaY < 0.1) {
      nextBack = nextFront;
      explanation = `Sol cephe ${val}m yapıldı. Sağ cephe ile eşitlendiğinden arka cephe ön cepheye (${nextFront}m) eşitlendi.`;
    } else {
      nextBack = Math.round(Math.sqrt(nextFront * nextFront + deltaY * deltaY) * 10) / 10;
      explanation = `Sol cephe ${val}m yapıldı. Sol (${nextLeft}m) ve Sağ (${nextRight}m) farkı nedeniyle arka cephe ${nextBack}m oldu. Yapı yamuk forma geçti.`;
    }
  } else if (changedSide === 'back') {
    nextBack = val;
    if (Math.abs(val - nextFront) < 0.1 && Math.abs(nextLeft - nextRight) < 0.1) {
      const avgD = Math.round(((nextLeft + nextRight) / 2) * 10) / 10;
      nextLeft = avgD;
      nextRight = avgD;
      nextBack = nextFront;
      explanation = `Arka cephe ön cepheye (${nextFront}m) eşitlendi. Düzgün dikdörtgen/kare forma hizalandı.`;
    } else if (val > nextFront) {
      explanation = `Arka cephe (Bahçe) ${val}m yapıldı. Arkaya genişleyen yamuk kütle formu uygulandı.`;
    } else {
      explanation = `Arka cephe (Bahçe) ${val}m yapıldı. Arkaya daralan yamuk kütle formu uygulandı.`;
    }
  }

  const quad = buildQuadrilateralPolygon(nextFront, nextRight, nextBack, nextLeft);
  const customFacades = getDefaultCustomFacades(4, quad.front, quad.right, quad.back, quad.left);

  return {
    front: quad.front,
    right: quad.right,
    back: quad.back,
    left: quad.left,
    quadrilateral: quad,
    customFacades,
    explanation,
  };
}

export interface FootprintCalculationResult {
  area: number;             // Hesaplanmış taban oturum alanı (m²)
  effectiveWidth: number;   // Eşdeğer ön cephe genişliği (m)
  effectiveDepth: number;   // Eşdeğer yan cephe derinliği (m)
  perimeter: number;        // Çevre toplamı (m)
  description: string;      // Formül açıklaması
  sidesList: { name: string; length: number }[];
}

/**
 * Calculates building footprint area, perimeter, and effective dimensions
 * based on the active input mode (Direct, Dimensions, Custom Facades, L-Shape, Polygon Draw).
 */
export function calculateFootprint(
  mode: FootprintInputMode = 'directArea',
  params: {
    baseBuildArea?: number;
    facadeWidth?: number;
    facadeDepth?: number;
    backFacadeLength?: number;
    leftFacadeLength?: number;
    customFacadeCount?: number;
    customFacades?: CustomFacadeSide[];
    lShapeFrontMain?: number;
    lShapeDepthMain?: number;
    lShapeRecessFront?: number;
    lShapeRecessDepth?: number;
    polygonPoints?: PolygonPoint[];
  }
): FootprintCalculationResult {
  const w = params.facadeWidth && params.facadeWidth > 0 ? params.facadeWidth : 14.0;
  const d = params.facadeDepth && params.facadeDepth > 0 ? params.facadeDepth : 18.0;
  const backW = params.backFacadeLength !== undefined && params.backFacadeLength > 0 ? params.backFacadeLength : w;
  const leftD = params.leftFacadeLength !== undefined && params.leftFacadeLength > 0 ? params.leftFacadeLength : d;

  if (mode === 'polygonDraw') {
    const pts = params.polygonPoints && params.polygonPoints.length >= 3
      ? params.polygonPoints
      : POLYGON_PRESETS.rectangle.points;

    const area = Math.round(calculatePolygonArea(pts) * 10) / 10;
    const perimeter = Math.round(calculatePolygonPerimeter(pts) * 10) / 10;
    const bounds = getPolygonBounds(pts);
    const edges = getPolygonEdges(pts);

    return {
      area: Math.max(10, area),
      effectiveWidth: bounds.width,
      effectiveDepth: bounds.depth,
      perimeter,
      description: `Serbest Poligon Çizimi: ${pts.length} Köşe Noktası | Shoelace Alanı: ${area.toFixed(1)} m² | Çevre: ${perimeter} m`,
      sidesList: edges.map((e, idx) => ({
        name: `${idx + 1}. Cephe (Nokta ${e.startIndex + 1}→${e.endIndex + 1})`,
        length: e.length,
      })),
    };
  }

  if (mode === 'directArea') {
    const area = params.baseBuildArea && params.baseBuildArea > 0 ? params.baseBuildArea : 252;
    // Estimate width & depth keeping 1:1.28 standard architectural ratio
    const ratio = w / (d || 1);
    const validRatio = ratio > 0.2 && ratio < 5.0 ? ratio : 14 / 18;
    const estD = Math.round(Math.sqrt(area / validRatio) * 10) / 10;
    const estW = Math.round((area / (estD || 1)) * 10) / 10;
    const perimeter = Math.round(2 * (estW + estD) * 10) / 10;

    return {
      area: Math.round(area * 100) / 100,
      effectiveWidth: estW,
      effectiveDepth: estD,
      perimeter,
      description: `Doğrudan Girilen Taban Alanı: ${area.toFixed(1)} m²`,
      sidesList: [
        { name: '1. Ön Cephe (Tahmini)', length: estW },
        { name: '2. Sağ Yan Cephe (Tahmini)', length: estD },
        { name: '3. Arka Cephe (Tahmini)', length: estW },
        { name: '4. Sol Yan Cephe (Tahmini)', length: estD },
      ],
    };
  }

  if (mode === 'dimensions') {
    const isSymmetric = Math.abs(w - backW) < 0.05 && Math.abs(d - leftD) < 0.05;
    let area = 0;
    let desc = '';
    const effW = Math.round(((w + backW) / 2) * 10) / 10;
    const effD = Math.round(((d + leftD) / 2) * 10) / 10;

    if (isSymmetric) {
      area = Math.round(w * d * 100) / 100;
      desc = `Ön Cephe (${w}m) × Sağ Yan Cephe (${d}m) = ${area} m²`;
    } else {
      area = Math.round(effW * effD * 100) / 100;
      desc = `4 Cepheli Oturum: Ön (${w}m), Sağ (${d}m), Arka (${backW}m), Sol (${leftD}m) → Ort. (${effW.toFixed(1)}m × ${effD.toFixed(1)}m) = ${area} m²`;
    }

    const perimeter = Math.round((w + d + backW + leftD) * 10) / 10;

    return {
      area,
      effectiveWidth: effW,
      effectiveDepth: effD,
      perimeter,
      description: desc,
      sidesList: [
        { name: '1. Ön Cephe', length: w },
        { name: '2. Sağ Yan Cephe', length: d },
        { name: '3. Arka Cephe', length: backW },
        { name: '4. Sol Yan Cephe', length: leftD },
      ],
    };
  }

  if (mode === 'lShape') {
    const front = params.lShapeFrontMain || 16.0;
    const depth = params.lShapeDepthMain || 20.0;
    const recFront = params.lShapeRecessFront || 6.0;
    const recDepth = params.lShapeRecessDepth || 8.0;

    const mainArea = front * depth;
    const recessArea = Math.min(mainArea * 0.7, recFront * recDepth);
    const area = Math.round(Math.max(20, mainArea - recessArea) * 100) / 100;
    const perimeter = Math.round((2 * (front + depth)) * 10) / 10;

    return {
      area,
      effectiveWidth: front,
      effectiveDepth: depth,
      perimeter,
      description: `L-Tipi Blok: (${front}m × ${depth}m) - Girinti (${recFront}m × ${recDepth}m) = ${area} m²`,
      sidesList: [
        { name: '1. Ön Cephe (Ana Kütle)', length: front },
        { name: '2. Sağ Yan Cephe', length: depth },
        { name: '3. Arka Cephe (Kanat)', length: Math.max(2, front - recFront) },
        { name: '4. İç Girinti Önü', length: recFront },
        { name: '5. İç Girinti Yanı', length: recDepth },
        { name: '6. Sol Yan Cephe', length: Math.max(2, depth - recDepth) },
      ],
    };
  }

  if (mode === 'customFacades') {
    const facades = params.customFacades && params.customFacades.length >= 3
      ? params.customFacades
      : getDefaultCustomFacades(params.customFacadeCount || 4, w, d, backW, leftD);

    const perimeter = Math.round(facades.reduce((sum, f) => sum + (f.length || 0), 0) * 10) / 10;
    const count = facades.length;

    let area = 0;
    let effW = w;
    let effD = d;
    let desc = '';

    if (count === 4) {
      const f1 = facades[0]?.length || 14;
      const f2 = facades[1]?.length || 18;
      const f3 = facades[2]?.length || 14;
      const f4 = facades[3]?.length || 18;

      if (Math.abs(f1 - f3) < 0.05 && Math.abs(f2 - f4) < 0.05) {
        area = Math.round(f1 * f2 * 100) / 100;
        effW = f1;
        effD = f2;
        desc = `Dikdörtgen Taban: ${f1}m (Ön) × ${f2}m (Yan) = ${area} m²`;
      } else {
        const avgW = (f1 + f3) / 2;
        const avgD = (f2 + f4) / 2;
        area = Math.round(avgW * avgD * 100) / 100;
        effW = Math.round(avgW * 10) / 10;
        effD = Math.round(avgD * 10) / 10;
        desc = `Yamuk / Çokgen Taban: Ort. Genişlik (${avgW.toFixed(1)}m) × Ort. Derinlik (${avgD.toFixed(1)}m) = ${area} m²`;
      }
    } else if (count === 6) {
      const f1 = facades[0]?.length || 16;
      const f2 = facades[1]?.length || 20;
      const f3 = facades[2]?.length || 9;
      const f4 = facades[3]?.length || 7;
      const f5 = facades[4]?.length || 7;
      const f6 = facades[5]?.length || 13;

      const totalBox = f1 * f2;
      const cutOut = (f4 * f5) > 0 && (f4 * f5) < totalBox ? (f4 * f5) : 0;
      area = Math.round(Math.max(30, totalBox - cutOut) * 100) / 100;
      effW = Math.round(f1 * 10) / 10;
      effD = Math.round(f2 * 10) / 10;
      desc = `6 Cepheli Kademeli / L Taban: (${f1}m × ${f2}m) - Girinti = ${area} m²`;
    } else {
      const halfPerim = perimeter / 2;
      const avgW = halfPerim * (1 / 2.3);
      const avgD = halfPerim * (1.3 / 2.3);
      area = Math.round(avgW * avgD * 0.95 * 100) / 100;
      effW = Math.round(avgW * 10) / 10;
      effD = Math.round(avgD * 10) / 10;
      desc = `${count} Cepheli Poligon Taban: Çevre ${perimeter}m → Hesaplanmış Taban Alanı: ${area} m²`;
    }

    return {
      area: Math.max(10, area),
      effectiveWidth: effW,
      effectiveDepth: effD,
      perimeter,
      description: desc,
      sidesList: facades.map((f, i) => ({ name: f.name || `${i + 1}. Cephe`, length: f.length || 0 })),
    };
  }

  // Fallback
  return {
    area: Math.round(w * d * 100) / 100,
    effectiveWidth: w,
    effectiveDepth: d,
    perimeter: Math.round(2 * (w + d) * 10) / 10,
    description: `${w}m × ${d}m = ${Math.round(w * d)} m²`,
    sidesList: [],
  };
}
