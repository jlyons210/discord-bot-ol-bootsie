import { EventEmitter } from 'events';
import { ExpirableObjectEvents } from './index';

/**
 * Generic base class for an expirable object, like a history message or a feature token
 */
export class ExpirableObject {

  public events = new EventEmitter();
  private _expireSec = 0;
  private _timestamp: number;

  /**
   * Creates a new ExpirableObject
   */
  constructor() {
    this._timestamp = Date.now();
    this._startExpirationMonitor();
  }

  /**
   * Starts a clock that will emit an ObjectExpired event when TTL has run out
   */
  private _startExpirationMonitor(): void {
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
   * Sets expireSec
   * @param expireSec number of seconds
   */
  set expireSec(expireSec: number) {
    this._expireSec = expireSec;
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
    return (expireTime - Date.now());
  }

}