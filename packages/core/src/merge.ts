import type {
  PromptModule,
  SectionContent,
  SubSectionElement,
  DynamicContent,
  StandardSectionName
} from './types.js';
import { STANDARD_SECTIONS } from './types.js';

/**
 * 2つのPromptModuleをマージ
 */
function mergeTwo<T1 = any, T2 = any>(
  module1: PromptModule<T1>,
  module2: PromptModule<T2>
): PromptModule<T1 & T2> {
  const result: PromptModule<T1 & T2> = {};

  // createContextをマージ（両方を実行して結果を統合）
  const creators = [module1.createContext, module2.createContext].filter(c => c !== undefined);
  
  if (creators.length > 0) {
    result.createContext = () => {
      let mergedContext = {} as T1 & T2;
      for (const creator of creators) {
        const context = creator!();
        mergedContext = { ...mergedContext, ...context } as T1 & T2;
      }
      return mergedContext;
    };
  }

  // 各標準セクションをマージ
  const sectionNames = Object.keys(STANDARD_SECTIONS) as StandardSectionName[];

  for (const sectionName of sectionNames) {
    const sections = [module1[sectionName], module2[sectionName]].filter(s => s !== undefined);
    
    if (sections.length > 0) {
      // 型の不一致を解決: 異なるContext型を統合
      result[sectionName] = mergeSectionContents<T1 & T2>(...(sections as SectionContent<T1 & T2>[]));
    }
  }

  return result;
}

/**
 * 複数のPromptModuleをマージ
 */
// 2つのモジュール  
export function merge<T1, T2>(
  module1: PromptModule<T1>,
  module2: PromptModule<T2>
): PromptModule<T1 & T2>;

// 3つのモジュール
export function merge<T1, T2, T3>(
  ...modules: [PromptModule<T1>, PromptModule<T2>, PromptModule<T3>]
): PromptModule<T1 & T2 & T3>;

// 4つのモジュール
export function merge<T1, T2, T3, T4>(
  ...modules: [PromptModule<T1>, PromptModule<T2>, PromptModule<T3>, PromptModule<T4>]
): PromptModule<T1 & T2 & T3 & T4>;

// 5つのモジュール
export function merge<T1, T2, T3, T4, T5>(
  ...modules: [PromptModule<T1>, PromptModule<T2>, PromptModule<T3>, PromptModule<T4>, PromptModule<T5>]
): PromptModule<T1 & T2 & T3 & T4 & T5>;

// 6つのモジュール
export function merge<T1, T2, T3, T4, T5, T6>(
  ...modules: [PromptModule<T1>, PromptModule<T2>, PromptModule<T3>, PromptModule<T4>, PromptModule<T5>, PromptModule<T6>]
): PromptModule<T1 & T2 & T3 & T4 & T5 & T6>;

// 実装（2つ以上、デフォルト）
export function merge<T1, T2>(
  ...modules: [PromptModule<T1>, PromptModule<T2>, ...PromptModule<any>[]]
): PromptModule<T1 & T2> {
  // 2つずつマージを繰り返す
  let result = mergeTwo(modules[0], modules[1]);
  for (let i = 2; i < modules.length; i++) {
    result = mergeTwo(result, modules[i]);
  }

  return result;
}

/**
 * 複数のセクションコンテンツをマージ
 */
function mergeSectionContents<TContext = any>(
  ...contents: SectionContent<TContext>[]
): SectionContent<TContext> {
  const merged: SectionContent<TContext> = [];
  const subsections = new Map<string, SubSectionElement>();
  const plainItems: (string | DynamicContent<TContext>)[] = [];

  // 全てのコンテンツを分類
  for (const content of contents) {
    // contentが関数の場合はそのまま保持（実行はコンパイル時）
    if (typeof content === 'function') {
      plainItems.push(content);
      continue;
    }
    
    // 配列でない場合は配列に変換
    const items = Array.isArray(content) ? content : [content];
    
    for (const item of items) {
      if (typeof item === 'function') {
        // DynamicContentはそのまま保持
        plainItems.push(item);
      } else if (typeof item === 'string') {
        // 文字列はそのまま保持
        plainItems.push(item);
      } else if (item.type === 'subsection') {
        // 同名のサブセクションをマージ
        const existing = subsections.get(item.title);
        if (existing) {
          subsections.set(item.title, {
            ...item,
            items: [...existing.items, ...item.items]
          });
        } else {
          subsections.set(item.title, item);
        }
      }
    }
  }

  // 結合順序: 通常要素 → サブセクション
  merged.push(...plainItems);
  merged.push(...Array.from(subsections.values()));

  return merged;
}