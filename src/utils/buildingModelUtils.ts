import { BuildingModelParams, RoomType, FacadeStyleType } from '../types';
import { DEFAULT_CUSTOM_FACADES_4, calculateFootprint } from './footprintUtils';

export interface FacadeStyleOption {
  id: FacadeStyleType;
  title: string;
  subtitle: string;
  category: 'Modern & Lüks' | 'Doğal & Sıcak' | 'Minimalist' | 'Karakterli & Endüstriyel';
  wallColorHex: string;
  accentColorHex: string;
  colors: {
    wall: number;
    woodAccent: number;
    slab: number;
    glass: number;
    column: number;
    balcony: number;
    roof: number;
  };
}

export const FACADE_STYLES: FacadeStyleOption[] = [
  {
    id: 'modern',
    title: 'Modern Açık Gri',
    subtitle: 'Doğal Ahşap & Dengeli Sıva',
    category: 'Modern & Lüks',
    wallColorHex: '#f1f5f9',
    accentColorHex: '#6366f1',
    colors: {
      wall: 0xf1f5f9,
      woodAccent: 0x6366f1,
      slab: 0xcccccc,
      glass: 0x38bdf8,
      column: 0x475569,
      balcony: 0x312e81,
      roof: 0x1e293b,
    },
  },
  {
    id: 'wood_anthracite',
    title: 'Antrasit & Ahşap',
    subtitle: 'Kompozit & Sıcak Teak Ahşap',
    category: 'Modern & Lüks',
    wallColorHex: '#22252a',
    accentColorHex: '#b5734c',
    colors: {
      wall: 0x22252a,
      woodAccent: 0xb5734c,
      slab: 0xd6d3cb,
      glass: 0x38bdf8,
      column: 0x3f3f46,
      balcony: 0x18181b,
      roof: 0x1e293b,
    },
  },
  {
    id: 'travertine_luxury',
    title: 'Doğal Bej Traverten',
    subtitle: 'Honlu Mermer & Şampanya Çerçeve',
    category: 'Modern & Lüks',
    wallColorHex: '#eaddcf',
    accentColorHex: '#8c6239',
    colors: {
      wall: 0xeaddcf,
      woodAccent: 0x8c6239,
      slab: 0xf5efe6,
      glass: 0x7dd3fc,
      column: 0xa89f91,
      balcony: 0xbfa88e,
      roof: 0x473c33,
    },
  },
  {
    id: 'glass_minimal',
    title: 'Cam & Minimalist',
    subtitle: 'Geniş Pencere & Alüminyum Profil',
    category: 'Minimalist',
    wallColorHex: '#e2e8f0',
    accentColorHex: '#0284c7',
    colors: {
      wall: 0xe2e8f0,
      woodAccent: 0x0284c7,
      slab: 0xf8fafc,
      glass: 0x0ea5e9,
      column: 0x64748b,
      balcony: 0x0284c7,
      roof: 0x334155,
    },
  },
  {
    id: 'concrete_brutalist',
    title: 'Brüt Beton & Çelik',
    subtitle: 'Ham Endüstriyel Mimari Doku',
    category: 'Karakterli & Endüstriyel',
    wallColorHex: '#94a3b8',
    accentColorHex: '#334155',
    colors: {
      wall: 0x94a3b8,
      woodAccent: 0x334155,
      slab: 0xcbd5e1,
      glass: 0x0284c7,
      column: 0x475569,
      balcony: 0x1e293b,
      roof: 0x0f172a,
    },
  },
  {
    id: 'brick_stone',
    title: 'Tuğla & Doğal Taş',
    subtitle: 'Sıcak Rustik Klinker Tuğla',
    category: 'Doğal & Sıcak',
    wallColorHex: '#9a3412',
    accentColorHex: '#451a03',
    colors: {
      wall: 0x9a3412,
      woodAccent: 0x451a03,
      slab: 0xe7e5e4,
      glass: 0x38bdf8,
      column: 0x78716c,
      balcony: 0x44403c,
      roof: 0x7f1d1d,
    },
  },
  {
    id: 'terracotta_warm',
    title: 'Terracotta & Bronz',
    subtitle: 'Pişmiş Kil Panel & Sıcak Doku',
    category: 'Doğal & Sıcak',
    wallColorHex: '#c25e38',
    accentColorHex: '#7c381c',
    colors: {
      wall: 0xc25e38,
      woodAccent: 0x6b2d18,
      slab: 0xeee4dc,
      glass: 0x38bdf8,
      column: 0x5c3829,
      balcony: 0x7c381c,
      roof: 0x421b10,
    },
  },
  {
    id: 'nordic_black',
    title: 'İskandinav Kara Çam',
    subtitle: 'Kömürleşmiş Ahşap & Koyu Füme',
    category: 'Karakterli & Endüstriyel',
    wallColorHex: '#18181b',
    accentColorHex: '#a16207',
    colors: {
      wall: 0x18181b,
      woodAccent: 0xa16207,
      slab: 0x3f3f46,
      glass: 0x60a5fa,
      column: 0x27272a,
      balcony: 0x09090b,
      roof: 0x0f172a,
    },
  },
  {
    id: 'mediterranean_white',
    title: 'Akdeniz Beyazı & Tik',
    subtitle: 'Saf Beyaz Sıva & Sıcak Ahşap',
    category: 'Doğal & Sıcak',
    wallColorHex: '#fafafa',
    accentColorHex: '#d97706',
    colors: {
      wall: 0xfafafa,
      woodAccent: 0xd97706,
      slab: 0xffffff,
      glass: 0x06b6d4,
      column: 0xd4d4d8,
      balcony: 0xb45309,
      roof: 0x9a3412,
    },
  },
  {
    id: 'cappadocia_tuff',
    title: 'Kapadokya Taşı & Bakır',
    subtitle: 'Volkanik Tüf & Oksit Bronz',
    category: 'Doğal & Sıcak',
    wallColorHex: '#d6c2a8',
    accentColorHex: '#7c2d12',
    colors: {
      wall: 0xd6c2a8,
      woodAccent: 0x7c2d12,
      slab: 0xedd5b8,
      glass: 0x0284c7,
      column: 0x8c7860,
      balcony: 0x78350f,
      roof: 0x451a03,
    },
  },
];

