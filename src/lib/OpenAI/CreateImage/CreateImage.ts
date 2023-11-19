import {
  CreateImageConfiguration,
  CreateImagePayloadConfiguration,
  CreateImageResponse,
  CreateImageResponseFormat,
} from '../index';
import { Logger } from '../../Logger';
import { OpenAI } from 'openai';

/**
 * A class for interfacing with the OpenAI createImage API
 */
export class CreateImage {

  private _config: CreateImageConfiguration;
  private _client: OpenAI;
  private _logger = new Logger();

  /**
   * Creates an instance of the OpenAI class with required configuration to use the OpenAI API.
   * @param config A populated OpenAIConfig
   */
  public constructor(config: CreateImageConfiguration) {
    this._config = config;
    this._client = new OpenAI({
      apiKey: config.apiKey,
      maxRetries: config.maxRetries,
    });
  }

  /**
   * Generates an image for the given prompt.
   *   (https://platform.openai.com/docs/api-reference/images/create)
   * @param payload A populated ICreateImage payload
   * @returns Returns a URL to a generated image
   */
  public async createImage(payload: CreateImagePayloadConfiguration): Promise<CreateImageResponse> {
    const response = await this._client.images.generate({
      model: this._config.paramModel,
      prompt: payload.prompt,
      n: payload.numberOfImages,
      size: payload.size,
      response_format: payload.responseFormat,
      user: payload.user,
    });

    const responsePayload = new CreateImageResponse({
      created: response.created,
      data: (payload.responseFormat === CreateImageResponseFormat.URL) ?
        response.data.map(data => ({ url: String(data.url) })) :
        response.data.map(data => ({ b64_json: String(data.b64_json) })),
    });

    return responsePayload;
  }

}