const { Events } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    // Ignore bot reactions
    if (user.bot) return;

    // Fetch the reaction if it's partial
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Error fetching reaction:', error);
        return;
      }
    }

    // Get the message
    const message = reaction.message;
    if (!message) return;

    try {
      // Find the ride in database by message ID
      const ridesSnapshot = await db.getDb()
        .collection('rides')
        .where('messageId', '==', message.id)
        .limit(1)
        .get();

      if (ridesSnapshot.empty) {
        return; // Not a ride message
      }

      const rideDoc = ridesSnapshot.docs[0];
      const ride = { id: rideDoc.id, ...rideDoc.data() };

      // Map emoji to attendee type
      const emojiToType = {
        '🚴‍♂️': 'going',
        '🤔': 'maybe',
        '🌧️': 'weather'
      };

      const attendeeType = emojiToType[reaction.emoji.name];
      if (!attendeeType) {
        return; // Not a valid reaction emoji
      }

      // Remove user from attendee list
      await db.updateRideAttendees(ride.id, attendeeType, user.id, 'remove');

      console.log(`User ${user.username} removed reaction ${reaction.emoji.name} from ride ${ride.id}`);

    } catch (error) {
      console.error('Error handling reaction remove:', error);
    }
  },
}; 