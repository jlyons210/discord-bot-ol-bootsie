import { IPayloadMessage, PayloadMessageRole } from './index';

/**
 * Controls message adherence to the OpenAI payload specification.
 */
export class PayloadMessage {

  public content: string;
  public name?: string;
  public role: PayloadMessageRole;

  /**
   * Construcs a PayloadMessage object
   * @param payload PayloadMessage
   */
  constructor(payload: IPayloadMessage) {
    this.content = payload.content;
    this.name = (payload.role === PayloadMessageRole.User) ? payload.name : undefined;
    this.role = payload.role;
  }

}