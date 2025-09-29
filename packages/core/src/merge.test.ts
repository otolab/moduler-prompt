import { describe, it, expect } from 'vitest';
import { merge } from './merge';
import type { PromptModule, SubSectionElement } from './types';

describe('merge', () => {
  describe('基本的なマージ', () => {
    it('空のモジュールをマージできる', () => {
      const module1: PromptModule = {};
      const module2: PromptModule = {};
      const result = merge(module1, module2);
      
      expect(result).toEqual({});
    });

    it('片方が空の場合はもう片方の内容が維持される', () => {
      const module1: PromptModule = {
        objective: ['目的1']
      };
      const module2: PromptModule = {};
      const result = merge(module1, module2);
      
      expect(result.objective).toEqual(['目的1']);
    });

    it('同じセクションの文字列が結合される', () => {
      const module1: PromptModule = {
        objective: ['目的1'],
        methodology: ['処理1']
      };
      const module2: PromptModule = {
        objective: ['目的2'],
        methodology: ['処理2']
      };
      const result = merge(module1, module2);
      
      expect(result.objective).toEqual(['目的1', '目的2']);
      expect(result.methodology).toEqual(['処理1', '処理2']);
    });
  });

  describe('SubSectionElementのマージ', () => {
    it('異なるサブセクションは両方保持される', () => {
      const module1: PromptModule = {
        methodology: [
          '処理1',
          {
            type: 'subsection',
            content: '',
            title: 'サブ1',
            items: ['項目1']
          } as SubSectionElement
        ]
      };
      const module2: PromptModule = {
        methodology: [
          '処理2',
          {
            type: 'subsection',
            content: '',
            title: 'サブ2',
            items: ['項目2']
          } as SubSectionElement
        ]
      };
      const result = merge(module1, module2);
      
      expect(result.methodology).toEqual([
        '処理1',
        '処理2',
        {
          type: 'subsection',
          content: '',
          title: 'サブ1',
          items: ['項目1']
        },
        {
          type: 'subsection',
          content: '',
          title: 'サブ2',
          items: ['項目2']
        }
      ]);
    });

    it('同名のサブセクションはitemsがマージされる', () => {
      const module1: PromptModule = {
        methodology: [
          {
            type: 'subsection',
            content: '',
            title: '共通サブセクション',
            items: ['項目1', '項目2']
          } as SubSectionElement
        ]
      };
      const module2: PromptModule = {
        methodology: [
          {
            type: 'subsection',
            content: '',
            title: '共通サブセクション',
            items: ['項目3', '項目4']
          } as SubSectionElement
        ]
      };
      const result = merge(module1, module2);
      
      expect(result.methodology).toEqual([
        {
          type: 'subsection',
          content: '',
          title: '共通サブセクション',
          items: ['項目1', '項目2', '項目3', '項目4']
        }
      ]);
    });
  });

  describe('DynamicContentのマージ', () => {
    it('DynamicContentはそのまま保持される', () => {
      const dynamic1 = (_context: any) => ({ type: 'text', content: 'Dynamic1' });
      const dynamic2 = (_context: any) => ({ type: 'text', content: 'Dynamic2' });
      
      const module1: PromptModule = {
        state: [dynamic1]
      };
      const module2: PromptModule = {
        state: [dynamic2]
      };
      const result = merge(module1, module2);
      
      expect(result.state).toHaveLength(2);
      expect(result.state![0]).toBe(dynamic1);
      expect(result.state![1]).toBe(dynamic2);
    });

    it('文字列、SubSectionElement、DynamicContentが混在してもマージできる', () => {
      const dynamic = (_context: any) => ({ type: 'text', content: 'Dynamic' });
      
      const module1: PromptModule = {
        methodology: [
          '文字列1',
          dynamic,
          {
            type: 'subsection',
            content: '',
            title: 'サブ1',
            items: ['項目1']
          } as SubSectionElement
        ]
      };
      const module2: PromptModule = {
        methodology: [
          '文字列2',
          {
            type: 'subsection',
            content: '',
            title: 'サブ2',
            items: ['項目2']
          } as SubSectionElement
        ]
      };
      const result = merge(module1, module2);
      
      expect(result.methodology).toHaveLength(5);
      expect(result.methodology![0]).toBe('文字列1');
      expect(result.methodology![1]).toBe(dynamic);
      expect(result.methodology![2]).toBe('文字列2');
      expect((result.methodology![3] as SubSectionElement).title).toBe('サブ1');
      expect((result.methodology![4] as SubSectionElement).title).toBe('サブ2');
    });
  });

  describe('createContextのマージ', () => {
    it('両方のcreateContextが実行されて結果がマージされる', () => {
      const module1: PromptModule<{ a: number }> = {
        createContext: () => ({ a: 1 })
      };
      const module2: PromptModule<{ b: number }> = {
        createContext: () => ({ b: 2 })
      };
      const result = merge(module1, module2);
      
      expect(result.createContext!()).toEqual({ a: 1, b: 2 });
    });

    it('同じプロパティは後のモジュールの値で上書きされる', () => {
      const module1: PromptModule<{ value: number; a: string }> = {
        createContext: () => ({ value: 1, a: 'first' })
      };
      const module2: PromptModule<{ value: number; b: string }> = {
        createContext: () => ({ value: 2, b: 'second' })
      };
      const result = merge(module1, module2);
      
      expect(result.createContext!()).toEqual({ value: 2, a: 'first', b: 'second' });
    });

    it('片方のモジュールにcreateContextがない場合は存在する方の結果が使用される', () => {
      const module1: PromptModule = {};
      const module2: PromptModule<{ value: string }> = {
        createContext: () => ({ value: 'test' })
      };
      const result = merge(module1, module2);
      
      expect(result.createContext!()).toEqual({ value: 'test' });
    });

    it('3つ以上のcreateContextも正しくマージされる', () => {
      const module1: PromptModule<{ a: number }> = {
        createContext: () => ({ a: 1 })
      };
      const module2: PromptModule<{ b: number }> = {
        createContext: () => ({ b: 2 })
      };
      const module3: PromptModule<{ c: number }> = {
        createContext: () => ({ c: 3 })
      };
      const result = merge(module1, module2, module3);
      
      expect(result.createContext!()).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('どのモジュールにもcreateContextがない場合はundefined', () => {
      const module1: PromptModule = {};
      const module2: PromptModule = {};
      const result = merge(module1, module2);
      
      expect(result.createContext).toBeUndefined();
    });
  });

  describe('複数モジュールのマージ', () => {
    it('3つ以上のモジュールをマージできる', () => {
      const module1: PromptModule = { objective: ['目的1'] };
      const module2: PromptModule = { objective: ['目的2'] };
      const module3: PromptModule = { objective: ['目的3'] };
      
      const result = merge(module1, module2, module3);
      
      expect(result.objective).toEqual(['目的1', '目的2', '目的3']);
    });

    it('異なるセクションを持つ複数モジュールをマージできる', () => {
      const module1: PromptModule = { 
        objective: ['目的'],
        methodology: ['処理1']
      };
      const module2: PromptModule = { 
        state: ['状態'],
        methodology: ['処理2']
      };
      const module3: PromptModule = { 
        cue: ['出力'],
        methodology: ['処理3']
      };
      
      const result = merge(module1, module2, module3);
      
      expect(result.objective).toEqual(['目的']);
      expect(result.methodology).toEqual(['処理1', '処理2', '処理3']);
      expect(result.state).toEqual(['状態']);
      expect(result.cue).toEqual(['出力']);
    });
  });

  describe('順序の保持', () => {
    it('通常要素 → サブセクションの順序が保持される', () => {
      const module1: PromptModule = {
        methodology: [
          {
            type: 'subsection',
            content: '',
            title: 'サブ1',
            items: ['項目1']
          } as SubSectionElement,
          '文字列1'
        ]
      };
      const module2: PromptModule = {
        methodology: [
          '文字列2',
          {
            type: 'subsection',
            content: '',
            title: 'サブ2',
            items: ['項目2']
          } as SubSectionElement
        ]
      };
      const result = merge(module1, module2);
      
      // 期待される順序: 文字列1, 文字列2, サブ1, サブ2
      expect(result.methodology![0]).toBe('文字列1');
      expect(result.methodology![1]).toBe('文字列2');
      expect((result.methodology![2] as SubSectionElement).title).toBe('サブ1');
      expect((result.methodology![3] as SubSectionElement).title).toBe('サブ2');
    });
  });

  describe('複雑な複数モジュールマージ', () => {
    it('4つのモジュールで全機能を統合できる', () => {
      const module1: PromptModule<{ a: string }> = {
        createContext: () => ({ a: 'value1' }),
        objective: ['目的1'],
        instructions: [
          '手順1-1',
          {
            type: 'subsection',
            content: '',
            title: 'アルゴリズム',
            items: ['ステップ1']
          } as SubSectionElement
        ]
      };

      const module2: PromptModule<{ b: number }> = {
        createContext: () => ({ b: 42 }),
        objective: ['目的2'],
        instructions: [
          '手順2-1',
          {
            type: 'subsection',
            content: '',
            title: 'アルゴリズム',
            items: ['ステップ2']
          } as SubSectionElement
        ],
        state: ['状態2']
      };

      const module3: PromptModule<{ c: boolean }> = {
        createContext: () => ({ c: true }),
        objective: ['目的3'],
        instructions: [
          {
            type: 'subsection',
            content: '',
            title: 'アルゴリズム',
            items: ['ステップ3']
          } as SubSectionElement,
          {
            type: 'subsection',
            content: '',
            title: '新しいセクション',
            items: ['新規ステップ']
          } as SubSectionElement
        ],
        cue: ['出力指示3']
      };

      const module4: PromptModule<{ d: string[] }> = {
        createContext: () => ({ d: ['item1', 'item2'] }),
        objective: ['目的4'],
        instructions: [
          '手順4-1',
          (_context) => ({ type: 'text', content: 'Dynamic content' })
        ],
        materials: ['材料4'],
        schema: ['スキーマ4']
      };

      const merged = merge(module1, module2, module3, module4);
      
      // createContextが全て統合されることを確認
      const context = merged.createContext!();
      expect(context).toEqual({
        a: 'value1',
        b: 42,
        c: true,
        d: ['item1', 'item2']
      });

      // objectiveが全て統合されることを確認
      expect(merged.objective).toEqual(['目的1', '目的2', '目的3', '目的4']);

      // instructionsが正しくマージされることを確認
      expect(merged.instructions).toHaveLength(6); // 3つの通常要素 + 1つの動的要素 + 2つのサブセクション
      expect(merged.instructions![0]).toBe('手順1-1');
      expect(merged.instructions![1]).toBe('手順2-1');
      expect(merged.instructions![2]).toBe('手順4-1');
      expect(typeof merged.instructions![3]).toBe('function'); // Dynamic content
      
      // 同名サブセクションがマージされていることを確認
      const algorithmSection = merged.instructions!.find(
        item => typeof item === 'object' && item.type === 'subsection' && item.title === 'アルゴリズム'
      ) as SubSectionElement;
      expect(algorithmSection.items).toEqual(['ステップ1', 'ステップ2', 'ステップ3']);
      
      // 新しいサブセクションも含まれることを確認
      const newSection = merged.instructions!.find(
        item => typeof item === 'object' && item.type === 'subsection' && item.title === '新しいセクション'
      ) as SubSectionElement;
      expect(newSection.items).toEqual(['新規ステップ']);

      // 他のセクションも正しくマージされることを確認
      expect(merged.state).toEqual(['状態2']);
      expect(merged.cue).toEqual(['出力指示3']);
      expect(merged.materials).toEqual(['材料4']);
      expect(merged.schema).toEqual(['スキーマ4']);
    });

    it('5つ以上のモジュールもマージできる', () => {
      const modules: PromptModule[] = [
        { objective: ['目的1'], terms: ['用語1'] },
        { objective: ['目的2'], methodology: ['処理2'] },
        { objective: ['目的3'], instructions: ['手順3'] },
        { objective: ['目的4'], guidelines: ['ガイド4'] },
        { objective: ['目的5'], preparationNote: ['準備5'] },
        { objective: ['目的6'], state: ['状態6'] }
      ];

      const merged = merge(...modules as [PromptModule, PromptModule, ...PromptModule[]]);
      
      expect(merged.objective).toEqual(['目的1', '目的2', '目的3', '目的4', '目的5', '目的6']);
      expect(merged.terms).toEqual(['用語1']);
      expect(merged.methodology).toEqual(['処理2']);
      expect(merged.instructions).toEqual(['手順3']);
      expect(merged.guidelines).toEqual(['ガイド4']);
      expect(merged.preparationNote).toEqual(['準備5']);
      expect(merged.state).toEqual(['状態6']);
    });
  });

  describe('schemaセクションのマージ', () => {
    it('複数のschemaセクションをマージできる', () => {
      const module1: PromptModule = {
        schema: ['スキーマ1']
      };

      const module2: PromptModule = {
        schema: ['スキーマ2', 'スキーマ3']
      };

      const merged = merge(module1, module2);
      expect(merged.schema).toEqual(['スキーマ1', 'スキーマ2', 'スキーマ3']);
    });

    it('JSONElementを含むschemaをマージできる', () => {
      const module1: PromptModule = {
        schema: [
          () => ({
            type: 'json' as const,
            content: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              }
            }
          })
        ]
      };

      const module2: PromptModule = {
        schema: [
          () => ({
            type: 'json' as const,
            content: {
              type: 'object',
              properties: {
                age: { type: 'number' }
              }
            }
          })
        ]
      };

      const merged = merge(module1, module2);
      expect(merged.schema).toHaveLength(2);
      expect(typeof merged.schema![0]).toBe('function');
      expect(typeof merged.schema![1]).toBe('function');

      // DynamicContentを実行して確認
      const context = {};
      const element1 = (merged.schema![0] as any)(context);
      const element2 = (merged.schema![1] as any)(context);

      expect(element1.type).toBe('json');
      expect(element1.content.properties.name).toEqual({ type: 'string' });
      expect(element2.type).toBe('json');
      expect(element2.content.properties.age).toEqual({ type: 'number' });
    });

    it('schemaとサブセクションを同時に含む場合も正しくマージする', () => {
      const module1: PromptModule = {
        schema: [
          '基本的なスキーマ説明',
          {
            type: 'subsection',
            title: 'スキーマ詳細',
            items: ['詳細1', '詳細2']
          }
        ]
      };

      const module2: PromptModule = {
        schema: [
          () => ({
            type: 'json' as const,
            content: { type: 'object' }
          }),
          {
            type: 'subsection',
            title: 'スキーマ詳細',
            items: ['詳細3']
          }
        ]
      };

      const merged = merge(module1, module2);
      expect(merged.schema).toHaveLength(3);

      // 通常要素が先、サブセクションが後
      expect(merged.schema![0]).toBe('基本的なスキーマ説明');
      expect(typeof merged.schema![1]).toBe('function');

      // サブセクションがマージされている
      const subsection = merged.schema![2] as any;
      expect(subsection.type).toBe('subsection');
      expect(subsection.title).toBe('スキーマ詳細');
      expect(subsection.items).toEqual(['詳細1', '詳細2', '詳細3']);
    });
  });
});