export function getFacadeStyleConfig(styleId?: FacadeStyleType): FacadeStyleOption {
  const found = FACADE_STYLES.find((s) => s.id === styleId);
  return found || FACADE_STYLES[0];
}

export const DEFAULT_BUILDING_PARAMS: BuildingModelParams = {
  facadeWidth: 14.0,       // Ön cephe 14 metre
  facadeDepth: 18.0,       // Sağ yan cephe derinlik 18 metre
  backFacadeLength: 14.0,  // Arka cephe 14 metre
  leftFacadeLength: 18.0,  // Sol yan cephe 18 metre
  footprintInputMode: 'directArea',
  customFacadeCount: 4,
  customFacades: DEFAULT_CUSTOM_FACADES_4,
  lShapeFrontMain: 16.0,
  lShapeDepthMain: 20.0,
  lShapeRecessFront: 6.0,
  lShapeRecessDepth: 8.0,
  floorHeight: 2.95,       // Kat yüksekliği 2.95 metre
  floorCount: 5,           // 5 Normal kat
  basementCount: 1,        // 1 Bodrum kat
  flatsPerFloor: 2,        // Katta 2 daire
  roomType: '3+1',         // 3 Oda 1 Salon
  stairWidth: 2.60,        // Merdiven kovası genişliği (m)
  stairDepth: 4.80,        // Merdiven kovası derinliği (m)
  elevatorWidth: 1.80,     // Asansör kuyu genişliği (m)
  elevatorDepth: 2.00,     // Asansör kuyu derinliği (m)
  elevatorCount: 1,        // 1 adet asansör
  balconyDepth: 1.40,      // Balkon çıkması 1.40 metre
  roofType: 'gable',       // Kırma çatı
  facadeStyle: 'wood_anthracite', // Ahşap + Antrasit modern cephe
  wallThickness: 0.25,     // 25 cm dış duvar
  showFurniture: true,     // Mobilya gösterimi açık
  showDimensions: true,    // Ölçülendirme açık
  showInteriorRooms: true, // 3D modelde odaların ve bölmelerin görünmesi
  interiorCutMode: 'solid',// 'solid', 'xray', 'cutaway'
  hasGroundFloorShop: false,
  shopCount: 1,
  shopHeight: 3.80,
  hasCantilever: false,
  cantileverDepth: 1.20,
  cantileverDirection: 'front_back',
  contractorFlatIds: [],
  showContractorShare3D: false,
};

export interface RoomDetail {
  id: string;
  name: string;
  type: 'salon' | 'room' | 'kitchen' | 'bath' | 'parent_bath' | 'hall' | 'balcony';
  areaM2: number;
  widthM: number;
  depthM: number;
  xPercent: number; // 0 - 100 within flat
  yPercent: number; // 0 - 100 within flat
  widthPercent: number;
  depthPercent: number;
}

export interface BuildingMetrics {
  footprintArea: number;       // Taban alanı (m²)
  upperFloorGrossArea: number; // Çıkmalı kat brüt alanı (m²)
  cantileverArea: number;      // Çıkma ile kazanılan fark (m²)
  totalBuiltArea: number;      // Toplam inşaat alanı (m²)
  totalGrossArea: number;      // Toplam brüt inşaat alanı (m²)
  totalHeight: number;         // Toplam bina yüksekliği (m)
  totalFlats: number;          // Toplam bağımsız bölüm sayısı
  normalFlats: number;         // Normal katlardaki bağımsız bölüm sayısı
  extraMansardFlats: number;   // Mansart çatı tek seçildiğinde eklenen ekstra bağımsız bölüm sayısı
  roofAtticArea: number;       // Çatı katı / dubleks inşaat alanı (m²)
  isMansardIndependent: boolean; // Mansart çatı tek: ayrı bağımsız bölüm
  isDuplexUnified: boolean;     // Mansart + dubleks: son katla birleşik tek bağımsız bölüm
  coreArea: number;            // Merdiven + Asansör çekirdek alanı (m²)
  floorGrossArea: number;      // Kat brüt alanı (m²)
  flatGrossArea: number;       // Daire başına brüt alan (m²)
  flatNetArea: number;         // Daire başına net kullanım alanı (m²)
  stairTotalArea: number;      // Merdiven alanı
  elevatorTotalArea: number;   // Asansör alanı
  balconyTotalArea: number;    // Balkon alanı
}

