export type AppTheme = 'light' | 'gray';

export interface CompanyProfilePrintOptions {
  showLogo?: boolean;
  showLegalName?: boolean;
  showSlogan?: boolean;
  showTagline?: boolean;
  showTaxInfo?: boolean;
  showTradeRegistry?: boolean;
  showMersis?: boolean;
  showContractorLicence?: boolean;
  showChamberNo?: boolean;
  showFirstAuthorized?: boolean;
  showFirstAuthorizedChamber?: boolean;
  showSecondAuthorized?: boolean;
  showSecondAuthorizedChamber?: boolean;
  showStamp?: boolean;
  showPhone?: boolean;
  showEmail?: boolean;
  showWebsite?: boolean;
  showAddress?: boolean;
  showBankInfo?: boolean;
  showFloorAndFacade?: boolean;
  showLandShareAndSerefiye?: boolean;
}

export interface CompanyProfile {
  companyName: string;          // Örn: "AB YAPI"
  legalName: string;            // Örn: "AB YAPI MÜTEAHHİTLİK VE MÜHENDİSLİK TİC. LTD. ŞTİ."
  slogan: string;               // Örn: "Güvene Yükselen Yapılar"
  tagline: string;              // Örn: "Kentsel Dönüşüm, Mühendislik ve Kat Karşılığı Projeler"
  authorizedPerson: string;     // Örn: "Müh. Alpaslan Beyoğlu"
  authorizedTitle: string;      // Örn: "Genel Müdür / İnşaat Mühendisi"
  authorizedChamberNo?: string; // Örn: "İMO-74120"
  authorizedPerson2?: string;   // Örn: "2. Yetkili (İsteğe bağlı)"
  authorizedTitle2?: string;    // Örn: "Şantiye Şefi / Mimar"
  authorizedChamberNo2?: string;// Örn: "MO-55210"
  phone: string;                // Örn: "+90 (212) 585 10 20"
  email: string;                // Örn: "info@abyapi.com.tr"
  website: string;              // Örn: "www.abyapi.com.tr"
  address: string;              // Örn: "Fatih Kocamustafapaşa Mah. İstanbul"
  taxOffice: string;            // Örn: "Fatih V.D."
  taxNumber: string;            // Örn: "0010523491"
  tradeRegistryNo?: string;     // Örn: "İTO-412580"
  mersisNo?: string;            // Örn: "0001052349100012"
  contractorLicenceNo?: string; // Örn: "YAMBİS: 0034125890" (Müteahhitlik Yetki Belge No)
  chamberNo?: string;           // Örn: "İTO Sicil: 412580"
  iban?: string;                // Örn: "TR42 0001 0002 1234 5678 9050 01"
  bankName?: string;            // Örn: "Ziraat Bankası A.Ş."
  logoBase64?: string;          // Yüklenen özel firma logosu (Base64 dataURL formatında)
  stampBase64?: string;         // Yüklenen dijital kaşe ve imza görseli (Base64 dataURL formatında)
  printOptions?: CompanyProfilePrintOptions; // Çıktılarda hangi alanların görüneceği tercihleri
}

export type FootprintInputMode = 'directArea' | 'dimensions' | 'customFacades' | 'lShape' | 'polygonDraw';

export interface PolygonPoint {
  id?: string;
  x: number; // Metre cinsinden X koordinatı
  y: number; // Metre cinsinden Y (veya Z derinlik) koordinatı
}

export interface GeometricValidationMetrics {
  area: number;
  perimeter: number;
  edgeCount: number;
  boundingBox: { width: number; depth: number; centerX: number; centerY: number };
  centroid: { x: number; y: number };
  isSelfIntersecting: boolean;
  isConvex: boolean;
  isOrthogonal: boolean;
  minEdgeLength: number;
  maxEdgeLength: number;
  avgEdgeLength: number;
}

export interface GeometricValidationResult {
  isValid: boolean;
  healthScore: number; // 0 - 100
  issues: string[];    // Critical errors (blocking)
  warnings: string[];  // Non-blocking quality warnings
  recommendations: string[];
  metrics: GeometricValidationMetrics;
  gridAlignment: {
    totalVertices: number;
    alignedVertices: number;
    alignmentPercentage: number;
    axesX: number[];
    axesY: number[];
  };
}

