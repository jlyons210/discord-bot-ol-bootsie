# Setup guide

* [Requirements](#requirements)
* [Setup](#setup)
  * [Local execution](#local-execution)
  * [Container execution](#container-execution)

## Requirements

* Create an application and bot via the [Discord Developer Portal](https://discord.com/developers/).
* Set up pay-as-you-go OpenAI API access [here](https://platform.openai.com/account/) - this is very inexpensive, but be sure to set a spending limit and warning level.
* An always-on machine or environment to run the application on.

[:arrow_up: Back to top](#setup-guide)

## Setup

### Local execution

:bulb: Requires the `git`, `nodejs`, and `yarn` packages.

---

Clone this repo:

```shell
git clone https://github.com/jlyons210/discord-bot-ol-bootsie.git
```

---

Install dependencies:

```shell
yarn install
```

---

Run the application:

:bulb: Configuration settings with acceptable defaults may be omitted.

:bulb: It can be helpful to store bot-start configurations in a shell script. Since it will contain API keys, store them in a secure location.

```shell
 bot_autoEngage_message_minMessages = number 6* \
 bot_autoEngage_message_probability = number 0.05* \
 bot_autoEngage_react_probability = number 0.05* \
 bot_conversation_mode = mode channel*|user \
 bot_conversation_retainSec = number 900* \
 bot_createImage_enabled = boolean true|false* \
 bot_createImage_tokens_perUser = number 3* \
 bot_createImage_tokens_ttl = number 3600* \
 bot_log_debug = boolean true|false* \
 discord_botToken = string <api key> \
 openai_api_key = string <api key> \
 openai_api_maxRetries = number 5* \
 openai_api_timeoutSec = number 5* \
 openai_chatCompletion_maxTokens = number 4096* \
 openai_chatCompletion_model = model gpt-3.5-turbo-16k* \
 openai_chatCompletion_systemPrompt = string (example: "A system prompt that describes how the chat bot should behave") \
 openai_chatCompletion_temperature = number 0.6* \
 openai_createImage_model = model dall-e-2|dall-e-3* \
 openai_createImage_dalle2_size = size 256x256|512x512|1024x1024* \
 openai_createImage_dalle3_quality = hd|standard* \
 openai_createImage_dalle3_size = size 1024x1024*|1792x1024|1024x1792 \
 openai_createImage_dalle3_style = style natural|vivid* \
yarn ts-node src/app.ts
```

[:arrow_up: Back to top](#setup-guide)

---

### Container execution

:bulb: Requires Docker Engine - [installation instructions](https://docs.docker.com/engine/install/)

---

#### Pulling the container from Docker Hub

Intel/AMD (x86):

```shell
docker pull jlyons210/discord-bot-ol-bootsie:latest
```

ARM64 (aarch64):

```shell
docker pull jlyons210/discord-bot-ol-bootsie:latest-arm64
```

---

#### Building the container from source

Clone this repo:

```shell
git clone https://github.com/jlyons210/discord-bot-ol-bootsie.git
```

Build container image:

```shell
docker build -t discord-bot-ol-bootsie:latest .
```

---

#### Running the container

:bulb: Configuration settings with acceptable defaults may be omitted.

:bulb: It can be helpful to store bot-start configurations in a shell script. Since it will contain API keys, store them in a secure location.

```shell
docker run -d \
  -e bot_autoEngage_message_minMessages = number 6* \
  -e bot_autoEngage_message_probability = number 0.05* \
  -e bot_autoEngage_react_probability = number 0.05* \
  -e bot_conversation_mode = mode channel*|user \
  -e bot_conversation_retainSec = number 900* \
  -e bot_createImage_enabled = boolean true|false* \
  -e bot_createImage_tokens_perUser = number 3* \
  -e bot_createImage_tokens_ttl = number 3600* \
  -e bot_log_debug = boolean true|false* \
  -e discord_botToken = string <api key> \
  -e openai_api_key = string <api key> \
  -e openai_api_maxRetries = number 5* \
  -e openai_api_timeoutSec = number 5* \
  -e openai_chatCompletion_maxTokens = number 4096* \
  -e openai_chatCompletion_model = model gpt-3.5-turbo-16k* \
  -e openai_chatCompletion_systemPrompt = string (example: "A system prompt that describes how the chat bot should behave") \
  -e openai_chatCompletion_temperature = number 0.6* \
  -e openai_createImage_model = model dall-e-2|dall-e-3* \
  -e openai_createImage_dalle2_size = size 256x256|512x512|1024x1024* \
  -e openai_createImage_dalle3_quality = hd|standard* \
  -e openai_createImage_dalle3_size = size 1024x1024*|1792x1024|1024x1792 \
  -e openai_createImage_dalle3_style = style natural|vivid* \
[image-name:image-tag]
```

[:arrow_up: Back to top](#setup-guide)