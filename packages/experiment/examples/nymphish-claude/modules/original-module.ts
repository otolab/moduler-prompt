/**
 * Original module
 *
 * Uses the original toolGenerationModule without modifications
 */

import { compile } from '@moduler-prompt/core';
import { toolGenerationModule } from '../../../../src/prompts/generation-module.js';

export default {
  name: 'Original',
  description: 'Original toolGenerationModule',
  compile: (context: any) => compile(toolGenerationModule, context),
};
