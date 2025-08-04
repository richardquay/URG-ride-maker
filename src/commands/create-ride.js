const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/database');
const {
  parseDate,
  parseTime,
  parseMileage,
  validateRouteUrl,
  formatRidePost,
  getReactionEmoji,
  validateRideType,
  validatePace,
  validateDropPolicy
} = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create-ride')
    .setDescription('Create a new bike ride')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type of ride')
        .setRequired(true)
        .addChoices(
          { name: 'Road', value: 'road' },
          { name: 'Gravel', value: 'gravel' },
          { name: 'Trail', value: 'trail' },
          { name: 'Social', value: 'social' }
        ))
    .addStringOption(option =>
      option.setName('pace')
        .setDescription('Ride pace')
        .setRequired(true)
        .addChoices(
          { name: 'Spicy', value: 'spicy' },
          { name: 'Party', value: 'party' }
        ))
    .addStringOption(option =>
      option.setName('date')
        .setDescription('Ride date (MM/DD, Today, or Tomorrow)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('meet-time')
        .setDescription('Meet time (HH:MM or HH:MM AM/PM)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('mileage')
        .setDescription('Distance in miles (or km)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('route')
        .setDescription('Strava or RideWithGPS route URL')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('avg-speed')
        .setDescription('Average speed in MPH (required for Spicy pace)')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('roll-time')
      .setDescription('Roll time offset in minutes')
      .setRequired(false)
      .addChoices(
        { name: '+5 minutes', value: 5 },
        { name: '+15 minutes', value: 15 },
        { name: '+30 minutes', value: 30 }
      ))
    .addUserOption(option =>
      option.setName('sweep')
        .setDescription('Sweep rider')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('drop-policy')
        .setDescription('Drop policy (auto-set for Party pace)')
        .setRequired(false)
        .addChoices(
          { name: 'Drop', value: 'drop' },
          { name: 'No Drop', value: 'no-drop' }
        )),

  async execute(interaction) {
    try {
      const serverId = interaction.guildId;
      
      // Get server configuration
      const config = await db.getServerConfig(serverId);
      if (!config) {
        await interaction.reply({
          content: '❌ Server not configured. Please run `/settings channels` first to set up channel mappings.',
          ephemeral: true
        });
        return;
      }

      // Validate channel mapping exists for this ride type
      const rideType = validateRideType(interaction.options.getString('type'));
      const channelId = config.channelMappings?.[rideType];
      
      if (!channelId) {
        await interaction.reply({
          content: `❌ No channel configured for ${rideType} rides. Please run \`/settings channels\` to set up channel mappings.`,
          ephemeral: true
        });
        return;
      }

      // Parse and validate all inputs
      const pace = validatePace(interaction.options.getString('pace'));
      const dateString = interaction.options.getString('date');
      const meetTimeString = interaction.options.getString('meet-time');
      const mileageString = interaction.options.getString('mileage');
      const routeUrl = interaction.options.getString('route');
      
      const avgSpeed = interaction.options.getInteger('avg-speed');
      const rollTime = interaction.options.getInteger('roll-time') || 15; // Default 15 minutes
      const sweepUser = interaction.options.getUser('sweep');
      const dropPolicyOption = interaction.options.getString('drop-policy');

      // Validate required avg-speed for Spicy pace
      if (pace === 'spicy' && !avgSpeed) {
        await interaction.reply({
          content: '❌ Average speed is required for Spicy pace rides.',
          ephemeral: true
        });
        return;
      }

      // Auto-set drop policy based on pace
      let dropPolicy;
      if (pace === 'party') {
        dropPolicy = 'no-drop';
      } else if (pace === 'spicy') {
        dropPolicy = dropPolicyOption || 'drop';
      }

      // Parse inputs
      const date = parseDate(dateString);
      const meetTime = parseTime(meetTimeString);
      const mileage = parseMileage(mileageString);
      const route = validateRouteUrl(routeUrl);

      // Create ride data
      const rideData = {
        serverId,
        channelId,
        type: rideType,
        pace,
        date,
        meetTime,
        mileage,
        route,
        avgSpeed: avgSpeed || null,
        rollTime,
        dropPolicy,
        leader: {
          id: interaction.user.id,
          username: interaction.user.username
        },
        sweep: sweepUser ? {
          id: sweepUser.id,
          username: sweepUser.username
        } : null
      };

      // Create ride in database
      const ride = await db.createRide(rideData);

      // Format and post ride message
      const rideMessage = formatRidePost(ride);
      const channel = interaction.guild.channels.cache.get(channelId);
      
      if (!channel) {
        await interaction.reply({
          content: '❌ Configured channel not found. Please check your channel mappings.',
          ephemeral: true
        });
        return;
      }

      const message = await channel.send(rideMessage);

      // Add reactions
      await message.react('🚴‍♂️'); // Going
      await message.react('🤔');   // Maybe
      await message.react('🌧️');   // Weather dependent

      // Update ride with message ID for future editing
      await db.updateRide(ride.id, { messageId: message.id });

      // Confirm to user
      await interaction.reply({
        content: `✅ Ride created successfully! Posted to ${channel}`,
        ephemeral: true
      });

    } catch (error) {
      console.error('Error creating ride:', error);
      
      let errorMessage = '❌ An error occurred while creating the ride.';
      
      if (error.message.includes('Invalid date format')) {
        errorMessage = '❌ Invalid date format. Use MM/DD, "Today", or "Tomorrow".';
      } else if (error.message.includes('Invalid time format')) {
        errorMessage = '❌ Invalid time format. Use HH:MM or HH:MM AM/PM.';
      } else if (error.message.includes('Mileage must be')) {
        errorMessage = '❌ Invalid mileage. Please provide a positive number.';
      } else if (error.message.includes('Route must be')) {
        errorMessage = '❌ Invalid route URL. Must be a Strava or RideWithGPS URL.';
      } else if (error.message.includes('Invalid ride type')) {
        errorMessage = '❌ Invalid ride type.';
      } else if (error.message.includes('Invalid pace')) {
        errorMessage = '❌ Invalid pace.';
      }

      await interaction.reply({
        content: errorMessage,
        ephemeral: true
      });
    }
  },
}; 