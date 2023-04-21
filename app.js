// Import modules
const { name, version } = require('./package.json');
const { Client, Events, GatewayIntentBits } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');
const libDiscord = require('./lib/lib-discord.js');
const libOpenAi = require('./lib/lib-openai.js');
const util = require('util');

// Ensure all required environment variables are set
checkStartupEnviroment();

// Create and authenticate Discord client
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
discordClient.login(process.env.DISCORD_APP_TOKEN);

// Create and authenticate OpenAI client
const openAiClient = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
}));

// Discord authentication complete
discordClient.once(Events.ClientReady, async c => {
  await logStartupEnvironment();
  await log(`Logged in as ${c.user.tag}`, 'info');
  await log(`${name}:${version} ready!`, 'info');
});

// Create history (heh)
const messageHistory = [];

// Discord channel message listener
discordClient.on(Events.MessageCreate, async discordMessage => {

  // Assign thread signature {guild}:{channel}[:{user}]
  const threadSignature = await libDiscord.getThreadSignature(discordMessage);

  // Get processed message text from discordMessage object
  const messageText = await libDiscord.getMessageText(discordMessage, discordClient.user.id);

  // If bot is @-mentioned, engage and respond directly
  if (await libDiscord.botIsMentionedInMessage(discordMessage, discordClient.user.id)) {

    // Add prompt to chat history
    messageHistory.push(
      new libDiscord.HistoryMessage(threadSignature, messageText, true, discordMessage.author.username, 'user'),
    );

    // Construct prompt payload
    const payload = await libOpenAi.constructPromptPayload(messageHistory, threadSignature);
    await log(`payload =\n${util.inspect(payload, false, null, true)}`, 'debug');

    // Poll OpenAI API and send message to Discord channel
    const responseText = await requestChatCompletion(payload);

    // Add response to chat history
    messageHistory.push(
      new libDiscord.HistoryMessage(threadSignature, responseText, true, process.env.OPENAI_PARAM_MODEL, 'assistant'),
    );

    // Send response to Discord channel
    discordMessage.channel.send(responseText);

  }
  else {

    // Add channel text to chat history
    messageHistory.push(
      new libDiscord.HistoryMessage(threadSignature, messageText, false, discordMessage.author.username, 'user'),
    );

    // Bot saw the message, what to do now?
    // messageSentiment = discord.analyzeMessageSentiment(message);
    // messageMood = discord.analyzeMessageMood(message);

  }

  // Perform housekeeping
  // Purge expired messages
  await pruneOldThreadMessages(threadSignature);

});

// Request chat completion from OpenAI API
async function requestChatCompletion(payload) {

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

      responseText = generateTryAgainMessage();
      remainingRetryCount = 0;
      await log('An HTTP 200 response was received while messageText is empty. Bad prompt?', 'error');

    }
    else {

      // Return OpenAI API response text
      return responseText.trim();

    }

  }

}

// Validate environment variables
function checkStartupEnviroment() {

  // Required environment variables
  const requiredEnvVars = [
    'BOT_THREAD_MODE',
    'BOT_THREAD_RETAIN_SEC',
    'DISCORD_APP_TOKEN',
    'OPENAI_API_KEY',
    'OPENAI_MAX_RETRIES',
    'OPENAI_ORG_ID',
    'OPENAI_PARAM_MAX_TOKENS',
    'OPENAI_PARAM_MODEL',
    'OPENAI_PARAM_SYSTEM_PROMPT',
    'OPENAI_PARAM_TEMPERATURE',
  ];

  let quitError = false;

  // Check that each required environment variable is set
  requiredEnvVars.forEach(envVar => {

    if (!process.env[envVar]) {

      log(`Environment variable not set: ${envVar}`, 'error');
      quitError = true;

    }

  });

  // Quit with uncaught error if any environment variable is not set
  if (quitError) {

    log('Environment variables are not configured correctly. See documentation on GitHub.', 'error');
    throw (new Error('Configuration error exit.'));

  }

}

// Log environment variables (at startup)
async function logStartupEnvironment() {

  // Environment variables with secrets are not logged
  const safeEnvVars = [
    'BOT_LOG_DEBUG',
    'BOT_THREAD_MODE',
    'BOT_THREAD_RETAIN_SEC',
    'OPENAI_MAX_RETRIES',
    'OPENAI_PARAM_MAX_TOKENS',
    'OPENAI_PARAM_MODEL',
    'OPENAI_PARAM_SYSTEM_PROMPT',
    'OPENAI_PARAM_TEMPERATURE',
  ];

  // Log startup config
  await log('Startup config (secrets excluded):', 'info');

  safeEnvVars.forEach(async envVar => {

    // Might need a try/catch here so that missing optional settings don't puke
    await log(`${envVar} = ${process.env[envVar]}`, 'info');

  });

}

// Centralized logging function
async function log(message, type) {

  // Log in ISO 8601 time format
  const timestamp = new Date().toISOString();

  switch (type) {
    case 'error':
      console.error(`${timestamp} - ${type.toUpperCase()} - ${message}`);
      break;

    case 'debug':
      if (process.env.BOT_LOG_DEBUG != undefined && process.env.BOT_LOG_DEBUG.toLowerCase() == 'enabled') {
        console.log(`${timestamp} - ${type.toUpperCase()} - ${message}`);
      }
      break;

    case 'info':
      console.log(`${timestamp} - ${type.toUpperCase()} - ${message}`);
      break;

    default:
      console.log(`${timestamp} - ${type.toUpperCase()}_UNKNOWN_TYPE - ${message}`);
      break;
  }

}

// Generate a retry message to handle unknown issue
// This will be re-written to use the OpenAI API to generate random responses (issue #24)
async function generateTryAgainMessage() {

  const tryAgainMessages = [
    'I don\'t know what you mean.',
    'Use your words.',
    'That doesn\'t make any sense.',
    'Could you repeat that, but better?',
  ];

  // Pick a random tryAgainResponse
  const randomIndex = Math.floor(Math.random() * tryAgainMessages.length);
  return tryAgainMessages[randomIndex];

}

// Prune messages older than retention period
async function pruneOldThreadMessages(threadSignature) {

  // Nothing to do if message history is empty
  if (!messageHistory.length) return;

  // Evaluate in reverse to avoid skipping items after splicing
  let i = messageHistory.length;
  log(`messageHistory.length = ${messageHistory.length}`, 'debug');

  while (i--) {

    // If thread signature matches and TTL has expired, prune from history
    if (messageHistory[i].threadSignature == threadSignature && messageHistory[i].ttl() <= 0) {

      await log(`messageHistory[${i}].ttl() = ${messageHistory[i].ttl()} - pruning message`, 'debug');
      messageHistory.splice(i, 1);

    }
    else {

      await log(`messageHistory[${i}].ttl() = ${messageHistory[i].ttl()} - not pruning message`, 'debug');

    }

  }

  log(`messageHistory.length = ${messageHistory.length}`, 'debug');

}