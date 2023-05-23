import { Configuration, OpenAIApi } from 'openai';
import { Logger } from '../Logger';
import * as path from 'path';
import { inspect } from 'util';

interface PromptMessage {
  content: string;
  name?: string;
  role: PromptMessageRole
}

enum PromptMessageRole {
  'assistant' = 'assistant',
  'system' = 'system',
  'user' = 'user',
}

export class OpenAI {

  // Create and authenticate OpenAI client
  private const _openAiClient = new OpenAIApi(
    new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

  // Construct a prompt payload using an overridable system prompt and single message
  export async constructOneOffPayload(messageText: string, systemPromptOverride: string) {
    const payload = await constructSystemPrompt(systemPromptOverride);

    payload.push({
      role: 'user',
      name: path.basename(__filename, '.js'),
      content: messageText,
    });

    return payload;
  };

  // Construct a prompt payload using the configured system prompt and message history
  module.exports.constructPromptPayload = async function(messageHistory, threadSignature, systemPromptOverride) {

    // Start message payload with system prompt
    const payload = await constructSystemPrompt(systemPromptOverride);

    // Add previous messages matching thread signature
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

  };

  // Returns a system prompt using the configured or overridden system prompt
  async function constructSystemPrompt(systemPromptOverride): Promise<PromptMessage> {

    const systemPrompt: string = (systemPromptOverride === undefined) ? process.env.OPENAI_PARAM_SYSTEM_PROMPT : systemPromptOverride;
    const payload: PromptMessage = {
      role: PromptMessageRole.system,
      content: systemPrompt,
    };

    return payload;

  }

  // Generate a retry message to handle unknown issue
  module.exports.generateTryAgainMessage = async function() {

    const prompt = 'In one short sentence, tell me that you don\'t understand what I meant by what I said.';
    const payload = await this.constructOneOffPayload(prompt);
    const responseText = await this.requestChatCompletion(payload);

    return responseText;

  };

  // Request chat completion from OpenAI API
  module.exports.requestChatCompletion = async function(payload) {

    let response, responseText;
    let remainingRetryCount = process.env.OPENAI_MAX_RETRIES;

    while (remainingRetryCount--) {

      try {
        response = await openAiClient.createChatCompletion({
          max_tokens: parseInt(process.env.OPENAI_PARAM_MAX_TOKENS),
          model: process.env.OPENAI_PARAM_MODEL,
          messages: payload,
          temperature: parseFloat(process.env.OPENAI_PARAM_TEMPERATURE),
        });

        responseText = response.data.choices[0].message.content;
        return responseText.trim();
      }
      catch (error) {

        // Response error handling
        if (responseText == null || responseText.trim() == '') {

          // HTTP 429 - throttled, 5XX - server error, usually temporary
          if (error.response.status == 429 || error.response.status >= 500) {
            setTimeout(() => {
              await log(`An HTTP ${error.response.status} (${error.response.statusText}) was returned. Retrying ${remainingRetryCount} times.`, 'error');
            }, 1000);
          }
          // HTTP 4XX - bad request
          else if (error.response.status >= 400) {
            remainingRetryCount = 0;
            await log(`An HTTP ${error.response.status} (${error.response.statusText}) was returned. This indicates a bad request. Not retrying.`, 'error');
            throw new Error(inspect(error.response.data, false, null, true));
          }

        }
      }

    }

  }
}