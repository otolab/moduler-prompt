import type { PromptModule, CompiledPrompt, Element } from '@moduler-prompt/core';
import type { AIDriver as DriverInterface } from '@moduler-prompt/driver';

/**
 * AI Driver interface for executing prompts
 * Extends the driver interface to support CompiledPrompt
 */
export interface AIDriver extends DriverInterface {
  query(prompt: string | Element[] | CompiledPrompt): Promise<string>;
}

/**
 * Result of workflow execution
 */
export interface WorkflowResult<TContext> {
  output: string;
  context: TContext;  // 継続可能なコンテキスト
  metadata?: {
    iterations?: number;
    tokensUsed?: number;
    [key: string]: any;
  };
}

/**
 * Error with recoverable context
 */
export interface WorkflowError<TContext> extends Error {
  context: TContext;  // エラー時点のコンテキスト（再開可能）
  partial?: string;   // 部分的な出力
  phase?: string;     // エラーが発生したフェーズ
  iteration?: number; // エラーが発生したイテレーション
}

/**
 * Workflow error implementation with context preservation
 */
export class WorkflowExecutionError<TContext = any> extends Error implements WorkflowError<TContext> {
  public context: TContext;
  public partial?: string;
  public phase?: string;
  public iteration?: number;
  
  constructor(
    originalError: Error | string,
    context: TContext,
    options?: {
      partial?: string;
      phase?: string;
      iteration?: number;
    }
  ) {
    const message = typeof originalError === 'string' 
      ? originalError 
      : originalError.message;
    
    super(message);
    this.name = 'WorkflowExecutionError';
    this.context = context;
    this.partial = options?.partial;
    this.phase = options?.phase;
    this.iteration = options?.iteration;
    
    // Preserve original stack trace if available
    if (originalError instanceof Error && originalError.stack) {
      this.stack = originalError.stack;
    }
  }
}

/**
 * Base workflow interface
 */
export interface Workflow<TContext, TOptions = Record<string, any>> {
  /**
   * Execute workflow with given context
   * @param driver AI driver for execution
   * @param context Initial context (defined by PromptModule)
   * @param options Additional options
   */
  execute(
    driver: AIDriver,
    context: TContext,
    options?: TOptions
  ): Promise<WorkflowResult<TContext>>;

  /**
   * Stream execution (optional)
   */
  executeStream?(
    driver: AIDriver,
    context: TContext,
    options?: TOptions
  ): AsyncGenerator<Partial<WorkflowResult<TContext>>>;
}

/**
 * Workflow that uses a PromptModule
 */
export abstract class ModuleWorkflow<TContext, TOptions = Record<string, any>> 
  implements Workflow<TContext, TOptions> {
  
  constructor(
    protected module: PromptModule<TContext>
  ) {}

  abstract execute(
    driver: AIDriver,
    context: TContext,
    options?: TOptions
  ): Promise<WorkflowResult<TContext>>;
}