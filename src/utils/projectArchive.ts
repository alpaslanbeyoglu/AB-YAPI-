import type { SavedProjectData } from '../types';
import { DEFAULT_PARAMS } from './calculatorEngine';

function orderedJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    return Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]));
  });
}

const defaultArchiveParams = orderedJson({ ...DEFAULT_PARAMS, projectName: '', projectAddress: '' });

// The old startup scan made these snapshots from storage keys and the full default template.
export function isLegacyAutomaticArchiveEntry(project: SavedProjectData): boolean {
  const { projectAddress, params } = project;
  const creationDelay = Date.parse(project.updatedAt ?? "") - Date.parse(project.savedAt);
  return !!params && !!project.savedAt
    && creationDelay >= 0 && creationDelay <= 1000
    && !project.buildingModelParams
    && /^[a-z0-9 ]+$/.test(projectAddress)
    && params.projectName === projectAddress
    && params.projectAddress === projectAddress
    && orderedJson({ ...params, projectName: '', projectAddress: '' }) === defaultArchiveParams;
}

export function getCurrentArchiveProjects(history: SavedProjectData[]): SavedProjectData[] {
  const latest = new Map<string, SavedProjectData>();
  const time = (p: SavedProjectData) => Date.parse(p.updatedAt || '') || Date.parse(p.savedAt) || 0;
  const projects = history.filter(project => !isLegacyAutomaticArchiveEntry(project));
  const address = (project: SavedProjectData) => project.projectAddress?.trim().toLocaleLowerCase('tr-TR');
  for (const project of projects) {
    const key = address(project);
    if (!key) continue;
    const previous = latest.get(key);
    if (!previous || time(project) > time(previous)) latest.set(key, project);
  }
  return projects.filter(project => !address(project) || latest.get(address(project)) === project);
}
