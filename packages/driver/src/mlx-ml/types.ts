/**
 * MLX ML specific types
 */

/**
 * MLX message format
 */
export interface MlxMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * MLX model options
 */
export interface MlxMlModelOptions {
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  repetition_penalty?: number;
  repetition_context_size?: number;
}

/**
 * MLX capabilities response
 */
export interface MlxCapabilities {
  version: string;
  models: string[];
  features: string[];
}

/**
 * MLX format test result
 */
export interface MlxFormatTestResult {
  success: boolean;
  formattedText?: string;
  error?: string;
}