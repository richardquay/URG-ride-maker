const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getFirestore, testDatabaseConnection } = require('../config/firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dbstatus')
    .setDescription('Check the status of the Firestore database connection'),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const db = getFirestore();
      
      // Create status embed
      const statusEmbed = new EmbedBuilder()
        .setTitle('🗄️ Database Status Check')
        .setColor('#00ff00')
        .setTimestamp()
        .setFooter({ text: 'URG RideMaker Database' });
      
      // Test database connection
      const connectionTest = await testDatabaseConnection();
      
      if (connectionTest) {
        statusEmbed
          .setDescription('✅ **Database Connection: ONLINE**')
          .addFields(
            { name: 'Status', value: '🟢 Connected', inline: true },
            { name: 'Database', value: 'Firestore', inline: true },
            { name: 'Project ID', value: process.env.FIREBASE_PROJECT_ID || 'Not configured', inline: true }
          );
      } else {
        statusEmbed
          .setDescription('❌ **Database Connection: OFFLINE**')
          .setColor('#ff0000')
          .addFields(
            { name: 'Status', value: '🔴 Disconnected', inline: true },
            { name: 'Database', value: 'Firestore', inline: true },
            { name: 'Error', value: 'Connection test failed', inline: true }
          );
      }
      
      await interaction.editReply({ embeds: [statusEmbed] });
      
    } catch (error) {
      console.error('Error in dbstatus command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Database Status Error')
        .setDescription('An error occurred while checking the database status.')
        .setColor('#ff0000')
        .addFields(
          { name: 'Error', value: error.message || 'Unknown error' }
        )
        .setTimestamp();
      
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
}; 