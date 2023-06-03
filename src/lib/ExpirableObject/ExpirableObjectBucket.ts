import {
  ExpirableObject,
  ExpirableObjectBucketConfiguration,
  ExpirableObjectEvents,
} from './index';

/**
 * Generic base class for an expirable object bucket
 */
export class ExpirableObjectBucket {

  private _objects: ExpirableObject[] = [];
  private _objectExpireSec: number;

  /**
   * Creates a new ExpirableObjectBucket
   * @param config ExpireableObjectBucketConfiguration
   */
  constructor(config: ExpirableObjectBucketConfiguration) {
    this._objectExpireSec = config.objectExpireSec;
  }

  /**
   * Adds a new ExpirableObject to the bucket with an expiration event handler
   * @param object ExpirableObject to add to the bucket
   */
  public add(object: ExpirableObject): void {
    object.expireSec = this._objectExpireSec;
    object.events.on(ExpirableObjectEvents.ObjectExpired, () => {
      this._objects = this._objects.filter(obj => obj !== object);
    });
    this._objects.push(object);
  }

  /**
   * Gets objects
   * @returns ExpirableObject[]
   */
  get objects(): ExpirableObject[] {
    return this._objects;
  }

}