# @modular-prompt/experiment

Experiment framework for comparing and evaluating modular prompt modules.

## Overview

This framework provides tools to compare and evaluate different prompt module variations under identical conditions. It integrates with the `@modular-prompt/core` system to test multiple prompt variations and evaluate their output quality.

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
pnpm add @modular-prompt/experiment
```

## Quick Start

### 1. Create Configuration File

You can use either YAML or TypeScript format.

#### Option A: YAML Configuration (Recommended for static configurations)

Create `examples/experiment.yaml`:

```yaml
models:
  gemini-fast:
    provider: vertexai
    model: gemini-2.0-flash-exp
    capabilities: ["tools", "fast"]
    enabled: true

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
    input:  # Structured context object (passed to module.compile)
      query: user question
      context: additional information
    models:  # Optional: specify which models to test (uses all enabled if not specified)
      - gemini-fast

evaluators:
  # Built-in evaluators (name only)
  - name: structured-output-presence
  - name: llm-requirement-fulfillment
  # Or external evaluator (with path)
  - name: custom-validator
    path: ./evaluators/custom-validator.ts
  # Or inline prompt evaluator
  - name: quality-check
    prompt:
      objective:
        - Evaluate output quality
      instructions:
        - Check clarity and accuracy

evaluation:
  enabled: true
  model: gemini-fast  # Reference by model name
```

#### Option B: TypeScript Configuration (For dynamic configurations)

Create `examples/experiment.ts`:

```typescript
export default {
  models: {
    'gemini-fast': {
      provider: 'vertexai',
      model: 'gemini-2.0-flash-exp',
      capabilities: ['tools', 'fast'],
      enabled: true,
    },
  },
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
      input: {  // Structured context object
        query: 'user question',
        options: { temperature: 0.7 },
      },
      models: ['gemini-fast'],  // Optional
    },
  ],
  evaluators: [
    // Built-in evaluators (name only)
    { name: 'structured-output-presence' },
    { name: 'llm-requirement-fulfillment' },
    // Or external evaluator (with path)
    {
      name: 'custom-validator',
      path: './evaluators/custom-validator.ts',
    },
  ],
  evaluation: {
    enabled: true,
    model: 'gemini-fast',  // Reference by model name
  },
};
```

**TypeScript Support**: TypeScript configuration files are automatically transpiled using [jiti](https://github.com/unjs/jiti). You can use TypeScript syntax directly without pre-compilation. Type annotations are stripped automatically, and the file is executed as JavaScript.

**Important**: All file paths in the configuration (modules, evaluators, credentials) are resolved relative to the config file location.

### 2. Run Experiment

```bash
# Run with YAML config
npx modular-experiment examples/experiment.yaml

# Run with TypeScript config
npx modular-experiment examples/experiment.ts

# Run specific module
npx modular-experiment examples/experiment.yaml --modules my-module

# Run with evaluation
npx modular-experiment examples/experiment.yaml --evaluate

# Run multiple times for statistics
npx modular-experiment examples/experiment.yaml --repeat 10
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
import { compile } from '@modular-prompt/core';
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
import type { CodeEvaluator, EvaluationContext, EvaluationResult } from '@modular-prompt/experiment';

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
import type { PromptEvaluator, EvaluationContext } from '@modular-prompt/experiment';
import type { PromptModule } from '@modular-prompt/core';

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

## Built-in Evaluators

The framework includes built-in evaluators that can be referenced by name only (no path required):

### structured-output-presence

- **Type**: Code Evaluator
- **What it measures**: Checks if `structuredOutput` exists and is a valid object
- **Evaluation logic**:
  - Verifies presence of `structuredOutput` in query result
  - Confirms it's a non-null object type
- **Score**: `(validCount / totalRuns) * 10`
- **Use case**: Verify that the model returns structured JSON output (essential for structured output workflows)
- **Usage**:
  ```yaml
  evaluators:
    - name: "structured-output-presence"
  ```

### llm-requirement-fulfillment

- **Type**: Prompt Evaluator (uses LLM for evaluation)
- **What it measures**: Uses LLM to comprehensively evaluate whether output meets functional requirements
- **Evaluation criteria**:
  1. **Requirement Fulfillment**: Does it satisfy the intent described in the prompt?
  2. **Parameter Correctness**: Are all required parameters present and correct?
  3. **Parameter Completeness**: Are optional parameters appropriately used or omitted?
  4. **Logical Consistency**: Is the output logically consistent with the facts?
- **Score**: 0-10 overall score with detailed sub-scores for each criterion
- **Use case**: Comprehensive quality assessment of output (requires evaluation model to be configured)
- **Usage**:
  ```yaml
  evaluators:
    - name: "llm-requirement-fulfillment"

  evaluation:
    enabled: true
    model: "gemini-fast"  # Model used for evaluation
  ```

**Note**: `llm-requirement-fulfillment` requires an evaluation model to be configured in the `evaluation` section.

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
| `base-evaluation-module.ts` | Base evaluation prompt module |
| `evaluators/index.ts` | Built-in evaluator registry |

## Examples

See `examples/experiment.yaml` for a complete configuration template with:
- Model definitions (MLX, Vertex AI, Google GenAI)
- Driver configurations with credential paths
- Evaluation settings
- Empty sections for modules, test cases, and evaluators (ready for your content)

## API

### Programmatic Usage

```typescript
import {
  loadExperimentConfig,
  loadModules,
  loadEvaluators,
  ExperimentRunner,
  DriverManager,
} from '@modular-prompt/experiment';

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
Usage: modular-experiment <config> [options]

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
