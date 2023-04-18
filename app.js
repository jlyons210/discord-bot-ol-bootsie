// Import modules
const { Client, Events, GatewayIntentBits } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');

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

// Create Discord client
const token = process.env.DISCORD_APP_TOKEN;
discordClient.login(token);

// Create OpenAI client
const openAiClient = new OpenAIApi(new Configuration({
  organization: process.env.OPENAI_ORG_ID,
  apiKey: process.env.OPENAI_API_KEY,
}));

// Discord authentication complete
discordClient.once(Events.ClientReady, c => {
  log(`Ready! Logged in as ${c.user.tag}`, 'info');
});

// Discord channel message listener
discordClient.on(Events.MessageCreate, async message => {
  // If the incoming message does not @-mention bot, return
  if (!discordClient.user.id) {
    log('discordClient.user.id is not set.', 'error');
    return;
  }

  // Strip @-mention and poll OpenAI API
  try {
    if (message.content.includes(`@${discordClient.user.id}`)) {
      const prompt = message.content.replace(`<@${discordClient.user.id}>`, '').trim();
      const gptResponse = await askChatGPT(prompt);
      message.channel.send(gptResponse);
    }
  }
  catch (error) {
    log(error, 'error');
  }
});

// Poll OpenAI API
async function askChatGPT(prompt) {

  try {
    log(`OpenAI prompt: ${prompt}`, 'info');

    // Construct message payload
    const messages = [
      {
        role: 'system',
        content: process.env.OPENAI_PARAM_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    // Send payload to OpenAI API
    const completion = await openAiClient.createChatCompletion({
      max_tokens: parseInt(process.env.OPENAI_PARAM_MAX_TOKENS),
      model: process.env.OPENAI_PARAM_MODEL,
      messages: messages,
      temperature: parseFloat(process.env.OPENAI_PARAM_TEMPERATURE),
    });

    // Assign response
    let response = completion.data.choices[0].message.content.trim();

    // Sometimes an empty response comes back if the prompt is garbage
    // You can't publish an empty message to Discord's API
    if (response == '' && completion.status == 200) {
      const tryAgainResponses = [
        'I don\'t know what you mean.',
        'Use your words.',
        'That doesn\'t make any sense.',
        'Could you repeat that, but better?',
      ];

      // Pick a random tryAgainResponse
      const tryAgainResponse = Math.floor(Math.random() * tryAgainResponses.length);
      response = tryAgainResponses[tryAgainResponse];
    }

    // Return OpenAI API response
    log(`OpenAI response: HTTP ${completion.status} (${completion.statusText}) ${response}`, 'info');
    return response;
  }
  catch (error) {
    log(error, 'error');
  }
}

// Validate environment variables
function checkEnvironment() {

  // Required environment variables
  const requiredEnvVars = [
    'DISCORD_CLIENT_ID',
    'DISCORD_GUILD_ID',
    'DISCORD_APP_TOKEN',
    'OPENAI_ORG_ID',
    'OPENAI_API_KEY',
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