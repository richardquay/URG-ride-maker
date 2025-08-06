const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/database');
const { formatTime, formatDateWithToday } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-rides')
    .setDescription('List active rides with their IDs for editing')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Filter by ride type')
        .setRequired(false)
        .addChoices(
          { name: 'Road', value: 'road' },
          { name: 'Gravel', value: 'gravel' },
          { name: 'Trail', value: 'trail' },
          { name: 'Social', value: 'social' }
        ))
    .addStringOption(option =>
      option.setName('filter')
        .setDescription('Filter rides by your participation')
        .setRequired(false)
        .addChoices(
          { name: 'My Rides (Going/Maybe)', value: 'my_rides' },
          { name: 'All Rides', value: 'all_rides' }
        )),

  async execute(interaction) {
    try {
      const serverId = interaction.guildId;
      const rideType = interaction.options.getString('type');
      const filterOption = interaction.options.getString('filter') || 'all_rides';
      const currentUserId = interaction.user.id;
      
      // Get active rides
      let rides = await db.getActiveRides(serverId);
      
      // Filter by type if specified
      if (rideType) {
        rides = rides.filter(ride => ride.type === rideType);
      }
      
      // Filter by user participation if specified
      if (filterOption === 'my_rides') {
        rides = rides.filter(ride => {
          // Include rides where user is the leader
          if (ride.leader && ride.leader.id === currentUserId) {
            return true;
          }
          
          // Include rides where user is going or maybe
          if (ride.attendees) {
            const isGoing = ride.attendees.going && ride.attendees.going.includes(currentUserId);
            const isMaybe = ride.attendees.maybe && ride.attendees.maybe.includes(currentUserId);
            return isGoing || isMaybe;
          }
          
          return false;
        });
      }
      
      if (rides.length === 0) {
        let noRidesMessage = '❌ No active rides found.';
        if (rideType) {
          noRidesMessage = `❌ No active ${rideType} rides found.`;
        }
        if (filterOption === 'my_rides') {
          noRidesMessage = rideType 
            ? `❌ No active ${rideType} rides found that you're participating in.`
            : '❌ No active rides found that you\'re participating in.';
        }
        
        await interaction.reply({
          content: noRidesMessage,
          ephemeral: true
        });
        return;
      }

      // Sort rides by date
      rides.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Create embed with ride list
      const embedTitle = filterOption === 'my_rides' ? '🚴‍♂️ My Active Rides' : '🚴‍♂️ Active Rides';
      const embed = new EmbedBuilder()
        .setTitle(embedTitle)
        .setColor('#4ecdc4')
        .setFooter({ text: 'URG RideMaker • Use /edit-ride with the Ride ID to edit' });

      let description = '';
      
      for (const ride of rides) {
        const date = new Date(ride.date);
        const meetTime = formatTime(ride.meetTime.hours, ride.meetTime.minutes);
        const isLeader = ride.leader.id === currentUserId;
        const leaderIndicator = isLeader ? ' 👑' : '';
        
        // Check if user is attending
        let attendeeStatus = '';
        if (ride.attendees) {
          if (ride.attendees.going && ride.attendees.going.includes(currentUserId)) {
            attendeeStatus = ' ✅ Going';
          } else if (ride.attendees.maybe && ride.attendees.maybe.includes(currentUserId)) {
            attendeeStatus = ' 🤔 Maybe';
          }
        }
        
        description += `**${ride.type.toUpperCase()}** - ${formatDateWithToday(ride.date, 'short')} at ${meetTime}${leaderIndicator}${attendeeStatus}\n`;
        if (ride.startingLocation) {
          description += `**Start**: ${ride.startingLocation}\n`;
        }
        
        if (ride.mileage) {
          description += `**Distance**: ${ride.mileage} miles\n`;
        }
        
        description += '\n\n';
      }

      embed.setDescription(description);

      // Create buttons for each ride (max 5 buttons per row, Discord limit)
      const buttonRows = [];
      const maxButtonsPerRow = 5;
      
      for (let i = 0; i < rides.length; i += maxButtonsPerRow) {
        const row = new ActionRowBuilder();
        const rideBatch = rides.slice(i, i + maxButtonsPerRow);
        
        rideBatch.forEach((ride, index) => {
          const rideIndex = i + index;
          const date = new Date(ride.date);
          const shortDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          
          const button = new ButtonBuilder()
            .setCustomId(`view_ride_${ride.id}`)
            .setLabel(`${ride.type.toUpperCase()} ${shortDate}, ${ride.meetTime.hours}:${ride.meetTime.minutes}`)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🚴‍♂️');
          
          row.addComponents(button);
        });
        
        buttonRows.push(row);
      }

      await interaction.reply({
        embeds: [embed],
        components: buttonRows,
        ephemeral: true
      });

    } catch (error) {
      console.error('Error listing rides:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      
      // Check if interaction has already been replied to
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `❌ An error occurred while listing rides: ${error.message}`,
          ephemeral: true
        });
      } else {
        await interaction.followUp({
          content: `❌ An error occurred while listing rides: ${error.message}`,
          ephemeral: true
        });
      }
    }
  }
}; 