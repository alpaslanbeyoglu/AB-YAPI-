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

export type TabCategoryId = 'design' | 'finance' | 'docs' | 'admin';

export interface TabConfig {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  visible: boolean;
  order: number;
  category: TabCategoryId;
}

export const TAB_CATEGORIES: { id: TabCategoryId; label: string }[] = [
  { id: 'design', label: 'Tasarım & Model' },
  { id: 'finance', label: 'Maliyet & Ödeme' },
  { id: 'docs', label: 'Belgeler & Rapor' },
  { id: 'admin', label: 'Kurumsal & Kayıt' },
];

export const DEFAULT_TABS: TabConfig[] = [
  { id: 'kurulum', label: '0. Parsel & Yapı Kurulumu', shortLabel: 'Kurulum', icon: Compass, visible: true, order: 0, category: 'design' },
  { id: 'model', label: '1. 3D Model', shortLabel: 'Model', icon: Box, visible: true, order: 1, category: 'design' },
  { id: 'maliyet', label: '2. Maliyet Detayları', shortLabel: 'Maliyet', icon: BarChart3, visible: true, order: 2, category: 'finance' },
  { id: 'malikler', label: '3. Kat Malikleri & Ödemeler', shortLabel: 'Malikler', icon: Users, visible: true, order: 3, category: 'finance' },
  { id: 'teklif', label: '4. Teklif Çıktısı', shortLabel: 'Teklif', icon: FileText, visible: true, order: 4, category: 'docs' },
  { id: 'surec', label: '5. İnşaat & Süreç Takibi', shortLabel: 'Süreç', icon: Activity, visible: true, order: 5, category: 'docs' },
  { id: 'sozlesme', label: '6. Resmi Sözleşme', shortLabel: 'Sözleşme', icon: ScrollText, visible: true, order: 6, category: 'docs' },
  { id: 'sartname', label: '7. Teknik Şartname', shortLabel: 'Şartname', icon: FileSpreadsheet, visible: true, order: 7, category: 'docs' },
  { id: 'raporlar', label: '8. Müteahhit Raporu', shortLabel: 'Rapor', icon: BarChart3, visible: true, order: 8, category: 'docs' },
  { id: 'profile', label: '9. Firma Profili', shortLabel: 'Firma', icon: Building, visible: true, order: 9, category: 'admin' },
  { id: 'tamamlanan', label: '10. Tamamlanan Projeler', shortLabel: 'Projeler', icon: Building2, visible: true, order: 10, category: 'admin' },
  { id: 'gecmis', label: '11. Kayıtlar', shortLabel: 'Kayıtlar', icon: History, visible: true, order: 11, category: 'admin' },
];
