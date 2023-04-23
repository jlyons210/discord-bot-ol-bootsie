// Import modules
const { Configuration, OpenAIApi } = require('openai');
const { log } = require('./lib-bot.jsm');
const { util } = require('node:util');

// Create and authenticate OpenAI client
const openAiClient = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
}));

// Construct a prompt payload using an overridable system prompt and single message
module.exports.constructOneOffPayload = async function(systemPromptOverride, messageText) {

  // Assign custom system prompt, or default to configured system prompt
  const systemPrompt = (systemPromptOverride) ? systemPrompt : process.env.OPENAI_PARAM_SYSTEM_PROMPT;

  return [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      name: __filename,
      content: messageText,
    },
  ];

};

// Construct a prompt payload using the configured system prompt and message history
module.exports.constructPromptPayload = async function(messageHistory, threadSignature, systemPromptOverride) {

  // Start message payload with system prompt
  const payload = [
    {
      role: 'system',
      content: (systemPromptOverride) ? systemPromptOverride : process.env.OPENAI_PARAM_SYSTEM_PROMPT,
    },
  ];

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

// Generate a retry message to handle unknown issue
// This will be re-written to use the OpenAI API to generate random responses (issue #24)
module.exports.generateTryAgainMessage = async function() {

  const tryAgainMessages = [
    'I don\'t know what you mean.',
    'Use your words.',
    'That doesn\'t make any sense.',
    'Could you repeat that, but better?',
  ];

  // Pick a random tryAgainResponse
  const randomIndex = Math.floor(Math.random() * tryAgainMessages.length);
  return tryAgainMessages[randomIndex];

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

        // HTTP 5XX - server error, usually temporary
        if (error.response.status >= 500) {
          await log(`An HTTP ${error.response.status} (${error.response.statusText}) was returned. Retrying ${remainingRetryCount} times.`, 'error');
        }
        // HTTP 4XX - bad request
        else if (error.response.status >= 400) {
          remainingRetryCount = 0;
          await log(`An HTTP ${error.response.status} (${error.response.statusText}) was returned. This indicates a bad request. Not retrying.`, 'error');
          throw new Error(util.inspect(error.response.data, false, null, true));
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