import {
  ClientOptions,
  RequestOptions,
  ResponseFormat,
  ResponsePayload,
} from './CreateImage.types';

import { OpenAI } from 'openai';

/**
 * A class for interfacing with the OpenAI createImage API
 */
export class CreateImage {
  private client: OpenAI;

  /**
   * Creates an instance of the OpenAI class with required configuration to use the OpenAI API.
   * @param options ClientOptions
   */
  constructor(options: ClientOptions) {
    this.client = new OpenAI({ ...options });
  }

  /**
   * Generates an image for the given prompt.
   *   (https://platform.openai.com/docs/api-reference/images/create)
   * @param request RequestPayloadOptions
   * @returns Promise<ResponsePayload>
   */
  public async createImage(request: RequestOptions): Promise<ResponsePayload> {
    const response = await this.client.images.generate({ ...request });

    const responsePayload: ResponsePayload = {
      created: response.created,
      data: (request.response_format === ResponseFormat.URL)
        ? response.data.map(data =>
          ({
            url: String(data.url),
            revised_prompt: String(data.revised_prompt),
          }))
        : response.data.map(data =>
          ({
            b64_json: String(data.b64_json),
            revised_prompt: String(data.revised_prompt),
          })),
    };

    return responsePayload;
  }
}
