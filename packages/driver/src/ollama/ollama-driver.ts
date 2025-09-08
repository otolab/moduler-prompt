import { OpenAIDriver, OpenAIDriverConfig } from '../openai/openai-driver.js';

/**
 * Ollama driver configuration
 */
export interface OllamaDriverConfig extends Omit<OpenAIDriverConfig, 'apiKey' | 'organization'> {
  baseURL?: string;
  model?: string;
}

/**
 * Ollama driver (OpenAI-compatible API)
 */
export class OllamaDriver extends OpenAIDriver {
  constructor(config: OllamaDriverConfig = {}) {
    super({
      ...config,
      apiKey: 'ollama', // Ollama doesn't need an API key
      baseURL: config.baseURL || 'http://localhost:11434/v1',
      model: config.model || 'llama3.2'
    });
  }
}