import {
  HistoryMessage,
  HistoryMessageBucketConfiguration,
} from '../index.js';

import { ExpirableObjectBucket } from '../ExpirableObjectBucket.js';

/**
 * Constructs a HistoryMessageBucket, used for rate limiting user activities that may be expensive.
 */
export class HistoryMessageBucket extends ExpirableObjectBucket {
  /**
   * Constructs a new FeatureTokenBucket
   * @param {HistoryMessageBucketConfiguration} config HistoryMessageBucketConfiguration
   */
  constructor(config: HistoryMessageBucketConfiguration) {
    super({
      objectExpireSec: config.historyMessageExpireSec,
    });
  }

  /**
   * Add token to bucket
   * @param {HistoryMessage} historyMessage HistoryMessage
   * @throws FeatureTokenBucketMaxUserTokensError
   */
  public add(historyMessage: HistoryMessage): void {
    super.add(historyMessage);
  }

  /**
   * Get objects
   * @returns {HistoryMessage[]} HistoryMessage[]
   */
  public get objects(): HistoryMessage[] {
    return super.objects as HistoryMessage[];
  }
}
