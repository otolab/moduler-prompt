# @moduler-prompt/experiment

Experiment framework for comparing and evaluating modular prompt modules.

## Overview

This framework provides tools to compare and evaluate different prompt module variations under identical conditions. It integrates with the `@moduler-prompt/core` system to test multiple prompt variations and evaluate their output quality.

### Use Cases

- **Prompt Engineering**: Validate the effectiveness of new prompt structures
- **Module Separation**: Verify that modularized prompts produce equivalent outputs
- **Quality Evaluation**: Assess output stability and consistency through repeated executions
- **Multi-Model Testing**: Test across different LLM providers (MLX, VertexAI, GoogleGenAI, etc.)

## Features

- ✅ **Dynamic Module Loading**: Load prompt modules from external files or inline definitions
- ✅ **Flexible Evaluators**: Support both code-based and AI-based evaluation
- ✅ **Statistical Analysis**: Analyze success rates, execution times, and output consistency
- ✅ **Prompt Diff Detection**: Automatically detect differences between module outputs
- ✅ **Driver Caching**: Reuse drivers for improved memory efficiency
- ✅ **Detailed Logging**: Comprehensive logging of all executions

## Installation

```bash
pnpm add @moduler-prompt/experiment
```

## Quick Start

### 1. Create Configuration File

You can use either YAML or TypeScript format.

#### Option A: YAML Configuration (Recommended for static configurations)

Create `configs/experiment.yaml`:

```yaml
models:
  - provider: vertexai
    model: gemini-2.0-flash-exp
    enabled: true
    role: test

drivers:
  vertexai:
    projectId: your-project-id
    location: us-central1
    # Paths are resolved relative to this config file
    # Can use ~/ for home directory or absolute paths
    credentialsPath: ./credentials.json

modules:
  - name: my-module
    path: ./my-module.ts
    description: My custom prompt module

testCases:
  - name: Basic Test
    description: Test basic functionality
    input: test input data

evaluators:
  - name: json-validator
    path: ./evaluators/json-validator.ts
  # Or inline prompt evaluator
  - name: quality-check
    prompt:
      objective:
        - Evaluate output quality
      instructions:
        - Check clarity and accuracy

evaluation:
  enabled: true
  provider: vertexai
  model: gemini-2.0-flash-exp
```

#### Option B: TypeScript Configuration (For dynamic configurations)

Create `configs/experiment.ts`:

```typescript
export default {
  models: [
    {
      provider: 'vertexai',
      model: 'gemini-2.0-flash-exp',
      enabled: true,
      role: 'test',
    },
  ],
  drivers: {
    vertexai: {
      projectId: 'your-project-id',
      location: 'us-central1',
      credentialsPath: './credentials.json',
    },
  },
  modules: [
    {
      name: 'my-module',
      path: './my-module.ts',
      description: 'My custom prompt module',
    },
  ],
  testCases: [
    {
      name: 'Basic Test',
      description: 'Test basic functionality',
      input: 'test input data',
    },
  ],
  evaluators: [
    {
      name: 'json-validator',
      path: './evaluators/json-validator.ts',
    },
  ],
  evaluation: {
    enabled: true,
    provider: 'vertexai',
    model: 'gemini-2.0-flash-exp',
  },
};
```

