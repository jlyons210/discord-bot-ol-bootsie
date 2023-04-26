// Import modules
const { name, version } = require('./package.json');
const { Client, Events, GatewayIntentBits } = require('discord.js');
const configTemplate = require('./lib/lib-config-template');
const { log } = require('./lib/lib-bot');
const libDiscord = require('./lib/lib-discord');
const libOpenAi = require('./lib/lib-openai');
const util = require('util');

// Ensure all required environment variables are set
configTemplate.validateStartupSettings();

// Create and authenticate Discord client
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
discordClient.login(process.env.DISCORD_BOT_TOKEN);

// Discord authentication complete
discordClient.once(Events.ClientReady, async c => {
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
    const responseText = await libOpenAi.requestChatCompletion(payload);

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

  }

  /* Perform housekeeping
   * - Purge expired messages
   */
  await libDiscord.pruneOldThreadMessages(messageHistory);

});