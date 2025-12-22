/**
 * Merged module
 *
 * Merges toolGenerationLogicModule and textJsonOutputModule
 */

import { compile, merge } from '@moduler-prompt/core';
import { toolGenerationLogicModule } from '../../../../src/prompts/generation-logic-module.js';
import { textJsonOutputModule } from '../../../../src/prompts/text-json-output-module.js';

export default {
  name: 'Merged',
  description: 'Merged (toolGenerationLogicModule + textJsonOutputModule)',
  compile: (context: any) => {
    const mergedModule = merge(toolGenerationLogicModule, textJsonOutputModule);
    return compile(mergedModule, context);
  },
};
