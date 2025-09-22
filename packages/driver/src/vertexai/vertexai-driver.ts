import {
  VertexAI,
  GenerationConfig,
  HarmCategory,
  HarmBlockThreshold,
  FinishReason,
  GenerateContentRequest,
  ResponseSchema,
  SchemaType
} from '@google-cloud/vertexai';
import type { CompiledPrompt, Element } from '@moduler-prompt/core';
import type { AIDriver, QueryOptions, QueryResult, StreamResult } from '../types.js';

/**
 * VertexAI driver configuration
 */
export interface VertexAIDriverConfig {
  project?: string;
  location?: string;
  model?: string;
  temperature?: number;
  defaultOptions?: Partial<VertexAIQueryOptions>;
}

/**
 * VertexAI-specific query options
 */
export interface VertexAIQueryOptions extends QueryOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  responseFormat?: 'json' | 'text';
  jsonSchema?: unknown;
}

/**
 * Map finish reasons from VertexAI to our format
 */
const finishReasonMap: Record<FinishReason | 'error', QueryResult['finishReason']> = {
  FINISH_REASON_UNSPECIFIED: 'error',
  STOP: 'stop',
  MAX_TOKENS: 'length',
  SAFETY: 'stop',
  RECITATION: 'stop',
  OTHER: 'error',
  BLOCKLIST: 'error',
  PROHIBITED_CONTENT: 'error',
  SPII: 'error',
  error: 'error'
};

/**
 * VertexAI (Google Gemini) driver
 */
export class VertexAIDriver implements AIDriver {
  private vertexAI: VertexAI;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultOptions: Partial<VertexAIQueryOptions>;
  
  constructor(config: VertexAIDriverConfig = {}) {
    const project = config.project || process.env.GOOGLE_CLOUD_PROJECT || process.env.ANTHROPIC_VERTEX_PROJECT_ID;
    const location = config.location || process.env.GOOGLE_CLOUD_REGION || process.env.CLOUD_ML_REGION || 'us-central1';

    if (!project) {
      throw new Error('VertexAI project ID is required. Set it in config or GOOGLE_CLOUD_PROJECT environment variable.');
    }

    this.vertexAI = new VertexAI({ project, location });
    this.defaultModel = config.model || 'gemini-2.0-flash-001';
    this.defaultTemperature = config.temperature ?? 0.05;
    this.defaultOptions = config.defaultOptions || {};
  }
  
  /**
   * Convert CompiledPrompt to VertexAI's format
   */
  private compiledPromptToVertexAI(prompt: CompiledPrompt): GenerateContentRequest {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // Convert Element[] to string using formatter
    const formatElements = (elements: Element[]): string => {
      return elements.map(el => {
        if (typeof el === 'string') return el;
        if ('content' in el) return el.content;
        return JSON.stringify(el);
      }).join('\n');
    };

    // Add instructions as system message
    if (prompt.instructions && prompt.instructions.length > 0) {
      messages.push({ role: 'system', content: formatElements(prompt.instructions) });
    }

    // Add data as user message if present
    if (prompt.data && prompt.data.length > 0) {
      messages.push({ role: 'user', content: formatElements(prompt.data) });
    }

    // Add output format as user message if present
    if (prompt.output && prompt.output.length > 0) {
      messages.push({ role: 'user', content: formatElements(prompt.output) });
    }

    // If no user messages, add a default one
    if (!prompt.data && !prompt.output) {
      messages.push({ role: 'user', content: 'Please process according to the instructions.' });
    }

    return this.convertMessages(messages);
  }

