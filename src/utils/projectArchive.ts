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
  return !!params && !!project.savedAt
    && project.savedAt === project.updatedAt
    && !project.buildingModelParams
    && /^[a-z0-9]+(?: +[a-z0-9]+)*$/.test(projectAddress)
    && params.projectName === projectAddress
    && params.projectAddress === projectAddress
    && orderedJson({ ...params, projectName: '', projectAddress: '' }) === defaultArchiveParams;
}
