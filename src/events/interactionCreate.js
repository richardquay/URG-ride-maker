const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../utils/database');
const {
  parseDate,
  parseTime,
  parseMileage,
  validateRouteUrl,
  formatRidePost,
  validateLocation,
  LOCATIONS
} = require('../utils/helpers');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Handle button interactions for ride editing
    if (interaction.isButton()) {
      const customId = interaction.customId;
      
      // Check if this is a ride edit button
      if (customId.startsWith('edit_ride_')) {
        await handleRideEditButton(interaction, customId);
        return;
      }
    }

    // Handle select menu interactions for ride editing
    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;
      
      // Check if this is a ride edit select menu
      if (customId.startsWith('edit_ride_select_')) {
        await handleRideEditSelect(interaction, customId);
        return;
      }
    }

    // Handle modal submissions for ride editing
    if (interaction.isModalSubmit()) {
      const customId = interaction.customId;
      
      // Check if this is a ride edit modal
      if (customId.startsWith('edit_ride_modal_')) {
        await handleRideEditModal(interaction, customId);
        return;
      }
    }
  }
};

async function handleRideEditButton(interaction, customId) {
  try {
    const parts = customId.split('_');
    const rideId = parts[2];
    const editType = parts[3];

    // Get the ride to verify ownership
    const ride = await db.getRide(rideId);
    if (!ride || ride.leader.id !== interaction.user.id) {
      await interaction.reply({
        content: '❌ You can only edit your own rides.',
        ephemeral: true
      });
      return;
    }

    if (editType === 'options') {
      // Show edit options with dropdowns
      await showEditOptions(interaction, rideId, ride);
    }

  } catch (error) {
    console.error('Error handling ride edit button:', error);
    await interaction.reply({
      content: '❌ An error occurred while processing the edit request.',
      ephemeral: true
    });
  }
}

async function showEditOptions(interaction, rideId, ride) {
  // Create edit options embed
  const editEmbed = new EmbedBuilder()
    .setTitle('🔧 Edit Ride Options')
    .setDescription(`**Ride**: ${ride.type.toUpperCase()} - ${ride.date ? ride.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }) : 'No date'}`)
    .setColor('#4ecdc4')
    .addFields(
      { name: 'What would you like to edit?', value: 'Select an option from the dropdown below.' }
    )
    .setFooter({ text: 'URG RideMaker • Edit Ride' });

  // Create dropdown for edit options
  const editSelect = new StringSelectMenuBuilder()
    .setCustomId(`edit_ride_select_${rideId}_type`)
    .setPlaceholder('Choose what to edit...')
    .addOptions([
      {
        label: '📅 Date & Time',
        description: 'Edit the ride date, start time, and roll time',
        value: 'date',
        emoji: '📅'
      },
      {
        label: '📍 Location',
        description: 'Edit starting and ending locations',
        value: 'location',
        emoji: '📍'
      },
      {
        label: '📝 Details',
        description: 'Edit mileage, route URL, and average speed',
        value: 'details',
        emoji: '📝'
      }
    ]);

  const row = new ActionRowBuilder().addComponents(editSelect);

  await interaction.update({
    embeds: [editEmbed],
    components: [row]
  });
}

async function handleRideEditSelect(interaction, customId) {
  try {
    const parts = customId.split('_');
    const rideId = parts[3];
    const editType = parts[4];

    // Get the ride to verify ownership
    const ride = await db.getRide(rideId);
    if (!ride || ride.leader.id !== interaction.user.id) {
      await interaction.reply({
        content: '❌ You can only edit your own rides.',
        ephemeral: true
      });
      return;
    }

    if (editType === 'type') {
      const selectedValue = interaction.values[0];
      
      if (selectedValue === 'location') {
        // Show location dropdowns
        await showLocationEditOptions(interaction, rideId, ride);
      } else {
        // Show modal for date/time or details
        const modal = createEditModal(rideId, selectedValue, ride);
        await interaction.showModal(modal);
      }
    } else if (editType === 'start_location') {
      const selectedLocation = interaction.values[0];
      await handleLocationUpdate(interaction, rideId, ride, 'startingLocation', selectedLocation);
    } else if (editType === 'end_location') {
      const selectedLocation = interaction.values[0];
      await handleLocationUpdate(interaction, rideId, ride, 'endLocation', selectedLocation);
    }

  } catch (error) {
    console.error('Error handling ride edit select:', error);
    await interaction.reply({
      content: '❌ An error occurred while processing the edit request.',
      ephemeral: true
    });
  }
}

