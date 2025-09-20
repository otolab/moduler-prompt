/**
 * Example of how to use JSON extraction utility in drivers
 * This file demonstrates the integration pattern for driver implementations
 */

import type { CompiledPrompt, QueryOptions, QueryResult } from '../types.js';
import { extractJSON, type ExtractJSONResult } from '@moduler-prompt/utils';
import { BaseDriver } from './base-driver.js';

/**
 * Example driver implementation using JSON extraction
 */
export class ExampleDriverWithJSON extends BaseDriver {
  /**
   * Query with JSON extraction support
   */
  async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult> {
    // Format and send the prompt to the AI model
    const textPrompt = this.formatPrompt(prompt);

    // Get the raw response from the model (implementation specific)
    const rawResponse = await this.sendToModel(textPrompt, options);

    // Check if we need to extract JSON based on metadata
    if (prompt.metadata?.outputSchema) {
      return this.processJSONResponse(rawResponse, prompt.metadata.outputSchema);
    }

    // Return plain text response
    return {
      content: rawResponse,
      finishReason: 'stop'
    };
  }

  /**
   * Process response with JSON extraction
   */
  private processJSONResponse(
    rawResponse: string,
    schema?: object
  ): QueryResult {
    // Extract JSON from the response
    const extractionResult: ExtractJSONResult = extractJSON(rawResponse, {
      repair: true,  // Enable JSON repair for malformed responses
      multiple: false  // Get single JSON object/array
    });

    // Check if extraction was successful
    if (extractionResult.source === 'none') {
      // Log warning but return original response
      console.warn(
        'Failed to extract JSON from response:',
        extractionResult.error
      );

      return {
        content: rawResponse,
        finishReason: 'stop'
      };
    }

    // Log extraction details for debugging
    if (extractionResult.repaired) {
      console.debug('JSON was repaired during extraction');
    }
    console.debug(`JSON extracted from: ${extractionResult.source}`);

    // Optionally validate against schema (future enhancement)
    if (schema) {
      // TODO: Add schema validation using ajv or similar
      // const isValid = validateSchema(extractionResult.data, schema);
      // if (!isValid) {
      //   console.warn('Extracted JSON does not match schema');
      // }
    }

    // Return the extracted and formatted JSON
    return {
      content: JSON.stringify(extractionResult.data, null, 2),
      finishReason: 'stop'
    };
  }

  /**
   * Streaming query with JSON extraction
   */
  async *streamQuery(
    prompt: CompiledPrompt,
    options?: QueryOptions
  ): AsyncIterable<string> {
    // Collect the full response for JSON extraction
    if (prompt.metadata?.outputSchema) {
      const chunks: string[] = [];

      // Stream and collect chunks
      for await (const chunk of this.streamFromModel(prompt, options)) {
        chunks.push(chunk);
        yield chunk;  // Still yield for real-time display
      }

      // After streaming completes, attempt JSON extraction
      const fullResponse = chunks.join('');
      const extractionResult = extractJSON(fullResponse, { repair: true });

      if (extractionResult.source !== 'none') {
        // Log successful extraction
        console.debug(
          `\nJSON successfully extracted from streamed response (source: ${extractionResult.source})`
        );
      }
    } else {
      // Regular streaming without JSON extraction
      yield* this.streamFromModel(prompt, options);
    }
  }

  // Abstract methods to be implemented by specific drivers
  private async sendToModel(prompt: string, options?: QueryOptions): Promise<string> {
    throw new Error('Not implemented - example only');
  }

  private async *streamFromModel(
    prompt: CompiledPrompt,
    options?: QueryOptions
  ): AsyncIterable<string> {
    throw new Error('Not implemented - example only');
  }
}

/**
 * MLX Driver specific example
 */
export class MlxDriverExample extends BaseDriver {
  async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult> {
    // Add JSON instruction to the prompt if schema is present
    let messages = this.formatPromptAsMessages(prompt);

    if (prompt.metadata?.outputSchema) {
      // Add system message instructing JSON output
      messages.push({
        role: 'system',
        content: [
          'Please format your response as valid JSON.',
          'Wrap the JSON in ```json code blocks.',
          'The JSON should conform to this schema:',
          '```json',
          JSON.stringify(prompt.metadata.outputSchema, null, 2),
          '```'
        ].join('\n')
      });
    }

    // Get response from MLX model
    const response = await this.mlxQuery(messages, options);

    // Extract JSON if schema was provided
    if (prompt.metadata?.outputSchema) {
      const result = extractJSON(response, {
        repair: true,  // MLX responses often need repair
        multiple: false
      });

      if (result.source !== 'none') {
        // Successfully extracted
        return {
          content: JSON.stringify(result.data, null, 2),
          finishReason: 'stop'
        };
      } else {
        // Extraction failed, return raw response with warning
        console.warn('Failed to extract JSON from MLX response:', result.error);
        return {
          content: response,
          finishReason: 'stop'
        };
      }
    }

    return {
      content: response,
      finishReason: 'stop'
    };
  }

  private async mlxQuery(messages: any[], options?: QueryOptions): Promise<string> {
    // Actual MLX implementation would go here
    throw new Error('Not implemented - example only');
  }
}