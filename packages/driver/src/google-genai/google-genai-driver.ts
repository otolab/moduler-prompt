import { GoogleGenAI } from '@google/genai';
import type { Part, Content } from '@google/genai';
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
    this.defaultModel = config.model || 'gemma-3-27b';
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultOptions = config.defaultOptions || {};
  }

  /**
   * Convert content (string or Attachment[]) to string
   */
  private contentToString(content: string | unknown[]): string {
    if (typeof content === 'string') {
      return content;
    }
    // For Attachment[], extract text content
    // TODO: In the future, handle image_url and file attachments for multimodal support
    return content
      .filter((att: unknown) => {
        const a = att as { type?: string; text?: string };
        return a.type === 'text' && a.text;
      })
      .map((att: unknown) => (att as { text: string }).text)
      .join('\n');
  }

  /**
   * Convert Element to Part (flat text conversion)
   * Used for systemInstruction and simple data
   */
  private elementToPart(element: Element | string): Part {
    if (typeof element === 'string') {
      return { text: element };
    }

    switch (element.type) {
      case 'text':
        return { text: element.content };

      case 'message': {
        // Flatten message as text
        const messageContent = this.contentToString(element.content);
        return { text: `${element.role}: ${messageContent}` };
      }

      case 'material': {
        const materialContent = this.contentToString(element.content);
        return { text: `# ${element.title}\n${materialContent}` };
      }

      case 'chunk': {
        const chunkContent = this.contentToString(element.content);
        const chunkHeader = element.index !== undefined && element.total !== undefined
          ? `[Chunk ${element.index + 1}/${element.total} of ${element.partOf}]`
          : `[Chunk of ${element.partOf}]`;
        return { text: `${chunkHeader}\n${chunkContent}` };
      }

      case 'section':
      case 'subsection': {
        // Section/SubSection elements should be compiled before reaching here
        // If they do reach here, flatten their items recursively
        const flattenItems = (items: unknown[]): string => {
          return items.map(item => {
            if (typeof item === 'string') return item;
            if (typeof item === 'function') return ''; // DynamicContent should be resolved before this point
            return this.elementToPart(item as Element).text || '';
          }).filter(Boolean).join('\n');
        };
        return { text: flattenItems(element.items) };
      }

      case 'json':
        return { text: typeof element.content === 'string' ? element.content : JSON.stringify(element.content, null, 2) };

      default:
        return { text: JSON.stringify(element) };
    }
  }

  /**
   * Convert Element to Content (structure-preserving conversion)
   * Used for conversation history where role matters
   */
  private elementToContent(element: Element | string): Content {
    if (typeof element === 'string') {
      return { parts: [{ text: element }] };
    }

    if (element.type === 'message') {
      // Role conversion:
      // - assistant → model
      // - system → user (Gemini API doesn't support system role in contents)
      // - user → user
      const role = element.role === 'assistant' ? 'model' : 'user';
      const messageContent = this.contentToString(element.content);
      return {
        role,
        parts: [{ text: messageContent }]
      };
    }

    // Non-message elements: convert to Part and wrap in Content without role
    return {
      parts: [this.elementToPart(element)]
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
      // Instructions → systemInstruction (Part[])
      const systemInstructionParts = prompt.instructions?.map(el => this.elementToPart(el));

      // Data + Output → contents (Content[])
      const allDataElements = [...(prompt.data || []), ...(prompt.output || [])];
      const contents = allDataElements.length > 0
        ? allDataElements.map(el => this.elementToContent(el))
        : [{ parts: [{ text: 'Please process according to the instructions.' }] }];

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
      if (systemInstructionParts && systemInstructionParts.length > 0) {
        config.systemInstruction = systemInstructionParts;
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
    // Instructions → systemInstruction (Part[])
    const systemInstructionParts = prompt.instructions?.map(el => this.elementToPart(el));

    // Data + Output → contents (Content[])
    const allDataElements = [...(prompt.data || []), ...(prompt.output || [])];
    const contents = allDataElements.length > 0
      ? allDataElements.map(el => this.elementToContent(el))
      : [{ parts: [{ text: 'Please process according to the instructions.' }] }];

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
    if (systemInstructionParts && systemInstructionParts.length > 0) {
      config.systemInstruction = systemInstructionParts;
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
