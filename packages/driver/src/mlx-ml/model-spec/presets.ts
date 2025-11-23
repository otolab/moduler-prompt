/**
 * MLX Driver Model Config Presets
 *
 * よく知られたモデルの事前定義済み設定
 */

import type { MlxModelConfigPreset } from './types.js';

/**
 * よく知られたモデルのプリセット定義
 */
export const MODEL_CONFIG_PRESETS: MlxModelConfigPreset[] = [
  // Gemma-3シリーズ
  {
    pattern: /gemma-3/i,
    config: {
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
    config: {
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
    config: {
      apiStrategy: 'prefer-chat',
      chatRestrictions: {
        singleSystemAtStart: true
      }
    }
  },

  // LLM-JP (completion専用)
  {
    pattern: /llm-jp-3\.1/i,
    config: {
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
    config: {
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
    config: {
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
    config: {
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
export function findPreset(modelName: string): MlxModelConfigPreset | undefined {
  return MODEL_CONFIG_PRESETS.find(preset => preset.pattern.test(modelName));
}

/**
 * モデル名からプリセット設定を取得
 *
 * マージは呼び出し側で明示的に行うため、ここではプリセットのみを返す
 */
export function getPresetConfig(
  modelName: string
): Partial<import('./types.js').MlxModelConfig> {
  const preset = findPreset(modelName);

  if (!preset) {
    return {};
  }

  // プリセット設定をそのまま返す（マージは呼び出し側で明示的に制御）
  return {
    ...preset.config,
    modelName
  };
}