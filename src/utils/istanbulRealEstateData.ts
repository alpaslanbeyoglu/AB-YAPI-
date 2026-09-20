export interface IstanbulDistrictInfo {
  id: string;
  name: string;
  side: 'anadolu' | 'avrupa';
  baseResmSqMPrice: number; // Standart Konut m² Rayiç Fiyatı (TL/m²)
  baseCommSqMPrice: number; // Zemin Dükkan/Ticari m² Rayiç Fiyatı (TL/m²)
  neighborhoods: string[];
}

export type StreetTier = 'prime_avenue' | 'wide_street' | 'standard_street' | 'side_alley';

export interface StreetTierOption {
  id: StreetTier;
  label: string;
  multiplier: number;
  description: string;
}

export const STREET_TIER_OPTIONS: StreetTierOption[] = [
  {
    id: 'prime_avenue',
    label: '🏆 Prestijli Ana Cadde / Ticari Bulvar / Metro-AVM Yakını',
    multiplier: 1.45,
    description: '+%45 Fiyat Artışı (Yüksek yaya/araç trafiği, tabela değeri yüksek)',
  },
  {
    id: 'wide_street',
    label: '🚗 Geniş Yol / Minibüs-Otobüs Caddesi / Ana Arter',
    multiplier: 1.20,
    description: '+%20 Fiyat Artışı (Geniş sokak, toplu taşımaya yakın)',
  },
  {
    id: 'standard_street',
    label: '🏠 Standart Mahalle İçi Ara Sokak / Konut Alanı',
    multiplier: 1.00,
    description: 'Nötr Piyasa Çarpanı (1.00x)',
  },
  {
    id: 'side_alley',
    label: '🏔️ Çıkmaz Sokak / Dik Eğimli / Dar Ara Yol',
    multiplier: 0.90,
    description: '-%10 Fiyat İskontosu (Dar cephe, otopark/ulaşım kısıtı)',
  },
];

