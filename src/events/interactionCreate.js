const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const {
  parseDate,
  parseTime,
  parseMileage,
  validateRouteUrl,
  formatRidePost,
  validateLocation
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

    if (editType === 'cancel') {
      await interaction.update({
        content: '❌ Edit cancelled.',
        embeds: [],
        components: []
      });
      return;
    }

    // Get the ride to verify ownership
    const ride = await db.getRide(rideId);
    if (!ride || ride.leader.id !== interaction.user.id) {
      await interaction.reply({
        content: '❌ You can only edit your own rides.',
        ephemeral: true
      });
      return;
    }

    // Create appropriate modal based on edit type
    const modal = createEditModal(rideId, editType, ride);
    
    await interaction.showModal(modal);

  } catch (error) {
    console.error('Error handling ride edit button:', error);
    await interaction.reply({
      content: '❌ An error occurred while processing the edit request.',
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
      .setValue(ride.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }));

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
    // Location edit modal
    const startLocationInput = new TextInputBuilder()
      .setCustomId('start_location_input')
      .setLabel('Starting Location')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(ride.startingLocation || '');

    const endLocationInput = new TextInputBuilder()
      .setCustomId('end_location_input')
      .setLabel('End Location (optional)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(ride.endLocation || '');

    const firstRow = new ActionRowBuilder().addComponents(startLocationInput);
    const secondRow = new ActionRowBuilder().addComponents(endLocationInput);

    modal.addComponents(firstRow, secondRow);

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
      // Handle location updates
      const startLocation = interaction.fields.getTextInputValue('start_location_input');
      const endLocation = interaction.fields.getTextInputValue('end_location_input');

      updates = {
        startingLocation: validateLocation(startLocation),
        endLocation: endLocation ? validateLocation(endLocation) : null
      };

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