**TypeScript Support**: TypeScript configuration files are automatically transpiled using [jiti](https://github.com/unjs/jiti). You can use TypeScript syntax directly without pre-compilation. Type annotations are stripped automatically, and the file is executed as JavaScript.

**Important**: All file paths in the configuration (modules, evaluators, credentials) are resolved relative to the config file location.

### 2. Run Experiment

```bash
# Run with YAML config
npx moduler-experiment configs/experiment.yaml

# Run with TypeScript config
npx moduler-experiment configs/experiment.ts

# Run specific module
npx moduler-experiment configs/experiment.yaml --modules my-module

# Run with evaluation
npx moduler-experiment configs/experiment.yaml --evaluate

# Run multiple times for statistics
npx moduler-experiment configs/experiment.yaml --repeat 10
```

## Configuration

### Module Definition

Modules can be defined inline or loaded from external files:

```typescript
// External file
export const modules: ModuleReference[] = [
  {
    name: 'my-module',
    path: './modules/my-module.ts',
    description: 'Description',
  },
];
```

A module file should export a default object with:

```typescript
import { compile } from '@moduler-prompt/core';
import { myPromptModule } from './prompts.js';

export default {
  name: 'My Module',
  description: 'Module description',
  compile: (context: any) => compile(myPromptModule, context),
};
```

### Evaluator Definition

Two types of evaluators are supported:

#### 1. Code Evaluator

Programmatic validation (e.g., JSON structure validation):

```typescript
import type { CodeEvaluator, EvaluationContext, EvaluationResult } from '@moduler-prompt/experiment';

export default {
  name: 'JSON Validator',
  description: 'Validates JSON structure in output',

  async evaluate(context: EvaluationContext): Promise<EvaluationResult> {
    // Validation logic
    return {
      evaluator: 'json-validator',
      moduleName: context.moduleName,
      score: 10,
      reasoning: 'Valid JSON structure',
    };
  },
} satisfies CodeEvaluator;
```

#### 2. Prompt Evaluator

AI-based evaluation using LLM:

```typescript
import type { PromptEvaluator, EvaluationContext } from '@moduler-prompt/experiment';
import type { PromptModule } from '@moduler-prompt/core';

const evaluationModule: PromptModule<EvaluationContext> = {
  createContext: (): EvaluationContext => ({
    moduleName: '',
    prompt: '',
    runs: [],
  }),

  objective: [
    '- Assess output quality',
  ],

  instructions: [
    '- Evaluate clarity and accuracy',
  ],
};

export default {
  name: 'Quality Evaluator',
  description: 'Evaluates output quality',
  module: evaluationModule,
} satisfies PromptEvaluator;
```

All prompt evaluators are automatically merged with the base evaluation module.

## Architecture

```
┌─────────────────────────────────────────┐
│ run-comparison.ts (CLI Entry Point)    │
└─────────────────────────────────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐
│ Config │ │ Runner │ │Reporter│
│ Loader │ │        │ │        │
└────────┘ └────────┘ └────────┘
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Dynamic │ │Driver  │
│Loader  │ │Manager │
└────────┘ └────────┘
```

### Components

| Component | Responsibility |
|-----------|----------------|
| `config/loader.ts` | Load YAML configuration |
| `config/dynamic-loader.ts` | Dynamic module/evaluator loading |
| `runner/experiment.ts` | Orchestrate experiment execution |
| `runner/evaluator.ts` | Execute evaluations |
| `runner/driver-manager.ts` | Cache and manage AI drivers |
| `reporter/statistics.ts` | Generate statistical reports |
| `evaluators/base-module.ts` | Base evaluation prompt module |

## Examples

See `examples/nymphish-claude/` for a complete example with:
- Module definitions using `@moduler-prompt/anthropic-server` prompts
- Test case definitions
- YAML configuration

## API

### Programmatic Usage

```typescript
import {
  loadExperimentConfig,
  loadModules,
  loadEvaluators,
  ExperimentRunner,
  DriverManager,
} from '@moduler-prompt/experiment';

const { serverConfig, aiService } = loadExperimentConfig('config.yaml');
const modules = await loadModules(moduleRefs, basePath);
const evaluators = await loadEvaluators(evaluatorRefs, basePath);

const driverManager = new DriverManager();
const runner = new ExperimentRunner(
  aiService,
  driverManager,
  modules,
  testCases,
  models,
  repeatCount,
  evaluators,
  evaluatorModel
);

const results = await runner.run();
await driverManager.cleanup();
```

## CLI Options

```
Usage: moduler-experiment <config> [options]

Arguments:
  <config>                Config file path (YAML or TypeScript)

Options:
  --test-case <name>      Test case name filter
  --model <provider>      Model provider filter
  --modules <names>       Comma-separated module names (default: all)
  --repeat <count>        Number of repetitions (default: 1)
  --evaluate              Enable evaluation phase
  --evaluators <names>    Comma-separated evaluator names (default: all)
```

**Note**: All paths specified in the config file are resolved relative to the config file's directory.

## License

MIT
