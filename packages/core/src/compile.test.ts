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
        processing: ['データを分析', '結果を生成']
      };
      const context = {};
      const result = compile(module, context);
      
      expect(result.instructions).toHaveLength(2);
      expect(result.instructions[0]).toEqual({
        type: 'section',
        content: '',
        title: 'Objective and Role',
        items: ['AIアシスタントとして動作する']
      });
      expect(result.instructions[1]).toEqual({
        type: 'section',
        content: '',
        title: 'Processing Algorithm',
        items: ['データを分析', '結果を生成']
      });
    });

    it('SubSectionElementを含むセクションを処理できる', () => {
      const module: PromptModule = {
        processing: [
          '入力を検証',
          {
            type: 'subsection',
            content: '',
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
        content: '',
        title: 'Processing Algorithm',
        items: [
          '入力を検証',
          '出力を生成',
          {
            type: 'subsection',
            content: '',
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
        type: 'section',
        content: '',
        title: 'Current State',
        items: ['Value: test123']
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
        type: 'section',
        content: '',
        title: 'Messages',
        items: ['[User]: Hello, AI!']
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
        type: 'section',
        content: '',
        title: 'Prepared Materials',
        items: ['[Material: API Guide]\nAPI documentation content']
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
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        type: 'section',
        content: '',
        title: 'Input Chunks',
        items: [
          '[Chunk from document.txt]\nPart 1 content',
          '[Chunk from document.txt]\nPart 2 content'
        ]
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
      expect(result1.data[0]).toEqual({
        type: 'section',
        content: '',
        title: 'Current State',
        items: ['固定の状態', '動的な状態']
      });
      
      const result2 = compile(module, { includeState: false });
      expect(result2.data[0]).toEqual({
        type: 'section',
        content: '',
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
        processing: [
          '処理を開始',
          (context) => ({
            type: 'text',
            content: `ステップ ${context.currentStep}/${context.totalSteps} を実行中`
          } as TextElement),
          {
            type: 'subsection',
            content: '',
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
      
      expect(result.instructions).toHaveLength(1);
      expect(result.instructions[0]).toEqual({
        type: 'section',
        content: '',
        title: 'Processing Algorithm',
        items: [
          '処理を開始',
          'ステップ 3/5 を実行中',
          '詳細1',
          '詳細2',
          '処理を完了',
          {
            type: 'subsection',
            content: '',
            title: '詳細手順',
            items: ['初期化', '検証', '実行']
          }
        ]
      });
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