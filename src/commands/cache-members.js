const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cache-members')
    .setDescription('Force cache all server members (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      
      const guild = interaction.guild;
      const beforeCount = guild.members.cache.size;
      
      // Fetch all members
      await guild.members.fetch();
      
      const afterCount = guild.members.cache.size;
      const newMembers = afterCount - beforeCount;
      
      await interaction.editReply({
        content: `✅ **Member caching complete!**\n\n` +
                 `📊 **Before:** ${beforeCount} cached members\n` +
                 `📊 **After:** ${afterCount} cached members\n` +
                 `🆕 **Newly cached:** ${newMembers} members\n\n` +
                 `🎯 **Sweep picker should now work!** Try `/create-ride` again.`
      });
      
    } catch (error) {
      console.error('Error in cache-members command:', error);
      await interaction.editReply({
        content: `❌ Error caching members: ${error.message}`
      });
    }
  }
}; 