async function showLocationEditOptions(interaction, rideId, ride) {
  // Create location options embed
  const locationEmbed = new EmbedBuilder()
    .setTitle('📍 Edit Ride Locations')
    .setDescription(`**Ride**: ${ride.type.toUpperCase()} - ${ride.date ? ride.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }) : 'No date'}`)
    .setColor('#4ecdc4')
    .addFields(
      { name: 'Current Locations', value: `**Start**: ${ride.startingLocation || 'Not set'}\n**End**: ${ride.endLocation || 'Not set'}` }
    )
    .setFooter({ text: 'URG RideMaker • Edit Locations' });

  // Create dropdowns for starting and ending locations
  const startLocationOptions = Object.entries(LOCATIONS).map(([key, location]) => ({
    label: location.name,
    description: `Select ${location.name} as starting location`,
    value: key,
    emoji: key === ride.startingLocation ? '✅' : '📍'
  }));

  const endLocationOptions = [
    {
      label: 'No End Location',
      description: 'Remove end location',
      value: 'none',
      emoji: '❌'
    },
    ...Object.entries(LOCATIONS).map(([key, location]) => ({
      label: location.name,
      description: `Select ${location.name} as ending location`,
      value: key,
      emoji: key === ride.endLocation ? '✅' : '📍'
    }))
  ];

  const startLocationSelect = new StringSelectMenuBuilder()
    .setCustomId(`edit_ride_select_${rideId}_start_location`)
    .setPlaceholder('Choose starting location...')
    .addOptions(startLocationOptions);

  const endLocationSelect = new StringSelectMenuBuilder()
    .setCustomId(`edit_ride_select_${rideId}_end_location`)
    .setPlaceholder('Choose ending location (optional)...')
    .addOptions(endLocationOptions);

  const row1 = new ActionRowBuilder().addComponents(startLocationSelect);
  const row2 = new ActionRowBuilder().addComponents(endLocationSelect);

  await interaction.update({
    embeds: [locationEmbed],
    components: [row1, row2]
  });
}

async function handleLocationUpdate(interaction, rideId, ride, locationType, selectedLocation) {
  try {
    let updates = {};
    
    if (locationType === 'startingLocation') {
      updates = {
        startingLocation: selectedLocation
      };
    } else if (locationType === 'endLocation') {
      updates = {
        endLocation: selectedLocation === 'none' ? null : selectedLocation
      };
    }

    // Update the ride in the database
    const updatedRide = await db.updateRide(rideId, updates);

    // Update the original message if it exists
    if (ride.messageId && ride.channelId) {
      try {
        const channel = interaction.client.channels.cache.get(ride.channelId);
        if (channel) {
          const message = await channel.messages.fetch(ride.messageId);
          if (message) {
            const updatedEmbed = formatRidePost(updatedRide, 'updated');
            await message.edit({ embeds: [updatedEmbed] });
          }
        }
      } catch (messageError) {
        console.error('Error updating original message:', messageError);
        // Continue even if message update fails
      }
    }

    // Send confirmation to user
    await interaction.reply({
      content: `✅ ${locationType === 'startingLocation' ? 'Starting location' : 'End location'} updated successfully!`,
      ephemeral: true
    });

    // Update the DM message to show success
    const successEmbed = new EmbedBuilder()
      .setTitle('✅ Location Updated Successfully')
      .setDescription(`Your ${updatedRide.type.toUpperCase()} ride location has been updated.`)
      .setColor('#4ecdc4')
      .setFooter({ text: 'URG RideMaker • Edit Complete' });

    await interaction.message.edit({
      embeds: [successEmbed],
      components: []
    });

  } catch (error) {
    console.error('Error handling location update:', error);
    await interaction.reply({
      content: '❌ An error occurred while updating the location.',
      ephemeral: true
    });
  }
}