export function calculateBuildingMetrics(params: Partial<BuildingModelParams> = {}): BuildingMetrics {
  const footprintCalc = calculateFootprint(params.footprintInputMode, {
    baseBuildArea: params.baseBuildArea,
    facadeWidth: params.facadeWidth,
    facadeDepth: params.facadeDepth,
    customFacadeCount: params.customFacadeCount,
    customFacades: params.customFacades,
    lShapeFrontMain: params.lShapeFrontMain,
    lShapeDepthMain: params.lShapeDepthMain,
    lShapeRecessFront: params.lShapeRecessFront,
    lShapeRecessDepth: params.lShapeRecessDepth,
    polygonPoints: params.polygonPoints,
  });

  const footprintArea = footprintCalc.area;
  const fw = footprintCalc.effectiveWidth;
  const fd = footprintCalc.effectiveDepth;

  const fh = (params?.floorHeight && !isNaN(params.floorHeight) && params.floorHeight > 0) ? params.floorHeight : 2.95;
  const fc = (params?.floorCount && !isNaN(params.floorCount) && params.floorCount > 0) ? params.floorCount : 5;
  const bc = (params?.basementCount !== undefined && !isNaN(params.basementCount)) ? params.basementCount : 1;
  const flatsPerFloor = (params?.flatsPerFloor && !isNaN(params.flatsPerFloor) && params.flatsPerFloor > 0) ? params.flatsPerFloor : 2;
  const stairWidth = (params?.stairWidth && !isNaN(params.stairWidth) && params.stairWidth > 0) ? params.stairWidth : 2.60;
  const stairDepth = (params?.stairDepth && !isNaN(params.stairDepth) && params.stairDepth > 0) ? params.stairDepth : 4.80;
  const elevatorWidth = (params?.elevatorWidth && !isNaN(params.elevatorWidth) && params.elevatorWidth > 0) ? params.elevatorWidth : 1.80;
  const elevatorDepth = (params?.elevatorDepth && !isNaN(params.elevatorDepth) && params.elevatorDepth > 0) ? params.elevatorDepth : 2.00;
  const elevatorCount = (params?.elevatorCount && !isNaN(params.elevatorCount) && params.elevatorCount > 0) ? params.elevatorCount : 1;
  const balconyDepth = (params?.balconyDepth && !isNaN(params.balconyDepth) && params.balconyDepth > 0) ? params.balconyDepth : 1.40;
  
  // Tabla / Konsol Çıkması (Cantilever)
  const hasCantilever = !!params.hasCantilever;
  const cantileverDepth = params.cantileverDepth || 1.2;
  let upperFloorGrossArea = footprintArea;
  if (hasCantilever && cantileverDepth > 0) {
    if (params.cantileverDirection === 'all') {
      upperFloorGrossArea = (fw + 2 * cantileverDepth) * (fd + 2 * cantileverDepth);
    } else if (params.cantileverDirection === 'front') {
      upperFloorGrossArea = fw * (fd + cantileverDepth);
    } else {
      // front_back
      upperFloorGrossArea = fw * (fd + 2 * cantileverDepth);
    }
    upperFloorGrossArea = Math.round(upperFloorGrossArea * 100) / 100;
  }
  const cantileverArea = Math.round(Math.max(0, upperFloorGrossArea - footprintArea) * 100) / 100;

  const upperFloorsCount = Math.max(0, fc - 1);
  const basementFloorsCount = bc;

  // Çatı ve Dubleks Metrekare Hesabı:
  // Mansart çatı tek: Bağımsız çatı katı (%70 emsal alan)
  // Mansart + Dubleks: Son katla birleşik dubleks teras alanı (%65)
  const isMansardIndependent = params.roofType === 'mansard';
  const isDuplexUnified = params.roofType === 'duplex';

  const roofAtticArea =
    isDuplexUnified
      ? Math.round(upperFloorGrossArea * 0.65 * 100) / 100
      : isMansardIndependent
      ? Math.round(upperFloorGrossArea * 0.70 * 100) / 100
      : 0;

  // Ground floor + basement floors + upper floors (with cantilever) + roof attic area
  const totalBuiltArea = Math.round(
    (footprintArea * (1 + basementFloorsCount) + upperFloorGrossArea * upperFloorsCount + roofAtticArea) * 100
  ) / 100;

  const roofHeightAdd =
    params.roofType === 'mansard'
      ? 3.2
      : params.roofType === 'duplex'
      ? 3.4
      : params.roofType === 'gable'
      ? 2.5
      : 0.9;
  const hasShop = !!params.hasGroundFloorShop;
  const groundHeight = hasShop ? (params.shopHeight || 3.8) : fh;
  const totalHeight = Math.round(
    ((fc > 1 ? (fc - 1) * fh + groundHeight : groundHeight) + roofHeightAdd) * 100
  ) / 100;

  const residentialFloors = hasShop ? Math.max(1, fc - 1) : fc;
  const normalFlats = residentialFloors * flatsPerFloor;

  // Mimari Kural:
  // 1) Mansart Çatı TEK seçildiğinde: Çatı katında ekstra bağımsız bölüm(ler) oluşur ve hesaplara dahil edilir.
  // 2) Mansart Çatı + Dubleks seçildiğinde: Son kat ile çatı birleştiğinden TEK bağımsız bölüm kabul edilir (ekstra daire eklenmez).
  const extraMansardFlats = isMansardIndependent
    ? (params.mansardFlatCount && params.mansardFlatCount > 0 ? params.mansardFlatCount : Math.max(1, flatsPerFloor))
    : 0;

  const totalFlats = normalFlats + extraMansardFlats;

  const stairTotalArea = Math.round(stairWidth * stairDepth * 100) / 100;
  const elevatorTotalArea = Math.round(elevatorWidth * elevatorDepth * elevatorCount * 100) / 100;
  const coreHallArea = Math.round(stairWidth * 2.0 * 100) / 100; // Kat koridoru
  const coreArea = Math.round((stairTotalArea + elevatorTotalArea + coreHallArea) * 100) / 100;

  // Normal kat bazında alan
  const activeGross = hasCantilever ? upperFloorGrossArea : footprintArea;
  const wallLoss = Math.round(activeGross * 0.08 * 100) / 100;
  const residentialAreaOnFloor = Math.max(20, Math.round((activeGross - coreArea - wallLoss) * 100) / 100);

  const flatNetArea = Math.round((residentialAreaOnFloor / flatsPerFloor) * 100) / 100;
  const flatGrossArea = Math.round((activeGross / flatsPerFloor) * 100) / 100;
  const balconyTotalArea = Math.round(balconyDepth * 3.5 * 100) / 100;

  return {
    footprintArea,
    upperFloorGrossArea,
    cantileverArea,
    totalBuiltArea,
    totalGrossArea: totalBuiltArea,
    totalHeight,
    totalFlats,
    normalFlats,
    extraMansardFlats,
    roofAtticArea,
    isMansardIndependent,
    isDuplexUnified,
    coreArea,
    floorGrossArea: activeGross,
    flatGrossArea,
    flatNetArea,
    stairTotalArea,
    elevatorTotalArea,
    balconyTotalArea,
  };
}

