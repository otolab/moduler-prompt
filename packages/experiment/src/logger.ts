/**
 * Experiment package logger
 */

import { Logger } from '@modular-prompt/utils';

/**
 * Experiment package logger with 'experiment' prefix
 */
export const logger = new Logger({ prefix: 'experiment', context: 'main' });
