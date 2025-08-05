const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const { formatTime } = require('../utils/helpers');

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
        )),

  async execute(interaction) {
    try {
      const serverId = interaction.guildId;
      const rideType = interaction.options.getString('type');
      
      // Get active rides
      let rides = await db.getActiveRides(serverId);
      
      // Filter by type if specified
      if (rideType) {
        rides = rides.filter(ride => ride.type === rideType);
      }
      
      if (rides.length === 0) {
        await interaction.reply({
          content: rideType 
            ? `❌ No active ${rideType} rides found.`
            : '❌ No active rides found.',
          ephemeral: true
        });
        return;
      }

      // Sort rides by date
      rides.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Create embed with ride list
      const embed = new EmbedBuilder()
        .setTitle('🚴‍♂️ Active Rides')
        .setColor('#4ecdc4')
        .setFooter({ text: 'URG RideMaker • Use /edit-ride with the Ride ID to edit' });

      let description = '';
      
      for (const ride of rides) {
        const date = new Date(ride.date);
        const meetTime = formatTime(ride.meetTime.hours, ride.meetTime.minutes);
        const isLeader = ride.leader.id === interaction.user.id;
        const leaderIndicator = isLeader ? ' 👑' : '';
        
        description += `**${ride.type.toUpperCase()}** - ${date ? date.toLocaleDateString() : 'Date not set'} at ${meetTime}${leaderIndicator}\n`;
        description += `**Ride ID**: \`${ride.id}\`\n`;
        description += `**Leader**: <@${ride.leader.id}>\n`;
        
        if (ride.startingLocation) {
          description += `**Start**: ${ride.startingLocation}\n`;
        }
        
        if (ride.mileage) {
          description += `**Distance**: ${ride.mileage} miles\n`;
        }
        
        description += '\n';
      }

      embed.setDescription(description);

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });

    } catch (error) {
      console.error('Error listing rides:', error);
      await interaction.reply({
        content: '❌ An error occurred while listing rides.',
        ephemeral: true
      });
    }
  }
}; 