export type BalconyType =
  | 'standard'        // Açık Konsol Balkon (Klasik Çıkma)
  | 'cantilever'      // Açık Konsol Balkon
  | 'glass_enclosed'  // Katlanır Cam Balkon (Camlama / Kış Bahçesi - TR Mimarisinde En Yaygın)
  | 'recessed'        // Gömme / Lojya Balkon (İçerlek Cephe)
  | 'french'          // Fransız Balkon (Minimal Emniyet Korkuluklu Zemin Camı)
  | 'corner'          // Köşe / L-Tipi Balkon
  | 'cumba';          // Cumba / Kapalı Çıkma Balkon (Pencereli Kapalı Yaşam Alanı)

export interface FacadeDetailConfig {
  id: number;
  name: string;               // Örn: "1. Ön Cephe (Yol / Ana Giriş)", "2. Sağ Yan Cephe", vb.
  length: number;             // Metre cinsinden cephe uzunluğu
  windowCountPerFloor: number;// Katta bu cephedeki pencere adedi (0, 1, 2, 3, 4, 5)
  hasBalcony: boolean;        // Bu cephede balkon var mı?
  balconyCountPerFloor: number;// Katta bu cephedeki balkon adedi (0, 1, 2, 3)
  balconyType?: BalconyType;  // Türkiye mimarisinde yaygın balkon tipleri
  isEntrance?: boolean;       // Bina ana giriş kapısı bu cephede mi?
  isAdjacent?: boolean;       // Bitişik nizam / Komşu parsele bitişik cephe (İmar mevzuatı gereği çıkma ve pencere yapılamaz)
  isBlankWall?: boolean;      // Sağır duvar / Kör cephe
  cantileverDepth?: number;   // Bu cephedeki konsol çıkma derinliği (m)
}

export interface CustomFacadeSide {
  id: number;
  name: string;        // Örn: "1. Ön Cephe (Yol)", "2. Sağ Yan Cephe (Komşu)", "3. Arka Cephe (Bahçe)", "4. Sol Yan Cephe"
  length: number;      // Uzunluk (metre)
  windowCountPerFloor?: number;
  hasBalcony?: boolean;
  balconyCountPerFloor?: number;
  balconyType?: BalconyType;
  isEntrance?: boolean;
  isAdjacent?: boolean;
  isBlankWall?: boolean;
  cantileverDepth?: number;
}

export interface FlatItem {
  id: number;
  name: string;
  tc: string;
  area: number;
  downPayment: number;
  useTransformationCredit: boolean;
  isContractorShare?: boolean; // true = Müteahhit Dairesi, false = Hak Sahibi Dairesi
  salePrice?: number; // Müteahhit dairesi için satış fiyatı (TL)
  flatType?: 'standard' | 'mansard' | 'duplex' | 'shop'; // Daire tipi
  description?: string; // Ek açıklama (örn: "Çatı Katı Mansart - Ayrı Bağımsız Bölüm", "Çatı Dubleksi - Tek Bağımsız Bölüm")
  floorNumber?: number; // Bulunduğu Kat No (örn: 0 Zemin, 1, 2, 3...)
  facade?: 'guney' | 'kuzey' | 'dogu' | 'bati' | 'guney_bati' | 'guney_dogu' | 'kuzey_bati' | 'kuzey_dogu' | 'kose' | 'on' | 'arka'; // Cephe / Yön
  serefiyeMultiplier?: number; // Şerefiye Değerleme Çarpanı (Varsayılan 1.00; Örn: 1.15 = %15 daha değerli/üst kat, 0.90 = %10 zemin/arka)
  landShareNumerator?: number; // Mevcut Arsa Payı Payı (Örn: 10)
  landShareDenominator?: number; // Mevcut Arsa Payı Paydası (Örn: 240)
}

export type FacadeStyleType =
  | 'modern'
  | 'wood_anthracite'
  | 'glass_minimal'
  | 'brick_stone'
  | 'travertine_luxury'
  | 'terracotta_warm'
  | 'nordic_black'
  | 'concrete_brutalist'
  | 'mediterranean_white'
  | 'cappadocia_tuff';

