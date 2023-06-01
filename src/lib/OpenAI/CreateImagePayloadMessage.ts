import {
  CreateImageResponseFormat,
  CreateImageSize,
  ICreateImagePayloadMessage,
  Utilities,
} from './index';

/**
 * Controls message adherence to the OpenAI payload specification.
 */
export class CreateImagePayloadMessage {

  public created: number;
  public data: {
    url: string
  };

  /**
   * Construcs a PayloadMessage object
   * @param payload PayloadMessage
   */
  constructor(payload: ICreateImagePayloadMessage) {
    this.created = payload
    this.prompt = payload.prompt;
    this.n = payload.n;
    this.size = payload.size;
    this.response_format = payload.response_format;
    this.user = Utilities.sanitizeName(payload.user);
  }

}