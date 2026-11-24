import type { FacadeDetailConfig } from '../types';

export const FACADE_WINDOW_PROFILES = {
  standard: { label: 'Standart', width: 1.8, height: 1.5, sill: 0.9 },
  vertical: { label: 'Dar dikey', width: 0.95, height: 1.8, sill: 0.65 },
  horizontal: { label: 'Geniş yatay', width: 2.6, height: 1.15, sill: 0.95 },
  full_height: { label: 'Yere kadar cam', width: 2.15, height: 2.55, sill: 0.05 },
};

export const MAX_NEIGHBOR_BUILDINGS = 12;

export const GROUND_FACADE_OPTIONS = {
  project: 'Proje varsayılanı',
  storefront: 'Cam vitrin',
  garage: 'Garaj kapısı',
};

export const FACADE_ACCENTS = {
  stone: { label: 'Taş tonlu silme', color: 0xb2a794 },
  wood: { label: 'Ahşap tonlu silme', color: 0x956041 },
  anthracite: { label: 'Antrasit silme', color: 0x343b43 },
};

export interface FacadeSceneOptions {
  windowProfile?: keyof typeof FACADE_WINDOW_PROFILES;
  neighborBuildingCount?: number;
  neighborFloorCounts?: number[];
  showGarden?: boolean;
  groundFacade?: keyof typeof GROUND_FACADE_OPTIONS;
  accentBand?: keyof typeof FACADE_ACCENTS | '';
}

export function getFacadeSceneOptions(config?: FacadeDetailConfig): FacadeSceneOptions {
  return (config as (FacadeDetailConfig & FacadeSceneOptions) | undefined) ?? {};
}

export function getNeighborBuildingCount(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(MAX_NEIGHBOR_BUILDINGS, Math.trunc(value)))
    : 0;
}

export function getNeighborFloorCount(value: number | undefined, fallback = 1): number {
  const input = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(1, Math.min(30, Math.trunc(input)));
}
