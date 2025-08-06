const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('debug-members')
    .setDescription('Debug server member information'),

  async execute(interaction) {
    try {
      const guild = interaction.guild;
      const memberCount = guild.memberCount;
      const cachedMembers = guild.members.cache.size;
      const botMember = guild.members.me;
      
      // Check bot permissions
      const botPermissions = botMember.permissions.toArray();
      
      // Get some sample members
      const sampleMembers = guild.members.cache.first(5).map(member => ({
        id: member.id,
        username: member.user.username,
        bot: member.user.bot
      }));
      
      const embed = new EmbedBuilder()
        .setTitle('🔍 Server Member Debug Info')
        .setColor('#ff9900')
        .addFields(
          { name: '📊 Member Counts', value: 
            `**Total Members:** ${memberCount}\n` +
            `**Cached Members:** ${cachedMembers}\n` +
            `**Cache Percentage:** ${Math.round((cachedMembers / memberCount) * 100)}%`, inline: true },
          { name: '🤖 Bot Permissions', value: 
            botPermissions.slice(0, 10).join('\n') + 
            (botPermissions.length > 10 ? '\n...' : ''), inline: true },
          { name: '👥 Sample Members', value: 
            sampleMembers.map(m => `${m.bot ? '🤖' : '👤'} ${m.username} (${m.id})`).join('\n'), inline: false }
        )
        .setFooter({ text: 'URG RideMaker • Debug Info' });

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
      
    } catch (error) {
      console.error('Error in debug-members command:', error);
      await interaction.reply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true
      });
    }
  }
}; 