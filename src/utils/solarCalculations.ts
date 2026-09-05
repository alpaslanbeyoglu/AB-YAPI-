/**
 * Solar position and solar exposure calculation utilities
 * Uses standard astronomical formulas for Solar Declination, Hour Angle, Solar Altitude (Elevation), and Solar Azimuth.
 */

export interface SolarLocation {
  city: string;
  lat: number; // Enlem (Derece, Kuzey pozitif)
  lng: number; // Boylam (Derece, Doğu pozitif)
}

export const TURKEY_PROVINCES: SolarLocation[] = [
  { city: 'İstanbul', lat: 41.0082, lng: 28.9784 },
  { city: 'Ankara', lat: 39.9334, lng: 32.8597 },
  { city: 'İzmir', lat: 38.4192, lng: 27.1287 },
  { city: 'Bursa', lat: 40.1885, lng: 29.0610 },
  { city: 'Antalya', lat: 36.8969, lng: 30.7133 },
  { city: 'Adana', lat: 37.0000, lng: 35.3213 },
  { city: 'Konya', lat: 37.8667, lng: 32.4833 },
  { city: 'Gaziantep', lat: 37.0662, lng: 37.3833 },
  { city: 'Kocaeli', lat: 40.8533, lng: 29.8815 },
  { city: 'Trabzon', lat: 41.0027, lng: 39.7168 },
  { city: 'Samsun', lat: 41.2867, lng: 36.3300 },
  { city: 'Diyarbakır', lat: 37.9144, lng: 40.2306 },
  { city: 'Eskişehir', lat: 39.7767, lng: 30.5206 },
  { city: 'Kayseri', lat: 38.7312, lng: 35.4787 },
  { city: 'Mersin', lat: 36.8000, lng: 34.6333 },
  { city: 'Muğla (Bodrum/Fethiye)', lat: 37.2153, lng: 28.3636 },
  { city: 'Çanakkale', lat: 40.1553, lng: 26.4142 },
  { city: 'Tekirdağ', lat: 40.9833, lng: 27.5167 },
  { city: 'Balıkesir', lat: 39.6484, lng: 27.8826 },
  { city: 'Denizli', lat: 37.7765, lng: 29.0864 },
  { city: 'Sakarya', lat: 40.7569, lng: 30.3783 },
  { city: 'Hatay', lat: 36.2023, lng: 36.1606 },
  { city: 'Şanlıurfa', lat: 37.1674, lng: 38.7955 },
  { city: 'Erzurum', lat: 39.9055, lng: 41.2658 },
  { city: 'Van', lat: 38.4891, lng: 43.4089 },
];

export const TURKEY_CITIES = TURKEY_PROVINCES;

export interface SolarSeasonPreset {
  id: string;
  name: string;
  dayOfYear: number; // 1-365
  dateLabel: string;
  description: string;
}

export const SOLAR_SEASONS: SolarSeasonPreset[] = [
  {
    id: 'summer_solstice',
    name: 'Yaz Gündönümü (Maksimum Güneş)',
    dayOfYear: 172, // 21 Haziran
    dateLabel: '21 Haziran',
    description: 'Yılın en uzun günü ve en dik güneş açısı. Gölge boyları en kısadır.',
  },
  {
    id: 'spring_equinox',
    name: 'İlkbahar Ekinoksu',
    dayOfYear: 80, // 21 Mart
    dateLabel: '21 Mart',
    description: 'Gece ve gündüz eşitliği (12 saat). Dengeli geçiş açısı.',
  },
  {
    id: 'autumn_equinox',
    name: 'Sonbahar Ekinoksu',
    dayOfYear: 266, // 23 Eylül
    dateLabel: '23 Eylül',
    description: 'Güneş tam doğudan doğar, tam batıdan batar.',
  },
  {
    id: 'winter_solstice',
    name: 'Kış Gündönümü (Minimum Güneş)',
    dayOfYear: 355, // 21 Aralık
    dateLabel: '21 Aralık',
    description: 'Yılın en kısa günü ve en yatık güneş açısı. Gölgeler en uzundur.',
  },
];

export interface SolarPosition {
  altitude: number; // Güneş yüksekliği (derece: -90 ile +90)
  azimuth: number;  // Güneş yön açısı (derece: 0 = Kuzey, 90 = Doğu, 180 = Güney, 270 = Batı)
  isSunUp: boolean; // Güneş ufuk çizgisinin üzerinde mi?
  sunIntensity: number; // 0 - 1 arası aydınlık yoğunluğu
  sunriseHour: number; // Doğuş saati (örn: 5.8 = 05:48)
  sunsetHour: number;  // Batış saati (örn: 19.5 = 19:30)
}

