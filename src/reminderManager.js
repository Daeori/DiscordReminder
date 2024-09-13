const { DateTime } = require('luxon'); // Import luxon for handling time zones
const CollectorManager = require('./collectorManager');
const EmbedManager = require('./embedManager'); // Import EmbedManager

// Define the reminder interval in milliseconds (e.g., 60000ms = 1 minute)
const REMINDER_INTERVAL = 5000; // Control how often reminders are sent (currently every 1 minute)
const MAX_REMINDERS = 5; // Maximum number of reminders per user for a specific message

// Define quiet hours in CEST (22:00 - 07:30)
const QUIET_HOURS_START = 22; // 22:00 (10:00 PM CEST)
const QUIET_HOURS_END = 7.5;  // 07:30 (7:30 AM CEST)

// Toggle quiet hours for testing (true = quiet hours enabled, false = quiet hours disabled)
const ENABLE_QUIET_HOURS = true;

class ReminderManager {
    constructor() {
        // Store reminder data for each message (reminder data, users, counts, etc.)
        this.reminderData = {};
        this.collectorManager = new CollectorManager();
        this.embedManager = new EmbedManager(); // Initialize EmbedManager
    }

    /**
     * Creates a reminder for a given message and mentioned users.
     * Initializes tracking for reactions, replies, and reminder counts.
     * 
     * @param {Message} message - The Discord message object.
     * @param {Map} mentionedUsers - A Map of users who were mentioned in the message.
     */
    createReminder(message, mentionedUsers) {
        const messageId = message.id;  // Unique ID for the message

        // Store relevant data about the message and the mentioned users
        this.reminderData[messageId] = {
            message: message,
            mentionedUsers: mentionedUsers,
            usersReplied: new Set(),           // Track users who have replied or reacted
            reminderCounts: new Map(),         // Track how many reminders each user has received
            channel: message.channel,          // The channel where the message was sent
            reminderTimeout: null,             // Store the reminder timeout for later cleanup
            createdAt: Date.now()              // Timestamp when the reminder was created
        };

        // Initialize reminder count for each user
        mentionedUsers.forEach((user) => {
            this.reminderData[messageId].reminderCounts.set(user.id, 0); // Start each user with 0 reminders sent
        });

        // Start the reminder loop for this message
        this.startReminderLoop(messageId);
        
        // Track reactions and replies for this message using CollectorManager
        this.collectorManager.trackReactions(message, mentionedUsers, this.reminderData[messageId]);
        this.collectorManager.trackReplies(message, mentionedUsers, this.reminderData[messageId]);
    }

    /**
     * Starts a reminder loop for a specific message ID, sending reminders periodically.
     * 
     * @param {string} messageId - The ID of the message to start reminders for.
     */
    startReminderLoop(messageId) {
        // Schedule reminders to be sent after REMINDER_INTERVAL
        this.reminderData[messageId].reminderTimeout = setTimeout(() => {
            // Call sendReminders after the interval
            this.sendReminders(messageId);
        }, REMINDER_INTERVAL);
    }

