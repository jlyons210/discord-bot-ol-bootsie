// Import modules
const { log } = require('./lib-bot');
const { ChannelType, Client, Events, GatewayIntentBits, Partials } = require('discord.js');
const libOpenAi = require('./lib-openai');

module.exports.DiscordBot = new class {

  // Global constants
    discordMaxMessageLength = 2000;
  messageHistory = [];

  // Create and authenticate Discord client
  discordClient = new Client({
    intents: [
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [ Partials.Channel ],
  });

  constructor() {

    this.discordClient.login(process.env.DISCORD_BOT_TOKEN);

    // Prune old message history
        setInterval(async function () {
      await this.pruneOldThreadMessages();
    }, 15000);  

    // Discord authentication complete
    this.discordClient.once(Events.ClientReady, async client => {
      await log(`Logged in as ${client.user.tag}`, 'info');
      await log(`${name}:${version} ready!`, 'info');
    });

    // Discord channel message listener
    this.discordClient.on(Events.MessageCreate, async discordMessage => {

      // Bot engagement conditions
      // Consider rewriting this group of settings, since they're mutually exclusive, to call a function and
      // return a type, e.g. Message.BotMention, Message.BotMessage, Message.DM, etc.
      const isBotAtMention = await botIsMentionedInMessage(discordMessage, this.discordClient.user.id);
      const isBotMessage = (discordMessage.author.id == this.discordClient.user.id);
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

  };


  /*
   * Internal functions
   */

  // Check all mentions in a message for a bot mention
  async function botIsMentionedInMessage(discordMessage, botUserId) {

    let isMentioned = false;

    discordMessage.mentions.users.forEach(async mention => {
      if (mention.id == botUserId) isMentioned = true;
    });

    return isMentioned;

  }

  // Prune messages older than retention period
  async function pruneOldThreadMessages() {

    let i = this.messageHistory.length;

    while (i--) {
      if (this.messageHistory[i].ttl <= 0) this.messageHistory.splice(i, 1);
    }

    log(`messageHistory.length = ${this.messageHistory.length}`, 'debug');

  }

};

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

// Get message text from discordMessage
module.exports.getMessageText = async function(discordMessage) {

  // Pull message text from discordMessage
  let messageText = discordMessage.content;

  // Replace other user @-mentions with display name
  discordMessage.mentions.users.forEach(async mention => {
    messageText = (mention.bot) ?
      messageText.replace(`<@${mention.id}>`, '') :
      messageText = messageText.replace(`<@${mention.id}>`, `${mention.username}`);
  });

  return messageText;

};

// Get thread signature for prompt history
module.exports.getThreadSignature = async function(discordMessage) {

  // Maintain conversation coninuity with all channel members
  if (process.env.BOT_THREAD_MODE.toLowerCase() == 'channel') {
    return `${discordMessage.guildId}:${discordMessage.channelId}`;
  }
  // Maintain conversation continuity with single user in a channel, while
  // cross-channel conversations will be treated uniquely for that user.
  else if (process.env.BOT_THREAD_MODE.toLowerCase() == 'user') {
    return `${discordMessage.guildId}:${discordMessage.channelId}:${discordMessage.author.id}`;
  }

};

// Reassemble reponseText into multiple messages up to 2000 characters, if needed
module.exports.paginateResponse = async function(text) {

  /*
   * ISSUES: Potentially unresolved issues:
   *   - Code blocks with \n\n in them could be split
   *   - Single paragraphs longer than 2000 characters will still cause a failure
   *
   * Before I create a formal issue for this, I want to see how things run as they are for a bit.
   */

  // Split input text on delimier
  const delimiter = '\n\n';
  const paragraphs = text.split(delimiter);
  const allParagraphs = [];
  let page = '';

  // Loop through each paragraph in the response
  for (const paragraph of paragraphs) {
    if ((page.length + paragraph.length + delimiter.length) <= discordMaxMessageLength) {
      page += delimiter + paragraph;
    }
    else {
      allParagraphs.push(page);
      page = paragraph;
    }
  }

  // Add last paragraph
  if (page.length > 0) allParagraphs.push(page);

  return allParagraphs;

};

module.exports.HistoryMessage = class {

  constructor(threadSignature, messageText, isPromptContext, username, role) {
    this.isPromptContext = isPromptContext;
    this.messageText = messageText;
    this.role = role;
    this.threadSignature = threadSignature;
    this.timestamp = new Date().getTime();
    this.username = username;
  }

  get messageAnalysis() {
    return new HistoryMessageAnalysis(this.messageText);
  }

  get ttl() {
    const expireTime = this.timestamp + (parseInt(process.env.BOT_THREAD_RETAIN_SEC) * 1000);
    return (expireTime - new Date().getTime());
  }

};

class HistoryMessageAnalysis {

  constructor(messageText) {
    this._messageText = messageText;
    this._mood = '';
    this._sentiment = '';
    this._tone = '';
  }

  get mood() {
    if (this._mood == '') {
      this._mood = this.analyzeMessage('mood');
    }

    return this._mood;
  }

  get sentiment() {
    if (this._sentiment == '') {
      this._sentiment = this.analyzeMessage('sentiment');
    }

    return this._sentiment;
  }

  get tone() {
    if (this._tone == '') {
      this._tone == this.analyzeMessage('tone');
    }

    return this._tone;
  }

  async analyzeMessage(attribute) {
    const systemPrompt = `In one word, describe the ${attribute} of any of the statements provided.`;
    const payload = await libOpenAi.constructOneOffPayload(this._messageText, systemPrompt);
    return await libOpenAi.requestChatCompletion(payload);
  }

}