const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test-sweep')
    .setDescription('Test the sweep picker functionality')
    .addUserOption(option =>
      option.setName('test-user')
        .setDescription('Test user picker')
        .setRequired(false)),

  async execute(interaction) {
    try {
      const testUser = interaction.options.getUser('test-user');
      
      if (testUser) {
        await interaction.reply({
          content: `✅ Successfully selected user: ${testUser.username} (${testUser.id})`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: 'ℹ️ No user selected. Try selecting a user from the picker to test if it works.',
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('Error in test-sweep command:', error);
      await interaction.reply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true
      });
    }
  }
}; 