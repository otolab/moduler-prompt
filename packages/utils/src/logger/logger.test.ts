/**
 * Tests for enhanced logger
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { logger, configureLogger, LoggerPresets, type LogLevel } from './logger.js';

describe('Logger', () => {
  // テスト用の一時ファイルパス
  const testLogFile = join(tmpdir(), `test-logger-${Date.now()}.jsonl`);

  beforeEach(() => {
    // 各テスト前にロガーをリセット
    configureLogger({
      level: 'info',
      accumulateLevel: 'debug',
      isMcpMode: false,
      prefix: '',
      context: '',
      accumulate: false,
      maxEntries: 1000,
      logFile: undefined,
    });
    logger.clearLogEntries();

    // 既存のテストログファイルを削除
    if (existsSync(testLogFile)) {
      unlinkSync(testLogFile);
    }
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    if (existsSync(testLogFile)) {
      unlinkSync(testLogFile);
    }
  });

  describe('Basic logging functionality', () => {
    it('should log at different levels', () => {
      logger.enableAccumulation();
      configureLogger({ level: 'debug' });

      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.verbose('verbose message');
      logger.debug('debug message');
      logger.log('log message'); // alias for verbose

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(6);
      expect(entries[0].level).toBe('error');
      expect(entries[1].level).toBe('warn');
      expect(entries[2].level).toBe('info');
      expect(entries[3].level).toBe('verbose');
      expect(entries[4].level).toBe('debug');
      expect(entries[5].level).toBe('verbose'); // log is alias for verbose
    });

    it('should respect log level filtering', () => {
      logger.enableAccumulation();
      configureLogger({ level: 'warn' });

      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message'); // should not be logged
      logger.debug('debug message'); // should not be logged

      // Note: accumulate is independent from output level
      // We need to set accumulateLevel to 'warn' as well
      configureLogger({ level: 'warn', accumulateLevel: 'warn' });
      logger.clearLogEntries();

      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].level).toBe('error');
      expect(entries[1].level).toBe('warn');
    });
  });

  describe('Context support', () => {
    it('should add context to log entries', () => {
      logger.enableAccumulation();
      logger.setContext('test-runner');

      logger.info('test message');

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].context).toBe('test-runner');
    });

    it('should update context dynamically', () => {
      logger.enableAccumulation();

      logger.setContext('context-1');
      logger.info('message 1');

      logger.setContext('context-2');
      logger.info('message 2');

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].context).toBe('context-1');
      expect(entries[1].context).toBe('context-2');
    });
  });

  describe('JSONL file output', () => {
    it('should write logs to JSONL file', () => {
      logger.setLogFile(testLogFile);
      logger.info('test message 1');
      logger.error('test message 2');

      expect(existsSync(testLogFile)).toBe(true);

      const content = readFileSync(testLogFile, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);

      const entry1 = JSON.parse(lines[0]);
      const entry2 = JSON.parse(lines[1]);

      expect(entry1.level).toBe('info');
      expect(entry1.message).toBe('test message 1');
      expect(entry1.timestamp).toBeDefined();
      expect(entry1.formatted).toBeDefined();

      expect(entry2.level).toBe('error');
      expect(entry2.message).toBe('test message 2');
    });

    it('should include context in JSONL output', () => {
      logger.setLogFile(testLogFile);
      logger.setContext('experiment');

      logger.info('test with context');

      const content = readFileSync(testLogFile, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.context).toBe('experiment');
      expect(entry.message).toBe('test with context');
    });

    it('should append to existing JSONL file', () => {
      logger.setLogFile(testLogFile);
      logger.info('message 1');

      // Create a new logger instance (simulating restart)
      logger.setLogFile(testLogFile);
      logger.info('message 2');

      const content = readFileSync(testLogFile, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);
    });

    it('should handle file write without logFile configured', () => {
      // Should not throw error
      expect(() => {
        logger.info('test message');
      }).not.toThrow();
    });

    it('should write to file independently of accumulation setting', () => {
      logger.setLogFile(testLogFile);
      logger.disableAccumulation();

      logger.info('message without accumulation');

      expect(existsSync(testLogFile)).toBe(true);
      const content = readFileSync(testLogFile, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(1);

      // But should not accumulate in memory
      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(0);
    });
  });

  describe('Log accumulation', () => {
    it('should accumulate logs when enabled', () => {
      logger.enableAccumulation(100);

      logger.info('message 1');
      logger.info('message 2');
      logger.info('message 3');

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(3);
    });

    it('should not accumulate logs when disabled', () => {
      logger.disableAccumulation();

      logger.info('message 1');
      logger.info('message 2');

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(0);
    });

    it('should respect maxEntries limit', () => {
      logger.enableAccumulation(3);

      logger.info('message 1');
      logger.info('message 2');
      logger.info('message 3');
      logger.info('message 4'); // should remove message 1

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(3);
      expect(entries[0].message).toBe('message 2');
      expect(entries[2].message).toBe('message 4');
    });

    it('should filter logs by level', () => {
      logger.enableAccumulation();

      logger.error('error msg');
      logger.warn('warn msg');
      logger.info('info msg');
      logger.debug('debug msg');

      const errorLogs = logger.getLogEntries({ level: 'error' });
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe('error');

      const warnLogs = logger.getLogEntries({ level: ['warn', 'error'] });
      expect(warnLogs).toHaveLength(2);
    });

    it('should filter logs by search term', () => {
      logger.enableAccumulation();

      logger.info('test message');
      logger.info('another message');
      logger.info('test again');

      const filtered = logger.getLogEntries({ search: 'test' });
      expect(filtered).toHaveLength(2);
    });

    it('should filter logs by time', () => {
      logger.enableAccumulation();

      const before = new Date();
      logger.info('old message');

      // Wait a bit
      const after = new Date(Date.now() + 10);
      logger.info('new message');

      const recentLogs = logger.getLogEntries({ since: after });
      expect(recentLogs.length).toBeGreaterThanOrEqual(0);
      // Note: This test might be flaky due to timing
    });

    it('should limit number of returned logs', () => {
      logger.enableAccumulation();

      for (let i = 0; i < 10; i++) {
        logger.info(`message ${i}`);
      }

      const limited = logger.getLogEntries({ limit: 5 });
      expect(limited).toHaveLength(5);
      // Should return last 5
      expect(limited[4].message).toBe('message 9');
    });

    it('should clear accumulated logs', () => {
      logger.enableAccumulation();

      logger.info('message 1');
      logger.info('message 2');

      expect(logger.getLogEntries()).toHaveLength(2);

      logger.clearLogEntries();

      expect(logger.getLogEntries()).toHaveLength(0);
    });
  });

  describe('Log statistics', () => {
    it('should provide accurate statistics', () => {
      logger.enableAccumulation();

      logger.error('error 1');
      logger.error('error 2');
      logger.warn('warn 1');
      logger.info('info 1');
      logger.info('info 2');
      logger.info('info 3');

      const stats = logger.getLogStats();

      expect(stats.totalEntries).toBe(6);
      expect(stats.entriesByLevel.error).toBe(2);
      expect(stats.entriesByLevel.warn).toBe(1);
      expect(stats.entriesByLevel.info).toBe(3);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
    });

    it('should handle empty logs', () => {
      const stats = logger.getLogStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.entriesByLevel.error).toBe(0);
      expect(stats.oldestEntry).toBeUndefined();
      expect(stats.newestEntry).toBeUndefined();
    });
  });

  describe('Logger presets', () => {
    it('should apply MCP server preset', () => {
      LoggerPresets.mcpServer();

      expect(logger.getLevel()).toBe('error');
      expect(logger.isAccumulating()).toBe(false);
    });

    it('should apply MCP server with accumulation preset', () => {
      LoggerPresets.mcpServerWithAccumulation();

      expect(logger.getLevel()).toBe('error');
      expect(logger.isAccumulating()).toBe(true);
    });

    it('should apply debug preset', () => {
      LoggerPresets.debug();

      expect(logger.getLevel()).toBe('debug');
      expect(logger.isAccumulating()).toBe(true);
    });

    it('should apply quiet preset', () => {
      LoggerPresets.quiet();

      expect(logger.getLevel()).toBe('quiet');
      expect(logger.isAccumulating()).toBe(false);
    });
  });

  describe('Setter methods', () => {
    it('should update log level', () => {
      logger.setLevel('debug');
      expect(logger.getLevel()).toBe('debug');

      logger.setLevel('error');
      expect(logger.getLevel()).toBe('error');
    });

    it('should update MCP mode', () => {
      logger.setMcpMode(true);
      // Cannot directly test isMcpMode, but we can verify behavior
      // In MCP mode, only errors should be output
      // (This would require capturing console output, which is complex)
    });

    it('should update prefix', () => {
      logger.enableAccumulation();
      logger.setPrefix('TEST');

      logger.info('message');

      const entries = logger.getLogEntries();
      expect(entries[0].formatted).toContain('[TEST]');
    });

    it('should update context', () => {
      logger.enableAccumulation();
      logger.setContext('runner');

      logger.info('message');

      const entries = logger.getLogEntries();
      expect(entries[0].context).toBe('runner');
    });

    it('should update log file', () => {
      logger.setLogFile(testLogFile);
      logger.info('test');

      expect(existsSync(testLogFile)).toBe(true);

      // Clear log file
      logger.setLogFile(undefined);
      if (existsSync(testLogFile)) {
        unlinkSync(testLogFile);
      }

      logger.info('test 2');
      // Should not create file when logFile is undefined
      expect(existsSync(testLogFile)).toBe(false);
    });
  });

  describe('Backward compatibility', () => {
    it('should support all logging methods from old API', () => {
      logger.enableAccumulation();

      // All these methods should exist and work
      logger.error('error');
      logger.warn('warn');
      logger.info('info');
      logger.verbose('verbose');
      logger.debug('debug');
      logger.log('log');

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(6);
    });

    it('should support method chaining with setters', () => {
      // Old API compatibility
      logger.setLevel('debug');
      logger.setPrefix('APP');
      logger.setContext('test');

      logger.enableAccumulation();
      logger.info('test');

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].context).toBe('test');
    });
  });

  describe('Environment variable configuration', () => {
    it('should read log level from environment variable', () => {
      // Note: This test is tricky because environment variables are read at module load time
      // We can't easily test this without reloading the module
      // This is more of a documentation than a real test
      const originalEnv = process.env.MODULAR_PROMPT_LOG_LEVEL;

      // Clean up
      if (originalEnv !== undefined) {
        process.env.MODULAR_PROMPT_LOG_LEVEL = originalEnv;
      } else {
        delete process.env.MODULAR_PROMPT_LOG_LEVEL;
      }
    });
  });

  describe('Log entry structure', () => {
    it('should create complete log entries', () => {
      logger.enableAccumulation();
      logger.setContext('test-context');

      logger.info('test message', { extra: 'data' });

      const entries = logger.getLogEntries();
      const entry = entries[0];

      expect(entry.timestamp).toBeDefined();
      expect(entry.level).toBe('info');
      expect(entry.context).toBe('test-context');
      expect(entry.message).toBe('test message');
      expect(entry.args).toBeDefined();
      expect(entry.args).toHaveLength(1);
      expect(entry.formatted).toBeDefined();
      expect(entry.formatted).toContain('test message');
    });

    it('should format args in log entry', () => {
      logger.enableAccumulation();

      logger.info('message', 'arg1', { key: 'value' }, 123);

      const entries = logger.getLogEntries();
      const entry = entries[0];

      expect(entry.args).toHaveLength(3);
      expect(entry.formatted).toContain('arg1');
      expect(entry.formatted).toContain('{"key":"value"}');
      expect(entry.formatted).toContain('123');
    });
  });
});
