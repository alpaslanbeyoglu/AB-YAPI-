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
  LucideIcon
} from 'lucide-react';

export type TabId = 'hesapla' | 'model' | 'katplani' | 'maliyet' | 'malikler' | 'teklif' | 'sozlesme' | 'sartname' | 'raporlar' | 'profile' | 'tamamlanan' | 'gecmis';

export interface TabConfig {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  visible: boolean;
  order: number;
}

export const DEFAULT_TABS: TabConfig[] = [
  { id: 'hesapla', label: '1. Hesaplama Paneli', shortLabel: 'Hesap', icon: Calculator, visible: true, order: 1 },
  { id: 'model', label: '2. 3D Model', shortLabel: 'Model', icon: Box, visible: true, order: 2 },
  { id: 'katplani', label: '3. 2D Kat Planı', shortLabel: 'Plan', icon: Compass, visible: true, order: 3 },
  { id: 'maliyet', label: '4. Maliyet Detayları', shortLabel: 'Maliyet', icon: BarChart3, visible: true, order: 4 },
  { id: 'malikler', label: '5. Kat Malikleri & Ödemeler', shortLabel: 'Malikler', icon: Users, visible: true, order: 5 },
  { id: 'teklif', label: '6. Teklif Çıktısı', shortLabel: 'Teklif', icon: FileText, visible: true, order: 6 },
  { id: 'sozlesme', label: '7. Resmi Sözleşme', shortLabel: 'Sözleşme', icon: ScrollText, visible: true, order: 7 },
  { id: 'sartname', label: '8. Teknik Şartname', shortLabel: 'Şartname', icon: FileSpreadsheet, visible: true, order: 8 },
  { id: 'raporlar', label: '9. Müteahhit Raporu', shortLabel: 'Rapor', icon: BarChart3, visible: true, order: 9 },
  { id: 'profile', label: '10. Firma Profili', shortLabel: 'Firma', icon: Building, visible: true, order: 10 },
  { id: 'tamamlanan', label: '11. Tamamlanan Projeler', shortLabel: 'Projeler', icon: Building2, visible: true, order: 11 },
  { id: 'gecmis', label: '12. Kayıtlar', shortLabel: 'Kayıtlar', icon: History, visible: true, order: 12 },
];
