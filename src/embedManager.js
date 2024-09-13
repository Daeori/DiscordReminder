const { EmbedBuilder } = require('discord.js');

class EmbedManager {
    /**
     * Creates an embed for sending reminder messages.
     * @param {string} channelName - The name of the channel where the message was sent.
     * @param {string} mentionerName - The name of the person who mentioned the user.
     * @param {string} mentionerAvatarURL - The avatar URL of the person who mentioned the user.
     * @param {string} messageContent - The content of the original message.
     * @param {string} messageURL - The URL linking to the original message.
     * @param {number} reminderCount - The current reminder count for the user.
     * @param {number} maxReminders - The maximum number of reminders to be sent.
     * @returns {EmbedBuilder} - A Discord Embed object.
     */
    createReminderEmbed(channelName, mentionerName, mentionerAvatarURL, messageContent, messageURL, reminderCount, maxReminders) {
        // Create the embed with the specified style
        const embed = new EmbedBuilder()
            .setColor(0x930000) // Set color to blue (more visually appealing)
            .setTitle('❗You Have Yet To Respond❗') // Title of the embed
            .setURL(messageURL) // Link to the original message
            .setAuthor({ 
                name: `${mentionerName} mentioned you`, // Show who mentioned them
                iconURL: mentionerAvatarURL, // Mentioner's avatar
                url: 'https://discord.js.org' // Optional URL for the author
            })
            .setDescription('Please respond to the message to stop receiving reminders.') // Instruction text
            .addFields(
                { name: 'Channel:', value: channelName, inline: true }, // Display the channel name
                { name: 'Link to Message:', value: `[Click here to view the message](${messageURL})`, inline: true }, // Link to the message
                { name: 'Message Content:', value: `"**${messageContent}**"` } // Bold the message content to make it more apparent
            )
            .setTimestamp() // Timestamp when the reminder was created
            .setFooter({ 
                text: `Reminder ${reminderCount} of ${maxReminders}`, 
            });

        return embed; // Return the constructed embed
    }
}

module.exports = EmbedManager;