export function getRoomsForFlat(roomType: RoomType, netArea: number): RoomDetail[] {
  // Proportional breakdown based on Turkish architectural standards (İmar Yönetmeliği & Mimarlar Odası)
  switch (roomType) {
    case '1+1':
      return [
        {
          id: 'salon',
          name: 'Salon + Açık Mutfak',
          type: 'salon',
          areaM2: Math.round(netArea * 0.44 * 10) / 10,
          widthM: 4.8,
          depthM: 5.2,
          xPercent: 5,
          yPercent: 5,
          widthPercent: 52,
          depthPercent: 58,
        },
        {
          id: 'yatak1',
          name: 'Yatak Odası',
          type: 'room',
          areaM2: Math.round(netArea * 0.28 * 10) / 10,
          widthM: 3.6,
          depthM: 3.8,
          xPercent: 60,
          yPercent: 5,
          widthPercent: 35,
          depthPercent: 48,
        },
        {
          id: 'banyo',
          name: 'Banyo / WC',
          type: 'bath',
          areaM2: Math.round(netArea * 0.12 * 10) / 10,
          widthM: 2.2,
          depthM: 2.5,
          xPercent: 60,
          yPercent: 56,
          widthPercent: 35,
          depthPercent: 38,
        },
        {
          id: 'hol',
          name: 'Giriş Holü / Antre',
          type: 'hall',
          areaM2: Math.round(netArea * 0.10 * 10) / 10,
          widthM: 1.8,
          depthM: 2.6,
          xPercent: 28,
          yPercent: 66,
          widthPercent: 28,
          depthPercent: 28,
        },
        {
          id: 'balkon',
          name: 'Balkon',
          type: 'balcony',
          areaM2: Math.round(netArea * 0.06 * 10) / 10,
          widthM: 1.4,
          depthM: 3.2,
          xPercent: 5,
          yPercent: 66,
          widthPercent: 20,
          depthPercent: 28,
        },
      ];

    case '2+1':
      return [
        {
          id: 'salon',
          name: 'Salon',
          type: 'salon',
          areaM2: Math.round(netArea * 0.32 * 10) / 10,
          widthM: 5.2,
          depthM: 4.8,
          xPercent: 5,
          yPercent: 5,
          widthPercent: 46,
          depthPercent: 50,
        },
        {
          id: 'mutfak',
          name: 'Mutfak',
          type: 'kitchen',
          areaM2: Math.round(netArea * 0.16 * 10) / 10,
          widthM: 2.8,
          depthM: 4.2,
          xPercent: 5,
          yPercent: 58,
          widthPercent: 30,
          depthPercent: 36,
        },
        {
          id: 'yatak_eb',
          name: 'Ebeveyn Yatak Odası',
          type: 'room',
          areaM2: Math.round(netArea * 0.22 * 10) / 10,
          widthM: 4.0,
          depthM: 3.8,
          xPercent: 55,
          yPercent: 5,
          widthPercent: 40,
          depthPercent: 44,
        },
        {
          id: 'yatak2',
          name: 'Çocuk / Misafir Odası',
          type: 'room',
          areaM2: Math.round(netArea * 0.14 * 10) / 10,
          widthM: 3.2,
          depthM: 3.4,
          xPercent: 55,
          yPercent: 52,
          widthPercent: 40,
          depthPercent: 42,
        },
        {
          id: 'banyo',
          name: 'Genel Banyo & WC',
          type: 'bath',
          areaM2: Math.round(netArea * 0.08 * 10) / 10,
          widthM: 2.4,
          depthM: 2.2,
          xPercent: 37,
          yPercent: 58,
          widthPercent: 16,
          depthPercent: 24,
        },
        {
          id: 'hol',
          name: 'Giriş & Gece Holü',
          type: 'hall',
          areaM2: Math.round(netArea * 0.08 * 10) / 10,
          widthM: 2.0,
          depthM: 4.0,
          xPercent: 37,
          yPercent: 20,
          widthPercent: 16,
          depthPercent: 35,
        },
      ];

    case '3+1':
      return [
        {
          id: 'salon',
          name: 'Geniş Salon',
          type: 'salon',
          areaM2: Math.round(netArea * 0.26 * 10) / 10,
          widthM: 6.0,
          depthM: 4.8,
          xPercent: 4,
          yPercent: 4,
          widthPercent: 44,
          depthPercent: 46,
        },
        {
          id: 'mutfak',
          name: 'Ayrı Mutfak',
          type: 'kitchen',
          areaM2: Math.round(netArea * 0.13 * 10) / 10,
          widthM: 3.2,
          depthM: 4.2,
          xPercent: 4,
          yPercent: 53,
          widthPercent: 28,
          depthPercent: 42,
        },
        {
          id: 'yatak_eb',
          name: 'Ebeveyn Yatak Odası',
          type: 'room',
          areaM2: Math.round(netArea * 0.17 * 10) / 10,
          widthM: 4.4,
          depthM: 4.0,
          xPercent: 52,
          yPercent: 4,
          widthPercent: 32,
          depthPercent: 44,
        },
        {
          id: 'eb_banyo',
          name: 'Ebeveyn Banyo',
          type: 'parent_bath',
          areaM2: Math.round(netArea * 0.04 * 10) / 10,
          widthM: 1.8,
          depthM: 1.8,
          xPercent: 86,
          yPercent: 4,
          widthPercent: 10,
          depthPercent: 22,
        },
        {
          id: 'yatak2',
          name: 'Genç Odası',
          type: 'room',
          areaM2: Math.round(netArea * 0.11 * 10) / 10,
          widthM: 3.4,
          depthM: 3.6,
          xPercent: 52,
          yPercent: 51,
          widthPercent: 22,
          depthPercent: 44,
        },
        {
          id: 'yatak3',
          name: 'Çocuk / Çalışma Odası',
          type: 'room',
          areaM2: Math.round(netArea * 0.09 * 10) / 10,
          widthM: 3.0,
          depthM: 3.4,
          xPercent: 76,
          yPercent: 51,
          widthPercent: 20,
          depthPercent: 44,
        },
        {
          id: 'banyo',
          name: 'Genel Banyo & Duş',
          type: 'bath',
          areaM2: Math.round(netArea * 0.07 * 10) / 10,
          widthM: 2.4,
          depthM: 2.6,
          xPercent: 34,
          yPercent: 53,
          widthPercent: 16,
          depthPercent: 26,
        },
        {
          id: 'hol',
          name: 'Antre & Gece Holü',
          type: 'hall',
          areaM2: Math.round(netArea * 0.08 * 10) / 10,
          widthM: 2.2,
          depthM: 5.0,
          xPercent: 34,
          yPercent: 8,
          widthPercent: 16,
          depthPercent: 42,
        },
        {
          id: 'balkon',
          name: 'Balkon',
          type: 'balcony',
          areaM2: Math.round(netArea * 0.05 * 10) / 10,
          widthM: 3.5,
          depthM: 1.5,
          xPercent: 4,
          yPercent: 90,
          widthPercent: 20,
          depthPercent: 10,
        },
      ];

    case '4+1':
      return [
        {
          id: 'salon',
          name: 'Büyük Salon & Yemek Bölümü',
          type: 'salon',
          areaM2: Math.round(netArea * 0.28 * 10) / 10,
          widthM: 6.8,
          depthM: 5.2,
          xPercent: 4,
          yPercent: 4,
          widthPercent: 44,
          depthPercent: 45,
        },
        {
          id: 'mutfak',
          name: 'Geniş Ada Mutfak',
          type: 'kitchen',
          areaM2: Math.round(netArea * 0.14 * 10) / 10,
          widthM: 3.6,
          depthM: 4.4,
          xPercent: 4,
          yPercent: 52,
          widthPercent: 26,
          depthPercent: 44,
        },
        {
          id: 'yatak_eb',
          name: 'Master Ebeveyn Süiti',
          type: 'room',
          areaM2: Math.round(netArea * 0.20 * 10) / 10,
          widthM: 4.8,
          depthM: 4.4,
          xPercent: 52,
          yPercent: 4,
          widthPercent: 34,
          depthPercent: 42,
        },
        {
          id: 'eb_banyo',
          name: 'Ebeveyn Banyo + Giyinme',
          type: 'parent_bath',
          areaM2: Math.round(netArea * 0.06 * 10) / 10,
          widthM: 2.2,
          depthM: 2.4,
          xPercent: 88,
          yPercent: 4,
          widthPercent: 9,
          depthPercent: 26,
        },
        {
          id: 'yatak2',
          name: 'Genç Yatak Odası 1',
          type: 'room',
          areaM2: Math.round(netArea * 0.11 * 10) / 10,
          widthM: 3.4,
          depthM: 3.6,
          xPercent: 52,
          yPercent: 49,
          widthPercent: 22,
          depthPercent: 47,
        },
        {
          id: 'yatak3',
          name: 'Genç Yatak Odası 2',
          type: 'room',
          areaM2: Math.round(netArea * 0.10 * 10) / 10,
          widthM: 3.2,
          depthM: 3.6,
          xPercent: 76,
          yPercent: 49,
          widthPercent: 20,
          depthPercent: 47,
        },
        {
          id: 'yatak4',
          name: 'Misafir / Çalışma Odası',
          type: 'room',
          areaM2: Math.round(netArea * 0.09 * 10) / 10,
          widthM: 3.0,
          depthM: 3.4,
          xPercent: 32,
          yPercent: 62,
          widthPercent: 18,
          depthPercent: 34,
        },
        {
          id: 'banyo',
          name: 'Genel Banyo & Çamaşır',
          type: 'bath',
          areaM2: Math.round(netArea * 0.07 * 10) / 10,
          widthM: 2.4,
          depthM: 2.6,
          xPercent: 32,
          yPercent: 38,
          widthPercent: 18,
          depthPercent: 22,
        },
        {
          id: 'hol',
          name: 'Antre & Geniş Koridor',
          type: 'hall',
          areaM2: Math.round(netArea * 0.08 * 10) / 10,
          widthM: 2.4,
          depthM: 6.0,
          xPercent: 32,
          yPercent: 4,
          widthPercent: 18,
          depthPercent: 32,
        },
      ];
  }
}

