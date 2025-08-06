const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getFirestore, testDatabaseConnection } = require('../config/firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check the overall status of the bot and database connection'),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const startTime = Date.now();
      
      // Create status embed
      const statusEmbed = new EmbedBuilder()
        .setTitle('🤖 Bot Status Report')
        .setColor('#00ff00')
        .setTimestamp()
        .setFooter({ text: 'URG RideMaker Bot' });
      
      // Check bot status
      const botStatus = {
        online: true,
        latency: Date.now() - interaction.createdTimestamp,
        uptime: process.uptime()
      };
      
      // Test database connection
      const dbStartTime = Date.now();
      const dbConnectionTest = await testDatabaseConnection();
      const dbResponseTime = Date.now() - dbStartTime;
      
      // Build status description
      let description = '';
      
      // Bot status
      if (botStatus.online) {
        description += '✅ **Bot Status: ONLINE**\n';
        description += `📡 **Latency:** ${botStatus.latency}ms\n`;
        description += `⏱️ **Uptime:** ${Math.floor(botStatus.uptime / 60)} minutes\n\n`;
      } else {
        description += '❌ **Bot Status: OFFLINE**\n\n';
      }
      
      // Database status
      if (dbConnectionTest) {
        description += '✅ **Database Status: CONNECTED**\n';
        description += `🗄️ **Database:** Firestore\n`;
        description += `📊 **Response Time:** ${dbResponseTime}ms\n`;
        description += `🏢 **Project ID:** ${process.env.FIREBASE_PROJECT_ID || 'Not configured'}\n`;
      } else {
        description += '❌ **Database Status: DISCONNECTED**\n';
        description += '⚠️ **Error:** Connection test failed\n';
      }
      
      statusEmbed.setDescription(description);
      
      // Set color based on overall status
      if (botStatus.online && dbConnectionTest) {
        statusEmbed.setColor('#00ff00'); // Green - everything good
      } else if (botStatus.online && !dbConnectionTest) {
        statusEmbed.setColor('#ffaa00'); // Orange - bot good, db bad
      } else {
        statusEmbed.setColor('#ff0000'); // Red - bot bad
      }
      
      // Add additional fields
      statusEmbed.addFields(
        { 
          name: '🔄 Overall Health', 
          value: (botStatus.online && dbConnectionTest) ? '🟢 Healthy' : '🔴 Issues Detected', 
          inline: true 
        },
        { 
          name: '📅 Last Check', 
          value: new Date().toLocaleTimeString(), 
          inline: true 
        },
        { 
          name: '⚡ Total Response', 
          value: `${Date.now() - startTime}ms`, 
          inline: true 
        }
      );
      
      await interaction.editReply({ embeds: [statusEmbed], ephemeral: true });
      
    } catch (error) {
      console.error('Error in status command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Status Check Error')
        .setDescription('An error occurred while checking the status.')
        .setColor('#ff0000')
        .addFields(
          { name: 'Error', value: error.message || 'Unknown error' }
        )
        .setTimestamp();
      
      await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
}; 