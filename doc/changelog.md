# Changelog

## Releases:
* 1.1.x: [1.1.0](#110-2023-11-07), [1.1.1](#111-2023-11-10), [1.1.2](#112-2023-11-15)
* 1.0.x: [1.0.0](#100-2023-06-29), [1.0.1](#101-2023-07-07), [1.0.2](#102-2023-07-10), [1.0.3](#103-2023-07-10), [1.0.4](#104-2023-07-13)

## Pre-release:
* 0.18.x: [0.18.0](#0180-2023-06-23) - [0.18.1](#0181-2023-06-27)
* 0.17.x: [0.17.0](#0170-2023-06-22)
* 0.16.x: [0.16.0](#0160-2023-06-19)
* 0.15.x: [0.15.0](#0150-2023-06-14) - [0.15.1](#0151-2023-06-15)
* 0.14.x: [0.14.0](#0140-2023-06-14)
* 0.13.x: [0.13.0](#0130-2023-06-14)
* 0.12.x: [0.12.0](#0120-2023-06-08)
* 0.11.x: [0.11.0](#0110-2023-06-02) - [0.11.1](#0111-2023-06-04) - [0.11.2](#0112-2023-06-05) - [0.11.3](#0113-2023-06-07)
* 0.10.x: [0.10.0](#0100-2023-05-31) - [0.10.1](#0101-2023-05-31) - [0.10.2](#0102-2023-05-31)
* 0.9.x: [0.9.0](#090-2023-05-29)
* 0.8.x: [0.8.0](#080-2023-05-28)
* 0.7.x: [0.7.0](#070-2023-05-02) - [0.7.1](#071-2023-05-20)
* 0.6.x: [0.6.0](#060-2023-04-26) - [0.6.1](#061-2023-04-30) - [0.6.2](#062-2023-04-30) - [0.6.3](#063-2023-04-30) - [0.6.4](#064-2023-04-30)
* 0.5.x: [0.5.0](#050-2023-04-25)
* 0.4.x: [0.4.0](#040-2023-04-17) - [0.4.1](#041-2023-04-18) - [0.4.2](#042-2023-04-18) - [0.4.3](#043-2023-04-19) - [0.4.20](#0420-2023-04-20) - [0.4.21](#0421-2023-04-23) - [0.4.22](#0422-2023-04-23) - [0.4.23](#0423-2023-04-23) - [0.4.24](#0424-2023-04-24)
* 0.3.x: [0.3.0](#030-2023-04-17) - [0.3.1](#031-2023-04-17)
* 0.2.x: [0.2.0](#020-2023-04-16)
* 0.1.x: [0.1.0](#010-2023-04-14)

---
## 1.1.2 (2023-11-15)
* Minor fix:
  * [Issue #123](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/123) - Resolved
* Updated dependencies:
  * `axios` 1.6.0 => 1.6.2
  * `discord.js` 14.13.0 => 14.14.1 (resolves `undici` CVE-2023-45143)
  * `openai` 4.16.1 => 4.19.0

[:arrow_up: Back to top](#changelog)

## 1.1.1 (2023-11-10)
* Minor fixes:
  * [Issue #112](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/112) - Resolved
  * [Issue #118](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/118) - Resolved (thank you @divyakelaskar!)

[:arrow_up: Back to top](#changelog)

## 1.1.0 (2023-11-07)
* [Issue #116](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/116) - added support for DALL-E 3 image API
  * Added `openai_createImage_model` config variable to allow selection between `dall-e-2` or `dall-e-3`.
  * Updated `openai_createImage_model` config variable to support new models.
  * Updated `openai_chatCompletion_model` config variable with new models (untested). Legacy models are on the bottom line of each model-version grouping.
* Updated dependencies:
  * `axios` 1.4.0 => 1.6.0
  * `discord.js` 14.11.0 => 14.13.0
  * `openai` 3.3.0 => 4.16.1
  * All `devDependencies`

[:arrow_up: Back to top](#changelog)

## 1.0.4 (2023-07-13)
* [Issue #107](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/107) - Re-opened due to bug after converting async functions to synchronous and using `fs/promises` for `access()` on `DEBUG` file. Resolved again.

[:arrow_up: Back to top](#changelog)

## 1.0.3 (2023-07-10)
* [Issue #107](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/107) - Resolved; see issue for notes.

[:arrow_up: Back to top](#changelog)

## 1.0.2 (2023-07-10)
* [Issue #105](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/105) - Resolved; see issue for notes.

[:arrow_up: Back to top](#changelog)

## 1.0.1 (2023-07-07)
* Updated dependencies:
  * `@typescript-eslint/eslint-plugin` => 5.61.0
  * `@typescript-eslint/parser` => 5.61.0
  * `eslint` => 8.44.0
    * Resolves vulnerability found in `eslint#optionator#word-wrap` dependency ([info](https://github.com/jonschlinkert/word-wrap/issues/32))
  * `typescript` => 5.1.6

[:arrow_up: Back to top](#changelog)

## 1.0.0 (2023-06-29)
* All pre-release issues have been resolved - launching v1.0!
* [Issue #23](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/23) - Resolved; documentation completed.

[:arrow_up: Back to top](#changelog)

## 0.18.1 (2023-06-27)
* [Issue #101](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/101) - Resolved; see issue for notes.

[:arrow_up: Back to top](#changelog)

## 0.18.0 (2023-06-23)
* [Issue #85](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/85) - Resolved; code blocks continue correctly after being split for Discord maximum message length (2000 characters).
* Solved undocumented chat completion response truncation issue, caused by a misunderstanding of how `openai_chatCompletion_maxTokens` functions. Super long bot responses are now possible!
  * Updated configuration defaults:
    * `openai_chatCompletion_maxTokens` 1024 => 4096
    * `openai_chatCompletion_model` gpt-3.5-turbo-0613 => gpt-3.5-turbo-16k-0613
* Updated dependencies.

[:arrow_up: Back to top](#changelog)

## 0.17.0 (2023-06-22)
* [Issue #97](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/97) - Resolved.
  * Bot can now intelligently determine message intent rather than relying on tags like `{ai-image}`. See issue notes for implementation details.
  * Removed `bot_createImage_tag` configuration setting.
* [Issue #87](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/87) - Resolved; see issue for notes.

[:arrow_up: Back to top](#changelog)

## 0.16.0 (2023-06-19)
* [Issue #95](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/95) - Resolved. Added enhanced debug logging.

[:arrow_up: Back to top](#changelog)

## 0.15.1 (2023-06-15)
* [Issue #93](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/93) - Resolved. Was casting an enum for `ConversationMode` incorrectly, causing `undefined` to be used as a `ConversationKey`.

[:arrow_up: Back to top](#changelog)

## 0.15.0 (2023-06-14)
* [Issue #60](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/60) - Resolved. Using `yarn` instead of `npm` for package installation, scripts, and `Dockerfile`.

[:arrow_up: Back to top](#changelog)

## 0.14.0 (2023-06-14)
* [Issue #76](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/88) - Resolved; see issue for notes.
  * Updated `README.md` to reflect new config setting names/values.
  * Increased default for `openai_chatCompletion_maxTokens` 600 => 1024.

[:arrow_up: Back to top](#changelog)

## 0.13.0 (2023-06-14)
* [Issue #88](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/88) - Resolved, updated avialable and default chat model. See issue for notes.
* Updated npm dependencies:
  * Production:
    * `openai` 3.2.1 => 3.3.0
  * Development:
    * `@typescript-eslint/eslint-plugin` 5.59.9 => 5.59.11
    * `@typescript-eslint/parser` 5.59.9 => 5.59.11

[:arrow_up: Back to top](#changelog)

## 0.12.0 (2023-06-08)
* [Issue #75](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/75) - Resolved, ended up doing a larger refactor.
  * Created a `DiscordBotMessage` class that contains Discord `Message` objects and bot metadata and functionality, and moved that from `DiscordBot`. This reduces the amount of `discordMessage` passing that was happening in `DiscordBot` as the functionality has moved to `DiscordBotMessage` properties.
  * Reorganized files into a better directory and import/export structure.
  * Configuration variable changes:
    * `BOT_CONVO_MODE` renamed to `BOT_CONVERSATION_MODE`
    * `BOT_CONVO_RETAIN_SEC` renamed to `BOT_CONVERSATION_RETAIN_SEC`

[:arrow_up: Back to top](#changelog)

## 0.11.3 (2023-06-07)
* [Issue #74](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/74) - Resolved; see issue for notes.
* Minor updates to package dependencies.

[:arrow_up: Back to top](#changelog)

## 0.11.2 (2023-06-05)
* [Issue #79](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/79) - Resolved. `_embedImageFromPromptMessage()` now supports base64 encoded file attachments and URL images, and is using base64 encoded attachments for persistence.

[:arrow_up: Back to top](#changelog)

## 0.11.1 (2023-06-04)
* [Issue #72](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/72) - Resolved; see issue for notes.
* [Issue #73](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/72) - Resolved; see issue for notes.

[:arrow_up: Back to top](#changelog)

## 0.11.0 (2023-06-02)
* [Issue #70](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/68) - Implemented the OpenAI `CreateImage` API:
  * New configuration variables:
    * `BOT_CREATE_IMAGE_FEATURE`: enabled/disabled (default: disabled)
    * `BOT_CREATE_IMAGE_TAG`: string (default: `{ai-image}`)
    * `BOT_CREATE_IMAGE_USER_TOKENS`: number (default: 3)
    * `BOT_CREATE_IMAGE_USER_TOKENS_EXPIRE_SEC`: number (default: 3600)
  * Implemented a token/bucket system for rate-limiting users, as the CreateImage API call is pretty expensive compared to chat completions.

[:arrow_up: Back to top](#changelog)

## 0.10.2 (2023-05-31)
* [Issue #68](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/68) - fixed by adding inner try/catch blocks to `.forEach()` in `DiscordBot._handleMessageCreate()` and `DiscordBot._probablyReactToMessage()`.

[:arrow_up: Back to top](#changelog)

## 0.10.1 (2023-05-31)
* [Issue #63](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/63) - added regex check and character replacement to `PayloadMessage.name`
* [Issue #64](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/64) - added error checks for all calls to `OpenAI.requestChatCompletion()`

[:arrow_up: Back to top](#changelog)

## 0.10.0 (2023-05-31) 
* [Issue #13](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/13):
  * Updated `_probablyEngageInConversation()` and `_probablyReactToMessage()`:
    * Got rid of `MessageHistory.isDirectEngagement` flag, as it was used for filtering context to direct engagements only, which is unnecessary.
    * Both functions send better prompts to OpenAI API now.
    * Number of emojis in reactions reduced from 2 to 1.
* Fixed broken error handling in `lib/OpenAI/OpenAI.ts`
* Cleanup:
  * Making better use of interfaces for constructing `HistoryMessage`, `PromptPayload`, and `Log` entries.

[:arrow_up: Back to top](#changelog)

## 0.9.0 (2023-05-29) [:arrow_up: Back to top](#changelog)
* [Issue #57](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/57) - Renamed thread signature to "conversation key" throughout code.
  * Configuration variable changes:
    * `BOT_THREAD_MODE` renamed to `BOT_CONVO_MODE`
    * `BOT_THREAD_RETAIN_SEC` renamed to `BOT_CONVO_RETAIN_SEC`
* [Issue #50](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/50) - Improved DiscordAPIError logging in `DiscordBot._probablyReactToMessage()`.
* [Issue #36](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/36) - Changed pagination delimiter from `\n\n` to `\n` to resolve issues with long responses with single line breaks between paragraphs.
* Cleanup:
  * Changed all instances of `parseInt(*.toString())` and `parseFloat(*.toString())` to `Number(*)`.
  * Changed all instances of `*.toString()` to `String(*)`.
  * `app.ts/Main()` changed `discordBot.Events.on(BotEvents.BotReady, ...` to `discordBot.Events.once(BotEvents.BotReady, ...`
  * `Dockerfile` runs `CMD ["npm", "start"]` instead of `CMD ["npm", "run", "start"]`

[:arrow_up: Back to top](#changelog)

## 0.8.0 (2023-05-28)
* [Issue #51](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/51) - Ported the entire codebase to TypeScript, and refactored using object-oriented design principals.
  * Directory structure improved to support `tsc` builds:
    * Moved source code under `./src`
    * `tsc` transpilation goes to `./dist`
    * Restructured `/lib`
  * Modified dev dependencies to support TypeScript development.
    * Using new `.eslintrc` and `.eslintignore` files.
  * Updated `Dockerfile` to perform a multi-stage build.
* Config updates:
  * Renamed `lib-config-template.js` (configTemplate) to `./lib/Config` (Config).
  * Moved `.config-template.json` from `./` to `./lib/ConfigTemplate/ConfigTemplate.json`.
  * Updated configuration defaults:
    * `BOT_AUTO_ENGAGE_PROBABILITY` from `0.2` to `0.05`
    * `BOT_AUTO_REACT_PROBABILITY` from `0.2` to `0.05`
    * `BOT_THREAD_RETAIN_SEC` from `600` to `900`
    * `OPENAI_PARAM_MAX_TOKENS` from `500` to `600`
* Updated npm dependencies.
* Cleaned up incorrect instructions in `README.md`.
* Lots of other changes under the hood to enable faster feature development.

[:arrow_up: Back to top](#changelog)

## 0.7.2 (2023-05-22)
* [Issue #52](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/52) - fixed new bug discovered after errors were handled correctly.

[:arrow_up: Back to top](#changelog)

## 0.7.1 (2023-05-20)
* [Issue #52](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/52) - 429 errors were not considered retryable; fixed.

[:arrow_up: Back to top](#changelog)

## 0.7.0 (2023-05-02)
* [Issue #13](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/13) - Bots will now engage and react to channel comments, unprompted!
  * Added new config settings:
    * `BOT_AUTO_ENGAGE_MIN_MESSAGES` - a minimum number of messages required for a bot to automatically engage in conversation.
    * `BOT_AUTO_ENGAGE_PROBABILITY` - a decimal percentage value from 0.0-1.0 defining the probability that a bot will engage in comments.
    * `BOT_AUTO_REACT_PROBABILITY` - a decimal percentage value from 0.0-1.0 defining the probability that a bot will react to comments.
  * I expect this will be a funky release, so upgrade at your own peril. I'll be running for a while and fine-tuning the behavior.

[:arrow_up: Back to top](#changelog)

## 0.6.4 (2023-04-30)
* [Issue #46](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/46) - A bot @-mention with additional bots tagged will now strip the other bot tags instead of translating to name.
  * Sometimes bots take other bot names into consideration in their prompt responses, which is undesired behavior.

[:arrow_up: Back to top](#changelog)

## 0.6.3 (2023-04-30)
* [Issue #39](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/39) - Moved libDiscord.pruneOldThreadMessages() from the message received handler to a 15 second timer job to prevent extraneous executions and debug logging.

[:arrow_up: Back to top](#changelog)

## 0.6.2 (2023-04-30)
* [Issue #42](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/42) - Bot now replies to the comment that prompted its response in channels.

[:arrow_up: Back to top](#changelog)

## 0.6.1 (2023-04-30)
* [Issue #36](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/36) - Fixed OpenAI response >2000 characters being rejected by Discord channel.send().
  * Breaks multi-paragraph responses >2000 characters into a channel.send() paragraph.
  * There are still some possibilities for issues, like long code blocks being broken, or >2000 character unbroken paragraphs being too long. Will monitor and address later if needed.

[:arrow_up: Back to top](#changelog)

## 0.6.0 (2023-04-26)
* [Issue #9](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/9) - Added bot direct message support. You can now DM the bot, no @-mention needed!

[:arrow_up: Back to top](#changelog)

## 0.5.0 (2023-04-25)
* [Issue #33](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/33) - Rebuilt startup environment checking. It was clunky and not extensible.
  * Created `.config-template.json` to store and define attributes for expected environment variables/settings.
    * `name`: (string) The name of the environment variable, e.g. `BOT_LOG_DEBUG`.
    * `allowedValues`: (string/list) Pre-defined acceptable input values.
    * `defaultValue`: (string/number) Pre-defined default value, so it doesn't need to be provided at runtime!
    * `required`: (bool) Whether or not the user must provide the value, e.g. API keys.
    * `secret`: (bool) Whether or not the configured value is a secret - causes it to be displayed masked, e.g. API keys.
    with allowed values, default values, and whether the values are required as inputs or are secrets.
  * Updated `README.md` launch instructions.

[:arrow_up: Back to top](#changelog)

## 0.4.24 (2023-04-24)
* [Issue #34](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/34) - `DISCORD_APP_TOKEN` in code actually required the Discord bot token from the Discord Developer Portal. Fixed naming for clarity.

[:arrow_up: Back to top](#changelog)

## 0.4.23 (2023-04-23)
* [Issue #30](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/30) - `OPENAI_ORG_ID` was not fully removed from settings causing failed startup checks. Cleaned up.

[:arrow_up: Back to top](#changelog)

## 0.4.22 (2023-04-23)
* FR [issue #24](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/24) - Have OpenAI API generate try-again messages sent as chat responses.
* Cleanup:
  * Removed `OPENAI_ORG_ID` from environment settings.

[:arrow_up: Back to top](#changelog)

## 0.4.21 (2023-04-23)
* Added `HistoryMessageAnalysis` class that performs mood, sentiment, and tone analysis of `HistoryMessage` messages.
* Added support for one-off prompt payloads and responses. Meant for internal use by the application for generating message analysis and things like error responses sent to chat.
* Added "break-glass" debug logging by creating a file named `DEBUG` (case-sensitive) to the app working directory. This enables debug logging without restarting the application.
* Cleanup:
  * Updated `Dockerfile` working directory from `/app` to `/usr/src/app`.
  * Added `.dockerignore`
  * Removed extraneous carriage returns in code for readability.
  * Libraries:
    * Moved some common bot code to `lib/lib-bot.js`.
    * Moved more code to `lib/lib-discord.js` and `lib/lib-openai.js`.
* Bug fixes:
  * Fixed behavioral bug in `pruneMessageHistory()` - [issue #26](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/26):
    * Now only evaluates for expired TTL, irrespective of `threadSignature`.

[:arrow_up: Back to top](#changelog)

## 0.4.20 (2023-04-20)
* Refactored code into multiple .js files to better group functionality - [issue #16](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/16):
  * Discord-specific functions moved to `lib/lib-discord.js`
  * OpenAI-specific functions moved to `lib/lib-openai.js`
* Changed all synchronous functions to `async` with `await` calls to stop blocking the event loop (possibly causing [issue #14](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/14)).
* Updated OpenAI API call retry logic:
  * Instead of retrying indefinitely on 5XX errors, `retryRequest (bool)` was changed to `remainingRetryCount` which starts with the `OPENAI_MAX_RETRIES` environment setting.
  * The retry loop decrements. Fatal errors (4XX) will immediately decrement the loop to `0` to prevent retry.
* Fixed a big glitch in the `README.md` documentation:
  * [Local execution](#local-execution) with `node` requires environment set up.
* Added optional `BOT_LOG_DEBUG` environment setting to toggle `debug` logging level.
* Added message collection for all messages (subject to `BOT_THREAD_RETAIN_SEC`) for upcoming features - [issue #14](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/14)
* Bug fixes:
  * Solved a bug in `pruneOldThreadMessages()` that would always result in one message not being pruned.

[:arrow_up: Back to top](#changelog)

## 0.4.3 (2023-04-19)
* Removed unused `DISCORD_GUILD_ID` and `DISCORD_CLIENT_ID` environment settings - [issue #20](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/20).

[:arrow_up: Back to top](#changelog)

## 0.4.2 (2023-04-18)
* Added logging of non-sensitive startup parameters - [issue #15](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/15)
* Added debug logging to pruning function, suspect it may get stuck in a loop - [issue #14](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/14). Issue remains open until cause of hang is identified.
* Added [Table of Contents](#table-of-contents) to `README.md`.
* Bug fixes:
  * Improved error handling for empty OpenAI API responses, added trap for 4XX (fatal) and 5XX (retriable) errors - [issue #17](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/17).

[:arrow_up: Back to top](#changelog)

## 0.4.1 (2023-04-18)
* Added package `name:version` to startup logging.
* Added conversational continuity.
  * Requires new environment settings `BOT_THREAD_MODE=[channel|user]` and `BOT_THREAD_RETAIN_SEC=[seconds]`
  * ~~Experimental~~ Added Discord username to OpenAI prompt under optional `name` field.
    * This will remain in place! It allows the system prompt to treat different chat users uniquely.

[:arrow_up: Back to top](#changelog)

## 0.4.0 (2023-04-17)
* Updated app.js to support `gpt-3.5-turbo`.
  * Using `openAiClient.createChatCompletion()` instead of `openAiClient.createCompletion()`.
  * This limits supported models to `gpt-4` (not yet public), `gpt-4-0314` (not yet public), `gpt-4-32k` (not yet public), `gpt-4-32k-0314` (not yet public), `gpt-3.5-turbo`, and `gpt-3.5-turbo-0301`.
    * This is fine, because per the [models documentation](https://platform.openai.com/docs/models/gpt-4), `gpt-3.5-turbo` is 1/10th the cost of `text-davinci-003`, and `gpt-4` is even better-er.
  * `openai-node` [PR #123](https://github.com/openai/openai-node/pull/123) looks like it will automate API endpoint switching based upon selected model. Monitoring for approval/merge.
* Removed $ shell prefixes from README.md code blocks to enable better use of the GitHub UI's copy button.

[:arrow_up: Back to top](#changelog)

## 0.3.1 (2023-04-17)
* Updated logging timestamp to ISO 8601 format.
* Fixed indentation in app.js (2-space convention)

[:arrow_up: Back to top](#changelog)

## 0.3.0 (2023-04-17)
* Removed `/chatgpt` and scaffolding for importing slash-commands.
* Updated secrets approach from using `.env` and `dotenv` with `docker build --build-arg [arg=]` (contaminates image with secrets) to `docker run -e [arg=]` to enable a credential-less container image that can be distributed.
* Improved console logging.
* Renamed entry point from `index.js` to `app.js`.
* Documented setup and version history in README.md.

[:arrow_up: Back to top](#changelog)

## 0.2.0 (2023-04-16)
* Added support for @-mention of bot which is more conversational than slash-commands.
* Removed boilerplate slash-commands, leaving only `/chatgpt`.
* Moved OpenAI API parameter configurations to dotenv.

[:arrow_up: Back to top](#changelog)

## 0.1.0 (2023-04-14)
* Initial commit
* Supports `/chatgpt prompt` and other boilerplate slash-commands.
* Containerized application, but image isn't portable is building requires Docker build-arg placement of dotenv

[:arrow_up: Back to top](#changelog)
