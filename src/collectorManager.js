class CollectorManager {
    /**
     * Tracks reactions to a specific message from mentioned users.
     * @param {Message} message - The Discord message object that was sent.
     * @param {Map} mentionedUsers - A map of users mentioned in the message.
     * @param {Object} reminder - The reminder object to store users who have reacted.
     */
    trackReactions(message, mentionedUsers, reminder) {
        // Create a reaction collector that filters only reactions from the mentioned users
        const reactionCollector = message.createReactionCollector({
            filter: (reaction, user) => mentionedUsers.has(user.id)
        });

        // When a user reacts, add their ID to the 'usersReplied' set in the reminder object
        reactionCollector.on('collect', (reaction, user) => {
            reminder.usersReplied.add(user.id);  // Mark the user as having reacted
            console.log(`${user.tag} reacted with ${reaction.emoji.name}`);
        });

        // When the reaction collection ends (after a timeout or other condition), log a message
        reactionCollector.on('end', () => {
            console.log('Reaction collection ended.');
        });
    }

    /**
     * Tracks replies in the same channel to a specific message from mentioned users.
     * @param {Message} message - The original message to track replies to.
     * @param {Map} mentionedUsers - A map of users mentioned in the message.
     * @param {Object} reminder - The reminder object to store users who have replied.
     */
    trackReplies(message, mentionedUsers, reminder) {
        // Create a message collector to track replies to the specific message
        const messageCollector = message.channel.createMessageCollector({
            filter: (m) => mentionedUsers.has(m.author.id) && m.reference?.messageId === message.id  // Ensure replies are to the specific message
        });

        // When a user replies, add their ID to the 'usersReplied' set in the reminder object
        messageCollector.on('collect', (m) => {
            reminder.usersReplied.add(m.author.id);  // Mark the user as having replied
            console.log(`${m.author.tag} replied.`);
        });

        // When the message collection ends, log that it's over
        messageCollector.on('end', () => {
            console.log('Message collection ended.');
        });
    }

    /**
     * Tracks messages in a thread created from a specific message by mentioned users.
     * @param {ThreadChannel} thread - The Discord thread created based on the original message.
     * @param {Object} reminder - The reminder object to store users who have replied within the thread.
     */
    trackThreadMessages(thread, reminder) {
        // Create a message collector that tracks messages in the thread by the mentioned users
        const threadMessageCollector = thread.createMessageCollector({
            filter: (m) => reminder.mentionedUsers.has(m.author.id)  // Filter only for replies from the mentioned users
        });

        // When a user replies in the thread, add their ID to the 'usersReplied' set
        threadMessageCollector.on('collect', (m) => {
            reminder.usersReplied.add(m.author.id);  // Mark the user as having replied in the thread
            console.log(`${m.author.tag} replied in the thread.`);
        });

        // When the thread message collection ends, log that it's over
        threadMessageCollector.on('end', () => {
            console.log('Thread message collection ended.');
        });
    }
}

module.exports = CollectorManager;
