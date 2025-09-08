/**
 * Resource file handling
 */

import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';

/**
 * Load resource files and combine their content
 */
export async function loadResourceFiles(
  resourceFiles: string[],
  basePath?: string
): Promise<{ content: string; loadedFiles: string[] }> {
  if (!resourceFiles || resourceFiles.length === 0) {
    return { content: '', loadedFiles: [] };
  }
  
  const loadedFiles: string[] = [];
  const contents: string[] = [];
  
  for (const file of resourceFiles) {
    try {
      const filePath = basePath ? resolve(dirname(basePath), file) : file;
      const content = await readFile(filePath, 'utf-8');
      
      contents.push(`--- File: ${file} ---\n${content}\n--- End of ${file} ---`);
      loadedFiles.push(file);
    } catch (error) {
      console.error(`Warning: Could not load resource file ${file}: ${error}`);
    }
  }
  
  return {
    content: contents.join('\n\n'),
    loadedFiles,
  };
}