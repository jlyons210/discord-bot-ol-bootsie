// Import modules
const { name, version } = require('./package.json');
const configTemplate = require('./lib/lib-config-template');
const { ChannelType, Client, Events, GatewayIntentBits, Partials } = require('discord.js');
const { log } = require('./lib/lib-bot');
const libDiscord = require('./lib/lib-discord');
const libOpenAi = require('./lib/lib-openai');
const { inspect } = require('util');

// Ensure all required environment variables are set
configTemplate.validateStartupSettings();

// Create and authenticate Discord client
const discordClient = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [ Partials.Channel ],
});
discordClient.login(process.env.DISCORD_BOT_TOKEN);

// Discord authentication complete
discordClient.once(Events.ClientReady, async client => {
  await log(`Logged in as ${client.user.tag}`, 'info');
  await log(`${name}:${version} ready!`, 'info');
});

// Timer jobs
setInterval(async () => {
  libDiscord.pruneOldThreadMessages(messageHistory);
}, 15000);

// Create history (heh)
const messageHistory = [];

// Discord channel message listener
discordClient.on(Events.MessageCreate, async discordMessage => {

  // Bot engagement conditions
  const isBotAtMention = await libDiscord.botIsMentionedInMessage(discordMessage, discordClient.user.id);
  const isOwnMessage = (discordMessage.author.id == discordClient.user.id);
  const isDirectMessageToBot = (discordMessage.channel.type == ChannelType.DM && !isOwnMessage);

  // Assign thread signature {guild}:{channel}[:{user}]
  const threadSignature = await libDiscord.getThreadSignature(discordMessage);

  // Get processed message text from discordMessage object
  const messageText = await libDiscord.getMessageText(discordMessage);

  // If bot is @-mentioned, or is engaged via direct message, engage and respond directly
  if (isBotAtMention || isDirectMessageToBot) {

    // Add prompt to chat history
    messageHistory.push(
      new libDiscord.HistoryMessage(threadSignature, messageText, true, discordMessage.author.username, 'user'),
    );

    // Construct prompt payload
    const payload = await libOpenAi.constructPromptPayload(messageHistory, threadSignature);
    await log(`payload =\n${inspect(payload, false, null, true)}`, 'debug');

    // Poll OpenAI API and send message to Discord channel
    const openAiResponseText = await libOpenAi.requestChatCompletion(payload);

    // Add response to chat history
    messageHistory.push(
      new libDiscord.HistoryMessage(
        threadSignature,
        openAiResponseText,
        true,
        process.env.OPENAI_PARAM_MODEL,
        'assistant',
      ),
    );

    // Paginate response
    const discordResponse = await libDiscord.paginateResponse(openAiResponseText);

    // Respond to channel
    discordResponse.forEach(async responseText => {
      try {
        if (isDirectMessageToBot) {
          await discordMessage.channel.send(responseText);
        }
        else {
          await discordMessage.reply(responseText);
        }
      }
      catch (error) {
        log(inspect(error, false, null, true), 'error');
        await discordMessage.channel.send('There was an issue sending my response. The error logs might have some clues.');
      }
    });

  }
  else {

    // Add channel text to chat history
    messageHistory.push(
      new libDiscord.HistoryMessage(
        threadSignature,
        messageText,
        false,
        discordMessage.author.username,
        'user',
      ),
    );

    if (!isOwnMessage) {

      // React to messages with configured probability
      libDiscord.probablyReactToMessage(discordMessage, messageText);

      // TODO: do not do this in a DM chat

      // Engage in conversation with configured probability
      libDiscord.probablyEngageInConversation(discordMessage, messageHistory, threadSignature);

    }

  }

});