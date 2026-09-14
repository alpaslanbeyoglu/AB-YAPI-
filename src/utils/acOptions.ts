export interface AcPresetOption {
  id: '12k_btu' | '18k_btu' | '24k_btu' | 'multi_split' | 'infrastructure_only';
  title: string;
  shortTitle: string;
  btu: string;
  targetArea: string;
  recommendedRoom: string;
  avgPricePerFlat: number; // 2026 Türkiye montaj ve bakır borulama dahil ortalama TL fiyatı
  laborShare: number; // Yüzde işçilik/montaj payı
  badge?: string;
  energyClass: string;
  refrigerant: string;
  description: string;
  advantages: string[];
}

export const AC_PRESET_OPTIONS: AcPresetOption[] = [
  {
    id: '18k_btu',
    title: '18.000 BTU/h Inverter A++ Duvar Tipi Split Klima',
    shortTitle: '18.000 BTU (Standart Salon)',
    btu: '18.000 BTU/h (5.3 kW Soğutma / 5.8 kW Isıtma)',
    targetArea: '25 – 38 m²',
    recommendedRoom: 'Standart 2+1 ve 3+1 Daire Salonları',
    avgPricePerFlat: 39500,
    laborShare: 15,
    badge: 'En Çok Tercih Edilen Salon Standardı',
    energyClass: 'A++ Sezonsal Verimlilik',
    refrigerant: 'Çevre Dostu R32 Gaz',
    description: 'Türkiye\'de ortalama 25-35 m² salon ölçüleri için mühendislik standartlarına en uygun, optimum enerji tüketimli ve yüksek performanslı iklimlendirme ünitesidir.',
    advantages: [
      'Geniş hava salınımı ile homojen ısıtma ve soğutma',
      'Inverter kompresör teknolojisi ile %40 elektrik tasarrufu',
      'Sessiz gece modu ve Wi-Fi akıllı telefon kontrolü',
      'Bakır boru tesisatı, drenaj ve montaj işçiliği dahil',
    ],
  },
  {
    id: '12k_btu',
    title: '12.000 BTU/h Inverter A++ Duvar Tipi Split Klima',
    shortTitle: '12.000 BTU (Kompakt Salon)',
    btu: '12.000 BTU/h (3.5 kW Soğutma / 3.8 kW Isıtma)',
    targetArea: '18 – 25 m²',
    recommendedRoom: '1+1 Daireler ve Kompakt Salonlar',
    avgPricePerFlat: 26500,
    laborShare: 15,
    badge: 'Kompakt & Ekonomik',
    energyClass: 'A++ Enerji Sınıfı',
    refrigerant: 'R32 Gaz',
    description: '25 m² altındaki açık mutfaklı salonlar veya stüdyo/1+1 projeler için düşük elektrik tüketimi sağlayan kompakt çözüm.',
    advantages: [
      'Kompakt gövde ile dar duvarlara kolay montaj',
      'Düşük standby tüketimi ve yüksek enerji verimliliği',
      'Hızlı Turbo soğutma ve nem alma fonksiyonu',
    ],
  },
  {
    id: '24k_btu',
    title: '24.000 BTU/h Inverter A++ Yüksek Kapasiteli Split Klima',
    shortTitle: '24.000 BTU (Geniş Salon / Lüks)',
    btu: '24.000 BTU/h (7.0 kW Soğutma / 7.5 kW Isıtma)',
    targetArea: '38 – 55 m²',
    recommendedRoom: 'Geniş Salonlar, Açık Amerikan Mutfaklar & Dubleksler',
    avgPricePerFlat: 48000,
    laborShare: 15,
    badge: 'Yüksek Performans & Geniş Salon',
    energyClass: 'A++ Yüksek Kapasite',
    refrigerant: 'R32 Gaz',
    description: 'Büyük ve ferah salonlar, güney-batı yoğun güneş alan cepheler veya birleşik açık mutfaklı geniş yaşam alanları için yüksek debili güçlü iklimlendirme.',
    advantages: [
      '12 metreye varan uzun mesafeli güçlü hava üfleme',
      'Büyük camlı ve yüksek tavanlı salonlarda hızlı sıcaklık kontrolü',
      'İleri filtreleme ile toz ve partikül temizliği',
    ],
  },
  {
    id: 'multi_split',
    title: 'Multi-Split Çift Mahalli Sistem (1 Dış + 2 İç Ünite)',
    shortTitle: 'Multi-Split (Salon 18k + Yatak Odası 9k)',
    btu: '27.000 BTU/h Toplam (18.000 BTU Salon + 9.000 BTU Ebeveyn Odası)',
    targetArea: 'Salon (25-35 m²) + Ebeveyn Odası (15-20 m²)',
    recommendedRoom: 'Çift Mahalli Tam İklimlendirme (Salon + Yatak Odası)',
    avgPricePerFlat: 68000,
    laborShare: 20,
    badge: 'Lüks Çift Mahal Konforu',
    energyClass: 'A+++ / A++ Multi Inverter',
    refrigerant: 'R32 Gaz',
    description: 'Bina dış cephesinde tek bir dış ünite ile hem salonu (18.000 BTU) hem de ebeveyn yatak odasını (9.000 BTU) bağımsız kontrolle iklimlendiren lüks konfor paketi.',
    advantages: [
      'Dış cephede klima motoru kirliliğini önler (Tek dış ünite)',
      'İki odada bağımsız sıcaklık ayarı imkanı',
      'Yatak odasında fısıltı sessizliğinde (19 dB) uyku konforu',
    ],
  },
  {
    id: 'infrastructure_only',
    title: 'Sıva Altı Profesyonel Bakır Boru & Drenaj Altyapısı',
    shortTitle: 'Sadece Sıva Altı Tesisat (Cihaz Hariç)',
    btu: '9.000 – 24.000 BTU Uyumlu İzolasyonlu Bakır Hat',
    targetArea: 'Salon ve Yatak Odaları Altyapısı',
    recommendedRoom: 'Tüm Odalar İçin Hazır Klima Altyapısı',
    avgPricePerFlat: 12500,
    laborShare: 40,
    badge: 'Hazır Altyapı Tesisatı',
    energyClass: 'Kondensasyon Önleyici Özel İzolasyon',
    refrigerant: 'R32 / R410A Uyumlu',
    description: 'Daireler teslim edildikten sonra duvar kırma, kablo kanalı çekme derdini ortadan kaldıran; sıva altına gizlenmiş profesyonel bakır boru, drenaj ve sinyal kablolama hattı.',
    advantages: [
      'Kaba inşaat aşamasında estetik sıva altı uygulama',
      'İleride istenilen marka/kapasitede klimanın kolayca takılabilmesi',
      'Balkona veya ortak şafta gizli drenaj tahliyesi',
    ],
  },
];

export function getAcOptionById(id?: string): AcPresetOption {
  return AC_PRESET_OPTIONS.find((opt) => opt.id === id) || AC_PRESET_OPTIONS[0];
}