/**
 * Calculates Solar Altitude (Elevation) and Azimuth for given latitude, day of year, and decimal hour
 */
export function calculateSolarPosition(
  lat: number,
  dayOfYear: number,
  hour: number // 0 - 24 (örn: 14.5 = 14:30)
): SolarPosition {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;

  // 1. Solar Declination (Güneş sapma açısı delta)
  // Cooper's equation
  const declination = 23.45 * Math.sin(rad * ((360 / 365) * (dayOfYear - 81)));
  const decRad = declination * rad;
  const latRad = lat * rad;

  // 2. Solar Hour Angle (Güneş Saat Açısı omega: 12:00 = 0°, her saat 15°)
  const hourAngle = (hour - 12) * 15;
  const haRad = hourAngle * rad;

  // 3. Solar Altitude (Güneş yüksekliği alpha)
  const sinAltitude =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const altitudeRad = Math.asin(Math.max(-1, Math.min(1, sinAltitude)));
  const altitude = altitudeRad * deg;

  // 4. Solar Azimuth (Güneş Azimut açısı gamma: 0 = Kuzey, 90 = Doğu, 180 = Güney, 270 = Batı)
  // cos(azimuth) = (sin(dec) * cos(lat) - cos(dec) * sin(lat) * cos(ha)) / cos(alt)
  const cosAlt = Math.cos(altitudeRad);
  let azimuth = 180; // Varsayılan güney
  if (Math.abs(cosAlt) > 0.001) {
    const cosAz =
      (Math.sin(decRad) * Math.cos(latRad) -
        Math.cos(decRad) * Math.sin(latRad) * Math.cos(haRad)) /
      cosAlt;
    const boundedCosAz = Math.max(-1, Math.min(1, cosAz));
    const azRad = Math.acos(boundedCosAz);
    
    if (hourAngle > 0) {
      // Öğleden sonra (Batı tarafı: 180° - 360°)
      azimuth = 360 - azRad * deg;
    } else {
      // Öğleden önce (Doğu tarafı: 0° - 180°)
      azimuth = azRad * deg;
    }
  }

  // 5. Sunrise & Sunset calculations
  // cos(ha0) = -tan(lat) * tan(dec)
  const tanLatTanDec = Math.tan(latRad) * Math.tan(decRad);
  let sunriseHour = 6.0;
  let sunsetHour = 18.0;

  if (tanLatTanDec >= 1) {
    // Polar night
    sunriseHour = 12;
    sunsetHour = 12;
  } else if (tanLatTanDec <= -1) {
    // Midnight sun
    sunriseHour = 0;
    sunsetHour = 24;
  } else {
    const ha0 = Math.acos(-tanLatTanDec) * deg;
    const dayLengthHours = (2 * ha0) / 15;
    sunriseHour = Math.max(4, Math.min(8, 12 - dayLengthHours / 2));
    sunsetHour = Math.max(16, Math.min(21, 12 + dayLengthHours / 2));
  }

  const isSunUp = altitude > 0;
  const sunIntensity = isSunUp
    ? Math.max(0.1, Math.sin(altitudeRad))
    : 0;

  return {
    altitude,
    azimuth,
    isSunUp,
    sunIntensity,
    sunriseHour,
    sunsetHour,
  };
}

export interface FacadeSunExposure {
  facadeName: string;
  compassBearing: number; // 0° = Kuzey, 90° = Doğu, 180° = Güney, 270° = Batı
  directionLabel: string; // "Güney-Doğu (GD)", vb.
  directSunHours: number; // Günlük doğrudan güneş alma süresi (saat)
  solarExposureScore: 'CokYuksek' | 'Yuksek' | 'Orta' | 'Dusuk' | 'Minimal';
  insolationPercent: number; // %0 - %100
  comfortRating: string; // Mimari konfor değerlendirmesi
  recommendation: string; // Gölgeleme veya yalıtım tavsiyesi
}

/**
 * Returns cardinal / intercardinal compass direction label from angle (0-360)
 */
export function getCompassLabel(angle: number): string {
  const norm = ((angle % 360) + 360) % 360;
  if (norm >= 337.5 || norm < 22.5) return 'Kuzey (K)';
  if (norm >= 22.5 && norm < 67.5) return 'Kuzey-Doğu (KD)';
  if (norm >= 67.5 && norm < 112.5) return 'Doğu (D)';
  if (norm >= 112.5 && norm < 157.5) return 'Güney-Doğu (GD)';
  if (norm >= 157.5 && norm < 202.5) return 'Güney (G)';
  if (norm >= 202.5 && norm < 247.5) return 'Güney-Batı (GB)';
  if (norm >= 247.5 && norm < 292.5) return 'Batı (B)';
  return 'Kuzey-Batı (KB)';
}

