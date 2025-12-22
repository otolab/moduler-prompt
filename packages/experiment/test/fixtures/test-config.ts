/**
 * TypeScript configuration test file
 */

export default {
  models: [
    {
      model: 'test-model-ts',
      provider: 'test',
      enabled: true,
      role: 'test',
    },
  ],
  drivers: {
    test: {},
  },
  evaluation: {
    enabled: false,
  },
  modules: [
    {
      name: 'test-module-ts',
      path: './test-module.ts',
      description: 'Test module from TypeScript config',
    },
  ],
  testCases: [
    {
      name: 'Test Case from TS',
      description: 'TypeScript config test case',
      input: 'ts input',
    },
  ],
  evaluators: [],
};
