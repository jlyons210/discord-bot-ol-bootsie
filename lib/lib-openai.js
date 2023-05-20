// Import modules
const { Configuration, OpenAIApi } = require('openai');
const { log } = require('./lib-bot');
const path = require('path');
const { inspect } = require('util');

// Create and authenticate OpenAI client
const openAiClient = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

// Construct a prompt payload using an overridable system prompt and single message
module.exports.constructOneOffPayload = async function(messageText, systemPromptOverride) {

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
async function constructSystemPrompt(systemPromptOverride) {

  const systemPrompt = (systemPromptOverride === undefined) ? process.env.OPENAI_PARAM_SYSTEM_PROMPT : systemPromptOverride;
  const payload = [{
    role: 'system',
    content: systemPrompt,
  }];

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

      // Send payload to OpenAI API
      response = await openAiClient.createChatCompletion({
        max_tokens: parseInt(process.env.OPENAI_PARAM_MAX_TOKENS),
        model: process.env.OPENAI_PARAM_MODEL,
        messages: payload,
        temperature: parseFloat(process.env.OPENAI_PARAM_TEMPERATURE),
      });

      // Assign response
      responseText = response.data.choices[0].message.content;
      await log(`response.status = ${response.status}, response.statusText = ${response.statusText}`, 'debug');
      await log(`responseText = "${responseText}"`, 'debug');

    }
    catch (error) {

      // Response error handling
      if (responseText == null || responseText.trim() == '') {

        // HTTP 429 - throttled, 5XX - server error, usually temporary
        if (error.response.status == 429 || error.response.status >= 500) {
          setTimeout(() => {
            log(`An HTTP ${error.response.status} (${error.response.statusText}) was returned. Retrying ${remainingRetryCount} times.`, 'error');
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

    // HTTP 200 with an empty response
    // Last seen when using the `text-davinci-003` model and providing a bad prompt, like ASCII art.
    if (responseText.trim() == '' && response.status == 200) {

      responseText = await this.generateTryAgainMessage();
      remainingRetryCount = 0;
      await log('An HTTP 200 response was received while messageText is empty. Bad prompt?', 'error');

    }
    else {

      // Return OpenAI API response text
      return responseText.trim();

    }

  }

};