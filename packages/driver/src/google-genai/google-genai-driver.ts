import { GoogleGenAI } from '@google/genai';
import type { CompiledPrompt, Element } from '@moduler-prompt/core';
import type { AIDriver, QueryOptions, QueryResult, StreamResult } from '../types.js';

/**
 * GoogleGenAI driver configuration
 */
export interface GoogleGenAIDriverConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  defaultOptions?: Partial<GoogleGenAIQueryOptions>;
}

/**
 * GoogleGenAI-specific query options
 */
export interface GoogleGenAIQueryOptions extends QueryOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  candidateCount?: number;
  stopSequences?: string[];
  thinkingConfig?: {
    thinkingLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  };
}

/**
 * Map finish reasons from GoogleGenAI to our format
 */
const finishReasonMap: Record<string, QueryResult['finishReason']> = {
  'FINISH_REASON_UNSPECIFIED': 'error',
  'STOP': 'stop',
  'MAX_TOKENS': 'length',
  'SAFETY': 'stop',
  'RECITATION': 'stop',
  'LANGUAGE': 'error',
  'OTHER': 'error',
  'BLOCKLIST': 'error',
  'PROHIBITED_CONTENT': 'error',
  'MALFORMED_FUNCTION_CALL': 'error',
  'error': 'error'
};

/**
 * GoogleGenAI driver
 */
export class GoogleGenAIDriver implements AIDriver {
  private client: GoogleGenAI;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultOptions: Partial<GoogleGenAIQueryOptions>;

  constructor(config: GoogleGenAIDriverConfig = {}) {
    const apiKey = config.apiKey || process.env.GOOGLE_GENAI_API_KEY;

    if (!apiKey) {
      throw new Error('GoogleGenAI API key is required. Set it in config or GOOGLE_GENAI_API_KEY environment variable.');
    }

    this.client = new GoogleGenAI({ apiKey });
    this.defaultModel = config.model || 'gemini-2.0-flash-exp';
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultOptions = config.defaultOptions || {};
  }

  /**
   * Convert CompiledPrompt to GoogleGenAI's format
   */
  private compiledPromptToGoogleGenAI(prompt: CompiledPrompt): {
    contents: string;
    systemInstruction?: string;
  } {
    // Convert Element[] to string
    const formatElements = (elements: Element[]): string => {
      return elements.map(el => {
        if (typeof el === 'string') return el;
        if ('content' in el) return el.content;
        return JSON.stringify(el);
      }).join('\n');
    };

    // Format instructions as system instruction
    const systemInstruction = prompt.instructions && prompt.instructions.length > 0
      ? formatElements(prompt.instructions)
      : undefined;

    // Combine data and output as contents
    const contentParts: string[] = [];

    if (prompt.data && prompt.data.length > 0) {
      contentParts.push(formatElements(prompt.data));
    }

    if (prompt.output && prompt.output.length > 0) {
      contentParts.push(formatElements(prompt.output));
    }

    const contents = contentParts.length > 0
      ? contentParts.join('\n\n')
      : 'Please process according to the instructions.';

    return {
      contents,
      systemInstruction
    };
  }

  /**
   * Convert JSON Schema to GoogleGenAI Schema format
   */
  private convertJsonSchema(schema: unknown): unknown {
    if (!schema || typeof schema !== 'object') return undefined;

    // GoogleGenAI uses a specific schema format
    // For now, we'll pass it through and let the API handle it
    return schema;
  }

  /**
   * Query implementation
   */
  async query(
    prompt: CompiledPrompt,
    options: GoogleGenAIQueryOptions = {}
  ): Promise<QueryResult> {
    try {
      // Merge options with defaults
      const mergedOptions = { ...this.defaultOptions, ...options };

      // Convert prompt to GoogleGenAI format
      const { contents, systemInstruction } = this.compiledPromptToGoogleGenAI(prompt);

      // Create generation config
      const config: Record<string, unknown> = {
        temperature: mergedOptions.temperature ?? this.defaultTemperature,
        maxOutputTokens: mergedOptions.maxTokens,
        topP: mergedOptions.topP,
        topK: mergedOptions.topK,
        candidateCount: mergedOptions.candidateCount,
        stopSequences: mergedOptions.stopSequences,
        thinkingConfig: mergedOptions.thinkingConfig,
      };

      // Add system instruction if present
      if (systemInstruction) {
        config.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      // Handle structured outputs
      if (prompt.metadata?.outputSchema) {
        config.responseMimeType = 'application/json';
        config.responseSchema = this.convertJsonSchema(prompt.metadata.outputSchema);
      }

      // Remove undefined values
      Object.keys(config).forEach(key => {
        if (config[key] === undefined) {
          delete config[key];
        }
      });

      // Get model name
      const model = mergedOptions.model || this.defaultModel;

      // Generate content
      const response = await this.client.models.generateContent({
        model,
        contents,
        config
      });

      // Extract text content using convenience property
      const content = response.text || '';

      // Extract candidate for finish reason
      const candidate = response.candidates?.[0];

      // Map finish reason
      const finishReason = finishReasonMap[candidate?.finishReason || 'error'] || 'error';

      // Handle structured outputs
      let structuredOutput: unknown | undefined;
      if (prompt.metadata?.outputSchema && content) {
        try {
          structuredOutput = JSON.parse(content);
        } catch {
          // Keep as text if not valid JSON
        }
      }

      return {
        content,
        finishReason,
        structuredOutput,
        usage: response.usageMetadata ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          completionTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0
        } : undefined
      };
    } catch (error) {
      console.error('[GoogleGenAIDriver] Query error:', error);
      if (error instanceof Error) {
        console.error('[GoogleGenAIDriver] Error message:', error.message);
        console.error('[GoogleGenAIDriver] Error stack:', error.stack);
      }
      return {
        content: '',
        finishReason: 'error'
      };
    }
  }

