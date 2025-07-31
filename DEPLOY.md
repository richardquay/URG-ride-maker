# Deploying to Firebase Functions

## Prerequisites

1. **Firebase CLI installed**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project set up** with Firestore enabled

3. **Discord bot token** ready

## Deployment Steps

### 1. Login to Firebase
```bash
firebase login
```

### 2. Initialize Firebase in your project (if not already done)
```bash
firebase init functions
```
- Select your existing project
- Choose JavaScript
- Say NO to ESLint
- Say YES to installing dependencies

### 3. Set your Discord bot token as a Firebase config
```bash
firebase functions:config:set discord.token="YOUR_DISCORD_BOT_TOKEN"
```

### 4. Install dependencies in the functions folder
```bash
cd functions
npm install
cd ..
```

### 5. Deploy to Firebase Functions
```bash
firebase deploy --only functions
```

### 6. Deploy Discord commands
```bash
node src/deploy-commands.js
```

## Environment Variables

Instead of using `.env` file, Firebase Functions uses Firebase config:

```bash
# Set Discord token
firebase functions:config:set discord.token="your_discord_token"

# Set Discord client ID
firebase functions:config:set discord.client_id="your_client_id"

# View current config
firebase functions:config:get
```

## Accessing Config in Code

In Firebase Functions, use:
```javascript
const token = functions.config().discord.token;
const clientId = functions.config().discord.client_id;
```

## Monitoring

- **View logs**: `firebase functions:log`
- **View function status**: Firebase Console > Functions
- **Test function**: Firebase Console > Functions > Test function

## Benefits of Firebase Functions

✅ **Always online** - No need to keep your computer running  
✅ **Automatic scaling** - Handles traffic spikes  
✅ **Same platform** - Bot and database on Firebase  
✅ **Free tier** - Generous free usage  
✅ **Easy deployment** - One command to deploy  

## Troubleshooting

1. **Function not starting**: Check logs with `firebase functions:log`
2. **Discord bot offline**: Verify token is set correctly
3. **Database connection failed**: Check Firestore permissions
4. **Commands not working**: Re-deploy commands after function deployment

## Local Testing

Test locally before deploying:
```bash
firebase emulators:start --only functions
``` 