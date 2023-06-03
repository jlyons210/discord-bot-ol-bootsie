import {
  Configuration,
  OpenAIApi,
} from 'openai';
import {
  CreateImageConfiguration,
  CreateImagePayloadConfiguration,
  CreateImageResponse,
  OpenAIBadRequestError,
  OpenAIRetriesExceededError,
  OpenAIUnexpectedError,
} from './index';
import {
  LogLevel,
  Logger,
} from '../Logger';
import { AxiosError } from 'axios';
import { inspect } from 'util';

/**
 * A class for interfacing with the OpenAI createImage API
 */
export class CreateImage {

  private _config: CreateImageConfiguration;
  private _client: OpenAIApi;

  /**
   * Creates an instance of the OpenAI class with required configuration to use the OpenAI API.
   * @param config A populated OpenAIConfig
   */
  public constructor(config: CreateImageConfiguration) {
    this._config = config;
    this._client = new OpenAIApi(new Configuration({ apiKey: config.apiKey }));
  }

  /**
   * Generates an image for the given prompt.
   *   (https://platform.openai.com/docs/api-reference/images/create)
   * @param payload A populated ICreateImage payload
   * @returns Returns a URL to a generated image
   * @throws {OpenAIBadRequestError} Thrown if the OpenAI API returns a non-retriable 4XX error
   * @throws {OpenAIUnexpectedError} Thrown if for non-API errors
   * @throws {OpenAIRetriesExceededError} Thrown if all retries are exhausted without a response
   */
  public async createImage(payload: CreateImagePayloadConfiguration): Promise<CreateImageResponse> {
    let retriesLeft: number = this._config.maxRetries;
    while (retriesLeft--) {
      try {
        const response = await this._client.createImage({
          prompt: payload.prompt,
          n: payload.numberOfImages,
          size: payload.size,
          response_format: payload.responseFormat,
          user: payload.user,
        });

        const responseData = response.data;
        const responseUrls: { url: string }[] = [];
        response.data.data.forEach(e => {
          responseUrls.push({ url: String(e.url) });
        });

        const responsePayload = new CreateImageResponse({
          created: responseData.created,
          data: responseUrls,
        });

        Logger.log({
          message: `responsePayload =\n${inspect(responsePayload, false, null, true)}`,
          logLevel: LogLevel.Debug,
          debugEnabled: true,
        });

        return responsePayload;
      }
      catch (e) {
        if ((e as AxiosError).isAxiosError) {
          const axiosError = e as AxiosError;
          const apiStatus = axiosError.response?.status;
          const apiStatusText = axiosError.response?.statusText;

          if (apiStatus && (apiStatus === 429 || apiStatus >= 500)) {
            // TODO: Implement proper XBR logic
            setTimeout(async () => {
              void Logger.log({
                message: `An HTTP ${apiStatus} (${apiStatusText}) was returned. Retrying ${retriesLeft} time(s).`,
                logLevel: LogLevel.Error,
              });
            }, 1000);
          }
          else if (apiStatus && (apiStatus >= 400 && apiStatus <= 499)) {
            retriesLeft = 0;
            void Logger.log({
              message: `An HTTP ${apiStatus} (${apiStatusText}) was returned. This indicates a bad request. Not retrying.`,
              logLevel: LogLevel.Error,
            });
            throw new OpenAIBadRequestError(inspect(axiosError.response?.data, false, null, true));
          }
          else {
            retriesLeft = 0;
            void Logger.log({
              message: `An unknown API error occurred:\n${axiosError.response?.data}`,
              logLevel: LogLevel.Error,
            });
            throw new OpenAIUnexpectedError(inspect(axiosError.response?.data, false, null, true));
          }
        }
        else if (e instanceof Error) {
          void Logger.log({
            message: `An unknown error occurred:\n${inspect(e, false, null, true)}`,
            logLevel: LogLevel.Error,
          });
        }
      }
    }

    throw new OpenAIRetriesExceededError('Maximum OpenAI retries exceeded. Aborting.');
  }

}