    /**
     * Sends reminders to users who haven't responded yet, stopping after 5 reminders.
     * If it's between 22:00 and 07:30 CEST, delay the reminder until 07:30 CEST.
     * 
     * @param {string} messageId - The ID of the message to send reminders for.
     */
    async sendReminders(messageId) {
        const reminder = this.reminderData[messageId];
        if (!reminder) return;  // If no reminder data exists, stop the process
    
        const { message, mentionedUsers, usersReplied, reminderCounts, channel } = reminder;
        const messageURL = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
        let usersPending = 0;
    
        // Get the current time in CEST (Central European Summer Time)
        const now = DateTime.now().setZone('Europe/Paris');
        const currentHour = now.hour + now.minute / 60;  // Current time as decimal (e.g., 22.5 for 22:30)
    
        // Check if quiet hours are enabled and if the current time is within quiet hours (22:00 - 07:30 CEST)
        if (ENABLE_QUIET_HOURS && (currentHour >= QUIET_HOURS_START || currentHour < QUIET_HOURS_END)) {
            const tomorrowMorning = now.hour >= QUIET_HOURS_START
                ? now.plus({ days: 1 }).set({ hour: 7, minute: 30, second: 0, millisecond: 0 })  // Next day's 07:30
                : now.set({ hour: 7, minute: 30, second: 0, millisecond: 0 });  // Today's 07:30
    
            const waitTime = tomorrowMorning.diff(now).milliseconds;
    
            console.log(`Quiet hours: delaying reminders until 07:30 CEST (${tomorrowMorning.toISO()})`);
    
            setTimeout(() => {
                this.sendReminders(messageId);
            }, waitTime);
    
            return;  // Exit to avoid sending reminders now
        }
    
        // Send reminders as usual if outside quiet hours
        mentionedUsers.forEach(async (user) => {
            if (!usersReplied.has(user.id)) {
                let reminderCount = reminderCounts.get(user.id) || 0;
    
                if (reminderCount < MAX_REMINDERS) {
                    usersPending++;
                    try {
                        // Create the embed without any images
                        const embed = this.embedManager.createReminderEmbed(
                            channel.name,                       // Channel name
                            message.author.username,            // Mentioner's name (person who mentioned the user)
                            message.author.displayAvatarURL(),   // Mentioner's avatar URL
                            message.content,                     // Original message content
                            messageURL,                          // Link to the original message
                            reminderCount + 1,                   // Current reminder count
                            MAX_REMINDERS                        // Maximum number of reminders allowed
                        );
    
                        // Send the embed as a DM to the user
                        await user.send({ embeds: [embed] });
                        console.log(`Sent reminder ${reminderCount + 1} to ${user.tag}`);
    
                        // Increment the reminder count for this user
                        reminderCounts.set(user.id, reminderCount + 1);
                    } catch (error) {
                        console.error(`Failed to send DM to ${user.tag}:`, error.message);
                    }
                } else {
                    console.log(`Max reminders reached for ${user.tag}. No further reminders will be sent.`);
                }
            }
        });
    
        if (usersPending === 0) {
            this.cleanupReminder(messageId);  // All users have replied or reacted
        } else {
            this.startReminderLoop(messageId);  // Schedule the next reminder cycle
        }
    }
    
    

    /**
     * Cleans up all collectors and memory related to a specific message.
     * Stops the reminder loop and deletes reminder data to free up memory.
     * 
     * @param {string} messageId - The ID of the message to clean up.
     */
    cleanupReminder(messageId) {
        const reminder = this.reminderData[messageId];
        if (!reminder) return;  // If the reminder doesn't exist, exit

        // Clear the scheduled reminder timeout to stop future reminders
        clearTimeout(reminder.reminderTimeout);
        // Remove the reminder data from memory to prevent memory leaks
        delete this.reminderData[messageId];
        console.log(`Cleaned up reminder for message ${messageId}`);
    }

    /**
     * Handles mentions of @everyone, excluding the sender and the bot.
     * Filters out bots and the message author before creating reminders for everyone else.
     * 
     * @param {Message} message - The original message object.
     * @param {string} botId - The bot's ID to exclude it from reminders.
     */
    async handleEveryoneMention(message, botId) {
        // Fetch all members of the guild (either from cache or by requesting it)
        const guildMembers = message.guild.members.cache.size
            ? message.guild.members.cache
            : await message.guild.members.fetch();

        // Filter out bots, the message author, and the bot itself from the mentioned users
        const mentionedUsers = guildMembers
            .filter(member => !member.user.bot && member.user.id !== message.author.id && member.user.id !== botId)
            .map(member => member.user);

        // Create a reminder for all non-excluded members
        this.createReminder(message, new Map(mentionedUsers.map(user => [user.id, user])));
    }

    /**
     * Handles thread creation based on the original message and tracks thread messages.
     * If a user replies within a thread, they are marked as having responded.
     * 
     * @param {ThreadChannel} thread - The newly created thread.
     * @param {Message} starterMessage - The original message that started the thread.
     */
    handleThreadCreate(thread, starterMessage) {
        const messageId = starterMessage.id;
        // If there is no reminder for the original message, return
        if (!this.reminderData[messageId]) return;

        // Track messages in the thread using CollectorManager
        this.collectorManager.trackThreadMessages(thread, this.reminderData[messageId]);
    }
}

module.exports = ReminderManager;
