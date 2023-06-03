import {
  ExpirableObject,
  ExpirableObjectEvents,
} from './index';

/**
 * Generic base class for an expirable object bucket
 */
export class ExpirableObjectBucket {

  private _objects: ExpirableObject[];

  /**
   * Creates a new ExpirableObjectBucket
   */
  constructor() {
    this._objects = [];
  }

  /**
   * Adds a new ExpirableObject to the bucket with an expiration event handler
   * @param object ExpirableObject to add to the bucket
   */
  public add(object: ExpirableObject): void {
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