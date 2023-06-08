import {
  HistoryMessage,
  HistoryMessageBucketConfiguration,
} from '../index';
import { ExpirableObjectBucket } from '../ExpirableObjectBucket';

/**
 * Constructs a HistoryMessageBucket, used for rate limiting user activities that may be expensive.
 */
export class HistoryMessageBucket extends ExpirableObjectBucket {

  /**
   * Constructs a new FeatureTokenBucket
   * @param config FeatureTokenBucketConfiguration
   */
  constructor(config: HistoryMessageBucketConfiguration) {
    super({ objectExpireSec: config.historyMessageExpireSec });
  }

  /**
   * Add token to bucket
   * @param historyMessage FeatureToken
   * @throws FeatureTokenBucketMaxUserTokensError
   */
  public add(historyMessage: HistoryMessage): void {
    super.add(historyMessage);
  }

}