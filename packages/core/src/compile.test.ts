import { describe, it, expect } from 'vitest';
import { compile, createContext } from './compile';
import type { 
  PromptModule, 
  SubSectionElement,
  TextElement,
  MessageElement,
  MaterialElement,
  ChunkElement
} from './types';

describe('compile', () => {
  describe('基本的なコンパイル', () => {
    it('空のモジュールをコンパイルできる', () => {
      const module: PromptModule = {};
      const context = {};
      const result = compile(module, context);
      
      expect(result).toEqual({
        instructions: [],
        data: [],
        output: []
      });
    });

    it('標準セクションがSectionElementに変換される', () => {
      const module: PromptModule = {
        objective: ['AIアシスタントとして動作する'],
        methodology: ['データを分析', '結果を生成']
      };
      const context = {};
      const result = compile(module, context);
      
      expect(result.instructions).toHaveLength(2);
      expect(result.instructions[0]).toEqual({
        type: 'section',
        category: 'instructions',
        title: 'Objective and Role',
        items: ['AIアシスタントとして動作する']
      });
      expect(result.instructions[1]).toEqual({
        type: 'section',
        category: 'instructions',
        title: 'Processing Methodology',
        items: ['データを分析', '結果を生成']
      });
    });

    it('SubSectionElementを含むセクションを処理できる', () => {
      const module: PromptModule = {
        methodology: [
          '入力を検証',
          {
            type: 'subsection',
                title: '変換処理',
            items: ['正規化', '特徴抽出']
          } as SubSectionElement,
          '出力を生成'
        ]
      };
      const context = {};
      const result = compile(module, context);
      
      expect(result.instructions).toHaveLength(1);
      expect(result.instructions[0]).toEqual({
        type: 'section',
        category: 'instructions',
        title: 'Processing Methodology',
        items: [
          '入力を検証',
          '出力を生成',
          {
            type: 'subsection',
                title: '変換処理',
            items: ['正規化', '特徴抽出']
          }
        ]
      });
    });
  });

  describe('DynamicContentの処理', () => {
    it('TextElementを生成するDynamicContent', () => {
      const module: PromptModule<{ value: string }> = {
        state: [
          (context) => ({
            type: 'text',
            content: `Value: ${context.value}`
          } as TextElement)
        ]
      };
      const context = { value: 'test123' };
      const result = compile(module, context);
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        type: 'text',
        content: 'Value: test123'
      });
    });

    it('MessageElementを生成するDynamicContent', () => {
      const module: PromptModule<{ message: string }> = {
        messages: [
          (context) => ({
            type: 'message',
            content: context.message,
            role: 'user'
          } as MessageElement)
        ]
      };
      const context = { message: 'Hello, AI!' };
      const result = compile(module, context);
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        type: 'message',
        role: 'user',
        content: 'Hello, AI!'
      });
    });

    it('MaterialElementを生成するDynamicContent', () => {
      const module: PromptModule<{ doc: { id: string; title: string; content: string } }> = {
        materials: [
          (context) => ({
            type: 'material',
            content: context.doc.content,
            id: context.doc.id,
            title: context.doc.title
          } as MaterialElement)
        ]
      };
      const context = { 
        doc: { 
          id: 'doc1', 
          title: 'API Guide', 
          content: 'API documentation content' 
        } 
      };
      const result = compile(module, context);
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        type: 'material',
        id: 'doc1',
        title: 'API Guide',
        content: 'API documentation content'
      });
    });

    it('ChunkElementを生成するDynamicContent', () => {
      const module: PromptModule<{ chunks: Array<{ content: string; partOf: string }> }> = {
        chunks: [
          (context) => context.chunks.map(chunk => ({
            type: 'chunk',
            content: chunk.content,
            partOf: chunk.partOf
          } as ChunkElement))
        ]
      };
      const context = {
        chunks: [
          { content: 'Part 1 content', partOf: 'document.txt' },
          { content: 'Part 2 content', partOf: 'document.txt' }
        ]
      };
      const result = compile(module, context);
      
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        type: 'chunk',
        partOf: 'document.txt',
        content: 'Part 1 content'
      });
      expect(result.data[1]).toEqual({
        type: 'chunk',
        partOf: 'document.txt',
        content: 'Part 2 content'
      });
    });

    it('nullを返すDynamicContentは無視される', () => {
      const module: PromptModule<{ includeState: boolean }> = {
        state: [
          '固定の状態',
          (context) => context.includeState 
            ? { type: 'text', content: '動的な状態' } as TextElement
            : null
        ]
      };
      
      const result1 = compile(module, { includeState: true });
      expect(result1.data).toHaveLength(2);
      expect(result1.data[0]).toEqual({
        type: 'section',
        category: 'data',
        title: 'Current State',
        items: ['固定の状態']
      });
      expect(result1.data[1]).toEqual({
        type: 'text',
        content: '動的な状態'
      });
      
      const result2 = compile(module, { includeState: false });
      expect(result2.data).toHaveLength(1);
      expect(result2.data[0]).toEqual({
        type: 'section',
        category: 'data',
        title: 'Current State',
        items: ['固定の状態']
      });
    });
  });

  describe('セクションタイプの分類', () => {
    it('Instructions, Data, Outputセクションが正しく分類される', () => {
      const module: PromptModule = {
        // Instructions
        objective: ['目的'],
        instructions: ['指示'],
        
        // Data
        state: ['状態'],
        messages: ['メッセージ'],
        
        // Output
        cue: ['出力'],
        schema: ['スキーマ']
      };
      const context = {};
      const result = compile(module, context);
      
      expect(result.instructions).toHaveLength(2);
      expect(result.instructions.map(e => e.title)).toEqual([
        'Objective and Role',
        'Instructions'
      ]);
      
      expect(result.data).toHaveLength(2);
      expect(result.data.map(e => e.title)).toEqual([
        'Current State',
        'Messages'
      ]);
      
      expect(result.output).toHaveLength(2);
      expect(result.output.map(e => e.title)).toEqual([
        'Output',
        'Output Schema'
      ]);
    });
  });

  describe('複雑なケース', () => {
    it('文字列、SubSectionElement、DynamicContentを混在させる', () => {
      interface Context {
        currentStep: number;
        totalSteps: number;
        details: string[];
      }
      
      const module: PromptModule<Context> = {
        methodology: [
          '処理を開始',
          (context) => ({
            type: 'text',
            content: `ステップ ${context.currentStep}/${context.totalSteps} を実行中`
          } as TextElement),
          {
            type: 'subsection',
                title: '詳細手順',
            items: ['初期化', '検証', '実行']
          } as SubSectionElement,
          (context) => context.details.map(detail => ({
            type: 'text',
            content: detail
          } as TextElement)),
          '処理を完了'
        ]
      };
      
      const context: Context = {
        currentStep: 3,
        totalSteps: 5,
        details: ['詳細1', '詳細2']
      };
      
      const result = compile(module, context);
      
      expect(result.instructions).toHaveLength(4);
      // 最初のSectionElement（文字列とSubSection）
      expect(result.instructions[0]).toEqual({
        type: 'section',
        category: 'instructions',
        title: 'Processing Methodology',
        items: [
          '処理を開始',
          '処理を完了',
          {
            type: 'subsection',
                title: '詳細手順',
            items: ['初期化', '検証', '実行']
          }
        ]
      });
      // TextElement（ステップ情報）
      expect(result.instructions[1]).toEqual({
        type: 'text',
        content: 'ステップ 3/5 を実行中'
      });
      // TextElement（詳細1）
      expect(result.instructions[2]).toEqual({
        type: 'text',
        content: '詳細1'
      });
      // TextElement（詳細2）
      expect(result.instructions[3]).toEqual({
        type: 'text',
        content: '詳細2'
      });
    });
  });

  describe('標準セクションの文字列処理', () => {
    it('標準セクションに文字列を直接設定できる', () => {
      const module: PromptModule = {
        instructions: 'Direct instruction',  // instructions標準セクション
        state: 'Current state',              // dataカテゴリの標準セクション
        cue: 'Output cue'                    // outputカテゴリの標準セクション
      };
      const context = {};
      const result = compile(module, context);
      
      // instructionsセクションを確認
      expect(result.instructions).toHaveLength(1);
      expect(result.instructions[0]).toMatchObject({
        type: 'section',
        category: 'instructions',
        title: 'Instructions',
        items: ['Direct instruction']
      });
      
      // dataセクションを確認
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        type: 'section',
        category: 'data',
        title: 'Current State',
        items: ['Current state']
      });
      
      // outputセクションを確認
      expect(result.output).toHaveLength(1);
      expect(result.output[0]).toMatchObject({
        type: 'section',
        category: 'output',
        title: 'Output',
        items: ['Output cue']
      });
    });

    it('標準セクションにsubsectionを含めることができる', () => {
      const subsection: SubSectionElement = {
        type: 'subsection',
        title: 'Sub Instructions',
        items: ['Sub item']
      };
      
      const module: PromptModule = {
        instructions: [
          'Direct instruction string',
          subsection
        ]
      };
      const context = {};
      const result = compile(module, context);
      
      expect(result.instructions[0]).toMatchObject({
        type: 'section',
        category: 'instructions',
        title: 'Instructions',
        items: [
          'Direct instruction string',
          {
            type: 'subsection',
            title: 'Sub Instructions',
                items: ['Sub item']
          }
        ]
      });
    });

    it('重複する文字列を許容する', () => {
      const module: PromptModule = {
        instructions: [
          'Same instruction',
          'Same instruction'
        ]
      };
      const context = {};
      const result = compile(module, context);
      
      // 重複が許容されることを確認
      expect(result.instructions[0].items).toEqual([
        'Same instruction',
        'Same instruction'
      ]);
    });

    it('重複するsubsectionを許容する', () => {
      const subsection1: SubSectionElement = {
        type: 'subsection',
        title: 'Same Subsection',
        items: ['Item 1']
      };
      
      const subsection2: SubSectionElement = {
        type: 'subsection',
        title: 'Same Subsection',
        items: ['Item 2']
      };
      
      const module: PromptModule = {
        state: [  // dataカテゴリの標準セクション
          subsection1,
          subsection2
        ]
      };
      const context = {};
      const result = compile(module, context);
      
      // 同名のサブセクションが両方存在することを確認
      const subsections = result.data[0].items.filter(
        (item): item is SubSectionElement => 
          typeof item === 'object' && item.type === 'subsection'
      );
      expect(subsections).toHaveLength(2);
      expect(subsections[0].title).toBe('Same Subsection');
      expect(subsections[1].title).toBe('Same Subsection');
      expect(subsections[0].items).toEqual(['Item 1']);
      expect(subsections[1].items).toEqual(['Item 2']);
    });
  });

  describe('意図的な重複の使用例', () => {
    it('セパレータとしての重複を許容', () => {
      const module: PromptModule = {
        methodology: [
          'ステップ1: 初期化',
          '---',
          'ステップ2: 処理',
          '---',
          'ステップ3: 完了',
          '---'
        ]
      };
      const context = {};
      const result = compile(module, context);
      
      const items = result.instructions[0].items;
      expect(items.filter(item => item === '---')).toHaveLength(3);
    });
    
    it('強調のための意図的な繰り返し', () => {
      const module: PromptModule = {
        guidelines: [
          '重要: 必ずエラーハンドリングを行う',
          'データを検証する',
          'ログを記録する',
          '重要: 必ずエラーハンドリングを行う'  // 意図的な繰り返し
        ]
      };
      const context = {};
      const result = compile(module, context);
      
      const items = result.instructions[0].items;
      expect(items[0]).toBe('重要: 必ずエラーハンドリングを行う');
      expect(items[3]).toBe('重要: 必ずエラーハンドリングを行う');
    });
  });

  describe('DynamicContentの拡張機能', () => {
    it('DynamicContentで文字列を直接返せる', () => {
      interface Context {
        name: string;
      }
      
      const module: PromptModule<Context> = {
        state: [
          (ctx) => `ユーザー名: ${ctx.name}`  // 文字列を直接返す
        ]
      };
      
      const context = { name: 'Alice' };
      const result = compile(module, context);
      
      expect(result.data[0].items).toEqual(['ユーザー名: Alice']);
    });
    
    it('DynamicContentで文字列配列を直接返せる', () => {
      interface Context {
        items: string[];
      }
      
      const module: PromptModule<Context> = {
        state: [
          (ctx) => ctx.items.map(item => `- ${item}`)  // 文字列配列を直接返す
        ]
      };
      
      const context = { items: ['item1', 'item2', 'item3'] };
      const result = compile(module, context);
      
      expect(result.data[0].items).toEqual([
        '- item1',
        '- item2',
        '- item3'
      ]);
    });
    
    it('DynamicContentで混在した配列を返せる', () => {
      interface Context {
        count: number;
      }
      
      const module: PromptModule<Context> = {
        methodology: [
          (ctx) => [
            'プロセス開始',  // 文字列
            `合計: ${ctx.count}件`,  // 文字列
            { type: 'text', content: '詳細情報' } as TextElement  // Element
          ]
        ]
      };
      
      const context = { count: 5 };
      const result = compile(module, context);
      
      expect(result.instructions).toHaveLength(2);
      expect(result.instructions[0]).toEqual({
        type: 'section',
        category: 'instructions',
        title: 'Processing Methodology',
        items: ['プロセス開始', '合計: 5件']
      });
      expect(result.instructions[1]).toEqual({
        type: 'text',
        content: '詳細情報'
      });
    });
    
    it('DynamicContentでnull/undefinedを返すと無視される', () => {
      interface Context {
        showOptional: boolean;
      }
      
      const module: PromptModule<Context> = {
        guidelines: [
          '必須ガイドライン',
          (ctx) => ctx.showOptional ? 'オプションガイドライン' : null,
          (ctx) => ctx.showOptional ? undefined : '代替ガイドライン'
        ]
      };
      
      const context = { showOptional: false };
      const result = compile(module, context);
      
      expect(result.instructions[0].items).toEqual([
        '必須ガイドライン',
        '代替ガイドライン'
      ]);
    });
  });

  describe('createContext', () => {
    it('createContextがある場合はそれを使用', () => {
      const module: PromptModule<{ value: number }> = {
        createContext: () => ({ value: 42 })
      };
      
      const context = createContext(module);
      expect(context).toEqual({ value: 42 });
    });

    it('createContextがない場合は空オブジェクトを返す', () => {
      const module: PromptModule = {};
      
      const context = createContext(module);
      expect(context).toEqual({});
    });
  });
});