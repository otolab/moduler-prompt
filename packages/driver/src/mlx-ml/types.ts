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
 * MLX model options (キャメルケース形式)
 * Python側へはmapOptionsToPythonで変換される
 */
export interface MlxMlModelOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  repetitionPenalty?: number;
  repetitionContextSize?: number;
  // Allow string indexing for dynamic parameter access
  [key: string]: number | undefined;
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