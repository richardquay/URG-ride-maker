const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('debug-picker')
    .setDescription('Debug user picker functionality')
    .addUserOption(option =>
      option.setName('test-user')
        .setDescription('Test user selection')
        .setRequired(false)),

  async execute(interaction) {
    try {
      const guild = interaction.guild;
      const testUser = interaction.options.getUser('test-user');
      
      // Get all cached members
      const allMembers = guild.members.cache.map(member => ({
        id: member.id,
        username: member.user.username,
        bot: member.user.bot,
        displayName: member.displayName
      }));
      
      // Separate bots and humans
      const bots = allMembers.filter(m => m.bot);
      const humans = allMembers.filter(m => !m.bot);
      
      const embed = new EmbedBuilder()
        .setTitle('🔍 User Picker Debug')
        .setColor('#ff9900')
        .addFields(
          { name: '📊 Member Breakdown', value: 
            `**Total Cached:** ${allMembers.length}\n` +
            `**Humans:** ${humans.length}\n` +
            `**Bots:** ${bots.length}`, inline: true },
          { name: '👥 Human Users', value: 
            humans.length > 0 ? 
            humans.map(h => `• ${h.displayName} (${h.username})`).join('\n') :
            'No human users found', inline: false },
          { name: '🤖 Bots', value: 
            bots.length > 0 ? 
            bots.map(b => `• ${b.displayName} (${b.username})`).join('\n') :
            'No bots found', inline: false }
        );
      
      if (testUser) {
        embed.addFields({
          name: '✅ Selected User',
          value: `**Name:** ${testUser.username}\n**ID:** ${testUser.id}\n**Bot:** ${testUser.bot ? 'Yes' : 'No'}`,
          inline: false
        });
      }
      
      embed.setFooter({ text: 'URG RideMaker • Picker Debug' });

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
      
    } catch (error) {
      console.error('Error in debug-picker command:', error);
      await interaction.reply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true
      });
    }
  }
}; 