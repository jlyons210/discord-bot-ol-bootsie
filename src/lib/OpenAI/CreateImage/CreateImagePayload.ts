import {
  CreateImagePayloadConfiguration,
  CreateImageResponseFormat,
  CreateImageSize,
  Utilities,
} from '../index';

/**
 * Controls message adherence to the OpenAI payload specification.
 * API doc: https://platform.openai.com/docs/api-reference/completions/create
 */
export class CreateImagePayload {

  public n: number;
  public prompt: string;
  public response_format: CreateImageResponseFormat;
  public size: CreateImageSize;
  public user?: string;

  /**
   * Construcs a PayloadMessage object
   * @param payload PayloadMessage
   */
  constructor(payload: CreateImagePayloadConfiguration) {
    this.n = payload.numberOfImages;
    this.prompt = payload.prompt;
    this.response_format = payload.responseFormat;
    this.size = payload.size;
    this.user = Utilities.sanitizeName(payload.user);
  }

}