export type ShopLocation = 'ground' | 'basement' | 'both';

export type MunicipalIncentiveDistrict = 'none' | 'gungoren' | 'kadikoy' | 'esenler' | 'zeytinburnu' | 'custom';

export interface MunicipalIncentiveConfig {
  enabled: boolean;
  district: MunicipalIncentiveDistrict;
  customDistrictName?: string;
  minMergingParcelCount?: number; // Tevhit için gereken min parsel/bina sayısı (örn: 2 veya 3)
  grantedExtraFloors: number; // Verilen ek normal kat hakkı (+1, +2 vb.)
  grantedMansardRoof: boolean; // Mansart / çatı piyesi bağımsız bölüm teşviki
  grantedFloorAreaBonusPercent: number; // Emsal / KAKS artış bonusu (%) (örn: %20, %25)
  description?: string;
}

export interface ExistingBuilding {
  id: string;
  name: string;
  floorCount: number;
  flatCount: number;
  avgFlatArea?: number; // Ortalama daire m² (Net/Brüt)
  hasShop?: boolean; // Mevcut binada dükkan var mı?
  shopCount?: number; // Dükkan adedi
  shopLocation?: ShopLocation; // 'ground': Zemin Kat, 'basement': Bodrum Kat, 'both': Zemin + Bodrum Depolu
  avgShopArea?: number; // Ortalama dükkan m²
  baseArea?: number; // Taban oturum alanı (m²)
  totalExistingArea?: number; // Toplam mevcut inşaat / bağımsız bölüm alanı (m²)
  landShareNumerator?: number; // Arsa payı payı (örn: 10)
  landShareDenominator?: number; // Arsa payı paydası (örn: 100)
  note?: string; // Ek açıklama / ada parsel notu
}

export type CantileverDirection = 'open_facades' | 'front_back' | 'front' | 'all' | 'custom';

export interface ProjectParams {
  projectName?: string;        // Müşteri / Proje Adı
  projectType?: string;        // Proje Türü: 'kentsel' | 'kat_karsiligi' | 'muteahhitlik' vb.
  basementPurpose?: string;    // Bodrum kullanım amacı: 'shelter_depot' | 'parking' | 'shop'
  roofAtticType?: 'independent' | 'duplex_unified'; // Çatı arası bağımsız mı yoksa dubleks mi
  projectAddress: string;
  existingBuildings?: ExistingBuilding[]; // Mevcut birleşecek binalar
  manualFlatUnitPrice?: number;    // Manuel daire birim m2 maliyet fiyatı
  manualShopUnitPrice?: number;    // Manuel dükkan birim m2 maliyet fiyatı
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

  // Taban Oturumu ve Cephe Ölçü Giriş Seçenekleri
  footprintInputMode?: FootprintInputMode; // 'directArea': Doğrudan m², 'dimensions': Ön x Yan Cephe, 'customFacades': Çoklu Cepheler, 'lShape': L-Tipi Kademeli, 'polygonDraw': Serbest Çizim
  facadeWidth?: number;       // Ön Cephe Genişliği (m) [Ön]
  facadeDepth?: number;       // Sağ Yan Cephe Derinliği (m) [Sağ]
  backFacadeLength?: number;  // Arka Cephe Genişliği (m) [Arka]
  leftFacadeLength?: number;  // Sol Yan Cephe Derinliği (m) [Sol]
  customFacadeCount?: number; // Cephe adedi (4, 5, 6, 8 vb.)
  customFacades?: CustomFacadeSide[]; // Cephe uzunlukları listesi
  lShapeFrontMain?: number;   // L-Tipi Ana Ön Cephe (m)
  lShapeDepthMain?: number;   // L-Tipi Ana Yan Derinlik (m)
  lShapeRecessFront?: number; // L-Tipi Girinti Eni (m)
  lShapeRecessDepth?: number; // L-Tipi Girinti Derinliği (m)
  polygonPoints?: PolygonPoint[]; // Serbest çizilen köşe noktaları (m)
  facadeConfigs?: FacadeDetailConfig[]; // Her cephe için pencere, balkon ve giriş konfigürasyonları
  mainEntranceFacadeIndex?: number; // Ana bina giriş kapısının bulunduğu cephe indeksi (0, 1, 2, ... N)
  roads?: RoadConfig[]; // Parsel çevresindeki yollar