  /**
   * Convert messages to VertexAI's format
   */
  private convertMessages(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): GenerateContentRequest {
    // Separate system messages from conversation
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversation = messages.filter(m => m.role !== 'system');
    
    // Merge all system messages into one
    const systemInstruction = systemMessages.length > 0
      ? systemMessages.map(m => m.content).join('\n\n')
      : undefined;
    
    // Convert conversation messages
    const contents = conversation.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));
    
    // Ensure we have at least one user message
    if (contents.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: 'Please process according to the instructions.' }]
      });
    }
    
    // Ensure conversation starts with user
    if (contents.length > 0 && contents[0].role !== 'user') {
      contents.unshift({
        role: 'user',
        parts: [{ text: 'Continue.' }]
      });
    }
    
    // Ensure conversation alternates between user and model
    const processedContents = [];
    let lastRole = '';
    for (const content of contents) {
      if (content.role === lastRole) {
        // Same role twice, insert opposite role
        processedContents.push({
          role: lastRole === 'user' ? 'model' : 'user',
          parts: [{ text: lastRole === 'user' ? 'Continue.' : 'Please continue.' }]
        });
      }
      processedContents.push(content);
      lastRole = content.role;
    }
    
    // Ensure conversation ends with user
    if (processedContents.length > 0 && processedContents[processedContents.length - 1].role === 'model') {
      processedContents.push({
        role: 'user',
        parts: [{ text: 'Please continue.' }]
      });
    }
    
    return {
      contents: processedContents,
      systemInstruction
    };
  }
  
  /**
   * Convert JSON Schema to VertexAI ResponseSchema
   */
  private convertJsonSchema(schema: unknown): ResponseSchema | undefined {
    if (!schema) return undefined;
    
    const typeMap: Record<string, SchemaType> = {
      string: SchemaType.STRING,
      number: SchemaType.NUMBER,
      integer: SchemaType.INTEGER,
      boolean: SchemaType.BOOLEAN,
      array: SchemaType.ARRAY,
      object: SchemaType.OBJECT
    };
    
    const convertSchema = (s: Record<string, unknown>): ResponseSchema => {
      const result: Record<string, unknown> = { ...s };
      
      if (s.type && typeof s.type === 'string') {
        result.type = typeMap[s.type] || SchemaType.STRING;
      }
      
      if (s.properties) {
        result.properties = Object.fromEntries(
          Object.entries(s.properties)
            .map(([k, v]) => [k, convertSchema(v as Record<string, unknown>)])
        );
      }
      
      if (s.items) {
        result.items = convertSchema(s.items as Record<string, unknown>);
      }
      
      return result as ResponseSchema;
    };
    
    return convertSchema(schema as Record<string, unknown>);
  }
  
  /**
   * Create a generative model client
   */
  private createClient(model: string, config: GenerationConfig) {
    const options = {
      model,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        }
      ],
      generationConfig: config
    };
    
    // Use preview API for preview models
    if (model.includes('-preview-')) {
      return this.vertexAI.preview.getGenerativeModel(options);
    } else {
      return this.vertexAI.getGenerativeModel(options);
    }
  }
  
  /**
   * Query implementation
   */
  async query(
    prompt: CompiledPrompt,
    options: VertexAIQueryOptions = {}
  ): Promise<QueryResult> {
    try {
      // Merge options with defaults
      const mergedOptions = { ...this.defaultOptions, ...options };

      // Convert prompt to VertexAI format
      const request = this.compiledPromptToVertexAI(prompt);
      
      // Create generation config
      const generationConfig: GenerationConfig = {
        maxOutputTokens: mergedOptions.maxTokens || 1000,
        temperature: mergedOptions.temperature ?? this.defaultTemperature,
        topP: mergedOptions.topP,
        topK: mergedOptions.topK,
        responseMimeType: prompt.metadata?.outputSchema ? 'application/json' : 'text/plain',
        responseSchema: this.convertJsonSchema(prompt.metadata?.outputSchema)
      };
      
      // Remove undefined values
      Object.keys(generationConfig).forEach(key => {
        if (generationConfig[key as keyof GenerationConfig] === undefined) {
          delete generationConfig[key as keyof GenerationConfig];
        }
      });
      
      // Create client and generate
      const model = mergedOptions.model || this.defaultModel;
      const client = this.createClient(model, generationConfig);
      const result = await client.generateContent(request);
      
      // Extract response
      const response = result.response;
      const candidate = response.candidates?.[0];
      
      if (!candidate || !candidate.content) {
        return {
          content: '',
          finishReason: 'error'
        };
      }
      
      // Extract text content
      const content = candidate.content.parts
        .map(part => part.text || '')
        .join('');
      
      // Map finish reason
      const finishReason = finishReasonMap[candidate.finishReason || 'error'];

      // Handle structured outputs
      let structuredOutputs: unknown[] | undefined;
      if (prompt.metadata?.outputSchema && content) {
        try {
          structuredOutputs = [JSON.parse(content)];
        } catch {
          // Keep as text if not valid JSON
        }
      }

      return {
        content,
        finishReason,
        structuredOutputs,
        usage: response.usageMetadata ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          completionTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0
        } : undefined
      };
    } catch {
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
    options?: VertexAIQueryOptions
  ): Promise<StreamResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    // Convert prompt to VertexAI format
    const request = this.compiledPromptToVertexAI(prompt);

    // Create generation config
    const generationConfig: GenerationConfig = {
      maxOutputTokens: mergedOptions.maxTokens || 1000,
      temperature: mergedOptions.temperature ?? this.defaultTemperature,
      responseMimeType: prompt.metadata?.outputSchema ? 'application/json' : 'text/plain',
      responseSchema: this.convertJsonSchema(prompt.metadata?.outputSchema)
    };

    // Remove undefined values
    Object.keys(generationConfig).forEach(key => {
      if (generationConfig[key as keyof GenerationConfig] === undefined) {
        delete generationConfig[key as keyof GenerationConfig];
      }
    });

    // Create client and generate stream
    const model = mergedOptions.model || this.defaultModel;
    const client = this.createClient(model, generationConfig);
    const streamingResult = await client.generateContentStream(request);

    // Create stream generator
    async function* streamGenerator(): AsyncIterable<string> {
      for await (const chunk of streamingResult.stream) {
        if (chunk?.candidates?.[0]?.content?.parts?.[0]?.text) {
          yield chunk.candidates[0].content.parts[0].text;
        }
      }
    }

    // Create result promise
    const resultPromise = (async (): Promise<QueryResult> => {
      // Aggregate the response from streaming
      const response = await streamingResult.response;
      const candidate = response.candidates?.[0];

      if (!candidate || !candidate.content) {
        return {
          content: '',
          finishReason: 'error'
        };
      }

      // Extract text content
      const content = candidate.content.parts
        .map(part => part.text || '')
        .join('');

      // Map finish reason
      const finishReason = finishReasonMap[candidate.finishReason || 'error'];

      // Handle structured outputs
      let structuredOutputs: unknown[] | undefined;
      if (prompt.metadata?.outputSchema && content) {
        try {
          structuredOutputs = [JSON.parse(content)];
        } catch {
          // Keep as text if not valid JSON
        }
      }

      return {
        content,
        finishReason,
        structuredOutputs,
        usage: response.usageMetadata ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          completionTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0
        } : undefined
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
    // VertexAI client doesn't need explicit closing
  }
}