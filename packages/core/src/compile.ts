import type {
  PromptModule,
  CompiledPrompt,
  SectionContent,
  StandardSectionName,
  SectionElement,
  SubSectionElement,
  DynamicElement
} from './types';
import { STANDARD_SECTIONS } from './types';

/**
 * モジュールとコンテキストからプロンプトをコンパイル
 */
export function compile<TContext = any>(
  module: PromptModule<TContext>,
  context: TContext
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
  context: TContext
): SectionElement {
  const plainItems: string[] = [];
  const subsections: SubSectionElement[] = [];

  for (const item of content) {
    if (typeof item === 'function') {
      // DynamicContentを実行
      const dynamicResult = item(context);
      if (dynamicResult) {
        // DynamicElementを文字列に変換して追加
        const dynamicElements = Array.isArray(dynamicResult) ? dynamicResult : [dynamicResult];
        for (const element of dynamicElements) {
          plainItems.push(formatDynamicElementAsString(element));
        }
      }
    } else if (typeof item === 'string') {
      // 文字列はそのまま追加
      plainItems.push(item);
    } else if (item.type === 'subsection') {
      // SubSectionElementは別に保持
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
    content: '',
    title,
    items
  };
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