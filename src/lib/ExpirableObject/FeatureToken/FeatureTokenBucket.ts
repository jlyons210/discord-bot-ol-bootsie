import {
  FeatureToken,
  FeatureTokenBucketConfiguration,
  FeatureTokenBucketMaxUserTokensError,
} from '../index.js';

import { ExpirableObjectBucket } from '../ExpirableObjectBucket.js';

/**
 * Constructs a FeatureTokenBucket, used for rate limiting user activities that may be expensive.
 */
export class FeatureTokenBucket extends ExpirableObjectBucket {
  private maxTokensPerUser: number;

  /**
   * Constructs a new FeatureTokenBucket
   * @param {FeatureTokenBucketConfiguration} config FeatureTokenBucketConfiguration
   */
  constructor(config: FeatureTokenBucketConfiguration) {
    super({
      objectExpireSec: config.tokenExpireSec,
    });
    this.maxTokensPerUser = config.maxTokens;
  }

  /**
   * Add token to bucket
   * @param {FeatureToken} token FeatureToken
   * @throws FeatureTokenBucketMaxUserTokensError
   */
  public add(token: FeatureToken): void {
    if (this.tokensRemaining(token.username)) {
      super.add(token);
    }
    else {
      throw new FeatureTokenBucketMaxUserTokensError(
        `${token.username} is out of tokens. Please wait until `
        + `${this.nextTokenTime(token.username)} before trying again.`,
      );
    }
  }

  /**
   * Returns the most recent token submitted for a username
   * @param {string} username string
   * @returns {FeatureToken|undefined} username's most recent FeatureToken
   */
  public newestToken(username: string): FeatureToken | undefined {
    let lastToken: FeatureToken | undefined;
    this.spentTokens(username)
      .forEach((token) => {
        lastToken = token;
      });

    return lastToken;
  }

  /**
   * Returns a time string for when the next token will be available for a username
   * @param {string} username string
   * @returns {string} string with a timestamp
   */
  public nextTokenTime(username: string): string {
    return new Date(Date.now() + (this.oldestToken(username)?.ttl || 0))
      .toLocaleTimeString('en-US', { timeZone: 'UTC', timeStyle: 'long' });
  }

  /**
   * Returns the oldest token for a given username
   * @param {string} username string
   * @returns {FeatureToken|undefined} Oldest FeatureToken, or undefined
   */
  public oldestToken(username: string): FeatureToken | undefined {
    let tokenTtl = Infinity, returnToken;
    this.spentTokens(username)
      .forEach((token) => {
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
   * @param {string} username string
   */
  public removeNewestToken(username: string): void {
    const refundToken = this.newestToken(username);
    if (refundToken) this.remove(refundToken);
  }

  /**
   * Removes a token from the bucket.
   * @param {FeatureToken} token FeatureToken to be removed from the bucket
   */
  public remove(token: FeatureToken): void {
    const tokenIndex = (super.objects).findIndex(object => (object === token));
    if (tokenIndex !== -1) {
      (super.objects).splice(tokenIndex, 1);
    }
  }

  /**
   * Returns tokens spent by a specified username
   * @param {string} username string
   * @returns {FeatureToken[]} FeatureToken array
   */
  public spentTokens(username: string): FeatureToken[] {
    return (super.objects as FeatureToken[])
      .filter(token => (token.username === username));
  }

  /**
   * Returns a remaining token count for a given username
   * @param {string} username string
   * @returns {number} number of tokens remaining in a bucket
   */
  public tokensRemaining(username: string): number {
    return this.maxTokensPerUser - this.spentTokens(username).length;
  }
}
