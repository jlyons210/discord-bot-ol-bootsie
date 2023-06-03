import { ExpirableObject } from '../ExpirableObject';
import { FeatureTokenConfiguration } from './index';

/**
 * A token that is used to rate limit client activities
 */
export class FeatureToken extends ExpirableObject {

  private _config: FeatureTokenConfiguration;

  /**
   * Constructs a FeatureToken object
   * @param config A populated FeatureTokenConfiguration
   */
  constructor(config: FeatureTokenConfiguration) {
    super({ expireSec: config.expireSec });
    this._config = config;
  }

  /**
   * Gets feature name
   * @returns string
   */
  get feature(): string {
    return this._config.feature;
  }

  /**
   * Gets username
   * @returns string
   */
  get username(): string {
    return this._config.username;
  }

}