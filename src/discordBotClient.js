const { Client, IntentsBitField } = require('discord.js');
const ReminderManager = require('./reminderManager');
const ErrorHandler = require('./errorHandler');

class DiscordBotClient {
    /**
     * Constructor initializes the bot with the provided token and necessary intents.
     * @param {string} token - The Discord bot token used for authentication.
     */
    constructor(token) {
        // Initialize the Discord Client with required intents to listen to events
        this.client = new Client({
            intents: [
                IntentsBitField.Flags.Guilds,                // Allows access to guild information
                IntentsBitField.Flags.GuildMessages,         // Allows reading messages in the guild
                IntentsBitField.Flags.MessageContent,        // Allows access to the message content
                IntentsBitField.Flags.GuildMessageReactions, // Allows tracking of message reactions
                IntentsBitField.Flags.GuildMembers           // Allows access to member information (used for @everyone mentions)
            ]
        });

        // Initialize the ReminderManager, which handles reminders and tracking mentions
        this.reminderManager = new ReminderManager();
        
        // Store the bot token for later use when logging into Discord
        this.token = token;
    }

    /**
     * Starts the bot, sets up event listeners, handles errors, and logs into Discord.
     */
    start() {
        // Set up all necessary event listeners for the bot (messages, thread creation, etc.)
        this.setupEvents();

        // Set up global error handlers for the bot
        ErrorHandler.setupGlobalErrorHandlers();

        // Log the bot into Discord using the provided token
        this.client.login(this.token).then(() => {
            console.log('Bot logged in successfully!');
        });
    }

    /**
     * Sets up event listeners to handle message creation and thread creation.
     */
    setupEvents() {
        // Event listener for when the bot becomes ready
        this.client.once('ready', () => {
            console.log('Bot is online and ready!');
        });

        // Event listener for when a message is created in a guild
        this.client.on('messageCreate', async (message) => {
            // Ignore messages sent by other bots to prevent infinite loops or redundant actions
            if (message.author.bot) return;

            // Handle mentions of @everyone, which triggers reminders for all non-bot members
            if (message.mentions.everyone) {
                console.log("@everyone was mentioned.");
                // Pass the message and bot's ID to the ReminderManager to handle @everyone mentions
                await this.reminderManager.handleEveryoneMention(message, this.client.user.id);
            } 
            // Handle specific user mentions in a message
            else if (message.mentions.users.size > 0) {
                // Log mentioned users for debugging or tracking purposes
                const mentionedUsers = message.mentions.users;
                console.log(`Mentioned users: ${[...mentionedUsers.keys()].join(', ')}`);
                
                // Create reminders for the mentioned users using the ReminderManager
                this.reminderManager.createReminder(message, mentionedUsers);
            }
        });

        // Event listener for when a thread is created based on a message
        this.client.on('threadCreate', async (thread) => {
            // Fetch the original message that started the thread
            const starterMessage = await thread.fetchStarterMessage();
            if (starterMessage) {
                // Handle thread creation and pass it to the ReminderManager to track messages within the thread
                this.reminderManager.handleThreadCreate(thread, starterMessage);
            }
        });
    }
}

module.exports = DiscordBotClient;
