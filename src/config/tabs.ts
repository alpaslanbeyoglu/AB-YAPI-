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
  LucideIcon
} from 'lucide-react';

export type TabId = 'kurulum' | 'hesapla' | 'model' | 'maliyet' | 'malikler' | 'teklif' | 'surec' | 'sozlesme' | 'sartname' | 'raporlar' | 'profile' | 'tamamlanan' | 'gecmis';

export type TabCategoryId = 'inputs' | 'architecture' | 'calculations' | 'documents';

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

export const TAB_CATEGORIES: { id: TabCategoryId; label: string }[] = [
  { id: 'inputs', label: 'Başlangıç Veri Girişleri' },
  { id: 'architecture', label: 'Mimari & Teknik Özellikler' },
  { id: 'calculations', label: 'Hesaplama & Finansal Yönetim' },
  { id: 'documents', label: 'Teklif, Sözleşme & Raporlar' },
];

export const DEFAULT_TABS: TabConfig[] = [
  { 
    id: 'kurulum', 
    label: '0. Parsel & Yapı Kurulumu', 
    shortLabel: 'Yapı Kurulumu', 
    icon: Compass, 
    visible: true, 
    order: 0, 
    category: 'inputs',
    subTabs: [
      { id: 'step-1', label: '1. Müşteri, Proje & Tür', step: 1 },
      { id: 'step-2', label: '2. Ölçüler, 2D Çizim & Cepheler', step: 2 },
      { id: 'step-3', label: '3. Harç, Özet & Seçenekler', step: 3 },
    ]
  },
  { id: 'malikler', label: '1. Kat Malikleri & Peşinatlar', shortLabel: 'Malikler & Peşinat', icon: Users, visible: true, order: 1, category: 'inputs' },
  { id: 'profile', label: '2. Şirket & Müteahhit Profili', shortLabel: 'Firma Profili', icon: Building, visible: true, order: 2, category: 'inputs' },
  
  { id: 'model', label: '3. 3D Yapı ve Dış Cephe Tasarımı', shortLabel: '3D Tasarım', icon: Box, visible: true, order: 3, category: 'architecture' },
  { id: 'sartname', label: '4. Teknik Şartname & Standartlar', shortLabel: 'Şartname', icon: FileSpreadsheet, visible: true, order: 4, category: 'architecture' },
  
  { id: 'maliyet', label: '5. Detaylı Maliyet Analizi', shortLabel: 'Maliyet Analizi', icon: BarChart3, visible: true, order: 5, category: 'calculations' },
  { id: 'surec', label: '6. İnşaat Aşamaları & Hakedişler', shortLabel: 'Hakediş & Süreç', icon: Activity, visible: true, order: 6, category: 'calculations' },
  { id: 'raporlar', label: '7. Yönetici & Finansal Rapor', shortLabel: 'Yön. Raporu', icon: BarChart3, visible: true, order: 7, category: 'calculations' },
  
  { id: 'teklif', label: '8. Teklif Raporu (PDF)', shortLabel: 'Teklif Çıktısı', icon: FileText, visible: true, order: 8, category: 'documents' },
  { id: 'sozlesme', label: '9. Resmî Yapım Sözleşmesi', shortLabel: 'Sözleşme', icon: ScrollText, visible: true, order: 9, category: 'documents' },
  { id: 'tamamlanan', label: '10. Referans Projeler', shortLabel: 'Referanslar', icon: Building2, visible: true, order: 10, category: 'documents' },
  { id: 'gecmis', label: '11. Arşiv & Kayıtlar', shortLabel: 'Arşiv', icon: History, visible: true, order: 11, category: 'documents' },
];

