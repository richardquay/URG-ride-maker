const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check-permissions')
    .setDescription('Check bot permissions and OAuth2 scopes')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      const guild = interaction.guild;
      const botMember = guild.members.me;
      
      // Check bot permissions
      const botPermissions = botMember.permissions.toArray();
      const missingPermissions = [];
      
      // Permissions needed for user picker
      const requiredPermissions = [
        'ViewChannel',
        'ReadMessageHistory',
        'UseSlashCommands'
      ];
      
      requiredPermissions.forEach(perm => {
        if (!botPermissions.includes(perm)) {
          missingPermissions.push(perm);
        }
      });
      
      // Check if bot can see members
      const canSeeMembers = guild.members.cache.size > 0;
      const memberCount = guild.memberCount;
      const cachedCount = guild.members.cache.size;
      
      const embed = new EmbedBuilder()
        .setTitle('🔐 Bot Permissions Check')
        .setColor(missingPermissions.length > 0 ? '#ff0000' : '#00ff00')
        .addFields(
          { name: '📊 Member Access', value: 
            `**Can See Members:** ${canSeeMembers ? '✅ Yes' : '❌ No'}\n` +
            `**Total Members:** ${memberCount}\n` +
            `**Cached Members:** ${cachedCount}\n` +
            `**Cache Percentage:** ${Math.round((cachedCount / memberCount) * 100)}%`, inline: true },
          { name: '🔑 Required Permissions', value: 
            requiredPermissions.map(perm => 
              `${botPermissions.includes(perm) ? '✅' : '❌'} ${perm}`
            ).join('\n'), inline: true },
          { name: '⚠️ Missing Permissions', value: 
            missingPermissions.length > 0 ? 
            missingPermissions.join('\n') : 
            'None', inline: true }
        );
      
      if (missingPermissions.length > 0) {
        embed.addFields({
          name: '🚨 Action Required',
          value: 'Re-invite the bot with the missing permissions using the OAuth2 URL generator.',
          inline: false
        });
      }
      
      embed.setFooter({ text: 'URG RideMaker • Permissions Check' });

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
      
    } catch (error) {
      console.error('Error in check-permissions command:', error);
      await interaction.reply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true
      });
    }
  }
}; 