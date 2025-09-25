// Types
export type {
  AIDriver,
  ChatMessage,
  QueryResult,
  QueryOptions,
  DriverConfig,
  Role
} from './types.js';

// Test driver
export {
  TestDriver,
  type TestDriverOptions,
  type ResponseProvider
} from './test-driver.js';

// Echo driver
export {
  EchoDriver,
  type EchoDriverConfig
} from './echo-driver.js';

// OpenAI driver
export {
  OpenAIDriver,
  type OpenAIDriverConfig,
  type OpenAIQueryOptions
} from './openai/openai-driver.js';

// Ollama driver
export {
  OllamaDriver,
  type OllamaDriverConfig
} from './ollama/ollama-driver.js';

// Anthropic driver
export {
  AnthropicDriver,
  type AnthropicDriverConfig,
  type AnthropicQueryOptions
} from './anthropic/anthropic-driver.js';

// MLX ML driver
export {
  MlxDriver,
  type MlxDriverConfig
} from './mlx-ml/mlx-driver.js';

// VertexAI driver
export {
  VertexAIDriver,
  type VertexAIDriverConfig,
  type VertexAIQueryOptions
} from './vertexai/vertexai-driver.js';

// Formatter exports (moved from utils to avoid circular dependency)
export type {
  FormatterOptions,
  ElementFormatter,
  ChatMessage as FormatterChatMessage
} from './formatter/types.js';

export {
  DefaultFormatter
} from './formatter/formatter.js';

export {
  formatPrompt,
  formatPromptAsMessages,
  defaultFormatterTexts
} from './formatter/converter.js';

// Driver Registry and AI Service exports
export {
  AIService,
  DriverRegistry,
  registerFactories,
  type SelectionOptions,
  type ApplicationConfig
} from './driver-registry/index.js';

export type {
  DriverProvider,
  DriverCapability,
  ModelSpec,
  DriverFactory
} from './driver-registry/index.js';