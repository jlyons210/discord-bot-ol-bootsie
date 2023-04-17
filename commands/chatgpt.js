// Import modules
const { SlashCommandBuilder } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

module.exports = {
    // Discord 'chatgpt' slash-command interface
    data: new SlashCommandBuilder()
        .setName('chatgpt')
        .setDescription('Polls the ChatGPT API with specified prompt, returns response.')
        .addStringOption(option =>
            option
                .setName('prompt')
                .setDescription('Question to ask Ol\' Bootsie')
                .setRequired(true)),

    // Execute 'chatgpt' slash-command logic
    async execute(interaction) {
        // Set up openai library config
        const openai = new OpenAIApi(new Configuration({
            organization: process.env.OPENAI_ORG_ID,
            apiKey: process.env.OPENAI_API_KEY,
        }));

        try {
            interaction.reply('Meowww...')

            const prompt = interaction.options.getString('prompt');

            // Send prompt to OpenAI API
            const completion = await openai.createCompletion({
                max_tokens: parseInt(process.env.OPENAI_PARAM_MAX_TOKENS),
                model: process.env.OPENAI_PARAM_MODEL,
                prompt: prompt,
                temperature: parseFloat(process.env.OPENAI_PARAM_TEMPERATURE),
            });
    
            const chat_response = `Meow! You asked: "${prompt}" ${completion.data.choices[0].text}`;
            await interaction.editReply(chat_response);
    
            console.log(`[INFO] ${interaction.user.username}#${interaction.user.discriminator} asked: "${prompt}"`);
            console.log(chat_response);
        } catch(error) {
            console.error(error);
        }
    }
};