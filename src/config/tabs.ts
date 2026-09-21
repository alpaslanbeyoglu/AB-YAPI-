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
  { id: 'contractor_core', label: 'Müteahhit Yönetim Merkezi', badge: 'Şirket & CRM' },
  { id: 'project_studio', label: 'Aktif İş Emri & Şantiye Stüdyosu', badge: 'Hesaplama Engine' },
];

export const DEFAULT_TABS: TabConfig[] = [
  // CATEGORY 1: MÜTEAHHİT ANA YARDIMCISI (ŞİRKET, FİNANS, CRM, PORTFÖY)
  { id: 'profile', label: 'Firma, Finans & Muhasebe', shortLabel: 'Firma & Finans', icon: Building, visible: true, order: 0, category: 'contractor_core' },
  { id: 'malikler', label: 'Müşteriler & Cari İletişim (CRM)', shortLabel: 'Müşteriler (CRM)', icon: Users, visible: true, order: 1, category: 'contractor_core' },
  { id: 'tamamlanan', label: 'Referans Projeler & Portföy', shortLabel: 'Referanslar', icon: Building2, visible: true, order: 2, category: 'contractor_core' },
  { id: 'gecmis', label: 'Proje Arşivi & Kayıtlı İşler', shortLabel: 'Proje Arşivi', icon: History, visible: true, order: 3, category: 'contractor_core' },

  // CATEGORY 2: AKTİF İŞ EMRİ & PROJE HESAPLAMA STÜDYOSU
  { 
    id: 'kurulum', 
    label: '1. Proje Kurulumu & Yapım Türü',
    shortLabel: 'Proje Kurulumu',
    icon: Compass, 
    visible: true, 
    order: 4,
    category: 'project_studio',
    subTabs: [
      { id: 'step-1', label: '1. Müşteri, Proje & Yapım Türü', step: 1 },
      { id: 'step-2', label: '2. Ölçüler, 2D Çizim & Cepheler', step: 2 },
      { id: 'step-3', label: '3. Harç, Özet & Seçenekler', step: 3 },
    ]
  },
  { id: 'model', label: '2. 3D Yapı & Dış Cephe', shortLabel: '3D Tasarım', icon: Box, visible: true, order: 5, category: 'project_studio' },
  { id: 'sartname', label: '3. Teknik Şartname & Standartlar', shortLabel: 'Teknik Şartname', icon: FileSpreadsheet, visible: true, order: 6, category: 'project_studio' },
  { id: 'maliyet', label: '4. Detaylı Maliyet & Metraj Analizi', shortLabel: 'Maliyet Analizi', icon: BarChart3, visible: true, order: 7, category: 'project_studio' },
  { id: 'surec', label: '5. İnşaat Aşamaları & Hakedişler', shortLabel: 'Hakediş & Süreç', icon: Activity, visible: true, order: 8, category: 'project_studio' },
  { id: 'raporlar', label: '6. Yönetici Finansal Raporu', shortLabel: 'Yönetici Raporu', icon: BarChart3, visible: true, order: 9, category: 'project_studio' },
  { id: 'teklif', label: '7. Resmi Teklif Mektubu (PDF)', shortLabel: 'Teklif Çıktısı', icon: FileText, visible: true, order: 10, category: 'project_studio' },
  { id: 'sozlesme', label: '8. Resmi Yapım Sözleşmesi', shortLabel: 'Sözleşme', icon: ScrollText, visible: true, order: 11, category: 'project_studio' },
];
