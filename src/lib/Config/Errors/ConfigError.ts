/**
 * To be thrown for a configuration failure in the ConfigTemplate module.
 */
export class ConfigError extends Error {
  /**
   * Constructs a ConfigError
   * @param message Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}
