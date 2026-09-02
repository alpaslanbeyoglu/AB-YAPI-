import { BuildingModelParams, RoomType } from '../types';

export const DEFAULT_BUILDING_PARAMS: BuildingModelParams = {
  facadeWidth: 14.0,       // Ön cephe 14 metre
  facadeDepth: 18.0,       // Yan cephe derinlik 18 metre
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
  totalBuiltArea: number;      // Toplam inşaat alanı (m²)
  totalHeight: number;         // Toplam bina yüksekliği (m)
  totalFlats: number;          // Toplam daire sayısı
  coreArea: number;            // Merdiven + Asansör çekirdek alanı (m²)
  floorGrossArea: number;      // Kat brüt alanı (m²)
  flatGrossArea: number;       // Daire başına brüt alan (m²)
  flatNetArea: number;         // Daire başına net kullanım alanı (m²)
  stairTotalArea: number;      // Merdiven alanı
  elevatorTotalArea: number;   // Asansör alanı
  balconyTotalArea: number;    // Balkon alanı
}

export function calculateBuildingMetrics(params: BuildingModelParams): BuildingMetrics {
  const footprintArea = Math.round(params.facadeWidth * params.facadeDepth * 10) / 10;
  const totalFloors = params.floorCount + params.basementCount;
  // If duplex roof, attic floor adds ~60% of a floor's built area
  const duplexAtticArea = params.roofType === 'duplex' ? footprintArea * 0.65 : params.roofType === 'mansard' ? footprintArea * 0.5 : 0;
  const totalBuiltArea = Math.round((footprintArea * totalFloors + duplexAtticArea) * 10) / 10;

  const roofHeightAdd =
    params.roofType === 'mansard'
      ? 3.2
      : params.roofType === 'duplex'
      ? 3.4
      : params.roofType === 'gable'
      ? 2.5
      : 0.9;
  const totalHeight = Math.round((params.floorCount * params.floorHeight + roofHeightAdd) * 10) / 10;
  const totalFlats = params.floorCount * params.flatsPerFloor;

  const stairTotalArea = Math.round(params.stairWidth * params.stairDepth * 10) / 10;
  const elevatorTotalArea = Math.round(params.elevatorWidth * params.elevatorDepth * params.elevatorCount * 10) / 10;
  const coreHallArea = Math.round(params.stairWidth * 2.0 * 10) / 10; // Kat koridoru
  const coreArea = Math.round((stairTotalArea + elevatorTotalArea + coreHallArea) * 10) / 10;

  // Dış duvar payı ~%8
  const wallLoss = footprintArea * 0.08;
  const residentialAreaOnFloor = Math.max(20, footprintArea - coreArea - wallLoss);

  const flatNetArea = Math.round((residentialAreaOnFloor / params.flatsPerFloor) * 10) / 10;
  const flatGrossArea = Math.round((footprintArea / params.flatsPerFloor) * 10) / 10;
  const balconyTotalArea = Math.round(params.balconyDepth * 3.5 * 10) / 10;

  return {
    footprintArea,
    totalBuiltArea,
    totalHeight,
    totalFlats,
    coreArea,
    floorGrossArea: footprintArea,
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
          areaM2: Math.round(netArea * 0.29 * 10) / 10,
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
          areaM2: Math.round(netArea * 0.15 * 10) / 10,
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
          areaM2: Math.round(netArea * 0.20 * 10) / 10,
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
          areaM2: Math.round(netArea * 0.13 * 10) / 10,
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
          areaM2: Math.round(netArea * 0.11 * 10) / 10,
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
          areaM2: Math.round(netArea * 0.08 * 10) / 10,
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

