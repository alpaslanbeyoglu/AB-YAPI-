import {
  Calculator,
  FileText,
  FileSpreadsheet,
  ScrollText,
  BarChart3,
  History,
  Box,
  Compass,
  Building,
  Users,
  Building2,
  Activity,
  Briefcase,
  Layers,
  LucideIcon
} from 'lucide-react';

export type TabId = 'profile' | 'malikler' | 'tamamlanan' | 'kurulum' | 'model' | 'sartname' | 'maliyet' | 'surec' | 'raporlar' | 'teklif' | 'sozlesme' | 'gecmis';

export type TabCategoryId = 'contractor_core' | 'project_studio';

export interface SubTabConfig {
  id: string;
  label: string;
  step?: number;
}

export interface TabConfig {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  visible: boolean;
  order: number;
  category: TabCategoryId;
  subTabs?: SubTabConfig[];
}

export const TAB_CATEGORIES: { id: TabCategoryId; label: string; badge: string }[] = [
  { id: 'contractor_core', label: '1. Müteahhit Ana Merkezi', badge: 'Şirket & Finans' },
  { id: 'project_studio', label: '2. Proje & Şantiye Çalışma Alanı', badge: 'Aktif İş Emri' },
];

export const DEFAULT_TABS: TabConfig[] = [
  // TIER 1: MÜTEAHHİT ANA YARDIMCISI (FİRMA, FİNANS, MÜŞTERİLER, REFERANSLAR)
  { id: 'profile', label: '1. Şirket, Finans & Yüklenici Profili', shortLabel: 'Firma & Finans', icon: Building, visible: true, order: 0, category: 'contractor_core' },
  { id: 'malikler', label: '2. Arsa Sahipleri & Müşteri Hesabı', shortLabel: 'Müşteriler (CRM)', icon: Users, visible: true, order: 1, category: 'contractor_core' },
  { id: 'tamamlanan', label: '3. Tamamlanan Projeler & Referanslar', shortLabel: 'Referans Projeler', icon: Building2, visible: true, order: 2, category: 'contractor_core' },

  // TIER 2: YENİ İŞ EMRİ / AKTİF PROJE HESAPLAMA STUDIO
  { 
    id: 'kurulum', 
    label: '4. Yeni Proje Kurulumu & Türü',
    shortLabel: 'Proje Kurulumu',
    icon: Compass, 
    visible: true, 
    order: 3,
    category: 'project_studio',
    subTabs: [
      { id: 'step-1', label: '1. Müşteri, Proje & Yapım Türü', step: 1 },
      { id: 'step-2', label: '2. Ölçüler, 2D Çizim & Cepheler', step: 2 },
      { id: 'step-3', label: '3. Harç, Özet & Seçenekler', step: 3 },
    ]
  },
  { id: 'model', label: '5. 3D Yapı & Cephe Tasarımı', shortLabel: '3D Tasarım', icon: Box, visible: true, order: 4, category: 'project_studio' },
  { id: 'sartname', label: '6. Teknik Şartname & Standartlar', shortLabel: 'Teknik Şartname', icon: FileSpreadsheet, visible: true, order: 5, category: 'project_studio' },
  { id: 'maliyet', label: '7. Detaylı Maliyet & Metraj Analizi', shortLabel: 'Maliyet Analizi', icon: BarChart3, visible: true, order: 6, category: 'project_studio' },
  { id: 'surec', label: '8. İnşaat Aşamaları & Hakedişler', shortLabel: 'Hakediş & Süreç', icon: Activity, visible: true, order: 7, category: 'project_studio' },
  { id: 'raporlar', label: '9. Yönetici & Finansal Rapor', shortLabel: 'Yönetici Raporu', icon: BarChart3, visible: true, order: 8, category: 'project_studio' },
  { id: 'teklif', label: '10. Resmi Teklif Mektubu (PDF)', shortLabel: 'Teklif Çıktısı', icon: FileText, visible: true, order: 9, category: 'project_studio' },
  { id: 'sozlesme', label: '11. Resmi Yapım Sözleşmesi', shortLabel: 'Sözleşme', icon: ScrollText, visible: true, order: 10, category: 'project_studio' },
  { id: 'gecmis', label: '12. Arşiv & Kayıtlı Projeler', shortLabel: 'Proje Arşivi', icon: History, visible: true, order: 11, category: 'project_studio' },
];
