import { CreateImageResponseConfiguration } from './index';

/**
 * Controls message adherence to the OpenAI payload specification.
 * API doc: https://platform.openai.com/docs/api-reference/images/create
 */
export class CreateImageResponse {

  public created: number;
  public data: { url: string }[] | { b64_json: string }[];

  /**
   * Construcs a PayloadMessage object
   * @param payload PayloadMessage
   */
  constructor(payload: CreateImageResponseConfiguration) {
    this.created = payload.created;
    this.data = payload.data;
  }

}