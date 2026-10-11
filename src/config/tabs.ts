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
  { id: 'contractor_core', label: 'Şirket Yönetim Merkezi', badge: 'Ana Sayfa & Portföy' },
  { id: 'project_studio', label: 'Aktif Proje Stüdyosu', badge: 'Kronolojik Proje Akışı' },
];

export const DEFAULT_TABS: TabConfig[] = [
  // CATEGORY 1: ŞİRKET YÖNETİM MERKEZİ (ŞİRKET ANA SAYFASI, FİNANSAL PİYASA & PORTFÖY)
  { id: 'profile', label: 'Firma Ana Sayfası, Piyasa Verileri & Projeler', shortLabel: 'Firma Ana Sayfası', icon: Building, visible: true, order: 0, category: 'contractor_core' },
  { id: 'gecmis', label: 'Proje Arşivi & Kayıtlı Projeler', shortLabel: 'Proje Arşivi', icon: Building2, visible: true, order: 1, category: 'contractor_core' },
  { id: 'tamamlanan', label: 'Referans Tamamlanan Projeler', shortLabel: 'Referanslar', icon: Briefcase, visible: true, order: 2, category: 'contractor_core' },

  // CATEGORY 2: AKTİF PROJE HESAPLAMA VE İCRA STÜDYOSU (9 ADIMLI KRONOLOJİK HİYERARŞİ)
  { 
    id: 'kurulum', 
    label: '1. Proje Kurulumu & Yapım Türü',
    shortLabel: '1. Proje Kurulumu',
    icon: Compass, 
    visible: true, 
    order: 3,
    category: 'project_studio',
    subTabs: [
      { id: 'step-1', label: '1. Müşteri, Proje & Yapım Türü', step: 1 },
      { id: 'step-2', label: '2. Ölçüler, 2D Çizim & Cepheler', step: 2 },
      { id: 'step-3', label: '3. Harç, Daire Matrisi & Seçenekler', step: 3 },
    ]
  },
  { id: 'model', label: '2. 3D Yapı & Dış Cephe Tasarımı', shortLabel: '2. 3D Tasarım', icon: Box, visible: true, order: 4, category: 'project_studio' },
  { id: 'malikler', label: '3. Müşteriler & Proje Malikleri (CRM)', shortLabel: '3. Müşteriler & Malikler', icon: Users, visible: true, order: 5, category: 'project_studio' },
  { id: 'maliyet', label: '4. Detaylı Maliyet & Metraj Analizi', shortLabel: '4. Maliyet Analizi', icon: BarChart3, visible: true, order: 6, category: 'project_studio' },
  { id: 'raporlar', label: '5. Yönetici Finansal Raporu', shortLabel: '5. Yönetici Raporu', icon: BarChart3, visible: true, order: 7, category: 'project_studio' },
  { id: 'sartname', label: '6. Teknik Şartname & Standartlar', shortLabel: '6. Teknik Şartname', icon: FileSpreadsheet, visible: true, order: 8, category: 'project_studio' },
  { id: 'teklif', label: '7. Resmi Teklif Mektubu (PDF)', shortLabel: '7. Teklif Çıktısı', icon: FileText, visible: true, order: 9, category: 'project_studio' },
  { id: 'sozlesme', label: '8. Resmi Yapım Sözleşmesi', shortLabel: '8. Sözleşme Metni', icon: ScrollText, visible: true, order: 10, category: 'project_studio' },
  { id: 'surec', label: '9. İnşaat Aşamaları & Canlı Şantiye İcra', shortLabel: '9. Şantiye & Süreç', icon: Activity, visible: true, order: 11, category: 'project_studio' },
];
