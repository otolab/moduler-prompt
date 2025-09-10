import { describe, it, expect } from 'vitest';
import { compile, createContext } from './index.js';
import type { PromptModule } from './types.js';

describe('inputs section', () => {
  it('should compile inputs section correctly', () => {
    const module: PromptModule<{ userData: string[] }> = {
      createContext: () => ({ userData: [] }),
      objective: ['Process data'],
      inputs: [
        'Static input data',
        (ctx) => ctx.userData ? JSON.stringify(ctx.userData) : null
      ]
    };

    const context = createContext(module);
    context.userData = ['item1', 'item2', 'item3'];

    const compiled = compile(module, context);

    // inputsセクションがdataカテゴリに含まれることを確認
    const inputsSection = compiled.data.find(
      el => el.type === 'section' && el.title === 'Input Data'
    );

    expect(inputsSection).toBeDefined();
    expect(inputsSection?.type).toBe('section');
    expect(inputsSection?.title).toBe('Input Data');
    expect(inputsSection?.items).toContain('Static input data');
    expect(inputsSection?.items).toContain('["item1","item2","item3"]');
  });

  it('should handle null from dynamic content in inputs', () => {
    const module: PromptModule<{ userData?: string[] }> = {
      createContext: () => ({}),
      inputs: [
        (ctx) => ctx.userData ? JSON.stringify(ctx.userData) : null,
        'Always present'
      ]
    };

    const context = createContext(module);
    // userDataを設定しない

    const compiled = compile(module, context);

    const inputsSection = compiled.data.find(
      el => el.type === 'section' && el.title === 'Input Data'
    );

    expect(inputsSection).toBeDefined();
    expect(inputsSection?.items).toHaveLength(1);
    expect(inputsSection?.items).toContain('Always present');
  });

  it('should handle arrays from dynamic content in inputs', () => {
    const module: PromptModule<{ items: string[] }> = {
      createContext: () => ({ items: [] }),
      inputs: [
        (ctx) => ctx.items.map((item, i) => `${i + 1}. ${item}`)
      ]
    };

    const context = createContext(module);
    context.items = ['apple', 'banana', 'orange'];

    const compiled = compile(module, context);

    const inputsSection = compiled.data.find(
      el => el.type === 'section' && el.title === 'Input Data'
    );

    expect(inputsSection).toBeDefined();
    expect(inputsSection?.items).toContain('1. apple');
    expect(inputsSection?.items).toContain('2. banana');
    expect(inputsSection?.items).toContain('3. orange');
  });
});