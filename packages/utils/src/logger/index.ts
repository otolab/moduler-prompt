/**
 * Simple logger for utils package
 */

/* eslint-disable no-console */

export enum LogLevel {
  QUIET = 0,  // ERROR only
  WARN = 1,   // ERROR + WARN
  INFO = 2,   // ERROR + WARN + INFO (default)
  LOG = 3,    // ERROR + WARN + INFO + LOG
  DEBUG = 4   // All levels
}

export interface LoggerOptions {
  level?: LogLevel;
  debug?: boolean;
  prefix?: string;
}

export class Logger {
  private level: LogLevel;
  private debugEnabled: boolean;
  private prefix: string;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.debugEnabled = options.debug ?? false;
    this.prefix = options.prefix ?? '';
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setDebug(debug: boolean): void {
    this.debugEnabled = debug;
  }

  private formatMessage(message: string): string {
    return this.prefix ? `[${this.prefix}] ${message}` : message;
  }

  log(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.LOG) {
      console.log(this.formatMessage(message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.INFO) {
      console.info(this.formatMessage(message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(this.formatMessage(message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.QUIET) {
      console.error(this.formatMessage(message), ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.debugEnabled && this.level >= LogLevel.DEBUG) {
      console.debug(this.formatMessage(message), ...args);
    }
  }
}

// Default logger instance
export const defaultLogger = new Logger();