  // Dükkan / Ticari Seçeneği (Normal kat harici dükkan)
  hasGroundFloorShop?: boolean;
  hasBasementShop?: boolean;
  shopLocation?: ShopLocation; // 'ground' | 'basement' | 'both'
  shopCount?: number;
  shopHeight?: number;
  shopArea?: number; // Dükkan ortalama m²

  // Belediye Teşvikleri & Tevhit İmar Bonusları (Güngören, Kadıköy, Esenler vb.)
  municipalIncentives?: MunicipalIncentiveConfig;

  // Çıkma / Tabla Konsolu (1. kattan sonra tabla çıkması)
  hasCantilever?: boolean;
  cantileverDepth?: number;
  cantileverDirection?: CantileverDirection;
  facadeCantilevers?: number[]; // Her cephe için ayrı çıkma mesafesi (m)

  // Mimari Çatı ve Kütle Özellikleri
  roofType?: RoofType;
  mansardFlatCount?: number; // Mansart çatı tek seçildiğinde ortaya çıkan bağımsız bölüm sayısı (varsayılan katta daire sayısı kadar)
  basementCount?: number;
  floorHeight?: number;
  flatsPerFloor?: number;
  balconyDepth?: number;
  facadeStyle?: FacadeStyleType;
  elevatorCount?: number;
  showDebugOverlay3D?: boolean; // Geometrik sınır kutusu ve kesişim noktaları hata ayıklama katmanı

  // Cost items
  costNotaryContract: number;
  costCompany: number;
  priceProjectPermit: number;
  priceSgk: number;
  costInsurance: number;
  costSalesMarketing: number;
  manualEqualExtraCost?: number;
  manualEqualExtraCostLabel?: string;
  additionalOfferClauses?: string[];

  // Kaba insaat
  priceConcrete: number;
  priceSteel: number;
  costKabaWork: number; // Toplam kaba işçilik / kalıp-demir-duvar referansı
  priceSteelLabor?: number; // Demir bağlama ve montaj işçiliği (₺/Ton)
  priceBrickMaterial?: number; // Tuğla / Bims / Gazbeton duvar malzemesi (₺/m²)
  priceBrickLabor?: number; // Tuğla / Duvar örme işçiliği (₺/m²)
  priceFormworkLabor?: number; // Kalıp, iskele ve beton döküm işçiliği (₺/m²)
  priceExcavation?: number; // Temel ve bodrum kazı / hafriyat (₺/m³)

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

  // Policies, payment plan & stages
  includeProfitOwner: 'yes' | 'no';
  paymentPlanType?: 'stages' | 'installments' | 'hybrid'; // 'stages': 5 Aşamalı Fiziki Hakediş, 'installments': Aylık Eşit Taksit, 'hybrid': Peşinat + Ara Ödeme + Taksit
  installmentCount?: number; // Taksit sayısı (Örn: 6, 12, 18, 24, 36 ay)
  installmentIntervalMonths?: number; // Taksit aralığı (ay)
  stage1Pay: number;
  stage2Pay: number;
  stage3Pay: number;
  stage4Pay: number;
  stage5Pay: number;

  // Şerefiye & Arsa Payı Dengeleme Modülü
  enableSerefiye?: boolean; // Şerefiye (Kat/Konum/Cephe) çarpanını maliyet ve pay dağılımına yansıt
  enableLandShareBalancing?: boolean; // Arsa Payı Mahsuplaşma ve Dengelemesini uygula
  totalLandShareDenominator?: number; // Toplam arsa payı paydası (örn: 240, 1000)