export function getDuplexAtticRooms(netArea: number): RoomDetail[] {
  const atticArea = Math.round(netArea * 0.7 * 10) / 10;
  return [
    {
      id: 'ebeveyn_suite',
      name: 'Ebeveyn Yatak Odası & Giyinme Bölümü',
      type: 'room',
      areaM2: Math.round(atticArea * 0.38 * 10) / 10,
      widthM: 4.8,
      depthM: 4.2,
      xPercent: 5,
      yPercent: 5,
      widthPercent: 50,
      depthPercent: 52,
    },
    {
      id: 'cati_terasi',
      name: 'Panoramik Çatı Terası / Kış Bahçesi',
      type: 'balcony',
      areaM2: Math.round(atticArea * 0.25 * 10) / 10,
      widthM: 4.5,
      depthM: 3.5,
      xPercent: 58,
      yPercent: 5,
      widthPercent: 38,
      depthPercent: 45,
    },
    {
      id: 'hobi_calisma',
      name: 'Çalışma / Hobi Odası (Tavan Pencereli)',
      type: 'room',
      areaM2: Math.round(atticArea * 0.18 * 10) / 10,
      widthM: 3.5,
      depthM: 3.2,
      xPercent: 5,
      yPercent: 60,
      widthPercent: 45,
      depthPercent: 35,
    },
    {
      id: 'ebeveyn_banyo',
      name: 'Ebeveyn Banyo / Jakuzi',
      type: 'bath',
      areaM2: Math.round(atticArea * 0.10 * 10) / 10,
      widthM: 2.4,
      depthM: 2.5,
      xPercent: 58,
      yPercent: 55,
      widthPercent: 20,
      depthPercent: 40,
    },
    {
      id: 'dubleks_galeri',
      name: 'Dubleks İç Merdiven & Galeri Boşluğu',
      type: 'hall',
      areaM2: Math.round(atticArea * 0.09 * 10) / 10,
      widthM: 2.2,
      depthM: 2.8,
      xPercent: 80,
      yPercent: 55,
      widthPercent: 16,
      depthPercent: 40,
    },
  ];
}