function createEditModal(rideId, editType, ride) {
  const modal = new ModalBuilder()
    .setCustomId(`edit_ride_modal_${rideId}_${editType}`)
    .setTitle(`Edit Ride - ${editType.charAt(0).toUpperCase() + editType.slice(1)}`);

  if (editType === 'date') {
    // Date/Time edit modal
    const dateInput = new TextInputBuilder()
      .setCustomId('date_input')
      .setLabel('Date (MM/DD, Today, or Tomorrow)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(ride.date ? ride.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }) : '');

    const timeInput = new TextInputBuilder()
      .setCustomId('time_input')
      .setLabel('Start Time (HH:MM or HH:MM AM/PM)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(`${ride.meetTime.hours.toString().padStart(2, '0')}:${ride.meetTime.minutes.toString().padStart(2, '0')}`);

    const rollTimeInput = new TextInputBuilder()
      .setCustomId('roll_time_input')
      .setLabel('Roll Time Offset (minutes)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(ride.rollTime.toString());

    const firstRow = new ActionRowBuilder().addComponents(dateInput);
    const secondRow = new ActionRowBuilder().addComponents(timeInput);
    const thirdRow = new ActionRowBuilder().addComponents(rollTimeInput);

    modal.addComponents(firstRow, secondRow, thirdRow);

  } else if (editType === 'location') {
    // Location editing is now handled with dropdowns, so this shouldn't be called
    throw new Error('Location editing should use dropdowns, not modals');

  } else if (editType === 'details') {
    // Details edit modal
    const mileageInput = new TextInputBuilder()
      .setCustomId('mileage_input')
      .setLabel('Distance (miles)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(ride.mileage ? ride.mileage.toString() : '');

    const routeInput = new TextInputBuilder()
      .setCustomId('route_input')
      .setLabel('Route URL (Strava/RideWithGPS)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(ride.route || '');

    const avgSpeedInput = new TextInputBuilder()
      .setCustomId('avg_speed_input')
      .setLabel('Average Speed (MPH)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(ride.avgSpeed ? ride.avgSpeed.toString() : '');

    const firstRow = new ActionRowBuilder().addComponents(mileageInput);
    const secondRow = new ActionRowBuilder().addComponents(routeInput);
    const thirdRow = new ActionRowBuilder().addComponents(avgSpeedInput);

    modal.addComponents(firstRow, secondRow, thirdRow);
  }

  return modal;
}

async function handleRideEditModal(interaction, customId) {
  try {
    const parts = customId.split('_');
    const rideId = parts[3];
    const editType = parts[4];

    // Get the ride
    const ride = await db.getRide(rideId);
    if (!ride || ride.leader.id !== interaction.user.id) {
      await interaction.reply({
        content: '❌ You can only edit your own rides.',
        ephemeral: true
      });
      return;
    }

    let updates = {};

    if (editType === 'date') {
      // Handle date/time updates
      const dateString = interaction.fields.getTextInputValue('date_input');
      const timeString = interaction.fields.getTextInputValue('time_input');
      const rollTimeString = interaction.fields.getTextInputValue('roll_time_input');

      const date = parseDate(dateString);
      const time = parseTime(timeString);
      const rollTime = rollTimeString ? parseInt(rollTimeString) : ride.rollTime;

      updates = {
        date,
        meetTime: time,
        rollTime
      };

    } else if (editType === 'location') {
      // Location updates are now handled with dropdowns
      throw new Error('Location updates should use dropdowns, not modals');

    } else if (editType === 'details') {
      // Handle details updates
      const mileageString = interaction.fields.getTextInputValue('mileage_input');
      const routeUrl = interaction.fields.getTextInputValue('route_input');
      const avgSpeedString = interaction.fields.getTextInputValue('avg_speed_input');

      updates = {
        mileage: mileageString ? parseMileage(mileageString) : null,
        route: routeUrl ? validateRouteUrl(routeUrl) : null,
        avgSpeed: avgSpeedString ? parseInt(avgSpeedString) : null
      };
    }

    // Update the ride in the database
    const updatedRide = await db.updateRide(rideId, updates);

    // Update the original message if it exists
    if (ride.messageId && ride.channelId) {
      try {
        const channel = interaction.client.channels.cache.get(ride.channelId);
        if (channel) {
          const message = await channel.messages.fetch(ride.messageId);
          if (message) {
            const updatedEmbed = formatRidePost(updatedRide, 'updated');
            await message.edit({ embeds: [updatedEmbed] });
          }
        }
      } catch (messageError) {
        console.error('Error updating original message:', messageError);
        // Continue even if message update fails
      }
    }

    // Send confirmation to user
    await interaction.reply({
      content: `✅ Ride updated successfully!`,
      ephemeral: true
    });

    // Update the DM message to show success
    const successEmbed = new EmbedBuilder()
      .setTitle('✅ Ride Updated Successfully')
      .setDescription(`Your ${updatedRide.type.toUpperCase()} ride has been updated.`)
      .setColor('#4ecdc4')
      .setFooter({ text: 'URG RideMaker • Edit Complete' });

    await interaction.message.edit({
      embeds: [successEmbed],
      components: []
    });

  } catch (error) {
    console.error('Error handling ride edit modal:', error);
    
    let errorMessage = '❌ An error occurred while updating the ride.';
    
    if (error.message.includes('Invalid date format')) {
      errorMessage = '❌ Invalid date format. Use MM/DD, "Today", or "Tomorrow".';
    } else if (error.message.includes('Invalid time format')) {
      errorMessage = '❌ Invalid time format. Use HH:MM, HH:MM AM/PM, or lazy formats like "6pm".';
    } else if (error.message.includes('Mileage must be')) {
      errorMessage = '❌ Invalid mileage. Please provide a positive number.';
    } else if (error.message.includes('Route must be')) {
      errorMessage = '❌ Invalid route URL. Must be a Strava or RideWithGPS URL.';
    } else if (error.message.includes('Invalid location provided')) {
      errorMessage = '❌ Invalid location provided.';
    }

    await interaction.reply({
      content: errorMessage,
      ephemeral: true
    });
  }
} 