  /**
   * Stream query implementation
   */
  async streamQuery(
    prompt: CompiledPrompt,
    options?: GoogleGenAIQueryOptions
  ): Promise<StreamResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    // Convert prompt to GoogleGenAI format
    const { contents, systemInstruction } = this.compiledPromptToGoogleGenAI(prompt);

    // Create generation config
    const config: Record<string, unknown> = {
      temperature: mergedOptions.temperature ?? this.defaultTemperature,
      maxOutputTokens: mergedOptions.maxTokens,
      topP: mergedOptions.topP,
      topK: mergedOptions.topK,
      candidateCount: mergedOptions.candidateCount,
      stopSequences: mergedOptions.stopSequences,
      thinkingConfig: mergedOptions.thinkingConfig,
    };

    // Add system instruction if present
    if (systemInstruction) {
      config.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    // Handle structured outputs
    if (prompt.metadata?.outputSchema) {
      config.responseMimeType = 'application/json';
      config.responseSchema = this.convertJsonSchema(prompt.metadata.outputSchema);
    }

    // Remove undefined values
    Object.keys(config).forEach(key => {
      if (config[key] === undefined) {
        delete config[key];
      }
    });

    // Get model name
    const model = mergedOptions.model || this.defaultModel;

    // Generate content stream
    const streamResponse = await this.client.models.generateContentStream({
      model,
      contents,
      config
    });

    // Shared state for accumulating content and metadata
    let fullContent = '';
    let usage: QueryResult['usage'] | undefined;
    let finishReason: QueryResult['finishReason'] = 'stop';
    let streamConsumed = false;
    const chunks: string[] = [];

    // Process the stream and cache chunks
    const processStream = async () => {
      try {
        for await (const chunk of streamResponse) {
          const text = chunk.text;
          if (text) {
            fullContent += text;
            chunks.push(text);
          }

          // Update finish reason if provided
          if (chunk.candidates?.[0]?.finishReason) {
            const reason = chunk.candidates[0].finishReason;
            finishReason = finishReasonMap[reason] || 'error';
          }

          // Accumulate usage if provided
          if (chunk.usageMetadata) {
            usage = {
              promptTokens: chunk.usageMetadata.promptTokenCount || 0,
              completionTokens: chunk.usageMetadata.candidatesTokenCount || 0,
              totalTokens: chunk.usageMetadata.totalTokenCount || 0
            };
          }
        }
      } catch {
        finishReason = 'error';
      }
      streamConsumed = true;
    };

    // Start processing the stream
    const processingPromise = processStream();

    // Create the stream generator that yields cached chunks
    const streamGenerator = async function* () {
      let index = 0;
      while (!streamConsumed || index < chunks.length) {
        if (index < chunks.length) {
          yield chunks[index++];
        } else {
          // Wait a bit for more chunks
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    };

    // Create result promise
    const resultPromise = (async () => {
      await processingPromise;

      // Handle structured outputs
      let structuredOutput: unknown | undefined;
      if (prompt.metadata?.outputSchema && fullContent) {
        try {
          structuredOutput = JSON.parse(fullContent);
        } catch {
          // Keep as undefined if parsing fails
        }
      }

      return {
        content: fullContent,
        structuredOutput,
        usage,
        finishReason
      };
    })();

    return {
      stream: streamGenerator(),
      result: resultPromise
    };
  }

  /**
   * Close the client
   */
  async close(): Promise<void> {
    // GoogleGenAI client doesn't need explicit closing
  }
}