export interface FlatLayout {
  id: string;
  name: string;
  flatNumber: number;
  netArea: number;
  grossArea: number;
  bounds: {
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    depthPercent: number;
  };
  entranceDoor: {
    xPercent: number;
    yPercent: number;
  };
  rooms: RoomDetail[];
}

export function getFloorFlatLayouts(
  params: BuildingModelParams,
  metrics: BuildingMetrics
): FlatLayout[] {
  const count = Math.max(1, Math.min(4, params.flatsPerFloor));
  const baseNet = metrics.flatNetArea;
  const baseGross = metrics.flatGrossArea;
  const roomType = params.roomType;

  // Single Flat per floor (Tam Kat Lüks Rezidans)
  if (count === 1) {
    const rawRooms = getRoomsForFlat(roomType, baseNet);
    return [
      {
        id: 'flat-1',
        name: 'Kat Dairesi (Tam Kat Rezidans)',
        flatNumber: 1,
        netArea: baseNet,
        grossArea: baseGross,
        bounds: {
          xPercent: 2,
          yPercent: 2,
          widthPercent: 96,
          depthPercent: 96,
        },
        entranceDoor: {
          xPercent: 50,
          yPercent: 45,
        },
        rooms: rawRooms,
      },
    ];
  }

  // 2 Flats per floor (Standart İkiz Simetrik Daireler)
  if (count === 2) {
    const leftRooms = getRoomsForFlat(roomType, baseNet);
    // Right flat is mirrored on the X-axis
    const rightRooms = leftRooms.map((r) => ({
      ...r,
      id: `${r.id}_r`,
      // Mirror X within the flat
      xPercent: Math.max(2, 100 - r.xPercent - r.widthPercent),
    }));

    return [
      {
        id: 'flat-1',
        name: 'Daire 1 (Sol Kanat)',
        flatNumber: 1,
        netArea: baseNet,
        grossArea: baseGross,
        bounds: {
          xPercent: 2,
          yPercent: 2,
          widthPercent: 46.5,
          depthPercent: 96,
        },
        entranceDoor: {
          xPercent: 47,
          yPercent: 50,
        },
        rooms: leftRooms,
      },
      {
        id: 'flat-2',
        name: 'Daire 2 (Sağ Kanat)',
        flatNumber: 2,
        netArea: baseNet,
        grossArea: baseGross,
        bounds: {
          xPercent: 51.5,
          yPercent: 2,
          widthPercent: 46.5,
          depthPercent: 96,
        },
        entranceDoor: {
          xPercent: 53,
          yPercent: 50,
        },
        rooms: rightRooms,
      },
    ];
  }

  // 3 Flats per floor (Ön Sol, Ön Sağ ve Arka Bahçe Dairesi)
  if (count === 3) {
    const frontNet = Math.round(baseNet * 0.95 * 10) / 10;
    const rearNet = Math.round(baseNet * 1.1 * 10) / 10;
    const frontRoomsLeft = getRoomsForFlat(roomType === '4+1' ? '2+1' : roomType === '3+1' ? '2+1' : roomType, frontNet);
    const frontRoomsRight = frontRoomsLeft.map((r) => ({
      ...r,
      id: `${r.id}_r`,
      xPercent: Math.max(2, 100 - r.xPercent - r.widthPercent),
    }));
    const rearRooms = getRoomsForFlat(roomType, rearNet);

    return [
      {
        id: 'flat-1',
        name: 'Daire 1 (Ön Sol)',
        flatNumber: 1,
        netArea: frontNet,
        grossArea: baseGross,
        bounds: {
          xPercent: 2,
          yPercent: 2,
          widthPercent: 46.5,
          depthPercent: 46,
        },
        entranceDoor: {
          xPercent: 47,
          yPercent: 46,
        },
        rooms: frontRoomsLeft,
      },
      {
        id: 'flat-2',
        name: 'Daire 2 (Ön Sağ)',
        flatNumber: 2,
        netArea: frontNet,
        grossArea: baseGross,
        bounds: {
          xPercent: 51.5,
          yPercent: 2,
          widthPercent: 46.5,
          depthPercent: 46,
        },
        entranceDoor: {
          xPercent: 53,
          yPercent: 46,
        },
        rooms: frontRoomsRight,
      },
      {
        id: 'flat-3',
        name: 'Daire 3 (Arka Bahçe Cephesi)',
        flatNumber: 3,
        netArea: rearNet,
        grossArea: baseGross,
        bounds: {
          xPercent: 2,
          yPercent: 54,
          widthPercent: 96,
          depthPercent: 44,
        },
        entranceDoor: {
          xPercent: 50,
          yPercent: 54,
        },
        rooms: rearRooms,
      },
    ];
  }

  // 4 Flats per floor (4 Ayrı Çeyrek / Quadrant Modeli)
  const quadRoomsFL = getRoomsForFlat(roomType === '4+1' || roomType === '3+1' ? '2+1' : roomType, baseNet);
  const quadRoomsFR = quadRoomsFL.map((r) => ({
    ...r,
    id: `${r.id}_fr`,
    xPercent: Math.max(2, 100 - r.xPercent - r.widthPercent),
  }));
  const quadRoomsRL = quadRoomsFL.map((r) => ({
    ...r,
    id: `${r.id}_rl`,
    yPercent: Math.max(2, 100 - r.yPercent - r.depthPercent),
  }));
  const quadRoomsRR = quadRoomsFR.map((r) => ({
    ...r,
    id: `${r.id}_rr`,
    yPercent: Math.max(2, 100 - r.yPercent - r.depthPercent),
  }));

  return [
    {
      id: 'flat-1',
      name: 'Daire 1 (Ön Sol)',
      flatNumber: 1,
      netArea: baseNet,
      grossArea: baseGross,
      bounds: {
        xPercent: 2,
        yPercent: 2,
        widthPercent: 46.5,
        depthPercent: 45,
      },
      entranceDoor: {
        xPercent: 47,
        yPercent: 45,
      },
      rooms: quadRoomsFL,
    },
    {
      id: 'flat-2',
      name: 'Daire 2 (Ön Sağ)',
      flatNumber: 2,
      netArea: baseNet,
      grossArea: baseGross,
      bounds: {
        xPercent: 51.5,
        yPercent: 2,
        widthPercent: 46.5,
        depthPercent: 45,
      },
      entranceDoor: {
        xPercent: 53,
        yPercent: 45,
      },
      rooms: quadRoomsFR,
    },
    {
      id: 'flat-3',
      name: 'Daire 3 (Arka Sol)',
      flatNumber: 3,
      netArea: baseNet,
      grossArea: baseGross,
      bounds: {
        xPercent: 2,
        yPercent: 53,
        widthPercent: 46.5,
        depthPercent: 45,
      },
      entranceDoor: {
        xPercent: 47,
        yPercent: 53,
      },
      rooms: quadRoomsRL,
    },
    {
      id: 'flat-4',
      name: 'Daire 4 (Arka Sağ)',
      flatNumber: 4,
      netArea: baseNet,
      grossArea: baseGross,
      bounds: {
        xPercent: 51.5,
        yPercent: 53,
        widthPercent: 46.5,
        depthPercent: 45,
      },
      entranceDoor: {
        xPercent: 53,
        yPercent: 53,
      },
      rooms: quadRoomsRR,
    },
  ];
}

