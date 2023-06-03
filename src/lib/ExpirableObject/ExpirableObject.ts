import {
  ExpirableObjectConfiguration,
  ExpirableObjectEvents,
} from '../ExpirableObject';
import { EventEmitter } from 'events';

/**
 * Generic base class for an expirable object, like a history message or a feature token
 */
export class ExpirableObject {

  public events = new EventEmitter();
  private _expireSec: number;
  private _timestamp: number;

  /**
   * Creates a new ExpirableObject
   * @param config ExpirableObjectConfiguration
   */
  constructor(config: ExpirableObjectConfiguration) {
    this._expireSec = config.expireSec;
    this._timestamp = new Date().getTime();
    this._startExpirationTimer();
  }

  /**
   * Starts a clock that will emit an ObjectExpired event when TTL has run out
   */
  private _startExpirationTimer(): void {
    setInterval(() => {
      if (this.ttl <= 0) {
        this.events.emit(ExpirableObjectEvents.ObjectExpired, this);
      }
    }, 1000);
  }

  /**
   * Gets expireSec
   * @returns number (of seconds after creation to expire)
   */
  get expireSec(): number {
    return this._expireSec;
  }

  /**
   * Gets timestamp
   * @returns number (Unix epoch time)
   */
  get timestamp(): number {
    return this._timestamp;
  }

  /**
   * Gets ttl
   * @returns number (of milliseconds before expiry)
   */
  get ttl(): number {
    const expireTime = this.timestamp + (this.expireSec * 1000);
    return (expireTime - new Date().getTime());
  }

}