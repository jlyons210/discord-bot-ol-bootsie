import {
  CreateChatCompletionPayloadMessageConfiguration,
  CreateChatCompletionPayloadMessageRole,
  Utilities,
} from '../index.js';

/**
 * Controls message adherence to the OpenAI payload specification.
 * API doc: https://platform.openai.com/docs/api-reference/completions/create
 */
export class CreateChatCompletionPayloadMessage {
  public content: string;
  public name?: string;
  public role: CreateChatCompletionPayloadMessageRole;

  /**
   * Construcs a PayloadMessage object
   * @param {CreateChatCompletionPayloadMessageConfiguration} payload
   *   A configuration object for the PayloadMessage
   */
  constructor(payload: CreateChatCompletionPayloadMessageConfiguration) {
    this.content = payload.content;
    this.name = Utilities.sanitizeName(payload.name);
    this.role = payload.role;
  }
}