export function getShopFloorLayout(
  params: BuildingModelParams,
  metrics: BuildingMetrics
): FlatLayout[] {
  const footprint = metrics.footprintArea;
  const coreArea = metrics.coreArea;
  const netShopTotal = Math.max(30, Math.round((footprint - coreArea - footprint * 0.08) * 100) / 100);
  const shopCount = Math.max(1, Math.min(4, params.shopCount || 1));

  if (shopCount === 1) {
    return [
      {
        id: 'shop-1',
        name: 'Zemin Ticari Mağaza / Dükkan',
        flatNumber: 1,
        netArea: netShopTotal,
        grossArea: footprint,
        bounds: {
          xPercent: 2,
          yPercent: 2,
          widthPercent: 96,
          depthPercent: 96,
        },
        entranceDoor: {
          xPercent: 50,
          yPercent: 98, // Front street facade
        },
        rooms: [
          {
            id: 'vitrin_showroom',
            name: 'Ön Cephe Vitrini & Karşılama',
            type: 'salon',
            areaM2: Math.round(netShopTotal * 0.28 * 100) / 100,
            widthM: Math.round(params.facadeWidth * 0.9 * 10) / 10,
            depthM: 3.5,
            xPercent: 4,
            yPercent: 68,
            widthPercent: 92,
            depthPercent: 28,
          },
          {
            id: 'ana_satis',
            name: 'Ana Teşhir & Perakende Alanı',
            type: 'room',
            areaM2: Math.round(netShopTotal * 0.44 * 100) / 100,
            widthM: Math.round(params.facadeWidth * 0.5 * 10) / 10,
            depthM: 6.0,
            xPercent: 4,
            yPercent: 8,
            widthPercent: 42,
            depthPercent: 56,
          },
          {
            id: 'ofis_kasa',
            name: 'Yönetici Ofisi / Kasa Noktası',
            type: 'room',
            areaM2: Math.round(netShopTotal * 0.14 * 100) / 100,
            widthM: 3.8,
            depthM: 3.5,
            xPercent: 54,
            yPercent: 8,
            widthPercent: 42,
            depthPercent: 26,
          },
          {
            id: 'depo_mal_kabul',
            name: 'Arka Depo & Mal Kabul',
            type: 'hall',
            areaM2: Math.round(netShopTotal * 0.08 * 100) / 100,
            widthM: 3.0,
            depthM: 2.5,
            xPercent: 54,
            yPercent: 38,
            widthPercent: 26,
            depthPercent: 26,
          },
          {
            id: 'shop_wc',
            name: 'Personel WC & Lavabo',
            type: 'bath',
            areaM2: Math.round(netShopTotal * 0.06 * 100) / 100,
            widthM: 1.8,
            depthM: 2.0,
            xPercent: 82,
            yPercent: 38,
            widthPercent: 14,
            depthPercent: 26,
          },
        ],
      },
    ];
  }

  // 2 Shops
  const shopNet = Math.round((netShopTotal / 2) * 100) / 100;
  return [
    {
      id: 'shop-1',
      name: 'Dükkan 1 (Sol Cephe)',
      flatNumber: 1,
      netArea: shopNet,
      grossArea: Math.round((footprint / 2) * 100) / 100,
      bounds: {
        xPercent: 2,
        yPercent: 2,
        widthPercent: 46.5,
        depthPercent: 96,
      },
      entranceDoor: {
        xPercent: 25,
        yPercent: 98,
      },
      rooms: [
        {
          id: 'vitrin_1',
          name: 'Vitrin & Ön Satış Alanı',
          type: 'salon',
          areaM2: Math.round(shopNet * 0.45 * 100) / 100,
          widthM: 5.5,
          depthM: 4.2,
          xPercent: 4,
          yPercent: 50,
          widthPercent: 92,
          depthPercent: 46,
        },
        {
          id: 'satis_1',
          name: 'Mağaza Teşhir Bölümü',
          type: 'room',
          areaM2: Math.round(shopNet * 0.35 * 100) / 100,
          widthM: 5.5,
          depthM: 4.0,
          xPercent: 4,
          yPercent: 6,
          widthPercent: 92,
          depthPercent: 40,
        },
        {
          id: 'wc_1',
          name: 'Ofis & WC',
          type: 'bath',
          areaM2: Math.round(shopNet * 0.20 * 100) / 100,
          widthM: 2.2,
          depthM: 2.5,
          xPercent: 55,
          yPercent: 6,
          widthPercent: 41,
          depthPercent: 24,
        },
      ],
    },
    {
      id: 'shop-2',
      name: 'Dükkan 2 (Sağ Cephe)',
      flatNumber: 2,
      netArea: shopNet,
      grossArea: Math.round((footprint / 2) * 100) / 100,
      bounds: {
        xPercent: 51.5,
        yPercent: 2,
        widthPercent: 46.5,
        depthPercent: 96,
      },
      entranceDoor: {
        xPercent: 75,
        yPercent: 98,
      },
      rooms: [
        {
          id: 'vitrin_2',
          name: 'Vitrin & Ön Satış Alanı',
          type: 'salon',
          areaM2: Math.round(shopNet * 0.45 * 100) / 100,
          widthM: 5.5,
          depthM: 4.2,
          xPercent: 4,
          yPercent: 50,
          widthPercent: 92,
          depthPercent: 46,
        },
        {
          id: 'satis_2',
          name: 'Mağaza Teşhir Bölümü',
          type: 'room',
          areaM2: Math.round(shopNet * 0.35 * 100) / 100,
          widthM: 5.5,
          depthM: 4.0,
          xPercent: 4,
          yPercent: 6,
          widthPercent: 92,
          depthPercent: 40,
        },
        {
          id: 'wc_2',
          name: 'Ofis & WC',
          type: 'bath',
          areaM2: Math.round(shopNet * 0.20 * 100) / 100,
          widthM: 2.2,
          depthM: 2.5,
          xPercent: 4,
          yPercent: 6,
          widthPercent: 41,
          depthPercent: 24,
        },
      ],
    },
  ];
}

