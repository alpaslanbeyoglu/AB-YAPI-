export type AppTheme = 'light' | 'gray';

export interface FlatItem {
  id: number;
  name: string;
  tc: string;
  area: number;
  downPayment: number;
  useTransformationCredit: boolean;
  isContractorShare?: boolean; // true = Müteahhit Dairesi, false = Hak Sahibi Dairesi
}

export interface ProjectParams {
  projectAddress: string;
  durationOption: 'auto' | 'manual' | 'hide';
  manualMonths: number;
  transformationStatus: 'currentSupport' | 'futureSupport2027' | 'none';
  projectModel: 'cash' | 'contractorShare';
  baseBuildArea: number;
  floorCount: number;
  flatCount: number;
  contractorShareRate: number;
  contractorFlatIds?: number[]; // IDs of flats designated for contractor
  showContractorShare3D?: boolean; // Show contractor share on 3D model
  buildingType: 'standard' | 'luxury' | 'commercial';
  roomType?: RoomType;
  usdRate: number;
  costMultiplier: number;
  profitRate: number;

  // Dükkan / Ticari Seçeneği (Normal kat harici dükkan)
  hasGroundFloorShop?: boolean;
  shopCount?: number;
  shopHeight?: number;

  // Çıkma / Tabla Konsolu (1. kattan sonra tabla çıkması)
  hasCantilever?: boolean;
  cantileverDepth?: number;
  cantileverDirection?: 'front_back' | 'front' | 'all';

  // Mimari Çatı ve Kütle Özellikleri
  roofType?: RoofType;
  basementCount?: number;
  facadeWidth?: number;
  facadeDepth?: number;
  flatsPerFloor?: number;
  balconyDepth?: number;
  facadeStyle?: 'modern' | 'wood_anthracite' | 'glass_minimal' | 'brick_stone';
  elevatorCount?: number;

  // Cost items
  costNotaryContract: number;
  costCompany: number;
  priceProjectPermit: number;
  priceSgk: number;
  costInsurance: number;
  costSalesMarketing: number;

  // Kaba insaat
  priceConcrete: number;
  priceSteel: number;
  costKabaWork: number;

  // Ince insaat
  costElevator: number;
  priceSmartHome: number;
  costIntercom: number;
  priceGas: number;
  pricePlumbing: number;
  priceElectric: number;
  pricePvc: number;
  priceTiles: number;
  priceKitchen: number;
  priceDoors: number;
  pricePaintPlaster: number;

  // Policies & stages
  includeProfitOwner: 'yes' | 'no';
  stage1Pay: number;
  stage2Pay: number;
  stage3Pay: number;
  stage4Pay: number;
  stage5Pay: number;

  // Flats
  flats: FlatItem[];
}

export interface CashFlowRow {
  stageNumber: number;
  name: string;
  income: number;
  expense: number;
  periodBalance: number;
  cumulativeBalance: number;
}

export interface FlatCalcResult {
  id: number;
  name: string;
  tc: string;
  area: number;
  grossPay: number;
  downPayment: number;
  usedCredit: number;
  netRemainingDebt: number;
  isContractorShare?: boolean;
  stagePayments: [number, number, number, number, number];
}

export interface CalculationResult {
  totalArea: number;
  baseArea: number;
  flatCount: number;
  autoDurationMonths: number;
  finalMonths: number;
  totalDays: number;
  kabaDaysTotal: number;
  inceDaysTotal: number;
  
  // Costs
  officialCost: number;
  sgkSalesCost: number;
  kabaTotalCost: number;
  systemsCost: number;
  finishingTotalCost: number;
  subTotalCost: number;
  profitAmount: number;
  grandTotal: number;

  // Unit costs
  netCostPerSqM: number;
  grossCostPerSqM: number;
  netUsdPerSqM: number;
  grossUsdPerSqM: number;
  baseCostPerSqM: number;

  // Material estimates
  concreteM3: number;
  steelTon: number;

  // Cash flow & flats
  cashFlowRows: CashFlowRow[];
  flatResults: FlatCalcResult[];
  calculatedAt: string;
}

export interface DriveProjectFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  description?: string;
  properties?: Record<string, string>;
}

export interface SavedProjectData {
  version: string;
  savedAt: string;
  projectAddress: string;
  params: ProjectParams;
  results: CalculationResult;
}

export type RoomType = '1+1' | '2+1' | '3+1' | '4+1';

export type RoofType = 'gable' | 'flat' | 'mansard' | 'duplex';

export interface BuildingModelParams {
  facadeWidth: number;       // Ön cephe genişliği (m)
  facadeDepth: number;       // Yan cephe / derinlik (m)
  floorHeight: number;       // Kat yüksekliği (m)
  floorCount: number;        // Normal kat sayısı
  basementCount: number;     // Bodrum kat sayısı
  flatsPerFloor: number;     // Katta daire sayısı (1, 2, 3, 4)
  roomType: RoomType;        // Daire oda tipi
  stairWidth: number;        // Merdiven kovası genişliği (m)
  stairDepth: number;        // Merdiven kovası derinliği (m)
  elevatorWidth: number;     // Asansör kuyu genişliği (m)
  elevatorDepth: number;     // Asansör kuyu derinliği (m)
  elevatorCount: number;     // Asansör sayısı (1, 2)
  balconyDepth: number;      // Balkon / çıkma payı (m)
  roofType: RoofType;        // Çatı tipi: Kırma, Teras, Mansart, Çatı Dubleksi
  facadeStyle: 'modern' | 'wood_anthracite' | 'glass_minimal' | 'brick_stone';
  wallThickness: number;     // Dış duvar kalınlığı (m)
  showFurniture: boolean;    // Mobilya katmanı
  showDimensions: boolean;   // Ölçülendirme çizgileri
  showInteriorRooms: boolean;// 3D modelde odaların ve bölmelerin görünmesi
  interiorCutMode: 'solid' | 'xray' | 'cutaway'; // 'solid': dolu cephe, 'xray': şeffaf dış duvar, 'cutaway': açık kat kesiti
  // Dükkan / Ticari Seçeneği (Normal kat harici dükkan)
  hasGroundFloorShop?: boolean;
  shopCount?: number;
  shopHeight?: number;
  // Çıkma / Tabla Konsolu (1. kattan itibaren konsol çıkması)
  hasCantilever?: boolean;
  cantileverDepth?: number;
  cantileverDirection?: 'front_back' | 'front' | 'all';
  // Müteahhit Payı / Daire Paylaşımı
  contractorFlatIds?: number[];          // Müteahhite kalacak dairelerin ID listesi
  showContractorShare3D?: boolean;       // 3D model üzerinde müteahhit ve hak sahibi dairelerini görselleştirme seçeneği
  projectModel?: 'cash' | 'contractorShare';
  contractorShareRate?: number;
  flatCount?: number;
}
