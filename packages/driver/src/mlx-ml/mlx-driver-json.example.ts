/**
 * Example implementation of MlxDriver with structuredOutputs support
 * This shows how to integrate JSON extraction for MLX models
 */

import type { CompiledPrompt, QueryOptions, QueryResult } from '../types.js';
import { extractJSON } from '@moduler-prompt/utils';
import type { StreamResult } from '../types.js';
import { MlxDriver } from './mlx-driver.js';

/**
 * Example of MlxDriver with JSON extraction
 */
export class MlxDriverWithJSON extends MlxDriver {
  /**
   * Override query to add structuredOutputs support
   */
  async query(prompt: CompiledPrompt, options?: QueryOptions): Promise<QueryResult> {
    // Call parent implementation
    const baseResult = await super.query(prompt, options);

    // Create result with base content
    const result: QueryResult = {
      content: baseResult.content,
      usage: baseResult.usage,
      finishReason: baseResult.finishReason
    };

    // Only extract if schema is specified
    if (prompt.metadata?.outputSchema) {
      // Extract all JSON from response
      const extraction = extractJSON(result.content, {
        repair: true,
        multiple: true  // Always extract multiple
      });

      if (extraction.source !== 'none') {
        // Ensure data is always an array
        const data = extraction.data;
        result.structuredOutputs = Array.isArray(data) ? data : [data];
      } else {
        // Schema specified but extraction failed
        result.structuredOutputs = [];
      }
    }
    // If no schema specified, structuredOutputs remains undefined

    return result;
  }

  /**
   * Override streaming to collect and extract at the end
   */
  async streamQuery(
    prompt: CompiledPrompt,
    options?: QueryOptions
  ): Promise<StreamResult> {
    const parentResult = await super.streamQuery(prompt, options);
    const chunks: string[] = [];

    // Create new stream that collects chunks
    async function* newStream(): AsyncIterable<string> {
      for await (const chunk of parentResult.stream) {
        chunks.push(chunk);
        yield chunk;
      }
    }

    // Wrap the result to add structured outputs
    const wrappedResult = parentResult.result.then(result => {
      // After streaming, try extraction if schema is specified
      if (prompt.metadata?.outputSchema) {
        const fullResponse = chunks.join('');
        const extraction = extractJSON(fullResponse, {
          repair: true,
          multiple: true
        });

        if (extraction.source !== 'none') {
          console.log(`\n[JSON extracted: ${
            Array.isArray(extraction.data)
              ? `${extraction.data.length} object(s)`
              : '1 object'
          }]`);
        } else {
          console.log('\n[Warning: No valid JSON found in response]');
        }
      }
      return result;
    });

    return {
      stream: newStream(),
      result: wrappedResult
    };
  }
}

/**
 * Usage example
 */
async function example() {
  const driver = new MlxDriverWithJSON({
    model: 'mlx-community/gemma-2b-it'
  });

  // Create a prompt with JSONElement
  const prompt: CompiledPrompt = {
    instructions: [],
    data: [],
    output: [
      {
        type: 'section',
        category: 'output',
        title: 'Output Schema',
        content: '',
        items: [
          'Please provide your response as JSON:',
          '```json',
          JSON.stringify({
            type: 'object',
            properties: {
              summary: { type: 'string' },
              keywords: {
                type: 'array',
                items: { type: 'string' }
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1
              }
            },
            required: ['summary', 'keywords']
          }, null, 2),
          '```'
        ]
      }
    ],
    metadata: {
      outputSchema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          keywords: {
            type: 'array',
            items: { type: 'string' }
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1
          }
        },
        required: ['summary', 'keywords']
      }
    }
  };

  const result = await driver.query(prompt);

  // Access raw text
  console.log('Raw response:', result.content);

  // Access structured data
  if (result.structuredOutputs) {
    if (result.structuredOutputs.length > 0) {
      console.log('Extracted JSON:', result.structuredOutputs[0]);
    } else {
      console.log('No JSON extracted despite schema being specified');
    }
  } else {
    console.log('No schema was specified');
  }
}