export const ISTANBUL_DISTRICTS: IstanbulDistrictInfo[] = [
  {
    id: 'kadikoy',
    name: 'Kadıköy',
    side: 'anadolu',
    baseResmSqMPrice: 155000,
    baseCommSqMPrice: 280000,
    neighborhoods: ['Caddebostan', 'Moda', 'Suadiye', 'Erenköy', 'Feneryolu', 'Göztepe', 'Bostancı', 'Fikirtepe', 'Rasimpaşa'],
  },
  {
    id: 'besiktas',
    name: 'Beşiktaş',
    side: 'avrupa',
    baseResmSqMPrice: 185000,
    baseCommSqMPrice: 340000,
    neighborhoods: ['Bebek', 'Etiler', 'Arnavutköy', 'Levent', 'Nisbetiye', 'Akaretler', 'Dikilitaş', 'Gayrettepe', 'Cihannüma'],
  },
  {
    id: 'sisli',
    name: 'Şişli',
    side: 'avrupa',
    baseResmSqMPrice: 140000,
    baseCommSqMPrice: 260000,
    neighborhoods: ['Nişantaşı', 'Teşvikiye', 'Fulya', 'Mecidiyeköy', 'Bomonti', 'Gülbahar', 'Kurtuluş', 'Halaskargazi'],
  },
  {
    id: 'sariyer',
    name: 'Sarıyer',
    side: 'avrupa',
    baseResmSqMPrice: 175000,
    baseCommSqMPrice: 290000,
    neighborhoods: ['Yeniköy', 'İstinye', 'Tarabya', 'Maslak', 'Zekeriyaköy', 'Emirgan', 'Büyükdere'],
  },
  {
    id: 'uskudar',
    name: 'Üsküdar',
    side: 'anadolu',
    baseResmSqMPrice: 130000,
    baseCommSqMPrice: 220000,
    neighborhoods: ['Kuzguncuk', 'Çengelköy', 'Beylerbeyi', 'Acıbadem', 'Kandilli', 'Altunizade', 'Bulgurlu'],
  },
  {
    id: 'bakirkoy',
    name: 'Bakırköy',
    side: 'avrupa',
    baseResmSqMPrice: 145000,
    baseCommSqMPrice: 250000,
    neighborhoods: ['Florya', 'Yeşilköy', 'Ataköy', 'Zuhuratbaba', 'Cevizlik', 'Basınköy', 'Yeşilyurt'],
  },
  {
    id: 'atasehir',
    name: 'Ataşehir',
    side: 'anadolu',
    baseResmSqMPrice: 105000,
    baseCommSqMPrice: 190000,
    neighborhoods: ['Batı Ataşehir (Finans Merkezi)', 'Küçükbakkalköy', 'İçerenköy', 'Barbaros', 'Atatürk'],
  },
  {
    id: 'umraniye',
    name: 'Ümraniye',
    side: 'anadolu',
    baseResmSqMPrice: 80000,
    baseCommSqMPrice: 145000,
    neighborhoods: ['Atakent', 'Madenler', 'Çakmak', 'Elmalıkent', 'Şerifali', 'Tevhit Parkı'],
  },
  {
    id: 'maltepe',
    name: 'Maltepe',
    side: 'anadolu',
    baseResmSqMPrice: 95000,
    baseCommSqMPrice: 165000,
    neighborhoods: ['Yalı', 'Dragos', 'Küçükyalı', 'İdealtepe', 'Altayçeşme', 'Zümrütevler'],
  },
  {
    id: 'kartal',
    name: 'Kartal',
    side: 'anadolu',
    baseResmSqMPrice: 75000,
    baseCommSqMPrice: 135000,
    neighborhoods: ['Kordonboyu', 'Atalar', 'Cevizli', 'Soğanlık', 'Karlıktepe', 'Uğurmumcu'],
  },
  {
    id: 'pendik',
    name: 'Pendik',
    side: 'anadolu',
    baseResmSqMPrice: 70000,
    baseCommSqMPrice: 125000,
    neighborhoods: ['Pendik Marina', 'Batı', 'Yenişehir', 'Kurtköy', 'Kaynarca', 'Güzelyalı'],
  },
  {
    id: 'cekmekoy',
    name: 'Çekmeköy',
    side: 'anadolu',
    baseResmSqMPrice: 85000,
    baseCommSqMPrice: 140000,
    neighborhoods: ['Mimar Sinan', 'Taşdelen', 'Alemdağ', 'Merkez'],
  },
  {
    id: 'beylikduzu',
    name: 'Beylikdüzü',
    side: 'avrupa',
    baseResmSqMPrice: 60000,
    baseCommSqMPrice: 110000,
    neighborhoods: ['Adnan Kahveci', 'Yakuplu Marina', 'Beykent', 'Gürpınar', 'Barış'],
  },
  {
    id: 'fatih',
    name: 'Fatih',
    side: 'avrupa',
    baseResmSqMPrice: 90000,
    baseCommSqMPrice: 180000,
    neighborhoods: ['Sultanahmet', 'Aksaray', 'Karagümrük', 'Şehremini', 'Fındıkzade', 'Balat'],
  },
  {
    id: 'kagithane',
    name: 'Kağıthane',
    side: 'avrupa',
    baseResmSqMPrice: 85000,
    baseCommSqMPrice: 155000,
    neighborhoods: ['Cendere Vadisi', 'Seyrantepe', 'Merkez', 'Gürselli', 'Emniyetevleri', 'Talatpaşa'],
  },
  {
    id: 'basaksehir',
    name: 'Başakşehir',
    side: 'avrupa',
    baseResmSqMPrice: 70000,
    baseCommSqMPrice: 130000,
    neighborhoods: ['Bahçeşehir', 'Kayaşehir', 'MetroKent', 'Ispartakule', 'Başakşehir 1. Etap'],
  },
  {
    id: 'zeytinburnu',
    name: 'Zeytinburnu',
    side: 'avrupa',
    baseResmSqMPrice: 110000,
    baseCommSqMPrice: 200000,
    neighborhoods: ['Kazlıçeşme Sahil', 'Seyitnizam', 'Beştelsiz', 'Merkezefendi', 'Telsiz'],
  },
  {
    id: 'gungoren',
    name: 'Güngören',
    side: 'avrupa',
    baseResmSqMPrice: 65000,
    baseCommSqMPrice: 120000,
    neighborhoods: ['Haznedar', 'Merter', 'Sanayi', 'Akıncılar', 'Güven', 'Gençosman'],
  },
  {
    id: 'esenler',
    name: 'Esenler',
    side: 'avrupa',
    baseResmSqMPrice: 55000,
    baseCommSqMPrice: 100000,
    neighborhoods: ['Dörtyol', 'Turgutreis', 'Menderes', 'Kemer', 'Fevzi Çakmak'],
  },
  {
    id: 'esenyurt',
    name: 'Esenyurt',
    side: 'avrupa',
    baseResmSqMPrice: 42000,
    baseCommSqMPrice: 75000,
    neighborhoods: ['Güzelyurt', 'Barış', 'Cumhuriyet', 'Mehterçeşme', 'Pınar'],
  },
  {
    id: 'other',
    name: 'Diğer İstanbul İlçesi',
    side: 'anadolu',
    baseResmSqMPrice: 75000,
    baseCommSqMPrice: 130000,
    neighborhoods: ['Merkez', 'Ana Cadde'],
  },
];

