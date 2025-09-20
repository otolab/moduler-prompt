import type {
  PromptModule,
  CompiledPrompt,
  SectionContent,
  StandardSectionName,
  SectionElement,
  SubSectionElement,
  DynamicElement,
  SectionType,
  SimpleDynamicContent
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
    const sectionElement = compileSectionToElement(
      sectionContent,
      sectionDef.title,
      sectionDef.type,
      sectionName,
      actualContext
    );

    // セクションタイプに応じて分類
    compiled[sectionDef.type].push(sectionElement);

    // schemaセクションの場合、コンパイル結果からJSONElementを探す
    if (sectionName === 'schema') {
      // sectionElement.itemsの中にJSONElementの文字列表現があるかチェック
      // (JSONElementはformatDynamicElementAsStringで```json```ブロックに変換される)
      for (const item of sectionElement.items) {
        if (typeof item === 'string' && item.startsWith('```json\n') && item.endsWith('\n```')) {
          // ```json```ブロックから内容を抽出
          const jsonContent = item.slice(8, -4); // "```json\n" と "\n```" を除去
          try {
            const schema = JSON.parse(jsonContent);
            compiled.metadata = {
              outputSchema: schema
            };
            break;
          } catch (e) {
            // パースエラーの場合はスキップ
          }
        }
      }
    }
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

  // contentを配列として扱う（文字列の場合は配列に変換）
  const contentItems = typeof content === 'string' ? [content] : Array.isArray(content) ? content : [];

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

    case 'json':
      // JSONElementを文字列表現に変換
      const jsonContent = typeof element.content === 'string'
        ? element.content
        : JSON.stringify(element.content, null, 2);
      return `\`\`\`json\n${jsonContent}\n\`\`\``;

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