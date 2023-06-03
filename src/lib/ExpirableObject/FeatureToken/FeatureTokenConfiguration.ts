import { ExpirableObjectConfiguration } from '../index';

/**
 * Specifies a configuration for a new FeatureToken
 */
export interface FeatureTokenConfiguration extends ExpirableObjectConfiguration {
  username: string;
}