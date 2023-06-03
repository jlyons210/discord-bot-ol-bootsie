import { ExpirableObjectConfiguration } from '../ExpirableObject';

/**
 * Specifies a configuration for a new FeatureToken
 */
export interface FeatureTokenConfiguration extends ExpirableObjectConfiguration {
  feature: string;
  username: string;
}