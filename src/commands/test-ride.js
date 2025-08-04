const { SlashCommandBuilder } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test-ride')
    .setDescription('Test ride creation functionality'),

  async execute(interaction) {
    try {
      const serverId = interaction.guildId;
      
      // Test server config
      let config = await db.getServerConfig(serverId);
      if (!config) {
        config = await db.createServerConfig(serverId, {
          channelMappings: {
            road: interaction.channelId
          }
        });
        await interaction.reply({
          content: `✅ Created server config for ${interaction.guild.name}`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `✅ Server config exists for ${interaction.guild.name}`,
          ephemeral: true
        });
      }

      // Test ride creation
      const testRide = {
        serverId,
        channelId: interaction.channelId,
        type: 'road',
        pace: 'party',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        meetTime: { hours: 9, minutes: 0 },
        mileage: 25,
        route: 'https://www.strava.com/routes/test',
        avgSpeed: null,
        rollTime: 15,
        dropPolicy: 'no-drop',
        leader: {
          id: interaction.user.id,
          username: interaction.user.username
        },
        sweep: null
      };

      const ride = await db.createRide(testRide);
      
      await interaction.followUp({
        content: `✅ Test ride created with ID: ${ride.id}`,
        ephemeral: true
      });

    } catch (error) {
      console.error('Error in test-ride command:', error);
      await interaction.reply({
        content: `❌ Test failed: ${error.message}`,
        ephemeral: true
      });
    }
  },
}; 