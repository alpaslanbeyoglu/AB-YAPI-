import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Share2,
  Instagram,
  Linkedin,
  MessageSquare,
  Building2,
  ShieldCheck,
  Award,
  CheckCircle2,
  Sliders,
  Upload,
  Palette,
  Layout,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CompanyProfile, ProjectParams, CalculationResult } from '../types';
import { processLogoForPageEmbed, LogoEmbedMode } from '../utils/logoProcessor';

interface SocialMediaStudioProps {
  profile: CompanyProfile;
  params?: ProjectParams;
  results?: CalculationResult;
  onUploadLogoClick?: () => void;
}

export type InfoCardConceptId =
  | 'warm_family_home'
  | 'modern_comfort_options'
  | 'custom_interior_choices'
  | 'quality_of_life_smart'
  | 'eco_energy_savings'
  | 'value_investment_life'
  | 'urban_transformation_guide'
  | 'seismic_safety_standards'
  | 'state_grant_support'
  | 'free_feasibility_check'
  | 'transparent_flat_for_land'
  | 'corporate_trust_vision'
  | 'new_project_launch'
  | 'construction_progress'
  | 'completed_handover'
  | 'show_flat_interior';

export type ConceptCategoryGroup = 'yasam_konfor' | 'kurumsal_bilgi' | 'proje_paylasimi';
export type CardColorThemeId = 'navy_gold' | 'clean_light' | 'emerald_slate' | 'anthracite_amber';
export type LogoProminenceLevel = 'standard' | 'large' | 'xl_showcase';
export type LogoPlacementMode = 'top_center_hero' | 'top_left_integrated' | 'top_right_seal';

interface InfoCardConcept {
  id: InfoCardConceptId;
  group: ConceptCategoryGroup;
  name: string;
  subtitle: string;
  tagText: string;
  headline: string;
  subheadline: string;
  infoPoints: [string, string, string];
  footerCallout: string;
}

interface CardColorTheme {
  id: CardColorThemeId;
  name: string;
  bgStart: string;
  bgEnd: string;
  cardSurface: string;
  cardBorder: string;
  itemSurface: string;
  itemBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  logoBoxBg: string;
  logoBoxBorder: string;
}

const COLOR_THEMES: Record<CardColorThemeId, CardColorTheme> = {
  navy_gold: {
    id: 'navy_gold',
    name: 'Lacivert & Altın',
    bgStart: '#0a1122',
    bgEnd: '#131f3a',
    cardSurface: '#152342',
    cardBorder: 'rgba(245, 158, 11, 0.32)',
    itemSurface: 'rgba(15, 23, 42, 0.72)',
    itemBorder: 'rgba(255, 255, 255, 0.1)',
    textPrimary: '#ffffff',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.16)',
    accentText: '#fbbf24',
    logoBoxBg: '#ffffff',
    logoBoxBorder: '#f59e0b',
  },
  clean_light: {
    id: 'clean_light',
    name: 'Kurumsal Beyaz',
    bgStart: '#f1f5f9',
    bgEnd: '#e2e8f0',
    cardSurface: '#ffffff',
    cardBorder: '#cbd5e1',
    itemSurface: '#f8fafc',
    itemBorder: '#e2e8f0',
    textPrimary: '#0f172a',
    textSecondary: '#1e293b',
    textMuted: '#475569',
    accent: '#3730a3',
    accentSoft: '#e0e7ff',
    accentText: '#312e81',
    logoBoxBg: '#ffffff',
    logoBoxBorder: '#cbd5e1',
  },
  emerald_slate: {
    id: 'emerald_slate',
    name: 'Zümrüt Dönüşüm',
    bgStart: '#061a17',
    bgEnd: '#0d2e28',
    cardSurface: '#113832',
    cardBorder: 'rgba(16, 185, 129, 0.35)',
    itemSurface: 'rgba(6, 26, 23, 0.7)',
    itemBorder: 'rgba(255, 255, 255, 0.12)',
    textPrimary: '#ffffff',
    textSecondary: '#ecfdf5',
    textMuted: '#a7f3d0',
    accent: '#10b981',
    accentSoft: 'rgba(16, 185, 129, 0.2)',
    accentText: '#34d399',
    logoBoxBg: '#ffffff',
    logoBoxBorder: '#10b981',
  },
  anthracite_amber: {
    id: 'anthracite_amber',
    name: 'Antrasit Prestij',
    bgStart: '#18181b',
    bgEnd: '#27272a',
    cardSurface: '#27272a',
    cardBorder: 'rgba(251, 146, 60, 0.35)',
    itemSurface: '#18181b',
    itemBorder: 'rgba(255, 255, 255, 0.1)',
    textPrimary: '#fafafa',
    textSecondary: '#e4e4e7',
    textMuted: '#a1a1aa',
    accent: '#f97316',
    accentSoft: 'rgba(249, 115, 22, 0.18)',
    accentText: '#fb923c',
    logoBoxBg: '#ffffff',
    logoBoxBorder: '#f97316',
  },
};