  // Özel Sözleşme Notları & İlave Maddeler
  customContractNotes?: string;

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
  salePrice?: number; // Müteahhit dairesi için satış fiyatı (TL)
  flatType?: 'standard' | 'mansard' | 'duplex' | 'shop';
  description?: string;
  floorNumber?: number;
  facade?: string;
  serefiyeMultiplier?: number;
  serefiyeAdjustedCost?: number;
  landShareNumerator?: number;
  landShareDenominator?: number;
  landShareRatio?: number; // Arsa payı oranı (%)
  landShareDifference?: number; // Arsa payı ile bağımsız bölüm değeri arasındaki mahsuplaşma farkı (+ / - TL)
  netArea: number; // Bağımsız bölüm net alanı (m²)
  grossArea: number; // Bağımsız bölüm brüt alanı (m²)
  totalGrossArea: number; // Proportional share of total building gross area (m²)
  commonAreaShare: number; // Proportional share of common building areas (m²)
  cantileverAreaShare: number; // Area gained from cantilevers / çıkmalar (m²)
  balconyAreaShare: number; // Balcony / terrace area (m²)
  stagePayments: [number, number, number, number, number];
  monthlyInstallment: number; // Aylık taksit tutarı (TL)
}

export interface CalculationResult {
  totalArea: number;
  baseArea: number;
  upperFloorArea?: number;
  flatCount: number;
  normalFlats?: number;
  extraMansardFlats?: number;
  roofAtticArea?: number;
  isMansardIndependent?: boolean;
  isDuplexUnified?: boolean;
  autoDurationMonths: number;
  finalMonths: number;
  totalDays: number;
  kabaDaysTotal: number;
  inceDaysTotal: number;
  paymentPlanType?: 'stages' | 'installments' | 'hybrid';
  installmentCount?: number;
  totalMonthlyInstallments?: number;
  
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

  // Material estimates & Metraj
  concreteM3: number;
  steelTon: number;
  brickM2?: number;
  formworkM2?: number;
  excavationM3?: number;

  // Exact Labor vs Material breakdown
  kabaLaborCost?: number;
  kabaMaterialCost?: number;
  fineLaborCost?: number;
  fineMaterialCost?: number;
  systemsLaborCost?: number;
  systemsMaterialCost?: number;
  officialLaborCost?: number;
  officialMaterialCost?: number;
  totalLaborCost?: number;
  totalMaterialCost?: number;

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

export type RoomType = '1+1' | '2+1' | '3+1' | '4+1' | '5+1';

export type RoofType = 'gable' | 'flat' | 'mansard' | 'duplex';

export type RoadType = 'street' | 'road' | 'avenue' | 'highway';

export interface RoadConfig {
  id: string;
  facadeIndex: number; // Hangi cephede olduğu (0: Ön, 1: Sağ, 2: Arka, 3: Sol vb.)
  type: RoadType;
  name?: string;
  width?: number; // Yol genişliği (m)
}

export type PredefinedViewDirection = 'front' | 'rear' | 'right' | 'left' | 'top' | 'iso';
export type CameraPresetType = PredefinedViewDirection | 'side';

export interface BuildingModelParams {
  facadeWidth: number;       // Ön cephe genişliği (m)
  facadeDepth: number;       // Sağ yan cephe derinlik (m)
  backFacadeLength?: number;  // Arka cephe genişliği (m)
  leftFacadeLength?: number;  // Sol yan cephe derinlik (m)
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
  corePositionPreset?: 'center' | 'entrance' | 'rear' | 'left' | 'right' | 'custom'; // Çekirdek yerleşim şablonu
  coreOffsetX?: number;      // Çekirdek merkezinden X kaçıklığı (m)
  coreOffsetY?: number;      // Çekirdek merkezinden Y kaçıklığı (m)
  balconyDepth: number;      // Balkon / çıkma payı (m)
  roofType: RoofType;        // Çatı tipi: Kırma, Teras, Mansart, Çatı Dubleksi
  mansardFlatCount?: number; // Mansart çatı tek seçildiğinde ortaya çıkan bağımsız bölüm sayısı
  facadeStyle: FacadeStyleType;
  wallThickness: number;     // Dış duvar kalınlığı (m)
  showFurniture: boolean;    // Mobilya katmanı
  showDimensions: boolean;   // Ölçülendirme çizgileri
  showInteriorRooms: boolean;// 3D modelde odaların ve bölmelerin görünmesi
  interiorCutMode: 'solid' | 'xray' | 'cutaway'; // 'solid': dolu cephe, 'xray': şeffaf dış duvar, 'cutaway': açık kat kesiti

