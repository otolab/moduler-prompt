// 基本型定義

// Attachment定義
export interface Attachment {
  type: 'text' | 'image_url' | 'file';
  text?: string;
  image_url?: { url: string };
  file?: { path: string; mime_type: string };
}

// テキスト要素
export interface TextElement {
  type: 'text';
  content: string;
}

// メッセージ要素
export interface MessageElement {
  type: 'message';
  content: string | Attachment[];
  role: 'system' | 'assistant' | 'user';
  name?: string;
}

// 資料要素
export interface MaterialElement {
  type: 'material';
  content: string | Attachment[];
  id: string;
  title: string;
  usage?: number;
}

// 分割テキスト要素
export interface ChunkElement {
  type: 'chunk';
  content: string | Attachment[];
  partOf: string;
  index?: number;
  total?: number;  // Total number of chunks
  usage?: number;
}

// セクション要素（第1階層）
export interface SectionElement<TContext = any> {
  type: 'section';
  category: SectionType;  // 配置先の大セクション（instructions/data/output）
  content: string;
  title: string;
  items: (string | SubSectionElement | DynamicContent<TContext>)[];
}

// サブセクション要素（第2階層）
export interface SubSectionElement<TContext = any> {
  type: 'subsection';
  content: string;
  title: string;
  items: (string | SimpleDynamicContent<TContext>)[];
}

// 統合型
export type Element = 
  | TextElement
  | MessageElement 
  | MaterialElement 
  | ChunkElement 
  | SectionElement
  | SubSectionElement;

// 動的に生成できる要素（構造要素は除外）
export type DynamicElement = 
  | TextElement
  | MessageElement 
  | MaterialElement 
  | ChunkElement;

// シンプルな動的コンテンツ（文字列のみを生成）
// SubSection内で使用される
export type SimpleDynamicContent<TContext = any> = 
  (context: TContext) => 
    | string                    // 単純な文字列
    | string[]                  // 文字列配列
    | null                     // 何も返さない
    | undefined;               // 何も返さない

// コンテキストに基づいて動的に要素を生成
// 利便性のため、文字列や文字列配列も直接返せるようにする
export type DynamicContent<TContext = any> = 
  (context: TContext) => 
    | string                    // 単純な文字列
    | string[]                  // 文字列配列（簡潔な記述のため）
    | DynamicElement           // 単一の要素
    | DynamicElement[]         // 要素の配列
    | null                     // 何も返さない
    | undefined;               // 何も返さない

// セクションコンテンツ型
export type SectionContent<TContext = any> = 
  (string | SubSectionElement | DynamicContent<TContext>)[];

// プロンプトモジュール
export interface PromptModule<TContext = any> {
  // コンテキストの生成
  createContext?: () => TContext;
  
  // Instructions セクション
  objective?: SectionContent<TContext>;
  terms?: SectionContent<TContext>;
  methodology?: SectionContent<TContext>;
  instructions?: SectionContent<TContext>;
  guidelines?: SectionContent<TContext>;
  preparationNote?: SectionContent<TContext>;
  
  // Data セクション
  state?: SectionContent<TContext>;
  inputs?: SectionContent<TContext>;
  materials?: SectionContent<TContext>;
  chunks?: SectionContent<TContext>;
  messages?: SectionContent<TContext>;
  
  // Output セクション
  cue?: SectionContent<TContext>;
  schema?: SectionContent<TContext>;
  
  // 追加のセクション（明示的にSectionElementを配置）
  sections?: SectionElement<TContext>[];
}

// 標準セクション定義
export const STANDARD_SECTIONS = {
  // Instructions
  objective: { type: 'instructions' as const, title: 'Objective and Role' },
  terms: { type: 'instructions' as const, title: 'Term Explanations' },
  methodology: { type: 'instructions' as const, title: 'Processing Methodology' },
  instructions: { type: 'instructions' as const, title: 'Instructions' },
  guidelines: { type: 'instructions' as const, title: 'Guidelines' },
  preparationNote: { type: 'instructions' as const, title: 'Response Preparation Note' },
  
  // Data
  state: { type: 'data' as const, title: 'Current State' },
  inputs: { type: 'data' as const, title: 'Input Data' },
  materials: { type: 'data' as const, title: 'Prepared Materials' },
  chunks: { type: 'data' as const, title: 'Input Chunks' },
  messages: { type: 'data' as const, title: 'Messages' },
  
  // Output
  cue: { type: 'output' as const, title: 'Output' },
  schema: { type: 'output' as const, title: 'Output Schema' }
} as const;

// セクション名の型
export type StandardSectionName = keyof typeof STANDARD_SECTIONS;

// セクションタイプの型
export type SectionType = 'instructions' | 'data' | 'output';

// コンパイル済みプロンプト
export interface CompiledPrompt {
  instructions: Element[];
  data: Element[];
  output: Element[];
}