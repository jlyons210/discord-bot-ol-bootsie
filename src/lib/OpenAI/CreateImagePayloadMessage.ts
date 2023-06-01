import {
  CreateImageResponseFormat,
  CreateImageSize,
  ICreateImagePayloadMessage,
} from './index';

/**
 * Controls message adherence to the OpenAI payload specification.
 */
export class CreateImagePayloadMessage {

  public prompt: string;
  public n: number;
  public size: CreateImageSize;
  public response_format: CreateImageResponseFormat;
  public user?: string;

  /**
   * Construcs a PayloadMessage object
   * @param payload PayloadMessage
   */
  constructor(payload: ICreateImagePayloadMessage) {
    this.prompt = payload.prompt;
    this.n = payload.numberOfImages;
    this.size = payload.size;
    this.response_format = payload.responseFormat;
    this.user = this._sanitizeName(payload.user);
  }

  /**
   * Sanitizes Discord usernames to fit OpenAI's name field requirements
   * @param name Unchecked username
   * @returns Sanitized username
   */
  private _sanitizeName(name: string | undefined): string | undefined {
    if (name) {
      const expOpenAiAllowed = /^[a-zA-Z0-9_-]{1,64}$/;
      const expReplace = /[^a-zA-Z0-9_-]/g;
      const sanitized = name.replace(expReplace, '_');
      return (expOpenAiAllowed.test(sanitized)) ? sanitized : undefined;
    }
    else {
      return name;
    }
  }

}