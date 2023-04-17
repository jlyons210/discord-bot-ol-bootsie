// Import modules
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Scan ./commands/*.js for slash-command modules
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filepath} is missing a required "data" or "execute" property.`);
    }
}

// Authentication complete
client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
});

// Handle slash-commands
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // Discern incoming command type
    const command = interaction.client.commands.get(interaction.commandName);

    // Handle empty commands
    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    // Execute command
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

// Export a function that sets up the message listener
client.on(Events.MessageCreate, async message => {
    console.log(message.content);

    // Check if the message mentions the bot
    if (message.content.includes(`@${client.user.id}`)) {
        // Extract the prompt from the message content
        const prompt = message.content.replace(`<@${client.user.id}>`, '').trim();

        // Send a response back to the same channel
        const gptResponse = await askChatGPT(prompt);
        message.channel.send(gptResponse);
    }
});

// Authenticate
const token = process.env.DISCORD_APP_TOKEN;
client.login(token);

// ChatGPT interface
async function askChatGPT(prompt) {
    // Set up openai library config
    const openai = new OpenAIApi(new Configuration({
        organization: process.env.OPENAI_ORG_ID,
        apiKey: process.env.OPENAI_API_KEY,
    }));

    try {
        // Send prompt to OpenAI API
        const completion = await openai.createCompletion({
            max_tokens: parseInt(process.env.OPENAI_PARAM_MAX_TOKENS),
            model: process.env.OPENAI_PARAM_MODEL,
            prompt: prompt,
            temperature: parseFloat(process.env.OPENAI_PARAM_TEMPERATURE),
        });

        return completion.data.choices[0].text;
    } catch(error) {
        console.error(error);
    }
}