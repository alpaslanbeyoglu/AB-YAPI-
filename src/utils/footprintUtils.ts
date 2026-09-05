import { CustomFacadeSide, FootprintInputMode, ProjectParams, BuildingModelParams } from '../types';

export const DEFAULT_CUSTOM_FACADES_4: CustomFacadeSide[] = [
  { id: 1, name: '1. Ön Cephe (Yol / Ana Giriş)', length: 14.0 },
  { id: 2, name: '2. Sağ Yan Cephe (Komşu / Çekme Payı)', length: 18.0 },
  { id: 3, name: '3. Arka Cephe (Bahçe / Arka Parsel)', length: 14.0 },
  { id: 4, name: '4. Sol Yan Cephe (Komşu / Çekme Payı)', length: 18.0 },
];

export const DEFAULT_CUSTOM_FACADES_5: CustomFacadeSide[] = [
  { id: 1, name: '1. Ön Cephe (Ana Yol)', length: 14.0 },
  { id: 2, name: '2. Sağ Ön Köşe Cephe (Pah / Kırılım)', length: 6.0 },
  { id: 3, name: '3. Sağ Yan Cephe', length: 13.0 },
  { id: 4, name: '4. Arka Cephe (Bahçe)', length: 10.0 },
  { id: 5, name: '5. Sol Yan Cephe', length: 18.0 },
];

export const DEFAULT_CUSTOM_FACADES_6: CustomFacadeSide[] = [
  { id: 1, name: '1. Ön Cephe (Ana Kütle)', length: 16.0 },
  { id: 2, name: '2. Sağ Yan Cephe (Boyuna)', length: 20.0 },
  { id: 3, name: '3. Arka Cephe (Geniş Kanat)', length: 9.0 },
  { id: 4, name: '4. İç Girinti Cephesi (I. Kırılım)', length: 7.0 },
  { id: 5, name: '5. İç Girinti Yan Cephesi (II. Kırılım)', length: 7.0 },
  { id: 6, name: '6. Sol Yan Cephe (Kısa Kanat)', length: 13.0 },
];

export const DEFAULT_CUSTOM_FACADES_8: CustomFacadeSide[] = [
  { id: 1, name: '1. Ön Cephe (Ana Giriş)', length: 12.0 },
  { id: 2, name: '2. Sağ Ön Köşe Cephesi', length: 4.0 },
  { id: 3, name: '3. Sağ Yan Cephe', length: 14.0 },
  { id: 4, name: '4. Sağ Arka Köşe Cephesi', length: 4.0 },
  { id: 5, name: '5. Arka Cephe', length: 12.0 },
  { id: 6, name: '6. Sol Arka Köşe Cephesi', length: 4.0 },
  { id: 7, name: '7. Sol Yan Cephe', length: 14.0 },
  { id: 8, name: '8. Sol Ön Köşe Cephesi', length: 4.0 },
];

export function getDefaultCustomFacades(count: number, width = 14, depth = 18): CustomFacadeSide[] {
  if (count === 5) return DEFAULT_CUSTOM_FACADES_5;
  if (count === 6) return DEFAULT_CUSTOM_FACADES_6;
  if (count === 8) return DEFAULT_CUSTOM_FACADES_8;

  // Default 4 sides
  return [
    { id: 1, name: '1. Ön Cephe (Yol / Giriş)', length: width > 0 ? width : 14.0 },
    { id: 2, name: '2. Sağ Yan Cephe (Komşu/Çekme)', length: depth > 0 ? depth : 18.0 },
    { id: 3, name: '3. Arka Cephe (Bahçe)', length: width > 0 ? width : 14.0 },
    { id: 4, name: '4. Sol Yan Cephe (Komşu/Çekme)', length: depth > 0 ? depth : 18.0 },
  ];
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
 * based on the active input mode (Direct, Dimensions, Custom Facades, L-Shape).
 */
export function calculateFootprint(
  mode: FootprintInputMode = 'directArea',
  params: {
    baseBuildArea?: number;
    facadeWidth?: number;
    facadeDepth?: number;
    customFacadeCount?: number;
    customFacades?: CustomFacadeSide[];
    lShapeFrontMain?: number;
    lShapeDepthMain?: number;
    lShapeRecessFront?: number;
    lShapeRecessDepth?: number;
  }
): FootprintCalculationResult {
  const w = params.facadeWidth && params.facadeWidth > 0 ? params.facadeWidth : 14.0;
  const d = params.facadeDepth && params.facadeDepth > 0 ? params.facadeDepth : 18.0;

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
    const area = Math.round(w * d * 100) / 100;
    const perimeter = Math.round(2 * (w + d) * 10) / 10;
    return {
      area,
      effectiveWidth: w,
      effectiveDepth: d,
      perimeter,
      description: `Ön Cephe (${w}m) × Yan Cephe (${d}m) = ${area} m²`,
      sidesList: [
        { name: '1. Ön Cephe', length: w },
        { name: '2. Sağ Yan Cephe', length: d },
        { name: '3. Arka Cephe', length: w },
        { name: '4. Sol Yan Cephe', length: d },
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
      : getDefaultCustomFacades(params.customFacadeCount || 4, w, d);

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
        // Trapezoid / Irregular Quad (Average Width x Average Depth)
        const avgW = (f1 + f3) / 2;
        const avgD = (f2 + f4) / 2;
        area = Math.round(avgW * avgD * 100) / 100;
        effW = Math.round(avgW * 10) / 10;
        effD = Math.round(avgD * 10) / 10;
        desc = `Yamuk / Çokgen Taban: Ort. Genişlik (${avgW.toFixed(1)}m) × Ort. Derinlik (${avgD.toFixed(1)}m) = ${area} m²`;
      }
    } else if (count === 6) {
      // 6 Facades (L-Shape / Stepped): Sum of bounding rectangles or polygon shoelace
      const f1 = facades[0]?.length || 16;
      const f2 = facades[1]?.length || 20;
      const f3 = facades[2]?.length || 9;
      const f4 = facades[3]?.length || 7;
      const f5 = facades[4]?.length || 7;
      const f6 = facades[5]?.length || 13;

      // Area = Main rectangle - cut out
      const totalBox = f1 * f2;
      const cutOut = (f4 * f5) > 0 && (f4 * f5) < totalBox ? (f4 * f5) : 0;
      area = Math.round(Math.max(30, totalBox - cutOut) * 100) / 100;
      effW = Math.round(f1 * 10) / 10;
      effD = Math.round(f2 * 10) / 10;
      desc = `6 Cepheli Kademeli / L Taban: (${f1}m × ${f2}m) - Girinti = ${area} m²`;
    } else {
      // General polygon approximation by perimeter-to-area bounding box
      const halfPerim = perimeter / 2;
      // Assume aspect ratio around 1:1.3
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
