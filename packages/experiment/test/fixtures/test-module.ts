/**
 * Test module for experiment
 */

import { compile } from '@modular-prompt/core';

export default {
  name: 'Test Module',
  description: 'Simple test module',
  compile: (context: any) => {
    return compile({
      objective: ['Test objective'],
      instructions: ['Test instruction'],
      inputs: [context.input || 'default input'],
    });
  },
};
