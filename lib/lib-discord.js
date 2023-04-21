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

module.exports.HistoryMessage = class {

  constructor(threadSignature, messageText, isPromptContext, username, role) {

    this.isPromptContext = isPromptContext;
    this.messageText = messageText;
    this.role = role;
    this.threadSignature = threadSignature;
    this.timestamp = new Date().getTime();
    this.ttl = function() {
      const expireTime = this.timestamp + (parseInt(process.env.BOT_THREAD_RETAIN_SEC) * 1000);
      return (expireTime - new Date().getTime());
    };
    this.username = username;

  }

};