/**
 * Calculates solar exposure and sunlight hours for 4 primary facades based on building orientation and location
 * @param buildingRotation Angle in degrees (0 = Front faces South, 90 = Front faces West, etc.)
 */
export function calculateBuildingFacadeExposures(
  lat: number,
  dayOfYear: number,
  buildingRotation: number = 0 // 0 = Ön cephe Güney, 90 = Batı, 180 = Kuzey, 270 = Doğu
): FacadeSunExposure[] {
  // Facade relative normal angles:
  // Ön: buildingRotation + 180 (veya kullanıcı referansına göre)
  // Sağ: buildingRotation + 270
  // Arka: buildingRotation + 0
  // Sol: buildingRotation + 90
  const facades = [
    { name: 'Ön Cephe (Ana Giriş / Yol)', offset: 180 }, // Ön cephe varsayılan Güney
    { name: 'Sağ Yan Cephe', offset: 270 },
    { name: 'Arka Cephe (Bahçe)', offset: 0 },
    { name: 'Sol Yan Cephe', offset: 90 },
  ];

  return facades.map((f) => {
    const bearing = ((f.offset + buildingRotation) % 360 + 360) % 360;
    const directionLabel = getCompassLabel(bearing);

    // Sample daylight hours across the day (from 05:00 to 21:00 in 0.25h steps)
    let directSunHours = 0;
    let totalInsolationScore = 0;

    for (let h = 5; h <= 21; h += 0.25) {
      const pos = calculateSolarPosition(lat, dayOfYear, h);
      if (pos.isSunUp && pos.altitude > 2) {
        // Angle between sun azimuth and facade normal
        const angleDiff = Math.abs(((pos.azimuth - bearing + 180) % 360) - 180);
        if (angleDiff < 85) {
          // Direct sunlight hits the facade!
          const incidentFactor = Math.cos((angleDiff * Math.PI) / 180) * Math.sin((pos.altitude * Math.PI) / 180);
          directSunHours += 0.25;
          totalInsolationScore += incidentFactor * 0.25;
        }
      }
    }

    const roundedHours = Math.round(directSunHours * 10) / 10;
    let solarExposureScore: FacadeSunExposure['solarExposureScore'] = 'Orta';
    let insolationPercent = Math.min(100, Math.round((roundedHours / 12) * 100));
    let comfortRating = 'Dengeli doğal aydınlatma ve ılıman kış kazancı.';
    let recommendation = 'Standart Low-E ısı yalıtımlı çift cam önerilir.';

    if (roundedHours >= 7.5) {
      solarExposureScore = 'CokYuksek';
      comfortRating = 'Maksimum kış güneş kazancı, sıcak ve aydınlık yaşam alanları.';
      recommendation = 'Yaz aşırı ısınmasını önlemek için hareketli panjur veya geniş balkon konsolları idealdir.';
    } else if (roundedHours >= 5.0) {
      solarExposureScore = 'Yuksek';
      comfortRating = 'Sabah veya ikindi güneşi alan ferah yaşam odaları.';
      recommendation = 'Güneş kırıcı gölgelikler ve ısı kontrollü cam kombinasyonu verimli olacaktır.';
    } else if (roundedHours >= 2.5) {
      solarExposureScore = 'Orta';
      comfortRating = 'Hafif serin, parlama yapmayan homojen çalışma ve yatak odası ışığı.';
      recommendation = 'Isı kaybını önleyici yüksek izolasyonlu dış cephe mantolaması uygulanmalıdır.';
    } else if (roundedHours > 0) {
      solarExposureScore = 'Dusuk';
      comfortRating = 'Doğrudan güneş kısıtlı, serin cephe (Kuzey aksı).';
      recommendation = 'Kalın taşyünü yalıtım levhaları ve ısı camlı PVC profillerle enerji tasarrufu sağlanmalıdır.';
    } else {
      solarExposureScore = 'Minimal';
      comfortRating = 'Kuzey yönü: Gölgeli, difüz doğal ışık.';
      recommendation = 'Maksimum cephe yalıtımı ve üçlü cam sistemleri ile kış ısıtma giderleri düşürülmelidir.';
    }

    return {
      facadeName: f.name,
      compassBearing: Math.round(bearing),
      directionLabel,
      directSunHours: roundedHours,
      solarExposureScore,
      insolationPercent,
      comfortRating,
      recommendation,
    };
  });
}
