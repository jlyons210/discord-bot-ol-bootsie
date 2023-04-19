// Import modules
const { Client, Events, GatewayIntentBits } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');
const { name, version } = require('./package.json');
const util = require('util');

// Ensure all required environment variables are set
checkEnvironment();

// Create Discord client
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const token = process.env.DISCORD_APP_TOKEN;
discordClient.login(token);

// Create OpenAI client
const openAiClient = new OpenAIApi(new Configuration({
  organization: process.env.OPENAI_ORG_ID,
  apiKey: process.env.OPENAI_API_KEY,
}));

// Discord authentication complete
discordClient.once(Events.ClientReady, c => {
  logStartupEnvironment();
  log(`Logged in as ${c.user.tag}`, 'info');
  log(`${name}:${version} ready!`, 'info');
});

// Initialize prompt history
const chatHistory = [];

// Discord channel message listener
discordClient.on(Events.MessageCreate, async message => {

  // Check that discordClient is authenticated
  if (!discordClient.user.id) {
    log('discordClient.user.id is not set.', 'error');
    return;
  }

  try {
    if (botIsMentionedInMessage(message)) {
      let prompt = message.content;

      // Strip bot user.id mention
      prompt = prompt.replace(`<@${discordClient.user.id}>`, '');

      // Replace other user mentions with display name
      message.mentions.users.forEach(mention => {
        prompt = prompt.replace(`<@${mention.id}>`, `${mention.username}`);
      });
      prompt = prompt.trim();
      log(`prompt = ${prompt}`, 'debug');

      // Assign thread signature {guild}:{channel}[:{user}]
      const threadSignature = getThreadSignature(message);

      // Add prompt to chat history
      chatHistory.push(
        {
          threadSignature: threadSignature,
          role: 'user',
          content: prompt,
          username: message.author.username,
          ttl: message.createdTimestamp + parseInt(process.env.BOT_THREAD_RETAIN_SEC) * 1000,
        },
      );

      // Construct prompt payload
      const payload = constructPromptPayload(threadSignature);

      // Poll OpenAI API and send message to Discord channel
      const response = await requestChatCompletion(payload);

      // Add response to chat history
      chatHistory.push({
        threadSignature: threadSignature,
        role: 'assistant',
        content: response,
        // username: -- Including an 'assistant' username causes subsequent requests to fail
        ttl: message.createdTimestamp + parseInt(process.env.BOT_THREAD_RETAIN_SEC) * 1000,
      });

      message.channel.send(response);
    }
  }
  catch (error) {
    log(error, 'error');
  }
});

// Request chat completion from OpenAI API
async function requestChatCompletion(payload) {
  let completion;
  let response;
  let retryRequest = true;

  while (retryRequest) {
    try {
      // Send payload to OpenAI API
      completion = await openAiClient.createChatCompletion({
        max_tokens: parseInt(process.env.OPENAI_PARAM_MAX_TOKENS),
        model: process.env.OPENAI_PARAM_MODEL,
        messages: payload,
        temperature: parseFloat(process.env.OPENAI_PARAM_TEMPERATURE),
      });

      // Assign response
      response = completion.data.choices[0].message.content.trim();
      log(`OpenAI response: HTTP ${completion.status} (${completion.statusText}) "${response}"`, 'debug');

      // Response error handling
      if (response == '') {
        if (completion.status == 200) {
          // Bad user prompt, usually
          response = generateTryAgainMessage();
          retryRequest = false;
        }
        else if (completion.status >= 500) {
          // Server error
          retryRequest = true;
        }
        else if (completion.status >= 400) {
          // Bad request
          retryRequest = false;
        }
      }
      else {
        // Request was successful
        retryRequest = false;
      }
    }
    catch (error) {
      log(`payload = ${util.inspect(payload, false, null, true)}`, 'error');
      log(`completion = ${util.inspect(completion, false, null, true)}`, 'error');
      log(error, 'error');
    }

    // Return OpenAI API response
    return response;
  }
}

// Validate environment variables
function checkEnvironment() {

  // Required environment variables
  const requiredEnvVars = [
    'BOT_THREAD_MODE',
    'BOT_THREAD_RETAIN_SEC',
    'DISCORD_APP_TOKEN',
    'OPENAI_API_KEY',
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
function logStartupEnvironment() {
  // Environment variables with secrets are not logged
  const safeEnvVars = [
    'BOT_THREAD_MODE',
    'BOT_THREAD_RETAIN_SEC',
    'OPENAI_PARAM_MAX_TOKENS',
    'OPENAI_PARAM_MODEL',
    'OPENAI_PARAM_SYSTEM_PROMPT',
    'OPENAI_PARAM_TEMPERATURE',
  ];

  // Log startup config
  log('Startup config (secrets excluded):', 'info');
  safeEnvVars.forEach(envVar => {
    log(`${envVar} = ${process.env[envVar]}`, 'info');
  });
}

// Centralized logging function
function log(message, type) {
  const timestamp = new Date().toISOString();

  if (type == 'error') {
    console.error(`${timestamp} - ${type.toUpperCase()} - ${message}`);
  }
  else {
    console.log(`${timestamp} - ${type.toUpperCase()} - ${message}`);
  }
}

// Check all mentions in a message for a bot mention
function botIsMentionedInMessage(message) {
  let isMentioned = false;

  message.mentions.users.forEach(mention => {
    if (mention.id == discordClient.user.id) isMentioned = true;
  });

  return isMentioned;
}

// Construct prompt payload
function constructPromptPayload(threadSignature) {
  // Purge messages older than retention period
  pruneOldThreadMessages(threadSignature);

  // Start message payload with system prompt
  const payload = [
    {
      role: 'system',
      content: process.env.OPENAI_PARAM_SYSTEM_PROMPT,
    },
  ];

  // Add previous messages matching thread signature
  chatHistory.forEach(history => {
    if (history.threadSignature == threadSignature) {
      payload.push({
        role: history.role,
        content: history.content,
        name: history.username,
      });
    }
  });
  log(`payload = ${util.inspect(payload, false, null, true)}`, 'debug');

  return payload;
}

// Generate a retry message to handle unknown issue
function generateTryAgainMessage() {
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

// Get thread signature for prompt history
function getThreadSignature(message) {
  if (process.env.BOT_THREAD_MODE.toLowerCase() == 'channel') {
    return `${message.guildId}:${message.channelId}`;
  }
  else if (process.env.BOT_THREAD_MODE.toLowerCase() == 'user') {
    return `${message.guildId}:${message.channelId}:${message.author.id}`;
  }
}

// Prune messages older than retention period
function pruneOldThreadMessages(threadSignature) {
  const evalCurrentTime = new Date().getTime();

  let i = chatHistory.length - 1;
  while (i--) {
    // If historical prompt ttl has passed and thread signature matches, prune
    if (chatHistory[i].ttl < evalCurrentTime && chatHistory[i].threadSignature == threadSignature) {
      log(`Pruning promptHistory[i] = ${util.inspect(chatHistory[i], false, null, true)}`, 'debug');
      chatHistory.splice(i, 1);
    }
  }
}