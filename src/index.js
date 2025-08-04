const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const http = require('http');
require('dotenv').config();

// Import Firebase configuration
const { initializeFirebase, testDatabaseConnection } = require('./config/firebase');

// Create a new client instance
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ] 
});

// Create collections for commands and events
client.commands = new Collection();
client.events = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: ${command.data.name}`);
  } else {
    console.log(`⚠️ The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  
  if ('name' in event && 'execute' in event) {
    client.events.set(event.name, event);
    console.log(`✅ Loaded event: ${event.name}`);
  } else {
    console.log(`⚠️ The event at ${filePath} is missing a required "name" or "execute" property.`);
  }
}

// Create HTTP server for Railway health checks
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'Discord bot is running!',
    botReady: client.user ? true : false,
    user: client.user ? client.user.tag : 'Not logged in',
    timestamp: new Date().toISOString()
  }));
});

// Start HTTP server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 HTTP server listening on port ${PORT}`);
});

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
  
  // Initialize Firebase
  try {
    initializeFirebase();
    
    // Test database connection
    const dbStatus = await testDatabaseConnection();
    if (dbStatus) {
      console.log('✅ Database connection established successfully');
    } else {
      console.log('⚠️ Database connection test failed');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error);
  }
});

// Handle interactions
client.on(Events.InteractionCreate, async interaction => {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
          content: 'There was an error while executing this command!', 
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: 'There was an error while executing this command!', 
          ephemeral: true 
        });
      }
    }
  }
  
  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    const event = interaction.client.events.get(Events.ModalSubmit);
    
    if (event) {
      try {
        await event.execute(interaction);
      } catch (error) {
        console.error('Error handling modal submission:', error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ 
            content: 'There was an error while processing your input!', 
            ephemeral: true 
          });
        } else {
          await interaction.reply({ 
            content: 'There was an error while processing your input!', 
            ephemeral: true 
          });
        }
      }
    }
  }
});

// Handle events
for (const [eventName, event] of client.events) {
  client.on(eventName, event.execute);
}

// Handle errors
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN); 