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

  // CATEGORY 2: AKTİF PROJE HESAPLAMA VE İCRA STÜDYOSU (9 ADIMLI YENİ İŞ AKIŞI)
  { 
    id: 'kurulum', 
    label: '1. Proje Çalışma Masası',
    shortLabel: '1. Çalışma Masası',
    icon: Compass, 
    visible: false, 
    order: 3,
    category: 'project_studio',
    subTabs: [
      { id: 'step-1', label: '1. Müşteri ve Proje Tanımlama', step: 1 },
      { id: 'step-2', label: '2. Arsa ve İmar Analizi', step: 2 },
      { id: 'step-3', label: '3. Mimari Tasarım ve Yapılandırma', step: 3 },
      { id: 'step-4', label: '4. 3D Tasarım ve Görselleştirme', step: 4 },
      { id: 'step-5', label: '5. Teknik Şartname ve Metraj', step: 5 },
      { id: 'step-6', label: '6. Maliyet ve Fizibilite', step: 6 },
      { id: 'step-7', label: '7. Malik Paylaşımı ve Ticari Model', step: 7 },
      { id: 'step-8', label: '8. Teklif ve Sözleşme', step: 8 },
      { id: 'step-9', label: '9. Proje ve Şantiye Yönetimi', step: 9 },
    ]
  },
  { id: 'model', label: '3D Tasarım ve Görselleştirme', shortLabel: '3D Tasarım', icon: Box, visible: false, order: 4, category: 'project_studio' },
  { id: 'sartname', label: 'Teknik Şartname & Standartlar', shortLabel: 'Teknik Şartname', icon: FileSpreadsheet, visible: false, order: 5, category: 'project_studio' },
  { id: 'maliyet', label: 'Detaylı Maliyet & Metraj Analizi', shortLabel: 'Maliyet Analizi', icon: BarChart3, visible: false, order: 6, category: 'project_studio' },
  { id: 'raporlar', label: 'Yönetici Finansal Raporu (CFO)', shortLabel: 'Yönetici Raporu', icon: BarChart3, visible: false, order: 7, category: 'project_studio' },
  { id: 'malikler', label: 'Müşteriler & Proje Malikleri (CRM)', shortLabel: 'Malik Paylaşımı', icon: Users, visible: false, order: 8, category: 'project_studio' },
  { id: 'teklif', label: 'Resmi Teklif Mektubu (PDF)', shortLabel: 'Teklif Çıktısı', icon: FileText, visible: false, order: 9, category: 'project_studio' },
  { id: 'sozlesme', label: 'Resmi Yapım Sözleşmesi', shortLabel: 'Sözleşme Metni', icon: ScrollText, visible: false, order: 10, category: 'project_studio' },
  { id: 'surec', label: 'İnşaat Aşamaları & Canlı Şantiye İcra', shortLabel: 'Şantiye & Süreç', icon: Activity, visible: false, order: 11, category: 'project_studio' },
];
