import {
  ExpirableObject,
  ExpirableObjectBucketConfiguration,
  ExpirableObjectEvents,
} from './index.js';

/**
 * Generic base class for an expirable object bucket
 */
export class ExpirableObjectBucket {
  private objectExpireSec: number;

  /**
   * Creates a new ExpirableObjectBucket
   * @param {ExpirableObjectBucketConfiguration} config ExpireableObjectBucketConfiguration
   */
  constructor(config: ExpirableObjectBucketConfiguration) {
    this.objectExpireSec = config.objectExpireSec;
  }

  /**
   * Adds a new ExpirableObject to the bucket with an expiration event handler
   * @param {ExpirableObject} object ExpirableObject to add to the bucket
   */
  public add(object: ExpirableObject): void {
    object.expireSec = this.objectExpireSec;
    object.events.on(ExpirableObjectEvents.ObjectExpired, () => {
      this._objects = this._objects.filter(obj => obj !== object);
    });
    this._objects.push(object);
  }

  /**
   * Gets objects
   * @returns {ExpirableObject[]} ExpirableObject[]
   */
  get objects(): ExpirableObject[] {
    return this._objects;
  }

  // Backing field for objects
  private _objects: ExpirableObject[] = [];
}
