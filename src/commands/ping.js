const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setDescription(`Latency: ${Date.now() - interaction.createdTimestamp}ms`)
      .setColor('#00ff00')
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  },
}; 