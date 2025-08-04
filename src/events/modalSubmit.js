const { Events } = require('discord.js');
const db = require('../utils/database');
const {
  parseDate,
  parseTime,
  parseMileage,
  validateRouteUrl,
  formatRidePost,
  validateRideType,
  validatePace,
  validateDropPolicy,
  validateLocation
} = require('../utils/helpers');

module.exports = {
  name: Events.ModalSubmit,
  async execute(interaction) {
    if (interaction.customId === 'location_modal') {
      try {
        // Get the stored interaction data
        const interactionData = interaction.client.tempData;
        if (!interactionData) {
          await interaction.reply({
            content: '❌ Session expired. Please try creating the ride again.',
            ephemeral: true
          });
          return;
        }

        // Get custom location inputs
        const startingLocationInput = interaction.fields.getTextInputValue('starting_location_input');
        const endLocationInput = interaction.fields.getTextInputValue('end_location_input');

        // Update the stored data with custom locations
        let startingLocation = interactionData.startingLocation;
        let endLocation = interactionData.endLocation;

        if (interactionData.startingLocation === 'other') {
          if (startingLocationInput.trim()) {
            startingLocation = startingLocationInput.trim();
          } else {
            // Use default starting location if no custom input provided
            const startTime = parseTime(interactionData.startTimeString);
            startingLocation = startTime.hours < 12 ? 'northern-coffeeworks' : 'angry-catfish';
          }
        }

        if (interactionData.endLocation === 'other') {
          if (endLocationInput.trim()) {
            endLocation = endLocationInput.trim();
          } else {
            await interaction.reply({
              content: '❌ End location is required when "Other" is selected.',
              ephemeral: true
            });
            return;
          }
        }

        // Update the interaction data
        const updatedData = {
          ...interactionData,
          startingLocation,
          endLocation
        };

        // Clear the temporary data
        delete interaction.client.tempData;

        // Create the ride using the updated data
        const createRideCommand = interaction.client.commands.get('create-ride');
        await createRideCommand.createRideFromData(interaction, updatedData);

      } catch (error) {
        console.error('Error handling location modal:', error);
        
        let errorMessage = '❌ An error occurred while processing the location input.';
        
        if (error.message.includes('Invalid location provided')) {
          errorMessage = '❌ Invalid location provided. Please try again.';
        }

        await interaction.reply({
          content: errorMessage,
          ephemeral: true
        });
      }
    }
  },
}; 