export const SocialMediaStudio: React.FC<SocialMediaStudioProps> = ({
  profile,
  params,
  onUploadLogoClick,
}) => {
  const companyName = profile.companyName || 'AB YAPI';
  const companySlogan = profile.slogan || 'Güvene Yükselen Yapılar';
  const companyWebsite = (profile.website || 'https://ab-yapi.com.tr/').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const companyPhone = profile.phone || '+90 (212) 585 10 20';

  const projectTitle = params?.projectName || 'Kocamustafapaşa Modern Konut Projesi';
  const projectLocation = params?.projectAddress || 'Fatih / İSTANBUL';
  const floorCount = params?.floorCount || 5;
  const totalFlats = (params?.floorCount || 5) * (params?.flatsPerFloor || 2);
  const deliveryMonths = params?.manualMonths || 15;
  const modelText =
    params?.projectModel === 'contractorShare'
      ? `Kat Karşılığı (%${params?.contractorShareRate || 50} Oran)`
      : 'Anahtar Teslim Müteahhitlik';

  const buildConcepts = useCallback((): InfoCardConcept[] => {
    return [
      // =======================================================================
      // GRUP 1: YUVA, KONFOR, YAŞAM KALİTESİ & SUNULAN OPSİYONLAR (6 ŞABLON)
      // =======================================================================
      {
        id: 'warm_family_home',
        group: 'yasam_konfor',
        name: 'Sıcak Yuva & Aile Huzuru Kartı',
        subtitle: 'Nesiller Boyu Huzurla Yaşanan Yuvalar',
        tagText: 'HUZURLU YUVA & YAŞAM KARTI',
        headline: 'SADECE BİNA DEĞİL, HUZURLU BİR YUVA İNŞA EDİYORUZ',
        subheadline: `${companyName} İmzasıyla Aileniz ve Sevdikleriniz İçin Güvenli, Sıcak Yaşam Alanları`,
        infoPoints: [
          'Gün Boyu Doğal Işık Alan Ferah Odalar, Geniş Balkonlar ve Aile Odaklı Kat Planları',
          'Komşuluk Kültürünü Yaşatan Güvenli Bina Girişi, Şık Lobi ve Ortak Yaşam Alanları',
          'Çocuklarınızın ve Sevdiklerinizin Geleceği İçin Depreme Dayanıklı Huzurlu Yuva',
        ],
        footerCallout: 'Hayalinizdeki sıcak ve güvenli yuvaya kavuşmak için bizimle tanışın.',
      },
      {
        id: 'modern_comfort_options',
        group: 'yasam_konfor',
        name: 'Üstün Konfor & Donanım Opsiyonları',
        subtitle: 'Standartları Yükselten Konfor Seçenekleri',
        tagText: 'KONFOR & DONANIM OPSİYONLARI',
        headline: 'EVİNİZDE HER GÜNÜ KEYFE DÖNÜŞTÜREN KONFOR OPSİYONLARI',
        subheadline: 'Modern Yaşamın Gerektirdiği Tüm Konfor Detayları Projelerimizde',
        infoPoints: [
          'Yerden Isıtma Sistemi, Yüksek Tavan Ferahlığı ve Panoramik Isıcam Doğramalar',
          '1. Sınıf Ankastre Mutfak, Ebeveyn Banyosu, Giyinme Alanı ve Özel Vestiyer Tasarımı',
          'Tam Otomatik Asansör, Otopark Çözümleri ve Engelsiz Modern Bina Girişi',
        ],
        footerCallout: 'Konforunuzu artıran zengin daire içi donanım opsiyonlarımızı keşfedin.',
      },
      {
        id: 'custom_interior_choices',
        group: 'yasam_konfor',
        name: 'Kişiye Özel Malzeme & Renk Opsiyonu',
        subtitle: 'Zevkinize Göre Seçilebilir İç Tasarım',
        tagText: 'KİŞİYE ÖZEL TASARIM OPSİYONLARI',
        headline: 'EVİNİZİN RENK VE MALZEMELERİNİ SİZİN ZEVKİNİZE GÖRE SEÇELİM',
        subheadline: 'Yapım Aşamasında Kat Maliklerimize Sunduğumuz Özel Seçim Ayrıcalığı',
        infoPoints: [
          'Mutfak Dolabı, Kuvars Tezgâh, Seramik ve Parke Renklerinde Zengin Opsiyon Seçimi',
          'Banyo Vitrifiye, Batarya Grubu ve İç Kapı Modellerinde A+ Marka Alternatifleri',
          'Daire İçi Aydınlatma, Priz Konumları ve Dekoratif Duvar Uygulama Opsiyonları',
        ],
        footerCallout: 'Kendi zevkinizi yansıtan özel tasarım yuvanız için kataloglarımızı inceleyin.',
      },
      {
        id: 'quality_of_life_smart',
        group: 'yasam_konfor',
        name: 'Yaşam Kalitesi & Akıllı Ev Altyapısı',
        subtitle: 'Sessiz, Güvenli ve Teknoloji Dostu Yaşam',
        tagText: 'YAŞAM KALİTESİ & TEKNOLOJİ',
        headline: 'YAŞAM KALİTENİZİ YÜKSELTEN YENİLİKÇİ ÇÖZÜMLER',
        subheadline: 'Tam Yalıtım, Akustik Konfor ve Güvenlik Altyapısı Bir Arada',
        infoPoints: [
          'Komşu Duvarlar ve Dış Cephede Üst Düzey Ses/Isı Yalıtımı ile Sessiz Huzur',
          'Görüntülü İnterkom, 7/24 Güvenlik Kamerası ve Akıllı Ev Otomasyon Altyapısı',
          'Kesintisiz Yaşam İçin Su Deposu, Hidrofor, Jeneratör ve Fiber İnternet Altyapısı',
        ],
        footerCallout: 'Yüksek yaşam kalitesi sunan yeni nesil konut standartlarımızla tanışın.',
      },
      {
        id: 'eco_energy_savings',
        group: 'yasam_konfor',
        name: 'Dört Mevsim Konfor & Enerji Tasarrufu',
        subtitle: 'Düşük Isınma Gideri ve Yüksek Yalıtım',
        tagText: 'ENERJİ VERİMLİLİĞİ & KONFOR',
        headline: 'YÜKSEK YALITIM İLE DÖRT MEVSİM KONFOR VE TASARRUF',
        subheadline: 'Kışın Sıcak, Yazın Serin Yuvalar ile Bütçe Dostu Yaşam Standartları',
        infoPoints: [
          'Taş Yünü Dış Cephe Mantolama ve Konfor Serisi Çift Cam Doğrama Sistemleri',
          'Yüksek Verimli Isıtma Tesisatı ile %40’a Varan Doğalgaz ve Enerji Tasarrufu',
          'Uzun Ömürlü Cephe Kaplamaları ve Düşük Aidat Giderli Ortak Alan Planlaması',
        ],
        footerCallout: 'Hem ev içi konforunuzu hem aile bütçenizi koruyan yapılar üretiyoruz.',
      },
      {
        id: 'value_investment_life',
        group: 'yasam_konfor',
        name: 'Değer Kazanan Yatırım & Prestij Kartı',
        subtitle: 'Hem Oturum Hem Yatırım İçin Yüksek Değer',
        tagText: 'DEĞER KAZANAN YAŞAM ALANI',
        headline: 'BUGÜN HUZURLA OTURUN, YARIN DEĞERİNE DEĞER KATSIN',
        subheadline: 'Estetik Dış Cephe, Fonksiyonel Planlama ve Yüksek Gayrimenkul Değeri',
        infoPoints: [
          'Bölgenin En Prestijli Dış Cephe Tasarımı ve LED Mimari Cephe Aydınlatması',
          'Sıfır Kayıplı Metrekare Kullanımı, Ferah Salonlar ve Ergonomik Oda Dağılımı',
          'İskanlı, Kat Mülkiyetli ve Krediye Tam Uygun Sorunsuz Tapu Güvencesi',
        ],
        footerCallout: 'Eski dairenizin değerini katlayan prestijli dönüşüm çözümlerimiz için arayın.',
      },

      // =======================================================================
      // GRUP 2: KENTSEL DÖNÜŞÜM & KURUMSAL GÜVEN KARTLARI (6 ŞABLON)
      // =======================================================================
      {
        id: 'urban_transformation_guide',
        group: 'kurumsal_bilgi',
        name: 'Kentsel Dönüşüm Bilgi Kartı',
        subtitle: '3 Adımda Güvenli Bina Yenileme',
        tagText: 'KENTSEL DÖNÜŞÜM BİLGİ KARTI',
        headline: 'ESKİ BİNANIZI GÜVENLE YENİLEYİN',
        subheadline: `${companyName} Güvencesiyle Riskli Yapılardan Modern Yaşam Alanlarına`,
        infoPoints: [
          'Resmî İmar Durumu, Kat Planı ve Hak Sahipliği Paylaşım Analizi',
          'Devlet Destekli Hibe, Kredi ve Kira Yardımı Süreç Yönetimi',
          'Noter Onaylı Sözleşme, Şantiye Sigortası ve Zamanında Anahtar Teslim',
        ],
        footerCallout: 'Binanızın dönüşüm potansiyeli için bizimle iletişime geçin.',
      },
      {
        id: 'seismic_safety_standards',
        group: 'kurumsal_bilgi',
        name: 'Deprem & Yapı Güvenliği Kartı',
        subtitle: 'Yüksek Yapı Kalitesi Standartları',
        tagText: 'YAPI GÜVENLİĞİ BİLGİ KARTI',
        headline: 'DEPREME DAYANIKLI SAĞLAM YAPILAR',
        subheadline: '2018 Türkiye Bina Deprem Yönetmeliği Standartlarında İnşaat',
        infoPoints: [
          'Zemin Etüdüne Uygun Radye Jeneral Temel ve Güçlü Taşıyıcı Sistem',
          'TSE Belgeli C35/45 Sınıfı Hazır Beton ve B420C Nervürlü Donatı Çeliği',
          'Taş Yünü Isı/Ses Yalıtımı ve 1. Sınıf İç Mekân İnce İşçilik Kalitesi',
        ],
        footerCallout: 'Ailenizin geleceği için kaliteden ödün vermeden inşa ediyoruz.',
      },
      {
        id: 'state_grant_support',
        group: 'kurumsal_bilgi',
        name: 'Hibe & Teşvik Rehberi Kartı',
        subtitle: 'Malikler İçin Finansal Avantajlar',
        tagText: 'MALİK BİLGİLENDİRME KARTI',
        headline: 'KENTSEL DÖNÜŞÜM DESTEKLERİNDEN YARARLANIN',
        subheadline: 'Bina Yenileme Sürecinde Kat Maliklerine Sunulan Avantajlar',
        infoPoints: [
          'Devlet Destekli Yapım Hibesi ve Uygun Oranlı Dönüşüm Kredileri',
          'İnşaat Süresince Düzenli Kira Yardımı ve Taşınma Desteği İmkanı',
          'Noter, Tapu, Belediye Harçları ve Vergi Muafiyeti Avantajları',
        ],
        footerCallout: 'Tüm resmî başvuru ve ruhsat süreçlerini sizin adınıza takip ediyoruz.',
      },
      {
        id: 'free_feasibility_check',
        group: 'kurumsal_bilgi',
        name: 'Ücretsiz Ön Analiz & Teklif Kartı',
        subtitle: 'Kat Maliklerine Özel Danışmanlık',
        tagText: 'KURUMSAL DANIŞMANLIK KARTI',
        headline: 'BİNANIZ İÇİN ÜCRETSİZ ÖN ANALİZ VE TEKLİF',
        subheadline: 'Karar Vermeden Önce Binanızın İmar ve Dönüşüm Tablosunu Görün',
        infoPoints: [
          'Arsa Payı, Güncel İmar Durumu ve Yeni Kat Planı Ön Çalışması',
          'Kat Karşılığı veya Anahtar Teslim Şeffaf Maliyet ve Daire Dağılımı',
          'Kat Malikleri Kurulu İçin Resmi Sunum Dosyası ve Sözleşme Taslağı',
        ],
        footerCallout: 'Ücretsiz ön değerlendirme randevusu için hemen bize ulaşın.',
      },
      {
        id: 'transparent_flat_for_land',
        group: 'kurumsal_bilgi',
        name: 'Kat Karşılığı Güvence Modeli Kartı',
        subtitle: 'Hak Sahiplerini Koruyan Şeffaf Sözleşme',
        tagText: 'KAT KARŞILIĞI GÜVENCE KARTI',
        headline: 'HAKKINIZI KORUYAN ŞEFFAF KAT KARŞILIĞI MODELİ',
        subheadline: 'Tüm Maliklerin Adil ve Güvenli Şekilde Kazandığı Kurumsal Uzlaşma',
        infoPoints: [
          'Şerefiyelendirme ve Noter Kurası ile Hakkaniyetli Daire Dağılım Planı',
          'Teknik Şartnamede Tüm Malzeme, Marka ve Opsiyonların Garanti Altına Alınması',
          'Resmî Sözleşme, İmalat Takvimi ve Kira Yardımı Güvencesiyle Sıfır Risk',
        ],
        footerCallout: 'Arsanız veya binanız için en avantajlı kat karşılığı teklifimizi alın.',
      },
      {
        id: 'corporate_trust_vision',
        group: 'kurumsal_bilgi',
        name: 'Kurumsal Kimlik & Güven Kartı',
        subtitle: 'Genel Firma Tanıtım Kartı',
        tagText: 'KURUMSAL TANITIM KARTI',
        headline: companySlogan.toUpperCase(),
        subheadline: `${companyName} • Müteahhitlik, Kentsel Dönüşüm ve Yapı Yönetimi`,
        infoPoints: [
          'Şeffaf Sözleşme İlkeleri ve Kat Malikleri Haklarını Koruyan Yaklaşım',
          'Yüksek Nitelikli Malzeme Seçimi ve Titiz Şantiye Organizasyonu',
          'Ruhsattan İskana Kadar Tek Merkezden Kurumsal Süreç Yönetimi',
        ],
        footerCallout: 'Geleceğe güvenle bakan sağlam ve estetik yapılar inşa ediyoruz.',
      },

      // =======================================================================
      // GRUP 3: AKTİF PROJE & ŞANTİYE PAYLAŞIM KARTLARI (4 ŞABLON)
      // =======================================================================
      {
        id: 'new_project_launch',
        group: 'proje_paylasimi',
        name: 'Yeni Proje Duyuru Kartı',
        subtitle: 'Aktif Proje Tanıtım Görseli',
        tagText: 'YENİ PROJE BİLGİ KARTI',
        headline: 'GÜVENLİ VE MODERN YENİ YAŞAM BAŞLIYOR',
        subheadline: `${projectTitle} • ${projectLocation}`,
        infoPoints: [
          `Mimari Planlama: Zemin Üstü ${floorCount} Kat, Toplam ${totalFlats} Bağımsız Bölüm`,
          `Yapım Modeli: ${modelText} • ${deliveryMonths} Ayda Anahtar Teslim Hedefi`,
          'TBDY-2018 Deprem Yönetmeliğine Uygun Radye Temel ve Lüks Donanım',
        ],
        footerCallout: `${projectLocation} bölgesine değer katan modern yaşam projesi.`,
      },
      {
        id: 'construction_progress',
        group: 'proje_paylasimi',
        name: 'Şantiye İlerleme Bilgi Kartı',
        subtitle: 'Yapım Süreci Güncellemesi',
        tagText: 'ŞANTİYE BİLGİ KARTI',
        headline: 'ŞANTİYEMİZDE PLANLI VE GÜVENLİ İLERLEYİŞ',
        subheadline: `${projectTitle} • ${projectLocation}`,
        infoPoints: [
          'Onaylı Projeye ve İş Takvimine Uygun Kesintisiz Saha İmalatı',
          'Yapı Denetim Kontrollü Betonarme, Demir Donatı ve Kalıp Uygulamaları',
          `Taahhüt Edilen ${deliveryMonths} Aylık Sürede Eksiksiz İskanlı Teslim Güvencesi`,
        ],
        footerCallout: 'Söz verdiğimiz tarihte, söz verdiğimiz kalitede yükseliyoruz.',
      },
      {
        id: 'completed_handover',
        group: 'proje_paylasimi',
        name: 'Tamamlanan Proje Referans Kartı',
        subtitle: 'Anahtar Teslim Başarı Paylaşımı',
        tagText: 'REFERANS PROJE KARTI',
        headline: 'SÖZ VERDİĞİMİZ GİBİ ANAHTAR TESLİM MUTLULUK',
        subheadline: `${projectTitle} • ${projectLocation}`,
        infoPoints: [
          `${floorCount} Katlı Modern Mimari ve Estetik Dış Cephe Tasarımı`,
          '1. Sınıf Mutfak, Banyo, Zemin ve Ortak Alan İnce İşçilik Kalitesi',
          'Depreme Dayanıklı, Yüksek Yatırım Değerli Güvenli Yaşam Alanları',
        ],
        footerCallout: 'Kat maliklerimize yeni yuvalarında huzurlu ve sağlıklı bir ömür dileriz.',
      },
      {
        id: 'show_flat_interior',
        group: 'proje_paylasimi',
        name: 'İç Mekân & İnce İşçilik Tanıtım Kartı',
        subtitle: 'Mutfak, Banyo ve Konfor Detayları',
        tagText: 'İÇ MEKÂN & KONFOR DETAYLARI',
        headline: 'İNCE İŞÇİLİKTE KALİTE VE ESTETİK BİR ARADA',
        subheadline: `${projectTitle} • ${projectLocation} Projemizden Konfor Detayları`,
        infoPoints: [
          'Özel Tasarım Lake Mutfak Dolapları, Kuvars Tezgâh ve Geniş Depolama Alanları',
          '1. Sınıf Seramik, Gömme Rezervuar, Yağmur Duş ve Modern Banyo Mobilyaları',
          'Gizli LED Tavan Aydınlatmaları, Derzli Parke ve Çelik Kapı Güvenliği',
        ],
        footerCallout: 'Projelerimizdeki malzeme kalitesini ve işçilik detaylarını yerinde inceleyin.',
      },
    ];
  }, [companyName, companySlogan, projectTitle, projectLocation, floorCount, totalFlats, deliveryMonths, modelText]);

  const concepts = buildConcepts();

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | ConceptCategoryGroup>('all');
  const [selectedConceptId, setSelectedConceptId] = useState<InfoCardConceptId>('warm_family_home');
  const [colorThemeId, setColorThemeId] = useState<CardColorThemeId>('navy_gold');
  const [logoProminence, setLogoProminence] = useState<LogoProminenceLevel>('xl_showcase');
  const [logoPlacement, setLogoPlacement] = useState<LogoPlacementMode>('top_center_hero');
  const [logoEmbedMode, setLogoEmbedMode] = useState<LogoEmbedMode>('adaptive_clean');
  const [showPageWatermark, setShowPageWatermark] = useState<boolean>(true);
  const [aspectMode, setAspectMode] = useState<'square' | 'portrait'>('square');
  const [showCustomTextEditor, setShowCustomTextEditor] = useState(false);

  // Editable text state initialized from selected concept
  const [tagText, setTagText] = useState(concepts[0].tagText);
  const [headline, setHeadline] = useState(concepts[0].headline);
  const [subheadline, setSubheadline] = useState(concepts[0].subheadline);
  const [point1, setPoint1] = useState(concepts[0].infoPoints[0]);
  const [point2, setPoint2] = useState(concepts[0].infoPoints[1]);
  const [point3, setPoint3] = useState(concepts[0].infoPoints[2]);
  const [footerCallout, setFooterCallout] = useState(concepts[0].footerCallout);

  // Rendered data URL from the single source-of-truth canvas
  const [renderedDataUrl, setRenderedDataUrl] = useState<string>('');
  const [imageCopied, setImageCopied] = useState(false);

  // AI Caption states
  const [targetPlatform, setTargetPlatform] = useState<'instagram' | 'linkedin' | 'facebook_whatsapp'>('instagram');
  const [additionalCaptionInfo, setAdditionalCaptionInfo] = useState('');
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Apply concept preset when selected
  const handleSelectConcept = (concept: InfoCardConcept) => {
    setSelectedConceptId(concept.id);
    setTagText(concept.tagText);
    setHeadline(concept.headline);
    setSubheadline(concept.subheadline);
    setPoint1(concept.infoPoints[0]);
    setPoint2(concept.infoPoints[1]);
    setPoint3(concept.infoPoints[2]);
    setFooterCallout(concept.footerCallout);
  };

  // Helper: wrap text and return array of lines that fit within maxWidth
  const computeWrappedLines = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] => {
    const clean = (text || '').trim();
    if (!clean) return [];
    const words = clean.split(/\s+/);
    const lines: string[] = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = `${currentLine} ${word}`;
      if (ctx.measureText(testLine).width <= maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Single Source-of-Truth Canvas Renderer
  // Both the on-screen preview and the downloaded PNG come directly from this exact canvas!
  const renderInfoCardToCanvas = useCallback(async () => {
    const canvas = canvasRef.current || document.createElement('canvas');
    const W = 1080;
    const H = aspectMode === 'portrait' ? 1350 : 1080;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const theme = COLOR_THEMES[colorThemeId] || COLOR_THEMES.navy_gold;
    const isLight = colorThemeId === 'clean_light';

    // 1. Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, theme.bgStart);
    bgGrad.addColorStop(1, theme.bgEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle architectural grid lines
    ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.035)' : 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridStep = 60;
    for (let x = gridStep; x < W; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = gridStep; y < H; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Outer frame margin
    const margin = 48;
    const cardX = margin;
    const cardY = margin;
    const cardW = W - margin * 2;
    const cardH = H - margin * 2;

    // Main outer card container
    ctx.save();
    ctx.fillStyle = theme.cardSurface;
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 36);
    ctx.fill();
    ctx.stroke();
    ctx.clip();

    // Top accent bar inside card
    ctx.fillStyle = theme.accent;
    ctx.fillRect(cardX, cardY, cardW, 10);

    const innerPad = 52;
    const contentLeft = cardX + innerPad;
    const contentRight = cardX + cardW - innerPad;
    const contentWidth = contentRight - contentLeft;

    let cursorY = cardY + 46;

    // =========================================================================
    // 2. PAGE-EMBEDDED COMPANY LOGO (NO BOX, BACKGROUND REMOVED)
    // =========================================================================
    let processedLogoCanvas: HTMLCanvasElement | null = null;
    if (profile.logoBase64) {
      processedLogoCanvas = await processLogoForPageEmbed(profile.logoBase64, {
        mode: logoEmbedMode,
        isDarkSurface: !isLight,
        tolerance: 44,
      });
    }

    // Optional: Embed subtle large watermark of the background-removed logo directly into the page surface
    if (showPageWatermark && processedLogoCanvas && processedLogoCanvas.width > 0 && processedLogoCanvas.height > 0) {
      ctx.save();
      const wmRatio = processedLogoCanvas.width / processedLogoCanvas.height;
      const wmMaxW = Math.round(cardW * 0.54);
      const wmMaxH = Math.round(cardH * 0.36);
      let wmW = wmMaxW;
      let wmH = wmW / wmRatio;
      if (wmH > wmMaxH) {
        wmH = wmMaxH;
        wmW = wmH * wmRatio;
      }
      const wmX = cardX + cardW - wmW - 24;
      const wmY = cardY + cardH - wmH - 120;
      ctx.globalAlpha = isLight ? 0.045 : 0.055;
      ctx.drawImage(processedLogoCanvas, wmX, wmY, wmW, wmH);
      ctx.restore();
    }

    // Determine target embedded logo dimensions (no bounding box!)
    const targetLogoH =
      logoProminence === 'xl_showcase' ? 124 : logoProminence === 'large' ? 102 : 84;
    const targetLogoMaxW =
      logoPlacement === 'top_center_hero'
        ? logoProminence === 'xl_showcase'
          ? 440
          : logoProminence === 'large'
          ? 360
          : 290
        : logoProminence === 'xl_showcase'
        ? 290
        : logoProminence === 'large'
        ? 240
        : 195;

    const drawEmbeddedLogoAt = (
      areaX: number,
      areaY: number,
      areaW: number,
      areaH: number,
      align: 'left' | 'center' | 'right'
    ): { drawnW: number; drawnH: number; drawnX: number; drawnY: number } => {
      if (processedLogoCanvas && processedLogoCanvas.width > 0 && processedLogoCanvas.height > 0) {
        const ratio = processedLogoCanvas.width / processedLogoCanvas.height;
        let drawW = areaW;
        let drawH = drawW / ratio;
        if (drawH > areaH) {
          drawH = areaH;
          drawW = drawH * ratio;
        }
        const drawX =
          align === 'center'
            ? areaX + (areaW - drawW) / 2
            : align === 'right'
            ? areaX + areaW - drawW
            : areaX;
        const drawY = areaY + (areaH - drawH) / 2;

        // Soft ambient radial glow embedded into the page surface behind the logo (no box!)
        ctx.save();
        const glowCx = drawX + drawW / 2;
        const glowCy = drawY + drawH / 2;
        const glowRadius = Math.max(drawW, drawH) * 0.72;
        const glowGrad = ctx.createRadialGradient(glowCx, glowCy, 4, glowCx, glowCy, glowRadius);
        if (isLight) {
          glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
          glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        } else if (logoEmbedMode === 'natural_clean') {
          // Slightly stronger soft light halo if keeping dark original pixels on a dark page
          glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
          glowGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.07)');
          glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        } else {
          glowGrad.addColorStop(0, theme.accentSoft);
          glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(glowCx, glowCy, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Natural dimensional shadow so the logo sits embedded on the page surface
        ctx.shadowColor = isLight ? 'rgba(15, 23, 42, 0.18)' : 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 4;
        ctx.drawImage(processedLogoCanvas, drawX, drawY, drawW, drawH);
        ctx.restore();

        return { drawnW: drawW, drawnH: drawH, drawnX: drawX, drawnY: drawY };
      } else {
        // Clean typographic mark embedded directly onto the page if no logo image is uploaded
        ctx.save();
        const alignX =
          align === 'center' ? areaX + areaW / 2 : align === 'right' ? areaX + areaW : areaX;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = theme.textPrimary;
        ctx.font = `900 ${Math.round(areaH * 0.48)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText(companyName.toUpperCase(), alignX, areaY + areaH * 0.42);

        ctx.fillStyle = theme.accentText;
        ctx.font = `700 16px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText(companySlogan.toUpperCase(), alignX, areaY + areaH * 0.8);
        ctx.restore();
        return { drawnW: areaW, drawnH: areaH, drawnX: areaX, drawnY: areaY };
      }
    };

    const tagClean = (tagText || 'KURUMSAL BİLGİ KARTI').toUpperCase();
    const taglineStr = profile.tagline || 'Kentsel Dönüşüm, Yapı Yönetimi ve Müteahhitlik';

    if (logoPlacement === 'top_center_hero') {
      // Layout 1: Centered Page-Embedded Logo at the top (no box!), integrated divider + category pill below
      drawEmbeddedLogoAt(
        contentLeft + (contentWidth - targetLogoMaxW) / 2,
        cursorY,
        targetLogoMaxW,
        targetLogoH,
        'center'
      );

      cursorY += targetLogoH + 20;

      // Subtle tagline directly under logo if needed
      ctx.fillStyle = theme.textMuted;
      ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${companyName.toUpperCase()}  •  ${taglineStr}`, contentLeft + contentWidth / 2, cursorY, contentWidth);

      cursorY += 34;

      // Integrated divider line with centered category badge embedded on the line
      ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
      const tagMetrics = ctx.measureText(tagClean);
      const pillW = Math.min(contentWidth - 80, tagMetrics.width + 40);
      const pillH = 36;
      const pillX = contentLeft + (contentWidth - pillW) / 2;
      const pillY = cursorY;
      const lineMidY = pillY + pillH / 2;

      // Left and right accent lines flanking the pill
      ctx.strokeStyle = theme.itemBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(contentLeft, lineMidY);
      ctx.lineTo(pillX - 16, lineMidY);
      ctx.moveTo(pillX + pillW + 16, lineMidY);
      ctx.lineTo(contentRight, lineMidY);
      ctx.stroke();

      // Category pill
      ctx.fillStyle = theme.accentSoft;
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.accentText;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagClean, contentLeft + contentWidth / 2, lineMidY + 1);

      cursorY += pillH + 26;
    } else if (logoPlacement === 'top_left_integrated') {
      // Layout 2: Logo embedded directly on top-left of page surface (no box!), brand info & badge on right
      const { drawnW } = drawEmbeddedLogoAt(
        contentLeft,
        cursorY,
        targetLogoMaxW,
        targetLogoH,
        'left'
      );

      const brandTextLeft = contentLeft + Math.max(170, drawnW) + 32;
      const brandTextMaxW = contentRight - brandTextLeft;

      // Subtle vertical accent separator between embedded logo and header text
      ctx.strokeStyle = theme.itemBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(brandTextLeft - 16, cursorY + 10);
      ctx.lineTo(brandTextLeft - 16, cursorY + targetLogoH - 10);
      ctx.stroke();

      // Tag pill
      ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
      const tagMetrics = ctx.measureText(tagClean);
      const tagBoxW = Math.min(brandTextMaxW, tagMetrics.width + 30);
      const tagBoxH = 34;

      ctx.fillStyle = theme.accentSoft;
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(brandTextLeft, cursorY + 6, tagBoxW, tagBoxH, 9);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.accentText;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagClean, brandTextLeft + 15, cursorY + 6 + tagBoxH / 2);

      // Company Name & Descriptor
      ctx.fillStyle = theme.textPrimary;
      ctx.font = '900 30px "Plus Jakarta Sans", sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(companyName.toUpperCase(), brandTextLeft, cursorY + 48, brandTextMaxW);

      ctx.fillStyle = theme.textMuted;
      ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(taglineStr, brandTextLeft, cursorY + 88, brandTextMaxW);

      cursorY += targetLogoH + 24;

      // Divider line under Brand Header
      ctx.strokeStyle = theme.itemBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(contentLeft, cursorY);
      ctx.lineTo(contentRight, cursorY);
      ctx.stroke();

      cursorY += 26;
    } else {
      // Layout 3 (top_right_seal): Logo embedded directly on top-right of page surface, corporate header on left
      const { drawnW } = drawEmbeddedLogoAt(
        contentRight - targetLogoMaxW,
        cursorY,
        targetLogoMaxW,
        targetLogoH,
        'right'
      );

      const leftBlockMaxW = contentWidth - Math.max(170, drawnW) - 32;

      // Tag pill on left
      ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
      const tagMetrics = ctx.measureText(tagClean);
      const tagBoxW = Math.min(leftBlockMaxW, tagMetrics.width + 30);
      const tagBoxH = 34;

      ctx.fillStyle = theme.accentSoft;
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(contentLeft, cursorY + 6, tagBoxW, tagBoxH, 9);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.accentText;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagClean, contentLeft + 15, cursorY + 6 + tagBoxH / 2);

      // Company Name & Descriptor on left
      ctx.fillStyle = theme.textPrimary;
      ctx.font = '900 30px "Plus Jakarta Sans", sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(companyName.toUpperCase(), contentLeft, cursorY + 48, leftBlockMaxW);

      ctx.fillStyle = theme.textMuted;
      ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(taglineStr, contentLeft, cursorY + 88, leftBlockMaxW);

      cursorY += targetLogoH + 24;

      // Divider line under Brand Header
      ctx.strokeStyle = theme.itemBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(contentLeft, cursorY);
      ctx.lineTo(contentRight, cursorY);
      ctx.stroke();

      cursorY += 26;
    }

    // =========================================================================
    // 3. MAIN HEADLINE & SUBHEADLINE (AUTO-FITTING, NEVER OVERLAPS)
    // =========================================================================
    const headlineClean = (headline || 'GÜVENLİ VE MODERN YAŞAM ALANLARI').toUpperCase();
    let headlineFontSize = aspectMode === 'portrait' ? 44 : 40;
    ctx.font = `900 ${headlineFontSize}px "Plus Jakarta Sans", sans-serif`;
    let headlineLines = computeWrappedLines(ctx, headlineClean, contentWidth);

    while (headlineLines.length > 2 && headlineFontSize > 28) {
      headlineFontSize -= 3;
      ctx.font = `900 ${headlineFontSize}px "Plus Jakarta Sans", sans-serif`;
      headlineLines = computeWrappedLines(ctx, headlineClean, contentWidth);
    }
    headlineLines = headlineLines.slice(0, 3);

    const headlineLineHeight = Math.round(headlineFontSize * 1.22);
    ctx.fillStyle = theme.textPrimary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    for (const line of headlineLines) {
      ctx.fillText(line, contentLeft, cursorY);
      cursorY += headlineLineHeight;
    }

    cursorY += 8;

    // Subheadline
    if (subheadline.trim()) {
      ctx.font = '700 23px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = theme.accentText;
      const subLines = computeWrappedLines(ctx, subheadline.trim(), contentWidth).slice(0, 2);
      for (const sLine of subLines) {
        ctx.fillText(sLine, contentLeft, cursorY);
        cursorY += 30;
      }
    }

    cursorY += 22;

    // =========================================================================
    // 4. STRUCTURED 3-POINT INFO CARD BLOCKS (BİLGİ KARTI MADDELERİ)
    // =========================================================================
    const footerHeight = 115;
    const footerTopY = cardY + cardH - footerHeight;
    const calloutReserve = footerCallout.trim() ? 66 : 16;
    const availablePointsHeight = Math.max(240, footerTopY - cursorY - calloutReserve - 16);

    const points = [point1, point2, point3].map((p) => p.trim()).filter(Boolean);
    const pointCount = Math.max(1, points.length);
    const gapBetweenCards = aspectMode === 'portrait' ? 20 : 14;
    const singleCardH = Math.min(
      aspectMode === 'portrait' ? 148 : 112,
      Math.floor((availablePointsHeight - gapBetweenCards * (pointCount - 1)) / pointCount)
    );

    points.forEach((ptText, idx) => {
      const boxY = cursorY;

      // Info point card box
      ctx.fillStyle = theme.itemSurface;
      ctx.strokeStyle = theme.itemBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(contentLeft, boxY, contentWidth, singleCardH, 18);
      ctx.fill();
      ctx.stroke();

      // Left accent bar inside info point
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.roundRect(contentLeft + 14, boxY + 16, 6, singleCardH - 32, 3);
      ctx.fill();

      // Numbered badge circle
      const badgeR = 24;
      const badgeCenterX = contentLeft + 54;
      const badgeCenterY = boxY + singleCardH / 2;

      ctx.fillStyle = theme.accentSoft;
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(badgeCenterX, badgeCenterY, badgeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.accentText;
      ctx.font = '800 20px "Plus Jakarta Sans", monospace, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`0${idx + 1}`, badgeCenterX, badgeCenterY + 1);

      // Point text (wrapped & vertically centered inside the card)
      const ptTextLeft = contentLeft + 96;
      const ptTextMaxW = contentWidth - 118;
      let ptFontSize = aspectMode === 'portrait' ? 24 : 22;
      ctx.font = `600 ${ptFontSize}px "Plus Jakarta Sans", sans-serif`;
      let ptLines = computeWrappedLines(ctx, ptText, ptTextMaxW);

      if (ptLines.length > 2) {
        ptFontSize = 19;
        ctx.font = `600 ${ptFontSize}px "Plus Jakarta Sans", sans-serif`;
        ptLines = computeWrappedLines(ctx, ptText, ptTextMaxW).slice(0, 3);
      }

      const ptLineH = Math.round(ptFontSize * 1.3);
      const totalPtTextH = ptLines.length * ptLineH;
      let ptLineY = boxY + (singleCardH - totalPtTextH) / 2;

      ctx.fillStyle = theme.textSecondary;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      for (const l of ptLines) {
        ctx.fillText(l, ptTextLeft, ptLineY);
        ptLineY += ptLineH;
      }

      cursorY += singleCardH + gapBetweenCards;
    });

    // =========================================================================
    // 5. BOTTOM CALLOUT BANNER (IF SPACE ALLOWS)
    // =========================================================================
    if (footerCallout.trim() && cursorY + 46 <= footerTopY - 8) {
      const calloutY = cursorY + 4;
      ctx.fillStyle = theme.accentSoft;
      ctx.beginPath();
      ctx.roundRect(contentLeft, calloutY, contentWidth, 46, 12);
      ctx.fill();

      ctx.fillStyle = theme.accentText;
      ctx.font = '700 19px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        footerCallout.trim(),
        contentLeft + contentWidth / 2,
        calloutY + 23,
        contentWidth - 32
      );
    }

    // =========================================================================
    // 6. CORPORATE FOOTER BAR
    // =========================================================================
    ctx.strokeStyle = theme.itemBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(contentLeft, footerTopY);
    ctx.lineTo(contentRight, footerTopY);
    ctx.stroke();

    const footerMidY = footerTopY + footerHeight / 2;

    // Left: Company Slogan & Legal-safe identity
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = theme.textPrimary;
    ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(companyName.toUpperCase(), contentLeft, footerMidY - 2);

    ctx.textBaseline = 'top';
    ctx.fillStyle = theme.textMuted;
    ctx.font = '600 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`"${companySlogan}"`, contentLeft, footerMidY + 4);

    // Right: Website & Phone Contact
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = theme.accentText;
    ctx.font = '800 22px "Plus Jakarta Sans", monospace, sans-serif';
    ctx.fillText(companyWebsite, contentRight, footerMidY - 2);

    ctx.textBaseline = 'top';
    ctx.fillStyle = theme.textSecondary;
    ctx.font = '600 18px "Plus Jakarta Sans", monospace, sans-serif';
    ctx.fillText(companyPhone, contentRight, footerMidY + 4);

    ctx.restore();

    const url = canvas.toDataURL('image/png', 1.0);
    setRenderedDataUrl(url);
  }, [
    aspectMode,
    colorThemeId,
    logoProminence,
    logoPlacement,
    logoEmbedMode,
    showPageWatermark,
    profile.logoBase64,
    profile.tagline,
    companyName,
    companySlogan,
    companyWebsite,
    companyPhone,
    tagText,
    headline,
    subheadline,
    point1,
    point2,
    point3,
    footerCallout,
  ]);

  useEffect(() => {
    renderInfoCardToCanvas();
  }, [renderInfoCardToCanvas]);

  const handleDownloadPng = () => {
    if (!renderedDataUrl) return;
    const link = document.createElement('a');
    const safeName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    link.download = `${safeName}_bilgi_karti_${selectedConceptId}.png`;
    link.href = renderedDataUrl;
    link.click();
  };

  const handleCopyImageToClipboard = async () => {
    if (!renderedDataUrl) return;
    try {
      const res = await fetch(renderedDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 2500);
    } catch (e) {
      console.warn('Görsel panoya kopyalanamadı:', e);
    }
  };

  const handleGenerateAiCaption = async () => {
    if (isGeneratingCaption) return;
    setIsGeneratingCaption(true);
    try {
      const response = await fetch('/api/generate-social-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: subheadline || projectTitle,
          location: projectLocation,
          templateType: selectedConceptId,
          platform: targetPlatform,
          companyName,
          slogan: companySlogan,
          additionalInfo: `${headline}. Maddeler: 1) ${point1} 2) ${point2} 3) ${point3}. ${additionalCaptionInfo}`,
        }),
      });
      const data = await response.json();
      if (data.success && data.caption) {
        setGeneratedCaption(data.caption);
      }
    } catch (e) {
      console.error('AI caption error:', e);
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const yasamKonforConcepts = concepts.filter((c) => c.group === 'yasam_konfor');
  const kurumsalConcepts = concepts.filter((c) => c.group === 'kurumsal_bilgi');
  const projeConcepts = concepts.filter((c) => c.group === 'proje_paylasimi');

  return (
    <div className="space-y-6">
      {/* Hidden offscreen master canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Studio Header Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Share2 className="w-5 h-5 text-amber-400 shrink-0" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              Kurumsal Bilgi Kartı & Sosyal Medya Stüdyosu
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Firma logonuzun ön planda olduğu, 1080p yüksek çözünürlüklü kurumsal bilgi kartları ve sosyal medya gönderilerini tek tıkla oluşturun. Ekranda gördüğünüz görsel ile indirilen PNG birebir aynıdır.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {onUploadLogoClick && (
            <button
              type="button"
              onClick={onUploadLogoClick}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>{profile.logoBase64 ? 'Logoyu Değiştir' : 'Firma Logosu Yükle'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadPng}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>PNG Bilgi Kartını İndir</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Concept Selector, Brand & Theme Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Hazır Bilgi Kartı Konseptleri (16 Zengin Şablon) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layout className="w-4 h-4 text-indigo-600" />
                <span>01. Hazır Bilgi Kartı Konsepti Seçin</span>
              </h3>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                {concepts.length} Hazır Konsept
              </span>
            </div>

            {/* Category Filter Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl">
              {[
                { id: 'all', label: `Tümü (${concepts.length})` },
                { id: 'yasam_konfor', label: `Yuva & Konfor (${yasamKonforConcepts.length})` },
                { id: 'kurumsal_bilgi', label: `Dönüşüm & Güven (${kurumsalConcepts.length})` },
                { id: 'proje_paylasimi', label: `Proje & Şantiye (${projeConcepts.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(tab.id as any)}
                  className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                    selectedCategoryFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-4 max-h-[430px] overflow-y-auto pr-1">
              {(selectedCategoryFilter === 'all' || selectedCategoryFilter === 'yasam_konfor') && (
                <div>
                  <div className="text-xs font-bold text-amber-700 mb-2 flex items-center justify-between">
                    <span>Yuva, Konfor, Yaşam Kalitesi & Sunduğumuz Opsiyonlar</span>
                    <span className="text-[10px] font-semibold text-amber-600">Yeni</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {yasamKonforConcepts.map((c) => {
                      const active = selectedConceptId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectConcept(c)}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            active
                              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                              : 'bg-amber-50/40 hover:bg-amber-50 text-slate-800 border-amber-200/80'
                          }`}
                        >
                          <div className="text-xs font-bold leading-snug">{c.name}</div>
                          <div
                            className={`text-[11px] mt-0.5 leading-tight ${
                              active ? 'text-slate-900 font-medium' : 'text-slate-500'
                            }`}
                          >
                            {c.subtitle}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(selectedCategoryFilter === 'all' || selectedCategoryFilter === 'kurumsal_bilgi') && (
                <div className={selectedCategoryFilter === 'all' ? 'pt-3 border-t border-slate-100' : ''}>
                  <div className="text-xs font-bold text-slate-700 mb-2">
                    Kentsel Dönüşüm, Deprem Güvenliği & Kurumsal Bilgi Kartları
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {kurumsalConcepts.map((c) => {
                      const active = selectedConceptId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectConcept(c)}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            active
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-slate-50/70 hover:bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          <div className="text-xs font-bold leading-snug">{c.name}</div>
                          <div
                            className={`text-[11px] mt-0.5 leading-tight ${
                              active ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {c.subtitle}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(selectedCategoryFilter === 'all' || selectedCategoryFilter === 'proje_paylasimi') && (
                <div className={selectedCategoryFilter === 'all' ? 'pt-3 border-t border-slate-100' : ''}>
                  <div className="text-xs font-bold text-indigo-700 mb-2">
                    Aktif Proje, İç Mekân & Şantiye Paylaşım Kartları
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {projeConcepts.map((c) => {
                      const active = selectedConceptId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectConcept(c)}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            active
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-slate-50/70 hover:bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          <div className="text-xs font-bold leading-snug">{c.name}</div>
                          <div
                            className={`text-[11px] mt-0.5 leading-tight ${
                              active ? 'text-indigo-100' : 'text-slate-500'
                            }`}
                          >
                            {c.subtitle}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Görsel Tema, Boyut & Logo Vurgusu */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-600" />
                <span>02. Görsel Tema & Firma Logosu Vurgusu</span>
              </h3>
            </div>

            {/* Color Theme Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Bilgi Kartı Renk Teması
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.values(COLOR_THEMES) as CardColorTheme[]).map((t) => {
                  const isSelected = colorThemeId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setColorThemeId(t.id)}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 text-slate-900 font-bold ring-1 ring-indigo-600'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 border border-slate-300"
                        style={{ backgroundColor: t.bgStart }}
                      />
                      <span className="text-xs truncate">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Page-Embedded Logo Placement & Background Removal Controls */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Sayfa Üzeri Logo Yerleşimi (Kutusuz / Sayfaya Gömülü)
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                  {[
                    { id: 'top_center_hero', label: 'Üst Merkez Vitrin' },
                    { id: 'top_left_integrated', label: 'Üst Sol Antet' },
                    { id: 'top_right_seal', label: 'Üst Sağ Mühür' },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setLogoPlacement(pos.id as LogoPlacementMode)}
                      className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                        logoPlacement === pos.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Logo Arka Plan Temizleme & Gömme Modu
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPageWatermark}
                      onChange={(e) => setShowPageWatermark(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Sayfa Zemini Filigranı</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'adaptive_clean', label: 'Arka Planı Kaldır (Akıllı)' },
                    { id: 'natural_clean', label: 'Şeffaf Orijinal Renk' },
                    { id: 'gold_emboss', label: 'Altın Kabartma' },
                    { id: 'original_nobox', label: 'Kutusuz Ham' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setLogoEmbedMode(m.id as LogoEmbedMode)}
                      className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition text-center cursor-pointer ${
                        logoEmbedMode === m.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logo Size & Aspect Ratio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Logo Boyutu
                  </label>
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                    {[
                      { id: 'standard', label: 'Standart' },
                      { id: 'large', label: 'Büyük' },
                      { id: 'xl_showcase', label: 'XL Belirgin' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setLogoProminence(item.id as LogoProminenceLevel)}
                        className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                          logoProminence === item.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Görsel Boyut Formatı
                  </label>
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAspectMode('square')}
                      className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                        aspectMode === 'square'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      1:1 Kare (1080p)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAspectMode('portrait')}
                      className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                        aspectMode === 'portrait'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      4:5 Dikey (1350p)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Collapsible Optional Text Customization */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCustomTextEditor(!showCustomTextEditor)}
                className="w-full flex items-center justify-between py-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 transition cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Kart Metinlerini Özelleştir (İsteğe Bağlı)</span>
                </span>
                {showCustomTextEditor ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showCustomTextEditor && (
                <div className="mt-3 space-y-2.5 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Ana Başlık
                    </label>
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Alt Başlık / Proje Bilgisi
                    </label>
                    <input
                      type="text"
                      value={subheadline}
                      onChange={(e) => setSubheadline(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      1. Bilgi Maddesi
                    </label>
                    <input
                      type="text"
                      value={point1}
                      onChange={(e) => setPoint1(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      2. Bilgi Maddesi
                    </label>
                    <input
                      type="text"
                      value={point2}
                      onChange={(e) => setPoint2(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      3. Bilgi Maddesi
                    </label>
                    <input
                      type="text"
                      value={point3}
                      onChange={(e) => setPoint3(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Alt Çağrı Mesajı
                    </label>
                    <input
                      type="text"
                      value={footerCallout}
                      onChange={(e) => setFooterCallout(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. AI Paylaşım Metni (Caption) Üretici */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>03. Gönderi Açıklama Metni (Caption) Üretici</span>
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                {[
                  { id: 'instagram', label: 'Instagram', icon: Instagram },
                  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
                  { id: 'facebook_whatsapp', label: 'WhatsApp / FB', icon: MessageSquare },
                ].map((plt) => {
                  const Icon = plt.icon;
                  const active = targetPlatform === plt.id;
                  return (
                    <button
                      key={plt.id}
                      type="button"
                      onClick={() => setTargetPlatform(plt.id as any)}
                      className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{plt.label}</span>
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                value={additionalCaptionInfo}
                onChange={(e) => setAdditionalCaptionInfo(e.target.value)}
                placeholder="Ek vurgu notu (opsiyonel, örn: Fatih bölgesindeki tecrübemiz)"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none"
              />

              <button
                type="button"
                onClick={handleGenerateAiCaption}
                disabled={isGeneratingCaption}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGeneratingCaption ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Paylaşım Metni Hazırlanıyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Seçili Bilgi Kartına Uygun Paylaşım Metni Üret</span>
                  </>
                )}
              </button>

              {generatedCaption && (
                <div className="space-y-2.5 pt-2">
                  <textarea
                    rows={6}
                    value={generatedCaption}
                    onChange={(e) => setGeneratedCaption(e.target.value)}
                    className="w-full p-3 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed focus:bg-white focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCaption);
                        setCaptionCopied(true);
                        setTimeout(() => setCaptionCopied(false), 2000);
                      }}
                      className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {captionCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Metin Kopyalandı</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Metni Kopyala</span>
                        </>
                      )}
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(generatedCaption)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 text-center"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp ile Gönder</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Direct 1:1 Rendered PNG Output Display (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Hazır Sosyal Medya Bilgi Kartı Çıktısı ({aspectMode === 'portrait' ? '1080×1350' : '1080×1080'} PNG)
                </h3>
                <p className="text-xs text-slate-500">
                  Aşağıdaki görsel doğrudan indirilecek gerçek PNG dosyasıdır
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyImageToClipboard}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  {imageCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Görsel Kopyalandı</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Görseli Kopyala</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PNG İndir</span>
                </button>
              </div>
            </div>

            {/* Direct PNG Canvas Output */}
            <div className="bg-slate-950/5 border border-slate-200/80 rounded-2xl p-4 sm:p-6 flex items-center justify-center">
              {renderedDataUrl ? (
                <img
                  src={renderedDataUrl}
                  alt={`${companyName} Bilgi Kartı`}
                  className="w-full max-w-[540px] h-auto rounded-xl shadow-lg border border-slate-300/60"
                />
              ) : (
                <div className="h-[420px] flex items-center justify-center text-xs text-slate-400">
                  Bilgi kartı hazırlanıyor...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
