import { ExpirableObject } from '../ExpirableObject.js';
import { FeatureTokenConfiguration } from './index.js';

/**
 * A token that is used to rate limit client activities
 */
export class FeatureToken extends ExpirableObject {
  private config: FeatureTokenConfiguration;

  /**
   * Constructs a FeatureToken object
   * @param {FeatureTokenConfiguration} config
   *   A populated FeatureTokenConfiguration
   */
  constructor(config: FeatureTokenConfiguration) {
    super();
    this.config = config;
  }

  /**
   * Gets username
   * @returns {string} username
   */
  get username(): string {
    return this.config.username;
  }
}
