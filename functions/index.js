const functions = require('firebase-functions');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK properly for Functions environment
admin.initializeApp();

// Create Discord client
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

// Create commands collection
client.commands = new Collection();

// Import commands
const pingCommand = require('./commands/ping');
const dbStatusCommand = require('./commands/dbStatus');
const statusCommand = require('./commands/status');

// Add commands to collection
client.commands.set(pingCommand.data.name, pingCommand);
client.commands.set(dbStatusCommand.data.name, dbStatusCommand);
client.commands.set(statusCommand.data.name, statusCommand);

// Firebase configuration
const initializeFirebase = () => {
  try {
    console.log('✅ Firebase initialized successfully');
    console.log('Project ID:', admin.app().options.projectId);
    return admin.app();
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error);
    throw error;
  }
};

// Get Firestore instance
const getFirestore = () => {
  return admin.firestore();
};

// Test database connection
const testDatabaseConnection = async () => {
  try {
    const db = getFirestore();
    console.log('Testing database connection...');
    
    // Try to read from a test collection
    const testDoc = await db.collection('test').doc('connection-test').get();
    
    if (testDoc.exists) {
      console.log('✅ Database connection test successful - document exists');
    } else {
      console.log('✅ Database connection test successful - document does not exist (this is normal)');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    console.error('Error details:', error.message);
    return false;
  }
};

// Handle slash command interactions
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

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
});

// Handle errors
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord using environment variable
const token = process.env.DISCORD_TOKEN || functions.config().discord?.token;
if (!token) {
  console.error('❌ No Discord token found. Please set DISCORD_TOKEN environment variable.');
  process.exit(1);
}

// Initialize the bot
let botInitialized = false;

const initializeBot = async () => {
  if (botInitialized) return;
  
  try {
    await client.login(token);
    console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
    
    initializeFirebase();
    
    const dbStatus = await testDatabaseConnection();
    if (dbStatus) {
      console.log('✅ Database connection established successfully');
    } else {
      console.log('⚠️ Database connection test failed');
    }
    
    botInitialized = true;
  } catch (error) {
    console.error('❌ Failed to initialize bot:', error);
  }
};

// Export HTTP function for health check
exports.discordBot = functions.https.onRequest(async (req, res) => {
  try {
    // Initialize bot if not already done
    if (!botInitialized) {
      await initializeBot();
    }
    
    res.json({ 
      status: 'Discord bot is running!',
      botReady: botInitialized,
      user: client.user ? client.user.tag : 'Not logged in'
    });
  } catch (error) {
    console.error('Error in HTTP function:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export scheduled function to keep bot alive
exports.keepAlive = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
  try {
    if (!botInitialized) {
      await initializeBot();
    }
    
    console.log('Keep-alive ping - bot is running');
    return null;
  } catch (error) {
    console.error('Error in keep-alive function:', error);
    return null;
  }
}); 