  // Taban Oturumu ve Çoklu Cephe Parametreleri
  footprintInputMode?: FootprintInputMode;
  baseBuildArea?: number;
  customFacadeCount?: number;
  customFacades?: CustomFacadeSide[];
  lShapeFrontMain?: number;
  lShapeDepthMain?: number;
  lShapeRecessFront?: number;
  lShapeRecessDepth?: number;
  polygonPoints?: PolygonPoint[];
  facadeConfigs?: FacadeDetailConfig[];
  mainEntranceFacadeIndex?: number;

  // Dükkan / Ticari Seçeneği (Normal kat harici dükkan)
  hasGroundFloorShop?: boolean;
  hasBasementShop?: boolean;
  shopLocation?: ShopLocation; // 'ground' | 'basement' | 'both'
  shopCount?: number;
  shopHeight?: number;
  shopArea?: number;
  // Çıkma / Tabla Konsolu (1. kattan itibaren konsol çıkması)
  hasCantilever?: boolean;
  cantileverDepth?: number;
  cantileverDirection?: CantileverDirection;
  facadeCantilevers?: number[]; // Her cephe için ayrı çıkma mesafesi (m)
  // Müteahhit Payı / Daire Paylaşımı
  contractorFlatIds?: number[];          // Müteahhite kalacak dairelerin ID listesi
  showContractorShare3D?: boolean;       // 3D model üzerinde müteahhit ve hak sahibi dairelerini görselleştirme seçeneği
  projectModel?: 'cash' | 'contractorShare';
  contractorShareRate?: number;
  flatCount?: number;
  roads?: RoadConfig[];
}

// -------------------------------------------------------------
// İNŞAAT SÜREÇ & İLERLEME TAKİBİ (TEKLİF KABUL SONRASI) TİPLERİ
// -------------------------------------------------------------

export type ConstructionStageStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed';
export type ConstructionPeriodType = 'weekly' | 'monthly' | 'milestone';

export interface ConstructionStage {
  id: string;
  order: number;
  name: string;
  category: 'proje_ruhsat' | 'kaba_yapi' | 'tesisat_ince' | 'teslim';
  categoryLabel: string;
  progressPercent: number; // 0 - 100
  status: ConstructionStageStatus;
  startDatePlanned: string;
  endDatePlanned: string;
  startDateActual?: string;
  endDateActual?: string;
  responsible: string;
  weightPercent: number; // Toplam projedeki ağırlık payı (%)
  notes: string;
  subTasks?: { id: string; title: string; completed: boolean }[];
}

export interface ConstructionProgressLog {
  id: string;
  date: string;
  periodType: ConstructionPeriodType;
  periodLabel: string; // Örn: "12. Hafta", "Ekim 2026 Bülteni"
  title: string;
  overallProgress: number; // %
  completedWork: string; // Bu periyotta tamamlanan imalatlar
  plannedNextWork: string; // Önümüzdeki periyotta yapılacak işler
  workDaysCount?: number; // Şantiye aktif çalışma günü
  weatherStatus?: string; // Hava ve zemin koşulları
  photoUrls?: string[]; // Şantiye fotoğrafları (data URL veya link)
  isSharedWithClients?: boolean;
}

export interface ClientNotificationDraft {
  channel: 'whatsapp' | 'sms' | 'email';
  recipientType: 'all' | 'individual';
  selectedFlatId?: number;
  recipientName?: string;
  recipientPhone?: string;
  templateType: 'weekly' | 'monthly' | 'milestone' | 'custom';
  messageSubject?: string;
  messageBody: string;
}

export interface ConstructionProgressProjectState {
  projectAddress: string;
  contractDate: string; // Teklif kabul / Sözleşme tarihi
  startDate: string; // Şantiye başlama tarihi
  plannedCompletionDate: string; // Planlanan teslim tarihi
  actualCompletionDate?: string;
  isOfferAccepted: boolean;
  overallProgress: number; // 0 - 100
  stages: ConstructionStage[];
  logs: ConstructionProgressLog[];
  lastUpdated: string;
}
