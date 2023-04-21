// Construct prompt payload
module.exports.constructPromptPayload = async function(messageHistory, threadSignature) {

  // Start message payload with system prompt
  const payload = [
    {
      role: 'system',
      content: process.env.OPENAI_PARAM_SYSTEM_PROMPT,
    },
  ];

  // Add previous messages matching thread signature
  messageHistory.forEach(async message => {

    if (message.threadSignature == threadSignature && message.isPromptContext) {

      payload.push({

        role: message.role,
        content: message.messageText,
        // If name != undefined in a [role: 'assistant'] payload, OpenAI API returns a 400 error
        name: (message.role == 'assistant') ? undefined : message.username,

      });

    }

  });

  return payload;

};