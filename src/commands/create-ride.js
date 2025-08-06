const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/database');
const {
  parseDate,
  parseTime,
  parseMileage,
  validateRouteUrl,
  formatRidePost,
  formatDateWithToday,
  getReactionEmoji,
  validateRideType,
  validatePace,
  validateDropPolicy,
  getDefaultStartingLocation,
  validateLocation
} = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create-ride')
    .setDescription('Create a new bike ride')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type of ride (REQUIRED)')
        .setRequired(true)
        .addChoices(
          { name: '🛣️ Road', value: 'road' },
          { name: '🪨 Gravel', value: 'gravel' },
          { name: '⛰️ Trail', value: 'trail' },
          { name: '🤡 Social', value: 'social' }
        ))
    .addStringOption(option =>
      option.setName('pace')
        .setDescription('Ride pace (REQUIRED)')
        .setRequired(true)
        .addChoices(
          { name: '🌶️ Spicy', value: 'spicy' },
          { name: '🎉 Party', value: 'party' }
        ))
    .addStringOption(option =>
      option.setName('date')
        .setDescription('Ride date (REQUIRED) - MM/DD, Today, or Tomorrow')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('start-time')
        .setDescription('Start time (REQUIRED) - HH:MM or HH:MM AM/PM')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('drop')
        .setDescription('Drop policy (REQUIRED)')
        .setRequired(true)
        .addChoices(
          { name: 'Drop', value: 'drop' },
          { name: 'No Drop', value: 'no-drop' },
          { name: 'Regroup', value: 'regroup' }
        ))
    .addStringOption(option =>
      option.setName('starting-location')
        .setDescription('Starting location (OPTIONAL) - will default based on time')
        .setRequired(false)
        .addChoices(
          { name: 'Angry Catfish', value: 'angry-catfish' },
          { name: 'Northern Coffeeworks', value: 'northern-coffeeworks' },
          { name: 'Other', value: 'other' }
        ))
    .addStringOption(option =>
      option.setName('end-location')
        .setDescription('End location (OPTIONAL)')
        .setRequired(false)
        .addChoices(
          { name: 'Angry Catfish', value: 'angry-catfish' },
          { name: 'Northern Coffeeworks', value: 'northern-coffeeworks' },
          { name: 'Venn Brewery', value: 'venn-brewery' },
          { name: 'Bull Horns', value: 'bull-horns' },
          { name: 'Sea Salt', value: 'sea-salt' },
          { name: 'Other', value: 'other' }
        ))
    .addStringOption(option =>
      option.setName('mileage')
        .setDescription('Distance in miles (OPTIONAL)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('route')
        .setDescription('Strava or RideWithGPS route URL (OPTIONAL)')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('avg-speed')
        .setDescription('Average speed in MPH (OPTIONAL)')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('roll-time')
      .setDescription('Roll time offset in minutes (OPTIONAL)')
      .setRequired(false)
      .addChoices(
        { name: '+5 minutes', value: 5 },
        { name: '+15 minutes', value: 15 },
        { name: '+30 minutes', value: 30 }
      ))
    .addUserOption(option =>
      option.setName('sweep')
        .setDescription('Sweep rider (OPTIONAL)')
        .setRequired(false)),

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
      const startTimeString = interaction.options.getString('start-time');
      const dropPolicy = validateDropPolicy(interaction.options.getString('drop'));
      
      const mileageString = interaction.options.getString('mileage');
      const routeUrl = interaction.options.getString('route');
      const avgSpeed = interaction.options.getInteger('avg-speed');
      const rollTime = interaction.options.getInteger('roll-time') || 15; // Default 15 minutes
      const sweepUser = interaction.options.getUser('sweep');

      // Handle starting location
      let startingLocation = interaction.options.getString('starting-location');
      if (!startingLocation) {
        // Parse time to determine default starting location
        const startTime = parseTime(startTimeString);
        startingLocation = getDefaultStartingLocation(startTime.hours);
      }

      // Handle end location
      let endLocation = interaction.options.getString('end-location');

      // If either location is "other", show modal for custom input
      if (startingLocation === 'other' || endLocation === 'other') {
        const modal = new ModalBuilder()
          .setCustomId('location_modal')
          .setTitle('Enter Custom Location');

        const startingLocationInput = new TextInputBuilder()
          .setCustomId('starting_location_input')
          .setLabel('Starting Location (leave blank if not "other")')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setPlaceholder('Enter custom starting location...');

        const endLocationInput = new TextInputBuilder()
          .setCustomId('end_location_input')
          .setLabel('End Location (leave blank if not "other")')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setPlaceholder('Enter custom end location...');

        const firstActionRow = new ActionRowBuilder().addComponents(startingLocationInput);
        const secondActionRow = new ActionRowBuilder().addComponents(endLocationInput);

        modal.addComponents(firstActionRow, secondActionRow);

        // Store the current interaction data for later use
        const interactionData = {
          serverId,
          channelId,
          rideType,
          pace,
          dateString,
          startTimeString,
          dropPolicy,
          mileageString,
          routeUrl,
          avgSpeed,
          rollTime,
          sweepUser,
          startingLocation,
          endLocation
        };

        // Store the data temporarily (you might want to use a more robust storage solution)
        interaction.client.tempData = interactionData;

        await interaction.showModal(modal);
        return;
      }

      // Continue with ride creation if no modal needed
      await this.createRideFromData(interaction, {
        serverId,
        channelId,
        rideType,
        pace,
        dateString,
        startTimeString,
        dropPolicy,
        mileageString,
        routeUrl,
        avgSpeed,
        rollTime,
        sweepUser,
        startingLocation,
        endLocation
      });

    } catch (error) {
      console.error('Error creating ride:', error);
      
      let errorMessage = '❌ An error occurred while creating the ride.';
      
      if (error.message.includes('Invalid date format')) {
        errorMessage = '❌ Invalid date format. Use MM/DD, "Today", or "Tomorrow".';
      } else if (error.message.includes('Invalid time format')) {
        errorMessage = '❌ Invalid time format. Use HH:MM, HH:MM AM/PM, or lazy formats like "6pm".';
      } else if (error.message.includes('Mileage must be')) {
        errorMessage = '❌ Invalid mileage. Please provide a positive number.';
      } else if (error.message.includes('Route must be')) {
        errorMessage = '❌ Invalid route URL. Must be a Strava or RideWithGPS URL.';
      } else if (error.message.includes('Invalid ride type')) {
        errorMessage = '❌ Invalid ride type.';
      } else if (error.message.includes('Invalid pace')) {
        errorMessage = '❌ Invalid pace.';
      } else if (error.message.includes('Invalid drop policy')) {
        errorMessage = '❌ Invalid drop policy.';
      }

      // Check if we've already replied to avoid the "already acknowledged" error
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: errorMessage,
          ephemeral: true
        });
      } else {
        await interaction.followUp({
          content: errorMessage,
          ephemeral: true
        });
      }
    }
  },

  async createRideFromData(interaction, data) {
    try {
      const {
        serverId,
        channelId,
        rideType,
        pace,
        dateString,
        startTimeString,
        dropPolicy,
        mileageString,
        routeUrl,
        avgSpeed,
        rollTime,
        sweepUser,
        startingLocation,
        endLocation
      } = data;



      // Parse inputs
      const date = parseDate(dateString);
      const startTime = parseTime(startTimeString);
      
      // Parse optional inputs
      let mileage = null;
      let route = null;
      
      if (mileageString) {
        mileage = parseMileage(mileageString);
      }
      
      if (routeUrl) {
        route = validateRouteUrl(routeUrl);
      }

      // Validate locations
      const validatedStartingLocation = validateLocation(startingLocation);
      const validatedEndLocation = endLocation ? validateLocation(endLocation) : null;

      // Create ride data
      const rideData = {
        serverId,
        channelId,
        type: rideType,
        pace,
        date,
        meetTime: startTime, // Keep the field name consistent
        mileage,
        route,
        avgSpeed: avgSpeed || null,
        rollTime,
        dropPolicy,
        startingLocation: validatedStartingLocation,
        endLocation: validatedEndLocation,
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
      const rideEmbed = formatRidePost(ride, 'created');
      const channel = interaction.guild.channels.cache.get(channelId);
      
      if (!channel) {
        await interaction.reply({
          content: '❌ Configured channel not found. Please check your channel mappings.',
          ephemeral: true
        });
        return;
      }

      const message = await channel.send({ embeds: [rideEmbed] });

      // Add reactions
      await message.react('🚴‍♂️'); // Going
      await message.react('🤔');   // Maybe

      // Update ride with message ID for future editing
      await db.updateRide(ride.id, { messageId: message.id });

      // Send confirmation DM to user with ride details
      try {
        // Calculate roll time
        const rollTime = new Date(ride.date);
        rollTime.setHours(ride.meetTime.hours, ride.meetTime.minutes + (ride.rollTime || 0));
        const rollTimeFormatted = `${rollTime.getHours().toString().padStart(2, '0')}:${rollTime.getMinutes().toString().padStart(2, '0')}`;

        const dmEmbed = new EmbedBuilder()
          .setTitle('✅ Ride Created Successfully!')
          .setColor('#4ecdc4')
          .setDescription(`Your **${ride.type.toUpperCase()}** ride has been posted to ${channel}`)
          .addFields(
            { name: 'Date', value: formatDateWithToday(ride.date, 'long'), inline: true },
            { name: 'Meet Time', value: `${ride.meetTime.hours.toString().padStart(2, '0')}:${ride.meetTime.minutes.toString().padStart(2, '0')}`, inline: true },
            { name: 'Roll Time', value: rollTimeFormatted, inline: true },
            { name: 'Pace', value: ride.pace.charAt(0).toUpperCase() + ride.pace.slice(1), inline: true },
            { name: 'Drop Policy', value: ride.dropPolicy === 'drop' ? 'Drop' : 'No Drop', inline: true },
            { name: 'Distance', value: ride.mileage ? `${ride.mileage} miles` : 'Not specified', inline: true },
            { name: 'Starting Location', value: ride.startingLocation || 'Not specified', inline: true },
            { name: 'End Location', value: ride.endLocation || 'Not specified', inline: true },
            { name: '🆔 Ride ID', value: `\`${ride.id}\``, inline: false }
          )
          .setFooter({ text: 'URG RideMaker • Ride Created' });

        // Create edit button
        const editButton = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`edit_ride_${ride.id}_options`)
              .setLabel('✏️ Edit Ride')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('✏️')
          );

        await interaction.user.send({ embeds: [dmEmbed], components: [editButton] });

        // Send ephemeral confirmation in channel
        await interaction.reply({
          content: `✅ Ride created successfully! Posted to ${channel}\n📬 Check your DMs for ride details and edit options.`,
          ephemeral: true
        });

      } catch (dmError) {
        // Fallback to channel message if DM fails
        await interaction.reply({
          content: `✅ Ride created successfully! Posted to ${channel}\n\n**Ride ID**: \`${ride.id}\`\nUse \`/edit-ride ride-id:${ride.id}\` to edit this ride.\n\n*Note: Unable to send DM. Please ensure DMs are enabled.*`,
          ephemeral: true
        });
      }

    } catch (error) {
      console.error('Error creating ride from data:', error);
      throw error;
    }
  }
}; 