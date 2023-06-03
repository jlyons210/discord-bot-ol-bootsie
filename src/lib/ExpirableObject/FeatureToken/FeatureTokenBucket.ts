import {
  FeatureToken,
  FeatureTokenBucketConfiguration,
  FeatureTokenBucketMaxUserTokensError,
} from './index';
import { ExpirableObjectBucket } from '../index';

/**
 * Constructs a FeatureTokenBucket, used for rate limiting user activities that may be expensive.
 */
export class FeatureTokenBucket extends ExpirableObjectBucket {

  private _maxTokensPerUser: number;

  /**
   * Constructs a new FeatureTokenBucket
   * @param config FeatureTokenBucketConfiguration
   */
  constructor(config: FeatureTokenBucketConfiguration) {
    super({ objectExpireSec: config.tokenExpireSec });
    this._maxTokensPerUser = config.maxTokens;
  }

  /**
   * Add token to bucket
   * @param token FeatureToken
   * @throws FeatureTokenBucketMaxUserTokensError
   */
  public add(token: FeatureToken): void {
    if (this.tokensRemaining(token.username)) {
      super.add(token);
    }
    else {
      throw new FeatureTokenBucketMaxUserTokensError(`Max tokens reached for ${token.username}. Please wait before trying again.`);
    }
  }

  /**
   * Returns a consumed token count for a given username
   * @param username string
   * @returns number of used tokens in a bucket
   */
  public tokensUsed(username: string): number {
    const featureTokens = (super.objects as FeatureToken[]);
    const filteredTokens = featureTokens.filter(token => (token.username == username));
    return filteredTokens.length;
  }

  /**
   * Returns a remaining token count for a given username
   * @param username string
   * @returns number of tokens remaining in a bucket
   */
  public tokensRemaining(username: string): number {
    return this._maxTokensPerUser - this.tokensUsed(username);
  }

}