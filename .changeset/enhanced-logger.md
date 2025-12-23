---
"@modular-prompt/utils": minor
"@modular-prompt/experiment": patch
---

Enhanced logger system with async file output and improved output handling

**@modular-prompt/utils**
- Add `Logger` class with context support and log level filtering
- Add async `flush()` method for explicit file writes (JSONL format)
- Separate file write queue from memory accumulation
- Fix output destination: info/verbose/debug to stdout in normal mode, stderr in MCP mode
- Add `logger.context()` method for creating context-specific loggers
- Add context filtering to `getLogEntries()` and `getLogStats()`

**@modular-prompt/experiment**
- Integrate enhanced logger with `--log-file` and `--verbose` options
- Move detailed progress info to `logger.verbose()`
- Add package-specific logger with 'experiment' prefix
