import axios from 'axios';
import { Configuration, OpenAIApi } from 'openai';
import { Logger } from '../Logger';
import * as path from 'path';
import { inspect } from 'util';
import { HistoryMessage } from '../DiscordBot';
import { PromptMessage, PromptMessageRole } from './';

export class OpenAI {

  // Create and authenticate OpenAI client
  private _openAiClient = new OpenAIApi(
    new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

  // Construct a prompt payload using an overridable system prompt and single message
  async constructOneOffPayload(messageText: string, systemPromptOverride?: string) {
    const payload: PromptMessage[] = [];
    payload.push(await this.constructSystemPrompt(systemPromptOverride));

    payload.push({
      role: PromptMessageRole.user,
      name: path.basename(__filename, '.ts'),
      content: messageText,
    });

    return payload;
  }

  // Construct a prompt payload using the configured system prompt and message history
  async constructPromptPayload(messageHistory: HistoryMessage[], threadSignature: string, systemPromptOverride?: string) {
    const payload: PromptMessage[] = [];
    payload.push(await this.constructSystemPrompt(systemPromptOverride));

    messageHistory.forEach(async message => {
      if (message.threadSignature == threadSignature && message.isPromptContext) {
        payload.push({
          role: message.role,
          content: message.messageText,
          // If name != undefined in a [role: 'assistant'] payload, OpenAI API returns a 400 error
          name: (message.role == 'assistant') ? undefined : message.username,
        });
      }
    });

    return payload;
  }

  // Returns a system prompt using the configured or overridden system prompt
  async constructSystemPrompt(systemPromptOverride?: string): Promise<PromptMessage> {
    const systemPrompt: string = (systemPromptOverride === undefined) ?
      process.env.OPENAI_PARAM_SYSTEM_PROMPT || '' :
      systemPromptOverride;

    const payload: PromptMessage = {
      role: PromptMessageRole.system,
      content: systemPrompt,
    };

    return payload;
  }

  // Generate a retry message to handle unknown issue
  async generateTryAgainMessage() {
    const prompt = 'In one short sentence, tell me that you don\'t understand what I meant by what I said.';
    const payload = await this.constructOneOffPayload(prompt);
    const responseText = await this.requestChatCompletion(payload);

    return responseText;
  }

  // Request chat completion from OpenAI API
  public async requestChatCompletion(payload: PromptMessage[]): Promise<string | undefined> {
    let response, responseText = '';
    let retriesLeft: number = parseInt(process.env.OPENAI_MAX_RETRIES || '');

    while (retriesLeft--) {
      try {
        response = await this._openAiClient.createChatCompletion({
          max_tokens: parseInt(process.env.OPENAI_PARAM_MAX_TOKENS || ''),
          model: process.env.OPENAI_PARAM_MODEL || '',
          messages: payload,
          temperature: parseFloat(process.env.OPENAI_PARAM_TEMPERATURE || ''),
        });

        responseText = response.data.choices[0].message?.content || '';
        return responseText.trim();
      }
      catch (e) {
        if (axios.isAxiosError(e) && e.response !== undefined) {
          const apiStatus = e.response.status;
          const apiStatusText = e.response.statusText;

          if (apiStatus == 429 || apiStatus >= 500) {
            setTimeout(async () => {
              await Logger.log(`An HTTP ${apiStatus} (${apiStatusText}) was returned. Retrying ${retriesLeft} time(s).`, 'error');
            }, 1000);
          }
          else {
            retriesLeft = 0;
            await Logger.log(`An HTTP ${apiStatus} (${apiStatusText}) was returned. This indicates a bad request. Not retrying.`, 'error');
            throw new Error(inspect(e.response.data, false, null, true));
          }
        }
        else {
          throw e;
        }
      }
    }
  }
}