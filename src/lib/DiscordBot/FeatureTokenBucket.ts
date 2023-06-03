import { ExpirableObjectBucket } from '../ExpirableObject';
import { FeatureToken } from './FeatureToken';

/**
 * Constructs a FeatureTokenBucket, used for rate limiting user activities that may be expensive.
 */
export class FeatureTokenBucket extends ExpirableObjectBucket {

  /**
   * Constructs a new FeatureTokenBucket
   */
  constructor() {
    super();
  }

  /**
   * Returns a token count matching the specified feature and username
   * @param feature string
   * @param username string
   * @returns number of tokens in a bucket
   */
  public tokenCount(feature: string, username: string): number {
    const featureTokens = (super.objects as FeatureToken[]);
    const filteredTokens = featureTokens.filter(token => (token.feature == feature && token.username == username));
    return filteredTokens.length;
  }

}