export interface ValuationCalculationResult {
  suggestedUnitPrice: number; // m² Birim Fiyatı (TL)
  suggestedTotalPrice: number; // Toplam Satış Değeri (TL)
  districtName: string;
  streetTierLabel: string;
  floorLabel: string;
  floorMultiplier: number;
  streetMultiplier: number;
  unitTypeMultiplier: number;
  facadeMultiplier: number;
  serefiyeMultiplier: number;
}

export function calculateAiValuation(
  districtId: string,
  streetTier: StreetTier,
  floorNumber: number | undefined,
  flatType: string | undefined,
  facade: string | undefined,
  area: number,
  serefiyeMultiplier: number = 1.0
): ValuationCalculationResult {
  const district = ISTANBUL_DISTRICTS.find((d) => d.id === districtId) || ISTANBUL_DISTRICTS[0];
  const street = STREET_TIER_OPTIONS.find((s) => s.id === streetTier) || STREET_TIER_OPTIONS[2];

  const isShop = flatType === 'shop' || flatType === 'basement_shop';
  const isDuplex = flatType === 'duplex' || flatType === 'mansard';
  const isBasement = flatType === 'basement_flat' || (floorNumber !== undefined && floorNumber < 0);

  // 1. Base District Price
  let basePrice = isShop ? district.baseCommSqMPrice : district.baseResmSqMPrice;

  // 2. Street Tier Multiplier
  const streetMultiplier = street.multiplier;

  // 3. Floor Level Multiplier
  let floorMultiplier = 1.0;
  let floorLabel = 'Ara Kat (1-3. Kat)';

  if (floorNumber === undefined || floorNumber === 1 || floorNumber === 2) {
    floorMultiplier = 1.05;
    floorLabel = 'Ara Kat (1-2. Kat)';
  } else if (floorNumber === 0) {
    floorMultiplier = 0.88;
    floorLabel = 'Zemin / Giriş Kat';
  } else if (floorNumber < 0) {
    floorMultiplier = 0.68;
    floorLabel = 'Bodrum Kat';
  } else if (floorNumber >= 3 && floorNumber <= 5) {
    floorMultiplier = 1.18;
    floorLabel = 'Yüksek Ara Kat (3-5. Kat)';
  } else if (floorNumber >= 6) {
    floorMultiplier = 1.30;
    floorLabel = 'Yüksek Şehir Manzaralı Kat (6+ Kat)';
  }

  // 4. Unit Type Multiplier
  let unitTypeMultiplier = 1.0;
  if (isShop) {
    unitTypeMultiplier = 1.25; // Additional commercial demand premium
  } else if (isDuplex) {
    unitTypeMultiplier = 1.20; // Duplex / Terrace premium
  } else if (isBasement) {
    unitTypeMultiplier = 0.85;
  }

  // 5. Facade Multiplier
  let facadeMultiplier = 1.0;
  if (facade === 'guney' || facade === 'guney_dogu' || facade === 'guney_bati') {
    facadeMultiplier = 1.08;
  } else if (facade === 'on' || facade === 'kose') {
    facadeMultiplier = 1.06;
  } else if (facade === 'kuzey' || facade === 'arka') {
    facadeMultiplier = 0.93;
  }

  // 6. Şerefiye Multiplier
  const validSerefiye = serefiyeMultiplier && serefiyeMultiplier > 0 ? serefiyeMultiplier : 1.0;

  // Final Per-m² Calculation
  const suggestedUnitPrice = Math.round(
    basePrice * streetMultiplier * floorMultiplier * unitTypeMultiplier * facadeMultiplier * validSerefiye
  );

  const suggestedTotalPrice = Math.round(suggestedUnitPrice * (area || 100));

  return {
    suggestedUnitPrice,
    suggestedTotalPrice,
    districtName: district.name,
    streetTierLabel: street.label,
    floorLabel,
    floorMultiplier,
    streetMultiplier,
    unitTypeMultiplier,
    facadeMultiplier,
    serefiyeMultiplier: validSerefiye,
  };
}
