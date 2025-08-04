const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/database');
const { formatRidePost } = require('../utils/helpers');

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

      // Check if the ride is in the future
      const now = new Date();
      const rideDate = new Date(ride.date);
      if (rideDate < now) {
        await interaction.reply({
          content: '❌ Cannot edit past rides.',
          ephemeral: true
        });
        return;
      }

      // Create edit options embed
      const editEmbed = new EmbedBuilder()
        .setTitle('🚴‍♂️ Edit Ride Options')
        .setDescription(`**Ride**: ${ride.type.toUpperCase()} - ${ride.date.toLocaleDateString()}`)
        .setColor('#4ecdc4')
        .addFields(
          { name: 'What would you like to edit?', value: 'Click a button below to edit a specific field.' }
        )
        .setFooter({ text: 'URG RideMaker • Edit Ride' });

      // Create buttons for different edit options
      const editButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`edit_ride_${rideId}_date`)
            .setLabel('📅 Date/Time')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`edit_ride_${rideId}_location`)
            .setLabel('📍 Location')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`edit_ride_${rideId}_details`)
            .setLabel('📝 Details')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`edit_ride_${rideId}_cancel`)
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Danger)
        );

      // Send DM to the ride leader
      try {
        await interaction.user.send({
          embeds: [editEmbed],
          components: [editButtons]
        });

        await interaction.reply({
          content: '✅ Edit options sent to your DM! Check your private messages.',
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