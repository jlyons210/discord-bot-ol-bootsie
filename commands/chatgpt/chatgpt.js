const { SlashCommandBuilder } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chatgpt')
        .setDescription('Polls the ChatGPT API with specified prompt, returns response.')
        .addStringOption(option =>
            option
                .setName('prompt')
                .setDescription('Question to ask Ol\' Bootsie')
                .setRequired(true)),

    async execute(interaction) {
        const configuration = new Configuration({
            organization: process.env.OPENAI_ORG_ID,
            apiKey: process.env.OPENAI_API_KEY,
        });

        const openai = new OpenAIApi(configuration);
        const prompt = interaction.options.getString('prompt');
        const model = 'text-davinci-003';
        
        try {
            const completion = await openai.createCompletion({
                max_tokens: 100,
                model: model,
                prompt: prompt,
                temperature: 0.6,
            });
    
            const chat_response = `Meow. You asked: ${prompt} ${completion.data.choices[0].text}`;
            await interaction.reply(chat_response);
    
            console.log(
                `[INFO] ${interaction.user.username}#${interaction.user.discriminator} asked: "${prompt}" ${chat_response}`
            )
        } catch(error) {
            console.log(`[ERROR] ${error}`);
            await interaction.reply("An error occurred.");
        }
    }
};