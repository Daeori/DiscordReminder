require('dotenv').config();
const DiscordBotClient = require('./discordBotClient');

// Instantiate the bot client and start it
const bot = new DiscordBotClient(process.env.DISCORD_BOT_TOKEN);
bot.start();
