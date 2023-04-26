// Import modules
const libOpenAi = require('../lib/lib-openai');

// Test libOpenAi.generateTryAgainMessage()
async function test_generateTryAgainMessage() {

  const tryAgainMessage = await libOpenAi.generateTryAgainMessage();
  console.log(`tryAgainMessage = ${tryAgainMessage}`);

}

test_generateTryAgainMessage();