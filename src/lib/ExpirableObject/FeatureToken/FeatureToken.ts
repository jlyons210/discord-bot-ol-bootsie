import { ExpirableObject } from '../ExpirableObject';
import { FeatureTokenConfiguration } from './index';

/**
 * A token that is used to rate limit client activities
 */
export class FeatureToken extends ExpirableObject {
  private config: FeatureTokenConfiguration;

  /**
   * Constructs a FeatureToken object
   * @param config A populated FeatureTokenConfiguration
   */
  constructor(config: FeatureTokenConfiguration) {
    super();
    this.config = config;
  }

  /**
   * Gets username
   * @returns string
   */
  get username(): string {
    return this.config.username;
  }
}
