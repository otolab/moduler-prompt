import type {
  PromptModule,
  CompiledPrompt,
  SectionContent,
  StandardSectionName,
  SectionElement,
  SubSectionElement,
  DynamicElement,
  SectionType
} from './types.js';
import { STANDARD_SECTIONS } from './types.js';

/**
 * モジュールとコンテキストからプロンプトをコンパイル
 */
export function compile<TContext = any>(
  module: PromptModule<TContext>,
  context: TContext = {} as TContext
): CompiledPrompt {
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
    const sectionElement = compileSectionToElement(
      sectionContent,
      sectionDef.title,
      sectionDef.type,
      sectionName,
      context
    );

    // セクションタイプに応じて分類
    compiled[sectionDef.type].push(sectionElement);
  }

  return compiled;
}

/**
 * セクションコンテンツをSectionElementにコンパイル
 */
function compileSectionToElement<TContext>(
  content: SectionContent<TContext>,
  title: string,
  category: SectionType,
  _sectionName: string,
  context: TContext
): SectionElement {
  const plainItems: string[] = [];
  const subsections: SubSectionElement[] = [];

  // contentは既に配列型
  const contentItems = content;

  for (const item of contentItems) {
    if (typeof item === 'function') {
      // DynamicContentを実行
      const dynamicResult = item(context);
      const processedStrings = processDynamicContent(dynamicResult);
      
      // 変換された文字列を追加
      for (const str of processedStrings) {
        plainItems.push(str);
      }
    } else if (typeof item === 'string') {
      // 文字列をそのまま追加
      plainItems.push(item);
    } else if (item.type === 'subsection') {
      // サブセクションを追加
      subsections.push(item);
    }
  }

  // 順序: 通常要素 → サブセクション
  const items: (string | SubSectionElement)[] = [
    ...plainItems,
    ...subsections
  ];

  return {
    type: 'section',
    category,
    content: '',
    title,
    items
  };
}

/**
 * DynamicContentの結果を文字列配列に変換
 * 文字列や文字列配列を直接返すことができるように拡張
 */
function processDynamicContent(
  result: string | string[] | DynamicElement | DynamicElement[] | null | undefined
): string[] {
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
        return formatDynamicElementAsString(item);  // Elementは変換
      }
    });
  }
  
  // 単一のElementの場合
  return [formatDynamicElementAsString(result)];
}

/**
 * DynamicElementを文字列に変換
 */
function formatDynamicElementAsString(element: DynamicElement): string {
  switch (element.type) {
    case 'text':
      return element.content;
    
    case 'message':
      const role = element.role.charAt(0).toUpperCase() + element.role.slice(1);
      const content = typeof element.content === 'string' 
        ? element.content 
        : '[attachments]';
      return element.name 
        ? `[${role} - ${element.name}]: ${content}`
        : `[${role}]: ${content}`;
    
    case 'material':
      const materialContent = typeof element.content === 'string'
        ? element.content
        : '[attachments]';
      return `[Material: ${element.title}]\n${materialContent}`;
    
    case 'chunk':
      const chunkContent = typeof element.content === 'string'
        ? element.content
        : '[attachments]';
      return `[Chunk from ${element.partOf}]\n${chunkContent}`;
    
    default:
      // 型の網羅性チェック
      const _exhaustive: never = element;
      void _exhaustive;
      return '';
  }
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