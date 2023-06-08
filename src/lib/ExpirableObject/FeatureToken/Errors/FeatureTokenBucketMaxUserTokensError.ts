/**
 * To be thrown when a user attempts to exceed their maximum tokens.
 */
export class FeatureTokenBucketMaxUserTokensError extends Error {
  /**
   * Constructs a FeatureTokenBucketMaxUserTokensError
   * @param message Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'FeatureTokenBucketMaxUserTokensError';
  }
}