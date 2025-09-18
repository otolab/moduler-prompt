/**
 * Spinner for loading indication
 */

/* global setInterval, clearInterval, NodeJS */

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export class Spinner {
  private idx = 0;
  private message: string = '';
  private output: typeof process.stderr = process.stderr;
  private intervalId: NodeJS.Timeout | null = null;
  private isSpinning = false;

  constructor() {}

  start(message?: string) {
    if (this.isSpinning) {
      this.stop();
    }

    if (message) this.message = message;
    this.isSpinning = true;
    this.put();

    // Start animation
    this.intervalId = setInterval(() => {
      this.put();
    }, 80);
  }

  put() {
    const spinner = FRAMES[this.idx];
    this.output.write(`\r${spinner}  ${this.message}`);
    this.idx = (this.idx + 1) % FRAMES.length;
  }

  stop(message?: string) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Clear the line
    const line = (message || '').padEnd(this.message.length + 3, ' ');
    this.output.write(`\r${line}\r`);

    this.isSpinning = false;
    this.idx = 0;
    this.message = '';
  }

  update(message: string) {
    this.message = message;
    if (this.isSpinning) {
      this.put();
    }
  }
}