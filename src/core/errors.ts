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

/**
 * A block-config validation failure: the block declares a configSchema (or an
 * allowedKeys list under --strict) and the YAML entry violated it.
 *
 * Sibling of ConfigError so the CLI can render both with the same path —
 * pattern-match on `err.formatted` either way.
 */
export class BlockConfigError extends Error {
  readonly formatted: string;
  readonly blockName: string;
  readonly entryIndex: number;

  constructor(blockName: string, entryIndex: number, formatted: string) {
    super(formatted);
    this.name = 'BlockConfigError';
    this.formatted = formatted;
    this.blockName = blockName;
    this.entryIndex = entryIndex;
  }
}
