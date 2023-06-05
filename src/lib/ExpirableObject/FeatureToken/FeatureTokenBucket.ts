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
      throw new FeatureTokenBucketMaxUserTokensError(
        `${token.username} is out of tokens. Please wait until ${this.nextTokenTime(token.username)} before trying again.`
      );
    }
  }

  /**
   * Returns the most recent token submitted for a username
   * @param username string
   * @returns username's most recent FeatureToken
   */
  public newestToken(username: string): FeatureToken | undefined {
    let lastToken: FeatureToken | undefined;
    this.spentTokens(username)
      .forEach(token => {
        lastToken = token;
      });

    return lastToken;
  }

  /**
   * Returns a time string for when the next token will be available for a username
   * @param username string
   * @returns string with a timestamp
   */
  public nextTokenTime(username: string): string {
    return new Date(Date.now() + (this.oldestToken(username)?.ttl || 0))
      .toLocaleTimeString('en-US', { timeZone: 'UTC', timeStyle: 'long' });
  }

  /**
   * Returns the oldest token for a given username
   * @param username string
   * @returns Oldest FeatureToken, or undefined
   */
  public oldestToken(username: string): FeatureToken | undefined {
    let tokenTtl = Infinity, returnToken;
    this.spentTokens(username)
      .forEach(token => {
        if (token.ttl <= tokenTtl) {
          tokenTtl = token.ttl;
          returnToken = token;
        }
      });

    return (returnToken) ? returnToken : undefined;
  }

  /**
   * Removes the last token spent by a user. Useful in error-handling scenarios where a token
   * should be refunded.
   * @param username string
   */
  public removeNewestToken(username: string): void {
    const refundToken = this.newestToken(username);
    if (refundToken) this.remove(refundToken);
  }

  /**
   * Removes a token from the bucket.
   * @param token FeatureToken to be removed from the bucket
   */
  public remove(token: FeatureToken): void {
    const tokenIndex = (super.objects).findIndex(object => (object === token));
    if (tokenIndex !== -1) {
      (super.objects).splice(tokenIndex, 1);
    }
  }

  /**
   * Returns tokens spent by a specified username
   * @param username string
   * @returns FeatureToken array
   */
  public spentTokens(username: string): FeatureToken[] {
    return (super.objects as FeatureToken[])
      .filter(token => (token.username === username));
  }

  /**
   * Returns a remaining token count for a given username
   * @param username string
   * @returns number of tokens remaining in a bucket
   */
  public tokensRemaining(username: string): number {
    return this._maxTokensPerUser - this.spentTokens(username).length;
  }

}