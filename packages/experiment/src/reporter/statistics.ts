/**
 * Statistics reporter
 */

import type { RunResult, TestResult } from '../types.js';

export class StatisticsReporter {
  constructor(private results: TestResult[]) {}

  /**
   * Generate and display statistics report
   */
  report(): void {
    console.log();
    console.log('='.repeat(80));
    console.log('📊 Statistics Summary');
    console.log('='.repeat(80));
    console.log();

    for (const result of this.results) {
      console.log(`${result.testCase} - ${result.model} - [${result.module.toUpperCase()}]`);
      console.log('─'.repeat(80));

      const successRuns = result.runs.filter(r => r.success);
      const successRate = (successRuns.length / result.runs.length) * 100;

      console.log(`Success rate: ${successRuns.length}/${result.runs.length} (${successRate.toFixed(1)}%)`);

      if (successRuns.length > 0) {
        this.reportTiming(successRuns);
        this.reportConsistency(successRuns);
      }

      console.log();
    }

    console.log('='.repeat(80));
  }

  /**
   * Report timing statistics
   */
  private reportTiming(runs: RunResult[]): void {
    const times = runs.map(r => r.elapsed);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    console.log(`Execution time: avg=${avg.toFixed(0)}ms, min=${min}ms, max=${max}ms`);
  }

  /**
   * Report output consistency
   */
  private reportConsistency(runs: RunResult[]): void {
    // Extract JSON from output
    const jsonOutputs = runs.map(r => {
      const match = r.content.match(/```json\s*\n([\s\S]*?)\n```/);
      return match ? match[1].trim() : null;
    }).filter(j => j !== null);

    if (jsonOutputs.length === 0) {
      return;
    }

    const uniqueOutputs = new Set(jsonOutputs);
    console.log(`Output consistency: ${uniqueOutputs.size} unique output(s) from ${jsonOutputs.length} run(s)`);

    if (uniqueOutputs.size === 1) {
      console.log('✅ All outputs are identical');
    } else {
      console.log('⚠️  Outputs vary:');
      Array.from(uniqueOutputs).forEach((output, idx) => {
        const count = jsonOutputs.filter(j => j === output).length;
        console.log(`   Variant ${idx + 1} (${count}x): ${output}`);
      });
    }
  }
}
