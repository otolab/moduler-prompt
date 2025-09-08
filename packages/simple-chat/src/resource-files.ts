/**
 * Resource file handling
 */

import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import type { MaterialContext } from '@moduler-prompt/process';

/**
 * Load resource files as materials
 */
export async function loadResourceFiles(
  resourceFiles: string[],
  basePath?: string
): Promise<{ materials: MaterialContext['materials']; loadedFiles: string[] }> {
  if (!resourceFiles || resourceFiles.length === 0) {
    return { materials: undefined, loadedFiles: [] };
  }
  
  const loadedFiles: string[] = [];
  const materials: NonNullable<MaterialContext['materials']> = [];
  
  for (let i = 0; i < resourceFiles.length; i++) {
    const file = resourceFiles[i];
    try {
      const filePath = basePath ? resolve(dirname(basePath), file) : file;
      const content = await readFile(filePath, 'utf-8');
      
      materials.push({
        id: `resource-${i + 1}`,
        title: file,
        content: content
      });
      loadedFiles.push(file);
    } catch (error) {
      console.error(`Warning: Could not load resource file ${file}: ${error}`);
    }
  }
  
  return {
    materials: materials.length > 0 ? materials : undefined,
    loadedFiles,
  };
}