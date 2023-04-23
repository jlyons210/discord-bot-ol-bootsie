// Import modules
const { log } = require('./lib-bot.js');
const libOpenAi = require('./lib-openai.js');

// Check all mentions in a message for a bot mention
module.exports.botIsMentionedInMessage = async function(discordMessage, botUserId) {

  let isMentioned = false;

  discordMessage.mentions.users.forEach(async mention => {
    if (mention.id == botUserId) isMentioned = true;
  });

  return isMentioned;

};

// Get message text from discordMessage
module.exports.getMessageText = async function(discordMessage, botUserId) {

  // Pull text from discordMessage object and strip bot @-mention
  let messageText = discordMessage.content.replace(`<@${botUserId}>`, '').trim();

  // Replace other user @-mentions with display name
  discordMessage.mentions.users.forEach(async mention => {
    messageText = messageText.replace(`<@${mention.id}>`, `${mention.username}`).trim();
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

// Prune messages older than retention period
module.exports.pruneOldThreadMessages = async function(messageHistory) {

  // Evaluate in reverse to avoid skipping items after splicing
  let i = messageHistory.length;
  log(`messageHistory.length = ${messageHistory.length}`, 'debug');

  // If thread signature matches and TTL has expired, prune from history
  while (i--) {
    if (messageHistory[i].ttl <= 0) {
      await log(`messageHistory[${i}].ttl = ${messageHistory[i].ttl} - pruning message`, 'debug');
      messageHistory.splice(i, 1);
    }
    else {
      await log(`messageHistory[${i}].ttl = ${messageHistory[i].ttl} - not pruning message`, 'debug');
    }
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
    const payload = await libOpenAi.constructOneOffPayload(systemPrompt, this._messageText);
    return await libOpenAi.requestChatCompletion(payload);
  }

}