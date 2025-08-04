const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure bot settings for this server (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('channels')
        .setDescription('Set up channel mappings for ride types')
        .addChannelOption(option =>
          option.setName('road')
            .setDescription('Channel for road rides')
            .setRequired(false))
        .addChannelOption(option =>
          option.setName('gravel')
            .setDescription('Channel for gravel rides')
            .setRequired(false))
        .addChannelOption(option =>
          option.setName('trail')
            .setDescription('Channel for trail rides')
            .setRequired(false))
        .addChannelOption(option =>
          option.setName('social')
            .setDescription('Channel for social rides')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('timezone')
        .setDescription('Set the server timezone')
        .addStringOption(option =>
          option.setName('timezone')
            .setDescription('Timezone (e.g., America/Chicago)')
            .setRequired(true)
            .addChoices(
              { name: 'Central Time (America/Chicago)', value: 'America/Chicago' },
              { name: 'Eastern Time (America/New_York)', value: 'America/New_York' },
              { name: 'Mountain Time (America/Denver)', value: 'America/Denver' },
              { name: 'Pacific Time (America/Los_Angeles)', value: 'America/Los_Angeles' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current server settings')),

  async execute(interaction) {
    const serverId = interaction.guildId;
    const subcommand = interaction.options.getSubcommand();

    try {
      // Get or create server config
      let config = await db.getServerConfig(serverId);
      if (!config) {
        config = await db.createServerConfig(serverId, {});
      }

      if (subcommand === 'channels') {
        const updates = {};
        const channelOptions = ['road', 'gravel', 'trail', 'social'];
        
        for (const rideType of channelOptions) {
          const channel = interaction.options.getChannel(rideType);
          if (channel) {
            updates[`channelMappings.${rideType}`] = channel.id;
          }
        }

        if (Object.keys(updates).length === 0) {
          await interaction.reply({
            content: '❌ No channels specified. Please provide at least one channel mapping.',
            ephemeral: true
          });
          return;
        }

        await db.updateServerConfig(serverId, updates);
        
        const channelList = Object.entries(updates)
          .map(([key, value]) => {
            const rideType = key.split('.')[1];
            const channelName = interaction.guild.channels.cache.get(value)?.name || 'Unknown';
            return `• **${rideType}**: #${channelName}`;
          })
          .join('\n');

        await interaction.reply({
          content: `✅ Channel mappings updated!\n\n${channelList}`,
          ephemeral: true
        });

      } else if (subcommand === 'timezone') {
        const timezone = interaction.options.getString('timezone');
        
        await db.updateServerConfig(serverId, { timezone });
        
        await interaction.reply({
          content: `✅ Server timezone set to: **${timezone}**`,
          ephemeral: true
        });

      } else if (subcommand === 'view') {
        const channelMappings = config.channelMappings || {};
        const timezone = config.timezone || 'America/Chicago';
        
        let channelList = 'No channels configured';
        if (Object.keys(channelMappings).length > 0) {
          channelList = Object.entries(channelMappings)
            .map(([rideType, channelId]) => {
              const channelName = interaction.guild.channels.cache.get(channelId)?.name || 'Unknown';
              return `• **${rideType}**: #${channelName}`;
            })
            .join('\n');
        }

        await interaction.reply({
          content: `**Server Settings**\n\n**Timezone**: ${timezone}\n\n**Channel Mappings**:\n${channelList}`,
          ephemeral: true
        });
      }

    } catch (error) {
      console.error('Error in settings command:', error);
      
      // Check if we've already replied to avoid the "already acknowledged" error
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while updating settings. Please try again.',
          ephemeral: true
        });
      } else {
        await interaction.followUp({
          content: '❌ An error occurred while updating settings. Please try again.',
          ephemeral: true
        });
      }
    }
  },
}; 