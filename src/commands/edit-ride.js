const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/database');
const { formatRidePost, formatDateWithToday } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('edit-ride')
    .setDescription('Send a DM to the ride leader with edit options')
    .addStringOption(option =>
      option.setName('ride-id')
        .setDescription('The ID of the ride to edit')
        .setRequired(true)),

  async execute(interaction) {
    try {
      const rideId = interaction.options.getString('ride-id');
      
      // Get the ride from database
      const ride = await db.getRide(rideId);
      
      if (!ride) {
        await interaction.reply({
          content: '❌ Ride not found. Please check the ride ID.',
          ephemeral: true
        });
        return;
      }

      // Check if the user is the ride leader
      if (ride.leader.id !== interaction.user.id) {
        await interaction.reply({
          content: '❌ Only the ride leader can edit this ride.',
          ephemeral: true
        });
        return;
      }

      // Check if the ride is in the past (allow editing rides from today or future)
      const now = new Date();
      const rideDate = ride.date ? new Date(ride.date) : null;
      
      if (rideDate) {
        const rideDateOnly = new Date(rideDate.getFullYear(), rideDate.getMonth(), rideDate.getDate());
        const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Allow editing if ride is today or in the future
        if (rideDateOnly < nowDateOnly) {
          await interaction.reply({
            content: `❌ Cannot edit past rides. This ride is scheduled for ${formatDateWithToday(ride.date, 'long')}.`,
            ephemeral: true
          });
          return;
        }
      }

      // Create edit options embed
      const editEmbed = new EmbedBuilder()
        .setTitle('🚴‍♂️ Edit Ride Options')
        .setDescription(`**Ride**: ${ride.type.toUpperCase()} - ${formatDateWithToday(ride.date, 'short')}`)
        .setColor('#4ecdc4')
        .addFields(
          { name: 'What would you like to edit?', value: 'Click the link below to edit your ride with dropdown options.' }
        )
        .setFooter({ text: 'URG RideMaker • Edit Ride' });

      // Create a single edit link button
      const editButton = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`edit_ride_${rideId}_options`)
            .setLabel('🔧 Edit Ride')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔧')
        );

      // Send DM to the ride leader
      try {
        await interaction.user.send({
          embeds: [editEmbed],
          components: [editButton]
        });

        await interaction.reply({
          content: '✅ Edit link sent to your DM! Check your private messages.',
          ephemeral: true
        });
      } catch (dmError) {
        await interaction.reply({
          content: '❌ Unable to send DM. Please make sure you have DMs enabled from server members.',
          ephemeral: true
        });
      }

    } catch (error) {
      console.error('Error in edit-ride command:', error);
      await interaction.reply({
        content: '❌ An error occurred while processing the edit request.',
        ephemeral: true
      });
    }
  }
}; 