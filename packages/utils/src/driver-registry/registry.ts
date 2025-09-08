/**
 * Driver Registry Implementation
 * ドライバレジストリの実装
 */

import { readFile } from 'fs/promises';
import * as yaml from 'js-yaml';
import type { AIDriver } from '@moduler-prompt/driver';
import * as Drivers from '@moduler-prompt/driver';

import type {
  DriverProvider,
  DriverCapability,
  ModelDefinition,
  DriverConfig,
  RegistryConfig,
  DriverSelectionCriteria,
  DriverSelectionResult,
  IDriverRegistry,
  DriverFactory
} from './types.js';
import { registerDriverFactories } from './factory-helper.js';

/**
 * ドライバレジストリクラス
 */
export class DriverRegistry implements IDriverRegistry {
  private drivers: Map<string, DriverConfig> = new Map();
  private defaultDriverId?: string;
  private globalConfig?: RegistryConfig['global'];
  private factories: Map<DriverProvider, DriverFactory> = new Map();

  constructor() {
    // デフォルトのファクトリを登録
    this.registerDefaultFactories();
  }

  /**
   * デフォルトのドライバファクトリを登録
   */
  private registerDefaultFactories(): void {
    // ヘルパー関数を使用してデフォルトドライバを登録
    registerDriverFactories(this, Drivers);
  }

  /**
   * カスタムファクトリを登録
   */
  registerFactory(provider: DriverProvider, factory: DriverFactory): void {
    this.factories.set(provider, factory);
  }

