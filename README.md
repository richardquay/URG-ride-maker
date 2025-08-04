# URG RideMaker Discord Bot

A Discord bot with Firestore database integration for checking database status and managing ride-related data.

## Features

- ✅ Discord slash commands
- ✅ Firestore database integration
- ✅ Database status checking
- ✅ Error handling and logging
- ✅ Modern Discord.js v14 implementation
- ✅ Cloud hosting on Railway
- ✅ Ride creation with comprehensive details
- ✅ DM-based ride editing system
- ✅ Real-time ride updates in channels
- ✅ Ride listing and management

## Commands

- `/ping` - Test bot connectivity and latency
- `/dbstatus` - Check Firestore database connection status
- `/status` - Comprehensive bot and database status report
- `/create-ride` - Create a new bike ride with all details
- `/edit-ride` - Send a DM to edit ride details (ride leaders only)
- `/list-rides` - List active rides with their IDs for editing

## Architecture

This bot uses a **hybrid approach** for optimal performance and cost:

- **Discord Bot**: Hosted on [Railway](https://railway.app) (always running, free tier)
- **Database**: [Firebase Firestore](https://firebase.google.com/firestore) (real-time, free tier)
- **Best of both worlds**: Free hosting + powerful database

## Quick Setup

### 1. Prerequisites

- Node.js (v16 or higher)
- A Discord application and bot token
- A Firebase project with Firestore enabled
- Railway account (free)

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

1. Copy the example environment file:
```bash
cp env.example .env
```

2. Edit `.env` with your configuration:

#### Discord Bot Configuration
- Get your bot token from the [Discord Developer Portal](https://discord.com/developers/applications)
- Get your client ID from the same portal

#### Firebase Configuration
1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Download the JSON file
6. Copy the values from the JSON file to your `.env` file

### 4. Deploy Commands

Before running the bot, deploy the slash commands to Discord:

```bash
node src/deploy-commands.js
```

### 5. Deploy to Railway

1. **Push to GitHub**:
```bash
git add .
git commit -m "Initial commit"
git push -u origin main
```

2. **Deploy to Railway**:
   - Go to [Railway.app](https://railway.app)
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Add environment variables (copy from your `.env` file)

3. **Your bot will be online 24/7!** 🚀

## Project Structure

```
URG-RideMaker_DB/
├── src/
│   ├── commands/          # Discord slash commands
│   │   ├── ping.js       # Basic ping command
│   │   ├── dbstatus.js   # Database status command
│   │   └── status.js     # Comprehensive status command
│   ├── config/
│   │   └── firebase.js   # Firebase configuration
│   ├── deploy-commands.js # Command deployment script
│   └── index.js          # Main bot file
├── functions/             # Firebase Functions (alternative)
├── package.json
├── railway.json          # Railway configuration
├── env.example
└── README.md
```

## Firebase Setup

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select existing one

2. **Enable Firestore**:
   - In the Firebase Console, go to Firestore Database
   - Click "Create database"
   - Choose your preferred location and security rules

3. **Get Service Account Key**:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
   - Use the values in your `.env` file

## Discord Bot Setup

1. **Create Discord Application**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application"
   - Give it a name

2. **Create Bot**:
   - Go to the "Bot" section
   - Click "Add Bot"
   - Copy the bot token

3. **Set Permissions**:
   - In the "Bot" section, enable these permissions:
     - Send Messages
     - Use Slash Commands
     - Embed Links
     - Read Message History

4. **Invite Bot to Server**:
   - Go to "OAuth2" > "URL Generator"
   - Select "bot" scope
   - Select the permissions mentioned above
   - Use the generated URL to invite the bot

## Testing

1. Start the bot: `npm start`
2. In Discord, use `/ping` to test basic functionality
3. Use `/dbstatus` to check your Firestore connection
4. Use `/status` for comprehensive status report

## Deployment Options

### Option 1: Railway (Recommended)
- ✅ Always online (24/7)
- ✅ Free tier (500 hours/month)
- ✅ Simple deployment
- ✅ Auto-restart on crashes

### Option 2: Firebase Functions
- ⚠️ Requires Blaze plan ($25+/month)
- ⚠️ Complex setup for Discord bots
- ✅ Same platform as database

### Option 3: Local Development
- ✅ Free
- ❌ Requires computer to stay on
- ✅ Good for development

## Troubleshooting

### Common Issues

1. **"Invalid token" error**:
   - Check your `DISCORD_TOKEN` in environment variables
   - Ensure the token is correct and not expired

2. **"Firebase initialization failed"**:
   - Verify all Firebase environment variables are set
   - Check that your service account key is valid
   - Ensure your Firebase project has Firestore enabled

3. **Commands not appearing**:
   - Run `node src/deploy-commands.js` to deploy commands
   - Check that your bot has the correct permissions
   - Ensure the bot is in the server where you're trying to use commands

### Logs

The bot provides detailed console logging:
- ✅ Success messages
- ❌ Error messages
- ⚠️ Warning messages

## Cost Analysis

| Service | Database | Bot Hosting | Total |
|---------|----------|-------------|-------|
| **Firebase Only** | Free | $25+/month (Blaze) | $25+/month |
| **Railway Only** | $5/month | Free | $5/month |
| **Hybrid (Recommended)** | Free | Free | **$0/month** |

## Ride Management Features

### Creating Rides
Use `/create-ride` to create a new bike ride with:
- Ride type (Road, Gravel, Trail, Social)
- Pace (Spicy, Party)
- Date and start time
- Drop policy
- Starting and end locations
- Distance and route information
- Average speed (for Spicy rides)

### Editing Rides
Ride leaders can edit their rides using the DM-based editing system:

1. **Get Ride ID**: Use `/list-rides` to see all active rides with their IDs
2. **Start Edit**: Use `/edit-ride ride-id:ID` to send edit options to your DM
3. **Choose What to Edit**: Click buttons in the DM to edit:
   - 📅 Date/Time (date, start time, roll time)
   - 📍 Location (starting and end locations)
   - 📝 Details (mileage, route, average speed)
4. **Save Changes**: The original ride message in the channel is automatically updated

### Ride Updates
- All ride edits are reflected in real-time in the original channel message
- Only ride leaders can edit their own rides
- Past rides cannot be edited
- All changes are validated and error-checked

## Next Steps

Once the basic setup is working, you can:
1. Add more commands for your specific use case
2. Implement database operations (CRUD)
3. Add user authentication and permissions
4. Create ride management features

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure your Firebase project and Discord bot are properly configured
4. Check Railway logs for deployment issues

## License

MIT License - feel free to use and modify as needed. 