export function getBasementFloorLayout(
  params: BuildingModelParams,
  metrics: BuildingMetrics
): FlatLayout[] {
  const footprint = metrics.footprintArea;
  const coreArea = metrics.coreArea;
  const netBasement = Math.max(30, Math.round((footprint - coreArea - footprint * 0.08) * 100) / 100);

  return [
    {
      id: 'basement-communal',
      name: 'Bodrum Kat Ortak Alan & Hizmet Birimleri',
      flatNumber: 0,
      netArea: netBasement,
      grossArea: footprint,
      bounds: {
        xPercent: 2,
        yPercent: 2,
        widthPercent: 96,
        depthPercent: 96,
      },
      entranceDoor: {
        xPercent: 50,
        yPercent: 50,
      },
      rooms: [
        {
          id: 'otopark',
          name: 'Kapalı Otopark & Manevra Alanı',
          type: 'salon',
          areaM2: Math.round(netBasement * 0.48 * 100) / 100,
          widthM: Math.round(params.facadeWidth * 0.9 * 10) / 10,
          depthM: 6.5,
          xPercent: 4,
          yPercent: 52,
          widthPercent: 92,
          depthPercent: 44,
        },
        {
          id: 'siginak',
          name: 'Afet Sığınağı (Mevzuata Uygun)',
          type: 'room',
          areaM2: Math.round(netBasement * 0.22 * 100) / 100,
          widthM: 4.8,
          depthM: 4.5,
          xPercent: 4,
          yPercent: 6,
          widthPercent: 42,
          depthPercent: 42,
        },
        {
          id: 'su_deposu',
          name: 'Yangın & Kullanım Suyu Deposu',
          type: 'hall',
          areaM2: Math.round(netBasement * 0.12 * 100) / 100,
          widthM: 3.2,
          depthM: 2.8,
          xPercent: 54,
          yPercent: 6,
          widthPercent: 22,
          depthPercent: 42,
        },
        {
          id: 'jenerator_pano',
          name: 'Trafo, Pano & Jeneratör Odası',
          type: 'bath',
          areaM2: Math.round(netBasement * 0.10 * 100) / 100,
          widthM: 2.8,
          depthM: 2.8,
          xPercent: 78,
          yPercent: 6,
          widthPercent: 18,
          depthPercent: 20,
        },
        {
          id: 'bina_depo',
          name: 'Bina Sakinleri Eklenti Deposu',
          type: 'hall',
          areaM2: Math.round(netBasement * 0.08 * 100) / 100,
          widthM: 2.8,
          depthM: 2.2,
          xPercent: 78,
          yPercent: 28,
          widthPercent: 18,
          depthPercent: 20,
        },
      ],
    },
  ];
}