  /**
   * YAMLファイルから設定を読み込む
   */
  async loadConfig(configPath: string): Promise<void> {
    try {
      const content = await readFile(configPath, 'utf-8');
      const config = yaml.load(content) as RegistryConfig;
      
      // バージョンチェック
      if (!config.version) {
        throw new Error('Configuration version is required');
      }

      // グローバル設定を保存
      this.globalConfig = config.global;
      this.defaultDriverId = config.defaultDriver;

      // ドライバを登録
      for (const driverConfig of config.drivers) {
        this.registerDriver(driverConfig);
      }
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error}`);
    }
  }

  /**
   * ドライバを登録
   */
  registerDriver(config: DriverConfig): void {
    // デフォルト値を設定
    if (config.model.enabled === undefined) {
      config.model.enabled = true;
    }
    if (config.model.priority === undefined) {
      config.model.priority = 0;
    }

    this.drivers.set(config.id, config);
  }

  /**
   * 条件に基づいてドライバを選択
   */
  selectDriver(criteria: DriverSelectionCriteria): DriverSelectionResult | null {
    const candidates: DriverSelectionResult[] = [];

    for (const [id, config] of this.drivers) {
      // 無効なドライバはスキップ
      if (!config.model.enabled) {
        continue;
      }

      // プロバイダーフィルタ
      if (criteria.providers && !criteria.providers.includes(config.model.provider)) {
        continue;
      }
      if (criteria.excludeProviders?.includes(config.model.provider)) {
        continue;
      }

      // トークン数チェック
      if (criteria.minInputTokens && 
          config.model.maxInputTokens && 
          config.model.maxInputTokens < criteria.minInputTokens) {
        continue;
      }
      if (criteria.minOutputTokens && 
          config.model.maxOutputTokens && 
          config.model.maxOutputTokens < criteria.minOutputTokens) {
        continue;
      }

      // コストチェック
      if (criteria.maxCost) {
        const cost = config.model.cost;
        if (cost) {
          if (criteria.maxCost.input && cost.input > criteria.maxCost.input) {
            continue;
          }
          if (criteria.maxCost.output && cost.output > criteria.maxCost.output) {
            continue;
          }
        }
      }

      // 能力チェックとスコア計算
      let score = config.model.priority || 0;
      const warnings: string[] = [];
      const capabilities = config.model.capabilities;

      // 必須能力チェック
      if (criteria.requiredCapabilities) {
        const missing = criteria.requiredCapabilities.filter(
          cap => !capabilities.includes(cap)
        );
        if (missing.length > 0) {
          continue; // 必須能力が欠けている場合はスキップ
        }
        score += criteria.requiredCapabilities.length * 10;
      }

      // 除外能力チェック
      if (criteria.excludeCapabilities) {
        const hasExcluded = criteria.excludeCapabilities.some(
          cap => capabilities.includes(cap)
        );
        if (hasExcluded) {
          continue;
        }
      }

      // 望ましい能力でスコア調整
      if (criteria.preferredCapabilities) {
        const matched = criteria.preferredCapabilities.filter(
          cap => capabilities.includes(cap)
        );
        score += matched.length * 5;
        
        const missing = criteria.preferredCapabilities.filter(
          cap => !capabilities.includes(cap)
        );
        if (missing.length > 0) {
          warnings.push(`Missing preferred capabilities: ${missing.join(', ')}`);
        }
      }

      // 特別な優先設定
      if (criteria.preferLocal && capabilities.includes('local')) {
        score += 20;
      }
      if (criteria.preferFast && capabilities.includes('fast')) {
        score += 15;
      }

      // 選択理由を生成
      const reasons: string[] = [];
      if (config.model.provider === 'mlx' && criteria.preferLocal) {
        reasons.push('Local execution preferred');
      }
      if (capabilities.includes('fast') && criteria.preferFast) {
        reasons.push('Fast response preferred');
      }
      if (criteria.requiredCapabilities?.length) {
        reasons.push(`Meets all required capabilities: ${criteria.requiredCapabilities.join(', ')}`);
      }
      if (config.model.priority && config.model.priority > 0) {
        reasons.push(`High priority (${config.model.priority})`);
      }

      candidates.push({
        driver: config,
        reason: reasons.join('; ') || 'Default selection',
        score,
        warnings: warnings.length > 0 ? warnings : undefined
      });
    }

    // スコアでソート（降順）
    candidates.sort((a, b) => b.score - a.score);

    return candidates.length > 0 ? candidates[0] : null;
  }

  /**
   * IDでドライバを取得
   */
  getDriver(id: string): DriverConfig | undefined {
    return this.drivers.get(id);
  }

  /**
   * すべてのドライバを取得
   */
  getAllDrivers(): DriverConfig[] {
    return Array.from(this.drivers.values());
  }

  /**
   * ドライバインスタンスを作成
   */
  async createDriver(config: DriverConfig): Promise<AIDriver> {
    const factory = this.factories.get(config.model.provider);
    if (!factory) {
      throw new Error(`No factory registered for provider: ${config.model.provider}`);
    }
    
    return await factory(config);
  }

  /**
   * デフォルトドライバを取得
   */
  getDefaultDriver(): DriverConfig | undefined {
    if (!this.defaultDriverId) {
      // デフォルトが設定されていない場合は最初の有効なドライバを返す
      for (const config of this.drivers.values()) {
        if (config.model.enabled) {
          return config;
        }
      }
      return undefined;
    }
    return this.drivers.get(this.defaultDriverId);
  }

  /**
   * 簡易選択メソッド：能力配列から自動選択
   */
  async selectAndCreateDriver(
    capabilities: DriverCapability[],
    options?: {
      preferLocal?: boolean;
      preferFast?: boolean;
      providers?: DriverProvider[];
      excludeProviders?: DriverProvider[];
    }
  ): Promise<AIDriver | null> {
    const criteria: DriverSelectionCriteria = {
      requiredCapabilities: capabilities,
      ...options
    };

    const result = this.selectDriver(criteria);
    if (!result) {
      return null;
    }

    // 警告があれば出力
    if (result.warnings) {
      console.warn('Driver selection warnings:', result.warnings);
    }

    console.log(`Selected driver: ${result.driver.name} (${result.driver.id})`);
    console.log(`Reason: ${result.reason}`);

    try {
      return await this.createDriver(result.driver);
    } catch (error) {
      console.warn(`Failed to create driver: ${error}`);
      return null;
    }
  }
}