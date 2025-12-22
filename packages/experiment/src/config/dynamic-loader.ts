/**
 * Dynamic loader for evaluators and modules
 *
 * Loads evaluators and modules from external files or inline definitions
 */

import { merge } from '@moduler-prompt/core';
import { pathToFileURL } from 'url';
import { resolve } from 'path';
import type {
  EvaluatorReference,
  CodeEvaluator,
  PromptEvaluator,
  ModuleDefinition,
} from '../types.js';
import { baseEvaluationModule } from '../evaluators/base-module.js';

/**
 * Loaded evaluator (unified type)
 */
export interface LoadedEvaluator {
  name: string;
  description: string;
  type: 'code' | 'prompt';
  codeEvaluator?: CodeEvaluator;
  promptEvaluator?: PromptEvaluator;
}

/**
 * Load evaluators from references
 *
 * @param refs - Array of evaluator references
 * @param basePath - Base path for resolving relative paths
 * @returns Array of loaded evaluators
 */
export async function loadEvaluators(
  refs: EvaluatorReference[],
  basePath: string
): Promise<LoadedEvaluator[]> {
  const evaluators: LoadedEvaluator[] = [];

  for (const ref of refs) {
    if ('path' in ref) {
      // External file
      const filePath = resolve(basePath, ref.path);
      const fileUrl = pathToFileURL(filePath).href;
      const imported = await import(fileUrl);
      const evaluator = imported.default;

      if (!evaluator) {
        console.warn(`⚠️  No default export in ${ref.path}`);
        continue;
      }

      // Detect type by checking properties
      if ('evaluate' in evaluator && typeof evaluator.evaluate === 'function') {
        // Code evaluator
        evaluators.push({
          name: ref.name,
          description: ref.description || evaluator.description || '',
          type: 'code',
          codeEvaluator: evaluator as CodeEvaluator,
        });
      } else if ('module' in evaluator) {
        // Prompt evaluator - merge with base module
        const mergedModule = merge(baseEvaluationModule, evaluator.module);
        evaluators.push({
          name: ref.name,
          description: ref.description || evaluator.description || '',
          type: 'prompt',
          promptEvaluator: {
            name: evaluator.name,
            description: evaluator.description,
            module: mergedModule,
          },
        });
      } else {
        console.warn(`⚠️  Unknown evaluator type in ${ref.path}`);
      }
    } else if ('prompt' in ref) {
      // Inline prompt definition - merge with base module
      const mergedModule = merge(baseEvaluationModule, ref.prompt);
      evaluators.push({
        name: ref.name,
        description: ref.description || '',
        type: 'prompt',
        promptEvaluator: {
          name: ref.name,
          description: ref.description || '',
          module: mergedModule,
        },
      });
    }
  }

  return evaluators;
}

/**
 * Module reference in config file
 */
export type ModuleReference =
  | { name: string; path: string; description?: string };

/**
 * Load modules from references
 *
 * @param refs - Array of module references
 * @param basePath - Base path for resolving relative paths
 * @returns Array of module definitions
 */
export async function loadModules(
  refs: ModuleReference[],
  basePath: string
): Promise<ModuleDefinition[]> {
  const modules: ModuleDefinition[] = [];

  for (const ref of refs) {
    const filePath = resolve(basePath, ref.path);
    const fileUrl = pathToFileURL(filePath).href;
    const imported = await import(fileUrl);
    const module = imported.default;

    if (!module) {
      console.warn(`⚠️  No default export in ${ref.path}`);
      continue;
    }

    modules.push({
      name: ref.name,
      description: ref.description || module.description || '',
      compile: module.compile,
    });
  }

  return modules;
}
