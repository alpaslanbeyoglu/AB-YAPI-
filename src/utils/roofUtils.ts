import { RoofType } from '../types';

export interface RoofInfo {
  type: RoofType;
  title: string;
  shortTitle: string;
  badge: string;
  technicalSpecification: string;
  architecturalNote: string;
}

export const ROOF_DEFINITIONS: Record<RoofType, RoofInfo> = {
  gable: {
    type: 'gable',
    title: 'Kırma Çatı (Ahşap / Çelik Karkas, Isı Yalıtımlı Kiremit Kaplama)',
    shortTitle: 'Kırma Çatı',
    badge: 'Eğimli Kiremit & Karkas',
    technicalSpecification:
      'TSE belgeli emprenyeli ahşap veya hafif çelik profil karkas üzerine OSB3 kaplama, buhar dengeleyici su yalıtım örtüsü, en az 10 cm taş yünü ısı yalıtımı ve 1. sınıf kiremit veya kenet metal kaplama yapılacaktır. Gizli/açık dere ve yağmur iniş boruları PVC/titanyum çinko olarak binanın yağmur suyu drenaj hattına bağlanacaktır.',
    architecturalNote:
      'Klasik eğimli çatı formuyla kar ve yağmur sularını hızla drene eden, yüksek ısı verimliliğine sahip karkas sistem.',
  },
  flat: {
    type: 'flat',
    title: 'Düz Teras Çatı (Parapetli, Çift Kat Su ve Yüksek Yoğunluklu Isı Yalıtımlı)',
    shortTitle: 'Düz Teras Çatı',
    badge: 'Teras Su & Isı Yalıtımlı',
    technicalSpecification:
      'Betonarme döşeme üzerine meyil betonu, buhar kesici katman, en az 10 cm yüksek yoğunluklu XPS/taş yünü ısı yalıtım levhaları, çift kat polyester keçeli polimer bitümlü su yalıtım membranı, koruma şapı ve kaymaz dış mekan teras seramiği kaplanacaktır. Parapet harpuştaları damlalıklı doğal taş veya alüminyum profilden imal edilecektir.',
    architecturalNote:
      'Modern prizmatik kütle mimarisini destekleyen, güneş enerjisi ve ortak teras kullanımına uygun parapetli teras çatı.',
  },
  mansard: {
    type: 'mansard',
    title: 'Mansart Çatı (Çatı Arası Pencereli Fransız Mansart Konstrüksiyonu)',
    shortTitle: 'Mansart Çatı',
    badge: 'Mansart Çatı Arası Karkas',
    technicalSpecification:
      'Çift eğimli çelik ve ahşap karkas taşıyıcı iskelet üzerine çift kat OSB, nefes alan su yalıtım membranı, ses ve ısı yalıtımı için 12 cm taş yünü dolgusu, çatı arası odaları için çift camlı ısı yalıtımlı mansart pencere sistemleri ve dış yüzeyde kenet kaplama veya shingle uygulanacaktır.',
    architecturalNote:
      'Çatı gabarisini maksimum hacimle değerlendiren, estetik Fransız mansart formlu çatı arası mekan organizasyonu.',
  },
  duplex: {
    type: 'duplex',
    title: 'Çatı Dubleksi & Açık Teras (Bağımsız Bölüm Üst Yaşam Alanı ve Terası)',
    shortTitle: 'Çatı Dubleksi & Teras',
    badge: 'Dubleks & Teras Alanı',
    technicalSpecification:
      'En üst normal kat bağımsız bölümlerinin çatı içi yaşam alanı olarak projelendirilen dubleks katında; taşıyıcı çelik/ahşap konstrüksiyon, çatı teraslarında çift kat elastomerik su yalıtımı, XPS ısı yalıtımı ve granit seramik döşeme, oda bölmelerinde yangına dayanıklı alçıpan ve taşyünü yalıtımı, ısı yalıtımlı teras çıkış kapı ve pencereleri eksiksiz uygulanacaktır.',
    architecturalNote:
      'Son kat dairelerine yüksek katma değer ve ferah açık hava yaşamı kazandıran lüks dubleks teras mimarisi.',
  },
};

/**
 * Returns complete roof metadata safely, always falling back to 'gable' (Kırma Çatı)
 * if roofType is undefined or invalid.
 */
export function getRoofInfo(roofType?: RoofType | string | null): RoofInfo {
  if (roofType && roofType in ROOF_DEFINITIONS) {
    return ROOF_DEFINITIONS[roofType as RoofType];
  }
  return ROOF_DEFINITIONS.gable;
}

export function getRoofTypeLabel(roofType?: RoofType | string | null): string {
  return getRoofInfo(roofType).title;
}

export function getRoofTypeShortTitle(roofType?: RoofType | string | null): string {
  return getRoofInfo(roofType).shortTitle;
}

export function getRoofTypeBadge(roofType?: RoofType | string | null): string {
  return getRoofInfo(roofType).badge;
}

export function getRoofTypeDescription(roofType?: RoofType | string | null): string {
  return getRoofInfo(roofType).technicalSpecification;
}

export function getRoomTypeDescription(roomType?: string): string {
  switch (roomType) {
    case '1+1':
      return '1+1 (1 Yatak Odası, 1 Açık/Amerikan Mutfaklı Salon, 1 Banyo-Wc)';
    case '2+1':
      return '2+1 (2 Yatak Odası, 1 Bağımsız Salon, Mutfak, Banyo, Ebeveyn Lavabosu)';
    case '3+1':
      return '3+1 (3 Yatak Odası, Geniş Salon, Mutfak, Ebeveyn Banyosu, Genel Banyo, Balkon)';
    case '4+1':
      return '4+1 (4 Yatak Odası, Prestij Salon, Ada Mutfak, Çift Banyo, Çamaşır Odası, Çift Balkon)';
    default:
      return `${roomType || '3+1'} Oda Dağılımlı Konut Standardı`;
  }
}
