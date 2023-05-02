// Import modules
const { log } = require('./lib-bot');
const libOpenAi = require('./lib-openai');

// Global constants
const discordMaxMessageLength = 2000;

// Check all mentions in a message for a bot mention
module.exports.botIsMentionedInMessage = async function(discordMessage, botUserId) {

  let isMentioned = false;

  discordMessage.mentions.users.forEach(async mention => {
    if (mention.id == botUserId) isMentioned = true;
  });

  return isMentioned;

};

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

module.exports.probablyEngageInConversation = async function(discordMessage, messageHistory, threadSignature) {

  // PICK UP HERE
  // Need to review all non-prompt messages past last engagement timestamp.

  // Build a list of comments that haven't been used in a prompt context
  const promptMessages = [];
  messageHistory.forEach(async message => {
    if (message.threadSignature == threadSignature && message.ttl > 0 && !message.isPromptContext) {
      promptMessages.push(message.messageText);
    }
  });

  // Build a prompt payload with promptMessages
  // - Need a system prompt that is still in-character, and also instructs to add a question/comment/concern

  // Think about how to implement a cooldown

  // Send message to chat

};

// React to channel messages using configured probability
module.exports.probablyReactToMessage = async function(discordMessage, messageText) {

  const randomSeed = Math.random();
  const botPctReact = process.env.BOT_PCT_REACT;
  const reactThreshold = (messageText.includes('?')) ? botPctReact * 1.5 : botPctReact;
  log(`randomSeed = ${randomSeed}, reactThreshold = ${reactThreshold}`, 'debug');

  if (randomSeed < reactThreshold) {

    const emojiPayload =
      await libOpenAi.constructOneOffPayload(
        `Respond using nothing but two emojis to the following statement: \`${messageText}\``);
    let emojiResponse = await libOpenAi.requestChatCompletion(emojiPayload);
    emojiResponse = emojiResponse.replace(/[^\p{Emoji}\s]/gu, '');

    Array.from(emojiResponse).forEach(async emoji => {
      try {
        await discordMessage.react(emoji);
      }
      catch (error) {
        await log(error, 'error');
      }
    });

  }

};

// Prune messages older than retention period
module.exports.pruneOldThreadMessages = async function(messageHistory) {

  // Evaluate in reverse to avoid skipping items after splicing
  let i = messageHistory.length;
  while (i--) {
    // If thread signature matches and TTL has expired, prune from history
    if (messageHistory[i].ttl <= 0) messageHistory.splice(i, 1);
  }

  log(`messageHistory.length = ${messageHistory.length}`, 'debug');

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