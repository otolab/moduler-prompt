import type { PromptModule, CompiledPrompt } from '@moduler-prompt/core';

/**
 * AI Driver interface for executing prompts
 */
export interface AIDriver {
  query(prompt: CompiledPrompt): Promise<string>;
  queryStream?(prompt: CompiledPrompt): AsyncGenerator<string>;
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