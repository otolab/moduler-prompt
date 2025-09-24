import type {
  PromptModule,
  CompiledPrompt,
  SectionContent,
  StandardSectionName,
  SectionElement,
  SubSectionElement,
  DynamicElement,
  SectionType,
  SimpleDynamicContent,
  Element,
  JSONElement
} from './types.js';
import { STANDARD_SECTIONS } from './types.js';

/**
 * モジュールとコンテキストからプロンプトをコンパイル
 */
export function compile<TContext = any>(
  module: PromptModule<TContext>,
  context?: TContext
): CompiledPrompt {
  // コンテキストが提供されていない場合、module.createContextから生成
  const actualContext = context ?? (module.createContext ? module.createContext() : {} as TContext);

  const compiled: CompiledPrompt = {
    instructions: [],
    data: [],
    output: []
  };

  // 標準セクションを処理
  for (const sectionName of Object.keys(STANDARD_SECTIONS) as StandardSectionName[]) {
    const sectionContent = module[sectionName];
    if (!sectionContent) continue;

    const sectionDef = STANDARD_SECTIONS[sectionName];
    const elements = compileSectionToElements(
      sectionContent,
      sectionDef.title,
      sectionDef.type,
      sectionName,
      actualContext
    );

    // セクションタイプに応じて分類
    compiled[sectionDef.type].push(...elements);

    // schemaセクションの場合、JSONElementを探す
    if (sectionName === 'schema') {
      for (const element of elements) {
        if (element.type === 'json') {
          const jsonElement = element as JSONElement;
          const schema = typeof jsonElement.content === 'string'
            ? JSON.parse(jsonElement.content)
            : jsonElement.content;
          compiled.metadata = {
            outputSchema: schema
          };
          break;
        }
      }
    }
  }

  return compiled;
}

/**
 * セクションコンテンツをElement配列にコンパイル
 * DynamicElementはそのまま保持し、文字列やSubSectionはSectionElementにまとめる
 */
function compileSectionToElements<TContext>(
  content: SectionContent<TContext>,
  title: string,
  category: SectionType,
  _sectionName: string,
  context: TContext
): Element[] {
  const elements: Element[] = [];
  const plainItems: string[] = [];
  const subsections: SubSectionElement[] = [];

  // contentを配列として扱う（文字列の場合は配列に変換）
  const contentItems = typeof content === 'string' ? [content] : Array.isArray(content) ? content : [];

  for (const item of contentItems) {
    if (typeof item === 'function') {
      // DynamicContentを実行
      const dynamicResult = item(context);
      const processedElements = processDynamicContentToElements(dynamicResult);

      // DynamicElementはそのままElement配列に追加
      for (const elem of processedElements) {
        if (typeof elem === 'string') {
          plainItems.push(elem);
        } else {
          // DynamicElementを直接追加
          elements.push(elem);
        }
      }
    } else if (typeof item === 'string') {
      // 文字列をそのまま追加
      plainItems.push(item);
    } else if (item.type === 'subsection') {
      // サブセクション内のSimpleDynamicContentを処理
      const processedItems: string[] = [];
      for (const subItem of item.items) {
        if (typeof subItem === 'function') {
          // SimpleDynamicContentを実行
          const result = processSimpleDynamicContent(subItem as SimpleDynamicContent<any>, context);
          processedItems.push(...result);
        } else if (typeof subItem === 'string') {
          processedItems.push(subItem);
        }
      }
      // 処理済みのサブセクションを追加
      subsections.push({
        ...item,
        items: processedItems
      });
    }
  }

  // 文字列やサブセクションがある場合は、SectionElementにまとめる
  if (plainItems.length > 0 || subsections.length > 0) {
    const sectionElement: SectionElement = {
      type: 'section',
      category,
      content: '',
      title,
      items: [...plainItems, ...subsections]
    };
    elements.unshift(sectionElement); // セクションを先頭に追加
  }

  return elements;
}

/**
 * DynamicContentの結果をElement配列または文字列配列に変換
 * DynamicElementはそのまま保持
 */
function processDynamicContentToElements(
  result: string | string[] | DynamicElement | DynamicElement[] | null | undefined
): (string | DynamicElement)[] {
  // null/undefinedの場合は空配列
  if (result === null || result === undefined) {
    return [];
  }

  // 文字列の場合
  if (typeof result === 'string') {
    return [result];
  }

  // 配列の場合
  if (Array.isArray(result)) {
    return result.flatMap(item => {
      if (typeof item === 'string') {
        return item;  // 文字列はそのまま
      } else {
        return item;  // DynamicElementはそのまま保持
      }
    });
  }

  // 単一のElementの場合
  return [result];
}

/**
 * SimpleDynamicContentの結果を文字列配列に変換
 */
function processSimpleDynamicContent<TContext>(
  fn: SimpleDynamicContent<TContext>,
  context: TContext
): string[] {
  const result = fn(context);
  
  if (result === null || result === undefined) {
    return [];
  }
  
  if (typeof result === 'string') {
    return [result];
  }
  
  if (Array.isArray(result)) {
    // string[]のみを受け入れる
    return result.filter((item): item is string => typeof item === 'string');
  }
  
  return [];
}


/**
 * コンテキストを作成するヘルパー関数
 */
export function createContext<TContext = any>(
  module: PromptModule<TContext>
): TContext {
  if (module.createContext) {
    return module.createContext();
  }
  return {} as TContext;
}