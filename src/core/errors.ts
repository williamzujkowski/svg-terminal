/**
 * Configuration errors with actionable, single-source-of-truth formatting.
 * Thrown by loadConfig; the CLI renders them without a stack trace.
 */

/** A config-level error: bad YAML, schema violation, unknown theme/block. */
export class ConfigError extends Error {
  /** Pre-formatted multi-line message ready for stderr. */
  readonly formatted: string;

  constructor(formatted: string) {
    super(formatted);
    this.name = 'ConfigError';
    this.formatted = formatted;
  }
}
