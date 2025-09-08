/**
 * MLX Driver Model Presets
 * 
 * よく知られたモデルの事前定義済み仕様
 */

import type { ModelSpecPreset } from './types.js';

/**
 * よく知られたモデルのプリセット定義
 */
export const MODEL_PRESETS: ModelSpecPreset[] = [
  // Gemma-3シリーズ
  {
    pattern: /gemma-3/i,
    spec: {
      apiStrategy: 'prefer-chat',
      chatRestrictions: {
        singleSystemAtStart: true,
        alternatingTurns: true,
        requiresUserLast: true,
        maxSystemMessages: 1
      }
    }
  },
  
  // CodeLlamaシリーズ
  {
    pattern: /CodeLlama/i,
    spec: {
      apiStrategy: 'auto',
      chatRestrictions: {
        singleSystemAtStart: true,
        requiresUserLast: true
      }
    }
  },
  
  // Tanuki-8B
  {
    pattern: /Tanuki-8B-dpo-v1/i,
    spec: {
      apiStrategy: 'prefer-chat',
      chatRestrictions: {
        singleSystemAtStart: true
      }
    }
  },
  
  // LLM-JP (completion専用)
  {
    pattern: /llm-jp-3\.1/i,
    spec: {
      apiStrategy: 'force-completion',
      capabilities: {
        hasApplyChatTemplate: false,
        supportsCompletion: true
      }
    }
  },
  
  // Phi-3シリーズ
  {
    pattern: /phi-3/i,
    spec: {
      apiStrategy: 'prefer-chat',
      chatRestrictions: {
        singleSystemAtStart: true,
        alternatingTurns: false,
        requiresUserLast: true
      }
    }
  },
  
  // Mistralシリーズ
  {
    pattern: /mistral/i,
    spec: {
      apiStrategy: 'auto',
      chatRestrictions: {
        singleSystemAtStart: false,  // 複数システムメッセージOK
        alternatingTurns: false,
        requiresUserLast: true
      }
    }
  },
  
  // Qwen シリーズ
  {
    pattern: /qwen/i,
    spec: {
      apiStrategy: 'prefer-chat',
      chatRestrictions: {
        singleSystemAtStart: true,
        alternatingTurns: true,
        requiresUserLast: true
      }
    }
  }
];

/**
 * モデル名からプリセットを検索
 */
export function findPreset(modelName: string): ModelSpecPreset | undefined {
  return MODEL_PRESETS.find(preset => preset.pattern.test(modelName));
}

/**
 * プリセットとカスタム設定をマージ
 */
export function mergeWithPreset(
  modelName: string,
  customSpec?: Partial<import('./types.js').ModelSpec>
): Partial<import('./types.js').ModelSpec> {
  const preset = findPreset(modelName);
  
  if (!preset) {
    return customSpec || {};
  }
  
  // プリセットとカスタム設定をマージ（カスタムが優先）
  return {
    ...preset.spec,
    ...customSpec,
    modelName,
    // chatRestrictionsは深いマージ
    chatRestrictions: {
      ...preset.spec.chatRestrictions,
      ...customSpec?.chatRestrictions
    },
    // capabilitiesも深いマージ
    capabilities: {
      ...preset.spec.capabilities,
      ...customSpec?.capabilities
    }
  };
}