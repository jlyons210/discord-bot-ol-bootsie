// Import modules
const { name, version } = require('./package.json');
const configTemplate = require('./lib/lib-config-template');
const libDiscord = require('./lib/lib-discord');
const libOpenAi = require('./lib/lib-openai');
const { log } = require('./lib/lib-bot');
const { ChannelType, Client, Events, GatewayIntentBits, Partials } = require('discord.js');
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
  const isBotMessage = (discordMessage.author.id == discordClient.user.id);
  const isDirectMessageToBot = (discordMessage.channel.type == ChannelType.DM && !isBotMessage);

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

    // Construct prompt payload and get chat response
    const payload = await libOpenAi.constructPromptPayload(messageHistory, threadSignature);
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

    // React to messages with configured probability
    if (!isBotMessage) {
      await probablyReactToMessage(discordMessage, messageText);

      // Engage in conversation with configured probability
      if (!isDirectMessageToBot) {
        await probablyEngageInConversation(discordMessage, threadSignature);
      }
    }

  }

});

// Engage with channel messages using configured probability
async function probablyEngageInConversation(discordMessage, threadSignature) {

  // Roll the RNG
  const botWillEngage = (Math.random() < process.env.BOT_AUTO_ENGAGE_PROBABILITY);

  if (botWillEngage) {

    // Build a list of non-bot chat messages that haven't been used in a prompt context
    let prompt = '', messageCount = 0;

    messageHistory.forEach(async message => {
      if (
        message.threadSignature == threadSignature &&
        message.username != discordClient.user.username &&
        !message.isPromptContext &&
        message.ttl > 0
      ) {
        prompt += message.messageText + '\n';
        messageCount++;
      }
    });

    // There should be a minimum number of messages for a meaningful engagement
    if (messageCount >= process.env.BOT_AUTO_ENGAGE_MIN_MESSAGES) {

      // Build a one-off prompt payload
      const systemPrompt =
        process.env.OPENAI_PARAM_SYSTEM_PROMPT +
        'For the provided list of statements, provide an insight, or a question, or a concern. ' +
        'Dont\'t ask if further help is needed.';
      const payload = await libOpenAi.constructOneOffPayload(prompt, systemPrompt);
      const response = await libOpenAi.requestChatCompletion(payload);

      // Send message to chat
      discordMessage.channel.send(response);

    }

  }

}

// React to channel messages using configured probability
async function probablyReactToMessage(discordMessage, messageText) {

  // Roll the RNG
  const botWillReact = (Math.random() < process.env.BOT_AUTO_REACT_PROBABILITY);

  if (botWillReact) {

    // Build a one-off prompt payload
    const emojiPayload =
      await libOpenAi.constructOneOffPayload(
        process.env.OPENAI_PARAM_SYSTEM_PROMPT +
        `Respond using nothing but two emojis to the following statement: \`${messageText}\``,
      );
    let emojiResponse = await libOpenAi.requestChatCompletion(emojiPayload);

    // Remove non-emoji characters from response
    emojiResponse = emojiResponse.replace(/[^\p{Emoji}\s]/gu, '');

    // React to chat message
    Array.from(emojiResponse).forEach(async emoji => {
      try {
        await discordMessage.react(emoji);
      }
      catch (error) {
        await log(error, 'error');
      }
    });

  }

}